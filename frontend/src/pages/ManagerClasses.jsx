import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { School, Search, Users, CalendarClock } from 'lucide-react';
import ManagerLayout from '../components/manager/ManagerLayout';
import { authApi } from '../services/authApi';

export default function ManagerClasses() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [classes, setClasses] = useState([]);
    const [keyword, setKeyword] = useState('');

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                setLoading(true);
                const res = await authApi.getMyClassManagement();
                if (!mounted) return;
                setClasses(Array.isArray(res?.classes) ? res.classes : []);
            } catch (e) {
                if (!mounted) return;
                setError(e?.response?.data?.message || 'Không thể tải danh sách lớp');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, []);

    const filteredClasses = useMemo(() => {
        const q = keyword.trim().toLowerCase();
        if (!q) return classes;
        return classes.filter((c) => {
            return `${c.name || ''} ${c.code || ''} ${c.classCode || ''}`.toLowerCase().includes(q);
        });
    }, [classes, keyword]);

    return (
        <ManagerLayout title="Quản lý tổng quát lớp học" subtitle="Manager kiểm soát toàn bộ lớp trong hệ thống">
            <section className="manager-panel">
                <div className="manager-panel-head">
                    <h3>Toàn bộ lớp học</h3>
                    <div className="manager-search-wrap">
                        <Search size={14} />
                        <input
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="Tìm theo tên lớp hoặc mã lớp"
                            className="manager-search-input"
                        />
                    </div>
                </div>

                {loading && <p className="manager-muted">Đang tải dữ liệu lớp...</p>}
                {!loading && error && <p className="manager-error-text">{error}</p>}

                {!loading && !error && (
                    <div className="manager-table-wrap">
                        <table className="manager-table">
                            <thead>
                                <tr>
                                    <th>Lớp học</th>
                                    <th>Mã lớp</th>
                                    <th>Sĩ số active</th>
                                    <th>Trạng thái</th>
                                    <th>Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClasses.map((c) => {
                                    const classKey = c.id ?? c.classCode ?? c.code;
                                    return (
                                        <tr key={String(classKey)}>
                                            <td>{c.name || 'N/A'}</td>
                                            <td>{c.code || c.classCode || '—'}</td>
                                            <td>{c.activeStudentCount || c.studentCount || 0}</td>
                                            <td>
                                                <span className={`manager-pill ${String(c.status || '').toLowerCase()}`}>
                                                    {c.status || 'UNKNOWN'}
                                                </span>
                                            </td>
                                            <td>
                                                <Link to={`/manager/classes/${encodeURIComponent(String(classKey))}`} className="manager-text-link">
                                                    Xem lớp
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredClasses.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="manager-empty-cell">Không có lớp phù hợp bộ lọc.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="manager-kpis compact">
                <article className="manager-kpi-card">
                    <div className="manager-kpi-top"><School size={16} /><span>Tổng lớp</span></div>
                    <div className="manager-kpi-value">{classes.length}</div>
                </article>
                <article className="manager-kpi-card">
                    <div className="manager-kpi-top"><Users size={16} /><span>Học viên active</span></div>
                    <div className="manager-kpi-value">{classes.reduce((sum, c) => sum + Number(c.activeStudentCount || c.studentCount || 0), 0)}</div>
                </article>
                <article className="manager-kpi-card">
                    <div className="manager-kpi-top"><CalendarClock size={16} /><span>Lớp active</span></div>
                    <div className="manager-kpi-value">{classes.filter((c) => c.status === 'ACTIVE').length}</div>
                </article>
            </section>
        </ManagerLayout>
    );
}
