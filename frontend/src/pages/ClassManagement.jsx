import { useEffect, useMemo, useRef, useState } from 'react';
import { GraduationCap, Search, Settings2, UserPlus, Users, School } from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout';
import { authApi } from '../services/authApi';

const panelStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
};

const inputStyle = {
  width: '100%',
  border: '1px solid #d1d5db',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  boxSizing: 'border-box',
  transition: 'all 0.2s',
  outline: 'none',
};

const buttonPrimary = {
  border: 0,
  borderRadius: 10,
  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  color: '#fff',
  padding: '10px 16px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
  transition: 'all 0.2s',
  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
};

const buttonSecondary = {
  border: '1px solid #d1d5db',
  borderRadius: 10,
  background: '#fff',
  color: '#374151',
  padding: '10px 16px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
  transition: 'all 0.2s',
};

export default function ClassManagement() {
  const [managementData, setManagementData] = useState({ classes: [], teachers: [], currentUser: null });
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [createForm, setCreateForm] = useState({ className: '', classCode: '', maxStudents: '', studentCodes: [] });
  const [createCsvFile, setCreateCsvFile] = useState(null);
  const [createCsvError, setCreateCsvError] = useState('');
  const createCsvInputRef = useRef(null);
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
  
  const [deleteClassTarget, setDeleteClassTarget] = useState(null);
  const [deleteClassPassword, setDeleteClassPassword] = useState('');
  const [deletingClass, setDeletingClass] = useState(false);

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
      
      // Bước 1: Nếu có file CSV, import học viên trước
      let importedCount = 0;
      if (createCsvInputRef.current?.files?.[0]) {
        try {
          console.log('Đang import học viên từ CSV...');
          const importResult = await authApi.importStudentsFromCSV(createCsvInputRef.current.files[0]);
          importedCount = importResult?.success || importResult?.created || 0;
          console.log('Import thành công:', importedCount, 'học viên');
        } catch (err) {
          console.error('Lỗi import CSV:', err);
          alert(`Lỗi khi import học viên: ${err?.response?.data?.message || err.message}`);
          setCreateLoading(false);
          return;
        }
      }
      
      // Bước 2: Tạo lớp
      const payload = {
        className: createForm.className,
        classCode: createForm.classCode || null,
        maxStudents: createForm.maxStudents ? Number(createForm.maxStudents) : null,
      };
      
      console.log('Payload tạo lớp:', payload);
      const result = await authApi.createClassForAdmin(payload);
      console.log('Kết quả tạo lớp:', result);
      
      // Bước 3: Nếu có học viên từ CSV, gán vào lớp
      if (createForm.studentCodes.length > 0 && result?.code) {
        try {
          const assignResult = await authApi.assignStudentsByClassCode({
            classCode: result.code,
            studentCodes: createForm.studentCodes,
            notes: 'Thêm khi tạo lớp'
          });
          alert(`✅ Tạo lớp thành công!\n📥 Import: ${importedCount} học viên\n✓ Đã gán: ${assignResult?.success || createForm.studentCodes.length} học viên vào lớp`);
        } catch (err) {
          alert(`Tạo lớp thành công nhưng lỗi khi gán học viên vào lớp:\n${err?.response?.data?.message || err.message}`);
        }
      } else {
        alert(importedCount > 0 ? `✅ Tạo lớp thành công và import ${importedCount} học viên!` : '✅ Tạo lớp thành công!');
      }
      
      setCreateForm({ className: '', classCode: '', maxStudents: '', studentCodes: [] });
      setCreateCsvFile(null);
      setCreateCsvError('');
      if (createCsvInputRef.current) createCsvInputRef.current.value = '';
      
      // Refresh data từ server thay vì update local state
      setRefreshTick(prev => prev + 1);
      
    } catch (error) {
      console.error('Lỗi tạo lớp:', error);
      alert('Lỗi tạo lớp: ' + (error?.response?.data?.message || error.message));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreateCsvFile = async (file) => {
    if (!file) return;
    
    setCreateCsvError('');
    setCreateCsvFile(file.name);
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCreateForm(p => ({ ...p, studentCodes: [] }));
      setCreateCsvError('Chỉ chấp nhận file .csv');
      return;
    }
    
    try {
      const text = await file.text();
      const parsedCodes = parseCodesFromCsv(text);
      
      if (parsedCodes.length === 0) {
        setCreateForm(p => ({ ...p, studentCodes: [] }));
        setCreateCsvError('Không đọc được mã học viên từ file CSV');
        return;
      }
      
      setCreateForm(p => ({ ...p, studentCodes: parsedCodes }));
    } catch (error) {
      setCreateForm(p => ({ ...p, studentCodes: [] }));
      setCreateCsvError('Không thể đọc file CSV');
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

  const handleDeleteClass = async () => {
    if (!deleteClassTarget) return;
    
    if (!deleteClassPassword.trim()) {
      alert('Vui lòng nhập mật khẩu admin để xác nhận xóa lớp');
      return;
    }
    
    try {
      setDeletingClass(true);
      await authApi.deleteClass(deleteClassTarget.id, deleteClassPassword.trim());
      alert('✅ Đã xóa lớp thành công');
      setDeleteClassTarget(null);
      setDeleteClassPassword('');
      setRefreshTick(prev => prev + 1);
      if (selectedClassId === deleteClassTarget.id) {
        setSelectedClassId(null);
      }
    } catch (error) {
      alert('❌ Lỗi xóa lớp: ' + (error?.response?.data?.message || error.message));
    } finally {
      setDeletingClass(false);
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
      <div style={{ display: 'grid', gap: 20 }}>
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div style={{ ...panelStyle, background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#1e40af', marginBottom: 4 }}>{classes.length}</div>
                <div style={{ fontSize: 13, color: '#3b82f6', fontWeight: 600 }}>Tổng lớp học</div>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <School size={24} color="#3b82f6" />
              </div>
            </div>
          </div>
          <div style={{ ...panelStyle, background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#15803d', marginBottom: 4 }}>{managementData.teachers.length}</div>
                <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>Giảng viên</div>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(22, 163, 74, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={24} color="#16a34a" />
              </div>
            </div>
          </div>
          <div style={{ ...panelStyle, background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#991b1b', marginBottom: 4 }}>
                  {classes.reduce((sum, c) => sum + (c.studentCount || 0), 0)}
                </div>
                <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>Tổng học viên</div>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(220, 38, 38, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={24} color="#dc2626" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
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
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, marginBottom: 16, background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={20} color="#fff" />
                </div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Tạo lớp mới</h4>
              </div>
              
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Tên lớp <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    style={{ ...inputStyle, background: '#fff' }} 
                    placeholder="VD: IELTS 6.5 - Sáng thứ 2, 4, 6" 
                    value={createForm.className} 
                    onChange={(e) => setCreateForm(p => ({ ...p, className: e.target.value }))} 
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Mã lớp</label>
                    <input 
                      style={{ ...inputStyle, background: '#fff' }} 
                      placeholder="VD: IELTS-001" 
                      value={createForm.classCode} 
                      onChange={(e) => setCreateForm(p => ({ ...p, classCode: e.target.value }))} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Sĩ số tối đa</label>
                    <input 
                      type="number" 
                      min="1" 
                      style={{ ...inputStyle, background: '#fff' }} 
                      placeholder="VD: 20" 
                      value={createForm.maxStudents} 
                      onChange={(e) => setCreateForm(p => ({ ...p, maxStudents: e.target.value }))} 
                    />
                  </div>
                </div>
                
                <div style={{ border: '2px dashed #d1d5db', borderRadius: 12, padding: 16, background: '#f9fafb', marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Users size={16} color="#6b7280" />
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Thêm học viên (tùy chọn)</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>Upload file CSV với cột: studentCode, fullName, email</div>
                  
                  <label style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    padding: '10px 16px', 
                    background: '#fff', 
                    border: '1px solid #d1d5db', 
                    borderRadius: 10, 
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#374151',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                    </svg>
                    {createCsvFile ? createCsvFile : 'Chọn file CSV'}
                    <input 
                      type="file" 
                      accept=".csv" 
                      ref={createCsvInputRef}
                      style={{ display: 'none' }} 
                      onChange={(e) => handleCreateCsvFile(e.target.files?.[0])} 
                    />
                  </label>
                  
                  {createCsvError && (
                    <div style={{ marginTop: 10, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 12 }}>
                      ⚠️ {createCsvError}
                    </div>
                  )}
                  {createForm.studentCodes.length > 0 && (
                    <div style={{ marginTop: 10, padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#16a34a', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</div>
                      <span style={{ fontWeight: 600 }}>{createForm.studentCodes.length} học viên</span> sẽ được thêm vào lớp
                    </div>
                  )}
                </div>
                
                <button 
                  style={{ ...buttonPrimary, marginTop: 8, height: 44, fontSize: 15 }} 
                  onClick={handleCreateClass} 
                  disabled={createLoading}
                >
                  {createLoading ? 'Đang tạo lớp...' : '✨ Tạo lớp ngay'}
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
                    border: '1px solid #e5e7eb', 
                    borderRadius: 10, 
                    padding: 12, 
                    marginBottom: 10,
                    background: selectedClassId === c.id ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setSelectedClassId(selectedClassId === c.id ? null : c.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {c.code || 'Chưa có mã'} • {c.activeStudentCount || 0} học viên
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{ 
                        padding: '4px 8px',
                        fontSize: 12,
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteClassTarget(c);
                        setDeleteClassPassword('');
                      }}
                    >
                      Xóa
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

      {/* Modal xác nhận xóa lớp */}
      {deleteClassTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => !deletingClass && setDeleteClassTarget(null)}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 450, width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>Xác nhận xóa lớp</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Hành động này không thể hoàn tác</p>
              </div>
            </div>
            
            <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#991b1b' }}>
                Bạn sắp xóa lớp <strong>{deleteClassTarget.name}</strong> ({deleteClassTarget.code || 'Chưa có mã'})
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#dc2626' }}>
                • Tất cả học viên sẽ bị gỡ khỏi lớp<br/>
                • Giảng viên sẽ bị hủy phân công<br/>
                • Dữ liệu lớp sẽ bị xóa vĩnh viễn
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Nhập mật khẩu admin để xác nhận <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="password"
                value={deleteClassPassword}
                onChange={(e) => setDeleteClassPassword(e.target.value)}
                placeholder="Mật khẩu admin"
                disabled={deletingClass}
                style={{ 
                  width: '100%', 
                  padding: '10px 14px', 
                  borderRadius: 10, 
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleDeleteClass()}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => setDeleteClassTarget(null)} 
                disabled={deletingClass}
                style={{ 
                  flex: 1,
                  padding: '10px 16px', 
                  borderRadius: 10, 
                  border: '1px solid #d1d5db', 
                  background: '#fff', 
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14
                }}
              >
                Hủy
              </button>
              <button 
                onClick={handleDeleteClass} 
                disabled={deletingClass}
                style={{ 
                  flex: 1,
                  padding: '10px 16px', 
                  borderRadius: 10, 
                  border: 'none', 
                  background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', 
                  color: 'white', 
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  opacity: deletingClass ? 0.6 : 1
                }}
              >
                {deletingClass ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function parseCodesFromCsv(csvText) {
  const cleanText = String(csvText || '').replace(/^\uFEFF/, ''); // Remove BOM
  const lines = cleanText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  
  if (lines.length === 0) return [];
  
  const parseRow = (line) => line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
  const header = parseRow(lines[0]).map(h => h.toLowerCase());
  
  // Tìm cột username (studentCode)
  const usernameCol = header.findIndex(h => ['username', 'studentcode', 'student_code', 'code', 'mahv'].includes(h));
  
  if (usernameCol === -1) {
    console.warn('Không tìm thấy cột username/studentCode trong CSV');
    return [];
  }
  
  const codes = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i]);
    const code = row[usernameCol];
    if (code && code.trim()) {
      codes.push(code.trim());
    }
  }
  
  return [...new Set(codes)]; // Remove duplicates
}
