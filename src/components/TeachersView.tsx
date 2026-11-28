import React, { useState } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Phone,
  Mail,
  Edit2,
  Trash2,
  X,
  MessageSquare,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Teacher } from '../types';
import { showConfirmDialog, showSuccessToast, showWarningToast } from '../utils/alerts';

export const TeachersView: React.FC = () => {
  const { teachers, classes, isGuru, addTeacher, updateTeacher, deleteTeacher } = useApp();

  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState({
    name: '',
    nip: '',
    assignedClass: '',
    assignedSubject: '',
    assignedClasses: [] as string[],
    phone: '',
    email: '',
    gender: 'L' as 'L' | 'P',
    photoUrl: '',
  });

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setForm({
      name: '',
      nip: '',
      assignedClass: '',
      assignedSubject: '',
      assignedClasses: [],
      phone: '',
      email: '',
      gender: 'L',
      photoUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setForm({
      name: t.name,
      nip: t.nip === '-' ? '' : t.nip,
      assignedClass: t.assignedClass || '',
      assignedSubject: t.assignedSubject || '',
      assignedClasses: t.assignedClasses || [],
      phone: t.phone,
      email: t.email,
      gender: t.gender || 'L',
      photoUrl: t.photoUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showWarningToast('Nama lengkap guru wajib diisi!');
      return;
    }

    const cleanSubject = form.assignedSubject.trim();
    const cleanAssignedClass = form.assignedClass.trim();
    const payload: Omit<Teacher, 'id'> = {
      name: form.name.trim(),
      nip: form.nip.trim() || '-',
      assignedClass: cleanAssignedClass,
      assignedSubject: cleanSubject || undefined,
      assignedClasses: form.assignedClasses.length > 0 ? form.assignedClasses : undefined,
      phone: form.phone.trim(),
      email: form.email.trim(),
      gender: form.gender,
      photoUrl: form.photoUrl.trim(),
    };

    if (editingTeacher) {
      updateTeacher({
        ...editingTeacher,
        ...payload,
      });
    } else {
      addTeacher(payload);
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (t: Teacher) => {
    const confirmed = await showConfirmDialog(
      'Hapus Data Guru?',
      `Apakah Anda yakin ingin menghapus data ${t.name}?`
    );
    if (confirmed) {
      deleteTeacher(t.id);
    }
  };

  const getClassOrder = (t: Teacher): number => {
    if (t.assignedSubject) return 8000;
    const className = t.assignedClass || '';
    if (!className) return 9999;
    const idx = classes.findIndex((c) => c.name.toLowerCase() === className.toLowerCase());
    if (idx !== -1) return idx;
    const digitMatch = className.match(/\d+/);
    if (digitMatch) return 1000 + parseInt(digitMatch[0], 10);
    return 5000;
  };

  const filtered = [...teachers]
    .filter((t) => {
      const isNonWali = Boolean(t.assignedSubject) || !t.assignedClass;
      if (filterClass === 'non_wali' && !isNonWali) return false;
      if (filterClass !== 'all' && filterClass !== 'non_wali') {
        const matchesSingle = t.assignedClass === filterClass;
        const matchesMulti = t.assignedClasses?.includes(filterClass);
        const matchesPjok = t.assignedClass?.toLowerCase() === 'kelas 1-6';
        const matchesTik =
          t.assignedClass?.toLowerCase() === 'kelas 4-6' && /[456]/.test(filterClass);
        if (!matchesSingle && !matchesMulti && !matchesPjok && !matchesTik) {
          return false;
        }
      }
      const q = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.nip.toLowerCase().includes(q) ||
        (t.assignedClass || '').toLowerCase().includes(q) ||
        (t.assignedSubject || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const orderA = getClassOrder(a);
      const orderB = getClassOrder(b);
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2 uppercase">
            <GraduationCap className="w-6 h-6 text-emerald-600" />
            <span>Data Guru MI Islamiyah Rowosari</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Direktori dewan guru dan wali kelas aktif ({teachers.length} Guru Terdaftar)
          </p>
        </div>

        {!isGuru && (
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Data Guru</span>
          </button>
        )}
      </div>

      {/* Filter and Cards */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari Nama Guru / NIP / Kelas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden bg-slate-50"
            />
          </div>

          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-full sm:w-56 px-3.5 py-2 text-xs sm:text-sm font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden bg-slate-50 text-slate-800 cursor-pointer"
          >
            <option value="all">Semua Guru ({teachers.length})</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.name}>
                Wali {cls.name}
              </option>
            ))}
            <option value="non_wali">Guru Mapel / Non-Wali</option>
          </select>
        </div>

        {/* Teachers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.length === 0 ? (
            <div className="col-span-3 py-12 text-center text-slate-400 text-xs font-semibold">
              Tidak ada data guru yang cocok.
            </div>
          ) : (
            filtered.map((t) => {
              const cleanPhone = (t.phone || '').replace(/[^0-9]/g, '');
              const waLink = cleanPhone
                ? `https://wa.me/62${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}`
                : '#';

              return (
                <div
                  key={t.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5 hover:border-emerald-400 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3.5">
                        <img
                          src={
                            t.photoUrl ||
                            `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80`
                          }
                          alt={t.name}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-xs"
                        />
                        <div>
                          <div className="font-black text-sm text-slate-900 leading-snug uppercase">
                            {t.name}
                          </div>
                          <div className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
                            NIP/NUPTK: {t.nip && t.nip !== '-' ? t.nip : '-'}
                          </div>
                          <span
                            className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              t.assignedSubject
                                ? 'bg-indigo-100 text-indigo-800'
                                : t.assignedClass
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {t.assignedSubject
                              ? `Guru ${t.assignedSubject} (${t.assignedClass || 'Multi-Kelas'})`
                              : t.assignedClass
                                ? `Wali ${t.assignedClass}`
                                : 'Guru Mapel / Non-Wali'}
                          </span>
                        </div>
                      </div>

                      {!isGuru && (
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-white cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-white cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 space-y-2 text-xs text-slate-700 font-semibold">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-mono">{t.phone || '-'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">{t.email || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200">
                    {cleanPhone ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-black uppercase tracking-wider text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Kirim Pesan WhatsApp</span>
                      </a>
                    ) : (
                      <div className="w-full py-2.5 px-3 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 font-black uppercase tracking-wider text-xs flex items-center justify-center space-x-2">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Nomor WA Belum Diisi</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && !isGuru && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wider">
                {editingTeacher ? 'Edit Data Guru' : 'Tambah Data Guru Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Nama Lengkap Guru (dengan Gelar) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ustadzah Siti Fatimah, S.Pd.I"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    NIP / NUPTK <span className="text-slate-400 font-semibold">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Kosongkan jika belum ada"
                    value={form.nip}
                    onChange={(e) => setForm({ ...form, nip: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Tugas / Cakupan Kelas <span className="text-slate-400 font-semibold">(Opsional)</span>
                  </label>
                  <select
                    value={form.assignedClass}
                    onChange={(e) => {
                      const val = e.target.value;
                      let nextClasses: string[] = [];
                      if (val === 'Kelas 1-6') {
                        nextClasses = classes
                          .filter((c) => {
                            const m = c.name.match(/\d+/);
                            const g = m ? parseInt(m[0], 10) : Number(c.grade);
                            return g >= 1 && g <= 6;
                          })
                          .map((c) => c.name);
                      } else if (val === 'Kelas 4-6') {
                        nextClasses = classes
                          .filter((c) => {
                            const dm = c.name.match(/\d+/);
                            const g = dm ? parseInt(dm[0], 10) : Number(c.grade);
                            return g >= 4 && g <= 6;
                          })
                          .map((c) => c.name);
                      }
                      setForm({ ...form, assignedClass: val, assignedClasses: nextClasses });
                    }}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold bg-white cursor-pointer"
                  >
                    <option value="">-- Guru Mapel / Non-Wali --</option>
                    <option value="Kelas 1-6">Semua Kelas 1-6 (Guru Mapel)</option>
                    <option value="Kelas 4-6">Kelas 4-6 (Guru Mapel)</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.name}>
                        Wali {cls.name} (Tingkat {cls.grade})
                      </option>
                    ))}
                    {form.assignedClass &&
                      form.assignedClass !== 'Kelas 1-6' &&
                      form.assignedClass !== 'Kelas 4-6' &&
                      !classes.some((c) => c.name === form.assignedClass) && (
                        <option value={form.assignedClass}>
                          {form.assignedClass} (Kustom)
                        </option>
                      )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Mata Pelajaran Khusus <span className="text-slate-400 font-semibold">(Opsional, misal: PJOK / TIK Komputer)</span>
                </label>
                <input
                  type="text"
                  placeholder="Kosongkan jika Wali Kelas (contoh: PJOK, TIK Komputer)"
                  value={form.assignedSubject}
                  onChange={(e) => setForm({ ...form, assignedSubject: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    No WhatsApp / HP <span className="text-slate-400 font-semibold">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as 'L' | 'P' })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold bg-white cursor-pointer"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Email Madrasah <span className="text-slate-400 font-semibold">(Opsional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="nama@mirowosari.sch.id"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Foto URL <span className="text-slate-400 font-semibold">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={form.photoUrl}
                    onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
