import React, { useState } from 'react';
import { PatientProfile } from '../../types/patient';
import { TermsTab } from '../terms/TermsTab';
import { FinancialTab } from '../financial/FinancialTab';

interface MeuPerfilTabProps {
  patient: PatientProfile;
  onOpenPdf: (title: string) => void;
  defaultSubTab?: 'documentos' | 'termos' | 'recibos';
}

export const MeuPerfilTab: React.FC<MeuPerfilTabProps> = ({
  patient,
  onOpenPdf,
  defaultSubTab = 'documentos'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'documentos' | 'termos' | 'recibos'>(defaultSubTab);

  const subTabs = [
    { id: 'termos' as const, label: 'Termos', icon: 'ti ti-clipboard-check', isFullWidth: false },
    { id: 'recibos' as const, label: 'Recibos Fiscais', icon: 'ti ti-receipt', isFullWidth: false },
    { id: 'documentos' as const, label: 'Documentos Encaminhados', icon: 'ti ti-folders', isFullWidth: true }
  ];

  return (
    <div className="w-full space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Grade Visual de Botões Expostos em 18px (Linha 1: 2 colunas / Linha 2: Largura Total Centralizada) */}
      <div className="pt-1 pb-2 border-b border-white/[0.08]">
        <div className="grid grid-cols-2 gap-2.5">
          {subTabs.map((tab) => {
            const isActive = activeSubTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`py-3 px-3.5 rounded-2xl text-[18px] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 text-center min-h-[56px] ${
                  tab.isFullWidth ? 'col-span-2' : 'col-span-1'
                } ${
                  isActive
                    ? 'bg-[#5eea8f] text-[#0a0d12] shadow-lg shadow-[#5eea8f]/25 font-extrabold border-2 border-[#5eea8f]'
                    : 'bg-white/[0.04] text-[#d5dee4] border-[1px] border-white/50 hover:bg-white/[0.08] font-medium'
                }`}
              >
                <i className={`${tab.icon} text-[20px] shrink-0 ${isActive ? 'text-[#0a0d12]' : 'text-[#5eea8f]'}`}></i>
                <span className="leading-tight">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo Renderizado com Preservação Integral dos Módulos Originais */}
      <div className="w-full">
        {/* 1. Documentos Encaminhados */}
        {activeSubTab === 'documentos' && (
          <div className="space-y-4 select-none animate-fadeIn">
            <div className="mb-3">
              <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
                Documentos Encaminhados
              </div>
            </div>

            <div className="space-y-3">
              {patient.documents && patient.documents.map((doc) => {
                const firstWord = (doc.name || '').split(' ')[0].toUpperCase();
                return (
                  <div
                    key={doc.id}
                    className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl px-3.5 py-3 flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#5eea8f]/15 text-[#5eea8f] flex items-center justify-center text-[22px] shrink-0">
                        <i className={doc.name.includes('Hemograma') ? 'ti ti-flask' : doc.name.includes('Perfil') ? 'ti ti-heart-rate-monitor' : 'ti ti-file'}></i>
                      </div>
                      <div className="grow min-w-0">
                        <div className="text-[17px] font-semibold text-white leading-tight truncate uppercase">
                          {firstWord}
                        </div>
                        <div className="text-[15px] text-[#e0e0ed] mt-0.5 leading-snug">
                          Data: {doc.dateStr}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenPdf(doc.name)}
                      className="h-[36px] inline-flex items-center gap-1.5 text-[15px] font-semibold py-0 px-4 rounded-xl bg-[#0f7a3a] text-white hover:bg-[#128d43] active:scale-95 transition cursor-pointer shrink-0"
                      title="Visualizar documento"
                    >
                      <i className="ti ti-eye text-[17px]"></i>
                      <span>Visualizar</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Termos */}
        {activeSubTab === 'termos' && (
          <TermsTab patient={patient} onOpenPdf={onOpenPdf} />
        )}

        {/* 3. Recibos Fiscais */}
        {activeSubTab === 'recibos' && (
          <FinancialTab patient={patient} onOpenPdf={onOpenPdf} />
        )}
      </div>
    </div>
  );
};
