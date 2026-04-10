# ✅ Giải Pháp: Warning Banner

## Vấn Đề

Không thể chặn React Router navigation (click link header) do giới hạn kỹ thuật.

## ✅ Giải Pháp Đã Thêm

**Warning Banner** hiển thị ở đầu trang khi có thay đổi chưa lưu:

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Bạn có thay đổi chưa lưu. Nhấn "Lưu" hoặc đợi auto-save │
│                                          [Lưu ngay]      │
└─────────────────────────────────────────────────────────┘
```

### Đặc Điểm:
- 🟡 Màu vàng nổi bật
- ⚠️ Icon cảnh báo
- 🔘 Nút "Lưu ngay" để lưu nhanh
- 📍 Fixed position ở đầu trang
- ✨ Tự động ẩn sau khi lưu

## 🧪 Cách Test

1. **Hard refresh**: `Ctrl + Shift + R`
2. Vào edit đề thi
3. Sửa title
4. Sẽ thấy **banner vàng** xuất hiện ở đầu trang
5. Click link header (về list đề, trang chủ)
6. Banner vẫn hiển thị → nhắc nhở bạn lưu

### Scenario 1: Lưu Thủ Công
```
1. Sửa đề thi
2. Banner xuất hiện
3. Click "Lưu ngay" trên banner
4. Banner biến mất
5. Navigate đi đâu cũng được
```

### Scenario 2: Auto-Save
```
1. Sửa đề thi
2. Banner xuất hiện
3. Đợi 1.2 giây
4. Banner tự động biến mất (đã auto-save)
5. Navigate đi đâu cũng được
```

### Scenario 3: Bỏ Qua Cảnh Báo
```
1. Sửa đề thi
2. Banner xuất hiện
3. Click link header ngay (không đợi)
4. Thoát trang → MẤT thay đổi
```

## 📊 So Sánh

### Trước Đây:
- ❌ Không có cảnh báo gì
- ❌ Dễ quên lưu
- ❌ Mất data

### Bây Giờ:
- ✅ Banner cảnh báo rõ ràng
- ✅ Nút "Lưu ngay" tiện lợi
- ✅ Nhắc nhở liên tục

## 🎨 UI Design

```
┌──────────────────────────────────────────────────┐
│ ⚠️ Warning Banner (Fixed Top)                    │
│ Background: #fef3c7 (vàng nhạt)                  │
│ Border: #f59e0b (vàng đậm)                       │
│ Text: #92400e (nâu đậm)                          │
│ Button: #f59e0b (vàng cam)                       │
└──────────────────────────────────────────────────┘
```

## ✅ Lợi Ích

1. **Nhắc nhở liên tục**: Banner luôn hiển thị khi có thay đổi
2. **Lưu nhanh**: Nút "Lưu ngay" ngay trên banner
3. **Không làm phiền**: Tự động ẩn sau khi lưu
4. **Rõ ràng**: Màu vàng nổi bật, dễ nhận biết
5. **Không chặn**: Không block navigation, chỉ nhắc nhở

## 🚀 Kết Hợp Với Auto-Save

Banner + Auto-save = **Bảo vệ kép**:

1. **Banner**: Nhắc nhở visual
2. **Auto-save**: Tự động lưu sau 1.2s
3. **beforeunload**: Chặn đóng tab/refresh

→ **3 lớp bảo vệ** cho data của bạn!

## 📝 Lưu Ý

- Banner chỉ hiển thị khi `hasUnsavedChanges = true`
- Banner tự động ẩn khi `saving = true` (đang lưu)
- Banner tự động ẩn sau khi lưu xong
- Không ảnh hưởng đến UX (không block)

## ✅ Build Info

```
✓ built in 1.28s
```

**Chỉ cần hard refresh để thấy banner!**
