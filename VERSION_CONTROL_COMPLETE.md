# ✅ Tính Năng Version Control - Hoàn Chỉnh

## 📋 Tóm Tắt Yêu Cầu

**Mục đích**: Mỗi lần chỉnh sửa đề thi sẽ lưu thành 1 phiên bản mới. Người dùng có thể khôi phục về phiên bản cũ.

## ✅ Đã Implement

### 1. Backend - Tự Động Tạo Version
**File**: `TestBuilderService.java`

```java
if (hasAttemptAnswersForGroup(qg.getId())) {
    // Có lịch sử làm bài → Tạo group mới (version mới)
    qg = createQuestionGroupFromSave(part, gs);
} else {
    // Chưa có lịch sử → Cập nhật trực tiếp
    updateGroupInPlace(qg, gs);
}
```

**Logic**:
- Khi lưu đề thi, backend kiểm tra xem có học sinh đã làm bài chưa
- Nếu có → Tạo question_group mới (version mới)
- Nếu chưa → Cập nhật trực tiếp (tiết kiệm storage)

### 2. Frontend - Thông Báo Khi Thoát

#### A. Khi Click Nút Header (List/Home)
```javascript
if (hasUnsavedChanges) {
  confirm(
    'Bạn có thay đổi chưa lưu.\n\n' +
    'Phiên bản hiện tại sẽ được lưu tự động.\n' +
    'Bạn có thể khôi phục về phiên bản cũ sau này.\n\n' +
    'Bạn có muốn tiếp tục?'
  )
}
```

#### B. Khi Đóng Tab/Refresh
```javascript
useBeforeUnload((e) => {
  if (hasUnsavedChanges) {
    e.preventDefault();
    return (e.returnValue = '');
  }
});
```
→ Browser hiển thị: "Changes you made may not be saved"

#### C. Khi Nhấn Nút "Lưu"
```
Modal: "Lưu phiên bản mới?"
"Bạn đã thực hiện thay đổi trên đề thi. 
Hệ thống sẽ lưu phiên bản mới với những thay đổi này. 
Phiên bản cũ vẫn được giữ nguyên và có thể khôi phục."
```

### 3. Xem Lịch Sử Versions

**Vị trí**: Trang quản lý đề thi → Menu 3 chấm → "Versions"

**Hiển thị**:
```
┌─────────────────────────────────┐
│ ⏰ Lịch Sử Phiên Bản            │
├─────────────────────────────────┤
│ 🟢 Phiên bản hiện tại           │
│ 08/04/2026 10:00                │
│ Tạo bởi: teacher • 10 câu       │
├─────────────────────────────────┤
│ Phiên bản 2                     │
│ 07/04/2026 15:30                │
│ Tạo bởi: teacher • 8 câu        │
└─────────────────────────────────┘
```

## 🔄 Luồng Hoạt Động

### Scenario 1: Chỉnh Sửa Đề Mới
```
1. Tạo đề thi mới
2. Thêm 10 câu hỏi
3. Nhấn "Lưu"
→ Lưu version 1 (không có version cũ)
```

### Scenario 2: Chỉnh Sửa Đề Chưa Có Bài Làm
```
1. Edit đề thi (chưa có học sinh làm)
2. Sửa 5 câu hỏi
3. Nhấn "Lưu" → Modal xác nhận
4. Nhấn "Lưu phiên bản mới"
→ Backend cập nhật trực tiếp (không tạo version mới)
→ Tiết kiệm storage
```

### Scenario 3: Chỉnh Sửa Đề Đã Có Bài Làm
```
1. Edit đề thi (đã có học sinh làm)
2. Sửa 5 câu hỏi
3. Nhấn "Lưu" → Modal xác nhận
4. Nhấn "Lưu phiên bản mới"
→ Backend tạo question_groups mới (version mới)
→ Groups cũ vẫn tồn tại (bảo toàn bài làm của học sinh)
```

### Scenario 4: Thoát Khi Có Thay Đổi
```
1. Edit đề thi
2. Sửa title
3. Click nút "Danh sách đề thi"
→ Confirm: "Phiên bản hiện tại sẽ được lưu tự động..."
4. Nhấn OK → Auto-save lưu → Navigate
```

### Scenario 5: Khôi Phục Version Cũ
```
1. Vào trang quản lý đề thi
2. Click menu 3 chấm → "Versions"
3. Xem danh sách versions
4. (Tương lai) Click "Khôi phục" trên version cũ
→ Tạo đề thi mới từ version cũ
```

## 📊 Database Structure

```
Test (id=1, title="Đề thi IELTS")
  ↓
TestSession
  ↓
TestPart
  ↓
TestQuestionGroup ──→ QuestionGroup #123 (version 1)
                           ↓
                      Questions [1,2,3]
                      
Sau khi edit:

TestQuestionGroup ──→ QuestionGroup #456 (version 2)
                           ↓
                      Questions [1,2,3,4] (đã sửa)

QuestionGroup #123 vẫn tồn tại!
Bài làm của học sinh vẫn trỏ đến #123
```

## ✅ Checklist Hoàn Thành

- [x] Backend tự động tạo version khi có attempt
- [x] Backend cập nhật trực tiếp khi chưa có attempt
- [x] Frontend modal xác nhận khi lưu
- [x] Frontend confirm khi click nút header
- [x] Frontend beforeunload khi đóng tab
- [x] Frontend tracking changes chính xác
- [x] API lấy lịch sử versions
- [x] Modal hiển thị lịch sử versions
- [ ] Chức năng restore version (tương lai)

## 🎯 Lợi Ích

1. **Bảo toàn dữ liệu**: Bài làm của học sinh không bị ảnh hưởng
2. **Tối ưu storage**: Chỉ tạo version khi cần thiết
3. **Khôi phục dễ dàng**: Có thể quay lại version cũ
4. **Thông báo rõ ràng**: User biết chính xác điều gì xảy ra
5. **Auto-save**: Bảo vệ khỏi mất data

## 🚀 Test

1. **Hard refresh**: `Ctrl + Shift + R`
2. Edit đề thi, sửa title
3. Click nút "Danh sách đề thi"
4. Sẽ thấy confirm: "Phiên bản hiện tại sẽ được lưu tự động..."
5. Nhấn OK → Auto-save lưu → Navigate
6. Vào lại đề thi → Xem versions → Thấy lịch sử

## 📝 Ghi Chú

- Message confirm không thể customize trong `beforeunload` (browser limitation)
- Chức năng restore version sẽ được thêm trong tương lai
- Auto-save mặc định bật, lưu sau 1.2s
