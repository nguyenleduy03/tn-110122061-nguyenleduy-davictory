# ✅ CHECKLIST: Render Short Answer đúng trong trang thi

## 📦 Files cần biết

```
frontend/src/
├── services/
│   └── ieltsApi.js                    # Transform data từ backend (dòng 389-415)
├── components/
│   └── question/
│       ├── QuestionRenderer.jsx       # Router component (dòng 180-192)
│       └── ShortAnswerGroupQuestion.jsx  # Component chính render Short Answer
└── pages/
    ├── IeltsListeningTest.jsx         # Trang thi Listening
    └── IeltsReadingTest.jsx            # Trang thi Reading
```

## 🔍 Kiểm tra dữ liệu từ API

```javascript
// Backend trả về:
{
  contentType: 'SHORT_ANSWER' hoặc 'SHORT_ANSWER_GROUP',
  questions: [
    {
      id: 123,
      questionNumber: 1,
      questionText: 'What is...?',
      answers: [
        { answerText: 'answer1' },
        { answerText: 'answer2' }  // Alternative answer
      ]
    }
  ]
}

// ieltsApi.js transform thành:
{
  type: 'short-answer-group',
  subQuestions: [
    {
      id: 'q123',
      number: 1,
      text: 'What is...?',
      correctAnswer: 'answer1|answer2'  // Join by |
    }
  ]
}
```

## ✅ Checklist render đúng

### 1. Component được gọi
- [ ] `QuestionRenderer` nhận `q.type = 'short-answer-group'`
- [ ] `ShortAnswerGroupQuestion` được render
- [ ] Props đầy đủ: `q`, `answers`, `handleAnswerChange`, `activeQuestion`, `bookmarks`

### 2. Hiển thị câu hỏi
- [ ] Title group hiển thị (nếu có)
- [ ] Danh sách câu hỏi được render theo thứ tự `questionNumber`
- [ ] Mỗi câu có: bullet (•) + số câu + nội dung + input

### 3. Input hoạt động
- [ ] Placeholder là số câu hỏi
- [ ] Value bind với `answers[questionId]`
- [ ] onChange gọi `handleAnswerChange(questionId, value)`
- [ ] Focus vào input → set active question

### 4. Inline blank token
- [ ] Nếu text có `[blank]` → input được đặt inline
- [ ] Text trước blank + input + text sau blank

### 5. Active & Bookmark
- [ ] Click vào câu → set active question
- [ ] Active question có class `active-question-input`
- [ ] Bookmark toggle hiển thị khi active
- [ ] Bookmark state được lưu đúng

### 6. Review mode
- [ ] Input readonly khi `isReview={true}`
- [ ] Đáp án sai → hiển thị đáp án đúng
- [ ] CSS class: `review-correct` hoặc `review-wrong`
- [ ] Validation theo `validationOptions`

## 🐛 Debug checklist

### Không hiển thị câu hỏi?
```javascript
// Check 1: Type có đúng không?
console.log('Question type:', q.type);
// Expected: 'short-answer-group'

// Check 2: SubQuestions có data không?
console.log('SubQuestions:', q.subQuestions);
// Expected: Array with objects

// Check 3: Component có được gọi không?
console.log('ShortAnswerGroupQuestion rendered');
```

### Input không hoạt động?
```javascript
// Check 1: handleAnswerChange có được truyền không?
console.log('handleAnswerChange:', typeof handleAnswerChange);
// Expected: 'function'

// Check 2: questionId có đúng không?
console.log('Question ID:', subQuestion.id);
// Expected: 'q123' (string)

// Check 3: Answer state có update không?
console.log('Answers:', answers);
// Expected: { 'q123': 'user input' }
```

### Validation sai?
```javascript
// Check 1: Validation options
console.log('Validation:', q.validationOptions);
// Expected: { ignoreCase: true, ... }

// Check 2: Normalize function
const normalized = normalizeAnswer('Climate Change', q.validationOptions);
console.log('Normalized:', normalized);
// Expected: 'climate change' (if ignoreCase=true)

// Check 3: Correct answers
console.log('Correct answers:', subQuestion.correctAnswer.split('|'));
// Expected: ['answer1', 'answer2']
```

## 📊 Test cases

### Case 1: Basic short answer
```javascript
{
  type: 'short-answer-group',
  subQuestions: [
    { id: 'q1', number: 1, text: 'What is X?', correctAnswer: 'answer' }
  ]
}
// ✅ Render: • 1 What is X? [input]
```

### Case 2: Multiple accepted answers
```javascript
{
  subQuestions: [
    { id: 'q1', number: 1, text: 'Color?', correctAnswer: 'red|crimson|scarlet' }
  ]
}
// ✅ Accept: 'red' OR 'crimson' OR 'scarlet'
```

### Case 3: Inline blank
```javascript
{
  subQuestions: [
    { id: 'q1', number: 1, text: 'The capital is [blank]', correctAnswer: 'Paris' }
  ]
}
// ✅ Render: • 1 The capital is [input]
```

### Case 4: Ignore case
```javascript
{
  validationOptions: { ignoreCase: true },
  subQuestions: [
    { id: 'q1', number: 1, text: 'Country?', correctAnswer: 'Australia' }
  ]
}
// ✅ Accept: 'australia', 'AUSTRALIA', 'AuStRaLiA'
```

## 🎯 Kết luận

Short Answer render đúng khi:
1. ✅ Data transform đúng format (ieltsApi.js)
2. ✅ QuestionRenderer nhận diện đúng type
3. ✅ ShortAnswerGroupQuestion render đầy đủ UI
4. ✅ Input bind với answer state
5. ✅ Validation logic hoạt động đúng
6. ✅ Review mode hiển thị đúng/sai

## 📚 Tài liệu tham khảo

- `SHORT_ANSWER_RENDER_GUIDE.md` - Hướng dẫn chi tiết
- `SHORT_ANSWER_EXAMPLE.js` - Code examples
- `frontend/src/components/question/ShortAnswerGroupQuestion.jsx` - Source code
