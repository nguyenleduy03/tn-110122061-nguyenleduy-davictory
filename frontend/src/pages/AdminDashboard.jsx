import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  AlertTriangle,
  Activity,
  FileText,
  UserCheck,
  Clock,
  TrendingUp,
  AlertCircle,
  Loader2,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import { authApi } from '../services/authApi';

const isAdminOnly = (roles) => {
  if (!roles) return false;
  const rolesArray = Array.isArray(roles) ? roles : Array.from(roles);
  return rolesArray.includes('ADMIN');
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
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar />
      
      {/* Admin Header với gradient background */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #06b6d4 100%)',
        color: 'white',
        padding: '40px 24px'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ 
              background: 'rgba(255,255,255,0.2)', 
              padding: 12, 
              borderRadius: 12,
              backdropFilter: 'blur(10px)'
            }}>
              <Shield size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                Bảng điều khiển quản trị
              </h1>
              <p style={{ fontSize: 16, margin: 0, opacity: 0.9, fontWeight: 500 }}>
                Quản lý toàn bộ hệ thống DAVictory
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 16,
            marginTop: 24
          }}>
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
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {!hasPermission && (
          <div style={{ textAlign: 'center', padding: '40px', background: '#fff3cd', borderRadius: 12, marginBottom: 24 }}>
            <h2 style={{ color: '#856404', marginBottom: 12 }}>Không có quyền truy cập</h2>
            <p style={{ color: '#856404' }}>
              Trang này yêu cầu tài khoản có quyền <strong>ADMIN</strong>.
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              style={{ marginTop: 16, padding: '10px 24px', background: '#856404', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              Đăng nhập lại
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
              🛡️ Quản trị hệ thống
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
              Quản lý người dùng, hệ thống và cấu hình
            </p>
          </div>
        </div>

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

        {importResult && (
          <div style={{
            padding: '12px 16px', background: '#f0f9ff', border: '1px solid #bae6fd', 
            borderRadius: 8, marginBottom: 16, fontSize: 14,
          }}>
            <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: 8 }}>
              Kết quả import CSV:
            </div>
            <div style={{ color: '#0c4a6e' }}>
              ✅ Thành công: {importResult.success || 0} học viên<br/>
              {importResult.failed > 0 && `❌ Thất bại: ${importResult.failed} học viên`}
              {importResult.errors && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', color: '#dc2626' }}>Chi tiết lỗi</summary>
                  <pre style={{ fontSize: 12, marginTop: 4, color: '#dc2626' }}>
                    {importResult.errors.join('\n')}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 20 }}>
          
          {/* Quản lý người dùng - Card lớn */}
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

          {/* Import CSV - Card đặc biệt */}
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            borderRadius: 16,
            padding: 24,
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Upload size={24} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  Import học viên hàng loạt
                </h3>
              </div>
              
              <p style={{ margin: '0 0 20px 0', opacity: 0.9, fontSize: 14 }}>
                Tạo tài khoản học viên từ file CSV với định dạng chuẩn
              </p>

              <div style={{ marginBottom: 16 }}>
                <button
                  onClick={handleDownloadTemplate}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px', borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.3)', 
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white', fontSize: 13, cursor: 'pointer',
                    width: '100%', justifyContent: 'center',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <Download size={16} />
                  Tải file mẫu CSV
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  disabled={importing}
                  style={{
                    position: 'absolute', opacity: 0, width: '100%', height: '100%',
                    cursor: importing ? 'not-allowed' : 'pointer',
                  }}
                />
                <button
                  disabled={importing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 20px', borderRadius: 10,
                    border: 'none', 
                    background: importing ? 'rgba(255,255,255,0.2)' : 'white',
                    color: importing ? 'rgba(255,255,255,0.7)' : '#7c3aed',
                    fontSize: 14, fontWeight: 600, width: '100%',
                    justifyContent: 'center',
                    cursor: importing ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                >
                  {importing ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
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
            
            {/* Background decoration */}
            <div style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 100,
              height: 100,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '50%',
              zIndex: 1
            }} />
          </div>

          {/* Duyệt đề thi */}
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

          {/* Cấu hình hệ thống */}
          <AdminCard
            icon={Settings}
            title="Cấu hình hệ thống"
            description="Cài đặt chung, email, backup và bảo mật"
            color="#0891b2"
            actions={[
              { label: 'Mở cài đặt', href: '/admin/settings', primary: true }
            ]}
          />

          {/* Thống kê & Báo cáo */}
          <AdminCard
            icon={BarChart3}
            title="Thống kê & Báo cáo"
            description="Phân tích dữ liệu người dùng và hoạt động hệ thống"
            color="#7c3aed"
            actions={[
              { label: 'Xem báo cáo', href: '/admin/analytics', primary: true }
            ]}
          />

          {/* Database & Hệ thống */}
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

        </div>
      </div>
    </div>
  );
}

// Component QuickStat cho header
function QuickStat({ icon: Icon, label, value, change, positive }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.15)',
      backdropFilter: 'blur(10px)',
      borderRadius: 12,
      padding: 16,
      border: '1px solid rgba(255,255,255,0.2)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon size={18} />
        <span style={{ fontSize: 13, opacity: 0.9 }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{value}</div>
      <div style={{ 
        fontSize: 12, 
        color: positive ? '#10b981' : '#f59e0b',
        fontWeight: 600
      }}>
        {change}
      </div>
    </div>
  );
}

// Component AdminCard mới
function AdminCard({ icon: Icon, title, description, color, badge, actions, stats }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      padding: 24,
      border: '1px solid #e5e7eb',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 10px 25px -3px rgba(0, 0, 0, 0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          background: `${color}15`,
          padding: 12,
          borderRadius: 12
        }}>
          <Icon size={24} color={color} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
            {title}
          </h3>
          {badge && (
            <span style={{
              display: 'inline-block',
              marginTop: 4,
              padding: '2px 8px',
              borderRadius: 12,
              background: `${badge.color}15`,
              color: badge.color,
              fontSize: 11,
              fontWeight: 600
            }}>
              {badge.text}
            </span>
          )}
        </div>
      </div>

      <p style={{ margin: '0 0 20px 0', fontSize: 14, color: '#6b7280' }}>
        {description}
      </p>

      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: 12, 
          marginBottom: 20,
          padding: 16,
          background: '#f8fafc',
          borderRadius: 8
        }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {actions && (
        <div style={{ display: 'flex', gap: 8 }}>
          {actions.map((action, i) => (
            <Link
              key={i}
              to={action.href}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                ...(action.primary ? {
                  background: color,
                  color: 'white'
                } : {
                  background: 'transparent',
                  color: color,
                  border: `1px solid ${color}30`
                })
              }}
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
