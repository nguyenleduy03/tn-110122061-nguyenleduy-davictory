# 🔍 LOGIC LỌC BÀI THI CHO GIÁO VIÊN

## 📋 TỔNG QUAN

Hệ thống lọc bài thi cho phép giáo viên tìm kiếm và quản lý bài làm của học viên với nhiều tiêu chí.

---

## 🎯 TÍNH NĂNG

### 1. Lọc theo:
- **Lớp học** (classId)
- **Học viên** (studentId)
- **Đề thi** (testId)
- **Kỹ năng** (LISTENING, READING, WRITING, SPEAKING)
- **Trạng thái** (IN_PROGRESS, SUBMITTED, GRADED, TIMED_OUT)
- **Khoảng thời gian** (startDate, endDate)
- **Điểm số** (minBandScore, maxBandScore)

### 2. Sắp xếp:
- Theo ngày nộp (submittedAt)
- Theo điểm số (bandScore)
- Theo ngày tạo (createdAt)
- Tăng dần / Giảm dần

### 3. Phân trang:
- Page (trang hiện tại)
- Size (số bài/trang, mặc định 20)

---

## 🔐 PHÂN QUYỀN

### Teacher:
- Xem bài của học viên trong lớp mình dạy
- Xem bài của chính mình
- Không xem được bài của học viên khác lớp

### Admin/Manager:
- Xem tất cả bài làm
- Không bị giới hạn bởi lớp học

---

## 📡 API ENDPOINT

```
POST /api/exam-attempts/filter
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "classId": 1,                    // Optional
  "studentId": 5,                  // Optional
  "testId": 10,                    // Optional
  "skillType": "LISTENING",        // Optional
  "status": "GRADED",              // Optional
  "startDate": "2026-03-01T00:00:00",  // Optional
  "endDate": "2026-03-31T23:59:59",    // Optional
  "minBandScore": 5.0,             // Optional
  "maxBandScore": 9.0,             // Optional
  "sortBy": "submittedAt",         // Default: submittedAt
  "sortDirection": "DESC",         // Default: DESC
  "page": 0,                       // Default: 0
  "size": 20                       // Default: 20
}

Response:
[
  {
    "id": 173,
    "testId": 26,
    "testTitle": "IELTS Academic Test 1",
    "sessionId": 1,
    "skillType": "LISTENING",
    "userId": 3,
    "username": "teacher1",
    "status": "GRADED",
    "startedAt": "2026-03-27T06:00:56",
    "submittedAt": "2026-03-27T06:00:56",
    "gradedAt": "2026-03-27T06:00:56",
    "timeLimitSeconds": 2400,
    "timeSpentSeconds": 2100,
    "totalAnswered": 40,
    "totalCorrect": 35,
    "rawScore": 35.0,
    "bandScore": 8.0,
    "feedback": null,
    "attemptNumber": 1
  }
]
```

---

## 💻 FRONTEND USAGE

### 1. Import component:
```jsx
import ExamAttemptFilter from '../components/teacher/ExamAttemptFilter';
import { ieltsApi } from '../services/ieltsApi';
```

### 2. Sử dụng:
```jsx
const [attempts, setAttempts] = useState([]);
const [loading, setLoading] = useState(false);

const handleFilter = async (filters) => {
  setLoading(true);
  try {
    const results = await ieltsApi.filterAttempts(filters);
    setAttempts(results);
  } catch (err) {
    console.error('Filter failed:', err);
  } finally {
    setLoading(false);
  }
};

const handleClear = () => {
  setAttempts([]);
};

return (
  <div>
    <ExamAttemptFilter 
      onFilter={handleFilter}
      onClear={handleClear}
    />
    
    {loading && <div>Đang tải...</div>}
    
    <div className="attempts-list">
      {attempts.map(attempt => (
        <AttemptCard key={attempt.id} attempt={attempt} />
      ))}
    </div>
  </div>
);
```

---

## 🔍 EXAMPLES

### Ví dụ 1: Lọc bài Listening đã chấm của lớp 1
```json
{
  "classId": 1,
  "skillType": "LISTENING",
  "status": "GRADED",
  "sortBy": "bandScore",
  "sortDirection": "DESC"
}
```

### Ví dụ 2: Lọc bài của học viên có điểm >= 7.0
```json
{
  "studentId": 5,
  "minBandScore": 7.0,
  "status": "GRADED"
}
```

### Ví dụ 3: Lọc bài nộp trong tháng 3
```json
{
  "startDate": "2026-03-01T00:00:00",
  "endDate": "2026-03-31T23:59:59",
  "sortBy": "submittedAt",
  "sortDirection": "DESC"
}
```

### Ví dụ 4: Top 10 bài điểm cao nhất
```json
{
  "status": "GRADED",
  "sortBy": "bandScore",
  "sortDirection": "DESC",
  "page": 0,
  "size": 10
}
```

---

## 🎨 UI FEATURES

- **Toggle button**: Hiện/ẩn bộ lọc
- **Grid layout**: Responsive, tự động điều chỉnh
- **Clear button**: Xóa tất cả filter
- **Apply button**: Áp dụng filter
- **Mobile friendly**: Tối ưu cho mobile

---

## 🔧 BACKEND LOGIC

### Flow:
1. Validate teacher permissions
2. Get base attempts (by class/student/all)
3. Apply filters (test, skill, status, date, score)
4. Sort results
5. Paginate
6. Return response

### Performance:
- Stream processing với Java Streams
- Lazy evaluation
- Pagination để giảm data transfer
- Index trên database (user_id, test_id, status, submitted_at)

---

## 📊 USE CASES

### Teacher Dashboard:
- Xem tất cả bài nộp gần đây
- Lọc bài chưa chấm (SUBMITTED)
- Xem bài điểm thấp cần hỗ trợ

### Class Management:
- Xem tiến độ của lớp
- So sánh điểm giữa các học viên
- Theo dõi bài làm theo thời gian

### Student Progress:
- Xem lịch sử làm bài của 1 học viên
- Theo dõi sự tiến bộ
- Phân tích điểm yếu

---

## 🚀 TESTING

### Test 1: Filter by class
```bash
curl -X POST http://localhost:8080/api/exam-attempts/filter \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"classId": 1}'
```

### Test 2: Filter by skill and status
```bash
curl -X POST http://localhost:8080/api/exam-attempts/filter \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"skillType": "LISTENING", "status": "GRADED"}'
```

---

## 📝 NOTES

- Tất cả filters đều optional
- Kết hợp nhiều filters = AND logic
- Empty filter = trả về tất cả (theo quyền)
- Pagination bắt đầu từ page 0
- Default sort: submittedAt DESC
