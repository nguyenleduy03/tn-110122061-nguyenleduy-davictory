import React, { useState } from 'react';
import { API_CONFIG } from '../../config/api';

const TestSessionDebug = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [testId, setTestId] = useState('1');

  const testGetTestSession = async () => {
    setLoading(true);
    setResult('Testing getTestSession API calls...');
    
    try {
      const baseUrl = API_CONFIG.BASE_URL;
      let analysis = `Testing Test Session API for testId: ${testId}\n\n`;

      // 1. Test metadata
      try {
        const testResponse = await fetch(`${baseUrl}/tests/${testId}`);
        if (testResponse.ok) {
          const testData = await testResponse.json();
          analysis += `✅ 1. Test Metadata (/tests/${testId}):\n`;
          analysis += `- ID: ${testData.id}\n`;
          analysis += `- Title: "${testData.title}"\n`;
          analysis += `- Type: ${testData.testType}\n`;
          analysis += `- Status: ${testData.status}\n`;
          analysis += `- IsFullTest: ${testData.isFullTest}\n\n`;
        } else {
          analysis += `❌ 1. Test Metadata: HTTP ${testResponse.status}\n\n`;
        }
      } catch (e) {
        analysis += `❌ 1. Test Metadata Error: ${e.message}\n\n`;
      }

      // 2. Test sessions
      try {
        const sessionsResponse = await fetch(`${baseUrl}/tests/${testId}/sessions`);
        if (sessionsResponse.ok) {
          const sessions = await sessionsResponse.json();
          analysis += `✅ 2. Test Sessions (/tests/${testId}/sessions):\n`;
          analysis += `- Count: ${sessions.length}\n`;
          
          if (sessions.length > 0) {
            sessions.forEach((s, i) => {
              analysis += `- Session ${i + 1}: ${s.skillType} (ID: ${s.id}, SessionID: ${s.sessionId})\n`;
              analysis += `  - Name: "${s.sessionName}"\n`;
              analysis += `  - Duration: ${s.durationMinutes}min\n`;
              analysis += `  - Included: ${s.isIncluded}\n`;
              analysis += `  - Parts: ${s.partCount}\n`;
            });
            
            // Test parts for first session
            const firstSession = sessions[0];
            analysis += `\n✅ 3. Test Parts for first session (${firstSession.skillType}):\n`;
            
            try {
              const partsResponse = await fetch(`${baseUrl}/tests/${testId}/sessions/${firstSession.id}/parts`);
              if (partsResponse.ok) {
                const parts = await partsResponse.json();
                analysis += `- Parts Count: ${parts.length}\n`;
                parts.forEach((p, i) => {
                  analysis += `- Part ${i + 1}: "${p.partName}" (ID: ${p.id})\n`;
                });
              } else {
                analysis += `❌ Parts Error: HTTP ${partsResponse.status}\n`;
              }
            } catch (e) {
              analysis += `❌ Parts Error: ${e.message}\n`;
            }
          } else {
            analysis += `⚠️ No sessions found - test may not be properly configured\n`;
          }
        } else {
          analysis += `❌ 2. Test Sessions: HTTP ${sessionsResponse.status}\n`;
        }
      } catch (e) {
        analysis += `❌ 2. Test Sessions Error: ${e.message}\n`;
      }

      analysis += `\n📋 Frontend Expectation:\n`;
      analysis += `- ieltsApi.getTestSession() expects sessions with skillType field\n`;
      analysis += `- Should find session where skillType === "READING"\n`;
      analysis += `- Then load parts and question groups for that session\n`;

      setResult(analysis);
    } catch (error) {
      setResult(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', margin: '20px' }}>
      <h3>Test Session API Debug</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label>Test ID: </label>
        <input 
          type="number" 
          value={testId} 
          onChange={(e) => setTestId(e.target.value)}
          style={{ padding: '5px', marginLeft: '10px', width: '100px' }}
        />
      </div>
      
      <button 
        onClick={testGetTestSession} 
        disabled={loading}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: loading ? '#ccc' : '#17a2b8', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px', 
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '15px'
        }}
      >
        {loading ? 'Testing...' : 'Test Session APIs'}
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

export default TestSessionDebug;
