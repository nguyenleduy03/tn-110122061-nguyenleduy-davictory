# Fix lỗi "toPlainText is not defined"

## Nguyên nhân
Helper functions chưa được import đầy đủ vào ExamCanvas.jsx

## Đã sửa

### 1. Cập nhật imports trong ExamCanvas.jsx

Đã thêm các helper functions vào import:

```javascript
import {
  // ... các blocks
  TYPE_META,
  toRoman,
  toPlainText,              // ✅ Đã thêm
  countBlankTokens,         // ✅ Đã thêm
  getQuestionWeight,        // ✅ Đã thêm
  getPartQuestionStartNumber, // ✅ Đã thêm
  getNextQuestionNumber,    // ✅ Đã thêm
} from './blocks';
```

### 2. Xóa cache

```bash
cd frontend
rm -rf node_modules/.vite
```

### 3. Restart dev server

```bash
pkill -f vite
npm run dev
```

## Kiểm tra

Mở trình duyệt và kiểm tra:
- Không còn lỗi "toPlainText is not defined"
- Test Builder hoạt động bình thường

## Nếu vẫn lỗi

1. Hard refresh trình duyệt: `Ctrl + Shift + R`
2. Xóa cache trình duyệt
3. Restart lại dev server

## Files đã sửa

- ✅ `ExamCanvas.jsx` - Thêm imports
- ✅ Xóa cache Vite
