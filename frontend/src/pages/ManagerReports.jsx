import React, { useMemo } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import ManagerLayout from '../components/manager/ManagerLayout';
import { authApi } from '../services/authApi';

export default function ManagerReports() {
    const user = authApi.getStoredUser();

    const snapshots = useMemo(() => {
        return [
            { label: 'Tỷ lệ lớp active', value: 78 },
            { label: 'Tỷ lệ bài đúng hạn', value: 84 },
            { label: 'Mức hoàn thành học viên', value: 69 },
            { label: 'Chất lượng phản hồi', value: 81 },
        ];
    }, []);

    return (
        <ManagerLayout title="Báo cáo Manager" subtitle={`Phân tích nhanh cho ${user?.fullName || 'Manager'}`}>
            <section className="manager-panel" style={{ marginBottom: 12 }}>
                <div className="manager-panel-head">
                    <h3>Tổng quan hiệu suất</h3>
                </div>
                <div className="manager-report-bars">
                    {snapshots.map((item) => (
                        <div key={item.label} className="manager-report-item">
                            <div className="manager-report-label-wrap">
                                <span>{item.label}</span>
                                <span>{item.value}%</span>
                            </div>
                            <div className="manager-report-track">
                                <div className="manager-report-fill" style={{ width: `${item.value}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="manager-grid">
                <article className="manager-panel">
                    <div className="manager-panel-head">
                        <h3><BarChart3 size={16} style={{ marginRight: 6 }} /> Chỉ số theo chu kỳ</h3>
                    </div>
                    <p className="manager-muted">Đề xuất: theo dõi theo tuần các lớp có tỷ lệ chậm bài nộp {'>'} 20% để can thiệp sớm.</p>
                </article>
                <article className="manager-panel">
                    <div className="manager-panel-head">
                        <h3><TrendingUp size={16} style={{ marginRight: 6 }} /> Xu hướng chất lượng</h3>
                    </div>
                    <p className="manager-muted">Manager nên rà soát nhóm lớp có tiến bộ thấp trong 2 chu kỳ liên tiếp và phân bổ lại tải chấm.</p>
                </article>
            </section>
        </ManagerLayout>
    );
}
