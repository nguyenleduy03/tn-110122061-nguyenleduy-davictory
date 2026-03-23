import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, CheckCircle2 } from 'lucide-react';
import ManagerLayout from '../components/manager/ManagerLayout';
import { teacherApi } from '../services/teacherApi';

export default function ManagerOperations() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submissions, setSubmissions] = useState([]);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                setLoading(true);
                const data = await teacherApi.getAllSubmissions();
                if (!mounted) return;

                const merged = [
                    ...((data?.writingSubmissions || []).map((s) => ({ ...s, type: 'WRITING' }))),
                    ...((data?.examAttempts || []).map((a) => ({ ...a, type: a.examType || 'EXAM' }))),
                ].sort((a, b) => new Date(b.submittedAt || b.startedAt) - new Date(a.submittedAt || a.startedAt));

                setSubmissions(merged);
            } catch (e) {
                if (!mounted) return;
                setError(e?.response?.data?.message || 'Không thể tải dữ liệu vận hành');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, []);

    const pending = useMemo(() => submissions.filter((s) => s.status === 'SUBMITTED'), [submissions]);

    return (
        <ManagerLayout title="Điều phối vận hành" subtitle="Theo dõi hàng đợi xử lý bài nộp toàn hệ thống">
            <section className="manager-kpis compact">
                <article className="manager-kpi-card warning">
                    <div className="manager-kpi-top"><Clock3 size={16} /><span>Chờ xử lý</span></div>
                    <div className="manager-kpi-value">{pending.length}</div>
                    <p className="manager-kpi-hint">Bài nộp đang ở trạng thái SUBMITTED</p>
                </article>
                <article className="manager-kpi-card">
                    <div className="manager-kpi-top"><CheckCircle2 size={16} /><span>Đã chấm</span></div>
                    <div className="manager-kpi-value">{submissions.filter((s) => s.status === 'GRADED').length}</div>
                    <p className="manager-kpi-hint">Đã có điểm và phản hồi</p>
                </article>
            </section>

            <section className="manager-panel">
                <div className="manager-panel-head">
                    <h3>Hàng đợi ưu tiên</h3>
                </div>

                {loading && <p className="manager-muted">Đang tải dữ liệu bài nộp...</p>}
                {!loading && error && <p className="manager-error-text">{error}</p>}

                {!loading && !error && (
                    <div className="manager-table-wrap">
                        <table className="manager-table">
                            <thead>
                                <tr>
                                    <th>Học viên</th>
                                    <th>Loại</th>
                                    <th>Bài làm</th>
                                    <th>Ngày nộp</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pending.slice(0, 50).map((s, idx) => (
                                    <tr key={`${s.id}-${idx}`}>
                                        <td>{s.username || 'N/A'}</td>
                                        <td>{s.type || 'N/A'}</td>
                                        <td>{s.groupTitle || s.examTitle || 'N/A'}</td>
                                        <td>{(s.submittedAt || s.startedAt) ? new Date(s.submittedAt || s.startedAt).toLocaleString('vi-VN') : '—'}</td>
                                        <td><span className="manager-pill upcoming">{s.status || 'SUBMITTED'}</span></td>
                                    </tr>
                                ))}
                                {pending.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="manager-empty-cell">Không có bài nộp đang chờ xử lý.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </ManagerLayout>
    );
}
