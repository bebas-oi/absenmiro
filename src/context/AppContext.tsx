import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  ScanResultState,
  SchoolSettings,
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
  saveCloudSettings,
  saveCloudStudent,
  saveCloudTeacher,
  saveCloudUser,
  seedInitialFirestoreData,
  subscribeCloudAttendance,
  subscribeCloudClasses,
  subscribeCloudExamSchedules,
  subscribeCloudStudents,
  subscribeCloudTeachers,
  subscribeCloudUsers,
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
  deleteAttendanceRecord: (id: string) => void;

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

  // ASAS & ASAT Exam Schedules, Configs & Instruments
  examSchedules: ExamScheduleItem[];
  accessibleExamSchedules: ExamScheduleItem[];
  examConfigs: Record<ExamType, ExamMetaConfig>;
  examInstruments: Record<ExamType, ExamInstrumentConfig>;
  addExamSchedule: (item: Omit<ExamScheduleItem, 'id'>) => ExamScheduleItem;
  updateExamSchedule: (item: ExamScheduleItem) => void;
  deleteExamSchedule: (id: string) => void;
  copyExamSchedulesToClasses: (examType: ExamType, sourceClass: string, targetClasses: string[]) => number;
  updateExamConfig: (examType: ExamType, config: ExamMetaConfig) => void;
  updateExamInstrument: (examType: ExamType, instrument: ExamInstrumentConfig, silent?: boolean) => void;
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
      return saved ? JSON.parse(saved) : initialTeachers;
    } catch {
      return initialTeachers;
    }
  });

  // 4. Users state (RBAC accounts)
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      return saved ? JSON.parse(saved) : initialUsers;
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
            if (cloudTeachers && cloudTeachers.length > 0) setTeachers(cloudTeachers);
          });
          unsubs.push(unsubTeachers);

          const unsubUsers = subscribeCloudUsers((cloudUsers) => {
            if (cloudUsers && cloudUsers.length > 0) setUsers(cloudUsers);
          });
          unsubs.push(unsubUsers);

          const unsubAttendance = subscribeCloudAttendance((cloudAttendance) => {
            if (cloudAttendance && cloudAttendance.length > 0) setAttendance(cloudAttendance);
          });
          unsubs.push(unsubAttendance);

          const unsubExamSchedules = subscribeCloudExamSchedules((cloudSchedules) => {
            if (cloudSchedules && cloudSchedules.length > 0) setExamSchedules(cloudSchedules);
          });
          unsubs.push(unsubExamSchedules);
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

      showSuccessToast(
        matched.role === 'ADMIN'
          ? `Selamat datang, ${matched.name}! Login Admin berhasil.`
          : `Selamat datang, ${matched.name}! Anda login sebagai Wali Kelas ${matched.assignedClass}.`
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
  // RBAC ACCESS CONTROL FILTERING (BACKEND CONTEXT ENFORCEMENT)
  // If currentUser is GURU, data is strictly filtered to their assignedClass
  // =========================================================================
  const accessibleStudents = isGuru && currentUser?.assignedClass
    ? students.filter((s) => s.className.toLowerCase() === currentUser.assignedClass?.toLowerCase())
    : students;

  const accessibleAttendance = isGuru && currentUser?.assignedClass
    ? attendance.filter((a) => a.className.toLowerCase() === currentUser.assignedClass?.toLowerCase())
    : attendance;

  const accessibleClasses = isGuru && currentUser?.assignedClass
    ? classes.filter((c) => c.name.toLowerCase() === currentUser.assignedClass?.toLowerCase())
    : classes;

  const accessibleExamSchedules = isGuru && currentUser?.assignedClass
    ? examSchedules.filter((e) => e.className.toLowerCase() === currentUser.assignedClass?.toLowerCase())
    : examSchedules;

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

  const deleteAttendanceRecord = useCallback((id: string) => {
    setAttendance((prev) => prev.filter((a) => a.id !== id));
    deleteCloudAttendance(id);
    deleteSupabaseAttendance(id);
    showSuccessToast('Data presensi berhasil dihapus.');
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
  const addClass = useCallback((clsData: Omit<ClassRoom, 'id'>) => {
    const newClass: ClassRoom = {
      ...clsData,
      id: `c-${Date.now()}`,
    };
    setClasses((prev) => [...prev, newClass]);
    saveCloudClass(newClass);
    saveSupabaseClass(newClass);
    showSuccessToast(`Rombel ${newClass.name} berhasil ditambahkan.`);
    return newClass;
  }, []);

  const updateClass = useCallback(
    (updated: ClassRoom) => {
      const existing = classes.find((c) => c.id === updated.id);
      const oldName = existing?.name;
      const newName = updated.name.trim();
      const normalizedUpdated = { ...updated, name: newName };

      setClasses((prev) => prev.map((c) => (c.id === updated.id ? normalizedUpdated : c)));
      saveCloudClass(normalizedUpdated);
      saveSupabaseClass(normalizedUpdated);

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
  const addTeacher = useCallback((teacherData: Omit<Teacher, 'id'>) => {
    const newTeacher: Teacher = {
      ...teacherData,
      id: `t-${Date.now()}`,
    };
    setTeachers((prev) => [...prev, newTeacher]);
    saveCloudTeacher(newTeacher);
    saveSupabaseTeacher(newTeacher);
    showSuccessToast(`Wali kelas ${newTeacher.name} berhasil ditambahkan.`);
    return newTeacher;
  }, []);

  const updateTeacher = useCallback((updated: Teacher) => {
    setTeachers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    saveCloudTeacher(updated);
    saveSupabaseTeacher(updated);
    showSuccessToast(`Data wali kelas ${updated.name} berhasil diperbarui.`);
  }, []);

  const deleteTeacher = useCallback((id: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
    deleteCloudTeacher(id);
    deleteSupabaseTeacher(id);
    showSuccessToast('Wali kelas berhasil dihapus.');
  }, []);

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

  const updateExamConfig = useCallback((examType: ExamType, config: ExamMetaConfig) => {
    setExamConfigs((prev) => ({
      ...prev,
      [examType]: config,
    }));
    saveCloudExamConfig(examType, config);
    saveSupabaseExamConfig(config);
    showSuccessToast(`Pengaturan Kartu & Panitia ${examType} berhasil disimpan.`);
  }, []);

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
        classes,
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
