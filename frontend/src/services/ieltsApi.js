import { API_CONFIG } from '../config/api';
import { formatTextWithWhitespace } from '../utils/textFormatters';

// ─── Helper: auth headers ───────────────────────────────────────────
function authHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ─── Helper: fetch với timeout + auth ───────────────────────────────
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('AUTH_REQUIRED');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}: ${url}`);
  }
  return res.json();
}

// ─── Lấy chi tiết group (kèm matchingPairs) ─────────────────────────
async function fetchGroupDetail(baseUrl, questionGroupId) {
  try {
    return await apiFetch(`${baseUrl}/tests/question-groups/${questionGroupId}`);
  } catch {
    return null;
  }
}

// ─── Map question type code → FE type string ─────────────────────────
function mapQuestionType(questionTypeCode) {
  const code = (questionTypeCode || '').toUpperCase();
  switch (code) {
    case 'MCQ':
      return 'multiple-choice';
    case 'TFNG':
      return 'tfng';
    case 'YNNG':
      return 'ynng';
    case 'FILL_BLANK':
    case 'SHORT_ANSWER':
    case 'SENTENCE_COMPLETION':
    case 'NOTE_COMPLETION':
      return 'note-completion';
    case 'SUMMARY_COMPLETION':
      return 'summary-completion';
    case 'FLOW_CHART':
      return 'flow_chart';
    case 'MAP_DIAGRAM':
      return 'image-drag-drop';
    case 'MATCHING':
      return 'matching_info';
    case 'MATCHING_HEADINGS':
      return 'matching_heading';
    default:
      return 'fill-in-the-blank';
  }
}

  // ─── Transform 1 question group từ BE → FE question(s) ──────────────
// Priority: check group.contentType FIRST, then fallback to questionTypeCode
async function transformGroup(baseUrl, group, globalCounterRef) {
  const questions = group.questions || [];
  const contentType = (group.contentType || '').toUpperCase();
  
  // ─── Determine FE type từ contentType hoặc questionTypeCode ─────────
  let feType = null;
  let typeCode = null;
  
  // Map contentType directly to FE type (higher priority)
  if (contentType === 'SUMMARY_COMPLETION') {
    feType = 'summary-completion';
  } else if (contentType === 'FLOW_CHART') {
    feType = 'flow_chart';
  } else if (contentType === 'TABLE_COMPLETION') {
    feType = 'table-completion';
  } else if (contentType === 'NOTE_COMPLETION') {
    feType = 'note-completion';
  } else if (contentType === 'MAP_LABELLING' || contentType === 'DIAGRAM' || contentType === 'MAP') {
    feType = 'image-drag-drop';
  } else if (contentType === 'MATCHING_HEADING') {
    feType = 'matching_heading';
  } else if (contentType === 'DRAG_MATCHING' || contentType === 'MATCHING') {
    feType = 'matching_info';
  } else if (contentType === 'AUDIO_TRANSCRIPT') {
    // Audio transcript groups - skip questions, just extract audio
    return [];
  } else if (contentType === 'READING_PASSAGE') {
    // READING_PASSAGE: extract passage content but still process questions
    // Return empty if there are no questions (just a passage)
    if (questions.length === 0) return [];
    feType = 'fill-in-the-blank'; // Default for passage-embedded questions
  } else if (contentType === 'SENTENCE_COMPLETION') {
    feType = 'fill-in-the-blank';
  } else if (contentType === 'SHORT_ANSWER_GROUP' || contentType === 'SHORT_ANSWER') {
    feType = 'fill-in-the-blank';
  } else if (contentType === 'SPEAKING_CUECARD' || contentType === 'SPEAKING_INTERVIEW') {
    // SPEAKING: keep raw question data for custom rendering
    // Return questions as-is with additional metadata from group
    return questions.map((q, idx) => {
      const num = q.questionNumber || globalCounterRef.counter++;
      globalCounterRef.counter = Math.max(globalCounterRef.counter, num + 1);
      return {
        id: `q${q.id}`,
        number: num,
        type: 'speaking',
        questionTypeCode: contentType,
        // Keep all SPEAKING-specific fields
        topic: q.topic || q.blankContext || '',
        topic: q.topic || q.blankContext || '',
        instruction: formatTextWithWhitespace(q.instruction || ''),
        bulletPoints: (q.bulletPoints || []).map(bp => formatTextWithWhitespace(bp)),
        closingSentence: formatTextWithWhitespace(q.closingSentence || ''),
        text: formatTextWithWhitespace(q.questionText || q.blankContext || ''),
        questionText: formatTextWithWhitespace(q.questionText || ''),
        blankContext: formatTextWithWhitespace(q.blankContext || ''),
      };
    });
  } else {
    // Fallback to questionTypeCode
    const firstQ = questions[0];
    typeCode = (firstQ?.questionTypeCode || '').toUpperCase();
    feType = mapQuestionType(typeCode);
  }

  if (!typeCode) {
    const firstQ = questions[0];
    typeCode = (firstQ?.questionTypeCode || '').toUpperCase();
  }

  // ─── Single-question types: mỗi câu → 1 phần tử ─────────────────
  if (['multiple-choice', 'tfng', 'ynng', 'fill-in-the-blank'].includes(feType)) {
    return questions.map((q) => {
      const correctOpts = (q.options || []).filter(o => o.isCorrect);
      const isMultiSelect = feType === 'multiple-choice' && correctOpts.length > 1;
      const selectCount = isMultiSelect ? correctOpts.length : 0;
      
      const num = q.questionNumber || globalCounterRef.counter;
      
      let numberRange = null;
      if (isMultiSelect) {
         numberRange = Array.from({ length: selectCount }, (_, i) => num + i);
         globalCounterRef.counter = Math.max(globalCounterRef.counter, num + selectCount);
      } else {
         globalCounterRef.counter = Math.max(globalCounterRef.counter, num + 1);
      }

      const optionsList = (q.options || []).length > 0
        ? q.options.map(o => o.optionText || o.optionLabel || '')
        : (feType === 'tfng' ? ['TRUE', 'FALSE', 'NOT GIVEN']
          : feType === 'ynng' ? ['YES', 'NO', 'NOT GIVEN']
          : []);

      let correctAnswer = null;
      if (isMultiSelect) {
        correctAnswer = correctOpts.map(o => o.optionText || o.optionLabel);
      } else if (correctOpts.length > 0) {
        correctAnswer = correctOpts[0].optionText || correctOpts[0].optionLabel;
      } else if ((q.answers || []).length > 0) {
        correctAnswer = q.answers[0].answerText;
      }

      return {
        id: `q${q.id}`,
        number: num,
        ...(numberRange ? { numberRange } : {}),
        type: feType,
        questionTypeCode: typeCode,
        text: formatTextWithWhitespace(q.questionText || q.blankContext || ''),
        blankContext: formatTextWithWhitespace(q.blankContext || ''),
        imageUrl: q.imageUrl || null,
        options: optionsList,
        correctAnswer,
        allowMultipleAnswers: isMultiSelect,
        selectCount: selectCount,
      };
    });
  }

  // ─── TABLE_COMPLETION → 1 group question ────────────────────────────
  if (feType === 'table-completion') {
    const subQuestions = questions.map((q) => {
      const num = q.questionNumber || globalCounterRef.counter++;
      globalCounterRef.counter = Math.max(globalCounterRef.counter, num + 1);
      const correctAnswer = (q.answers || [])[0]?.answerText || '';
      return { id: `q${q.id}`, number: num, text: q.questionText || '', correctAnswer };
    });

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'table-completion',
      questionTypeCode: typeCode,
      title: group.title || '',
      subQuestions,
    }];
  }

  // ─── NOTE_COMPLETION → 1 group question ────────────────────────────
  if (feType === 'note-completion') {
    const subQuestions = questions.map((q) => {
      const num = q.questionNumber || globalCounterRef.counter++;
      globalCounterRef.counter = Math.max(globalCounterRef.counter, num + 1);
      const correctAnswer = (q.answers || [])[0]?.answerText || '';
      return { id: `q${q.id}`, number: num, correctAnswer };
    });

    const noteText = group.passageText || group.title || '';

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'note-completion',
      questionTypeCode: typeCode,
      title: group.title || group.instructions || '',
      text: noteText,
      subQuestions,
    }];
  }

  // ─── SUMMARY_COMPLETION → 1 group question ────────────────────────────
  if (feType === 'summary-completion') {
    const subQuestions = questions.map((q) => {
      const num = q.questionNumber || globalCounterRef.counter++;
      globalCounterRef.counter = Math.max(globalCounterRef.counter, num + 1);
      const correctAnswer = (q.answers || [])[0]?.answerText || '';
      return { id: `q${q.id}`, number: num, correctAnswer };
    });

    const summaryText = group.passageText || group.title || '';

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'summary-completion',
      questionTypeCode: typeCode,
      title: group.title || group.instructions || '',
      text: summaryText,
      subQuestions,
    }];
  }

  // ─── FLOW_CHART → 1 group question ───────────────────────────────
  if (feType === 'flow_chart') {
    const subQuestions = questions.map((q) => {
      const num = q.questionNumber || globalCounterRef.counter++;
      globalCounterRef.counter = Math.max(globalCounterRef.counter, num + 1);
      const correctAnswer = (q.answers || [])[0]?.answerText || '';
      return { id: `q${q.id}`, number: num, correctAnswer };
    });

    let flowNodes = [];
    if (group.passageText) {
      try {
        const parsed = JSON.parse(group.passageText);
        if (Array.isArray(parsed)) {
          flowNodes = parsed;
        }
      } catch {
        flowNodes = questions.map((q, i) => ({
          id: `n${i + 1}`,
          text: q.blankContext || q.questionText || '',
        }));
      }
    } else {
      flowNodes = questions.map((q, i) => ({
        id: `n${i + 1}`,
        text: q.blankContext || q.questionText || '',
      }));
    }

    const bankOptions = (questions[0]?.options || []).map(o => o.optionText || o.optionLabel);

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'flow_chart',
      questionTypeCode: typeCode,
      title: group.title || '',
      bankOptions,
      flowNodes,
      subQuestions,
    }];
  }

  // ─── MAP_DIAGRAM / IMAGE_DRAG_DROP → 1 group question ────────────
  if (feType === 'image-drag-drop') {
    const subQuestions = questions.map((q) => {
      const num = q.questionNumber || globalCounterRef.counter++;
      globalCounterRef.counter = Math.max(globalCounterRef.counter, num + 1);
      const correctAnswer = (q.answers || [])[0]?.answerText
        || (q.options || []).find(o => o.isCorrect)?.optionText
        || '';
      return {
        id: `q${q.id}`,
        number: num,
        text: q.questionText || '',
        top: q.pinY !== null && q.pinY !== undefined ? `${q.pinY}%` : '50%',
        left: q.pinX !== null && q.pinX !== undefined ? `${q.pinX}%` : '50%',
        correctAnswer,
      };
    });

    const bankOptions = (questions[0]?.options || []).map(o => o.optionText || o.optionLabel);

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'image-drag-drop',
      questionTypeCode: typeCode,
      instruction: group.title || '',
      imageUrl: group.imageUrl || null,
      bankOptions,
      subQuestions,
    }];
  }

  // ─── MATCHING / MATCHING_HEADINGS → cần matchingPairs ────────────
  if (feType === 'matching_info' || feType === 'matching_heading') {
    const groupDetail = await fetchGroupDetail(baseUrl, group.questionGroupId || group.id);
    const matchingPairs = groupDetail?.matchingPairs || [];

    let parsedBank = null;
    if (group.passageText) {
      try {
        parsedBank = JSON.parse(group.passageText);
      } catch {
        parsedBank = null;
      }
    }

    const normalizeBank = (items) => (items || []).map(item => {
      if (typeof item === 'string') return item;
      return item?.text || item?.label || item?.value || '';
    }).filter(Boolean);

    let bankOptions = [];
    if (feType === 'matching_heading') {
      bankOptions = matchingPairs.map(mp => mp.leftContent || mp.leftLabel || '');
      if (bankOptions.length === 0) {
        bankOptions = normalizeBank(parsedBank?.headingBank || group.headingBank || []);
      }
    } else {
      bankOptions = matchingPairs.map(mp => mp.rightContent || mp.rightLabel || '');
      if (bankOptions.length === 0) {
        bankOptions = normalizeBank(parsedBank?.optionBank || group.optionBank || []);
      }
    }

    const subQuestions = questions.map((q) => {
      const num = q.questionNumber || globalCounterRef.counter++;
      globalCounterRef.counter = Math.max(globalCounterRef.counter, num + 1);

      const correctAnswer = (q.answers || [])[0]?.answerText
        || (q.options || []).find(o => o.isCorrect)?.optionText
        || '';

      return {
        id: `q${q.id}`,
        number: num,
        text: q.questionText || '',
        correctAnswer,
      };
    });

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: feType,
      questionTypeCode: typeCode,
      leftHeader: parsedBank?.leftTitle || group.leftTitle || 'Questions',
      rightHeader: parsedBank?.rightTitle || group.rightTitle || 'Options',
      bankOptions,
      subQuestions,
    }];
  }

  // Fallback: đối xử như fill-in-the-blank
  return questions.map((q) => {
    const num = q.questionNumber || globalCounterRef.counter++;
    globalCounterRef.counter = Math.max(globalCounterRef.counter, num + 1);
    return {
      id: `q${q.id}`,
      number: num,
      type: 'fill-in-the-blank',
      questionTypeCode: typeCode,
      text: q.questionText || q.blankContext || '',
      blankContext: q.blankContext || '',
      correctAnswer: (q.answers || [])[0]?.answerText || null,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
//  getTestSession
//  Tải đề thi từ backend theo testId và skill (READING / LISTENING / …)
// ═══════════════════════════════════════════════════════════════════
export const ieltsApi = {
  getTestSession: async (testId, mode = 'READING') => {
    const baseUrl = API_CONFIG.BASE_URL;
    const targetMode = mode.toUpperCase();

    // 1. Lấy toàn bộ đề thi từ test-builder (có structure đầy đủ)
    const testData = await apiFetch(`${baseUrl}/test-builder/${testId}/full`);

    // 2. Tìm session theo skillType
    const targetSession = testData.sessions.find(s =>
      s.skillType === targetMode
    ) || testData.sessions[0];
    if (!targetSession) throw new Error(`Không tìm thấy session ${targetMode}`);

    // counter dùng chung toàn bộ transform (pass by ref)
    const globalCounterRef = { counter: 1 };

    // 3. Transform parts — giữ nguyên group structure, transform questions bên trong
    const populatedParts = await Promise.all(
      targetSession.parts.map(async (part, index) => {
        let mergedPassageContent = '';
        let mergedPassageTitle = '';
        let mergedAudioUrl = null;
        let mergedImageUrl = null;
        let mergedInstructions = '';
        
        // Special handling for WRITING skill
        let taskLabel = part.name || `Task ${part.orderIndex || index + 1}`;
        let minWords = 150;
        let recommendedMinutes = 20;
        let taskImageSvg = null;

        // Transform questionGroups — preserve group structure nhưng transform các questions bên trong
        const transformedGroups = await Promise.all(
          (part.questionGroups || []).map(async (group) => {
            const groupType = (group.contentType || '').toUpperCase();
            // Lấy metadata từ group
            if (groupType === 'READING_PASSAGE' && group.passageText && !mergedPassageContent) {
              try {
                const parsed = JSON.parse(group.passageText);
                if (parsed.paragraphs) {
                  mergedPassageContent = parsed.paragraphs.map(p => {
                    return `<p>${formatTextWithWhitespace(p.text.trim())}</p>`;
                  }).join('');
                } else {
                  mergedPassageContent = formatTextWithWhitespace(group.passageText);
                }
              } catch {
                mergedPassageContent = formatTextWithWhitespace(group.passageText);
              }
            }
            if (groupType === 'READING_PASSAGE' && group.title && !mergedPassageTitle) {
              mergedPassageTitle = group.title;
            }
            if (group.instructions && !mergedInstructions) {
              mergedInstructions = formatTextWithWhitespace(group.instructions);
            }
            if (group.audioUrl && !mergedAudioUrl) {
              mergedAudioUrl = group.audioUrl;
            }
            if (group.imageUrl && !mergedImageUrl) {
              mergedImageUrl = group.imageUrl;
            }

            // Extract Writing metadata từ group.passageText JSON
            if (targetMode === 'WRITING' && group.passageText) {
              try {
                const parsed = JSON.parse(group.passageText);
                if (parsed.taskLabel) taskLabel = parsed.taskLabel;
                if (parsed.minWords) minWords = parsed.minWords;
                if (parsed.recommendedMinutes) recommendedMinutes = parsed.recommendedMinutes;
                if (parsed.taskImageSvg) taskImageSvg = parsed.taskImageSvg;
              } catch { /* plain text fallback */ }
            }

            // Transform group's questions using transformGroup()
            const transformedQuestions = await transformGroup(baseUrl, group, globalCounterRef);
            
            return {
              ...group,
              // Keep raw group data
              id: group.id,
              title: group.title,
              contentType: group.contentType,
              passageText: group.passageText,
              audioUrl: group.audioUrl,
              imageUrl: group.imageUrl,
              instructions: group.instructions,
              // Provide transformed questions
              questions: transformedQuestions,
            };
          })
        );

        // Flatten transformed questions for backward compatibility
        const flattenedQuestions = transformedGroups.flatMap(g => g.questions || []);

        const partObj = {
          id: `part-${part.testPartId || part.id}`,
          partNumber: part.orderIndex || index + 1,
          name: part.name || `Part ${part.orderIndex || index + 1}`,
          orderIndex: part.orderIndex || index + 1,
          title: part.name || `Part ${part.orderIndex || index + 1}`,
          
          // Extracted metadata
          instruction: mergedInstructions || part.instructions || (targetMode === 'WRITING' ? 'No task specified.' : 'Listen and answer questions.'),
          instructions: mergedInstructions || part.instructions,
          passageTitle: mergedPassageTitle,
          passageContent: mergedPassageContent,
          questionsLabel: mergedPassageTitle || 'Questions',
          audioUrl: mergedAudioUrl,
          imageUrl: mergedImageUrl,
          
          // Writing-specific fields
          taskLabel: targetMode === 'WRITING' ? taskLabel : undefined,
          minWords: targetMode === 'WRITING' ? minWords : undefined,
          recommendedMinutes: targetMode === 'WRITING' ? recommendedMinutes : undefined,
          taskImageSvg: targetMode === 'WRITING' ? taskImageSvg : undefined,
          
          // Preserve group structure with transformed questions
          questionGroups: transformedGroups,
          groups: transformedGroups,
          
          // Provide flattened transformed questions for compatibility
          questions: flattenedQuestions,
          
          // Source fields from backend
          durationMinutes: part.durationMinutes || null,
          totalQuestions: part.totalQuestions || 0,
        };

        return partObj;
      })
    );

    return {
      sessionId: targetSession.testSessionId,
      candidateName: 'Guest Student',
      candidateId: 'DEFAULT-ID',
      testType: testData.testType || `Academic ${targetMode.charAt(0) + targetMode.slice(1).toLowerCase()}`,
      totalMinutes: testData.durationMinutes || targetSession.durationMinutes || 60,
      parts: populatedParts,
    };
  },

  // ─── Writing test: load từ backend theo testId ───────────────────
  getWritingTestSession: async (testId) => {
    const baseUrl = API_CONFIG.BASE_URL;

    const testData = await apiFetch(`${baseUrl}/test-builder/${testId}/full`);
    const writingSession = testData.sessions.find(s => s.skillType === 'WRITING');
    if (!writingSession) throw new Error('Không tìm thấy WRITING session');

    const mappedParts = writingSession.parts.map((part, idx) => {
      const writingGroup = part.questionGroups?.find(g => g.contentType === 'WRITING_TASK') || part.questionGroups?.[0];
      let taskInstruction = part.instructions || '';
      let minWords = 150;
      let recommendedMinutes = 20;

      if (writingGroup?.passageText) {
        try {
          const parsed = JSON.parse(writingGroup.passageText);
          taskInstruction = parsed.taskInstruction || taskInstruction;
          minWords = parsed.minWords ?? minWords;
          recommendedMinutes = parsed.recommendedMinutes ?? recommendedMinutes;
        } catch { /* plain text fallback */ }
      }

      return {
        id: `part-${part.testPartId}`,
        questionGroupId: writingGroup?.questionGroupId || null,
        title: part.name || `Task ${part.orderIndex || idx + 1}`,
        taskLabel: part.name || `Writing Task ${part.orderIndex || idx + 1}`,
        minWords,
        recommendedMinutes,
        instruction: taskInstruction || 'No instructions provided.',
        imageUrl: writingGroup?.imageUrl || null,
      };
    });

    return {
      sessionId: testId,
      candidateName: 'Guest Student',
      candidateId: testData.id || testId,
      testType: testData.testType || 'Academic Writing',
      totalMinutes: writingSession.durationMinutes || 60,
      parts: mappedParts,
    };
  },

  submitAnswers: async (sessionId, answers) => {
    console.log('Submitting answers for session:', sessionId, answers);
    // TODO: kết nối với exam-attempts endpoint khi BE sẵn sàng
    return { success: true, message: 'Submitted' };
  },

  // ─── Nộp bài Writing thực sự vào CSDL ──────────────────────────
  submitWriting: async (parts, writingAnswers, timeTakenSeconds = null) => {
    const baseUrl = API_CONFIG.BASE_URL;
    const results = [];

    for (const part of parts) {
      const text = writingAnswers[part.id] || '';
      // Use questionGroupId if available (from getTestSession(WRITING))
      // Otherwise try to find it from questions if available
      let groupId = part.questionGroupId;
      if (!groupId && part.questions?.[0]?.id) {
        groupId = part.questions[0].id;
      }
      
      if (!text.trim() || !groupId) continue;

      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

      const payload = {
        questionGroupId: groupId,
        submissionText: text,
        wordCount,
        timeTakenSeconds,
      };

      const result = await apiFetch(`${baseUrl}/writing/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      results.push(result);
    }

    return results;
  },
};
