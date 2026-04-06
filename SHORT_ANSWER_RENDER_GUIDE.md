# Hướng dẫn Render Short Answer trong Trang Thi

## 📋 Tổng quan

Đề dạng **Short Answer** được render như một danh sách câu hỏi với ô input để học viên điền đáp án ngắn.

---

## 🔄 Luồng dữ liệu

### 1. Backend → Frontend Transform

**File:** `frontend/src/services/ieltsApi.js` (dòng 389-415)

```javascript
// Backend trả về group với contentType = 'SHORT_ANSWER' hoặc 'SHORT_ANSWER_GROUP'
// Transform thành format cho exam page:

if (feType === 'short-answer-group') {
  const orderedQuestions = [...questions].sort((a, b) => 
    Number(a?.questionNumber || 0) - Number(b?.questionNumber || 0)
  );

  const subQuestions = orderedQuestions.map((question) => {
    const acceptedAnswers = collectAcceptedAnswers(question?.answers || []);

    return {
      id: `q${question.id}`,                    // ID duy nhất cho câu hỏi
      number: resolveDbQuestionNumber(question), // Số thứ tự câu (1, 2, 3...)
      text: formatTextWithWhitespace(question?.questionText || ''), // Nội dung câu hỏi
      correctAnswer: acceptedAnswers.join('|'), // Đáp án đúng (có thể nhiều, cách nhau bởi |)
    };
  });

  return [{
    id: `group-${group.questionGroupId || group.id}`,
    type: 'short-answer-group',              // Type để QuestionRenderer nhận diện
    questionTypeCode: 'SHORT_ANSWER',
    title: formatTextWithWhitespace(group.title || ''),
    groupInstruction: formatTextWithWhitespace(group.instructions || ''),
    subQuestions,                            // Mảng các câu hỏi con
    validationOptions: group.validationOptions || null, // Tùy chọn validate (ignoreCase, etc.)
  }];
}
```

### 2. QuestionRenderer nhận diện type

**File:** `frontend/src/components/question/QuestionRenderer.jsx` (dòng 180-192)

```javascript
// Normalize type name
const normalizeQuestionType = (rawType) => {
  // ...
  case 'short_answer_group':
  case 'short_answer':
    return 'short-answer-group';
  // ...
};

// Render component tương ứng
if (normalizedType === 'short-answer-group') {
  return (
    <ShortAnswerGroupQuestion
      q={q}
      activeQuestion={activeQuestion}
      setActiveQuestion={setActiveQuestion}
      answers={answers || {}}
      handleAnswerChange={handleAnswerChange}
      inputRefs={inputRefs}
      bookmarks={bookmarks}
      toggleBookmark={toggleBookmark}
      isReview={isReview}
    />
  );
}
```

---

## 🎨 Component Render

**File:** `frontend/src/components/question/ShortAnswerGroupQuestion.jsx`

### Cấu trúc dữ liệu đầu vào

```javascript
const q = {
  id: 'group-123',
  type: 'short-answer-group',
  title: '<p>Answer the questions below</p>',  // HTML title (optional)
  groupInstruction: '<p>Write NO MORE THAN TWO WORDS</p>', // Hướng dẫn
  validationOptions: {
    ignoreCase: true,        // Không phân biệt hoa thường
    ignoreSpaces: false,     // Bỏ qua khoảng trắng
    ignorePunctuation: false, // Bỏ qua dấu câu
    ignoreChars: ''          // Ký tự bỏ qua (vd: '-')
  },
  subQuestions: [
    {
      id: 'q456',
      number: 1,
      text: 'What is the main topic?',
      correctAnswer: 'climate change|global warming' // Nhiều đáp án đúng cách nhau bởi |
    },
    {
      id: 'q457',
      number: 2,
      text: 'The study was conducted in [blank]', // Có thể có [blank] token
      correctAnswer: 'Australia'
    }
  ]
};
```

### Render Output

```jsx
<div className="short-answer-group-container">
  {/* Title (nếu có) */}
  <div className="short-answer-title" dangerouslySetInnerHTML={{ __html: titleHtml }} />

  {/* Danh sách câu hỏi */}
  <ul className="short-answer-list">
    {subQuestions.map((subQuestion) => (
      <li className="short-answer-item">
        {/* Bookmark toggle (chỉ hiện khi đang làm bài) */}
        <BookmarkToggle />

        {/* Prefix: bullet + số câu */}
        <span className="short-answer-prefix">
          <span className="short-answer-bullet">•</span>
          <span className="short-answer-number">1</span>
        </span>

        {/* Content: text + input */}
        <span className="short-answer-content">
          <span className="short-answer-text">What is the main topic?</span>
          <input 
            type="text"
            className="short-answer-input"
            placeholder="1"
            value={currentAnswer}
            onChange={handleAnswerChange}
          />
        </span>
      </li>
    ))}
  </ul>
</div>
```

---

## 🔑 Các tính năng chính

### 1. Inline Blank Token

Nếu câu hỏi có `[blank]` token, input sẽ được đặt inline:

```javascript
const splitByFirstBlankToken = (rawText) => {
  const normalized = normalizeBlankTokens(rawText);
  const match = normalized.match(/\[blank\]/i);
  if (!match) return null;

  return {
    before: normalized.slice(0, match.index),
    after: normalized.slice(match.index + match[0].length),
  };
};

// Render:
// "The study was conducted in [blank]" 
// → "The study was conducted in <input /> "
```

### 2. Answer Validation (Review Mode)

```javascript
const normalizeAnswer = (value) => {
  let normalized = String(value || '').trim();
  if (validationOptions.ignoreCase !== false) 
    normalized = normalized.toLowerCase();
  if (validationOptions.ignoreSpaces) 
    normalized = normalized.replace(/\s+/g, '');
  if (validationOptions.ignorePunctuation) 
    normalized = normalized.replace(/[.,!?;:'"()]/g, '');
  return normalized;
};

const checkAnswer = (userAnswer, correctAnswer) => {
  const normalizedUser = normalizeAnswer(userAnswer);
  const acceptedAnswers = String(correctAnswer || '')
    .split('|')
    .map((item) => normalizeAnswer(item))
    .filter(Boolean);

  return acceptedAnswers.includes(normalizedUser);
};
```

### 3. Active Question & Bookmark

```javascript
// Active question: highlight câu đang làm
const isActive = activeQuestion === questionNumber;

// Bookmark: đánh dấu câu để xem lại
const isBookmarked = Boolean(bookmarks?.[questionNumber]);

// Click vào câu hỏi → set active
onClick={() => setActiveQuestion?.(questionNumber)}
```

### 4. Review Mode

```javascript
// Hiển thị đáp án đúng nếu sai
const displayAnswer = (isReview && !isCorrect)
  ? getReviewAnswer(subQuestion?.correctAnswer)  // Lấy đáp án đầu tiên từ list
  : currentAnswer;

// CSS class để highlight đúng/sai
className={`short-answer-input ${
  isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''
}`}
```

---

## 📊 Đếm câu hỏi vào CSDL

### Frontend (TestBuilder)

**File:** `frontend/src/pages/TestBuilder.jsx`

```javascript
// Hàm đếm số câu hỏi trong group
const getGroupQuestionCount = (group) => {
  if (group?.contentType === 'AUDIO_TRANSCRIPT') return 0;
  return (group?.questions ?? []).reduce(
    (sum, q) => sum + (q.questionCount || 1), 
    0
  );
};

// Tính lại fromQuestion và toQuestion
const recalculateQuestionNumbers = (groups) => {
  let runningTotal = 0;
  return groups.map((g) => {
    const questionCount = getGroupQuestionCount(g);
    const fromQuestion = questionCount > 0 ? runningTotal + 1 : null;
    const toQuestion = questionCount > 0 ? runningTotal + questionCount : null;
    runningTotal += questionCount;
    return { ...g, fromQuestion, toQuestion };
  });
};

// Tự động gọi khi thêm/xóa câu hỏi
setParts((prev) => prev.map((p) => {
  // ...
  return { ...p, questionGroups: recalculateQuestionNumbers(updatedGroups) };
}));
```

### Backend (Java)

**File:** `backend/src/main/java/com/victory/DAVictory/service/TestBuilderService.java`

```java
// Lưu câu hỏi vào DB
private void saveQuestionsForGroup(QuestionGroup qg, List<TestSaveRequest.QuestionSave> questions) {
    if (questions == null) return;
    System.out.println("🔍 Saving " + questions.size() + " questions for group: " + qg.getTitle());
    
    for (int i = 0; i < questions.size(); i++) {
        TestSaveRequest.QuestionSave qs = questions.get(i);
        Question q = createQuestionFromSave(qg, qs);
        saveOptions(q, qs.getOptions());
        saveAnswers(q, qs.getAnswers());  // Lưu đáp án
    }
}

// Lưu đáp án
private void saveAnswers(Question question, List<TestSaveRequest.AnswerSave> answers) {
    if (answers == null) return;
    for (TestSaveRequest.AnswerSave as : answers) {
        Answer ans = new Answer();
        ans.setQuestion(question);
        ans.setAnswerText(as.getAnswerText() != null ? as.getAnswerText() : "");
        ans.setAlternativeAnswers(as.getAlternativeAnswers());
        ans.setIsCaseSensitive(as.getIsCaseSensitive() != null ? as.getIsCaseSensitive() : false);
        ans.setBlankIndex(as.getBlankIndex() != null ? as.getBlankIndex() : 1);
        answerRepository.save(ans);
    }
}
```

---

## ✅ Checklist cho FE Developer

### Khi tạo đề (Test Builder)
- [ ] Mỗi câu hỏi Short Answer có `questionNumber` duy nhất
- [ ] `fromQuestion` và `toQuestion` được tính tự động khi thêm/xóa câu
- [ ] Đáp án được lưu vào `answers` array (có thể nhiều đáp án cách nhau bởi `|`)
- [ ] `validationOptions` được set đúng (ignoreCase, ignoreSpaces, etc.)

### Khi render trang thi
- [ ] Component `ShortAnswerGroupQuestion` được gọi với đúng props
- [ ] `subQuestions` được sort theo `questionNumber`
- [ ] Input có `placeholder` là số câu hỏi
- [ ] Active question được highlight
- [ ] Bookmark toggle hoạt động
- [ ] Review mode hiển thị đúng/sai và đáp án đúng

### Khi chấm bài
- [ ] Normalize đáp án theo `validationOptions`
- [ ] So sánh với tất cả đáp án đúng (split by `|`)
- [ ] CSS class `review-correct` / `review-wrong` được apply

---

## 🐛 Debug Tips

### 1. Kiểm tra dữ liệu từ API

```javascript
console.log('Short Answer Group:', q);
console.log('SubQuestions:', q.subQuestions);
console.log('Validation Options:', q.validationOptions);
```

### 2. Kiểm tra answer state

```javascript
console.log('Current answers:', answers);
console.log('Answer for q1:', answers['q456']);
```

### 3. Kiểm tra validation

```javascript
const normalized = normalizeAnswer('Climate Change');
console.log('Normalized:', normalized); // → 'climate change'

const isCorrect = checkAnswer('Climate Change', 'climate change|global warming');
console.log('Is correct:', isCorrect); // → true
```

---

## 📝 Ví dụ hoàn chỉnh

### Dữ liệu từ API

```json
{
  "id": "group-123",
  "type": "short-answer-group",
  "title": "<p>Answer the questions below</p>",
  "groupInstruction": "<p>Write NO MORE THAN TWO WORDS</p>",
  "validationOptions": {
    "ignoreCase": true,
    "ignoreSpaces": false,
    "ignorePunctuation": false
  },
  "subQuestions": [
    {
      "id": "q456",
      "number": 1,
      "text": "What is the main topic?",
      "correctAnswer": "climate change|global warming"
    },
    {
      "id": "q457",
      "number": 2,
      "text": "The study was conducted in [blank]",
      "correctAnswer": "Australia|australia"
    },
    {
      "id": "q458",
      "number": 3,
      "text": "How many years did the research take?",
      "correctAnswer": "5|five"
    }
  ]
}
```

### Render trong exam page

```jsx
<ShortAnswerGroupQuestion
  q={questionData}
  activeQuestion={1}
  setActiveQuestion={(num) => setActiveQuestion(num)}
  answers={{
    'q456': 'Climate Change',
    'q457': 'australia',
    'q458': '5'
  }}
  handleAnswerChange={(id, value) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  }}
  inputRefs={inputRefsRef}
  bookmarks={{ 2: true }}
  toggleBookmark={(num) => {
    setBookmarks(prev => ({ ...prev, [num]: !prev[num] }));
  }}
  isReview={false}
/>
```

---

## 🎯 Kết luận

Short Answer được render như một **group question** với nhiều **sub-questions**. Mỗi sub-question có:
- Số thứ tự câu hỏi
- Nội dung câu hỏi (có thể có `[blank]` token)
- Input để điền đáp án
- Validation logic linh hoạt
- Support bookmark và review mode

Logic đếm câu hỏi được xử lý tự động ở cả frontend (TestBuilder) và backend (Java service).
