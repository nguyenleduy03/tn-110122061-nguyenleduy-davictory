import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FilePlus, Pencil, Search, AlertCircle, Loader2, RefreshCw, Shuffle, Copy, Trash2,
  MoreVertical, Link as LinkIcon, FileText, Clock, Users, School, CheckCircle2, ChevronDown, Filter, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import ShuffleTestModal from '../components/shuffle/ShuffleTestModal';
import PublicShareLinkModal from '../components/common/PublicShareLinkModal';
import VersionHistoryModal from '../components/common/VersionHistoryModal';
import { testBuilderApi } from '../services/testBuilderApi';
import { API_CONFIG } from '../config/api';
import { authApi } from '../services/authApi';
import { buildSavePayload, parseLoadedTest } from '../services/testBuilderApi';

const SKILL_FILTERS = [
  { value: '', label: 'Tất cả kỹ năng' },
  { value: 'LISTENING', label: 'Listening' },
  { value: 'READING', label: 'Reading' },
  { value: 'WRITING', label: 'Writing' },
  { value: 'SPEAKING', label: 'Speaking' },
];

const BAND_FILTERS = [
  { value: '', label: 'Tất cả band' },
  { value: '5.0', label: '5.0' }, { value: '5.5', label: '5.5' },
  { value: '6.0', label: '6.0' }, { value: '6.5', label: '6.5' },
  { value: '7.0', label: '7.0' }, { value: '7.5', label: '7.5' },
  { value: '8.0', label: '8.0+' },
];

const STATUS_LABELS = {
  DRAFT: 'Bản nháp', REVIEWING: 'Đang duyệt', TEST_EXAM: 'Test Exam',
  PUBLISHED: 'Đã phát hành', ARCHIVED: 'Lưu trữ', DELETED: 'Thùng rác',
};

const TABS = [
  { value: '', label: 'Tất cả đề' },
  { value: 'PUBLISHED', label: 'Đã phát hành' },
  { value: 'REVIEWING', label: 'Đang duyệt' },
  { value: 'DRAFT', label: 'Bản nháp' },
  { value: 'TEST_EXAM', label: 'Test Exam' },
  { value: 'DELETED', label: 'Thùng rác' },
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

const TYPE_LABELS = { ACADEMIC: 'Academic', GENERAL: 'General Training' };

const formatDate = (value) => {
  if (!value) return 'Chưa rõ';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Chưa rõ';
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return 'Chưa rõ'; }
};

const normalizeTests = (payload) => {
  let tests = [];
  if (Array.isArray(payload)) tests = payload;
  else if (Array.isArray(payload?.content)) tests = payload.content;
  else if (Array.isArray(payload?.data)) tests = payload.data;
  return tests.map(test => ({
    ...test,
    createdAt: test.createdAt || test.created_at,
    updatedAt: test.updatedAt || test.updated_at,
    testType: test.testType || test.test_type,
    isFullTest: test.isFullTest ?? test.is_full_test,
    durationMinutes: test.durationMinutes ?? test.duration_minutes,
    targetBand: test.targetBand || test.target_band,
  }));
};

const parseDateValue = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const SUPPORTED_PUBLIC_SKILLS = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];

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
    case 'LISTENING': return 'listening';
    case 'READING': return 'reading';
    case 'WRITING': return 'writing';
    case 'SPEAKING': return 'speaking';
    default: return null;
  }
};

export default function AdminTests() {
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
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [showShuffleModal, setShowShuffleModal] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalTest, setShareModalTest] = useState(null);
  const [shareModalSkill, setShareModalSkill] = useState('');
  const [shareModalStatus, setShareModalStatus] = useState('');
  const [shareData, setShareData] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');
  const [versionModalTest, setVersionModalTest] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const actionMenuRef = useRef(null);
  const [pagination, setPagination] = useState({
    currentPage: 0, totalPages: 0, totalElements: 0, pageSize: 20,
  });

  const currentUser = authApi.getStoredUser() || {};
  const isAdmin = authApi.hasRole('ADMIN');
  const canRestoreTest = (test) => isAdmin || String(test?.createdByUsername || '') === String(currentUser?.username || '');

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${API_CONFIG.BASE_URL}/users/role/TEACHER`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTeachers(data);
        }
      } catch (err) {
        console.error('Failed to fetch teachers:', err);
      }
    };
    fetchTeachers();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    setError('');
    try {
      if (!isAdmin) {
        const mine = await testBuilderApi.getMyTests(statusFilter || undefined);
        setTests(normalizeTests(mine));
        setPagination({ currentPage: 0, totalPages: 1, totalElements: normalizeTests(mine).length, pageSize: 20 });
        return;
      }

      const filter = {
        search: search.trim() || undefined,
        testType: typeFilter || undefined,
        status: statusFilter || null,
        skillType: skillFilter || undefined,
        targetBand: bandFilter || undefined,
        isFullTest: isFullTestFilter === '' ? undefined : isFullTestFilter === 'true',
        minDuration: minDuration ? parseInt(minDuration) : undefined,
        maxDuration: maxDuration ? parseInt(maxDuration) : undefined,
        createdById: createdById ? parseInt(createdById) : undefined,
        createdFrom: createdFrom ? new Date(createdFrom + 'T00:00:00').toISOString() : undefined,
        createdTo: createdTo ? new Date(createdTo + 'T23:59:59.999').toISOString() : undefined,
        page: pagination.currentPage,
        size: pagination.pageSize,
      };

      if (updatedSort) {
        filter.sortBy = 'updatedAt';
        filter.sortOrder = updatedSort === 'newest' ? 'DESC' : 'ASC';
      } else if (createdSort) {
        filter.sortBy = 'createdAt';
        filter.sortOrder = createdSort === 'newest' ? 'DESC' : 'ASC';
      }

      try {
        const response = await testBuilderApi.filterTests(filter);
        setTests(normalizeTests(response));
        setPagination({
          currentPage: response.currentPage || 0,
          totalPages: response.totalPages || 0,
          totalElements: response.totalElements || 0,
          pageSize: response.pageSize || 20,
        });
      } catch (filterErr) {
        console.warn('Filter API failed, using getAllTests fallback:', filterErr);
        const payload = await testBuilderApi.getAllTests(statusFilter);
        setTests(normalizeTests(payload));
        setPagination({ currentPage: 0, totalPages: 1, totalElements: normalizeTests(payload).length, pageSize: 20 });
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Không thể tải dữ liệu đề thi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 0 }));
  }, [search, statusFilter, typeFilter, skillFilter, bandFilter, isFullTestFilter,
      minDuration, maxDuration, createdById, createdFrom, createdTo, createdSort, updatedSort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTests();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, statusFilter, typeFilter, skillFilter, bandFilter, isFullTestFilter,
      minDuration, maxDuration, createdById, createdFrom, createdTo, createdSort,
      updatedSort, pagination.currentPage]);

  const filteredTests = useMemo(() => {
    if (pagination.totalPages > 1 || (pagination.totalPages === 1 && pagination.totalElements > 0)) {
      return tests;
    }
    const q = search.trim().toLowerCase();
    return tests.filter((t) => {
      if (typeFilter && t?.testType !== typeFilter) return false;
      if (statusFilter && t?.status !== statusFilter) return false;
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
  }, [tests, search, typeFilter, statusFilter, updatedSort, createdSort,
      pagination.totalPages, pagination.totalElements]);

  // Dynamic stats calculated from local loaded tests
  const statsSummary = useMemo(() => {
    return {
      total: tests.length,
      published: tests.filter(t => t.status === 'PUBLISHED').length,
      reviewing: tests.filter(t => t.status === 'REVIEWING').length,
      draft: tests.filter(t => t.status === 'DRAFT').length
    };
  }, [tests]);

  const clearFilters = () => {
    setSearch(''); setStatusFilter(''); setTypeFilter(''); setSkillFilter('');
    setBandFilter(''); setIsFullTestFilter(''); setMinDuration(''); setMaxDuration('');
    setCreatedFrom(''); setCreatedTo(''); setCreatedById(''); setCreatedSort(''); setUpdatedSort('');
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
    if (status === 'TEST_EXAM') return 'success';
    if (status === 'REVIEWING') return 'warn';
    if (status === 'DRAFT') return 'neutral';
    if (status === 'ARCHIVED') return 'neutral';
    if (status === 'PUBLISHED') return 'success';
    if (status === 'DELETED') return 'danger';
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
      setError('Không thể cập nhật trạng thái đề thi.');
    } finally {
      setChangingStatusId(null);
    }
  };

  const handleDuplicateTest = async (test) => {
    if (!test?.id) return;
    setActionLoadingId(test.id);
    setError('');
    try {
      const loaded = await testBuilderApi.loadFullTest(test.id);
      const { test: loadedTest, sessions } = parseLoadedTest(loaded);
      const structure = await testBuilderApi.getStructure(loadedTest.testType || test.testType || 'ACADEMIC');
      const userId = Number(authApi.getStoredUser()?.id);
      const duplicatedSessions = Object.fromEntries(
        Object.entries(sessions).map(([skillKey, parts]) => [
          skillKey,
          (parts || []).map((part) => ({
            ...part,
            questionGroups: (part.questionGroups || []).map((group) => ({
              ...group, backendGroupId: null, backendTestQGId: null,
              questions: (group.questions || []).map((question) => ({ ...question, backendQuestionId: null })),
            })),
          })),
        ])
      );
      if (!Number.isFinite(userId)) throw new Error('Không xác định được người dùng');
      const payload = buildSavePayload(
        { ...loadedTest, title: `${loadedTest.title || test.title || 'Đề thi'} (bản sao)` },
        duplicatedSessions, structure, userId, null, loadedTest.sessionDurations,
      );
      await testBuilderApi.saveFullTest(payload);
      await fetchTests();
    } catch (err) {
      console.error(err);
      setError('Nhân bản đề thi thất bại.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMoveToTrash = async (test) => {
    if (!test?.id) return;
    if (!window.confirm(`Đưa đề thi "${test.title || 'Không tên'}" vào thùng rác?`)) return;
    setActionLoadingId(test.id);
    setError('');
    try {
      await testBuilderApi.deleteTest(test.id);
      await fetchTests();
    } catch (err) {
      console.error(err);
      setError('Đưa vào thùng rác thất bại.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestoreTest = async (test) => {
    if (!test?.id) return;
    if (!canRestoreTest(test)) {
      setError('Chỉ người tạo hoặc admin mới có thể khôi phục.');
      return;
    }
    setActionLoadingId(test.id);
    setError('');
    try {
      await testBuilderApi.restoreTest(test.id);
      await fetchTests();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || 'Khôi phục thất bại.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePermanentDelete = async (test) => {
    if (!test?.id) return;
    if (!window.confirm(`Xóa vĩnh viễn đề thi "${test.title || 'Không tên'}"? Hành động này không thể hoàn tác.`)) return;
    setActionLoadingId(test.id);
    setError('');
    try {
      await testBuilderApi.permanentlyDeleteTest(test.id);
      await fetchTests();
    } catch (err) {
      console.error(err);
      setError('Xóa vĩnh viễn thất bại.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleShuffleSuccess = () => {
    setShowShuffleModal(false);
    fetchTests();
  };

  const handleCreatePublicLink = async (test) => {
    if (!test?.id) return;
    setShareModalTest(test);
    setShareModalStatus(test?.status || '');
    setShareModalOpen(true);
    setShareData(null);
    setShareError('');
    const isShareable = ['PUBLISHED', 'TEST_EXAM'].includes(String(test?.status || '').toUpperCase());
    if (!isShareable) { setShareLoading(false); return; }
    setShareLoading(true);
    try {
      const skill = await resolvePublicSkillForShare(test);
      const pathSegment = skillToPathSegment(skill);
      if (!pathSegment) { setShareModalSkill(''); setShareLoading(false); return; }
      const currentShare = await testBuilderApi.getCurrentShareLink(test.id, skill);
      if (currentShare?.exists) { setShareData(currentShare); setShareModalSkill(skill); }
      else { setShareModalSkill(skill); }
    } catch (err) {
      setShareError(err?.response?.data?.error || err?.message || 'Không thể kiểm tra link.');
    } finally { setShareLoading(false); }
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
    } finally { setShareLoading(false); }
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
    } catch { /* ignore */ }
    return null;
  };

  const createOrRefreshPublicLink = async (refresh = false) => {
    if (!shareModalTest?.id) return;
    setShareLoading(true);
    setShareError('');
    try {
      const skill = await resolvePublicSkillForShare(shareModalTest);
      const pathSegment = skillToPathSegment(skill);
      if (!pathSegment) throw new Error('Đề thi này chưa có kỹ năng hợp lệ.');
      const generated = await testBuilderApi.generateShareLink(shareModalTest.id, skill, refresh);
      setShareData(generated);
      setShareModalSkill(skill);
    } catch (err) {
      setShareError(err?.response?.data?.error || err?.message || 'Không thể tạo link.');
    } finally { setShareLoading(false); }
  };

  const deletePublicLink = async () => {
    if (!shareModalTest?.id) return;
    setShareLoading(true);
    setShareError('');
    try {
      const skill = await resolvePublicSkillForShare(shareModalTest);
      await testBuilderApi.deactivateShareLink(shareModalTest.id, skill);
      setShareData(null);
      setShareModalOpen(false);
    } catch (err) {
      setShareError(err?.response?.data?.error || err?.message || 'Không thể xóa link.');
    } finally { setShareLoading(false); }
  };

  useEffect(() => {
    if (!openActionMenuId) return;
    const handleMouseDown = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionMenuId(null);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpenActionMenuId(null);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openActionMenuId]);

  return (
    <AdminLayout title="Quản lý đề thi" subtitle="Quản lý đề thi toàn hệ thống">
      {/* 3 Stats Card Row */}
      <section className="admin-dashboard-stats-grid" style={{ marginBottom: 24 }}>
        <div className="admin-stat-card-new">
          <div className="admin-stat-card-left">
            <span className="admin-stat-card-label">Tổng số đề thi</span>
            <span className="admin-stat-card-value">{(pagination.totalElements || statsSummary.total).toLocaleString()}</span>
            <span className="admin-stat-card-trend" style={{ color: '#4f46e5' }}>Đề trong danh sách lọc</span>
          </div>
          <div className="admin-stat-card-icon-wrap blue">
            <FileText size={22} />
          </div>
        </div>

        <div className="admin-stat-card-new">
          <div className="admin-stat-card-left">
            <span className="admin-stat-card-label">Đề đã phát hành</span>
            <span className="admin-stat-card-value">{statsSummary.published.toLocaleString()}</span>
            <span className="admin-stat-card-trend" style={{ color: '#10b981' }}>Học viên có thể thi</span>
          </div>
          <div className="admin-stat-card-icon-wrap green">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="admin-stat-card-new">
          <div className="admin-stat-card-left">
            <span className="admin-stat-card-label">Đề thi chờ duyệt</span>
            <span className="admin-stat-card-value">{statsSummary.reviewing.toLocaleString()}</span>
            <span className="admin-stat-card-trend" style={{ color: '#f59e0b' }}>Yêu cầu xem xét</span>
          </div>
          <div className="admin-stat-card-icon-wrap orange">
            <Clock size={22} />
          </div>
        </div>
      </section>

      {/* Horizontal Tabs to match Mockup */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '20px',
        background: '#ffffff',
        borderRadius: '16px',
        padding: '10px 20px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)'
      }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          {TABS.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.label}
                onClick={() => setStatusFilter(tab.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '12px 4px',
                  fontSize: '14px',
                  fontWeight: active ? '600' : '500',
                  color: active ? '#4f46e5' : '#64748b',
                  borderBottom: active ? '2.5px solid #4f46e5' : '2.5px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                  outline: 'none'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowShuffleModal(true)}
            style={{
              padding: '8px 14px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Shuffle size={14} />
            Trộn đề thi
          </button>

          <Link
            to="/teacher/tests/new"
            style={{
              padding: '8px 14px',
              background: '#4f46e5',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#ffffff',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <FilePlus size={14} />
            Tạo đề mới
          </Link>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            position: 'relative',
            flex: '1 1 280px',
            display: 'flex',
            alignItems: 'center',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '6px 12px'
          }}>
            <Search size={14} style={{ color: '#64748b', marginRight: '8px' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm đề thi..."
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                width: '100%',
                color: '#0f172a'
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8' }}>
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#475569',
              background: '#ffffff',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {TYPE_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select
            value={createdSort}
            onChange={(e) => handleCreatedSortChange(e.target.value)}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#475569',
              background: '#ffffff',
              outline: 'none',
              cursor: 'pointer'
            }}
            aria-label="Sắp xếp ngày tạo"
          >
            {DATE_SORT_OPTIONS.map((o) => <option key={`c-${o.value}`} value={o.value}>Ngày tạo: {o.label}</option>)}
          </select>

          <select
            value={updatedSort}
            onChange={(e) => handleUpdatedSortChange(e.target.value)}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#475569',
              background: '#ffffff',
              outline: 'none',
              cursor: 'pointer'
            }}
            aria-label="Sắp xếp ngày cập nhật"
          >
            {DATE_SORT_OPTIONS.map((o) => <option key={`u-${o.value}`} value={o.value}>Cập nhật: {o.label}</option>)}
          </select>

          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            style={{
              padding: '8px 14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Filter size={14} />
            {showAdvancedFilters ? 'Ẩn bộ lọc' : 'Bộ lọc nâng cao'}
          </button>

          <button
            type="button"
            onClick={clearFilters}
            style={{
              padding: '8px 14px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            Xóa lọc
          </button>

          <button
            type="button"
            onClick={fetchTests}
            style={{
              padding: '8px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#64748b'
            }}
            title="Làm mới"
            aria-label="Làm mới"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {showAdvancedFilters && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9'
          }}>
            <select value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', color: '#475569', background: '#ffffff', outline: 'none' }}>
              {SKILL_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select value={bandFilter} onChange={(e) => setBandFilter(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', color: '#475569', background: '#ffffff', outline: 'none' }}>
              {BAND_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select value={isFullTestFilter} onChange={(e) => setIsFullTestFilter(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', color: '#475569', background: '#ffffff', outline: 'none' }}>
              <option value="">Tất cả loại</option>
              <option value="true">Full Test</option>
              <option value="false">Single Skill</option>
            </select>

            <select value={createdById} onChange={(e) => setCreatedById(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', color: '#475569', background: '#ffffff', outline: 'none' }}>
              <option value="">Tất cả giáo viên</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.fullName || t.username}</option>
              ))}
            </select>

            <input type="number" value={minDuration} onChange={(e) => setMinDuration(e.target.value)}
              placeholder="TG min (phút)" style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', width: '130px', outline: 'none' }} />
            <input type="number" value={maxDuration} onChange={(e) => setMaxDuration(e.target.value)}
              placeholder="TG max (phút)" style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', width: '130px', outline: 'none' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Từ ngày:</span>
              <input type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)}
                style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '6px 10px', fontSize: '13px', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Đến ngày:</span>
              <input type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)}
                style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '6px 10px', fontSize: '13px', outline: 'none' }} />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="admin-alert admin-alert-danger" style={{ marginBottom: 20 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Tests Table Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)'
      }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '10px', color: '#64748b', fontSize: '14px' }}>
            <Loader2 size={18} className="spin" />
            Đang tải đề thi...
          </div>
        ) : filteredTests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <FileText size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a', fontWeight: 700 }}>Không có đề thi phù hợp</h3>
            <p style={{ margin: 0, fontSize: '13px' }}>Thử thay đổi bộ lọc hoặc tạo đề mới để bắt đầu.</p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Đề thi</th>
                    <th>Loại</th>
                    <th>Người tạo</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th>Cập nhật</th>
                    <th>Đổi trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.map((test) => (
                    <tr key={test.id}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{test.title || 'Chưa đặt tên'}</td>
                      <td>{TYPE_LABELS[test.testType] || test.testType || '\u2014'}</td>
                      <td>{test.createdByUsername || '\u2014'}</td>
                      <td>
                        <span className={`admin-pill ${statusClassName(test.status)}`}>
                          {STATUS_LABELS[test.status] || test.status || 'Không rõ'}
                        </span>
                      </td>
                      <td>{formatDate(test.createdAt)}</td>
                      <td>{formatDate(test.updatedAt)}</td>
                      <td>
                        <select
                          value={test.status || 'DRAFT'}
                          onChange={(e) => handleChangeStatus(test.id, e.target.value)}
                          disabled={changingStatusId === test.id || (test.status === 'DELETED' && !canRestoreTest(test))}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#475569',
                            background: '#f8fafc',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          {TABS.filter((s) => s.value).map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="admin-action-wrap" ref={openActionMenuId === test.id ? actionMenuRef : null} style={{ display: 'inline-block' }}>
                          <button type="button" className="admin-action-trigger"
                            aria-label={`Thao tác cho ${test.title || 'đề thi'}`}
                            aria-haspopup="menu"
                            aria-expanded={openActionMenuId === test.id}
                            onClick={() => setOpenActionMenuId((prev) => (prev === test.id ? null : test.id))}
                            disabled={actionLoadingId === test.id}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748b',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '6px'
                            }}
                          >
                            <MoreVertical size={18} />
                          </button>

                          {openActionMenuId === test.id && (
                            <div className="admin-action-menu" role="menu" aria-label="Thao tác đề thi" style={{
                              position: 'absolute',
                              right: 0,
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                              width: '180px',
                              padding: '6px',
                              zIndex: 100,
                              textAlign: 'left'
                            }}>
                              {test.status === 'DELETED' ? (
                                <>
                                  {canRestoreTest(test) && (
                                    <button type="button" className="admin-dropdown-item" role="menuitem"
                                      onClick={() => { setOpenActionMenuId(null); handleRestoreTest(test); }}
                                      disabled={actionLoadingId === test.id}
                                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                      {actionLoadingId === test.id ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                                      Khôi phục
                                    </button>
                                  )}
                                  {isAdmin && (
                                    <button type="button" className="admin-dropdown-item logout" role="menuitem"
                                      onClick={() => { setOpenActionMenuId(null); handlePermanentDelete(test); }}
                                      disabled={actionLoadingId === test.id}
                                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                      {actionLoadingId === test.id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                                      Xóa vĩnh viễn
                                    </button>
                                  )}
                                </>
                              ) : (
                                <>
                                  <Link to={`/teacher/tests/${test.id}/edit`} className="admin-dropdown-item" role="menuitem"
                                    onClick={() => setOpenActionMenuId(null)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Pencil size={14} /> Chỉnh sửa
                                  </Link>
                                  <button type="button" className="admin-dropdown-item" role="menuitem"
                                    onClick={() => { setOpenActionMenuId(null); setVersionModalTest(test); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                    <Clock size={14} /> Phiên bản
                                  </button>
                                  <button type="button" className="admin-dropdown-item" role="menuitem"
                                    onClick={() => { setOpenActionMenuId(null); handleDuplicateTest(test); }}
                                    disabled={actionLoadingId === test.id}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                    {actionLoadingId === test.id ? <Loader2 size={14} className="spin" /> : <Copy size={14} />}
                                    Nhân bản
                                  </button>
                                  <button type="button" className="admin-dropdown-item" role="menuitem"
                                    onClick={() => { setOpenActionMenuId(null); handleCreatePublicLink(test); }}
                                    disabled={actionLoadingId === test.id}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                    <LinkIcon size={14} /> Link công khai
                                  </button>
                                  <button type="button" className="admin-dropdown-item" role="menuitem"
                                    onClick={() => { setOpenActionMenuId(null); handleMoveToTrash(test); }}
                                    disabled={actionLoadingId === test.id}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                    {actionLoadingId === test.id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                                    Đưa vào thùng rác
                                  </button>
                                  {isAdmin && (
                                    <button type="button" className="admin-dropdown-item logout" role="menuitem"
                                      onClick={() => { setOpenActionMenuId(null); handlePermanentDelete(test); }}
                                      disabled={actionLoadingId === test.id}
                                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                      {actionLoadingId === test.id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                                      Xóa vĩnh viễn
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="admin-pagination" style={{ marginTop: '24px' }}>
                <button onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  disabled={pagination.currentPage === 0} className="admin-btn ghost small">
                  Trước
                </button>
                <span className="admin-pagination-info">
                  Trang {pagination.currentPage + 1} / {pagination.totalPages} ({pagination.totalElements} đề thi)
                </span>
                <button onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                  disabled={pagination.currentPage >= pagination.totalPages - 1} className="admin-btn ghost small">
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

      <PublicShareLinkModal
        isOpen={shareModalOpen}
        onClose={() => { if (shareLoading) return; setShareModalOpen(false); }}
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
    </AdminLayout>
  );
}
