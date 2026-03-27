# Hướng dẫn tích hợp Guest Exam

## Tổng quan
Hệ thống hiện hỗ trợ 2 loại người dùng làm bài thi:
1. **Khách (Guest)**: Không cần đăng nhập, chỉ điền form thông tin
2. **Sinh viên có tài khoản**: Đăng nhập và làm bài

## Backend Setup

### 1. Chạy migration SQL
```bash
mysql -u root -p davictory < create_guest_exam_attempts.sql
```

### 2. Restart backend
```bash
./stop.sh
./start.sh
```

## Frontend Integration

### Cách 1: Sử dụng HOC (Recommended)

Wrap component trang làm bài với `withExamAuth`:

```jsx
// IeltsListeningTest.jsx
import withExamAuth from '../components/common/withExamAuth';

const IeltsListeningTest = ({ guestInfo, isGuest }) => {
  // Component code...
  
  // Khi submit, check isGuest để gọi API phù hợp
  const handleSubmit = async () => {
    if (isGuest) {
      // Gọi guest API
      const result = await ieltsApi.submitGuestAttempt(attemptId, timeSpent, answers);
    } else {
      // Gọi authenticated API
      const result = await ieltsApi.submitExamAttempt(attemptId, timeSpent, answers);
    }
  };
};

export default withExamAuth(IeltsListeningTest, 'LISTENING');
```

### Cách 2: Tích hợp thủ công

```jsx
import { useState, useEffect } from 'react';
import GuestInfoForm from '../components/common/GuestInfoForm';
import { ieltsApi } from '../services/ieltsApi';

const YourExamPage = () => {
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestInfo, setGuestInfo] = useState(null);

  useEffect(() => {
    const isAuth = ieltsApi.isAuthenticated();
    if (!isAuth) {
      setShowGuestForm(true);
    }
  }, []);

  if (showGuestForm) {
    return <GuestInfoForm onSubmit={(data) => {
      setGuestInfo(data);
      setShowGuestForm(false);
    }} />;
  }

  // Render exam component
};
```

## API Endpoints

### Guest APIs (không cần authentication)

**Start Attempt:**
```
POST /api/guest/exam-attempts/start
Body: {
  "fullName": "Nguyễn Văn A",
  "email": "email@example.com",  // optional
  "phone": "0912345678",          // optional
  "testId": 1,
  "skillType": "LISTENING",
  "timeLimitSeconds": 2400
}
```

**Submit Attempt:**
```
POST /api/guest/exam-attempts/{attemptId}/submit
Body: {
  "timeSpentSeconds": 2100,
  "answers": [
    {
      "questionId": 1,
      "selectedOptionLabel": "A",
      "textAnswer": null,
      "matchingAnswer": null,
      "isFlagged": false
    }
  ]
}
```

### Authenticated APIs (cần JWT token)

Giữ nguyên như cũ:
- `POST /api/exam-attempts/start`
- `POST /api/exam-attempts/{id}/submit`

## Cách phân biệt Guest vs User

### Trong component:
```jsx
const isGuest = !ieltsApi.isAuthenticated();

// Hoặc nếu dùng HOC
const { isGuest, guestInfo } = props;
```

### Khi gọi API:
```jsx
if (isGuest) {
  // Start guest attempt
  const attempt = await ieltsApi.startGuestAttempt(
    guestInfo, 
    testId, 
    skillType
  );
  
  // Submit guest attempt
  await ieltsApi.submitGuestAttempt(
    attempt.id, 
    timeSpent, 
    answers
  );
} else {
  // Start authenticated attempt
  const attempt = await ieltsApi.submitExamAttempt(
    testId,
    skillType,
    timeSpent,
    answers
  );
}
```

## Lưu ý

1. **Guest info được lưu trong sessionStorage** - sẽ mất khi đóng tab
2. **Guest không thể xem lại lịch sử bài làm** - chỉ xem kết quả ngay sau khi nộp
3. **Auto-grading chỉ áp dụng cho Listening/Reading** - Writing/Speaking cần giáo viên chấm
4. **Guest data được lưu riêng** trong bảng `guest_exam_attempts`

## Testing

### Test Guest Flow:
1. Logout (hoặc xóa authToken trong localStorage)
2. Truy cập trang làm bài: `/test/listening/1`
3. Form thông tin sẽ hiện ra
4. Điền thông tin và bắt đầu làm bài
5. Nộp bài và xem kết quả

### Test Authenticated Flow:
1. Login với tài khoản
2. Truy cập trang làm bài
3. Không hiện form, vào thẳng bài thi
4. Kết quả được lưu vào profile

## Troubleshooting

**Lỗi: "AUTH_REQUIRED"**
- Kiểm tra SecurityConfig đã permit `/api/guest/**`
- Kiểm tra frontend đang gọi đúng endpoint guest

**Form không hiện:**
- Check `ieltsApi.isAuthenticated()` trả về đúng
- Check sessionStorage có `guestExamInfo` không

**Không lưu được kết quả:**
- Check bảng `guest_exam_attempts` đã tạo chưa
- Check foreign key constraints (test_id, session_id)
