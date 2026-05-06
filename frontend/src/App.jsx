import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useState } from 'react';
import StudentDashboard from './pages/StudentDashboard';
import FaceScan from './pages/FaceScan';
import FacultyDashboard from './pages/FacultyDashboard';
import SessionMonitor from './pages/SessionMonitor';
import Login from './pages/Login';
import About from './pages/About';
import logo from './assets/logo_refined.png';

function App() {
  const [user, setUser] = useState(null);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a]">
        <header className="bg-white/80 backdrop-blur-md border-b border-[#e5e5e0] py-4 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 md:px-6 flex justify-between items-center">
            <Link to="/" className="flex items-center gap-2 md:gap-3 group">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border border-[#e5e5e0] flex items-center justify-center overflow-hidden shadow-sm group-hover:border-[#1a1a1a] transition-colors">
                <img src={logo} alt="AttendX" className="w-6 h-6 md:w-8 md:h-8 object-contain" />
              </div>
              <span className="text-xl md:text-2xl font-bold tracking-tighter serif-font hidden sm:inline">AttendX</span>
            </Link>
            
            <div className="flex items-center gap-3 md:gap-6">
              <Link to="/about" className="nav-link text-[10px] md:text-xs font-bold uppercase tracking-widest">About</Link>
              
              {user ? (
                <div className="flex items-center gap-3 md:gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hidden lg:inline">{user.email}</span>
                  <button 
                    onClick={() => setUser(null)}
                    className="text-[10px] md:text-xs font-bold uppercase tracking-widest bg-[#1a1a1a] text-white px-4 md:px-5 py-2 md:py-2.5 rounded-full hover:bg-[#2d2d2d] transition-colors whitespace-nowrap"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link 
                  to="/login"
                  className="text-[10px] md:text-xs font-bold uppercase tracking-widest bg-[#1a1a1a] text-white px-4 md:px-5 py-2 md:py-2.5 rounded-full hover:bg-[#2d2d2d] transition-colors whitespace-nowrap"
                >
                  Get Started
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/about" element={<About />} />
            <Route path="/student" element={user?.role === 'student' ? <StudentDashboard userEmail={user.email} /> : <Navigate to="/login" />} />
            <Route path="/student/scan" element={user?.role === 'student' ? <FaceScan userEmail={user.email} /> : <Navigate to="/login" />} />
            <Route path="/faculty" element={user?.role === 'faculty' ? <FacultyDashboard userEmail={user.email} /> : <Navigate to="/login" />} />
            <Route path="/faculty/session/:id" element={user?.role === 'faculty' ? <SessionMonitor /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to={user ? `/${user.role}` : "/login"} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
