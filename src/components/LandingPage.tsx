import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  School,
  Lock,
  Maximize,
  Minimize,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  Hand,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ManualAttendanceModal } from './ManualAttendanceModal';
import { ManualPinModal } from './ManualPinModal';
import { AdminLoginModal } from './AdminLoginModal';

export const LandingPage: React.FC = () => {
  const {
    settings,
    attendance,
    currentDateString,
    currentTimeString,
    formattedIndonesianDate,
    currentScanResult,
    clearScanResult,
    processRfidScan,
    setIsLoginModalOpen,
  } = useApp();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rfidBuffer, setRfidBuffer] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(5);

  const containerRef = useRef<HTMLDivElement>(null);

  // Focus lock for RFID scanner hardware (acts as virtual keyboard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in modal inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }

      if (e.key === 'Enter') {
        if (rfidBuffer.trim().length >= 3) {
          processRfidScan(rfidBuffer.trim());
          setRfidBuffer('');
        }
      } else if (e.key.length === 1) {
        setRfidBuffer((prev) => (prev + e.key).slice(-32));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rfidBuffer, processRfidScan]);

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

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Today's attendance records (live realtime stream)
  const todayRecords = attendance.filter((a) => a.date === currentDateString);
  const totalTerlambatToday = todayRecords.filter((a) => a.status === 'TERLAMBAT').length;

  return (
    <div
      ref={containerRef}
      id="landing-page-root"
      className="h-[100dvh] w-full bg-white text-slate-900 flex flex-col justify-between overflow-hidden select-none font-['Plus_Jakarta_Sans',sans-serif]"
    >
      {/* ========================================================================= */}
      {/* 1. HEADER (MINIMALIS, BERSIH, HANYA IDENTITAS KIRI & FULLSCREEN/LOGIN KANAN) */}
      {/* ========================================================================= */}
      <header className="w-full bg-white border-b border-slate-200/90 px-4 sm:px-8 py-3.5 shadow-xs shrink-0">
        <div className="w-full flex items-center justify-between">
          {/* Sisi Kiri: Logo + Nama Madrasah */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 border border-emerald-500">
              <School className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight uppercase tracking-tight">
                MI ROWOSARI
              </h1>
              <p className="text-[11px] sm:text-xs font-bold text-emerald-700 leading-tight uppercase">
                {settings.schoolName}
              </p>
            </div>
          </div>

          {/* Sisi Kanan: Tombol Fullscreen & Tombol Login Admin/Guru */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (Kiosk)'}
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-md shadow-emerald-700/20 active:scale-98 transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>LOGIN ADMIN / GURU</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN BODY (2-COLUMN LAYOUT: KIRI KIOSK SCAN + KANAN LIVE ABSENSI)      */}
      {/* ========================================================================= */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex-1 flex flex-col justify-center min-h-0">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-stretch h-full min-h-0">
          {/* ===================================================================== */}
          {/* KOLOM KIRI: IDENTITAS MADRASAH + JAM BESAR + SCAN RFID + ABSEN MANUAL */}
          {/* ===================================================================== */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-center h-full min-h-0 overflow-y-auto">
            {/* TAMPILAN NORMAL (JIKA TIDAK ADA HASIL SCAN AKTIF) */}
            {!currentScanResult && (
              <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7 lg:p-8 text-center space-y-4 lg:space-y-5 animate-in fade-in duration-300">
                {/* 1. LOGO MADRASAH BESAR & NAMA MADRASAH */}
                <div className="space-y-1.5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-700/20 border-4 border-emerald-100">
                    <School className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                      MI ROWOSARI
                    </h2>
                    <p className="text-xs sm:text-sm font-black text-emerald-700 uppercase tracking-wide">
                      MADRASAH IBTIDAIYAH (MI) ROWOSARI
                    </p>
                  </div>
                </div>

                {/* 2. JAM DIGITAL SANGAT BESAR & TANGGAL */}
                <div className="bg-slate-50/90 rounded-3xl border border-slate-200/80 p-4 sm:p-6 space-y-1.5">
                  <div className="flex items-baseline justify-center space-x-2 sm:space-x-3">
                    <span className="font-sans font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-slate-900 tracking-tight leading-none tabular-nums">
                      {currentTimeString}
                    </span>
                    <span className="text-base sm:text-xl md:text-2xl font-black text-emerald-700 uppercase font-sans tracking-wide">
                      WIB
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-widest pt-1 font-sans">
                    {formattedIndonesianDate}
                  </div>
                </div>

                {/* 3. AREA SCAN RFID */}
                <div className="bg-white rounded-2xl border-2 border-dashed border-emerald-500/40 p-4 sm:p-5 space-y-2.5 max-w-xl mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto animate-pulse">
                    <CreditCard className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                      SILAHKAN SCAN KARTU ANDA
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      Tempelkan kartu RFID siswa pada scanner
                    </p>
                  </div>

                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                    <span>SCANNER SIAP DIGUNAKAN</span>
                    <span className="text-emerald-300">•</span>
                    <span className="text-emerald-700">ONLINE</span>
                  </div>
                </div>

                {/* 4. TOMBOL ABSEN MANUAL */}
                <div>
                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(true)}
                    className="inline-flex items-center space-x-2.5 px-6 py-2.5 rounded-2xl border-2 border-emerald-600 bg-white hover:bg-emerald-50 text-emerald-800 font-black text-xs sm:text-sm uppercase tracking-wider shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer"
                  >
                    <Hand className="w-4 h-4 text-emerald-600" />
                    <span>✋ ABSEN MANUAL</span>
                  </button>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    Memerlukan PIN Petugas jika kartu lupa dibawa, rusak, atau izin/sakit
                  </p>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* HASIL SCAN SISWA (OVERLAY / CARD DI BAGIAN TENGAH)               */}
            {/* ================================================================= */}
            {currentScanResult && (
              <div className="w-full bg-white rounded-3xl border-2 border-emerald-500 shadow-xl p-6 sm:p-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
                {/* Case 1: Absensi Berhasil */}
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

                    {/* Foto Siswa */}
                    <div className="relative inline-block">
                      <img
                        src={
                          currentScanResult.student.photoUrl ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${currentScanResult.student.nis}`
                        }
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

                    {/* Nama Siswa & Kelas */}
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

                    {/* Status & Jam Absen */}
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
                          {currentScanResult.timeString} <span className="text-[10px] font-sans text-emerald-700">WIB</span>
                        </div>
                      </div>
                    </div>

                    {/* Auto Reset Footer */}
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

                {/* Case 2: Kartu Tidak Dikenali */}
                {currentScanResult.type === 'unrecognized' && (
                  <div className="space-y-4 py-3">
                    <div className="w-14 h-14 rounded-full bg-rose-100 border-2 border-rose-400 flex items-center justify-center text-rose-600 mx-auto animate-bounce">
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

                {/* Case 3: Sudah Absen Hari Ini */}
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

          {/* ===================================================================== */}
          {/* KOLOM KANAN: PANEL TETAP ABSENSI TERBARU HARI INI (REAL-TIME LIVE)     */}
          {/* ===================================================================== */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full min-h-0">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex-1 flex flex-col h-full min-h-0">
              {/* Header Panel Kanan */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2.5 shrink-0">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                    ABSENSI TERBARU HARI INI
                  </h3>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse" />
                  LIVE
                </span>
              </div>

              {/* Daftar Siswa Yang Sudah Absen (Vertical Stack dengan Scroll Internal) */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 divide-y divide-slate-100/60 min-h-0">
                {todayRecords.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2">
                    <UserCheck className="w-8 h-8 text-slate-300 stroke-1" />
                    <p className="text-xs font-semibold text-slate-500">
                      Belum ada siswa yang melakukan absensi hari ini.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Data otomatis tampil secara realtime saat kartu RFID di-scan.
                    </p>
                  </div>
                ) : (
                  todayRecords.map((rec, idx) => (
                    <div
                      key={rec.id}
                      className={`pt-2 first:pt-0 p-2.5 rounded-2xl transition-all flex items-center space-x-3 ${
                        idx === 0
                          ? 'bg-emerald-50/70 border border-emerald-200/80 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300'
                          : 'bg-slate-50/80 hover:bg-slate-100 border border-slate-200/50'
                      }`}
                    >
                      {/* Foto Siswa */}
                      <img
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${rec.nis}`}
                        alt={rec.studentName}
                        className="w-10 h-10 rounded-full object-cover bg-white border border-slate-200 shrink-0"
                      />

                      {/* Info Siswa */}
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
                          <span className="text-emerald-700 font-bold">Kelas {rec.className}</span>
                          <span className="font-sans text-slate-700 font-bold">
                            {rec.timeIn || rec.timeOut || '-'} WIB
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. FOOTER (CLEAN, WHITE/SLATE, STATISTIK REALTIME)                        */}
      {/* ========================================================================= */}
      <footer className="w-full bg-white border-t border-slate-200/90 px-4 sm:px-8 py-2.5 text-xs text-slate-600 font-bold shadow-xs shrink-0">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          {/* Sebelah Kiri */}
          <div className="flex items-center space-x-2 text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="font-black uppercase tracking-wider">SCANNER ONLINE</span>
          </div>

          {/* Sebelah Tengah */}
          <div className="text-slate-700 font-black uppercase tracking-wider">
            ABSENSI HARI INI: <span className="text-emerald-700">{todayRecords.length} SISWA</span>
          </div>

          {/* Sebelah Kanan */}
          <div className="text-slate-700 font-black uppercase tracking-wider">
            TERLAMBAT: <span className="text-amber-700">{totalTerlambatToday}</span>
          </div>
        </div>
      </footer>

      {/* Modal Verifikasi PIN Petugas Absen Manual */}
      <ManualPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => {
          setIsPinModalOpen(false);
          setIsManualModalOpen(true);
        }}
      />

      {/* Modal Absensi Manual Siswa */}
      <ManualAttendanceModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />

      {/* Modal Login Admin & Guru */}
      <AdminLoginModal />
    </div>
  );
};
