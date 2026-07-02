"""Overview Dashboard tool – fetches comprehensive stats for the report dashboard."""

import asyncio
from datetime import datetime, timedelta

from loguru import logger

from tools.tools_library import _run_sql


from core.tool_base import BaseTool, ToolParameter

class GetOverviewDashboard(BaseTool):
    name = "get_overview_dashboard"
    description = "[TỔNG QUAN - DASHBOARD] Lấy tất cả chỉ số KPI và dữ liệu biểu đồ tổng quan trung tâm kèm so sánh với kỳ trước. Lọc theo period (week, month, quarter, year)."
    parameters = [
        ToolParameter("period", "string", "Kỳ báo cáo: week, month, quarter, year (mặc định month)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        period = params.get("period", "month")
        return await get_overview_dashboard(period)


# ── Period helpers ────────────────────────────────────────────────

def _period_days(period: str) -> int:
    return {"week": 7, "month": 30, "quarter": 90, "year": 365}.get(period, 30)


def _period_interval(period: str) -> str:
    days = _period_days(period)
    return f"INTERVAL {days} DAY"


def _trend_group_expr(period: str) -> tuple[str, str]:
    """Return (date_trunc_expr, label_format) for time-series grouping."""
    if period == "week":
        return "DATE(ea.started_at)", "%d/%m"
    elif period == "month":
        # group by week number
        return "DATE(DATE_SUB(ea.started_at, INTERVAL WEEKDAY(ea.started_at) DAY))", "W%v"
    elif period == "quarter":
        return "DATE_FORMAT(ea.started_at, '%Y-%m-01')", "%m/%Y"
    else:  # year
        return "DATE_FORMAT(ea.started_at, '%Y-%m-01')", "%m/%Y"


# ── Main function ────────────────────────────────────────────────

async def get_overview_dashboard(period: str = "month") -> dict:
    """Fetch all overview dashboard data in parallel.

    Returns structured data with:
    - kpi_cards: list of KPI metrics with current vs previous period comparison
    - charts: dict of chart datasets
    - raw_data: raw query results for LLM analysis
    """
    days = _period_days(period)
    interval = _period_interval(period)

    # Run all queries in parallel
    results = await asyncio.gather(
        _fetch_kpi_data(interval, days),
        _fetch_user_distribution(),
        _fetch_test_stats(interval),
        _fetch_skill_distribution(),
        _fetch_score_distribution(interval),
        _fetch_time_trend(period, interval),
        _fetch_top_students(interval),
        _fetch_top_classes(interval),
        _fetch_teacher_productivity(),
        return_exceptions=True,
    )

    kpi_data = results[0] if not isinstance(results[0], Exception) else {}
    user_dist = results[1] if not isinstance(results[1], Exception) else []
    test_stats = results[2] if not isinstance(results[2], Exception) else {}
    skill_dist = results[3] if not isinstance(results[3], Exception) else []
    score_dist = results[4] if not isinstance(results[4], Exception) else []
    time_trend = results[5] if not isinstance(results[5], Exception) else []
    top_students = results[6] if not isinstance(results[6], Exception) else []
    top_classes = results[7] if not isinstance(results[7], Exception) else []
    teacher_prod = results[8] if not isinstance(results[8], Exception) else []

    # Log any errors
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            logger.warning(f"Overview query {i} failed: {r}")

    # ── Build KPI cards ─────────────────────────────────────────
    kpi_cards = _build_kpi_cards(kpi_data, test_stats)

    # ── Build charts ────────────────────────────────────────────
    charts = {
        "user_distribution": {
            "type": "donut",
            "title": "Phân bố người dùng theo vai trò",
            "data": user_dist,
            "meta_key": "user_distribution",
        },
        "test_status": {
            "type": "donut",
            "title": "Đề thi theo trạng thái",
            "data": [
                {"label": "Đã xuất bản", "value": test_stats.get("published", 0)},
                {"label": "Đang duyệt", "value": test_stats.get("reviewing", 0)},
                {"label": "Nháp", "value": test_stats.get("draft", 0)},
            ],
            "meta_key": "test_status",
        },
        "test_type": {
            "type": "donut",
            "title": "Full Test vs Đơn kỹ năng",
            "data": [
                {"label": "Full Test", "value": test_stats.get("full_tests", 0)},
                {"label": "Đơn kỹ năng", "value": test_stats.get("single_skill", 0)},
            ],
            "meta_key": "test_type",
        },
        "skill_distribution": {
            "type": "bar",
            "title": "Đề thi theo kỹ năng",
            "data": skill_dist,
            "meta_key": "skill_distribution",
        },
        "score_distribution": {
            "type": "bar",
            "title": "Phân bố điểm Band",
            "data": score_dist,
            "meta_key": "score_distribution",
        },
        "time_trend": {
            "type": "line",
            "title": "Xu hướng lượt thi",
            "data": time_trend,
            "meta_key": "time_trend",
        },
        "top_students": {
            "type": "bar",
            "title": "Top học viên điểm cao",
            "data": top_students,
            "meta_key": "top_students",
        },
        "top_classes": {
            "type": "bar",
            "title": "Điểm trung bình theo lớp",
            "data": top_classes,
            "meta_key": "top_classes",
        },
        "teacher_productivity": {
            "type": "bar",
            "title": "Năng suất giáo viên (đề thi đã tạo)",
            "data": teacher_prod,
            "meta_key": "teacher_productivity",
        },
    }

    return {
        "kpi_cards": kpi_cards,
        "charts": charts,
        "raw_data": {
            "kpi": kpi_data,
            "test_stats": test_stats,
        },
        "period": period,
        "generated_at": datetime.now().isoformat(),
    }


# ── Query functions ──────────────────────────────────────────────

async def _fetch_kpi_data(interval: str, days: int) -> dict:
    """Fetch KPI metrics for current period and previous period."""
    prev_interval = f"INTERVAL {days * 2} DAY"

    rows = await _run_sql(f"""
        SELECT
            -- Users total
            (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
            (SELECT COUNT(*) FROM users u
             JOIN user_roles ur ON ur.user_id = u.id
             JOIN roles r ON r.id = ur.role_id
             WHERE r.name = 'STUDENT' AND u.deleted_at IS NULL) as total_students,
            (SELECT COUNT(*) FROM users u
             JOIN user_roles ur ON ur.user_id = u.id
             JOIN roles r ON r.id = ur.role_id
             WHERE r.name = 'TEACHER' AND u.deleted_at IS NULL) as total_teachers,

            -- New users this period
            (SELECT COUNT(*) FROM users
             WHERE created_at >= DATE_SUB(NOW(), {interval})
               AND deleted_at IS NULL) as new_users_current,
            (SELECT COUNT(*) FROM users
             WHERE created_at >= DATE_SUB(NOW(), {prev_interval})
               AND created_at < DATE_SUB(NOW(), {interval})
               AND deleted_at IS NULL) as new_users_previous,

            -- Classes
            (SELECT COUNT(*) FROM classes) as total_classes,

            -- Exam attempts current period
            (SELECT COUNT(*) FROM exam_attempts
             WHERE started_at >= DATE_SUB(NOW(), {interval})) as attempts_current,
            (SELECT COUNT(*) FROM exam_attempts
             WHERE started_at >= DATE_SUB(NOW(), {prev_interval})
               AND started_at < DATE_SUB(NOW(), {interval})) as attempts_previous,

            -- Completed (submitted) current
            (SELECT COUNT(*) FROM exam_attempts
             WHERE status = 'SUBMITTED'
               AND started_at >= DATE_SUB(NOW(), {interval})) as completed_current,
            (SELECT COUNT(*) FROM exam_attempts
             WHERE status = 'SUBMITTED'
               AND started_at >= DATE_SUB(NOW(), {prev_interval})
               AND started_at < DATE_SUB(NOW(), {interval})) as completed_previous,

            -- Unique students current
            (SELECT COUNT(DISTINCT user_id) FROM exam_attempts
             WHERE started_at >= DATE_SUB(NOW(), {interval})) as unique_students_current,
            (SELECT COUNT(DISTINCT user_id) FROM exam_attempts
             WHERE started_at >= DATE_SUB(NOW(), {prev_interval})
               AND started_at < DATE_SUB(NOW(), {interval})) as unique_students_previous,

            -- Avg band current
            (SELECT ROUND(AVG(band_score), 2) FROM exam_attempts
             WHERE band_score IS NOT NULL
               AND started_at >= DATE_SUB(NOW(), {interval})) as avg_band_current,
            (SELECT ROUND(AVG(band_score), 2) FROM exam_attempts
             WHERE band_score IS NOT NULL
               AND started_at >= DATE_SUB(NOW(), {prev_interval})
               AND started_at < DATE_SUB(NOW(), {interval})) as avg_band_previous,

            -- Writing submissions
            (SELECT COUNT(*) FROM student_writing_submissions
             WHERE submitted_at >= DATE_SUB(NOW(), {interval})) as writing_current,
            (SELECT COUNT(*) FROM student_writing_submissions
             WHERE submitted_at >= DATE_SUB(NOW(), {prev_interval})
               AND submitted_at < DATE_SUB(NOW(), {interval})) as writing_previous,

            -- Speaking attempts
            (SELECT COUNT(*) FROM speaking_attempts
             WHERE started_at >= DATE_SUB(NOW(), {interval})) as speaking_current,
            (SELECT COUNT(*) FROM speaking_attempts
             WHERE started_at >= DATE_SUB(NOW(), {prev_interval})
               AND started_at < DATE_SUB(NOW(), {interval})) as speaking_previous,

            -- Blog posts
            (SELECT COUNT(*) FROM blog_posts
             WHERE status = 'published' AND deleted_at IS NULL) as total_blog_posts,

            -- Tests
            (SELECT COUNT(*) FROM tests WHERE status != 'DELETED') as total_tests
    """)
    return rows[0] if rows else {}


async def _fetch_user_distribution() -> list:
    rows = await _run_sql("""
        SELECT r.name as role, COUNT(DISTINCT u.id) as cnt
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE u.deleted_at IS NULL
        GROUP BY r.name
        ORDER BY cnt DESC
    """)
    label_map = {"STUDENT": "Học viên", "TEACHER": "Giáo viên", "MANAGER": "Quản lý", "ADMIN": "Admin"}
    return [{"label": label_map.get(r["role"], r["role"]), "value": r["cnt"]} for r in rows]


async def _fetch_test_stats(interval: str) -> dict:
    rows = await _run_sql("""
        SELECT
            SUM(CASE WHEN status = 'PUBLISHED' THEN 1 ELSE 0 END) as published,
            SUM(CASE WHEN status = 'REVIEWING' THEN 1 ELSE 0 END) as reviewing,
            SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) as draft,
            SUM(CASE WHEN is_full_test = 1 THEN 1 ELSE 0 END) as full_tests,
            SUM(CASE WHEN is_full_test = 0 OR is_full_test IS NULL THEN 1 ELSE 0 END) as single_skill,
            COUNT(*) as total
        FROM tests
        WHERE status != 'DELETED'
    """)
    r = rows[0] if rows else {}
    return {k: int(v or 0) for k, v in r.items()}


async def _fetch_skill_distribution() -> list:
    rows = await _run_sql("""
        SELECT COALESCE(s.skill_type, 'UNKNOWN') as skill, COUNT(DISTINCT t.id) as cnt
        FROM tests t
        LEFT JOIN test_sessions ts ON ts.test_id = t.id
        LEFT JOIN sessions s ON s.id = ts.session_id
        WHERE t.status != 'DELETED'
        GROUP BY s.skill_type
        ORDER BY cnt DESC
    """)
    label_map = {"LISTENING": "Listening", "READING": "Reading", "WRITING": "Writing",
                 "SPEAKING": "Speaking", "UNKNOWN": "Khác"}
    return [{"label": label_map.get(r["skill"], r["skill"]), "value": r["cnt"], "max": 100} for r in rows if r["skill"] != "UNKNOWN"]


async def _fetch_score_distribution(interval: str) -> list:
    rows = await _run_sql(f"""
        SELECT
            CASE
                WHEN band_score >= 7.5 THEN '7.5-9.0'
                WHEN band_score >= 6.0 THEN '6.0-7.0'
                WHEN band_score >= 4.5 THEN '4.5-5.5'
                WHEN band_score >= 3.0 THEN '3.0-4.0'
                ELSE '0-2.5'
            END as band_range,
            COUNT(*) as cnt
        FROM exam_attempts
        WHERE band_score IS NOT NULL
          AND started_at >= DATE_SUB(NOW(), {interval})
        GROUP BY band_range
        ORDER BY FIELD(band_range, '0-2.5', '3.0-4.0', '4.5-5.5', '6.0-7.0', '7.5-9.0')
    """)
    # Ensure all ranges exist
    all_ranges = ['0-2.5', '3.0-4.0', '4.5-5.5', '6.0-7.0', '7.5-9.0']
    range_map = {r["band_range"]: r["cnt"] for r in rows}
    return [{"label": rng, "value": range_map.get(rng, 0)} for rng in all_ranges]


async def _fetch_time_trend(period: str, interval: str) -> list:
    group_expr, _ = _trend_group_expr(period)
    rows = await _run_sql(f"""
        SELECT {group_expr} as period_date, COUNT(*) as cnt
        FROM exam_attempts ea
        WHERE ea.started_at >= DATE_SUB(NOW(), {interval})
        GROUP BY period_date
        ORDER BY period_date ASC
    """)
    result = []
    for r in rows:
        pd = r["period_date"]
        if isinstance(pd, datetime):
            label = pd.strftime("%d/%m")
        elif isinstance(pd, str):
            label = pd
        else:
            label = str(pd)
        result.append({"label": label, "value": r["cnt"]})
    return result


async def _fetch_top_students(interval: str) -> list:
    rows = await _run_sql(f"""
        SELECT u.full_name, ROUND(AVG(ea.band_score), 1) as avg_band,
               COUNT(ea.id) as total_attempts
        FROM exam_attempts ea
        JOIN users u ON u.id = ea.user_id
        WHERE ea.band_score IS NOT NULL
          AND ea.started_at >= DATE_SUB(NOW(), {interval})
          AND u.deleted_at IS NULL
        GROUP BY u.id, u.full_name
        HAVING COUNT(ea.id) >= 1
        ORDER BY avg_band DESC
        LIMIT 8
    """)
    return [{"label": r["full_name"], "value": float(r["avg_band"]), "max": 9,
             "extra": f'{r["total_attempts"]} lượt'} for r in rows]


async def _fetch_top_classes(interval: str) -> list:
    rows = await _run_sql(f"""
        SELECT c.name, ROUND(AVG(ea.band_score), 1) as avg_band,
               COUNT(DISTINCT cs.user_id) as student_count
        FROM classes c
        JOIN class_students cs ON cs.class_id = c.id AND cs.status = 'ACTIVE'
        LEFT JOIN exam_attempts ea ON ea.user_id = cs.user_id
          AND ea.band_score IS NOT NULL
          AND ea.started_at >= DATE_SUB(NOW(), {interval})
        GROUP BY c.id, c.name
        HAVING avg_band IS NOT NULL
        ORDER BY avg_band DESC
        LIMIT 8
    """)
    return [{"label": r["name"], "value": float(r["avg_band"]), "max": 9,
             "extra": f'{r["student_count"]} HV'} for r in rows]


async def _fetch_teacher_productivity() -> list:
    rows = await _run_sql("""
        SELECT u.full_name, COUNT(DISTINCT t.id) as tests_created
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        LEFT JOIN tests t ON t.created_by = u.id AND t.status != 'DELETED'
        WHERE r.name IN ('TEACHER', 'ADMIN', 'MANAGER')
          AND u.deleted_at IS NULL
        GROUP BY u.id, u.full_name
        HAVING tests_created > 0
        ORDER BY tests_created DESC
        LIMIT 8
    """)
    max_val = max((r["tests_created"] for r in rows), default=1)
    return [{"label": r["full_name"], "value": r["tests_created"], "max": max_val} for r in rows]


# ── KPI card builder ─────────────────────────────────────────────

def _calc_change(current, previous) -> dict:
    """Calculate percentage change and trend."""
    if current is None:
        current = 0
    if previous is None or previous == 0:
        return {"change_pct": None, "trend": "neutral", "change_label": "—"}

    current = float(current)
    previous = float(previous)
    pct = round(((current - previous) / previous) * 100, 1)
    trend = "up" if pct > 0 else ("down" if pct < 0 else "neutral")
    label = f"+{pct}%" if pct > 0 else f"{pct}%"
    return {"change_pct": pct, "trend": trend, "change_label": label}


def _build_kpi_cards(kpi: dict, test_stats: dict) -> list:
    if not kpi:
        return []

    total_attempts = int(kpi.get("attempts_current") or 0)
    completed = int(kpi.get("completed_current") or 0)
    completion_rate = round((completed / total_attempts * 100), 1) if total_attempts > 0 else 0

    total_attempts_prev = int(kpi.get("attempts_previous") or 0)
    completed_prev = int(kpi.get("completed_previous") or 0)
    completion_rate_prev = round((completed_prev / total_attempts_prev * 100), 1) if total_attempts_prev > 0 else 0

    cards = [
        {
            "key": "total_users",
            "label": "Tổng người dùng",
            "value": int(kpi.get("total_users") or 0),
            "icon": "users",
            "color": "#2563eb",
            **_calc_change(kpi.get("new_users_current"), kpi.get("new_users_previous")),
            "description": f'{int(kpi.get("total_students") or 0)} HV, {int(kpi.get("total_teachers") or 0)} GV',
        },
        {
            "key": "new_users",
            "label": "Người dùng mới",
            "value": int(kpi.get("new_users_current") or 0),
            "icon": "user-plus",
            "color": "#059669",
            **_calc_change(kpi.get("new_users_current"), kpi.get("new_users_previous")),
            "description": "Đăng ký mới trong kỳ",
        },
        {
            "key": "total_classes",
            "label": "Lớp học",
            "value": int(kpi.get("total_classes") or 0),
            "icon": "school",
            "color": "#7c3aed",
            "change_pct": None, "trend": "neutral", "change_label": "—",
            "description": "Tổng số lớp",
        },
        {
            "key": "total_tests",
            "label": "Đề thi",
            "value": int(kpi.get("total_tests") or 0),
            "icon": "file-text",
            "color": "#d97706",
            "change_pct": None, "trend": "neutral", "change_label": "—",
            "description": f'{test_stats.get("published", 0)} đã xuất bản',
        },
        {
            "key": "exam_attempts",
            "label": "Lượt thi trong kỳ",
            "value": total_attempts,
            "icon": "activity",
            "color": "#dc2626",
            **_calc_change(total_attempts, kpi.get("attempts_previous")),
            "description": f'{int(kpi.get("unique_students_current") or 0)} học viên',
        },
        {
            "key": "avg_band_score",
            "label": "Điểm Band TB",
            "value": float(kpi.get("avg_band_current") or 0),
            "unit": "/9.0",
            "icon": "target",
            "color": "#0891b2",
            **_calc_change(kpi.get("avg_band_current"), kpi.get("avg_band_previous")),
            "description": "Trung bình trong kỳ",
        },
        {
            "key": "completion_rate",
            "label": "Tỷ lệ hoàn thành",
            "value": completion_rate,
            "unit": "%",
            "icon": "check-circle",
            "color": "#059669",
            **_calc_change(completion_rate, completion_rate_prev),
            "description": f'{completed}/{total_attempts} bài',
        },
        {
            "key": "writing_submissions",
            "label": "Bài Writing",
            "value": int(kpi.get("writing_current") or 0),
            "icon": "pen-tool",
            "color": "#db2777",
            **_calc_change(kpi.get("writing_current"), kpi.get("writing_previous")),
            "description": "Bài nộp trong kỳ",
        },
        {
            "key": "speaking_attempts",
            "label": "Sessions Speaking",
            "value": int(kpi.get("speaking_current") or 0),
            "icon": "mic",
            "color": "#65a30d",
            **_calc_change(kpi.get("speaking_current"), kpi.get("speaking_previous")),
            "description": "Phiên luyện trong kỳ",
        },
        {
            "key": "blog_posts",
            "label": "Blog posts",
            "value": int(kpi.get("total_blog_posts") or 0),
            "icon": "book-open",
            "color": "#6366f1",
            "change_pct": None, "trend": "neutral", "change_label": "—",
            "description": "Bài viết đã xuất bản",
        },
    ]
    return cards
