import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';
import { teacherApi } from '../../services/teacherApi';

export default function LmsTeacherSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const data = await teacherApi.getWritingSubmissions();
        setSubmissions(Array.isArray(data) ? data : (data.content ?? []));
      } catch (err) {
        setError('Không thể tải danh sách bài nộp');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  if (loading) {
    return (
      <LmsLayout title="Bài nộp" subtitle="Chấm bài viết, bài nói và phản hồi cho học viên">
        <div className="lms-panel text-center py-8">
          <Loader2 className="animate-spin mx-auto mb-2" size={24} />
          <p>Đang tải...</p>
        </div>
      </LmsLayout>
    );
  }

  if (error) {
    return (
      <LmsLayout title="Bài nộp" subtitle="Chấm bài viết, bài nói và phản hồi cho học viên">
        <div className="lms-panel text-center py-8 text-red-600">
          <p>{error}</p>
        </div>
      </LmsLayout>
    );
  }

  return (
    <LmsLayout title="Bài nộp" subtitle="Chấm bài viết, bài nói và phản hồi cho học viên">
      <div className="lms-panel">
        <table className="lms-table">
          <thead>
            <tr><th>Học viên</th><th>Bài làm</th><th>Số từ</th><th>Trạng thái</th><th>Điểm</th><th>Thao tác</th></tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id || `${s.username}-${s.groupTitle}`}>
                <td>{s.username || 'N/A'}</td>
                <td>{s.groupTitle || 'N/A'}</td>
                <td>{s.wordCount || '—'}</td>
                <td>
                  <span className={`lms-pill ${s.status === 'SUBMITTED' ? 'warn' : 'success'}`}>
                    {s.status === 'SUBMITTED' ? 'Chờ chấm' : 
                     s.status === 'GRADED' ? 'Đã chấm' : 
                     s.status === 'UNDER_REVIEW' ? 'Đang chấm' : 'Khác'}
                  </span>
                </td>
                <td>{s.score || '—'}</td>
                <td><button className="lms-cta ghost"><CheckCircle2 size={14} /> Chấm bài</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LmsLayout>
  );
}
