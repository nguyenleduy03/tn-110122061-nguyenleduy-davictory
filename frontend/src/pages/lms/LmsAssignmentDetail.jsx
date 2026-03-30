import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle, Clock, Filter } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';
import SubmissionList from '../../components/assignment/SubmissionList';
import GradeModal from '../../components/assignment/GradeModal';
import { assignmentApi } from '../../services/assignmentApi';

export default function LmsAssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [gradingSubmission, setGradingSubmission] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignmentData, submissionsData] = await Promise.all([
        assignmentApi.getAssignment(id),
        assignmentApi.getSubmissions(id)
      ]);
      setAssignment(assignmentData);
      setSubmissions(submissionsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      alert('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const filteredSubmissions = submissions.filter(s => {
    if (filter === 'PENDING') return s.status === 'SUBMITTED' || s.status === 'LATE';
    if (filter === 'GRADED') return s.status === 'GRADED';
    return true;
  });

  const handleGrade = async (data) => {
    try {
      await assignmentApi.gradeSubmission(data);
      setGradingSubmission(null);
      fetchData();
    } catch (error) {
      alert('Chấm điểm thất bại: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return (
      <LmsLayout title="Đang tải..." subtitle="">
        <div className="lms-panel">Đang tải dữ liệu...</div>
      </LmsLayout>
    );
  }

  if (!assignment) {
    return (
      <LmsLayout title="Không tìm thấy" subtitle="">
        <div className="lms-panel">Bài tập không tồn tại</div>
      </LmsLayout>
    );
  }

  const pendingCount = submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'LATE').length;
  const gradedCount = submissions.filter(s => s.status === 'GRADED').length;

  return (
    <LmsLayout title={assignment.title} subtitle={`${assignment.className} (${assignment.classCode})`}>
      {/* Back button */}
      <button 
        className="lms-cta ghost" 
        onClick={() => navigate('/lms/teacher/assignments')}
        style={{ marginBottom: 16 }}
      >
        <ArrowLeft size={14} /> Quay lại
      </button>

      {/* Assignment info */}
      <div className="lms-panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <strong>Mô tả:</strong>
            <p style={{ margin: '4px 0 0', color: '#6b7280' }}>{assignment.description || 'Không có mô tả'}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 14 }}>
            <div><strong>Loại:</strong> {assignment.assignmentType}</div>
            <div><strong>Hạn nộp:</strong> {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString('vi-VN') : 'Không hạn'}</div>
            <div><strong>Điểm tối đa:</strong> {assignment.maxScore || 'Không chấm điểm'}</div>
            <div><strong>Trạng thái:</strong> <span className={`lms-pill ${assignment.status === 'PUBLISHED' ? 'success' : 'neutral'}`}>{assignment.status}</span></div>
          </div>
          {assignment.attachmentUrl && (
            <div>
              <a href={assignment.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1b7f79' }}>
                📎 Tài liệu đính kèm
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="lms-cards" style={{ marginBottom: 16 }}>
        <div className="lms-card">
          <h3>Tổng học viên</h3>
          <div className="lms-card-value">{assignment.totalStudents}</div>
        </div>
        <div className="lms-card">
          <h3>Đã nộp</h3>
          <div className="lms-card-value">{assignment.submittedCount}</div>
        </div>
        <div className="lms-card">
          <h3>Chờ chấm</h3>
          <div className="lms-card-value" style={{ color: '#d97706' }}>{pendingCount}</div>
        </div>
        <div className="lms-card">
          <h3>Đã chấm</h3>
          <div className="lms-card-value" style={{ color: '#16a34a' }}>{gradedCount}</div>
        </div>
      </div>

      {/* Submissions */}
      <div className="lms-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="lms-panel-title">Bài nộp ({filteredSubmissions.length})</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Filter size={14} />
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
            >
              <option value="ALL">Tất cả</option>
              <option value="PENDING">Chờ chấm ({pendingCount})</option>
              <option value="GRADED">Đã chấm ({gradedCount})</option>
            </select>
          </div>
        </div>

        {filteredSubmissions.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Chưa có bài nộp nào</p>
        ) : (
          <SubmissionList 
            submissions={filteredSubmissions}
            onGrade={setGradingSubmission}
          />
        )}
      </div>

      {/* Grade modal */}
      {gradingSubmission && (
        <GradeModal
          submission={gradingSubmission}
          onSubmit={handleGrade}
          onClose={() => setGradingSubmission(null)}
        />
      )}
    </LmsLayout>
  );
}
