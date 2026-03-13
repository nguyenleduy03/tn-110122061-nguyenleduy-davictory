/**
 * Utility để render passage text với ô trống có số thứ tự đúng
 */

export function renderPassageWithBlanks(passageText, startQuestionNumber = 1, answers = {}, handleAnswerChange, isReview = false) {
  if (!passageText) return passageText;

  let blankIndex = 0;
  
  return passageText.replace(/_______/g, () => {
    const questionNumber = startQuestionNumber + blankIndex;
    const answer = answers[questionNumber] || '';
    blankIndex++;

    return `<input 
      type="text" 
      class="inline-input ${isReview ? (answer === 'correct' ? 'review-correct' : 'review-wrong') : ''}"
      placeholder="${questionNumber}"
      value="${answer}"
      data-question="${questionNumber}"
      ${isReview ? 'readonly' : ''}
    />`;
  });
}

export function extractBlanksFromPassage(passageText, startQuestionNumber = 1) {
  if (!passageText) return [];
  
  const blanks = [];
  let blankIndex = 0;
  
  passageText.replace(/_______/g, () => {
    blanks.push({
      questionNumber: startQuestionNumber + blankIndex,
      type: 'fill-in-blank'
    });
    blankIndex++;
    return '';
  });
  
  return blanks;
}
