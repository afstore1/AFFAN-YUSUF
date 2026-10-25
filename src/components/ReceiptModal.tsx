import React, { useState } from 'react';
import { Transaction } from '../types';
import { usePos } from '../context/PosContext';
import { formatRupiah, formatDateIndo, formatFullDateWithDay } from '../utils/format';
import { Printer, Check, Copy, X, ShoppingBag } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onNewTransaction?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  onClose,
  onNewTransaction,
}) => {
  const { settings } = usePos();
  const [copied, setCopied] = useState(false);

  // Trigger celebratory confetti once on open
  React.useEffect(() => {
    if (transaction) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    }
  }, [transaction]);

  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const generatePlainTextReceipt = () => {
    let text = `================================\n`;
    text += `       ${settings.storeName}\n`;
    text += `  ${settings.storeAddress}\n`;
    text += `  Telp: ${settings.storePhone}\n`;
    text += `================================\n`;
    text += `No. Nota : ${transaction.receiptNumber}\n`;
    text += `Waktu    : ${formatFullDateWithDay(transaction.date)}, ${new Date(transaction.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB\n`;
    text += `Kasir    : ${transaction.cashierName}\n`;
    text += `Pelanggan: ${transaction.customerName || 'Umum'}\n`;
    text += `--------------------------------\n`;
    transaction.items.forEach(item => {
      text += `${item.name}\n`;
      text += `  ${item.quantity} ${item.unit} x ${formatRupiah(item.price)} = ${formatRupiah(item.subtotal)}\n`;
    });
    text += `--------------------------------\n`;
    text += `Subtotal : ${formatRupiah(transaction.subtotal)}\n`;
    if (transaction.discount > 0) {
      text += `Diskon   : -${formatRupiah(transaction.discount)}\n`;
    }
    if (transaction.tax > 0) {
      text += `PPN      : ${formatRupiah(transaction.tax)}\n`;
    }
    text += `TOTAL    : ${formatRupiah(transaction.total)}\n`;
    text += `Metode   : ${transaction.paymentMethod.toUpperCase()}\n`;
    text += `Bayar    : ${formatRupiah(transaction.cashGiven)}\n`;
    text += `Kembali  : ${formatRupiah(transaction.change)}\n`;
    text += `================================\n`;
    text += `${settings.footerMessage}\n`;
    text += `================================\n`;
    return text;
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generatePlainTextReceipt());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-md my-8 flex flex-col items-center">
        
        {/* Action Header on screen */}
        <div className="w-full flex items-center justify-between mb-3 text-white px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-bold text-slate-200">Pembayaran Berhasil!</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Thermal Receipt Card */}
        <div
          id="receipt-printable"
          className="w-full bg-white text-slate-900 rounded-2xl shadow-2xl p-6 font-mono-receipt text-xs leading-relaxed relative border-t-8 border-emerald-500 overflow-hidden"
        >
          {/* Header Toko */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            {settings.storeLogoUrl ? (
              <img
                src={settings.storeLogoUrl}
                alt={settings.storeName}
                className="w-12 h-12 mx-auto mb-1.5 object-contain"
              />
            ) : (
              <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
            )}
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900 uppercase tracking-tight">
              {settings.storeName}
            </h2>
            <p className="text-[11px] text-slate-600 mt-0.5">{settings.storeAddress}</p>
            <p className="text-[11px] text-slate-600">Telp: {settings.storePhone}</p>
          </div>

          {/* Meta Information */}
          <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">No. Nota:</span>
              <span className="font-bold text-slate-800">{transaction.receiptNumber}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-500">Waktu:</span>
              <span className="text-slate-800 font-semibold text-right">
                {formatFullDateWithDay(transaction.date)}
                <span className="block text-[10px] text-slate-500 font-normal">
                  Pukul {new Date(transaction.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                </span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kasir:</span>
              <span className="text-slate-800">{transaction.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pelanggan:</span>
              <span className="text-slate-800">{transaction.customerName || 'Umum'}</span>
            </div>
          </div>

          {/* Itemized List */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-2">
            {transaction.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="font-bold text-slate-900 text-xs">{item.name}</div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>
                    {item.quantity} {item.unit} x {formatRupiah(item.price)}
                  </span>
                  <span className="font-bold text-slate-900">{formatRupiah(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Calculations */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatRupiah(transaction.subtotal)}</span>
            </div>
            {transaction.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Diskon</span>
                <span>-{formatRupiah(transaction.discount)}</span>
              </div>
            )}
            {transaction.tax > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>PPN</span>
                <span>{formatRupiah(transaction.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm sm:text-base font-extrabold text-slate-900 pt-1 border-t border-slate-200">
              <span>TOTAL</span>
              <span>{formatRupiah(transaction.total)}</span>
            </div>
          </div>

          {/* Payment & Change */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Metode Pembayaran:</span>
              <span className="font-bold uppercase text-slate-900">
                {transaction.paymentMethod === 'cash' ? 'TUNAI' : transaction.paymentMethod.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Uang Diterima:</span>
              <span>{formatRupiah(transaction.cashGiven)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 text-xs">
              <span>Kembalian:</span>
              <span className="text-emerald-700 font-extrabold">{formatRupiah(transaction.change)}</span>
            </div>
          </div>

          {/* Footer Thank You & Barcode */}
          <div className="text-center pt-3 text-[11px] text-slate-600 space-y-2">
            <p className="whitespace-pre-line leading-tight">{settings.footerMessage}</p>
            {/* Mock Visual Barcode */}
            <div className="pt-2">
              <div className="flex justify-center items-center gap-[2px] h-8 opacity-75">
                {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 2, 4, 1, 2].map((w, i) => (
                  <div
                    key={i}
                    style={{ width: `${w}px` }}
                    className="h-full bg-slate-900"
                  />
                ))}
              </div>
              <p className="text-[10px] text-slate-500 tracking-widest mt-1">*{transaction.receiptNumber}*</p>
            </div>
          </div>
        </div>

        {/* Buttons Action Bar */}
        <div className="w-full grid grid-cols-2 gap-2 mt-4">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk (Print)</span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm border border-slate-700 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Teks Struk</span>
              </>
            )}
          </button>
        </div>

        {/* New Transaction Button */}
        <button
          type="button"
          onClick={() => {
            onClose();
            if (onNewTransaction) onNewTransaction();
          }}
          className="w-full mt-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 text-center transition cursor-pointer"
        >
          Selesai & Transaksi Baru
        </button>

      </div>
    </div>
  );
};
