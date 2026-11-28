import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  ActiveTab,
  AppUser,
  AppViewMode,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceType,
  ClassRoom,
  ExamInstrumentConfig,
  ExamMetaConfig,
  ExamScheduleItem,
  ExamType,
  GradeKatrolSheet,
  ScanResultState,
  SchoolSettings,
  SchoolAchievement,
  Student,
  Teacher,
} from '../types';
import {
  getSampleAttendanceRecords,
  getTodayDateString,
  initialClasses,
  initialExamConfigs,
  initialExamInstruments,
  initialExamSchedules,
  initialSettings,
  initialStudents,
  initialTeachers,
  initialUsers,
  initialAchievements,
  UserAccount,
} from '../data/initialData';
import { playErrorBeep, playSuccessChime, playWarningChime } from '../utils/audio';
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
  showWarningAlert,
} from '../utils/alerts';
import {
  batchSaveCloudExamSchedules,
  batchSaveCloudStudents,
  deleteCloudAttendance,
  deleteCloudClass,
  deleteCloudExamSchedule,
  deleteCloudGradeKatrol,
  deleteCloudStudent,
  deleteCloudTeacher,
  deleteCloudUser,
  fetchCloudExamConfigs,
  fetchCloudExamInstruments,
  fetchCloudSettings,
  saveCloudAttendance,
  saveCloudClass,
  saveCloudExamConfig,
  saveCloudExamInstrument,
  saveCloudExamSchedule,
  saveCloudGradeKatrol,
  saveCloudSettings,
  saveCloudStudent,
  saveCloudTeacher,
  saveCloudUser,
  seedInitialFirestoreData,
  subscribeCloudAttendance,
  subscribeCloudClasses,
  subscribeCloudExamSchedules,
  subscribeCloudGradeKatrol,
  subscribeCloudStudents,
  subscribeCloudTeachers,
  subscribeCloudUsers,
  testFirestoreConnection,
} from '../services/firestoreService';
import {
  isSupabaseConfigured,
  saveCustomSupabaseConfig,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from '../lib/supabase';
import {
  batchSaveSupabaseExamSchedules,
  batchSaveSupabaseStudents,
  deleteSupabaseAttendance,
  deleteSupabaseClass,
  deleteSupabaseExamSchedule,
  deleteSupabaseStudent,
  deleteSupabaseTeacher,
  deleteSupabaseUser,
  fetchSupabaseAttendance,
  fetchSupabaseClasses,
  fetchSupabaseExamConfigs,
  fetchSupabaseExamInstruments,
  fetchSupabaseExamSchedules,
  fetchSupabaseSettings,
  fetchSupabaseStudents,
  fetchSupabaseTeachers,
  fetchSupabaseUsers,
  saveSupabaseAttendance,
  saveSupabaseClass,
  saveSupabaseExamConfig,
  saveSupabaseExamInstrument,
  saveSupabaseExamSchedule,
  saveSupabaseSettings,
  saveSupabaseStudent,
  saveSupabaseTeacher,
  saveSupabaseUser,
  seedInitialSupabaseData,
  subscribeSupabaseChanges,
} from '../services/supabaseService';

interface LastScanned {
  student: Student;
  timeString: string;
  status: AttendanceStatus;
  type: AttendanceType;
}

const PRESET_SUBJECT_USER_IDS = new Set(['usr-guru-pjok-1', 'usr-guru-pjok-2', 'usr-guru-tik']);
const PRESET_SUBJECT_TEACHER_IDS = new Set(['t-pjok-1', 't-pjok-2', 't-tik-1']);
const MAPEL_USERS_SEED_KEY = 'mi_rowosari_seeded_mapel_users_v1';
const MAPEL_TEACHERS_SEED_KEY = 'mi_rowosari_seeded_mapel_teachers_v1';

export function getClassGradeNumber(cls: Pick<ClassRoom, 'name' | 'grade'>): number {
  const name = (cls.name || '').trim();
  const digitMatch = name.match(/\d+/);
  if (digitMatch) {
    return parseInt(digitMatch[0], 10);
  }
  const romanMatch = name.match(/\b(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)\b/i);
  if (romanMatch) {
    const romanMap: Record<string, number> = {
      I: 1,
      II: 2,
      III: 3,
      IV: 4,
      V: 5,
      VI: 6,
      VII: 7,
      VIII: 8,
      IX: 9,
      X: 10,
      XI: 11,
      XII: 12,
    };
    return romanMap[romanMatch[1].toUpperCase()] ?? 999;
  }
  return Number(cls.grade) || 999;
}

export function getAllowedClassesForUser(
  user: AppUser | null | undefined,
  allClasses: ClassRoom[]
): string[] {
  if (!user || user.role === 'ADMIN') {
    return allClasses.map((c) => c.name);
  }
  const assignedRange = (user.assignedClass || '').trim().toLowerCase();
  if (assignedRange === 'kelas 1-6' || assignedRange === 'semua kelas 1-6') {
    const matched = allClasses
      .filter((c) => {
        const g = getClassGradeNumber(c);
        return g >= 1 && g <= 6;
      })
      .map((c) => c.name);
    return matched.length > 0 ? matched : allClasses.map((c) => c.name);
  }
  if (assignedRange === 'kelas 4-6') {
    const matched = allClasses
      .filter((c) => {
        const g = getClassGradeNumber(c);
        return g >= 4 && g <= 6;
      })
      .map((c) => c.name);
    if (matched.length > 0) return matched;
  }
  if (user.assignedClasses && user.assignedClasses.length > 0) {
    return user.assignedClasses;
  }
  return user.assignedClass ? [user.assignedClass] : [];
}

interface AppContextType {
  viewMode: AppViewMode;
  setViewMode: (mode: AppViewMode) => void;
  currentUser: AppUser | null;
  isAdminLoggedIn: boolean; // true if any user is logged in
  isGuru: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => { success: boolean; message: string; user?: AppUser };
  loginAdmin: (username: string, password: string) => { success: boolean; message: string };
  logout: () => void;
  logoutAdmin: () => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;

  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  
  // Cloud Database Status
  isCloudConnected: boolean;
  isSyncing: boolean;
  cloudProvider: 'supabase' | 'firestore' | 'offline';
  syncWithCloud: () => Promise<void>;
  updateSupabaseConfig: (url: string, key: string) => void;

  // Data (Raw)
  students: Student[];
  classes: ClassRoom[];
  teachers: Teacher[];
  users: UserAccount[];
  attendance: AttendanceRecord[];
  achievements: SchoolAchievement[];
  settings: SchoolSettings;

  // RBAC Access-Controlled Data
  accessibleStudents: Student[];
  accessibleAttendance: AttendanceRecord[];
  accessibleClasses: ClassRoom[];

  scanMode: 'auto' | 'masuk' | 'pulang';
  setScanMode: (mode: 'auto' | 'masuk' | 'pulang') => void;
  lastScanned: LastScanned | null;
  currentScanResult: ScanResultState | null;
  clearScanResult: () => void;
  currentTimeString: string;
  currentDateString: string;
  formattedIndonesianDate: string;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
  
  // Actions
  processRfidScan: (rfidUid: string) => { success: boolean; message: string };
  addManualAttendance: (data: {
    studentId: string;
    status: AttendanceStatus;
    type?: AttendanceType;
    notes?: string;
    customTime?: string;
  }) => boolean;
  updateAttendanceRecord: (record: AttendanceRecord, silent?: boolean) => boolean;
  upsertAttendanceForDate: (
    data: {
      studentId: string;
      date: string;
      status: AttendanceStatus;
      type?: AttendanceType;
      timeIn?: string;
      timeOut?: string;
      notes?: string;
    },
    silent?: boolean
  ) => boolean;
  batchUpdateAttendanceStatus: (
    ids: string[],
    status: AttendanceStatus,
    notes?: string
  ) => number;
  deleteAttendanceRecord: (id: string, silent?: boolean) => void;

  // Student CRUD & Batch Import
  addStudent: (student: Omit<Student, 'id' | 'createdAt'>) => Student;
  batchImportStudents: (newStudents: Omit<Student, 'id' | 'createdAt'>[]) => number;
  batchUpdateStudentPhotos: (updates: { studentId: string; photoUrl: string }[]) => number;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  batchDeleteStudents: (ids: string[]) => number;

  // Class CRUD
  addClass: (cls: Omit<ClassRoom, 'id'>) => ClassRoom;
  updateClass: (cls: ClassRoom) => void;
  deleteClass: (id: string) => void;

  // Teacher CRUD
  addTeacher: (teacher: Omit<Teacher, 'id'>) => Teacher;
  updateTeacher: (teacher: Teacher) => void;
  deleteTeacher: (id: string) => void;

  // User Management (RBAC)
  addUser: (user: UserAccount) => UserAccount;
  updateUser: (user: UserAccount) => void;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;
  resetUserPassword: (id: string, newPassword?: string) => void;

  // Settings
  updateSettings: (newSettings: SchoolSettings) => void;
  resetAllData: () => void;
  activeAcademicYear: string;
  academicYears: string[];
  setActiveAcademicYear: (year: string) => void;
  addAcademicYear: (year: string) => boolean;
  importDataFromPreviousYear: (sourceYear: string, targetYear: string) => boolean;

  // ASAS & ASAT Exam Schedules, Configs & Instruments
  examSchedules: ExamScheduleItem[];
  accessibleExamSchedules: ExamScheduleItem[];
  examConfigs: Record<ExamType, ExamMetaConfig>;
  examInstruments: Record<ExamType, ExamInstrumentConfig>;
  addExamSchedule: (item: Omit<ExamScheduleItem, 'id'>) => ExamScheduleItem;
  updateExamSchedule: (item: ExamScheduleItem) => void;
  deleteExamSchedule: (id: string) => void;
  copyExamSchedulesToClasses: (examType: ExamType, sourceClass: string, targetClasses: string[]) => number;
  updateExamConfig: (examType: ExamType, config: ExamMetaConfig, silent?: boolean) => void;
  updateExamInstrument: (examType: ExamType, instrument: ExamInstrumentConfig, silent?: boolean) => void;

  // Katrol Nilai
  gradeKatrolSheets: GradeKatrolSheet[];
  accessibleGradeKatrolSheets: GradeKatrolSheet[];
  saveGradeKatrolSheet: (sheet: GradeKatrolSheet, silent?: boolean) => Promise<void>;
  deleteGradeKatrolSheet: (id: string) => Promise<void>;
  addAchievement: (item: Omit<SchoolAchievement, 'id'>) => SchoolAchievement;
  updateAchievement: (item: SchoolAchievement) => void;
  deleteAchievement: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const formatJakartaTime = (date: Date = new Date()): string => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  // 'en-GB' format returns 'HH:MM:SS'. We replace any period with colon just in case
  return formatter.format(date).replace(/\./g, ':');
};

const STORAGE_KEYS = {
  STUDENTS: 'mi_rowosari_students_v1',
  CLASSES: 'mi_rowosari_classes_v1',
  TEACHERS: 'mi_rowosari_teachers_v1',
  USERS: 'mi_rowosari_users_v2',
  ATTENDANCE: 'mi_rowosari_attendance_v1',
  SETTINGS: 'mi_rowosari_settings_v1',
  AUTH_USER: 'mi_rowosari_auth_user_v2',
  ADMIN_AUTH: 'mi_rowosari_admin_auth_v1',
  EXAM_SCHEDULES: 'mi_rowosari_exam_schedules_v1',
  EXAM_CONFIGS: 'mi_rowosari_exam_configs_v1',
  EXAM_INSTRUMENTS: 'mi_rowosari_exam_instruments_v1',
  GRADE_KATROL: 'mi_rowosari_grade_katrol_v1',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Current Logged-in User State (RBAC)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      if (savedUser) return JSON.parse(savedUser);
      // Legacy fallback
      if (localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true') {
        return initialUsers[0]; // Admin
      }
      return null;
    } catch {
      return null;
    }
  });

  const isAdminLoggedIn = currentUser !== null;
  const isGuru = currentUser?.role === 'GURU';
  const isAdmin = currentUser?.role === 'ADMIN';

  const [viewMode, setViewModeState] = useState<AppViewMode>('landing');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [scanMode, setScanMode] = useState<'auto' | 'masuk' | 'pulang'>('auto');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [lastScanned, setLastScanned] = useState<LastScanned | null>(null);
  const [currentScanResult, setCurrentScanResult] = useState<ScanResultState | null>(null);
  const scanResultTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Time ticker
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentTimeString = formatJakartaTime(currentTime);

  const currentDateString = getTodayDateString();

  const formattedIndonesianDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(currentTime);

  // URL Path sync on mount
  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    if (path === '/admin' || path === '/dashboard') {
      if (currentUser) {
        setViewModeState('admin');
        setActiveTab('dashboard');
      } else {
        setViewModeState('landing');
        setIsLoginModalOpen(true);
      }
    } else {
      setViewModeState('landing');
    }
  }, [currentUser]);

  const setViewMode = (mode: AppViewMode) => {
    if (mode === 'admin' && !currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    setViewModeState(mode);
    if (mode === 'admin') {
      window.history.pushState({}, '', '/dashboard');
    } else {
      window.history.pushState({}, '', '/');
    }
  };

const LEGACY_SCHOOL_NAMES = [
  "mi ma'arif rowosari",
  'mi maarif rowosari',
  'madrasah ibtidaiyah (mi) rowosari',
  'mi rowosari',
  'mi rowosari kendal',
];

const normalizeSchoolName = (name?: string): string => {
  const clean = (name || '').trim();
  if (!clean || LEGACY_SCHOOL_NAMES.includes(clean.toLowerCase())) {
    return 'MI Islamiyah Rowosari';
  }
  return clean;
};

  // 1. Settings state
  const [settings, setSettings] = useState<SchoolSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const parsed = saved ? JSON.parse(saved) : initialSettings;
      return { ...parsed, schoolName: normalizeSchoolName(parsed.schoolName) };
    } catch {
      return initialSettings;
    }
  });

  // 2. Classes state
  const [classes, setClasses] = useState<ClassRoom[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLASSES);
      return saved ? JSON.parse(saved) : initialClasses;
    } catch {
      return initialClasses;
    }
  });

  // 3. Teachers state
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEACHERS);
      const parsed: Teacher[] = saved ? JSON.parse(saved) : initialTeachers;
      if (!localStorage.getItem(MAPEL_TEACHERS_SEED_KEY)) {
        const existingIds = new Set(parsed.map((t) => t.id));
        const missingPresets = initialTeachers.filter(
          (t) => PRESET_SUBJECT_TEACHER_IDS.has(t.id) && !existingIds.has(t.id)
        );
        if (missingPresets.length > 0) {
          return [...parsed, ...missingPresets];
        }
      }
      return parsed;
    } catch {
      return initialTeachers;
    }
  });

  // 4. Users state (RBAC accounts)
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      const parsed: UserAccount[] = saved ? JSON.parse(saved) : initialUsers;
      if (!localStorage.getItem(MAPEL_USERS_SEED_KEY)) {
        const existingIds = new Set(parsed.map((u) => u.id));
        const missingPresets = initialUsers.filter(
          (u) => PRESET_SUBJECT_USER_IDS.has(u.id) && !existingIds.has(u.id)
        );
        if (missingPresets.length > 0) {
          return [...parsed, ...missingPresets];
        }
      }
      return parsed;
    } catch {
      return initialUsers;
    }
  });

  // 5. Students state
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      return saved ? JSON.parse(saved) : initialStudents;
    } catch {
      return initialStudents;
    }
  });

  // 6. Attendance state
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      return saved ? JSON.parse(saved) : getSampleAttendanceRecords();
    } catch {
      return getSampleAttendanceRecords();
    }
  });

  // 6.5 Achievements state
  const [achievements, setAchievements] = useState<SchoolAchievement[]>(() => {
    try {
      const saved = localStorage.getItem('mi_rowosari_achievements_v1');
      return saved ? JSON.parse(saved) : initialAchievements;
    } catch {
      return initialAchievements;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('mi_rowosari_achievements_v1', JSON.stringify(achievements));
    } catch {
      // ignore
    }
  }, [achievements]);

  // 7. ASAS & ASAT Exam Schedules state
  const [examSchedules, setExamSchedules] = useState<ExamScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXAM_SCHEDULES);
      return saved ? JSON.parse(saved) : initialExamSchedules;
    } catch {
      return initialExamSchedules;
    }
  });

  // 8. ASAS & ASAT Exam Configs state
  const [examConfigs, setExamConfigs] = useState<Record<ExamType, ExamMetaConfig>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXAM_CONFIGS);
      return saved ? { ...initialExamConfigs, ...JSON.parse(saved) } : initialExamConfigs;
    } catch {
      return initialExamConfigs;
    }
  });

  // 9. ASAS & ASAT Exam Instruments state
  const [examInstruments, setExamInstruments] = useState<Record<ExamType, ExamInstrumentConfig>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXAM_INSTRUMENTS);
      const merged = saved ? { ...initialExamInstruments, ...JSON.parse(saved) } : initialExamInstruments;
      return {
        ASAS: { ...merged.ASAS, madrasahName: normalizeSchoolName(merged.ASAS?.madrasahName) },
        ASAT: { ...merged.ASAT, madrasahName: normalizeSchoolName(merged.ASAT?.madrasahName) },
      };
    } catch {
      return initialExamInstruments;
    }
  });

  const [gradeKatrolSheets, setGradeKatrolSheets] = useState<GradeKatrolSheet[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GRADE_KATROL);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GRADE_KATROL, JSON.stringify(gradeKatrolSheets));
    } catch {
      // ignore storage quota errors
    }
  }, [gradeKatrolSheets]);

  // Cloud Database Status
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudProvider, setCloudProvider] = useState<'supabase' | 'firestore' | 'offline'>(() => {
    return isSupabaseConfigured ? 'supabase' : 'firestore';
  });

  const updateSupabaseConfig = useCallback((url: string, key: string) => {
    saveCustomSupabaseConfig(url, key);
    if (url.trim() && key.trim()) {
      setCloudProvider('supabase');
      showSuccessToast('Konfigurasi Supabase disimpan! Memulai sinkronisasi...');
    } else {
      setCloudProvider('firestore');
      showSuccessToast('Beralih ke mode default.');
    }
  }, []);

  // Synchronize data from Cloud (Supabase priority, Firestore fallback)
  const syncWithCloud = useCallback(async () => {
    setIsSyncing(true);
    try {
      if (isSupabaseConfigured) {
        setCloudProvider('supabase');
        // 1. Seed initial data if tables are empty
        await seedInitialSupabaseData({
          settings,
          classes,
          teachers,
          users,
          students,
          attendance,
        });

        // 2. Fetch all latest tables from Supabase
        const [
          cloudSettings,
          cloudStudents,
          cloudAttendance,
          cloudClasses,
          cloudTeachers,
          cloudUsers,
          cloudExamSchedules,
          cloudExamConfigs,
          cloudExamInstruments,
        ] = await Promise.all([
          fetchSupabaseSettings(),
          fetchSupabaseStudents(),
          fetchSupabaseAttendance(),
          fetchSupabaseClasses(),
          fetchSupabaseTeachers(),
          fetchSupabaseUsers(),
          fetchSupabaseExamSchedules(),
          fetchSupabaseExamConfigs(),
          fetchSupabaseExamInstruments(),
        ]);

        if (cloudSettings) {
          setSettings({ ...cloudSettings, schoolName: normalizeSchoolName(cloudSettings.schoolName) });
        }
        if (cloudStudents && cloudStudents.length > 0) setStudents(cloudStudents);
        if (cloudAttendance && cloudAttendance.length > 0) setAttendance(cloudAttendance);
        if (cloudClasses && cloudClasses.length > 0) setClasses(cloudClasses);
        if (cloudTeachers && cloudTeachers.length > 0) setTeachers(cloudTeachers);
        if (cloudUsers && cloudUsers.length > 0) setUsers(cloudUsers);
        if (cloudExamSchedules && cloudExamSchedules.length > 0) setExamSchedules(cloudExamSchedules);
        if (cloudExamConfigs) {
          setExamConfigs((prev) => ({ ...prev, ...cloudExamConfigs }));
        }
        if (cloudExamInstruments) {
          setExamInstruments((prev) => ({
            ASAS: {
              ...prev.ASAS,
              ...(cloudExamInstruments.ASAS || {}),
              madrasahName: normalizeSchoolName(cloudExamInstruments.ASAS?.madrasahName || prev.ASAS.madrasahName),
            },
            ASAT: {
              ...prev.ASAT,
              ...(cloudExamInstruments.ASAT || {}),
              madrasahName: normalizeSchoolName(cloudExamInstruments.ASAT?.madrasahName || prev.ASAT.madrasahName),
            },
          }));
        }

        setIsCloudConnected(true);
      } else {
        setCloudProvider('firestore');
        // Firestore sync
        await seedInitialFirestoreData({
          settings,
          classes,
          teachers,
          users,
          students,
          attendance,
        });

        const [cloudSettings, cloudExamConfigs, cloudExamInstruments] = await Promise.all([
          fetchCloudSettings(),
          fetchCloudExamConfigs(),
          fetchCloudExamInstruments(),
        ]);
        if (cloudSettings) {
          setSettings({ ...cloudSettings, schoolName: normalizeSchoolName(cloudSettings.schoolName) });
        }
        if (cloudExamConfigs) {
          setExamConfigs((prev) => ({ ...prev, ...cloudExamConfigs }));
        }
        if (cloudExamInstruments) {
          setExamInstruments((prev) => ({
            ASAS: {
              ...prev.ASAS,
              ...(cloudExamInstruments.ASAS || {}),
              madrasahName: normalizeSchoolName(cloudExamInstruments.ASAS?.madrasahName || prev.ASAS.madrasahName),
            },
            ASAT: {
              ...prev.ASAT,
              ...(cloudExamInstruments.ASAT || {}),
              madrasahName: normalizeSchoolName(cloudExamInstruments.ASAT?.madrasahName || prev.ASAT.madrasahName),
            },
          }));
        }
        setIsCloudConnected(true);
      }
    } catch (err) {
      console.warn('[Cloud Sync] Sync warning:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [settings, classes, teachers, users, students, attendance]);

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const setupSubscriptions = async () => {
      try {
        await syncWithCloud();

        if (isSupabaseConfigured) {
          // Supabase Real-time Channel
          const unsubSupabase = subscribeSupabaseChanges({
            onSettingsChange: (newSet) => setSettings(newSet),
            onStudentChange: async () => {
              const res = await fetchSupabaseStudents();
              if (res) setStudents(res);
            },
            onAttendanceChange: async () => {
              const res = await fetchSupabaseAttendance();
              if (res) setAttendance(res);
            },
            onClassChange: async () => {
              const res = await fetchSupabaseClasses();
              if (res) setClasses(res);
            },
            onTeacherChange: async () => {
              const res = await fetchSupabaseTeachers();
              if (res) setTeachers(res);
            },
            onUserChange: async () => {
              const res = await fetchSupabaseUsers();
              if (res) setUsers(res);
            },
            onExamScheduleChange: async () => {
              const res = await fetchSupabaseExamSchedules();
              if (res) setExamSchedules(res);
            },
          });
          unsubs.push(unsubSupabase);
        } else {
          // Firestore Subscriptions
          const unsubStudents = subscribeCloudStudents((cloudStudents) => {
            if (cloudStudents && cloudStudents.length > 0) setStudents(cloudStudents);
            setIsCloudConnected(true);
          }, () => setIsCloudConnected(false));
          unsubs.push(unsubStudents);

          const unsubClasses = subscribeCloudClasses((cloudClasses) => {
            if (cloudClasses && cloudClasses.length > 0) setClasses(cloudClasses);
          });
          unsubs.push(unsubClasses);

          const unsubTeachers = subscribeCloudTeachers((cloudTeachers) => {
            if (cloudTeachers && cloudTeachers.length > 0) {
              if (!localStorage.getItem(MAPEL_TEACHERS_SEED_KEY)) {
                const existingIds = new Set(cloudTeachers.map((t) => t.id));
                const missingPresets = initialTeachers.filter(
                  (t) => PRESET_SUBJECT_TEACHER_IDS.has(t.id) && !existingIds.has(t.id)
                );
                localStorage.setItem(MAPEL_TEACHERS_SEED_KEY, 'true');
                if (missingPresets.length > 0) {
                  missingPresets.forEach((t) => saveCloudTeacher(t));
                  setTeachers([...cloudTeachers, ...missingPresets]);
                  return;
                }
              }
              setTeachers(cloudTeachers);
            }
          });
          unsubs.push(unsubTeachers);

          const unsubUsers = subscribeCloudUsers((cloudUsers) => {
            if (cloudUsers && cloudUsers.length > 0) {
              if (!localStorage.getItem(MAPEL_USERS_SEED_KEY)) {
                const existingIds = new Set(cloudUsers.map((u) => u.id));
                const missingPresets = initialUsers.filter(
                  (u) => PRESET_SUBJECT_USER_IDS.has(u.id) && !existingIds.has(u.id)
                );
                localStorage.setItem(MAPEL_USERS_SEED_KEY, 'true');
                if (missingPresets.length > 0) {
                  missingPresets.forEach((u) => saveCloudUser(u));
                  setUsers([...cloudUsers, ...missingPresets]);
                  return;
                }
              }
              setUsers(cloudUsers);
            }
          });
          unsubs.push(unsubUsers);

          const unsubAttendance = subscribeCloudAttendance((cloudAttendance) => {
            if (cloudAttendance && cloudAttendance.length > 0) setAttendance(cloudAttendance);
          });
          unsubs.push(unsubAttendance);

          testFirestoreConnection();

          const unsubExamSchedules = subscribeCloudExamSchedules((cloudSchedules) => {
            if (cloudSchedules && cloudSchedules.length > 0) setExamSchedules(cloudSchedules);
          });
          unsubs.push(unsubExamSchedules);

          const unsubGradeKatrol = subscribeCloudGradeKatrol(
            (cloudSheets) => {
              if (cloudSheets && cloudSheets.length > 0) {
                setGradeKatrolSheets(cloudSheets);
              }
            },
            (err) => {
              console.warn('[Firestore] Katrol subscription notice:', err.message);
            }
          );
          unsubs.push(unsubGradeKatrol);
        }
      } catch (err) {
        console.warn('[Cloud Sync] Real-time subscription error:', err);
      }
    };

    setupSubscriptions();

    return () => {
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // ignore
        }
      });
    };
  }, []);

  // Authentication Logic (Supports both ADMIN & GURU / Wali Kelas)
  const login = (username: string, password: string) => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Find in dynamic user accounts (fallback to initialUsers if empty)
    const userPool = users.length > 0 ? users : initialUsers;
    const matched = userPool.find(
      (u) =>
        (u.username.toLowerCase() === cleanUser || (u.email && u.email.toLowerCase() === cleanUser)) &&
        u.password === cleanPass
    );

    if (matched) {
      if (matched.status === 'NONAKTIF') {
        showErrorToast('Akun ini sedang DINONAKTIFKAN oleh Administrator.');
        return { success: false, message: 'Akun Anda dinonaktifkan.' };
      }

      const userObj: AppUser = {
        id: matched.id,
        username: matched.username,
        name: matched.name,
        role: matched.role,
        assignedClass: matched.assignedClass,
        assignedClasses: matched.assignedClasses,
        assignedSubject: matched.assignedSubject,
        email: matched.email,
        phone: matched.phone,
        status: matched.status,
      };

      setCurrentUser(userObj);
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(userObj));
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
      setViewModeState('admin');
      setActiveTab('dashboard');
      setIsLoginModalOpen(false);
      window.history.pushState({}, '', '/dashboard');

      const guruDesc = matched.assignedSubject
        ? `Guru ${matched.assignedSubject} (${matched.assignedClass || 'Multi-Kelas'})`
        : `Wali ${matched.assignedClass || 'Kelas'}`;
      showSuccessToast(
        matched.role === 'ADMIN'
          ? `Selamat datang, ${matched.name}! Login Admin berhasil.`
          : `Selamat datang, ${matched.name}! Anda login sebagai ${guruDesc}.`
      );

      return { success: true, message: 'Login berhasil', user: userObj };
    }

    // Default admin fallback
    if (
      (cleanUser === 'admin' || cleanUser === 'absesnisiswami@gmail.com' || cleanUser === 'admin@mirowosari.sch.id') &&
      (cleanPass === 'admin123' || cleanPass === 'admin' || cleanPass === 'admin2026')
    ) {
      const adminObj = userPool.find((u) => u.role === 'ADMIN') || initialUsers[0];
      setCurrentUser(adminObj);
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(adminObj));
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
      setViewModeState('admin');
      setActiveTab('dashboard');
      setIsLoginModalOpen(false);
      window.history.pushState({}, '', '/dashboard');
      showSuccessToast('Login Admin Berhasil! Selamat datang di Dashboard.');
      return { success: true, message: 'Login berhasil', user: adminObj };
    }

    return { success: false, message: 'Username atau password salah.' };
  };

  const loginAdmin = (u: string, p: string) => {
    return login(u, p);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
    setViewModeState('landing');
    window.history.pushState({}, '', '/');
    showSuccessToast('Berhasil logout dari sistem.');
  };

  const logoutAdmin = () => logout();

  const clearScanResult = useCallback(() => {
    if (scanResultTimerRef.current) {
      clearTimeout(scanResultTimerRef.current);
    }
    setCurrentScanResult(null);
  }, []);

  const triggerScanResult = useCallback((result: ScanResultState, durationMs = 5000) => {
    if (scanResultTimerRef.current) {
      clearTimeout(scanResultTimerRef.current);
    }
    setCurrentScanResult(result);
    scanResultTimerRef.current = setTimeout(() => {
      setCurrentScanResult(null);
    }, durationMs);
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXAM_SCHEDULES, JSON.stringify(examSchedules));
  }, [examSchedules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXAM_CONFIGS, JSON.stringify(examConfigs));
  }, [examConfigs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXAM_INSTRUMENTS, JSON.stringify(examInstruments));
  }, [examInstruments]);

  // =========================================================================
  // SORT CLASSES FROM GRADE 1 & RBAC ACCESS CONTROL FILTERING
  // Supports both single-class Wali Kelas and multi-class Guru Mapel (PJOK/TIK)
  // =========================================================================
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const orderA = getClassGradeNumber(a);
      const orderB = getClassGradeNumber(b);
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '', 'id', {
        numeric: true,
        sensitivity: 'base',
      });
    });
  }, [classes]);

  const allowedClassNames = useMemo(
    () => getAllowedClassesForUser(currentUser, sortedClasses),
    [currentUser, sortedClasses]
  );

  const allowedClassSet = useMemo(
    () => new Set(allowedClassNames.map((n) => n.toLowerCase())),
    [allowedClassNames]
  );

  const hasRestrictedGuruScope = isGuru && allowedClassSet.size > 0;

  const accessibleStudents = useMemo(
    () =>
      hasRestrictedGuruScope
        ? students.filter((s) => allowedClassSet.has(s.className.toLowerCase()))
        : students,
    [hasRestrictedGuruScope, students, allowedClassSet]
  );

  const accessibleAttendance = useMemo(
    () =>
      hasRestrictedGuruScope
        ? attendance.filter((a) => allowedClassSet.has(a.className.toLowerCase()))
        : attendance,
    [hasRestrictedGuruScope, attendance, allowedClassSet]
  );

  const accessibleClasses = useMemo(
    () => {
      const activeYear = settings.activeAcademicYear || '2026/2027';
      let base = sortedClasses.filter((c) => (c.academicYear || '2026/2027') === activeYear);
      if (base.length === 0) base = sortedClasses;
      return hasRestrictedGuruScope
        ? base.filter((c) => allowedClassSet.has(c.name.toLowerCase()))
        : base;
    },
    [hasRestrictedGuruScope, sortedClasses, allowedClassSet, settings.activeAcademicYear]
  );

  const accessibleExamSchedules = useMemo(
    () =>
      hasRestrictedGuruScope
        ? examSchedules.filter((e) => allowedClassSet.has(e.className.toLowerCase()))
        : examSchedules,
    [hasRestrictedGuruScope, examSchedules, allowedClassSet]
  );

  const accessibleGradeKatrolSheets = useMemo(
    () =>
      hasRestrictedGuruScope
        ? gradeKatrolSheets.filter((g) => allowedClassSet.has(g.className.toLowerCase()))
        : gradeKatrolSheets,
    [hasRestrictedGuruScope, gradeKatrolSheets, allowedClassSet]
  );

  // Determine current scan type based on time and settings
  const determineScanType = useCallback((): AttendanceType => {
    if (scanMode === 'masuk') return 'masuk';
    if (scanMode === 'pulang') return 'pulang';
    
    // Auto Mode: check current time
    const now = new Date();
    const currentHoursMinutes = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isFriday = now.getDay() === 5;
    const targetOutTime = isFriday ? settings.timeOutFriday : settings.timeOutStandard;

    // If time is past standard leave time or after 11:30, treat as 'pulang'
    if (currentHoursMinutes >= targetOutTime || (currentHoursMinutes >= '11:00' && currentHoursMinutes < '17:00')) {
      return 'pulang';
    }
    return 'masuk';
  }, [scanMode, settings]);

  // Determine status (HADIR vs TERLAMBAT)
  const determineStatusForTime = useCallback((timeStr: string): AttendanceStatus => {
    const [hh, mm] = timeStr.split(':').map(Number);
    const [lateHh, lateMm] = settings.timeInLate.split(':').map(Number);

    const scanTotalMin = hh * 60 + mm;
    const lateTotalMin = lateHh * 60 + lateMm;

    if (scanTotalMin > lateTotalMin) {
      return 'TERLAMBAT';
    }
    return 'HADIR';
  }, [settings.timeInLate]);

  // RFID Scan Engine
  const processRfidScan = useCallback(
    (rfidInput: string) => {
      const cleanUid = rfidInput.trim().toUpperCase();
      if (!cleanUid) {
        return { success: false, message: 'Kode RFID kosong.' };
      }

      // Find student
      const student = students.find(
        (s) => s.rfidUid.toUpperCase() === cleanUid && s.status === 'aktif'
      );

      if (!student) {
        if (settings.soundEnabled) playErrorBeep();
        showErrorToast(`Kartu RFID [${cleanUid}] Tidak Terdaftar!`);
        triggerScanResult({
          type: 'unrecognized',
          rawUid: cleanUid,
          message: 'Silakan hubungi admin madrasah.',
        }, 4000);
        return { success: false, message: `Kartu RFID ${cleanUid} tidak ditemukan atau siswa nonaktif.` };
      }

      const today = getTodayDateString();
      const timeStr = formatJakartaTime(new Date());

      const scanType = determineScanType();
      const existingToday = attendance.find(
        (a) => a.studentId === student.id && a.date === today
      );

      // Check anti-spam cooldown
      if (existingToday) {
        const timeDiffSec = (Date.now() - existingToday.timestamp) / 1000;
        if (timeDiffSec < (settings.kioskCooldownSeconds || 3)) {
          showWarningToast(`${student.name} baru saja melakukan tap! Harap tunggu sejenak.`);
          return { success: false, message: 'Harap tunggu jeda tap.' };
        }
      }

      let finalStatus: AttendanceStatus = 'HADIR';

      if (scanType === 'masuk') {
        if (existingToday && existingToday.timeIn) {
          // Already checked in today
          if (settings.soundEnabled) playWarningChime();
          showWarningToast(`${student.name} sudah tercatat presensi Masuk pukul ${existingToday.timeIn}!`);
          triggerScanResult({
            type: 'already_scanned',
            student,
            timeString: existingToday.timeIn,
            firstScannedTime: existingToday.timeIn,
            dateString: formattedIndonesianDate,
            message: `Anda sudah melakukan absensi masuk hari ini.`,
          }, 4500);
          return { success: false, message: 'Sudah presensi masuk hari ini.' };
        }

        finalStatus = determineStatusForTime(timeStr);

        const newRecord: AttendanceRecord = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          studentId: student.id,
          nis: student.nis,
          studentName: student.name,
          className: student.className,
          date: today,
          timeIn: timeStr,
          type: 'masuk',
          status: finalStatus,
          method: 'RFID',
          notes: finalStatus === 'TERLAMBAT' ? `Terlambat (Masuk ${timeStr})` : 'Tepat waktu via RFID Gerbang',
          timestamp: Date.now(),
        };

        setAttendance((prev) => [newRecord, ...prev]);
        saveCloudAttendance(newRecord);
        saveSupabaseAttendance(newRecord);

        if (settings.soundEnabled) {
          if (finalStatus === 'TERLAMBAT') {
            playWarningChime();
          } else {
            playSuccessChime();
          }
        }

        setLastScanned({
          student,
          timeString: timeStr,
          status: finalStatus,
          type: 'masuk',
        });

        triggerScanResult({
          type: 'success',
          student,
          timeString: timeStr,
          dateString: formattedIndonesianDate,
          status: finalStatus,
          attendanceType: 'masuk',
          notes: finalStatus === 'TERLAMBAT' ? `Terlambat (Masuk ${timeStr})` : 'Tepat waktu via RFID Gerbang',
        }, 5500);

        return { success: true, message: `Presensi Masuk berhasil: ${student.name}` };
      } else {
        // Presensi Pulang
        if (!existingToday) {
          const newRecord: AttendanceRecord = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            studentId: student.id,
            nis: student.nis,
            studentName: student.name,
            className: student.className,
            date: today,
            timeOut: timeStr,
            type: 'pulang',
            status: 'HADIR',
            method: 'RFID',
            notes: `Presensi Pulang langsung (${timeStr})`,
            timestamp: Date.now(),
          };

          setAttendance((prev) => [newRecord, ...prev]);
          saveCloudAttendance(newRecord);
          saveSupabaseAttendance(newRecord);
        } else {
          const updatedRec: AttendanceRecord = {
            ...existingToday,
            timeOut: timeStr,
            type: 'pulang',
            notes: (existingToday.notes || '') + ` | Pulang: ${timeStr}`,
          };
          setAttendance((prev) =>
            prev.map((rec) =>
              rec.id === existingToday.id ? updatedRec : rec
            )
          );
          saveCloudAttendance(updatedRec);
          saveSupabaseAttendance(updatedRec);
        }

        if (settings.soundEnabled) playSuccessChime();

        setLastScanned({
          student,
          timeString: timeStr,
          status: 'HADIR',
          type: 'pulang',
        });

        triggerScanResult({
          type: 'success',
          student,
          timeString: timeStr,
          dateString: formattedIndonesianDate,
          status: 'HADIR',
          attendanceType: 'pulang',
          notes: `Presensi Pulang (${timeStr})`,
        }, 5500);

        return { success: true, message: `Presensi Pulang berhasil: ${student.name}` };
      }
    },
    [students, attendance, settings, determineScanType, determineStatusForTime, triggerScanResult, formattedIndonesianDate]
  );

  // Manual Attendance
  const addManualAttendance = useCallback(
    ({
      studentId,
      status,
      type = 'masuk',
      notes,
      customTime,
    }: {
      studentId: string;
      status: AttendanceStatus;
      type?: AttendanceType;
      notes?: string;
      customTime?: string;
    }) => {
      const student = students.find((s) => s.id === studentId);
      if (!student) {
        showErrorToast('Siswa tidak ditemukan!');
        return false;
      }

      const today = getTodayDateString();
      const timeStr = customTime || formatJakartaTime(new Date());

      // Check if student already has record today
      const existing = attendance.find(
        (a) => a.studentId === student.id && a.date === today
      );

      if (existing) {
        const updatedRec: AttendanceRecord = {
          ...existing,
          status,
          type,
          method: 'MANUAL',
          notes: notes || `Diperbarui manual (${status})`,
          timeIn: status === 'HADIR' || status === 'TERLAMBAT' ? existing.timeIn || timeStr : undefined,
        };
        setAttendance((prev) =>
          prev.map((r) =>
            r.id === existing.id ? updatedRec : r
          )
        );
        saveCloudAttendance(updatedRec);
        saveSupabaseAttendance(updatedRec);
        showSuccessToast(`Presensi ${student.name} berhasil diperbarui ke ${status}`);
        return true;
      }

      const newRecord: AttendanceRecord = {
        id: `att-man-${Date.now()}`,
        studentId: student.id,
        nis: student.nis,
        studentName: student.name,
        className: student.className,
        date: today,
        timeIn: status === 'HADIR' || status === 'TERLAMBAT' ? timeStr : undefined,
        type,
        status,
        method: 'MANUAL',
        notes: notes || `Absen manual (${status})`,
        timestamp: Date.now(),
      };

      setAttendance((prev) => [newRecord, ...prev]);
      saveCloudAttendance(newRecord);
      saveSupabaseAttendance(newRecord);

      if (settings.soundEnabled) playSuccessChime();

      setLastScanned({
        student,
        timeString: timeStr,
        status,
        type,
      });

      showSuccessToast(`Absen manual ${student.name} (${status}) berhasil dicatat`);
      return true;
    },
    [students, attendance, settings]
  );

  const updateAttendanceRecord = useCallback(
    (updated: AttendanceRecord, silent = false) => {
      if (
        hasRestrictedGuruScope &&
        !allowedClassSet.has(updated.className.toLowerCase())
      ) {
        showErrorToast('Anda hanya dapat mengubah presensi siswa pada kelas Anda.');
        return false;
      }

      const normalized: AttendanceRecord = {
        ...updated,
        method: updated.method || 'MANUAL',
      };
      if (
        normalized.status === 'IZIN' ||
        normalized.status === 'SAKIT' ||
        normalized.status === 'ALPA'
      ) {
        normalized.timeIn = undefined;
        normalized.timeOut = undefined;
      }

      setAttendance((prev) =>
        prev.map((a) => (a.id === normalized.id ? normalized : a))
      );
      saveCloudAttendance(normalized);
      saveSupabaseAttendance(normalized);
      if (!silent) {
        showSuccessToast(
          `Presensi ${normalized.studentName} (${normalized.date}) berhasil diubah ke ${normalized.status}.`
        );
      }
      return true;
    },
    [hasRestrictedGuruScope, allowedClassSet]
  );

  const upsertAttendanceForDate = useCallback(
    (
      {
        studentId,
        date,
        status,
        type = 'masuk',
        timeIn,
        timeOut,
        notes,
      }: {
        studentId: string;
        date: string;
        status: AttendanceStatus;
        type?: AttendanceType;
        timeIn?: string;
        timeOut?: string;
        notes?: string;
      },
      silent = false
    ) => {
      const student = students.find((s) => s.id === studentId);
      if (!student) {
        showErrorToast('Siswa tidak ditemukan!');
        return false;
      }
      if (
        hasRestrictedGuruScope &&
        !allowedClassSet.has(student.className.toLowerCase())
      ) {
        showErrorToast('Anda hanya dapat mengelola presensi siswa pada kelas Anda.');
        return false;
      }
      if (!date) {
        showErrorToast('Tanggal wajib dipilih.');
        return false;
      }

      const isPresentStatus = status === 'HADIR' || status === 'TERLAMBAT';
      const defaultTimeIn =
        status === 'TERLAMBAT'
          ? `${settings.timeInLate || '07:15'}:00`
          : `${settings.timeInStandard || '07:00'}:00`;
      const existing = attendance.find(
        (a) => a.studentId === student.id && a.date === date
      );

      if (existing) {
        const updatedRec: AttendanceRecord = {
          ...existing,
          status,
          type: type || existing.type || 'masuk',
          method: 'MANUAL',
          notes:
            notes !== undefined && notes.trim() !== ''
              ? notes.trim()
              : `Diperbarui manual (${status})`,
          timeIn: isPresentStatus
            ? (timeIn !== undefined ? timeIn.trim() : existing.timeIn) || defaultTimeIn
            : undefined,
          timeOut: isPresentStatus
            ? (timeOut !== undefined ? timeOut.trim() : existing.timeOut) || undefined
            : undefined,
        };
        setAttendance((prev) =>
          prev.map((r) => (r.id === existing.id ? updatedRec : r))
        );
        saveCloudAttendance(updatedRec);
        saveSupabaseAttendance(updatedRec);
        if (!silent) {
          showSuccessToast(
            `Presensi ${student.name} (${date}) berhasil diperbarui ke ${status}.`
          );
        }
        return true;
      }

      const newRecord: AttendanceRecord = {
        id: `att-man-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: student.id,
        nis: student.nis,
        studentName: student.name,
        className: student.className,
        date,
        timeIn: isPresentStatus ? (timeIn?.trim() || defaultTimeIn) : undefined,
        timeOut: isPresentStatus ? (timeOut?.trim() || undefined) : undefined,
        type,
        status,
        method: 'MANUAL',
        notes:
          notes !== undefined && notes.trim() !== ''
            ? notes.trim()
            : `Input manual laporan (${status})`,
        timestamp: Date.now(),
      };

      setAttendance((prev) => [newRecord, ...prev]);
      saveCloudAttendance(newRecord);
      saveSupabaseAttendance(newRecord);
      if (!silent) {
        showSuccessToast(
          `Presensi ${student.name} (${date}) dicatat sebagai ${status}.`
        );
      }
      return true;
    },
    [students, attendance, settings, hasRestrictedGuruScope, allowedClassSet]
  );

  const batchUpdateAttendanceStatus = useCallback(
    (ids: string[], status: AttendanceStatus, notes?: string) => {
      if (ids.length === 0) return 0;
      const idSet = new Set(ids);
      const isPresentStatus = status === 'HADIR' || status === 'TERLAMBAT';
      const defaultTimeIn =
        status === 'TERLAMBAT'
          ? `${settings.timeInLate || '07:15'}:00`
          : `${settings.timeInStandard || '07:00'}:00`;

      const updatedItems: AttendanceRecord[] = [];
      setAttendance((prev) =>
        prev.map((rec) => {
          if (!idSet.has(rec.id)) return rec;
          if (
            hasRestrictedGuruScope &&
            !allowedClassSet.has(rec.className.toLowerCase())
          ) {
            return rec;
          }
          const nextRec: AttendanceRecord = {
            ...rec,
            status,
            method: 'MANUAL',
            timeIn: isPresentStatus ? rec.timeIn || defaultTimeIn : undefined,
            timeOut: isPresentStatus ? rec.timeOut : undefined,
            notes:
              notes !== undefined && notes.trim() !== ''
                ? notes.trim()
                : `Diperbarui massal (${status})`,
          };
          updatedItems.push(nextRec);
          return nextRec;
        })
      );

      // Persist asynchronously using current attendance snapshot
      const snapshotToSave = attendance
        .filter((rec) => idSet.has(rec.id))
        .filter(
          (rec) =>
            !(
              hasRestrictedGuruScope &&
              !allowedClassSet.has(rec.className.toLowerCase())
            )
        )
        .map((rec) => ({
          ...rec,
          status,
          method: 'MANUAL' as const,
          timeIn: isPresentStatus ? rec.timeIn || defaultTimeIn : undefined,
          timeOut: isPresentStatus ? rec.timeOut : undefined,
          notes:
            notes !== undefined && notes.trim() !== ''
              ? notes.trim()
              : `Diperbarui massal (${status})`,
        }));

      const toPersist = snapshotToSave.length > 0 ? snapshotToSave : updatedItems;
      toPersist.forEach((rec) => {
        saveCloudAttendance(rec);
        saveSupabaseAttendance(rec);
      });

      if (toPersist.length > 0) {
        showSuccessToast(
          `${toPersist.length} data presensi berhasil diubah menjadi ${status}.`
        );
      }
      return toPersist.length;
    },
    [attendance, settings, hasRestrictedGuruScope, allowedClassSet]
  );

  const deleteAttendanceRecord = useCallback((id: string, silent = false) => {
    setAttendance((prev) => prev.filter((a) => a.id !== id));
    deleteCloudAttendance(id);
    deleteSupabaseAttendance(id);
    if (!silent) {
      showSuccessToast('Data presensi berhasil dihapus.');
    }
  }, []);

  // Student CRUD
  const addStudent = useCallback(
    (studentData: Omit<Student, 'id' | 'createdAt'>) => {
      // Check duplicate RFID
      if (studentData.rfidUid) {
        const dupRfid = students.find(
          (s) => s.rfidUid.toLowerCase() === studentData.rfidUid.toLowerCase()
        );
        if (dupRfid) {
          showWarningAlert(
            'RFID Sudah Terdaftar',
            `Kode RFID ${studentData.rfidUid} sudah digunakan oleh siswa ${dupRfid.name} (${dupRfid.className})!`
          );
        }
      }

      const newStudent: Student = {
        ...studentData,
        id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: getTodayDateString(),
      };
      setStudents((prev) => [newStudent, ...prev]);
      saveCloudStudent(newStudent);
      saveSupabaseStudent(newStudent);
      showSuccessToast(`Siswa ${newStudent.name} berhasil ditambahkan!`);
      return newStudent;
    },
    [students]
  );

  // Batch import students from Excel
  const batchImportStudents = useCallback(
    (newStudents: Omit<Student, 'id' | 'createdAt'>[]) => {
      const timestamp = Date.now();
      const formatted: Student[] = newStudents.map((s, idx) => ({
        ...s,
        id: `s-${timestamp}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: getTodayDateString(),
      }));

      setStudents((prev) => [...formatted, ...prev]);
      batchSaveCloudStudents(formatted);
      batchSaveSupabaseStudents(formatted);
      showSuccessToast(`Berhasil mengimpor ${formatted.length} data siswa dari Excel!`);
      return formatted.length;
    },
    []
  );

  const updateStudent = useCallback(
    (updated: Student) => {
      if (updated.rfidUid) {
        const dupRfid = students.find(
          (s) =>
            s.id !== updated.id &&
            s.rfidUid.toLowerCase() === updated.rfidUid.toLowerCase()
        );
        if (dupRfid) {
          showWarningAlert(
            'RFID Duplikat',
            `Kode RFID ${updated.rfidUid} sudah digunakan oleh ${dupRfid.name}!`
          );
        }
      }

      setStudents((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      saveCloudStudent(updated);
      saveSupabaseStudent(updated);
      showSuccessToast(`Data siswa ${updated.name} berhasil diperbarui.`);
    },
    [students]
  );

  const batchUpdateStudentPhotos = useCallback(
    (updates: { studentId: string; photoUrl: string }[]) => {
      if (updates.length === 0) return 0;
      const photoMap = new Map(updates.map((u) => [u.studentId, u.photoUrl]));
      const updatedStudents: Student[] = [];

      setStudents((prev) =>
        prev.map((s) => {
          const nextPhoto = photoMap.get(s.id);
          if (nextPhoto !== undefined) {
            const updated = { ...s, photoUrl: nextPhoto };
            updatedStudents.push(updated);
            return updated;
          }
          return s;
        })
      );

      // Build list from current state snapshot if React updater runs asynchronously
      const cloudList = students
        .filter((s) => photoMap.has(s.id))
        .map((s) => ({ ...s, photoUrl: photoMap.get(s.id)! }));

      const payloadToSync = cloudList.length > 0 ? cloudList : updatedStudents;
      if (payloadToSync.length > 0) {
        batchSaveCloudStudents(payloadToSync);
        batchSaveSupabaseStudents(payloadToSync);
      }

      showSuccessToast(`Berhasil memasang foto untuk ${updates.length} siswa!`);
      return updates.length;
    },
    [students]
  );

  const deleteStudent = useCallback((id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    deleteCloudStudent(id);
    deleteSupabaseStudent(id);
    showSuccessToast('Data siswa berhasil dihapus.');
  }, []);

  const batchDeleteStudents = useCallback((ids: string[]) => {
    if (ids.length === 0) return 0;
    const idSet = new Set(ids);
    setStudents((prev) => prev.filter((s) => !idSet.has(s.id)));
    ids.forEach((id) => {
      deleteCloudStudent(id);
      deleteSupabaseStudent(id);
    });
    showSuccessToast(`Berhasil menghapus ${ids.length} data siswa.`);
    return ids.length;
  }, []);

  // Class CRUD
  const addClass = useCallback(
    (clsData: Omit<ClassRoom, 'id'>) => {
      const newClass: ClassRoom = {
        ...clsData,
        name: clsData.name.trim(),
        id: `c-${Date.now()}`,
      };
      setClasses((prev) => [...prev, newClass]);
      saveCloudClass(newClass);
      saveSupabaseClass(newClass);

      if (newClass.homeroomTeacherId) {
        const targetTeacher = teachers.find((t) => t.id === newClass.homeroomTeacherId);
        if (targetTeacher && targetTeacher.assignedClass !== newClass.name) {
          const updatedTeacher = { ...targetTeacher, assignedClass: newClass.name };
          setTeachers((prev) =>
            prev.map((t) => (t.id === targetTeacher.id ? updatedTeacher : t))
          );
          saveCloudTeacher(updatedTeacher);
          saveSupabaseTeacher(updatedTeacher);
        }
      }

      showSuccessToast(`Rombel ${newClass.name} berhasil ditambahkan.`);
      return newClass;
    },
    [teachers]
  );

  const updateClass = useCallback(
    (updated: ClassRoom) => {
      const existing = classes.find((c) => c.id === updated.id);
      const oldName = existing?.name;
      const newName = updated.name.trim();
      const normalizedUpdated = { ...updated, name: newName };

      setClasses((prev) => prev.map((c) => (c.id === updated.id ? normalizedUpdated : c)));
      saveCloudClass(normalizedUpdated);
      saveSupabaseClass(normalizedUpdated);

      if (normalizedUpdated.homeroomTeacherId) {
        const targetTeacher = teachers.find(
          (t) => t.id === normalizedUpdated.homeroomTeacherId
        );
        if (targetTeacher && targetTeacher.assignedClass !== newName) {
          const updatedTeacher = { ...targetTeacher, assignedClass: newName };
          setTeachers((prev) =>
            prev.map((t) => (t.id === targetTeacher.id ? updatedTeacher : t))
          );
          saveCloudTeacher(updatedTeacher);
          saveSupabaseTeacher(updatedTeacher);
        }
      }

      if (oldName && oldName !== newName) {
        const affectedStudents = students
          .filter((s) => s.className === oldName)
          .map((s) => ({ ...s, className: newName }));
        if (affectedStudents.length > 0) {
          setStudents((prev) =>
            prev.map((s) => (s.className === oldName ? { ...s, className: newName } : s))
          );
          batchSaveCloudStudents(affectedStudents);
          batchSaveSupabaseStudents(affectedStudents);
        }

        const affectedTeachers = teachers.filter((t) => t.assignedClass === oldName);
        if (affectedTeachers.length > 0) {
          setTeachers((prev) =>
            prev.map((t) =>
              t.assignedClass === oldName ? { ...t, assignedClass: newName } : t
            )
          );
          affectedTeachers.forEach((t) => {
            const nt = { ...t, assignedClass: newName };
            saveCloudTeacher(nt);
            saveSupabaseTeacher(nt);
          });
        }

        const affectedUsers = users.filter((u) => u.assignedClass === oldName);
        if (affectedUsers.length > 0) {
          setUsers((prev) =>
            prev.map((u) =>
              u.assignedClass === oldName ? { ...u, assignedClass: newName } : u
            )
          );
          affectedUsers.forEach((u) => {
            const nu = { ...u, assignedClass: newName };
            saveCloudUser(nu);
            saveSupabaseUser(nu);
          });
        }

        const affectedSchedules = examSchedules
          .filter((ex) => ex.className === oldName)
          .map((ex) => ({ ...ex, className: newName }));
        if (affectedSchedules.length > 0) {
          setExamSchedules((prev) =>
            prev.map((ex) => (ex.className === oldName ? { ...ex, className: newName } : ex))
          );
          batchSaveCloudExamSchedules(affectedSchedules);
          batchSaveSupabaseExamSchedules(affectedSchedules);
        }
      }

      showSuccessToast(`Data rombel ${normalizedUpdated.name} berhasil diperbarui.`);
    },
    [classes, students, teachers, users, examSchedules]
  );

  const deleteClass = useCallback((id: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== id));
    deleteCloudClass(id);
    deleteSupabaseClass(id);
    showSuccessToast('Rombel berhasil dihapus.');
  }, []);

  // Teacher CRUD
  const addTeacher = useCallback(
    (teacherData: Omit<Teacher, 'id'>) => {
      const newTeacher: Teacher = {
        ...teacherData,
        id: `t-${Date.now()}`,
      };
      setTeachers((prev) => [...prev, newTeacher]);
      saveCloudTeacher(newTeacher);
      saveSupabaseTeacher(newTeacher);

      if (newTeacher.assignedClass) {
        const targetClass = classes.find((c) => c.name === newTeacher.assignedClass);
        if (targetClass && targetClass.homeroomTeacherId !== newTeacher.id) {
          const updatedClass = { ...targetClass, homeroomTeacherId: newTeacher.id };
          setClasses((prev) =>
            prev.map((c) => (c.id === targetClass.id ? updatedClass : c))
          );
          saveCloudClass(updatedClass);
          saveSupabaseClass(updatedClass);
        }
      }

      showSuccessToast(`Wali kelas ${newTeacher.name} berhasil ditambahkan.`);
      return newTeacher;
    },
    [classes]
  );

  const updateTeacher = useCallback(
    (updated: Teacher) => {
      setTeachers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      saveCloudTeacher(updated);
      saveSupabaseTeacher(updated);

      const affectedClasses: ClassRoom[] = [];
      classes.forEach((cls) => {
        if (cls.name === updated.assignedClass && cls.homeroomTeacherId !== updated.id) {
          affectedClasses.push({ ...cls, homeroomTeacherId: updated.id });
        } else if (
          cls.homeroomTeacherId === updated.id &&
          cls.name !== updated.assignedClass
        ) {
          affectedClasses.push({ ...cls, homeroomTeacherId: '' });
        }
      });

      if (affectedClasses.length > 0) {
        const updatedMap = new Map(affectedClasses.map((c) => [c.id, c]));
        setClasses((prev) => prev.map((c) => updatedMap.get(c.id) || c));
        affectedClasses.forEach((c) => {
          saveCloudClass(c);
          saveSupabaseClass(c);
        });
      }

      showSuccessToast(`Data wali kelas ${updated.name} berhasil diperbarui.`);
    },
    [classes]
  );

  const deleteTeacher = useCallback(
    (id: string) => {
      setTeachers((prev) => prev.filter((t) => t.id !== id));
      deleteCloudTeacher(id);
      deleteSupabaseTeacher(id);

      const clearedClasses = classes
        .filter((c) => c.homeroomTeacherId === id)
        .map((c) => ({ ...c, homeroomTeacherId: '' }));
      if (clearedClasses.length > 0) {
        const clearedMap = new Map(clearedClasses.map((c) => [c.id, c]));
        setClasses((prev) => prev.map((c) => clearedMap.get(c.id) || c));
        clearedClasses.forEach((c) => {
          saveCloudClass(c);
          saveSupabaseClass(c);
        });
      }

      showSuccessToast('Wali kelas berhasil dihapus.');
    },
    [classes]
  );

  // User Management (RBAC)
  const addUser = useCallback((userData: UserAccount) => {
    const newUser: UserAccount = {
      ...userData,
      id: userData.id || `u-${Date.now()}`,
    };
    setUsers((prev) => [newUser, ...prev]);
    saveCloudUser(newUser);
    saveSupabaseUser(newUser);
    showSuccessToast(`Akun user [${newUser.username}] berhasil dibuat.`);
    return newUser;
  }, []);

  const updateUser = useCallback((updated: UserAccount) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    saveCloudUser(updated);
    saveSupabaseUser(updated);
    showSuccessToast(`Data akun [${updated.username}] berhasil diperbarui.`);
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    deleteCloudUser(id);
    deleteSupabaseUser(id);
    showSuccessToast('Akun user berhasil dihapus.');
  }, []);

  const toggleUserStatus = useCallback((id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const nextStatus = u.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
          const updatedUser = { ...u, status: nextStatus as 'AKTIF' | 'NONAKTIF' };
          saveCloudUser(updatedUser);
          saveSupabaseUser(updatedUser);
          showSuccessToast(`Status akun ${u.username} diubah menjadi ${nextStatus}.`);
          return updatedUser;
        }
        return u;
      })
    );
  }, []);

  const resetUserPassword = useCallback((id: string, newPassword = 'password123') => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const updatedUser = { ...u, password: newPassword };
          saveCloudUser(updatedUser);
          saveSupabaseUser(updatedUser);
          showSuccessToast(`Password user [${u.username}] berhasil direset ke '${newPassword}'.`);
          return updatedUser;
        }
        return u;
      })
    );
  }, []);

  const academicYears = useMemo(() => {
    const list = settings.academicYears && settings.academicYears.length > 0
      ? settings.academicYears
      : ['2024/2025', '2025/2026', '2026/2027'];
    if (settings.activeAcademicYear && !list.includes(settings.activeAcademicYear)) {
      list.push(settings.activeAcademicYear);
    }
    return Array.from(new Set(list)).sort();
  }, [settings.academicYears, settings.activeAcademicYear]);

  const setActiveAcademicYear = useCallback((year: string) => {
    const updated = { ...settings, activeAcademicYear: year };
    setSettings(updated);
    saveCloudSettings(updated);
    saveSupabaseSettings(updated);
    showSuccessToast(`Tahun ajaran aktif diubah ke ${year}.`);
  }, [settings]);

  const addAcademicYear = useCallback((newYear: string) => {
    const clean = newYear.trim();
    if (!clean) return false;
    const currentYears = settings.academicYears || ['2024/2025', '2025/2026', '2026/2027'];
    if (currentYears.includes(clean)) {
      showWarningToast(`Tahun ajaran ${clean} sudah ada.`);
      return false;
    }
    const updatedYears = [...currentYears, clean].sort();
    const updated = { ...settings, academicYears: updatedYears, activeAcademicYear: clean };
    setSettings(updated);
    saveCloudSettings(updated);
    saveSupabaseSettings(updated);
    showSuccessToast(`Tahun ajaran baru ${clean} berhasil ditambahkan dan diaktifkan.`);
    return true;
  }, [settings]);

  const importDataFromPreviousYear = useCallback((sourceYear: string, targetYear: string) => {
    const sourceClasses = classes.filter(c => (c.academicYear || '2026/2027') === sourceYear);
    if (sourceClasses.length === 0) {
      showWarningToast(`Tidak ada data kelas pada tahun ajaran ${sourceYear}.`);
      return false;
    }

    const newClasses: ClassRoom[] = sourceClasses.map((sc, idx) => ({
      id: `cls-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      name: sc.name,
      grade: sc.grade,
      academicYear: targetYear,
      homeroomTeacherId: sc.homeroomTeacherId,
    }));

    const sourceClassNames = new Set(sourceClasses.map(c => c.name.toLowerCase()));
    const sourceStudents = students.filter(s => sourceClassNames.has(s.className.toLowerCase()));

    const newStudents: Student[] = sourceStudents.map((ss, idx) => ({
      ...ss,
      id: `st-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
    }));

    setClasses(prev => [...newClasses, ...prev]);
    if (newStudents.length > 0) {
      setStudents(prev => [...newStudents, ...prev]);
      batchSaveCloudStudents(newStudents);
      batchSaveSupabaseStudents(newStudents);
    }
    newClasses.forEach(c => saveCloudClass(c));
    newClasses.forEach(c => saveSupabaseClass(c));

    const currentYears = settings.academicYears || ['2024/2025', '2025/2026', '2026/2027'];
    const updatedYears = currentYears.includes(targetYear) ? currentYears : [...currentYears, targetYear].sort();
    const updatedSettings = { ...settings, academicYears: updatedYears, activeAcademicYear: targetYear };
    setSettings(updatedSettings);
    saveCloudSettings(updatedSettings);
    saveSupabaseSettings(updatedSettings);

    showSuccessToast(`Berhasil mengimpor ${newClasses.length} kelas dan ${newStudents.length} siswa dari TA ${sourceYear} ke TA ${targetYear}!`);
    return true;
  }, [classes, students, settings]);

  // Settings
  const updateSettings = useCallback((newSettings: SchoolSettings) => {
    setSettings(newSettings);
    saveCloudSettings(newSettings);
    saveSupabaseSettings(newSettings);
    showSuccessToast('Pengaturan sistem berhasil disimpan.');
  }, []);

  const resetAllData = useCallback(() => {
    setSettings(initialSettings);
    setClasses(initialClasses);
    setTeachers(initialTeachers);
    setUsers(initialUsers);
    setStudents(initialStudents);
    setAttendance(getSampleAttendanceRecords());
    setExamSchedules(initialExamSchedules);
    setExamConfigs(initialExamConfigs);
    setExamInstruments(initialExamInstruments);
    saveCloudSettings(initialSettings);
    saveSupabaseSettings(initialSettings);
    showSuccessToast('Semua data berhasil direset ke pengaturan awal.');
  }, []);

  // ASAS & ASAT Exam Schedules & Configs CRUD
  const addExamSchedule = useCallback((itemData: Omit<ExamScheduleItem, 'id'>) => {
    const newItem: ExamScheduleItem = {
      ...itemData,
      id: `ex-${itemData.examType.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setExamSchedules((prev) => [...prev, newItem]);
    saveCloudExamSchedule(newItem);
    saveSupabaseExamSchedule(newItem);
    showSuccessToast(`Jadwal ${newItem.subject} (${newItem.className}) berhasil ditambahkan.`);
    return newItem;
  }, []);

  const updateExamSchedule = useCallback((updated: ExamScheduleItem) => {
    setExamSchedules((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    saveCloudExamSchedule(updated);
    saveSupabaseExamSchedule(updated);
    showSuccessToast(`Jadwal ${updated.subject} berhasil diperbarui.`);
  }, []);

  const deleteExamSchedule = useCallback((id: string) => {
    setExamSchedules((prev) => prev.filter((item) => item.id !== id));
    deleteCloudExamSchedule(id);
    deleteSupabaseExamSchedule(id);
    showSuccessToast('Jadwal mata pelajaran ujian berhasil dihapus.');
  }, []);

  const copyExamSchedulesToClasses = useCallback(
    (examType: ExamType, sourceClass: string, targetClasses: string[]) => {
      const sourceItems = examSchedules.filter(
        (s) => s.examType === examType && s.className === sourceClass
      );
      if (sourceItems.length === 0 || targetClasses.length === 0) return 0;

      const createdItems: ExamScheduleItem[] = [];
      const ts = Date.now();
      targetClasses.forEach((targetClass, cIdx) => {
        if (targetClass === sourceClass) return;
        sourceItems.forEach((src, sIdx) => {
          createdItems.push({
            ...src,
            id: `ex-${examType.toLowerCase()}-cp-${ts}-${cIdx}-${sIdx}`,
            className: targetClass,
          });
        });
      });

      if (createdItems.length > 0) {
        setExamSchedules((prev) => {
          // Remove existing schedule for those targetClasses & examType to avoid duplicates
          const filtered = prev.filter(
            (item) => !(item.examType === examType && targetClasses.includes(item.className))
          );
          return [...filtered, ...createdItems];
        });
        batchSaveCloudExamSchedules(createdItems);
        batchSaveSupabaseExamSchedules(createdItems);
        showSuccessToast(
          `Berhasil menyalin ${sourceItems.length} jadwal ${examType} ke ${targetClasses.length} kelas!`
        );
      }
      return createdItems.length;
    },
    [examSchedules]
  );

  const updateExamConfig = useCallback(
    (examType: ExamType, config: ExamMetaConfig, silent = false) => {
      setExamConfigs((prev) => ({
        ...prev,
        [examType]: config,
      }));
      saveCloudExamConfig(examType, config);
      saveSupabaseExamConfig(config);
      if (!silent) {
        showSuccessToast(`Pengaturan Kartu & Panitia ${examType} berhasil disimpan.`);
      }
    },
    []
  );

  const updateExamInstrument = useCallback(
    (examType: ExamType, instrument: ExamInstrumentConfig, silent = false) => {
      setExamInstruments((prev) => ({
        ...prev,
        [examType]: instrument,
      }));
      saveCloudExamInstrument(examType, instrument);
      saveSupabaseExamInstrument(instrument);
      if (!silent) {
        showSuccessToast(`Instrumen Pelaksanaan & Kelengkapan ${examType} berhasil disimpan.`);
      }
    },
    []
  );

  const saveGradeKatrolSheet = useCallback(async (sheet: GradeKatrolSheet, silent = false) => {
    setGradeKatrolSheets((prev) => {
      const idx = prev.findIndex((item) => item.id === sheet.id);
      const next = idx >= 0 ? prev.map((item) => (item.id === sheet.id ? sheet : item)) : [sheet, ...prev];
      return [...next].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    });
    try {
      await saveCloudGradeKatrol(sheet);
      if (!silent) {
        showSuccessToast(`Data Katrol Nilai ${sheet.subject} (${sheet.className}) berhasil disimpan.`);
      }
    } catch {
      if (!silent) {
        showWarningToast('Disimpan di perangkat lokal; sinkronisasi cloud tertunda.');
      }
    }
  }, []);

  const addAchievement = useCallback((data: Omit<SchoolAchievement, 'id'>) => {
    const newItem: SchoolAchievement = {
      ...data,
      id: `ach-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setAchievements((prev) => [newItem, ...prev]);
    showSuccessToast(`Prestasi "${newItem.title}" berhasil ditambahkan.`);
    return newItem;
  }, []);

  const updateAchievement = useCallback((updated: SchoolAchievement) => {
    setAchievements((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    showSuccessToast(`Data prestasi berhasil diperbarui.`);
  }, []);

  const deleteAchievement = useCallback((id: string) => {
    setAchievements((prev) => prev.filter((item) => item.id !== id));
    showSuccessToast(`Data prestasi berhasil dihapus.`);
  }, []);

  const deleteGradeKatrolSheet = useCallback(async (id: string) => {
    setGradeKatrolSheets((prev) => prev.filter((item) => item.id !== id));
    try {
      await deleteCloudGradeKatrol(id);
      showSuccessToast('Data Katrol Nilai berhasil dihapus.');
    } catch {
      showWarningToast('Data lokal dihapus; penghapusan cloud tertunda.');
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        viewMode,
        setViewMode,
        currentUser,
        isAdminLoggedIn,
        isGuru,
        isAdmin,
        login,
        loginAdmin,
        logout,
        logoutAdmin,
        isLoginModalOpen,
        setIsLoginModalOpen,
        activeTab,
        setActiveTab,
        isCloudConnected,
        isSyncing,
        cloudProvider,
        syncWithCloud,
        updateSupabaseConfig,
        students,
        classes: sortedClasses,
        teachers,
        users,
        attendance,
        settings,
        accessibleStudents,
        accessibleAttendance,
        accessibleClasses,
        scanMode,
        setScanMode,
        lastScanned,
        currentScanResult,
        clearScanResult,
        currentTimeString,
        currentDateString,
        formattedIndonesianDate,
        isMobileNavOpen,
        setIsMobileNavOpen,
        processRfidScan,
        addManualAttendance,
        updateAttendanceRecord,
        upsertAttendanceForDate,
        batchUpdateAttendanceStatus,
        deleteAttendanceRecord,
        addStudent,
        batchImportStudents,
        batchUpdateStudentPhotos,
        updateStudent,
        deleteStudent,
        batchDeleteStudents,
        addClass,
        updateClass,
        deleteClass,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        addUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        resetUserPassword,
        updateSettings,
        resetAllData,
        activeAcademicYear: settings.activeAcademicYear || '2026/2027',
        academicYears,
        setActiveAcademicYear,
        addAcademicYear,
        importDataFromPreviousYear,
        examSchedules,
        accessibleExamSchedules,
        examConfigs,
        examInstruments,
        addExamSchedule,
        updateExamSchedule,
        deleteExamSchedule,
        copyExamSchedulesToClasses,
        updateExamConfig,
        updateExamInstrument,
        gradeKatrolSheets,
        accessibleGradeKatrolSheets,
        saveGradeKatrolSheet,
        deleteGradeKatrolSheet,
        achievements,
        addAchievement,
        updateAchievement,
        deleteAchievement,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
