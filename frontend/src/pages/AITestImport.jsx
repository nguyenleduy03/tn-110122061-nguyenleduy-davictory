import { useState, useRef, useEffect } from 'react';
import aiImportApi from '../services/aiImportApi';

const STATUS_POLL_INTERVAL = 3000;

const questionTypeColors = {
  MCQ: { bg: '#dbeafe', text: '#1e40af' },
  TFNG: { bg: '#dcfce7', text: '#15803d' },
  YNNG: { bg: '#ccfbf1', text: '#0f766e' },
  FILL_BLANK: { bg: '#f3e8ff', text: '#6b21a8' },
  SHORT_ANSWER: { bg: '#ffedd5', text: '#9a3412' },
  SENTENCE_COMPLETION: { bg: '#fce7f3', text: '#9d174d' },
  SUMMARY_COMPLETION: { bg: '#e0e7ff', text: '#3730a3' },
  NOTE_COMPLETION: { bg: '#fef9c3', text: '#854d0e' },
  FLOW_CHART: { bg: '#fee2e2', text: '#991b1b' },
  MATCHING_HEADINGS: { bg: '#cffafe', text: '#155e75' },
  MATCHING: { bg: '#ecfccb', text: '#3f6212' },
  DIAGRAM_LABELLING: { bg: '#ede9fe', text: '#5b21b6' },
  WRITING_TASK1: { bg: '#fef3c7', text: '#92400e' },
  WRITING_TASK2: { bg: '#fef3c7', text: '#92400e' },
  SPEAKING_PART1: { bg: '#fce7f3', text: '#9d174d' },
  SPEAKING_PART2: { bg: '#fce7f3', text: '#9d174d' },
  SPEAKING_PART3: { bg: '#fce7f3', text: '#9d174d' },
};

const questionTypeLabels = {
  MCQ: 'Multiple Choice',
  TFNG: 'True/False/NG',
  YNNG: 'Yes/No/NG',
  FILL_BLANK: 'Fill in Blank',
  SHORT_ANSWER: 'Short Answer',
  SENTENCE_COMPLETION: 'Sentence Completion',
  SUMMARY_COMPLETION: 'Summary Completion',
  NOTE_COMPLETION: 'Note Completion',
  FLOW_CHART: 'Flow Chart',
  DIAGRAM_LABELLING: 'Diagram Labelling',
  MATCHING_HEADINGS: 'Matching Headings',
  MATCHING: 'Matching',
  WRITING_TASK1: 'Writing Task 1',
  WRITING_TASK2: 'Writing Task 2',
  SPEAKING_PART1: 'Speaking Part 1',
  SPEAKING_PART2: 'Speaking Part 2 (Cue Card)',
  SPEAKING_PART3: 'Speaking Part 3',
};

export default function AITestImport() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsingProgress, setParsingProgress] = useState('');
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [testType, setTestType] = useState('ACADEMIC');
  const [skillHint, setSkillHint] = useState('');
  const [testTitle, setTestTitle] = useState('');
  const [targetBand, setTargetBand] = useState('7.0');
  const [createdTest, setCreatedTest] = useState(null);
  const [editingTitle, setEditingTitle] = useState(true);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const fileRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = (taskId) => {
    setCurrentTaskId(taskId);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const resp = await aiImportApi.getStatus(taskId);
        const data = resp.data;
        const previewData = data.result || data;
        if (data.status === 'COMPLETED' && (data.result || data.sections)) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPreview(previewData);
          setLoading(false);
          setParsingProgress('');
          if (previewData.title) setTestTitle(previewData.title);
        } else if (data.status === 'FAILED') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setLoading(false);
          setParsingProgress('');
          setError(data.error || 'AI parsing failed');
        } else {
          setParsingProgress(data.progress || 'Processing...');
        }
      } catch {
        // Polling error, will retry
      }
    }, STATUS_POLL_INTERVAL);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setTestTitle(f.name.replace(/\.[^/.]+$/, ''));
      setPreview(null);
      setError('');
      setCreatedTest(null);
      setEditingTitle(true);
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
      setEditingTitle(true);
    }
  };

  const handleParse = async () => {
    if (!file) return;
    setLoading(true);
    setParsingProgress('Uploading file...');
    setError('');
    setPreview(null);
    try {
      const resp = await aiImportApi.parseDocument(file, skillHint, testType);
      const data = resp.data;
      if (data.status === 'COMPLETED' && data.sections?.length > 0) {
        setPreview(data);
        setLoading(false);
        setParsingProgress('');
        if (data.title) setTestTitle(data.title);
      } else if (data.task_id && data.status !== 'COMPLETED') {
        startPolling(data.task_id);
        setParsingProgress('AI is analyzing the document...');
      } else if (data.task_id) {
        setPreview(data);
        setLoading(false);
        setParsingProgress('');
        if (data.title) setTestTitle(data.title);
      } else {
        setPreview(data);
        setLoading(false);
        setParsingProgress('');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error
        || err.response?.data?.detail
        || err.message
        || 'Parse failed';
      setError(errMsg);
      setLoading(false);
      setParsingProgress('');
    }
  };

  const handleCreate = async () => {
    if (!preview?.task_id) return;
    setCreating(true);
    setError('');
    try {
      const resp = await aiImportApi.createTest(
        preview.task_id,
        testTitle || preview.title,
        testType,
        preview.sections,
        null,
        targetBand
      );
      const data = resp.data;
      if (data.success || data.test_id) {
        setCreatedTest(data);
      } else {
        setError(data.message || 'Create failed');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error
        || err.response?.data?.message
        || err.response?.data?.detail
        || err.message
        || 'Create failed';
      setError(errMsg);
    } finally {
      setCreating(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setFile(null);
    setCreatedTest(null);
    setError('');
    setEditingTitle(true);
  };

  const handleEditInBuilder = () => {
    if (createdTest?.test_id) {
      window.location.href = `/test-builder?id=${createdTest.test_id}`;
    }
  };

  const renderDropZone = () => (
    <>
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        style={{
          border: `2px dashed ${file ? '#2563eb' : '#ccc'}`,
          borderRadius: 12, padding: file ? 16 : 40,
          textAlign: 'center', cursor: 'pointer',
          backgroundColor: file ? '#eff6ff' : '#fafafa',
          marginBottom: 16,
          transition: 'all 0.2s',
        }}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef} type="file"
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {file ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>📄</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600 }}>{file.name}</div>
              <div style={{ color: '#888', fontSize: 13 }}>
                {(file.size / 1024).toFixed(1)} KB
                {' · '}Click để đổi file
              </div>
            </div>
          </div>
        ) : (
          <div>
            <span style={{ fontSize: 32 }}>📁</span>
            <div style={{ marginTop: 8, fontWeight: 500 }}>
              Kéo thả file vào đây hoặc click để chọn
            </div>
            <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
              Hỗ trợ PDF, DOCX, TXT
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
            Test Type
          </label>
          <select
            value={testType}
            onChange={e => setTestType(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 6,
              border: '1px solid #ddd', fontSize: 14,
            }}
          >
            <option value="ACADEMIC">Academic</option>
            <option value="GENERAL">General Training</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
            Skill (gợi ý)
          </label>
          <select
            value={skillHint}
            onChange={e => setSkillHint(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 6,
              border: '1px solid #ddd', fontSize: 14,
            }}
          >
            <option value="">Auto-detect</option>
            <option value="LISTENING">Listening</option>
            <option value="READING">Reading</option>
            <option value="WRITING">Writing</option>
            <option value="SPEAKING">Speaking</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
            Target Band
          </label>
          <select
            value={targetBand}
            onChange={e => setTargetBand(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 6,
              border: '1px solid #ddd', fontSize: 14,
            }}
          >
            {['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'].map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {file && !preview && !loading && (
        <button
          onClick={handleParse}
          disabled={loading}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            backgroundColor: '#2563eb', color: '#fff',
            fontWeight: 600, cursor: 'pointer',
            marginBottom: 24, fontSize: 15,
          }}
        >
          🔍 Phân Tích Tài Liệu
        </button>
      )}
    </>
  );

  const renderLoadingState = () => (
    <div
      style={{
        textAlign: 'center', padding: 40,
        backgroundColor: '#f0f7ff', borderRadius: 12,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔄</div>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
        {parsingProgress || 'Đang xử lý...'}
      </div>
      <div style={{ color: '#666', fontSize: 14 }}>
        AI đang phân tích tài liệu, vui lòng đợi...
        {parsingProgress && <div style={{ marginTop: 8, fontSize: 13, color: '#888' }}>{parsingProgress}</div>}
      </div>
      <div
        style={{
          margin: '16px auto', width: 48, height: 48,
          border: '4px solid #e5e7eb', borderTopColor: '#2563eb',
          borderRadius: '50%', animation: 'spin 1s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const renderPreview = () => (
    <div>
      <div
        style={{
          backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 8, padding: 16, marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16 }}>Preview Đề Thi</div>
        <div style={{ display: 'flex', gap: 24, marginTop: 8, flexWrap: 'wrap' }}>
          <div>
            <strong>Skill:</strong>{' '}
            <span style={{
              display: 'inline-block', padding: '2px 8px',
              borderRadius: 99, fontSize: 12, fontWeight: 600,
              backgroundColor: '#dbeafe', color: '#1e40af',
            }}>
              {preview.skill}
            </span>
          </div>
          <div>
            <strong>Tổng:</strong> {preview.total_questions} câu
          </div>
          <div>
            <strong>Sections:</strong> {preview.sections?.length || 0}
          </div>
          <div>
            <strong>Test Type:</strong> {preview.test_type || testType}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 4 }}>
          Tên đề thi:
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={testTitle}
            onChange={e => setTestTitle(e.target.value)}
            disabled={!editingTitle}
            style={{
              padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd',
              width: 400, fontSize: 14,
              backgroundColor: editingTitle ? '#fff' : '#f9fafb',
            }}
          />
          <button
            onClick={() => setEditingTitle(!editingTitle)}
            style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd',
              backgroundColor: '#fff', cursor: 'pointer', fontSize: 13,
            }}
          >
            {editingTitle ? '🔒' : '🔓'}
          </button>
        </div>
      </div>

      {preview.sections?.map((section, si) => (
        <div
          key={si}
          style={{
            marginBottom: 20, border: '1px solid #e5e7eb',
            borderRadius: 10, overflow: 'hidden',
          }}
        >
          <div
            style={{
              backgroundColor: '#f3f4f6', padding: '10px 16px',
              fontWeight: 600, display: 'flex', justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{section.title} ({section.question_count} câu)</span>
            <span style={{ fontSize: 12, color: '#888' }}>
              Part {section.part_order || si + 1}
            </span>
          </div>
          {section.groups?.map((group, gi) => (
            <div
              key={gi}
              style={{
                padding: '12px 16px', borderTop: '1px solid #eee',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <strong>{group.title}</strong>
                <span
                  style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 99,
                    fontWeight: 600,
                    ...(() => {
                      const c = questionTypeColors[group.question_type];
                      return c ? { backgroundColor: c.bg, color: c.text }
                        : { backgroundColor: '#eee', color: '#666' };
                    })(),
                  }}
                >
                  {questionTypeLabels[group.question_type] || group.question_type}
                </span>
              </div>
              {group.instructions && (
                <div style={{ fontSize: 13, color: '#666', marginBottom: 6, fontStyle: 'italic' }}>
                  {group.instructions}
                </div>
              )}
              {group.passage_text && (
                <div
                  style={{
                    fontSize: 12, color: '#555', maxHeight: 80,
                    overflow: 'hidden', marginBottom: 6,
                    backgroundColor: '#f9fafb', padding: '6px 10px',
                    borderRadius: 4, borderLeft: '3px solid #d1d5db',
                  }}
                >
                  {group.passage_text.substring(0, 300)}
                  {group.passage_text.length > 300 && '...'}
                </div>
              )}
              <div style={{ fontSize: 13, color: '#555' }}>
                {group.questions?.length} questions
                {group.questions?.[0]?.number && (
                  <span>
                    {' '}(Q{group.questions[0].number}
                    -Q{group.questions[group.questions.length - 1]?.number || group.questions[0].number})
                  </span>
                )}
              </div>
              {group.questions?.slice(0, 3).map((q, qi) => (
                <div
                  key={qi}
                  style={{
                    fontSize: 13, marginTop: 4, paddingLeft: 12,
                    color: '#666',
                  }}
                >
                  <span style={{ color: '#999' }}>Q{q.number}.</span>{' '}
                  {q.text?.substring(0, 100)}
                  {q.options?.filter(o => o.correct).length > 0 && (
                    <span style={{ color: '#16a34a', marginLeft: 4 }}>
                      ✓ {q.options.filter(o => o.correct).map(o => o.label).join(', ')}
                    </span>
                  )}
                </div>
              ))}
              {group.questions?.length > 3 && (
                <div style={{ fontSize: 12, color: '#999', marginTop: 2, paddingLeft: 12 }}>
                  ... và {group.questions.length - 3} câu khác
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button
          onClick={handleReset}
          style={{
            padding: '10px 20px', borderRadius: 8,
            border: '1px solid #ddd', backgroundColor: '#fff',
            cursor: 'pointer', fontWeight: 500, fontSize: 14,
          }}
        >
          ← Quay lại
        </button>
        <button
          onClick={handleCreate}
          disabled={creating}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            backgroundColor: creating ? '#ccc' : '#16a34a',
            color: '#fff', fontWeight: 600,
            cursor: creating ? 'not-allowed' : 'pointer',
            fontSize: 15,
          }}
        >
          {creating ? '🔄 Đang tạo đề...' : '✅ Tạo Đề Thi'}
        </button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div
      style={{
        backgroundColor: '#f0fdf4', border: '2px solid #16a34a',
        borderRadius: 12, padding: 24, textAlign: 'center',
        marginTop: 20,
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
        Đề thi đã được tạo thành công!
      </div>
      <div style={{ color: '#666', marginBottom: 4 }}>
        <strong>Test ID:</strong> {createdTest.test_id}
      </div>
      <div style={{ color: '#666', marginBottom: 16 }}>
        <strong>Title:</strong> {createdTest.title || testTitle}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleEditInBuilder}
          style={{
            padding: '10px 24px', backgroundColor: '#2563eb',
            color: '#fff', borderRadius: 8, border: 'none',
            fontWeight: 600, cursor: 'pointer', fontSize: 15,
          }}
        >
          ✏️ Mở trong Test Builder
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '10px 20px', borderRadius: 8,
            border: '1px solid #ddd', backgroundColor: '#fff',
            cursor: 'pointer', fontWeight: 500, fontSize: 14,
          }}
        >
          Import đề khác
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Import Đề Thi Từ Tài Liệu
      </h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Upload file PDF, Word (.docx) hoặc Text (.txt) — AI sẽ tự động phân tích
        và tạo đề thi IELTS hoàn chỉnh
      </p>

      {error && (
        <div
          style={{
            backgroundColor: '#fee2e2', color: '#991b1b',
            padding: '12px 16px', borderRadius: 8, marginBottom: 16,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span>❌ {error}</span>
          <button
            onClick={() => setError('')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, color: '#991b1b', padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {!preview && !createdTest && !loading && renderDropZone()}

      {loading && renderLoadingState()}

      {preview && preview.status === 'COMPLETED' && renderPreview()}

      {createdTest?.success && renderSuccess()}
    </div>
  );
}
