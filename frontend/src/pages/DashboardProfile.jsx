import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Calendar, Globe, BookOpen,
  Target, Edit3, Save, X, Camera,
  Headphones, PenLine, Mic,
  CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { SKILL_META } from '../data/dashboardData';
import { authApi } from '../services/authApi';

const SKILL_SCORES = [
  { skill: 'LISTENING', score: null, icon: Headphones },
  { skill: 'READING', score: null, icon: BookOpen },
  { skill: 'WRITING', score: null, icon: PenLine },
  { skill: 'SPEAKING', score: null, icon: Mic },
];

const STUDY_LEVELS = ['Trung học phổ thông', 'Cao đẳng', 'Đại học', 'Sau đại học', 'Khác'];
const NATIONALITIES = ['Việt Nam', 'Mỹ', 'Anh', 'Úc', 'Canada', 'Khác'];
const TARGET_BANDS = ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'];

function ScoreBar({ score, color }) {
  return (
    <div className="prof-score-bar-track">
      <div className="prof-score-bar-fill" style={{ width: `${(score / 9) * 100}%`, background: color }} />
    </div>
  );
}

export default function DashboardProfile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [joinDate, setJoinDate] = useState('');
  const [roles, setRoles] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    birthday: '',
    nationality: 'Việt Nam',
    studyLevel: 'Đại học',
    targetBand: '6.5',
    bio: '',
  });
  // Bản sao để cancel edit
  const [originalForm, setOriginalForm] = useState(null);

  // Load thông tin user khi mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await authApi.getCurrentUser();
        // Map từ backend field names → form field names
        const mapped = {
          name: data.fullName || data.username || '',
          email: data.email || '',
          phone: data.phoneNumber || '',
          birthday: data.birthday || '',
          nationality: data.nationality || 'Việt Nam',
          studyLevel: data.studyLevel || 'Đại học',
          targetBand: data.targetBand || '6.5',
          bio: data.bio || '',
        };
        setForm(mapped);
        setOriginalForm(mapped);
        setUserId(data.id);
        setRoles(data.roles ? [...data.roles] : []);
        if (data.createdAt) {
          const d = new Date(data.createdAt);
          setJoinDate(`Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`);
        }
      } catch (err) {
        setError('Không thể tải thông tin. Vui lòng đăng nhập lại.');
        console.error('Load profile error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      await authApi.updateProfile(userId, {
        fullName: form.name,
        email: form.email,
        phoneNumber: form.phone,
        birthday: form.birthday ? form.birthday : null,
        nationality: form.nationality,
        studyLevel: form.studyLevel,
        targetBand: form.targetBand,
        bio: form.bio,
      });
      setOriginalForm({ ...form });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Lưu thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm(originalForm || form);
    setEditing(false);
    setSaveError('');
  }

  const initials = form.name
    ? form.name.split(' ').map((w) => w[0]).filter(Boolean).slice(-2).join('').toUpperCase()
    : '?';

  const memberType = roles.includes('ADMIN') ? 'Quản trị viên'
    : roles.includes('MANAGER') ? 'Quản lý'
      : roles.includes('TEACHER') ? 'Giảng viên'
        : 'Thành viên';

  // Loading screen
  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, color: '#6b7280' }}>
          <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
          Đang tải thông tin...
        </div>
      </DashboardLayout>
    );
  }

  // Error screen
  if (error) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, color: '#dc2626' }}>
          <AlertCircle size={22} />
          {error}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* ── Header ── */}
      <div className="hist-header">
        <div>
          <h1 className="hist-title">Hồ sơ cá nhân</h1>
          <p className="hist-sub">Quản lý thông tin tài khoản và mục tiêu học tập của bạn.</p>
        </div>
        {!editing ? (
          <button className="prof-edit-btn" onClick={() => setEditing(true)}>
            <Edit3 size={16} /> Chỉnh sửa
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="prof-cancel-btn" onClick={handleCancel} disabled={saving}><X size={15} /> Huỷ</button>
            <button className="prof-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Đang lưu...</> : <><Save size={15} /> Lưu thay đổi</>}
            </button>
          </div>
        )}
      </div>

      {/* ── Toasts ── */}
      {saved && (
        <div className="prof-toast">
          <CheckCircle2 size={18} color="#16a34a" />
          Hồ sơ đã được cập nhật thành công!
        </div>
      )}
      {saveError && (
        <div className="auth-error" style={{ marginBottom: 16 }}>
          <AlertCircle size={18} />
          {saveError}
        </div>
      )}

      <div className="prof-grid">
        {/* ── Left: avatar + skill scores ── */}
        <div className="prof-left">
          {/* Avatar card */}
          <div className="prof-avatar-card">
            <div className="prof-avatar-wrap">
              <div className="prof-avatar-circle">{initials}</div>
              {editing && (
                <button className="prof-avatar-upload" title="Đổi ảnh đại diện">
                  <Camera size={14} />
                </button>
              )}
            </div>
            <p className="prof-avatar-name">{form.name}</p>
            <p className="prof-avatar-email">{form.email}</p>
            <span className="db-user-badge" style={{ alignSelf: 'center', marginTop: 4 }}>
              {memberType}
            </span>
            <div className="prof-avatar-meta">
              {joinDate && <span><Calendar size={13} /> Từ {joinDate}</span>}
              <span><Target size={13} /> Mục tiêu Band {form.targetBand}</span>
            </div>
          </div>

          {/* Skill score summary */}
          <div className="prof-skill-card">
            <h3 className="prof-section-title">Điểm kỹ năng</h3>
            <div className="prof-skill-list">
              {SKILL_SCORES.map(({ skill, score, icon: Icon }) => {
                const meta = SKILL_META[skill];
                return (
                  <div className="prof-skill-row" key={skill}>
                    <div className="prof-skill-icon" style={{ background: meta.bg, color: meta.text }}>
                      <Icon size={14} />
                    </div>
                    <div className="prof-skill-body">
                      <div className="prof-skill-top">
                        <span className="prof-skill-name">{meta.label}</span>
                        <span className="prof-skill-score" style={{ color: meta.text }}>
                          {score !== null ? score : '—'}
                        </span>
                      </div>
                      {score !== null && <ScoreBar score={score} color={meta.text} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right: form ── */}
        <div className="prof-form-card">
          <h3 className="prof-section-title">Thông tin cá nhân</h3>

          <div className="prof-form-grid">
            {/* Full name */}
            <div className="prof-field">
              <label className="prof-label"><User size={14} /> Họ và tên</label>
              {editing
                ? <input className="prof-input" name="name" value={form.name} onChange={handleChange} />
                : <p className="prof-value">{form.name}</p>}
            </div>

            {/* Email */}
            <div className="prof-field">
              <label className="prof-label"><Mail size={14} /> Email</label>
              {editing
                ? <input className="prof-input" name="email" type="email" value={form.email} onChange={handleChange} />
                : <p className="prof-value">{form.email}</p>}
            </div>

            {/* Phone */}
            <div className="prof-field">
              <label className="prof-label"><Phone size={14} /> Số điện thoại</label>
              {editing
                ? <input className="prof-input" name="phone" value={form.phone} onChange={handleChange} />
                : <p className="prof-value">{form.phone}</p>}
            </div>

            {/* Birthday */}
            <div className="prof-field">
              <label className="prof-label"><Calendar size={14} /> Ngày sinh</label>
              {editing
                ? <input className="prof-input" name="birthday" type="date" value={form.birthday} onChange={handleChange} />
                : <p className="prof-value">{form.birthday}</p>}
            </div>

            {/* Nationality */}
            <div className="prof-field">
              <label className="prof-label"><Globe size={14} /> Quốc tịch</label>
              {editing
                ? (
                  <select className="prof-input" name="nationality" value={form.nationality} onChange={handleChange}>
                    {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                )
                : <p className="prof-value">{form.nationality}</p>}
            </div>

            {/* Study level */}
            <div className="prof-field">
              <label className="prof-label"><BookOpen size={14} /> Trình độ học vấn</label>
              {editing
                ? (
                  <select className="prof-input" name="studyLevel" value={form.studyLevel} onChange={handleChange}>
                    {STUDY_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                )
                : <p className="prof-value">{form.studyLevel}</p>}
            </div>

            {/* Target band */}
            <div className="prof-field">
              <label className="prof-label"><Target size={14} /> Mục tiêu Band</label>
              {editing
                ? (
                  <select className="prof-input" name="targetBand" value={form.targetBand} onChange={handleChange}>
                    {TARGET_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                )
                : <p className="prof-value">Band {form.targetBand}</p>}
            </div>
          </div>

          {/* Bio */}
          <div className="prof-field" style={{ marginTop: 20 }}>
            <label className="prof-label"><Edit3 size={14} /> Giới thiệu bản thân</label>
            {editing
              ? (
                <textarea
                  className="prof-input prof-textarea"
                  name="bio"
                  rows={4}
                  value={form.bio}
                  onChange={handleChange}
                  placeholder="Viết vài dòng về bản thân, mục tiêu IELTS của bạn..."
                />
              )
              : <p className="prof-value prof-bio">{form.bio || '—'}</p>}
          </div>

          {editing && (
            <div className="prof-form-actions">
              <button className="prof-cancel-btn" onClick={handleCancel}><X size={15} /> Huỷ</button>
              <button className="prof-save-btn" onClick={handleSave}><Save size={15} /> Lưu thay đổi</button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
