import { useState, useEffect } from 'react';
import aiApi from '../../services/aiApi';

export default function AIInsightsCard({ userId }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [userId]);

  const loadInsights = async () => {
    try {
      const response = await aiApi.getInsights(userId);
      setInsights(response.data);
    } catch {
      // AI Insights not available yet - silently ignore
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="ai-insights-card">
        <div className="card">
          <div className="card-body">
            <div className="spinner-sm" />
            <p className="text-muted mt-2">AI đang phân tích...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="ai-insights-card">
      <div className="card">
        <div className="card-header">
          <h5>🤖 AI Learning Insights</h5>
        </div>
        <div className="card-body">
          {insights.predictedBand && (
            <div className="insight-item predicted-band">
              <span className="insight-label">Band dự kiến hiện tại:</span>
              <span className="insight-value">{insights.predictedBand}</span>
            </div>
          )}

          {insights.weakSkills?.length > 0 && (
            <div className="insight-section">
              <h6 className="text-danger">🔴 Cần cải thiện</h6>
              {insights.weakSkills.map((skill, i) => (
                <div key={i} className="skill-bar">
                  <span>{skill.name}</span>
                  <div className="progress">
                    <div
                      className="progress-bar bg-danger"
                      style={{ width: `${skill.percentage}%` }}
                    />
                  </div>
                  <span className="skill-band">{skill.band}</span>
                </div>
              ))}
            </div>
          )}

          {insights.strongSkills?.length > 0 && (
            <div className="insight-section">
              <h6 className="text-success">🟢 Điểm mạnh</h6>
              {insights.strongSkills.map((skill, i) => (
                <div key={i} className="skill-bar">
                  <span>{skill.name}</span>
                  <div className="progress">
                    <div
                      className="progress-bar bg-success"
                      style={{ width: `${skill.percentage}%` }}
                    />
                  </div>
                  <span className="skill-band">{skill.band}</span>
                </div>
              ))}
            </div>
          )}

          {insights.recommendations?.length > 0 && (
            <div className="insight-section">
              <h6>📋 Đề xuất</h6>
              <ul className="recommendation-list">
                {insights.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {insights.estimatedHours && (
            <div className="insight-item study-time">
              <span className="insight-label">⏱️ Thời gian cần để đạt target:</span>
              <span className="insight-value">{insights.estimatedHours} giờ</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
