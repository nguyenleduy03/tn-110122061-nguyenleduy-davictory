**CHƯƠNG 4: XÂY DỰNG VÀ TRIỂN KHAI HỆ THỐNG**

Chương này trình bày quá trình xây dựng hệ thống DAVictory IELTS dựa trên các kết quả phân tích và thiết kế ở Chương 3. Thay vì chỉ liệt kê các module đã hiện thực, chương tập trung vào các luồng kỹ thuật có giá trị nhất trong hệ thống: phân quyền nhiều vai trò, dựng đề thi nhiều tầng, làm bài với auto-save và resume, chấm bài có hỗ trợ AI, nhập đề bằng AI và vận hành bằng agent.

### 4.1. Môi trường phát triển

Hệ thống được xây dựng trên nền tảng bốn tầng gồm frontend React, backend Spring Boot, các AI microservices viết bằng FastAPI và lớp dữ liệu gồm MySQL, ChromaDB, Redis. Cách tổ chức này cho phép tách rõ ba nhóm trách nhiệm: giao diện và trải nghiệm người dùng, quản trị nghiệp vụ và phân quyền, các pipeline AI cần OCR, STT, retrieval và gọi LLM.

### 4.2. Cấu trúc mã nguồn

Backend tổ chức theo mô hình đa lớp `controller - service - repository - entity`, frontend tổ chức theo `pages - components - services - hooks`, còn các AI services tách thành từng ứng dụng độc lập với pipeline riêng. Điểm quan trọng của cấu trúc này không nằm ở số lượng file, mà ở khả năng tách biệt trách nhiệm: backend kiểm soát nghiệp vụ, frontend điều phối trải nghiệm và các AI service xử lý những tác vụ chuyên biệt khó thực hiện trực tiếp trong Java.

### 4.3. Luồng xác thực và phân quyền nhiều vai trò

Luồng xác thực được triển khai với ba nguyên tắc: JWT stateless, RBAC nhiều vai trò và hỗ trợ guest share link. Ở backend, `AuthController`, `JwtUtil`, `JwtAuthenticationFilter`, `SecurityConfig` và `CustomUserDetailsService` phối hợp để phát hành và kiểm tra token. Ở frontend, `authApi.js`, `ProtectedRoute.jsx` và `RoleBasedRoute.jsx` không chỉ giữ session mà còn chặn truy cập sai quyền ngay từ client.

Điểm đáng chú ý là hệ thống không chỉ có một đường vào duy nhất qua tài khoản đăng nhập. Ngoài luồng người dùng nội bộ (`Student`, `Teacher`, `Manager`, `Admin`), frontend còn hỗ trợ truy cập bài thi qua share link với query `?guest=1&share=TOKEN`. Khi đó, `ProtectedRoute` sẽ gọi API xác minh liên kết trước khi cho phép người dùng chưa đăng nhập vào bài thi. Luồng này phản ánh đúng nhu cầu thực tế của trung tâm: vừa quản lý người dùng nội bộ, vừa mở bài thi thử cho khách ngoài.

### 4.4. Quản lý người dùng và lớp học

Quản lý người dùng được xây dựng dựa trên các thực thể `User`, `Role`, `StudentProfile`, `TeacherProfile` và được mở rộng bằng mô hình lớp học `Center`, `Class`, `ClassStudent`, `ClassTeacher`. Mục tiêu không chỉ là CRUD tài khoản, mà là phản ánh đúng ngữ cảnh của trung tâm ngoại ngữ: một giáo viên có thể dạy nhiều lớp, một học viên có thể thuộc nhiều lớp theo thời điểm, và các quyền xem/chấm dữ liệu phải đi qua quan hệ lớp học này.

Một điểm triển khai có giá trị thực tế là import học viên hàng loạt từ CSV theo batch. Tính năng này giúp trung tâm chuyển đổi từ quản lý thủ công bằng bảng tính sang quản lý tập trung mà không phải nhập tay từng hồ sơ.

### 4.5. Luồng xây dựng đề thi và version hóa

Test Builder là module phức tạp nhất của hệ thống vì nó không chỉ lưu danh sách câu hỏi mà phải biểu diễn cấu trúc đề thi IELTS theo 5 cấp: `Test -> Session -> Part -> QuestionGroup -> Question`. Ở backend, `TestBuilderService.saveFullTest()` chịu trách nhiệm tạo hoặc cập nhật toàn bộ cây dữ liệu. Nếu giáo viên chỉnh sửa một `QuestionGroup` đã được dùng trong bài làm, service sẽ tạo nhóm mới thay vì ghi đè, nhằm tránh phá hỏng dữ liệu lịch sử.

Một quyết định kỹ thuật quan trọng là version hóa đề thi bằng `TestVersion` và snapshot JSON. Mỗi lần tạo version mới, hệ thống lưu lại trạng thái đầy đủ của đề để có thể đối chiếu và phục hồi về sau. Cách làm này phù hợp với bối cảnh thực tế khi giáo viên thường phải chỉnh sửa đề nhiều lần trước khi sử dụng chính thức.

Ở frontend, `TestBuilder.jsx` kết hợp với `testBuilderApi.js` để biến trạng thái biên soạn trực quan thành payload phù hợp với backend. Do đó, frontend không chỉ là nơi kéo thả giao diện, mà còn là lớp chuyển đổi schema giữa editor state và mô hình dữ liệu nhiều tầng của backend.

### 4.6. Luồng tổ chức thi và làm bài

Luồng làm bài được xây dựng xoay quanh ba thành phần: `Exam`, `ExamAttempt` và `FullTestProgress`. Khi người học bắt đầu bài thi, backend tạo `ExamAttempt` ở trạng thái đang làm, đồng thời chuẩn bị các cấu trúc lưu đáp án và tiến trình. Trong quá trình làm bài, frontend định kỳ gửi dữ liệu auto-save; khi người dùng tải lại trang hoặc mất kết nối ngắn hạn, tiến trình có thể được khôi phục từ `FullTestProgress`.

Mỗi kỹ năng có giao diện riêng vì đặc điểm thao tác khác nhau:

- `IeltsReadingTest.jsx` tập trung vào passage, highlight, note và điều hướng câu hỏi;
- `IeltsListeningTest.jsx` bổ sung điều khiển audio;
- `IeltsWritingTest.jsx` tập trung vào editor và word count;
- `IeltsSpeakingTest.jsx` tích hợp ghi âm và quản lý phiên trả lời.

Điểm có giá trị kỹ thuật ở đây là backend chấm tự động Listening/Reading, còn frontend giữ vai trò dựng lại cấu trúc đề từ dữ liệu tải về và duy trì trải nghiệm làm bài xuyên suốt, kể cả trong chế độ full test hoặc guest mode.

### 4.7. Luồng chấm Writing

Writing được triển khai theo ba nhánh: nộp bài, chấm tay và AI hỗ trợ chấm. `WritingService` phụ trách lưu bài nộp, rubric chấm và lịch sử chấm. Giáo viên có thể chấm trực tiếp theo bốn tiêu chí IELTS hoặc gọi AI để lấy điểm gợi ý rồi duyệt lại.

Luồng AI Writing được xây dựng theo kiểu hỗ trợ nghiệp vụ thay vì thay thế giáo viên hoàn toàn:

1. kiểm tra quota;
2. kiểm tra cache;
3. phân loại task;
4. kiểm tra số từ và áp dụng band cap cục bộ nếu bài quá ngắn;
5. retrieval trên ChromaDB;
6. tạo prompt từ rubric;
7. gọi LLM;
8. parse và chuẩn hóa kết quả;
9. giáo viên xem, duyệt hoặc chỉnh sửa.

Điểm mạnh của cách triển khai này là giữ được mô hình human-in-the-loop. AI giúp giảm tải thời gian chấm, nhưng quyết định cuối cùng vẫn thuộc về giáo viên.

### 4.8. Luồng Speaking và luyện nói AI

Speaking được xây dựng theo hai hình thức: thi chính thức và luyện tập có AI hỗ trợ. Backend quản lý `SpeakingSession`, `SpeakingTurn` và các endpoint chấm điểm; AI Speaking service phụ trách sinh câu hỏi, STT, phân tích đặc trưng và gợi ý band score.

Luồng xử lý chính gồm:

1. tạo phiên nói;
2. sinh câu hỏi theo part;
3. ghi âm câu trả lời;
4. chuyển giọng nói thành văn bản;
5. trích xuất các đặc trưng như số từ, TTR, hesitation và speech rate;
6. gọi mô hình để chấm bốn tiêu chí.

Cách triển khai này giúp hệ thống vừa hỗ trợ thi Speaking có cấu trúc, vừa cung cấp môi trường tự luyện cho học viên mà không cần giáo viên có mặt ở mọi lần luyện tập.

### 4.9. Luồng AI Import

AI Import là một trong những phần thể hiện rõ nhất giá trị ứng dụng của dự án. Luồng này giải quyết bài toán giáo viên đang có đề ở dạng giấy, PDF hoặc DOCX nhưng cần đưa vào ngân hàng đề số mà không nhập tay từng câu.

Pipeline được triển khai theo ba bước:

1. **Parse:** đọc nội dung từ PDF, DOCX hoặc OCR từ ảnh;
2. **Structure:** dùng LLM hoặc heuristic fallback để chia nội dung thành section, question, answer, passage;
3. **Create:** map cấu trúc đó sang payload đề thi và gửi về backend để tạo `Test`.

Frontend `AITestImport.jsx` đóng vai trò wizard nhiều bước, cho phép người dùng xem preview trước khi tạo đề thật. Đây là điểm quan trọng vì nó giảm rủi ro tạo sai hàng loạt dữ liệu trong ngân hàng đề.

### 4.10. Luồng AI Agent và hỗ trợ vận hành

AI Agent được xây dựng như một lớp hỗ trợ vận hành cho quản lý và quản trị viên, thay vì chỉ là chatbot hỏi đáp đơn giản. Hệ thống gồm một orchestrator và bốn nhóm tác vụ chính: tạo nội dung, tra cứu thông tin, sinh báo cáo và email.

Điểm kỹ thuật nổi bật của luồng này là:

- phân loại intent để chọn agent phù hợp;
- hỗ trợ SSE streaming để hiển thị phản hồi dạng gõ chữ;
- có bước phê duyệt thủ công (`human-in-the-loop`) trước các hành động quan trọng;
- tách phần chat, content và report trên giao diện `AgentWorkspace`.

Nhờ đó, DAVictory không chỉ là hệ thống luyện thi mà còn mở rộng sang hướng hỗ trợ vận hành trung tâm bằng AI.

### 4.11. Assignment, Guest Exam và logic nằm ở frontend

Assignment cho phép giáo viên giao bài theo dạng bài test hoặc bài thủ công, đồng thời theo dõi nộp trễ qua trạng thái `LATE`. Guest Exam cho phép người dùng ngoài hệ thống làm bài thi thử thông qua `TestShareLink` mà không cần tài khoản nội bộ.

Hai module này cho thấy một đặc điểm quan trọng của dự án: frontend giữ vai trò điều phối nhiều hơn so với một lớp giao diện thuần túy. `ProtectedRoute` xử lý guest flow, còn một số màn hình LMS như `LmsGradeSubmission` có cơ chế fallback endpoint để chấp nhận khác biệt giữa các môi trường triển khai. Đây là dấu hiệu cho thấy hệ thống đã được nghĩ tới trong bối cảnh vận hành thực tế, không chỉ ở mức prototype.

### 4.12. File Upload và tích hợp dịch vụ ngoài

Hệ thống tích hợp Google Drive API OAuth 2.0 để lưu trữ file. Frontend upload trực tiếp thay vì đi qua backend proxy, giúp giảm tải cho server Java và cho phép theo dõi tiến trình tải lên theo thời gian thực. Backend chỉ giữ vai trò cung cấp cấu hình và lưu metadata qua `MediaFile`.

### 4.13. Một số giao diện chính

Hệ thống có các giao diện chính: trang chủ, đăng nhập, dashboard học viên, làm bài Reading/Listening/Writing/Speaking, Test Builder, LMS Teacher Dashboard, chấm Writing, quản lý người dùng, AI Agent Workspace và trang kết quả bài thi (hình ảnh thực tế được đưa vào Phụ lục B).

| Hình | Nội dung |
|------|----------|
| Hình 4.1 | Trang chủ |
| Hình 4.2 | Trang đăng nhập |
| Hình 4.3 | Trang làm bài Reading |
| Hình 4.4 | Trang làm bài Listening |
| Hình 4.5 | Trang làm bài Writing |
| Hình 4.6 | Trang làm bài Speaking |
| Hình 4.7 | Test Builder |
| Hình 4.8 | LMS Teacher Dashboard |
| Hình 4.9 | Trang chấm Writing |
| Hình 4.10 | Trang quản lý người dùng |
| Hình 4.11 | AI Agent Workspace |
| Hình 4.12 | Pipeline chấm điểm Writing (11 bước) |
| Hình 4.13 | Pipeline đánh giá Speaking (6 bước) |
| Hình 4.14 | Pipeline AI Import (3 bước) |
| Hình 4.15 | Quy trình Blog Wizard |

### Tóm tắt chương 4

Chương 4 đã trình bày quá trình xây dựng hệ thống DAVictory IELTS theo các luồng kỹ thuật tiêu biểu thay vì chỉ liệt kê module. Trọng tâm của chương là cơ chế xác thực nhiều vai trò, luồng dựng đề thi và version hóa, làm bài với auto-save và resume, chấm Writing theo mô hình human-in-the-loop, luyện Speaking với STT và scoring, AI Import theo pipeline `parse -> structure -> create`, cùng AI Agent phục vụ vận hành trung tâm. Qua đó có thể thấy hệ thống không chỉ là một website luyện thi, mà là một nền tảng tích hợp giữa quản trị đào tạo, ngân hàng đề và các dịch vụ AI hỗ trợ nghiệp vụ.
