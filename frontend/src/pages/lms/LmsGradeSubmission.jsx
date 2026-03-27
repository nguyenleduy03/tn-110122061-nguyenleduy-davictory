import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, User, Clock, FileText, Award, ClipboardList, CheckCircle2 } from 'lucide-react';
import { teacherApi } from '../../services/teacherApi';
import { ieltsApi } from '../../services/ieltsApi';
import QuestionRenderer from '../../components/question/QuestionRenderer';
import { formatTextWithWhitespace } from '../../utils/textFormatters';
import { calculateExamBand, calculateWritingBandFromCriteria, formatBand } from '../../utils/ieltsScoring';
import '../../styles/ieltsTest.css';

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
  const [writingSource, setWritingSource] = useState('writing');
  const [forceWritingMode, setForceWritingMode] = useState(type === 'writing');
  const [grading, setGrading] = useState({
    feedback: '',
    taskAchievement: '',
    coherenceCohesion: '',
    lexicalResource: '',
    grammaticalRange: ''
  });

  const normalizeDecimalInputText = (rawValue) => String(rawValue ?? '').replace(/,/g, '.');

  const normalizeIeltsBandValue = (rawValue) => {
    const raw = normalizeDecimalInputText(rawValue).trim();
    if (!raw) return '';
    if (!isValidIeltsBandPartial(raw)) return '';

    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 9) return '';
    if (Math.abs((numeric * 2) - Math.round(numeric * 2)) > 1e-9) return '';

    return numeric.toFixed(1);
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

  const buildNextInputValue = (input, insertedText) => {
    const current = String(input?.value || '');
    const start = input?.selectionStart ?? current.length;
    const end = input?.selectionEnd ?? current.length;
    return `${current.slice(0, start)}${insertedText}${current.slice(end)}`;
  };

  const handleDecimalKeyDown = (event) => {
    const { key, currentTarget } = event;
    const ctrlOrMeta = event.ctrlKey || event.metaKey;

    if (ctrlOrMeta && ['a', 'c', 'v', 'x'].includes(key.toLowerCase())) return;
    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(key)) return;

    if (/^[0-9]$/.test(key) || key === '.' || key === ',') {
      const inserted = key === ',' ? '.' : key;
      const nextValue = buildNextInputValue(currentTarget, inserted);
      if (!isValidIeltsBandPartial(nextValue)) {
        event.preventDefault();
      }
      return;
    }

    event.preventDefault();
  };

  const handleDecimalBeforeInput = (event) => {
    if (!event.inputType || !event.inputType.startsWith('insert')) return;
    const inserted = normalizeDecimalInputText(event.data ?? '');
    if (!inserted) return;

    const nextValue = buildNextInputValue(event.currentTarget, inserted);
    if (!isValidIeltsBandPartial(nextValue)) {
      event.preventDefault();
    }
  };

  const handleDecimalPaste = (event) => {
    event.preventDefault();
    const pasted = normalizeDecimalInputText(event.clipboardData?.getData('text') || '').trim();
    if (!pasted) return;

    const input = event.currentTarget;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const next = `${input.value.slice(0, start)}${pasted}${input.value.slice(end)}`;
    if (!isValidIeltsBandPartial(next)) return;

    input.value = next;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const handleBandFieldChange = (field) => (event) => {
    const nextValue = normalizeDecimalInputText(event.target.value);
    if (!isValidIeltsBandPartial(nextValue)) return;

    setGrading((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
  };

  const handleBandFieldBlur = (field) => (event) => {
    const normalizedValue = normalizeIeltsBandValue(event.target.value);
    setGrading((prev) => ({
      ...prev,
      [field]: normalizedValue,
    }));
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

  const buildWritingLikeFromExamAttempt = (attempt) => {
    const answers = Array.isArray(attempt?.answers) ? attempt.answers : [];
    const submissionText = answers
      .map((a) => String(a?.textAnswer || '').trim())
      .find(Boolean) || '';

    const derivedWordCount = submissionText
      ? submissionText.split(/\s+/).filter(Boolean).length
      : 0;

    return {
      id: attempt?.id,
      username: attempt?.username,
      submittedAt: attempt?.submittedAt || attempt?.startedAt,
      startedAt: attempt?.startedAt,
      status: attempt?.status,
      groupTitle: attempt?.testTitle || 'Writing Submission',
      submissionText,
      wordCount: attempt?.wordCount ?? derivedWordCount,
      sourceExamAttemptId: attempt?.id,
      overallBandScore: attempt?.bandScore,
      overallFeedback: attempt?.feedback,
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
            setGrading({
              feedback: data.overallFeedback || '',
              taskAchievement: '',
              coherenceCohesion: '',
              lexicalResource: '',
              grammaticalRange: ''
            });
          }
          return;
        }

        if (effectiveSource === 'exam') {
          const data = await teacherApi.getExamAttemptDetail(id);
          const skill = String(data?.skillType || data?.examType || '').toUpperCase();
          if (skill === 'WRITING') {
            const mapped = buildWritingLikeFromExamAttempt(data);
            setSubmission(mapped);
            setWritingSource('exam');
            setForceWritingMode(true);
            if (mapped.overallBandScore !== null && mapped.overallBandScore !== undefined) {
              setGrading({
                feedback: mapped.overallFeedback || '',
                taskAchievement: '',
                coherenceCohesion: '',
                lexicalResource: '',
                grammaticalRange: ''
              });
            }
          } else {
            setSubmission(data);
            if (data?.testId && data?.skillType) {
              const reviewSession = await ieltsApi.getTestSession(data.testId, data.skillType);
              setExamReviewSession(reviewSession);
              setReviewAnswers(buildReviewAnswers(data.answers || [], reviewSession));
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
              setGrading({
                feedback: data.overallFeedback || '',
                taskAchievement: '',
                coherenceCohesion: '',
                lexicalResource: '',
                grammaticalRange: ''
              });
            }
          } catch {
            const examData = await teacherApi.getExamAttemptDetail(id);
            const skill = String(examData?.skillType || examData?.examType || '').toUpperCase();
            if (skill !== 'WRITING') {
              throw new Error('Submission is not WRITING');
            }

            const mapped = buildWritingLikeFromExamAttempt(examData);
            setSubmission(mapped);
            setWritingSource('exam');
            if (mapped.overallBandScore !== null && mapped.overallBandScore !== undefined) {
              setGrading({
                feedback: mapped.overallFeedback || '',
                taskAchievement: '',
                coherenceCohesion: '',
                lexicalResource: '',
                grammaticalRange: ''
              });
            }
          }
        } else {
          const data = await teacherApi.getExamAttemptDetail(id);
          const skill = String(data?.skillType || data?.examType || '').toUpperCase();
          if (skill === 'WRITING') {
            const mapped = buildWritingLikeFromExamAttempt(data);
            setSubmission(mapped);
            setWritingSource('exam');
            setForceWritingMode(true);
          } else {
            setSubmission(data);
          }

          if (skill !== 'WRITING' && data?.testId && data?.skillType) {
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
      const finalBand = calculateWritingBandFromCriteria({
        taskAchievement: grading.taskAchievement,
        coherenceCohesion: grading.coherenceCohesion,
        lexicalResource: grading.lexicalResource,
        grammaticalRange: grading.grammaticalRange,
      });

      if (finalBand === null) {
        alert('Vui lòng nhập đủ 4 tiêu chí rubric để tính band tự động.');
        return;
      }

      if (writingSource === 'writing') {
        await teacherApi.gradeWritingSubmission(id, {
          overallBandScore: finalBand,
          overallFeedback: grading.feedback
        });
      } else {
        await teacherApi.updateExamAttemptGrade(id, {
          bandScore: finalBand,
          feedback: grading.feedback,
        });
      }
      alert('Đã chấm bài thành công!');
      navigate(-1);
    } catch (error) {
      console.error('Error grading:', error);
      alert('Lỗi khi chấm bài');
    }
  };

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString('vi-VN');
  };

  const formatDuration = (seconds) => {
    if (!seconds || Number.isNaN(Number(seconds))) return 'N/A';
    const total = Number(seconds);
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

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

  const isWriting = forceWritingMode || String(submission?.skillType || submission?.examType || '').toUpperCase() === 'WRITING';
  const examType = submission.skillType || submission.examType || 'EXAM';
  const computedWritingBand = calculateWritingBandFromCriteria({
    taskAchievement: grading.taskAchievement,
    coherenceCohesion: grading.coherenceCohesion,
    lexicalResource: grading.lexicalResource,
    grammaticalRange: grading.grammaticalRange,
  });
  const finalWritingBand = computedWritingBand;
  const canSaveWritingGrade = isWriting && finalWritingBand !== null;
  const calculatedExamBand = calculateExamBand({
    skillType: examType,
    totalCorrect: submission.totalCorrect,
  });
  const displayExamBand = submission?.bandScore ?? calculatedExamBand;

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
              {isWriting ? 'Chấm bài Writing' : `Chi tiết chấm bài ${examType}`}
            </h2>
          </div>
          {isWriting ? (
            <button
              className="lms-cta"
              onClick={handleSubmitGrade}
              disabled={!canSaveWritingGrade}
            >
              <Save size={14} /> Lưu điểm
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
        <div style={{ display: 'grid', gridTemplateColumns: isWriting ? '1fr 400px' : '1fr', gap: 24 }}>
          <div>
            <div style={{
              background: 'white',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
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
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                    {isWriting ? 'Số từ' : 'Thời gian làm bài'}
                  </div>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={16} />
                    {isWriting ? `${submission.wordCount || 0} từ` : formatDuration(submission.timeSpentSeconds)}
                  </div>
                </div>
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
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: 18,
                    fontWeight: 600,
                    color: '#1f2937',
                    borderBottom: '2px solid #10b981',
                    paddingBottom: 12
                  }}>
                    Bài làm của học viên
                  </h3>
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
                </div>
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
            <div style={{ position: 'sticky', top: 90, height: 'fit-content' }}>
              <div style={{
                background: 'white',
                borderRadius: 12,
                padding: 24,
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
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
                    Chấm theo rubric (mỗi tiêu chí 0.0 - 9.0)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={3}
                      value={grading.taskAchievement}
                      onChange={handleBandFieldChange('taskAchievement')}
                      onBlur={handleBandFieldBlur('taskAchievement')}
                      onKeyDown={handleDecimalKeyDown}
                      onBeforeInput={handleDecimalBeforeInput}
                      onPaste={handleDecimalPaste}
                      placeholder="Task Achievement"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={3}
                      value={grading.coherenceCohesion}
                      onChange={handleBandFieldChange('coherenceCohesion')}
                      onBlur={handleBandFieldBlur('coherenceCohesion')}
                      onKeyDown={handleDecimalKeyDown}
                      onBeforeInput={handleDecimalBeforeInput}
                      onPaste={handleDecimalPaste}
                      placeholder="Coherence & Cohesion"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={3}
                      value={grading.lexicalResource}
                      onChange={handleBandFieldChange('lexicalResource')}
                      onBlur={handleBandFieldBlur('lexicalResource')}
                      onKeyDown={handleDecimalKeyDown}
                      onBeforeInput={handleDecimalBeforeInput}
                      onPaste={handleDecimalPaste}
                      placeholder="Lexical Resource"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={3}
                      value={grading.grammaticalRange}
                      onChange={handleBandFieldChange('grammaticalRange')}
                      onBlur={handleBandFieldBlur('grammaticalRange')}
                      onKeyDown={handleDecimalKeyDown}
                      onBeforeInput={handleDecimalBeforeInput}
                      onPaste={handleDecimalPaste}
                      placeholder="Grammatical Range"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }}
                    />
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, color: '#0f766e', fontWeight: 600 }}>
                    Band tự tính: {computedWritingBand !== null ? formatBand(computedWritingBand) : 'Chưa đủ tiêu chí'}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
                    Band sẽ lưu: {finalWritingBand !== null ? formatBand(finalWritingBand) : 'Chưa hợp lệ'}
                  </div>
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
                  <Save size={16} /> Lưu điểm và nhận xét
                </button>
              </div>
            </div>
          )}
        </div>

        {!isWriting && (
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
