import React, { useEffect, useState } from 'react';
import {
  Users, BookOpen, GraduationCap, FileText, BarChart3, Activity,
  Loader2, RefreshCcw, Headphones, BookOpenText, PenLine, Mic
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import AdminLayout from '../components/admin/AdminLayout';
import { authApi } from '../services/authApi';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const SKILL_CONFIG = {
  listening: { label: 'Nghe', icon: Headphones, color: '#3b82f6', bg: '#eff6ff' },
  reading: { label: 'Đọc', icon: BookOpenText, color: '#22c55e', bg: '#f0fdf4' },
  writing: { label: 'Viết', icon: PenLine, color: '#f59e0b', bg: '#fff7ed' },
  speaking: { label: 'Nói', icon: Mic, color: '#ec4899', bg: '#fdf2f8' },
};

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await authApi.get('/admin/analytics/all?days=7');
      setData(res.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setData({
        summary: {}, userDistribution: [], dashStats: {},
        timeSeries: { registrations: [], logins: [] },
        scoreDistribution: [], skillAverages: {}
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <AdminLayout title="Báo cáo & Thống kê" subtitle="Tổng quan hệ thống">
        <div className="admin-loading"><Loader2 size={32} className="admin-spin" /></div>
      </AdminLayout>
    );
  }

  const {
    summary = {},
    userDistribution = [],
    dashStats = {},
    timeSeries = { registrations: [], logins: [] },
    scoreDistribution = [],
    skillAverages = {}
  } = data;

  const avgBand = (
    (skillAverages.listening || 0) +
    (skillAverages.reading || 0) +
    (skillAverages.writing || 0) +
    (skillAverages.speaking || 0)
  ) / 4;

  const skillData = [
    { name: 'Nghe', score: skillAverages.listening || 0, key: 'listening' },
    { name: 'Đọc', score: skillAverages.reading || 0, key: 'reading' },
    { name: 'Viết', score: skillAverages.writing || 0, key: 'writing' },
    { name: 'Nói', score: skillAverages.speaking || 0, key: 'speaking' },
  ];

  return (
    <AdminLayout title="Báo cáo & Thống kê" subtitle="Tổng quan hệ thống">
      <div className="analytics-root">
        <div className="analytics-filter">
          <button onClick={fetchAll} className="admin-btn ghost small">
            <RefreshCcw size={14} /> Làm mới
          </button>
        </div>

        <div className="analytics-stats">
          <StatCard icon={GraduationCap} label="Học viên" value={summary?.totalStudents ?? 0} color="blue" />
          <StatCard icon={Users} label="Giáo viên" value={summary?.totalTeachers ?? 0} color="green" />
          <StatCard icon={FileText} label="Đề thi" value={dashStats?.totalTests ?? 0} color="orange" />
          <StatCard icon={Activity} label="Lượt làm bài" value={dashStats?.totalAttempts ?? 0} color="pink" />
          <StatCard icon={BarChart3} label="Điểm IELTS TB" value={avgBand ? avgBand.toFixed(1) : 0} color="purple" />
          <StatCard icon={BookOpen} label="Đăng ký hôm nay" value={summary?.registrationsToday ?? 0} color="cyan" />
        </div>

        <div className="analytics-skills-row">
          {skillData.map(s => {
            const cfg = SKILL_CONFIG[s.key];
            const pct = Math.min((s.score / 9) * 100, 100);
            return (
              <div key={s.key} className="analytics-skill-item">
                <div className="analytics-skill-header">
                  <div className="analytics-skill-icon" style={{ background: cfg.bg, color: cfg.color }}>
                    <cfg.icon size={14} />
                  </div>
                  <span className="analytics-skill-name">{cfg.label}</span>
                </div>
                <div className="analytics-skill-score" style={{ color: cfg.color }}>{s.score}</div>
                <div className="analytics-skill-bar-bg">
                  <div className="analytics-skill-bar-fill" style={{ width: `${pct}%`, background: cfg.color }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="analytics-charts">
          <div className="analytics-chart-card">
            <div className="analytics-chart-title">Phân bố điểm IELTS</div>
            <div className="analytics-chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="band" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="analytics-chart-card">
            <div className="analytics-chart-title">Phân bố người dùng</div>
            <div className="analytics-chart-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={userDistribution} cx="50%" cy="50%" outerRadius={65} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}>
                    {userDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="analytics-charts">
          <div className="analytics-chart-card">
            <div className="analytics-chart-title">Đăng ký 7 ngày qua</div>
            <div className="analytics-chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries?.registrations || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="analytics-chart-card">
            <div className="analytics-chart-title">Điểm trung bình 4 kỹ năng</div>
            <div className="analytics-chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 9]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={50} />
                  <Tooltip />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {skillData.map((entry, i) => (
                      <Cell key={i} fill={SKILL_CONFIG[entry.key]?.color || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="analytics-stat">
      <div className={`analytics-stat-icon ${color}`}><Icon size={18} /></div>
      <div>
        <div className="analytics-stat-label">{label}</div>
        <div className="analytics-stat-value">{value}</div>
      </div>
    </div>
  );
}
