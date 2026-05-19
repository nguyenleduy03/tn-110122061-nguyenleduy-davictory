// Test case để debug Short Answer infinite loop
// Chạy trong browser console khi mở trang Test Builder

console.log('=== SHORT ANSWER DEBUG TEST ===');

// Mock data
const mockGroup = {
  id: 'test-group-1',
  contentType: 'SHORT_ANSWER_GROUP',
  fromQuestion: 1,
  toQuestion: 3,
  questions: [
    { id: 'q1', questionNumber: 1, questionText: 'Question 1', answers: [{ answerText: 'answer1' }] },
    { id: 'q2', questionNumber: 2, questionText: 'Question 2', answers: [{ answerText: 'answer2' }] },
    { id: 'q3', questionNumber: 3, questionText: 'Question 3', answers: [{ answerText: 'answer3' }] }
  ]
};

// Test signature calculation
const calculateSignature = (questions) => {
  return questions.map((q, idx) => `${q.id}:${q.questionNumber ?? ''}`).join('|');
};

const sig1 = calculateSignature(mockGroup.questions);
console.log('Signature 1:', sig1);

// Simulate update (same data, different reference)
const updatedQuestions = mockGroup.questions.map(q => ({ ...q }));
const sig2 = calculateSignature(updatedQuestions);
console.log('Signature 2:', sig2);
console.log('Signatures equal?', sig1 === sig2);

// Simulate questionNumber change
const changedQuestions = mockGroup.questions.map((q, idx) => ({ ...q, questionNumber: idx + 10 }));
const sig3 = calculateSignature(changedQuestions);
console.log('Signature 3:', sig3);
console.log('Signature changed?', sig1 !== sig3);

// Test hasWrongNumbers logic
const fromQ = 1;
const hasWrongNumbers = mockGroup.questions.some((q, idx) => q.questionNumber !== fromQ + idx);
console.log('Has wrong numbers?', hasWrongNumbers);

console.log('=== TEST COMPLETE ===');
