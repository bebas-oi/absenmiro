import React from 'react';
import {
  Menu,
  School,
  ShieldCheck,
  GraduationCap,
  User,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Header: React.FC = () => {
  const {
    currentUser,
    isGuru,
    isMobileNavOpen,
    setIsMobileNavOpen,
    isCloudConnected,
    isSyncing,
    cloudProvider,
    syncWithCloud,
  } = useApp();

  return (
    <header className="bg-white border-b border-slate-200 shrink-0 z-30 shadow-xs h-15 sm:h-16 w-full flex items-center">
      <div className="w-full px-4 sm:px-6 flex items-center justify-between">
        {/* Sebelah Kiri: Logo + Identitas Madrasah + Role Badge */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:outline-hidden"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-black text-sm sm:text-base text-slate-900 tracking-tight leading-none uppercase">
                  MI ISLAMIYAH ROWOSARI
                </h1>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isGuru
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {isGuru ? (
                    <>
                      <GraduationCap className="w-3 h-3 mr-1 text-blue-600" />
                      Wali {currentUser?.assignedClass || 'Kelas'}
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                      Admin Panel
                    </>
                  )}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                Sistem Presensi Siswa RFID
              </p>
            </div>
          </div>
        </div>

        {/* Sebelah Kanan: Status Cloud DB + Profil User */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Cloud Status Badge */}
          <button
            type="button"
            onClick={() => syncWithCloud()}
            title="Klik untuk sinkronkan ulang database cloud"
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 text-[11px] font-black transition-all cursor-pointer"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>{cloudProvider === 'supabase' ? 'Supabase Sync' : 'Cloud Sync'}</span>
            <RefreshCw className={`w-3 h-3 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex items-center space-x-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
            <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
              {isGuru ? <GraduationCap className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            </div>
            <div className="text-left">
              <div className="text-xs font-black text-slate-900 leading-tight truncate max-w-[140px] sm:max-w-[200px]">
                {currentUser?.name || 'Administrator'}
              </div>
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                {isGuru ? `WALI ${currentUser?.assignedClass}` : 'SUPER ADMIN'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

