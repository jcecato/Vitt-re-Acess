import React, { useState } from 'react';
import { PatientProfile } from '../../types/patient';
import { TextDocumentModal } from '../../components/common/TextDocumentModal';

interface GuiasTabProps {
  patient: PatientProfile;
  onOpenPdf: (title: string) => void;
}

export const GuiasTab: React.FC<GuiasTabProps> = ({ patient, onOpenPdf }) => {
  const [isAnamneseModalOpen, setIsAnamneseModalOpen] = useState(false);

  return (
    <div className="space-y-6 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full pb-6">
      {/* Cabeçalho da Aba */}
      <div>
        <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
          Guias
        </div>
        <div className="text-[17px] font-semibold text-white mt-0.5">
          Anamnese, Documentos e Encaminhamentos
        </div>
      </div>

      {/* DIV 1: ANAMNESE */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
          <div className="w-8 h-8 rounded-lg bg-[#5eea8f]/15 text-[#5eea8f] flex items-center justify-center text-[18px]">
            <i className="ti ti-heart-rate-monitor"></i>
          </div>
          <div>
            <div className="text-[22px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-none">
              Anamnese
            </div>
            <p className="text-[13px] text-[#8b98a6] mt-0.5">
              Registro clínico e histórico de saúde inicial
            </p>
          </div>
        </div>

        {/* Anotações Gerais */}
        <div className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-3.5 shadow-sm">
          <div className="text-[20px] font-['Cormorant_Garamond',serif] font-bold text-[#5eea8f] leading-tight">
            Anotações Gerais
          </div>
          <div className="text-[17px] text-[#cfd3dc] leading-relaxed pt-1.5">
            {patient.crmGeneralNotes || 'Reduzir gordura visceral, melhorar qualidade do sono e manter constância nas refeições conforme o plano traçado.'}
          </div>
        </div>

        {/* Card Anamnese com Ícone, Nome, Data e botão Visualizar */}
        <div className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#5eea8f]/15 text-[#5eea8f] flex items-center justify-center text-[20px] shrink-0">
              <i className="ti ti-file-text"></i>
            </div>
            <div className="grow min-w-0">
              <div className="text-[17px] font-semibold text-white leading-tight uppercase">
                ANAMNESE
              </div>
              <div className="text-[16px] text-[#e0e0ed] mt-0.5 leading-snug">
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

      {/* DIV 2: DOCUMENTOS */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
          <div className="w-8 h-8 rounded-lg bg-[#5eea8f]/15 text-[#5eea8f] flex items-center justify-center text-[18px]">
            <i className="ti ti-folders"></i>
          </div>
          <div>
            <div className="text-[22px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-none">
              Documentos
            </div>
            <p className="text-[13px] text-[#8b98a6] mt-0.5">
              Documentos que você nos entregou centralizados
            </p>
          </div>
        </div>

        <p className="text-[16px] text-[#cfd3dc] leading-relaxed">
          Apresente eles a sua equipe multiprofissional de forma organizada tudo em um só lugar.
        </p>

        <div className="space-y-3">
          {patient.documents.map((doc) => {
            const firstWord = (doc.name || '').split(' ')[0].toUpperCase();
            return (
              <div
                key={doc.id}
                className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl px-3 py-2.5 flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#5eea8f]/15 text-[#5eea8f] flex items-center justify-center text-[20px] shrink-0">
                    <i className={doc.name.includes('Hemograma') ? 'ti ti-flask' : doc.name.includes('Perfil') ? 'ti ti-heart-rate-monitor' : 'ti ti-file'}></i>
                  </div>
                  <div className="grow min-w-0">
                    <div className="text-[17px] font-semibold text-white leading-tight truncate uppercase">
                      {firstWord}
                    </div>
                    <div className="text-[16px] text-[#e0e0ed] mt-0.5 leading-snug">
                      Data: {doc.dateStr}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onOpenPdf(doc.name)}
                  className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3.5 rounded-xl bg-[#0f7a3a] text-white hover:bg-[#128d43] active:scale-95 transition cursor-pointer shrink-0"
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

      {/* DIV 3: ENCAMINHAMENTOS */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
          <div className="w-8 h-8 rounded-lg bg-[#5eea8f]/15 text-[#5eea8f] flex items-center justify-center text-[18px]">
            <i className="ti ti-send"></i>
          </div>
          <div>
            <div className="text-[22px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-none">
              Encaminhamentos
            </div>
            <p className="text-[13px] text-[#8b98a6] mt-0.5">
              Encaminhamentos médicos e multiprofissionais emitidos
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {patient.referrals.map((ref) => {
            const cleanDate = ref.dateStr.replace('PDF · ', '').replace('PDF . ', '');

            return (
              <div
                key={ref.id}
                className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-[20px] shrink-0 ${
                      ref.hasPdf
                        ? 'bg-[#5eea8f]/15 text-[#5eea8f]'
                        : 'bg-white/[0.05] text-[#e0e0ed]'
                    }`}
                  >
                    <i className="ti ti-send"></i>
                  </div>
                  <div className="grow min-w-0">
                    <div className="text-[17px] font-semibold text-white leading-tight uppercase">
                      {ref.specialty.toUpperCase()}
                    </div>
                    <div className="text-[16px] text-[#e0e0ed] mt-0.5 leading-snug">
                      Data: {cleanDate}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-white/[0.05]">
                  {ref.hasPdf ? (
                    <>
                      <button
                        onClick={() => onOpenPdf(`Encaminhamento - ${ref.specialty}`)}
                        className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3 rounded-xl bg-[#5eea8f]/10 border border-[#5eea8f]/35 text-[#5eea8f] hover:bg-[#5eea8f]/20 active:scale-95 transition cursor-pointer"
                      >
                        <i className="ti ti-file-type-pdf text-[17px]"></i>
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={() => onOpenPdf(`Encaminhamento - ${ref.specialty}`)}
                        className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3 rounded-xl bg-[#0f7a3a] border border-[#0f7a3a] text-white hover:bg-[#128d43] active:scale-95 transition cursor-pointer"
                      >
                        <i className="ti ti-eye text-[17px]"></i>
                        <span>Visualizar</span>
                      </button>
                    </>
                  ) : (
                    <button
                      disabled
                      className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3 rounded-xl bg-white/[0.03] border border-dashed border-white/15 text-[#e0e0ed] opacity-50 cursor-default"
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
      </div>

      {/* Modal de Leitura da Anamnese */}
      {isAnamneseModalOpen && (
        <TextDocumentModal
          isOpen={true}
          title="Anamnese Clínica Inicial"
          category="Anamnese Completa"
          dateStr="20/09/2026"
          patientName={patient.name}
          content={patient.crmGeneralNotes}
          onClose={() => setIsAnamneseModalOpen(false)}
        />
      )}
    </div>
  );
};
