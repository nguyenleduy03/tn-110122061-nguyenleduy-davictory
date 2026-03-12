import { API_CONFIG } from '../config/api';

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
    signal: AbortSignal.timeout(10000),
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

    let globalQuestionCounter = 1;

    // 3. Transform parts từ TestFullResponse
    const populatedParts = targetSession.parts.map((part, index) => {
      let mergedPassageContent = '';
      let mergedPassageTitle = '';
      let questions = [];

      // Xử lý question groups
      (part.questionGroups || []).forEach(group => {
        if (group.passageText && !mergedPassageContent) {
          mergedPassageContent = group.passageText;
        }
        if (group.title && !mergedPassageTitle) {
          mergedPassageTitle = group.title;
        }

        // Transform questions
        (group.questions || []).forEach(q => {
          const typeCode = q.questionTypeCode?.toUpperCase() || '';
          let mappedType = 'fill-in-the-blank';
          if (['MCQ', 'TFNG', 'YNNG'].includes(typeCode)) {
            mappedType = 'multiple-choice';
          }

          const optionsList = q.options && q.options.length > 0
            ? q.options.map(opt => opt.optionText)
            : (mappedType === 'multiple-choice' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : []);

          questions.push({
            id: `q${q.id || globalQuestionCounter}`,
            number: q.questionNumber || globalQuestionCounter++,
            type: mappedType,
            text: q.questionText || 'Question text missing',
            options: optionsList,
            correctAnswer: q.answers?.[0]?.answerText || null,
          });
        });
      });

      return {
        id: `part-${part.testPartId}`,
        title: part.name || `Part ${part.orderIndex || index + 1}`,
        instruction: part.instructions || 'Read the text and answer the questions.',
        passageTitle: mergedPassageTitle || `Passage ${index + 1}`,
        passageContent: mergedPassageContent || '<p>Nội dung bài đọc chưa được thiết lập.</p>',
        questionsLabel: mergedPassageTitle || 'Questions',
        audioUrl: part.questionGroups?.[0]?.audioUrl || null,
        questions,
      };
    });

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

    // Lấy toàn bộ đề thi từ test-builder
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
        questionGroupId: writingGroup?.questionGroupId || null, // ID question_group để lưu bài
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
  // parts: mảng parts từ testData, mỗi phần tử có questionGroupId
  // writingAnswers: { [partId]: text }
  // timeTakenSeconds: tổng thời gian làm bài (giây)
  submitWriting: async (parts, writingAnswers, timeTakenSeconds = null) => {
    const baseUrl = API_CONFIG.BASE_URL;
    const results = [];

    for (const part of parts) {
      const text = writingAnswers[part.id] || '';
      if (!text.trim() || !part.questionGroupId) continue;

      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

      const payload = {
        questionGroupId: part.questionGroupId,
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
