import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Users,
  Upload,
  Download,
  Settings,
  BarChart3,
  Database,
  CheckCircle2,
  Activity,
  FileText,
  TrendingUp,
  AlertCircle,
  Loader2,
  Plus,
  RefreshCcw,
  ShieldCheck,
  ShieldAlert,
  CloudCog,
  ExternalLink,
} from 'lucide-react';
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
  const location = useLocation();
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
    pendingApproval: 0,
    systemHealth: 98.5,
    todayLogins: 0
  });
  const [driveStatus, setDriveStatus] = useState({
    authorized: false,
    storageUsage: '0 B',
    storageLimit: '0 B'
  });

  useEffect(() => {
    fetchStats();
    fetchDriveStatus();
  }, []);

  useEffect(() => {
    if (location.hash === '#drive' && driveSectionRef.current) {
      driveSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

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
      setDriveStatus(response.data);
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

  return (
    <AdminLayout
      title="Bảng điều khiển quản trị"
      subtitle="Quản lý toàn bộ hệ thống DAVictory theo thời gian thực"
    >
      <div className="admin-quick-actions" style={{ marginBottom: 20 }}>
        <button 
          className="quick-action-btn"
          onClick={() => setShowAddUser(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          <Upload size={16} />
          Thêm tài khoản
        </button>
      </div>
      <div className="admin-quick-stats" style={{ marginBottom: 20 }}>
        <QuickStat 
          icon={Users} 
          label="Tổng người dùng" 
          value={stats.totalUsers.toLocaleString()} 
          change="+12%" 
          positive={true}
        />
        <QuickStat 
          icon={Activity} 
          label="Hoạt động hôm nay" 
          value={stats.todayLogins.toLocaleString()} 
          change="+8%" 
          positive={true}
        />
        <QuickStat 
          icon={FileText} 
          label="Đề thi chờ duyệt" 
          value={stats.pendingApproval} 
          change="-3" 
          positive={false}
        />
        <QuickStat 
          icon={TrendingUp} 
          label="Tình trạng hệ thống" 
          value={`${stats.systemHealth}%`} 
          change="Tốt" 
          positive={true}
        />
      </div>

      <main className="admin-main" style={{ paddingTop: 0 }}>
        {!hasPermission && (
          <div className="admin-alert admin-alert-warning">
            <h2>Không có quyền truy cập</h2>
            <p>
              Trang này yêu cầu tài khoản có quyền <strong>ADMIN</strong>.
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              className="admin-btn admin-btn-dark"
            >
              Đăng nhập lại
            </button>
          </div>
        )}

        <div className="admin-section-head">
          <div>
            <h2>Quản trị hệ thống</h2>
            <p>
              Quản lý người dùng, hệ thống và cấu hình
            </p>
          </div>
        </div>

        {error && (
          <div className="admin-alert admin-alert-danger">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <section className="admin-drive-panel" id="drive" ref={driveSectionRef}>
          <div className="admin-drive-panel-head">
            <div className="admin-drive-panel-title">
              <div className="admin-drive-panel-badge">
                <CloudCog size={18} />
                Google Drive
              </div>
              <h2>Ủy quyền Drive & trạng thái</h2>
              <p>
                Tích hợp trực tiếp vào trang quản trị để kiểm tra, ủy quyền và thu hồi Google Drive ở cùng một nơi.
              </p>
            </div>

            <div className={`admin-drive-status ${driveStatus.authorized ? 'is-on' : 'is-off'}`}>
              {driveStatus.authorized ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
              <div>
                <strong>{driveStatus.authorized ? 'Đã kết nối' : 'Chưa kết nối'}</strong>
                <span>{driveStatus.message || 'Trạng thái Google Drive'}</span>
              </div>
            </div>
          </div>

          <div className="admin-drive-grid">
            <div className="admin-drive-summary">
              <div className="admin-drive-summary-top">
                <div>
                  <span className="admin-drive-kicker">Tài khoản Drive</span>
                  <h3>{driveStatus.displayName || 'Chưa có tài khoản liên kết'}</h3>
                  <p>{driveStatus.email || 'Hãy ủy quyền một lần để dùng lâu dài.'}</p>
                </div>
                <button className="admin-drive-refresh" onClick={fetchDriveStatus} disabled={driveActionLoading}>
                  <RefreshCcw size={15} />
                  Làm mới
                </button>
              </div>

              <div className="admin-drive-metrics">
                <div className="admin-drive-metric">
                  <span>Dung lượng đã dùng</span>
                  <strong>{driveStatus.storageUsage || '0 B'} / {driveStatus.storageLimit || '0 B'}</strong>
                </div>
                <div className="admin-drive-metric">
                  <span>Số file</span>
                  <strong>{driveStatus.totalFiles ?? 0}</strong>
                </div>
                <div className="admin-drive-metric">
                  <span>Folder size</span>
                  <strong>{driveStatus.folderSize || '0 B'}</strong>
                </div>
              </div>

              {driveStatus.authorized && (
                <div className="admin-drive-progress">
                  <div className="admin-drive-progress-bar">
                    <div style={{ width: `${driveStatus.storagePercent ?? 0}%` }} />
                  </div>
                  <div className="admin-drive-progress-note">
                    Đã dùng {driveStatus.storagePercent ?? 0}% dung lượng Drive
                  </div>
                </div>
              )}
            </div>

            <div className="admin-drive-actions-card">
              <h3>Thao tác nhanh</h3>
              <p>
                Ủy quyền Drive chỉ cần làm một lần. Sau đó hệ thống tự làm mới token khi còn hiệu lực.
              </p>

              <div className="admin-drive-actions-list">
                <button className="admin-drive-btn primary" onClick={handleDriveAuthorize} disabled={driveActionLoading}>
                  {driveActionLoading ? <Loader2 size={16} className="spin" /> : <ExternalLink size={16} />}
                  {driveStatus.authorized ? 'Ủy quyền lại' : 'Ủy quyền Drive'}
                </button>

                <button className="admin-drive-btn ghost" onClick={fetchDriveStatus} disabled={driveActionLoading}>
                  <RefreshCcw size={16} />
                  Kiểm tra lại
                </button>

                {driveStatus.authorized && (
                  <button className="admin-drive-btn danger" onClick={handleDriveRevoke} disabled={driveActionLoading}>
                    <ShieldAlert size={16} />
                    Thu hồi quyền
                  </button>
                )}
              </div>

              <div className="admin-drive-note">
                <strong>Lưu ý:</strong> Nếu Google báo cần xác minh, hãy dùng tài khoản tester đã được thêm vào Google Cloud Console.
              </div>
            </div>
          </div>
        </section>

        {importResult && (
          <div className="admin-alert admin-alert-info admin-import-result">
            <div className="admin-import-title">
              Kết quả import CSV:
            </div>
            <div className="admin-import-content">
              ✅ Thành công: {importResult.success || 0} học viên<br/>
              {importResult.failed > 0 && `❌ Thất bại: ${importResult.failed} học viên`}
              {importResult.errors && (
                <details className="admin-import-errors">
                  <summary>Chi tiết lỗi</summary>
                  <pre>
                    {importResult.errors.join('\n')}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}

        <section className="admin-cards-grid">
          
          <AdminCard
            icon={Users}
            title="Quản lý người dùng"
            description="Xem, tạo, chỉnh sửa và phân quyền tài khoản"
            color="#059669"
            size="large"
            actions={[
              { label: 'Xem tất cả', href: '/admin/users', primary: true },
              { label: 'Thêm mới', href: '/admin/users/new' }
            ]}
            stats={[
              { label: 'Tổng cộng', value: stats.totalUsers },
              { label: 'Hoạt động', value: stats.activeUsers },
              { label: 'Hôm nay', value: '+' + stats.todayLogins }
            ]}
          />

          <div className="admin-card admin-import-card">
            <div className="admin-import-head">
                <Upload size={24} />
                <h3>
                  Import học viên hàng loạt
                </h3>
            </div>
              
            <p className="admin-import-sub">
                Tạo tài khoản học viên từ file CSV với định dạng chuẩn
            </p>

            <div className="admin-import-actions">
                <button
                  onClick={handleDownloadTemplate}
                  className="admin-btn admin-btn-ghost-light"
                >
                  <Download size={16} />
                  Tải file mẫu CSV
                </button>
            </div>

            <div className="admin-file-wrap">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  disabled={importing}
                  className="admin-file-input"
                />
                <button
                  disabled={importing}
                  className={`admin-btn admin-btn-file ${importing ? 'is-loading' : ''}`}
                >
                  {importing ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Đang import...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Chọn file CSV để import
                    </>
                  )}
                </button>
            </div>
          </div>

          <AdminCard
            icon={CheckCircle2}
            title="Duyệt đề thi"
            description="Kiểm duyệt và phê duyệt đề thi từ giáo viên"
            color="#dc2626"
            badge={{ text: `${stats.pendingApproval} chờ duyệt`, color: '#ef4444' }}
            actions={[
              { label: 'Xem danh sách', href: '/admin/test-approval', primary: true }
            ]}
          />

          <AdminCard
            icon={Settings}
            title="Cấu hình hệ thống"
            description="Cài đặt chung, email, backup và bảo mật"
            color="#0891b2"
            actions={[
              { label: 'Mở cài đặt', href: '/admin/settings', primary: true }
            ]}
          />

          <AdminCard
            icon={BarChart3}
            title="Thống kê & Báo cáo"
            description="Phân tích dữ liệu người dùng và hoạt động hệ thống"
            color="#7c3aed"
            actions={[
              { label: 'Xem báo cáo', href: '/admin/analytics', primary: true }
            ]}
          />

          <AdminCard
            icon={Database}
            title="Quản lý Database"
            description="Kiểm tra kết nối, backup và trạng thái hệ thống"
            color="#6b7280"
            actions={[
              { label: 'Database Debug', href: '/debug' },
              { label: 'System Health', href: '/admin/system' }
            ]}
          />

        </section>
      </main>
      
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

function QuickStat({ icon: Icon, label, value, change, positive }) {
  return (
    <div className="admin-quick-stat">
      <div className="admin-quick-stat-top">
        <Icon size={18} />
        <span>{label}</span>
      </div>
      <div className="admin-quick-stat-value">{value}</div>
      <div className={`admin-quick-stat-change ${positive ? 'is-positive' : 'is-warning'}`}>
        {change}
      </div>
    </div>
  );
}

function AdminCard({ icon: Icon, title, description, color, badge, actions, stats }) {
  return (
    <div className="admin-card">
      <div className="admin-card-head">
        <div className="admin-card-icon" style={{ background: `${color}14` }}>
          <Icon size={24} color={color} />
        </div>
        <div className="admin-card-title-wrap">
          <h3>
            {title}
          </h3>
          {badge && (
            <span className="admin-card-badge" style={{ background: `${badge.color}15`, color: badge.color }}>
              {badge.text}
            </span>
          )}
        </div>
      </div>

      <p className="admin-card-desc">{description}</p>

      {stats && (
        <div className="admin-card-stats">
          {stats.map((stat, i) => (
            <div key={i} className="admin-card-stat">
              <div className="admin-card-stat-value">{stat.value}</div>
              <div className="admin-card-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {actions && (
        <div className="admin-card-actions">
          {actions.map((action, i) => (
            <Link
              key={i}
              to={action.href}
              className={`admin-card-btn ${action.primary ? 'is-primary' : 'is-outline'}`}
              style={action.primary ? { background: color } : { color, borderColor: `${color}40` }}
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
