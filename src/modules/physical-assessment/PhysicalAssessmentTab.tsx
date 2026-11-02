import React from 'react';
import { PatientProfile } from '../../types/patient';

interface PhysicalAssessmentTabProps {
  patient: PatientProfile;
  onOpenPdf: (title: string) => void;
}

export const PhysicalAssessmentTab: React.FC<PhysicalAssessmentTabProps> = ({
  patient,
  onOpenPdf
}) => {
  const isExpired = (patient.daysToComplete ?? 0) <= 0;
  const [selectedAssessment, setSelectedAssessment] = React.useState<string | null>(null);

  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      <div>
        <div className="text-[20px] font-['Cormorant_Garamond',serif] font-medium tracking-[0.02em] text-[#5eea8f] mb-1">
          Resultado da avaliação física
        </div>
        <div className="text-[16px] text-[#8e8ea6] leading-relaxed mb-2.5">
          Seu laudo com as métricas corporais e bioimpedância.
        </div>

        <div className="space-y-2">
          {patient.physicalAssessments.map((item) => {
            const isReady = item.status === 'laudo';
            return (
              <div
                key={item.id}
                className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-[20px] shrink-0 ${
                      isReady
                        ? 'bg-[#5eea8f]/15 text-[#5eea8f]'
                        : 'bg-white/[0.05] text-[#8e8ea6]'
                    }`}
                  >
                    <i className="ti ti-barbell"></i>
                  </div>
                  <div className="grow min-w-0">
                    <div className="text-[18px] font-semibold text-white leading-tight">
                      {item.title}
                    </div>
                    <div className="text-[16px] text-[#8e8ea6] mt-1 leading-snug">
                      {item.dateStr}
                    </div>
                  </div>
                  {isReady && (
                    <span className="text-[14px] font-semibold text-white px-2 py-0.5 rounded bg-[#0f7a3a] shrink-0 uppercase tracking-wider">
                      laudo
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-white/[0.05]">
                  {isReady ? (
                    <>
                      {/* PDF: bloqueado com cadeado caso ciclo expire */}
                      {isExpired ? (
                        <div className="relative inline-block" title="Download em PDF bloqueado após conclusão do ciclo">
                          <button
                            disabled
                            className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-[#8e8ea6] opacity-60 cursor-not-allowed"
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
                          onClick={() => onOpenPdf(item.title)}
                          className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3 rounded-xl bg-[#5eea8f]/10 border border-[#5eea8f]/35 text-[#5eea8f] hover:bg-[#5eea8f]/20 active:scale-95 transition cursor-pointer"
                        >
                          <i className="ti ti-file-type-pdf text-[17px]"></i>
                          <span>PDF</span>
                        </button>
                      )}

                      {/* Visualizar na tela: sempre acessível para o paciente */}
                      <button
                        onClick={() => setSelectedAssessment(item.title)}
                        className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3 rounded-xl bg-[#0f7a3a] border border-[#0f7a3a] text-white hover:bg-[#128d43] active:scale-95 transition cursor-pointer"
                      >
                        <i className="ti ti-eye text-[17px]"></i>
                        <span>Visualizar</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        disabled
                        className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3 rounded-xl bg-white/[0.03] border border-dashed border-white/15 text-[#8e8ea6] opacity-50 cursor-default"
                      >
                        <i className="ti ti-file-type-pdf text-[17px]"></i>
                        <span>PDF</span>
                      </button>
                      <button
                        disabled
                        className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3 rounded-xl bg-white/[0.03] border border-dashed border-white/15 text-[#8e8ea6] opacity-50 cursor-default"
                      >
                        <i className="ti ti-eye text-[17px]"></i>
                        <span>Visualizar</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de visualização na tela da Avaliação Física */}
      {selectedAssessment && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none font-['Plus_Jakarta_Sans',sans-serif]"
          onClick={() => setSelectedAssessment(null)}
        >
          <div 
            className="w-full max-w-full sm:max-w-[440px] bg-[#14142a] border-t sm:border border-white/20 rounded-t-[28px] sm:rounded-[28px] p-5 shadow-2xl animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5eea8f]"></span>
                <span className="text-[18px] font-['Cormorant_Garamond',serif] font-medium text-white">
                  {selectedAssessment}
                </span>
              </div>
              <button 
                onClick={() => setSelectedAssessment(null)}
                className="text-[#8e8ea6] hover:text-white p-1 text-2xl cursor-pointer"
              >
                <i className="ti ti-x"></i>
              </button>
            </div>

            <div className="space-y-2.5 py-1 text-[16px]">
              <div className="bg-white/[0.04] p-3 rounded-xl border border-white/10 flex justify-between items-center">
                <span className="text-[#a5a4b8]">Peso Corporal</span>
                <strong className="text-white text-[18px]">{patient.progress.currentWeight} kg</strong>
              </div>
              <div className="bg-white/[0.04] p-3 rounded-xl border border-white/10 flex justify-between items-center">
                <span className="text-[#a5a4b8]">Percentual de Gordura</span>
                <strong className="text-[#5eea8f] text-[18px]">{patient.progress.bodyFat}%</strong>
              </div>
              <div className="bg-white/[0.04] p-3 rounded-xl border border-white/10 flex justify-between items-center">
                <span className="text-[#a5a4b8]">Massa Muscular</span>
                <strong className="text-white text-[18px]">{patient.progress.muscleMass} kg</strong>
              </div>
              <div className="bg-white/[0.04] p-3 rounded-xl border border-white/10 flex justify-between items-center">
                <span className="text-[#a5a4b8]">Circunferência Abdominal</span>
                <strong className="text-white text-[18px]">{patient.progress.waistCircumference} cm</strong>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedAssessment(null)}
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
