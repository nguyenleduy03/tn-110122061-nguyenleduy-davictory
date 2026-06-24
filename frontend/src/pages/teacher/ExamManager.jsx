import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Play, Square, Trash2, Edit, Eye, Users, Globe, RefreshCw, Search, Clock } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';
import { examApi } from '../../services/examApi';
import { testBuilderApi } from '../../services/testBuilderApi';
import { authApi } from '../../services/authApi';
import { API_CONFIG } from '../../config/api';
import '../../styles/lms.css';

const STATUS_LABELS = {
  SCHEDULED: 'Chờ mở',
  OPEN: 'Đang mở',
  CLOSED: 'Đã kết thúc',
};

const STATUS_CLASSES = {
  SCHEDULED: 'neutral',
  OPEN: 'success',
  CLOSED: 'danger',
};

const TYPE_LABELS = {
  CLASS_EXAM: 'Lớp',
  OPEN_EXAM: 'Tự do',
};

export default function ExamManager() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterTab, setFilterTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [tests, setTests] = useState([]);
  const [classes, setClasses] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    testId: '',
    examType: 'CLASS_EXAM',
    classId: '',
    scheduledStartTime: '',
    scheduledEndTime: '',
    password: '',
    durationMinutes: 30,
    maxAttempts: 1,
    allowReviewAfterSubmit: false,
    lateEntryMinutes: 15,
  });

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const data = await examApi.listTeacherExams();
      setExams(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Không thể tải danh sách kỳ thi');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFormData = useCallback(async () => {
    try {
      const user = authApi.getStoredUser();
      const isAdmin = user?.roles?.some(r => ['ADMIN', 'MANAGER'].includes(r));
      const testData = isAdmin
        ? await testBuilderApi.getAllTests()
        : await testBuilderApi.getMyTests();
      setTests(Array.isArray(testData) ? testData.filter(t => t.status === 'PUBLISHED') : []);
      
      try {
        const token = localStorage.getItem('authToken');
        const baseUrl = API_CONFIG.BASE_URL;
        const classRes = await fetch(`${baseUrl}/class-management/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (classRes.ok) {
          const classData = await classRes.json();
          setClasses(Array.isArray(classData.classes) ? classData.classes : []);
        }
      } catch (err) {
        console.warn('Không thể tải danh sách lớp:', err);
      }
    } catch (err) {
      console.error('Error loading form data:', err);
    }
  }, []);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const openCreateModal = async () => {
    await loadFormData();
    setEditingExam(null);
    setForm({
      title: '', description: '', testId: '', examType: 'CLASS_EXAM',
      classId: '', scheduledStartTime: '', scheduledEndTime: '', password: '',
      durationMinutes: 30, maxAttempts: 1, allowReviewAfterSubmit: false, lateEntryMinutes: 15,
    });
    setShowModal(true);
  };

  const openEditModal = async (exam) => {
    await loadFormData();
    setEditingExam(exam);
    setForm({
      title: exam.title || '',
      description: exam.description || '',
      testId: exam.testId || '',
      examType: exam.examType || 'CLASS_EXAM',
      classId: exam.classId || '',
      scheduledStartTime: exam.scheduledStartTime ? exam.scheduledStartTime.slice(0, 16) : '',
      scheduledEndTime: exam.scheduledEndTime ? exam.scheduledEndTime.slice(0, 16) : '',
      password: '',
      durationMinutes: exam.durationMinutes || 30,
      maxAttempts: exam.maxAttempts || 1,
      allowReviewAfterSubmit: exam.allowReviewAfterSubmit || false,
      lateEntryMinutes: exam.lateEntryMinutes || 15,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...form,
        testId: Number(form.testId),
        durationMinutes: Number(form.durationMinutes),
        maxAttempts: Number(form.maxAttempts),
        lateEntryMinutes: Number(form.lateEntryMinutes),
        classId: form.classId ? Number(form.classId) : null,
        scheduledStartTime: form.scheduledStartTime || null,
        scheduledEndTime: form.scheduledEndTime || null,
        password: form.password || null,
      };

      if (editingExam) {
        await examApi.update(editingExam.id, payload);
      } else {
        await examApi.create(payload);
      }
      setShowModal(false);
      fetchExams();
    } catch (err) {
      alert(err?.response?.data?.error || 'Lỗi khi lưu kỳ thi');
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (id) => {
    try {
      await examApi.start(id);
      fetchExams();
    } catch (err) {
      alert(err?.response?.data?.error || 'Lỗi khi mở kỳ thi');
    }
  };

  const handleClose = async (id) => {
    try {
      await examApi.close(id);
      fetchExams();
    } catch (err) {
      alert(err?.response?.data?.error || 'Lỗi khi đóng kỳ thi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá kỳ thi này?')) return;
    try {
      await examApi.delete(id);
      fetchExams();
    } catch (err) {
      alert(err?.response?.data?.error || 'Lỗi khi xoá kỳ thi');
    }
  };

  const filteredExams = exams
    .filter(e => filterTab === 'ALL' || e.status === filterTab)
    .filter(e => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return e.title?.toLowerCase().includes(q) || e.testTitle?.toLowerCase().includes(q) || e.className?.toLowerCase().includes(q);
    });

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
  };

  const formatDuration = (m) => {
    if (!m) return '—';
    return `${m} phút`;
  };

  return (
    <LmsLayout title="Quản lý kỳ thi" subtitle="Tạo và quản lý các kỳ thi cho lớp hoặc thi tự do">
      <div className="lms-panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
            <div className="lms-tests-search-wrap" style={{ flex: 1, maxWidth: 400 }}>
              <Search size={14} className="lms-tests-search-icon" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kỳ thi, đề thi hoặc lớp..."
                className="lms-tests-search-input"
              />
            </div>
            {['ALL', 'SCHEDULED', 'OPEN', 'CLOSED'].map(tab => (
              <button
                key={tab}
                className={`lms-pill ${filterTab === tab ? 'active' : 'neutral'}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setFilterTab(tab)}
              >
                {tab === 'ALL' ? 'Tất cả' : STATUS_LABELS[tab] || tab}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="lms-cta ghost" onClick={fetchExams} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'lms-spin' : ''} />
            </button>
            <button className="lms-cta" onClick={openCreateModal}>
              <Plus size={14} /> Tạo kỳ thi mới
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="lms-panel" style={{ marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
          {error}
        </div>
      )}

      <div className="lms-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="lms-tests-table-wrap">
          <table className="lms-table">
            <thead>
              <tr>
                <th>Tên kỳ thi</th>
                <th>Đề thi</th>
                <th>Loại</th>
                <th>Lớp</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th>SL nộp</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 60 }}><RefreshCw size={24} className="lms-spin" style={{ opacity: 0.3 }} /></td></tr>
              ) : filteredExams.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Không tìm thấy kỳ thi nào</td></tr>
              ) : filteredExams.map(exam => (
                <tr key={exam.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{exam.title}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>ID: {exam.id}</div>
                  </td>
                  <td>{exam.testTitle || '—'}</td>
                  <td>
                    <span className={`lms-pill ${exam.examType === 'CLASS_EXAM' ? 'info' : 'warn'}`} style={{ fontSize: 11 }}>
                      {exam.examType === 'CLASS_EXAM' ? <Users size={12} /> : <Globe size={12} />}
                      {' '}{TYPE_LABELS[exam.examType] || exam.examType}
                    </span>
                  </td>
                  <td>{exam.className || '—'}</td>
                  <td>
                    {exam.examType === 'CLASS_EXAM'
                      ? <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {formatDuration(exam.durationMinutes)}</div>
                      : <div style={{ fontSize: 12 }}>
                          <div>{formatDate(exam.scheduledStartTime)}</div>
                          <div style={{ color: '#94a3b8' }}>đến {formatDate(exam.scheduledEndTime)}</div>
                        </div>
                    }
                  </td>
                  <td>
                    <span className={`lms-pill ${STATUS_CLASSES[exam.status] || 'neutral'}`}>
                      {STATUS_LABELS[exam.status] || exam.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{exam.totalSubmitted || 0} <span style={{ fontWeight: 400, color: '#94a3b8' }}>/ {exam.totalAttempts || 0}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {exam.status === 'SCHEDULED' && (
                        <>
                          {exam.examType === 'CLASS_EXAM' && (
                            <button className="lms-cta success" style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => handleStart(exam.id)} title="Mở kỳ thi">
                              <Play size={12} />
                            </button>
                          )}
                          <button className="lms-cta ghost" style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => openEditModal(exam)} title="Sửa">
                            <Edit size={12} />
                          </button>
                          <button className="lms-cta danger" style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => handleDelete(exam.id)} title="Xoá">
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                      {exam.status === 'OPEN' && (
                        <button className="lms-cta danger" style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handleClose(exam.id)} title="Đóng kỳ thi">
                          <Square size={12} />
                        </button>
                      )}
                      <button className="lms-cta ghost" style={{ padding: '4px 10px', fontSize: 12 }}
                        title="Xem chi tiết">
                        <Eye size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="em-overlay" onClick={() => setShowModal(false)}>
          <div className="em-modal" onClick={e => e.stopPropagation()}>
            <div className="em-modal-header">
              <div>
                <h2 className="em-modal-title">{editingExam ? 'Sửa kỳ thi' : 'Tạo kỳ thi mới'}</h2>
                <p className="em-modal-sub">Cấu hình kỳ thi cho lớp học hoặc thi tự do</p>
              </div>
              <button className="em-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="em-body">

                {/* ─── THÔNG TIN CƠ BẢN ─── */}
                <div className="em-section">
                  <div className="em-section-title">Thông tin cơ bản</div>
                  <div className="em-field">
                    <label className="em-label">Tên kỳ thi <span className="em-req">*</span></label>
                    <input className="em-input" required value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })} placeholder="VD: Giữa kỳ 1 - Listening" />
                  </div>
                  <div className="em-field">
                    <label className="em-label">Mô tả</label>
                    <textarea className="em-input em-textarea" rows={2} value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ghi chú về kỳ thi (không bắt buộc)" />
                  </div>
                </div>

                {/* ─── ĐỀ THI & LOẠI ─── */}
                <div className="em-section">
                  <div className="em-section-title">Đề thi & Loại hình</div>
                  <div className="em-field">
                    <label className="em-label">Chọn đề thi <span className="em-req">*</span></label>
                    <select className="em-input" required value={form.testId}
                      onChange={e => setForm({ ...form, testId: e.target.value })}>
                      <option value="">-- Chọn đề thi --</option>
                      {tests.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="em-field">
                    <label className="em-label">Loại kỳ thi <span className="em-req">*</span></label>
                    <div className="em-radio-group">
                      <label className={`em-radio ${form.examType === 'CLASS_EXAM' ? 'active' : ''}`}>
                        <input type="radio" value="CLASS_EXAM" checked={form.examType === 'CLASS_EXAM'}
                          onChange={e => setForm({ ...form, examType: e.target.value })} />
                        <Users size={16} />
                        <div>
                          <strong>Thi cho lớp</strong>
                          <small>Chỉ học viên trong lớp mới thi được</small>
                        </div>
                      </label>
                      <label className={`em-radio ${form.examType === 'OPEN_EXAM' ? 'active' : ''}`}>
                        <input type="radio" value="OPEN_EXAM" checked={form.examType === 'OPEN_EXAM'}
                          onChange={e => setForm({ ...form, examType: e.target.value })} />
                        <Globe size={16} />
                        <div>
                          <strong>Thi tự do</strong>
                          <small>Bất kỳ ai cũng có thể tham gia</small>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* ─── LỚP HỌC (CLASS_EXAM) ─── */}
                {form.examType === 'CLASS_EXAM' && (
                  <div className="em-section">
                    <div className="em-section-title">Lớp thi</div>
                    <div className="em-field">
                      <label className="em-label">Chọn lớp <span className="em-req">*</span></label>
                      <select className="em-input" required value={form.classId}
                        onChange={e => setForm({ ...form, classId: e.target.value })}>
                        <option value="">-- Chọn lớp --</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name} <span style={{color:'#94a3b8'}}>({c.code})</span></option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* ─── THỜI GIAN ─── */}
                <div className="em-section">
                  <div className="em-section-title">Thời gian</div>
                  <div className="em-row">
                    {form.examType === 'OPEN_EXAM' ? (
                      <>
                        <div className="em-field">
                          <label className="em-label">Giờ mở cửa <span className="em-req">*</span></label>
                          <input className="em-input" type="datetime-local" required value={form.scheduledStartTime}
                            onChange={e => setForm({ ...form, scheduledStartTime: e.target.value })} />
                        </div>
                        <div className="em-field">
                          <label className="em-label">Giờ đóng cửa <span className="em-req">*</span></label>
                          <input className="em-input" type="datetime-local" required value={form.scheduledEndTime}
                            onChange={e => setForm({ ...form, scheduledEndTime: e.target.value })} />
                        </div>
                      </>
                    ) : (
                      <div className="em-field">
                        <label className="em-label">Lịch thi (tuỳ chọn)</label>
                        <input className="em-input" type="datetime-local" value={form.scheduledStartTime}
                          onChange={e => setForm({ ...form, scheduledStartTime: e.target.value })} />
                        <small className="em-hint">Để trống nếu bạn muốn tự bấm "Mở" khi tới giờ</small>
                      </div>
                    )}
                  </div>
                  <div className="em-row">
                    <div className="em-field">
                      <label className="em-label">Thời gian làm bài (phút) <span className="em-req">*</span></label>
                      <input className="em-input" type="number" min={1} required value={form.durationMinutes}
                        onChange={e => setForm({ ...form, durationMinutes: e.target.value })} />
                    </div>
                    <div className="em-field">
                      <label className="em-label">Cho phép vào muộn tối đa (phút)</label>
                      <input className="em-input" type="number" min={0} value={form.lateEntryMinutes}
                        onChange={e => setForm({ ...form, lateEntryMinutes: e.target.value })} />
                      <small className="em-hint">0 = không cho vào muộn</small>
                    </div>
                  </div>
                </div>

                {/* ─── CẤU HÌNH KHÁC ─── */}
                <div className="em-section">
                  <div className="em-section-title">Cấu hình khác</div>
                  {form.examType === 'OPEN_EXAM' && (
                    <div className="em-row">
                      <div className="em-field">
                        <label className="em-label">Mật khẩu (tuỳ chọn)</label>
                        <input className="em-input" type="text" value={form.password}
                          onChange={e => setForm({ ...form, password: e.target.value })}
                          placeholder="Để trống nếu không cần mật khẩu" />
                        <small className="em-hint">Nếu có, thí sinh phải nhập mật khẩu mới vào được</small>
                      </div>
                      <div className="em-field">
                        <label className="em-label">Số lần thi tối đa</label>
                        <input className="em-input" type="number" min={1} value={form.maxAttempts}
                          onChange={e => setForm({ ...form, maxAttempts: e.target.value })} />
                      </div>
                    </div>
                  )}
                  <div className="em-checkbox">
                    <input type="checkbox" id="allowReview" checked={form.allowReviewAfterSubmit}
                      onChange={e => setForm({ ...form, allowReviewAfterSubmit: e.target.checked })} />
                    <label htmlFor="allowReview">Cho phép xem kết quả ngay sau khi nộp bài</label>
                  </div>
                </div>

              </div>

              <div className="em-modal-footer">
                <button type="button" className="em-btn em-btn-ghost" onClick={() => setShowModal(false)}>Huỷ bỏ</button>
                <button type="submit" className="em-btn em-btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : editingExam ? 'Cập nhật kỳ thi' : 'Tạo kỳ thi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .em-overlay {
          position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px;
        }
        .em-modal {
          background: white; border-radius: 16; width: 100%; max-width: 680px; max-height: 90vh;
          display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        .em-modal form { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
        @keyframes emModalFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .em-modal-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding: 20px 24px 0; position: sticky; top: 0; background: white; z-index: 1;
        }
        .em-modal-title { margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
        .em-modal-sub { margin: 4px 0 0; font-size: 14px; color: #64748b; }
        .em-close {
          background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          color: #64748b; font-size: 18px; flex-shrink: 0; transition: all 0.2s;
        }
        .em-close:hover { background: #fee2e2; color: #ef4444; }
        .em-body { 
          padding: 20px 24px; 
          overflow-y: auto; 
          overflow-x: hidden;
          flex: 1; 
          min-height: 0;
          scrollbar-width: thin; 
          scrollbar-color: #cbd5e1 transparent;
          background: #fafbfc;
        }
        .em-section {
          background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12; padding: 12px 14px; margin-bottom: 10;
          overflow: hidden; min-width: 0;
        }
        .em-section-title {
          font-size: 11; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
          color: #64748b; margin-bottom: 10; padding-bottom: 6; border-bottom: 1px solid #e2e8f0;
        }
        .em-section-title::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }
        .em-field { margin-bottom: 10px; min-width: 0; }
        .em-field:last-child { margin-bottom: 0; }
        .em-label { display: block; margin-bottom: 5px; font-size: 13px; font-weight: 600; color: #334155; }
        .em-req { color: #ef4444; margin-left: 2px; }
        .em-hint { display: block; margin-top: 6px; font-size: 12px; color: #94a3b8; line-height: 1.5; }
        .em-input {
          width: 100%; max-width: 100%; padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px;
          font-size: 14px; color: #0f172a; background: #fcfcfd; box-sizing: border-box;
          transition: all 0.2s;
        }
        .em-input:focus { outline: none; border-color: #2563eb; background: #fff; box-shadow: 0 0 0 4px rgba(37,99,235,0.08); }
        select.em-input { appearance: auto; cursor: pointer; }
        .em-textarea { resize: vertical; min-height: 80px; }
        .em-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; min-width: 0; }
        .em-row > * { min-width: 0; }
        .em-radio-group { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .em-radio {
          display: flex; align-items: center; gap: 8; padding: 8px 12px;
          border: 1.5px solid #e2e8f0; border-radius: 8; cursor: pointer; transition: all 0.15s;
          background: white;
        }
        .em-radio:hover { border-color: #cbd5e1; background: #f8fafc; }
        .em-radio.active { border-color: #2563eb; background: #eff6ff; box-shadow: 0 4px 12px rgba(37,99,235,0.05); }
        .em-radio input[type="radio"] { margin-top: 3px; accent-color: #2563eb; width: 16px; height: 16px; }
        .em-radio div { display: flex; flex-direction: column; gap: 4px; }
        .em-radio strong { font-size: 15px; color: #0f172a; font-weight: 700; }
        .em-radio small { font-size: 12px; color: #64748b; line-height: 1.4; }
        .em-checkbox {
          display: flex; align-items: center; gap: 12px; padding: 12px 16px;
          background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;
          cursor: pointer; transition: all 0.2s;
        }
        .em-checkbox:hover { background: #f1f5f9; }
        .em-checkbox input { width: 18px; height: 18px; accent-color: #2563eb; cursor: pointer; }
        .em-checkbox label { font-size: 14px; font-weight: 600; color: #334155; cursor: pointer; flex: 1; }
        .em-modal-footer {
          display: flex; justify-content: flex-end; gap: 10;
          padding: 12px 24px 16px; background: white; border-top: 1px solid #e2e8f0;
        }
        .em-btn {
          padding: 12px 28px; border-radius: 12px; border: none; font-size: 15px; font-weight: 700;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .em-btn-primary { background: #2563eb; color: white; box-shadow: 0 4px 14px rgba(37,99,235,0.3); }
        .em-btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.4); }
        .em-btn-primary:active { transform: translateY(0); }
        .em-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .em-btn-ghost { background: #fff; color: #475569; border: 1.5px solid #e2e8f0; }
        .em-btn-ghost:hover { background: #f1f5f9; border-color: #cbd5e1; color: #0f172a; }
      `}</style>
    </LmsLayout>
  );
}