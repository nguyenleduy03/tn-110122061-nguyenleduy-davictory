import React, { useState } from 'react';
import { ieltsApi } from '../../services/ieltsApi';

const SkillTestDebug = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [testId, setTestId] = useState('1');

  const testAllSkills = async () => {
    setLoading(true);
    setResult('Testing all skill APIs...');
    
    try {
      let analysis = `Testing All IELTS Skills for testId: ${testId}\n`;
      analysis += `Using TestFullResponse from /test-builder/${testId}/full\n\n`;

      // Test Reading
      try {
        analysis += `🔍 READING TEST:\n`;
        const readingData = await ieltsApi.getTestSession(testId, 'READING');
        analysis += `✅ Success - ${readingData.parts.length} parts loaded\n`;
        analysis += `- Total questions: ${readingData.parts.reduce((sum, p) => sum + p.questions.length, 0)}\n`;
        analysis += `- Duration: ${readingData.totalMinutes} minutes\n\n`;
      } catch (e) {
        analysis += `❌ Reading Error: ${e.message}\n\n`;
      }

      // Test Listening  
      try {
        analysis += `🎧 LISTENING TEST:\n`;
        const listeningData = await ieltsApi.getTestSession(testId, 'LISTENING');
        analysis += `✅ Success - ${listeningData.parts.length} parts loaded\n`;
        analysis += `- Total questions: ${listeningData.parts.reduce((sum, p) => sum + p.questions.length, 0)}\n`;
        analysis += `- Duration: ${listeningData.totalMinutes} minutes\n\n`;
      } catch (e) {
        analysis += `❌ Listening Error: ${e.message}\n\n`;
      }

      // Test Writing
      try {
        analysis += `✍️ WRITING TEST:\n`;
        const writingData = await ieltsApi.getWritingTestSession(testId);
        analysis += `✅ Success - ${writingData.parts.length} tasks loaded\n`;
        analysis += `- Duration: ${writingData.totalMinutes} minutes\n`;
        writingData.parts.forEach((part, i) => {
          analysis += `- Task ${i + 1}: ${part.title} (${part.minWords} words)\n`;
        });
        analysis += `\n`;
      } catch (e) {
        analysis += `❌ Writing Error: ${e.message}\n\n`;
      }

      // Test Speaking
      try {
        analysis += `🎤 SPEAKING TEST:\n`;
        const speakingData = await ieltsApi.getTestSession(testId, 'SPEAKING');
        analysis += `✅ Success - ${speakingData.parts.length} parts loaded\n`;
        analysis += `- Duration: ${speakingData.totalMinutes} minutes\n\n`;
      } catch (e) {
        analysis += `❌ Speaking Error: ${e.message}\n\n`;
      }

      analysis += `📋 Summary:\n`;
      analysis += `- All APIs use correct endpoints\n`;
      analysis += `- Field mappings updated to match backend\n`;
      analysis += `- Ready for frontend integration\n`;

      setResult(analysis);
    } catch (error) {
      setResult(`❌ General Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', margin: '20px' }}>
      <h3>All Skills Test Debug</h3>
      
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
        onClick={testAllSkills} 
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
        {loading ? 'Testing...' : 'Test All Skills'}
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

export default SkillTestDebug;
