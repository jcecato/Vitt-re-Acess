export interface ExternalCrmPayload {
  sourceSystem: string;
  apiKeyOrToken?: string;
  patientId: string;
  action: 'UPDATE_MEASUREMENTS' | 'ADD_EXAM_RESULT' | 'ADD_MEAL_GUIDE' | 'ADD_PRESCRIPTION' | 'SCHEDULE_CONSULTATION' | 'SEND_LYA_ALERT' | 'FULL_SYNC';
  timestamp: string;
  data: Record<string, any>;
}

export interface IntegrationLog {
  id: string;
  source: string;
  action: string;
  timestamp: string;
  status: 'SUCCESS' | 'ERROR';
  details: string;
}
