import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Save, BarChart3, Trophy, UsersRound } from 'lucide-react';
import ManagerLayout from '../components/manager/ManagerLayout';
import { authApi } from '../services/authApi';

export default function ManagerClassDetail() {
    const { id } = useParams();
    const decodedId = decodeURIComponent(id || '');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [classes, setClasses] = useState([]);
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState('');

    const selectedClass = useMemo(() => {
        return classes.find((c) => String(c.id) === decodedId || String(c.classCode) === decodedId || String(c.code) === decodedId) || null;
    }, [classes, decodedId]);

    const classAnalytics = useMemo(() => {
        if (!selectedClass) {
            return {
                totalStudents: 0,
                statusStats: [],
                monthlyEnrollments: [],
            };
        }

        const students = Array.isArray(selectedClass.students) ? selectedClass.students : [];
        const totalStudents = students.length;

        const statusCountMap = students.reduce((acc, student) => {
            const key = String(student?.status || 'UNKNOWN').toUpperCase();
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const statusStats = Object.entries(statusCountMap).map(([label, count]) => ({
            label,
            count,
            percent: totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0,
        }));

        const monthCountMap = {};
        students.forEach((student) => {
            if (!student?.enrolledAt) return;
            const date = new Date(student.enrolledAt);
            if (Number.isNaN(date.getTime())) return;

            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthCountMap[key] = (monthCountMap[key] || 0) + 1;
        });

        const monthlyEnrollments = Object.entries(monthCountMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([month, count]) => ({ month, count }));

        return {
            totalStudents,
            statusStats,
            monthlyEnrollments,
        };
    }, [selectedClass]);

    const scoreAnalytics = useMemo(() => {
        if (!selectedClass) {
            return {
                scoredStudents: [],
                averageBand: null,
                skillAverages: [],
                bandBuckets: [],
                topStudents: [],
            };
        }

        const students = Array.isArray(selectedClass.students) ? selectedClass.students : [];
        const toNumber = (value) => {
            const n = Number(value);
            return Number.isFinite(n) ? n : null;
        };

        const extractOverall = (student) => {
            const candidates = [
                student?.overallBandScore,
                student?.bandScore,
                student?.score,
                student?.currentBand,
                student?.averageScore,
            ];

            for (const item of candidates) {
                const v = toNumber(item);
                if (v !== null) return v;
            }

            return null;
        };

        const extractSkill = (student, skill) => {
            const map = {
                listening: ['listeningScore', 'listeningBand', 'listening'],
                reading: ['readingScore', 'readingBand', 'reading'],
                writing: ['writingScore', 'writingBand', 'writing'],
                speaking: ['speakingScore', 'speakingBand', 'speaking'],
            };

            const keys = map[skill] || [];
            for (const key of keys) {
                const v = toNumber(student?.[key]);
                if (v !== null) return v;
            }
            return null;
        };

        const scoredStudents = students
            .map((student) => {
                const listening = extractSkill(student, 'listening');
                const reading = extractSkill(student, 'reading');
                const writing = extractSkill(student, 'writing');
                const speaking = extractSkill(student, 'speaking');

                let overall = extractOverall(student);
                if (overall === null) {
                    const skillScores = [listening, reading, writing, speaking].filter((v) => v !== null);
                    if (skillScores.length > 0) {
                        overall = Number((skillScores.reduce((sum, v) => sum + v, 0) / skillScores.length).toFixed(1));
                    }
                }

                return {
                    id: student?.id,
                    name: student?.fullName || student?.username || 'N/A',
                    overall,
                    listening,
                    reading,
                    writing,
                    speaking,
                };
            })
            .filter((item) => item.overall !== null);

        const averageBand = scoredStudents.length
            ? Number((scoredStudents.reduce((sum, s) => sum + s.overall, 0) / scoredStudents.length).toFixed(2))
            : null;

        const skills = [
            { key: 'listening', label: 'Listening' },
            { key: 'reading', label: 'Reading' },
            { key: 'writing', label: 'Writing' },
            { key: 'speaking', label: 'Speaking' },
        ];

        const skillAverages = skills.map((skill) => {
            const values = scoredStudents.map((s) => s[skill.key]).filter((v) => v !== null);
            const avg = values.length
                ? Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2))
                : null;
            return { ...skill, avg };
        });

        const bands = [
            { label: '0-4.5', min: 0, max: 4.99 },
            { label: '5.0-5.5', min: 5, max: 5.99 },
            { label: '6.0-6.5', min: 6, max: 6.99 },
            { label: '7.0-7.5', min: 7, max: 7.99 },
            { label: '8.0-9.0', min: 8, max: 9.01 },
        ];

        const bandBuckets = bands.map((band) => {
            const count = scoredStudents.filter((s) => s.overall >= band.min && s.overall <= band.max).length;
            const percent = scoredStudents.length ? Math.round((count / scoredStudents.length) * 100) : 0;
            return { ...band, count, percent };
        });

        const topStudents = [...scoredStudents]
            .sort((a, b) => b.overall - a.overall)
            .slice(0, 5);

        return {
            scoredStudents,
            averageBand,
            skillAverages,
            bandBuckets,
            topStudents,
        };
    }, [selectedClass]);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                setLoading(true);
                setError('');
                const res = await authApi.getMyClassManagement();
                if (!mounted) return;
                const allClasses = Array.isArray(res?.classes) ? res.classes : [];
                setClasses(allClasses);
            } catch (e) {
                if (!mounted) return;
                setError(e?.response?.data?.message || 'Không thể tải chi tiết lớp');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!selectedClass) return;
        setNotes(selectedClass.notes || '');
        setStatus(selectedClass.status || '');
    }, [selectedClass]);

    const handleSave = async () => {
        if (!selectedClass?.id) return;
        try {
            setSaving(true);
            await authApi.updateClassInfo(selectedClass.id, {
                status,
                notes,
            });
            alert('Đã cập nhật thông tin lớp');
        } catch (e) {
            alert(e?.response?.data?.message || 'Cập nhật lớp thất bại');
        } finally {
            setSaving(false);
        }
    };

    const removeStudent = async (studentId) => {
        if (!selectedClass?.id) return;
        if (!window.confirm('Xác nhận xóa học viên khỏi lớp này?')) return;

        try {
            await authApi.removeStudentFromClass(selectedClass.id, studentId);
            setClasses((prev) => prev.map((c) => {
                if (c.id !== selectedClass.id) return c;
                const nextStudents = (c.students || []).filter((s) => s.id !== studentId);
                return {
                    ...c,
                    students: nextStudents,
                    studentCount: Math.max((c.studentCount || 0) - 1, 0),
                    activeStudentCount: Math.max((c.activeStudentCount || 0) - 1, 0),
                };
            }));
        } catch (e) {
            alert(e?.response?.data?.message || 'Không thể xóa học viên');
        }
    };

    return (
        <ManagerLayout title="Chi tiết lớp học" subtitle="Manager quản lý vận hành từng lớp">
            <section className="manager-panel" style={{ marginBottom: 12 }}>
                <Link to="/manager/classes" className="manager-text-link">
                    <ArrowLeft size={14} /> Quay lại danh sách lớp
                </Link>
            </section>

            {loading && <section className="manager-panel"><p className="manager-muted">Đang tải lớp...</p></section>}
            {!loading && error && <section className="manager-panel"><p className="manager-error-text">{error}</p></section>}

            {!loading && !error && !selectedClass && (
                <section className="manager-panel">
                    <p className="manager-muted">Không tìm thấy lớp cần xem.</p>
                </section>
            )}

            {!loading && !error && selectedClass && (
                <>
                    <section className="manager-grid" style={{ marginBottom: 12 }}>
                        <article className="manager-panel">
                            <div className="manager-panel-head">
                                <h3>{selectedClass.name || 'N/A'}</h3>
                                <span className={`manager-pill ${String(selectedClass.status || '').toLowerCase()}`}>
                                    {selectedClass.status || 'UNKNOWN'}
                                </span>
                            </div>

                            <div className="manager-table-wrap">
                                <table className="manager-table">
                                    <tbody>
                                        <tr><th>Mã lớp</th><td>{selectedClass.code || selectedClass.classCode || '—'}</td></tr>
                                        <tr><th>Sĩ số active</th><td>{selectedClass.activeStudentCount || selectedClass.studentCount || 0}</td></tr>
                                        <tr><th>Cấp độ</th><td>{selectedClass.level || 'N/A'}</td></tr>
                                        <tr><th>Mục tiêu band</th><td>{selectedClass.targetBand || 'N/A'}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </article>

                        <article className="manager-panel">
                            <div className="manager-panel-head">
                                <h3>Điều chỉnh thông tin vận hành</h3>
                            </div>
                            <div style={{ display: 'grid', gap: 10 }}>
                                <select value={status} onChange={(e) => setStatus(e.target.value)} className="manager-search-input" style={{ border: '1px solid #d7e7e3', borderRadius: 8, padding: 8 }}>
                                    <option value="">Chọn trạng thái</option>
                                    <option value="UPCOMING">UPCOMING</option>
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="COMPLETED">COMPLETED</option>
                                    <option value="ARCHIVED">ARCHIVED</option>
                                </select>
                                <textarea
                                    rows={5}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Ghi chú vận hành"
                                    style={{ border: '1px solid #d7e7e3', borderRadius: 8, padding: 8, resize: 'vertical' }}
                                />
                                <button className="manager-link-btn" onClick={handleSave} disabled={saving}>
                                    <Save size={14} style={{ marginRight: 6 }} /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </article>
                    </section>

                    <section className="manager-grid" style={{ marginBottom: 12 }}>
                        <article className="manager-panel">
                            <div className="manager-panel-head">
                                <h3><UsersRound size={16} style={{ marginRight: 6 }} /> Phân bố trạng thái học viên</h3>
                            </div>

                            {classAnalytics.totalStudents === 0 ? (
                                <p className="manager-muted">Chưa có dữ liệu học viên để hiển thị biểu đồ.</p>
                            ) : (
                                <div className="manager-chart-list">
                                    {classAnalytics.statusStats.map((item) => (
                                        <div className="manager-chart-row" key={item.label}>
                                            <div className="manager-chart-row-head">
                                                <span>{item.label}</span>
                                                <strong>{item.count} ({item.percent}%)</strong>
                                            </div>
                                            <div className="manager-chart-track">
                                                <div className="manager-chart-fill" style={{ width: `${item.percent}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </article>

                        <article className="manager-panel">
                            <div className="manager-panel-head">
                                <h3><BarChart3 size={16} style={{ marginRight: 6 }} /> Xu hướng ghi danh theo tháng</h3>
                            </div>

                            {classAnalytics.monthlyEnrollments.length === 0 ? (
                                <p className="manager-muted">Không có dữ liệu enrolledAt để dựng biểu đồ.</p>
                            ) : (
                                <div className="manager-bars">
                                    {classAnalytics.monthlyEnrollments.map((item) => {
                                        const maxCount = Math.max(...classAnalytics.monthlyEnrollments.map((m) => m.count), 1);
                                        const percent = Math.round((item.count / maxCount) * 100);
                                        return (
                                            <div className="manager-bar-item" key={item.month}>
                                                <div className="manager-bar-value">{item.count}</div>
                                                <div className="manager-bar-track">
                                                    <div className="manager-bar-fill" style={{ height: `${percent}%` }} />
                                                </div>
                                                <div className="manager-bar-label">{item.month}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </article>
                    </section>

                    <section className="manager-grid" style={{ marginBottom: 12 }}>
                        <article className="manager-panel">
                            <div className="manager-panel-head">
                                <h3><BarChart3 size={16} style={{ marginRight: 6 }} /> Phân bố điểm Band</h3>
                            </div>

                            {scoreAnalytics.scoredStudents.length === 0 ? (
                                <p className="manager-muted">Chưa có dữ liệu điểm để vẽ biểu đồ band.</p>
                            ) : (
                                <>
                                    <p className="manager-muted" style={{ marginBottom: 10 }}>
                                        Điểm trung bình lớp: <strong>{scoreAnalytics.averageBand}</strong>
                                    </p>
                                    <div className="manager-chart-list">
                                        {scoreAnalytics.bandBuckets.map((bucket) => (
                                            <div className="manager-chart-row" key={bucket.label}>
                                                <div className="manager-chart-row-head">
                                                    <span>{bucket.label}</span>
                                                    <strong>{bucket.count} ({bucket.percent}%)</strong>
                                                </div>
                                                <div className="manager-chart-track">
                                                    <div className="manager-chart-fill score" style={{ width: `${bucket.percent}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </article>

                        <article className="manager-panel">
                            <div className="manager-panel-head">
                                <h3><UsersRound size={16} style={{ marginRight: 6 }} /> Điểm TB theo kỹ năng</h3>
                            </div>

                            {scoreAnalytics.skillAverages.every((s) => s.avg === null) ? (
                                <p className="manager-muted">Chưa có dữ liệu điểm chi tiết 4 kỹ năng.</p>
                            ) : (
                                <div className="manager-chart-list">
                                    {scoreAnalytics.skillAverages.map((skill) => {
                                        const percent = skill.avg !== null ? Math.round((skill.avg / 9) * 100) : 0;
                                        return (
                                            <div className="manager-chart-row" key={skill.key}>
                                                <div className="manager-chart-row-head">
                                                    <span>{skill.label}</span>
                                                    <strong>{skill.avg !== null ? skill.avg : '—'}</strong>
                                                </div>
                                                <div className="manager-chart-track">
                                                    <div className="manager-chart-fill skill" style={{ width: `${percent}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </article>
                    </section>

                    <section className="manager-panel" style={{ marginBottom: 12 }}>
                        <div className="manager-panel-head">
                            <h3><Trophy size={16} style={{ marginRight: 6 }} /> Top học viên theo điểm</h3>
                        </div>

                        {scoreAnalytics.topStudents.length === 0 ? (
                            <p className="manager-muted">Chưa có dữ liệu điểm để xếp hạng.</p>
                        ) : (
                            <div className="manager-table-wrap">
                                <table className="manager-table">
                                    <thead>
                                        <tr>
                                            <th>Hạng</th>
                                            <th>Học viên</th>
                                            <th>Overall</th>
                                            <th>Listening</th>
                                            <th>Reading</th>
                                            <th>Writing</th>
                                            <th>Speaking</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scoreAnalytics.topStudents.map((student, idx) => (
                                            <tr key={student.id || `${student.name}-${idx}`}>
                                                <td>#{idx + 1}</td>
                                                <td>{student.name}</td>
                                                <td><strong>{student.overall}</strong></td>
                                                <td>{student.listening ?? '—'}</td>
                                                <td>{student.reading ?? '—'}</td>
                                                <td>{student.writing ?? '—'}</td>
                                                <td>{student.speaking ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    <section className="manager-panel">
                        <div className="manager-panel-head">
                            <h3>Danh sách học viên</h3>
                        </div>
                        <div className="manager-table-wrap">
                            <table className="manager-table">
                                <thead>
                                    <tr>
                                        <th>Mã HV</th>
                                        <th>Họ tên</th>
                                        <th>Email</th>
                                        <th>Trạng thái</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedClass.students || []).map((s) => (
                                        <tr key={s.id}>
                                            <td>{s.studentCode || s.username || '—'}</td>
                                            <td>{s.fullName || 'N/A'}</td>
                                            <td>{s.email || 'N/A'}</td>
                                            <td>{s.status || 'ACTIVE'}</td>
                                            <td>
                                                <button onClick={() => removeStudent(s.id)} className="manager-text-link" style={{ background: 'transparent', border: 0, cursor: 'pointer' }}>
                                                    Xóa khỏi lớp
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!selectedClass.students || selectedClass.students.length === 0) && (
                                        <tr><td colSpan={5} className="manager-empty-cell">Lớp chưa có học viên.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </ManagerLayout>
    );
}
