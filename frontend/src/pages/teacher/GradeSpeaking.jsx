import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/authApi';
import './GradeSpeaking.css';

const CRITERIA = [
  { key: 'fluencyCoherence', label: 'Fluency & Coherence', desc: 'Độ trôi chảy và mạch lạc' },
  { key: 'lexicalResource', label: 'Lexical Resource', desc: 'Vốn từ vựng' },
  { key: 'grammaticalRangeAccuracy', label: 'Grammar', desc: 'Ngữ pháp' },
  { key: 'pronunciation', label: 'Pronunciation', desc: 'Phát âm' }
];

const GradeSpeaking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const res = await authApi.get(`/api/speaking/attempts/${id}`);
      setAttempt(res.data);
      
      if (res.data.score) {
        setScores({
          fluencyCoherence: res.data.score.fluencyCoherence,
          lexicalResource: res.data.score.lexicalResource,
          grammaticalRangeAccuracy: res.data.score.grammaticalRangeAccuracy,
          pronunciation: res.data.score.pronunciation
        });
        setFeedback(res.data.feedback || '');
      }
    } catch (err) {
      alert('Lỗi tải dữ liệu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (key, value) => {
    setScores(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const handleSubmit = async () => {
    if (Object.values(scores).some(s => s < 0 || s > 9)) {
      alert('Điểm phải từ 0-9');
      return;
    }

    try {
      await authApi.post(`/api/speaking/grade/${id}`, { ...scores, feedback });
      alert('Chấm bài thành công!');
      navigate('/teacher/submissions');
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  if (loading) return <div className="grade-loading">Đang tải...</div>;

  const avgBand = Object.values(scores).reduce((sum, s) => sum + s, 0) / 4;

  return (
    <div className="grade-speaking">
      <div className="grade-header">
        <h1>Chấm bài Speaking</h1>
        <button onClick={() => navigate(-1)}>← Quay lại</button>
      </div>

      <div className="grade-content">
        <div className="attempt-info">
          <h3>Thông tin bài thi</h3>
          <p><strong>Học sinh:</strong> {attempt?.username}</p>
          <p><strong>Part:</strong> {attempt?.part}</p>
          <p><strong>Thời gian:</strong> {new Date(attempt?.createdAt).toLocaleString('vi-VN')}</p>
        </div>

        {attempt?.audioUrl && (
          <div className="audio-section">
            <h3>Bài thu âm</h3>
            <audio controls src={attempt.audioUrl} style={{ width: '100%' }} />
          </div>
        )}

        <div className="grading-section">
          <h3>Chấm điểm theo tiêu chí</h3>
          {CRITERIA.map(c => (
            <div key={c.key} className="criteria-item">
              <div className="criteria-header">
                <h4>{c.label}</h4>
                <p>{c.desc}</p>
              </div>
              <input
                type="number"
                min="0"
                max="9"
                step="0.5"
                value={scores[c.key] || ''}
                onChange={(e) => handleScoreChange(c.key, e.target.value)}
                placeholder="0-9"
              />
            </div>
          ))}

          <div className="overall-band">
            <h4>Band Score: <span>{avgBand.toFixed(1)}</span></h4>
          </div>

          <div className="feedback-section">
            <label>Nhận xét:</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Nhận xét về bài nói..."
              rows="6"
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

export default GradeSpeaking;
