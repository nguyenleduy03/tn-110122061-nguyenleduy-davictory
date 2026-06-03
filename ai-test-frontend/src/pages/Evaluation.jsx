import { useState } from 'react';
import { BarChart3, Activity, Target } from 'lucide-react';
import { writingApi } from '../api/writingApi';
import ResponseViewer from '../components/ResponseViewer';

export default function Evaluation() {
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState('');

  async function callApi(fn, lbl) {
    setLoading(true);
    setError(null);
    setResponse(null);
    setLabel(lbl);
    try {
      const res = await fn();
      setResponse(res.data);
    } catch (err) {
      const msg = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="main">
      <div className="page-header">
        <h1><BarChart3 size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} />Evaluation & Analytics</h1>
        <p>Accuracy metrics and grading statistics for AI services</p>
      </div>

      <div className="card-grid">
        <div className="card">
          <h3><Target size={18} /> Accuracy Metrics</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            AI vs teacher grading comparison: MAE, RMSE, Pearson correlation, exact/band match
          </p>
          <button
            className="btn btn-primary"
            onClick={() => callApi(() => writingApi.getEvaluationAccuracy(), 'Accuracy')}
            disabled={loading}
          >
            <Activity size={16} /> Load Accuracy Data
          </button>
        </div>

        <div className="card">
          <h3><BarChart3 size={18} /> Grading Statistics</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Total graded, approval rate, by provider breakdown
          </p>
          <button
            className="btn btn-primary"
            onClick={() => callApi(() => writingApi.getEvaluationStats(), 'Stats')}
            disabled={loading}
          >
            <BarChart3 size={16} /> Load Statistics
          </button>
        </div>
      </div>

      <ResponseViewer response={response} error={error} loading={loading} label={label} />
    </div>
  );
}
