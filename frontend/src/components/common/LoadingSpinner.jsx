import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ size = 24, text = 'Đang tải...', center = true }) => {
  const style = center ? {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: '12px'
  } : {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px'
  };

  return (
    <div style={style}>
      <Loader2 size={size} style={{ animation: 'spin 1s linear infinite' }} />
      {text && <span style={{ color: '#6b7280', fontSize: '14px' }}>{text}</span>}
    </div>
  );
};

export default LoadingSpinner;
