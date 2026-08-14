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
  const { teachers, classes, addTeacher, updateTeacher, deleteTeacher } = useApp();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState({
    name: '',
    nip: '',
    assignedClass: classes[0]?.name || 'Kelas 1A',
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
      assignedClass: classes[0]?.name || 'Kelas 1A',
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
      nip: t.nip,
      assignedClass: t.assignedClass,
      phone: t.phone,
      email: t.email,
      gender: t.gender,
      photoUrl: t.photoUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.nip) {
      showWarningToast('Nama guru dan NIP wajib diisi!');
      return;
    }

    if (editingTeacher) {
      updateTeacher({
        ...editingTeacher,
        ...form,
      });
    } else {
      addTeacher(form);
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (t: Teacher) => {
    const confirmed = await showConfirmDialog(
      'Hapus Data Wali Kelas?',
      `Apakah Anda yakin ingin menghapus data ${t.name}?`
    );
    if (confirmed) {
      deleteTeacher(t.id);
    }
  };

  const filtered = teachers.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.nip.includes(q) ||
      t.assignedClass.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2 uppercase">
            <GraduationCap className="w-6 h-6 text-emerald-600" />
            <span>Data Dewan Guru & Wali Kelas MI Rowosari</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Manajemen data wali kelas untuk pendampingan kehadiran dan komunikasi orang tua
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Wali Kelas</span>
        </button>
      </div>

      {/* Filter and Cards */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari Nama Guru / NIP / Rombel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden bg-slate-50"
          />
        </div>

        {/* Teachers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.length === 0 ? (
            <div className="col-span-3 py-12 text-center text-slate-400 text-xs font-semibold">
              Tidak ada data wali kelas yang cocok.
            </div>
          ) : (
            filtered.map((t) => {
              const cleanPhone = t.phone.replace(/[^0-9]/g, '');
              const waLink = cleanPhone ? `https://wa.me/62${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}` : '#';

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
                            NIP: {t.nip}
                          </div>
                          <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                            {t.assignedClass}
                          </span>
                        </div>
                      </div>

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
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 space-y-2 text-xs text-slate-700 font-semibold">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-mono">{t.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">{t.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-black uppercase tracking-wider text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Kirim Pesan WhatsApp</span>
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wider">
                {editingTeacher ? 'Edit Data Wali Kelas' : 'Tambah Wali Kelas Baru'}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    NIP / NUPTK *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 198402152009122002"
                    value={form.nip}
                    onChange={(e) => setForm({ ...form, nip: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Rombel Kelas yang Diampu
                  </label>
                  <select
                    value={form.assignedClass}
                    onChange={(e) => setForm({ ...form, assignedClass: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.name}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    No WhatsApp / HP *
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
                    Email Madrasah
                  </label>
                  <input
                    type="email"
                    placeholder="nama@mirowosari.sch.id"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Foto URL (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={form.photoUrl}
                  onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden text-xs"
                />
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
