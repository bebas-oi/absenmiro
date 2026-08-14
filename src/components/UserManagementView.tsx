import React, { useState } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  Plus,
  Search,
  KeyRound,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
  Lock,
  User,
  Phone,
  Mail,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppUser, UserRole } from '../types';
import { UserAccount } from '../data/initialData';
import { showConfirmDialog, showSuccessToast, showWarningToast } from '../utils/alerts';

export const UserManagementView: React.FC = () => {
  const {
    users,
    classes,
    addUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    toggleUserStatus,
    currentUser,
  } = useApp();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'AKTIF' | 'NONAKTIF'>('all');

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'GURU' as UserRole,
    assignedClass: classes[0]?.name || 'Kelas 1A',
    email: '',
    phone: '',
    status: 'AKTIF' as 'AKTIF' | 'NONAKTIF',
  });

  // Reset Password Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState('guru123');
  const [isCopied, setIsCopied] = useState(false);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      name: '',
      role: 'GURU',
      assignedClass: classes[0]?.name || 'Kelas 1A',
      email: '',
      phone: '',
      status: 'AKTIF',
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (u: UserAccount) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      password: u.password || '',
      name: u.name,
      role: u.role,
      assignedClass: u.assignedClass || classes[0]?.name || 'Kelas 1A',
      email: u.email || '',
      phone: u.phone || '',
      status: u.status,
    });
    setIsFormModalOpen(true);
  };

  const handleOpenReset = (u: UserAccount) => {
    setResetTargetUser(u);
    setNewPassword(u.role === 'ADMIN' ? 'admin123' : 'guru123');
    setIsCopied(false);
    setIsResetModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.name.trim()) {
      showWarningToast('Username dan Nama Lengkap wajib diisi!');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      showWarningToast('Password wajib diisi untuk akun baru!');
      return;
    }

    if (editingUser) {
      updateUser({
        ...editingUser,
        username: formData.username.trim().toLowerCase(),
        name: formData.name.trim(),
        role: formData.role,
        assignedClass: formData.role === 'GURU' ? formData.assignedClass : undefined,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        status: formData.status,
        password: formData.password ? formData.password.trim() : editingUser.password,
      });
    } else {
      addUser({
        id: `usr-${Date.now()}`,
        username: formData.username.trim().toLowerCase(),
        password: formData.password.trim(),
        name: formData.name.trim(),
        role: formData.role,
        assignedClass: formData.role === 'GURU' ? formData.assignedClass : undefined,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        status: formData.status,
      });
    }

    setIsFormModalOpen(false);
  };

  const handleExecuteResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !newPassword.trim()) {
      showWarningToast('Password baru tidak boleh kosong.');
      return;
    }

    resetUserPassword(resetTargetUser.id, newPassword.trim());
    setIsResetModalOpen(false);
    setResetTargetUser(null);
  };

  const handleCopyPassword = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    showSuccessToast('Password disalin ke clipboard.');
  };

  const handleDeleteUser = async (u: UserAccount) => {
    if (u.id === currentUser?.id) {
      showWarningToast('Anda tidak dapat menghapus akun yang sedang Anda gunakan saat ini!');
      return;
    }

    const confirmed = await showConfirmDialog(
      'Hapus Akun Pengguna?',
      `Apakah Anda yakin ingin menghapus akun ${u.name} (@${u.username})? Tindakan ini tidak dapat dibatalkan.`
    );
    if (confirmed) {
      deleteUser(u.id);
    }
  };

  // Filtered User list
  const filteredUsers = users.filter((u) => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.assignedClass && u.assignedClass.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q));
    return matchRole && matchStatus && matchSearch;
  });

  const totalAdmin = users.filter((u) => u.role === 'ADMIN').length;
  const totalGuru = users.filter((u) => u.role === 'GURU').length;
  const totalAktif = users.filter((u) => u.status === 'AKTIF').length;

  return (
    <div className="space-y-6 w-full font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Banner Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
            <span>Kontrol Akses & Hak Akses Pengguna</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-1">
            Pengaturan User & Akun Login Guru
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Kelola data autentikasi login administrator dan guru wali kelas (RBAC)
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-700/20 flex items-center space-x-2 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ TAMBAH AKUN PENGGUNA</span>
        </button>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Akun</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{users.length}</div>
          <div className="text-[11px] text-slate-500 font-bold mt-0.5">Terdaftar di sistem</div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-emerald-200 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Super Admin</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{totalAdmin}</div>
          <div className="text-[11px] text-emerald-600 font-bold mt-0.5">Hak akses penuh</div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-blue-200 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Wali Kelas / Guru</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{totalGuru}</div>
          <div className="text-[11px] text-blue-600 font-bold mt-0.5">Akses terbatas kelas</div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Status Aktif</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalAktif}</div>
          <div className="text-[11px] text-emerald-600 font-bold mt-0.5">Dapat login presensi</div>
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
              placeholder="Cari Username, Nama, Kelas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-emerald-600"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600 cursor-pointer"
          >
            <option value="all">Semua Peran ({users.length})</option>
            <option value="ADMIN">Administrator</option>
            <option value="GURU">Guru / Wali Kelas</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600 cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="AKTIF">Status AKTIF</option>
            <option value="NONAKTIF">Status NONAKTIF</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Pengguna & Username</th>
                <th className="py-3.5 px-4">Peran (Role)</th>
                <th className="py-3.5 px-4">Hak Akses Rombel</th>
                <th className="py-3.5 px-4">Kontak (Email / HP)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <User className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p className="text-sm font-semibold text-slate-600">Tidak ada data pengguna ditemukan.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const isCurrent = u.id === currentUser?.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Name & Username */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 ${
                              u.role === 'ADMIN'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {u.role === 'ADMIN' ? (
                              <ShieldCheck className="w-4 h-4" />
                            ) : (
                              <GraduationCap className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 uppercase">
                              {u.name} {isCurrent && <span className="text-[10px] text-emerald-600 font-bold lowercase">(anda)</span>}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 font-bold">
                              @{u.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            u.role === 'ADMIN'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-blue-100 text-blue-900 border border-blue-300'
                          }`}
                        >
                          {u.role === 'ADMIN' ? 'SUPER ADMIN' : 'GURU WALI KELAS'}
                        </span>
                      </td>

                      {/* Assigned Class */}
                      <td className="py-3.5 px-4">
                        {u.role === 'GURU' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-black uppercase text-[11px]">
                            {u.assignedClass || '-'}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-bold">Semua Kelas (Full)</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-[11px]">
                        <div className="text-slate-700 font-semibold">{u.email || '-'}</div>
                        <div className="text-slate-400 font-mono">{u.phone || '-'}</div>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => toggleUserStatus(u.id)}
                          className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            u.status === 'AKTIF'
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                              : 'bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300'
                          }`}
                          title="Klik untuk mengubah status aktif/nonaktif"
                        >
                          {u.status === 'AKTIF' ? '● AKTIF' : '○ NONAKTIF'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleOpenReset(u)}
                            className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 hover:text-amber-800 transition-colors cursor-pointer"
                            title="Reset Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                              title="Hapus User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit User */}
      {isFormModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFormModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-br from-emerald-700 to-slate-900 p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">
                  Formulir Pengguna
                </span>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  {editingUser ? 'Edit Akun Pengguna' : 'Tambah Pengguna Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 text-xs font-bold text-slate-700">
              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="block uppercase tracking-wider">
                  1. Peran Akun (Role) <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'ADMIN' })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      formData.role === 'ADMIN'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-black shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs uppercase">Administrator</span>
                    </div>
                    <p className="text-[10px] font-normal text-slate-500 mt-1">Akses penuh semua fitur</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'GURU' })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      formData.role === 'GURU'
                        ? 'bg-blue-50 border-blue-500 text-blue-950 font-black shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      <span className="text-xs uppercase">Wali Kelas</span>
                    </div>
                    <p className="text-[10px] font-normal text-slate-500 mt-1">Akses terbatas data kelasnya</p>
                  </button>
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1">
                <label className="block uppercase tracking-wider">
                  2. Username Login <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: siti.fatimah atau ustadz.anam"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              {/* Password (for new user or optional update) */}
              <div className="space-y-1">
                <label className="block uppercase tracking-wider">
                  3. Password {editingUser ? '(Kosongkan jika tidak ingin mengubah)' : '*'}
                </label>
                <input
                  type="text"
                  required={!editingUser}
                  placeholder={editingUser ? '••••••••' : 'Masukkan password login'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600 font-mono"
                />
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="block uppercase tracking-wider">
                  4. Nama Lengkap & Gelar <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ustadzah Siti Fatimah, S.Pd.I"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              {/* Assigned Class (if GURU) */}
              {formData.role === 'GURU' && (
                <div className="space-y-1">
                  <label className="block uppercase tracking-wider">
                    5. Rombongan Belajar (Wali Kelas) <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formData.assignedClass}
                    onChange={(e) => setFormData({ ...formData, assignedClass: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600 cursor-pointer"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block uppercase tracking-wider">Email (Opsional)</label>
                  <input
                    type="email"
                    placeholder="nama@mirowosari.sch.id"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block uppercase tracking-wider">No HP / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="block uppercase tracking-wider">Status Akun</label>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === 'AKTIF'}
                      onChange={() => setFormData({ ...formData, status: 'AKTIF' })}
                    />
                    <span className="text-emerald-700 font-bold">AKTIF (Dapat Login)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === 'NONAKTIF'}
                      onChange={() => setFormData({ ...formData, status: 'NONAKTIF' })}
                    />
                    <span className="text-rose-700 font-bold">NONAKTIF (Diblokir)</span>
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-black uppercase tracking-wider text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-700/20 active:scale-98 transition-all cursor-pointer"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {isResetModalOpen && resetTargetUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsResetModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900 uppercase">Reset Password Pengguna</h3>
              <p className="text-xs text-slate-500 mt-1">
                Atur ulang kata sandi untuk akun <strong>{resetTargetUser.name}</strong> (@{resetTargetUser.username})
              </p>
            </div>

            <form onSubmit={handleExecuteResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-hidden pr-24"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="absolute right-2 top-1.5 px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-black uppercase flex items-center space-x-1 cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setNewPassword('guru123')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer"
                >
                  Set: guru123
                </button>
                <button
                  type="button"
                  onClick={() => setNewPassword('admin123')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer"
                >
                  Set: admin123
                </button>
                <button
                  type="button"
                  onClick={() => setNewPassword(Math.random().toString(36).slice(-8))}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer"
                >
                  Acak Password
                </button>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-amber-700/20 active:scale-98 cursor-pointer"
                >
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
