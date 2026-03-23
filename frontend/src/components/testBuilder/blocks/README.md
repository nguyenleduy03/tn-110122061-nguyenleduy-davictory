# Test Builder Blocks - Cấu trúc module

## Tổng quan

ExamCanvas.jsx đã được tách thành các module riêng biệt để dễ bảo trì và phát triển.

### Trước khi tách:
- **ExamCanvas.jsx**: 3,757 dòng (171KB)
- Tất cả logic của 17 loại câu hỏi nằm trong 1 file

### Sau khi tách:
- **ExamCanvas.jsx**: 502 dòng (giảm 87%)
- **17 block files riêng biệt** trong thư mục `blocks/`
- **Shared utilities** trong `blocks/shared/`

## Cấu trúc thư mục

```
testBuilder/
├── ExamCanvas.jsx                    # Component chính (502 dòng)
├── blocks/
│   ├── index.js                      # Export tất cả blocks
│   │
│   ├── shared/                       # Utilities dùng chung
│   │   ├── blockTypes.js             # TYPE_META constants
│   │   ├── blockHelpers.js           # Helper functions
│   │   ├── GroupToolbar.jsx          # Toolbar component
│   │   └── RichBlankEditor.jsx       # Editor cho blank questions
│   │
│   ├── PassageBlock.jsx              # Đoạn văn Reading (213 dòng)
│   ├── AudioBlock.jsx                # Audio Listening (18 dòng)
│   ├── ImageBlock.jsx                # Hình ảnh/Diagram (756 dòng)
│   ├── DragMatchingBlock.jsx         # Kéo thả matching (126 dòng)
│   ├── MatchingFeaturesBlock.jsx     # Matching Features (151 dòng)
│   ├── MatchingHeadingBlock.jsx      # Matching Headings (240 dòng)
│   ├── MultipleChoiceBlock.jsx       # Trắc nghiệm 1 đáp án (140 dòng)
│   ├── MultipleChoiceMultiBlock.jsx  # Trắc nghiệm nhiều đáp án (128 dòng)
│   ├── TFNGBlock.jsx                 # True/False/Not Given (69 dòng)
│   ├── SentenceCompletionBlock.jsx   # Hoàn thành câu (58 dòng)
│   ├── ShortAnswerBlock.jsx          # Trả lời ngắn (58 dòng)
│   ├── NoteCompletionBlock.jsx       # Note/Form Completion (51 dòng)
│   ├── ImageNoteFormBlock.jsx        # Ảnh + Note Form (475 dòng)
│   ├── SummaryCompletionBlock.jsx    # Summary Completion (202 dòng)
│   ├── SpeakingInterviewBlock.jsx    # Speaking Interview (77 dòng)
│   ├── SpeakingCueCardBlock.jsx      # Speaking Cue Card (97 dòng)
│   └── WritingTaskBlock.jsx          # Writing Task (201 dòng)
```

## Cách sử dụng

### Import blocks trong ExamCanvas.jsx:

```javascript
import {
  PassageBlock,
  AudioBlock,
  ImageBlock,
  // ... các blocks khác
  TYPE_META,
  toRoman,
} from './blocks';
```

### Thêm loại câu hỏi mới:

1. Tạo file mới trong `blocks/`, ví dụ: `NewQuestionBlock.jsx`
2. Copy template từ block tương tự
3. Export trong `blocks/index.js`
4. Import và sử dụng trong `ExamCanvas.jsx`

### Sửa logic của một loại câu hỏi:

- Chỉ cần sửa file block tương ứng trong `blocks/`
- Không ảnh hưởng đến các blocks khác

## Lợi ích

✅ **Dễ bảo trì**: Mỗi loại câu hỏi có file riêng, dễ tìm và sửa

✅ **Tái sử dụng**: Shared utilities được tách riêng, tránh duplicate code

✅ **Hiệu suất**: Code splitting tự động, chỉ load blocks cần thiết

✅ **Collaboration**: Nhiều người có thể làm việc song song trên các blocks khác nhau

✅ **Testing**: Dễ dàng test từng block độc lập

## Backup

File gốc được backup tại:
```
ExamCanvas.jsx.backup
```

## Lưu ý

- Tất cả blocks đều import từ `./blocks/shared/` để sử dụng utilities chung
- Không nên sửa trực tiếp file `ExamCanvas.jsx.backup`
- Khi thêm helper function mới, thêm vào `blocks/shared/blockHelpers.js`
