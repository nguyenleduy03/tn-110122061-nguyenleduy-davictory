# TÀI LIỆU KỸ THUẬT - HỆ THỐNG THI IELTS TRỰC TUYẾN DAVICTORY

## 1. TỔNG QUAN HỆ THỐNG

### 1.1. Giới thiệu
DAVictory là hệ thống thi IELTS trực tuyến được phát triển cho Trung tâm Ngoại ngữ - Tin học Victory, Đại học Trà Vinh. Hệ thống hỗ trợ đầy đủ 4 kỹ năng IELTS: Listening, Reading, Writing, Speaking.

### 1.2. Kiến trúc hệ thống
- **Kiến trúc**: Client-Server (3-tier architecture)
- **Backend**: Spring Boot 4.0.3 (Java 21)
- **Frontend**: React 19.2.0 + Vite 8.0
- **Database**: MySQL 8.0
- **Authentication**: JWT (JSON Web Token)
- **File Storage**: Google Drive API

### 1.3. Các tính năng chính
1. **Quản lý người dùng**: Đăng ký, đăng nhập, phân quyền (Student, Teacher, Admin)
2. **Test Builder**: Tạo đề thi với cấu trúc phân cấp phức tạp
3. **Exam Attempt**: Làm bài thi trực tuyến với auto-save
4. **Auto Grading**: Chấm điểm tự động cho Listening và Reading
5. **Manual Grading**: Chấm bài Writing và Speaking bởi giáo viên
6. **Class Management**: Quản lý lớp học và học viên
7. **Assignment**: Giao bài tập và theo dõi tiến độ
8. **Statistics**: Thống kê và báo cáo chi tiết
9. **Guest Exam**: Cho phép khách làm bài thi thử

## 2. CẤU TRÚC DỰ ÁN

### 2.1. Backend Structure
```
backend/
├── src/main/java/com/victory/DAVictory/
│   ├── controller/          # REST API Controllers
│   │   ├── AuthController.java
│   │   ├── TestBuilderController.java
│   │   ├── ExamAttemptController.java
│   │   ├── WritingController.java
│   │   ├── ClassManagementController.java
│   │   └── AssignmentController.java
│   ├── service/             # Business Logic Layer
│   │   ├── UserService.java
│   │   ├── TestBuilderService.java
│   │   ├── ExamAttemptService.java
│   │   ├── WritingService.java
│   │   └── AssignmentService.java
│   ├── repository/          # Data Access Layer (JPA)
│   │   ├── UserRepository.java
│   │   ├── TestRepository.java
│   │   ├── QuestionRepository.java
│   │   └── ExamAttemptRepository.java
│   ├── entity/              # JPA Entities
│   │   ├── User.java
│   │   ├── Test.java
│   │   ├── Question.java
│   │   ├── ExamAttempt.java
│   │   └── Class.java
│   ├── dto/                 # Data Transfer Objects
│   │   ├── TestSaveRequest.java
│   │   ├── ExamAttemptStartRequest.java
│   │   └── WritingGradeRequest.java
│   ├── security/            # Security Configuration
│   │   ├── JwtUtil.java
│   │   ├── JwtAuthenticationFilter.java
│   │   └── CustomUserDetailsService.java
│   ├── config/              # Application Configuration
│   │   ├── SecurityConfig.java
│   │   ├── CorsConfig.java
│   │   └── SwaggerConfig.java
│   └── enums/               # Enumerations
│       ├── TestStatus.java
│       ├── SkillType.java
│       └── QuestionTypeEnum.java
└── src/main/resources/
    ├── application.yaml     # Application properties
    └── db/migration/        # Database migrations
```

### 2.2. Frontend Structure
```
frontend/
├── src/
│   ├── components/          # Reusable UI Components
│   │   ├── TestCard.jsx
│   │   ├── QuestionItem.jsx
│   │   ├── Navigation.jsx
│   │   └── Timer.jsx
│   ├── pages/               # Page Components
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── TestBuilderPage.jsx
│   │   ├── ExamPage.jsx
│   │   ├── WritingGradingPage.jsx
│   │   └── ClassManagementPage.jsx
│   ├── services/            # API Services
│   │   ├── authService.js
│   │   ├── testService.js
│   │   ├── examService.js
│   │   └── classService.js
│   ├── hooks/               # Custom React Hooks
│   │   ├── useAuth.js
│   │   ├── useTimer.js
│   │   └── useAutoSave.js
│   ├── utils/               # Utility Functions
│   │   ├── bandScoreCalculator.js
│   │   ├── dateFormatter.js
│   │   └── validation.js
│   ├── config/              # Configuration
│   │   └── apiConfig.js
│   ├── styles/              # CSS Styles
│   │   └── global.css
│   └── App.jsx              # Main App Component
├── public/                  # Static Assets
│   ├── logo.png
│   └── index.html
├── package.json             # Dependencies
└── vite.config.js           # Vite Configuration
```

## 3. CƠ SỞ DỮ LIỆU

### 3.1. Sơ đồ ERD chính

#### Nhóm bảng User Management
- **user**: Thông tin người dùng
- **role**: Vai trò (STUDENT, TEACHER, ADMIN)
- **user_roles**: Liên kết User và Role (Many-to-Many)

#### Nhóm bảng Test Management
- **test**: Đề thi
- **session**: Phiên thi (Listening/Reading/Writing/Speaking)
- **test_session**: Liên kết Test và Session
- **part**: Phần thi (Part 1, Part 2, Part 3...)
- **test_part**: Liên kết TestSession và Part
- **question_group**: Nhóm câu hỏi (có passage/audio)
- **question**: Câu hỏi
- **question_type**: Loại câu hỏi
- **question_option**: Lựa chọn cho Multiple Choice
- **answer**: Đáp án cho Short Answer, Fill Blank
- **matching_pair**: Cặp ghép cho Matching

#### Nhóm bảng Exam Attempt
- **exam_attempt**: Lượt thi của học viên
- **attempt_answer**: Câu trả lời của học viên
- **student_writing_submission**: Bài Writing của học viên
- **writing_score**: Điểm Writing theo 4 tiêu chí

#### Nhóm bảng Class Management
- **class**: Lớp học
- **class_student**: Học viên trong lớp
- **class_teacher**: Giáo viên phụ trách lớp
- **assignment**: Bài tập được giao
- **assignment_submission**: Bài nộp của học viên

### 3.2. Các mối quan hệ quan trọng

```
User (1) ----< (N) ExamAttempt
Test (1) ----< (N) ExamAttempt
Test (1) ----< (N) TestSession ----< (N) TestPart ----< (N) QuestionGroup ----< (N) Question
Question (1) ----< (N) QuestionOption
Question (1) ----< (N) Answer
ExamAttempt (1) ----< (N) AttemptAnswer
Class (1) ----< (N) ClassStudent
Class (1) ----< (N) Assignment
Assignment (1) ----< (N) AssignmentSubmission
```

## 4. API ENDPOINTS

### 4.1. Authentication APIs
```
POST   /api/auth/register          # Đăng ký tài khoản
POST   /api/auth/login             # Đăng nhập
POST   /api/auth/logout            # Đăng xuất
GET    /api/auth/me                # Lấy thông tin user hiện tại
```

### 4.2. Test Builder APIs
```
POST   /api/test-builder/save      # Lưu đề thi mới
PUT    /api/test-builder/{id}      # Cập nhật đề thi
GET    /api/test-builder/{id}      # Lấy chi tiết đề thi
DELETE /api/test-builder/{id}      # Xóa đề thi
POST   /api/test-builder/{id}/publish  # Xuất bản đề thi
```

### 4.3. Exam Attempt APIs
```
POST   /api/exam-attempt/start     # Bắt đầu làm bài
PUT    /api/exam-attempt/{id}/save-progress  # Lưu tiến độ
POST   /api/exam-attempt/{id}/submit  # Nộp bài
GET    /api/exam-attempt/{id}/result  # Xem kết quả
GET    /api/exam-attempt/history    # Lịch sử thi
```

### 4.4. Writing APIs
```
GET    /api/writing/pending         # Danh sách bài chờ chấm
GET    /api/writing/submission/{id} # Chi tiết bài Writing
POST   /api/writing/grade           # Chấm điểm Writing
GET    /api/writing/history/{userId}  # Lịch sử chấm điểm
```

### 4.5. Class Management APIs
```
POST   /api/classes                 # Tạo lớp học
GET    /api/classes                 # Danh sách lớp học
GET    /api/classes/{id}            # Chi tiết lớp học
POST   /api/classes/{id}/students   # Thêm học viên
DELETE /api/classes/{id}/students/{studentId}  # Xóa học viên
GET    /api/classes/{id}/statistics  # Thống kê lớp học
```

### 4.6. Assignment APIs
```
POST   /api/assignments             # Tạo Assignment
GET    /api/assignments/my-assignments  # Assignment của học viên
POST   /api/assignments/{id}/start  # Bắt đầu làm Assignment
POST   /api/assignments/{id}/submit  # Nộp Assignment
GET    /api/assignments/{id}/submissions  # Danh sách bài nộp
POST   /api/assignments/{id}/grade  # Chấm điểm Assignment
```

### 4.7. Guest Exam APIs
```
GET    /api/guest-exam/available-tests  # Đề thi cho khách
POST   /api/guest-exam/start        # Bắt đầu thi thử
POST   /api/guest-exam/{id}/submit  # Nộp bài thi thử
```

## 5. LUỒNG DỮ LIỆU CHÍNH

### 5.1. Luồng đăng nhập
1. User nhập username, password
2. Frontend gửi POST /api/auth/login
3. Backend validate credentials
4. Backend generate JWT token
5. Frontend lưu token vào localStorage
6. Frontend redirect đến Dashboard

### 5.2. Luồng tạo đề thi
1. Teacher nhập thông tin đề thi
2. Teacher thêm Session, Part, Question Group, Question
3. Teacher upload file media lên Google Drive
4. Frontend gửi POST /api/test-builder/save với toàn bộ cấu trúc
5. Backend lưu tuần tự: Test → TestSession → TestPart → QuestionGroup → Question → Options/Answers
6. Backend trả về testId
7. Frontend hiển thị thông báo thành công

### 5.3. Luồng làm bài thi
1. Student chọn đề thi
2. Frontend gửi POST /api/exam-attempt/start
3. Backend tạo ExamAttempt và AttemptAnswer cho mỗi câu hỏi
4. Frontend hiển thị câu hỏi và bắt đầu timer
5. Mỗi 30s, Frontend auto-save tiến độ
6. Student click "Nộp bài"
7. Backend chấm điểm tự động (Listening/Reading)
8. Backend tính band score
9. Frontend hiển thị kết quả

### 5.4. Luồng chấm bài Writing
1. Teacher truy cập trang chấm bài
2. Frontend gửi GET /api/writing/pending
3. Backend trả về danh sách bài chờ chấm
4. Teacher chọn một bài và nhập điểm 4 tiêu chí
5. Frontend gửi POST /api/writing/grade
6. Backend tính band score trung bình
7. Backend lưu điểm và feedback
8. Frontend hiển thị thông báo thành công

## 6. BẢO MẬT

### 6.1. Authentication
- Sử dụng JWT (JSON Web Token) cho xác thực
- Token có thời gian sống 24 giờ
- Refresh token để gia hạn phiên làm việc

### 6.2. Authorization
- Role-Based Access Control (RBAC)
- 3 vai trò: STUDENT, TEACHER, ADMIN
- Mỗi API endpoint có kiểm tra quyền truy cập

### 6.3. Password Security
- Mật khẩu được hash bằng BCrypt
- Độ phức tạp: 10 rounds
- Không lưu plain text password

### 6.4. CORS Configuration
- Chỉ cho phép origin từ frontend domain
- Allowed methods: GET, POST, PUT, DELETE
- Allowed headers: Authorization, Content-Type

### 6.5. SQL Injection Prevention
- Sử dụng JPA Prepared Statements
- Không concatenate SQL string trực tiếp

## 7. HIỆU NĂNG

### 7.1. Database Optimization
- Index trên các cột thường xuyên query: user_id, test_id, class_id
- Pagination cho danh sách lớn
- Lazy loading cho các entity relationship

### 7.2. Caching
- Cache danh sách đề thi đã xuất bản
- Cache thông tin user sau khi đăng nhập
- Cache session structure để giảm query

### 7.3. Frontend Optimization
- Code splitting với React.lazy()
- Image optimization
- Minify và compress assets
- CDN cho static files

## 8. TESTING

### 8.1. Unit Testing
- JUnit 5 cho Backend
- Jest cho Frontend
- Coverage target: 70%

### 8.2. Integration Testing
- Spring Boot Test
- MockMvc cho API testing
- TestContainers cho database testing

### 8.3. E2E Testing
- Cypress cho frontend E2E
- Test các luồng chính: đăng nhập, làm bài thi, chấm điểm

## 9. DEPLOYMENT

### 9.1. Backend Deployment
```bash
# Build JAR file
mvn clean package

# Run application
java -jar target/davictory-backend.jar
```

### 9.2. Frontend Deployment
```bash
# Build production
npm run build

# Deploy to server
# Copy dist/ folder to web server
```

### 9.3. Database Migration
- Sử dụng Flyway hoặc Liquibase
- Version control cho database schema
- Rollback strategy

### 9.4. Environment Variables
```
# Backend
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/davictory
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=password
JWT_SECRET=your-secret-key
GOOGLE_DRIVE_CLIENT_ID=your-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret

# Frontend
VITE_API_URL=http://localhost:8080/api
```

## 10. MONITORING & LOGGING

### 10.1. Logging
- SLF4J + Logback
- Log levels: ERROR, WARN, INFO, DEBUG
- Log rotation: daily, max 30 days

### 10.2. Monitoring
- Spring Boot Actuator
- Health check endpoint: /actuator/health
- Metrics endpoint: /actuator/metrics

### 10.3. Error Tracking
- Sentry hoặc Rollbar
- Track exceptions và errors
- Alert khi có critical errors

## 11. HƯỚNG PHÁT TRIỂN TIẾP THEO

### 11.1. Tính năng mới
1. **AI Auto-grading cho Writing**: Sử dụng GPT-4 để chấm bài Writing tự động
2. **Speaking Recording**: Ghi âm và chấm điểm Speaking
3. **Mobile App**: Phát triển app iOS/Android
4. **Payment Integration**: Tích hợp VNPAY, MoMo
5. **Personalized Learning Path**: Đề xuất lộ trình học tập cá nhân hóa
6. **Live Class**: Tích hợp video call cho lớp học trực tuyến
7. **Gamification**: Thêm điểm thưởng, huy hiệu, bảng xếp hạng

### 11.2. Cải thiện hiệu năng
1. Redis caching cho session và test data
2. Elasticsearch cho full-text search
3. CDN cho media files
4. Load balancing cho high traffic

### 11.3. Cải thiện UX
1. Progressive Web App (PWA)
2. Offline mode
3. Dark mode
4. Multi-language support

## 12. TROUBLESHOOTING

### 12.1. Common Issues

**Issue 1: JWT Token expired**
- Solution: Implement refresh token mechanism
- Frontend tự động refresh token trước khi hết hạn

**Issue 2: CORS error**
- Solution: Kiểm tra CorsConfig.java
- Đảm bảo frontend origin được allow

**Issue 3: Database connection timeout**
- Solution: Tăng connection pool size
- Kiểm tra network connectivity

**Issue 4: File upload failed**
- Solution: Kiểm tra Google Drive API credentials
- Verify OAuth2 token chưa expired

**Issue 5: Auto-save không hoạt động**
- Solution: Kiểm tra network connection
- Verify localStorage không bị full

## 13. LIÊN HỆ VÀ HỖ TRỢ

### 13.1. Team
- **Developer**: Nguyễn Lê Duy
- **Supervisor**: Ths. Nguyễn Khắc Quốc
- **Technical Advisor**: Nhan Minh Phúc

### 13.2. Repository
- GitHub: [Link to repository]
- Documentation: [Link to docs]

### 13.3. Support
- Email: vifl@tvu.edu.vn
- Website: https://victory.tvu.edu.vn

---

**Phiên bản**: 1.0.0  
**Ngày cập nhật**: 17/04/2026  
**Tác giả**: Nguyễn Lê Duy
