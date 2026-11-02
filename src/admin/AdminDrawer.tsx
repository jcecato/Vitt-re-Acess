import React, { useState } from 'react';
import { PatientProfile } from '../types/patient';
import { crmDataService } from '../services/crmDataService';
import { externalCrmAdapter } from '../integrations/externalCrmAdapter';
import { isFirebaseConfigured, FIREBASE_CONFIG } from '../config/firebase';
import {
  Shield,
  Layers,
  Database,
  ArrowRightLeft,
  X,
  Check,
  RefreshCw,
  Send,
  Code2,
  FileText,
  AlertCircle
} from 'lucide-react';

interface AdminDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPatient: PatientProfile;
}

export const AdminDrawer: React.FC<AdminDrawerProps> = ({
  isOpen,
  onClose,
  currentPatient
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'edit' | 'firebase' | 'logs'>('sync');
  
  // States para Edição Rápida
  const [weight, setWeight] = useState(currentPatient.progress.currentWeight.toString());
  const [bodyFat, setBodyFat] = useState(currentPatient.progress.bodyFat.toString());
  const [muscle, setMuscle] = useState(currentPatient.progress.muscleMass.toString());
  const [nextDate, setNextDate] = useState(currentPatient.nextConsultationDate);
  const [notes, setNotes] = useState(currentPatient.professionalNotes);
  const [lyaMessage, setLyaMessage] = useState(currentPatient.lyaNotification.message);
  
  // Status de feedback
  const [feedback, setFeedback] = useState<string | null>(null);

  // States para Simulador de Integração Externa
  const [sourceSystem, setSourceSystem] = useState('Prontuário iClinic Integrado');
  const [selectedPreset, setSelectedPreset] = useState<'exam' | 'weight' | 'guide' | 'custom'>('exam');
  const [jsonPayload, setJsonPayload] = useState(JSON.stringify({
    sourceSystem: "Prontuário iClinic Integrado",
    patientId: currentPatient.id,
    action: "ADD_EXAM_RESULT",
    timestamp: new Date().toISOString(),
    data: {
      exam: {
        id: `ex-${Date.now()}`,
        name: "Hemoglobina Glicada (HbA1c)",
        value: "5,3 %",
        reference: "Ref. < 5,7 %",
        status: "ok"
      }
    }
  }, null, 2));

  if (!isOpen) return null;

  const handlePresetChange = (preset: 'exam' | 'weight' | 'guide' | 'custom') => {
    setSelectedPreset(preset);
    let payload = {};

    if (preset === 'exam') {
      payload = {
        sourceSystem,
        patientId: currentPatient.id,
        action: "ADD_EXAM_RESULT",
        timestamp: new Date().toISOString(),
        data: {
          exam: {
            id: `ex-${Date.now()}`,
            name: "Colesterol Total",
            value: "168 mg/dL",
            reference: "Ref. < 190 mg/dL",
            status: "ok"
          }
        }
      };
    } else if (preset === 'weight') {
      payload = {
        sourceSystem: "Balança Bioimpedância InBody 770",
        patientId: currentPatient.id,
        action: "UPDATE_MEASUREMENTS",
        timestamp: new Date().toISOString(),
        data: {
          currentWeight: 71.9,
          bodyFat: 28.2,
          muscleMass: 38.6,
          weightDelta: -2.3,
          bodyFatDelta: -1.3
        }
      };
    } else if (preset === 'guide') {
      payload = {
        sourceSystem: "Webdiet / Dietbox Nutrição",
        patientId: currentPatient.id,
        action: "ADD_MEAL_GUIDE",
        timestamp: new Date().toISOString(),
        data: {
          title: "Guia 03 | Fase de Lapidação Metabólica",
          dateStr: new Date().toLocaleDateString('pt-BR')
        }
      };
    }

    if (preset !== 'custom') {
      setJsonPayload(JSON.stringify(payload, null, 2));
    }
  };

  const handleExecuteExternalSync = async () => {
    try {
      const parsed = JSON.parse(jsonPayload);
      const res = await externalCrmAdapter.processIncomingSync(parsed);
      if (res.success) {
        setFeedback(res.message);
      } else {
        setFeedback(`Erro: ${res.message}`);
      }
      setTimeout(() => setFeedback(null), 3000);
    } catch (e: any) {
      setFeedback(`JSON inválido: ${e?.message}`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await crmDataService.updatePatient(currentPatient.id, {
        nextConsultationDate: nextDate,
        professionalNotes: notes,
        progress: {
          ...currentPatient.progress,
          currentWeight: parseFloat(weight) || currentPatient.progress.currentWeight,
          bodyFat: parseFloat(bodyFat) || currentPatient.progress.bodyFat,
          muscleMass: parseFloat(muscle) || currentPatient.progress.muscleMass,
          weightDelta: (parseFloat(weight) || currentPatient.progress.currentWeight) - currentPatient.progress.initialWeight
        },
        lyaNotification: {
          ...currentPatient.lyaNotification,
          message: lyaMessage
        }
      }, 'Edição Manual Admin CRM');

      setFeedback('Alterações salvas e propagadas para o paciente!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(`Erro ao salvar: ${err?.message}`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleResetData = () => {
    crmDataService.resetToDefault(currentPatient.id);
    setFeedback('Dados do paciente restaurados para o padrão do protótipo.');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="w-full max-w-[620px] bg-[#10101c] border border-[rgba(255,255,255,0.2)] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-[rgba(255,255,255,0.14)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#5b4bd6] flex items-center justify-center text-white">
              <Shield className="w-5 h-5 text-[#5eea8f]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Painel do Administrador & Hub de Integrações
              </h2>
              <p className="text-xs text-[#a5a4b8]">
                Gerenciamento central do CRM Vittáre e simulação de alimentação externa
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-[#5eea8f] p-1.5 cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Tabs within Admin */}
        <div className="flex gap-2 py-3 border-b border-[rgba(255,255,255,0.1)] overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold transition cursor-pointer shrink-0 ${
              activeTab === 'sync'
                ? 'bg-[#5eea8f] text-[#0d0d16]'
                : 'bg-white/5 text-[#e8e8f0] hover:bg-white/10'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> Integrações & Webhooks
          </button>

          <button
            onClick={() => setActiveTab('edit')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold transition cursor-pointer shrink-0 ${
              activeTab === 'edit'
                ? 'bg-[#5eea8f] text-[#0d0d16]'
                : 'bg-white/5 text-[#e8e8f0] hover:bg-white/10'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Edição Rápida
          </button>

          <button
            onClick={() => setActiveTab('firebase')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold transition cursor-pointer shrink-0 ${
              activeTab === 'firebase'
                ? 'bg-[#5eea8f] text-[#0d0d16]'
                : 'bg-white/5 text-[#e8e8f0] hover:bg-white/10'
            }`}
          >
            <Database className="w-3.5 h-3.5" /> Status Firebase
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold transition cursor-pointer shrink-0 ${
              activeTab === 'logs'
                ? 'bg-[#5eea8f] text-[#0d0d16]'
                : 'bg-white/5 text-[#e8e8f0] hover:bg-white/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Logs de Sincronia
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="mt-3 p-2.5 rounded-xl bg-[rgba(94,234,143,0.16)] border border-[#5eea8f] text-[#5eea8f] text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Tab Contents */}
        <div className="grow overflow-y-auto py-3 space-y-4 text-xs pr-1">

          {/* TAB 1: INTEGRAÇÃO EXTERNA */}
          {activeTab === 'sync' && (
            <div className="space-y-3">
              <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] rounded-2xl p-3">
                <div className="flex items-center gap-2 font-bold text-sm text-[#5eea8f] mb-1">
                  <ArrowRightLeft className="w-4 h-4" /> Alimentação por Software Externo
                </div>
                <p className="text-[#a5a4b8] text-[11px] leading-relaxed">
                  Permite que outros programas médicos ou administrativos autorizados (iClinic, Totvs, Webdiet, balanças inteligentes) enviem dados diretamente para este paciente no Firebase.
                </p>
              </div>

              {/* Presets */}
              <div>
                <label className="block text-[11px] font-semibold text-[#e8e8f0] mb-1">
                  Presets de Simulação de Sistemas Externos:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => handlePresetChange('exam')}
                    className={`p-2 rounded-xl border text-left cursor-pointer transition ${
                      selectedPreset === 'exam'
                        ? 'border-[#5eea8f] bg-[rgba(94,234,143,0.12)] text-[#5eea8f]'
                        : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="font-bold">Laboratório de Exames</div>
                    <div className="text-[10px] opacity-75">Injeta resultado novo</div>
                  </button>

                  <button
                    onClick={() => handlePresetChange('weight')}
                    className={`p-2 rounded-xl border text-left cursor-pointer transition ${
                      selectedPreset === 'weight'
                        ? 'border-[#5eea8f] bg-[rgba(94,234,143,0.12)] text-[#5eea8f]'
                        : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="font-bold">Balança Bioimpedância</div>
                    <div className="text-[10px] opacity-75">Atualiza peso e músculo</div>
                  </button>

                  <button
                    onClick={() => handlePresetChange('guide')}
                    className={`p-2 rounded-xl border text-left cursor-pointer transition ${
                      selectedPreset === 'guide'
                        ? 'border-[#5eea8f] bg-[rgba(94,234,143,0.12)] text-[#5eea8f]'
                        : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="font-bold">Software de Dieta</div>
                    <div className="text-[10px] opacity-75">Publica Guia 03</div>
                  </button>
                </div>
              </div>

              {/* JSON Payload Editor */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-[#e8e8f0] flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-[#7c6af7]" /> Carga Útil JSON (Payload da API / Webhook)
                  </span>
                  <span className="text-[10px] text-[#a5a4b8]">Editável em tempo real</span>
                </div>
                <textarea
                  value={jsonPayload}
                  onChange={(e) => {
                    setJsonPayload(e.target.value);
                    setSelectedPreset('custom');
                  }}
                  rows={8}
                  className="w-full bg-[#0a0a14] border border-[rgba(255,255,255,0.18)] rounded-xl p-2.5 font-mono text-[11px] text-[#5eea8f] focus:outline-none focus:border-[#5eea8f]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={handleExecuteExternalSync}
                  className="px-4 py-2 rounded-xl bg-[#0f7a3a] border border-[#5eea8f] text-white font-bold hover:bg-[#128d43] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Disparar Sincronização Externa
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EDIÇÃO RÁPIDA */}
          {activeTab === 'edit' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#a5a4b8] mb-1">Peso Atual (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-[#0a0a14] border border-white/20 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[#a5a4b8] mb-1">Gordura Corporal (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bodyFat}
                    onChange={(e) => setBodyFat(e.target.value)}
                    className="w-full bg-[#0a0a14] border border-white/20 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[#a5a4b8] mb-1">Massa Muscular (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={muscle}
                    onChange={(e) => setMuscle(e.target.value)}
                    className="w-full bg-[#0a0a14] border border-white/20 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#a5a4b8] mb-1">Próxima Consulta Agendada</label>
                <input
                  type="text"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  className="w-full bg-[#0a0a14] border border-white/20 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[#a5a4b8] mb-1">Mensagem de Alerta da LYA (Assistente)</label>
                <input
                  type="text"
                  value={lyaMessage}
                  onChange={(e) => setLyaMessage(e.target.value)}
                  className="w-full bg-[#0a0a14] border border-white/20 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[#a5a4b8] mb-1">Comentário do Profissional (Aba Evolução)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0a0a14] border border-white/20 rounded-xl p-2 text-white"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleResetData}
                  className="text-xs text-[#a5a4b8] hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Restaurar valores originais
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-xl bg-[#5b4bd6] hover:bg-[#6e5be8] text-white font-bold transition cursor-pointer"
                >
                  Salvar Dados do Paciente
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: STATUS FIREBASE */}
          {activeTab === 'firebase' && (
            <div className="space-y-3">
              <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-[#5eea8f]" />
                  <span className="font-bold text-sm text-white">Status da Conexão Firebase</span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-[#a5a4b8]">Modo Atual:</span>
                  {isFirebaseConfigured() ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#0f7a3a] text-white text-[11px] font-bold">
                      🔥 Conectado ao Firebase Firestore
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#a35a07] text-white text-[11px] font-bold">
                      ℹ️ Marcador de Configuração Ativo (Simulação Reativa Local)
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#e8e8f0] leading-relaxed">
                  Conforme solicitado nas instruções, o identificador de configuração foi criado em um arquivo padrão e facilmente localizável com um marcador explícito para preenchimento posterior:
                </p>

                <div className="bg-[#0a0a14] border border-white/10 rounded-xl p-3 my-2 font-mono text-[11px] text-[#5eea8f]">
                  Arquivo: <strong>src/config/firebase.ts</strong><br />
                  Marcador: <strong>FIREBASE_CONFIG</strong><br />
                  Segurança: <strong>firestore.rules</strong> (Isolamento por Paciente)
                </div>

                <p className="text-[11px] text-[#a5a4b8]">
                  Quando as credenciais oficiais forem fornecidas, basta substituir os campos em <code>src/config/firebase.ts</code>. O aplicativo se conectará automaticamente sem precisar de nenhuma refatoração no código ou nos componentes.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: LOGS DE SINCRONIA */}
          {activeTab === 'logs' && (
            <div className="space-y-2">
              <span className="font-semibold text-white">Últimas Integrações e Ações Registradas:</span>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {externalCrmAdapter.getRecentLogs().length === 0 ? (
                  <div className="text-center py-6 text-[#a5a4b8]">
                    Nenhuma integração externa disparada ainda nesta sessão. Use a aba "Integrações & Webhooks" para testar.
                  </div>
                ) : (
                  externalCrmAdapter.getRecentLogs().map((log) => (
                    <div
                      key={log.id}
                      className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl p-2.5 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#5eea8f]"></span>
                          {log.source} — {log.action}
                        </div>
                        <div className="text-[11px] text-[#a5a4b8] mt-0.5">{log.details}</div>
                      </div>
                      <span className="text-[10px] text-[#e8e8f0] font-mono">{log.timestamp}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[rgba(255,255,255,0.14)] flex justify-between items-center text-xs">
          <span className="text-[#a5a4b8]">
            ID Paciente: <strong className="text-white">{currentPatient.id}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
