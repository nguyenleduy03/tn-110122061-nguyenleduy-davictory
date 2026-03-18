import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';

export default function TestApiPage() {
  const [result, setResult] = useState('Chưa test...');
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    setResult('Đang test...');
    
    try {
      console.log('Testing API:', API_CONFIG.BASE_URL);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/tests/published`);
      console.log('Response:', response);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Data:', data);
      
      setResult(`✅ Thành công! Nhận được ${data.length} tests`);
    } catch (error) {
      console.error('Error:', error);
      setResult(`❌ Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testApi();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Test API Debug</h1>
      <p><strong>API URL:</strong> {API_CONFIG.BASE_URL}/tests/published</p>
      <p><strong>Status:</strong> {loading ? 'Loading...' : result}</p>
      <button onClick={testApi} disabled={loading}>
        Test lại
      </button>
    </div>
  );
}
