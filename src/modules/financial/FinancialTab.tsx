import React from 'react';
import { PatientProfile } from '../../types/patient';

interface FinancialTabProps {
  patient: PatientProfile;
  onOpenPdf: (title: string) => void;
}

export const FinancialTab: React.FC<FinancialTabProps> = ({ patient, onOpenPdf }) => {
  // Ordena sempre do mais atual para o mais antigo com base na data (DD/MM/YYYY)
  const parseDate = (dStr: string): number => {
    const match = dStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) return 0;
    return new Date(parseInt(match[3], 10), parseInt(match[2], 10) - 1, parseInt(match[1], 10)).getTime();
  };

  const sortedFinancial = [...(patient.financial || [])].sort((a, b) => {
    return parseDate(b.dateStr) - parseDate(a.dateStr);
  });

  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      <div>
        <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] mb-2">
          Seus investimentos
        </div>

        <div className="space-y-4">
          {sortedFinancial.map((item) => {
            const isPaid = (item.status || '').toLowerCase() === 'pago';

            return (
              <div
                key={item.id}
                className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3.5 shadow-sm"
              >
                {/* Linha 1: Valor + [ status PAGO/PENDENTE ] */}
                <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
                  <span className={`text-[20px] font-bold ${isPaid ? 'text-[#5eea8f]' : 'text-white'}`}>
                    {item.amount}
                  </span>
                  <span
                    className={`text-[13px] font-semibold text-white px-2.5 py-0.5 rounded-lg uppercase tracking-wider ${
                      isPaid ? 'bg-[#0f7a3a]' : 'bg-[#a35a07]'
                    }`}
                  >
                    {item.status.toUpperCase()}
                  </span>
                </div>

                {/* Linha 2 em diante: Estrutura padronizada em 18px */}
                <div className="pt-2.5 space-y-2 text-[18px]">
                  <div className="text-[#cfd3dc]">
                    <span className="text-[#e0e0ed]">Modelo: </span>
                    <strong className="text-white font-medium">{item.model || 'Presencial'}</strong>
                  </div>
                  <div className="text-[#cfd3dc]">
                    <span className="text-[#e0e0ed]">Plano Contratado: </span>
                    <strong className="text-white font-medium">{item.planName || 'Protocolo Vittáre Premium'}</strong>
                  </div>
                  <div className="text-[#cfd3dc]">
                    <span className="text-[#e0e0ed]">Forma: </span>
                    <span className="text-white font-medium">{item.method || 'Pix'}</span>
                  </div>
                  {item.condition && (
                    <div className="text-[#cfd3dc]">
                      <span className="text-[#e0e0ed]">Condição: </span>
                      <span className="text-white font-medium">{item.condition}</span>
                    </div>
                  )}
                  <div className="text-[#cfd3dc]">
                    <span className="text-[#e0e0ed]">Data: </span>
                    <span className="text-white font-medium">{item.dateStr}</span>
                  </div>
                </div>

                {/* Botão Nota Fiscal padronizado em 18px */}
                <div className="mt-3.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-start">
                  <button
                    onClick={() => onOpenPdf(`Nota Fiscal - ${item.amount}`)}
                    className="h-[40px] min-h-[40px] inline-flex items-center gap-2 text-[18px] font-medium py-0 px-3.5 rounded-xl bg-[#5eea8f]/10 border border-[#5eea8f]/35 text-[#5eea8f] hover:bg-[#5eea8f]/20 active:scale-95 transition cursor-pointer"
                  >
                    <i className="ti ti-file-type-pdf text-[20px]"></i>
                    <span>Nota Fiscal</span>
                    <i className="ti ti-download text-[18px] ml-0.5"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
