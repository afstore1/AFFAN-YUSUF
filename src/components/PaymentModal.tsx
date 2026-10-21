import React, { useState } from 'react';
import { usePos } from '../context/PosContext';
import { formatRupiah } from '../utils/format';
import { Transaction } from '../types';
import { 
  Banknote, 
  QrCode, 
  CreditCard, 
  X, 
  CheckCircle2, 
  AlertCircle,
  User,
  Tag
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transaction: Transaction) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { cart, settings, completeTransaction } = usePos();

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'debit' | 'transfer'>('cash');
  const [customerName, setCustomerName] = useState('Pelanggan Umum');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const rawSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discount = Math.min(rawSubtotal, Math.max(0, discountAmount));
  const taxableAmount = Math.max(0, rawSubtotal - discount);
  const tax = settings.enableTax ? Math.round(taxableAmount * (settings.taxRatePercent / 100)) : 0;
  const grandTotal = taxableAmount + tax;

  // Auto initialize cashGiven with grandTotal if 0
  const activeCashGiven = paymentMethod === 'cash' ? cashGiven : grandTotal;
  const change = Math.max(0, activeCashGiven - grandTotal);
  const isCashInsufficient = paymentMethod === 'cash' && activeCashGiven < grandTotal;

  // Quick cash bill recommendations based on grandTotal
  const quickBills = [
    grandTotal, // Uang Pas
    Math.ceil(grandTotal / 10000) * 10000,
    Math.ceil(grandTotal / 20000) * 20000,
    Math.ceil(grandTotal / 50000) * 50000,
    Math.ceil(grandTotal / 100000) * 100000,
    100000,
    200000,
  ].filter((v, i, a) => v >= grandTotal && a.indexOf(v) === i).slice(0, 5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isCashInsufficient) {
      setErrorMsg(`Uang tunai kurang sebesar ${formatRupiah(grandTotal - activeCashGiven)}`);
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const result = completeTransaction({
        paymentMethod,
        cashGiven: activeCashGiven,
        discountAmount: discount,
        customerName,
      });

      setIsProcessing(false);

      if (result.success && result.transaction) {
        onSuccess(result.transaction);
        onClose();
      } else {
        setErrorMsg(result.error || 'Terjadi kesalahan saat memproses transaksi.');
      }
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl my-6 text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-extrabold text-white">Pembayaran Kasir</h2>
            <p className="text-xs text-slate-400">Selesaikan transaksi dan terbitkan struk</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Total display card */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Tagihan
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 mt-0.5 tracking-tight">
              {formatRupiah(grandTotal)}
            </div>
            <div className="flex justify-center items-center gap-4 text-xs text-slate-400 mt-2">
              <span>Subtotal: {formatRupiah(rawSubtotal)}</span>
              {discount > 0 && <span className="text-emerald-400">Diskon: -{formatRupiah(discount)}</span>}
              {tax > 0 && <span>PPN: {formatRupiah(tax)}</span>}
            </div>
          </div>

          {/* Customer & Discount Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nama Pelanggan
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Pelanggan Umum"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Potongan Diskon (Rp)
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="0"
                  max={rawSubtotal}
                  value={discountAmount || ''}
                  onChange={e => setDiscountAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Pilih Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Banknote className="w-5 h-5 mb-1" />
                <span>Tunai (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('qris')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  paymentMethod === 'qris'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <QrCode className="w-5 h-5 mb-1" />
                <span>QRIS Instan</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('debit')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  paymentMethod === 'debit'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1" />
                <span>Debit / Transfer</span>
              </button>
            </div>
          </div>

          {/* Method Details */}
          {paymentMethod === 'cash' && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nominal Uang Tunai Diterima (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={cashGiven || ''}
                    onChange={e => setCashGiven(Number(e.target.value) || 0)}
                    placeholder="Contoh: 50000"
                    className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-base font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Pilihan Cepat Nominal:</span>
                <div className="flex flex-wrap gap-1.5">
                  {quickBills.map((amount, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCashGiven(amount)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
                        cashGiven === amount
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      {amount === grandTotal ? 'Uang Pas' : formatRupiah(amount)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kembalian Status Indicator */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs sm:text-sm font-bold ${
                  isCashInsufficient
                    ? 'bg-rose-950/50 border-rose-800/80 text-rose-300'
                    : 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300'
                }`}
              >
                <span>{isCashInsufficient ? 'Kurang Pembayaran:' : 'Kembalian:'}</span>
                <span className="text-base font-extrabold">
                  {isCashInsufficient
                    ? formatRupiah(grandTotal - activeCashGiven)
                    : formatRupiah(change)}
                </span>
              </div>
            </div>
          )}

          {paymentMethod === 'qris' && (
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl text-center flex flex-col items-center">
              <div className="w-40 h-40 bg-white p-2.5 rounded-xl flex items-center justify-center shadow-lg relative">
                {/* Visual QR Code Pattern */}
                <div className="w-full h-full border-4 border-slate-950 rounded p-1 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-7 h-7 bg-slate-950 border-2 border-white rounded-sm" />
                    <div className="w-7 h-7 bg-slate-950 border-2 border-white rounded-sm" />
                  </div>
                  <div className="text-[10px] font-extrabold tracking-widest text-slate-900 uppercase">
                    QRIS RESMI
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="w-7 h-7 bg-slate-950 border-2 border-white rounded-sm" />
                    <div className="text-[9px] font-mono font-bold text-slate-600">NMID: ID2026POS</div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-300 font-semibold mt-3">
                Scan QRIS dengan GoPay, OVO, Dana, BCA, atau Livin'
              </p>
              <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                Nominal Pas: {formatRupiah(grandTotal)}
              </p>
            </div>
          )}

          {paymentMethod === 'debit' && (
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs space-y-2 text-slate-300">
              <p className="font-semibold text-white">Instruksi Mesin EDC / Transfer Bank:</p>
              <p className="text-slate-400">
                1. Masukkan kartu debit/kredit pelanggan pada mesin EDC atau minta bukti transfer.
              </p>
              <p className="text-slate-400">
                2. Pastikan nominal pembayaran sesuai yaitu <strong className="text-emerald-400">{formatRupiah(grandTotal)}</strong>.
              </p>
              <p className="text-slate-400">
                3. Klik tombol konfirmasi di bawah setelah transaksi di EDC berhasil.
              </p>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={isProcessing || isCashInsufficient}
            className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-xl cursor-pointer transition ${
              isCashInsufficient
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
            }`}
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Konfirmasi & Terbitkan Struk</span>
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
};
