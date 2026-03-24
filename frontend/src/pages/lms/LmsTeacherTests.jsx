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

const TYPE_FILTERS = [
  { value: '', label: 'Tất cả loại đề' },
  { value: 'ACADEMIC', label: 'Academic' },
  { value: 'GENERAL', label: 'General Training' },
];

const DATE_SORT_OPTIONS = [
  { value: '', label: 'Không sắp xếp' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
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

const parseDateValue = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export default function LmsTeacherTests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [createdSort, setCreatedSort] = useState('');
  const [updatedSort, setUpdatedSort] = useState('');
  const [changingStatusId, setChangingStatusId] = useState(null);

  const fetchTests = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await testBuilderApi.getAllTests();
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
  }, []);

  const filteredTests = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = tests.filter((t) => {
      if (statusFilter && t?.status !== statusFilter) return false;
      if (typeFilter && t?.testType !== typeFilter) return false;

      if (!q) return true;

      const title = (t?.title || '').toLowerCase();
      const type = (TYPE_LABELS[t?.testType] || t?.testType || '').toLowerCase();
      return title.includes(q) || type.includes(q);
    });

    return [...matched].sort((a, b) => {
      const aCreated = parseDateValue(a?.createdAt);
      const bCreated = parseDateValue(b?.createdAt);
      const aUpdated = parseDateValue(a?.updatedAt);
      const bUpdated = parseDateValue(b?.updatedAt);

      const compareDates = (left, right, mode) => {
        if (!mode) return 0;
        const leftTime = left ? left.getTime() : 0;
        const rightTime = right ? right.getTime() : 0;
        if (mode === 'newest') return rightTime - leftTime;
        if (mode === 'oldest') return leftTime - rightTime;
        return 0;
      };

      const updatedCmp = compareDates(aUpdated, bUpdated, updatedSort);
      if (updatedCmp !== 0) return updatedCmp;

      const createdCmp = compareDates(aCreated, bCreated, createdSort);
      if (createdCmp !== 0) return createdCmp;

      return 0;
    });
  }, [tests, search, statusFilter, typeFilter, createdSort, updatedSort]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setCreatedSort('');
    setUpdatedSort('');
  };

  const handleCreatedSortChange = (value) => {
    setCreatedSort(value);
    if (value) setUpdatedSort('');
  };

  const handleUpdatedSortChange = (value) => {
    setUpdatedSort(value);
    if (value) setCreatedSort('');
  };

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
      <div className="lms-panel lms-tests-header-panel">
        <div className="lms-tests-header-row">
          <div>
            <h3 className="lms-panel-title">Dữ liệu đề thi hiện tại</h3>
            <p className="lms-subtitle">Hiển thị trực tiếp đề thi thật từ hệ thống, không chuyển sang trang quản lý cũ.</p>
          </div>
          <div className="lms-tests-header-actions">
            <Link to="/teacher/tests/new" className="lms-cta">
              <FilePlus size={14} /> Tạo đề mới
            </Link>
          </div>
        </div>
      </div>

      <div className="lms-panel lms-tests-filter-panel">
        <div className="lms-tests-filter-row">
          <div className="lms-tests-search-wrap">
            <Search size={14} className="lms-tests-search-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên đề thi hoặc loại đề..."
              className="lms-tests-search-input"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="lms-tests-select"
          >
            {TYPE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="lms-tests-select"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            value={createdSort}
            onChange={(e) => handleCreatedSortChange(e.target.value)}
            aria-label="Sắp xếp ngày tạo"
            className="lms-tests-select"
          >
            {DATE_SORT_OPTIONS.map((option) => (
              <option key={`created-${option.value || 'none'}`} value={option.value}>
                Ngày tạo: {option.label}
              </option>
            ))}
          </select>

          <select
            value={updatedSort}
            onChange={(e) => handleUpdatedSortChange(e.target.value)}
            aria-label="Ngày cập nhật"
            className="lms-tests-select"
          >
            {DATE_SORT_OPTIONS.map((option) => (
              <option key={`updated-${option.value || 'none'}`} value={option.value}>
                Ngày cập nhật: {option.label}
              </option>
            ))}
          </select>

          <button type="button" onClick={clearFilters} className="lms-cta ghost lms-tests-clear-btn">
            Xóa lọc
          </button>

          <button
            type="button"
            onClick={fetchTests}
            className="lms-cta ghost lms-tests-refresh-btn"
            title="Làm mới"
            aria-label="Làm mới"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="lms-panel lms-tests-error-panel">
          <div className="lms-tests-error-row">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="lms-panel">
        {loading ? (
          <div className="lms-tests-loading-row">
            <Loader2 size={16} className="lms-spin" />
            Đang tải đề thi...
          </div>
        ) : filteredTests.length === 0 ? (
          <p className="lms-subtitle lms-tests-empty-text">Không có đề thi phù hợp với bộ lọc hiện tại.</p>
        ) : (
          <div className="lms-tests-table-wrap">
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
                        className="lms-tests-status-select"
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
          </div>
        )}
      </div>
    </LmsLayout>
  );
}
