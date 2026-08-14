import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  AttendanceRecord,
  ClassRoom,
  SchoolSettings,
  Student,
  Teacher,
} from '../types';
import { UserAccount } from '../data/initialData';

// SQL Schema for Supabase (conveniently accessible in app)
export const SUPABASE_SQL_SCHEMA = `-- ============================================================
-- SQL SCHEMA UNTUK SISTEM PRESENSI SISWA MI (SUPABASE)
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Tabel Pengaturan Madrasah (Settings)
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'general',
  school_name TEXT NOT NULL,
  sub_title TEXT,
  address TEXT,
  logo_url TEXT,
  headmaster_name TEXT,
  headmaster_nip TEXT,
  time_in_start TEXT,
  time_in_late TEXT,
  time_in_end TEXT,
  time_out_standard TEXT,
  time_out_friday TEXT,
  auto_mode BOOLEAN DEFAULT TRUE,
  sound_enabled BOOLEAN DEFAULT TRUE,
  kiosk_cooldown_seconds INT DEFAULT 5,
  kiosk_manual_pin TEXT DEFAULT '123456',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Kelas / Rombel (Classes)
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level INT,
  room TEXT,
  academic_year TEXT,
  homeroom_teacher TEXT,
  total_students INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Guru & Wali Kelas (Teachers)
CREATE TABLE IF NOT EXISTS public.teachers (
  id TEXT PRIMARY KEY,
  nip TEXT,
  name TEXT NOT NULL,
  assigned_class TEXT,
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'AKTIF',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Akun Pengguna (Users / RBAC)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  assigned_class TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'AKTIF',
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Siswa & UID RFID (Students)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  nis TEXT UNIQUE NOT NULL,
  nisn TEXT,
  name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  rfid_uid TEXT UNIQUE NOT NULL,
  gender TEXT,
  parent_phone TEXT,
  parent_name TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'AKTIF',
  created_at TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD')
);

-- 6. Tabel Riwayat Presensi Masuk & Pulang (Attendance)
CREATE TABLE IF NOT EXISTS public.attendance (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
  nis TEXT NOT NULL,
  student_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  date TEXT NOT NULL,
  time_in TEXT,
  time_out TEXT,
  type TEXT,
  status TEXT NOT NULL,
  method TEXT DEFAULT 'RFID',
  notes TEXT,
  timestamp BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security (RLS) or add public read/write policy for Kiosk & App
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all public access to settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access to classes" ON public.classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access to teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access to students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access to attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);

-- Aktifkan Supabase Realtime agar scanner di gerbang & dashboard langsung sinkron
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.settings, 
    public.classes, 
    public.teachers, 
    public.users, 
    public.students, 
    public.attendance;
COMMIT;
`;

// Helper converters for snake_case (Postgres) <-> camelCase (TypeScript)
function mapSettingsToDb(s: SchoolSettings) {
  return {
    id: 'general',
    school_name: s.schoolName,
    sub_title: s.subTitle,
    nsm: s.nsm,
    npsn: s.npsn,
    address: s.address,
    village: s.village,
    district: s.district,
    regency: s.regency,
    headmaster: s.headmaster,
    headmaster_nip: s.headmasterNip,
    time_in_start: s.timeInStart,
    time_in_standard: s.timeInStandard,
    time_in_late: s.timeInLate,
    time_out_standard: s.timeOutStandard,
    time_out_friday: s.timeOutFriday,
    active_academic_year: s.activeAcademicYear,
    active_semester: s.activeSemester,
    auto_mode: s.autoMode,
    sound_enabled: s.soundEnabled,
    kiosk_cooldown_seconds: s.kioskCooldownSeconds,
    kiosk_manual_pin: s.kioskManualPin,
    updated_at: new Date().toISOString(),
  };
}

function mapDbToSettings(d: any): SchoolSettings {
  return {
    schoolName: d.school_name || 'MI Ma\'arif Rowosari',
    subTitle: d.sub_title || 'Sistem Presensi Kartu RFID Terpadu',
    nsm: d.nsm || '111233240015',
    npsn: d.npsn || '60711928',
    address: d.address || 'Jl. Raya Rowosari No. 12',
    village: d.village || 'Rowosari',
    district: d.district || 'Rowosari',
    regency: d.regency || 'Kendal',
    headmaster: d.headmaster || 'H. Ahmad Muzakki, M.Pd.I',
    headmasterNip: d.headmaster_nip || '19780512 200501 1 003',
    timeInStart: d.time_in_start || '06:30',
    timeInStandard: d.time_in_standard || '07:00',
    timeInLate: d.time_in_late || '07:15',
    timeOutStandard: d.time_out_standard || '13:30',
    timeOutFriday: d.time_out_friday || '11:00',
    activeAcademicYear: d.active_academic_year || '2025/2026',
    activeSemester: d.active_semester || 'Genap',
    autoMode: d.auto_mode ?? true,
    soundEnabled: d.sound_enabled ?? true,
    kioskCooldownSeconds: d.kiosk_cooldown_seconds ?? 5,
    kioskManualPin: d.kiosk_manual_pin || '123456',
  };
}

function mapClassToDb(c: ClassRoom) {
  return {
    id: c.id,
    name: c.name,
    grade: c.grade,
    academic_year: c.academicYear,
    homeroom_teacher_id: c.homeroomTeacherId,
  };
}

function mapDbToClass(d: any): ClassRoom {
  return {
    id: d.id,
    name: d.name,
    grade: d.grade || 1,
    academicYear: d.academic_year || '2025/2026',
    homeroomTeacherId: d.homeroom_teacher_id || '',
  };
}

function mapTeacherToDb(t: Teacher) {
  return {
    id: t.id,
    nip: t.nip,
    name: t.name,
    assigned_class: t.assignedClass,
    phone: t.phone,
    email: t.email,
    photo_url: t.photoUrl,
    gender: t.gender,
  };
}

function mapDbToTeacher(d: any): Teacher {
  return {
    id: d.id,
    nip: d.nip,
    name: d.name,
    assignedClass: d.assigned_class,
    phone: d.phone,
    email: d.email,
    photoUrl: d.photo_url,
    gender: d.gender || 'L',
  };
}

function mapUserToDb(u: UserAccount) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    assigned_class: u.assignedClass || '',
    email: u.email || '',
    phone: u.phone || '',
    status: u.status,
    password: u.password,
  };
}

function mapDbToUser(d: any): UserAccount {
  return {
    id: d.id,
    username: d.username,
    name: d.name,
    role: d.role,
    assignedClass: d.assigned_class,
    email: d.email,
    phone: d.phone,
    status: d.status,
    password: d.password,
  };
}

function mapStudentToDb(s: Student) {
  return {
    id: s.id,
    nis: s.nis,
    nisn: s.nisn || '',
    name: s.name,
    class_name: s.className,
    rfid_uid: s.rfidUid,
    gender: s.gender,
    parent_phone: s.parentPhone || '',
    parent_name: s.parentName || '',
    photo_url: s.photoUrl || '',
    status: s.status,
    created_at: s.createdAt,
  };
}

function mapDbToStudent(d: any): Student {
  return {
    id: d.id,
    nis: d.nis,
    nisn: d.nisn,
    name: d.name,
    className: d.class_name,
    rfidUid: d.rfid_uid,
    gender: d.gender,
    parentPhone: d.parent_phone,
    parentName: d.parent_name,
    photoUrl: d.photo_url,
    status: d.status,
    createdAt: d.created_at,
  };
}

function mapAttendanceToDb(a: AttendanceRecord) {
  return {
    id: a.id,
    student_id: a.studentId,
    nis: a.nis,
    student_name: a.studentName,
    class_name: a.className,
    date: a.date,
    time_in: a.timeIn || null,
    time_out: a.timeOut || null,
    type: a.type || null,
    status: a.status,
    method: a.method || 'RFID',
    notes: a.notes || null,
    timestamp: a.timestamp,
  };
}

function mapDbToAttendance(d: any): AttendanceRecord {
  return {
    id: d.id,
    studentId: d.student_id,
    nis: d.nis,
    studentName: d.student_name,
    className: d.class_name,
    date: d.date,
    timeIn: d.time_in,
    timeOut: d.time_out,
    type: d.type,
    status: d.status,
    method: d.method,
    notes: d.notes,
    timestamp: Number(d.timestamp) || Date.now(),
  };
}

// ==========================================
// SETTINGS
// ==========================================
export async function fetchSupabaseSettings(): Promise<SchoolSettings | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;

  try {
    const { data, error } = await sb.from('settings').select('*').eq('id', 'general').single();
    if (error || !data) return null;
    return mapDbToSettings(data);
  } catch (err) {
    console.warn('[Supabase] Settings fetch warning:', err);
    return null;
  }
}

export async function saveSupabaseSettings(settings: SchoolSettings): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('settings').upsert(mapSettingsToDb(settings));
    return !error;
  } catch (err) {
    console.error('[Supabase] Save settings error:', err);
    return false;
  }
}

// ==========================================
// CLASSES
// ==========================================
export async function fetchSupabaseClasses(): Promise<ClassRoom[] | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;

  try {
    const { data, error } = await sb.from('classes').select('*').order('name', { ascending: true });
    if (error || !data) return null;
    return data.map(mapDbToClass);
  } catch (err) {
    console.warn('[Supabase] Fetch classes warning:', err);
    return null;
  }
}

export async function saveSupabaseClass(cls: ClassRoom): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('classes').upsert(mapClassToDb(cls));
    return !error;
  } catch (err) {
    console.error('[Supabase] Save class error:', err);
    return false;
  }
}

export async function deleteSupabaseClass(id: string): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('classes').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('[Supabase] Delete class error:', err);
    return false;
  }
}

// ==========================================
// TEACHERS
// ==========================================
export async function fetchSupabaseTeachers(): Promise<Teacher[] | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;

  try {
    const { data, error } = await sb.from('teachers').select('*').order('name', { ascending: true });
    if (error || !data) return null;
    return data.map(mapDbToTeacher);
  } catch (err) {
    console.warn('[Supabase] Fetch teachers warning:', err);
    return null;
  }
}

export async function saveSupabaseTeacher(teacher: Teacher): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('teachers').upsert(mapTeacherToDb(teacher));
    return !error;
  } catch (err) {
    console.error('[Supabase] Save teacher error:', err);
    return false;
  }
}

export async function deleteSupabaseTeacher(id: string): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('teachers').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('[Supabase] Delete teacher error:', err);
    return false;
  }
}

// ==========================================
// USERS (RBAC)
// ==========================================
export async function fetchSupabaseUsers(): Promise<UserAccount[] | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;

  try {
    const { data, error } = await sb.from('users').select('*').order('name', { ascending: true });
    if (error || !data) return null;
    return data.map(mapDbToUser);
  } catch (err) {
    console.warn('[Supabase] Fetch users warning:', err);
    return null;
  }
}

export async function saveSupabaseUser(user: UserAccount): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('users').upsert(mapUserToDb(user));
    return !error;
  } catch (err) {
    console.error('[Supabase] Save user error:', err);
    return false;
  }
}

export async function deleteSupabaseUser(id: string): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('users').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('[Supabase] Delete user error:', err);
    return false;
  }
}

// ==========================================
// STUDENTS
// ==========================================
export async function fetchSupabaseStudents(): Promise<Student[] | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;

  try {
    const { data, error } = await sb.from('students').select('*').order('name', { ascending: true });
    if (error || !data) return null;
    return data.map(mapDbToStudent);
  } catch (err) {
    console.warn('[Supabase] Fetch students warning:', err);
    return null;
  }
}

export async function saveSupabaseStudent(student: Student): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('students').upsert(mapStudentToDb(student));
    return !error;
  } catch (err) {
    console.error('[Supabase] Save student error:', err);
    return false;
  }
}

export async function batchSaveSupabaseStudents(students: Student[]): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('students').upsert(students.map(mapStudentToDb));
    return !error;
  } catch (err) {
    console.error('[Supabase] Batch save students error:', err);
    return false;
  }
}

export async function deleteSupabaseStudent(id: string): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('students').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('[Supabase] Delete student error:', err);
    return false;
  }
}

// ==========================================
// ATTENDANCE
// ==========================================
export async function fetchSupabaseAttendance(): Promise<AttendanceRecord[] | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;

  try {
    const { data, error } = await sb.from('attendance').select('*').order('timestamp', { ascending: false }).limit(1000);
    if (error || !data) return null;
    return data.map(mapDbToAttendance);
  } catch (err) {
    console.warn('[Supabase] Fetch attendance warning:', err);
    return null;
  }
}

export async function saveSupabaseAttendance(record: AttendanceRecord): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('attendance').upsert(mapAttendanceToDb(record));
    return !error;
  } catch (err) {
    console.error('[Supabase] Save attendance error:', err);
    return false;
  }
}

export async function deleteSupabaseAttendance(id: string): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('attendance').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('[Supabase] Delete attendance error:', err);
    return false;
  }
}

// ==========================================
// REAL-TIME SUBSCRIPTION
// ==========================================
export function subscribeSupabaseChanges(callbacks: {
  onSettingsChange?: (settings: SchoolSettings) => void;
  onStudentChange?: () => void;
  onAttendanceChange?: () => void;
  onClassChange?: () => void;
  onTeacherChange?: () => void;
  onUserChange?: () => void;
}): () => void {
  const sb = getSupabaseClient();
  if (!sb) return () => {};

  try {
    const channel = sb
      .channel('mi_presensi_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        () => callbacks.onAttendanceChange?.()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        () => callbacks.onStudentChange?.()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        (payload) => {
          if (payload.new) {
            callbacks.onSettingsChange?.(mapDbToSettings(payload.new));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classes' },
        () => callbacks.onClassChange?.()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teachers' },
        () => callbacks.onTeacherChange?.()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => callbacks.onUserChange?.()
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[Supabase] Realtime subscribe error:', err);
    return () => {};
  }
}

// ==========================================
// SEED INITIAL SUPABASE DATA
// ==========================================
export async function seedInitialSupabaseData(data: {
  settings: SchoolSettings;
  classes: ClassRoom[];
  teachers: Teacher[];
  users: UserAccount[];
  students: Student[];
  attendance: AttendanceRecord[];
}): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    // Check if students table is empty
    const { count, error } = await sb.from('students').select('*', { count: 'exact', head: true });
    if (error || (count !== null && count > 0)) {
      return false; // Already has data or table not created yet
    }

    console.log('[Supabase] Seeding initial data to Supabase PostgreSQL...');

    await sb.from('settings').upsert(mapSettingsToDb(data.settings));
    await sb.from('classes').upsert(data.classes.map(mapClassToDb));
    await sb.from('teachers').upsert(data.teachers.map(mapTeacherToDb));
    await sb.from('users').upsert(data.users.map(mapUserToDb));
    await sb.from('students').upsert(data.students.map(mapStudentToDb));
    await sb.from('attendance').upsert(data.attendance.map(mapAttendanceToDb));

    console.log('[Supabase] Initial data seeding complete.');
    return true;
  } catch (err) {
    console.warn('[Supabase] Seeding note:', err);
    return false;
  }
}
