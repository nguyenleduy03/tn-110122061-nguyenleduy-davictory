export const classes = [
  {
    id: 'batch-12',
    code: 'VIC260312IE45A',
    name: 'Batch 12',
    level: 'Upper-Intermediate',
    students: 28,
    schedule: 'Mon/Wed/Fri · 18:00-20:00',
    next: 'Mar 18 18:00',
    room: 'Room A302',
    completionRate: 78,
    pendingSubmissions: 7,
    avgBand: 6.3,
  },
  {
    id: 'batch-13',
    code: 'VIC260312IE45B',
    name: 'Batch 13',
    level: 'Intermediate',
    students: 24,
    schedule: 'Tue/Thu · 19:00-21:00',
    next: 'Mar 19 19:00',
    room: 'Room B101',
    completionRate: 72,
    pendingSubmissions: 4,
    avgBand: 6.0,
  },
  {
    id: 'night-class',
    code: 'VIC260312IE45C',
    name: 'Night Class',
    level: 'Foundation',
    students: 16,
    schedule: 'Sat · 20:00-22:00',
    next: 'Mar 20 20:00',
    room: 'Online Zoom 2',
    completionRate: 65,
    pendingSubmissions: 5,
    avgBand: 5.6,
  },
];

export const rosterByClass = {
  'batch-12': [
    { name: 'Ngoc Tran', progress: 78, status: 'Active' },
    { name: 'Minh Le', progress: 72, status: 'Active' },
    { name: 'An Pham', progress: 65, status: 'Needs support' },
    { name: 'Ha Vu', progress: 88, status: 'Active' },
  ],
  'batch-13': [
    { name: 'Khanh Vu', progress: 70, status: 'Active' },
    { name: 'Hoang Dinh', progress: 62, status: 'Needs support' },
    { name: 'Nhat Linh', progress: 76, status: 'Active' },
  ],
  'night-class': [
    { name: 'Phuong Ly', progress: 58, status: 'Needs support' },
    { name: 'Tung Anh', progress: 67, status: 'Active' },
    { name: 'Kiet Nguyen', progress: 63, status: 'Active' },
  ],
};

export const submissionsByClass = {
  'batch-12': [
    { id: 's-301', student: 'Ngoc Tran', task: 'Writing Task 2 Opinion', words: 284, status: 'Pending', score: null, submittedAt: '2026-03-15 20:10' },
    { id: 's-302', student: 'Minh Le', task: 'Writing Task 1 Report', words: 198, status: 'Pending', score: null, submittedAt: '2026-03-15 21:02' },
    { id: 's-303', student: 'Ha Vu', task: 'Writing Task 2 Discussion', words: 302, status: 'Graded', score: 7.0, submittedAt: '2026-03-14 19:43' },
  ],
  'batch-13': [
    { id: 's-401', student: 'Khanh Vu', task: 'Writing Task 2 Problem-Solution', words: 271, status: 'Pending', score: null, submittedAt: '2026-03-15 19:16' },
    { id: 's-402', student: 'Nhat Linh', task: 'Writing Task 1 Process', words: 190, status: 'Graded', score: 6.5, submittedAt: '2026-03-14 20:04' },
  ],
  'night-class': [
    { id: 's-501', student: 'Phuong Ly', task: 'Writing Task 2 Advantages', words: 242, status: 'Pending', score: null, submittedAt: '2026-03-15 22:11' },
    { id: 's-502', student: 'Tung Anh', task: 'Writing Task 1 Chart', words: 173, status: 'Pending', score: null, submittedAt: '2026-03-15 22:29' },
  ],
};

export const lessonsByClass = {
  'batch-12': [
    { id: 'l-1', title: 'Writing Task 2 - Opinion Structure', status: 'Done' },
    { id: 'l-2', title: 'Cohesion & Coherence Drills', status: 'Done' },
    { id: 'l-3', title: 'Grammar Focus: Complex Sentences', status: 'In progress' },
  ],
  'batch-13': [
    { id: 'l-4', title: 'Task 1 Overview & Trend Language', status: 'Done' },
    { id: 'l-5', title: 'Paragraphing Strategy', status: 'In progress' },
    { id: 'l-6', title: 'Lexical Resource Workshop', status: 'Planned' },
  ],
  'night-class': [
    { id: 'l-7', title: 'Foundation Grammar Review', status: 'Done' },
    { id: 'l-8', title: 'Sentence Building Practice', status: 'In progress' },
    { id: 'l-9', title: 'Simple Task 1 Response', status: 'Planned' },
  ],
};

export const assignmentsByClass = {
  'batch-12': [
    { id: 'a-1', name: 'Task 1 Report (Week 2)', completion: 86 },
    { id: 'a-2', name: 'Task 2 Opinion Essay', completion: 72 },
    { id: 'a-3', name: 'Grammar Workbook Set 4', completion: 68 },
  ],
  'batch-13': [
    { id: 'a-4', name: 'Task 1 Process Essay', completion: 78 },
    { id: 'a-5', name: 'Collocation Quiz', completion: 69 },
    { id: 'a-6', name: 'Timed Writing Practice', completion: 61 },
  ],
  'night-class': [
    { id: 'a-7', name: 'Basic Linking Words', completion: 74 },
    { id: 'a-8', name: 'Sentence Correction', completion: 65 },
    { id: 'a-9', name: 'Mini Writing Task', completion: 58 },
  ],
};

export const effortSeriesByClass = {
  'batch-12': [70, 74, 79, 81, 77],
  'batch-13': [66, 69, 71, 73, 72],
  'night-class': [60, 62, 65, 67, 64],
};
