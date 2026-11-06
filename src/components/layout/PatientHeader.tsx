import React, { useState } from 'react';
import { PatientProfile } from '../../types/patient';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { ContextualHelpButton } from '../common/ContextualHelpButton';
import { SmartSupportModal } from '../common/SmartSupportModal';

interface PatientHeaderProps {
  patient: PatientProfile;
  activeTab: string;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({ patient, activeTab }) => {
  const { logout } = useAuth();
  const [isSupportOpen, setIsSupportOpen] = useState<boolean>(false);
  const isInicio = activeTab === 'inicio';

  // Nas demais abas, cabeçalho é ocultado para maximizar 100% o espaço útil dos dados clínicos
  if (!isInicio) {
    return null;
  }

  // Na aba Início: Foto, Nome, Informações, Botão "i" de ajuda, Central de Apoio e Logout
  return (
    <div className="px-3 sm:px-4 pt-2 pb-2 border-b border-white/[0.08] select-none">
      <div className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl px-3 py-2 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gradient-to-br from-[#7c6af7] to-[#5b4bd6] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow border border-white/10">
              {patient.avatarUrl ? (
                <img 
                  src={patient.avatarUrl} 
                  alt={patient.name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                patient.initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div 
                className="text-[20px] text-left font-['Cormorant_Garamond',serif] font-semibold tracking-[0.02em] text-white leading-tight truncate"
              >
                {patient.name || 'Paciente'}
              </div>
              <div className="text-[14px] text-[#5eea8f] font-medium leading-snug font-['Plus_Jakarta_Sans',sans-serif]">
                Ciclo atual: <strong className="text-white font-semibold">{patient.daysToComplete && patient.daysToComplete > 0 ? `${patient.daysToComplete} dias restantes` : '-'}</strong>
              </div>
            </div>
          </div>

          {/* Botões de Ação do Cabeçalho: Botão "i", Central de Suporte e Sair */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Botão Contextual "i" (Regra dos 3 Pontos) */}
            <ContextualHelpButton
              title="Aba Meu Dia"
              whatItIs="Nesta tela você acompanha sua rotina do dia, horário da próxima consulta e lembretes prioritários."
              yourAction="Confira os horários das suas medicações e confirme sua presença na próxima consulta."
              doctorTip="Marque suas tarefas do dia concluídas pela manhã para garantir 100% de aderência ao plano!"
            />

            {/* Central de Apoio Inteligente (Caderno de 2ª Feira & FAQs) */}
            <button
              onClick={() => setIsSupportOpen(true)}
              title="Central de Apoio & Dúvidas"
              className="p-1.5 rounded-xl text-[#ffd000] bg-[#ffd000]/10 hover:bg-[#ffd000]/20 active:scale-95 transition cursor-pointer shrink-0 border border-[#ffd000]/30"
            >
              <i className="ti ti-help-circle text-[18px]"></i>
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              title="Sair do aplicativo"
              className="p-1.5 rounded-xl text-[#e0e0ed] hover:text-white hover:bg-white/10 active:scale-95 transition cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Central de Apoio / Caderno de 2ª Feira */}
      <SmartSupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        patientName={patient.name}
      />
    </div>
  );
};

