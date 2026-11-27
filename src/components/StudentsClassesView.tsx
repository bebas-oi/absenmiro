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
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ClassRoom, ImportPreviewResult, Student } from '../types';
import { showConfirmDialog, showSuccessToast, showWarningToast } from '../utils/alerts';
import { downloadStudentExcelTemplate, parseAndValidateStudentExcel } from '../utils/excelUtils';
import { convertGoogleDriveUrl, getAvatarFallback, getStudentPhotoSrc, isGoogleDriveUrl } from '../utils/googleDriveUtils';
import { buildOfficialKopHtml, printHtmlDocument } from '../utils/printUtils';

export const StudentsClassesView: React.FC = () => {
  const {
    students,
    classes,
    teachers,
    settings,
    currentUser,
    isGuru,
    accessibleStudents,
    accessibleClasses,
    addStudent,
    batchImportStudents,
    batchUpdateStudentPhotos,
    updateStudent,
    deleteStudent,
    batchDeleteStudents,
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
    photoUrl: '',
    status: 'aktif' as 'aktif' | 'nonaktif',
  });
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  // Excel Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [importResult, setImportResult] = useState<ImportPreviewResult | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Photo Upload Modal State
  type PhotoMatchReason = 'NIS' | 'NAMA_EKSAK' | 'NAMA_MIRIP' | 'MANUAL' | 'TIDAK_COCOK';
  interface BulkPhotoEntry {
    id: string;
    fileName: string;
    dataUrl: string;
    matchedStudentId: string;
    matchReason: PhotoMatchReason;
  }
  const [isBulkPhotoModalOpen, setIsBulkPhotoModalOpen] = useState(false);
  const [bulkPhotoClass, setBulkPhotoClass] = useState<string>(
    isGuru && currentUser?.assignedClass
      ? currentUser.assignedClass
      : accessibleClasses[0]?.name || 'all'
  );
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [bulkPhotoItems, setBulkPhotoItems] = useState<BulkPhotoEntry[]>([]);
  const bulkPhotoInputRef = useRef<HTMLInputElement>(null);

  // Class Form Modal State (Admin Only)
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [classForm, setClassForm] = useState({
    name: '',
    grade: '1',
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
      photoUrl: '',
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
      photoUrl: student.photoUrl || '',
      status: student.status,
    });
    setIsStudentModalOpen(true);
  };

  // Local Photo Upload (compressed to 300x300 JPEG)
  const handleLocalPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 320;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setStudentForm((prev) => ({ ...prev, photoUrl: compressedDataUrl }));
        showSuccessToast('Foto lokal berhasil dimuat!');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Save Student
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.nis.trim() || !studentForm.name.trim() || !studentForm.rfidUid.trim()) {
      showWarningToast('NIS, Nama Siswa, dan No RFID wajib diisi!');
      return;
    }

    const finalPhotoUrl = studentForm.photoUrl.trim()
      ? convertGoogleDriveUrl(studentForm.photoUrl.trim())
      : getAvatarFallback(studentForm.nis);

    if (editingStudent) {
      updateStudent({
        ...editingStudent,
        ...studentForm,
        photoUrl: finalPhotoUrl,
      });
    } else {
      addStudent({
        ...studentForm,
        photoUrl: finalPhotoUrl,
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

  // Bulk Delete Selected Students
  const handleDeleteSelectedStudents = async () => {
    if (selectedStudentIds.length === 0) {
      showWarningToast('Pilih minimal 1 siswa terlebih dahulu.');
      return;
    }
    const confirmed = await showConfirmDialog(
      `Hapus ${selectedStudentIds.length} Siswa Terpilih?`,
      `Sebanyak ${selectedStudentIds.length} data siswa yang dicentang akan dihapus permanen. Lanjutkan?`
    );
    if (confirmed) {
      batchDeleteStudents(selectedStudentIds);
      setSelectedStudentIds([]);
    }
  };

  // Class (Rombel) CRUD Handlers
  const handleOpenAddClass = () => {
    setEditingClass(null);
    setClassForm({
      name: '',
      grade: '1',
      academicYear: settings.activeAcademicYear || '2026/2027',
      homeroomTeacherId: '',
    });
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (cls: ClassRoom) => {
    const homeroom = teachers.find((t) => t.assignedClass === cls.name);
    setEditingClass(cls);
    setClassForm({
      name: cls.name,
      grade: String(cls.grade ?? '1'),
      academicYear: cls.academicYear || settings.activeAcademicYear || '2026/2027',
      homeroomTeacherId: cls.homeroomTeacherId || homeroom?.id || '',
    });
    setIsClassModalOpen(true);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = classForm.name.trim();
    const rawGrade = String(classForm.grade || '').trim();
    if (!cleanName) {
      showWarningToast('Nama rombel wajib diisi (contoh: Kelas 1A)!');
      return;
    }
    if (!rawGrade) {
      showWarningToast('Tingkat kelas wajib diisi!');
      return;
    }

    const normalizedGrade: number | string = /^\d+$/.test(rawGrade)
      ? Number(rawGrade)
      : rawGrade;

    const duplicate = classes.find(
      (c) =>
        c.name.toLowerCase() === cleanName.toLowerCase() &&
        (!editingClass || c.id !== editingClass.id)
    );
    if (duplicate) {
      showWarningToast(`Rombel "${cleanName}" sudah terdaftar.`);
      return;
    }

    if (editingClass) {
      const prevName = editingClass.name;
      updateClass({
        ...editingClass,
        name: cleanName,
        grade: normalizedGrade,
        academicYear: classForm.academicYear.trim() || '2026/2027',
        homeroomTeacherId: classForm.homeroomTeacherId || '',
      });
      if (selectedClassFilter === prevName) {
        setSelectedClassFilter(cleanName);
      }
    } else {
      addClass({
        name: cleanName,
        grade: normalizedGrade,
        academicYear: classForm.academicYear.trim() || '2026/2027',
        homeroomTeacherId: classForm.homeroomTeacherId || '',
      });
    }

    setIsClassModalOpen(false);
  };

  const handleDeleteClass = async (cls: ClassRoom) => {
    const classStudentCount = students.filter((s) => s.className === cls.name).length;
    const warningMsg =
      classStudentCount > 0
        ? `Rombel ${cls.name} masih memiliki ${classStudentCount} siswa terdaftar. Data siswa tidak ikut terhapus, namun Anda perlu memindahkan kelas siswa tersebut. Hapus rombel ${cls.name}?`
        : `Apakah Anda yakin ingin menghapus rombel ${cls.name}?`;

    const confirmed = await showConfirmDialog('Hapus Rombel Kelas?', warningMsg);
    if (confirmed) {
      deleteClass(cls.id);
      if (selectedClassFilter === cls.name) {
        setSelectedClassFilter('all');
      }
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

  // Print Student Roster per Class (including Homeroom Teacher / Wali Kelas)
  const handlePrintClassStudents = (targetClassName?: string) => {
    const chosenClass = targetClassName ?? selectedClassFilter;
    const escapeHtml = (val: string) =>
      String(val || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const classesToPrint: ClassRoom[] =
      chosenClass && chosenClass !== 'all'
        ? [
            accessibleClasses.find((c) => c.name === chosenClass) || {
              id: chosenClass,
              name: chosenClass,
              grade: Number(chosenClass.replace(/\D/g, '')) || 1,
              academicYear: settings.activeAcademicYear || '2026/2027',
            },
          ]
        : accessibleClasses.filter((c) =>
            accessibleStudents.some((s) => s.className === c.name)
          );

    if (classesToPrint.length === 0) {
      showWarningToast('Tidak ada data siswa yang dapat dicetak.');
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const todayFormatted = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());

    const pagesHtml = classesToPrint
      .map((cls, pageIdx) => {
        const homeroom =
          teachers.find((t) => t.id === cls.homeroomTeacherId) ||
          teachers.find((t) => t.assignedClass === cls.name);

        const classStudents = accessibleStudents
          .filter((s) => s.className === cls.name)
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name, 'id'));

        const maleCount = classStudents.filter((s) => s.gender === 'L').length;
        const femaleCount = classStudents.filter((s) => s.gender === 'P').length;
        const yearLabel = cls.academicYear || settings.activeAcademicYear || '2026/2027';
        const waliName = homeroom ? homeroom.name : 'Belum Ditentukan';
        const waliNip = homeroom?.nip && homeroom.nip !== '-' ? homeroom.nip : '-';

        const rowsHtml =
          classStudents.length > 0
            ? classStudents
                .map(
                  (s, idx) => `
                  <tr>
                    <td style="text-align:center;">${idx + 1}</td>
                    <td style="text-align:center;font-family:monospace;">${escapeHtml(s.nis)}</td>
                    <td style="text-align:center;font-family:monospace;">${escapeHtml(s.nisn || '-')}</td>
                    <td style="font-weight:700;text-transform:uppercase;">${escapeHtml(s.name)}</td>
                    <td style="text-align:center;font-weight:700;">${escapeHtml(s.gender)}</td>
                    <td style="text-align:center;font-family:monospace;">${escapeHtml(s.rfidUid)}</td>
                    <td style="text-align:center;text-transform:uppercase;font-weight:700;color:${
                      s.status === 'aktif' ? '#047857' : '#b91c1c'
                    };">${escapeHtml(s.status)}</td>
                  </tr>
                `
                )
                .join('')
            : '<tr><td colspan="7" style="text-align:center;padding:16px;color:#64748b;">Belum ada siswa terdaftar di rombel ini.</td></tr>';

        const pageBreakClass =
          pageIdx < classesToPrint.length - 1 ? 'class-page page-break' : 'class-page';

        return `
          <div class="${pageBreakClass}">
            ${buildOfficialKopHtml(origin)}

            <div class="doc-title">
              <h3>DAFTAR DATA SISWA</h3>
              <p>ROMBEL ${escapeHtml(cls.name.toUpperCase())} &bull; TAHUN AJARAN ${escapeHtml(yearLabel)}</p>
            </div>

            <table class="meta-table">
              <tr>
                <td class="m-label">Kelas / Rombel</td>
                <td class="m-colon">:</td>
                <td class="m-val"><strong>${escapeHtml(cls.name)}</strong> (Tingkat ${cls.grade})</td>
                <td class="m-label">Tahun Ajaran</td>
                <td class="m-colon">:</td>
                <td class="m-val">${escapeHtml(yearLabel)}</td>
              </tr>
              <tr>
                <td class="m-label">Wali Kelas</td>
                <td class="m-colon">:</td>
                <td class="m-val"><strong>${escapeHtml(waliName)}</strong></td>
                <td class="m-label">Jumlah Siswa</td>
                <td class="m-colon">:</td>
                <td class="m-val"><strong>${classStudents.length} Siswa</strong> (L: ${maleCount}, P: ${femaleCount})</td>
              </tr>
            </table>

            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:32px;">No</th>
                  <th style="width:82px;">NIS</th>
                  <th style="width:92px;">NISN</th>
                  <th>Nama Lengkap Siswa</th>
                  <th style="width:40px;">L/P</th>
                  <th style="width:92px;">No. RFID</th>
                  <th style="width:65px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="signs">
              <div class="sign-box">
                <p style="margin:0;">Mengetahui,</p>
                <p style="margin:2px 0 0 0;font-weight:700;">Kepala Madrasah</p>
                <div class="sign-space"></div>
                <p style="margin:0;font-weight:800;text-decoration:underline;">${escapeHtml(settings.headmaster)}</p>
                <p style="margin:2px 0 0 0;font-size:10px;color:#334155;">NIP. ${escapeHtml(settings.headmasterNip || '-')}</p>
              </div>
              <div class="sign-box">
                <p style="margin:0;">Rowosari, ${escapeHtml(todayFormatted)}</p>
                <p style="margin:2px 0 0 0;font-weight:700;">Wali ${escapeHtml(cls.name)}</p>
                <div class="sign-space"></div>
                <p style="margin:0;font-weight:800;text-decoration:underline;">${escapeHtml(
                  homeroom ? homeroom.name : '........................................'
                )}</p>
                <p style="margin:2px 0 0 0;font-size:10px;color:#334155;">NIP. ${escapeHtml(waliNip)}</p>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <base href="${origin}/" />
        <meta charset="UTF-8" />
        <title>Cetak Data Siswa ${
          chosenClass === 'all' ? 'Semua Kelas' : escapeHtml(chosenClass)
        } - MI Islamiyah Rowosari</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          *, *::before, *::after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            font-size: 11px;
            background: #ffffff;
          }
          .class-page {
            width: 100%;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
            margin-bottom: 24px;
          }
          @media print {
            .page-break { margin-bottom: 0; }
          }
          .doc-title {
            text-align: center;
            margin: 10px 0 12px 0;
          }
          .doc-title h3 {
            margin: 0;
            font-size: 14px;
            font-weight: 800;
            text-decoration: underline;
            text-transform: uppercase;
          }
          .doc-title p {
            margin: 3px 0 0 0;
            font-size: 11px;
            font-weight: 700;
            color: #047857;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
          }
          .meta-table td {
            padding: 5px 8px;
            font-size: 11px;
            border: 1px solid #e2e8f0;
          }
          .m-label { width: 100px; font-weight: 700; color: #334155; }
          .m-colon { width: 12px; text-align: center; font-weight: 700; }
          .m-val { color: #0f172a; }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .data-table th {
            background: #065f46 !important;
            color: #ffffff !important;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            padding: 7px 6px;
            border: 1px solid #065f46;
            text-align: center;
          }
          .data-table td {
            padding: 6px;
            border: 1px solid #cbd5e1;
            font-size: 10.5px;
          }
          .data-table tr:nth-child(even) td {
            background: #f8fafc !important;
          }
          .signs {
            display: flex;
            justify-content: space-between;
            padding: 0 32px;
            margin-top: 22px;
            page-break-inside: avoid;
            font-size: 11px;
          }
          .sign-box {
            text-align: center;
            width: 230px;
          }
          .sign-space {
            height: 54px;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
      </html>
    `;

    printHtmlDocument(html);
  };

  // =========================================================================
  // BULK PHOTO UPLOAD & AUTO MATCHING BY NIS / STUDENT NAME
  // =========================================================================
  const normalizePhotoText = (raw: string) =>
    raw
      .replace(/\.[^/.]+$/, '') // strip extension
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const stripLeadingOrderNumbers = (text: string) =>
    text.replace(/^\d{1,3}\s+/, '').trim();

  const matchPhotoFilenameToStudent = (
    fileName: string,
    candidates: Student[],
    alreadyAssignedIds: Set<string>
  ): { studentId: string; reason: PhotoMatchReason } => {
    const normalized = normalizePhotoText(fileName);
    const withoutOrderNum = stripLeadingOrderNumbers(normalized);
    const digitMatches = fileName.replace(/\.[^/.]+$/, '').match(/\d{4,}/g);
    const digitChunks: string[] = digitMatches ? Array.from(digitMatches) : [];

    // 1. Exact NIS or NISN match
    for (const s of candidates) {
      const nis = (s.nis || '').trim();
      const nisn = (s.nisn || '').trim();
      if (
        (nis && (digitChunks.includes(nis) || normalized.includes(nis.toLowerCase()))) ||
        (nisn && nisn.length >= 5 && (digitChunks.includes(nisn) || normalized.includes(nisn.toLowerCase())))
      ) {
        return { studentId: s.id, reason: 'NIS' };
      }
    }

    // 2. Exact full name match
    for (const s of candidates) {
      const sNorm = normalizePhotoText(s.name + '.tmp');
      if (sNorm && (normalized === sNorm || withoutOrderNum === sNorm)) {
        return { studentId: s.id, reason: 'NAMA_EKSAK' };
      }
    }

    // 3. Fuzzy token name match
    const fileTokens = withoutOrderNum.split(' ').filter((t) => t.length >= 2);
    let bestStudent: Student | null = null;
    let bestScore = 0;

    for (const s of candidates) {
      const nameTokens = normalizePhotoText(s.name + '.tmp')
        .split(' ')
        .filter((t) => t.length >= 2);
      if (nameTokens.length === 0 || fileTokens.length === 0) continue;

      let matchedCount = 0;
      for (const ft of fileTokens) {
        if (nameTokens.some((nt) => nt === ft || (ft.length >= 4 && nt.includes(ft)))) {
          matchedCount += 1;
        }
      }

      if (matchedCount === 0) continue;
      const fileRatio = matchedCount / fileTokens.length;
      const nameRatio = matchedCount / nameTokens.length;
      const isStrongMatch =
        matchedCount >= 2 ||
        (matchedCount === 1 && fileTokens.length === 1 && fileTokens[0].length >= 4 && nameRatio >= 0.3);

      if (isStrongMatch) {
        const score = matchedCount * 10 + fileRatio * 5 + nameRatio * 5 - (alreadyAssignedIds.has(s.id) ? 3 : 0);
        if (score > bestScore) {
          bestScore = score;
          bestStudent = s;
        }
      }
    }

    if (bestStudent) {
      return { studentId: bestStudent.id, reason: 'NAMA_MIRIP' };
    }

    return { studentId: '', reason: 'TIDAK_COCOK' };
  };

  const compressPhotoFileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Format gambar tidak didukung'));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 280;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });

  const getBulkCandidateStudents = (targetClass: string) => {
    if (targetClass === 'all') return accessibleStudents;
    return accessibleStudents.filter((s) => s.className === targetClass);
  };

  const handleOpenBulkPhotoModal = () => {
    const initialClass =
      isGuru && currentUser?.assignedClass
        ? currentUser.assignedClass
        : selectedClassFilter !== 'all'
        ? selectedClassFilter
        : accessibleClasses[0]?.name || 'all';
    setBulkPhotoClass(initialClass);
    setBulkPhotoItems([]);
    setIsBulkPhotoModalOpen(true);
  };

  const handleBulkClassChange = (nextClass: string) => {
    setBulkPhotoClass(nextClass);
    const candidates = getBulkCandidateStudents(nextClass);
    const assigned = new Set<string>();
    setBulkPhotoItems((prev) =>
      prev.map((item) => {
        const match = matchPhotoFilenameToStudent(item.fileName, candidates, assigned);
        if (match.studentId) assigned.add(match.studentId);
        return {
          ...item,
          matchedStudentId: match.studentId,
          matchReason: match.reason,
        };
      })
    );
  };

  const handleBulkPhotoFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    const files: File[] = fileList
      ? Array.from<File>(fileList).filter((f) => f.type.startsWith('image/'))
      : [];
    if (files.length === 0) {
      showWarningToast('Pilih file foto gambar (.jpg, .png, .webp).');
      return;
    }

    setIsProcessingPhotos(true);
    try {
      const candidates = getBulkCandidateStudents(bulkPhotoClass);
      const assigned = new Set<string>(
        bulkPhotoItems.map((b) => b.matchedStudentId).filter(Boolean)
      );

      const newItems: BulkPhotoEntry[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const dataUrl = await compressPhotoFileToDataUrl(file);
          const match = matchPhotoFilenameToStudent(file.name, candidates, assigned);
          if (match.studentId) assigned.add(match.studentId);
          newItems.push({
            id: `bp-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
            fileName: file.name,
            dataUrl,
            matchedStudentId: match.studentId,
            matchReason: match.reason,
          });
        } catch {
          // Skip unreadable image file
        }
      }

      setBulkPhotoItems((prev) => [...prev, ...newItems]);
    } finally {
      setIsProcessingPhotos(false);
      e.target.value = '';
    }
  };

  const handleCommitBulkPhotos = () => {
    const validUpdates = bulkPhotoItems
      .filter((item) => item.matchedStudentId)
      .map((item) => ({
        studentId: item.matchedStudentId,
        photoUrl: item.dataUrl,
      }));

    if (validUpdates.length === 0) {
      showWarningToast('Belum ada foto yang dipasangkan ke siswa. Pilih siswa target terlebih dahulu.');
      return;
    }

    batchUpdateStudentPhotos(validUpdates);
    setIsBulkPhotoModalOpen(false);
    setBulkPhotoItems([]);
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
              ? `Kelola data siswa ${currentUser?.assignedClass}`
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

              <button
                type="button"
                onClick={handleOpenBulkPhotoModal}
                className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer transition-colors"
                title="Upload banyak foto sekaligus & cocokkan otomatis berdasarkan NIS/Nama"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-700" />
                <span>UPLOAD FOTO MASSAL</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintClassStudents()}
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer transition-colors"
                title="Cetak daftar data siswa per kelas beserta nama wali kelas"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {selectedClassFilter === 'all'
                    ? 'CETAK DATA PER KELAS'
                    : `CETAK DATA ${selectedClassFilter.toUpperCase()}`}
                </span>
              </button>

              {!isGuru && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('classes')}
                  className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer transition-colors"
                  title="Tambah, Edit, atau Hapus Rombongan Belajar"
                >
                  <Building className="w-3.5 h-3.5 text-amber-700" />
                  <span>MENU ROMBEL ({classes.length})</span>
                </button>
              )}
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

            <div className="flex flex-wrap items-center gap-2 text-xs">
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
                type="button"
                onClick={handleDeleteSelectedStudents}
                disabled={selectedStudentIds.length === 0}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-wider shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>HAPUS TERPILIH ({selectedStudentIds.length})</span>
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
                                src={getStudentPhotoSrc(student.photoUrl, student.nis)}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = getAvatarFallback(student.nis);
                                }}
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
          {/* Toolbar Rombel */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                <Building className="w-4 h-4 text-emerald-600" />
                <span>Daftar Rombongan Belajar (Rombel)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tambah, ubah nama/tingkat rombel (otomatis memperbarui kelas siswa terkait), atau hapus rombel yang tidak dipakai.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveSubTab('students')}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Kembali ke Data Siswa
              </button>
              <button
                type="button"
                onClick={handleOpenAddClass}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-700/20 flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Rombel</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => {
              const classStudents = students.filter((s) => s.className === cls.name);
              const homeroom =
                teachers.find((t) => t.id === cls.homeroomTeacherId) ||
                teachers.find((t) => t.assignedClass === cls.name);

              return (
                <div
                  key={cls.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-colors"
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
                    <div className="min-w-10 px-2.5 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
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

                  <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClassFilter(cls.name);
                        setActiveSubTab('students');
                      }}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-black uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      Lihat Siswa
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintClassStudents(cls.name)}
                      className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase flex items-center space-x-1 cursor-pointer transition-colors"
                      title={`Cetak Data Siswa ${cls.name} & Wali Kelas`}
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cetak</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditClass(cls)}
                      className="py-2 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-black uppercase flex items-center space-x-1 cursor-pointer transition-colors"
                      title="Edit Rombel"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClass(cls)}
                      className="py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-black uppercase flex items-center cursor-pointer transition-colors"
                      title="Hapus Rombel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-700 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
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

            {/* Form Fields: NIS, NAMA, RFID, KELAS, JENIS KELAMIN, FOTO */}
            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 text-xs font-bold text-slate-700 overflow-y-auto flex-1">
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

              {/* Field 6: Foto Siswa (Google Drive / URL / Upload) */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="block uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>6. Foto Siswa (Google Drive / URL / Upload)</span>
                  </span>
                  {isGoogleDriveUrl(studentForm.photoUrl) && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 font-black">
                      Link Drive Terdeteksi
                    </span>
                  )}
                </label>

                <div className="flex items-start space-x-3">
                  <div className="w-16 h-20 rounded-xl bg-slate-100 border-2 border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      src={getStudentPhotoSrc(studentForm.photoUrl, studentForm.nis || 'preview')}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getAvatarFallback(studentForm.nis || 'preview');
                      }}
                      alt="Preview Foto"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="relative">
                      <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Tempel link Google Drive (drive.google.com/file/d/...)"
                        value={studentForm.photoUrl}
                        onChange={(e) => setStudentForm({ ...studentForm, photoUrl: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <input
                        ref={photoFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLocalPhotoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => photoFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center space-x-1.5 cursor-pointer transition-colors"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload File Foto</span>
                      </button>

                      {studentForm.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setStudentForm({ ...studentForm, photoUrl: '' })}
                          className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                        >
                          Hapus Foto
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 font-medium leading-snug">
                      Untuk Google Drive, pastikan akses file diatur ke{' '}
                      <strong className="text-slate-600">"Siapa saja yang memiliki link"</strong> agar foto tampil di Kartu & Kiosk Absen.
                    </p>
                  </div>
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

      {/* ===================================================================== */}
      {/* MODAL UPLOAD FOTO MASSAL OTOMATIS PER KELAS (COCOK NIS / NAMA)        */}
      {/* ===================================================================== */}
      {isBulkPhotoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBulkPhotoModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-800 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">
                  Pencocokan Cerdas Nama File &bull; Kartu RFID & Kartu ASAS/ASAT
                </span>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  Upload Foto Siswa Otomatis per Kelas
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkPhotoModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-blue-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Step 1: Pilih Kelas & Petunjuk Penamaan */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-blue-50/70 border border-blue-200 rounded-2xl p-4">
                <div className="md:col-span-5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-blue-900 mb-1.5">
                    1. Pilih Kelas Target:
                  </label>
                  <select
                    value={bulkPhotoClass}
                    disabled={isGuru}
                    onChange={(e) => handleBulkClassChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-blue-300 rounded-xl text-xs font-black text-slate-900 cursor-pointer disabled:bg-slate-100"
                  >
                    {!isGuru && (
                      <option value="all">Semua Kelas ({accessibleStudents.length} Siswa)</option>
                    )}
                    {accessibleClasses.map((cls) => {
                      const cnt = accessibleStudents.filter((s) => s.className === cls.name).length;
                      return (
                        <option key={cls.id} value={cls.name}>
                          {cls.name} ({cnt} Siswa)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="md:col-span-7 text-blue-950 space-y-1">
                  <div className="font-black uppercase text-[11px] flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Cara Pencocokan Otomatis:</span>
                  </div>
                  <p className="text-[11px] text-blue-900 leading-relaxed">
                    Beri nama file foto menggunakan <strong>NIS siswa</strong> (contoh:{' '}
                    <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-blue-200">
                      20260101.jpg
                    </code>
                    ) atau <strong>Nama siswa</strong> (contoh:{' '}
                    <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-blue-200">
                      Aisyah Zahira.png
                    </code>
                    ). Sistem otomatis memasangkan foto ke siswa yang sesuai dan menampilkannya pada{' '}
                    <strong>Kartu Siswa RFID</strong> & <strong>Kartu ASAS/ASAT</strong>.
                  </p>
                </div>
              </div>

              {/* Step 2: Multi-File Photo Picker */}
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-5 text-center space-y-2.5 bg-slate-50 transition-colors">
                <input
                  ref={bulkPhotoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleBulkPhotoFilesSelected}
                  className="hidden"
                />
                <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">
                    2. Pilih Banyak Foto Siswa Sekaligus
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Anda bisa memilih puluhan foto sekaligus (JPG, PNG, WEBP). Foto otomatis dikompres agar ringan.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isProcessingPhotos}
                  onClick={() => bulkPhotoInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-black uppercase tracking-wider text-xs shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isProcessingPhotos ? 'Memproses & Mencocokkan Foto...' : 'Pilih File Foto Sekaligus'}
                </button>
              </div>

              {/* Step 3: Matching Results & Override Table */}
              {bulkPhotoItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                        Total Foto: {bulkPhotoItems.length}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                        Cocok: {bulkPhotoItems.filter((i) => i.matchedStudentId).length}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                        Belum Cocok: {bulkPhotoItems.filter((i) => !i.matchedStudentId).length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBulkPhotoItems([])}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                    >
                      Kosongkan Daftar
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-600 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3 w-14 text-center">Foto</th>
                          <th className="py-2.5 px-3">Nama File</th>
                          <th className="py-2.5 px-3 w-28 text-center">Status</th>
                          <th className="py-2.5 px-3 min-w-[220px]">Pasangkan ke Siswa ({bulkPhotoClass === 'all' ? 'Semua' : bulkPhotoClass})</th>
                          <th className="py-2.5 px-3 w-12 text-center">Hapus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bulkPhotoItems.map((item) => {
                          const candidates = getBulkCandidateStudents(bulkPhotoClass);
                          return (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 text-center">
                                <img
                                  src={item.dataUrl}
                                  alt={item.fileName}
                                  className="w-10 h-12 object-cover rounded-lg border border-slate-200 mx-auto"
                                />
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] font-bold text-slate-700 break-all">
                                {item.fileName}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase ${
                                    item.matchReason === 'NIS'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : item.matchReason === 'NAMA_EKSAK'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : item.matchReason === 'NAMA_MIRIP'
                                      ? 'bg-blue-100 text-blue-800'
                                      : item.matchReason === 'MANUAL'
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {item.matchReason === 'NIS'
                                    ? 'Cocok NIS'
                                    : item.matchReason === 'NAMA_EKSAK'
                                    ? 'Cocok Nama'
                                    : item.matchReason === 'NAMA_MIRIP'
                                    ? 'Kemiripan Nama'
                                    : item.matchReason === 'MANUAL'
                                    ? 'Dipilih Manual'
                                    : 'Belum Cocok'}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={item.matchedStudentId}
                                  onChange={(e) => {
                                    const nextId = e.target.value;
                                    setBulkPhotoItems((prev) =>
                                      prev.map((row) =>
                                        row.id === item.id
                                          ? {
                                              ...row,
                                              matchedStudentId: nextId,
                                              matchReason: nextId ? 'MANUAL' : 'TIDAK_COCOK',
                                            }
                                          : row
                                      )
                                    );
                                  }}
                                  className={`w-full px-2.5 py-1.5 border rounded-xl text-[11px] font-bold cursor-pointer ${
                                    item.matchedStudentId
                                      ? 'bg-white border-emerald-300 text-slate-900'
                                      : 'bg-amber-50 border-amber-300 text-amber-900'
                                  }`}
                                >
                                  <option value="">-- Pilih Siswa Target --</option>
                                  {candidates.map((st) => (
                                    <option key={st.id} value={st.id}>
                                      {st.nis} — {st.name} ({st.className})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setBulkPhotoItems((prev) => prev.filter((r) => r.id !== item.id))
                                  }
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] font-bold text-slate-500">
                Foto tersimpan otomatis ke database & langsung muncul di Kartu Siswa serta Kartu ASAS/ASAT.
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBulkPhotoModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={bulkPhotoItems.filter((i) => i.matchedStudentId).length === 0}
                  onClick={handleCommitBulkPhotos}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-700/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Pasang & Simpan {bulkPhotoItems.filter((i) => i.matchedStudentId).length} Foto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ===================================================================== */}
      {/* MODAL TAMBAH / EDIT ROMBEL KELAS                                      */}
      {/* ===================================================================== */}
      {isClassModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsClassModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-br from-emerald-700 to-slate-900 p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">
                  Manajemen Rombel
                </span>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  {editingClass ? 'Edit Rombel Kelas' : 'Tambah Rombel Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsClassModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="p-6 space-y-4 text-xs font-bold text-slate-700">
              <div className="space-y-1">
                <label className="block uppercase tracking-wider">
                  Nama Rombel / Kelas <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kelas 1A, Kelas 2B"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block uppercase tracking-wider">
                    Tingkat / Kelas <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="custom-grade-suggestions"
                    placeholder="Contoh: 1, 2, 7, RA, Tahfidz"
                    value={classForm.grade}
                    onChange={(e) =>
                      setClassForm({ ...classForm, grade: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600"
                  />
                  <datalist id="custom-grade-suggestions">
                    {['1', '2', '3', '4', '5', '6', 'RA', '7', '8', '9', 'Tahfidz'].map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {['1', '2', '3', '4', '5', '6', 'RA'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setClassForm({ ...classForm, grade: preset })}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black border cursor-pointer transition-colors ${
                          String(classForm.grade).trim() === preset
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block uppercase tracking-wider">Tahun Ajaran</label>
                  <input
                    type="text"
                    placeholder="2026/2027"
                    value={classForm.academicYear}
                    onChange={(e) =>
                      setClassForm({ ...classForm, academicYear: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block uppercase tracking-wider">Wali Kelas (Opsional)</label>
                <select
                  value={classForm.homeroomTeacherId}
                  onChange={(e) =>
                    setClassForm({ ...classForm, homeroomTeacherId: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 cursor-pointer"
                >
                  <option value="">-- Belum Ditentukan --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.assignedClass})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-black uppercase tracking-wider text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-700/20 cursor-pointer"
                >
                  {editingClass ? 'Simpan Rombel' : 'Tambah Rombel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

