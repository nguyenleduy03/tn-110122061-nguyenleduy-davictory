import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { assignmentApi } from '../../services/assignmentApi';
import { ieltsApi } from '../../services/ieltsApi';

export default function GradeAssignment() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const [testData, setTestData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [gradeData, setGradeData] = useState({ score: '', feedback: '' });

  useEffect(() => {
    // Load submission và test data
    assignmentApi.getSubmissionById(submissionId)
      .then(async (sub) => {
        setSubmission(sub);
        
        // Parse answers từ submissionText
        const parsedAnswers = {};
        if (sub.submissionText) {
          sub.submissionText.split('\n').forEach(line => {
            const match = line.match(/Question (\d+): (.+)/);
            if (match) {
              parsedAnswers[match[1]] = match[2];
            }
          });
        }
        setAnswers(parsedAnswers);

        // Load test data
        if (sub.assignment?.testId) {
          const skillType = sub.skillType || 'LISTENING';
          const test = await ieltsApi.getTestSession(sub.assignment.testId, skillType);
          setTestData(test);
        }

        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load submission:', err);
        setLoading(false);
      });
  }, [submissionId]);

  const handleSubmitGrade = async (e) => {
    e.preventDefault();
    try {
      await assignmentApi.gradeSubmission({
        submissionId: parseInt(submissionId),
        score: parseFloat(gradeData.score),
        feedback: gradeData.feedback
      });
      alert('Chấm điểm thành công!');
      navigate(-1);
    } catch (err) {
      alert('Chấm điểm thất bại: ' + err.message);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;
  if (!submission) return <div style={{ padding: 40, textAlign: 'center' }}>Không tìm thấy bài nộp</div>;

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Main content - Test view */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20, background: '#f9fafb' }}>
        <button onClick={() => navigate(-1)} style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', cursor: 'pointer', color: '#1b7f79' }}>
          <ArrowLeft size={16} /> Quay lại
        </button>

        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ padding: 20, background: '#fff', borderRadius: 12, marginBottom: 20 }}>
            <h2 style={{ margin: '0 0 12px' }}>{submission.assignment?.title}</h2>
            <p style={{ margin: 0, color: '#6b7280' }}>
              Học sinh: {submission.studentName} • Nộp lúc: {new Date(submission.submittedAt).toLocaleString('vi-VN')}
            </p>
          </div>

          {/* Hiển thị câu hỏi và đáp án */}
          {testData?.parts?.map((part, idx) => (
            <div key={idx} style={{ padding: 20, background: '#fff', borderRadius: 12, marginBottom: 16 }}>
              <h3 dangerouslySetInnerHTML={{ __html: part.title }} />
              {part.questions?.map(q => {
                const flatQs = q.subQuestions || [q];
                return flatQs.map(sq => (
                  <div key={sq.id} style={{ padding: 12, background: '#f9fafb', borderRadius: 8, marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Question {sq.number}
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: sq.questionText }} style={{ marginBottom: 8 }} />
                    <div style={{ padding: 8, background: '#fff', borderRadius: 6 }}>
                      <strong>Đáp án học sinh:</strong> {answers[sq.id] || '(Chưa trả lời)'}
                    </div>
                    {sq.correctAnswer && (
                      <div style={{ padding: 8, background: '#dcfce7', borderRadius: 6, marginTop: 8 }}>
                        <strong>Đáp án đúng:</strong> {sq.correctAnswer}
                      </div>
                    )}
                  </div>
                ));
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Grading panel */}
      <div style={{ width: 400, background: '#fff', borderLeft: '1px solid #e5e7eb', padding: 24, overflow: 'auto' }}>
        <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 700 }}>Chấm điểm</h2>

        <form onSubmit={handleSubmitGrade}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              Điểm <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="number"
              step="0.5"
              max={submission.assignment?.maxScore || 100}
              value={gradeData.score}
              onChange={(e) => setGradeData({ ...gradeData, score: e.target.value })}
              required
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
              Tối đa: {submission.assignment?.maxScore || 100}
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Nhận xét</label>
            <textarea
              value={gradeData.feedback}
              onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
              rows={8}
              placeholder="Nhập nhận xét cho học sinh..."
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db', resize: 'vertical' }}
            />
          </div>

          <button type="submit" className="lms-cta" style={{ width: '100%', padding: 12 }}>
            <Save size={16} /> Lưu điểm
          </button>
        </form>
      </div>
    </div>
  );
}
