# 🖼️ DROPDOWN VỚI ẢNH - MATCHING PAIRS

## 📋 TỔNG QUAN

Đã áp dụng logic lưu ảnh cho dạng câu hỏi dropdown/matching với hình ảnh.

---

## ✅ ĐÃ IMPLEMENT

### 1. Database
- ✅ Thêm column `image_url` vào bảng `matching_pairs`
- ✅ Type: VARCHAR(500)
- ✅ Nullable: YES
- ✅ Lưu Google Drive link

### 2. Backend Entity
- ✅ `MatchingPair.java` - Thêm field `imageUrl`

### 3. DTOs
- ✅ `MatchingPairRequest` - Thêm `imageUrl` (input)
- ✅ `MatchingPairResp` - Thêm `imageUrl` (output)

### 4. Service
- ✅ `QuestionBankService.java` - Lưu `imageUrl` khi tạo matching pair

### 5. Mapping
- ✅ `QuestionGroupResponse.toMatchingPairResp()` - Map `imageUrl`

---

## 📡 API USAGE

### Tạo Question Group với Dropdown có ảnh:

```json
POST /api/test-builder/question-groups

{
  "questionTypeCode": "MATCHING",
  "title": "Match the images to descriptions",
  "instructions": "Select the correct description for each image",
  "matchingPairs": [
    {
      "leftLabel": "A",
      "leftContent": "Image 1",
      "rightLabel": "1",
      "rightContent": "Description 1",
      "imageUrl": "https://drive.google.com/uc?id=1ABC...",
      "matchType": "IMAGE_TO_TEXT",
      "orderIndex": 0
    },
    {
      "leftLabel": "B",
      "leftContent": "Image 2",
      "rightLabel": "2",
      "rightContent": "Description 2",
      "imageUrl": "https://drive.google.com/uc?id=2DEF...",
      "matchType": "IMAGE_TO_TEXT",
      "orderIndex": 1
    }
  ]
}
```

### Response:

```json
{
  "id": 123,
  "questionTypeCode": "MATCHING",
  "title": "Match the images to descriptions",
  "matchingPairs": [
    {
      "id": 456,
      "leftLabel": "A",
      "leftContent": "Image 1",
      "rightLabel": "1",
      "rightContent": "Description 1",
      "imageUrl": "https://drive.google.com/uc?id=1ABC...",
      "matchType": "IMAGE_TO_TEXT",
      "orderIndex": 0
    }
  ]
}
```

---

## 🎨 FRONTEND USAGE

### Hiển thị dropdown với ảnh:

```jsx
import React from 'react';

const DropdownWithImage = ({ matchingPairs, value, onChange }) => {
  return (
    <select value={value} onChange={onChange}>
      <option value="">-- Select --</option>
      {matchingPairs.map(pair => (
        <option key={pair.id} value={pair.leftLabel}>
          {pair.leftLabel}. {pair.leftContent}
        </option>
      ))}
    </select>
  );
};

// Hiển thị ảnh bên cạnh
const ImagePreview = ({ matchingPairs, selectedValue }) => {
  const selected = matchingPairs.find(p => p.leftLabel === selectedValue);
  
  return selected?.imageUrl ? (
    <img 
      src={selected.imageUrl} 
      alt={selected.leftContent}
      style={{ maxWidth: 200, maxHeight: 200 }}
    />
  ) : null;
};
```

---

## 🔍 USE CASES

### 1. Map Labeling
- Hiển thị bản đồ
- Dropdown chọn địa điểm
- Mỗi option có ảnh minh họa

### 2. Diagram Labeling
- Hiển thị sơ đồ
- Dropdown chọn phần
- Mỗi option có ảnh chi tiết

### 3. Picture Matching
- Chọn ảnh phù hợp với mô tả
- Dropdown có thumbnail
- Click để xem ảnh lớn

### 4. Object Identification
- Nhận diện đối tượng
- Dropdown có ảnh mẫu
- So sánh với ảnh gốc

---

## 📊 DATABASE SCHEMA

```sql
matching_pairs
├── id (PK)
├── question_group_id (FK)
├── left_label (A, B, C...)
├── left_content (Text)
├── right_label (1, 2, 3...)
├── right_content (Text)
├── image_url (VARCHAR 500) ← NEW
├── match_type (IMAGE_TO_TEXT, etc.)
├── order_index
├── created_at
└── updated_at
```

---

## 🔗 IMAGE URL FORMAT

### Google Drive:
```
https://drive.google.com/uc?id={FILE_ID}
```

### Direct URL:
```
https://example.com/images/photo.jpg
```

### Relative Path:
```
/uploads/images/photo.jpg
```

---

## 🎯 MATCH TYPES

Có thể dùng cho các loại:

- `IMAGE_TO_TEXT` - Ảnh → Text
- `IMAGE_TO_IMAGE` - Ảnh → Ảnh
- `MAP_LABELING` - Đánh dấu bản đồ
- `DIAGRAM_LABELING` - Đánh dấu sơ đồ
- `PICTURE_MATCHING` - Ghép ảnh
- `OBJECT_IDENTIFICATION` - Nhận diện vật

---

## 🧪 TESTING

### 1. Tạo matching pair với ảnh:
```bash
curl -X POST http://localhost:8080/api/test-builder/question-groups \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "questionTypeCode": "MATCHING",
    "matchingPairs": [{
      "leftLabel": "A",
      "leftContent": "Image 1",
      "imageUrl": "https://example.com/image.jpg",
      "matchType": "IMAGE_TO_TEXT",
      "orderIndex": 0
    }]
  }'
```

### 2. Lấy question group:
```bash
curl http://localhost:8080/api/test-builder/question-groups/{id} \
  -H "Authorization: Bearer {token}"
```

### 3. Verify imageUrl trong response

---

## 📝 NOTES

- `imageUrl` là optional (nullable)
- Hỗ trợ Google Drive links
- Frontend tự quyết định cách hiển thị
- Có thể dùng cho nhiều loại matching
- Tương thích với logic cũ (backward compatible)

---

## 🚀 NEXT STEPS

1. Upload ảnh qua Google Drive API
2. Tạo UI component cho dropdown với ảnh
3. Thêm image preview khi hover
4. Support multiple images per option
5. Add image validation
