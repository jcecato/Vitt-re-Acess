import React, { useState } from 'react';

interface ContextualHelpButtonProps {
  title: string;
  whatItIs: string;
  yourAction: string;
  doctorTip: string;
}

export const ContextualHelpButton: React.FC<ContextualHelpButtonProps> = ({
  title,
  whatItIs,
  yourAction,
  doctorTip
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Ajuda e Orientações desta Tela"
        aria-label="Ajuda e Orientações desta Tela"
        className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#5eea8f] hover:text-[#0a0d14] text-[#5eea8f] border border-[#5eea8f]/40 flex items-center justify-center text-[15px] font-bold transition active:scale-90 cursor-pointer shrink-0 shadow-sm"
      >
        i
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none font-['Plus_Jakarta_Sans',sans-serif]"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="w-full max-w-[420px] bg-[#121524] border-[1px] border-white/50 rounded-[28px] p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-[#eef4f8] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#5eea8f]/20 border border-[#5eea8f] text-[#5eea8f] flex items-center justify-center text-[14px] font-black">
                  i
                </div>
                <h3 className="text-[17px] font-bold text-white leading-snug">
                  {title} — Regra dos 3 Pontos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl font-bold cursor-pointer transition"
              >
                ×
              </button>
            </div>

            {/* Ponto 1: O que é */}
            <div className="bg-white/[0.03] border border-white/15 rounded-2xl p-3.5 space-y-1">
              <div className="text-[13px] font-bold uppercase tracking-wider text-[#5eea8f] flex items-center gap-1.5">
                <i className="ti ti-circle-number-1 text-[16px]"></i>
                O que é esta tela:
              </div>
              <p className="text-[14px] text-[#cfd3dc] leading-relaxed pl-1">
                {whatItIs}
              </p>
            </div>

            {/* Ponto 2: Sua Ação */}
            <div className="bg-white/[0.03] border border-white/15 rounded-2xl p-3.5 space-y-1">
              <div className="text-[13px] font-bold uppercase tracking-wider text-[#ffd000] flex items-center gap-1.5">
                <i className="ti ti-circle-number-2 text-[16px]"></i>
                Sua Ação Recomendada:
              </div>
              <p className="text-[14px] text-[#cfd3dc] leading-relaxed pl-1">
                {yourAction}
              </p>
            </div>

            {/* Ponto 3: Dica de Ouro */}
            <div className="bg-[#1e2338] border border-[#5eea8f]/30 rounded-2xl p-3.5 space-y-1">
              <div className="text-[13px] font-bold uppercase tracking-wider text-[#5eea8f] flex items-center gap-1.5">
                <i className="ti ti-star-filled text-[16px]"></i>
                Dica de Ouro do Doutor:
              </div>
              <p className="text-[14px] text-white leading-relaxed pl-1 font-medium">
                {doctorTip}
              </p>
            </div>

            {/* Botão Entendi */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-3 px-4 rounded-xl bg-[#5eea8f] text-[#0a0d14] font-bold text-[15px] hover:bg-[#4cd97e] transition cursor-pointer shadow-md"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
