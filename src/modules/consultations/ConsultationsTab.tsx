import React, { useState } from 'react';
import { PatientProfile, ConsultationItem } from '../../types/patient';
import { Calendar, MessageSquareShare, X } from 'lucide-react';

interface ConsultationsTabProps {
  patient: PatientProfile;
  onOpenReschedule: () => void;
}

export const ConsultationsTab: React.FC<ConsultationsTabProps> = ({
  patient,
  onOpenReschedule
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedSessionTitle, setSelectedSessionTitle] = useState<string>('');

  const handleOpenRemarcarModal = (sessionTitle: string) => {
    setSelectedSessionTitle(sessionTitle);
    setIsModalOpen(true);
  };

  // Redirecionamento inteligente para WhatsApp após confirmação
  const handleConfirmWhatsApp = () => {
    const phoneNumber = '5527997918100';
    const message = encodeURIComponent(`Preciso remarcar, ${selectedSessionTitle}`);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank', 'noopener,noreferrer');
    setIsModalOpen(false);
  };

  // Garante 3 sessões padronizadas conforme o CRM
  const sessions: ConsultationItem[] = patient.consultations && patient.consultations.length > 0 
    ? patient.consultations 
    : [
        {
          id: 'cons-1',
          title: '1° SESSÃO',
          dateStr: '27/09/2026 · 14:00 hrs',
          status: 'Concluída'
        },
        {
          id: 'cons-2',
          title: '2° SESSÃO',
          dateStr: '26/11/2026 · 14:00 hrs',
          status: 'Agendada'
        },
        {
          id: 'cons-3',
          title: '3° SESSÃO',
          dateStr: '15/01/2027 · 10:00 hrs',
          status: 'Agendada'
        }
      ];

  // Helper para verificar se a sessão é passada ou concluída
  const isSessionPast = (sessao: ConsultationItem): boolean => {
    const normalized = (sessao.status || '').toLowerCase();
    if (normalized === 'concluída' || normalized === 'concluida' || normalized === 'realizada') {
      return true;
    }
    if (sessao.dateStr) {
      const match = sessao.dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (match) {
        const [, day, month, year] = match;
        const sessionDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), 23, 59, 59);
        const now = new Date();
        if (sessionDate < now) {
          return true;
        }
      }
    }
    return false;
  };

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
      <div className="mb-3">
        <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
          Minha Agenda
        </div>
      </div>

      {/* Lista das 3 Sessões com Status Inteligente do CRM */}
      <div className="space-y-4">
        {sessions.map((sessao, index) => {
          const displayTitle = sessao.title
            ? sessao.title.toUpperCase().replace('ª', '°')
            : `${index + 1}° SESSÃO`;

          const isPast = isSessionPast(sessao);

          return (
            <div
              key={sessao.id || `sessao-${index}`}
              className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-3.5 shadow-sm transition hover:border-white/70"
            >
              {/* Linha 1: Título da Sessão + Único Status (Agendada/Concluída/Remarcada/Cancelada) */}
              <div className="flex items-center justify-between gap-2.5">
                <div className="text-[18px] font-semibold text-white leading-tight uppercase">
                  {displayTitle}
                </div>
                {renderStatusBadge(sessao.status)}
              </div>

              {/* Linha 2: Data e Hora */}
              <div className="text-[18px] text-[#e0e0ed] mt-1.5 leading-snug flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#7c6af7] shrink-0" />
                <span className="text-[18px]">Data: {sessao.dateStr}</span>
              </div>

              {/* Linha 3: Botão Remarcar (cinza e desabilitado se a data for passada/concluída, verde e ativo se for futura) */}
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-white/[0.06]">
                {isPast ? (
                  <button
                    type="button"
                    disabled
                    title="Sessão concluída ou anterior à data atual (remarcação indisponível)"
                    className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-2 text-[15px] font-medium py-0 px-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-[#8b98a6] opacity-60 cursor-not-allowed select-none"
                  >
                    <MessageSquareShare className="w-4 h-4 text-[#8b98a6]" />
                    <span>Remarcar</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenRemarcarModal(displayTitle)}
                    title="Remarcar Sessão"
                    className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-2 text-[15px] font-medium py-0 px-3.5 rounded-xl bg-white/[0.08] border border-white/20 hover:bg-[#25D366]/20 hover:border-[#25D366] text-white hover:text-[#5eea8f] active:scale-95 transition cursor-pointer"
                  >
                    <MessageSquareShare className="w-4 h-4 text-[#5eea8f]" />
                    <span>Remarcar</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Informativo de Remarcação com X de Fechar e Fonte 20px */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 font-['Plus_Jakarta_Sans',sans-serif]"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="w-full max-w-full sm:max-w-[440px] bg-[#14142a] border-[1px] border-white/50 rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Topo com Título e Botão X de Fechar */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5eea8f]"></span>
                <span className="text-[19px] font-['Cormorant_Garamond',serif] font-medium tracking-[0.03em] text-white">
                  Remarcação de Sessão
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:text-[#5eea8f] p-1 text-2xl cursor-pointer transition"
                aria-label="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Texto Exato com Fonte 20px */}
            <div className="text-[20px] text-[#eef4f8] leading-relaxed mb-5 font-normal select-text">
              Compreendemos sua necessidade e sabemos que imprevistos ou ajustes de agenda podem acontecer. Para mantermos a organização dos atendimentos, será permitida uma única alteração de horário por sessão. Agradecemos sua compreensão.
            </div>

            {/* Ação: Continuar para Remarcação via WhatsApp */}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleConfirmWhatsApp}
                className="w-full py-3 rounded-xl bg-[#0f7a3a] border border-[#5eea8f]/50 text-white text-[16px] font-bold flex items-center justify-center gap-2 hover:bg-[#128a42] active:scale-95 shadow-lg shadow-[#0f7a3a]/25 transition cursor-pointer"
              >
                <MessageSquareShare className="w-5 h-5 text-[#5eea8f]" />
                <span>Prosseguir para Remarcar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
