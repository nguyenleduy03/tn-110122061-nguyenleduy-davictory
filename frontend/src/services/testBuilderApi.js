import apiClient from './authApi';

/**
 * API service cho TestBuilder.
 * Gọi backend để lưu/tải/trộn đề thi.
 */
export const testBuilderApi = {

  // ─── Lấy cấu trúc sessions + parts theo testType ──────────────
  getStructure: async (testType = 'ACADEMIC') => {
    const sessionsRes = await apiClient.get(`/test-structure/sessions?testType=${testType}`);
    const sessions = sessionsRes.data;

    // Lấy parts cho mỗi session
    const result = {};
    for (const session of sessions) {
      const partsRes = await apiClient.get(`/test-structure/sessions/${session.id}/parts`);
      const skillKey = session.skillType; // LISTENING, READING, WRITING, SPEAKING
      result[skillKey] = {
        sessionId: session.id,
        name: session.name,
        skillType: session.skillType,
        durationMinutes: session.durationMinutes,
        totalQuestions: session.totalQuestions,
        parts: partsRes.data.map(p => ({
          partId: p.id,
          name: p.name,
          orderIndex: p.orderIndex,
          totalQuestions: p.totalQuestions,
          instructions: p.instructions,
        })),
      };
    }
    return result;
  },

  // ─── Lấy danh sách question types ─────────────────────────────
  getQuestionTypes: async () => {
    const res = await apiClient.get('/tests/question-types');
    return res.data;
  },

  // ─── Lưu toàn bộ đề thi ──────────────────────────────────────
  saveFullTest: async (payload) => {
    const res = await apiClient.post('/test-builder/save-full', payload);
    return res.data;
  },

  // ─── Tải toàn bộ đề thi (bao gồm câu hỏi) ──────────────────
  loadFullTest: async (testId) => {
    const res = await apiClient.get(`/test-builder/${testId}/full`);
    return res.data;
  },

  // ─── Trộn đề mới ─────────────────────────────────────────────
  shuffleTest: async ({ title, testType, createdByUserId, isFullTest = true }) => {
    const res = await apiClient.post('/test-builder/shuffle', {
      title,
      testType,
      isFullTest,
      createdByUserId,
    });
    return res.data;
  },

  // ─── Danh sách đề thi ─────────────────────────────────────────
  getAllTests: async (status) => {
    const url = status ? `/test-builder?status=${status}` : '/test-builder';
    const res = await apiClient.get(url);
    return res.data;
  },

  // ─── Xóa đề thi ──────────────────────────────────────────────
  deleteTest: async (testId) => {
    await apiClient.delete(`/test-builder/${testId}`);
  },
};

// ═══════════════════════════════════════════════════════════════
//  HELPER: Chuyển đổi state TestBuilder → TestSaveRequest payload
// ═══════════════════════════════════════════════════════════════

/**
 * Chuyển state của TestBuilder frontend thành payload cho API save-full.
 *
 * @param {Object} test - { title, description, testType, isFullTest, durationMinutes, targetBand }
 * @param {Object} sessions - { LISTENING: [...parts], READING: [...parts], ... }
 * @param {Object} structure - Kết quả từ getStructure(), chứa sessionId/partId thực từ DB
 * @param {number} createdByUserId - ID người tạo
 * @param {number|null} existingTestId - ID đề thi (nếu đang cập nhật)
 * @returns {Object} payload cho POST /api/test-builder/save-full
 */
export function buildSavePayload(test, sessions, structure, createdByUserId, existingTestId = null) {
  const sessionPayloads = [];

  // Xác định skills cần gửi: full test = tất cả, single = chỉ 1 skill
  const isFullTest = test.isFullTest ?? true;
  const allowedSkills = isFullTest
    ? null // null = tất cả
    : [test.singleSkill || 'LISTENING'];

  for (const [skillKey, parts] of Object.entries(sessions)) {
    // Lọc theo chế độ single skill nếu cần
    if (allowedSkills && !allowedSkills.includes(skillKey)) continue;

    const structInfo = structure[skillKey];
    if (!structInfo || !parts || parts.length === 0) continue;

    // Bỏ qua session nếu không có question group nào
    const hasContent = parts.some(p => (p.questionGroups?.length ?? 0) > 0);
    if (!hasContent) continue;

    const partPayloads = parts.map((part, partIdx) => {
      // Tìm Part ID từ structure dựa trên orderIndex
      const structPart = structInfo.parts.find(sp => sp.orderIndex === part.orderIndex)
                      || structInfo.parts[partIdx];

      // Lọc bỏ group contentType READING_PASSAGE (chỉ chứa đoạn văn, ko có câu hỏi riêng)
      const questionGroups = (part.questionGroups || []).filter(
        g => g.contentType !== 'READING_PASSAGE'
      );

      return {
        partId: structPart?.partId,
        orderIndex: part.orderIndex,
        name: part.name,
        totalQuestions: part.totalQuestions,
        instructions: part.instructions || '',
        questionGroups: questionGroups.map((group, gIdx) => ({
          existingGroupId: group.backendGroupId || null,
          title: group.title || `Nhóm ${gIdx + 1}`,
          contentType: mapContentType(group.contentType),
          passageText: serializeGroupContent(group, part),
          audioUrl: group.audioUrl || null,
          imageUrl: group.imageUrl || null,
          fromQuestion: group.fromQuestion || null,
          toQuestion: group.toQuestion || null,
          orderIndex: gIdx + 1,
          questions: (group.questions || []).map((q, qIdx) => {
            // Ưu tiên contentType của group cho các loại writing/speaking đặc biệt
            const contentTypeOverride = ['WRITING_TASK', 'SPEAKING_INTERVIEW', 'SPEAKING_CUECARD'].includes(group.contentType)
              ? group.contentType
              : null;
            const typeCode = mapQuestionTypeCode(contentTypeOverride || q.questionType?.typeName || group.contentType || 'FILL_IN_BLANK');
            const isTextAnswer = isTextAnswerType(typeCode);

            // Tự động tạo answers nếu question có answerText nhưng chưa có answers[]
            let answers = (q.answers || []).map((ans, aIdx) => ({
              answerText: ans.answerText || '',
              alternativeAnswers: ans.alternativeAnswers || null,
              isCaseSensitive: ans.isCaseSensitive || false,
              blankIndex: ans.blankIndex || aIdx + 1,
              wordLimit: ans.wordLimit || null,
            }));

            // Nếu dạng điền và chưa có answers, tạo từ answerText
            if (isTextAnswer && answers.length === 0 && q.answerText) {
              answers = [{
                answerText: q.answerText,
                alternativeAnswers: null,
                isCaseSensitive: false,
                blankIndex: 1,
                wordLimit: null,
              }];
            }

            return {
              questionTypeCode: typeCode,
              questionNumber: q.questionNumber || qIdx + 1,
              questionText: q.questionText || '',
              blankContext: q.blankContext || null,
              pinX: q.pinX ?? null,
              pinY: q.pinY ?? null,
              imageUrl: q.imageUrl || null,
              points: q.points || 1.0,
              orderIndex: qIdx + 1,
              options: (q.options || []).map((opt, oIdx) => ({
                optionLabel: opt.optionLabel || String.fromCharCode(65 + oIdx),
                optionText: opt.optionText || '',
                isCorrect: opt.isCorrect || false,
                orderIndex: oIdx,
              })),
              answers,
            };
          }),
        })),
      };
    });

    sessionPayloads.push({
      sessionId: structInfo.sessionId,
      orderIndex: sessionPayloads.length + 1,
      durationMinutes: structInfo.durationMinutes,
      instructions: null,
      parts: partPayloads,
    });
  }

  return {
    id: existingTestId,
    title: test.title || 'Untitled Test',
    description: test.description || '',
    testType: test.testType || 'ACADEMIC',
    isFullTest: isFullTest,
    durationMinutes: test.durationMinutes || 165,
    targetBand: test.targetBand || '6.5',
    createdByUserId,
    sessions: sessionPayloads,
  };
}

// Kiểm tra type code có phải dạng điền text không
function isTextAnswerType(typeCode) {
  return ['FILL_BLANK', 'SHORT_ANSWER', 'SENTENCE_COMPLETION', 'SUMMARY_COMPLETION',
    'NOTE_COMPLETION', 'FLOW_CHART', 'MAP_DIAGRAM', 'TABLE_FORM', 'MATCHING', 'MATCHING_HEADINGS'].includes(typeCode);
}

// Map contentType từ FE sang giá trị lưu DB (chuẩn hóa)
function mapContentType(ct) {
  const map = {
    'MULTIPLE_CHOICE_GROUP': 'MULTIPLE_CHOICE',
    'MULTIPLE_CHOICE_MULTI': 'MULTIPLE_CHOICE_MULTI',
    'SHORT_ANSWER_GROUP': 'SHORT_ANSWER',
    'AUDIO_TRANSCRIPT': 'AUDIO_TRANSCRIPT',
    'WRITING_TASK': 'WRITING_TASK',
    'SPEAKING_INTERVIEW': 'SPEAKING_INTERVIEW',
    'SPEAKING_CUECARD': 'SPEAKING_CUECARD',
  };
  return map[ct] || ct || 'STANDALONE';
}

// ─── Serialize nội dung group thành passageText (JSON) ───────────

function serializeGroupContent(group, part) {
  const ct = group.contentType;

  // Reading passage: lưu paragraphs
  if (ct === 'READING_PASSAGE' && group.paragraphs) {
    return JSON.stringify({ paragraphs: group.paragraphs });
  }

  // Nhóm câu hỏi Reading: kèm đoạn văn từ READING_PASSAGE cùng part
  if (part && ['MATCHING_HEADING', 'TRUE_FALSE_NG', 'MULTIPLE_CHOICE_GROUP',
    'MULTIPLE_CHOICE_MULTI', 'SENTENCE_COMPLETION', 'SHORT_ANSWER_GROUP'].includes(ct)) {
    const readingPassage = (part.questionGroups || []).find(g => g.contentType === 'READING_PASSAGE');
    if (readingPassage?.paragraphs) {
      const base = buildGroupSpecificContent(group);
      return JSON.stringify({
        ...base,
        readingPassage: { paragraphs: readingPassage.paragraphs },
      });
    }
  }

  // Table: lưu columns + rows
  if (ct === 'TABLE_COMPLETION' && group.columns) {
    return JSON.stringify({
      tableTitle: group.tableTitle,
      columns: group.columns,
      tableRows: group.tableRows,
    });
  }
  // Note/Summary: lưu text
  if (ct === 'NOTE_COMPLETION') return group.noteText || '';
  if (ct === 'SUMMARY_COMPLETION') return group.summaryText || '';
  // Matching heading: lưu heading bank
  if (ct === 'MATCHING_HEADING' && group.headingBank) {
    return JSON.stringify({ headingBank: group.headingBank });
  }
  // Drag matching: lưu option bank
  if (ct === 'DRAG_MATCHING' && group.optionBank) {
    return JSON.stringify({
      leftTitle: group.leftTitle,
      rightTitle: group.rightTitle,
      optionBank: group.optionBank,
    });
  }
  // Map labelling
  if (ct === 'MAP_LABELLING' && group.optionBank) {
    return JSON.stringify({
      rightTitle: group.rightTitle || '',
      imageWidth: group.imageWidth,
      pinBoxWidth: group.pinBoxWidth,
      optionBank: group.optionBank,
    });
  }
  // Flow chart
  if (ct === 'FLOW_CHART') {
    return JSON.stringify({
      title: group.title || '',
      flowNodes: group.flowNodes || [],
      bankTitle: group.bankTitle || '',
      optionBank: group.optionBank || [],
    });
  }
  // Audio transcript: lưu transcript text nếu có
  if (ct === 'AUDIO_TRANSCRIPT') {
    return group.passageText || '';
  }
  // Writing task
  if (ct === 'WRITING_TASK') {
    return JSON.stringify({
      taskInstruction: group.taskInstruction || '',
      minWords: group.minWords ?? 150,
      recommendedMinutes: group.recommendedMinutes ?? 20,
    });
  }
  // Speaking Interview
  if (ct === 'SPEAKING_INTERVIEW') {
    return JSON.stringify({
      interviewType: group.interviewType || 'PART1',
      partInstruction: group.partInstruction || '',
    });
  }
  // Speaking Cue Card
  if (ct === 'SPEAKING_CUECARD') {
    return JSON.stringify({
      topic: group.topic || '',
      shouldSayLabel: group.shouldSayLabel || 'You should say:',
      bulletPoints: group.bulletPoints || [],
      closingSentence: group.closingSentence || '',
      prepSeconds: group.prepSeconds ?? 60,
    });
  }
  // Map / Diagram
  if (ct === 'MAP' || ct === 'DIAGRAM') {
    return group.passageText || '';
  }
  // Default: plain text
  return group.passageText || '';
}

function buildGroupSpecificContent(group) {
  if (group.contentType === 'MATCHING_HEADING' && group.headingBank) {
    return { headingBank: group.headingBank };
  }
  return {};
}

// ─── Map frontend questionType name → backend QuestionType code ──

function mapQuestionTypeCode(typeName) {
  const map = {
    // MCQ variants
    'MULTIPLE_CHOICE': 'MCQ',
    'MULTIPLE_CHOICE_MULTIPLE': 'MCQ',
    'MULTIPLE_CHOICE_GROUP': 'MCQ',
    'MULTIPLE_CHOICE_MULTI': 'MCQ',
    // True/False/Not Given
    'TRUE_FALSE_NG': 'TFNG',
    // Yes/No/Not Given
    'YES_NO_NG': 'YNNG',
    // Fill in blank variants
    'FILL_IN_BLANK': 'FILL_BLANK',
    'FILL_BLANK': 'FILL_BLANK',
    // Short answer
    'SHORT_ANSWER': 'SHORT_ANSWER',
    'SHORT_ANSWER_GROUP': 'SHORT_ANSWER',
    // Matching
    'MATCHING': 'MATCHING',
    'DRAG_MATCHING': 'MATCHING',
    'MATCHING_HEADING': 'MATCHING_HEADINGS',
    'MATCHING_HEADINGS': 'MATCHING_HEADINGS',
    // Completion types
    'SENTENCE_COMPLETION': 'SENTENCE_COMPLETION',
    'SUMMARY_COMPLETION': 'SUMMARY_COMPLETION',
    'NOTE_COMPLETION': 'NOTE_COMPLETION',
    'TABLE_COMPLETION': 'NOTE_COMPLETION',
    // Charts/Maps
    'FLOW_CHART': 'FLOW_CHART',
    'MAP_DIAGRAM': 'MAP_DIAGRAM',
    'MAP': 'MAP_DIAGRAM',
    'DIAGRAM': 'MAP_DIAGRAM',
    'MAP_LABELLING': 'MAP_DIAGRAM',
    // Table
    'TABLE_FORM': 'NOTE_COMPLETION',
    'TABLE': 'NOTE_COMPLETION',
    // Writing/Speaking
    'WRITING_TASK': 'ESSAY',
    'LETTER_ESSAY': 'ESSAY',
    'SPEAKING_INTERVIEW': 'SHORT_ANSWER',
    'SPEAKING_CUECARD': 'SHORT_ANSWER',
    // Audio
    'AUDIO_TRANSCRIPT': 'FILL_BLANK',
    'STANDALONE': 'FILL_BLANK',
  };
  return map[typeName] || 'FILL_BLANK';
}

// ═══════════════════════════════════════════════════════════════
//  HELPER: Chuyển đổi TestFullResponse → state TestBuilder
// ═══════════════════════════════════════════════════════════════

/**
 * Chuyển response từ API loadFullTest thành state cho TestBuilder.
 *
 * @param {Object} data - TestFullResponse từ backend
 * @returns {{ test, sessions, testId }}
 */
export function parseLoadedTest(data) {
  const test = {
    title: data.title,
    description: data.description,
    testType: data.testType,
    status: data.status,
    isFullTest: data.isFullTest,
    durationMinutes: data.durationMinutes,
    targetBand: data.targetBand,
  };

  const sessions = {};
  let nextId = 5000;

  for (const sessionResp of (data.sessions || [])) {
    const skillKey = sessionResp.skillType;
    const parts = (sessionResp.parts || []).map(partResp => ({
      id: nextId++,
      backendTestPartId: partResp.testPartId,
      name: partResp.name,
      orderIndex: partResp.orderIndex,
      totalQuestions: partResp.totalQuestions,
      instructions: partResp.instructions || '',
      questionGroups: (partResp.questionGroups || []).map(groupResp => {
        const base = {
          id: nextId++,
          backendGroupId: groupResp.questionGroupId,
          backendTestQGId: groupResp.testQuestionGroupId,
          title: groupResp.title,
          contentType: groupResp.contentType,
          audioUrl: groupResp.audioUrl,
          imageUrl: groupResp.imageUrl,
          fromQuestion: groupResp.fromQuestion,
          toQuestion: groupResp.toQuestion,
          orderIndex: groupResp.orderIndex,
          questions: (groupResp.questions || []).map(qResp => ({
            id: nextId++,
            backendQuestionId: qResp.id,
            questionNumber: qResp.questionNumber,
            questionText: qResp.questionText,
            blankContext: qResp.blankContext,
            pinX: qResp.pinX ?? null,
            pinY: qResp.pinY ?? null,
            imageUrl: qResp.imageUrl,
            points: qResp.points,
            orderIndex: qResp.orderIndex,
            questionType: { typeName: mapBackendTypeToFrontend(qResp.questionTypeCode) },
            options: (qResp.options || []).map(opt => ({
              id: nextId++,
              optionLabel: opt.optionLabel,
              optionText: opt.optionText,
              isCorrect: opt.isCorrect,
              orderIndex: opt.orderIndex,
            })),
            answers: (qResp.answers || []).map(ans => ({
              answerText: ans.answerText,
              alternativeAnswers: ans.alternativeAnswers,
              isCaseSensitive: ans.isCaseSensitive,
              blankIndex: ans.blankIndex,
              wordLimit: ans.wordLimit,
            })),
          })),
        };

        // Deserialize passageText theo contentType
        return { ...base, ...deserializeGroupContent(groupResp.contentType, groupResp.passageText) };
      }),
    }));

    sessions[skillKey] = parts;
  }

  return { test, sessions, testId: data.id };
}

function deserializeGroupContent(contentType, passageText) {
  if (!passageText) return {};

  try {
    if (contentType === 'READING_PASSAGE') {
      const parsed = JSON.parse(passageText);
      return { paragraphs: parsed.paragraphs || [] };
    }
    if (contentType === 'TABLE_COMPLETION') {
      const parsed = JSON.parse(passageText);
      return { tableTitle: parsed.tableTitle, columns: parsed.columns, tableRows: parsed.tableRows };
    }
    if (contentType === 'NOTE_COMPLETION') return { noteText: passageText };
    if (contentType === 'SUMMARY_COMPLETION') return { summaryText: passageText };
    if (contentType === 'MATCHING_HEADING') {
      const parsed = JSON.parse(passageText);
      return { headingBank: parsed.headingBank || [] };
    }
    if (contentType === 'DRAG_MATCHING') {
      const parsed = JSON.parse(passageText);
      return { leftTitle: parsed.leftTitle, rightTitle: parsed.rightTitle, optionBank: parsed.optionBank || [] };
    }
    if (contentType === 'MAP_LABELLING') {
      const parsed = JSON.parse(passageText);
      return {
        rightTitle: parsed.rightTitle || '',
        imageWidth: parsed.imageWidth,
        pinBoxWidth: parsed.pinBoxWidth,
        optionBank: parsed.optionBank || [],
      };
    }
    if (contentType === 'FLOW_CHART') {
      const parsed = JSON.parse(passageText);
      return {
        title: parsed.title || '',
        flowNodes: parsed.flowNodes || [],
        bankTitle: parsed.bankTitle || '',
        optionBank: parsed.optionBank || [],
      };
    }
    if (contentType === 'WRITING_TASK') {
      const parsed = JSON.parse(passageText);
      return {
        taskInstruction: parsed.taskInstruction || '',
        minWords: parsed.minWords ?? 150,
        recommendedMinutes: parsed.recommendedMinutes ?? 20,
      };
    }
    if (contentType === 'SPEAKING_INTERVIEW') {
      const parsed = JSON.parse(passageText);
      return {
        interviewType: parsed.interviewType || 'PART1',
        partInstruction: parsed.partInstruction || '',
      };
    }
    if (contentType === 'SPEAKING_CUECARD') {
      const parsed = JSON.parse(passageText);
      return {
        topic: parsed.topic || '',
        shouldSayLabel: parsed.shouldSayLabel || 'You should say:',
        bulletPoints: parsed.bulletPoints || [],
        closingSentence: parsed.closingSentence || '',
        prepSeconds: parsed.prepSeconds ?? 60,
      };
    }
  } catch {
    // passageText is not JSON — use as plain text
  }

  return { passageText };
}

function mapBackendTypeToFrontend(code) {
  const map = {
    'MCQ': 'MULTIPLE_CHOICE',
    'TFNG': 'TRUE_FALSE_NG',
    'YNNG': 'YES_NO_NG',
    'FILL_BLANK': 'FILL_IN_BLANK',
    'SHORT_ANSWER': 'SHORT_ANSWER',
    'MATCHING': 'FILL_IN_BLANK',
    'MATCHING_HEADINGS': 'FILL_IN_BLANK',
    'SENTENCE_COMPLETION': 'FILL_IN_BLANK',
    'SUMMARY_COMPLETION': 'FILL_IN_BLANK',
    'NOTE_COMPLETION': 'FILL_IN_BLANK',
    'FLOW_CHART': 'FILL_IN_BLANK',
    'MAP_DIAGRAM': 'FILL_IN_BLANK',
    'TABLE_FORM': 'FILL_IN_BLANK',
    'LETTER': 'FILL_IN_BLANK',
    'ESSAY': 'WRITING_TASK',
  };
  return map[code] || 'FILL_IN_BLANK';
}
