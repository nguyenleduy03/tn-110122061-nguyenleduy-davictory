# 🔍 DEBUG: Học sinh không load được bài tập

## ⚠️ VẤN ĐỀ

Học sinh vẫn không thấy bài tập sau khi đã sửa code.

## 🧪 KIỂM TRA NGAY

### Bước 1: Kiểm tra Console (F12)
Mở trang https://davictory.io.vn/student/assignments và xem Console:

**Cần thấy:**
```
📚 My classes: [...]
📝 All assignments: [...]
```

**Nếu thấy lỗi:**
- `401 Unauthorized` → Token hết hạn, cần login lại
- `403 Forbidden` → Không có quyền
- `404 Not Found` → API endpoint sai
- `500 Internal Server Error` → Lỗi backend

### Bước 2: Kiểm tra Network Tab
1. Mở Network tab (F12)
2. Refresh trang
3. Tìm request:
   - `GET /api/auth/my-class-management`
   - `GET /api/assignments/student/class/12`

**Kiểm tra:**
- Status code: 200 OK?
- Response có data không?
- Request có header `Authorization: Bearer ...` không?

### Bước 3: Kiểm tra localStorage
Mở Console và chạy:
```javascript
console.log('Token:', localStorage.getItem('authToken'));
console.log('User:', localStorage.getItem('user'));
```

**Nếu null:**
- Cần login lại
- Hoặc token đã bị xóa

## 🔧 GIẢI PHÁP NHANH

### Giải pháp 1: Login lại
1. Logout
2. Login với tài khoản student
3. Vào lại trang bài tập

### Giải pháp 2: Xóa cache
```javascript
// Chạy trong Console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Giải pháp 3: Kiểm tra user có trong lớp không
```sql
-- Chạy trong MySQL
SELECT cs.*, c.name as class_name, u.username
FROM class_students cs
JOIN classes c ON cs.class_id = c.id
JOIN users u ON cs.user_id = u.id
WHERE u.username = 'student' AND cs.status = 'ACTIVE';
```

**Nếu không có kết quả:**
```sql
-- Thêm student vào lớp 12
INSERT INTO class_students (class_id, user_id, status, enrolled_at, notes)
SELECT 12, u.id, 'ACTIVE', NOW(), 'Added for testing'
FROM users u WHERE u.username = 'student';
```

### Giải pháp 4: Kiểm tra bài tập
```sql
-- Xem bài tập PUBLISHED
SELECT id, title, status, class_id 
FROM assignments 
WHERE class_id = 12 AND status = 'PUBLISHED' AND is_active = 1;
```

**Nếu không có:**
```sql
-- Đổi bài tập sang PUBLISHED
UPDATE assignments SET status = 'PUBLISHED' WHERE id = 1;
```

## 📋 CHECKLIST DEBUG

- [ ] Console có logs `📚 My classes` và `📝 All assignments`?
- [ ] Network tab có request đến API?
- [ ] Request có status 200 OK?
- [ ] Response có data?
- [ ] localStorage có token?
- [ ] User có trong lớp 12?
- [ ] Có bài tập PUBLISHED trong lớp 12?

## 🚨 NẾU VẪN KHÔNG ĐƯỢC

Hãy chụp màn hình:
1. Console tab (F12)
2. Network tab - request `my-class-management`
3. Network tab - request `assignments/student/class/12`
4. Kết quả query SQL kiểm tra user và bài tập

Và gửi cho tôi để debug tiếp.

---

## 🔑 THÔNG TIN QUAN TRỌNG

**Database:**
- User: student (ID: 4)
- Lớp: 12
- Bài tập: ID 1 (bt1) - PUBLISHED

**API Endpoints:**
- `GET /api/auth/my-class-management` - Lấy danh sách lớp
- `GET /api/assignments/student/class/{classId}` - Lấy bài tập

**Backend:** http://localhost:8080  
**Frontend:** https://davictory.io.vn

---

**Updated:** 2026-03-30 11:58:00
