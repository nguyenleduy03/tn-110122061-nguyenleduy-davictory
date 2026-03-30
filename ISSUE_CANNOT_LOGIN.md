# ⚠️ VẤN ĐỀ: KHÔNG LOGIN ĐƯỢC

## 🔍 Phát hiện

Sau khi kiểm tra, vấn đề là **không thể login** với tài khoản student.

### Đã kiểm tra:
- ✅ Backend đang chạy
- ✅ User student tồn tại (ID: 4)
- ✅ User student có role STUDENT
- ✅ User student is_active = 1
- ✅ User student trong lớp 12
- ✅ Có 1 bài tập PUBLISHED trong lớp 12
- ❌ **KHÔNG thể login với bất kỳ password nào**

## 🔧 GIẢI PHÁP

### Cách 1: Đăng nhập bằng tài khoản khác
Thử đăng nhập với các tài khoản sau:
- `kaka` / `kaka` (hoặc `123456`)
- `teacher` / (password cần kiểm tra)
- `admin` / (password cần kiểm tra)

### Cách 2: Reset password student qua backend
1. Vào trang admin/quản lý user
2. Tìm user "student"
3. Reset password thành "123456" hoặc "student123"

### Cách 3: Tạo user mới để test
```sql
-- Tạo user test_hv với password: 123456
INSERT INTO users (username, password, email, full_name, is_active, created_at, updated_at)
VALUES ('test_hv', '$2a$10$A4ThI1dJHQSqNB15Nkm5wOIp90BWSBtBdpZZj7ujmHbKrBwbYkvyW', 
        'test_hv@test.com', 'Test Học Viên', 1, NOW(), NOW());

-- Gán role STUDENT
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r 
WHERE u.username = 'test_hv' AND r.name = 'STUDENT';

-- Thêm vào lớp 12
INSERT INTO class_students (class_id, user_id, status, enrolled_at, notes, created_at, updated_at)
SELECT 12, u.id, 'ACTIVE', NOW(), 'Test user', NOW(), NOW()
FROM users u WHERE u.username = 'test_hv';
```

Sau đó login với: `test_hv` / `kaka` (vì dùng password hash của kaka)

## 📝 HƯỚNG DẪN CHO HỌC SINH

**Để xem bài tập:**

1. **Đăng nhập** với tài khoản học sinh
   - Nếu không nhớ password, liên hệ giáo viên để reset

2. **Vào menu** → Click vào avatar/tên → Chọn "Bài tập của tôi"

3. **Xem danh sách bài tập:**
   - Bài tập đang mở: Màu xanh
   - Bài tập sắp hết hạn: Màu cam
   - Bài tập quá hạn: Màu đỏ
   - Đã nộp: Có dấu tích xanh

4. **Làm bài:**
   - Click nút "Làm bài"
   - Làm bài như thi thử bình thường
   - Click "Submit" khi hoàn thành
   - Xem kết quả ngay

## 🚨 LƯU Ý

**Vấn đề hiện tại:** Password của user "student" không hoạt động.

**Cần làm:**
1. Reset password cho user "student" qua giao diện admin
2. Hoặc tạo user mới để test
3. Hoặc dùng tài khoản khác (kaka) để test chức năng

---

**Status:** ⚠️ Chờ reset password  
**Updated:** 2026-03-30 11:58:00
