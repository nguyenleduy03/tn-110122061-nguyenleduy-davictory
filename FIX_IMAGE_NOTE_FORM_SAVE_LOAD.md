# 🐛 FIX: IMAGE_NOTE_FORM - Lưu và Load đoạn văn + vị trí ảnh

## ❌ Vấn đề

Khi tạo câu hỏi dạng **IMAGE_NOTE_FORM**:
- ✅ Câu hỏi lưu được
- ❌ Đoạn văn (`noteText`) không lưu
- ❌ Vị trí ảnh (`imagePosition`) không lưu  
- ❌ Độ rộng ảnh (`imageWidth`) không lưu
- ❌ Load lại trang → mất hết dữ liệu trên

## 🔍 Nguyên nhân

Trong file `/frontend/src/services/testBuilderApi.js`:

### 1. Hàm `serializeGroupContent()` - Thiếu xử lý IMAGE_NOTE_FORM

Hàm này chuyển đổi dữ liệu group thành `passageText` để lưu vào DB.

**Trước khi sửa:**
```javascript
// Note/Summary: lưu text
if (ct === 'NOTE_COMPLETION') return group.noteText || '';
if (ct === 'SUMMARY_COMPLETION') return group.summaryText || '';
// Matching heading: lưu heading bank  // ← Thiếu IMAGE_NOTE_FORM
if (ct === 'MATCHING_HEADING') {
```

→ Khi lưu đề thi có `IMAGE_NOTE_FORM`, các trường `noteText`, `imagePosition`, `imageWidth` không được serialize vào `passageText` → Mất dữ liệu!

### 2. Hàm `deserializeGroupContent()` - Thiếu xử lý IMAGE_NOTE_FORM

Hàm này parse `passageText` từ DB thành dữ liệu group khi load đề thi.

**Trước khi sửa:**
```javascript
if (contentType === 'NOTE_COMPLETION') return { noteText: passageText };
if (contentType === 'SUMMARY_COMPLETION') return { summaryText: passageText };
if (contentType === 'MATCHING_HEADING') {  // ← Thiếu IMAGE_NOTE_FORM
```

→ Khi load đề thi, không parse được dữ liệu `IMAGE_NOTE_FORM` → Hiển thị rỗng!

### 3. Hàm `mapQuestionTypeCode()` - Thiếu map IMAGE_NOTE_FORM

**Trước khi sửa:**
```javascript
'NOTE_COMPLETION': 'NOTE_COMPLETION',
'TABLE_COMPLETION': 'NOTE_COMPLETION',
// Charts/Maps  // ← Thiếu IMAGE_NOTE_FORM
```

→ Câu hỏi trong `IMAGE_NOTE_FORM` không được map đúng type code.

## ✅ Giải pháp

### 1. Thêm serialize cho IMAGE_NOTE_FORM

```javascript
// Note/Summary: lưu text
if (ct === 'NOTE_COMPLETION') return group.noteText || '';
if (ct === 'SUMMARY_COMPLETION') return group.summaryText || '';
// Image + Note Form: lưu noteText, imagePosition, imageWidth
if (ct === 'IMAGE_NOTE_FORM') {
  return JSON.stringify({
    noteText: group.noteText || '',
    imagePosition: group.imagePosition || 'top',
    imageWidth: group.imageWidth || 100,
  });
}
// Matching heading: lưu heading bank
```

### 2. Thêm deserialize cho IMAGE_NOTE_FORM

```javascript
if (contentType === 'NOTE_COMPLETION') return { noteText: passageText };
if (contentType === 'SUMMARY_COMPLETION') return { summaryText: passageText };
if (contentType === 'IMAGE_NOTE_FORM') {
  const parsed = JSON.parse(passageText);
  return {
    noteText: parsed.noteText || '',
    imagePosition: parsed.imagePosition || 'top',
    imageWidth: parsed.imageWidth || 100,
  };
}
if (contentType === 'MATCHING_HEADING') {
```

### 3. Thêm map type code cho IMAGE_NOTE_FORM

```javascript
// Completion types
'SENTENCE_COMPLETION': 'SENTENCE_COMPLETION',
'SUMMARY_COMPLETION': 'SUMMARY_COMPLETION',
'NOTE_COMPLETION': 'NOTE_COMPLETION',
'TABLE_COMPLETION': 'NOTE_COMPLETION',
'IMAGE_NOTE_FORM': 'NOTE_COMPLETION',
// Charts/Maps
```

## 📝 Cấu trúc dữ liệu lưu vào DB

### Trước (Sai - mất dữ liệu):
```json
{
  "contentType": "IMAGE_NOTE_FORM",
  "title": "House Plan",
  "imageUrl": "https://example.com/house.jpg",
  "passageText": "",  // ← RỖNG! Mất noteText, imagePosition, imageWidth
  "questions": [...]
}
```

### Sau (Đúng - đầy đủ):
```json
{
  "contentType": "IMAGE_NOTE_FORM",
  "title": "House Plan",
  "imageUrl": "https://example.com/house.jpg",
  "passageText": "{\"noteText\":\"Ground Floor:\\n- Living room: (1) _____ m²\",\"imagePosition\":\"top\",\"imageWidth\":100}",
  "questions": [...]
}
```

## 🧪 Test

### Trước khi sửa:
1. Tạo câu hỏi IMAGE_NOTE_FORM
2. Nhập đoạn văn: "Ground Floor: (1) _____"
3. Chọn vị trí ảnh: "Ảnh dưới"
4. Điều chỉnh độ rộng: 80%
5. Lưu đề thi
6. Load lại trang
7. ❌ Đoạn văn mất
8. ❌ Vị trí ảnh reset về "Ảnh trên"
9. ❌ Độ rộng reset về 100%

### Sau khi sửa:
1. Tạo câu hỏi IMAGE_NOTE_FORM
2. Nhập đoạn văn: "Ground Floor: (1) _____"
3. Chọn vị trí ảnh: "Ảnh dưới"
4. Điều chỉnh độ rộng: 80%
5. Lưu đề thi
6. Load lại trang
7. ✅ Đoạn văn hiển thị đúng
8. ✅ Vị trí ảnh: "Ảnh dưới"
9. ✅ Độ rộng: 80%

## 📂 File đã sửa

- `/frontend/src/services/testBuilderApi.js`
  - Thêm serialize `IMAGE_NOTE_FORM` trong `serializeGroupContent()`
  - Thêm deserialize `IMAGE_NOTE_FORM` trong `deserializeGroupContent()`
  - Thêm map `IMAGE_NOTE_FORM` trong `mapQuestionTypeCode()`

## ✅ Kết quả

Module **IMAGE_NOTE_FORM** giờ đã hoạt động hoàn chỉnh:
- ✅ Lưu đầy đủ: noteText, imagePosition, imageWidth
- ✅ Load đúng khi mở lại đề thi
- ✅ Không mất dữ liệu khi refresh trang
- ✅ Câu hỏi được map đúng type code (NOTE_COMPLETION)

## 🎯 Cách test lại

```bash
# 1. Restart frontend
cd frontend
npm run dev

# 2. Vào Test Builder
# 3. Tạo đề thi mới
# 4. Kéo "Ảnh + Note Form" vào Part
# 5. Nhập:
#    - Đoạn văn: "Ground Floor: (1) _____ m²"
#    - URL ảnh: https://example.com/house.jpg
#    - Vị trí: Ảnh dưới
#    - Độ rộng: 80%
# 6. Lưu đề thi
# 7. Refresh trang (F5)
# 8. Load lại đề thi vừa lưu
# 9. Kiểm tra: Đoạn văn, vị trí ảnh, độ rộng có giữ nguyên không

# Expected: ✅ Tất cả dữ liệu hiển thị đúng
```
