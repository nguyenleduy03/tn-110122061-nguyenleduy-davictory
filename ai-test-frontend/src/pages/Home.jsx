import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, PlusCircle, Play, ArrowRight, Cpu, CheckCircle2, Zap,
  Star, ShieldCheck, Lock, Pencil, Mic, Languages, BookOpen
} from 'lucide-react';
import { writingApi } from '../api/writingApi';
import { useAuth } from '../context/AuthContext';
import { ROLE_RANK } from '../api/authApi';

const ROLE_VI = {
  STUDENT: 'Học viên',
  TEACHER: 'Giáo viên',
  MANAGER: 'Quản lý',
  ADMIN: 'Quản trị viên',
};

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [homeStats, setHomeStats] = useState(null);

  useEffect(() => {
    writingApi.getHomeStats()
      .then(res => setHomeStats(res.data))
      .catch(() => {});
  }, []);

  const displayName = user?.fullName || user?.username || 'bạn';
  const userRole = (() => {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const names = roles.map(r => typeof r === 'string' ? r : (r?.name || ''));
    const ranked = names.filter(n => ROLE_RANK[n] != null);
    ranked.sort((a, b) => (ROLE_RANK[b] ?? 0) - (ROLE_RANK[a] ?? 0));
    return ranked[0] || '';
  })();
  const roleDisplay = ROLE_VI[userRole] || userRole;

  const totalTests = homeStats?.totalTests ?? 0;
  const totalGradings = homeStats?.totalGradings ?? 0;
  const totalUsage = totalGradings;

  const stats = [
    {
      label: 'ĐỀ THI ĐÃ TẠO',
      value: totalTests.toLocaleString('vi-VN'),
      trend: '— Tổng số đề thi trong hệ thống',
      icon: Cpu,
      color: '#6366f1',
      bg: '#f5f3ff',
    },
    {
      label: 'BÀI LÀM ĐÃ CHẤM',
      value: totalGradings.toLocaleString('vi-VN'),
      trend: '— Tổng số bài đã chấm AI',
      icon: CheckCircle2,
      color: '#10b981',
      bg: '#ecfdf5',
    },
    {
      label: 'LƯỢT SỬ DỤNG AI',
      value: totalUsage.toLocaleString('vi-VN'),
      trend: '— Tổng lượt sử dụng AI',
      icon: Zap,
      color: '#f59e0b',
      bg: '#fff7ed',
    },
    {
      label: 'ĐỘ CHÍNH XÁC',
      value: '96.7%',
      trend: '— Không đổi',
      icon: Star,
      color: '#3b82f6',
      bg: '#eff6ff',
    },
  ];

  const features = [
    {
      title: 'IELTS Writing AI',
      desc: 'Chấm điểm bài viết theo 4 tiêu chí IELTS, phát hiện lỗi và gợi ý cải thiện chi tiết.',
      icon: Pencil,
      link: '/writing',
      color: '#4f46e5',
      bg: '#f5f3ff',
    },
    {
      title: 'IELTS Speaking AI',
      desc: 'Luyện nói cùng AI, nhận phản hồi tức thì về phát âm, từ vựng, ngữ pháp và độ lưu loát.',
      icon: Mic,
      link: '/speaking',
      color: '#10b981',
      bg: '#ecfdf5',
    },
    {
      title: 'Grammar Checker',
      desc: 'Kiểm tra ngữ pháp, chính tả và phong cách viết đa ngôn ngữ bằng AI.',
      icon: Languages,
      link: '/grammar',
      color: '#f59e0b',
      bg: '#fff7ed',
    },
    {
      title: 'Test Library',
      desc: 'Kho đề thi mẫu và tài liệu luyện tập đa dạng cho mọi trình độ IELTS.',
      icon: BookOpen,
      link: '/tests',
      color: '#3b82f6',
      bg: '#eff6ff',
    },
  ];

  return (
    <div style={{ padding: '4px 0 24px' }}>
      {/* Hero Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #f5f3ff 0%, #f0f7ff 100%)',
        border: '1px solid #e2e8f0',
        borderRadius: 24,
        padding: '48px 48px',
        marginBottom: 32,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 32,
        boxShadow: '0 10px 30px rgba(79, 70, 229, 0.02)'
      }}>
        {/* Decorative subtle glows */}
        <div style={{
          position: 'absolute', top: '-10%', right: '10%', width: 350, height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', left: '30%', width: 250, height: 250,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Hero Left Content */}
        <div style={{ position: 'relative', zIndex: 2, flex: '1 1 50%' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#fef3c7',
            padding: '6px 16px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            color: '#d97706',
            marginBottom: 20
          }}>
            👋 Xin chào, {displayName}{roleDisplay ? ` — ${roleDisplay}` : ''}
          </div>

          <h1 style={{
            fontSize: 38,
            fontWeight: 800,
            color: '#0f172a',
            marginBottom: 16,
            letterSpacing: '-0.025em',
            lineHeight: 1.25
          }}>
            Chào mừng trở lại với<br />
            <span style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              DAVictory AI Test Center
            </span>
          </h1>

          <p style={{
            fontSize: 15,
            color: '#475569',
            maxWidth: 480,
            marginBottom: 32,
            lineHeight: 1.6,
            fontWeight: 500
          }}>
            Nền tảng đánh giá và luyện thi IELTS ứng dụng AI thông minh, chính xác và bảo mật.
          </p>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => navigate('/writing')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(79, 70, 229, 0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(79, 70, 229, 0.25)'; }}
            >
              Tạo đề thi mới
              <PlusCircle size={16} />
            </button>

            <button
              onClick={() => navigate('/tests')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 12,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            >
              Xem hướng dẫn
              <Play size={14} style={{ fill: '#475569' }} />
            </button>
          </div>
        </div>

        {/* Hero Right Graphic Mockup */}
        <div style={{
          position: 'relative',
          flex: '1 1 45%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '240px',
          zIndex: 2
        }}>
          {/* Beautiful Dashboard Window Mockup */}
          <div style={{
            width: '280px',
            height: '180px',
            background: '#ffffff',
            borderRadius: 16,
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)',
            border: '1px solid #e2e8f0',
            position: 'absolute',
            top: '20px',
            left: '20px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Window bar */}
            <div style={{
              height: '14px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px',
              gap: '4px'
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#eab308' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
            </div>
            {/* Window Content */}
            <div style={{ flex: 1, padding: 12, display: 'flex', gap: 10 }}>
              {/* Fake Sidebar Representation */}
              <div style={{ width: '36px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: 2, width: '100%' }} />
                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: 2, width: '80%' }} />
                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: 2, width: '90%' }} />
              </div>
              {/* Fake Dashboard Main Layout */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: '10px', background: '#f1f5f9', borderRadius: 3, width: '50%' }} />
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 4, paddingBottom: 4 }}>
                  <div style={{ height: '30%', width: '16%', background: '#c7d2fe', borderRadius: '2px 2px 0 0' }} />
                  <div style={{ height: '55%', width: '16%', background: '#c7d2fe', borderRadius: '2px 2px 0 0' }} />
                  <div style={{ height: '40%', width: '16%', background: '#c7d2fe', borderRadius: '2px 2px 0 0' }} />
                  <div style={{ height: '75%', width: '16%', background: '#818cf8', borderRadius: '2px 2px 0 0' }} />
                  <div style={{ height: '90%', width: '16%', background: '#4f46e5', borderRadius: '2px 2px 0 0' }} />
                  <div style={{ height: '60%', width: '16%', background: '#818cf8', borderRadius: '2px 2px 0 0' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Floating Overall Score Card */}
          <div style={{
            width: '90px',
            height: '90px',
            background: '#ffffff',
            borderRadius: 14,
            boxShadow: '0 12px 24px rgba(79, 70, 229, 0.08)',
            border: '1px solid #e2e8f0',
            position: 'absolute',
            top: '-20px',
            right: '40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 8
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Overall Score</span>
            <div style={{ position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
              <svg width="44" height="44" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="2.5"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2.5"
                  strokeDasharray="83, 100"
                />
              </svg>
              <span style={{ position: 'absolute', fontSize: 11, fontWeight: 800, color: '#0f172a' }}>7.5</span>
            </div>
          </div>

          {/* Floating AI Microchip Card */}
          <div style={{
            width: '42px',
            height: '42px',
            background: 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)',
            borderRadius: 10,
            boxShadow: '0 8px 16px rgba(79, 70, 229, 0.2)',
            position: 'absolute',
            bottom: '10px',
            right: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Cpu size={20} />
          </div>

          {/* Floating Done Check Circle */}
          <div style={{
            width: '28px',
            height: '28px',
            background: '#10b981',
            borderRadius: '50%',
            boxShadow: '0 6px 12px rgba(16, 185, 129, 0.3)',
            position: 'absolute',
            top: '70px',
            right: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <CheckCircle2 size={16} />
          </div>
        </div>
      </div>

      {/* Row of 4 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.02)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.01)';
              }}
            >
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: s.bg,
                color: s.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{s.value}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginTop: 1 }}>{s.trend}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explore Section Title */}
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>
        Khám phá tính năng AI
      </h2>

      {/* Explore 4 Features Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {features.map(f => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              onClick={() => navigate(f.link)}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '24px 24px 28px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.03)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.01)';
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: f.bg,
                color: f.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18
              }}>
                <Icon size={20} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.6, marginBottom: 20, flex: 1 }}>{f.desc}</p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: f.color,
                fontSize: 13,
                fontWeight: 700,
                transition: 'gap 0.2s'
              }}
                onMouseEnter={e => e.currentTarget.style.gap = '10px'}
                onMouseLeave={e => e.currentTarget.style.gap = '6px'}
              >
                {f.title.includes('Library') ? 'Khám phá ngay' : 'Bắt đầu ngay'}
                <ArrowRight size={14} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Cards Row (2 wide cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{
          background: '#fcfdff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)'
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#eef2ff',
            color: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Đánh giá tức thì, chính xác</h3>
            <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              AI được huấn luyện chuyên sâu theo tiêu chí IELTS chính thức, đảm bảo kết quả chấm điểm nhanh chóng và đáng tin cậy.
            </p>
          </div>
        </div>

        <div style={{
          background: '#fcfdff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)'
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#ecfdf5',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Lock size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Bảo mật & Riêng tư</h3>
            <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Dữ liệu của bạn được mã hóa và bảo vệ tuyệt đối. Chúng tôi cam kết không chia sẻ thông tin với bên thứ ba.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
