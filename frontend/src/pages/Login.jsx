import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Camera, CheckCircle2, User, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import logo from '../assets/logo_refined.png';

export default function Login({ setUser }) {
  const [step, setStep] = useState('roleSelection');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [branch, setBranch] = useState('');
  const videoRef = useRef(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [faceImage, setFaceImage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => stopCamera();
  }, [step, isCameraOpen]);

  const startCamera = async () => {
    setErrorMsg('');
    try {
      let stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsCameraOpen(true);
    } catch (err) {
      setErrorMsg('Camera access failed. Please ensure permissions are granted.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const captureFace = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      setFaceImage(canvas.toDataURL('image/jpeg', 0.8));
      stopCamera();
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const endpoint = step === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const payload = { email, password, role, name };
      if (role === 'student') {
        payload.roll_number = rollNumber;
        payload.branch = branch;
        payload.face_image_b64 = faceImage;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Authentication failed');

      setUser({ role: data.role || role, email: data.email || email, user_id: data.user_id });
      navigate(`/${data.role || role}`);
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'roleSelection') {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center pt-20 px-6">
        <div className="mb-12">
          <div className="w-28 h-28 rounded-full bg-white border border-[#e5e5e0] flex items-center justify-center shadow-md overflow-hidden">
            <img src={logo} alt="AttendX" className="w-16 h-16 object-contain" />
          </div>
        </div>
        
        <div className="max-w-3xl w-full text-center mb-16">
          <div className="accent-pill mb-6 mx-auto">
            <ShieldCheck className="w-4 h-4" />
            <span>Identity Secured Attendance</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            We help students and faculty work together.
          </h1>
          <p className="text-xl text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            The next generation of attendance tracking, handling verification, 
            compliance, and reporting with AI-driven precision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl">
          <button 
            onClick={() => { setRole('student'); setStep('login'); }}
            className="btn-primary group"
          >
            <span>Student Login</span>
            <LogIn className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <button 
            onClick={() => { setRole('faculty'); setStep('login'); }}
            className="btn-secondary group"
          >
            <span>Faculty Login</span>
            <LogIn className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        <footer className="mt-auto py-12 text-neutral-400 text-sm">
          &copy; 2026 AttendX Platform. All rights reserved.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-20 px-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <button 
          onClick={() => setStep('roleSelection')}
          className="flex items-center gap-2 text-neutral-500 hover:text-[#1a1a1a] transition-colors mb-12 ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Selection</span>
        </button>

        <div className="glass-card bg-white p-10 shadow-xl border border-[#e5e5e0] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-10 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-white border border-[#e5e5e0] flex items-center justify-center shadow-sm overflow-hidden mb-8">
              <img src={logo} alt="AttendX" className="w-12 h-12 object-contain" />
            </div>
            <h2 className="text-4xl font-bold mb-2 serif-font tracking-tight">
              {step === 'signup' ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-neutral-500 text-sm">
              Sign in as <span className="text-[#1a1a1a] font-bold uppercase tracking-widest">{role}</span> to access your dashboard
            </p>
          </div>

          {errorMsg && (
            <div className="bg-rose-50/50 border border-rose-100 text-rose-600 p-4 rounded-xl text-sm mb-8 animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-6">
            {step === 'signup' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-2 uppercase tracking-wider text-[10px]">Full Name</label>
                  <input type="text" required className="input-field" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
                </div>
                {role === 'student' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-500 mb-2 uppercase tracking-wider text-[10px]">Roll Number</label>
                      <input type="text" required className="input-field" placeholder="23CS101" value={rollNumber} onChange={e => setRollNumber(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-500 mb-2 uppercase tracking-wider text-[10px]">Branch</label>
                      <input type="text" required className="input-field" placeholder="CSE" value={branch} onChange={e => setBranch(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-2 uppercase tracking-wider text-[10px]">Institutional Email</label>
              <input type="email" required className="input-field" placeholder="name@kitsw.ac.in" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-2 uppercase tracking-wider text-[10px]">Password</label>
              <input type="password" required className="input-field" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            {step === 'signup' && role === 'student' && (
              <div className="p-1.5 bg-[#f9f9f5] rounded-2xl border border-[#e5e5e0]">
                {faceImage ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden group">
                    <img src={faceImage} alt="Identity" className="w-full h-full object-cover grayscale-[0.5]" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => setFaceImage(null)} className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold shadow-xl">Retake Photo</button>
                    </div>
                    <div className="absolute bottom-4 left-4 bg-[#c5f82a] text-black px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Identity Captured
                    </div>
                  </div>
                ) : isCameraOpen ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                    <button type="button" onClick={captureFace} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-2 rounded-full text-xs font-bold shadow-2xl hover:scale-105 transition-transform">Capture Identity</button>
                  </div>
                ) : (
                  <button type="button" onClick={startCamera} className="w-full aspect-video border-2 border-dashed border-[#e5e5e0] rounded-xl flex flex-col items-center justify-center gap-3 text-neutral-400 hover:text-[#1a1a1a] hover:border-[#1a1a1a] transition-all bg-white">
                    <Camera className="w-8 h-8 opacity-40" />
                    <span className="text-xs font-bold uppercase tracking-widest">Verify Identity via FaceGate</span>
                  </button>
                )}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary mt-4">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (step === 'signup' ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-10 text-center border-t border-[#f0f0eb] pt-8">
            <p className="text-sm text-neutral-500">
              {step === 'signup' ? "Already have an account?" : "Don't have an account?"}{' '}
              <button 
                onClick={() => setStep(step === 'signup' ? 'login' : 'signup')}
                className="text-[#1a1a1a] font-bold hover:underline"
              >
                {step === 'signup' ? 'Sign in instead' : 'Join AttendX today'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

