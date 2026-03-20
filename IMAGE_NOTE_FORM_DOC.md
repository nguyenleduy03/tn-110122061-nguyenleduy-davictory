/**
 * IMAGE_NOTE_FORM_DOC.md
 * Tài liệu module mới: IMAGE_NOTE_FORM
 */

# 📸 MODULE MỚI: IMAGE_NOTE_FORM

## Mô tả
Kết hợp **Map Labelling** + **Note Form** để tạo dạng câu hỏi:
- Có ảnh (có thể ở trên hoặc dưới)
- Có đoạn văn/form có chỗ trống
- Học viên điền vào chỗ trống
- Tính điểm tự động như các loại câu hỏi khác

## Cấu trúc dữ liệu

```javascript
{
  contentType: 'IMAGE_NOTE_FORM',
  title: 'Ảnh + Note Form 1',
  imageUrl: 'https://example.com/image.jpg',  // Link ảnh
  imagePosition: 'top',                        // 'top' hoặc 'bottom'
  imageWidth: 100,                             // % độ rộng (50-100)
  noteText: 'Form text với (1) _____ chỗ trống',
  fromQuestion: 1,
  toQuestion: 5,
  questions: [
    {
      id: 1,
      questionNumber: 1,
      questionText: '',                        // Để trống vì dùng noteText
      answerText: 'correct answer',            // Đáp án đúng
      questionType: { typeName: 'FILL_IN_BLANK' },
      points: 1
    }
  ]
}
```

## Cách sử dụng

### 1. Trong Test Builder
- Kéo "Ảnh + Note Form" từ Sidebar vào Part
- Upload ảnh hoặc nhập URL
- Chọn vị trí ảnh: Trên hoặc Dưới
- Nhập nội dung form với placeholder (1), (2), (3)...
- Thêm câu hỏi và nhập đáp án đúng

### 2. Ví dụ thực tế

**Ảnh**: Sơ đồ nhà
**Vị trí**: Trên
**Note Text**:
```
HOUSE PLAN

Ground Floor:
- Living room: (1) _____ square meters
- Kitchen: Located in the (2) _____
- Bathroom: Next to the (3) _____

First Floor:
- Bedroom 1: (4) _____ square meters
- Bedroom 2: Has a (5) _____
```

**Questions**:
1. Answer: "25"
2. Answer: "north"
3. Answer: "kitchen"
4. Answer: "18"
5. Answer: "balcony"

## Chấm điểm

- Tự động so sánh câu trả lời với `answerText`
- Không phân biệt hoa thường
- Trim khoảng trắng
- Mỗi câu đúng = 1 điểm (hoặc tùy chỉnh `points`)

## Files đã chỉnh sửa

1. ✅ `/frontend/src/pages/TestBuilder.jsx`
   - Thêm case 'IMAGE_NOTE_FORM' vào hàm addGroup()

2. ✅ `/frontend/src/components/testBuilder/BuilderSidebar.jsx`
   - Thêm vào PALETTE_ITEMS
   - Thêm vào TYPE_META

3. 🔄 `/frontend/src/components/testBuilder/ExamCanvas.jsx`
   - Cần thêm render logic cho IMAGE_NOTE_FORM

4. 🔄 `/frontend/src/components/testBuilder/PropertiesPanel.jsx`
   - Cần thêm form chỉnh sửa IMAGE_NOTE_FORM

5. 🔄 `/frontend/src/components/testBuilder/PreviewModal.jsx`
   - Cần thêm preview IMAGE_NOTE_FORM

6. 🔄 Backend (nếu cần)
   - Có thể cần thêm enum IMAGE_NOTE_FORM vào ContentType

## Tính năng đặc biệt

- ✅ Ảnh có thể ở trên hoặc dưới
- ✅ Tùy chỉnh độ rộng ảnh (50-100%)
- ✅ Hỗ trợ cả Listening và Reading
- ✅ Tự động đánh số câu hỏi
- ✅ Chấm điểm tự động

## TODO

- [ ] Thêm render trong ExamCanvas
- [ ] Thêm form edit trong PropertiesPanel
- [ ] Thêm preview trong PreviewModal
- [ ] Test với backend
- [ ] Thêm vào component làm bài (IeltsReadingTest, IeltsListeningTest)
