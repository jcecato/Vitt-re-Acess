import React, { useState } from 'react';
import { PatientProfile } from '../../types/patient';
import { ExamsTab } from '../exams/ExamsTab';
import { PhysicalAssessmentTab } from '../physical-assessment/PhysicalAssessmentTab';
import { MetabolicProfileTab } from '../metabolic-profile/MetabolicProfileTab';
import { TextDocumentModal } from '../../components/common/TextDocumentModal';

interface ExamesGuiasTabProps {
  patient: PatientProfile;
  onOpenPdf: (title: string) => void;
  defaultSubTab?: 'exames' | 'corporal' | 'mapa' | 'integrativa' | 'encaminhamentos';
}

export const ExamesGuiasTab: React.FC<ExamesGuiasTabProps> = ({
  patient,
  onOpenPdf,
  defaultSubTab = 'exames'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'exames' | 'corporal' | 'mapa' | 'integrativa' | 'encaminhamentos'
  >(defaultSubTab);

  const [isAnamneseModalOpen, setIsAnamneseModalOpen] = useState(false);

  const subTabs = [
    { 
      id: 'exames' as const, 
      line1: 'Exames', 
      line2: 'Laboratoriais', 
      brand: 'Hemo Labor™', 
      icon: 'ti ti-flask' 
    },
    { 
      id: 'corporal' as const, 
      line1: 'Avaliação', 
      line2: 'Corporal', 
      brand: 'OnBody™', 
      icon: 'ti ti-barbell' 
    },
    { 
      id: 'mapa' as const, 
      line1: 'Mapa', 
      line2: 'Funcional', 
      brand: 'BioSync™', 
      icon: 'ti ti-dna' 
    },
    { 
      id: 'integrativa' as const, 
      line1: 'Avaliação', 
      line2: 'Integrativa', 
      brand: 'Sense App™', 
      icon: 'ti ti-heart-rate-monitor' 
    },
    { 
      id: 'encaminhamentos' as const, 
      line1: 'Encaminhamento', 
      line2: 'Multidisciplinar', 
      brand: 'Multidisciplinar', 
      icon: 'ti ti-send' 
    }
  ];

  return (
    <div className="w-full space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Grade Visual de Botões Expostos em 18px (2 pares + 1 largura total) */}
      <div className="pt-1 pb-2 border-b border-white/[0.08]">
        <div className="grid grid-cols-2 gap-2.5">
          {subTabs.map((tab, idx) => {
            const isActive = activeSubTab === tab.id;
            const isFullWidth = idx === 4; // 5º item: Encaminhamento Multidisciplinar ocupa toda a largura

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`py-2.5 px-3 rounded-2xl text-[18px] transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center min-h-[64px] ${
                  isFullWidth ? 'col-span-2' : 'col-span-1'
                } ${
                  isActive
                    ? 'bg-[#5eea8f] text-[#0a0d12] shadow-lg shadow-[#5eea8f]/25 font-extrabold border-2 border-[#5eea8f]'
                    : 'bg-white/[0.04] text-[#d5dee4] border-[1px] border-white/50 hover:bg-white/[0.08] font-medium'
                }`}
              >
                {/* Linhas de texto estruturadas em bloco vertical para não truncar */}
                <div className="flex items-center gap-1.5 leading-tight">
                  <i className={`${tab.icon} text-[20px] shrink-0 ${isActive ? 'text-[#0a0d12]' : 'text-[#5eea8f]'}`}></i>
                  <span className="font-bold">
                    {tab.line1}
                  </span>
                </div>
                <div className="text-[17px] font-semibold leading-tight mt-0.5">
                  {tab.line2}
                </div>

                {/* Na aba selecionada exibe o selo oficial da marca com destaque */}
                {isActive && (
                  <span className="text-[12.5px] font-black px-2 py-0.5 mt-1 rounded-md bg-[#0a0d12]/20 text-[#0a0d12] tracking-wide shrink-0">
                    {tab.brand}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo Renderizado com Preservação Integral das Estruturas Originais */}
      <div className="w-full">
        {/* 1. Meus Exames | Hemo Labor™ */}
        {activeSubTab === 'exames' && (
          <ExamsTab patient={patient} onOpenPdf={onOpenPdf} />
        )}

        {/* 2. Avaliação Corporal | Vittáre OnBody™ */}
        {activeSubTab === 'corporal' && (
          <PhysicalAssessmentTab patient={patient} onOpenPdf={onOpenPdf} />
        )}

        {/* 3. Mapa Funcional | BioSync™ */}
        {activeSubTab === 'mapa' && (
          <div className="space-y-4 select-none animate-fadeIn">
            <div className="mb-3">
              <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
                Mapa Funcional | BioSync™
              </div>
            </div>
            <MetabolicProfileTab patient={patient} />
          </div>
        )}

        {/* 4. Avaliação Integrativa | Sense App™ */}
        {activeSubTab === 'integrativa' && (
          <div className="space-y-4 select-none animate-fadeIn">
            <div className="mb-3">
              <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
                Avaliação Integrativa | Sense App™
              </div>
            </div>

            {/* Anotações Gerais */}
            <div className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-4 shadow-sm">
              <div className="text-[20px] font-['Cormorant_Garamond',serif] font-bold text-[#5eea8f] leading-tight">
                Anotações Clínicas Integrativas
              </div>
              <div className="text-[17px] text-[#cfd3dc] leading-relaxed pt-2">
                {patient.crmGeneralNotes || 'Reduzir gordura visceral, melhorar qualidade do sono e manter constância nas refeições conforme o plano traçado.'}
              </div>
            </div>

            {/* Card Anamnese com Botão Visualizar */}
            <div className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-3.5 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#5eea8f]/15 text-[#5eea8f] flex items-center justify-center text-[22px] shrink-0">
                  <i className="ti ti-heart-rate-monitor"></i>
                </div>
                <div className="grow min-w-0">
                  <div className="text-[17px] font-semibold text-white leading-tight uppercase">
                    ANAMNESE INTEGRATIVA
                  </div>
                  <div className="text-[15px] text-[#e0e0ed] mt-0.5 leading-snug">
                    Data: 20/09/2026 · Sense App™
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAnamneseModalOpen(true)}
                className="h-[36px] min-h-[36px] inline-flex items-center gap-1.5 text-[15px] font-semibold py-0 px-3.5 rounded-xl bg-[#0f7a3a] border border-[#0f7a3a] text-white hover:bg-[#128d43] active:scale-95 transition cursor-pointer shrink-0"
              >
                <i className="ti ti-eye text-[17px]"></i>
                <span>Visualizar</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. Encaminhamento Multidisciplinar */}
        {activeSubTab === 'encaminhamentos' && (
          <div className="space-y-4 select-none animate-fadeIn">
            <div className="mb-3">
              <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
                Encaminhamento Multidisciplinar
              </div>
            </div>

            <div className="space-y-3">
              {patient.referrals && patient.referrals.map((ref) => {
                const cleanDate = ref.dateStr.replace('PDF · ', '').replace('PDF . ', '');

                return (
                  <div
                    key={ref.id}
                    className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-3.5 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-[22px] shrink-0 ${
                          ref.hasPdf
                            ? 'bg-[#5eea8f]/15 text-[#5eea8f]'
                            : 'bg-white/[0.05] text-[#e0e0ed]'
                        }`}
                      >
                        <i className="ti ti-send"></i>
                      </div>
                      <div className="grow min-w-0">
                        <div className="text-[18px] font-semibold text-white leading-tight uppercase">
                          {ref.specialty.toUpperCase()}
                        </div>
                        <div className="text-[15px] text-[#e0e0ed] mt-0.5 leading-snug">
                          Data: {cleanDate}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-white/[0.06]">
                      {ref.hasPdf ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenPdf(`Encaminhamento - ${ref.specialty}`)}
                            className="h-[36px] inline-flex items-center gap-1.5 text-[15px] font-semibold py-0 px-3.5 rounded-xl bg-[#5eea8f]/10 border border-[#5eea8f]/35 text-[#5eea8f] hover:bg-[#5eea8f]/20 active:scale-95 transition cursor-pointer"
                          >
                            <i className="ti ti-file-type-pdf text-[18px]"></i>
                            <span>PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenPdf(`Encaminhamento - ${ref.specialty}`)}
                            className="h-[36px] inline-flex items-center gap-1.5 text-[15px] font-semibold py-0 px-4 rounded-xl bg-[#0f7a3a] border border-[#0f7a3a] text-white hover:bg-[#128d43] active:scale-95 transition cursor-pointer"
                          >
                            <i className="ti ti-eye text-[18px]"></i>
                            <span>Visualizar</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="h-[36px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3.5 rounded-xl bg-white/[0.03] border border-dashed border-white/15 text-[#e0e0ed] opacity-50 cursor-default"
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
          </div>
        )}
      </div>

      {/* Modal de Anamnese */}
      {isAnamneseModalOpen && (
        <TextDocumentModal
          isOpen={true}
          title="Anamnese Clínica Inicial"
          category="Sense App™ · Registro Biofuncional"
          dateStr="20/09/2026"
          patientName={patient.name}
          content={patient.crmGeneralNotes}
          onClose={() => setIsAnamneseModalOpen(false)}
        />
      )}
    </div>
  );
};
