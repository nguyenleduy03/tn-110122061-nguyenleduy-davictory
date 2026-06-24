import { useState, useRef } from 'react';
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

export default function AIImportModal({ onClose, onImport }) {
  const [step, setStep] = useState('select'); // select | review | preview | saving
  const [skill, setSkill] = useState('');
  const [testType, setTestType] = useState('ACADEMIC');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [parseData, setParseData] = useState(null);
  const [editableText, setEditableText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);

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

  const handleParse = async () => {
    if (!file || !skill) {
      setError('Vui lòng chọn file và kỹ năng');
      return;
    }
    setLoading(true);
    setLoadingLabel('Đang đọc file...');
    setError('');
    try {
      const parseResp = await aiImportApi.parseDocument(file);
      const data = parseResp.data;
      if (data.status !== 'PARSED' || !data.raw_text) {
        setError('Không thể đọc nội dung từ file. Vui lòng thử lại.');
        setLoading(false);
        return;
      }
      setParseData(data);
      setEditableText(data.raw_text);
      setStep('review');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || err.message || 'Parse failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStructure = async () => {
    if (!parseData?.task_id || !editableText.trim()) {
      setError('Không có nội dung để phân tích');
      return;
    }
    setLoading(true);
    setLoadingLabel('AI đang phân tích...');
    setError('');
    try {
      const structResp = await aiImportApi.structureDocument(
        parseData.task_id, editableText, skill, testType
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

  const handleImport = async () => {
    if (!preview?.task_id) return;
    setStep('saving');
    setError('');
    try {
      const resp = await aiImportApi.createTest(
        preview.task_id,
        preview.title || file?.name?.replace(/\.[^/.]+$/, '') || 'Imported Test',
        testType,
        preview.sections,
        null
      );
      const data = resp.data;
      if (data.success || data.test_id) {
        onImport(data.test_id);
      } else {
        setError(data.message || 'Create failed');
        setStep('preview');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Create failed');
      setStep('preview');
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setParseData(null);
    setEditableText('');
    setStep('select');
    setError('');
  };

  const isValid = file && skill;

  return (
    <div style={{
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
            </div>

            <div onDrop={handleFileDrop} onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${file ? '#2563eb' : '#ccc'}`,
                borderRadius: 10, padding: file ? 16 : 32, textAlign: 'center',
                cursor: 'pointer', backgroundColor: file ? '#eff6ff' : '#fafafa',
                marginBottom: 16, transition: 'all 0.2s',
              }}>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt"
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
                  <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>Hỗ trợ PDF, DOCX, TXT</div>
                </div>
              )}
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
                {loading ? `🔄 ${loadingLabel}` : '📄 Đọc Nội Dung File'}
              </button>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <div style={{
              backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: 8, padding: 14, marginBottom: 16,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                📄 Nội dung đã trích xuất ({parseData?.text_length || 0} ký tự)
              </div>
              <div style={{ fontSize: 13, color: '#555' }}>
                Kiểm tra và chỉnh sửa nội dung, sau đó bấm "Gửi lên AI" để phân tích thành đề thi.
                <br />Nội dung sẽ được cắt ở 4000 ký tự khi gửi lên AI.
              </div>
            </div>

            <textarea value={editableText} onChange={e => setEditableText(e.target.value)}
              style={{
                width: '100%', minHeight: 300, padding: 12, fontSize: 13,
                border: '1px solid #ddd', borderRadius: 8, fontFamily: 'monospace',
                lineHeight: 1.5, resize: 'vertical', marginBottom: 16,
                whiteSpace: 'pre-wrap',
              }} />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setStep('select'); setParseData(null); }} style={{
                padding: '8px 20px', borderRadius: 8, border: '1px solid #ddd',
                backgroundColor: '#fff', cursor: 'pointer', fontSize: 14,
              }}>← Quay lại</button>
              <button onClick={handleStructure} disabled={loading || !editableText.trim()} style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                backgroundColor: loading || !editableText.trim() ? '#ccc' : '#2563eb',
                color: '#fff', fontWeight: 600, cursor: loading || !editableText.trim() ? 'not-allowed' : 'pointer',
                fontSize: 14,
              }}>
                {loading ? `🔄 ${loadingLabel}` : '🤖 Gửi lên AI Phân Tích'}
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
                        fontSize: 12, color: '#555', maxHeight: 50, overflow: 'hidden',
                        backgroundColor: '#f9fafb', padding: '4px 8px', borderRadius: 4,
                        borderLeft: '3px solid #d1d5db', marginBottom: 4,
                      }}>
                        <span style={{ fontWeight: 600, color: '#1e40af' }}>
                          {group.content_type === 'READING_PASSAGE' ? '📖 Đoạn văn:' :
                           group.content_type === 'WRITING_PASSAGE' ? '✏️ Đề bài:' :
                           group.content_type === 'SPEAKING_CUECARD' ? '🎴 Cue Card:' : '📄 Nội dung:'}
                        </span>{' '}
                        {group.passage_text.substring(0, 200)}{group.passage_text.length > 200 ? '...' : ''}
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
