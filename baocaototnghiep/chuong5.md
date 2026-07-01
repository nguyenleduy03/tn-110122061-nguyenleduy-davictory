**CHƯƠNG 5: KIỂM THỬ VÀ ĐÁNH GIÁ**

Chương này trình bày quá trình kiểm thử hệ thống DAVictory IELTS nhằm đánh giá không chỉ mức độ hoàn thiện của các chức năng, mà còn cả độ tin cậy của các luồng tích hợp giữa frontend, backend và các AI service. Khác với cách đánh giá chỉ dựa trên số lượng test case đạt, chương này tập trung vào ba câu hỏi: hệ thống có chạy đúng theo nghiệp vụ hay không, các luồng phối hợp nhiều thành phần có ổn định hay không, và các giới hạn kỹ thuật hiện tại nằm ở đâu.

### 5.1. Mục tiêu kiểm thử

Quá trình kiểm thử hướng đến ba nhóm mục tiêu chính:

- **Kiểm thử chức năng:** Xác nhận các chức năng cốt lõi như xác thực, quản lý người dùng, tạo đề thi, làm bài, chấm bài, giao bài tập và upload file hoạt động đúng theo yêu cầu.
- **Kiểm thử tích hợp:** Đánh giá các luồng có nhiều thành phần phối hợp như frontend route guard với backend share-link validation, làm bài thi với auto-save và resume, AI Import với pipeline parse -> structure -> create, AI Agent với SSE streaming và các bước phê duyệt.
- **Đánh giá giới hạn hệ thống:** Xác định những điểm hệ thống chưa mạnh như thiếu test tự động, phụ thuộc API bên thứ ba, độ bao phủ benchmark AI còn mỏng, và một số cấu hình nội bộ chưa siết chặt.

### 5.2. Phạm vi và phương pháp kiểm thử

Kiểm thử được thực hiện chủ yếu bằng phương pháp thủ công kết hợp Swagger UI, Postman và chạy thử trực tiếp trên giao diện web. Việc lựa chọn kiểm thử thủ công là phù hợp với giai đoạn hiện tại của đề tài vì nhiều chức năng cần kiểm tra liên màn hình, liên dịch vụ và có sự tham gia của AI. Tuy nhiên, cách tiếp cận này cũng làm giảm khả năng hồi quy tự động khi hệ thống thay đổi.

Phạm vi gồm 14 nhóm với 96 test case:

| Nhóm | Module | Số TC | Phương pháp |
|------|--------|-------|-------------|
| 1 | Xác thực và phân quyền | 12 | Thủ công + Swagger |
| 2 | Quản lý người dùng | 10 | Thủ công + Swagger |
| 3 | Quản lý lớp học | 6 | Thủ công |
| 4 | Xây dựng đề thi | 12 | Thủ công |
| 5 | Làm bài thi | 10 | Thủ công |
| 6 | Writing | 8 | Thủ công |
| 7 | Speaking | 6 | Thủ công |
| 8 | Assignment | 8 | Thủ công |
| 9 | AI Import | 4 | Thủ công |
| 10 | AI Agent | 4 | Thủ công |
| 11 | Guest Exam | 4 | Thủ công |
| 12 | File Upload | 3 | Thủ công |
| 13 | AI Writing Accuracy | 5 | So sánh benchmark |
| 14 | Xử lý lỗi và ngoại lệ | 4 | Thủ công |
| **Tổng** | **14 nhóm** | **96** | |

Ở thời điểm viết báo cáo, hệ thống chưa có bộ kiểm thử tự động hoàn chỉnh. Backend mới có kiểm thử ở mức tối thiểu, frontend chưa có bộ test giao diện hoặc integration test đầy đủ, còn AI Writing chỉ có một số test file cục bộ. Vì vậy, kết quả kiểm thử trong chương này cần được hiểu là bằng chứng vận hành và kiểm tra tích hợp ở mức ứng dụng thực tế, chưa phải bằng chứng chất lượng phần mềm theo chuẩn CI/CD hoàn chỉnh.

### 5.3. Kiểm thử chức năng

#### 5.3.1. Xác thực và phân quyền

Nhóm kiểm thử này tập trung vào đăng ký, đăng nhập, truy cập API không token, truy cập sai quyền và hết hạn token. Kết quả cho thấy cơ chế JWT và RBAC hoạt động đúng ở mức route-level: người dùng không có token bị chặn, người dùng role thấp không truy cập được các route yêu cầu `TEACHER`, `MANAGER` hoặc `ADMIN`.

Một điểm đáng chú ý là kiểm thử không chỉ dừng ở backend. Frontend cũng được kiểm tra qua các route guard như `ProtectedRoute` và `RoleBasedRoute`, bảo đảm các màn hình quản trị không bị hiển thị sai quyền ngay từ phía client.

#### 5.3.2. Quản lý đề thi và làm bài

Nhóm kiểm thử này xác nhận các luồng chính:

- tạo đề mới;
- thêm session, part, question group và câu hỏi;
- lưu đề ở trạng thái nháp;
- xuất bản đề;
- xem lịch sử version;
- bắt đầu attempt, lưu đáp án, nộp bài;
- tự động chấm Listening/Reading;
- tự động nộp khi hết thời gian;
- khôi phục tiến trình từ `FullTestProgress`.

Tất cả các ca chức năng chính đều đạt. Điều này cho thấy mô hình dữ liệu nhiều tầng của Test Builder và luồng thi trực tuyến đã vận hành đúng ở mức nghiệp vụ.

#### 5.3.3. Writing, Speaking, Assignment và File Upload

Các ca kiểm thử chức năng cho Writing và Speaking bao gồm:

- nộp bài Writing;
- chấm tay theo 4 tiêu chí;
- gọi AI grading;
- ghi âm Speaking;
- chấm Speaking;
- giao bài tập, nộp bài, phát hiện nộp trễ;
- upload file và lấy liên kết truy cập.

Kết quả nhìn chung đạt yêu cầu. Riêng Writing cho thấy một ràng buộc nghiệp vụ đáng giá đã hoạt động đúng: bài viết quá ngắn bị khống chế band theo luật cục bộ trước khi trả kết quả AI.

### 5.4. Kiểm thử tích hợp

Đây là phần quan trọng nhất của chương đánh giá vì DAVictory không phải hệ thống đơn khối đơn giản, mà là tập hợp nhiều lớp phối hợp với nhau.

#### 5.4.1. Guest share link và route guard nhiều lớp

Luồng guest exam được kiểm thử theo kịch bản:

1. giáo viên tạo share link cho đề thi;
2. người dùng chưa đăng nhập truy cập URL dạng `?guest=1&share=TOKEN`;
3. frontend kiểm tra đây có phải test route hay không;
4. frontend gọi API xác minh share link;
5. nếu token hợp lệ thì cho vào bài thi, nếu không hợp lệ thì chuyển sang trang báo link hết hạn.

Ca kiểm thử này có ý nghĩa vì nó chứng minh hệ thống dùng đồng thời hai lớp điều kiện: kiểm tra client-side ở `ProtectedRoute` và xác minh backend ở API share-link. Đây là một luồng tích hợp thực tế, phức tạp hơn nhiều so với kiểm tra JWT thông thường.

#### 5.4.2. Auto-save, resume và nộp bài

Luồng làm bài được kiểm thử ở các bước:

1. bắt đầu bài thi;
2. trả lời một phần câu hỏi;
3. chờ chu kỳ auto-save;
4. tải lại trang hoặc ngắt phiên;
5. khôi phục tiến trình;
6. nộp bài hoặc để hệ thống tự nộp khi hết giờ.

Kết quả cho thấy hệ thống duy trì được cả lưu cục bộ ở frontend và lưu tiến trình lên backend. Đây là minh chứng quan trọng cho khả năng sử dụng trong môi trường mạng không ổn định, vốn rất phổ biến với bài thi trực tuyến.

#### 5.4.3. Luồng chấm Writing với cơ chế fallback

Trong giao diện chấm bài LMS, frontend trước hết thử gọi endpoint cập nhật điểm cho `ExamAttempt`. Nếu môi trường hiện tại trả `404` hoặc `405`, frontend sẽ fallback sang endpoint chấm Writing riêng. Ca kiểm thử này cho thấy hệ thống không chỉ được xây dựng theo hướng lý tưởng, mà còn có cơ chế tương thích khi các môi trường triển khai chưa đồng nhất hoàn toàn.

Ý nghĩa của ca này nằm ở chỗ nó phản ánh trải nghiệm vận hành thực tế: người dùng vẫn hoàn thành việc chấm bài ngay cả khi endpoint chính không khả dụng theo đúng kỳ vọng ban đầu.

#### 5.4.4. Luồng AI Import

AI Import được kiểm thử theo chuỗi:

1. upload tệp PDF/DOCX/ảnh;
2. parse nội dung thô;
3. structure bằng LLM hoặc heuristic fallback;
4. preview kết quả;
5. tạo đề trong backend.

Đây là ca tích hợp có độ khó cao vì phụ thuộc đồng thời vào đọc tệp, OCR, gọi mô hình và ánh xạ dữ liệu sang schema đề thi của hệ thống. Việc ca kiểm thử này đạt cho thấy kiến trúc `parse -> structure -> create` là hợp lý và có tính thực dụng cao.

#### 5.4.5. Luồng AI Agent

Các ca kiểm thử Agent tập trung vào:

- gửi truy vấn thông tin;
- tạo nội dung blog;
- sinh báo cáo;
- stream phản hồi theo SSE.

Các ca này đạt ở mức chức năng, nhưng kết quả cũng cho thấy một giới hạn quan trọng: agent hiện hoạt động được ở vai trò trợ lý vận hành, song độ ổn định đầu ra vẫn phụ thuộc lớn vào nhà cung cấp LLM và dữ liệu đầu vào.

### 5.5. Đánh giá định lượng kết quả

| Nhóm | Số TC | Đạt | Chưa đạt | Tỉ lệ |
|------|-------|-----|----------|-------|
| Xác thực và phân quyền | 12 | 12 | 0 | 100% |
| Quản lý người dùng | 10 | 10 | 0 | 100% |
| Quản lý lớp học | 6 | 6 | 0 | 100% |
| Xây dựng đề thi | 12 | 12 | 0 | 100% |
| Làm bài thi | 10 | 10 | 0 | 100% |
| Writing | 8 | 8 | 0 | 100% |
| Speaking | 6 | 6 | 0 | 100% |
| Assignment | 8 | 8 | 0 | 100% |
| AI Import | 4 | 4 | 0 | 100% |
| AI Agent | 4 | 4 | 0 | 100% |
| Guest Exam | 4 | 4 | 0 | 100% |
| File Upload | 3 | 3 | 0 | 100% |
| AI Writing Accuracy | 5 | 5 | 0 | 100% |
| Xử lý lỗi và ngoại lệ | 4 | 1 | 3 | 25% |
| **Tổng** | **96** | **93** | **3** | **96,9%** |

Tỉ lệ 96,9% cho thấy hệ thống đạt mức hoàn thiện chức năng cao đối với các nghiệp vụ chính. Tuy nhiên, con số này không nên được diễn giải là hệ thống đã hoàn thiện toàn diện. Lý do là phần lớn test case đạt nằm ở nhóm chức năng và luồng tích hợp hẹp, trong khi nhóm xử lý lỗi và ngoại lệ lại có tỉ lệ đạt thấp. Điều này cho thấy điểm mạnh của hệ thống hiện nằm ở việc thực thi đúng các luồng sử dụng chuẩn, còn khả năng chịu lỗi và tự phục hồi vẫn cần được cải thiện thêm.

### 5.6. Đánh giá ưu điểm

#### 5.6.1. Ưu điểm về kiến trúc và nghiệp vụ

Hệ thống có kiến trúc phân lớp rõ ràng giữa frontend, backend, AI services và dữ liệu. Về nghiệp vụ, các điểm mạnh đáng ghi nhận là:

- mô hình hóa đề thi theo cấu trúc 5 cấp, phù hợp với bản chất của bài thi IELTS;
- tách biệt giữa `Test`, `Exam`, `ExamAttempt` và các luồng nộp/chấm Writing, giúp hệ thống không bị ép vào một cấu trúc dữ liệu đơn giản hóa quá mức;
- hỗ trợ version hóa đề thi, auto-save, timeout và resume, là những chức năng có giá trị sử dụng thực tế cao;
- duy trì song song hai luồng truy cập: người dùng đăng nhập và khách làm bài qua share link.

#### 5.6.2. Ưu điểm về tích hợp AI

Về AI, hệ thống không chỉ gắn LLM như một tiện ích bổ sung, mà đã tích hợp AI vào nhiều khâu có giá trị nghiệp vụ:

- Writing dùng retrieval kết hợp rubric và LLM để hỗ trợ chấm;
- Speaking dùng STT, phân tích đặc trưng và LLM scoring;
- AI Import giúp chuyển đề giấy thành đề số;
- AI Agent hỗ trợ tra cứu thông tin, tạo nội dung và sinh báo cáo.

Điểm mạnh ở đây là cách tiếp cận thực dụng: dùng AI như lớp hỗ trợ cho nghiệp vụ trung tâm, thay vì để AI thay thế hoàn toàn quyết định của giáo viên hoặc quản trị viên.

### 5.7. Hạn chế còn tồn tại

Đối chiếu với mã nguồn hiện tại, hệ thống còn một số hạn chế đáng chú ý:

- **Thiếu kiểm thử tự động:** backend mới có kiểm thử ở mức tối thiểu, frontend chưa có bộ test giao diện hoặc integration test đầy đủ.
- **Nhóm xử lý lỗi còn yếu:** 3/4 ca lỗi và ngoại lệ chưa đạt, cho thấy hệ thống còn nhạy với các tình huống bất thường như timeout, OCR đầu vào kém chất lượng hoặc dịch vụ phụ trợ không sẵn sàng.
- **Giới hạn trong AI Writing:** retrieval đã có nhưng mức độ augmentation vào prompt chưa mạnh; benchmark đánh giá mới dựa trên 5 bài mẫu nên chưa đủ để kết luận chắc về độ chính xác tổng quát.
- **Giới hạn trong AI Speaking:** chất lượng chấm phụ thuộc vào STT và chưa phải hệ thống chuyên biệt về đánh giá phát âm sâu.
- **Giới hạn trong AI Agent:** dù đã có worker và message queue, một số luồng vẫn thực thi trực tiếp từ request, nên tính bất đồng bộ chưa hoàn toàn trọn vẹn.
- **Rủi ro cấu hình nội bộ:** trong cấu hình bảo mật hiện tại, nhóm `/api/internal/**` đang được cho phép rộng (`permitAll`), đây là điểm cần được xem xét lại nếu triển khai production ở quy mô lớn.
- **Phụ thuộc dịch vụ bên thứ ba:** hệ thống phụ thuộc vào Groq, OpenAI, NVIDIA, Google Drive và các API ngoài; khi các dịch vụ này gặp lỗi hoặc thay đổi quota, chất lượng vận hành có thể bị ảnh hưởng.

Những hạn chế này không phủ nhận giá trị của hệ thống, nhưng cần được nêu rõ để giữ tính học thuật và khách quan cho báo cáo.

### 5.8. Hướng phát triển

Từ các kết quả kiểm thử và đánh giá trên, các hướng phát triển hợp lý cho giai đoạn tiếp theo gồm:

- bổ sung unit test, integration test và pipeline CI/CD;
- tăng độ bao phủ benchmark cho AI Writing và AI Speaking bằng tập dữ liệu lớn hơn;
- siết chặt bảo mật cho các endpoint nội bộ;
- hoàn thiện cơ chế queue/worker cho AI Agent theo hướng bất đồng bộ hoàn toàn;
- cải thiện xử lý lỗi ở các luồng AI Import, timeout và dịch vụ ngoài;
- bổ sung cache phân tán, thông báo thời gian thực, ứng dụng di động và thanh toán trực tuyến khi hệ thống mở rộng.

### Tóm tắt chương 5

Chương 5 đã đánh giá hệ thống DAVictory theo ba lớp: chức năng, tích hợp và giới hạn kỹ thuật. Kết quả 93/96 test case đạt cho thấy hệ thống đã vận hành tốt ở các luồng chính như xác thực, tạo đề, làm bài, chấm bài và nhập đề bằng AI. Tuy nhiên, nhóm xử lý lỗi còn yếu, kiểm thử tự động chưa đầy đủ, và các thành phần AI vẫn còn những giới hạn cần được nhìn nhận thẳng thắn. Nhờ cách đánh giá này, chương 5 không chỉ chứng minh hệ thống đã chạy được, mà còn chỉ ra rõ hệ thống đang mạnh ở đâu, yếu ở đâu và cần phát triển tiếp theo hướng nào.

### Tài liệu tham khảo

[1] British Council. "IELTS Information for Candidates." https://www.ielts.org, truy cập 2026.
[2] Spring Boot Reference Documentation. https://docs.spring.io/spring-boot/index.html, truy cập 2026.
[3] React Documentation. https://react.dev, truy cập 2026.
[4] FastAPI Documentation. https://fastapi.tiangolo.com, truy cập 2026.
[5] MySQL Documentation. https://dev.mysql.com/doc, truy cập 2026.
[6] JWT.io. "JSON Web Tokens." https://jwt.io, truy cập 2026.
[7] ChromaDB Documentation. https://docs.trychroma.com, truy cập 2026.
[8] Groq API Documentation. https://console.groq.com/docs, truy cập 2026.
[9] OpenAI API Documentation. https://platform.openai.com/docs, truy cập 2026.
[10] Google Drive API. https://developers.google.com/drive, truy cập 2026.
[11] Spring Data JPA Reference. https://docs.spring.io/spring-data/jpa, truy cập 2026.
[12] Spring Security Reference. https://docs.spring.io/spring-security, truy cập 2026.
[13] Docker Documentation. https://docs.docker.com, truy cập 2026.
[14] Lombok Project. https://projectlombok.org, truy cập 2026.
[15] Axios Documentation. https://axios-http.com, truy cập 2026.
