import React, { useState } from 'react';
import { PatientProfile } from '../../types/patient';

interface DashboardTabProps {
  patient: PatientProfile;
  onNavigateTab: (tabId: string) => void;
  onOpenPdf: (title: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  patient,
  onNavigateTab,
  onOpenPdf
}) => {
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    'act-1': false,
    'act-2': false,
    'act-3': false
  });

  const toggleAccordion = (id: string) => {
    setOpenAccordions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const firstName = patient.name.split(' ')[0] || 'Maria';

  // Sincronização inteligente com a Agenda: identifica a próxima consulta com status "Agendada" e data futura
  // Caso não existam mais consultas agendadas ou as datas tenham passado, exibe apenas o ícone com o traço "-"
  const getNextScheduledConsultation = (): string => {
    const sessions = patient.consultations?.filter(c => {
      const st = (c.status || '').toLowerCase().trim();
      return st === 'agendada';
    }) || [];

    if (sessions.length === 0) {
      if (patient.nextConsultationDate && patient.nextConsultationDate !== '-') {
        // Valida se a data do campo nextConsultationDate já passou
        const parts = patient.nextConsultationDate.split('·').map(p => p.trim());
        const dateMatch = (parts[0] || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})/);
        if (dateMatch) {
          const day = parseInt(dateMatch[1], 10);
          const month = parseInt(dateMatch[2], 10) - 1;
          const year = dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3], 10) : parseInt(dateMatch[3], 10);
          if (new Date(year, month, day, 23, 59, 59) < new Date()) {
            return '-';
          }
        }
        return patient.nextConsultationDate;
      }
      return '-';
    }

    const now = new Date();

    for (const session of sessions) {
      if (!session.dateStr || session.dateStr.trim() === '' || session.dateStr === '-') continue;

      const dateMatch = session.dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      const timeMatch = session.dateStr.match(/(\d{1,2}):(\d{2})/);

      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10) - 1;
        const year = parseInt(dateMatch[3], 10);
        const hours = timeMatch ? parseInt(timeMatch[1], 10) : 23;
        const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 59;
        const sessionDate = new Date(year, month, day, hours, minutes);

        if (sessionDate >= now) {
          const formattedDate = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
          const formattedTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]} hrs` : '';
          return formattedTime ? `${formattedDate} · ${formattedTime}` : formattedDate;
        }
      } else {
        return session.dateStr;
      }
    }

    return '-';
  };

  const nextConsultationDisplay = getNextScheduledConsultation();
  const acknowledgedTabs = patient.lyaNotification?.acknowledgedTabs || [];
  const pendingQuickLinks = (patient.lyaNotification?.quickLinks || []).filter(
    link => !acknowledgedTabs.includes(link.tab)
  );
  const hasPendingUpdates = patient.lyaNotification?.active && pendingQuickLinks.length > 0;

  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      {/* Card da Mensagem / Próxima Agenda (Fixo: Próxima Agenda; Mensagem exibida apenas se houver novidades não lidas) */}
      <div className="bg-gradient-to-br from-[#1c163a] to-[#121224] border border-[#7c6af7]/35 rounded-2xl p-3.5 shadow-md">
        {hasPendingUpdates && (
          <>
            <div className="text-[18px] font-bold text-[#5eea8f] leading-tight">
              Mensagem do Dr. João Paulo
            </div>
            <div className="text-[18px] text-white mt-1 leading-snug">
              Olá! {firstName}! Temos Atualizações!
            </div>
          </>
        )}

        {/* Linha separação atual + Próxima Consulta com Ícone Pulsante conectado à Agenda (Fixo) */}
        <div className={`flex items-center gap-2 text-[18px] text-[#e8e8f0] ${hasPendingUpdates ? 'mt-2.5 pt-2 border-t border-white/[0.08]' : ''}`}>
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5eea8f] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#5eea8f]"></span>
          </span>
          {nextConsultationDisplay !== '-' ? (
            <span className="text-[18px]">Próxima Agenda: <strong className="text-white">{nextConsultationDisplay}</strong></span>
          ) : (
            <span className="text-[18px] text-[#8e8ea6] flex items-center gap-1">
              <span>Próxima Agenda:</span>
              <strong className="text-white font-bold text-lg leading-none">-</strong>
            </span>
          )}
        </div>
      </div>

      {/* Registros de Atividades (espaçamento de respiro visual de 0.5cm) */}
      <div className="mt-[19px]">
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f]">
            Registros de atividades
          </div>
        </div>

        <div className="space-y-2">
          {patient.activities.map(act => {
            const isOpen = openAccordions[act.id] ?? false;
            return (
              <div
                key={act.id}
                className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden transition"
              >
                <div
                  onClick={() => toggleAccordion(act.id)}
                  className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-white/[0.06] transition"
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      act.dotType === 'done'
                        ? 'bg-[#5eea8f]'
                        : act.dotType === 'act'
                        ? 'bg-[#9b8cff]'
                        : 'border-2 border-dashed border-[#8e8ea6]'
                    }`}
                  />
                  <div className="grow min-w-0">
                    <div className="text-[18px] font-semibold text-white leading-tight">
                      {act.title}
                    </div>
                    <div className="text-[16px] text-[#8e8ea6] mt-1 leading-tight">
                      {act.dateStr}
                    </div>
                  </div>

                  {act.badge === 'feito' && (
                    <span className="text-[14px] font-semibold text-white px-2 py-0.5 rounded bg-[#0f7a3a] shrink-0 uppercase tracking-wider">
                      feito
                    </span>
                  )}
                  {act.badge === 'novo' && (
                    <span className="text-[14px] font-semibold text-white px-2 py-0.5 rounded bg-[#a35a07] shrink-0 uppercase tracking-wider">
                      novo
                    </span>
                  )}

                  <i
                    className={`ti ti-chevron-right text-[16px] text-[#8e8ea6] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-90 text-white' : ''
                    }`}
                  ></i>
                </div>

                {isOpen && (
                  <div className="px-3 pb-3 pt-1 border-t border-white/[0.06] bg-black/20">
                    <div className="text-[16px] text-[#cfd3dc] leading-relaxed">
                      {act.description}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
