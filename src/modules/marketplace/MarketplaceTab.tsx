import React, { useState } from 'react';
import { PatientProfile } from '../../types/patient';
import { Check } from 'lucide-react';

interface MarketplaceTabProps {
  patient: PatientProfile;
}

export const MarketplaceTab: React.FC<MarketplaceTabProps> = ({ patient }) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const handleLinkClick = (link: string) => {
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      <div className="text-[20px] font-['Cormorant_Garamond',serif] font-medium tracking-[0.02em] text-[#5eea8f]">
        Curadoria e Indicações
      </div>

      {/* Texto de Curadoria com texto justificado e instrução à esquerda */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3.5 shadow-sm">
        <p className="text-[16px] text-white leading-relaxed text-justify">
          Nossa Curadoria pensa nos mínimos detalhes, e você ganha tempo nas pesquisas e segurança na compra verificada.
        </p>
        <p className="text-[15px] text-[#5eea8f] italic mt-2 font-medium text-left">
          Clique no link verde abaixo
        </p>
      </div>

      <div className="space-y-2.5 pt-1">
        {patient.marketplace.map((item) => (
          <div key={item.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 flex items-center gap-3">
            <div
              style={{ background: item.gradient }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-[26px] text-white shadow shrink-0"
            >
              <i className={`ti ${item.icon}`}></i>
            </div>

            <div className="grow min-w-0">
              <div className="text-[18px] font-semibold text-white leading-snug truncate">
                {item.name}
              </div>
              <div className="text-[16px] text-[#8e8ea6] mt-0.5">
                Atualizado: {item.dateStr}
              </div>

              <button
                onClick={() => handleLinkClick(item.link)}
                className="inline-flex items-center gap-1.5 mt-1.5 text-[16px] text-[#5eea8f] hover:underline transition cursor-pointer font-medium"
              >
                <i className="ti ti-link text-[16px]"></i>
                <span className="truncate">{item.link}</span>
                {copiedLink === item.link && (
                  <span className="text-[14px] bg-[#0f7a3a] text-white px-2 py-0.5 rounded inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Copiado
                  </span>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
