export const IMAGE_NOTE_SECTIONS = Object.freeze({
  TOP: 'top',
  IMAGE: 'image',
  BOTTOM: 'bottom',
});

export const countBlankTokens = (text = '') => {
  const value = String(text || '');
  const markerMatches = value.match(/\[blank\]|\(ô trống\)/gi) || [];

  if (!value.includes('<')) {
    return markerMatches.length;
  }

  try {
    const root = document.createElement('div');
    root.innerHTML = value;
    const chipCount = root.querySelectorAll('[data-blank="true"], .rbe-blank').length;
    return markerMatches.length + chipCount;
  } catch {
    return markerMatches.length;
  }
};

export const isImagePinQuestion = (q) => (
  q?.questionSection === IMAGE_NOTE_SECTIONS.IMAGE
  || q?.questionMode === 'image-pin'
  || (q?.questionMode !== 'note-blank' && q?.pinX != null && q?.pinY != null)
);

export const isNoteBlankQuestion = (q) => (
  q?.questionSection === IMAGE_NOTE_SECTIONS.TOP
  || q?.questionSection === IMAGE_NOTE_SECTIONS.BOTTOM
  || q?.questionMode === 'note-blank'
  || (q?.questionMode !== 'image-pin' && q?.pinX == null && q?.pinY == null)
);

const hasExplicitSections = (questions = []) => questions.some((q) => q?.questionSection);

const getTopBlankCount = (group, noteBlanks) => {
  const imagePosition = group?.imagePosition || 'middle';
  const topNoteText = group?.topNoteText ?? (imagePosition === 'bottom' ? '' : (group?.noteText || ''));
  const topBlankCountFromText = countBlankTokens(topNoteText);

  if (imagePosition !== 'middle') return topBlankCountFromText;

  const hasSplitText = group?.topNoteText != null || group?.bottomNoteText != null;
  const combinedLegacyNote = !hasSplitText && Boolean(group?.noteText);

  if (combinedLegacyNote && noteBlanks.length > 1) {
    return Math.floor(noteBlanks.length / 2);
  }

  return Math.min(topBlankCountFromText, noteBlanks.length);
};

export const getImageNoteFormOrderedQuestions = (group) => {
  const questions = group?.questions ?? [];
  const imagePosition = group?.imagePosition || 'middle';

  const imagePins = questions.filter(isImagePinQuestion);
  const noteBlanks = questions.filter(isNoteBlankQuestion);

  if (hasExplicitSections(questions)) {
    const topQuestions = questions.filter((q) => q?.questionSection === IMAGE_NOTE_SECTIONS.TOP);
    const imageQuestions = questions.filter((q) => q?.questionSection === IMAGE_NOTE_SECTIONS.IMAGE || isImagePinQuestion(q));
    const bottomQuestions = questions.filter((q) => q?.questionSection === IMAGE_NOTE_SECTIONS.BOTTOM);
    const unassignedQuestions = questions.filter((q) => !q?.questionSection);

    return [
      ...topQuestions,
      ...imageQuestions,
      ...bottomQuestions,
      ...unassignedQuestions.filter((q) => !isImagePinQuestion(q)),
    ];
  }

  if (imagePosition === 'top') {
    return [...imagePins, ...noteBlanks];
  }

  if (imagePosition === 'bottom') {
    return [...noteBlanks, ...imagePins];
  }

  const topBlankCount = getTopBlankCount(group, noteBlanks);
  return [
    ...noteBlanks.slice(0, topBlankCount),
    ...imagePins,
    ...noteBlanks.slice(topBlankCount),
  ];
};

export const normalizeImageNoteFormQuestions = (group) => {
  if (group?.contentType !== 'IMAGE_NOTE_FORM') return group;

  const questions = group.questions ?? [];
  const orderedQuestions = getImageNoteFormOrderedQuestions(group);
  const startNumber = Number(group.fromQuestion || 1);
  const topBoundary = (() => {
    if ((group?.imagePosition || 'middle') !== 'middle') return 0;
    if (hasExplicitSections(questions)) {
      return questions.filter((q) => q?.questionSection === IMAGE_NOTE_SECTIONS.TOP).length;
    }
    const noteBlanks = questions.filter(isNoteBlankQuestion);
    return getTopBlankCount(group, noteBlanks);
  })();

  const normalizedQuestions = orderedQuestions.map((q, idx) => {
    let questionSection = q?.questionSection || null;
    if (!questionSection) {
      if (isImagePinQuestion(q)) {
        questionSection = IMAGE_NOTE_SECTIONS.IMAGE;
      } else if ((group?.imagePosition || 'middle') === 'top') {
        questionSection = IMAGE_NOTE_SECTIONS.TOP;
      } else if ((group?.imagePosition || 'middle') === 'bottom') {
        questionSection = IMAGE_NOTE_SECTIONS.BOTTOM;
      } else if (idx < topBoundary) {
        questionSection = IMAGE_NOTE_SECTIONS.TOP;
      } else {
        questionSection = IMAGE_NOTE_SECTIONS.BOTTOM;
      }
    }

    return {
      ...q,
      questionSection,
      questionNumber: startNumber + idx,
      orderIndex: idx + 1,
    };
  });

  const toQuestion = normalizedQuestions.length > 0 ? startNumber + normalizedQuestions.length - 1 : group.toQuestion;

  return {
    ...group,
    questions: normalizedQuestions,
    fromQuestion: startNumber,
    toQuestion,
  };
};

export const getImageNoteFormSectionBuckets = (group) => {
  const questions = group?.questions ?? [];
  const imagePosition = group?.imagePosition || 'middle';

  const imagePins = questions.filter(isImagePinQuestion);
  const noteBlanks = questions.filter(isNoteBlankQuestion);
  const hasExplicitSections = questions.some((q) => q?.questionSection);

  if (hasExplicitSections) {
    return {
      top: questions.filter((q) => q?.questionSection === IMAGE_NOTE_SECTIONS.TOP),
      image: questions.filter((q) => q?.questionSection === IMAGE_NOTE_SECTIONS.IMAGE || isImagePinQuestion(q)),
      bottom: questions.filter((q) => q?.questionSection === IMAGE_NOTE_SECTIONS.BOTTOM),
    };
  }

  if (imagePosition === 'top') {
    return { top: noteBlanks, image: imagePins, bottom: [] };
  }

  if (imagePosition === 'bottom') {
    return { top: [], image: imagePins, bottom: noteBlanks };
  }

  const topBlankCount = getTopBlankCount(group, noteBlanks);
  return {
    top: noteBlanks.slice(0, topBlankCount),
    image: imagePins,
    bottom: noteBlanks.slice(topBlankCount),
  };
};

export const getImageNoteFormDisplayNumberMap = (group) => {
  const orderedQuestions = getImageNoteFormOrderedQuestions(group);
  const startNumber = Number(group?.fromQuestion || 1);
  return new Map(orderedQuestions.map((q, idx) => [q.id, startNumber + idx]));
};