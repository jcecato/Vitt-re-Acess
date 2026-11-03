import React from 'react';
import { PatientProfile, AssessmentComparisonMetric } from '../../types/patient';

interface PhysicalAssessmentTabProps {
  patient: PatientProfile;
  onOpenPdf: (title: string) => void;
}

export const PhysicalAssessmentTab: React.FC<PhysicalAssessmentTabProps> = ({
  patient,
  onOpenPdf
}) => {
  const isExpired = (patient.daysToComplete ?? 0) <= 0;
  const [selectedAssessment, setSelectedAssessment] = React.useState<string | null>(null);

  // Extração das datas das avaliações realizadas para sincronizar os pontos da curva
  const dateInitial = patient.physicalAssessments?.[0]?.dateStr?.replace('Data: ', '') || '27/09/2026';
  const dateRecent = patient.physicalAssessments?.[1]?.dateStr?.replace('Data: ', '')?.replace('Aguardando laudo', '28/10/2026') || '28/10/2026';

  // Métricas temporárias parametrizadas para comparação de avaliações feitas duas vezes
  // Preparado de ponta a ponta: quando o CRM enviar a lista completa, ela substitui automaticamente
  const defaultComparisons: AssessmentComparisonMetric[] = [
    {
      id: 'comp-peso-atual',
      name: 'Peso Atual',
      reference: 'Meta clínica: 75,0 kg',
      unit: 'kg',
      higherIsBetter: false,
      points: [
        { date: dateInitial, value: 82.5, valueDisplay: '82,5 kg' },
        { date: dateRecent, value: 78.8, valueDisplay: '78,8 kg' }
      ]
    },
    {
      id: 'comp-peso-ideal',
      name: 'Peso Ideal',
      reference: 'Faixa estipulada clínica',
      unit: 'kg',
      points: [
        { date: dateInitial, value: 74.0, valueDisplay: '74,0 kg' },
        { date: dateRecent, value: 74.0, valueDisplay: '74,0 kg' }
      ]
    },
    {
      id: 'comp-imc',
      name: 'IMC',
      reference: 'Ref. 18,5 – 24,9 kg/m²',
      unit: 'kg/m²',
      higherIsBetter: false,
      points: [
        { date: dateInitial, value: 27.2, valueDisplay: '27,2' },
        { date: dateRecent, value: 25.8, valueDisplay: '25,8' }
      ]
    },
    {
      id: 'comp-gordura',
      name: '% de Gordura',
      reference: 'Meta clínica: < 20%',
      unit: '%',
      higherIsBetter: false,
      points: [
        { date: dateInitial, value: 26.5, valueDisplay: '26,5%' },
        { date: dateRecent, value: 22.8, valueDisplay: '22,8%' }
      ]
    },
    {
      id: 'comp-massa-muscular',
      name: '% de Massa Muscular',
      reference: 'Meta clínica: > 35%',
      unit: '%',
      higherIsBetter: true,
      points: [
        { date: dateInitial, value: 34.2, valueDisplay: '34,2%' },
        { date: dateRecent, value: 36.4, valueDisplay: '36,4%' }
      ]
    },
    {
      id: 'comp-circunferencia',
      name: 'Circunferência Abdominal',
      reference: 'Ref. < 94 cm',
      unit: 'cm',
      higherIsBetter: false,
      points: [
        { date: dateInitial, value: 94.0, valueDisplay: '94 cm' },
        { date: dateRecent, value: 88.0, valueDisplay: '88 cm' }
      ]
    }
  ];

  // Se o CRM enviar patient.physicalAssessmentComparisons customizado, consome direto
  const comparisons: AssessmentComparisonMetric[] =
    patient.physicalAssessmentComparisons && patient.physicalAssessmentComparisons.length > 0
      ? patient.physicalAssessmentComparisons
      : defaultComparisons;

  return (
    <div className="space-y-4 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      {/* Seção 1: Lista de Avaliações Físicas cadastradas */}
      <div>
        <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] mb-3">
          Resultado da avaliação física
        </div>

        <div className="space-y-4">
          {patient.physicalAssessments.map((item, index) => {
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
                className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 shadow-sm"
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
                  {isReady && (
                    <span className="text-[14px] font-semibold text-white px-2 py-0.5 rounded bg-[#0f7a3a] shrink-0 uppercase tracking-wider">
                      laudo
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-white/[0.05]">
                  {isReady ? (
                    <>
                      {/* PDF: bloqueado com cadeado caso ciclo expire */}
                      {isExpired ? (
                        <div className="relative inline-block" title="Download em PDF bloqueado após conclusão do ciclo">
                          <button
                            disabled
                            className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-[#e0e0ed] opacity-60 cursor-not-allowed"
                          >
                            <i className="ti ti-file-type-pdf text-[17px]"></i>
                            <span>PDF</span>
                          </button>
                          <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#24141d] border border-[#ff5f5f] flex items-center justify-center text-[14px] text-[#ff5f5f] shadow-md">
                            <i className="ti ti-lock"></i>
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => onOpenPdf(item.title)}
                          className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3 rounded-xl bg-[#5eea8f]/10 border border-[#5eea8f]/35 text-[#5eea8f] hover:bg-[#5eea8f]/20 active:scale-95 transition cursor-pointer"
                        >
                          <i className="ti ti-file-type-pdf text-[17px]"></i>
                          <span>PDF</span>
                        </button>
                      )}

                      {/* Visualizar na tela: sempre acessível para o paciente */}
                      <button
                        onClick={() => setSelectedAssessment(item.title)}
                        className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3 rounded-xl bg-[#0f7a3a] border border-[#0f7a3a] text-white hover:bg-[#128d43] active:scale-95 transition cursor-pointer"
                      >
                        <i className="ti ti-eye text-[17px]"></i>
                        <span>Visualizar</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        disabled
                        className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3 rounded-xl bg-white/[0.03] border border-dashed border-white/15 text-[#e0e0ed] opacity-50 cursor-default"
                      >
                        <i className="ti ti-file-type-pdf text-[17px]"></i>
                        <span>PDF</span>
                      </button>
                      <button
                        disabled
                        className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3 rounded-xl bg-white/[0.03] border border-dashed border-white/15 text-[#e0e0ed] opacity-50 cursor-default"
                      >
                        <i className="ti ti-eye text-[17px]"></i>
                        <span>Visualizar</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seção 2: Comparativo no final com gráfico de curva e datas */}
      <div className="pt-2">
        <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] mb-1">
          Evolução das Avaliações Físicas
        </div>
        <div className="text-[18px] text-[#e0e0ed] leading-relaxed mb-3">
          Comparativo entre avaliações com curva evolutiva por data.
        </div>

        <div className="space-y-4">
          {comparisons
            .filter((item) => item.points && item.points.length > 1)
            .map((item) => {
              // Ordenação cronológica dos pontos para cálculo seguro
              const parsePtDate = (dStr: string): number => {
                const match = dStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                if (!match) return 0;
                return new Date(parseInt(match[3], 10), parseInt(match[2], 10) - 1, parseInt(match[1], 10)).getTime();
              };

              const sortedPoints = [...item.points].sort((a, b) => parsePtDate(a.date) - parsePtDate(b.date));
              const firstPoint = sortedPoints[0];
              const lastPoint = sortedPoints[sortedPoints.length - 1];

              // Cálculo automático da variação percentual
              let pctChange = 0;
              if (firstPoint && firstPoint.value > 0 && lastPoint) {
                pctChange = ((lastPoint.value - firstPoint.value) / firstPoint.value) * 100;
              }

              const absPct = Math.abs(pctChange);
              const formattedPct = absPct.toFixed(1);

              // Avaliação de melhoria clínica:
              // Para peso, gordura, IMC e cintura: redução é positiva
              // Para massa muscular: aumento é positivo
              const higherIsBetter = item.higherIsBetter === true;

              let arrow = '↔';
              let badgeColor = 'text-[#e0e0ed] bg-white/[0.05] border-white/10';

              if (pctChange < -0.1) {
                arrow = '↓';
                badgeColor = !higherIsBetter
                  ? 'text-[#5eea8f] bg-[#5eea8f]/10 border-[#5eea8f]/25'
                  : 'text-[#e57373] bg-[#e57373]/10 border-[#e57373]/25';
              } else if (pctChange > 0.1) {
                arrow = '↑';
                badgeColor = higherIsBetter
                  ? 'text-[#5eea8f] bg-[#5eea8f]/10 border-[#5eea8f]/25'
                  : 'text-[#f5a623] bg-[#f5a623]/10 border-[#f5a623]/25';
              } else {
                arrow = '↔';
                badgeColor = 'text-[#e0e0ed] bg-white/[0.05] border-white/10';
              }

              return (
                <div
                  key={item.id}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3.5 shadow-sm"
                >
                  {/* Linha superior: Nome em 19px/218px, Ref em 17px abaixo e Badge calculada em 18px */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-col min-w-0 pr-1">
                      <strong 
                        style={{ paddingLeft: '0px' }}
                        className="text-white font-semibold text-[19px] leading-tight w-[218px] max-w-full break-words"
                      >
                        {item.name}
                      </strong>
                      {item.reference && (
                        <span className="text-[#e0e0ed] text-[17px] font-normal leading-snug mt-0.5">
                          {item.reference}
                        </span>
                      )}
                    </div>

                    <span className={`text-[18px] font-semibold border px-2.5 py-0.5 rounded-lg shrink-0 flex items-center gap-1.5 ${badgeColor}`}>
                      <span className="text-[20px] leading-none font-bold">{arrow}</span>
                      <span>{formattedPct}%</span>
                    </span>
                  </div>

                  {/* Gráfico horizontal com curva SVG, gradiente suave e datas nos pontos */}
                  {(() => {
                    const values = sortedPoints.map((p) => p.value);
                    const minVal = Math.min(...values);
                    const maxVal = Math.max(...values);
                    const isFlat = Math.abs(maxVal - minVal) < 0.001;

                    // Coordenadas calculadas para visualização agradável e harmônica da curva
                    const coords = sortedPoints.map((pt, i) => {
                      const x = 50 + i * (220 / Math.max(1, sortedPoints.length - 1));
                      let y = 30;
                      if (!isFlat) {
                        // Mapeia valor entre y=18 (pico superior) e y=40 (base inferior)
                        y = 40 - ((pt.value - minVal) / (maxVal - minVal)) * 22;
                      }
                      return { x, y, pt };
                    });

                    // Curva Bezier suave conectando os pontos
                    const start = coords[0];
                    const end = coords[coords.length - 1];
                    const cX1 = start.x + (end.x - start.x) * 0.5;
                    const cY1 = start.y;
                    const cX2 = start.x + (end.x - start.x) * 0.5;
                    const cY2 = end.y;

                    const curvePath = coords.length === 2
                      ? `M ${start.x} ${start.y} C ${cX1} ${cY1}, ${cX2} ${cY2}, ${end.x} ${end.y}`
                      : coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

                    const areaPath = `${curvePath} L ${end.x} 48 L ${start.x} 48 Z`;

                    return (
                      <div className="w-full h-16 px-1 my-1">
                        <svg viewBox="0 0 320 64" className="w-full h-full overflow-visible">
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

                          {/* Linhas de referência horizontal sutis */}
                          <line x1="10" y1="16" x2="310" y2="16" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                          <line x1="10" y1="44" x2="310" y2="44" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                          {/* Área com gradiente vertical translúcido */}
                          <path d={areaPath} fill={`url(#grad-eval-${item.id})`} />

                          {/* Feixe suave vertical descendo de cada ponto para o baseline */}
                          {coords.map((c, i) => (
                            <line
                              key={`beam-${i}`}
                              x1={c.x}
                              y1={c.y + 2}
                              x2={c.x}
                              y2={46}
                              stroke="#5eea8f"
                              strokeWidth="1"
                              strokeDasharray="2 3"
                              strokeOpacity={0.25}
                            />
                          ))}

                          {/* Halo emissivo inferior para garantir espessura e presença visual */}
                          <path
                            d={curvePath}
                            fill="none"
                            stroke="#5eea8f"
                            strokeWidth={isFlat ? '4.5' : '4'}
                            strokeOpacity={isFlat ? 0.35 : 0.2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Linha da curva principal com brilho e espessura destacada */}
                          <path
                            d={curvePath}
                            fill="none"
                            stroke="#5eea8f"
                            strokeWidth={isFlat ? '3' : '2.5'}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter={`url(#glow-eval-${item.id})`}
                          />

                          {/* Bullet points com valores acima e datas abaixo */}
                            {coords.map((c, i) => {
                              const numericOnly = c.pt.valueDisplay
                                ? c.pt.valueDisplay.split(' ')[0]
                                : String(c.pt.value);

                              return (
                                <g key={i}>
                                  {/* Halo exterior suave */}
                                  <circle cx={c.x} cy={c.y} r="6.5" fill="#5eea8f" fillOpacity="0.2" />
                                  {/* Bullet principal */}
                                  <circle cx={c.x} cy={c.y} r="4" fill="#5eea8f" stroke="#14142a" strokeWidth="2" />
                                  <circle cx={c.x} cy={c.y} r="1.5" fill="#ffffff" />

                                  {/* Apenas o número acima do ponto com fonte nítida */}
                                  <text
                                    x={c.x}
                                    y={c.y - 10}
                                    fill="#ffffff"
                                    fontSize="18"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {numericOnly}
                                  </text>

                                  {/* Data abaixo do gráfico em 14px legível */}
                                  <text
                                    x={c.x}
                                    y="58"
                                    fill="#e0e0ed"
                                    fontSize="14"
                                    fontWeight="normal"
                                    textAnchor="middle"
                                  >
                                    {c.pt.date}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
        </div>
      </div>

      {/* Modal de visualização na tela da Avaliação Física */}
      {selectedAssessment && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none font-['Plus_Jakarta_Sans',sans-serif]"
          onClick={() => setSelectedAssessment(null)}
        >
          <div 
            className="w-full max-w-full sm:max-w-[440px] bg-[#14142a] border-t sm:border border-white/20 rounded-t-[28px] sm:rounded-[28px] p-5 shadow-2xl animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5eea8f]"></span>
                <span className="text-[18px] font-['Cormorant_Garamond',serif] font-medium text-white">
                  {selectedAssessment}
                </span>
              </div>
              <button 
                onClick={() => setSelectedAssessment(null)}
                className="text-[#e0e0ed] hover:text-white p-1 text-2xl cursor-pointer"
              >
                <i className="ti ti-x"></i>
              </button>
            </div>

            <div className="space-y-2.5 py-1 text-[16px]">
              <div className="bg-white/[0.04] p-3 rounded-xl border border-white/10 flex justify-between items-center">
                <span className="text-[#a5a4b8]">Peso Corporal</span>
                <strong className="text-white text-[18px]">{patient.progress.currentWeight} kg</strong>
              </div>
              <div className="bg-white/[0.04] p-3 rounded-xl border border-white/10 flex justify-between items-center">
                <span className="text-[#a5a4b8]">Percentual de Gordura</span>
                <strong className="text-[#5eea8f] text-[18px]">{patient.progress.bodyFat}%</strong>
              </div>
              <div className="bg-white/[0.04] p-3 rounded-xl border border-white/10 flex justify-between items-center">
                <span className="text-[#a5a4b8]">Massa Muscular</span>
                <strong className="text-white text-[18px]">{patient.progress.muscleMass} kg</strong>
              </div>
              <div className="bg-white/[0.04] p-3 rounded-xl border border-white/10 flex justify-between items-center">
                <span className="text-[#a5a4b8]">Circunferência Abdominal</span>
                <strong className="text-white text-[18px]">{patient.progress.waistCircumference} cm</strong>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedAssessment(null)}
                className="h-[34px] min-h-[34px] max-h-[34px] px-4 rounded-xl bg-[#5eea8f]/15 hover:bg-[#5eea8f]/25 text-[#5eea8f] border border-[#5eea8f]/30 text-[15px] font-semibold cursor-pointer"
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
