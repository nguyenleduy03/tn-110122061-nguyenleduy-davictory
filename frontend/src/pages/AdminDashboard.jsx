import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
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
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
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

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTests: 0,
    pendingApproval: 0,
    systemHealth: 98.5,
    todayLogins: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch real stats from API
      const usersData = await authApi.getAllUsers();
      const testsData = []; // Tạm thời để empty array
      
      setStats({
        totalUsers: usersData.length,
        activeUsers: usersData.filter(u => u.isActive).length,
        totalTests: testsData.length,
        pendingApproval: 0, // Tạm thời
        systemHealth: 98.5,
        todayLogins: usersData.filter(u => {
          if (!u.lastLogin) return false;
          const today = new Date().toDateString();
          const loginDate = new Date(u.lastLogin).toDateString();
          return today === loginDate;
        }).length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
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
    <div className="admin-page">
      <Navbar />

      <section className="admin-hero">
        <div className="admin-container">
          <div className="admin-hero-head">
            <div className="admin-hero-icon">
              <Shield size={28} />
            </div>
            <div className="admin-hero-copy">
              <h1>
                Bảng điều khiển quản trị
              </h1>
              <p>
                Quản lý toàn bộ hệ thống DAVictory
              </p>
            </div>
          </div>

          <div className="admin-quick-stats">
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
        </div>
      </section>

      <main className="admin-container admin-main">
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
    </div>
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
