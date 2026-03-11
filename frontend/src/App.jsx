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
import DashboardHistory from './pages/DashboardHistory'
import DashboardProfile from './pages/DashboardProfile'
import DashboardSettings from './pages/DashboardSettings'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/exam-library" element={<ExamLibrary />} />
        <Route path="/test/reading" element={<IeltsReadingTest />} />
        <Route path="/test/reading/:id" element={<IeltsReadingTest />} />
        <Route path="/test/listening" element={<IeltsListeningTest />} />
        <Route path="/test/listening/:id" element={<IeltsListeningTest />} />
        <Route path="/test/writing" element={<IeltsWritingTest />} />
        <Route path="/test/writing/:id" element={<IeltsWritingTest />} />
        <Route path="/test/speaking" element={<IeltsSpeakingTest />} />
        <Route path="/test/speaking/:id" element={<IeltsSpeakingTest />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/my-dashboard" element={<MyDashboard />} />
        <Route path="/my-dashboard/history" element={<DashboardHistory />} />
        <Route path="/profile" element={<DashboardProfile />} />
        <Route path="/my-dashboard/settings" element={<DashboardSettings />} />
        <Route path="/teacher/tests" element={<TeacherTests />} />
        <Route path="/teacher/tests/new" element={<TestBuilder />} />
        <Route path="/teacher/tests/:id/edit" element={<TestBuilder />} />
      </Routes>
    </Router>
  )
}

export default App
