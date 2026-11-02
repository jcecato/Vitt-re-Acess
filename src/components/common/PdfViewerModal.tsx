import React from 'react';

interface PdfViewerModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  patientName?: string;
  dateStr?: string;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  title,
  onClose,
  patientName = 'Maria Paula Santos',
  dateStr = '29/10/2026'
}) => {
  if (!isOpen) return null;

  const fileName = title.toLowerCase().replace(/[^a-z0-9ãáâéêíóôúç]+/g, '-') + '.pdf';

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([`Documento Oficial Vittáre CRM\nPaciente: ${patientName}\nTítulo: ${title}\nData: ${dateStr}`], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 font-['Plus_Jakarta_Sans',sans-serif]">
      <div 
        className="w-full max-w-full sm:max-w-[420px] bg-[#14142a] border-t sm:border border-white/20 rounded-t-[28px] sm:rounded-[28px] p-5 shadow-2xl animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5eea8f]"></span>
            <span className="text-[18px] font-['Cormorant_Garamond',serif] font-medium tracking-[0.03em] text-white truncate max-w-[260px]">{title}</span>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-[#5eea8f] p-1 text-2xl cursor-pointer transition"
          >
            <i className="ti ti-x"></i>
          </button>
        </div>

        <div className="bg-white rounded-md w-[210px] h-[270px] mx-auto pt-3 px-3.5 shadow-xl relative overflow-hidden text-neutral-800">
          <div className="flex items-center justify-between border-b pb-1 mb-2">
            <span className="text-[9px] font-bold tracking-wider text-[#5b4bd6]">CLÍNICA VITTÁRE</span>
            <span className="text-[8px] text-neutral-400">{dateStr}</span>
          </div>
          <div className="text-[9px] font-semibold text-neutral-900 mb-1 truncate">{title}</div>
          <div className="text-[8px] text-neutral-500 mb-2 truncate">Paciente: {patientName}</div>

          <div className="h-2 bg-[#9aa3b5] rounded w-[70%] mb-2"></div>
          <div className="h-1.5 bg-[#cfd3dc] rounded mb-1.5"></div>
          <div className="h-1.5 bg-[#cfd3dc] rounded mb-1.5"></div>
          <div className="h-1.5 bg-[#cfd3dc] rounded w-[55%] mb-2"></div>

          <div className="h-1.5 bg-[#cfd3dc] rounded mb-1.5"></div>
          <div className="h-1.5 bg-[#cfd3dc] rounded mb-1.5"></div>
          <div className="h-1.5 bg-[#cfd3dc] rounded mb-1.5"></div>
          <div className="h-1.5 bg-[#cfd3dc] rounded w-[60%] mb-2"></div>

          <div className="h-1.5 bg-[#cfd3dc] rounded mb-1.5"></div>
          <div className="h-1.5 bg-[#cfd3dc] rounded w-[45%]"></div>

          <div className="absolute bottom-2 right-3 text-right">
            <div className="w-14 h-[1px] bg-neutral-400 ml-auto mb-0.5"></div>
            <span className="text-[7px] text-neutral-400">Assinatura Digital</span>
          </div>
        </div>

        <div className="text-center text-[16px] text-[#8e8ea6] mt-3 font-mono">
          {fileName}
        </div>

        <div className="flex justify-center gap-3 mt-3">
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 text-[16px] font-semibold px-4 py-2 rounded-xl bg-[#5eea8f]/15 border border-[#5eea8f] text-[#5eea8f] hover:bg-[#5eea8f]/25 active:scale-95 transition cursor-pointer"
          >
            <i className="ti ti-download text-[18px]"></i> Baixar
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 text-[16px] font-semibold px-4 py-2 rounded-xl bg-[#0f7a3a] border border-[#0f7a3a] text-white hover:bg-[#128a42] active:scale-95 transition cursor-pointer"
          >
            <i className="ti ti-printer text-[18px]"></i> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};
