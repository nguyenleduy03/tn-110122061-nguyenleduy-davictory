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
import TeacherWritingSubmissions from './pages/TeacherWritingSubmissions'
import TeacherWritingDetail from './pages/TeacherWritingDetail'
import TeacherAssignments from './pages/TeacherAssignments'
import LmsTeacherDashboard from './pages/lms/LmsTeacherDashboard'
import LmsTeacherClasses from './pages/lms/LmsTeacherClasses'
import LmsTeacherTests from './pages/lms/LmsTeacherTests'
import LmsTeacherAssignments from './pages/lms/LmsTeacherAssignments'
import LmsTeacherSubmissions from './pages/lms/LmsTeacherSubmissions'
import LmsTeacherAnalytics from './pages/lms/LmsTeacherAnalytics'
import LmsTeacherSettings from './pages/lms/LmsTeacherSettings'
import MyDashboard from './pages/MyDashboard'
import TestComplete from './pages/TestComplete'
import DashboardHistory from './pages/DashboardHistory'
import DashboardProfile from './pages/DashboardProfile'
import DashboardSettings from './pages/DashboardSettings'
import ApiDebugPage from './pages/ApiDebugPage'
import ProtectedRoute from './components/common/ProtectedRoute'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
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
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/teacher-class" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
        <Route path="/teacher/manage" element={<ProtectedRoute><TeacherManage /></ProtectedRoute>} />
        <Route path="/teacher/writing" element={<ProtectedRoute><TeacherWritingSubmissions /></ProtectedRoute>} />
        <Route path="/teacher/writing/:id" element={<ProtectedRoute><TeacherWritingDetail /></ProtectedRoute>} />
        <Route path="/teacher/assignments" element={<ProtectedRoute><TeacherAssignments /></ProtectedRoute>} />
        <Route path="/teacher/tests" element={<Navigate to="/lms/teacher/tests" replace />} />
        <Route path="/teacher/tests/new" element={<ProtectedRoute><TestBuilder /></ProtectedRoute>} />
        <Route path="/teacher/tests/:id/edit" element={<ProtectedRoute><TestBuilder /></ProtectedRoute>} />

        <Route path="/lms/teacher" element={<ProtectedRoute><LmsTeacherDashboard /></ProtectedRoute>} />
        <Route path="/lms/teacher/classes" element={<ProtectedRoute><LmsTeacherClasses /></ProtectedRoute>} />
        <Route path="/lms/teacher/tests" element={<ProtectedRoute><LmsTeacherTests /></ProtectedRoute>} />
        <Route path="/lms/teacher/assignments" element={<ProtectedRoute><LmsTeacherAssignments /></ProtectedRoute>} />
        <Route path="/lms/teacher/submissions" element={<ProtectedRoute><LmsTeacherSubmissions /></ProtectedRoute>} />
        <Route path="/lms/teacher/analytics" element={<ProtectedRoute><LmsTeacherAnalytics /></ProtectedRoute>} />
        <Route path="/lms/teacher/settings" element={<ProtectedRoute><LmsTeacherSettings /></ProtectedRoute>} />
      </Routes>
    </Router>
  )
}

export default App
