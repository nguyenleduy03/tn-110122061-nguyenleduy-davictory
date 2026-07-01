**CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG**

Chương này trình bày quá trình phân tích và thiết kế hệ thống DAVictory IELTS, bao gồm khảo sát hiện trạng, yêu cầu chức năng và phi chức năng, tác nhân hệ thống, biểu đồ Use Case, thiết kế cơ sở dữ liệu, giao diện, kiến trúc, API và bảo mật.

### 3.1. Khảo sát hiện trạng

#### 3.1.1. Giới thiệu Trung tâm Victory

Trung tâm Ngoại ngữ - Tin học Victory là đơn vị đào tạo ngoại ngữ và tin học tại tỉnh Vĩnh Long, cung cấp các khóa học tiếng Anh giao tiếp, luyện thi IELTS và luyện thi TOEIC.

#### 3.1.2. Quy trình hiện tại

Quy trình tạo đề thi hiện dựa trên file Word hoặc PDF do giáo viên tự soạn và lưu trữ cá nhân. Quy trình tổ chức thi gồm chọn đề, in ấn, giám sát, thu bài và chấm thủ công. Quy trình chấm điểm Listening và Reading đối chiếu đáp án, Writing và Speaking chấm theo tiêu chí IELTS. Quy trình quản lý học viên dựa trên bảng tính và sổ ghi chép.

#### 3.1.3. Khó khăn và hạn chế

Sáu khó khăn chính được xác định: không có kho đề thi tập trung, tốn chi phí in ấn, chấm điểm Writing và Speaking mất nhiều thời gian, không có thống kê tập trung, thiếu môi trường tự luyện cho học viên, khó mở rộng khi số lượng học viên tăng.

#### 3.1.4. Yêu cầu từ trung tâm

Hệ thống cần hỗ trợ giáo viên tạo đề thi trực tuyến, tổ chức thi, quản lý lớp, chấm điểm (thủ công + AI). Học viên cần làm bài trực tuyến, xem lịch sử, theo dõi tiến bộ. AI hỗ trợ import đề thi và tạo nội dung báo cáo.

### 3.2. Yêu cầu chức năng

Hệ thống gồm 13 module chức năng với 52 chức năng chính, mỗi module được phân tích từ cả ba phía: backend (controller, service, entity), frontend (page, service, component) và AI service. Cách phân tích này được lựa chọn vì DAVictory không phải hệ thống chỉ có một backend và một giao diện hiển thị đơn giản; nhiều chức năng chỉ hoàn chỉnh khi cả ba lớp cùng phối hợp, ví dụ guest exam, AI Import hoặc chấm bài Writing qua AI.

| Module | Chức năng chính | Backend | Frontend |
|--------|----------------|---------|----------|
| AUTH | Đăng ký, đăng nhập, JWT, 5 roles | AuthController (4 endpoints), JwtUtil, JwtAuthFilter | Login.jsx, Register.jsx, authApi.js, ProtectedRoute, RoleBasedRoute |
| USER | CRUD, import CSV, phân role, soft delete | UserController, UserImportController, UserService (1127 dòng) | AdminUsers.jsx (1859 dòng) |
| CLASS | Quản lý lớp, phân công GV, thêm/xóa HV | ClassManagementController, entities: Center, Class, ClassStudent, ClassTeacher | ClassManagement.jsx |
| TEST | Test Builder 5 cấp, 25 loại câu hỏi, versioning, shuffle, share link | TestBuilderController (10 endpoints), TestBuilderService (929 dòng) | TestBuilder.jsx (2307 dòng), testBuilderApi.js (1519 dòng) |
| EXAM | Quản lý kỳ thi, password, lịch trình | ExamController (10 endpoints), Exam entity | ExamManager.jsx, examApi.js |
| ATTEMPT | Làm bài, auto-save 30s, timeout, chấm tự động L/R | ExamAttemptController (13 endpoints), ExamAttemptService (1143 dòng) | IeltsReadingTest.jsx, IeltsListeningTest.jsx, IeltsWritingTest.jsx, IeltsSpeakingTest.jsx |
| WRITING | Nộp bài, chấm tay (4 criteria), AI chấm, approve/reject | WritingController (11 endpoints), WritingService, AIBridgeService | GradeWriting.jsx, AIGradingPanel.jsx |
| SPEAKING | Speaking 3 parts, ghi âm, chấm tay + AI, frames/combos | SpeakingController, SpeakingGenController, ai-speaking-python (5181) | IeltsSpeakingTest.jsx |
| ASSIGNMENT | Giao bài, nộp bài, chấm điểm | AssignmentController (18 endpoints), AssignmentService | CreateAssignment.jsx, SubmitAssignment.jsx |
| AI IMPORT | Parse PDF/DOCX/image, LLM structure, create test | AIImportController, ai-import-python (5186) | AITestImport.jsx |
| AI AGENT | Chat, blog wizard, report, info query | AgentController (27 endpoints), ai-agent-python (5187) | AgentWorkspace.jsx, AgentChat.jsx (SSE), ContentManager.jsx |
| FILE | Upload Google Drive, preview, delete | FileUploadController, GoogleDriveOAuth2Service | fileApi.js (324 dòng) |
| GUEST | Share link, guest attempt | GuestExamController, TestShareLinkController | ProtectedRoute (guest=1), GuestInfoForm.jsx |

### 3.2.1. Phân tách nghiệp vụ cốt lõi

Khi đối chiếu với mã nguồn, có bốn đối tượng nghiệp vụ rất dễ bị nhầm lẫn nếu chỉ mô tả ở mức bề mặt:

- **`Test`** là đề thi gốc hoặc ngân hàng đề, dùng để biên soạn, version hóa, xuất bản và tái sử dụng.
- **`Exam`** là một kỳ thi cụ thể gắn với `Test`, có lịch, mật khẩu, lớp học hoặc phạm vi triển khai riêng.
- **`ExamAttempt`** là lượt làm bài cụ thể của người học trên một bài thi hoặc đề thi.
- **`WritingSubmission`** là nhánh nộp và chấm bài viết được tách riêng, vì Writing có đặc điểm khác Listening/Reading ở cách chấm điểm, lưu phản hồi và tích hợp AI.

Việc tách bốn đối tượng này thay vì gom chung vào một bảng bài làm duy nhất là quyết định thiết kế quan trọng. Nó giúp hệ thống vừa hỗ trợ ngân hàng đề tái sử dụng, vừa hỗ trợ tổ chức kỳ thi thực tế, đồng thời vẫn giữ được sự linh hoạt cho các luồng chấm tay và AI ở kỹ năng Writing.

### 3.3. Yêu cầu phi chức năng

Hệ thống cần đảm bảo: bảo mật (JWT HMAC-SHA256, BCrypt, 5 roles, CORS động, soft delete, AI quota: student 5/ngày writing, 10/ngày speaking), hiệu năng (HikariCP pool 20, Spring Cache, prepared statement cache, auto-save 30s), tính khả dụng (auto-submit timeout 60s grace, resume qua FullTestProgress, LLM fallback Groq-NVIDIA, key rotation).

Ngoài ba nhóm trên, hai yêu cầu phi chức năng khác cũng có ý nghĩa quan trọng:

- **Khả năng mở rộng nghiệp vụ:** hệ thống phải đủ linh hoạt để bổ sung thêm loại câu hỏi, thêm kỹ năng, thêm AI service hoặc thêm vai trò người dùng mà không phải viết lại toàn bộ kiến trúc.
- **Khả năng tương thích triển khai:** frontend phải chấp nhận được một số khác biệt giữa các môi trường chạy thực tế, thể hiện qua các cơ chế fallback ở luồng chấm bài và cách guest route được xác minh qua API riêng.

### 3.4. Tác nhân hệ thống

Năm tác nhân: Guest (không token, public + share link), Student (STUDENT, làm bài, xem kết quả), Teacher (TEACHER+, tạo đề, chấm điểm, quản lý lớp), Manager (MANAGER+, báo cáo, AI Agent), Admin (ADMIN, quản lý user, cấu hình). Thứ bậc quyền: GUEST(0) < STUDENT(1) < TEACHER(2) < MANAGER(3) < ADMIN(4).

### 3.5. Biểu đồ Use Case

Biểu đồ Use Case tổng thể gồm 33 use case: Guest (3), Student (10), Teacher (11), Manager (4), Admin (5). Các use case chính: đăng nhập, tạo đề thi, làm bài thi, chấm Writing bằng AI.

![Hình 3.1](images/chuong3_usecase.png)
*Hình 3.1 - Biểu đồ Use Case tổng thể*

### 3.6. Đặc tả Use Case

UC01 - Đăng nhập: Người dùng nhập username/password, backend xác thực, tạo JWT (access 24h, refresh 7 ngày), frontend lưu localStorage. UC02 - Tạo đề thi: Teacher thêm Session, Part, QuestionGroup, Question (25 loại), lưu DRAFT, xuất bản PUBLISHED. UC03 - Làm bài thi: Student bắt đầu attempt, trả lời, auto-save 30s, nộp hoặc timeout, chấm tự động L/R, chờ chấm W/S. UC04 - Chấm Writing bằng AI: Teacher chọn bài, gọi AI grading, pipeline 11 bước (classify, word count, RAG, prompt, LLM, parse, enforce, cache), teacher approve/reject.

### 3.6.1. Các quyết định thiết kế nổi bật

Từ quá trình đặc tả use case và đối chiếu với mã nguồn, đề tài đưa ra một số quyết định thiết kế quan trọng:

- **Mô hình đề thi 5 cấp:** `Test -> Session -> Part -> QuestionGroup -> Question` được lựa chọn để phản ánh đúng cấu trúc đề IELTS và cho phép tái sử dụng nhóm câu hỏi. Nếu chỉ mô hình hóa đề theo danh sách câu hỏi phẳng, hệ thống sẽ khó xử lý các passage chung, audio chung, nhóm câu liên quan hoặc các dạng matching phức tạp.
- **Version hóa đề bằng snapshot JSON:** Mỗi lần tạo version mới, hệ thống lưu snapshot toàn bộ đề để phục vụ đối chiếu và khôi phục về sau. Đây là quyết định phù hợp với bối cảnh giáo viên thường chỉnh sửa đề nhiều lần trước khi dùng chính thức.
- **Duy trì đồng thời authenticated flow và guest flow:** Hệ thống không bắt buộc mọi người dùng phải đăng nhập, vì trung tâm có nhu cầu chia sẻ đề thi thử cho khách ngoài. Do đó, guest share link được thiết kế như một luồng riêng chứ không phải ngoại lệ tạm thời.
- **Đặt một phần logic chuyển đổi dữ liệu ở frontend:** Frontend không chỉ hiển thị dữ liệu mà còn phải dựng lại cấu trúc đề thi, ánh xạ loại câu hỏi và tương thích dữ liệu giữa các endpoint. Điều này giúp backend giữ vai trò quản trị dữ liệu nghiệp vụ, trong khi frontend tối ưu cách biểu diễn cho trải nghiệm làm bài và biên soạn đề.

### 3.7. Biểu đồ tuần tự

Bốn biểu đồ tuần tự mô tả các luồng xử lý chính: đăng nhập JWT (Login.jsx → AuthController → AuthenticationManager → JwtUtil), làm bài thi với auto-save (Frontend → ExamAttemptController → ExamAttemptService → MySQL với backup 30s), chấm điểm Writing bằng AI (AIBridgeService → ai-writing-python → ChromaDB → Groq API), AI Import (Frontend → ai-import-python → Groq API → Java Backend).

![Hình 3.2](images/chuong3_seq_login.png)
*Hình 3.2 - Biểu đồ tuần tự đăng nhập JWT*

![Hình 3.3](images/chuong3_seq_exam.png)
*Hình 3.3 - Biểu đồ tuần tự làm bài thi với auto-save*

![Hình 3.4](images/chuong3_seq_aiwriting.png)
*Hình 3.4 - Biểu đồ tuần tự chấm điểm Writing bằng AI*

![Hình 3.5](images/chuong3_seq_aiimport.png)
*Hình 3.5 - Biểu đồ tuần tự AI Import*

### 3.8. Thiết kế cơ sở dữ liệu

Hệ thống sử dụng MySQL với 71 entity JPA, tương ứng 81 bảng vật lý (bao gồm bảng `@ManyToMany` và bảng từ AI services). Trong quá trình kiểm thử, 37 bảng đã có dữ liệu, phản ánh các module đã hoàn thiện. Thiết kế cơ sở dữ liệu không đi theo hướng gom toàn bộ dữ liệu về một vài bảng lớn, mà được chia theo miền nghiệp vụ để dễ mở rộng, dễ phân quyền và giảm xung đột logic giữa các module.

**37 bảng đang hoạt động:**

| STT | Bảng | Số dòng | Module |
|-----|------|---------|--------|
| 1 | questions | 1.249 | Test Builder |
| 2 | answers | 778 | Test Builder |
| 3 | attempt_answers | 745 | Exam |
| 4 | writing_sample_answers | 643 | AI Writing |
| 5 | test_question_groups | 614 | Test Builder |
| 6 | agent_tasks | 579 | AI Agent |
| 7 | question_groups | 483 | Test Builder |
| 8 | question_options | 449 | Test Builder |
| 9 | speaking_generated_questions | 439 | Speaking |
| 10 | test_parts | 428 | Test Builder |
| 11 | agent_sessions | 389 | AI Agent |
| 12 | exam_attempts | 305 | Exam |
| 13 | test_sessions | 146 | Test Builder |
| 14 | exam_attempt_grade_history | 119 | Exam |
| 15-37 | tests, users, roles, classes, ... | 4-83 | Các module khác |

**Các nhóm bảng chính:**
- User Management (5 bảng): users, roles, user_roles, student_profiles, teacher_profiles
- Test & Question (10 bảng): tests, test_sessions, test_parts, test_question_groups, question_groups, questions, question_options, answers, matching_pairs, passage_contents
- Exam & Attempt (7 bảng): exams, exam_attempts, attempt_answers, attempt_sections, attempt_question_times, full_test_progress, guest_exam_attempts
- Writing (8 bảng), Speaking (9 bảng), Class & Assignment (7 bảng), AI Agent (6 bảng), Media & Config (6 bảng)

Thiết kế này cho phép xử lý một số yêu cầu khó nếu dùng mô hình dữ liệu đơn giản sẽ rất vướng:

- lưu đề thi gốc và kỳ thi triển khai độc lập với nhau;
- lưu kết quả từng lượt làm bài và lịch sử chấm điểm;
- theo dõi tiến trình toàn bài để hỗ trợ resume;
- cho phép guest làm bài mà không cần user account chính thức;
- cho phép một số kỹ năng như Writing và Speaking có nhánh dữ liệu riêng do đặc thù chấm điểm khác nhau.

Chi tiết cấu trúc từng bảng (tên cột, kiểu dữ liệu, khóa) được trình bày trong Phụ lục A.

### 3.9. Thiết kế giao diện

Hệ thống có hơn 60 trang với nhiều route cho các vai trò khác nhau. Điểm đáng chú ý trong thiết kế giao diện là frontend không chỉ làm nhiệm vụ hiển thị. Nó còn đảm nhận ba vai trò kỹ thuật quan trọng:

- **Route orchestration:** điều hướng theo vai trò qua `ProtectedRoute` và `RoleBasedRoute`, đồng thời xử lý luồng guest share link.
- **Schema adaptation:** các service phía frontend như `ieltsApi.js` và `testBuilderApi.js` chuyển đổi dữ liệu backend sang dạng phù hợp cho runtime làm bài và trình biên soạn đề.
- **Compatibility fallback:** một số màn hình như `LmsGradeSubmission` có cơ chế fallback endpoint để chấp nhận khác biệt giữa các môi trường triển khai.

Vì vậy, khi thiết kế giao diện cho DAVictory, frontend được xem là một lớp điều phối nghiệp vụ ở phía client chứ không chỉ là presentation layer thuần túy.

### 3.10. Thiết kế kiến trúc hệ thống

Hệ thống được thiết kế theo kiến trúc 4 tầng: Client Layer (React, Vite/Nginx), Backend Layer (Spring Boot 4.0.3), AI Microservices Layer (4 FastAPI services: writing:5182, speaking:5181, import:5186, agent:5187), Data Layer (MySQL 8, ChromaDB 5184, Redis 5185).

Việc chọn kiến trúc 4 tầng thay vì gom tất cả vào backend Java có ba lý do chính:

- các AI pipeline thay đổi thường xuyên và có phụ thuộc Python ecosystem như OCR, STT, vector search;
- backend Java phù hợp hơn với quản trị nghiệp vụ, phân quyền và giao dịch dữ liệu quan hệ;
- frontend cần một số logic dựng cấu trúc đề và điều hướng phức tạp mà không nên đẩy toàn bộ về phía server.

Ba luồng dữ liệu tiêu biểu của kiến trúc là:

1. **Luồng làm bài thi:** frontend tải cấu trúc đề, render theo loại câu hỏi, lưu tiến trình cục bộ và đồng bộ lên backend; backend lưu attempt, chấm tự động phần có thể chấm, rồi trả kết quả.
2. **Luồng chấm Writing:** frontend gửi yêu cầu chấm, backend gọi cầu nối AI, AI Writing service thực hiện retrieval và scoring, sau đó giáo viên duyệt hoặc chỉnh sửa kết quả.
3. **Luồng AI Import:** frontend upload tài liệu, AI Import service parse và structure nội dung, người dùng xem preview, rồi backend tạo đề thi chính thức từ payload đã được map.

![Hình 3.6](images/chuong3_erd_tongthe.png)
*Hình 3.6 - Kiến trúc tổng thể 4 tầng*

### 3.11. Thiết kế API

Khoảng 150 API endpoints được tổ chức theo 8 nhóm chính: Authentication, User, Test Builder, Exam Attempt, Writing, Speaking, Assignment, AI Agent. Mỗi endpoint có phương thức HTTP, URL, vai trò truy cập và chức năng cụ thể.

Nguyên tắc thiết kế API của hệ thống là:

- backend cung cấp endpoint theo miền nghiệp vụ thay vì theo màn hình;
- phân quyền được gắn trực tiếp vào endpoint;
- các AI service không lộ toàn bộ chi tiết nội bộ ra frontend, mà thường đi qua backend hoặc bridge service;
- một số luồng đặc biệt như guest exam hoặc internal AI cần endpoint riêng để giảm phụ thuộc vào luồng người dùng đăng nhập thông thường.

### 3.12. Thiết kế bảo mật

JWT với HMAC-SHA256, secret key 64+ ký tự, access token 24h, refresh token 7 ngày. `JwtAuthenticationFilter` (OncePerRequestFilter). 5 roles với `@PreAuthorize` và `SecurityConfig`. BCrypt cho mật khẩu. CORS động. Soft delete (User.deletedAt, TestStatus.DELETED, Question.isActive).

Thiết kế bảo mật của DAVictory mang tính nhiều lớp:

- **Lớp xác thực:** kiểm tra token JWT ở backend và kiểm tra session ở frontend.
- **Lớp phân quyền route:** giới hạn truy cập theo URL pattern và role.
- **Lớp phân quyền dữ liệu:** ở nhiều service, giáo viên chỉ được chấm hoặc xem dữ liệu thuộc lớp của mình, học viên chỉ xem kết quả của chính mình.
- **Lớp truy cập công khai có kiểm soát:** guest share link cho phép truy cập không cần đăng nhập nhưng phải qua bước xác minh token liên kết.

Cách thiết kế này cho thấy bảo mật của hệ thống không chỉ nằm ở việc “có dùng JWT”, mà nằm ở sự kết hợp giữa xác thực, phân quyền và ràng buộc nghiệp vụ theo quan hệ dữ liệu.

### Tóm tắt chương 3

Chương 3 đã trình bày quá trình phân tích và thiết kế hệ thống DAVictory IELTS theo hướng gắn chặt với các quyết định kiến trúc và mô hình dữ liệu thực tế. Từ khảo sát hiện trạng với sáu khó khăn, các yêu cầu chức năng được phân tích cho 13 module và được làm rõ qua bốn đối tượng nghiệp vụ cốt lõi: `Test`, `Exam`, `ExamAttempt` và `WritingSubmission`. Chương cũng đã giải thích vì sao hệ thống chọn mô hình đề thi 5 cấp, version hóa bằng snapshot, duy trì đồng thời luồng người dùng đăng nhập và guest share link, và đặt một phần logic chuyển đổi dữ liệu ở frontend. Kiến trúc 4 tầng, thiết kế cơ sở dữ liệu theo miền nghiệp vụ, API theo domain và bảo mật nhiều lớp là nền tảng để triển khai hệ thống ở Chương 4.
