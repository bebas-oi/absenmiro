import * as XLSX from 'xlsx';
import { ImportPreviewResult, ImportValidationError, SchoolSettings, Student } from '../types';

/**
 * Downloads a standardized Excel template for student data import
 */
export function downloadStudentExcelTemplate() {
  const sampleData = [
    {
      NIS: '20260191',
      NAMA: 'Ahmad Fauzi Rahman',
      RFID: 'E2809901',
      KELAS: 'Kelas 1A',
      'JENIS KELAMIN': 'L',
    },
    {
      NIS: '20260192',
      NAMA: 'Siti Nur Azizah',
      RFID: 'E2809902',
      KELAS: 'Kelas 1A',
      'JENIS KELAMIN': 'P',
    },
    {
      NIS: '20260193',
      NAMA: 'Muhammad Bintang Pratama',
      RFID: 'E2809903',
      KELAS: 'Kelas 1B',
      'JENIS KELAMIN': 'L',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Styling / column widths
  ws['!cols'] = [
    { wch: 14 }, // NIS
    { wch: 32 }, // NAMA
    { wch: 16 }, // RFID
    { wch: 14 }, // KELAS
    { wch: 16 }, // JENIS KELAMIN
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');

  XLSX.writeFile(wb, 'Template_Data_Siswa_MI_Rowosari.xlsx');
}

/**
 * Parses and validates student import Excel file
 */
export async function parseAndValidateStudentExcel(
  file: File,
  existingStudents: Student[],
  validClassNames: string[]
): Promise<ImportPreviewResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Parse raw rows
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          resolve({
            totalRows: 0,
            validRows: [],
            errorRows: [
              {
                row: 1,
                message: 'File Excel kosong atau tidak memiliki data pada sheet pertama.',
              },
            ],
            duplicateCount: 0,
          });
          return;
        }

        const validRows: Omit<Student, 'id' | 'createdAt'>[] = [];
        const errorRows: ImportValidationError[] = [];
        let duplicateCount = 0;

        const seenNisInFile = new Set<string>();
        const seenRfidInFile = new Set<string>();

        // Set of existing DB values for quick duplicate checking
        const existingNisMap = new Map<string, string>(); // nis -> studentName
        const existingRfidMap = new Map<string, string>(); // rfid -> studentName

        existingStudents.forEach((s) => {
          if (s.nis) existingNisMap.set(s.nis.trim().toLowerCase(), s.name);
          if (s.rfidUid) existingRfidMap.set(s.rfidUid.trim().toUpperCase(), s.name);
        });

        // Loop over each row in the Excel sheet
        rawJson.forEach((row, idx) => {
          const rowNumber = idx + 2; // Excel header is row 1, data starts at row 2

          // Normalize keys (handle case-insensitive and spacing)
          const getVal = (possibleKeys: string[]) => {
            for (const key of Object.keys(row)) {
              const cleanKey = key.trim().toLowerCase();
              if (possibleKeys.some((pk) => cleanKey === pk.toLowerCase())) {
                return String(row[key]).trim();
              }
            }
            return '';
          };

          const rawNis = getVal(['nis', 'nomor induk', 'no induk']);
          const rawName = getVal(['nama', 'nama siswa', 'nama lengkap']);
          const rawRfid = getVal(['rfid', 'rfid uid', 'uid', 'no rfid', 'kartu rfid']);
          const rawKelas = getVal(['kelas', 'class', 'rombel']);
          const rawGender = getVal(['jenis kelamin', 'jk', 'gender', 'l/p']);

          // 1. Check required NIS
          if (!rawNis) {
            errorRows.push({
              row: rowNumber,
              message: `Baris ${rowNumber}: NIS tidak boleh kosong.`,
            });
            return;
          }

          // 2. Check required NAMA
          if (!rawName) {
            errorRows.push({
              row: rowNumber,
              nis: rawNis,
              message: `Baris ${rowNumber}: Nama siswa tidak boleh kosong.`,
            });
            return;
          }

          // 3. Check required RFID
          if (!rawRfid) {
            errorRows.push({
              row: rowNumber,
              nis: rawNis,
              name: rawName,
              message: `Baris ${rowNumber}: No RFID tidak boleh kosong.`,
            });
            return;
          }

          // 4. Validate and normalize KELAS
          let matchedClass = '';
          const normalizedInputClass = rawKelas.toLowerCase().replace(/\s+/g, '');
          
          for (const vc of validClassNames) {
            const normalizedValidClass = vc.toLowerCase().replace(/\s+/g, '');
            if (
              normalizedInputClass === normalizedValidClass ||
              normalizedInputClass === normalizedValidClass.replace('kelas', '') ||
              `kelas${normalizedInputClass}` === normalizedValidClass
            ) {
              matchedClass = vc;
              break;
            }
          }

          if (!matchedClass) {
            errorRows.push({
              row: rowNumber,
              nis: rawNis,
              name: rawName,
              className: rawKelas,
              message: `Baris ${rowNumber}: Kelas '${rawKelas || '(kosong)'}' tidak valid. Pilihan: ${validClassNames.join(', ')}.`,
            });
            return;
          }

          // 5. Validate and normalize JENIS KELAMIN
          let normalizedGender: 'L' | 'P' = 'L';
          const genderLower = rawGender.toLowerCase().trim();
          if (genderLower === 'l' || genderLower === 'laki-laki' || genderLower === 'laki' || genderLower === 'pria') {
            normalizedGender = 'L';
          } else if (genderLower === 'p' || genderLower === 'perempuan' || genderLower === 'wanita') {
            normalizedGender = 'P';
          } else if (rawGender === '') {
            normalizedGender = 'L'; // default
          } else {
            errorRows.push({
              row: rowNumber,
              nis: rawNis,
              name: rawName,
              gender: rawGender,
              message: `Baris ${rowNumber}: Jenis kelamin '${rawGender}' tidak valid (harus L atau P).`,
            });
            return;
          }

          // 6. Check Duplicate NIS in file
          const cleanNisLower = rawNis.toLowerCase();
          if (seenNisInFile.has(cleanNisLower)) {
            duplicateCount++;
            errorRows.push({
              row: rowNumber,
              nis: rawNis,
              name: rawName,
              message: `Baris ${rowNumber}: NIS '${rawNis}' duplikat di dalam file Excel.`,
            });
            return;
          }

          // 7. Check Duplicate RFID in file
          const cleanRfidUpper = rawRfid.toUpperCase();
          if (seenRfidInFile.has(cleanRfidUpper)) {
            duplicateCount++;
            errorRows.push({
              row: rowNumber,
              nis: rawNis,
              rfidUid: rawRfid,
              name: rawName,
              message: `Baris ${rowNumber}: RFID '${rawRfid}' duplikat di dalam file Excel.`,
            });
            return;
          }

          // 8. Check Duplicate NIS in existing database
          if (existingNisMap.has(cleanNisLower)) {
            duplicateCount++;
            errorRows.push({
              row: rowNumber,
              nis: rawNis,
              name: rawName,
              message: `Baris ${rowNumber}: NIS '${rawNis}' sudah digunakan oleh siswa '${existingNisMap.get(cleanNisLower)}'.`,
            });
            return;
          }

          // 9. Check Duplicate RFID in existing database
          if (existingRfidMap.has(cleanRfidUpper)) {
            duplicateCount++;
            errorRows.push({
              row: rowNumber,
              nis: rawNis,
              rfidUid: rawRfid,
              name: rawName,
              message: `Baris ${rowNumber}: RFID '${rawRfid}' sudah digunakan oleh siswa '${existingRfidMap.get(cleanRfidUpper)}'.`,
            });
            return;
          }

          // Mark as seen in this file
          seenNisInFile.add(cleanNisLower);
          seenRfidInFile.add(cleanRfidUpper);

          // All good -> push to valid rows
          validRows.push({
            nis: rawNis,
            name: rawName,
            rfidUid: cleanRfidUpper,
            className: matchedClass,
            gender: normalizedGender,
            parentName: getVal(['nama orang tua', 'wali', 'orang tua']) || `Wali dari ${rawName}`,
            parentPhone: getVal(['no hp', 'telepon', 'whatsapp', 'no telepon']) || '081234567890',
            address: getVal(['alamat', 'desa', 'kelurahan']) || 'Rowosari, Kendal',
            photoUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${rawNis}`,
            status: 'aktif',
          });
        });

        resolve({
          totalRows: rawJson.length,
          validRows,
          errorRows,
          duplicateCount,
        });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
