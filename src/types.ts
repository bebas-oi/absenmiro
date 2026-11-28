export type AttendanceStatus = 'HADIR' | 'TERLAMBAT' | 'IZIN' | 'SAKIT' | 'ALPA';
export type AttendanceType = 'masuk' | 'pulang';
export type AttendanceMethod = 'RFID' | 'MANUAL';

export type AppViewMode = 'landing' | 'admin';
export type UserRole = 'ADMIN' | 'GURU';

export interface AppUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  assignedClass?: string; // e.g. 'Kelas 1A' for GURU / Wali Kelas
  email?: string;
  phone?: string;
  status: 'AKTIF' | 'NONAKTIF';
}

export interface ScanResultState {
  type: 'success' | 'unrecognized' | 'already_scanned';
  student?: Student;
  timeString?: string;
  dateString?: string;
  status?: AttendanceStatus;
  attendanceType?: AttendanceType;
  rawUid?: string;
  message?: string;
  notes?: string;
  firstScannedTime?: string;
}

export interface AdminUser {
  username: string;
  name: string;
  role: 'admin' | 'operator' | 'kepala_madrasah';
  email: string;
}

export interface Student {
  id: string;
  nis: string;
  nisn?: string;
  name: string;
  className: string;
  rfidUid: string;
  gender: 'L' | 'P';
  parentName?: string;
  parentPhone?: string;
  address?: string;
  photoUrl?: string;
  status: 'aktif' | 'nonaktif';
  createdAt: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  grade: number | string; // 1 - 6 or custom level
  academicYear: string;
  homeroomTeacherId?: string;
}

export interface Teacher {
  id: string;
  name: string;
  nip: string;
  assignedClass: string;
  phone: string;
  email: string;
  photoUrl?: string;
  gender: 'L' | 'P';
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  nis: string;
  studentName: string;
  className: string;
  date: string; // YYYY-MM-DD
  timeIn?: string; // HH:mm:ss
  timeOut?: string; // HH:mm:ss
  type: AttendanceType;
  status: AttendanceStatus;
  method: AttendanceMethod;
  notes?: string;
  timestamp: number;
}

export interface SchoolSettings {
  schoolName: string;
  subTitle: string;
  nsm: string;
  npsn: string;
  address: string;
  village: string;
  district: string;
  regency: string;
  headmaster: string;
  headmasterNip: string;
  timeInStart: string; // e.g. "06:30"
  timeInStandard: string; // e.g. "07:00"
  timeInLate: string; // e.g. "07:15"
  timeOutStandard: string; // e.g. "13:30"
  timeOutFriday: string; // e.g. "11:30"
  activeAcademicYear: string;
  activeSemester: string;
  autoMode: boolean; // Auto detect masuk vs pulang based on current time
  soundEnabled: boolean;
  kioskCooldownSeconds: number;
  kioskManualPin?: string; // PIN for manual attendance access on Kiosk (default: '123456')
}

export interface CardPrintSettings {
  template: 'emerald' | 'navy' | 'gold' | 'modern';
  showBarcode: boolean;
  showQr: boolean;
  showChip: boolean;
  showStamp: boolean;
  showHeadmasterSign: boolean;
  cardSize: 'standard' | 'large';
  validUntil: string;
}

export interface ImportValidationError {
  row: number;
  nis?: string;
  name?: string;
  rfidUid?: string;
  className?: string;
  gender?: string;
  message: string;
}

export interface ImportPreviewResult {
  totalRows: number;
  validRows: Omit<Student, 'id' | 'createdAt'>[];
  errorRows: ImportValidationError[];
  duplicateCount: number;
}

export type ExamType = 'ASAS' | 'ASAT';

export interface ExamScheduleItem {
  id: string;
  examType: ExamType;
  className: string;
  date: string; // YYYY-MM-DD
  dayName: string; // e.g. 'Senin'
  timeStart: string; // e.g. '07:30'
  timeEnd: string; // e.g. '09:00'
  subject: string;
  room?: string;
  supervisor?: string;
}

export interface ExamMetaConfig {
  examType: ExamType;
  academicYear: string;
  semester: string;
  periodLabel: string;
  committeeChair: string;
  committeeChairNip?: string;
  defaultRoom: string;
  participantPrefix: string;
  cardTheme: 'emerald' | 'navy' | 'gold' | 'modern';
  backMode: 'schedule' | 'rules';
  skNumber?: string;
  skDate?: string;
  printDate?: string;
}

export type ExamChecklistStatus = 'ada' | 'tidak_ada' | 'kosong';

export type ExamSubMenuKey =
  | 'sk_panitia'
  | 'kisi_kisi'
  | 'dokumen_soal'
  | 'jadwal'
  | 'tata_tertib'
  | 'daftar_hadir'
  | 'berita_acara'
  | 'daftar_nilai'
  | 'kartu_peserta'
  | 'rab'
  | 'tanda_waktu'
  | 'custom';

export interface ExamInstrumentChecklistItem {
  id: string;
  no: number;
  label: string;
  subMenuKey: ExamSubMenuKey;
  status: ExamChecklistStatus;
  evidenceNote: string;
  detailNotes?: string;
  detailLink?: string;
}

export interface ExamRabItem {
  id: string;
  uraian: string;
  volume: string;
  satuan: string;
  hargaSatuan: number;
}

export interface ExamBellItem {
  id: string;
  signal: string;
  timing: string;
  meaning: string;
}

export interface ExamSubjectInstrumentOverride {
  subject: string;
  dayDateLabel?: string;
  monitoringResult?: string;
  notes?: string;
  checklistOverrides?: Record<
    string,
    {
      status: ExamChecklistStatus;
      evidenceNote: string;
    }
  >;
}

export interface ExamInstrumentConfig {
  examType: ExamType;
  kopLine1: string;
  kopLine2: string;
  kopLine3: string;
  kopAddress: string;
  kopLogoType: 'kemenag' | 'mi' | 'custom' | 'none';
  kopCustomLogoUrl?: string;
  instrumentTitle: string;
  academicYearLabel: string;
  madrasahName: string;
  madrasahAddress: string;
  autoCountStudents: boolean;
  kls1Count: string;
  kls2Count: string;
  kls3Count: string;
  kls4Count: string;
  kls5Count: string;
  kls6Count: string;
  totalStudentsCount: string;
  defaultMonitoringResult: string;
  defaultNotes: string;
  supervisorTitle: string;
  supervisorName: string;
  supervisorNip: string;
  headmasterTitle: string;
  headmasterName: string;
  headmasterNip: string;
  paperSize: 'A4' | 'F4';
  checklist: ExamInstrumentChecklistItem[];
  subjectOverrides: Record<string, ExamSubjectInstrumentOverride>;
  skNumber: string;
  skDate: string;
  skCommitteeText: string;
  kisiKisiNotes: string;
  dokumenSoalNotes: string;
  tataTertibItems: string[];
  beritaAcaraNotes: string;
  beritaAcaraFillMode?: 'blanko' | 'auto';
  beritaAcaraHeading?: string;
  beritaAcaraSubtitle?: string;
  beritaAcaraExamLabel?: string;
  beritaAcaraDay?: string;
  beritaAcaraDateNum?: string;
  beritaAcaraMonth?: string;
  beritaAcaraYear?: string;
  beritaAcaraTimeStart?: string;
  beritaAcaraTimeEnd?: string;
  beritaAcaraRoom?: string;
  beritaAcaraClass?: string;
  beritaAcaraTotalStudents?: string;
  beritaAcaraAbsentStudents?: string;
  beritaAcaraPresentStudents?: string;
  beritaAcaraSubject?: string;
  beritaAcaraCopies?: string;
  beritaAcaraCondition?: string;
  beritaAcaraSupervisorName?: string;
  beritaAcaraSupervisorNip?: string;
  beritaAcaraFootnote1?: string;
  beritaAcaraFootnote2Title?: string;
  beritaAcaraFootnote2Item1?: string;
  beritaAcaraFootnote2Item2?: string;
  beritaAcaraFootnote2Item3?: string;
  rabItems: ExamRabItem[];
  bellSchedule: ExamBellItem[];
  periodLabel?: string;
  printDate?: string;
  committeeChair?: string;
  committeeChairNip?: string;
}

export type ActiveTab = 
  | 'kiosk'
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'users'
  | 'reports'
  | 'cards'
  | 'exam'
  | 'settings';


