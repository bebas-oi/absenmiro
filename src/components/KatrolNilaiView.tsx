import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  TrendingUp,
  Save,
  FileSpreadsheet,
  Printer,
  Download,
  Upload,
  ClipboardPaste,
  RotateCcw,
  Sparkles,
  Trash2,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  Users,
  Award,
  BookOpen,
  X,
  FolderOpen,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { GradeKatrolSheet, KatrolMethod } from '../types';
import { computeKatrolGrades, formatScoreDisplay, parseScoreInput } from '../utils/katrolNilai';
import { buildOfficialKopHtml, downloadF4PortraitPdf, printHtmlDocument } from '../utils/printUtils';
import {
  showConfirmDialog,
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from '../utils/alerts';

const CUSTOM_KATROL_SUBJECTS_KEY = 'mi_rowosari_custom_katrol_subjects_v1';

const DEFAULT_MI_SUBJECTS = [
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'IPAS (Ilmu Pengetahuan Alam & Sosial)',
  "Al-Qur'an Hadis",
  'Akidah Akhlak',
  'Fikih',
  'Sejarah Kebudayaan Islam (SKI)',
  'Bahasa Arab',
  'Bahasa Jawa',
  'Bahasa Inggris',
  'PJOK',
  'TIK Komputer',
  'Seni Budaya & Prakarya',
];

function getGradeNumberFromClass(cls: { name: string; grade: number | string }): number {
  const m = (cls.name || '').match(/\d+/);
  if (m) return parseInt(m[0], 10);
  return Number(cls.grade) || 0;
}

const ASSESSMENT_TYPES = [
  'Nilai SAS',
  'Nilai Sumatif (Harian)',
] as const;

type KatrolCategory = (typeof ASSESSMENT_TYPES)[number];

const normalizeAssessmentCategory = (val?: string): KatrolCategory => {
  const lower = (val || '').toLowerCase();
  if (lower.includes('sumatif') && lower.includes('harian')) {
    return 'Nilai Sumatif (Harian)';
  }
  if (lower.includes('harian') || lower.includes('uh') || lower.includes('sumatif')) {
    return 'Nilai Sumatif (Harian)';
  }
  return 'Nilai SAS';
};

const KATROL_METHODS: {
  id: KatrolMethod;
  title: string;
  formulaDesc: string;
  badge: string;
}[] = [
  {
    id: 'linear',
    title: 'Linear / Proporsional',
    formulaDesc: 'TargetMin + ((Asli − Min) / (Max − Min)) × (TargetMax − TargetMin)',
    badge: 'Direkomendasikan',
  },
  {
    id: 'kkm_floor',
    title: 'Batas Minimal KKM',
    formulaDesc: 'Nilai < TargetMin dinaikkan menjadi TargetMin, nilai lain tetap',
    badge: 'Tuntas Minimal',
  },
  {
    id: 'add_points',
    title: 'Tambah Poin Tetap (+)',
    formulaDesc: 'Semua nilai ditambah poin tetap (maksimal TargetMax)',
    badge: 'Bonus Poin',
  },
  {
    id: 'percentage',
    title: 'Persentase (+%)',
    formulaDesc: 'Semua nilai dinaikkan sesuai persentase (maksimal TargetMax)',
    badge: 'Skala Persen',
  },
  {
    id: 'sqrt',
    title: 'Kurva Akar (√)',
    formulaDesc: '10 × √Nilai — mengangkat nilai bawah lebih besar tanpa melewati 100',
    badge: 'Kurva Halus',
  },
];

function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatShortIndoDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

export const KatrolNilaiView: React.FC = () => {
  const {
    classes,
    accessibleClasses,
    accessibleStudents,
    accessibleExamSchedules,
    accessibleGradeKatrolSheets,
    teachers,
    settings,
    currentUser,
    isGuru,
    addClass,
    saveGradeKatrolSheet,
    deleteGradeKatrolSheet,
  } = useApp();

  const initialResolvedClass =
    (isGuru &&
      currentUser?.assignedClass &&
      accessibleClasses.some((c) => c.name === currentUser.assignedClass) &&
      currentUser.assignedClass) ||
    accessibleClasses[0]?.name ||
    'Kelas 1A';

  const [activeSheetId, setActiveSheetId] = useState<string>('');
  const [className, setClassName] = useState<string>(initialResolvedClass);
  const [assessmentType, setAssessmentType] = useState<KatrolCategory>('Nilai SAS');
  const [topicLabel, setTopicLabel] = useState<string>('');
  const [savedFilterMode, setSavedFilterMode] = useState<'active' | 'all'>('active');
  const [subject, setSubject] = useState<string>(
    currentUser?.assignedSubject || 'Matematika'
  );
  const [customSubjectMode, setCustomSubjectMode] = useState<boolean>(false);
  const [customSubjects, setCustomSubjects] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_KATROL_SUBJECTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState<boolean>(false);
  const [newClassForm, setNewClassForm] = useState({
    name: '',
    grade: 4,
    academicYear: settings.activeAcademicYear || '2026/2027',
    homeroomTeacherId: '',
  });
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState<boolean>(false);
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [semester, setSemester] = useState<string>(settings.activeSemester || 'Ganjil');
  const [academicYear, setAcademicYear] = useState<string>(
    settings.activeAcademicYear || '2026/2027'
  );
  const [kkm, setKkm] = useState<number>(75);
  const [method, setMethod] = useState<KatrolMethod>('linear');
  const [targetMin, setTargetMin] = useState<number>(75);
  const [targetMax, setTargetMax] = useState<number>(96);
  const [addPoints, setAddPoints] = useState<number>(10);
  const [boostPercent, setBoostPercent] = useState<number>(15);
  const [roundDigits, setRoundDigits] = useState<0 | 1 | 2>(0);
  const [neverLowerThanRaw, setNeverLowerThanRaw] = useState<boolean>(true);
  const [teacherName, setTeacherName] = useState<string>('');
  const [teacherNip, setTeacherNip] = useState<string>('');
  const [printDate, setPrintDate] = useState<string>(
    () => new Date().toLocaleDateString('en-CA')
  );

  const [rawScores, setRawScores] = useState<Record<string, string>>({});
  const [manualOverrides, setManualOverrides] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rawInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_KATROL_SUBJECTS_KEY, JSON.stringify(customSubjects));
    } catch {
      // ignore storage quota errors
    }
  }, [customSubjects]);

  // Sync valid default class if accessibleClasses loads asynchronously
  useEffect(() => {
    if (
      accessibleClasses.length > 0 &&
      !accessibleClasses.some((c) => c.name === className)
    ) {
      setClassName(accessibleClasses[0].name);
    }
  }, [accessibleClasses, className]);

  // Auto-fill mapel teacher (e.g. PJOK / TIK Komputer) or homeroom teacher when class/subject changes
  useEffect(() => {
    if (activeSheetId) return;
    const cleanSubj = subject.trim().toLowerCase();
    const mapelTeacher = teachers.find(
      (t) =>
        t.assignedSubject &&
        (t.assignedSubject.toLowerCase() === cleanSubj ||
          cleanSubj.includes(t.assignedSubject.toLowerCase()))
    );
    if (isGuru && currentUser?.assignedSubject && currentUser.name) {
      const matchedCurrent = teachers.find(
        (t) => t.name.toLowerCase() === currentUser.name.toLowerCase()
      );
      setTeacherName(currentUser.name);
      setTeacherNip(
        matchedCurrent?.nip && matchedCurrent.nip !== '-' ? matchedCurrent.nip : ''
      );
      return;
    }
    if (mapelTeacher) {
      setTeacherName(mapelTeacher.name);
      setTeacherNip(mapelTeacher.nip && mapelTeacher.nip !== '-' ? mapelTeacher.nip : '');
      return;
    }

    const matchedClass = accessibleClasses.find((c) => c.name === className);
    const matchedTeacher =
      (matchedClass?.homeroomTeacherId &&
        teachers.find((t) => t.id === matchedClass.homeroomTeacherId)) ||
      teachers.find((t) => (t.assignedClass || '').toLowerCase() === className.toLowerCase());

    if (matchedTeacher) {
      setTeacherName(matchedTeacher.name);
      setTeacherNip(matchedTeacher.nip && matchedTeacher.nip !== '-' ? matchedTeacher.nip : '');
    } else if (isGuru && currentUser?.name) {
      setTeacherName(currentUser.name);
      setTeacherNip('');
    }
  }, [className, subject, accessibleClasses, teachers, activeSheetId, isGuru, currentUser]);

  // Subjects available for the selected class (from examSchedules + custom + MI standard list)
  const subjectOptions = useMemo(() => {
    const scheduleSubjects = accessibleExamSchedules
      .filter((s) => s.className === className)
      .map((s) => s.subject.trim())
      .filter(Boolean);
    const merged = Array.from(
      new Set([...customSubjects, ...scheduleSubjects, ...DEFAULT_MI_SUBJECTS])
    );
    if (subject && !merged.includes(subject)) {
      merged.unshift(subject);
    }
    return merged;
  }, [accessibleExamSchedules, className, subject, customSubjects]);

  // Quick class switcher classes filtered by subject coverage (PJOK 1-6, TIK Komputer 4-6)
  const subjectCoverageClasses = useMemo(() => {
    const lowerSubj = subject.trim().toLowerCase();
    if (lowerSubj.includes('tik') || lowerSubj.includes('komputer')) {
      return accessibleClasses.filter((c) => {
        const g = getGradeNumberFromClass(c);
        return g >= 4 && g <= 6;
      });
    }
    if (lowerSubj.includes('pjok') || lowerSubj.includes('olahraga')) {
      return accessibleClasses.filter((c) => {
        const g = getGradeNumberFromClass(c);
        return g >= 1 && g <= 6;
      });
    }
    return accessibleClasses;
  }, [subject, accessibleClasses]);

  const handleAddClassFromKatrol = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newClassForm.name.trim();
    if (!cleanName) {
      showWarningToast('Nama kelas wajib diisi!');
      return;
    }
    if (classes.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) {
      showWarningToast(`Kelas "${cleanName}" sudah ada di daftar rombel!`);
      setClassName(
        classes.find((c) => c.name.toLowerCase() === cleanName.toLowerCase())?.name || cleanName
      );
      setIsAddClassModalOpen(false);
      return;
    }
    const created = addClass({
      name: cleanName,
      grade: newClassForm.grade,
      academicYear: newClassForm.academicYear.trim() || settings.activeAcademicYear || '2026/2027',
      homeroomTeacherId: newClassForm.homeroomTeacherId || undefined,
    });
    setActiveSheetId('');
    setClassName(created.name);
    setNewClassForm({
      name: '',
      grade: 4,
      academicYear: settings.activeAcademicYear || '2026/2027',
      homeroomTeacherId: '',
    });
    setIsAddClassModalOpen(false);
  };

  const handleAddSubjectFromKatrol = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSubj = newSubjectName.trim();
    if (!cleanSubj) {
      showWarningToast('Nama mata pelajaran wajib diisi!');
      return;
    }
    setCustomSubjects((prev) =>
      prev.some((s) => s.toLowerCase() === cleanSubj.toLowerCase()) ? prev : [cleanSubj, ...prev]
    );
    setCustomSubjectMode(false);
    setActiveSheetId('');
    setSubject(cleanSubj);
    setNewSubjectName('');
    setIsAddSubjectModalOpen(false);
    showSuccessToast(`Mata pelajaran "${cleanSubj}" ditambahkan ke Katrol Nilai.`);
  };

  // Active students in selected class sorted A-Z
  const classStudents = useMemo(() => {
    return [...accessibleStudents]
      .filter((s) => s.className === className && s.status === 'aktif')
      .sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));
  }, [accessibleStudents, className]);

  // Real-time katrol calculation
  const { rows, stats, entries } = useMemo(
    () =>
      computeKatrolGrades({
        students: classStudents,
        rawScores,
        manualOverrides,
        notes,
        method,
        kkm,
        targetMin,
        targetMax,
        addPoints,
        boostPercent,
        roundDigits,
        neverLowerThanRaw,
      }),
    [
      classStudents,
      rawScores,
      manualOverrides,
      notes,
      method,
      kkm,
      targetMin,
      targetMax,
      addPoints,
      boostPercent,
      roundDigits,
      neverLowerThanRaw,
    ]
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.student.name.toLowerCase().includes(q) ||
        (r.student.nis || '').toLowerCase().includes(q) ||
        (r.student.nisn || '').toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  const sasCount = useMemo(
    () =>
      accessibleGradeKatrolSheets.filter(
        (s) => normalizeAssessmentCategory(s.assessmentType) === 'Nilai SAS'
      ).length,
    [accessibleGradeKatrolSheets]
  );

  const sumatifCount = useMemo(
    () =>
      accessibleGradeKatrolSheets.filter(
        (s) => normalizeAssessmentCategory(s.assessmentType) === 'Nilai Sumatif (Harian)'
      ).length,
    [accessibleGradeKatrolSheets]
  );

  const displayedSavedSheets = useMemo(() => {
    if (savedFilterMode === 'all') return accessibleGradeKatrolSheets;
    return accessibleGradeKatrolSheets.filter(
      (s) => normalizeAssessmentCategory(s.assessmentType) === assessmentType
    );
  }, [accessibleGradeKatrolSheets, assessmentType, savedFilterMode]);

  const applySheetToEditor = (sheet: GradeKatrolSheet) => {
    setActiveSheetId(sheet.id);
    setClassName(sheet.className);
    setAssessmentType(normalizeAssessmentCategory(sheet.assessmentType));
    setTopicLabel(sheet.topicLabel || '');
    setSubject(sheet.subject);
    setCustomSubjectMode(false);
    setSemester(sheet.semester || settings.activeSemester || 'Ganjil');
    setAcademicYear(sheet.academicYear || settings.activeAcademicYear || '2026/2027');
    setKkm(sheet.kkm ?? 75);
    setMethod(sheet.method || 'linear');
    setTargetMin(sheet.targetMin ?? 75);
    setTargetMax(sheet.targetMax ?? 96);
    setAddPoints(sheet.addPoints ?? 10);
    setBoostPercent(sheet.boostPercent ?? 15);
    setRoundDigits((sheet.roundDigits as 0 | 1 | 2) ?? 0);
    setNeverLowerThanRaw(sheet.neverLowerThanRaw ?? true);
    setTeacherName(sheet.teacherName || '');
    setTeacherNip(sheet.teacherNip || '');
    setPrintDate(sheet.printDate || new Date().toLocaleDateString('en-CA'));

    const nextRaw: Record<string, string> = {};
    const nextOverride: Record<string, string> = {};
    const nextNotes: Record<string, string> = {};
    (sheet.entries || []).forEach((entry) => {
      if (entry.rawScore !== null && entry.rawScore !== undefined) {
        nextRaw[entry.studentId] = String(entry.rawScore);
      }
      if (entry.manualOverride !== null && entry.manualOverride !== undefined) {
        nextOverride[entry.studentId] = String(entry.manualOverride);
      }
      if (entry.note) {
        nextNotes[entry.studentId] = entry.note;
      }
    });
    setRawScores(nextRaw);
    setManualOverrides(nextOverride);
    setNotes(nextNotes);
  };

  const handleLoadSheet = (sheet: GradeKatrolSheet) => {
    applySheetToEditor(sheet);
    showSuccessToast(
      `Memuat ${normalizeAssessmentCategory(sheet.assessmentType)}: ${sheet.subject} (${sheet.className}).`
    );
  };

  const handleSwitchAssessmentCategory = (nextCat: KatrolCategory) => {
    if (nextCat === assessmentType) return;
    setAssessmentType(nextCat);

    const existing = accessibleGradeKatrolSheets.find(
      (s) =>
        s.className === className &&
        s.subject.toLowerCase() === subject.trim().toLowerCase() &&
        normalizeAssessmentCategory(s.assessmentType) === nextCat
    );

    if (existing) {
      applySheetToEditor(existing);
      showSuccessToast(`Memuat data tersimpan ${nextCat}: ${existing.subject} (${existing.className}).`);
    } else {
      setActiveSheetId('');
      setTopicLabel('');
      setRawScores({});
      setManualOverrides({});
      setNotes({});
    }
  };

  const handleNewSheet = () => {
    setActiveSheetId('');
    setTopicLabel('');
    setRawScores({});
    setManualOverrides({});
    setNotes({});
    showSuccessToast(`Siap membuat lembar baru untuk ${assessmentType}.`);
  };

  const handleSaveSheet = async () => {
    const cleanSubject = subject.trim();
    if (!cleanSubject) {
      showWarningToast('Nama mata pelajaran wajib diisi!');
      return;
    }
    if (!className) {
      showWarningToast('Pilih kelas terlebih dahulu!');
      return;
    }
    setIsSaving(true);
    try {
      const topicSlug =
        assessmentType === 'Nilai Sumatif (Harian)' && topicLabel.trim()
          ? `_${topicLabel.trim()}`
          : '';
      const slug = `${className}_${assessmentType}_${cleanSubject}${topicSlug}_${semester}_${academicYear}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 120);
      const id = activeSheetId || `katrol_${slug}`;
      const sheet: GradeKatrolSheet = {
        id,
        className,
        subject: cleanSubject,
        assessmentType,
        topicLabel: assessmentType === 'Nilai Sumatif (Harian)' ? topicLabel.trim() : '',
        semester,
        academicYear,
        kkm: Number(kkm) || 75,
        method,
        targetMin: Number(targetMin) || 0,
        targetMax: Number(targetMax) || 100,
        addPoints: Number(addPoints) || 0,
        boostPercent: Number(boostPercent) || 0,
        roundDigits,
        neverLowerThanRaw,
        teacherName: teacherName.trim() || '-',
        teacherNip: teacherNip.trim(),
        printDate,
        entries,
        updatedAt: Date.now(),
      };
      await saveGradeKatrolSheet(sheet);
      setActiveSheetId(id);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSavedSheet = async (sheet: GradeKatrolSheet, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await showConfirmDialog(
      'Hapus Lembar Katrol Nilai?',
      `Hapus data katrol ${sheet.subject} (${sheet.className} - ${sheet.assessmentType})?`
    );
    if (!ok) return;
    await deleteGradeKatrolSheet(sheet.id);
    if (activeSheetId === sheet.id) {
      setActiveSheetId('');
    }
  };

  const handleFillSampleScores = () => {
    if (classStudents.length === 0) {
      showWarningToast('Tidak ada siswa aktif di kelas ini.');
      return;
    }
    const next: Record<string, string> = {};
    classStudents.forEach((st, idx) => {
      // Deterministic varied sample raw scores 52..92
      const val = 52 + ((idx * 13 + 7) % 41);
      next[st.id] = String(val);
    });
    setRawScores(next);
    setManualOverrides({});
    showSuccessToast(`Contoh nilai murni diisi untuk ${classStudents.length} siswa.`);
  };

  const handleResetScores = async () => {
    const ok = await showConfirmDialog(
      'Reset Semua Nilai?',
      `Kosongkan seluruh input nilai murni dan koreksi manual di ${className}?`
    );
    if (!ok) return;
    setRawScores({});
    setManualOverrides({});
    setNotes({});
    showSuccessToast('Input nilai telah dikosongkan.');
  };

  // Paste scores from Excel/Sheets (line-by-line)
  const parsedPasteList = useMemo(() => {
    return pasteText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        // If tab-separated (e.g. "Nama\t75"), pick last numeric token
        const parts = line.split(/[\t,;]+/).map((p) => p.trim());
        const candidate = parts.length > 1 ? parts[parts.length - 1] : parts[0];
        return parseScoreInput(candidate);
      });
  }, [pasteText]);

  const handleApplyPaste = () => {
    if (parsedPasteList.length === 0) {
      showWarningToast('Tempel daftar nilai terlebih dahulu.');
      return;
    }
    const nextRaw = { ...rawScores };
    let applied = 0;
    classStudents.forEach((st, idx) => {
      if (idx < parsedPasteList.length && parsedPasteList[idx] !== null) {
        nextRaw[st.id] = String(parsedPasteList[idx]);
        applied += 1;
      }
    });
    setRawScores(nextRaw);
    setIsPasteModalOpen(false);
    setPasteText('');
    showSuccessToast(`${applied} nilai berhasil ditempel ke daftar siswa (urut A–Z).`);
  };

  // Import Excel (.xlsx / .csv)
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });

      if (jsonRows.length === 0) {
        showWarningToast('File Excel kosong.');
        return;
      }

      const nextRaw = { ...rawScores };
      let matchedCount = 0;

      const findField = (row: Record<string, unknown>, candidates: string[]): string => {
        const keys = Object.keys(row);
        for (const cand of candidates) {
          const foundKey = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cand));
          if (foundKey !== undefined && String(row[foundKey]).trim() !== '') {
            return String(row[foundKey]).trim();
          }
        }
        return '';
      };

      jsonRows.forEach((row, rowIdx) => {
        const scoreStr = findField(row, ['nilaimurni', 'nilaiasli', 'nilai', 'score', 'angka']);
        const parsedScore = parseScoreInput(scoreStr);
        if (parsedScore === null) return;

        const nisnVal = findField(row, ['nisn']);
        const nisVal = findField(row, ['nis']);
        const nameVal = findField(row, ['nama', 'student', 'siswa']);

        let targetStudent = classStudents.find(
          (st) =>
            (nisnVal && st.nisn && st.nisn.trim() === nisnVal) ||
            (nisVal && st.nis.trim() === nisVal) ||
            (nameVal && st.name.trim().toLowerCase() === nameVal.toLowerCase())
        );

        if (!targetStudent && !nisnVal && !nisVal && !nameVal && rowIdx < classStudents.length) {
          targetStudent = classStudents[rowIdx];
        }

        if (targetStudent) {
          nextRaw[targetStudent.id] = String(parsedScore);
          matchedCount += 1;
        }
      });

      if (matchedCount === 0) {
        showWarningToast(
          'Tidak ada nilai yang cocok. Pastikan kolom Excel memiliki header "Nama" / "NISN" / "Nilai".'
        );
        return;
      }

      setRawScores(nextRaw);
      showSuccessToast(`Berhasil mengimpor ${matchedCount} nilai siswa dari Excel.`);
    } catch (err) {
      console.error('Excel import error:', err);
      showErrorToast('Gagal membaca file Excel. Pastikan format .xlsx/.xls/.csv valid.');
    }
  };

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    if (rows.length === 0) {
      showWarningToast('Tidak ada data siswa untuk diekspor.');
      return;
    }

    const methodObj = KATROL_METHODS.find((m) => m.id === method);
    const topicDisplay =
      assessmentType === 'Nilai Sumatif (Harian)' && topicLabel.trim()
        ? ` (${topicLabel.trim()})`
        : '';
    const sheetRows: (string | number)[][] = [
      [`DAFTAR KATROL ${assessmentType.toUpperCase()} - MI ISLAMIYAH ROWOSARI`],
      [`Kelas: ${className}`, `Mapel: ${subject}${topicDisplay}`, `Kategori: ${assessmentType}`],
      [`Semester: ${semester}`, `Tahun Ajaran: ${academicYear}`, `KKM: ${kkm}`],
      [
        `Metode: ${methodObj?.title || method}`,
        `Rentang Target: ${targetMin} - ${targetMax}`,
        `Guru: ${teacherName || '-'}`,
      ],
      [],
      [
        'No',
        'NISN',
        'NIS',
        'Nama Siswa',
        'L/P',
        'Nilai Murni',
        'Selisih',
        'Nilai Katrol',
        'Status KKM',
        'Predikat',
        'Catatan',
      ],
      ...rows.map((r, idx) => [
        idx + 1,
        r.student.nisn || '-',
        r.student.nis || '-',
        r.student.name,
        r.student.gender,
        r.rawScore !== null ? r.rawScore : '',
        r.diff !== null ? (r.diff >= 0 ? `+${r.diff}` : r.diff) : '',
        r.finalScore !== null ? r.finalScore : '',
        r.finalScore === null ? '-' : r.isPassedFinal ? 'TUNTAS' : 'BELUM TUNTAS',
        r.predicate,
        r.note || (r.manualOverride !== null ? 'Penyesuaian Manual' : ''),
      ]),
      [],
      [
        '',
        '',
        '',
        'RATA-RATA KELAS',
        '',
        stats.rawAvg ?? '-',
        stats.avgGain !== null ? `+${stats.avgGain}` : '-',
        stats.finalAvg ?? '-',
        `Tuntas: ${stats.finalPassedCount}/${stats.gradedCount} (${stats.finalPassRate}%)`,
        '',
        '',
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 14 },
      { wch: 12 },
      { wch: 32 },
      { wch: 5 },
      { wch: 13 },
      { wch: 10 },
      { wch: 13 },
      { wch: 15 },
      { wch: 10 },
      { wch: 22 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Katrol Nilai');
    const safeFileName = `Katrol-${assessmentType}-${className}-${subject}`
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-');
    XLSX.writeFile(wb, `${safeFileName}.xlsx`);
    showSuccessToast(`File Excel Katrol ${assessmentType} berhasil diunduh.`);
  };

  // Build Print / PDF HTML (F4 Portrait 215 x 330 mm)
  const buildKatrolPrintHtml = (): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const methodLabel = KATROL_METHODS.find((m) => m.id === method)?.title || method;
    const formattedDate = formatShortIndoDate(printDate);

    const tableRows =
      rows.length > 0
        ? rows
            .map((r, idx) => {
              const rawText = formatScoreDisplay(r.rawScore, roundDigits);
              const finalText = formatScoreDisplay(r.finalScore, roundDigits);
              const diffText =
                r.diff === null ? '-' : r.diff > 0 ? `+${formatScoreDisplay(r.diff, roundDigits)}` : formatScoreDisplay(r.diff, roundDigits);
              const statusText =
                r.finalScore === null
                  ? '-'
                  : r.isPassedFinal
                    ? 'TUNTAS'
                    : 'BELUM';
              return `
                <tr>
                  <td style="text-align:center;">${idx + 1}</td>
                  <td style="text-align:center;font-family:monospace;">${escapeHtml(r.student.nisn || r.student.nis || '-')}</td>
                  <td style="font-weight:bold;text-transform:uppercase;">${escapeHtml(r.student.name)}</td>
                  <td style="text-align:center;">${escapeHtml(r.student.gender)}</td>
                  <td style="text-align:center;">${escapeHtml(rawText)}</td>
                  <td style="text-align:center;">${escapeHtml(diffText)}</td>
                  <td style="text-align:center;font-weight:bold;">${escapeHtml(finalText)}</td>
                  <td style="text-align:center;font-weight:bold;">${escapeHtml(statusText)}</td>
                  <td style="text-align:center;font-weight:bold;">${escapeHtml(r.predicate)}</td>
                </tr>
              `;
            })
            .join('')
        : '<tr><td colspan="9" style="text-align:center;padding:14px;">Belum ada siswa aktif pada kelas ini.</td></tr>';

    return `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <base href="${origin}/" />
        <title>HASIL KATROL NILAI - ${escapeHtml(className.toUpperCase())} - ${escapeHtml(subject.toUpperCase())}</title>
        <style>
          @page {
            size: 215mm 330mm;
            margin: 10mm 12mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000000;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 10.5pt;
          }
          .sub-doc-page {
            width: 100%;
            background: #ffffff;
          }
          .doc-title {
            text-align: center;
            margin: 4px 0 10px 0;
          }
          .doc-title h2 {
            margin: 0;
            font-size: 13pt;
            font-weight: bold;
            text-transform: uppercase;
            text-decoration: underline;
          }
          .doc-title p {
            margin: 2px 0 0 0;
            font-size: 10pt;
            font-weight: bold;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 18px;
            border: 1px solid #000000;
            padding: 7px 10px;
            margin-bottom: 10px;
            font-size: 9.5pt;
            background: #ffffff;
          }
          .meta-row {
            display: flex;
            gap: 6px;
          }
          .meta-label {
            width: 115px;
            font-weight: bold;
            flex-shrink: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          th, td {
            border: 1px solid #000000;
            padding: 4px 6px;
            font-size: 9.5pt;
          }
          th {
            background: #065f46 !important;
            color: #ffffff !important;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
          }
          .summary-bar {
            display: flex;
            justify-content: space-between;
            border: 1px solid #000000;
            padding: 6px 10px;
            font-size: 9.5pt;
            margin-bottom: 14px;
            background: #ffffff;
          }
          .signs {
            display: flex;
            justify-content: space-between;
            padding: 0 18px;
            margin-top: 14px;
            font-size: 12pt;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .sign-box {
            width: 245px;
            text-align: center;
          }
          .sign-space {
            height: 54px;
          }
        </style>
      </head>
      <body>
        <div class="sub-doc-page">
          ${buildOfficialKopHtml(origin, { compact: true })}
          <div class="doc-title">
            <h2>DAFTAR HASIL KATROL ${escapeHtml(assessmentType.toUpperCase())}</h2>
            <p>${escapeHtml(assessmentType === 'Nilai SAS' ? 'SUMATIF AKHIR SEMESTER (SAS)' : topicLabel.trim() ? `SUMATIF HARIAN: ${topicLabel.trim().toUpperCase()}` : 'SUMATIF HARIAN / LINGKUP MATERI')} &bull; SEMESTER ${escapeHtml(semester.toUpperCase())} &bull; TAHUN AJARAN ${escapeHtml(academicYear)}</p>
          </div>
          <div class="meta-grid">
            <div class="meta-row"><span class="meta-label">Kelas / Rombel</span><span>: ${escapeHtml(className)}</span></div>
            <div class="meta-row"><span class="meta-label">KKM / KKTP</span><span>: ${kkm}</span></div>
            <div class="meta-row"><span class="meta-label">Mata Pelajaran</span><span>: ${escapeHtml(subject)}</span></div>
            <div class="meta-row"><span class="meta-label">Metode Katrol</span><span>: ${escapeHtml(methodLabel)}</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:30px;">No</th>
                <th style="width:92px;">NISN / NIS</th>
                <th>Nama Peserta Didik</th>
                <th style="width:34px;">L/P</th>
                <th style="width:58px;">Murni</th>
                <th style="width:52px;">Selisih</th>
                <th style="width:62px;">Katrol</th>
                <th style="width:68px;">Status</th>
                <th style="width:52px;">Pred.</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="summary-bar">
            <div><strong>Rata-Rata Murni:</strong> ${stats.rawAvg ?? '-'} &rarr; <strong>Katrol:</strong> ${stats.finalAvg ?? '-'}</div>
            <div><strong>Min/Max Murni:</strong> ${stats.rawMin ?? '-'}/${stats.rawMax ?? '-'} &rarr; <strong>Katrol:</strong> ${stats.finalMin ?? '-'}/${stats.finalMax ?? '-'}</div>
            <div><strong>Tuntas KKM:</strong> ${stats.finalPassedCount}/${stats.gradedCount} (${stats.finalPassRate}%)</div>
          </div>
          <div class="signs">
            <div class="sign-box">
              <p style="margin:0;">Mengetahui,</p>
              <p style="margin:2px 0 0 0;font-weight:bold;">Kepala Madrasah</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(settings.headmaster || '-')}</p>
              ${settings.headmasterNip ? `<p style="margin:2px 0 0 0;">NIP. ${escapeHtml(settings.headmasterNip)}</p>` : ''}
            </div>
            <div class="sign-box">
              <p style="margin:0;">Rowosari, ${escapeHtml(formattedDate)}</p>
              <p style="margin:2px 0 0 0;font-weight:bold;">Guru Pengampu / Wali Kelas</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(teacherName || '.............................')}</p>
              ${teacherNip ? `<p style="margin:2px 0 0 0;">NIP. ${escapeHtml(teacherNip)}</p>` : ''}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintF4 = () => {
    printHtmlDocument(buildKatrolPrintHtml());
  };

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      const html = buildKatrolPrintHtml();
      const safeFileName = `Katrol-${assessmentType}-${className}-${subject}.pdf`
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/-+/g, '-');
      const pages = await downloadF4PortraitPdf(html, safeFileName);
      showSuccessToast(`PDF Katrol ${assessmentType} berhasil diunduh (${pages} halaman F4).`);
    } catch (err) {
      console.error('Katrol PDF error:', err);
      showErrorToast('Gagal membuat PDF. Coba gunakan tombol Cetak F4.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Keyboard navigation in table (Enter / ArrowDown / ArrowUp jumps between students)
  const handleRawKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, visibleIdx: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRow = filteredRows[visibleIdx + 1];
      if (nextRow) {
        rawInputRefs.current[nextRow.student.id]?.focus();
        rawInputRefs.current[nextRow.student.id]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = filteredRows[visibleIdx - 1];
      if (prevRow) {
        rawInputRefs.current[prevRow.student.id]?.focus();
        rawInputRefs.current[prevRow.student.id]?.select();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2 uppercase">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            <span>Katrol Nilai Siswa MI Islamiyah Rowosari</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Konversi & penyesuaian nilai murni siswa secara proporsional terhadap KKM dengan laporan siap cetak F4 & Excel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSaveSheet}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-700/20 flex items-center space-x-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Data'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black uppercase tracking-wider text-xs flex items-center space-x-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrintF4}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider text-xs flex items-center space-x-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Cetak F4</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-black uppercase tracking-wider text-xs flex items-center space-x-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloadingPdf ? 'Membuat PDF...' : 'Unduh PDF'}</span>
          </button>
        </div>
      </div>

      {/* Two Katrol Categories Switcher: Nilai SAS & Nilai Sumatif (Harian) */}
      <div className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleSwitchAssessmentCategory('Nilai SAS')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              assessmentType === 'Nilai SAS'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                : 'bg-slate-50 hover:bg-emerald-50 text-slate-800 border-slate-200'
            }`}
          >
            <div>
              <div className="text-sm font-black uppercase tracking-tight">
                1. Katrol Nilai SAS
              </div>
              <div
                className={`text-[11px] font-semibold mt-0.5 ${
                  assessmentType === 'Nilai SAS' ? 'text-emerald-100' : 'text-slate-500'
                }`}
              >
                Sumatif Akhir Semester (Ujian Akhir Semester)
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-black shrink-0 ${
                assessmentType === 'Nilai SAS'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {sasCount} Tersimpan
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchAssessmentCategory('Nilai Sumatif (Harian)')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              assessmentType === 'Nilai Sumatif (Harian)'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                : 'bg-slate-50 hover:bg-emerald-50 text-slate-800 border-slate-200'
            }`}
          >
            <div>
              <div className="text-sm font-black uppercase tracking-tight">
                2. Katrol Nilai Sumatif (Harian)
              </div>
              <div
                className={`text-[11px] font-semibold mt-0.5 ${
                  assessmentType === 'Nilai Sumatif (Harian)'
                    ? 'text-emerald-100'
                    : 'text-slate-500'
                }`}
              >
                Penilaian Harian / Sumatif Lingkup Materi
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-black shrink-0 ${
                assessmentType === 'Nilai Sumatif (Harian)'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {sumatifCount} Tersimpan
            </span>
          </button>
        </div>
      </div>

      {/* Saved Katrol Sheets Quick Switcher */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-slate-700">
            <FolderOpen className="w-4 h-4 text-emerald-600" />
            <span>
              Data Tersimpan {savedFilterMode === 'active' ? `(${assessmentType})` : '(Semua)'} —{' '}
              {displayedSavedSheets.length}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 text-[10px] font-black uppercase">
              <button
                type="button"
                onClick={() => setSavedFilterMode('active')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                  savedFilterMode === 'active'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                {assessmentType}
              </button>
              <button
                type="button"
                onClick={() => setSavedFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                  savedFilterMode === 'all'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Semua ({accessibleGradeKatrolSheets.length})
              </button>
            </div>
            <button
              type="button"
              onClick={handleNewSheet}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-black uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Lembar Baru</span>
            </button>
          </div>
        </div>

        {displayedSavedSheets.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium">
            Belum ada data {assessmentType} tersimpan. Input nilai di bawah lalu klik{' '}
            <strong>Simpan Data</strong> agar tersinkron ke cloud.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {displayedSavedSheets.map((item) => {
              const isActive = item.id === activeSheetId;
              const catLabel = normalizeAssessmentCategory(item.assessmentType);
              return (
                <div
                  key={item.id}
                  onClick={() => handleLoadSheet(item)}
                  className={`group flex items-center space-x-2 px-3 py-2 rounded-2xl border text-xs cursor-pointer transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 hover:bg-emerald-50 text-slate-800 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div>
                    <div className="font-black leading-tight">
                      {item.subject} &bull; {item.className}
                    </div>
                    <div
                      className={`text-[10px] font-semibold ${
                        isActive ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
                      {catLabel}
                      {item.topicLabel ? ` (${item.topicLabel})` : ''} &bull; KKM {item.kkm} &bull;{' '}
                      {item.entries?.filter((e) => e.rawScore !== null).length || 0} Siswa
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSavedSheet(item, e)}
                    title="Hapus lembar tersimpan"
                    className={`p-1 rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? 'text-emerald-100 hover:bg-emerald-700 hover:text-white'
                        : 'text-slate-400 hover:bg-rose-100 hover:text-rose-700'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Config Grid: Identitas & Rumus */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Identitas Kelas & Mapel */}
        <div className="xl:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Identitas Kelas & Penilaian</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                  Kelas / Rombel
                </label>
                {(!isGuru || Boolean(currentUser?.assignedSubject)) && (
                  <button
                    type="button"
                    onClick={() => setIsAddClassModalOpen(true)}
                    className="text-[10px] font-black text-emerald-700 hover:underline flex items-center space-x-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah Kelas</span>
                  </button>
                )}
              </div>
              <select
                value={className}
                disabled={isGuru && accessibleClasses.length <= 1}
                onChange={(e) => {
                  setActiveSheetId('');
                  setClassName(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 disabled:bg-slate-100 cursor-pointer"
              >
                {accessibleClasses.map((cls) => (
                  <option key={cls.id} value={cls.name}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Jenis Nilai Katrol
              </label>
              <select
                value={assessmentType}
                onChange={(e) => handleSwitchAssessmentCategory(e.target.value as KatrolCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 cursor-pointer"
              >
                {ASSESSMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {assessmentType === 'Nilai Sumatif (Harian)' && (
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Keterangan Sumatif / Lingkup Materi{' '}
                <span className="text-slate-400 font-semibold">(Opsional)</span>
              </label>
              <input
                type="text"
                value={topicLabel}
                onChange={(e) => setTopicLabel(e.target.value)}
                placeholder="Contoh: Sumatif 1 / Bab 2 / Rata-rata Harian"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1 gap-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                  Mata Pelajaran
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAddSubjectModalOpen(true)}
                    className="text-[10px] font-black text-indigo-700 hover:underline flex items-center space-x-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah Mapel</span>
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setCustomSubjectMode((v) => !v)}
                    className="text-[10px] font-black text-emerald-700 hover:underline cursor-pointer"
                  >
                    {customSubjectMode ? 'Pilih Daftar' : 'Ketik Manual'}
                  </button>
                </div>
              </div>
              {customSubjectMode ? (
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Nama Mata Pelajaran..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900"
                />
              ) : (
                <select
                  value={subject}
                  onChange={(e) => {
                    setActiveSheetId('');
                    setSubject(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 cursor-pointer"
                >
                  {subjectOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                KKM / KKTP
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={kkm}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                  setKkm(val);
                  setTargetMin(val);
                }}
                className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl text-sm font-black text-emerald-900 text-center"
              />
            </div>
          </div>

          {/* Pintasan Guru Mapel & Cakupan Kelas */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                Pintasan Mapel Khusus & Kelas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCustomSubjectMode(false);
                    setActiveSheetId('');
                    setSubject('PJOK');
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase cursor-pointer border ${
                    subject.toLowerCase().includes('pjok')
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
                  }`}
                >
                  PJOK (Kls 1–6)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomSubjectMode(false);
                    setActiveSheetId('');
                    setSubject('TIK Komputer');
                    const grade4Plus = accessibleClasses.find((c) => getGradeNumberFromClass(c) >= 4);
                    if (grade4Plus && getGradeNumberFromClass({ name: className, grade: 0 }) < 4) {
                      setClassName(grade4Plus.name);
                    }
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase cursor-pointer border ${
                    subject.toLowerCase().includes('tik')
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400'
                  }`}
                >
                  TIK Komputer (Kls 4–6)
                </button>
              </div>
            </div>

            {subjectCoverageClasses.length > 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {subjectCoverageClasses.map((cls) => {
                  const isSelected = cls.name === className;
                  const hasSaved = accessibleGradeKatrolSheets.some(
                    (s) =>
                      s.className === cls.name &&
                      s.subject.toLowerCase() === subject.trim().toLowerCase() &&
                      normalizeAssessmentCategory(s.assessmentType) === assessmentType
                  );
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => {
                        const saved = accessibleGradeKatrolSheets.find(
                          (s) =>
                            s.className === cls.name &&
                            s.subject.toLowerCase() === subject.trim().toLowerCase() &&
                            normalizeAssessmentCategory(s.assessmentType) === assessmentType
                        );
                        if (saved) {
                          applySheetToEditor(saved);
                        } else {
                          setActiveSheetId('');
                          setClassName(cls.name);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all cursor-pointer flex items-center space-x-1 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : hasSaved
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <span>{cls.name}</span>
                      {hasSaved && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 cursor-pointer"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Tahun Ajaran
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Tanggal Cetak
              </label>
              <input
                type="date"
                value={printDate}
                onChange={(e) => setPrintDate(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Guru Pengampu / Wali Kelas
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Nama Guru..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                NIP / NUPTK Guru
              </label>
              <input
                type="text"
                value={teacherNip}
                onChange={(e) => setTeacherNip(e.target.value)}
                placeholder="Opsional"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Metode & Rumus Katrol */}
        <div className="xl:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-slate-800">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              <span>Metode & Rumus Katrol Nilai</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              Otomatis Real-Time
            </span>
          </div>

          {/* Method Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {KATROL_METHODS.map((m) => {
              const selected = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-slate-50 hover:bg-emerald-50/70 text-slate-800 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black leading-tight">{m.title}</span>
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0 ${
                        selected
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white text-slate-500 border border-slate-200'
                      }`}
                    >
                      {m.badge}
                    </span>
                  </div>
                  <p
                    className={`text-[10px] mt-1.5 leading-snug font-medium ${
                      selected ? 'text-emerald-100' : 'text-slate-500'
                    }`}
                  >
                    {m.formulaDesc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {(method === 'linear' || method === 'kkm_floor') && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                    Target Min
                  </label>
                  <button
                    type="button"
                    onClick={() => setTargetMin(kkm)}
                    className="text-[10px] font-black text-emerald-700 hover:underline cursor-pointer"
                  >
                    = KKM
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={targetMin}
                  onChange={(e) => setTargetMin(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 text-center"
                />
              </div>
            )}

            {method !== 'kkm_floor' && (
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Batas / Target Max
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={targetMax}
                  onChange={(e) => setTargetMax(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 text-center"
                />
              </div>
            )}

            {method === 'add_points' && (
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Tambah Poin (+)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={addPoints}
                  onChange={(e) => setAddPoints(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl text-sm font-black text-emerald-900 text-center"
                />
              </div>
            )}

            {method === 'percentage' && (
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Kenaikan (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={boostPercent}
                  onChange={(e) => setBoostPercent(Math.max(0, Math.min(200, Number(e.target.value) || 0)))}
                  className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl text-sm font-black text-emerald-900 text-center"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Pembulatan
              </label>
              <select
                value={roundDigits}
                onChange={(e) => setRoundDigits(Number(e.target.value) as 0 | 1 | 2)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 cursor-pointer"
              >
                <option value={0}>Bilangan Bulat</option>
                <option value={1}>1 Desimal (0.0)</option>
                <option value={2}>2 Desimal (0.00)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
            <label className="inline-flex items-center space-x-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={neverLowerThanRaw}
                onChange={(e) => setNeverLowerThanRaw(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
              />
              <span>Jangan pernah menurunkan nilai asli siswa</span>
            </label>

            <div className="text-[11px] text-slate-500 font-semibold">
              Rentang Murni Kelas:{' '}
              <strong className="text-slate-900">
                {stats.rawMin ?? '-'} s.d. {stats.rawMax ?? '-'}
              </strong>{' '}
              ({stats.gradedCount}/{stats.totalStudents} siswa dinilai)
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500">
            <span>Rata-Rata Kelas</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-sm font-bold text-slate-400 line-through">
              {stats.rawAvg ?? '-'}
            </span>
            <span className="text-2xl font-black text-slate-900">{stats.finalAvg ?? '-'}</span>
            {stats.avgGain !== null && stats.avgGain > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                +{stats.avgGain}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500">
            <span>Nilai Terendah</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-sm font-bold text-slate-400">{stats.rawMin ?? '-'}</span>
            <span className="text-xs font-bold text-slate-400">&rarr;</span>
            <span className="text-2xl font-black text-slate-900">{stats.finalMin ?? '-'}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500">
            <span>Nilai Tertinggi</span>
            <Award className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-sm font-bold text-slate-400">{stats.rawMax ?? '-'}</span>
            <span className="text-xs font-bold text-slate-400">&rarr;</span>
            <span className="text-2xl font-black text-slate-900">{stats.finalMax ?? '-'}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500">
            <span>Ketuntasan KKM (&ge; {kkm})</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-sm font-bold text-slate-400">{stats.rawPassRate}%</span>
            <span className="text-xs font-bold text-slate-400">&rarr;</span>
            <span className="text-2xl font-black text-emerald-700">{stats.finalPassRate}%</span>
            <span className="text-[11px] font-bold text-slate-500">
              ({stats.finalPassedCount}/{stats.gradedCount})
            </span>
          </div>
        </div>
      </div>

      {/* Main Grade Table */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama siswa / NISN / NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportExcel}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => setIsPasteModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Tempel dari Excel</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Excel</span>
            </button>

            <button
              type="button"
              onClick={handleFillSampleScores}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Isi Contoh</span>
            </button>

            <button
              type="button"
              onClick={handleResetScores}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 text-center w-10">No</th>
                <th className="py-3 px-3 w-28">NISN / NIS</th>
                <th className="py-3 px-3 min-w-[200px]">Nama Peserta Didik</th>
                <th className="py-3 px-2 text-center w-12">L/P</th>
                <th className="py-3 px-3 text-center w-32">Nilai Murni</th>
                <th className="py-3 px-2 text-center w-20">Selisih</th>
                <th className="py-3 px-3 text-center w-28">Nilai Katrol</th>
                <th className="py-3 px-3 text-center w-32">Koreksi Manual</th>
                <th className="py-3 px-3 text-center w-28">Status KKM</th>
                <th className="py-3 px-2 text-center w-20">Predikat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-semibold">
                    {classStudents.length === 0
                      ? `Belum ada siswa aktif di ${className}.`
                      : 'Tidak ada siswa yang cocok dengan pencarian.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const st = row.student;
                  const hasManual = row.manualOverride !== null;
                  return (
                    <tr key={st.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="py-2 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                        {st.nisn || st.nis || '-'}
                      </td>
                      <td className="py-2 px-3 font-black text-slate-900 uppercase">
                        {st.name}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-slate-600">
                        {st.gender}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          ref={(el) => {
                            rawInputRefs.current[st.id] = el;
                          }}
                          type="text"
                          inputMode="decimal"
                          placeholder="0-100"
                          value={rawScores[st.id] ?? ''}
                          onKeyDown={(e) => handleRawKeyDown(e, idx)}
                          onChange={(e) =>
                            setRawScores((prev) => ({
                              ...prev,
                              [st.id]: e.target.value,
                            }))
                          }
                          className="w-24 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        {row.diff === null ? (
                          <span className="text-slate-300 font-bold">-</span>
                        ) : row.diff > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px]">
                            +{formatScoreDisplay(row.diff, roundDigits)}
                          </span>
                        ) : row.diff < 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-black text-[11px]">
                            {formatScoreDisplay(row.diff, roundDigits)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">0</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-[52px] px-2.5 py-1 rounded-xl font-black text-sm ${
                            row.finalScore === null
                              ? 'bg-slate-100 text-slate-400'
                              : hasManual
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {formatScoreDisplay(row.finalScore, roundDigits)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Otomatis"
                            value={manualOverrides[st.id] ?? ''}
                            onChange={(e) =>
                              setManualOverrides((prev) => ({
                                ...prev,
                                [st.id]: e.target.value,
                              }))
                            }
                            className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 text-[11px] focus:bg-white focus:ring-2 focus:ring-amber-400 outline-hidden"
                            title="Opsional: isi angka jika ingin menimpa hasil rumus katrol untuk siswa ini"
                          />
                          {hasManual && (
                            <button
                              type="button"
                              onClick={() =>
                                setManualOverrides((prev) => {
                                  const next = { ...prev };
                                  delete next[st.id];
                                  return next;
                                })
                              }
                              title="Kembalikan ke hasil rumus"
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {row.finalScore === null ? (
                          <span className="text-slate-300 font-bold">-</span>
                        ) : row.isPassedFinal ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Tuntas</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase">
                            <AlertCircle className="w-3 h-3" />
                            <span>Belum</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-black ${
                            row.predicate === 'A'
                              ? 'bg-emerald-600 text-white'
                              : row.predicate === 'B'
                                ? 'bg-sky-100 text-sky-800'
                                : row.predicate === 'C'
                                  ? 'bg-amber-100 text-amber-800'
                                  : row.predicate === 'D'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-slate-100 text-slate-400'
                          }`}
                          title={row.predicateLabel}
                        >
                          {row.predicate}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paste Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wider flex items-center space-x-2">
                <ClipboardPaste className="w-4 h-4 text-emerald-400" />
                <span>Tempel Nilai Cepat dari Excel / Spreadsheet</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 font-semibold leading-relaxed">
                Salin kolom nilai dari Excel (urut abjad A–Z sesuai daftar siswa {className}), lalu tempel di bawah (satu baris satu nilai).
              </p>

              <textarea
                rows={7}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={'Contoh:\n68\n72\n58\n84'}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />

              {parsedPasteList.length > 0 && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 max-h-36 overflow-y-auto space-y-1">
                  <div className="font-black text-emerald-900 uppercase text-[10px]">
                    Pratinjau Pemetaan ({Math.min(parsedPasteList.length, classStudents.length)} dari{' '}
                    {classStudents.length} siswa):
                  </div>
                  {classStudents.slice(0, parsedPasteList.length).map((st, idx) => (
                    <div key={st.id} className="flex justify-between text-[11px] font-semibold">
                      <span className="text-slate-700 truncate pr-2">
                        {idx + 1}. {st.name}
                      </span>
                      <strong className="text-emerald-800 font-mono">
                        {parsedPasteList[idx] ?? 'Lewati'}
                      </strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-black uppercase cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyPaste}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase cursor-pointer"
                >
                  Terapkan Nilai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Kelas dari Katrol Nilai */}
      {isAddClassModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddClassModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wider flex items-center space-x-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Tambah Kelas Baru di Katrol Nilai</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddClassModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClassFromKatrol} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-black uppercase tracking-wider text-slate-700 mb-1">
                  Nama Rombel / Kelas *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kelas 4B atau Kelas 6B"
                  value={newClassForm.name}
                  onChange={(e) => setNewClassForm({ ...newClassForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black uppercase tracking-wider text-slate-700 mb-1">
                    Tingkat (1–6)
                  </label>
                  <select
                    value={newClassForm.grade}
                    onChange={(e) =>
                      setNewClassForm({ ...newClassForm, grade: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6].map((g) => (
                      <option key={g} value={g}>
                        Tingkat {g} (Kelas {g})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-black uppercase tracking-wider text-slate-700 mb-1">
                    Tahun Ajaran
                  </label>
                  <input
                    type="text"
                    value={newClassForm.academicYear}
                    onChange={(e) =>
                      setNewClassForm({ ...newClassForm, academicYear: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-black uppercase tracking-wider text-slate-700 mb-1">
                  Wali Kelas <span className="text-slate-400 font-semibold">(Opsional)</span>
                </label>
                <select
                  value={newClassForm.homeroomTeacherId}
                  onChange={(e) =>
                    setNewClassForm({ ...newClassForm, homeroomTeacherId: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 cursor-pointer"
                >
                  <option value="">-- Pilih Wali Kelas (Opsional) --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-black uppercase cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase cursor-pointer"
                >
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Mata Pelajaran */}
      {isAddSubjectModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddSubjectModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wider flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Tambah Mata Pelajaran Baru</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddSubjectModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubjectFromKatrol} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-black uppercase tracking-wider text-slate-700 mb-1">
                  Nama Mata Pelajaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: TIK Komputer, Bahasa Arab, Tahfidz..."
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-black uppercase cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase cursor-pointer"
                >
                  Tambah Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
