# 🔢 Logic Đếm Câu Hỏi Short Answer

## ✅ KẾT LUẬN: ĐẾM THEO CÂU HỎI, KHÔNG PHẢI ĐÁP ÁN

Short Answer **đếm theo số câu hỏi (questions)**, mỗi câu hỏi có thể có **nhiều đáp án thay thế** nhưng chỉ tính là **1 câu**.

---

## 📊 Cấu trúc dữ liệu

### Database (Backend)

```java
// Question.java
@Entity
public class Question {
    @Column(nullable = false)
    private Integer questionNumber;  // Số thứ tự câu: 1, 2, 3...
    
    @Column
    private Integer questionCount = 1;  // Số câu hiển thị (mặc định = 1)
    
    @Column(columnDefinition = "TEXT")
    private String questionText;  // Nội dung câu hỏi
    
    // Relationship
    @OneToMany(mappedBy = "question")
    private List<Answer> answers;  // NHIỀU đáp án cho 1 câu
}

// Answer.java
@Entity
public class Answer {
    @Column(columnDefinition = "TEXT")
    private String answerText;  // Đáp án (vd: "climate change")
    
    @Column
    private String alternativeAnswers;  // Đáp án thay thế (vd: "global warming")
    
    @Column
    private Integer blankIndex = 1;  // Thứ tự đáp án (1, 2, 3...)
}
```

### Frontend (TestBuilder)

```javascript
// Mỗi câu hỏi Short Answer
const question = {
  id: 123,
  questionNumber: 1,        // Số thứ tự câu
  questionCount: 1,         // Số câu hiển thị (luôn = 1 với Short Answer)
  questionText: 'What is the main topic?',
  answerText: 'climate change',  // Đáp án chính
  answers: [                // Mảng đáp án (có thể nhiều)
    { answerText: 'climate change', blankIndex: 1, isSample: false },
    { answerText: 'global warming', blankIndex: 2, isSample: false },
    { answerText: 'warming', blankIndex: 3, isSample: false }
  ]
};
```

---

## 🧮 Logic đếm câu hỏi

### 1. Hàm đếm trong TestBuilder

```javascript
// frontend/src/pages/TestBuilder.jsx (dòng 56-59)
const getGroupQuestionCount = (group) => {
  if (group?.contentType === 'AUDIO_TRANSCRIPT') return 0;
  return (group?.questions ?? []).reduce(
    (sum, q) => sum + (q.questionCount || 1),  // Cộng questionCount của mỗi câu
    0
  );
};
```

**Ví dụ:**
```javascript
const shortAnswerGroup = {
  contentType: 'SHORT_ANSWER_GROUP',
  questions: [
    { questionNumber: 1, questionCount: 1, answers: [{...}, {...}] },  // 2 đáp án
    { questionNumber: 2, questionCount: 1, answers: [{...}] },         // 1 đáp án
    { questionNumber: 3, questionCount: 1, answers: [{...}, {...}, {...}] }  // 3 đáp án
  ]
};

getGroupQuestionCount(shortAnswerGroup);
// = 1 + 1 + 1 = 3 câu (KHÔNG phải 2+1+3=6)
```

### 2. Tính fromQuestion và toQuestion

```javascript
// frontend/src/pages/TestBuilder.jsx (dòng 61-73)
const recalculateQuestionNumbers = (groups) => {
  let runningTotal = 0;
  return groups.map((g) => {
    const questionCount = getGroupQuestionCount(g);  // Đếm số câu
    
    const fromQuestion = questionCount > 0 ? runningTotal + 1 : null;
    const toQuestion = questionCount > 0 ? runningTotal + questionCount : null;
    
    runningTotal += questionCount;
    
    return { ...g, fromQuestion, toQuestion };
  });
};
```

**Ví dụ:**
```javascript
const groups = [
  { 
    contentType: 'SHORT_ANSWER_GROUP',
    questions: [
      { questionNumber: 1, answers: [{...}, {...}] },  // 2 đáp án
      { questionNumber: 2, answers: [{...}] },         // 1 đáp án
      { questionNumber: 3, answers: [{...}, {...}] }   // 2 đáp án
    ]
  }
];

recalculateQuestionNumbers(groups);
// Result:
// {
//   fromQuestion: 1,
//   toQuestion: 3,    // 3 câu hỏi (KHÔNG phải 5 đáp án)
//   ...
// }
```

---

## 🎯 Ví dụ thực tế

### Case 1: Short Answer với nhiều đáp án thay thế

```javascript
// TestBuilder - Tạo đề
const group = {
  contentType: 'SHORT_ANSWER_GROUP',
  fromQuestion: 1,
  toQuestion: 3,
  questions: [
    {
      questionNumber: 1,
      questionCount: 1,  // ← Tính là 1 câu
      questionText: 'What is the main topic?',
      answers: [
        { answerText: 'climate change' },
        { answerText: 'global warming' },  // Đáp án thay thế
        { answerText: 'warming' }          // Đáp án thay thế
      ]
    },
    {
      questionNumber: 2,
      questionCount: 1,  // ← Tính là 1 câu
      questionText: 'Where was the study conducted?',
      answers: [
        { answerText: 'Australia' },
        { answerText: 'australia' }  // Đáp án thay thế (lowercase)
      ]
    },
    {
      questionNumber: 3,
      questionCount: 1,  // ← Tính là 1 câu
      questionText: 'How many years?',
      answers: [
        { answerText: '5' },
        { answerText: 'five' }  // Đáp án thay thế (chữ)
      ]
    }
  ]
};

// Tổng số câu = 1 + 1 + 1 = 3 câu
// fromQuestion = 1, toQuestion = 3
```

### Case 2: Hiển thị trong UI TestBuilder

```jsx
// ShortAnswerBlock.jsx (dòng 213-217)
<div className="exam-q-num">
  {q.questionNumber ?? '?'}
  {answers.length > 1 && (
    <div style={{ fontSize: 9 }}>×{answers.length}</div>  // Hiển thị số đáp án
  )}
</div>
```

**Output:**
```
┌─────┬────────────────────────────────────────┐
│  1  │ What is the main topic?                │
│ ×3  │ Đáp án: climate change | global warming│
├─────┼────────────────────────────────────────┤
│  2  │ Where was the study conducted?         │
│ ×2  │ Đáp án: Australia | australia          │
├─────┼────────────────────────────────────────┤
│  3  │ How many years?                        │
│ ×2  │ Đáp án: 5 | five                       │
└─────┴────────────────────────────────────────┘

Câu 1 - 3  ← fromQuestion - toQuestion (3 câu, không phải 7 đáp án)
```

### Case 3: Transform sang exam page

```javascript
// ieltsApi.js (dòng 389-415)
if (feType === 'short-answer-group') {
  const subQuestions = orderedQuestions.map((question) => {
    const acceptedAnswers = collectAcceptedAnswers(question?.answers || []);
    
    return {
      id: `q${question.id}`,
      number: resolveDbQuestionNumber(question),  // 1, 2, 3
      text: formatTextWithWhitespace(question?.questionText || ''),
      correctAnswer: acceptedAnswers.join('|')  // "climate change|global warming"
    };
  });
  
  return [{
    type: 'short-answer-group',
    subQuestions  // 3 câu hỏi, mỗi câu có nhiều đáp án đúng
  }];
}
```

**Output trong exam page:**
```
Answer the questions below:

• 1  What is the main topic? [_____________]
• 2  Where was the study conducted? [_____________]
• 3  How many years? [_____________]

Questions 1-3  ← 3 câu hỏi
```

---

## 🔑 Điểm quan trọng

### ✅ Đúng: Đếm theo câu hỏi
- Mỗi câu hỏi có `questionCount = 1`
- Nhiều đáp án thay thế vẫn chỉ tính **1 câu**
- `fromQuestion` và `toQuestion` dựa trên số câu hỏi

### ❌ Sai: Đếm theo đáp án
- **KHÔNG** đếm theo số lượng đáp án trong `answers` array
- **KHÔNG** tính mỗi đáp án thay thế là 1 câu riêng

### 📌 Lý do thiết kế
1. **Học viên chỉ trả lời 1 lần** cho mỗi câu hỏi
2. **Nhiều đáp án đúng** = cho phép nhiều cách trả lời (flexibility)
3. **Chấm điểm**: 1 câu = 1 điểm (không phụ thuộc số đáp án thay thế)

---

## 🧪 Test cases

### Test 1: Group với 3 câu, mỗi câu nhiều đáp án
```javascript
const group = {
  questions: [
    { questionCount: 1, answers: [{}, {}] },      // 2 đáp án
    { questionCount: 1, answers: [{}] },          // 1 đáp án
    { questionCount: 1, answers: [{}, {}, {}] }   // 3 đáp án
  ]
};

getGroupQuestionCount(group);  // Expected: 3 (NOT 6)
```

### Test 2: Tính fromQuestion/toQuestion
```javascript
const groups = [
  { questions: [{ questionCount: 1 }, { questionCount: 1 }] },  // 2 câu
  { questions: [{ questionCount: 1 }, { questionCount: 1 }, { questionCount: 1 }] }  // 3 câu
];

recalculateQuestionNumbers(groups);
// Expected:
// [
//   { fromQuestion: 1, toQuestion: 2 },
//   { fromQuestion: 3, toQuestion: 5 }
// ]
```

### Test 3: Backend lưu đúng
```java
// Backend lưu 3 questions, mỗi question có nhiều answers
Question q1 = new Question();
q1.setQuestionNumber(1);
q1.setQuestionCount(1);  // ← Luôn = 1 với Short Answer

Answer a1 = new Answer();
a1.setAnswerText("climate change");
a1.setBlankIndex(1);

Answer a2 = new Answer();
a2.setAnswerText("global warming");
a2.setBlankIndex(2);

q1.setAnswers(List.of(a1, a2));  // 2 đáp án cho 1 câu
```

---

## 📝 Tóm tắt

| Khía cạnh | Giá trị |
|-----------|---------|
| **Đơn vị đếm** | Câu hỏi (Question) |
| **questionCount** | Luôn = 1 với Short Answer |
| **Số đáp án** | Không ảnh hưởng đến số câu |
| **fromQuestion/toQuestion** | Dựa trên tổng số câu hỏi |
| **Điểm số** | 1 câu = 1 điểm |
| **UI hiển thị** | Số câu + badge số đáp án (×3) |

**Công thức:**
```
Tổng số câu = Σ(questionCount của mỗi question)
            = Σ(1) cho Short Answer
            ≠ Σ(số đáp án)
```
