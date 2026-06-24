import os
import re
import pymysql

UPLOADS_DIR = "/home/hv/DuAn/DAVictory/ai-agent-python/uploads/articles"

IMG_RE = re.compile(r'/uploads/articles/([a-f0-9-]+\.(?:jpg|jpeg|png|webp|svg))')


def get_all_referenced_images(cur) -> set:
    referenced = set()
    cur.execute("SELECT thumbnail, content FROM blog_posts WHERE deleted_at IS NULL")
    for thumb, content in cur.fetchall():
        if thumb:
            m = re.search(r'([a-f0-9-]+\.(?:jpg|jpeg|png|webp|svg))$', thumb)
            if m:
                referenced.add(m.group(1))
        if content:
            for fn in IMG_RE.findall(content):
                referenced.add(fn)
    return referenced


def main():
    conn = pymysql.connect(
        host="localhost", user="root", password="1111", database="DAVictory"
    )
    cur = conn.cursor()

    referenced = get_all_referenced_images(cur)
    conn.close()

    print(f"Referenced images (in DB): {len(referenced)}")

    on_disk = set(os.listdir(UPLOADS_DIR))
    print(f"Files on disk: {len(on_disk)}")

    orphans = on_disk - referenced
    print(f"Orphaned files: {len(orphans)}")

    if not orphans:
        print("Nothing to delete.")
        return

    print("\nFiles to delete:")
    for f in sorted(orphans):
        sz = os.path.getsize(os.path.join(UPLOADS_DIR, f))
        print(f"  {f:55s} {sz:>7,} bytes")

    print(f"\nTotal space: {sum(os.path.getsize(os.path.join(UPLOADS_DIR, f)) for f in orphans):,} bytes")

    deleted = 0
    for f in sorted(orphans):
        os.remove(os.path.join(UPLOADS_DIR, f))
        deleted += 1
    print(f"\nDeleted {deleted} files.")
    print(f"Freed {sum(os.path.getsize(os.path.join(UPLOADS_DIR, f)) for f in orphans):,} bytes.")


if __name__ == "__main__":
    main()
