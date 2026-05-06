import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, QrCode, ClipboardList, ShieldCheck, ChevronRight } from 'lucide-react';

export default function FacultyDashboard({ userEmail }) {
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/faculty/me?email=${encodeURIComponent(userEmail)}`)
      .then(res => res.json())
      .then(data => {
        setFaculty(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load faculty data", err);
        setLoading(false);
      });
  }, [userEmail]);

  if (loading) return <div className="text-center py-20 text-neutral-400">Loading faculty records...</div>;
  if (!faculty || faculty.detail) return <div className="text-center py-20 text-rose-400">Error: Could not retrieve faculty profile.</div>;

  const courses = (faculty.courses_stats || []).map((c) => ({
    id: c.code,
    code: c.code,
    name: c.code === 'OS' ? 'Operating Systems' : c.code === 'CN' ? 'Computer Networks' : 'Java Programming',
    section: 'A',
    enrolled: c.enrolled,
    totalSessions: c.totalSessions,
    avgAttendance: c.avgAttendance
  }));

  return (
    <div className="space-y-12 pb-20">
      {/* Header Profile Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 py-8">
        <div className="flex items-center gap-8">
          <div className="w-24 h-24 rounded-[2rem] bg-white border border-[#e5e5e0] flex items-center justify-center text-4xl font-bold serif-font shadow-sm overflow-hidden">
             {faculty['Name'] ? faculty['Name'].charAt(0) : 'F'}
          </div>
          <div>
            <div className="accent-pill mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Administrative Portal</span>
            </div>
            <h2 className="text-5xl font-bold serif-font tracking-tight mb-2">Welcome, {faculty['Name']}</h2>
            <p className="text-neutral-500 font-medium text-lg">Senior Faculty • <span className="text-[#1a1a1a]">Department of CSE</span></p>
          </div>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="bg-white px-8 py-5 rounded-3xl border border-[#e5e5e0] flex-1 md:flex-none text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400 mb-2 mono-font">Active Modules</p>
            <p className="font-bold text-xl mono-font">{courses.length}</p>
          </div>
          <div className="bg-white px-8 py-5 rounded-3xl border border-[#e5e5e0] flex-1 md:flex-none text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400 mb-2 mono-font">Enrolled Students</p>
            <p className="font-bold text-xl mono-font">125</p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-end mb-10">
          <div>
            <h3 className="text-4xl font-bold serif-font mb-2">Course Management</h3>
            <p className="text-neutral-500">Monitor engagement and initiate verification sessions.</p>
          </div>
          <div className="hidden md:block accent-pill"><ClipboardList className="w-4 h-4" /><span>Academic Session 2026</span></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {courses.map(course => (
            <div key={course.id} className="glass-card p-10 flex flex-col justify-between group hover:shadow-xl hover:-translate-y-1 transition-all">
              <div>
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h4 className="text-3xl font-bold serif-font mb-2 group-hover:text-[#1a1a1a] transition-colors">{course.name}</h4>
                    <p className="text-neutral-500 font-bold uppercase tracking-widest text-[10px]">{course.code} — Section {course.section}</p>
                  </div>
                  <div className="bg-[#f9f9f5] border border-[#e5e5e0] px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    {course.enrolled} Enrolled
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-10">
                  <div className="bg-white border border-[#f0f0eb] p-6 rounded-3xl text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-2 mono-font">Total Sessions</p>
                    <p className="font-bold text-2xl mono-font">{course.totalSessions}</p>
                  </div>
                  <div className="bg-white border border-[#f0f0eb] p-6 rounded-3xl text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-2 mono-font">Avg Participation</p>
                    <p className={`font-bold text-2xl mono-font ${course.avgAttendance < 75 ? 'text-rose-500' : 'text-emerald-600'}`}>
                      {course.avgAttendance}%
                    </p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => navigate(`/faculty/session/${course.id}`)}
                className="btn-primary group shadow-none hover:shadow-xl"
              >
                <QrCode className="w-4 h-4" />
                <span>Initiate Secure Session</span>
                <ChevronRight className="w-4 h-4 ml-auto opacity-40 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
