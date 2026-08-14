import React, { useState, useRef } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CreditCard,
  Building,
  CheckCircle2,
  X,
  Sparkles,
  User,
  GraduationCap,
  Download,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckSquare,
  Square,
  Printer,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ClassRoom, ImportPreviewResult, Student } from '../types';
import { showConfirmDialog, showSuccessToast, showWarningToast } from '../utils/alerts';
import { downloadStudentExcelTemplate, parseAndValidateStudentExcel } from '../utils/excelUtils';

export const StudentsClassesView: React.FC = () => {
  const {
    students,
    classes,
    teachers,
    currentUser,
    isGuru,
    accessibleStudents,
    accessibleClasses,
    addStudent,
    batchImportStudents,
    updateStudent,
    deleteStudent,
    addClass,
    updateClass,
    deleteClass,
    setActiveTab,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'students' | 'classes'>('students');

  // Student Filters
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState(
    isGuru && currentUser?.assignedClass ? currentUser.assignedClass : 'all'
  );

  // Checkbox multi-select state for students
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Student Form Modal State (strictly NIS, NAMA, RFID, KELAS, JENIS KELAMIN)
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState({
    nis: '',
    name: '',
    rfidUid: '',
    className: accessibleClasses[0]?.name || 'Kelas 1A',
    gender: 'L' as 'L' | 'P',
    parentName: '',
    parentPhone: '',
    address: '',
    status: 'aktif' as 'aktif' | 'nonaktif',
  });

  // Excel Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [importResult, setImportResult] = useState<ImportPreviewResult | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Class Form Modal State (Admin Only)
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [classForm, setClassForm] = useState({
    name: '',
    grade: 1,
    academicYear: '2026/2027',
    homeroomTeacherId: '',
  });

  // Filter accessible students
  const filteredStudents = accessibleStudents.filter((student) => {
    const matchClass =
      selectedClassFilter === 'all' || student.className === selectedClassFilter;
    const matchSearch =
      student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.nis.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.rfidUid.toLowerCase().includes(studentSearch.toLowerCase());
    return matchClass && matchSearch;
  });

  // Multi-select handlers
  const handleSelectAll = () => {
    setSelectedStudentIds(filteredStudents.map((s) => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Helper to open student modal for Create
  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({
      nis: '',
      name: '',
      rfidUid: '',
      className: isGuru && currentUser?.assignedClass ? currentUser.assignedClass : accessibleClasses[0]?.name || 'Kelas 1A',
      gender: 'L',
      parentName: '',
      parentPhone: '',
      address: '',
      status: 'aktif',
    });
    setIsStudentModalOpen(true);
  };

  // Helper to open student modal for Edit
  const handleOpenEditStudent = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      nis: student.nis,
      name: student.name,
      rfidUid: student.rfidUid,
      className: student.className,
      gender: student.gender,
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      address: student.address || '',
      status: student.status,
    });
    setIsStudentModalOpen(true);
  };

  // Save Student
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.nis.trim() || !studentForm.name.trim() || !studentForm.rfidUid.trim()) {
      showWarningToast('NIS, Nama Siswa, dan No RFID wajib diisi!');
      return;
    }

    if (editingStudent) {
      updateStudent({
        ...editingStudent,
        ...studentForm,
      });
    } else {
      addStudent({
        ...studentForm,
        photoUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${studentForm.nis}`,
      });
    }

    setIsStudentModalOpen(false);
  };

  // Delete Student
  const handleDeleteStudent = async (student: Student) => {
    const confirmed = await showConfirmDialog(
      'Hapus Data Siswa?',
      `Apakah Anda yakin ingin menghapus data ${student.name} (NIS: ${student.nis})? Tindakan ini tidak dapat dibatalkan.`
    );
    if (confirmed) {
      deleteStudent(student.id);
      setSelectedStudentIds((prev) => prev.filter((id) => id !== student.id));
    }
  };

  // Excel File Upload & Parse
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setImportFileName(file.name);
    setIsParsingExcel(true);
    setImportResult(null);

    try {
      const validClassNames = classes.map((c) => c.name);
      const result = await parseAndValidateStudentExcel(file, students, validClassNames);
      setImportResult(result);
    } catch (err: any) {
      showWarningToast('Gagal memproses file Excel. Pastikan format valid.');
    } finally {
      setIsParsingExcel(false);
    }
  };

  const handleCommitImport = () => {
    if (!importResult || importResult.validRows.length === 0) {
      showWarningToast('Tidak ada baris data valid untuk diimpor.');
      return;
    }

    batchImportStudents(importResult.validRows);
    setIsImportModalOpen(false);
    setImportResult(null);
    setImportFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Batch Print Action
  const handlePrintSelectedCards = () => {
    if (selectedStudentIds.length === 0) {
      showWarningToast('Pilih minimal 1 siswa dengan mencentang checkbox untuk mencetak kartu.');
      return;
    }
    setActiveTab('cards');
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Banner & Tab Navigation */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-emerald-700">
            <GraduationCap className="w-4 h-4" />
            <span>Manajemen Data Akademik</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-1">
            {isGuru ? `Data Siswa ${currentUser?.assignedClass}` : 'Data Siswa & Rombel Kelas'}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isGuru
              ? `Kelola data siswa di kelas ${currentUser?.assignedClass}`
              : 'Kelola basis data siswa, nomor RFID, dan rombongan belajar'}
          </p>
        </div>

        {/* Sub Tabs (Only Admin can see Rombel Kelas tab) */}
        {!isGuru && (
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setActiveSubTab('students')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeSubTab === 'students'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Data Siswa ({accessibleStudents.length})
            </button>
            <button
              onClick={() => setActiveSubTab('classes')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeSubTab === 'classes'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rombel Kelas ({classes.length})
            </button>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* SUB TAB 1: DATA SISWA                                                */}
      {/* ===================================================================== */}
      {activeSubTab === 'students' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Search & Class Filter */}
            <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari NIS, Nama, RFID..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              {/* Class Filter Dropdown (Disabled if GURU) */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedClassFilter}
                  disabled={isGuru}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  {!isGuru && <option value="all">Semua Kelas ({students.length})</option>}
                  {accessibleClasses.map((cls) => {
                    const count = students.filter((s) => s.className === cls.name).length;
                    return (
                      <option key={cls.id} value={cls.name}>
                        {cls.name} ({count} Siswa)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Action Buttons: Tambah, Template, Import */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleOpenAddStudent}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-700/20 flex items-center space-x-2 cursor-pointer transition-all active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>+ TAMBAH SISWA</span>
              </button>

              <button
                onClick={downloadStudentExcelTemplate}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer transition-colors"
                title="Download Template Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>TEMPLATE EXCEL</span>
              </button>

              <button
                onClick={() => {
                  setImportResult(null);
                  setImportFileName('');
                  setIsImportModalOpen(true);
                }}
                className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer transition-colors"
                title="Import Siswa Dari Excel"
              >
                <UploadCloud className="w-3.5 h-3.5 text-emerald-700" />
                <span>IMPORT EXCEL</span>
              </button>
            </div>
          </div>

          {/* Multi-Select Action Bar (Shows when rows are selected) */}
          <div className="bg-slate-900 text-white rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center space-x-3 text-xs font-bold">
              <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-xl font-black">
                {selectedStudentIds.length} Siswa Terpilih
              </span>
              <span className="text-slate-400">dari {filteredStudents.length} siswa ditampilkan</span>
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
              <button
                onClick={handlePrintSelectedCards}
                disabled={selectedStudentIds.length === 0}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>CETAK KARTU TERPILIH</span>
              </button>
            </div>
          </div>

          {/* Table Data Siswa (Clean, Minimal, Strictly NIS, Nama, RFID, Kelas, JK, Aksi) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600">
                    <th className="py-3.5 px-4 w-12 text-center">
                      <button
                        onClick={
                          selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0
                            ? handleDeselectAll
                            : handleSelectAll
                        }
                        className="text-slate-600 hover:text-emerald-700 cursor-pointer"
                        title="Pilih / Batal Semua"
                      >
                        {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 mx-auto" />
                        )}
                      </button>
                    </th>
                    <th className="py-3.5 px-4 w-28">NIS</th>
                    <th className="py-3.5 px-4 min-w-[180px]">NAMA SISWA</th>
                    <th className="py-3.5 px-4 w-32 font-mono">RFID UID</th>
                    <th className="py-3.5 px-4 w-28">KELAS</th>
                    <th className="py-3.5 px-4 w-24 text-center">L/P</th>
                    <th className="py-3.5 px-4 w-24 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Users className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                        <p className="text-sm font-semibold text-slate-600">Tidak ada data siswa ditemukan.</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Klik <strong>+ Tambah Siswa</strong> atau <strong>Import Excel</strong> untuk memasukkan data.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const isSelected = selectedStudentIds.includes(student.id);

                      return (
                        <tr
                          key={student.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? 'bg-emerald-50/40' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleStudent(student.id)}
                              className="text-slate-600 hover:text-emerald-700 cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600 mx-auto" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 mx-auto" />
                              )}
                            </button>
                          </td>

                          {/* NIS */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {student.nis}
                          </td>

                          {/* Nama Siswa & Avatar */}
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2.5">
                              <img
                                src={student.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${student.nis}`}
                                alt={student.name}
                                className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 shrink-0 object-cover"
                              />
                              <span className="font-bold text-slate-900 uppercase">
                                {student.name}
                              </span>
                            </div>
                          </td>

                          {/* RFID UID */}
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono font-black text-slate-800 border border-slate-200 text-[11px]">
                              {student.rfidUid}
                            </span>
                          </td>

                          {/* Kelas */}
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {student.className}
                            </span>
                          </td>

                          {/* Jenis Kelamin (L / P) */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                student.gender === 'L'
                                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                  : 'bg-pink-50 text-pink-800 border border-pink-200'
                              }`}
                            >
                              {student.gender === 'L' ? 'L (Laki-laki)' : 'P (Perempuan)'}
                            </span>
                          </td>

                          {/* Aksi */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => handleOpenEditStudent(student)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="Edit Siswa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(student)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Hapus Siswa"
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

            {/* Table Footer Stats */}
            <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-bold">
              <span>Total: {filteredStudents.length} Siswa</span>
              <span>
                Laki-laki: {filteredStudents.filter((s) => s.gender === 'L').length} | Perempuan:{' '}
                {filteredStudents.filter((s) => s.gender === 'P').length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB TAB 2: ROMBEL KELAS (ADMIN ONLY)                                 */}
      {/* ===================================================================== */}
      {activeSubTab === 'classes' && !isGuru && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => {
              const classStudents = students.filter((s) => s.className === cls.name);
              const homeroom = teachers.find((t) => t.assignedClass === cls.name);

              return (
                <div
                  key={cls.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Tingkat {cls.grade}
                      </span>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-1">
                        {cls.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Tahun Ajaran {cls.academicYear}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                      {cls.grade}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Total Siswa:</span>
                      <strong className="text-slate-900">{classStudents.length} Siswa</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Wali Kelas:</span>
                      <strong className="text-emerald-700 truncate max-w-[160px]">
                        {homeroom ? homeroom.name : 'Belum Ditentukan'}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: FORM TAMBAH / EDIT SISWA (NIS, NAMA, RFID, KELAS, JK)        */}
      {/* ===================================================================== */}
      {isStudentModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsStudentModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-700 to-slate-900 p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">
                  Formulir Data Siswa
                </span>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields: NIS, NAMA, RFID, KELAS, JENIS KELAMIN */}
            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 text-xs font-bold text-slate-700">
              {/* Field 1: NIS */}
              <div className="space-y-1">
                <label className="block uppercase tracking-wider">
                  1. Nomor Induk Siswa (NIS) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 20260191"
                  value={studentForm.nis}
                  onChange={(e) => setStudentForm({ ...studentForm, nis: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              {/* Field 2: Nama Siswa */}
              <div className="space-y-1">
                <label className="block uppercase tracking-wider">
                  2. Nama Lengkap Siswa <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ahmad Fauzi Rahman"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600 uppercase"
                />
              </div>

              {/* Field 3: No RFID Card */}
              <div className="space-y-1">
                <label className="block uppercase tracking-wider">
                  3. Nomor Kartu RFID (UID) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: E2809901"
                    value={studentForm.rfidUid}
                    onChange={(e) => setStudentForm({ ...studentForm, rfidUid: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-black text-emerald-800 focus:bg-white focus:outline-hidden focus:border-emerald-600 uppercase"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold uppercase">
                    Tempel Kartu / Ketik
                  </div>
                </div>
              </div>

              {/* Field 4: Kelas */}
              <div className="space-y-1">
                <label className="block uppercase tracking-wider">
                  4. Rombongan Belajar (Kelas) <span className="text-rose-600">*</span>
                </label>
                <select
                  value={studentForm.className}
                  disabled={isGuru}
                  onChange={(e) => setStudentForm({ ...studentForm, className: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  {accessibleClasses.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 5: Jenis Kelamin (L / P) */}
              <div className="space-y-1.5">
                <label className="block uppercase tracking-wider">
                  5. Jenis Kelamin <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center space-x-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      studentForm.gender === 'L'
                        ? 'bg-blue-50 border-blue-400 text-blue-900 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-600 font-semibold'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      checked={studentForm.gender === 'L'}
                      onChange={() => setStudentForm({ ...studentForm, gender: 'L' })}
                      className="hidden"
                    />
                    <span>👨 Laki-laki (L)</span>
                  </label>

                  <label
                    className={`flex items-center space-x-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      studentForm.gender === 'P'
                        ? 'bg-pink-50 border-pink-400 text-pink-900 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-600 font-semibold'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      checked={studentForm.gender === 'P'}
                      onChange={() => setStudentForm({ ...studentForm, gender: 'P' })}
                      className="hidden"
                    />
                    <span>👩 Perempuan (P)</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-black uppercase tracking-wider text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-700/20 active:scale-98 transition-all cursor-pointer"
                >
                  {editingStudent ? 'Simpan Perubahan' : 'Tambah Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: IMPORT DATA SISWA EXCEL DENGAN VALIDASI & PREVIEW            */}
      {/* ===================================================================== */}
      {isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsImportModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-emerald-700 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">
                  Batch Data Import
                </span>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  Import Data Siswa dari Excel
                </h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* File Upload Box */}
              <div className="p-6 border-2 border-dashed border-emerald-500/40 rounded-2xl bg-emerald-50/40 text-center space-y-3">
                <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto animate-bounce" />
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase">
                    Pilih File Excel (.xlsx, .xls)
                  </h4>
                  <p className="text-slate-500 font-medium mt-0.5">
                    Pastikan kolom file: <strong>NIS, NAMA, RFID, KELAS, JENIS KELAMIN</strong>
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="excel-file-input"
                  />
                  <label
                    htmlFor="excel-file-input"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-700/20 cursor-pointer transition-all active:scale-98 inline-block"
                  >
                    PILIH FILE EXCEL
                  </label>
                  <button
                    type="button"
                    onClick={downloadStudentExcelTemplate}
                    className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold uppercase tracking-wider text-xs cursor-pointer transition-colors"
                  >
                    DOWNLOAD TEMPLATE
                  </button>
                </div>

                {importFileName && (
                  <div className="text-emerald-800 font-mono font-bold bg-white inline-block px-3 py-1 rounded-lg border border-emerald-200 mt-2">
                    📁 {importFileName}
                  </div>
                )}
              </div>

              {/* Parsing State */}
              {isParsingExcel && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-bold text-slate-700">Sedang memvalidasi baris data Excel...</p>
                </div>
              )}

              {/* Validation Summary & Preview */}
              {importResult && (
                <div className="space-y-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                      <div className="text-[10px] font-black uppercase text-slate-400">Total Baris</div>
                      <div className="text-xl font-black text-slate-900 mt-0.5">{importResult.totalRows}</div>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                      <div className="text-[10px] font-black uppercase text-emerald-700">Data Valid</div>
                      <div className="text-xl font-black text-emerald-700 mt-0.5">{importResult.validRows.length}</div>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-center">
                      <div className="text-[10px] font-black uppercase text-rose-700">Error / Duplikat</div>
                      <div className="text-xl font-black text-rose-700 mt-0.5">{importResult.errorRows.length}</div>
                    </div>
                  </div>

                  {/* Errors List if any */}
                  {importResult.errorRows.length > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                      <div className="flex items-center space-x-2 text-rose-800 font-black">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>Peringatan Error / Duplikasi ({importResult.errorRows.length} Baris):</span>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-[11px] text-rose-700 pr-1">
                        {importResult.errorRows.map((err, idx) => (
                          <div key={idx} className="bg-white/80 p-2 rounded-lg border border-rose-100">
                            {err.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Valid Rows Preview Table */}
                  {importResult.validRows.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-black text-slate-900 uppercase tracking-wider">
                        Pratinjau Data Valid ({importResult.validRows.length} Siswa Siap Diimpor):
                      </h5>
                      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-100 font-black text-slate-700 uppercase">
                            <tr>
                              <th className="p-2">NIS</th>
                              <th className="p-2">Nama</th>
                              <th className="p-2 font-mono">RFID</th>
                              <th className="p-2">Kelas</th>
                              <th className="p-2 text-center">L/P</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold">
                            {importResult.validRows.slice(0, 50).map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-2 font-mono">{row.nis}</td>
                                <td className="p-2 font-bold uppercase">{row.name}</td>
                                <td className="p-2 font-mono text-emerald-700">{row.rfidUid}</td>
                                <td className="p-2">{row.className}</td>
                                <td className="p-2 text-center">{row.gender}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!importResult || importResult.validRows.length === 0}
                onClick={handleCommitImport}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-700/20 active:scale-98 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                IMPORT {importResult?.validRows.length || 0} DATA SISWA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
