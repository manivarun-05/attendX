import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, BookOpen, AlertCircle, CheckCircle, UserCheck, RefreshCcw, X, ShieldCheck } from 'lucide-react';

export default function StudentDashboard({ userEmail }) {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [regStatus, setRegStatus] = useState('idle');
  const [regError, setRegError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const fetchStudentData = () => {
    setLoading(true);
    fetch(`/api/student/me?email=${encodeURIComponent(userEmail)}`)
      .then(res => res.json())
      .then(data => {
        setStudent(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load student data", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStudentData();
    return () => stopCamera();
  }, [userEmail]);

  const startCamera = async () => {
    try {
      setRegStatus('camera_active');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setRegStatus('error');
      setRegError('Could not access camera.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const captureAndRegister = async () => {
    if (!videoRef.current) return;
    setRegStatus('saving');
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const res = await fetch('/api/register_face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, face_image_b64: dataUrl })
      });
      if (!res.ok) throw new Error('Registration failed');
      setRegStatus('success');
      stopCamera();
      fetchStudentData();
      setTimeout(() => setShowRegister(false), 2000);
    } catch (err) {
      setRegStatus('error');
      setRegError(err.message);
    }
  };

  if (loading) return <div className="text-center py-20 text-neutral-400">Loading student data...</div>;
  if (!student || student.detail) return <div className="text-center py-20 text-rose-400">Failed to load student data.</div>;

  const parseAtt = (attStr) => {
    if (!attStr) return { attended: 0, total: 0, percentage: 0 };
    const match = attStr.match(/(\d+)\/(\d+)\s*\((\d+)%\)/);
    return match ? { attended: parseInt(match[1]), total: parseInt(match[2]), percentage: parseInt(match[3]) } : { attended: 0, total: 0, percentage: 0 };
  };

  const osAtt = parseAtt(student['OS Attendance (2 Months)']);
  const cnAtt = parseAtt(student['CN Attendance (2 Months)']);
  const javaAtt = parseAtt(student['JAVA Attendance (2 Months)']);

  const overallAttended = osAtt.attended + cnAtt.attended + javaAtt.attended;
  const overallTotal = osAtt.total + cnAtt.total + javaAtt.total;
  const overallPercentage = overallTotal > 0 ? Math.round((overallAttended / overallTotal) * 100) : 0;

  const courses = [
    { code: 'OS', name: 'Operating Systems', ...osAtt, flag: osAtt.percentage < 75 },
    { code: 'CN', name: 'Computer Networks', ...cnAtt, flag: cnAtt.percentage < 75 },
    { code: 'JAVA', name: 'Java Programming', ...javaAtt, flag: javaAtt.percentage < 75 },
  ];

  return (
    <div className="space-y-12 pb-20">
      {/* Registration Modal */}
      {showRegister && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1a1a1a]/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#e5e5e0]">
            <div className="p-8 border-b border-[#f0f0eb] flex justify-between items-center">
              <h3 className="text-2xl font-bold serif-font">Face Registration</h3>
              <button onClick={() => { stopCamera(); setShowRegister(false); }} className="p-2 hover:bg-[#f9f9f5] rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-10 space-y-8 flex flex-col items-center">
              {regStatus === 'idle' && (
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 bg-[#c5f82a] rounded-full flex items-center justify-center mx-auto shadow-sm"><UserCheck className="w-10 h-10 text-black" /></div>
                  <p className="text-neutral-500 text-lg leading-relaxed">Position your face in the center of the frame in a well-lit area.</p>
                  <button onClick={startCamera} className="btn-primary">Start Registration</button>
                </div>
              )}
              {regStatus === 'camera_active' && (
                <div className="w-full space-y-6">
                  <div className="aspect-square bg-black rounded-[2rem] overflow-hidden relative shadow-inner">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                    <div className="absolute inset-0 border-[40px] border-[#1a1a1a]/60 pointer-events-none rounded-full scale-[1.3]"></div>
                  </div>
                  <button onClick={captureAndRegister} className="btn-primary">Secure My Identity</button>
                </div>
              )}
              {regStatus === 'saving' && <div className="text-center py-10"><RefreshCcw className="w-12 h-12 text-[#1a1a1a] animate-spin mx-auto mb-4" /><p className="text-lg font-bold serif-font">Syncing Identity...</p></div>}
              {regStatus === 'success' && <div className="text-center py-10 space-y-4"><div className="w-20 h-20 bg-[#c5f82a] rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-10 h-10 text-black" /></div><p className="text-3xl font-bold serif-font text-emerald-600">Verified</p><p className="text-neutral-500">Your face is now linked to your account.</p></div>}
              {regStatus === 'error' && <div className="text-center py-10 space-y-6 w-full"><div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto"><AlertCircle className="w-10 h-10 text-rose-500" /></div><p className="text-2xl font-bold serif-font text-rose-600">Error</p><p className="text-neutral-500">{regError}</p><button onClick={() => setRegStatus('idle')} className="btn-secondary">Try Again</button></div>}
            </div>
          </div>
        </div>
      )}

      {/* Header Profile Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-12 py-8">
        <div className="flex items-center gap-5 md:gap-8">
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-[2rem] md:rounded-[2.5rem] bg-white border border-[#e5e5e0] flex items-center justify-center text-3xl md:text-5xl font-bold shadow-md overflow-hidden flex-shrink-0">
             {student['Name'] ? student['Name'].charAt(0) : 'S'}
          </div>
          <div>
            <div className="accent-pill mb-2 md:mb-3">
              <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>Student Profile</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-2">{student['Name']}</h2>
            <p className="text-neutral-500 font-medium text-base md:text-xl flex flex-wrap gap-2 items-center">
              <span className="mono-font text-neutral-400">{student['Roll Number']}</span>
              <span className="text-[#1a1a1a] mono-font text-[10px] uppercase tracking-widest bg-neutral-200/50 px-2 md:px-3 py-1 rounded-md">Section {student['Section']}</span>
            </p>
          </div>
        </div>
        
        <div className="flex gap-6 w-full md:w-auto">
          <div className="bg-white px-12 py-8 rounded-[2rem] border border-[#e5e5e0] flex-1 md:flex-none text-center shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-3 mono-font">Branch</p>
            <p className="font-bold text-3xl mono-font">{student['Branch']}</p>
          </div>
          <div className="bg-white px-12 py-8 rounded-[2rem] border border-[#e5e5e0] flex-1 md:flex-none text-center shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-3 mono-font">Semester</p>
            <p className="font-bold text-3xl mono-font">{student['Semester']}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Attendance Card */}
        <div className="lg:col-span-8 glass-card p-12 relative overflow-hidden flex flex-col justify-between min-h-[350px]">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-10">Attendance Performance</h3>
            <div className="flex items-baseline gap-6 mb-2">
              <span className={`text-7xl font-bold serif-font leading-none tracking-tighter ${overallPercentage < 75 ? 'text-rose-600' : 'text-[#1a1a1a]'}`}>
                {overallPercentage}%
              </span>
              <div className="bg-[#c5f82a] px-5 py-1.5 rounded-full text-xs font-bold shadow-sm">LIVE SYNC</div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-end gap-10">
            <div className="w-full md:max-w-md">
              <p className="text-neutral-500 mb-6 font-medium italic text-lg">"Academic success is built on consistent participation."</p>
              <div className="w-full bg-[#f0f0eb] rounded-full h-2.5 overflow-hidden shadow-inner">
                <div className={`h-full transition-all duration-1000 ${overallPercentage < 75 ? 'bg-rose-500' : 'bg-[#1a1a1a]'}`} style={{ width: `${overallPercentage}%` }}></div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-2">Registry Status</p>
              <p className={`text-2xl font-bold serif-font ${overallPercentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {overallPercentage >= 75 ? 'Classroom Compliant' : 'Below Threshold'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-8 flex flex-col justify-between h-[167px] group cursor-pointer hover:border-[#1a1a1a] transition-all" onClick={() => navigate('/student/scan')}>
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-[#1a1a1a] rounded-2xl flex items-center justify-center text-white"><Camera className="w-6 h-6" /></div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Quick Action</div>
            </div>
            <div>
              <h3 className="text-2xl font-bold serif-font">Mark Attendance</h3>
              <p className="text-sm text-neutral-500">Scan QR via FaceGate verification</p>
            </div>
          </div>

          <div className="glass-card p-8 flex flex-col justify-between h-[167px] group cursor-pointer hover:border-[#1a1a1a] transition-all" onClick={() => { setRegStatus('idle'); setShowRegister(true); }}>
            <div className="flex justify-between items-start">
              <div className={`w-12 h-12 ${student.face_registered ? 'bg-[#c5f82a]' : 'bg-neutral-100'} rounded-2xl flex items-center justify-center text-black`}>
                {student.face_registered ? <RefreshCcw className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Security</div>
            </div>
            <div>
              <h3 className="text-2xl font-bold serif-font">{student.face_registered ? 'Update Biometrics' : 'Enroll Face'}</h3>
              <p className="text-sm text-neutral-500">{student.face_registered ? 'Identity verified & secure' : 'Identity setup required'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Course Breakdown */}
      <div className="pt-12 border-t border-[#e5e5e0]">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h3 className="text-4xl font-bold serif-font mb-2">Academic Modules</h3>
            <p className="text-neutral-500 text-sm italic">"Real-time participation tracking per course."</p>
          </div>
          <div className="hidden md:block accent-pill"><BookOpen className="w-4 h-4" /><span>Semester 2.0</span></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course, idx) => (
            <div key={idx} className="glass-card p-10 hover:shadow-xl hover:-translate-y-1 transition-all group">
              <div className="flex justify-between items-start mb-8">
                <div className="w-12 h-12 bg-[#f9f9f5] border border-[#e5e5e0] rounded-2xl flex items-center justify-center group-hover:bg-[#c5f82a] group-hover:border-[#c5f82a] transition-colors shadow-sm">
                  <span className="text-sm font-bold mono-font">{course.code}</span>
                </div>
                <span className={`text-3xl font-bold ${course.flag ? 'text-rose-500' : 'text-[#1a1a1a]'} mono-font`}>{course.percentage}%</span>
              </div>
              <h4 className="text-xl font-bold mb-1 tracking-tight">{course.name}</h4>
              <p className="text-[10px] text-neutral-400 mb-8 uppercase tracking-[0.2em] font-bold mono-font">Module Registry</p>
              
              <div className="space-y-4 pt-6 border-t border-[#f0f0eb]">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400 font-medium italic">Presence</span>
                  <span className="font-bold mono-font">{course.attended} / {course.total}</span>
                </div>
                <div className="w-full bg-[#f9f9f5] rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full ${course.flag ? 'bg-rose-500' : 'bg-[#1a1a1a]'}`} style={{ width: `${course.percentage}%` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
