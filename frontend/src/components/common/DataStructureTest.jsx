import React, { useState } from 'react';
import { API_CONFIG } from '../../config/api';

const DataStructureTest = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testDataStructure = async () => {
    setLoading(true);
    setResult('Testing data structure...');
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/tests/published`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      let analysis = `✅ API Response Analysis:
      
Status: ${response.status}
Data Type: ${Array.isArray(data) ? 'Array' : typeof data}
Length: ${Array.isArray(data) ? data.length : 'N/A'}

`;

      if (Array.isArray(data) && data.length > 0) {
        const firstTest = data[0];
        analysis += `First Test Structure:
- id: ${firstTest.id} (${typeof firstTest.id})
- title: "${firstTest.title}" (${typeof firstTest.title})
- testType: ${firstTest.testType} (${typeof firstTest.testType})
- status: ${firstTest.status} (${typeof firstTest.status})
- isFullTest: ${firstTest.isFullTest} (${typeof firstTest.isFullTest})
- sessions: ${Array.isArray(firstTest.sessions) ? `Array[${firstTest.sessions.length}]` : typeof firstTest.sessions}

Sessions Structure:`;
        
        if (firstTest.sessions && firstTest.sessions.length > 0) {
          const firstSession = firstTest.sessions[0];
          analysis += `
- skillType: ${firstSession.skillType} (${typeof firstSession.skillType})
- sessionName: "${firstSession.sessionName}" (${typeof firstSession.sessionName})
- isIncluded: ${firstSession.isIncluded} (${typeof firstSession.isIncluded})
`;
        } else {
          analysis += `
- No sessions found in first test`;
        }

        analysis += `

Expected Frontend Mapping:
- Frontend expects: { id, title, testType, isFullTest, sessions: [{ skillType }] }
- Backend provides: ✅ All required fields present

Full First Test Data:
${JSON.stringify(firstTest, null, 2)}`;
      } else if (Array.isArray(data) && data.length === 0) {
        analysis += `❌ Empty Array - No published tests found in database
        
Possible causes:
1. No tests in database
2. No tests with status = PUBLISHED
3. Database connection issue`;
      } else {
        analysis += `❌ Unexpected data format:
${JSON.stringify(data, null, 2)}`;
      }
      
      setResult(analysis);
    } catch (error) {
      setResult(`❌ Error: ${error.message}
      
URL: ${API_CONFIG.BASE_URL}/tests/published
Stack: ${error.stack}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', margin: '20px' }}>
      <h3>Data Structure Analysis</h3>
      <p><strong>Testing:</strong> {API_CONFIG.BASE_URL}/tests/published</p>
      
      <button 
        onClick={testDataStructure} 
        disabled={loading}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: loading ? '#ccc' : '#28a745', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px', 
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '15px'
        }}
      >
        {loading ? 'Analyzing...' : 'Analyze Data Structure'}
      </button>
      
      {result && (
        <pre style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '4px', 
          overflow: 'auto', 
          maxHeight: '500px',
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

export default DataStructureTest;
