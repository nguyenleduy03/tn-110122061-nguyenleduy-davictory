# Fix: Table Completion - Đáp án bị mất khi sửa nội dung ô

## Vấn đề

Khi tạo câu hỏi dạng Table Completion:
1. Người dùng tạo bảng với các ô trống `[blank]`
2. Nhập đáp án cho các câu hỏi (ví dụ: "a")
3. Sửa đáp án thành giá trị khác (ví dụ: "b")
4. Click vào bất kỳ field nào khác (instructions, checkbox, etc.)
5. **Đáp án bị reset về giá trị cũ "a" thay vì giữ "b"**

## Nguyên nhân

### 1. Stale Closure Problem
- Khi `onUpdateQuestion` được gọi để cập nhật đáp án, nó cập nhật state trong `TestBuilder`
- Component `TableCompletionBlock` nhận props mới qua re-render
- Nhưng các hàm callback (`setCell`, `syncAndSave`) vẫn giữ reference cũ của `questions` (closure)

### 2. Race Condition giữa updateQuestion và updateGroup
- User nhập "b" → `onUpdateQuestion` được gọi → `setParts` với questions có "b"
- User click checkbox → `onUpdate` được gọi → `updateGroup` được gọi
- `updateGroup` sử dụng `{ ...g, ...updates }` để merge
- Nếu `updates` không có `questions`, nó giữ nguyên `questions` từ `g` (state cũ)
- State cũ này có thể chưa có "b" nếu React chưa flush update từ `updateQuestion`

### 3. Sync không cần thiết
- Mỗi lần sửa nội dung ô, `setCell` đều gọi `syncAndSave`
- `syncAndSave` gọi `syncTcQuestions` để tạo lại mảng questions
- Nếu số lượng blank không đổi, việc sync này không cần thiết và có thể làm mất đáp án

## Giải pháp

### 1. Sử dụng `useRef` để lưu questions mới nhất
```javascript
const questionsRef = React.useRef(questions);
React.useEffect(() => {
  questionsRef.current = questions;
}, [questions]);

const syncAndSave = (cols, rows, qOverride) => {
  const newQs = qOverride ?? syncTcQuestions(cols, rows, questionsRef.current, fromQ);
  onUpdate(group.id, { columns: cols, tableRows: rows, questions: newQs });
};
```

**Lý do**: `useRef` không bị ảnh hưởng bởi closure, luôn trỏ đến giá trị mới nhất.

### 2. Chỉ sync khi số lượng blank thay đổi
```javascript
const setCell = (rowId, colId, val) => {
  const newRows = tableRows.map((r) =>
    r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: val } } : r
  );
  
  const oldBlankCount = (tableRows.find(r => r.id === rowId)?.cells?.[colId] ?? '').match(/\[blank\]/g)?.length ?? 0;
  const newBlankCount = (val ?? '').match(/\[blank\]/g)?.length ?? 0;
  
  if (oldBlankCount !== newBlankCount) {
    syncAndSave(columns, newRows);
  } else {
    onUpdate(group.id, { tableRows: newRows, questions: questionsRef.current });
  }
};
```

### 3. **QUAN TRỌNG**: Luôn truyền questions khi gọi onUpdate
Đây là fix chính cho vấn đề race condition:

```javascript
// Khi cập nhật bất kỳ field nào, luôn truyền questions hiện tại
onChange={(e) => onUpdate(group.id, { 
  ignoreCase: e.target.checked, 
  questions: questionsRef.current  // ← Prevent overwrite
})}
```

Áp dụng cho tất cả các field:
- `instructions`
- `tableTitle`
- `ignoreCase`, `ignoreSpaces`, `ignorePunctuation`, `ignoreChars`
- `tableRows` (khi không sync)
- `columns` (khi update header)

## Kết quả

- ✅ Đáp án không bị mất khi sửa và click vào field khác
- ✅ Đáp án không bị mất khi sửa nội dung ô (không thay đổi số blank)
- ✅ Questions vẫn được sync đúng khi thêm/xóa blank
- ✅ Performance tốt hơn (ít sync không cần thiết)

## Test Cases

### Test 1: Sửa đáp án và click checkbox
1. Tạo bảng với ô có nội dung: "The capital is [blank]"
2. Nhập đáp án: "a"
3. Sửa đáp án thành: "b"
4. Click vào checkbox "Bỏ qua hoa/thường"
5. **Kỳ vọng**: Đáp án vẫn là "b" ✅

### Test 2: Sửa đáp án và sửa instructions
1. Tạo bảng với ô có nội dung: "The capital is [blank]"
2. Nhập đáp án: "London"
3. Sửa đáp án thành: "Paris"
4. Click vào field "Hướng dẫn" và nhập text
5. **Kỳ vọng**: Đáp án vẫn là "Paris" ✅

### Test 3: Sửa nội dung ô không thay đổi blank
1. Tạo bảng với ô có nội dung: "The capital is [blank]"
2. Nhập đáp án: "London"
3. Sửa nội dung ô thành: "The capital city is [blank]"
4. **Kỳ vọng**: Đáp án "London" vẫn còn ✅

## Files Changed

- `frontend/src/components/testBuilder/blocks/ImageBlock.jsx`
  - Thêm `questionsRef` để lưu questions mới nhất
  - Sửa `setCell` để chỉ sync khi số blank thay đổi
  - Sửa `handlePaste` để tối ưu sync
  - **Sửa tất cả các `onUpdate` calls để luôn truyền `questions: questionsRef.current`**
