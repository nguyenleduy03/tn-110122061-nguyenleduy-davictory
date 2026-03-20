# Hướng dẫn: Thêm biến thể câu hỏi (Drag-drop ↔ Fill-in)

## Tổng quan

Đã thêm 6 loại câu hỏi mới để đa dạng hóa các dạng bài tập:

### 1. Biến thể: Matching → Fill-in (điền khuyết)
- **MATCHING_FILLABLE**: Matching dạng điền khuyết
- **MATCHING_HEADINGS_FILLABLE**: Matching Headings dạng điền khuyết

### 2. Biến thể: Fill-in → Drag-drop (kéo thả)
- **FILL_BLANK_DRAG**: Fill in the Blank dạng drag-drop
- **SENTENCE_COMPLETION_DRAG**: Sentence Completion dạng drag-drop
- **SUMMARY_COMPLETION_DRAG**: Summary Completion dạng drag-drop
- **NOTE_COMPLETION_DRAG**: Note/Table/Form Completion dạng drag-drop

## Các file đã thay đổi

### Backend
1. **QuestionTypeEnum.java** - Thêm 6 enum mới
2. **add_question_type_variants.sql** - Migration SQL để thêm vào database

### Frontend
1. **ieltsApi.js** - Mapping từ backend code → frontend type
2. **PropertiesPanel.jsx** - Dropdown chọn loại câu hỏi
3. **ExamCanvas.jsx** - Visual metadata (màu sắc, label)
4. **BuilderSidebar.jsx** - Palette để kéo thả tạo câu hỏi mới

## Cách triển khai

### Bước 1: Chạy migration SQL
```bash
mysql -u root -p davictory < add_question_type_variants.sql
```

### Bước 2: Build lại backend
```bash
cd backend
./mvnw clean package
```

### Bước 3: Restart services
```bash
./stop.sh
./start.sh
```

## Cách sử dụng

### Trong Test Builder:

1. **Tạo câu hỏi mới**: Kéo loại câu hỏi từ sidebar vào canvas
2. **Chuyển đổi loại**: Chọn câu hỏi → Properties Panel → chọn loại mới từ dropdown
3. **Các loại mới xuất hiện trong**:
   - Sidebar palette (phần READING và LISTENING)
   - Properties panel dropdown
   - Preview modal

### Ví dụ sử dụng:

**Matching → Fill-in:**
- Thay vì kéo thả để nối, học viên điền trực tiếp đáp án vào ô trống
- Phù hợp cho bài tập tự luận, kiểm tra nhớ

**Fill-in → Drag-drop:**
- Thay vì gõ đáp án, học viên kéo từ ngân hàng từ vào chỗ trống
- Phù hợp cho người mới học, giảm lỗi chính tả

## Lưu ý kỹ thuật

### Cấu trúc dữ liệu:
- **hasMatching = true**: Dạng drag-drop, cần `matching_pairs` table
- **hasTextAnswer = true**: Dạng fill-in, lưu text trong `correct_answer`
- **hasOptions = true**: Dạng multiple choice, cần `question_options` table

### Frontend rendering:
- Các dạng drag-drop → render component `DragDropGroupQuestion`
- Các dạng fill-in → render input text hoặc textarea
- Mapping logic trong `ieltsApi.js` và `QuestionRenderer.jsx`

## Testing

Kiểm tra các chức năng:
- ✅ Tạo câu hỏi mới với loại biến thể
- ✅ Chuyển đổi giữa các loại
- ✅ Lưu và load test
- ✅ Preview hiển thị đúng
- ✅ Làm bài và chấm điểm

## Mở rộng trong tương lai

Có thể thêm các biến thể khác:
- Multiple Choice → True/False
- Short Answer → Multiple Choice
- Diagram → Table
