import { ExternalCrmPayload, IntegrationLog } from './types';
import { crmDataService } from '../services/crmDataService';
import { PatientProfile } from '../types/patient';

class ExternalCrmAdapter {
  private logs: IntegrationLog[] = [];

  public async processIncomingSync(payload: ExternalCrmPayload): Promise<{ success: boolean; message: string }> {
    const { sourceSystem, patientId, action, data } = payload;
    
    try {
      const patient = await crmDataService.getPatient(patientId);
      if (!patient) {
        throw new Error(`Paciente ID '${patientId}' não localizado no repositório.`);
      }

      let updates: Partial<PatientProfile> = {};

      switch (action) {
        case 'UPDATE_MEASUREMENTS': {
          updates.progress = {
            ...patient.progress,
            ...data
          };
          if (data.currentWeight) {
            const todayStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            updates.weightHistory = [
              ...patient.weightHistory,
              {
                date: todayStr,
                weight: data.currentWeight,
                fat: data.bodyFat || patient.progress.bodyFat
              }
            ];
          }
          break;
        }

        case 'ADD_EXAM_RESULT': {
          if (Array.isArray(data.examResults)) {
            updates.examResults = [...patient.examResults, ...data.examResults];
          } else if (data.exam) {
            updates.examResults = [...patient.examResults, data.exam];
          }
          break;
        }

        case 'ADD_MEAL_GUIDE': {
          const newGuide = {
            id: `guia-${Date.now()}`,
            title: data.title || `Guia Alimentar ${patient.mealGuides.length + 1}`,
            dateStr: data.dateStr || new Date().toLocaleDateString('pt-BR'),
            isNew: true,
            pdfAvailable: true
          };
          updates.mealGuides = [newGuide, ...patient.mealGuides];
          break;
        }

        case 'ADD_PRESCRIPTION': {
          const newProt = {
            id: `prot-${Date.now()}`,
            title: data.title || `Prescrição ${patient.protocols.length + 1}`,
            expirationStr: data.expirationStr || 'Vencimento: em 30 dias',
            badge: 'novo' as const,
            audioAvailable: Boolean(data.audioAvailable)
          };
          updates.protocols = [newProt, ...patient.protocols];
          break;
        }

        case 'SEND_LYA_ALERT': {
          updates.lyaNotification = {
            active: true,
            sender: 'LYA - Vittáre',
            message: data.message || 'Novas atualizações no seu plano!',
            quickLinks: data.quickLinks || patient.lyaNotification.quickLinks
          };
          break;
        }

        case 'FULL_SYNC': {
          updates = { ...data };
          break;
        }

        default:
          throw new Error(`Ação '${action}' não reconhecida pelo adaptador de integração.`);
      }

      await crmDataService.updatePatient(patientId, updates, `Integração: ${sourceSystem}`);

      const log: IntegrationLog = {
        id: `log-${Date.now()}`,
        source: sourceSystem,
        action,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        status: 'SUCCESS',
        details: `Sincronização aplicada com sucesso para ${patient.name}`
      };
      this.logs.unshift(log);

      return {
        success: true,
        message: `Dados sincronizados com sucesso via ${sourceSystem}`
      };
    } catch (error: any) {
      const log: IntegrationLog = {
        id: `log-${Date.now()}`,
        source: sourceSystem,
        action,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        status: 'ERROR',
        details: error?.message || 'Erro desconhecido na integração'
      };
      this.logs.unshift(log);

      return {
        success: false,
        message: error?.message || 'Erro na sincronização'
      };
    }
  }

  public getRecentLogs(): IntegrationLog[] {
    return [...this.logs];
  }
}

export const externalCrmAdapter = new ExternalCrmAdapter();
