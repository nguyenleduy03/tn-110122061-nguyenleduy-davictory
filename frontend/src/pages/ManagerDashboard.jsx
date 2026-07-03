import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle, ArrowUpRight, BookCheck, Clock3, Users, UserSquare2,
    School, BarChart3, PieChart as PieChartIcon, TrendingUp, Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import ManagerLayout from '../components/manager/ManagerLayout';
import { authApi } from '../services/authApi';
import { teacherApi } from '../services/teacherApi';

export default function ManagerDashboard() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [classes, setClasses] = useState([]);
    const [submissions, setSubmissions] = useState([]);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                setLoading(true);
                setError('');
                const [classRes, subRes] = await Promise.all([
                    authApi.getMyClassManagement(),
                    teacherApi.getAllSubmissions().catch(() => ({ writingSubmissions: [], examAttempts: [] })),
                ]);
                if (!mounted) return;
                setClasses(Array.isArray(classRes?.classes) ? classRes.classes : []);
                const merged = [
                    ...((subRes?.writingSubmissions || []).map(s => ({ ...s, type: 'WRITING' }))),
                    ...((subRes?.examAttempts || []).map(a => ({ ...a, type: a.examType || 'EXAM' }))),
                ];
                setSubmissions(merged);
            } catch (e) {
                if (!mounted) return;
                setError(e?.response?.data?.message || 'Lỗi tải dữ liệu');
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    const s = useMemo(() => {
        const totalStudents = classes.reduce((sum, c) => sum + (c.activeStudentCount || c.studentCount || 0), 0);
        const pending = submissions.filter(s => s.status === 'SUBMITTED').length;
        const graded = submissions.filter(s => s.status === 'GRADED').length;
        return {
            active: classes.filter(c => c.status === 'ACTIVE').length,
            upcoming: classes.filter(c => c.status === 'UPCOMING').length,
            completed: classes.filter(c => c.status === 'COMPLETED').length,
            total: classes.length,
            totalStudents,
            totalTeachers: classes.reduce((set, c) => {
                (c.teachers || []).forEach(t => set.add(t.id));
                return set;
            }, new Set()).size,
            pending,
            graded,
        };
    }, [classes, submissions]);

    const BAR_COLORS = ['#6366f1', '#818cf8', '#3b82f6', '#60a5fa', '#8b5cf6'];

    const statusData = useMemo(() => [
        { n: 'Đang hoạt động', v: s.active, c: '#10b981' },
        { n: 'Sắp diễn ra', v: s.upcoming, c: '#f59e0b' },
        { n: 'Đã kết thúc', v: s.completed, c: '#94a3b8' },
    ].filter(d => d.v > 0), [s]);

    const topClasses = useMemo(() =>
        [...classes].sort((a, b) => (b.activeStudentCount || b.studentCount || 0) - (a.activeStudentCount || a.studentCount || 0))
            .slice(0, 5).map((c, i) => ({ n: c.name?.length > 14 ? c.name.slice(0, 14) + '..' : c.name, v: c.activeStudentCount || c.studentCount || 0, fill: BAR_COLORS[i] })),
        [classes]);

    const submitData = useMemo(() => [
        { n: 'Chờ xử lý', v: s.pending, c: '#f59e0b' },
        { n: 'Đã chấm', v: s.graded, c: '#10b981' },
    ].filter(d => d.v > 0), [submissions, s]);

    const pct = submissions.length ? Math.round((s.graded / submissions.length) * 100) : 0;

    return (
        <ManagerLayout title="Bảng quản lý" subtitle="Giám sát vận hành hệ thống">
            <div className="md-wrap">
                <div className="md-stats">
                    <StatCard icon={BookCheck} label="Đang hoạt động" value={s.active} hint={`${s.upcoming} sắp diễn ra`} color="#10b981" bg="#f0fdf4" />
                    <StatCard icon={School} label="Tổng lớp" value={s.total} hint={`${s.completed} đã kết thúc`} color="#6366f1" bg="#eef2ff" />
                    <StatCard icon={Users} label="Học viên" value={s.totalStudents} hint="Đang theo học" color="#3b82f6" bg="#eff6ff" />
                    <StatCard icon={UserSquare2} label="Giảng viên" value={s.totalTeachers} hint="Toàn hệ thống" color="#8b5cf6" bg="#f5f3ff" />
                    <StatCard icon={Clock3} label="Chờ xử lý" value={s.pending} hint={s.pending > 0 ? 'Cần xử lý' : 'Không có'} color="#f59e0b" bg="#fff7ed" warn={s.pending > 0} />
                    <StatCard icon={TrendingUp} label="Tỷ lệ chấm" value={`${pct}%`} hint={`${s.graded}/${submissions.length} bài`} color="#10b981" bg="#f0fdf4" />
                </div>

                {loading && <p className="manager-muted" style={{ textAlign: 'center', padding: 16 }}>Đang tải...</p>}
                {!loading && error && <div className="manager-panel manager-alert danger" style={{ padding: 10 }}><AlertTriangle size={16} /><p>{error}</p></div>}

                {!loading && !error && (
                    <div className="md-charts">
                        <ChartCard title="Top lớp đông nhất" icon={<BarChart3 size={14} />} link="/manager/classes">
                            {topClasses.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topClasses} layout="vertical" margin={{ left: 0, right: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis type="number" tick={{ fontSize: 10 }} />
                                        <YAxis type="category" dataKey="n" tick={{ fontSize: 10 }} width={80} axisLine={false} />
                                        <Tooltip />
                                        <Bar dataKey="v" radius={[0, 4, 4, 0]}>
                                            {topClasses.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <p className="manager-muted">Chưa có dữ liệu</p>}
                        </ChartCard>

                        <ChartCard title="Trạng thái lớp" icon={<PieChartIcon size={14} />}>
                            {statusData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={24} outerRadius={44}
                                            dataKey="v" nameKey="n" label={({ n, v }) => `${n}: ${v}`}>
                                            {statusData.map((e, i) => <Cell key={i} fill={e.c} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <p className="manager-muted">Chưa có dữ liệu</p>}
                        </ChartCard>

                        <ChartCard title="Tình trạng bài làm" icon={<Clock3 size={14} />}>
                            {submitData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={submitData} cx="50%" cy="50%" outerRadius={40}
                                            dataKey="v" nameKey="n" label={({ n, v }) => `${n}: ${v}`}>
                                            {submitData.map((e, i) => <Cell key={i} fill={e.c} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <p className="manager-muted">Chưa có bài nộp</p>}
                        </ChartCard>

                        <ChartCard title="Truy cập nhanh" icon={<Activity size={14} />}>
                            <div className="md-quick-links">
                                <QuickLink to="/manager/classes" label="Lớp & giảng viên" icon={<School size={14} />} />
                                <QuickLink to="/manager/operations" label={`Chờ xử lý (${s.pending})`} icon={<Clock3 size={14} />} warn={s.pending > 0} />
                                <QuickLink to="/admin/teacher-class" label="Quản lý lớp" icon={<BookCheck size={14} />} />
                            </div>
                        </ChartCard>
                    </div>
                )}
            </div>
        </ManagerLayout>
    );
}

function StatCard({ icon: Icon, label, value, hint, color, bg, warn }) {
    return (
        <div className={`md-stat-card${warn ? ' warn' : ''}`}>
            <div className="md-stat-content">
                <span className="md-stat-label">{label}</span>
                <span className="md-stat-value">{value}</span>
                <span className="md-stat-hint">{hint}</span>
            </div>
            <div className="md-stat-icon" style={{ background: bg, color }}>
                <Icon size={20} />
            </div>
        </div>
    );
}

function ChartCard({ title, icon, link, children }) {
    return (
        <div className="md-chart-card">
            <div className="md-chart-head">
                <div className="md-chart-title">
                    {icon}
                    <span>{title}</span>
                </div>
                {link && <Link to={link} className="md-chart-link">Xem <ArrowUpRight size={12} /></Link>}
            </div>
            <div className="md-chart-body">{children}</div>
        </div>
    );
}

function QuickLink({ to, label, icon, warn }) {
    return (
        <Link to={to} className={`md-quick-link${warn ? ' warn' : ''}`}>
            {icon}
            <span>{label}</span>
        </Link>
    );
}
