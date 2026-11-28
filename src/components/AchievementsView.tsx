import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  Plus,
  Search,
  Filter,
  Calendar,
  Trophy,
  Medal,
  Edit2,
  Trash2,
  X,
  Printer,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Share2,
  Eye,
  FileText,
  User,
  Building,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SchoolAchievement } from '../types';
import { showConfirmDialog, showSuccessToast, showWarningToast } from '../utils/alerts';
import { buildOfficialKopHtml, printHtmlDocument } from '../utils/printUtils';

const CATEGORIES = ['Akademik', 'Non-Akademik', 'Keagamaan', 'Seni & Olahraga', 'Lainnya'] as const;
const LEVELS = ['Madrasah', 'Kecamatan', 'Kabupaten', 'Provinsi', 'Nasional', 'Internasional'] as const;

export const AchievementsView: React.FC = () => {
  const { achievements, addAchievement, updateAchievement, deleteAchievement, isGuru } = useApp();

  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SchoolAchievement | null>(null);
  const [selectedItem, setSelectedItem] = useState<SchoolAchievement | null>(null);

  const [form, setForm] = useState({
    title: '',
    category: 'Akademik' as SchoolAchievement['category'],
    level: 'Kabupaten' as SchoolAchievement['level'],
    year: String(new Date().getFullYear()),
    studentName: '',
    className: '',
    rank: 'Juara 1',
    organizer: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const availableYears = useMemo(() => {
    const years = new Set(achievements.map((a) => a.year).filter(Boolean));
    years.add(String(new Date().getFullYear()));
    return Array.from(years).sort((a, b) => String(b).localeCompare(String(a)));
  }, [achievements]);

  const filteredAchievements = useMemo(() => {
    return achievements
      .filter((item) => {
        if (filterYear !== 'all' && item.year !== filterYear) return false;
        if (filterCategory !== 'all' && item.category !== filterCategory) return false;
        if (filterLevel !== 'all' && item.level !== filterLevel) return false;
        const q = search.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.studentName.toLowerCase().includes(q) ||
          (item.organizer || '').toLowerCase().includes(q) ||
          (item.className || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => String(b.year).localeCompare(String(a.year)) || (b.date || '').localeCompare(a.date || '') || 0);
  }, [achievements, search, filterYear, filterCategory, filterLevel]);

  // Default selection to first filtered item if none selected or if selected is filtered out
  useEffect(() => {
    if (filteredAchievements.length > 0) {
      if (!selectedItem || !filteredAchievements.some((a) => a.id === selectedItem.id)) {
        setSelectedItem(filteredAchievements[0]);
      }
    } else {
      setSelectedItem(null);
    }
  }, [filteredAchievements, selectedItem]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({
      title: '',
      category: 'Akademik',
      level: 'Kabupaten',
      year: String(new Date().getFullYear()),
      studentName: '',
      className: '',
      rank: 'Juara 1',
      organizer: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: SchoolAchievement, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingItem(item);
    setForm({
      title: item.title,
      category: item.category,
      level: item.level,
      year: item.year || String(new Date().getFullYear()),
      studentName: item.studentName,
      className: item.className || '',
      rank: item.rank,
      organizer: item.organizer || '',
      description: item.description || '',
      date: item.date || new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.studentName.trim() || !form.rank.trim()) {
      showWarningToast('Judul prestasi, nama siswa/tim, dan kejuaraan (juara) wajib diisi!');
      return;
    }

    const payload = {
      title: form.title.trim(),
      category: form.category,
      level: form.level,
      year: form.year.trim() || String(new Date().getFullYear()),
      studentName: form.studentName.trim(),
      className: form.className.trim(),
      rank: form.rank.trim(),
      organizer: form.organizer.trim(),
      description: form.description.trim(),
      date: form.date,
    };

    if (editingItem) {
      const updated = { ...editingItem, ...payload };
      updateAchievement(updated);
      setSelectedItem(updated);
    } else {
      const created = addAchievement(payload);
      setSelectedItem(created);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (item: SchoolAchievement, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = await showConfirmDialog(
      'Hapus Data Prestasi?',
      `Apakah Anda yakin ingin menghapus prestasi "${item.title}" (${item.studentName})?`
    );
    if (confirmed) {
      deleteAchievement(item.id);
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
    }
  };

  const stats = useMemo(() => {
    const total = achievements.length;
    const nasionalProv = achievements.filter((a) => a.level === 'Nasional' || a.level === 'Provinsi' || a.level === 'Internasional').length;
    const kabKec = achievements.filter((a) => a.level === 'Kabupaten' || a.level === 'Kecamatan').length;
    const currentYearCount = achievements.filter((a) => a.year === String(new Date().getFullYear())).length;
    return { total, nasionalProv, kabKec, currentYearCount };
  }, [achievements]);

  const getLevelBadgeColor = (level: SchoolAchievement['level']) => {
    switch (level) {
      case 'Internasional':
      case 'Nasional':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Provinsi':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Kabupaten':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Kecamatan':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Madrasah':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const handlePrintReport = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const kopHtml = buildOfficialKopHtml(origin);

    const rowsHtml = filteredAchievements
      .map(
        (a, idx) => `
      <tr>
        <td style="text-align: center; padding: 8px; border: 1px solid #cbd5e1;">${idx + 1}</td>
        <td style="text-align: center; padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${a.year}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">
          <div style="font-weight: bold; font-size: 13px;">${a.title}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">${a.description || '-'}</div>
        </td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">
          <div style="font-weight: bold;">${a.studentName}</div>
          <div style="font-size: 11px; color: #64748b;">${a.className || '-'}</div>
        </td>
        <td style="text-align: center; padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #047857;">${a.rank}</td>
        <td style="text-align: center; padding: 8px; border: 1px solid #cbd5e1;">${a.level}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 11px;">${a.organizer || '-'}</td>
      </tr>
    `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Rekapitulasi Prestasi Sekolah - MI Islamiyah Rowosari</title>
          <style>
            body { font-family: 'Times New Roman', serif; color: #0f172a; margin: 20px; font-size: 12px; line-height: 1.4; }
            h3 { text-align: center; text-transform: uppercase; margin: 15px 0 5px 0; font-size: 15px; }
            p.subtitle { text-align: center; font-size: 12px; margin-bottom: 20px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #047857 !important; color: white !important; padding: 9px 8px; border: 1px solid #047857; font-size: 11px; text-transform: uppercase; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
            .sign-box { text-align: center; width: 220px; }
          </style>
        </head>
        <body>
          ${kopHtml}
          <h3>REKAPITULASI PRESTASI & KEJUARAAN SEKOLAH / MADRASAH</h3>
          <p class="subtitle">TAHUN ANGKATAN / PERIODE: ${filterYear === 'all' ? 'SEMUA TAHUN' : `TAHUN ${filterYear}`}</p>
          
          <table>
            <thead>
              <tr>
                <th style="width: 35px;">No</th>
                <th style="width: 60px;">Tahun</th>
                <th>Nama Prestasi & Kegiatan</th>
                <th>Nama Peserta Didik / Tim</th>
                <th style="width: 90px;">Pencapaian</th>
                <th style="width: 80px;">Tingkat</th>
                <th>Penyelenggara</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 20px;">Tidak ada data prestasi.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            <div></div>
            <div class="sign-box">
              <p>Rowosari, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p style="font-weight: bold; margin-bottom: 55px;">Kepala Madrasah,</p>
              <p style="font-weight: bold; text-decoration: underline;">H. Ahmad Muzakki, M.Pd.I</p>
              <p>NIP. 197805122005011003</p>
            </div>
          </div>
        </body>
      </html>
    `;

    printHtmlDocument(html);
  };

  const handlePrintSingle = (item: SchoolAchievement) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const kopHtml = buildOfficialKopHtml(origin);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Sertifikat / Detail Prestasi - ${item.title}</title>
          <style>
            body { font-family: 'Times New Roman', serif; color: #0f172a; margin: 30px; font-size: 13px; line-height: 1.6; }
            .cert-box { border: 4px double #047857; padding: 30px; border-radius: 12px; background: #fff; }
            h2 { text-align: center; text-transform: uppercase; color: #047857; margin: 15px 0 5px 0; font-size: 18px; }
            h4 { text-align: center; text-transform: uppercase; margin: 0 0 25px 0; font-size: 13px; color: #475569; letter-spacing: 1px; }
            .recipient { text-align: center; font-size: 22px; font-weight: bold; color: #0f172a; margin: 20px 0; text-transform: uppercase; }
            .details-table { width: 100%; margin: 25px 0; border-collapse: collapse; }
            .details-table td { padding: 8px 12px; border-bottom: 1px dashed #cbd5e1; }
            .label { font-weight: bold; width: 180px; color: #334155; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; }
            .sign-box { text-align: center; width: 220px; }
          </style>
        </head>
        <body>
          <div class="cert-box">
            ${kopHtml}
            <h2>SURAT KETERANGAN / PIAGAM PENGHARGAAN PRESTASI</h2>
            <h4>TENTANG PENCAPAIAN PRESTASI PESERTA DIDIK TAHUN ${item.year}</h4>
            
            <p style="text-align: center; margin-bottom: 10px;">Diberikan kepada peserta didik / tim berprestasi:</p>
            <div class="recipient">${item.studentName}</div>
            <p style="text-align: center; margin-top: -10px; font-weight: bold; color: #047857;">Kelas: ${item.className || '-'}</p>

            <table class="details-table">
              <tr>
                <td class="label">Nama Prestasi / Lomba</td>
                <td>: <strong>${item.title}</strong></td>
              </tr>
              <tr>
                <td class="label">Pencapaian</td>
                <td>: <strong style="color: #d97706; font-size: 15px;">${item.rank}</strong></td>
              </tr>
              <tr>
                <td class="label">Kategori / Bidang</td>
                <td>: ${item.category}</td>
              </tr>
              <tr>
                <td class="label">Tingkat Wilayah</td>
                <td>: Tingkat ${item.level}</td>
              </tr>
              <tr>
                <td class="label">Penyelenggara</td>
                <td>: ${item.organizer || '-'}</td>
              </tr>
              <tr>
                <td class="label">Tanggal Kegiatan</td>
                <td>: ${item.date ? new Date(item.date).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}</td>
              </tr>
              <tr>
                <td class="label">Keterangan</td>
                <td>: ${item.description || '-'}</td>
              </tr>
            </table>

            <p style="text-align: justify; margin-top: 20px; font-size: 12px; color: #475569;">
              Demikian piagam dan catatan prestasi ini dicatat dan disahkan sebagai bentuk apresiasi atas dedikasi serta prestasi gemilang yang mengharumkan nama baik lembaga MI Islamiyah Rowosari.
            </p>

            <div class="footer">
              <div></div>
              <div class="sign-box">
                <p>Rowosari, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p style="font-weight: bold; margin-bottom: 50px;">Kepala Madrasah,</p>
                <p style="font-weight: bold; text-decoration: underline;">H. Ahmad Muzakki, M.Pd.I</p>
                <p>NIP. 197805122005011003</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printHtmlDocument(html);
  };

  return (
    <div className="space-y-6 w-full font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-emerald-700">
            <Award className="w-4 h-4" />
            <span>Dokumentasi & Portofolio Madrasah</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-1">
            Data Prestasi Sekolah Setiap Tahun
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Rekapitulasi penghargaan, kejuaraan, dan prestasi akademik & non-akademik siswa-siswi
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handlePrintReport}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rekap</span>
          </button>

          {!isGuru && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-700/20 flex items-center space-x-2 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ TAMBAH PRESTASI</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Prestasi</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-500 font-bold mt-0.5">Semua tahun terdata</div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-amber-200 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">Nasional & Provinsi</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{stats.nasionalProv}</div>
          <div className="text-[11px] text-amber-600 font-bold mt-0.5">Tingkat tertinggi</div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-emerald-200 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Kabupaten & Kecamatan</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.kabKec}</div>
          <div className="text-[11px] text-emerald-600 font-bold mt-0.5">Regional wilayah</div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-blue-200 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Tahun {new Date().getFullYear()}</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{stats.currentYearCount}</div>
          <div className="text-[11px] text-blue-600 font-bold mt-0.5">Prestasi tahun ini</div>
        </div>
      </div>

      {/* Toolbar Filter */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Judul, Siswa, Penyelenggara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-emerald-600"
            />
          </div>

          {/* Year Filter */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600 cursor-pointer"
          >
            <option value="all">Semua Tahun</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                Tahun {y}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600 cursor-pointer"
          >
            <option value="all">Semua Kategori</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Level Filter */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600 cursor-pointer"
          >
            <option value="all">Semua Tingkat</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                Tingkat {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Layout: Left = List, Right = Preview Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: List of Achievements */}
        <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
          {filteredAchievements.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 p-6">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1" />
              <p className="text-sm font-semibold text-slate-600">Tidak ada data prestasi yang cocok dengan pencarian.</p>
            </div>
          ) : (
            filteredAchievements.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`bg-white rounded-2xl border p-4 shadow-xs transition-all cursor-pointer text-left relative group ${
                    isSelected
                      ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/30'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {item.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getLevelBadgeColor(
                        item.level
                      )}`}
                    >
                      {item.level}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 mb-1">
                    <Medal className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="uppercase tracking-wide">{item.rank}</span>
                  </div>

                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-snug">
                    {item.title}
                  </h4>

                  <p className="text-xs text-slate-600 font-semibold mt-1">
                    {item.studentName} {item.className ? `(${item.className})` : ''}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                    <span className="font-mono text-slate-700">Tahun {item.year}</span>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                        }}
                        className={`p-1.5 rounded-lg flex items-center space-x-1 text-xs font-bold transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-emerald-100 hover:text-emerald-900'
                        }`}
                        title="Lihat Pratinjau"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat</span>
                      </button>

                      {!isGuru && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(item, e)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(item, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Live Preview Panel */}
        <div className="lg:col-span-7 sticky top-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider">
                  Pratinjau Dokumen / Piagam Prestasi
                </h3>
              </div>

              {selectedItem && (
                <button
                  type="button"
                  onClick={() => handlePrintSingle(selectedItem)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md flex items-center space-x-1.5 cursor-pointer transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Piagam</span>
                </button>
              )}
            </div>

            <div className="p-6 sm:p-8 bg-slate-50 flex-1">
              {selectedItem ? (
                <div className="bg-white rounded-2xl border-2 border-emerald-700/30 p-6 sm:p-8 shadow-md relative overflow-hidden">
                  {/* Watermark/Badge decoration */}
                  <div className="absolute top-4 right-4 text-emerald-700/10 pointer-events-none">
                    <Trophy className="w-32 h-32" />
                  </div>

                  <div className="text-center pb-6 border-b border-slate-200">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full">
                      MI ISLAMIYAH ROWOSARI
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight mt-3">
                      {selectedItem.title}
                    </h3>
                    <p className="text-xs font-bold text-amber-600 mt-1 flex items-center justify-center space-x-1">
                      <Medal className="w-4 h-4" />
                      <span>{selectedItem.rank}</span>
                    </p>
                  </div>

                  <div className="py-6 space-y-4 text-xs font-bold text-slate-700">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                        <User className="w-4 h-4 text-emerald-600" />
                        <span>Nama Peserta / Tim</span>
                      </span>
                      <span className="text-slate-900 text-sm font-black">{selectedItem.studentName}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-400 uppercase tracking-wider">Kelas</span>
                      <span className="text-slate-900 font-bold">{selectedItem.className || '-'}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-400 uppercase tracking-wider">Kategori Lomba</span>
                      <span className="text-emerald-700 font-black">{selectedItem.category}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-400 uppercase tracking-wider">Tingkat Wilayah</span>
                      <span className="text-slate-900">{selectedItem.level}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-400 uppercase tracking-wider">Tahun Prestasi</span>
                      <span className="font-mono text-slate-900 font-bold">Tahun {selectedItem.year}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-400 uppercase tracking-wider">Penyelenggara</span>
                      <span className="text-slate-900">{selectedItem.organizer || '-'}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-400 uppercase tracking-wider">Tanggal Kegiatan</span>
                      <span className="text-slate-900">
                        {selectedItem.date ? new Date(selectedItem.date).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}
                      </span>
                    </div>

                    {selectedItem.description && (
                      <div className="pt-2">
                        <span className="text-slate-400 uppercase tracking-wider block mb-1">Keterangan / Catatan</span>
                        <p className="p-3 bg-slate-50 rounded-xl text-slate-700 font-medium leading-relaxed">
                          {selectedItem.description}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Disahkan oleh Sistem Madrasah</span>
                    <span className="font-bold text-emerald-700">MI Islamiyah Rowosari</span>
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-slate-400">
                  <Eye className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1" />
                  <p className="text-sm font-semibold text-slate-600">Pilih salah satu prestasi di sebelah kiri untuk melihat pratinjau detail.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Add / Edit Achievement */}
      {isModalOpen && !isGuru && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-br from-emerald-700 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">
                  Portofolio Madrasah
                </span>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  {editingItem ? 'Edit Data Prestasi' : 'Tambah Prestasi Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs font-bold text-slate-700 overflow-y-auto flex-1">
              <div>
                <label className="block uppercase tracking-wider mb-1">
                  Judul Prestasi / Kejuaraan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Juara 1 Olimpiade Matematika"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase tracking-wider mb-1">Kategori Lomba</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block uppercase tracking-wider mb-1">Tingkat Wilayah</label>
                  <select
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 cursor-pointer"
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        Tingkat {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase tracking-wider mb-1">Tahun Prestasi *</label>
                  <input
                    type="text"
                    required
                    placeholder="2026"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider mb-1">Pencapaian (Juara / Medali) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Juara 1 / Medali Emas"
                    value={form.rank}
                    onChange={(e) => setForm({ ...form, rank: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase tracking-wider mb-1">Nama Siswa / Tim *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Muhammad Farhan"
                    value={form.studentName}
                    onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider mb-1">Kelas <span className="text-slate-400 font-normal">(Opsional)</span></label>
                  <input
                    type="text"
                    placeholder="Kelas 6A"
                    value={form.className}
                    onChange={(e) => setForm({ ...form, className: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase tracking-wider mb-1">Penyelenggara / Instansi Pemberi</label>
                <input
                  type="text"
                  placeholder="Contoh: Kemenag Kabupaten Kendal"
                  value={form.organizer}
                  onChange={(e) => setForm({ ...form, organizer: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider mb-1">Keterangan / Deskripsi Singkat</label>
                <textarea
                  rows={3}
                  placeholder="Keterangan tambahan mengenai lomba atau kejuaraan..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="pt-3 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-black uppercase tracking-wider text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-700/20 active:scale-98 transition-all cursor-pointer"
                >
                  Simpan Prestasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
