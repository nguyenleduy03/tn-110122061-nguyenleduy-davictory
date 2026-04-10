# Checklist Kiểm Tra Tính Năng Version Control

## ✅ Đã Hoàn Thành

### Frontend Changes

- [x] **Theo dõi thay đổi**
  - State `hasUnsavedChanges` để đánh dấu có thay đổi chưa lưu
  - So sánh snapshot hiện tại với snapshot đã lưu
  - Cập nhật `hasUnsavedChanges` mỗi khi `test` hoặc `sessions` thay đổi

- [x] **Chặn navigation**
  - Event listener `beforeunload` để cảnh báo khi đóng tab/refresh
  - Chỉ hoạt động khi `hasUnsavedChanges = true`

- [x] **Modal xác nhận lưu version mới**
  - Hiển thị khi nhấn nút "Lưu" và có thay đổi
  - Thông báo rõ ràng về việc lưu phiên bản mới
  - Nút "Hủy" và "Lưu phiên bản mới"

- [x] **Cập nhật handleSave**
  - Tham số `skipConfirm` để bỏ qua modal (cho auto-save)
  - Hiển thị modal khi `editTestId` tồn tại và có thay đổi
  - Cập nhật snapshot và reset `hasUnsavedChanges` sau khi lưu thành công
  - Thông báo "Đã lưu phiên bản mới thành công!"

- [x] **Auto-save thông minh**
  - Gọi `handleSave(true)` để bỏ qua modal xác nhận
  - Không làm phiền người dùng khi auto-save

### Backend Logic (Đã Có Sẵn)

- [x] **Kiểm tra attempt history**
  - Method `hasAttemptAnswersForGroup(groupId)`
  - Quyết định tạo version mới hay cập nhật trực tiếp

- [x] **Tạo version mới khi cần**
  - Tạo `QuestionGroup` mới khi có attempt history
  - Giữ nguyên group cũ để bảo toàn dữ liệu

- [x] **Cập nhật trực tiếp khi an toàn**
  - Cập nhật group cũ khi chưa có attempt
  - Xóa questions cũ và tạo mới

- [x] **Dọn dẹp groups không dùng**
  - Xóa groups không còn được tham chiếu
  - Chỉ xóa khi không có attempt history

## 🧪 Test Cases Cần Kiểm Tra

### Test 1: Tạo Đề Thi Mới
```
Bước:
1. Vào /teacher/tests/new
2. Thêm title, description
3. Thêm một số questions
4. Nhấn "Lưu"

Kết quả mong đợi:
- ✅ Không hiển thị modal xác nhận (vì là đề mới)
- ✅ Lưu thành công
- ✅ Chuyển đến trang edit với URL mới
- ✅ Thông báo "Đã lưu phiên bản mới thành công!"
```

### Test 2: Sửa Đề Chưa Có Bài Làm
```
Bước:
1. Vào /teacher/tests/{id}/edit (đề chưa có attempt)
2. Sửa một số questions
3. Nhấn "Lưu"

Kết quả mong đợi:
- ✅ Hiển thị modal xác nhận
- ✅ Modal có nội dung đúng về lưu phiên bản mới
- ✅ Nhấn "Lưu phiên bản mới" → lưu thành công
- ✅ Backend cập nhật trực tiếp groups cũ (không tạo mới)
- ✅ Thông báo "Đã lưu phiên bản mới thành công!"
```

### Test 3: Sửa Đề Đã Có Bài Làm
```
Bước:
1. Tạo đề thi và publish
2. Học sinh làm bài (tạo attempt)
3. Giáo viên vào edit đề thi
4. Sửa questions
5. Nhấn "Lưu"

Kết quả mong đợi:
- ✅ Hiển thị modal xác nhận
- ✅ Nhấn "Lưu phiên bản mới" → lưu thành công
- ✅ Backend tạo groups mới (version mới)
- ✅ Groups cũ vẫn tồn tại trong DB
- ✅ Bài làm của học sinh vẫn trỏ đến groups cũ
- ✅ Thông báo "Đã lưu phiên bản mới thành công!"
```

### Test 4: Rời Trang Khi Có Thay Đổi
```
Bước:
1. Vào edit đề thi
2. Sửa một số questions
3. Thử đóng tab hoặc navigate away

Kết quả mong đợi:
- ✅ Browser hiển thị cảnh báo "Changes you made may not be saved"
- ✅ Người dùng có thể chọn "Leave" hoặc "Stay"
```

### Test 5: Auto-Save
```
Bước:
1. Bật auto-save
2. Vào edit đề thi
3. Sửa questions
4. Đợi 1.2 giây

Kết quả mong đợi:
- ✅ Tự động lưu sau 1.2 giây
- ✅ KHÔNG hiển thị modal xác nhận
- ✅ Thông báo "Đã lưu phiên bản mới thành công!"
- ✅ hasUnsavedChanges = false sau khi lưu
```

### Test 6: Nhấn Hủy Trong Modal
```
Bước:
1. Vào edit đề thi
2. Sửa questions
3. Nhấn "Lưu"
4. Nhấn "Hủy" trong modal

Kết quả mong đợi:
- ✅ Modal đóng
- ✅ Không lưu thay đổi
- ✅ hasUnsavedChanges vẫn = true
- ✅ Có thể tiếp tục chỉnh sửa
```

### Test 7: Kiểm Tra Database
```
SQL Query:
SELECT 
    qg.id,
    qg.title,
    qg.created_at,
    COUNT(DISTINCT tqg.test_id) as test_count,
    COUNT(DISTINCT aa.id) as attempt_count
FROM question_groups qg
LEFT JOIN test_question_groups tqg ON qg.id = tqg.question_group_id
LEFT JOIN attempt_answers aa ON qg.id = aa.question_group_id
WHERE qg.title LIKE '%Test Group%'
GROUP BY qg.id
ORDER BY qg.created_at DESC;

Kết quả mong đợi:
- ✅ Đề chưa có attempt: 1 group, cập nhật timestamp
- ✅ Đề đã có attempt: 2+ groups (versions), group cũ có attempt_count > 0
```

## 📝 Ghi Chú Kỹ Thuật

### Snapshot Comparison
```javascript
// So sánh toàn bộ state để phát hiện thay đổi
const currentSnapshot = JSON.stringify({ test, sessions });
const hasChanges = currentSnapshot !== lastAutoSaveSnapshotRef.current;
```

**Ưu điểm**:
- Đơn giản, dễ implement
- Phát hiện mọi thay đổi (kể cả nested)

**Nhược điểm**:
- Performance: stringify có thể chậm với data lớn
- False positive: thứ tự key có thể khác nhau

**Cải tiến tương lai**:
- Dùng deep comparison library (lodash.isEqual)
- Chỉ so sánh các field quan trọng

### Modal Styling
```javascript
// Inline styles cho modal để tránh conflict với CSS khác
style={{
  position: 'fixed',
  zIndex: 10000,  // Cao nhất để đè lên tất cả
  background: 'rgba(0,0,0,0.5)'
}}
```

### BeforeUnload Event
```javascript
// Cảnh báo khi đóng tab/refresh
window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = ''; // Chrome requires returnValue
  }
});
```

**Lưu ý**:
- Không thể customize message trong modern browsers
- Chỉ hiển thị generic warning
- Không hoạt động với SPA navigation (cần dùng React Router)

## 🔧 Debug Commands

### Kiểm tra state trong console
```javascript
// Trong DevTools Console
window.testBuilderState = {
  hasUnsavedChanges,
  lastSnapshot: lastAutoSaveSnapshotRef.current,
  currentSnapshot: JSON.stringify({ test, sessions })
};
```

### Kiểm tra backend logs
```bash
# Xem logs khi lưu
tail -f backend/logs/application.log | grep "Group tồn tại"

# Kiểm tra attempt history
tail -f backend/logs/application.log | grep "hasAttemptAnswersForGroup"
```

### SQL Debug Queries
```sql
-- Xem tất cả versions của một group
SELECT 
    qg.id,
    qg.title,
    qg.created_at,
    qg.updated_at,
    COUNT(q.id) as question_count
FROM question_groups qg
LEFT JOIN questions q ON qg.id = q.question_group_id
WHERE qg.title LIKE '%Part 1%'
GROUP BY qg.id
ORDER BY qg.created_at DESC;

-- Xem groups có attempt
SELECT 
    qg.id,
    qg.title,
    COUNT(DISTINCT aa.exam_attempt_id) as attempt_count
FROM question_groups qg
INNER JOIN questions q ON qg.id = q.question_group_id
INNER JOIN attempt_answers aa ON q.id = aa.question_id
GROUP BY qg.id
HAVING attempt_count > 0;
```

## 🚀 Deployment Checklist

- [ ] Test tất cả test cases trên local
- [ ] Kiểm tra performance với đề thi lớn (100+ questions)
- [ ] Test trên các browsers khác nhau (Chrome, Firefox, Safari)
- [ ] Kiểm tra responsive (mobile, tablet)
- [ ] Review code với team
- [ ] Update documentation
- [ ] Deploy lên staging
- [ ] Test lại trên staging
- [ ] Deploy lên production
- [ ] Monitor logs sau deploy
- [ ] Thông báo cho users về tính năng mới

## 📚 Tài Liệu Liên Quan

- `VERSION_CONTROL_LOGIC.md` - Chi tiết về logic version control
- `frontend/src/pages/TestBuilder.jsx` - Component chính
- `backend/src/main/java/com/victory/DAVictory/service/TestBuilderService.java` - Service xử lý lưu
- `frontend/src/services/testBuilderApi.js` - API client
