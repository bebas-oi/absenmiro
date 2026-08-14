import React, { useState } from 'react';
import {
  User,
  KeyRound,
  X,
  AlertCircle,
  School,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  GraduationCap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AdminLoginModal: React.FC = () => {
  const { isLoginModalOpen, setIsLoginModalOpen, login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg('Silakan masukkan username atau email.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Silakan masukkan password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = login(username, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMsg('Username atau password salah.');
      } else {
        setUsername('');
        setPassword('');
        setErrorMsg(null);
      }
    }, 350);
  };

  const handleFillAccount = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setErrorMsg(null);
  };

  return (
    <div
      id="admin-login-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsLoginModalOpen(false);
          setErrorMsg(null);
        }
      }}
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Top Header Graphic */}
        <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900 p-6 text-white relative">
          <button
            onClick={() => {
              setIsLoginModalOpen(false);
              setErrorMsg(null);
            }}
            className="absolute top-5 right-5 p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3.5 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-xs shadow-inner">
              <School className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="text-[10px] font-black tracking-widest text-emerald-300 uppercase">
                Autentikasi Pengguna
              </div>
              <h2 className="text-xl font-black tracking-tight text-white uppercase">
                LOGIN ADMIN / GURU
              </h2>
            </div>
          </div>
          <p className="text-xs text-emerald-100/90 font-medium">
            MI Rowosari — Akses dashboard administrasi & wali kelas
          </p>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
          {errorMsg && (
            <div className="flex items-center space-x-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
              Username / NIP / Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: admin atau siti.fatimah"
                autoFocus
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/15 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/15 transition-all"
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-700/25 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>MASUK KE DASHBOARD</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Quick Demo Fill Helper */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center space-x-1 text-slate-500 text-[11px] font-bold">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Pilihan Akun Demo Cepat:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleFillAccount('admin', 'admin123')}
                className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-slate-800 text-left font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Admin (Penuh)</span>
              </button>

              <button
                type="button"
                onClick={() => handleFillAccount('siti.fatimah', 'guru123')}
                className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-slate-800 text-left font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Guru 1A (Fatimah)</span>
              </button>

              <button
                type="button"
                onClick={() => handleFillAccount('ahmad.anam', 'guru123')}
                className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-slate-800 text-left font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Guru 1B (Anam)</span>
              </button>

              <button
                type="button"
                onClick={() => handleFillAccount('nurul.hidayah', 'guru123')}
                className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-slate-800 text-left font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Guru 2A (Nurul)</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
