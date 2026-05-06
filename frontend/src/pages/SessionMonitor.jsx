import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Clock, UserCheck, StopCircle, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function SessionMonitor() {
  const { id } = useParams();
  const [isActive, setIsActive] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60 * 5);
  const [qrToken, setQrToken] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [scannedStudents, setScannedStudents] = useState([]);

  useEffect(() => {
    const courseCode = id.split('-')[0] === 'course' ? 'CN' : id;
    fetch('/api/sessions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseCode, class_number: 1, duration_minutes: 5 })
    })
    .then(res => res.json())
    .then(data => {
      setQrToken(data.qr_token);
      setSessionId(data.session_id);
      setLoading(false);
    })
    .catch(err => {
      console.error("Failed to generate session", err);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!sessionId || !isActive) return;
    const interval = setInterval(() => {
      fetch(`/api/sessions/${sessionId}/scans`)
        .then(res => res.json())
        .then(data => setScannedStudents(data))
        .catch(err => console.error("Poll error", err));
    }, 2000);
    return () => clearInterval(interval);
  }, [sessionId, isActive]);

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleEndSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, sessionId]);

  const handleEndSession = () => {
    setIsActive(false);
    if (sessionId) {
      fetch(`/api/sessions/${sessionId}/close`, { method: 'POST' }).catch(err => console.error("Close error", err));
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <button onClick={() => window.history.back()} className="flex items-center gap-2 text-neutral-500 hover:text-[#1a1a1a] transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Management</span>
          </button>
          <div className="accent-pill mb-4">
            <ShieldCheck className="w-4 h-4" />
            <span>Active Session Monitor</span>
          </div>
          <h2 className="text-5xl font-bold serif-font tracking-tight">Session: {id}</h2>
        </div>
        
        {isActive ? (
          <div className="bg-[#1a1a1a] text-white px-8 py-4 rounded-3xl flex items-center gap-4 shadow-xl">
            <Clock className="w-6 h-6 text-[#c5f82a] animate-pulse" />
            <span className="text-3xl font-bold serif-font">{formatTime(timeLeft)}</span>
          </div>
        ) : (
          <div className="bg-[#f9f9f5] border border-[#e5e5e0] px-8 py-4 rounded-3xl text-neutral-400 font-bold serif-font text-2xl">
            Session Terminalized
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <div className="glass-card p-12 flex flex-col items-center justify-center relative bg-white min-h-[450px]">
            {isActive ? (
              loading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-[#1a1a1a] animate-spin" />
                  <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Generating Secure QR</p>
                </div>
              ) : (
                <div className="space-y-10 flex flex-col items-center">
                  <div className="bg-white p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-[#f0f0eb]">
                    <QRCodeSVG value={qrToken} size={280} level="H" />
                  </div>
                  <p className="text-center text-neutral-500 text-sm max-w-xs leading-relaxed italic">
                    "Signed via HS256. Students must complete identity verification before scanning."
                  </p>
                  <button onClick={handleEndSession} className="btn-secondary text-rose-600 border-rose-100 hover:bg-rose-50 px-8">
                    <StopCircle className="w-5 h-5" />
                    <span>End Session Now</span>
                  </button>
                </div>
              )
            ) : (
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-neutral-50 rounded-full flex items-center justify-center mx-auto"><StopCircle className="w-12 h-12 text-neutral-300" /></div>
                <h3 className="text-3xl font-bold serif-font text-neutral-400">Access Restricted</h3>
                <p className="text-neutral-500 max-w-xs">This session is no longer accepting student signatures.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="glass-card flex flex-col h-full overflow-hidden min-h-[450px]">
            <div className="p-8 border-b border-[#f0f0eb] flex justify-between items-end bg-white">
              <div>
                <h3 className="text-3xl font-bold serif-font mb-2">Live Registry</h3>
                <p className="text-sm text-neutral-500 uppercase tracking-widest font-bold text-[10px]">Real-time synchronization active</p>
              </div>
              <div className="text-right">
                <span className="text-5xl font-bold serif-font">{scannedStudents.length}</span>
                <span className="text-xl text-neutral-400 font-bold serif-font ml-2">/ 60</span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mt-1">Confirmed Presence</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-4 max-h-[500px]">
              {scannedStudents.length === 0 && !loading && isActive && (
                <div className="flex flex-col items-center justify-center h-full text-neutral-400 italic">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 opacity-20" />
                  <p>Awaiting first student verification...</p>
                </div>
              )}
              
              {scannedStudents.map((s, i) => (
                <div key={i} className="flex justify-between items-center p-6 bg-white border border-[#f0f0eb] rounded-2xl animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white border border-[#e5e5e0] rounded-full flex items-center justify-center font-bold text-xs">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold serif-font text-lg">{s.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{s.roll}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="accent-pill !bg-emerald-50 text-emerald-700 !px-3 !py-1 text-[10px]">
                      <UserCheck className="w-3 h-3" />
                      <span>Verified</span>
                    </div>
                    <p className="text-[10px] font-bold text-neutral-400 mt-2">{s.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
