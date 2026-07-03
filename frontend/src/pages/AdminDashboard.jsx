import React, { useEffect, useRef, useState } from 'react';
import {
  Users,
  Upload,
  Download,
  Settings,
  Database,
  CheckCircle2,
  Activity,
  FileText,
  TrendingUp,
  AlertCircle,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  ShieldAlert,
  CloudCog,
  ExternalLink,
  ClipboardList,
  GraduationCap,
  Briefcase,
  ChevronRight,
  Clock,
  FolderOpen
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import AddUserModal from '../components/admin/AddUserModal.jsx';
import { authApi } from '../services/authApi';
import '../styles/adminDashboard.css';

const isAdminOnly = (roles) => {
  if (!roles) return false;
  const rolesArray = Array.isArray(roles) ? roles : Array.from(roles);
  return rolesArray.some((r) => (typeof r === 'string' ? r === 'ADMIN' : (r?.name === 'ADMIN' || r?.roleName === 'ADMIN')));
};

export default function AdminDashboard() {
  const user = authApi.getStoredUser();
  const hasPermission = isAdminOnly(user?.roles);
  const driveSectionRef = useRef(null);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [driveActionLoading, setDriveActionLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTests: 0,
    totalQuestions: 0,
    totalAttempts: 0,
    newTests: 0,
    newQuestions: 0,
    newStudents: 0,
    newAttempts: 0,
    avgListening: 6.5,
    avgReading: 6.8,
    avgWriting: 6.0,
    avgSpeaking: 6.2,
    completedAttempts: 0,
    inProgressAttempts: 0,
    otherAttempts: 0,
    attemptsTimeSeries: [],
    pendingApproval: 0,
    systemHealth: 98.5,
    todayLogins: 0
  });

  const [driveStatus, setDriveStatus] = useState({
    authorized: false,
    storageUsage: '0 B',
    storageLimit: '0 B',
    totalFiles: 0,
    folderSize: '0 B',
    storagePercent: 0
  });

  useEffect(() => {
    fetchStats();
    fetchDriveStatus();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await authApi.get('/admin/users/dashboard-stats');
      setStats((prev) => ({
        ...prev,
        ...response.data,
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchDriveStatus = async () => {
    try {
      const response = await authApi.get('/admin/drive/status');
      setDriveStatus((prev) => ({
        ...prev,
        ...response.data
      }));
    } catch (error) {
      console.error('Error fetching drive status:', error);
    }
  };

  const handleDriveAuthorize = async () => {
    try {
      setDriveActionLoading(true);
      const response = await authApi.get('/admin/drive/authorize-url');
      window.location.href = response.data.url;
    } catch (error) {
      setError(error.response?.data?.error || error.message || 'Không thể mở trang ủy quyền Google Drive');
    } finally {
      setDriveActionLoading(false);
    }
  };

  const handleDriveRevoke = async () => {
    if (!window.confirm('Bạn có chắc muốn thu hồi quyền truy cập Google Drive?')) return;
    try {
      setDriveActionLoading(true);
      await authApi.post('/admin/drive/revoke');
      await fetchDriveStatus();
    } catch (error) {
      setError(error.response?.data?.error || error.message || 'Không thể thu hồi quyền Google Drive');
    } finally {
      setDriveActionLoading(false);
    }
  };

  const handleCSVImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    setError('');

    try {
      const result = await authApi.importStudentsFromCSV(file);
      setImportResult(result);
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi import file CSV');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    authApi.downloadCSVTemplate();
  };

  // Convert average IELTS band score to a percentage of 9.0
  const getPercentOfNine = (val) => {
    if (!val) return 0;
    return Math.round((val / 9.0) * 100);
  };

  return (
    <AdminLayout
      title="Tổng quan"
      subtitle="Chào mừng bạn trở lại, Admin! 👋"
    >
      {!hasPermission && (
        <div className="admin-alert admin-alert-warning" style={{ marginBottom: 20 }}>
          <h2>Không có quyền truy cập</h2>
          <p>Trang này yêu cầu tài khoản có quyền <strong>ADMIN</strong>.</p>
          <button onClick={() => window.location.href = '/login'} className="admin-btn admin-btn-dark">
            Đăng nhập lại
          </button>
        </div>
      )}

      {error && (
        <div className="admin-alert admin-alert-danger" style={{ marginBottom: 20 }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Quick Toolbar for CSV imports & Add Account */}
      <div className="admin-toolbar-actions" style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Thao tác nhanh:</span>
          <button
            onClick={() => setShowAddUser(true)}
            style={{
              padding: '8px 14px',
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Thêm tài khoản
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleDownloadTemplate}
            style={{
              padding: '8px 12px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#475569',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={14} />
            Mẫu CSV học viên
          </button>

          <div style={{ position: 'relative' }}>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              disabled={importing}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: 'pointer'
              }}
            />
            <button
              disabled={importing}
              style={{
                padding: '8px 14px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#6d28d9',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {importing ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
              {importing ? 'Đang import...' : 'Import học viên'}
            </button>
          </div>
        </div>
      </div>

      {importResult && (
        <div className="admin-alert admin-alert-info admin-import-result" style={{ marginBottom: 24 }}>
          <div className="admin-import-title">Kết quả import CSV:</div>
          <div className="admin-import-content">
            ✅ Thành công: {importResult.success || 0} học viên<br/>
            {importResult.failed > 0 && `❌ Thất bại: ${importResult.failed} học viên`}
            {importResult.errors && (
              <details className="admin-import-errors">
                <summary>Chi tiết lỗi</summary>
                <pre>{importResult.errors.join('\n')}</pre>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Row 1: 4 Quick Stat Cards */}
      <section className="admin-dashboard-stats-grid">
        <div className="admin-stat-card-new">
          <div className="admin-stat-card-left">
            <span className="admin-stat-card-label">Tổng số đề thi</span>
            <span className="admin-stat-card-value">{(stats.totalTests ?? 0).toLocaleString()}</span>
            <span className="admin-stat-card-trend up">
              ↑ {stats.newTests ?? 0} đề thi mới
            </span>
          </div>
          <div className="admin-stat-card-icon-wrap blue">
            <FileText size={22} />
          </div>
        </div>

        <div className="admin-stat-card-new">
          <div className="admin-stat-card-left">
            <span className="admin-stat-card-label">Tổng số câu hỏi</span>
            <span className="admin-stat-card-value">{(stats.totalQuestions ?? 0).toLocaleString()}</span>
            <span className="admin-stat-card-trend up">
              ↑ {stats.newQuestions ?? 0} câu hỏi mới
            </span>
          </div>
          <div className="admin-stat-card-icon-wrap green">
            <ClipboardList size={22} />
          </div>
        </div>

        <div className="admin-stat-card-new">
          <div className="admin-stat-card-left">
            <span className="admin-stat-card-label">Tổng số thí sinh</span>
            <span className="admin-stat-card-value">{(stats.totalStudents ?? 0).toLocaleString()}</span>
            <span className="admin-stat-card-trend up">
              ↑ {stats.newStudents ?? 0} thí sinh mới
            </span>
          </div>
          <div className="admin-stat-card-icon-wrap orange">
            <Users size={22} />
          </div>
        </div>

        <div className="admin-stat-card-new">
          <div className="admin-stat-card-left">
            <span className="admin-stat-card-label">Bài thi đã làm</span>
            <span className="admin-stat-card-value">{(stats.totalAttempts ?? 0).toLocaleString()}</span>
            <span className="admin-stat-card-trend up">
              ↑ {stats.newAttempts ?? 0} bài thi mới
            </span>
          </div>
          <div className="admin-stat-card-icon-wrap pink">
            <Briefcase size={22} />
          </div>
        </div>
      </section>

      {/* Row 2: Google Drive Panel & Thống kê bài thi */}
      <section className="admin-dashboard-row-two">
        {/* Google Drive Card */}
        <div className="admin-drive-card-new" id="drive" ref={driveSectionRef}>
          <div className="admin-drive-card-header">
            <div className="admin-drive-card-title-area">
              <button className="admin-drive-card-icon-btn" onClick={fetchDriveStatus} disabled={driveActionLoading}>
                <CloudCog size={22} style={{ color: '#4f46e5' }} />
                <span>Google Drive</span>
              </button>
              <span className={driveStatus.authorized ? 'admin-drive-connected-tag' : 'admin-drive-disconnected-tag'}>
                {driveStatus.authorized ? 'Đã kết nối' : 'Chưa kết nối'}
              </span>
            </div>

            <button className="admin-drive-manage-btn" onClick={handleDriveAuthorize} disabled={driveActionLoading}>
              <span>Quản lý Drive</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <span className="admin-drive-account-label">Tài khoản</span>
          <span className="admin-drive-account-email">
            {driveStatus.email || 'admin@ieltsmanager.com'}
          </span>

          <div className="admin-drive-storage-label-area">
            <span>Dung lượng đã sử dụng</span>
            <span className="admin-drive-storage-used">
              {driveStatus.storageUsage || '24.6 GB'} / {driveStatus.storageLimit || '100 GB'}
            </span>
          </div>

          <div className="admin-drive-storage-bar-outer">
            <div
              className="admin-drive-storage-bar-inner"
              style={{ width: `${driveStatus.storagePercent ?? 24.6}%` }}
            />
          </div>

          <div className="admin-drive-info-grid">
            <div className="admin-drive-info-box">
              <span className="admin-drive-box-label">Trạng thái</span>
              <div className="admin-drive-box-value-wrap">
                <span className="admin-drive-box-icon green">●</span>
                <span>Hoạt động</span>
              </div>
            </div>

            <div className="admin-drive-info-box">
              <span className="admin-drive-box-label">Đồng bộ lần cuối</span>
              <div className="admin-drive-box-value-wrap">
                <Clock size={12} className="admin-drive-box-icon" />
                <span>10 phút trước</span>
              </div>
            </div>

            <div className="admin-drive-info-box">
              <span className="admin-drive-box-label">Số lượng tệp</span>
              <div className="admin-drive-box-value-wrap">
                <FolderOpen size={12} className="admin-drive-box-icon" />
                <span>{(driveStatus.totalFiles ?? 1248).toLocaleString()} tệp</span>
              </div>
            </div>
          </div>
        </div>

        {/* Thống kê bài thi (Chart) */}
        <div className="admin-chart-card-new">
          <div className="admin-chart-card-header">
            <h3 className="admin-chart-card-title">Thống kê bài thi</h3>
            <select className="admin-chart-card-select">
              <option>7 ngày qua</option>
              <option>30 ngày qua</option>
            </select>
          </div>

          <div className="admin-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.attemptsTimeSeries && stats.attemptsTimeSeries.length > 0 ? stats.attemptsTimeSeries : [
                { date: '30/06', count: 70 },
                { date: '01/07', count: 110 },
                { date: '02/07', count: 105 },
                { date: '03/07', count: 185 },
                { date: '04/07', count: 120 },
                { date: '05/07', count: 130 },
                { date: '06/07', count: 95 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="admin-chart-summary-grid">
            <div className="admin-chart-summary-box">
              <span className="admin-chart-box-label">Tổng bài thi</span>
              <div className="admin-chart-box-value-wrap">
                <span className="admin-chart-box-value">{(stats.attemptsTimeSeries || []).reduce((acc, curr) => acc + curr.count, 0) || 768}</span>
              </div>
            </div>

            <div className="admin-chart-summary-box">
              <span className="admin-chart-box-label">Đã hoàn thành</span>
              <div className="admin-chart-box-value-wrap">
                <span className="admin-chart-box-value">{stats.completedAttempts || 542}</span>
                <span className="admin-chart-box-pct green">
                  {stats.totalAttempts > 0 ? ((stats.completedAttempts / stats.totalAttempts) * 100).toFixed(1) : '70.6'}%
                </span>
              </div>
            </div>

            <div className="admin-chart-summary-box">
              <span className="admin-chart-box-label">Đang làm</span>
              <div className="admin-chart-box-value-wrap">
                <span className="admin-chart-box-value">{stats.inProgressAttempts || 126}</span>
                <span className="admin-chart-box-pct orange">
                  {stats.totalAttempts > 0 ? ((stats.inProgressAttempts / stats.totalAttempts) * 100).toFixed(1) : '16.4'}%
                </span>
              </div>
            </div>

            <div className="admin-chart-summary-box">
              <span className="admin-chart-box-label">Chưa bắt đầu</span>
              <div className="admin-chart-box-value-wrap">
                <span className="admin-chart-box-value">{stats.otherAttempts || 100}</span>
                <span className="admin-chart-box-pct gray">
                  {stats.totalAttempts > 0 ? ((stats.otherAttempts / stats.totalAttempts) * 100).toFixed(1) : '13.0'}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Row 3: IELTS Skills Overview */}
      <section className="admin-skills-card-new">
        <h3 className="admin-skills-card-title">Tổng quan theo kỹ năng IELTS</h3>

        <div className="admin-skills-grid">
          {/* Listening Box */}
          <div className="admin-skill-box">
            <div className="admin-skill-box-header">
              <div className="admin-skill-icon-wrap blue">
                <Activity size={15} />
              </div>
              <span>Listening</span>
            </div>
            <div className="admin-skill-box-body">
              <div className="admin-skill-metrics">
                <span className="admin-skill-label">Trung bình</span>
                <span className="admin-skill-avg-score">
                  {stats.avgListening ? stats.avgListening.toFixed(1) : '6.5'}
                </span>
                <span className="admin-skill-trend">↑ 0.5 so với tuần trước</span>
              </div>
              <CircularProgress value={getPercentOfNine(stats.avgListening) || 78} color="#3b82f6" />
            </div>
          </div>

          {/* Reading Box */}
          <div className="admin-skill-box">
            <div className="admin-skill-box-header">
              <div className="admin-skill-icon-wrap green">
                <FileText size={15} />
              </div>
              <span>Reading</span>
            </div>
            <div className="admin-skill-box-body">
              <div className="admin-skill-metrics">
                <span className="admin-skill-label">Trung bình</span>
                <span className="admin-skill-avg-score">
                  {stats.avgReading ? stats.avgReading.toFixed(1) : '6.8'}
                </span>
                <span className="admin-skill-trend">↑ 0.6 so với tuần trước</span>
              </div>
              <CircularProgress value={getPercentOfNine(stats.avgReading) || 82} color="#22c55e" />
            </div>
          </div>

          {/* Writing Box */}
          <div className="admin-skill-box">
            <div className="admin-skill-box-header">
              <div className="admin-skill-icon-wrap orange">
                <Settings size={15} />
              </div>
              <span>Writing</span>
            </div>
            <div className="admin-skill-box-body">
              <div className="admin-skill-metrics">
                <span className="admin-skill-label">Trung bình</span>
                <span className="admin-skill-avg-score">
                  {stats.avgWriting ? stats.avgWriting.toFixed(1) : '6.0'}
                </span>
                <span className="admin-skill-trend">↑ 0.3 so với tuần trước</span>
              </div>
              <CircularProgress value={getPercentOfNine(stats.avgWriting) || 70} color="#f97316" />
            </div>
          </div>

          {/* Speaking Box */}
          <div className="admin-skill-box">
            <div className="admin-skill-box-header">
              <div className="admin-skill-icon-wrap pink">
                <Activity size={15} style={{ transform: 'rotate(90deg)' }} />
              </div>
              <span>Speaking</span>
            </div>
            <div className="admin-skill-box-body">
              <div className="admin-skill-metrics">
                <span className="admin-skill-label">Trung bình</span>
                <span className="admin-skill-avg-score">
                  {stats.avgSpeaking ? stats.avgSpeaking.toFixed(1) : '6.2'}
                </span>
                <span className="admin-skill-trend">↑ 0.4 so với tuần trước</span>
              </div>
              <CircularProgress value={getPercentOfNine(stats.avgSpeaking) || 75} color="#ec4899" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="admin-dashboard-footer-text">
        © 2024 IELTS Manager. Tất cả quyền được bảo lưu.
      </footer>

      {/* Modal */}
      <AddUserModal
        isOpen={showAddUser}
        onClose={() => setShowAddUser(false)}
        onSuccess={() => {
          fetchStats();
          setShowAddUser(false);
        }}
      />
    </AdminLayout>
  );
}

function CircularProgress({ value, color }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="admin-skill-progress-ring-wrap">
      <svg width="54" height="54">
        <circle stroke="#f1f5f9" strokeWidth="4" fill="transparent" r={radius} cx="27" cy="27" />
        <circle
          stroke={color}
          strokeWidth="4"
          fill="transparent"
          r={radius}
          cx="27"
          cy="27"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 27 27)"
        />
      </svg>
      <span className="admin-skill-progress-ring-text">{value}%</span>
    </div>
  );
}
