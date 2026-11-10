import { PatientProfile } from '../types/patient';

export const TEMPLATE_PATIENT: PatientProfile = {
  id: 'paciente-template-01',
  name: 'Paciente',
  initials: 'PV',
  avatarUrl: '',
  lastAccess: '',
  email: 'paciente@vittare.com',
  pin: 'v123',
  status: 'Ativo · Aguardando Início',
  activeDays: 0,
  daysToComplete: 0,
  totalDays: 0,
  nextConsultationDate: 'Data: -',
  
  startDate: '',
  endDate: '',
  termsAcceptedAt: '',

  progress: {
    currentWeight: 0,
    initialWeight: 0,
    goalWeight: 0,
    weightDelta: 0,
    bodyFat: 0,
    bodyFatDelta: 0,
    energyScore: 0,
    energyDelta: 0,
    muscleMass: 0,
    muscleDelta: 0,
    waistCircumference: 0,
    waistDelta: 0,
    visceralFat: 0,
    visceralDelta: 0
  },

  weightHistory: [],

  professionalNotes: '',
  crmGeneralNotes: '',

  lyaNotification: {
    active: false,
    sender: 'Equipe Vittáre',
    message: 'Seu plano de acompanhamento está em preparação.',
    quickLinks: [],
    acknowledgedTabs: []
  },

  activities: [],
  consultations: [
    {
      id: 'cons-1',
      title: '1° SESSÃO',
      dateStr: 'Data: -',
      status: 'Agendada'
    },
    {
      id: 'cons-2',
      title: '2° SESSÃO',
      dateStr: 'Data: -',
      status: 'Agendada'
    },
    {
      id: 'cons-3',
      title: '3° SESSÃO',
      dateStr: 'Data: -',
      status: 'Agendada'
    }
  ],
  examsRequested: {
    id: 'ex-req-init',
    title: 'Painel Nutricional e Metabólico',
    dateStr: 'Data: -'
  },
  examResults: [],
  physicalAssessments: [],
  mealGuides: [],
  protocols: [],
  marketplace: [],
  documents: [],
  financial: [],
  terms: [],
  referrals: [],

  lastSyncTimestamp: new Date().toISOString(),
  syncedByProgram: 'Vittáre CRM Core'
};

// Aliases para retrocompatibilidade
export const MARIA_PAULA_PATIENT: PatientProfile = TEMPLATE_PATIENT;

export const INITIAL_PATIENTS: Record<string, PatientProfile> = {
  [TEMPLATE_PATIENT.id]: TEMPLATE_PATIENT,
  'p1': TEMPLATE_PATIENT,
  'paciente-maria-paula-01': TEMPLATE_PATIENT
};
