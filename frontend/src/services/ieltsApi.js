import { API_CONFIG } from '../config/api';
import { formatTextWithWhitespace, stripInlineStyles } from '../utils/textFormatters';
import { normalizeImageNoteFormQuestions } from '../utils/imageNoteForm';

// ─── Helper: auth headers ───────────────────────────────────────────
function authHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ─── Helper: check if user is authenticated ─────────────────────────
function isAuthenticated() {
  return !!localStorage.getItem('authToken');
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
    throw new Error(body.message || body.error || `HTTP ${res.status}: ${url}`);
  }
  return res.json();
}

// ─── Helper: fetch without auth (for guest) ─────────────────────────
async function guestFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `HTTP ${res.status}: ${url}`);
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
    case 'SUMMARY_COMPLETION_SELECT':
      return 'summary-completion-select';
    case 'FLOW_CHART':
      return 'flow_chart';
    case 'FLOW_CHART_TEXT':
      return 'flow_chart_text';
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
      return 'matching_fillable';
    case 'MATCHING_HEADINGS_FILLABLE':
      return 'matching_fillable';
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

function resolveImageWidthPercent(value, fallback = 100) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace('%', '').trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function resolvePinBoxWidthPx(value, fallback = 120) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace('px', '').trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function resolvePinPercent(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace('%', '').trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function countCompletionBlankTokens(text = '') {
  const value = String(text || '');
  if (!value) return 0;

  const tokenMatches = value.match(/\[\s*(?:blank|\d+)\s*\]|\(ô trống\)/gi) || [];
  const richBlankMatches = value.match(/data-blank=["']true["']/gi) || [];

  return Math.max(tokenMatches.length, richBlankMatches.length);
}

function resolveDbQuestionNumber(question) {
  const parsed = Number(question?.questionNumber ?? question?.number ?? null);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseAlternativeAnswers(rawValue) {
  if (!rawValue) return [];

  if (Array.isArray(rawValue)) {
    return rawValue
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  const normalized = String(rawValue || '').trim();
  if (!normalized) return [];

  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    try {
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || '').trim())
          .filter(Boolean);
      }
    } catch {
      // Keep fallback parsing below for legacy non-JSON values.
    }
  }

  return normalized
    .split(/\r?\n|\|/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function collectAcceptedAnswers(answerItems = []) {
  const seen = new Set();
  const accepted = [];

  for (const item of (answerItems || [])) {
    const candidates = [];

    if (item?.answerText) {
      candidates.push(String(item.answerText).trim());
    }

    const alternatives = parseAlternativeAnswers(item?.alternativeAnswers);
    for (const alt of alternatives) {
      candidates.push(alt);
    }

    for (const candidate of candidates) {
      const value = String(candidate || '').trim();
      if (!value) continue;

      const key = value.toLowerCase();
      if (seen.has(key)) continue;

      seen.add(key);
      accepted.push(value);
    }
  }

  return accepted;
}

// ─── Transform 1 question group từ BE → FE question(s) ──────────────
// Priority: check group.contentType FIRST, then fallback to questionTypeCode
async function transformGroup(baseUrl, group) {
  const questions = group.questions || [];
  const contentType = (group.contentType || '').toUpperCase();
  const normalizedImageNoteGroup = contentType === 'IMAGE_NOTE_FORM'
    ? normalizeImageNoteFormQuestions({ ...group, questions })
    : null;
  const effectiveQuestions = normalizedImageNoteGroup?.questions || questions;

  // ─── Determine FE type từ contentType hoặc questionTypeCode ─────────
  let feType = null;
  let typeCode = null;

  // Map contentType directly to FE type (higher priority)
  if (contentType === 'SUMMARY_COMPLETION') {
    feType = 'summary-completion';
  } else if (contentType === 'SUMMARY_COMPLETION_SELECT') {
    feType = 'summary-completion-select';
  } else if (contentType === 'IMAGE_NOTE_FORM') {
    feType = 'note-completion';
  } else if (contentType === 'FLOW_CHART') {
    feType = 'flow_chart';
  } else if (contentType === 'FLOW_CHART_TEXT') {
    feType = 'flow_chart_text';
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
  } else if (contentType === 'FILL_BLANK_DRAG' || contentType === 'SENTENCE_COMPLETION_DRAG' || contentType === 'SUMMARY_COMPLETION_DRAG' || contentType === 'NOTE_COMPLETION_DRAG') {
    feType = 'drag_drop_group';
  } else if (contentType === 'MATCHING' || contentType === 'MATCHING_INFO') {
    feType = 'matching_info';
  } else if (contentType === 'MATCHING_FEATURES') {
    feType = 'matching_features';
  } else if (contentType === 'MATCHING_FILLABLE' || contentType === 'MATCHING_HEADINGS_FILLABLE') {
    feType = 'matching_fillable';
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
    feType = 'short-answer-group';
  } else if (contentType === 'SHARED_OPTIONS_DROPDOWN') {
    feType = 'mcq_dropdown_group';
  } else if (contentType === 'SPEAKING_CUECARD' || contentType === 'SPEAKING_INTERVIEW' || contentType === 'SPEAKING_DISCUSSION') {
    // SPEAKING: Parse passageText JSON for group-level data
    let groupData = {};
    if (group.passageText) {
      try {
        groupData = JSON.parse(group.passageText);
      } catch {
        /* ignore parse error */
      }
    }

    return questions.map((q) => {
      const num = resolveDbQuestionNumber(q);

      if (contentType === 'SPEAKING_CUECARD') {
        // Clean bulletPoints: remove empty strings and extract text from HTML lists
        const rawBullets = groupData.bulletPoints || [];
        const cleanedBullets = rawBullets
          .filter(bp => bp && bp.trim())
          .map(bp => {
            // If bullet contains <ul><li>, extract just the <li> content
            if (bp.includes('<ul>') || bp.includes('<li>')) {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = bp;
              const listItems = tempDiv.querySelectorAll('li');
              return Array.from(listItems).map(li => li.innerHTML);
            }
            return bp;
          })
          .flat()
          .filter(bp => bp && bp.trim());

        return {
          id: `q${q.id}`,
          number: num,
          type: 'speaking',
          questionTypeCode: contentType,
          partInstruction: formatTextWithWhitespace(groupData.partInstruction || ''),
          topic: formatTextWithWhitespace(groupData.topic || q.topic || q.blankContext || ''),
          shouldSayLabel: formatTextWithWhitespace(groupData.shouldSayLabel || 'You should say:'),
          bulletPoints: cleanedBullets.map(bp => formatTextWithWhitespace(bp)),
          closingSentence: formatTextWithWhitespace(groupData.closingSentence || ''),
          prepSeconds: groupData.prepSeconds ?? 60,
          speakingSeconds: groupData.speakingSeconds ?? 120,
          text: formatTextWithWhitespace(q.questionText || ''),
        };
      }

      if (contentType === 'SPEAKING_INTERVIEW' || contentType === 'SPEAKING_DISCUSSION') {
        // Filter out questions with empty questionText
        if (!q.questionText || !q.questionText.trim()) {
          return null;
        }

        return {
          id: `q${q.id}`,
          number: num,
          type: 'speaking',
          questionTypeCode: contentType,
          partInstruction: formatTextWithWhitespace(groupData.partInstruction || ''),
          interviewType: groupData.interviewType || 'PART1',
          classification: groupData.classification || 'GENERAL',
          text: formatTextWithWhitespace(q.questionText || q.blankContext || ''),
          topic: formatTextWithWhitespace(q.topic || ''),
        };
      }

      return {
        id: `q${q.id}`,
        number: num,
        type: 'speaking',
        text: formatTextWithWhitespace(q.questionText || ''),
      };
    }).filter(Boolean); // Remove null entries
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

    console.log('[transformGroup] mcq_dropdown_group data:', {
      groupId: group.questionGroupId || group.id,
      rawPassageText: group.passageText?.substring(0, 200),
      parsedMeta: meta,
      metaSharedOptionsCount: meta.sharedOptions?.length || 0
    });

    const sharedOptions = (meta.sharedOptions || []).map((o, i) => {
      if (typeof o === 'string') return { key: String.fromCharCode(65 + i), label: o, imageUrl: '' };
      const key = (o.key || o.optionLabel || String.fromCharCode(65 + i)).toString().trim().charAt(0);
      const label = o.label ?? o.optionText ?? '';
      const imageUrl = o.imageUrl ?? '';
      return { key: key || String.fromCharCode(65 + i), label, imageUrl };
    });

    const subQuestions = questions.map((q) => {
      const num = resolveDbQuestionNumber(q);
      const letter = ((q.answers || [])[0]?.answerText || '').trim();
      return {
        id: `q${q.id}`,
        number: num,
        text: formatTextWithWhitespace(q.questionText || ''),
        correctOptionKey: letter,
      };
    });

    const headingHtml = formatTextWithWhitespace(group.title || '');
    const mainInst = formatTextWithWhitespace(meta.mainInstruction || '');
    const subInst = formatTextWithWhitespace(meta.subInstruction || '');
    const optionsTableTitleHtml = formatTextWithWhitespace(meta.optionsTableTitle || '');
    const questionTitleHtml = formatTextWithWhitespace(meta.questionTitle || '');

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'mcq_dropdown_group',
      questionTypeCode: typeCode || 'MCQ_DROPDOWN',
      heading: headingHtml,
      mainInstruction: mainInst,
      subInstruction: subInst,
      instruction: [mainInst, subInst].filter(Boolean).join('<br/><br/>'),
      optionsTableTitle: optionsTableTitleHtml,
      questionTitle: questionTitleHtml,
      imageUrl: group.imageUrl || '',
      imageWidth: resolveImageWidthPercent(group.imageWidth),
      hideOptionsTable: meta.hideOptionsTable || false,
      sharedOptions,
      subQuestions,
    }];
  }

  // ─── SHORT_ANSWER_GROUP → flatten theo blankIndex / sample row ─────────
  if (feType === 'short-answer-group') {
    const orderedQuestions = [...questions].sort((a, b) => Number(a?.orderIndex || 0) - Number(b?.orderIndex || 0));

    const subQuestions = [];

    orderedQuestions.forEach((question, questionIdx) => {
      const rawAnswers = Array.isArray(question?.answers) ? [...question.answers] : [];
      const orderedAnswers = rawAnswers.sort((a, b) => {
        const aIndex = Number(a?.blankIndex || 0);
        const bIndex = Number(b?.blankIndex || 0);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return Number(a?.id || 0) - Number(b?.id || 0);
      });

      const placeholderCount = Math.max(
        Number(question?.questionCount || 0) || 0,
        orderedAnswers.length,
        1,
      );

      const usedBlankIndices = new Set();

      orderedAnswers.forEach((ans, answerIdx) => {
        const blankIndex = Number.isFinite(Number(ans?.blankIndex)) && Number(ans?.blankIndex) > 0
          ? Number(ans.blankIndex)
          : (answerIdx + 1);
        usedBlankIndices.add(blankIndex);

        subQuestions.push({
          id: `q${question.id}_b${blankIndex}_${answerIdx}`,
          questionId: question.id,
          number: blankIndex,
          blankIndex,
          rowIndex: answerIdx,
          isSample: Boolean(ans?.isSample),
          text: formatTextWithWhitespace(question?.questionText || question?.blankContext || ''),
          answerText: ans?.answerText || '',
          alternativeAnswers: ans?.alternativeAnswers || null,
          wordLimit: ans?.wordLimit || null,
          isCaseSensitive: Boolean(ans?.isCaseSensitive),
          questionOrderIndex: questionIdx,
        });
      });

      for (let i = 1; subQuestions.filter((row) => row.questionId === question.id).length < placeholderCount; i += 1) {
        if (usedBlankIndices.has(i)) continue;
        usedBlankIndices.add(i);
        subQuestions.push({
          id: `q${question.id}_b${i}_placeholder`,
          questionId: question.id,
          number: i,
          blankIndex: i,
          rowIndex: orderedAnswers.length + subQuestions.filter((row) => row.questionId === question.id).length,
          isSample: false,
          text: formatTextWithWhitespace(question?.questionText || question?.blankContext || ''),
          answerText: '',
          alternativeAnswers: null,
          wordLimit: null,
          isCaseSensitive: false,
          questionOrderIndex: questionIdx,
        });
      }
    });

    const orderedRows = subQuestions.sort((a, b) => {
      if (a.questionOrderIndex !== b.questionOrderIndex) {
        return a.questionOrderIndex - b.questionOrderIndex;
      }
      if (a.blankIndex !== b.blankIndex) {
        return a.blankIndex - b.blankIndex;
      }
      if (a.isSample !== b.isSample) {
        return a.isSample ? 1 : -1;
      }
      return a.rowIndex - b.rowIndex;
    });

    const rowsWithDisplayNumbers = [];
    const rangeStart = Number(group?.fromQuestion ?? group?.questionFrom ?? null);
    const firstQuestionNumber = resolveDbQuestionNumber(orderedQuestions[0]);
    const hasRangeStart = Number.isFinite(rangeStart) && rangeStart > 0;
    const hasFirstQuestionNumber = Number.isFinite(firstQuestionNumber) && firstQuestionNumber > 0;

    let runningDisplayNumber = hasRangeStart
      ? rangeStart
      : (hasFirstQuestionNumber ? firstQuestionNumber : 1);

    orderedRows.forEach((row) => {
      if (row.isSample) {
        rowsWithDisplayNumbers.push({
          ...row,
          displayNumber: null,
          number: null,
        });
        return;
      }

      const displayNumber = runningDisplayNumber;
      runningDisplayNumber += 1;

      rowsWithDisplayNumbers.push({
        ...row,
        displayNumber,
        number: displayNumber,
      });
    });

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'short-answer-group',
      questionTypeCode: typeCode || 'SHORT_ANSWER',
      title: formatTextWithWhitespace(group.title || ''),
      groupInstruction: formatTextWithWhitespace(group.instructions || ''),
      subQuestions: rowsWithDisplayNumbers,
      validationOptions: group.validationOptions || null,
    }];
  }

  // ─── Single-question types: mỗi câu → 1 phần tử ─────────────────
  if (['multiple-choice', 'tfng', 'ynng', 'fill-in-the-blank'].includes(feType)) {
    return questions.map((q) => {
      const correctOpts = (q.options || []).filter(o => o.isCorrect);
      const isMultiSelect = feType === 'multiple-choice' && correctOpts.length > 1;
      const selectCount = isMultiSelect ? correctOpts.length : 0;

      const num = resolveDbQuestionNumber(q);
      const rawQuestionCount = Number(q?.questionCount);
      const questionCount = Number.isFinite(rawQuestionCount) && rawQuestionCount > 0
        ? Math.floor(rawQuestionCount)
        : (isMultiSelect ? Math.max(1, selectCount) : 1);
      let numberRange = null;
      if (questionCount > 1 && num != null) {
        numberRange = Array.from({ length: questionCount }, (_, i) => num + i);
      }

      let optionsList = [];
      if (feType === 'multiple-choice') {
        optionsList = (q.options || []).map((o, idx) => {
          const optionLabel = String(o?.optionLabel || String.fromCharCode(65 + idx));
          const optionText = String(o?.optionText || '');
          const imageUrl = String(o?.imageUrl || '').trim();
          const plainOptionText = optionText
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .trim();

          return {
            optionLabel,
            optionText,
            imageUrl,
            optionMode: imageUrl && !plainOptionText ? 'image' : 'text',
            value: optionText || optionLabel,
          };
        });
      } else {
        optionsList = (q.options || []).length > 0
          ? q.options.map(o => o.optionText || o.optionLabel || '')
          : (feType === 'tfng' ? ['TRUE', 'FALSE', 'NOT GIVEN']
            : feType === 'ynng' ? ['YES', 'NO', 'NOT GIVEN']
              : []);
      }

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
        groupInstruction: formatTextWithWhitespace(group.instructions || ''),
      };
    });
  }

  // ─── TABLE_COMPLETION → 1 group question ────────────────────────────
  if (feType === 'table-completion') {
    let tableTitle = '';
    let columns = [];
    let tableRows = [];

    if (group.passageText) {
      try {
        const parsed = JSON.parse(group.passageText);
        tableTitle = parsed.tableTitle || '';
        columns = Array.isArray(parsed.columns) ? parsed.columns : [];
        tableRows = Array.isArray(parsed.tableRows) ? parsed.tableRows : [];
      } catch {
        // keep fallback values when passageText is plain text or invalid JSON
      }
    }

    const subQuestions = questions.map((q) => {
      const num = resolveDbQuestionNumber(q);
      const correctAnswer = (q.answers || [])[0]?.answerText || '';
      return { id: `q${q.id}`, number: num, text: q.questionText || '', correctAnswer };
    });

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'table-completion',
      questionTypeCode: typeCode,
      title: group.title || '',
      tableTitle,
      columns,
      tableRows,
      subQuestions,
      instructions: formatTextWithWhitespace(group.instructions || ''),
      groupInstruction: formatTextWithWhitespace(group.instructions || ''),
      validationOptions: group.validationOptions || null,
    }];
  }

  // ─── NOTE_COMPLETION → 1 group question ────────────────────────────
  if (feType === 'note-completion') {
    const orderedQuestions = [...effectiveQuestions].sort((a, b) => Number(a?.questionNumber || 0) - Number(b?.questionNumber || 0));
    let imageUrl = group.imageUrl || null;
    let imageWidth = resolveImageWidthPercent(group.imageWidth);
    const instructions = formatTextWithWhitespace(group.instructions || '');
    let noteText = group.passageText || group.title || '';
    let imagePosition = null;
    let topNoteText = '';
    let bottomNoteText = '';
    let pinBoxWidth = resolvePinBoxWidthPx(group.pinBoxWidth, 120);
    const imageNotePinCoordinateMap = new Map();
    const baseQuestionNumber = Number.isFinite(Number(group.fromQuestion)) ? Number(group.fromQuestion) : null;
    const questionNumbers = orderedQuestions
      .map((q) => Number(q?.questionNumber ?? q?.number))
      .filter((value) => Number.isFinite(value));
    const shouldOffsetByBase = baseQuestionNumber != null
      && questionNumbers.length > 0
      && Math.min(...questionNumbers) < baseQuestionNumber;

    const resolveDisplayNumber = (question, idx) => {
      const directNumber = resolveDbQuestionNumber(question);
      if (Number.isFinite(directNumber) && !shouldOffsetByBase) {
        return directNumber;
      }

      if (baseQuestionNumber != null) {
        return baseQuestionNumber + idx;
      }

      if (Number.isFinite(directNumber)) {
        return directNumber;
      }

      return idx + 1;
    };

    if (contentType === 'IMAGE_NOTE_FORM' && group.passageText) {
      try {
        const parsed = JSON.parse(group.passageText);
        const fallbackTopText = parsed.imagePosition === 'bottom' ? '' : (parsed.noteText || '');
        const fallbackBottomText = parsed.imagePosition === 'bottom' ? (parsed.noteText || '') : '';
        topNoteText = parsed.topNoteText ?? fallbackTopText;
        bottomNoteText = parsed.bottomNoteText ?? fallbackBottomText;
        imagePosition = parsed.imagePosition || 'top';
        imageWidth = resolveImageWidthPercent(parsed.imageWidth, imageWidth);
        pinBoxWidth = resolvePinBoxWidthPx(parsed.pinBoxWidth, pinBoxWidth);

        if (Array.isArray(parsed.pinCoordinates)) {
          parsed.pinCoordinates.forEach((entry) => {
            const questionNumber = Number(entry?.questionNumber);
            const pinX = resolvePinPercent(entry?.pinX);
            const pinY = resolvePinPercent(entry?.pinY);

            if (!Number.isFinite(questionNumber) || pinX === null || pinY === null) return;
            imageNotePinCoordinateMap.set(questionNumber, { pinX, pinY });
          });
        }

        const imageHtml = imageUrl
          ? `<div class="image-note-form-image" style="margin: 16px auto; text-align: center;"><img src="${imageUrl}" alt="Question diagram" style="max-width: ${imageWidth}%; height: auto; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" /></div>`
          : '';
        const topHtml = topNoteText || '';
        const bottomHtml = bottomNoteText || '';

        if (imagePosition === 'middle') {
          noteText = `${topHtml}${imageHtml}${bottomHtml}`;
        } else if (imagePosition === 'bottom') {
          noteText = `${topHtml}${bottomHtml}${imageHtml}`;
        } else {
          noteText = `${imageHtml}${topHtml}${bottomHtml}`;
        }
      } catch {
        // Keep defaults when passageText is plain text or malformed JSON.
      }
    }

    const blankCount = (noteText.match(/\[blank\]/gi) || []).length;
    const totalBlanks = Math.max(blankCount, orderedQuestions.length);
    const subQuestions = Array.from({ length: totalBlanks }, (_, idx) => {
      const q = orderedQuestions[idx] || null;
      const num = resolveDisplayNumber(q, idx);
      const lookupNumber = shouldOffsetByBase
        ? (Number.isFinite(resolveDbQuestionNumber(q)) ? resolveDbQuestionNumber(q) : (idx + 1))
        : num;
      const mappedPin = Number.isFinite(lookupNumber)
        ? imageNotePinCoordinateMap.get(lookupNumber)
        : null;
      const pinX = resolvePinPercent(mappedPin?.pinX ?? q?.pinX);
      const pinY = resolvePinPercent(mappedPin?.pinY ?? q?.pinY);
      const correctAnswer = q ? ((q.answers || [])[0]?.answerText || '') : '';
      const id = q ? `q${q.id}` : `tmp-note-${group.questionGroupId || group.id}-${idx + 1}`;
      return {
        id,
        number: num,
        questionNumber: num,
        correctAnswer,
        pinX,
        pinY,
        top: pinY !== null ? `${pinY}%` : null,
        left: pinX !== null ? `${pinX}%` : null,
        questionSection: q?.questionSection || null,
        questionMode: q?.questionMode || (pinX !== null && pinY !== null ? 'image-pin' : 'note-blank'),
      };
    });

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'note-completion',
      questionTypeCode: typeCode,
      title: group.title || '',
      text: noteText,
      instructions,
      imagePosition,
      imageUrl,
      imageWidth,
      pinBoxWidth,
      topNoteText,
      bottomNoteText,
      subQuestions,
      validationOptions: group.validationOptions || null,
    }];
  }

  // ─── SUMMARY_COMPLETION → 1 group question ────────────────────────────
  if (feType === 'summary-completion') {
    const summaryText = group.passageText || group.title || '';

    const blankCount = countCompletionBlankTokens(summaryText);
    const fallbackStartNumber = Number.isFinite(Number(group.fromQuestion)) ? Number(group.fromQuestion) : 1;
    const totalBlanks = Math.max(blankCount, questions.length);
    const subQuestions = Array.from({ length: totalBlanks }, (_, idx) => {
      const q = questions[idx] || null;
      const numFromQuestion = q ? resolveDbQuestionNumber(q) : null;
      const num = Number.isFinite(numFromQuestion) ? numFromQuestion : (fallbackStartNumber + idx);
      const correctAnswer = q ? ((q.answers || [])[0]?.answerText || '') : '';
      const id = q ? `q${q.id}` : `tmp-summary-${group.questionGroupId || group.id}-${idx + 1}`;
      return { id, number: num, correctAnswer };
    });

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'summary-completion',
      questionTypeCode: typeCode,
      title: group.title || '',
      text: summaryText,
      instructions: formatTextWithWhitespace(group.instructions || ''),
      groupInstruction: formatTextWithWhitespace(group.instructions || ''),
      subQuestions,
      validationOptions: group.validationOptions || null,
    }];
  }

  // ─── SUMMARY_COMPLETION_SELECT → 1 group question with optionBank ────────────────────────────
  if (feType === 'summary-completion-select') {
    let summaryText = group.passageText || group.title || '';
    let optionBank = group.optionBank || [];
    let instructions = formatTextWithWhitespace(group.instructions || '');
    let allowOptionReuse = group.allowOptionReuse !== false;

    // Parse passageText if it's JSON
    if (summaryText && typeof summaryText === 'string' && summaryText.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(summaryText);
        summaryText = parsed.noteText || parsed.text || '';
        instructions = parsed.instructions || instructions;
        if (parsed.optionBank && Array.isArray(parsed.optionBank)) {
          optionBank = parsed.optionBank;
        }
        if (parsed.allowOptionReuse !== undefined) {
          allowOptionReuse = parsed.allowOptionReuse;
        }
      } catch (e) {
        // Keep original if parse fails
      }
    }

    const blankCount = countCompletionBlankTokens(summaryText);
    const fallbackStartNumber = Number.isFinite(Number(group.fromQuestion)) ? Number(group.fromQuestion) : 1;
    const totalBlanks = Math.max(blankCount, questions.length);
    const subQuestions = Array.from({ length: totalBlanks }, (_, idx) => {
      const q = questions[idx] || null;
      const numFromQuestion = q ? resolveDbQuestionNumber(q) : null;
      const num = Number.isFinite(numFromQuestion) ? numFromQuestion : (fallbackStartNumber + idx);
      const correctAnswer = q ? ((q.answers || [])[0]?.answerText || '') : '';
      const id = q ? `q${q.id}` : `tmp-summary-select-${group.questionGroupId || group.id}-${idx + 1}`;
      return { id, number: num, correctAnswer };
    });

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'summary-completion-select',
      questionTypeCode: typeCode,
      title: group.title || '',
      text: summaryText,
      instructions,
      groupInstruction: instructions,
      subQuestions,
      optionBank,
      allowOptionReuse,
      validationOptions: group.validationOptions || null,
    }];
  }

  // ─── FLOW_CHART → 1 group question ───────────────────────────────
  if (feType === 'flow_chart') {
    const subQuestions = questions.map((q) => {
      const num = resolveDbQuestionNumber(q);
      const correctAnswer = (q.answers || [])[0]?.answerText || '';
      return { id: `q${q.id}`, number: num, correctAnswer };
    });

    let flowNodes = [];
    let flowTitle = group.title || '';
    let flowInstruction = 'Complete the flow-chart. Choose the correct answer and move it into the gap.';
    let bankTitle = '';
    let bankOptions = [];
    let allowOptionReuse = true;
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
              let text = '';
              if (typeof item === 'string') text = item;
              else text = item?.text || item?.label || item?.value || '';
              return stripInlineStyles(text);
            }).filter(Boolean);
          }
          if (typeof parsed.allowOptionReuse === 'boolean') {
            allowOptionReuse = parsed.allowOptionReuse;
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

    const isGenericGroupTitle = (value) => /^\s*(nh[oó]m|group)\s*\d*\s*$/i.test(String(value || ''));
    if (isGenericGroupTitle(flowTitle)) {
      flowTitle = '';
    }

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'flow_chart',
      questionTypeCode: typeCode,
      heading: '',
      instruction: flowInstruction,
      title: flowTitle,
      bankTitle,
      bankOptions,
      flowNodes,
      subQuestions,
      allowOptionReuse,
    }];
  }

  // ─── FLOW_CHART_TEXT → 1 group question (text input, no drag-drop) ───
  if (feType === 'flow_chart_text') {
    const subQuestions = questions.map((q) => {
      const num = resolveDbQuestionNumber(q);
      const correctAnswer = (q.answers || [])[0]?.answerText || '';
      return { id: `q${q.id}`, number: num, correctAnswer };
    });

    let flowNodes = [];
    let flowTitle = group.title || '';
    let flowInstruction = 'Complete the flow-chart. Write NO MORE THAN TWO WORDS for each answer.';
    let validationOptions = null;
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
          if (parsed.validationOptions) {
            validationOptions = parsed.validationOptions;
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

    const isGenericGroupTitle = (value) => /^\s*(nh[oó]m|group)\s*\d*\s*$/i.test(String(value || ''));
    if (isGenericGroupTitle(flowTitle)) {
      flowTitle = '';
    }

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'flow_chart_text',
      questionTypeCode: typeCode,
      heading: '',
      instruction: flowInstruction,
      title: flowTitle,
      flowNodes,
      subQuestions,
      validationOptions,
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

    const orderedQuestions = [...questions].sort((a, b) => Number(a?.questionNumber || 0) - Number(b?.questionNumber || 0));
    const subQuestions = orderedQuestions.map((q) => {
      const num = resolveDbQuestionNumber(q);
      const correctAnswer = (q.answers || [])[0]?.answerText
        || (q.options || []).find(o => o.isCorrect)?.optionText
        || '';
      const pinX = q?.pinX !== null && q?.pinX !== undefined ? Number(q.pinX) : null;
      const pinY = q?.pinY !== null && q?.pinY !== undefined ? Number(q.pinY) : null;
      return {
        id: `q${q.id}`,
        number: num,
        text: q.questionText || '',
        pinX,
        pinY,
        top: pinY !== null ? `${pinY}%` : '50%',
        left: pinX !== null ? `${pinX}%` : '50%',
        correctAnswer,
      };
    });

    const fallbackOptions = (questions[0]?.options || []).map(o => stripInlineStyles(o.optionText || o.optionLabel)).filter(Boolean);
    const mapMetaOptions = (parsedMapMeta.optionBank || []).map((o) => {
      let text = '';
      if (typeof o === 'string') text = o;
      else text = o?.text || '';
      return stripInlineStyles(text);
    }).filter(Boolean);
    const bankOptions = mapMetaOptions.length > 0 ? mapMetaOptions : fallbackOptions;
    const instruction = parsedMapMeta.instructions || group.instructions || group.title || '';

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'image-drag-drop',
      questionTypeCode: typeCode,
      heading: '',
      instruction,
      rightTitle: formatTextWithWhitespace(parsedMapMeta.rightTitle || ''),
      imageUrl: group.imageUrl || null,
      imageWidth: resolveImageWidthPercent(parsedMapMeta.imageWidth),
      pinBoxWidth: resolvePinBoxWidthPx(parsedMapMeta.pinBoxWidth, 120),
      constrainHalfPage: Boolean(parsedMapMeta.constrainHalfPage),
      allowOptionReuse: (typeof parsedMapMeta.allowOptionReuse === 'boolean') ? parsedMapMeta.allowOptionReuse : true,
      bankOptions,
      subQuestions,
    }];
  }

  // ─── MATCHING / MATCHING_HEADINGS → cần matchingPairs ────────────
  if (feType === 'matching_info' || feType === 'matching_heading' || feType === 'drag_drop_group') {
    const groupDetail = await fetchGroupDetail(baseUrl, group.questionGroupId || group.id);
    const matchingPairs = groupDetail?.matchingPairs || [];

    console.log('[transformGroup] matching_heading data:', {
      feType,
      groupId: group.questionGroupId || group.id,
      matchingPairsCount: matchingPairs.length,
      matchingPairs: matchingPairs.slice(0, 3), // Log first 3 pairs
      groupPassageText: group.passageText?.substring(0, 200)
    });

    let parsedBank = null;
    if (group.passageText) {
      try {
        parsedBank = JSON.parse(group.passageText);
      } catch {
        parsedBank = null;
      }
    }

    const normalizeBank = (items) => (items || []).map(item => {
      let text = '';
      if (typeof item === 'string') text = item;
      else text = item?.text || item?.label || item?.value || '';
      return stripInlineStyles(text);
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
      if (bankOptions.length === 0) {
        bankOptions = normalizeBank((questions[0]?.options || []).map((opt) => opt?.optionText || opt?.optionLabel || ''));
      }
    }

    const subQuestions = questions.map((q) => {
      const num = resolveDbQuestionNumber(q);

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
      sourceContentType: contentType,
      questionTypeCode: typeCode,
      fromQuestion: Number.isFinite(Number(group.fromQuestion)) ? Number(group.fromQuestion) : null,
      toQuestion: Number.isFinite(Number(group.toQuestion)) ? Number(group.toQuestion) : null,
      leftHeader: formatTextWithWhitespace(parsedBank?.leftTitle || group.leftTitle || (contentType === 'SENTENCE_COMPLETION_DRAG' ? 'Sentences' : 'Questions')),
      rightHeader: formatTextWithWhitespace(parsedBank?.rightTitle || group.rightTitle || 'Options'),
      allowOptionReuse: (typeof parsedBank?.allowOptionReuse === 'boolean') ? parsedBank.allowOptionReuse : true,
      bankOptions,
      subQuestions,
    }];
  }

  // ─── MATCHING_FEATURES → 1 group question ─────────────────────────────
  if (feType === 'matching_features') {
    const groupDetail = await fetchGroupDetail(baseUrl, group.questionGroupId || group.id);
    const matchingPairs = groupDetail?.matchingPairs || [];

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

    if (categories.length === 0 && matchingPairs.length > 0) {
      categories = matchingPairs.map((mp, index) => ({
        label: String(mp.leftLabel || String.fromCharCode(65 + index)),
        text: mp.leftContent || '',
      }));
      categoryTitle = categoryTitle || groupDetail?.title || group.title || '';
    }

    if (categories.length === 0) {
      categories = ['A', 'B', 'C', 'D', 'E'].map((label) => ({ label, text: '' }));
    }

    categories = categories.map((cat, index) => ({
      label: String(cat?.label || String.fromCharCode(65 + index)),
      text: formatTextWithWhitespace(cat?.text || ''),
    }));

    // Transform questions - each question is a row in the table
    const subQuestions = questions.map((q) => {
      const num = resolveDbQuestionNumber(q);
      const correctAnswer = (q.answers || [])[0]?.answerText
        || (q.options || []).find(o => o.isCorrect)?.optionText
        || '';
      return {
        id: q.id,           // Real database ID
        number: num,        // Display number
        text: q.questionText || q.blankContext || '',
        correctAnswer: correctAnswer.trim(),
      };
    });

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'matching_features',
      questionTypeCode: typeCode,
      heading: '',
      instruction: formatTextWithWhitespace(
        group.instructions || `Choose the correct group (${categories.map((c) => c.label).join('–') || 'A–E'}) for each item. You may choose any group more than once.`
      ),
      categoryTitle,
      categories,
      subQuestions,
      allowOptionReuse: (typeof group.allowOptionReuse === 'boolean') ? group.allowOptionReuse : true,
    }];
  }

  // ─── MATCHING_FILLABLE → 1 group question (fill-in variant) ───────────
  if (feType === 'matching_fillable') {
    const subQuestions = questions.map((q) => {
      const num = resolveDbQuestionNumber(q);
      const correctAnswer = (q.answers || [])[0]?.answerText || '';
      return {
        id: q.id,
        number: num,
        text: q.questionText || q.blankContext || '',
        correctAnswer: correctAnswer.trim(),
      };
    });

    let leftHeader = '';
    if (group.passageText) {
      try {
        const parsed = JSON.parse(group.passageText);
        leftHeader = parsed.leftTitle || '';
      } catch { }
    }

    return [{
      id: `group-${group.questionGroupId || group.id}`,
      type: 'matching_fillable',
      questionTypeCode: typeCode,
      heading: '',
      instruction: formatTextWithWhitespace(group.instructions || 'Complete each statement with the correct answer.'),
      leftHeader,
      subQuestions,
      validationOptions: group.validationOptions || null,
    }];
  }


  // Fallback: đối xử như fill-in-the-blank
  return questions.map((q) => {
    const num = resolveDbQuestionNumber(q);
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
  getTestSession: async (testId, mode = 'READING', fallbackSkills = []) => {
    const baseUrl = API_CONFIG.BASE_URL;
    const targetMode = mode.toUpperCase();

    const isStructuredInstructionHtml = (value) => /<br\s*\/?\s*>|<\/(?:p|div|ul|ol|li|h[1-6])>|[\r\n]/i.test(String(value || ''));

    const pickBetterInstruction = (currentValue, candidateValue) => {
      const current = String(currentValue || '').trim();
      const candidate = String(candidateValue || '').trim();
      if (!candidate) return current;
      if (!current) return candidate;

      const currentStructured = isStructuredInstructionHtml(current);
      const candidateStructured = isStructuredInstructionHtml(candidate);

      if (candidateStructured && !currentStructured) return candidate;
      if (candidate.length > current.length && candidateStructured === currentStructured) return candidate;
      return current;
    };

    // 1. Lấy toàn bộ đề thi từ test-builder (có structure đầy đủ)
    const testData = await apiFetch(`${baseUrl}/test-builder/${testId}/full`);

    // 2. Tìm session theo skillType
    let targetSession = testData.sessions.find(s => s.skillType === targetMode);

    // 3. Nếu không có, thử fallback sang kỹ năng khác
    if (!targetSession && fallbackSkills.length > 0) {
      for (const fallbackSkill of fallbackSkills) {
        targetSession = testData.sessions.find(s => s.skillType === fallbackSkill.toUpperCase());
        if (targetSession) {
          console.log(`[ieltsApi] Fallback từ ${targetMode} sang ${fallbackSkill.toUpperCase()}`);
          break;
        }
      }
    }

    if (!targetSession) throw new Error(`Bài thi chưa có nội dung cho kỹ năng ${targetMode}. Vui lòng tạo câu hỏi trước.`);

    let listeningAudioPlayCount = 1;

    // 3. Transform parts — giữ nguyên group structure, transform questions bên trong
    const populatedParts = await Promise.all(
      targetSession.parts.map(async (part, index) => {
        let mergedPassageContent = '';
        let mergedPassageTitle = '';
        let mergedAudioUrl = null;
        let mergedAudioPlayCount = 1;
        let mergedImageUrl = null;
        let mergedInstructions = '';

        // Special handling for WRITING skill
        let taskLabel = part.name || `Task ${part.orderIndex || index + 1}`;
        let minWords = 150;
        let recommendedMinutes = 20;
        let taskImageSvg = null;
        let taskInstruction = '';

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
          mergedInstructions = pickBetterInstruction(
            mergedInstructions,
            formatTextWithWhitespace(group.instructions || group.instruction || '')
          );
          if (group.audioUrl && !mergedAudioUrl) {
            mergedAudioUrl = group.audioUrl;
            mergedAudioPlayCount = Number.isFinite(Number(group.audioPlayCount)) && Number(group.audioPlayCount) > 0
              ? Number(group.audioPlayCount)
              : 1;
            if (targetMode === 'LISTENING') {
              listeningAudioPlayCount = mergedAudioPlayCount;
            }
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
              if (!taskInstruction) {
                taskInstruction = parsed.taskInstruction
                  || parsed.prompt
                  || parsed.description
                  || parsed.content
                  || parsed.instruction
                  || '';
              }
            } catch { /* plain text fallback */ }

            if (!taskInstruction && typeof group.passageText === 'string') {
              taskInstruction = group.passageText;
            }
          }

          if (targetMode === 'WRITING' && !taskInstruction && group.instructions) {
            taskInstruction = group.instructions;
          }

          // Extract Speaking metadata (classification)
          let classification = 'GENERAL';
          if (targetMode === 'SPEAKING' && group.passageText) {
            try {
              const parsed = JSON.parse(group.passageText);
              if (parsed.classification) classification = parsed.classification;
            } catch { }
          }

          // Transform group's questions using transformGroup()
          const transformedQuestions = await transformGroup(baseUrl, group);

          transformedGroups.push({
            ...group,
            // Keep raw group data
            id: group.id,
            title: group.title,
            contentType: group.contentType,
            passageText: group.passageText,
            audioUrl: group.audioUrl,
            audioPlayCount: group.audioPlayCount,
            imageUrl: group.imageUrl,
            instructions: group.instructions,
            classification,
            // Provide transformed questions
            questions: transformedQuestions,
          });
        }

        // Flatten transformed questions for backward compatibility
        const flattenedQuestions = transformedGroups.flatMap(g =>
          (g.questions || []).map(q => ({
            ...q,
            groupInstruction: q.groupInstruction || g.instructions || null
          }))
        );

        if (targetMode === 'WRITING' && !taskInstruction) {
          const firstQuestion = flattenedQuestions.find(q => q && (q.text || q.questionText || q.blankContext));
          if (firstQuestion) {
            taskInstruction = firstQuestion.text || firstQuestion.questionText || firstQuestion.blankContext || '';
          }
        }

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

        const partInstructions = formatTextWithWhitespace(part.instructions || part.instruction || '');
        const resolvedInstructions = partInstructions || mergedInstructions;

        let partName = part.name || `Part ${part.orderIndex || index + 1}`;
        if (targetMode === 'WRITING') {
          partName = partName.replace(/Task\s*(\d+)/i, 'Part $1');
        }

        const partObj = {
          id: `part-${part.testPartId || part.id}`,
          partNumber: part.orderIndex || index + 1,
          name: partName,
          orderIndex: part.orderIndex || index + 1,
          title: partName,

          // Extracted metadata
          instruction: resolvedInstructions || (targetMode === 'WRITING' ? 'No task specified.' : 'Listen and answer questions.'),
          instructions: resolvedInstructions,
          passageTitle: mergedPassageTitle,
          passageContent: mergedPassageContent,
          questionsLabel: mergedPassageTitle || 'Questions',
          audioUrl: mergedAudioUrl,
          audioPlayCount: mergedAudioPlayCount,
          imageUrl: mergedImageUrl,

          // Writing-specific fields
          taskLabel: targetMode === 'WRITING' ? taskLabel : undefined,
          minWords: targetMode === 'WRITING' ? minWords : undefined,
          recommendedMinutes: targetMode === 'WRITING' ? recommendedMinutes : undefined,
          taskImageSvg: targetMode === 'WRITING' ? taskImageSvg : undefined,
          taskInstruction: targetMode === 'WRITING' ? taskInstruction : undefined,

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
      totalMinutes: targetSession.durationMinutes || testData.durationMinutes || 60,
      audioUrl: targetMode === 'LISTENING' ? (listeningAudioPlayCount ? populatedParts.find((p) => p.audioUrl)?.audioUrl || null : null) : undefined,
      audioPlayCount: targetMode === 'LISTENING' ? listeningAudioPlayCount : undefined,
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

      let partName = part.name || `Part ${part.orderIndex || idx + 1}`;
      partName = partName.replace(/Task\s*(\d+)/i, 'Part $1');

      return {
        id: `part-${part.testPartId}`,
        questionGroupId: writingGroup?.questionGroupId || null,
        title: partName,
        taskLabel: partName.includes('Writing') ? partName : `Writing ${partName}`,
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

  submitAnswers: async (testId, skillType, answers, timeSpentSeconds = null, testData = null) => {
    const baseUrl = API_CONFIG.BASE_URL;

    console.log('📝 Raw Answers:', answers);

    const toQuestionId = (rawId) => {
      if (rawId == null) return null;
      const normalized = String(rawId).trim();
      if (!normalized) return null;

      const exactMatch = normalized.match(/^q?(\d+)$/i);
      if (exactMatch) {
        const parsed = Number(exactMatch[1]);
        return Number.isFinite(parsed) ? parsed : null;
      }

      return null;
    };

    const validQuestionIds = (() => {
      if (!testData?.parts?.length) return null;

      const ids = new Set();
      for (const part of testData.parts) {
        for (const question of (part?.questions || [])) {
          const questionId = toQuestionId(question?.id);
          if (questionId != null) ids.add(questionId);

          for (const subQuestion of (question?.subQuestions || [])) {
            const subId = toQuestionId(subQuestion?.id);
            if (subId != null) ids.add(subId);
          }
        }
      }

      return ids.size ? ids : null;
    })();

    const answerPayloads = Object.entries(answers || {}).map(([qid, value]) => {
      const questionId = toQuestionId(qid);
      if (questionId == null) {
        console.warn(`Invalid questionId: ${qid}`);
        return null;
      }

      if (validQuestionIds && !validQuestionIds.has(questionId)) {
        console.warn(`Skipping answer with unknown questionId in current test: ${qid} -> ${questionId}`);
        return null;
      }

      let textAnswer = null;
      let selectedOptionLabel = null;
      let matchingAnswer = null;

      const toNullableText = (rawValue) => {
        if (rawValue === null || rawValue === undefined) return null;
        const text = String(rawValue).trim();
        return text === '' ? null : text;
      };

      if (Array.isArray(value)) {
        matchingAnswer = JSON.stringify(value);
      } else if (value && typeof value === 'object') {
        const hasExplicitAnswerFields =
          Object.prototype.hasOwnProperty.call(value, 'textAnswer')
          || Object.prototype.hasOwnProperty.call(value, 'selectedOptionLabel')
          || Object.prototype.hasOwnProperty.call(value, 'matchingAnswer');

        if (hasExplicitAnswerFields) {
          textAnswer = toNullableText(value.textAnswer);
          selectedOptionLabel = toNullableText(value.selectedOptionLabel);

          const explicitMatching = value.matchingAnswer;
          if (explicitMatching !== null && explicitMatching !== undefined && explicitMatching !== '') {
            matchingAnswer = typeof explicitMatching === 'string'
              ? explicitMatching
              : JSON.stringify(explicitMatching);
          }
        } else {
          matchingAnswer = JSON.stringify(value);
        }
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

    console.log('📤 Answer Payloads:', answerPayloads);

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

  // ─── Guest Exam APIs ────────────────────────────────────────────────
  startGuestAttempt: async (guestInfo, testId, skillType, timeLimitSeconds = null) => {
    const baseUrl = API_CONFIG.BASE_URL;
    const payload = {
      fullName: guestInfo.fullName,
      email: guestInfo.email || null,
      phone: guestInfo.phone || null,
      testId,
      skillType,
      timeLimitSeconds,
    };

    return await guestFetch(`${baseUrl}/guest/exam-attempts/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  submitGuestAttempt: async (attemptId, timeSpentSeconds, answers) => {
    const baseUrl = API_CONFIG.BASE_URL;
    const answerPayloads = answers.map((ans) => {
      const { questionId, selectedOptionLabel, textAnswer, matchingAnswer, isFlagged } = ans;
      return {
        questionId,
        textAnswer,
        selectedOptionLabel,
        matchingAnswer,
        isFlagged,
      };
    }).filter(Boolean);

    return await guestFetch(`${baseUrl}/guest/exam-attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeSpentSeconds, answers: answerPayloads }),
    });
  },

  // ─── Check if user is authenticated ─────────────────────────────────
  isAuthenticated,

  // ─── Backup answers (auto-save) ─────────────────────────────────────
  backupAnswers: async (attemptId, answers) => {
    const baseUrl = API_CONFIG.BASE_URL;
    const answerPayloads = Object.entries(answers).map(([qId, ans]) => {
      const questionId = parseInt(qId);
      let textAnswer = null;
      let selectedOptionLabel = null;
      let matchingAnswer = null;

      if (typeof ans === 'string') {
        textAnswer = ans;
        selectedOptionLabel = ans;
      } else if (Array.isArray(ans)) {
        matchingAnswer = JSON.stringify(ans);
      }

      return { questionId, textAnswer, selectedOptionLabel, matchingAnswer };
    }).filter(Boolean);

    return await apiFetch(`${baseUrl}/exam-attempts/${attemptId}/backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: answerPayloads }),
    });
  },

  // ─── Auto-submit khi timeout ────────────────────────────────────────
  autoSubmitTimeout: async (attemptId) => {
    const baseUrl = API_CONFIG.BASE_URL;
    return await apiFetch(`${baseUrl}/exam-attempts/${attemptId}/timeout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  },

  // ─── Filter attempts cho teacher ────────────────────────────────────
  filterAttempts: async (filter) => {
    const baseUrl = API_CONFIG.BASE_URL;
    return await apiFetch(`${baseUrl}/exam-attempts/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filter),
    });
  },
};
