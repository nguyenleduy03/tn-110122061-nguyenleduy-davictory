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
    const res = await apiClient.get('/question-types');
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

  for (const [skillKey, parts] of Object.entries(sessions)) {
    const structInfo = structure[skillKey];
    if (!structInfo || !parts || parts.length === 0) continue;

    // Bỏ qua session nếu không có question group nào
    const hasContent = parts.some(p => (p.questionGroups?.length ?? 0) > 0);
    if (!hasContent) continue;

    const partPayloads = parts.map((part, partIdx) => {
      // Tìm Part ID từ structure dựa trên orderIndex
      const structPart = structInfo.parts.find(sp => sp.orderIndex === part.orderIndex)
                      || structInfo.parts[partIdx];

      return {
        partId: structPart?.partId,
        orderIndex: part.orderIndex,
        name: part.name,
        totalQuestions: part.totalQuestions,
        instructions: part.instructions || '',
        questionGroups: (part.questionGroups || []).map((group, gIdx) => ({
          existingGroupId: group.backendGroupId || null, // Nếu đã lưu trước đó
          title: group.title || `Nhóm ${gIdx + 1}`,
          contentType: group.contentType || 'STANDALONE',
          passageText: serializeGroupContent(group),
          audioUrl: group.audioUrl || null,
          imageUrl: group.imageUrl || null,
          fromQuestion: group.fromQuestion || null,
          toQuestion: group.toQuestion || null,
          orderIndex: gIdx + 1,
          questions: (group.questions || []).map((q, qIdx) => ({
            questionTypeCode: mapQuestionTypeCode(q.questionType?.typeName || group.contentType),
            questionNumber: q.questionNumber || qIdx + 1,
            questionText: q.questionText || '',
            blankContext: q.blankContext || null,
            imageUrl: q.imageUrl || null,
            points: q.points || 1.0,
            orderIndex: qIdx + 1,
            options: (q.options || []).map((opt, oIdx) => ({
              optionLabel: opt.optionLabel || String.fromCharCode(65 + oIdx),
              optionText: opt.optionText || '',
              isCorrect: opt.isCorrect || false,
              orderIndex: oIdx,
            })),
            answers: (q.answers || []).map((ans, aIdx) => ({
              answerText: ans.answerText || q.answerText || '',
              alternativeAnswers: ans.alternativeAnswers || null,
              isCaseSensitive: ans.isCaseSensitive || false,
              blankIndex: ans.blankIndex || aIdx + 1,
              wordLimit: ans.wordLimit || null,
            })),
          })),
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
    isFullTest: test.isFullTest ?? true,
    durationMinutes: test.durationMinutes || 165,
    targetBand: test.targetBand || '6.5',
    createdByUserId,
    sessions: sessionPayloads,
  };
}

// ─── Serialize nội dung group thành passageText (JSON) ───────────

function serializeGroupContent(group) {
  const ct = group.contentType;

  // Reading passage: lưu paragraphs
  if (ct === 'READING_PASSAGE' && group.paragraphs) {
    return JSON.stringify({ paragraphs: group.paragraphs });
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
      imageWidth: group.imageWidth,
      pinBoxWidth: group.pinBoxWidth,
      optionBank: group.optionBank,
    });
  }
  // Default: plain text
  return group.passageText || '';
}

// ─── Map frontend questionType name → backend QuestionType code ──

function mapQuestionTypeCode(typeName) {
  const map = {
    'MULTIPLE_CHOICE': 'MCQ',
    'MULTIPLE_CHOICE_MULTIPLE': 'MCQ',
    'TRUE_FALSE_NG': 'TFNG',
    'YES_NO_NG': 'YNNG',
    'FILL_IN_BLANK': 'FILL_BLANK',
    'SHORT_ANSWER': 'SHORT_ANSWER',
    'MATCHING': 'MATCHING',
    'SENTENCE_COMPLETION': 'SENTENCE_COMPLETION',
    'SUMMARY_COMPLETION': 'SUMMARY_COMPLETION',
    'NOTE_COMPLETION': 'NOTE_COMPLETION',
    'FLOW_CHART': 'FLOW_CHART',
    'MAP_DIAGRAM': 'MAP_DIAGRAM',
    'TABLE_FORM': 'TABLE_FORM',
    'LETTER_ESSAY': 'LETTER_ESSAY',
  };
  return map[typeName] || typeName || 'FILL_BLANK';
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
      return { imageWidth: parsed.imageWidth, pinBoxWidth: parsed.pinBoxWidth, optionBank: parsed.optionBank || [] };
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
    'MATCHING': 'MATCHING',
    'SENTENCE_COMPLETION': 'FILL_IN_BLANK',
    'SUMMARY_COMPLETION': 'FILL_IN_BLANK',
    'NOTE_COMPLETION': 'FILL_IN_BLANK',
    'FLOW_CHART': 'FILL_IN_BLANK',
    'MAP_DIAGRAM': 'FILL_IN_BLANK',
    'TABLE_FORM': 'FILL_IN_BLANK',
    'LETTER_ESSAY': 'FILL_IN_BLANK',
  };
  return map[code] || 'FILL_IN_BLANK';
}
