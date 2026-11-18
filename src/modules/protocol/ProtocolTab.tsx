import React, { useState } from 'react';
import { PatientProfile, ProtocolItem } from '../../types/patient';
import { PrescriptionPdfModal } from '../../components/common/PrescriptionPdfModal';
import { parseClinicalItemsToActives } from '../../services/crmDataService';

interface ProtocolTabProps {
  patient: PatientProfile;
  onOpenPdf: (title: string) => void;
}

interface FormulaHighlightLine {
  label: string;
  benefit: string;
}

export const ProtocolTab: React.FC<ProtocolTabProps> = ({
  patient
}) => {
  const [prescriptionModalItem, setPrescriptionModalItem] = useState<ProtocolItem | null>(null);

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
        <span className="text-[17px] font-semibold text-[#ffffff] px-3 py-0.5 rounded-xl bg-[#0f7a3a] border border-[#5eea8f]/45 shrink-0 uppercase tracking-wide">
          NOVO
        </span>
      );
    }
    if (norm === 'atualizado') {
      return (
        <span className="text-[17px] font-semibold text-[#ffffff] px-3 py-0.5 rounded-xl bg-[#a35a07] border border-[#fbbf24]/45 shrink-0 uppercase tracking-wide">
          ATUALIZADO
        </span>
      );
    }
    return (
      <span className="text-[17px] font-semibold text-[#ffffff] px-3 py-0.5 rounded-xl bg-white/[0.08] border border-white/40 shrink-0 uppercase tracking-wide">
        DESCONTINUADO
      </span>
    );
  };

  const inferConciseBenefit = (
    contextText: string,
    explicitSupport?: string,
    fallbackIndex = 0
  ): string => {
    if (explicitSupport && explicitSupport.trim()) {
      const cleaned = explicitSupport.trim();
      if (cleaned.length <= 68) return cleaned;
    }
    const lower = contextText.toLowerCase();
    if (/magn[eé]sio|triptofano|melatonina|teanina|gaba|sono|noite|noturn|ansiedade|estresse/.test(lower)) {
      return 'Auxílio ao relaxamento neuromuscular e sono reparador.';
    }
    if (/vitamina d|ferro|ferritina|b12|coenzima|q10|energia|fadiga|mitocond|manh[aã]|desjejum/.test(lower)) {
      return 'Auxílio ao equilíbrio de energia e disposição diária.';
    }
    if (/glutamina|probi[oó]tico|enzima|curcuma|intestin|digest|incha[cç]o/.test(lower)) {
      return 'Auxílio ao conforto digestivo e equilíbrio intestinal.';
    }
    return fallbackIndex % 2 === 0
      ? 'Auxílio ao equilíbrio de energia e disposição diária.'
      : 'Auxílio ao equilíbrio metabólico e recuperação na rotina.';
  };

  const resolveFormulaLines = (prot: ProtocolItem, recipeIndex: number): FormulaHighlightLine[] => {
    if (Array.isArray(prot.formulas) && prot.formulas.length > 0) {
      return prot.formulas.map((f, fIdx) => {
        const activesText = parseClinicalItemsToActives(f.actives)
          .map((a) => a.name)
          .join(' ');
        const defaultLabel =
          fIdx === 0 ? 'Fórmula Manhã' : fIdx === 1 ? 'Fórmula Tarde' : 'Fórmula Noite';
        const label = (f.name || defaultLabel).trim();
        const supportOverride = prot.routineSupport?.[fIdx];
        const benefit = inferConciseBenefit(
          `${label} ${f.posology || ''} ${f.observations || ''} ${activesText}`,
          supportOverride || f.observations,
          fIdx
        );
        return { label, benefit };
      });
    }

    const activesText = parseClinicalItemsToActives(prot.actives || prot.items)
      .map((a) => a.name)
      .join(' ');
    const fallbackLabel =
      prot.formulaName?.trim() || (recipeIndex % 2 === 0 ? 'Fórmula Manhã' : 'Fórmula Tarde');
    const explicitSupport =
      (prot.routineSupport && prot.routineSupport[0]) || prot.observations || '';
    const benefit = inferConciseBenefit(
      `${fallbackLabel} ${prot.title || ''} ${prot.posology || ''} ${activesText}`,
      explicitSupport,
      recipeIndex
    );
    return [{ label: fallbackLabel, benefit }];
  };

  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      <div>
        <div className="mb-3">
          <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
            Minhas Fórmulas
          </div>
        </div>

        {sortedProtocols.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/50 rounded-2xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#5eea8f]/10 border border-[#5eea8f]/30 flex items-center justify-center text-[#5eea8f] mx-auto mb-2.5">
              <i className="ti ti-flask text-2xl"></i>
            </div>
            <div className="text-[18px] font-semibold text-white mb-1">
              Fórmulas em Prescrição
            </div>
            <p className="text-[17px] text-[#ffffff]/80 leading-relaxed max-w-[280px] mx-auto">
              Suas fórmulas manipuladas, fitoterápicos e suplementações serão listados aqui após a avaliação clínica.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedProtocols.map((prot, index) => {
              const hasExpired =
                isExpired(prot.expirationStr) || prot.badge.toLowerCase() === 'descontinuado';
              const displayTitle = `Receita ${index + 1}`;
              const dateStrClean = prot.expirationStr
                .replace('Validade: ', '')
                .replace('Data: ', '');
              const formulaLines = resolveFormulaLines(prot, index);

              return (
                <div
                  key={prot.id}
                  className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-3.5 shadow-sm space-y-2.5"
                >
                  {/* Linha superior: Ícone + Receita + Data + Status */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#5eea8f]/15 border border-[#5eea8f]/40 text-[#5eea8f] flex items-center justify-center text-[22px] shrink-0">
                      <i className="ti ti-flask"></i>
                    </div>
                    <div className="grow min-w-0">
                      <div className="text-[18px] font-semibold text-[#ffffff] leading-tight">
                        {displayTitle}
                      </div>
                      <div className="text-[17px] text-[#ffffff]/90 mt-0.5 leading-snug">
                        Data: {dateStrClean}
                      </div>
                    </div>

                    {renderBadge(prot.badge)}
                  </div>

                  {/* Linha concisa em itálico sem caixas pesadas: Fórmula X > Benefício */}
                  <div className="space-y-1.5 pt-1">
                    {formulaLines.map((line, lIdx) => (
                      <p
                        key={`${prot.id}-line-${lIdx}`}
                        className="text-[17px] italic text-[#e8eef5] leading-snug"
                      >
                        <span className="font-semibold text-[#fbbf24]">{line.label}</span>
                        <span className="text-[#5eea8f] font-semibold"> &gt; </span>
                        <span>{line.benefit}</span>
                      </p>
                    ))}
                  </div>

                  {/* Ação: PDF com cadeado quando vencido */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/15">
                    {hasExpired ? (
                      <div
                        className="relative inline-block"
                        title="Download em PDF bloqueado: validade da receita expirada"
                      >
                        <button
                          disabled
                          className="h-[38px] min-h-[38px] inline-flex items-center gap-1.5 text-[17px] font-medium py-0 px-3.5 rounded-xl bg-white/[0.04] border border-white/20 text-[#ffffff] opacity-60 cursor-not-allowed"
                        >
                          <i className="ti ti-file-type-pdf text-[18px]"></i>
                          <span>PDF</span>
                        </button>
                        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#24141d] border border-[#fbbf24] flex items-center justify-center text-[14px] text-[#fbbf24] shadow-md">
                          <i className="ti ti-lock"></i>
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPrescriptionModalItem(prot)}
                        className="h-[38px] min-h-[38px] inline-flex items-center gap-1.5 text-[17px] font-semibold py-0 px-4 rounded-xl bg-[#5eea8f]/15 border border-[#5eea8f]/45 text-[#5eea8f] hover:bg-[#5eea8f]/25 active:scale-95 transition cursor-pointer"
                      >
                        <i className="ti ti-file-type-pdf text-[18px]"></i>
                        <span>PDF</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal A4 Oficial da Prescrição com Rubrica e Certificação Gov.br */}
      <PrescriptionPdfModal
        isOpen={!!prescriptionModalItem}
        onClose={() => setPrescriptionModalItem(null)}
        protocol={prescriptionModalItem}
        patientName={patient.name || 'João Cecato'}
      />
    </div>
  );
};
