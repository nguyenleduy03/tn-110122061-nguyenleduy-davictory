import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Writing from './pages/Writing';
import Speaking from './pages/Speaking';
import Admin from './pages/Admin';
import Console from './pages/Console';
import Evaluation from './pages/Evaluation';

export default function App() {
  return (
    <>
      <Sidebar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/writing" element={<Writing />} />
        <Route path="/speaking" element={<Speaking />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/console" element={<Console />} />
        <Route path="/evaluation" element={<Evaluation />} />
      </Routes>
    </>
  );
}
