import React from 'react';
import { PatientProfile } from '../../types/patient';

interface MealGuideTabProps {
  patient: PatientProfile;
  onOpenPdf: (title: string) => void;
}

export const MealGuideTab: React.FC<MealGuideTabProps> = ({ patient, onOpenPdf }) => {
  const isExpired = (patient.daysToComplete ?? 0) <= 0;

  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      <div>
        <div className="mb-3">
          <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
            Rotina Alimentar
          </div>
        </div>

        {(!patient.mealGuides || patient.mealGuides.length === 0) ? (
          <div className="bg-white/[0.04] border border-white/20 rounded-2xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#5eea8f]/10 border border-[#5eea8f]/30 flex items-center justify-center text-[#5eea8f] mx-auto mb-2.5">
              <i className="ti ti-salad text-2xl"></i>
            </div>
            <div className="text-[18px] font-semibold text-white mb-1">
              Rotina Alimentar em Elaboração
            </div>
            <p className="text-[14px] text-[#a5a4b8] leading-relaxed max-w-[280px] mx-auto">
              Seu plano alimentar e orientações nutricionais serão disponibilizados aqui após sua avaliação clínica.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {patient.mealGuides.map((guide, index) => {
            const displayTitle = `GUIA ${String(index + 1).padStart(2, '0')}`;
            return (
              <div
                key={guide.id}
                className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#5eea8f]/15 text-[#5eea8f] flex items-center justify-center text-[20px] shrink-0">
                    <i className="ti ti-salad"></i>
                  </div>
                  <div className="grow min-w-0">
                    <div className="text-[18px] font-semibold text-white leading-tight uppercase">
                      {displayTitle}
                    </div>
                    <div className="text-[18px] text-[#e0e0ed] mt-1 leading-snug">
                      Data: {guide.dateStr || '20/10/2026'}
                    </div>
                  </div>
                  {guide.isNew ? (
                    <span className="text-[14px] font-semibold text-white px-2 py-0.5 rounded bg-[#a35a07] shrink-0 uppercase tracking-wider">
                      novo
                    </span>
                  ) : (
                    <span className="text-[14px] font-semibold text-white px-2 py-0.5 rounded bg-[#0f7a3a] shrink-0 uppercase tracking-wider">
                      ativo
                    </span>
                  )}
                </div>

                {/* Botão PDF: com cadeado 50% maior após o término do ciclo */}
                <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-white/[0.05]">
                  {isExpired ? (
                    <div className="relative inline-block" title="Download em PDF bloqueado após conclusão do ciclo">
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
                      className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3.5 rounded-xl bg-[#5eea8f]/10 border border-[#5eea8f]/35 text-[#5eea8f] hover:bg-[#5eea8f]/20 active:scale-95 transition cursor-pointer"
                    >
                      <i className="ti ti-file-type-pdf text-[17px]"></i>
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
    </div>
  );
};
