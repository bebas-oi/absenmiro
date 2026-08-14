import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  Download,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  CheckSquare,
  Square,
  User,
  GraduationCap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AttendanceRecord } from '../types';
import { exportAttendanceToExcel, printFormalReport } from '../utils/exportUtils';
import { showConfirmDialog, showSuccessToast, showWarningToast } from '../utils/alerts';

type PeriodType = 'harian' | 'mingguan' | 'bulanan' | 'tahunan' | 'periodik';

export const AttendanceReportsView: React.FC = () => {
  const {
    settings,
    currentDateString,
    currentUser,
    isGuru,
    accessibleAttendance,
    accessibleStudents,
    accessibleClasses,
    deleteAttendanceRecord,
  } = useApp();

  const [periodType, setPeriodType] = useState<PeriodType>('harian');
  const [selectedDate, setSelectedDate] = useState<string>(currentDateString);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [startDate, setStartDate] = useState<string>(currentDateString);
  const [endDate, setEndDate] = useState<string>(currentDateString);

  const [selectedClass, setSelectedClass] = useState<string>(
    isGuru && currentUser?.assignedClass ? currentUser.assignedClass : 'all'
  );
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Multi-selection checkboxes
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // Filter logic based on Period, Class, Student By Name, Status, and Search Query
  const filteredRecords = useMemo(() => {
    return accessibleAttendance.filter((rec) => {
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
      const q = searchQuery.toLowerCase();
      const matchQuery =
        rec.studentName.toLowerCase().includes(q) ||
        rec.nis.includes(q) ||
        (rec.notes && rec.notes.toLowerCase().includes(q));

      return matchPeriod && matchClass && matchStudent && matchStatus && matchQuery;
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
  const persenKehadiran =
    totalRecords > 0 ? (((totalHadir + totalTerlambat) / totalRecords) * 100).toFixed(1) : '0';

  // Export handlers
  const handleExportExcel = () => {
    if (targetRecordsToExport.length === 0) {
      showWarningToast('Tidak ada data presensi yang sesuai untuk diekspor.');
      return;
    }

    const filterInfo = {
      period: periodType,
      classFilter: selectedClass === 'all' ? 'Semua Kelas' : selectedClass,
      studentFilter:
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
      studentFilter:
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

  return (
    <div className="space-y-6 w-full">
      {/* Header Bar with Action Buttons */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-emerald-700">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Laporan Akademik & Kehadiran</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase mt-1">
            {isGuru
              ? `Laporan Presensi ${currentUser?.assignedClass}`
              : 'Laporan & Rekapitulasi Presensi'}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Unduh rekapitulasi data kehadiran dalam format Excel atau cetak dokumen resmi Madrasah
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center space-x-2 cursor-pointer active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>
              UNDUH EXCEL {selectedRecordIds.length > 0 ? `(${selectedRecordIds.length})` : ''}
            </span>
          </button>

          <button
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
            { id: 'bulanan', label: 'Bulanan' },
            { id: 'tahunan', label: 'Tahunan' },
            { id: 'periodik', label: 'Rentang Tanggal' },
          ] as const
        ).map((tab) => (
          <button
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
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            disabled={isGuru}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedStudentFilter('all');
            }}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            {!isGuru && <option value="all">Semua Kelas</option>}
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

      {/* Multi-Select Action Bar */}
      <div className="bg-slate-900 text-white rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center space-x-3 text-xs font-bold">
          <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-xl font-black">
            {selectedRecordIds.length} Data Terpilih
          </span>
          <span className="text-slate-400">
            {selectedRecordIds.length > 0
              ? 'Hanya data terpilih yang akan dicetak/diekspor'
              : 'Semua data sesuai filter akan dicetak/diekspor'}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold uppercase tracking-wider cursor-pointer transition-colors"
          >
            PILIH SEMUA
          </button>
          <button
            onClick={handleDeselectAll}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold uppercase tracking-wider cursor-pointer transition-colors"
          >
            BATALKAN SEMUA
          </button>
        </div>
      </div>

      {/* Table Records */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-4 w-12 text-center">
                  <button
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
                <th className="py-3.5 px-4 w-28 text-center">STATUS</th>
                <th className="py-3.5 px-4 min-w-[140px]">KETERANGAN</th>
                <th className="py-3.5 px-4 w-16 text-center">AKSI</th>
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
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isSelected = selectedRecordIds.includes(rec.id);

                  return (
                    <tr
                      key={rec.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <button
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
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            rec.status === 'HADIR'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : rec.status === 'TERLAMBAT'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : rec.status === 'IZIN'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : rec.status === 'SAKIT'
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : 'bg-rose-100 text-rose-900 border border-rose-300'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-[200px]">
                        {rec.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDelete(rec)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus Log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
