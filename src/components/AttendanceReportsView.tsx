import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Download,
  Search,
  Trash2,
  CheckSquare,
  Square,
  Pencil,
  Plus,
  X,
  Save,
  Grid3X3,
  List,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AttendanceRecord, AttendanceStatus } from '../types';
import { exportAttendanceToExcel, printFormalReport } from '../utils/exportUtils';
import { showConfirmDialog, showSuccessToast, showWarningToast } from '../utils/alerts';

type PeriodType = 'harian' | 'mingguan' | 'bulanan' | 'tahunan' | 'periodik';
type ReportViewMode = 'list' | 'matrix';

interface EditModalState {
  mode: 'edit_record' | 'add_manual' | 'edit_cell';
  recordId?: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  timeIn: string;
  timeOut: string;
  notes: string;
}

const STATUS_OPTIONS: {
  value: AttendanceStatus;
  label: string;
  short: string;
  badgeClass: string;
  cellClass: string;
  cardActiveClass: string;
}[] = [
  {
    value: 'HADIR',
    label: 'Hadir',
    short: 'H',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    cellClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200',
    cardActiveClass: 'border-emerald-600 bg-emerald-50 text-emerald-900',
  },
  {
    value: 'TERLAMBAT',
    label: 'Terlambat',
    short: 'T',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    cellClass: 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200',
    cardActiveClass: 'border-amber-600 bg-amber-50 text-amber-900',
  },
  {
    value: 'IZIN',
    label: 'Izin',
    short: 'I',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
    cellClass: 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200',
    cardActiveClass: 'border-blue-600 bg-blue-50 text-blue-900',
  },
  {
    value: 'SAKIT',
    label: 'Sakit',
    short: 'S',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
    cellClass: 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200',
    cardActiveClass: 'border-purple-600 bg-purple-50 text-purple-900',
  },
  {
    value: 'ALPA',
    label: 'Alpa',
    short: 'A',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
    cellClass: 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200',
    cardActiveClass: 'border-rose-600 bg-rose-50 text-rose-900',
  },
];

const getStatusMeta = (status: AttendanceStatus) =>
  STATUS_OPTIONS.find((o) => o.value === status) || STATUS_OPTIONS[0];

export const AttendanceReportsView: React.FC = () => {
  const {
    settings,
    currentDateString,
    currentUser,
    isGuru,
    accessibleAttendance,
    accessibleStudents,
    accessibleClasses,
    updateAttendanceRecord,
    upsertAttendanceForDate,
    batchUpdateAttendanceStatus,
    deleteAttendanceRecord,
  } = useApp();

  const [periodType, setPeriodType] = useState<PeriodType>('harian');
  const [reportViewMode, setReportViewMode] = useState<ReportViewMode>('list');
  const [selectedDate, setSelectedDate] = useState<string>(currentDateString);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [startDate, setStartDate] = useState<string>(currentDateString);
  const [endDate, setEndDate] = useState<string>(currentDateString);

  const [selectedClass, setSelectedClass] = useState<string>(
    isGuru && accessibleClasses.length === 1 ? accessibleClasses[0].name : 'all'
  );
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Multi-selection checkboxes
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // Edit / Manual Input modal
  const [editModal, setEditModal] = useState<EditModalState | null>(null);

  // Filter logic based on Period, Class, Student By Name, Status, and Search Query
  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return accessibleAttendance
      .filter((rec) => {
        // 1. Period filter
        let matchPeriod = true;

        if (periodType === 'harian') {
          matchPeriod = rec.date === selectedDate;
        } else if (periodType === 'mingguan') {
          const target = new Date(selectedDate);
          const recDate = new Date(rec.date);
          const diffDays = (target.getTime() - recDate.getTime()) / (1000 * 3600 * 24);
          matchPeriod = diffDays >= 0 && diffDays <= 7;
        } else if (periodType === 'bulanan') {
          matchPeriod = rec.date.startsWith(selectedMonth);
        } else if (periodType === 'tahunan') {
          matchPeriod = rec.date.startsWith(selectedYear);
        } else if (periodType === 'periodik') {
          matchPeriod = rec.date >= startDate && rec.date <= endDate;
        }

        // 2. Class filter
        const matchClass = selectedClass === 'all' || rec.className === selectedClass;

        // 3. Student By Name filter
        const matchStudent =
          selectedStudentFilter === 'all' || rec.studentId === selectedStudentFilter;

        // 4. Status filter
        const matchStatus = selectedStatus === 'all' || rec.status === selectedStatus;

        // 5. Text search
        const matchQuery =
          !q ||
          rec.studentName.toLowerCase().includes(q) ||
          rec.nis.toLowerCase().includes(q) ||
          rec.className.toLowerCase().includes(q) ||
          (rec.notes && rec.notes.toLowerCase().includes(q));

        return matchPeriod && matchClass && matchStudent && matchStatus && matchQuery;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.studentName.localeCompare(b.studentName, 'id', { sensitivity: 'base' });
      });
  }, [
    accessibleAttendance,
    periodType,
    selectedDate,
    selectedMonth,
    selectedYear,
    startDate,
    endDate,
    selectedClass,
    selectedStudentFilter,
    selectedStatus,
    searchQuery,
  ]);

  // Monthly Matrix Data (active students x days in selectedMonth)
  const monthlyMatrixInfo = useMemo(() => {
    const [yrStr, moStr] = selectedMonth.split('-');
    const yearNum = Number(yrStr) || new Date().getFullYear();
    const monthNum = Number(moStr) || new Date().getMonth() + 1;
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dObj = new Date(yearNum, monthNum - 1, dayNum);
      const isSunday = dObj.getDay() === 0;
      return { dayNum, dateStr, isSunday };
    });

    const q = searchQuery.toLowerCase().trim();
    const studentsList = [...accessibleStudents]
      .filter((s) => s.status === 'aktif')
      .filter((s) => selectedClass === 'all' || s.className === selectedClass)
      .filter((s) => selectedStudentFilter === 'all' || s.id === selectedStudentFilter)
      .filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.className.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));

    const recordMap = new Map<string, AttendanceRecord>();
    accessibleAttendance
      .filter((r) => r.date.startsWith(selectedMonth))
      .forEach((r) => {
        const key = `${r.studentId}__${r.date}`;
        if (!recordMap.has(key)) {
          recordMap.set(key, r);
        }
      });

    return { days, studentsList, recordMap, yearNum, monthNum };
  }, [
    selectedMonth,
    accessibleStudents,
    accessibleAttendance,
    selectedClass,
    selectedStudentFilter,
    searchQuery,
  ]);

  // Active students list for dropdown in Add Manual Modal
  const selectableStudentsForModal = useMemo(() => {
    return [...accessibleStudents]
      .filter((s) => s.status === 'aktif')
      .filter((s) => selectedClass === 'all' || s.className === selectedClass)
      .sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));
  }, [accessibleStudents, selectedClass]);

  // Handle Multi-select
  const handleSelectAll = () => {
    setSelectedRecordIds(filteredRecords.map((r) => r.id));
  };

  const handleDeselectAll = () => {
    setSelectedRecordIds([]);
  };

  const handleToggleRecord = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Selected records vs all filtered records
  const targetRecordsToExport =
    selectedRecordIds.length > 0
      ? filteredRecords.filter((r) => selectedRecordIds.includes(r.id))
      : filteredRecords;

  // Statistics
  const totalRecords = filteredRecords.length;
  const totalHadir = filteredRecords.filter((r) => r.status === 'HADIR').length;
  const totalTerlambat = filteredRecords.filter((r) => r.status === 'TERLAMBAT').length;
  const totalIzin = filteredRecords.filter((r) => r.status === 'IZIN').length;
  const totalSakit = filteredRecords.filter((r) => r.status === 'SAKIT').length;
  const totalAlpa = filteredRecords.filter((r) => r.status === 'ALPA').length;

  // Export handlers
  const handleExportExcel = () => {
    if (targetRecordsToExport.length === 0) {
      showWarningToast('Tidak ada data presensi yang sesuai untuk diekspor.');
      return;
    }

    const filterInfo = {
      period: periodType,
      classFilter: selectedClass === 'all' ? 'Semua Kelas' : selectedClass,
      studentName:
        selectedStudentFilter !== 'all'
          ? accessibleStudents.find((s) => s.id === selectedStudentFilter)?.name
          : undefined,
      startDate: periodType === 'periodik' ? startDate : undefined,
      endDate: periodType === 'periodik' ? endDate : undefined,
    };

    exportAttendanceToExcel(
      targetRecordsToExport,
      periodType,
      settings,
      accessibleStudents,
      filterInfo
    );
    showSuccessToast(
      `File Excel berhasil diunduh (${targetRecordsToExport.length} data presensi)!`
    );
  };

  const handlePrintPdf = () => {
    if (targetRecordsToExport.length === 0) {
      showWarningToast('Tidak ada data presensi yang sesuai untuk dicetak.');
      return;
    }

    const filterInfo = {
      period: periodType,
      classFilter: selectedClass === 'all' ? 'Semua Kelas' : selectedClass,
      studentName:
        selectedStudentFilter !== 'all'
          ? accessibleStudents.find((s) => s.id === selectedStudentFilter)?.name
          : undefined,
      startDate: periodType === 'periodik' ? startDate : undefined,
      endDate: periodType === 'periodik' ? endDate : undefined,
    };

    printFormalReport(targetRecordsToExport, periodType, settings, filterInfo);
  };

  const handleDelete = async (record: AttendanceRecord) => {
    const confirmed = await showConfirmDialog(
      'Hapus Log Presensi?',
      `Hapus catatan presensi untuk ${record.studentName} pada tanggal ${record.date}?`
    );
    if (confirmed) {
      deleteAttendanceRecord(record.id);
      setSelectedRecordIds((prev) => prev.filter((id) => id !== record.id));
    }
  };

  // Inline quick status change from table row
  const handleInlineStatusChange = (rec: AttendanceRecord, newStatus: AttendanceStatus) => {
    if (rec.status === newStatus) return;
    const isPresent = newStatus === 'HADIR' || newStatus === 'TERLAMBAT';
    const defaultTimeIn =
      newStatus === 'TERLAMBAT'
        ? `${settings.timeInLate || '07:15'}:00`
        : `${settings.timeInStandard || '07:00'}:00`;

    updateAttendanceRecord({
      ...rec,
      status: newStatus,
      method: 'MANUAL',
      timeIn: isPresent ? rec.timeIn || defaultTimeIn : undefined,
      timeOut: isPresent ? rec.timeOut : undefined,
      notes:
        rec.notes && !rec.notes.startsWith('Diperbarui manual')
          ? `${rec.notes} • Diubah ke ${newStatus}`
          : `Diperbarui manual (${newStatus})`,
    });
  };

  // Bulk status update for checked rows
  const handleBulkStatusUpdate = async (newStatus: AttendanceStatus) => {
    if (selectedRecordIds.length === 0) return;
    const confirmed = await showConfirmDialog(
      `Ubah ${selectedRecordIds.length} Data ke ${newStatus}?`,
      `Semua baris presensi yang dipilih akan diperbarui menjadi status ${newStatus}.`
    );
    if (!confirmed) return;

    batchUpdateAttendanceStatus(selectedRecordIds, newStatus);
    setSelectedRecordIds([]);
  };

  // Open Edit Modal from existing record row
  const openEditRecordModal = (rec: AttendanceRecord) => {
    setEditModal({
      mode: 'edit_record',
      recordId: rec.id,
      studentId: rec.studentId,
      date: rec.date,
      status: rec.status,
      timeIn: rec.timeIn || '',
      timeOut: rec.timeOut || '',
      notes: rec.notes || '',
    });
  };

  // Open Add / Upsert Manual Modal
  const openAddManualModal = () => {
    const defaultDate =
      periodType === 'bulanan'
        ? currentDateString.startsWith(selectedMonth)
          ? currentDateString
          : `${selectedMonth}-01`
        : periodType === 'periodik'
        ? startDate
        : selectedDate;
    const defaultStudentId =
      selectedStudentFilter !== 'all'
        ? selectedStudentFilter
        : selectableStudentsForModal[0]?.id || '';

    setEditModal({
      mode: 'add_manual',
      studentId: defaultStudentId,
      date: defaultDate,
      status: 'HADIR',
      timeIn: `${settings.timeInStandard || '07:00'}:00`,
      timeOut: '',
      notes: '',
    });
  };

  // Open Cell Edit Modal from 1-Month Matrix
  const openMatrixCellModal = (studentId: string, dateStr: string, existing?: AttendanceRecord) => {
    if (existing) {
      setEditModal({
        mode: 'edit_cell',
        recordId: existing.id,
        studentId,
        date: dateStr,
        status: existing.status,
        timeIn: existing.timeIn || '',
        timeOut: existing.timeOut || '',
        notes: existing.notes || '',
      });
    } else {
      setEditModal({
        mode: 'edit_cell',
        studentId,
        date: dateStr,
        status: 'HADIR',
        timeIn: `${settings.timeInStandard || '07:00'}:00`,
        timeOut: '',
        notes: '',
      });
    }
  };

  const handleSaveEditModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;

    if (!editModal.studentId) {
      showWarningToast('Pilih siswa terlebih dahulu.');
      return;
    }
    if (!editModal.date) {
      showWarningToast('Tanggal wajib diisi.');
      return;
    }

    const isPresent = editModal.status === 'HADIR' || editModal.status === 'TERLAMBAT';

    if (editModal.mode === 'edit_record' && editModal.recordId) {
      const existing = accessibleAttendance.find((r) => r.id === editModal.recordId);
      if (existing) {
        const defaultTimeIn =
          editModal.status === 'TERLAMBAT'
            ? `${settings.timeInLate || '07:15'}:00`
            : `${settings.timeInStandard || '07:00'}:00`;

        const ok = updateAttendanceRecord({
          ...existing,
          date: editModal.date,
          status: editModal.status,
          method: 'MANUAL',
          timeIn: isPresent ? editModal.timeIn.trim() || defaultTimeIn : undefined,
          timeOut: isPresent ? editModal.timeOut.trim() || undefined : undefined,
          notes: editModal.notes.trim() || `Diperbarui manual (${editModal.status})`,
        });
        if (ok) setEditModal(null);
        return;
      }
    }

    const ok = upsertAttendanceForDate({
      studentId: editModal.studentId,
      date: editModal.date,
      status: editModal.status,
      timeIn: isPresent ? editModal.timeIn.trim() : undefined,
      timeOut: isPresent ? editModal.timeOut.trim() : undefined,
      notes: editModal.notes.trim(),
    });
    if (ok) setEditModal(null);
  };

  const handleDeleteFromModal = async () => {
    if (!editModal?.recordId) return;
    const student = accessibleStudents.find((s) => s.id === editModal.studentId);
    const confirmed = await showConfirmDialog(
      'Kosongkan / Hapus Log Tanggal Ini?',
      `Hapus catatan presensi ${student?.name || 'siswa'} pada tanggal ${editModal.date}?`
    );
    if (confirmed) {
      deleteAttendanceRecord(editModal.recordId);
      setSelectedRecordIds((prev) => prev.filter((id) => id !== editModal.recordId));
      setEditModal(null);
    }
  };

  const modalStudent = editModal
    ? accessibleStudents.find((s) => s.id === editModal.studentId)
    : undefined;

  return (
    <div className="space-y-6 w-full">
      {/* Header Bar with Action Buttons */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-emerald-700">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Laporan Akademik & Kehadiran</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase mt-1">
            {isGuru
              ? `Laporan Presensi ${currentUser?.assignedSubject ? `${currentUser.assignedSubject} (${accessibleClasses.length} Kelas)` : currentUser?.assignedClass || ''}`
              : 'Laporan & Rekapitulasi Presensi'}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Ubah status Hadir/Terlambat/Izin/Sakit/Alpa secara manual, unduh Excel, atau cetak dokumen resmi Madrasah
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openAddManualModal}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-indigo-700/20 transition-all flex items-center space-x-2 cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>INPUT / KOREKSI MANUAL</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center space-x-2 cursor-pointer active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>
              UNDUH EXCEL {selectedRecordIds.length > 0 ? `(${selectedRecordIds.length})` : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={handlePrintPdf}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-slate-900/20 transition-all flex items-center space-x-2 cursor-pointer active:scale-98"
          >
            <Printer className="w-4 h-4" />
            <span>
              CETAK LAPORAN {selectedRecordIds.length > 0 ? `(${selectedRecordIds.length})` : ''}
            </span>
          </button>
        </div>
      </div>

      {/* Period Selector Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center gap-1.5">
        {(
          [
            { id: 'harian', label: 'Harian' },
            { id: 'mingguan', label: 'Mingguan (7 Hari)' },
            { id: 'bulanan', label: 'Bulanan (1 Bulan)' },
            { id: 'tahunan', label: 'Tahunan' },
            { id: 'periodik', label: 'Rentang Tanggal' },
          ] as const
        ).map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setPeriodType(tab.id)}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
              periodType === tab.id
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Date / Month / Range Input based on Period */}
        {periodType === 'harian' && (
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Pilih Tanggal
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600"
            />
          </div>
        )}

        {periodType === 'mingguan' && (
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600"
            />
          </div>
        )}

        {periodType === 'bulanan' && (
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Pilih Bulan
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600"
            />
          </div>
        )}

        {periodType === 'tahunan' && (
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Pilih Tahun
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600"
            >
              {[2025, 2026, 2027, 2028].map((yr) => (
                <option key={yr} value={yr}>
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>
        )}

        {periodType === 'periodik' && (
          <>
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600"
              />
            </div>
          </>
        )}

        {/* Filter Kelas (Disabled for GURU) */}
        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Rombel Kelas
          </label>
          <select
            value={selectedClass}
            disabled={isGuru && accessibleClasses.length <= 1}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedStudentFilter('all');
            }}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            {(!isGuru || accessibleClasses.length > 1) && <option value="all">Semua Kelas</option>}
            {accessibleClasses.map((cls) => (
              <option key={cls.id} value={cls.name}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Laporan Per Siswa / By Name */}
        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Laporan Per Siswa (By Name)
          </label>
          <select
            value={selectedStudentFilter}
            onChange={(e) => setSelectedStudentFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600"
          >
            <option value="all">Semua Siswa</option>
            {accessibleStudents
              .filter((s) => selectedClass === 'all' || s.className === selectedClass)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.nis})
                </option>
              ))}
          </select>
        </div>

        {/* Filter Status Presensi */}
        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Status Kehadiran
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600"
          >
            <option value="all">Semua Status</option>
            <option value="HADIR">Hadir</option>
            <option value="TERLAMBAT">Terlambat</option>
            <option value="IZIN">Izin</option>
            <option value="SAKIT">Sakit</option>
            <option value="ALPA">Alpa</option>
          </select>
        </div>

        {/* Cari Siswa / Catatan */}
        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Cari Siswa / NIS
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Nama / NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs text-center">
          <div className="text-[10px] font-black uppercase text-slate-400">Total Log</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalRecords}</div>
        </div>
        <div className="p-4 bg-emerald-50 rounded-3xl border border-emerald-200 shadow-xs text-center">
          <div className="text-[10px] font-black uppercase text-emerald-700">Hadir</div>
          <div className="text-2xl font-black text-emerald-800 mt-1">{totalHadir}</div>
        </div>
        <div className="p-4 bg-amber-50 rounded-3xl border border-amber-200 shadow-xs text-center">
          <div className="text-[10px] font-black uppercase text-amber-700">Terlambat</div>
          <div className="text-2xl font-black text-amber-800 mt-1">{totalTerlambat}</div>
        </div>
        <div className="p-4 bg-blue-50 rounded-3xl border border-blue-200 shadow-xs text-center">
          <div className="text-[10px] font-black uppercase text-blue-700">Izin</div>
          <div className="text-2xl font-black text-blue-800 mt-1">{totalIzin}</div>
        </div>
        <div className="p-4 bg-purple-50 rounded-3xl border border-purple-200 shadow-xs text-center">
          <div className="text-[10px] font-black uppercase text-purple-700">Sakit</div>
          <div className="text-2xl font-black text-purple-800 mt-1">{totalSakit}</div>
        </div>
        <div className="p-4 bg-rose-50 rounded-3xl border border-rose-200 shadow-xs text-center">
          <div className="text-[10px] font-black uppercase text-rose-700">Alpa</div>
          <div className="text-2xl font-black text-rose-800 mt-1">{totalAlpa}</div>
        </div>
      </div>

      {/* Mode Switcher for Bulanan (Daftar Log vs Matriks Edit 1 Bulan) */}
      {periodType === 'bulanan' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setReportViewMode('list')}
              className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer ${
                reportViewMode === 'list'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Daftar Log (Edit Baris / Massal)</span>
            </button>
            <button
              type="button"
              onClick={() => setReportViewMode('matrix')}
              className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer ${
                reportViewMode === 'matrix'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span>Matriks Edit 1 Bulan (Siswa × Tanggal)</span>
            </button>
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            {reportViewMode === 'matrix'
              ? 'Klik kotak tanggal mana saja pada siswa untuk mengubah atau mengisi Hadir / Terlambat / Izin / Sakit / Alpa.'
              : 'Ubah status langsung lewat dropdown Status atau klik ikon Pensil untuk edit lengkap.'}
          </div>
        </div>
      )}

      {/* Multi-Select Action Bar & Bulk Edit (for List View) */}
      {!(periodType === 'bulanan' && reportViewMode === 'matrix') && (
        <div className="bg-slate-900 text-white rounded-2xl px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-md">
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
            <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-xl font-black">
              {selectedRecordIds.length} Data Terpilih
            </span>
            <span className="text-slate-300">
              {selectedRecordIds.length > 0
                ? 'Ubah status massal data terpilih atau cetak/ekspor data terpilih:'
                : 'Centang baris untuk ubah status massal, atau edit langsung tiap baris di tabel.'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {selectedRecordIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mr-2 pr-2 border-r border-slate-700">
                <span className="text-[10px] font-black uppercase text-slate-400 mr-1">
                  Ubah Massal:
                </span>
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => handleBulkStatusUpdate(opt.value)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-wider transition-colors cursor-pointer border border-slate-700"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold uppercase tracking-wider cursor-pointer transition-colors"
            >
              PILIH SEMUA
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold uppercase tracking-wider cursor-pointer transition-colors"
            >
              BATALKAN SEMUA
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: 1-MONTH EDITABLE MATRIX */}
      {periodType === 'bulanan' && reportViewMode === 'matrix' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="font-black uppercase text-slate-700">
              Matriks Kehadiran Bulan {selectedMonth} ({monthlyMatrixInfo.studentsList.length} Siswa)
            </div>
            <div className="flex flex-wrap items-center gap-2 font-bold">
              {STATUS_OPTIONS.map((opt) => (
                <span
                  key={opt.value}
                  className={`px-2 py-0.5 rounded-md border text-[10px] ${opt.badgeClass}`}
                >
                  {opt.short} = {opt.label}
                </span>
              ))}
              <span className="px-2 py-0.5 rounded-md border border-slate-200 bg-white text-slate-400 text-[10px]">
                - = Kosong
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-black uppercase text-slate-600">
                  <th className="py-2.5 px-2.5 w-9 text-center sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                    No
                  </th>
                  <th className="py-2.5 px-3 min-w-[170px] sticky left-9 bg-slate-50 z-10 border-r border-slate-200">
                    Nama Siswa
                  </th>
                  <th className="py-2.5 px-2 w-20 text-center border-r border-slate-200">Kelas</th>
                  {monthlyMatrixInfo.days.map((d) => (
                    <th
                      key={d.dateStr}
                      className={`py-2 px-1 text-center min-w-[28px] border-r border-slate-100 ${
                        d.isSunday ? 'bg-rose-50 text-rose-700' : ''
                      }`}
                      title={d.dateStr}
                    >
                      {d.dayNum}
                    </th>
                  ))}
                  <th className="py-2 px-1.5 text-center bg-emerald-50 text-emerald-800 border-l border-slate-200 w-8">
                    H
                  </th>
                  <th className="py-2 px-1.5 text-center bg-amber-50 text-amber-800 w-8">T</th>
                  <th className="py-2 px-1.5 text-center bg-blue-50 text-blue-800 w-8">I</th>
                  <th className="py-2 px-1.5 text-center bg-purple-50 text-purple-800 w-8">S</th>
                  <th className="py-2 px-1.5 text-center bg-rose-50 text-rose-800 w-8">A</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyMatrixInfo.studentsList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8 + monthlyMatrixInfo.days.length}
                      className="py-10 text-center text-slate-400 font-semibold"
                    >
                      Tidak ada siswa aktif pada filter ini.
                    </td>
                  </tr>
                ) : (
                  monthlyMatrixInfo.studentsList.map((st, idx) => {
                    let cH = 0;
                    let cT = 0;
                    let cI = 0;
                    let cS = 0;
                    let cA = 0;

                    monthlyMatrixInfo.days.forEach((d) => {
                      const rec = monthlyMatrixInfo.recordMap.get(`${st.id}__${d.dateStr}`);
                      if (!rec) return;
                      if (rec.status === 'HADIR') cH++;
                      else if (rec.status === 'TERLAMBAT') cT++;
                      else if (rec.status === 'IZIN') cI++;
                      else if (rec.status === 'SAKIT') cS++;
                      else if (rec.status === 'ALPA') cA++;
                    });

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-2.5 text-center font-bold text-slate-500 sticky left-0 bg-white z-10 border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 uppercase sticky left-9 bg-white z-10 border-r border-slate-200 truncate max-w-[190px]">
                          {st.name}
                        </td>
                        <td className="py-2 px-2 text-center border-r border-slate-200">
                          <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                            {st.className}
                          </span>
                        </td>
                        {monthlyMatrixInfo.days.map((d) => {
                          const rec = monthlyMatrixInfo.recordMap.get(`${st.id}__${d.dateStr}`);
                          const meta = rec ? getStatusMeta(rec.status) : null;
                          const matchesStatusFilter =
                            selectedStatus === 'all' || (rec && rec.status === selectedStatus);

                          return (
                            <td
                              key={d.dateStr}
                              className={`p-0.5 text-center border-r border-slate-100 ${
                                d.isSunday ? 'bg-rose-50/40' : ''
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => openMatrixCellModal(st.id, d.dateStr, rec)}
                                title={
                                  rec
                                    ? `${st.name} (${d.dateStr}): ${rec.status}${rec.notes ? ` - ${rec.notes}` : ''} — Klik untuk ubah`
                                    : `${st.name} (${d.dateStr}): Belum ada data — Klik untuk isi manual`
                                }
                                className={`w-6 h-6 rounded-md text-[10px] font-black border transition-all cursor-pointer inline-flex items-center justify-center ${
                                  meta && matchesStatusFilter
                                    ? meta.cellClass
                                    : 'border-slate-200 bg-white text-slate-300 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                {meta && matchesStatusFilter ? meta.short : '-'}
                              </button>
                            </td>
                          );
                        })}
                        <td className="py-2 px-1.5 text-center font-black text-emerald-800 bg-emerald-50/60 border-l border-slate-200">
                          {cH}
                        </td>
                        <td className="py-2 px-1.5 text-center font-black text-amber-800 bg-amber-50/60">
                          {cT}
                        </td>
                        <td className="py-2 px-1.5 text-center font-black text-blue-800 bg-blue-50/60">
                          {cI}
                        </td>
                        <td className="py-2 px-1.5 text-center font-black text-purple-800 bg-purple-50/60">
                          {cS}
                        </td>
                        <td className="py-2 px-1.5 text-center font-black text-rose-800 bg-rose-50/60">
                          {cA}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW 2: LOG TABLE WITH INLINE STATUS EDIT + EDIT MODAL */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600">
                  <th className="py-3.5 px-4 w-12 text-center">
                    <button
                      type="button"
                      onClick={
                        selectedRecordIds.length === filteredRecords.length && filteredRecords.length > 0
                          ? handleDeselectAll
                          : handleSelectAll
                      }
                      className="text-slate-600 hover:text-emerald-700 cursor-pointer"
                    >
                      {selectedRecordIds.length === filteredRecords.length && filteredRecords.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 mx-auto" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-4 w-28">TANGGAL</th>
                  <th className="py-3.5 px-4 w-24">NIS</th>
                  <th className="py-3.5 px-4 min-w-[160px]">NAMA SISWA</th>
                  <th className="py-3.5 px-4 w-24">KELAS</th>
                  <th className="py-3.5 px-4 w-24">MASUK</th>
                  <th className="py-3.5 px-4 w-24">PULANG</th>
                  <th className="py-3.5 px-4 w-36 text-center">STATUS (UBAH)</th>
                  <th className="py-3.5 px-4 min-w-[140px]">KETERANGAN</th>
                  <th className="py-3.5 px-4 w-24 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                      <p className="text-sm font-semibold text-slate-600">
                        Tidak ada catatan presensi pada periode / filter ini.
                      </p>
                      <button
                        type="button"
                        onClick={openAddManualModal}
                        className="mt-3 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black uppercase text-[11px] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah / Input Presensi Manual</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => {
                    const isSelected = selectedRecordIds.includes(rec.id);
                    const statusMeta = getStatusMeta(rec.status);

                    return (
                      <tr
                        key={rec.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRecord(rec.id)}
                            className="text-slate-600 hover:text-emerald-700 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600 mx-auto" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 mx-auto" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{rec.date}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{rec.nis}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 uppercase">
                          {rec.studentName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {rec.className}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {rec.timeIn ? `${rec.timeIn}` : '-'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {rec.timeOut ? `${rec.timeOut}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <select
                            value={rec.status}
                            onChange={(e) =>
                              handleInlineStatusChange(rec, e.target.value as AttendanceStatus)
                            }
                            title="Klik untuk ubah status kehadiran secara langsung"
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer outline-hidden ${statusMeta.badgeClass}`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.value}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-[200px]">
                          {rec.notes || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => openEditRecordModal(rec)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Edit Lengkap (Tanggal, Jam, Status, Keterangan)"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(rec)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL EDIT / INPUT MANUAL PRESENSI */}
      {editModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditModal(null);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Koreksi & Input Laporan Presensi
                </div>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
                  {editModal.mode === 'add_manual'
                    ? 'Input / Koreksi Absensi Manual'
                    : editModal.mode === 'edit_cell'
                    ? 'Edit Kehadiran Tanggal'
                    : 'Edit Log Presensi'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} className="p-5 sm:p-6 space-y-4">
              {/* Student Picker or Read-only Student Info */}
              {editModal.mode === 'add_manual' ? (
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Pilih Siswa
                  </label>
                  <select
                    value={editModal.studentId}
                    onChange={(e) =>
                      setEditModal({ ...editModal, studentId: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-hidden"
                  >
                    {selectableStudentsForModal.length === 0 ? (
                      <option value="">Tidak ada siswa aktif</option>
                    ) : (
                      selectableStudentsForModal.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {s.className} (NIS: {s.nis})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black uppercase text-slate-900">
                      {modalStudent?.name || 'Siswa'}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500">
                      {modalStudent?.className || '-'} • NIS {modalStudent?.nis || '-'}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 font-mono font-bold text-xs text-slate-700">
                    {editModal.date}
                  </span>
                </div>
              )}

              {/* Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={editModal.date}
                    disabled={editModal.mode === 'edit_cell'}
                    onChange={(e) => setEditModal({ ...editModal, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Jam Masuk
                  </label>
                  <input
                    type="text"
                    placeholder="07:00:00"
                    disabled={
                      editModal.status !== 'HADIR' && editModal.status !== 'TERLAMBAT'
                    }
                    value={
                      editModal.status === 'HADIR' || editModal.status === 'TERLAMBAT'
                        ? editModal.timeIn
                        : '-'
                    }
                    onChange={(e) => setEditModal({ ...editModal, timeIn: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Jam Pulang
                  </label>
                  <input
                    type="text"
                    placeholder="Opsional"
                    disabled={
                      editModal.status !== 'HADIR' && editModal.status !== 'TERLAMBAT'
                    }
                    value={
                      editModal.status === 'HADIR' || editModal.status === 'TERLAMBAT'
                        ? editModal.timeOut
                        : '-'
                    }
                    onChange={(e) => setEditModal({ ...editModal, timeOut: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* Status Kehadiran Selector */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Status Kehadiran
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() =>
                        setEditModal({
                          ...editModal,
                          status: opt.value,
                          timeIn:
                            opt.value === 'HADIR' || opt.value === 'TERLAMBAT'
                              ? editModal.timeIn ||
                                (opt.value === 'TERLAMBAT'
                                  ? `${settings.timeInLate || '07:15'}:00`
                                  : `${settings.timeInStandard || '07:00'}:00`)
                              : '',
                        })
                      }
                      className={`py-2.5 px-2 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                        editModal.status === opt.value
                          ? `${opt.cardActiveClass} font-black shadow-xs`
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold'
                      }`}
                    >
                      <div className="text-xs uppercase">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Keterangan / Catatan */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Keterangan / Alasan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Surat izin orang tua, Sakit demam, Lupa tap RFID..."
                  value={editModal.notes}
                  onChange={(e) => setEditModal({ ...editModal, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:border-emerald-600 outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                {editModal.recordId ? (
                  <button
                    type="button"
                    onClick={handleDeleteFromModal}
                    className="px-3.5 py-2 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black uppercase text-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Log</span>
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditModal(null)}
                    className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 font-black uppercase text-xs hover:bg-slate-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs shadow-md shadow-emerald-700/20 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

