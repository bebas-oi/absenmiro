import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FileSpreadsheet,
  CreditCard,
  Settings,
  ShieldCheck,
  X,
  ChevronRight,
  ArrowUpRight,
  LogOut,
  AlertTriangle,
  Scan,
  FileCheck2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../types';

interface NavItem {
  id: ActiveTab;
  label: string;
  subLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isMobileNavOpen,
    setIsMobileNavOpen,
    currentUser,
    isGuru,
    accessibleStudents,
    setViewMode,
    logout,
  } = useApp();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Define nav items based on role (RBAC)
  const navItems: NavItem[] = isGuru
    ? [
        {
          id: 'dashboard',
          label: 'Dashboard Wali Kelas',
          subLabel: currentUser?.assignedClass || 'Kelas Saya',
          icon: LayoutDashboard,
        },
        {
          id: 'students',
          label: 'Data Siswa',
          subLabel: `${accessibleStudents.length} Siswa (${currentUser?.assignedClass})`,
          icon: Users,
        },
        {
          id: 'teachers',
          label: 'Data Guru',
          subLabel: 'Dewan Guru & Wali Kelas',
          icon: GraduationCap,
        },
        {
          id: 'reports',
          label: 'Laporan Kehadiran',
          subLabel: 'Rekap & By Name',
          icon: FileSpreadsheet,
        },
        {
          id: 'cards',
          label: 'Cetak Kartu Siswa',
          subLabel: 'ID Card RFID Kelas',
          icon: CreditCard,
        },
        {
          id: 'exam',
          label: 'ASAS & ASAT',
          subLabel: 'Jadwal & Kartu Ujian',
          icon: FileCheck2,
        },
      ]
    : [
        {
          id: 'dashboard',
          label: 'Dashboard Statistik',
          subLabel: 'Ringkasan & Tren Kehadiran',
          icon: LayoutDashboard,
        },
        {
          id: 'students',
          label: 'Data Siswa & Kelas',
          subLabel: `${accessibleStudents.length} Siswa Terdaftar`,
          icon: Users,
        },
        {
          id: 'teachers',
          label: 'Data Guru',
          subLabel: 'Dewan Guru & Wali Kelas',
          icon: GraduationCap,
        },
        {
          id: 'users',
          label: 'Pengaturan User',
          subLabel: 'Akun Login & Hak Akses',
          icon: ShieldCheck,
        },
        {
          id: 'reports',
          label: 'Laporan Kehadiran',
          subLabel: 'Excel, PDF, By Name',
          icon: FileSpreadsheet,
        },
        {
          id: 'cards',
          label: 'Cetak Kartu Siswa',
          subLabel: 'Desain & ID Card RFID',
          icon: CreditCard,
        },
        {
          id: 'exam',
          label: 'ASAS & ASAT',
          subLabel: 'Jadwal & Cetak Kartu Ujian',
          icon: FileCheck2,
        },
        {
          id: 'settings',
          label: 'Pengaturan Jadwal',
          subLabel: 'Jam Masuk, Pulang, Toleransi',
          icon: Settings,
        },
      ];

  const handleSelectTab = (id: ActiveTab) => {
    setActiveTab(id);
    setIsMobileNavOpen(false);
  };

  const handleGoToKiosk = () => {
    setViewMode('landing');
    setIsMobileNavOpen(false);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    setIsMobileNavOpen(false);
    logout();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      {/* Sidebar Container: Flex Column Full Height */}
      <aside
        id="admin-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-100 border-r border-slate-800 flex flex-col h-full min-h-0 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto shrink-0 ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header Inside Drawer */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between lg:hidden bg-slate-950 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-base shadow-lg shadow-emerald-500/20">
              MI
            </div>
            <div>
              <div className="font-black text-sm text-white tracking-wider uppercase">MI ISLAMIYAH ROWOSARI</div>
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                {isGuru ? `Wali ${currentUser?.assignedClass}` : 'Admin Panel'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsMobileNavOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. IDENTITAS MADRASAH (Header Desktop) */}
        <div className="p-4 hidden lg:block shrink-0">
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl shadow-inner">
            <div className="flex items-center justify-between text-xs font-black text-white mb-1 tracking-wide">
              <span className="flex items-center space-x-1.5 uppercase">
                {isGuru ? (
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                )}
                <span>{isGuru ? currentUser?.assignedClass : 'MI Islamiyah Rowosari'}</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                {isGuru ? 'GURU' : 'ADMIN'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
              {isGuru
                ? `Login: ${currentUser?.name}`
                : 'Sistem Presensi Siswa RFID & Manajemen Kehadiran'}
            </p>
          </div>
        </div>

        {/* 2. MENU UTAMA (Scrollable Area) */}
        <div className="flex-1 min-h-0 px-3 py-2 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-black tracking-widest text-slate-400 uppercase">
            Menu Navigasi
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 group cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-900/40 translate-x-0.5'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-bold'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`p-2 rounded-lg transition-colors shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-emerald-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-black tracking-wide leading-snug uppercase truncate">
                      {item.label}
                    </div>
                    {item.subLabel && (
                      <div
                        className={`text-[10px] font-medium truncate mt-0.5 ${
                          isActive ? 'text-emerald-100' : 'text-slate-400'
                        }`}
                      >
                        {item.subLabel}
                      </div>
                    )}
                  </div>
                </div>

                <ChevronRight
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive ? 'text-white translate-x-0.5' : 'text-slate-500 opacity-0 group-hover:opacity-100'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* 3. AREA TOMBOL BAWAH (Fixed at bottom with separator) */}
        <div className="mt-auto shrink-0 p-3 pt-3 border-t border-slate-800 bg-slate-950/70 space-y-2">
          {/* Tombol KEMBALI KE KIOSK */}
          <button
            onClick={handleGoToKiosk}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600/20 border border-slate-700 hover:border-emerald-500/50 text-slate-200 hover:text-emerald-300 text-left transition-all duration-150 cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-slate-700/80 group-hover:bg-emerald-500/20 text-emerald-400">
                <Scan className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider">
                  KEMBALI KE KIOSK
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Halaman Scan Publik
                </div>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>

          {/* Tombol LOGOUT */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 text-slate-300 hover:text-rose-300 text-left transition-all duration-150 cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-rose-900/40 text-rose-400">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider">
                  LOGOUT
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Keluar dari Akun
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </aside>

      {/* Modal Konfirmasi Logout */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLogoutConfirm(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-rose-100 border-2 border-rose-400 flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                Konfirmasi Logout
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                Apakah Anda yakin ingin keluar dari akun {isGuru ? 'Wali Kelas' : 'Admin'}?
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-black uppercase tracking-wider text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-rose-700/20 active:scale-98 transition-all cursor-pointer"
              >
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
