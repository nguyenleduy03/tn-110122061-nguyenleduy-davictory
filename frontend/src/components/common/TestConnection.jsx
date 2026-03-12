import { useState, useEffect } from 'react';
import { API_CONFIG } from '../../config/api';

const TestConnection = () => {
  const [status, setStatus] = useState({
    backend: 'checking',
    auth: 'checking',
    tests: 'checking'
  });

  useEffect(() => {
    testConnections();
  }, []);

  const testConnections = async () => {
    // Test backend health - sử dụng endpoint public
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/tests/published`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      console.log('Backend response:', response.status, response.statusText);
      setStatus(prev => ({ ...prev, backend: response.ok ? 'connected' : 'error' }));
    } catch (error) {
      console.error('Backend error:', error);
      setStatus(prev => ({ ...prev, backend: 'error' }));
    }

    // Test auth endpoint
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/me`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      console.log('Auth response:', response.status, response.statusText);
      // 401 = chưa login (bình thường), 200 = đã login
      setStatus(prev => ({ ...prev, auth: response.status === 401 ? 'ready' : response.status === 200 ? 'connected' : 'error' }));
    } catch (error) {
      console.error('Auth error:', error);
      setStatus(prev => ({ ...prev, auth: 'error' }));
    }

    // Test tests endpoint
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/tests/published`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      console.log('Tests response:', response.status, response.statusText);
      if (response.ok) {
        const data = await response.json();
        console.log('Tests data:', data);
      }
      setStatus(prev => ({ ...prev, tests: response.ok ? 'connected' : 'error' }));
    } catch (error) {
      console.error('Tests error:', error);
      setStatus(prev => ({ ...prev, tests: 'error' }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return '#4CAF50';
      case 'ready': return '#2196F3';
      case 'error': return '#f44336';
      default: return '#ff9800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'ready': return 'Ready';
      case 'error': return 'Error';
      default: return 'Checking...';
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', margin: '20px' }}>
      <h3>Backend Connection Status</h3>
      <p><strong>API Base URL:</strong> {API_CONFIG.BASE_URL}</p>
      
      <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
        <div>
          <div style={{ color: getStatusColor(status.backend) }}>
            ● Backend: {getStatusText(status.backend)}
          </div>
        </div>
        <div>
          <div style={{ color: getStatusColor(status.auth) }}>
            ● Auth: {getStatusText(status.auth)}
          </div>
        </div>
        <div>
          <div style={{ color: getStatusColor(status.tests) }}>
            ● Tests: {getStatusText(status.tests)}
          </div>
        </div>
      </div>
      
      <button 
        onClick={testConnections}
        style={{ marginTop: '15px', padding: '8px 16px', cursor: 'pointer' }}
      >
        Retry Connection
      </button>
    </div>
  );
};

export default TestConnection;
