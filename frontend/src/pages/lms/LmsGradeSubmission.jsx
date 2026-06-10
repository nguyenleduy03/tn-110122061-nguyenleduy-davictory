import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, User, Clock, FileText, Award, ClipboardList, CheckCircle2, History, Code } from 'lucide-react';
import { teacherApi } from '../../services/teacherApi';
import { ieltsApi } from '../../services/ieltsApi';
import { authApi } from '../../services/authApi';
import QuestionRenderer from '../../components/question/QuestionRenderer';
import { formatTextWithWhitespace } from '../../utils/textFormatters';
import { calculateExamBand, calculateWritingBandFromCriteria, formatBand } from '../../utils/ieltsScoring';
import AIGradingPanel from '../../components/ai/AIGradingPanel';
import '../../styles/lms.css';
import '../../styles/lmsGradeSubmission.css';
import '../../styles/ieltsTest.css';
import '../../styles/aiGrading.css';

const normalizeSkillToken = (value) => String(value || '').trim().toUpperCase();
const isWritingSkill = (value) => normalizeSkillToken(value).includes('WRITING');
const isSpeakingSkill = (value) => normalizeSkillToken(value).includes('SPEAKING');

export default function LmsGradeSubmission() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceParam = String(searchParams.get('source') || '').toLowerCase();
  const [submission, setSubmission] = useState(null);
  const [examReviewSession, setExamReviewSession] = useState(null);
  const [reviewAnswers, setReviewAnswers] = useState({});
  const [activeQuestion, setActiveQuestion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRawLlmInput, setShowRawLlmInput] = useState(false);
  const [attemptData, setAttemptData] = useState(null);
  const [writingSource, setWritingSource] = useState('none');
  const [forceWritingMode, setForceWritingMode] = useState(type === 'writing');
  const [gradeHistory, setGradeHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const feedbackDigitGuardUntilRef = useRef(0);
  const [grading, setGrading] = useState({
    feedback: '',
    taskAchievement: '',
    coherenceCohesion: '',
    lexicalResource: '',
    grammaticalRange: '',
    fluencyCoherence: '',
    grammaticalRangeAccuracy: '',
    pronunciation: ''
  });

  const normalizeDecimalInputText = (rawValue) => String(rawValue ?? '').replace(/,/g, '.');

  const normalizeIeltsBandValue = (rawValue) => {
    const raw = normalizeDecimalInputText(rawValue).trim();
    if (!raw) return '';
    if (!isValidIeltsBandPartial(raw)) return '';

    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 9) return '';
    if (Math.abs((numeric * 2) - Math.round(numeric * 2)) > 1e-9) return '';

    return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
  };

  const createWritingGradingState = () => ({
    feedback: '',
    taskAchievement: '',
    coherenceCohesion: '',
    lexicalResource: '',
    grammaticalRange: '',
    fluencyCoherence: '',
    grammaticalRangeAccuracy: '',
    pronunciation: ''
  });

  const createSpeakingGradingState = (source = {}) => {
    const score = source?.score || source?.speakingScore || {};
    return {
      feedback: '',
      taskAchievement: '',
      coherenceCohesion: '',
      lexicalResource: normalizeIeltsBandValue(score?.lexicalResource ?? source?.lexicalResource ?? ''),
      grammaticalRange: '',
      fluencyCoherence: normalizeIeltsBandValue(score?.fluencyCoherence ?? source?.fluencyCoherence ?? ''),
      grammaticalRangeAccuracy: normalizeIeltsBandValue(score?.grammaticalRangeAccuracy ?? source?.grammaticalRangeAccuracy ?? ''),
      pronunciation: normalizeIeltsBandValue(score?.pronunciation ?? source?.pronunciation ?? '')
    };
  };

  const isValidIeltsBandPartial = (rawValue) => {
    const value = normalizeDecimalInputText(rawValue).trim();
    if (value === '') return true;
    if (!/^\d(?:\.\d?)?$/.test(value)) return false;

    const [intPartRaw, decPartRaw] = value.split('.');
    const intPart = Number(intPartRaw);
    if (!Number.isFinite(intPart) || intPart < 0 || intPart > 9) return false;

    if (decPartRaw === undefined || decPartRaw === '') return true;
    if (decPartRaw !== '0' && decPartRaw !== '5') return false;
    if (intPart === 9 && decPartRaw === '5') return false;

    return true;
  };

  const sanitizeIeltsBandInput = (rawValue) => {
    const value = normalizeDecimalInputText(rawValue);
    if (!value) return '';

    let result = '';
    let hasDot = false;

    for (const ch of value) {
      if (/\d/.test(ch)) {
        if (!hasDot) {
          // Integer part is a single digit only (0-9).
          if (result.length === 0) {
            result = ch;
          }
          continue;
        }

        const [intPart, decPart = ''] = result.split('.');
        // Decimal part is a single digit and must be 0 or 5.
        if (decPart.length >= 1) continue;
        if (ch !== '0' && ch !== '5') continue;
        if (intPart === '9' && ch === '5') continue;
        result += ch;
        continue;
      }

      if (ch === '.') {
        if (hasDot) continue;
        if (!result) {
          // Allow starting with dot by normalizing to 0.
          result = '0';
        }
        hasDot = true;
        result += '.';
      }
    }

    return result;
  };

  const buildNextInputValue = (input, insertedText) => {
    const current = String(input?.value || '');
    const start = input?.selectionStart ?? current.length;
    const end = input?.selectionEnd ?? current.length;
    return `${current.slice(0, start)}${insertedText}${current.slice(end)}`;
  };

  const handleBandFieldKeyDown = (event) => {
    if (event.isComposing) return;

    const { key, currentTarget } = event;
    const ctrlOrMeta = event.ctrlKey || event.metaKey;

    if (ctrlOrMeta && ['a', 'c', 'v', 'x', 'z', 'y'].includes(key.toLowerCase())) return;
    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'Enter'].includes(key)) return;

    if (/^[0-9]$/.test(key) || key === '.' || key === ',') {
      const inserted = key === ',' ? '.' : key;
      const nextValue = buildNextInputValue(currentTarget, inserted);
      if (!isValidIeltsBandPartial(nextValue)) {
        event.preventDefault();
      }
      return;
    }

    if (key.length === 1) {
      event.preventDefault();
    }
  };

  const handleBandFieldBeforeInput = (event) => {
    if (event.isComposing) return;
    if (!event.inputType || !event.inputType.startsWith('insert')) return;

    const inserted = normalizeDecimalInputText(event.data ?? '').replace(/\s+/g, '');
    if (!inserted) return;
    if (!/^[\d.]+$/.test(inserted)) {
      event.preventDefault();
      return;
    }

    const nextValue = buildNextInputValue(event.currentTarget, inserted);
    if (!isValidIeltsBandPartial(nextValue)) {
      event.preventDefault();
    }
  };

  const handleBandFieldPaste = (field) => (event) => {
    event.preventDefault();

    const pasted = normalizeDecimalInputText(event.clipboardData?.getData('text') || '').replace(/\s+/g, '');
    if (!pasted) return;
    if (!/^[\d.]+$/.test(pasted)) return;

    const nextValue = buildNextInputValue(event.currentTarget, pasted);
    if (!isValidIeltsBandPartial(nextValue)) return;

    setGrading((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
  };

  const parseValidBandForRubric = (rawValue) => {
    const raw = normalizeDecimalInputText(rawValue).trim();
    if (!raw) return null;
    if (!/^\d(?:\.\d)?$/.test(raw)) return null;

    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 9) return null;
    if (Math.abs((numeric * 2) - Math.round(numeric * 2)) > 1e-9) return null;

    return numeric;
  };

  const handleBandFieldChange = (field) => (event) => {
    const nextValue = sanitizeIeltsBandInput(event.target.value);
    setGrading((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
  };

  const handleBandFieldBlur = (field) => (event) => {
    feedbackDigitGuardUntilRef.current = Date.now() + 220;
    const normalizedValue = normalizeIeltsBandValue(event.target.value);
    setGrading((prev) => ({
      ...prev,
      [field]: normalizedValue,
    }));
  };

  const handleBandFieldFocus = (event) => {
    // Select all so a single Backspace/Delete clears the current score quickly.
    requestAnimationFrame(() => {
      event.target.select();
    });
  };

  const shouldGuardFeedbackDigitInput = () => Date.now() < feedbackDigitGuardUntilRef.current;

  const handleFeedbackKeyDown = (event) => {
    if (!shouldGuardFeedbackDigitInput()) return;
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  };

  const handleFeedbackBeforeInput = (event) => {
    if (!shouldGuardFeedbackDigitInput()) return;
    const incoming = String(event.data ?? '');
    if (/^[0-9]+$/.test(incoming)) {
      event.preventDefault();
    }
  };

  const normalizeAnswerValue = (ans) => {
    if (ans?.matchingAnswer && String(ans.matchingAnswer).trim() !== '') {
      try {
        return JSON.parse(ans.matchingAnswer);
      } catch {
        return ans.matchingAnswer;
      }
    }

    if (ans?.textAnswer && String(ans.textAnswer).trim() !== '') {
      return ans.textAnswer;
    }

    if (ans?.selectedOptionLabel && String(ans.selectedOptionLabel).trim() !== '') {
      return ans.selectedOptionLabel;
    }

    return '';
  };

  const isLikelyDrivePreviewUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return false;
    return /(\/api\/files\/preview\/|https?:\/\/.*\/api\/files\/preview\/)/i.test(raw);
  };

  const normalizeTextFromDriveFile = (content) => {
    const text = String(content || '').replace(/\r\n/g, '\n').trim();
    if (!text) return '';

    const splitMarker = '\n\n';
    const markerIndex = text.indexOf(splitMarker);
    if (markerIndex > -1) {
      const essayBody = text.slice(markerIndex + splitMarker.length).trim();
      if (essayBody) return essayBody;
    }

    return text;
  };

  const loadWritingTextFromDriveUrls = async (answers = []) => {
    const urls = [];
    const seen = new Set();

    answers.forEach((answer) => {
      [answer?.selectedOptionLabel, answer?.textAnswer]
        .map((value) => String(value || '').trim())
        .forEach((candidate) => {
          if (!isLikelyDrivePreviewUrl(candidate) || seen.has(candidate)) return;
          seen.add(candidate);
          urls.push(candidate);
        });
    });

    if (!urls.length) return '';

    const chunks = [];
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const text = normalizeTextFromDriveFile(await response.text());
        if (text) chunks.push(text);
      } catch {
        // Ignore unreadable files and fallback to DB text.
      }
    }

    return chunks.join('\n\n').trim();
  };

  const isDragDropOrMatchingAnswer = (answer) => {
    if (answer?.matchingAnswer && String(answer.matchingAnswer).trim() !== '') return true;
    return false;
  };

  const buildWritingLikeFromExamAttempt = async (attempt) => {
    const answers = Array.isArray(attempt?.answers) ? attempt.answers : [];
    const fallbackSubmissionText = answers
      .filter((a) => !isDragDropOrMatchingAnswer(a))
      .map((a) => String(a?.textAnswer || '').trim())
      .filter((text) => text && !isLikelyDrivePreviewUrl(text))
      .join('\n\n')
      .trim();

    const driveSubmissionText = await loadWritingTextFromDriveUrls(answers);
    const submissionText = driveSubmissionText || fallbackSubmissionText;

    const derivedWordCount = submissionText
      ? submissionText.split(/\s+/).filter(Boolean).length
      : 0;

    return {
      id: attempt?.id,
      username: attempt?.username,
      submittedAt: attempt?.submittedAt || attempt?.startedAt,
      startedAt: attempt?.startedAt,
      gradedAt: attempt?.gradedAt,
      status: attempt?.status,
      groupTitle: attempt?.testTitle || 'Writing Submission',
      submissionText,
      wordCount: attempt?.wordCount ?? derivedWordCount,
      timeSpentSeconds: attempt?.timeSpentSeconds,
      sourceExamAttemptId: attempt?.id,
      overallBandScore: attempt?.bandScore,
      overallFeedback: attempt?.feedback,
      gradedByUsername: attempt?.gradedByUsername ?? null,
      gradedByFullName: attempt?.gradedByFullName ?? null,
    };
  };

  const resolveSingleOptionValue = (rawValue, options = []) => {
    if (typeof rawValue !== 'string' || !Array.isArray(options) || options.length === 0) {
      return rawValue;
    }

    const normalizeText = (value) => String(value || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    const trimmed = rawValue.trim();
    if (!trimmed) return rawValue;

    const normalizedRaw = normalizeText(trimmed);

    const exact = options.find((opt) => normalizeText(opt) === normalizedRaw);
    if (exact) return exact;

    // Support answer stored as numeric option index: 1,2,3...
    if (/^\d+$/.test(trimmed)) {
      const oneBased = Number(trimmed);
      const byIndex = options[oneBased - 1];
      if (byIndex !== undefined) return byIndex;
    }

    const shortLabel = trimmed.match(/^([A-Za-z])[\).:-]?$/)?.[1]?.toUpperCase();
    if (shortLabel) {
      const matchedByPrefix = options.find((opt) => {
        const text = normalizeText(opt);
        return new RegExp(`^${shortLabel.toLowerCase()}[\\).:-]`, 'i').test(text);
      });
      if (matchedByPrefix) return matchedByPrefix;

      // Fallback: map A/B/C... by option index when option text does not carry label prefix.
      const index = shortLabel.charCodeAt(0) - 65;
      if (index >= 0 && index < options.length) {
        return options[index];
      }
    }

    // Loose fallback: remove label prefix and compare core text.
    const stripLabelPrefix = (value) => normalizeText(value).replace(/^[a-z]\s*[\).:-]\s*/i, '');
    const rawCore = stripLabelPrefix(trimmed);
    const byCoreText = options.find((opt) => stripLabelPrefix(opt) === rawCore);
    if (byCoreText) return byCoreText;

    return rawValue;
  };

  const resolveOptionLikeAnswer = (rawValue, options = []) => {
    if (Array.isArray(rawValue)) {
      return rawValue.map((item) => resolveSingleOptionValue(item, options));
    }
    return resolveSingleOptionValue(rawValue, options);
  };

  const buildReviewAnswers = (attemptAnswers = [], reviewSession = null) => {
    const baseMap = attemptAnswers.reduce((acc, ans) => {
      if (!ans?.questionId) return acc;

      const finalValue = normalizeAnswerValue(ans);
      const prefixedKey = `q${ans.questionId}`;

      // Keep both key formats to support mixed question data shapes.
      acc[prefixedKey] = finalValue;
      acc[ans.questionId] = finalValue;
      return acc;
    }, {});

    if (!reviewSession?.parts?.length) {
      return baseMap;
    }

    reviewSession.parts.forEach((part) => {
      (part.questions || []).forEach((question) => {
        const keys = [question.id, String(question.id || '')];
        const current = keys.map((k) => baseMap[k]).find((v) => v !== undefined);
        if (current === undefined) return;

        const resolved = resolveOptionLikeAnswer(current, question.options || []);
        keys.forEach((k) => {
          if (k !== undefined && k !== null && k !== '') {
            baseMap[k] = resolved;
          }
        });
      });
    });

    return baseMap;
  };

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        let effectiveSource = sourceParam;

        if (!effectiveSource && type === 'writing') {
          try {
            const all = await teacherApi.getAllSubmissions();
            const targetId = String(id);
            const hasWriting = (all?.writingSubmissions || []).some((item) => String(item?.id) === targetId);
            const hasExam = (all?.examAttempts || []).some((item) => String(item?.id) === targetId);

            if (hasExam && !hasWriting) effectiveSource = 'exam';
            if (hasWriting && !hasExam) effectiveSource = 'writing';
          } catch (lookupError) {
            console.warn('Cannot pre-resolve grading source:', lookupError);
          }
        }

        if (effectiveSource === 'writing') {
          const data = await teacherApi.getWritingSubmission(id);
          setSubmission(data);
          setWritingSource('writing');
          setForceWritingMode(true);
          if (data.overallBandScore) {
            setGrading(createWritingGradingState());
          }
          return;
        }

        if (effectiveSource === 'exam') {
          const data = await teacherApi.getExamAttemptDetail(id);
          setAttemptData(data);
          const skill = String(data?.skillType || data?.examType || '');
          if (isWritingSkill(skill)) {
            const mapped = await buildWritingLikeFromExamAttempt(data);
            setSubmission(mapped);
            setWritingSource('exam');
            setForceWritingMode(true);
            if (mapped.overallBandScore !== null && mapped.overallBandScore !== undefined) {
              setGrading(createWritingGradingState());
            }
          } else {
            let loadedSubmission = data;
            if (isSpeakingSkill(skill)) {
              try {
                const speakingAttempt = await teacherApi.getSpeakingAttempt(id);
                loadedSubmission = {
                  ...data,
                  ...speakingAttempt,
                  score: speakingAttempt?.score || data?.score,
                  feedback: speakingAttempt?.feedback || data?.feedback || '',
                };
                setGrading(createSpeakingGradingState(loadedSubmission));
              } catch (speakingError) {
                console.warn('Cannot load speaking attempt grading details:', speakingError);
              }
            }

            setForceWritingMode(false);
            setWritingSource('none');
            setSubmission(loadedSubmission);
            if (loadedSubmission?.testId && loadedSubmission?.skillType) {
              const reviewSession = await ieltsApi.getTestSession(loadedSubmission.testId, loadedSubmission.skillType);
              setExamReviewSession(reviewSession);
              setReviewAnswers(buildReviewAnswers(loadedSubmission.answers || [], reviewSession));
            }
          }
          return;
        }

        if (type === 'writing') {
          try {
            const data = await teacherApi.getWritingSubmission(id);
            setSubmission(data);
            setWritingSource('writing');
            if (data.overallBandScore) {
              setGrading(createWritingGradingState());
            }
          } catch {
            const examData = await teacherApi.getExamAttemptDetail(id);
            setAttemptData(examData);
            const skill = String(examData?.skillType || examData?.examType || '');
            if (!isWritingSkill(skill)) {
              throw new Error('Submission is not WRITING');
            }

            const mapped = await buildWritingLikeFromExamAttempt(examData);
            setSubmission(mapped);
            setWritingSource('exam');
            if (mapped.overallBandScore !== null && mapped.overallBandScore !== undefined) {
              setGrading(createWritingGradingState());
            }
          }
        } else {
          const data = await teacherApi.getExamAttemptDetail(id);
          setAttemptData(data);
          const skill = String(data?.skillType || data?.examType || '');
          if (isWritingSkill(skill)) {
            const mapped = await buildWritingLikeFromExamAttempt(data);
            setSubmission(mapped);
            setWritingSource('exam');
            setForceWritingMode(true);
          } else {
            let loadedSubmission = data;
            if (isSpeakingSkill(skill)) {
              try {
                const speakingAttempt = await teacherApi.getSpeakingAttempt(id);
                loadedSubmission = {
                  ...data,
                  ...speakingAttempt,
                  score: speakingAttempt?.score || data?.score,
                  feedback: speakingAttempt?.feedback || data?.feedback || '',
                };
                setGrading(createSpeakingGradingState(loadedSubmission));
              } catch (speakingError) {
                console.warn('Cannot load speaking attempt grading details:', speakingError);
              }
            }

            setForceWritingMode(false);
            setWritingSource('none');
            setSubmission(loadedSubmission);
          }

          if (!isWritingSkill(skill) && data?.testId && data?.skillType) {
            const reviewSession = await ieltsApi.getTestSession(data.testId, data.skillType);
            setExamReviewSession(reviewSession);

            setReviewAnswers(buildReviewAnswers(data.answers || [], reviewSession));
          }
        }
      } catch (error) {
        console.error('Error loading submission:', error);
        setError('Không thể tải bài làm để chấm. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };
    loadSubmission();
  }, [id, type, sourceParam]);

  const handleSubmitGrade = async () => {
    try {
      const currentSkillType = String(submission?.skillType || submission?.examType || '');
      const isSpeakingSubmission = !forceWritingMode && isSpeakingSkill(currentSkillType);

      if (isSpeakingSubmission) {
        const fluencyCoherence = parseValidBandForRubric(grading.fluencyCoherence);
        const lexicalResource = parseValidBandForRubric(grading.lexicalResource);
        const grammaticalRangeAccuracy = parseValidBandForRubric(grading.grammaticalRangeAccuracy);
        const pronunciation = parseValidBandForRubric(grading.pronunciation);

        if ([fluencyCoherence, lexicalResource, grammaticalRangeAccuracy, pronunciation].some((value) => value === null)) {
          alert('Vui lòng nhập đủ 4 tiêu chí Speaking (0.0 - 9.0, bước 0.5).');
          return;
        }

        await teacherApi.gradeSpeakingAttempt(id, {
          fluencyCoherence,
          lexicalResource,
          grammaticalRangeAccuracy,
          pronunciation,
          feedback: grading.feedback,
        });

        alert('Đã chấm bài thành công!');
        navigate(-1);
        return;
      }

      const computedBand = calculateWritingBandFromCriteria({
        taskAchievement: grading.taskAchievement,
        coherenceCohesion: grading.coherenceCohesion,
        lexicalResource: grading.lexicalResource,
        grammaticalRange: grading.grammaticalRange,
      });
      const existingBand = submission?.overallBandScore ?? submission?.bandScore ?? null;
      const finalBand = computedBand ?? existingBand;

      if (finalBand === null) {
        alert('Vui lòng nhập đủ 4 tiêu chí rubric cho lần chấm đầu tiên.');
        return;
      }

      if (writingSource === 'writing') {
        await teacherApi.gradeWritingSubmission(id, {
          overallBandScore: finalBand,
          overallFeedback: grading.feedback,
        });
      } else {
        try {
          await teacherApi.updateExamAttemptGrade(id, {
            bandScore: finalBand,
            feedback: grading.feedback,
          });
        } catch (examGradeError) {
          const status = examGradeError?.response?.status;
          const canFallbackToWritingEndpoint = status === 404 || status === 405;

          if (!canFallbackToWritingEndpoint) {
            throw examGradeError;
          }

          // Compatibility fallback for environments routing Writing grading via /api/writing/grade/{id}
          await teacherApi.gradeWritingSubmission(id, {
            overallBandScore: finalBand,
            overallFeedback: grading.feedback,
          });
        }
      }
      alert('Đã chấm bài thành công!');
      navigate(-1);
    } catch (error) {
      console.error('Error grading:', error);
      const backendErrorMessage =
        error?.response?.data?.error
        || error?.response?.data?.message
        || error?.message
        || 'Lỗi khi chấm bài';
      alert(backendErrorMessage);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString('vi-VN');
  };

  const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return 'N/A';
    const total = Number(seconds);
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const firstNonBlankText = (...values) => {
    for (const value of values) {
      const text = String(value ?? '').trim();
      if (text) return text;
    }
    return '';
  };

  const resolveTeacherDisplayName = (item = {}, fallback = {}) => {
    const fullName = firstNonBlankText(
      item?.editedByFullName,
      item?.gradedByFullName,
      fallback?.editedByFullName,
      fallback?.gradedByFullName,
    );
    if (fullName) return fullName;
    const username = firstNonBlankText(
      item?.editedByUsername,
      item?.gradedByUsername,
      fallback?.editedByUsername,
      fallback?.gradedByUsername,
    );
    if (username) return username;
    return 'N/A';
  };

  const normalizeHistoryEntries = (entries = [], fallbackTeacher = {}) => {
    return entries
      .map((item, index) => ({
        id: item?.id ?? `history-${index}`,
        editedByUsername: firstNonBlankText(
          item?.editedByUsername,
          item?.gradedByUsername,
          fallbackTeacher?.editedByUsername,
          fallbackTeacher?.gradedByUsername,
        ) || null,
        editedByFullName: firstNonBlankText(
          item?.editedByFullName,
          item?.gradedByFullName,
          fallbackTeacher?.editedByFullName,
          fallbackTeacher?.gradedByFullName,
        ) || null,
        editedByDisplayName: resolveTeacherDisplayName(item, fallbackTeacher),
        editorRole: item?.editorRole || null,
        oldBandScore: item?.oldBandScore ?? null,
        newBandScore: item?.newBandScore ?? item?.overallBandScore ?? item?.bandScore ?? null,
        oldFeedback: item?.oldFeedback ?? null,
        newFeedback: item?.newFeedback ?? item?.overallFeedback ?? item?.feedback ?? null,
        editedAt: item?.editedAt || item?.gradedAt || item?.updatedAt || item?.createdAt || null,
      }))
      .sort((a, b) => {
        const timeA = a?.editedAt ? new Date(a.editedAt).getTime() : 0;
        const timeB = b?.editedAt ? new Date(b.editedAt).getTime() : 0;
        return timeB - timeA;
      });
  };

  useEffect(() => {
    if (!submission) {
      setHistoryLoading(false);
      setHistoryError('');
      setGradeHistory([]);
      return;
    }

    const skill = String(submission?.skillType || submission?.examType || '').toUpperCase();
    const shouldUseExamHistory = writingSource === 'exam' || type === 'exam' || isSpeakingSkill(skill);
    const shouldLoadHistory = shouldUseExamHistory
      || forceWritingMode
      || type === 'writing'
      || writingSource === 'writing'
      || isWritingSkill(skill);

    if (!shouldLoadHistory) {
      setHistoryLoading(false);
      setHistoryError('');
      setGradeHistory([]);
      return;
    }

    let cancelled = false;
    let timeoutId = null;

    const withTimeout = (promise, timeoutMs = 8000) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('GRADE_HISTORY_TIMEOUT'));
          }, timeoutMs);
        }),
      ]);
    };

    const loadGradeHistory = async () => {
      setHistoryLoading(true);
      setHistoryError('');

      try {
        let rawHistory = [];
        const currentUser = authApi.getStoredUser?.() || null;
        const fallbackTeacher = {
          editedByUsername: firstNonBlankText(submission?.gradedByUsername, currentUser?.username) || null,
          editedByFullName: firstNonBlankText(submission?.gradedByFullName, currentUser?.fullName, currentUser?.username) || null,
          gradedByUsername: firstNonBlankText(submission?.gradedByUsername, currentUser?.username) || null,
          gradedByFullName: firstNonBlankText(submission?.gradedByFullName, currentUser?.fullName, currentUser?.username) || null,
        };

        if (shouldUseExamHistory) {
          const attemptId = submission?.sourceExamAttemptId || id || submission?.id;
          rawHistory = await withTimeout(teacherApi.getExamAttemptGradeHistory(attemptId));
        } else {
          const writingSubmissionId = submission?.id || id;
          rawHistory = await withTimeout(teacherApi.getWritingGradeHistory(writingSubmissionId));
        }

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (cancelled) return;

        const normalizedHistory = normalizeHistoryEntries(Array.isArray(rawHistory) ? rawHistory : [], fallbackTeacher);
        setGradeHistory(normalizedHistory);
      } catch (historyLoadError) {
        if (cancelled) return;
        console.warn('Error loading grade history:', historyLoadError);
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        setHistoryError('Không tải được lịch sử chấm điểm. Vui lòng thử tải lại trang.');
        setGradeHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadGradeHistory();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [submission, writingSource, forceWritingMode, type, id]);

  const renderExamAnswerRows = () => {
    const answers = submission?.answers || [];
    if (answers.length === 0) {
      return (
        <div style={{
          background: '#f8fafc',
          border: '1px dashed #cbd5e1',
          borderRadius: 10,
          padding: 18,
          color: '#64748b',
          fontSize: 14
        }}>
          Bài thi này chưa có chi tiết đáp án để hiển thị.
        </div>
      );
    }

    return (
      <div style={{ overflowX: 'auto' }}>
        <table className="lms-table">
          <thead>
            <tr>
              <th>Câu hỏi</th>
              <th>Đáp án học viên</th>
              <th>Loại trả lời</th>
              <th>Đánh dấu</th>
            </tr>
          </thead>
          <tbody>
            {answers.map((ans, index) => {
              const textAnswer = ans.textAnswer?.trim();
              const optionAnswer = ans.selectedOptionLabel?.trim();
              const matchingAnswer = ans.matchingAnswer?.trim();

              let displayValue = textAnswer || optionAnswer || matchingAnswer || 'Không trả lời';
              let answerType = 'Trống';
              if (optionAnswer) answerType = 'Option';
              if (textAnswer) answerType = 'Text';
              if (matchingAnswer) answerType = 'Matching/JSON';

              return (
                <tr key={`${ans.questionId || index}-${index}`}>
                  <td style={{ fontWeight: 600 }}>#{ans.questionId || index + 1}</td>
                  <td style={{ whiteSpace: 'pre-wrap', maxWidth: 420 }}>{displayValue}</td>
                  <td>{answerType}</td>
                  <td>
                    {ans.isFlagged ? (
                      <span className="lms-pill warn">Flagged</span>
                    ) : (
                      <span className="lms-pill neutral">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const getTotalQuestionCount = () => {
    if (!examReviewSession?.parts?.length) return submission?.totalAnswered || 0;

    const totalByPartMeta = examReviewSession.parts.reduce((sum, part) => {
      const value = Number(part?.totalQuestions || 0);
      return sum + (Number.isFinite(value) && value > 0 ? value : 0);
    }, 0);
    if (totalByPartMeta > 0) return totalByPartMeta;

    return examReviewSession.parts.reduce((partSum, part) => {
      const questions = part.questions || [];
      return partSum + questions.reduce((qSum, q) => {
        if (Array.isArray(q.numberRange) && q.numberRange.length > 0) return qSum + q.numberRange.length;
        if (Array.isArray(q.subQuestions) && q.subQuestions.length > 0) return qSum + q.subQuestions.length;
        return qSum + 1;
      }, 0);
    }, 0);
  };

  const renderExamReviewByQuestions = () => {
    if (!examReviewSession?.parts?.length) {
      return renderExamAnswerRows();
    }

    return (
      <>
        {!isSpeaking && (
          <div className="review-score-banner" style={{ marginBottom: 16 }}>
            <div className="review-score-main">
              Score: {Number.isFinite(submission?.totalCorrect) ? submission.totalCorrect : 0}
              {' / '}
              {getTotalQuestionCount()}
            </div>
            <div className="review-score-sub">
              Band score: {formatBand(displayExamBand)} / 9.0
            </div>
          </div>
        )}

        {examReviewSession.parts.map((part, partIndex) => (
          <div
            key={part.id || `part-${partIndex}`}
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16
            }}
          >
            <h4 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>
              {part.title || part.name || `Part ${partIndex + 1}`}
            </h4>

            {part.instruction && (
              <div
                style={{ marginBottom: 12, color: '#334155', fontSize: 14 }}
                dangerouslySetInnerHTML={{ __html: formatTextWithWhitespace(part.instruction) }}
              />
            )}

            {part.passageContent && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 14,
                  borderRadius: 10,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  maxHeight: 360,
                  overflowY: 'auto'
                }}
                className="passage-content"
                dangerouslySetInnerHTML={{ __html: part.passageContent }}
              />
            )}

            <div style={{ display: 'grid', gap: 16 }}>
              {(part.questions || []).map((q) => (
                <QuestionRenderer
                  key={q.id}
                  q={q}
                  activeQuestion={activeQuestion}
                  setActiveQuestion={setActiveQuestion}
                  answers={reviewAnswers}
                  handleAnswerChange={() => { }}
                  bookmarks={{}}
                  toggleBookmark={() => { }}
                  inputRefs={{ current: {} }}
                  isReview
                />
              ))}
            </div>
          </div>
        ))}
      </>
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: 24 }}>
        <div className="lms-panel" style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center', padding: 40 }}>
          <p>Đang tải bài làm...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: 24 }}>
        <div className="lms-panel" style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#dc2626', marginBottom: 16 }}>{error}</p>
          <button className="lms-cta" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: 24 }}>
        <div className="lms-panel" style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center', padding: 40 }}>
          <p>Không tìm thấy bài làm</p>
          <button className="lms-cta" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Quay lại
          </button>
        </div>
      </div>
    );
  }

  const resolvedSkillType = String(submission?.skillType || submission?.examType || '');
  const resolvedSkillToken = normalizeSkillToken(resolvedSkillType);
  const isWriting = forceWritingMode || isWritingSkill(resolvedSkillType);
  const examType = resolvedSkillToken || 'EXAM';
  const isSpeaking = !isWriting && isSpeakingSkill(resolvedSkillType);
  const computedWritingBand = calculateWritingBandFromCriteria({
    taskAchievement: grading.taskAchievement,
    coherenceCohesion: grading.coherenceCohesion,
    lexicalResource: grading.lexicalResource,
    grammaticalRange: grading.grammaticalRange,
  });
  const rubricFieldStatus = {
    taskAchievement: parseValidBandForRubric(grading.taskAchievement) !== null,
    coherenceCohesion: parseValidBandForRubric(grading.coherenceCohesion) !== null,
    lexicalResource: parseValidBandForRubric(grading.lexicalResource) !== null,
    grammaticalRange: parseValidBandForRubric(grading.grammaticalRange) !== null,
  };
  const hasInvalidRubricField = Object.values(rubricFieldStatus).some((isValid) => !isValid);
  const finalWritingBand = hasInvalidRubricField ? null : computedWritingBand;
  const hasExistingWritingBand = submission?.overallBandScore != null || submission?.bandScore != null;
  const canSaveWritingGrade = isWriting && (finalWritingBand !== null || hasExistingWritingBand);
  const isWritingSubmissionGraded = isWriting && (
    String(submission?.status || '').toUpperCase() === 'GRADED'
    || submission?.overallBandScore != null
    || submission?.bandScore != null
  );
  const writingActionLabel = isWritingSubmissionGraded ? 'Sửa điểm' : 'Chấm bài';

  const speakingRubricFieldStatus = {
    fluencyCoherence: parseValidBandForRubric(grading.fluencyCoherence) !== null,
    lexicalResource: parseValidBandForRubric(grading.lexicalResource) !== null,
    grammaticalRangeAccuracy: parseValidBandForRubric(grading.grammaticalRangeAccuracy) !== null,
    pronunciation: parseValidBandForRubric(grading.pronunciation) !== null,
  };
  const hasInvalidSpeakingRubricField = Object.values(speakingRubricFieldStatus).some((isValid) => !isValid);
  const parsedSpeakingScores = {
    fluencyCoherence: parseValidBandForRubric(grading.fluencyCoherence),
    lexicalResource: parseValidBandForRubric(grading.lexicalResource),
    grammaticalRangeAccuracy: parseValidBandForRubric(grading.grammaticalRangeAccuracy),
    pronunciation: parseValidBandForRubric(grading.pronunciation),
  };
  const speakingBandPreview = hasInvalidSpeakingRubricField
    ? null
    : (Object.values(parsedSpeakingScores).reduce((sum, value) => sum + value, 0) / 4);
  const hasExistingSpeakingBand = submission?.bandScore != null;
  const canSaveSpeakingGrade = isSpeaking && !hasInvalidSpeakingRubricField;
  const isSpeakingSubmissionGraded = isSpeaking && (
    String(submission?.status || '').toUpperCase() === 'GRADED'
    || hasExistingSpeakingBand
    || Object.values(parsedSpeakingScores).some((value) => value !== null)
  );
  const speakingActionLabel = isSpeakingSubmissionGraded ? 'Sửa điểm' : 'Chấm bài';
  const gradeActionLabel = isWriting ? writingActionLabel : speakingActionLabel;
  const canSubmitGrade = isWriting ? canSaveWritingGrade : (isSpeaking ? canSaveSpeakingGrade : false);

  const calculatedExamBand = calculateExamBand({
    skillType: examType,
    totalCorrect: submission.totalCorrect,
  });
  const displayExamBand = submission?.bandScore ?? calculatedExamBand;
  const inferredDurationSeconds = submission?.submittedAt && submission?.startedAt
    ? Math.max(0, Math.floor((new Date(submission.submittedAt).getTime() - new Date(submission.startedAt).getTime()) / 1000))
    : null;
  const submissionDurationSeconds = submission?.timeSpentSeconds ?? submission?.timeTakenSeconds ?? inferredDurationSeconds;

  const normalizeQuestionKey = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const match = raw.match(/^q?(\d+)$/i);
    return match ? match[1] : raw;
  };

  const questionIdToPartLabelMap = (() => {
    const map = new Map();
    const parts = examReviewSession?.parts || [];

    parts.forEach((part, partIndex) => {
      const partNumber = Number(part?.partNumber);
      const resolvedPartNumber = Number.isFinite(partNumber) && partNumber > 0
        ? partNumber
        : (partIndex + 1);
      const partLabel = `Part ${resolvedPartNumber}`;

      (part?.questions || []).forEach((question) => {
        const key = normalizeQuestionKey(question?.id);
        if (key) {
          map.set(key, partLabel);
        }
      });
    });

    return map;
  })();

  const isLikelyAudioUrl = (value) => {
    const raw = String(value || '').trim();
    return /^(https?:\/\/|blob:|data:audio\/|\/)/i.test(raw);
  };

  const speakingRecordings = (() => {
    const records = [];
    const seen = new Set();
    const urlToPartLabel = new Map();
    let fallbackPartCounter = 1;

    const resolvePartLabel = (normalizedUrl, preferredLabel) => {
      if (urlToPartLabel.has(normalizedUrl)) {
        return urlToPartLabel.get(normalizedUrl);
      }

      const nextLabel = preferredLabel || `Part ${fallbackPartCounter}`;
      urlToPartLabel.set(normalizedUrl, nextLabel);

      const matchedPart = String(nextLabel).match(/^Part\s+(\d+)$/i);
      if (matchedPart) {
        const partNo = Number(matchedPart[1]);
        if (Number.isFinite(partNo) && partNo >= fallbackPartCounter) {
          fallbackPartCounter = partNo + 1;
        }
      } else if (!preferredLabel) {
        fallbackPartCounter += 1;
      }

      return nextLabel;
    };

    const pushRecord = (url, preferredLabel) => {
      const normalizedUrl = String(url || '').trim();
      if (!normalizedUrl || seen.has(normalizedUrl)) return;
      if (!isLikelyAudioUrl(normalizedUrl)) return;

      const label = resolvePartLabel(normalizedUrl, preferredLabel);
      seen.add(normalizedUrl);
      records.push({ label, url: normalizedUrl });
    };

    (submission?.answers || []).forEach((answer, index) => {
      const questionKey = normalizeQuestionKey(answer?.questionId || index + 1);
      const partLabel = questionIdToPartLabelMap.get(questionKey) || null;
      pushRecord(answer?.audioUrl, partLabel);
      pushRecord(answer?.textAnswer, partLabel);
      pushRecord(answer?.selectedOptionLabel, partLabel);
    });

    if (Array.isArray(submission?.audioUrls)) {
      submission.audioUrls.forEach((url, index) => {
        pushRecord(url, `Part ${index + 1}`);
      });
    }

    if (submission?.audioUrl) {
      pushRecord(submission.audioUrl, null);
    }

    return records;
  })();

  const renderGradeHistorySection = () => {
    if (!isWriting && !isSpeaking) return null;

    return (
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        border: '1px solid #e5e7eb',
        marginTop: 20
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: 18,
          fontWeight: 600,
          color: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <History size={18} /> Lịch sử chấm điểm
        </h3>

        {historyLoading && (
          <div style={{ fontSize: 13, color: '#64748b' }}>
            Đang tải lịch sử chấm điểm...
          </div>
        )}

        {!historyLoading && historyError && (
          <div style={{ fontSize: 13, color: '#b91c1c' }}>
            {historyError}
          </div>
        )}

        {!historyLoading && !historyError && gradeHistory.length === 0 && (
          <div style={{ fontSize: 13, color: '#64748b' }}>
            Chưa có lịch sử chấm điểm.
          </div>
        )}

        {!historyLoading && !historyError && gradeHistory.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Giáo viên chấm</th>
                  <th>Band</th>
                  <th>Thời gian chấm bài</th>
                  <th>Nhận xét</th>
                </tr>
              </thead>
              <tbody>
                {gradeHistory.map((entry, index) => {
                  const hasFeedback = entry.newFeedback && String(entry.newFeedback).trim() !== '';
                  const hasBand = entry.newBandScore !== null && entry.newBandScore !== undefined;
                  const teacherLabel = entry.editedByDisplayName || resolveTeacherDisplayName(entry);

                  return (
                    <tr key={`${entry.id}-${index}`}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{teacherLabel}</div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f766e' }}>
                        {hasBand ? formatBand(entry.newBandScore) : 'N/A'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {entry.editedAt ? formatDateTime(entry.editedAt) : 'N/A'}
                      </td>
                      <td style={{ minWidth: 280, whiteSpace: 'pre-wrap' }}>
                        {hasFeedback ? entry.newFeedback : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'Sora, sans-serif' }}>
      <div style={{
        background: 'white',
        borderBottom: '2px solid #e5e7eb',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <button
              className="lms-cta ghost"
              onClick={() => navigate(-1)}
              style={{ marginBottom: 8 }}
            >
              <ArrowLeft size={14} /> Quay lại
            </button>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
              {isWriting
                ? 'Chấm bài Writing'
                : isSpeaking
                  ? 'Chấm bài Speaking'
                  : `Chi tiết chấm bài ${examType}`}
            </h2>
          </div>
          {(isWriting || isSpeaking) ? (
            <button
              className="lms-cta"
              onClick={handleSubmitGrade}
              disabled={!canSubmitGrade}
            >
              <Save size={14} /> {gradeActionLabel}
            </button>
          ) : (
            <span className="lms-pill success">
              <CheckCircle2 size={14} style={{ marginRight: 6 }} />
              Chế độ xem chấm bài thi
            </span>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: (isWriting || isSpeaking) ? '1fr 400px' : '1fr', gap: 24 }}>
          <div>
            <div style={{
              background: 'white',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Học viên</div>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={16} />
                    {submission.username || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Loại bài</div>
                  <div style={{ fontWeight: 600 }}>{isWriting ? 'WRITING' : examType}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Thời gian nộp</div>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={16} />
                    {formatDateTime(submission.submittedAt || submission.startedAt)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Thời gian làm bài</div>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={16} />
                    {formatDuration(submissionDurationSeconds)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Trạng thái</div>
                  <div style={{ fontWeight: 600, textTransform: 'uppercase' }}>{submission.status || 'N/A'}</div>
                </div>
                {isWriting && (
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Số từ</div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={16} />
                      {`${submission.wordCount || 0} từ`}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isWriting ? (
              <>
                <div style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 24,
                  marginBottom: 20,
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: 18,
                    fontWeight: 600,
                    color: '#1f2937',
                    borderBottom: '2px solid #3b82f6',
                    paddingBottom: 12
                  }}>
                    Đề bài: {submission.groupTitle || 'N/A'}
                  </h3>
                  <div style={{
                    padding: 16,
                    background: '#fef3c7',
                    borderRadius: 8,
                    border: '1px solid #fbbf24',
                    fontSize: 14,
                    lineHeight: 1.6
                  }}>
                    <p style={{ margin: 0, fontStyle: 'italic', color: '#92400e' }}>
                      Bài viết được chấm theo rubric IELTS Writing.
                    </p>
                  </div>
                </div>

                <div style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 24,
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                    borderBottom: '2px solid #10b981',
                    paddingBottom: 12
                  }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1f2937' }}>
                      Bài làm của học viên
                    </h3>
                    {attemptData?.answers?.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowRawLlmInput(prev => !prev)}
                        style={{
                          padding: '6px 14px',
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 6,
                          border: '1px solid #d1d5db',
                          background: showRawLlmInput ? '#3b82f6' : '#f9fafb',
                          color: showRawLlmInput ? '#fff' : '#374151',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Code size={14} />
                        {showRawLlmInput ? 'Xem bài làm' : 'Xem nội dung gửi LLM'}
                      </button>
                    )}
                  </div>
                  {showRawLlmInput ? (
                    <div style={{
                      padding: 20,
                      background: '#1f2937',
                      borderRadius: 8,
                      minHeight: 400,
                      fontSize: 13,
                      lineHeight: 1.7,
                      fontFamily: "'Monaco', 'Menlo', 'Consolas', monospace",
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      color: '#e2e8f0',
                    }}>
                      <div style={{ marginBottom: 12, color: '#94a3b8', fontSize: 12 }}>
                        ⚡ Dữ liệu gốc gửi đến LLM (bao gồm cả câu trả lời gửi kéo nếu có)
                      </div>
                      {attemptData?.answers?.map((ans, idx) => (
                        <div key={idx} style={{ marginBottom: 16, borderBottom: '1px solid #334155', paddingBottom: 12 }}>
                          <div style={{ color: '#60a5fa', fontSize: 11, marginBottom: 4 }}>
                            Câu hỏi #{ans.questionId}
                            {ans.matchingAnswer ? ' [Kéo thả]' : ans.selectedOptionLabel ? ' [Chọn đáp án]' : ' [Viết luận]'}
                          </div>
                          {ans.textAnswer && (
                            <div style={{ color: '#a78bfa', fontSize: 11 }}>textAnswer: <span style={{ color: '#e2e8f0' }}>{ans.textAnswer}</span></div>
                          )}
                          {ans.matchingAnswer && (
                            <div style={{ color: '#f59e0b', fontSize: 11 }}>matchingAnswer: <span style={{ color: '#e2e8f0' }}>{ans.matchingAnswer}</span></div>
                          )}
                          {ans.selectedOptionLabel && ans.selectedOptionLabel !== ans.textAnswer && (
                            <div style={{ color: '#34d399', fontSize: 11 }}>selectedOptionLabel: <span style={{ color: '#e2e8f0' }}>{ans.selectedOptionLabel}</span></div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      padding: 20,
                      background: '#f9fafb',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      minHeight: 400,
                      fontSize: 15,
                      lineHeight: 1.8,
                      fontFamily: 'inherit',
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word'
                    }}>
                      {submission.submissionText || 'Không có nội dung bài làm'}
                    </div>
                  )}
                </div>

                {renderGradeHistorySection()}
              </>
            ) : isSpeaking ? (
              <>
                <div style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 24,
                  marginBottom: 20,
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: 18,
                    fontWeight: 600,
                    color: '#1f2937',
                    borderBottom: '2px solid #3b82f6',
                    paddingBottom: 12
                  }}>
                    Đề bài: {submission.testTitle || submission.examTitle || 'Speaking Test'}
                  </h3>
                  <div style={{
                    padding: 16,
                    background: '#fef3c7',
                    borderRadius: 8,
                    border: '1px solid #fbbf24',
                    fontSize: 14,
                    lineHeight: 1.6
                  }}>
                    <p style={{ margin: 0, fontStyle: 'italic', color: '#92400e' }}>
                      Bài nói được chấm theo rubric IELTS Speaking.
                    </p>
                  </div>
                </div>

                <div style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 24,
                  border: '1px solid #e5e7eb',
                  marginBottom: 20
                }}>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: 18,
                    fontWeight: 600,
                    color: '#1f2937',
                    borderBottom: '2px solid #10b981',
                    paddingBottom: 12
                  }}>
                    Bài nộp của học viên
                  </h3>

                  <div style={{ display: 'grid', gap: 12 }}>
                    {speakingRecordings.length > 0 ? (
                      speakingRecordings.map((record, index) => (
                        <div
                          key={`${record.url}-${index}`}
                          style={{
                            background: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: 8,
                            padding: 12
                          }}
                        >
                          <div style={{ fontSize: 13, color: '#475569', marginBottom: 8, fontWeight: 600 }}>
                            {record.label}
                          </div>
                          <audio controls src={record.url} style={{ width: '100%' }} />
                        </div>
                      ))
                    ) : (
                      <div style={{
                        padding: 16,
                        borderRadius: 8,
                        background: '#f9fafb',
                        border: '1px dashed #cbd5e1',
                        color: '#64748b',
                        fontSize: 14
                      }}>
                        Chưa có file thu âm để phát lại.
                      </div>
                    )}

                  </div>
                </div>

                {renderGradeHistorySection()}
              </>
            ) : (
              <>
                <div style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 24,
                  marginBottom: 20,
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: 18,
                    fontWeight: 600,
                    color: '#1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <ClipboardList size={20} /> Tổng quan bài thi
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    <div className="lms-panel" style={{ margin: 0 }}>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>Tên bài thi</div>
                      <div style={{ fontWeight: 700 }}>{submission.testTitle || submission.examTitle || 'N/A'}</div>
                    </div>
                    <div className="lms-panel" style={{ margin: 0 }}>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>Điểm band</div>
                      <div style={{ fontWeight: 700, color: '#16a34a' }}>{formatBand(displayExamBand)} / 9.0</div>
                    </div>
                    <div className="lms-panel" style={{ margin: 0 }}>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>Số câu đúng</div>
                      <div style={{ fontWeight: 700 }}>{submission.totalCorrect ?? 0} / {getTotalQuestionCount()}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
                        Đã trả lời: {submission.totalAnswered ?? 0}
                      </div>
                    </div>
                    <div className="lms-panel" style={{ margin: 0 }}>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>Trạng thái</div>
                      <div style={{ fontWeight: 700 }}>{submission.status || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 24,
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: 18,
                    fontWeight: 600,
                    color: '#1f2937'
                  }}>
                    Review đáp án học viên
                  </h3>
                  {renderExamReviewByQuestions()}
                </div>

                <div style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 24,
                  border: '1px solid #e5e7eb',
                  marginTop: 20
                }}>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: 18,
                    fontWeight: 600,
                    color: '#1f2937'
                  }}>
                    Ghi chú
                  </h3>
                  <div style={{ color: '#64748b', fontSize: 14 }}>
                    Chế độ sửa điểm thủ công đã được tắt. Trang này hiện chỉ dùng để review bài làm và kết quả hiện tại.
                  </div>
                </div>
              </>
            )}
          </div>

          {isWriting && (
            <div style={{ position: 'sticky', top: 90, alignSelf: 'start' }}>
              <div style={{
                background: 'white',
                borderRadius: 12,
                padding: 24,
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                maxHeight: 'calc(100vh - 110px)',
                overflowY: 'auto',
                scrollbarGutter: 'stable'
              }}>
                {/* AI Grading Panel */}
                {submission && writingSource === 'writing' && (
                  <AIGradingPanel
                    submissionId={id}
                    onApprove={(aiResult) => {
                      if (aiResult) {
                        setGrading(prev => ({
                          ...prev,
                          taskAchievement: aiResult.taskResponse?.band?.toString() || '',
                          coherenceCohesion: aiResult.coherenceCohesion?.band?.toString() || '',
                          lexicalResource: aiResult.lexicalResource?.band?.toString() || '',
                          grammaticalRange: aiResult.grammaticalRange?.band?.toString() || '',
                          feedback: aiResult.overallFeedback || '',
                        }));
                      }
                    }}
                    onReject={() => {
                      // User rejected - they'll use manual grading instead
                    }}
                  />
                )}

                <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

                <h3 style={{
                  margin: '0 0 20px 0',
                  fontSize: 18,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Award size={20} style={{ color: '#f59e0b' }} />
                  Chấm điểm thủ công
                </h3>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#374151' }}>
                    Chấm theo rubric (mỗi tiêu chí 0.0 - 9.0)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={3}
                      lang="en"
                      autoComplete="off"
                      spellCheck={false}
                      value={grading.taskAchievement}
                      onChange={handleBandFieldChange('taskAchievement')}
                      onFocus={handleBandFieldFocus}
                      onKeyDown={handleBandFieldKeyDown}
                      onBeforeInput={handleBandFieldBeforeInput}
                      onPaste={handleBandFieldPaste('taskAchievement')}
                      onBlur={handleBandFieldBlur('taskAchievement')}
                      placeholder="Task Achievement"
                      style={{ width: '100%', padding: '10px 12px', border: rubricFieldStatus.taskAchievement ? '1px solid #e5e7eb' : '1px solid #ef4444', borderRadius: 8, imeMode: 'disabled' }}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={3}
                      lang="en"
                      autoComplete="off"
                      spellCheck={false}
                      value={grading.coherenceCohesion}
                      onChange={handleBandFieldChange('coherenceCohesion')}
                      onFocus={handleBandFieldFocus}
                      onKeyDown={handleBandFieldKeyDown}
                      onBeforeInput={handleBandFieldBeforeInput}
                      onPaste={handleBandFieldPaste('coherenceCohesion')}
                      onBlur={handleBandFieldBlur('coherenceCohesion')}
                      placeholder="Coherence & Cohesion"
                      style={{ width: '100%', padding: '10px 12px', border: rubricFieldStatus.coherenceCohesion ? '1px solid #e5e7eb' : '1px solid #ef4444', borderRadius: 8, imeMode: 'disabled' }}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={3}
                      lang="en"
                      autoComplete="off"
                      spellCheck={false}
                      value={grading.lexicalResource}
                      onChange={handleBandFieldChange('lexicalResource')}
                      onFocus={handleBandFieldFocus}
                      onKeyDown={handleBandFieldKeyDown}
                      onBeforeInput={handleBandFieldBeforeInput}
                      onPaste={handleBandFieldPaste('lexicalResource')}
                      onBlur={handleBandFieldBlur('lexicalResource')}
                      placeholder="Lexical Resource"
                      style={{ width: '100%', padding: '10px 12px', border: rubricFieldStatus.lexicalResource ? '1px solid #e5e7eb' : '1px solid #ef4444', borderRadius: 8, imeMode: 'disabled' }}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={3}
                      lang="en"
                      autoComplete="off"
                      spellCheck={false}
                      value={grading.grammaticalRange}
                      onChange={handleBandFieldChange('grammaticalRange')}
                      onFocus={handleBandFieldFocus}
                      onKeyDown={handleBandFieldKeyDown}
                      onBeforeInput={handleBandFieldBeforeInput}
                      onPaste={handleBandFieldPaste('grammaticalRange')}
                      onBlur={handleBandFieldBlur('grammaticalRange')}
                      placeholder="Grammatical Range"
                      style={{ width: '100%', padding: '10px 12px', border: rubricFieldStatus.grammaticalRange ? '1px solid #e5e7eb' : '1px solid #ef4444', borderRadius: 8, imeMode: 'disabled' }}
                    />
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, color: '#0f766e', fontWeight: 600 }}>
                    Band dự kiến lưu (tự tính từ 4 tiêu chí): {finalWritingBand !== null ? formatBand(finalWritingBand) : 'Chưa đủ tiêu chí'}
                  </div>
                  {hasInvalidRubricField && (
                    <div style={{ marginTop: 4, fontSize: 12, color: '#b91c1c' }}>
                      Có thể lưu với band hiện tại; nhập đủ 4 tiêu chí hợp lệ (0.0 - 9.0, bước 0.5) nếu muốn tính lại band mới.
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: '#374151'
                  }}>
                    Nhận xét chung
                  </label>
                  <textarea
                    value={grading.feedback}
                    onChange={(e) => setGrading({ ...grading, feedback: e.target.value })}
                    onKeyDown={handleFeedbackKeyDown}
                    onBeforeInput={handleFeedbackBeforeInput}
                    rows={8}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 14,
                      lineHeight: 1.6,
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                    placeholder="Nhập nhận xét về bài làm của học viên..."
                  />
                </div>

                <div style={{
                  padding: 16,
                  background: '#f0f9ff',
                  borderRadius: 8,
                  border: '1px solid #bfdbfe',
                  marginBottom: 20
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 600, color: '#1e40af' }}>
                    Tiêu chí chấm IELTS Writing
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#1e40af', lineHeight: 1.8 }}>
                    <li>Task Achievement (25%)</li>
                    <li>Coherence & Cohesion (25%)</li>
                    <li>Lexical Resource (25%)</li>
                    <li>Grammatical Range (25%)</li>
                  </ul>
                </div>

                <div style={{
                  padding: 12,
                  background: submission.status === 'GRADED' ? '#d1fae5' : '#fef3c7',
                  borderRadius: 8,
                  marginBottom: 20,
                  textAlign: 'center'
                }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: submission.status === 'GRADED' ? '#065f46' : '#92400e'
                  }}>
                    {submission.status === 'GRADED' ? 'Đã chấm' : 'Chờ chấm'}
                  </span>
                </div>

                <button
                  className="lms-cta"
                  onClick={handleSubmitGrade}
                  disabled={!canSaveWritingGrade}
                  style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                >
                  <Save size={16} /> {writingActionLabel}
                </button>
              </div>
            </div>
          )}

          {isSpeaking && (
            <div style={{ position: 'sticky', top: 90, alignSelf: 'start' }}>
              <div style={{
                background: 'white',
                borderRadius: 12,
                padding: 24,
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                maxHeight: 'calc(100vh - 110px)',
                overflowY: 'auto',
                scrollbarGutter: 'stable'
              }}>
                <h3 style={{
                  margin: '0 0 20px 0',
                  fontSize: 18,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Award size={20} style={{ color: '#f59e0b' }} />
                  Chấm điểm
                </h3>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#374151' }}>
                    Chấm theo rubric IELTS Speaking (mỗi tiêu chí 0.0 - 9.0)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={3}
                      lang="en"
                      autoComplete="off"
                      spellCheck={false}
                      value={grading.fluencyCoherence}
                      onChange={handleBandFieldChange('fluencyCoherence')}
                      onFocus={handleBandFieldFocus}
                      onKeyDown={handleBandFieldKeyDown}
                      onBeforeInput={handleBandFieldBeforeInput}
                      onPaste={handleBandFieldPaste('fluencyCoherence')}
                      onBlur={handleBandFieldBlur('fluencyCoherence')}
                      placeholder="Fluency & Coherence"
                      style={{ width: '100%', padding: '10px 12px', border: speakingRubricFieldStatus.fluencyCoherence ? '1px solid #e5e7eb' : '1px solid #ef4444', borderRadius: 8, imeMode: 'disabled' }}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={3}
                      lang="en"
                      autoComplete="off"
                      spellCheck={false}
                      value={grading.lexicalResource}
                      onChange={handleBandFieldChange('lexicalResource')}
                      onFocus={handleBandFieldFocus}
                      onKeyDown={handleBandFieldKeyDown}
                      onBeforeInput={handleBandFieldBeforeInput}
                      onPaste={handleBandFieldPaste('lexicalResource')}
                      onBlur={handleBandFieldBlur('lexicalResource')}
                      placeholder="Lexical Resource"
                      style={{ width: '100%', padding: '10px 12px', border: speakingRubricFieldStatus.lexicalResource ? '1px solid #e5e7eb' : '1px solid #ef4444', borderRadius: 8, imeMode: 'disabled' }}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={3}
                      lang="en"
                      autoComplete="off"
                      spellCheck={false}
                      value={grading.grammaticalRangeAccuracy}
                      onChange={handleBandFieldChange('grammaticalRangeAccuracy')}
                      onFocus={handleBandFieldFocus}
                      onKeyDown={handleBandFieldKeyDown}
                      onBeforeInput={handleBandFieldBeforeInput}
                      onPaste={handleBandFieldPaste('grammaticalRangeAccuracy')}
                      onBlur={handleBandFieldBlur('grammaticalRangeAccuracy')}
                      placeholder="Grammatical Range"
                      style={{ width: '100%', padding: '10px 12px', border: speakingRubricFieldStatus.grammaticalRangeAccuracy ? '1px solid #e5e7eb' : '1px solid #ef4444', borderRadius: 8, imeMode: 'disabled' }}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={3}
                      lang="en"
                      autoComplete="off"
                      spellCheck={false}
                      value={grading.pronunciation}
                      onChange={handleBandFieldChange('pronunciation')}
                      onFocus={handleBandFieldFocus}
                      onKeyDown={handleBandFieldKeyDown}
                      onBeforeInput={handleBandFieldBeforeInput}
                      onPaste={handleBandFieldPaste('pronunciation')}
                      onBlur={handleBandFieldBlur('pronunciation')}
                      placeholder="Pronunciation"
                      style={{ width: '100%', padding: '10px 12px', border: speakingRubricFieldStatus.pronunciation ? '1px solid #e5e7eb' : '1px solid #ef4444', borderRadius: 8, imeMode: 'disabled' }}
                    />
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, color: '#0f766e', fontWeight: 600 }}>
                    Band dự kiến lưu (tự tính từ 4 tiêu chí): {speakingBandPreview !== null ? formatBand(speakingBandPreview) : 'Chưa đủ tiêu chí'}
                  </div>
                  {hasInvalidSpeakingRubricField && (
                    <div style={{ marginTop: 4, fontSize: 12, color: '#b91c1c' }}>
                      Vui lòng nhập đủ 4 tiêu chí hợp lệ (0.0 - 9.0, bước 0.5).
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: '#374151'
                  }}>
                    Nhận xét chung
                  </label>
                  <textarea
                    value={grading.feedback}
                    onChange={(e) => setGrading((prev) => ({ ...prev, feedback: e.target.value }))}
                    onKeyDown={handleFeedbackKeyDown}
                    onBeforeInput={handleFeedbackBeforeInput}
                    rows={8}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 14,
                      lineHeight: 1.6,
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                    placeholder="Nhập nhận xét về bài nói của học viên..."
                  />
                </div>

                <div style={{
                  padding: 16,
                  background: '#f0f9ff',
                  borderRadius: 8,
                  border: '1px solid #bfdbfe',
                  marginBottom: 20
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 600, color: '#1e40af' }}>
                    Tiêu chí chấm IELTS Speaking
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#1e40af', lineHeight: 1.8 }}>
                    <li>Fluency & Coherence (25%)</li>
                    <li>Lexical Resource (25%)</li>
                    <li>Grammatical Range & Accuracy (25%)</li>
                    <li>Pronunciation (25%)</li>
                  </ul>
                </div>

                <div style={{
                  padding: 12,
                  background: submission.status === 'GRADED' ? '#d1fae5' : '#fef3c7',
                  borderRadius: 8,
                  marginBottom: 20,
                  textAlign: 'center'
                }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: submission.status === 'GRADED' ? '#065f46' : '#92400e'
                  }}>
                    {submission.status === 'GRADED' ? 'Đã chấm' : 'Chờ chấm'}
                  </span>
                </div>

                <button
                  className="lms-cta"
                  onClick={handleSubmitGrade}
                  disabled={!canSaveSpeakingGrade}
                  style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                >
                  <Save size={16} /> {speakingActionLabel}
                </button>
              </div>
            </div>
          )}
        </div>

        {!isWriting && !isSpeaking && (
          <div style={{
            marginTop: 18,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: 16,
            color: '#334155',
            fontSize: 14
          }}>
            {examType === 'SPEAKING'
              ? 'Bài thi Speaking cần quy trình chấm thủ công riêng. Bạn có thể chỉnh sửa điểm thủ công ở phần tổng quan phía trên.'
              : 'Bài thi Reading/Listening được auto-grade. Nếu có sai sót, bạn có thể chỉnh sửa điểm và lưu lại ngay trên màn hình này.'}
          </div>
        )}
      </div>
    </div>
  );
}
