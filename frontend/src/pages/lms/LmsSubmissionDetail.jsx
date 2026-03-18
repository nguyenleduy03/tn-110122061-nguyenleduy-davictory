import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, User } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';
import { teacherApi } from '../../services/teacherApi';

export default function LmsSubmissionDetail() {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        if (type === 'writing') {
          const data = await teacherApi.getWritingSubmission(id);
          setSubmission(data);
        } else {
          // Load exam attempt detail
          const data = await fetch(`/api/exam-attempts/${id}/detail`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
          }).then(r => r.json());
          setSubmission(data);
        }
      } catch (error) {
        console.error('Error loading submission:', error);
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
            <div style={{ fontWeight: 600 }}><FileText size={14} style={{ display: 'inline', marginRight: 4 }} />{type === 'writing' ? 'Writing' : submission.examType}</div>
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
          <h3 className="lms-panel-title">Đề bài: {submission.groupTitle}</h3>
          <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Số từ: {submission.wordCount}</div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {submission.submissionText}
            </div>
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
              Số câu đúng: {submission.totalCorrect || 0} / {submission.totalAnswered || 0}
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
