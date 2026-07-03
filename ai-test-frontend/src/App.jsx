import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import { HeaderProvider } from './context/HeaderContext';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Writing from './pages/Writing';
import Speaking from './pages/Speaking';
import GrammarChecker from './pages/GrammarChecker';
import TestLibrary from './pages/TestLibrary';
import Pricing from './pages/Pricing';
import Admin from './pages/Admin';
import Console from './pages/Console';
import Evaluation from './pages/Evaluation';
import Samples from './pages/Samples';
export default function App() {
  return (
    <HeaderProvider>
      <Sidebar />
      <div className="main-wrapper">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pricing" element={<Pricing />} />

            <Route path="/grammar" element={<ProtectedRoute><GrammarChecker /></ProtectedRoute>} />
            <Route path="/tests" element={<ProtectedRoute><TestLibrary /></ProtectedRoute>} />

            <Route path="/writing" element={<ProtectedRoute><Writing /></ProtectedRoute>} />
            <Route path="/speaking" element={<ProtectedRoute><Speaking /></ProtectedRoute>} />
            <Route path="/samples" element={<RoleBasedRoute requiredRole="TEACHER"><Samples /></RoleBasedRoute>} />

            <Route path="/dashboard" element={<RoleBasedRoute requiredRole="MANAGER"><Dashboard /></RoleBasedRoute>} />
            <Route path="/evaluation" element={<RoleBasedRoute requiredRole="MANAGER"><Evaluation /></RoleBasedRoute>} />
            <Route path="/console" element={<RoleBasedRoute requiredRole="MANAGER"><Console /></RoleBasedRoute>} />

            <Route path="/admin" element={<RoleBasedRoute requiredRole="ADMIN"><Admin /></RoleBasedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </HeaderProvider>
  );
}
