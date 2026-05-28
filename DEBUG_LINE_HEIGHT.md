# Debug Line Height Feature

## Các bước kiểm tra:

1. **Mở Test Builder** trong trình duyệt
2. **Mở DevTools Console** (F12)
3. **Tìm dropdown** trong toolbar phần "Đoạn văn"
4. **Click vào dropdown** → Xem console log "Line height dropdown clicked"
5. **Chọn một giá trị** → Xem console log:
   - "Line height changed to: X.X"
   - "Target editable: [element]"
   - "Applied lineHeight: X.X"

## Nếu không thấy dropdown:

### Kiểm tra 1: Dropdown có render không?
```javascript
// Trong Console
document.querySelector('select[title="Khoảng cách dòng"]')
// Nếu null → dropdown không render
```

### Kiểm tra 2: Toolbar có hiển thị không?
- Tìm nút toggle toolbar (icon ChevronUp/ChevronDown)
- Click để hiện/ẩn toolbar
- Dropdown nằm trong `showFormatToolbar` section

### Kiểm tra 3: CSS có ẩn dropdown không?
```javascript
// Trong Console
const select = document.querySelector('select[title="Khoảng cách dòng"]');
console.log(window.getComputedStyle(select).display);
// Nếu 'none' → bị CSS ẩn
```

## Nếu dropdown hiển thị nhưng không mở:

### Nguyên nhân: Event handler chặn
- Đã sửa: Xóa `onMouseDown` với `e.preventDefault()`
- Dùng `onFocus` thay thế

## Nếu chọn giá trị nhưng không có hiệu ứng:

### Kiểm tra target element:
```javascript
// Trong Console khi focus vào contentEditable
window.getSelection().anchorNode.parentElement.closest('[contenteditable="true"]')
```

## Vị trí trong code:

File: `frontend/src/components/testBuilder/BuilderHeader.jsx`
Dòng: ~985-1005
Section: "Đoạn văn" (tb-rgroup)
