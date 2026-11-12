export interface ExamResult {
  id: string;
  name: string;
  value: string;
  reference: string;
  status: 'ok' | 'atenção' | 'baixo' | 'alto';
}

export interface ExamBatch {
  id: string;
  title: string;
  dateStr: string;
  status: string;
  pdfAvailable?: boolean;
  results: ExamResult[];
}

export interface BiomarkerPoint {
  date: string;
  value: number;
  valueDisplay: string;
}

export interface BiomarkerComparison {
  id: string;
  name: string;
  reference: string;
  points: BiomarkerPoint[];
}

export interface AssessmentComparisonMetric {
  id: string;
  name: string;
  reference?: string;
  unit?: string;
  higherIsBetter?: boolean;
  points: BiomarkerPoint[];
}

export interface ActivityRecord {
  id: string;
  title: string;
  dateStr: string;
  badge: 'feito' | 'novo' | 'agendado';
  dotType: 'done' | 'act' | 'fut';
  description: string;
}

export interface ConsultationItem {
  id: string;
  title: string;
  dateStr: string;
  duration?: string;
  status: 'Agendada' | 'Concluída' | 'Remarcada' | 'Cancelada' | 'realizada' | 'agendada';
  pdfAvailable?: boolean;
  audioAvailable?: boolean;
  videoAvailable?: boolean;
  audioNotes?: string;
}

export interface PhysicalAssessmentMetrics {
  weight?: number | string;
  bodyFat?: number | string;
  muscleMass?: number | string;
  visceralFat?: number | string;
  waistCircumference?: number | string;
  abdominal?: number | string;
  antebraco?: number | string;
  braco?: number | string;
  coxa?: number | string;
  dobraCoxa?: number | string;
  dobraTricipital?: number | string;
  femur?: number | string;
  panturrilha?: number | string;
  punho?: number | string;
  quadril?: number | string;
  umero?: number | string;
  [key: string]: any;
}

export interface PhysicalAssessmentItem {
  id: string;
  title: string;
  dateStr: string;
  status: 'laudo' | 'aguardando';
  pdfAvailable: boolean;
  pdfUrl?: string;
  metrics?: PhysicalAssessmentMetrics;
  updatedAt?: string;
}

export interface MealGuideItem {
  id: string;
  title: string;
  dateStr: string;
  isNew?: boolean;
  pdfAvailable: boolean;
  fileUrl?: string;
}

export interface ActiveIngredient {
  name: string;
  concentration: string;
}

export interface ProtocolFormula {
  id?: string;
  name: string;
  posology: string;
  observations?: string;
  actives: ActiveIngredient[];
}

export interface ProtocolItem {
  id: string;
  title: string;
  expirationStr: string;
  badge: 'atualizado' | 'novo' | 'descontinuado' | 'ATUALIZADO' | 'NOVO' | 'DESCONTINUADO';
  audioAvailable?: boolean;
  audioTitle?: string;
  items?: string[];
  formulaName?: string;
  emissionDate?: string;
  expirationDate?: string;
  posology?: string;
  observations?: string;
  actives?: ActiveIngredient[];
  formulas?: ProtocolFormula[];
}

export interface MarketplaceProduct {
  id: string;
  name: string;
  dateStr: string;
  link: string;
  icon: string;
  gradient: string;
  description?: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  dateStr: string;
  status: 'enviado' | 'aguardando';
  fileUrl?: string;
}

export interface FinancialItem {
  id: string;
  amount: string;
  status: 'pago' | 'pendente' | 'PAGO' | 'PENDENTE';
  method: string;
  model: string;
  planName?: string;
  condition?: string;
  dateStr: string;
  invoiceUrl?: string;
}

export interface TermItem {
  id: string;
  name: string;
  dateStr: string;
  hasPdf?: boolean;
  content?: string;
}

export interface ReferralItem {
  id: string;
  specialty: string;
  dateStr: string;
  hasPdf: boolean;
  doctorName?: string;
  instructions?: string;
  pdfUrl?: string;
}

export interface WeightHistoryPoint {
  date: string;
  weight: number;
  fat: number;
}

export interface PatientProfile {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  lastAccess?: string;
  email: string;
  pin: string;
  status: string;
  activeDays: number;
  daysToComplete: number;
  totalDays: number;
  nextConsultationDate: string;
  
  progress: {
    currentWeight: number;
    initialWeight: number;
    goalWeight: number;
    weightDelta: number;
    bodyFat: number;
    bodyFatDelta: number;
    energyScore: number;
    energyDelta: number;
    muscleMass: number;
    muscleDelta: number;
    waistCircumference: number;
    waistDelta: number;
    visceralFat: number;
    visceralDelta: number;
  };
  
  weightHistory: WeightHistoryPoint[];
  professionalNotes: string;
  crmGeneralNotes: string;

  lyaNotification: {
    active: boolean;
    sender: string;
    message: string;
    quickLinks: { tab: string; label: string }[];
    acknowledgedTabs?: string[];
  };

  activities: ActivityRecord[];
  consultations: ConsultationItem[];
  examsRequested: {
    id: string;
    title: string;
    dateStr: string;
  };
  examResults: ExamResult[];
  examBatches?: ExamBatch[];
  biomarkerComparisons?: BiomarkerComparison[];
  physicalAssessments: PhysicalAssessmentItem[];
  physicalAssessmentComparisons?: AssessmentComparisonMetric[];
  mealGuides: MealGuideItem[];
  protocols: ProtocolItem[];
  marketplace: MarketplaceProduct[];
  documents: DocumentItem[];
  financial: FinancialItem[];
  terms: TermItem[];
  referrals: ReferralItem[];

  lastSyncTimestamp: string;
  syncedByProgram: string;

  // Dados clínicos integrativos e circadianos (BioSync™ e Cronobiologia)
  metabolicAxes?: any[];
  chrononutrition?: any[];

  // Ciclo de vida de tratamento e aceite de termos (Segurança e Contrato LGPD)
  startDate?: string;
  endDate?: string;
  termsAccepted?: boolean;
  termsAcceptedAt?: string;
  termsVersion?: string;
}

