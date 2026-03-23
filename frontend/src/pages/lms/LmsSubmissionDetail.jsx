import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, User } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';
import { teacherApi } from '../../services/teacherApi';
import { ieltsApi } from '../../services/ieltsApi';

export default function LmsSubmissionDetail() {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [totalSkillQuestions, setTotalSkillQuestions] = useState(0);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        console.log('🔍 Loading submission:', { id, type });
        if (type === 'writing') {
          const data = await teacherApi.getWritingSubmission(id);
          console.log('✅ Writing submission loaded:', data);
          setSubmission(data);
        } else {
          const data = await teacherApi.getExamAttemptDetail(id);
          console.log('✅ Exam attempt loaded:', data);
          setSubmission(data);

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
      } catch (error) {
        console.error('❌ Error loading submission:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSubmission();
  }, [id, type]);

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
              {type === 'writing' ? 'Writing' : (submission.skillType || submission.examType || 'Exam')}
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
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Trạng thái</div>
            <span className={`lms-pill ${submission.status === 'SUBMITTED' ? 'warn' : 'success'}`}>
              {submission.status}
            </span>
          </div>
        </div>
      </div>

      {/* Nội dung bài làm */}
      {type === 'writing' && (
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

      {type !== 'writing' && (
        <div className="lms-panel" style={{ marginBottom: 16 }}>
          <h3 className="lms-panel-title">Bài thi: {submission.examTitle}</h3>
          <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8 }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Điểm: </span>
              <span style={{ fontWeight: 600, fontSize: 18, color: '#16a34a' }}>
                {submission.bandScore || 0} / 9.0
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
            if (type === 'writing') {
              navigate(`/lms/grade/writing/${id}`);
            } else {
              navigate(`/lms/grade/exam/${id}`);
            }
          }}
        >
          <FileText size={14} /> Chấm bài
        </button>
      </div>
    </LmsLayout>
  );
}
