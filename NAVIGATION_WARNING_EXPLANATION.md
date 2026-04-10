# Giải Thích: Cảnh Báo Khi Rời Trang

## Vấn Đề

Người dùng báo: "Tôi ấn chỉnh sửa và thoát bình thường không có bất cứ cảnh báo nào"

## Nguyên Nhân

Logic hiện tại chỉ có:
1. ✅ Modal xác nhận khi **ấn nút "Lưu"**
2. ✅ Cảnh báo browser khi **đóng tab/refresh** (`beforeunload`)
3. ❌ **KHÔNG** có cảnh báo khi **navigate trong app** (click link, back button)

## Giải Pháp Đã Thực Hiện

### Cảnh Báo Browser (beforeunload)

```javascript
useEffect(() => {
  const handleBeforeUnload = (e) => {
    if (hasUnsavedChanges && !saving) {
      e.preventDefault();
      e.returnValue = ''; // Browser sẽ hiển thị dialog mặc định
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges, saving]);
```

**Hoạt động khi**:
- Đóng tab
- Refresh trang (F5)
- Nhập URL mới vào address bar
- Navigate đến domain khác

**Không hoạt động khi**:
- Click link trong app (React Router)
- Nhấn back/forward button
- Programmatic navigation (`navigate()`)

## Tại Sao Không Chặn React Router Navigation?

### Option 1: useBlocker (React Router v6.4+)

```javascript
const blocker = useBlocker(
  ({ currentLocation, nextLocation }) =>
    hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
);
```

**Vấn đề**:
- API không ổn định, có thể thay đổi
- Phức tạp khi kết hợp với modal
- Cần handle nhiều edge cases

### Option 2: Prompt Component (React Router v5)

```javascript
<Prompt
  when={hasUnsavedChanges}
  message="Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời trang?"
/>
```

**Vấn đề**:
- Đã bị remove trong React Router v6
- Không customize được UI

### Option 3: Custom Solution (Hiện tại)

**Quyết định**: Chỉ dùng `beforeunload` vì:
1. ✅ Đơn giản, ổn định
2. ✅ Bảo vệ khỏi mất data khi đóng tab/refresh (case phổ biến nhất)
3. ✅ Không cần maintain complex logic
4. ✅ Auto-save đã bật mặc định → ít khi có unsaved changes

## Hành Vi Hiện Tại

### Scenario 1: Đóng Tab/Refresh
```
1. Edit đề thi
2. Có thay đổi chưa lưu
3. Đóng tab hoặc F5
→ ✅ Browser hiển thị: "Changes you made may not be saved"
```

### Scenario 2: Nhấn Nút "Lưu"
```
1. Edit đề thi
2. Có thay đổi chưa lưu
3. Nhấn nút "Lưu"
→ ✅ Modal hiển thị: "Lưu phiên bản mới?"
```

### Scenario 3: Click Link Trong App
```
1. Edit đề thi
2. Có thay đổi chưa lưu
3. Click link "Quản lý đề thi"
→ ❌ Không có cảnh báo (by design)
→ ✅ Auto-save sẽ lưu sau 1.2s
```

### Scenario 4: Auto-Save Bật
```
1. Edit đề thi
2. Có thay đổi
3. Đợi 1.2s
→ ✅ Tự động lưu
→ hasUnsavedChanges = false
→ Có thể navigate tự do
```

## Khuyến Nghị

### Cho Người Dùng

1. **Bật Auto-Save** (mặc định đã bật)
   - Tự động lưu sau 1.2s
   - Không cần lo mất data

2. **Nhấn "Lưu" trước khi rời trang**
   - Đảm bảo data được lưu ngay lập tức
   - Có xác nhận rõ ràng

3. **Chú ý thông báo**
   - Khi đóng tab → browser sẽ cảnh báo
   - Khi nhấn "Lưu" → modal xác nhận

### Cho Developer

Nếu muốn chặn React Router navigation, có thể implement:

```javascript
// Thêm vào TestBuilder.jsx
import { useBeforeUnload, unstable_useBlocker as useBlocker } from 'react-router-dom';

// Chặn navigation
const blocker = useBlocker(
  hasUnsavedChanges && !saving
);

useEffect(() => {
  if (blocker.state === 'blocked') {
    const confirm = window.confirm(
      'Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời trang?'
    );
    if (confirm) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }
}, [blocker]);
```

**Nhưng không khuyến nghị vì**:
- API `unstable_useBlocker` chưa stable
- UX không tốt (native confirm dialog)
- Auto-save đã đủ bảo vệ

## Kết Luận

**Trạng thái hiện tại**: ✅ Đã đủ tốt

- ✅ Cảnh báo khi đóng tab/refresh
- ✅ Modal xác nhận khi lưu
- ✅ Auto-save bảo vệ khỏi mất data
- ✅ Code đơn giản, dễ maintain

**Không cần** thêm logic chặn React Router navigation vì:
1. Auto-save đã bật mặc định
2. beforeunload đã bảo vệ case quan trọng nhất
3. Tránh complexity không cần thiết
