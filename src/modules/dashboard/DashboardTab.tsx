import React, { useState, useMemo } from 'react';
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

  const [showAll, setShowAll] = useState<boolean>(false);

  // Rastreamento dinâmico de itens visualizados (NOVO vs VISUALIZADO)
  const [viewedActivities, setViewedActivities] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const ackTabs = patient.lyaNotification?.acknowledgedTabs || [];
    patient.activities.forEach(act => {
      const tabKey = act.id === 'act-1' ? 'exames' : act.id === 'act-2' ? 'guia' : 'consultas';
      if (ackTabs.includes(tabKey) || act.badge === 'feito' || act.dotType === 'done') {
        initial[act.id] = true;
      }
    });
    return initial;
  });

  const handleActivityClick = (actId: string) => {
    setOpenAccordions(prev => ({ ...prev, [actId]: !prev[actId] }));
    setViewedActivities(prev => ({ ...prev, [actId]: true }));
  };

  const handleNavigate = (actId: string, tabId: string) => {
    setViewedActivities(prev => ({ ...prev, [actId]: true }));
    onNavigateTab(tabId);
  };

  const handleOpenPdfAction = (actId: string, title: string) => {
    setViewedActivities(prev => ({ ...prev, [actId]: true }));
    onOpenPdf(title);
  };

  // Parser de data e tempo relativo
  const parseActivityDate = (dateStr: string) => {
    const clean = dateStr.replace(/^Data:\s*/i, '').trim();
    if (clean.includes('·')) {
      const [exact, rel] = clean.split('·').map(s => s.trim());
      return { exactDate: exact, relativeTime: rel };
    }
    return { exactDate: clean, relativeTime: '' };
  };

  // Conversor timestamp para ordenação estrita: sempre do mais atual (recente) ao mais antigo
  const getActivityTimestamp = (dateStr: string): number => {
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const d = parseInt(match[1], 10);
      const m = parseInt(match[2], 10) - 1;
      const y = parseInt(match[3], 10);
      return new Date(y, m, d).getTime();
    }
    return 0;
  };

  const sortedActivities = useMemo(() => {
    return [...patient.activities].sort((a, b) => {
      return getActivityTimestamp(b.dateStr) - getActivityTimestamp(a.dateStr);
    });
  }, [patient.activities]);

  // Regra: exibir os 3 primeiros e em seguida botão "Ver tudo para carregar"
  const displayedActivities = showAll ? sortedActivities : sortedActivities.slice(0, 3);

  const scrollToTop = () => {
    const scr = document.getElementById('scr');
    if (scr) {
      scr.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const firstName = patient.name.split(' ')[0] || 'Maria';

  // Sincronização inteligente com a Agenda
  const getNextScheduledConsultation = (): string => {
    const sessions = patient.consultations?.filter(c => {
      const st = (c.status || '').toLowerCase().trim();
      return st === 'agendada';
    }) || [];

    if (sessions.length === 0) {
      if (patient.nextConsultationDate && patient.nextConsultationDate !== '-') {
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
      {/* Card da Mensagem / Próxima Agenda */}
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

        <div className={`flex items-center gap-2 text-[18px] text-[#e8e8f0] ${hasPendingUpdates ? 'mt-2.5 pt-2 border-t border-white/[0.08]' : ''}`}>
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5eea8f] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#5eea8f]"></span>
          </span>
          {nextConsultationDisplay !== '-' ? (
            <span className="text-[18px]">Próxima Agenda: <strong className="text-white">{nextConsultationDisplay}</strong></span>
          ) : (
            <span className="text-[18px] text-[#e0e0ed] flex items-center gap-1">
              <span>Próxima Agenda:</span>
              <strong className="text-white font-bold text-lg leading-none">-</strong>
            </span>
          )}
        </div>
      </div>

      {/* Linha do Tempo / Registros de Atividades - Ordenação Decrescente Sem Pulse */}
      <div className="mt-5">
        {/* Cabeçalho da Seção */}
        <div className="flex items-center justify-between mb-3 px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-bold tracking-tight text-[#e8eef5] border-[#fcfcfc]">
              Linha do tempo
            </h2>
            <span className="text-[16px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8b98a6] border border-white/[0.08]">
              {patient.activities.length} registros
            </span>
          </div>
        </div>

        {/* Container da Linha do Tempo */}
        <div className="relative pl-0">
          {/* Conector vertical contínuo conectando todos os nós */}
          <div
            className="absolute left-[14px] top-[24px] bottom-[28px] w-[2px] bg-gradient-to-b from-white/15 via-white/10 to-transparent pointer-events-none"
            aria-hidden="true"
          />

          <div className="space-y-3">
            {displayedActivities.map(act => {
              const isOpen = openAccordions[act.id] ?? false;
              const { exactDate, relativeTime } = parseActivityDate(act.dateStr);
              const isViewed = !!viewedActivities[act.id];
              const isAgenda = act.badge === 'agendado' || act.dotType === 'fut';

              return (
                <div key={act.id} className="relative flex items-start gap-3 group">
                  {/* Nó Circular (30x30px) com Ícone SVG de Check Verde (Exclusivo conforme Imagem 2) */}
                  <div className="relative z-10 shrink-0 mt-2">
                    <div className="w-[30px] h-[30px] rounded-full bg-[#2fd575]/15 border border-[#2fd575]/35 flex items-center justify-center text-[#5eeaa0] shadow-[0_0_12px_rgba(47,213,117,0.18)] group-hover:scale-105 transition-transform duration-200">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>

                  {/* Card de Conteúdo do Registro com estilos refinados e compactos */}
                  <div
                    onClick={() => handleActivityClick(act.id)}
                    className={`grow min-w-0 bg-[#121722]/85 hover:bg-[#161c2a] border transition-all duration-200 rounded-2xl pl-[14px] pr-3.5 py-2.5 -ml-[5px] mr-[9px] cursor-pointer shadow-sm ${
                      isOpen ? 'border-white/20 bg-[#151b27]' : 'border-white/[0.07] hover:border-white/[0.14]'
                    }`}
                  >
                    {/* Linha Superior: Título + Tempo Relativo */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[18.5px] font-semibold text-[#e8eef5] group-hover:text-white leading-snug border-[#fffbfb]">
                        {act.title}
                      </h3>
                      {relativeTime && (
                        <span className="text-[17px] font-medium text-[#8b98a6] whitespace-nowrap tabular-nums shrink-0 pt-0.5 border-[#e8eef5]">
                          {relativeTime}
                        </span>
                      )}
                    </div>

                    {/* Linha de Metadados: Data Exata + Indicador de Abertura */}
                    <div className="flex items-center justify-between mt-1 gap-2">
                      <div className="flex items-center">
                        <span className="text-[17px] text-[#8b98a6] font-medium h-[27px] px-[6px] pb-[2px] -mt-[8px] -ml-[6px] border-[#e8eef5] flex items-center">
                          {exactDate}
                        </span>
                      </div>

                      <div className="flex items-center shrink-0">
                        <svg
                          className={`w-3.5 h-3.5 text-[#8b98a6] transition-transform duration-200 ${isOpen ? 'rotate-90 text-white' : ''}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </div>

                    {/* Detalhes Colapsáveis e Ações Contextuais Rápidas */}
                    {isOpen && (
                      <div className="pt-2.5 mt-2.5 border-t border-white/[0.06] animate-fadeIn">
                        <p className="text-[14px] text-[#cfd3dc] leading-relaxed">
                          {act.description}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2" onClick={e => e.stopPropagation()}>
                          {act.id === 'act-1' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleNavigate('act-1', 'exames')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 rounded-lg transition-all active:scale-95"
                              >
                                <span>Ver Exames</span>
                                <svg className="w-3.5 h-3.5 text-[#2fd575]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenPdfAction('act-1', 'Painel Hormonal & Bioquímico Completo')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-[#5eeaa0] bg-[#2fd575]/10 hover:bg-[#2fd575]/20 border border-[#2fd575]/25 rounded-lg transition-all active:scale-95"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                <span>Laudo PDF</span>
                              </button>
                            </>
                          )}
                          {act.id === 'act-2' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleNavigate('act-2', 'guia')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 rounded-lg transition-all active:scale-95"
                              >
                                <span>Abrir Guia</span>
                                <svg className="w-3.5 h-3.5 text-[#f5b04c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenPdfAction('act-2', 'Guia Alimentar 02')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-[#f5b04c] bg-[#e8930c]/10 hover:bg-[#e8930c]/20 border border-[#e8930c]/25 rounded-lg transition-all active:scale-95"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                <span>PDF do Guia</span>
                              </button>
                            </>
                          )}
                          {act.id === 'act-3' && (
                            <button
                              type="button"
                              onClick={() => handleNavigate('act-3', 'consultas')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 rounded-lg transition-all active:scale-95"
                            >
                              <span>Ver Consultas</span>
                              <svg className="w-3.5 h-3.5 text-[#8b98a6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                            </button>
                          )}
                          {act.id === 'act-4' && (
                            <button
                              type="button"
                              onClick={() => handleNavigate('act-4', 'avaliacao')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 rounded-lg transition-all active:scale-95"
                            >
                              <span>Ver Avaliação</span>
                              <svg className="w-3.5 h-3.5 text-[#2fd575]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                            </button>
                          )}
                          {act.id === 'act-5' && (
                            <button
                              type="button"
                              onClick={() => handleNavigate('act-5', 'protocolo')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 rounded-lg transition-all active:scale-95"
                            >
                              <span>Ver Protocolo</span>
                              <svg className="w-3.5 h-3.5 text-[#2fd575]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão Ver tudo para carregar (exibido logo abaixo dos 3 primeiros) */}
          {!showAll && sortedActivities.length > 3 && (
            <div className="pt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/[0.08] hover:border-white/[0.15] text-[16px] font-semibold text-[#5eea8f] hover:text-[#2fd575] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Ver tudo para carregar</span>
                <svg className="w-4 h-4 text-[#5eea8f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          )}

          {/* Botão Voltar Acima (exibido no final quando tudo está carregado) */}
          {showAll && (
            <div className="pt-4 pb-2 flex justify-center">
              <button
                type="button"
                onClick={scrollToTop}
                className="text-[18px] italic font-semibold text-[#5eea8f] hover:text-[#2fd575] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer py-1.5 px-3"
              >
                <svg className="w-4 h-4 text-[#5eea8f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
                <span>Voltar Acima</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
