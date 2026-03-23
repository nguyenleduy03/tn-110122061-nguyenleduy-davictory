import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowUpRight,
    BookCheck,
    Clock3,
    Users,
    UserSquare2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ManagerLayout from '../components/manager/ManagerLayout';
import { authApi } from '../services/authApi';
import { teacherApi } from '../services/teacherApi';

const hasManagerRole = (roles) => {
    if (!Array.isArray(roles)) return false;
    return roles.includes('MANAGER') || roles.includes('ADMIN');
};

export default function ManagerDashboard() {
    const currentUser = authApi.getStoredUser();
    const canAccess = hasManagerRole(currentUser?.roles || []);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [submissions, setSubmissions] = useState([]);

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            try {
                setLoading(true);
                setError('');

                const [classRes, submissionRes] = await Promise.all([
                    authApi.getMyClassManagement(),
                    teacherApi.getAllSubmissions().catch(() => ({ writingSubmissions: [], examAttempts: [] })),
                ]);

                if (!mounted) return;

                setClasses(Array.isArray(classRes?.classes) ? classRes.classes : []);
                setTeachers(Array.isArray(classRes?.teachers) ? classRes.teachers : []);

                const merged = [
                    ...((submissionRes?.writingSubmissions || []).map((s) => ({ ...s, type: 'WRITING' }))),
                    ...((submissionRes?.examAttempts || []).map((a) => ({ ...a, type: a.examType || 'EXAM' }))),
                ];
                setSubmissions(merged);
            } catch (e) {
                if (!mounted) return;
                setError(e?.response?.data?.message || 'Không thể tải dữ liệu manager dashboard');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadData();
        return () => {
            mounted = false;
        };
    }, []);

    const stats = useMemo(() => {
        const activeClasses = classes.filter((c) => c.status === 'ACTIVE').length;
        const totalStudents = classes.reduce((sum, c) => sum + (c.activeStudentCount || c.studentCount || 0), 0);
        const pending = submissions.filter((s) => s.status === 'SUBMITTED').length;
        const graded = submissions.filter((s) => s.status === 'GRADED').length;

        return {
            totalClasses: classes.length,
            activeClasses,
            totalStudents,
            totalTeachers: teachers.length,
            pending,
            graded,
        };
    }, [classes, teachers, submissions]);

    const spotlightClasses = useMemo(() => {
        return [...classes]
            .sort((a, b) => (b.activeStudentCount || b.studentCount || 0) - (a.activeStudentCount || a.studentCount || 0))
            .slice(0, 5);
    }, [classes]);

    if (!canAccess) {
        return (
            <ManagerLayout title="Bảng quản lý" subtitle="Không gian điều phối vận hành">
                <section className="manager-panel manager-alert">
                    <h2>Không có quyền truy cập</h2>
                    <p>Trang này yêu cầu quyền MANAGER hoặc ADMIN.</p>
                    <Link className="manager-link-btn" to="/">
                        Về trang chủ
                    </Link>
                </section>
            </ManagerLayout>
        );
    }

    return (
        <ManagerLayout
            title="Bảng quản lý"
            subtitle="Giám sát lớp học, bài nộp và hiệu suất vận hành theo thời gian thực"
        >
            <section className="manager-kpis">
                <KpiCard icon={BookCheck} label="Lớp đang hoạt động" value={stats.activeClasses} hint={`Tổng ${stats.totalClasses} lớp`} />
                <KpiCard icon={Users} label="Học viên" value={stats.totalStudents} hint="Đang theo học" />
                <KpiCard icon={UserSquare2} label="Giảng viên" value={stats.totalTeachers} hint="Có trong phạm vi quản lý" />
                <KpiCard icon={Clock3} label="Bài chờ xử lý" value={stats.pending} hint={`${stats.graded} bài đã chấm`} warning={stats.pending > 0} />
            </section>

            {loading && (
                <section className="manager-panel">
                    <p>Đang tải dữ liệu vận hành...</p>
                </section>
            )}

            {!loading && error && (
                <section className="manager-panel manager-alert danger">
                    <AlertTriangle size={18} />
                    <p>{error}</p>
                </section>
            )}

            {!loading && !error && (
                <>
                    <section className="manager-grid">
                        <article className="manager-panel">
                            <div className="manager-panel-head">
                                <h3>Lớp trọng điểm</h3>
                                <Link to="/manager/classes" className="manager-text-link">
                                    Mở quản lý lớp <ArrowUpRight size={14} />
                                </Link>
                            </div>

                            {spotlightClasses.length === 0 ? (
                                <p className="manager-muted">Chưa có dữ liệu lớp.</p>
                            ) : (
                                <div className="manager-table-wrap">
                                    <table className="manager-table">
                                        <thead>
                                            <tr>
                                                <th>Lớp</th>
                                                <th>Mã</th>
                                                <th>Học viên</th>
                                                <th>Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {spotlightClasses.map((c) => (
                                                <tr key={c.id}>
                                                    <td>{c.name}</td>
                                                    <td>{c.code || c.classCode || '—'}</td>
                                                    <td>{c.activeStudentCount || c.studentCount || 0}</td>
                                                    <td>
                                                        <span className={`manager-pill ${String(c.status || '').toLowerCase()}`}>
                                                            {c.status || 'UNKNOWN'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </article>

                        <article className="manager-panel">
                            <div className="manager-panel-head">
                                <h3>Điều phối nhanh</h3>
                            </div>
                            <div className="manager-actions">
                                <Link to="/manager/classes" className="manager-action-card">
                                    <h4>Điều phối lớp & giảng viên</h4>
                                    <p>Gán giảng viên, bàn giao danh sách học viên, theo dõi quy mô lớp.</p>
                                </Link>
                                <Link to="/manager/operations" className="manager-action-card">
                                    <h4>Ưu tiên bài nộp chờ chấm</h4>
                                    <p>Xử lý bài nộp tồn, giảm thời gian phản hồi cho học viên.</p>
                                </Link>
                                <Link to="/manager/reports" className="manager-action-card">
                                    <h4>Theo dõi chất lượng học tập</h4>
                                    <p>Xem xu hướng tiến bộ theo kỹ năng và tải giảng viên.</p>
                                </Link>
                            </div>
                        </article>
                    </section>
                </>
            )}
        </ManagerLayout>
    );
}

function KpiCard({ icon: Icon, label, value, hint, warning = false }) {
    return (
        <article className={`manager-kpi-card${warning ? ' warning' : ''}`}>
            <div className="manager-kpi-top">
                <Icon size={17} />
                <span>{label}</span>
            </div>
            <div className="manager-kpi-value">{value}</div>
            <p className="manager-kpi-hint">{hint}</p>
        </article>
    );
}
