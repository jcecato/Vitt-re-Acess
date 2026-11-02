import React from 'react';
import { PatientProfile } from '../../types/patient';

interface ReferralsTabProps {
  patient: PatientProfile;
  onOpenPdf: (title: string) => void;
}

export const ReferralsTab: React.FC<ReferralsTabProps> = ({ patient, onOpenPdf }) => {
  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      <div>
        <div className="text-[20px] font-['Cormorant_Garamond',serif] font-medium tracking-[0.02em] text-[#5eea8f] mb-1.5">
          Encaminhamentos
        </div>

        <div className="space-y-2">
          {patient.referrals.map((ref) => {
            const cleanDate = ref.dateStr.replace('PDF · ', '').replace('PDF . ', '');

            return (
              <div
                key={ref.id}
                className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-[20px] shrink-0 ${
                      ref.hasPdf
                        ? 'bg-[#5eea8f]/15 text-[#5eea8f]'
                        : 'bg-white/[0.05] text-[#8e8ea6]'
                    }`}
                  >
                    <i className="ti ti-send"></i>
                  </div>
                  <div className="grow min-w-0">
                    <div className="text-[18px] font-semibold text-white leading-tight">
                      {ref.specialty}
                    </div>
                    <div className="text-[15px] text-[#8e8ea6] mt-0.5 leading-snug">
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
                      className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3 rounded-xl bg-white/[0.03] border border-dashed border-white/15 text-[#8e8ea6] opacity-50 cursor-default"
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
    </div>
  );
};
