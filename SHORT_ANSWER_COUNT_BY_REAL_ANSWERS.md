# ✅ Thay đổi: Short Answer đếm theo đáp án thật

## 📋 Tóm tắt thay đổi

**Trước:** Short Answer đếm theo số câu hỏi (1 câu có nhiều đáp án thay thế = 1 câu)

**Sau:** Short Answer đếm theo số đáp án thật (mỗi đáp án không phải sample = 1 câu riêng)

---

## 🔄 Logic mới

### Ví dụ

```javascript
// TestBuilder - Tạo đề
const question = {
  questionNumber: 1,
  questionText: 'What are the main topics?',
  answers: [
    { answerText: 'climate change', isSample: false },  // Câu 1
    { answerText: 'global warming', isSample: false },  // Câu 2
    { answerText: 'example answer', isSample: true }    // Sample - KHÔNG đếm
  ]
};

// Tổng số câu = 2 (không tính sample)
// fromQuestion = 1, toQuestion = 2
```

### Công thức đếm

```javascript
// Mỗi đáp án thật (isSample = false) = 1 câu
Tổng số câu = Σ(số đáp án thật của mỗi question)
            = Σ(answers.filter(ans => !ans.isSample).length)
```

---

## 📝 Files đã sửa

### 1. `frontend/src/pages/TestBuilder.jsx`

**Hàm đếm câu hỏi:**

```javascript
const getGroupQuestionCount = (group) => {
  if (group?.contentType === 'AUDIO_TRANSCRIPT') return 0;
  
  // Short Answer: đếm theo số đáp án thật (không phải sample)
  if (group?.contentType === 'SHORT_ANSWER_GROUP') {
    return (group?.questions ?? []).reduce((sum, q) => {
      const answers = Array.isArray(q?.answers) ? q.answers : [];
      const realAnswers = answers.filter(ans => !ans.isSample);
      return sum + Math.max(1, realAnswers.length);
    }, 0);
  }
  
  return (group?.questions ?? []).reduce((sum, q) => sum + (q.questionCount || 1), 0);
};
```

### 2. `frontend/src/services/testBuilderApi.js`

**Tính questionCount khi lưu đề:**

```javascript
// Short Answer: questionCount = số đáp án thật (không phải sample)
let questionCount;
if (group.contentType === 'SHORT_ANSWER_GROUP') {
  const answers = Array.isArray(q?.answers) ? q.answers : [];
  const realAnswers = answers.filter(ans => !ans.isSample);
  questionCount = Math.max(1, realAnswers.length);
} else {
  const rawQuestionCount = Number(q?.questionCount);
  questionCount = Number.isFinite(rawQuestionCount) && rawQuestionCount > 0
    ? Math.floor(rawQuestionCount)
    : 1;
}
```

### 3. `frontend/src/services/ieltsApi.js`

**Transform data cho exam page:**

```javascript
// Mỗi đáp án thật = 1 câu hỏi riêng
if (feType === 'short-answer-group') {
  const orderedQuestions = [...questions].sort((a, b) => 
    Number(a?.questionNumber || 0) - Number(b?.questionNumber || 0)
  );

  const subQuestions = [];
  orderedQuestions.forEach((question) => {
    const answers = question?.answers || [];
    const realAnswers = answers.filter(ans => !ans.isSample);
    
    if (realAnswers.length === 0) {
      // Không có đáp án thật → tạo 1 câu trống
      subQuestions.push({
        id: `q${question.id}`,
        number: resolveDbQuestionNumber(question),
        text: formatTextWithWhitespace(question?.questionText || ''),
        correctAnswer: '',
      });
    } else {
      // Mỗi đáp án thật = 1 câu hỏi riêng
      const startNum = resolveDbQuestionNumber(question);
      realAnswers.forEach((ans, idx) => {
        subQuestions.push({
          id: `q${question.id}_${idx}`,
          number: startNum + idx,
          text: formatTextWithWhitespace(question?.questionText || ''),
          correctAnswer: ans.answerText || '',
        });
      });
    }
  });

  return [{
    type: 'short-answer-group',
    subQuestions,
    // ...
  }];
}
```

---

## 🎯 Ví dụ cụ thể

### Case 1: 1 question với 3 đáp án thật

**TestBuilder:**
```javascript
{
  questionNumber: 1,
  questionText: 'List three main topics',
  answers: [
    { answerText: 'climate', isSample: false },
    { answerText: 'economy', isSample: false },
    { answerText: 'society', isSample: false }
  ]
}

// Đếm: 3 câu (1, 2, 3)
// fromQuestion = 1, toQuestion = 3
```

**Exam page:**
```
List three main topics

• 1  [_____________]  (đáp án: climate)
• 2  [_____________]  (đáp án: economy)
• 3  [_____________]  (đáp án: society)

Questions 1-3
```

### Case 2: 2 questions, mỗi question 2 đáp án

**TestBuilder:**
```javascript
[
  {
    questionNumber: 1,
    questionText: 'Name two causes',
    answers: [
      { answerText: 'pollution', isSample: false },
      { answerText: 'deforestation', isSample: false }
    ]
  },
  {
    questionNumber: 3,
    questionText: 'Name two effects',
    answers: [
      { answerText: 'warming', isSample: false },
      { answerText: 'flooding', isSample: false }
    ]
  }
]

// Đếm: 2 + 2 = 4 câu (1, 2, 3, 4)
// fromQuestion = 1, toQuestion = 4
```

**Exam page:**
```
Name two causes

• 1  [_____________]  (đáp án: pollution)
• 2  [_____________]  (đáp án: deforestation)

Name two effects

• 3  [_____________]  (đáp án: warming)
• 4  [_____________]  (đáp án: flooding)

Questions 1-4
```

### Case 3: Có đáp án sample (không đếm)

**TestBuilder:**
```javascript
{
  questionNumber: 1,
  questionText: 'List main topics',
  answers: [
    { answerText: 'example', isSample: true },   // KHÔNG đếm
    { answerText: 'climate', isSample: false },  // Câu 1
    { answerText: 'economy', isSample: false }   // Câu 2
  ]
}

// Đếm: 2 câu (không tính sample)
// fromQuestion = 1, toQuestion = 2
```

**Exam page:**
```
List main topics

example (sample - đã điền sẵn)

• 1  [_____________]  (đáp án: climate)
• 2  [_____________]  (đáp án: economy)

Questions 1-2
```

---

## 🔑 Điểm quan trọng

### ✅ Đúng: Đếm theo đáp án thật
- Mỗi đáp án có `isSample = false` = 1 câu riêng
- Đáp án sample (`isSample = true`) KHÔNG được đếm
- `questionCount` = số đáp án thật

### ❌ Không còn: Đáp án thay thế
- **KHÔNG** còn khái niệm "nhiều đáp án đúng cho 1 câu"
- Mỗi đáp án = 1 câu hỏi độc lập
- Học viên phải trả lời từng câu riêng biệt

### 📌 Lý do thay đổi
1. **Rõ ràng hơn**: Mỗi đáp án = 1 câu = 1 điểm
2. **Dễ chấm**: Không cần so sánh với nhiều đáp án thay thế
3. **Phù hợp IELTS**: Thường yêu cầu "Write THREE answers"

---

## 🧪 Test cases

### Test 1: 1 question, 3 đáp án thật
```javascript
const group = {
  contentType: 'SHORT_ANSWER_GROUP',
  questions: [
    {
      answers: [
        { answerText: 'a', isSample: false },
        { answerText: 'b', isSample: false },
        { answerText: 'c', isSample: false }
      ]
    }
  ]
};

getGroupQuestionCount(group);  // Expected: 3
```

### Test 2: 2 questions, mỗi question 2 đáp án
```javascript
const group = {
  contentType: 'SHORT_ANSWER_GROUP',
  questions: [
    {
      answers: [
        { answerText: 'a1', isSample: false },
        { answerText: 'a2', isSample: false }
      ]
    },
    {
      answers: [
        { answerText: 'b1', isSample: false },
        { answerText: 'b2', isSample: false }
      ]
    }
  ]
};

getGroupQuestionCount(group);  // Expected: 4
```

### Test 3: Có sample answer
```javascript
const group = {
  contentType: 'SHORT_ANSWER_GROUP',
  questions: [
    {
      answers: [
        { answerText: 'sample', isSample: true },   // KHÔNG đếm
        { answerText: 'real1', isSample: false },
        { answerText: 'real2', isSample: false }
      ]
    }
  ]
};

getGroupQuestionCount(group);  // Expected: 2 (không tính sample)
```

### Test 4: Không có đáp án thật
```javascript
const group = {
  contentType: 'SHORT_ANSWER_GROUP',
  questions: [
    {
      answers: [
        { answerText: 'sample', isSample: true }
      ]
    }
  ]
};

getGroupQuestionCount(group);  // Expected: 1 (tối thiểu 1 câu)
```

---

## 📊 So sánh trước/sau

| Khía cạnh | Trước | Sau |
|-----------|-------|-----|
| **Đơn vị đếm** | Câu hỏi (Question) | Đáp án thật (Real Answer) |
| **1 question, 3 answers** | 1 câu | 3 câu |
| **Đáp án thay thế** | Có (climate\|warming) | Không |
| **Sample answer** | Không ảnh hưởng | Không đếm vào tổng |
| **Exam page** | 1 input | 3 inputs riêng |
| **Chấm điểm** | 1 câu = 1 điểm | Mỗi đáp án = 1 điểm |

---

## ⚠️ Lưu ý khi migrate

### Đề thi cũ
- Đề thi đã tạo trước khi thay đổi sẽ có logic cũ
- Cần re-save để áp dụng logic mới
- Hoặc chạy migration script để update `questionCount`

### UI TestBuilder
- Badge `×3` vẫn hiển thị số đáp án
- Nhưng `fromQuestion-toQuestion` sẽ thay đổi
- VD: Trước `1-3`, sau `1-9` (nếu mỗi câu có 3 đáp án)

### Backend
- Field `questionCount` trong DB sẽ thay đổi
- Cần update khi save đề mới
- Load đề cũ vẫn hoạt động (backward compatible)

---

## ✅ Checklist triển khai

- [x] Sửa `getGroupQuestionCount()` trong TestBuilder.jsx
- [x] Sửa logic tính `questionCount` trong testBuilderApi.js
- [x] Sửa transform data trong ieltsApi.js
- [ ] Test tạo đề mới với Short Answer
- [ ] Test load đề cũ (backward compatibility)
- [ ] Test làm bài và chấm điểm
- [ ] Update UI documentation
- [ ] Thông báo cho users về thay đổi

---

## 🎯 Kết luận

Thay đổi này làm cho Short Answer **rõ ràng và dễ hiểu hơn**:
- Mỗi đáp án = 1 câu hỏi = 1 điểm
- Không còn nhầm lẫn về "đáp án thay thế"
- Phù hợp với format IELTS thực tế
