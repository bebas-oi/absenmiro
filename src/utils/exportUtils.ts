import * as XLSX from 'xlsx';
import { AttendanceRecord, SchoolSettings, Student } from '../types';
import { buildOfficialKopHtml, printHtmlDocument } from './printUtils';

export function exportAttendanceToExcel(
  records: AttendanceRecord[],
  title: string,
  settings: SchoolSettings,
  students: Student[],
  filterInfo: {
    period: string;
    classFilter: string;
    startDate?: string;
    endDate?: string;
    studentName?: string;
  }
) {
  // 1. Prepare data rows
  const dataRows = records.map((rec, index) => ({
    No: index + 1,
    Tanggal: rec.date,
    NIS: rec.nis,
    'Nama Siswa': rec.studentName,
    Kelas: rec.className,
    'Jam Masuk': rec.timeIn || '-',
    'Jam Pulang': rec.timeOut || '-',
    Status: rec.status,
    Metode: rec.method,
    Keterangan: rec.notes || '-',
  }));

  // 2. Summary stats calculation
  const totalHadir = records.filter((r) => r.status === 'HADIR').length;
  const totalTerlambat = records.filter((r) => r.status === 'TERLAMBAT').length;
  const totalIzin = records.filter((r) => r.status === 'IZIN').length;
  const totalSakit = records.filter((r) => r.status === 'SAKIT').length;
  const totalAlpa = records.filter((r) => r.status === 'ALPA').length;

  const headerRows = [
    ['LEMBAGA PENDIDIKAN MA’ARIF NU'],
    ['“MI ISLAMIYAH ROWOSARI”'],
    ['BADAN HUKUM PERKUMPULAN NAHDLATUL ULAMA'],
    ['SK MENKUMHAM NO. AHU-119.AH.01.08 TAHUN 2013'],
    ['Status : Terakreditasi B, NSM : 111233250075, NPSN : 60713227'],
    ['e-mail : miirowosari@yahoo.co.id / miirowosari@gmail.com'],
    ['Alamat : Jl. Masjid Adiloko, No.03, Rt.04/Rw.04, Rowosari, Limpung, Batang'],
    [],
    [`LAPORAN REKAPITULASI PRESENSI SISWA (${title.toUpperCase()})`],
    [`Periode: ${filterInfo.period.toUpperCase()}` + (filterInfo.startDate ? ` (${filterInfo.startDate} s/d ${filterInfo.endDate})` : '')],
    [`Filter Kelas: ${filterInfo.classFilter}` + (filterInfo.studentName ? ` | Siswa: ${filterInfo.studentName}` : '')],
    [],
    ['RINGKASAN KEHADIRAN:'],
    [`Hadir (Tepat Waktu): ${totalHadir}`, `Terlambat: ${totalTerlambat}`, `Izin: ${totalIzin}`, `Sakit: ${totalSakit}`, `Alpa: ${totalAlpa}`],
    [`Total Catatan: ${records.length}`],
    [],
  ];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(headerRows);
  XLSX.utils.sheet_add_json(ws, dataRows, { origin: 'A17' });

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 14 }, // Tanggal
    { wch: 14 }, // NIS
    { wch: 32 }, // Nama Siswa
    { wch: 12 }, // Kelas
    { wch: 12 }, // Jam Masuk
    { wch: 12 }, // Jam Pulang
    { wch: 14 }, // Status
    { wch: 10 }, // Metode
    { wch: 35 }, // Keterangan
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Presensi Siswa');

  // File name
  const cleanDate = new Date().toISOString().slice(0, 10);
  const fileName = `Laporan_Absensi_MI_Islamiyah_Rowosari_${filterInfo.period}_${cleanDate}.xlsx`;
  
  XLSX.writeFile(wb, fileName);
}

export function printFormalReport(
  records: AttendanceRecord[],
  title: string,
  settings: SchoolSettings,
  filterInfo: {
    period: string;
    classFilter: string;
    startDate?: string;
    endDate?: string;
    studentName?: string;
    nis?: string;
  }
) {
  const totalHadir = records.filter((r) => r.status === 'HADIR').length;
  const totalTerlambat = records.filter((r) => r.status === 'TERLAMBAT').length;
  const totalIzin = records.filter((r) => r.status === 'IZIN').length;
  const totalSakit = records.filter((r) => r.status === 'SAKIT').length;
  const totalAlpa = records.filter((r) => r.status === 'ALPA').length;
  const totalAbsen = records.length;
  const persenKehadiran = totalAbsen > 0 ? (((totalHadir + totalTerlambat) / totalAbsen) * 100).toFixed(1) : '0';

  const tableRows = records
    .map(
      (r, idx) => `
      <tr style="border-bottom: 1px solid #cbd5e1; font-size: 11px;">
        <td style="text-align: center; padding: 6px 4px;">${idx + 1}</td>
        <td style="padding: 6px 6px; text-align: center;">${r.date}</td>
        <td style="padding: 6px 6px; font-family: monospace; text-align: center;">${r.nis}</td>
        <td style="padding: 6px 6px; font-weight: 600;">${r.studentName}</td>
        <td style="padding: 6px 6px; text-align: center;">${r.className}</td>
        <td style="padding: 6px 6px; text-align: center; font-family: monospace;">${r.timeIn || '-'}</td>
        <td style="padding: 6px 6px; text-align: center; font-family: monospace;">${r.timeOut || '-'}</td>
        <td style="padding: 6px 6px; text-align: center; font-weight: 700; color: ${
          r.status === 'HADIR' ? '#047857' : r.status === 'TERLAMBAT' ? '#b45309' : r.status === 'IZIN' ? '#1d4ed8' : r.status === 'SAKIT' ? '#7e22ce' : '#b91c1c'
        };">
          ${r.status}
        </td>
        <td style="padding: 6px 6px; text-align: center;">${r.method}</td>
        <td style="padding: 6px 6px; font-size: 10px; color: #475569;">${r.notes || '-'}</td>
      </tr>
    `
    )
    .join('');

  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <base href="${origin}/" />
      <meta charset="UTF-8">
      <title>Laporan Presensi Siswa - MI Islamiyah Rowosari</title>
      <style>
        *, *::before, *::after {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          margin: 20px;
          color: #0f172a;
          background: #fff;
        }
        .kop-header {
          position: relative;
          width: 100%;
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding-bottom: 6px;
        }
        .logo-box {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 74px;
          height: 74px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-box img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .kop-rule {
          border-top: 3px solid #000000;
          border-bottom: 1px solid #000000;
          height: 5px;
          margin: 4px 0 16px 0;
        }
        .header-text {
          width: 100%;
          text-align: center;
          padding: 0 82px;
          font-family: 'Century Gothic', 'Trebuchet MS', Arial, Helvetica, sans-serif;
          line-height: 1.24;
          color: #000000;
        }
        .kop-line-1 {
          font-size: 13.5px;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .kop-line-2 {
          font-size: 19px;
          font-weight: 800;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          margin: 1px 0;
        }
        .kop-line-3 {
          font-size: 13.5px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .kop-line-4 {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          margin-top: 1px;
        }
        .kop-line-5 {
          font-size: 10.5px;
          font-weight: 700;
          margin-top: 1px;
        }
        .kop-line-6 {
          font-size: 10.5px;
          font-weight: 700;
          color: #2563eb;
          margin-top: 1px;
        }
        .kop-line-6 a {
          color: #2563eb;
          text-decoration: underline;
        }
        .kop-line-7 {
          font-size: 10.5px;
          font-weight: 700;
          font-style: italic;
          margin-top: 1px;
        }
        .title-section {
          text-align: center;
          margin: 14px 0 16px 0;
        }
        .title-section h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
          text-decoration: underline;
        }
        .meta-info {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin-bottom: 10px;
          font-weight: 500;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;
          margin-bottom: 14px;
          background: #f1f5f9;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
        }
        .stat-item {
          text-align: center;
          font-size: 10px;
        }
        .stat-item strong {
          display: block;
          font-size: 13px;
          font-weight: 800;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        th {
          background-color: #047857;
          color: white;
          font-size: 11px;
          padding: 7px 4px;
          border: 1px solid #047857;
          text-align: center;
        }
        td {
          border: 1px solid #cbd5e1;
        }
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 30px;
          padding: 0 40px;
          font-size: 12px;
          page-break-inside: avoid;
        }
        .sign-box {
          text-align: center;
          width: 220px;
        }
        .sign-space {
          height: 65px;
        }
        @media print {
          body { margin: 10mm; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      ${buildOfficialKopHtml(origin)}

      <div class="title-section">
        <h3>LAPORAN REKAPITULASI PRESENSI SISWA</h3>
        <p style="font-size: 11px; margin: 3px 0 0 0; color: #475569;">
          Periode: <strong>${filterInfo.period.toUpperCase()}</strong> ${
            filterInfo.startDate ? `(${filterInfo.startDate} s/d ${filterInfo.endDate})` : ''
          } | Kelas: <strong>${filterInfo.classFilter}</strong> ${
            filterInfo.studentName ? `| Siswa: <strong>${filterInfo.studentName} (${filterInfo.nis || ''})</strong>` : ''
          }
        </p>
      </div>

      <div class="stats-grid">
        <div class="stat-item">Hadir Tepat: <strong style="color: #047857;">${totalHadir}</strong></div>
        <div class="stat-item">Terlambat: <strong style="color: #b45309;">${totalTerlambat}</strong></div>
        <div class="stat-item">Izin: <strong style="color: #1d4ed8;">${totalIzin}</strong></div>
        <div class="stat-item">Sakit: <strong style="color: #7e22ce;">${totalSakit}</strong></div>
        <div class="stat-item">Alpa: <strong style="color: #b91c1c;">${totalAlpa}</strong></div>
        <div class="stat-item">Tingkat Kehadiran: <strong style="color: #0f172a;">${persenKehadiran}%</strong></div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 25px;">No</th>
            <th style="width: 75px;">Tanggal</th>
            <th style="width: 70px;">NIS</th>
            <th>Nama Siswa</th>
            <th style="width: 60px;">Kelas</th>
            <th style="width: 65px;">Masuk</th>
            <th style="width: 65px;">Pulang</th>
            <th style="width: 80px;">Status</th>
            <th style="width: 55px;">Metode</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || '<tr><td colspan="10" style="text-align: center; padding: 16px; color: #64748b;">Tidak ada data presensi pada periode ini.</td></tr>'}
        </tbody>
      </table>

      <div class="signatures">
        <div class="sign-box">
          <p style="margin: 0;">Mengetahui,</p>
          <p style="margin: 2px 0 0 0; font-weight: 600;">Kepala Madrasah</p>
          <div class="sign-space"></div>
          <p style="font-weight: 800; text-decoration: underline; margin: 0;">${settings.headmaster}</p>
          <p style="margin: 2px 0 0 0; font-size: 10px; color: #475569;">NIP. ${settings.headmasterNip}</p>
        </div>

        <div class="sign-box">
          <p style="margin: 0;">Rowosari, ${todayFormatted}</p>
          <p style="margin: 2px 0 0 0; font-weight: 600;">Petugas Operator Presensi</p>
          <div class="sign-space"></div>
          <p style="font-weight: 800; text-decoration: underline; margin: 0;">Staff Tata Usaha</p>
          <p style="margin: 2px 0 0 0; font-size: 10px; color: #475569;">MI Islamiyah Rowosari</p>
        </div>
      </div>
    </body>
    </html>
  `;

  printHtmlDocument(htmlContent);
}
