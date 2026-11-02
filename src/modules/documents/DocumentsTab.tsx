import React from 'react';
import { PatientProfile } from '../../types/patient';

interface DocumentsTabProps {
  patient: PatientProfile;
  onOpenPdf: (title: string) => void;
  onOpenUpload?: () => void;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  patient,
  onOpenPdf
}) => {
  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      <div>
        <div className="text-[20px] font-['Cormorant_Garamond',serif] font-medium tracking-[0.02em] text-[#5eea8f] mb-1">
          Documentos que você nos entregou.
        </div>
        <div className="text-[16px] text-[#cfd3dc] leading-relaxed mb-3">
          Apresente eles a sua equipe multiprofissional de forma organizada tudo em um só lugar.
        </div>

        <div className="space-y-2">
          {patient.documents.map((doc) => {
            return (
              <div
                key={doc.id}
                className="bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3 py-2.5 flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#5eea8f]/15 text-[#5eea8f] flex items-center justify-center text-[20px] shrink-0">
                    <i className={doc.name.includes('Hemograma') ? 'ti ti-flask' : doc.name.includes('Perfil') ? 'ti ti-heart-rate-monitor' : 'ti ti-file'}></i>
                  </div>
                  <div className="grow min-w-0">
                    <div className="text-[18px] font-semibold text-white leading-tight truncate">
                      {doc.name}
                    </div>
                    <div className="text-[15px] text-[#8e8ea6] mt-0.5 leading-snug">
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
    </div>
  );
};
