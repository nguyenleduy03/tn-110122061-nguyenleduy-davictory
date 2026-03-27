# Tóm tắt: Tích hợp Guest Exam Feature

## ✅ Đã hoàn thành

### Backend (Java Spring Boot)

1. **Entity mới:**
   - `GuestExamAttempt.java` - Entity lưu bài thi của khách

2. **Repository:**
   - `GuestExamAttemptRepository.java` - Truy vấn database

3. **DTOs:**
   - `GuestExamStartRequest.java` - Request bắt đầu làm bài
   - `GuestExamSubmitRequest.java` - Request nộp bài
   - `GuestExamResponse.java` - Response trả về

4. **Service:**
   - `GuestExamService.java` - Logic xử lý bài thi guest
     - Tự động chấm điểm Listening/Reading
     - Tính band score theo chuẩn IELTS
     - Lưu câu trả lời dạng JSON

5. **Controller:**
   - `GuestExamController.java` - API endpoints cho guest
     - `POST /api/guest/exam-attempts/start`
     - `POST /api/guest/exam-attempts/{id}/submit`

6. **Security:**
   - Cập nhật `SecurityConfig.java` - Cho phép `/api/guest/**` không cần authentication

7. **Database:**
   - `create_guest_exam_attempts.sql` - Migration tạo bảng mới

### Frontend (React)

1. **Components:**
   - `GuestInfoForm.jsx` - Form nhập thông tin cho khách
   - `withExamAuth.jsx` - HOC xử lý logic Guest vs Authenticated

2. **Styles:**
   - `guestForm.css` - CSS cho form thông tin

3. **Services:**
   - Cập nhật `ieltsApi.js`:
     - `isAuthenticated()` - Check user đã đăng nhập chưa
     - `startGuestAttempt()` - API bắt đầu làm bài cho guest
     - `submitGuestAttempt()` - API nộp bài cho guest
     - `guestFetch()` - Helper fetch không cần auth

4. **Documentation:**
   - `GUEST_EXAM_GUIDE.md` - Hướng dẫn chi tiết tích hợp

## 📋 Cần làm tiếp

### 1. Chạy SQL Migration
```bash
# Kết nối MySQL và chạy:
mysql -u [username] -p [database_name] < create_guest_exam_attempts.sql
```

### 2. Restart Backend
```bash
./stop.sh
./start.sh
```

### 3. Tích hợp vào các trang làm bài

**Cách 1: Dùng HOC (Khuyến nghị)**

Ví dụ với `IeltsListeningTest.jsx`:

```jsx
import withExamAuth from '../components/common/withExamAuth';

const IeltsListeningTest = ({ guestInfo, isGuest }) => {
  // Existing code...
  
  // Thêm logic xử lý guest
  const startExam = async () => {
    if (isGuest) {
      const attempt = await ieltsApi.startGuestAttempt(
        guestInfo, 
        testId, 
        'LISTENING'
      );
      setAttemptId(attempt.id);
    } else {
      // Existing authenticated logic
      const attempt = await ieltsApi.submitExamAttempt(...);
    }
  };
  
  const submitExam = async () => {
    if (isGuest) {
      await ieltsApi.submitGuestAttempt(attemptId, timeSpent, answers);
    } else {
      // Existing authenticated logic
    }
  };
};

export default withExamAuth(IeltsListeningTest, 'LISTENING');
```

**Áp dụng tương tự cho:**
- `IeltsReadingTest.jsx`
- `IeltsWritingTest.jsx`
- `IeltsSpeakingTest.jsx`

### 4. Cập nhật UI

Thêm indicator hiển thị Guest mode:

```jsx
{isGuest && (
  <div className="guest-indicator">
    <User size={16} />
    Khách: {guestInfo.fullName}
  </div>
)}
```

### 5. Xử lý kết quả

Guest chỉ xem kết quả ngay sau khi nộp, không lưu vào history:

```jsx
if (isGuest) {
  // Hiển thị kết quả trực tiếp
  navigate('/test-complete', { 
    state: { result, isGuest: true } 
  });
} else {
  // Lưu vào history và redirect
  navigate('/dashboard/history');
}
```

## 🔍 Testing Checklist

- [ ] Guest có thể làm bài Listening
- [ ] Guest có thể làm bài Reading
- [ ] Guest có thể làm bài Writing
- [ ] Guest có thể làm bài Speaking
- [ ] Tự động chấm điểm Listening/Reading
- [ ] Hiển thị band score đúng
- [ ] User đã đăng nhập vẫn hoạt động bình thường
- [ ] Form validation hoạt động
- [ ] Guest info được lưu trong session
- [ ] Kết quả được lưu vào database

## 🎯 Luồng hoạt động

### Guest Flow:
1. Truy cập trang làm bài (không đăng nhập)
2. Form thông tin hiện ra
3. Điền họ tên (bắt buộc), email, phone (tùy chọn)
4. Bắt đầu làm bài
5. Nộp bài
6. Xem kết quả ngay lập tức
7. Không lưu vào history

### Authenticated Flow:
1. Đăng nhập
2. Truy cập trang làm bài
3. Bắt đầu làm bài (không cần form)
4. Nộp bài
5. Kết quả lưu vào profile
6. Có thể xem lại trong history

## 📊 Database Schema

```
guest_exam_attempts
├── id (PK)
├── full_name (NOT NULL)
├── email
├── phone
├── test_id (FK -> tests)
├── session_id (FK -> sessions)
├── status (IN_PROGRESS, SUBMITTED, GRADED)
├── started_at
├── submitted_at
├── time_limit_seconds
├── time_spent_seconds
├── total_answered
├── total_correct
├── raw_score
├── band_score
├── answers_json (TEXT)
└── created_at
```

## 🔐 Security

- Guest endpoints: `/api/guest/**` - Không cần authentication
- User endpoints: `/api/exam-attempts/**` - Cần JWT token
- Guest data tách biệt với user data
- Không thể truy vấn guest data từ user endpoints

## 📝 Notes

- Guest info lưu trong `sessionStorage` (mất khi đóng tab)
- Authenticated user info lưu trong `localStorage` (persistent)
- Auto-grading chỉ cho Listening/Reading
- Writing/Speaking cần teacher chấm thủ công
