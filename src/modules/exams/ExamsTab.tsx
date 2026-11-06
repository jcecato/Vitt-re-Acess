import React, { useState } from 'react';
import { PatientProfile, ExamBatch, BiomarkerComparison } from '../../types/patient';

interface ExamsTabProps {
  patient: PatientProfile;
  onOpenPdf: (title: string) => void;
}

export const ExamsTab: React.FC<ExamsTabProps> = ({ patient, onOpenPdf }) => {
  const isExpired = (patient.daysToComplete ?? 0) <= 0;
  const [selectedBatch, setSelectedBatch] = useState<ExamBatch | null>(null);

  // Lotes/Solicitações de Exames separados individualmente (pronto para sincronização CRM externa)
  const batches: ExamBatch[] = patient.examBatches && patient.examBatches.length > 0
    ? patient.examBatches
    : [];

  // Comparativos históricos de biomarcadores (Glicemia, Insulina, etc.)
  const comparisons: BiomarkerComparison[] = patient.biomarkerComparisons && patient.biomarkerComparisons.length > 0
    ? patient.biomarkerComparisons
    : [];

  return (
    <div className="space-y-4 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      {/* Seção 1: Exames Solicitados */}
      <div>
        <div className="mb-3">
          <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
            Exames Laboratoriais | Hemo Labor™
          </div>
        </div>

        {batches.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/20 rounded-2xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#5eea8f]/10 border border-[#5eea8f]/30 flex items-center justify-center text-[#5eea8f] mx-auto mb-2.5">
              <i className="ti ti-clipboard-list text-2xl"></i>
            </div>
            <div className="text-[18px] font-semibold text-white mb-1">
              Aguardando Liberação Laboratorial
            </div>
            <p className="text-[14px] text-[#a5a4b8] leading-relaxed max-w-[280px] mx-auto">
              Seus laudos e painéis de exames laboratoriais serão sincronizados aqui assim que emitidos pela equipe médica.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {batches.map((batch) => {
            const isReady = batch.status.toLowerCase() === 'laudo' || batch.status.toLowerCase() === 'disponível';

            return (
              <div
                key={batch.id}
                className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-3.5 shadow-sm transition hover:border-white/70"
              >
                {/* Linha Superior: Ícone + Título (Largura Expandida) */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#5eea8f]/15 text-[#5eea8f] flex items-center justify-center text-[20px] shrink-0 mt-0.5">
                    <i className="ti ti-clipboard-list"></i>
                  </div>
                  <div className="grow min-w-0 w-full">
                    {/* Título do Exame com largura total para acomodar nomes longos */}
                    <div className="text-[18px] font-semibold text-white leading-tight uppercase w-full">
                      {batch.title.toLowerCase().includes('bioqu') 
                        ? 'PAINEL [ BIOQUÍMICO COMPLETO ]' 
                        : batch.title.toUpperCase()}
                    </div>

                    {/* Linha 2: Data + Span de Status movido para baixo com alinhamento perfeito */}
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <span className="text-[16px] text-[#e0e0ed] leading-none">
                        Data: {batch.dateStr}
                      </span>
                      <span className="text-[14px] font-semibold text-white px-2.5 py-1 rounded bg-[#0f7a3a] shrink-0 uppercase tracking-wider leading-none">
                        {batch.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Linha de Ações: PDF (com cadeado 50% maior se expirado) e Visualizar */}
                <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-white/[0.05]">
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
                      onClick={() => onOpenPdf(batch.title)}
                      className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3.5 rounded-xl bg-[#5eea8f]/10 border border-[#5eea8f]/35 text-[#5eea8f] hover:bg-[#5eea8f]/20 active:scale-95 transition cursor-pointer"
                    >
                      <i className="ti ti-file-type-pdf text-[17px]"></i>
                      <span>PDF</span>
                    </button>
                  )}

                  {/* Visualizar: Abre o modal 9:16 com os resultados deste lote específico */}
                  <button
                    onClick={() => setSelectedBatch(batch)}
                    className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-1.5 text-[15px] font-medium py-0 px-3.5 rounded-xl bg-[#0f7a3a] border border-[#0f7a3a] text-white hover:bg-[#128d43] active:scale-95 transition cursor-pointer"
                  >
                    <i className="ti ti-eye text-[17px]"></i>
                    <span>Visualizar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Seção 2: Comparativo no final com tabela e gráfico visual (Glicemia, Insulina, etc.) */}
      {comparisons.filter((item) => item.points && item.points.length > 1).length > 0 && (
      <div className="pt-1">
        <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] mb-1">
          Evolução dos Biomarcadores
        </div>
        <div className="text-[18px] text-[#e0e0ed] leading-relaxed mb-2.5">
          Comparativo histórico dos parâmetros laboratoriais.
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

              // Cálculo automático da variação percentual entre o primeiro e o último exame
              let pctChange = 0;
              if (firstPoint && firstPoint.value > 0 && lastPoint) {
                pctChange = ((lastPoint.value - firstPoint.value) / firstPoint.value) * 100;
              }

              const absPct = Math.abs(pctChange);
              const formattedPct = absPct.toFixed(1);

              // Para a maioria dos marcadores (Glicemia, Insulina, Colesterol, Triglicerídeos), a redução representa melhora
              const isReductionGood = !item.name.toLowerCase().includes('vitamina');

              let arrow = '↔';
              let badgeColor = 'text-[#e0e0ed] bg-white/[0.05] border-white/10';

              if (pctChange < -0.05) {
                arrow = '↓';
                badgeColor = isReductionGood
                  ? 'text-[#5eea8f] bg-[#5eea8f]/10 border-[#5eea8f]/25'
                  : 'text-[#e57373] bg-[#e57373]/10 border-[#e57373]/25';
              } else if (pctChange > 0.05) {
                arrow = '↑';
                badgeColor = isReductionGood
                  ? 'text-[#f5a623] bg-[#f5a623]/10 border-[#f5a623]/25'
                  : 'text-[#5eea8f] bg-[#5eea8f]/10 border-[#5eea8f]/25';
              } else {
                arrow = '↔';
                badgeColor = 'text-[#e0e0ed] bg-white/[0.05] border-white/10';
              }

              return (
                <div
                  key={item.id}
                  className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-3.5 shadow-sm"
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
                      <span className="text-[#e0e0ed] text-[17px] font-normal leading-snug mt-0.5">
                        {item.reference}
                      </span>
                    </div>

                    <span className={`text-[18px] font-semibold border px-2.5 py-0.5 rounded-lg shrink-0 flex items-center gap-1.5 ${badgeColor}`}>
                      <span className="text-[20px] leading-none font-bold">{arrow}</span>
                      <span>{formattedPct}%</span>
                    </span>
                  </div>

                  {/* Gráfico horizontal com gradiente moderno: mais denso/brilhante no pico e suave a desaparecer na base */}
                  <div className="w-full h-16 px-1 my-1">
                    <svg viewBox="0 0 320 64" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id={`grad-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5eea8f" stopOpacity="0.45" />
                          <stop offset="45%" stopColor="#5eea8f" stopOpacity="0.22" />
                          <stop offset="85%" stopColor="#5eea8f" stopOpacity="0.05" />
                          <stop offset="100%" stopColor="#5eea8f" stopOpacity="0.0" />
                        </linearGradient>
                        <filter id={`glow-${item.id}`} x="-10%" y="-10%" width="120%" height="130%">
                          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#5eea8f" floodOpacity="0.3" />
                        </filter>
                      </defs>

                      {/* Linha de referência horizontal pontilhada */}
                      <line x1="10" y1="16" x2="310" y2="16" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                      <line x1="10" y1="44" x2="310" y2="44" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                      {(() => {
                        const values = sortedPoints.map((p) => p.value);
                        const minVal = Math.min(...values) * 0.92;
                        const maxVal = Math.max(...values) * 1.08;
                        const valRange = Math.max(0.1, maxVal - minVal);

                        const coords = sortedPoints.map((pt, i) => {
                          const x = 36 + i * (248 / Math.max(1, sortedPoints.length - 1));
                          const y = 42 - ((pt.value - minVal) / valRange) * 26;
                          return { x, y, pt };
                        });

                        const polyPath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
                        const areaPath = `${polyPath} L ${coords[coords.length - 1].x} 48 L ${coords[0].x} 48 Z`;

                        return (
                          <>
                            {/* Área com gradiente vertical (intenso no topo elevado, suave ao descer) */}
                            <path d={areaPath} fill={`url(#grad-${item.id})`} />

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

                            {/* Linha conectora moderna com brilho */}
                            <path
                              d={polyPath}
                              fill="none"
                              stroke="#5eea8f"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              filter={`url(#glow-${item.id})`}
                            />

                            {/* Bullet points com valores e datas */}
                            {coords.map((c, i) => {
                              // Exibe estritamente apenas o número (sem unidade mg/dL, etc.)
                              const numericOnly = c.pt.valueDisplay ? c.pt.valueDisplay.split(' ')[0] : String(c.pt.value);

                              return (
                                <g key={i}>
                                  {/* Halo exterior suave */}
                                  <circle cx={c.x} cy={c.y} r="6.5" fill="#5eea8f" fillOpacity="0.2" />
                                  {/* Bullet principal */}
                                  <circle cx={c.x} cy={c.y} r="4" fill="#5eea8f" stroke="#14142a" strokeWidth="2" />
                                  <circle cx={c.x} cy={c.y} r="1.5" fill="#ffffff" />

                                  {/* Apenas o número acima do ponto com fonte 18px nítida */}
                                  <text
                                    x={c.x}
                                    y={c.y - 10}
                                    fill="#ffffff"
                                    fontSize="18"
                                    fontStyle="normal"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {numericOnly}
                                  </text>

                                  {/* Data abaixo do gráfico em 14px */}
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
                        </>
                      );
                      })()}
                    </svg>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      )}

      {/* Modal 9:16 do Exame Resultado (com X de fechar no lado superior direito E no lado inferior direito para ajudar idosos) */}
      {selectedBatch && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 select-none font-['Plus_Jakarta_Sans',sans-serif]"
          onClick={() => setSelectedBatch(null)}
        >
          <div
            className="w-full max-w-full sm:max-w-[420px] max-h-[92vh] bg-[#14142a] border-[1px] border-white/50 rounded-[28px] p-4 sm:p-5 shadow-2xl flex flex-col justify-between animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Modal com Título, Data e Botão "X" no lado SUPERIOR DIREITO */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5eea8f] shrink-0"></span>
                  <span className="text-[19px] font-['Cormorant_Garamond',serif] font-medium text-white truncate">
                    {selectedBatch.title}
                  </span>
                </div>
                <div className="text-[15px] text-[#e0e0ed] mt-0.5">
                  Laudo emitido em {selectedBatch.dateStr}
                </div>
              </div>

              {/* Botão X Superior Direito: grande e acessível */}
              <button
                type="button"
                onClick={() => setSelectedBatch(null)}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center text-xl cursor-pointer shrink-0 transition"
                title="Fechar resultados (X)"
              >
                <i className="ti ti-x"></i>
              </button>
            </div>

            {/* Lista dos Resultados do Lote Específico */}
            <div className="overflow-y-auto space-y-2.5 py-3 pr-1 my-1 grow max-h-[60vh]">
              {selectedBatch.results.map((ex) => {
                const isOk = ex.status === 'ok';
                const isWarn = ex.status === 'atenção';
                const isLow = ex.status === 'baixo';

                return (
                  <div
                    key={ex.id}
                    className="bg-white/[0.04] border-[1px] border-white/50 rounded-xl p-3 flex flex-col gap-2"
                  >
                    {/* Linha 1: Nome do Exame em Destaque Full Width (21px) */}
                    <div className="text-[21px] font-bold text-white leading-tight break-words">
                      {ex.name}
                    </div>

                    {/* Linha 2: Ref alinhada à esquerda (17px) | Valor (17px) e Tag OK/Atenção/Baixo alinhados à direita */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[17px] text-[#e0e0ed] font-normal leading-none truncate">
                        {ex.reference}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[17px] font-bold whitespace-nowrap ${
                            isOk ? 'text-[#5eea8f]' : 'text-white'
                          }`}
                        >
                          {ex.value}
                        </span>

                        {isOk && (
                          <span className="text-[13px] font-bold text-white px-2 py-0.5 rounded bg-[#0f7a3a] uppercase tracking-wider">
                            ok
                          </span>
                        )}
                        {isWarn && (
                          <span className="text-[13px] font-bold text-white px-2 py-0.5 rounded bg-[#a35a07] uppercase tracking-wider">
                            atenção
                          </span>
                        )}
                        {isLow && (
                          <span className="text-[13px] font-bold text-white px-2 py-0.5 rounded bg-[#b42318] uppercase tracking-wider">
                            baixo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rodapé do Modal com Informação e Botão Fechar no lado INFERIOR DIREITO */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
              <span className="text-[16px] text-[#e0e0ed]">
                {selectedBatch.results.length} biomarcadores analisados
              </span>

              {/* Botão Fechar sem ícone 'i' e com texto 'Fechar' em 17px */}
              <button
                type="button"
                onClick={() => setSelectedBatch(null)}
                className="h-[40px] px-5 rounded-xl bg-[#5eea8f]/15 hover:bg-[#5eea8f]/25 text-[#5eea8f] border border-[#5eea8f]/35 flex items-center justify-center cursor-pointer active:scale-95 transition"
                title="Fechar resultados"
              >
                <span className="text-[17px] font-semibold">Fechar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
