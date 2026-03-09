import { MOCK_READING_DATA, MOCK_LISTENING_DATA, MOCK_WRITING_DATA, MOCK_SPEAKING_DATA } from '../data/mockData';
import { API_CONFIG } from '../config/api';

export const simulateBackendCall = async (data, delay = 500) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

export const ieltsApi = {
  getTestSession: async (testId, mode = "READING") => {
    const MOCK_DATA = mode === "LISTENING" ? MOCK_LISTENING_DATA
      : mode === "WRITING" ? MOCK_WRITING_DATA
      : mode === "SPEAKING" ? MOCK_SPEAKING_DATA
      : MOCK_READING_DATA;
    // Nếu là mock-session-id thì tiến hành bỏ qua fetch luôn để console không báo lỗi đỏ
    if (testId === "mock-session-id") {
      console.log("Đang chạy ở chế độ UI (sử dụng dữ liệu Mock hoàn toàn).");
      return simulateBackendCall({
        ...MOCK_DATA,
        sessionId: testId
      });
    }

    try {
      const targetTestId = testId;
      const baseUrl = API_CONFIG.BASE_URL;

      const testRes = await fetch(`${baseUrl}/tests/${targetTestId}`);
      if (!testRes.ok) throw new Error("Could not fetch test summary");
      const testData = await testRes.json();

      const sessionsRes = await fetch(`${baseUrl}/tests/${targetTestId}/sessions`);
      if (!sessionsRes.ok) throw new Error("Could not fetch sessions");
      const sessions = await sessionsRes.json();

      const readingSession = sessions.find(s => s.session?.skillType === "READING" || s.session?.name?.toLowerCase().includes("reading")) || sessions[0];
      if (!readingSession) throw new Error("No reading session found");

      const partsRes = await fetch(`${baseUrl}/tests/sessions/${readingSession.id}/parts`);
      const testParts = await partsRes.json();

      let globalQuestionCounter = 1;

      const populatedParts = await Promise.all(testParts.map(async (part, index) => {
        const qgRes = await fetch(`${baseUrl}/tests/parts/${part.id}/question-groups`);
        const qGroups = await qgRes.json();

        let mergedPassageContent = "";
        let mergedPassageTitle = "";
        let questions = [];

        for (let qgWrapper of qGroups) {
          const group = qgWrapper.questionGroup;
          if (!group) continue;

          if (group.passageText && !mergedPassageContent) {
            mergedPassageContent = group.passageText;
          }
          if (group.title && !mergedPassageTitle) {
            mergedPassageTitle = group.title;
          }

          if (group.questions && Array.isArray(group.questions)) {
            const sortedQuestions = [...group.questions].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

            sortedQuestions.forEach(q => {
              const questionTypeStr = q.questionType?.typeName?.toLowerCase() || "";

              let mappedType = "fill-in-the-blank";
              if (questionTypeStr.includes("choice") || questionTypeStr.includes("multiple") || questionTypeStr.includes("true_false")) {
                mappedType = "multiple-choice";
              } else if (q.questionType?.code === "MCQ" || q.questionType?.code === "TFNG" || q.questionType?.code === "YNNG") {
                mappedType = "multiple-choice";
              }

              const optionsList = q.options && q.options.length > 0
                ? q.options.map(opt => opt.optionText)
                : (mappedType === "multiple-choice" ? ["TRUE", "FALSE", "NOT GIVEN"] : []);

              questions.push({
                id: `q${q.id || globalQuestionCounter}`,
                number: q.questionNumber || globalQuestionCounter++,
                type: mappedType,
                text: q.questionText || "Question text missing",
                options: optionsList
              });
            });
          }
        }

        return {
          id: `part-${part.id || index + 1}`,
          title: `Part ${part.orderIndex || index + 1}`,
          instruction: part.instructions || "Read the text and answer the questions.",
          passageTitle: mergedPassageTitle || `Reading Passage ${index + 1}`,
          passageContent: mergedPassageContent || "<p>Nội dung bài đọc chưa được thiết lập.</p>",
          questionsLabel: mergedPassageTitle || "Questions",
          questions: questions
        };
      }));

      return {
        sessionId: readingSession.id || testId,
        candidateName: "Guest Student",
        candidateId: "DEFAULT-ID",
        testType: testData.testType || "Academic Reading",
        totalMinutes: testData.durationMinutes || readingSession.durationMinutes || 60,
        parts: populatedParts.length > 0 ? populatedParts : MOCK_DATA.parts
      };

    } catch (error) {
      console.log("Đang sử dụng dữ liệu giả (fallback) do chưa kết nối Backend.");
      return simulateBackendCall({
        ...MOCK_DATA,
        sessionId: testId
      });
    }
  },

  submitAnswers: async (sessionId, answers) => {
    console.log("Submitting to BE:", answers);
    return simulateBackendCall({
      success: true,
      message: "Test submitted successfully with: " + JSON.stringify(answers)
    });
  }
};
