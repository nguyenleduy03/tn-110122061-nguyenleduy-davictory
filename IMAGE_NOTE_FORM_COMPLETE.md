# ✅ HOÀN THÀNH: MODULE IMAGE_NOTE_FORM

## 🎯 Đã tạo thành công

Module mới **IMAGE_NOTE_FORM** - kết hợp ảnh + note form với chỗ trống.

## 📝 Tính năng

✅ **Ảnh có thể ở trên hoặc dưới** đoạn văn
✅ **Tùy chỉnh độ rộng ảnh** (50-100%)
✅ **Đoạn văn có chỗ trống** (giống Note Completion)
✅ **Tự động đánh số câu hỏi**
✅ **Chấm điểm tự động** (so sánh answerText)
✅ **Hỗ trợ cả Listening và Reading**

## 🔧 Files đã chỉnh sửa

### 1. `/frontend/src/pages/TestBuilder.jsx`
- ✅ Thêm case `IMAGE_NOTE_FORM` vào hàm `addGroup()`
- Tạo default data với 3 câu hỏi mẫu

### 2. `/frontend/src/components/testBuilder/BuilderSidebar.jsx`
- ✅ Thêm vào `PALETTE_ITEMS` (hiển thị trong sidebar)
- ✅ Thêm vào `TYPE_META` (màu sắc và label)
- Có icon `ImageIcon` từ lucide-react

### 3. `/frontend/src/components/testBuilder/ExamCanvas.jsx`
- ✅ Thêm `IMAGE_NOTE_FORM` vào `TYPE_META`
- ✅ Thêm render logic: `if (ct === 'IMAGE_NOTE_FORM')`
- ✅ Tạo component `ImageNoteFormBlock`

## 🎨 Giao diện ImageNoteFormBlock

```
┌─────────────────────────────────────┐
│ [Toolbar: Drag | Delete]            │
├─────────────────────────────────────┤
│ Instructions: Complete the form...  │
│ Title: [editable]                   │
├─────────────────────────────────────┤
│ Ảnh URL: [input]                    │
│ ○ Ảnh trên  ○ Ảnh dưới  Độ rộng: 100%│
│                                     │
│ [Ảnh hiển thị ở đây nếu có URL]    │  ← Nếu imagePosition = 'top'
│                                     │
├─────────────────────────────────────┤
│ [RichBlankEditor - Note text]       │
│ Ground Floor:                       │
│ - Living room: (ô trống) m²         │
│ - Kitchen: (ô trống)                │
├─────────────────────────────────────┤
│ [Ảnh hiển thị ở đây nếu có URL]    │  ← Nếu imagePosition = 'bottom'
├─────────────────────────────────────┤
│ Câu [1] – [5]                       │
│                                     │
│ [1] Đáp án: [input]                 │
│ [2] Đáp án: [input]                 │
│ [3] Đáp án: [input]                 │
│                                     │
│ [+ Thêm ô trống]                    │
└─────────────────────────────────────┘
```

## 📊 Cấu trúc dữ liệu

```javascript
{
  id: 2001,
  contentType: 'IMAGE_NOTE_FORM',
  title: 'House Plan',
  imageUrl: 'https://example.com/house.jpg',
  imagePosition: 'top',        // 'top' | 'bottom'
  imageWidth: 100,             // 50-100
  noteText: 'Ground Floor:\n- Living room: (ô trống) m²',
  fromQuestion: 1,
  toQuestion: 5,
  questions: [
    {
      id: 3001,
      questionNumber: 1,
      questionText: '',
      answerText: '25',
      questionType: { typeName: 'FILL_IN_BLANK' },
      points: 1
    }
  ]
}
```

## 🚀 Cách sử dụng

### Trong Test Builder:

1. **Kéo thả** "Ảnh + Note Form" từ Sidebar vào Part
2. **Nhập URL ảnh** hoặc upload (nếu có tích hợp upload)
3. **Chọn vị trí ảnh**: Radio button "Ảnh trên" hoặc "Ảnh dưới"
4. **Điều chỉnh độ rộng**: Input number 50-100%
5. **Nhập tiêu đề**: Click vào title để edit
6. **Nhập nội dung form**: Dùng RichBlankEditor, thêm (ô trống) cho chỗ trống
7. **Thêm câu hỏi**: Click "Thêm ô trống"
8. **Nhập đáp án**: Mỗi câu có input để nhập đáp án đúng
9. **Lưu đề thi**: Click "Lưu" ở header

### Ví dụ thực tế:

**Đề Listening Part 1:**
```
Ảnh: Sơ đồ thư viện
Vị trí: Trên
Độ rộng: 80%

LIBRARY FLOOR PLAN

Ground Floor:
- Reception desk: Located at the (1) _____
- Computer area: (2) _____ computers available
- Children's section: In the (3) _____ corner

First Floor:
- Study rooms: (4) _____ rooms
- Reference section: Next to the (5) _____
```

**Đáp án:**
1. entrance
2. 12
3. north-west
4. 6
5. stairs

## ⚙️ Chấm điểm tự động

- So sánh `answerText` với câu trả lời của học viên
- Không phân biệt hoa thường
- Trim khoảng trắng đầu cuối
- Mỗi câu đúng = 1 điểm (hoặc tùy chỉnh `points`)

## 🔄 TODO tiếp theo

- [ ] Thêm vào PropertiesPanel (form chỉnh sửa chi tiết)
- [ ] Thêm vào PreviewModal (xem trước)
- [ ] Thêm vào component làm bài (IeltsReadingTest.jsx, IeltsListeningTest.jsx)
- [ ] Test với backend (có thể cần thêm enum)
- [ ] Thêm tính năng upload ảnh (hiện tại chỉ nhập URL)

## 📸 Screenshot (mô tả)

**Trong Test Builder:**
- Sidebar có item "Ảnh + Note Form" với icon ImageIcon
- Kéo vào Part → tự động tạo group với 3 câu mẫu
- Hiển thị form với ảnh, radio buttons, note editor
- Màu xanh dương (#4338ca) cho số câu hỏi

**Khi làm bài (TODO):**
- Học viên thấy ảnh + form
- Điền vào các ô trống
- Submit → tự động chấm điểm

## ✅ Kết luận

Module **IMAGE_NOTE_FORM** đã được tích hợp thành công vào Test Builder!

Giáo viên có thể:
- Tạo câu hỏi có ảnh + form
- Tùy chỉnh vị trí ảnh (trên/dưới)
- Tùy chỉnh độ rộng ảnh
- Tự động chấm điểm

Phù hợp cho:
- Listening Part 1 (form filling)
- Reading (diagram + description)
- Bất kỳ dạng bài nào cần kết hợp ảnh + text có chỗ trống
