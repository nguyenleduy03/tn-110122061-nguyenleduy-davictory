import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ExamLibrary from './pages/ExamLibrary'
import IeltsReadingTest from './pages/IeltsReadingTest'
import IeltsListeningTest from './pages/IeltsListeningTest'
import IeltsWritingTest from './pages/IeltsWritingTest'
import IeltsSpeakingTest from './pages/IeltsSpeakingTest'
import Login from './pages/Login'
import Register from './pages/Register'
import TestBuilder from './pages/TestBuilder'
import TeacherManage from './pages/TeacherManage'
import AdminDashboard from './pages/AdminDashboard'
import AdminUsers from './pages/AdminUsers'
import GoogleDriveSettings from './pages/GoogleDriveSettings'
import LmsTeacherDashboard from './pages/lms/LmsTeacherDashboard'
import ClassManagement from './pages/ClassManagement'
import LmsTeacherClasses from './pages/lms/LmsTeacherClasses'
import LmsTeacherTests from './pages/lms/LmsTeacherTests'
import LmsTeacherAssignments from './pages/lms/LmsTeacherAssignments'
import LmsAssignmentDetail from './pages/lms/LmsAssignmentDetail'
import LmsTeacherSubmissions from './pages/lms/LmsTeacherSubmissions'
import LmsSubmissionDetail from './pages/lms/LmsSubmissionDetail'
import LmsGradeSubmission from './pages/lms/LmsGradeSubmission'
import LmsTeacherAnalytics from './pages/lms/LmsTeacherAnalytics'
import LmsTeacherClassDetail from './pages/lms/LmsTeacherClassDetail'
import LmsTeacherSettings from './pages/lms/LmsTeacherSettings'
import ManagerDashboard from './pages/ManagerDashboard'
import ManagerClasses from './pages/ManagerClasses'
import ManagerClassDetail from './pages/ManagerClassDetail'
import ManagerOperations from './pages/ManagerOperations'
import ManagerReports from './pages/ManagerReports'
import MyDashboard from './pages/MyDashboard'
import TestComplete from './pages/TestComplete'
import DashboardHistory from './pages/DashboardHistory'
import DashboardProfile from './pages/DashboardProfile'
import DashboardSettings from './pages/DashboardSettings'
import ApiDebugPage from './pages/ApiDebugPage'
import GradeWriting from './pages/teacher/GradeWriting'
import GradeSpeaking from './pages/teacher/GradeSpeaking'
import AssignmentTemplates from './pages/teacher/AssignmentTemplates'
import CreateAssignment from './pages/teacher/CreateAssignment'
import StudentAssignments from './pages/student/StudentAssignments'
import StudentLms from './pages/student/StudentLms'
import SubmitAssignment from './pages/student/SubmitAssignment'
import AssignmentResult from './pages/student/AssignmentResult'
import ProtectedRoute from './components/common/ProtectedRoute'
import RoleBasedRoute from './components/common/RoleBasedRoute'
import ErrorBoundary from './components/common/ErrorBoundary'
import TestApiPage from './pages/TestApiPage';
import './App.css'

function App() {
  return (
    <Router>
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
        <Route path="/test/complete" element={<ProtectedRoute><TestComplete /></ProtectedRoute>} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/debug" element={<ApiDebugPage />} />
        <Route path="/my-dashboard" element={<ProtectedRoute><MyDashboard /></ProtectedRoute>} />
        <Route path="/my-dashboard/history" element={<ProtectedRoute><DashboardHistory /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><DashboardProfile /></ProtectedRoute>} />
        <Route path="/my-dashboard/settings" element={<ProtectedRoute><DashboardSettings /></ProtectedRoute>} />
        <Route path="/admin" element={<RoleBasedRoute requiredRole="ADMIN"><ErrorBoundary><AdminDashboard /></ErrorBoundary></RoleBasedRoute>} />
        <Route path="/admin/users" element={<RoleBasedRoute requiredRole="ADMIN"><ErrorBoundary><AdminUsers /></ErrorBoundary></RoleBasedRoute>} />
        <Route path="/admin/drive" element={<RoleBasedRoute requiredRole="ADMIN"><ErrorBoundary><GoogleDriveSettings /></ErrorBoundary></RoleBasedRoute>} />
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
        <Route path="/student/assignments" element={<RoleBasedRoute requiredRole="STUDENT"><StudentAssignments /></RoleBasedRoute>} />
        <Route path="/student/assignments/:id" element={<RoleBasedRoute requiredRole="STUDENT"><SubmitAssignment /></RoleBasedRoute>} />
        <Route path="/student/assignments/:id/result" element={<RoleBasedRoute requiredRole="STUDENT"><AssignmentResult /></RoleBasedRoute>} />
        
        {/* Grading routes */}
        <Route path="/teacher/grade/writing/:id" element={<RoleBasedRoute requiredRole="TEACHER"><GradeWriting /></RoleBasedRoute>} />
        <Route path="/teacher/grade/speaking/:id" element={<RoleBasedRoute requiredRole="TEACHER"><GradeSpeaking /></RoleBasedRoute>} />
      </Routes>
    </Router>
  )
}

export default App
