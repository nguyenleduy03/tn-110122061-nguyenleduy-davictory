// ============================================
// THAY ĐỔI: Short Answer đếm theo đáp án thật
// ============================================

// TRƯỚC: 1 question = 1 câu (dù có nhiều đáp án thay thế)
const OLD_LOGIC = {
  question: {
    questionNumber: 1,
    answers: [
      { answerText: 'climate change' },
      { answerText: 'global warming' },  // Đáp án thay thế
      { answerText: 'warming' }          // Đáp án thay thế
    ]
  },
  // Tổng: 1 câu
  // Exam: • 1 [input] (accept: climate change | global warming | warming)
};

// SAU: Mỗi đáp án thật = 1 câu riêng
const NEW_LOGIC = {
  question: {
    questionNumber: 1,
    answers: [
      { answerText: 'climate change', isSample: false },  // Câu 1
      { answerText: 'global warming', isSample: false },  // Câu 2
      { answerText: 'example', isSample: true }           // Sample - KHÔNG đếm
    ]
  },
  // Tổng: 2 câu (không tính sample)
  // Exam: • 1 [input] (answer: climate change)
  //       • 2 [input] (answer: global warming)
};

// ============================================
// CODE CHANGES
// ============================================

// 1. TestBuilder.jsx - Hàm đếm câu
const getGroupQuestionCount = (group) => {
  if (group?.contentType === 'AUDIO_TRANSCRIPT') return 0;
  
  // Short Answer: đếm theo số đáp án thật
  if (group?.contentType === 'SHORT_ANSWER_GROUP') {
    return (group?.questions ?? []).reduce((sum, q) => {
      const answers = Array.isArray(q?.answers) ? q.answers : [];
      const realAnswers = answers.filter(ans => !ans.isSample);
      return sum + Math.max(1, realAnswers.length);
    }, 0);
  }
  
  return (group?.questions ?? []).reduce((sum, q) => sum + (q.questionCount || 1), 0);
};

// 2. testBuilderApi.js - Tính questionCount khi lưu
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

// 3. ieltsApi.js - Transform cho exam page
if (feType === 'short-answer-group') {
  const subQuestions = [];
  orderedQuestions.forEach((question) => {
    const answers = question?.answers || [];
    const realAnswers = answers.filter(ans => !ans.isSample);
    
    if (realAnswers.length === 0) {
      subQuestions.push({
        id: `q${question.id}`,
        number: resolveDbQuestionNumber(question),
        text: question?.questionText || '',
        correctAnswer: '',
      });
    } else {
      const startNum = resolveDbQuestionNumber(question);
      realAnswers.forEach((ans, idx) => {
        subQuestions.push({
          id: `q${question.id}_${idx}`,
          number: startNum + idx,
          text: question?.questionText || '',
          correctAnswer: ans.answerText || '',
        });
      });
    }
  });
  
  return [{ type: 'short-answer-group', subQuestions }];
}

// ============================================
// EXAMPLES
// ============================================

// Example 1: 1 question, 3 real answers
{
  questionNumber: 1,
  questionText: 'List three topics',
  answers: [
    { answerText: 'climate', isSample: false },
    { answerText: 'economy', isSample: false },
    { answerText: 'society', isSample: false }
  ]
}
// → 3 câu (1, 2, 3)
// → fromQuestion: 1, toQuestion: 3

// Example 2: 2 questions, each has 2 answers
[
  {
    questionNumber: 1,
    answers: [
      { answerText: 'a1', isSample: false },
      { answerText: 'a2', isSample: false }
    ]
  },
  {
    questionNumber: 3,
    answers: [
      { answerText: 'b1', isSample: false },
      { answerText: 'b2', isSample: false }
    ]
  }
]
// → 4 câu (1, 2, 3, 4)
// → fromQuestion: 1, toQuestion: 4

// Example 3: With sample answer
{
  questionNumber: 1,
  answers: [
    { answerText: 'example', isSample: true },   // KHÔNG đếm
    { answerText: 'real1', isSample: false },
    { answerText: 'real2', isSample: false }
  ]
}
// → 2 câu (không tính sample)
// → fromQuestion: 1, toQuestion: 2

// ============================================
// COMPARISON
// ============================================

/*
┌─────────────────────┬──────────────┬──────────────┐
│                     │    TRƯỚC     │      SAU     │
├─────────────────────┼──────────────┼──────────────┤
│ Đơn vị đếm          │ Question     │ Real Answer  │
│ 1 Q, 3 answers      │ 1 câu        │ 3 câu        │
│ Đáp án thay thế     │ Có (a|b|c)   │ Không        │
│ Sample answer       │ N/A          │ Không đếm    │
│ Exam inputs         │ 1 input      │ 3 inputs     │
│ Chấm điểm           │ 1 câu=1 điểm │ 1 ans=1 điểm │
└─────────────────────┴──────────────┴──────────────┘
*/

// ============================================
// TEST CASES
// ============================================

// Test 1: Count real answers only
const test1 = {
  contentType: 'SHORT_ANSWER_GROUP',
  questions: [{
    answers: [
      { answerText: 'a', isSample: false },
      { answerText: 'b', isSample: false },
      { answerText: 'c', isSample: false }
    ]
  }]
};
getGroupQuestionCount(test1);  // Expected: 3

// Test 2: Exclude sample answers
const test2 = {
  contentType: 'SHORT_ANSWER_GROUP',
  questions: [{
    answers: [
      { answerText: 'sample', isSample: true },
      { answerText: 'real', isSample: false }
    ]
  }]
};
getGroupQuestionCount(test2);  // Expected: 1

// Test 3: Multiple questions
const test3 = {
  contentType: 'SHORT_ANSWER_GROUP',
  questions: [
    { answers: [{ isSample: false }, { isSample: false }] },
    { answers: [{ isSample: false }, { isSample: false }, { isSample: false }] }
  ]
};
getGroupQuestionCount(test3);  // Expected: 5

// Test 4: No real answers (minimum 1)
const test4 = {
  contentType: 'SHORT_ANSWER_GROUP',
  questions: [{
    answers: [{ answerText: 'sample', isSample: true }]
  }]
};
getGroupQuestionCount(test4);  // Expected: 1
