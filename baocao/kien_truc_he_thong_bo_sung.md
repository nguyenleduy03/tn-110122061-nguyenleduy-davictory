# BỔ SUNG PHẦN 2.2.2.2 - KIẾN TRÚC HỆ THỐNG

## 2.2.2.2 Kiến trúc hệ thống

Hệ thống DAVictory sử dụng kiến trúc **Client-Server** với sự phân tách rõ ràng giữa Frontend và Backend:

### a) Backend (Spring Boot)

- **Controller Layer**: Xử lý HTTP request từ client, gọi Service layer và trả về response.
- **Service Layer**: Chứa logic nghiệp vụ chính (tạo đề thi, chấm điểm, quản lý lớp học...).
- **Repository Layer**: Tương tác với cơ sở dữ liệu thông qua Spring Data JPA.
- **Entity Layer**: Định nghĩa các entity tương ứng với bảng trong database.
- **DTO Layer**: Data Transfer Object để truyền dữ liệu giữa các layer.
- **Security Layer**: Xác thực JWT, phân quyền RBAC (Role-Based Access Control).

### b) Frontend (React)

- **Components**: Các component UI như TestCard, QuestionItem, ExamAttemptPage...
- **Pages**: Các trang chính như HomePage, TestBuilderPage, ExamPage, DashboardPage...
- **Services/API**: Axios client để gọi API từ Backend.
- **Hooks**: Custom hooks để quản lý state và logic tái sử dụng.
- **Context/State Management**: Quản lý state toàn cục (user info, auth token...).
- **Router**: React Router để điều hướng giữa các trang.

### c) Tích hợp dịch vụ bên ngoài

#### **Google Drive API**

Hệ thống tích hợp Google Drive API để lưu trữ các file media (audio, hình ảnh, tài liệu) phục vụ cho đề thi IELTS.

**Lý do sử dụng Google Drive:**
- **Dung lượng lớn**: Google Drive cung cấp 15GB miễn phí, có thể mở rộng không giới hạn.
- **Tốc độ cao**: CDN toàn cầu của Google đảm bảo tốc độ tải file nhanh.
- **Chi phí thấp**: Không cần đầu tư server lưu trữ riêng.
- **Bảo mật**: File được mã hóa và có cơ chế phân quyền truy cập.
- **Dễ quản lý**: Có thể quản lý file qua giao diện web hoặc API.

**Quy trình tích hợp:**

1. **Cấu hình OAuth2 Credentials:**
   - Tạo project trên Google Cloud Console
   - Enable Google Drive API
   - Tạo OAuth 2.0 Client ID và Client Secret
   - Cấu hình Redirect URI: `http://localhost:8080/oauth2/callback/google`

2. **Xác thực và lấy Access Token:**
   ```java
   @Service
   public class GoogleDriveOAuth2Service {
       private GoogleAuthorizationCodeFlow flow;
       
       public String getAuthorizationUrl() {
           return flow.newAuthorizationUrl()
               .setRedirectUri(redirectUri)
               .build();
       }
       
       public Credential authorize(String code) {
           TokenResponse response = flow.newTokenRequest(code)
               .setRedirectUri(redirectUri)
               .execute();
           return flow.createAndStoreCredential(response, "user");
       }
   }
   ```

3. **Upload file lên Google Drive:**
   ```java
   @Service
   public class FileUploadService {
       public String uploadFile(MultipartFile file) {
           Drive driveService = getDriveService();
           
           File fileMetadata = new File();
           fileMetadata.setName(file.getOriginalFilename());
           fileMetadata.setParents(Collections.singletonList(folderId));
           
           FileContent mediaContent = new FileContent(
               file.getContentType(), 
               convertToFile(file)
           );
           
           File uploadedFile = driveService.files()
               .create(fileMetadata, mediaContent)
               .setFields("id, webViewLink, webContentLink")
               .execute();
           
           // Set file public để có thể truy cập
           Permission permission = new Permission()
               .setType("anyone")
               .setRole("reader");
           driveService.permissions()
               .create(uploadedFile.getId(), permission)
               .execute();
           
           return uploadedFile.getWebContentLink();
       }
   }
   ```

4. **Lưu URL vào database:**
   - URL được lưu vào bảng `question_group` (cột `audio_url`) hoặc `question` (cột `image_url`)
   - Frontend sử dụng URL này để hiển thị/phát file

**Các loại file được lưu trữ:**
- **Audio files** (MP3): File nghe cho Listening test
- **Image files** (JPG, PNG): Hình ảnh minh họa cho câu hỏi
- **Document files** (PDF): Tài liệu tham khảo

**Cấu trúc thư mục trên Google Drive:**
```
DAVictory/
├── audio/
│   ├── listening/
│   │   ├── part1/
│   │   ├── part2/
│   │   ├── part3/
│   │   └── part4/
├── images/
│   ├── reading/
│   ├── writing/
│   └── speaking/
└── documents/
    └── sample_answers/
```

#### **Gmail SMTP Service**

Hệ thống tích hợp Gmail SMTP để gửi email thông báo cho người dùng.

**Lý do sử dụng Gmail SMTP:**
- **Miễn phí**: Gmail cho phép gửi 500 email/ngày miễn phí.
- **Độ tin cậy cao**: Email từ Gmail ít bị đánh dấu spam.
- **Dễ cấu hình**: Chỉ cần username và App Password.
- **Hỗ trợ TLS/SSL**: Bảo mật khi gửi email.

**Cấu hình SMTP trong application.yaml:**
```yaml
spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: davictory.ielts@gmail.com
    password: ${GMAIL_APP_PASSWORD}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
            required: true
          connectiontimeout: 5000
          timeout: 5000
          writetimeout: 5000
```

**Các trường hợp gửi email:**

1. **Email chào mừng khi đăng ký:**
   ```java
   @Service
   public class EmailService {
       @Autowired
       private JavaMailSender mailSender;
       
       public void sendWelcomeEmail(User user) {
           MimeMessage message = mailSender.createMimeMessage();
           MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
           
           helper.setTo(user.getEmail());
           helper.setSubject("Chào mừng đến với DAVictory IELTS");
           helper.setText(buildWelcomeEmailContent(user), true);
           
           mailSender.send(message);
       }
       
       private String buildWelcomeEmailContent(User user) {
           return "<html><body>" +
               "<h2>Xin chào " + user.getFullName() + "!</h2>" +
               "<p>Cảm ơn bạn đã đăng ký tài khoản tại DAVictory IELTS.</p>" +
               "<p>Username: " + user.getUsername() + "</p>" +
               "<p>Bạn có thể đăng nhập và bắt đầu luyện thi ngay bây giờ.</p>" +
               "<a href='http://localhost:5173/login'>Đăng nhập</a>" +
               "</body></html>";
       }
   }
   ```

2. **Email thông báo kết quả thi:**
   - Gửi sau khi học viên hoàn thành bài thi
   - Bao gồm: Band Score, số câu đúng/sai, link xem chi tiết

3. **Email thông báo Assignment mới:**
   - Gửi khi giáo viên giao bài tập mới
   - Bao gồm: Tên bài tập, hạn nộp, link làm bài

4. **Email thông báo bài đã được chấm:**
   - Gửi sau khi giáo viên chấm xong Writing/Speaking
   - Bao gồm: Điểm số, feedback, link xem chi tiết

5. **Email reset password:**
   - Gửi khi người dùng quên mật khẩu
   - Bao gồm: Link reset password có thời hạn 1 giờ

6. **Email kết quả thi thử cho khách:**
   - Gửi cho người dùng chưa đăng ký sau khi làm bài thi thử
   - Bao gồm: Band Score, gợi ý đăng ký tài khoản

**Template email:**

Hệ thống sử dụng Thymeleaf template engine để tạo email HTML đẹp mắt:

```html
<!-- email-templates/exam-result.html -->
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: #4CAF50; color: white; padding: 20px; }
        .content { padding: 20px; }
        .score { font-size: 48px; font-weight: bold; color: #4CAF50; }
        .button { background: #4CAF50; color: white; padding: 10px 20px; 
                  text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Kết quả thi IELTS</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong th:text="${userName}"></strong>,</p>
            <p>Bạn đã hoàn thành bài thi: <strong th:text="${testTitle}"></strong></p>
            <p>Band Score của bạn:</p>
            <div class="score" th:text="${bandScore}"></div>
            <p>Số câu đúng: <span th:text="${correctCount}"></span> / 
               <span th:text="${totalQuestions}"></span></p>
            <p>
                <a th:href="${detailUrl}" class="button">Xem chi tiết</a>
            </p>
        </div>
    </div>
</body>
</html>
```

**Xử lý lỗi khi gửi email:**

```java
@Service
public class EmailService {
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    
    public void sendEmailAsync(String to, String subject, String content) {
        CompletableFuture.runAsync(() -> {
            try {
                sendEmail(to, subject, content);
                logger.info("Email sent successfully to: {}", to);
            } catch (MailException e) {
                logger.error("Failed to send email to: {}", to, e);
                // Lưu vào queue để retry sau
                saveToRetryQueue(to, subject, content);
            }
        });
    }
}
```

### d) Luồng dữ liệu

1. User tương tác với giao diện React (Frontend).
2. Frontend gửi HTTP request (GET/POST/PUT/DELETE) đến Backend API.
3. Backend Controller nhận request, validate dữ liệu.
4. Controller gọi Service để xử lý logic nghiệp vụ.
5. Service gọi Repository để truy xuất/cập nhật database.
6. **Service gọi Google Drive API để upload/download file media.**
7. **Service gọi Gmail SMTP để gửi email thông báo.**
8. Repository trả kết quả về Service, Service xử lý và trả về Controller.
9. Controller trả response (JSON) về Frontend.
10. Frontend nhận response, cập nhật UI.

### e) Sơ đồ kiến trúc tổng quan

[Hình X. Sơ đồ kiến trúc tổng quan hệ thống]

Sơ đồ mô tả:
- **Frontend Layer**: React application chạy trên port 5173
- **Backend Layer**: Spring Boot application chạy trên port 8080
- **Database Layer**: MySQL database chạy trên port 3306
- **External Services**: 
  - Google Drive API: Lưu trữ file media
  - Gmail SMTP: Gửi email thông báo

### f) Ưu điểm của kiến trúc

1. **Tách biệt rõ ràng**: Frontend và Backend độc lập, dễ phát triển và bảo trì.
2. **Khả năng mở rộng**: Có thể scale Frontend và Backend riêng biệt.
3. **Tái sử dụng**: API có thể được sử dụng bởi nhiều client (Web, Mobile).
4. **Bảo mật**: JWT authentication, RBAC authorization.
5. **Hiệu năng**: Sử dụng Google Drive CDN cho file media, giảm tải cho server.
6. **Chi phí thấp**: Sử dụng dịch vụ miễn phí của Google (Drive, Gmail).

### g) Hạn chế và giải pháp

**Hạn chế:**
- Phụ thuộc vào dịch vụ bên ngoài (Google Drive, Gmail)
- Giới hạn số lượng email gửi (500/ngày)
- Giới hạn dung lượng Google Drive (15GB miễn phí)

**Giải pháp:**
- Có backup plan: Lưu file trên server nếu Google Drive lỗi
- Sử dụng email queue để retry khi gửi thất bại
- Nâng cấp lên Google Workspace nếu cần dung lượng lớn hơn
- Tối ưu kích thước file (compress audio, resize image) trước khi upload
