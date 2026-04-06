import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import React, { Suspense, lazy } from 'react'
import ProtectedRoute from './components/common/ProtectedRoute'
import RoleBasedRoute from './components/common/RoleBasedRoute'
import ErrorBoundary from './components/common/ErrorBoundary'
import './App.css'

const HomePage = lazy(() => import('./pages/HomePage'))
const ExamLibrary = lazy(() => import('./pages/ExamLibrary'))
const IeltsReadingTest = lazy(() => import('./pages/IeltsReadingTest'))
const IeltsListeningTest = lazy(() => import('./pages/IeltsListeningTest'))
const IeltsWritingTest = lazy(() => import('./pages/IeltsWritingTest'))
const IeltsSpeakingTest = lazy(() => import('./pages/IeltsSpeakingTest'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const TestBuilder = lazy(() => import('./pages/TestBuilder'))
const TeacherManage = lazy(() => import('./pages/TeacherManage'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const LmsTeacherDashboard = lazy(() => import('./pages/lms/LmsTeacherDashboard'))
const ClassManagement = lazy(() => import('./pages/ClassManagement'))
const LmsTeacherClasses = lazy(() => import('./pages/lms/LmsTeacherClasses'))
const LmsTeacherTests = lazy(() => import('./pages/lms/LmsTeacherTests'))
const LmsTeacherAssignments = lazy(() => import('./pages/lms/LmsTeacherAssignments'))
const LmsAssignmentDetail = lazy(() => import('./pages/lms/LmsAssignmentDetail'))
const LmsTeacherSubmissions = lazy(() => import('./pages/lms/LmsTeacherSubmissions'))
const LmsSubmissionDetail = lazy(() => import('./pages/lms/LmsSubmissionDetail'))
const LmsGradeSubmission = lazy(() => import('./pages/lms/LmsGradeSubmission'))
const LmsTeacherAnalytics = lazy(() => import('./pages/lms/LmsTeacherAnalytics'))
const LmsTeacherClassDetail = lazy(() => import('./pages/lms/LmsTeacherClassDetail'))
const LmsTeacherSettings = lazy(() => import('./pages/lms/LmsTeacherSettings'))
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'))
const ManagerClasses = lazy(() => import('./pages/ManagerClasses'))
const ManagerClassDetail = lazy(() => import('./pages/ManagerClassDetail'))
const ManagerOperations = lazy(() => import('./pages/ManagerOperations'))
const ManagerReports = lazy(() => import('./pages/ManagerReports'))
const MyDashboard = lazy(() => import('./pages/MyDashboard'))
const TestComplete = lazy(() => import('./pages/TestComplete'))
const ShareLinkStatusPage = lazy(() => import('./pages/ShareLinkStatusPage'))
const DashboardHistory = lazy(() => import('./pages/DashboardHistory'))
const DashboardProfile = lazy(() => import('./pages/DashboardProfile'))
const DashboardSettings = lazy(() => import('./pages/DashboardSettings'))
const ApiDebugPage = lazy(() => import('./pages/ApiDebugPage'))
const GradeWriting = lazy(() => import('./pages/teacher/GradeWriting'))
const GradeSpeaking = lazy(() => import('./pages/teacher/GradeSpeaking'))
const GradeAssignment = lazy(() => import('./pages/teacher/GradeAssignment'))
const AssignmentTemplates = lazy(() => import('./pages/teacher/AssignmentTemplates'))
const CreateAssignment = lazy(() => import('./pages/teacher/CreateAssignment'))
const StudentLms = lazy(() => import('./pages/student/StudentLms'))
const AssignmentDetail = lazy(() => import('./pages/student/AssignmentDetail'))
const SubmitAssignment = lazy(() => import('./pages/student/SubmitAssignment'))
const AssignmentResult = lazy(() => import('./pages/student/AssignmentResult'))
const TestApiPage = lazy(() => import('./pages/TestApiPage'))

function App() {
  return (
    <Router>
      <Suspense fallback={(
        <div style={appLoadingStyle}>
          <div style={appLoadingCardStyle}>
            <div style={appLoadingSpinnerStyle} />
            <div style={{ marginTop: 14, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              Đang tải trang...
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: '#64748b' }}>
              Vui lòng chờ trong giây lát.
            </div>
          </div>
        </div>
      )}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/test-api" element={<TestApiPage />} />
          <Route path="/exam-library" element={<ExamLibrary />} />

          {/* Test routes — yêu cầu đăng nhập (STUDENT role) để gọi BE API */}
          <Route path="/test/reading" element={<ProtectedRoute><IeltsReadingTest /></ProtectedRoute>} />
          <Route path="/test/reading/:id" element={<ProtectedRoute><IeltsReadingTest /></ProtectedRoute>} />
          <Route path="/test/listening" element={<ProtectedRoute><IeltsListeningTest /></ProtectedRoute>} />
          <Route path="/test/listening/:id" element={<ProtectedRoute><IeltsListeningTest /></ProtectedRoute>} />
          <Route path="/test/writing" element={<ProtectedRoute><IeltsWritingTest /></ProtectedRoute>} />
          <Route path="/test/writing/:id" element={<ProtectedRoute><IeltsWritingTest /></ProtectedRoute>} />
          <Route path="/test/speaking" element={<ProtectedRoute><IeltsSpeakingTest /></ProtectedRoute>} />
          <Route path="/test/speaking/:id" element={<ProtectedRoute><IeltsSpeakingTest /></ProtectedRoute>} />
          <Route path="/test/complete" element={<TestComplete />} />
          <Route path="/share-link-expired" element={<ShareLinkStatusPage />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/debug" element={<ApiDebugPage />} />
          <Route path="/my-dashboard" element={<ProtectedRoute><MyDashboard /></ProtectedRoute>} />
          <Route path="/my-dashboard/history" element={<ProtectedRoute><DashboardHistory /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><DashboardProfile /></ProtectedRoute>} />
          <Route path="/my-dashboard/settings" element={<ProtectedRoute><DashboardSettings /></ProtectedRoute>} />
          <Route path="/admin" element={<RoleBasedRoute requiredRole="ADMIN"><ErrorBoundary><AdminDashboard /></ErrorBoundary></RoleBasedRoute>} />
          <Route path="/admin/users" element={<RoleBasedRoute requiredRole="ADMIN"><ErrorBoundary><AdminUsers /></ErrorBoundary></RoleBasedRoute>} />
          <Route path="/admin/tests" element={<RoleBasedRoute requiredRole="ADMIN"><Navigate to="/lms/teacher/tests" replace /></RoleBasedRoute>} />
          <Route path="/admin/drive" element={<RoleBasedRoute requiredRole="ADMIN"><Navigate to="/admin#drive" replace /></RoleBasedRoute>} />
          <Route path="/admin/teacher-class" element={<RoleBasedRoute requiredRole="ADMIN"><ErrorBoundary><ClassManagement /></ErrorBoundary></RoleBasedRoute>} />

          <Route path="/manager" element={<RoleBasedRoute requiredRole="MANAGER"><ErrorBoundary><ManagerDashboard /></ErrorBoundary></RoleBasedRoute>} />
          <Route path="/manager/classes" element={<RoleBasedRoute requiredRole="MANAGER"><ErrorBoundary><ManagerClasses /></ErrorBoundary></RoleBasedRoute>} />
          <Route path="/manager/classes/:id" element={<RoleBasedRoute requiredRole="MANAGER"><ErrorBoundary><ManagerClassDetail /></ErrorBoundary></RoleBasedRoute>} />
          <Route path="/manager/operations" element={<RoleBasedRoute requiredRole="MANAGER"><ErrorBoundary><ManagerOperations /></ErrorBoundary></RoleBasedRoute>} />
          <Route path="/manager/reports" element={<RoleBasedRoute requiredRole="MANAGER"><ErrorBoundary><ManagerReports /></ErrorBoundary></RoleBasedRoute>} />

          <Route path="/teacher/manage" element={<RoleBasedRoute requiredRole="TEACHER"><TeacherManage /></RoleBasedRoute>} />
          {/* Teacher routes - removed old pages, use LMS instead */}
          <Route path="/teacher/tests" element={<Navigate to="/lms/teacher/tests" replace />} />
          <Route path="/teacher/tests/new" element={<RoleBasedRoute requiredRole="TEACHER"><TestBuilder /></RoleBasedRoute>} />
          <Route path="/teacher/tests/:id/edit" element={<RoleBasedRoute requiredRole="TEACHER"><TestBuilder /></RoleBasedRoute>} />

          <Route path="/lms/teacher" element={<RoleBasedRoute requiredRole="TEACHER"><LmsTeacherDashboard /></RoleBasedRoute>} />
          <Route path="/lms/teacher/classes" element={<RoleBasedRoute requiredRole="TEACHER"><LmsTeacherClasses /></RoleBasedRoute>} />
          <Route path="/lms/teacher/classes/:id" element={<RoleBasedRoute requiredRole="TEACHER"><LmsTeacherClassDetail /></RoleBasedRoute>} />
          <Route path="/lms/teacher/tests" element={<RoleBasedRoute requiredRole="TEACHER"><LmsTeacherTests /></RoleBasedRoute>} />
          <Route path="/lms/teacher/assignments" element={<RoleBasedRoute requiredRole="TEACHER"><LmsTeacherAssignments /></RoleBasedRoute>} />
          <Route path="/lms/teacher/assignments/:id" element={<RoleBasedRoute requiredRole="TEACHER"><LmsAssignmentDetail /></RoleBasedRoute>} />
          <Route path="/lms/teacher/submissions" element={<RoleBasedRoute requiredRole="TEACHER"><LmsTeacherSubmissions /></RoleBasedRoute>} />
          <Route path="/lms/submission/:type/:id" element={<RoleBasedRoute requiredRole="TEACHER"><LmsSubmissionDetail /></RoleBasedRoute>} />
          <Route path="/lms/grade/:type/:id" element={<RoleBasedRoute requiredRole="TEACHER"><LmsGradeSubmission /></RoleBasedRoute>} />
          <Route path="/lms/teacher/analytics" element={<RoleBasedRoute requiredRole="TEACHER"><LmsTeacherAnalytics /></RoleBasedRoute>} />
          <Route path="/lms/teacher/settings" element={<RoleBasedRoute requiredRole="TEACHER"><LmsTeacherSettings /></RoleBasedRoute>} />

          {/* Teacher assignment templates */}
          <Route path="/teacher/assignments/templates" element={<RoleBasedRoute requiredRole="TEACHER"><AssignmentTemplates /></RoleBasedRoute>} />
          <Route path="/teacher/assignments/create" element={<RoleBasedRoute requiredRole="TEACHER"><CreateAssignment /></RoleBasedRoute>} />

          {/* Student assignment routes */}
          <Route path="/student/lms" element={<RoleBasedRoute requiredRole="STUDENT"><StudentLms /></RoleBasedRoute>} />
          <Route path="/student/assignments/:id" element={<RoleBasedRoute requiredRole="STUDENT"><AssignmentDetail /></RoleBasedRoute>} />
          <Route path="/student/assignments/:id/submit" element={<RoleBasedRoute requiredRole="STUDENT"><SubmitAssignment /></RoleBasedRoute>} />
          <Route path="/student/assignments/:id/result" element={<RoleBasedRoute requiredRole="STUDENT"><AssignmentResult /></RoleBasedRoute>} />

          {/* Grading routes */}
          <Route path="/teacher/grade/writing/:id" element={<RoleBasedRoute requiredRole="TEACHER"><GradeWriting /></RoleBasedRoute>} />
          <Route path="/teacher/grade/speaking/:id" element={<RoleBasedRoute requiredRole="TEACHER"><GradeSpeaking /></RoleBasedRoute>} />
          <Route path="/teacher/grade/assignment/:submissionId" element={<RoleBasedRoute requiredRole="TEACHER"><GradeAssignment /></RoleBasedRoute>} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App

const appLoadingStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
};

const appLoadingCardStyle = {
  minWidth: 240,
  padding: '24px 28px',
  borderRadius: 20,
  background: '#fff',
  border: '1px solid #e2e8f0',
  boxShadow: '0 20px 60px rgba(15, 23, 42, 0.12)',
  textAlign: 'center',
};

const appLoadingSpinnerStyle = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: '3px solid #dbeafe',
  borderTopColor: '#2563eb',
  margin: '0 auto',
  animation: 'spin 0.9s linear infinite',
};
