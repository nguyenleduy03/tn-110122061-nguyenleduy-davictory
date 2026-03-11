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
  FileText,
  Clock,
  CheckCircle2,
  Archive,
  Eye,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { testBuilderApi } from '../services/testBuilderApi';

/* ── Status config ── */
const STATUS_CONFIG = {
  DRAFT:      { label: 'Nháp',             icon: FileText,     color: '#6b7280', bg: '#f3f4f6' },
  REVIEWING:  { label: 'Đang kiểm duyệt',  icon: Clock,        color: '#d97706', bg: '#fef3c7' },
  PUBLISHED:  { label: 'Đã xuất bản',      icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7' },
  ARCHIVED:   { label: 'Lưu trữ',          icon: Archive,      color: '#9ca3af', bg: '#f3f4f6' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
];

const TYPE_LABELS = { ACADEMIC: 'Academic', GENERAL: 'General Training' };

/* ── Helpers ── */
const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
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
              Xóa đề thi?
            </p>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              Đề thi <strong>"{test.title || 'Không tên'}"</strong> sẽ bị xóa vĩnh viễn.
              Hành động này không thể hoàn tác.
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
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function TeacherTests() {
  const navigate = useNavigate();

  const [tests, setTests]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // test to confirm delete
  const [deleting, setDeleting]     = useState(false);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await testBuilderApi.getAllTests(statusFilter || undefined);
      setTests(Array.isArray(data) ? data : (data.content ?? []));
    } catch (err) {
      setError('Không thể tải danh sách đề thi. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await testBuilderApi.deleteTest(deleteTarget.id);
      setTests(prev => prev.filter(t => t.id !== deleteTarget.id));
    } catch (err) {
      setError('Xóa đề thi thất bại. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  /* Client-side search filter */
  const filtered = tests.filter(t => {
    const title = (t.title ?? '').toLowerCase();
    return title.includes(search.toLowerCase());
  });

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        {/* ── Page title row ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Đề thi của tôi</h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Quản lý và chỉnh sửa các đề thi bạn đã tạo</p>
          </div>
          <Link
            to="/teacher/tests/new"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 18px', borderRadius: 8,
              background: '#2563eb', color: '#fff', textDecoration: 'none',
              fontSize: 14, fontWeight: 600, boxShadow: '0 1px 4px rgba(37,99,235,0.3)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
            onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
          >
            <FilePlus size={16} />
            Tạo đề thi mới
          </Link>
        </div>

        {/* ── Filters bar ── */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center',
          background: '#fff', padding: '14px 16px', borderRadius: 10,
          border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
            <Search size={15} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên đề thi..."
              style={{
                width: '100%', padding: '7px 12px 7px 32px',
                border: '1px solid #d1d5db', borderRadius: 7,
                fontSize: 13, outline: 'none', boxSizing: 'border-box',
                color: '#374151', background: '#f9fafb',
              }}
            />
          </div>

          {/* Status filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={statusFilter}
              onChange={e => setStatus(e.target.value)}
              style={{
                padding: '7px 30px 7px 12px', border: '1px solid #d1d5db', borderRadius: 7,
                fontSize: 13, color: '#374151', background: '#f9fafb',
                appearance: 'none', cursor: 'pointer', outline: 'none',
              }}
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={13} color="#9ca3af" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 'auto' }}>
            {filtered.length} đề thi
          </span>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
            color: '#dc2626', fontSize: 14, marginBottom: 16,
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 10, color: '#6b7280' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Đang tải...</span>
          </div>
        ) : filtered.length === 0 ? (
          /* ── Empty state ── */
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: '#fff', borderRadius: 12, border: '1px dashed #d1d5db',
          }}>
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
              <Link
                to="/teacher/tests/new"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '9px 20px', borderRadius: 8,
                  background: '#2563eb', color: '#fff', textDecoration: 'none',
                  fontSize: 14, fontWeight: 600,
                }}
              >
                <FilePlus size={15} />
                Tạo đề thi đầu tiên
              </Link>
            )}
          </div>
        ) : (
          /* ── Test cards ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(test => (
              <TestRow
                key={test.id}
                test={test}
                onEdit={() => navigate(`/teacher/tests/${test.id}/edit`)}
                onDelete={() => setDeleteTarget(test)}
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

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}

/* ── TestRow ── */
function TestRow({ test, onEdit, onDelete }) {
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
        <ActionBtn
          icon={<Pencil size={14} />}
          label="Chỉnh sửa"
          onClick={onEdit}
          color="#2563eb"
          bgHover="#eff6ff"
        />
        <ActionBtn
          icon={<Trash2 size={14} />}
          label="Xóa"
          onClick={onDelete}
          color="#dc2626"
          bgHover="#fef2f2"
        />
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, color, bgHover }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '6px 12px', borderRadius: 7, border: `1px solid ${h ? color : '#e5e7eb'}`,
        background: h ? bgHover : '#fff',
        color: h ? color : '#6b7280',
        fontSize: 12, fontWeight: 500, cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
