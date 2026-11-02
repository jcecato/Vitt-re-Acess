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

  const currentMonth = new Date().toISOString().slice(0, 7); // Ex: '2026-11'
  const quotaStorageKey = `vittare_pdf_quota_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${currentMonth}`;
  const maxDownloadsPerMonth = 3;

  const [downloadCount, setDownloadCount] = React.useState<number>(() => {
    try {
      const stored = localStorage.getItem(quotaStorageKey);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [downloadSuccess, setDownloadSuccess] = React.useState<boolean>(false);
  const remainingDownloads = Math.max(0, maxDownloadsPerMonth - downloadCount);
  const isLimitReached = downloadCount >= maxDownloadsPerMonth;

  const fileName = title.toLowerCase().replace(/[^a-z0-9ãáâéêíóôúç]+/g, '-') + '.pdf';

  const handleDownload = () => {
    if (isLimitReached) return;

    const newCount = downloadCount + 1;
    setDownloadCount(newCount);
    try {
      localStorage.setItem(quotaStorageKey, newCount.toString());
    } catch (e) {
      console.warn('Erro ao salvar cota local', e);
    }

    const element = document.createElement('a');
    const file = new Blob([`Documento Oficial Clínico Vittáre\nPaciente: ${patientName}\nTítulo: ${title}\nData: ${dateStr}\nChave de Integridade: VT-${Date.now().toString(36).toUpperCase()}`], { type: 'application/pdf' });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
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

        <div className="text-center text-[15px] text-[#8e8ea6] mt-2.5 font-mono truncate px-2">
          {fileName}
        </div>

        {/* Indicador de Cota Mensal de Downloads */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-0.5 rounded-full border ${
            isLimitReached 
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' 
              : 'bg-[#5eea8f]/10 border-[#5eea8f]/30 text-[#5eea8f]'
          }`}>
            <i className={`ti ${isLimitReached ? 'ti-alert-circle' : 'ti-shield-check'}`}></i>
            <span>{isLimitReached ? 'Limite mensal atingido (3/3)' : `Downloads restantes este mês: ${remainingDownloads} de 3`}</span>
          </span>
        </div>

        {/* Ação Única e Destacada: Baixar PDF (Imprimir removido) */}
        <div className="flex flex-col items-center gap-2 mt-3.5">
          {isLimitReached ? (
            <div className="w-full text-center p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[14px] text-[#a5a4b8]">
              Você atingiu o limite de 3 downloads mensais para este documento. Entre em contato com a equipe Vittáre para liberação adicional.
            </div>
          ) : (
            <button
              onClick={handleDownload}
              className="w-full sm:w-auto min-w-[220px] inline-flex items-center justify-center gap-2 text-[16px] font-semibold px-6 py-2.5 rounded-xl bg-[#0f7a3a] border border-[#5eea8f]/50 text-white hover:bg-[#128a42] active:scale-95 shadow-lg shadow-[#0f7a3a]/25 transition cursor-pointer"
            >
              <i className="ti ti-download text-[19px]"></i>
              <span>{downloadSuccess ? 'Download Concluído!' : 'Baixar PDF'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
