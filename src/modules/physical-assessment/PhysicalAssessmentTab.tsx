import React from 'react';
import { PatientProfile, PhysicalAssessmentItem } from '../../types/patient';
import {
  calculateFullAnthropometry,
  buildEvolutionGroupsFromAssessments,
  BarSpectrumMode,
  ClinicalZoneStatus
} from '../../utils/anthropometryCalculator';
import { sortPhysicalAssessmentsDesc } from '../../services/crmDataService';

interface PhysicalAssessmentTabProps {
  patient: PatientProfile;
  onOpenPdf: (title: string) => void;
  onRefresh?: () => void;
  isSyncing?: boolean;
  syncError?: string | null;
}

export const PhysicalAssessmentTab: React.FC<PhysicalAssessmentTabProps> = ({
  patient,
  onOpenPdf,
  onRefresh,
  isSyncing = false,
  syncError = null
}) => {
  const isExpired = (patient.daysToComplete ?? 0) <= 0;
  const [selectedAssessment, setSelectedAssessment] = React.useState<PhysicalAssessmentItem | null>(null);
  const [activeInfoCard, setActiveInfoCard] = React.useState<{ title: string; text: string } | null>(null);
  const [pendingAssessmentForGuide, setPendingAssessmentForGuide] = React.useState<PhysicalAssessmentItem | null>(null);

  const sortedAssessments = React.useMemo(
    () => sortPhysicalAssessmentsDesc(patient.physicalAssessments || []),
    [patient.physicalAssessments]
  );

  // Gera todas as séries evolutivas (todos os 26 parâmetros da aba Visualizar) direto do histórico do Firebase
  const evolutionGroups = React.useMemo(
    () => buildEvolutionGroupsFromAssessments(sortedAssessments, patient),
    [sortedAssessments, patient]
  );

  return (
    <div className="space-y-4 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      {/* Seção 1: Lista de Avaliações Físicas cadastradas */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
            Avaliação Corporal | OnBody™
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isSyncing}
              className="h-[34px] inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 rounded-xl bg-white/[0.06] border border-white/20 text-[#d5dee4] hover:bg-white/[0.12] active:scale-95 transition cursor-pointer shrink-0"
            >
              <i className={`ti ti-refresh text-[16px] ${isSyncing ? 'animate-spin text-[#5eea8f]' : 'text-[#5eea8f]'}`}></i>
              <span>{isSyncing ? 'Sincronizando...' : 'Atualizar'}</span>
            </button>
          )}
        </div>

        {sortedAssessments.length === 0 ? (
          syncError === 'permission-denied' ? (
            <div className="bg-amber-500/10 border border-amber-400/40 rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-[16px]">
                <i className="ti ti-lock text-[20px]"></i>
                <span>Leitura bloqueada pelas Regras do Firebase (permission-denied)</span>
              </div>
              <p className="text-[14px] text-[#e0e0ed] leading-relaxed">
                O banco liberou a rota principal, mas bloqueou a subcoleção <code>/patients/{patient.email || 'jcecato@gmail.com'}/anthropometry</code>. Publique a regra <code>match /anthropometry/&#123;anthroId&#125; &#123; allow read: if true; &#125;</code> na aba <strong>Firestore Database &rarr; Regras</strong> do Console do Firebase e clique em <strong>Atualizar</strong> acima.
              </p>
            </div>
          ) : (
            <div className="bg-white/[0.04] border border-white/20 rounded-2xl p-6 text-center shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#5eea8f]/10 border border-[#5eea8f]/30 flex items-center justify-center text-[#5eea8f] mx-auto mb-2.5">
                <i className="ti ti-barbell text-2xl"></i>
              </div>
              <div className="text-[18px] font-semibold text-white mb-1">
                Avaliação Corporal em Aguardo
              </div>
              <p className="text-[14px] text-[#a5a4b8] leading-relaxed max-w-[280px] mx-auto">
                Seus relatórios de bioimpedância e medidas corporais aparecerão aqui após sua avaliação presencial.
              </p>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {sortedAssessments.map((item, index) => {
            const isReady = item.status === 'laudo';
            const displayTitle = item.title 
              ? item.title.toUpperCase() 
              : `AVALIAÇÃO F. ${String(index + 1).padStart(2, '0')}`;
            const displayDate = item.dateStr.startsWith('Data:') 
              ? item.dateStr 
              : (item.dateStr.includes('/') ? `Data: ${item.dateStr}` : item.dateStr);

            return (
              <div
                key={item.id}
                className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-[20px] shrink-0 ${
                      isReady
                        ? 'bg-[#5eea8f]/15 text-[#5eea8f]'
                        : 'bg-white/[0.05] text-[#e0e0ed]'
                    }`}
                  >
                    <i className="ti ti-barbell"></i>
                  </div>
                  <div className="grow min-w-0">
                    <div className="text-[18px] font-semibold text-white leading-tight uppercase">
                      {displayTitle}
                    </div>
                    <div className="text-[18px] text-[#e0e0ed] mt-1 leading-snug">
                      {displayDate}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-white/[0.05]">
                  {isReady ? (
                    <button
                      onClick={() => {
                        setActiveInfoCard(null);
                        setPendingAssessmentForGuide(item);
                      }}
                      className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-4 rounded-xl bg-[#0f7a3a] border border-[#0f7a3a] text-white hover:bg-[#128d43] active:scale-95 transition cursor-pointer"
                    >
                      <i className="ti ti-eye text-[17px]"></i>
                      <span>Visualizar</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-4 rounded-xl bg-white/[0.03] border border-dashed border-white/15 text-[#e0e0ed] opacity-50 cursor-default"
                    >
                      <i className="ti ti-eye text-[17px]"></i>
                      <span>Visualizar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Seção 2: Evolução completa de todos os parâmetros avaliados (espelho da aba Visualizar) */}
      {evolutionGroups.length > 0 && (
        <div className="pt-2 space-y-5">
          <div>
            <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] mb-1">
              Evolução das Avaliações Físicas
            </div>
            <div className="text-[18px] text-[#e0e0ed] leading-relaxed">
              Comparativo por data de todos os indicadores da sua avaliação corporal.
            </div>
          </div>

          {evolutionGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-3">
              <div className="text-[14px] font-bold text-[#5eea8f] uppercase tracking-[0.06em] px-1">
                {group.title}
              </div>

              <div className="space-y-4">
                {group.items.map((item) => {
                  const pts = item.points;
                  const hasNoData = pts.length === 0;
                  const hasSinglePoint = pts.length === 1;
                  const hasCurve = pts.length >= 2;

                  let badgeLabel = '-';
                  let badgeArrow = '';
                  let badgeColor = 'text-[#e0e0ed] bg-white/[0.05] border-white/15';

                  if (hasCurve) {
                    const firstPoint = pts[0];
                    const lastPoint = pts[pts.length - 1];
                    let pctChange = 0;
                    if (firstPoint && firstPoint.value > 0 && lastPoint) {
                      pctChange = ((lastPoint.value - firstPoint.value) / firstPoint.value) * 100;
                    }
                    const formattedPct = Math.abs(pctChange).toFixed(1);
                    badgeLabel = `${formattedPct}%`;

                    if (item.evolutionDirection === 'neutral') {
                      if (pctChange < -0.1) badgeArrow = '↓';
                      else if (pctChange > 0.1) badgeArrow = '↑';
                      else badgeArrow = '↔';
                      badgeColor = 'text-[#e0e0ed] bg-white/[0.05] border-white/15';
                    } else {
                      const higherIsBetter = item.evolutionDirection === 'higher-better';
                      if (pctChange < -0.1) {
                        badgeArrow = '↓';
                        badgeColor = !higherIsBetter
                          ? 'text-[#5eea8f] bg-[#5eea8f]/10 border-[#5eea8f]/25'
                          : 'text-[#e57373] bg-[#e57373]/10 border-[#e57373]/25';
                      } else if (pctChange > 0.1) {
                        badgeArrow = '↑';
                        badgeColor = higherIsBetter
                          ? 'text-[#5eea8f] bg-[#5eea8f]/10 border-[#5eea8f]/25'
                          : 'text-[#f5a623] bg-[#f5a623]/10 border-[#f5a623]/25';
                      } else {
                        badgeArrow = '↔';
                        badgeColor = 'text-[#e0e0ed] bg-white/[0.05] border-white/10';
                      }
                    }
                  }

                  return (
                    <div
                      key={item.id}
                      className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-3.5 shadow-sm"
                    >
                      {/* Cabeçalho do Card Evolutivo */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex flex-col min-w-0 pr-1">
                          <strong
                            style={{ paddingLeft: '0px' }}
                            className="text-white font-semibold text-[19px] leading-tight w-[218px] max-w-full break-words"
                          >
                            {item.title}
                          </strong>
                          {item.referenceText && (
                            <span className="text-[#e0e0ed] text-[17px] font-normal leading-snug mt-1">
                              {item.referenceText}
                            </span>
                          )}
                        </div>

                        <span className={`text-[18px] font-semibold border px-2.5 py-0.5 rounded-lg shrink-0 flex items-center justify-center gap-1.5 min-w-[54px] ${badgeColor}`}>
                          {badgeArrow && (
                            <span className="text-[20px] leading-none font-bold">{badgeArrow}</span>
                          )}
                          <span>{badgeLabel}</span>
                        </span>
                      </div>

                      {/* Gráfico horizontal conforme disponibilidade de datas (0, 1 ou 2+ pontos) */}
                      {hasNoData && (
                        <div className="w-full h-12 px-1 mt-2 flex items-center justify-center relative">
                          <svg viewBox="0 0 320 44" className="w-full h-full">
                            <line x1="10" y1="22" x2="310" y2="22" stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
                          </svg>
                          <span className="absolute text-[14px] text-[#a5a4b8] bg-[#141726]/90 px-3 py-0.5 rounded-full border border-white/10">
                            Sem medições registradas no histórico
                          </span>
                        </div>
                      )}

                      {hasSinglePoint && (
                        <div className="w-full h-[84px] px-1 mt-2 mb-1">
                          <svg viewBox="0 0 320 84" className="w-full h-full ml-0 pt-0 overflow-visible">
                            <line x1="10" y1="32" x2="310" y2="32" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                            <line x1="10" y1="60" x2="310" y2="60" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                            <line x1="160" y1="47" x2="160" y2="63" stroke="#5eea8f" strokeWidth="1" strokeDasharray="2 3" strokeOpacity={0.25} />
                            <circle cx="160" cy="45" r="6.5" fill="#5eea8f" fillOpacity="0.2" />
                            <circle cx="160" cy="45" r="4" fill="#5eea8f" stroke="#14142a" strokeWidth="2" />
                            <circle cx="160" cy="45" r="1.5" fill="#ffffff" />
                            <text x="160" y="34" fill="#ffffff" fontSize="18" fontWeight="bold" textAnchor="middle">
                              {pts[0].shortLabel}
                            </text>
                            <text x="160" y="77" fill="#e0e0ed" fontSize="14" fontWeight="normal" textAnchor="middle">
                              {pts[0].date}
                            </text>
                          </svg>
                        </div>
                      )}

                      {hasCurve && (() => {
                        const values = pts.map((p) => p.value);
                        const minVal = Math.min(...values);
                        const maxVal = Math.max(...values);
                        const isFlat = Math.abs(maxVal - minVal) < 0.001;
                        const svgWidth = Math.max(320, pts.length * 105);
                        const padX = 50;

                        const coords = pts.map((pt, i) => {
                          const x = padX + i * ((svgWidth - padX * 2) / Math.max(1, pts.length - 1));
                          let y = 45;
                          if (!isFlat) {
                            // Mapeia valor entre y=34 (pico superior, deixando 34px livres no topo para rótulo 18px) e y=56 (base)
                            y = 56 - ((pt.value - minVal) / (maxVal - minVal)) * 22;
                          }
                          return { x, y, pt };
                        });

                        // Curva Bezier cúbica suave ligando todos os pontos cronológicos consecutivos
                        let curvePath = `M ${coords[0].x} ${coords[0].y}`;
                        for (let i = 0; i < coords.length - 1; i++) {
                          const p0 = coords[i];
                          const p1 = coords[i + 1];
                          const midX = p0.x + (p1.x - p0.x) * 0.5;
                          curvePath += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
                        }

                        const firstCoord = coords[0];
                        const lastCoord = coords[coords.length - 1];
                        const areaPath = `${curvePath} L ${lastCoord.x} 64 L ${firstCoord.x} 64 Z`;

                        return (
                          <div className={`w-full mt-2 mb-1 ${pts.length > 3 ? 'overflow-x-auto no-scrollbar' : 'overflow-visible'}`}>
                            <div
                              className="h-[84px] px-1"
                              style={{ minWidth: pts.length > 3 ? `${svgWidth}px` : '100%' }}
                            >
                              <svg viewBox={`0 0 ${svgWidth} 84`} className="w-full h-full ml-0 pt-0 overflow-visible">
                                <defs>
                                  <linearGradient id={`grad-eval-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#5eea8f" stopOpacity={isFlat ? '0.15' : '0.45'} />
                                    <stop offset="45%" stopColor="#5eea8f" stopOpacity={isFlat ? '0.06' : '0.22'} />
                                    <stop offset="85%" stopColor="#5eea8f" stopOpacity={isFlat ? '0.01' : '0.05'} />
                                    <stop offset="100%" stopColor="#5eea8f" stopOpacity="0.0" />
                                  </linearGradient>
                                  <filter id={`glow-eval-${item.id}`} x="-10%" y="-10%" width="120%" height="130%">
                                    <feDropShadow dx="0" dy="2" stdDeviation={isFlat ? '3' : '2.5'} floodColor="#5eea8f" floodOpacity={isFlat ? '0.45' : '0.3'} />
                                  </filter>
                                </defs>

                                <line x1="10" y1="32" x2={svgWidth - 10} y2="32" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                                <line x1="10" y1="60" x2={svgWidth - 10} y2="60" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                                <path d={areaPath} fill={`url(#grad-eval-${item.id})`} />

                                {coords.map((c, i) => (
                                  <line
                                    key={`beam-${i}`}
                                    x1={c.x}
                                    y1={c.y + 2}
                                    x2={c.x}
                                    y2={63}
                                    stroke="#5eea8f"
                                    strokeWidth="1"
                                    strokeDasharray="2 3"
                                    strokeOpacity={0.25}
                                  />
                                ))}

                                <path
                                  d={curvePath}
                                  fill="none"
                                  stroke="#5eea8f"
                                  strokeWidth={isFlat ? '4.5' : '4'}
                                  strokeOpacity={isFlat ? 0.35 : 0.2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />

                                <path
                                  d={curvePath}
                                  fill="none"
                                  stroke="#5eea8f"
                                  strokeWidth={isFlat ? '3' : '2.5'}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  filter={`url(#glow-eval-${item.id})`}
                                />

                                {coords.map((c, i) => (
                                  <g key={i}>
                                    <circle cx={c.x} cy={c.y} r="6.5" fill="#5eea8f" fillOpacity="0.2" />
                                    <circle cx={c.x} cy={c.y} r="4" fill="#5eea8f" stroke="#14142a" strokeWidth="2" />
                                    <circle cx={c.x} cy={c.y} r="1.5" fill="#ffffff" />

                                    <text
                                      x={c.x}
                                      y={c.y - 11}
                                      fill="#ffffff"
                                      fontSize="18"
                                      fontWeight="bold"
                                      textAnchor="middle"
                                    >
                                      {c.pt.shortLabel}
                                    </text>

                                    <text
                                      x={c.x}
                                      y="77"
                                      fill="#e0e0ed"
                                      fontSize="14"
                                      fontWeight="normal"
                                      textAnchor="middle"
                                    >
                                      {c.pt.date}
                                    </text>
                                  </g>
                                ))}
                              </svg>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Orientativo pré-visualização ao clicar em Visualizar */}
      {pendingAssessmentForGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none font-['Plus_Jakarta_Sans',sans-serif] animate-fadeIn"
          onClick={() => setPendingAssessmentForGuide(null)}
        >
          <div
            className="w-full max-w-[420px] bg-[#0d1b36] border border-white/30 rounded-2xl p-5 shadow-2xl relative animate-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão fechar (X) no topo direito */}
            <button
              type="button"
              onClick={() => setPendingAssessmentForGuide(null)}
              className="absolute top-4 right-4 text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 text-xl cursor-pointer transition"
              title="Fechar"
            >
              <i className="ti ti-x"></i>
            </button>

            {/* Ícone 'i' em tamanho médio com tipografia e bordas idênticas */}
            <div className="flex flex-col items-center text-center pt-1">
              <div className="w-12 h-12 rounded-full bg-[#132247] border-2 border-white/40 flex items-center justify-center text-white text-[24px] font-serif italic font-bold shadow-lg mb-3">
                i
              </div>
              <h3 className="text-[20px] font-bold text-white mb-2 leading-snug">
                Como ler sua avaliação
              </h3>
              <p className="text-[17px] text-[#e0e0ed] leading-relaxed text-justify px-1">
                Ao longo do seu laudo, clique em cada letrinha <strong className="text-white font-semibold">“i”</strong> para conferir o que cada indicador significa, qual é o valor de referência ideal e dicas práticas para o seu dia a dia.
              </p>
            </div>

            {/* Rodapé com botões no canto inferior direito */}
            <div className="pt-2 border-t border-white/15 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingAssessmentForGuide(null)}
                className="h-[38px] px-4 rounded-xl text-white/80 hover:text-white hover:bg-white/10 text-[15px] font-medium transition cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = pendingAssessmentForGuide;
                  setPendingAssessmentForGuide(null);
                  setSelectedAssessment(target);
                }}
                className="h-[38px] px-5 rounded-xl bg-[#0f7a3a] hover:bg-[#128d43] text-white border border-[#0f7a3a] text-[15px] font-semibold cursor-pointer active:scale-95 transition inline-flex items-center gap-1.5 shadow-md"
              >
                <span>Ver Resultados</span>
                <i className="ti ti-arrow-right text-[16px]"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de visualização na tela da Avaliação Física */}
      {selectedAssessment && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none font-['Plus_Jakarta_Sans',sans-serif]"
          onClick={() => {
            setActiveInfoCard(null);
            setSelectedAssessment(null);
          }}
        >
          <div 
            className="relative w-full max-w-full sm:max-w-[480px] bg-[#111524] border-[1px] border-white/40 rounded-t-[28px] sm:rounded-[28px] p-4 sm:p-5 shadow-2xl animate-in slide-in-from-bottom-6 duration-200 flex flex-col max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Modal */}
            <div className="flex justify-between items-start pb-[5px] border-b border-white/10 mb-2.5 shrink-0">
              <div className="flex flex-col min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5eea8f] shrink-0"></span>
                  <span className="text-[19px] font-['Cormorant_Garamond',serif] font-bold text-white uppercase truncate">
                    {selectedAssessment.title || 'Avaliação Corporal'}
                  </span>
                </div>
                <span className="text-[18px] text-[#5eea8f] font-medium pl-4 mt-0.5">
                  {selectedAssessment.dateStr.startsWith('Data:') ? selectedAssessment.dateStr : `Data: ${selectedAssessment.dateStr}`}
                </span>
              </div>
              <button 
                onClick={() => {
                  setActiveInfoCard(null);
                  setSelectedAssessment(null);
                }}
                className="text-[#e0e0ed] hover:text-white p-1 text-2xl cursor-pointer shrink-0"
              >
                <i className="ti ti-x"></i>
              </button>
            </div>

            {/* Legenda Superior das 3 Cores (Ideal, Atenção, Alerta) com quadrados de cor em dobro de tamanho */}
            <div className="flex items-center justify-center gap-5 pt-[7px] pb-[7px] mb-[8px] rounded-xl bg-white/[0.03] border border-white/10 shrink-0">
              <div className="flex items-center gap-2 text-[16px] font-medium text-[#d5dee4]">
                <span className="w-6 h-6 rounded-[6px] bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0"></span>
                <span className="text-[16px]">Ideal</span>
              </div>
              <div className="flex items-center gap-2 text-[16px] font-medium text-[#d5dee4]">
                <span className="w-6 h-6 rounded-[6px] bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.5)] shrink-0"></span>
                <span className="text-[16px]">Atenção</span>
              </div>
              <div className="flex items-center gap-2 text-[15px] font-medium text-[#d5dee4]">
                <span className="w-6 h-6 rounded-[6px] bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.5)] shrink-0"></span>
                <span className="text-[15px]">Alerta</span>
              </div>
            </div>

            {/* Corpo Rolável com Motor Completo de Cálculo, Barras Suaves, Mapa Corporal e Checklist Clínico */}
            {(() => {
              const report = calculateFullAnthropometry(selectedAssessment.metrics || {}, patient);

              const getGradientByMode = (mode: BarSpectrumMode): string => {
                if (mode === 'bilateral') {
                  // Vermelho -> Amarelo -> Verde -> Amarelo -> Vermelho com transição contínua suave
                  return 'linear-gradient(90deg, #ef4444 0%, #ef4444 12%, #f59e0b 24%, #f59e0b 31%, #10b981 41%, #10b981 59%, #f59e0b 69%, #f59e0b 76%, #ef4444 88%, #ef4444 100%)';
                }
                if (mode === 'low-is-good') {
                  // Verde -> Amarelo -> Vermelho com transição contínua suave
                  return 'linear-gradient(90deg, #10b981 0%, #10b981 38%, #f59e0b 52%, #f59e0b 66%, #ef4444 80%, #ef4444 100%)';
                }
                if (mode === 'high-is-good') {
                  // Vermelho -> Amarelo -> Verde com transição contínua suave
                  return 'linear-gradient(90deg, #ef4444 0%, #ef4444 18%, #f59e0b 32%, #f59e0b 46%, #10b981 60%, #10b981 100%)';
                }
                return 'none';
              };

              const getZoneColors = (status: ClinicalZoneStatus) => {
                if (status === 'ideal') {
                  return {
                    ring: 'border-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.85)]',
                    btnText: 'text-[#047857] border-[#10b981]/60'
                  };
                }
                if (status === 'atencao') {
                  return {
                    ring: 'border-[#f59e0b] shadow-[0_0_10px_rgba(245,158,11,0.85)]',
                    btnText: 'text-[#b45309] border-[#f59e0b]/60'
                  };
                }
                if (status === 'alerta') {
                  return {
                    ring: 'border-[#ef4444] shadow-[0_0_10px_rgba(239,68,68,0.85)]',
                    btnText: 'text-[#dc2626] border-[#ef4444]/60'
                  };
                }
                return {
                  ring: 'border-white/40',
                  btnText: 'text-[#111524] border-white/80'
                };
              };

              const bm = report.bodyMapValues;
              const maleHead = "M100,20 C115,20 125,30 125,45 C125,60 115,70 100,70 C85,70 75,60 75,45 C75,30 85,20 100,20 Z";
              const maleBody = "M100,75 L130,90 C145,100 155,110 160,150 L165,240 L145,250 L140,160 L130,260 L125,450 L105,450 L105,300 L95,300 L95,450 L75,450 L70,260 L60,160 L55,250 L35,240 L40,150 C45,110 55,100 70,90 L100,75 Z";
              const femaleHead = "M100,25 C112,25 120,35 120,45 C120,55 112,65 100,65 C88,65 80,55 80,45 C80,35 88,25 100,25 Z";
              const femaleBody = "M100,70 L125,85 C140,95 150,110 152,140 L158,230 L142,235 L138,150 L132,240 L128,450 L108,450 L105,320 L95,320 L92,450 L72,450 L68,240 L62,150 L58,235 L42,230 L48,140 C50,110 60,95 75,85 L100,70 Z";

              return (
                <div className="space-y-4 py-1 text-[16px] overflow-y-auto no-scrollbar pr-0.5 grow">
                  {report.groups.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-2.5">
                      <div className="text-[14px] font-bold text-[#5eea8f] uppercase tracking-[0.06em] px-1 pt-1">
                        {group.title}
                      </div>

                      <div className="space-y-2.5">
                        {group.items.map((item) => {
                          const isMissing = item.valueDisplay === '-';
                          const zColors = getZoneColors(item.zoneStatus);
                          const hasBar = item.barMode !== 'none';

                          return (
                            <div 
                              key={item.id} 
                              className="bg-[#181f32] px-4 py-3.5 rounded-2xl border border-white/15 shadow-sm space-y-1.5"
                            >
                              {/* Linha 1: Título em 18px + Botão (i) ampliado em 30% + Strong com fundo branco #ffffff e borda enxuta (altura 30px, min-width 87.3px, padding exato) */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-white font-bold text-[18px] leading-snug">
                                    {item.title}
                                  </span>
                                  {item.infoText && (
                                    <button
                                      type="button"
                                      onClick={() => setActiveInfoCard({ title: item.title, text: item.infoText })}
                                      title={`Entenda o que é ${item.title}`}
                                      aria-label={`Informações sobre ${item.title}`}
                                      className="w-[31px] h-[31px] rounded-full bg-[#0d1b36] hover:bg-[#162d59] border border-white/35 text-white flex items-center justify-center text-[16px] font-serif italic font-bold transition active:scale-95 cursor-pointer shrink-0 shadow-sm"
                                    >
                                      i
                                    </button>
                                  )}
                                  {item.ageTag && (
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shrink-0">
                                      {item.ageTag}
                                    </span>
                                  )}
                                </div>

                                <strong className={`h-[30px] min-w-[87.3px] px-[10px] pt-0 pb-[2px] inline-flex items-center justify-center bg-[#ffffff] rounded-lg border text-[18px] font-extrabold shrink-0 tracking-tight shadow-xs ${
                                  isMissing ? 'text-[#111524] border-white/80' : zColors.btnText
                                }`}>
                                  {item.valueDisplay}
                                </strong>
                              </div>

                              {/* Linha 2: Referência Ideal em 17px Itálico e Cor #f4e8e8 de Alto Contraste */}
                              <div className="text-[17px] italic text-[#f4e8e8] border-[#f4e8e8] leading-snug">
                                {item.referenceText}
                              </div>

                              {/* Linha 3: Barra Horizontal de Espectro Contínuo (3 Cores) com Indicador Circular */}
                              {hasBar && (
                                <div className="pt-2 pb-1">
                                  <div 
                                    className={`relative w-full h-3 rounded-full ${isMissing ? 'opacity-25' : 'opacity-95'}`}
                                    style={{ background: getGradientByMode(item.barMode) }}
                                  >
                                    {!isMissing && item.markerPercent !== null && (
                                      <div
                                        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[18px] h-[18px] rounded-full bg-white border-[3.5px] transition-all duration-300 ${zColors.ring}`}
                                        style={{ left: `${item.markerPercent}%` }}
                                      />
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Seção Especial: Mapa de Composição Corporal (Silhueta Anatômica com fontes em 16px) */}
                  <div className="space-y-2 pt-2">
                    <div className="text-[14px] font-bold text-[#5eea8f] uppercase tracking-[0.06em] px-1">
                      Mapa de Composição Corporal
                    </div>
                    <div className="bg-[#181f32] rounded-2xl border border-white/15 p-3 flex justify-center items-center">
                      <svg viewBox="0 0 420 500" className="w-full max-w-[370px] h-auto overflow-visible">
                        <g transform="translate(110,10)">
                          <path d={bm.isFemale ? femaleHead : maleHead} fill="rgba(255,255,255,0.14)" stroke="rgba(94,234,143,0.35)" strokeWidth="1.5" />
                          <path d={bm.isFemale ? femaleBody : maleBody} fill="rgba(255,255,255,0.14)" stroke="rgba(94,234,143,0.35)" strokeWidth="1.5" />
                        </g>
                        {[
                          { id: 'musc', label: 'Massa Muscular', val: bm.musc, color: '#5eea8f', x1: 120, y1: 115, x2: 155, y2: 140, align: 'end' as const, dash: false },
                          { id: 'gord', label: 'Gordura Corporal', val: bm.gord, color: '#fbbf24', x1: 120, y1: 210, x2: 145, y2: 210, align: 'end' as const, dash: false },
                          { id: 'visc', label: 'Gordura Visceral', val: bm.visc !== '-' ? `Nível ${bm.visc}` : '-', color: '#f87171', x1: 120, y1: 340, x2: 210, y2: 250, align: 'end' as const, dash: true },
                          { id: 'brac', label: 'Braço', val: bm.brac, color: '#60a5fa', x1: 300, y1: 135, x2: 245, y2: 150, align: 'start' as const, dash: false },
                          { id: 'cint', label: 'Cintura', val: bm.cint, color: '#60a5fa', x1: 300, y1: 195, x2: 220, y2: 200, align: 'start' as const, dash: false },
                          { id: 'abdo', label: 'Abdominal', val: bm.abdo, color: '#60a5fa', x1: 300, y1: 240, x2: 220, y2: 230, align: 'start' as const, dash: false },
                          { id: 'quad', label: 'Quadril', val: bm.quad, color: '#60a5fa', x1: 300, y1: 290, x2: 220, y2: 260, align: 'start' as const, dash: false },
                          { id: 'coxa', label: 'Coxa', val: bm.coxa, color: '#60a5fa', x1: 300, y1: 360, x2: 230, y2: 320, align: 'start' as const, dash: false },
                          { id: 'pant', label: 'Panturrilha', val: bm.pant, color: '#60a5fa', x1: 300, y1: 440, x2: 235, y2: 410, align: 'start' as const, dash: false }
                        ].map((mItem) => {
                          const textX = mItem.align === 'end' ? 112 : 308;
                          const offsetTitle = mItem.id === 'visc' ? 18 : -16;
                          const offsetVal = mItem.id === 'visc' ? 38 : 4;
                          return (
                            <g key={mItem.id}>
                              <line
                                x1={mItem.x1}
                                y1={mItem.y1}
                                x2={mItem.x2}
                                y2={mItem.y2}
                                stroke="rgba(255,255,255,0.45)"
                                strokeWidth="1.2"
                                strokeDasharray={mItem.dash ? '4' : undefined}
                              />
                              <circle cx={mItem.x2} cy={mItem.y2} r="3.5" fill="#5eea8f" />
                              <text
                                x={textX}
                                y={mItem.y1 + offsetTitle}
                                textAnchor={mItem.align}
                                fontSize="16"
                                fill="#d5dee4"
                                fontWeight="600"
                              >
                                {mItem.label}
                              </text>
                              <text
                                x={textX}
                                y={mItem.y1 + offsetVal}
                                textAnchor={mItem.align}
                                fontSize="16"
                                fill={mItem.color}
                                fontWeight="800"
                              >
                                {mItem.val}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* Seção Especial: CHECKLIST CLÍNICO Consolidado em Linha Limpa com Rodapé Orientativo */}
                  {report.checklist.length > 0 && (
                    <div className="space-y-3 pt-2 pb-1">
                      <div className="text-[15px] font-bold text-[#5eea8f] uppercase tracking-[0.06em] px-1">
                        CHECKLIST CLÍNICO
                      </div>
                      <div className="bg-[#181f32] rounded-2xl border border-white/15 divide-y divide-white/10 overflow-hidden">
                        {report.checklist.map((chk, cIdx) => {
                          const isIdeal = chk.status === 'ideal';
                          const isWarn = chk.status === 'atencao';
                          const isNeutral = chk.status === 'neutral';
                          const badgeBg = isNeutral
                            ? 'bg-white/10 text-[#e0e0ed] border-white/25'
                            : isIdeal
                            ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/40'
                            : isWarn
                            ? 'bg-[#f59e0b]/20 text-[#fbbf24] border-[#f59e0b]/40'
                            : 'bg-[#ef4444]/20 text-[#f87171] border-[#ef4444]/40';
                          const iconSym = isNeutral ? '-' : isIdeal ? '✔' : isWarn ? '!' : '✖';

                          return (
                            <div key={cIdx} className="flex items-center justify-between px-4 py-3 gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-[13px] font-bold shrink-0 ${badgeBg}`}>
                                  {iconSym}
                                </span>
                                <span className="text-[17px] font-bold text-white truncate">
                                  {chk.label}
                                </span>
                              </div>
                              <span className={`text-[15px] font-bold shrink-0 px-2.5 py-0.5 rounded-md ${
                                isNeutral
                                  ? 'text-[#e0e0ed] bg-white/5'
                                  : isIdeal
                                  ? 'text-[#5eea8f] bg-[#10b981]/15'
                                  : isWarn
                                  ? 'text-[#fbbf24] bg-[#f59e0b]/15'
                                  : 'text-[#f87171] bg-[#ef4444]/15'
                              }`}>
                                {chk.value}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Card de Rodapé Orientativo e Acolhedor */}
                      <div className="bg-white/[0.03] border border-white/15 rounded-2xl p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#5eea8f]/10 border border-[#5eea8f]/30 flex items-center justify-center text-[#5eea8f] shrink-0 mt-0.5">
                          <i className="ti ti-heart-handshake text-[18px]"></i>
                        </div>
                        <p className="text-[16px] text-[#e0e0ed] leading-relaxed text-justify max-w-[264px] w-[264px] -mr-[4px]">
                          Converse com o profissional que o acompanha para alinhar estratégias personalizadas de acordo com o seu momento atual.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Sub-Modal de Explicação Básica ao clicar no botão "i" (Fundo Azul-Marinho #0d1b36 e Fonte 18px Branca) */}
            {activeInfoCard && (
              <div
                className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
                onClick={() => setActiveInfoCard(null)}
              >
                <div
                  className="w-full max-w-[400px] bg-[#0d1b36] border border-white/30 rounded-2xl p-5 shadow-2xl space-y-3 animate-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/15">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-white/15 border border-white/35 text-white flex items-center justify-center text-[13px] font-serif italic font-bold shrink-0">
                        i
                      </span>
                      <h4 className="text-[18px] font-bold text-white leading-snug truncate">
                        {activeInfoCard.title}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveInfoCard(null)}
                      className="text-white/80 hover:text-white p-1 text-xl cursor-pointer shrink-0"
                    >
                      <i className="ti ti-x"></i>
                    </button>
                  </div>
                  <p className="text-[18px] not-italic font-normal text-white leading-relaxed">
                    {activeInfoCard.text}
                  </p>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveInfoCard(null)}
                      className="h-[38px] px-5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/30 text-[15px] font-semibold cursor-pointer active:scale-95 transition"
                    >
                      Entendi
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-white/10 flex justify-end shrink-0">
              <button
                onClick={() => {
                  setActiveInfoCard(null);
                  setSelectedAssessment(null);
                }}
                className="h-[36px] min-h-[36px] px-5 rounded-xl bg-[#5eea8f]/15 hover:bg-[#5eea8f]/25 text-[#5eea8f] border border-[#5eea8f]/30 text-[15px] font-semibold cursor-pointer active:scale-95 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

