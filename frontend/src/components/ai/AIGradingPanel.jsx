import { useState } from 'react';
import aiApi from '../../services/aiApi';

export default function AIGradingPanel({ submissionId, onApprove, onReject }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('idle');

  const handleGradeByAI = async () => {
    setLoading(true);
    setError(null);
    setMode('grading');
    try {
      const response = await aiApi.gradeWriting(submissionId);
      setResult(response.data);
      setMode('completed');
    } catch (err) {
      setError(err.response?.data?.error || 'AI grading failed');
      setMode('error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await aiApi.approveGrade(submissionId);
      if (onApprove) onApprove(result);
      setMode('approved');
    } catch (err) {
      setError('Failed to approve: ' + err.message);
    }
  };

  const handleReject = async () => {
    try {
      await aiApi.rejectGrade(submissionId);
      if (onReject) onReject();
      setMode('idle');
      setResult(null);
    } catch (err) {
      setError('Failed to reject: ' + err.message);
    }
  };

  if (mode === 'grading') {
    return (
      <div className="ai-grading-panel">
        <div className="ai-grading-loading">
          <div className="spinner" />
          <p>🤖 AI đang chấm bài...</p>
          <p className="text-muted">Đang phân tích bài viết theo 4 tiêu chí IELTS</p>
        </div>
      </div>
    );
  }

  if (mode === 'completed' && result) {
    return (
      <div className="ai-grading-panel">
        <div className="ai-grading-header">
          <span className="ai-badge">🤖 AI Graded</span>
          <span className="ai-confidence">
            Confidence: {(result.confidenceScore * 100).toFixed(0)}%
          </span>
        </div>

        <div className="ai-overall-band">
          <span className="band-label">Overall Band</span>
          <span className="band-value">{result.overallBand?.toFixed(1)}</span>
        </div>

        <div className="ai-criteria-grid">
          {[
            { label: 'Task Achievement', key: 'taskResponse', score: result.taskResponse },
            { label: 'Coherence & Cohesion', key: 'coherenceCohesion', score: result.coherenceCohesion },
            { label: 'Lexical Resource', key: 'lexicalResource', score: result.lexicalResource },
            { label: 'Grammatical Range', key: 'grammaticalRange', score: result.grammaticalRange },
          ].map(criteria => criteria.score && (
            <div key={criteria.key} className="ai-criteria-card">
              <div className="criteria-header">
                <span className="criteria-name">{criteria.label}</span>
                <span className="criteria-band">{criteria.score.band?.toFixed(1)}</span>
              </div>
              <div className="criteria-detail">
                {criteria.score.strengths?.length > 0 && (
                  <div className="strengths">
                    <strong>Strengths:</strong>
                    <ul>{criteria.score.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                )}
                {criteria.score.weaknesses?.length > 0 && (
                  <div className="weaknesses">
                    <strong>Weaknesses:</strong>
                    <ul>{criteria.score.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="ai-feedback">
          <strong>Overall Feedback:</strong>
          <p>{result.overallFeedback}</p>
        </div>

        {result.referenceSampleIds?.length > 0 && (
          <div className="ai-references">
            <small>
              Reference samples: #{result.referenceSampleIds.join(', #')}
            </small>
          </div>
        )}

        <div className="ai-actions">
          <button className="btn btn-success" onClick={handleApprove}>
            ✅ Dùng kết quả này
          </button>
          <button className="btn btn-outline-secondary" onClick={handleReject}>
            ❌ Từ chối
          </button>
        </div>

        {error && <div className="alert alert-danger mt-2">{error}</div>}
      </div>
    );
  }

  if (mode === 'approved') {
    return (
      <div className="ai-grading-panel">
        <div className="alert alert-success">
          ✅ Đã lưu điểm AI. Giáo viên có thể chỉnh sửa nếu cần.
        </div>
      </div>
    );
  }

  return (
    <div className="ai-grading-panel">
      <div className="ai-grading-idle">
        <p>🤖 Chấm bài tự động bằng AI</p>
        <p className="text-muted small">
          AI sẽ chấm theo 4 tiêu chí IELTS và đưa ra feedback chi tiết.
          Kết quả AI cần được giáo viên phê duyệt.
        </p>
        <button
          className="btn btn-primary"
          onClick={handleGradeByAI}
          disabled={loading}
        >
          {loading ? 'Đang chấm...' : '🚀 Chấm bằng AI'}
        </button>
      </div>
      {error && <div className="alert alert-danger mt-2">{error}</div>}
    </div>
  );
}
