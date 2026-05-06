import { useState, useRef, useEffect } from 'react';
import { Camera, ShieldCheck, QrCode, CheckCircle, RefreshCcw, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function FaceScan({ userEmail }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [qrError, setQrError] = useState('');
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let localStream = null;
    async function startCamera() {
      try {
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        localStream = mediaStream;
        streamRef.current = mediaStream;
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        const backCam = videoDevices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
        if (backCam) setSelectedDeviceId(backCam.deviceId);
        else if (videoDevices.length > 0) setSelectedDeviceId(videoDevices[videoDevices.length - 1].deviceId);
      } catch (err) {
        setStatus('error');
        setErrorMsg('Camera access denied or not available.');
      }
    }
    startCamera();
    return () => {
      if (localStream) localStream.getTracks().forEach(track => track.stop());
      if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    };
  }, []);

  const stopFrontCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const captureAndVerify = async () => {
    setStatus('capturing');
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      setStatus('verifying');
      try {
        const res = await fetch('/api/verify/face_precheck', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_id: userEmail, face_image_b64: dataUrl })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Verification failed');
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setErrorMsg(err.message);
      }
    }
  };

  const handleScanQrClick = () => {
    stopFrontCamera(); 
    setTimeout(() => setStatus('scanning_qr'), 1000);
  };

  return (
    <div className="max-w-xl mx-auto space-y-10 pb-20">
      <div className="text-center">
        <button onClick={() => navigate('/student')} className="flex items-center gap-2 text-neutral-500 hover:text-[#1a1a1a] transition-colors mb-8 mx-auto">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Cancel verification</span>
        </button>
        
        <div className="accent-pill mb-4 mx-auto">
          <ShieldCheck className="w-4 h-4" />
          <span>{status === 'scanning_qr' ? 'Step 2: Proximity Check' : 'Step 1: Identity Gate'}</span>
        </div>
        
        <h2 className="text-5xl font-bold serif-font tracking-tight mb-4">
          {status === 'scanning_qr' ? 'Session Signature' : status === 'attendance_marked' ? 'Verified & Present' : 'FaceGate Verification'}
        </h2>
        <p className="text-neutral-500 max-w-sm mx-auto leading-relaxed">
          {status === 'scanning_qr' ? 'Position the session QR code within the frame.' : status === 'attendance_marked' ? 'Your academic record has been updated.' : 'Securely verifying your identity via AI facial matching.'}
        </p>
      </div>

      <div className={`glass-card p-2 rounded-[3rem] relative overflow-hidden bg-white shadow-2xl border border-[#e5e5e0] ${status === 'scanning_qr' || status === 'attendance_marked' ? 'aspect-square' : 'aspect-[3/4]'}`}>
        {(status === 'idle' || status === 'capturing' || status === 'verifying' || status === 'success' || status === 'error') && (
          <div className="w-full h-full relative group">
            {status === 'error' ? (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6"><RefreshCcw className="w-10 h-10 text-rose-500" /></div>
                <p className="text-rose-600 font-bold serif-font text-xl mb-2">Gate Error</p>
                <p className="text-neutral-400 text-sm">{errorMsg}</p>
                <button onClick={() => window.location.reload()} className="mt-8 btn-secondary">Restart Process</button>
              </div>
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover rounded-[2.5rem] grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700 ${status === 'success' ? 'opacity-20' : 'opacity-100'}`} />
            )}

            {status === 'verifying' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10 rounded-[2.5rem]">
                <Loader2 className="w-12 h-12 text-[#1a1a1a] animate-spin mb-6" />
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">Analyzing biometrics</p>
              </div>
            )}

            {status === 'success' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md z-10 rounded-[2.5rem] text-center p-10 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-[#c5f82a] rounded-full flex items-center justify-center mb-8 shadow-xl"><CheckCircle className="w-12 h-12 text-black" /></div>
                <h3 className="text-4xl font-bold serif-font text-[#1a1a1a] mb-3">Identity Locked</h3>
                <p className="text-neutral-500 mb-10 text-lg">Verification complete. Proceed to finalize session signature.</p>
                <button onClick={handleScanQrClick} className="btn-primary w-full shadow-2xl">Finalize via QR Scan</button>
              </div>
            )}

            {(status === 'idle' || status === 'capturing') && (
              <div className="absolute inset-8 border border-white/40 rounded-[4rem] pointer-events-none flex items-center justify-center">
                <div className="w-full h-[1px] bg-white/20 animate-[scan_2s_ease-in-out_infinite]"></div>
              </div>
            )}
          </div>
        )}

        {status === 'scanning_qr' && (
          <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative isolate bg-black shadow-inner">
            <Scanner
              key={`${selectedDeviceId}-${retryCount}`}
              onScan={async (result) => {
                if (result && result.length > 0) {
                  const qrToken = result[0].rawValue;
                  setStatus('verifying');
                  try {
                    const res = await fetch('/api/verify/qr_scan', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ qr_token: qrToken, student_id: userEmail, face_match_score: 0.99 })
                    });
                    if (!res.ok) throw new Error('QR signature mismatch');
                    setStatus('attendance_marked');
                    setTimeout(() => navigate('/student'), 2500);
                  } catch (err) { setQrError(`Signature mismatch: ${err.message}`); setStatus('scanning_qr'); }
                }
              }}
              onError={(error) => { if (error?.name !== 'NotFoundException') setQrError(`Optical Error: ${error.message}`); }}
              constraints={selectedDeviceId ? { deviceId: selectedDeviceId } : { facingMode: 'environment' }} 
              components={{ audio: false, finder: true }}
              styles={{ container: { width: '100%', height: '100%', backgroundColor: '#000' }, video: { objectFit: 'cover' } }}
            />
            {qrError && (
              <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-12 text-center z-50 animate-in fade-in">
                 <p className="text-rose-500 font-bold serif-font text-xl mb-4">{qrError}</p>
                 <button onClick={() => { setQrError(''); setRetryCount(prev => prev + 1); }} className="btn-secondary">Retry Scan</button>
              </div>
            )}
          </div>
        )}

        {status === 'attendance_marked' && (
          <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center animate-in zoom-in-95 duration-700">
            <div className="w-32 h-32 bg-[#c5f82a] rounded-full flex items-center justify-center mb-8 shadow-2xl"><CheckCircle className="w-16 h-16 text-black" /></div>
            <h3 className="text-5xl font-bold serif-font text-[#1a1a1a]">Confirmed</h3>
            <p className="text-neutral-500 mt-4 text-lg italic">"Academic integrity maintained."</p>
          </div>
        )}
      </div>

      {status === 'scanning_qr' && devices.length > 1 && (
         <div className="flex items-center justify-center gap-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Switch Lens</label>
            <select 
               className="bg-white border border-[#e5e5e0] rounded-full px-6 py-2 text-xs font-bold outline-none cursor-pointer hover:border-[#1a1a1a] transition-colors"
               value={selectedDeviceId}
               onChange={(e) => { setQrError(''); setSelectedDeviceId(e.target.value); }}
            >
               {devices.map((device, i) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Lens ${i + 1}`}</option>)}
            </select>
         </div>
      )}

      {(status === 'idle' || status === 'error') && (
        <button onClick={captureAndVerify} className="btn-primary w-full shadow-2xl py-6" disabled={status === 'error'}>
          <Camera className="w-5 h-5" />
          <span>Authenticate Biometrics</span>
        </button>
      )}
    </div>
  );
}
