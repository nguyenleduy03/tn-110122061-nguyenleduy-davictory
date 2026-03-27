# 🚀 HƯỚNG DẪN NHANH - Guest Exam

## ✅ Đã làm xong:

### Backend (7 files mới)
- Entity, Repository, DTOs, Service, Controller cho Guest
- Cập nhật SecurityConfig cho phép `/api/guest/**`
- SQL migration script

### Frontend (3 files mới + 2 cập nhật)
- GuestInfoForm component
- withExamAuth HOC
- Cập nhật ieltsApi.js
- Tích hợp vào IeltsListeningTest.jsx

---

## ⚠️ Cần làm ngay:

### 1. Chạy SQL Migration
```bash
./run_guest_migration.sh
# Hoặc thủ công:
mysql -u root -p davictory < create_guest_exam_attempts.sql
```

### 2. Fix lỗi compile backend
Backend có lỗi ở `TestAttemptService.java` (không liên quan guest code).
Cần check file này.

### 3. Restart sau khi fix
```bash
./stop.sh
./start.sh
```

---

## 🧪 Test Guest Mode:

1. Logout (hoặc xóa `authToken` trong localStorage)
2. Vào: `http://localhost:5173/test/listening/1`
3. Form thông tin sẽ hiện
4. Điền họ tên → Bắt đầu làm bài
5. Nộp bài → Xem kết quả

---

## 📁 Files quan trọng:

**Backend:**
- `backend/src/main/java/com/victory/DAVictory/service/GuestExamService.java`
- `backend/src/main/java/com/victory/DAVictory/controller/GuestExamController.java`

**Frontend:**
- `frontend/src/components/common/GuestInfoForm.jsx`
- `frontend/src/services/ieltsApi.js`
- `frontend/src/pages/IeltsListeningTest.jsx`

**Database:**
- `create_guest_exam_attempts.sql`

---

## 🔗 API Endpoints:

```
POST /api/guest/exam-attempts/start       (không cần auth)
POST /api/guest/exam-attempts/{id}/submit (không cần auth)
```

---

## 📖 Docs đầy đủ:

- `GUEST_EXAM_GUIDE.md` - Hướng dẫn chi tiết
- `GUEST_IMPLEMENTATION_STATUS.md` - Trạng thái triển khai
