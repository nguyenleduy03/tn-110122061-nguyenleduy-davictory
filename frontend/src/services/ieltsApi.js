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
    case 'DRAG_MATCHING':
      return 'drag_drop_group';
    case 'MATCHING':
      return 'drag_drop_group';
    case 'MATCHING_HEADINGS':
      return 'matching_heading';
    case 'MCQ_DROPDOWN':
      return 'mcq_dropdown_group';
    // Biến thể: Matching → Fill-in
    case 'MATCHING_FILLABLE':
      return 'fill-in-the-blank';
    case 'MATCHING_HEADINGS_FILLABLE':
      return 'fill-in-the-blank';
    // Biến thể: Fill-in → Drag-drop
    case 'FILL_BLANK_DRAG':
      return 'drag_drop_group';
    case 'SENTENCE_COMPLETION_DRAG':
      return 'drag_drop_group';
    case 'SUMMARY_COMPLETION_DRAG':
      return 'drag_drop_group';
    case 'NOTE_COMPLETION_DRAG':
      return 'drag_drop_group';
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
  } else if (contentType === 'MATCHING_HEADING' || contentType === 'MATCHING_HEADINGS' || contentType === 'MATCHING_PARA') {
    feType = 'matching_heading';
  } else if (contentType === 'DRAG_MATCHING') {
    feType = 'drag_drop_group';
  } else if (contentType === 'MATCHING' || contentType === 'MATCHING_INFO') {
    feType = 'matching_info';
  } else if (contentType === 'MATCHING_FEATURES') {
    feType = 'matching_features';
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
  } else if (contentType === 'SHARED_OPTIONS_DROPDOWN') {
    feType = 'mcq_dropdown_group';
  } else if (contentType === 'SPEAKING_CUECARD' || contentType === 'SPEAKING_INTERVIEW') {
    // SPEAKING: keep raw question data for custom rendering
    // Return questions as-is with additional metadata from group
    return questions.map((q) => {
      const num = globalCounterRef.counter++;
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

  // ─── SHARED_OPTIONS_DROPDOWN → 1 khối, bảng chữ chung + dropdown từng câu ───
  if (feType === 'mcq_dropdown_group') {
    let meta = { sharedOptions: [], mainInstruction: '', subInstruction: '' };
    if (group.passageText) {
      try {
        meta = { ...meta, ...JSON.parse(group.passageText) };
      } catch {
        /* plain text legacy */
      }
    }
    const sharedOptions = (meta.sharedOptions || []).map((o, i) => {
      if (typeof o === 'string') return { key: String.fromCharCode(65 + i), label: o };
      const key = (o.key || o.optionLabel || String.fromCharCode(65 + i)).toString().trim().charAt(0);
      const label = o.label ?? o.optionText ?? '';
      return { key: key || String.fromCharCode(65 + i), label };
    });

    const subQuestions = questions.map((q) => {
      const num = globalCounterRef.counter++;
      const letter = ((q.answers || [])[0]?.answerText || '').trim();
      return {
        id: `q${q.id}`,
        number: num,
        text: formatTextWithWhitespace(q.questionText || ''),
        correctOptionKey: letter,
      };
    });

    const numbers = subQuestions.map((sq) => sq.number).filter((n) => Number.isFinite(n));
    const minNum = numbers.length ? Math.min(...numbers) : null;
    const maxNum = numbers.length ? Math.max(...numbers) : null;
    const rangeHeading = (minNum != null && maxNum != null)
      ? (minNum === maxNum ? `Question ${minNum}` : `Questions ${minNum}–${maxNum}`)
      : '';

    const headingHtml = formatTextWithWhitespace(group.title || '');
    const mainInst = formatTextWithWhitespace(meta.mainInstruction || '');
    const subInst = formatTextWithWhitespace(meta.subInstruction || '');

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'mcq_dropdown_group',
      questionTypeCode: typeCode || 'MCQ_DROPDOWN',
      heading: headingHtml || rangeHeading,
      mainInstruction: mainInst,
      subInstruction: subInst,
      instruction: [mainInst, subInst].filter(Boolean).join('<br/><br/>'),
      sharedOptions,
      subQuestions,
    }];
  }

  // ─── Single-question types: mỗi câu → 1 phần tử ─────────────────
  if (['multiple-choice', 'tfng', 'ynng', 'fill-in-the-blank'].includes(feType)) {
    return questions.map((q) => {
      const correctOpts = (q.options || []).filter(o => o.isCorrect);
      const isMultiSelect = feType === 'multiple-choice' && correctOpts.length > 1;
      const selectCount = isMultiSelect ? correctOpts.length : 0;

      const num = globalCounterRef.counter;
      let numberRange = null;
      if (isMultiSelect) {
        numberRange = Array.from({ length: selectCount }, (_, i) => num + i);
        globalCounterRef.counter += selectCount;
      } else {
        globalCounterRef.counter += 1;
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
    let tableTitle = group.title || '';
    let columns = [];
    let tableRows = [];

    if (group.passageText) {
      try {
        const parsed = JSON.parse(group.passageText);
        tableTitle = parsed.tableTitle || tableTitle;
        columns = Array.isArray(parsed.columns) ? parsed.columns : [];
        tableRows = Array.isArray(parsed.tableRows) ? parsed.tableRows : [];
      } catch {
        // keep fallback values when passageText is plain text or invalid JSON
      }
    }

    const subQuestions = questions.map((q) => {
      const num = globalCounterRef.counter++;
      const correctAnswer = (q.answers || [])[0]?.answerText || '';
      return { id: `q${q.id}`, number: num, text: q.questionText || '', correctAnswer };
    });

    const numbers = subQuestions.map((sq) => sq.number).filter((n) => Number.isFinite(n));
    const minNum = numbers.length ? Math.min(...numbers) : null;
    const maxNum = numbers.length ? Math.max(...numbers) : null;
    const heading = (minNum !== null && maxNum !== null)
      ? (minNum === maxNum ? `Question ${minNum}` : `Questions ${minNum}-${maxNum}`)
      : '';

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'table-completion',
      questionTypeCode: typeCode,
      heading,
      instruction: group.instructions || 'Complete the table. Write ONE WORD ONLY for each answer.',
      title: group.title || '',
      tableTitle,
      columns,
      tableRows,
      subQuestions,
    }];
  }

  // ─── NOTE_COMPLETION → 1 group question ────────────────────────────
  if (feType === 'note-completion') {
    const noteText = group.passageText || group.title || '';

    const blankCount = (noteText.match(/\[blank\]/gi) || []).length;
    const totalBlanks = Math.max(blankCount, questions.length);
    const subQuestions = Array.from({ length: totalBlanks }, (_, idx) => {
      const q = questions[idx] || null;
      const num = globalCounterRef.counter++;
      const correctAnswer = q ? ((q.answers || [])[0]?.answerText || '') : '';
      const id = q ? `q${q.id}` : `tmp-note-${group.questionGroupId || group.id}-${idx + 1}`;
      return { id, number: num, correctAnswer };
    });

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'note-completion',
      questionTypeCode: typeCode,
      title: group.title || '',
      instruction: group.instructions || '',
      text: noteText,
      subQuestions,
    }];
  }

  // ─── SUMMARY_COMPLETION → 1 group question ────────────────────────────
  if (feType === 'summary-completion') {
    const summaryText = group.passageText || group.title || '';

    const blankCount = (summaryText.match(/\[blank\]/gi) || []).length;
    const totalBlanks = Math.max(blankCount, questions.length);
    const subQuestions = Array.from({ length: totalBlanks }, (_, idx) => {
      const q = questions[idx] || null;
      const num = globalCounterRef.counter++;
      const correctAnswer = q ? ((q.answers || [])[0]?.answerText || '') : '';
      const id = q ? `q${q.id}` : `tmp-summary-${group.questionGroupId || group.id}-${idx + 1}`;
      return { id, number: num, correctAnswer };
    });

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'summary-completion',
      questionTypeCode: typeCode,
      title: group.title || '',
      instruction: group.instructions || '',
      text: summaryText,
      subQuestions,
    }];
  }

  // ─── FLOW_CHART → 1 group question ───────────────────────────────
  if (feType === 'flow_chart') {
    const subQuestions = questions.map((q) => {
      const num = globalCounterRef.counter++;
      const correctAnswer = (q.answers || [])[0]?.answerText || '';
      return { id: `q${q.id}`, number: num, correctAnswer };
    });

    let flowNodes = [];
    let flowTitle = group.title || '';
    let flowInstruction = 'Complete the flow-chart. Choose the correct answer and move it into the gap.';
    let bankTitle = '';
    let bankOptions = [];
    if (group.passageText) {
      try {
        const parsed = JSON.parse(group.passageText);
        if (Array.isArray(parsed)) {
          flowNodes = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.flowNodes)) {
            flowNodes = parsed.flowNodes;
          }
          if (parsed.title) {
            flowTitle = parsed.title;
          }
          if (parsed.instructions) {
            flowInstruction = parsed.instructions;
          }
          if (parsed.bankTitle) {
            bankTitle = parsed.bankTitle;
          }
          if (Array.isArray(parsed.optionBank)) {
            bankOptions = parsed.optionBank.map((item) => {
              if (typeof item === 'string') return item;
              return item?.text || item?.label || item?.value || '';
            }).filter(Boolean);
          }
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

    if (bankOptions.length === 0) {
      bankOptions = (questions[0]?.options || []).map(o => o.optionText || o.optionLabel).filter(Boolean);
    }

    const numbers = subQuestions.map((sq) => sq.number).filter((n) => Number.isFinite(n));
    const minNum = numbers.length ? Math.min(...numbers) : null;
    const maxNum = numbers.length ? Math.max(...numbers) : null;
    const heading = (minNum !== null && maxNum !== null)
      ? (minNum === maxNum ? `Question ${minNum}` : `Questions ${minNum}-${maxNum}`)
      : '';

    const isGenericGroupTitle = (value) => /^\s*(nh[oó]m|group)\s*\d*\s*$/i.test(String(value || ''));
    if (isGenericGroupTitle(flowTitle)) {
      flowTitle = '';
    }

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'flow_chart',
      questionTypeCode: typeCode,
      heading,
      instruction: flowInstruction,
      title: flowTitle,
      bankTitle,
      bankOptions,
      flowNodes,
      subQuestions,
    }];
  }

  // ─── MAP_DIAGRAM / IMAGE_DRAG_DROP → 1 group question ────────────
  if (feType === 'image-drag-drop') {
    let parsedMapMeta = {};
    if (group.passageText) {
      try {
        parsedMapMeta = JSON.parse(group.passageText);
      } catch {
        parsedMapMeta = {};
      }
    }

    const subQuestions = questions.map((q) => {
      const num = globalCounterRef.counter++;
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

    const fallbackOptions = (questions[0]?.options || []).map(o => o.optionText || o.optionLabel).filter(Boolean);
    const mapMetaOptions = (parsedMapMeta.optionBank || []).map((o) => {
      if (typeof o === 'string') return o;
      return o?.text || '';
    }).filter(Boolean);
    const bankOptions = mapMetaOptions.length > 0 ? mapMetaOptions : fallbackOptions;
    const numbers = subQuestions.map((sq) => sq.number).filter((n) => Number.isFinite(n));
    const minNum = numbers.length ? Math.min(...numbers) : null;
    const maxNum = numbers.length ? Math.max(...numbers) : null;
    const heading = (minNum !== null && maxNum !== null)
      ? (minNum === maxNum ? `Question ${minNum}` : `Questions ${minNum}\u2013${maxNum}`)
      : '';
    const instruction = parsedMapMeta.instructions || group.instructions || group.title || '';

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'image-drag-drop',
      questionTypeCode: typeCode,
      heading,
      instruction,
      rightTitle: parsedMapMeta.rightTitle || '',
      imageUrl: group.imageUrl || null,
      imageWidth: parsedMapMeta.imageWidth ?? 100,
      pinBoxWidth: parsedMapMeta.pinBoxWidth ?? 60,
      constrainHalfPage: Boolean(parsedMapMeta.constrainHalfPage),
      bankOptions,
      subQuestions,
    }];
  }

  // ─── MATCHING / MATCHING_HEADINGS → cần matchingPairs ────────────
  if (feType === 'matching_info' || feType === 'matching_heading' || feType === 'drag_drop_group') {
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
      const num = globalCounterRef.counter++;

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

  // ─── MATCHING_FEATURES → 1 group question ─────────────────────────────
  if (feType === 'matching_features') {
    let categories = [];
    let categoryTitle = '';
    if (group.passageText) {
      try {
        const parsed = JSON.parse(group.passageText);
        categories = Array.isArray(parsed.categories) ? parsed.categories : [];
        categoryTitle = parsed.categoryTitle || '';
      } catch {
        categories = [];
      }
    }

    const subQuestions = questions.map((q) => {
      const num = globalCounterRef.counter++;
      const correctAnswer = (q.answers || [])[0]?.answerText
        || (q.options || []).find(o => o.isCorrect)?.optionText
        || '';
      return {
        id: `q${q.id}`,
        number: num,
        text: q.questionText || q.blankContext || '',
        correctAnswer,
      };
    });

    const numbers = subQuestions.map((sq) => sq.number).filter((n) => Number.isFinite(n));
    const minNum = numbers.length ? Math.min(...numbers) : null;
    const maxNum = numbers.length ? Math.max(...numbers) : null;
    const heading = (minNum !== null && maxNum !== null)
      ? (minNum === maxNum ? `Question ${minNum}` : `Questions ${minNum}–${maxNum}`)
      : '';

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'matching_features',
      questionTypeCode: typeCode,
      heading,
      instruction: group.instructions || `Choose the correct group (${categories.map(c => c.label).join('–') || 'A–E'}) for each item. You may choose any group more than once.`,
      categoryTitle,
      categories,
      subQuestions,
    }];
  }

  // Fallback: đối xử như fill-in-the-blank
  return questions.map((q) => {
    const num = globalCounterRef.counter++;
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
      const transformedGroups = [];
      for (const group of (part.questionGroups || [])) {
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

        transformedGroups.push({
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
        });
      }

      // Flatten transformed questions for backward compatibility
      const flattenedQuestions = transformedGroups.flatMap(g => g.questions || []);

      // --- NEW: Inject Heading Gaps for Matching Heading questions ---
      // Find the group containing matching_heading questions
      const mhGroupFound = transformedGroups.find(g =>
        g.questions && g.questions.some(q => q.type === 'matching_heading')
      );

      // Find the group containing the passage - specifically look for READING_PASSAGE or paragraphs JSON
      let sourceParagraphs = [];
      const passageGroup = transformedGroups.find(g => {
        if (!g.passageText) return false;
        try {
          const parsed = JSON.parse(g.passageText);
          if (parsed.paragraphs && Array.isArray(parsed.paragraphs)) {
            sourceParagraphs = parsed.paragraphs;
            return true;
          }
        } catch (e) {
          // If it's not JSON, it might be a plain string passage
          if (typeof g.passageText === 'string' && g.passageText.length > 100) {
            return true;
          }
        }
        return (g.contentType || '').toUpperCase() === 'READING_PASSAGE';
      });

      if (mhGroupFound && (sourceParagraphs.length > 0 || (passageGroup && passageGroup.passageText))) {
        console.log('[ieltsApi] Matching Heading injection candidate found.');
        try {
          let paragraphs = sourceParagraphs;
          if (paragraphs.length === 0 && passageGroup?.passageText) {
            const text = passageGroup.passageText.trim();
            // Split by double newlines or single newlines if they look like paragraph breaks
            paragraphs = text.split(/\r?\n\s*\r?\n/).map(t => ({ text: t.trim() }));
          }

          if (paragraphs.length > 0) {
            const mhGroup = (mhGroupFound.questions || []).find(q => q.type === 'matching_heading');
            const mhSubQs = mhGroup?.subQuestions || [];

            // More robust extraction of starting question number
            let startPartNum = 1;
            if (flattenedQuestions && flattenedQuestions.length > 0) {
              const firstQ = flattenedQuestions[0];
              startPartNum = firstQ.number ||
                (firstQ.subQuestions && firstQ.subQuestions[0]?.number) ||
                1;
            }

            console.log(`[ieltsApi] Injecting into ${paragraphs.length} paragraphs. Matching against ${mhSubQs.length} sub-questions.`);

            const stripHtml = (html) => (html || '').replace(/<[^>]*>?/gm, '').trim().toLowerCase();
            const getCoreLabel = (l) => {
              let s = stripHtml(l).replace(/^(paragraph|section|đoạn|phần|đoạn văn|section nº)\s+/i, '');
              return s.replace(/[:.]$/, '').trim();
            };

            mergedPassageContent = paragraphs.map((p, pIdx) => {
              const rawLabel = p.label || String.fromCharCode(65 + pIdx);
              const coreLabel = getCoreLabel(rawLabel);
              const posNum = startPartNum + pIdx;

              // Tiered matching
              const matchedQ = mhSubQs.find(sq => {
                const qText = stripHtml(sq.text);
                const qCore = getCoreLabel(qText);
                return qCore === coreLabel ||
                  sq.number === posNum ||
                  (qCore && coreLabel && (qCore.includes(coreLabel) || coreLabel.includes(qCore)));
              });

              // Add unique ID and &nbsp; to ensure span is not collapsed or ignored
              const gapHtml = matchedQ ? `<div class="heading-gap" id="gap-${matchedQ.number}" data-id="${matchedQ.id}" data-number="${matchedQ.number}">&nbsp;</div>` : '';
              return `${gapHtml}<p>${formatTextWithWhitespace(p.text || p.content || p)}</p>`;
            }).join('');

            const gapCount = (mergedPassageContent.match(/class="heading-gap"/g) || []).length;
            console.log(`[ieltsApi] Injection result: ${gapCount} gaps injected into passage.`);
          }
        } catch (e) {
          console.error('[ieltsApi] Heading gap injection failed:', e);
        }
      }

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
      testSessionId: targetSession.testSessionId,
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

  submitAnswers: async (testId, skillType, answers, timeSpentSeconds = null) => {
    const baseUrl = API_CONFIG.BASE_URL;

    const normalizeQuestionId = (rawId) => {
      if (rawId == null) return null;
      const str = String(rawId);
      if (str.startsWith('q')) return Number(str.slice(1));
      const num = Number(str);
      return Number.isFinite(num) ? num : null;
    };

    const answerPayloads = Object.entries(answers || {}).map(([qid, value]) => {
      const questionId = normalizeQuestionId(qid);
      if (!questionId) return null;

      let textAnswer = null;
      let selectedOptionLabel = null;
      let matchingAnswer = null;

      if (Array.isArray(value)) {
        matchingAnswer = JSON.stringify(value);
      } else if (value && typeof value === 'object') {
        matchingAnswer = JSON.stringify(value);
      } else if (typeof value === 'string') {
        textAnswer = value;
        selectedOptionLabel = value;
      }

      return {
        questionId,
        textAnswer,
        selectedOptionLabel,
        matchingAnswer,
      };
    }).filter(Boolean);

    const startResp = await apiFetch(`${baseUrl}/exam-attempts/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId, skillType, timeLimitSeconds: null }),
    });

    const submitResp = await apiFetch(`${baseUrl}/exam-attempts/${startResp.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeSpentSeconds, answers: answerPayloads }),
    });

    return submitResp;
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
