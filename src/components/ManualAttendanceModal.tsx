import React, { useState } from 'react';
import {
  X,
  UserCheck,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  School,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AttendanceStatus, AttendanceType } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualAttendanceModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { students, classes, addManualAttendance } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [status, setStatus] = useState<AttendanceStatus>('HADIR');
  const [type, setType] = useState<AttendanceType>('masuk');
  const [notes, setNotes] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (!isOpen) return null;

  const filteredStudents = students.filter((student) => {
    if (student.status !== 'aktif') return false;
    const matchClass = selectedClass === 'all' || student.className === selectedClass;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchClass;
    const matchQuery =
      student.name.toLowerCase().includes(q) ||
      student.nis.toLowerCase().includes(q) ||
      student.rfidUid.toLowerCase().includes(q) ||
      student.className.toLowerCase().includes(q);
    return matchClass && matchQuery;
  });

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedStudent) return;
    setShowConfirmDialog(true);
  };

  const handleExecuteAttendance = () => {
    if (!selectedStudentId) return;

    const success = addManualAttendance({
      studentId: selectedStudentId,
      status,
      type,
      notes: notes.trim() || 'Absen Manual oleh Petugas',
      customTime: customTime || undefined,
    });

    if (success) {
      setSelectedStudentId('');
      setSearchQuery('');
      setNotes('');
      setCustomTime('');
      setShowConfirmDialog(false);
      onClose();
    }
  };

  return (
    <div
      id="manual-attendance-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowConfirmDialog(false);
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-xs">
              <UserCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="text-[10px] font-black tracking-widest text-emerald-300 uppercase">
                Petugas / Pengelola Kiosk
              </div>
              <h3 className="font-black text-lg sm:text-xl tracking-tight uppercase">
                ABSENSI MANUAL SISWA
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {!showConfirmDialog ? (
          <form onSubmit={handlePreSubmit} className="p-6 sm:p-7 overflow-y-auto flex-1 space-y-5">
            {/* Step 1: Search and Select Student */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                1. Cari & Pilih Siswa
              </label>

              {/* Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="relative sm:col-span-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Cari Nama Siswa / NIS / UID / Kelas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-hidden bg-slate-50 text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-hidden bg-slate-50 font-bold text-slate-800"
                >
                  <option value="all">Semua Kelas</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.name}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student List Box */}
              <div className="border border-slate-200 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-slate-50">
                {filteredStudents.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-400 font-semibold">
                    Tidak ditemukan siswa yang sesuai pencarian.
                  </div>
                ) : (
                  filteredStudents.map((s) => {
                    const isSelected = selectedStudentId === s.id;
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setSelectedStudentId(s.id)}
                        className={`w-full p-3 text-left flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-950 font-black border-l-4 border-emerald-600'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <img
                            src={s.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.nis}`}
                            alt={s.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-white shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-black uppercase tracking-tight truncate text-slate-900">
                              {s.name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-bold font-mono">
                              NIS: {s.nis} | Kelas: <span className="font-black text-emerald-700 uppercase">{s.className}</span> | UID: {s.rfidUid}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {selectedStudent && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3 text-xs text-emerald-950 font-medium">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Siswa Terpilih: <strong className="font-black uppercase text-emerald-800">{selectedStudent.name}</strong> (Kelas {selectedStudent.className} • NIS {selectedStudent.nis})
                  </span>
                </div>
              )}
            </div>

            {/* Step 2: Status Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                2. Status Kehadiran
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(
                  [
                    { id: 'HADIR', label: 'Hadir', desc: 'Tepat Waktu', color: 'border-emerald-600 bg-emerald-50 text-emerald-900' },
                    { id: 'TERLAMBAT', label: 'Terlambat', desc: 'Lewat Jam Masuk', color: 'border-amber-600 bg-amber-50 text-amber-900' },
                    { id: 'IZIN', label: 'Izin', desc: 'Dengan Surat/Kabar', color: 'border-blue-600 bg-blue-50 text-blue-900' },
                    { id: 'SAKIT', label: 'Sakit', desc: 'Surat Dokter/Ortu', color: 'border-purple-600 bg-purple-50 text-purple-900' },
                    { id: 'ALPA', label: 'Alpa', desc: 'Tanpa Keterangan', color: 'border-rose-600 bg-rose-50 text-rose-900' },
                  ] as const
                ).map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setStatus(item.id)}
                    className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                      status === item.id
                        ? `${item.color} font-black scale-[1.02] shadow-xs`
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-black uppercase tracking-wider">{item.label}</div>
                    <div className="text-[10px] font-bold opacity-75 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Type & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Jenis Presensi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('masuk')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-black uppercase tracking-wider cursor-pointer ${
                      type === 'masuk'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Presensi Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('pulang')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-black uppercase tracking-wider cursor-pointer ${
                      type === 'pulang'
                        ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Presensi Pulang
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Keterangan / Alasan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Lupa bawa kartu / Sakit..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-hidden font-medium bg-slate-50"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 font-black uppercase tracking-wider text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!selectedStudentId}
                className={`px-6 py-2.5 rounded-2xl font-black uppercase tracking-wider text-xs shadow-md transition-all flex items-center space-x-2 ${
                  selectedStudentId
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20 active:scale-98 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Lanjutkan Absen</span>
              </button>
            </div>
          </form>
        ) : (
          /* Step 4: Confirmation Dialog */
          <div className="p-6 sm:p-8 space-y-6 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-emerald-700 mx-auto">
              <UserCheck className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-lg sm:text-xl font-black text-slate-900 uppercase">
                Konfirmasi Absensi Siswa
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Apakah Anda yakin ingin mencatat absensi siswa ini?
              </p>
            </div>

            {selectedStudent && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-w-md mx-auto text-left flex items-center space-x-4">
                <img
                  src={selectedStudent.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedStudent.nis}`}
                  alt={selectedStudent.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 bg-white"
                />
                <div>
                  <div className="text-sm font-black uppercase text-slate-900">{selectedStudent.name}</div>
                  <div className="text-xs text-slate-500 font-bold">Kelas {selectedStudent.className} • NIS {selectedStudent.nis}</div>
                  <div className="mt-1 flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                      {status}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">
                      {type === 'masuk' ? 'Presensi Masuk' : 'Presensi Pulang'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="px-6 py-3 rounded-2xl border border-slate-300 text-slate-700 font-black uppercase tracking-wider text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={handleExecuteAttendance}
                className="px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-emerald-700/25 active:scale-98 transition-all flex items-center space-x-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>KONFIRMASI ABSEN</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

