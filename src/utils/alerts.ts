import Swal from 'sweetalert2';
import confetti from 'canvas-confetti';
import { AttendanceStatus, AttendanceType, Student } from '../types';

export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

export const showSuccessToast = (title: string) => {
  return Toast.fire({
    icon: 'success',
    title: title,
  });
};

export const showErrorToast = (title: string) => {
  return Toast.fire({
    icon: 'error',
    title: title,
  });
};

export const showWarningToast = (title: string) => {
  return Toast.fire({
    icon: 'warning',
    title: title,
  });
};

export const showInfoToast = (title: string) => {
  return Toast.fire({
    icon: 'info',
    title: title,
  });
};

export const showScanSuccessModal = (
  student: Student,
  timeString: string,
  status: AttendanceStatus,
  type: AttendanceType
) => {
  if (status === 'HADIR') {
    // Subtle confetti for on-time arrivals
    confetti({
      particleCount: 30,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#10B981', '#059669', '#34D399', '#FBBF24'],
    });
  }

  const isMasuk = type === 'masuk';
  const statusColor =
    status === 'HADIR'
      ? '#10B981'
      : status === 'TERLAMBAT'
      ? '#F59E0B'
      : '#3B82F6';

  const statusLabel =
    status === 'HADIR'
      ? 'TEPAT WAKTU'
      : status === 'TERLAMBAT'
      ? 'TERLAMBAT'
      : status;

  return Swal.fire({
    title: `<span style="font-size: 1.1rem; color: #047857; font-weight: 700; text-transform: uppercase;">Presensi ${isMasuk ? 'Masuk' : 'Pulang'} Berhasil!</span>`,
    html: `
      <div style="text-align: center; padding: 6px 0;">
        <div style="position: relative; display: inline-block; margin-bottom: 12px;">
          <img src="${student.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${student.nis}`}" 
               alt="${student.name}" 
               style="width: 84px; height: 84px; border-radius: 50%; object-fit: cover; border: 3px solid #10B981; margin: 0 auto; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);" />
          <div style="position: absolute; bottom: 0; right: 0; background: ${isMasuk ? '#10b981' : '#3b82f6'}; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; border: 2px solid white;">
            ${isMasuk ? '📥' : '📤'}
          </div>
        </div>
        
        <h3 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">${student.name}</h3>
        <p style="color: #64748b; font-size: 0.9rem; margin: 0 0 12px 0;">NIS: <strong style="color: #334155;">${student.nis}</strong> | Kelas: <strong style="color: #047857;">${student.className}</strong></p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 8px;">
          <div style="text-align: center;">
            <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Waktu Tap</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a; font-family: monospace;">${timeString} WIB</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Status</div>
            <div style="font-size: 0.9rem; font-weight: 800; color: ${statusColor}; background: ${statusColor}15; padding: 2px 8px; border-radius: 9999px; display: inline-block; margin-top: 2px;">
              ${statusLabel}
            </div>
          </div>
        </div>
        <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 6px;">
          RFID: <span style="font-family: monospace;">${student.rfidUid}</span>
        </div>
      </div>
    `,
    icon: 'success',
    iconColor: '#10B981',
    timer: 2600,
    timerProgressBar: true,
    showConfirmButton: true,
    confirmButtonText: 'Selesai',
    confirmButtonColor: '#059669',
    customClass: {
      popup: 'rounded-2xl shadow-2xl border border-emerald-100',
      confirmButton: 'rounded-xl px-5 py-2 font-medium',
    },
  });
};

export const showConfirmDialog = async (
  title: string,
  text: string,
  confirmButtonText = 'Ya, Lanjutkan',
  cancelButtonText = 'Batal'
): Promise<boolean> => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e11d48',
    cancelButtonColor: '#64748b',
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    customClass: {
      popup: 'rounded-2xl',
      confirmButton: 'rounded-xl px-5 py-2 font-semibold',
      cancelButton: 'rounded-xl px-5 py-2 font-semibold',
    },
  });
  return result.isConfirmed;
};

export const showSuccessAlert = (title: string, text: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonColor: '#059669',
    confirmButtonText: 'OK',
    customClass: {
      popup: 'rounded-2xl',
      confirmButton: 'rounded-xl px-6 py-2 font-medium',
    },
  });
};

export const showErrorAlert = (title: string, text: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonColor: '#e11d48',
    confirmButtonText: 'Tutup',
    customClass: {
      popup: 'rounded-2xl',
      confirmButton: 'rounded-xl px-6 py-2 font-medium',
    },
  });
};

export const showWarningAlert = (title: string, text: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'warning',
    confirmButtonColor: '#f59e0b',
    confirmButtonText: 'Mengerti',
    customClass: {
      popup: 'rounded-2xl',
      confirmButton: 'rounded-xl px-6 py-2 font-medium',
    },
  });
};
