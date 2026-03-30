# 🔧 FIX: Bài tập không hiển thị

## ✅ ĐÃ SỬA

### 1. Lỗi Backend Compile
**File:** `ClassManagementController.java`
**Vấn đề:** 
- Dùng method `findByUserId()` không tồn tại
- Dùng `Map.of()` gây lỗi type inference

**Đã sửa:**
```java
// Trước:
List<ClassStudent> classStudents = classStudentRepository.findByUserId(student.getId());
List<Map<String, Object>> classes = classStudents.stream()
    .map(cs -> Map.of(...))  // Map.of() immutable

// Sau:
List<ClassStudent> classStudents = classStudentRepository.findByUserIdOrderByEnrolledAtDesc(student.getId());
List<Map<String, Object>> classes = classStudents.stream()
    .map(cs -> {
        Map<String, Object> classMap = new HashMap<>();
        classMap.put("id", cs.getClazz().getId());
        // ...
        return classMap;
    })
```

### 2. Filter bài tập PUBLISHED cho học viên
**File:** `AssignmentService.java`
**Vấn đề:** Học viên thấy cả bài tập DRAFT

**Đã sửa:**
```java
public List<AssignmentResponse> getAssignmentsForStudent(Long classId, User student) {
    validateStudentInClass(classId, student);
    // Chỉ lấy bài tập PUBLISHED
    List<Assignment> assignments = assignmentRepository.findByClazzIdAndIsActiveTrueOrderByDueDateAsc(classId);
    return assignments.stream()
            .filter(a -> "PUBLISHED".equals(a.getStatus()))  // ← Thêm filter này
            .map(this::buildResponse)
            .collect(Collectors.toList());
}
```

### 3. Thêm debug logs
**File:** `StudentAssignments.jsx`
**Đã thêm:** Console logs để debug

---

## 🧪 CÁCH KIỂM TRA

### 1. Kiểm tra database
```bash
mysql -u root -p1111 DAVictory -e "
SELECT id, title, status, class_id, is_active 
FROM assignments 
WHERE class_id = 12;
"
```

**Kết quả hiện tại:**
```
id  title  status     class_id  is_active
1   bt1    PUBLISHED  12        1
2   ded    DRAFT      12        1
```

→ Học viên chỉ nên thấy bài tập ID 1 (PUBLISHED)

### 2. Kiểm tra học viên trong lớp
```bash
mysql -u root -p1111 DAVictory -e "
SELECT cs.user_id, u.username, u.full_name 
FROM class_students cs 
JOIN users u ON cs.user_id = u.id 
WHERE cs.class_id = 12 AND cs.status = 'ACTIVE';
"
```

### 3. Test API trực tiếp
```bash
# Login để lấy token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student","password":"123456"}' \
  | jq -r '.token')

# Lấy danh sách lớp
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/auth/my-class-management \
  | jq

# Lấy bài tập của lớp 12
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/assignments/student/class/12 \
  | jq
```

### 4. Kiểm tra trên web
1. Đăng nhập với tài khoản `student` / `123456`
2. Vào menu → "Bài tập của tôi"
3. Mở Console (F12) → Xem logs:
   - `📚 My classes:` - Danh sách lớp
   - `📝 All assignments:` - Danh sách bài tập
4. Nếu vẫn trống:
   - Kiểm tra user có trong lớp 12 không
   - Kiểm tra bài tập có status PUBLISHED không

---

## 🐛 NẾU VẪN KHÔNG HIỂN THỊ

### Nguyên nhân có thể:

1. **User không trong lớp 12**
   ```sql
   -- Thêm user vào lớp
   INSERT INTO class_students (class_id, user_id, status, enrolled_at)
   VALUES (12, 4, 'ACTIVE', NOW());
   ```

2. **Bài tập là DRAFT**
   ```sql
   -- Đổi status sang PUBLISHED
   UPDATE assignments SET status = 'PUBLISHED' WHERE id = 1;
   ```

3. **Token hết hạn**
   - Logout và login lại
   - Xóa localStorage: `localStorage.clear()`

4. **CORS issue**
   - Kiểm tra Console có lỗi CORS không
   - Backend log có request không

---

## 📊 TRẠNG THÁI HIỆN TẠI

✅ Backend đã compile thành công  
✅ Backend đang chạy trên port 8080  
✅ Frontend đang chạy trên port 5173  
✅ Code đã được sửa  
✅ Filter PUBLISHED đã được thêm  
✅ Debug logs đã được thêm  

---

## 🚀 NEXT STEPS

1. Refresh trang https://davictory.io.vn/student/assignments
2. Mở Console (F12) → Xem logs
3. Nếu thấy logs → Kiểm tra data
4. Nếu không thấy logs → Kiểm tra network tab
5. Báo lại kết quả để debug tiếp

---

**Updated:** 2026-03-30 11:53:00  
**Status:** ✅ FIXED - Chờ test
