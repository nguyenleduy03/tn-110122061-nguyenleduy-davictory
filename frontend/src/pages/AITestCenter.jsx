import React, { useState } from 'react';
import aiApi from '../services/aiApi';
import {
  Sparkles, Send, RotateCw, AlertCircle, CheckCircle2, ChevronDown, ChevronUp,
  Brain, FileText, BookOpen, PenLine, Mic, Quote, Target,
  ArrowUpRight, Layers, Lightbulb, Wrench, Languages, MessageSquare
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import '../styles/aiTestCenter.css';

const TASK_TYPES = [
  { value: 'TASK1_ACADEMIC', label: 'Task 1 Academic' },
  { value: 'TASK1_GENERAL', label: 'Task 1 General' },
  { value: 'TASK2_ACADEMIC', label: 'Task 2 Academic' },
  { value: 'TASK2_GENERAL', label: 'Task 2 General' },
];

const SERVICES = [
  { id: 'writing', label: 'Writing AI', icon: PenLine, desc: 'Chấm điểm IELTS Writing', color: '#a16207', bgColor: '#fef9c3' },
  { id: 'speaking', label: 'Speaking AI', icon: Mic, desc: 'Chấm điểm IELTS Speaking', color: '#be185d', bgColor: '#fce7f3', coming: true },
];

export default function AITestCenter() {
  const [essayText, setEssayText] = useState('');
  const [taskType, setTaskType] = useState('TASK2_ACADEMIC');
  const [topic, setTopic] = useState('');
  const [service, setService] = useState('writing');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTest = async () => {
    if (!essayText.trim()) {
      setError('Vui lòng nhập bài viết để kiểm tra.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await aiApi.testGradeWriting(
        essayText.trim(), taskType, topic || 'General'
      );
      const data = response.data;
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-test-page">
      <Navbar />

      {/* Hero Section */}
      <section className="ai-test-hero">
        <div className="ai-test-hero-bg" />
        <div className="ai-test-hero-inner">
          <div className="ai-test-badge">
            <Sparkles size={16} />
            <span>AI TEST CENTER</span>
          </div>
          <h1 className="ai-test-hero-title">
            Kiểm tra khả năng chấm điểm của{' '}
            <span className="gradient-text">AI</span>
          </h1>
          <p className="ai-test-hero-sub">
            Dán bài IELTS Writing của bạn vào và để AI chấm điểm với phân tích chi tiết từng tiêu chí,
            gợi ý sửa lỗi ngữ pháp, từ vựng và cấu trúc bài viết.
          </p>
        </div>
      </section>

      {/* Input Section */}
      <section className="ai-test-input-section">
        <div className="ai-test-container">
          <div className="ai-test-card">
            <div className="ai-test-card-header">
              <Brain size={22} />
              <span>Nhập bài viết cần kiểm tra</span>
            </div>
            <div className="ai-test-card-body">
              <div className="ai-test-options">
                <div className="ai-test-option-group">
                  <label className="ai-test-label">Dịch vụ AI</label>
                  <div className="ai-test-service-grid">
                    {SERVICES.map(s => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.id}
                          className={`ai-test-service-btn${service === s.id ? ' active' : ''}${s.coming ? ' coming' : ''}`}
                          onClick={() => !s.coming && setService(s.id)}
                          style={service === s.id ? { borderColor: s.color, background: s.bgColor } : {}}
                        >
                          <Icon size={20} style={{ color: s.color }} />
                          <div>
                            <div className="ai-test-service-name">{s.label}</div>
                            <div className="ai-test-service-desc">{s.desc}</div>
                          </div>
                          {s.coming && <span className="ai-test-coming-badge">Sắp ra mắt</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="ai-test-option-row">
                  <div className="ai-test-option-group">
                    <label className="ai-test-label">Loại task</label>
                    <select
                      className="ai-test-select"
                      value={taskType}
                      onChange={e => setTaskType(e.target.value)}
                    >
                      {TASK_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ai-test-option-group">
                    <label className="ai-test-label">Chủ đề (tùy chọn)</label>
                    <input
                      className="ai-test-input"
                      placeholder="VD: Environment, Education..."
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="ai-test-textarea-wrap">
                <textarea
                  className="ai-test-textarea"
                  placeholder="Dán bài IELTS Writing của bạn vào đây..."
                  value={essayText}
                  onChange={e => setEssayText(e.target.value)}
                  rows={12}
                />
                <div className="ai-test-textarea-footer">
                  <span className="ai-test-word-count">
                    {essayText.trim() ? `${essayText.trim().split(/\s+/).length} từ` : ''}
                  </span>
                  <button
                    className={`ai-test-submit-btn${loading ? ' loading' : ''}`}
                    onClick={handleTest}
                    disabled={loading || !essayText.trim()}
                  >
                    {loading ? (
                      <><RotateCw size={18} className="spin" /> Đang phân tích...</>
                    ) : (
                      <><Send size={18} /> Kiểm tra ngay</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <section className="ai-test-result-section">
          <div className="ai-test-container">
            <div className="ai-test-error">
              <AlertCircle size={22} />
              <div>
                <strong>Lỗi:</strong> {error}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Results */}
      {result && (
        <section className="ai-test-result-section">
          <div className="ai-test-container">
            <div className="ai-test-result-header">
              <div className="ai-test-result-badge">
                <CheckCircle2 size={18} />
                Kết quả chấm điểm
              </div>
              <div className="ai-test-score-big">
                <span className="ai-test-score-number">{result.overallBand}</span>
                <span className="ai-test-score-label">/ 9.0</span>
              </div>
              {result.confidenceScore != null && (
                <div className="ai-test-confidence">
                  <Target size={14} />
                  Độ tin cậy: {Math.round(result.confidenceScore * 100)}%
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="ai-test-tabs">
              {[
                { id: 'overview', label: 'Tổng quan', icon: FileText },
                { id: 'criteria', label: 'Chi tiết điểm', icon: Layers },
                { id: 'paragraphs', label: 'Phân tích đoạn', icon: BookOpen },
                { id: 'grammar', label: 'Sửa lỗi', icon: Wrench },
                { id: 'vocabulary', label: 'Từ vựng', icon: Languages },
                { id: 'coherence', label: 'Mạch lạc', icon: MessageSquare },
                { id: 'structure', label: 'Cấu trúc', icon: Lightbulb },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    className={`ai-test-tab${activeTab === tab.id ? ' active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={15} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="ai-test-tab-content">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="ai-test-overview">
                  <div className="ai-test-criteria-grid">
                    {[
                      { key: 'taskResponse', label: 'Task Response', color: '#1d4ed8' },
                      { key: 'coherenceCohesion', label: 'Coherence & Cohesion', color: '#15803d' },
                      { key: 'lexicalResource', label: 'Lexical Resource', color: '#a16207' },
                      { key: 'grammaticalRange', label: 'Grammatical Range', color: '#be185d' },
                    ].map(c => {
                      const score = result[c.key];
                      return (
                        <div key={c.key} className="ai-test-criteria-card" style={{ borderTopColor: c.color }}>
                          <div className="ai-test-criteria-name">{c.label}</div>
                          <div className="ai-test-criteria-score" style={{ color: c.color }}>
                            {score?.band ?? 'N/A'}
                          </div>
                          {score?.detailedFeedback && (
                            <p className="ai-test-criteria-feedback">{score.detailedFeedback}</p>
                          )}
                          {score?.strengths?.length > 0 && (
                            <div className="ai-test-criteria-tags">
                              {score.strengths.slice(0, 2).map((s, i) => (
                                <span key={i} className="ai-test-tag ai-test-tag-good">+ {s}</span>
                              ))}
                            </div>
                          )}
                          {score?.weaknesses?.length > 0 && (
                            <div className="ai-test-criteria-tags">
                              {score.weaknesses.slice(0, 2).map((w, i) => (
                                <span key={i} className="ai-test-tag ai-test-tag-bad">- {w}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {result.overallFeedback && (
                    <div className="ai-test-feedback-box">
                      <Quote size={18} />
                      <p>{result.overallFeedback}</p>
                    </div>
                  )}

                  {result.improvementPriority?.length > 0 && (
                    <div className="ai-test-improvement-list">
                      <h4>Ưu tiên cải thiện:</h4>
                      <ol>
                        {result.improvementPriority.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* Criteria Tab with Sub-scores */}
              {activeTab === 'criteria' && (
                <div className="ai-test-criteria-detail">
                  {[
                    { key: 'taskResponse', subKey: 'trSubScores', label: 'Task Response', subLabels: ['Relevance to Prompt', 'Clarity of Position', 'Depth of Ideas', 'Appropriateness of Format', 'Relevant & Specific Examples', 'Appropriate Word Count'] },
                    { key: 'coherenceCohesion', subKey: 'ccSubScores', label: 'Coherence & Cohesion', subLabels: ['Logical Organization', 'Effective Introduction & Conclusion', 'Supported Main Points', 'Cohesive Devices Usage', 'Paragraphing'] },
                    { key: 'lexicalResource', subKey: 'lrSubScores', label: 'Lexical Resource', subLabels: ['Vocabulary Range', 'Lexical Accuracy', 'Spelling and Word Formation'] },
                    { key: 'grammaticalRange', subKey: 'graSubScores', label: 'Grammatical Range & Accuracy', subLabels: ['Sentence Structure Variety', 'Grammar Accuracy', 'Punctuation Usage'] },
                  ].map(group => {
                    const score = result[group.key];
                    const subScores = result[group.subKey];
                    return (
                      <div key={group.key} className="ai-test-subscore-card">
                        <div className="ai-test-subscore-header">
                          <span className="ai-test-subscore-title">{group.label}</span>
                          <span className="ai-test-subscore-band">{score?.band ?? 'N/A'}</span>
                        </div>
                        {subScores && subScores.length > 0 && (
                          <div className="ai-test-subscore-grid">
                            {subScores.map((sub, i) => (
                              <div key={i} className="ai-test-subscore-item">
                                <div className="ai-test-subscore-label">{sub.name}</div>
                                <div className="ai-test-subscore-bar-wrap">
                                  <div className="ai-test-subscore-bar" style={{ width: `${(sub.score / 9) * 100}%`, background: sub.score >= 6 ? '#22c55e' : sub.score >= 4 ? '#eab308' : '#ef4444' }} />
                                </div>
                                <div className="ai-test-subscore-value" style={{ color: sub.score >= 6 ? '#22c55e' : sub.score >= 4 ? '#eab308' : '#ef4444' }}>{sub.score}/9</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Paragraph Feedback Tab */}
              {activeTab === 'paragraphs' && (
                <div className="ai-test-paragraphs">
                  {result.paragraphFeedback?.length > 0 ? result.paragraphFeedback.map((p, i) => (
                    <div key={i} className="ai-test-paragraph-card">
                      <button className="ai-test-paragraph-header" onClick={() => toggleSection(`p-${i}`)}>
                        <div className="ai-test-paragraph-type-badge" data-type={p.type}>{p.type === 'introduction' ? 'MỞ ĐẦU' : p.type === 'conclusion' ? 'KẾT LUẬN' : 'THÂN BÀI'}</div>
                        <span className="ai-test-paragraph-preview">{p.originalText?.substring(0, 80)}...</span>
                        {expandedSections[`p-${i}`] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      {expandedSections[`p-${i}`] && (
                        <div className="ai-test-paragraph-body">
                          <div className="ai-test-paragraph-feedback">{p.feedback}</div>
                          {p.criteriaComments && (
                            <div className="ai-test-paragraph-comments">
                              {Object.entries(p.criteriaComments).map(([key, val]) => (
                                <div key={key} className="ai-test-para-comment">
                                  <strong>{key}:</strong> {val}
                                </div>
                              ))}
                            </div>
                          )}
                          {p.rewriteSuggestion && (
                            <div className="ai-test-rewrite">
                              <h5><Sparkles size={14} /> Gợi ý viết lại:</h5>
                              <div className="ai-test-rewrite-text">{p.rewriteSuggestion}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="ai-test-empty">Chưa có phân tích đoạn văn.</div>
                  )}
                </div>
              )}

              {/* Grammar Fixes Tab */}
              {activeTab === 'grammar' && (
                <div className="ai-test-grammar">
                  {result.grammarFixes?.length > 0 ? (
                    <table className="ai-test-table">
                      <thead>
                        <tr>
                          <th>Vị trí</th>
                          <th>Lỗi gốc</th>
                          <th>Sửa lại</th>
                          <th>Giải thích</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.grammarFixes.map((g, i) => (
                          <tr key={i}>
                            <td className="ai-table-location">{g.location}</td>
                            <td className="ai-table-error"><span className="error-text">{g.original}</span></td>
                            <td className="ai-table-correct"><span className="correct-text">{g.correction}</span></td>
                            <td className="ai-table-explain">{g.explanation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="ai-test-empty">Chưa có gợi ý sửa lỗi ngữ pháp.</div>
                  )}
                </div>
              )}

              {/* Vocabulary Tab */}
              {activeTab === 'vocabulary' && (
                <div className="ai-test-vocab">
                  <div className="ai-test-vocab-grid">
                    {result.vocabSuggestions?.length > 0 ? result.vocabSuggestions.map((v, i) => (
                      <div key={i} className="ai-test-vocab-card">
                        <div className="ai-test-vocab-word">{v.word}</div>
                        <div className="ai-test-vocab-type">{v.wordType}</div>
                        <div className="ai-test-vocab-def">{v.definition}</div>
                        {v.context && <div className="ai-test-vocab-example">"{v.context}"</div>}
                        {v.originalWord && <div className="ai-test-vocab-original">→ Thay thế cho: "{v.originalWord}"</div>}
                      </div>
                    )) : (
                      <div className="ai-test-empty">Chưa có gợi ý từ vựng.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Coherence Tab */}
              {activeTab === 'coherence' && (
                <div className="ai-test-coherence">
                  {result.coherenceImprovements?.length > 0 ? result.coherenceImprovements.map((c, i) => (
                    <div key={i} className="ai-test-coherence-card">
                      <div className="ai-test-coherence-label">Cải thiện {i + 1}</div>
                      <div className="ai-test-coherence-compare">
                        <div className="ai-test-coherence-before">
                          <span className="badge-error">Gốc</span>
                          <p>{c.original}</p>
                        </div>
                        <ArrowUpRight size={20} className="ai-test-coherence-arrow" />
                        <div className="ai-test-coherence-after">
                          <span className="badge-success">Cải thiện</span>
                          <p>{c.improved}</p>
                        </div>
                      </div>
                      <div className="ai-test-coherence-explain">
                        <strong>Giải thích:</strong> {c.explanation}
                      </div>
                    </div>
                  )) : (
                    <div className="ai-test-empty">Chưa có gợi ý cải thiện mạch lạc.</div>
                  )}
                </div>
              )}

              {/* Structure Tab */}
              {activeTab === 'structure' && (
                <div className="ai-test-structure">
                  {result.structureFeedback ? (
                    <>
                      {result.structureFeedback.taskType && (
                        <div className="ai-test-structure-type">
                          <strong>Loại bài:</strong> {result.structureFeedback.taskType}
                        </div>
                      )}
                      {result.structureFeedback.keyTips?.length > 0 && (
                        <div className="ai-test-structure-tips">
                          <h5>Mẹo chính:</h5>
                          <ul>
                            {result.structureFeedback.keyTips.map((tip, i) => (
                              <li key={i}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.structureFeedback.recommendedOutline?.length > 0 && (
                        <div className="ai-test-structure-outline">
                          <h5>Dàn bài gợi ý:</h5>
                          {result.structureFeedback.recommendedOutline.map((item, i) =>
                            Object.entries(item).map(([key, val]) => (
                              <div key={key} className="ai-test-outline-item">
                                <strong>{key}:</strong> {val}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="ai-test-empty">Chưa có gợi ý cấu trúc.</div>
                  )}
                </div>
              )}
            </div>

            {/* Raw JSON */}
            <button
              className="ai-test-raw-toggle"
              onClick={() => toggleSection('raw')}
            >
              {expandedSections.raw ? 'Ẩn' : 'Xem'} dữ liệu JSON thô
              {expandedSections.raw ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSections.raw && (
              <pre className="ai-test-raw-json">{JSON.stringify(result, null, 2)}</pre>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
