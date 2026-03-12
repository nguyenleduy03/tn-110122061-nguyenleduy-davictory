import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ExamLibrary from './pages/ExamLibrary'
import IeltsReadingTest from './pages/IeltsReadingTest'
import IeltsListeningTest from './pages/IeltsListeningTest'
import IeltsWritingTest from './pages/IeltsWritingTest'
import IeltsSpeakingTest from './pages/IeltsSpeakingTest'
import Login from './pages/Login'
import Register from './pages/Register'
import TestBuilder from './pages/TestBuilder'
import TeacherTests from './pages/TeacherTests'
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
        <Route path="/teacher/tests" element={<ProtectedRoute><TeacherTests /></ProtectedRoute>} />
        <Route path="/teacher/tests/new" element={<ProtectedRoute><TestBuilder /></ProtectedRoute>} />
        <Route path="/teacher/tests/:id/edit" element={<ProtectedRoute><TestBuilder /></ProtectedRoute>} />
      </Routes>
    </Router>
  )
}

export default App
