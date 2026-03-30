import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, User } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';
import { teacherApi } from '../../services/teacherApi';
import { ieltsApi } from '../../services/ieltsApi';
import { calculateExamBand, formatBand } from '../../utils/ieltsScoring';

export default function LmsSubmissionDetail() {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceParam = String(searchParams.get('source') || '').toLowerCase();
  const [submission, setSubmission] = useState(null);
  const [resolvedType, setResolvedType] = useState(type);
  const [totalSkillQuestions, setTotalSkillQuestions] = useState(0);
  const [loading, setLoading] = useState(true);

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
      timeSpentSeconds: attempt?.timeSpentSeconds ?? null,
      status: attempt?.status,
      groupTitle: attempt?.testTitle || 'Writing Submission',
      submissionText,
      wordCount: attempt?.wordCount ?? derivedWordCount,
      sourceExamAttemptId: attempt?.id,
    };
  };

  const countTotalQuestionsFromSession = (session) => {
    if (!session?.parts?.length) return 0;

    const totalByPartMeta = session.parts.reduce((sum, part) => {
      const value = Number(part?.totalQuestions || 0);
      return sum + (Number.isFinite(value) && value > 0 ? value : 0);
    }, 0);
    if (totalByPartMeta > 0) return totalByPartMeta;

    return session.parts.reduce((partSum, part) => {
      const questions = part.questions || [];
      return partSum + questions.reduce((qSum, q) => {
        if (Array.isArray(q.numberRange) && q.numberRange.length > 0) return qSum + q.numberRange.length;
        if (Array.isArray(q.subQuestions) && q.subQuestions.length > 0) return qSum + q.subQuestions.length;
        return qSum + 1;
      }, 0);
    }, 0);
  };

  const formatDuration = (seconds) => {
    const value = Number(seconds);
    if (!Number.isFinite(value) || value <= 0) return '—';

    const total = Math.floor(value);
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const getSubmissionDuration = (item) => (
    item?.timeSpentSeconds ?? item?.timeTakenSeconds ?? null
  );

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        console.log('🔍 Loading submission:', { id, type });
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
            console.warn('Cannot pre-resolve submission source:', lookupError);
          }
        }

        if (effectiveSource === 'writing') {
          const data = await teacherApi.getWritingSubmission(id);
          setSubmission(data);
          setResolvedType('writing');
          return;
        }

        if (effectiveSource === 'exam') {
          const data = await teacherApi.getExamAttemptDetail(id);
          const skill = String(data?.skillType || data?.examType || '').toUpperCase();
          if (skill === 'WRITING') {
            setSubmission(buildWritingLikeFromExamAttempt(data));
            setResolvedType('writing');
          } else {
            setSubmission(data);
            setResolvedType('exam');

            if (data?.testId && data?.skillType) {
              try {
                const session = await ieltsApi.getTestSession(data.testId, data.skillType);
                setTotalSkillQuestions(countTotalQuestionsFromSession(session));
              } catch (sessionError) {
                console.warn('Cannot load session to count total questions:', sessionError);
                setTotalSkillQuestions(0);
              }
            }
          }
          return;
        }

        if (type === 'writing') {
          try {
            const data = await teacherApi.getWritingSubmission(id);
            console.log('✅ Writing submission loaded:', data);
            setSubmission(data);
            setResolvedType('writing');
          } catch (writingErr) {
            // Some WRITING items in teacher list now come from exam-attempts pipeline.
            // Fallback to exam detail so the page still loads instead of failing 400.
            const examData = await teacherApi.getExamAttemptDetail(id);
            console.log('✅ Fallback exam attempt loaded for writing type:', examData);
            const skill = String(examData?.skillType || examData?.examType || '').toUpperCase();

            if (skill === 'WRITING') {
              setSubmission(buildWritingLikeFromExamAttempt(examData));
              setResolvedType('writing');
            } else {
              setSubmission(examData);
              setResolvedType('exam');
            }

            if (skill !== 'WRITING' && examData?.testId && examData?.skillType) {
              try {
                const session = await ieltsApi.getTestSession(examData.testId, examData.skillType);
                setTotalSkillQuestions(countTotalQuestionsFromSession(session));
              } catch (sessionError) {
                console.warn('Cannot load session to count total questions:', sessionError);
                setTotalSkillQuestions(0);
              }
            }
          }
        } else {
          const data = await teacherApi.getExamAttemptDetail(id);
          console.log('✅ Exam attempt loaded:', data);
          const skill = String(data?.skillType || data?.examType || '').toUpperCase();
          if (skill === 'WRITING') {
            setSubmission(buildWritingLikeFromExamAttempt(data));
            setResolvedType('writing');
          } else {
            setSubmission(data);
            setResolvedType('exam');
          }

          if (skill !== 'WRITING' && data?.testId && data?.skillType) {
            try {
              const session = await ieltsApi.getTestSession(data.testId, data.skillType);
              setTotalSkillQuestions(countTotalQuestionsFromSession(session));
            } catch (sessionError) {
              console.warn('Cannot load session to count total questions:', sessionError);
              setTotalSkillQuestions(0);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading submission:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSubmission();
  }, [id, type, sourceParam]);

  if (loading) {
    return (
      <LmsLayout title="Đang tải..." subtitle="Vui lòng chờ">
        <div className="lms-panel" style={{ textAlign: 'center', padding: 40 }}>
          <p>Đang tải bài làm...</p>
        </div>
      </LmsLayout>
    );
  }

  if (!submission) {
    return (
      <LmsLayout title="Không tìm thấy" subtitle="Bài làm không tồn tại">
        <div className="lms-panel" style={{ textAlign: 'center', padding: 40 }}>
          <p>Không tìm thấy bài làm</p>
          <button className="lms-cta" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Quay lại
          </button>
        </div>
      </LmsLayout>
    );
  }

  const displayExamBand = (resolvedType !== 'writing')
    ? (submission.bandScore ?? calculateExamBand({
      skillType: submission.skillType || submission.examType,
      totalCorrect: submission.totalCorrect,
    }))
    : null;

  console.log('📊 Rendering submission:', submission);

  return (
    <LmsLayout title="Chi tiết bài làm" subtitle="Xem và chấm bài học viên">
      <div className="lms-panel" style={{ marginBottom: 16 }}>
        <button className="lms-cta ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Quay lại
        </button>
      </div>

      {/* Thông tin học viên */}
      <div className="lms-panel" style={{ marginBottom: 16 }}>
        <h3 className="lms-panel-title">Thông tin</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Học viên</div>
            <div style={{ fontWeight: 600 }}><User size={14} style={{ display: 'inline', marginRight: 4 }} />{submission.username}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Loại bài</div>
            <div style={{ fontWeight: 600 }}>
              <FileText size={14} style={{ display: 'inline', marginRight: 4 }} />
              {resolvedType === 'writing' ? 'Writing' : (submission.skillType || submission.examType || 'Exam')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Thời gian nộp</div>
            <div style={{ fontWeight: 600 }}>
              <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
              {new Date(submission.submittedAt || submission.startedAt).toLocaleString('vi-VN')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Thời gian làm bài</div>
            <div style={{ fontWeight: 600 }}>
              <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
              {formatDuration(getSubmissionDuration(submission))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Trạng thái</div>
            <span className={`lms-pill ${submission.status === 'SUBMITTED' ? 'warn' : 'success'}`}>
              {submission.status}
            </span>
          </div>
        </div>
      </div>

      {/* Nội dung bài làm */}
      {resolvedType === 'writing' && (
        <div className="lms-panel" style={{ marginBottom: 16 }}>
          <h3 className="lms-panel-title">Đề bài: {submission.groupTitle || 'N/A'}</h3>
          <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
              Số từ: {submission.wordCount || 0}
            </div>
            {submission.submissionText ? (
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {submission.submissionText}
              </div>
            ) : (
              <div style={{ color: '#ef4444', fontStyle: 'italic' }}>
                ⚠️ Không có nội dung bài làm
              </div>
            )}
          </div>
        </div>
      )}

      {resolvedType !== 'writing' && (
        <div className="lms-panel" style={{ marginBottom: 16 }}>
          <h3 className="lms-panel-title">Bài thi: {submission.examTitle}</h3>
          <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8 }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Điểm: </span>
              <span style={{ fontWeight: 600, fontSize: 18, color: '#16a34a' }}>
                {formatBand(displayExamBand)} / 9.0
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Số câu đúng: {submission.totalCorrect || 0} / {(totalSkillQuestions || submission.totalAnswered || 0)}
            </div>
          </div>
        </div>
      )}

      {/* Nút chấm bài */}
      <div className="lms-panel">
        <button
          className="lms-cta"
          onClick={() => {
            if (resolvedType === 'writing') {
              navigate(`/lms/grade/writing/${submission.sourceExamAttemptId || id}?source=${submission.sourceExamAttemptId ? 'exam' : 'writing'}`);
            } else {
              navigate(`/lms/grade/exam/${id}?source=exam`);
            }
          }}
        >
          <FileText size={14} /> Chấm bài
        </button>
      </div>
    </LmsLayout>
  );
}
