import React from 'react';
import { PatientProfile, ConsultationItem } from '../../types/patient';
import { Calendar, MessageSquareShare } from 'lucide-react';

interface ConsultationsTabProps {
  patient: PatientProfile;
  onOpenReschedule: () => void;
}

export const ConsultationsTab: React.FC<ConsultationsTabProps> = ({
  patient,
  onOpenReschedule
}) => {
  // Redirecionamento inteligente para WhatsApp com a mensagem solicitada
  const handleRemarcarWhatsApp = (sessionTitle: string) => {
    const phoneNumber = '5527997918100';
    const message = encodeURIComponent('Preciso remarcar, ');
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  // Garante 3 sessões padronizadas conforme o CRM
  const sessions: ConsultationItem[] = patient.consultations && patient.consultations.length > 0 
    ? patient.consultations 
    : [
        {
          id: 'cons-1',
          title: '1ª Sessão',
          dateStr: '27/09/2026 · 14:00 hrs',
          status: 'Concluída'
        },
        {
          id: 'cons-2',
          title: '2ª Sessão',
          dateStr: '26/11/2026 · 14:00 hrs',
          status: 'Agendada'
        },
        {
          id: 'cons-3',
          title: '3ª Sessão',
          dateStr: '15/01/2027 · 10:00 hrs',
          status: 'Agendada'
        }
      ];

  // Helper para renderizar a única opção de status correspondente
  const renderStatusBadge = (status: string) => {
    const normalized = status.toLowerCase();

    if (normalized === 'concluída' || normalized === 'concluida' || normalized === 'realizada') {
      return (
        <span className="text-[14px] font-semibold text-white px-2.5 py-0.5 rounded-lg bg-[#0f7a3a] shrink-0 uppercase tracking-wider">
          Concluída
        </span>
      );
    }

    if (normalized === 'remarcada') {
      return (
        <span className="text-[14px] font-semibold text-white px-2.5 py-0.5 rounded-lg bg-[#a35a07] shrink-0 uppercase tracking-wider">
          Remarcada
        </span>
      );
    }

    if (normalized === 'cancelada') {
      return (
        <span className="text-[14px] font-semibold text-white px-2.5 py-0.5 rounded-lg bg-[#b42318] shrink-0 uppercase tracking-wider">
          Cancelada
        </span>
      );
    }

    // Padrão: Agendada
    return (
      <span className="text-[14px] font-semibold text-white px-2.5 py-0.5 rounded-lg bg-[#5b4bd6] shrink-0 uppercase tracking-wider">
        Agendada
      </span>
    );
  };

  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      {/* Título da Aba Agenda */}
      <div className="text-[20px] font-['Cormorant_Garamond',serif] font-medium tracking-[0.02em] text-[#5eea8f] mb-1">
        Sessões de Consulta
      </div>

      {/* Lista das 3 Sessões com Status Inteligente do CRM */}
      <div className="space-y-3">
        {sessions.map((sessao, index) => {
          const displayTitle = sessao.title || `${index + 1}ª Sessão`;

          return (
            <div
              key={sessao.id || `sessao-${index}`}
              className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3.5 shadow-sm transition hover:border-white/15"
            >
              {/* Linha 1: Título da Sessão + Único Status (Agendada/Concluída/Remarcada/Cancelada) */}
              <div className="flex items-center justify-between gap-2.5">
                <div className="text-[18px] font-semibold text-white leading-tight">
                  {displayTitle}
                </div>
                {renderStatusBadge(sessao.status)}
              </div>

              {/* Linha 2: Data e Hora */}
              <div className="text-[16px] text-[#8e8ea6] mt-1.5 leading-snug flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#7c6af7] shrink-0" />
                <span>{sessao.dateStr}</span>
              </div>

              {/* Linha 3: Botão Remarcar direcionando ao WhatsApp */}
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => handleRemarcarWhatsApp(displayTitle)}
                  title="Remarcar via WhatsApp (27 997918100)"
                  className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-2 text-[15px] font-medium py-0 px-3.5 rounded-xl bg-white/[0.08] border border-white/20 hover:bg-[#25D366]/20 hover:border-[#25D366] text-white hover:text-[#5eea8f] active:scale-95 transition cursor-pointer"
                >
                  <MessageSquareShare className="w-4 h-4 text-[#5eea8f]" />
                  <span>Remarcar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
