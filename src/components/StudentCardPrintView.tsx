import React, { useState } from 'react';
import {
  CreditCard,
  Printer,
  Sparkles,
  Check,
  Building,
  Settings,
  Layers,
  Search,
  Eye,
  GraduationCap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CardPrintSettings, Student } from '../types';

export const StudentCardPrintView: React.FC = () => {
  const {
    students,
    classes,
    settings,
    currentUser,
    isGuru,
    accessibleStudents,
    accessibleClasses,
  } = useApp();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    accessibleStudents[0]?.id || ''
  );
  const [printMode, setPrintMode] = useState<'single' | 'class'>('single');
  const [selectedClassForBatch, setSelectedClassForBatch] = useState<string>(
    accessibleClasses[0]?.name || 'Kelas 1A'
  );

  const [cardConfig, setCardConfig] = useState<CardPrintSettings>({
    template: 'emerald',
    showBarcode: true,
    showQr: true,
    showChip: true,
    showStamp: true,
    showHeadmasterSign: true,
    cardSize: 'standard',
    validUntil: 'Selama Menjadi Siswa',
  });

  const selectedStudent =
    accessibleStudents.find((s) => s.id === selectedStudentId) || accessibleStudents[0];

  const getTemplateTheme = (template: CardPrintSettings['template']) => {
    switch (template) {
      case 'navy':
        return {
          bgHeader: 'from-blue-900 via-indigo-900 to-slate-900',
          accent: 'border-blue-500 text-blue-900',
          badge: 'bg-blue-600',
          gradient: 'from-blue-50 to-indigo-50/40',
        };
      case 'gold':
        return {
          bgHeader: 'from-amber-800 via-yellow-900 to-slate-900',
          accent: 'border-amber-500 text-amber-900',
          badge: 'bg-amber-600',
          gradient: 'from-amber-50 to-yellow-50/40',
        };
      case 'modern':
        return {
          bgHeader: 'from-slate-900 via-slate-800 to-zinc-900',
          accent: 'border-slate-800 text-slate-900',
          badge: 'bg-slate-800',
          gradient: 'from-slate-50 to-zinc-50/40',
        };
      case 'emerald':
      default:
        return {
          bgHeader: 'from-emerald-800 via-teal-800 to-emerald-950',
          accent: 'border-emerald-600 text-emerald-900',
          badge: 'bg-emerald-600',
          gradient: 'from-emerald-50 to-teal-50/40',
        };
    }
  };

  const theme = getTemplateTheme(cardConfig.template);

  // Trigger Browser Print Dialog
  const handlePrintCards = () => {
    const studentsToPrint: Student[] =
      printMode === 'single'
        ? selectedStudent
          ? [selectedStudent]
          : []
        : accessibleStudents.filter(
            (s) => s.className === selectedClassForBatch && s.status === 'aktif'
          );

    if (studentsToPrint.length === 0) {
      alert('Tidak ada siswa yang dipilih untuk dicetak.');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Harap izinkan popup browser untuk mencetak kartu.');
      return;
    }

    const cardsHtml = studentsToPrint
      .map(
        (s) => `
      <div class="card-wrapper">
        <!-- TAMPAK DEPAN -->
        <div class="id-card front ${cardConfig.template}">
          <div class="card-header">
            <div class="logo">
              <svg viewBox="0 0 100 100" width="34" height="34">
                <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" stroke="#fff" stroke-width="5" fill="#10b981"/>
                <text x="50" y="58" font-size="20" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">MI</text>
              </svg>
            </div>
            <div class="header-titles">
              <h5>${settings.subTitle}</h5>
              <h4>${settings.schoolName}</h4>
              <p>KARTU IDENTITAS & PRESENSI RFID SISWA</p>
            </div>
          </div>

          <div class="card-body">
            <div class="photo-box">
              <img src="${s.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.nis}`}" alt="${s.name}" />
              ${cardConfig.showChip ? '<div class="rfid-chip">RFID</div>' : ''}
            </div>

            <div class="student-info">
              <div class="info-name">${s.name}</div>
              <div class="info-row"><span>NIS</span><strong>: ${s.nis}</strong></div>
              <div class="info-row"><span>NISN</span><strong>: ${s.nisn || '-'}</strong></div>
              <div class="info-row"><span>Kelas</span><strong>: ${s.className}</strong></div>
              <div class="info-row"><span>RFID UID</span><strong>: ${s.rfidUid}</strong></div>
            </div>
          </div>

          <div class="card-footer">
            <div class="barcode-box">
              <div class="fake-barcode">|| | ||| || |||| | || ||| | |||</div>
              <span class="nis-text">${s.nis}</span>
            </div>
            <div class="signature-box">
              <div class="stamp-mark">TERVALIDASI</div>
              <p class="sign-title">Kepala Madrasah,</p>
              <div class="sign-line"></div>
              <p class="sign-name">${settings.headmaster}</p>
            </div>
          </div>
        </div>

        <!-- TAMPAK BELAKANG -->
        <div class="id-card back ${cardConfig.template}">
          <div class="back-header">
            <h4>TATA TERTIB PENGGUNAAN KARTU</h4>
          </div>
          <div class="back-body">
            <ol>
              <li>Kartu ini adalah identitas resmi siswa MI Rowosari Kendal.</li>
              <li>Wajib dibawa setiap hari dan digunakan untuk tap presensi RFID pada gerbang masuk dan pulang.</li>
              <li>Dilarang mencoret, merusak chip RFID, atau meminjamkan kartu kepada orang lain.</li>
              <li>Jika kartu hilang/rusak, segera laporkan ke bagian Tata Usaha MI Rowosari.</li>
            </ol>
            <div class="contact-info">
              <p><strong>Alamat:</strong> ${settings.address}</p>
              <p><strong>NPSN:</strong> ${settings.npsn} | <strong>NSM:</strong> ${settings.nsm}</p>
              <p><strong>Berlaku:</strong> ${cardConfig.validUntil}</p>
            </div>
          </div>
          <div class="back-footer">
            <span>SMART CARD RFID MI ROWOSARI • INDONESIA</span>
          </div>
        </div>
      </div>
    `
      )
      .join('');

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cetak Kartu Siswa RFID - MI Rowosari</title>
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .grid-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            page-break-inside: auto;
          }
          .card-wrapper {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            page-break-inside: avoid;
          }
          .id-card {
            width: 85.6mm;
            height: 53.98mm;
            border-radius: 4mm;
            border: 1px solid #cbd5e1;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
            background: #ffffff;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            font-size: 8px;
          }
          /* Theme colors */
          .emerald .card-header { background: linear-gradient(135deg, #065f46, #047857); }
          .navy .card-header { background: linear-gradient(135deg, #1e3a8a, #1e40af); }
          .gold .card-header { background: linear-gradient(135deg, #78350f, #92400e); }
          .modern .card-header { background: linear-gradient(135deg, #0f172a, #334155); }

          .card-header {
            color: white;
            padding: 4px 8px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .header-titles h5 { margin: 0; font-size: 5px; opacity: 0.85; text-transform: uppercase; }
          .header-titles h4 { margin: 1px 0; font-size: 8px; font-weight: 800; }
          .header-titles p { margin: 0; font-size: 5.5px; font-weight: 600; color: #a7f3d0; letter-spacing: 0.5px; }

          .card-body {
            padding: 4px 8px;
            display: flex;
            gap: 8px;
            align-items: center;
            flex: 1;
          }
          .photo-box {
            width: 22mm;
            height: 27mm;
            border-radius: 2mm;
            border: 1.5px solid #047857;
            overflow: hidden;
            position: relative;
            background: #f1f5f9;
          }
          .photo-box img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .rfid-chip {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: #047857;
            color: white;
            font-size: 5px;
            font-weight: bold;
            text-align: center;
            padding: 1px 0;
          }
          .student-info {
            flex: 1;
          }
          .info-name {
            font-size: 9px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 3px;
            text-transform: uppercase;
          }
          .info-row {
            display: flex;
            font-size: 7px;
            margin-bottom: 1.5px;
          }
          .info-row span {
            width: 14mm;
            color: #64748b;
          }
          .info-row strong {
            color: #0f172a;
          }
          .card-footer {
            padding: 3px 8px 4px 8px;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            border-top: 1px dashed #e2e8f0;
            background: #fafafa;
          }
          .fake-barcode {
            font-family: monospace;
            font-size: 8px;
            letter-spacing: 1px;
            color: #0f172a;
            line-height: 1;
          }
          .nis-text {
            font-size: 6px;
            font-weight: bold;
            color: #64748b;
            display: block;
            margin-top: 1px;
          }
          .signature-box {
            text-align: center;
            position: relative;
            font-size: 5.5px;
          }
          .sign-title { margin: 0; color: #475569; }
          .sign-line { height: 10px; }
          .sign-name { margin: 0; font-weight: bold; text-decoration: underline; }
          .stamp-mark {
            position: absolute;
            right: -2px;
            top: 2px;
            font-size: 5px;
            color: rgba(220, 38, 38, 0.6);
            border: 1px solid rgba(220, 38, 38, 0.6);
            padding: 1px 2px;
            border-radius: 2px;
            transform: rotate(-10deg);
            font-weight: bold;
          }

          /* Back Card */
          .id-card.back {
            padding: 6px 8px;
            background: #fafafa;
          }
          .back-header h4 {
            margin: 0 0 4px 0;
            font-size: 7px;
            text-align: center;
            color: #047857;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 2px;
          }
          .back-body ol {
            margin: 0;
            padding-left: 12px;
            font-size: 6px;
            color: #334155;
            line-height: 1.35;
          }
          .contact-info {
            margin-top: 4px;
            font-size: 5.5px;
            color: #64748b;
            border-top: 1px dashed #cbd5e1;
            padding-top: 3px;
          }
          .contact-info p { margin: 1px 0; }
          .back-footer {
            text-align: center;
            font-size: 5px;
            color: #94a3b8;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="grid-container">
          ${cardsHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(fullHtml);
    printWin.document.close();
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-emerald-700">
            <CreditCard className="w-4 h-4" />
            <span>Studio ID Card RFID</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase mt-1">
            {isGuru ? `Cetak Kartu Siswa ${currentUser?.assignedClass}` : 'Studio Cetak Kartu Siswa RFID'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Desain resmi Kartu Pelajar & Presensi RFID MI Rowosari dengan chip sensor dan barcode NIS
          </p>
        </div>

        <button
          onClick={handlePrintCards}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center space-x-2 cursor-pointer active:scale-98"
        >
          <Printer className="w-4 h-4" />
          <span>
            {printMode === 'single'
              ? `Cetak Kartu (${selectedStudent?.name.split(' ')[0] || 'Siswa'})`
              : `Cetak Massal (${selectedClassForBatch})`}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Customizer Controls (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center space-x-2 text-slate-900 font-black text-xs uppercase tracking-wider border-b border-slate-200 pb-3">
            <Settings className="w-4 h-4 text-emerald-600" />
            <span>Pengaturan Desain & Cetak</span>
          </div>

          {/* Mode Cetak */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
              Mode Cetak:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPrintMode('single')}
                className={`py-2 px-3 text-xs font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                  printMode === 'single'
                    ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cetak Satuan
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('class')}
                className={`py-2 px-3 text-xs font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                  printMode === 'class'
                    ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cetak Per Rombel
              </button>
            </div>
          </div>

          {/* Selector based on Mode */}
          {printMode === 'single' ? (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Pilih Siswa untuk Dicetak:
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold"
              >
                {accessibleStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.className} - NIS: {s.nis})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Pilih Rombel Kelas:
              </label>
              <select
                value={selectedClassForBatch}
                disabled={isGuru}
                onChange={(e) => setSelectedClassForBatch(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold disabled:bg-slate-100"
              >
                {accessibleClasses.map((c) => {
                  const count = accessibleStudents.filter((s) => s.className === c.name).length;
                  return (
                    <option key={c.id} value={c.name}>
                      {c.name} ({count} Siswa)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Template Pilihan */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
              Tema Warna Kartu:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'emerald', name: 'Emerald Madrasah', color: 'bg-emerald-600' },
                { id: 'navy', name: 'Royal Navy', color: 'bg-blue-800' },
                { id: 'gold', name: 'Amber Gold', color: 'bg-amber-600' },
                { id: 'modern', name: 'Dark Modern', color: 'bg-slate-800' },
              ].map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() =>
                    setCardConfig({ ...cardConfig, template: tpl.id as CardPrintSettings['template'] })
                  }
                  className={`p-2.5 rounded-xl border text-xs font-black uppercase flex items-center space-x-2 transition-all cursor-pointer ${
                    cardConfig.template === tpl.id
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${tpl.color}`} />
                  <span className="truncate">{tpl.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Live Preview (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col items-center justify-center space-y-6">
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Pratinjau Live Standar CR80
            </span>
            <h3 className="text-base font-black text-slate-900 uppercase mt-2">
              Tampak Depan & Belakang Kartu
            </h3>
          </div>

          {selectedStudent && (
            <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
              {/* Front Preview */}
              <div className="w-[280px] h-[176px] rounded-2xl border border-slate-300 shadow-lg bg-white overflow-hidden flex flex-col justify-between text-slate-900 text-[10px] relative">
                {/* Header */}
                <div
                  className={`p-2 bg-gradient-to-r ${theme.bgHeader} text-white flex items-center space-x-2`}
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-black text-[9px]">
                    MI
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[7px] text-emerald-200 font-bold uppercase truncate">
                      {settings.subTitle}
                    </div>
                    <div className="font-black text-[9px] uppercase truncate">
                      {settings.schoolName}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-2.5 flex items-center space-x-3 flex-1">
                  <div className="w-14 h-18 rounded-lg bg-slate-100 border border-emerald-600 overflow-hidden shrink-0 relative">
                    <img
                      src={
                        selectedStudent.photoUrl ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedStudent.nis}`
                      }
                      alt={selectedStudent.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white text-[6px] font-black text-center py-0.5">
                      RFID
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5 text-[9px]">
                    <div className="font-black text-slate-900 uppercase truncate">
                      {selectedStudent.name}
                    </div>
                    <div className="text-slate-500">
                      NIS: <strong className="text-slate-900 font-mono">{selectedStudent.nis}</strong>
                    </div>
                    <div className="text-slate-500">
                      Kelas: <strong className="text-emerald-700">{selectedStudent.className}</strong>
                    </div>
                    <div className="text-slate-500">
                      UID: <strong className="text-slate-900 font-mono text-[8px]">{selectedStudent.rfidUid}</strong>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-2.5 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[7px] text-slate-500 font-bold">
                  <span className="font-mono">||||| | ||| ||||</span>
                  <span>Kepala: {settings.headmaster}</span>
                </div>
              </div>

              {/* Back Preview */}
              <div className="w-[280px] h-[176px] rounded-2xl border border-slate-300 shadow-lg bg-slate-50 p-3 flex flex-col justify-between text-slate-800 text-[8px]">
                <div className="text-center font-black text-emerald-800 uppercase border-b border-slate-200 pb-1">
                  Tata Tertib Penggunaan Kartu
                </div>
                <ol className="list-decimal pl-4 space-y-0.5 text-[7.5px] text-slate-600 font-medium">
                  <li>Kartu ini adalah identitas resmi MI Rowosari.</li>
                  <li>Wajib dibawa setiap hari untuk tap presensi RFID.</li>
                  <li>Dilarang merusak atau meminjamkan kartu.</li>
                </ol>
                <div className="text-[7px] text-slate-400 text-center border-t border-slate-200 pt-1 font-bold">
                  SMART CARD RFID MI ROWOSARI
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
