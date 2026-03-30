import React, { useEffect, useState } from 'react';
import { PlusCircle, RefreshCw, Filter } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';
import AssignmentCard from '../../components/assignment/AssignmentCard';
import AssignmentForm from '../../components/assignment/AssignmentForm';
import { assignmentApi } from '../../services/assignmentApi';
import { authApi } from '../../services/authApi';

export default function LmsTeacherAssignments() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignmentsData, classData] = await Promise.all([
        assignmentApi.getMyAssignments(),
        authApi.getMyClassManagement()
      ]);
      setAssignments(assignmentsData);
      setClasses(classData.classes || []);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      alert('Không thể tải dữ liệu bài tập');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredAssignments = selectedClass
    ? assignments.filter(a => a.classId === parseInt(selectedClass))
    : assignments;

  const handleCreate = () => {
    setEditingAssignment(null);
    setShowForm(true);
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa bài tập này?')) return;
    try {
      await assignmentApi.deleteAssignment(id);
      fetchData();
    } catch (error) {
      alert('Xóa thất bại');
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editingAssignment) {
        await assignmentApi.updateAssignment(editingAssignment.id, data);
      } else {
        await assignmentApi.createAssignment(data);
      }
      setShowForm(false);
      fetchData();
    } catch (error) {
      alert('Lưu thất bại: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <LmsLayout title="Bài tập" subtitle="Giao bài và theo dõi tiến độ nộp của học viên">
      {/* Header actions */}
      <div className="lms-panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Filter size={16} />
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
            >
              <option value="">Tất cả lớp ({assignments.length})</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code}) - {assignments.filter(a => a.classId === c.id).length} bài
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="lms-cta ghost" onClick={fetchData} disabled={loading}>
              <RefreshCw size={14} />
            </button>
            <button className="lms-cta" onClick={handleCreate}>
              <PlusCircle size={14} /> Tạo bài tập mới
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="lms-cards" style={{ marginBottom: 16 }}>
        <div className="lms-card">
          <h3>Tổng bài tập</h3>
          <div className="lms-card-value">{assignments.length}</div>
        </div>
        <div className="lms-card">
          <h3>Đã phát hành</h3>
          <div className="lms-card-value">{assignments.filter(a => a.status === 'PUBLISHED').length}</div>
        </div>
        <div className="lms-card">
          <h3>Chờ chấm</h3>
          <div className="lms-card-value" style={{ color: '#d97706' }}>
            {assignments.reduce((sum, a) => sum + (a.submittedCount - a.gradedCount), 0)}
          </div>
        </div>
      </div>

      {/* Assignment grid */}
      {loading ? (
        <div className="lms-panel">Đang tải...</div>
      ) : filteredAssignments.length === 0 ? (
        <div className="lms-panel" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#6b7280', marginBottom: 16 }}>Chưa có bài tập nào</p>
          <button className="lms-cta" onClick={handleCreate}>
            <PlusCircle size={14} /> Tạo bài tập đầu tiên
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {filteredAssignments.map(assignment => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <AssignmentForm
          assignment={editingAssignment}
          classes={classes}
          onSubmit={handleFormSubmit}
          onClose={() => setShowForm(false)}
        />
      )}
    </LmsLayout>
  );
}
