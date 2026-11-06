import React, { useState } from 'react';
import { PatientProfile } from '../../types/patient';
import { ProtocolTab } from '../protocol/ProtocolTab';
import { MarketplaceTab } from '../marketplace/MarketplaceTab';

interface FormulasSuprimentosTabProps {
  patient: PatientProfile;
  onOpenPdf: (title: string) => void;
  defaultSubTab?: 'formulas' | 'acesso';
}

export const FormulasSuprimentosTab: React.FC<FormulasSuprimentosTabProps> = ({
  patient,
  onOpenPdf,
  defaultSubTab = 'formulas'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'formulas' | 'acesso'>(defaultSubTab);
  const [isSosModalOpen, setIsSosModalOpen] = useState<boolean>(false);

  const handleOpenWhatsApp = () => {
    const phoneNumber = '5527997918100';
    const message = encodeURIComponent('🚨 SOS - Reporte de Sintoma - Preciso me comunicar com o Dr. João Paulo.');
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const handleCloseAndOpenWhatsApp = () => {
    setIsSosModalOpen(false);
    handleOpenWhatsApp();
  };

  return (
    <div className="w-full space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sub-navegação em Pílulas Ergonômicas */}
      <div className="sticky top-0 z-20 bg-[#0d0d16]/95 backdrop-blur-md pt-1 pb-2 border-b border-white/[0.08]">
        <div className="flex gap-2 p-1 bg-white/[0.03] border-[1px] border-white/50 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveSubTab('formulas')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-[16px] font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
              activeSubTab === 'formulas'
                ? 'bg-[#5eea8f] text-[#0a0d12] shadow-md shadow-[#5eea8f]/20 font-extrabold'
                : 'text-[#cfd3dc] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <i className="ti ti-pill text-[18px]"></i>
            <span>Minhas Fórmulas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('acesso')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-[16px] font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
              activeSubTab === 'acesso'
                ? 'bg-[#5eea8f] text-[#0a0d12] shadow-md shadow-[#5eea8f]/20 font-extrabold'
                : 'text-[#cfd3dc] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <i className="ti ti-shopping-bag text-[18px]"></i>
            <span>Acesso Ágil</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Renderizado com Preservação Integral dos Módulos Originais */}
      <div className="w-full">
        {activeSubTab === 'formulas' && (
          <ProtocolTab patient={patient} onOpenPdf={onOpenPdf} />
        )}

        {activeSubTab === 'acesso' && (
          <MarketplaceTab patient={patient} />
        )}
      </div>

      {/* Card Moderno de Rodapé SOS / Reportar Sintoma ou Sensibilidade com Fundo Gradiente Amarelo */}
      <div className="pt-6 pb-6 flex justify-center">
        <button
          type="button"
          onClick={() => setIsSosModalOpen(true)}
          className="group w-full max-w-[420px] bg-gradient-to-b from-[#ffd21f] to-[#f5b800] rounded-[22px] py-6 px-5 text-center relative overflow-hidden shadow-[0_18px_40px_rgba(245,184,0,0.30)] border border-white/50 active:scale-[0.99] transition-all duration-150 cursor-pointer flex flex-col items-center justify-center select-none"
        >
          {/* Badge de Disponibilidade em Duas Linhas (18px itálico com borda #02140b) */}
          <div className="inline-flex flex-col items-center justify-center font-bold italic text-[18px] text-[#137a42] bg-white/60 border border-[#02140b] py-1.5 px-5 rounded-2xl mb-3 shadow-sm leading-tight text-center">
            <div className="inline-flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1f9d57] animate-pulse shadow-[0_0_0_4px_rgba(31,157,87,0.25)] shrink-0" />
              <span>Disponível todos os dias .</span>
            </div>
            <span className="pl-4">7 dias da semana</span>
          </div>

          {/* Anel ao redor cor preto brilhosa com botão 3D SOS no centro (margens verticais 2px e pt-0) */}
          <div className="relative w-32 h-32 mt-[2px] mb-[2px] pt-0 flex items-center justify-center">
            {/* Anel SVG com acabamento preto brilhante / glossy black e reflexo especular */}
            <svg width="128" height="128" viewBox="0 0 128 128" className="absolute inset-0 pointer-events-none">
              <defs>
                <linearGradient id="glossyBlackRing" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4a4e58" />
                  <stop offset="25%" stopColor="#1e2026" />
                  <stop offset="50%" stopColor="#0b0c0f" />
                  <stop offset="75%" stopColor="#1e2026" />
                  <stop offset="100%" stopColor="#3c404c" />
                </linearGradient>
                <filter id="glossyRingShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.45" />
                </filter>
              </defs>
              {/* Trilho base escurecido */}
              <circle cx="64" cy="64" r="58" fill="none" stroke="rgba(26,19,0,0.22)" strokeWidth="8" />
              {/* Anel Preto Brilhoso */}
              <circle
                cx="64"
                cy="64"
                r="58"
                fill="none"
                stroke="url(#glossyBlackRing)"
                strokeWidth="7"
                strokeLinecap="round"
                filter="url(#glossyRingShadow)"
              />
              {/* Filete de brilho especular superior */}
              <path
                d="M 34 26 A 58 58 0 0 1 94 26"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>

            {/* Botão Físico 3D SOS Central */}
            <div className="absolute inset-[18px] rounded-full cursor-pointer bg-[radial-gradient(circle_at_35%_28%,#ff5a5f,#e11d2a_55%,#9c0f1a)] shadow-[0_6px_0_#7c0c15,0_10px_16px_rgba(0,0,0,0.35),inset_0_2px_4px_rgba(255,255,255,0.4)] group-active:translate-y-[4px] group-active:shadow-[0_2px_0_#7c0c15,0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_4px_rgba(255,255,255,0.4)] transition-all duration-100 flex items-center justify-center">
              <span className="font-extrabold text-[24px] text-white tracking-wider drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] select-none">
                SOS
              </span>
            </div>
          </div>

          {/* Título: Reportar Sintoma ou Sensibilidade (24px Courier New, mt-15px) */}
          <h3 
            style={{ fontFamily: 'Courier New, monospace' }}
            className="text-[24px] font-bold text-[#1a1300] mt-[15px] leading-snug tracking-tight"
          >
            Reportar Sintoma ou Sensibilidade
          </h3>
        </button>
      </div>

      {/* Modal Informativo SOS com fonte 20px e botão fechar no lado direito que abre o WhatsApp automaticamente */}
      {isSosModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none font-['Plus_Jakarta_Sans',sans-serif]"
          onClick={handleCloseAndOpenWhatsApp}
        >
          <div 
            className="w-full max-w-full sm:max-w-[440px] bg-[#121420] border-[1px] border-white/50 rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-6 duration-200 text-[#eef4f8] flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho com Título e Botão Fechar no lado direito */}
            <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <img 
                  src="/assets/aistudio/image_60833a3c.png" 
                  alt="SOS" 
                  className="w-7 h-7 object-contain shrink-0" 
                />
                <span className="text-[20px] font-bold tracking-wide text-[#ffd000] uppercase">
                  Canal SOS Clínico
                </span>
              </div>

              {/* Botão fechar lado direito: fecha e automaticamente abre o WhatsApp */}
              <button
                type="button"
                onClick={handleCloseAndOpenWhatsApp}
                title="Fechar e abrir WhatsApp"
                aria-label="Fechar e abrir WhatsApp"
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-[#ffd000] hover:text-[#0a0d14] text-white flex items-center justify-center text-2xl font-bold cursor-pointer transition active:scale-95 shrink-0"
              >
                ×
              </button>
            </div>

            {/* Texto da Orientação com Fonte 20px */}
            <div className="space-y-4 py-2">
              <p className="text-[20px] text-[#eef4f8] leading-relaxed font-normal">
                Assim que clicar e enviar mensagem automática, envie uma segunda mensagem sobre seu relato.
              </p>

              {/* Pré-visualização da mensagem automática que será encaminhada */}
              <div className="bg-[#1a1f33] border border-[#ffd000]/40 rounded-2xl p-3.5 shadow-inner">
                <div className="text-[14px] text-[#ffd000] font-semibold uppercase tracking-wider mb-1">
                  Mensagem Automática:
                </div>
                <div className="text-[19px] text-white font-medium leading-snug">
                  🚨 SOS - Reporte de Sintoma - Preciso me comunicar com o Dr. João Paulo.
                </div>
              </div>
            </div>

            {/* Rodapé com botão de ação confirmando a ida ao WhatsApp ao fechar */}
            <div className="pt-4 mt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={handleCloseAndOpenWhatsApp}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-[#ffd000] hover:bg-[#ffc107] text-[#0a0d14] font-bold text-[18px] flex items-center justify-center gap-2 shadow-md active:scale-95 transition cursor-pointer"
              >
                <span>Enviar Relato</span>
                <i className="ti ti-brand-whatsapp text-[22px]"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
