import React, { useState, useEffect, useCallback, useRef } from 'react';
import agentApi from '../services/agentApi';
import { useToast } from '../components/Toast';
import {
  FileText, CheckCircle, Clock, Trash2, Search,
  ChevronLeft, ChevronRight, Plus, X, Edit2, Settings
} from 'lucide-react';
import './ContentManager.css';

const ITEMS_PER_PAGE = 8;
const ICONS = ['📝', '📰', '🎓', '🎉', '🌟', '📚', '💡', '🏆', '🎯', '📌'];
const COLORS = ['#2563eb', '#059669', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#0f766e'];

export default function ContentManager({ isEmbedded = false }) {
  const addToast = useToast();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [catFilter, setCatFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [showCatManager, setShowCatManager] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', color: '#2563eb', icon: '📝' });
  const [dropdownPostId, setDropdownPostId] = useState(null);

  // Wizard state
  const [wizard, setWizard] = useState({
    open: false, step: 0, topic: '', taskId: '',
    outline: null, content: '', stats: null,
    statusText: '', error: '', editing: false,
    editOutline: '', feedback: '', improving: false, showFeedback: false,
  });

  const updateWizard = useCallback((updates) => setWizard(prev => ({ ...prev, ...updates })), []);

  const filteredPosts = posts.filter(p => {
    if (catFilter && p.category_id !== catFilter) return false;
    if (filter && p.status !== filter) return false;
    if (search && !p.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const totalPages = Math.ceil(filteredPosts.length / ITEMS_PER_PAGE);
  const pagedPosts = filteredPosts.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const getCat = (id) => categories.find(c => c.id === id);

  const fetchData = async () => {
    try {
      const [pRes, cRes] = await Promise.all([agentApi.listPosts(), agentApi.listCategories()]);
      setPosts(pRes.data?.posts || []);
      setCategories(cRes.data?.categories || []);
    } catch {
      setError('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (!dropdownPostId) return;
    const handler = (e) => {
      if (!e.target.closest('.cm-card-cat-select')) {
        setDropdownPostId(null);
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [dropdownPostId]);

  const pollWizard = async (taskId, targetSteps) => {
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        const res = await agentApi.getWizardStatus(taskId);
        const data = res.data || res;
        if (data.error) { updateWizard({ error: data.error }); return; }
        if (targetSteps === 'outline' && data.status === 'outline_ready') {
          updateWizard({ outline: data.outline, step: 1, statusText: 'Đã có dàn bài. Vui lòng duyệt:', improving: false, showFeedback: false });
          return;
        }
        if (targetSteps === 'content' && (data.status === 'content_ready' || data.status === 'done')) {
          updateWizard({ content: data.content_html || '', stats: data.statistics || null, step: data.status === 'done' ? 3 : 2, statusText: data.status === 'done' ? 'Hoàn tất!' : 'Đã có nội dung.' });
          if (data.status === 'done') fetchData();
          return;
        }
        if (data.status === 'error') { updateWizard({ error: data.error || 'Có lỗi' }); return; }
        updateWizard({ statusText: `Đang xử lý bước ${data.step_index}/${data.total_steps}...` });
      } catch { /* retry */ }
    }
    updateWizard({ error: 'Quá thời gian chờ.' });
  };

  const handleStartWizard = async () => {
    if (!wizard.topic.trim()) return;
    updateWizard({ open: true, step: 0, error: '', statusText: 'Đang bắt đầu...' });
    try {
      const res = await agentApi.startWizard(wizard.topic);
      const data = res.data || res;
      if (data.error) { updateWizard({ error: data.error }); return; }
      updateWizard({ taskId: data.task_id, statusText: 'Đang nghiên cứu...' });
      await pollWizard(data.task_id, 'outline');
    } catch (e) {
      updateWizard({ error: 'Không thể khởi tạo: ' + (e.response?.data?.detail || e.message) });
    }
  };

  const handleApproveOutline = async (editMode) => {
    updateWizard({ statusText: 'Đang viết bài...' });
    try {
      let outline = null;
      if (editMode) { try { outline = JSON.parse(wizard.editOutline); } catch { updateWizard({ error: 'JSON không hợp lệ' }); return; } }
      const res = await agentApi.confirmWizardOutline(wizard.taskId, editMode ? 'edit' : 'approve', outline);
      const data = res.data || res;
      if (data.error) { updateWizard({ error: data.error }); return; }
      await pollWizard(wizard.taskId, 'content');
    } catch (e) {
      updateWizard({ error: 'Lỗi: ' + (e.response?.data?.detail || e.message) });
    }
  };
  const handleImproveOutline = async () => {
    if (!wizard.feedback.trim()) return;
    updateWizard({ improving: true, error: '', statusText: 'Đang cải thiện...' });
    try {
      const res = await agentApi.improveWizardOutline(wizard.taskId, wizard.feedback);
      const data = res.data || res;
      if (data.error) { updateWizard({ error: data.error, improving: false }); return; }
      await pollWizard(wizard.taskId, 'outline');
    } catch (e) {
      updateWizard({ error: 'Lỗi', improving: false });
    }
  };
  const handleApproveContent = async (editMode) => {
    updateWizard({ statusText: 'Đang lưu...', step: 3 });
    try {
      const res = await agentApi.confirmWizardContent(wizard.taskId, editMode ? 'edit' : 'approve', editMode ? wizard.content : null);
      const data = res.data || res;
      if (data.error) { updateWizard({ error: data.error, step: 2 }); return; }
      updateWizard({ step: 3, statusText: 'Hoàn tất!' });
      fetchData();
      addToast('Bài viết đã được tạo!', 'success');
    } catch (e) {
      updateWizard({ error: 'Lỗi', step: 2 });
    }
  };

  const handleDelete = async (id) => {
    try { await agentApi.deletePost(id); fetchData(); addToast('Đã xoá', 'success'); }
    catch { addToast('Xoá thất bại', 'error'); }
  };
  const handlePublish = async (id) => {
    try { await agentApi.publishPost(id); fetchData(); addToast('Đã đăng', 'success'); }
    catch { addToast('Đăng thất bại', 'error'); }
  };

  const handleAssignCategory = async (postId, categoryId) => {
    try {
      await agentApi.assignPostCategory(postId, categoryId);
      fetchData();
    } catch (e) {
      addToast('Lỗi gán danh mục', 'error');
    }
  };

  // Category CRUD
  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) return;
    try {
      if (editingCat) {
        await agentApi.updateCategory(editingCat.id, catForm);
      } else {
        await agentApi.createCategory(catForm);
      }
      const res = await agentApi.listCategories();
      setCategories(res.data?.categories || []);
      setEditingCat(null);
      setCatForm({ name: '', color: '#2563eb', icon: '📝' });
      addToast(editingCat ? 'Đã cập nhật' : 'Đã thêm', 'success');
    } catch (e) {
      addToast('Lỗi: ' + (e.response?.data?.detail || e.message), 'error');
    }
  };
  const handleDeleteCategory = async (id) => {
    try {
      await agentApi.deleteCategory(id);
      const res = await agentApi.listCategories();
      setCategories(res.data?.categories || []);
      addToast('Đã xoá', 'success');
    } catch (e) {
      addToast('Lỗi: ' + (e.response?.data?.detail || e.message), 'error');
    }
  };

  const statTotal = posts.length;
  const statPublished = posts.filter(p => p.status === 'published').length;
  const statDraft = posts.filter(p => p.status === 'draft').length;

  return (
    <div className="cm-container">
      <div className="cm-layout">
        {/* Sidebar */}
        <aside className="cm-sidebar">
          <div className="cm-sidebar-header">
            <h3>Danh mục</h3>
            <button onClick={() => setShowCatManager(true)} className="cm-sidebar-btn" title="Quản lý danh mục">
              <Settings size={16} />
            </button>
          </div>
          <div className="cm-sidebar-list">
            <div className={`cm-sidebar-item ${catFilter === null ? 'active' : ''}`}
              onClick={() => { setCatFilter(null); setPage(1); }}>
              <span style={{ color: '#64748b' }}>📋</span>
              <span>Tất cả</span>
              <span className="cm-sidebar-count">{statTotal}</span>
            </div>
            {categories.map(cat => (
              <div key={cat.id} className={`cm-sidebar-item ${catFilter === cat.id ? 'active' : ''}`}
                onClick={() => { setCatFilter(cat.id); setPage(1); }}>
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                <span className="cm-sidebar-count">{cat.post_count}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <div className="cm-main">
          {/* Header */}
          <div className="cm-header">
            <div>
              <h1>Quản lý bài viết</h1>
              <p>Bài viết do AI Agent tạo tự động</p>
            </div>
            <button className="cm-create-btn" onClick={() => updateWizard({ open: true, step: 0, topic: '' })}>
              <Plus size={16} /> Tạo bài viết mới
            </button>
          </div>

          {/* Stats */}
          <div className="cm-stats">
            {[
              { icon: <FileText size={18} />, bg: '#dbeafe', color: '#2563eb', num: statTotal, label: 'Tổng' },
              { icon: <CheckCircle size={18} />, bg: '#d1fae5', color: '#059669', num: statPublished, label: 'Đã đăng' },
              { icon: <Clock size={18} />, bg: '#fef3c7', color: '#d97706', num: statDraft, label: 'Nháp' },
              { icon: <FileText size={18} />, bg: '#ede9fe', color: '#7c3aed', num: categories.length, label: 'Danh mục' },
            ].map((s, i) => (
              <div key={i} className="cm-stat-card">
                <div className="cm-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                <div>
                  <p className="cm-stat-num">{s.num}</p>
                  <p className="cm-stat-label">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="cm-toolbar">
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-dim)' }} />
              <input className="cm-search" placeholder="Tìm kiếm..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: 32 }} />
            </div>
            {['', 'draft', 'published'].map(f => (
              <button key={f} className={`cm-filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => { setFilter(f); setPage(1); }}>
                {f || 'Tất cả'}
              </button>
            ))}
          </div>

          {/* Posts grid */}
          {loading ? (
            <div className="cm-loading">Đang tải...</div>
          ) : pagedPosts.length === 0 ? (
            <div className="cm-empty">
              {catFilter ? 'Không có bài viết trong danh mục này' : 'Chưa có bài viết nào'}
            </div>
          ) : (
            <>
              <div className="cm-grid">
                {pagedPosts.map(post => {
                  const isPub = post.status === 'published';
                  const cat = getCat(post.category_id);
                  return (
                    <div key={post.id} className="cm-card">
                      {/* Image */}
                      {post.thumbnail ? (
                        <div className="cm-card-img-wrap">
                          <img src={post.thumbnail?.replace('/uploads/', '/api/agent/uploads/')} alt="" className="cm-card-img"
                            onError={e => e.target.style.display = 'none'} />
                          <div className="cm-card-img-overlay" />
                          <div className="cm-card-cat-select">
                            <div style={{ position: 'relative' }}>
                              <span className="cm-card-cat-badge" style={{ background: cat?.color || '#64748b' }}
                                onClick={() => setDropdownPostId(dropdownPostId === post.id ? null : post.id)}>
                                {cat ? `${cat.icon} ${cat.name}` : '➕ Chọn danh mục'}
                              </span>
                              {dropdownPostId === post.id && (
                                <div style={{
                                  position: 'absolute', top: '100%', left: 0, marginTop: 4,
                                  background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                                  borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                  padding: '4px', minWidth: 160, zIndex: 9999,
                                }}>
                                  {categories.map(c => (
                                    <div key={c.id} onClick={e => {
                                      e.stopPropagation();
                                      handleAssignCategory(post.id, c.id);
                                      setDropdownPostId(null);
                                    }} style={{
                                      display: 'flex', alignItems: 'center', gap: 8,
                                      padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                                      fontSize: 13, color: 'var(--text)',
                                      background: cat?.id === c.id ? 'var(--glass)' : 'transparent',
                                    }}
                                      onMouseEnter={e => e.currentTarget.style.background = 'var(--glass)'}
                                      onMouseLeave={e => e.currentTarget.style.background = cat?.id === c.id ? 'var(--glass)' : 'transparent'}>
                                      <span>{c.icon}</span>
                                      <span style={{ flex: 1 }}>{c.name}</span>
                                      {cat?.id === c.id && <span style={{ fontSize: 11, color: 'var(--success)' }}>✓</span>}
                                    </div>
                                  ))}
                                  {cat && (
                                    <div onClick={e => {
                                      e.stopPropagation();
                                      handleAssignCategory(post.id, null);
                                      setDropdownPostId(null);
                                    }} style={{
                                      display: 'flex', alignItems: 'center', gap: 8,
                                      padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                                      fontSize: 13, color: 'var(--text-dim)', borderTop: '1px solid var(--glass-border)',
                                      marginTop: 4,
                                    }}
                                      onMouseEnter={e => e.currentTarget.style.background = 'var(--glass)'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                      <span>🗑️</span> Bỏ danh mục
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="cm-card-img-wrap cm-card-img-empty">
                          <FileText size={32} color="var(--text-dim)" />
                          <div className="cm-card-cat-select">
                            <div style={{ position: 'relative' }}>
                              <span className="cm-card-cat-badge" style={{ background: cat?.color || '#64748b' }}
                                onClick={() => setDropdownPostId(dropdownPostId === post.id ? null : post.id)}>
                                {cat ? `${cat.icon} ${cat.name}` : '➕ Chọn danh mục'}
                              </span>
                              {dropdownPostId === post.id && (
                                <div style={{
                                  position: 'absolute', top: '100%', left: 0, marginTop: 4,
                                  background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                                  borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                  padding: '4px', minWidth: 160, zIndex: 9999,
                                }}>
                                  {categories.map(c => (
                                    <div key={c.id} onClick={e => {
                                      e.stopPropagation();
                                      handleAssignCategory(post.id, c.id);
                                      setDropdownPostId(null);
                                    }} style={{
                                      display: 'flex', alignItems: 'center', gap: 8,
                                      padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                                      fontSize: 13, color: 'var(--text)',
                                      background: cat?.id === c.id ? 'var(--glass)' : 'transparent',
                                    }}
                                      onMouseEnter={e => e.currentTarget.style.background = 'var(--glass)'}
                                      onMouseLeave={e => e.currentTarget.style.background = cat?.id === c.id ? 'var(--glass)' : 'transparent'}>
                                      <span>{c.icon}</span>
                                      <span style={{ flex: 1 }}>{c.name}</span>
                                      {cat?.id === c.id && <span style={{ fontSize: 11, color: 'var(--success)' }}>✓</span>}
                                    </div>
                                  ))}
                                  {cat && (
                                    <div onClick={e => {
                                      e.stopPropagation();
                                      handleAssignCategory(post.id, null);
                                      setDropdownPostId(null);
                                    }} style={{
                                      display: 'flex', alignItems: 'center', gap: 8,
                                      padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                                      fontSize: 13, color: 'var(--text-dim)', borderTop: '1px solid var(--glass-border)',
                                      marginTop: 4,
                                    }}
                                      onMouseEnter={e => e.currentTarget.style.background = 'var(--glass)'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                      <span>🗑️</span> Bỏ danh mục
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Body */}
                      <div className="cm-card-body">
                        <h3 className="cm-card-title">{post.title}</h3>
                        <p className="cm-card-preview">{post.preview || ''}</p>
                        <div className="cm-card-meta">
                          <span>🏷 {post.tags?.slice(0, 2).join(', ') || 'general'}</span>
                          <span>⏱ {post.reading_time || '?'} ph</span>
                          <span className={`cm-badge ${isPub ? 'pub' : 'draft'}`}>
                            {isPub ? 'Đã đăng' : 'Nháp'}
                          </span>
                        </div>
                        <div className="cm-card-actions">
                          {!isPub && (
                            <button className="cm-action-btn pub" onClick={() => handlePublish(post.id)}>
                              <CheckCircle size={12} /> Đăng
                            </button>
                          )}
                          <button className="cm-action-btn del" onClick={() => handleDelete(post.id)}>
                            <Trash2 size={12} /> Xoá
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div className="cm-pagination">
                  <button className="cm-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={14} /></button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} className={`cm-page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                  ))}
                  <button className="cm-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={14} /></button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Wizard Modal */}
      {wizard.open && (
        <div className="cm-overlay" onClick={() => {}}>
          <div className={`cm-modal cm-step-${wizard.step}`} onClick={e => e.stopPropagation()}>
            <div className="cm-modal-header">
              <h2 className="cm-modal-title">{['Tạo bài viết', 'Duyệt dàn bài', 'Duyệt nội dung', 'Hoàn tất'][wizard.step]}</h2>
              <button className="cm-modal-close" onClick={() => updateWizard({ open: false })}>&times;</button>
            </div>

            {/* Steps Progress */}
            <div className="cm-steps">
              {[
                { step: 0, label: 'Chủ đề' },
                { step: 1, label: 'Dàn bài' },
                { step: 2, label: 'Nội dung' },
                { step: 3, label: 'Hoàn tất' },
              ].map((s, i) => (
                <React.Fragment key={s.step}>
                  <div className="cm-step-item">
                    <div className={`cm-step-dot ${wizard.step > s.step ? 'done' : wizard.step === s.step ? 'active' : ''}`}>
                      {wizard.step > s.step ? <CheckCircle size={16} /> : s.step + 1}
                    </div>
                    <span className={`cm-step-label ${wizard.step >= s.step ? 'active' : ''}`}>{s.label}</span>
                  </div>
                  {i < 3 && <div className={`cm-step-line ${wizard.step > s.step ? 'active' : ''}`} />}
                </React.Fragment>
              ))}
            </div>

            {/* Progress bar */}
            <div className="cm-progress-bar">
              <div className="cm-progress-fill" style={{ width: `${((wizard.step) / 3) * 100}%` }} />
            </div>

            {wizard.error && (
              <div className="cm-wizard-error">
                <span>⚠️</span> {wizard.error}
              </div>
            )}

            {/* ---------- STEP 0: Topic ---------- */}
            {wizard.step === 0 && (
              <div className="cm-wizard-body">
                <p className="cm-wizard-desc">Nhập chủ đề bạn muốn viết bài:</p>
                <div className="cm-topic-input-wrap">
                  <textarea
                    className="cm-textarea cm-topic-input"
                    rows={3}
                    placeholder="VD: Lợi ích của học IELTS với sinh viên..."
                    value={wizard.topic}
                    onChange={e => updateWizard({ topic: e.target.value })}
                    maxLength={200}
                  />
                  <span className="cm-topic-counter">{wizard.topic.length}/200</span>
                </div>
                <p className="cm-topic-hint">Gợi ý chủ đề:</p>
                <div className="cm-topic-suggestions">
                  {[
                    'Lợi ích của học IELTS với sinh viên',
                    'Phân tích xu hướng giáo dục 2025',
                    'Cách đạt band 7.0 IELTS Writing',
                    'Tác động của AI đến giáo dục',
                  ].map((s, i) => (
                    <button key={i} className="cm-chip" onClick={() => updateWizard({ topic: s })}>
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  className="cm-btn-primary"
                  onClick={handleStartWizard}
                  disabled={!wizard.topic.trim()}
                >
                  {wizard.statusText.includes('Đang') ? (
                    <span className="cm-btn-loading"><span className="cm-spinner" /> Đang xử lý...</span>
                  ) : (
                    <span>🚀 Tạo bài viết</span>
                  )}
                </button>
              </div>
            )}

            {/* ---------- STEP 1: Outline ---------- */}
            {wizard.step === 1 && (
              <div className="cm-wizard-body">
                <p className="cm-status-text">{wizard.statusText}</p>
                {wizard.outline ? (
                  <div className="cm-outline-container">
                    <div className="cm-outline-meta">
                      <h3 className="cm-outline-title">{wizard.outline.title}</h3>
                      {wizard.outline.meta_description && (
                        <p className="cm-outline-desc">{wizard.outline.meta_description}</p>
                      )}
                      {wizard.outline.seo_keywords?.length > 0 && (
                        <div className="cm-outline-tags">
                          {wizard.outline.seo_keywords.map((kw, i) => (
                            <span key={i} className="cm-outline-tag">{kw}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="cm-outline-sections">
                      {wizard.outline.sections?.map((s, i) => (
                        <div key={i} className="cm-section-card">
                          <div className="cm-section-head">
                            <span className="cm-section-num">{i + 1}</span>
                            <strong>{s.heading}</strong>
                          </div>
                          {s.key_points?.length > 0 && (
                            <ul className="cm-section-points">
                              {s.key_points.map((kp, j) => <li key={j}>{kp}</li>)}
                            </ul>
                          )}
                          {s.image_alt && <span className="cm-section-img-alt">📷 {s.image_alt}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : wizard.statusText && (
                  <div className="cm-loading-skeleton">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="cm-skeleton-card">
                        <div className="cm-skeleton-line w-60" />
                        <div className="cm-skeleton-line w-40" />
                        <div className="cm-skeleton-line w-80" />
                      </div>
                    ))}
                  </div>
                )}
                <div className="cm-wizard-actions">
                  <button className="cm-btn-primary cm-btn-inline" onClick={() => handleApproveOutline(false)}>
                    ✅ Duyệt & Viết bài
                  </button>
                  <button className="cm-btn-secondary" onClick={() => updateWizard({ showFeedback: !wizard.showFeedback })}>
                    🔄 Cải thiện
                  </button>
                </div>
                {wizard.showFeedback && (
                  <div className="cm-feedback-box">
                    <textarea
                      className="cm-textarea"
                      rows={2}
                      placeholder="Bạn muốn cải thiện điều gì? (VD: Thêm phần phân tích, ngắn gọn hơn...)"
                      value={wizard.feedback}
                      onChange={e => updateWizard({ feedback: e.target.value })}
                    />
                    <button
                      className="cm-btn-primary cm-btn-inline"
                      onClick={handleImproveOutline}
                      disabled={wizard.improving || !wizard.feedback.trim()}
                    >
                      {wizard.improving ? <span className="cm-btn-loading"><span className="cm-spinner" /> Đang cải thiện...</span> : 'Áp dụng'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ---------- STEP 2: Content ---------- */}
            {wizard.step === 2 && (
              <div className="cm-wizard-body">
                {wizard.stats && (
                  <div className="cm-stats-bar">
                    <div className="cm-stat-item">
                      <span className="cm-stat-icon">📝</span>
                      <span className="cm-stat-val">{wizard.stats.word_count}</span>
                      <span className="cm-stat-lbl">từ</span>
                    </div>
                    <div className="cm-stat-divider" />
                    <div className="cm-stat-item">
                      <span className="cm-stat-icon">🖼</span>
                      <span className="cm-stat-val">{wizard.stats.img_count}</span>
                      <span className="cm-stat-lbl">ảnh</span>
                    </div>
                    <div className="cm-stat-divider" />
                    <div className="cm-stat-item">
                      <span className="cm-stat-icon">⏱</span>
                      <span className="cm-stat-val">{Math.max(1, Math.round((wizard.stats.word_count || 0) / 200))}</span>
                      <span className="cm-stat-lbl">phút đọc</span>
                    </div>
                    {wizard.stats.seo_keywords?.length > 0 && (
                      <>
                        <div className="cm-stat-divider" />
                        <div className="cm-stat-item cm-stat-keywords">
                          {wizard.stats.seo_keywords.map((kw, i) => (
                            <span key={i} className="cm-keyword-chip">{kw}</span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div className="cm-content-preview" dangerouslySetInnerHTML={{ __html: wizard.content }} />
                <div className="cm-wizard-actions">
                  <button className="cm-btn-primary cm-btn-inline" onClick={() => handleApproveContent(false)}>
                    ✅ Lưu bài viết
                  </button>
                </div>
              </div>
            )}

            {/* ---------- STEP 3: Success ---------- */}
            {wizard.step === 3 && (
              <div className="cm-wizard-body">
                <div className="cm-success-screen">
                  <div className="cm-success-icon-wrap">
                    <div className="cm-success-icon">🎉</div>
                  </div>
                  <h3 className="cm-success-title">Bài viết đã được tạo thành công!</h3>
                  {wizard.stats && (
                    <div className="cm-success-stats">
                      <div className="cm-success-stat">
                        <span className="cm-success-stat-val">{wizard.stats.word_count}</span>
                        <span className="cm-success-stat-lbl">Từ</span>
                      </div>
                      <div className="cm-success-stat">
                        <span className="cm-success-stat-val">{Math.max(1, Math.round((wizard.stats.word_count || 0) / 200))}</span>
                        <span className="cm-success-stat-lbl">Phút đọc</span>
                      </div>
                      <div className="cm-success-stat">
                        <span className="cm-success-stat-val">{wizard.stats.img_count}</span>
                        <span className="cm-success-stat-lbl">Ảnh</span>
                      </div>
                    </div>
                  )}
                  <button className="cm-btn-primary" style={{ maxWidth: 300, margin: '20px auto 0' }}
                    onClick={() => { updateWizard({ open: false }); fetchData(); }}>
                    📋 Về danh sách
                  </button>
                </div>
              </div>
            )}

            {wizard.step >= 0 && wizard.step < 3 && wizard.statusText && !wizard.error && (
              <div className="cm-wizard-footer">
                <span className="cm-footer-status">{wizard.statusText}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCatManager && (
        <div className="cm-overlay" onClick={() => {}}>
          <div className="cm-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="cm-modal-header">
              <h2 className="cm-modal-title">Quản lý danh mục</h2>
              <button className="cm-modal-close" onClick={() => { setShowCatManager(false); setEditingCat(null); }}>&times;</button>
            </div>
            <div className="cm-wizard-body">
              {/* Form */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <input className="cm-textarea" style={{ flex: 1, minWidth: 150 }} placeholder="Tên danh mục"
                  value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} />
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {COLORS.slice(0, 6).map(c => (
                    <div key={c} onClick={() => setCatForm(f => ({ ...f, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer',
                        border: catForm.color === c ? '3px solid #fff' : '3px solid transparent',
                        boxShadow: catForm.color === c ? '0 0 0 2px #2563eb' : 'none',
                      }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {ICONS.slice(0, 8).map(ic => (
                    <span key={ic} onClick={() => setCatForm(f => ({ ...f, icon: ic }))}
                      style={{
                        fontSize: 20, cursor: 'pointer', padding: '2px 4px', borderRadius: 4,
                        background: catForm.icon === ic ? 'var(--glass)' : 'transparent',
                      }}>{ic}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                  {editingCat && (
                    <button style={{
                      padding: '8px 14px', borderRadius: 8, border: 'none',
                      background: '#64748b', color: '#fff', fontSize: 13, cursor: 'pointer',
                    }} onClick={() => { setEditingCat(null); setCatForm({ name: '', color: '#2563eb', icon: '📝' }); }}>
                      Huỷ
                    </button>
                  )}
                  <button className="cm-btn-primary" style={{ flex: 1 }} onClick={handleSaveCategory}
                    disabled={!catForm.name.trim()}>
                    {editingCat ? 'Cập nhật' : 'Thêm danh mục'}
                  </button>
                </div>
              </div>

              {/* List */}
              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 12 }}>
                {categories.map(cat => (
                  <div key={cat.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 8, marginBottom: 4,
                    background: 'var(--glass)',
                  }}>
                    <span>{cat.icon}</span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{cat.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{cat.post_count} bài</span>
                    <button onClick={() => { setEditingCat(cat); setCatForm({ name: cat.name, color: cat.color, icon: cat.icon }); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 2 }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDeleteCategory(cat.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 2 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
