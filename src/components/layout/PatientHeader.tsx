import React from 'react';
import { PatientProfile } from '../../types/patient';
import { LogOut, Clock } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

interface PatientHeaderProps {
  patient: PatientProfile;
  activeTab: string;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({ patient, activeTab }) => {
  const { logout } = useAuth();
  const isInicio = activeTab === 'inicio';

  // Nas demais abas, cabeçalho é ocultado para maximizar 100% o espaço útil dos dados clínicos
  if (!isInicio) {
    return null;
  }

  const activeDaysCount = patient.activeDays ?? 32;

  // Na aba Início: Foto, Nome (21px, text-left), Status pulsante ("Em atividade há xx dias"), "A Concluir: xx Dias" e Logout
  return (
    <div className="px-3 sm:px-4 pt-2 pb-2 border-b border-white/[0.08] select-none">
      <div className="bg-white/[0.04] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-br from-[#7c6af7] to-[#5b4bd6] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow border border-white/10">
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
            <div className="min-w-0">
              <div 
                style={{ width: '243.705px' }}
                className="text-[20px] text-left font-['Cormorant_Garamond',serif] font-semibold tracking-[0.02em] text-white leading-tight truncate max-w-full"
              >
                {patient.name}
              </div>
              <div className="text-[16px] text-[#cfd3dc] font-normal mt-0.5 leading-snug">
                Último Acesso: <span className="text-white font-medium">{patient.lastAccess && /\d{1,2}\/\d{1,2}\/\d{4}/.test(patient.lastAccess) ? patient.lastAccess : '30/10/2026'}</span>
              </div>
              <div className="text-[16px] text-[#5eea8f] font-medium flex items-center gap-1.5 mt-0.5 font-['Plus_Jakarta_Sans',sans-serif]">
                <Clock className="w-4 h-4 text-[#5eea8f] shrink-0" />
                <span className="text-[16px]">Ciclo atual: <strong className="text-white font-semibold">{patient.daysToComplete} dias restantes</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sair do aplicativo"
            className="p-2 rounded-xl text-[#8e8ea6] hover:text-white hover:bg-white/10 active:scale-95 transition cursor-pointer shrink-0"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
