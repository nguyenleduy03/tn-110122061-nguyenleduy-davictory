# CHECKLIST KIỂM TRA BÁO CÁO VÀ DỰ ÁN

## 1. KIỂM TRA NỘI DUNG BÁO CÁO

### 1.1. Phần mở đầu
- [x] Trang bìa (có đầy đủ thông tin: tên trường, khoa, tên đề tài, sinh viên, giảng viên)
- [x] Lời cảm ơn
- [x] Phiếu đánh giá báo cáo
- [x] Mục lục (có số trang)
- [x] Danh mục hình ảnh
- [x] Danh mục bảng biểu
- [x] Danh mục từ viết tắt
- [x] Nhật ký thực tập

### 1.2. Phần 1 - Cơ quan thực tập
- [x] 1.1. Giới thiệu chung về đơn vị
  - [x] Vị trí và chức năng
  - [x] Nhiệm vụ và quyền hạn
  - [x] Thế mạnh của đơn vị
  - [x] Thông tin liên hệ
- [x] 1.2. Cơ cấu tổ chức
  - [x] Tổ chức, bộ máy
  - [x] Nhiệm vụ các phòng ban
- [x] 1.3. Lịch sử hoạt động và phát triển

### 1.3. Phần 2 - Nội dung thực tập
- [x] 2.1. Làm quen với môi trường làm việc
  - [x] Tìm hiểu quy trình đào tạo IELTS
  - [x] Nghiên cứu các giải pháp công nghệ
- [x] 2.2. Xây dựng hệ thống thi IELTS trực tuyến
  - [x] 2.2.1. Phân tích và thiết kế hệ thống
    - [x] Mô tả bài toán
    - [x] Yêu cầu hệ thống
    - [x] Thiết kế cơ sở dữ liệu (ERD)
    - [x] Mô hình Use Case
    - [ ] **CẦN Bổ SUNG: Sơ đồ tuần tự (Sequence Diagrams)**
    - [ ] **CẦN Bổ SUNG: Sơ đồ hoạt động (Activity Diagrams)**
  - [x] 2.2.2. Công nghệ sử dụng
    - [x] Giới thiệu Spring Boot và React
    - [x] Kiến trúc hệ thống
    - [x] Các công nghệ và thư viện
    - [x] Cài đặt môi trường
  - [x] 2.2.3. Triển khai các chức năng chính
    - [x] Đăng ký và đăng nhập
    - [x] Tạo đề thi (Test Builder)
    - [x] Làm bài thi (Exam Attempt)
    - [x] Chấm bài Writing
    - [x] Quản lý lớp học
  - [x] 2.2.4. Kết quả triển khai
    - [x] Giao diện đăng nhập
    - [x] Giao diện Dashboard
    - [x] Giao diện Test Builder
    - [x] Giao diện làm bài thi
    - [x] Giao diện xem kết quả
    - [x] Giao diện chấm bài Writing
    - [x] Giao diện quản lý lớp học
    - [x] Giao diện Assignment

### 1.4. Phần 3 - Kết luận
- [x] 3.1. Tự nhận xét, đánh giá
  - [x] Về mặt kiến thức
  - [x] Về mặt kỹ năng
  - [x] Về mặt thái độ
  - [x] Kết quả đạt được
  - [x] Hạn chế
- [x] 3.2. Kết luận, kiến nghị
  - [x] Kết luận
  - [x] Kiến nghị cho Trung tâm
  - [x] Kiến nghị cho nhà trường
  - [x] Hướng phát triển tiếp theo

### 1.5. Định dạng và trình bày
- [x] Font chữ: Times New Roman, size 13
- [x] Căn lề: Trái 3cm, Phải 2cm, Trên 2cm, Dưới 2cm
- [x] Dãn dòng: 1.5 lines
- [x] Đánh số trang
- [x] Không có lỗi chính tả
- [x] Hình ảnh rõ nét, có caption và số thứ tự
- [x] Bảng biểu có tiêu đề và số thứ tự

## 2. KIỂM TRA DỰ ÁN

### 2.1. Backend (Spring Boot)

#### Cấu trúc dự án
- [x] Có file pom.xml với đầy đủ dependencies
- [x] Có file application.yaml với cấu hình
- [x] Cấu trúc package rõ ràng (controller, service, repository, entity, dto)

#### Code quality
- [ ] **CẦN KIỂM TRA**: Code có comment đầy đủ
- [ ] **CẦN KIỂM TRA**: Không có code thừa, code chết
- [ ] **CẦN KIỂM TRA**: Tuân thủ naming convention
- [ ] **CẦN KIỂM TRA**: Exception handling đầy đủ

#### Chức năng
- [x] Authentication (đăng ký, đăng nhập) hoạt động
- [x] Test Builder (tạo đề thi) hoạt động
- [x] Exam Attempt (làm bài thi) hoạt động
- [x] Auto-grading (chấm điểm tự động) hoạt động
- [x] Manual grading (chấm bài Writing) hoạt động
- [x] Class Management (quản lý lớp học) hoạt động
- [x] Assignment (giao bài tập) hoạt động

#### Security
- [x] JWT authentication hoạt động
- [x] Password được hash bằng BCrypt
- [x] CORS được cấu hình đúng
- [x] Role-based access control hoạt động

#### Database
- [x] Database schema đầy đủ
- [x] Có migration scripts (nếu dùng Flyway/Liquibase)
- [x] Index trên các cột quan trọng
- [x] Foreign key constraints đúng

### 2.2. Frontend (React)

#### Cấu trúc dự án
- [x] Có file package.json với đầy đủ dependencies
- [x] Có file vite.config.js
- [x] Cấu trúc folder rõ ràng (components, pages, services, hooks)

#### Code quality
- [ ] **CẦN KIỂM TRA**: Component có tên rõ ràng
- [ ] **CẦN KIỂM TRA**: Không có console.log thừa
- [ ] **CẦN KIỂM TRA**: Code được format đồng nhất
- [ ] **CẦN KIỂM TRA**: Sử dụng React hooks đúng cách

#### Chức năng
- [x] Đăng nhập/Đăng ký hoạt động
- [x] Dashboard hiển thị đúng
- [x] Test Builder hoạt động
- [x] Exam Page hoạt động
- [x] Auto-save hoạt động
- [x] Timer đếm ngược hoạt động
- [x] Xem kết quả hoạt động
- [x] Chấm bài Writing hoạt động
- [x] Quản lý lớp học hoạt động

#### UI/UX
- [x] Giao diện responsive (mobile, tablet, desktop)
- [x] Màu sắc hài hòa
- [x] Font chữ dễ đọc
- [x] Button, form có feedback khi tương tác
- [x] Loading state khi gọi API
- [x] Error handling và hiển thị lỗi cho user

### 2.3. Integration

#### API Integration
- [x] Frontend gọi đúng API endpoints
- [x] Request/Response format đúng
- [x] Error handling đầy đủ
- [x] Token được gửi trong header

#### Google Drive Integration
- [x] Upload file lên Google Drive hoạt động
- [x] Lấy URL file từ Google Drive
- [x] OAuth2 authentication hoạt động

### 2.4. Testing

#### Manual Testing
- [ ] **CẦN KIỂM TRA**: Test đăng ký tài khoản
- [ ] **CẦN KIỂM TRA**: Test đăng nhập
- [ ] **CẦN KIỂM TRA**: Test tạo đề thi
- [ ] **CẦN KIỂM TRA**: Test làm bài thi
- [ ] **CẦN KIỂM TRA**: Test chấm điểm
- [ ] **CẦN KIỂM TRA**: Test quản lý lớp học
- [ ] **CẦN KIỂM TRA**: Test giao bài tập

#### Edge Cases
- [ ] **CẦN KIỂM TRA**: Test với dữ liệu rỗng
- [ ] **CẦN KIỂM TRA**: Test với dữ liệu không hợp lệ
- [ ] **CẦN KIỂM TRA**: Test khi hết thời gian làm bài
- [ ] **CẦN KIỂM TRA**: Test khi mất kết nối internet
- [ ] **CẦN KIỂM TRA**: Test với nhiều người dùng đồng thời

### 2.5. Documentation

#### Code Documentation
- [ ] **CẦN BỔ SUNG**: README.md cho Backend
- [ ] **CẦN BỔ SUNG**: README.md cho Frontend
- [ ] **CẦN BỔ SUNG**: API Documentation (Swagger)
- [ ] **CẦN BỔ SUNG**: Database Schema Documentation

#### User Documentation
- [ ] **CẦN BỔ SUNG**: Hướng dẫn sử dụng cho học viên
- [ ] **CẦN BỔ SUNG**: Hướng dẫn sử dụng cho giáo viên
- [ ] **CẦN BỔ SUNG**: Hướng dẫn sử dụng cho admin

#### Deployment Documentation
- [ ] **CẦN BỔ SUNG**: Hướng dẫn cài đặt Backend
- [ ] **CẦN BỔ SUNG**: Hướng dẫn cài đặt Frontend
- [ ] **CẦN BỔ SUNG**: Hướng dẫn cấu hình Database
- [ ] **CẦN BỔ SUNG**: Hướng dẫn cấu hình Google Drive API

## 3. BIỂU ĐỒ UML

### 3.1. Biểu đồ đã có
- [x] ERD (Entity Relationship Diagram)
- [x] Use Case Diagrams

### 3.2. Biểu đồ cần bổ sung
- [x] **ĐÃ TẠO**: Sequence Diagrams (sequence_diagrams.puml)
  - [x] Đăng nhập
  - [x] Đăng ký
  - [x] Tạo đề thi
  - [x] Làm bài thi
  - [x] Chấm bài Writing
  - [x] Quản lý lớp học
  - [x] Giao bài tập
  - [x] Xem thống kê
  - [x] Thi thử cho khách

- [x] **ĐÃ TẠO**: Activity Diagrams / User Flow (user_flow_diagrams.puml)
  - [x] User Flow - Học viên làm bài thi
  - [x] User Flow - Giáo viên tạo đề thi
  - [x] User Flow - Giáo viên chấm bài Writing
  - [x] User Flow - Giáo viên quản lý lớp học
  - [x] User Flow - Học viên xem kết quả và tiến độ
  - [x] User Flow - Admin quản trị hệ thống
  - [x] User Flow - Khách làm bài thi thử

### 3.3. Export biểu đồ
- [ ] **CẦN LÀM**: Export Sequence Diagrams ra PNG
- [ ] **CẦN LÀM**: Export Activity Diagrams ra PNG
- [ ] **CẦN LÀM**: Thêm biểu đồ vào báo cáo Word

## 4. CHUẨN BỊ BẢO VỆ

### 4.1. Slide thuyết trình
- [ ] **CẦN LÀM**: Tạo slide PowerPoint
- [ ] **CẦN LÀM**: Slide giới thiệu đề tài
- [ ] **CẦN LÀM**: Slide mô tả bài toán
- [ ] **CẦN LÀM**: Slide kiến trúc hệ thống
- [ ] **CẦN LÀM**: Slide các chức năng chính
- [ ] **CẦN LÀM**: Slide demo giao diện
- [ ] **CẦN LÀM**: Slide kết quả đạt được
- [ ] **CẦN LÀM**: Slide kết luận và hướng phát triển

### 4.2. Demo
- [ ] **CẦN LÀM**: Chuẩn bị dữ liệu demo
- [ ] **CẦN LÀM**: Tạo tài khoản demo (student, teacher, admin)
- [ ] **CẦN LÀM**: Tạo sẵn đề thi demo
- [ ] **CẦN LÀM**: Tạo sẵn lớp học demo
- [ ] **CẦN LÀM**: Test demo trước khi bảo vệ

### 4.3. Câu hỏi dự kiến
- [ ] **CẦN CHUẨN BỊ**: Tại sao chọn Spring Boot và React?
- [ ] **CẦN CHUẨN BỊ**: Làm thế nào để chấm điểm tự động?
- [ ] **CẦN CHUẨN BỊ**: Làm thế nào để tính Band Score IELTS?
- [ ] **CẦN CHUẨN BỊ**: Hệ thống xử lý bao nhiêu người dùng đồng thời?
- [ ] **CẦN CHUẨN BỊ**: Bảo mật hệ thống như thế nào?
- [ ] **CẦN CHUẨN BỊ**: Khó khăn gặp phải và cách giải quyết?
- [ ] **CẦN CHUẨN BỊ**: Hướng phát triển tiếp theo?

## 5. DANH SÁCH FILE CẦN NỘP

### 5.1. Báo cáo
- [x] baocao.md (file gốc)
- [ ] **CẦN LÀM**: baocao.pdf (export từ Word)
- [ ] **CẦN LÀM**: baocao.docx (file Word)

### 5.2. Source code
- [x] Backend source code (folder backend/)
- [x] Frontend source code (folder frontend/)
- [ ] **CẦN LÀM**: README.md hướng dẫn cài đặt

### 5.3. Database
- [ ] **CẦN LÀM**: Database schema (SQL file)
- [ ] **CẦN LÀM**: Sample data (SQL file)

### 5.4. Biểu đồ
- [x] sequence_diagrams.puml
- [x] user_flow_diagrams.puml
- [x] DAVictory_core_erd.puml
- [ ] **CẦN LÀM**: Các file PNG đã export

### 5.5. Tài liệu bổ sung
- [x] TECHNICAL_DOCUMENTATION.md
- [x] README_DIAGRAMS.md
- [x] CHECKLIST_BAOCAO.md (file này)

### 5.6. Slide thuyết trình
- [ ] **CẦN LÀM**: presentation.pptx

## 6. TIMELINE

### Tuần 1 (Hiện tại)
- [x] Hoàn thiện báo cáo nội dung
- [x] Tạo các biểu đồ UML
- [x] Tạo tài liệu kỹ thuật

### Tuần 2
- [ ] Export biểu đồ và thêm vào báo cáo
- [ ] Hoàn thiện code và test
- [ ] Viết README và documentation

### Tuần 3
- [ ] Tạo slide thuyết trình
- [ ] Chuẩn bị demo
- [ ] Review toàn bộ báo cáo

### Tuần 4
- [ ] In báo cáo
- [ ] Nộp báo cáo
- [ ] Bảo vệ đồ án

## 7. GHI CHÚ QUAN TRỌNG

### Những điểm cần lưu ý
1. **Biểu đồ tuần tự**: Cần thêm vào báo cáo để thể hiện luồng tương tác chi tiết
2. **Biểu đồ hoạt động**: Cần thêm để thể hiện user flow rõ ràng
3. **Screenshot giao diện**: Cần chụp màn hình các giao diện chính với dữ liệu thật
4. **Code quality**: Cần review và clean up code trước khi nộp
5. **Testing**: Cần test kỹ tất cả chức năng trước khi demo

### Những điểm mạnh của dự án
1. Hệ thống đầy đủ chức năng cho thi IELTS trực tuyến
2. Hỗ trợ đầy đủ 4 kỹ năng: Listening, Reading, Writing, Speaking
3. Chấm điểm tự động cho Listening và Reading
4. Quản lý lớp học và giao bài tập
5. Thống kê và báo cáo chi tiết
6. Giao diện thân thiện, dễ sử dụng

### Những điểm cần cải thiện
1. Chưa có chức năng chấm điểm Speaking tự động
2. Chưa có mobile app
3. Chưa tích hợp thanh toán
4. Chưa có AI hỗ trợ chấm Writing

---

**Người kiểm tra**: Nguyễn Lê Duy  
**Ngày kiểm tra**: 17/04/2026  
**Trạng thái**: Đang hoàn thiện
