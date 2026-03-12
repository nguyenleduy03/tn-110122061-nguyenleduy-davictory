import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

const ErrorMessage = ({ 
  message = 'Đã xảy ra lỗi', 
  onRetry = null, 
  center = true,
  type = 'error' // 'error' | 'warning' | 'info'
}) => {
  const colors = {
    error: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', icon: '#ef4444' },
    warning: { bg: '#fffbeb', border: '#fed7aa', text: '#d97706', icon: '#f59e0b' },
    info: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', icon: '#3b82f6' }
  };

  const color = colors[type];
  
  const style = center ? {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: '12px'
  } : {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px'
  };

  return (
    <div style={{
      ...style,
      backgroundColor: color.bg,
      border: `1px solid ${color.border}`,
      borderRadius: '8px',
      margin: center ? '20px' : '0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <AlertCircle size={20} style={{ color: color.icon }} />
        <span style={{ color: color.text, fontSize: '14px' }}>{message}</span>
      </div>
      
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: color.icon,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <RefreshCw size={16} />
          Thử lại
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
