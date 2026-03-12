import React, { useState } from 'react';
import { API_CONFIG } from '../../config/api';

const DatabaseDebug = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const checkDatabase = async () => {
    setLoading(true);
    setResult('Checking database...');
    
    try {
      // Cần login để access /api/tests (tất cả tests)
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setResult(`❌ Need to login first to check all tests
        
Available checks without login:
- /api/tests/published (public endpoint)

To check all tests in database, please login first.`);
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/tests`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      let analysis = `✅ Database Analysis:
      
Total Tests: ${Array.isArray(data) ? data.length : 'N/A'}

Status Breakdown:`;

      if (Array.isArray(data)) {
        const statusCount = {};
        const typeCount = {};
        
        data.forEach(test => {
          statusCount[test.status] = (statusCount[test.status] || 0) + 1;
          typeCount[test.testType] = (typeCount[test.testType] || 0) + 1;
        });
        
        analysis += `
${Object.entries(statusCount).map(([status, count]) => `- ${status}: ${count}`).join('\n')}

Test Type Breakdown:
${Object.entries(typeCount).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

Published Tests: ${statusCount['PUBLISHED'] || 0}
Draft Tests: ${statusCount['DRAFT'] || 0}

Sample Tests:
${data.slice(0, 3).map(test => `- ID: ${test.id}, Title: "${test.title}", Status: ${test.status}, Type: ${test.testType}`).join('\n')}

Recommendation:
${statusCount['PUBLISHED'] ? '✅ Has published tests' : '❌ No published tests - need to publish some tests first'}`;
      }
      
      setResult(analysis);
    } catch (error) {
      setResult(`❌ Error: ${error.message}
      
This might be because:
1. Not logged in (need TEACHER/ADMIN role)
2. Backend not running
3. Database connection issue

Try logging in first, then run this check.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', margin: '20px' }}>
      <h3>Database Debug</h3>
      <p><strong>Checking:</strong> All tests in database (requires login)</p>
      
      <button 
        onClick={checkDatabase} 
        disabled={loading}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: loading ? '#ccc' : '#dc3545', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px', 
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '15px'
        }}
      >
        {loading ? 'Checking...' : 'Check Database'}
      </button>
      
      {result && (
        <pre style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '4px', 
          overflow: 'auto', 
          maxHeight: '400px',
          fontSize: '12px',
          whiteSpace: 'pre-wrap',
          border: '1px solid #dee2e6'
        }}>
          {result}
        </pre>
      )}
    </div>
  );
};

export default DatabaseDebug;
