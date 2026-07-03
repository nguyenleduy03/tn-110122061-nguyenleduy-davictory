import { useState, useRef, useEffect } from 'react';
import aiImportApi from '../../services/aiImportApi';

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

export default function AIImportModal({ onClose, onImport, initialSkill = '', initialPartId = null, parts = [] }) {
  const [step, setStep] = useState('select');
  const [skill, setSkill] = useState(initialSkill);
  const [targetPartId, setTargetPartId] = useState(initialPartId || '__new__');
  const [testType, setTestType] = useState('ACADEMIC');
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('ocr');
  const [preview, setPreview] = useState(null);
  const [parseData, setParseData] = useState(null);
  const [editableText, setEditableText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('');
  const [error, setError] = useState('');
  const [questionType, setQuestionType] = useState('');
  const [visionExtract, setVisionExtract] = useState(null);
  const [editablePassageText, setEditablePassageText] = useState('');
  const [editableQuestions, setEditableQuestions] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    if (initialSkill) setSkill(initialSkill);
  }, [initialSkill]);

  useEffect(() => {
    if (initialPartId) setTargetPartId(initialPartId);
    else if (initialSkill) setTargetPartId('__new__');
  }, [initialPartId, initialSkill]);

  const isImageFile = (f) => {
    if (!f) return false;
    const ext = f.name?.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif', 'webp'].includes(ext);
  };

  useEffect(() => {
    if (file && isImageFile(file)) {
      setMode('vision');
    } else if (file) {
      setMode('ocr');
    }
  }, [file]);

  const partName = (id) => {
    if (id === '__new__') return 'Thêm thành Part mới';
    const p = parts.find(x => x.id === id);
    return p ? p.name : 'Thêm thành Part mới';
  };

  const renderTable = (text) => {
    if (!text) return null;
    const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('['));
    const dataLines = lines.filter(l => !l.includes('---'));
    if (dataLines.length < 2) return null;
    const rows = dataLines.map(l => l.split('|').map(c => c.trim()));
    const maxCols = Math.max(...rows.map(r => r.length));
    if (maxCols < 2) return null;
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 4 }}>
        <thead>
          <tr>
            {rows[0].map((h, i) => (
              <th key={i} style={{ border: '1px solid #d1d5db', padding: '4px 6px', backgroundColor: '#f3f4f6', textAlign: 'left', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, ri) => (
            <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? '#fff' : '#f9fafb' }}>
              {Array.from({ length: maxCols }).map((_, ci) => (
                <td key={ci} style={{ border: '1px solid #d1d5db', padding: '4px 6px' }}>{row[ci] || ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setError('');
    }
  };

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError('');
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type?.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          const ext = blob.name?.split('.').pop() || 'png';
          const f = new File([blob], `paste_${Date.now()}.${ext}`, { type: blob.type });
          setFile(f);
          setError('');
          e.preventDefault();
        }
        break;
      }
    }
  };

  const handleParse = async () => {
    if (!file || !skill) {
      setError('Vui lòng chọn file và kỹ năng');
      return;
    }
    setLoading(true);
    setLoadingLabel('Đang đọc file...');
    setError('');
    try {
      if (mode === 'vision') {
        const resp = await aiImportApi.visionExtract(file, questionType, skill, testType, '');
        const data = resp.data;
        if (data.passage_text || data.questions?.length > 0) {
          setVisionExtract(data);
          setEditablePassageText(data.passage_text || '');
          setEditableQuestions(data.questions?.map(q => ({
            number: q.number || 0,
            text: q.text || '',
            options: q.options || [],
            blank_context: q.blank_context || '',
            correct_answer: q.correct_answer || '',
          })) || []);
          setParseData({ task_id: data.task_id });
          setStep('vision_review');
        } else {
          setError('Vision không thể đọc nội dung từ ảnh. Vui lòng thử OCR hoặc chọn ảnh khác.');
        }
      } else {
        const parseResp = await aiImportApi.parseDocument(file, skill, testType, mode);
        const data = parseResp.data;
        if (data.status !== 'PARSED' || !data.raw_text) {
          setError('Không thể đọc nội dung từ file. Vui lòng thử lại.');
          setLoading(false);
          return;
        }
        setParseData(data);
        setEditableText(data.raw_text || '');
        setStep('review');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || err.message || 'Parse failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStructure = async () => {
    if (!parseData?.task_id || (!editableText.trim() && mode !== 'vision')) {
      setError('Không có nội dung để phân tích');
      return;
    }
    setLoading(true);
    setLoadingLabel('AI đang phân tích...');
    setError('');
    try {
      const partLabel = targetPartId === '__new__' ? '' : partName(targetPartId);
      const structResp = await aiImportApi.structureDocument(
        parseData.task_id, editableText, skill, testType, partLabel, questionType
      );
      const data = structResp.data;
      if (data.status === 'COMPLETED' && data.sections?.length > 0) {
        setPreview(data);
        setStep('preview');
      } else {
        setError('Không thể phân tích tài liệu. Vui lòng thử lại.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || err.message || 'Structure failed');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!preview) return;
    onImport({ preview, targetPartId: targetPartId === '__new__' ? null : targetPartId });
  };

  const handleFormatStructure = async () => {
    if (!parseData?.task_id && !visionExtract?.task_id) {
      setError('Không có dữ liệu để format');
      return;
    }
    setLoading(true);
    setLoadingLabel('AI đang format...');
    setError('');
    try {
      const taskId = parseData?.task_id || visionExtract?.task_id;
      const partLabel = targetPartId === '__new__' ? '' : partName(targetPartId);
      const resp = await aiImportApi.formatStructure(
        taskId, skill, testType, partLabel, questionType,
        editablePassageText, editableQuestions.filter(q => q.text || q.correct_answer)
      );
      const data = resp.data;
      if (data.status === 'COMPLETED' && data.sections?.length > 0) {
        setPreview(data);
        setStep('preview');
      } else {
        setError('AI không thể format dữ liệu. Vui lòng kiểm tra lại.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || err.message || 'Format failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setMode('ocr');
    setQuestionType('');
    setPreview(null);
    setParseData(null);
    setEditableText('');
    setVisionExtract(null);
    setEditablePassageText('');
    setEditableQuestions([]);
    setStep('select');
    setError('');
  };

  const isValid = file && skill;

  return (
    <div tabIndex={-1} onPaste={handlePaste} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        backgroundColor: '#fff', borderRadius: 12, maxWidth: 800, width: '100%',
        maxHeight: '90vh', overflow: 'auto', padding: 24, position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 16, background: 'none',
          border: 'none', fontSize: 22, cursor: 'pointer', color: '#888',
        }}>×</button>

        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          Import Đề Thi Từ Tài Liệu
        </h2>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
          AI sẽ tự động nhận diện câu hỏi và tạo đề thi hoàn chỉnh
        </p>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px 14px',
            borderRadius: 8, marginBottom: 12, fontSize: 14,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>❌ {error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}>×</button>
          </div>
        )}

        {step === 'select' && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              {initialSkill ? (
                <div style={{ flex: 1, minWidth: 150 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Kỹ năng
                  </label>
                  <div style={{
                    padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd',
                    width: '100%', fontSize: 14, backgroundColor: '#f3f4f6', color: '#555',
                  }}>
                    {skill === 'LISTENING' ? 'Listening' :
                     skill === 'READING' ? 'Reading' :
                     skill === 'WRITING' ? 'Writing' :
                     skill === 'SPEAKING' ? 'Speaking' : skill}
                    {' '}(tự động)
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, minWidth: 150 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Kỹ năng <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select value={skill} onChange={e => setSkill(e.target.value)}
                    style={{
                      padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd',
                      width: '100%', fontSize: 14, backgroundColor: '#fff',
                    }}>
                    <option value="">-- Chọn kỹ năng --</option>
                    <option value="LISTENING">Listening</option>
                    <option value="READING">Reading</option>
                    <option value="WRITING">Writing</option>
                    <option value="SPEAKING">Speaking</option>
                  </select>
                </div>
              )}
              {!initialSkill && (
                <div style={{ flex: 1, minWidth: 150 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Import vào Part
                  </label>
                  <select value={targetPartId} onChange={e => setTargetPartId(e.target.value)}
                    style={{
                      padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd',
                      width: '100%', fontSize: 14, backgroundColor: '#fff',
                    }}>
                    <option value="__new__">+ Thêm thành Part mới</option>
                    {parts.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 150 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Loại đề
                </label>
                <select value={testType} onChange={e => setTestType(e.target.value)}
                  style={{
                    padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd',
                    width: '100%', fontSize: 14, backgroundColor: '#fff',
                  }}>
                  <option value="ACADEMIC">Academic</option>
                  <option value="GENERAL">General Training</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Loại câu hỏi <span style={{ color: '#6b7280', fontWeight: 400 }}>(tùy chọn)</span>
                </label>
                <select value={questionType} onChange={e => setQuestionType(e.target.value)}
                  style={{
                    padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd',
                    width: '100%', fontSize: 14, backgroundColor: '#fff',
                  }}>
                  <option value="">Tự động (AI tự đoán)</option>
                  <optgroup label="─ Điền / Ghi ─">
                    <option value="FILL_BLANK">Fill Blank / Note</option>
                    <option value="SENTENCE_COMPLETION">Sentence Completion</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                    <option value="SUMMARY_COMPLETION">Summary Completion</option>
                    <option value="TABLE_COMPLETION">Table Completion</option>
                    <option value="FORM_COMPLETION">Form Completion</option>
                  </optgroup>
                  <optgroup label="─ Chọn ─">
                    <option value="MCQ">Multiple Choice (MCQ)</option>
                    <option value="TFNG">True / False / NG</option>
                    <option value="MATCHING">Matching</option>
                    <option value="MATCHING_HEADINGS">Matching Headings</option>
                    <option value="SHARED_OPTIONS_DROPDOWN">Dropdown (lựa chọn chung)</option>
                  </optgroup>
                  <optgroup label="─ Khác ─">
                    <option value="FLOW_CHART">Flow-chart</option>
                    <option value="DIAGRAM_LABELLING">Diagram Labelling</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div onDrop={handleFileDrop} onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${file ? '#2563eb' : '#ccc'}`,
                borderRadius: 10, padding: file ? 16 : 32, textAlign: 'center',
                cursor: 'pointer', backgroundColor: file ? '#eff6ff' : '#fafafa',
                marginBottom: 16, transition: 'all 0.2s',
              }}>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.bmp,.tiff,.tif,.webp"
                onChange={handleFileSelect} style={{ display: 'none' }} />
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>📄</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600 }}>{file.name}</div>
                    <div style={{ color: '#888', fontSize: 13 }}>
                      {(file.size / 1024).toFixed(1)} KB · Click để đổi file
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <span style={{ fontSize: 32 }}>📁</span>
                  <div style={{ marginTop: 8, fontWeight: 500 }}>Kéo thả file hoặc click để chọn</div>
                  <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>Hỗ trợ PDF, DOCX, TXT, ảnh (JPG/PNG) — có thể paste ảnh từ clipboard</div>
                </div>
              )}
            </div>

            {file && isImageFile(file) && (
              <div style={{
                display: 'flex', gap: 12, marginBottom: 16, padding: '6px 0',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, marginRight: 4 }}>Chế độ đọc:</span>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                  padding: '5px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                  backgroundColor: mode === 'ocr' ? '#dbeafe' : '#f3f4f6',
                  border: mode === 'ocr' ? '1px solid #93c5fd' : '1px solid #ddd',
                }}>
                  <input type="radio" name="mode" value="ocr" checked={mode === 'ocr'}
                    onChange={() => setMode('ocr')} style={{ margin: 0 }} />
                  OCR (đọc chữ)
                </label>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                  padding: '5px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                  backgroundColor: mode === 'vision' ? '#dbeafe' : '#f3f4f6',
                  border: mode === 'vision' ? '1px solid #93c5fd' : '1px solid #ddd',
                }}>
                  <input type="radio" name="mode" value="vision" checked={mode === 'vision'}
                    onChange={() => setMode('vision')} style={{ margin: 0 }} />
                  Vision AI (xem ảnh)
                </label>
              </div>
            )}

            <div style={{
              marginTop: 12, marginBottom: 12, borderTop: '1px solid #e5e7eb', paddingTop: 12,
            }}>
              <details>
                <summary style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#2563eb', userSelect: 'none' }}>
                  📝 Hoặc paste text trực tiếp
                </summary>
                <textarea value={editableText} onChange={e => {
                  setEditableText(e.target.value);
                  setError('');
                }}
                  style={{
                    width: '100%', minHeight: 120, padding: 10, fontSize: 13, marginTop: 8,
                    border: '1px solid #ddd', borderRadius: 8, fontFamily: 'monospace',
                    lineHeight: 1.5, resize: 'vertical', whiteSpace: 'pre-wrap',
                  }}
                  placeholder="Paste nội dung câu hỏi vào đây...&#10;VD: Questions 1-5&#10;Complete the table below.&#10;..." />
                <button onClick={() => {
                  if (!editableText.trim() || !skill) {
                    setError('Vui lòng paste nội dung và chọn kỹ năng');
                    return;
                  }
                  setParseData({ task_id: `paste_${Date.now()}` });
                  setStep('review');
                }} disabled={!editableText.trim() || !skill} style={{
                  marginTop: 8, padding: '8px 20px', borderRadius: 8, border: 'none',
                  backgroundColor: !editableText.trim() || !skill ? '#ccc' : '#059673',
                  color: '#fff', fontWeight: 600, cursor: !editableText.trim() || !skill ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                }}>
                  🤖 Gửi lên AI Phân Tích
                </button>
              </details>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{
                padding: '8px 20px', borderRadius: 8, border: '1px solid #ddd',
                backgroundColor: '#fff', cursor: 'pointer', fontSize: 14,
              }}>Hủy</button>
              <button onClick={handleParse} disabled={loading || !isValid} style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                backgroundColor: !isValid || loading ? '#ccc' : '#2563eb',
                color: '#fff', fontWeight: 600, cursor: !isValid || loading ? 'not-allowed' : 'pointer',
                fontSize: 14,
              }}>
                {loading ? `🔄 ${loadingLabel}` : mode === 'vision' ? '📸 Gửi Ảnh Lên AI Vision' : '📄 Đọc Nội Dung File'}
              </button>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            {mode === 'vision' ? (
              <div style={{
                backgroundColor: '#fefce8', border: '1px solid #fde68a',
                borderRadius: 8, padding: 14, marginBottom: 16,
              }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                  📸 Ảnh đã sẵn sàng
                </div>
                <div style={{ fontSize: 13, color: '#555' }}>
                  AI sẽ đọc trực tiếp từ ảnh bằng Vision AI. Nhấn "Gửi lên AI Vision" để phân tích.
                </div>
                {file && (
                  <div style={{ marginTop: 8 }}>
                    <img src={URL.createObjectURL(file)} alt="Preview"
                      style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, border: '1px solid #ddd' }} />
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
                borderRadius: 8, padding: 14, marginBottom: 16,
              }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                  📄 Nội dung đã trích xuất ({parseData?.text_length || 0} ký tự)
                </div>
                <div style={{ fontSize: 13, color: '#555' }}>
                  Kiểm tra và chỉnh sửa nội dung, sau đó bấm "Gửi lên AI" để phân tích thành đề thi.
                </div>
              </div>
            )}

            {mode !== 'vision' && (
              <textarea value={editableText} onChange={e => setEditableText(e.target.value)}
                style={{
                  width: '100%', minHeight: 300, padding: 12, fontSize: 13,
                  border: '1px solid #ddd', borderRadius: 8, fontFamily: 'monospace',
                  lineHeight: 1.5, resize: 'vertical', marginBottom: 16,
                  whiteSpace: 'pre-wrap',
                }} />
            )}

            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Loại câu hỏi
                </label>
                <select value={questionType} onChange={e => setQuestionType(e.target.value)}
                  style={{
                    padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd',
                    width: '100%', fontSize: 14, backgroundColor: '#fff',
                  }}>
                  <option value="">Tự động (AI tự đoán)</option>
                  <optgroup label="─ Điền / Ghi ─">
                    <option value="FILL_BLANK">Fill Blank / Note</option>
                    <option value="SENTENCE_COMPLETION">Sentence Completion</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                    <option value="SUMMARY_COMPLETION">Summary Completion</option>
                    <option value="TABLE_COMPLETION">Table Completion</option>
                    <option value="FORM_COMPLETION">Form Completion</option>
                  </optgroup>
                  <optgroup label="─ Chọn ─">
                    <option value="MCQ">Multiple Choice (MCQ)</option>
                    <option value="TFNG">True / False / NG</option>
                    <option value="MATCHING">Matching</option>
                    <option value="MATCHING_HEADINGS">Matching Headings</option>
                    <option value="SHARED_OPTIONS_DROPDOWN">Dropdown (lựa chọn chung)</option>
                  </optgroup>
                  <optgroup label="─ Khác ─">
                    <option value="FLOW_CHART">Flow-chart</option>
                    <option value="DIAGRAM_LABELLING">Diagram Labelling</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setStep('select'); setParseData(null); }} style={{
                padding: '8px 20px', borderRadius: 8, border: '1px solid #ddd',
                backgroundColor: '#fff', cursor: 'pointer', fontSize: 14,
              }}>← Quay lại</button>
              <button onClick={handleStructure} disabled={loading || (!editableText.trim() && mode !== 'vision')} style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                backgroundColor: loading || (!editableText.trim() && mode !== 'vision') ? '#ccc' : '#2563eb',
                color: '#fff', fontWeight: 600, cursor: loading || (!editableText.trim() && mode !== 'vision') ? 'not-allowed' : 'pointer',
                fontSize: 14,
              }}>
                {loading ? `🔄 ${loadingLabel}` : mode === 'vision' ? '🤖 Gửi Lên AI Vision' : '🤖 Gửi lên AI Phân Tích'}
              </button>
            </div>
          </>
        )}

        {step === 'vision_review' && (
          <>
            <div style={{
              backgroundColor: '#f0f9ff', border: '1px solid #bae6fd',
              borderRadius: 8, padding: 14, marginBottom: 16,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                📝 Nội dung Vision đã trích xuất
              </div>
              <div style={{ fontSize: 13, color: '#555' }}>
                Kiểm tra và chỉnh sửa nội dung bên dưới, sau đó bấm "Xác nhận & Gửi lên AI Format" để AI tạo cấu trúc đề thi hoàn chỉnh.
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Passage / Nội dung chính
              </label>
              <textarea value={editablePassageText} onChange={e => setEditablePassageText(e.target.value)}
                style={{
                  width: '100%', minHeight: 120, padding: 10, fontSize: 13,
                  border: '1px solid #ddd', borderRadius: 8, fontFamily: 'monospace',
                  lineHeight: 1.5, resize: 'vertical', whiteSpace: 'pre-wrap',
                }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Câu hỏi ({editableQuestions.length})</label>
                <button onClick={() => {
                  setEditableQuestions([...editableQuestions, {
                    number: editableQuestions.length + 1, text: '',
                    options: [], blank_context: '', correct_answer: '',
                  }]);
                }} style={{
                  padding: '4px 12px', borderRadius: 6, border: '1px solid #2563eb',
                  backgroundColor: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}>+ Thêm câu hỏi</button>
              </div>
              {editableQuestions.map((q, qi) => (
                <div key={qi} style={{
                  border: '1px solid #e5e7eb', borderRadius: 8, padding: 10,
                  marginBottom: 8, backgroundColor: '#fafafa',
                }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#555', minWidth: 20 }}>Q</span>
                    <input value={q.number} onChange={e => {
                      const items = [...editableQuestions];
                      items[qi] = { ...items[qi], number: parseInt(e.target.value) || 0 };
                      setEditableQuestions(items);
                    }} type="number" min="0" style={{
                      width: 60, padding: '4px 8px', borderRadius: 4, border: '1px solid #ddd', fontSize: 13,
                    }} />
                    <input value={q.text} onChange={e => {
                      const items = [...editableQuestions];
                      items[qi] = { ...items[qi], text: e.target.value };
                      setEditableQuestions(items);
                    }} placeholder="Nội dung câu hỏi..." style={{
                      flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid #ddd',
                      fontSize: 13, minWidth: 100,
                    }} />
                    <button onClick={() => {
                      setEditableQuestions(editableQuestions.filter((_, i) => i !== qi));
                    }} style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16,
                    }}>×</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <label style={{ fontSize: 11, color: '#666', display: 'block' }}>Đáp án đúng</label>
                      <input value={q.correct_answer} onChange={e => {
                        const items = [...editableQuestions];
                        items[qi] = { ...items[qi], correct_answer: e.target.value };
                        setEditableQuestions(items);
                      }} placeholder="VD: B, Paris, hotel..." style={{
                        width: '100%', padding: '4px 8px', borderRadius: 4,
                        border: '1px solid #ddd', fontSize: 12,
                      }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <label style={{ fontSize: 11, color: '#666', display: 'block' }}>Blank context</label>
                      <input value={q.blank_context} onChange={e => {
                        const items = [...editableQuestions];
                        items[qi] = { ...items[qi], blank_context: e.target.value };
                        setEditableQuestions(items);
                      }} placeholder="(nếu có)..." style={{
                        width: '100%', padding: '4px 8px', borderRadius: 4,
                        border: '1px solid #ddd', fontSize: 12,
                      }} />
                    </div>
                  </div>
                  {q.options?.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>Options:</label>
                      {q.options.map((opt, oi) => (
                        <div key={oi} style={{ display: 'flex', gap: 4, marginBottom: 2, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, minWidth: 20 }}>{opt.label}:</span>
                          <input value={opt.text} onChange={e => {
                            const items = [...editableQuestions];
                            items[qi].options = [...items[qi].options];
                            items[qi].options[oi] = { ...items[qi].options[oi], text: e.target.value };
                            setEditableQuestions(items);
                          }} style={{
                            flex: 1, padding: '2px 6px', borderRadius: 4,
                            border: '1px solid #ddd', fontSize: 12,
                          }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Loại câu hỏi
                </label>
                <select value={questionType} onChange={e => setQuestionType(e.target.value)}
                  style={{
                    padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd',
                    width: '100%', fontSize: 14, backgroundColor: '#fff',
                  }}>
                  <option value="">Tự động (AI tự đoán)</option>
                  <optgroup label="─ Điền / Ghi ─">
                    <option value="FILL_BLANK">Fill Blank / Note</option>
                    <option value="SENTENCE_COMPLETION">Sentence Completion</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                    <option value="SUMMARY_COMPLETION">Summary Completion</option>
                    <option value="TABLE_COMPLETION">Table Completion</option>
                    <option value="FORM_COMPLETION">Form Completion</option>
                  </optgroup>
                  <optgroup label="─ Chọn ─">
                    <option value="MCQ">Multiple Choice (MCQ)</option>
                    <option value="TFNG">True / False / NG</option>
                    <option value="MATCHING">Matching</option>
                    <option value="MATCHING_HEADINGS">Matching Headings</option>
                    <option value="SHARED_OPTIONS_DROPDOWN">Dropdown (lựa chọn chung)</option>
                  </optgroup>
                  <optgroup label="─ Khác ─">
                    <option value="FLOW_CHART">Flow-chart</option>
                    <option value="DIAGRAM_LABELLING">Diagram Labelling</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setStep('review'); }} style={{
                padding: '8px 20px', borderRadius: 8, border: '1px solid #ddd',
                backgroundColor: '#fff', cursor: 'pointer', fontSize: 14,
              }}>← Quay lại</button>
              <button onClick={handleFormatStructure} disabled={loading} style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                backgroundColor: loading ? '#ccc' : '#059669',
                color: '#fff', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14,
              }}>
                {loading ? `🔄 ${loadingLabel}` : '🤖 Xác nhận & Gửi lên AI Format'}
              </button>
            </div>
          </>
        )}

        {step === 'preview' && preview && (
          <>
            <div style={{
              backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 8, padding: 14, marginBottom: 16,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Preview Đề Thi</div>
              <div style={{ display: 'flex', gap: 20, marginTop: 6, flexWrap: 'wrap', fontSize: 14 }}>
                <div>
                  <strong>Skill:</strong>{' '}
                  <span style={{
                    display: 'inline-block', padding: '1px 8px', borderRadius: 99,
                    fontSize: 12, fontWeight: 600, backgroundColor: '#dbeafe', color: '#1e40af',
                  }}>{preview.skill}</span>
                </div>
                <div><strong>Tổng:</strong> {preview.total_questions} câu</div>
                <div><strong>Sections:</strong> {preview.sections?.length || 0}</div>
                <div><strong>Import vào:</strong> {partName(targetPartId)}</div>
              </div>
            </div>

            {preview.sections?.map((section, si) => (
              <div key={si} style={{
                marginBottom: 14, border: '1px solid #e5e7eb',
                borderRadius: 8, overflow: 'hidden',
              }}>
                <div style={{
                  backgroundColor: '#f3f4f6', padding: '8px 14px',
                  fontWeight: 600, fontSize: 14,
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>{section.title} ({section.question_count} câu)</span>
                </div>
                {section.groups?.map((group, gi) => (
                  <div key={gi} style={{ padding: '10px 14px', borderTop: '1px solid #eee', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                      <strong>{group.title}</strong>
                      <span style={{
                        fontSize: 11, padding: '1px 7px', borderRadius: 99, fontWeight: 600,
                        ...(() => {
                          const c = questionTypeColors[group.question_type];
                          return c ? { backgroundColor: c.bg, color: c.text }
                            : { backgroundColor: '#eee', color: '#666' };
                        })(),
                      }}>
                        {group.question_type}
                      </span>
                      <span style={{ fontSize: 12, color: '#888' }}>
                        {group.questions?.length} questions
                      </span>
                    </div>
                    {group.passage_text && group.content_type !== 'NOTE_COMPLETION' && (
                      <div style={{
                        fontSize: 12, color: '#555',
                        backgroundColor: '#f9fafb', padding: '4px 8px', borderRadius: 4,
                        borderLeft: '3px solid #d1d5db', marginBottom: 4,
                      }}>
                        {group.content_type === 'TABLE_COMPLETION' ? (
                          <>
                            <span style={{ fontWeight: 600, color: '#1e40af', display: 'block', marginBottom: 4 }}>📊 Bảng:</span>
                            {renderTable(group.passage_text)}
                          </>
                        ) : (
                          <>
                            <span style={{ fontWeight: 600, color: '#1e40af' }}>
                              {group.content_type === 'READING_PASSAGE' ? '📖 Đoạn văn:' :
                               group.content_type === 'WRITING_PASSAGE' ? '✏️ Đề bài:' :
                               group.content_type === 'SPEAKING_CUECARD' ? '🎴 Cue Card:' : '📄 Nội dung:'}
                            </span>{' '}
                            {group.passage_text.substring(0, 200)}{group.passage_text.length > 200 ? '...' : ''}
                          </>
                        )}
                      </div>
                    )}
                    {group.questions?.slice(0, 2).map((q, qi) => (
                      <div key={qi} style={{ fontSize: 12, color: '#666', paddingLeft: 8, marginTop: 2 }}>
                        <span style={{ color: '#999' }}>Q{q.number}.</span> {q.text?.substring(0, 80)}
                        {q.options?.filter(o => o.correct).length > 0 && (
                          <span style={{ color: '#16a34a', marginLeft: 4 }}>
                            ✓ {q.options.filter(o => o.correct).map(o => o.label).join(',')}
                          </span>
                        )}
                      </div>
                    ))}
                    {group.questions?.length > 2 && (
                      <div style={{ fontSize: 11, color: '#999', paddingLeft: 8 }}>
                        ... và {group.questions.length - 2} câu khác
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={resetForm} style={{
                padding: '8px 20px', borderRadius: 8, border: '1px solid #ddd',
                backgroundColor: '#fff', cursor: 'pointer', fontSize: 14,
              }}>← Quay lại</button>
              <button onClick={handleImport} style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                backgroundColor: '#16a34a', color: '#fff', fontWeight: 600,
                cursor: 'pointer', fontSize: 14,
              }}>📥 Import vào đề thi</button>
            </div>
          </>
        )}

        {step === 'saving' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              margin: '0 auto 16px', width: 48, height: 48,
              border: '4px solid #e5e7eb', borderTopColor: '#16a34a',
              borderRadius: '50%', animation: 'spin 1s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Đang tạo đề thi...</div>
            <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>
              Sau khi hoàn tất, bạn sẽ được chuyển đến Test Builder
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
