import React, { useEffect, useMemo, useState } from 'react';
import { FilePlus, Pencil, Search, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import LmsLayout from '../../components/lms/LmsLayout';
import { testBuilderApi } from '../../services/testBuilderApi';

const STATUS_LABELS = {
  DRAFT: 'Bản nháp',
  REVIEWING: 'Đang duyệt',
  PUBLISHED: 'Đã phát hành',
  ARCHIVED: 'Lưu trữ',
};

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Bản nháp' },
  { value: 'REVIEWING', label: 'Đang duyệt' },
  { value: 'PUBLISHED', label: 'Đã phát hành' },
  { value: 'ARCHIVED', label: 'Lưu trữ' },
];

const TYPE_LABELS = {
  ACADEMIC: 'Academic',
  GENERAL: 'General Training',
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const normalizeTests = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function LmsTeacherTests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [changingStatusId, setChangingStatusId] = useState(null);

  const fetchTests = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await testBuilderApi.getAllTests(statusFilter || undefined);
      setTests(normalizeTests(payload));
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu đề thi hiện tại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, [statusFilter]);

  const filteredTests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tests;

    return tests.filter((t) => {
      const title = (t?.title || '').toLowerCase();
      const type = (TYPE_LABELS[t?.testType] || t?.testType || '').toLowerCase();
      return title.includes(q) || type.includes(q);
    });
  }, [tests, search]);

  const statusClassName = (status) => {
    if (status === 'PUBLISHED') return 'success';
    if (status === 'REVIEWING') return 'warn';
    return 'neutral';
  };

  const handleChangeStatus = async (testId, newStatus) => {
    if (!newStatus) return;

    setChangingStatusId(testId);
    setError('');
    try {
      const updated = await testBuilderApi.updateTestStatus(testId, newStatus);
      setTests((prev) => prev.map((t) => (t.id === testId ? { ...t, ...updated, status: updated?.status || newStatus } : t)));
    } catch (err) {
      console.error(err);
      setError('Không thể cập nhật trạng thái đề thi. Vui lòng thử lại.');
    } finally {
      setChangingStatusId(null);
    }
  };

  return (
    <LmsLayout title="Thư viện đề thi" subtitle="Tạo mới, phát hành và theo dõi hiệu quả bài thi">
      <div className="lms-panel" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <h3 className="lms-panel-title">Dữ liệu đề thi hiện tại</h3>
            <p className="lms-subtitle">Hiển thị trực tiếp đề thi thật từ hệ thống, không chuyển sang trang quản lý cũ.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/teacher/tests/new" className="lms-cta">
              <FilePlus size={14} /> Tạo đề mới
            </Link>
          </div>
        </div>
      </div>

      <div className="lms-panel" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên đề thi hoặc loại đề..."
              style={{
                width: '100%',
                height: 36,
                borderRadius: 10,
                border: '1px solid var(--lms-border)',
                padding: '0 12px 0 34px',
                background: '#fff',
                color: '#1e293b',
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: 36,
              borderRadius: 10,
              border: '1px solid var(--lms-border)',
              padding: '0 10px',
              background: '#fff',
              color: '#1e293b',
            }}
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <button type="button" onClick={fetchTests} className="lms-cta ghost">
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="lms-panel" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="lms-panel">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            Đang tải đề thi...
          </div>
        ) : filteredTests.length === 0 ? (
          <p className="lms-subtitle" style={{ margin: 0 }}>Không có đề thi phù hợp với bộ lọc hiện tại.</p>
        ) : (
          <table className="lms-table">
            <thead>
              <tr>
                <th>Đề thi</th>
                <th>Loại</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Cập nhật</th>
                <th>Đổi trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredTests.map((test) => (
                <tr key={test.id}>
                  <td>{test.title || 'Chưa đặt tên'}</td>
                  <td>{TYPE_LABELS[test.testType] || test.testType || '—'}</td>
                  <td>
                    <span className={`lms-pill ${statusClassName(test.status)}`}>
                      {STATUS_LABELS[test.status] || test.status || 'Không rõ'}
                    </span>
                  </td>
                  <td>{formatDate(test.createdAt)}</td>
                  <td>{formatDate(test.updatedAt)}</td>
                  <td>
                    <select
                      value={test.status || 'DRAFT'}
                      onChange={(e) => handleChangeStatus(test.id, e.target.value)}
                      disabled={changingStatusId === test.id}
                      style={{
                        height: 32,
                        borderRadius: 8,
                        border: '1px solid var(--lms-border)',
                        padding: '0 8px',
                        background: '#fff',
                        color: '#1e293b',
                      }}
                    >
                      {STATUS_FILTERS.filter((s) => s.value).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <Link to={`/teacher/tests/${test.id}/edit`} className="lms-cta ghost">
                      <Pencil size={14} /> Chỉnh sửa
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </LmsLayout>
  );
}
