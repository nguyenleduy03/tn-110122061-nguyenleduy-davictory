import json
import re
from typing import Any
def _strip_think(text: str) -> str:
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()
    text = re.sub(r'<Thought>.*?</Thought>', '', text, flags=re.DOTALL).strip()
    text = re.sub(r'<think>.*', '', text, flags=re.DOTALL).strip()
    text = re.sub(r'<Thought>.*', '', text, flags=re.DOTALL).strip()
    return text.strip()

from loguru import logger

from core.base import BaseAgent, AgentResult
from infrastructure.llm_client import get_groq_client, GroqClient
from core.schema import find_relevant_tables, get_schema_text, TABLE_SCHEMAS


class BaseLLMAgent(BaseAgent):

    async def _get_model(self) -> str:
        from config import get_settings
        return get_settings().groq_model

    async def _llm_suggest_tables(self, input_text: str, client: GroqClient,
                                    context_summary: str = "") -> list[str]:
        prompt = f"""Cho câu hỏi dưới đây, hãy liệt kê các bảng cần thiết để trả lời.

Các bảng có sẵn: {', '.join(TABLE_SCHEMAS.keys())}

{context_summary}

Câu hỏi: {input_text}

CHỈ trả lời bằng mảng JSON tên bảng. Ví dụ: ["users", "teacher_profiles", "tests"]"""
        for attempt, tok in enumerate([2000, 4000]):
            try:
                resp = await client.create_completion(
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=tok,
                )
                text = _strip_think(resp.content or "")
                text = re.sub(r'^```(?:json)?\s*|\s*```$', '', text)
                logger.debug(f"_llm_suggest_tables raw: {text[:200]}")
                tables = json.loads(text)
                if isinstance(tables, list):
                    return [t for t in tables if t in TABLE_SCHEMAS]
                return []
            except (json.JSONDecodeError, Exception) as e:
                if attempt == 0 and hasattr(resp, 'finish_reason') and resp.finish_reason == 'length':
                    continue
                logger.warning(f"LLM table suggestion failed: {e}, falling back to embedding")
                return find_relevant_tables(input_text)
        return find_relevant_tables(input_text)

    async def _verify_entity(self, input_text: str, schema_text: str, client: GroqClient,
                              context_summary: str = "") -> dict:
        prompt = f"""Cho câu hỏi và schema, xác định có cần tìm thực thể cụ thể trước không.

Schema:
{schema_text}

{context_summary}

Câu hỏi: {input_text}

Phân tích từng bước:
1. Câu hỏi có dùng "này/đó/ấy/trên" (vd: "lớp này", "người đó", "thông tin người này") để chỉ thực thể đã nhắc trước đó không?
   - CÓ → KHÔNG tìm trong DB từ "này/đó". Thay vào đó trả về has_entity=false — context_summary sẽ được dùng ở bước viết SQL để biết entity cuối.
   - KHÔNG → chuyển bước 2

2. Câu hỏi có dùng từ chỉ thứ tự như "đầu tiên", "thứ hai", "thứ 3", "cuối cùng", "số 1", "số 2" để chọn từ danh sách trong context_summary không?
   - CÓ (vd: "lớp đầu tiên", "class thứ hai", "thông tin của người số 1") → trả về has_entity=false. Bước viết SQL sẽ dùng context_summary + thứ tự để xác định.
   - KHÔNG → chuyển bước 3

3. Câu hỏi có nhắc đến thực thể cụ thể (người, lớp, bài thi, ...) không?
   - CÓ (vd: "thầy Huy", "lớp 12A", "đề reading số 3") → cần tìm thực thể này trước
   - KHÔNG (vd: "có bao nhiêu đề thi", "tổng số học sinh") → trả lời trực tiếp

4. Nếu CÓ thực thể: thực thể đó thuộc bảng nào? Viết SQL để TÌM thực thể.
   - SELECT các cột nhận dạng (id, name, code, ...)
   - Dùng WHERE LIKE '%từ_khoá%' để tìm gần đúng
   - Tìm ở NHIỀU cột: name OR code OR full_name nếu phù hợp
   - KHÔNG JOIN với bảng nghiệp vụ (tests, classes, exams, ...)

5. Nếu KHÔNG: trả về has_entity=false.

Trả về JSON:
- Có thực thể: {{"has_entity": true, "sql": "SELECT ...", "fuzzy": true, "entity_table": "tên_bảng"}}
- Không thực thể: {{"has_entity": false}}

Ví dụ: Luôn dùng LIKE (không dùng =) để tìm gần đúng. fuzzy luôn là true.

Ví dụ:
Q: "thầy huy có bao nhiêu đề ielts"
A: {{"has_entity": true, "sql": "SELECT id, full_name, email FROM users WHERE full_name LIKE '%Huy%'", "fuzzy": true, "entity_table": "users"}}

Q: "có bao nhiêu đề thi ielts"
A: {{"has_entity": false}}

Q: "lớp 12A có bao nhiêu học sinh"
A: {{"has_entity": true, "sql": "SELECT id, name, code FROM classes WHERE name LIKE '%12A%' OR code LIKE '%12A%'", "fuzzy": true, "entity_table": "classes"}}

Q: "trong lopa có học sinh tên huyền không"
A: {{"has_entity": true, "sql": "SELECT id, name, code FROM classes WHERE name LIKE '%lopa%' OR code LIKE '%lopa%'", "fuzzy": true, "entity_table": "classes"}}

LƯU Ý: Luôn dùng LIKE thay vì = để tìm thực thể. Không dùng WHERE code = '...'. Tìm cả name, code, full_name nếu có.
QUAN TRỌNG: KHÔNG tách từ ghép trong câu hỏi. 'lopb' là một từ -> LIKE '%lopb%', không phải '%lop b%'. '12A' là '12A', không phải '12 A'. Giữ nguyên từ như trong câu hỏi."""
        for attempt, tok in enumerate([2000, 4000]):
            resp = await client.create_completion(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=tok,
            )
            text = _strip_think(resp.content or "")
            text = re.sub(r'^```(?:json)?\s*|\s*```$', '', text)
            logger.debug(f"_verify_entity raw: {text[:300]}")
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                sql_match = re.search(r'(SELECT\s+.+?FROM\s+.+?)(?:;|\n|$)', text, re.IGNORECASE | re.DOTALL)
                if sql_match:
                    return {"has_entity": True, "sql": sql_match.group(1).strip(), "fuzzy": True}
                if attempt == 0 and resp.finish_reason == 'length':
                    continue
                logger.warning(f"_verify_entity could not parse SQL from: {text[:200]}")
                return {"has_entity": False}
        return {"has_entity": False}

    async def _write_data_sql(self, input_text: str, schema_text: str, client: GroqClient,
                               entity_info: dict | None = None,
                               context_summary: str = "") -> str:
        entity_part = ""
        entity_table_hint = ""
        if entity_info:
            entity_part = f"\nThực thể đã xác định: {json.dumps(entity_info, ensure_ascii=False)}"
            et = entity_info.get("_entity_table", "")
            if et:
                entity_table_hint = f"\nThực thể thuộc bảng: {et}"
        prompt = f"""Viết câu MySQL SELECT để trả lời câu hỏi.

Schema:
{schema_text}

{context_summary}

Câu hỏi: {input_text}{entity_part}{entity_table_hint}

Quy tắc:
- Dùng LEFT JOIN (không phải INNER JOIN) cho bảng phụ như teacher_profiles, student_profiles — vì có thể không có dữ liệu trong bảng đó
- JOIN với bảng tham chiếu để lấy tên (vd: classes.name), không chỉ trả về ID
- Luôn SELECT cả thông tin định danh của thực thể (vd: users.full_name) để dễ đọc kết quả
- Nếu tìm thông tin Sinh viên, JOIN thêm class_students và classes để có tên lớp
- LUÔN có WHERE để lọc theo thực thể nếu có
- Nếu thực thể có cột id (số), ưu tiên WHERE bảng.id = id_đã_biết thay vì WHERE name = ...
- Dùng LIKE '%từ_khoá%' cho WHERE theo tên (không dùng = cho text)
- Đi theo FK chain: Khi hỏi "giáo viên của lớp học sinh A", JOIN từ users → class_students → classes → class_teachers → users. KHÔNG join thẳng users → class_teachers vì học sinh không phải giáo viên
- Để lọc người dùng theo vai trò (TEACHER/STUDENT/MANAGER/ADMIN), JOIN users → user_roles → roles và WHERE roles.name = 'VAI_TRÒ' (không dùng cột role trong bảng users — nó không tồn tại)
- QUAN TRỌNG: KHÔNG dùng LIMIT 1 trong subquery lấy class của student. Học sinh có thể học nhiều lớp — SELECT all classes student đang học
- Ví dụ: tìm giáo viên của lớp mà Trần Thị Bình (id=11) học → SELECT c.name, t.full_name, ct.role FROM class_students cs JOIN classes c ON cs.class_id=c.id LEFT JOIN class_teachers ct ON c.id=ct.class_id LEFT JOIN users t ON ct.user_id=t.id WHERE cs.user_id=11 AND cs.status='ACTIVE' ORDER BY ct.user_id IS NOT NULL DESC
- Nếu có nhiều class, ưu tiên class có giáo viên (ORDER BY ct.user_id IS NOT NULL DESC)
- Nếu câu hỏi dùng "đầu tiên/thứ hai/cuối cùng/số 1/số 2" — dùng context_summary (Class: a, b, c) để suy luận class nào tương ứng (đầu tiên=a, thứ hai=b, ...)
- KHÔNG suy nghĩ hay giải thích. KHÔNG dùng comment SQL (-- hoặc #)
- CHỈ xuất ra câu SQL thuần, không kèm text khác. Kết thúc bằng LIMIT (100 là đủ, KHÔNG dùng LIMIT 1 trừ khi biết chắc chỉ có 1 kết quả)."""
        resp = await client.create_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=3000,
        )
        text = _strip_think(resp.content or "")
        text = re.sub(r'^```(?:sql)?\s*|\s*```$', '', text)
        text = re.sub(r'\n\s*--.*', '\n', text)
        text = re.sub(r'\s*#.*', '', text)
        text = text.replace(';', '')
        return text.strip()

    async def _format_result(self, question: str, answer_text: str, client: GroqClient,
                              entity: dict | None = None,
                              context_summary: str = "") -> str:
        entity_hint = ""
        if entity:
            entity_hint = f"\nThực thể đã xác định: {json.dumps(entity, ensure_ascii=False)}"
        prompt = f"""Viết câu trả lời bằng tiếng Việt từ dữ liệu sau.

{context_summary}

Câu hỏi: {question}{entity_hint}

Dữ liệu: {answer_text if answer_text else '(không có dữ liệu)'}

QUAN TRỌNG: CHỈ dùng dữ liệu từ "Dữ liệu:" ở trên. KHÔNG bịa thêm số liệu, tên, hay thông tin nào không có trong dữ liệu.
Hành xử thông minh:
- NẾU dữ liệu trống và context_summary có thông tin entity phức tạp (vd: "Class: a, b, c") → giải thích entity có nhiều hạng mục và hỏi lại user muốn xem cái nào.
- NẾU dữ liệu trống và không có thông tin bổ sung → nói không tìm thấy.
- NẾU dữ liệu có nhiều class khác nhau cho cùng 1 entity → hỏi lại user "Bạn muốn xem class nào?" thay vì hiển thị tất cả.
- NẾU có dữ liệu đơn giản (1-3 kết quả) → hiển thị đầy đủ (tên, email, lớp, vai trò...).
KHÔNG suy nghĩ hay giải thích. CHỈ trả lời trực tiếp, ngắn gọn, bằng tiếng Việt."""
        try:
            resp = await client.create_completion(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2048,
            )
            text = _strip_think(resp.content or "")
            return text or answer_text
        except Exception as e:
            logger.warning(f"Format LLM call failed: {e}")
            return answer_text

    async def _run_sql(self, sql: str) -> list[dict]:
        from tools.tools_library import _run_sql
        return await _run_sql(sql)

    async def process(self, input_text: str, user_context: dict,
                      session_context: dict | None = None) -> AgentResult:
        client = get_groq_client()
        ctx_summary = ""
        if session_context:
            ctx_summary = session_context.get("context_summary", "")
        pending = (session_context or {}).get("_pending_action")

        if pending:
            return await self._handle_pending(pending, input_text, user_context, client, context_summary=ctx_summary)

        return await self._start_new_task(input_text, user_context, session_context, client)

    async def _start_new_task(self, input_text: str, user_context: dict,
                               session_context: dict | None, client: GroqClient) -> AgentResult:
        ctx_summary = ""
        if session_context:
            ctx_summary = session_context.get("context_summary", "")
        if ctx_summary:
            ctx_summary = f"Ngữ cảnh trước đó:\n{ctx_summary}"

        suggested = await self._llm_suggest_tables(input_text, client, context_summary=ctx_summary)
        tables = find_relevant_tables(input_text, top_n=5)
        all_candidates = list(dict.fromkeys(suggested + tables))
        PERSON_TABLES = {"users", "teacher_profiles", "student_profiles"}
        if PERSON_TABLES & set(all_candidates):
            for t in ("user_roles", "roles"):
                if t not in all_candidates:
                    all_candidates.append(t)
        schema_text = get_schema_text(all_candidates, compact=True)
        logger.debug(f"Tables suggested={suggested} embedding={tables} final={all_candidates}")

        verify = await self._verify_entity(input_text, schema_text, client, context_summary=ctx_summary)

        if not verify.get("has_entity", True):
            # Thử lấy entity từ context_summary (cho này/đó/đầu tiên)
            ctx_entity = self._extract_entity_from_context(ctx_summary)
            return await self._data_phase(input_text, schema_text, ctx_entity, client, context_summary=ctx_summary)

        sql = verify.get("sql", "")
        if not sql:
            return AgentResult(
                success=True, agent_type=self.name,
                response="Không thể xác định thực thể cần tìm. Vui lòng cung cấp thêm thông tin.",
                data={"schema_used": all_candidates},
            )

        logger.info(f"Verify SQL: {sql}")
        try:
            rows = await self._run_sql(sql)
        except Exception as e:
            logger.error(f"Verify SQL failed: {e}")
            return AgentResult(
                success=True, agent_type=self.name,
                response=f"Không thể truy vấn dữ liệu: {e}",
            )

        if not rows:
            return AgentResult(
                success=True, agent_type=self.name,
                response="Không tìm thấy thông tin phù hợp.",
            )

        if verify.get("fuzzy") and len(rows) > 1:
            candidates = []
            for r in rows[:5]:
                r_clean = {k: str(v) for k, v in r.items()}
                candidates.append(r_clean)

            pending = {
                "action": "clarify_entity",
                "candidates": candidates,
                "question": input_text,
                "schema_text": schema_text,
                "all_tables": all_candidates,
                "entity_table": verify.get("entity_table"),
                "context_summary": ctx_summary,
            }
            candidate_text = "\n".join(
                f"{i+1}. {', '.join(f'{k}={v}' for k, v in c.items())}"
                for i, c in enumerate(candidates)
            )
            return AgentResult(
                success=True,
                agent_type=self.name,
                response=f"Có {len(candidates)} kết quả tương tự:\n{candidate_text}\n\nBạn muốn tìm ai? (trả lời số thứ tự hoặc tên chính xác)",
                pending_action=pending,
            )

        entity = rows[0]
        entity["_entity_table"] = verify.get("entity_table")
        return await self._data_phase(input_text, schema_text, entity, client, context_summary=ctx_summary)

    async def _handle_pending(self, pending: dict, user_input: str,
                               user_context: dict, client: GroqClient,
                               context_summary: str = "") -> AgentResult:
        action = pending.get("action")
        if action == "clarify_entity":
            candidates = pending.get("candidates", [])
            chosen = self._match_entity(user_input, candidates)
            if chosen is None:
                # Fallback: dùng LLM để match user_input với candidates
                try:
                    candidate_list = "\n".join(
                        f"{i+1}. {json.dumps(c, ensure_ascii=False)}"
                        for i, c in enumerate(candidates)
                    )
                    llm_prompt = f"""Người dùng trả lời: "{user_input}"
Các lựa chọn có sẵn:
{candidate_list}

Hãy chọn lựa chọn phù hợp nhất với câu trả lời của người dùng.
Trả về JSON: {{"index": số_thứ_tự_1_based}} hoặc {{"index": null}} nếu không khớp."""
                    llm_resp = await client.create_completion(
                        messages=[{"role": "user", "content": llm_prompt}],
                        max_tokens=100,
                    )
                    llm_data = json.loads(llm_resp.content or "{}")
                    idx = llm_data.get("index")
                    if isinstance(idx, int) and 1 <= idx <= len(candidates):
                        chosen = candidates[idx - 1]
                except Exception:
                    pass
            if chosen is None:
                return AgentResult(
                    success=True,
                    agent_type=self.name,
                    response="Không tìm thấy thông tin phù hợp với yêu cầu của bạn.",
                )
            chosen["_entity_table"] = pending.get("entity_table")
            ctx = context_summary or pending.get("context_summary", "")
            return await self._data_phase(pending["question"], pending["schema_text"], chosen, client, context_summary=ctx)

        return AgentResult(
            success=True, agent_type=self.name,
            response="Không thể xử lý. Vui lòng hỏi lại.",
        )

    def _match_entity(self, user_input: str, candidates: list[dict]) -> dict | None:
        text = user_input.lower().strip()
        if text.isdigit():
            idx = int(text) - 1
            if 0 <= idx < len(candidates):
                return candidates[idx]
        for c in candidates:
            for v in c.values():
                if isinstance(v, str) and v.lower() in text:
                    return c
                if isinstance(v, str) and text in v.lower():
                    return c
        for c in candidates:
            for v in c.values():
                if isinstance(v, str):
                    words = v.lower().split()
                    if any(w in text or text in w for w in words):
                        return c
        return None

    def _extract_entity_from_context(self, ctx_summary: str) -> dict | None:
        m = re.search(r'\[(\S+?)\s+(.+?)\(ID:\s*(\d+)\)\s*(?:\(Class:\s*(.+?)\))?\]', ctx_summary)
        if not m:
            return None
        label, name, eid, classes = m.group(1), m.group(2).strip(), int(m.group(3)), (m.group(4) or "")
        return {
            "label": label, "name": name, "id": eid,
            "_entity_table": "users",
            "classes": [c.strip() for c in classes.split(",") if c.strip()],
        }

    def _guess_entity_table(self, entity: dict) -> str | None:
        if "teacher_code" in entity or "specialization" in entity:
            return "teacher_profiles"
        if "student_code" in entity and "target_band" in entity:
            return "student_profiles"
        if "email" in entity or "username" in entity:
            return "users"
        if "code" in entity or "level" in entity:
            return "classes"
        return None

    async def _execute_with_retry(self, input_text: str, schema_text: str,
                                    entity: dict | None,
                                    context_summary: str = "",
                                    client: GroqClient | None = None,
                                    max_retries: int = 2) -> tuple[str | None, list | None, str | None]:
        """Execute SQL with column validation retry. Returns (response, rows, error)."""
        from tools.tools_library import _validate_sql_columns, _get_cached_columns

        if client is None:
            client = get_groq_client()

        for attempt in range(max_retries):
            fresh_tables = find_relevant_tables(input_text, top_n=7)
            if entity:
                entity_table_hint = entity.get("_entity_table") or self._guess_entity_table(entity)
                if entity_table_hint and entity_table_hint not in fresh_tables:
                    fresh_tables.insert(0, entity_table_hint)
            fresh_schema = get_schema_text(fresh_tables, compact=True)
            data_sql = await self._write_data_sql(input_text, fresh_schema, client, entity_info=entity, context_summary=context_summary)

            if not data_sql.strip():
                return "Không thể tạo truy vấn cho câu hỏi này.", None, None

            logger.info(f"Data SQL (attempt {attempt + 1}): {data_sql}")

            # Pre-validate columns
            try:
                is_valid, err_msg, bad_cols = await _validate_sql_columns(data_sql)
            except Exception:
                is_valid, err_msg = True, ""

            if not is_valid and attempt < max_retries - 1:
                logger.warning(f"Column validation failed: {err_msg}, retrying...")
                error_detail = f"Cột {err_msg} không tồn tại. "
                for table, cols in bad_cols.items():
                    try:
                        actual_cols = await _get_cached_columns(table)
                        error_detail += f"Bảng '{table}' có các cột: {', '.join(actual_cols)}. "
                        retry_hint = f"\nLƯU Ý: Bảng {table} có các cột: {', '.join(actual_cols)}. KHÔNG dùng cột khác."
                        context_summary = context_summary + retry_hint if context_summary else retry_hint
                    except Exception:
                        logger.warning(f"Cannot resolve table '{table}' (likely alias), skipping column hint")
                continue

            try:
                rows = await self._run_sql(data_sql)
                return None, rows, None  # success
            except Exception as e:
                err_str = str(e)
                logger.error(f"SQL execution failed (attempt {attempt + 1}): {err_str}")

                if "Unknown column" in err_str and attempt < max_retries - 1:
                    m = re.search(r"Unknown column '([^']+)'", err_str)
                    if m:
                        bad_col = m.group(1)
                        parts = bad_col.split(".")
                        tbl = parts[0] if len(parts) > 1 else ""
                        if tbl:
                            try:
                                actual_cols = await _get_cached_columns(tbl)
                                hint = f"\nLƯU Ý: Cột '{bad_col}' không tồn tại trong bảng '{tbl}'. Các cột thực tế: {', '.join(actual_cols)}."
                            except Exception:
                                hint = f"\nLƯU Ý: Cột '{bad_col}' không tồn tại."
                            context_summary = context_summary + hint if context_summary else hint
                            continue
                return None, None, err_str

        return None, None, "SQL execution failed after retries"

    async def _data_phase(self, input_text: str, schema_text: str,
                           entity: dict | None, client: GroqClient,
                           context_summary: str = "") -> AgentResult:
        err, rows, sql_err = await self._execute_with_retry(
            input_text, schema_text, entity, context_summary, client
        )
        if err:
            return AgentResult(success=True, agent_type=self.name, response=err)
        if sql_err:
            return AgentResult(
                success=True, agent_type=self.name,
                response=f"Không thể lấy dữ liệu: {sql_err}",
            )

        if not rows:
            has_complex_ctx = "Class:" in context_summary or "class" in context_summary.lower()
            if has_complex_ctx:
                formatted = await self._format_result(input_text, "", client, entity=entity, context_summary=context_summary)
            else:
                formatted = "Không tìm thấy dữ liệu phù hợp."
            return AgentResult(
                success=True, agent_type=self.name,
                response=formatted or "Không tìm thấy dữ liệu phù hợp.",
                data={"rows": []},
            )

        display_rows = rows[:15]
        if len(rows) > 15:
            display_rows.append({"__note__": f"... và {len(rows) - 15} kết quả khác"})
        result_text = json.dumps(display_rows, ensure_ascii=False, default=str)

        formatted = await self._format_result(input_text, result_text, client, entity=entity, context_summary=context_summary)
        return AgentResult(
            success=True,
            agent_type=self.name,
            response=formatted,
            data={"rows": rows},
        )
