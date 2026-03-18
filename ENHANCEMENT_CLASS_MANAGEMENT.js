// Cập nhật createForm state để bao gồm tất cả các trường từ Entity Class
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
  studentCodes: [] 
});

// Thêm vào phần hiển thị chi tiết lớp để show thêm các trường:
// - center (thông tin trung tâm)
// - isActive
// - createdAt, updatedAt
// - level, targetBand, classType, schedule, roomLocation

// Ví dụ hiển thị trong phần chi tiết lớp:
<div style={{ background: '#f9fafb', padding: 12, borderRadius: 6, border: '1px solid #e5e7eb', marginBottom: 12 }}>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
    <div>
      <span style={{ color: '#6b7280' }}>Trung tâm:</span>{' '}
      <span style={{ fontWeight: 600 }}>{selectedClass.center?.name || 'N/A'}</span>
    </div>
    <div>
      <span style={{ color: '#6b7280' }}>Trình độ:</span>{' '}
      <span style={{ fontWeight: 600 }}>{selectedClass.level || 'N/A'}</span>
    </div>
    <div>
      <span style={{ color: '#6b7280' }}>Mục tiêu Band:</span>{' '}
      <span style={{ fontWeight: 600 }}>{selectedClass.targetBand || 'N/A'}</span>
    </div>
    <div>
      <span style={{ color: '#6b7280' }}>Loại lớp:</span>{' '}
      <span style={{ fontWeight: 600 }}>{selectedClass.classType || 'N/A'}</span>
    </div>
    <div>
      <span style={{ color: '#6b7280' }}>Lịch học:</span>{' '}
      <span style={{ fontWeight: 600 }}>{selectedClass.schedule || 'N/A'}</span>
    </div>
    <div>
      <span style={{ color: '#6b7280' }}>Phòng/Link:</span>{' '}
      <span style={{ fontWeight: 600, fontSize: 12 }}>{selectedClass.roomLocation || 'N/A'}</span>
    </div>
    <div>
      <span style={{ color: '#6b7280' }}>Ngày tạo:</span>{' '}
      <span style={{ fontWeight: 600 }}>{selectedClass.createdAt ? new Date(selectedClass.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</span>
    </div>
    <div>
      <span style={{ color: '#6b7280' }}>Cập nhật:</span>{' '}
      <span style={{ fontWeight: 600 }}>{selectedClass.updatedAt ? new Date(selectedClass.updatedAt).toLocaleDateString('vi-VN') : 'N/A'}</span>
    </div>
  </div>
</div>
