TRƯỜNG ĐẠI HỌC TRÀ VINH                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
KHOA KỸ THUẬT VÀ CÔNG NGHỆ                 Độc lập – Tự do – Hạnh phúc

================================================================================

ĐỀ CƯƠNG CHI TIẾT
ĐỒ ÁN TỐT NGHIỆP NGÀNH CÔNG NGHỆ THÔNG TIN

================================================================================

Họ tên sinh viên: Huỳnh Quốc Kiệt          MSSV: 110122100
Lớp: DA22TTD                                Khóa: 2022

Tên đề tài: Phát triển ứng dụng web quản lý thi IELTS trực tuyến theo kiến trúc Client-Server

Giảng viên hướng dẫn: Nguyễn Khắc Quốc

================================================================================

1. MỤC TIÊU CỦA ĐỀ TÀI

Đề tài hướng đến việc xây dựng một hệ sinh thái thi IELTS trực tuyến hiện đại, nơi việc tổ chức thi, chấm điểm và quản lý học viên được tối ưu hóa thông qua kiến trúc hệ thống Client-Server mạnh mẽ. Mục tiêu trọng tâm là làm chủ các công nghệ backend và frontend tiên tiến để xây dựng một nền tảng linh hoạt, đảm bảo tính sẵn sàng cao và khả năng mở rộng. Bên cạnh đó, hệ thống đặt ưu tiên hàng đầu vào việc bảo mật dữ liệu và phân quyền tinh vi, tạo ra một môi trường thi trực tuyến chuyên nghiệp, an toàn và tin cậy cho mọi học viên.

Cụ thể, đề tài tập trung vào các mục tiêu sau:

1.1. Mục tiêu về kiến thức:
- Nghiên cứu và áp dụng kiến trúc Client-Server trong phát triển ứng dụng web
- Nắm vững Spring Boot Framework và React.js để xây dựng hệ thống full-stack
- Hiểu rõ cơ chế xác thực JWT và phân quyền Role-Based Access Control (RBAC)
- Nghiên cứu cấu trúc đề thi IELTS chuẩn quốc tế (4 kỹ năng: Listening, Reading, Writing, Speaking)
- Tìm hiểu các thuật toán chấm điểm tự động và tính band score theo chuẩn IELTS

1.2. Mục tiêu về kỹ năng:
- Phát triển kỹ năng phân tích yêu cầu và thiết kế hệ thống phức tạp
- Rèn luyện kỹ năng lập trình backend với Spring Boot (Java 21)
- Nâng cao kỹ năng phát triển giao diện người dùng với React.js
- Thành thạo trong việc thiết kế và quản lý cơ sở dữ liệu quan hệ MySQL
- Phát triển kỹ năng tích hợp API bên thứ ba (Google Drive API)
- Rèn luyện kỹ năng debug, testing và deployment ứng dụng web

1.3. Mục tiêu về sản phẩm:
- Xây dựng hệ thống thi IELTS trực tuyến đầy đủ 4 kỹ năng
- Tạo công cụ Test Builder giúp giáo viên dễ dàng tạo đề thi với nhiều dạng câu hỏi
- Phát triển hệ thống chấm điểm tự động cho Listening và Reading
- Xây dựng giao diện chấm bài Writing và Speaking cho giáo viên
- Tạo hệ thống quản lý lớp học và giao bài tập (Assignment)
- Phát triển dashboard thống kê và báo cáo chi tiết
- Cho phép khách (guest) làm bài thi thử miễn phí

1.4. Mục tiêu về ứng dụng thực tế:
- Giải quyết bài toán quản lý thi IELTS cho Trung tâm Ngoại ngữ - Tin học Victory
- Giúp học viên luyện thi IELTS mọi lúc, mọi nơi với giao diện mô phỏng bài thi thật
- Tiết kiệm thời gian chấm bài cho giáo viên nhờ chấm điểm tự động
- Cung cấp công cụ theo dõi tiến độ học tập và phân tích điểm yếu của học viên
- Tạo nền tảng để mở rộng sang các kỳ thi khác (TOEIC, Cambridge...)

================================================================================

2. NỘI DUNG THỰC HIỆN

Hành trình thực hiện đề tài tập trung vào việc hiện thực hóa các mảnh ghép công nghệ then chốt để hình thành một hệ thống hoàn chỉnh:

2.1. Nghiên cứu cơ sở lý thuyết:
- Nghiên cứu kiến trúc Client-Server và mô hình 3-tier architecture
- Tìm hiểu Spring Boot Framework: Spring Data JPA, Spring Security, Spring Web
- Nghiên cứu React.js: Component lifecycle, Hooks, State management, React Router
- Nghiên cứu JWT (JSON Web Token) và OAuth2 authentication
- Tìm hiểu cấu trúc đề thi IELTS chuẩn quốc tế và cách tính band score
- Nghiên cứu các dạng câu hỏi IELTS: Multiple Choice, True/False/Not Given, Matching, Fill in the Blanks, Short Answer, Essay...

2.2. Phân tích và thiết kế hệ thống:
- Phân tích yêu cầu chức năng và phi chức năng
- Thiết kế Use Case diagram cho 3 vai trò: Student, Teacher, Admin
- Thiết kế cơ sở dữ liệu với 60+ bảng để quản lý đầy đủ nghiệp vụ
- Thiết kế ERD (Entity Relationship Diagram) chi tiết
- Thiết kế kiến trúc hệ thống: Backend API, Frontend SPA, Database
- Thiết kế API endpoints cho các chức năng chính
- Thiết kế giao diện người dùng (UI/UX) theo chuẩn IELTS

2.3. Xây dựng Backend (Spring Boot):
- Cấu hình Spring Boot project với Maven
- Thiết kế và triển khai các Entity (JPA) tương ứng với database schema
- Xây dựng Repository layer với Spring Data JPA
- Phát triển Service layer chứa business logic
- Xây dựng Controller layer để expose RESTful APIs
- Triển khai Spring Security với JWT authentication
- Cấu hình CORS để cho phép frontend truy cập
- Tích hợp Google Drive API để lưu trữ file âm thanh, hình ảnh
- Xây dựng thuật toán chấm điểm tự động và tính band score
- Viết Unit Test và Integration Test

2.4. Xây dựng Frontend (React.js):
- Cấu hình React project với Vite
- Thiết kế component structure và routing
- Xây dựng các page components: Login, Dashboard, Test Builder, Exam, Grading...
- Phát triển các reusable components: TestCard, QuestionItem, Timer, Navigation...
- Tích hợp Axios để gọi Backend APIs
- Xây dựng custom hooks: useAuth, useTimer, useAutoSave...
- Triển khai state management với Context API
- Xây dựng giao diện Test Builder với drag-and-drop
- Phát triển giao diện làm bài thi với auto-save
- Tạo giao diện chấm bài Writing/Speaking cho giáo viên
- Xây dựng dashboard thống kê với charts

2.5. Triển khai các chức năng chính:

a) Hệ thống quản lý định danh (Authentication & Authorization):
- Đăng ký tài khoản với vai trò Student/Teacher/Admin
- Đăng nhập với JWT authentication
- Phân quyền truy cập theo vai trò (RBAC)
- Quản lý profile cá nhân
- Đổi mật khẩu, reset password

b) Test Builder (Công cụ tạo đề thi):
- Tạo đề thi theo cấu trúc phân cấp: Test → Session → Part → Question Group → Question
- Hỗ trợ 15+ loại câu hỏi IELTS
- Upload file âm thanh (MP3) cho Listening
- Upload hình ảnh (JPG/PNG) cho câu hỏi có diagram
- Nhập passage content cho Reading
- Tạo Writing prompts và Speaking topics
- Lưu phiên bản đề thi (Version Control)
- Xuất bản/Ẩn đề thi

c) Exam Attempt (Làm bài thi):
- Giao diện làm bài mô phỏng bài thi IELTS thật
- Đồng hồ đếm ngược theo thời gian quy định
- Navigation panel hiển thị trạng thái câu hỏi
- Chức năng đánh dấu câu hỏi (flag) để xem lại
- Auto-save tiến độ mỗi 30 giây
- Tự động nộp bài khi hết thời gian
- Chấm điểm tự động cho Listening và Reading
- Tính band score theo bảng quy đổi IELTS
- Hiển thị kết quả chi tiết với giải thích đáp án

d) Writing & Speaking Grading (Chấm bài):
- Giáo viên xem danh sách bài chờ chấm
- Chấm điểm Writing theo 4 tiêu chí IELTS:
  + Task Achievement (Task 1) / Task Response (Task 2)
  + Coherence and Cohesion
  + Lexical Resource
  + Grammatical Range and Accuracy
- Chấm điểm Speaking theo 4 tiêu chí:
  + Fluency and Coherence
  + Lexical Resource
  + Grammatical Range and Accuracy
  + Pronunciation
- Nhập feedback chi tiết cho từng tiêu chí
- Tự động tính band score trung bình
- Lưu lịch sử chấm điểm

e) Class Management (Quản lý lớp học):
- Giáo viên tạo lớp học với mã lớp duy nhất
- Thêm học viên vào lớp: nhập thủ công hoặc import CSV
- Xem danh sách học viên và tiến độ học tập
- Theo dõi điểm trung bình của lớp
- Xóa học viên khỏi lớp

f) Assignment (Giao bài tập):
- Giáo viên tạo Assignment từ đề thi có sẵn
- Thiết lập thời hạn nộp bài
- Học viên xem danh sách Assignment được giao
- Học viên làm bài và nộp Assignment
- Giáo viên xem danh sách bài nộp và chấm điểm
- Hệ thống tự động thống kê tỷ lệ hoàn thành

g) Statistics & Reports (Thống kê và Báo cáo):
- Dashboard tổng quan theo vai trò
- Biểu đồ điểm số theo thời gian
- Phân tích điểm mạnh/yếu theo từng kỹ năng
- Thống kê lớp học: điểm trung bình, phân bố điểm
- Báo cáo số lượt thi, số đề thi, số người dùng

h) Guest Exam (Thi thử cho khách):
- Cho phép người dùng chưa đăng ký làm bài thi thử
- Chỉ cần nhập email để nhận kết quả
- Giới hạn số lần thi để tránh lạm dụng

2.6. Testing và Deployment:
- Viết Unit Test cho các Service và Controller
- Thực hiện Integration Test cho các API endpoints
- Kiểm thử giao diện người dùng (UI Testing)
- Kiểm thử hiệu năng với nhiều người dùng đồng thời
- Deployment Backend lên server
- Deployment Frontend lên web server hoặc CDN
- Cấu hình database production
- Setup monitoring và logging

================================================================================

3. PHƯƠNG PHÁP THỰC HIỆN

3.1. Phương pháp nghiên cứu tài liệu:
- Đắm mình trong các nguồn tri thức chính thống về kiến trúc Client-Server
- Nghiên cứu tài liệu chính thức của Spring Boot Framework và React.js
- Tìm hiểu các giải pháp bảo mật Spring Security và JWT
- Nghiên cứu cấu trúc đề thi IELTS chuẩn quốc tế từ Cambridge và IDP
- Tham khảo các hệ thống thi trực tuyến hiện có để học hỏi kinh nghiệm
- Đọc các bài báo khoa học về thuật toán chấm điểm tự động

3.2. Phương pháp nghiên cứu thực nghiệm:
- Trực tiếp xây dựng và triển khai hệ thống theo mô hình Agile
- Phát triển theo từng Sprint, mỗi Sprint 1-2 tuần
- Thực hiện các bài kiểm tra chức năng sau mỗi Sprint
- Thu thập feedback từ giáo viên và học viên để cải thiện
- Thực hiện stress testing để đảm bảo hiệu năng
- Tinh chỉnh giao diện dựa trên phản hồi người dùng

3.3. Phương pháp phát triển phần mềm:
- Sử dụng mô hình Agile/Scrum
- Version control với Git và GitHub
- Code review và pair programming
- Continuous Integration/Continuous Deployment (CI/CD)
- Test-Driven Development (TDD) cho các module quan trọng

3.4. Công cụ hỗ trợ:
- IDE: IntelliJ IDEA (Backend), Visual Studio Code (Frontend)
- Database: MySQL Workbench
- API Testing: Postman, Swagger UI
- Version Control: Git, GitHub
- Project Management: Trello, Notion
- Design: Figma (UI/UX design)

================================================================================

4. BỐ CỤC ĐỀ TÀI

Phần Mở đầu:
- Lý do chọn đề tài
- Mục tiêu và ý nghĩa của đề tài
- Đối tượng và phạm vi nghiên cứu
- Phương pháp nghiên cứu
- Bố cục đồ án

Chương 1. TỔNG QUAN VỀ ĐỀ TÀI
1.1. Giới thiệu về Trung tâm Ngoại ngữ - Tin học Victory
1.2. Bối cảnh và nhu cầu xây dựng hệ thống thi IELTS trực tuyến
1.3. Khảo sát các hệ thống thi trực tuyến hiện có
1.4. Phân tích yêu cầu hệ thống
1.5. Tầm nhìn và mục tiêu của dự án

Chương 2. CƠ SỞ LÝ THUYẾT
2.1. Kiến trúc Client-Server
    2.1.1. Khái niệm và đặc điểm
    2.1.2. Mô hình 3-tier architecture
    2.1.3. Ưu điểm và nhược điểm
2.2. Spring Boot Framework
    2.2.1. Giới thiệu Spring Boot
    2.2.2. Spring Data JPA
    2.2.3. Spring Security
    2.2.4. Spring Web (RESTful API)
2.3. React.js
    2.3.1. Giới thiệu React.js
    2.3.2. Component và Props
    2.3.3. State và Lifecycle
    2.3.4. Hooks (useState, useEffect, useContext...)
    2.3.5. React Router
2.4. Cơ sở dữ liệu MySQL
    2.4.1. Hệ quản trị cơ sở dữ liệu quan hệ
    2.4.2. Thiết kế cơ sở dữ liệu
    2.4.3. Normalization và Indexing
2.5. JWT (JSON Web Token)
    2.5.1. Khái niệm và cấu trúc JWT
    2.5.2. Cơ chế xác thực với JWT
    2.5.3. Ưu điểm và hạn chế
2.6. RESTful API
    2.6.1. Khái niệm REST
    2.6.2. HTTP Methods (GET, POST, PUT, DELETE)
    2.6.3. Status Codes
    2.6.4. Best practices
2.7. Cấu trúc đề thi IELTS
    2.7.1. Giới thiệu về IELTS
    2.7.2. 4 kỹ năng: Listening, Reading, Writing, Speaking
    2.7.3. Các dạng câu hỏi IELTS
    2.7.4. Cách tính band score

Chương 3. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG
3.1. Phân tích yêu cầu
    3.1.1. Yêu cầu chức năng
    3.1.2. Yêu cầu phi chức năng
    3.1.3. Phân tích các tác nhân (Actor)
3.2. Thiết kế Use Case
    3.2.1. Use Case tổng quát
    3.2.2. Use Case cho Student
    3.2.3. Use Case cho Teacher
    3.2.4. Use Case cho Admin
    3.2.5. Mô tả chi tiết các Use Case chính
3.3. Thiết kế cơ sở dữ liệu
    3.3.1. Sơ đồ ERD tổng quan
    3.3.2. Mô tả các bảng chính
    3.3.3. Các mối quan hệ giữa các bảng
    3.3.4. Indexing và Optimization
3.4. Thiết kế kiến trúc hệ thống
    3.4.1. Kiến trúc tổng thể
    3.4.2. Kiến trúc Backend (Spring Boot)
    3.4.3. Kiến trúc Frontend (React.js)
    3.4.4. Luồng dữ liệu giữa các tầng
3.5. Thiết kế API
    3.5.1. Danh sách API endpoints
    3.5.2. Request/Response format
    3.5.3. Error handling
    3.5.4. API documentation (Swagger)
3.6. Thiết kế giao diện người dùng
    3.6.1. Wireframe các màn hình chính
    3.6.2. Mockup giao diện
    3.6.3. User flow

Chương 4. TRIỂN KHAI HỆ THỐNG
4.1. Môi trường phát triển
    4.1.1. Cài đặt JDK 21
    4.1.2. Cài đặt Node.js và npm
    4.1.3. Cài đặt MySQL
    4.1.4. Cấu hình IDE
4.2. Triển khai Backend
    4.2.1. Cấu hình Spring Boot project
    4.2.2. Triển khai Entity layer
    4.2.3. Triển khai Repository layer
    4.2.4. Triển khai Service layer
    4.2.5. Triển khai Controller layer
    4.2.6. Cấu hình Spring Security và JWT
    4.2.7. Tích hợp Google Drive API
    4.2.8. Xây dựng thuật toán chấm điểm
4.3. Triển khai Frontend
    4.3.1. Cấu hình React project với Vite
    4.3.2. Xây dựng component structure
    4.3.3. Triển khai routing
    4.3.4. Tích hợp Axios
    4.3.5. Xây dựng các page components
    4.3.6. Xây dựng Test Builder
    4.3.7. Xây dựng Exam interface
    4.3.8. Xây dựng Grading interface
4.4. Tích hợp Backend và Frontend
    4.4.1. Cấu hình CORS
    4.4.2. Testing API integration
    4.4.3. Xử lý lỗi và exception
4.5. Testing
    4.5.1. Unit Testing
    4.5.2. Integration Testing
    4.5.3. UI Testing
    4.5.4. Performance Testing

Chương 5. KẾT QUẢ VÀ ĐÁNH GIÁ
5.1. Kết quả đạt được
    5.1.1. Các chức năng đã triển khai
    5.1.2. Giao diện hệ thống
    5.1.3. Kết quả testing
5.2. Đánh giá hệ thống
    5.2.1. Ưu điểm
    5.2.2. Hạn chế
    5.2.3. So sánh với các hệ thống tương tự
5.3. Hướng phát triển
    5.3.1. Tính năng mới
    5.3.2. Cải thiện hiệu năng
    5.3.3. Mở rộng hệ thống

Phần Kết luận:
- Tổng kết những gì đã đạt được
- Những kinh nghiệm rút ra
- Đóng góp của đề tài
- Hướng phát triển trong tương lai

Tài liệu tham khảo

Phụ lục:
- Phụ lục A: Source code quan trọng
- Phụ lục B: API Documentation
- Phụ lục C: Database Schema
- Phụ lục D: User Manual

================================================================================

5. TÀI LIỆU THAM KHẢO

[1] C. Syer, "Beginning Spring Boot 3: Build Dynamic Cloud-Native Java Applications", Apress, 2023.

[2] M. Deinum, "Spring Boot 3 Recipes: A Problem-Solution Approach for Java Microservices", 2nd Edition, Apress, 2024.

[3] R. Elmasri, S. B. Navathe, "Fundamentals of Database Systems", 7th Edition, Pearson, 2016.

[4] N. Dimitrijević, "Advanced Security Mechanisms in the Spring Framework", 2022.

[5] A. Banks, E. Porcello, "Learning React: Modern Patterns for Developing React Apps", 2nd Edition, O'Reilly Media, 2020.

[6] Cambridge Assessment English, "IELTS Guide for Teachers", Cambridge University Press, 2023.

[7] Oracle Corporation, "Java SE 21 Documentation", https://docs.oracle.com/en/java/javase/21/

[8] Spring Team, "Spring Boot Reference Documentation", https://docs.spring.io/spring-boot/docs/current/reference/html/

[9] React Team, "React Documentation", https://react.dev/

[10] MySQL AB, "MySQL 8.0 Reference Manual", https://dev.mysql.com/doc/refman/8.0/en/

[11] Auth0, "JWT Handbook", https://auth0.com/resources/ebooks/jwt-handbook

[12] Google, "Google Drive API Documentation", https://developers.google.com/drive/api/guides/about-sdk

================================================================================

6. KẾ HOẠCH THỰC HIỆN ĐỀ TÀI

+------+------------------------+------------------------------------------------+----------+
| Tuần | Từ ngày - đến ngày     | Công việc thực hiện                            | Ghi chú  |
+------+------------------------+------------------------------------------------+----------+
|  1   | 20/04/2026-26/04/2026  | - Hoàn thiện đề cương chi tiết cho đề tài     |          |
|      |                        | - Nghiên cứu tài liệu về Spring Boot và React |          |
+------+------------------------+------------------------------------------------+----------+
|  2   | 27/04/2026-03/05/2026  | - Nghiên cứu cơ sở lý thuyết về kiến trúc     |          |
|      |                        |   Client-Server                                |          |
|      |                        | - Khảo sát các hệ thống thi trực tuyến hiện có|          |
|      |                        | - Nghiên cứu cấu trúc đề thi IELTS            |          |
+------+------------------------+------------------------------------------------+----------+
|  3   | 04/05/2026-10/05/2026  | - Phân tích yêu cầu hệ thống                   |          |
|      |                        | - Thiết kế Use Case diagram                    |          |
|      |                        | - Xây dựng mô hình dữ liệu tổng thể (ERD)     |          |
|      |                        | - Thiết kế wireframe giao diện                 |          |
+------+------------------------+------------------------------------------------+----------+
|  4   | 11/05/2026-17/05/2026  | - Thiết kế kiến trúc hệ thống chi tiết         |          |
|      |                        | - Thiết kế API endpoints                       |          |
|      |                        | - Thiết kế database schema chi tiết            |          |
|      |                        | - Chuẩn bị môi trường phát triển               |          |
+------+------------------------+------------------------------------------------+----------+
|  5   | 18/05/2026-24/05/2026  | - Xây dựng Backend: Entity và Repository layer |          |
|      |                        | - Cấu hình Spring Security và JWT              |          |
|      |                        | - Xây dựng chức năng đăng ký, đăng nhập        |          |
|      |                        | - Xây dựng chức năng phân quyền                |          |
+------+------------------------+------------------------------------------------+----------+
|  6   | 25/05/2026-31/05/2026  | - Xây dựng Test Builder Service                |          |
|      |                        | - Tích hợp Google Drive API                    |          |
|      |                        | - Xây dựng API tạo đề thi                      |          |
|      |                        | - Xây dựng API quản lý câu hỏi                 |          |
+------+------------------------+------------------------------------------------+----------+
|  7   | 01/06/2026-07/06/2026  | - Xây dựng Exam Attempt Service                |          |
|      |                        | - Xây dựng thuật toán chấm điểm tự động        |          |
|      |                        | - Xây dựng API làm bài thi                     |          |
|      |                        | - Xây dựng API nộp bài và xem kết quả          |          |
+------+------------------------+------------------------------------------------+----------+
|  8   | 08/06/2026-14/06/2026  | - Xây dựng Writing/Speaking Grading Service    |          |
|      |                        | - Xây dựng Class Management Service            |          |
|      |                        | - Xây dựng Assignment Service                  |          |
|      |                        | - Viết Unit Test cho Backend                   |          |
+------+------------------------+------------------------------------------------+----------+
|  9   | 15/06/2026-21/06/2026  | - Xây dựng Frontend: Login, Dashboard          |          |
|      |                        | - Xây dựng Test Builder interface              |          |
|      |                        | - Xây dựng Exam interface với timer            |          |
|      |                        | - Tích hợp Axios và API calls                  |          |
+------+------------------------+------------------------------------------------+----------+
|  10  | 22/06/2026-28/06/2026  | - Xây dựng Writing/Speaking Grading interface  |          |
|      |                        | - Xây dựng Class Management interface          |          |
|      |                        | - Xây dựng Assignment interface                |          |
|      |                        | - Xây dựng Statistics Dashboard                |          |
+------+------------------------+------------------------------------------------+----------+
|  11  | 29/06/2026-05/07/2026  | - Tích hợp Frontend và Backend                 |          |
|      |                        | - Testing toàn bộ hệ thống                     |          |
|      |                        | - Fix bugs và tối ưu hóa                       |          |
|      |                        | - Cải thiện giao diện người dùng               |          |
+------+------------------------+------------------------------------------------+----------+
|  12  | 06/07/2026-12/07/2026  | - Deployment hệ thống lên server               |          |
|      |                        | - Viết tài liệu hướng dẫn sử dụng              |          |
|      |                        | - Viết báo cáo đồ án                           |          |
|      |                        | - Chuẩn bị bài thuyết trình và poster          |          |
+------+------------------------+------------------------------------------------+----------+

================================================================================

7. CÔNG NGHỆ VÀ CÔNG CỤ SỬ DỤNG

7.1. Backend Technologies:
- Java 21 (JDK 21)
- Spring Boot 4.0.3
- Spring Data JPA (ORM)
- Spring Security (Authentication & Authorization)
- JWT (JSON Web Token)
- MySQL 8.0 (Database)
- Maven (Build tool)
- Lombok (Reduce boilerplate code)
- SpringDoc OpenAPI (API documentation)
- Google Drive API (File storage)

7.2. Frontend Technologies:
- React 19.2.0
- Vite 8.0 (Build tool)
- React Router DOM 7.13.1 (Routing)
- Axios 1.13.6 (HTTP client)
- Lucide React (Icons)
- Framer Motion (Animations)
- TipTap (Rich text editor)
- @dnd-kit (Drag and drop)
- KaTeX (Math rendering)

7.3. Development Tools:
- IntelliJ IDEA (Backend IDE)
- Visual Studio Code (Frontend IDE)
- MySQL Workbench (Database management)
- Postman (API testing)
- Git & GitHub (Version control)
- Figma (UI/UX design)
- Trello/Notion (Project management)

7.4. Testing Tools:
- JUnit 5 (Backend unit testing)
- Spring Boot Test (Integration testing)
- Jest (Frontend unit testing)
- Cypress (E2E testing)

7.5. Deployment:
- Linux Server (Ubuntu/CentOS)
- Nginx (Web server)
- Docker (Containerization - optional)

================================================================================

8. PHẠM VI VÀ GIỚI HẠN CỦA ĐỀ TÀI

8.1. Phạm vi thực hiện:
- Xây dựng hệ thống thi IELTS trực tuyến đầy đủ 4 kỹ năng
- Hỗ trợ 15+ loại câu hỏi IELTS phổ biến
- Chấm điểm tự động cho Listening và Reading
- Chấm điểm thủ công cho Writing và Speaking
- Quản lý lớp học và giao bài tập
- Thống kê và báo cáo chi tiết
- Cho phép khách làm bài thi thử

8.2. Giới hạn:
- Chưa triển khai chấm điểm Writing/Speaking tự động bằng AI
- Chưa có chức năng thanh toán trực tuyến
- Chưa phát triển mobile app (iOS/Android)
- Chưa có chức năng video call cho Speaking test
- Chưa tối ưu hóa cho số lượng người dùng rất lớn (>1000 đồng thời)
- Chưa có chức năng chatbot hỗ trợ học viên

8.3. Đối tượng sử dụng:
- Học viên: Luyện thi IELTS trực tuyến
- Giáo viên: Tạo đề thi, chấm bài, quản lý lớp học
- Quản trị viên: Quản lý người dùng, thống kê hệ thống
- Khách: Làm bài thi thử miễn phí

================================================================================

9. KẾT QUẢ DỰ KIẾN

9.1. Sản phẩm:
- Hệ thống web application hoàn chỉnh với Backend API và Frontend SPA
- Database với 60+ bảng quản lý đầy đủ nghiệp vụ
- Tài liệu kỹ thuật chi tiết
- Tài liệu hướng dẫn sử dụng
- Source code được quản lý trên GitHub

9.2. Kiến thức và kỹ năng:
- Nắm vững kiến trúc Client-Server
- Thành thạo Spring Boot và React.js
- Hiểu rõ về bảo mật web application
- Có kinh nghiệm phát triển hệ thống full-stack
- Biết cách thiết kế và tối ưu database
- Có kỹ năng làm việc nhóm và quản lý dự án

9.3. Đóng góp:
- Giải quyết bài toán thực tế cho Trung tâm Victory
- Tạo nền tảng để mở rộng sang các kỳ thi khác
- Đóng góp vào việc số hóa giáo dục tại Trà Vinh
- Tạo tài liệu tham khảo cho sinh viên sau

================================================================================

10. CAM KẾT THỰC HIỆN

Tôi xin cam kết:
- Hoàn thành đề tài đúng tiến độ đã đề ra
- Sản phẩm đạt chất lượng theo yêu cầu
- Source code được viết sạch, có comment đầy đủ
- Tài liệu được trình bày rõ ràng, khoa học
- Tuân thủ các quy định về đồ án tốt nghiệp
- Không sao chép, đạo văn từ các nguồn khác
- Sẵn sàng nhận góp ý và chỉnh sửa theo yêu cầu của giảng viên hướng dẫn

================================================================================

                                    Vĩnh Long, ngày     tháng     năm 2026


    GIẢNG VIÊN HƯỚNG DẪN                           SINH VIÊN THỰC HIỆN
    (Ký và ghi rõ họ tên)                          (Ký và ghi rõ họ tên)




    Nguyễn Khắc Quốc                               Huỳnh Quốc Kiệt

================================================================================

PHỤ LỤC: DANH SÁCH CHỨC NĂNG CHI TIẾT

A. CHỨC NĂNG CHO HỌC VIÊN (STUDENT)

1. Quản lý tài khoản:
   - Đăng ký tài khoản mới
   - Đăng nhập/Đăng xuất
   - Xem và cập nhật profile
   - Đổi mật khẩu
   - Upload avatar

2. Làm bài thi:
   - Xem danh sách đề thi có sẵn
   - Chọn đề thi theo kỹ năng (Listening/Reading/Writing/Speaking) hoặc Full Test
   - Làm bài thi với giao diện mô phỏng IELTS thật
   - Sử dụng timer đếm ngược
   - Đánh dấu câu hỏi để xem lại
   - Auto-save tiến độ
   - Nộp bài thi
   - Xem kết quả ngay lập tức (Listening/Reading)

3. Xem kết quả và lịch sử:
   - Xem band score tổng và từng kỹ năng
   - Xem số câu đúng/sai
   - Xem giải thích đáp án chi tiết
   - Xem lịch sử tất cả các lượt thi
   - Xem biểu đồ tiến bộ theo thời gian
   - So sánh điểm giữa các lần thi

4. Quản lý lớp học:
   - Tham gia lớp học bằng mã lớp
   - Xem danh sách lớp học đã tham gia
   - Xem thông tin lớp học
   - Xem danh sách bạn cùng lớp

5. Assignment:
   - Xem danh sách Assignment được giao
   - Xem chi tiết Assignment (đề bài, hạn nộp)
   - Làm bài Assignment
   - Nộp Assignment
   - Xem điểm và feedback từ giáo viên
   - Xem lịch sử Assignment đã làm

6. Dashboard:
   - Xem tổng quan số bài thi đã làm
   - Xem điểm trung bình
   - Xem biểu đồ tiến bộ
   - Xem Assignment sắp đến hạn
   - Xem thông báo mới

B. CHỨC NĂNG CHO GIÁO VIÊN (TEACHER)

1. Quản lý tài khoản:
   - Đăng nhập/Đăng xuất
   - Xem và cập nhật profile
   - Đổi mật khẩu

2. Test Builder (Tạo đề thi):
   - Tạo đề thi mới
   - Nhập thông tin đề thi (tiêu đề, mô tả, loại bài thi)
   - Thêm Session (Listening/Reading/Writing/Speaking)
   - Thêm Part vào Session
   - Tạo Question Group với:
     + Passage content (cho Reading)
     + Audio file (cho Listening)
     + Image (cho câu hỏi có diagram)
     + Instructions
   - Thêm câu hỏi với 15+ loại:
     + Multiple Choice (Single/Multiple answers)
     + True/False/Not Given
     + Matching Headings
     + Matching Information
     + Matching Features
     + Fill in the Blanks
     + Short Answer
     + Sentence Completion
     + Summary Completion
     + Note Completion
     + Table Completion
     + Diagram Labeling
     + Essay (Writing Task 1 & 2)
     + Speaking (Part 1, 2, 3)
   - Upload file media lên Google Drive
   - Lưu draft
   - Preview đề thi
   - Xuất bản đề thi
   - Chỉnh sửa đề thi đã tạo
   - Xóa đề thi
   - Xem lịch sử phiên bản

3. Chấm bài:
   - Xem danh sách bài Writing chờ chấm
   - Xem danh sách bài Speaking chờ chấm
   - Xem chi tiết bài làm của học viên
   - Chấm điểm Writing theo 4 tiêu chí:
     + Task Achievement/Response
     + Coherence and Cohesion
     + Lexical Resource
     + Grammatical Range and Accuracy
   - Chấm điểm Speaking theo 4 tiêu chí:
     + Fluency and Coherence
     + Lexical Resource
     + Grammatical Range and Accuracy
     + Pronunciation
   - Nhập feedback chi tiết
   - Lưu điểm
   - Xem lịch sử chấm điểm

4. Quản lý lớp học:
   - Tạo lớp học mới
   - Xem danh sách lớp học
   - Xem chi tiết lớp học
   - Thêm học viên vào lớp:
     + Nhập thủ công
     + Import từ CSV
     + Chia sẻ mã lớp
   - Xóa học viên khỏi lớp
   - Xem danh sách học viên
   - Xem tiến độ học tập của từng học viên
   - Xem thống kê lớp học:
     + Điểm trung bình
     + Phân bố điểm
     + Tỷ lệ hoàn thành Assignment

5. Assignment:
   - Tạo Assignment mới từ đề thi có sẵn
   - Thiết lập:
     + Tên Assignment
     + Mô tả
     + Thời hạn nộp
     + Lớp học áp dụng
     + Số lần làm tối đa
     + Cho phép nộp muộn
   - Xem danh sách Assignment đã tạo
   - Xem danh sách bài nộp
   - Chấm điểm Assignment
   - Nhập feedback
   - Xem thống kê Assignment:
     + Số bài đã nộp
     + Số bài chưa nộp
     + Điểm trung bình
     + Tỷ lệ hoàn thành

6. Dashboard:
   - Xem tổng số đề thi đã tạo
   - Xem tổng số lớp học
   - Xem số bài chờ chấm
   - Xem thống kê số lượt thi
   - Xem biểu đồ điểm trung bình theo lớp

C. CHỨC NĂNG CHO QUẢN TRỊ VIÊN (ADMIN)

1. Quản lý người dùng:
   - Xem danh sách tất cả người dùng
   - Tìm kiếm người dùng
   - Lọc người dùng theo vai trò
   - Thêm người dùng mới
   - Chỉnh sửa thông tin người dùng
   - Xóa người dùng
   - Khóa/Mở khóa tài khoản
   - Phân quyền (gán vai trò STUDENT/TEACHER/ADMIN)
   - Import người dùng từ CSV
   - Export danh sách người dùng

2. Quản lý đề thi:
   - Xem danh sách tất cả đề thi
   - Tìm kiếm đề thi
   - Lọc đề thi theo trạng thái, loại
   - Xem chi tiết đề thi
   - Duyệt đề thi
   - Xóa đề thi
   - Khôi phục đề thi đã xóa

3. Quản lý lớp học:
   - Xem danh sách tất cả lớp học
   - Xem chi tiết lớp học
   - Xóa lớp học
   - Xem thống kê lớp học

4. Dashboard và Thống kê:
   - Xem tổng số người dùng (Student/Teacher/Admin)
   - Xem tổng số đề thi
   - Xem tổng số lượt thi
   - Xem tổng số lớp học
   - Xem biểu đồ người dùng mới theo thời gian
   - Xem biểu đồ số lượt thi theo thời gian
   - Xem top học viên có điểm cao nhất
   - Xem top đề thi được làm nhiều nhất
   - Xem thống kê theo kỹ năng

5. Cấu hình hệ thống:
   - Cấu hình Google Drive API
   - Cấu hình email
   - Cấu hình thông số hệ thống
   - Xem log hệ thống
   - Backup database

D. CHỨC NĂNG CHO KHÁCH (GUEST)

1. Thi thử miễn phí:
   - Xem danh sách đề thi cho khách
   - Nhập email để bắt đầu
   - Làm bài thi thử
   - Nộp bài
   - Xem kết quả
   - Nhận kết quả qua email

2. Đăng ký tài khoản:
   - Đăng ký để sử dụng đầy đủ tính năng

================================================================================

PHỤ LỤC: CẤU TRÚC DATABASE CHI TIẾT

Hệ thống sử dụng 60+ bảng được chia thành các nhóm chức năng:

1. Nhóm User Management (Quản lý người dùng):
   - users
   - roles
   - user_roles
   - student_profiles
   - teacher_profiles
   - user_sessions
   - user_activity_logs

2. Nhóm Test Management (Quản lý đề thi):
   - tests
   - sessions
   - test_sessions
   - parts
   - test_parts
   - question_groups
   - test_question_groups
   - questions
   - question_types
   - question_options
   - answers
   - matching_pairs
   - passage_contents
   - media_files
   - test_versions
   - test_settings
   - test_statistics

3. Nhóm Exam Attempt (Làm bài thi):
   - exam_attempts
   - attempt_sections
   - attempt_answers
   - attempt_question_times
   - guest_exam_attempts

4. Nhóm Writing & Speaking:
   - writing_tasks
   - writing_prompts
   - student_writing_submissions
   - writing_scores
   - writing_scoring_criteria
   - writing_sample_answers
   - writing_feedback_templates
   - speaking_topics
   - speaking_cue_cards
   - speaking_attempts
   - speaking_recordings
   - speaking_scores
   - speaking_feedback

5. Nhóm Class Management (Quản lý lớp học):
   - classes
   - class_students
   - class_teachers
   - centers

6. Nhóm Assignment (Bài tập):
   - assignments
   - assignment_submissions

7. Nhóm Statistics (Thống kê):
   - student_progress
   - student_skill_scores
   - question_statistics
   - test_statistics
   - full_test_progress

8. Nhóm Supporting Tables (Bảng hỗ trợ):
   - tags
   - question_tags
   - question_tag_maps
   - topic_categories
   - difficulty_levels
   - question_hints
   - question_explanations
   - audio_transcripts
   - test_share_links

Mỗi bảng được thiết kế với:
- Primary Key (id)
- Foreign Keys để liên kết với các bảng khác
- Timestamps (created_at, updated_at)
- Soft delete (deleted_at) cho các bảng quan trọng
- Indexes trên các cột thường xuyên query

================================================================================

HẾT
