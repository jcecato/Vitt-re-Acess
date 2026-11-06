import React from 'react';

interface PhoneShellProps {
  children: React.ReactNode;
}

export const PhoneShell: React.FC<PhoneShellProps> = ({ children }) => {
  return (
    <div 
      className="relative w-full h-[100dvh] max-h-[100dvh] sm:h-[844px] sm:max-h-[calc(100dvh-2rem)] sm:w-[390px] sm:max-w-[430px] mx-auto bg-[#0d0d16] rounded-none sm:rounded-[44px] border-0 sm:border-[2px] sm:border-[#2c2c40] overflow-hidden shadow-2xl sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_45px_rgba(15,122,58,0.15)] flex flex-col justify-between select-none"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Dynamic Status bar header (visível na moldura desktop, padrão iPhone 14) */}
      <div className="hidden sm:flex justify-between items-center px-7 pt-3 pb-1 text-[12px] text-[#e0e0ed] font-medium tracking-tight shrink-0 select-none">
        <span>09:41</span>
        <div className="w-20 h-4 bg-[#1a1a28] rounded-full mx-auto -mt-1 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#0d0d16]"></div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <i className="ti ti-wifi"></i>
          <i className="ti ti-battery-4"></i>
        </div>
      </div>

      {/* Conteúdo principal travado em 100% da viewport interna, sem transbordo */}
      <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {children}
      </div>

      {/* Barra de navegação inferior (home indicator iPhone em moldura desktop) */}
      <div className="hidden sm:block w-32 h-1 bg-white/20 rounded-full mx-auto mb-2 mt-1 shrink-0"></div>
    </div>
  );
};
