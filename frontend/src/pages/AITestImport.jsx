import { useState, useRef } from 'react';
import aiImportApi from '../services/aiImportApi';

export default function AITestImport() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [testType, setTestType] = useState('ACADEMIC');
  const [skillHint, setSkillHint] = useState('');
  const [testTitle, setTestTitle] = useState('');
  const [createdTest, setCreatedTest] = useState(null);
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setTestTitle(f.name.replace(/\.[^/.]+$/, ''));
      setPreview(null);
      setError('');
      setCreatedTest(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setTestTitle(f.name.replace(/\.[^/.]+$/, ''));
      setPreview(null);
      setError('');
      setCreatedTest(null);
    }
  };

  const handleParse = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const resp = await aiImportApi.parseDocument(file, skillHint, testType);
      setPreview(resp.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Parse failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!preview?.task_id) return;
    setCreating(true);
    try {
      const resp = await aiImportApi.createTest(
        preview.task_id, testTitle || preview.title, testType, preview.sections, 1);
      setCreatedTest(resp.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const questionTypeColors = {
    MCQ: 'bg-blue-100 text-blue-800',
    TFNG: 'bg-green-100 text-green-800',
    YNNG: 'bg-teal-100 text-teal-800',
    FILL_BLANK: 'bg-purple-100 text-purple-800',
    SHORT_ANSWER: 'bg-orange-100 text-orange-800',
    SENTENCE_COMPLETION: 'bg-pink-100 text-pink-800',
    SUMMARY_COMPLETION: 'bg-indigo-100 text-indigo-800',
    NOTE_COMPLETION: 'bg-yellow-100 text-yellow-800',
    FLOW_CHART: 'bg-red-100 text-red-800',
    MATCHING_HEADINGS: 'bg-cyan-100 text-cyan-800',
    MATCHING: 'bg-lime-100 text-lime-800',
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Import Đề Thi Từ Tài Liệu
      </h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Upload file PDF, Word (.docx) hoặc Text (.txt) — AI sẽ tự động phân tích và tạo đề thi
      </p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Test Type</label>
          <select value={testType} onChange={e => setTestType(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>
            <option value="ACADEMIC">Academic</option>
            <option value="GENERAL">General Training</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Skill (gợi ý)</label>
          <select value={skillHint} onChange={e => setSkillHint(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>
            <option value="">Auto-detect</option>
            <option value="LISTENING">Listening</option>
            <option value="READING">Reading</option>
            <option value="WRITING">Writing</option>
            <option value="SPEAKING">Speaking</option>
          </select>
        </div>
      </div>

      <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
        style={{
          border: '2px dashed #ccc', borderRadius: 12, padding: 40, textAlign: 'center',
          cursor: 'pointer', backgroundColor: '#fafafa', marginBottom: 16,
          transition: 'border-color 0.2s',
        }}
        onClick={() => fileRef.current?.click()}>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileChange} style={{ display: 'none' }} />
        {file ? (
          <div>
            <span style={{ fontSize: 20 }}>📄</span>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{file.name}</div>
            <div style={{ color: '#888', fontSize: 13 }}>{(file.size / 1024).toFixed(1)} KB</div>
          </div>
        ) : (
          <div>
            <span style={{ fontSize: 32 }}>📁</span>
            <div style={{ marginTop: 8, fontWeight: 500 }}>Kéo thả file vào đây hoặc click để chọn</div>
            <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>Hỗ trợ PDF, DOCX, TXT</div>
          </div>
        )}
      </div>

      {file && (
        <button onClick={handleParse} disabled={loading}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            backgroundColor: loading ? '#ccc' : '#2563eb', color: '#fff',
            fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 24,
          }}>
          {loading ? '🔄 Đang phân tích...' : '🔍 Phân Tích Tài Liệu'}
        </button>
      )}

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {preview && preview.status === 'COMPLETED' && (
        <div>
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Preview Đề Thi</div>
            <div style={{ display: 'flex', gap: 24, marginTop: 8, flexWrap: 'wrap' }}>
              <div><strong>Skill:</strong> {preview.skill}</div>
              <div><strong>Total:</strong> {preview.total_questions} câu</div>
              <div><strong>Sections:</strong> {preview.sections?.length || 0}</div>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontWeight: 600, fontSize: 14 }}>Tên đề thi:</label>
            <input value={testTitle} onChange={e => setTestTitle(e.target.value)}
              style={{ marginLeft: 8, padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', width: 300 }} />
          </div>

          {preview.sections?.map((section, si) => (
            <div key={si} style={{ marginBottom: 20, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#f3f4f6', padding: '10px 16px', fontWeight: 600 }}>
                {section.title} ({section.question_count} câu)
              </div>
              {section.groups?.map((group, gi) => (
                <div key={gi} style={{ padding: '12px 16px', borderTop: '1px solid #eee' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <strong>{group.title}</strong>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 99,
                      ...(questionTypeColors[group.question_type] ? {
                        backgroundColor: questionTypeColors[group.question_type].split(' ')[0],
                        color: questionTypeColors[group.question_type].split(' ')[1],
                      } : { backgroundColor: '#eee', color: '#666' }),
                    }}>
                      {group.question_type}
                    </span>
                  </div>
                  {group.instructions && (
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>{group.instructions}</div>
                  )}
                  {group.passage_text && (
                    <div style={{ fontSize: 12, color: '#888', maxHeight: 60, overflow: 'hidden', marginBottom: 6 }}>
                      Passage: {group.passage_text.substring(0, 200)}...
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: '#555' }}>
                    {group.questions?.length} questions (Q{group.questions[0]?.number}-Q{group.questions[group.questions.length-1]?.number})
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => { setPreview(null); setFile(null); }}
              style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', backgroundColor: '#fff', cursor: 'pointer' }}>
              ← Quay lại
            </button>
            <button onClick={handleCreate} disabled={creating}
              style={{
                padding: '10px 24px', borderRadius: 8, border: 'none',
                backgroundColor: creating ? '#ccc' : '#16a34a', color: '#fff',
                fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer',
              }}>
              {creating ? '🔄 Đang tạo...' : '✅ Tạo Đề Thi'}
            </button>
          </div>
        </div>
      )}

      {createdTest?.success && (
        <div style={{ backgroundColor: '#f0fdf4', border: '2px solid #16a34a', borderRadius: 12, padding: 20, marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Đề thi đã được tạo!</div>
          <div style={{ marginTop: 4, color: '#666' }}>Test ID: {createdTest.test_id}</div>
          <a href={`/test-builder?id=${createdTest.test_id}`}
            style={{ display: 'inline-block', marginTop: 12, padding: '8px 20px',
              backgroundColor: '#2563eb', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
            Mở trong Test Builder →
          </a>
        </div>
      )}
    </div>
  );
}
