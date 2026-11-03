import { PatientProfile } from '../types/patient';

export const MARIA_PAULA_PATIENT: PatientProfile = {
  id: 'paciente-maria-paula-01',
  name: 'Maria Paula Santos',
  initials: 'MP',
  avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
  lastAccess: '30/10/2026',
  email: 'maria.paula@email.com',
  pin: '1234',
  status: 'Ativo · 32 dias',
  activeDays: 32,
  daysToComplete: 28,
  totalDays: 60,
  nextConsultationDate: '26/11/2026 · 14:00 hrs',
  
  progress: {
    currentWeight: 72.4,
    initialWeight: 74.2,
    goalWeight: 68.0,
    weightDelta: -1.8,
    bodyFat: 28.6,
    bodyFatDelta: -0.9,
    energyScore: 7.4,
    energyDelta: 2,
    muscleMass: 38.2,
    muscleDelta: 0.4,
    waistCircumference: 82,
    waistDelta: -2,
    visceralFat: 23.1,
    visceralDelta: -1
  },

  weightHistory: [
    { date: '27/09', weight: 74.2, fat: 29.5 },
    { date: '05/10', weight: 73.8, fat: 29.2 },
    { date: '12/10', weight: 73.2, fat: 28.9 },
    { date: '20/10', weight: 72.7, fat: 28.7 },
    { date: '29/10', weight: 72.4, fat: 28.6 }
  ],

  professionalNotes: 'Texto de exemplo: sua evolução está dentro do esperado para esta fase. Vamos manter o foco no sono e na constância das refeições.',
  crmGeneralNotes: 'Texto vindo da aba Admin do CRM (Anotações Gerais). Exemplo: reduzir gordura visceral, melhorar sono e manter constância nas refeições.',

  lyaNotification: {
    active: true,
    sender: 'Dr. João Paulo',
    message: 'Olá! Maria! Temos Atualizações!',
    quickLinks: [
      { tab: 'exames', label: 'Exames' },
      { tab: 'guia', label: 'Guia Alimentar' },
      { tab: 'protocolo', label: 'Protocolo' }
    ]
  },

  activities: [
    {
      id: 'act-1',
      title: 'Exames avaliados',
      dateStr: 'Data: 22/10/2026 · há 7 dias',
      badge: 'feito',
      dotType: 'done',
      description: 'Seus exames do painel metabólico foram avaliados. Acesse a aba Exames para ver o laudo completo e imprimir em PDF.'
    },
    {
      id: 'act-2',
      title: 'Guia Alimentar 02',
      dateStr: 'Data: 24/10/2026 · há 5 dias',
      badge: 'novo',
      dotType: 'act',
      description: 'Seu novo guia alimentar está disponível. Abra a aba Guia Alimentar e toque em Visualizar para ler.'
    },
    {
      id: 'act-3',
      title: 'Retorno agendado',
      dateStr: 'Data: 26/11/2026 · em 28 dias',
      badge: 'agendado',
      dotType: 'fut',
      description: 'Sua revisão está confirmada. Vamos reavaliar sua composição corporal e ajustar o protocolo.'
    }
  ],

  consultations: [
    {
      id: 'cons-1',
      title: '1° SESSÃO',
      dateStr: '27/09/2026 · 14:00 hrs',
      duration: '50 min',
      status: 'Concluída',
      pdfAvailable: true,
      audioAvailable: true,
      videoAvailable: false,
      audioNotes: 'Orientações gravadas pelo médico sobre início do protocolo de 60 dias.'
    },
    {
      id: 'cons-2',
      title: '2° SESSÃO',
      dateStr: '26/11/2026 · 14:00 hrs',
      status: 'Agendada',
      pdfAvailable: false,
      audioAvailable: false,
      videoAvailable: false
    },
    {
      id: 'cons-3',
      title: '3° SESSÃO',
      dateStr: '15/01/2027 · 10:00 hrs',
      status: 'Agendada',
      pdfAvailable: false,
      audioAvailable: false,
      videoAvailable: false
    }
  ],

  examsRequested: {
    id: 'req-1',
    title: 'Painel Hormonal & Bioquímico Completo',
    dateStr: 'Solicitado em 18/10/2026'
  },

  examResults: [
    { id: 'ex-1', name: 'Glicemia de Jejum', value: '84 mg/dL', reference: 'Ref. 70–99 mg/dL', status: 'ok' },
    { id: 'ex-2', name: 'Insulina Basal', value: '7,2 µUI/mL', reference: 'Ref. 2,6–24,9 µUI/mL', status: 'ok' },
    { id: 'ex-3', name: 'TSH Ultra Sensível', value: '2,1 mUI/L', reference: 'Ref. 0,4–4,0 mUI/L', status: 'ok' },
    { id: 'ex-4', name: 'Vitamina D (25-OH)', value: '36 ng/mL', reference: 'Ref. 30–60 ng/mL', status: 'ok' },
    { id: 'ex-5', name: 'Colesterol Total', value: '172 mg/dL', reference: 'Ref. < 190 mg/dL', status: 'ok' },
    { id: 'ex-6', name: 'Triglicerídeos', value: '98 mg/dL', reference: 'Ref. < 150 mg/dL', status: 'ok' }
  ],

  examBatches: [
    {
      id: 'batch-3',
      title: 'Painel Hormonal & Bioquímico Completo',
      dateStr: '18/10/2026',
      status: 'laudo',
      pdfAvailable: true,
      results: [
        { id: 'ex-3-1', name: 'Glicemia de Jejum', value: '84 mg/dL', reference: 'Ref. 70–99 mg/dL', status: 'ok' },
        { id: 'ex-3-2', name: 'Insulina Basal', value: '7,2 µUI/mL', reference: 'Ref. 2,6–24,9 µUI/mL', status: 'ok' },
        { id: 'ex-3-3', name: 'TSH Ultra Sensível', value: '2,1 mUI/L', reference: 'Ref. 0,4–4,0 mUI/L', status: 'ok' },
        { id: 'ex-3-4', name: 'Vitamina D (25-OH)', value: '36 ng/mL', reference: 'Ref. 30–60 ng/mL', status: 'ok' },
        { id: 'ex-3-5', name: 'Colesterol Total', value: '172 mg/dL', reference: 'Ref. < 190 mg/dL', status: 'ok' },
        { id: 'ex-3-6', name: 'Triglicerídeos', value: '98 mg/dL', reference: 'Ref. < 150 mg/dL', status: 'ok' }
      ]
    },
    {
      id: 'batch-2',
      title: 'Painel Metabólico Periódico',
      dateStr: '20/08/2026',
      status: 'laudo',
      pdfAvailable: true,
      results: [
        { id: 'ex-2-1', name: 'Glicemia de Jejum', value: '89 mg/dL', reference: 'Ref. 70–99 mg/dL', status: 'ok' },
        { id: 'ex-2-2', name: 'Insulina Basal', value: '9,8 µUI/mL', reference: 'Ref. 2,6–24,9 µUI/mL', status: 'ok' },
        { id: 'ex-2-3', name: 'TSH Ultra Sensível', value: '3,4 mUI/L', reference: 'Ref. 0,4–4,0 mUI/L', status: 'ok' },
        { id: 'ex-2-4', name: 'Vitamina D (25-OH)', value: '26 ng/mL', reference: 'Ref. 30–60 ng/mL', status: 'atenção' },
        { id: 'ex-2-5', name: 'Colesterol Total', value: '185 mg/dL', reference: 'Ref. < 190 mg/dL', status: 'ok' }
      ]
    },
    {
      id: 'batch-1',
      title: 'Check-up Clínico Inicial',
      dateStr: '15/05/2026',
      status: 'laudo',
      pdfAvailable: true,
      results: [
        { id: 'ex-1-1', name: 'Glicemia de Jejum', value: '94 mg/dL', reference: 'Ref. 70–99 mg/dL', status: 'ok' },
        { id: 'ex-1-2', name: 'Insulina Basal', value: '12,4 µUI/mL', reference: 'Ref. 2,6–24,9 µUI/mL', status: 'ok' },
        { id: 'ex-1-3', name: 'TSH Ultra Sensível', value: '4,9 mUI/L', reference: 'Ref. 0,4–4,0 mUI/L', status: 'atenção' },
        { id: 'ex-1-4', name: 'Vitamina D (25-OH)', value: '18 ng/mL', reference: 'Ref. 30–60 ng/mL', status: 'baixo' },
        { id: 'ex-1-5', name: 'Colesterol Total', value: '204 mg/dL', reference: 'Ref. < 190 mg/dL', status: 'atenção' }
      ]
    }
  ],

  biomarkerComparisons: [
    {
      id: 'bio-glicemia',
      name: 'Glicemia',
      reference: 'Ref. 70 - 99 mg/dL',
      points: [
        { date: '15/05/2026', value: 94, valueDisplay: '94 mg/dL' },
        { date: '20/08/2026', value: 89, valueDisplay: '89 mg/dL' },
        { date: '18/10/2026', value: 84, valueDisplay: '84 mg/dL' }
      ]
    },
    {
      id: 'bio-insulina',
      name: 'Insulina',
      reference: 'Ref. 2,6 - 24,9 µUI/mL',
      points: [
        { date: '15/05/2026', value: 12.4, valueDisplay: '12,4 µUI/mL' },
        { date: '20/08/2026', value: 9.8, valueDisplay: '9,8 µUI/mL' },
        { date: '18/10/2026', value: 7.2, valueDisplay: '7,2 µUI/mL' }
      ]
    }
  ],

  physicalAssessments: [
    {
      id: 'av-1',
      title: 'Avaliação F. 01',
      dateStr: 'Data: 27/09/2026',
      status: 'laudo',
      pdfAvailable: true
    },
    {
      id: 'av-2',
      title: 'Avaliação F. 02',
      dateStr: 'Data: 28/10/2026',
      status: 'laudo',
      pdfAvailable: true
    }
  ],

  physicalAssessmentComparisons: [
    {
      id: 'comp-peso-atual',
      name: 'Peso Atual',
      reference: 'Meta clínica: 75,0 kg',
      unit: 'kg',
      higherIsBetter: false,
      points: [
        { date: '27/09/2026', value: 82.5, valueDisplay: '82,5 kg' },
        { date: '28/10/2026', value: 78.8, valueDisplay: '78,8 kg' }
      ]
    },
    {
      id: 'comp-peso-ideal',
      name: 'Peso Ideal',
      reference: 'Faixa estipulada clínica',
      unit: 'kg',
      points: [
        { date: '27/09/2026', value: 74.0, valueDisplay: '74,0 kg' },
        { date: '28/10/2026', value: 74.0, valueDisplay: '74,0 kg' }
      ]
    },
    {
      id: 'comp-imc',
      name: 'IMC',
      reference: 'Ref. 18,5 – 24,9 kg/m²',
      unit: 'kg/m²',
      higherIsBetter: false,
      points: [
        { date: '27/09/2026', value: 27.2, valueDisplay: '27,2' },
        { date: '28/10/2026', value: 25.8, valueDisplay: '25,8' }
      ]
    },
    {
      id: 'comp-gordura',
      name: '% de Gordura',
      reference: 'Meta clínica: < 20%',
      unit: '%',
      higherIsBetter: false,
      points: [
        { date: '27/09/2026', value: 26.5, valueDisplay: '26,5%' },
        { date: '28/10/2026', value: 22.8, valueDisplay: '22,8%' }
      ]
    },
    {
      id: 'comp-massa-muscular',
      name: '% de Massa Muscular',
      reference: 'Meta clínica: > 35%',
      unit: '%',
      higherIsBetter: true,
      points: [
        { date: '27/09/2026', value: 34.2, valueDisplay: '34,2%' },
        { date: '28/10/2026', value: 36.4, valueDisplay: '36,4%' }
      ]
    },
    {
      id: 'comp-circunferencia',
      name: 'Circunferência Abdominal',
      reference: 'Ref. < 94 cm',
      unit: 'cm',
      higherIsBetter: false,
      points: [
        { date: '27/09/2026', value: 94.0, valueDisplay: '94 cm' },
        { date: '28/10/2026', value: 88.0, valueDisplay: '88 cm' }
      ]
    }
  ],

  mealGuides: [
    {
      id: 'guia-1',
      title: 'GUIA 01',
      dateStr: '27/09/2026',
      isNew: false,
      pdfAvailable: true
    },
    {
      id: 'guia-2',
      title: 'GUIA 02',
      dateStr: '24/10/2026',
      isNew: true,
      pdfAvailable: true
    }
  ],

  protocols: [
    {
      id: 'prot-2',
      title: 'Receita 02',
      expirationStr: 'Validade: 26/12/2026',
      badge: 'novo',
      items: ['Coenzima Q10 100mg - 1 dose ao acordar', 'Magnésio Treonato 250mg - 1 dose à noite', 'Creatina Creapure 5g - pós-treino']
    },
    {
      id: 'prot-1',
      title: 'Receita 01',
      expirationStr: 'Validade: 27/11/2026',
      badge: 'atualizado',
      items: ['Vitamina D3 5.000 UI - 1 gota com refeição gordurosa', 'Ômega 3 Ultra EPA/DHA - 2 cápsulas ao almoço']
    },
    {
      id: 'prot-3',
      title: 'Receita 03',
      expirationStr: 'Validade: 15/09/2026',
      badge: 'descontinuado',
      items: ['Composto Digestivo Fitoterápico - Uso finalizado']
    }
  ],

  marketplace: [
    {
      id: 'mk-1',
      name: 'Creatina Monohidratada 300g',
      dateStr: '20/10/2026',
      link: 'vittare.link/cr3at',
      icon: 'ti-pill',
      gradient: 'linear-gradient(135deg,#5b4bd6,#2fd37a)'
    },
    {
      id: 'mk-2',
      name: 'Ômega-3 EPA/DHA',
      dateStr: '15/10/2026',
      link: 'vittare.link/om3ga',
      icon: 'ti-flask',
      gradient: 'linear-gradient(135deg,#a35a07,#5b4bd6)'
    },
    {
      id: 'mk-3',
      name: 'Shaker 600ml',
      dateStr: '08/10/2026',
      link: 'vittare.link/sh4k',
      icon: 'ti-bottle',
      gradient: 'linear-gradient(135deg,#0f7a3a,#5b4bd6)'
    }
  ],

  documents: [
    { id: 'doc-1', name: 'Hemograma completo', dateStr: '22/10/2026', status: 'enviado' },
    { id: 'doc-2', name: 'Perfil hormonal', dateStr: '15/10/2026', status: 'enviado' },
    { id: 'doc-3', name: 'Bioimpedância anterior', dateStr: '27/09/2026', status: 'enviado' }
  ],

  financial: [
    {
      id: 'fin-2',
      amount: 'R$ 1.850,00',
      status: 'pago',
      model: 'Presencial',
      planName: 'Protocolo Vittáre Premium – 60 dias',
      method: 'Pix',
      condition: 'À vista com 5% de desconto',
      dateStr: '27/09/2026'
    },
    {
      id: 'fin-1',
      amount: 'R$ 380,00',
      status: 'pendente',
      model: 'Tele Consulta',
      planName: 'Consulta de Acompanhamento Intermediário',
      method: 'Cartão Crédito',
      condition: '2x sem juros no cartão',
      dateStr: '26/11/2026'
    }
  ],

  terms: [
    {
      id: 'term-1',
      name: 'Termo de Consentimento Livre e Esclarecido',
      dateStr: '27/09/2026',
      content: 'Declaro para os devidos fins ter recebido todas as orientações sobre meu plano de saúde integrado Vittáre, compreendendo os objetivos, diretrizes nutricionais e complementares recomendadas.'
    },
    {
      id: 'term-2',
      name: 'Política de Agendamento e Cancelamento',
      dateStr: '27/09/2026',
      content: 'As sessões agendadas podem ser remarcadas com até 24 horas de antecedência através do canal oficial de WhatsApp (27 997918100), garantindo a pontualidade e o respeito à agenda dos profissionais.'
    }
  ],

  referrals: [
    { id: 'ref-1', specialty: 'Endocrinologista', dateStr: '27/09/2026', hasPdf: true },
    { id: 'ref-2', specialty: 'Psicologia Comportamental', dateStr: '12/10/2026', hasPdf: true }
  ],

  lastSyncTimestamp: new Date().toISOString(),
  syncedByProgram: 'CRM Vittáre Central'
};

export const CARLOS_PATIENT: PatientProfile = {
  ...MARIA_PAULA_PATIENT,
  id: 'paciente-carlos-silva-02',
  name: 'Carlos Eduardo Silva',
  initials: 'CS',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  lastAccess: 'Hoje às 10:45',
  email: 'carlos.silva@email.com',
  pin: '5678',
  status: 'Ativo · 14 dias',
  activeDays: 14,
  daysToComplete: 46,
  totalDays: 60,
  nextConsultationDate: '15/12/2026 · 10:30 hrs',
  progress: {
    currentWeight: 88.5,
    initialWeight: 91.0,
    goalWeight: 82.0,
    weightDelta: -2.5,
    bodyFat: 24.2,
    bodyFatDelta: -1.2,
    energyScore: 8.0,
    energyDelta: 1.5,
    muscleMass: 42.1,
    muscleDelta: 0.8,
    waistCircumference: 94,
    waistDelta: -3,
    visceralFat: 14.0,
    visceralDelta: -1.5
  },
  consultations: [
    {
      id: 'cons-c1',
      title: '1ª Sessão',
      dateStr: '15/10/2026 · 10:30 hrs',
      status: 'Concluída'
    },
    {
      id: 'cons-c2',
      title: '2ª Sessão',
      dateStr: '15/12/2026 · 10:30 hrs',
      status: 'Agendada'
    },
    {
      id: 'cons-c3',
      title: '3ª Sessão',
      dateStr: '15/02/2027 · 10:30 hrs',
      status: 'Agendada'
    }
  ],
  lyaNotification: {
    active: true,
    sender: 'Dr. João Paulo',
    message: 'Olá! Carlos! Temos Atualizações!',
    quickLinks: [
      { tab: 'guia', label: 'Guia Alimentar' },
      { tab: 'protocolo', label: 'Protocolo' }
    ]
  }
};

export const INITIAL_PATIENTS: Record<string, PatientProfile> = {
  [MARIA_PAULA_PATIENT.id]: MARIA_PAULA_PATIENT,
  [CARLOS_PATIENT.id]: CARLOS_PATIENT
};
