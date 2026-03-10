import React, { useState } from 'react';
import {
  Bell, Lock, Shield, Trash2,
  Eye, EyeOff, CheckCircle2, Save,
  Mail, MessageSquare, Globe, Moon,
  AlertTriangle,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';

// ── Toggle component ──────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      className={`sett-toggle${checked ? ' on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span className="sett-toggle-thumb" />
    </button>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function SettSection({ icon: Icon, iconColor, iconBg, title, subtitle, children }) {
  return (
    <section className="sett-section">
      <div className="sett-section-head">
        <div className="sett-section-icon" style={{ background: iconBg, color: iconColor }}>
          <Icon size={18} />
        </div>
        <div>
          <h2 className="sett-section-title">{title}</h2>
          {subtitle && <p className="sett-section-sub">{subtitle}</p>}
        </div>
      </div>
      <div className="sett-section-body">{children}</div>
    </section>
  );
}

// ── Row with toggle ───────────────────────────────────────────────────────────
function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="sett-row">
      <div className="sett-row-text">
        <p className="sett-row-label">{label}</p>
        {desc && <p className="sett-row-desc">{desc}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export default function DashboardSettings() {
  // ── Notification prefs ────────────────────────────────────────────────────
  const [notif, setNotif] = useState({
    email_results:   true,
    email_tips:      false,
    email_news:      true,
    push_reminder:   true,
    push_streak:     true,
  });

  // ── Appearance ────────────────────────────────────────────────────────────
  const [darkMode,  setDarkMode]  = useState(false);
  const [language,  setLanguage]  = useState('vi');

  // ── Privacy ──────────────────────────────────────────────────────────────
  const [privacy, setPrivacy] = useState({
    show_profile:   true,
    show_scores:    false,
    show_activity:  true,
  });

  // ── Password change ───────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');

  function handlePwChange(e) {
    setPwForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setPwError('');
  }

  function handlePwSave() {
    if (!pwForm.current) { setPwError('Vui lòng nhập mật khẩu hiện tại.'); return; }
    if (pwForm.next.length < 8) { setPwError('Mật khẩu mới phải tối thiểu 8 ký tự.'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('Mật khẩu xác nhận không khớp.'); return; }
    setPwForm({ current: '', next: '', confirm: '' });
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 3000);
  }

  // ── Delete account ────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  return (
    <DashboardLayout>
      {/* ── Page header ── */}
      <div className="hist-header">
        <div>
          <h1 className="hist-title">Cài đặt</h1>
          <p className="hist-sub">Tuỳ chỉnh thông báo, bảo mật và quyền riêng tư của tài khoản.</p>
        </div>
      </div>

      <div className="sett-layout">

        {/* ─────────────────── NOTIFICATIONS ─────────────────── */}
        <SettSection
          icon={Bell} iconColor="#1d4ed8" iconBg="#dbeafe"
          title="Thông báo"
          subtitle="Quản lý email và push notification bạn muốn nhận."
        >
          <p className="sett-group-label"><Mail size={13} /> Email</p>
          <ToggleRow label="Kết quả bài thi" desc="Gửi email khi bạn hoàn thành một bài thi."
            checked={notif.email_results} onChange={(v) => setNotif({ ...notif, email_results: v })} />
          <ToggleRow label="Mẹo học IELTS" desc="Nhận bài viết tips và chiến lược học mỗi tuần."
            checked={notif.email_tips} onChange={(v) => setNotif({ ...notif, email_tips: v })} />
          <ToggleRow label="Tin tức & cập nhật" desc="Thông báo đề thi mới và tính năng mới."
            checked={notif.email_news} onChange={(v) => setNotif({ ...notif, email_news: v })} />

          <div className="sett-divider" />

          <p className="sett-group-label"><MessageSquare size={13} /> Push Notification</p>
          <ToggleRow label="Nhắc luyện tập hằng ngày" desc="Nhắc bạn luyện tập để duy trì streak."
            checked={notif.push_reminder} onChange={(v) => setNotif({ ...notif, push_reminder: v })} />
          <ToggleRow label="Chuỗi ngày học (Streak)" desc="Thông báo khi streak của bạn sắp bị gián đoạn."
            checked={notif.push_streak} onChange={(v) => setNotif({ ...notif, push_streak: v })} />
        </SettSection>

        {/* ─────────────────── APPEARANCE ─────────────────── */}
        <SettSection
          icon={Moon} iconColor="#7c3aed" iconBg="#ede9fe"
          title="Giao diện & ngôn ngữ"
        >
          <ToggleRow label="Chế độ tối (Dark Mode)" desc="Giao diện tối giúp giảm mỏi mắt khi học đêm."
            checked={darkMode} onChange={setDarkMode} />

          <div className="sett-divider" />

          <div className="sett-row">
            <div className="sett-row-text">
              <p className="sett-row-label"><Globe size={13} style={{ display: 'inline', marginRight: 4 }} />Ngôn ngữ giao diện</p>
              <p className="sett-row-desc">Chọn ngôn ngữ hiển thị cho toàn bộ ứng dụng.</p>
            </div>
            <select
              className="sett-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </div>
        </SettSection>

        {/* ─────────────────── PASSWORD ─────────────────── */}
        <SettSection
          icon={Lock} iconColor="#065f46" iconBg="#d1fae5"
          title="Đổi mật khẩu"
          subtitle="Sử dụng mật khẩu mạnh ít nhất 8 ký tự."
        >
          {pwSaved && (
            <div className="prof-toast" style={{ marginBottom: 14 }}>
              <CheckCircle2 size={18} color="#16a34a" /> Mật khẩu đã được cập nhật!
            </div>
          )}
          {pwError && <p className="sett-pw-error">{pwError}</p>}

          {[
            { name: 'current', label: 'Mật khẩu hiện tại' },
            { name: 'next',    label: 'Mật khẩu mới' },
            { name: 'confirm', label: 'Xác nhận mật khẩu mới' },
          ].map(({ name, label }) => (
            <div className="prof-field" key={name} style={{ marginBottom: 12 }}>
              <label className="prof-label">{label}</label>
              <div className="sett-pw-wrap">
                <input
                  className="prof-input"
                  type={showPw[name] ? 'text' : 'password'}
                  name={name}
                  value={pwForm[name]}
                  onChange={handlePwChange}
                  placeholder="••••••••"
                  style={{ paddingRight: 40 }}
                  autoComplete="new-password"
                />
                <button
                  className="sett-pw-eye"
                  onClick={() => setShowPw((s) => ({ ...s, [name]: !s[name] }))}
                  tabIndex={-1}
                >
                  {showPw[name] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}

          <button className="prof-save-btn" style={{ marginTop: 6 }} onClick={handlePwSave}>
            <Save size={15} /> Cập nhật mật khẩu
          </button>
        </SettSection>

        {/* ─────────────────── PRIVACY ─────────────────── */}
        <SettSection
          icon={Shield} iconColor="#be185d" iconBg="#fce7f3"
          title="Quyền riêng tư"
          subtitle="Kiểm soát thông tin nào hiển thị công khai trên hồ sơ của bạn."
        >
          <ToggleRow label="Hồ sơ công khai" desc="Cho phép người dùng khác xem hồ sơ của bạn."
            checked={privacy.show_profile} onChange={(v) => setPrivacy({ ...privacy, show_profile: v })} />
          <ToggleRow label="Hiển thị điểm thi" desc="Chia sẻ điểm Band Score của bạn công khai."
            checked={privacy.show_scores}  onChange={(v) => setPrivacy({ ...privacy, show_scores:  v })} />
          <ToggleRow label="Hiển thị hoạt động" desc="Cho phép theo dõi bạn vừa thi bài nào."
            checked={privacy.show_activity} onChange={(v) => setPrivacy({ ...privacy, show_activity: v })} />
        </SettSection>

        {/* ─────────────────── DANGER ZONE ─────────────────── */}
        <SettSection
          icon={Trash2} iconColor="#dc2626" iconBg="#fee2e2"
          title="Vùng nguy hiểm"
          subtitle="Các thao tác này không thể hoàn tác. Hãy cân nhắc kỹ trước khi thực hiện."
        >
          {!deleteConfirm ? (
            <div className="sett-danger-row">
              <div className="sett-row-text">
                <p className="sett-row-label">Xoá tài khoản</p>
                <p className="sett-row-desc">Toàn bộ dữ liệu, lịch sử thi và tiến trình sẽ bị xoá vĩnh viễn.</p>
              </div>
              <button className="sett-delete-btn" onClick={() => setDeleteConfirm(true)}>
                <Trash2 size={14} /> Xoá tài khoản
              </button>
            </div>
          ) : (
            <div className="sett-danger-confirm">
              <AlertTriangle size={22} color="#dc2626" />
              <p className="sett-danger-msg">
                Bạn có chắc chắn muốn xoá tài khoản? Hành động này <strong>không thể hoàn tác</strong>.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button className="prof-cancel-btn" onClick={() => setDeleteConfirm(false)}>Không, giữ lại</button>
                <button className="sett-delete-btn-confirm">Có, xoá tài khoản</button>
              </div>
            </div>
          )}
        </SettSection>

      </div>
    </DashboardLayout>
  );
}
