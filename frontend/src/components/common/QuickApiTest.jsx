import React, { useState } from 'react';
import { API_CONFIG } from '../../config/api';

const QuickApiTest = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    setResult('Testing...');
    
    try {
      console.log('Testing API:', `${API_CONFIG.BASE_URL}/tests/published`);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/tests/published`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}\nResponse: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (Array.isArray(data)) {
        setResult(`✅ Success! Found ${data.length} tests
        
Response Details:
- Status: ${response.status} ${response.statusText}
- Content-Type: ${response.headers.get('content-type')}
- Data Length: ${data.length}

First Test Sample:
${data.length > 0 ? JSON.stringify(data[0], null, 2) : 'No tests found'}

All Tests:
${JSON.stringify(data, null, 2)}`);
      } else {
        setResult(`✅ Response received but not an array:
${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      console.error('API Error:', error);
      setResult(`❌ Error: ${error.message}
      
URL: ${API_CONFIG.BASE_URL}/tests/published
Stack: ${error.stack}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', margin: '20px' }}>
      <h3>Quick API Test</h3>
      <p><strong>URL:</strong> {API_CONFIG.BASE_URL}/tests/published</p>
      
      <button 
        onClick={testApi} 
        disabled={loading}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: loading ? '#ccc' : '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px', 
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '15px'
        }}
      >
        {loading ? 'Testing...' : 'Test API'}
      </button>
      
      {result && (
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '4px', 
          overflow: 'auto', 
          maxHeight: '300px',
          fontSize: '12px',
          whiteSpace: 'pre-wrap'
        }}>
          {result}
        </pre>
      )}
    </div>
  );
};

export default QuickApiTest;
