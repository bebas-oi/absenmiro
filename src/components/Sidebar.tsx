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
  ChevronLeft,
  ArrowUpRight,
  LogOut,
  AlertTriangle,
  Scan,
  FileCheck2,
  TrendingUp,
  Award,
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
    accessibleClasses,
    setViewMode,
    logout,
  } = useApp();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mi_rowosari_sidebar_collapsed_v1') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('mi_rowosari_sidebar_collapsed_v1', String(next));
    } catch {
      // ignore
    }
  };

  const guruRoleTitle = currentUser?.assignedSubject
    ? `Guru ${currentUser.assignedSubject}`
    : 'Wali Kelas';
  const guruClassBadge = currentUser?.assignedSubject
    ? `${currentUser.assignedSubject} (${accessibleClasses.length} Kelas)`
    : currentUser?.assignedClass || `${accessibleClasses.length} Kelas`;

  // Define nav items based on role (RBAC)
  const navItems: NavItem[] = isGuru
    ? [
        {
          id: 'dashboard',
          label: currentUser?.assignedSubject ? `Dashboard ${guruRoleTitle}` : 'Dashboard Wali Kelas',
          subLabel: guruClassBadge,
          icon: LayoutDashboard,
        },
        {
          id: 'students',
          label: 'Data Siswa',
          subLabel: `${accessibleStudents.length} Siswa (${guruClassBadge})`,
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
        {
          id: 'katrol',
          label: 'Katrol Nilai',
          subLabel: 'Olah & Konversi Nilai',
          icon: TrendingUp,
        },
        {
          id: 'achievements',
          label: 'Prestasi Sekolah',
          subLabel: 'Penghargaan & Kejuaraan',
          icon: Award,
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
          id: 'katrol',
          label: 'Katrol Nilai',
          subLabel: 'Olah & Konversi Nilai',
          icon: TrendingUp,
        },
        {
          id: 'achievements',
          label: 'Prestasi Sekolah',
          subLabel: 'Penghargaan & Kejuaraan',
          icon: Award,
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
        className={`fixed top-0 bottom-0 left-0 z-50 bg-slate-900 text-slate-100 border-r border-slate-800 flex flex-col h-full min-h-0 transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto shrink-0 ${
          isMobileNavOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}`}
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
                {isGuru ? guruClassBadge : 'Admin Panel'}
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

        {/* 1. IDENTITAS MADRASAH & TOMBOL COLLAPSE (Header Desktop) */}
        <div className="p-3 hidden lg:flex items-center justify-between shrink-0">
          {!isCollapsed ? (
            <div className="flex-1 p-3 bg-slate-950 border border-slate-800 rounded-2xl shadow-inner mr-1.5">
              <div className="flex items-center justify-between text-xs font-black text-white mb-1 tracking-wide">
                <span className="flex items-center space-x-1.5 uppercase truncate">
                  {isGuru ? (
                    <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <span className="truncate">{isGuru ? guruClassBadge : 'MI Islamiyah Rowosari'}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider shrink-0">
                  {isGuru ? 'GURU' : 'ADMIN'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold truncate">
                {isGuru ? `Login: ${currentUser?.name}` : 'Sistem Presensi RFID'}
              </p>
            </div>
          ) : (
            <div className="w-full flex justify-center py-1">
              <div
                className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-md"
                title="MI Islamiyah Rowosari"
              >
                MI
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleToggleCollapse}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title={isCollapsed ? 'Perluas Sidebar' : 'Minimalkan Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* 2. MENU UTAMA (Scrollable Area) */}
        <div className="flex-1 min-h-0 px-2.5 py-2 space-y-1.5 overflow-y-auto">
          {!isCollapsed && (
            <div className="px-3 py-1.5 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              Menu Navigasi
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
                } rounded-xl text-left transition-all duration-150 group cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-900/40'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-bold'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'space-x-0' : 'space-x-3'} min-w-0`}>
                  <div
                    className={`p-2 rounded-lg transition-colors shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-emerald-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {!isCollapsed && (
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
                  )}
                </div>

                {!isCollapsed && (
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isActive ? 'text-white translate-x-0.5' : 'text-slate-500 opacity-0 group-hover:opacity-100'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 3. AREA TOMBOL BAWAH (Fixed at bottom with separator) */}
        <div className="mt-auto shrink-0 p-2.5 pt-3 border-t border-slate-800 bg-slate-950/70 space-y-2">
          {/* Tombol KEMBALI KE KIOSK */}
          <button
            onClick={handleGoToKiosk}
            title={isCollapsed ? 'Kembali ke Kiosk' : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
            } rounded-xl bg-slate-800 hover:bg-emerald-600/20 border border-slate-700 hover:border-emerald-500/50 text-slate-200 hover:text-emerald-300 text-left transition-all duration-150 cursor-pointer group`}
          >
            <div className={`flex items-center ${isCollapsed ? 'space-x-0' : 'space-x-2.5'}`}>
              <div className="p-1.5 rounded-lg bg-slate-700/80 group-hover:bg-emerald-500/20 text-emerald-400 shrink-0">
                <Scan className="w-4 h-4" />
              </div>
              {!isCollapsed && (
                <div>
                  <div className="text-xs font-black uppercase tracking-wider">
                    KEMBALI KE KIOSK
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    Halaman Scan Publik
                  </div>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
            )}
          </button>

          {/* Tombol LOGOUT */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            title={isCollapsed ? 'Logout' : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
            } rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 text-slate-300 hover:text-rose-300 text-left transition-all duration-150 cursor-pointer group`}
          >
            <div className={`flex items-center ${isCollapsed ? 'space-x-0' : 'space-x-2.5'}`}>
              <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-rose-900/40 text-rose-400 shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              {!isCollapsed && (
                <div>
                  <div className="text-xs font-black uppercase tracking-wider">
                    LOGOUT
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    Keluar dari Akun
                  </div>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-transform group-hover:translate-x-0.5 shrink-0" />
            )}
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
