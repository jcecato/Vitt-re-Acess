import React from 'react';

interface TextDocumentModalProps {
  isOpen: boolean;
  title: string;
  category?: string;
  dateStr?: string;
  content?: string;
  patientName?: string;
  onClose: () => void;
}

export const TextDocumentModal: React.FC<TextDocumentModalProps> = ({
  isOpen,
  title,
  category = 'Orientação Oficial',
  dateStr = '27/09/2026',
  content,
  patientName = 'Maria Paula Santos',
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none font-['Plus_Jakarta_Sans',sans-serif]"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-full sm:max-w-[480px] h-[90dvh] sm:h-[620px] max-h-[95dvh] bg-[#121222] border-[1px] border-white/50 rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-bottom-6 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b border-white/10 pb-3.5 shrink-0">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5eea8f] animate-pulse"></span>
              <span className="text-[14px] uppercase tracking-wider font-semibold text-[#5eea8f]">
                {category}
              </span>
            </div>
            <h2 className="text-[20px] font-['Cormorant_Garamond',serif] font-medium text-white tracking-[0.02em] mt-1 leading-snug">
              {title}
            </h2>
            <div className="text-[14px] text-[#e0e0ed] mt-0.5">
              Paciente: <strong className="text-white">{patientName}</strong> · Data: {dateStr}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#e0e0ed] hover:text-white p-1 text-2xl cursor-pointer transition rounded-lg hover:bg-white/10"
            title="Fechar"
          >
            <i className="ti ti-x"></i>
          </button>
        </div>

        {/* Content body with pleasant readable typography */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar py-4 space-y-3.5 text-[#e8e8f0] text-[16px] leading-relaxed">
          {content ? (
            <div className="bg-white/[0.03] border-[1px] border-white/50 rounded-2xl p-4 text-[#d8d8e6] whitespace-pre-line leading-relaxed">
              {content}
            </div>
          ) : (
            <div className="bg-white/[0.03] border-[1px] border-white/50 rounded-2xl p-4 text-[#d8d8e6] space-y-3">
              <p>
                Este documento foi emitido e homologado pela equipe clínica do CRM Vittáre, contendo diretrizes padronizadas e termos de acompanhamento individual.
              </p>
              <p>
                Todas as orientações aqui descritas respeitam os critérios de individualidade biológica, objetivos clínicos e métricas de evolução periódicas registradas em prontuário.
              </p>
              <div className="p-3 bg-[#5eea8f]/10 border border-[#5eea8f]/20 rounded-xl text-[15px] text-[#5eea8f]">
                ✓ Registro ativo no sistema e disponível para consulta a qualquer momento.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 shrink-0 flex items-center justify-between gap-3">
          <span className="text-[13px] text-[#e0e0ed]">Visualização em tela máxima</span>
          <button
            onClick={onClose}
            className="h-[34px] min-h-[34px] max-h-[34px] px-5 rounded-xl bg-[#5eea8f]/15 hover:bg-[#5eea8f]/25 border border-[#5eea8f]/40 text-[#5eea8f] text-[15px] font-semibold flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
