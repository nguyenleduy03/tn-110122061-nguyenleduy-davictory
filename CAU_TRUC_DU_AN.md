# CẤU TRÚC DỰ ÁN DAVICTORY

> **Dự án:** Hệ thống thi thử IELTS Online cho Trung tâm Ngoại ngữ - Tin học Victory
> **Tác giả:** Huỳnh Quốc Kiệt (MSSV: 110122100, Đại học Trà Vinh, 2022-2026)

---

## 1. TỔNG QUAN KIẾN TRÚC

DAVictory là hệ thống **monorepo** gồm 4 service chạy độc lập:

```
┌─────────────────────────────────────────────────────────────┐
│                       DAVictory                              │
├───────────────┬───────────────┬───────────────┬─────────────┤
│   frontend    │   backend     │  ai-writing   │ ai-speaking │
│   React 19    │ Spring Boot   │ Spring Boot   │ Spring Boot │
│   Port 5173   │  Port 8080    │  Port 5180    │  Port 5181  │
│   (Vite 8)    │  (Java 21)    │  (Java 21)    │  (Java 21)  │
└───────┬───────┴───────┬───────┴───────┬───────┴──────┬──────┘
        │               │               │              │
        ▼               ▼               ▼              ▼
   ┌────────┐    ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ Browser│    │  MySQL 8 │   │ Groq API │   │ Groq API │
   │  User  │    │ DAVictory│   │  (LLM)   │   │  (LLM)   │
   └────────┘    └──────────┘   └──────────┘   └──────────┘
```

### Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| **Frontend** | React 19, Vite 8, React Router 7, Axios, Framer Motion, TipTap, Quill, dnd-kit, Lucide React |
| **Backend** | Spring Boot 4.0.3, Spring Security, Spring Data JPA, JWT |
| **Database** | MySQL 8 |
| **AI** | Spring AI 1.0.0-M6, Groq (LLM), ONNX Runtime (embeddings), RAG pipeline |
| **Tích hợp** | Google Drive API, Google OAuth2 |
| **Build** | Maven (backend), npm/Vite (frontend) |

---

## 2. CÂY THƯ MỤC CHI TIẾT

```
DAVictory/
│
├── 📄 README.md                          # Giới thiệu dự án
├── 📄 CAU_TRUC_DU_AN.md                  # File này - tài liệu cấu trúc dự án
├── 📄 DE_CUONG_CHI_TIET.md               # Đề cương chi tiết đồ án
├── 📄 KE_HOACH_TICH_HOP_AI.md            # Kế hoạch tích hợp AI
│
├── 🔧 start.sh                           # Script khởi động tất cả service
├── 🔧 stop.sh                            # Script dừng tất cả service
├── 🔧 manage.sh                          # Menu quản lý service tương tác
├── 🔧 davictory.service                  # systemd service file
├── 🔧 install-service.sh                 # Cài đặt systemd service
│
├── 📂 backend/                           # ⬅️ BACKEND - Spring Boot (Port 8080)
├── 📂 frontend/                          # ⬅️ FRONTEND - React (Port 5173)
├── 📂 ai-writing-service/                # ⬅️ AI WRITING - Chấm điểm Writing (Port 5180)
├── 📂 ai-speaking-service/               # ⬅️ AI SPEAKING - Đánh giá Speaking (Port 5181)
├── 📂 baocao/                            # Báo cáo, tài liệu, sơ đồ
├── 📂 agent/                             # Hướng dẫn coding cho AI agent
├── 📂 .github/                           # GitHub hooks/scripts
└── 📂 .run/                              # File PID và log khi chạy service
```

---

## 3. BACKEND (`backend/`) — Core Spring Boot Application

Cung cấp toàn bộ REST API cho hệ thống: xác thực, quản lý bài thi, làm bài, lớp học, Google Drive.

```
backend/src/main/java/com/victory/DAVictory/
│
├── 📄 DaVictoryApplication.java          # Entry point chính
│
├── 📂 config/                            # Cấu hình hệ thống (6 file)
│   ├── CorsConfig.java                   # Cấu hình CORS
│   ├── SecurityConfig.java               # Cấu hình Spring Security + JWT
│   ├── SwaggerConfig.java                # Cấu hình API docs (SpringDoc)
│   ├── DataInitializer.java              # Khởi tạo dữ liệu mặc định
│   ├── PublicIpService.java              # Lấy IP public của server
│   └── TestStructureInitializer.java     # Khởi tạo cấu trúc bài thi IELTS
│
├── 📂 controller/                        # REST API Controllers (24 file)
│   ├── AuthController.java               # Đăng nhập / Đăng ký
│   ├── UserController.java               # Quản lý người dùng
│   ├── UserImportController.java         # Import user từ Excel
│   ├── TestBuilderController.java        # Xây dựng đề thi kéo-thả
│   ├── TestController.java               # Lấy bài thi cho thí sinh
│   ├── TestPartController.java           # Quản lý phần thi
│   ├── TestSessionController.java        # Quản lý session bài thi
│   ├── TestStructureController.java      # Quản lý cấu trúc bài thi
│   ├── TestShareLinkController.java      # Chia sẻ link đề thi
│   ├── ExamAttemptController.java        # Quản lý lượt làm bài
│   ├── FullTestProgressController.java   # Tiến trình làm bài full test
│   ├── QuestionGroupController.java      # Quản lý nhóm câu hỏi
│   ├── WritingController.java            # Bài viết Writing của thí sinh
│   ├── WritingCriteriaController.java    # Tiêu chí chấm Writing
│   ├── SpeakingController.java           # Bài nói Speaking
│   ├── AssignmentController.java         # Bài tập về nhà
│   ├── ClassManagementController.java    # Quản lý lớp học
│   ├── FileUploadController.java         # Upload file
│   ├── AdminDriveController.java         # Quản lý Google Drive
│   ├── GoogleDriveAuthController.java   # Xác thực OAuth Google Drive
│   ├── GuestExamController.java          # Cho phép thi thử không cần đăng nhập
│   ├── StudentWritingController.java     # Bài viết của học viên
│   └── SubmissionBridgeController.java   # Cầu nối nộp bài
│
├── 📂 service/                           # Business Logic (21 file)
│   ├── UserService.java                  # Logic người dùng
│   ├── RoleService.java                  # Logic phân quyền
│   ├── TestBuilderService.java           # Logic xây dựng đề thi
│   ├── TestManagementService.java        # Logic quản lý đề thi
│   ├── TestStructureService.java         # Logic cấu trúc bài thi
│   ├── TestShareLinkService.java         # Logic chia sẻ link
│   ├── ExamAttemptService.java           # Logic lượt làm bài
│   ├── FullTestProgressService.java      # Logic tiến trình thi
│   ├── QuestionBankService.java          # Logic ngân hàng câu hỏi
│   ├── WritingService.java               # Logic chấm Writing
│   ├── SpeakingService.java              # Logic chấm Speaking
│   ├── AssignmentService.java            # Logic bài tập
│   ├── AssignmentServiceExtension.java   # Mở rộng bài tập
│   ├── MediaService.java                 # Logic media (audio, ảnh)
│   ├── FileUploadService.java            # Logic upload file
│   ├── GuestExamService.java             # Logic thi thử
│   ├── GoogleDriveOAuth2Service.java     # Logic OAuth Google
│   ├── DriveAssetRenameService.java      # Logic đổi tên file Drive
│   ├── AIBridgeService.java              # Cầu nối gọi AI Writing Service
│   └── AISpeakingBridgeService.java      # Cầu nối gọi AI Speaking Service
│
├── 📂 dto/                               # Data Transfer Objects (54 file)
├── 📂 entity/                            # JPA Entities (60 file)
├── 📂 repository/                        # JPA Repositories (60 file)
├── 📂 security/                          # Bảo mật (3 file)
│   ├── JwtUtil.java                      # Utility tạo/verify JWT
│   ├── JwtAuthenticationFilter.java      # Filter kiểm tra JWT mỗi request
│   └── CustomUserDetailsService.java     # Load user từ DB cho Spring Security
│
├── 📂 enums/                             # Enum types (5 file)
│   ├── MediaType.java                    # Loại media (audio, ảnh, video)
│   ├── QuestionTypeEnum.java             # Loại câu hỏi (trắc nghiệm, TFNG,...)
│   ├── SkillType.java                    # Kỹ năng IELTS (L/R/W/S)
│   ├── TestStatus.java                   # Trạng thái bài thi
│   └── TestType.java                     # Loại bài thi (full test/mini test)
│
├── 📂 exception/                         # Custom exceptions (1 file)
├── 📂 specification/                     # JPA Criteria Specifications (1 file)
│
└── src/main/resources/
    └── application.yaml                  # Config DB, JWT, Google Drive, Swagger
```

### Vai trò người dùng (RBAC)
| Role | Quyền hạn |
|------|-----------|
| **Student** | Thi thử, làm bài tập, xem kết quả, tham gia lớp học |
| **Teacher** | Tạo đề thi, giao bài tập, chấm bài, quản lý lớp |
| **Manager** | Quản lý toàn bộ trung tâm, báo cáo thống kê |
| **Admin** | Quản lý hệ thống, người dùng, Google Drive |

---

## 4. FRONTEND (`frontend/`) — React SPA

```
frontend/src/
│
├── 📄 main.jsx                           # Entry point React
├── 📄 App.jsx                            # Root component + React Router (186 dòng)
│
├── 📂 config/
│   └── api.js                            # Base URL API config
│
├── 📂 services/                          # API Service modules (8 file)
│   ├── authApi.js                        # API xác thực (login, register)
│   ├── ieltsApi.js                       # API lấy bài thi, nộp bài
│   ├── testBuilderApi.js                 # API xây dựng đề thi
│   ├── teacherApi.js                     # API cho giáo viên
│   ├── assignmentApi.js                  # API bài tập
│   ├── classApi.js                       # API lớp học
│   ├── fileApi.js                        # API upload file
│   └── aiApi.js                          # API gọi AI chấm điểm
│
├── 📂 pages/                             # Page components (37 file)
│   ├── 🏠 HomePage.jsx                   # Trang chủ
│   ├── 🔑 Login.jsx, Register.jsx        # Đăng nhập / Đăng ký
│   ├── 📚 ExamLibrary.jsx                # Thư viện đề thi
│   ├── ✅ TestComplete.jsx               # Kết quả bài thi
│   ├── 🔨 TestBuilder.jsx, TestBuilderV2.jsx  # Công cụ tạo đề
│   ├── 🎧 IeltsListeningTest.jsx         # Giao diện thi Listening
│   ├── 📖 IeltsReadingTest.jsx           # Giao diện thi Reading
│   ├── ✍️  IeltsWritingTest.jsx          # Giao diện thi Writing
│   ├── 🎙️  IeltsSpeakingTest.jsx         # Giao diện thi Speaking
│   ├── 📊 AdminDashboard.jsx             # Dashboard Admin
│   ├── 👥 AdminUsers.jsx                 # Quản lý users (Admin)
│   ├── 📈 ManagerDashboard.jsx           # Dashboard Manager
│   ├── 🏫 ManagerClasses.jsx             # Quản lý lớp (Manager)
│   ├── 🏫 ClassManagement.jsx            # Giao diện lớp học
│   ├── 🤖 AITestCenter.jsx               # Trung tâm chấm AI
│   ├── 🔗 ShareLinkStatusPage.jsx        # Trạng thái link chia sẻ
│   ├── 👨‍🏫 TeacherManage.jsx             # Quản lý giáo viên
│   ├── 📋 TeacherTests.jsx               # Bài thi của giáo viên
│   ├── 👤 MyDashboard.jsx                # Dashboard cá nhân
│   ├── 📜 DashboardHistory.jsx           # Lịch sử làm bài
│   ├── ⚙️  DashboardSettings.jsx         # Cài đặt cá nhân
│   ├── 📊 ManagerReports.jsx             # Báo cáo thống kê
│   ├── 🧪 TestApiPage.jsx                # Test API page
│   ├── 🐛 ApiDebugPage.jsx               # Debug API
│   ├── 🐛 DebugAssignments.jsx           # Debug bài tập
│   │
│   ├── 📂 teacher/                       # Trang dành cho giáo viên (4 file)
│   │   ├── CreateAssignment.jsx          # Tạo bài tập mới
│   │   ├── AssignmentTemplates.jsx       # Mẫu bài tập
│   │   ├── GradeWriting.jsx              # Chấm Writing thủ công
│   │   └── GradeSpeaking.jsx             # Chấm Speaking thủ công
│   │
│   ├── 📂 student/                       # Trang dành cho học viên (4 file)
│   │   ├── StudentLms.jsx                # LMS dành cho học viên
│   │   ├── AssignmentDetail.jsx          # Chi tiết bài tập
│   │   ├── SubmitAssignment.jsx          # Nộp bài tập
│   │   └── AssignmentResult.jsx          # Kết quả bài tập
│   │
│   └── 📂 lms/                           # Quản lý học tập LMS (11 file)
│       ├── LmsTeacherDashboard.jsx       # Dashboard LMS giáo viên
│       ├── LmsTeacherClasses.jsx         # Lớp học
│       ├── LmsTeacherClassDetail.jsx     # Chi tiết lớp
│       ├── LmsTeacherTests.jsx           # Bài kiểm tra
│       ├── LmsTeacherAssignments.jsx     # Bài tập
│       ├── LmsAssignmentDetail.jsx       # Chi tiết bài tập
│       ├── LmsTeacherSubmissions.jsx     # Bài đã nộp
│       ├── LmsSubmissionDetail.jsx       # Chi tiết bài nộp
│       ├── LmsGradeSubmission.jsx        # Chấm bài
│       ├── LmsTeacherAnalytics.jsx       # Phân tích
│       └── LmsTeacherSettings.jsx        # Cài đặt
│
├── 📂 components/                        # Components tái sử dụng
│   ├── 📂 common/                        # Chung (29 components)
│   │   ├── ProtectedRoute.jsx            # Bảo vệ route theo role
│   │   ├── LoadingSpinner.jsx            # Loading indicator
│   │   ├── QuillEditor.jsx               # Rich text editor (Quill)
│   │   ├── FileUploader.jsx              # Component upload file
│   │   ├── TextHighlighter.jsx           # Highlight văn bản
│   │   ├── ErrorBoundary.jsx             # Bắt lỗi React
│   │   └── ...
│   ├── 📂 admin/                         # Admin components
│   ├── 📂 ai/                            # AI components (AIGradingPanel, AIInsightsCard)
│   ├── 📂 assignment/                    # Assignment components
│   ├── 📂 layout/                        # Layout (DashboardLayout, Navbar)
│   ├── 📂 lms/                           # LMS layout
│   ├── 📂 manager/                       # Manager layout
│   ├── 📂 question/                      # Hiển thị câu hỏi (11 loại)
│   │   ├── MultipleChoiceQuestion.jsx    # Trắc nghiệm
│   │   ├── TFNGQuestion.jsx              # True/False/Not Given
│   │   ├── FillInBlankQuestion.jsx       # Điền vào chỗ trống
│   │   ├── ShortAnswerQuestion.jsx       # Trả lời ngắn
│   │   ├── DragDropQuestion.jsx          # Kéo thả
│   │   └── ...
│   ├── 📂 shuffle/                       # Xáo trộn câu hỏi
│   ├── 📂 teacher/                       # Teacher components
│   └── 📂 testBuilder/                   # Test builder components (11 file)
│       └── 📂 blocks/                    # Các block câu hỏi khi tạo đề (24 file)
│           ├── AudioBlock.jsx            # Block audio cho Listening
│           ├── ImageBlock.jsx            # Block ảnh
│           ├── PassageBlock.jsx          # Block đoạn văn cho Reading
│           ├── MultipleChoiceBlock.jsx   # Block trắc nghiệm
│           ├── TFNGBlock.jsx             # Block True/False/Not Given
│           ├── ShortAnswerBlock.jsx      # Block trả lời ngắn
│           ├── DragMatchingBlock.jsx     # Block kéo thả
│           ├── SummaryCompletionBlock.jsx # Block điền từ vào đoạn văn
│           ├── WritingTaskBlock.jsx      # Block Writing Task 1/2
│           ├── SpeakingPart1Block.jsx    # Block Speaking Part 1
│           ├── SpeakingPart2Block.jsx    # Block Speaking Part 2
│           ├── SpeakingPart3Block.jsx    # Block Speaking Part 3
│           ├── SpeakingCueCardBlock.jsx  # Block Cue Card
│           └── 📂 shared/               # Helper dùng chung
│
├── 📂 hooks/                             # Custom React Hooks (8 file)
├── 📂 utils/                             # Utility functions (13 file)
│   ├── ieltsScoring.js                   # Tính điểm IELTS
│   ├── fullTestProgress.js              # Lưu/khôi phục tiến trình
│   ├── passageRenderer.js                # Render đoạn văn
│   ├── questionLabelUtils.js             # Label câu hỏi
│   ├── mediaUrl.js                       # Xử lý URL media
│   └── ...
│
├── 📂 styles/                            # CSS files (15 file)
├── 📂 data/                              # Mock data (4 file)
│
└── 📁 public/                            # Static assets
    └── brand/                            # Logo IELTS, Cambridge
```

### Flow làm bài thi IELTS
```
Người dùng → Chọn bài thi → Bắt đầu session
    → Làm từng Part (1-4) → Nộp bài
    → Backend chấm tự động (Listening/Reading)
    → AI chấm (Writing/Speaking)
    → Hiển thị kết quả + band điểm
```

---

## 5. AI WRITING SERVICE (`ai-writing-service/`) — Chấm điểm Writing

Service độc lập chấm bài viết IELTS Writing Task 1 & 2 bằng AI.

```
ai-writing-service/src/main/java/com/victory/aiwriting/
│
├── 📄 AiWritingApplication.java          # Entry point
│
├── 📂 config/                            # Cấu hình AI, Vector Store
│   ├── AIConfigProperties.java           # Properties cho AI provider
│   ├── AIProviderConfig.java             # Cấu hình AI provider (Groq)
│   └── VectorStoreConfig.java            # Cấu hình vector store (ONNX)
│
├── 📂 controller/                        # REST API
│   ├── AIGradingController.java          # API chấm bài viết
│   ├── AIAdminController.java            # API quản trị AI
│   ├── AIEvaluationController.java       # API đánh giá
│   └── AIExceptionHandler.java           # Xử lý lỗi
│
├── 📂 application/                       # Tầng ứng dụng
│   ├── AIGradingOrchestrator.java        # Điều phối chấm điểm chính
│   ├── AIBatchGradingService.java        # Chấm hàng loạt
│   └── 📂 dto/                           # 5 DTOs request/response
│
├── 📂 domain/                            # Tầng domain (hexagonal architecture)
│   ├── 📂 model/                         # Domain models (14 file)
│   │   ├── AIGradingResult.java          # Kết quả chấm
│   │   ├── CriteriaScore.java            # Điểm theo tiêu chí
│   │   ├── WritingRubric.java            # Thang điểm IELTS Writing
│   │   ├── RubricBand.java               # Band descriptor
│   │   ├── PromptContext.java            # Context prompt
│   │   ├── SampleEssay.java              # Bài mẫu
│   │   └── GradingConfidence.java        # Độ tin cậy của điểm
│   ├── 📂 port/                          # Port interfaces (3 file)
│   │   ├── AIProvider.java               # Interface gọi LLM
│   │   ├── EmbeddingService.java         # Interface embeddings
│   │   └── VectorStorePort.java          # Interface vector store
│   └── 📂 service/                       # Domain services (8 file)
│       ├── PromptBuilder.java            # Xây dựng prompt
│       ├── SampleRetriever.java          # Truy xuất bài mẫu (RAG)
│       ├── GradeCalculator.java          # Tính điểm
│       ├── ResponseParser.java           # Parse output từ LLM
│       ├── RubricLoader.java             # Load thang điểm
│       ├── SampleEssayIndexer.java       # Index bài mẫu vào vector
│       ├── AdvancedReranker.java         # Xếp hạng lại kết quả
│       └── EssayFeatureAnalyzer.java    # Phân tích đặc trưng bài viết
│
├── 📂 infrastructure/                    # Tầng cơ sở hạ tầng
│   ├── cache/AICacheService.java         # Cache kết quả (Caffeine)
│   ├── embedding/TransformersEmbeddingAdapter.java  # ONNX Embeddings
│   ├── provider/                         # AI Providers
│   │   ├── DynamicAIProvider.java        # Provider động
│   │   ├── OpenAIChatProvider.java       # Groq provider
│   │   └── RotatingKeyProvider.java      # Xoay vòng API key
│   ├── quota/AIQuotaService.java         # Quản lý quota
│   ├── persistence/                      # Lưu trữ kết quả (5 file)
│   └── vector/                           # Vector store (all-mpnet-base-v2)
│
├── 📂 seed/                              # Seed dữ liệu
│   ├── WritingRubricSeeder.java          # Seed thang điểm IELTS
│   └── SampleEmbeddingSeeder.java        # Seed embeddings bài mẫu
│
├── 📂 exception/                         # Custom exceptions (4 file)
│
├── 📂 vue-ui/                            # Giao diện admin Vue.js
│   └── src/
│       ├── 📂 views/                     # Dashboard, Grading, History...
│       └── 📂 components/               # Sidebar, StatsCard, CriteriaCard...
│
├── 📁 scripts/
│   └── scrape_writing9.py               # Scrape bài mẫu IELTS từ web
│
└── src/main/resources/
    ├── application.yaml                  # Cấu hình AI, Groq, ONNX, Vector
    └── ai/prompt/templates/
        ├── system_role.txt               # Prompt hệ thống cho LLM
        └── output_schema.json            # Schema output JSON
```

### Cách hoạt động (RAG Pipeline)
```
1. Nhận bài viết của thí sinh
2. Tokenize → Embedding (ONNX all-mpnet-base-v2)
3. Tìm kiếm bài mẫu tương đồng từ vector store (500 bài)
4. Xây dựng prompt với thang điểm IELTS + bài mẫu + bài thí sinh
5. Gửi prompt đến Groq LLM → Nhận điểm theo 4 tiêu chí:
   - Task Achievement / Task Response
   - Coherence & Cohesion
   - Lexical Resource
   - Grammatical Range & Accuracy
6. Cache kết quả → Trả về frontend
```

---

## 6. AI SPEAKING SERVICE (`ai-speaking-service/`) — Đánh giá Speaking

Service độc lập đánh giá bài nói IELTS Speaking.

```
ai-speaking-service/src/main/java/com/victory/aispeaking/
│
├── 📄 AiSpeakingApplication.java         # Entry point
│
├── 📂 config/                            # Cấu hình AI
│   ├── AIConfigProperties.java
│   ├── AIProviderConfig.java
│   └── ProviderConfig.java
│
├── 📂 controller/                        # REST API
│   ├── SpeakingScoringController.java    # API chấm Speaking
│   ├── SpeakingSessionController.java    # API session nói
│   ├── SpeakingAdminController.java      # API quản trị
│   └── SpeakingExceptionHandler.java     # Xử lý lỗi
│
├── 📂 application/
│   ├── SpeakingOrchestrator.java         # Điều phối chấm nói
│   └── 📂 dto/
│
├── 📂 domain/                            # Domain models & services
│   ├── 📂 model/
│   ├── 📂 port/
│   └── 📂 service/
│
├── 📂 infrastructure/                    # Cache, persistence, provider, quota
│
└── src/main/resources/ai/prompt/templates/
    ├── system_role.txt
    ├── output_schema.json
    ├── scoring_comprehensive.txt         # Chấm tổng hợp
    ├── scoring_fluency.txt               # Chấm độ trôi chảy
    ├── scoring_grammar.txt               # Chấm ngữ pháp
    ├── scoring_lexical.txt               # Chấm từ vựng
    └── scoring_pronunciation.txt         # Chấm phát âm
```

### Cách hoạt động
```
1. Nhận transcript bài nói (text) hoặc audio
2. Đánh giá 4 tiêu chí IELTS Speaking:
   - Fluency & Coherence (Độ trôi chảy)
   - Lexical Resource (Từ vựng)
   - Grammatical Range & Accuracy (Ngữ pháp)
   - Pronunciation (Phát âm)
3. Gửi Groq LLM → Nhận band điểm từng phần + nhận xét
4. Trả kết quả về backend → frontend
```

---

## 7. DATABASE (MySQL `DAVictory`)

Các bảng chính:
| Nhóm | Entity | Mô tả |
|------|--------|-------|
| **User** | User, Role, UserRole | Người dùng, vai trò, phân quyền |
| **Test** | Test, TestSession, TestPart, TestStructure | Bài thi, session, phần thi, cấu trúc |
| **Question** | QuestionGroup, Question, QuestionOption | Nhóm câu hỏi, câu hỏi, đáp án |
| **Media** | Media | File audio, ảnh cho đề thi |
| **Exam** | ExamAttempt, ExamAnswer, FullTestProgress | Lượt thi, câu trả lời, tiến trình |
| **Writing** | WritingAnswer, WritingCriteria, WritingScore | Bài viết, tiêu chí, điểm |
| **Speaking** | SpeakingAnswer, SpeakingCriteria, SpeakingScore | Bài nói, tiêu chí, điểm |
| **Class** | Class, ClassMember, Assignment, Submission | Lớp học, thành viên, bài tập, nộp bài |
| **Share** | TestShareLink | Link chia sẻ đề thi |
| **Google** | DriveCredential | Thông tin xác thực Google Drive |

---

## 8. CÁCH CHẠY DỰ ÁN

### Chạy toàn bộ
```bash
./start.sh                          # Khởi động backend + frontend
```

### Chạy riêng từng service
```bash
# Backend
cd backend && ./mvnw spring-boot:run

# Frontend
cd frontend && npm run dev

# AI Writing Service
cd ai-writing-service && ./mvnw spring-boot:run

# AI Speaking Service
cd ai-speaking-service && ./mvnw spring-boot:run
```

### Quản lý service
```bash
./manage.sh                         # Menu tương tác (start/stop/restart/logs)
```

---

## 9. CÁC FILE HỖ TRỢ KHÁC

| File | Chức năng |
|------|-----------|
| `start.sh` / `stop.sh` | Script quản lý vòng đời service |
| `manage.sh` | Menu quản lý tương tác (287 dòng) |
| `davictory.service` | systemd unit, tự động chạy khi boot server |
| `check_api_error.sh` | Kiểm tra lỗi API |
| `performance-check.sh` | Theo dõi hiệu năng |
| `vite.config.optimized.js` | Cấu hình Vite tối ưu cho production |
| `application-optimized.yaml` | Cấu hình backend tối ưu |
| `DE_CUONG_CHI_TIET.md` | Đề cương chi tiết đồ án (893 dòng) |
| `KE_HOACH_TICH_HOP_AI.md` | Kế hoạch tích hợp AI (488 dòng) |

---

## 10. TỔNG KẾT

DAVictory là hệ thống thi thử IELTS online hoàn chỉnh với:
- **4 vai trò người dùng**: Student, Teacher, Manager, Admin
- **4 kỹ năng IELTS**: Listening, Reading, Writing, Speaking
- **20+ loại câu hỏi**: Trắc nghiệm, TFNG, Short Answer, Summary Completion, Drag-Drop, v.v.
- **AI chấm Writing & Speaking**: Sử dụng RAG + Groq LLM + ONNX Embeddings
- **Quản lý lớp học LMS**: Giao bài tập, nộp bài, chấm bài, thống kê
- **Google Drive**: Lưu trữ media cho đề thi
- **Kiến trúc**: Monorepo, Microservices, Hexagonal Architecture (AI services)
