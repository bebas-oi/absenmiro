import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  Calculator,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Layers,
  ListChecks,
  Plus,
  Printer,
  RotateCcw,
  Save,
  ScrollText,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { initialExamInstruments } from '../data/initialData';
import {
  ExamChecklistStatus,
  ExamInstrumentChecklistItem,
  ExamInstrumentConfig,
  ExamScheduleItem,
  ExamType,
} from '../types';
import { buildOfficialKopHtml, printHtmlDocument } from '../utils/printUtils';
import { showSuccessToast, showWarningToast } from '../utils/alerts';

const MI_LOGO_PATH = '/assets/aistudio/Logo_MI_Rowosari_2_b88f498f.png';

// Crisp vector Kemenag (Ikhlas Beramal) emblem for Kop Surat
const KEMENAG_SVG = `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">
  <polygon points="60,4 114,43 93,108 27,108 6,43" fill="#ffffff" stroke="#0f172a" stroke-width="4" stroke-linejoin="round"/>
  <polygon points="60,11 107,45 89,102 31,102 13,45" fill="none" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
  <polygon points="60,18 63.5,27 73,27 65.5,32.5 68.5,41.5 60,36 51.5,41.5 54.5,32.5 47,27 56.5,27" fill="#0f172a"/>
  <path d="M26 52 C26 78, 42 92, 60 95 C78 92, 94 78, 94 52" fill="none" stroke="#0f172a" stroke-width="3"/>
  <path d="M36 56 L60 66 L84 56 L84 74 L60 84 L36 74 Z" fill="#ffffff" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>
  <line x1="60" y1="66" x2="60" y2="84" stroke="#0f172a" stroke-width="2"/>
  <rect x="33" y="92" width="54" height="10" rx="2" fill="#0f172a"/>
  <text x="60" y="99.5" text-anchor="middle" fill="#ffffff" font-size="6.5" font-weight="bold" font-family="Arial, sans-serif">IKHLAS BERAMAL</text>
</svg>`;

interface ExamInstrumentViewProps {
  examType: ExamType;
  onNavigateSubTab: (tab: 'schedule' | 'cards') => void;
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

function formatShortIndoDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

const formatDMY = (dateStr: string): string => { if (!dateStr) return '-'; const p = dateStr.split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : dateStr; };

export const ExamInstrumentView: React.FC<ExamInstrumentViewProps> = ({
  examType,
  onNavigateSubTab,
}) => {
  const {
    settings,
    accessibleStudents,
    accessibleClasses,
    accessibleExamSchedules,
    examConfigs,
    examInstruments,
    updateExamInstrument,
    updateExamConfig,
    isGuru,
    currentUser,
  } = useApp();

  const savedInstrument = examInstruments[examType];
  const savedConfig = examConfigs[examType];
  const [draft, setDraft] = useState<ExamInstrumentConfig>(() => ({
    ...savedInstrument,
    periodLabel: savedInstrument.periodLabel || savedConfig?.periodLabel || (examType === 'ASAS' ? '2 - 7 Desember 2026' : '2 - 7 Juni 2027'),
    committeeChair: savedInstrument.committeeChair || savedConfig?.committeeChair || (examType === 'ASAS' ? 'Ahmad Mustofa, S.Pd' : 'Ustadzah Lailatul Badriyah, S.Pd.I'),
    committeeChairNip: savedInstrument.committeeChairNip || savedConfig?.committeeChairNip || '',
    skNumber: savedInstrument.skNumber || savedConfig?.skNumber || (examType === 'ASAS' ? '045/MI-RWS/XI/2026' : '089/MI-RWS/V/2027'),
    skDate: savedInstrument.skDate || savedConfig?.skDate || (examType === 'ASAS' ? '2026-11-20' : '2027-05-20'),
    printDate: savedInstrument.printDate || savedConfig?.printDate || new Date().toLocaleDateString('en-CA'),
    paperSize: savedInstrument.paperSize === 'A4' ? 'F4' : (savedInstrument.paperSize || savedConfig?.paperSize || 'F4'),
  }));
  const [innerMode, setInnerMode] = useState<'instrument' | 'submenu'>('instrument');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [customSubjectInput, setCustomSubjectInput] = useState<string>('');
  const [selectedChecklistId, setSelectedChecklistId] = useState<string>(
    savedInstrument.checklist[0]?.id || 'chk-1'
  );
  const [subMenuClass, setSubMenuClass] = useState<string>(
    isGuru && currentUser?.assignedClass
      ? currentUser.assignedClass
      : accessibleClasses[0]?.name || 'Kelas 1A'
  );
  const [baAbsentCount, setBaAbsentCount] = useState<string>('0');
  const [baAbsentNames, setBaAbsentNames] = useState<string>('-');
  const [scoreMap, setScoreMap] = useState<Record<string, string>>({});

  // Sync draft when examType switches or cloud updates come in
  useEffect(() => {
    const inst = examInstruments[examType];
    const cfg = examConfigs[examType];
    setDraft({
      ...inst,
      periodLabel: inst.periodLabel || cfg?.periodLabel || (examType === 'ASAS' ? '2 - 7 Desember 2026' : '2 - 7 Juni 2027'),
      committeeChair: inst.committeeChair || cfg?.committeeChair || (examType === 'ASAS' ? 'Ahmad Mustofa, S.Pd' : 'Ustadzah Lailatul Badriyah, S.Pd.I'),
      committeeChairNip: inst.committeeChairNip || cfg?.committeeChairNip || '',
      skNumber: inst.skNumber || cfg?.skNumber || (examType === 'ASAS' ? '045/MI-RWS/XI/2026' : '089/MI-RWS/V/2027'),
      skDate: inst.skDate || cfg?.skDate || (examType === 'ASAS' ? '2026-11-20' : '2027-05-20'),
      printDate: inst.printDate || cfg?.printDate || new Date().toLocaleDateString('en-CA'),
      paperSize: inst.paperSize === 'A4' ? 'F4' : (inst.paperSize || cfg?.paperSize || 'F4'),
    });
    setSelectedChecklistId((prev) => {
      if (inst.checklist.some((c) => c.id === prev)) return prev;
      return inst.checklist[0]?.id || 'chk-1';
    });
  }, [examType, examInstruments, examConfigs]);

  // Unique subjects from schedule for current examType + any subjectOverrides
  const subjectEntries = useMemo(() => {
    const map = new Map<string, { subject: string; dayDateLabel: string; schedules: ExamScheduleItem[] }>();
    const filtered = accessibleExamSchedules
      .filter((s) => s.examType === examType)
      .sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.timeStart.localeCompare(b.timeStart)));

    filtered.forEach((item) => {
      const key = item.subject.trim();
      if (!key) return;
      const dateFormatted = formatShortIndoDate(item.date);
      const dayLabel = item.dayName ? `${item.dayName}, ${dateFormatted}` : dateFormatted;
      if (!map.has(key)) {
        map.set(key, {
          subject: key,
          dayDateLabel: dayLabel,
          schedules: [item],
        });
      } else {
        map.get(key)!.schedules.push(item);
      }
    });

    Object.keys(draft.subjectOverrides || {}).forEach((subj) => {
      if (!map.has(subj)) {
        map.set(subj, {
          subject: subj,
          dayDateLabel: draft.subjectOverrides[subj]?.dayDateLabel || '',
          schedules: [],
        });
      }
    });

    return Array.from(map.values());
  }, [accessibleExamSchedules, examType, draft.subjectOverrides]);

  useEffect(() => {
    if (!selectedSubject || !subjectEntries.some((s) => s.subject === selectedSubject)) {
      if (subjectEntries.length > 0) {
        setSelectedSubject(subjectEntries[0].subject);
      }
    }
  }, [subjectEntries, selectedSubject]);

  // Auto-counted active students per grade 1..6
  const gradeCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const activeStudents = accessibleStudents.filter((s) => s.status === 'aktif');
    activeStudents.forEach((st) => {
      const match = st.className.match(/[1-6]/);
      if (match) {
        const g = Number(match[0]);
        if (g >= 1 && g <= 6) counts[g] += 1;
      }
    });
    const total = activeStudents.length;
    return {
      kls1: draft.autoCountStudents ? String(counts[1] || 0) : draft.kls1Count,
      kls2: draft.autoCountStudents ? String(counts[2] || 0) : draft.kls2Count,
      kls3: draft.autoCountStudents ? String(counts[3] || 0) : draft.kls3Count,
      kls4: draft.autoCountStudents ? String(counts[4] || 0) : draft.kls4Count,
      kls5: draft.autoCountStudents ? String(counts[5] || 0) : draft.kls5Count,
      kls6: draft.autoCountStudents ? String(counts[6] || 0) : draft.kls6Count,
      total: draft.autoCountStudents ? String(total) : draft.totalStudentsCount,
    };
  }, [accessibleStudents, draft]);

  const activeSubjectEntry =
    subjectEntries.find((s) => s.subject === selectedSubject) || subjectEntries[0];

  const getSubjectData = (subjectName: string) => {
    const entry = subjectEntries.find((s) => s.subject === subjectName);
    const ov = draft.subjectOverrides?.[subjectName];
    const dayDate =
      ov?.dayDateLabel !== undefined ? ov.dayDateLabel : entry?.dayDateLabel || '';
    const monitoring =
      ov?.monitoringResult !== undefined
        ? ov.monitoringResult
        : draft.defaultMonitoringResult;
    const notes = ov?.notes !== undefined ? ov.notes : draft.defaultNotes;
    const rows = draft.checklist.map((item) => {
      const rowOv = ov?.checklistOverrides?.[item.id];
      return {
        ...item,
        status: rowOv ? rowOv.status : item.status,
        evidenceNote: rowOv ? rowOv.evidenceNote : item.evidenceNote,
      };
    });
    return { subject: subjectName, dayDate, monitoring, notes, rows };
  };

  const currentSubjectData = getSubjectData(
    activeSubjectEntry?.subject || selectedSubject || 'Mata Pelajaran'
  );

  const handleSave = () => {
    updateExamInstrument(examType, draft);
    if (updateExamConfig && examConfigs[examType]) {
      const currentConfig = examConfigs[examType];
      updateExamConfig(examType, {
        ...currentConfig,
        academicYear: draft.academicYearLabel ? draft.academicYearLabel.replace(/[^0-9/]/g, '') || currentConfig.academicYear : currentConfig.academicYear,
        periodLabel: draft.periodLabel || currentConfig.periodLabel,
        committeeChair: draft.committeeChair || currentConfig.committeeChair,
        committeeChairNip: draft.committeeChairNip || currentConfig.committeeChairNip,
        skNumber: draft.skNumber || currentConfig.skNumber,
        skDate: draft.skDate || currentConfig.skDate,
        printDate: draft.printDate || currentConfig.printDate,
      }, true);
    }
  };

  const handleSaveSkPanitia = () => {
    const currentConfig = examConfigs[examType];
    const updatedDraft: ExamInstrumentConfig = {
      ...draft,
      periodLabel: draft.periodLabel || currentConfig?.periodLabel || '',
      committeeChair: draft.committeeChair || currentConfig?.committeeChair || '',
      committeeChairNip: draft.committeeChairNip || currentConfig?.committeeChairNip || '',
      skNumber: draft.skNumber || currentConfig?.skNumber || '',
      skDate: draft.skDate || currentConfig?.skDate || '',
    };
    setDraft(updatedDraft);
    updateExamInstrument(examType, updatedDraft, true);

    if (currentConfig) {
      updateExamConfig(
        examType,
        {
          ...currentConfig,
          periodLabel: updatedDraft.periodLabel || currentConfig.periodLabel,
          committeeChair: updatedDraft.committeeChair || currentConfig.committeeChair,
          committeeChairNip: updatedDraft.committeeChairNip || currentConfig.committeeChairNip,
          skNumber: updatedDraft.skNumber || currentConfig.skNumber,
          skDate: updatedDraft.skDate || currentConfig.skDate,
        printDate: updatedDraft.printDate || currentConfig.printDate,
        },
        true
      );
    }
    showSuccessToast(
      `SK Panitia ${examType} berhasil disimpan & diterapkan otomatis ke seluruh berkas (kartu, jadwal, nomor meja, instrumen).`
    );
  };

  const handleResetDefault = () => {
    const base = initialExamInstruments[examType];
    const next: ExamInstrumentConfig = {
      ...base,
      madrasahName: settings.schoolName || base.madrasahName,
      madrasahAddress: settings.address || base.madrasahAddress,
      headmasterName: settings.headmaster || base.headmasterName,
      headmasterNip: settings.headmasterNip || base.headmasterNip,
    };
    setDraft(next);
    updateExamInstrument(examType, next);
  };

  const handleAddCustomSubject = () => {
    const clean = customSubjectInput.trim();
    if (!clean) {
      showWarningToast('Ketik nama mata pelajaran terlebih dahulu.');
      return;
    }
    const nextDraft: ExamInstrumentConfig = {
      ...draft,
      subjectOverrides: {
        ...draft.subjectOverrides,
        [clean]: {
          subject: clean,
          dayDateLabel: '',
          monitoringResult: draft.defaultMonitoringResult,
          notes: draft.defaultNotes,
        },
      },
    };
    setDraft(nextDraft);
    setSelectedSubject(clean);
    setCustomSubjectInput('');
    showSuccessToast(`Mata pelajaran "${clean}" ditambahkan ke daftar Instrumen.`);
  };

  const updateSubjectOverrideField = (
    subjectName: string,
    patch: { dayDateLabel?: string; monitoringResult?: string; notes?: string }
  ) => {
    const existing = draft.subjectOverrides?.[subjectName] || { subject: subjectName };
    setDraft((prev) => ({
      ...prev,
      subjectOverrides: {
        ...prev.subjectOverrides,
        [subjectName]: {
          ...existing,
          ...patch,
        },
      },
    }));
  };

  const updateGlobalChecklistItem = (
    id: string,
    patch: Partial<ExamInstrumentChecklistItem>
  ) => {
    setDraft((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  };

  const handleSetAllChecklistStatus = (nextStatus: ExamChecklistStatus) => {
    setDraft((prev) => {
      const nextOverrides = { ...(prev.subjectOverrides || {}) };
      Object.keys(nextOverrides).forEach((subj) => {
        if (nextOverrides[subj]?.checklistOverrides) {
          nextOverrides[subj] = {
            ...nextOverrides[subj],
            checklistOverrides: undefined,
          };
        }
      });
      return {
        ...prev,
        checklist: prev.checklist.map((item) => ({ ...item, status: nextStatus })),
        subjectOverrides: nextOverrides,
      };
    });
    const labelMap: Record<ExamChecklistStatus, string> = {
      ada: 'Ada (✓)',
      tidak_ada: 'Tidak Ada (✓)',
      kosong: 'Kosong',
    };
    showSuccessToast(`Semua poin tabel kelengkapan diatur menjadi "${labelMap[nextStatus]}".`);
  };

  const addChecklistPoint = () => {
    const nextNo = draft.checklist.length + 1;
    const newItem: ExamInstrumentChecklistItem = {
      id: `chk-custom-${Date.now()}`,
      no: nextNo,
      label: `Kelengkapan Tambahan ${nextNo}`,
      subMenuKey: 'custom',
      status: 'kosong',
      evidenceNote: '',
      detailNotes: '',
    };
    setDraft((prev) => ({
      ...prev,
      checklist: [...prev.checklist, newItem],
    }));
    setSelectedChecklistId(newItem.id);
    setInnerMode('submenu');
  };

  const deleteChecklistPoint = (id: string) => {
    if (draft.checklist.length <= 1) return;
    const filtered = draft.checklist
      .filter((c) => c.id !== id)
      .map((c, idx) => ({ ...c, no: idx + 1 }));
    setDraft((prev) => ({
      ...prev,
      checklist: filtered,
    }));
    if (selectedChecklistId === id) {
      setSelectedChecklistId(filtered[0]?.id || '');
    }
  };

  // =========================================================================
  // PRINT ENGINE: 1 LEMBAR PER MAPEL (OFFICIAL KEMENAG / POKJAWAS FORMAT)
  // =========================================================================
  const buildSingleInstrumentPageHtml = (subjectName: string, origin: string) => {
    const data = getSubjectData(subjectName);
    const logoHtml =
      draft.kopLogoType === 'none'
        ? ''
        : draft.kopLogoType === 'mi'
        ? `<div class="kop-logo"><img src="${origin}${MI_LOGO_PATH}" alt="Logo MI" /></div>`
        : draft.kopLogoType === 'custom' && draft.kopCustomLogoUrl
        ? `<div class="kop-logo"><img src="${escapeHtml(draft.kopCustomLogoUrl)}" alt="Logo Kop" /></div>`
        : `<div class="kop-logo">${KEMENAG_SVG}</div>`;

    const tableRowsHtml = data.rows
      .map((row) => {
        const adaMark = row.status === 'ada' ? '&#10003;' : '';
        const tdkMark = row.status === 'tidak_ada' ? '&#10003;' : '';
        return `
          <tr>
            <td class="col-no">${row.no}</td>
            <td class="col-label">${escapeHtml(row.label)}</td>
            <td class="col-check">${adaMark}</td>
            <td class="col-check">${tdkMark}</td>
            <td class="col-ket">${escapeHtml(row.evidenceNote)}</td>
          </tr>
        `;
      })
      .join('');

    const dottedLine =
      '<div class="dot-fill"></div>';

    return `
      <div class="instrument-page">
        <div>
          <!-- KOP SURAT -->
          <div class="kop-wrap">
            ${logoHtml}
            <div class="kop-texts ${draft.kopLogoType === 'none' ? 'no-logo' : ''}">
              <div class="kop-l1">${escapeHtml(draft.kopLine1)}</div>
              <div class="kop-l2">${escapeHtml(draft.kopLine2)}</div>
              <div class="kop-l3">${escapeHtml(draft.kopLine3)}</div>
              <div class="kop-addr">${escapeHtml(draft.kopAddress)}</div>
            </div>
          </div>
          <div class="blue-rule"></div>

          <!-- JUDUL -->
          <div class="doc-title">
            <div>${escapeHtml(draft.instrumentTitle)}</div>
            <div>${escapeHtml(draft.academicYearLabel)}</div>
          </div>

          <!-- IDENTITAS PELAKSANAAN -->
          <table class="meta-table">
            <tr>
              <td class="meta-key">Hari, Tanggal</td>
              <td class="meta-colon">:</td>
              <td class="meta-val">${
                data.dayDate
                  ? `<span>${escapeHtml(data.dayDate)}</span>`
                  : `<span class="dots-span">......................................................................</span>`
              }</td>
            </tr>
            <tr>
              <td class="meta-key">Nama Madrasah</td>
              <td class="meta-colon">:</td>
              <td class="meta-val">${
                draft.madrasahName
                  ? `<span>${escapeHtml(draft.madrasahName)}</span>`
                  : `<span class="dots-span">MI ..............................................................</span>`
              }</td>
            </tr>
            <tr>
              <td class="meta-key">Mata Pelajaran</td>
              <td class="meta-colon">:</td>
              <td class="meta-val"><strong>${escapeHtml(subjectName)}</strong></td>
            </tr>
            <tr>
              <td class="meta-key">Alamat</td>
              <td class="meta-colon">:</td>
              <td class="meta-val">${
                draft.madrasahAddress
                  ? `<span>${escapeHtml(draft.madrasahAddress)}</span>`
                  : `<span class="dots-span">......................................................................</span>`
              }</td>
            </tr>
            <tr>
              <td class="meta-key">Peserta ${examType}</td>
              <td class="meta-colon">:</td>
              <td class="meta-val">
                <span>Kls 1 : <u>&nbsp;${escapeHtml(gradeCounts.kls1 || '....')}&nbsp;</u></span>&nbsp;&nbsp;
                <span>Kls 2 : <u>&nbsp;${escapeHtml(gradeCounts.kls2 || '....')}&nbsp;</u></span>&nbsp;&nbsp;
                <span>Kls 3 : <u>&nbsp;${escapeHtml(gradeCounts.kls3 || '....')}&nbsp;</u></span>&nbsp;&nbsp;
                <span>Kls 4 : <u>&nbsp;${escapeHtml(gradeCounts.kls4 || '....')}&nbsp;</u></span>&nbsp;&nbsp;
                <span>Kls 5 : <u>&nbsp;${escapeHtml(gradeCounts.kls5 || '....')}&nbsp;</u></span>&nbsp;&nbsp;
                <span>Kls 6 : <u>&nbsp;${escapeHtml(gradeCounts.kls6 || '....')}&nbsp;</u></span>
              </td>
            </tr>
            <tr>
              <td class="meta-key"></td>
              <td class="meta-colon"></td>
              <td class="meta-val">
                Jumlah siswa : <strong><u>&nbsp;${escapeHtml(gradeCounts.total || '..........')}&nbsp;</u></strong> siswa
              </td>
            </tr>
          </table>

          <!-- TABEL KELENGKAPAN ADMINISTRASI -->
          <table class="main-table">
            <thead>
              <tr>
                <th style="width: 30px; text-align:center;">No</th>
                <th style="width: 44%; text-align:left;">Kelengkapan Administrasi</th>
                <th style="width: 44px; text-align:center;">ada</th>
                <th style="width: 56px; text-align:center;">Tdk ada</th>
                <th style="text-align:left;">Ket/jumlah/ Bukti dukung</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <!-- HASIL MONITORING & CATATAN -->
          <div class="notes-block">
            <div class="note-row">
              <span class="note-label">Hasil monitoring</span>
              <span class="note-colon">:</span>
              <span class="note-content">${
                data.monitoring
                  ? `<span class="note-text">${escapeHtml(data.monitoring)}</span>`
                  : dottedLine
              }</span>
            </div>
            <div class="note-row">
              <span class="note-label">Catatan</span>
              <span class="note-colon">:</span>
              <span class="note-content">${
                data.notes
                  ? `<span class="note-text">${escapeHtml(data.notes)}</span>`
                  : dottedLine
              }</span>
            </div>
            ${dottedLine}
            ${dottedLine}
            ${dottedLine}
          </div>
        </div>

        <!-- TANDA TANGAN PENGAWAS & KEPALA MADRASAH -->
        <div class="sign-grid">
          <div class="sign-col">
            <div class="sign-role">${escapeHtml(draft.supervisorTitle)}</div>
            <div class="sign-gap"></div>
            <div class="sign-person">${escapeHtml(draft.supervisorName || '........................................')}</div>
            <div class="sign-nip">NIP. ${escapeHtml(draft.supervisorNip || '-')}</div>
          </div>
          <div class="sign-col">
            <div class="sign-role">${escapeHtml(draft.headmasterTitle)}</div>
            <div class="sign-gap"></div>
            <div class="sign-person">${
              draft.headmasterName
                ? escapeHtml(draft.headmasterName)
                : '........................................'
            }</div>
            <div class="sign-nip">NIP. ${escapeHtml(draft.headmasterNip || '....................................')}</div>
          </div>
        </div>
      </div>
    `;
  };

  const handlePrintInstruments = (subjectsToPrint: string[]) => {
    if (subjectsToPrint.length === 0) {
      showWarningToast('Pilih minimal 1 mata pelajaran untuk dicetak.');
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const isF4 = true;
    const pageW = '215mm';
    const pageH = '330mm';

    const pagesHtml = subjectsToPrint
      .map((subj) => buildSingleInstrumentPageHtml(subj, origin))
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <base href="${origin}/" />
        <title>Instrumen Pelaksanaan ${examType} (${subjectsToPrint.length} Mapel)</title>
        <style>
          @page {
            size: ${pageW} ${pageH};
            margin: 10mm 14mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            color: #000000;
            margin: 0;
            padding: 0;
            background: #e2e8f0;
            font-size: 10.5pt;
          }
          .instrument-page {
            width: ${isF4 ? '187mm' : '182mm'};
            min-height: ${isF4 ? '308mm' : '275mm'};
            margin: 14px auto;
            background: #ffffff;
            padding: 6mm 8mm;
            box-shadow: 0 4px 18px rgba(15,23,42,0.12);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
            break-after: page;
          }
          .instrument-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .kop-wrap {
            position: relative;
            min-height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding-bottom: 5px;
          }
          .kop-logo {
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 56px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .kop-logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .kop-texts {
            width: 100%;
            text-align: center;
            line-height: 1.25;
            padding: 0 60px;
          }
          .kop-texts.no-logo {
            padding: 0;
          }
          .kop-l1 { font-size: 11.5pt; font-weight: bold; }
          .kop-l2 { font-size: 11.5pt; font-weight: bold; }
          .kop-l3 { font-size: 11.5pt; font-weight: bold; }
          .kop-addr { font-size: 9pt; margin-top: 2px; }
          .blue-rule {
            height: 3.5px;
            background-color: #1d4ed8 !important;
            margin: 4px 0 10px 0;
          }
          .doc-title {
            text-align: center;
            font-weight: bold;
            font-size: 11.5pt;
            line-height: 1.3;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 10.5pt;
          }
          .meta-table td {
            padding: 2px 0;
            vertical-align: top;
          }
          .meta-key { width: 125px; }
          .meta-colon { width: 14px; text-align: center; }
          .meta-val { }
          .dots-span { letter-spacing: 0.6px; }
          .main-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            font-size: 10pt;
          }
          .main-table th, .main-table td {
            border: 1px solid #000000;
            padding: 4px 6px;
          }
          .main-table th {
            font-weight: bold;
            background-color: #f8fafc !important;
          }
          .col-no { text-align: center; }
          .col-label { }
          .col-check { text-align: center; font-weight: bold; font-size: 11pt; }
          .col-ket { font-size: 9.5pt; }
          .notes-block {
            margin-top: 8px;
            font-size: 10pt;
          }
          .note-row {
            display: flex;
            align-items: flex-end;
            margin-bottom: 9px;
          }
          .note-label { width: 115px; flex-shrink: 0; }
          .note-colon { width: 14px; text-align: center; flex-shrink: 0; }
          .note-content { flex: 1; }
          .note-text {
            display: block;
            border-bottom: 1px dotted #000000;
            padding-bottom: 1px;
          }
          .dot-fill {
            border-bottom: 1px dotted #000000;
            height: 18px;
            width: 100%;
            margin-bottom: 4px;
          }
          .sign-grid {
            display: flex;
            justify-content: space-between;
            padding: 0 28px;
            margin-top: 16px;
            font-size: 10.5pt;
            page-break-inside: avoid;
          }
          .sign-col {
            width: 230px;
          }
          .sign-role { font-weight: normal; }
          .sign-gap { height: 52px; }
          .sign-person { font-weight: bold; }
          .sign-nip { font-size: 10pt; }
          @media print {
            body { background: #ffffff !important; }
            .instrument-page {
              width: 100%;
              min-height: ${isF4 ? '304mm' : '272mm'};
              margin: 0;
              padding: 0;
              box-shadow: none;
            }
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
  // SUB-MENU PRINT HELPERS (UNTUK POIN-POIN KELENGKAPAN ADMINISTRASI)
  // =========================================================================
  const buildMadrasahKopHtml = (
    origin: string,
    docSubtitle: string,
    includeDocHeader = true
  ) => {
    return `
      ${buildOfficialKopHtml(origin, { compact: !includeDocHeader })}
      ${
        includeDocHeader
          ? `
        <div style="text-align:center;margin-bottom:14px;">
          <h3 style="margin:0;font-size:13.5px;text-transform:uppercase;text-decoration:underline;">${escapeHtml(docSubtitle)}</h3>
          <p style="margin:4px 0 0 0;font-size:11px;font-weight:bold;color:#047857;">${examType} &bull; ${escapeHtml(examConfigs[examType].semester)} &bull; ${escapeHtml(draft.academicYearLabel)}</p>
        </div>
      `
          : ''
      }
    `;
  };

  const printSubMenuDocument = (title: string, bodyHtml: string, landscape = false) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pageW = landscape ? '330mm' : '215mm';
    const pageH = landscape ? '215mm' : '330mm';
    const containerW = landscape ? '314mm' : '191mm';
    const containerMinH = landscape ? '199mm' : '306mm';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <base href="${origin}/" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: ${pageW} ${pageH} ${landscape ? 'landscape' : 'portrait'}; margin: ${landscape ? '8mm' : '12mm'}; }
          *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 11px; margin: 0; padding: 0; background: #e2e8f0; }
          .sub-doc-page {
            width: ${containerW};
            min-height: ${containerMinH};
            margin: 14px auto;
            padding: 8mm 10mm;
            background: #ffffff;
            box-shadow: 0 4px 18px rgba(15, 23, 42, 0.12);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          @media print {
            body { background: #ffffff !important; }
            .sub-doc-page { width: ${containerW}; min-height: 100vh; margin: 0; padding: 0; box-shadow: none; }
          }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #065f46 !important; color: #ffffff !important; padding: 7px 6px; border: 1px solid #065f46; font-size: 10px; text-transform: uppercase; }
          td { padding: 6px; border: 1px solid #cbd5e1; font-size: 10.5px; }
          tr:nth-child(even) td { background: #f8fafc !important; }
          .signs { display: flex; justify-content: space-between; padding: 0 24px; margin-top: 22px; page-break-inside: avoid; }
          .sign-box { text-align: center; width: 220px; }
          .sign-space { height: 72px; }
        </style>
      </head>
      <body>
        <div class="sub-doc-page">
          <div>
            ${buildMadrasahKopHtml(origin, title, true)}
            ${bodyHtml}
          </div>
        </div>
      </body>
      </html>
    `;
    printHtmlDocument(html);
  };

  const handlePrintSkPanitia = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const schoolDisplay = draft.madrasahName || settings.schoolName || 'MI Islamiyah Rowosari';
    const examFullTitle =
      examType === 'ASAS'
        ? 'Asesmen Sumatif Akhir Semester (ASAS)'
        : 'Asesmen Sumatif Akhir Tahun (ASAT)';
    const skDateFormatted = formatShortIndoDate(draft.skDate) || '-';
    const yearLabel = draft.academicYearLabel || 'TAHUN PELAJARAN 2026/2027';
    const headmasterDisplay = draft.headmasterName || settings.headmaster || 'Kepala Madrasah';
    const headmasterNipDisplay = draft.headmasterNip || settings.headmasterNip || '-';
    const headmasterTitleDisplay = draft.headmasterTitle || 'Kepala Madrasah';

    // Parse lines from skCommitteeText ("Jabatan : Nama (ket)" or plain text) into formal rows
    const committeeRows = draft.skCommitteeText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, idx) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > -1) {
          const role = line.slice(0, colonIdx).trim();
          const rest = line.slice(colonIdx + 1).trim();
          const parenMatch = rest.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
          const person = parenMatch ? parenMatch[1].trim() : rest;
          const note = parenMatch ? parenMatch[2].trim() : role;
          return { no: idx + 1, role, person, note };
        }
        return { no: idx + 1, role: 'Anggota Panitia', person: line, note: '-' };
      });

    const committeeTableRowsHtml =
      committeeRows.length > 0
        ? committeeRows
            .map(
              (row) => `
          <tr>
            <td style="text-align:center;width:28px;">${row.no}</td>
            <td style="font-weight:bold;width:28%;">${escapeHtml(row.role)}</td>
            <td style="width:42%;">${escapeHtml(row.person)}</td>
            <td>${escapeHtml(row.note)}</td>
          </tr>
        `
            )
            .join('')
        : '<tr><td colspan="4" style="text-align:center;padding:8px;">Susunan panitia belum diisi.</td></tr>';

    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <base href="${origin}/" />
        <title>SK Panitia ${examType} - ${escapeHtml(schoolDisplay)}</title>
        <style>
          @page { size: 215mm 330mm portrait; margin: 10mm; }
          *, *::before, *::after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            color: #000000;
            font-size: 9.8pt;
            line-height: 1.28;
            margin: 0;
            padding: 0;
            background: #e2e8f0;
          }
          .sk-page {
            width: 195mm;
            min-height: 310mm;
            margin: 12px auto;
            padding: 10mm;
            background: #ffffff;
            box-shadow: 0 4px 18px rgba(15, 23, 42, 0.12);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          @media print {
            body { background: #ffffff !important; }
            .sk-page {
              width: 100%;
              min-height: 100vh;
              margin: 0;
              padding: 0;
              box-shadow: none;
            }
          }
          .sk-title-block {
            text-align: center;
            font-weight: bold;
            margin: 2px 0 6px 0;
            line-height: 1.22;
          }
          .sk-title-main { font-size: 10.5pt; text-transform: uppercase; }
          .sk-number { font-size: 10pt; margin-bottom: 3px; }
          .sk-tentang { font-size: 10pt; margin-top: 2px; }
          .sk-subject { font-size: 10pt; text-transform: uppercase; }
          .sk-opening {
            text-align: center;
            font-weight: bold;
            margin: 5px 0 6px 0;
            line-height: 1.25;
            font-size: 9.8pt;
          }
          .konsideran-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4px;
          }
          .konsideran-table td {
            border: none;
            padding: 1.5px 0;
            vertical-align: top;
            text-align: justify;
            font-size: 9.5pt;
            line-height: 1.26;
          }
          .k-label { width: 92px; font-weight: bold; }
          .k-colon { width: 12px; text-align: center; }
          .k-list {
            width: 100%;
            border-collapse: collapse;
          }
          .k-list td {
            border: none;
            padding: 0.5px 0;
            vertical-align: top;
            text-align: justify;
          }
          .k-num { width: 16px; }
          .memutuskan {
            text-align: center;
            font-weight: bold;
            letter-spacing: 3px;
            margin: 5px 0 4px 0;
            font-size: 10.5pt;
          }
          .panitia-table {
            width: 100%;
            border-collapse: collapse;
            margin: 4px 0 4px 0;
            font-size: 9pt;
          }
          .panitia-table th, .panitia-table td {
            border: 1px solid #000000;
            padding: 3px 6px;
            vertical-align: middle;
            text-align: left;
            line-height: 1.2;
          }
          .panitia-table th {
            background-color: #f1f5f9 !important;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            font-size: 8.5pt;
          }
          .bottom-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 16px;
            margin-top: 10px;
            page-break-inside: avoid;
          }
          .tembusan {
            flex: 1;
            font-size: 8.5pt;
            line-height: 1.25;
          }
          .tembusan ol {
            margin: 2px 0 0 0;
            padding-left: 16px;
          }
          .sign-block {
            width: 245px;
            font-size: 9.5pt;
            line-height: 1.25;
            flex-shrink: 0;
          }
          .sign-meta {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 3px;
          }
          .sign-meta td {
            border: none;
            padding: 0.5px 0;
            vertical-align: top;
          }
          .sign-space { height: 42px; }
        </style>
      </head>
      <body>
        <!-- SK PANITIA 1 LEMBAR FORMAL (MARGIN 1 CM) -->
        <div class="sk-page">
          ${buildMadrasahKopHtml(origin, '', false)}

          <div class="sk-title-block">
            <div class="sk-title-main">KEPUTUSAN KEPALA ${escapeHtml(schoolDisplay.toUpperCase())}</div>
            <div class="sk-number">NOMOR : ${escapeHtml(draft.skNumber || '-')}</div>
            <div class="sk-tentang">TENTANG</div>
            <div class="sk-subject">PEMBENTUKAN PANITIA PENYELENGGARA ${escapeHtml(examFullTitle.toUpperCase())}</div>
            <div class="sk-subject">${escapeHtml(yearLabel.toUpperCase())}</div>
          </div>

          <div class="sk-opening">
            <div>DENGAN RAHMAT TUHAN YANG MAHA ESA</div>
            <div>KEPALA ${escapeHtml(schoolDisplay.toUpperCase())},</div>
          </div>

          <table class="konsideran-table">
            <tr>
              <td class="k-label">Menimbang</td>
              <td class="k-colon">:</td>
              <td>
                <table class="k-list">
                  <tr>
                    <td class="k-num">a.</td>
                    <td>bahwa demi kelancaran, ketertiban, dan akuntabilitas penyelenggaraan ${escapeHtml(examFullTitle)} (${examType}) ${escapeHtml(yearLabel)} pada ${escapeHtml(schoolDisplay)}, perlu dibentuk Panitia Penyelenggara;</td>
                  </tr>
                  <tr>
                    <td class="k-num">b.</td>
                    <td>bahwa nama-nama yang tercantum dalam keputusan ini dipandang cakap dan memenuhi syarat untuk melaksanakan tugas kepanitiaan dimaksud;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="k-label">Mengingat</td>
              <td class="k-colon">:</td>
              <td>
                <table class="k-list">
                  <tr>
                    <td class="k-num">1.</td>
                    <td>Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;</td>
                  </tr>
                  <tr>
                    <td class="k-num">2.</td>
                    <td>Peraturan Pemerintah Nomor 4 Tahun 2022 tentang Standar Nasional Pendidikan;</td>
                  </tr>
                  <tr>
                    <td class="k-num">3.</td>
                    <td>Permendikbudristek Nomor 21 Tahun 2022 tentang Standar Penilaian Pendidikan;</td>
                  </tr>
                  <tr>
                    <td class="k-num">4.</td>
                    <td>Keputusan Dirjen Pendis Kemenag RI tentang Pedoman Kalender Pendidikan Madrasah ${escapeHtml(yearLabel)};</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="k-label">Memperhatikan</td>
              <td class="k-colon">:</td>
              <td>Hasil Rapat Dinas Dewan Guru ${escapeHtml(schoolDisplay)} tentang Persiapan Pelaksanaan ${examType} ${escapeHtml(yearLabel)}.</td>
            </tr>
          </table>

          <div class="memutuskan">M E M U T U S K A N</div>

          <table class="konsideran-table">
            <tr>
              <td class="k-label">Menetapkan</td>
              <td class="k-colon">:</td>
              <td><strong>KEPUTUSAN KEPALA ${escapeHtml(schoolDisplay.toUpperCase())} TENTANG PEMBENTUKAN PANITIA PENYELENGGARA ${examType} ${escapeHtml(yearLabel.toUpperCase())}.</strong></td>
            </tr>
            <tr>
              <td class="k-label">KESATU</td>
              <td class="k-colon">:</td>
              <td>
                <div>Membentuk Panitia Penyelenggara ${escapeHtml(examFullTitle)} (${examType}) ${escapeHtml(yearLabel)} pada ${escapeHtml(schoolDisplay)} dengan susunan keanggotaan sebagai berikut:</div>
                <table class="panitia-table">
                  <thead>
                    <tr>
                      <th style="width:28px;">No</th>
                      <th style="width:28%;">Jabatan Kepanitiaan</th>
                      <th style="width:42%;">Nama Lengkap</th>
                      <th>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${committeeTableRowsHtml}
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td class="k-label">KEDUA</td>
              <td class="k-colon">:</td>
              <td>Panitia bertugas merencanakan, mempersiapkan administrasi, mengawasi pelaksanaan ujian, merekap nilai, dan melaporkan hasil kegiatan kepada Kepala Madrasah. Waktu pelaksanaan ${examType} diselenggarakan pada tanggal <strong>${escapeHtml(draft.periodLabel || examConfigs[examType]?.periodLabel || '-')}</strong>.</td>
            </tr>
            <tr>
              <td class="k-label">KETIGA</td>
              <td class="k-colon">:</td>
              <td>Segala biaya yang timbul akibat keputusan ini dibebankan pada anggaran madrasah yang sesuai ketentuan yang berlaku.</td>
            </tr>
            <tr>
              <td class="k-label">KEEMPAT</td>
              <td class="k-colon">:</td>
              <td>Keputusan ini berlaku sejak tanggal ditetapkan, dan apabila terdapat kekeliruan akan diperbaiki sebagaimana mestinya.</td>
            </tr>
          </table>

          <div class="bottom-row">
            <div class="tembusan">
              <div><strong><u>Tembusan</u></strong> disampaikan kepada Yth.:</div>
              <ol>
                <li>Pengawas Madrasah RA/MI Kemenag Kabupaten;</li>
                <li>Ketua Komite ${escapeHtml(schoolDisplay)};</li>
                <li>Yang bersangkutan untuk dilaksanakan;</li>
                <li>Arsip.</li>
              </ol>
            </div>

            <div class="sign-block">
              <table class="sign-meta">
                <tr>
                  <td style="width:82px;">Ditetapkan di</td>
                  <td style="width:10px;">:</td>
                  <td>Rowosari</td>
                </tr>
                <tr>
                  <td>Pada tanggal</td>
                  <td>:</td>
                  <td>${escapeHtml(skDateFormatted)}</td>
                </tr>
              </table>
              <div style="border-top:1px solid #000;padding-top:3px;font-weight:bold;">${escapeHtml(headmasterTitleDisplay)},</div>
              <div class="sign-space"></div>
              <div style="font-weight:bold;text-decoration:underline;">${escapeHtml(headmasterDisplay)}</div>
              <div>NIP. ${escapeHtml(headmasterNipDisplay)}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printHtmlDocument(html);
  };

  const handlePrintTataTertib = () => {
    const items = draft.tataTertibItems
      .map((it, i) => `<li style="margin-bottom:8px;">${escapeHtml(it)}</li>`)
      .join('');
    printSubMenuDocument(
      `TATA TERTIB PELAKSANAAN ${examType}`,
      `
        <div style="border:1.5px solid #065f46;border-radius:8px;padding:16px 20px;margin-bottom:18px;background:#ffffff;">
          <ol style="margin:0;padding-left:20px;font-size:12px;line-height:1.65;">${items}</ol>
        </div>
        <p style="text-align:right;margin:0 24px 6px 0;">Rowosari, ${formatShortIndoDate(draft.printDate || new Date().toLocaleDateString('en-CA'))}</p><div class="signs">
          <div class="sign-box">
            <p style="margin:0;">Mengetahui,</p>
            <p style="margin:2px 0 0 0;font-weight:bold;">${escapeHtml(draft.headmasterTitle)}</p>
            <div class="sign-space"></div>
            <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(draft.headmasterName || settings.headmaster)}</p>
            <p style="margin:2px 0 0 0;font-size:10px;">NIP. ${escapeHtml(draft.headmasterNip || settings.headmasterNip)}</p>
          </div>
          <div class="sign-box">
            <p style="margin:0;">Ketua Panitia ${examType}</p>
            <div class="sign-space"></div>
            <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(examConfigs[examType].committeeChair)}</p>
            <p style="margin:2px 0 0 0;font-size:10px;">NIP. ${escapeHtml(examConfigs[examType].committeeChairNip || '-')}</p>
          </div>
        </div>
      `
    );
  };

  // Helper to retrieve all scheduled or configured subjects for a class
  const getClassSubjectsList = (clsName: string) => {
    const schedItems = accessibleExamSchedules
      .filter((s) => s.examType === examType && s.className === clsName)
      .sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.timeStart.localeCompare(b.timeStart)));

    if (schedItems.length > 0) {
      const seen = new Set<string>();
      const list: { subject: string; date: string; dayDate: string; timeRange: string; room: string; supervisor: string }[] = [];
      schedItems.forEach((sc) => {
        const trimmed = sc.subject.trim();
        if (trimmed && !seen.has(trimmed)) {
          seen.add(trimmed);
          const dateStr = formatShortIndoDate(sc.date);
          const dayDate = sc.dayName ? `${sc.dayName}, ${dateStr}` : dateStr;
          const timeRange = sc.timeStart && sc.timeEnd ? `${sc.timeStart} - ${sc.timeEnd} WIB` : '';
          list.push({
            subject: trimmed, date: sc.date,
            dayDate,
            timeRange,
            room: sc.room || examConfigs[examType]?.defaultRoom || 'Ruang 01',
            supervisor: sc.supervisor || '( ........................................ )',
          });
        }
      });
      return list;
    }

    if (subjectEntries.length > 0) {
      return subjectEntries.map((se) => ({
        subject: se.subject, date: '',
        dayDate: se.dayDateLabel || '',
        timeRange: '07:30 - 09:00 WIB',
        room: examConfigs[examType]?.defaultRoom || 'Ruang 01',
        supervisor: '( ........................................ )',
      }));
    }

    return [
      'Al-Qur\'an Hadits',
      'Akidah Akhlak',
      'Fikih',
      'Sejarah Kebudayaan Islam',
      'Bahasa Arab',
      'Pendidikan Pancasila',
      'Bahasa Indonesia',
      'Matematika',
      'IPAS',
      'Bahasa Inggris',
      'Seni Budaya',
      'PJOK',
      'Bahasa Jawa',
    ].map((subj) => ({
      subject: subj,
      dayDate: '',
      timeRange: '07:30 - 09:00 WIB',
      room: examConfigs[examType]?.defaultRoom || 'Ruang 01',
      supervisor: '( ........................................ )',
    }));
  };

  const printMultiPageSubMenuDocument = (title: string, pagesHtml: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <base href="${origin}/" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page {
            size: 215mm 330mm portrait;
            margin: 12mm 14mm;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
            font-size: 11px;
            margin: 0;
            padding: 0;
            background: #e2e8f0;
          }
          .sub-doc-page {
            width: 187mm;
            min-height: 306mm;
            margin: 14px auto;
            padding: 6mm 8mm;
            background: #ffffff;
            box-shadow: 0 4px 18px rgba(15, 23, 42, 0.12);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
            break-after: page;
          }
          .sub-doc-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          @media print {
            body { background: #ffffff !important; }
            .sub-doc-page {
              width: 100%;
              min-height: 100vh;
              margin: 0;
              padding: 0;
              box-shadow: none;
            }
          }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          th {
            background: #065f46 !important;
            color: #ffffff !important;
            padding: 6px 5px;
            border: 1px solid #065f46;
            font-size: 9.5px;
            text-transform: uppercase;
            text-align: center;
          }
          td {
            padding: 5px 6px;
            border: 1px solid #cbd5e1;
            font-size: 10px;
          }
          tr:nth-child(even) td { background: #f8fafc !important; }
          .signs {
            display: flex;
            justify-content: space-between;
            padding: 0 20px;
            margin-top: 14px;
            page-break-inside: avoid;
          }
          .sign-box { text-align: center; width: 220px; }
          .sign-space { height: 72px; }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
      </html>
    `;
    printHtmlDocument(html);
  };

  const handlePrintDaftarHadir = () => {
    const classStudents = [...accessibleStudents.filter(
      (s) => s.className === subMenuClass && s.status === 'aktif'
    )].sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));
    const subjData = currentSubjectData;
    const prefix = examConfigs[examType]?.participantPrefix || 'ASAS';
    const classCode = subMenuClass.replace(/[^0-9A-Z]/gi, '').toUpperCase();
    const chairName = examConfigs[examType]?.committeeChair || draft.committeeChair || 'Ahmad Mustofa, S.Pd';
    const chairNip = examConfigs[examType]?.committeeChairNip || draft.committeeChairNip || '';

    const rows =
      classStudents.length > 0
        ? classStudents
            .map(
              (st, idx) => `
            <tr>
              <td style="text-align:center;width:32px;font-size:11.5px;">${idx + 1}</td>
              <td style="font-family:monospace;font-weight:bold;width:135px;text-align:center;font-size:11.5px;">${prefix}-${classCode}-${String(idx + 1).padStart(3, '0')}</td>
              <td style="font-family:monospace;width:105px;text-align:center;font-size:11.5px;">${escapeHtml(st.nisn || st.nis || '-')}</td>
              <td style="font-weight:bold;text-transform:uppercase;font-size:11.5px;">${escapeHtml(st.name)}</td>
              <td style="height:56px;width:120px;font-size:10.5px;">${idx % 2 === 0 ? `${idx + 1}. .............` : ''}</td>
              <td style="height:56px;width:120px;font-size:10.5px;">${idx % 2 === 1 ? `${idx + 1}. .............` : ''}</td>
            </tr>
          `
            )
            .join('')
        : '<tr><td colspan="6" style="text-align:center;padding:12px;font-size:11.5px;">Belum ada siswa aktif pada kelas ini.</td></tr>';

    printSubMenuDocument(
      `DAFTAR HADIR PESERTA ${examType} - ${subMenuClass.toUpperCase()} (${subjData.subject})`,
      `
        <div style="display:flex;justify-content:space-between;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:11.5px;">
          <div><strong>Kelas / Ruang:</strong> ${escapeHtml(subMenuClass)}</div>
          <div><strong>Mata Pelajaran:</strong> <u>${escapeHtml(subjData.subject)}</u></div>
          <div><strong>Hari/Tgl:</strong> ${escapeHtml(subjData.dayDate || '-')}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:32px;font-size:11px;">No</th>
              <th style="width:135px;font-size:11px;">No. Peserta</th>
              <th style="width:105px;font-size:11px;">NISN</th>
              <th style="font-size:11px;">Nama Peserta Didik</th>
              <th colspan="2" style="width:240px;font-size:11px;">Tanda Tangan</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="text-align:right;margin:0 24px 6px 0;font-size:11.5px;">Rowosari, ${formatShortIndoDate(draft.printDate || new Date().toLocaleDateString('en-CA'))}</p><div class="signs" style="font-size:11.5px;">
          <div class="sign-box">
            <p style="margin:0;">Mengetahui, Panitia ${examType}</p>
            <div class="sign-space"></div>
            <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(chairName)}</p>
            ${chairNip ? `<p style="margin:2px 0 0 0;font-size:10.5px;">NIP. ${escapeHtml(chairNip)}</p>` : ''}
          </div>
          <div class="sign-box">
            <p style="margin:0;">Pengawas Ruang,</p>
            <div class="sign-space"></div>
            <p style="margin:0;font-weight:bold;text-decoration:underline;">( ........................................ )</p>
          </div>
        </div>
      `
    );
  };

  // DAFTAR HADIR 1 LEMBAR PER KELAS (F4 LANDSCAPE 330x215mm): matriks siswa x sesi jadwal kelas itu sendiri
  const handlePrintDaftarHadirSatuLembar = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const classStudents = [...accessibleStudents.filter(
      (s) => s.className === subMenuClass && s.status === 'aktif'
    )].sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));
    if (classStudents.length === 0) {
      showWarningToast('Tidak ada siswa aktif di ' + subMenuClass + '.');
      return;
    }
    const subjects = getClassSubjectsList(subMenuClass);
    if (subjects.length === 0) {
      showWarningToast('Tidak ditemukan mata pelajaran untuk ' + subMenuClass + '.');
      return;
    }
    const chairName = examConfigs[examType]?.committeeChair || draft.committeeChair || 'Ahmad Mustofa, S.Pd';
    const chairNip = examConfigs[examType]?.committeeChairNip || draft.committeeChairNip || '';
    const headmasterDisplay = draft.headmasterName || settings.headmaster || 'H. Ahmad Muzakki, M.Pd.I';
    const headmasterNipDisplay = draft.headmasterNip || settings.headmasterNip || '';
    const headmasterTitleDisplay = draft.headmasterTitle || 'Kepala Madrasah';

    const n = subjects.length;
    const m = classStudents.length;

    const isDenseRows = m > 20;
    const pageMarginV = 4;
    const pageMarginH = 8;
    const signSpaceH = isDenseRows ? 26 : 32;

    // F4 Landscape = 330mm x 215mm
    const availableTbodyPx = isDenseRows ? 430 : 390;
    const rowH = Math.max(12, Math.min(36, Math.floor(availableTbodyPx / m)));

    const studentFs =
      m <= 12 ? '13px' : m <= 16 ? '12px' : m <= 20 ? '11px' : m <= 25 ? '10.5px' : '10px';
    const rowPadV = m <= 16 ? '2px' : '1px';
    const subjHeaderDateFs = n <= 10 ? '10px' : n <= 14 ? '9px' : '8.5px';
    const subjHeaderNameFs = n <= 10 ? '10.5px' : n <= 14 ? '9.5px' : '8.8px';

    const headCells = subjects
      .map((sj) => {
        const d = sj.date ? formatDMY(sj.date) : sj.dayDate;
        const day = (sj.dayDate || '').split(',')[0].slice(0, 3);
        return `<th style="font-size:${subjHeaderDateFs};padding:3px 2px;text-align:center;line-height:1.15;vertical-align:middle;">
          <div>${escapeHtml(day)}</div>
          <div style="font-weight:700;margin:1px 0;">${escapeHtml(d)}</div>
          <div style="font-size:${subjHeaderNameFs};font-weight:800;word-break:break-word;">${escapeHtml(sj.subject)}</div>
        </th>`;
      })
      .join('');

    const bodyRows = classStudents
      .map((st, idx) => {
        let cells = '';
        for (let k = 0; k < n; k++) {
          cells += `<td style="height:${rowH}px;padding:0 2px;"></td>`;
        }
        return `<tr>
          <td style="text-align:center;font-size:${studentFs};font-weight:700;padding:${rowPadV} 2px;height:${rowH}px;">${idx + 1}</td>
          <td style="font-weight:800;text-transform:uppercase;font-size:${studentFs};padding:${rowPadV} 6px;height:${rowH}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(st.name)}</td>
          ${cells}
        </tr>`;
      })
      .join('');

    const docTitle = `DAFTAR HADIR PESERTA ${examType} - ${subMenuClass.toUpperCase()} (F4 LANDSCAPE)`;
    const printDateFormatted = formatShortIndoDate(draft.printDate || new Date().toLocaleDateString('en-CA'));

    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <base href="${origin}/" />
        <title>${escapeHtml(docTitle)}</title>
        <style>
          @page {
            size: 330mm 215mm;
            margin: ${pageMarginV}mm ${pageMarginH}mm;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            background: #e2e8f0;
          }
          .f4-landscape-page {
            width: 330mm;
            height: 215mm;
            padding: ${pageMarginV}mm ${pageMarginH}mm;
            margin: 12px auto;
            background: #ffffff;
            box-shadow: 0 6px 24px rgba(15, 23, 42, 0.16);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          @media print {
            body { background: #ffffff !important; }
            .f4-landscape-page {
              width: 314mm;
              height: ${215 - pageMarginV * 2}mm;
              margin: 0;
              padding: 0;
              box-shadow: none;
              overflow: hidden;
            }
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin: 0;
          }
          th {
            background: #065f46 !important;
            color: #ffffff !important;
            border: 1px solid #065f46;
            text-transform: uppercase;
          }
          td {
            border: 1px solid #94a3b8;
            color: #0f172a;
          }
          tr:nth-child(even) td {
            background: #f8fafc !important;
          }
          .signs-wrap {
            margin-top: 4px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .signs {
            display: flex;
            justify-content: space-between;
            padding: 0 32px;
            font-size: 11.5px;
          }
          .sign-box {
            text-align: center;
            width: 250px;
          }
          .sign-space {
            height: ${signSpaceH}px;
          }
        </style>
      </head>
      <body>
        <div class="f4-landscape-page">
          <div>
            ${buildOfficialKopHtml(origin, { compact: true })}
            <div style="text-align:center;margin:1px 0 4px 0;">
              <h3 style="margin:0;font-size:15px;font-weight:800;text-transform:uppercase;text-decoration:underline;letter-spacing:0.3px;">DAFTAR HADIR PESERTA ${examType} &bull; ${escapeHtml(subMenuClass.toUpperCase())}</h3>
              <p style="margin:1px 0 0 0;font-size:11px;font-weight:700;color:#047857;">${examType} &bull; ${escapeHtml(examConfigs[examType].semester)} &bull; ${escapeHtml(draft.academicYearLabel)}</p>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:4px 10px;margin-bottom:4px;font-size:11px;">
              <div><strong>Kelas / Ruang:</strong> ${escapeHtml(subMenuClass)}</div>
              <div><strong>Waktu Pelaksanaan:</strong> ${escapeHtml(draft.periodLabel || '-')}</div>
              <div><strong>Jumlah Siswa:</strong> ${m} &nbsp;&bull;&nbsp; <strong>Jumlah Sesi/Mapel:</strong> ${n}</div>
            </div>
            <table>
              <colgroup>
                <col style="width:8mm;" />
                <col style="width:62mm;" />
                <col span="${n}" style="width:calc((100% - 70mm) / ${n});" />
              </colgroup>
              <thead>
                <tr>
                  <th rowspan="2" style="font-size:11px;padding:3px 2px;">No</th>
                  <th rowspan="2" style="font-size:11px;padding:3px 6px;">Nama Peserta Didik</th>
                  <th colspan="${n}" style="font-size:11px;padding:3px 6px;letter-spacing:0.3px;">Kehadiran / Tanda Tangan &mdash; ${escapeHtml(draft.periodLabel || '')}</th>
                </tr>
                <tr>${headCells}</tr>
              </thead>
              <tbody>${bodyRows}</tbody>
            </table>
          </div>
          <div class="signs-wrap">
            <p style="text-align:right;margin:0 32px 2px 0;font-size:11.5px;font-weight:600;">Rowosari, ${escapeHtml(printDateFormatted)}</p>
            <div class="signs">
              <div class="sign-box">
                <p style="margin:0;font-weight:600;">Mengetahui,</p>
                <p style="margin:1px 0 0 0;font-weight:600;">${escapeHtml(headmasterTitleDisplay)}</p>
                <div class="sign-space"></div>
                <p style="margin:0;font-weight:bold;text-decoration:underline;font-size:12px;">${escapeHtml(headmasterDisplay)}</p>
                ${headmasterNipDisplay ? `<p style="margin:1px 0 0 0;font-size:10.5px;">NIP. ${escapeHtml(headmasterNipDisplay)}</p>` : ''}
              </div>
              <div class="sign-box">
                <p style="margin:0;font-weight:600;">Ketua Panitia ${examType},</p>
                <div class="sign-space"></div>
                <p style="margin:0;font-weight:bold;text-decoration:underline;font-size:12px;">${escapeHtml(chairName)}</p>
                ${chairNip ? `<p style="margin:1px 0 0 0;font-size:10.5px;">NIP. ${escapeHtml(chairNip)}</p>` : ''}
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    printHtmlDocument(html);
  };

const handlePrintDaftarHadirSemuaMapel = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const classStudents = [...accessibleStudents.filter(
      (s) => s.className === subMenuClass && s.status === 'aktif'
    )].sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));
    if (classStudents.length === 0) {
      showWarningToast(`Tidak ada siswa aktif di ${subMenuClass}.`);
      return;
    }

    const subjects = getClassSubjectsList(subMenuClass);
    if (subjects.length === 0) {
      showWarningToast(`Tidak ditemukan mata pelajaran untuk ${subMenuClass}.`);
      return;
    }

    const prefix = examConfigs[examType]?.participantPrefix || 'ASAS';
    const classCode = subMenuClass.replace(/[^0-9A-Z]/gi, '').toUpperCase();
    const chairName = examConfigs[examType]?.committeeChair || draft.committeeChair || 'Ahmad Mustofa, S.Pd';
    const chairNip = examConfigs[examType]?.committeeChairNip || draft.committeeChairNip || '';

    const studentRowsHtml = classStudents
      .map(
        (st, idx) => `
        <tr>
          <td style="text-align:center;width:28px;">${idx + 1}</td>
          <td style="font-family:monospace;font-weight:bold;width:125px;text-align:center;">${prefix}-${classCode}-${String(idx + 1).padStart(3, '0')}</td>
          <td style="font-family:monospace;width:95px;text-align:center;">${escapeHtml(st.nisn || st.nis || '-')}</td>
          <td style="font-weight:bold;text-transform:uppercase;">${escapeHtml(st.name)}</td>
          <td style="height:56px;width:120px;font-size:9px;">${idx % 2 === 0 ? `${idx + 1}. .............` : ''}</td>
          <td style="height:56px;width:120px;font-size:9px;">${idx % 2 === 1 ? `${idx + 1}. .............` : ''}</td>
        </tr>
      `
      )
      .join('');

    const pagesHtml = subjects
      .map((subj) => {
        return `
        <div class="sub-doc-page">
          <div>
            ${buildMadrasahKopHtml(origin, `DAFTAR HADIR PESERTA ${examType} - ${escapeHtml(subMenuClass.toUpperCase())}`, true)}
            <div style="display:flex;justify-content:space-between;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;margin-bottom:10px;font-size:10px;">
              <div><strong>Kelas / Ruang:</strong> ${escapeHtml(subMenuClass)} / ${escapeHtml(subj.room)}</div>
              <div><strong>Mata Pelajaran:</strong> <u>${escapeHtml(subj.subject)}</u></div>
              <div><strong>Hari/Tgl:</strong> ${escapeHtml(subj.dayDate || '-')} ${subj.timeRange ? `(${escapeHtml(subj.timeRange)})` : ''}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width:28px;">No</th>
                  <th style="width:125px;">No. Peserta</th>
                  <th style="width:95px;">NISN</th>
                  <th>Nama Peserta Didik</th>
                  <th colspan="2" style="width:240px;">Tanda Tangan</th>
                </tr>
              </thead>
              <tbody>
                ${studentRowsHtml}
              </tbody>
            </table>
          </div>
          <p style="text-align:right;margin:0 24px 6px 0;">Rowosari, ${formatShortIndoDate(draft.printDate || new Date().toLocaleDateString('en-CA'))}</p><div class="signs">
            <div class="sign-box">
              <p style="margin:0;">Mengetahui, Panitia ${examType}</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(chairName)}</p>
              ${chairNip ? `<p style="margin:2px 0 0 0;font-size:9.5px;">NIP. ${escapeHtml(chairNip)}</p>` : ''}
            </div>
            <div class="sign-box">
              <p style="margin:0;">Pengawas Ruang,</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(subj.supervisor)}</p>
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    printMultiPageSubMenuDocument(
      `Daftar Hadir Semua Mapel ${examType} - ${subMenuClass} (${subjects.length} Mapel)`,
      pagesHtml
    );
  };

  const handlePrintBeritaAcara = () => {
    const classStudents = accessibleStudents.filter(
      (s) => s.className === subMenuClass && s.status === 'aktif'
    );
    const total = classStudents.length;
    const absent = Math.max(0, Math.min(total, Number(baAbsentCount) || 0));
    const present = Math.max(0, total - absent);
    const sched = accessibleExamSchedules.find(
      (s) => s.examType === examType && s.className === subMenuClass && s.subject === currentSubjectData.subject
    );
    const chairName = examConfigs[examType]?.committeeChair || draft.committeeChair || 'Ahmad Mustofa, S.Pd';
    const chairNip = examConfigs[examType]?.committeeChairNip || draft.committeeChairNip || '';

    printSubMenuDocument(
      `BERITA ACARA PELAKSANAAN ${examType}`,
      `
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:14px 16px;line-height:1.7;font-size:11px;">
          <p style="margin:0 0 10px 0;">Pada hari ini <strong>${escapeHtml(currentSubjectData.dayDate || '....................')}</strong> bertempat di <strong>${escapeHtml(draft.madrasahName)}</strong>, telah dilaksanakan <strong>${examType} (${escapeHtml(draft.academicYearLabel)})</strong> dengan rincian sebagai berikut:</p>
          <table>
            <tbody>
              <tr><td style="width:190px;"><strong>Mata Pelajaran</strong></td><td><strong>${escapeHtml(currentSubjectData.subject)}</strong></td></tr>
              <tr><td><strong>Kelas / Ruang Ujian</strong></td><td>${escapeHtml(subMenuClass)} / ${escapeHtml(sched?.room || examConfigs[examType].defaultRoom)}</td></tr>
              <tr><td><strong>Waktu Pelaksanaan</strong></td><td>${escapeHtml(sched ? `${sched.timeStart} - ${sched.timeEnd} WIB` : '07:30 - 09:00 WIB')}</td></tr>
              <tr><td><strong>Jumlah Peserta Seharusnya</strong></td><td><strong>${total}</strong> siswa</td></tr>
              <tr><td><strong>Jumlah Peserta Hadir</strong></td><td><strong>${present}</strong> siswa</td></tr>
              <tr><td><strong>Jumlah Peserta Tidak Hadir</strong></td><td><strong>${absent}</strong> siswa (${escapeHtml(baAbsentNames || '-')})</td></tr>
              <tr><td><strong>Catatan Selama Ujian</strong></td><td>${escapeHtml(draft.beritaAcaraNotes || 'Berjalan tertib dan lancar.')}</td></tr>
            </tbody>
          </table>
          <p style="margin:8px 0 0 0;">Demikian berita acara pelaksanaan ujian ini dibuat dengan sesungguhnya untuk digunakan sebagaimana mestinya.</p>
        </div>
        <p style="text-align:right;margin:0 24px 6px 0;">Rowosari, ${formatShortIndoDate(draft.printDate || new Date().toLocaleDateString('en-CA'))}</p><div class="signs">
          <div class="sign-box">
            <p style="margin:0;">Pengawas Ruang,</p>
            <div class="sign-space"></div>
            <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(sched?.supervisor || '( .................................... )')}</p>
          </div>
          <div class="sign-box">
            <p style="margin:0;">Ketua Panitia ${examType},</p>
            <div class="sign-space"></div>
            <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(chairName)}</p>
            ${chairNip ? `<p style="margin:2px 0 0 0;font-size:9.5px;">NIP. ${escapeHtml(chairNip)}</p>` : ''}
          </div>
        </div>
      `
    );
  };

  const handlePrintBeritaAcaraSemuaMapel = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const classStudents = accessibleStudents.filter(
      (s) => s.className === subMenuClass && s.status === 'aktif'
    );
    const total = classStudents.length;
    const absent = Math.max(0, Math.min(total, Number(baAbsentCount) || 0));
    const present = Math.max(0, total - absent);

    const subjects = getClassSubjectsList(subMenuClass);
    if (subjects.length === 0) {
      showWarningToast(`Tidak ditemukan mata pelajaran untuk ${subMenuClass}.`);
      return;
    }

    const chairName = examConfigs[examType]?.committeeChair || draft.committeeChair || 'Ahmad Mustofa, S.Pd';
    const chairNip = examConfigs[examType]?.committeeChairNip || draft.committeeChairNip || '';

    const pagesHtml = subjects
      .map((subj) => {
        return `
        <div class="sub-doc-page">
          <div>
            ${buildMadrasahKopHtml(origin, `BERITA ACARA PELAKSANAAN ${examType}`, true)}
            <div style="border:1px solid #cbd5e1;border-radius:8px;padding:12px 14px;line-height:1.65;font-size:10.5px;">
              <p style="margin:0 0 8px 0;">Pada hari ini <strong>${escapeHtml(subj.dayDate || '....................')}</strong> bertempat di <strong>${escapeHtml(draft.madrasahName)}</strong>, telah dilaksanakan <strong>${examType} (${escapeHtml(draft.academicYearLabel)})</strong> dengan rincian sebagai berikut:</p>
              <table>
                <tbody>
                  <tr><td style="width:190px;"><strong>Mata Pelajaran</strong></td><td><strong>${escapeHtml(subj.subject)}</strong></td></tr>
                  <tr><td><strong>Kelas / Ruang Ujian</strong></td><td>${escapeHtml(subMenuClass)} / ${escapeHtml(subj.room)}</td></tr>
                  <tr><td><strong>Waktu Pelaksanaan</strong></td><td>${escapeHtml(subj.timeRange || '07:30 - 09:00 WIB')}</td></tr>
                  <tr><td><strong>Jumlah Peserta Seharusnya</strong></td><td><strong>${total}</strong> siswa</td></tr>
                  <tr><td><strong>Jumlah Peserta Hadir</strong></td><td><strong>${present}</strong> siswa</td></tr>
                  <tr><td><strong>Jumlah Peserta Tidak Hadir</strong></td><td><strong>${absent}</strong> siswa (${escapeHtml(baAbsentNames || '-')})</td></tr>
                  <tr><td><strong>Catatan Selama Ujian</strong></td><td>${escapeHtml(draft.beritaAcaraNotes || 'Berjalan tertib, aman, dan lancar.')}</td></tr>
                </tbody>
              </table>
              <p style="margin:6px 0 0 0;">Demikian berita acara pelaksanaan ujian ini dibuat dengan sesungguhnya untuk digunakan sebagaimana mestinya.</p>
            </div>
          </div>
          <p style="text-align:right;margin:0 24px 6px 0;">Rowosari, ${formatShortIndoDate(draft.printDate || new Date().toLocaleDateString('en-CA'))}</p><div class="signs">
            <div class="sign-box">
              <p style="margin:0;">Pengawas Ruang,</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(subj.supervisor)}</p>
            </div>
            <div class="sign-box">
              <p style="margin:0;">Ketua Panitia ${examType},</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(chairName)}</p>
              ${chairNip ? `<p style="margin:2px 0 0 0;font-size:9.5px;">NIP. ${escapeHtml(chairNip)}</p>` : ''}
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    printMultiPageSubMenuDocument(
      `Berita Acara Semua Mapel ${examType} - ${subMenuClass} (${subjects.length} Mapel)`,
      pagesHtml
    );
  };

  const handlePrintDaftarNilai = () => {
    const classStudents = accessibleStudents.filter(
      (s) => s.className === subMenuClass && s.status === 'aktif'
    );
    const rows =
      classStudents.length > 0
        ? classStudents
            .map(
              (st, idx) => `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td style="font-family:monospace;text-align:center;">${escapeHtml(st.nisn || st.nis || '-')}</td>
            <td style="font-weight:bold;text-transform:uppercase;">${escapeHtml(st.name)}</td>
            <td style="text-align:center;">${st.gender}</td>
            <td style="text-align:center;font-weight:bold;">${escapeHtml(scoreMap[st.id] || '')}</td>
            <td></td>
          </tr>
        `
            )
            .join('')
        : '<tr><td colspan="6" style="text-align:center;padding:12px;">Belum ada siswa aktif pada kelas ini.</td></tr>';

    printSubMenuDocument(
      `DAFTAR NILAI ${examType} - ${subMenuClass.toUpperCase()} (${currentSubjectData.subject})`,
      `
        <div style="display:flex;justify-content:space-between;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:10.5px;">
          <div><strong>Kelas:</strong> ${escapeHtml(subMenuClass)}</div>
          <div><strong>Mata Pelajaran:</strong> <u>${escapeHtml(currentSubjectData.subject)}</u></div>
          <div><strong>Tanggal:</strong> ${escapeHtml(currentSubjectData.dayDate || '-')}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:28px;">No</th>
              <th style="width:95px;">NISN</th>
              <th>Nama Siswa</th>
              <th style="width:40px;">L/P</th>
              <th style="width:80px;">Nilai</th>
              <th style="width:120px;">Keterangan</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="text-align:right;margin:0 24px 6px 0;">Rowosari, ${formatShortIndoDate(draft.printDate || new Date().toLocaleDateString('en-CA'))}</p><div class="signs">
          <div class="sign-box">
            <p style="margin:0;">Mengetahui, ${escapeHtml(draft.headmasterTitle)}</p>
            <div class="sign-space"></div>
            <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(draft.headmasterName || settings.headmaster)}</p>
          </div>
          <div class="sign-box">
            <p style="margin:0;">Guru Mata Pelajaran / Wali Kelas,</p>
            <div class="sign-space"></div>
            <p style="margin:0;font-weight:bold;text-decoration:underline;">( ........................................ )</p>
          </div>
        </div>
      `
    );
  };

  const handlePrintDaftarNilaiSemuaMapel = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const classStudents = accessibleStudents.filter(
      (s) => s.className === subMenuClass && s.status === 'aktif'
    );
    if (classStudents.length === 0) {
      showWarningToast(`Tidak ada siswa aktif di ${subMenuClass}.`);
      return;
    }

    const subjects = getClassSubjectsList(subMenuClass);
    if (subjects.length === 0) {
      showWarningToast(`Tidak ditemukan mata pelajaran untuk ${subMenuClass}.`);
      return;
    }

    const headmasterName = draft.headmasterName || settings.headmaster || 'Kepala Madrasah';
    const headmasterTitle = draft.headmasterTitle || 'Kepala Madrasah';

    const pagesHtml = subjects
      .map((subj) => {
        const rows = classStudents
          .map(
            (st, idx) => `
            <tr>
              <td style="text-align:center;width:28px;">${idx + 1}</td>
              <td style="font-family:monospace;width:95px;text-align:center;">${escapeHtml(st.nisn || st.nis || '-')}</td>
              <td style="font-weight:bold;text-transform:uppercase;">${escapeHtml(st.name)}</td>
              <td style="text-align:center;width:40px;">${st.gender}</td>
              <td style="text-align:center;font-weight:bold;width:75px;">${subj.subject === currentSubjectData.subject ? escapeHtml(scoreMap[st.id] || '') : ''}</td>
              <td style="width:110px;"></td>
            </tr>
          `
          )
          .join('');

        return `
        <div class="sub-doc-page">
          <div>
            ${buildMadrasahKopHtml(origin, `DAFTAR NILAI ${examType} - ${escapeHtml(subMenuClass.toUpperCase())}`, true)}
            <div style="display:flex;justify-content:space-between;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;margin-bottom:10px;font-size:10px;">
              <div><strong>Kelas:</strong> ${escapeHtml(subMenuClass)}</div>
              <div><strong>Mata Pelajaran:</strong> <u>${escapeHtml(subj.subject)}</u></div>
              <div><strong>Tanggal:</strong> ${escapeHtml(subj.dayDate || '-')}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width:28px;">No</th>
                  <th style="width:95px;">NISN</th>
                  <th>Nama Siswa</th>
                  <th style="width:40px;">L/P</th>
                  <th style="width:75px;">Nilai</th>
                  <th style="width:110px;">Keterangan</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <p style="text-align:right;margin:0 24px 6px 0;">Rowosari, ${formatShortIndoDate(draft.printDate || new Date().toLocaleDateString('en-CA'))}</p><div class="signs">
            <div class="sign-box">
              <p style="margin:0;">Mengetahui, ${escapeHtml(headmasterTitle)}</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(headmasterName)}</p>
            </div>
            <div class="sign-box">
              <p style="margin:0;">Guru Pengampu / Wali Kelas,</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">( ........................................ )</p>
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    printMultiPageSubMenuDocument(
      `Daftar Nilai Semua Mapel ${examType} - ${subMenuClass} (${subjects.length} Mapel)`,
      pagesHtml
    );
  };

  const handlePrintRab = () => {
    const total = draft.rabItems.reduce(
      (sum, item) => sum + (Number(item.volume) || 0) * (Number(item.hargaSatuan) || 0),
      0
    );
    const rows = draft.rabItems
      .map((item, idx) => {
        const sub = (Number(item.volume) || 0) * (Number(item.hargaSatuan) || 0);
        return `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>${escapeHtml(item.uraian)}</td>
            <td style="text-align:center;">${escapeHtml(item.volume)} ${escapeHtml(item.satuan)}</td>
            <td style="text-align:right;">${formatRupiah(item.hargaSatuan)}</td>
            <td style="text-align:right;font-weight:bold;">${formatRupiah(sub)}</td>
          </tr>
        `;
      })
      .join('');

    printSubMenuDocument(
      `RENCANA ANGGARAN BIAYA (RAB) ${examType}`,
      `
        <table>
          <thead>
            <tr>
              <th style="width:28px;">No</th>
              <th>Uraian Kebutuhan / Kegiatan</th>
              <th style="width:95px;">Volume</th>
              <th style="width:110px;">Harga Satuan</th>
              <th style="width:115px;">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr>
              <td colspan="4" style="text-align:right;font-weight:bold;background:#ecfdf5 !important;">TOTAL ANGGARAN ${examType}</td>
              <td style="text-align:right;font-weight:bold;background:#ecfdf5 !important;color:#065f46;">${formatRupiah(total)}</td>
            </tr>
          </tbody>
        </table>
        <p style="text-align:right;margin:0 24px 6px 0;">Rowosari, ${formatShortIndoDate(draft.printDate || new Date().toLocaleDateString('en-CA'))}</p><div class="signs">
          <div class="sign-box">
            <p style="margin:0;">Mengetahui, ${escapeHtml(draft.headmasterTitle)}</p>
            <div class="sign-space"></div>
            <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(draft.headmasterName || settings.headmaster)}</p>
          </div>
          <div class="sign-box">
            <p style="margin:0;">Ketua Panitia ${examType},</p>
            <div class="sign-space"></div>
            <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(examConfigs[examType].committeeChair)}</p>
          </div>
        </div>
      `
    );
  };

  const handlePrintBellSchedule = () => {
    const rows = draft.bellSchedule
      .map(
        (b, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="font-weight:bold;">${escapeHtml(b.signal)}</td>
        <td>${escapeHtml(b.timing)}</td>
        <td>${escapeHtml(b.meaning)}</td>
      </tr>
    `
      )
      .join('');
    printSubMenuDocument(
      `TANDA WAKTU / JADWAL BEL PELAKSANAAN ${examType}`,
      `
        <table>
          <thead>
            <tr>
              <th style="width:28px;">No</th>
              <th style="width:140px;">Kode / Bunyi Bel</th>
              <th style="width:180px;">Waktu Pelaksanaan</th>
              <th>Keterangan / Instruksi</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `
    );
  };

  const handlePrintAllInstrumentsBatch = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const schoolDisplay = draft.madrasahName || settings.schoolName || 'MI Islamiyah Rowosari';
    const examFullTitle =
      examType === 'ASAS'
        ? 'Asesmen Sumatif Akhir Semester (ASAS)'
        : 'Asesmen Sumatif Akhir Tahun (ASAT)';
    const skDateFormatted = formatShortIndoDate(draft.skDate) || '-';
    const yearLabel = draft.academicYearLabel || 'TAHUN PELAJARAN 2026/2027';
    const headmasterDisplay = draft.headmasterName || settings.headmaster || 'Kepala Madrasah';
    const headmasterNipDisplay = draft.headmasterNip || settings.headmasterNip || '-';

    // SK Panitia rows
    const committeeRows = draft.skCommitteeText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, idx) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > -1) {
          const role = line.slice(0, colonIdx).trim();
          const rest = line.slice(colonIdx + 1).trim();
          const parenMatch = rest.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
          const person = parenMatch ? parenMatch[1].trim() : rest;
          const note = parenMatch ? parenMatch[2].trim() : role;
          return { no: idx + 1, role, person, note };
        }
        return { no: idx + 1, role: 'Anggota Panitia', person: line, note: '-' };
      });

    const committeeTableRowsHtml =
      committeeRows.length > 0
        ? committeeRows
            .map(
              (row) => `
          <tr>
            <td style="text-align:center;width:28px;">${row.no}</td>
            <td style="font-weight:bold;width:28%;">${escapeHtml(row.role)}</td>
            <td style="width:42%;">${escapeHtml(row.person)}</td>
            <td>${escapeHtml(row.note)}</td>
          </tr>
        `
            )
            .join('')
        : '<tr><td colspan="4" style="text-align:center;padding:8px;">Susunan panitia belum diisi.</td></tr>';

    const classStudents = [...accessibleStudents.filter(
      (s) => s.className === subMenuClass && s.status === 'aktif'
    )].sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));
    const subjData = currentSubjectData;
    const prefix = examConfigs[examType].participantPrefix;
    const classCode = subMenuClass.replace(/[^0-9A-Z]/gi, '').toUpperCase();

    const daftarHadirRows =
      classStudents.length > 0
        ? classStudents
            .map(
              (st, idx) => `
            <tr>
              <td style="text-align:center;">${idx + 1}</td>
              <td style="font-family:monospace;font-weight:bold;">${prefix}-${classCode}-${String(idx + 1).padStart(3, '0')}</td>
              <td style="font-family:monospace;">${escapeHtml(st.nisn || st.nis || '-')}</td>
              <td style="font-weight:bold;text-transform:uppercase;">${escapeHtml(st.name)}</td>
              <td style="height:24px;">${idx % 2 === 0 ? `${idx + 1}. ..............` : ''}</td>
              <td style="height:24px;">${idx % 2 === 1 ? `${idx + 1}. ..............` : ''}</td>
            </tr>
          `
            )
            .join('')
        : '<tr><td colspan="6" style="text-align:center;padding:12px;">Belum ada siswa aktif pada kelas ini.</td></tr>';

    const daftarNilaiRows =
      classStudents.length > 0
        ? classStudents
            .map(
              (st, idx) => `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td style="font-family:monospace;">${escapeHtml(st.nisn || st.nis || '-')}</td>
            <td style="font-weight:bold;text-transform:uppercase;">${escapeHtml(st.name)}</td>
            <td style="text-align:center;">${escapeHtml(st.gender)}</td>
            <td style="text-align:center;"></td>
            <td></td>
          </tr>
        `
            )
            .join('')
        : '<tr><td colspan="6" style="text-align:center;padding:12px;">Belum ada siswa aktif pada kelas ini.</td></tr>';

    const rabTotal = draft.rabItems.reduce(
      (sum, item) => sum + (Number(item.volume) || 0) * (Number(item.hargaSatuan) || 0),
      0
    );
    const rabRows = draft.rabItems
      .map((item, idx) => {
        const sub = (Number(item.volume) || 0) * (Number(item.hargaSatuan) || 0);
        return `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>${escapeHtml(item.uraian)}</td>
            <td style="text-align:center;">${escapeHtml(item.volume)} ${escapeHtml(item.satuan)}</td>
            <td style="text-align:right;">${formatRupiah(item.hargaSatuan)}</td>
            <td style="text-align:right;font-weight:bold;">${formatRupiah(sub)}</td>
          </tr>
        `;
      })
      .join('');

    const bellRows = draft.bellSchedule
      .map(
        (b, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="font-weight:bold;">${escapeHtml(b.signal)}</td>
        <td>${escapeHtml(b.timing)}</td>
        <td>${escapeHtml(b.meaning)}</td>
      </tr>
    `
      )
      .join('');

    const batchHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <base href="${origin}/" />
        <title>Batch Instrumen ${examType} - ${escapeHtml(subMenuClass)}</title>
        <style>
          @page { size: 215mm 330mm; margin: 12mm; }
          *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 11px; margin: 0; padding: 0; }
          .doc-section {
            page-break-after: always;
            break-after: page;
            min-height: 306mm;
            width: 191mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding-bottom: 10mm;
          }
          .doc-section:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
          th { background: #065f46 !important; color: #ffffff !important; padding: 7px 6px; border: 1px solid #065f46; font-size: 10px; text-transform: uppercase; }
          td { padding: 6px; border: 1px solid #cbd5e1; font-size: 10.5px; }
          tr:nth-child(even) td { background: #f8fafc !important; }
          .signs { display: flex; justify-content: space-between; padding: 0 24px; margin-top: 20px; page-break-inside: avoid; }
          .sign-box { text-align: center; width: 220px; font-size: 11px; }
          .sign-space { height: 48px; }
        </style>
      </head>
      <body>

        <!-- 1. SK Panitia (Strictly 1 Page) -->
        <div class="doc-section" style="font-family: 'Times New Roman', Times, serif; font-size: 9.8pt; line-height: 1.25;">
          <div>
            ${buildMadrasahKopHtml(origin, '', false)}
            <div style="text-align: center; font-weight: bold; margin: 2px 0 6px 0;">
              <div style="font-size: 10.5pt; text-transform: uppercase;">KEPUTUSAN KEPALA ${escapeHtml(schoolDisplay.toUpperCase())}</div>
              <div style="font-size: 10pt; margin-bottom: 3px;">NOMOR : ${escapeHtml(draft.skNumber || '-')}</div>
              <div style="font-size: 10pt; margin-top: 2px;">TENTANG</div>
              <div style="font-size: 10pt; text-transform: uppercase;">PEMBENTUKAN PANITIA PENYELENGGARA ${escapeHtml(examFullTitle.toUpperCase())}</div>
              <div style="font-size: 10pt; text-transform: uppercase;">${escapeHtml(yearLabel.toUpperCase())}</div>
            </div>
            <div style="text-align: center; font-weight: bold; margin: 4px 0 5px 0; font-size: 9.8pt;">KEPALA ${escapeHtml(schoolDisplay.toUpperCase())}</div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
              <tr><td style="width: 85px; font-weight: bold; vertical-align: top; border:none; padding:1px 0;">Menimbang</td><td style="width: 12px; text-align: center; vertical-align: top; border:none;">:</td><td style="border:none; padding:1px 0; text-align:justify;">Untuk kelancaran penyelenggaraan ${escapeHtml(examFullTitle)} ${escapeHtml(yearLabel)}, dipandang perlu menetapkan Panitia Penyelenggara.</td></tr>
              <tr><td style="font-weight: bold; vertical-align: top; border:none; padding:1px 0;">Mengingat</td><td style="text-align: center; vertical-align: top; border:none;">:</td><td style="border:none; padding:1px 0; text-align:justify;">1. Undang-Undang Nomor 20 Tahun 2003 tentang Sisdiknas.<br>2. Program Kerja Madrasah Tahun Pelajaran ${escapeHtml(draft.academicYearLabel)}.</td></tr>
            </table>
            <div style="text-align: center; font-weight: bold; letter-spacing: 3px; margin: 4px 0 3px 0; font-size: 10pt;">MEMUTUSKAN</div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
              <tr><td style="width: 85px; font-weight: bold; vertical-align: top; border:none; padding:1px 0;">Menetapkan</td><td style="text-align: center; vertical-align: top; border:none;">:</td><td style="border:none; padding:1px 0;">KEPUTUSAN KEPALA ${escapeHtml(schoolDisplay.toUpperCase())} TENTANG SUSUNAN PANITIA PENYELENGGARA ${escapeHtml(examFullTitle.toUpperCase())} ${escapeHtml(yearLabel)}.</td></tr>
              <tr><td style="font-weight: bold; vertical-align: top; border:none; padding:1px 0;">PERTAMA</td><td style="text-align: center; vertical-align: top; border:none;">:</td><td style="border:none; padding:1px 0; text-align:justify;">Membentuk Panitia Penyelenggara ${escapeHtml(examType)} dengan susunan sebagaimana tercantum dalam lampiran keputusan ini.</td></tr>
              <tr><td style="font-weight: bold; vertical-align: top; border:none; padding:1px 0;">KEDUA</td><td style="text-align: center; vertical-align: top; border:none;">:</td><td style="border:none; padding:1px 0; text-align:justify;">Waktu pelaksanaan ujian: <strong>${escapeHtml(draft.periodLabel || '-')}</strong>.</td></tr>
              <tr><td style="font-weight: bold; vertical-align: top; border:none; padding:1px 0;">KETIGA</td><td style="text-align: center; vertical-align: top; border:none;">:</td><td style="border:none; padding:1px 0; text-align:justify;">Segala biaya yang timbul dibebankan pada anggaran yang relevan.</td></tr>
              <tr><td style="font-weight: bold; vertical-align: top; border:none; padding:1px 0;">KEEMPAT</td><td style="text-align: center; vertical-align: top; border:none;">:</td><td style="border:none; padding:1px 0; text-align:justify;">Keputusan ini berlaku sejak tanggal ditetapkan.</td></tr>
            </table>
            <div style="text-align: right; margin-top: 4px; font-size: 9.5pt;">
              <div>Ditetapkan di : Rowosari</div>
              <div>Pada tanggal : ${escapeHtml(skDateFormatted)}</div>
              <div style="font-weight: bold; margin-top: 2px;">Kepala Madrasah</div>
              <div style="height: 35px;"></div>
              <div style="font-weight: bold; text-decoration: underline;">${escapeHtml(headmasterDisplay)}</div>
              <div>NIP. ${escapeHtml(headmasterNipDisplay)}</div>
            </div>
            <div style="page-break-before: always; margin-top: 10px;">
              <div style="text-align: center; font-size: 9.5pt; font-weight: bold; margin-bottom: 4px;">LAMPIRAN: KEPUTUSAN KEPALA ${escapeHtml(schoolDisplay.toUpperCase())}<br>NOMOR: ${escapeHtml(draft.skNumber || '-')} &bull; TANGGAL: ${escapeHtml(skDateFormatted)}</div>
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
                <thead>
                  <tr>
                    <th style="background: #f1f5f9 !important; color: #000 !important; border: 1px solid #000; padding: 3px; text-align: center;">No</th>
                    <th style="background: #f1f5f9 !important; color: #000 !important; border: 1px solid #000; padding: 3px;">Jabatan dalam Panitia</th>
                    <th style="background: #f1f5f9 !important; color: #000 !important; border: 1px solid #000; padding: 3px;">Nama Personil</th>
                    <th style="background: #f1f5f9 !important; color: #000 !important; border: 1px solid #000; padding: 3px;">Keterangan</th>
                  </tr>
                </thead>
                <tbody>${committeeTableRowsHtml}</tbody>
              </table>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 8.5pt; margin-top: 10px;">
            <div>Tembusan disampaikan kepada Yth:<br>1. Ketua Yayasan<br>2. Pengawas Madrasah<br>3. Arsip</div>
            <div style="text-align: center; width: 200px;">
              <div>Kepala Madrasah</div>
              <div style="height: 32px;"></div>
              <div style="font-weight: bold; text-decoration: underline;">${escapeHtml(headmasterDisplay)}</div>
            </div>
          </div>
        </div>

        <!-- 2. Tata Tertib -->
        <div class="doc-section">
          <div>
            ${buildMadrasahKopHtml(origin, `TATA TERTIB PELAKSANAAN ${examType}`, true)}
            <div style="border:1.5px solid #065f46;border-radius:8px;padding:16px 20px;margin-bottom:18px;background:#ffffff;">
              <ol style="margin:0;padding-left:20px;font-size:12px;line-height:1.65;">
                ${draft.tataTertibItems.map((it) => `<li style="margin-bottom:8px;">${escapeHtml(it)}</li>`).join('')}
              </ol>
            </div>
          </div>
          <p style="text-align:right;margin:0 24px 6px 0;">Rowosari, ${formatShortIndoDate(draft.printDate || new Date().toLocaleDateString('en-CA'))}</p><div class="signs">
            <div class="sign-box">
              <p style="margin:0;">Mengetahui,</p>
              <p style="margin:2px 0 0 0;font-weight:bold;">${escapeHtml(draft.headmasterTitle)}</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(draft.headmasterName || settings.headmaster)}</p>
              <p style="margin:2px 0 0 0;font-size:10px;">NIP. ${escapeHtml(draft.headmasterNip || settings.headmasterNip)}</p>
            </div>
            <div class="sign-box">
              <p style="margin:0;">Ketua Panitia ${examType}</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(examConfigs[examType].committeeChair)}</p>
              <p style="margin:2px 0 0 0;font-size:10px;">NIP. ${escapeHtml(examConfigs[examType].committeeChairNip || '-')}</p>
            </div>
          </div>
        </div>

        <!-- 3. Daftar Hadir -->
        <div class="doc-section">
          <div>
            ${buildMadrasahKopHtml(origin, `DAFTAR HADIR PESERTA ${examType} - ${subMenuClass.toUpperCase()}`, true)}
            <div style="display:flex;justify-content:space-between;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:10.5px;">
              <div><strong>Kelas / Ruang:</strong> ${escapeHtml(subMenuClass)}</div>
              <div><strong>Mata Pelajaran:</strong> ${escapeHtml(subjData.subject)}</div>
              <div><strong>Hari/Tgl:</strong> ${escapeHtml(subjData.dayDate || '-')}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width:28px;">No</th>
                  <th style="width:130px;">No. Peserta</th>
                  <th style="width:85px;">NISN</th>
                  <th>Nama Peserta Didik</th>
                  <th colspan="2" style="width:170px;">Tanda Tangan</th>
                </tr>
              </thead>
              <tbody>${daftarHadirRows}</tbody>
            </table>
          </div>
          <p style="text-align:right;margin:0 24px 6px 0;">Rowosari, ${formatShortIndoDate(draft.printDate || new Date().toLocaleDateString('en-CA'))}</p><div class="signs">
            <div class="sign-box">
              <p style="margin:0;">Mengetahui, Panitia ${examType}</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(examConfigs[examType].committeeChair)}</p>
            </div>
            <div class="sign-box">
              <p style="margin:0;">Pengawas Ruang,</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">( ........................................ )</p>
            </div>
          </div>
        </div>

        <!-- 4. Berita Acara -->
        <div class="doc-section">
          <div>
            ${buildMadrasahKopHtml(origin, `BERITA ACARA PELAKSANAAN ${examType}`, true)}
            <div style="border:1px solid #cbd5e1;border-radius:8px;padding:14px 16px;line-height:1.7;font-size:11px;">
              <p style="margin:0 0 10px 0;">Pada hari ini <strong>${escapeHtml(currentSubjectData.dayDate || '....................')}</strong> bertempat di <strong>${escapeHtml(draft.madrasahName)}</strong>, telah dilaksanakan <strong>${examType} (${escapeHtml(draft.academicYearLabel)})</strong> dengan rincian sebagai berikut:</p>
              <table>
                <tbody>
                  <tr><td style="width:190px;"><strong>Mata Pelajaran</strong></td><td>${escapeHtml(currentSubjectData.subject)}</td></tr>
                  <tr><td><strong>Kelas / Ruang Ujian</strong></td><td>${escapeHtml(subMenuClass)} / ${escapeHtml(examConfigs[examType].defaultRoom)}</td></tr>
                  <tr><td><strong>Waktu Pelaksanaan</strong></td><td>07:30 - 09:00 WIB</td></tr>
                  <tr><td><strong>Jumlah Peserta Seharusnya</strong></td><td><strong>${classStudents.length}</strong> siswa</td></tr>
                  <tr><td><strong>Jumlah Peserta Hadir</strong></td><td><strong>${classStudents.length}</strong> siswa</td></tr>
                  <tr><td><strong>Jumlah Peserta Tidak Hadir</strong></td><td><strong>0</strong> siswa</td></tr>
                  <tr><td><strong>Catatan Selama Ujian</strong></td><td>${escapeHtml(draft.beritaAcaraNotes || 'Berjalan tertib dan lancar.')}</td></tr>
                </tbody>
              </table>
              <p style="margin:8px 0 0 0;">Demikian berita acara pelaksanaan ujian ini dibuat dengan sesungguhnya untuk digunakan sebagaimana mestinya.</p>
            </div>
          </div>
          <p style="text-align:right;margin:0 24px 6px 0;">Rowosari, ${formatShortIndoDate(draft.printDate || new Date().toLocaleDateString('en-CA'))}</p><div class="signs">
            <div class="sign-box">
              <p style="margin:0;">Pengawas Ruang,</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">( .................................... )</p>
            </div>
            <div class="sign-box">
              <p style="margin:0;">Ketua Panitia ${examType},</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(examConfigs[examType].committeeChair)}</p>
            </div>
          </div>
        </div>

        <!-- 5. Daftar Nilai -->
        <div class="doc-section">
          <div>
            ${buildMadrasahKopHtml(origin, `DAFTAR NILAI ${examType} - ${subMenuClass.toUpperCase()}`, true)}
            <div style="display:flex;justify-content:space-between;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:10.5px;">
              <div><strong>Kelas:</strong> ${escapeHtml(subMenuClass)}</div>
              <div><strong>Mata Pelajaran:</strong> ${escapeHtml(currentSubjectData.subject)}</div>
              <div><strong>Tanggal:</strong> ${escapeHtml(currentSubjectData.dayDate || '-')}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width:28px;">No</th>
                  <th style="width:90px;">NISN</th>
                  <th>Nama Siswa</th>
                  <th style="width:40px;">L/P</th>
                  <th style="width:80px;">Nilai</th>
                  <th style="width:120px;">Keterangan</th>
                </tr>
              </thead>
              <tbody>${daftarNilaiRows}</tbody>
            </table>
          </div>
          <p style="text-align:right;margin:0 24px 6px 0;">Rowosari, ${formatShortIndoDate(draft.printDate || new Date().toLocaleDateString('en-CA'))}</p><div class="signs">
            <div class="sign-box">
              <p style="margin:0;">Mengetahui, ${escapeHtml(draft.headmasterTitle)}</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(draft.headmasterName || settings.headmaster)}</p>
            </div>
            <div class="sign-box">
              <p style="margin:0;">Guru Mata Pelajaran / Wali Kelas,</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">( ........................................ )</p>
            </div>
          </div>
        </div>

        <!-- 6. RAB -->
        <div class="doc-section">
          <div>
            ${buildMadrasahKopHtml(origin, `RENCANA ANGGARAN BIAYA (RAB) ${examType}`, true)}
            <table>
              <thead>
                <tr>
                  <th style="width:28px;">No</th>
                  <th>Uraian Kebutuhan / Kegiatan</th>
                  <th style="width:95px;">Volume</th>
                  <th style="width:110px;">Harga Satuan</th>
                  <th style="width:115px;">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                ${rabRows}
                <tr>
                  <td colspan="4" style="text-align:right;font-weight:bold;background:#ecfdf5 !important;">TOTAL ANGGARAN ${examType}</td>
                  <td style="text-align:right;font-weight:bold;background:#ecfdf5 !important;color:#065f46;">${formatRupiah(rabTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style="text-align:right;margin:0 24px 6px 0;">Rowosari, ${formatShortIndoDate(draft.printDate || new Date().toLocaleDateString('en-CA'))}</p><div class="signs">
            <div class="sign-box">
              <p style="margin:0;">Mengetahui, ${escapeHtml(draft.headmasterTitle)}</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(draft.headmasterName || settings.headmaster)}</p>
            </div>
            <div class="sign-box">
              <p style="margin:0;">Ketua Panitia ${examType},</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(examConfigs[examType].committeeChair)}</p>
            </div>
          </div>
        </div>

        <!-- 7. Tanda Waktu / Bel -->
        <div class="doc-section">
          <div>
            ${buildMadrasahKopHtml(origin, `TANDA WAKTU / JADWAL BEL PELAKSANAAN ${examType}`, true)}
            <table>
              <thead>
                <tr>
                  <th style="width:28px;">No</th>
                  <th style="width:140px;">Kode / Bunyi Bel</th>
                  <th style="width:180px;">Waktu Pelaksanaan</th>
                  <th>Keterangan / Instruksi</th>
                </tr>
              </thead>
              <tbody>${bellRows}</tbody>
            </table>
          </div>
          <p style="text-align:right;margin:0 24px 6px 0;">Rowosari, ${formatShortIndoDate(draft.printDate || new Date().toLocaleDateString('en-CA'))}</p><div class="signs">
            <div class="sign-box">
              <p style="margin:0;">Mengetahui,</p>
              <p style="margin:2px 0 0 0;font-weight:bold;">${escapeHtml(draft.headmasterTitle)}</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(draft.headmasterName || settings.headmaster)}</p>
              <p style="margin:2px 0 0 0;font-size:10px;">NIP. ${escapeHtml(draft.headmasterNip || settings.headmasterNip)}</p>
            </div>
            <div class="sign-box">
              <p style="margin:0;">Ketua Panitia ${examType}</p>
              <div class="sign-space"></div>
              <p style="margin:0;font-weight:bold;text-decoration:underline;">${escapeHtml(examConfigs[examType].committeeChair)}</p>
              <p style="margin:2px 0 0 0;font-size:10px;">NIP. ${escapeHtml(examConfigs[examType].committeeChairNip || '-')}</p>
            </div>
          </div>
        </div>

      </body>
      </html>
    `;

    printHtmlDocument(batchHtml);
  };

  const selectedChecklistItem =
    draft.checklist.find((c) => c.id === selectedChecklistId) || draft.checklist[0];

  const getSubMenuIcon = (key: ExamInstrumentChecklistItem['subMenuKey']) => {
    switch (key) {
      case 'sk_panitia':
        return <ShieldCheck className="w-4 h-4 shrink-0" />;
      case 'kisi_kisi':
        return <ListChecks className="w-4 h-4 shrink-0" />;
      case 'dokumen_soal':
        return <BookOpen className="w-4 h-4 shrink-0" />;
      case 'jadwal':
        return <Calendar className="w-4 h-4 shrink-0" />;
      case 'tata_tertib':
        return <ScrollText className="w-4 h-4 shrink-0" />;
      case 'daftar_hadir':
        return <Users className="w-4 h-4 shrink-0" />;
      case 'berita_acara':
        return <FileCheck2 className="w-4 h-4 shrink-0" />;
      case 'daftar_nilai':
        return <FileSpreadsheet className="w-4 h-4 shrink-0" />;
      case 'kartu_peserta':
        return <CreditCard className="w-4 h-4 shrink-0" />;
      case 'rab':
        return <Calculator className="w-4 h-4 shrink-0" />;
      case 'tanda_waktu':
        return <Bell className="w-4 h-4 shrink-0" />;
      default:
        return <FolderOpen className="w-4 h-4 shrink-0" />;
    }
  };

  const rabTotal = draft.rabItems.reduce(
    (acc, item) => acc + (Number(item.volume) || 0) * (Number(item.hargaSatuan) || 0),
    0
  );

  return (
    <div className="space-y-5">
      {/* Top Toolbar for Sub-Tab 3 */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setInnerMode('instrument')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer ${
              innerMode === 'instrument'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Formulir & Cetak 1 Lembar / Mapel</span>
          </button>
          <button
            type="button"
            onClick={() => setInnerMode('submenu')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer ${
              innerMode === 'submenu'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Sub-Menu Poin Administrasi (1–{draft.checklist.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefault}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-slate-900/20 flex items-center space-x-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MODE 1: FORMULIR INSTRUMEN PELAKSANAAN & CETAK 1 LEMBAR / MAPEL     */}
      {/* =================================================================== */}
      {innerMode === 'instrument' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT: Customizer Panel (5 cols) */}
          <div className="xl:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                  <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                  <span>Sesuaikan Isi Instrumen {examType}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Semua kolom kop, identitas, poin tabel & tanda tangan bisa disesuaikan
                </p>
              </div>
              <select
                value={draft.paperSize}
                onChange={(e) =>
                  setDraft({ ...draft, paperSize: e.target.value as 'A4' | 'F4' })
                }
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 cursor-pointer"
              >
                <option value="A4">Kertas A4</option>
                <option value="F4">Kertas F4</option>
              </select>
            </div>

            {/* Pilih Mapel yang akan di-preview / cetak */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-emerald-900">
                  Pilih Mata Pelajaran ({subjectEntries.length} Mapel):
                </label>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  1 Lembar / Mapel
                </span>
              </div>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-black text-slate-900 cursor-pointer"
              >
                {subjectEntries.map((entry) => (
                  <option key={entry.subject} value={entry.subject}>
                    {entry.subject} {entry.dayDateLabel ? `(${entry.dayDateLabel})` : ''}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Tambah nama mapel baru..."
                  value={customSubjectInput}
                  onChange={(e) => setCustomSubjectInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSubject}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Mapel</span>
                </button>
              </div>

              {/* Tombol Cetak 1 Mapel & Semua Mapel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    handlePrintInstruments([
                      activeSubjectEntry?.subject || selectedSubject || 'Mata Pelajaran',
                    ])
                  }
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-wider shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak 1 Lembar Ini</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handlePrintInstruments(subjectEntries.map((s) => s.subject))
                  }
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] uppercase tracking-wider shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Semua ({subjectEntries.length} Lembar)</span>
                </button>
              </div>
            </div>

            {/* Edit Kop Surat & Judul */}
            <div className="space-y-2.5 text-xs font-bold text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Kop Surat & Judul Instrumen
                </span>
                <select
                  value={draft.kopLogoType}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      kopLogoType: e.target.value as ExamInstrumentConfig['kopLogoType'],
                    })
                  }
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 cursor-pointer"
                >
                  <option value="kemenag">Logo Kemenag (Bawaan)</option>
                  <option value="mi">Logo MI Islamiyah Rowosari</option>
                  <option value="custom">URL Logo Custom</option>
                  <option value="none">Tanpa Logo</option>
                </select>
              </div>

              {draft.kopLogoType === 'custom' && (
                <input
                  type="text"
                  placeholder="URL Logo Kop Surat..."
                  value={draft.kopCustomLogoUrl || ''}
                  onChange={(e) =>
                    setDraft({ ...draft, kopCustomLogoUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              )}

              <input
                type="text"
                value={draft.kopLine1}
                onChange={(e) => setDraft({ ...draft, kopLine1: e.target.value })}
                placeholder="Kop Baris 1"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
              <input
                type="text"
                value={draft.kopLine2}
                onChange={(e) => setDraft({ ...draft, kopLine2: e.target.value })}
                placeholder="Kop Baris 2 (Kemenag Kab/Kota)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
              <input
                type="text"
                value={draft.kopLine3}
                onChange={(e) => setDraft({ ...draft, kopLine3: e.target.value })}
                placeholder="Kop Baris 3 (POKJAWAS / Lembaga)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
              <input
                type="text"
                value={draft.kopAddress}
                onChange={(e) => setDraft({ ...draft, kopAddress: e.target.value })}
                placeholder="Alamat Kop Surat"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />

              <div className="grid grid-cols-2 gap-2 pt-1">
                <input
                  type="text"
                  value={draft.instrumentTitle}
                  onChange={(e) => setDraft({ ...draft, instrumentTitle: e.target.value })}
                  placeholder="Judul Instrumen"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900"
                />
                <input
                  type="text"
                  value={draft.academicYearLabel}
                  onChange={(e) =>
                    setDraft({ ...draft, academicYearLabel: e.target.value })
                  }
                  placeholder="Tahun Pelajaran"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900"
                />
              </div>
            </div>

            {/* Identitas Madrasah, Mapel Terpilih, & Jumlah Peserta */}
            <div className="space-y-2.5 text-xs font-bold text-slate-700 pt-2 border-t border-slate-100">
              <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Data Madrasah & Mapel ({currentSubjectData.subject})
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Nama Madrasah</label>
                  <input
                    type="text"
                    value={draft.madrasahName}
                    onChange={(e) => setDraft({ ...draft, madrasahName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">
                    Hari, Tanggal (Mapel Ini)
                  </label>
                  <input
                    type="text"
                    placeholder="Kosong = titik-titik manual"
                    value={currentSubjectData.dayDate}
                    onChange={(e) =>
                      updateSubjectOverrideField(currentSubjectData.subject, {
                        dayDateLabel: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Alamat Madrasah</label>
                <input
                  type="text"
                  value={draft.madrasahAddress}
                  onChange={(e) => setDraft({ ...draft, madrasahAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 text-[11px] font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.autoCountStudents}
                    onChange={(e) =>
                      setDraft({ ...draft, autoCountStudents: e.target.checked })
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                  />
                  <span>Hitung Otomatis Peserta Kls 1–6 dari Data Siswa</span>
                </label>
              </div>

              {!draft.autoCountStudents && (
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      ['Kls 1', 'kls1Count'],
                      ['Kls 2', 'kls2Count'],
                      ['Kls 3', 'kls3Count'],
                      ['Kls 4', 'kls4Count'],
                      ['Kls 5', 'kls5Count'],
                      ['Kls 6', 'kls6Count'],
                      ['Total', 'totalStudentsCount'],
                    ] as const
                  ).map(([lbl, key]) => (
                    <div key={key}>
                      <label className="block text-[9px] text-slate-500 mb-0.5">{lbl}</label>
                      <input
                        type="text"
                        placeholder="..."
                        value={draft[key]}
                        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monitoring, Catatan & Tanda Tangan */}
            <div className="space-y-2.5 text-xs font-bold text-slate-700 pt-2 border-t border-slate-100">
              <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Monitoring, Catatan & Pengesahan
              </span>
              <input
                type="text"
                placeholder="Hasil monitoring mapel ini (kosongkan = garis titik-titik)..."
                value={currentSubjectData.monitoring}
                onChange={(e) =>
                  updateSubjectOverrideField(currentSubjectData.subject, {
                    monitoringResult: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
              <input
                type="text"
                placeholder="Catatan mapel ini (kosongkan = garis titik-titik)..."
                value={currentSubjectData.notes}
                onChange={(e) =>
                  updateSubjectOverrideField(currentSubjectData.subject, {
                    notes: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">
                    Pengawas Madrasah
                  </label>
                  <input
                    type="text"
                    value={draft.supervisorName}
                    onChange={(e) => setDraft({ ...draft, supervisorName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold mb-1"
                  />
                  <input
                    type="text"
                    placeholder="NIP Pengawas"
                    value={draft.supervisorNip}
                    onChange={(e) => setDraft({ ...draft, supervisorNip: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">
                    Kepala Madrasah
                  </label>
                  <input
                    type="text"
                    placeholder="Kosong = titik-titik"
                    value={draft.headmasterName}
                    onChange={(e) => setDraft({ ...draft, headmasterName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold mb-1"
                  />
                  <input
                    type="text"
                    placeholder="NIP Kepala Madrasah"
                    value={draft.headmasterNip}
                    onChange={(e) => setDraft({ ...draft, headmasterNip: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Quick Checklist Table Editor */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Isi Poin Tabel Kelengkapan
                </span>
                <button
                  type="button"
                  onClick={addChecklistPoint}
                  className="text-[11px] font-black text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Poin</span>
                </button>
              </div>
              {/* Bulk Status Controls */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-1">
                  Pilih Semua Status:
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSetAllChecklistStatus('ada')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase cursor-pointer transition-colors"
                  >
                    Semua Ada (✓)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllChecklistStatus('tidak_ada')}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase cursor-pointer transition-colors"
                  >
                    Semua Tdk Ada (✓)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllChecklistStatus('kosong')}
                    className="px-2.5 py-1 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-[10px] font-black uppercase cursor-pointer transition-colors"
                  >
                    Semua Kosong
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {draft.checklist.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 text-center font-black text-slate-500">
                        {item.no}.
                      </span>
                      <input
                        type="text"
                        placeholder="Nama poin kelengkapan..."
                        value={item.label}
                        onChange={(e) =>
                          updateGlobalChecklistItem(item.id, { label: e.target.value })
                        }
                        className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-[11px]"
                      />
                      <select
                        value={item.status}
                        onChange={(e) =>
                          updateGlobalChecklistItem(item.id, {
                            status: e.target.value as ExamChecklistStatus,
                          })
                        }
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black cursor-pointer"
                      >
                        <option value="ada">Ada (✓)</option>
                        <option value="tidak_ada">Tdk ada (✓)</option>
                        <option value="kosong">Kosong</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedChecklistId(item.id);
                          setInnerMode('submenu');
                        }}
                        title="Buka sub-menu poin ini"
                        className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-[10px] font-black cursor-pointer"
                      >
                        Detail
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Ket / jumlah / bukti dukung..."
                      value={item.evidenceNote}
                      onChange={(e) =>
                        updateGlobalChecklistItem(item.id, { evidenceNote: e.target.value })
                      }
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10.5px] text-slate-700"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Live Paper Preview (7 cols) */}
          <div className="xl:col-span-7 bg-slate-100 rounded-3xl p-4 sm:p-6 border border-slate-200 overflow-x-auto">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                Pratinjau 1 Lembar Cetak • Mapel: {currentSubjectData.subject} ({draft.paperSize})
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Klik tiap poin di tabel untuk membuka sub-menunya
              </span>
            </div>

            <div
              className="bg-white shadow-lg border border-slate-300 mx-auto p-6 sm:p-8 text-black flex flex-col justify-between min-h-[820px] max-w-[720px]"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              <div>
                {/* KOP SURAT */}
                <div className="relative min-h-[60px] flex items-center justify-center pb-1.5">
                  {draft.kopLogoType !== 'none' && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center">
                      {draft.kopLogoType === 'mi' ? (
                        <img
                          src={MI_LOGO_PATH}
                          alt="Logo MI"
                          className="w-full h-full object-contain"
                        />
                      ) : draft.kopLogoType === 'custom' && draft.kopCustomLogoUrl ? (
                        <img
                          src={draft.kopCustomLogoUrl}
                          alt="Logo Kop"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          dangerouslySetInnerHTML={{ __html: KEMENAG_SVG }}
                        />
                      )}
                    </div>
                  )}
                  <div
                    className={`w-full text-center leading-tight ${
                      draft.kopLogoType !== 'none' ? 'px-16' : 'px-0'
                    }`}
                  >
                    <div className="text-[13px] font-bold">{draft.kopLine1}</div>
                    <div className="text-[13px] font-bold">{draft.kopLine2}</div>
                    <div className="text-[13px] font-bold">{draft.kopLine3}</div>
                    <div className="text-[11px] mt-0.5">{draft.kopAddress}</div>
                  </div>
                </div>
                <div className="h-[3px] bg-blue-700 my-2" />

                {/* JUDUL */}
                <div className="text-center font-bold text-[13px] leading-snug uppercase my-3">
                  <div>{draft.instrumentTitle}</div>
                  <div>{draft.academicYearLabel}</div>
                </div>

                {/* IDENTITAS */}
                <table className="w-full text-[12px] mb-3 border-collapse">
                  <tbody>
                    <tr>
                      <td className="w-32 py-0.5">Hari, Tanggal</td>
                      <td className="w-4 text-center">:</td>
                      <td>
                        {currentSubjectData.dayDate || (
                          <span className="text-slate-500">
                            .................................................................
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-0.5">Nama Madrasah</td>
                      <td className="text-center">:</td>
                      <td>
                        {draft.madrasahName || (
                          <span className="text-slate-500">
                            MI ........................................................
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-0.5">Mata Pelajaran</td>
                      <td className="text-center">:</td>
                      <td className="font-bold">{currentSubjectData.subject}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5">Alamat</td>
                      <td className="text-center">:</td>
                      <td>
                        {draft.madrasahAddress || (
                          <span className="text-slate-500">
                            .................................................................
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-0.5">Peserta {examType}</td>
                      <td className="text-center">:</td>
                      <td>
                        Kls 1 : <u>&nbsp;{gradeCounts.kls1 || '....'}&nbsp;</u> &nbsp;
                        Kls 2 : <u>&nbsp;{gradeCounts.kls2 || '....'}&nbsp;</u> &nbsp;
                        Kls 3 : <u>&nbsp;{gradeCounts.kls3 || '....'}&nbsp;</u> &nbsp;
                        Kls 4 : <u>&nbsp;{gradeCounts.kls4 || '....'}&nbsp;</u> &nbsp;
                        Kls 5 : <u>&nbsp;{gradeCounts.kls5 || '....'}&nbsp;</u> &nbsp;
                        Kls 6 : <u>&nbsp;{gradeCounts.kls6 || '....'}&nbsp;</u>
                      </td>
                    </tr>
                    <tr>
                      <td />
                      <td />
                      <td className="pt-0.5">
                        Jumlah siswa :{' '}
                        <strong className="underline">
                          &nbsp;{gradeCounts.total || '..........'}&nbsp;
                        </strong>{' '}
                        siswa
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* TABEL KELENGKAPAN */}
                <table className="w-full border-collapse border border-black text-[11.5px] mb-3">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-black px-1.5 py-1 w-8 text-center">No</th>
                      <th className="border border-black px-2 py-1 text-left w-[44%]">
                        Kelengkapan Administrasi
                      </th>
                      <th className="border border-black px-1.5 py-1 w-11 text-center">ada</th>
                      <th className="border border-black px-1.5 py-1 w-14 text-center">Tdk ada</th>
                      <th className="border border-black px-2 py-1 text-left">
                        Ket/jumlah/ Bukti dukung
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSubjectData.rows.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => {
                          setSelectedChecklistId(row.id);
                          setInnerMode('submenu');
                        }}
                        title="Klik untuk membuka sub-menu poin ini"
                        className="hover:bg-emerald-50/70 cursor-pointer transition-colors"
                      >
                        <td className="border border-black px-1.5 py-1 text-center">{row.no}</td>
                        <td className="border border-black px-2 py-1">{row.label}</td>
                        <td className="border border-black px-1.5 py-1 text-center font-bold">
                          {row.status === 'ada' ? '✓' : ''}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center font-bold">
                          {row.status === 'tidak_ada' ? '✓' : ''}
                        </td>
                        <td className="border border-black px-2 py-1 text-[11px]">
                          {row.evidenceNote}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* HASIL MONITORING & CATATAN */}
                <div className="space-y-2 text-[11.5px] mt-3">
                  <div className="flex items-end">
                    <span className="w-28 shrink-0">Hasil monitoring</span>
                    <span className="w-4 text-center shrink-0">:</span>
                    <span className="flex-1 border-b border-dotted border-black min-h-[16px]">
                      {currentSubjectData.monitoring}
                    </span>
                  </div>
                  <div className="flex items-end">
                    <span className="w-28 shrink-0">Catatan</span>
                    <span className="w-4 text-center shrink-0">:</span>
                    <span className="flex-1 border-b border-dotted border-black min-h-[16px]">
                      {currentSubjectData.notes}
                    </span>
                  </div>
                  <div className="border-b border-dotted border-black h-4" />
                  <div className="border-b border-dotted border-black h-4" />
                </div>
              </div>

              {/* TANDA TANGAN */}
              <div className="flex justify-between px-6 mt-8 text-[12px]">
                <div className="w-56">
                  <div>{draft.supervisorTitle}</div>
                  <div className="h-14" />
                  <div className="font-bold">
                    {draft.supervisorName || '........................................'}
                  </div>
                  <div>NIP. {draft.supervisorNip || '-'}</div>
                </div>
                <div className="w-56">
                  <div>{draft.headmasterTitle}</div>
                  <div className="h-14" />
                  <div className="font-bold">
                    {draft.headmasterName || '........................................'}
                  </div>
                  <div>NIP. {draft.headmasterNip || '....................................'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODE 2: SUB-MENU POIN-POIN KELENGKAPAN ADMINISTRASI (1–12+)         */}
      {/* =================================================================== */}
      {innerMode === 'submenu' && selectedChecklistItem && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Sub-Menu List (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Sub-Menu Kelengkapan {examType}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Pilih poin dari tabel untuk kelola & cetak dokumennya
                </p>
              </div>
              <button
                type="button"
                onClick={addChecklistPoint}
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                title="Tambah Poin Baru"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {draft.checklist.map((item) => {
                const isActive = item.id === selectedChecklistItem.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedChecklistId(item.id)}
                    className={`w-full px-3 py-2.5 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-white border border-slate-200 text-slate-700'
                        }`}
                      >
                        {item.no}
                      </span>
                      {getSubMenuIcon(item.subMenuKey)}
                      <span className="text-xs font-bold truncate">
                        {item.label || `(Poin ${item.no} - Kosong)`}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.status === 'ada'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'tidak_ada'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {item.status === 'ada'
                        ? 'Ada'
                        : item.status === 'tidak_ada'
                        ? 'Tdk Ada'
                        : 'Manual'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Sub-Menu Workspace (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
            {/* Header & Sync Bar for Selected Point */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  {getSubMenuIcon(selectedChecklistItem.subMenuKey)}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    Poin Tabel #{selectedChecklistItem.no} • Kelengkapan {examType}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 uppercase">
                    {selectedChecklistItem.label || `Poin Administrasi #${selectedChecklistItem.no}`}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintAllInstrumentsBatch}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-800 text-white font-black uppercase text-[10px] flex items-center space-x-1.5 shadow-sm hover:from-teal-800 hover:to-emerald-900 cursor-pointer transition-all"
                  title="Cetak semua dokumen instrumen kelas ini sekaligus kecuali SK Panitia (1 lembar)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Semua Sekaligus</span>
                </button>
                {draft.checklist.length > 1 && (
                  <button
                    type="button"
                    onClick={() => deleteChecklistPoint(selectedChecklistItem.id)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black uppercase flex items-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Poin</span>
                  </button>
                )}
              </div>
            </div>

            {/* Common Point Fields synced directly to Instrumen Table */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">
                  Nama Poin di Tabel
                </label>
                <input
                  type="text"
                  value={selectedChecklistItem.label}
                  onChange={(e) =>
                    updateGlobalChecklistItem(selectedChecklistItem.id, {
                      label: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">
                  Status pada Instrumen
                </label>
                <select
                  value={selectedChecklistItem.status}
                  onChange={(e) =>
                    updateGlobalChecklistItem(selectedChecklistItem.id, {
                      status: e.target.value as ExamChecklistStatus,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-slate-900 cursor-pointer"
                >
                  <option value="ada">Ada (Centang ✓)</option>
                  <option value="tidak_ada">Tidak Ada (Centang ✓)</option>
                  <option value="kosong">Kosong (Isi Manual Pengawas)</option>
                </select>
              </div>
              <div>
                <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">
                  Ket / Jumlah / Bukti Dukung
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ada (1 bendel)"
                  value={selectedChecklistItem.evidenceNote}
                  onChange={(e) =>
                    updateGlobalChecklistItem(selectedChecklistItem.id, {
                      evidenceNote: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">
                  Tautan Dokumen / Google Drive (Opsional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://drive.google.com/..."
                    value={selectedChecklistItem.detailLink || ''}
                    onChange={(e) =>
                      updateGlobalChecklistItem(selectedChecklistItem.id, {
                        detailLink: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                  {selectedChecklistItem.detailLink && (
                    <a
                      href={selectedChecklistItem.detailLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center space-x-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* SPECIFIC SUB-MENU CONTENT BY POINT */}
            {selectedChecklistItem.subMenuKey === 'sk_panitia' && (
              <div className="space-y-4 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <div className="flex items-center space-x-2 text-emerald-900 font-black text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>SK Panitia & Ketetapan {examType} Terintegrasi</span>
                  </div>
                  <p className="text-emerald-700 text-xs mt-1">
                    Ketika Anda menekan tombol <strong>Simpan SK Panitia</strong>, nomor SK, tanggal penetapan, waktu pelaksanaan ujian, dan nama ketua panitia akan <strong>otomatis tersimpan &amp; diterapkan ke seluruh dokumen {examType}</strong> (kartu peserta front/back, jadwal, kartu nomor meja, berita acara, daftar hadir, dan instrumen).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">
                      Nomor SK Panitia
                    </label>
                    <input
                      type="text"
                      value={draft.skNumber}
                      onChange={(e) => setDraft({ ...draft, skNumber: e.target.value })}
                      placeholder="Contoh: 045/MI-RWS/XI/2026"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">
                      Tanggal Penetapan SK
                    </label>
                    <input
                      type="date"
                      value={draft.skDate}
                      onChange={(e) => setDraft({ ...draft, skDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">
                      Waktu Pelaksanaan Ujian (Periode)
                    </label>
                    <input
                      type="text"
                      value={draft.periodLabel || ''}
                      onChange={(e) => setDraft({ ...draft, periodLabel: e.target.value })}
                      placeholder="Contoh: 2 - 7 Desember 2026"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-700"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Otomatis muncul pada Diktum KEDUA SK, kartu peserta, jadwal, &amp; kartu meja</span><label className="block font-black uppercase text-[10px] text-slate-500 mb-1 mt-2">Tanggal Cetak (Tanggal Dokumen)</label><input type="date" value={draft.printDate || ''} onChange={(e) => setDraft({ ...draft, printDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold" /><span className="text-[10px] text-slate-500 mt-0.5 block">Dipakai pada blok tanda tangan semua dokumen (Rowosari, ...).</span>
                    
                  </div>
                  <div>
                    <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">
                      Ketua Panitia {examType} (Nama &amp; NIP)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={draft.committeeChair || ''}
                        onChange={(e) => setDraft({ ...draft, committeeChair: e.target.value })}
                        placeholder="Nama Ketua Panitia"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                      />
                      <input
                        type="text"
                        value={draft.committeeChairNip || ''}
                        onChange={(e) => setDraft({ ...draft, committeeChairNip: e.target.value })}
                        placeholder="NIP Ketua (opsional)"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Nama &amp; NIP otomatis muncul di tanda tangan seluruh berkas {examType}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">
                    Susunan Panitia {examType} (Format: Jabatan : Nama (Keterangan))
                  </label>
                  <textarea
                    rows={6}
                    value={draft.skCommitteeText}
                    onChange={(e) => setDraft({ ...draft, skCommitteeText: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs text-slate-900"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveSkPanitia}
                    className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs flex items-center space-x-2 cursor-pointer shadow-md shadow-slate-900/10 transition-all active:scale-95"
                  >
                    <Save className="w-4 h-4 text-emerald-400" />
                    <span>Simpan SK Panitia &amp; Terapkan ke Semua Berkas</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintSkPanitia}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs flex items-center space-x-2 cursor-pointer shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak SK Panitia {examType} (1 Lembar)</span>
                  </button>
                </div>
              </div>
            )}

            {selectedChecklistItem.subMenuKey === 'kisi_kisi' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">
                    Catatan Kelengkapan Kisi-kisi Soal
                  </label>
                  <textarea
                    rows={3}
                    value={draft.kisiKisiNotes}
                    onChange={(e) => setDraft({ ...draft, kisiKisiNotes: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900"
                  />
                </div>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3">No</th>
                        <th className="py-2.5 px-3">Mata Pelajaran</th>
                        <th className="py-2.5 px-3">Jadwal Terkait</th>
                        <th className="py-2.5 px-3 text-center">Status Instrumen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {subjectEntries.map((s, idx) => (
                        <tr key={s.subject}>
                          <td className="py-2 px-3 font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3 font-black text-slate-900">{s.subject}</td>
                          <td className="py-2 px-3 text-slate-600">{s.dayDateLabel || '-'}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Siap</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedChecklistItem.subMenuKey === 'dokumen_soal' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">
                    Keterangan Penggandaan & Amplop Soal
                  </label>
                  <textarea
                    rows={3}
                    value={draft.dokumenSoalNotes}
                    onChange={(e) => setDraft({ ...draft, dokumenSoalNotes: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {accessibleClasses.map((cls) => {
                    const count = accessibleStudents.filter(
                      (s) => s.className === cls.name && s.status === 'aktif'
                    ).length;
                    return (
                      <div
                        key={cls.id}
                        className="p-3 rounded-2xl border border-slate-200 bg-slate-50"
                      >
                        <div className="text-[11px] font-black text-slate-900 uppercase">
                          {cls.name}
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          Siswa Aktif: <strong>{count}</strong>
                        </div>
                        <div className="text-[11px] font-bold text-emerald-700">
                          Kebutuhan Naskah: {count + 2} eks (termasuk +2 cadangan)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedChecklistItem.subMenuKey === 'jadwal' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-black text-emerald-950 uppercase">
                      Terintegrasi dengan Menu Jadwal {examType}
                    </div>
                    <p className="text-emerald-800 mt-0.5">
                      Saat ini terdapat{' '}
                      <strong>
                        {accessibleExamSchedules.filter((s) => s.examType === examType).length}
                      </strong>{' '}
                      entri jadwal ujian lintas kelas untuk {examType}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateSubTab('schedule')}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs cursor-pointer shrink-0"
                  >
                    Buka Menu Jadwal {examType}
                  </button>
                </div>
              </div>
            )}

            {selectedChecklistItem.subMenuKey === 'tata_tertib' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black uppercase text-[10px] text-slate-500">
                    Butir Tata Tertib Pelaksanaan {examType}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        tataTertibItems: [...draft.tataTertibItems, 'Butir tata tertib baru...'],
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black text-[11px] cursor-pointer flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Butir</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {draft.tataTertibItems.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 text-center font-black text-slate-500">{idx + 1}.</span>
                      <input
                        type="text"
                        value={rule}
                        onChange={(e) => {
                          const next = [...draft.tataTertibItems];
                          next[idx] = e.target.value;
                          setDraft({ ...draft, tataTertibItems: next });
                        }}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            tataTertibItems: draft.tataTertibItems.filter((_, i) => i !== idx),
                          })
                        }
                        className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handlePrintTataTertib}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs flex items-center space-x-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Tata Tertib Ruang {examType}</span>
                </button>
              </div>
            )}

            {(selectedChecklistItem.subMenuKey === 'daftar_hadir' ||
              selectedChecklistItem.subMenuKey === 'berita_acara' ||
              selectedChecklistItem.subMenuKey === 'daftar_nilai') && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                  <div>
                    <label className="block font-black uppercase text-[10px] text-emerald-900 mb-1">
                      Pilih Kelas / Ruang
                    </label>
                    <select
                      value={subMenuClass}
                      disabled={isGuru}
                      onChange={(e) => setSubMenuClass(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-black text-slate-900 cursor-pointer disabled:bg-slate-100"
                    >
                      {accessibleClasses.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-black uppercase text-[10px] text-emerald-900 mb-1">
                      Pilih Mata Pelajaran
                    </label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-black text-slate-900 cursor-pointer"
                    >
                      {subjectEntries.map((s) => (
                        <option key={s.subject} value={s.subject}>
                          {s.subject}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedChecklistItem.subMenuKey === 'daftar_hadir' && (
                  <div className="space-y-3">
                    <div className="text-slate-600 font-semibold">
                      Ditemukan{' '}
                      <strong>
                        {
                          accessibleStudents.filter(
                            (s) => s.className === subMenuClass && s.status === 'aktif'
                          ).length
                        }
                      </strong>{' '}
                      peserta aktif pada <strong>{subMenuClass}</strong>. Tersedia{' '}
                      <strong>{getClassSubjectsList(subMenuClass).length}</strong> mata pelajaran untuk dicetak.
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handlePrintDaftarHadir}
                        className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs flex items-center space-x-2 cursor-pointer shadow-sm transition-all"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Cetak Daftar Hadir ({selectedSubject})</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintDaftarHadirSatuLembar}
                        className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs flex items-center space-x-2 cursor-pointer shadow-md shadow-slate-900/15 transition-all"
                      >
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <span>Cetak 1 Lembar per Kelas • F4 Landscape ({subMenuClass})</span>
                      </button>
                    </div>
                  </div>
                )}

                {selectedChecklistItem.subMenuKey === 'berita_acara' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">
                          Jumlah Peserta Tidak Hadir
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={baAbsentCount}
                          onChange={(e) => setBaAbsentCount(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">
                          Nama Peserta Tidak Hadir
                        </label>
                        <input
                          type="text"
                          value={baAbsentNames}
                          onChange={(e) => setBaAbsentNames(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">
                        Catatan Kejadian Selama Ujian
                      </label>
                      <textarea
                        rows={3}
                        value={draft.beritaAcaraNotes}
                        onChange={(e) => setDraft({ ...draft, beritaAcaraNotes: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl font-semibold"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handlePrintBeritaAcara}
                        className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs flex items-center space-x-2 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Cetak Berita Acara ({selectedSubject})</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintBeritaAcaraSemuaMapel}
                        className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs flex items-center space-x-2 cursor-pointer shadow-md shadow-slate-900/15"
                      >
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <span>Cetak Semua Mapel Sekaligus ({subMenuClass})</span>
                      </button>
                    </div>
                  </div>
                )}

                {selectedChecklistItem.subMenuKey === 'daftar_nilai' && (
                  <div className="space-y-3">
                    <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-600">
                          <tr>
                            <th className="py-2 px-3 w-10">No</th>
                            <th className="py-2 px-3">NISN</th>
                            <th className="py-2 px-3">Nama Siswa</th>
                            <th className="py-2 px-3 w-28">Input Nilai</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {accessibleStudents
                            .filter((s) => s.className === subMenuClass && s.status === 'aktif')
                            .map((st, idx) => (
                              <tr key={st.id}>
                                <td className="py-1.5 px-3 text-slate-500 font-bold">{idx + 1}</td>
                                <td className="py-1.5 px-3 font-mono">{st.nisn || st.nis || '-'}</td>
                                <td className="py-1.5 px-3 font-bold text-slate-900">{st.name}</td>
                                <td className="py-1.5 px-3">
                                  <input
                                    type="text"
                                    placeholder="-"
                                    value={scoreMap[st.id] || ''}
                                    onChange={(e) =>
                                      setScoreMap({ ...scoreMap, [st.id]: e.target.value })
                                    }
                                    className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold"
                                  />
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handlePrintDaftarNilai}
                        className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs flex items-center space-x-2 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Cetak Blangko Nilai ({selectedSubject})</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintDaftarNilaiSemuaMapel}
                        className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs flex items-center space-x-2 cursor-pointer shadow-md shadow-slate-900/15"
                      >
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <span>Cetak Semua Mapel Sekaligus ({subMenuClass})</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedChecklistItem.subMenuKey === 'kartu_peserta' && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-black text-emerald-950 uppercase">
                    Terintegrasi dengan Menu Cetak Kartu {examType} (F4)
                  </div>
                  <p className="text-emerald-800 mt-0.5">
                    Total siswa aktif yang siap dicetak kartu pesertanya:{' '}
                    <strong>{accessibleStudents.filter((s) => s.status === 'aktif').length}</strong> siswa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateSubTab('cards')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs cursor-pointer shrink-0"
                >
                  Buka Cetak Kartu {examType}
                </button>
              </div>
            )}

            {selectedChecklistItem.subMenuKey === 'rab' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black uppercase text-[10px] text-slate-500">
                    Rincian Anggaran Biaya (RAB) {examType}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        rabItems: [
                          ...draft.rabItems,
                          {
                            id: `rab-${Date.now()}`,
                            uraian: 'Item Anggaran Baru',
                            volume: '1',
                            satuan: 'Paket',
                            hargaSatuan: 100000,
                          },
                        ],
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black text-[11px] cursor-pointer flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Pos</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {draft.rabItems.map((rab) => (
                    <div
                      key={rab.id}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200"
                    >
                      <input
                        type="text"
                        value={rab.uraian}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            rabItems: draft.rabItems.map((r) =>
                              r.id === rab.id ? { ...r, uraian: e.target.value } : r
                            ),
                          })
                        }
                        className="col-span-5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                      />
                      <input
                        type="text"
                        value={rab.volume}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            rabItems: draft.rabItems.map((r) =>
                              r.id === rab.id ? { ...r, volume: e.target.value } : r
                            ),
                          })
                        }
                        className="col-span-2 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center font-bold"
                      />
                      <input
                        type="text"
                        value={rab.satuan}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            rabItems: draft.rabItems.map((r) =>
                              r.id === rab.id ? { ...r, satuan: e.target.value } : r
                            ),
                          })
                        }
                        className="col-span-2 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center font-semibold"
                      />
                      <input
                        type="number"
                        value={rab.hargaSatuan}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            rabItems: draft.rabItems.map((r) =>
                              r.id === rab.id
                                ? { ...r, hargaSatuan: Number(e.target.value) || 0 }
                                : r
                            ),
                          })
                        }
                        className="col-span-2 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-right font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            rabItems: draft.rabItems.filter((r) => r.id !== rab.id),
                          })
                        }
                        className="col-span-1 p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 font-black text-emerald-900">
                    Total Anggaran: {formatRupiah(rabTotal)}
                  </div>
                  <button
                    type="button"
                    onClick={handlePrintRab}
                    className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs flex items-center space-x-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak RAB {examType}</span>
                  </button>
                </div>
              </div>
            )}

            {selectedChecklistItem.subMenuKey === 'tanda_waktu' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black uppercase text-[10px] text-slate-500">
                    Kode Tanda Waktu / Bel Pelaksanaan {examType}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        bellSchedule: [
                          ...draft.bellSchedule,
                          {
                            id: `bel-${Date.now()}`,
                            signal: 'Bel 1x',
                            timing: '09:00',
                            meaning: 'Keterangan tanda waktu...',
                          },
                        ],
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black text-[11px] cursor-pointer flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Tanda Bel</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {draft.bellSchedule.map((bell) => (
                    <div
                      key={bell.id}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200"
                    >
                      <input
                        type="text"
                        value={bell.signal}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            bellSchedule: draft.bellSchedule.map((b) =>
                              b.id === bell.id ? { ...b, signal: e.target.value } : b
                            ),
                          })
                        }
                        className="col-span-3 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                      />
                      <input
                        type="text"
                        value={bell.timing}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            bellSchedule: draft.bellSchedule.map((b) =>
                              b.id === bell.id ? { ...b, timing: e.target.value } : b
                            ),
                          })
                        }
                        className="col-span-4 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold"
                      />
                      <input
                        type="text"
                        value={bell.meaning}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            bellSchedule: draft.bellSchedule.map((b) =>
                              b.id === bell.id ? { ...b, meaning: e.target.value } : b
                            ),
                          })
                        }
                        className="col-span-4 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            bellSchedule: draft.bellSchedule.filter((b) => b.id !== bell.id),
                          })
                        }
                        className="col-span-1 p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handlePrintBellSchedule}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs flex items-center space-x-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Panduan Bel {examType}</span>
                </button>
              </div>
            )}

            {selectedChecklistItem.subMenuKey === 'custom' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">
                    Catatan / Uraian Kelengkapan Tambahan
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Isi keterangan atau rincian kelengkapan tambahan..."
                    value={selectedChecklistItem.detailNotes || ''}
                    onChange={(e) =>
                      updateGlobalChecklistItem(selectedChecklistItem.id, {
                        detailNotes: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
