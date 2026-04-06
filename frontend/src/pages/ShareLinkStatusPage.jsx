import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from 'lucide-react';

const pageStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  background: 'radial-gradient(circle at top, #eff6ff 0%, #f8fafc 44%, #eef2ff 100%)',
};

const cardStyle = {
  width: 'min(760px, 100%)',
  background: 'rgba(255,255,255,0.96)',
  borderRadius: 24,
  border: '1px solid rgba(148, 163, 184, 0.18)',
  boxShadow: '0 28px 80px rgba(15, 23, 42, 0.18)',
  padding: 28,
};

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px',
  borderRadius: 999,
  background: '#fff7ed',
  color: '#c2410c',
  fontSize: 12,
  fontWeight: 700,
};

const actionRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  marginTop: 24,
};

const primaryBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  color: '#fff',
  borderRadius: 14,
  padding: '12px 18px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  textDecoration: 'none',
};

const secondaryBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#334155',
  borderRadius: 14,
  padding: '12px 18px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  textDecoration: 'none',
};

export default function ShareLinkStatusPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const stateReason = location.state?.reason;
  const message = stateReason || 'Link chia sẻ này không còn sử dụng được.';

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <span style={badgeStyle}>
          <AlertTriangle size={14} /> Link không hợp lệ
        </span>

        <h1 style={{ margin: '16px 0 0', fontSize: 28, lineHeight: 1.2, color: '#0f172a' }}>
          Link công khai đã hết hạn hoặc bị vô hiệu hóa
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.7, color: '#475569', maxWidth: 680 }}>
          {message}
        </p>

        <div style={actionRowStyle}>
          <button type="button" style={primaryBtnStyle} onClick={() => navigate('/exam-library')}>
            <Home size={16} /> Về thư viện đề thi
          </button>
          <button type="button" style={secondaryBtnStyle} onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Quay lại
          </button>
          <button type="button" style={secondaryBtnStyle} onClick={() => window.location.reload()}>
            <RefreshCw size={16} /> Tải lại
          </button>
        </div>
      </div>
    </div>
  );
}