# Debug: Không Có Thông Báo Khi Thoát Trang Chỉnh Sửa

## 🔍 Đã Thêm Console Logs

File `TestBuilder.jsx` đã được thêm console.log để debug:

```javascript
// Khi có thay đổi
console.log('🔍 hasUnsavedChanges:', hasChanges);

// Khi thoát trang
console.log('🚪 beforeunload - hasUnsavedChanges:', hasUnsavedChanges, 'saving:', saving);
```

## 🧪 Cách Test

### Bước 1: Mở Console
```
F12 → Console tab
```

### Bước 2: Vào Trang Edit
```
/teacher/tests/{id}/edit
```

### Bước 3: Thực Hiện Thay Đổi
- Sửa title đề thi
- Hoặc thêm/xóa câu hỏi
- Xem console có log: `🔍 hasUnsavedChanges: true`

### Bước 4: Thử Thoát
- Đóng tab (Ctrl+W)
- Hoặc refresh (F5)
- Xem console có log: `🚪 beforeunload - hasUnsavedChanges: true`

## 📊 Kết Quả Mong Đợi

### Case 1: Có Thay Đổi Chưa Lưu
```
Console:
🔍 hasUnsavedChanges: true
🚪 beforeunload - hasUnsavedChanges: true, saving: false

Browser:
→ Hiển thị dialog: "Changes you made may not be saved"
```

### Case 2: Auto-Save Đã Lưu
```
Console:
🔍 hasUnsavedChanges: true
(sau 1.2s)
🔍 hasUnsavedChanges: false  ← Auto-save đã lưu
🚪 beforeunload - hasUnsavedChanges: false

Browser:
→ KHÔNG hiển thị dialog (vì đã lưu)
```

### Case 3: Không Có Thay Đổi
```
Console:
🔍 hasUnsavedChanges: false
🚪 beforeunload - hasUnsavedChanges: false

Browser:
→ KHÔNG hiển thị dialog
```

## 🐛 Các Trường Hợp Không Có Cảnh Báo

### 1. Auto-Save Đã Bật (Mặc Định)
**Triệu chứng**: Sửa xong, đợi 1-2 giây, thoát → không có cảnh báo

**Nguyên nhân**: Auto-save đã lưu tự động sau 1.2s

**Giải pháp**: 
- Tắt auto-save để test
- Hoặc thoát ngay sau khi sửa (trong vòng 1.2s)

### 2. Snapshot Giống Nhau
**Triệu chứng**: Sửa rồi undo lại → không có cảnh báo

**Nguyên nhân**: State hiện tại = state đã lưu

**Giải pháp**: Đây là behavior đúng

### 3. Browser Cache
**Triệu chứng**: Code mới nhưng vẫn chạy code cũ

**Nguyên nhân**: Browser cache

**Giải pháp**: Hard refresh (Ctrl + Shift + R)

## 🔧 Cách Tắt Auto-Save Để Test

1. Vào trang edit
2. Tìm toggle "Auto-save"
3. Tắt đi
4. Thực hiện thay đổi
5. Thử thoát → phải có cảnh báo

## 📝 Checklist Debug

- [ ] Hard refresh browser (Ctrl + Shift + R)
- [ ] Mở Console (F12)
- [ ] Vào trang edit
- [ ] Tắt auto-save
- [ ] Sửa title hoặc thêm câu hỏi
- [ ] Xem console: `🔍 hasUnsavedChanges: true`
- [ ] Thử đóng tab
- [ ] Xem console: `🚪 beforeunload - hasUnsavedChanges: true`
- [ ] Browser phải hiển thị dialog cảnh báo

## 🎯 Kết Luận

Nếu sau khi làm theo checklist mà:

### ✅ Có Log Nhưng Không Có Dialog
→ Vấn đề: Browser không hỗ trợ hoặc đã disable

### ✅ Không Có Log `hasUnsavedChanges: true`
→ Vấn đề: Thay đổi không được detect

### ✅ Log `hasUnsavedChanges: false` Ngay Sau Khi Sửa
→ Vấn đề: Auto-save đã lưu quá nhanh

### ✅ Có Log Và Có Dialog
→ Hoạt động đúng! 🎉

## 🚀 Gửi Kết Quả

Sau khi test, gửi screenshot của:
1. Console logs
2. Browser dialog (nếu có)
3. Trạng thái auto-save (bật/tắt)
