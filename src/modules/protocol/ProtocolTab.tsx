import React, { useState } from 'react';
import { PatientProfile, ProtocolItem } from '../../types/patient';

interface ProtocolTabProps {
  patient: PatientProfile;
  onOpenPdf: (title: string) => void;
}

export const ProtocolTab: React.FC<ProtocolTabProps> = ({
  patient,
  onOpenPdf
}) => {
  const [selectedRecipe, setSelectedRecipe] = useState<ProtocolItem | null>(null);

  // Ordenação de cima para baixo: NOVO -> ATUALIZADO -> DESCONTINUADO
  const orderRank: Record<string, number> = {
    novo: 1,
    atualizado: 2,
    descontinuado: 3
  };

  const sortedProtocols = [...(patient.protocols || [])].sort((a, b) => {
    const rankA = orderRank[a.badge.toLowerCase()] || 99;
    const rankB = orderRank[b.badge.toLowerCase()] || 99;
    return rankA - rankB;
  });

  // Helper para validar se a data de validade individual da prescrição/receita já expirou
  const isExpired = (expirationStr: string): boolean => {
    const match = expirationStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) return false;
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const expDate = new Date(year, month, day, 23, 59, 59);
    return expDate < new Date();
  };

  const renderBadge = (badge: string) => {
    const norm = badge.toLowerCase();
    if (norm === 'novo') {
      return (
        <span className="text-[13px] font-semibold text-white px-2.5 py-0.5 rounded-lg bg-[#0f7a3a] shrink-0 uppercase tracking-wider">
          NOVO
        </span>
      );
    }
    if (norm === 'atualizado') {
      return (
        <span className="text-[13px] font-semibold text-white px-2.5 py-0.5 rounded-lg bg-[#a35a07] shrink-0 uppercase tracking-wider">
          ATUALIZADO
        </span>
      );
    }
    return (
      <span className="text-[13px] font-semibold text-white px-2.5 py-0.5 rounded-lg bg-[#3d3d52] shrink-0 uppercase tracking-wider">
        DESCONTINUADO
      </span>
    );
  };

  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      <div>
        <div>
          <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
            Minhas Fórmulas
          </div>
          <div className="text-[17px] font-semibold text-white mt-0.5 mb-3">
            Suplementação e Receitas
          </div>
        </div>

        <div className="space-y-4">
          {sortedProtocols.map((prot, index) => {
            const hasExpired = isExpired(prot.expirationStr) || prot.badge.toLowerCase() === 'descontinuado';
            const displayTitle = `RECEITA ${String(index + 1).padStart(2, '0')}`;
            const dateStrClean = prot.expirationStr.replace('Validade: ', '').replace('Data: ', '');

            return (
              <div
                key={prot.id}
                className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3.5 shadow-sm"
              >
                {/* Linha superior: Ícone de Jarra de Laboratório + Título + Status */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#5eea8f]/15 text-[#5eea8f] flex items-center justify-center text-[22px] shrink-0">
                    <i className="ti ti-flask"></i>
                  </div>
                  <div className="grow min-w-0">
                    <div className="text-[18px] font-semibold text-white leading-tight uppercase">
                      {displayTitle}
                    </div>
                    <div className="text-[18px] text-[#e0e0ed] mt-0.5 leading-snug">
                      Data: {dateStrClean}
                    </div>
                  </div>

                  {renderBadge(prot.badge)}
                </div>

                {/* Ações: PDF com cadeado 50% maior quando vencido + Visualizar */}
                <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-white/[0.05]">
                  {hasExpired ? (
                    <div className="relative inline-block" title="Download em PDF bloqueado: validade da receita expirada">
                      <button
                        disabled
                        className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-[#e0e0ed] opacity-60 cursor-not-allowed"
                      >
                        <i className="ti ti-file-type-pdf text-[17px]"></i>
                        <span>PDF</span>
                      </button>
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#24141d] border border-[#ff5f5f] flex items-center justify-center text-[14px] text-[#ff5f5f] shadow-md">
                        <i className="ti ti-lock"></i>
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onOpenPdf(displayTitle)}
                      className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3 rounded-xl bg-[#5eea8f]/10 border border-[#5eea8f]/35 text-[#5eea8f] hover:bg-[#5eea8f]/20 active:scale-95 transition cursor-pointer"
                    >
                      <i className="ti ti-file-type-pdf text-[17px]"></i>
                      <span>PDF</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedRecipe({ ...prot, title: displayTitle })}
                    className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3 rounded-xl bg-[#0f7a3a] border border-[#0f7a3a] text-white hover:bg-[#128d43] active:scale-95 transition cursor-pointer"
                  >
                    <i className="ti ti-eye text-[17px]"></i>
                    <span>Visualizar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de visualização na tela da Receita */}
      {selectedRecipe && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none font-['Plus_Jakarta_Sans',sans-serif]"
          onClick={() => setSelectedRecipe(null)}
        >
          <div 
            className="w-full max-w-full sm:max-w-[440px] bg-[#14142a] border-t sm:border border-white/20 rounded-t-[28px] sm:rounded-[28px] p-5 shadow-2xl animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <i className="ti ti-flask text-[20px] text-[#5eea8f]"></i>
                <span className="text-[18px] font-['Cormorant_Garamond',serif] font-medium text-white">
                  {selectedRecipe.title}
                </span>
              </div>
              <button 
                onClick={() => setSelectedRecipe(null)}
                className="text-[#e0e0ed] hover:text-white p-1 text-2xl cursor-pointer"
              >
                <i className="ti ti-x"></i>
              </button>
            </div>

            <div className="text-[14px] text-[#e0e0ed] mb-3">
              {selectedRecipe.expirationStr}
            </div>

            <div className="space-y-2 py-1 text-[15px]">
              {(selectedRecipe.items || [
                'Suplementação manipulada de acordo com exames periódicos',
                'Ingerir conforme as instruções prescritas pela equipe clínica'
              ]).map((it, idx) => (
                <div key={idx} className="bg-white/[0.04] p-3 rounded-xl border border-white/10 text-white flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#5eea8f] mt-1.5 shrink-0"></span>
                  <span className="leading-snug">{it}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedRecipe(null)}
                className="h-[34px] min-h-[34px] max-h-[34px] px-4 rounded-xl bg-[#5eea8f]/15 hover:bg-[#5eea8f]/25 text-[#5eea8f] border border-[#5eea8f]/30 text-[15px] font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
