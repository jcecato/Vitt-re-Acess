import React, { useRef, useEffect, useState, useCallback } from 'react';
import { NAVIGATION_TABS } from '../../config/constants';

interface NavigationRailProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  pendingTabs?: string[];
}

export const NavigationRail: React.FC<NavigationRailProps> = ({ 
  activeTab, 
  onSelectTab,
  pendingTabs = []
}) => {
  const railRef = useRef<HTMLDivElement>(null);
  const [isAtEnd, setIsAtEnd] = useState<boolean>(false);

  // Monitora a posição física de rolagem em tempo real (touch drag e botões)
  const checkScrollLimits = useCallback(() => {
    if (railRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = railRef.current;
      // Margem de tolerância para subpixels de telas móveis de alta densidade (16px)
      const atStart = scrollLeft <= 16;
      const atEnd = scrollLeft + clientWidth >= scrollWidth - 16;

      // Se chegar ao final esquerdo (Meu Dia), a seta esquerda some e ressurge a seta direita
      if (atStart || activeTab === 'meu-dia') {
        setIsAtEnd(false);
      } 
      // Se chegar ao final direito (Caixa Surpresa), a seta direita some e ressurge a seta esquerda
      else if (atEnd || activeTab === 'caixa-surpresa') {
        setIsAtEnd(true);
      }
    }
  }, [activeTab]);

  // Listener nativo com passive: true para responder imediatamente ao deslize do dedo no celular
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    checkScrollLimits();
    rail.addEventListener('scroll', checkScrollLimits, { passive: true });
    window.addEventListener('resize', checkScrollLimits);

    return () => {
      rail.removeEventListener('scroll', checkScrollLimits);
      window.removeEventListener('resize', checkScrollLimits);
    };
  }, [checkScrollLimits]);

  // Auto-scroll para centralizar a aba ativa e atualizar estado das setas
  useEffect(() => {
    if (railRef.current) {
      const activeEl = railRef.current.querySelector<HTMLButtonElement>(`[data-tab="${activeTab}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest'
        });
      }
    }
    const timer = setTimeout(checkScrollLimits, 350);
    return () => clearTimeout(timer);
  }, [activeTab, checkScrollLimits]);

  const handleTabClick = (tabId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    onSelectTab(tabId);
    event.currentTarget.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest'
    });
    setTimeout(checkScrollLimits, 350);
  };

  const handleScrollRight = () => {
    if (railRef.current) {
      railRef.current.scrollBy({ left: 140, behavior: 'smooth' });
      setTimeout(checkScrollLimits, 150);
      setTimeout(checkScrollLimits, 350);
    }
  };

  const handleScrollLeft = () => {
    if (railRef.current) {
      railRef.current.scrollBy({ left: -140, behavior: 'smooth' });
      setTimeout(checkScrollLimits, 150);
      setTimeout(checkScrollLimits, 350);
    }
  };

  const showLeftArrow = isAtEnd;

  return (
    <div className="select-none font-['Plus_Jakarta_Sans',sans-serif] w-full pt-1.5 pb-1">
      <div className="relative flex items-center">
        {/* Carrossel de abas com scroll fluido e snap nativo */}
        <div
          ref={railRef}
          onScroll={checkScrollLimits}
          className="flex gap-2 px-3 py-1.5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-proximity w-full"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain'
          }}
        >
          {NAVIGATION_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const hasPendingUpdate = pendingTabs.includes(tab.id);

            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                onClick={(e) => handleTabClick(tab.id, e)}
                className={`relative snap-center flex flex-col items-center gap-1.5 py-2 px-3.5 rounded-xl shrink-0 whitespace-nowrap transition-all duration-150 cursor-pointer border active:scale-95 ${
                  isActive
                    ? 'bg-[#5eea8f]/10 border-[#5eea8f]/50 text-[#5eea8f] shadow-sm'
                    : 'bg-white/[0.03] border-[1px] border-white/50 text-[#cfd3dc] hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {/* Indicador de atualização pendente (some automaticamente ao abrir a aba) */}
                {hasPendingUpdate && (
                  <span 
                    title="Nova atualização disponível"
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#5eea8f] shadow-[0_0_6px_#5eea8f] animate-pulse"
                  />
                )}
                <i className={`${tab.iconClass} text-[20px]`}></i>
                <span className="text-[16px] font-medium leading-none">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Botão de navegação lateral bidirecional:
            Se atingir o final da rolagem à direita (ou a última aba), a seta direita some e surge a seta esquerda '<' automaticamente com pulso suave.
            Nas demais posições, a seta direita '>' é exibida com o mesmo pulso suave e medidas. */}
        {showLeftArrow ? (
          <button
            type="button"
            onClick={handleScrollLeft}
            title="Voltar abas"
            aria-label="Voltar abas"
            className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0d0d16] via-[#0d0d16]/95 to-transparent pointer-events-auto cursor-pointer flex items-center justify-center pr-2 opacity-95 hover:opacity-100 active:scale-95 transition z-10"
          >
            <span 
              style={{ marginTop: '-15px', height: '41px', paddingLeft: '0px' }}
              className="text-[#5eea8f] text-[44px] font-light leading-none select-none drop-shadow-[0_2px_8px_rgba(94,234,143,0.35)] animate-pulse flex items-center justify-center"
            >
              ‹
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleScrollRight}
            title="Ver mais abas"
            aria-label="Ver mais abas"
            className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0d0d16] via-[#0d0d16]/95 to-transparent pointer-events-auto cursor-pointer flex items-center justify-center pl-2 opacity-95 hover:opacity-100 active:scale-95 transition z-10"
          >
            <span 
              style={{ marginTop: '-15px', height: '41px', paddingLeft: '0px' }}
              className="text-[#5eea8f] text-[44px] font-light leading-none select-none drop-shadow-[0_2px_8px_rgba(94,234,143,0.35)] animate-pulse flex items-center justify-center"
            >
              ›
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
