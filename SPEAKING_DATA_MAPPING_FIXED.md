# Speaking Test Data Mapping - Fixed

## Vấn đề đã sửa

### 1. **Thiếu xử lý SPEAKING_DISCUSSION (Part 3)**
- **Trước:** Chỉ xử lý `SPEAKING_INTERVIEW` và `SPEAKING_CUECARD`
- **Sau:** Thêm `SPEAKING_DISCUSSION` vào logic parse
- **File:** `ieltsApi.js` line 156

### 2. **BulletPoints bị lồng HTML sai**
- **Vấn đề:** Backend trả về `["<ul><li>text</li></ul>", "", ""]`
- **Giải pháp:** Parse HTML, extract `<li>` content, filter empty strings
- **Kết quả:** Array sạch chỉ chứa text: `["text1", "text2", ...]`

### 3. **Questions rỗng không bị filter**
- **Vấn đề:** Part 1 có question với `questionText: ""`
- **Giải pháp:** Filter out questions với empty text, giảm counter
- **File:** `ieltsApi.js` - return `.filter(Boolean)`

### 4. **partInstruction không được parse từ passageText**
- **Vấn đề:** `partInstruction` nằm trong JSON string `passageText`
- **Giải pháp:** Parse JSON từ `passageText` trong `IeltsSpeakingTest.jsx`
- **File:** `IeltsSpeakingTest.jsx` line 290

### 5. **isCueCard logic sai**
- **Trước:** `isPartTwo && currentQ?.bulletPoints`
- **Sau:** `currentQ?.bulletPoints?.length > 0`
- **Lý do:** Cue card được xác định bởi có bulletPoints, không phải part number

## Data Mapping từ Backend → Frontend

### Part 1 (SPEAKING_INTERVIEW)
```json
{
  "contentType": "SPEAKING_INTERVIEW",
  "passageText": "{\"interviewType\":\"PART1\",\"partInstruction\":\"...\"}"
}
```
→ Frontend:
```js
{
  type: 'speaking',
  questionTypeCode: 'SPEAKING_INTERVIEW',
  partInstruction: "...",  // Hiển thị ở part-intro
  interviewType: 'PART1',
  text: "Where are you from?"  // Hiển thị từng câu hỏi
}
```

### Part 2 (SPEAKING_CUECARD)
```json
{
  "contentType": "SPEAKING_CUECARD",
  "passageText": "{\"partInstruction\":\"...\",\"topic\":\"...\",\"shouldSayLabel\":\"You should say:\",\"bulletPoints\":[\"<ul><li>text</li></ul>\"],\"closingSentence\":\"\",\"prepSeconds\":60}"
}
```
→ Frontend:
```js
{
  type: 'speaking',
  questionTypeCode: 'SPEAKING_CUECARD',
  partInstruction: "...",  // Hiển thị ở part-intro
  topic: "Describe...",    // Tiêu đề cue card
  shouldSayLabel: "You should say:",  // Label
  bulletPoints: ["text1", "text2"],   // Cleaned array
  closingSentence: "...",
  prepSeconds: 60
}
```

### Part 3 (SPEAKING_DISCUSSION)
```json
{
  "contentType": "SPEAKING_DISCUSSION",
  "passageText": "{\"partInstruction\":\"...\"}"
}
```
→ Frontend:
```js
{
  type: 'speaking',
  questionTypeCode: 'SPEAKING_DISCUSSION',
  partInstruction: "...",  // Hiển thị ở part-intro
  text: "Do you think...?"  // Hiển thị từng câu hỏi
}
```

## UI Components Updated

### 1. **Part Intro Screen** (`stage: 'part-intro'`)
- Hiển thị `partInstruction` từ `passageText` JSON
- Hiển thị part number, title, số câu hỏi, thời gian
- Nút "Begin Part X" để bắt đầu

### 2. **CueCard Component**
- `topic` → Tiêu đề chính
- `shouldSayLabel` → Label "You should say:"
- `bulletPoints[]` → Danh sách gạch đầu dòng (đã clean)
- `closingSentence` → Câu kết

### 3. **Question Display**
- Part 1 & 3: Hiển thị `text` (questionText)
- Part 2: Hiển thị CueCard component
- Filter questions với empty text

## Files Changed

1. **frontend/src/services/ieltsApi.js**
   - Thêm `SPEAKING_DISCUSSION` support
   - Clean bulletPoints HTML
   - Filter empty questions
   - Parse partInstruction từ passageText

2. **frontend/src/pages/IeltsSpeakingTest.jsx**
   - Parse partInstruction từ passageText JSON
   - Fix isCueCard logic
   - Update CueCard component để dùng shouldSayLabel
   - Sử dụng prepSeconds từ question data

3. **frontend/src/styles/ieltsTest.css**
   - Thêm `.spk-cuecard-label` style

4. **frontend/src/components/testBuilder/blocks/SpeakingCueCardBlock.jsx**
   - Thêm trường "Hướng dẫn Part (Part Instruction)"

## Testing Checklist

- [ ] Part 1: Hiển thị instruction ở intro, hiển thị từng câu hỏi
- [ ] Part 2: Hiển thị instruction ở intro, hiển thị cue card với bullets đúng
- [ ] Part 3: Hiển thị instruction ở intro, hiển thị từng câu hỏi discussion
- [ ] Questions rỗng không hiển thị
- [ ] Prep time dùng từ data (60s default)
- [ ] BulletPoints không có HTML tags
- [ ] Part instruction hiển thị đầy đủ HTML formatting

## Notes

- Tất cả text đều được format với `formatTextWithWhitespace`
- Empty questions được filter ra khỏi danh sách
- Counter được giảm khi skip empty questions
- Fallback constants vẫn giữ cho backward compatibility
