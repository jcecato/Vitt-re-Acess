import { PhysicalAssessmentMetrics, PhysicalAssessmentItem, PatientProfile } from '../types/patient';

export type BarSpectrumMode = 'bilateral' | 'low-is-good' | 'high-is-good' | 'none';
export type ClinicalZoneStatus = 'ideal' | 'atencao' | 'alerta' | 'neutral';
export type EvolutionDirection = 'lower-better' | 'higher-better' | 'neutral';

export interface SmartMetricCard {
  id: string;
  title: string;
  valueDisplay: string;
  referenceText: string;
  infoText: string;
  barMode: BarSpectrumMode;
  zoneStatus: ClinicalZoneStatus;
  markerPercent: number | null;
  ageTag?: string;
  rawValue?: number | null;
  evolutionDirection?: EvolutionDirection;
}

export interface EvolutionMetricPoint {
  date: string;
  value: number;
  valueDisplay: string;
  shortLabel: string;
}

export interface EvolutionMetricSeries {
  id: string;
  title: string;
  referenceText: string;
  evolutionDirection: EvolutionDirection;
  points: EvolutionMetricPoint[];
}

export interface EvolutionMetricGroup {
  title: string;
  items: EvolutionMetricSeries[];
}

export interface SmartChecklistItem {
  label: string;
  status: 'ideal' | 'atencao' | 'alerta' | 'neutral';
  value: string;
  summaryText: string;
}

export interface ComputedAnthropometryReport {
  groups: {
    title: string;
    items: SmartMetricCard[];
  }[];
  checklist: SmartChecklistItem[];
  bodyMapValues: {
    isFemale: boolean;
    musc: string;
    gord: string;
    visc: string;
    brac: string;
    cint: string;
    abdo: string;
    quad: string;
    coxa: string;
    pant: string;
  };
}

export const REFERENCIAS_GORDURA: Record<string, { minAge: number; maxAge: number; normal: [number, number]; alto: [number, number]; muitoAlto: number }[]> = {
  F: [
    { minAge: 20, maxAge: 39, normal: [21.0, 32.9], alto: [33.0, 38.9], muitoAlto: 39.0 },
    { minAge: 40, maxAge: 59, normal: [23.0, 33.9], alto: [34.0, 39.9], muitoAlto: 40.0 },
    { minAge: 60, maxAge: 999, normal: [24.0, 35.9], alto: [36.0, 41.9], muitoAlto: 42.0 }
  ],
  M: [
    { minAge: 20, maxAge: 39, normal: [8.0, 19.9], alto: [20.0, 24.9], muitoAlto: 25.0 },
    { minAge: 40, maxAge: 59, normal: [11.0, 21.9], alto: [22.0, 27.9], muitoAlto: 28.0 },
    { minAge: 60, maxAge: 999, normal: [13.0, 24.9], alto: [25.0, 29.9], muitoAlto: 30.0 }
  ]
};

export const ANTROPOMETRIA_REF: Record<string, any> = {
  cintura: {
    M: [
      { max: 79.9, label: 'Baixo', status: 'low', chk: 'warning', minIdeal: 80.0, maxIdeal: 93.9 },
      { max: 93.9, label: 'Adequado', status: 'normal', chk: 'success', minIdeal: 80.0, maxIdeal: 93.9 },
      { max: 999, label: 'Alto', status: 'high', chk: 'danger', minIdeal: 80.0, maxIdeal: 93.9 }
    ],
    F: [
      { max: 69.9, label: 'Baixo', status: 'low', chk: 'warning', minIdeal: 70.0, maxIdeal: 79.9 },
      { max: 79.9, label: 'Adequada', status: 'normal', chk: 'success', minIdeal: 70.0, maxIdeal: 79.9 },
      { max: 999, label: 'Alto', status: 'high', chk: 'danger', minIdeal: 70.0, maxIdeal: 79.9 }
    ]
  },
  abdominal: {
    M: [
      { max: 79.9, label: 'Baixo', status: 'low', chk: 'warning', minIdeal: 80.0, maxIdeal: 93.9 },
      { max: 93.9, label: 'Adequado', status: 'normal', chk: 'success', minIdeal: 80.0, maxIdeal: 93.9 },
      { max: 999, label: 'Alto', status: 'high', chk: 'danger', minIdeal: 80.0, maxIdeal: 93.9 }
    ],
    F: [
      { max: 69.9, label: 'Baixo', status: 'low', chk: 'warning', minIdeal: 70.0, maxIdeal: 79.9 },
      { max: 79.9, label: 'Adequada', status: 'normal', chk: 'success', minIdeal: 70.0, maxIdeal: 79.9 },
      { max: 999, label: 'Alto', status: 'high', chk: 'danger', minIdeal: 70.0, maxIdeal: 79.9 }
    ]
  },
  rcq: {
    M: [
      { max: 0.80, label: 'Baixo', status: 'low', chk: 'warning', minIdeal: 0.81, maxIdeal: 0.90 },
      { max: 0.90, label: 'Adequado', status: 'normal', chk: 'success', minIdeal: 0.81, maxIdeal: 0.90 },
      { max: 999, label: 'Alto', status: 'high', chk: 'danger', minIdeal: 0.81, maxIdeal: 0.90 }
    ],
    F: [
      { max: 0.70, label: 'Baixo', status: 'low', chk: 'warning', minIdeal: 0.71, maxIdeal: 0.80 },
      { max: 0.80, label: 'Adequado', status: 'normal', chk: 'success', minIdeal: 0.71, maxIdeal: 0.80 },
      { max: 999, label: 'Alto', status: 'high', chk: 'danger', minIdeal: 0.71, maxIdeal: 0.80 }
    ]
  },
  rce: {
    ALL: [
      { max: 0.40, label: 'Baixo', status: 'low', chk: 'warning', minIdeal: 0.41, maxIdeal: 0.50 },
      { max: 0.50, label: 'Adequado', status: 'normal', chk: 'success', minIdeal: 0.41, maxIdeal: 0.50 },
      { max: 999, label: 'Alto', status: 'high', chk: 'danger', minIdeal: 0.41, maxIdeal: 0.50 }
    ]
  },
  muac: {
    M: [
      { max: 26.9, label: 'Baixo', status: 'low', chk: 'warning', minIdeal: 27.0, maxIdeal: 32.0 },
      { max: 32.0, label: 'Adequado', status: 'normal', chk: 'success', minIdeal: 27.0, maxIdeal: 32.0 },
      { max: 999, label: 'Alto', status: 'high', chk: 'danger', minIdeal: 27.0, maxIdeal: 32.0 }
    ],
    F: [
      { max: 25.9, label: 'Baixo', status: 'low', chk: 'warning', minIdeal: 26.0, maxIdeal: 31.0 },
      { max: 31.0, label: 'Adequado', status: 'normal', chk: 'success', minIdeal: 26.0, maxIdeal: 31.0 },
      { max: 999, label: 'Alto', status: 'high', chk: 'danger', minIdeal: 26.0, maxIdeal: 31.0 }
    ]
  },
  cmb: {
    M: [
      { max: 25.0, label: 'Baixo', status: 'low', chk: 'warning', minIdeal: 25.1, maxIdeal: 30.0 },
      { max: 30.0, label: 'Adequado', status: 'normal', chk: 'success', minIdeal: 25.1, maxIdeal: 30.0 },
      { max: 999, label: 'Alto (Hipertrofia)', status: 'high', chk: 'success', minIdeal: 25.1, maxIdeal: 30.0 }
    ],
    F: [
      { max: 21.0, label: 'Baixo', status: 'low', chk: 'warning', minIdeal: 21.1, maxIdeal: 25.0 },
      { max: 25.0, label: 'Adequado', status: 'normal', chk: 'success', minIdeal: 21.1, maxIdeal: 25.0 },
      { max: 999, label: 'Alto (Hipertrofia)', status: 'high', chk: 'success', minIdeal: 21.1, maxIdeal: 25.0 }
    ]
  },
  tsf: {
    M: [
      { max: 7.9, label: 'Baixo', status: 'low', chk: 'warning', minIdeal: 8.0, maxIdeal: 20.0 },
      { max: 20.0, label: 'Adequado', status: 'normal', chk: 'success', minIdeal: 8.0, maxIdeal: 20.0 },
      { max: 999, label: 'Alto', status: 'high', chk: 'danger', minIdeal: 8.0, maxIdeal: 20.0 }
    ],
    F: [
      { max: 9.9, label: 'Baixo', status: 'low', chk: 'warning', minIdeal: 10.0, maxIdeal: 25.0 },
      { max: 25.0, label: 'Adequado', status: 'normal', chk: 'success', minIdeal: 10.0, maxIdeal: 25.0 },
      { max: 999, label: 'Alto', status: 'high', chk: 'danger', minIdeal: 10.0, maxIdeal: 25.0 }
    ]
  }
};

export const REFERENCIAS_MUSCULO: Record<string, any> = {
  adulto: {
    M: [
      { max: 32.9, label: 'Baixo', minIdeal: 33.0, maxIdeal: 39.0 },
      { max: 39.0, label: 'Normal', ideal: '33,0% a 39,0%', minIdeal: 33.0, maxIdeal: 39.0 },
      { max: 44.0, label: 'Alto', minIdeal: 33.0, maxIdeal: 39.0 },
      { max: 999, label: 'Muito Alto', minIdeal: 33.0, maxIdeal: 39.0 }
    ],
    F: [
      { max: 23.9, label: 'Baixo', minIdeal: 24.0, maxIdeal: 30.0 },
      { max: 30.0, label: 'Normal', ideal: '24,0% a 30,0%', minIdeal: 24.0, maxIdeal: 30.0 },
      { max: 35.0, label: 'Alto', minIdeal: 24.0, maxIdeal: 30.0 },
      { max: 999, label: 'Muito Alto', minIdeal: 24.0, maxIdeal: 30.0 }
    ]
  },
  idoso: {
    M: [
      { max: 29.0, label: 'Baixo (Risco Sarcopenia)', minIdeal: 29.1, maxIdeal: 38.0 },
      { max: 38.0, label: 'Normal', ideal: '29,1% a 38,0%', minIdeal: 29.1, maxIdeal: 38.0 },
      { max: 42.0, label: 'Alto (Excelente)', minIdeal: 29.1, maxIdeal: 38.0 },
      { max: 999, label: 'Muito Alto', minIdeal: 29.1, maxIdeal: 38.0 }
    ],
    F: [
      { max: 23.0, label: 'Baixo (Risco Sarcopenia)', minIdeal: 23.1, maxIdeal: 30.0 },
      { max: 30.0, label: 'Normal', ideal: '23,1% a 30,0%', minIdeal: 23.1, maxIdeal: 30.0 },
      { max: 34.0, label: 'Alto (Excelente)', minIdeal: 23.1, maxIdeal: 30.0 },
      { max: 999, label: 'Muito Alto', minIdeal: 23.1, maxIdeal: 30.0 }
    ]
  }
};

export const METAS_GORDURA: Record<string, { saude: [number, number] }> = {
  M: { saude: [18, 24] },
  F: { saude: [25, 31] }
};

/**
 * Nomenclatura padronizada sincronizada entre os Cards e o CHECKLIST CLÍNICO
 */
export const METRIC_TITLES = {
  pesoCorporal: 'Peso Corporal',
  imc: 'Índice Massa Muscular',
  ffmi: 'Massa Magra',
  gorduraCorporal: 'Gordura Corporal',
  massaMuscular: 'Massa Muscular',
  gorduraVisceral: 'Gordura Visceral',
  mmlg: 'Massa Livre de Gordura',
  pesoOsseo: 'Peso Ósseo',
  cintura: 'Cintura',
  abdominal: 'Abdominal',
  quadril: 'Quadril',
  rcq: 'Cintura-Quadril',
  rce: 'Cintura-Estatura',
  braco: 'Braço (MUAC)',
  cmb: 'Reserva Muscular Braço',
  dobraTri: 'Dobra Tricipital',
  panturrilha: 'Panturrilha',
  compCoxa: 'Coxa Gordura/Músculo',
  dobraCoxa: 'Gordura Coxa',
  coxa: 'Coxa',
  antebraco: 'Antebraço',
  punho: 'Punho (Diâmetro)',
  femur: 'Fêmur (Diâmetro)',
  umero: 'Úmero (Diâmetro)',
  tmb: 'Taxa Energia Repouso',
  get: 'Gasto de Energia Total'
} as const;

/**
 * Textos básicos enxutos aprovados para o modal (i) (Fundo Marinho, Fonte 18px Branca)
 */
export const INFO_MODAL_TEXTS = {
  pesoCorporal: 'Mostra a soma total de tudo o que compõe o seu corpo. Seu peso total.',
  imc: 'Avalia se o seu peso atual está proporcional à sua altura. Estar na faixa adequada protege o coração, melhora a respiração e diminui o risco de complicações metabólicas.',
  gorduraCorporal: 'Indica a reserva de energia acumulada no corpo. Quando baixo ou alto requer atenção.',
  massaMuscular: 'Representa a quantidade de músculos totais em seu corpo.',
  gorduraVisceral: 'Mede a gordura que envolve os órgãos vitais do abdômen.',
  ffmi: 'Revela o volume real de desenvolvimento muscular em relação à sua estatura.',
  mmlg: 'Soma todos os tecidos metabolicamente ativos do corpo, como músculos, órgãos e água corporal.',
  pesoOsseo: 'Estima o peso total de todos os ossos do seu corpo.',
  cintura: 'Avalia a concentração de gordura na região central do tronco.',
  abdominal: 'Acompanha a variação de volume e retenção na região do abdômen.',
  quadril: 'Reflete a estrutura pélvica e a musculatura glútea de sustentação.',
  rcq: 'Mostra como a gordura está distribuída entre a parte superior e inferior do corpo.',
  rce: 'Avalia a proporção entre a medida da sua cintura e a sua altura total.',
  braco: 'Avalia o estado nutricional e a reserva muscular e de energia dos membros superiores.',
  cmb: 'Isola apenas a quantidade de músculo puro do braço, descontando a camada de gordura.',
  panturrilha: 'Avalia a quantidade de músculo de reserva que possui para funções do dia a dia.',
  compCoxa: 'Mostra a proporção entre músculo e gordura nos membros inferiores.',
  perimetrosMembros: 'Registra o volume muscular dos membros para comparar sua evolução ao longo do tratamento.',
  dobrasCutaneas: 'Mede diretamente a espessura da camada de gordura localizada logo abaixo da pele. Ajuda a distinguir com precisão o que é redução de gordura superficial e o que é ganho de músculo.',
  diametrosOsseos: 'Mede a largura dos ossos para identificar o seu biotipo físico natural. Com isso, todas as metas de peso e massa muscular são personalizadas exatamente para a sua estrutura corporal.',
  tmb: 'Indica a energia mínima que o seu organismo gasta parado apenas para manter o coração batendo, a respiração e a temperatura corporal.',
  get: 'Representa o total de energia que você consome ao longo de um dia inteiro somando sua rotina e movimentação. Serve como guia exato para planejar o emagrecimento ou ganho de massa magra.'
};

/**
 * Templates clínicos oficiais para o CHECKLIST CLÍNICO (Fonte 18px não itálico e justificado)
 */
export const CHECKLIST_TEMPLATES = {
  pesoImc: {
    ideal: 'Resultado dentro da faixa de referência. A manutenção desse equilíbrio contribui para a mobilidade, o conforto físico e a disposição diária.',
    low: 'Peso abaixo da faixa de referência para sua estrutura corporal. Vale avaliar a reserva nutricional e a necessidade de ajustes individualizados.',
    high: 'Peso acima da faixa de referência atual. Um ajuste gradual da composição corporal pode favorecer a mobilidade e o conforto nas atividades diárias.'
  },
  gordura: {
    ideal: 'Resultado dentro da faixa esperada. A manutenção desse equilíbrio contribui para as funções metabólicas e hormonais.',
    low: 'Percentual de gordura abaixo da faixa de referência. É importante avaliar as reservas energéticas e a adequação nutricional.',
    high: 'Percentual acima da faixa de referência. O resultado indica oportunidade de ajustar a composição corporal de forma gradual e individualizada.'
  },
  musculo: {
    ideal: 'Boa reserva muscular. Manter essa condição favorece a força, a estabilidade corporal e a autonomia nos movimentos.',
    low: 'Reserva muscular abaixo da faixa esperada. Merece atenção ao aporte nutricional e aos estímulos adequados para sua manutenção e recuperação.'
  },
  visceral: {
    ideal: 'Resultado dentro da faixa de referência. A manutenção desse equilíbrio é favorável à saúde metabólica e cardiovascular.',
    high: 'Nível acima da referência. Vale observar a composição corporal e os hábitos relacionados à alimentação, atividade física e descanso.'
  },
  cinturaAbdomenRcq: {
    ideal: 'Medidas dentro da faixa esperada. A manutenção desse equilíbrio favorece o acompanhamento da composição corporal e da saúde metabólica.',
    low: 'Medidas abaixo da referência. A interpretação deve considerar sua estrutura corporal e os demais indicadores avaliados.',
    high: 'Medidas acima da faixa esperada. O resultado merece atenção à distribuição de gordura corporal e ao acompanhamento da saúde metabólica.'
  },
  braco: {
    ideal: 'Medida dentro da faixa esperada. Esse resultado contribui para o acompanhamento da reserva corporal e muscular.',
    low: 'Medida abaixo da faixa de referência. Vale avaliar a reserva muscular e a adequação do aporte nutricional.',
    high: 'Medida acima da faixa esperada. A interpretação deve considerar os demais indicadores, pois a circunferência, isoladamente, não diferencia massa muscular, gordura ou retenção.'
  },
  membrosInferiores: {
    ideal: 'Medidas dentro da faixa esperada. A manutenção da reserva muscular favorece a mobilidade, o equilíbrio e a autonomia diária.',
    low: 'Medidas abaixo da faixa de referência. É importante acompanhar a reserva muscular e avaliar estratégias para sua manutenção e recuperação.',
    high: 'Volume acima da faixa esperada. A interpretação deve considerar a proporção entre massa muscular, tecido adiposo e possíveis alterações de líquidos.'
  }
};

export const numBR = (n: number | null | undefined, max = 1): string => {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: max === 0 ? 0 : 1, maximumFractionDigits: max }).format(n);
};

const clampPct = (val: number): number => Math.max(4, Math.min(96, val));

export function computeBilateralBar(
  val: number,
  lowAlertMax: number,
  idealMin: number,
  idealMax: number,
  highWarningMax: number
): { status: ClinicalZoneStatus; markerPct: number } {
  if (val >= idealMin && val <= idealMax) {
    const span = Math.max(0.001, idealMax - idealMin);
    const ratio = (val - idealMin) / span;
    return { status: 'ideal', markerPct: clampPct(38 + ratio * 24) };
  }
  if (val < idealMin && val >= lowAlertMax) {
    const span = Math.max(0.001, idealMin - lowAlertMax);
    const ratio = (val - lowAlertMax) / span;
    return { status: 'atencao', markerPct: clampPct(20 + ratio * 15) };
  }
  if (val < lowAlertMax) {
    const minFloor = lowAlertMax * 0.65;
    const span = Math.max(0.001, lowAlertMax - minFloor);
    const ratio = Math.max(0, (val - minFloor) / span);
    return { status: 'alerta', markerPct: clampPct(5 + ratio * 12) };
  }
  if (val > idealMax && val <= highWarningMax) {
    const span = Math.max(0.001, highWarningMax - idealMax);
    const ratio = (val - idealMax) / span;
    return { status: 'atencao', markerPct: clampPct(65 + ratio * 15) };
  }
  const maxCeil = highWarningMax * 1.25;
  const span = Math.max(0.001, maxCeil - highWarningMax);
  const ratio = Math.min(1, (val - highWarningMax) / span);
  return { status: 'alerta', markerPct: clampPct(83 + ratio * 12) };
}

export function computeLowIsGoodBar(
  val: number,
  idealMax: number,
  warningMax: number
): { status: ClinicalZoneStatus; markerPct: number } {
  if (val <= idealMax) {
    const ratio = Math.max(0, val / Math.max(1, idealMax));
    return { status: 'ideal', markerPct: clampPct(8 + ratio * 34) };
  }
  if (val <= warningMax) {
    const span = Math.max(0.001, warningMax - idealMax);
    const ratio = (val - idealMax) / span;
    return { status: 'atencao', markerPct: clampPct(48 + ratio * 22) };
  }
  const maxCeil = warningMax * 1.5;
  const span = Math.max(0.001, maxCeil - warningMax);
  const ratio = Math.min(1, (val - warningMax) / span);
  return { status: 'alerta', markerPct: clampPct(76 + ratio * 19) };
}

export function computeHighIsGoodBar(
  val: number,
  alertMax: number,
  idealMin: number,
  idealMaxRef: number
): { status: ClinicalZoneStatus; markerPct: number } {
  if (val < alertMax) {
    const floor = alertMax * 0.6;
    const span = Math.max(0.001, alertMax - floor);
    const ratio = Math.max(0, (val - floor) / span);
    return { status: 'alerta', markerPct: clampPct(6 + ratio * 16) };
  }
  if (val < idealMin) {
    const span = Math.max(0.001, idealMin - alertMax);
    const ratio = (val - alertMax) / span;
    return { status: 'atencao', markerPct: clampPct(27 + ratio * 22) };
  }
  const ceil = Math.max(idealMaxRef * 1.15, idealMin + 10);
  const span = Math.max(0.001, ceil - idealMin);
  const ratio = Math.min(1, (val - idealMin) / span);
  return { status: 'ideal', markerPct: clampPct(56 + ratio * 38) };
}

const parseNum = (v: any): number | null => {
  if (v === undefined || v === null || String(v).trim() === '' || String(v).trim() === '-') {
    return null;
  }
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) || n <= 0 ? null : n;
};

const getRef = (type: string, sex: string, value: number) => {
  const list = ANTROPOMETRIA_REF[type]?.[sex] || ANTROPOMETRIA_REF[type]?.['ALL'];
  if (!list) return null;
  for (const item of list) {
    if (value <= item.max) return item;
  }
  return list[list.length - 1];
};

const getFatRef = (sex: string, age: number) => {
  const list = REFERENCIAS_GORDURA[sex] || REFERENCIAS_GORDURA['M'];
  let ref = list.find((r) => age >= r.minAge && age <= r.maxAge);
  if (!ref) {
    ref = age < 20 ? list[0] : list[list.length - 1];
  }
  return ref;
};

const obterClassificacaoMusculo = (sexo: string, idade: number, valorAtual: number) => {
  const faixaEtaria = idade >= 60 ? 'idoso' : 'adulto';
  const referencias = REFERENCIAS_MUSCULO[faixaEtaria]?.[sexo] || REFERENCIAS_MUSCULO.adulto.M;
  const classificacao = referencias.find((ref: any) => valorAtual <= ref.max) || referencias[referencias.length - 1];
  const referenciaIdeal = referencias.find((ref: any) => ref.label.includes('Normal'));
  return {
    status: classificacao.label,
    textoIdeal: referenciaIdeal ? referenciaIdeal.ideal : '33,0% a 39,0%',
    minIdeal: referenciaIdeal ? referenciaIdeal.minIdeal : 33.0,
    maxIdeal: referenciaIdeal ? referenciaIdeal.maxIdeal : 39.0
  };
};

export function calculateFullAnthropometry(
  rawMetrics: PhysicalAssessmentMetrics = {},
  patient?: Partial<PatientProfile>
): ComputedAnthropometryReport {
  const m = rawMetrics || {};

  const rawSexo = String(m.sexo || m.sex || (patient as any)?.sex || (patient as any)?.gender || 'M').toUpperCase();
  const sexo: 'M' | 'F' = rawSexo.startsWith('F') ? 'F' : 'M';

  let idade = parseNum(m.idade ?? m.age ?? (patient as any)?.age) || 38;
  const rawNasc = m.nascimento || m.birthDate || (patient as any)?.birthDate;
  if (rawNasc && typeof rawNasc === 'string') {
    const parts = rawNasc.includes('-') ? rawNasc.split('-') : rawNasc.split('/').reverse();
    if (parts.length === 3) {
      const birth = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (!isNaN(birth.getTime())) {
        const today = new Date();
        let calcAge = today.getFullYear() - birth.getFullYear();
        const mo = today.getMonth() - birth.getMonth();
        if (mo < 0 || (mo === 0 && today.getDate() < birth.getDate())) calcAge--;
        if (calcAge > 0 && calcAge < 120) idade = calcAge;
      }
    }
  }
  const isElderly = idade >= 60;

  let altura = parseNum(m.altura ?? m.height ?? (patient as any)?.height) || 175;
  if (altura > 0 && altura < 3) {
    altura = Math.round(altura * 100);
  }

  const fatorAtividade = parseNum(m.atividade ?? m.activityFactor) || 1.375;

  const peso = parseNum(m.weight ?? m.peso);
  const gorduraPct = parseNum(m.bodyFat ?? m.gordura);
  const musculoPct = parseNum(m.muscleMass ?? m.musculo);
  const visceral = parseNum(m.visceralFat ?? m.visceral);
  const cintura = parseNum(m.waistCircumference ?? m.cintura);
  const abdominal = parseNum(m.abdominal);
  const quadril = parseNum(m.quadril);
  const braco = parseNum(m.braco);
  const antebraco = parseNum(m.antebraco);
  const coxa = parseNum(m.coxa);
  const panturrilha = parseNum(m.panturrilha);
  const punho = parseNum(m.punho);
  const femur = parseNum(m.femur);
  const umero = parseNum(m.umero);
  const dobraTri = parseNum(m.dobraTricipital);
  const dobraCoxa = parseNum(m.dobraCoxa);

  const checklist: SmartChecklistItem[] = [];
  const hM = altura / 100;
  const h2 = hM * hM;

  // 1. Peso Corporal e Peso Ideal
  const IMC_MIN = 22;
  const IMC_MAX = 24;
  const pesoIMCmin = IMC_MIN * h2;
  const pesoIMCmax = IMC_MAX * h2;
  let pesoIdealMin = pesoIMCmin;
  let pesoIdealMax = pesoIMCmax;

  if (peso !== null && gorduraPct !== null) {
    const massaMagra = peso * (1 - gorduraPct / 100);
    const alvo = METAS_GORDURA[sexo];
    const [gMin, gMax] = alvo.saude;
    if (gorduraPct > gMin) {
      const pesoCompMin = massaMagra / (1 - gMin / 100);
      const pesoCompMax = massaMagra / (1 - gMax / 100);
      const interMin = Math.max(pesoIMCmin, pesoCompMin);
      const interMax = Math.min(pesoIMCmax, pesoCompMax);
      if (interMin <= interMax) {
        pesoIdealMin = interMin;
        pesoIdealMax = interMax;
      }
    }
  }

  const pesoBar = peso !== null
    ? computeBilateralBar(peso, pesoIdealMin * 0.88, pesoIdealMin, pesoIdealMax, pesoIdealMax * 1.12)
    : { status: 'neutral' as ClinicalZoneStatus, markerPct: null };

  const cardPesoCorporal: SmartMetricCard = {
    id: 'peso-corporal',
    title: METRIC_TITLES.pesoCorporal,
    valueDisplay: peso !== null ? `${numBR(peso, 1)} Kg` : '-',
    referenceText: `Ref. Ideal: ${numBR(pesoIdealMin, 1)} a ${numBR(pesoIdealMax, 1)} Kg`,
    infoText: INFO_MODAL_TEXTS.pesoCorporal,
    barMode: 'bilateral',
    zoneStatus: pesoBar.status,
    markerPercent: pesoBar.markerPct,
    rawValue: peso,
    evolutionDirection: 'lower-better'
  };

  if (peso !== null) {
    const isLowPeso = peso < pesoIdealMin;
    const isHighPeso = peso > pesoIdealMax;
    checklist.push({
      label: METRIC_TITLES.pesoCorporal,
      status: pesoBar.status === 'neutral' ? 'ideal' : pesoBar.status,
      value: isLowPeso ? 'Abaixo da referência' : isHighPeso ? 'Acima da referência' : 'Na referência',
      summaryText: isLowPeso
        ? CHECKLIST_TEMPLATES.pesoImc.low
        : isHighPeso
        ? CHECKLIST_TEMPLATES.pesoImc.high
        : CHECKLIST_TEMPLATES.pesoImc.ideal
    });
  } else {
    checklist.push({
      label: METRIC_TITLES.pesoCorporal,
      status: 'neutral',
      value: '-',
      summaryText: '-'
    });
  }

  // 2. Índice Massa Muscular (IMC)
  const imc = peso !== null && h2 > 0 ? parseFloat((peso / h2).toFixed(2)) : null;
  const imcIdealStr = isElderly ? 'Ref. Ideal: 22,0 a 27,0 Kg' : 'Ref. Ideal: 18,5 a 24,9 Kg';
  let imcBar = { status: 'neutral' as ClinicalZoneStatus, markerPct: null as number | null };

  if (imc !== null) {
    if (isElderly) {
      imcBar = computeBilateralBar(imc, 20.0, 22.0, 27.0, 30.0);
      const lbl = imc < 22 ? 'Abaixo (<22,0)' : imc <= 27 ? 'Ideal (22,0–27,0)' : 'Acima (>27,0)';
      checklist.push({
        label: METRIC_TITLES.imc,
        status: imc < 22 ? 'alerta' : imc <= 27 ? 'ideal' : 'atencao',
        value: lbl,
        summaryText: imc < 22
          ? CHECKLIST_TEMPLATES.pesoImc.low
          : imc <= 27
          ? CHECKLIST_TEMPLATES.pesoImc.ideal
          : CHECKLIST_TEMPLATES.pesoImc.high
      });
    } else {
      imcBar = computeBilateralBar(imc, 16.0, 18.5, 24.99, 29.99);
      let lbl = 'Ideal (18,5–24,9)';
      if (imc < 18.5) lbl = 'Abaixo (<18,5)';
      else if (imc < 25) lbl = 'Ideal (18,5–24,9)';
      else if (imc < 30) lbl = 'Atenção (25,0–29,9)';
      else lbl = 'Acima (≥30,0)';

      checklist.push({
        label: METRIC_TITLES.imc,
        status: imc >= 18.5 && imc < 25 ? 'ideal' : imc >= 25 && imc < 30 ? 'atencao' : 'alerta',
        value: lbl,
        summaryText: imc < 18.5
          ? CHECKLIST_TEMPLATES.pesoImc.low
          : imc < 25
          ? CHECKLIST_TEMPLATES.pesoImc.ideal
          : CHECKLIST_TEMPLATES.pesoImc.high
      });
    }
  } else {
    checklist.push({
      label: METRIC_TITLES.imc,
      status: 'neutral',
      value: '-',
      summaryText: '-'
    });
  }

  const cardIMC: SmartMetricCard = {
    id: 'imc',
    title: METRIC_TITLES.imc,
    valueDisplay: imc !== null ? `${numBR(imc, 2)} Kg` : '-',
    referenceText: imcIdealStr,
    infoText: INFO_MODAL_TEXTS.imc,
    barMode: 'bilateral',
    zoneStatus: imcBar.status,
    markerPercent: imcBar.markerPct,
    rawValue: imc,
    evolutionDirection: 'lower-better'
  };

  // 3. Massa Magra (FFMI)
  const ffmi = peso !== null && gorduraPct !== null && h2 > 0
    ? (peso * (1 - gorduraPct / 100)) / h2
    : null;
  const ffmiBar = ffmi !== null
    ? computeHighIsGoodBar(ffmi, 16.5, 18.0, 21.0)
    : { status: 'neutral' as ClinicalZoneStatus, markerPct: null };

  const cardFFMI: SmartMetricCard = {
    id: 'ffmi',
    title: METRIC_TITLES.ffmi,
    valueDisplay: ffmi !== null ? `${numBR(ffmi, 1)} Kg` : '-',
    referenceText: 'Ref. Ideal: 18,0 a 21,0 Kg',
    infoText: INFO_MODAL_TEXTS.ffmi,
    barMode: 'high-is-good',
    zoneStatus: ffmiBar.status,
    markerPercent: ffmiBar.markerPct,
    rawValue: ffmi !== null ? parseFloat(ffmi.toFixed(1)) : null,
    evolutionDirection: 'higher-better'
  };

  // 4. Gordura Corporal (% e kg)
  const fatRef = getFatRef(sexo, idade);
  const [minNormFat, maxNormFat] = fatRef.normal;
  const [, maxAltoFat] = fatRef.alto;
  const pesoGordoKg = gorduraPct !== null && peso !== null ? (gorduraPct * peso) / 100 : null;
  const fatBar = gorduraPct !== null
    ? computeBilateralBar(gorduraPct, minNormFat * 0.7, minNormFat, maxNormFat, maxAltoFat)
    : { status: 'neutral' as ClinicalZoneStatus, markerPct: null };

  if (gorduraPct !== null) {
    let fatStatusLbl = 'Na referência';
    let fatChkStatus: 'ideal' | 'atencao' | 'alerta' = 'ideal';
    let fatSummary = CHECKLIST_TEMPLATES.gordura.ideal;

    if (gorduraPct < minNormFat) {
      fatStatusLbl = 'Abaixo da referência';
      fatChkStatus = 'atencao';
      fatSummary = CHECKLIST_TEMPLATES.gordura.low;
    } else if (gorduraPct <= maxNormFat) {
      fatStatusLbl = 'Na referência';
      fatChkStatus = 'ideal';
      fatSummary = CHECKLIST_TEMPLATES.gordura.ideal;
    } else if (gorduraPct <= maxAltoFat) {
      fatStatusLbl = 'Acima da referência';
      fatChkStatus = 'atencao';
      fatSummary = CHECKLIST_TEMPLATES.gordura.high;
    } else {
      fatStatusLbl = 'Elevado';
      fatChkStatus = 'alerta';
      fatSummary = CHECKLIST_TEMPLATES.gordura.high;
    }
    checklist.push({
      label: METRIC_TITLES.gorduraCorporal,
      status: fatChkStatus,
      value: fatStatusLbl,
      summaryText: fatSummary
    });
  } else {
    checklist.push({
      label: METRIC_TITLES.gorduraCorporal,
      status: 'neutral',
      value: '-',
      summaryText: '-'
    });
  }

  const cardGorduraCorporal: SmartMetricCard = {
    id: 'gordura-corporal',
    title: METRIC_TITLES.gorduraCorporal,
    valueDisplay: gorduraPct !== null
      ? `${numBR(gorduraPct, 1)}%${pesoGordoKg !== null ? ` (${numBR(pesoGordoKg, 1)} Kg)` : ''}`
      : '-',
    referenceText: `Ref. Ideal: ${numBR(minNormFat, 1)}% a ${numBR(maxNormFat, 1)}%`,
    infoText: INFO_MODAL_TEXTS.gorduraCorporal,
    barMode: 'bilateral',
    zoneStatus: fatBar.status,
    markerPercent: fatBar.markerPct,
    rawValue: gorduraPct,
    evolutionDirection: 'lower-better'
  };

  // 5. Massa Muscular (% e kg)
  const classMusc = obterClassificacaoMusculo(sexo, idade, musculoPct ?? 35);
  const pesoMuscKg = musculoPct !== null && peso !== null ? (musculoPct * peso) / 100 : null;
  const muscBar = musculoPct !== null
    ? computeHighIsGoodBar(musculoPct, classMusc.minIdeal * 0.85, classMusc.minIdeal, classMusc.maxIdeal)
    : { status: 'neutral' as ClinicalZoneStatus, markerPct: null };

  if (musculoPct !== null) {
    const isLowMusc = musculoPct < classMusc.minIdeal;
    checklist.push({
      label: METRIC_TITLES.massaMuscular,
      status: isLowMusc ? (musculoPct < classMusc.minIdeal * 0.85 ? 'alerta' : 'atencao') : 'ideal',
      value: isLowMusc ? 'Abaixo da referência' : 'Adequada',
      summaryText: isLowMusc ? CHECKLIST_TEMPLATES.musculo.low : CHECKLIST_TEMPLATES.musculo.ideal
    });
  } else {
    checklist.push({
      label: METRIC_TITLES.massaMuscular,
      status: 'neutral',
      value: '-',
      summaryText: '-'
    });
  }

  const cardMassaMuscular: SmartMetricCard = {
    id: 'massa-muscular',
    title: METRIC_TITLES.massaMuscular,
    valueDisplay: musculoPct !== null
      ? `${numBR(musculoPct, 1)}%${pesoMuscKg !== null ? ` (${numBR(pesoMuscKg, 1)} Kg)` : ''}`
      : '-',
    referenceText: `Ref. Ideal: ${numBR(classMusc.minIdeal, 1)}% a ${numBR(classMusc.maxIdeal, 1)}%`,
    infoText: INFO_MODAL_TEXTS.massaMuscular,
    barMode: 'high-is-good',
    zoneStatus: muscBar.status,
    markerPercent: muscBar.markerPct,
    rawValue: musculoPct,
    evolutionDirection: 'higher-better'
  };

  // 6. Gordura Visceral
  const viscBar = visceral !== null
    ? computeLowIsGoodBar(visceral, 9, 14)
    : { status: 'neutral' as ClinicalZoneStatus, markerPct: null };

  if (visceral !== null) {
    checklist.push({
      label: METRIC_TITLES.gorduraVisceral,
      status: visceral <= 9 ? 'ideal' : visceral <= 14 ? 'atencao' : 'alerta',
      value: visceral <= 9 ? 'Ideal (1–9)' : visceral <= 14 ? 'Atenção (10–14)' : 'Elevada (≥15)',
      summaryText: visceral <= 9 ? CHECKLIST_TEMPLATES.visceral.ideal : CHECKLIST_TEMPLATES.visceral.high
    });
  } else {
    checklist.push({
      label: METRIC_TITLES.gorduraVisceral,
      status: 'neutral',
      value: '-',
      summaryText: '-'
    });
  }

  const cardGorduraVisceral: SmartMetricCard = {
    id: 'gordura-visceral',
    title: METRIC_TITLES.gorduraVisceral,
    valueDisplay: visceral !== null ? `Nível ${numBR(visceral, 0)}` : '-',
    referenceText: 'Ref. Ideal: 1 a 9',
    infoText: INFO_MODAL_TEXTS.gorduraVisceral,
    barMode: 'low-is-good',
    zoneStatus: viscBar.status,
    markerPercent: viscBar.markerPct,
    rawValue: visceral,
    evolutionDirection: 'lower-better'
  };

  // 7. Peso Ósseo & Massa Livre de Gordura (MMLG)
  let pesoOsseo: number | null = null;
  if (punho !== null && femur !== null && hM > 0) {
    pesoOsseo = 3.02 * Math.pow(Math.pow(hM, 2) * (punho / 100) * (femur / 100) * 400, 0.712);
  } else if (peso !== null && altura > 0) {
    pesoOsseo = -0.25 + 0.046 * altura + 0.036 * peso - 0.012 * idade;
    if (idade >= 50) pesoOsseo -= (idade * 12) / 1000;
  }

  const mmlg = peso !== null && pesoGordoKg !== null && pesoOsseo !== null
    ? peso - pesoGordoKg - pesoOsseo
    : null;
  const minNormalMMLG = 18 * h2;
  const maxNormalMMLG = 21 * h2;
  const mmlgBar = mmlg !== null && mmlg > 0
    ? computeHighIsGoodBar(mmlg, minNormalMMLG * 0.85, minNormalMMLG, maxNormalMMLG)
    : { status: 'neutral' as ClinicalZoneStatus, markerPct: null };

  const cardMMLG: SmartMetricCard = {
    id: 'massa-livre-gordura',
    title: METRIC_TITLES.mmlg,
    valueDisplay: mmlg !== null && mmlg > 0 ? `${numBR(mmlg, 1)} Kg` : '-',
    referenceText: `Ref. Ideal: ${numBR(minNormalMMLG, 1)} a ${numBR(maxNormalMMLG, 1)} Kg`,
    infoText: INFO_MODAL_TEXTS.mmlg,
    barMode: 'high-is-good',
    zoneStatus: mmlgBar.status,
    markerPercent: mmlgBar.markerPct,
    rawValue: mmlg !== null && mmlg > 0 ? parseFloat(mmlg.toFixed(1)) : null,
    evolutionDirection: 'higher-better'
  };

  const cardPesoOsseo: SmartMetricCard = {
    id: 'peso-osseo',
    title: METRIC_TITLES.pesoOsseo,
    valueDisplay: pesoOsseo !== null && pesoOsseo > 0 ? `${numBR(pesoOsseo, 1)} Kg` : '-',
    referenceText: 'Ref. Ideal: Estrutura óssea individual',
    infoText: INFO_MODAL_TEXTS.pesoOsseo,
    barMode: 'none',
    zoneStatus: 'neutral',
    markerPercent: null,
    rawValue: pesoOsseo !== null && pesoOsseo > 0 ? parseFloat(pesoOsseo.toFixed(1)) : null,
    evolutionDirection: 'neutral'
  };

  // 8. Cintura, Abdominal, Quadril, Cintura-Quadril, Cintura-Estatura
  const refCint = cintura !== null ? getRef('cintura', sexo, cintura) : null;
  const cintMin = sexo === 'M' ? 80.0 : 70.0;
  const cintMax = sexo === 'M' ? 93.9 : 79.9;
  const cintBar = cintura !== null
    ? computeBilateralBar(cintura, cintMin * 0.85, cintMin, cintMax, cintMax * 1.1)
    : { status: 'neutral' as ClinicalZoneStatus, markerPct: null };

  if (cintura !== null && refCint) {
    checklist.push({
      label: METRIC_TITLES.cintura,
      status: refCint.chk === 'success' ? 'ideal' : refCint.chk === 'warning' ? 'atencao' : 'alerta',
      value: refCint.label,
      summaryText: refCint.status === 'low'
        ? CHECKLIST_TEMPLATES.cinturaAbdomenRcq.low
        : refCint.status === 'normal'
        ? CHECKLIST_TEMPLATES.cinturaAbdomenRcq.ideal
        : CHECKLIST_TEMPLATES.cinturaAbdomenRcq.high
    });
  } else {
    checklist.push({
      label: METRIC_TITLES.cintura,
      status: 'neutral',
      value: '-',
      summaryText: '-'
    });
  }

  const cardCintura: SmartMetricCard = {
    id: 'cintura',
    title: METRIC_TITLES.cintura,
    valueDisplay: cintura !== null ? `${numBR(cintura, 1)} cm` : '-',
    referenceText: `Ref. Ideal: ${numBR(cintMin, 1)} a ${numBR(cintMax, 1)} cm`,
    infoText: INFO_MODAL_TEXTS.cintura,
    barMode: 'bilateral',
    zoneStatus: cintBar.status,
    markerPercent: cintBar.markerPct,
    rawValue: cintura,
    evolutionDirection: 'lower-better'
  };

  const refAbd = abdominal !== null ? getRef('abdominal', sexo, abdominal) : null;
  const abdBar = abdominal !== null
    ? computeBilateralBar(abdominal, cintMin * 0.85, cintMin, cintMax, cintMax * 1.1)
    : { status: 'neutral' as ClinicalZoneStatus, markerPct: null };

  if (abdominal !== null && refAbd) {
    checklist.push({
      label: METRIC_TITLES.abdominal,
      status: refAbd.chk === 'success' ? 'ideal' : refAbd.chk === 'warning' ? 'atencao' : 'alerta',
      value: refAbd.label,
      summaryText: refAbd.status === 'low'
        ? CHECKLIST_TEMPLATES.cinturaAbdomenRcq.low
        : refAbd.status === 'normal'
        ? CHECKLIST_TEMPLATES.cinturaAbdomenRcq.ideal
        : CHECKLIST_TEMPLATES.cinturaAbdomenRcq.high
    });
  } else {
    checklist.push({
      label: METRIC_TITLES.abdominal,
      status: 'neutral',
      value: '-',
      summaryText: '-'
    });
  }

  const cardAbdominal: SmartMetricCard = {
    id: 'abdominal',
    title: METRIC_TITLES.abdominal,
    valueDisplay: abdominal !== null ? `${numBR(abdominal, 1)} cm` : '-',
    referenceText: `Ref. Ideal: ${numBR(cintMin, 1)} a ${numBR(cintMax, 1)} cm`,
    infoText: INFO_MODAL_TEXTS.abdominal,
    barMode: 'bilateral',
    zoneStatus: abdBar.status,
    markerPercent: abdBar.markerPct,
    rawValue: abdominal,
    evolutionDirection: 'lower-better'
  };

  const cardQuadril: SmartMetricCard = {
    id: 'quadril',
    title: METRIC_TITLES.quadril,
    valueDisplay: quadril !== null ? `${numBR(quadril, 1)} cm` : '-',
    referenceText: 'Ref. Ideal: Proporção individual',
    infoText: INFO_MODAL_TEXTS.quadril,
    barMode: 'none',
    zoneStatus: 'neutral',
    markerPercent: null,
    rawValue: quadril,
    evolutionDirection: 'neutral'
  };

  const cinturaEfetiva = cintura ?? abdominal;
  const rcq = cinturaEfetiva !== null && quadril !== null && quadril > 0 ? cinturaEfetiva / quadril : null;
  const refRCQ = rcq !== null ? getRef('rcq', sexo, rcq) : null;
  const rcqMin = sexo === 'M' ? 0.81 : 0.71;
  const rcqMax = sexo === 'M' ? 0.90 : 0.80;
  const rcqBar = rcq !== null
    ? computeBilateralBar(rcq, rcqMin * 0.88, rcqMin, rcqMax, rcqMax * 1.08)
    : { status: 'neutral' as ClinicalZoneStatus, markerPct: null };

  if (rcq !== null && refRCQ) {
    checklist.push({
      label: METRIC_TITLES.rcq,
      status: refRCQ.chk === 'success' ? 'ideal' : refRCQ.chk === 'warning' ? 'atencao' : 'alerta',
      value: refRCQ.label,
      summaryText: refRCQ.status === 'low'
        ? CHECKLIST_TEMPLATES.cinturaAbdomenRcq.low
        : refRCQ.status === 'normal'
        ? CHECKLIST_TEMPLATES.cinturaAbdomenRcq.ideal
        : CHECKLIST_TEMPLATES.cinturaAbdomenRcq.high
    });
  } else {
    checklist.push({
      label: METRIC_TITLES.rcq,
      status: 'neutral',
      value: '-',
      summaryText: '-'
    });
  }

  const cardRCQ: SmartMetricCard = {
    id: 'rcq',
    title: METRIC_TITLES.rcq,
    valueDisplay: rcq !== null ? numBR(rcq, 2) : '-',
    referenceText: `Ref. Ideal: ${numBR(rcqMin, 2)} a ${numBR(rcqMax, 2)}`,
    infoText: INFO_MODAL_TEXTS.rcq,
    barMode: 'bilateral',
    zoneStatus: rcqBar.status,
    markerPercent: rcqBar.markerPct,
    rawValue: rcq !== null ? parseFloat(rcq.toFixed(2)) : null,
    evolutionDirection: 'lower-better'
  };

  const rce = cinturaEfetiva !== null && altura > 0 ? cinturaEfetiva / altura : null;
  const rceBar = rce !== null
    ? computeBilateralBar(rce, 0.35, 0.41, 0.50, 0.56)
    : { status: 'neutral' as ClinicalZoneStatus, markerPct: null };

  const cardRCE: SmartMetricCard = {
    id: 'rce',
    title: METRIC_TITLES.rce,
    valueDisplay: rce !== null ? numBR(rce, 2) : '-',
    referenceText: 'Ref. Ideal: 0,41 a 0,50',
    infoText: INFO_MODAL_TEXTS.rce,
    barMode: 'bilateral',
    zoneStatus: rceBar.status,
    markerPercent: rceBar.markerPct,
    rawValue: rce !== null ? parseFloat(rce.toFixed(2)) : null,
    evolutionDirection: 'lower-better'
  };

  // Braço (MUAC) & Reserva Muscular Braço (CMB)
  const refMUAC = braco !== null ? getRef('muac', sexo, braco) : null;
  const muacMin = sexo === 'M' ? 27.0 : 26.0;
  const muacMax = sexo === 'M' ? 32.0 : 31.0;
  const muacBar = braco !== null
    ? computeBilateralBar(braco, muacMin * 0.85, muacMin, muacMax, muacMax * 1.12)
    : { status: 'neutral' as ClinicalZoneStatus, markerPct: null };

  if (braco !== null && refMUAC) {
    checklist.push({
      label: METRIC_TITLES.braco,
      status: refMUAC.chk === 'success' ? 'ideal' : refMUAC.chk === 'warning' ? 'atencao' : 'alerta',
      value: refMUAC.label,
      summaryText: refMUAC.status === 'low'
        ? CHECKLIST_TEMPLATES.braco.low
        : refMUAC.status === 'normal'
        ? CHECKLIST_TEMPLATES.braco.ideal
        : CHECKLIST_TEMPLATES.braco.high
    });
  } else {
    checklist.push({
      label: METRIC_TITLES.braco,
      status: 'neutral',
      value: '-',
      summaryText: '-'
    });
  }

  const cardBraco: SmartMetricCard = {
    id: 'braco-muac',
    title: METRIC_TITLES.braco,
    valueDisplay: braco !== null ? `${numBR(braco, 1)} cm` : '-',
    referenceText: `Ref. Ideal: ${numBR(muacMin, 1)} a ${numBR(muacMax, 1)} cm`,
    infoText: INFO_MODAL_TEXTS.braco,
    barMode: 'bilateral',
    zoneStatus: muacBar.status,
    markerPercent: muacBar.markerPct,
    rawValue: braco,
    evolutionDirection: 'higher-better'
  };

  const cmb = braco !== null && dobraTri !== null ? parseFloat((braco - 0.314 * dobraTri).toFixed(1)) : null;
  const refCMB = cmb !== null ? getRef('cmb', sexo, cmb) : null;
  const cmbMin = sexo === 'M' ? 25.1 : 21.1;
  const cmbMax = sexo === 'M' ? 30.0 : 25.0;
  const cmbBar = cmb !== null
    ? computeHighIsGoodBar(cmb, cmbMin * 0.85, cmbMin, cmbMax)
    : { status: 'neutral' as ClinicalZoneStatus, markerPct: null };

  if (cmb !== null && refCMB) {
    checklist.push({
      label: METRIC_TITLES.cmb,
      status: refCMB.chk === 'success' ? 'ideal' : refCMB.chk === 'warning' ? 'atencao' : 'alerta',
      value: refCMB.label,
      summaryText: refCMB.status === 'low'
        ? CHECKLIST_TEMPLATES.musculo.low
        : CHECKLIST_TEMPLATES.musculo.ideal
    });
  } else {
    checklist.push({
      label: METRIC_TITLES.cmb,
      status: 'neutral',
      value: '-',
      summaryText: '-'
    });
  }

  const cardCMB: SmartMetricCard = {
    id: 'cmb',
    title: METRIC_TITLES.cmb,
    valueDisplay: cmb !== null ? `${numBR(cmb, 1)} cm` : '-',
    referenceText: `Ref. Ideal: ${numBR(cmbMin, 1)} a ${numBR(cmbMax, 1)} cm`,
    infoText: INFO_MODAL_TEXTS.cmb,
    barMode: 'high-is-good',
    zoneStatus: cmbBar.status,
    markerPercent: cmbBar.markerPct,
    rawValue: cmb,
    evolutionDirection: 'higher-better'
  };

  // Dobra Tricipital
  const tsfMin = sexo === 'M' ? 8.0 : 10.0;
  const tsfMax = sexo === 'M' ? 20.0 : 25.0;
  const tsfBar = dobraTri !== null
    ? computeBilateralBar(dobraTri, tsfMin * 0.7, tsfMin, tsfMax, tsfMax * 1.25)
    : { status: 'neutral' as ClinicalZoneStatus, markerPct: null };

  const cardDobraTri: SmartMetricCard = {
    id: 'dobra-tricipital',
    title: METRIC_TITLES.dobraTri,
    valueDisplay: dobraTri !== null ? `${numBR(dobraTri, 1)} mm` : '-',
    referenceText: `Ref. Ideal: ${numBR(tsfMin, 1)} a ${numBR(tsfMax, 1)} mm`,
    infoText: INFO_MODAL_TEXTS.dobrasCutaneas,
    barMode: 'bilateral',
    zoneStatus: tsfBar.status,
    markerPercent: tsfBar.markerPct,
    rawValue: dobraTri,
    evolutionDirection: 'lower-better'
  };

  // Panturrilha
  const pantMin = sexo === 'M' ? 34.0 : 33.0;
  const pantMax = sexo === 'M' ? 40.0 : 39.0;
  let pantBar = { status: 'neutral' as ClinicalZoneStatus, markerPct: null as number | null };

  if (panturrilha !== null) {
    pantBar = computeBilateralBar(panturrilha, 31.0, pantMin, pantMax, pantMax + 3.0);
    if (panturrilha < 31) {
      checklist.push({
        label: METRIC_TITLES.panturrilha,
        status: 'alerta',
        value: 'Abaixo da referência',
        summaryText: CHECKLIST_TEMPLATES.membrosInferiores.low
      });
    } else if (panturrilha < pantMin) {
      checklist.push({
        label: METRIC_TITLES.panturrilha,
        status: 'atencao',
        value: 'Atenção',
        summaryText: CHECKLIST_TEMPLATES.membrosInferiores.low
      });
    } else if (panturrilha > pantMax) {
      checklist.push({
        label: METRIC_TITLES.panturrilha,
        status: 'alerta',
        value: 'Acima da referência',
        summaryText: CHECKLIST_TEMPLATES.membrosInferiores.high
      });
    } else {
      checklist.push({
        label: METRIC_TITLES.panturrilha,
        status: 'ideal',
        value: 'Adequada',
        summaryText: CHECKLIST_TEMPLATES.membrosInferiores.ideal
      });
    }
  } else {
    checklist.push({
      label: METRIC_TITLES.panturrilha,
      status: 'neutral',
      value: '-',
      summaryText: '-'
    });
  }

  const cardPanturrilha: SmartMetricCard = {
    id: 'panturrilha',
    title: METRIC_TITLES.panturrilha,
    valueDisplay: panturrilha !== null ? `${numBR(panturrilha, 1)} cm` : '-',
    referenceText: `Ref. Ideal: ${numBR(pantMin, 1)} a ${numBR(pantMax, 1)} cm`,
    infoText: INFO_MODAL_TEXTS.panturrilha,
    barMode: 'bilateral',
    zoneStatus: pantBar.status,
    markerPercent: pantBar.markerPct,
    rawValue: panturrilha,
    evolutionDirection: 'higher-better'
  };

  // Coxa Gordura/Músculo & Gordura Coxa
  let pctMuscCoxa: number | null = null;
  let pctGordCoxa: number | null = null;
  let coxaCompBar = { status: 'neutral' as ClinicalZoneStatus, markerPct: null as number | null };

  const limitLowCoxa = isElderly ? 50 : 55;
  const limitHighFatCoxa = isElderly ? 40 : 45;

  if (coxa !== null && dobraCoxa !== null) {
    const dobraCoxaCm = dobraCoxa / 10;
    const areaTotal = (coxa * coxa) / (4 * Math.PI);
    const circMuscular = Math.max(coxa - Math.PI * dobraCoxaCm, 0.1);
    const areaMuscular = (circMuscular * circMuscular) / (4 * Math.PI);
    const areaGordura = Math.max(areaTotal - areaMuscular, 0);
    pctMuscCoxa = (areaMuscular / areaTotal) * 100;
    pctGordCoxa = (areaGordura / areaTotal) * 100;

    coxaCompBar = computeHighIsGoodBar(pctMuscCoxa, limitHighFatCoxa, limitLowCoxa, 75);

    if (pctMuscCoxa < limitHighFatCoxa) {
      checklist.push({
        label: METRIC_TITLES.compCoxa,
        status: 'alerta',
        value: 'Acima de gordura / Baixo músculo',
        summaryText: CHECKLIST_TEMPLATES.membrosInferiores.high
      });
    } else if (pctMuscCoxa < limitLowCoxa) {
      checklist.push({
        label: METRIC_TITLES.compCoxa,
        status: 'atencao',
        value: 'Atenção',
        summaryText: CHECKLIST_TEMPLATES.membrosInferiores.low
      });
    } else {
      checklist.push({
        label: METRIC_TITLES.compCoxa,
        status: 'ideal',
        value: 'Adequada',
        summaryText: CHECKLIST_TEMPLATES.membrosInferiores.ideal
      });
    }
  } else {
    checklist.push({
      label: METRIC_TITLES.compCoxa,
      status: 'neutral',
      value: '-',
      summaryText: '-'
    });
  }

  const cardCompCoxa: SmartMetricCard = {
    id: 'composicao-coxa',
    title: METRIC_TITLES.compCoxa,
    valueDisplay: pctMuscCoxa !== null
      ? `${numBR(pctMuscCoxa, 0)}% músc.`
      : '-',
    referenceText: `Ref. Ideal: Acima de ${limitLowCoxa}% músculo`,
    infoText: INFO_MODAL_TEXTS.compCoxa,
    barMode: 'high-is-good',
    zoneStatus: coxaCompBar.status,
    markerPercent: coxaCompBar.markerPct,
    rawValue: pctMuscCoxa !== null ? Math.round(pctMuscCoxa) : null,
    evolutionDirection: 'higher-better'
  };

  const dobraCoxaBar = dobraCoxa !== null
    ? computeBilateralBar(dobraCoxa, 7.0, 10.0, 30.0, 36.0)
    : { status: 'neutral' as ClinicalZoneStatus, markerPct: null };

  const cardDobraCoxa: SmartMetricCard = {
    id: 'dobra-coxa',
    title: METRIC_TITLES.dobraCoxa,
    valueDisplay: dobraCoxa !== null ? `${numBR(dobraCoxa, 1)} mm` : '-',
    referenceText: 'Ref. Ideal: 10,0 a 30,0 mm',
    infoText: INFO_MODAL_TEXTS.dobrasCutaneas,
    barMode: 'bilateral',
    zoneStatus: dobraCoxaBar.status,
    markerPercent: dobraCoxaBar.markerPct,
    rawValue: dobraCoxa,
    evolutionDirection: 'lower-better'
  };

  const cardCoxa: SmartMetricCard = {
    id: 'coxa',
    title: METRIC_TITLES.coxa,
    valueDisplay: coxa !== null ? `${numBR(coxa, 1)} cm` : '-',
    referenceText: 'Ref. Ideal: Medida aferida',
    infoText: INFO_MODAL_TEXTS.perimetrosMembros,
    barMode: 'none',
    zoneStatus: 'neutral',
    markerPercent: null,
    rawValue: coxa,
    evolutionDirection: 'higher-better'
  };

  const cardAntebraco: SmartMetricCard = {
    id: 'antebraco',
    title: METRIC_TITLES.antebraco,
    valueDisplay: antebraco !== null ? `${numBR(antebraco, 1)} cm` : '-',
    referenceText: 'Ref. Ideal: Medida aferida',
    infoText: INFO_MODAL_TEXTS.perimetrosMembros,
    barMode: 'none',
    zoneStatus: 'neutral',
    markerPercent: null,
    rawValue: antebraco,
    evolutionDirection: 'higher-better'
  };

  const cardPunho: SmartMetricCard = {
    id: 'punho',
    title: METRIC_TITLES.punho,
    valueDisplay: punho !== null ? `${numBR(punho, 1)} cm` : '-',
    referenceText: 'Ref. Ideal: Estrutura óssea individual',
    infoText: INFO_MODAL_TEXTS.diametrosOsseos,
    barMode: 'none',
    zoneStatus: 'neutral',
    markerPercent: null,
    rawValue: punho,
    evolutionDirection: 'neutral'
  };

  const cardFemur: SmartMetricCard = {
    id: 'femur',
    title: METRIC_TITLES.femur,
    valueDisplay: femur !== null ? `${numBR(femur, 1)} cm` : '-',
    referenceText: 'Ref. Ideal: Estrutura óssea individual',
    infoText: INFO_MODAL_TEXTS.diametrosOsseos,
    barMode: 'none',
    zoneStatus: 'neutral',
    markerPercent: null,
    rawValue: femur,
    evolutionDirection: 'neutral'
  };

  const cardUmero: SmartMetricCard = {
    id: 'umero',
    title: METRIC_TITLES.umero,
    valueDisplay: umero !== null ? `${numBR(umero, 1)} cm` : '-',
    referenceText: 'Ref. Ideal: Estrutura óssea individual',
    infoText: INFO_MODAL_TEXTS.diametrosOsseos,
    barMode: 'none',
    zoneStatus: 'neutral',
    markerPercent: null,
    rawValue: umero,
    evolutionDirection: 'neutral'
  };

  // 9. Taxa Energia Repouso (TMB) e Gasto de Energia Total (GET)
  const tmb = peso !== null && altura > 0
    ? Math.round(10 * peso + 6.25 * altura - 5 * idade + (sexo === 'M' ? 5 : -161))
    : null;
  const get = tmb !== null ? Math.round(tmb * fatorAtividade) : null;

  const cardTMB: SmartMetricCard = {
    id: 'tmb',
    title: METRIC_TITLES.tmb,
    valueDisplay: tmb !== null ? `${tmb} kcal` : '-',
    referenceText: 'Ref. Ideal: Demanda basal diária',
    infoText: INFO_MODAL_TEXTS.tmb,
    barMode: 'none',
    zoneStatus: 'neutral',
    markerPercent: null,
    rawValue: tmb,
    evolutionDirection: 'neutral'
  };

  const cardGET: SmartMetricCard = {
    id: 'get',
    title: METRIC_TITLES.get,
    valueDisplay: get !== null ? `${get} kcal` : '-',
    referenceText: 'Ref. Ideal: Demanda energética diária',
    infoText: INFO_MODAL_TEXTS.get,
    barMode: 'none',
    zoneStatus: 'neutral',
    markerPercent: null,
    rawValue: get,
    evolutionDirection: 'neutral'
  };

  return {
    groups: [
      {
        title: 'Composição Corporal & Bioimpedância',
        items: [
          cardPesoCorporal,
          cardIMC,
          cardGorduraCorporal,
          cardMassaMuscular,
          cardGorduraVisceral,
          cardFFMI,
          cardMMLG,
          cardPesoOsseo
        ]
      },
      {
        title: 'Circunferências, Relações & Reservas',
        items: [
          cardCintura,
          cardAbdominal,
          cardQuadril,
          cardRCQ,
          cardRCE,
          cardBraco,
          cardCMB,
          cardPanturrilha,
          cardCompCoxa,
          cardCoxa,
          cardAntebraco
        ]
      },
      {
        title: 'Diâmetros Ósseos & Dobras Cutâneas',
        items: [
          cardDobraTri,
          cardDobraCoxa,
          cardPunho,
          cardFemur,
          cardUmero
        ]
      },
      {
        title: 'Gasto Energético Estimado',
        items: [
          cardTMB,
          cardGET
        ]
      }
    ],
    checklist,
    bodyMapValues: {
      isFemale: sexo === 'F',
      musc: musculoPct !== null ? `${numBR(musculoPct, 1)}%` : '-',
      gord: gorduraPct !== null ? `${numBR(gorduraPct, 1)}%` : '-',
      visc: visceral !== null ? `${numBR(visceral, 0)}` : '-',
      brac: braco !== null ? `${numBR(braco, 1)} cm` : '-',
      cint: cintura !== null ? `${numBR(cintura, 1)} cm` : '-',
      abdo: abdominal !== null ? `${numBR(abdominal, 1)} cm` : '-',
      quad: quadril !== null ? `${numBR(quadril, 1)} cm` : '-',
      coxa: coxa !== null ? `${numBR(coxa, 1)} cm` : '-',
      pant: panturrilha !== null ? `${numBR(panturrilha, 1)} cm` : '-'
    }
  };
}

/**
 * Constrói todas as séries evolutivas (26 parâmetros completos da aba Visualizar)
 * a partir do histórico real de avaliações do Firebase em ordem cronológica crescente.
 */
export function buildEvolutionGroupsFromAssessments(
  assessmentsDesc: PhysicalAssessmentItem[],
  patient?: Partial<PatientProfile>
): EvolutionMetricGroup[] {
  if (!Array.isArray(assessmentsDesc) || assessmentsDesc.length === 0) {
    return [];
  }

  // assessmentsDesc vem do mais recente -> mais antigo; invertemos para mais antigo -> mais recente no gráfico
  const chronological = [...assessmentsDesc].reverse();

  // Template estrutural baseado na avaliação mais recente (ou perfil) para preservar grupos e referências
  const templateReport = calculateFullAnthropometry(assessmentsDesc[0]?.metrics || {}, patient);
  const seriesMap = new Map<string, EvolutionMetricSeries>();

  const groups: EvolutionMetricGroup[] = templateReport.groups.map((grp) => ({
    title: grp.title,
    items: grp.items.map((card) => {
      const series: EvolutionMetricSeries = {
        id: card.id,
        title: card.title,
        referenceText: card.referenceText,
        evolutionDirection: card.evolutionDirection || 'neutral',
        points: []
      };
      seriesMap.set(card.id, series);
      return series;
    })
  }));

  chronological.forEach((assessment) => {
    const cleanDate = (assessment.dateStr || '')
      .replace(/^Data:\s*/i, '')
      .trim();
    const report = calculateFullAnthropometry(assessment.metrics || {}, patient);

    report.groups.forEach((grp) => {
      grp.items.forEach((card) => {
        const targetSeries = seriesMap.get(card.id);
        if (!targetSeries) return;

        const val = card.rawValue;
        if (val !== null && val !== undefined && Number.isFinite(val) && val > 0 && card.valueDisplay !== '-') {
          const shortLabel = card.valueDisplay
            .replace(/^Nível\s+/i, '')
            .split(' ')[0];

          targetSeries.points.push({
            date: cleanDate,
            value: val,
            valueDisplay: card.valueDisplay,
            shortLabel
          });
        }
      });
    });
  });

  return groups;
}

