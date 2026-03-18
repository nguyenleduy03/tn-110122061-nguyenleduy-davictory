import { useEffect, useMemo, useRef, useState } from 'react';
import { GraduationCap, Search, Settings2, UserPlus, Users } from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout';
import { authApi } from '../services/authApi';

const panelStyle = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 14,
};

const inputStyle = {
  width: '100%',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: '9px 10px',
  fontSize: 14,
  boxSizing: 'border-box',
};

const buttonPrimary = {
  border: 0,
  borderRadius: 8,
  background: '#2563eb',
  color: '#fff',
  padding: '9px 12px',
  cursor: 'pointer',
  fontWeight: 600,
};

const buttonSecondary = {
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  background: '#fff',
  color: '#0f172a',
  padding: '9px 12px',
  cursor: 'pointer',
  fontWeight: 600,
};

export default function ClassManagement() {
  const [managementData, setManagementData] = useState({ classes: [], teachers: [], currentUser: null });
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [createForm, setCreateForm] = useState({ className: '', classCode: '', maxStudents: '' });
  const [assignForm, setAssignForm] = useState({ classId: '', teacherId: '' });
  const [handoverForm, setHandoverForm] = useState({ classCode: '', studentCodesText: '', notes: '' });

  const [createLoading, setCreateLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    status: '',
    teacherId: '',
    notes: '',
    classCode: '',
    className: ''
  });

  const [expandedPanels, setExpandedPanels] = useState({
    createClass: false,
    assignTeacher: false,
    handoverStudents: false,
  });

  const [showAddStudents, setShowAddStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('🔄 Loading class management data...');
        
        const res = await authApi.getMyClassManagement();
        console.log('✅ Class management data loaded:', res);
        
        if (!mounted) return;
        const nextData = {
          classes: Array.isArray(res?.classes) ? res.classes : [],
          teachers: Array.isArray(res?.teachers) ? res.teachers : [],
          currentUser: res?.currentUser || null,
        };
        setManagementData(nextData);
        console.log('📊 Management data set:', nextData);
      } catch (e) {
        console.error('❌ Error loading class management data:', e);
        if (mounted) {
          alert(e?.response?.data?.message || 'Không tải được dữ liệu quản lý lớp');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [refreshTick]);

  const isAdmin = authApi.hasRole('ADMIN') || authApi.hasRole('MANAGER');

  const classes = useMemo(() => {
    const list = managementData?.classes || [];
    const q = searchTerm.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => `${c.name || ''} ${c.classCode || ''}`.toLowerCase().includes(q));
  }, [managementData, searchTerm]);

  const selectedClass = useMemo(() => {
    const list = managementData?.classes || [];
    return list.find((c) => c.id === selectedClassId) || null;
  }, [managementData, selectedClassId]);

  useEffect(() => {
    if (selectedClass) {
      setEditForm({
        status: selectedClass.status || '',
        teacherId: String(selectedClass.teachers?.[0]?.id || ''),
        notes: selectedClass.notes || '',
        classCode: selectedClass.code || '',
        className: selectedClass.name || ''
      });
    }
  }, [selectedClass]);

  const loadAvailableStudents = async () => {
    try {
      const res = await authApi.getAllStudents();
      setAvailableStudents(res || []);
    } catch (err) {
      console.error('Error loading students:', err);
      setAvailableStudents([]);
    }
  };

  const handleAddStudents = async () => {
    if (selectedStudents.length === 0) return;
    try {
      console.log('Adding students:', { classId: selectedClassId, studentIds: selectedStudents });
      
      // Call API to add students to class
      const payload = {
        classId: selectedClassId,
        studentIds: selectedStudents
      };
      const result = await authApi.addStudentsToClass(payload);
      console.log('Add students result:', result);
      
      alert('Đã thêm học viên thành công!');
      setSelectedStudents([]);
      setShowAddStudents(false);
      // Reload data
      window.location.reload();
    } catch (err) {
      console.error('Add students error:', err);
      console.error('Error response:', err.response?.data);
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const togglePanel = (panelName) => {
    setExpandedPanels(prev => ({
      ...prev,
      [panelName]: !prev[panelName]
    }));
  };

  const handleCreateClass = async () => {
    if (!createForm.className.trim()) {
      alert('Vui lòng nhập tên lớp');
      return;
    }
    
    try {
      setCreateLoading(true);
      
      const payload = {
        className: createForm.className,
        classCode: createForm.classCode || null,
        maxStudents: createForm.maxStudents ? Number(createForm.maxStudents) : null,
      };
      
      console.log('Payload tạo lớp:', payload);
      
      const result = await authApi.createClassForAdmin(payload);
      console.log('Kết quả tạo lớp:', result);
      
      alert('Tạo lớp thành công!');
      setCreateForm({ className: '', classCode: '', maxStudents: '' });
      
      // Refresh data từ server thay vì update local state
      setRefreshTick(prev => prev + 1);
      
    } catch (error) {
      console.error('Lỗi tạo lớp:', error);
      alert('Lỗi tạo lớp: ' + (error?.response?.data?.message || error.message));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateClass = async () => {
    if (!selectedClass?.id) return;
    
    try {
      setEditLoading(true);
      
      const payload = {
        status: editForm.status,
        notes: editForm.notes,
        name: editForm.className
      };
      
      console.log('Payload cập nhật lớp:', payload);
      
      const result = await authApi.updateClassInfo(selectedClass.id, payload);
      console.log('Kết quả cập nhật:', result);
      
      alert('Cập nhật thành công!');
      
      // Refresh data từ server thay vì update local state
      setRefreshTick(prev => prev + 1);
      
    } catch (error) {
      console.error('Lỗi cập nhật:', error);
      alert('Lỗi cập nhật: ' + (error?.response?.data?.message || error.message));
    } finally {
      setEditLoading(false);
    }
  };

  const handleChangeTeacher = async () => {
    if (!selectedClass) {
      alert('Không tìm thấy thông tin lớp');
      return;
    }
    
    if (!editForm.teacherId) {
      alert('Vui lòng chọn giảng viên');
      return;
    }
    
    try {
      setEditLoading(true);
      
      // Thử dùng API assignTeacherByClassCode nếu có classCode
      if (selectedClass.classCode) {
        await authApi.assignTeacherByClassCode({
          classCode: selectedClass.classCode,
          teacherId: editForm.teacherId,
          role: 'MAIN_TEACHER'
        });
      } else {
        // Fallback: Cập nhật qua updateClassInfo
        await authApi.updateClassInfo(selectedClass.id, {
          teacherId: editForm.teacherId
        });
      }
      
      // Tìm thông tin giảng viên mới
      const newTeacher = managementData.teachers.find(t => String(t.id) === String(editForm.teacherId));
      
      // Cập nhật state local
      setManagementData(prev => ({
        ...prev,
        classes: prev.classes.map(c => 
          c.id === selectedClass.id 
            ? { 
                ...c, 
                teachers: newTeacher ? [{ ...newTeacher, role: 'MAIN_TEACHER' }] : []
              }
            : c
        )
      }));
      
      alert('Đã thay đổi giảng viên!');
    } catch (error) {
      console.error('Chi tiết lỗi:', error);
      alert('Lỗi thay đổi giảng viên: ' + (error?.response?.data?.message || error.message));
    } finally {
      setEditLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!confirm('Xác nhận xóa học viên khỏi lớp?')) return;
    
    try {
      await authApi.removeStudentFromClass(selectedClass.id, studentId);
      
      // Cập nhật state local
      setManagementData(prev => ({
        ...prev,
        classes: prev.classes.map(c => 
          c.id === selectedClass.id 
            ? { 
                ...c, 
                students: c.students.filter(s => s.id !== studentId),
                studentCount: (c.studentCount || 0) - 1
              }
            : c
        )
      }));
      
      alert('Đã xóa học viên');
    } catch (error) {
      alert('Lỗi xóa học viên: ' + (error?.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Quản lý giảng viên & lớp" subtitle="Đang tải dữ liệu...">
        <div>Đang tải...</div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout title="Quản lý giảng viên & lớp">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#dc2626' }}>Bạn không có quyền truy cập trang này!</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Quản lý giảng viên & lớp" subtitle={`${classes.length} lớp học • ${managementData.teachers.length} giảng viên`}>
      <div style={{ display: 'grid', gap: 16 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div style={{ ...panelStyle, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#2563eb' }}>{classes.length}</div>
            <div style={{ fontSize: 14, color: '#64748b' }}>Tổng lớp học</div>
          </div>
          <div style={{ ...panelStyle, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#059669' }}>{managementData.teachers.length}</div>
            <div style={{ fontSize: 14, color: '#64748b' }}>Giảng viên</div>
          </div>
          <div style={{ ...panelStyle, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#dc2626' }}>
              {classes.reduce((sum, c) => sum + (c.studentCount || 0), 0)}
            </div>
            <div style={{ fontSize: 14, color: '#64748b' }}>Tổng học viên</div>
          </div>
        </div>

        {/* Actions */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button style={buttonSecondary} onClick={() => togglePanel('createClass')}>
              + Tạo lớp mới
            </button>
            <button style={buttonSecondary} onClick={() => togglePanel('assignTeacher')}>
              Gán giảng viên
            </button>
            <button style={buttonSecondary} onClick={() => togglePanel('handoverStudents')}>
              Bàn giao học viên
            </button>
          </div>

          {expandedPanels.createClass && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <GraduationCap size={16} /> Tạo lớp mới
              </h4>
              <div style={{ display: 'grid', gap: 8 }}>
                <input 
                  style={inputStyle} 
                  placeholder="Tên lớp *" 
                  value={createForm.className} 
                  onChange={(e) => setCreateForm(p => ({ ...p, className: e.target.value }))} 
                />
                <input 
                  style={inputStyle} 
                  placeholder="Mã lớp (tùy chọn)" 
                  value={createForm.classCode} 
                  onChange={(e) => setCreateForm(p => ({ ...p, classCode: e.target.value }))} 
                />
                <input 
                  type="number" 
                  min="1" 
                  style={inputStyle} 
                  placeholder="Sĩ số tối đa" 
                  value={createForm.maxStudents} 
                  onChange={(e) => setCreateForm(p => ({ ...p, maxStudents: e.target.value }))} 
                />
                <button 
                  style={buttonPrimary} 
                  onClick={handleCreateClass} 
                  disabled={createLoading}
                >
                  {createLoading ? 'Đang tạo...' : 'Tạo lớp'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Class List */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedClassId ? '400px 1fr' : '1fr', gap: 16 }}>
          <div style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Search size={16} />
              <input
                style={{ ...inputStyle, margin: 0 }}
                placeholder="Tìm kiếm lớp học..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {classes.map((c) => (
                <div 
                  key={c.id} 
                  style={{ 
                    border: '1px solid #e2e8f0', 
                    borderRadius: 8, 
                    padding: 12, 
                    marginBottom: 8,
                    background: selectedClassId === c.id ? '#eff6ff' : '#fff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {c.code || 'Chưa có mã'} • {c.activeStudentCount || 0} học viên
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{ ...buttonSecondary, padding: '6px 10px' }}
                      onClick={() => setSelectedClassId(selectedClassId === c.id ? null : c.id)}
                    >
                      {selectedClassId === c.id ? 'Thu nhỏ' : 'Xem chi tiết'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedClassId && selectedClass && (
            <div style={panelStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  Chi tiết: {selectedClass.name}
                </h2>
                <button 
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: 12, 
                    background: '#dc2626', 
                    color: 'white',
                    border: 'none', 
                    borderRadius: 4, 
                    cursor: 'pointer' 
                  }}
                  onClick={() => setSelectedClassId(null)}
                >
                  ✕ Đóng
                </button>
              </div>

              <div style={{ display: 'grid', gap: 20 }}>
                {/* Thông tin cơ bản */}
                <div>
                  <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#1f2937' }}>
                    Chỉnh sửa thông tin
                  </h3>
                  <div style={{ background: '#f9fafb', padding: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>Tên lớp:</label>
                        <input 
                          value={editForm.className} 
                          onChange={(e) => setEditForm(prev => ({...prev, className: e.target.value}))}
                          style={{ ...inputStyle, margin: 0 }}
                          placeholder="Tên lớp học"
                        />
                      </div>
                      
                      <div>
                        <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>Mã lớp:</label>
                        <input 
                          value={editForm.classCode} 
                          onChange={(e) => setEditForm(prev => ({...prev, classCode: e.target.value}))}
                          style={{ ...inputStyle, margin: 0 }}
                          placeholder="Mã lớp (VD: IELTS65-S01)"
                        />
                      </div>
                      
                      <div>
                        <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>Trạng thái:</label>
                        <select 
                          value={editForm.status} 
                          onChange={(e) => setEditForm(prev => ({...prev, status: e.target.value}))}
                          style={{ ...inputStyle, margin: 0 }}
                        >
                          <option value="ACTIVE">Hoạt động</option>
                          <option value="INACTIVE">Tạm dừng</option>
                          <option value="COMPLETED">Hoàn thành</option>
                          <option value="CANCELLED">Hủy</option>
                        </select>
                      </div>
                      
                      <div>
                        <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>Giảng viên chính:</label>
                        
                        {/* Hiển thị giảng viên hiện tại */}
                        <div style={{ 
                          padding: '8px 12px', 
                          background: '#f3f4f6', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: 6, 
                          marginBottom: 8,
                          fontSize: 13
                        }}>
                          <span style={{ color: '#6b7280' }}>Hiện tại: </span>
                          <span style={{ fontWeight: 600, color: '#1f2937' }}>
                            {selectedClass.teachers?.[0]?.fullName || 'Chưa có giảng viên'}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: 6 }}>
                          <select 
                            value={editForm.teacherId} 
                            onChange={(e) => setEditForm(prev => ({...prev, teacherId: e.target.value}))}
                            style={{ ...inputStyle, margin: 0, flex: 1 }}
                          >
                            <option value="">Chọn giảng viên mới</option>
                            {managementData.teachers.map(t => (
                              <option key={t.id} value={t.id}>{t.fullName}</option>
                            ))}
                          </select>
                          <button 
                            onClick={handleChangeTeacher}
                            disabled={editLoading || !editForm.teacherId}
                            style={{ 
                              padding: '8px 12px',
                              fontSize: 12,
                              background: editLoading ? '#9ca3af' : (!editForm.teacherId ? '#9ca3af' : '#2563eb'),
                              color: 'white',
                              border: 'none',
                              borderRadius: 4,
                              cursor: (editLoading || !editForm.teacherId) ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Đổi GV
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>Ghi chú:</label>
                        <textarea 
                          value={editForm.notes} 
                          onChange={(e) => setEditForm(prev => ({...prev, notes: e.target.value}))}
                          style={{ ...inputStyle, margin: 0, minHeight: 60, resize: 'vertical' }}
                          placeholder="Ghi chú về lớp học..."
                        />
                      </div>
                      
                      <button 
                        onClick={handleUpdateClass}
                        disabled={editLoading}
                        style={{ 
                          ...buttonPrimary, 
                          margin: 0, 
                          background: editLoading ? '#9ca3af' : '#059669',
                          fontSize: 13
                        }}
                      >
                        {editLoading ? 'Đang lưu...' : 'Lưu thông tin lớp'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Giảng viên */}
                <div>
                  <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#1f2937' }}>
                    Giảng viên ({(selectedClass.teachers || []).length})
                  </h3>
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                    {(selectedClass.teachers || []).length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f3f4f6' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600 }}>Họ tên</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600 }}>Vai trò</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedClass.teachers.map((t) => (
                            <tr key={`${t.id}-${t.role}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '8px 12px', fontSize: 13 }}>{t.fullName}</td>
                              <td style={{ padding: '8px 12px', fontSize: 13 }}>
                                <span style={{ 
                                  padding: '2px 6px', 
                                  background: '#dbeafe', 
                                  color: '#1e40af', 
                                  borderRadius: 3, 
                                  fontSize: 11, 
                                  fontWeight: 600 
                                }}>
                                  {t.role}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ padding: 16, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                        Chưa có giảng viên
                      </div>
                    )}
                  </div>
                </div>

                {/* Học viên */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1f2937' }}>
                      Học viên ({(selectedClass.students || []).length})
                    </h3>
                    <button
                      onClick={() => {
                        setShowAddStudents(true);
                        loadAvailableStudents();
                      }}
                      style={{
                        ...buttonSecondary,
                        padding: '4px 8px',
                        fontSize: 12
                      }}
                    >
                      + Thêm học viên
                    </button>
                  </div>
                  <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                    {(selectedClass.students || []).length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f3f4f6' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600 }}>STT</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600 }}>Họ tên</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600 }}>Mã HV</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600 }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedClass.students.map((s, index) => (
                            <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280' }}>{index + 1}</td>
                              <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>
                                {s.fullName || s.email || s.studentCode || 'N/A'}
                              </td>
                              <td style={{ padding: '8px 12px', fontSize: 12, fontFamily: 'monospace' }}>
                                {s.studentCode || '-'}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <button
                                  onClick={() => handleRemoveStudent(s.id)}
                                  style={{
                                    padding: '2px 6px',
                                    fontSize: 11,
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    borderRadius: 3,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Xóa
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ padding: 16, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                        Chưa có học viên
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add Students Modal */}
        {showAddStudents && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: 8,
              padding: 24,
              width: '90%',
              maxWidth: 600,
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>
                Thêm học viên vào lớp: {selectedClass?.name}
              </h3>
              
              {/* Search */}
              <input
                type="text"
                placeholder="Tìm theo mã học viên hoặc tên..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                style={{ ...inputStyle, margin: '0 0 16px 0' }}
              />

              {/* Student List */}
              <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 16 }}>
                {availableStudents
                  .filter(s => 
                    !studentSearch || 
                    s.username?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                    s.fullName?.toLowerCase().includes(studentSearch.toLowerCase())
                  )
                  .map(student => (
                    <div key={student.id} style={{ 
                      padding: 12, 
                      borderBottom: '1px solid #f3f4f6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{student.fullName}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>Mã: {student.username}</div>
                      </div>
                      <button
                        onClick={() => {
                          if (selectedStudents.includes(student.id)) {
                            setSelectedStudents(prev => prev.filter(id => id !== student.id));
                          } else {
                            setSelectedStudents(prev => [...prev, student.id]);
                          }
                        }}
                        style={{
                          ...buttonSecondary,
                          padding: '4px 8px',
                          fontSize: 12,
                          background: selectedStudents.includes(student.id) ? '#dbeafe' : '#f3f4f6'
                        }}
                      >
                        {selectedStudents.includes(student.id) ? 'Bỏ chọn' : 'Chọn'}
                      </button>
                    </div>
                  ))
                }
              </div>

              {/* Selected Count */}
              {selectedStudents.length > 0 && (
                <div style={{ marginBottom: 16, fontSize: 14, color: '#1f2937' }}>
                  Đã chọn: {selectedStudents.length} học viên
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowAddStudents(false);
                    setSelectedStudents([]);
                    setStudentSearch('');
                  }}
                  style={buttonSecondary}
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddStudents}
                  disabled={selectedStudents.length === 0}
                  style={{ 
                    ...buttonPrimary, 
                    opacity: selectedStudents.length === 0 ? 0.5 : 1 
                  }}
                >
                  Thêm {selectedStudents.length} học viên
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
