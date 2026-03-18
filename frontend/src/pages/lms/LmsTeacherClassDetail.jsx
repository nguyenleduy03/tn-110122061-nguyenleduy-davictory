import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  RefreshCw,
  Users,
} from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';
import { authApi } from '../../services/authApi';

export default function LmsTeacherClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [showStudents, setShowStudents] = useState(false);

  useEffect(() => {
    // Nếu có state truyền từ trang danh sách → dùng luôn (nhanh hơn)
    if (location.state?.classData) {
      setSelectedClass(location.state.classData);
      setLoading(false);
      return;
    }

    // Không có state → gọi API lấy danh sách lớp rồi tìm theo id
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const resp = await authApi.getMyClassManagement();
        const classes = Array.isArray(resp?.classes) ? resp.classes : [];

        // id từ URL có thể là số hoặc classCode (encodeURIComponent)
        const decoded = decodeURIComponent(id);
        const found = classes.find(
          (c) =>
            String(c.id) === decoded ||
            String(c.id) === String(id) ||
            c.code === decoded ||
            c.classCode === decoded
        );

        if (found) {
          setSelectedClass(found);
        } else {
          setError('Không tìm thấy lớp trong danh sách lớp phụ trách.');
        }
      } catch (e) {
        setError(e?.response?.data?.message || 'Không thể tải thông tin lớp học.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const getClassCode = (c) => c?.code || c?.classCode || '';
  const getStudentCount = (c) => Number(c?.activeStudentCount ?? c?.studentCount ?? 0);

  if (loading) {
    return (
      <LmsLayout title="Đang tải..." subtitle="Vui lòng chờ">
        <div className="lms-panel">
          <p className="lms-subtitle" style={{ marginTop: 0 }}>Đang tải thông tin lớp học...</p>
        </div>
      </LmsLayout>
    );
  }

  if (error || !selectedClass) {
    return (
      <LmsLayout title="Không tìm thấy lớp" subtitle="Lớp không tồn tại hoặc bạn không có quyền xem">
        <div className="lms-panel">
          <p className="lms-subtitle" style={{ marginTop: 0, color: '#dc2626' }}>
            {error || 'Lớp này không tồn tại hoặc đã bị xóa.'}
          </p>
          <button type="button" className="lms-cta" onClick={() => navigate('/lms/teacher/classes')}>
            <ArrowLeft size={14} /> Quay lại danh sách lớp
          </button>
        </div>
      </LmsLayout>
    );
  }

  const classCode = getClassCode(selectedClass);
  const studentCount = getStudentCount(selectedClass);

  return (
    <LmsLayout
      title={`Lớp ${selectedClass.name || classCode}`}
      subtitle="Bảng điều khiển chi tiết theo lớp"
    >
      <div className="lms-class-detail-page">
        {/* Header */}
        <div className="lms-class-detail-header">
          <button type="button" className="lms-cta ghost" onClick={() => navigate('/lms/teacher/classes')}>
            <ArrowLeft size={14} /> Danh sách lớp
          </button>
          <div className="lms-chip-row">
            {classCode && <span className="lms-chip">{classCode}</span>}
            {selectedClass.status && <span className="lms-chip">{selectedClass.status}</span>}
            {selectedClass.level && <span className="lms-chip">{selectedClass.level}</span>}
          </div>
        </div>

        {/* Thông tin chung */}
        <div className="lms-cards" style={{ marginBottom: 20 }}>
          <div className="lms-card">
            <h3>Tên lớp</h3>
            <div className="lms-card-value" style={{ fontSize: 18 }}>{selectedClass.name || classCode || 'N/A'}</div>
          </div>
          <div className="lms-card">
            <h3>Học viên</h3>
            <div className="lms-card-value">{studentCount}</div>
          </div>
          <div className="lms-card">
            <h3>Trạng thái</h3>
            <div className="lms-card-value" style={{ fontSize: 16 }}>{selectedClass.status || 'N/A'}</div>
          </div>
        </div>

        {/* Option cards */}
        <div className="lms-class-options-grid">
          <article className="lms-panel lms-class-option-card">
            <div className="lms-class-option-head">
              <Users size={16} />
              <h3>Sĩ số</h3>
            </div>
            <div className="lms-class-option-value">{studentCount} học viên</div>
            <p className="lms-subtitle">Học viên đang active trong lớp</p>
            <button 
              type="button" 
              className="lms-cta ghost"
              onClick={() => setShowStudents(!showStudents)}
            >
              {showStudents ? 'Ẩn danh sách' : 'Xem danh sách'}
            </button>
          </article>

          <article className="lms-panel lms-class-option-card">
            <div className="lms-class-option-head">
              <ClipboardList size={16} />
              <h3>Bài tập</h3>
            </div>
            <div className="lms-class-option-value">-</div>
            <p className="lms-subtitle">Bài tập đã giao cho lớp</p>
            <button
              type="button"
              className="lms-cta ghost"
              onClick={() => navigate('/lms/teacher/assignments')}
            >
              Xem bài tập
            </button>
          </article>

          <article className="lms-panel lms-class-option-card">
            <div className="lms-class-option-head">
              <CheckCircle2 size={16} />
              <h3>Chấm bài</h3>
            </div>
            <div className="lms-class-option-value">-</div>
            <p className="lms-subtitle">Bài đang chờ chấm</p>
            <button
              type="button"
              className="lms-cta"
              onClick={() => {
                const params = new URLSearchParams({
                  classId: String(selectedClass.id ?? ''),
                  classCode: classCode,
                  className: selectedClass.name || classCode,
                });
                navigate(`/teacher/writing?${params.toString()}`);
              }}
            >
              Mở chấm bài
            </button>
          </article>

          <article className="lms-panel lms-class-option-card">
            <div className="lms-class-option-head">
              <GraduationCap size={16} />
              <h3>Bài kiểm tra</h3>
            </div>
            <div className="lms-class-option-value">-</div>
            <p className="lms-subtitle">Đề thi đã giao cho lớp</p>
            <button
              type="button"
              className="lms-cta ghost"
              onClick={() => navigate('/lms/teacher/tests')}
            >
              Xem đề thi
            </button>
          </article>
        </div>

        {/* Thao tác nhanh */}
        <section className="lms-panel" style={{ marginTop: 16 }}>
          <h3 className="lms-panel-title">Thao tác nhanh</h3>
          <div className="lms-chip-row">
            <Link
              className="lms-cta"
              to={`/teacher/writing?classId=${encodeURIComponent(selectedClass.id ?? '')}&classCode=${encodeURIComponent(classCode)}&className=${encodeURIComponent(selectedClass.name || classCode)}`}
              style={{ textDecoration: 'none' }}
            >
              <FileText size={14} /> Chấm bài theo lớp
            </Link>
            <button
              type="button"
              className="lms-cta ghost"
              onClick={() => navigate('/lms/teacher/assignments')}
            >
              Xem bài tập
            </button>
            <button
              type="button"
              className="lms-cta ghost"
              onClick={() => navigate('/lms/teacher/tests')}
            >
              Xem đề thi
            </button>
          </div>

          {/* Danh sách học viên */}
          {showStudents && selectedClass.students && selectedClass.students.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>
                Danh sách học viên ({selectedClass.students.length})
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>STT</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Mã HV</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Họ tên</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Email</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Ngày vào lớp</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedClass.students.map((student, index) => (
                      <tr key={student.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 12px' }}>{index + 1}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>
                          {student.studentCode || '-'}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                          {student.fullName || student.email || 'N/A'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#6b7280' }}>
                          {student.email || '-'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12 }}>
                          {student.enrolledAt ? new Date(student.enrolledAt).toLocaleDateString('vi-VN') : '-'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            background: student.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                            color: student.status === 'ACTIVE' ? '#166534' : '#991b1b'
                          }}>
                            {student.status || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showStudents && (!selectedClass.students || selectedClass.students.length === 0) && (
            <div style={{ marginTop: 20, padding: 16, background: '#f9fafb', borderRadius: 8, textAlign: 'center' }}>
              <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>
                Chưa có học viên nào trong lớp
              </p>
            </div>
          )}

          {/* Thông tin chi tiết lớp nếu backend trả về thêm */}
          {selectedClass.description && (
            <p className="lms-subtitle" style={{ marginTop: 12 }}>
              {selectedClass.description}
            </p>
          )}
        </section>
      </div>
    </LmsLayout>
  );
}
