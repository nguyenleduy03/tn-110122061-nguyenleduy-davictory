import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Clock, FileText, Award, ClipboardList, CheckCircle2 } from 'lucide-react';
import { teacherApi } from '../../services/teacherApi';
import { ieltsApi } from '../../services/ieltsApi';
import QuestionRenderer from '../../components/question/QuestionRenderer';
import { formatTextWithWhitespace } from '../../utils/textFormatters';
import '../../styles/ieltsTest.css';

export default function LmsGradeSubmission() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [examReviewSession, setExamReviewSession] = useState(null);
  const [reviewAnswers, setReviewAnswers] = useState({});
  const [activeQuestion, setActiveQuestion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grading, setGrading] = useState({
    score: '',
    feedback: '',
    taskAchievement: '',
    coherenceCohesion: '',
    lexicalResource: '',
    grammaticalRange: ''
  });

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

  const resolveOptionLikeAnswer = (rawValue, options = []) => {
    if (typeof rawValue !== 'string' || !Array.isArray(options) || options.length === 0) {
      return rawValue;
    }

    const trimmed = rawValue.trim();
    if (!trimmed) return rawValue;

    const exact = options.find((opt) => String(opt).trim().toLowerCase() === trimmed.toLowerCase());
    if (exact) return exact;

    const shortLabel = trimmed.match(/^([A-Za-z])[\).:-]?$/)?.[1]?.toUpperCase();
    if (!shortLabel) return rawValue;

    const matchedByPrefix = options.find((opt) => {
      const text = String(opt).trim();
      return new RegExp(`^${shortLabel}[\\).:-]`, 'i').test(text);
    });

    return matchedByPrefix || rawValue;
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
        if (type === 'writing') {
          const data = await teacherApi.getWritingSubmission(id);
          setSubmission(data);
          if (data.overallBandScore) {
            setGrading({
              score: String(data.overallBandScore),
              feedback: data.overallFeedback || '',
              taskAchievement: '',
              coherenceCohesion: '',
              lexicalResource: '',
              grammaticalRange: ''
            });
          }
        } else {
          const data = await teacherApi.getExamAttemptDetail(id);
          setSubmission(data);

          if (data?.testId && data?.skillType) {
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
  }, [id, type]);

  const handleSubmitGrade = async () => {
    try {
      await teacherApi.gradeWritingSubmission(id, {
        overallBandScore: parseFloat(grading.score),
        overallFeedback: grading.feedback
      });
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
    if (!examReviewSession?.parts) return submission?.totalAnswered || 0;
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
            Band score: {submission?.bandScore ?? 0} / 9.0
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
                  handleAnswerChange={() => {}}
                  bookmarks={{}}
                  toggleBookmark={() => {}}
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

  const isWriting = type === 'writing';
  const examType = submission.skillType || submission.examType || 'EXAM';
  const canSaveWritingGrade = isWriting && grading.score;

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
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
                    De bai: {submission.groupTitle || 'N/A'}
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
                    Bai lam cua hoc vien
                  </h3>
                  <div style={{ 
                    padding: 20, 
                    background: '#f9fafb', 
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    minHeight: 400,
                    fontSize: 15,
                    lineHeight: 1.8,
                    fontFamily: 'Georgia, serif',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word'
                  }}>
                    {submission.submissionText || 'Khong co noi dung bai lam'}
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
                    <ClipboardList size={20} /> Tong quan bai thi
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    <div className="lms-panel" style={{ margin: 0 }}>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>Ten bai thi</div>
                      <div style={{ fontWeight: 700 }}>{submission.testTitle || submission.examTitle || 'N/A'}</div>
                    </div>
                    <div className="lms-panel" style={{ margin: 0 }}>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>Diem band</div>
                      <div style={{ fontWeight: 700, color: '#16a34a' }}>{submission.bandScore ?? 0} / 9.0</div>
                    </div>
                    <div className="lms-panel" style={{ margin: 0 }}>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>So cau dung</div>
                      <div style={{ fontWeight: 700 }}>{submission.totalCorrect ?? 0} / {submission.totalAnswered ?? 0}</div>
                    </div>
                    <div className="lms-panel" style={{ margin: 0 }}>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>Trang thai</div>
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
                    Review dap an hoc vien
                  </h3>
                  {renderExamReviewByQuestions()}
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
                  Cham diem
                </h3>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 14, 
                    fontWeight: 600, 
                    marginBottom: 8,
                    color: '#374151'
                  }}>
                    Band Score (0.0 - 9.0) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="9"
                    value={grading.score}
                    onChange={(e) => setGrading({ ...grading, score: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: 600,
                      textAlign: 'center',
                      color: '#1f2937'
                    }}
                    placeholder="Nhap diem"
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 14, 
                    fontWeight: 600, 
                    marginBottom: 8,
                    color: '#374151'
                  }}>
                    Nhan xet chung
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
                    placeholder="Nhap nhan xet ve bai lam cua hoc vien..."
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
                    Tieu chi cham IELTS Writing
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
                    {submission.status === 'GRADED' ? 'Da cham' : 'Cho cham'}
                  </span>
                </div>

                <button 
                  className="lms-cta"
                  onClick={handleSubmitGrade}
                  disabled={!canSaveWritingGrade}
                  style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                >
                  <Save size={16} /> Luu diem va nhan xet
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
              ? 'Bai thi Speaking can quy trinh cham thu cong rieng. Hien tai trang nay hien thi chi tiet bai nop de giang vien review nhanh.'
              : 'Bai thi Reading/Listening duoc he thong auto-grade. Trang nay duoc bo sung de giang vien xem chi tiet dap an khi bam Cham bai.'}
          </div>
        )}
      </div>
    </div>
  );
}
