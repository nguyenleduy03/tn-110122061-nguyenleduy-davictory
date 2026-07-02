import json
import re
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select, func, text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession

from loguru import logger

from core.tool_base import BaseTool, ToolParameter
from db.session import get_session_factory as async_session


# =============================================================================
# DATABASE HELPERS
# =============================================================================

_db_override: AsyncSession | None = None


def set_db(session: AsyncSession):
    global _db_override
    _db_override = session


async def get_db() -> AsyncSession:
    if _db_override:
        return _db_override
    from db.session import get_session_factory
    factory = get_session_factory()
    async with factory() as session:
        return session


def _make_session():
    if _db_override:
        return _db_override
    from db.session import get_session_factory
    return get_session_factory()


def _convert_row(row: dict) -> dict:
    result = {}
    for k, v in row.items():
        if isinstance(v, bytes):
            result[k] = bool(v[0])
        elif isinstance(v, (datetime, date)):
            result[k] = v.isoformat()
        elif isinstance(v, Decimal):
            result[k] = float(v)
        elif isinstance(v, timedelta):
            result[k] = str(v)
        else:
            result[k] = v
    return result


async def _run_sql(query: str, params: dict = None) -> list:
    stripped = query.strip().upper()
    if not stripped.startswith("SELECT") and not stripped.startswith("WITH"):
        raise ValueError("Only SELECT queries are allowed: " + query[:80])
    from sqlalchemy import text as sa_text
    session_maker = _make_session()
    if hasattr(session_maker, "__call__"):
        async with session_maker() as db:
            result = await db.execute(sa_text(query), params or {})
            if result.returns_rows:
                rows = result.fetchall()
                return [_convert_row(dict(row._mapping)) for row in rows]
            return []
    return []


async def _execute_sql(query: str, params: dict = None) -> dict:
    """Execute INSERT/UPDATE/DELETE, returns affected rows count."""
    from sqlalchemy import text as sa_text
    session_maker = _make_session()
    if hasattr(session_maker, "__call__"):
        async with session_maker() as db:
            result = await db.execute(sa_text(query), params or {})
            await db.commit()
            return {"affected_rows": result.rowcount if hasattr(result, "rowcount") else 0}
    return {"affected_rows": 0}


# =============================================================================
# TOOLS
# =============================================================================

class QueryDatabase(BaseTool):
    name = "query_database"
    description = "[Dùng khi cần SELECT với WHERE linh hoạt] Chạy SQL query với table, columns, where, params. Kiểm tra quyền truy cập bảng trước khi chạy."
    parameters = [
        ToolParameter("table", "string", "Tên bảng (vd: users, tests)"),
        ToolParameter("columns", "string", "Cột cần lấy (vd: id, name)", required=False),
        ToolParameter("where", "string", "Điều kiện (vd: status = :st)", required=False),
        ToolParameter("params", "string", 'Params JSON (vd: {"st":"ACTIVE"})', required=False),
        ToolParameter("limit", "integer", "Số lượng (mặc định 50)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> list[dict]:
        from infrastructure.api_client import check_permission, execute_query
        import json

        table = params.get("table", "")
        if not table:
            return [{"error": "Cần chỉ định table"}]

        role = user_context.get("role", "MANAGER")

        allowed = await check_permission(table, role)
        if not allowed:
            return [{"error": f"Không có quyền truy cập bảng '{table}'"}]

        cols = params.get("columns", "*")
        where = params.get("where", "")
        params_str = params.get("params", "{}")
        limit = int(params.get("limit", 50))

        try:
            params_dict = json.loads(params_str) if isinstance(params_str, str) else params_str
        except json.JSONDecodeError:
            params_dict = {}

        sql = f"SELECT {cols} FROM {table}"
        if where:
            sql += f" WHERE {where}"
        sql += f" LIMIT {limit}"

        try:
            return await execute_query(
                sql=sql,
                params=params_dict,
                table=table,
                limit=limit,
                role=role,
            )
        except Exception as e:
            err = str(e)
            if "Unknown column" in err:
                import re
                match = re.search(r"Unknown column '(\w+)'", err)
                if match:
                    bad_col = match.group(1)
                    cols_info = await _run_sql(f"SHOW COLUMNS FROM `{table}`")
                    actual_cols = [c["Field"] for c in cols_info]
                    import difflib
                    suggestions = difflib.get_close_matches(bad_col, actual_cols, n=3, cutoff=0.4)
                    msg = f"Lỗi: cột '{bad_col}' không tồn tại trong bảng '{table}'."
                    if suggestions:
                        msg += f" Các cột gần đúng: {', '.join(suggestions)}. Dùng GetTableColumns để xem cấu trúc."
                    return [{"error": msg, "suggestions": suggestions, "available_columns": actual_cols}]
            return [{"error": f"Query failed: {err}"}]


class GetTestsList(BaseTool):
    name = "get_tests_list"
    description = "[ĐỀ THI] Lấy danh sách đề thi IELTS, có thể lọc theo search (từ khóa), status (DRAFT/REVIEWING/PUBLISHED), test_type (ACADEMIC/GENERAL)"
    parameters = [
        ToolParameter("search", "string", "Từ khóa tìm kiếm", required=False),
        ToolParameter("status", "string", "Trạng thái: DRAFT, REVIEWING, PUBLISHED", required=False),
        ToolParameter("test_type", "string", "Loại: ACADEMIC, GENERAL", required=False),
        ToolParameter("limit", "integer", "Số lượng tối đa", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> list[dict]:
        q = "SELECT id, title, status, test_type, created_at FROM tests WHERE status != 'DELETED'"
        conds = []
        vals = {}
        if s := params.get("search"):
            conds.append("title LIKE :search")
            vals["search"] = f"%{s}%"
        if st := params.get("status"):
            conds.append("status = :status")
            vals["status"] = st.upper()
        if tt := params.get("test_type"):
            conds.append("test_type = :test_type")
            vals["test_type"] = tt.upper()
        if conds:
            q += " AND " + " AND ".join(conds)
        q += " ORDER BY created_at DESC LIMIT :limit"
        vals["limit"] = min(int(params.get("limit", 10)), 50)
        return await _run_sql(q, vals)


class GetCenterStats(BaseTool):
    name = "get_center_stats"
    description = "[TỔNG QUAN] Thống kê tổng quan trung tâm: tổng số users, classes, tests, submissions, exam_attempts. Dùng cho câu hỏi 'thông tin trung tâm', 'tổng quan', 'tổng số'"
    parameters = [
        ToolParameter("period", "string", "Kỳ: week, month, quarter (mặc định all)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        date_map = {"week": 7, "month": 30, "quarter": 90}
        days = date_map.get(params.get("period", ""))
        where = f" AND created_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)" if days else ""
        rows = await _run_sql(f"""
            SELECT
                (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL{where}) as total_users,
                (SELECT COUNT(*) FROM classes WHERE 1=1{where.replace('created_at', 'classes.created_at')}) as total_classes,
                (SELECT COUNT(*) FROM tests WHERE status != 'DELETED'{where.replace('created_at', 'tests.created_at')}) as total_tests,
                (SELECT COUNT(*) FROM student_writing_submissions WHERE 1=1{where.replace('created_at', 'student_writing_submissions.submitted_at')}) as total_submissions,
                (SELECT COUNT(*) FROM exam_attempts WHERE 1=1{where.replace('created_at', 'exam_attempts.started_at')}) as total_exam_attempts
        """)
        return rows[0] if rows else {"total_users": 0, "total_classes": 0, "total_tests": 0, "total_submissions": 0, "total_exam_attempts": 0}


class GetStudentProgress(BaseTool):
    name = "get_student_progress"
    description = "[HỌC SINH CÁ NHÂN] Xem tiến độ của 1 học sinh: số bài thi đã làm, số bài writing đã nộp, điểm writing trung bình. Cần student_id."
    parameters = [
        ToolParameter("student_id", "integer", "ID học sinh"),
        ToolParameter("period", "string", "Kỳ: week, month, quarter (mặc định month)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        sid = int(params.get("student_id", 0))
        if not sid:
            return {"error": "Cần student_id"}
        user = (await _run_sql("SELECT id, full_name, email FROM users WHERE id = :id AND deleted_at IS NULL", {"id": sid}))
        if not user:
            return {"error": "Không tìm thấy học sinh"}
        u = user[0]
        attempts = (await _run_sql("SELECT COUNT(*) as cnt FROM exam_attempts WHERE user_id = :id", {"id": sid}))[0]["cnt"]
        writing = (await _run_sql("SELECT COUNT(*) as cnt FROM student_writing_submissions WHERE user_id = :id", {"id": sid}))[0]["cnt"]
        avg = await _run_sql("SELECT AVG(ws.score) as avg_score FROM writing_scores ws JOIN student_writing_submissions sws ON ws.submission_id = sws.id WHERE sws.user_id = :id AND ws.score IS NOT NULL", {"id": sid})
        avg_score = avg[0]["avg_score"] if avg and avg[0]["avg_score"] else None
        return {
            "full_name": u["full_name"],
            "email": u["email"],
            "exam_attempts": attempts,
            "writing_submissions": writing,
            "avg_writing_score": float(avg_score) if avg_score else None,
        }


class CreateBlogPost(BaseTool):
    name = "create_blog_post"
    description = "Tạo bài viết blog IELTS mới, lưu vào DB (draft)"
    parameters = [
        ToolParameter("title", "string", "Tiêu đề bài viết"),
        ToolParameter("content", "string", "Nội dung bài viết (markdown/HTML)"),
        ToolParameter("excerpt", "string", "Tóm tắt ngắn", required=False),
        ToolParameter("tags", "string", "Tags phân cách bằng dấu phẩy", required=False),
        ToolParameter("thumbnail", "string", "URL ảnh đại diện", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        title = params.get("title", "")
        content = params.get("content", "")
        excerpt = params.get("excerpt", "")[:500]
        tags = params.get("tags", "ielts")
        thumbnail = params.get("thumbnail", "")
        reading_time = max(1, round(len(content.split()) / 200))
        slug = title.lower().replace(" ", "-").replace("--", "-")[:200]

        await _execute_sql(
            "INSERT INTO blog_posts (title, slug, content, excerpt, thumbnail, tags, status, reading_time, source, created_at, updated_at) "
            "VALUES (:title, :slug, :content, :excerpt, :thumbnail, :tags, 'draft', :reading_time, 'agent', NOW(), NOW())",
            {
                "title": title,
                "slug": slug,
                "content": content,
                "excerpt": excerpt,
                "thumbnail": thumbnail,
                "tags": tags,
                "reading_time": reading_time,
            },
        )
        return {"title": title, "status": "draft", "reading_time": reading_time, "tags": tags}


class GetUsersList(BaseTool):
    name = "get_users_list"
    description = "[NGƯỜI DÙNG] Lấy danh sách người dùng, có thể lọc theo role (STUDENT/TEACHER/MANAGER/ADMIN). Trả về tổng số và danh sách tên + email."
    parameters = [
        ToolParameter("role", "string", "Lọc theo role: STUDENT, TEACHER, MANAGER, ADMIN", required=False),
        ToolParameter("limit", "integer", "Số lượng tối đa (mặc định 20)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        limit = min(int(params.get("limit", 20)), 50)
        role = params.get("role", "")
        vals = {}

        role_join = "LEFT JOIN user_roles ur ON u.id = ur.user_id LEFT JOIN roles r ON ur.role_id = r.id"
        role_where = " AND r.name = :role" if role else ""

        count_sql = f"SELECT COUNT(DISTINCT u.id) as cnt FROM users u {role_join} WHERE u.deleted_at IS NULL{role_where}"
        if role:
            vals["role"] = role.upper()
        tong = (await _run_sql(count_sql, vals))[0]["cnt"]

        q = f"SELECT DISTINCT u.full_name, u.email FROM users u {role_join} WHERE u.deleted_at IS NULL{role_where} ORDER BY u.created_at DESC LIMIT :limit"
        vals["limit"] = limit
        rows = await _run_sql(q, vals)

        return {
            "tong": tong,
            "nguoi_dung": rows,
            "da_het": tong <= limit,
        }


class GetWritingStats(BaseTool):
    name = "get_writing_stats"
    description = "[WRITING] Thống kê điểm Writing: tổng số submissions, điểm trung bình theo kỳ (week/month/quarter). KHÔNG dùng cho câu hỏi về lớp học hay học sinh."
    parameters = [
        ToolParameter("period", "string", "Kỳ: week, month, quarter (mặc định month)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        period = params.get("period", "month")
        date_map = {"week": 7, "month": 30, "quarter": 90}
        days = date_map.get(period, 30)
        sql = f"""
            SELECT COUNT(*) as total, AVG(ws.score) as avg_score
            FROM student_writing_submissions sws
            LEFT JOIN writing_scores ws ON ws.submission_id = sws.id
            WHERE sws.submitted_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)
        """
        result = await _run_sql(sql)
        row = result[0] if result else {}
        return {
            "period": f"{days} ngày",
            "total_submissions": row.get("total", 0),
            "avg_score": float(row["avg_score"]) if row.get("avg_score") else None,
        }


class GetRevenueData(BaseTool):
    name = "get_revenue_data"
    description = "[DOANH THU] Lấy số liệu doanh thu: tổng số exam_attempts, số học viên active theo kỳ (7d/30d/90d/1y)"
    parameters = [
        ToolParameter("period", "string", "Kỳ: 7d, 30d, 90d, 1y", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
        days = days_map.get(params.get("period", "30d"), 30)
        results = await _run_sql(f"""
            SELECT
                COUNT(*) as total_attempts,
                COUNT(DISTINCT user_id) as active_students
            FROM exam_attempts
            WHERE started_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)
        """)
        row = results[0] if results else {}
        return {
            "period": f"{days} ngày",
            "total_exam_attempts": row.get("total_attempts", 0),
            "active_students": row.get("active_students", 0),
        }


class GetTestTypeStats(BaseTool):
    name = "get_test_type_stats"
    description = "[ĐỀ THI] Thống kê số lượng đề thi theo loại: full test, single skill, theo kỹ năng (Listening/Reading/Writing/Speaking)"
    parameters = [
        ToolParameter("period", "string", "Kỳ: week, month, quarter (mặc định all)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        date_map = {"week": 7, "month": 30, "quarter": 90}
        days = date_map.get(params.get("period", ""))
        where = ""
        if days:
            where = f" WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)"

        full_vs_single = await _run_sql(f"""
            SELECT is_full_test, COUNT(*) as cnt FROM tests t{where} GROUP BY is_full_test
        """)
        by_skill = await _run_sql(f"""
            SELECT COALESCE(s.skill_type, 'UNKNOWN') as skill_type, COUNT(DISTINCT t.id) as tests
            FROM tests t
            LEFT JOIN test_sessions ts ON ts.test_id = t.id
            LEFT JOIN sessions s ON s.id = ts.session_id
            {where.replace('t.created_at', 't.created_at') if where else ''}
            GROUP BY s.skill_type
            ORDER BY tests DESC
        """)
        total = await _run_sql(f"SELECT COUNT(*) as total FROM tests t{where}")
        full_count = 0
        single_count = 0
        for row in full_vs_single:
            val = row.get("is_full_test")
            if val is True or val == 1 or val == b'\x01':
                full_count = row.get("cnt", 0)
            else:
                single_count = row.get("cnt", 0)
        skills = {}
        for row in by_skill:
            skills[row["skill_type"]] = row["tests"]
        return {
            "total_tests": total[0]["total"] if total else 0,
            "full_tests": full_count,
            "single_skill_tests": single_count,
            "by_skill": skills,
        }


class GetTeacherProductivity(BaseTool):
    name = "get_teacher_productivity"
    description = "[GIẢNG VIÊN] Thống kê năng suất giảng viên: mỗi giảng viên tạo bao nhiêu đề thi, số lớp phụ trách. Trả về danh sách giảng viên kèm số liệu."
    parameters = []

    async def execute(self, params: dict, user_context: dict) -> dict:
        teachers = await _run_sql("""
            SELECT u.id, u.full_name,
                   COUNT(DISTINCT t.id) as total_tests_created,
                   COUNT(DISTINCT ct.class_id) as total_classes_teaching
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            LEFT JOIN tests t ON t.created_by = u.id
            LEFT JOIN class_teachers ct ON ct.user_id = u.id AND ct.is_active = 1
            WHERE r.name IN ('TEACHER', 'ADMIN', 'MANAGER')
              AND u.deleted_at IS NULL
            GROUP BY u.id, u.full_name
            ORDER BY total_tests_created DESC
            LIMIT 20
        """)
        return {
            "teachers": [
                {"id": t["id"], "full_name": t["full_name"],
                 "total_tests_created": t["total_tests_created"],
                 "total_classes_teaching": t["total_classes_teaching"]}
                for t in teachers
            ],
            "total_teachers": len(teachers),
        }


class GetStudentScores(BaseTool):
    name = "get_student_scores"
    description = "[ĐIỂM SINH VIÊN] Điểm band score của từng sinh viên: trung bình, cao nhất, thấp nhất, số lần thi. Trả về danh sách sinh viên kèm điểm."
    parameters = [
        ToolParameter("period", "string", "Kỳ: week, month, quarter (mặc định all)", required=False),
        ToolParameter("limit", "integer", "Số lượng tối đa (mặc định 20)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        limit = min(int(params.get("limit", 20)), 50)
        date_map = {"week": 7, "month": 30, "quarter": 90}
        days = date_map.get(params.get("period", ""))
        where_date = f" AND ea.started_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)" if days else ""
        rows = await _run_sql(f"""
            SELECT u.id, u.full_name,
                   ROUND(AVG(ea.band_score), 2) as avg_band,
                   COUNT(ea.id) as total_attempts,
                   MAX(ea.band_score) as best_band,
                   MIN(ea.band_score) as worst_band
            FROM exam_attempts ea
            JOIN users u ON u.id = ea.user_id
            WHERE ea.band_score IS NOT NULL
              AND u.deleted_at IS NULL{where_date}
            GROUP BY u.id, u.full_name
            ORDER BY avg_band DESC
            LIMIT {limit}
        """)
        return {"students": rows, "total": len(rows)}


class GetClassScores(BaseTool):
    name = "get_class_scores"
    description = "[ĐIỂM LỚP] Điểm trung bình, số học viên, số bài thi theo từng lớp. Trả về danh sách lớp kèm điểm."
    parameters = [
        ToolParameter("period", "string", "Kỳ: week, month, quarter (mặc định all)", required=False),
        ToolParameter("limit", "integer", "Số lượng tối đa (mặc định 20)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        limit = min(int(params.get("limit", 20)), 50)
        date_map = {"week": 7, "month": 30, "quarter": 90}
        days = date_map.get(params.get("period", ""))
        where_date = f" AND ea.started_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)" if days else ""
        rows = await _run_sql(f"""
            SELECT c.id, c.name,
                   COUNT(DISTINCT cs.user_id) as student_count,
                   ROUND(AVG(ea.band_score), 2) as avg_band,
                   COUNT(ea.id) as total_exams
            FROM classes c
            LEFT JOIN class_students cs ON cs.class_id = c.id AND cs.status = 'ACTIVE'
            LEFT JOIN exam_attempts ea ON ea.user_id = cs.user_id AND ea.band_score IS NOT NULL{where_date}
            GROUP BY c.id, c.name
            HAVING COUNT(DISTINCT cs.user_id) > 0
            ORDER BY avg_band IS NOT NULL DESC, avg_band DESC
            LIMIT {limit}
        """)
        return {"classes": rows, "total": len(rows)}


class GetExamScores(BaseTool):
    name = "get_exam_scores"
    description = "[ĐIỂM KỲ THI] Điểm trung bình, số lượt thi, số sinh viên theo từng kỳ thi. Trả về danh sách kỳ thi kèm điểm."
    parameters = [
        ToolParameter("period", "string", "Kỳ: week, month, quarter (mặc định all)", required=False),
        ToolParameter("limit", "integer", "Số lượng tối đa (mặc định 20)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        limit = min(int(params.get("limit", 20)), 50)
        date_map = {"week": 7, "month": 30, "quarter": 90}
        days = date_map.get(params.get("period", ""))
        where_date = f" AND ea.started_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)" if days else ""
        rows = await _run_sql(f"""
            SELECT e.id, e.title, e.exam_type,
                   COUNT(ea.id) as total_attempts,
                   ROUND(AVG(ea.band_score), 2) as avg_band,
                   COUNT(DISTINCT ea.user_id) as unique_students
            FROM exams e
            LEFT JOIN exam_attempts ea ON ea.exam_id = e.id AND ea.band_score IS NOT NULL{where_date}
            GROUP BY e.id, e.title, e.exam_type
            ORDER BY total_attempts DESC
            LIMIT {limit}
        """)
        return {"exams": rows, "total": len(rows)}


class GetPeriodStats(BaseTool):
    name = "get_period_stats"
    description = "[THỐNG KÊ] Lấy thống kê chi tiết theo kỳ: users mới, exam attempts, submissions, phân bố điểm"
    parameters = [
        ToolParameter("period", "string", "Kỳ: week, month, quarter, year", required=False),
        ToolParameter("from_date", "string", "YYYY-MM-DD (tùy chọn, ghi đè period)", required=False),
        ToolParameter("to_date", "string", "YYYY-MM-DD (tùy chọn, ghi đè period)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        days_map = {"week": 7, "month": 30, "quarter": 90, "year": 365}
        period = params.get("period", "month")
        days = days_map.get(period, 30)

        from_date = params.get("from_date", "")
        to_date = params.get("to_date", "")

        if from_date and to_date:
            date_condition = f"created_at >= '{from_date}' AND created_at < '{to_date}'"
            alt_condition = f"started_at >= '{from_date}' AND started_at < '{to_date}'"
        else:
            date_condition = f"created_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)"
            alt_condition = f"started_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)"

        users = await _run_sql(f"SELECT COUNT(*) as total FROM users WHERE {date_condition}")
        new_users = users[0]["total"] if users else 0

        exams = await _run_sql(f"""
            SELECT
                COUNT(*) as total_attempts,
                COUNT(DISTINCT user_id) as unique_students,
                AVG(raw_score) as avg_raw_score,
                AVG(band_score) as avg_band_score
            FROM exam_attempts
            WHERE {alt_condition}
        """)
        er = exams[0] if exams else {}

        submitted = await _run_sql(f"""
            SELECT
                COUNT(*) as total,
                COUNT(DISTINCT user_id) as unique_students
            FROM exam_attempts
            WHERE status = 'SUBMITTED' AND {alt_condition}
        """)
        sr = submitted[0] if submitted else {}

        return {
            "period": period,
            "new_users": new_users,
            "total_exam_attempts": er.get("total_attempts", 0),
            "unique_students": er.get("unique_students", 0),
            "avg_raw_score": er.get("avg_raw_score"),
            "avg_band_score": er.get("avg_band_score"),
            "completed_attempts": sr.get("total", 0),
            "completion_rate": round(sr.get("total", 0) / max(er.get("total_attempts", 1), 1) * 100, 1),
        }


class GetClassInfo(BaseTool):
    name = "get_class_info"
    description = "[LỚP HỌC - CHI TIẾT] Xem thông tin chi tiết 1 lớp: tên lớp, số học sinh, số giáo viên. Cần class_id (số). Nếu chưa có ID, dùng GetAllClasses trước."
    parameters = [
        ToolParameter("class_id", "integer", "ID lớp học"),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        cid = int(params.get("class_id", 0))
        cls = await _run_sql("SELECT id, name FROM classes WHERE id = :id", {"id": cid})
        if not cls:
            return {"error": "Không tìm thấy lớp"}
        c = cls[0]
        student_count = (await _run_sql("SELECT COUNT(*) as cnt FROM class_students WHERE class_id = :id", {"id": cid}))[0]["cnt"]
        teacher_count = (await _run_sql("SELECT COUNT(*) as cnt FROM class_teachers WHERE class_id = :id", {"id": cid}))[0]["cnt"]
        return {
            "name": c["name"],
            "student_count": student_count,
            "teacher_count": teacher_count,
        }


class GetSpeakingStats(BaseTool):
    name = "get_speaking_stats"
    description = "[SPEAKING] Thống kê điểm Speaking: tổng số sessions, điểm TB overall_band, fluency/coherence, lexical resource, grammatical range, pronunciation theo kỳ (week/month/quarter). Có thể lọc theo student_id."
    parameters = [
        ToolParameter("period", "string", "Kỳ: week, month, quarter (mặc định month)", required=False),
        ToolParameter("student_id", "integer", "ID học sinh (optional, nếu muốn xem của 1 học sinh)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        period = params.get("period", "month")
        student_id = params.get("student_id")
        date_map = {"week": 7, "month": 30, "quarter": 90}
        days = date_map.get(period, 30)

        where_clause = f"WHERE ss.created_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)"
        if student_id:
            where_clause += f" AND ss.user_id = {int(student_id)}"

        stats = await _run_sql(f"""
            SELECT
                COUNT(*) as total_sessions,
                AVG(sr.overall_band) as avg_overall_band,
                AVG(sr.fc_band) as avg_fluency_coherence,
                AVG(sr.lr_band) as avg_lexical_resource,
                AVG(sr.gra_band) as avg_grammatical_range,
                AVG(sr.p_band) as avg_pronunciation
            FROM speaking_sessions ss
            LEFT JOIN speaking_results sr ON sr.session_id = ss.session_id
            {where_clause}
        """)
        row = stats[0] if stats else {}
        return {
            "period": f"{days} ngày",
            "total_sessions": row.get("total_sessions", 0),
            "avg_overall_band": float(row["avg_overall_band"]) if row.get("avg_overall_band") else None,
            "avg_fluency_coherence": float(row["avg_fluency_coherence"]) if row.get("avg_fluency_coherence") else None,
            "avg_lexical_resource": float(row["avg_lexical_resource"]) if row.get("avg_lexical_resource") else None,
            "avg_grammatical_range": float(row["avg_grammatical_range"]) if row.get("avg_grammatical_range") else None,
            "avg_pronunciation": float(row["avg_pronunciation"]) if row.get("avg_pronunciation") else None,
        }


class GetExamSchedule(BaseTool):
    name = "get_exam_schedule"
    description = "[LỊCH THI] Xem lịch thi: danh sách kỳ thi (exams) có trạng thái OPEN/SCHEDULED/CLOSED. Trả về id, title, thời gian, loại thi, test đi kèm."
    parameters = [
        ToolParameter("status", "string", "Trạng thái: OPEN, SCHEDULED, CLOSED (mặc định OPEN)", required=False),
        ToolParameter("limit", "integer", "Số lượng tối đa", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> list[dict]:
        status = params.get("status", "OPEN").upper()
        limit = min(int(params.get("limit", 10)), 20)

        if status not in ("OPEN", "SCHEDULED", "CLOSED"):
            status = "OPEN"

        exams = await _run_sql(f"""
            SELECT e.id, e.title, e.description, e.exam_type,
                   e.scheduled_start_time, e.scheduled_end_time,
                   e.status, t.title as test_title
            FROM exams e
            LEFT JOIN tests t ON t.id = e.test_id
            WHERE e.status = :status
            ORDER BY e.scheduled_start_time ASC
            LIMIT :limit
        """, {"status": status, "limit": limit})

        return [
            {
                "id": r["id"],
                "title": r["title"],
                "description": r["description"],
                "exam_type": r["exam_type"],
                "scheduled_start": str(r["scheduled_start_time"]) if r["scheduled_start_time"] else None,
                "scheduled_end": str(r["scheduled_end_time"]) if r["scheduled_end_time"] else None,
                "status": r["status"],
                "test_title": r["test_title"],
            }
            for r in exams
        ]


class QueryAgentTool(BaseTool):
    name = "query_agent"
    description = "Gửi câu hỏi đến một agent khác trong hệ thống và nhận câu trả lời"
    parameters = [
        ToolParameter("agent_name", "string", "Tên agent cần hỏi: content, info, report, email"),
        ToolParameter("question", "string", "Câu hỏi cần gửi"),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        from infrastructure.message_queue import enqueue_task, subscribe
        import uuid

        agent_name = params.get("agent_name", "")
        question = params.get("question", "")
        if agent_name not in ("content", "info", "report", "email"):
            return {"error": f"Agent '{agent_name}' không tồn tại"}

        result_channel = f"subquery:{uuid.uuid4()}"
        task = {
            "task_id": str(uuid.uuid4()),
            "session_id": user_context.get("session_id", 0),
            "user_id": user_context.get("user_id", 0),
            "agent_type": agent_name,
            "intent": "cross_agent_query",
            "input": question,
            "user_context": user_context,
            "is_sub_query": True,
            "result_channel": result_channel,
        }

        await enqueue_task(f"agent:{agent_name}:tasks", task)
        result = await subscribe(result_channel, timeout=30.0)

        if result is None:
            return {"error": f"Agent '{agent_name}' không phản hồi kịp thời"}
        return result


class GetAllClasses(BaseTool):
    name = "get_all_classes"
    description = "[LỚP HỌC - DANH SÁCH] Liệt kê tất cả lớp học trong hệ thống, trả về tổng số và danh sách tên lớp. Dùng khi hỏi 'các lớp', 'danh sách lớp', 'bao nhiêu lớp'. KHÔNG dùng cho học sinh trong lớp."
    parameters = [
        ToolParameter("limit", "integer", "Số lượng tối đa (mặc định 20)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        limit = min(int(params.get("limit", 20)), 50)
        rows = await _run_sql(f"SELECT c.id, c.name FROM classes c ORDER BY c.name LIMIT {limit}")
        tong = (await _run_sql("SELECT COUNT(*) as cnt FROM classes"))[0]["cnt"]
        return {
            "tong": tong,
            "danh_sach": [r["name"] for r in rows],
            "da_het": tong <= limit,
        }


class GetTeacherCount(BaseTool):
    name = "get_teacher_count"
    description = "[GIÁO VIÊN] Đếm tổng số giáo viên (role=TEACHER) trong hệ thống. Dùng cho 'bao nhiêu giáo viên', 'số giáo viên'. KHÔNG dùng cho danh sách tên giáo viên."
    parameters = []

    async def execute(self, params: dict, user_context: dict) -> dict:
        rows = await _run_sql("""
            SELECT COUNT(*) as total FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON r.id = ur.role_id
            WHERE r.name = 'TEACHER' AND u.deleted_at IS NULL
        """)
        total = rows[0]["total"] if rows else 0
        return {"total_teachers": total}


class GetClassStudents(BaseTool):
    name = "get_class_students"
    description = "[LỚP HỌC - HỌC SINH] Lấy danh sách học sinh của 1 lớp. Cần class_name (tên lớp). Có thể search để tìm 1 học sinh cụ thể. KHÔNG dùng cho giáo viên hay thông tin chung."
    parameters = [
        ToolParameter("class_name", "string", "Tên lớp cần xem danh sách học sinh"),
        ToolParameter("search", "string", "Tên học sinh cần tìm (VD: An, Lan)", required=False),
        ToolParameter("limit", "integer", "Số lượng tối đa (mặc định 30)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        name = params.get("class_name", "")
        search = params.get("search", "")
        limit = min(int(params.get("limit", 30)), 100)
        if not name:
            return {"error": "Cần tên lớp"}

        if search:
            rows = await _run_sql("""
                SELECT u.full_name, cs.status as enrollment_status
                FROM class_students cs
                JOIN users u ON u.id = cs.user_id
                JOIN classes c ON c.id = cs.class_id
                WHERE c.name LIKE :name AND u.full_name LIKE :search
                ORDER BY u.full_name
            """, {"name": f"%{name}%", "search": f"%{search}%"})
            return {
                "lop": name,
                "tim": search,
                "tong": len(rows),
                "hoc_sinh": [{"ten": r["full_name"], "trang_thai": r["enrollment_status"]} for r in rows],
            }

        tong = (await _run_sql(
            "SELECT COUNT(*) as cnt FROM class_students cs JOIN classes c ON c.id = cs.class_id WHERE c.name LIKE :name",
            {"name": f"%{name}%"},
        ))[0]["cnt"]

        rows = await _run_sql("""
            SELECT u.full_name, cs.status as enrollment_status
            FROM class_students cs
            JOIN users u ON u.id = cs.user_id
            JOIN classes c ON c.id = cs.class_id
            WHERE c.name LIKE :name
            ORDER BY u.full_name LIMIT :limit
        """, {"name": f"%{name}%", "limit": limit})

        return {
            "lop": name,
            "tong": tong,
            "hoc_sinh": [{"ten": r["full_name"], "trang_thai": r["enrollment_status"]} for r in rows],
            "da_het": tong <= limit,
        }


class GetClassTeachers(BaseTool):
    name = "get_class_teachers"
    description = "[LỚP HỌC - GIÁO VIÊN] Lấy danh sách giáo viên của 1 lớp. Cần class_name (tên lớp). Trả về id, full_name, email, username, role. KHÔNG dùng cho học sinh."
    parameters = [
        ToolParameter("class_name", "string", "Tên lớp cần xem danh sách giáo viên"),
    ]

    async def execute(self, params: dict, user_context: dict) -> list[dict]:
        name = params.get("class_name", "")
        if not name:
            return [{"error": "Cần tên lớp"}]

        rows = await _run_sql("""
            SELECT u.id, u.full_name, u.email, u.username, ct.role as teacher_role
            FROM class_teachers ct
            JOIN users u ON u.id = ct.user_id
            JOIN classes c ON c.id = ct.class_id
            WHERE c.name LIKE :name
            ORDER BY u.full_name
        """, {"name": f"%{name}%"})
        return [
            {
                "id": r["id"],
                "full_name": r["full_name"],
                "email": r["email"],
                "username": r["username"],
                "role": r["teacher_role"],
            }
            for r in rows
        ]


class GetDatabaseSchema(BaseTool):
    name = "get_database_schema"
    description = "[DB - CẤU TRÚC] Liệt kê tên tất cả bảng (tables) trong database. Dùng khi cần biết có những bảng nào trước khi viết SQL."
    parameters = []

    async def execute(self, params: dict, user_context: dict) -> list[dict]:
        rows = await _run_sql("SHOW TABLES")
        return [list(r.values())[0] for r in rows]


class GetTableColumns(BaseTool):
    name = "get_table_columns"
    description = "[DB - CỘT] Liệt kê tất cả cột (columns) của 1 bảng. Cần table_name. Dùng trước khi viết RunSql để biết tên cột chính xác."
    parameters = [
        ToolParameter("table_name", "string", "Tên bảng cần xem cấu trúc"),
    ]

    async def execute(self, params: dict, user_context: dict) -> list[dict]:
        tbl = params.get("table_name", "")
        if not tbl:
            return [{"error": "Cần table_name"}]
        cols = await _run_sql(f"SHOW COLUMNS FROM `{tbl}`")
        return [{"name": r["Field"], "type": r["Type"]} for r in cols]


class RunSql(BaseTool):
    name = "run_sql"
    description = "[SQL TỰ DO] Chạy câu lệnh SQL SELECT tự do. Dùng cho câu hỏi phức tạp: GROUP BY, ORDER BY, JOIN nhiều bảng, xếp hạng, 'nhất', 'nhiều nhất'. Chỉ hỗ trợ SELECT. Nên dùng GetTableColumns trước để biết tên cột."
    parameters = [
        ToolParameter("sql", "string", "VD: SELECT u.full_name, count(t.id) as cnt FROM tests t JOIN users u ON t.created_by=u.id GROUP BY u.id"),
        ToolParameter("limit", "integer", "Tối đa (mặc định 20)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        sql = params.get("sql", "").strip()
        if not sql:
            return {"error": "Cần câu SQL"}
        if not sql.upper().lstrip().startswith("SELECT"):
            return {"error": "Chỉ hỗ trợ SELECT"}
        limit = min(int(params.get("limit", 20)), 50)
        if "LIMIT" not in sql.upper():
            sql += f" LIMIT {limit}"
        rows = await _run_sql(sql)
        return {
            "tong": len(rows),
            "ket_qua": rows[:limit],
            "da_het": len(rows) <= limit,
        }


# =============================================================================
# COLUMN VALIDATION
# =============================================================================

_column_cache: dict[str, dict] = {}
_column_cache_ttl: int = 300  # 5 phút
_column_cache_time: dict[str, float] = {}


async def _get_cached_columns(table: str) -> list[str]:
    import time
    now = time.time()
    if table in _column_cache and now - _column_cache_time.get(table, 0) < _column_cache_ttl:
        return _column_cache[table]
    from sqlalchemy import text as sa_text
    session_maker = _make_session()
    rows = []
    if hasattr(session_maker, "__call__"):
        async with session_maker() as db:
            result = await db.execute(sa_text(f"SHOW COLUMNS FROM `{table}`"))
            if result.returns_rows:
                rows = result.fetchall()
    cols = [r[0] for r in rows]
    _column_cache[table] = cols
    _column_cache_time[table] = now
    return cols


def _extract_table_columns(sql: str) -> dict[str, list[str]]:
    """Trích xuất table → [column] từ SQL SELECT."""
    from collections import defaultdict
    result: dict[str, list[str]] = defaultdict(list)
    
    select_part = sql.split("FROM")[0] if "FROM" in sql else sql
    for m in re.finditer(r'(?:(\w+)\.(\w+))', sql):
        table, col = m.group(1), m.group(2)
        if col.upper() not in ("AS", "ON", "AND", "OR", "IN", "LIKE", "BETWEEN", "IS", "NOT", "NULL", "DISTINCT"):
            result[table].append(col)
    return dict(result)


async def _validate_sql_columns(sql: str) -> tuple[bool, str, dict[str, list[str]]]:
    """Kiểm tra tất cả table.column trong SQL có tồn tại trong DB không.
    Returns: (is_valid, error_msg, details)  
    details: {table: [invalid_columns]}"""
    from collections import defaultdict
    refs = _extract_table_columns(sql)
    bad_refs: dict[str, list[str]] = defaultdict(list)
    all_bad: list[str] = []
    
    for table, cols in refs.items():
        actual = await _get_cached_columns(table)
        actual_set = set(actual)
        for col in cols:
            if col not in actual_set:
                bad_refs[table].append(col)
                all_bad.append(f"{table}.{col}")
    
    if not all_bad:
        return True, "", {}
    msg = f"Cột không tồn tại: {', '.join(all_bad)}"
    logger.warning(msg)
    return False, msg, dict(bad_refs)
