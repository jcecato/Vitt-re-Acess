import React, { useState } from 'react';
import { PatientProfile, TermItem } from '../../types/patient';
import { TextDocumentModal } from '../../components/common/TextDocumentModal';

interface TermsTabProps {
  patient: PatientProfile;
  onOpenPdf?: (title: string) => void;
}

export const TermsTab: React.FC<TermsTabProps> = ({ patient }) => {
  const [selectedTerm, setSelectedTerm] = useState<TermItem | null>(null);

  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      <div>
        <div className="mb-3">
          <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
            Termos
          </div>
        </div>

        {(!patient.terms || patient.terms.length === 0) ? (
          <div className="bg-white/[0.04] border border-white/20 rounded-2xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#5eea8f]/10 border border-[#5eea8f]/30 flex items-center justify-center text-[#5eea8f] mx-auto mb-2.5">
              <i className="ti ti-file-certificate text-2xl"></i>
            </div>
            <div className="text-[18px] font-semibold text-white mb-1">
              Termos de Acordo em Preparação
            </div>
            <p className="text-[14px] text-[#a5a4b8] leading-relaxed max-w-[280px] mx-auto">
              Seus termos de compromisso clínico e consentimento individual serão sincronizados aqui pelo seu nutricionista.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {patient.terms.map((term) => (
              <div
                key={term.id}
                className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#5eea8f]/15 text-[#5eea8f] flex items-center justify-center text-[20px] shrink-0">
                    <i className="ti ti-file-check"></i>
                  </div>
                  <div className="grow min-w-0">
                    <div className="text-[18px] font-semibold text-white leading-tight truncate uppercase">
                      {term.name.toUpperCase()}
                    </div>
                    <div className="text-[18px] text-[#e0e0ed] mt-0.5 leading-snug">
                      Data: {term.dateStr.replace('PDF · ', '')}
                    </div>
                  </div>
                </div>

                {/* Somente o botão Visualizar (sem PDF), abre modal em tela máxima */}
                <button
                  onClick={() => setSelectedTerm(term)}
                  className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-semibold py-0 px-3.5 rounded-xl bg-[#0f7a3a] border border-[#0f7a3a] text-white hover:bg-[#128d43] active:scale-95 transition cursor-pointer shrink-0"
                  title="Visualizar orientação completa"
                >
                  <i className="ti ti-eye text-[17px]"></i>
                  <span>Visualizar</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal em tela máxima/expandida para leitura do termo/orientação */}
      {selectedTerm && (
        <TextDocumentModal
          isOpen={true}
          title={selectedTerm.name}
          category="Termo de Orientação"
          dateStr={selectedTerm.dateStr.replace('PDF · ', '')}
          content={selectedTerm.content}
          patientName={patient.name}
          onClose={() => setSelectedTerm(null)}
        />
      )}
    </div>
  );
};
