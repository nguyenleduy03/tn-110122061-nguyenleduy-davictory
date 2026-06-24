import re
import pymysql

DB = dict(host="localhost", user="root", password="1111", database="DAVictory")

IMG_STYLE = 'max-width:100%;border-radius:8px;margin:16px 0;'
URL_RE = re.compile(r'/uploads/articles/[a-f0-9-]+\.(?:jpg|jpeg|png|webp)')


def fix_content(content: str) -> str:
    # Find all image URLs not already inside a <img> tag
    def replace_url(m):
        url = m.group(0)
        pos = m.start()
        before = content[max(0, pos - 30):pos]
        # Skip if already inside <img ... src="..."
        if re.search(r'<img\s[^>]*src="', before):
            return url
        # Skip if inside a code block marker ```
        # (rough check: count ``` before this position)
        if content[:pos].count('```') % 2 == 1:
            return url

        # Extract alt text from nearby context AFTER the URL
        after = content[m.end():m.end() + 100]
        alt = "Minh họa"
        m_alt = re.search(r'alt="([^"]*)"', after)
        if m_alt:
            alt = m_alt.group(1)
        m_v_alt = re.search(r'với\s+alt="([^"]*)"', after)
        if m_v_alt:
            alt = m_v_alt.group(1)

        return f'<img src="{url}" alt="{alt}" style="{IMG_STYLE}" />'

    content = URL_RE.sub(replace_url, content)

    # Clean up leftover artifact patterns (only after img tags)
    content = re.sub(r'\s*với\s+alt="[^"]*"\s*', '', content)
    content = re.sub(r'\s*\(?alt="[^"]*"\)?\s*', '', content)

    # Remove stray <em>/<strong> wrapping image tags
    content = re.sub(
        r'</?(?:em|strong)>\s*(<img\s+src="/uploads/.*?/>)\s*</?(?:em|strong)>',
        r'\1',
        content
    )
    content = re.sub(r'<em>\s*</em>', '', content)
    content = re.sub(r'<strong>\s*</strong>', '', content)

    return content


def main():
    conn = pymysql.connect(**DB)
    cur = conn.cursor()

    cur.execute("SELECT id, content FROM blog_posts WHERE content IS NOT NULL AND content != ''")
    rows = cur.fetchall()
    fixed = 0
    for post_id, content in rows:
        new_content = fix_content(content)
        if new_content != content:
            cur.execute("UPDATE blog_posts SET content = %s WHERE id = %s", (new_content, post_id))
            fixed += 1
            print(f"  Fixed post {post_id}")

    conn.commit()
    conn.close()
    print(f"\nDone: {fixed} posts updated")


if __name__ == "__main__":
    main()
