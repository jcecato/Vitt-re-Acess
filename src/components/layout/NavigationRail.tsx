import React, { useRef, useEffect } from 'react';
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

  // Auto-scroll para centralizar a aba ativa e revelar as próximas abas
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
  }, [activeTab]);

  const handleTabClick = (tabId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    onSelectTab(tabId);
    event.currentTarget.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest'
    });
  };

  const handleScrollRight = () => {
    if (railRef.current) {
      railRef.current.scrollBy({ left: 140, behavior: 'smooth' });
    }
  };

  return (
    <div className="select-none font-['Plus_Jakarta_Sans',sans-serif] w-full pt-1.5 pb-1">
      <div className="relative flex items-center">
        {/* Carrossel de abas com scroll fluido e snap nativo */}
        <div
          ref={railRef}
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
                    : 'bg-white/[0.03] border-white/[0.06] text-[#cfd3dc] hover:text-white hover:bg-white/[0.06]'
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

        {/* Gradiente sutil à direita clicável para avançar rápido para as próximas abas */}
        <div 
          onClick={handleScrollRight}
          title="Ver mais abas"
          className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-[#0d0d16] pointer-events-auto cursor-pointer flex items-center justify-end pr-1 opacity-80 hover:opacity-100 transition"
        >
          <span className="text-[#5eea8f] text-xs font-bold select-none">›</span>
        </div>
      </div>
    </div>
  );
};
