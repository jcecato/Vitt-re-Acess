import React from 'react';
import { NAVIGATION_TABS } from '../../config/constants';

interface DotsIndicatorProps {
  activeTab: string;
  onGoToInicio: () => void;
}

export const DotsIndicator: React.FC<DotsIndicatorProps> = ({ activeTab, onGoToInicio }) => {
  return (
    <div className="pt-1.5 pb-2 select-none font-['Plus_Jakarta_Sans',sans-serif] w-full">
      {/* Progress Dots */}
      <div className="flex justify-center items-center gap-1.5">
        {NAVIGATION_TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <div
              key={tab.id}
              style={{
                width: isActive ? '18px' : '6px',
                height: '4px',
                backgroundColor: isActive ? '#5eea8f' : '#33334d'
              }}
              className="rounded-full transition-all duration-200"
            />
          );
        })}
      </div>

      {/* Voltar Início Button (h: 34px) */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onGoToInicio}
          className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium text-white/90 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] rounded-xl py-0 px-4 transition cursor-pointer active:scale-95"
        >
          <i className="ti ti-home text-[17px] text-[#5eea8f]"></i>
          <span>Voltar Início</span>
        </button>
      </div>
    </div>
  );
};
