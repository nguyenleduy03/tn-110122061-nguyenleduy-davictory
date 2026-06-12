import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/writing" element={<Writing />} />
            <Route path="/speaking" element={<Speaking />} />
            <Route path="/grammar" element={<GrammarChecker />} />
            <Route path="/tests" element={<TestLibrary />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/console" element={<Console />} />
            <Route path="/evaluation" element={<Evaluation />} />
            <Route path="/samples" element={<Samples />} />
          </Routes>
        </main>
      </div>
    </HeaderProvider>
  );
}
