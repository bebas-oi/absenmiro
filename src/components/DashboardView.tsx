import React from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  FileQuestion,
  AlertTriangle,
  GraduationCap,
  CreditCard,
  Building,
  ShieldCheck,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    isGuru,
    accessibleStudents,
    accessibleAttendance,
    classes,
    teachers,
    settings,
    currentDateString,
    setActiveTab,
    setViewMode,
  } = useApp();

  const todayRecords = accessibleAttendance.filter((a) => a.date === currentDateString);

  const totalActiveStudents = accessibleStudents.filter((s) => s.status === 'aktif').length;
  const hadirTepat = todayRecords.filter((a) => a.status === 'HADIR').length;
  const terlambat = todayRecords.filter((a) => a.status === 'TERLAMBAT').length;
  const izin = todayRecords.filter((a) => a.status === 'IZIN').length;
  const sakit = todayRecords.filter((a) => a.status === 'SAKIT').length;
  const alpa = todayRecords.filter((a) => a.status === 'ALPA').length;
  const totalHadirAll = hadirTepat + terlambat;
  const ratePersen =
    totalActiveStudents > 0 ? Math.round((totalHadirAll / totalActiveStudents) * 100) : 0;

  // Breakdown per class (filtered by accessible classes for Guru vs Admin)
  const relevantClasses = isGuru && currentUser?.assignedClass
    ? classes.filter((c) => c.name === currentUser.assignedClass)
    : classes;

  const classBreakdown = relevantClasses.map((cls) => {
    const classStudents = accessibleStudents.filter(
      (s) => s.className === cls.name && s.status === 'aktif'
    );
    const classAttendance = todayRecords.filter((r) => r.className === cls.name);
    const classHadir = classAttendance.filter(
      (r) => r.status === 'HADIR' || r.status === 'TERLAMBAT'
    ).length;
    const classRate =
      classStudents.length > 0 ? Math.round((classHadir / classStudents.length) * 100) : 0;
    const homeroom = teachers.find((t) => t.assignedClass === cls.name);

    return {
      classRoom: cls,
      total: classStudents.length,
      hadir: classHadir,
      rate: classRate,
      teacher: homeroom,
    };
  });

  return (
    <div className="space-y-6 w-full">
      {/* Welcome Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
          <Building className="w-80 h-80 -mr-10 -mb-10 text-white" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-3 border border-emerald-500/30">
            {isGuru ? (
              <>
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Wali {currentUser?.assignedClass}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tahun Ajaran {settings.activeAcademicYear} ({settings.activeSemester})</span>
              </>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight uppercase">
            {isGuru
              ? `Dashboard Presensi ${currentUser?.assignedClass}`
              : 'Dashboard Presensi Siswa MI Islamiyah Rowosari'}
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed font-medium">
            {isGuru
              ? `Selamat datang, ${currentUser?.name}. Kehadiran ${currentUser?.assignedClass} hari ini tercatat `
              : 'Pantau kehadiran siswa secara real-time melalui sensor RFID. Kehadiran hari ini tercatat '}
            <strong className="text-emerald-400 underline font-black">
              {totalHadirAll} dari {totalActiveStudents} Siswa
            </strong>{' '}
            ({ratePersen}%).
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('students')}
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-xs sm:text-sm shadow-lg shadow-emerald-900/40 transition-all flex items-center space-x-2 cursor-pointer active:scale-98"
            >
              <Users className="w-4 h-4" />
              <span>Buka Data Siswa</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-black uppercase tracking-wider text-xs sm:text-sm transition-all cursor-pointer flex items-center space-x-2 active:scale-98"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Lihat Laporan & Rekap</span>
            </button>
            <button
              onClick={() => setViewMode('landing')}
              className="px-4 py-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-black uppercase tracking-wider text-xs sm:text-sm transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Halaman Scan Kiosk</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Siswa */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              {isGuru ? `Total Siswa ${currentUser?.assignedClass}` : 'Total Siswa Aktif'}
            </div>
            <div className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
              {totalActiveStudents}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-bold">
              <span>{isGuru ? currentUser?.assignedClass : `${classes.length} Rombel Terdaftar`}</span>
            </div>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Hadir Hari Ini */}
        <div className="bg-white p-6 rounded-3xl border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">
              Hadir Tepat Waktu
            </div>
            <div className="text-3xl font-black text-emerald-700 mt-1 tracking-tight">{hadirTepat}</div>
            <div className="text-[11px] text-emerald-700 mt-1 font-extrabold">
              {totalActiveStudents > 0 ? Math.round((hadirTepat / totalActiveStudents) * 100) : 0}% Populasi
            </div>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Terlambat */}
        <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black text-amber-700 uppercase tracking-widest">
              Terlambat Hari Ini
            </div>
            <div className="text-3xl font-black text-amber-700 mt-1 tracking-tight">{terlambat}</div>
            <div className="text-[11px] text-amber-700 mt-1 font-extrabold">
              {totalActiveStudents > 0 ? Math.round((terlambat / totalActiveStudents) * 100) : 0}% Siswa
            </div>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Izin / Sakit / Alpa */}
        <div className="bg-white p-6 rounded-3xl border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black text-rose-700 uppercase tracking-widest">
              Izin / Sakit / Alpa
            </div>
            <div className="text-3xl font-black text-rose-700 mt-1 tracking-tight">
              {izin + sakit + alpa}
            </div>
            <div className="text-[11px] text-rose-700 mt-1 font-extrabold">
              I: {izin} | S: {sakit} | A: {alpa}
            </div>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Rombel Class Attendance Overview */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
              {isGuru ? `Statistik Kehadiran ${currentUser?.assignedClass}` : 'Rekapitulasi Kehadiran Per Rombel'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Tingkat partisipasi presensi siswa berdasarkan rombongan belajar
            </p>
          </div>
          <button
            onClick={() => setActiveTab('reports')}
            className="text-xs font-black text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 cursor-pointer"
          >
            <span>Lihat Detail Laporan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classBreakdown.map((item) => (
            <div
              key={item.classRoom.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 uppercase text-sm">{item.classRoom.name}</h4>
                  <p className="text-[11px] text-slate-500 font-bold truncate max-w-[160px]">
                    Wali: {item.teacher ? item.teacher.name : '-'}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                    item.rate >= 85
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : item.rate >= 60
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  {item.rate}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.rate >= 85 ? 'bg-emerald-600' : item.rate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${item.rate}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>Hadir: {item.hadir} Siswa</span>
                <span>Total: {item.total} Siswa</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
