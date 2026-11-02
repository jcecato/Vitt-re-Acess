import React, { useState, useEffect } from 'react';
import { PatientProfile } from '../../types/patient';
import { X, CheckCircle2, TrendingUp, Sparkles, Calendar, Activity, HelpCircle, ChevronDown } from 'lucide-react';

interface EvolutionTabProps {
  patient: PatientProfile;
}

export type AnswerValue = 0 | 1 | 2 | 3 | 'nse';

export interface QuestionItem {
  id: string;
  text: string;
}

export interface AxisDefinition {
  id: string;
  number: number;
  name: string;
  questions: QuestionItem[];
}

export const CHECKIN_AXES: AxisDefinition[] = [
  {
    id: 'cognitiva',
    number: 1,
    name: 'Saúde Cognitiva',
    questions: [
      { id: 'cog_1', text: 'Lembrei de fatos recentes?' },
      { id: 'cog_2', text: 'Recordei informações importantes?' },
      { id: 'cog_3', text: 'Mantive a atenção nas minhas atividades?' },
      { id: 'cog_4', text: 'Resolvi situações do dia a dia com facilidade?' }
    ]
  },
  {
    id: 'emocional',
    number: 2,
    name: 'Equilíbrio Emocional',
    questions: [
      { id: 'emo_1', text: 'Senti-me bem emocionalmente?' },
      { id: 'emo_2', text: 'Consegui lidar com preocupações?' },
      { id: 'emo_3', text: 'Senti prazer nas atividades habituais?' },
      { id: 'emo_4', text: 'Senti-me tranquilo(a) na maior parte do tempo?' }
    ]
  },
  {
    id: 'digestivo',
    number: 3,
    name: 'Conforto Digestivo e Intestinal',
    questions: [
      { id: 'dig_1', text: 'Tive digestão confortável?' },
      { id: 'dig_2', text: 'Fiquei sem inchaço abdominal?' },
      { id: 'dig_3', text: 'Tive pouco ou nenhum incômodo com gases?' },
      { id: 'dig_4', text: 'Evacuei com regularidade e facilidade?' }
    ]
  },
  {
    id: 'forca',
    number: 4,
    name: 'Força, Mobilidade e Autonomia',
    questions: [
      { id: 'for_1', text: 'Tive força para minhas atividades?' },
      { id: 'for_2', text: 'Caminhei com segurança?' },
      { id: 'for_3', text: 'Levantei-me com facilidade?' },
      { id: 'for_4', text: 'Realizei minhas tarefas com autonomia?' }
    ]
  },
  {
    id: 'sono',
    number: 5,
    name: 'Sono, Energia e Recuperação',
    questions: [
      { id: 'son_1', text: 'Adormeci com facilidade?' },
      { id: 'son_2', text: 'Tive noites de sono tranquilas?' },
      { id: 'son_3', text: 'Acordei descansado(a)?' },
      { id: 'son_4', text: 'Tive disposição durante o dia?' }
    ]
  },
  {
    id: 'apetite',
    number: 6,
    name: 'Apetite e Alimentação',
    questions: [
      { id: 'ape_1', text: 'Tive apetite habitual?' },
      { id: 'ape_2', text: 'Fiz minhas refeições regularmente?' },
      { id: 'ape_3', text: 'Comi o suficiente nas refeições?' },
      { id: 'ape_4', text: 'Mastiguei e engoli sem dificuldade?' }
    ]
  },
  {
    id: 'hidratacao',
    number: 7,
    name: 'Hidratação',
    questions: [
      { id: 'hid_1', text: 'Bebi líquidos ao longo do dia?' },
      { id: 'hid_2', text: 'Bebi líquidos entre as refeições?' },
      { id: 'hid_3', text: 'Mantive o consumo de líquidos nos dias mais quentes?' },
      { id: 'hid_4', text: 'Passei o dia sem sede excessiva?' }
    ]
  },
  {
    id: 'dor',
    number: 8,
    name: 'Desconforto e Dor',
    questions: [
      { id: 'dor_1', text: 'Passei o dia com pouco ou nenhum desconforto?' },
      { id: 'dor_2', text: 'Movimentei-me sem dores limitantes?' },
      { id: 'dor_3', text: 'Dormi sem interrupções causadas por dor?' },
      { id: 'dor_4', text: 'Realizei minhas tarefas sem limitações por dor?' }
    ]
  }
];

export const SCALE_OPTIONS = [
  { value: 0 as const, label: 'Nunca', ref: '0 dias' },
  { value: 1 as const, label: 'Em alguns dias', ref: '1 a 3 dias' },
  { value: 2 as const, label: 'Em vários dias', ref: '4 a 10 dias' },
  { value: 3 as const, label: 'Quase todos os dias', ref: '11 a 14 dias' },
];

export interface CheckInRecord {
  id: string;
  dateStr: string;
  periodLabel: string;
  dayLabel: string;
  ivp: number;
  deltaPoints?: number;
  axisScores: { [axisId: string]: number };
  answers?: { [questionId: string]: AnswerValue };
}

// Histórico inicial baseado fielmente nos dados das imagens 2, 3 e 4
const SEED_CHECKINS: CheckInRecord[] = [
  {
    id: 'chk_1',
    dateStr: '18/08/2026',
    periodLabel: '04/08 a 18/08/2026',
    dayLabel: 'D1',
    ivp: 65,
    axisScores: {
      cognitiva: 68,
      emocional: 65,
      digestivo: 70,
      forca: 60,
      sono: 65,
      apetite: 70,
      hidratacao: 62,
      dor: 60
    }
  },
  {
    id: 'chk_2',
    dateStr: '02/09/2026',
    periodLabel: '19/08 a 02/09/2026',
    dayLabel: 'D15',
    ivp: 68,
    deltaPoints: 3,
    axisScores: {
      cognitiva: 72,
      emocional: 68,
      digestivo: 75,
      forca: 64,
      sono: 70,
      apetite: 74,
      hidratacao: 65,
      dor: 66
    }
  },
  {
    id: 'chk_3',
    dateStr: '17/09/2026',
    periodLabel: '03/09 a 17/09/2026',
    dayLabel: 'D30',
    ivp: 70,
    deltaPoints: 2,
    axisScores: {
      cognitiva: 75,
      emocional: 70,
      digestivo: 80,
      forca: 65,
      sono: 75,
      apetite: 80,
      hidratacao: 68,
      dor: 70
    }
  },
  {
    id: 'chk_4',
    dateStr: '02/10/2026',
    periodLabel: '18/09 a 02/10/2026',
    dayLabel: 'D45',
    ivp: 73,
    deltaPoints: 3,
    axisScores: {
      cognitiva: 78,
      emocional: 72,
      digestivo: 85,
      forca: 66,
      sono: 80,
      apetite: 85,
      hidratacao: 70,
      dor: 74
    }
  },
  {
    id: 'chk_5',
    dateStr: '17/10/2026',
    periodLabel: '03/10 a 17/10/2026',
    dayLabel: 'D60',
    ivp: 75,
    deltaPoints: 4,
    axisScores: {
      cognitiva: 82,
      emocional: 75,
      digestivo: 91,
      forca: 68,
      sono: 85,
      apetite: 90,
      hidratacao: 72,
      dor: 78
    }
  }
];

export const EvolutionTab: React.FC<EvolutionTabProps> = ({ patient }) => {
  const storageKey = `vittare_checkins_v2_${patient.id}`;

  const [checkIns, setCheckIns] = useState<CheckInRecord[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return SEED_CHECKINS;
  });

  // Modal 9:16 do Questionário
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [answers, setAnswers] = useState<{ [qId: string]: AnswerValue }>({});
  const [currentAxisIndex, setCurrentAxisIndex] = useState<number>(0);

  // Acordeon Exclusivo: no máximo 1 avaliação aberta por vez (iniciam todas fechadas)
  const [openCheckInId, setOpenCheckInId] = useState<string | null>(null);

  const handleToggleCheckIn = (id: string, e?: React.MouseEvent<HTMLElement>) => {
    const isOpening = openCheckInId !== id;
    setOpenCheckInId(isOpening ? id : null);

    if (isOpening) {
      // Auto-scroll suave para o topo do card aberto, garantindo visão completa sem esforço
      const targetEl = e?.currentTarget;
      setTimeout(() => {
        targetEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    }
  };

  // Cálculo determinístico e seguro para PWA da janela de 14 dias anteriores até a data atual
  const [periodInfo, setPeriodInfo] = useState(() => {
    const now = new Date();
    const endDay = String(now.getDate()).padStart(2, '0');
    const endMonth = String(now.getMonth() + 1).padStart(2, '0');
    const endYear = now.getFullYear();
    const endDateStr = `${endDay}/${endMonth}/${endYear}`;

    const pastDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const startDay = String(pastDate.getDate()).padStart(2, '0');
    const startMonth = String(pastDate.getMonth() + 1).padStart(2, '0');
    const startYear = pastDate.getFullYear();

    return {
      endDateStr,
      startDateStr: `${startDay}/${startMonth}/${startYear}`,
      periodLabel: `${startDay}/${startMonth} a ${endDay}/${endMonth}/${endYear}`
    };
  });

  // Atualiza com segurança em PWA quando a aba retoma foco ou visibilidade após dias em background
  useEffect(() => {
    const updateDates = () => {
      const now = new Date();
      const endDay = String(now.getDate()).padStart(2, '0');
      const endMonth = String(now.getMonth() + 1).padStart(2, '0');
      const endYear = now.getFullYear();
      const pastDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const startDay = String(pastDate.getDate()).padStart(2, '0');
      const startMonth = String(pastDate.getMonth() + 1).padStart(2, '0');
      const startYear = pastDate.getFullYear();

      setPeriodInfo({
        endDateStr: `${endDay}/${endMonth}/${endYear}`,
        startDateStr: `${startDay}/${startMonth}/${startYear}`,
        periodLabel: `${startDay}/${startMonth} a ${endDay}/${endMonth}/${endYear}`
      });
    };

    window.addEventListener('focus', updateDates);
    document.addEventListener('visibilitychange', updateDates);
    return () => {
      window.removeEventListener('focus', updateDates);
      document.removeEventListener('visibilitychange', updateDates);
    };
  }, []);

  // Salva no storage local persistente
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checkIns));
    } catch {
      // ignore
    }
  }, [checkIns, storageKey]);

  // Último check-in realizado
  const latestCheckIn = checkIns[checkIns.length - 1] ?? SEED_CHECKINS[SEED_CHECKINS.length - 1];

  // Cálculo de variação em relação ao registro anterior
  const previousCheckIn = checkIns.length > 1 ? checkIns[checkIns.length - 2] : null;
  const currentDelta = previousCheckIn ? latestCheckIn.ivp - previousCheckIn.ivp : (latestCheckIn.deltaPoints ?? 4);

  // Manipulador de resposta de pergunta
  const handleSelectAnswer = (qId: string, val: AnswerValue) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: prev[qId] === val ? (null as unknown as AnswerValue) : val
    }));
  };

  // Envio e Cálculo do Novo Check-in
  const handleSubmitCheckIn = () => {
    const axisScoresResult: { [axisId: string]: number } = {};
    let totalAxesValid = 0;
    let sumAxesScores = 0;

    for (const axis of CHECKIN_AXES) {
      const validAnswers: number[] = [];
      for (const q of axis.questions) {
        const ans = answers[q.id];
        if (typeof ans === 'number' && ans >= 0 && ans <= 3) {
          validAnswers.push(ans);
        }
      }

      if (validAnswers.length >= 3) {
        const sum = validAnswers.reduce((a, b) => a + b, 0);
        const score = Math.round((sum / (validAnswers.length * 3)) * 100);
        axisScoresResult[axis.id] = score;
        sumAxesScores += score;
        totalAxesValid++;
      } else {
        axisScoresResult[axis.id] = 0;
      }
    }

    const calculatedIvp = totalAxesValid > 0 ? Math.round(sumAxesScores / totalAxesValid) : 75;
    const delta = calculatedIvp - latestCheckIn.ivp;

    const newRecord: CheckInRecord = {
      id: `chk_${Date.now()}`,
      dateStr: periodInfo.endDateStr,
      periodLabel: periodInfo.periodLabel,
      dayLabel: `D${60 + (checkIns.length - 4) * 15}`,
      ivp: calculatedIvp,
      deltaPoints: delta,
      axisScores: axisScoresResult,
      answers: { ...answers }
    };

    setCheckIns(prev => [...prev, newRecord]);
    setIsModalOpen(false);
  };

  // Gerador de Comentário da IA conforme as regras da Seção 6
  const getAiFeedback = () => {
    if (checkIns.length <= 1) {
      return 'Este é o seu primeiro registro. Ele marca o ponto de partida do nosso acompanhamento. Vamos observar suas percepções ao longo das próximas semanas, respeitando seu ritmo.';
    }
    if (currentDelta > 0) {
      return `Sua pontuação apresentou uma variação positiva de +${currentDelta} pontos neste período. Vamos preservar o que está funcionando e continuar atentos às suas necessidades.`;
    }
    if (currentDelta < 0) {
      return `Seu índice apresentou uma variação de −${Math.abs(currentDelta)} pontos neste período. Esse registro nos ajuda a identificar os aspectos que merecem mais atenção e ajustar o acompanhamento às suas necessidades.`;
    }
    return 'A constância também merece reconhecimento. Sua pontuação permaneceu estável neste período. Seguiremos acompanhando suas percepções e preservando os resultados alcançados.';
  };

  // Contagem de perguntas respondidas
  const totalQuestions = 32;
  const answeredCount = Object.values(answers).filter(v => v !== null && v !== undefined).length;

  return (
    <div className="space-y-4 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full pb-4">
      
      {/* Cabeçalho da Aba */}
      <div>
        <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
          Vittáre Check-In
        </div>
        <div className="text-[17px] font-semibold text-white mt-0.5">
          Sistema de Evolução Percebida
        </div>
      </div>

      {/* Cartão "Realizar Agora" */}
      <div className="bg-gradient-to-br from-[#1c1838] via-[#121124] to-[#0d0d16] border border-[#7c6af7]/35 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-xl bg-[#5eea8f]/15 border border-[#5eea8f]/30 flex items-center justify-center text-[#5eea8f] shrink-0 mt-0.5">
            <Calendar className="w-6 h-6 animate-pulse" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[17px] sm:text-[18px] font-bold text-[#5eea8f] uppercase tracking-wide flex items-center flex-wrap gap-2">
              <span>REALIZAR AGORA</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#5eea8f]/20 border border-[#5eea8f]/40 text-white text-[16px] font-bold tracking-normal shadow-sm">
                {periodInfo.endDateStr}
              </span>
            </div>
            <div className="text-[18px] text-[#cfd3dc] mt-1 font-medium">
              Período: {periodInfo.periodLabel}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setAnswers({});
            setIsModalOpen(true);
          }}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0f7a3a] to-[#108c43] hover:from-[#139247] hover:to-[#0f7a3a] border border-[#5eea8f]/40 text-white font-bold text-[18px] shadow-md active:scale-95 transition cursor-pointer flex items-center justify-center"
        >
          <span>Iniciar</span>
        </button>
      </div>

      {/* Linha Divisória mais Grossa conforme solicitado */}
      <div className="border-t-2 border-white/20 my-2"></div>

      {/* ============================================================== */}
      {/* AVALIAÇÕES EM ACORDEON EXCLUSIVO (Iniciam todas fechadas)     */}
      {/* ============================================================== */}
      <div className="space-y-4">
        {checkIns.slice().reverse().map((item) => {
          const isOpen = openCheckInId === item.id;
          const checkInIndex = checkIns.findIndex(c => c.id === item.id);
          const checkInNumber = checkInIndex >= 0 ? checkInIndex + 1 : 1;

          return (
            <div 
              key={item.id} 
              id={`checkin-card-${item.id}`}
              className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden shadow-sm transition"
            >
              {/* Cabeçalho do Acordeon com Ícone, N° CHECK-IN, DATA e Seta Baixo */}
              <button
                type="button"
                onClick={(e) => handleToggleCheckIn(item.id, e)}
                className="w-full flex items-center justify-between p-3.5 text-left cursor-pointer hover:bg-white/[0.04] transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-[#5eea8f]/15 border border-[#5eea8f]/30 flex items-center justify-center text-[#5eea8f] shrink-0">
                    <Activity className="w-6 h-6 animate-pulse" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[17px] font-bold text-white tracking-wide truncate uppercase">
                      {checkInNumber}° Check-In
                    </div>
                    <div className="text-[18px] text-[#cfd3dc] truncate">
                      Data: {item.dateStr}
                    </div>
                  </div>
                </div>

                {/* Centralizado / Resumo: Índice e Seta para Baixo tamanho médio */}
                <div className="flex items-center gap-2.5 shrink-0 ml-2">
                  <span className="text-[16px] font-bold text-[#5eea8f] tabular-nums bg-[#5eea8f]/10 border border-[#5eea8f]/20 px-2.5 py-0.5 rounded-lg">
                    {item.ivp}/100
                  </span>
                  <ChevronDown 
                    className={`w-6 h-6 text-[#8e8ea6] transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#5eea8f]' : ''
                    }`} 
                  />
                </div>
              </button>

              {/* Conteúdo do Acordeon com as Barras Horizontais (Inicia fechado) */}
              {isOpen && (
                <div className="p-4 pt-2 border-t border-white/[0.08] bg-black/20 space-y-4 animate-fadeIn">
                  
                  {/* Índice Geral de Vitalidade Percebida daquela Avaliação */}
                  <div className="pb-3 border-b border-white/[0.06]">
                    <div className="text-[18px] text-[#e8e8f0] font-semibold">
                      Índice de Vitalidade Percebida
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-[28px] font-bold text-[#5eea8f] tabular-nums leading-none">
                        {item.ivp}
                      </span>
                      <span className="text-[18px] font-semibold text-[#8e8ea6]">/100</span>
                    </div>

                    <div className="h-3 bg-white/[0.08] rounded-full mt-2.5 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, Math.max(0, item.ivp))}%` }}
                        className="h-full bg-gradient-to-r from-[#0f7a3a] via-[#5eea8f] to-[#5eea8f] rounded-full transition-all duration-500"
                      />
                    </div>
                    <div className="text-[18px] text-[#a5a4b8] mt-2 font-normal leading-relaxed">
                      Média ponderada dos oito eixos de funcionalidade nesta data.
                    </div>
                  </div>

                  {/* Barras Horizontais dos 8 Eixos */}
                  <div className="space-y-3">
                    <div className="text-[20px] font-bold text-white tracking-wide">
                      Por Eixo
                    </div>

                    {CHECKIN_AXES.map(axis => {
                      const score = item.axisScores[axis.id] ?? 70;
                      return (
                        <div key={axis.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-[18px]">
                            <span className="text-[#e8e8f0] font-medium text-[18px]">{axis.name}</span>
                            <span className="text-white font-bold tabular-nums text-[18px]">
                              {score > 0 ? `${score}/100` : 'Não avaliado'}
                            </span>
                          </div>
                          
                          {/* Barra Horizontal do Eixo */}
                          <div className="h-2.5 bg-white/[0.08] rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                              className="h-full bg-[#5eea8f] rounded-full transition-all duration-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Botão de Rodapé para Recolher Avaliação (evita scroll de volta) */}
                  <div className="pt-3 flex justify-center border-t border-white/[0.04]">
                    <button
                      type="button"
                      onClick={() => setOpenCheckInId(null)}
                      className="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white text-[18px] font-semibold flex items-center gap-2 transition cursor-pointer active:scale-95"
                    >
                      <ChevronDown className="w-5 h-5 rotate-180 text-[#5eea8f]" />
                      <span>Recolher Check-In</span>
                    </button>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* CURVA DE VITALIDADE E FUNCIONALIDADES PERCEBIDAS (Fiel à Imagem 3) */}
      {/* ============================================================== */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 shadow-sm">
        
        {/* Cabeçalho do Gráfico */}
        <div className="flex items-center gap-2.5">
          {/* Ícone fiel à imagem 3: linha ascendente com barras verticais */}
          <svg 
            className="w-7 h-7 text-[#5eea8f] shrink-0" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <rect x="3" y="15" width="3" height="6" fill="#5eea8f" stroke="none" opacity="0.6" rx="0.5" />
            <rect x="9" y="11" width="3" height="10" fill="#5eea8f" stroke="none" opacity="0.8" rx="0.5" />
            <rect x="15" y="7" width="3" height="14" fill="#5eea8f" stroke="none" opacity="1" rx="0.5" />
            <path d="M3 15l6-6 6 3 6-7" stroke="#5eea8f" strokeWidth="2.5" />
            <path d="M17 5h4v4" stroke="#5eea8f" strokeWidth="2.5" />
          </svg>
          <div>
            <div className="text-[20px] font-bold text-white leading-tight">
              Curva de Vitalidade e<br />Funcionalidades Percebidas
            </div>
          </div>
        </div>

        {/* Pontuação referente ao registro anterior centralizada com estilo button sem função */}
        <div className="mt-4 text-center space-y-1.5 flex flex-col items-center">
          <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl bg-[#5eea8f]/15 border border-[#5eea8f]/35 shadow-sm text-center">
            <span className="text-[25px] font-bold text-[#5eea8f] tabular-nums leading-none">
              {currentDelta !== undefined ? (currentDelta >= 0 ? `+${currentDelta} pontos` : `${currentDelta} pontos`) : '+0 pontos'}
            </span>
          </div>
          <div className="text-[19px] text-[#cfd3dc] font-medium text-center">
            Referente ao registro anterior
          </div>
        </div>

        {/* Gráfico SVG com Linha e Pontos Conectados (rolagem lateral automática se houver mais de 8 avaliações) */}
        <div className="w-full overflow-x-auto no-scrollbar py-2">
          {(() => {
            const count = checkIns.length;
            const minVal = 55;
            const maxVal = 85;

            // Se count <= 8, largura normal de 330px ocupando 100%. Se > 8, expande para rolagem lateral suave
            const isScrollable = count > 8;
            const chartWidth = isScrollable ? count * 44 : 330;
            const startX = 16; // Ponto 1° movido para a esquerda aproveitando o espaço da borda
            const endX = chartWidth - 16;
            const stepX = (endX - startX) / Math.max(1, count - 1);

            const points = checkIns.map((item, idx) => {
              const x = startX + idx * stepX;
              const clamped = Math.max(minVal, Math.min(maxVal, item.ivp));
              const y = 82 - ((clamped - minVal) / (maxVal - minVal)) * 60;
              return { 
                x, 
                y, 
                val: item.ivp, 
                label: `${idx + 1}°` 
              };
            });

            const polyPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
            const areaPath = `${polyPath} L ${points[points.length - 1].x.toFixed(1)} 86 L ${points[0].x.toFixed(1)} 86 Z`;

            return (
              <svg 
                viewBox={`0 0 ${chartWidth} 105`} 
                style={{ 
                  minWidth: isScrollable ? `${chartWidth}px` : '100%',
                  width: isScrollable ? `${chartWidth}px` : '100%' 
                }}
                className="h-36 overflow-visible"
              >
                <defs>
                  <linearGradient id="vitalityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5eea8f" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#5eea8f" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Linhas de Grade Tracejadas */}
                <line x1="8" y1="22" x2={chartWidth - 8} y2="22" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                <line x1="8" y1="52" x2={chartWidth - 8} y2="52" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                <line x1="8" y1="82" x2={chartWidth - 8} y2="82" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />

                <path d={areaPath} fill="url(#vitalityGradient)" />
                <path d={polyPath} fill="none" stroke="#5eea8f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                
                {points.map((p, idx) => (
                  <g key={idx}>
                    {/* Círculo do Ponto */}
                    <circle cx={p.x} cy={p.y} r="5" fill="#0d0d16" stroke="#5eea8f" strokeWidth="2.5" />
                    <circle cx={p.x} cy={p.y} r="2" fill="#5eea8f" />
                    
                    {/* Valor do Ponto com font-size 16px */}
                    <text x={p.x} y={p.y - 9} fill="#ffffff" fontSize="16" textAnchor="middle" fontWeight="bold">
                      {p.val}
                    </text>
                    
                    {/* Rótulo do Check-in (1°, 2°, 3°...) com font-size 16px */}
                    <text x={p.x} y="100" fill="#8e8ea6" fontSize="16" textAnchor="middle" fontWeight="600">
                      {p.label}
                    </text>
                  </g>
                ))}
              </svg>
            );
          })()}
        </div>

      </div>

      {/* ============================================================== */}
      {/* COMENTÁRIO AUTOMÁTICO DA IA (Seção 6 e 7)                       */}
      {/* ============================================================== */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 shadow-sm space-y-2">
        <div className="flex items-center gap-2.5 mb-1">
          <Sparkles className="w-5 h-5 text-[#e5a93c] shrink-0" />
          <div className="text-[20px] font-bold text-white">
            Reconhecimento da Vitalidade
          </div>
        </div>
        <div className="text-[20px] text-[#cfd3dc] leading-relaxed font-normal">
          {getAiFeedback()}
        </div>
        <div className="text-[18px] text-[#8e8ea6] mt-3 pt-2.5 border-t border-white/[0.06] leading-snug">
          Instrumento de percepção de saúde e funcionalidade autorreferida da clínica Vittáre.
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 9:16 QUESTIONÁRIO COMPLETO COM OS 8 EIXOS               */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 animate-fadeIn">
          <div 
            className="w-full max-w-[420px] h-[92vh] max-h-[820px] rounded-3xl bg-[#0f1424] border border-[#2b3558] flex flex-col overflow-hidden shadow-2xl font-['Plus_Jakarta_Sans',sans-serif]"
          >
            {/* Cabeçalho do Modal com Fundo Azul Marinho Escuro */}
            <div className="p-4 bg-[#141b30] border-b border-white/10 flex items-center justify-between shrink-0">
              <div>
                <div className="text-[18px] font-bold text-white leading-tight">
                  Acompanhamento da Vitalidade
                </div>
                <div className="text-[13px] text-[#5eea8f] font-medium mt-0.5">
                  Período: 19/10 a 02/11 · Últimos 14 dias
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
                title="Fechar questionário"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Progresso de Respostas */}
            <div className="bg-[#101628] px-4 py-2 border-b border-white/[0.06] flex items-center justify-between text-[12px] text-[#8e8ea6] shrink-0">
              <span>{answeredCount} de {totalQuestions} perguntas respondidas</span>
              <div className="w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${Math.round((answeredCount / totalQuestions) * 100)}%` }}
                  className="h-full bg-[#5eea8f] rounded-full transition-all duration-300"
                />
              </div>
            </div>

            {/* Corpo do Questionário (Scrollável com 9:16) */}
            <div className="grow overflow-y-auto p-4 space-y-6 no-scrollbar">
              
              {/* Orientação ao Paciente */}
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-[13px] text-[#cfd3dc] leading-relaxed">
                Considere os <strong>últimos 14 dias</strong>. Responda pensando no período como um todo, e não apenas em como você está se sentindo neste momento.
              </div>

              {/* Lista dos 8 Eixos */}
              {CHECKIN_AXES.map((axis, axisIdx) => (
                <div key={axis.id} className="space-y-4">
                  
                  {/* Cabeçalho do Eixo */}
                  <div className="sticky top-0 z-10 py-2 px-3 rounded-xl bg-[#18213d] border border-[#2e3b66] shadow-sm flex items-center justify-between">
                    <span className="text-[16px] font-bold text-white">
                      {axis.number}. {axis.name}
                    </span>
                    <span className="text-[11px] font-semibold text-[#5eea8f] uppercase tracking-wider bg-[#5eea8f]/10 px-2 py-0.5 rounded">
                      Eixo {axis.number} de 8
                    </span>
                  </div>

                  {/* As 4 perguntas do eixo */}
                  {axis.questions.map((q, qIdx) => {
                    const sel = answers[q.id];
                    return (
                      <div 
                        key={q.id}
                        className="bg-[#13192c] border border-white/[0.08] rounded-2xl p-4 shadow-sm space-y-3"
                      >
                        {/* Enunciado da Pergunta */}
                        <div className="text-[16px] font-medium text-white leading-snug">
                          <span className="text-[#5eea8f] font-bold mr-1.5">{axis.number}.{qIdx + 1}</span>
                          {q.text}
                        </div>

                        {/* Botões Segmentados 0 a 3 (Baseado fielmente no template HTML do usuário) */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {SCALE_OPTIONS.map(opt => {
                            const isSelected = sel === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleSelectAnswer(q.id, opt.value)}
                                className={`py-3 text-[18px] font-bold rounded-xl border transition cursor-pointer select-none ${
                                  isSelected
                                    ? 'bg-[#4c66e8] border-[#4c66e8] text-white shadow-md'
                                    : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-[#a5a4b8]'
                                }`}
                              >
                                {opt.value}
                              </button>
                            );
                          })}
                        </div>

                        {/* Label descritivo da seleção */}
                        <div className="text-center min-h-[38px] flex flex-col items-center justify-center">
                          {sel === null || sel === undefined ? (
                            <span className="text-[14px] text-[#8e8ea6] italic">
                              Toque em um número de 0 a 3
                            </span>
                          ) : sel === 'nse' ? (
                            <span className="text-[15px] font-medium text-[#cfd3dc] italic">
                              Não consegui avaliar · <strong className="text-[#8e8ea6] not-italic">Não pontua</strong>
                            </span>
                          ) : (
                            <div>
                              <div className="text-[16px] font-bold text-white">
                                {SCALE_OPTIONS[sel].label}
                              </div>
                              <div className="text-[13px] text-[#a5a4b8] mt-0.5">
                                Pontuação: <strong className="text-[#5eea8f]">{sel}</strong> · Referência: {SCALE_OPTIONS[sel].ref}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Botão Especial "Não consegui avaliar" */}
                        <div className="text-center pt-1 border-t border-white/[0.06]">
                          <button
                            type="button"
                            onClick={() => handleSelectAnswer(q.id, 'nse')}
                            className={`text-[14px] italic px-3 py-1 rounded-lg transition cursor-pointer ${
                              sel === 'nse'
                                ? 'bg-[#3b4766] text-white not-italic font-medium'
                                : 'text-[#8e8ea6] hover:text-[#cfd3dc] underline'
                            }`}
                          >
                            Não consegui avaliar
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Botão de Envio dentro do Modal */}
              <div className="pt-2 pb-4">
                <button
                  type="button"
                  onClick={handleSubmitCheckIn}
                  className="w-full min-h-[50px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#0f7a3a] via-[#129446] to-[#0f7a3a] hover:from-[#139247] hover:to-[#108c43] border border-[#5eea8f]/50 text-white font-bold text-[17px] tracking-wide flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span>ENVIAR PROGRESSO</span>
                </button>
                <div className="text-center text-[12px] text-[#8e8ea6] mt-2">
                  Seus dados serão calculados e integrados à sua Curva de Vitalidade instantaneamente.
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
