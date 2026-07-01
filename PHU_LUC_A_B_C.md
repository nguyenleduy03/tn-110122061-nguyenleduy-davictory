# PHỤ LỤC A. Danh Sách Bảng Cơ Sở Dữ Liệu

Hệ thống sử dụng **MySQL** làm cơ sở dữ liệu chính (73 bảng), **ChromaDB** làm vector database (1 collection) và **Redis** làm cache/queue. Các bảng được JPA/Hibernate tự động tạo khi backend khởi động (`spring.jpa.hibernate.ddl-auto=update`). Riêng AI Agent Python khai báo trùng 2 bảng với backend nhưng dùng `extend_existing=True` để tránh xung đột.

## A.1. User Management (5 bảng)

| STT | Tên bảng | Mô tả | Cột chính |
|-----|----------|-------|-----------|
| 1 | `users` | Tài khoản người dùng | id, username, email, password, full_name, is_active, deleted_at |
| 2 | `roles` | Vai trò (GUEST/STUDENT/TEACHER/MANAGER/ADMIN) | id, name, description |
| 3 | `user_roles` | Liên kết users ↔ roles | user_id, role_id |
| 4 | `user_sessions` | Phiên đăng nhập JWT | id, user_id, session_token, ip_address, login_at, expires_at |
| 5 | `user_activity_logs` | Nhật ký hoạt động người dùng | id, user_id, action, module, status, created_at |

## A.2. Profiles & Center Management (7 bảng)

| STT | Tên bảng | Mô tả | Cột chính |
|-----|----------|-------|-----------|
| 6 | `student_profiles` | Thông tin học viên | id, user_id, student_code, current_level, target_band |
| 7 | `teacher_profiles` | Thông tin giáo viên | id, user_id, teacher_code, qualifications, ielts_score |
| 8 | `centers` | Trung tâm Anh ngữ | id, code, name, address, city, manager_id |
| 9 | `classes` | Lớp học | id, center_id, code, level, max_students, start_date, end_date, status |
| 10 | `class_students` | Học viên trong lớp | id, class_id, user_id, status, enrolled_at |
| 11 | `class_teachers` | Giáo viên trong lớp | id, class_id, user_id, role, is_active |
| 12 | `assignments` | Bài tập giáo viên giao | id, class_id, created_by, title, type, due_date, status |
| 13 | `assignment_submissions` | Bài nộp của học viên | id, assignment_id, user_id, status, score, feedback |

## A.3. Test Structure & Question Bank (10 bảng)

| STT | Tên bảng | Mô tả | Cột chính |
|-----|----------|-------|-----------|
| 14 | `question_types` | Loại câu hỏi (MCQ, TFNG, FILL_BLANK, MATCHING...) | id, code, display_name, has_options, has_text_answer |
| 15 | `difficulty_levels` | Cấp độ khó (1-5 ứng với IELTS band) | id, name, level, band_range |
| 16 | `sessions` | Định nghĩa kỹ năng (Listening/Reading/Writing/Speaking) | id, name, skill_type, test_type, duration_minutes |
| 17 | `parts` | Phần trong một kỹ năng (Part 1/2/3/4) | id, session_id, name, order_index, duration_minutes |
| 18 | `question_groups` | Nhóm câu hỏi chung context (passage/audio) | id, part_id, question_type_id, passage_text, audio_url |
| 19 | `questions` | Câu hỏi cá nhân | id, question_group_id, question_number, question_text, points |
| 20 | `question_options` | Lựa chọn MCQ/TFNG | id, question_id, option_label, option_text, is_correct |
| 21 | `answers` | Đáp án đúng (điền từ/trả lời ngắn) | id, question_id, answer_text, alternative_answers, blank_index |
| 22 | `matching_pairs` | Dữ liệu câu ghép nối | id, question_group_id, left_label, right_label, match_type |
| 23 | `question_hints` | Gợi ý cho câu hỏi | id, question_id, hint_text, hint_order |
| 24 | `question_explanations` | Giải thích đáp án | id, question_id, explanation_text, video_url |
| 25 | `question_statistics` | Thống kê câu hỏi | id, question_id, total_attempts, correct_rate, avg_time |
| 26 | `passage_contents` | Nội dung bài đọc | id, title, content, word_count, reading_level |

## A.4. Tags & Topic Categories (4 bảng)

| STT | Tên bảng | Mô tả | Cột chính |
|-----|----------|-------|-----------|
| 27 | `tags` | Tag chủ đề | id, name, category, usage_count |
| 28 | `question_tags` | Tag inline cho câu hỏi | id, question_id, tag_name, tag_category |
| 29 | `question_tag_map` | Liên kết question ↔ tag | id, question_id, tag_id, source |
| 30 | `topic_categories` | Danh mục chủ đề phân cấp | id, name, code, parent_id, level |

## A.5. Media Files (2 bảng)

| STT | Tên bảng | Mô tả | Cột chính |
|-----|----------|-------|-----------|
| 31 | `media_files` | File media (audio/image/video/document) | id, file_path, file_url, media_type, mime_type, file_size, duration |
| 32 | `audio_transcripts` | Transcript file audio | id, media_file_id, content, language, timecodes |

## A.6. Test Builder (8 bảng)

| STT | Tên bảng | Mô tả | Cột chính |
|-----|----------|-------|-----------|
| 33 | `tests` | Đề thi chính | id, title, description, test_type, status, duration_minutes, created_by |
| 34 | `test_sessions` | Liên kết test ↔ session | id, test_id, session_id, order_index, duration_minutes |
| 35 | `test_parts` | Liên kết test_session ↔ part | id, test_session_id, part_id, order_index |
| 36 | `test_question_groups` | Liên kết test_part ↔ question_group | id, test_part_id, question_group_id, order_index |
| 37 | `test_settings` | Cấu hình cho từng đề thi | id, test_id, show_timer, randomize_questions, max_attempts |
| 38 | `test_versions` | Lịch sử phiên bản đề thi | id, test_id, version_number, snapshot_json |
| 39 | `test_share_links` | Link chia sẻ đề thi | id, test_id, token, is_active |
| 40 | `full_test_progress` | Tiến trình làm bài full test | id, user_id, test_id, status, current_section, progress_percent |

## A.7. Exams & Attempts (6 bảng)

| STT | Tên bảng | Mô tả | Cột chính |
|-----|----------|-------|-----------|
| 41 | `exams` | Kỳ thi được tổ chức | id, title, exam_type, test_id, class_id, scheduled_start/end_time, password |
| 42 | `exam_attempts` | Lần làm bài của thí sinh | id, user_id, test_id, exam_id, status, started_at, band_score |
| 43 | `attempt_answers` | Câu trả lời của thí sinh | id, exam_attempt_id, question_id, selected_option_label, text_answer, is_correct |
| 44 | `attempt_sections` | Trạng thái từng phần trong bài thi | id, exam_attempt_id, part_id, status, time_spent, score |
| 45 | `attempt_question_times` | Thời gian làm từng câu | id, exam_attempt_id, question_id, time_spent_seconds |
| 46 | `guest_exam_attempts` | Bài thi của khách (chưa đăng nhập) | id, full_name, email, test_id, status, band_score |

## A.8. Writing (7 bảng)

| STT | Tên bảng | Mô tả | Cột chính |
|-----|----------|-------|-----------|
| 47 | `writing_tasks` | Loại bài viết (Task 1 Academic/General, Task 2) | id, code, display_name, min_words, duration_minutes |
| 48 | `writing_prompts` | Đề bài writing cụ thể | id, writing_task_id, title, prompt_text, chart_type, topic |
| 49 | `writing_scoring_criteria` | Tiêu chí chấm (TA/CC/LR/GRA) | id, writing_task_id, code, display_name, weight |
| 50 | `writing_sample_answers` | Bài mẫu band cao | id, writing_prompt_id, band_score, answer_text, word_count |
| 51 | `student_writing_submissions` | Bài nộp của học viên | id, user_id, writing_prompt_id, submission_text, word_count, status, band_score |
| 52 | `writing_scores` | Điểm từng tiêu chí | id, submission_id, criteria_id, score, feedback |
| 53 | `writing_feedback_templates` | Mẫu nhận xét cho giáo viên | id, writing_task_id, criteria_id, title, template_text |

## A.9. Speaking (9 bảng)

| STT | Tên bảng | Mô tả | Cột chính |
|-----|----------|-------|-----------|
| 54 | `speaking_topics` | Chủ đề Speaking Part 1 & 3 | id, title, part, category, difficulty_level_id |
| 55 | `speaking_cue_cards` | Cue card Part 2 | id, speaking_topic_id, title, task_prompt, bullet_points |
| 56 | `speaking_attempts` | Bài luyện nói của học viên | id, user_id, speaking_part, status, overall_band_score |
| 57 | `speaking_recordings` | File ghi âm bài nói | id, speaking_attempt_id, audio_url, transcript, duration_seconds |
| 58 | `speaking_scores` | Điểm 4 tiêu chí Speaking | id, speaking_attempt_id, fluency_coherence, lexical_resource, pronunciation |
| 59 | `speaking_feedback` | Nhận xét Speaking từ giáo viên | id, speaking_attempt_id, overall_feedback, strengths |
| 60 | `speaking_frames` | Khung câu hỏi mẫu | id, name, frame_type, questions |
| 61 | `speaking_combos` | Bài tập tổ hợp Speaking | id, title, cue_card_prompt, follow_up_questions |
| 62 | `speaking_generated_questions` | Câu hỏi AI sinh cho từng attempt | id, speaking_attempt_id, part, question_index, question_text |

## A.10. AI Agent & Blog (6 bảng)

| STT | Tên bảng | Mô tả | Cột chính |
|-----|----------|-------|-----------|
| 63 | `agent_sessions` | Phiên làm việc với AI Agent | id, user_id, context, active_agents, created_at |
| 64 | `agent_tasks` | Tác vụ giao cho Agent | id, session_id, agent_type, intent, input_data, status, result |
| 65 | `agent_actions` | Hành động chờ phê duyệt (human-in-the-loop) | id, action_type, payload, status, requested_by |
| 66 | `agent_configs` | Cấu hình model cho từng tool | id, tool_name, model, temperature, system_prompt |
| 67 | `agent_logs` | Lịch sử tương tác Agent | id, user_id, action, request_message, input_tokens, output_tokens |
| 68 | `blog_posts` | Bài viết blog (Agent sinh hoặc viết tay) | id, title, slug, content, status, source, created_by |

## A.11. System & Statistics (5 bảng)

| STT | Tên bảng | Mô tả | Cột chính |
|-----|----------|-------|-----------|
| 69 | `system_configs` | Cấu hình hệ thống key-value | id, config_key, config_value |
| 70 | `test_statistics` | Thống kê tổng hợp cho từng đề thi | id, test_id, total_attempts, avg_band_score, completion_rate |
| 71 | `student_progress` | Tiến độ học tập theo ngày | id, student_id, tracked_date, tests_completed, study_minutes |
| 72 | `student_skill_scores` | Điểm tổng hợp theo kỹ năng | id, student_id, skill_type, current_score, trend |
| 73 | `topic_categories` (đã liệt kê ở mục A.4) | Danh mục chủ đề blog | — |

## A.12. Vector Database (ChromaDB)

| Collection | Service | Mô tả |
|------------|---------|-------|
| `writing_samples` | AI Writing | Lưu vector embedding của bài essay mẫu để tìm kiếm ngữ nghĩa (RAG pipeline) |

## A.13. In-Memory Cache (Redis)

| Service | Mục đích | Port |
|---------|----------|------|
| AI Agent | Message queue cho tác vụ agent | 5185 |
| AI Services | Cache kết quả grading, quota, session | 5185 |

---

# PHỤ LỤC B. Quy Trình Cài Đặt và Chạy Hệ Thống

## B.1. Yêu Cầu Hệ Thống

| Thành phần | Phiên bản | Mục đích |
|-----------|-----------|----------|
| **JDK** | 21 | Chạy Backend Spring Boot |
| **Maven** | 3.8+ | Build Backend |
| **Node.js** | 18+ | Build & chạy Frontend React |
| **npm** | 9+ | Quản lý package Frontend |
| **Python** | 3.11+ | Chạy 4 AI services |
| **MySQL** | 8.x | Cơ sở dữ liệu chính |
| **Docker** | 24+ | Chạy Redis & AI Speaking |
| **Tesseract OCR** | 5.x | OCR cho AI Import (tùy chọn) |
| **API Keys** | — | Groq, NVIDIA, Unsplash (đã cấu hình sẵn) |

## B.2. Cài Đặt

### Bước 1: Tạo Database MySQL
```sql
CREATE DATABASE IF NOT EXISTS DAVictory
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Bước 2: Build Backend
```bash
cd backend
mvn clean package -DskipTests
# File JAR: backend/target/DAVictory-0.0.1-SNAPSHOT.jar
```

### Bước 3: Build Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm run build
# Thư mục build: frontend/dist/
```

### Bước 4: Cài Python Services
Mỗi service cần virtual environment riêng:

```bash
# AI Writing
cd ai-writing-python
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
deactivate

# AI Agent
cd ../ai-agent-python
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
deactivate

# AI Import
cd ../ai-import-python
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
deactivate

# AI Speaking (chạy Docker, nhưng vẫn cài cho dev local)
cd ../ai-speaking-python
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
deactivate
```

### Bước 5: Pull Docker Images
```bash
docker pull redis:7-alpine
docker compose -f docker-compose.yml build
```

### Bước 6: Seed ChromaDB (tùy chọn)
```bash
python3 scripts/seed_samples.py --host localhost --port 5184
```

## B.3. Cấu Hình

Mỗi service có file `.env` riêng trong thư mục của nó:

| File | Cấu hình chính |
|------|---------------|
| `backend/src/main/resources/application.yaml` | MySQL, JWT, Google Drive, URL các AI service |
| `ai-writing-python/.env` | DB, ChromaDB, Groq/NVIDIA API keys, quota |
| `ai-speaking-python/.env` | DB, Groq/NVIDIA/OpenAI keys, STT/TTS model |
| `ai-agent-python/.env` | Groq keys, Redis, Unsplash key |
| `ai-import-python/.env` | Backend URL, Tesseract OCR, Groq keys |

Thông số mặc định:
- **MySQL:** `root:1111@localhost:3306/DAVictory`
- **JWT secret:** đã hardcode (cần đổi cho production)
- **AI APIs:** đã cấu hình key (cần đổi key thật cho production)

## B.4. Khởi Động Hệ Thống

### Cách 1: Dùng manage.sh (Khuyên dùng)

```bash
cd /home/hv/DuAn/DAVictory

# Khởi động tất cả
./manage.sh start

# Hoặc khởi động từng service
./manage.sh start redis        # Docker: port 5185
./manage.sh start chroma       # Direct: port 5184
./manage.sh start backend      # Maven spring-boot:run: port 8080
./manage.sh start frontend     # Node serve.js: port 5173
./manage.sh start ai-writing   # Uvicorn: port 5182
./manage.sh start ai-agent     # Uvicorn: port 5187
./manage.sh start ai-import    # Uvicorn: port 5186
./manage.sh start ai-speaking  # Docker: port 5181

# Xem log
./manage.sh log backend
./manage.sh log ai-writing

# Dừng
./manage.sh stop
```

**Thứ tự khởi động:** Redis → ChromaDB → Backend → Frontend → AI Writing → AI Agent → AI Import → AI Speaking

### Cách 2: Khởi động tay từng service

```bash
# Backend
cd backend && mvn spring-boot:run

# Frontend (dev)
cd frontend && npm run dev -- --host 0.0.0.0

# Frontend (production)
cd frontend && node serve.js

# Python service
cd ai-writing-python && source .venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 5182

# Docker services
docker compose -f docker-compose.yml up -d

# ChromaDB
chroma run --path data/chroma --host 0.0.0.0 --port 5184
```

## B.5. Kiểm Tra Hoạt Động

| Service | URL |
|---------|-----|
| **Frontend** | `http://localhost:5173` |
| **Backend Swagger** | `http://localhost:8080/swagger-ui.html` |
| **AI Writing Docs** | `http://localhost:5182/docs` |
| **AI Speaking Docs** | `http://localhost:5181/docs` |
| **AI Agent Docs** | `http://localhost:5187/docs` |
| **AI Import Docs** | `http://localhost:5186/docs` |
| **ChromaDB** | `http://localhost:5184/api/v1/heartbeat` |
| **Redis** | `redis-cli -p 5185 ping` |

## B.6. Xử Lý Sự Cố Thường Gặp

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-------------|-----------|
| Backend không start được | MySQL chưa chạy | Kiểm tra `systemctl status mysql` |
| JDBC connection error | Sai thông số DB | Kiểm tra `application.yaml` |
| Frontend lỗi dependencies | Peer dependency conflict | Dùng `--legacy-peer-deps` |
| AI service lỗi module | Thiếu `.venv` hoặc chưa `pip install` | Chạy lại `pip install -e ".[dev]"` |
| ChromaDB lỗi storage | Thiếu thư mục `data/chroma` | `mkdir -p data/chroma` |
| Docker container crash | Port đã được dùng | `netstat -tlnp \| grep 5181` |

---

# PHỤ LỤC C. Danh Sách API Chính

**Base URL:** `http://localhost:8080` (Backend) / `http://localhost:{port}` (AI Services)
**Authentication:** Bearer JWT token (trừ các endpoint public)
**Response format:** JSON

## C.1. Authentication (`/api/auth`)

| STT | Method | Endpoint | Mô tả | Auth |
|-----|--------|----------|-------|------|
| 1 | POST | `/api/auth/register` | Đăng ký tài khoản mới | Public |
| 2 | POST | `/api/auth/login` | Đăng nhập, nhận JWT | Public |
| 3 | POST | `/api/auth/logout` | Đăng xuất | Authenticated |
| 4 | GET | `/api/auth/me` | Lấy thông tin user hiện tại | Authenticated |

## C.2. User Management (`/api/users`)

| STT | Method | Endpoint | Mô tả | Auth |
|-----|--------|----------|-------|------|
| 5 | POST | `/api/users/register` | Đăng ký (public) | Public |
| 6 | GET | `/api/users` | Danh sách tất cả users | MANAGER/ADMIN |
| 7 | GET | `/api/users/{id}` | Chi tiết user | Authenticated |
| 8 | GET | `/api/users/username/{username}` | Tìm user theo username | Authenticated |
| 9 | GET | `/api/users/role/{roleName}` | Users theo role | TEACHER/MANAGER/ADMIN |
| 10 | PUT | `/api/users/me` | Cập nhật profile cá nhân | Authenticated |
| 11 | PUT | `/api/users/{id}` | Admin cập nhật user | ADMIN |
| 12 | PUT | `/api/users/me/password` | Đổi mật khẩu | Authenticated |
| 13 | POST | `/api/users/{id}/roles/{roleName}` | Gán role cho user | ADMIN |
| 14 | DELETE | `/api/users/{id}/roles/{roleName}` | Xóa role khỏi user | ADMIN |
| 15 | DELETE | `/api/users/{id}` | Xóa user | ADMIN |

## C.3. Test Builder (`/api/tests`, `/api/test-builder`, `/api/test-structure`)

| STT | Method | Endpoint | Mô tả | Auth |
|-----|--------|----------|-------|------|
| 16 | GET | `/api/test-structure/sessions?testType=ACADEMIC` | Danh sách kỹ năng | Public |
| 17 | GET | `/api/test-structure/sessions/{id}/parts` | Danh sách parts | Public |
| 18 | GET | `/api/tests/published` | Đề thi đã publish | Public |
| 19 | GET | `/api/tests` | Danh sách đề thi | TEACHER/MANAGER/ADMIN |
| 20 | GET | `/api/test-builder` | Danh sách tests (có filter) | TEACHER/MANAGER/ADMIN |
| 21 | GET | `/api/test-builder/{id}/full` | Test đầy đủ (kèm câu hỏi) | STUDENT+ |
| 22 | GET | `/api/tests/{testId}` | Chi tiết test | STUDENT+ |
| 23 | POST | `/api/tests` | Tạo test mới | TEACHER+ |
| 24 | PUT | `/api/tests/{testId}/status` | Cập nhật trạng thái | TEACHER+ |
| 25 | DELETE | `/api/test-builder/{id}` | Xóa mềm test | TEACHER+ |
| 26 | DELETE | `/api/test-builder/{id}/permanent` | Xóa vĩnh viễn test | ADMIN |
| 27 | POST | `/api/test-builder/save-full` | Lưu full test (kèm cấu trúc) | TEACHER+ |
| 28 | POST | `/api/test-builder/shuffle` | Trộn đề từ test đã publish | TEACHER+ |
| 29 | POST | `/api/test-builder/filter` | Lọc đề thi | TEACHER+ |

## C.4. Test Sessions & Parts (`/api/tests`)

| STT | Method | Endpoint | Mô tả | Auth |
|-----|--------|----------|-------|------|
| 30 | GET | `/api/tests/sessions/master` | Master sessions | TEACHER+ |
| 31 | GET | `/api/tests/{testId}/sessions` | Sessions của test | TEACHER+ |
| 32 | GET | `/api/tests/{testId}/sessions/available` | Sessions có thể thêm | TEACHER+ |
| 33 | POST | `/api/tests/{testId}/sessions` | Thêm session vào test | TEACHER+ |
| 34 | DELETE | `/api/tests/{testId}/sessions/{tsId}` | Xóa session khỏi test | TEACHER+ |
| 35 | GET | `/api/tests/{testId}/sessions/{tsId}/parts` | Parts của test session | TEACHER+ |
| 36 | POST | `/api/tests/{testId}/sessions/{tsId}/parts` | Thêm part vào test | TEACHER+ |
| 37 | GET | `/api/tests/{testId}/sessions/{tsId}/parts/available` | Parts có thể thêm | TEACHER+ |
| 38 | GET | `/api/tests/sessions/master/{sessionId}/parts` | Master parts của session | TEACHER+ |

## C.5. Question Groups & Questions (`/api/tests`)

| STT | Method | Endpoint | Mô tả | Auth |
|-----|--------|----------|-------|------|
| 39 | GET | `/api/tests/question-types` | Danh sách loại câu hỏi | TEACHER+ |
| 40 | GET | `/api/tests/parts/{partId}/question-groups` | Groups của part | TEACHER+ |
| 41 | GET | `/api/tests/question-groups/{id}` | Chi tiết group (kèm câu hỏi) | STUDENT+ |
| 42 | POST | `/api/tests/parts/{partId}/question-groups` | Tạo group mới | TEACHER+ |
| 43 | PUT | `/api/tests/question-groups/{id}` | Cập nhật group | TEACHER+ |
| 44 | DELETE | `/api/tests/question-groups/{id}` | Xóa group | TEACHER+ |
| 45 | GET | `/api/tests/question-groups/{id}/questions` | Câu hỏi trong group | STUDENT+ |
| 46 | POST | `/api/tests/question-groups/{id}/questions` | Thêm câu hỏi vào group | TEACHER+ |
| 47 | PUT | `/api/tests/questions/{id}` | Cập nhật câu hỏi | TEACHER+ |
| 48 | DELETE | `/api/tests/questions/{id}` | Xóa câu hỏi | TEACHER+ |
| 49 | GET | `/api/tests/{testId}/sessions/{tsId}/parts/{tpId}/question-groups` | TQGs của test part | TEACHER+ |
| 50 | POST | `/api/tests/{testId}/sessions/{tsId}/parts/{tpId}/question-groups` | Thêm group vào test part | TEACHER+ |
| 51 | POST | `/api/tests/{testId}/sessions/{tsId}/parts/{tpId}/question-groups/add-all` | Thêm tất cả groups | TEACHER+ |

## C.6. Exams & Exam Attempts (`/api/exams`, `/api/exam-attempts`)

| STT | Method | Endpoint | Mô tả | Auth |
|-----|--------|----------|-------|------|
| 52 | POST | `/api/exams` | Tạo kỳ thi | TEACHER+ |
| 53 | PUT | `/api/exams/{id}` | Cập nhật kỳ thi | TEACHER+ |
| 54 | DELETE | `/api/exams/{id}` | Xóa kỳ thi | TEACHER+ |
| 55 | POST | `/api/exams/{id}/start` | Mở kỳ thi | TEACHER+ |
| 56 | POST | `/api/exams/{id}/close` | Đóng kỳ thi | TEACHER+ |
| 57 | GET | `/api/exams` | Danh sách kỳ thi (teacher) | TEACHER+ |
| 58 | GET | `/api/exams/available` | Kỳ thi có sẵn (student) | Authenticated |
| 59 | POST | `/api/exams/{id}/verify-password` | Xác thực mật khẩu | Authenticated |
| 60 | POST | `/api/exams/{id}/check-access` | Kiểm tra quyền truy cập | Authenticated |
| 61 | POST | `/api/exam-attempts/start` | Bắt đầu làm bài | STUDENT+ |
| 62 | POST | `/api/exam-attempts/{id}/submit` | Nộp bài | STUDENT+ |
| 63 | POST | `/api/exam-attempts/{id}/timeout` | Tự động nộp khi hết giờ | STUDENT+ |
| 64 | POST | `/api/exam-attempts/{id}/backup` | Lưu tạm trong quá trình làm | STUDENT+ |
| 65 | GET | `/api/exam-attempts/my` | Bài làm của tôi | STUDENT+ |
| 66 | GET | `/api/exam-attempts/{id}` | Chi tiết bài làm | Authenticated |
| 67 | GET | `/api/exam-attempts` | Tất cả bài làm (teacher) | TEACHER+ |
| 68 | PUT | `/api/exam-attempts/{id}/grade` | Chấm điểm bài làm | TEACHER+ |

## C.7. Guest Exam (`/api/guest/exam-attempts`)

| STT | Method | Endpoint | Mô tả | Auth |
|-----|--------|----------|-------|------|
| 69 | POST | `/api/guest/exam-attempts/start` | Bắt đầu thi (khách) | Public |
| 70 | POST | `/api/guest/exam-attempts/{id}/submit` | Nộp bài (khách) | Public |
| 71 | GET | `/api/guest/exam-attempts/{id}` | Kết quả thi (khách) | Public |

## C.8. Writing (`/api/writing`, `/api/student-writing`)

| STT | Method | Endpoint | Mô tả | Auth |
|-----|--------|----------|-------|------|
| 72 | POST | `/api/writing/submit` | Nộp bài writing | STUDENT+ |
| 73 | GET | `/api/writing/submissions` | Bài nộp của tôi | STUDENT+ |
| 74 | GET | `/api/writing/submissions/{id}` | Chi tiết bài nộp | STUDENT+ |
| 75 | GET | `/api/writing/teacher/submissions` | Bài nộp của học viên (teacher) | TEACHER+ |
| 76 | GET | `/api/writing/teacher/submissions/{id}` | Chi tiết bài nộp (teacher) | TEACHER+ |
| 77 | POST | `/api/writing/grade/{id}` | Chấm điểm tay | TEACHER+ |
| 78 | POST | `/api/writing/ai-grade/{id}` | Chấm bằng AI | TEACHER+ |
| 79 | GET | `/api/writing/ai-grade/{id}/result` | Kết quả AI chấm | TEACHER+ |
| 80 | POST | `/api/writing/ai-grade/test` | Test AI chấm (raw text) | TEACHER+ |
| 81 | POST | `/api/student-writing/submit` | Nộp writing (backup) | STUDENT+ |
| 82 | GET | `/api/writing/criteria` | Danh sách tiêu chí chấm | PUBLIC |

## C.9. Speaking (`/api/speaking`, `/api/speaking-gen`)

| STT | Method | Endpoint | Mô tả | Auth |
|-----|--------|----------|-------|------|
| 83 | GET | `/api/speaking/attempts/{id}` | Chi tiết bài nói | TEACHER+ |
| 84 | POST | `/api/speaking/grade/{id}` | Chấm điểm bài nói | TEACHER+ |
| 85 | GET | `/api/speaking-gen/frames` | Danh sách khung câu hỏi | Authenticated |
| 86 | POST | `/api/speaking-gen/frames` | Tạo khung câu hỏi | TEACHER+ |
| 87 | GET | `/api/speaking-gen/combos` | Danh sách combo | Authenticated |
| 88 | POST | `/api/speaking-gen/combos` | Tạo combo | TEACHER+ |
| 89 | POST | `/api/speaking-gen/build` | Sinh đề speaking (public) | Public |

## C.10. Assignments & Classes (`/api/assignments`, `/api/class-management`)

| STT | Method | Endpoint | Mô tả | Auth |
|-----|--------|----------|-------|------|
| 90 | POST | `/api/assignments` | Tạo bài tập | TEACHER+ |
| 91 | PUT | `/api/assignments/{id}` | Cập nhật bài tập | TEACHER+ |
| 92 | DELETE | `/api/assignments/{id}` | Xóa bài tập | TEACHER+ |
| 93 | GET | `/api/assignments/{id}` | Chi tiết bài tập | Authenticated |
| 94 | GET | `/api/assignments/class/{classId}` | Bài tập của lớp | TEACHER+ |
| 95 | POST | `/api/assignments/submit` | Nộp bài tập | STUDENT |
| 96 | POST | `/api/assignments/grade` | Chấm điểm bài tập | TEACHER+ |
| 97 | GET | `/api/class-management/my` | Quản lý lớp (user hiện tại) | Authenticated |
| 98 | GET | `/api/class-management/student/my-classes` | Lớp của tôi (student) | STUDENT |

## C.11. AI Agent (`/api/agent`)

| STT | Method | Endpoint | Mô tả | Auth |
|-----|--------|----------|-------|------|
| 99 | POST | `/api/agent/query` | Gửi câu hỏi cho AI Agent | MANAGER/ADMIN |
| 100 | GET | `/api/agent/agents` | Danh sách Agent | MANAGER/ADMIN |
| 101 | GET | `/api/agent/sessions/{id}/stream` | Stream kết quả session (SSE) | MANAGER/ADMIN |
| 102 | GET | `/api/agent/sessions/{id}/progress` | Tiến độ session | MANAGER/ADMIN |
| 103 | GET | `/api/agent/sessions/{id}/tasks` | Tasks trong session | MANAGER/ADMIN |
| 104 | GET | `/api/agent/posts` | Danh sách blog posts | TEACHER+ |
| 105 | GET | `/api/agent/posts/{id}` | Chi tiết blog post | TEACHER+ |
| 106 | PUT | `/api/agent/posts/{id}/publish` | Publish blog post | TEACHER+ |
| 107 | DELETE | `/api/agent/posts/{id}` | Xóa blog post | MANAGER/ADMIN |
| 108 | POST | `/api/agent/posts/generate` | Bắt đầu wizard tạo bài viết | Authenticated |
| 109 | GET | `/api/agent/posts/generate/{taskId}` | Trạng thái wizard | Authenticated |
| 110 | POST | `/api/agent/posts/generate/{taskId}/outline` | Xác nhận outline | Authenticated |
| 111 | POST | `/api/agent/posts/generate/{taskId}/content` | Xác nhận nội dung | Authenticated |
| 112 | GET | `/api/agent/categories` | Danh mục blog | Public |
| 113 | POST | `/api/agent/categories` | Tạo danh mục | MANAGER/ADMIN |
| 114 | PUT | `/api/agent/categories/{id}` | Cập nhật danh mục | MANAGER/ADMIN |
| 115 | DELETE | `/api/agent/categories/{id}` | Xóa danh mục | MANAGER/ADMIN |
| 116 | POST | `/api/agent/report/export-pdf` | Xuất báo cáo PDF | Public |
| 117 | GET | `/api/agent/actions/pending` | Hành động chờ duyệt | MANAGER/ADMIN |
| 118 | POST | `/api/agent/actions/{id}/approve` | Phê duyệt hành động | MANAGER/ADMIN |
| 119 | POST | `/api/agent/actions/{id}/reject` | Từ chối hành động | MANAGER/ADMIN |

## C.12. AI Writing Service (port 5182)

| STT | Method | Endpoint | Mô tả | Auth |
|-----|--------|----------|-------|------|
| 120 | POST | `/api/ai/writing/grade/{id}` | Chấm bài writing theo ID | Backend proxy |
| 121 | POST | `/api/ai/writing/test-grade` | Test chấm với raw text | Backend proxy |
| 122 | POST | `/api/ai/writing/classify` | Phân loại essay | Backend proxy |
| 123 | POST | `/api/ai/writing/match-samples` | Tìm essay mẫu tương tự | Backend proxy |
| 124 | POST | `/api/ai/writing/feedback` | Sinh feedback | Backend proxy |
| 125 | GET | `/api/ai/writing/result/{id}` | Kết quả chấm | Backend proxy |
| 126 | POST | `/api/ai/writing/approve/{id}` | Duyệt kết quả AI | Backend proxy |
| 127 | POST | `/api/ai/writing/reject/{id}` | Từ chối kết quả AI | Backend proxy |
| 128 | GET | `/api/ai/evaluation/accuracy` | Độ chính xác của model | Internal |
| 129 | GET | `/api/admin/ai/config` | Cấu hình hệ thống | Internal |
| 130 | GET | `/api/admin/ai/models` | Danh sách model AI | Internal |
| 131 | POST | `/api/admin/ai/model` | Chuyển model | Internal |
| 132 | GET | `/api/admin/ai/prompts` | Danh sách prompt templates | Internal |
| 133 | PUT | `/api/admin/ai/prompts/{name}` | Cập nhật prompt | Internal |
| 134 | POST | `/api/admin/ai/cache/clear` | Xóa cache grading | Internal |
| 135 | GET | `/health` | Health check | Public |

## C.13. AI Speaking Service (port 5181)

| STT | Method | Endpoint | Mô tả | Auth |
|-----|--------|----------|-------|------|
| 136 | POST | `/api/ai/speaking/sessions` | Tạo session speaking | Backend proxy |
| 137 | GET | `/api/ai/speaking/sessions/{id}` | Chi tiết session | Backend proxy |
| 138 | POST | `/api/ai/speaking/sessions/{id}/question` | Sinh câu hỏi | Backend proxy |
| 139 | POST | `/api/ai/speaking/sessions/{id}/answer` | Gửi câu trả lời (text) | Backend proxy |
| 140 | POST | `/api/ai/speaking/sessions/{id}/audio` | Upload audio | Backend proxy |
| 141 | POST | `/api/ai/speaking/sessions/{id}/evaluate` | Đánh giá session | Backend proxy |
| 142 | POST | `/api/ai/speaking/sessions/{id}/next-phase` | Chuyển phase | Backend proxy |
| 143 | POST | `/api/ai/speaking/sessions/{id}/end` | Kết thúc session | Backend proxy |
| 144 | POST | `/api/ai/speaking/tts` | Text-to-Speech | Backend proxy |
| 145 | POST | `/api/ai/speaking/exam-grade` | Chấm điểm thi speaking (multi-file) | Backend proxy |
| 146 | POST | `/api/ai/speaking/scoring/evaluate/{id}` | Chấm điểm (độc lập) | Backend proxy |
| 147 | GET | `/api/ai/speaking/scoring/result/{id}` | Kết quả chấm điểm | Backend proxy |
| 148 | GET | `/api/admin/speaking/config` | Cấu hình speaking | Internal |
| 149 | GET | `/api/admin/speaking/rubric` | Rubric chấm điểm | Internal |
| 150 | POST | `/api/admin/speaking/cache/clear` | Xóa cache | Internal |
| 151 | GET | `/health` | Health check | Public |

## C.14. AI Agent Service (port 5187)

| STT | Method | Endpoint | Mô tả | Auth |
|-----|--------|----------|-------|------|
| 152 | POST | `/api/agent/query` | Gửi query cho agent | Backend proxy |
| 153 | GET | `/api/agent/agents` | Danh sách agents | Backend proxy |
| 154 | GET | `/api/agent/sessions/{id}/stream` | Stream session | Backend proxy |
| 155 | GET | `/api/agent/sessions/{id}/progress` | Tiến độ session | Backend proxy |
| 156 | GET | `/api/agent/sessions` | Danh sách sessions | Backend proxy |
| 157 | POST | `/api/agent/posts/generate` | Wizard tạo bài | Backend proxy |
| 158 | GET | `/api/agent/posts/generate/{id}` | Trạng thái wizard | Backend proxy |
| 159 | POST | `/api/agent/posts/generate/{id}/outline` | Xác nhận outline | Backend proxy |
| 160 | POST | `/api/agent/posts/generate/{id}/content` | Xác nhận nội dung | Backend proxy |
| 161 | GET | `/api/agent/report/templates` | Mẫu báo cáo | Backend proxy |
| 162 | POST | `/api/agent/report/export-pdf` | Xuất PDF | Backend proxy |
| 163 | GET | `/api/agent/posts-list` | Danh sách posts (DB) | Public |
| 164 | GET | `/api/agent/posts/{id}` | Chi tiết post | Backend proxy |
| 165 | PUT | `/api/agent/posts/{id}/publish` | Publish post | Backend proxy |
| 166 | DELETE | `/api/agent/posts/{id}` | Xóa post | Backend proxy |
| 167 | GET | `/api/agent/categories` | Danh mục | Public |
| 168 | POST | `/api/agent/categories` | Tạo danh mục | Backend proxy |
| 169 | PUT | `/api/agent/categories/{id}` | Cập nhật danh mục | Backend proxy |
| 170 | DELETE | `/api/agent/categories/{id}` | Xóa danh mục | Backend proxy |
| 171 | GET | `/health` | Health check | Public |

## C.15. AI Import Service (port 5186)

| STT | Method | Endpoint | Mô tả | Auth |
|-----|--------|----------|-------|------|
| 172 | POST | `/api/ai/import/parse` | Parse file (PDF/DOCX/TXT) | Backend proxy |
| 173 | POST | `/api/ai/import/structure` | Cấu trúc hóa text thành đề thi | Backend proxy |
| 174 | POST | `/api/ai/import/create` | Tạo đề thi từ dữ liệu đã parse | Backend proxy |
| 175 | GET | `/api/ai/import/status/{id}` | Trạng thái task import | Backend proxy |
| 176 | GET | `/health` | Health check | Public |

## C.16. File & Media (`/api/files`, `/api/admin/drive`)

| STT | Method | Endpoint | Mô tả | Auth |
|-----|--------|----------|-------|------|
| 177 | POST | `/api/files/upload` | Upload file | TEACHER+ |
| 178 | GET | `/api/files/preview/{id}` | Xem trước file | Public |
| 179 | DELETE | `/api/files/{id}` | Xóa file | TEACHER+ |
| 180 | GET | `/api/admin/drive/status` | Trạng thái Google Drive | MANAGER/ADMIN |
| 181 | GET | `/api/admin/drive/authorize-url` | URL ủy quyền Google Drive | MANAGER/ADMIN |
| 182 | POST | `/api/admin/drive/revoke` | Thu hồi quyền Drive | MANAGER/ADMIN |
| 183 | GET | `/api/drive/authorize` | Redirect Google OAuth | Public |
| 184 | GET | `/api/drive/oauth2callback` | Google OAuth callback | Public |

## C.17. Test Share & Misc

| STT | Method | Endpoint | Mô tả | Auth |
|-----|--------|----------|-------|------|
| 185 | POST | `/api/test-share/generate` | Tạo link chia sẻ | TEACHER+ |
| 186 | GET | `/api/public/test-share/validate` | Xác thực link chia sẻ | Public |
| 187 | DELETE | `/api/test-share/deactivate` | Hủy link chia sẻ | TEACHER+ |
| 188 | GET | `/api/agent/uploads/**` | Proxy file upload từ Agent | Public |

---

*Tổng số: ~188 endpoint chính (Backend) + ~56 endpoint AI Services = ~244 endpoints.*
