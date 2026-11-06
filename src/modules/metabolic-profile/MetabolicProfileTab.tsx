import React, { useState, useRef } from 'react';
import { Target } from 'lucide-react';
import { PatientProfile } from '../../types/patient';

interface MetabolicProfileTabProps {
  patient: PatientProfile;
}

export type FaixaFuncional = 'Funcional' | 'Equilíbrio' | 'Atenção' | 'Disfuncional';

export interface ClassificacaoEixo {
  faixa: FaixaFuncional;
  rotulo: string;
  badgeStyle: string;
  strokeColor: string;
}

// Escala biológica de 4 faixas funcionais
export const getClassificacaoEixo = (valor: number): ClassificacaoEixo => {
  if (valor <= 2) {
    return {
      faixa: 'Funcional',
      rotulo: 'Funcional',
      badgeStyle: 'bg-[#22d3ee]/20 text-[#22d3ee] border-[#22d3ee]/40',
      strokeColor: '#22d3ee'
    };
  }
  if (valor <= 4) {
    return {
      faixa: 'Equilíbrio',
      rotulo: 'Equilíbrio',
      badgeStyle: 'bg-[#2fd575]/20 text-[#5eeaa0] border-[#2fd575]/40',
      strokeColor: '#2fd575'
    };
  }
  if (valor <= 7) {
    return {
      faixa: 'Atenção',
      rotulo: 'Merece Atenção',
      badgeStyle: 'bg-[#e8930c]/20 text-[#f5b04c] border-[#e8930c]/40',
      strokeColor: '#e8930c'
    };
  }
  return {
    faixa: 'Disfuncional',
    rotulo: 'Disfuncional',
    badgeStyle: 'bg-[#f43f5e]/20 text-[#fb7185] border-[#f43f5e]/40',
    strokeColor: '#f43f5e'
  };
};

export interface EixoMetabolico {
  n: string;
  v: number;
  d: string;
  propositiva: string;
}

export interface CategoriaCronobiologica {
  n: string;
  c: string;
  horarios: string[];
  w12: [number, number][]; // Janelas mapeadas no ciclo de 12 horas
  comentario: string;      // Comentário clínico propositivo em 18px não negrito
}

// 8 eixos do assessment sem menção a "notas", fundamentados na escala de 4 níveis
const DEFAULT_EIXOS: EixoMetabolico[] = [
  {
    n: "Alimentar",
    v: 5,
    d: "Qualidade e densidade nutricional da dieta.",
    propositiva: "Com índice funcional 5 (Merece Atenção), seu padrão alimentar diário apresenta consistência, mas aponta uma excelente oportunidade de modulação. O enriquecimento com proteínas de alto valor biológico e fibras suaves proporcionará saciedade estável e energia duradoura ao longo de todo o dia."
  },
  {
    n: "Gastrointestinal",
    v: 8,
    d: "Digestão, microbiota e permeabilidade intestinal.",
    propositiva: "Com índice funcional 8 (Disfuncional), este eixo sinaliza que sua barreira intestinal e microbiota demandam suporte prioritário. A introdução de compostos prebióticos delicados, enzimas digestivas e hidratação direcionada ajudará a recuperar o pleno conforto abdominal e a absorção de nutrientes."
  },
  {
    n: "Endócrino",
    v: 8,
    d: "Sensibilidade à insulina e eixos hormonais.",
    propositiva: "Com índice funcional 8 (Disfuncional), seus biomarcadores sugerem uma sobrecarga metabólica na modulação glicêmica e hormonal. Adequar as janelas das refeições e reduzir carboidratos à noite trará um alívio fisiológico imediato, restabelecendo a sensibilidade celular à insulina."
  },
  {
    n: "Imunológico",
    v: 4,
    d: "Inflamação de baixo grau e defesa.",
    propositiva: "Com índice funcional 4 (Equilíbrio), seu sistema de defesa natural encontra-se em ótimo estado de homeostase e vigilância biológica. Seu organismo responde com serenidade e sem processos inflamatórios excessivos."
  },
  {
    n: "Emocional",
    v: 5,
    d: "Regulação do humor e ansiedade.",
    propositiva: "Com índice funcional 5 (Merece Atenção), seu ritmo emocional demonstra boa capacidade de adaptação, mas reflete pequenos pontos de desgaste na rotina. A inclusão de momentos deliberados de pausa e relaxamento mental preservará sua serenidade e disposição."
  },
  {
    n: "Sono",
    v: 5,
    d: "Arquitetura e reparo noturno.",
    propositiva: "Com índice funcional 5 (Merece Atenção), suas noites oferecem um descanso razoável, porém com potencial claro de aprofundamento das fases reparadoras através da redução de luzes brilhantes antes de deitar e de suporte fitoterápico calmante."
  },
  {
    n: "Estresse",
    v: 6,
    d: "Carga alostática e ritmo de cortisol.",
    propositiva: "Com índice funcional 6 (Merece Atenção), seu organismo sinaliza uma carga alostática acumulada nas últimas semanas. Fazer pausas respiratórias ativas à tarde e respeitar horários de descompressão permitirá que o cortisol retome sua curva fisiológica saudável."
  },
  {
    n: "Neuroquímico",
    v: 5,
    d: "Neurotransmissores e cofatores (Mg²⁺, B6).",
    propositiva: "Com índice funcional 5 (Merece Atenção), sua memória e clareza mental contam com bom suporte basal. A suplementação orientada de cofatores nobres como o magnésio quelado e vitaminas do complexo B reforçará a síntese harmoniosa dos neurotransmissores."
  }
];

const DEFAULT_CATS: CategoriaCronobiologica[] = [
  {
    n: "REFEIÇÃO",
    c: "#2fd575",
    horarios: [
      "08h00 – 09h30",
      "12h00 – 13h30",
      "19h00 – 20h30"
    ],
    w12: [
      [8, 9.5],
      [12, 13.5], // 12h às 1h30
      [7, 8.5]    // 19h às 20h30 = 7h às 8h30
    ],
    comentario: "Período favorável à otimização da resposta glicêmica, à disponibilidade de energia e à eficiência digestiva, respeitando as necessidades metabólicas do organismo."
  },
  {
    n: "ATIVIDADE FÍSICA",
    c: "#e8930c",
    horarios: [
      "07h00 – 10h00",
      "16h00 – 19h00"
    ],
    w12: [
      [7, 10],
      [4, 7]
    ],
    comentario: "Momento propício ao desempenho muscular, ao estímulo de força e à manutenção da capacidade funcional, associado aos benefícios cardiovasculares e às respostas hormonais ao exercício."
  },
  {
    n: "DESEMPENHO COGNITIVO",
    c: "#22d3ee",
    horarios: [
      "09h00 – 13h00",
      "16h00 – 18h00"
    ],
    w12: [
      [9, 13],
      [4, 6]
    ],
    comentario: "Período favorável à concentração, ao aprendizado, à leitura, à resolução de problemas, à comunicação verbal e às atividades de estímulo e recuperação neurofuncional."
  }
];

// Função trigonométrica para coordenadas polares no SVG
const polarToCartesian = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

// Gerador de arcos SVG para mostrador circular
const describeArc = (cx: number, cy: number, r: number, a0: number, a1: number): string => {
  const [sx, sy] = polarToCartesian(cx, cy, r, a1);
  const [ex, ey] = polarToCartesian(cx, cy, r, a0);
  const largeArcFlag = a1 - a0 <= 180 ? 0 : 1;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArcFlag} 0 ${ex} ${ey}`;
};

export const MetabolicProfileTab: React.FC<MetabolicProfileTabProps> = ({ patient: _patient }) => {
  const eixos: EixoMetabolico[] = DEFAULT_EIXOS;
  const [modalAxis, setModalAxis] = useState<EixoMetabolico | null>(null);

  // Referência para rolagem suave automática no relógio
  const clockContainerRef = useRef<HTMLDivElement>(null);

  // Estado da Cronobiologia
  const cats: CategoriaCronobiologica[] = DEFAULT_CATS;
  const [selectedCatIndex, setSelectedCatIndex] = useState<number>(0);

  // Função para selecionar categoria e rolar suavemente para o relógio
  const handleSelectCategory = (idx: number) => {
    setSelectedCatIndex(idx);
    clockContainerRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  };

  // Categoria cronobiológica ativa
  const activeCat = cats[selectedCatIndex] || cats[0];

  // Geometria da Teia de Aranha (raio 170px para visibilidade sênior)
  const radarCx = 210;
  const radarCy = 210;
  const radarRadius = 170;

  // Coordenadas do polígono de dados do Radar
  const radarPolygonPoints = eixos
    .map((e, i) => polarToCartesian(radarCx, radarCy, (radarRadius * e.v) / 10, i * 45).join(','))
    .join(' ');

  // Geometria Ampliada do Relógio Analógico de 12 Horas (+10% ampliação, viewBox: 0 0 410 480)
  const cronoCx = 205;
  const cronoCy = 240;
  const cronoTrackR = 154; // Raio do trilho horário externo
  const cronoHourR = 126;  // Raio dos textos das 12 horas (~66px livres por dígito)
  const cronoCenterR = 56; // Raio do núcleo central digital

  // Ponteiro da hora atual no mostrador de 12 horas (14:30 = 2h30 = 75 graus)
  const current12HourAngle = 2.5 * 30;
  const [needleStartA, needleStartB] = polarToCartesian(cronoCx, cronoCy, cronoCenterR + 2, current12HourAngle);
  const [needleEndA, needleEndB] = polarToCartesian(cronoCx, cronoCy, cronoTrackR - 8, current12HourAngle);
  const [needleDotA, needleDotB] = polarToCartesian(cronoCx, cronoCy, cronoTrackR, current12HourAngle);

  // Horas cardeais e intra-horas do relógio clássico de 12h
  const hours12List = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  // Dados de classificação do eixo exibido no modal
  const modalClassificacao = modalAxis ? getClassificacaoEixo(modalAxis.v) : null;

  return (
    <div className="w-full max-w-[500px] mx-auto py-2 text-[#e8eef5] font-['Inter',sans-serif]">
      
      {/* =========================================================================
          DIV 1: PERFIL METABÓLICO (TEIA DE ARANHA AMPLIADA E INTERATIVA)
          ========================================================================= */}
      <section className="bg-[#121722] border-[1px] border-white/50 rounded-[24px] p-5 sm:p-6 flex flex-col gap-4 shadow-xl">
        {/* Instrução clara e amigável para o idoso (fonte 18px) */}
        <div className="bg-[#2fd575]/10 border border-[#2fd575]/25 rounded-xl px-4 py-3 flex items-center gap-3 text-[#5eeaa0]">
          <span className="text-[22px]">👆</span>
          <p className="text-[18px] font-medium leading-snug">
            Toque em cada número da teia e veja.
          </p>
        </div>

        {/* Teia de Aranha Ampliada em SVG com linhas #cfd3dc e pontos/linhas verdes */}
        <div className="w-full flex justify-center py-2 select-none">
          <svg
            id="radar"
            viewBox="0 0 420 420"
            className="w-full max-w-[420px] select-none overflow-visible"
          >
            {/* Polígonos concêntricos de escala da Teia na cor #cfd3dc */}
            {[1, 2, 3, 4].map((g) => {
              const pts = Array.from({ length: 8 }, (_, i) =>
                polarToCartesian(radarCx, radarCy, (radarRadius * g) / 4, i * 45).join(',')
              ).join(' ');
              return (
                <polygon
                  key={`web-ring-${g}`}
                  points={pts}
                  fill="none"
                  stroke="#cfd3dc"
                  strokeOpacity="0.32"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* Linhas radiais dos 8 raios da teia na cor #cfd3dc */}
            {Array.from({ length: 8 }, (_, i) => {
              const [x, y] = polarToCartesian(radarCx, radarCy, radarRadius, i * 45);
              return (
                <line
                  key={`web-spoke-${i}`}
                  x1={radarCx}
                  y1={radarCy}
                  x2={x}
                  y2={y}
                  stroke="#cfd3dc"
                  strokeOpacity="0.35"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* Polígono dos dados clínicos: linhas verdes com luminescência */}
            <g className="transition-all duration-300">
              <polygon
                points={radarPolygonPoints}
                fill="rgba(47,213,117,0.22)"
                stroke="#2fd575"
                strokeWidth="3.5"
                style={{ filter: 'drop-shadow(0 0 12px rgba(47,213,117,0.6))' }}
              />
              {/* Pontos nos vértices com cores correspondentes à faixa funcional */}
              {eixos.map((e, i) => {
                const [x, y] = polarToCartesian(radarCx, radarCy, (radarRadius * e.v) / 10, i * 45);
                const classif = getClassificacaoEixo(e.v);
                return (
                  <circle
                    key={`v-dot-${i}`}
                    cx={x}
                    cy={y}
                    r={6.5}
                    fill="#0a0d12"
                    stroke={classif.strokeColor}
                    strokeWidth={3}
                  />
                );
              })}
            </g>

            {/* Badges de Número em 18px com grande área de toque para o idoso */}
            {eixos.map((e, i) => {
              const [bx, by] = polarToCartesian(
                radarCx,
                radarCy,
                Math.max(30, (radarRadius * e.v) / 10 + 20),
                i * 45
              );
              const classif = getClassificacaoEixo(e.v);

              return (
                <g
                  key={`num-badge-${i}`}
                  className="cursor-pointer group"
                  onClick={() => setModalAxis(e)}
                >
                  {/* Área física de toque generosa (WCAG AAA para idosos) */}
                  <circle cx={bx} cy={by} r="28" fill="transparent" />

                  {/* Fundo do Badge numérico com contorno da faixa funcional */}
                  <rect
                    x={bx - 17}
                    y={by - 15}
                    width="34"
                    height="30"
                    rx="8"
                    fill="#0a0d12"
                    stroke={classif.strokeColor}
                    strokeWidth="2"
                    className="transition-all duration-150 group-hover:scale-110 group-active:scale-95"
                    style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))' }}
                  />

                  {/* Número com fonte estrita de 18px e negrito */}
                  <text
                    x={bx}
                    y={by + 6.5}
                    textAnchor="middle"
                    fontSize="18"
                    fontWeight="800"
                    fill="#ffffff"
                    className="select-none pointer-events-none"
                  >
                    {e.v}
                  </text>
                </g>
              );
            })}

            {/* Centro da teia */}
            <circle cx={radarCx} cy={radarCy} r="3.5" fill="#cfd3dc" opacity="0.6" />
          </svg>
        </div>

        {/* Legenda Informativa com 4 faixas organizadas verticalmente (não em colunas) */}
        <div className="w-full border border-white/[0.07] border-l-[3px] border-l-[#e8930c] bg-[#e8930c]/[0.06] rounded-[16px] p-4 text-[#8b98a6] leading-relaxed">
          {/* Lista Linear Vertical de Faixas Clínicas em 18px */}
          <div className="flex flex-col gap-2 pb-3 mb-3 border-b border-white/[0.08] text-[18px] font-bold">
            <div className="text-[#22d3ee] flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#22d3ee] shrink-0 shadow-[0_0_6px_#22d3ee]"></span>
              <span>1–2 Funcional</span>
            </div>
            <div className="text-[#5eeaa0] flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#2fd575] shrink-0 shadow-[0_0_6px_#2fd575]"></span>
              <span>3–4 Equilíbrio</span>
            </div>
            <div className="text-[#f5b04c] flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#e8930c] shrink-0 shadow-[0_0_6px_#e8930c]"></span>
              <span>5–7 Merece Atenção</span>
            </div>
            <div className="text-[#fb7185] flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#f43f5e] shrink-0 shadow-[0_0_6px_#f43f5e]"></span>
              <span>8–10 Disfuncional</span>
            </div>
          </div>

          <p className="text-[18px] leading-relaxed text-[#8b98a6]">
            <b className="text-[#f5b04c] font-semibold">Interpretação:</b> pontos próximos ao centro indicam homeostase. Pontos próximos à borda exigem modulação terapêutica prioritária.
          </p>
        </div>
      </section>


      {/* =========================================================================
          BOM ESPAÇO VERTICAL ENTRE AS DUAS DIVS
          ========================================================================= */}
      <div className="h-8" aria-hidden="true" />


      {/* =========================================================================
          DIV 2: CRONOBIOLOGIA (MOSTRADOR ANALÓGICO DE 12 HORAS EXPANDIDO)
          ========================================================================= */}
      <section className="bg-[#121722] border-[1px] border-white/50 rounded-[24px] p-5 sm:p-6 flex flex-col gap-4 shadow-xl">
        {/* Cabeçalho da DIV 2 (Título consolidado sem separador residual) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-bold text-[11px] tracking-wider text-[#5eeaa0] bg-[#2fd575]/10 px-2.5 py-1 rounded-full whitespace-nowrap">
            DIV 2
          </span>
          <h2 className="text-[20px] font-bold text-[#e8eef5] tracking-tight">
            Cronobiologia
          </h2>
        </div>

        {/* Descrição P centralizada na cor #d5dee4 */}
        <p className="text-[18px] text-center text-[#d5dee4] leading-relaxed">
          Segue melhores horários em que seu organismo responde melhor.
        </p>

        {/* Relógio Smartwatch Analógico de 12 Horas (Alvo do Auto-Scroll) */}
        <div 
          ref={clockContainerRef}
          className="w-full flex justify-center py-2 select-none scroll-mt-6"
        >
          <svg
            id="crono"
            viewBox="0 0 410 480"
            className="w-full max-w-[390px] select-none"
          >
            {/* Alça / Pulseira Superior */}
            <rect
              x="165"
              y="10"
              width="80"
              height="80"
              rx="18"
              fill="#4b535b"
              stroke="rgba(255,255,255,0.10)"
            />
            <rect x="175" y="16" width="60" height="74" rx="12" fill="#5d656d" />
            <line
              x1="171"
              y1="20"
              x2="171"
              y2="70"
              stroke="rgba(255,255,255,0.22)"
              strokeDasharray="3 4"
            />
            <line
              x1="239"
              y1="20"
              x2="239"
              y2="70"
              stroke="rgba(255,255,255,0.22)"
              strokeDasharray="3 4"
            />

            {/* Alça / Pulseira Inferior */}
            <rect
              x="165"
              y="390"
              width="80"
              height="80"
              rx="18"
              fill="#4b535b"
              stroke="rgba(255,255,255,0.10)"
            />
            <rect x="175" y="390" width="60" height="74" rx="12" fill="#5d656d" />
            <line
              x1="171"
              y1="400"
              x2="171"
              y2="450"
              stroke="rgba(255,255,255,0.22)"
              strokeDasharray="3 4"
            />
            <line
              x1="239"
              y1="400"
              x2="239"
              y2="450"
              stroke="rgba(255,255,255,0.22)"
              strokeDasharray="3 4"
            />

            {/* Caixa circular externa do Smartwatch */}
            <circle
              cx={cronoCx}
              cy={cronoCy}
              r={170}
              fill="#171d27"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth="2"
            />

            {/* Trilho horário de fundo */}
            <circle
              cx={cronoCx}
              cy={cronoCy}
              r={cronoTrackR}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="16"
            />

            {/* Marcadores das 12 Horas:
                - Topo: 12
                - Direita: 3
                - Base: 6
                - Esquerda: 9
                - Intra-horas ajustadas a cada 30 graus */}
            {hours12List.map((h) => {
              const deg = (h % 12) * 30;
              const isCardinal = h === 12 || h === 3 || h === 6 || h === 9;
              const [x, y] = polarToCartesian(cronoCx, cronoCy, cronoHourR, deg);

              return (
                <text
                  key={`hour-12-${h}`}
                  x={x}
                  y={y + 6}
                  textAnchor="middle"
                  fontSize={isCardinal ? '20' : '17'}
                  fontWeight={isCardinal ? '900' : '700'}
                  fill={isCardinal ? '#ffffff' : '#a1a1aa'}
                  className="select-none"
                >
                  {h}
                </text>
              );
            })}

            {/* Arcos ativos da categoria selecionada mapeados no ciclo de 12 horas */}
            <g key={`arcs-12-${selectedCatIndex}`}>
              {activeCat.w12.map((windowRange, wIdx) => {
                const a0 = ((windowRange[0] % 12) * 30) + 2;
                const a1 = ((windowRange[1] % 12) * 30) - 2;
                const pathD = describeArc(cronoCx, cronoCy, cronoTrackR, a0, a1);

                return (
                  <path
                    key={`arc-12-${wIdx}`}
                    d={pathD}
                    fill="none"
                    stroke={activeCat.c}
                    strokeWidth="16"
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 10px ${activeCat.c})` }}
                  />
                );
              })}
            </g>

            {/* Ponteiro e Indicador do Momento Atual (14:30 = 2h30 = 75 graus) */}
            <line
              x1={needleStartA}
              y1={needleStartB}
              x2={needleEndA}
              y2={needleEndB}
              stroke="#ffffff"
              strokeWidth="2.5"
              opacity="0.85"
            />
            <circle
              cx={needleDotA}
              cy={needleDotB}
              r="6"
              fill="#ffffff"
              style={{ filter: 'drop-shadow(0 0 8px #ffffff)' }}
            />

            {/* Mostrador central sólido com horário 14:30 em 24px e tag AGORA em 15px */}
            <circle
              cx={cronoCx}
              cy={cronoCy}
              r={cronoCenterR}
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(255,255,255,0.09)"
            />
            <text
              x={cronoCx}
              y={cronoCy - 2}
              textAnchor="middle"
              fontSize="24"
              fontWeight="800"
              fill="#e8eef5"
              className="select-none"
            >
              14:30
            </text>
            <text
              x={cronoCx}
              y={cronoCy + 21}
              textAnchor="middle"
              fontSize="15"
              fontWeight="700"
              fill="#8b98a6"
              className="select-none"
            >
              AGORA
            </text>
          </svg>
        </div>

        {/* Botões das Categorias: Estrutura [Título: / xx / xx / xx / Comentário] com Auto-Scroll */}
        <div className="flex flex-col gap-3.5">
          {cats.map((cat, idx) => {
            const isSelected = selectedCatIndex === idx;
            return (
              <button
                key={`cat-${idx}`}
                type="button"
                onClick={() => handleSelectCategory(idx)}
                style={{
                  borderColor: isSelected ? cat.c : undefined
                }}
                className={`flex flex-col gap-2.5 rounded-2xl p-4 sm:p-5 text-left transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'border-2 bg-white/[0.06] shadow-lg shadow-black/40'
                    : 'border-[1px] border-white/50 bg-white/[0.03] hover:bg-white/[0.05]'
                }`}
              >
                {/* 1. TOPO: Título em linha única com Ponto Luminoso */}
                <div className="flex items-center gap-3 w-full">
                  <i
                    style={{ backgroundColor: cat.c }}
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
                    aria-hidden="true"
                  />
                  <span className="text-[19px] font-bold tracking-wide text-[#e8eef5]">
                    {cat.n}
                  </span>
                </div>

                {/* 2. Horários estruturados linha a linha (xx / xx / xx) */}
                <div className="flex flex-col gap-1 pl-6">
                  {cat.horarios.map((h, hIdx) => (
                    <span 
                      key={`h-${hIdx}`}
                      className="text-[18px] font-semibold text-[#e8eef5] leading-snug"
                    >
                      {h}
                    </span>
                  ))}
                </div>

                {/* 3. Comentário Propositivo em 18px não negrito justificado na cor #d5dee4 */}
                <div className="pt-2 mt-1 border-t border-white/[0.08] pl-6">
                  <p 
                    style={{ textAlign: 'justify', color: '#d5dee4' }}
                    className="text-[18px] font-normal leading-relaxed"
                  >
                    {cat.comentario}
                  </p>
                </div>

                {/* 4. Espaço vertical e Botão 'Toque aqui' com ícone alvo à esquerda */}
                <div className="pt-2 pl-6 w-full flex justify-start">
                  <div
                    style={{
                      color: isSelected ? cat.c : '#d5dee4',
                      borderColor: isSelected ? `${cat.c}60` : 'rgba(255,255,255,0.16)',
                      backgroundColor: isSelected ? `${cat.c}18` : 'rgba(255,255,255,0.05)'
                    }}
                    className="flex items-center gap-2.5 px-4 py-2 rounded-full border text-[17px] font-normal transition-all shadow-sm"
                  >
                    <span 
                      style={{ marginLeft: '0px', marginBottom: '-1px' }}
                      className="inline-flex items-center justify-center shrink-0"
                    >
                      <Target 
                        className="w-[28px] h-[28px] text-[#ff7b00] animate-pulse" 
                        style={{ filter: 'drop-shadow(0 0 6px rgba(255,123,0,0.7))' }}
                        aria-hidden="true"
                      />
                    </span>
                    <span>Toque aqui</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Espaçador final para rolagem suave */}
      <div className="h-6" aria-hidden="true" />

      {/* =========================================================================
          MODAL COGNITIVO PARA O IDOSO AO CLICAR EM QUALQUER NÚMERO DA TEIA
          ========================================================================= */}
      {modalAxis && modalClassificacao && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setModalAxis(null)}
        >
          <div
            className="bg-[#121722] border-[1px] border-white/50 rounded-[24px] w-full max-w-[420px] p-6 shadow-2xl flex flex-col gap-5 text-[#e8eef5] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Modal: Eixo [Nome] */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-[20px] font-bold text-[#e8eef5] tracking-tight flex items-center">
                <span>Eixo {modalAxis.n}</span>
                <span 
                  style={{ width: '135px', marginTop: '0px', marginLeft: '16px' }}
                  className={`text-[12.5px] font-extrabold px-1.5 py-1 rounded-lg border text-center shrink-0 whitespace-nowrap ${modalClassificacao.badgeStyle}`}
                >
                  {modalClassificacao.rotulo} {modalAxis.v}/10
                </span>
              </h3>
            </div>

            {/* Resposta propositiva com alinhamento justificado e fonte de 19px */}
            <div className="py-1">
              <p 
                style={{ textAlign: 'justify' }}
                className="text-[19px] leading-relaxed text-[#e8eef5] font-normal"
              >
                {modalAxis.propositiva}
              </p>
            </div>

            {/* Rodapé com botão Fechar alinhado no canto inferior direito */}
            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setModalAxis(null)}
                className="px-6 py-3 rounded-xl bg-[#2fd575] hover:bg-[#2fd575]/90 active:scale-95 text-[#0a0d12] text-[18px] font-bold shadow-lg shadow-[#2fd575]/20 transition-all cursor-pointer min-h-[48px]"
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
