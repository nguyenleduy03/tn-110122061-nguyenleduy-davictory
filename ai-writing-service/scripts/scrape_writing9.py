#!/usr/bin/env python3
"""
Scrape IELTS sample essays from writing9.com and save to DB via admin API.

Usage:
    export GROQ_API_KEY="..."
    # Start ai-writing-service first, then:
    python3 scripts/scrape_writing9.py

  Or with custom URL:
    python3 scripts/scrape_writing9.py --api http://localhost:5180 --max 50
"""

import re
import json
import sys
import time
import argparse
import urllib.request
import urllib.error
from html.parser import HTMLParser


API_BASE = "http://localhost:5180"
MAX_ESSAYS = 0  # 0 = all
DELAY = 1.5  # seconds between requests to be polite

TASK_TYPE_MAP = {
    "essay": "TASK2_ACADEMIC",
    "letter": "TASK1_GENERAL",
    "chart": "TASK1_ACADEMIC",
}


class NextDataExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self._in_script = False
        self._data_tag = None
        self.next_data = None

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            attrs_dict = dict(attrs)
            if attrs_dict.get("id") == "__NEXT_DATA__":
                self._in_script = True
                self._data_tag = True

    def handle_endtag(self, tag):
        if tag == "script" and self._in_script:
            self._in_script = False

    def handle_data(self, data):
        if self._in_script and self._data_tag:
            try:
                self.next_data = json.loads(data)
            except json.JSONDecodeError:
                pass
            self._data_tag = False


def fetch_json(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; VictoryBot/1.0; +https://davictory.com/bot)"
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8")


def extract_next_data(html):
    parser = NextDataExtractor()
    parser.feed(html)
    return parser.next_data


def get_essay_list(page_url):
    html = fetch_json(page_url)
    data = extract_next_data(html)
    if not data:
        print("  [ERROR] No __NEXT_DATA__ found")
        return []
    essays = data.get("props", {}).get("pageProps", {}).get("data", [])
    return essays


def parse_essay_detail(html):
    data = extract_next_data(html)
    if not data:
        return None

    page_props = data.get("props", {}).get("pageProps", {})
    text_data = page_props.get("text", {})
    results = page_props.get("results", {})
    bands = results.get("bands", {})
    stats = results.get("stats", {})
    gpt = results.get("gpt", {})

    if not text_data:
        return None

    question = text_data.get("question", "")
    essay_text = text_data.get("text", "")
    band = text_data.get("band")

    if not essay_text or band is None or band == 0:
        return None

    # Build examiner comment from gpt advices + positive highlights
    examiner_comment_parts = []
    for advice in gpt.get("advices", []) if gpt else []:
        text = advice.get("advice", "")
        atype = advice.get("type", "")
        if text:
            examiner_comment_parts.append(f"[{atype}] {text}")
    for highlight in gpt.get("positive_highlights", []) if gpt else []:
        text = highlight.get("highlight", "")
        atype = highlight.get("type", "")
        if text:
            examiner_comment_parts.append(f"[POSITIVE/{atype}] {text}")

    # Build examiner comment
    task_type_code = TASK_TYPE_MAP.get(text_data.get("task", "essay"), "TASK2_ACADEMIC")

    # Detect topic from question
    topic = guess_topic(question)

    return {
        "sourceId": text_data.get("_id", ""),
        "taskType": task_type_code,
        "topic": topic,
        "promptText": question,
        "essayText": essay_text,
        "bandScore": band,
        "taBand": bands.get("taBand", round(band, 1)),
        "coherenceBand": bands.get("coherenceBand", round(band, 1)),
        "lexicalBand": bands.get("lexicalBand", round(band, 1)),
        "grammarBand": bands.get("grammaticBand", round(band, 1)),
        "examinerComment": "\n".join(examiner_comment_parts) if examiner_comment_parts else "",
        "wordCount": stats.get("wordsCount", len(essay_text.split())),
    }


TOPIC_KEYWORDS = [
    ("education", ["education", "school", "student", "teacher", "learn", "teach", "university", "college", "academic"]),
    ("technology", ["technology", "internet", "computer", "digital", "online", "ai", "artificial intelligence", "social media", "smartphone"]),
    ("environment", ["environment", "climate", "pollution", "global warming", "carbon", "green", "recycle", "energy", "nature"]),
    ("health", ["health", "healthcare", "hospital", "doctor", "disease", "medical", "exercise", "diet", "mental"]),
    ("crime", ["crime", "criminal", "police", "prison", "law", "punishment", "justice"]),
    ("work", ["work", "job", "career", "employment", "salary", "workplace", "profession", "employee"]),
    ("family", ["family", "parent", "child", "marriage", "household", "children upbringing"]),
    ("society", ["society", "community", "government", "public", "social", "citizen", "population"]),
    ("economy", ["economy", "economic", "money", "finance", "tax", "business", "trade", "tourism"]),
    ("culture", ["culture", "tradition", "art", "music", "language", "heritage", "entertainment"]),
    ("food", ["food", "agriculture", "farming", "nutrition", "diet"]),
    ("transport", ["transport", "traffic", "car", "public transport", "road", "infrastructure"]),
]


def guess_topic(question):
    if not question:
        return "General"
    q_lower = question.lower()
    for topic, keywords in TOPIC_KEYWORDS:
        for kw in keywords:
            if kw in q_lower:
                return topic.capitalize()
    return "General"


def save_essay(essay, api_base):
    url = f"{api_base}/api/admin/ai/samples"
    payload = json.dumps({
        "sourceId": essay.get("sourceId", ""),
        "taskType": essay["taskType"],
        "topic": essay["topic"],
        "promptText": essay["promptText"],
        "essayText": essay["essayText"],
        "bandScore": essay["bandScore"],
        "examinerComment": essay["examinerComment"],
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers={
        "Content-Type": "application/json",
    }, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            return result.get("status", "")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  [HTTP {e.code}] {body[:200]}")
        return "error"
    except Exception as e:
        print(f"  [ERROR] {e}")
        return "error"


def reindex(api_base):
    url = f"{api_base}/api/admin/ai/reindex"
    req = urllib.request.Request(url, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read())
            return result.get("status") == "REINDEXED"
    except Exception as e:
        print(f"  [ERROR] Reindex failed: {e}")
        return False


def count_samples(api_base):
    url = f"{api_base}/api/admin/ai/samples/count"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return {"dbCount": 0, "vectorStoreIndexed": False}


BAND_FILTERS = [9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4]
PAGE_OFFSETS = [0, 1, 2]

SOURCE_URLS = [
    ("TASK2_ACADEMIC (main)", "https://writing9.com/ielts-writing-samples"),
    ("TASK1_ACADEMIC (chart)", "https://writing9.com/ielts-academic-writing-samples-task-1"),
    ("TASK1_GENERAL (letter)", "https://writing9.com/ielts-writing-samples-task-1"),
]


def collect_all_essay_ids(args):
    """Collect all unique essay IDs from listing and band-filter pages."""
    seen_ids = set()
    all_essays = []

    # 1. Main listing pages
    for label, url in SOURCE_URLS:
        print(f"  [{label}] {url}")
        essays = get_essay_list(url)
        new_count = 0
        for e in essays:
            eid = e.get("_id")
            if eid and eid not in seen_ids:
                seen_ids.add(eid)
                all_essays.append(e)
                new_count += 1
        print(f"    → {new_count} new (total unique: {len(seen_ids)})")

    # 2. Band-filter pages (more diversity)
    for band in BAND_FILTERS:
        for offset in PAGE_OFFSETS:
            url = f"https://writing9.com/band/{band}/{offset}"
            label = f"Band {band} (page {offset})"
            try:
                essays = get_essay_list(url)
                new_count = 0
                for e in essays:
                    eid = e.get("_id")
                    if eid and eid not in seen_ids:
                        seen_ids.add(eid)
                        all_essays.append(e)
                        new_count += 1
                if new_count > 0:
                    print(f"  [{label}] → {new_count} new")
            except Exception:
                pass  # band page may be empty
            time.sleep(0.3)

    return all_essays


def main():
    parser = argparse.ArgumentParser(description="Scrape IELTS samples from writing9.com")
    parser.add_argument("--api", default=API_BASE, help=f"AI service URL (default: {API_BASE})")
    parser.add_argument("--max", type=int, default=MAX_ESSAYS, help="Max essays to scrape (0 = all)")
    parser.add_argument("--delay", type=float, default=DELAY, help=f"Delay between requests (default: {DELAY}s)")
    parser.add_argument("--reindex", action="store_true", default=True,
                        help="Reindex vector store after scrape (default: True)")
    parser.add_argument("--no-reindex", action="store_false", dest="reindex")
    parser.add_argument("--skip-db-check", action="store_true",
                        help="Skip checking existing DB samples before scrape")
    args = parser.parse_args()

    print("=" * 60)
    print("Writing9 IELTS Sample Scraper v2 (multi-source)")
    print("=" * 60)

    # Check API health
    try:
        info = count_samples(args.api)
        print(f"  Current DB samples: {info['dbCount']}")
        print(f"  Vector store indexed: {info['vectorStoreIndexed']}")
    except Exception as e:
        print(f"  [ERROR] Cannot connect to AI service at {args.api}")
        print(f"  {e}")
        sys.exit(1)

    # Collect unique essay IDs from all sources
    print(f"\nCollecting essays from all sources...")
    all_essays = collect_all_essay_ids(args)
    if not all_essays:
        print("  No essays found!")
        sys.exit(1)
    print(f"\nTotal unique essays found: {len(all_essays)}")

    # Show band/source distribution
    bands = {}
    for e in all_essays:
        b = e.get("band", 0)
        bands[b] = bands.get(b, 0) + 1
    print(f"  Band distribution: {dict(sorted(bands.items()))}")

    if args.max > 0:
        all_essays = all_essays[:args.max]
        print(f"  Limited to {args.max} essays")

    # Skip already-existing in DB if not forced
    if not args.skip_db_check and info.get("dbCount", 0) > 0:
        print(f"\nNote: DB already has {info['dbCount']} essays. Use --skip-db-check to skip duplicate filter.")
        print("  (The API will reject duplicates by task code anyway)")

    # Scrape each essay
    saved = 0
    failed = 0
    skipped = 0
    total = len(all_essays)

    print(f"\n{'=' * 60}")
    print(f"Scraping {total} essays (delay={args.delay}s)...")
    print(f"{'=' * 60}")

    for i, essay in enumerate(all_essays, 1):
        essay_id = essay.get("_id", "")
        slug = essay.get("slug", "")
        band = essay.get("band", "?")
        url = f"https://writing9.com/text/{essay_id}-{slug}"

        print(f"[{i}/{total}] Band {band} | {url[:80]}...")

        try:
            html = fetch_json(url)
        except Exception as e:
            print(f"  [FETCH ERROR] {e}")
            failed += 1
            time.sleep(args.delay)
            continue

        detail = parse_essay_detail(html)
        if not detail:
            print(f"  [SKIP] Could not parse essay data")
            skipped += 1
            time.sleep(args.delay)
            continue

        status = save_essay(detail, args.api)
        if status == "saved":
            saved += 1
            print(f"  [SAVED] Band {detail['bandScore']} | {detail['topic']} | words={detail['wordCount']}")
        elif status == "duplicate":
            skipped += 1
            print(f"  [DUP]   Band {detail['bandScore']} (already in DB)")
        else:
            failed += 1
            print(f"  [FAIL]  API error (status={status})")

        time.sleep(args.delay)

    # Summary
    print(f"\n{'=' * 60}")
    print(f"Done! Saved: {saved} | Failed: {failed} | Skipped: {skipped}")
    print(f"{'=' * 60}")

    # Reindex
    if args.reindex and saved > 0:
        print(f"\nReindexing vector store...")
        if reindex(args.api):
            info = count_samples(args.api)
            print(f"  Vector store reindexed!")
            print(f"  DB samples: {info['dbCount']}")
            print(f"  Vector store ready: {info['vectorStoreIndexed']}")
        else:
            print(f"  [ERROR] Reindex failed")


if __name__ == "__main__":
    main()
