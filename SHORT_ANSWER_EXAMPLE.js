// ============================================
// EXAMPLE: Render Short Answer trong Exam Page
// ============================================

// 1. Dữ liệu từ API (đã transform qua ieltsApi.js)
const shortAnswerQuestion = {
  id: 'group-123',
  type: 'short-answer-group',
  title: '<p>Answer the questions below</p>',
  subQuestions: [
    {
      id: 'q456',
      number: 1,
      text: 'What is the main topic?',
      correctAnswer: 'climate change|global warming'
    },
    {
      id: 'q457',
      number: 2,
      text: 'The study was conducted in [blank]',
      correctAnswer: 'Australia'
    }
  ],
  validationOptions: {
    ignoreCase: true,
    ignoreSpaces: false,
    ignorePunctuation: false
  }
};

// 2. State trong exam page
const [answers, setAnswers] = useState({});
const [activeQuestion, setActiveQuestion] = useState(1);
const [bookmarks, setBookmarks] = useState({});

// 3. Handler
const handleAnswerChange = (questionId, value) => {
  setAnswers(prev => ({ ...prev, [questionId]: value }));
};

const toggleBookmark = (questionNumber) => {
  setBookmarks(prev => ({ ...prev, [questionNumber]: !prev[questionNumber] }));
};

// 4. Render
<QuestionRenderer
  q={shortAnswerQuestion}
  activeQuestion={activeQuestion}
  setActiveQuestion={setActiveQuestion}
  answers={answers}
  handleAnswerChange={handleAnswerChange}
  bookmarks={bookmarks}
  toggleBookmark={toggleBookmark}
  isReview={false}
/>

// QuestionRenderer sẽ tự động nhận diện type='short-answer-group' 
// và render component ShortAnswerGroupQuestion

// ============================================
// OUTPUT HTML
// ============================================
/*
<div class="short-answer-group-container">
  <div class="short-answer-title">
    <p>Answer the questions below</p>
  </div>
  
  <ul class="short-answer-list">
    <li class="short-answer-item">
      <span class="short-answer-prefix">
        <span class="short-answer-bullet">•</span>
        <span class="short-answer-number">1</span>
      </span>
      <span class="short-answer-content">
        <span class="short-answer-text">What is the main topic?</span>
        <input 
          type="text" 
          class="short-answer-input"
          placeholder="1"
          value=""
        />
      </span>
    </li>
    
    <li class="short-answer-item">
      <span class="short-answer-prefix">
        <span class="short-answer-bullet">•</span>
        <span class="short-answer-number">2</span>
      </span>
      <span class="short-answer-content">
        <span class="short-answer-text">The study was conducted in </span>
        <input 
          type="text" 
          class="short-answer-input"
          placeholder="2"
          value=""
        />
      </span>
    </li>
  </ul>
</div>
*/

// ============================================
// VALIDATION LOGIC (Review Mode)
// ============================================

const normalizeAnswer = (value, validationOptions) => {
  let normalized = String(value || '').trim();
  
  if (validationOptions.ignoreCase !== false) {
    normalized = normalized.toLowerCase();
  }
  
  if (validationOptions.ignoreSpaces) {
    normalized = normalized.replace(/\s+/g, '');
  }
  
  if (validationOptions.ignorePunctuation) {
    normalized = normalized.replace(/[.,!?;:'"()]/g, '');
  }
  
  return normalized;
};

const checkAnswer = (userAnswer, correctAnswer, validationOptions) => {
  const normalizedUser = normalizeAnswer(userAnswer, validationOptions);
  
  // Split by | to get all accepted answers
  const acceptedAnswers = String(correctAnswer || '')
    .split('|')
    .map(item => normalizeAnswer(item, validationOptions))
    .filter(Boolean);
  
  return acceptedAnswers.includes(normalizedUser);
};

// Example usage:
const isCorrect = checkAnswer(
  'Climate Change',                      // User answer
  'climate change|global warming',       // Correct answers
  { ignoreCase: true }                   // Validation options
);
// → true

// ============================================
// COUNTING QUESTIONS (Test Builder)
// ============================================

// Tự động đếm câu hỏi khi thêm/xóa
const getGroupQuestionCount = (group) => {
  if (group?.contentType === 'AUDIO_TRANSCRIPT') return 0;
  return (group?.questions ?? []).reduce(
    (sum, q) => sum + (q.questionCount || 1), 
    0
  );
};

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

// Example:
const groups = [
  { contentType: 'MULTIPLE_CHOICE_GROUP', questions: [{}, {}, {}] },  // 3 câu
  { contentType: 'SHORT_ANSWER_GROUP', questions: [{}, {}] },         // 2 câu
  { contentType: 'TRUE_FALSE_NG', questions: [{}, {}, {}, {}] }       // 4 câu
];

const updated = recalculateQuestionNumbers(groups);
// Result:
// [
//   { fromQuestion: 1, toQuestion: 3, ... },   // MCQ: câu 1-3
//   { fromQuestion: 4, toQuestion: 5, ... },   // Short Answer: câu 4-5
//   { fromQuestion: 6, toQuestion: 9, ... }    // TFNG: câu 6-9
// ]
