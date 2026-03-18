import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Clock, FileText, Award } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';
import { teacherApi } from '../../services/teacherApi';

export default function LmsGradeSubmission() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState({
    score: '',
    feedback: '',
    taskAchievement: '',
    coherenceCohesion: '',
    lexicalResource: '',
    grammaticalRange: ''
  });

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        if (type === 'writing') {
          const data = await teacherApi.getWritingSubmission(id);
          setSubmission(data);
          if (data.overallBandScore) {
            setGrading({
              score: data.overallBandScore,
              feedback: data.overallFeedback || '',
              taskAchievement: '',
              coherenceCohesion: '',
              lexicalResource: '',
              grammaticalRange: ''
            });
          }
        }
      } catch (error) {
        console.error('Error loading submission:', error);
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
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Header giống trang thi */}
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
              Chấm bài {type === 'writing' ? 'Writing' : 'Exam'}
            </h2>
          </div>
          <button 
            className="lms-cta"
            onClick={handleSubmitGrade}
            disabled={!grading.score}
          >
            <Save size={14} /> Lưu điểm
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24 }}>
          {/* Cột trái - Đề bài và bài làm */}
          <div>
            {/* Thông tin */}
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
                    {submission.username}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Lớp</div>
                  <div style={{ fontWeight: 600 }}>{submission.className || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Thời gian nộp</div>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={16} />
                    {new Date(submission.submittedAt).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Số từ</div>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={16} />
                    {submission.wordCount} từ
                  </div>
                </div>
              </div>
            </div>

            {/* Đề bài */}
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
                📝 Đề bài: {submission.groupTitle}
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
                  Đề bài writing task - Học viên cần viết bài luận theo yêu cầu
                </p>
              </div>
            </div>

            {/* Bài làm của học viên */}
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
                ✍️ Bài làm của học viên
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
                {submission.submissionText}
              </div>
            </div>
          </div>

          {/* Cột phải - Form chấm điểm */}
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

              {/* Band Score */}
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
                  placeholder="Nhập điểm"
                />
              </div>

              {/* Feedback */}
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

              {/* Tiêu chí chấm */}
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

              {/* Trạng thái */}
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
                  {submission.status === 'GRADED' ? '✓ Đã chấm' : '⏳ Chờ chấm'}
                </span>
              </div>

              {/* Nút lưu */}
              <button 
                className="lms-cta"
                onClick={handleSubmitGrade}
                disabled={!grading.score}
                style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
              >
                <Save size={16} /> Lưu điểm và nhận xét
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
