**CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI**

### 1.1. Lý do chọn đề tài

Trong bối cảnh hội nhập quốc tế và chuyển đổi số trong giáo dục, chứng chỉ IELTS (International English Language Testing System) ngày càng giữ vai trò quan trọng trong học tập, tuyển sinh, tuyển dụng và đánh giá năng lực tiếng Anh. Theo thống kê của Hội đồng Anh, mỗi năm có hơn 3,5 triệu thí sinh tham gia kỳ thi IELTS trên toàn thế giới. Tại Việt Nam, số lượng thí sinh IELTS tăng trung bình 15–20% mỗi năm, do các trường đại học, doanh nghiệp và cơ quan nhà nước ngày càng yêu cầu chứng chỉ này trong tuyển sinh và tuyển dụng. Điều này đặt ra yêu cầu ngày càng lớn đối với các trung tâm ngoại ngữ trong việc tổ chức đào tạo, kiểm tra, đánh giá và theo dõi tiến độ học viên một cách khoa học.

Thị trường công nghệ giáo dục (EdTech) Việt Nam đang trên đà phát triển mạnh mẽ với quy mô ước tính đạt hơn 3 tỷ USD vào năm 2024 và tốc độ tăng trưởng kép hàng năm (CAGR) khoảng 20%. Xu hướng ứng dụng trí tuệ nhân tạo (AI) vào lĩnh vực giáo dục nói chung và đào tạo ngoại ngữ nói riêng đang được các quốc gia trên thế giới và Việt Nam quan tâm, đặc biệt là các công nghệ xử lý ngôn ngữ tự nhiên (NLP), mô hình ngôn ngữ lớn (LLM), nhận dạng giọng nói (STT) và truy xuất tăng cường sinh (RAG).

Trung tâm Ngoại ngữ - Tin học Victory là đơn vị đào tạo ngoại ngữ và tin học tại tỉnh Vĩnh Long, cung cấp các khóa học tiếng Anh giao tiếp, luyện thi IELTS, TOEIC và tin học văn phòng cho học viên trên địa bàn tỉnh và các khu vực lân cận. Qua quá trình khảo sát thực tế, trung tâm hiện đang gặp bốn khó khăn chính trong việc quản lý hoạt động luyện thi IELTS:

- **Thứ nhất**, giáo viên soạn đề thi thủ công trên các công cụ văn phòng như Microsoft Word hoặc PDF, dẫn đến đề thi bị lưu trữ rời rạc, khó tìm kiếm, khó tái sử dụng và thiếu cơ chế quản lý phiên bản. Khi một giáo viên nghỉ việc hoặc chuyển lớp, bộ đề do giáo viên đó soạn thường bị thất lạc hoặc không được bàn giao đầy đủ.
- **Thứ hai**, việc tổ chức thi trực tiếp tiêu tốn nhiều thời gian, chi phí in ấn (khoảng 500.000 đồng mỗi kỳ thi cho một lớp 20 học viên) và yêu cầu giám thị coi thi. Quy trình chấm bài thủ công kéo dài từ 2 đến 3 ngày sau khi thi, làm chậm phản hồi cho học viên.
- **Thứ ba**, khâu chấm điểm hai kỹ năng Writing và Speaking hoàn toàn phụ thuộc vào giáo viên, mỗi bài Writing mất trung bình 20–30 phút để chấm chi tiết theo bốn tiêu chí IELTS (Task Response, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy). Khi số lượng học viên tăng, giáo viên quá tải, chất lượng chấm điểm không đồng đều và khó đảm bảo tính nhất quán.
- **Thứ tư**, học viên không có công cụ để tự luyện tập tại nhà, không thể theo dõi quá trình tiến bộ của bản thân một cách có hệ thống. Việc thiếu môi trường thi thử trực tuyến khiến học viên không quen với áp lực thời gian và giao diện thi, dẫn đến kết quả thi thực tế thấp hơn năng lực.

Các nền tảng luyện thi IELTS trực tuyến hiện có trên thị trường đều có những hạn chế nhất định. Bảng 1.1 so sánh các giải pháp hiện có với hệ thống DAVictory.

*Bảng 1.1 - So sánh các nền tảng luyện thi IELTS hiện có*

| Tiêu chí | IELTS Online (BC) | IELTS Liz | IELTS Advantage | DAVictory |
|----------|-------------------|-----------|-----------------|-----------|
| Chi phí | ~2.000.000 VNĐ/lần | Miễn phí | Miễn phí | Miễn phí (HV trung tâm) |
| Quản lý lớp học | Không | Không | Không | Có (Center, Class, GV, HV) |
| Tạo đề thi tùy chỉnh | Không | Không | Không | Có (Test Builder 5 cấp, 25 dạng câu hỏi) |
| Chấm điểm Writing tự động | Có (chung chung) | Không | Không | Có (AI + RAG, 4 tiêu chí IELTS) |
| Chấm điểm Speaking tự động | Không | Không | Không | Có (AI + STT Whisper, 4 tiêu chí) |
| Auto-import đề từ PDF/DOCX | Không | Không | Không | Có (AI Import) |
| AI Agent hỗ trợ | Không | Không | Không | Có (4 tác tử) |
| Giao diện tiếng Việt | Không | Không | Không | Có |
| Chia sẻ đề thi cho khách | Không | Không | Không | Có (Guest share link) |

Trong những năm gần đây, trí tuệ nhân tạo, đặc biệt là các mô hình ngôn ngữ lớn (LLM) như GPT-4o, qwen3-32b, nemotron-70b, kết hợp với các kỹ thuật như xử lý ngôn ngữ tự nhiên (NLP), nhận dạng giọng nói (STT) qua Whisper và truy xuất tăng cường sinh (RAG) với ChromaDB, đã mở ra khả năng hỗ trợ giáo viên trong quá trình chấm điểm và phản hồi một cách nhất quán và nhanh chóng. Xuất phát từ những nhu cầu thực tế trên, đề tài **"Xây dựng hệ thống website hỗ trợ luyện thi IELTS cho Trung tâm Ngoại ngữ - Tin học Victory"** được lựa chọn nhằm xây dựng một nền tảng quản lý và luyện thi trực tuyến có khả năng áp dụng trong thực tế, giải quyết đồng thời bốn khó khăn nêu trên.

![Hình 1.1](images/chuong1_quytrinh_phattrien.png)
*Hình 1.1 - Quy trình phát triển phần mềm 6 giai đoạn*

### 1.2. Mục tiêu đề tài

Mục tiêu tổng quát của đề tài là xây dựng một hệ thống website hỗ trợ luyện thi IELTS trực tuyến cho Trung tâm Ngoại ngữ - Tin học Victory. Hệ thống hướng đến việc quản lý tập trung quy trình đào tạo, bao gồm tạo đề thi, tổ chức thi, làm bài trực tuyến, chấm điểm, theo dõi kết quả học viên và hỗ trợ giáo viên bằng AI. Bảng 1.2 mô tả sự thay đổi trong quy trình nghiệp vụ trước và sau khi có hệ thống.

*Bảng 1.2 - So sánh quy trình trước và sau khi có hệ thống DAVictory*

| Quy trình | Trước khi có hệ thống | Sau khi có hệ thống |
|-----------|----------------------|---------------------|
| Tạo đề thi | Soạn thủ công trên Word/PDF, lưu trữ cá nhân, không quản lý phiên bản | Test Builder kéo thả, cấu trúc 5 cấp, versioning, shuffle, kho đề tập trung |
| Tổ chức thi | In ấn đề, giám thị coi thi, thu bài giấy | Thi trực tuyến, password bảo vệ, auto-save 30 giây, server-side timer |
| Chấm điểm Listening/Reading | Đối chiếu đáp án thủ công | Chấm tự động ngay khi nộp bài |
| Chấm điểm Writing | Giáo viên chấm tay, mỗi bài 20-30 phút | AI pipeline 11 bước với RAG, giáo viên approve/reject, hỗ trợ chấm tay |
| Chấm điểm Speaking | Giáo viên phỏng vấn trực tiếp, ghi chú tay | Ghi âm trực tuyến, STT Whisper, AI scoring 4 tiêu chí, giáo viên chấm bổ sung |
| Quản lý học viên | Bảng tính Excel, sổ ghi chép | Dashboard theo dõi tiến độ, lịch sử thi, StudentProgress, StudentSkillScore |
| Tạo nội dung & báo cáo | Thủ công, không có công cụ hỗ trợ | AI Agent: blog wizard, info query, report generation, email |

Các mục tiêu cụ thể được chia thành năm nhóm chính:

- **Nhóm 1 — Quản lý người dùng và phân quyền**: Xây dựng hệ thống xác thực JWT với năm vai trò (Guest, Student, Teacher, Manager, Admin), quản lý tài khoản, hồ sơ học viên và giáo viên, import học viên từ CSV theo batch 500 bản ghi, quản lý lớp học và trung tâm (Center, Class, ClassStudent, ClassTeacher).

- **Nhóm 2 — Quản lý đề thi và tổ chức thi**: Xây dựng module Test Builder cho phép tạo đề thi với cấu trúc phân cấp 5 cấp (Test → Session → Part → QuestionGroup → Question), hỗ trợ 25 dạng câu hỏi IELTS (Multiple Choice, True/False/Not Given, Fill in the Blank, Matching, Essay, Speaking cue card…), quản lý phiên bản đề thi qua TestVersion, trộn đề ngẫu nhiên theo đơn vị Part, tổ chức kỳ thi với password bảo vệ, làm bài trực tuyến bốn kỹ năng với auto-save 30 giây và server-side timer, chấm tự động Listening và Reading.

- **Nhóm 3 — Chấm điểm thông minh**: Xây dựng module chấm điểm Writing sử dụng AI với pipeline 11 bước (phân loại bài, đếm từ, RAG ChromaDB hybrid scoring 70% cosine similarity + 30% keyword overlap, xây dựng prompt, gọi LLM Groq, parse kết quả, band enforcement, cache), module chấm điểm Speaking với pipeline 6 bước (quản lý phiên, sinh câu hỏi LLM, STT Whisper, phân tích đặc trưng, phát âm, LLM scoring GPT-4o). Hỗ trợ cả chấm tay và AI, giáo viên có thể approve hoặc reject kết quả AI.

- **Nhóm 4 — Tích hợp AI**: Xây dựng module AI Import tự động tạo đề thi từ file PDF, DOCX hoặc ảnh (OCR Tesseract) thông qua pipeline 3 lớp (Parser Factory → AI Structurer Groq → Test Mapper vào Java Backend). Module AI Agent với kiến trúc multi-agent (Orchestrator + 4 tác tử: Content Blog Wizard, Info Query SQL, Report Generator PDF, Email) và human-in-the-loop approval, SSE streaming.

- **Nhóm 5 — Quản lý học tập và tiện ích**: Xây dựng module quản lý bài tập (Assignment) với nộp bài và chấm điểm, module upload file qua Google Drive API OAuth 2.0, module thi thử cho khách qua share link (Guest Exam), module thống kê báo cáo theo dõi tiến độ học viên (StudentProgress, StudentSkillScore, Dashboard).

![Hình 1.2](images/chuong1_muctieu.png)
*Hình 1.2 - Năm nhóm mục tiêu chính của hệ thống*

### 1.3. Đối tượng và phạm vi nghiên cứu

Đối tượng nghiên cứu của đề tài là hệ thống website hỗ trợ luyện thi IELTS và các quy trình nghiệp vụ liên quan đến quản lý lớp học, tạo đề thi, tổ chức thi, chấm điểm và theo dõi tiến độ học viên tại Trung tâm Ngoại ngữ - Tin học Victory.

**Đối tượng người dùng:** Hệ thống phục vụ năm nhóm, phân cấp quyền từ thấp đến cao:

- **Khách (Guest)** — Người dùng không cần đăng ký tài khoản, có thể làm bài thi thử thông qua liên kết chia sẻ (share link) do giáo viên hoặc trung tâm cung cấp. Hệ thống thu thập thông tin cơ bản (họ tên, email, số điện thoại) trước khi vào thi, kết quả được lưu vào GuestExamAttempt.
- **Học viên (Student)** — Người dùng đã đăng ký tài khoản, thuộc các lớp học tại trung tâm. Sử dụng hệ thống để làm bài thi, nộp bài Writing, thực hành Speaking, xem kết quả và theo dõi lịch sử học tập qua dashboard cá nhân. Được giới hạn quota AI: 5 lần chấm Writing/ngày, 10 lần chấm Speaking/ngày.
- **Giáo viên (Teacher)** — Người dùng có quyền quản lý lớp học được phân công, tạo và quản lý đề thi qua Test Builder, tổ chức kỳ thi, chấm điểm thủ công và sử dụng AI hỗ trợ, giao bài tập, xem kết quả học viên. Được quota AI cao hơn: 50 lần Writing/ngày, 100 lần Speaking/ngày.
- **Quản lý (Manager)** — Kế thừa quyền Teacher, bổ sung quyền xem báo cáo thống kê, sử dụng AI Agent để tra cứu thông tin và tạo báo cáo, quản lý nội dung blog.
- **Quản trị viên (Admin)** — Cấp quyền cao nhất. Quản lý toàn bộ người dùng (thêm, sửa, xóa, import CSV), phân quyền, quản lý trung tâm (Center), cấu hình hệ thống. Được quota AI tối đa: 200 lần Writing/ngày, 500 lần Speaking/ngày.

**Phạm vi chức năng:** Hệ thống gồm 13 module chức năng với 52 chức năng chính, được triển khai trên cả ba tầng: backend Spring Boot (31 controller), frontend React (62 trang) và AI Microservices Python (4 service). Bảng 1.3 liệt kê các module thuộc phạm vi và các chức năng nằm ngoài phạm vi đề tài.

*Bảng 1.3 - Phạm vi chức năng của hệ thống*

| STT | Module | Trạng thái | Mô tả |
|-----|--------|-----------|-------|
| 1 | AUTH — Xác thực & phân quyền | Trong phạm vi | JWT, 5 roles, BCrypt, CORS động |
| 2 | USER — Quản lý người dùng | Trong phạm vi | CRUD, import CSV, soft delete, hồ sơ |
| 3 | CLASS — Quản lý lớp học | Trong phạm vi | Center, Class, phân công GV, thêm/xóa HV |
| 4 | TEST — Xây dựng đề thi | Trong phạm vi | Test Builder 5 cấp, 25 dạng câu hỏi, versioning, shuffle |
| 5 | EXAM — Tổ chức thi | Trong phạm vi | Quản lý kỳ thi, password, lịch trình |
| 6 | ATTEMPT — Làm bài thi | Trong phạm vi | 4 kỹ năng, auto-save 30s, timeout, resume |
| 7 | WRITING — Chấm điểm Writing | Trong phạm vi | Nộp bài, chấm tay, AI pipeline 11 bước |
| 8 | SPEAKING — Chấm điểm Speaking | Trong phạm vi | 3 parts, ghi âm, STT, AI scoring |
| 9 | ASSIGNMENT — Bài tập | Trong phạm vi | Giao bài, nộp bài, chấm điểm, phát hiện nộp muộn |
| 10 | AI IMPORT — Nhập đề tự động | Trong phạm vi | PDF/DOCX/image → AI structure → tạo đề |
| 11 | AI AGENT — Trợ lý AI | Trong phạm vi | 4 tác tử: Content, Info, Report, Email |
| 12 | FILE — Upload file | Trong phạm vi | Google Drive API, preview, quản lý media |
| 13 | GUEST — Thi thử cho khách | Trong phạm vi | Share link, GuestExamAttempt |
| — | Thanh toán trực tuyến | Ngoài phạm vi | Chưa tích hợp cổng thanh toán |
| — | Ứng dụng di động | Ngoài phạm vi | Chưa phát triển app iOS/Android |
| — | Thông báo thời gian thực | Ngoài phạm vi | Chưa triển khai WebSocket |
| — | Hệ thống cache tập trung | Ngoài phạm vi | Đang dùng ConcurrentHashMap, chưa triển khai Redis cache |
| — | CI/CD pipeline | Ngoài phạm vi | Chưa thiết lập tự động hóa build/test/deploy |

**Phạm vi dữ liệu:** Hệ thống sử dụng MySQL 8 với 71 entity JPA (tương ứng 81 bảng vật lý bao gồm bảng liên kết Many-to-Many), trong đó 37 bảng đã có dữ liệu thực tế. Các số liệu tiêu biểu: 1.249 câu hỏi, 778 đáp án, 643 bài viết mẫu cho RAG, 483 nhóm câu hỏi, 439 câu hỏi Speaking được sinh tự động, 305 lượt thi, 579 tác vụ AI Agent, 389 phiên hội thoại Agent.

**Phạm vi công nghệ:** Hệ thống sử dụng kiến trúc 4 tầng:
- **Tầng Client**: React 19.2.0, Vite 8.0, 62 trang, 12 service files, 27 common components, 11 question renderers, 27 test builder blocks, 8 custom hooks và 13 utility modules.
- **Tầng Backend**: Spring Boot 4.0.3, Java 21, 31 controllers, 25 services, 71 entities, 71 repositories, 72 DTOs, REST API tại `/api/*`.
- **Tầng AI Microservices**: 4 service Python FastAPI (ai-writing:5182, ai-speaking:5181, ai-import:5186, ai-agent:5187), tổng cộng 102 file Python.
- **Tầng Dữ liệu**: MySQL 8 (primary), ChromaDB 5184 (vector), Redis 5185 (cache/message queue), Google Drive (file storage).

### 1.4. Phương pháp thực hiện

Đề tài được thực hiện theo mô hình phát triển Agile/Scrum, chia dự án thành nhiều sprint ngắn (2 tuần) với product backlog được ưu tiên theo giá trị nghiệp vụ. Mỗi sprint kết thúc bằng buổi review và retrospective để đánh giá tiến độ và điều chỉnh kế hoạch. Quy trình phát triển phần mềm gồm sáu giai đoạn chính:

- **Giai đoạn 1 — Khảo sát (2 tuần):** Thu thập yêu cầu từ trung tâm Victory thông qua phỏng vấn trực tiếp ban giám đốc và giáo viên, tìm hiểu quy trình dạy học, tổ chức thi, chấm điểm và quản lý học viên hiện tại. Kết quả: tài liệu khảo sát hiện trạng với 6 khó khăn và 4 nhóm yêu cầu chính.

- **Giai đoạn 2 — Phân tích (3 tuần):** Xác định tác nhân, yêu cầu chức năng (52 chức năng, 13 module) và phi chức năng. Sử dụng biểu đồ UML (Use Case, Sequence, Activity) để mô hình hóa yêu cầu. Xác định phạm vi IN/OUT của dự án.

- **Giai đoạn 3 — Thiết kế (4 tuần):** Thiết kế kiến trúc tổng thể 4 tầng (Client - Backend - AI Services - Data). Thiết kế cơ sở dữ liệu quan hệ với 71 entity JPA ánh xạ qua Hibernate ORM. Thiết kế API RESTful với hơn 150 endpoint. Thiết kế bảo mật JWT + BCrypt + RBAC 5 roles + CORS động + soft delete. Thiết kế giao diện người dùng cho 5 nhóm vai trò.

- **Giai đoạn 4 — Lập trình (12 tuần):** Phát triển backend Java Spring Boot theo mô hình Controller - Service - Repository. Phát triển frontend React với component-based architecture. Phát triển 4 AI service Python FastAPI với pipeline riêng. Tích hợp LLM đa nhà cung cấp (Groq, OpenAI, NVIDIA) với key rotation và fallback.

- **Giai đoạn 5 — Kiểm thử (3 tuần):** Kiểm thử thủ công 96 kịch bản qua 14 nhóm chức năng sử dụng Swagger UI và Postman. Kiểm thử độ chính xác AI Writing với 5 bài mẫu benchmark. Kiểm thử xử lý lỗi và ngoại lệ (timeout, sai định dạng, API key hết hạn, database offline).

- **Giai đoạn 6 — Đánh giá (2 tuần):** Tổng hợp kết quả đạt được, xác định ưu điểm và hạn chế, đề xuất hướng phát triển trong tương lai. Viết báo cáo khóa luận và tài liệu hướng dẫn sử dụng.

*Bảng 1.4 - Công cụ và môi trường phát triển*

| Hạng mục | Công cụ | Mục đích |
|----------|--------|----------|
| Quản lý mã nguồn | Git, GitHub | Version control, lưu trữ và quản lý phiên bản |
| IDE Backend | IntelliJ IDEA 2024 | Phát triển Java Spring Boot |
| IDE Frontend | Visual Studio Code | Phát triển React, JavaScript/JSX |
| IDE Python | VS Code + PyCharm | Phát triển AI microservices |
| Build Tool | Maven 3.9 | Quản lý dependency và build backend |
| API Testing | Swagger UI, Postman | Kiểm thử REST API |
| Container | Docker, Docker Compose | Container hóa Redis và AI Speaking |
| Quản lý dịch vụ | manage.sh (555 dòng) | Quản lý vòng đời 8 services |
| Database | MySQL 8, MySQL Workbench | Lưu trữ và quản trị dữ liệu |
| JDK | OpenJDK 21 | Môi trường chạy Java |
| Runtime | Node.js 20, Python 3.12 | Môi trường chạy frontend và AI services |

### 1.5. Ý nghĩa thực tiễn của đề tài

**Đối với Trung tâm Ngoại ngữ - Tin học Victory:** Hệ thống giúp số hóa toàn bộ quy trình tạo đề, tổ chức thi, chấm điểm và lưu trữ kết quả, giảm thiểu chi phí in ấn (ước tính tiết kiệm khoảng 500.000 đồng/kỳ thi/lớp) và thời gian xử lý thủ công. Kho đề thi tập trung với quản lý phiên bản giúp trung tâm dễ dàng mở rộng quy mô đào tạo mà không bị phụ thuộc vào từng giáo viên. Hệ thống cũng tạo lợi thế cạnh tranh cho trung tâm trong bối cảnh chuyển đổi số giáo dục, thu hút học viên nhờ công nghệ AI hiện đại và môi trường học tập trực tuyến chuyên nghiệp.

**Đối với giáo viên:** Test Builder kéo thả trực quan giúp tạo đề thi nhanh hơn gấp 3–4 lần so với soạn thảo thủ công trên Word. AI hỗ trợ chấm điểm Writing và Speaking giúp giáo viên giảm thời gian chấm bài từ 20–30 phút/bài xuống còn 5 phút để kiểm tra và approve kết quả AI. Quản lý lớp học tập trung giúp giáo viên theo dõi tiến độ từng học viên qua dashboard, thay vì phải tổng hợp thủ công từ nhiều nguồn. AI Agent hỗ trợ tạo nội dung blog và báo cáo tự động, giảm tải công việc hành chính.

**Đối với học viên:** Hệ thống cho phép luyện thi trực tuyến mọi lúc, mọi nơi, chỉ cần thiết bị có kết nối Internet. Phản hồi chi tiết từ AI (theo từng tiêu chí IELTS) giúp học viên hiểu rõ điểm mạnh, điểm yếu và có hướng cải thiện cụ thể. Dashboard theo dõi tiến bộ với StudentProgress và StudentSkillScore giúp học viên tự đánh giá quá trình học tập. Guest share link cho phép trung tâm mở rộng tiếp cận đến học viên tiềm năng mà không yêu cầu đăng ký tài khoản.

**Về ý nghĩa kinh tế:** Hệ thống giúp trung tâm tiết kiệm chi phí vận hành (in ấn, giám thị, lưu trữ) và tăng hiệu suất làm việc của giáo viên. Học viên tiết kiệm chi phí thi thử (miễn phí với DAVictory so với ~2.000.000 đồng/lần thi thử của British Council). Về lâu dài, hệ thống có thể mở rộng thành sản phẩm SaaS (Software as a Service) cung cấp cho các trung tâm ngoại ngữ khác.

**Về ý nghĩa xã hội:** Hệ thống góp phần thu hẹp khoảng cách tiếp cận giáo dục chất lượng giữa thành thị và nông thôn. Học viên tại Vĩnh Long và các tỉnh lân cận (Bến Tre, Trà Vinh, Đồng Tháp, Tiền Giang) có cơ hội tiếp cận công cụ luyện thi IELTS với AI mà trước đây chỉ có tại các trung tâm lớn ở TP.HCM hoặc Hà Nội.

**Về ý nghĩa giáo dục:** Hệ thống là minh chứng cho việc ứng dụng hiệu quả công nghệ AI trong giáo dục tại Việt Nam. Mô hình kết hợp giữa giáo viên và AI (human-in-the-loop) đảm bảo chất lượng chấm điểm trong khi vẫn giữ vai trò quyết định cuối cùng cho người dạy. Đây là hướng đi phù hợp với chủ trương chuyển đổi số trong giáo dục của Bộ Giáo dục và Đào tạo.

**Đối với cộng đồng nghiên cứu:** Đề tài đóng góp một giải pháp tham khảo về kiến trúc tích hợp AI microservices vào hệ thống đào tạo trực tuyến, sử dụng LLM đa nhà cung cấp với RAG hybrid scoring và multi-agent system. Các pipeline chấm điểm (Writing 11 bước, Speaking 6 bước) và cơ chế key rotation/fallback có thể được tham khảo cho các dự án EdTech tương tự.

### 1.6. Điểm mới và đóng góp của đề tài

**Về mặt công nghệ:** Đề tài kết hợp bốn microservices AI độc lập (Writing Grading với RAG, Speaking Evaluation với STT Whisper, Document Import với OCR và LLM structure, Multi-Agent với SSE streaming) vào một nền tảng luyện thi IELTS hoàn chỉnh. Sử dụng kiến trúc đa nhà cung cấp LLM (Groq làm chính, NVIDIA làm fallback, OpenAI cho Speaking) với cơ chế key rotation tự động và fallback theo thứ tự ưu tiên để đảm bảo tính sẵn sàng của dịch vụ AI, tránh phụ thuộc vào một nhà cung cấp duy nhất.

**Về mặt giải pháp:** Hệ thống áp dụng kỹ thuật RAG (Retrieval-Augmented Generation) với hybrid scoring kết hợp 70% cosine similarity và 30% keyword overlap, diversification theo band range để cải thiện độ chính xác chấm điểm Writing. Cách tiếp cận này khác biệt so với các giải pháp chỉ dùng LLM đơn thuần (prompt engineering), cho phép tận dụng 643 bài viết mẫu đã được chấm điểm làm ngữ cảnh tham khảo cho LLM.

**Về mặt nghiệp vụ:** Hệ thống hỗ trợ 25 dạng câu hỏi IELTS với cấu trúc phân cấp 5 cấp (Test → Session → Part → QuestionGroup → Question) và module Test Builder kéo thả trực quan (dnd-kit). Các tính năng quản lý phiên bản (TestVersion), trộn đề ngẫu nhiên (shuffle theo Part), xuất bản và lưu trữ (DRAFT → PUBLISHED → ARCHIVED), chia sẻ cho khách (share link) là những tính năng chưa có trên các nền tảng luyện thi IELTS hiện có.

**Về mặt kiến trúc:** Hệ thống được thiết kế theo mô hình 4 tầng (Frontend React - Backend Spring Boot - AI Microservices Python - Database MySQL/ChromaDB/Redis), cho phép mỗi tầng phát triển và triển khai tương đối độc lập. Điểm đáng chú ý là frontend không chỉ đóng vai trò hiển thị giao diện mà còn tham gia điều phối route theo vai trò, xác minh guest share link và chuyển đổi dữ liệu giữa runtime bài thi với schema backend. Mô hình human-in-the-loop trong quy trình chấm điểm AI (giáo viên approve/reject kết quả AI) đảm bảo chất lượng đầu ra trong khi vẫn tận dụng được sức mạnh của AI. Bảng 1.5 so sánh các tính năng nổi bật của DAVictory với các nền tảng luyện thi IELTS hiện có.

*Bảng 1.5 - So sánh tính năng DAVictory với các nền tảng hiện có*

| Tính năng | IELTS Online (BC) | IELTS Liz | IELTS Advantage | Write&Improve | DAVictory |
|-----------|:---:|:---:|:---:|:---:|:---:|
| Thi thử 4 kỹ năng | Có | Không | Không | Không | **Có** |
| 25 dạng câu hỏi IELTS | Một phần | Không | Không | Không | **Có** |
| Test Builder kéo thả | Không | Không | Không | Không | **Có** |
| Quản lý phiên bản đề thi | Không | Không | Không | Không | **Có** |
| Trộn đề ngẫu nhiên | Không | Không | Không | Không | **Có** |
| Auto-save 30 giây | Không | Không | Không | Không | **Có** |
| Resume bài thi đang dở | Có | Không | Không | Không | **Có** |
| Chấm Writing bằng AI | Một phần | Không | Không | Có | **Có (RAG)** |
| Chấm Speaking bằng AI | Không | Không | Không | Không | **Có (STT)** |
| AI Import từ PDF/DOCX | Không | Không | Không | Không | **Có** |
| AI Agent (blog, báo cáo) | Không | Không | Không | Không | **Có** |
| Quản lý lớp học | Không | Không | Không | Không | **Có** |
| Guest share link | Không | Không | Không | Không | **Có** |
| Phân quyền 5 roles | Không | Không | Không | Không | **Có** |
| Giao diện tiếng Việt | Không | Không | Không | Không | **Có** |

### 1.7. Cấu trúc khóa luận

Khóa luận được tổ chức thành năm chương, phần kết luận, phụ lục và danh mục tài liệu tham khảo.

![Hình 1.3](images/chuong1_cautruc_khoaluan.png)
*Hình 1.3 - Cấu trúc khóa luận*

- **Chương 1 — Tổng quan đề tài:** Trình bày bối cảnh và lý do chọn đề tài, mục tiêu tổng quát và cụ thể (5 nhóm), đối tượng và phạm vi nghiên cứu (5 nhóm người dùng, 13 module chức năng), phương pháp thực hiện theo quy trình 6 giai đoạn, ý nghĩa thực tiễn trên các mặt kinh tế - xã hội - giáo dục, các điểm mới và đóng góp của đề tài.

- **Chương 2 — Cơ sở lý thuyết và công nghệ sử dụng:** Trình bày nền tảng lý thuyết về kỳ thi IELTS (cấu trúc 4 kỹ năng, thang điểm, band descriptors), hệ thống đào tạo trực tuyến (LMS), các công nghệ AI ứng dụng trong giáo dục (NLP, STT, TTS, LLM, RAG), cùng tổng quan chi tiết các công nghệ được sử dụng: Spring Boot, React, MySQL, FastAPI microservices và các công cụ phát triển.

- **Chương 3 — Phân tích và thiết kế hệ thống:** Trình bày kết quả khảo sát hiện trạng, phân tích yêu cầu chức năng (52 chức năng, 13 module) và phi chức năng, mô hình hóa hệ thống qua biểu đồ UML (Use Case, Sequence), làm rõ các quyết định thiết kế như mô hình đề thi 5 cấp, version hóa bằng snapshot, guest flow và phân quyền nhiều lớp, cùng với thiết kế cơ sở dữ liệu, kiến trúc 4 tầng, API và bảo mật.

- **Chương 4 — Xây dựng và triển khai hệ thống:** Trình bày quá trình hiện thực hệ thống theo các luồng kỹ thuật tiêu biểu, bao gồm: xác thực nhiều vai trò, Test Builder 5 cấp với version hóa đề, làm bài 4 kỹ năng với auto-save và resume, chấm Writing theo mô hình human-in-the-loop, Speaking với STT và scoring, AI Import 3 lớp, AI Agent hỗ trợ vận hành, Assignment, Guest Exam và File Upload.

- **Chương 5 — Kiểm thử và đánh giá:** Trình bày kết quả kiểm thử với 96 kịch bản qua 14 nhóm chức năng, trong đó 93 ca đạt và 3 ca chưa đạt, tương ứng tỷ lệ 96,9%. Chương đồng thời đánh giá theo ba lớp: chức năng, tích hợp và giới hạn kỹ thuật, từ đó rút ra ưu điểm, hạn chế và hướng phát triển của hệ thống.

- **Kết luận:** Tổng kết những kết quả đạt được và hướng phát triển trong tương lai của hệ thống.

Ngoài ra, khóa luận còn có các phần phụ lục: Phụ lục A — Cấu trúc cơ sở dữ liệu chi tiết (37 bảng), Phụ lục B — Hình ảnh giao diện hệ thống, Danh mục bảng và hình, Danh mục ký hiệu và cụm từ viết tắt, Danh mục tài liệu tham khảo.

### 1.8. Tổng quan về hệ thống DAVictory IELTS

Hệ thống DAVictory IELTS là một nền tảng web hoàn chỉnh hỗ trợ luyện thi IELTS, được xây dựng theo kiến trúc 4 tầng, vận hành trên 8 service độc lập được quản lý tập trung bởi công cụ manage.sh. Về quy mô, hệ thống có các chỉ số kỹ thuật chính sau:

- **Backend (Spring Boot 4.0.3, Java 21):** 270 file Java, bao gồm 31 controller, 25 service, 71 entity, 71 repository, 72 DTO. Service lớn nhất là `ExamAttemptService` xử lý luồng làm bài thi với auto-save, timeout và resume.
- **Frontend (React 19.2.0, Vite 8.0):** 62 trang JSX, 12 service file API, 27 common components, 11 question renderers, 27 test builder blocks, 8 custom hooks, 13 utility modules và hệ route phân vai cho `Student`, `Teacher`, `Manager`, `Admin` cùng guest share link.
- **AI Microservices (Python FastAPI):** 4 service độc lập với tổng cộng 102 file Python. AI Writing service có 24 file, AI Speaking service 23 file, AI Import service 16 file và AI Agent service 39 file.
- **Dữ liệu:** MySQL 8 với 71 entity JPA (tương ứng 81 bảng vật lý), 37 bảng đã có dữ liệu thực tế bao gồm 1.249 câu hỏi, 643 bài viết mẫu, 305 lượt thi. ChromaDB cho vector search trong RAG. Redis cho cache và message queue.
- **Bảo mật:** JWT HMAC-SHA256 với access token 24 giờ và refresh token 7 ngày, BCrypt mã hóa mật khẩu, phân quyền 5 cấp (Guest < Student < Teacher < Manager < Admin), CORS động, soft delete.
- **LLM:** Ba nhà cung cấp (Groq qwen3-32b làm chính, NVIDIA nemotron-70b làm fallback, OpenAI GPT-4o cho Speaking) với key rotation tự động.

Hệ thống đã vượt qua kiểm thử với 93 trên 96 kịch bản (tỷ lệ đạt 96,9%). Kết quả này cho thấy các luồng nghiệp vụ chính đã vận hành ổn định, dù nhóm xử lý lỗi và ngoại lệ vẫn còn cần tiếp tục hoàn thiện trước khi triển khai ở quy mô lớn.

### Tóm tắt chương 1

Chương 1 đã trình bày tổng quan về đề tài "Xây dựng hệ thống website hỗ trợ luyện thi IELTS cho Trung tâm Ngoại ngữ - Tin học Victory". Nội dung bao gồm: bối cảnh thị trường EdTech Việt Nam và nhu cầu luyện thi IELTS, các khó khăn chính của trung tâm Victory trong quy trình hiện tại, so sánh với các nền tảng luyện thi IELTS hiện có, năm nhóm mục tiêu cụ thể, đối tượng và phạm vi nghiên cứu, phương pháp thực hiện theo Agile/Scrum, ý nghĩa thực tiễn và những điểm mới của đề tài. Về mặt kỹ thuật, chương đã giới thiệu hệ thống như một nền tảng 4 tầng gồm frontend React, backend Spring Boot, các AI microservices và lớp dữ liệu MySQL/ChromaDB/Redis; đồng thời nêu bật các đặc trưng nổi bật như Test Builder 5 cấp, guest share link, AI Import, AI chấm Writing/Speaking và mô hình human-in-the-loop. Đây là cơ sở để triển khai phần cơ sở lý thuyết và công nghệ ở chương tiếp theo.
