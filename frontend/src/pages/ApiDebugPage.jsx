import React, { useState } from 'react';
import { authApi } from '../services/authApi';
import { ieltsApi } from '../services/ieltsApi';
import { testBuilderApi } from '../services/testBuilderApi';
import { API_CONFIG } from '../config/api';
import TestConnection from '../components/common/TestConnection';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

const ApiDebugPage = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const testApi = async (name, apiCall) => {
    setLoading(prev => ({ ...prev, [name]: true }));
    try {
      const result = await apiCall();
      setResults(prev => ({ ...prev, [name]: { success: true, data: result } }));
    } catch (error) {
      setResults(prev => ({ ...prev, [name]: { success: false, error: error.message } }));
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }));
    }
  };

  const tests = [
    {
      name: 'Auth - Current User',
      call: () => authApi.getCurrentUser()
    },
    {
      name: 'Tests - Published',
      call: () => fetch(`${API_CONFIG.BASE_URL}/tests/published`).then(r => r.json())
    },
    {
      name: 'Test Builder - Structure',
      call: () => testBuilderApi.getStructure('ACADEMIC')
    },
    {
      name: 'IELTS - Test Session',
      call: () => ieltsApi.getTestSession(1, 'READING')
    }
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>API Debug & Test Page</h1>
      <p><strong>Backend URL:</strong> {API_CONFIG.BASE_URL}</p>
      
      <TestConnection />
      
      <div style={{ marginTop: '30px' }}>
        <h2>API Endpoint Tests</h2>
        <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
          {tests.map(({ name, call }) => (
            <div key={name} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0 }}>{name}</h3>
                <button
                  onClick={() => testApi(name, call)}
                  disabled={loading[name]}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: loading[name] ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading[name] ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading[name] ? 'Testing...' : 'Test'}
                </button>
              </div>
              
              {loading[name] && <LoadingSpinner size={16} text="Testing..." center={false} />}
              
              {results[name] && (
                <div style={{ marginTop: '12px' }}>
                  {results[name].success ? (
                    <div style={{ padding: '12px', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '4px' }}>
                      <strong style={{ color: '#155724' }}>✅ Success</strong>
                      <pre style={{ marginTop: '8px', fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
                        {JSON.stringify(results[name].data, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div style={{ padding: '12px', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px' }}>
                      <strong style={{ color: '#721c24' }}>❌ Error</strong>
                      <p style={{ margin: '8px 0 0 0', color: '#721c24' }}>{results[name].error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ApiDebugPage;
