import * as XLSX from 'xlsx';
import { AttendanceRecord, SchoolSettings, Student } from '../types';

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
    [settings.subTitle],
    [settings.schoolName],
    [`LAPORAN REKAPITULASI PRESENSI SISWA (${title.toUpperCase()})`],
    [`NSM: ${settings.nsm} | NPSN: ${settings.npsn}`],
    [`Alamat: ${settings.address}`],
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
  XLSX.utils.sheet_add_json(ws, dataRows, { origin: 'A13' });

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
  const fileName = `Laporan_Absensi_MI_Rowosari_${filterInfo.period}_${cleanDate}.xlsx`;
  
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

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Harap izinkan popup browser untuk mencetak laporan.');
    return;
  }

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

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Laporan Presensi Siswa - ${settings.schoolName}</title>
      <style>
        body {
          font-family: Arial, Helvetica, sans-serif;
          margin: 20px;
          color: #0f172a;
          background: #fff;
        }
        .kop-header {
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 3px double #000;
          padding-bottom: 12px;
          margin-bottom: 16px;
          position: relative;
        }
        .logo-box {
          position: absolute;
          left: 10px;
          top: 5px;
          width: 70px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .header-text {
          text-align: center;
          line-height: 1.3;
        }
        .header-text h4 {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .header-text h2 {
          margin: 3px 0;
          font-size: 18px;
          font-weight: 800;
          color: #065f46;
        }
        .header-text p {
          margin: 2px 0;
          font-size: 11px;
          color: #334155;
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
      <div class="kop-header">
        <div class="logo-box">
          <svg viewBox="0 0 100 100" width="65" height="65" fill="#047857">
            <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" stroke="#047857" stroke-width="4" fill="#ecfdf5"/>
            <path d="M50,20 L75,35 L75,65 L50,80 L25,65 L25,35 Z" fill="#047857"/>
            <text x="50" y="55" font-size="16" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">MI</text>
          </svg>
        </div>
        <div class="header-text">
          <h4>${settings.subTitle}</h4>
          <h2>${settings.schoolName}</h2>
          <p>NSM: ${settings.nsm} | NPSN: ${settings.npsn} | Status: Terakreditasi A</p>
          <p>${settings.address}</p>
        </div>
      </div>

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
          <p style="margin: 0;">Kendal, ${todayFormatted}</p>
          <p style="margin: 2px 0 0 0; font-weight: 600;">Petugas Operator Presensi</p>
          <div class="sign-space"></div>
          <p style="font-weight: 800; text-decoration: underline; margin: 0;">Staff Tata Usaha</p>
          <p style="margin: 2px 0 0 0; font-size: 10px; color: #475569;">MI Rowosari Kendal</p>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 400);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
