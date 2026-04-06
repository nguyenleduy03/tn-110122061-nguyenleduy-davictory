import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FilePlus, Pencil, Search, AlertCircle, Loader2, RefreshCw, Shuffle, Copy, Trash2, MoreVertical, Link as LinkIcon, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import LmsLayout from '../../components/lms/LmsLayout';
import ShuffleTestModal from '../../components/shuffle/ShuffleTestModal';
import PublicShareLinkModal from '../../components/common/PublicShareLinkModal';
import { testBuilderApi } from '../../services/testBuilderApi';
import { API_CONFIG } from '../../config/api';
import { authApi } from '../../services/authApi';
import { buildSavePayload, parseLoadedTest } from '../../services/testBuilderApi';

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
  TEST_EXAM: 'Test Exam',
  PUBLISHED: 'Đã phát hành',
  ARCHIVED: 'Lưu trữ',
  DELETED: 'Thùng rác',
};

const STATUS_CLASS_MAP = {
  DRAFT: 'neutral',
  REVIEWING: 'warn',
  TEST_EXAM: 'success',
  PUBLISHED: 'success',
  ARCHIVED: 'neutral',
  DELETED: 'danger',
};

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Bản nháp' },
  { value: 'REVIEWING', label: 'Đang duyệt' },
  { value: 'TEST_EXAM', label: 'Test Exam' },
  { value: 'PUBLISHED', label: 'Đã phát hành' },
  { value: 'ARCHIVED', label: 'Lưu trữ' },
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const actionMenuRef = useRef(null);
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    pageSize: 20,
  });

  const currentUser = authApi.getStoredUser() || {};
  const isAdmin = authApi.hasRole('ADMIN');
  const canRestoreTest = (test) => isAdmin || String(test?.createdByUsername || '') === String(currentUser?.username || '');
  const openTrashView = () => setStatusFilter('DELETED');
  const clearStatusView = () => setStatusFilter('');
  const shouldShowTest = (test) => statusFilter === 'DELETED' || test?.status !== 'DELETED';

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
      if (!isAdmin) {
        const mine = await testBuilderApi.getMyTests(statusFilter || undefined);
        setTests(normalizeTests(mine).filter(shouldShowTest));
        setPagination({
          currentPage: 0,
          totalPages: 1,
          totalElements: normalizeTests(mine).filter(shouldShowTest).length,
          pageSize: 20,
        });
        return;
      }

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
        
        setTests(normalizeTests(response).filter(shouldShowTest));
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
        setTests(normalizeTests(payload).filter(shouldShowTest));
        setPagination({
          currentPage: 0,
          totalPages: 1,
          totalElements: normalizeTests(payload).filter(shouldShowTest).length,
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
        if (!shouldShowTest(t)) return false;
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
    }
    return tests.filter(shouldShowTest);
  }, [tests, search, typeFilter, updatedSort, createdSort, pagination.totalPages, statusFilter]);

  const visibleDeletedCount = tests.length - tests.filter(shouldShowTest).length;
  const displayedTotalElements = Math.max(0, (pagination.totalElements || 0) - visibleDeletedCount);
  const dashboardStats = {
    total: tests.length,
    published: tests.filter((test) => test.status === 'PUBLISHED').length,
    testExam: tests.filter((test) => test.status === 'TEST_EXAM').length,
    shareable: tests.filter((test) => ['PUBLISHED', 'TEST_EXAM'].includes(String(test.status || '').toUpperCase())).length,
    deleted: tests.filter((test) => test.status === 'DELETED').length,
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setSkillFilter('');
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
    if (status === 'TEST_EXAM') return 'success';
    if (status === 'REVIEWING') return 'warn';
    return STATUS_CLASS_MAP[status] || 'default';
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
              ...group,
              backendGroupId: null,
              backendTestQGId: null,
              questions: (group.questions || []).map((question) => ({
                ...question,
                backendQuestionId: null,
              })),
            })),
          })),
        ])
      );

      if (!Number.isFinite(userId)) {
        throw new Error('Không xác định được người dùng hiện tại');
      }

      const payload = buildSavePayload(
        {
          ...loadedTest,
          title: `${loadedTest.title || test.title || 'Đề thi'} (bản sao)`,
        },
        duplicatedSessions,
        structure,
        userId,
        null,
        loadedTest.sessionDurations
      );

      await testBuilderApi.saveFullTest(payload);
      await fetchTests();
    } catch (err) {
      console.error(err);
      setError('Nhân bản đề thi thất bại. Vui lòng thử lại.');
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
      setError('Đưa đề thi vào thùng rác thất bại. Vui lòng thử lại.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestoreTest = async (test) => {
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
      console.error(err);
      setError(err?.response?.data?.error || 'Khôi phục đề thi thất bại. Vui lòng thử lại.');
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
      setError('Xóa vĩnh viễn đề thi thất bại. Vui lòng thử lại.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleShuffleSuccess = (newTest) => {
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

  useEffect(() => {
    if (!openActionMenuId) return undefined;

    const handleDocumentMouseDown = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionMenuId(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpenActionMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openActionMenuId]);

  return (
    <LmsLayout title="" subtitle="">
      <div style={pageShellStyle}>
        <section className="lms-hero">
          <div className="lms-hero-card">
            <div style={eyebrowStyle}>Teacher test hub</div>
            <h2 style={heroTitleStyle}>Quản lý đề thi hiện đại</h2>
            <p style={heroSubtitleStyle}>
              Quản lý đề thi, đổi trạng thái, tạo link công khai và theo dõi đề đang sẵn sàng chia sẻ trong một màn hình.
            </p>

            <div style={heroChipRowStyle}>
              <span style={heroChipStyle}>Tổng: {dashboardStats.total}</span>
              <span style={heroChipStyle}>Đã phát hành: {dashboardStats.published}</span>
              <span style={heroChipStyle}>Test Exam: {dashboardStats.testExam}</span>
            </div>

            <div style={heroActionsStyle}>
              <button type="button" onClick={openTrashView} className="lms-cta ghost" title="Xem thùng rác">
                <Trash2 size={14} /> Thùng rác
              </button>
              <button type="button" onClick={clearStatusView} className="lms-cta ghost" title="Bỏ lọc thùng rác">
                <RefreshCw size={14} /> Tất cả
              </button>
              <button type="button" onClick={() => setShowShuffleModal(true)} className="lms-cta ghost">
                <Shuffle size={14} /> Trộn đề
              </button>
              <Link to="/teacher/tests/new" className="lms-cta">
                <FilePlus size={14} /> Tạo đề mới
              </Link>
            </div>
            <div style={heroQuickPanelStyle}>
              <div style={heroQuickHeaderStyle}>
                <span style={heroQuickLabelStyle}>Lối tắt nhanh</span>
                <span style={heroQuickSubLabelStyle}>3 bước hay dùng nhất</span>
              </div>
              <div style={heroQuickGridStyle}>
                <div style={heroQuickItemStyle}>
                  <strong style={heroQuickItemTitleStyle}>Tạo đề</strong>
                  <span style={heroQuickItemTextStyle}>Tạo mới hoặc dùng template.</span>
                </div>
                <div style={heroQuickItemStyle}>
                  <strong style={heroQuickItemTitleStyle}>Phát hành</strong>
                  <span style={heroQuickItemTextStyle}>Đưa đề sang trạng thái public.</span>
                </div>
                <div style={heroQuickItemStyle}>
                  <strong style={heroQuickItemTitleStyle}>Test Exam</strong>
                  <span style={heroQuickItemTextStyle}>Dùng cho link công khai.</span>
                </div>
              </div>
            </div>
          </div>

          <div style={heroInsightStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <div style={sectionLabelStyle}>Tổng quan nhanh</div>
                <div style={panelTitleStyle}>Trạng thái hiện tại</div>
              </div>
              <span style={countBadgeStyle}>{filteredTests.length} đề thi</span>
            </div>

            <div style={insightListStyle}>
              <div style={insightItemStyle}>
                <span style={insightLabelStyle}>Đề đang xem</span>
                <strong style={insightValueStyle}>{statusFilter ? (STATUS_LABELS[statusFilter] || statusFilter) : 'Tất cả'}</strong>
              </div>
              <div style={insightItemStyle}>
                <span style={insightLabelStyle}>Từ khóa</span>
                <strong style={insightValueStyle}>{search.trim() || 'Chưa nhập'}</strong>
              </div>
              <div style={insightItemStyle}>
                <span style={insightLabelStyle}>Có thể chia sẻ</span>
                <strong style={insightValueStyle}>{dashboardStats.shareable}</strong>
              </div>
            </div>

            <div style={heroNoteStyle}>
              Chỉ đề ở trạng thái <strong>Đã phát hành</strong> hoặc <strong>Test Exam</strong> mới tạo được link công khai.
            </div>
          </div>
        </section>

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
            style={selectStyle}
          >
            {TYPE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="lms-tests-select"
            style={selectStyle}
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
            style={selectStyle}
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
            style={selectStyle}
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
            style={statusPillStyle(false, '#334155', '#fff', '#cbd5e1')}
          >
            {showAdvancedFilters ? 'Ẩn nâng cao' : 'Lọc nâng cao'}
          </button>

          <button type="button" onClick={clearFilters} style={statusPillStyle(false, '#334155', '#fff', '#cbd5e1')}>
            Xóa lọc
          </button>

          <button
            type="button"
            onClick={fetchTests}
            style={statusPillStyle(false, '#334155', '#fff', '#cbd5e1')}
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
          <div style={errorBannerStyle}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="lms-panel" style={panelStyle}>
        {loading ? (
          <div style={loadingStyle}>
            <Loader2 size={16} className="lms-spin" />
            Đang tải đề thi...
          </div>
        ) : filteredTests.length === 0 ? (
          <div style={emptyStateStyle}>
            <FileText size={40} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Không có đề thi phù hợp</p>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Thử thay đổi bộ lọc hoặc tạo đề mới để bắt đầu.</p>
          </div>
        ) : (
          <>
            <div className="lms-tests-table-wrap">
              <table className="lms-table">
                <thead>
                  <tr>
                    <th>Đề thi</th>
                    <th>Loại</th>
                    <th>Người tạo</th>
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
                      <td>{test.createdByUsername || '—'}</td>
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
                          disabled={changingStatusId === test.id || (test.status === 'DELETED' && !canRestoreTest(test))}
                          className="lms-tests-status-select"
                        >
                          {STATUS_FILTERS.filter((s) => s.value).map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="lms-tests-action-menu-wrap" ref={openActionMenuId === test.id ? actionMenuRef : null}>
                          <button
                            type="button"
                            className="lms-tests-action-trigger"
                            aria-label={`Mở thao tác cho ${test.title || 'đề thi'}`}
                            aria-haspopup="menu"
                            aria-expanded={openActionMenuId === test.id}
                            onClick={() => setOpenActionMenuId((current) => (current === test.id ? null : test.id))}
                            disabled={actionLoadingId === test.id}
                          >
                            <MoreVertical size={18} />
                          </button>

                          {openActionMenuId === test.id && (
                            <div className="lms-tests-action-menu" role="menu" aria-label="Thao tác đề thi">
                              {test.status === 'DELETED' ? (
                                <>
                                  {canRestoreTest(test) && (
                                    <button
                                      type="button"
                                      className="lms-tests-action-item"
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenActionMenuId(null);
                                        handleRestoreTest(test);
                                      }}
                                      disabled={actionLoadingId === test.id}
                                    >
                                      {actionLoadingId === test.id ? <Loader2 size={14} className="lms-spin" /> : <RefreshCw size={14} />}
                                      Khôi phục
                                    </button>
                                  )}

                                  {isAdmin && (
                                    <button
                                      type="button"
                                      className="lms-tests-action-item danger"
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenActionMenuId(null);
                                        handlePermanentDelete(test);
                                      }}
                                      disabled={actionLoadingId === test.id}
                                    >
                                      {actionLoadingId === test.id ? <Loader2 size={14} className="lms-spin" /> : <Trash2 size={14} />}
                                      Xóa vĩnh viễn
                                    </button>
                                  )}
                                </>
                              ) : (
                                <>
                                  <Link
                                    to={`/teacher/tests/${test.id}/edit`}
                                    className="lms-tests-action-item"
                                    role="menuitem"
                                    onClick={() => setOpenActionMenuId(null)}
                                  >
                                    <Pencil size={14} /> Chỉnh sửa
                                  </Link>

                                  <button
                                    type="button"
                                    className="lms-tests-action-item"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      handleDuplicateTest(test);
                                    }}
                                    disabled={actionLoadingId === test.id}
                                  >
                                    {actionLoadingId === test.id ? <Loader2 size={14} className="lms-spin" /> : <Copy size={14} />}
                                    Nhân bản
                                  </button>

                                  <button
                                    type="button"
                                    className="lms-tests-action-item"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      handleCreatePublicLink(test);
                                    }}
                                    disabled={actionLoadingId === test.id}
                                  >
                                    <LinkIcon size={14} />
                                    Tạo link công khai
                                  </button>

                                  <button
                                    type="button"
                                    className="lms-tests-action-item"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      handleMoveToTrash(test);
                                    }}
                                    disabled={actionLoadingId === test.id}
                                  >
                                    {actionLoadingId === test.id ? <Loader2 size={14} className="lms-spin" /> : <Trash2 size={14} />}
                                    Cho vào thùng rác
                                  </button>

                                  {isAdmin && (
                                    <button
                                      type="button"
                                      className="lms-tests-action-item danger"
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenActionMenuId(null);
                                        handlePermanentDelete(test);
                                      }}
                                      disabled={actionLoadingId === test.id}
                                    >
                                      {actionLoadingId === test.id ? <Loader2 size={14} className="lms-spin" /> : <Trash2 size={14} />}
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
                  ({displayedTotalElements} đề thi)
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
      </div>
    </LmsLayout>
  );
}

const pageShellStyle = {
  width: '100%',
  maxWidth: 'none',
  margin: 0,
  padding: '0 0 40px',
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
  margin: 0,
  fontSize: 26,
  fontWeight: 800,
  letterSpacing: '-0.02em',
  color: '#fff',
};

const heroSubtitleStyle = {
  margin: 0,
  maxWidth: 640,
  color: 'rgba(255, 255, 255, 0.84)',
  fontSize: 14,
  lineHeight: 1.65,
};

const heroChipRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  marginTop: 14,
};

const heroChipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 12px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.16)',
  color: '#f8fbff',
  fontSize: 12,
  fontWeight: 700,
};

const heroActionsStyle = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  marginTop: 6,
};

const heroQuickPanelStyle = {
  marginTop: 8,
  padding: 12,
  borderRadius: 16,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.14)',
  backdropFilter: 'blur(6px)',
};

const heroQuickHeaderStyle = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 8,
};

const heroQuickLabelStyle = {
  fontSize: 12,
  fontWeight: 800,
  color: '#fff',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

const heroQuickSubLabelStyle = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.72)',
};

const heroQuickGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 8,
};

const heroQuickItemStyle = {
  padding: '9px 10px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minHeight: 64,
};

const heroQuickItemTitleStyle = {
  fontSize: 12.5,
  fontWeight: 800,
  color: '#fff',
};

const heroQuickItemTextStyle = {
  fontSize: 11,
  lineHeight: 1.35,
  color: 'rgba(255,255,255,0.78)',
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
  minHeight: 44,
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
  minHeight: 44,
});

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

const heroInsightStyle = {
  background: '#fff',
  borderRadius: 24,
  border: '1px solid #dbeafe',
  boxShadow: '0 18px 50px rgba(37, 99, 235, 0.08)',
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const insightListStyle = {
  display: 'grid',
  gap: 12,
};

const insightItemStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '12px 14px',
  borderRadius: 16,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
};

const insightLabelStyle = {
  fontSize: 12,
  color: '#64748b',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const insightValueStyle = {
  fontSize: 14,
  color: '#0f172a',
};

const heroNoteStyle = {
  padding: '12px 14px',
  borderRadius: 16,
  background: '#eff6ff',
  color: '#1d4ed8',
  fontSize: 13,
  lineHeight: 1.5,
  border: '1px solid #dbeafe',
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
