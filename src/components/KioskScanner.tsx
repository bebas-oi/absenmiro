import React, { useState, useRef, useEffect } from 'react';
import {
  CreditCard,
  School,
  Maximize,
  Minimize,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  Hand,
  Search,
  Zap,
  Filter,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ManualAttendanceModal } from './ManualAttendanceModal';
import { ManualPinModal } from './ManualPinModal';
import { getAvatarFallback, getStudentPhotoSrc } from '../utils/googleDriveUtils';

export const KioskScanner: React.FC = () => {
  const {
    students,
    classes,
    attendance,
    settings,
    updateSettings,
    currentDateString,
    currentTimeString,
    formattedIndonesianDate,
    currentScanResult,
    clearScanResult,
    processRfidScan,
  } = useApp();

  const [rfidInput, setRfidInput] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(5);
  const [filterClass, setFilterClass] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the RFID input box so USB card scanner sends UID instantly
  useEffect(() => {
    const keepFocus = () => {
      if (inputRef.current && !isManualModalOpen) {
        inputRef.current.focus();
      }
    };

    keepFocus();
    const interval = setInterval(keepFocus, 1500);
    return () => clearInterval(interval);
  }, [isManualModalOpen]);

  // Handle auto countdown when scan result is shown
  useEffect(() => {
    if (!currentScanResult) {
      setCountdownSeconds(5);
      return;
    }

    setCountdownSeconds(5);
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          clearScanResult();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentScanResult, clearScanResult]);

  // Handle Scan Submit
  const handleRfidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfidInput.trim()) return;

    processRfidScan(rfidInput.trim());
    setRfidInput('');
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Today's attendance records
  const todayRecords = attendance.filter((a) => a.date === currentDateString);

  // Statistics
  const totalStudents = students.filter((s) => s.status === 'aktif').length;
  const hadirCount = todayRecords.filter((a) => a.status === 'HADIR').length;
  const terlambatCount = todayRecords.filter((a) => a.status === 'TERLAMBAT').length;
  const izinCount = todayRecords.filter((a) => a.status === 'IZIN').length;
  const sakitCount = todayRecords.filter((a) => a.status === 'SAKIT').length;
  const alpaCount = todayRecords.filter((a) => a.status === 'ALPA').length;
  const totalChecked = todayRecords.length;
  const attendanceRate = totalStudents > 0 ? Math.round(((hadirCount + terlambatCount) / totalStudents) * 100) : 0;

  // Filtered live records
  const filteredRecords = todayRecords.filter((rec) => {
    const matchClass = filterClass === 'all' || rec.className === filterClass;
    const q = searchFilter.toLowerCase().trim();
    const matchQuery =
      !q ||
      rec.studentName.toLowerCase().includes(q) ||
      rec.nis.toLowerCase().includes(q);
    return matchClass && matchQuery;
  });

  return (
    <div
      className={`space-y-6 font-['Plus_Jakarta_Sans',sans-serif] ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-100 p-6 overflow-y-auto' : ''
      }`}
    >
      {/* 1. HEADER KIOSK CERAH & ELEGAN */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 border border-emerald-500 shrink-0">
            <School className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700">
                Mode Kiosk & Scanner RFID
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1 animate-pulse" />
                ONLINE
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
              {settings.schoolName || 'MI ISLAMIYAH ROWOSARI'}
            </h2>
            <p className="text-xs text-slate-500 font-bold">
              {settings.subTitle || 'Lembaga Pendidikan Ma’arif NU - Kementerian Agama'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-end md:self-auto">
          <button
            onClick={() =>
              updateSettings({
                ...settings,
                soundEnabled: !settings.soundEnabled,
              })
            }
            className={`px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 border cursor-pointer ${
              settings.soundEnabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
            title="Toggle Suara Suara Presensi"
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-700" /> : <VolumeX className="w-4 h-4" />}
            <span>Suara: {settings.soundEnabled ? 'Aktif' : 'Nonaktif'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="px-3.5 py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span>{isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh TV'}</span>
          </button>
        </div>
      </div>

      {/* 2. STATISTIK KEHADIRAN HARI INI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-wider">
            <span>Tepat Waktu</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700 tracking-tight">{hadirCount}</span>
            <span className="text-[10px] font-black uppercase text-emerald-600">Siswa</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-wider">
            <span>Terlambat</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-700 tracking-tight">{terlambatCount}</span>
            <span className="text-[10px] font-black uppercase text-amber-600">Siswa</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-blue-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-wider">
            <span>Izin</span>
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-700 tracking-tight">{izinCount}</span>
            <span className="text-[10px] font-black uppercase text-blue-600">Siswa</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-purple-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-wider">
            <span>Sakit</span>
            <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-700 tracking-tight">{sakitCount}</span>
            <span className="text-[10px] font-black uppercase text-purple-600">Siswa</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-wider">
            <span>Alpa</span>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-700 tracking-tight">{alpaCount}</span>
            <span className="text-[10px] font-black uppercase text-rose-600">Siswa</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-wider">
            <span>Tingkat Hadir</span>
            <span className="text-xs font-black text-emerald-700">{attendanceRate}%</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{totalChecked}</span>
            <span className="text-[10px] font-bold text-slate-500">/{totalStudents} Siswa</span>
          </div>
        </div>
      </div>

      {/* 3. MAIN TERMINAL (2-KOLOM: KIRI TAP AREA + KANAN LIVE FEED) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* KOLOM KIRI: JAM BESAR & TAP SCANNER (7 KOLOM) */}
        <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
          {!currentScanResult && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 text-center space-y-6">
              {/* JAM BESAR SANS-SERIF MODERN */}
              <div className="bg-slate-50 rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-1">
                <div className="flex items-baseline justify-center space-x-2 sm:space-x-3">
                  <span className="font-sans font-black text-5xl sm:text-6xl md:text-7xl text-slate-900 tracking-tight leading-none tabular-nums">
                    {currentTimeString}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-700 uppercase font-sans tracking-wide">
                    WIB
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-widest pt-1 font-sans">
                  {formattedIndonesianDate}
                </div>
              </div>

              {/* CARD AREA TAP RFID */}
              <div className="bg-emerald-50/50 rounded-3xl border-2 border-dashed border-emerald-500/40 p-6 sm:p-8 space-y-3 max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-700/20 animate-pulse">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                    SILAHKAN SCAN KARTU ANDA
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-bold mt-1">
                    Tempelkan kartu RFID siswa pada scanner untuk mencatat presensi
                  </p>
                </div>

                {/* Input RFID Scanner (Auto-focused) */}
                <form onSubmit={handleRfidSubmit} className="pt-2 max-w-sm mx-auto">
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Menunggu tap kartu..."
                      value={rfidInput}
                      onChange={(e) => setRfidInput(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-emerald-500 rounded-2xl text-center text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/20 shadow-inner"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Scan
                    </button>
                  </div>
                </form>

                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border border-emerald-200 text-emerald-800 text-[11px] font-black uppercase tracking-wider shadow-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Reader USB Auto-Detect</span>
                  <span className="text-emerald-300">•</span>
                  <span className="text-emerald-700">SIAP DIGUNAKAN</span>
                </div>
              </div>

              {/* TOMBOL ABSEN MANUAL */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(true)}
                  className="inline-flex items-center space-x-2.5 px-6 py-2.5 rounded-2xl border-2 border-emerald-600 bg-white hover:bg-emerald-50 text-emerald-800 font-black text-xs sm:text-sm uppercase tracking-wider shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <Hand className="w-4 h-4 text-emerald-600" />
                  <span>✋ ABSEN MANUAL SISWA</span>
                </button>
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  Memerlukan PIN Petugas jika kartu lupa dibawa, rusak, atau izin/sakit
                </p>
              </div>
            </div>
          )}

          {/* HASIL SCAN KARTU AKTIF */}
          {currentScanResult && (
            <div className="bg-white rounded-3xl border-2 border-emerald-500 shadow-xl p-6 sm:p-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
              {currentScanResult.type === 'success' && currentScanResult.student && (
                <>
                  <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>
                      {currentScanResult.attendanceType === 'pulang'
                        ? 'PRESENSI PULANG BERHASIL'
                        : 'ABSENSI BERHASIL'}
                    </span>
                  </div>

                  <div className="relative inline-block">
                    <img
                      src={getStudentPhotoSrc(currentScanResult.student.photoUrl, currentScanResult.student.nis)}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getAvatarFallback(currentScanResult.student!.nis);
                      }}
                      alt={currentScanResult.student.name}
                      className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover mx-auto border-4 shadow-lg bg-white ${
                        currentScanResult.status === 'TERLAMBAT'
                          ? 'border-amber-500 shadow-amber-500/20'
                          : 'border-emerald-500 shadow-emerald-500/20'
                      }`}
                    />
                    <div className="absolute bottom-1 right-1 p-2 rounded-full bg-emerald-600 text-white border-2 border-white">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                      {currentScanResult.student.name}
                    </h3>
                    <div className="flex items-center justify-center space-x-2.5 text-xs sm:text-sm font-bold text-slate-600 mt-1">
                      <span>NIS: <strong className="text-slate-900 font-sans">{currentScanResult.student.nis}</strong></span>
                      <span className="text-slate-300">•</span>
                      <span>Kelas: <strong className="text-emerald-700 uppercase">{currentScanResult.student.className}</strong></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 max-w-md mx-auto">
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-400">Status</div>
                      <div
                        className={`mt-1 inline-block px-3 py-1 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider ${
                          currentScanResult.status === 'TERLAMBAT'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}
                      >
                        {currentScanResult.status}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-400">Waktu Absen</div>
                      <div className="mt-1 font-sans font-black text-sm sm:text-base text-slate-900">
                        {currentScanResult.timeString} <span className="text-[10px] text-emerald-700">WIB</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-500 max-w-md mx-auto">
                    <span>Kembali dalam <strong>{countdownSeconds} detik</strong></span>
                    <button
                      onClick={clearScanResult}
                      className="text-emerald-700 hover:text-emerald-800 font-black underline cursor-pointer"
                    >
                      Scan Siswa Berikutnya
                    </button>
                  </div>
                </>
              )}

              {currentScanResult.type === 'unrecognized' && (
                <div className="space-y-4 py-3">
                  <div className="w-14 h-14 rounded-full bg-rose-100 border-2 border-rose-400 flex items-center justify-center text-rose-600 mx-auto">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-rose-700 uppercase tracking-tight">
                      KARTU TIDAK DIKENALI
                    </h3>
                    {currentScanResult.rawUid && (
                      <div className="mt-1.5 text-xs font-sans font-bold text-slate-600 bg-slate-100 inline-block px-3 py-1 rounded-lg border border-slate-200">
                        UID: {currentScanResult.rawUid}
                      </div>
                    )}
                    <p className="text-xs text-slate-600 font-semibold mt-2">
                      Silakan gunakan kartu yang terdaftar atau lakukan <strong>ABSEN MANUAL</strong>.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-500 max-w-sm mx-auto">
                    <span>Kembali dalam <strong>{countdownSeconds} detik</strong></span>
                    <button
                      onClick={clearScanResult}
                      className="text-rose-700 hover:text-rose-800 font-black underline cursor-pointer"
                    >
                      Tutup & Coba Lagi
                    </button>
                  </div>
                </div>
              )}

              {currentScanResult.type === 'already_scanned' && currentScanResult.student && (
                <div className="space-y-4 py-3">
                  <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center text-amber-600 mx-auto">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-amber-800 uppercase tracking-tight">
                      ANDA SUDAH ABSEN HARI INI
                    </h3>
                    <div className="text-base font-black text-slate-900 uppercase mt-1">
                      {currentScanResult.student.name}
                    </div>
                    <p className="text-xs text-slate-600 font-semibold mt-1">
                      Kelas <strong className="text-emerald-700">{currentScanResult.student.className}</strong> • Absensi pertama:{' '}
                      <strong className="text-slate-900 font-sans">{currentScanResult.timeString} WIB</strong>
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-500 max-w-sm mx-auto">
                    <span>Kembali dalam <strong>{countdownSeconds} detik</strong></span>
                    <button
                      onClick={clearScanResult}
                      className="text-amber-800 hover:text-amber-900 font-black underline cursor-pointer"
                    >
                      Lanjutkan Scan
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* KOLOM KANAN: LIVE ABSENSI HARI INI (5 KOLOM) */}
        <div className="lg:col-span-5 flex flex-col h-full min-h-0">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 flex-1 flex flex-col h-full min-h-0 space-y-3">
            {/* Header Live Feed */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                  Live Kehadiran Hari Ini
                </h3>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1 animate-pulse" />
                {todayRecords.length} Masuk
              </span>
            </div>

            {/* Filter & Search */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama / NIS..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="all">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* List Absen Hari Ini */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 max-h-[460px]">
              {filteredRecords.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400 space-y-1">
                  <UserCheck className="w-8 h-8 text-slate-300 stroke-1" />
                  <p className="text-xs font-semibold text-slate-500">
                    Belum ada siswa di daftar ini.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Data otomatis tampil saat kartu RFID di-scan.
                  </p>
                </div>
              ) : (
                filteredRecords.map((rec, idx) => {
                  const matchedStudent = students.find(
                    (s) => s.id === rec.studentId || s.nis === rec.nis
                  );
                  return (
                  <div
                    key={rec.id}
                    className={`pt-2 first:pt-0 p-2.5 rounded-2xl flex items-center space-x-3 transition-colors ${
                      idx === 0
                        ? 'bg-emerald-50/80 border border-emerald-200/80'
                        : 'bg-slate-50/80 hover:bg-slate-100 border border-slate-200/50'
                    }`}
                  >
                    <img
                      src={getStudentPhotoSrc(matchedStudent?.photoUrl, rec.nis)}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getAvatarFallback(rec.nis);
                      }}
                      alt={rec.studentName}
                      className="w-10 h-10 rounded-full object-cover bg-white border border-slate-200 shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-black text-slate-900 uppercase truncate">
                          {rec.studentName}
                        </h4>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${
                            rec.status === 'TERLAMBAT'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mt-0.5">
                        <span>
                          {rec.className} • NIS: <span className="font-sans text-slate-700">{rec.nis}</span>
                        </span>
                        <span className="font-sans font-bold text-slate-800">
                          {rec.timeIn || '-'} WIB
                        </span>
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Verifikasi PIN Petugas */}
      <ManualPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => {
          setIsPinModalOpen(false);
          setIsManualModalOpen(true);
        }}
      />

      {/* Manual Attendance Modal */}
      <ManualAttendanceModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />
    </div>
  );
};
