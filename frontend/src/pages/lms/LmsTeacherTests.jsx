import React, { useEffect, useMemo, useState } from 'react';
import { FilePlus, Pencil, Search, AlertCircle, Loader2, RefreshCw, Shuffle } from 'lucide-react';
import { Link } from 'react-router-dom';
import LmsLayout from '../../components/lms/LmsLayout';
import ShuffleTestModal from '../../components/shuffle/ShuffleTestModal';
import { testBuilderApi } from '../../services/testBuilderApi';
import { API_CONFIG } from '../../config/api';

const SKILL_FILTERS = [
  { value: '', label: 'Tất cả kỹ năng' },
  { value: 'LISTENING', label: 'Listening' },
  { value: 'READING', label: 'Reading' },
  { value: 'WRITING', label: 'Writing' },
  { value: 'SPEAKING', label: 'Speaking' },
];

const BAND_FILTERS = [
  { value: '', label: 'Tất cả band' },
  { value: '5.0', label: '5.0' },
  { value: '5.5', label: '5.5' },
  { value: '6.0', label: '6.0' },
  { value: '6.5', label: '6.5' },
  { value: '7.0', label: '7.0' },
  { value: '7.5', label: '7.5' },
  { value: '8.0', label: '8.0+' },
];

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
  const [skillFilter, setSkillFilter] = useState('');
  const [bandFilter, setBandFilter] = useState('');
  const [isFullTestFilter, setIsFullTestFilter] = useState('');
  const [minDuration, setMinDuration] = useState('');
  const [maxDuration, setMaxDuration] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [createdById, setCreatedById] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [createdSort, setCreatedSort] = useState('');
  const [updatedSort, setUpdatedSort] = useState('');
  const [changingStatusId, setChangingStatusId] = useState(null);
  const [showShuffleModal, setShowShuffleModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    pageSize: 20,
  });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Fetch teachers for filter (disabled - requires MANAGER/ADMIN role)
  // useEffect(() => {
  //   const fetchTeachers = async () => {
  //     try {
  //       const res = await fetch(`${API_CONFIG.BASE_URL}/users/role/TEACHER`, {
  //         headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
  //       });
  //       console.log('Teachers API response status:', res.status);
  //       if (res.ok) {
  //         const data = await res.json();
  //         console.log('Teachers data:', data);
  //         setTeachers(data);
  //       } else {
  //         console.error('Teachers API failed:', res.status, await res.text());
  //       }
  //     } catch (err) {
  //       console.error('Failed to fetch teachers:', err);
  //     }
  //   };
  //   fetchTeachers();
  // }, []);

  const fetchTests = async () => {
    setLoading(true);
    setError('');
    try {
      // Build filter criteria
      const filter = {
        search: search.trim() || undefined,
        testType: typeFilter || undefined,
        status: statusFilter || undefined,
        skillType: skillFilter || undefined,
        targetBand: bandFilter || undefined,
        isFullTest: isFullTestFilter === '' ? undefined : isFullTestFilter === 'true',
        minDuration: minDuration ? parseInt(minDuration) : undefined,
        maxDuration: maxDuration ? parseInt(maxDuration) : undefined,
        createdById: createdById ? parseInt(createdById) : undefined,
        createdFrom: createdFrom ? new Date(createdFrom).toISOString() : undefined,
        createdTo: createdTo ? new Date(createdTo + 'T23:59:59').toISOString() : undefined,
        page: pagination.currentPage,
        size: pagination.pageSize,
      };

      // Determine sort
      if (updatedSort) {
        filter.sortBy = 'updatedAt';
        filter.sortOrder = updatedSort === 'newest' ? 'DESC' : 'ASC';
      } else if (createdSort) {
        filter.sortBy = 'createdAt';
        filter.sortOrder = createdSort === 'newest' ? 'DESC' : 'ASC';
      }

      console.log('🔍 Filter request:', filter);
      
      try {
        const response = await testBuilderApi.filterTests(filter);
        console.log('✅ Filter response:', response);
        
        setTests(normalizeTests(response));
        setPagination({
          currentPage: response.currentPage || 0,
          totalPages: response.totalPages || 0,
          totalElements: response.totalElements || 0,
          pageSize: response.pageSize || 20,
        });
      } catch (filterErr) {
        // Fallback to old API if filter fails
        console.warn('⚠️ Filter API failed, using getAllTests fallback:', filterErr);
        const payload = await testBuilderApi.getAllTests(statusFilter);
        setTests(normalizeTests(payload));
        setPagination({
          currentPage: 0,
          totalPages: 1,
          totalElements: normalizeTests(payload).length,
          pageSize: 20,
        });
      }
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError('Không thể tải dữ liệu đề thi hiện tại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTests();
    }, search ? 500 : 0); // Debounce 500ms cho search

    return () => clearTimeout(timer);
  }, [search, statusFilter, typeFilter, skillFilter, bandFilter, isFullTestFilter, minDuration, maxDuration, createdById, createdFrom, createdTo, createdSort, updatedSort, pagination.currentPage]);

  const filteredTests = useMemo(() => {
    // If using fallback API, apply client-side filtering
    if (pagination.totalPages === 1 && tests.length > 0) {
      const q = search.trim().toLowerCase();
      return tests.filter((t) => {
        if (typeFilter && t?.testType !== typeFilter) return false;
        if (!q) return true;
        const title = (t?.title || '').toLowerCase();
        const type = (TYPE_LABELS[t?.testType] || t?.testType || '').toLowerCase();
        return title.includes(q) || type.includes(q);
      }).sort((a, b) => {
        const aDate = parseDateValue(updatedSort ? a?.updatedAt : a?.createdAt);
        const bDate = parseDateValue(updatedSort ? b?.updatedAt : b?.createdAt);
        if (!aDate || !bDate) return 0;
        const sortMode = updatedSort || createdSort;
        if (sortMode === 'newest') return bDate.getTime() - aDate.getTime();
        if (sortMode === 'oldest') return aDate.getTime() - bDate.getTime();
        return 0;
      });
    }
    return tests;
  }, [tests, search, typeFilter, updatedSort, createdSort, pagination.totalPages]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setSkillFilter('');
    setBandFilter('');
    setIsFullTestFilter('');
    setMinDuration('');
    setMaxDuration('');
    setCreatedById('');
    setCreatedFrom('');
    setCreatedTo('');
    setCreatedSort('');
    setUpdatedSort('');
    setPagination(prev => ({ ...prev, currentPage: 0 }));
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

  const handleShuffleSuccess = (newTest) => {
    setShowShuffleModal(false);
    fetchTests();
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
            <button onClick={() => setShowShuffleModal(true)} className="lms-cta ghost">
              <Shuffle size={14} /> Trộn đề
            </button>
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

          <button 
            type="button" 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} 
            className="lms-cta ghost"
          >
            {showAdvancedFilters ? 'Ẩn nâng cao' : 'Lọc nâng cao'}
          </button>

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

        {showAdvancedFilters && (
          <div className="lms-tests-filter-row" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="lms-tests-select"
            >
              {SKILL_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={bandFilter}
              onChange={(e) => setBandFilter(e.target.value)}
              className="lms-tests-select"
            >
              {BAND_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={isFullTestFilter}
              onChange={(e) => setIsFullTestFilter(e.target.value)}
              className="lms-tests-select"
            >
              <option value="">Tất cả loại</option>
              <option value="true">Full Test</option>
              <option value="false">Single Skill</option>
            </select>

            {/* Temporarily disabled - requires MANAGER/ADMIN role on production
            <select
              value={createdById}
              onChange={(e) => setCreatedById(e.target.value)}
              className="lms-tests-select"
            >
              <option value="">Tất cả giáo viên</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.fullName || t.username}</option>
              ))}
            </select>
            */}

            <input
              type="number"
              value={minDuration}
              onChange={(e) => setMinDuration(e.target.value)}
              placeholder="Thời gian min (phút)"
              className="lms-tests-search-input"
              style={{ width: '150px' }}
            />

            <input
              type="number"
              value={maxDuration}
              onChange={(e) => setMaxDuration(e.target.value)}
              placeholder="Thời gian max (phút)"
              className="lms-tests-search-input"
              style={{ width: '150px' }}
            />

            <input
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
              className="lms-tests-search-input"
              style={{ width: '150px' }}
              title="Từ ngày"
            />

            <input
              type="date"
              value={createdTo}
              onChange={(e) => setCreatedTo(e.target.value)}
              className="lms-tests-search-input"
              style={{ width: '150px' }}
              title="Đến ngày"
            />
          </div>
        )}
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
          <>
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
            
            {pagination.totalPages > 1 && (
              <div className="lms-tests-pagination">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  disabled={pagination.currentPage === 0}
                  className="lms-cta ghost"
                >
                  Trước
                </button>
                <span className="lms-tests-pagination-info">
                  Trang {pagination.currentPage + 1} / {pagination.totalPages} 
                  ({pagination.totalElements} đề thi)
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                  disabled={pagination.currentPage >= pagination.totalPages - 1}
                  className="lms-cta ghost"
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ShuffleTestModal
        isOpen={showShuffleModal}
        onClose={() => setShowShuffleModal(false)}
        onSuccess={handleShuffleSuccess}
        currentUser={currentUser}
      />
    </LmsLayout>
  );
}
