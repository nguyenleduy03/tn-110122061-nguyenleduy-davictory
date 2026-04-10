# ✅ ĐÃ SỬA - Tracking Changes Sau Khi Load

## Vấn Đề Đã Tìm Ra

**Root cause**: `lastAutoSaveSnapshotRef` được set ngay khi load, nhưng React state (`test`, `sessions`) chưa update xong → so sánh sai → `hasUnsavedChanges` luôn = `false`.

## ✅ Giải Pháp

Thêm flag `isInitialLoad`:
1. Bỏ qua tracking trong lần đầu load
2. Chỉ bắt đầu tracking sau khi load xong và set snapshot
3. Đợi 100ms để đảm bảo state đã update

## 🧪 Cách Test (Sau Khi Hard Refresh)

### Test 1: Edit Đề Thi Có Sẵn

```
1. Hard refresh: Ctrl + Shift + R
2. Mở Console: F12
3. Vào: /teacher/tests/{id}/edit
4. Đợi load xong, xem console:
   📸 Initial snapshot saved, tracking enabled
5. Sửa title đề thi
6. Xem console:
   🔍 hasUnsavedChanges: true
7. Thử đóng tab (Ctrl+W)
8. Phải thấy:
   🚪 beforeunload - hasUnsavedChanges: true
   Browser dialog: "Changes you made may not be saved"
```

### Test 2: Tạo Đề Mới

```
1. Vào: /teacher/tests/new
2. Thêm title
3. Xem console:
   🔍 hasUnsavedChanges: true
4. Thử đóng tab
5. Phải có cảnh báo
```

### Test 3: Auto-Save

```
1. Vào edit đề thi
2. Sửa title
3. Đợi 1.2 giây
4. Xem console:
   🔍 hasUnsavedChanges: false (đã auto-save)
5. Đóng tab → KHÔNG có cảnh báo (đúng!)
```

## 📊 Console Logs Mong Đợi

### Khi Load Đề Thi
```
📸 Initial snapshot saved, tracking enabled
```

### Khi Sửa
```
🔍 hasUnsavedChanges: true
🔍 hasUnsavedChanges: true
...
```

### Khi Đóng Tab (Có Thay Đổi)
```
🚪 beforeunload - hasUnsavedChanges: true, saving: false
→ Browser hiển thị dialog
```

### Khi Auto-Save
```
🔍 hasUnsavedChanges: true
(sau 1.2s)
🔍 hasUnsavedChanges: false
→ Đóng tab không có cảnh báo
```

## ⚠️ Lưu Ý Quan Trọng

### 1. Phải Hard Refresh
```
Ctrl + Shift + R
```
Nếu không, browser vẫn dùng code cũ!

### 2. Tắt Auto-Save Để Test Rõ Hơn
- Tìm toggle "Auto-save" trong UI
- Tắt đi
- Sửa đề thi
- Thử đóng tab → phải có cảnh báo

### 3. Đợi Load Xong
Phải thấy log `📸 Initial snapshot saved` trước khi test.

## 🐛 Nếu Vẫn Không Hoạt Động

### Check 1: Console Có Log Không?
```
Nếu KHÔNG có log gì
→ Code chưa được load
→ Hard refresh lại
```

### Check 2: Log `hasUnsavedChanges` Có = true Không?
```
Nếu luôn = false
→ Snapshot bị sai
→ Gửi screenshot console
```

### Check 3: Browser Dialog Có Hiện Không?
```
Nếu có log nhưng không có dialog
→ Browser setting hoặc extension chặn
→ Thử browser khác (Chrome/Firefox)
```

## ✅ Xác Nhận Hoạt Động

Sau khi hard refresh và test, bạn phải thấy:

1. ✅ Console log: `📸 Initial snapshot saved`
2. ✅ Sửa title → log: `🔍 hasUnsavedChanges: true`
3. ✅ Đóng tab → log: `🚪 beforeunload - hasUnsavedChanges: true`
4. ✅ Browser hiển thị dialog cảnh báo

Nếu thấy đủ 4 điều trên → **Hoạt động đúng!** 🎉

## 🚀 Build Info

```
✓ built in 1.30s
```

Code đã được build thành công, chỉ cần hard refresh browser!
