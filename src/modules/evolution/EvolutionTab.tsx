import React, { useState } from 'react';
import { PatientProfile } from '../../types/patient';

interface EvolutionTabProps {
  patient: PatientProfile;
}

export const EvolutionTab: React.FC<EvolutionTabProps> = ({ patient }) => {
  const [activeChart, setActiveChart] = useState<'weight' | 'fat'>('weight');

  const { progress, weightHistory, professionalNotes } = patient;
  
  const totalToLose = Math.max(0.1, progress.initialWeight - progress.goalWeight);
  const lostSoFar = Math.max(0, progress.initialWeight - progress.currentWeight);
  const progressPercent = Math.min(100, Math.max(10, Math.round((lostSoFar / totalToLose) * 100)));

  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      {/* Title */}
      <div className="text-[20px] font-['Cormorant_Garamond',serif] font-medium tracking-[0.02em] text-[#5eea8f]">
        Composição corporal
      </div>

      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[18px] font-bold text-white leading-tight">
              {progress.currentWeight.toFixed(1).replace('.', ',')} kg
            </div>
            <div className="text-[16px] text-[#8e8ea6] leading-tight mt-1">peso atual</div>
          </div>
          <div className="text-right">
            <div className="text-[16px] text-[#5eea8f] font-semibold leading-tight">
              ↓ {Math.abs(progress.weightDelta).toFixed(1).replace('.', ',')} kg
            </div>
            <div className="text-[16px] text-[#8e8ea6] leading-tight mt-1">desde a 1ª consulta</div>
          </div>
        </div>

        <div className="h-2 bg-white/[0.08] rounded-full mt-3 overflow-hidden">
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full bg-[#5eea8f] rounded-full transition-all duration-500"
          />
        </div>

        <div className="flex justify-between text-[16px] text-[#8e8ea6] mt-1.5 font-normal">
          <span>início {progress.initialWeight.toFixed(1).replace('.', ',')} kg</span>
          <span>meta {progress.goalWeight.toFixed(1).replace('.', ',')} kg</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3">
          <div className="text-[18px] font-bold text-white">
            {progress.bodyFat.toFixed(1).replace('.', ',')}%
          </div>
          <div className="text-[16px] text-[#8e8ea6] leading-tight mt-1">gordura</div>
          <div className="text-[16px] text-[#5eea8f] mt-1 font-semibold">
            ↓ {Math.abs(progress.bodyFatDelta).toFixed(1).replace('.', ',')}%
          </div>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3">
          <div className="text-[18px] font-bold text-white">
            {progress.muscleMass.toFixed(1).replace('.', ',')} kg
          </div>
          <div className="text-[16px] text-[#8e8ea6] leading-tight mt-1">músculo</div>
          <div className="text-[16px] text-[#5eea8f] mt-1 font-semibold">
            ↑ +{progress.muscleDelta.toFixed(1).replace('.', ',')} kg
          </div>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3">
          <div className="text-[18px] font-bold text-white">
            {progress.waistCircumference} cm
          </div>
          <div className="text-[16px] text-[#8e8ea6] leading-tight mt-1">abdominal</div>
          <div className="text-[16px] text-[#5eea8f] mt-1 font-semibold">
            ↓ {Math.abs(progress.waistDelta)} cm
          </div>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3">
          <div className="text-[18px] font-bold text-white">
            {progress.visceralFat.toFixed(1).replace('.', ',')}
          </div>
          <div className="text-[16px] text-[#8e8ea6] leading-tight mt-1">gordura visceral</div>
          <div className="text-[16px] text-[#5eea8f] mt-1 font-semibold">
            ↓ {Math.abs(progress.visceralDelta)}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[20px] font-['Cormorant_Garamond',serif] font-medium tracking-[0.02em] text-[#5eea8f] mb-1.5">
          Comentário do profissional
        </div>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3.5">
          <div className="text-[16px] text-[#cfd3dc] leading-relaxed">
            {professionalNotes}
          </div>
        </div>
      </div>

      <div className="pt-1">
        <div className="flex justify-between items-center mb-2">
          <div className="text-[20px] font-['Cormorant_Garamond',serif] font-medium tracking-[0.02em] text-[#5eea8f]">
            Gráficos Follow Up
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveChart('weight')}
              className={`text-[16px] px-3 py-1 rounded-xl border transition cursor-pointer font-['Plus_Jakarta_Sans',sans-serif] ${
                activeChart === 'weight'
                  ? 'bg-[#5eea8f]/15 border-[#5eea8f] text-[#5eea8f] font-semibold'
                  : 'bg-transparent border-white/15 text-[#8e8ea6]'
              }`}
            >
              Peso (kg)
            </button>
            <button
              onClick={() => setActiveChart('fat')}
              className={`text-[16px] px-3 py-1 rounded-xl border transition cursor-pointer font-['Plus_Jakarta_Sans',sans-serif] ${
                activeChart === 'fat'
                  ? 'bg-[#5eea8f]/15 border-[#5eea8f] text-[#5eea8f] font-semibold'
                  : 'bg-transparent border-white/15 text-[#8e8ea6]'
              }`}
            >
              Gordura (%)
            </button>
          </div>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <i className="ti ti-chart-area text-[22px] text-[#5eea8f]"></i>
            <div className="text-left">
              <div className="text-[18px] font-['Cormorant_Garamond',serif] font-medium tracking-[0.02em] text-white leading-tight">
                Curva de Evolução Clínica
              </div>
              <div className="text-[16px] text-[#8e8ea6] font-['Plus_Jakarta_Sans',sans-serif]">
                Acompanhamento contínuo Vittáre
              </div>
            </div>
          </div>

          <div className="w-full h-28 my-1 px-1">
            <svg viewBox="0 0 300 90" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5eea8f" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#5eea8f" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <line x1="0" y1="80" x2="300" y2="80" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

              {(() => {
                const points = weightHistory.map((pt, i) => {
                  const val = activeChart === 'weight' ? pt.weight : pt.fat;
                  const min = activeChart === 'weight' ? 70 : 25;
                  const max = activeChart === 'weight' ? 76 : 31;
                  const x = 30 + i * (240 / (weightHistory.length - 1 || 1));
                  const y = 80 - ((val - min) / (max - min)) * 60;
                  return { x, y, val, date: pt.date };
                });

                const polyPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                const areaPath = `${polyPath} L ${points[points.length - 1].x} 80 L ${points[0].x} 80 Z`;

                return (
                  <>
                    <path d={areaPath} fill="url(#chartGradient)" />
                    <path d={polyPath} fill="none" stroke="#5eea8f" strokeWidth="2.5" strokeLinecap="round" />
                    {points.map((p, idx) => (
                      <g key={idx}>
                        <circle cx={p.x} cy={p.y} r="3.5" fill="#5eea8f" stroke="#0d0d16" strokeWidth="1.5" />
                        <text x={p.x} y={p.y - 6} fill="#ffffff" fontSize="10" textAnchor="middle" fontWeight="bold">
                          {p.val}
                        </text>
                        <text x={p.x} y="88" fill="#8e8ea6" fontSize="9" textAnchor="middle">
                          {p.date}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
