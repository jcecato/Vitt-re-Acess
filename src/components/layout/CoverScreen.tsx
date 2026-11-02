import React from 'react';

interface CoverScreenProps {
  isVisible: boolean;
  onEnter: () => void;
}

export const CoverScreen: React.FC<CoverScreenProps> = ({ isVisible, onEnter }) => {
  return (
    <div
      className={`absolute inset-0 z-40 w-full h-full flex flex-col items-center justify-center px-4 py-3 sm:px-6 sm:py-6 text-center transition-all duration-500 ease-out select-none overflow-hidden no-scrollbar ${
        isVisible
          ? 'opacity-100 pointer-events-auto visible'
          : 'opacity-0 pointer-events-none invisible'
      }`}
      style={{
        background: `radial-gradient(ellipse at 50% 100%, rgba(94, 234, 143, 0.28), transparent 60%), radial-gradient(ellipse at 50% 0%, rgba(124, 106, 247, 0.35), transparent 55%), #0b0b14`
      }}
    >
      <div className="flex flex-col items-center justify-center max-w-[320px] w-full my-auto shrink-0">
        {/* Logo Ícone Vittáre */}
        <svg
          viewBox="0 0 96 96"
          aria-hidden="true"
          className="w-20 h-20 sm:w-24 sm:h-24 shadow-2xl shrink-0"
        >
          <defs>
            <linearGradient id="vittare-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7c6af7" />
              <stop offset="100%" stopColor="#2fd37a" />
            </linearGradient>
          </defs>
          <rect width="96" height="96" rx="28" fill="url(#vittare-grad)" />
          <path
            d="M27 31 L48 67 L69 31"
            fill="none"
            stroke="#fff"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Título com marca registrada alinhada */}
        <div className="mt-4 text-[24px] sm:text-[26px] font-['Cormorant_Garamond',serif] font-medium text-white tracking-[0.03em] flex items-center justify-center whitespace-nowrap">
          <span>Vittáre Acess</span>
          <span className="text-[14px] font-semibold text-[#5eea8f] ml-1 self-start relative -top-1">™</span>
        </div>

        {/* Separador verde esmeralda */}
        <div className="w-12 h-[3px] rounded-full bg-[#5eea8f] my-4 sm:my-5 shrink-0"></div>

        {/* Lista de diferenciais */}
        <div className="space-y-3 my-1 font-['Plus_Jakarta_Sans',sans-serif] w-full max-w-[220px]">
          <div className="flex items-center gap-3 text-[17px] sm:text-[18px] font-semibold text-white">
            <i className="ti ti-circle-check text-[#5eea8f] text-[20px] sm:text-[22px] shrink-0"></i>
            <span>Acessibilidade</span>
          </div>
          <div className="flex items-center gap-3 text-[17px] sm:text-[18px] font-semibold text-white">
            <i className="ti ti-circle-check text-[#5eea8f] text-[20px] sm:text-[22px] shrink-0"></i>
            <span>Centralização</span>
          </div>
          <div className="flex items-center gap-3 text-[17px] sm:text-[18px] font-semibold text-white">
            <i className="ti ti-circle-check text-[#5eea8f] text-[20px] sm:text-[22px] shrink-0"></i>
            <span>Agilidade</span>
          </div>
        </div>

        {/* Botão Entrar */}
        <button
          onClick={onEnter}
          className="mt-6 sm:mt-7 text-[17px] sm:text-[18px] font-['Plus_Jakarta_Sans',sans-serif] font-bold text-white bg-[#0f7a3a] hover:bg-[#128d43] border border-[#5eea8f] rounded-2xl py-3 px-14 shadow-lg active:scale-95 transition cursor-pointer"
        >
          Entrar
        </button>
      </div>
    </div>
  );
};
