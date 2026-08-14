# Sistem Presensi Siswa RFID - MI Rowosari

Aplikasi Sistem Presensi dan Manajemen Kehadiran Siswa Madrasah Ibtidaiyah berbasis Scanner Kartu RFID, Absensi Manual Terproteksi PIN, Real-Time Cloud Firestore Sync, Rekap Laporan Bulanan/Harian, Cetak Kartu Pelajar RFID, dan Manajemen Pengguna (RBAC Admin & Wali Kelas).

---

## 📄 Kode HTML Entry Point (`index.html`)

Berikut adalah struktur kode HTML utama (`index.html`) yang digunakan sebagai kerangka dasar aplikasi:

```html
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sistem Absensi RFID - MI Rowosari</title>
    <meta 
      name="description" 
      content="Aplikasi Presensi Siswa MI Rowosari berbasis Scanner Kartu RFID, Absen Manual, dan Laporan Kehadiran." 
    />
    
    <!-- Google Web Fonts (Plus Jakarta Sans & JetBrains Mono) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link 
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700;800&display=swap" 
      rel="stylesheet"
    >
  </head>
  <body class="bg-slate-100 text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] antialiased selection:bg-emerald-600 selection:text-white">
    <!-- Root Container React -->
    <div id="root"></div>
    
    <!-- React Entry Script -->
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## 🌟 Fitur Utama Aplikasi

1. **Mode Scanner Kiosk RFID**:
   - Pemindaian instan UID kartu RFID tanpa perlu klik tombol / input manual (USB RFID Reader Keyboard Wedge).
   - Audio chime sambutan otomatis (Tepat Waktu, Terlambat, Pulang).
   - Layar fullscreen untuk display gerbang madrasah.

2. **Absensi Manual dengan Proteksi PIN**:
   - Form pencatatan absensi manual siswa (Izin, Sakit, Alpa, Hadir) jika kartu tertinggal atau rusak.
   - Dilindungi modal verifikasi PIN petugas (`123456`) dan keypad virtual layar sentuh (*touchscreen friendly*).

3. **Sinkronisasi Database Cloud (Firebase Firestore)**:
   - Penyimpanan data master siswa, rombel, guru, riwayat presensi, dan pengaturan jam secara persisten di Google Cloud Firestore.
   - Sinkronisasi real-time multi-perangkat (Kiosk scanner di gerbang otomatis tersinkron dengan dashboard admin di ruang kantor).
   - Dukungan *offline caching* otomatis.

4. **Rekap & Laporan Kehadiran Lengkap**:
   - Filter berdasarkan Kelas, Rentang Tanggal, dan Status (Hadir, Terlambat, Izin, Sakit, Alpa).
   - Ekspor laporan ke format **Excel (.xlsx)** dan **PDF Siap Cetak**.
   - Notifikasi WhatsApp otomatis ke wali murid.

5. **Cetak Kartu Pelajar RFID**:
   - Generator kartu pelajar depan dan belakang dengan barcode / QR code UID RFID.
   - Layout standar ISO kartu ATM/ID card (85.6mm × 53.98mm).

6. **Role-Based Access Control (RBAC)**:
   - **Admin / Petugas**: Hak akses penuh ke seluruh menu, konfigurasi jam, manajemen user, dan data sekolah.
   - **Wali Kelas**: Akses khusus untuk melihat dan mengelola presensi siswa di kelas binaannya.

---

## 🛠️ Stack Teknologi

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Canvas-Confetti, xlsx, jspdf.
- **Backend / Database**: Supabase (PostgreSQL Real-Time) / Google Firebase Firestore.
- **Build Tool**: Vite.

---

## 🗄️ Panduan Integrasi Supabase

Aplikasi ini mendukung koneksi langsung ke **Supabase** untuk basis data PostgreSQL dengan replikasi *real-time*.

### 1. Buat Proyek di Supabase
1. Buka [https://supabase.com/dashboard](https://supabase.com/dashboard) dan buat proyek baru.
2. Buka menu **SQL Editor** pada sidebar kiri dashboard Supabase.
3. Jalankan skrip SQL skema tabel berikut:

```sql
-- 1. TABEL PENGATURAN (SETTINGS)
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY,
  school_name TEXT NOT NULL,
  school_address TEXT,
  academic_year TEXT,
  semester TEXT,
  check_in_start TEXT,
  check_in_end TEXT,
  late_threshold TEXT,
  check_out_start TEXT,
  sound_enabled BOOLEAN DEFAULT true,
  auto_wa_notification BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABEL KELAS (CLASSES)
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade INTEGER NOT NULL,
  teacher_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABEL GURU / WALI KELAS (TEACHERS)
CREATE TABLE IF NOT EXISTS public.teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nip TEXT,
  phone TEXT,
  email TEXT,
  assigned_class TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABEL PENGGUNA (USERS)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  assigned_class TEXT,
  password TEXT NOT NULL,
  status TEXT DEFAULT 'AKTIF',
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABEL SISWA (STUDENTS)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  rfid_uid TEXT UNIQUE NOT NULL,
  nis TEXT NOT NULL,
  nisn TEXT,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  class_name TEXT NOT NULL,
  parent_name TEXT,
  parent_phone TEXT,
  photo_url TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABEL PRESENSI / KEHADIRAN (ATTENDANCE)
CREATE TABLE IF NOT EXISTS public.attendance (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  nis TEXT NOT NULL,
  student_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  date TEXT NOT NULL,
  time_in TEXT,
  time_out TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  method TEXT NOT NULL,
  notes TEXT,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- AKTIFKAN ROW LEVEL SECURITY (RLS) & PUBLIC ACCESS UNTUK APPLET
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on classes" ON public.classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
```

### 2. Hubungkan ke Aplikasi
- Masuk ke aplikasi, klik menu **Pengaturan & Jam Presensi**.
- Pada kartu **Database Cloud**, masukkan:
  - **Supabase Project URL**: contoh `https://abcdefghijkl.supabase.co`
  - **Supabase Anon Key**: API Key public dari menu *Settings > API* di dashboard Supabase.
- Klik **Simpan & Hubungkan Supabase**. Data akan langsung tersinkron secara real-time!

---

---

## 🚀 Panduan Menjalankan Aplikasi

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Menjalankan Development Server
```bash
npm run dev
```
Aplikasi akan aktif di `http://localhost:3000`.

### 3. Build untuk Produksi
```bash
npm run build
```

---

## 🔑 Kredensial Default

- **Login Admin**: Username: `admin` | Password: `admin123`
- **Login Wali Kelas**: Username: `guru1a` s/d `guru6b` | Password: `123456`
- **PIN Absen Manual Kiosk**: `123456`
