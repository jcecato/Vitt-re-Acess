import React, { useState, useMemo, useEffect } from 'react';
import { PatientProfile, ClinicalEvolutionItem, ParsedEncounterTag, NumberedStepItem } from '../../types/patient';
import {
  crmDataService,
  sortClinicalEvolutionsDesc,
  isConsultationEncounterDoc,
  normalizeParsedTags,
  normalizeNumberedSteps
} from '../../services/crmDataService';

interface NotesTabProps {
  patient: PatientProfile;
}

export const NotesTab: React.FC<NotesTabProps> = ({ patient }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHeaderInfoOpen, setIsHeaderInfoOpen] = useState(false);

  const targetEmail = (patient.email && patient.email.includes('@'))
    ? patient.email.trim().toLowerCase()
    : (patient.id && patient.id.includes('@') ? patient.id.trim().toLowerCase() : 'jcecato@gmail.com');

  useEffect(() => {
    crmDataService.refreshClinicalEvolutions(targetEmail);
  }, [targetEmail]);

  const evolutions = useMemo<ClinicalEvolutionItem[]>(() => {
    const rawList = Array.isArray(patient.clinicalEvolutions) ? patient.clinicalEvolutions : [];
    const validRecords = rawList.filter((ev) => {
      if (!ev || ev.id === 'resumo_geral') return false;
      const legacySummary = (ev.resumoGeral || '').trim();
      const nonDeclinioSummary = legacySummary && !/^decl[ií]nio\b/i.test(legacySummary) ? legacySummary : '';
      const hasContent =
        Boolean((ev.pertinentObservations || ev.observacoes || nonDeclinioSummary).trim()) ||
        Boolean(
          (ev.nextSteps && ev.nextSteps.length > 0) ||
          (ev.numberedSteps && ev.numberedSteps.length > 0) ||
          (ev.proximosPassos && ev.proximosPassos.length > 0) ||
          (ev.planoDeAcao && ev.planoDeAcao.length > 0)
        ) ||
        Boolean(ev.parsedTags && ev.parsedTags.length > 0) ||
        Boolean(ev.alertTags && ev.alertTags.length > 0) ||
        Boolean(ev.achados && ev.achados.length > 0);
      return isConsultationEncounterDoc(ev.id, ev) || hasContent;
    });
    return sortClinicalEvolutionsDesc(validRecords);
  }, [patient.clinicalEvolutions]);

  // Controle de abertura do Acordeon por consulta (inicia fechado por padrão ao abrir a aba)
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const toggleAccordion = (id: string) => {
    setOpenIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await crmDataService.refreshClinicalEvolutions(targetEmail);
    } finally {
      setTimeout(() => setIsRefreshing(false), 350);
    }
  };

  const formatDisplayDate = (dateStr?: string, isoDate?: string): string => {
    const cleaned = (dateStr || '').replace(/^Data:\s*/i, '').trim();
    if (cleaned) {
      if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
        return cleaned.slice(0, 10).split('-').reverse().join('/');
      }
      return cleaned;
    }
    if (isoDate && /^\d{4}-\d{2}-\d{2}/.test(isoDate)) {
      return isoDate.slice(0, 10).split('-').reverse().join('/');
    }
    return '-';
  };

  const resolveEncounterTitle = (rawTitle?: string): string => {
    const t = (rawTitle || '').trim();
    if (!t || t.toLowerCase() === 'evolução clínica' || t.toLowerCase() === 'evolucao clinica') {
      return 'Registro de Consulta';
    }
    return t;
  };

  const renderModernArrowSvg = (symbol: '↔' | '↑' | '↓') => {
    if (symbol === '↑') {
      return (
        <svg
          className="w-[30px] h-[30px] shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 19V5" />
          <path d="m6 11 6-6 6 6" />
        </svg>
      );
    }
    if (symbol === '↓') {
      return (
        <svg
          className="w-[30px] h-[30px] shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5v14" />
          <path d="m18 13-6 6-6-6" />
        </svg>
      );
    }
    return (
      <svg
        className="w-[30px] h-[30px] shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 12h16" />
        <path d="m8 8-4 4 4 4" />
        <path d="m16 8 4 4-4 4" />
      </svg>
    );
  };

  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] w-full pb-4">
      {/* Cabeçalho da Aba Anotações (Exclusiva de Avaliação por Consulta - Sem %) */}
      <div className="flex items-center justify-between gap-2 pt-1 px-0.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="font-serif text-[20px] font-semibold text-[#5eea8f] tracking-tight leading-tight">
            Anotações
          </h1>
          <button
            type="button"
            onClick={() => setIsHeaderInfoOpen(true)}
            aria-label="Informações sobre Anotações"
            title="Sobre Anotações"
            className="w-[31px] h-[31px] rounded-full bg-[#0d1b36] hover:bg-[#162d59] border border-white/35 text-white flex items-center justify-center text-[16px] font-serif italic font-bold transition active:scale-95 cursor-pointer shrink-0 shadow-sm"
          >
            i
          </button>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/15 text-[13px] font-semibold text-[#e8f5f0] transition-all cursor-pointer shrink-0"
        >
          <i className={`ti ti-refresh text-[#5eea8f] text-sm ${isRefreshing ? 'animate-spin' : ''}`}></i>
          <span>Atualizar</span>
        </button>
      </div>

      {/* Lista de Acordeons de Consultas */}
      {evolutions.length === 0 ? (
        <div className="rounded-[18px] border border-[#2dd4bf]/20 bg-gradient-to-br from-[#0a1f1a] to-[#0f2e26] p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          <div className="w-11 h-11 rounded-xl bg-[#2dd4bf]/15 border border-[#2dd4bf]/25 flex items-center justify-center text-[#2dd4bf] mx-auto mb-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="text-[17px] font-semibold text-[#e8f5f0] mb-1">
            Nenhum registro de consulta publicado
          </div>
          <p className="text-[14px] text-[#8b98a6] leading-relaxed max-w-[300px] mx-auto">
            As observações pertinentes e os próximos passos de cada atendimento aparecerão aqui após a sincronização do seu acompanhamento.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {evolutions.map((ev) => {
            const isOpen = !!openIds[ev.id];
            const cleanDate = formatDisplayDate(ev.dateStr, ev.date);
            const recordTitle = resolveEncounterTitle(ev.title);
            const legacySummary = (ev.resumoGeral || '').trim();
            const safeLegacyObs = legacySummary && !/^decl[ií]nio\b/i.test(legacySummary) ? legacySummary : '';
            const observationsText = (ev.pertinentObservations || ev.observacoes || safeLegacyObs).trim();
            const tags: ParsedEncounterTag[] = ev.parsedTags && ev.parsedTags.length > 0
              ? normalizeParsedTags(ev.parsedTags, ev.alertTags || ev.achados)
              : normalizeParsedTags(undefined, ev.alertTags || ev.achados);
            const steps: NumberedStepItem[] = ev.numberedSteps && ev.numberedSteps.length > 0
              ? ev.numberedSteps
              : normalizeNumberedSteps(
                  undefined,
                  (ev.nextSteps && ev.nextSteps.length > 0)
                    ? ev.nextSteps
                    : (ev.predictability && ev.predictability.length > 0
                        ? ev.predictability
                        : (ev.proximosPassos && ev.proximosPassos.length > 0 ? ev.proximosPassos : ev.planoDeAcao))
                );

            return (
              <div
                key={ev.id}
                className="rounded-[18px] overflow-hidden border border-[#2dd4bf]/20 bg-gradient-to-br from-[#0a1f1a] to-[#0f2e26] shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all duration-200"
              >
                {/* Cabeçalho do Acordeon: doc.title (19px) + Data: doc.dateStr (15.5px) */}
                <button
                  type="button"
                  onClick={() => toggleAccordion(ev.id)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-3.5 min-h-[60px] text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#2dd4bf]/15 border border-[#2dd4bf]/25 flex items-center justify-center text-[#2dd4bf] shrink-0">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[19px] font-semibold text-[#e8f5f0] tracking-[-0.3px] leading-snug">
                        {recordTitle}
                      </div>
                      <div className="text-[15.5px] text-[#6fa89a] font-medium mt-0.5">
                        Data: {cleanDate}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center shrink-0">
                    <svg
                      className={`w-6 h-6 text-[#e0e0ed] transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#5eea8f]' : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {/* Conteúdo Expandido: Exclusivamente 2 Blocos Internos */}
                {isOpen && (
                  <div className="px-2 pb-4 pt-3 border-t border-white/[0.06] space-y-8 animate-fadeIn">
                    {/* BLOCO 1 — OBSERVAÇÕES PERTINENTES */}
                    {(observationsText || tags.length > 0) && (
                      <div className="section">
                        <div className="flex items-center gap-2 mb-2 text-[17px]">
                          <div className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center shrink-0 bg-[#fbbf24]/15 text-[#fbbf24]">
                            <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                          </div>
                          <span className="text-[17px] text-[#ffffff] uppercase tracking-[0.8px] font-semibold">
                            Observações Pertinentes
                          </span>
                        </div>

                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-[12px] px-2.5 py-2.5 text-[18px] text-[#e8f5f0] leading-[1.55]">
                          {observationsText && (
                            <div className="text-justify">
                              {observationsText}
                            </div>
                          )}

                          {tags.length > 0 && (
                            <div className={observationsText ? 'mt-3 pt-2.5 border-t border-white/[0.06]' : ''}>
                              <div className="flex flex-wrap gap-2">
                                {tags.map((tag, tIdx) => {
                                  const isGreen = tag.color === 'green' || tag.symbol === '↔';
                                  const displayText = tag.raw && tag.raw.trim().length > 0
                                    ? tag.raw
                                    : `${tag.label} ${tag.symbol} ${tag.status}`.trim();

                                  const arrowMatch = displayText.match(/^(.*?)\s*([↑↓↔])\s*(.*)$/);
                                  const beforeArrow = arrowMatch ? arrowMatch[1].trim() : displayText;
                                  const afterArrow = arrowMatch ? arrowMatch[3].trim() : '';
                                  const arrowSymbol: '↔' | '↑' | '↓' = arrowMatch
                                    ? (arrowMatch[2] as '↔' | '↑' | '↓')
                                    : (tag.symbol || (isGreen ? '↔' : '↑'));

                                  return (
                                    <span
                                      key={`${ev.id}-tag-${tIdx}`}
                                      className={`inline-flex items-center gap-1.5 px-3 py-[3px] rounded-[11px] font-medium border ${
                                        isGreen
                                          ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300'
                                          : 'bg-rose-500/15 border-rose-400/35 text-rose-300'
                                      }`}
                                    >
                                      <span className="inline-flex items-center gap-1.5 text-[17.5px] leading-snug">
                                        {beforeArrow && <span>{beforeArrow}</span>}
                                        {renderModernArrowSvg(arrowSymbol)}
                                        {afterArrow && <span>{afterArrow}</span>}
                                      </span>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* BLOCO 2 — PREVISIBILIDADE / PRÓXIMOS PASSOS */}
                    {steps.length > 0 && (
                      <div className="section">
                        <div className="flex items-center gap-2 mb-2 text-[17px]">
                          <div className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center shrink-0 bg-[#6366f1]/15 text-[#818cf8]">
                            <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                            </svg>
                          </div>
                          <span className="text-[17px] text-[#ffffff] uppercase tracking-[0.8px] font-semibold">
                            Previsibilidade / Próximos Passos
                          </span>
                        </div>

                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-[12px] p-1.5 text-[18px] text-[#e8f5f0] leading-[1.55] flex flex-col gap-1.5">
                          {steps.map((step, sIdx) => (
                            <div
                              key={`${ev.id}-step-${sIdx}`}
                              className="flex items-center gap-2 px-2 py-2 bg-[#6366f1]/[0.06] border border-[#6366f1]/15 rounded-[9px]"
                            >
                              <div className="text-[13px] font-bold text-[#818cf8] bg-[#6366f1]/15 px-[7px] py-[2px] rounded-[6px] shrink-0 tabular-nums">
                                {step.number || String(sIdx + 1).padStart(2, '0')}
                              </div>
                              <div className="flex-1 min-w-0 text-[18px] text-justify text-[#e8f5f0] leading-[1.4]">
                                {step.text}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!observationsText && tags.length === 0 && steps.length === 0 && (
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-[12px] px-2.5 py-2.5 text-[16px] text-[#94a3b8]">
                        Registro de consulta sincronizado sem observações adicionais.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Informativo do cabeçalho "i" */}
      {isHeaderInfoOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsHeaderInfoOpen(false)}
        >
          <div
            className="w-full max-w-[400px] bg-[#0d1b36] border border-white/30 rounded-2xl p-5 shadow-2xl space-y-3 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/15">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-full bg-white/15 border border-white/35 text-white flex items-center justify-center text-[13px] font-serif italic font-bold shrink-0">
                  i
                </span>
                <h4 className="text-[18px] font-bold text-white leading-snug truncate">
                  Anotações
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsHeaderInfoOpen(false)}
                className="text-white/80 hover:text-white p-1 text-xl cursor-pointer shrink-0"
                title="Fechar"
              >
                <i className="ti ti-x"></i>
              </button>
            </div>
            <p className="text-[18px] not-italic font-normal text-white leading-relaxed">
              Registros das consultas realizadas do mais recente para o mais antigo.
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHeaderInfoOpen(false)}
                className="h-[38px] px-5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/30 text-[15px] font-semibold cursor-pointer active:scale-95 transition"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
