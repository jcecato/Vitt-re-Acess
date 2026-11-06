import { PatientProfile } from '../types/patient';

export const MARIA_PAULA_PATIENT: PatientProfile = {
  id: 'paciente-maria-paula-01',
  name: 'Maria Paula Santos',
  initials: 'MP',
  avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
  lastAccess: '30/10/2026',
  email: 'maria.paula@email.com',
  pin: 'v123',
  status: 'Ativo · 32 dias',
  activeDays: 32,
  daysToComplete: 28,
  totalDays: 60,
  nextConsultationDate: '26/11/2026 · 14:00 hrs',
  
  startDate: '2026-09-01',
  endDate: '2027-12-31',
  termsAcceptedAt: '2026-09-01T10:00:00.000Z',

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

  professionalNotes: 'Evolução dentro do esperado para esta fase do tratamento. Manter a constância nas refeições.',
  crmGeneralNotes: 'Anotações gerais do tratamento clínico.',

  lyaNotification: {
    active: true,
    sender: 'Dr. João Paulo',
    message: 'Olá, Maria! Suas orientações foram atualizadas.',
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
      dateStr: 'Data: 22/10/2026',
      badge: 'feito',
      dotType: 'done',
      description: 'Análise laboratorial completa'
    }
  ],
  consultations: [
    {
      id: 'cons-1',
      title: 'Sessão de Consulta Clínica',
      dateStr: '26/11/2026 · 14:00 hrs',
      duration: '45 min',
      status: 'agendada',
      pdfAvailable: true,
      audioAvailable: true
    }
  ],
  examsRequested: {
    id: 'ex-req-1',
    title: 'Painel Nutricional e Metabólico',
    dateStr: '15/10/2026'
  },
  examResults: [],
  physicalAssessments: [
    {
      id: 'pa-1',
      title: 'Bioimpedância Octapolar',
      dateStr: '20/10/2026',
      status: 'laudo',
      pdfAvailable: true
    }
  ],
  mealGuides: [
    {
      id: 'mg-1',
      title: 'Plano Alimentar Personalizado',
      dateStr: 'Atualizado em 20/10/2026',
      pdfAvailable: true
    }
  ],
  protocols: [
    {
      id: 'proto-1',
      title: 'Suplementação Metabólica',
      expirationStr: 'Validade: 60 dias',
      badge: 'ATUALIZADO',
      items: ['Fórmula manipulada manipulada A', 'Complexo B ativo']
    }
  ],
  marketplace: [
    {
      id: 'mp-1',
      name: 'Ômega 3 Ultra Puro IFOS',
      dateStr: 'Recomendação Clínica',
      link: 'https://vittare.com.br',
      icon: 'ti ti-pill',
      gradient: 'from-[#5eea8f] to-[#12b76a]',
      description: 'Alta concentração de EPA/DHA'
    }
  ],
  documents: [
    {
      id: 'doc-1',
      name: 'Receita Médica Digital.pdf',
      dateStr: '20/10/2026',
      status: 'enviado'
    }
  ],
  financial: [
    {
      id: 'fin-1',
      amount: 'R$ 1.200,00',
      status: 'PAGO',
      method: 'Cartão de Crédito',
      model: 'Protocolo Trimestral',
      planName: 'Plano Integrado',
      dateStr: '01/09/2026'
    }
  ],
  terms: [
    {
      id: 'term-1',
      name: 'Termo de Consentimento Livre e Esclarecido.pdf',
      dateStr: '01/09/2026',
      hasPdf: true,
      content: 'Termo de aceite e consentimento para acompanhamento médico e nutricional.'
    }
  ],
  referrals: [],

  lastSyncTimestamp: new Date().toISOString(),
  syncedByProgram: 'Vittáre CRM Core'
};

export const INITIAL_PATIENTS: Record<string, PatientProfile> = {
  [MARIA_PAULA_PATIENT.id]: MARIA_PAULA_PATIENT
};
