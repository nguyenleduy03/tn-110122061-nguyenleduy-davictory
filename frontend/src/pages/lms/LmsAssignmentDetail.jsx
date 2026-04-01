import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle, Clock, Filter, Award } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';
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
    if (filter === 'PENDING') return s.status === 'SUBMITTED';
    if (filter === 'GRADED') return s.status === 'GRADED';
    return true;
  });

  const handleGrade = async (submissionId, data) => {
    try {
      await assignmentApi.gradeSubmission(submissionId, data);
      setGradingSubmission(null);
      fetchData();
      alert('Chấm điểm thành công!');
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

  const pendingCount = submissions.filter(s => s.status === 'SUBMITTED').length;
  const gradedCount = submissions.filter(s => s.status === 'GRADED').length;

  return (
    <LmsLayout title={assignment.title} subtitle={assignment.className}>
      <button 
        onClick={() => navigate('/lms/teacher/assignments')}
        style={{ 
          marginBottom: 16, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8, 
          border: 'none', 
          background: 'none', 
          cursor: 'pointer',
          color: '#6b7280',
          fontSize: 14
        }}
      >
        <ArrowLeft size={16} /> Quay lại
      </button>

      {/* Assignment info */}
      <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ 
            padding: '4px 10px', 
            borderRadius: 4, 
            fontSize: 12, 
            fontWeight: 600,
            background: assignment.type === 'TEST' ? '#dbeafe' : '#fef3c7',
            color: assignment.type === 'TEST' ? '#1e40af' : '#92400e'
          }}>
            {assignment.type === 'TEST' ? 'Bài test' : 'Bài tự do'}
          </span>
          <span style={{ 
            padding: '4px 10px', 
            borderRadius: 4, 
            fontSize: 12, 
            fontWeight: 500,
            background: assignment.status === 'PUBLISHED' ? '#d1fae5' : '#f3f4f6',
            color: assignment.status === 'PUBLISHED' ? '#059669' : '#6b7280'
          }}>
            {assignment.status}
          </span>
        </div>

        {assignment.description && (
          <p style={{ margin: '0 0 12px', color: '#6b7280', lineHeight: 1.6 }}>
            {assignment.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14, color: '#6b7280' }}>
          {assignment.dueDate && (
            <div><strong>Hạn nộp:</strong> {new Date(assignment.dueDate).toLocaleString('vi-VN')}</div>
          )}
          {assignment.maxScore && (
            <div><strong>Điểm tối đa:</strong> {assignment.maxScore}</div>
          )}
          {assignment.maxAttempts && (
            <div><strong>Số lần làm:</strong> {assignment.maxAttempts}</div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Tổng học sinh</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{submissions.length}</div>
        </div>
        <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Đã nộp</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{submissions.filter(s => s.status !== 'NOT_SUBMITTED').length}</div>
        </div>
        <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, color: '#f59e0b', marginBottom: 4 }}>Chờ chấm</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#f59e0b' }}>{pendingCount}</div>
        </div>
        <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, color: '#059669', marginBottom: 4 }}>Đã chấm</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#059669' }}>{gradedCount}</div>
        </div>
      </div>

      {/* Submissions */}
      <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            Bài nộp ({filteredSubmissions.length})
          </h3>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
          >
            <option value="ALL">Tất cả</option>
            <option value="PENDING">Chờ chấm ({pendingCount})</option>
            <option value="GRADED">Đã chấm ({gradedCount})</option>
          </select>
        </div>

        {filteredSubmissions.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Chưa có bài nộp nào</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {filteredSubmissions.map(submission => (
              <div
                key={submission.id}
                style={{
                  padding: 16,
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{submission.studentName}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    Nộp lúc: {new Date(submission.submittedAt).toLocaleString('vi-VN')}
                  </div>
                  {submission.status === 'GRADED' && submission.score !== null && (
                    <div style={{ fontSize: 14, color: '#059669', fontWeight: 600, marginTop: 4 }}>
                      Điểm: {submission.score}/{assignment.maxScore}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setGradingSubmission(submission)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: submission.status === 'GRADED' ? '1px solid #d1d5db' : 'none',
                    background: submission.status === 'GRADED' ? '#fff' : '#2563eb',
                    color: submission.status === 'GRADED' ? '#374151' : '#fff',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: 13
                  }}
                >
                  {submission.status === 'GRADED' ? 'Xem/Sửa điểm' : 'Chấm điểm'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grade Modal */}
      {gradingSubmission && (
        <GradeModal
          submission={gradingSubmission}
          assignment={assignment}
          onSubmit={handleGrade}
          onClose={() => setGradingSubmission(null)}
        />
      )}
    </LmsLayout>
  );
}
