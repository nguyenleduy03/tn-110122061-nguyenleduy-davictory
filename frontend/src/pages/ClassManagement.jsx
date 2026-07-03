import { useEffect, useMemo, useRef, useState } from 'react';
import { GraduationCap, Search, Settings2, UserPlus, Users, School, Edit2, X, Save, FileText, Plus, UserCheck, ArrowRightLeft } from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout';
import ManagerLayout from '../components/manager/ManagerLayout';
import { authApi } from '../services/authApi';

const panelStyle = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
};

const inputStyle = {
  width: '100%',
  border: '2px solid #cbd5e1',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  boxSizing: 'border-box',
  outline: 'none',
};

const buttonPrimary = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: 0,
  borderRadius: 10,
  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
  color: '#fff',
  padding: '10px 16px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 13,
  minHeight: 44,
};

const buttonSecondary = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  background: '#fff',
  color: '#475569',
  padding: '10px 16px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 13,
  minHeight: 44,
};

export default function ClassManagement() {
  const [managementData, setManagementData] = useState({ classes: [], teachers: [], currentUser: null });
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [createForm, setCreateForm] = useState({
    className: '',
    classCode: '',
    level: '',
    targetBand: '',
    classType: 'OFFLINE',
    maxStudents: '',
    startDate: '',
    endDate: '',
    schedule: '',
    roomLocation: '',
    notes: '',
    studentCodes: [],
    centerId: ''
  });
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
    className: '',
    level: '',
    targetBand: '',
    classType: '',
    maxStudents: '',
    startDate: '',
    endDate: '',
    schedule: '',
    roomLocation: ''
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

  const [isEditMode, setIsEditMode] = useState(false);

  // Panel states for Assign Teacher & Handover Students
  const [panelTeacherId, setPanelTeacherId] = useState('');
  const [panelClassCode, setPanelClassCode] = useState('');
  const [panelStudentCodes, setPanelStudentCodes] = useState('');
  const [panelFromClass, setPanelFromClass] = useState('');
  const [panelToClass, setPanelToClass] = useState('');

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
  const Layout = authApi.hasRole('ADMIN') ? AdminLayout : ManagerLayout;

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

  const selectedClassStudentCodeSet = useMemo(() => {
    const students = selectedClass?.students || [];
    return new Set(
      students
        .map((s) => String(s?.studentCode || '').trim().toLowerCase())
        .filter(Boolean)
    );
  }, [selectedClass]);

  const selectableStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();

    return (availableStudents || []).filter((s) => {
      const studentCode = String(s?.studentCode || s?.username || '').trim();
      if (!studentCode) return false;

      if (selectedClassStudentCodeSet.has(studentCode.toLowerCase())) {
        return false;
      }

      if (!q) return true;

      const fullName = String(s?.fullName || '').toLowerCase();
      const email = String(s?.email || '').toLowerCase();
      return studentCode.toLowerCase().includes(q) || fullName.includes(q) || email.includes(q);
    });
  }, [availableStudents, selectedClassStudentCodeSet, studentSearch]);

  useEffect(() => {
    if (selectedClass) {
      setEditForm({
        status: selectedClass.status || '',
        teacherId: String(selectedClass.teachers?.[0]?.id || ''),
        notes: selectedClass.notes || '',
        classCode: selectedClass.code || '',
        className: selectedClass.name || '',
        level: selectedClass.level || '',
        targetBand: selectedClass.targetBand || '',
        classType: selectedClass.classType || 'OFFLINE',
        maxStudents: selectedClass.maxStudents || '',
        startDate: selectedClass.startDate || '',
        endDate: selectedClass.endDate || '',
        schedule: selectedClass.schedule || '',
        roomLocation: selectedClass.roomLocation || ''
      });
      setIsEditMode(false); // Reset về chế độ xem khi chọn lớp mới
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
      if (!selectedClass?.code) {
        alert('Lớp chưa có mã, không thể thêm học viên theo danh sách mã');
        return;
      }

      const selectedStudentCodes = selectedStudents
        .map((id) => availableStudents.find((s) => s.id === id))
        .map((s) => String(s?.studentCode || s?.username || '').trim())
        .filter(Boolean);

      if (selectedStudentCodes.length === 0) {
        alert('Không tìm thấy mã học viên hợp lệ trong danh sách đã chọn');
        return;
      }

      console.log('Assigning students by class code:', {
        classCode: selectedClass.code,
        studentCodes: selectedStudentCodes,
      });

      const result = await authApi.assignStudentsByClassCode({
        classCode: selectedClass.code,
        studentCodes: selectedStudentCodes,
        notes: 'Thêm học viên từ màn quản lý lớp',
      });
      console.log('Add students result:', result);

      const successCount = Number(result?.success || 0);
      const failedCount = Number(result?.failed || 0);
      alert(`Đã thêm học viên: ${successCount} thành công, ${failedCount} thất bại`);

      setSelectedStudents([]);
      setShowAddStudents(false);
      setStudentSearch('');
      setRefreshTick((prev) => prev + 1);
    } catch (err) {
      console.error('Add students error:', err);
      console.error('Error response:', err.response?.data);
      alert('Lỗi: ' + (err.response?.data?.message || err.response?.data?.error || err.message));
    }
  };

  const handlePanelAssignTeacher = async () => {
    if (!panelClassCode) { alert('Vui lòng chọn lớp'); return; }
    if (!panelTeacherId) { alert('Vui lòng chọn giảng viên'); return; }
    try {
      await authApi.assignTeacherByClassCode({ classCode: panelClassCode, teacherId: Number(panelTeacherId) });
      alert('Đã phân công giảng viên thành công!');
      setExpandedPanels(p => ({ ...p, assignTeacher: false }));
      setPanelTeacherId(''); setPanelClassCode('');
      setRefreshTick(prev => prev + 1);
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePanelHandoverStudents = async () => {
    if (!panelFromClass) { alert('Vui lòng chọn lớp nguồn'); return; }
    if (!panelToClass) { alert('Vui lòng chọn lớp đích'); return; }
    if (panelFromClass === panelToClass) { alert('Lớp nguồn và lớp đích phải khác nhau'); return; }
    const codes = panelStudentCodes.split('\n').map(s => s.trim()).filter(Boolean);
    if (codes.length === 0) { alert('Vui lòng nhập mã học viên cần bàn giao'); return; }
    if (!window.confirm(`Bàn giao ${codes.length} học viên từ lớp "${panelFromClass}" sang lớp "${panelToClass}"?`)) return;
    try {
      // Bước 1: Thêm vào lớp đích
      const addResult = await authApi.assignStudentsByClassCode({ classCode: panelToClass, studentCodes: codes });
      // Bước 2: Xóa khỏi lớp nguồn
      const fromClass = managementData.classes.find(c => (c.code || c.classCode) === panelFromClass);
      if (fromClass) {
        const students = fromClass.students || [];
        for (const s of students) {
          const code = s.studentCode || s.username;
          if (code && codes.includes(code)) {
            try { await authApi.removeStudentFromClass(fromClass.id, s.id); } catch {}
          }
        }
      }
      alert(`Đã bàn giao ${codes.length} học viên từ "${panelFromClass}" sang "${panelToClass}"`);
      setExpandedPanels(p => ({ ...p, handoverStudents: false }));
      setPanelFromClass(''); setPanelToClass(''); setPanelStudentCodes('');
      setRefreshTick(prev => prev + 1);
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    }
  };

  const togglePanel = (panelName) => {
    const opening = !expandedPanels[panelName];
    if (opening) {
      setPanelClassCode('');
      setPanelTeacherId('');
      setPanelStudentCodes('');
      setPanelFromClass('');
      setPanelToClass('');
    }
    setExpandedPanels(prev => ({ ...prev, [panelName]: opening }));
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
        level: createForm.level || null,
        targetBand: createForm.targetBand || null,
        classType: createForm.classType || 'OFFLINE',
        maxStudents: createForm.maxStudents ? Number(createForm.maxStudents) : null,
        startDate: createForm.startDate || null,
        endDate: createForm.endDate || null,
        schedule: createForm.schedule || null,
        roomLocation: createForm.roomLocation || null,
        notes: createForm.notes || null,
        centerId: createForm.centerId || null
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

      setCreateForm({
        className: '',
        classCode: '',
        level: '',
        targetBand: '',
        classType: 'OFFLINE',
        maxStudents: '',
        startDate: '',
        endDate: '',
        schedule: '',
        roomLocation: '',
        notes: '',
        studentCodes: [],
        centerId: ''
      });
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
        name: editForm.className,
        level: editForm.level || null,
        targetBand: editForm.targetBand || null,
        classType: editForm.classType || null,
        maxStudents: editForm.maxStudents ? Number(editForm.maxStudents) : null,
        startDate: editForm.startDate || null,
        endDate: editForm.endDate || null,
        schedule: editForm.schedule || null,
        roomLocation: editForm.roomLocation || null
      };

      console.log('Payload cập nhật lớp:', payload);

      const result = await authApi.updateClassInfo(selectedClass.id, payload);
      console.log('Kết quả cập nhật:', result);

      alert('Cập nhật thành công!');
      setIsEditMode(false); // Thoát chế độ chỉnh sửa

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
      <Layout title="Quản lý lớp học" subtitle="Đang tải dữ liệu...">
        <div>Đang tải...</div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout title="Quản lý lớp học">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#dc2626' }}>Bạn không có quyền truy cập trang này!</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Quản lý lớp học" subtitle={`${classes.length} lớp học • ${managementData.teachers.length} giảng viên`}>
      <div style={{ display: 'grid', gap: 20 }}>
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{classes.length}</div>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Tổng lớp học</div>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                <School size={24} />
              </div>
            </div>
          </div>
          <div style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{managementData.teachers.length}</div>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Giảng viên</div>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
                <GraduationCap size={24} />
              </div>
            </div>
          </div>
          <div style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                  {classes.reduce((sum, c) => sum + (c.studentCount || 0), 0)}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Tổng học viên</div>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899' }}>
                <Users size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="admin-btn ghost small" onClick={() => togglePanel('createClass')}>
            <Plus size={14} /> Tạo lớp mới
          </button>
          <button className="admin-btn ghost small" onClick={() => togglePanel('assignTeacher')}>
            <UserPlus size={14} /> Gán giảng viên
          </button>
          <button className="admin-btn ghost small" onClick={() => togglePanel('handoverStudents')}>
            <ArrowRightLeft size={14} /> Bàn giao học viên
          </button>
        </div>

        {expandedPanels.createClass && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, marginBottom: 16, background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={20} color="#fff" />
                </div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Tạo lớp mới</h4>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Tên lớp <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    style={{ ...inputStyle, background: '#fff' }}
                    placeholder="VD: IELTS 6.5 - Sáng thứ 2, 4, 6"
                    value={createForm.className}
                    onChange={(e) => setCreateForm(p => ({ ...p, className: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Mã lớp</label>
                    <input
                      style={{ ...inputStyle, background: '#fff' }}
                      placeholder="VD: IELTS-001"
                      value={createForm.classCode}
                      onChange={(e) => setCreateForm(p => ({ ...p, classCode: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Sĩ số tối đa</label>
                    <input
                      type="number"
                      min="1"
                      style={{ ...inputStyle, background: '#fff' }}
                      placeholder="VD: 20"
                      value={createForm.maxStudents}
                      onChange={(e) => setCreateForm(p => ({ ...p, maxStudents: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Loại lớp</label>
                    <select
                      style={{ ...inputStyle, background: '#fff' }}
                      value={createForm.classType}
                      onChange={(e) => setCreateForm(p => ({ ...p, classType: e.target.value }))}
                    >
                      <option value="OFFLINE">Offline</option>
                      <option value="ONLINE">Online</option>
                      <option value="HYBRID">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Trình độ</label>
                    <select
                      style={{ ...inputStyle, background: '#fff' }}
                      value={createForm.level}
                      onChange={(e) => setCreateForm(p => ({ ...p, level: e.target.value }))}
                    >
                      <option value="">Chọn trình độ</option>
                      <option value="BEGINNER">Beginner</option>
                      <option value="ELEMENTARY">Elementary</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="UPPER_INTERMEDIATE">Upper Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Mục tiêu Band</label>
                    <input
                      style={{ ...inputStyle, background: '#fff' }}
                      placeholder="VD: 6.5"
                      value={createForm.targetBand}
                      onChange={(e) => setCreateForm(p => ({ ...p, targetBand: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Ngày khai giảng</label>
                    <input
                      type="date"
                      style={{ ...inputStyle, background: '#fff' }}
                      value={createForm.startDate}
                      onChange={(e) => setCreateForm(p => ({ ...p, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Ngày bế giảng</label>
                    <input
                      type="date"
                      style={{ ...inputStyle, background: '#fff' }}
                      value={createForm.endDate}
                      onChange={(e) => setCreateForm(p => ({ ...p, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Lịch học</label>
                  <input
                    style={{ ...inputStyle, background: '#fff' }}
                    placeholder="VD: Thứ 2,4,6 - 18:00-20:00"
                    value={createForm.schedule}
                    onChange={(e) => setCreateForm(p => ({ ...p, schedule: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Phòng học / Link online</label>
                  <input
                    style={{ ...inputStyle, background: '#fff' }}
                    placeholder="VD: Phòng 301 hoặc https://zoom.us/..."
                    value={createForm.roomLocation}
                    onChange={(e) => setCreateForm(p => ({ ...p, roomLocation: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Ghi chú</label>
                  <textarea
                    style={{ ...inputStyle, background: '#fff', minHeight: 60, resize: 'vertical' }}
                    placeholder="Ghi chú về lớp học..."
                    value={createForm.notes}
                    onChange={(e) => setCreateForm(p => ({ ...p, notes: e.target.value }))}
                  />
                </div>

                <div style={{ border: '2px dashed #e2e8f0', borderRadius: 12, padding: 16, background: '#f8fafc', marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Users size={16} color="#64748b" />
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Thêm học viên (tùy chọn)</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Upload file CSV với cột: studentCode, fullName, email</div>

                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#475569',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#3b82f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
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
                  style={{ ...buttonPrimary, marginTop: 8, height: 44, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
                  onClick={handleCreateClass}
                  disabled={createLoading}
                >
                  <GraduationCap size={18} /> {createLoading ? 'Đang tạo lớp...' : 'Tạo lớp ngay'}
                </button>
              </div>
            </div>
          )}

          {expandedPanels.assignTeacher && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, marginBottom: 16, background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={20} color="#fff" />
                </div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Gán giảng viên</h4>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Chọn lớp</label>
                  <select style={inputStyle} value={panelClassCode} onChange={e => setPanelClassCode(e.target.value)}>
                    <option value="">-- Chọn lớp --</option>
                    {(managementData.classes || []).map(c => (
                      <option key={c.id} value={c.code || c.classCode}>{c.name} ({c.code || c.classCode})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Giảng viên</label>
                  <select style={inputStyle} value={panelTeacherId} onChange={e => setPanelTeacherId(e.target.value)}>
                    <option value="">-- Chọn giảng viên --</option>
                    {managementData.teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.fullName} ({t.email})</option>
                    ))}
                  </select>
                </div>
                <button style={{ ...buttonPrimary, marginTop: 4 }} onClick={handlePanelAssignTeacher}>
                  <GraduationCap size={18} /> Phân công
                </button>
              </div>
            </div>
          )}

          {expandedPanels.handoverStudents && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, marginBottom: 16, background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} color="#fff" />
                </div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Bàn giao học viên</h4>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Từ lớp</label>
                    <select style={inputStyle} value={panelFromClass} onChange={e => { setPanelFromClass(e.target.value); setPanelStudentCodes(''); }}>
                      <option value="">-- Chọn lớp nguồn --</option>
                      {(managementData.classes || []).map(c => (
                        <option key={c.id} value={c.code || c.classCode}>{c.name} ({c.code || c.classCode})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Sang lớp</label>
                    <select style={inputStyle} value={panelToClass} onChange={e => setPanelToClass(e.target.value)}>
                      <option value="">-- Chọn lớp đích --</option>
                      {(managementData.classes || []).map(c => (
                        <option key={c.id} value={c.code || c.classCode}>{c.name} ({c.code || c.classCode})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Mã học viên cần bàn giao (mỗi dòng 1 mã)</label>
                  <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="HS001&#10;HS002&#10;HS003" value={panelStudentCodes} onChange={e => setPanelStudentCodes(e.target.value)} />
                </div>
                <button style={{ ...buttonPrimary, marginTop: 4 }} onClick={handlePanelHandoverStudents}>
                  <ArrowRightLeft size={18} /> Bàn giao
                </button>
              </div>
            </div>
          )}

        {/* Class List */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedClassId ? '380px 1fr' : '1fr', gap: 16 }}>
          <div style={panelStyle}>
            <div className="admin-filter-row" style={{ marginBottom: 12 }}>
              <div className="admin-search-wrap" style={{ minWidth: 0 }}>
                <Search size={16} className="admin-search-icon" />
                <input
                  className="admin-input admin-input-search"
                  placeholder="Tìm kiếm lớp học..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {classes.map((c) => (
                <div
                  key={c.id}
                  className="admin-card-btn"
                  style={{
                    border: `1px solid ${selectedClassId === c.id ? '#6366f1' : '#e2e8f0'}`,
                    borderRadius: 12,
                    padding: '12px 14px',
                    background: selectedClassId === c.id ? '#f8f8ff' : '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s ease',
                    boxShadow: selectedClassId === c.id ? '0 0 0 2px rgba(99,102,241,0.15)' : 'none'
                  }}
                  onClick={() => setSelectedClassId(selectedClassId === c.id ? null : c.id)}
                  onMouseEnter={e => { if (selectedClassId !== c.id) { e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.background = '#fafaff'; } }}
                  onMouseLeave={e => { if (selectedClassId !== c.id) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; } }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', gap: 8 }}>
                      <span>{c.code || 'Chưa có mã'}</span>
                      <span>•</span>
                      <span>{c.activeStudentCount || 0} học viên</span>
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    background: c.status === 'ACTIVE' ? '#dcfce7' : c.status === 'UPCOMING' ? '#fef3c7' : '#f1f5f9',
                    color: c.status === 'ACTIVE' ? '#166534' : c.status === 'UPCOMING' ? '#92400e' : '#64748b',
                    marginLeft: 8,
                    flexShrink: 0
                  }}>
                    {c.status === 'ACTIVE' ? 'Đang học' : c.status === 'UPCOMING' ? 'Sắp học' : c.status || 'N/A'}
                  </span>
                </div>
              ))}
              {classes.length === 0 && (
                <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13 }}>
                  Chưa có lớp học nào
                </div>
              )}
            </div>
          </div>

          {selectedClassId && selectedClass && (
            <div style={panelStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  Chi tiết: {selectedClass.name}
                </h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!isEditMode ? (
                    <button
                      style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      onClick={() => setIsEditMode(true)}
                    >
                      <Edit2 size={14} /> Chỉnh sửa
                    </button>
                  ) : (
                    <button
                      style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        background: '#64748b',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      onClick={() => {
                        setIsEditMode(false);
                        // Reset form về giá trị ban đầu
                        setEditForm({
                          status: selectedClass.status || '',
                          teacherId: String(selectedClass.teachers?.[0]?.id || ''),
                          notes: selectedClass.notes || '',
                          classCode: selectedClass.code || '',
                          className: selectedClass.name || '',
                          level: selectedClass.level || '',
                          targetBand: selectedClass.targetBand || '',
                          classType: selectedClass.classType || 'OFFLINE',
                          maxStudents: selectedClass.maxStudents || '',
                          startDate: selectedClass.startDate || '',
                          endDate: selectedClass.endDate || '',
                          schedule: selectedClass.schedule || '',
                          roomLocation: selectedClass.roomLocation || ''
                        });
                      }}
                    >
                      <X size={14} /> Hủy
                    </button>
                  )}
                  <button
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    onClick={() => setSelectedClassId(null)}
                  >
                    <X size={14} /> Đóng
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 20 }}>
                {/* Thông tin cơ bản */}
                <div>
                  <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <School size={16} /> Thông tin lớp học
                  </h3>

                  <div style={{
                    background: '#fff',
                    border: '1px solid #f1f5f9',
                    borderRadius: 12,
                    padding: 16,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px 24px',
                    fontSize: 13
                  }}>
                    <div><span style={{ color: '#64748b' }}>Tên lớp:</span> <span style={{ color: '#0f172a', fontWeight: 600 }}>{selectedClass.name}</span></div>
                    <div><span style={{ color: '#64748b' }}>Mã lớp:</span> <span style={{ color: '#0f172a', fontFamily: 'monospace', fontWeight: 600 }}>{selectedClass.code || 'N/A'}</span></div>
                    {selectedClass.center && <div><span style={{ color: '#64748b' }}>Trung tâm:</span> <span style={{ color: '#0f172a' }}>{selectedClass.center.name}</span></div>}
                    <div><span style={{ color: '#64748b' }}>Trạng thái:</span>{' '}
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: selectedClass.status === 'ACTIVE' ? '#dcfce7' : selectedClass.status === 'UPCOMING' ? '#fef3c7' : '#f1f5f9',
                        color: selectedClass.status === 'ACTIVE' ? '#166534' : selectedClass.status === 'UPCOMING' ? '#92400e' : '#64748b'
                      }}>{selectedClass.status === 'ACTIVE' ? 'Đang hoạt động' : selectedClass.status === 'UPCOMING' ? 'Sắp diễn ra' : selectedClass.status || 'N/A'}</span>
                    </div>
                    {selectedClass.level && <div><span style={{ color: '#64748b' }}>Trình độ:</span> <span style={{ color: '#0f172a' }}>{selectedClass.level}</span></div>}
                    {selectedClass.targetBand && <div><span style={{ color: '#64748b' }}>Mục tiêu Band:</span> <span style={{ color: '#0f172a' }}>{selectedClass.targetBand}</span></div>}
                    {selectedClass.classType && <div><span style={{ color: '#64748b' }}>Loại lớp:</span> <span style={{ color: '#0f172a' }}>{selectedClass.classType}</span></div>}
                    {selectedClass.maxStudents && <div><span style={{ color: '#64748b' }}>Sĩ số tối đa:</span> <span style={{ color: '#0f172a' }}>{selectedClass.maxStudents}</span></div>}
                    {selectedClass.schedule && <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#64748b' }}>Lịch học:</span> <span style={{ color: '#0f172a' }}>{selectedClass.schedule}</span></div>}
                    {selectedClass.roomLocation && <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#64748b' }}>Phòng/Link:</span> <span style={{ color: '#0f172a' }}>{selectedClass.roomLocation}</span></div>}
                    {selectedClass.startDate && <div><span style={{ color: '#64748b' }}>Khai giảng:</span> <span style={{ color: '#0f172a' }}>{new Date(selectedClass.startDate).toLocaleDateString('vi-VN')}</span></div>}
                    {selectedClass.endDate && <div><span style={{ color: '#64748b' }}>Bế giảng:</span> <span style={{ color: '#0f172a' }}>{new Date(selectedClass.endDate).toLocaleDateString('vi-VN')}</span></div>}
                    {selectedClass.createdAt && <div><span style={{ color: '#64748b' }}>Ngày tạo:</span> <span style={{ color: '#0f172a' }}>{new Date(selectedClass.createdAt).toLocaleDateString('vi-VN')}</span></div>}
                    {selectedClass.updatedAt && <div><span style={{ color: '#64748b' }}>Cập nhật:</span> <span style={{ color: '#0f172a' }}>{new Date(selectedClass.updatedAt).toLocaleDateString('vi-VN')}</span></div>}
                    {selectedClass.notes && <div style={{ gridColumn: 'span 2', paddingTop: 8, borderTop: '1px solid #f1f5f9', marginTop: 4 }}>
                      <span style={{ color: '#64748b' }}>Ghi chú:</span> <span style={{ color: '#0f172a' }}>{selectedClass.notes}</span>
                    </div>}
                  </div>

                  {isEditMode && (
                    <>
                      <h3 style={{ margin: '16px 0 10px', fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Edit2 size={16} /> Chỉnh sửa thông tin
                      </h3>
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: 16,
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 10
                      }}>
                        <div>
                          <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>Tên lớp</label>
                          <input value={editForm.className} onChange={e => setEditForm(p => ({ ...p, className: e.target.value }))}
                            style={inputStyle} placeholder="Tên lớp học" />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>Trạng thái</label>
                          <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                            <option value="UPCOMING">Sắp diễn ra</option>
                            <option value="ACTIVE">Đang hoạt động</option>
                            <option value="COMPLETED">Đã kết thúc</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>Trình độ</label>
                          <select value={editForm.level} onChange={e => setEditForm(p => ({ ...p, level: e.target.value }))} style={inputStyle}>
                            <option value="">--</option>
                            <option value="BEGINNER">Beginner</option>
                            <option value="ELEMENTARY">Elementary</option>
                            <option value="INTERMEDIATE">Intermediate</option>
                            <option value="UPPER_INTERMEDIATE">Upper Intermediate</option>
                            <option value="ADVANCED">Advanced</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>Mục tiêu Band</label>
                          <input value={editForm.targetBand} onChange={e => setEditForm(p => ({ ...p, targetBand: e.target.value }))}
                            style={inputStyle} placeholder="VD: 6.5" />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>Loại lớp</label>
                          <select value={editForm.classType} onChange={e => setEditForm(p => ({ ...p, classType: e.target.value }))} style={inputStyle}>
                            <option value="OFFLINE">Offline</option>
                            <option value="ONLINE">Online</option>
                            <option value="HYBRID">Hybrid</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>Sĩ số tối đa</label>
                          <input type="number" value={editForm.maxStudents} onChange={e => setEditForm(p => ({ ...p, maxStudents: e.target.value }))}
                            style={inputStyle} placeholder="VD: 20" />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>Ngày khai giảng</label>
                          <input type="date" value={editForm.startDate} onChange={e => setEditForm(p => ({ ...p, startDate: e.target.value }))} style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>Ngày bế giảng</label>
                          <input type="date" value={editForm.endDate} onChange={e => setEditForm(p => ({ ...p, endDate: e.target.value }))} style={inputStyle} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>Lịch học</label>
                          <input value={editForm.schedule} onChange={e => setEditForm(p => ({ ...p, schedule: e.target.value }))} style={inputStyle} placeholder="VD: Thứ 2,4,6 - 18:00-20:00" />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>Phòng học / Link online</label>
                          <input value={editForm.roomLocation} onChange={e => setEditForm(p => ({ ...p, roomLocation: e.target.value }))} style={inputStyle} placeholder="VD: Phòng 301" />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>Ghi chú</label>
                          <textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                            style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} placeholder="Ghi chú về lớp học..." />
                        </div>
                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                          <button className="admin-btn ghost small" onClick={() => { setIsEditMode(false); }}>
                            <X size={14} /> Hủy
                          </button>
                          <button className="admin-btn primary small" onClick={handleUpdateClass} disabled={editLoading}>
                            <Save size={14} /> {editLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Giảng viên */}
                <div>
                  <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <GraduationCap size={16} /> Giảng viên ({(selectedClass.teachers || []).length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(selectedClass.teachers || []).length > 0 ? selectedClass.teachers.map((t) => (
                      <div key={`${t.id}-${t.role}`} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                        background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 10
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', background: '#6366f1', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0
                        }}>{t.fullName?.[0] || '?'}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{t.fullName}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{t.email}</div>
                        </div>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: '#eef2ff', color: '#4f46e5'
                        }}>{t.role === 'MAIN_TEACHER' ? 'Chính' : t.role}</span>
                      </div>
                    )) : (
                      <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 13, background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                        Chưa có giảng viên
                      </div>
                    )}
                  </div>
                </div>

                {/* Học viên */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={16} /> Học viên ({(selectedClass.students || []).length})
                    </h3>
                    <button className="admin-btn ghost small" onClick={() => { setShowAddStudents(true); loadAvailableStudents(); }}>
                      + Thêm
                    </button>
                  </div>
                  <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(selectedClass.students || []).length > 0 ? selectedClass.students.map((s) => (
                      <div key={s.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                        background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 8
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', background: '#3b82f6', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0
                        }}>{s.fullName?.[0] || '?'}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{s.fullName || s.email || 'N/A'}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{s.studentCode ? `Mã: ${s.studentCode}` : s.email || ''}</div>
                        </div>
                        <button onClick={() => handleRemoveStudent(s.id)} style={{
                          width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent',
                          color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, flexShrink: 0
                        }} title="Xóa">✕</button>
                      </div>
                    )) : (
                      <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 13, background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
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
          <div className="admin-modal-overlay" onClick={() => { setShowAddStudents(false); setSelectedStudents([]); setStudentSearch(''); }}>
            <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
              <div className="admin-modal-header">
                <h2>Thêm học viên: {selectedClass?.name}</h2>
                <button className="admin-modal-close" onClick={() => { setShowAddStudents(false); setSelectedStudents([]); setStudentSearch(''); }}>✕</button>
              </div>
              <div className="admin-modal-body">
                <div style={{ marginBottom: 16 }}>
                  <div className="admin-search-wrap" style={{ minWidth: 0 }}>
                    <Search size={16} className="admin-search-icon" />
                    <input className="admin-input admin-input-search" placeholder="Tìm theo mã hoặc tên..."
                      value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                  </div>
                </div>

                <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 16 }}>
                  {selectableStudents.map(student => {
                    const code = student.studentCode || student.username;
                    const selected = selectedStudents.includes(student.id);
                    return (
                      <div key={student.id} style={{
                        padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: selected ? '#f8f8ff' : '#fff'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{student.fullName}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>Mã: {code || 'N/A'}</div>
                        </div>
                        <button className={`admin-btn ${selected ? 'primary' : 'ghost'} small`} style={{ minHeight: 32, padding: '4px 10px' }}
                          onClick={() => {
                            if (selected) setSelectedStudents(prev => prev.filter(id => id !== student.id));
                            else setSelectedStudents(prev => [...prev, student.id]);
                          }}>
                          {selected ? 'Bỏ chọn' : 'Chọn'}
                        </button>
                      </div>
                    );
                  })}
                  {selectableStudents.length === 0 && (
                    <div style={{ padding: 24, color: '#64748b', fontSize: 13, textAlign: 'center' }}>
                      Không có học viên phù hợp
                    </div>
                  )}
                </div>

                {selectedStudents.length > 0 && (
                  <div style={{ marginBottom: 16, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                    Đã chọn: {selectedStudents.length} học viên
                  </div>
                )}

                <div className="admin-modal-actions">
                  <button className="admin-btn ghost" onClick={() => { setShowAddStudents(false); setSelectedStudents([]); setStudentSearch(''); }}>Hủy</button>
                  <button className="admin-btn primary" onClick={handleAddStudents} disabled={selectedStudents.length === 0}>
                    Thêm {selectedStudents.length} học viên
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal xác nhận xóa lớp */}
      {deleteClassTarget && (
        <div className="admin-modal-overlay" onClick={() => !deletingClass && setDeleteClassTarget(null)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="admin-modal-header">
              <h2>Xác nhận xóa lớp</h2>
              <button className="admin-modal-close" onClick={() => setDeleteClassTarget(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 14, color: '#991b1b' }}>
                  Bạn sắp xóa lớp <strong>{deleteClassTarget.name}</strong> ({deleteClassTarget.code || 'Chưa có mã'})
                </p>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#dc2626' }}>
                  • Tất cả học viên sẽ bị gỡ khỏi lớp<br />
                  • Giảng viên sẽ bị hủy phân công<br />
                  • Dữ liệu lớp sẽ bị xóa vĩnh viễn
                </p>
              </div>

              <div className="admin-form-group">
                <label>Nhập mật khẩu admin để xác nhận <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="password" value={deleteClassPassword}
                  onChange={(e) => setDeleteClassPassword(e.target.value)}
                  placeholder="Mật khẩu admin" disabled={deletingClass}
                  onKeyPress={(e) => e.key === 'Enter' && handleDeleteClass()} />
              </div>

              <div className="admin-modal-actions">
                <button className="admin-btn ghost" onClick={() => setDeleteClassTarget(null)} disabled={deletingClass}>Hủy</button>
                <button className="admin-btn danger" onClick={handleDeleteClass} disabled={deletingClass}>
                  {deletingClass ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
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
