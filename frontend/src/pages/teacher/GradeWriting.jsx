import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teacherApi } from '../../services/teacherApi';
import './GradeWriting.css';

const GradeWriting = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [submission, criteria] = await Promise.all([
        teacherApi.getWritingSubmission(id),
        teacherApi.getWritingCriteria()
      ]);
      setSubmission(submission);
      setCriteria(criteria);
      
      // Pre-fill nếu đã chấm
      if (submission.scores) {
        const scoreMap = {};
        submission.scores.forEach(s => {
          scoreMap[s.criteriaId] = { score: s.score, feedback: s.feedback || '' };
        });
        setScores(scoreMap);
      }
      setFeedback(submission.overallFeedback || '');
    } catch (err) {
      alert('Lỗi tải dữ liệu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (criteriaId, field, value) => {
    setScores(prev => ({
      ...prev,
      [criteriaId]: { ...prev[criteriaId], [field]: value }
    }));
  };

  const handleSubmit = async () => {
    const criteriaScores = criteria.map(c => ({
      criteriaId: c.id,
      score: parseFloat(scores[c.id]?.score || 0),
      feedback: scores[c.id]?.feedback || ''
    }));

    if (criteriaScores.some(cs => cs.score < 0 || cs.score > 9)) {
      alert('Điểm phải từ 0-9');
      return;
    }

    try {
      await teacherApi.gradeWritingSubmission(id, {
        criteriaScores,
        overallFeedback: feedback
      });
      alert('Chấm bài thành công!');
      navigate('/lms/teacher/submissions');
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  if (loading) return <div className="grade-loading">Đang tải...</div>;

  const avgBand = criteria.length > 0
    ? criteria.reduce((sum, c) => sum + (parseFloat(scores[c.id]?.score) || 0), 0) / criteria.length
    : 0;

  return (
    <div className="grade-writing">
      <div className="grade-header">
        <h1>Chấm bài Writing</h1>
        <button onClick={() => navigate(-1)}>← Quay lại</button>
      </div>

      <div className="grade-content">
        <div className="submission-info">
          <h3>Thông tin bài làm</h3>
          <p><strong>Học sinh:</strong> {submission?.username}</p>
          <p><strong>Đề bài:</strong> {submission?.groupTitle}</p>
          <p><strong>Nộp lúc:</strong> {new Date(submission?.submittedAt).toLocaleString('vi-VN')}</p>
        </div>

        <div className="submission-content">
          <h3>Bài làm</h3>
          <div className="essay-text">{submission?.essayText}</div>
          <p className="word-count">Số từ: {submission?.wordCount || 0}</p>
        </div>

        <div className="grading-section">
          <h3>Chấm điểm theo tiêu chí</h3>
          {criteria.map(c => (
            <div key={c.id} className="criteria-item">
              <h4>{c.name}</h4>
              <p className="criteria-desc">{c.description}</p>
              <div className="criteria-input">
                <label>Điểm (0-9):</label>
                <input
                  type="number"
                  min="0"
                  max="9"
                  step="0.5"
                  value={scores[c.id]?.score || ''}
                  onChange={(e) => handleScoreChange(c.id, 'score', e.target.value)}
                />
              </div>
              <div className="criteria-feedback">
                <label>Nhận xét:</label>
                <textarea
                  value={scores[c.id]?.feedback || ''}
                  onChange={(e) => handleScoreChange(c.id, 'feedback', e.target.value)}
                  placeholder="Nhận xét cho tiêu chí này..."
                />
              </div>
            </div>
          ))}

          <div className="overall-band">
            <h4>Band Score trung bình: <span>{avgBand.toFixed(1)}</span></h4>
          </div>

          <div className="overall-feedback">
            <label>Nhận xét tổng quan:</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Nhận xét chung về bài viết..."
              rows="5"
            />
          </div>

          <button className="submit-grade-btn" onClick={handleSubmit}>
            Lưu điểm
          </button>
        </div>
      </div>
    </div>
  );
};

export default GradeWriting;
