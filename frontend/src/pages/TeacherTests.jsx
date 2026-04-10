import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FilePlus,
  Pencil,
  Trash2,
  Search,
  ChevronDown,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileText,
  Clock,
  CheckCircle2,
  Archive,
  Eye,
  Link as LinkIcon,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import PublicShareLinkModal from '../components/common/PublicShareLinkModal';
import VersionHistoryModal from '../components/common/VersionHistoryModal';
import { testBuilderApi } from '../services/testBuilderApi';
import { authApi } from '../services/authApi';

/* ── Status config ── */
const STATUS_CONFIG = {
  DRAFT:      { label: 'Nháp',             icon: FileText,     color: '#6b7280', bg: '#f3f4f6' },
  REVIEWING:  { label: 'Đang kiểm duyệt',  icon: Clock,        color: '#d97706', bg: '#fef3c7' },
  TEST_EXAM:  { label: 'Test Exam',       icon: Eye,          color: '#7c3aed', bg: '#f3e8ff' },
  PUBLISHED:  { label: 'Đã xuất bản',      icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7' },
  ARCHIVED:   { label: 'Lưu trữ',          icon: Archive,      color: '#9ca3af', bg: '#f3f4f6' },
  DELETED:    { label: 'Thùng rác',        icon: Trash2,       color: '#dc2626', bg: '#fee2e2' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
];

const TYPE_LABELS = { ACADEMIC: 'Academic', GENERAL: 'General Training' };
const SUPPORTED_PUBLIC_SKILLS = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];

/* ── Helpers ── */
const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const extractIncludedSkills = (test) => {
  const sessions = Array.isArray(test?.sessions) ? test.sessions : [];
  return sessions
    .filter((session) => session?.isIncluded !== false)
    .map((session) => String(session?.skillType || '').toUpperCase())
    .filter(Boolean);
};

const resolvePublicSkill = (test) => {
  const includedSkills = extractIncludedSkills(test);

  for (const skill of SUPPORTED_PUBLIC_SKILLS) {
    if (includedSkills.includes(skill)) return skill;
  }

  return null;
};

const skillToPathSegment = (skill) => {
  switch (String(skill || '').toUpperCase()) {
    case 'LISTENING':
      return 'listening';
    case 'READING':
      return 'reading';
    case 'WRITING':
      return 'writing';
    case 'SPEAKING':
      return 'speaking';
    default:
      return null;
  }
};

/* ── StatusBadge ── */
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, icon: FileText, color: '#6b7280', bg: '#f3f4f6' };
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      color: cfg.color, background: cfg.bg,
    }}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

/* ── ConfirmModal ── */
function ConfirmModal({ test, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 28, maxWidth: 420, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
          <AlertCircle size={22} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 6 }}>
              Cho vào thùng rác?
            </p>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              Đề thi <strong>"{test.title || 'Không tên'}"</strong> sẽ được chuyển vào thùng rác.
              Bạn có thể khôi phục hoặc xóa vĩnh viễn sau nếu cần.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 18px', borderRadius: 8, border: '1px solid #d1d5db',
              background: '#fff', color: '#374151', fontSize: 14, cursor: 'pointer', fontWeight: 500,
            }}
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: '#dc2626', color: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 600,
            }}
          >
            Cho vào thùng rác
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function TeacherTests() {
  const navigate = useNavigate();

  // Kiểm tra quyền TEACHER
  const user = authApi.getStoredUser();
  const hasPermission = user?.roles?.some(r => ['TEACHER', 'MANAGER', 'ADMIN'].includes(r));
  const isAdmin = authApi.hasRole('ADMIN');
  const canRestoreTest = (test) => isAdmin || String(test?.createdByUsername || '') === String(user?.username || '');

  const [tests, setTests]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // test to confirm delete
  const [deleting, setDeleting]     = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalTest, setShareModalTest] = useState(null);
  const [shareModalSkill, setShareModalSkill] = useState('');
  const [shareModalStatus, setShareModalStatus] = useState('');
  const [shareData, setShareData] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');
  const [versionModalTest, setVersionModalTest] = useState(null);

  const fetchTests = useCallback(async () => {
    if (!hasPermission) { setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const data = isAdmin
        ? await testBuilderApi.getAllTests(statusFilter || undefined)
        : await testBuilderApi.getMyTests(statusFilter || undefined);
      setTests(Array.isArray(data) ? data : (data.content ?? []));
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Bạn không có quyền truy cập. Cần đăng nhập bằng tài khoản TEACHER/MANAGER/ADMIN.');
      } else {
        setError('Không thể tải danh sách đề thi. Vui lòng thử lại.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, hasPermission, isAdmin]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await testBuilderApi.deleteTest(deleteTarget.id);
      if (statusFilter === 'DELETED') {
        await fetchTests();
      } else {
        setTests(prev => prev.filter(t => t.id !== deleteTarget.id));
      }
    } catch (err) {
      setError('Xóa đề thi thất bại. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleRestore = async (test) => {
    if (!test?.id) return;
    if (!canRestoreTest(test)) {
      setError('Chỉ người tạo hoặc admin mới có thể khôi phục đề thi đã xóa.');
      return;
    }

    setActionLoadingId(test.id);
    setError('');
    try {
      await testBuilderApi.restoreTest(test.id);
      await fetchTests();
    } catch (err) {
      setError(err?.response?.data?.error || 'Khôi phục đề thi thất bại. Vui lòng thử lại.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreatePublicLink = async (test) => {
    if (!test?.id) return;

    setShareModalTest(test);
    setShareModalStatus(test?.status || '');
    setShareModalOpen(true);
    setShareData(null);
    setShareError('');

    const isShareable = ['PUBLISHED', 'TEST_EXAM'].includes(String(test?.status || '').toUpperCase());
    if (!isShareable) {
      setShareLoading(false);
      return;
    }

    setShareLoading(true);

    try {
      const skill = await resolvePublicSkillForShare(test);
      const pathSegment = skillToPathSegment(skill);
      if (!pathSegment) {
        setShareModalSkill('');
        setShareLoading(false);
        return;
      }

      const currentShare = await testBuilderApi.getCurrentShareLink(test.id, skill);
      if (currentShare?.exists) {
        setShareData(currentShare);
        setShareModalSkill(skill);
      } else {
        setShareModalSkill(skill);
      }
    } catch (err) {
      setShareError(err?.response?.data?.error || err?.message || 'Không thể kiểm tra link công khai.');
    } finally {
      setShareLoading(false);
    }
  };

  const promoteToTestExamAndShare = async () => {
    if (!shareModalTest?.id) return;

    setShareLoading(true);
    setShareError('');
    try {
      if (String(shareModalStatus || '').toUpperCase() !== 'TEST_EXAM') {
        const updated = await testBuilderApi.updateTestStatus(shareModalTest.id, 'TEST_EXAM');
        setShareModalTest((prev) => (prev ? { ...prev, ...updated, status: updated?.status || 'TEST_EXAM' } : prev));
        setTests((prev) => prev.map((item) => (
          item.id === shareModalTest.id ? { ...item, ...updated, status: updated?.status || 'TEST_EXAM' } : item
        )));
        setShareModalStatus('TEST_EXAM');
      }

      await createOrRefreshPublicLink(false);
    } catch (err) {
      setShareError(err?.response?.data?.error || err?.message || 'Không thể chuyển sang Test Exam.');
    } finally {
      setShareLoading(false);
    }
  };

  const resolvePublicSkillForShare = async (test) => {
    let skill = resolvePublicSkill(test);
    if (skill) return skill;

    try {
      const fullTest = await testBuilderApi.loadFullTest(test.id);
      const fallbackSkills = extractIncludedSkills(fullTest);
      for (const supported of SUPPORTED_PUBLIC_SKILLS) {
        if (fallbackSkills.includes(supported)) return supported;
      }
    } catch (err) {
      console.warn('Không tải được chi tiết đề để xác định skill chia sẻ:', err);
    }

    return null;
  };

  const createOrRefreshPublicLink = async (refresh = false) => {
    if (!shareModalTest?.id) return;

    setShareLoading(true);
    setShareError('');
    try {
      const skill = await resolvePublicSkillForShare(shareModalTest);
      const pathSegment = skillToPathSegment(skill);
      if (!pathSegment) {
        throw new Error('Đề thi này chưa có kỹ năng hợp lệ để tạo link công khai.');
      }

      const generated = await testBuilderApi.generateShareLink(shareModalTest.id, skill, refresh);
      setShareData(generated);
      setShareModalSkill(skill);
    } catch (err) {
      setShareError(err?.response?.data?.error || err?.message || 'Không thể tạo link công khai.');
    } finally {
      setShareLoading(false);
    }
  };

  const deletePublicLink = async () => {
    if (!shareModalTest?.id) return;

    setShareLoading(true);
    setShareError('');
    try {
      const skill = await resolvePublicSkillForShare(shareModalTest);
      const pathSegment = skillToPathSegment(skill);
      if (!pathSegment) {
        throw new Error('Đề thi này chưa có kỹ năng hợp lệ để xóa link công khai.');
      }

      await testBuilderApi.deactivateShareLink(shareModalTest.id, skill);
      setShareData(null);
      setShareModalOpen(false);
    } catch (err) {
      setShareError(err?.response?.data?.error || err?.message || 'Không thể xóa link công khai.');
    } finally {
      setShareLoading(false);
    }
  };

  /* Client-side search filter */
  const filtered = tests.filter(t => {
    const title = (t.title ?? '').toLowerCase();
    if (!title.includes(search.toLowerCase())) return false;
    if (statusFilter && t?.status !== statusFilter) return false;
    if (!statusFilter && t?.status === 'DELETED') return false;
    return true;
  });

  const dashboardStats = {
    total: tests.length,
    published: tests.filter((test) => test.status === 'PUBLISHED').length,
    testExam: tests.filter((test) => test.status === 'TEST_EXAM').length,
    shareable: tests.filter((test) => ['PUBLISHED', 'TEST_EXAM'].includes(String(test.status || '').toUpperCase())).length,
    deleted: tests.filter((test) => test.status === 'DELETED').length,
  };

  return (
    <DashboardLayout>
      <div style={pageShellStyle}>

        {!hasPermission && (
          <div style={{ textAlign: 'center', padding: '40px', background: '#fff3cd', borderRadius: 12, marginBottom: 24 }}>
            <h2 style={{ color: '#856404', marginBottom: 12 }}>Không có quyền truy cập</h2>
            <p style={{ color: '#856404' }}>
              Trang này yêu cầu tài khoản có quyền <strong>TEACHER</strong>, <strong>MANAGER</strong> hoặc <strong>ADMIN</strong>.
            </p>
            <button onClick={() => window.location.href = '/login'}
              style={{ marginTop: 16, padding: '10px 24px', background: '#856404', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              Đăng nhập lại
            </button>
          </div>
        )}

        <div style={heroStyle}>
          <div>
            <div style={eyebrowStyle}>Teacher test hub</div>
            <h1 style={heroTitleStyle}>Quản lý đề thi hiện đại</h1>
            <p style={heroSubtitleStyle}>Theo dõi đề, đổi trạng thái, tạo link public và quản lý vòng đời bài thi từ một nơi.</p>
          </div>
          <div style={heroActionsStyle}>
            <button
              type="button"
              onClick={() => setStatus('DELETED')}
              style={statusPillStyle(statusFilter === 'DELETED', '#dc2626', '#fee2e2', '#fecaca')}
            >
              <Trash2 size={16} />
              Thùng rác
            </button>
            <button
              type="button"
              onClick={() => setStatus('')}
              style={statusPillStyle(!statusFilter, '#334155', '#fff', '#cbd5e1')}
            >
              <RefreshCw size={16} />
              Tất cả
            </button>
            <Link
              to="/teacher/tests/new"
              style={primaryCtaStyle}
            >
              <FilePlus size={16} />
              Tạo đề thi mới
            </Link>
          </div>
        </div>

        <div style={statsGridStyle}>
          <StatCard label="Tổng đề" value={dashboardStats.total} tone="#2563eb" hint="Tất cả đề đang quản lý" />
          <StatCard label="Đã phát hành" value={dashboardStats.published} tone="#16a34a" hint="Sẵn sàng cho học viên" />
          <StatCard label="Test Exam" value={dashboardStats.testExam} tone="#7c3aed" hint="Chỉ dùng cho link public" />
          <StatCard label="Sẵn sàng chia sẻ" value={dashboardStats.shareable} tone="#0f766e" hint="PUBLISHED + TEST_EXAM" />
        </div>

        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <div style={sectionLabelStyle}>Bộ lọc</div>
              <div style={panelTitleStyle}>Tìm nhanh đề thi cần chỉnh sửa</div>
            </div>
            <span style={countBadgeStyle}>{filtered.length} đề thi</span>
          </div>
          <div style={filterRowStyle}>
          {/* Search */}
          <div style={searchWrapStyle}>
            <Search size={15} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên đề thi..."
              style={searchInputStyle}
            />
          </div>

          {/* Status filter */}
          <div style={selectWrapStyle}>
            <select
              value={statusFilter}
              onChange={e => setStatus(e.target.value)}
              style={selectStyle}
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={13} color="#9ca3af" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={errorBannerStyle}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading ? (
          <div style={loadingStyle}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Đang tải...</span>
          </div>
        ) : filtered.length === 0 ? (
          /* ── Empty state ── */
          <div style={emptyStateStyle}>
            <FileText size={40} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              {search || statusFilter ? 'Không tìm thấy đề thi phù hợp' : 'Bạn chưa có đề thi nào'}
            </p>
            <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 24 }}>
              {search || statusFilter
                ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                : 'Hãy tạo đề thi đầu tiên của bạn ngay bây giờ'}
            </p>
            {!search && !statusFilter && (
              <Link to="/teacher/tests/new" style={primaryCtaStyle}>
                <FilePlus size={15} />
                Tạo đề thi đầu tiên
              </Link>
            )}
          </div>
        ) : (
          /* ── Test cards ── */
          <div style={listStackStyle}>
            {filtered.map(test => (
              <TestRow
                key={test.id}
                test={test}
                onEdit={() => navigate(`/teacher/tests/${test.id}/edit`)}
                onDelete={() => setDeleteTarget(test)}
                onCreatePublicLink={() => handleCreatePublicLink(test)}
                onVersions={() => setVersionModalTest(test)}
                onRestore={() => handleRestore(test)}
                canRestore={canRestoreTest(test)}
                actionLoading={actionLoadingId === test.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <ConfirmModal
          test={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <PublicShareLinkModal
        isOpen={shareModalOpen}
        onClose={() => {
          if (shareLoading) return;
          setShareModalOpen(false);
        }}
        onConfirm={() => createOrRefreshPublicLink(false)}
        onRefresh={() => createOrRefreshPublicLink(true)}
        onDelete={deletePublicLink}
        onPromoteAndCreate={promoteToTestExamAndShare}
        canSharePublicly={['PUBLISHED', 'TEST_EXAM'].includes(String(shareModalStatus || '').toUpperCase())}
        loading={shareLoading}
        error={shareError}
        shareData={shareData}
        testTitle={shareModalTest?.title}
        skillLabel={shareModalSkill}
        testStatus={shareModalStatus}
      />

      <VersionHistoryModal
        testId={versionModalTest?.id}
        isOpen={!!versionModalTest}
        onClose={() => setVersionModalTest(null)}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .share-badge { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:700; }
      `}</style>
    </DashboardLayout>
  );
}

/* ── TestRow ── */
function TestRow({ test, onEdit, onDelete, onCreatePublicLink, onVersions, onRestore, canRestore, actionLoading }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px',
        background: hovered ? '#f8fafc' : '#fff',
        border: '1px solid #e5e7eb', borderRadius: 10,
        boxShadow: hovered ? '0 2px 8px rgba(0,0,0,0.07)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 0.15s',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 8, flexShrink: 0,
        background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <FileText size={18} color="#2563eb" />
      </div>

      {/* Title + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 15, fontWeight: 600, color: '#111827', margin: 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {test.title || <em style={{ color: '#9ca3af' }}>Chưa đặt tên</em>}
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            {TYPE_LABELS[test.testType] ?? test.testType}
          </span>
          <span style={{ color: '#d1d5db', fontSize: 12 }}>·</span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            Tạo bởi: {test.createdByUsername || '—'}
          </span>
          <span style={{ color: '#d1d5db', fontSize: 12 }}>·</span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            Tạo ngày: {formatDate(test.createdAt)}
          </span>
          {test.updatedAt && test.updatedAt !== test.createdAt && (
            <>
              <span style={{ color: '#d1d5db', fontSize: 12 }}>·</span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                Cập nhật: {formatDate(test.updatedAt)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status badge */}
      <StatusBadge status={test.status} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {test.status === 'DELETED' ? (
          <ActionBtn
            icon={actionLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
            label="Khôi phục"
            onClick={onRestore}
            color="#0f766e"
            bgHover="#ecfeff"
            disabled={actionLoading || !canRestore}
          />
        ) : (
          <>
            <ActionBtn
              icon={<Pencil size={14} />}
              label="Chỉnh sửa"
              onClick={onEdit}
              color="#2563eb"
              bgHover="#eff6ff"
            />
            <ActionBtn
              icon={<Clock size={14} />}
              label="Versions"
              onClick={onVersions}
              color="#7c3aed"
              bgHover="#f3e8ff"
            />
            <ActionBtn
              icon={<LinkIcon size={14} />}
              label="Link công khai"
              onClick={onCreatePublicLink}
              color="#0f766e"
              bgHover="#ecfeff"
            />
            <ActionBtn
              icon={<Trash2 size={14} />}
              label="Thùng rác"
              onClick={onDelete}
              color="#dc2626"
              bgHover="#fef2f2"
            />
          </>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, color, bgHover, disabled = false }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      disabled={disabled}
      title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '6px 12px', borderRadius: 7, border: `1px solid ${h ? color : '#e5e7eb'}`,
        background: h ? bgHover : '#fff',
        color: h ? color : '#6b7280',
        fontSize: 12, fontWeight: 500, cursor: 'pointer',
        transition: 'all 0.15s',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ label, value, tone, hint }) {
  return (
    <div style={statCardStyle(tone)}>
      <div style={statValueStyle}>{value}</div>
      <div style={statLabelStyle}>{label}</div>
      <div style={statHintStyle}>{hint}</div>
    </div>
  );
}

const pageShellStyle = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '28px 24px 40px',
};

const heroStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 20,
  alignItems: 'flex-start',
  marginBottom: 18,
  padding: 22,
  borderRadius: 24,
  background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
  border: '1px solid #dbeafe',
  boxShadow: '0 18px 50px rgba(37, 99, 235, 0.08)',
};

const eyebrowStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 10px',
  borderRadius: 999,
  background: '#dbeafe',
  color: '#1d4ed8',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

const heroTitleStyle = {
  margin: '10px 0 0',
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: '-0.02em',
  color: '#0f172a',
};

const heroSubtitleStyle = {
  margin: '10px 0 0',
  maxWidth: 720,
  color: '#475569',
  fontSize: 14.5,
  lineHeight: 1.6,
};

const heroActionsStyle = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
};

const primaryCtaStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  borderRadius: 14,
  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  color: '#fff',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 700,
  boxShadow: '0 10px 24px rgba(37, 99, 235, 0.18)',
};

const statusPillStyle = (active, color, bg, borderColor) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  borderRadius: 14,
  background: bg,
  color,
  fontSize: 14,
  fontWeight: 700,
  border: `1px solid ${borderColor}`,
  cursor: 'pointer',
  boxShadow: active ? '0 8px 20px rgba(0,0,0,0.06)' : 'none',
});

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 12,
  marginBottom: 18,
};

const statCardStyle = (tone) => ({
  padding: 18,
  borderRadius: 18,
  background: '#fff',
  border: `1px solid ${tone}22`,
  boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)',
  position: 'relative',
  overflow: 'hidden',
});

const statValueStyle = {
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: '#0f172a',
};

const statLabelStyle = {
  marginTop: 4,
  fontSize: 13,
  fontWeight: 700,
  color: '#334155',
};

const statHintStyle = {
  marginTop: 4,
  fontSize: 12,
  color: '#64748b',
  lineHeight: 1.45,
};

const panelStyle = {
  padding: 16,
  borderRadius: 22,
  background: '#fff',
  border: '1px solid #e2e8f0',
  boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)',
  marginBottom: 16,
};

const panelHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  marginBottom: 12,
};

const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const panelTitleStyle = {
  fontSize: 16,
  fontWeight: 800,
  color: '#0f172a',
  marginTop: 4,
};

const countBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: 999,
  background: '#eff6ff',
  color: '#1d4ed8',
  fontSize: 12,
  fontWeight: 700,
};

const filterRowStyle = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'center',
};

const searchWrapStyle = {
  position: 'relative',
  flex: '1 1 260px',
  minWidth: 220,
};

const searchInputStyle = {
  width: '100%',
  padding: '12px 12px 12px 34px',
  border: '1px solid #dbe3ef',
  borderRadius: 14,
  fontSize: 13.5,
  outline: 'none',
  boxSizing: 'border-box',
  color: '#0f172a',
  background: '#f8fafc',
};

const selectWrapStyle = {
  position: 'relative',
};

const selectStyle = {
  padding: '12px 34px 12px 14px',
  border: '1px solid #dbe3ef',
  borderRadius: 14,
  fontSize: 13.5,
  color: '#0f172a',
  background: '#f8fafc',
  appearance: 'none',
  cursor: 'pointer',
  outline: 'none',
};

const errorBannerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '14px 16px',
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: 14,
  color: '#dc2626',
  fontSize: 14,
  marginBottom: 16,
};

const loadingStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '64px 0',
  gap: 10,
  color: '#64748b',
};

const emptyStateStyle = {
  textAlign: 'center',
  padding: '72px 24px',
  background: '#fff',
  borderRadius: 22,
  border: '1px dashed #cbd5e1',
  boxShadow: '0 12px 32px rgba(15, 23, 42, 0.04)',
};

const listStackStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};
