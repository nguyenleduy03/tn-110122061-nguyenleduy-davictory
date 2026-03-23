// Test file - kiểm tra imports
import {
  PassageBlock,
  AudioBlock,
  ImageBlock,
  DragMatchingBlock,
  MatchingFeaturesBlock,
  MatchingHeadingBlock,
  MultipleChoiceBlock,
  MultipleChoiceMultiBlock,
  TFNGBlock,
  SentenceCompletionBlock,
  ShortAnswerBlock,
  NoteCompletionBlock,
  ImageNoteFormBlock,
  SummaryCompletionBlock,
  SpeakingInterviewBlock,
  SpeakingCueCardBlock,
  WritingTaskBlock,
  TYPE_META,
  toRoman,
  toPlainText,
  countBlankTokens,
  getQuestionWeight,
  getPartQuestionStartNumber,
  getNextQuestionNumber,
  GroupToolbar,
  RichBlankEditor,
} from './blocks';

console.log('✅ All imports successful');
console.log('toPlainText:', typeof toPlainText);
console.log('countBlankTokens:', typeof countBlankTokens);
console.log('getQuestionWeight:', typeof getQuestionWeight);
console.log('getPartQuestionStartNumber:', typeof getPartQuestionStartNumber);
console.log('getNextQuestionNumber:', typeof getNextQuestionNumber);
console.log('toRoman:', typeof toRoman);
console.log('TYPE_META:', typeof TYPE_META);
