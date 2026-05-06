import React from 'react';
import { ArrowLeft, Info, ShieldCheck, Zap, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo_refined.png';

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-neutral-500 hover:text-[#1a1a1a] transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="mb-16 text-center">
          <div className="w-32 h-32 rounded-full bg-white border border-[#e5e5e0] flex items-center justify-center mx-auto mb-8 shadow-md overflow-hidden">
            <img src={logo} alt="AttendX Logo" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-5xl font-bold serif-font mb-6">Redefining Presence.</h1>
          <p className="text-xl text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            AttendX is a next-generation attendance management portal designed for modern academic institutions. 
            We combine AI-driven identity verification with secure, real-time tracking to ensure academic integrity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="glass-card p-10 bg-white shadow-sm">
            <div className="w-12 h-12 bg-[#c5f82a] rounded-2xl flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6 text-black" />
            </div>
            <h3 className="text-2xl font-bold serif-font mb-4">Biometric Verification</h3>
            <p className="text-neutral-500 leading-relaxed">
              Our FaceGate technology uses DeepFace and AI models to verify student identity in real-time, 
              preventing proxy attendance and ensuring that the right person is in the right class.
            </p>
          </div>

          <div className="glass-card p-10 bg-white shadow-sm">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-[#c5f82a]" />
            </div>
            <h3 className="text-2xl font-bold serif-font mb-4">Real-time Sync</h3>
            <p className="text-neutral-500 leading-relaxed">
              Faculty members can monitor attendance live as it happens. Sessions are secured with 
              JWT-signed QR codes that refresh and expire to prevent unauthorized sharing.
            </p>
          </div>

          <div className="glass-card p-10 bg-white shadow-sm">
            <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6 text-black" />
            </div>
            <h3 className="text-2xl font-bold serif-font mb-4">Smart Analytics</h3>
            <p className="text-neutral-500 leading-relaxed">
              Students and faculty get detailed insights into participation levels, session history, 
              and compliance with academic requirements through intuitive dashboards.
            </p>
          </div>

          <div className="glass-card p-10 bg-white shadow-sm">
            <div className="w-12 h-12 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mb-6">
              <Info className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold serif-font mb-4">Enterprise Grade</h3>
            <p className="text-neutral-500 leading-relaxed">
              Built with security and scalability in mind, AttendX uses modern web standards to provide 
              a reliable and professional experience for both students and administration.
            </p>
          </div>
        </div>

        <footer className="text-center py-12 border-t border-[#e5e5e0]">
          <p className="text-neutral-400 text-sm italic serif-font">"Empowering institutions through technology."</p>
        </footer>
      </div>
    </div>
  );
}
