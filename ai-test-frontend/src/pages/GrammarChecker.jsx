import { useState } from 'react';
import {
  Languages, CheckCircle2, AlertCircle, RefreshCw, Download,
  ArrowRight, Globe, Sparkles, Copy, Zap, Check, Play, Clipboard
} from 'lucide-react';

const languages = [
  { code: 'en-us', flag: '🇺🇸', name: 'English (US)' },
  { code: 'en-gb', flag: '🇬🇧', name: 'English (UK)' },
  { code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt' },
  { code: 'zh', flag: '🇨🇳', name: 'Trung Quốc' },
  { code: 'ja', flag: '🇯🇵', name: 'Nhật Bản' },
  { code: 'ko', flag: '🇰🇷', name: 'Hàn Quốc' },
  { code: 'es', flag: '🇪🇸', name: 'Tây Ban Nha' },
  { code: 'fr', flag: '🇫🇷', name: 'Pháp' },
  { code: 'de', flag: '🇩🇪', name: 'Đức' },
  { code: 'it', flag: '🇮🇹', name: 'Ý' },
  { code: 'pt', flag: '🇵🇹', name: 'Bồ Đào Nha' },
  { code: 'th', flag: '🇹🇭', name: 'Thái Lan' },
  { code: 'ru', flag: '🇷🇺', name: 'Nga' },
  { code: 'ar', flag: '🇸🇦', name: 'Ả Rập' },
  { code: 'hi', flag: '🇮🇳', name: 'Ấn Độ' },
];

const sampleText = `LexiBot is an AI-powered platform offering a suite of online tools designed to support language teaching and learning for students and educators worldwide. The platform includes an IELTS writing checker, speaking practice, and a multilingual grammar checker that supports over 120 languages.

Recently, I have been using this tool to improve my English writing skills. The feedback is very detailed and help me understand my mistakes. I think this is a great tool for anyone who want to practice English.`;

export default function GrammarChecker() {
  const [text, setText] = useState(sampleText);
  const [language, setLanguage] = useState('en-us');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [activeErrors, setActiveErrors] = useState([]);

  const handleCheckGrammar = () => {
    if (!text.trim()) return;
    setAnalyzing(true);
    setResult(null);

    // Simulated parsing delay for realistic AI analysis
    setTimeout(() => {
      const detectedErrors = [];
      const lowerText = text.toLowerCase();

      // Check for 'help' vs 'helps' (Subject-verb agreement)
      if (lowerText.includes('feedback is') && lowerText.includes('help me')) {
        detectedErrors.push({
          text: 'help',
          correct: 'helps',
          type: 'Ngữ pháp',
          desc: 'Sự hòa hợp giữa chủ ngữ và động từ: "feedback" là danh từ không đếm được (số ít), động từ phải là "helps".'
        });
      }

      // Check for 'want' vs 'wants'
      if (lowerText.includes('anyone who want')) {
        detectedErrors.push({
          text: 'want',
          correct: 'wants',
          type: 'Ngữ pháp',
          desc: 'Đại từ bất định "anyone" được coi là số ít, động từ đi kèm phải thêm s/es thành "wants".'
        });
      }

      // Dynamic rule if user enters custom text
      if (detectedErrors.length === 0 && text.trim().length > 10) {
        // Find some common lowercase verbs to simulate checking
        if (lowerText.includes('he go')) {
          detectedErrors.push({
            text: 'go',
            correct: 'goes',
            type: 'Ngữ pháp',
            desc: 'Chủ ngữ "he" yêu cầu động từ chia ở ngôi thứ ba số ít.'
          });
        } else if (lowerText.includes('they is')) {
          detectedErrors.push({
            text: 'is',
            correct: 'are',
            type: 'Ngữ pháp',
            desc: 'Chủ ngữ số nhiều "they" yêu cầu động từ tobe "are".'
          });
        } else {
          // General dummy correction card for generic text check
          detectedErrors.push({
            text: 'IELTS writing checker',
            correct: 'IELTS Writing Checker',
            type: 'Chính tả',
            desc: 'Viết hoa danh từ riêng hoặc tên gọi chức năng công cụ học thuật.'
          });
        }
      }

      setActiveErrors(detectedErrors);
      setResult({
        accuracy: detectedErrors.length === 0 ? 100 : Math.max(70, 95 - detectedErrors.length * 5),
        rate: 98
      });
      setAnalyzing(false);
    }, 1200);
  };

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) setText(clipText);
    } catch {
      alert('Không thể truy cập Clipboard của bạn. Vui lòng dán thủ công bằng Ctrl+V.');
    }
  };

  return (
    <div style={{ paddingBottom: '32px' }}>
      {/* Title block */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '4px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: '#f5f3ff',
            color: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Languages size={22} />
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
            Kiểm tra Ngữ pháp AI (Grammar Checker)
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', fontWeight: 500 }}>
          Tự động phát hiện, giải thích và sửa lỗi chính tả, ngữ pháp đa ngôn ngữ bằng công nghệ học máy nâng cao.
        </p>
      </div>

      {/* Language Selector Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '12px' }}>
          <Globe size={16} color="#4f46e5" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Lựa chọn ngôn ngữ phân tích:
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {languages.map(l => {
            const isActive = language === l.code;
            return (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: isActive ? '#4f46e5' : '#cbd5e1',
                  background: isActive ? '#f5f3ff' : '#ffffff',
                  color: isActive ? '#4f46e5' : '#475569',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#94a3b8';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }
                }}
              >
                <span>{l.flag}</span>
                <span>{l.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor & Results columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', alignItems: 'stretch' }}>
        {/* Left: Input Editor */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} color="#4f46e5" /> Nhập văn bản cần phân tích
            </h3>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>
              {text.trim() === '' ? 0 : text.trim().split(/\s+/).length} từ
            </span>
          </div>

          <div style={{
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            overflow: 'hidden',
            background: '#fafbfc',
            display: 'flex',
            flexDirection: 'column',
            flex: 1
          }}>
            {/* Editor Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderBottom: '1px solid #cbd5e1',
              background: '#f1f5f9'
            }}>
              <button
                onClick={() => setText('')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={11} /> Xóa sạch
              </button>
              <button
                onClick={handlePaste}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Clipboard size={11} /> Dán văn bản
              </button>
            </div>

            {/* Main Textarea */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Dán hoặc nhập đoạn văn bản tiếng Anh hoặc tiếng Việt vào đây để kiểm tra..."
              style={{
                width: '100%',
                minHeight: '260px',
                padding: '16px',
                border: 'none',
                outline: 'none',
                background: '#ffffff',
                fontSize: '14px',
                lineHeight: '1.7',
                color: '#1e293b',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <button
              onClick={handleCheckGrammar}
              disabled={analyzing || !text.trim()}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: '10px',
                border: 'none',
                background: analyzing ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: text.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: text.trim() && !analyzing ? '0 4px 12px rgba(79, 70, 229, 0.2)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {analyzing ? (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  Đang phân tích lỗi...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Bắt đầu phân tích lỗi
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Results Panel */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <AlertCircle size={16} color="#4f46e5" /> Kết quả phân tích
            {result && (
              <span style={{
                marginLeft: 8,
                padding: '2px 8px',
                borderRadius: '12px',
                background: activeErrors.length > 0 ? '#fef2f2' : '#ecfdf5',
                color: activeErrors.length > 0 ? '#ef4444' : '#10b981',
                fontSize: '11px',
                fontWeight: 700
              }}>
                Phát hiện {activeErrors.length} lỗi
              </span>
            )}
          </h3>

          {!result ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '280px',
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              background: '#fafbfc'
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#f3f4f6',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12
              }}>
                <Languages size={24} />
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                Nhấn nút "Bắt đầu phân tích lỗi" để kiểm tra ngữ pháp
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px', flexShrink: 0 }}>
                <div style={{ background: '#ecfdf5', borderRadius: '10px', padding: '10px', textAlign: 'center', border: '1px solid #d1fae5' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>{result.accuracy}%</div>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginTop: 2 }}>Độ chính xác</div>
                </div>
                <div style={{ background: activeErrors.length > 0 ? '#fef2f2' : '#ecfdf5', borderRadius: '10px', padding: '10px', textAlign: 'center', border: activeErrors.length > 0 ? '1px solid #fecaca' : '1px solid #d1fae5' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: activeErrors.length > 0 ? '#ef4444' : '#10b981' }}>{activeErrors.length}</div>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginTop: 2 }}>Tổng số lỗi</div>
                </div>
                <div style={{ background: '#eef2ff', borderRadius: '10px', padding: '10px', textAlign: 'center', border: '1px solid #c7d2fe' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#4f46e5' }}>{result.rate}%</div>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginTop: 2 }}>Độ bao phủ</div>
                </div>
              </div>

              {/* Errors List Container */}
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '220px', paddingRight: '4px', marginBottom: '16px' }}>
                {activeErrors.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#10b981', gap: 6 }}>
                    <CheckCircle2 size={32} />
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>Tuyệt vời! Không tìm thấy lỗi ngữ pháp nào.</span>
                  </div>
                ) : (
                  activeErrors.map((err, i) => (
                    <div key={i} style={{
                      padding: '12px',
                      marginBottom: '8px',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      borderLeft: '4px solid #ef4444',
                      background: '#fff8f8',
                      fontSize: '12.5px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: '#ef4444',
                          color: '#ffffff',
                          fontSize: '9.5px',
                          fontWeight: 700
                        }}>
                          {err.type}
                        </span>
                        <span style={{ textDecoration: 'line-through', color: '#64748b', fontWeight: 500 }}>"{err.text}"</span>
                        <ArrowRight size={12} color="#10b981" />
                        <span style={{ color: '#10b981', fontWeight: 700 }}>"{err.correct}"</span>
                      </div>
                      <div style={{ color: '#475569', fontSize: '11.5px', lineHeight: 1.5, fontWeight: 500 }}>{err.desc}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Actions row */}
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', flexShrink: 0 }}>
                <button
                  onClick={handleCheckGrammar}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', background: '#ffffff', color: '#475569',
                    border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6
                  }}
                >
                  <RefreshCw size={12} /> Kiểm tra lại
                </button>
                <button
                  style={{
                    padding: '8px 14px', borderRadius: '8px', background: '#ffffff', color: '#475569',
                    border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6
                  }}
                >
                  <Download size={12} /> Xuất file DOCX
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Features Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '13.5px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={15} color="#10b981" /> Độ chính xác cao
          </h4>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.6, fontWeight: 500 }}>
            Hệ thống phân tích ngữ pháp sâu kết hợp máy học giúp phát hiện chuẩn xác các lỗi cú pháp khó nhất.
          </p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '13.5px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={15} color="#f59e0b" /> Phân tích tức thì
          </h4>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.6, fontWeight: 500 }}>
            Hiển thị kết quả lỗi chính tả, ngữ pháp và gợi ý chỉnh sửa trực tiếp chỉ sau 1 giây.
          </p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '13.5px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Languages size={15} color="#4f46e5" /> Hỗ trợ hơn 120 ngôn ngữ
          </h4>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.6, fontWeight: 500 }}>
            Độ tương thích cực kỳ rộng bao gồm Tiếng Anh (Anh/Mỹ), Tiếng Việt, Tiếng Trung, Nhật, Hàn...
          </p>
        </div>
      </div>
    </div>
  );
}
