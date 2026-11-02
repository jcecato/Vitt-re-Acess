import React, { useState } from 'react';
import { PatientProfile } from '../../types/patient';
import { TextDocumentModal } from '../../components/common/TextDocumentModal';

interface HealthTabProps {
  patient: PatientProfile;
  onOpenPdf?: (title: string) => void;
}

export const HealthTab: React.FC<HealthTabProps> = ({ patient }) => {
  const [isAnamneseModalOpen, setIsAnamneseModalOpen] = useState(false);

  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      <div>
        <div className="text-[20px] font-['Cormorant_Garamond',serif] font-medium tracking-[0.02em] text-[#5eea8f] mb-1.5">
          Objetivos e histórico de saúde
        </div>

        {/* Anotações Gerais */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3.5 mb-2.5 shadow-sm">
          <div className="text-[20px] font-['Cormorant_Garamond',serif] font-medium text-[#5eea8f] leading-tight">
            Anotações Gerais
          </div>
          <div className="text-[16px] text-[#cfd3dc] leading-relaxed pt-1.5">
            {patient.crmGeneralNotes || 'Reduzir gordura visceral, melhorar qualidade do sono e manter constância nas refeições conforme o plano traçado.'}
          </div>
        </div>

        {/* Card Anamnese com Ícone, Nome, Data e botão Visualizar */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#5eea8f]/15 text-[#5eea8f] flex items-center justify-center text-[20px] shrink-0">
              <i className="ti ti-file-text"></i>
            </div>
            <div className="grow min-w-0">
              <div className="text-[18px] font-semibold text-white leading-tight">
                Anamnese
              </div>
              <div className="text-[15px] text-[#8e8ea6] mt-0.5 leading-snug">
                Data: 20/09/2026
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsAnamneseModalOpen(true)}
            className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3.5 rounded-xl bg-[#0f7a3a] border border-[#0f7a3a] text-white hover:bg-[#128d43] active:scale-95 transition cursor-pointer shrink-0"
          >
            <i className="ti ti-eye text-[17px]"></i>
            <span>Visualizar</span>
          </button>
        </div>
      </div>

      {/* Modal de Leitura da Anamnese */}
      {isAnamneseModalOpen && (
        <TextDocumentModal
          isOpen={true}
          title="Anamnese Clínica Inicial"
          category="Histórico de Saúde"
          dateStr="20/09/2026"
          patientName={patient.name}
          content={`HISTÓRICO E METAS CLÍNICAS\n\nPaciente: ${patient.name}\nObjetivo Principal: Recomposição corporal, aumento de massa magra e vitalidade.\n\nHistórico Metabólico: Sem histórico de comorbidades prévias. Exames basais dentro da estabilidade com recomendação de ajuste de micronutrientes.\n\nOrientações de Rotina: Hidratação fracionada, higiene do sono e suplementação personalizada monitorada a cada retorno.`}
          onClose={() => setIsAnamneseModalOpen(false)}
        />
      )}
    </div>
  );
};
