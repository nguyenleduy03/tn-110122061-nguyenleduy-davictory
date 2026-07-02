#!/usr/bin/env python3
"""Seed sample data into DAVictory MySQL DB for report testing.

Usage:
    python scripts/seed_report_sample_data.py [--cleanup]

Creates:
    - 5 sample students + 1 sample teacher
    - 2 sample classes
    - 4 sample exams (weekly in June 2026 + 1 in July)
    - ~120 exam_attempts across week/month/quarter boundaries
    - ~20 writing submissions
    - ~15 speaking sessions/results

All sample records are tagged with email domain @sample.davictory.local
so they can be cleaned up easily.
"""

import argparse
import random
import uuid
from datetime import datetime, timedelta

import pymysql

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DB_HOST = "localhost"
DB_PORT = 3306
DB_USER = "root"
DB_PASSWORD = "1111"
DB_NAME = "DAVictory"

SAMPLE_EMAIL_DOMAIN = "sample.davictory.local"


def connect():
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _now():
    return datetime.now()


def _random_date(start: datetime, end: datetime) -> datetime:
    delta = end - start
    seconds = random.randint(0, int(delta.total_seconds()))
    return start + timedelta(seconds=seconds)


def _random_band() -> float:
    """Return realistic IELTS band between 2.0 and 7.5."""
    return round(random.uniform(2.0, 7.5) * 2) / 2


def _get_role_ids(cursor) -> dict:
    cursor.execute("SELECT id, name FROM roles")
    return {row["name"]: row["id"] for row in cursor.fetchall()}


def _get_existing_test_id(cursor) -> int:
    """Pick a published full test to attach sample exams to."""
    cursor.execute(
        "SELECT id FROM tests WHERE status = 'PUBLISHED' AND is_full_test = 1 LIMIT 1"
    )
    row = cursor.fetchone()
    if row:
        return row["id"]
    # Fallback: any published test
    cursor.execute("SELECT id FROM tests WHERE status = 'PUBLISHED' LIMIT 1")
    row = cursor.fetchone()
    if row:
        return row["id"]
    raise RuntimeError("No published test found. Please create a test first.")


# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
def cleanup_sample_data(conn):
    with conn.cursor() as cursor:
        # Find sample user IDs
        cursor.execute(
            f"SELECT id FROM users WHERE email LIKE '%@{SAMPLE_EMAIL_DOMAIN}'"
        )
        user_ids = [row["id"] for row in cursor.fetchall()]

        if not user_ids:
            print("No sample data found to clean up.")
            return

        user_id_in = ",".join(str(u) for u in user_ids)

        # Delete dependent records
        tables = [
            "speaking_results",
            "speaking_sessions",
            "speaking_attempts",
            "student_writing_submissions",
            "exam_attempts",
            "exams",
            "class_students",
            "class_teachers",
            "classes",
            "user_roles",
            "users",
        ]
        # Delete child records by user_id
        for table in tables:
            if table in ("classes", "exams", "users"):
                continue
            cursor.execute(f"DELETE FROM {table} WHERE user_id IN ({user_id_in})")

        # Delete sample exams (must be before users due to created_by FK)
        cursor.execute("DELETE FROM exams WHERE title LIKE '[SAMPLE]%'")

        # Delete sample classes
        cursor.execute("DELETE FROM classes WHERE code LIKE 'SAMPLE-%'")

        # Delete roles and users
        cursor.execute(f"DELETE FROM user_roles WHERE user_id IN ({user_id_in})")
        cursor.execute(f"DELETE FROM users WHERE id IN ({user_id_in})")

        conn.commit()
        print(f"Cleaned up sample data for {len(user_ids)} users.")


# ---------------------------------------------------------------------------
# Seed functions
# ---------------------------------------------------------------------------
def seed_users_and_classes(conn, role_ids):
    with conn.cursor() as cursor:
        # Create sample users
        sample_students = [
            ("Nguyễn Văn A", "sample.student1"),
            ("Trần Thị B", "sample.student2"),
            ("Lê Văn C", "sample.student3"),
            ("Phạm Thị D", "sample.student4"),
            ("Hoàng Văn E", "sample.student5"),
        ]
        sample_teacher = ("Giáo viên Mẫu", "sample.teacher1")

        student_ids = []
        for full_name, username in sample_students:
            email = f"{username}@{SAMPLE_EMAIL_DOMAIN}"
            cursor.execute(
                """
                INSERT INTO users (username, email, password, full_name, is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, 1, NOW(), NOW())
                ON DUPLICATE KEY UPDATE full_name=VALUES(full_name)
                """,
                (username, email, "$2a$10$sample", full_name),
            )
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            student_ids.append(cursor.fetchone()["id"])

        # Teacher
        teacher_email = f"{sample_teacher[1]}@{SAMPLE_EMAIL_DOMAIN}"
        cursor.execute(
            """
            INSERT INTO users (username, email, password, full_name, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, 1, NOW(), NOW())
            ON DUPLICATE KEY UPDATE full_name=VALUES(full_name)
            """,
            (sample_teacher[1], teacher_email, "$2a$10$sample", sample_teacher[0]),
        )
        cursor.execute("SELECT id FROM users WHERE email = %s", (teacher_email,))
        teacher_id = cursor.fetchone()["id"]

        # Assign roles
        for sid in student_ids:
            cursor.execute(
                "INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (%s, %s)",
                (sid, role_ids["STUDENT"]),
            )
        cursor.execute(
            "INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (%s, %s)",
            (teacher_id, role_ids["TEACHER"]),
        )

        # Get a default center
        cursor.execute("SELECT id FROM centers LIMIT 1")
        center_row = cursor.fetchone()
        center_id = center_row["id"] if center_row else None

        # Create sample classes
        classes = [
            ("SAMPLE-IELTS-A1", "IELTS Sample Class A1", "ACADEMIC"),
            ("SAMPLE-IELTS-A2", "IELTS Sample Class A2", "ACADEMIC"),
        ]
        class_ids = []
        for code, name, level in classes:
            cursor.execute(
                """
                INSERT INTO classes (code, name, level, max_students, status, start_date, end_date, is_active, center_id, created_at, updated_at)
                VALUES (%s, %s, %s, 30, 'ACTIVE', '2026-01-01', '2026-12-31', 1, %s, NOW(), NOW())
                ON DUPLICATE KEY UPDATE name=VALUES(name), level=VALUES(level)
                """,
                (code, name, level, center_id),
            )
            cursor.execute("SELECT id FROM classes WHERE code = %s", (code,))
            class_ids.append(cursor.fetchone()["id"])

        # Link students to classes
        for i, sid in enumerate(student_ids):
            class_id = class_ids[i % len(class_ids)]
            cursor.execute(
                "INSERT IGNORE INTO class_students (class_id, user_id, status, enrolled_at) VALUES (%s, %s, 'ACTIVE', NOW())",
                (class_id, sid),
            )

        # Link teacher to classes
        for cid in class_ids:
            cursor.execute(
                "INSERT IGNORE INTO class_teachers (class_id, user_id, role, is_active) VALUES (%s, %s, 'TEACHER', 1)",
                (cid, teacher_id),
            )

        conn.commit()
        return student_ids, teacher_id, class_ids


def seed_exams_and_attempts(conn, student_ids, teacher_id):
    with conn.cursor() as cursor:
        test_id = _get_existing_test_id(cursor)

        # Get a default session_id for exam_attempts FK
        cursor.execute("SELECT id FROM sessions LIMIT 1")
        session_id = cursor.fetchone()["id"]

        # Create 4 sample exams: 3 in June 2026, 1 in July 2026
        exams = [
            ("[SAMPLE] Kỳ thi thử tuần 1 - Tháng 6", "2026-06-02 08:00:00", "2026-06-08 22:00:00"),
            ("[SAMPLE] Kỳ thi thử tuần 2 - Tháng 6", "2026-06-09 08:00:00", "2026-06-15 22:00:00"),
            ("[SAMPLE] Kỳ thi thử tuần 3 - Tháng 6", "2026-06-16 08:00:00", "2026-06-22 22:00:00"),
            ("[SAMPLE] Kỳ thi thử tuần 4 - Tháng 6", "2026-06-23 08:00:00", "2026-06-29 22:00:00"),
            ("[SAMPLE] Kỳ thi thử tuần 1 - Tháng 7", "2026-07-01 08:00:00", "2026-07-05 22:00:00"),
        ]

        exam_ids = []
        for title, start, end in exams:
            cursor.execute(
                """
                INSERT INTO exams (title, exam_type, test_id, scheduled_start_time, scheduled_end_time, status, created_by, created_at, updated_at)
                VALUES (%s, 'CLASS_EXAM', %s, %s, %s, 'CLOSED', %s, NOW(), NOW())
                ON DUPLICATE KEY UPDATE title=VALUES(title), scheduled_start_time=VALUES(scheduled_start_time)
                """,
                (title, test_id, start, end, teacher_id),
            )
            cursor.execute("SELECT id FROM exams WHERE title = %s", (title,))
            exam_ids.append(cursor.fetchone()["id"])

        # Generate attempts
        # Quarter report: June attempts (dates between exam start and end)
        # Week report: July attempts
        attempt_count = 0
        for exam_id, (title, start_str, end_str) in zip(exam_ids, exams):
            start_dt = datetime.strptime(start_str, "%Y-%m-%d %H:%M:%S")
            end_dt = datetime.strptime(end_str, "%Y-%m-%d %H:%M:%S")

            # 4-8 attempts per exam
            for _ in range(random.randint(4, 8)):
                user_id = random.choice(student_ids)
                started = _random_date(start_dt, end_dt)
                submitted = started + timedelta(minutes=random.randint(30, 120))
                band = _random_band()
                raw = round(band * random.uniform(3.5, 4.5), 2)  # rough raw score
                status = random.choices(
                    ["SUBMITTED", "TIMEOUT", "IN_PROGRESS"],
                    weights=[80, 15, 5],
                )[0]

                if status == "IN_PROGRESS":
                    submitted = None
                    band = None
                    raw = None

                attempt_number = random.randint(1, 5)
                cursor.execute(
                    """
                    INSERT INTO exam_attempts
                    (user_id, test_id, exam_id, session_id, attempt_number, status, started_at, submitted_at, band_score, raw_score, time_spent_seconds, is_active, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1, NOW(), NOW())
                    """,
                    (
                        user_id,
                        test_id,
                        exam_id,
                        session_id,
                        attempt_number,
                        status,
                        started,
                        submitted,
                        band,
                        raw,
                        random.randint(1800, 7200),
                    ),
                )
                attempt_count += 1

        conn.commit()
        return exam_ids, attempt_count


def seed_writing_submissions(conn, student_ids):
    with conn.cursor() as cursor:
        # Get some writing_prompt_ids
        cursor.execute("SELECT id FROM writing_prompts ORDER BY id LIMIT 5")
        prompt_ids = [row["id"] for row in cursor.fetchall()]
        if not prompt_ids:
            print("No writing_prompts found, skipping writing submissions.")
            return 0

        sample_texts = [
            "In recent years, technology has transformed education significantly. Students now have access to online resources and digital classrooms.",
            "Many people believe that studying abroad is the best way to learn a language. However, there are both advantages and disadvantages.",
            "The environment is one of the most important issues today. Governments and individuals must take responsibility.",
            "Some argue that traditional exams are not the best way to assess students. Continuous assessment may be more effective.",
            "Social media has changed the way people communicate. While it brings benefits, it also has negative effects.",
        ]

        count = 0
        # Generate 20 submissions spread across June and July 2026
        start = datetime(2026, 6, 1)
        end = datetime(2026, 7, 5)
        for i in range(20):
            user_id = random.choice(student_ids)
            prompt_id = random.choice(prompt_ids)
            text = random.choice(sample_texts) + f" This is sample submission number {i+1}."
            word_count = len(text.split())
            band = round(random.uniform(4.0, 7.0), 1)
            submitted = _random_date(start, end)
            cursor.execute(
                """
                INSERT INTO student_writing_submissions
                (user_id, writing_prompt_id, submission_text, word_count, status, overall_band_score, submitted_at, attempt_number, created_at, updated_at)
                VALUES (%s, %s, %s, %s, 'GRADED', %s, %s, 1, NOW(), NOW())
                """,
                (user_id, prompt_id, text, word_count, band, submitted),
            )
            count += 1

        conn.commit()
        return count


def seed_speaking_data(conn, student_ids):
    with conn.cursor() as cursor:
        count = 0
        start = datetime(2026, 6, 1)
        end = datetime(2026, 7, 5)

        for i in range(15):
            user_id = random.choice(student_ids)
            session_id = f"sample-session-{uuid.uuid4().hex[:8]}"
            created = _random_date(start, end)

            # speaking_sessions
            cursor.execute(
                """
                INSERT INTO speaking_sessions (session_id, user_id, user_name, user_role, status, started_at, created_at, updated_at, total_turns)
                VALUES (%s, %s, 'Sample User', 'STUDENT', 'COMPLETED', %s, %s, %s, 5)
                """,
                (session_id, user_id, created, created, created),
            )

            # speaking_results
            overall = random.randint(3, 7)
            fc = random.randint(3, 7)
            lr = random.randint(3, 7)
            gra = random.randint(3, 7)
            p = random.randint(3, 7)
            cursor.execute(
                """
                INSERT INTO speaking_results
                (session_id, user_id, overall_band, fc_band, lr_band, gra_band, p_band, status, result_id, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'COMPLETED', %s, %s)
                """,
                (session_id, user_id, overall, fc, lr, gra, p, f"res-{uuid.uuid4().hex[:8]}", created),
            )

            # speaking_attempts
            cursor.execute(
                """
                INSERT INTO speaking_attempts
                (user_id, speaking_part, status, overall_band_score, started_at, submitted_at, attempt_number, created_at, updated_at, is_active)
                VALUES (%s, 'PART1', 'GRADED', %s, %s, %s, 1, %s, %s, 1)
                """,
                (user_id, float(overall), created, created + timedelta(minutes=10), created, created),
            )
            count += 1

        conn.commit()
        return count


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Seed sample data for DAVictory reports")
    parser.add_argument("--cleanup", action="store_true", help="Remove all sample data")
    args = parser.parse_args()

    conn = connect()
    try:
        if args.cleanup:
            cleanup_sample_data(conn)
            return

        # Always clean previous sample data first to keep runs idempotent
        print("Cleaning previous sample data (if any)...")
        cleanup_sample_data(conn)

        print("Seeding sample data into DAVictory DB...")
        role_ids = _get_role_ids(conn.cursor())
        print(f"  Roles: {role_ids}")

        student_ids, teacher_id, class_ids = seed_users_and_classes(conn, role_ids)
        print(f"  Created/updated {len(student_ids)} students, 1 teacher, {len(class_ids)} classes")

        exam_ids, attempt_count = seed_exams_and_attempts(conn, student_ids, teacher_id)
        print(f"  Created/updated {len(exam_ids)} exams, {attempt_count} exam attempts")

        writing_count = seed_writing_submissions(conn, student_ids)
        print(f"  Created {writing_count} writing submissions")

        speaking_count = seed_speaking_data(conn, student_ids)
        print(f"  Created {speaking_count} speaking sessions/results")

        print("\nDone! Sample data is ready for report testing.")
        print("Run: ./manage.sh start ai-agent  # then test /api/agent/report/templates")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
