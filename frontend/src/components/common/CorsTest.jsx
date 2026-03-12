import React, { useState } from 'react';
import { API_CONFIG } from '../../config/api';

const CorsTest = () => {
  const [result, setResult] = useState('');

  const testCors = async () => {
    setResult('Testing CORS...');
    
    try {
      // Test simple GET request using public endpoint
      const response = await fetch(`${API_CONFIG.BASE_URL}/tests/published`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      setResult(`CORS Test Result:
API URL: ${API_CONFIG.BASE_URL}/tests/published
Status: ${response.status} ${response.statusText}
Headers: ${JSON.stringify([...response.headers.entries()], null, 2)}
URL: ${response.url}
Type: ${response.type}
OK: ${response.ok}`);
      
    } catch (error) {
      setResult(`CORS Error: ${error.message}
API URL: ${API_CONFIG.BASE_URL}/tests/published
Stack: ${error.stack}`);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', margin: '20px' }}>
      <h3>CORS Test</h3>
      <p><strong>Current hostname:</strong> {window.location.hostname}</p>
      <p><strong>API Base URL:</strong> {API_CONFIG.BASE_URL}</p>
      <button onClick={testCors} style={{ padding: '10px 20px', marginBottom: '15px' }}>
        Test CORS
      </button>
      
      {result && (
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '4px', 
          overflow: 'auto', 
          fontSize: '12px',
          whiteSpace: 'pre-wrap'
        }}>
          {result}
        </pre>
      )}
    </div>
  );
};

export default CorsTest;
