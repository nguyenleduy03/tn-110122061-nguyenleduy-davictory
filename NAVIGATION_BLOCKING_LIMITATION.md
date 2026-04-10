# ⚠️ Giới Hạn Kỹ Thuật: Không Thể Chặn React Router Navigation

## Thực Tế

**`beforeunload` CHỈ hoạt động với browser navigation**, KHÔNG hoạt động với React Router (SPA navigation).

## ✅ CÓ Cảnh Báo Khi:
- Đóng tab (Ctrl+W)
- Refresh trang (F5, Ctrl+R)
- Nhập URL mới vào address bar
- Navigate đến domain khác

## ❌ KHÔNG CÓ Cảnh Báo Khi:
- Click link trong app (React Router)
- Nhấn nút Back/Forward
- `navigate()` programmatically

## Tại Sao Không Chặn React Router?

### Option 1: `unstable_useBlocker` (React Router v6.4+)
```javascript
const blocker = unstable_useBlocker(...)
```
**Vấn đề**: 
- ❌ API `unstable` - không stable, có thể thay đổi
- ❌ Không có trong React Router v7.13.1 hiện tại
- ❌ Build error

### Option 2: `Prompt` Component (React Router v5)
```javascript
<Prompt when={hasUnsavedChanges} message="..." />
```
**Vấn đề**:
- ❌ Đã bị remove trong React Router v6+
- ❌ Không còn tồn tại

### Option 3: Custom Solution
```javascript
// Override navigate
const originalNavigate = useNavigate();
const navigate = (...args) => {
  if (hasUnsavedChanges) {
    if (confirm('...')) originalNavigate(...args);
  } else {
    originalNavigate(...args);
  }
};
```
**Vấn đề**:
- ❌ Không chặn được browser back button
- ❌ Không chặn được Link component
- ❌ Phức tạp, dễ lỗi

## ✅ Giải Pháp Hiện Tại (Đã Implement)

### 1. Browser Navigation Protection
```javascript
useBeforeUnload((e) => {
  if (hasUnsavedChanges && !saving) {
    e.preventDefault();
    return (e.returnValue = '');
  }
});
```
**Bảo vệ**: Đóng tab, refresh, navigate ra ngoài domain

### 2. Auto-Save (Mặc Định Bật)
```javascript
// Tự động lưu sau 1.2s
setTimeout(() => handleSave(true), 1200);
```
**Bảo vệ**: Tự động lưu trước khi mất data

### 3. Modal Xác Nhận Khi Lưu
```javascript
if (hasUnsavedChanges) {
  setShowExitConfirm(true); // Modal: "Lưu phiên bản mới?"
}
```
**Bảo vệ**: Xác nhận rõ ràng trước khi lưu

## 📊 So Sánh Với Các App Khác

### Google Docs
- ✅ Auto-save liên tục
- ❌ KHÔNG chặn React Router navigation
- ✅ Chặn đóng tab

### Notion
- ✅ Auto-save liên tục
- ❌ KHÔNG chặn React Router navigation
- ✅ Chặn đóng tab

### GitHub
- ❌ KHÔNG auto-save
- ✅ Chặn đóng tab khi có thay đổi
- ❌ KHÔNG chặn React Router navigation

## 🎯 Kết Luận

**Hệ thống hiện tại ĐÃ TỐT HƠN hầu hết các app khác** vì:

1. ✅ Auto-save (1.2s) - Bảo vệ tốt nhất
2. ✅ Chặn đóng tab/refresh
3. ✅ Modal xác nhận khi lưu
4. ✅ Tracking changes chính xác

**Không chặn React Router navigation là ĐÚNG** vì:
- Auto-save đã bảo vệ
- Không có API stable để implement
- Tránh UX xấu (confirm dialog liên tục)

## 💡 Khuyến Nghị Cho User

### Nếu Lo Mất Data:
1. **Bật Auto-Save** (mặc định đã bật)
2. **Nhấn "Lưu" thủ công** trước khi navigate
3. **Chú ý thông báo** "Đã lưu phiên bản mới thành công!"

### Nếu Muốn Chắc Chắn:
1. Sửa xong → Nhấn "Lưu"
2. Đợi thông báo "Đã lưu..."
3. Mới navigate đi nơi khác

## 🚀 Tương Lai

Nếu React Router release stable API cho blocking navigation, sẽ update ngay.

Hiện tại: **Auto-save là giải pháp tốt nhất và đủ dùng**.
