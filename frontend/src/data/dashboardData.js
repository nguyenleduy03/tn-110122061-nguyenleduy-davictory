// ─────────────────────────────────────────────────────────────────
// Shared mock data for all My-Dashboard sub-pages
// ─────────────────────────────────────────────────────────────────

export const USER = {
  name: 'Nguyễn Văn An',
  email: 'nguyenvanan@email.com',
  phone: '0901 234 567',
  avatar: 'NVA',
  joinDate: 'Tháng 1, 2024',
  memberType: 'Thành viên Miễn phí',
  targetBand: 7.5,
  bio: 'Đang ôn luyện IELTS để xuất khẩu lao động. Mục tiêu Band 7.5 trước tháng 6/2026.',
  birthday: '1998-05-15',
  nationality: 'Việt Nam',
  studyLevel: 'Đại học',
};

export const HISTORY = [
  { id: 1,  date: '08/03/2026', title: 'IELTS Academic Test 1',              skill: 'READING',   score: 7.5, duration: '60 phút',  status: 'completed', correct: 36, total: 40 },
  { id: 2,  date: '06/03/2026', title: 'IELTS Listening Practice Test 4',    skill: 'LISTENING', score: 7.0, duration: '40 phút',  status: 'completed', correct: 32, total: 40 },
  { id: 3,  date: '04/03/2026', title: 'IELTS Writing Task 1 & Task 2',      skill: 'WRITING',   score: 6.0, duration: '60 phút',  status: 'completed', correct: null, total: null },
  { id: 4,  date: '01/03/2026', title: 'IELTS Academic Test 2',              skill: 'READING',   score: 6.5, duration: '60 phút',  status: 'completed', correct: 30, total: 40 },
  { id: 5,  date: '26/02/2026', title: 'IELTS Speaking Full Mock Test',      skill: 'SPEAKING',  score: 6.5, duration: '15 phút',  status: 'completed', correct: null, total: null },
  { id: 6,  date: '20/02/2026', title: 'IELTS Listening Test 3',             skill: 'LISTENING', score: 6.5, duration: '40 phút',  status: 'completed', correct: 30, total: 40 },
  { id: 7,  date: '15/02/2026', title: 'Cambridge IELTS 17 – Reading Test',  skill: 'READING',   score: 8.0, duration: '60 phút',  status: 'completed', correct: 38, total: 40 },
  { id: 8,  date: '10/02/2026', title: 'IELTS Writing Academic Task 1',      skill: 'WRITING',   score: 5.5, duration: '20 phút',  status: 'completed', correct: null, total: null },
  { id: 9,  date: '05/02/2026', title: 'IELTS Academic Test 3',              skill: 'READING',   score: 7.0, duration: '60 phút',  status: 'completed', correct: 32, total: 40 },
  { id: 10, date: '01/02/2026', title: 'IELTS Listening Practice Test 1',    skill: 'LISTENING', score: 6.0, duration: '40 phút',  status: 'completed', correct: 27, total: 40 },
  { id: 11, date: '25/01/2026', title: 'IELTS Speaking Part 2 & 3',         skill: 'SPEAKING',  score: 7.0, duration: '10 phút',  status: 'completed', correct: null, total: null },
  { id: 12, date: '20/01/2026', title: 'IELTS Listening Practice Test 2',   skill: 'LISTENING', score: 7.5, duration: '40 phút',  status: 'completed', correct: 35, total: 40 },
];

export const SKILL_META = {
  LISTENING: { bg: '#dbeafe', text: '#1d4ed8', label: 'Listening' },
  READING:   { bg: '#dcfce7', text: '#15803d', label: 'Reading' },
  WRITING:   { bg: '#fef9c3', text: '#a16207', label: 'Writing' },
  SPEAKING:  { bg: '#fce7f3', text: '#be185d', label: 'Speaking' },
};
