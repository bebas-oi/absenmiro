import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CalendarCheck,
  CheckSquare,
  ClipboardCheck,
  Clock,
  Copy,
  CreditCard,
  Edit2,
  FileCheck2,
  GraduationCap,
  Layers,
  MapPin,
  Plus,
  Printer,
  Save,
  Settings,
  Square,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ExamMetaConfig, ExamScheduleItem, ExamType, Student } from '../types';
import { getAvatarFallback, getStudentPhotoSrc } from '../utils/googleDriveUtils';
import { buildOfficialKopHtml, printHtmlDocument } from '../utils/printUtils';
import { showConfirmDialog, showWarningToast } from '../utils/alerts';
import { ExamInstrumentView } from './ExamInstrumentView';

const MI_LOGO_PATH = '/assets/aistudio/Logo_MI_Rowosari_2_b88f498f.png';

const MI_SUBJECT_SUGGESTIONS = [
  "Al-Qur'an Hadits",
  'Akidah Akhlak',
  'Fikih',
  'Sejarah Kebudayaan Islam',
  'Bahasa Arab',
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'IPAS',
  'Bahasa Inggris',
  'Bahasa Jawa',
  'Seni Budaya & Prakarya',
  'PJOK',
];

function getIndonesianDayName(dateStr: string): string {
  if (!dateStr) return 'Senin';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return 'Senin';
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(d);
}

function formatIndonesianShortDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

const formatDMY = (dateStr: string): string => { if (!dateStr) return '-'; const p = dateStr.split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : dateStr; };
const formatLongIndoDate = (dateStr: string): string => { if (!dateStr) return '-'; const p = dateStr.split('-').map(Number); if (p.length !== 3 || p.some(isNaN)) return dateStr; return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(p[0], p[1] - 1, p[2])); };

export const AsasAsatView: React.FC = () => {
  const {
    settings,
    currentUser,
    isGuru,
    accessibleStudents,
    accessibleClasses,
    accessibleExamSchedules,
    examConfigs,
    examInstruments,
    addExamSchedule,
    updateExamSchedule,
    deleteExamSchedule,
    copyExamSchedulesToClasses,
    updateExamConfig,
    updateExamInstrument,
  } = useApp();

  const [examType, setExamType] = useState<ExamType>('ASAS');
  const [subTab, setSubTab] = useState<'schedule' | 'cards' | 'instrument' | 'desk-numbers'>('schedule');

  // Schedule state
  const [selectedClass, setSelectedClass] = useState<string>(
    isGuru && currentUser?.assignedClass
      ? currentUser.assignedClass
      : accessibleClasses[0]?.name || 'Kelas 1A'
  );
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ExamScheduleItem | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    className: selectedClass,
    date: '2026-12-02',
    dayName: 'Rabu',
    timeStart: '07:30',
    timeEnd: '09:00',
    subject: "Al-Qur'an Hadits",
    room: 'Ruang 01',
    supervisor: '',
  });

  // Copy schedule modal state
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyTargetClasses, setCopyTargetClasses] = useState<string[]>([]);

  // Card Print state
  const activeConfig = examConfigs[examType];
  const [configDraft, setConfigDraft] = useState<ExamMetaConfig>(activeConfig);
  const [printMode, setPrintMode] = useState<'single' | 'class' | 'selected'>('single');
  const [printSides, setPrintSides] = useState<'both' | 'front'>('both');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    accessibleStudents[0]?.id || ''
  );
  const [selectedClassForCard, setSelectedClassForCard] = useState<string>(
    isGuru && currentUser?.assignedClass
      ? currentUser.assignedClass
      : accessibleClasses[0]?.name || 'Kelas 1A'
  );
  const [checkedStudentIds, setCheckedStudentIds] = useState<string[]>([]);

  // Sync draft config when switching ASAS <-> ASAT
  const handleSwitchExamType = (nextType: ExamType) => {
    setExamType(nextType);
    setConfigDraft(examConfigs[nextType]);
  };

  // Filtered & sorted schedules for current examType & selectedClass
  const classSchedules = useMemo(() => {
    return accessibleExamSchedules
      .filter((item) => item.examType === examType && item.className === selectedClass)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.timeStart.localeCompare(b.timeStart);
      });
  }, [accessibleExamSchedules, examType, selectedClass]);

  const examTitleFull =
    examType === 'ASAS'
      ? 'Asesmen Sumatif Akhir Semester (ASAS)'
      : 'Asesmen Sumatif Akhir Tahun (ASAT)';

  // Open Add Schedule Modal
  const handleOpenAddSchedule = () => {
    const defaultDate = examType === 'ASAS' ? '2026-12-02' : '2027-06-02';
    setEditingSchedule(null);
    setScheduleForm({
      className: selectedClass,
      date: defaultDate,
      dayName: getIndonesianDayName(defaultDate),
      timeStart: '07:30',
      timeEnd: '09:00',
      subject: '',
      room: configDraft.defaultRoom || 'Ruang 01',
      supervisor: '',
    });
    setIsScheduleModalOpen(true);
  };

  const handleOpenEditSchedule = (item: ExamScheduleItem) => {
    setEditingSchedule(item);
    setScheduleForm({
      className: item.className,
      date: item.date,
      dayName: item.dayName || getIndonesianDayName(item.date),
      timeStart: item.timeStart,
      timeEnd: item.timeEnd,
      subject: item.subject,
      room: item.room || '',
      supervisor: item.supervisor || '',
    });
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.subject.trim() || !scheduleForm.date) {
      showWarningToast('Tanggal dan Mata Pelajaran wajib diisi!');
      return;
    }

    const computedDay = scheduleForm.dayName.trim() || getIndonesianDayName(scheduleForm.date);

    if (editingSchedule) {
      updateExamSchedule({
        ...editingSchedule,
        ...scheduleForm,
        dayName: computedDay,
        examType,
      });
    } else {
      addExamSchedule({
        examType,
        className: scheduleForm.className,
        date: scheduleForm.date,
        dayName: computedDay,
        timeStart: scheduleForm.timeStart,
        timeEnd: scheduleForm.timeEnd,
        subject: scheduleForm.subject.trim(),
        room: scheduleForm.room.trim(),
        supervisor: scheduleForm.supervisor.trim(),
      });
    }
    setIsScheduleModalOpen(false);
  };

  const handleDeleteSchedule = async (item: ExamScheduleItem) => {
    const confirmed = await showConfirmDialog(
      'Hapus Jadwal Ujian?',
      `Hapus mata pelajaran ${item.subject} (${item.className}) pada ${formatIndonesianShortDate(item.date)}?`
    );
    if (confirmed) {
      deleteExamSchedule(item.id);
    }
  };

  const handleOpenCopyModal = () => {
    if (classSchedules.length === 0) {
      showWarningToast(`Jadwal ${examType} untuk ${selectedClass} masih kosong.`);
      return;
    }
    setCopyTargetClasses([]);
    setIsCopyModalOpen(true);
  };

  const handleCommitCopy = () => {
    if (copyTargetClasses.length === 0) {
      showWarningToast('Pilih minimal 1 kelas tujuan.');
      return;
    }
    copyExamSchedulesToClasses(examType, selectedClass, copyTargetClasses);
    setIsCopyModalOpen(false);
  };

  // Print Schedule for Selected Class (A4)
  const handlePrintClassSchedule = () => {
    if (classSchedules.length === 0) {
      showWarningToast(`Belum ada jadwal ${examType} untuk ${selectedClass}.`);
      return;
    }

    const rowsHtml = classSchedules
      .map(
        (item, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td><strong>${item.dayName || getIndonesianDayName(item.date)}</strong>, ${formatIndonesianShortDate(item.date)}</td>
        <td style="text-align:center; font-family:monospace; font-weight:bold;">${item.timeStart} - ${item.timeEnd}</td>
        <td style="font-weight:bold; text-transform:uppercase;">${item.subject}</td>
        <td style="text-align:center;">${item.room || configDraft.defaultRoom || '-'}</td>
        <td>${item.supervisor || '-'}</td>
      </tr>
    `
      )
      .join('');

    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <base href="${origin}/" />
        <title>Jadwal ${examType} ${selectedClass} - ${settings.schoolName}</title>
        <style>
          @page { size: A4 portrait; margin: 14mm; }
          *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 11px; }
          .kop { display: flex; align-items: center; justify-content: space-between; padding-bottom: 6px; gap: 14px; }
          .kop-logo { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .kop-spacer { width: 64px; flex-shrink: 0; }
          .kop-logo img { width: 100%; height: 100%; object-fit: contain; }
          .kop-text { flex: 1; text-align: center; line-height: 1.25; }
          .kop-text h4 { margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; }
          .kop-text h2 { margin: 2px 0; font-size: 16px; color: #065f46; text-transform: uppercase; }
          .kop-text p { margin: 0; font-size: 10px; color: #334155; }
          .kop-rule { border-top: 3px solid #0f172a; border-bottom: 1px solid #0f172a; height: 5px; margin: 2px 0 14px 0; }
          .title { text-align: center; margin: 12px 0 16px 0; }
          .title h3 { margin: 0; font-size: 14px; text-transform: uppercase; text-decoration: underline; }
          .title p { margin: 4px 0 0 0; font-size: 11px; font-weight: bold; color: #047857; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 11px; background: #f8fafc; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #065f46; color: #fff; padding: 8px 6px; border: 1px solid #065f46; font-size: 10px; text-transform: uppercase; }
          td { padding: 7px 6px; border: 1px solid #cbd5e1; font-size: 11px; }
          tr:nth-child(even) td { background: #f8fafc; }
          .signs { display: flex; justify-content: space-between; padding: 0 28px; margin-top: 24px; page-break-inside: avoid; }
          .sign-box { text-align: center; width: 260px; }
          .sign-space { height: 55px; }
        </style>
      </head>
      <body>
        ${buildOfficialKopHtml(origin)}

        <div class="title">
          <h3>JADWAL ${examTitleFull}</h3>
          <p>${selectedClass.toUpperCase()} • TAHUN AJARAN ${configDraft.academicYear} • SEMESTER ${configDraft.semester.toUpperCase()}</p>
        </div>

        <div class="meta">
          <div><strong>Kelas / Rombel:</strong> ${selectedClass}</div>
          <div><strong>Periode Pelaksanaan:</strong> ${configDraft.periodLabel}</div>
          <div><strong>Total Mapel:</strong> ${classSchedules.length} Mata Pelajaran</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:30px;">No</th>
              <th style="width:140px;">Hari / Tanggal</th>
              <th style="width:105px;">Waktu</th>
              <th>Mata Pelajaran</th>
              <th style="width:80px;">Ruang</th>
              <th style="width:150px;">Pengawas</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <div class="signs">
          <div class="sign-box">
            <p style="margin:0;">Mengetahui,</p>
            <p style="margin:2px 0 0 0; font-weight:bold;">Kepala Madrasah</p>
            <div class="sign-space"></div>
            <p style="margin:0; font-weight:bold; text-decoration:underline;">${settings.headmaster}</p>
            <p style="margin:2px 0 0 0; font-size:10px;">NIP. ${examInstruments[examType]?.headmasterNip || settings.headmasterNip}</p>
          </div>
          <div class="sign-box">
            <p style="margin:0;">Rowosari, ${formatLongIndoDate(configDraft.printDate || new Date().toLocaleDateString('en-CA'))}</p>
            <p style="margin:2px 0 0 0; font-weight:bold;">Ketua Panitia ${examType}</p>
            <div class="sign-space"></div>
            <p style="margin:0; font-weight:bold; text-decoration:underline;">${configDraft.committeeChair}</p>
            <p style="margin:2px 0 0 0; font-size:10px;">NIP. ${configDraft.committeeChairNip || '-'}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    printHtmlDocument(html);
  };

  // =========================================================================
  // DESK NUMBER PRINT & PREVIEW HELPERS (NOMOR MEJA ASAS & ASAT)
  // =========================================================================
  const [deskClass, setDeskClass] = useState<string>(
    isGuru && currentUser?.assignedClass
      ? currentUser.assignedClass
      : accessibleClasses[0]?.name || 'Kelas 1A'
  );

  const deskStudentsList = useMemo(() => {
    return [...accessibleStudents.filter(
      (s) => s.className === deskClass && s.status === 'aktif'
    )].sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));
  }, [accessibleStudents, deskClass]);

  const handlePrintDeskNumbers = () => {
    if (deskStudentsList.length === 0) {
      showWarningToast(`Tidak ada siswa aktif untuk ${deskClass}.`);
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const logoUrl = `${origin}${MI_LOGO_PATH}`;
    const roomName = getRoomForClass(deskClass);

    const pagesHtml: string[] = [];
    for (let i = 0; i < deskStudentsList.length; i += 6) {
      const chunk = deskStudentsList.slice(i, i + 6);
      const chunkCards = chunk
        .map((student, offset) => {
          const deskNo = i + offset + 1;
          const deskNoStr = String(deskNo).padStart(2, '0');
          const participantNo = getParticipantNumber(student, i + offset);

          return `
          <div class="desk-card">
            <div class="desk-kop">
              <div class="desk-logo">
                <img src="${logoUrl}" alt="Logo" />
              </div>
              <div class="desk-kop-text">
                <div class="school-sub">PANITIA ${examType} &bull; TA ${configDraft.academicYear}</div>
                <div class="school-name">${settings.schoolName}</div>
              </div>
            </div>
            
            <div class="desk-body">
              <div class="desk-number-box">
                <div class="desk-label">NOMOR MEJA UJIAN</div>
                <div class="desk-value">${deskNoStr}</div>
              </div>
              
              <div class="desk-student-info">
                <div class="info-row">
                  <span class="label">No Peserta</span>
                  <span class="val">: <strong>${participantNo}</strong></span>
                </div>
                <div class="info-row">
                  <span class="label">Nama Siswa</span>
                  <span class="val name">: <strong>${student.name}</strong></span>
                </div>
                <div class="info-row">
                  <span class="label">NISN</span>
                  <span class="val">: <strong>${student.nisn || student.nis || '-'}</strong></span>
                </div>
                <div class="info-row">
                  <span class="label">Kelas / Ruang</span>
                  <span class="val">: ${student.className} &bull; <strong>${roomName}</strong></span>
                </div>
              </div>
            </div>

            <div class="desk-footer">
              <span>${configDraft.periodLabel}</span>
              <span>${examType} ${configDraft.academicYear}</span>
            </div>
          </div>
        `;
        })
        .join('');

      const pageNum = Math.floor(i / 6) + 1;
      const totalPages = Math.ceil(deskStudentsList.length / 6);

      pagesHtml.push(`
        <div class="f4-page">
          <div class="f4-screen-label">Lembar Nomor Meja #${pageNum} dari ${totalPages} &bull; ${deskClass}</div>
          <div class="desk-grid">
            ${chunkCards}
          </div>
        </div>
      `);
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <base href="${origin}/" />
        <title>Cetak Nomor Meja ${examType} ${deskClass} - ${settings.schoolName}</title>
        <style>
          @page {
            size: 215mm 330mm;
            margin: 10mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 0;
            background: #e2e8f0;
            color: #0f172a;
          }
          .f4-page {
            width: 195mm;
            min-height: 306mm;
            margin: 10mm auto;
            background: #ffffff;
            padding: 8mm;
            box-shadow: 0 4px 20px rgba(15, 23, 42, 0.12);
            page-break-after: always;
            break-after: page;
          }
          .f4-screen-label {
            font-size: 10px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            text-align: center;
            margin-bottom: 6px;
          }
          .desk-grid {
            display: grid;
            grid-template-columns: repeat(2, 92mm);
            gap: 6mm 8mm;
            justify-content: center;
            align-content: start;
          }
          .desk-card {
            width: 92mm;
            height: 94mm;
            border: 2px dashed #0f172a;
            border-radius: 3.5mm;
            background: #ffffff;
            padding: 3.5mm 4mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .desk-kop {
            display: flex;
            align-items: center;
            gap: 2.5mm;
            border-bottom: 2px solid #065f46;
            padding-bottom: 2mm;
          }
          .desk-logo {
            width: 10mm;
            height: 10mm;
            flex-shrink: 0;
          }
          .desk-logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .desk-kop-text {
            flex: 1;
            text-align: center;
            line-height: 1.15;
          }
          .school-sub {
            font-size: 6.5pt;
            font-weight: 800;
            color: #047857;
            text-transform: uppercase;
          }
          .school-name {
            font-size: 9pt;
            font-weight: 900;
            color: #0f172a;
            text-transform: uppercase;
          }
          .desk-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 3mm;
            padding: 2mm 0;
          }
          .desk-number-box {
            text-align: center;
            border: 2.5px solid #065f46;
            background: #f0fdf4;
            border-radius: 2.5mm;
            padding: 2.5mm 6mm;
            width: 100%;
          }
          .desk-label {
            font-size: 7pt;
            font-weight: 900;
            color: #065f46;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            margin-bottom: 0.5mm;
          }
          .desk-value {
            font-size: 26pt;
            font-weight: 900;
            font-family: monospace;
            color: #065f46;
            line-height: 1;
          }
          .desk-student-info {
            width: 100%;
            font-size: 8.5pt;
            display: flex;
            flex-direction: column;
            gap: 1.2mm;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 2mm;
            padding: 2.5mm 3mm;
          }
          .info-row {
            display: flex;
            align-items: flex-start;
          }
          .info-row .label {
            width: 24mm;
            font-weight: 700;
            color: #475569;
            flex-shrink: 0;
          }
          .info-row .val {
            flex: 1;
            color: #0f172a;
          }
          .info-row .val.name {
            font-size: 9.5pt;
            text-transform: uppercase;
          }
          .desk-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 7pt;
            font-weight: 800;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 1.5mm;
            text-transform: uppercase;
          }
          @media print {
            body { background: #ffffff !important; }
            .f4-screen-label { display: none !important; }
            .f4-page {
              margin: 0 auto;
              box-shadow: none;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        ${pagesHtml.join('')}
      </body>
      </html>
    `;

    printHtmlDocument(fullHtml);
  };

  // =========================================================================
  // CARD PREVIEW & PRINTING HELPERS (KARTU PESERTA ASAS & ASAT)
  // =========================================================================
  const selectedStudent =
    accessibleStudents.find((s) => s.id === selectedStudentId) || accessibleStudents[0];

  const cardStudentsList = useMemo(() => {
    let list: Student[] = [];
    if (printMode === 'single') {
      list = selectedStudent ? [selectedStudent] : [];
    } else if (printMode === 'selected') {
      list = accessibleStudents.filter((s) => checkedStudentIds.includes(s.id));
    } else {
      list = accessibleStudents.filter(
        (s) => s.className === selectedClassForCard && s.status === 'aktif'
      );
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));
  }, [printMode, selectedStudent, accessibleStudents, checkedStudentIds, selectedClassForCard]);

  const getParticipantNumber = (student: Student, idx: number) => {
    const classCode = student.className.replace(/[^0-9A-Z]/gi, '').toUpperCase();
    const seq = String(idx + 1).padStart(3, '0');
    return `${configDraft.participantPrefix}-${classCode}-${seq}`;
  };

  const getRoomForClass = (className: string) => {
    const sched = accessibleExamSchedules.find(
      (item) => item.examType === examType && item.className === className && item.room
    );
    return sched?.room || configDraft.defaultRoom || 'Ruang 01';
  };

  const getClassScheduleSummary = (className: string) => {
    return accessibleExamSchedules
      .filter((item) => item.examType === examType && item.className === className)
      .sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.timeStart.localeCompare(b.timeStart)));
  };

  const getThemeColors = (theme: ExamMetaConfig['cardTheme']) => {
    switch (theme) {
      case 'navy':
        return {
          gradient: 'from-blue-900 via-indigo-900 to-slate-900',
          solidColor: '#1e3a8a',
          printHeader: 'linear-gradient(90deg, #1e3a8a 0%, #312e81 55%, #0f172a 100%)',
          accentColor: '#1e40af',
          badgeBg: 'bg-blue-700',
          borderAccent: 'border-blue-600',
          textAccent: 'text-blue-800',
        };
      case 'gold':
        return {
          gradient: 'from-amber-800 via-yellow-900 to-slate-900',
          solidColor: '#92400e',
          printHeader: 'linear-gradient(90deg, #92400e 0%, #713f12 55%, #0f172a 100%)',
          accentColor: '#b45309',
          badgeBg: 'bg-amber-700',
          borderAccent: 'border-amber-600',
          textAccent: 'text-amber-800',
        };
      case 'modern':
        return {
          gradient: 'from-slate-900 via-slate-800 to-zinc-900',
          solidColor: '#0f172a',
          printHeader: 'linear-gradient(90deg, #0f172a 0%, #1e293b 55%, #18181b 100%)',
          accentColor: '#1e293b',
          badgeBg: 'bg-slate-800',
          borderAccent: 'border-slate-700',
          textAccent: 'text-slate-800',
        };
      case 'emerald':
      default:
        return {
          gradient: 'from-emerald-800 via-teal-800 to-emerald-950',
          solidColor: '#065f46',
          printHeader: 'linear-gradient(90deg, #065f46 0%, #115e59 55%, #022c22 100%)',
          accentColor: '#047857',
          badgeBg: 'bg-emerald-700',
          borderAccent: 'border-emerald-600',
          textAccent: 'text-emerald-800',
        };
    }
  };

  const theme = getThemeColors(configDraft.cardTheme);

  const handleSaveCardConfig = () => {
    updateExamConfig(examType, configDraft);
    const currentInst = examInstruments[examType];
    if (currentInst) {
      updateExamInstrument(examType, {
        ...currentInst,
        periodLabel: configDraft.periodLabel || currentInst.periodLabel,
        committeeChair: configDraft.committeeChair || currentInst.committeeChair,
        committeeChairNip: configDraft.committeeChairNip || currentInst.committeeChairNip,
        skNumber: configDraft.skNumber || currentInst.skNumber,
        skDate: configDraft.skDate || currentInst.skDate,
      }, true);
    }
  };

  const handlePrintExamCards = () => {
    if (cardStudentsList.length === 0) {
      showWarningToast('Tidak ada siswa yang dipilih untuk dicetak kartunya.');
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const logoUrl = `${origin}${MI_LOGO_PATH}`;

    // Build individual card markup matching live preview 1:1
    const renderStudentCardHtml = (student: Student, idx: number) => {
      const participantNo = getParticipantNumber(student, idx);
      const roomName = getRoomForClass(student.className);
      const scheds = getClassScheduleSummary(student.className);

      const midIndex = Math.ceil(scheds.length / 2);
      const leftScheds = scheds.slice(0, midIndex);
      const rightScheds = scheds.slice(midIndex);
      const maxRowsPerCol = Math.max(leftScheds.length, rightScheds.length);
      const cardDensityStyle =
        maxRowsPerCol <= 6
          ? '--sched-fs: 6pt; --cell-pad: 0.65mm 0.5mm; --rules-title-fs: 6pt; --rules-fs: 5.5pt;'
          : maxRowsPerCol <= 8
            ? '--sched-fs: 6pt; --cell-pad: 0.5mm 0.6mm; --rules-title-fs: 5.7pt; --rules-fs: 5.2pt;'
            : maxRowsPerCol <= 10
              ? '--sched-fs: 5.5pt; --cell-pad: 0.42mm 0.55mm; --rules-title-fs: 5.2pt; --rules-fs: 4.7pt;'
              : '--sched-fs: 5pt; --cell-pad: 0.35mm 0.5mm; --rules-title-fs: 4.8pt; --rules-fs: 4.3pt;';

      const renderScheduleTable = (items: typeof scheds) => `
        <table>
          <thead>
            <tr>
              <th style="width: 42%;">Hari/Tgl</th>
              <th style="width: 20%;">Jam</th>
              <th>Mapel</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (sc) => `
                <tr>
                  <td style="white-space:nowrap;">${(sc.dayName || '').slice(0, 3)}, ${formatDMY(sc.date)}</td>
                  <td style="font-family:monospace; font-weight:700; white-space:nowrap;">${sc.timeStart}</td>
                  <td style="word-break:break-word;"><strong>${sc.subject}</strong></td>
                </tr>
              `
              )
              .join('')}
          </tbody>
        </table>
      `;

      const backContentHtml =
        configDraft.backMode === 'schedule'
          ? `
          <div class="back-header" style="color: ${theme.accentColor};">
            JADWAL ${examType} &bull; ${student.className.toUpperCase()}
          </div>
          <div class="back-schedule-wrap" style="${cardDensityStyle}">
            <div class="back-schedule ${rightScheds.length > 0 ? 'back-schedule-grid' : ''}">
              ${
                scheds.length === 0
                  ? `<div class="back-schedule-empty">Jadwal belum diatur untuk kelas ini</div>`
                  : rightScheds.length > 0
                    ? `${renderScheduleTable(leftScheds)}${renderScheduleTable(rightScheds)}`
                    : renderScheduleTable(leftScheds)
              }
            </div>
            <div class="back-rules-compact">
              <div class="back-rules-title" style="color: ${theme.accentColor};">
                TATA TERTIB PESERTA ${examType}
              </div>
              <ol>
                <li>Peserta wajib hadir 15 menit sebelum bel ujian dimulai.</li>
                <li>Kartu peserta wajib dibawa dan diletakkan di atas meja selama ujian.</li>
                <li>Dilarang membawa alat komunikasi atau catatan dalam bentuk apa pun.</li>
                <li>Jika kartu hilang/rusak, segera melapor ke Panitia ${examType}.</li>
              </ol>
            </div>
          </div>
          <div class="back-footer">
            PANITIA ${examType} ${settings.schoolName} &bull; TA ${configDraft.academicYear}
          </div>
        `
          : `
          <div class="back-header" style="color: ${theme.accentColor};">
            TATA TERTIB PESERTA ${examType}
          </div>
          <div class="back-body">
            <ol>
              <li>Peserta wajib hadir di ruang ujian 15 menit sebelum bel dimulai.</li>
              <li>Kartu peserta wajib dibawa dan diletakkan di atas meja selama ujian berlangsung.</li>
              <li>Dilarang membawa alat komunikasi atau catatan dalam bentuk apa pun.</li>
              <li>Jika kartu hilang/rusak, segera melapor ke Panitia ${examType} MI Islamiyah Rowosari.</li>
            </ol>
            <div class="contact-info">
              <p><strong>Periode:</strong> ${configDraft.periodLabel}</p>
              <p><strong>Tahun Ajaran:</strong> ${configDraft.academicYear} (${configDraft.semester})</p>
            </div>
          </div>
          <div class="back-footer">
            PANITIA ${examType} ${settings.schoolName} &bull; TA ${configDraft.academicYear}
          </div>
        `;

      const frontCardHtml = `
        <div class="exam-card front">
          <div class="card-header" style="background-color: ${theme.solidColor}; background-image: ${theme.printHeader};">
            <div class="logo-badge">
              <img src="${logoUrl}" alt="Logo MI" />
            </div>
            <div class="header-titles">
              <h5>${settings.schoolName}</h5>
              <h4>KARTU PESERTA ${examType}</h4>
              <p>TA ${configDraft.academicYear} &bull; ${configDraft.semester}</p>
            </div>
            <div class="exam-pill">${examType}</div>
          </div>

          <div class="card-body">
            <div class="photo-box" style="border-color: ${theme.accentColor};">
              <img src="${getStudentPhotoSrc(student.photoUrl, student.nis)}" onerror="this.src='${getAvatarFallback(student.nis)}'" alt="${student.name}" />
              <div class="room-tag" style="background-color: ${theme.accentColor};">${roomName}</div>
            </div>

            <div class="student-info">
              <div class="participant-no" style="color: ${theme.accentColor}; border-color: ${theme.accentColor};">${participantNo}</div>
              <div class="info-name">${student.name}</div>
              <div class="info-row"><span>NISN</span><strong>: ${student.nisn || student.nis || '-'}</strong></div>
              <div class="info-row"><span>Kelas</span><strong style="color: ${theme.accentColor};">: ${student.className}</strong></div>
              <div class="info-row"><span>Periode</span><strong>: ${configDraft.periodLabel}</strong></div>
            </div>
          </div>

          <div class="card-footer">
            <div class="barcode-box">
              <div class="fake-barcode">||||| | ||| ||||</div>
              <span class="nis-text">NISN: ${student.nisn || student.nis || '-'}</span>
            </div>
            <div class="signature-box">
              <div class="stamp-row">
                <span class="sign-title">Ketua Panitia,</span>
                <span class="stamp-mark">PANITIA ${examType}</span>
              </div>
              <div class="sign-name">${configDraft.committeeChair}</div>
            </div>
          </div>
        </div>
      `;

      if (printSides === 'both') {
        return `
          <div class="card-wrapper">
            ${frontCardHtml}
            <div class="exam-card back">
              ${backContentHtml}
            </div>
          </div>
        `;
      }
      return frontCardHtml;
    };

    // Chunk into exact F4 pages of 4 cards each
    const pagesHtml: string[] = [];
    for (let i = 0; i < cardStudentsList.length; i += 4) {
      const chunk = cardStudentsList.slice(i, i + 4);
      const chunkContent = chunk
        .map((student, offset) => renderStudentCardHtml(student, i + offset))
        .join('');
      const pageNum = Math.floor(i / 4) + 1;
      const totalPages = Math.ceil(cardStudentsList.length / 4);

      pagesHtml.push(`
        <div class="f4-page ${printSides === 'front' ? 'front-only' : 'both-sides'}">
          <div class="f4-screen-label">Lembar F4 #${pageNum} dari ${totalPages} (${chunk.length} Kartu Peserta ${examType})</div>
          <div class="f4-cards-area">
            ${chunkContent}
          </div>
        </div>
      `);
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <base href="${origin}/" />
        <title>Cetak Kartu Peserta ${examType} (F4) - ${settings.schoolName}</title>
        <style>
          @page {
            size: 215mm 330mm;
            margin: 10mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 0;
            background: #e2e8f0;
            color: #0f172a;
          }
          .f4-page {
            width: 195mm;
            min-height: 306mm;
            margin: 14px auto;
            background: #ffffff;
            padding: 2mm 0;
            box-shadow: 0 4px 20px rgba(15, 23, 42, 0.12);
            position: relative;
          }
          .f4-screen-label {
            font-size: 10px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            text-align: center;
            margin-bottom: 6px;
          }
          .both-sides .f4-cards-area {
            display: flex;
            flex-direction: column;
            gap: 8mm;
            align-items: center;
          }
          .front-only .f4-cards-area {
            display: grid;
            grid-template-columns: repeat(2, 93mm);
            gap: 10mm 7mm;
            justify-content: center;
            align-content: start;
          }
          .card-wrapper {
            display: flex;
            gap: 5mm;
            justify-content: center;
            align-items: stretch;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .exam-card {
            width: 93mm;
            height: 67mm;
            border-radius: 3.5mm;
            border: 1px solid #cbd5e1;
            position: relative;
            overflow: hidden;
            background-color: #ffffff !important;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            font-size: 8.5px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          /* Header matching live preview */
          .card-header {
            color: #ffffff !important;
            padding: 2.5mm 3mm;
            display: flex;
            align-items: center;
            gap: 2.5mm;
          }
          .logo-badge {
            width: 8.5mm;
            height: 8.5mm;
            border-radius: 2mm;
            background-color: #ffffff !important;
            padding: 0.6mm;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
          }
          .logo-badge img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .header-titles { flex: 1; min-width: 0; }
          .header-titles h5 {
            margin: 0;
            font-size: 5.5pt;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.9) !important;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .header-titles h4 {
            margin: 0.5mm 0 0 0;
            font-size: 8.5pt;
            font-weight: 900;
            letter-spacing: 0.3px;
            color: #ffffff !important;
          }
          .header-titles p {
            margin: 0.3mm 0 0 0;
            font-size: 5.5pt;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.92) !important;
          }
          .exam-pill {
            background-color: rgba(255, 255, 255, 0.2) !important;
            border: 1px solid rgba(255, 255, 255, 0.45);
            color: #ffffff !important;
            padding: 1mm 2mm;
            border-radius: 1.5mm;
            font-weight: 900;
            font-size: 7pt;
            flex-shrink: 0;
          }

          /* Body */
          .card-body {
            padding: 2.5mm 3mm;
            display: flex;
            gap: 3mm;
            align-items: center;
            flex: 1;
            background-color: #ffffff !important;
          }
          .photo-box {
            width: 21mm;
            height: 27mm;
            border-radius: 2mm;
            border: 1.5px solid #047857;
            overflow: hidden;
            position: relative;
            background-color: #f1f5f9 !important;
            flex-shrink: 0;
          }
          .photo-box img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .room-tag {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            color: #ffffff !important;
            font-size: 5.5pt;
            font-weight: 900;
            text-align: center;
            padding: 0.7mm 0;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .student-info { flex: 1; min-width: 0; }
          .participant-no {
            display: inline-block;
            font-family: 'Consolas', monospace;
            font-size: 6.8pt;
            font-weight: 900;
            border: 1px solid #047857;
            background-color: #f8fafc !important;
            padding: 0.6mm 1.8mm;
            border-radius: 1.2mm;
            margin-bottom: 1.2mm;
          }
          .info-name {
            font-size: 8.5pt;
            font-weight: 900;
            color: #0f172a !important;
            margin-bottom: 1.2mm;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .info-row { display: flex; font-size: 6.8pt; margin-bottom: 0.8mm; line-height: 1.25; }
          .info-row span { width: 12mm; color: #64748b !important; flex-shrink: 0; font-weight: 600; }
          .info-row strong { color: #0f172a !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 800; }

          /* Footer */
          .card-footer {
            padding: 1.8mm 3mm;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            border-top: 1px solid #e2e8f0;
            background-color: #f8fafc !important;
          }
          .fake-barcode { font-family: monospace; font-size: 7.5pt; letter-spacing: 0.6px; color: #0f172a !important; line-height: 1; font-weight: 700; }
          .nis-text { font-size: 5.5pt; font-weight: 700; color: #64748b !important; display: block; margin-top: 0.5mm; }
          .signature-box { text-align: right; font-size: 5.8pt; }
          .stamp-row {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 1.5mm;
            margin-bottom: 1.8mm;
          }
          .sign-title { color: #64748b !important; font-weight: 700; }
          .stamp-mark {
            font-size: 4.8pt;
            color: #e11d48 !important;
            border: 0.8px solid rgba(225, 29, 72, 0.65);
            background-color: #fff1f2 !important;
            padding: 0.3mm 1.2mm;
            border-radius: 1mm;
            font-weight: 900;
            text-transform: uppercase;
          }
          .sign-name {
            font-weight: 900;
            color: #1e293b !important;
            text-decoration: underline;
            font-size: 6.2pt;
          }

          /* Back Card matching live preview */
          .exam-card.back {
            padding: 1.5mm 2mm;
            background-color: #f8fafc !important;
          }
          .back-header {
            text-align: center;
            font-weight: 900;
            font-size: 7.2pt;
            text-transform: uppercase;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 0.6mm;
            margin-bottom: 0.8mm;
          }
          .back-schedule-wrap {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 1.2mm;
            overflow: hidden;
          }
          .back-schedule { overflow: hidden; }
          .back-schedule-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.4mm;
            align-items: start;
          }
          .back-schedule-empty {
            text-align: center;
            padding: 4mm 2mm;
            color: #94a3b8;
            font-size: 6.2pt;
            border: 0.5px solid #e2e8f0;
            background: #ffffff;
          }
          .back-schedule table {
            width: 100%;
            border-collapse: collapse;
            font-size: var(--sched-fs, 6pt);
            line-height: 1.15;
            table-layout: fixed;
          }
          .back-schedule th {
            background-color: #e2e8f0 !important;
            color: #1e293b !important;
            font-weight: 900;
            padding: var(--cell-pad, 0.5mm 0.6mm);
            text-align: left;
            border: 0.5px solid #cbd5e1;
          }
          .back-schedule td {
            background-color: #ffffff !important;
            padding: var(--cell-pad, 0.5mm 0.6mm);
            border: 0.5px solid #e2e8f0;
            color: #334155 !important;
            vertical-align: top;
          }
          .back-rules-compact {
            background-color: #ffffff !important;
            border: 0.5px solid #cbd5e1;
            border-radius: 1mm;
            padding: 0.9mm 1.5mm;
          }
          .back-rules-title {
            font-size: var(--rules-title-fs, 5.7pt);
            font-weight: 900;
            text-transform: uppercase;
            margin-bottom: 0.4mm;
            border-bottom: 0.5px solid #e2e8f0;
            padding-bottom: 0.3mm;
          }
          .back-rules-compact ol {
            margin: 0;
            padding-left: 3.1mm;
            font-size: var(--rules-fs, 5.2pt);
            line-height: 1.24;
            color: #334155 !important;
            font-weight: 600;
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 3mm;
            row-gap: 0.35mm;
          }
          .back-rules-compact li {
            margin-bottom: 0;
          }
          .back-body { flex: 1; display: flex; flex-direction: column; justify-content: center; }
          .back-body ol { margin: 1mm 0 0 0; padding-left: 4mm; font-size: 6.2pt; color: #334155 !important; line-height: 1.4; font-weight: 600; }
          .contact-info { margin-top: 2mm; font-size: 5.8pt; color: #64748b !important; border-top: 1px dashed #cbd5e1; padding-top: 1.2mm; }
          .contact-info p { margin: 0.5mm 0; }
          .back-footer {
            text-align: center;
            font-size: 5pt;
            color: #94a3b8 !important;
            font-weight: 800;
            text-transform: uppercase;
            border-top: 0.5px solid #e2e8f0;
            padding-top: 0.6mm;
            margin-top: 0.7mm;
          }

          @media print {
            body { background: #ffffff !important; }
            .f4-screen-label { display: none !important; }
            .f4-page {
              width: 195mm;
              height: 306mm;
              min-height: 0;
              margin: 0 auto;
              padding: 0;
              box-shadow: none;
              page-break-after: always;
              break-after: page;
            }
            .f4-page:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .exam-card {
              border-style: dashed;
              border-color: #94a3b8;
            }
          }
        </style>
      </head>
      <body>
        ${pagesHtml.join('')}
      </body>
      </html>
    `;

    printHtmlDocument(fullHtml);
  };

  const previewScheduleItems = selectedStudent
    ? getClassScheduleSummary(selectedStudent.className)
    : [];

  return (
    <div className="space-y-6 w-full">
      {/* ===================================================================== */}
      {/* HEADER UTAMA + PEMILIH JENIS ASESMEN (ASAS vs ASAT) & SUB-TAB          */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-emerald-700">
              <FileCheck2 className="w-4 h-4" />
              <span>Asesmen Madrasah Terpadu</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase mt-1">
              Menu ASAS & ASAT ({examType})
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Kelola jadwal ujian tiap kelas dan cetak Kartu Peserta ASAS & ASAT lengkap dengan foto siswa
            </p>
          </div>

          {/* Toggle Switcher: ASAS vs ASAT */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleSwitchExamType('ASAS')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  examType === 'ASAS'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ASAS (Ganjil)
              </button>
              <button
                type="button"
                onClick={() => handleSwitchExamType('ASAT')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  examType === 'ASAT'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ASAT (Genap)
              </button>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 gap-1">
            <button
              type="button"
              onClick={() => setSubTab('schedule')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer ${
                subTab === 'schedule'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Jadwal {examType} Tiap Kelas</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('cards')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer ${
                subTab === 'cards'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Cetak Kartu {examType}</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('instrument')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer ${
                subTab === 'instrument'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              <span>Instrumen & Administrasi {examType}</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('desk-numbers')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer ${
                subTab === 'desk-numbers'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Cetak Nomor Meja</span>
            </button>
          </div>

          <div className="text-xs font-bold text-slate-500 flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 uppercase text-[10px] font-black">
              TA {configDraft.academicYear} • {configDraft.semester}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 uppercase text-[10px] font-black">
              {configDraft.periodLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SUB-TAB 1: JADWAL ASAS / ASAT TIAP KELAS                              */}
      {/* ===================================================================== */}
      {subTab === 'schedule' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Pilih Kelas:
                </span>
              </div>
              <select
                value={selectedClass}
                disabled={isGuru}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-black text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                {accessibleClasses.map((cls) => {
                  const count = accessibleExamSchedules.filter(
                    (s) => s.examType === examType && s.className === cls.name
                  ).length;
                  return (
                    <option key={cls.id} value={cls.name}>
                      {cls.name} ({count} Mapel)
                    </option>
                  );
                })}
              </select>

              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black uppercase">
                {classSchedules.length} Jadwal Mapel {examType}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAddSchedule}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-700/20 flex items-center space-x-1.5 cursor-pointer transition-all active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jadwal Mapel</span>
              </button>

              {!isGuru && (
                <button
                  type="button"
                  onClick={handleOpenCopyModal}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Salin ke Kelas Lain</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePrintClassSchedule}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-slate-900/20 flex items-center space-x-1.5 cursor-pointer transition-all active:scale-98"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Jadwal {selectedClass}</span>
              </button>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600">
                    <th className="py-3.5 px-4 w-12 text-center">No</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Hari & Tanggal</th>
                    <th className="py-3.5 px-4 w-32">Waktu</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Mata Pelajaran</th>
                    <th className="py-3.5 px-4 w-28">Ruang</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Pengawas</th>
                    <th className="py-3.5 px-4 w-24 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {classSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <CalendarCheck className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                        <p className="text-sm font-semibold text-slate-600">
                          Belum ada jadwal {examType} untuk {selectedClass}.
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Klik <strong>+ Tambah Jadwal Mapel</strong> untuk menambahkan jadwal ujian kelas ini.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    classSchedules.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-black text-slate-900 uppercase">
                            {item.dayName || getIndonesianDayName(item.date)}
                          </div>
                          <div className="text-[11px] text-slate-500 font-semibold">
                            {formatIndonesianShortDate(item.date)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono font-bold text-slate-800 text-[11px]">
                            <Clock className="w-3 h-3 text-emerald-600" />
                            <span>
                              {item.timeStart} - {item.timeEnd}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-black text-slate-900 uppercase">
                            {item.subject}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase">
                            <MapPin className="w-3 h-3" />
                            <span>{item.room || configDraft.defaultRoom}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-semibold">
                          {item.supervisor || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSchedule(item)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Edit Jadwal"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSchedule(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Jadwal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 2: CETAK KARTU PESERTA ASAS & ASAT                            */}
      {/* ===================================================================== */}
      {subTab === 'cards' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Pengaturan Kartu & Pemilih Siswa (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-black text-xs uppercase tracking-wider">
                <Settings className="w-4 h-4 text-emerald-600" />
                <span>Pengaturan Kartu {examType}</span>
              </div>
              <button
                type="button"
                onClick={handleSaveCardConfig}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-black uppercase tracking-wider flex items-center space-x-1 cursor-pointer"
              >
                <Save className="w-3 h-3" />
                <span>Simpan</span>
              </button>
            </div>

            {/* Mode Cetak */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                Mode Cetak Peserta:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'single', label: 'Satuan' },
                  { id: 'class', label: 'Per Rombel' },
                  { id: 'selected', label: 'Pilih Siswa' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPrintMode(m.id as 'single' | 'class' | 'selected')}
                    className={`py-2 px-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                      printMode === m.id
                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector sesuai mode */}
            {printMode === 'single' && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Pilih Siswa:
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-hidden focus:border-emerald-600"
                >
                  {accessibleStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.className} - NISN: {s.nisn || s.nis || '-'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {printMode === 'class' && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Pilih Rombel Kelas:
                </label>
                <select
                  value={selectedClassForCard}
                  disabled={isGuru}
                  onChange={(e) => setSelectedClassForCard(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold disabled:bg-slate-100 focus:outline-hidden focus:border-emerald-600"
                >
                  {accessibleClasses.map((c) => {
                    const count = accessibleStudents.filter((s) => s.className === c.name).length;
                    return (
                      <option key={c.id} value={c.name}>
                        {c.name} ({count} Siswa)
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {printMode === 'selected' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black uppercase text-slate-700">
                  <span>Centang Siswa ({checkedStudentIds.length} terpilih):</span>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={() => setCheckedStudentIds(accessibleStudents.map((s) => s.id))}
                      className="text-emerald-700 hover:underline cursor-pointer text-[11px]"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckedStudentIds([])}
                      className="text-slate-500 hover:underline cursor-pointer text-[11px]"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50">
                  {accessibleStudents.map((s) => {
                    const isChecked = checkedStudentIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          setCheckedStudentIds((prev) =>
                            prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                          )
                        }
                        className="w-full px-3 py-2 flex items-center space-x-2.5 text-left hover:bg-white transition-colors cursor-pointer text-xs"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="font-bold text-slate-900 uppercase truncate flex-1">
                          {s.name}
                        </span>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {s.className}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Metadata Kartu Ujian */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-black uppercase text-slate-700 mb-1">
                  Tahun Ajaran
                </label>
                <input
                  type="text"
                  value={configDraft.academicYear}
                  onChange={(e) => setConfigDraft({ ...configDraft, academicYear: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block font-black uppercase text-slate-700 mb-1">
                  Semester
                </label>
                <input
                  type="text"
                  value={configDraft.semester}
                  onChange={(e) => setConfigDraft({ ...configDraft, semester: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block font-black uppercase text-slate-700 mb-1">
                  Tanggal Pelaksanaan
                </label>
                <input
                  type="text"
                  value={configDraft.periodLabel}
                  onChange={(e) => setConfigDraft({ ...configDraft, periodLabel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block font-black uppercase text-slate-700 mb-1">
                  Prefix No. Peserta
                </label>
                <input
                  type="text"
                  value={configDraft.participantPrefix}
                  onChange={(e) =>
                    setConfigDraft({ ...configDraft, participantPrefix: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>
              <div className="col-span-2">
                <label className="block font-black uppercase text-slate-700 mb-1">
                  Nama Ketua Panitia {examType}
                </label>
                <input
                  type="text"
                  value={configDraft.committeeChair}
                  onChange={(e) =>
                    setConfigDraft({ ...configDraft, committeeChair: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>
            </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-black uppercase text-slate-700 mb-1">
                  Tampak Belakang
                </label>
                <select
                  value={configDraft.backMode}
                  onChange={(e) =>
                    setConfigDraft({
                      ...configDraft,
                      backMode: e.target.value as 'schedule' | 'rules',
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                >
                  <option value="schedule">Jadwal Ujian Kelas</option>
                  <option value="rules">Tata Tertib Peserta</option>
                </select>
              </div>
              <div>
                <label className="block font-black uppercase text-slate-700 mb-1">
                  Sisi Cetak (Kertas F4)
                </label>
                <select
                  value={printSides}
                  onChange={(e) => setPrintSides(e.target.value as 'both' | 'front')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                >
                  <option value="both">Depan & Belakang (4 / F4)</option>
                  <option value="front">Depan Saja (4 / F4)</option>
                </select>
              </div>
            </div>

            {/* Tema Warna Kartu */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                Tema Warna Kartu:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'emerald', name: 'Emerald Madrasah', color: 'bg-emerald-600' },
                  { id: 'navy', name: 'Royal Navy', color: 'bg-blue-800' },
                  { id: 'gold', name: 'Amber Gold', color: 'bg-amber-600' },
                  { id: 'modern', name: 'Dark Modern', color: 'bg-slate-800' },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() =>
                      setConfigDraft({
                        ...configDraft,
                        cardTheme: tpl.id as ExamMetaConfig['cardTheme'],
                      })
                    }
                    className={`p-2 rounded-xl border text-xs font-black uppercase flex items-center space-x-2 transition-all cursor-pointer ${
                      configDraft.cardTheme === tpl.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${tpl.color}`} />
                    <span className="truncate">{tpl.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Print Action Button */}
            <button
              type="button"
              onClick={handlePrintExamCards}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-700/20 flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>
                Cetak Kartu {examType} F4 ({cardStudentsList.length} Siswa)
              </span>
            </button>
          </div>

          {/* Right: Live Preview Kartu Peserta ASAS / ASAT (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col items-center justify-center space-y-6">
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Pratinjau Live Kartu Peserta {examType} (Skala F4 • 4 Kartu/Lembar)
              </span>
              <h3 className="text-base font-black text-slate-900 uppercase mt-2">
                Tampak Depan & Belakang Kartu Ujian
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tampilan hasil cetak identik dengan pratinjau • Ukuran kertas F4 (215 × 330 mm)
              </p>
            </div>

            {selectedStudent ? (
              <div className="flex flex-col xl:flex-row gap-5 items-center justify-center">
                {/* FRONT PREVIEW (Ratio matches 93mm x 67mm) */}
                <div className="w-[330px] h-[238px] rounded-2xl border border-slate-300 shadow-lg bg-white overflow-hidden flex flex-col justify-between text-slate-900 text-[10px] relative">
                  <div
                    className={`px-3 py-2 bg-gradient-to-r ${theme.gradient} text-white flex items-center space-x-2.5`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs">
                      <img
                        src={MI_LOGO_PATH}
                        alt="Logo MI Islamiyah Rowosari"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[7px] text-white/90 font-bold uppercase truncate">
                        {settings.schoolName}
                      </div>
                      <div className="font-black text-[10.5px] uppercase tracking-wide leading-tight">
                        KARTU PESERTA {examType}
                      </div>
                      <div className="text-[7px] text-white/90 font-semibold">
                        TA {configDraft.academicYear} • {configDraft.semester}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-white/20 border border-white/45 text-[8.5px] font-black shrink-0">
                      {examType}
                    </span>
                  </div>

                  <div className="px-3 py-2.5 flex items-center space-x-3 flex-1 bg-white">
                    <div
                      className={`w-[74px] h-[96px] rounded-lg bg-slate-100 border-2 ${theme.borderAccent} overflow-hidden shrink-0 relative`}
                    >
                      <img
                        src={getStudentPhotoSrc(selectedStudent.photoUrl, selectedStudent.nis)}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = getAvatarFallback(
                            selectedStudent.nis
                          );
                        }}
                        alt={selectedStudent.name}
                        className="w-full h-full object-cover"
                      />
                      <span
                        className={`absolute bottom-0 inset-x-0 ${theme.badgeBg} text-white text-[7px] font-black text-center py-0.5 uppercase tracking-wide`}
                      >
                        {getRoomForClass(selectedStudent.className)}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1 text-[9.5px]">
                      <div
                        className={`inline-block px-2 py-0.5 rounded border ${theme.borderAccent} bg-slate-50 font-mono font-black ${theme.textAccent} text-[8.5px]`}
                      >
                        {getParticipantNumber(selectedStudent, 0)}
                      </div>
                      <div className="font-black text-slate-900 uppercase truncate text-[10.5px]">
                        {selectedStudent.name}
                      </div>
                      <div className="text-slate-500 flex">
                        <span className="w-12 shrink-0">NISN</span>
                        <strong className="text-slate-900 font-mono truncate">
                          : {selectedStudent.nisn || selectedStudent.nis || '-'}
                        </strong>
                      </div>
                      <div className="text-slate-500 flex">
                        <span className="w-12 shrink-0">Kelas</span>
                        <strong className={theme.textAccent}>: {selectedStudent.className}</strong>
                      </div>
                      <div className="text-slate-500 flex">
                        <span className="w-12 shrink-0">Periode</span>
                        <strong className="text-slate-900 truncate">: {configDraft.periodLabel}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-end justify-between text-[7.5px] text-slate-500 font-bold">
                    <div>
                      <div className="font-mono text-slate-900 leading-none text-[9px]">||||| | ||| ||||</div>
                      <div className="text-[6.5px] mt-0.5">NISN: {selectedStudent.nisn || selectedStudent.nis || '-'}</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end space-x-1.5 mb-2">
                        <span className="text-slate-500 font-bold">Ketua Panitia,</span>
                        <span className="text-[6px] text-rose-600 border border-rose-500/60 bg-rose-50 px-1.5 py-0.2 rounded uppercase font-black">
                          PANITIA {examType}
                        </span>
                      </div>
                      <div className="text-slate-800 underline font-black text-[8px]">
                        {configDraft.committeeChair}
                      </div>
                    </div>
                  </div>
                </div>

                {/* BACK PREVIEW (Ratio matches 93mm x 67mm) */}
                <div className="w-[330px] h-[238px] rounded-2xl border border-slate-300 shadow-lg bg-slate-50 p-2 flex flex-col justify-between text-slate-800 text-[8px]">
                  {configDraft.backMode === 'schedule' ? (
                    <>
                      <div
                        className={`text-center font-black uppercase border-b border-slate-300 pb-0.5 text-[9px] ${theme.textAccent}`}
                      >
                        Jadwal {examType} • {selectedStudent.className}
                      </div>
                      {(() => {
                        const midIdx = Math.ceil(previewScheduleItems.length / 2);
                        const leftItems = previewScheduleItems.slice(0, midIdx);
                        const rightItems = previewScheduleItems.slice(midIdx);
                        const maxPreviewRows = Math.max(leftItems.length, rightItems.length);
                        const tableTextCls =
                          maxPreviewRows <= 6
                            ? 'text-[7.6px]'
                            : maxPreviewRows <= 8
                              ? 'text-[7.6px]'
                              : maxPreviewRows <= 10
                                ? 'text-[7px]'
                                : 'text-[6.4px]';
                        const rulesTitleCls =
                          maxPreviewRows <= 6
                            ? 'text-[7.5px]'
                            : maxPreviewRows <= 8
                              ? 'text-[7.1px]'
                              : 'text-[6.5px]';
                        const rulesTextCls =
                          maxPreviewRows <= 6
                            ? 'text-[6.8px]'
                            : maxPreviewRows <= 8
                              ? 'text-[6.4px]'
                              : 'text-[5.8px]';

                        const renderPreviewTable = (items: typeof previewScheduleItems) => (
                          <table className={`w-full text-left ${tableTextCls} leading-tight border-collapse table-fixed`}>
                            <thead>
                              <tr className="bg-slate-200 text-slate-800 font-black">
                                <th className="p-0.5 border border-slate-300 w-[42%]">Hari/Tgl</th>
                                <th className="p-0.5 border border-slate-300 w-[20%]">Jam</th>
                                <th className="p-0.5 border border-slate-300">Mapel</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((sc) => (
                                <tr key={sc.id} className="bg-white">
                                  <td className="p-0.5 border border-slate-200 whitespace-nowrap">
                                    {(sc.dayName || '').slice(0, 3)},{' '}
                                    {formatDMY(sc.date)}
                                  </td>
                                  <td className="p-0.5 border border-slate-200 font-mono font-bold whitespace-nowrap">
                                    {sc.timeStart}
                                  </td>
                                  <td className="p-0.5 border border-slate-200 font-bold break-words">
                                    {sc.subject}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );

                        return (
                          <div className="flex-1 overflow-y-auto my-1 flex flex-col justify-between gap-1">
                            {previewScheduleItems.length === 0 ? (
                              <div className="p-2 text-center text-[7px] text-slate-400 border border-slate-200 bg-white rounded">
                                Belum ada jadwal untuk {selectedStudent.className}
                              </div>
                            ) : rightItems.length > 0 ? (
                              <div className="grid grid-cols-2 gap-1.5 items-start">
                                {renderPreviewTable(leftItems)}
                                {renderPreviewTable(rightItems)}
                              </div>
                            ) : (
                              renderPreviewTable(leftItems)
                            )}
                            <div className="bg-white border border-slate-300 rounded px-1.5 py-1">
                              <div
                                className={`${rulesTitleCls} font-black uppercase border-b border-slate-200 pb-0.5 mb-0.5 ${theme.textAccent}`}
                              >
                                Tata Tertib Peserta {examType}
                              </div>
                              <ol className={`list-decimal pl-3 grid grid-cols-2 gap-x-2.5 gap-y-0.5 ${rulesTextCls} leading-tight text-slate-700 font-semibold`}>
                                <li>Peserta wajib hadir 15 menit sebelum bel ujian dimulai.</li>
                                <li>Kartu peserta wajib dibawa dan diletakkan di atas meja selama ujian.</li>
                                <li>Dilarang membawa alat komunikasi atau catatan dalam bentuk apa pun.</li>
                                <li>Jika kartu hilang/rusak, segera melapor ke Panitia {examType}.</li>
                              </ol>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="text-[6px] text-slate-400 text-center border-t border-slate-200 pt-0.5 font-bold uppercase">
                        PANITIA {examType} {settings.schoolName} • TA {configDraft.academicYear}
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className={`text-center font-black uppercase border-b border-slate-300 pb-1 text-[9px] ${theme.textAccent}`}
                      >
                        Tata Tertib Peserta {examType}
                      </div>
                      <ol className="list-decimal pl-4 space-y-1 text-[8px] text-slate-700 font-medium">
                        <li>Peserta wajib hadir 15 menit sebelum ujian dimulai.</li>
                        <li>Kartu peserta wajib diletakkan di atas meja selama ujian.</li>
                        <li>Dilarang membawa alat komunikasi atau catatan dalam ruang ujian.</li>
                        <li>Jika kartu hilang/rusak, segera melapor ke Panitia {examType}.</li>
                      </ol>
                      <div className="text-[6.5px] text-slate-400 text-center border-t border-slate-200 pt-1 font-bold uppercase">
                        PANITIA {examType} {settings.schoolName} • TA {configDraft.academicYear}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold">Belum ada data siswa untuk ditampilkan.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 3: INSTRUMEN PELAKSANAAN & SUB-MENU KELENGKAPAN ADMINISTRASI  */}
      {/* ===================================================================== */}
      {subTab === 'instrument' && (
        <ExamInstrumentView
          examType={examType}
          onNavigateSubTab={(target) => setSubTab(target)}
        />
      )}

      {subTab === 'desk-numbers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Pilih Kelas:
                </span>
              </div>
              <select
                value={deskClass}
                onChange={(e) => setDeskClass(e.target.value)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 font-bold text-sm bg-slate-50 text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                {accessibleClasses.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} {c.level ? `(Tingkat ${c.level})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">
                Total Siswa Aktif: <strong className="text-slate-900">{deskStudentsList.length}</strong>
              </span>
              <button
                type="button"
                onClick={handlePrintDeskNumbers}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-800 text-white font-black text-xs uppercase tracking-wider shadow-md hover:from-emerald-800 hover:to-teal-900 flex items-center space-x-2 cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Nomor Meja {deskClass}</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                  Pratinjau Nomor Meja Ujian • {deskClass}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Menampilkan kartu nomor meja untuk setiap siswa yang akan ditempel di meja peserta {examType}.
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-black">
                Ruang: {getRoomForClass(deskClass)}
              </span>
            </div>

            {deskStudentsList.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-medium text-sm">
                Tidak ada siswa aktif di kelas {deskClass}.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deskStudentsList.map((student, idx) => {
                  const deskNo = String(idx + 1).padStart(2, '0');
                  const participantNo = getParticipantNumber(student, idx);
                  return (
                    <div
                      key={student.id}
                      className="border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between shadow-xs hover:border-emerald-500 transition-all"
                    >
                      <div>
                        <div className="flex items-center space-x-3 border-b border-slate-200 pb-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-white p-1 border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
                            <img src={MI_LOGO_PATH} alt="Logo" className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <div className="text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider">
                              PANITIA {examType} • TA {configDraft.academicYear}
                            </div>
                            <div className="text-xs font-black text-slate-900 uppercase">
                              {settings.schoolName}
                            </div>
                          </div>
                        </div>

                        <div className="text-center bg-emerald-50 border-2 border-emerald-600 rounded-xl py-3 px-4 my-3">
                          <div className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">
                            NOMOR MEJA
                          </div>
                          <div className="text-3xl font-black font-mono text-emerald-800">
                            {deskNo}
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">No Peserta:</span>
                            <span className="font-bold font-mono text-slate-900">{participantNo}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Nama:</span>
                            <span className="font-black text-slate-900 uppercase">{student.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">NISN:</span>
                            <span className="font-bold text-slate-800">{student.nisn || student.nis || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Kelas / Ruang:</span>
                            <span className="font-bold text-emerald-800">{student.className} • {getRoomForClass(deskClass)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase pt-3 mt-3 border-t border-slate-200">
                        <span>{configDraft.periodLabel}</span>
                        <span>{examType}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL TAMBAH / EDIT JADWAL MAPEL UJIAN                                */}
      {/* ===================================================================== */}
      {isScheduleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsScheduleModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-br from-emerald-700 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">
                  Jadwal {examType} • {scheduleForm.className}
                </span>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  {editingSchedule ? 'Edit Jadwal Mapel' : 'Tambah Jadwal Mapel'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveSchedule}
              className="p-6 space-y-4 text-xs font-bold text-slate-700 overflow-y-auto flex-1"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase tracking-wider mb-1">Kelas</label>
                  <select
                    value={scheduleForm.className}
                    disabled={isGuru}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, className: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 disabled:bg-slate-100"
                  >
                    {accessibleClasses.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block uppercase tracking-wider mb-1">Tanggal Ujian *</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.date}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        date: e.target.value,
                        dayName: getIndonesianDayName(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block uppercase tracking-wider mb-1">Hari</label>
                  <input
                    type="text"
                    value={scheduleForm.dayName}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, dayName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block uppercase tracking-wider mb-1">Jam Mulai *</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.timeStart}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, timeStart: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block uppercase tracking-wider mb-1">Jam Selesai *</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.timeEnd}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, timeEnd: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase tracking-wider mb-1">Mata Pelajaran *</label>
                <input
                  type="text"
                  required
                  list="mi-subjects-list"
                  placeholder="Ketik atau pilih mata pelajaran..."
                  value={scheduleForm.subject}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600"
                />
                <datalist id="mi-subjects-list">
                  {MI_SUBJECT_SUGGESTIONS.map((subj) => (
                    <option key={subj} value={subj} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase tracking-wider mb-1">Ruang Ujian</label>
                  <input
                    type="text"
                    placeholder="Contoh: Ruang 01"
                    value={scheduleForm.room}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, room: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block uppercase tracking-wider mb-1">Pengawas Ruang</label>
                  <input
                    type="text"
                    placeholder="Opsional..."
                    value={scheduleForm.supervisor}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, supervisor: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-black uppercase tracking-wider text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-700/20 cursor-pointer"
                >
                  {editingSchedule ? 'Simpan Perubahan' : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL SALIN JADWAL KE KELAS LAIN                                      */}
      {/* ===================================================================== */}
      {isCopyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCopyModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  Duplikasi Jadwal {examType}
                </span>
                <h3 className="text-base font-black uppercase tracking-tight">
                  Salin Jadwal dari {selectedClass}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 font-semibold leading-relaxed">
                Pilih kelas tujuan untuk menyalin{' '}
                <strong className="text-slate-900">{classSchedules.length} mata pelajaran</strong>{' '}
                dari {selectedClass}. Jadwal lama pada kelas tujuan untuk {examType} akan diperbarui.
              </p>

              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {accessibleClasses
                  .filter((c) => c.name !== selectedClass)
                  .map((cls) => {
                    const isSelected = copyTargetClasses.includes(cls.name);
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() =>
                          setCopyTargetClasses((prev) =>
                            prev.includes(cls.name)
                              ? prev.filter((x) => x !== cls.name)
                              : [...prev, cls.name]
                          )
                        }
                        className={`w-full px-3.5 py-2.5 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-black'
                            : 'bg-slate-50 border-slate-200 text-slate-700 font-bold hover:bg-slate-100'
                        }`}
                      >
                        <span>{cls.name}</span>
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    );
                  })}
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCopyModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-black uppercase text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCommitCopy}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs shadow-md shadow-emerald-700/20 cursor-pointer"
                >
                  Salin ke {copyTargetClasses.length} Kelas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
