import axios from 'axios';
import { API_CONFIG } from '../config/api';

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor để thêm JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
    console.log('🔍 DEBUG: Payload gửi lên backend:', JSON.stringify(payload, null, 2));
    
    // Kiểm tra drag matching questions
    payload.sessions?.forEach((session, sIdx) => {
      session.parts?.forEach((part, pIdx) => {
        part.questionGroups?.forEach((group, gIdx) => {
          if (group.contentType === 'MATCHING') {
            console.log(`📋 DRAG_MATCHING Group ${gIdx} trong Part ${pIdx}:`, {
              title: group.title,
              questionCount: group.questions?.length || 0,
              questions: group.questions?.map((q, idx) => ({
                index: idx,
                questionText: q.questionText,
                answerText: q.answerText,
                hasAnswers: q.answers?.length || 0,
                answersDetail: q.answers
              }))
            });
            
            // Kiểm tra tổng số questions vs answers
            const totalQuestions = group.questions?.length || 0;
            const questionsWithAnswers = group.questions?.filter(q => q.answers && q.answers.length > 0).length || 0;
            const questionsWithAnswerText = group.questions?.filter(q => q.answerText && q.answerText.trim() !== '').length || 0;
            
            console.log(`🔍 SUMMARY: Total=${totalQuestions}, WithAnswers=${questionsWithAnswers}, WithAnswerText=${questionsWithAnswerText}`);
          }
        });
      });
    });

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

  // ─── Cập nhật trạng thái đề thi ──────────────────────────────
  updateTestStatus: async (testId, status) => {
    const res = await apiClient.put(`/tests/${testId}/status`, null, {
      params: { status },
    });
    return res.data;
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

    // Tính startQuestionNumber cho mỗi part trong session
    let sessionQuestionNumber = 1;
    const partsWithQuestionNumbers = parts.map(part => {
      const partStartNumber = sessionQuestionNumber;
      const calculatedQuestionsInPart = (part.questionGroups || []).reduce((sum, group) => {
        return sum + (group.questions || []).reduce((qSum, q) => {
          return qSum + (q.questionCount || 1); // Tính theo questionCount
        }, 0);
      }, 0);
      const configuredQuestionsInPart = Number(part.totalQuestions || 0);
      const totalQuestionsInPart = Math.max(
        calculatedQuestionsInPart,
        Number.isFinite(configuredQuestionsInPart) ? configuredQuestionsInPart : 0
      );
      sessionQuestionNumber += totalQuestionsInPart;
      
      return { ...part, startQuestionNumber: partStartNumber };
    });

    const partPayloads = partsWithQuestionNumbers.map((part, partIdx) => {
      // Tìm Part ID từ structure dựa trên orderIndex
      const structPart = structInfo.parts.find(sp => sp.orderIndex === part.orderIndex)
                      || structInfo.parts[partIdx];

      // Lưu tất cả groups kể cả READING_PASSAGE
      const questionGroups = part.questionGroups || [];

      // Tính questionNumber liên tục trong part
      let partQuestionNumber = (part.startQuestionNumber || 1) - 1;

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
          allowOptionReuse: group.allowOptionReuse !== false, // Default true
          instructions: group.instructions || null,  // Add group-level instructions
          validationOptions: group.ignoreCase !== undefined || group.ignoreSpaces || group.ignorePunctuation || group.ignoreChars ? {
            ignoreCase: group.ignoreCase !== false,
            ignoreSpaces: group.ignoreSpaces || false,
            ignorePunctuation: group.ignorePunctuation || false,
            ignoreChars: group.ignoreChars || ''
          } : null,
          questions: (group.questions || []).map((q, qIdx) => {
            console.log(`🔄 Processing question ${qIdx}/${group.questions.length} for group ${group.contentType}`);
            console.log(`   - questionText: "${q.questionText}"`);
            console.log(`   - answerText: "${q.answerText}"`);
            console.log(`   - existing answers: ${q.answers?.length || 0}`);
            
            // Tính questionCount cho MCQ multiple
            const questionCount = q.questionCount || 1;
            const currentQuestionNumber = partQuestionNumber + 1;
            partQuestionNumber += questionCount; // Tăng theo questionCount
            
            // Debug drag matching
            if (group.contentType === 'DRAG_MATCHING') {
              console.log(`🎯 DRAG Question ${qIdx}:`, {
                questionText: q.questionText,
                answerText: q.answerText,
                existingAnswers: q.answers?.length || 0
              });
            }
            
            // Ưu tiên contentType của group cho các loại writing/speaking đặc biệt
            const contentTypeOverride = ['WRITING_TASK', 'SPEAKING_INTERVIEW', 'SPEAKING_CUECARD', 'SHARED_OPTIONS_DROPDOWN'].includes(group.contentType)
              ? group.contentType
              : null;
            const typeCode = mapQuestionTypeCode(contentTypeOverride || q.questionType?.typeName || group.contentType || 'FILL_IN_BLANK');
            const isTextAnswer = isTextAnswerType(typeCode);
            
            // Debug type mapping
            if (group.contentType === 'DRAG_MATCHING') {
              console.log(`   🔍 Type mapping: ${q.questionType?.typeName} -> ${typeCode} -> isTextAnswer: ${isTextAnswer}`);
            }

            // Xây dựng answers[] để gửi lên backend
            let answers;
            
            // Đặc biệt xử lý DRAG_MATCHING và MATCHING_FEATURES - luôn tạo answer cho mọi câu hỏi
            if (group.contentType === 'DRAG_MATCHING' || group.contentType === 'MATCHING_FEATURES') {
              const existingAnswer = q.answers?.[0];
              answers = [{
                answerText: q.answerText || '', // Có thể rỗng
                alternativeAnswers: existingAnswer?.alternativeAnswers || null,
                isCaseSensitive: existingAnswer?.isCaseSensitive || false,
                blankIndex: existingAnswer?.blankIndex || 1,
                wordLimit: existingAnswer?.wordLimit || null,
              }];
              console.log(`   ✅ ${group.contentType} answer created: "${answers[0].answerText}"`);
            } else if (isTextAnswer) {
              // Logic cũ cho các loại khác (gồm MCQ_DROPDOWN: một chữ A/B/C…)
              const existingAnswer = q.answers?.[0];
              const textAns = (q.answerText != null && q.answerText !== '')
                ? q.answerText
                : (existingAnswer?.answerText ?? '');
              answers = [{
                answerText: textAns,
                alternativeAnswers: existingAnswer?.alternativeAnswers || null,
                isCaseSensitive: existingAnswer?.isCaseSensitive || false,
                blankIndex: existingAnswer?.blankIndex || 1,
                wordLimit: existingAnswer?.wordLimit || null,
              }];
            } else {
              answers = [];
            }

            // Debug final answers cho drag matching
            if (group.contentType === 'DRAG_MATCHING') {
              console.log(`✅ Question ${qIdx}: "${q.questionText}" -> Answer: "${q.answerText}" -> Final answers:`, answers);
            }

            const result = {
              questionTypeCode: typeCode,
              questionNumber: currentQuestionNumber,
              questionText: q.questionText || '',
              blankContext: q.blankContext || null,
              pinX: q.pinX ?? null,
              pinY: q.pinY ?? null,
              imageUrl: q.imageUrl || null,
              points: q.points || 1.0,
              orderIndex: qIdx + 1,
              // Lưu questionCount và groupInstruction để backend biết
              questionCount: questionCount,
              groupInstruction: q.groupInstruction || null,
              options: (q.options || []).map((opt, oIdx) => ({
                optionLabel: opt.optionLabel || String.fromCharCode(65 + oIdx),
                optionText: opt.optionText || '',
                isCorrect: opt.isCorrect || false,
                orderIndex: oIdx,
              })),
              answers,
            };
            
            if (group.contentType === 'DRAG_MATCHING') {
              console.log(`📤 Sending question ${qIdx}:`, result);
            }
            
            return result;
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

// Kiểm tra type code có phải dạng lưu vào bảng answers không
// TFNG/YNNG: answerText là 'TRUE'/'FALSE'/'NOT GIVEN' cũng lưu vào answers
function isTextAnswerType(typeCode) {
  return ['FILL_BLANK', 'SHORT_ANSWER', 'SENTENCE_COMPLETION', 'SUMMARY_COMPLETION',
    'NOTE_COMPLETION', 'FLOW_CHART', 'MAP_DIAGRAM', 'TABLE_FORM', 'MATCHING', 'MATCHING_HEADINGS',
    'TFNG', 'YNNG', 'MCQ_DROPDOWN'].includes(typeCode);
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
  const allowOptionReuse = (typeof group.allowOptionReuse === 'boolean') ? group.allowOptionReuse : true;

  // Reading passage: lưu paragraphs
  if (ct === 'READING_PASSAGE' && group.paragraphs) {
    return JSON.stringify({ paragraphs: group.paragraphs });
  }

  // Nhóm câu hỏi Reading: READING_PASSAGE đã được lưu riêng, không cần nhúng vào đây

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
  // Image + Note Form: lưu noteText, imagePosition, imageWidth
  if (ct === 'IMAGE_NOTE_FORM') {
    const topNoteText = group.topNoteText ?? (group.imagePosition === 'bottom' ? '' : (group.noteText || ''));
    const bottomNoteText = group.bottomNoteText ?? (group.imagePosition === 'bottom' ? (group.noteText || '') : '');
    return JSON.stringify({
      noteText: group.noteText || [topNoteText, bottomNoteText].filter(Boolean).join('\n\n'),
      topNoteText,
      bottomNoteText,
      imagePosition: group.imagePosition || 'top',
      imageWidth: group.imageWidth || 100,
      pinBoxWidth: group.pinBoxWidth || 60,
    });
  }
  // Matching heading: lưu heading bank
  if (ct === 'MATCHING_HEADING') {
    return JSON.stringify({ headingBank: group.headingBank, allowOptionReuse });
  }
  // Drag matching: lưu option bank
  if (ct === 'DRAG_MATCHING') {
    return JSON.stringify({
      leftTitle: group.leftTitle,
      rightTitle: group.rightTitle,
      optionBank: group.optionBank || [],
      allowOptionReuse,
    });
  }
  // Matching fillable: chỉ lưu leftTitle
  if (ct === 'MATCHING_FILLABLE' || ct === 'MATCHING_HEADINGS_FILLABLE') {
    return JSON.stringify({
      leftTitle: group.leftTitle || '',
    });
  }
  // Map labelling
  if (ct === 'MAP_LABELLING') {
    return JSON.stringify({
      instructions: group.instructions || '',
      rightTitle: group.rightTitle || '',
      imageWidth: group.imageWidth,
      pinBoxWidth: group.pinBoxWidth,
      constrainHalfPage: Boolean(group.constrainHalfPage),
      optionBank: group.optionBank || [],
      allowOptionReuse,
    });
  }
  // Flow chart
  if (ct === 'FLOW_CHART') {
    return JSON.stringify({
      title: group.title || '',
      flowNodes: group.flowNodes || [],
      bankTitle: group.bankTitle || '',
      optionBank: group.optionBank || [],
      allowOptionReuse,
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
  // Dropdown chung (Listening/Reading): options + hướng dẫn trong JSON
  if (ct === 'SHARED_OPTIONS_DROPDOWN') {
    return JSON.stringify({
      sharedOptions: group.sharedOptions || [],
      mainInstruction: group.mainInstruction || '',
      subInstruction: group.subInstruction || '',
    });
  }
  // Custom schema-driven group
  if (ct === 'CUSTOM') {
    return JSON.stringify({
      schema: group.customSchema || { version: 2, mode: 'BLANKS', promptHtml: '', optionBank: [], leftItems: [], chooseCount: 2 },
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
    'MCQ_DROPDOWN': 'MCQ_DROPDOWN',
    'SHARED_OPTIONS_DROPDOWN': 'MCQ_DROPDOWN',
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
    'IMAGE_NOTE_FORM': 'NOTE_COMPLETION',
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
    const parts = (sessionResp.parts || []).map(partResp => {
      const mappedGroups = (partResp.questionGroups || []).map(groupResp => {
        // Normalize contentType for MCQ groups
        let contentType = groupResp.contentType;
        if (contentType === 'MULTIPLE_CHOICE') {
          contentType = 'MULTIPLE_CHOICE_GROUP';
        } else if (contentType === 'MULTIPLE_CHOICE_MULTI') {
          // Keep as is
        }
        
        const base = {
          id: nextId++,
          backendGroupId: groupResp.questionGroupId,
          backendTestQGId: groupResp.testQuestionGroupId,
          title: groupResp.title,
          instructions: groupResp.instructions || '',
          contentType: contentType,
          audioUrl: groupResp.audioUrl,
          imageUrl: groupResp.imageUrl,
          fromQuestion: groupResp.fromQuestion,
          toQuestion: groupResp.toQuestion,
          orderIndex: groupResp.orderIndex,
          allowOptionReuse: (typeof groupResp.allowOptionReuse === 'boolean') ? groupResp.allowOptionReuse : true,
          questions: (groupResp.questions || []).map(qResp => {
            const questionCount = qResp.questionCount || 1;
            const startNum = qResp.questionNumber;
            const numberRange = questionCount > 1 
              ? Array.from({length: questionCount}, (_, i) => startNum + i)
              : [startNum];
            
            const mappedType = mapBackendTypeToFrontend(qResp.questionTypeCode);
            const isMCQ = mappedType === 'MULTIPLE_CHOICE' || mappedType === 'MULTIPLE_CHOICE_MULTIPLE';
            
            // Ensure MCQ questions always have options
            let options = (qResp.options || []).map(opt => ({
              id: nextId++,
              optionLabel: opt.optionLabel,
              optionText: opt.optionText,
              isCorrect: opt.isCorrect,
              orderIndex: opt.orderIndex,
            }));
            
            // If MCQ but no options from backend, create defaults
            if (isMCQ && options.length === 0) {
              const labels = mappedType === 'MULTIPLE_CHOICE_MULTIPLE' 
                ? ['A', 'B', 'C', 'D', 'E'] 
                : ['A', 'B', 'C', 'D'];
              options = labels.map((label, i) => ({
                id: nextId++,
                optionLabel: label,
                optionText: '',
                isCorrect: false,
                orderIndex: i,
              }));
            }
            
            return {
              id: nextId++,
              backendQuestionId: qResp.id,
              questionNumber: qResp.questionNumber,
              questionCount: questionCount,
              numberRange: numberRange,
              questionText: qResp.questionText,
              blankContext: qResp.blankContext,
              pinX: qResp.pinX ?? null,
              pinY: qResp.pinY ?? null,
              imageUrl: qResp.imageUrl,
              points: qResp.points,
              orderIndex: qResp.orderIndex,
              answerText: qResp.answers?.[0]?.answerText || '',
              groupInstruction: qResp.groupInstruction || null,
              questionType: { typeName: mappedType },
              options: options,
              answers: (qResp.answers || []).map(ans => ({
                answerText: ans.answerText,
                alternativeAnswers: ans.alternativeAnswers,
                isCaseSensitive: ans.isCaseSensitive,
                blankIndex: ans.blankIndex,
                wordLimit: ans.wordLimit,
              })),
              _debug: groupResp.contentType === 'DRAG_MATCHING' ? {
                backendAnswers: qResp.answers?.length || 0,
                loadedAnswerText: qResp.answers?.[0]?.answerText || 'EMPTY'
              } : undefined
            };
          }),
        };
        return { ...base, ...deserializeGroupContent(groupResp.contentType, groupResp.passageText) };
      });

      // Backward compat: reconstruct READING_PASSAGE from legacy embedded data
      const hasReadingPassage = mappedGroups.some(g => g.contentType === 'READING_PASSAGE');
      if (!hasReadingPassage) {
        const embedded = mappedGroups.find(g => g._embeddedPassage);
        if (embedded) {
          mappedGroups.unshift({
            id: nextId++,
            contentType: 'READING_PASSAGE',
            backendGroupId: null,
            title: '',
            orderIndex: 0,
            questions: [],
            paragraphs: embedded._embeddedPassage.paragraphs || [],
          });
        }
      }
      mappedGroups.forEach(g => { delete g._embeddedPassage; });

      return {
        id: nextId++,
        backendTestPartId: partResp.testPartId,
        name: partResp.name,
        orderIndex: partResp.orderIndex,
        totalQuestions: partResp.totalQuestions,
        instructions: partResp.instructions || '',
        questionGroups: mappedGroups,
      };
    });

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
    if (contentType === 'IMAGE_NOTE_FORM') {
      const parsed = JSON.parse(passageText);
      const topNoteText = parsed.topNoteText ?? (parsed.imagePosition === 'bottom' ? '' : (parsed.noteText || ''));
      const bottomNoteText = parsed.bottomNoteText ?? (parsed.imagePosition === 'bottom' ? (parsed.noteText || '') : '');
      return {
        noteText: parsed.noteText || [topNoteText, bottomNoteText].filter(Boolean).join('\n\n'),
        topNoteText,
        bottomNoteText,
        imagePosition: parsed.imagePosition || 'top',
        imageWidth: parsed.imageWidth || 100,
        pinBoxWidth: parsed.pinBoxWidth || 60,
      };
    }
    if (contentType === 'MATCHING_HEADING') {
      const parsed = JSON.parse(passageText);
      // Handle legacy format: headingBank + embedded readingPassage
      const extra = parsed.readingPassage ? { _embeddedPassage: parsed.readingPassage } : {};
      return { headingBank: parsed.headingBank || [], allowOptionReuse: (typeof parsed.allowOptionReuse === 'boolean') ? parsed.allowOptionReuse : true, ...extra };
    }
    if (contentType === 'DRAG_MATCHING') {
      const parsed = JSON.parse(passageText);
      return { leftTitle: parsed.leftTitle, rightTitle: parsed.rightTitle, optionBank: parsed.optionBank || [], allowOptionReuse: (typeof parsed.allowOptionReuse === 'boolean') ? parsed.allowOptionReuse : true };
    }
    if (contentType === 'MATCHING_FILLABLE' || contentType === 'MATCHING_HEADINGS_FILLABLE') {
      const parsed = JSON.parse(passageText);
      return { leftTitle: parsed.leftTitle || '' };
    }
    if (contentType === 'MAP_LABELLING') {
      const parsed = JSON.parse(passageText);
      return {
        instructions: parsed.instructions || '',
        rightTitle: parsed.rightTitle || '',
        imageWidth: parsed.imageWidth,
        pinBoxWidth: parsed.pinBoxWidth,
        constrainHalfPage: Boolean(parsed.constrainHalfPage),
        optionBank: parsed.optionBank || [],
        allowOptionReuse: (typeof parsed.allowOptionReuse === 'boolean') ? parsed.allowOptionReuse : true,
      };
    }
    if (contentType === 'FLOW_CHART') {
      const parsed = JSON.parse(passageText);
      return {
        title: parsed.title || '',
        flowNodes: parsed.flowNodes || [],
        bankTitle: parsed.bankTitle || '',
        optionBank: parsed.optionBank || [],
        allowOptionReuse: (typeof parsed.allowOptionReuse === 'boolean') ? parsed.allowOptionReuse : true,
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
    if (contentType === 'SHARED_OPTIONS_DROPDOWN') {
      const parsed = JSON.parse(passageText);
      return {
        sharedOptions: parsed.sharedOptions || [],
        mainInstruction: parsed.mainInstruction || '',
        subInstruction: parsed.subInstruction || '',
      };
    }
    if (contentType === 'CUSTOM') {
      const parsed = JSON.parse(passageText);
      const schema = parsed.schema || parsed.customSchema || {};
      // Backward compat: v1 answerKind -> v2 mode
      const v2 = schema?.answerKind
        ? {
            version: 2,
            mode: schema.answerKind === 'TEXT' ? 'BLANKS' : (schema.answerKind === 'MCQ_MULTI' ? 'MCQ_MULTI' : 'MCQ_SINGLE'),
            promptHtml: schema.promptHtml || '',
            optionBank: schema.optionBank || [],
            leftItems: [],
            chooseCount: 2,
          }
        : schema;
      return {
        customSchema: {
          version: 2,
          mode: v2.mode || 'BLANKS',
          promptHtml: v2.promptHtml || '',
          optionBank: v2.optionBank || [],
          leftItems: v2.leftItems || [],
          chooseCount: v2.chooseCount ?? 2,
        },
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
    'MCQ_DROPDOWN': 'MCQ_DROPDOWN',
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
