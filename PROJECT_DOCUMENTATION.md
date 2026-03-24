# DAVictory - IELTS Test Website Project

## 📋 Tổng quan dự án

**DAVictory** là một hệ thống website kiểm tra IELTS với kiến trúc full-stack hiện đại, bao gồm backend Spring Boot và frontend React.

### Thông tin cơ bản
- **Tên dự án**: DAVictory
- **Mô tả**: IELTS Test website project for Spring Boot
- **Kiến trúc**: Full-stack (Backend + Frontend)
- **Ngôn ngữ**: Java (Spring Boot) + JavaScript/React
- **Cơ sở dữ liệu**: MySQL (dựa trên các file SQL trong dự án)

## 🏗️ Cấu trúc dự án

```
DAVictory/
├── backend/                    # Spring Boot Backend
│   ├── src/                   # Source code
│   ├── pom.xml               # Maven configuration
│   ├── mvnw                  # Maven wrapper
│   └── mvnw.cmd              # Maven wrapper (Windows)
├── frontend/                  # React Frontend
│   ├── src/                  # React source code
│   ├── public/               # Static assets
│   ├── package.json          # Node.js dependencies
│   ├── vite.config.js        # Vite configuration
│   └── README.md             # Frontend documentation
├── .run/                     # Runtime files (PID, logs)
├── .venv/                    # Python virtual environment
├── .vscode/                  # VS Code configuration
├── .kiro/                    # Kiro CLI configuration
├── start.sh                  # Script khởi động toàn bộ
├── stop.sh                   # Script dừng toàn bộ
└── *.sql                     # Database migration scripts
```

## 🚀 Cách chạy dự án

### 1. Khởi động toàn bộ hệ thống
```bash
./start.sh
```

### 2. Dừng toàn bộ hệ thống
```bash
./stop.sh
```

### 3. Chạy riêng từng phần

**Backend (Spring Boot):**
```bash
cd backend
./mvnw spring-boot:run
```

**Frontend (React):**
```bash
cd frontend
npm run dev
```

## 🔧 Công nghệ sử dụng

### Backend (Spring Boot 4.0.3)
- **Framework**: Spring Boot 4.0.3
- **Build tool**: Maven
- **Database**: MySQL
- **API**: RESTful APIs

### Frontend (React + Vite)
- **Framework**: React 19.2.0
- **Build tool**: Vite
- **UI Libraries**:
  - Framer Motion 12.35.0 (animations)
  - Lucide React 0.577.0 (icons)
  - @dnd-kit (drag and drop)
- **HTTP Client**: Axios 1.13.6

## 📁 Chi tiết cấu trúc

### Backend Structure
```
backend/src/
├── main/
│   ├── java/com/victory/     # Java source code
│   └── resources/            # Configuration files
└── test/                     # Test files
```

### Frontend Structure
```
frontend/src/
├── blocks/                   # Question block components (đã được tách module)
│   ├── shared/              # Shared utilities
│   │   ├── blockTypes.js    # TYPE_META constants
│   │   ├── blockHelpers.js  # Helper functions
│   │   ├── GroupToolbar.jsx # Toolbar component
│   │   └── RichBlankEditor.jsx # Rich text editor
│   └── *.jsx                # 17 block components
├── components/              # React components
├── pages/                  # Page components
├── services/               # API services
├── utils/                  # Utility functions
└── App.jsx                 # Main application
```

## 🎯 Tính năng chính

### 1. Quản lý đề thi IELTS
- Tạo và chỉnh sửa đề thi
- Quản lý các loại câu hỏi IELTS
- Hỗ trợ đa dạng định dạng câu hỏi

### 2. Các loại câu hỏi hỗ trợ
1. **PassageBlock** - Đọc hiểu đoạn văn
2. **AudioBlock** - Câu hỏi nghe
3. **ImageBlock** - Câu hỏi hình ảnh
4. **DragMatchingBlock** - Kéo thả khớp
5. **MatchingFeaturesBlock** - Khớp đặc điểm
6. **MatchingHeadingBlock** - Khớp tiêu đề
7. **MultipleChoiceBlock** - Trắc nghiệm đơn
8. **MultipleChoiceMultiBlock** - Trắc nghiệm nhiều
9. **TFNGBlock** - True/False/Not Given
10. **SentenceCompletionBlock** - Hoàn thành câu
11. **ShortAnswerBlock** - Câu trả lời ngắn
12. **NoteCompletionBlock** - Hoàn thành ghi chú
13. **ImageNoteFormBlock** - Form ghi chú hình ảnh

### 3. Quản lý lớp học
- Tạo và quản lý lớp học
- Phân công học viên
- Theo dõi tiến độ

### 4. Hệ thống chấm điểm
- Tự động chấm điểm
- Lịch sử làm bài
- Báo cáo kết quả

## 🗄️ Cơ sở dữ liệu

### Các bảng chính
1. **exams** - Đề thi
2. **questions** - Câu hỏi
3. **question_groups** - Nhóm câu hỏi
4. **classes** - Lớp học
5. **students** - Học viên
6. **exam_attempts** - Lần làm bài
7. **grades** - Điểm số

### Migration scripts
- `add_exam_attempt_grade_history.sql` - Thêm lịch sử điểm
- `alter_question_groups_image_url.sql` - Sửa cột image_url
- `add_question_group_instructions.sql` - Thêm hướng dẫn

## 🔄 Quy trình phát triển

### 1. Refactoring đã hoàn thành
- ✅ Tách module ExamCanvas.jsx (171KB, 3,757 dòng) thành 17 component riêng biệt
- ✅ Tạo shared utilities cho các block components
- ✅ Cải thiện khả năng bảo trì và tái sử dụng code

### 2. Cấu hình development
- **Backend**: Port 8080 (mặc định Spring Boot)
- **Frontend**: Port 5173 (mặc định Vite)
- **Hot reload**: Cả backend và frontend
- **Logs**: Lưu trong `.run/backend.log` và `.run/frontend.log`

## 🛠️ Công cụ hỗ trợ

### 1. Scripts quản lý
- `start.sh` - Khởi động cả backend và frontend
- `stop.sh` - Dừng tất cả tiến trình
- `ENHANCEMENT_CLASS_MANAGEMENT.js` - Cải tiến quản lý lớp
- `debug_class_management.js` - Debug quản lý lớp

### 2. Development tools
- **VS Code**: Cấu hình trong `.vscode/`
- **Kiro CLI**: AI-assisted development
- **Maven Wrapper**: Quản lý dependencies Java
- **npm**: Quản lý dependencies JavaScript

## 📊 Kiến trúc hệ thống

```
┌─────────────────┐    HTTP    ┌─────────────────┐
│   React Frontend│◄──────────►│ Spring Boot API │
│   (Port: 5173)  │            │  (Port: 8080)   │
└─────────────────┘            └────────┬────────┘
                                        │
                                        ▼
                                ┌─────────────────┐
                                │   MySQL Database│
                                └─────────────────┘
```

## 🚨 Xử lý lỗi thường gặp

### 1. Port đã được sử dụng
```bash
# Kiểm tra tiến trình đang chạy
lsof -i :8080  # Backend
lsof -i :5173  # Frontend

# Dừng tiến trình
./stop.sh
```

### 2. Thiếu dependencies
```bash
# Backend
cd backend
./mvnw clean install

# Frontend
cd frontend
npm install
```

### 3. Database connection
- Kiểm tra file cấu hình `application.properties`
- Đảm bảo MySQL service đang chạy
- Chạy các script SQL trong thư mục gốc

## 📈 Hướng phát triển

### 1. Tính năng sắp tới
- [ ] Hệ thống thanh toán
- [ ] Mobile app
- [ ] AI-powered feedback
- [ ] Real-time collaboration

### 2. Cải tiến kỹ thuật
- [ ] Chuyển sang TypeScript
- [ ] Thêm unit tests
- [ ] CI/CD pipeline
- [ ] Docker containerization

## 👥 Đóng góp

### Quy trình đóng góp
1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

### Coding standards
- **Backend**: Spring Boot conventions
- **Frontend**: React best practices
- **Database**: MySQL naming conventions
- **Git**: Conventional commits

## 📞 Liên hệ & Hỗ trợ

### Tài liệu tham khảo
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vite.dev/)
- [MySQL Documentation](https://dev.mysql.com/doc/)

### Issue tracking
- Sử dụng GitHub Issues
- Cung cấp đầy đủ thông tin lỗi
- Kèm theo logs và steps to reproduce

---

*Tài liệu được cập nhật lần cuối: 2026-03-24*
