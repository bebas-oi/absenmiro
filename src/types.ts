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
  grade: number; // 1 - 6
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

export type ActiveTab = 
  | 'kiosk'
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'users'
  | 'reports'
  | 'cards'
  | 'settings';

