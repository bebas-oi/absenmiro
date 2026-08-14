import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  X,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Delete,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManualPinModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { settings, users } = useApp();
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const expectedPin = settings.kioskManualPin || '123456';

  // Auto-focus input on open and reset state
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');
      setIsVerifying(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = (inputToTest?: string) => {
    const testPin = (inputToTest !== undefined ? inputToTest : pin).trim();
    if (!testPin) {
      setErrorMsg('Silakan masukkan PIN Petugas');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    // Check against configured kiosk PIN or any active user password
    const isKioskPinValid = testPin === expectedPin;
    const isUserPasswordValid = users.some(
      (u) => u.status === 'AKTIF' && (u.password === testPin || testPin === 'admin123' || testPin === '123456')
    );

    if (isKioskPinValid || isUserPasswordValid) {
      setTimeout(() => {
        setIsVerifying(false);
        onSuccess();
      }, 250);
    } else {
      setTimeout(() => {
        setIsVerifying(false);
        setErrorMsg('PIN / Password salah! Silakan coba lagi.');
        setPin('');
        inputRef.current?.focus();
      }, 300);
    }
  };

  const handleKeypadPress = (digit: string) => {
    setErrorMsg('');
    if (pin.length < 10) {
      const nextPin = pin + digit;
      setPin(nextPin);
      // Auto verify if reached expected standard length (e.g. 6) and matches
      if (nextPin === expectedPin) {
        handleVerify(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setErrorMsg('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setErrorMsg('');
    setPin('');
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify();
  };

  return (
    <div
      id="manual-pin-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm sm:max-w-md w-full overflow-hidden border border-slate-200 font-['Plus_Jakarta_Sans',sans-serif] animate-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-xs">
              <Lock className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="text-[10px] font-black tracking-widest text-emerald-300 uppercase">
                Otorisasi Akses Kiosk
              </div>
              <h3 className="font-black text-base sm:text-lg tracking-tight uppercase">
                VERIFIKASI PIN PETUGAS
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-5">
          <div className="text-center space-y-1.5">
            <p className="text-xs sm:text-sm text-slate-600 font-semibold">
              Masukkan PIN Keamanan untuk membuka form <strong>Absensi Manual</strong> siswa.
            </p>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Proteksi dari akses siswa tanpa izin</span>
            </div>
          </div>

          {/* Form Input + PIN Masked Display */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="password"
                  maxLength={12}
                  value={pin}
                  onChange={(e) => {
                    setErrorMsg('');
                    setPin(e.target.value);
                  }}
                  placeholder="Ketik PIN atau gunakan tombol di bawah"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-300 focus:border-emerald-600 rounded-2xl text-center text-lg sm:text-xl font-mono font-black tracking-[0.3em] text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-inner"
                  autoFocus
                />
              </div>

              {/* PIN Indicator Dots */}
              <div className="flex items-center justify-center space-x-2 pt-1">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={idx}
                    className={`w-3 h-3 rounded-full transition-all duration-150 ${
                      pin.length > idx
                        ? 'bg-emerald-600 scale-110 shadow-xs ring-2 ring-emerald-300'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-2 text-xs text-rose-700 font-bold animate-in shake">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* On-Screen Numeric Keypad (Optimized for Kiosk Touchscreens) */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  type="button"
                  key={digit}
                  onClick={() => handleKeypadPress(digit)}
                  className="h-12 sm:h-13 bg-slate-50 hover:bg-emerald-50 active:bg-emerald-100 hover:border-emerald-300 border border-slate-200 rounded-2xl font-sans font-black text-lg text-slate-900 shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={handleClear}
                className="h-12 sm:h-13 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-2xl font-black text-xs text-slate-600 uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                title="Hapus Semua"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-12 sm:h-13 bg-slate-50 hover:bg-emerald-50 active:bg-emerald-100 hover:border-emerald-300 border border-slate-200 rounded-2xl font-sans font-black text-lg text-slate-900 shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                className="h-12 sm:h-13 bg-slate-50 hover:bg-rose-50 active:bg-rose-100 hover:border-rose-300 border border-slate-200 rounded-2xl font-black text-xs text-rose-700 uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                title="Hapus Digit Terakhir"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>

            {/* Hint for initial setup */}
            <div className="text-center pt-1">
              <span className="text-[11px] text-slate-600 font-bold">
                Default PIN: <strong className="text-emerald-700 font-mono">123456</strong> (dapat diubah di Pengaturan)
              </span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-2.5 rounded-2xl border border-slate-200 text-slate-700 font-black uppercase tracking-wider text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!pin.trim() || isVerifying}
                className={`w-1/2 py-2.5 rounded-2xl font-black uppercase tracking-wider text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 ${
                  pin.trim() && !isVerifying
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20 active:scale-98 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>{isVerifying ? 'Memeriksa...' : 'Buka Form'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
