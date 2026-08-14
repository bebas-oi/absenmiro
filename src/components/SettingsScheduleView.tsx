import React, { useState } from 'react';
import {
  Settings,
  Clock,
  Building,
  Save,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Volume2,
  Calendar,
  Cloud,
  Database,
  RefreshCw,
  Copy,
  Check,
  Key,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SchoolSettings } from '../types';
import { showConfirmDialog, showSuccessToast } from '../utils/alerts';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from '../lib/supabase';
import { SUPABASE_SQL_SCHEMA } from '../services/supabaseService';
import firebaseConfigJson from '../../firebase-applet-config.json';

export const SettingsScheduleView: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetAllData,
    isCloudConnected,
    isSyncing,
    cloudProvider,
    syncWithCloud,
    updateSupabaseConfig,
  } = useApp();
  const [form, setForm] = useState<SchoolSettings>({ ...settings });
  
  // Supabase Configuration State
  const [sbUrl, setSbUrl] = useState(SUPABASE_URL || '');
  const [sbKey, setSbKey] = useState(SUPABASE_ANON_KEY || '');
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  const handleChange = (field: keyof SchoolSettings, value: string | boolean | number) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(form);
    showSuccessToast('Pengaturan jam dan data madrasah berhasil disimpan!');
  };

  const handleReset = async () => {
    const confirmed = await showConfirmDialog(
      'Reset Semua Data?',
      'Semua data siswa, kelas, guru, dan presensi akan dikembalikan ke data default MI Rowosari. Apakah Anda yakin?'
    );
    if (confirmed) {
      resetAllData();
      setForm(settings);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2 uppercase">
            <Settings className="w-6 h-6 text-emerald-600" />
            <span>Pengaturan Jam Operasional & Profil Madrasah</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Konfigurasi jam masuk, batas toleransi terlambat, jam pulang, dan identitas resmi MI Rowosari
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-2xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 font-black uppercase tracking-wider text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Data Default</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Jam Masuk & Pulang */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-black text-xs uppercase tracking-wider border-b border-slate-200 pb-3">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Pengaturan Waktu & Jadwal Kehadiran Siswa</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Jam Buka Gerbang Scanner (Mulai Masuk)
              </label>
              <input
                type="time"
                value={form.timeInStart}
                onChange={(e) => handleChange('timeInStart', e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-black"
              />
              <span className="text-[11px] font-bold text-slate-400 mt-0.5 block">
                Siswa bisa mulai tap sebelum jam ini
              </span>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Target Masuk Tepat Waktu (Bel Masuk)
              </label>
              <input
                type="time"
                value={form.timeInStandard}
                onChange={(e) => handleChange('timeInStandard', e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-black text-emerald-700"
              />
              <span className="text-[11px] font-bold text-slate-400 mt-0.5 block">
                Jam standar masuk kelas
              </span>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Batas Toleransi Keterlambatan *
              </label>
              <input
                type="time"
                value={form.timeInLate}
                onChange={(e) => handleChange('timeInLate', e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-black text-amber-700"
              />
              <span className="text-[11px] text-amber-600 mt-0.5 block font-bold">
                Lewat dari jam ini otomatis dihitung TERLAMBAT
              </span>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Jam Pulang Reguler (Senin - Kamis & Sabtu)
              </label>
              <input
                type="time"
                value={form.timeOutStandard}
                onChange={(e) => handleChange('timeOutStandard', e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-black text-blue-700"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Jam Pulang Khusus Hari Jumat
              </label>
              <input
                type="time"
                value={form.timeOutFriday}
                onChange={(e) => handleChange('timeOutFriday', e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-black text-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Jeda Anti Dobel Tap Scanner (Detik)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={form.kioskCooldownSeconds || 3}
                onChange={(e) => handleChange('kioskCooldownSeconds', Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-bold"
              />
              <span className="text-[11px] font-bold text-slate-400 mt-0.5 block">
                Mencegah siswa tap berulang dalam waktu singkat
              </span>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                PIN Keamanan Absen Manual Kiosk *
              </label>
              <input
                type="text"
                maxLength={10}
                value={form.kioskManualPin || '123456'}
                onChange={(e) => handleChange('kioskManualPin', e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-emerald-300 bg-emerald-50/50 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-black text-emerald-900 tracking-widest"
              />
              <span className="text-[11px] font-bold text-emerald-700 mt-0.5 block">
                PIN proteksi yang harus dimasukkan petugas saat Absen Manual di Kiosk (Default: 123456)
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Identitas Madrasah (untuk Kop Laporan & Kartu) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-black text-xs uppercase tracking-wider border-b border-slate-200 pb-3">
            <Building className="w-4 h-4 text-emerald-600" />
            <span>Identitas Resmi Madrasah & Legalitas</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Nama Madrasah / Sekolah *
              </label>
              <input
                type="text"
                value={form.schoolName}
                onChange={(e) => handleChange('schoolName', e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-black uppercase text-emerald-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Instansi Pembina (Sub-Judul Kop)
              </label>
              <input
                type="text"
                value={form.subTitle}
                onChange={(e) => handleChange('subTitle', e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                NSM (Nomor Statistik Madrasah)
              </label>
              <input
                type="text"
                value={form.nsm}
                onChange={(e) => handleChange('nsm', e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                NPSN
              </label>
              <input
                type="text"
                value={form.npsn}
                onChange={(e) => handleChange('npsn', e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Nama Kepala Madrasah *
              </label>
              <input
                type="text"
                value={form.headmaster}
                onChange={(e) => handleChange('headmaster', e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-black uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                NIP Kepala Madrasah
              </label>
              <input
                type="text"
                value={form.headmasterNip}
                onChange={(e) => handleChange('headmasterNip', e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Alamat Lengkap Madrasah
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Tahun Ajaran Aktif
              </label>
              <input
                type="text"
                value={form.activeAcademicYear}
                onChange={(e) => handleChange('activeAcademicYear', e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Semester Aktif
              </label>
              <select
                value={form.activeSemester}
                onChange={(e) => handleChange('activeSemester', e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold bg-white"
              >
                <option value="Ganjil">Ganjil (1)</option>
                <option value="Genap">Genap (2)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cloud Database Integration Section */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg space-y-5 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                    Database Cloud: {cloudProvider === 'supabase' ? 'Supabase (PostgreSQL Real-Time)' : 'Cloud Firestore (Real-Time)'}
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isCloudConnected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {isCloudConnected ? '● Cloud Terhubung' : '● Offline Cache Mode'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Seluruh data presensi, siswa, rombel, guru, dan akun tersimpan secara persisten di database cloud.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowSqlModal(true)}
                className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Lihat Skrip SQL</span>
              </button>

              <button
                type="button"
                onClick={() => syncWithCloud()}
                disabled={isSyncing}
                className="inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sinkronisasi...' : 'Sinkronkan'}</span>
              </button>
            </div>
          </div>

          {/* Supabase URL & Key Configuration Form */}
          <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  Konfigurasi Kredensial Supabase
                </h4>
              </div>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center space-x-1 transition-colors"
              >
                <span>Buka Supabase Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  placeholder="https://xyzproject.supabase.co"
                  value={sbUrl}
                  onChange={(e) => setSbUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Supabase Anon Key (Public API Key)
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={sbKey}
                  onChange={(e) => setSbKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  updateSupabaseConfig(sbUrl, sbKey);
                  syncWithCloud();
                }}
                className="px-4 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
              >
                Simpan & Hubungkan Supabase
              </button>
            </div>
          </div>
        </div>

        {/* Modal Lihat Skrip SQL Supabase */}
        {showSqlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-3xl w-full max-h-[85vh] flex flex-col text-white shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">
                      Skrip SQL Database Supabase
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Jalankan skrip ini pada menu <span className="text-emerald-400 font-bold">SQL Editor</span> di Dashboard Supabase Anda.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="relative flex-1 overflow-auto rounded-2xl bg-slate-950 p-4 border border-slate-800">
                <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">
                  Tabel: settings, classes, teachers, users, students, attendance
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                      setCopiedSql(true);
                      showSuccessToast('Skrip SQL berhasil disalin ke clipboard!');
                      setTimeout(() => setCopiedSql(false), 3000);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSql ? 'Tersalin!' : 'Salin Semua SQL'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSqlModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Semua Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
};
