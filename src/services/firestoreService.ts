import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  AttendanceRecord,
  ClassRoom,
  SchoolSettings,
  Student,
  Teacher,
} from '../types';
import { UserAccount } from '../data/initialData';

// Collection references
const SETTINGS_COLLECTION = 'settings';
const CLASSES_COLLECTION = 'classes';
const TEACHERS_COLLECTION = 'teachers';
const USERS_COLLECTION = 'users';
const STUDENTS_COLLECTION = 'students';
const ATTENDANCE_COLLECTION = 'attendance';

// ==========================================
// SETTINGS
// ==========================================
export async function fetchCloudSettings(): Promise<SchoolSettings | null> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'general');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SchoolSettings;
    }
    return null;
  } catch (err) {
    console.warn('[Firestore] Failed to fetch settings:', err);
    return null;
  }
}

export async function saveCloudSettings(settings: SchoolSettings): Promise<void> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'general');
    await setDoc(docRef, settings, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving settings:', err);
  }
}

// ==========================================
// CLASSES
// ==========================================
export function subscribeCloudClasses(
  callback: (classes: ClassRoom[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, CLASSES_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: ClassRoom[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<ClassRoom, 'id'>) });
      });
      callback(items);
    },
    (err) => {
      console.warn('[Firestore] Classes subscription error:', err);
      onError?.(err);
    }
  );
}

export async function saveCloudClass(cls: ClassRoom): Promise<void> {
  try {
    const docRef = doc(db, CLASSES_COLLECTION, cls.id);
    await setDoc(docRef, cls, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving class:', err);
  }
}

export async function deleteCloudClass(id: string): Promise<void> {
  try {
    const docRef = doc(db, CLASSES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('[Firestore] Error deleting class:', err);
  }
}

// ==========================================
// TEACHERS
// ==========================================
export function subscribeCloudTeachers(
  callback: (teachers: Teacher[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, TEACHERS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Teacher[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<Teacher, 'id'>) });
      });
      callback(items);
    },
    (err) => {
      console.warn('[Firestore] Teachers subscription error:', err);
      onError?.(err);
    }
  );
}

export async function saveCloudTeacher(teacher: Teacher): Promise<void> {
  try {
    const docRef = doc(db, TEACHERS_COLLECTION, teacher.id);
    await setDoc(docRef, teacher, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving teacher:', err);
  }
}

export async function deleteCloudTeacher(id: string): Promise<void> {
  try {
    const docRef = doc(db, TEACHERS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('[Firestore] Error deleting teacher:', err);
  }
}

// ==========================================
// USERS (RBAC)
// ==========================================
export function subscribeCloudUsers(
  callback: (users: UserAccount[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, USERS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: UserAccount[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<UserAccount, 'id'>) });
      });
      callback(items);
    },
    (err) => {
      console.warn('[Firestore] Users subscription error:', err);
      onError?.(err);
    }
  );
}

export async function saveCloudUser(user: UserAccount): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, user.id);
    await setDoc(docRef, user, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving user:', err);
  }
}

export async function deleteCloudUser(id: string): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('[Firestore] Error deleting user:', err);
  }
}

// ==========================================
// STUDENTS
// ==========================================
export function subscribeCloudStudents(
  callback: (students: Student[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, STUDENTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Student[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<Student, 'id'>) });
      });
      callback(items);
    },
    (err) => {
      console.warn('[Firestore] Students subscription error:', err);
      onError?.(err);
    }
  );
}

export async function saveCloudStudent(student: Student): Promise<void> {
  try {
    const docRef = doc(db, STUDENTS_COLLECTION, student.id);
    await setDoc(docRef, student, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving student:', err);
  }
}

export async function batchSaveCloudStudents(students: Student[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    students.forEach((student) => {
      const docRef = doc(db, STUDENTS_COLLECTION, student.id);
      batch.set(docRef, student, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('[Firestore] Error batch saving students:', err);
  }
}

export async function deleteCloudStudent(id: string): Promise<void> {
  try {
    const docRef = doc(db, STUDENTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('[Firestore] Error deleting student:', err);
  }
}

// ==========================================
// ATTENDANCE
// ==========================================
export function subscribeCloudAttendance(
  callback: (records: AttendanceRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, ATTENDANCE_COLLECTION), orderBy('timestamp', 'desc'), limit(500));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: AttendanceRecord[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<AttendanceRecord, 'id'>) });
      });
      callback(items);
    },
    (err) => {
      console.warn('[Firestore] Attendance subscription error:', err);
      onError?.(err);
    }
  );
}

export async function saveCloudAttendance(record: AttendanceRecord): Promise<void> {
  try {
    const docRef = doc(db, ATTENDANCE_COLLECTION, record.id);
    await setDoc(docRef, record, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving attendance record:', err);
  }
}

export async function deleteCloudAttendance(id: string): Promise<void> {
  try {
    const docRef = doc(db, ATTENDANCE_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('[Firestore] Error deleting attendance record:', err);
  }
}

// ==========================================
// SEED & INITIAL SYNC
// ==========================================
export async function seedInitialFirestoreData(data: {
  settings: SchoolSettings;
  classes: ClassRoom[];
  teachers: Teacher[];
  users: UserAccount[];
  students: Student[];
  attendance: AttendanceRecord[];
}): Promise<boolean> {
  try {
    // Check if students collection is empty
    const studentsSnap = await getDocs(query(collection(db, STUDENTS_COLLECTION), limit(1)));
    if (!studentsSnap.empty) {
      // Data already seeded
      return false;
    }

    console.log('[Firestore] Seeding initial data to Cloud Firestore...');

    // 1. Settings
    await setDoc(doc(db, SETTINGS_COLLECTION, 'general'), data.settings);

    // 2. Classes
    const classBatch = writeBatch(db);
    data.classes.forEach((cls) => {
      classBatch.set(doc(db, CLASSES_COLLECTION, cls.id), cls);
    });
    await classBatch.commit();

    // 3. Teachers
    const teacherBatch = writeBatch(db);
    data.teachers.forEach((t) => {
      teacherBatch.set(doc(db, TEACHERS_COLLECTION, t.id), t);
    });
    await teacherBatch.commit();

    // 4. Users
    const userBatch = writeBatch(db);
    data.users.forEach((u) => {
      userBatch.set(doc(db, USERS_COLLECTION, u.id), u);
    });
    await userBatch.commit();

    // 5. Students
    const studentBatch = writeBatch(db);
    data.students.forEach((s) => {
      studentBatch.set(doc(db, STUDENTS_COLLECTION, s.id), s);
    });
    await studentBatch.commit();

    // 6. Attendance
    const attBatch = writeBatch(db);
    data.attendance.forEach((a) => {
      attBatch.set(doc(db, ATTENDANCE_COLLECTION, a.id), a);
    });
    await attBatch.commit();

    console.log('[Firestore] Initial seeding completed successfully.');
    return true;
  } catch (err) {
    console.error('[Firestore] Error seeding initial data:', err);
    return false;
  }
}
