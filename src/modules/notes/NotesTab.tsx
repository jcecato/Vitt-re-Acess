import React, { useState, useMemo } from 'react';
import { PatientProfile, ClinicalEvolutionItem } from '../../types/patient';
import { crmDataService, sortClinicalEvolutionsDesc, normalizeClinicalEvolution } from '../../services/crmDataService';

interface NotesTabProps {
  patient: PatientProfile;
}

const DEFAULT_SAMPLE_EVOLUTION: ClinicalEvolutionItem = {
  id: 'ev-sample-01',
  title: 'Registro',
  dateStr: '12/11/2026',
  resumoGeral:
    'Plano dietoterápico focado na melhora do sistema digestivo, com investigação de achados laboratoriais e ajustes progressivos conforme resposta individual e resultados dos exames.',
  observacoes:
    'Exames disponíveis identificaram alterações que merecem atenção e investigação complementar.',
  achados: ['Vitamina D3 reduzida', 'Homocisteína elevada'],
  planoDeAcao: [
    'Solicitação de novos exames laboratoriais para aprofundar a avaliação',
    'Prescrição individualizada de suplementos conforme resultados (vitamina D3 e demais nutrientes)',
    'Avaliação da inclusão de whey protein para adequação proteica',
    'Ajustes progressivos na dieta conforme resposta individual'
  ],
  proximosPassos: [
    'Novos exames laboratoriais',
    'Análise dos resultados e prescrição',
    'Reavaliação da conduta nutricional'
  ]
};

export const NotesTab: React.FC<NotesTabProps> = ({ patient }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const evolutions = useMemo<ClinicalEvolutionItem[]>(() => {
    const rawList = patient.clinicalEvolutions && patient.clinicalEvolutions.length > 0
      ? patient.clinicalEvolutions
      : (patient.crmGeneralNotes && patient.crmGeneralNotes.trim().length > 0
          ? [
              normalizeClinicalEvolution(
                {
                  id: 'ev-crm-notes',
                  title: 'Registro',
                  dateStr: patient.nextConsultationDate || '12/11/2026',
                  rawText: patient.crmGeneralNotes
                },
                'ev-crm-notes'
              )
            ]
          : [DEFAULT_SAMPLE_EVOLUTION]);

    return sortClinicalEvolutionsDesc(rawList);
  }, [patient.clinicalEvolutions, patient.crmGeneralNotes, patient.nextConsultationDate]);

  // Controle de abertura do Acordeon por data/ID (inicia fechado por padrão ao abrir a aba)
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
      const targetKey = patient.email || patient.id || 'jcecato@gmail.com';
      await crmDataService.refreshClinicalEvolutions(targetKey);
    } finally {
      setTimeout(() => setIsRefreshing(false), 350);
    }
  };

  const formatDisplayDate = (dateStr: string): string => {
    const cleaned = (dateStr || '').replace(/^Data:\s*/i, '').trim();
    return cleaned || '12/11/2026';
  };

  const resolveRecordTitle = (rawTitle?: string): string => {
    const t = (rawTitle || '').trim();
    if (!t || t.toLowerCase() === 'evolução clínica' || t.toLowerCase() === 'evolucao clinica') {
      return 'Registro';
    }
    return t;
  };

  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] w-full pb-4">
      {/* Cabeçalho da Aba Anotações */}
      <div className="flex items-center justify-between gap-2 pt-1 px-0.5">
        <div>
          <h1 className="font-serif text-[20px] font-semibold text-[#5eea8f] tracking-tight leading-tight">
            Anotações
          </h1>
          <p className="text-[13.5px] text-[#8b98a6] mt-0.5">
            Histórico estruturado do mais recente para o mais antigo
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/15 text-[13px] font-semibold text-[#e8f5f0] transition-all cursor-pointer shrink-0"
        >
          <i className={`ti ti-refresh text-[#5eea8f] text-sm ${isRefreshing ? 'animate-spin' : ''}`}></i>
          <span>Atualizar</span>
        </button>
      </div>

      {/* Lista de Acordeons de Registro por Data */}
      <div className="space-y-3">
        {evolutions.map((ev) => {
          const isOpen = !!openIds[ev.id];
          const cleanDate = formatDisplayDate(ev.dateStr);
          const recordTitle = resolveRecordTitle(ev.title);

          return (
            <div
              key={ev.id}
              className="rounded-[18px] overflow-hidden border border-[#2dd4bf]/20 bg-gradient-to-br from-[#0a1f1a] to-[#0f2e26] shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all duration-200"
            >
              {/* Barra do Acordeon: Registro + Data: xx/xx/xxxx */}
              <button
                type="button"
                onClick={() => toggleAccordion(ev.id)}
                className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
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
                    <div className="text-[19px] font-semibold text-[#e8f5f0] tracking-[-0.3px] truncate">
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

              {/* Conteúdo Expandido do Acordeon (4 Seções Visuais Padronizadas) */}
              {isOpen && (
                <div className="px-2 pb-4 pt-3 border-t border-white/[0.06] space-y-8 animate-fadeIn">
                  {/* 1. RESUMO GERAL */}
                  {(ev.resumoGeral || (!ev.observacoes && (!ev.planoDeAcao || ev.planoDeAcao.length === 0))) && (
                    <div className="section">
                      <div className="flex items-center gap-2 mb-2 text-[17px]">
                        <div className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center shrink-0 bg-[#2dd4bf]/15 text-[#2dd4bf]">
                          <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                        </div>
                        <span className="text-[17px] border-[#ffffff] text-[#ffffff] uppercase tracking-[0.8px] font-semibold">
                          Resumo Geral
                        </span>
                      </div>

                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-[12px] px-2.5 py-2.5 text-[18px] text-justify text-[#e8f5f0] leading-[1.55]">
                        {ev.resumoGeral || 'Registro clínico sincronizado.'}
                      </div>
                    </div>
                  )}

                  {/* 2. OBSERVAÇÕES PERTINENTES */}
                  {(ev.observacoes || (ev.achados && ev.achados.length > 0)) && (
                    <div className="section">
                      <div className="flex items-center gap-2 mb-2 text-[17px]">
                        <div className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center shrink-0 bg-[#fbbf24]/15 text-[#fbbf24]">
                          <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        </div>
                        <span className="text-[17px] border-[#ffffff] text-[#ffffff] uppercase tracking-[0.8px] font-semibold">
                          Observações Pertinentes
                        </span>
                      </div>

                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-[12px] px-2.5 py-2.5 text-[18px] text-justify text-[#e8f5f0] leading-[1.55]">
                        {ev.observacoes && <div>{ev.observacoes}</div>}

                        {ev.achados && ev.achados.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {ev.achados.map((finding, fIdx) => (
                              <span
                                key={`${ev.id}-finding-${fIdx}`}
                                className="text-[14px] px-[12px] py-[5px] rounded-[20px] font-medium bg-[#fbbf24]/[0.12] border border-[#fbbf24]/25 text-[#fbbf24]"
                              >
                                {finding}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. PLANO DE AÇÃO */}
                  {ev.planoDeAcao && ev.planoDeAcao.length > 0 && (
                    <div className="section">
                      <div className="flex items-center gap-2 mb-2 text-[17px]">
                        <div className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center shrink-0 bg-[#10b981]/15 text-[#10b981]">
                          <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 11 12 14 22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                          </svg>
                        </div>
                        <span className="text-[17px] border-[#ffffff] text-[#ffffff] uppercase tracking-[0.8px] font-semibold">
                          Plano de Ação
                        </span>
                      </div>

                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-[12px] px-2.5 pt-2.5 pb-[12px] mb-0 text-[18px] text-[#e8f5f0] leading-[1.55]">
                        {ev.planoDeAcao.map((item, pIdx) => {
                          const isFirst = pIdx === 0;
                          const isLast = pIdx === ev.planoDeAcao!.length - 1;
                          return (
                            <div
                              key={`${ev.id}-plan-${pIdx}`}
                              className={`flex items-start gap-2 text-[18px] text-[#e8f5f0] leading-[1.45] ${
                                isFirst ? 'pt-0' : 'pt-2.5'
                              } ${isLast ? 'pb-0 border-b-0' : 'pb-2.5 border-b border-white/[0.05]'}`}
                            >
                              <div className="w-[6px] h-[6px] rounded-full bg-[#10b981] mt-[10px] shrink-0" />
                              <div className="flex-1 min-w-0 text-justify">{item}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 4. PRÓXIMOS PASSOS */}
                  {ev.proximosPassos && ev.proximosPassos.length > 0 && (
                    <div className="section">
                      <div className="flex items-center gap-2 mb-2 text-[17px]">
                        <div className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center shrink-0 bg-[#6366f1]/15 text-[#818cf8]">
                          <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                          </svg>
                        </div>
                        <span className="text-[17px] border-[#ffffff] text-[#ffffff] uppercase tracking-[0.8px] font-semibold">
                          Próximos Passos
                        </span>
                      </div>

                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-[12px] p-1.5 text-[18px] text-[#e8f5f0] leading-[1.55] flex flex-col gap-1.5">
                        {ev.proximosPassos.map((step, sIdx) => (
                          <div
                            key={`${ev.id}-step-${sIdx}`}
                            className="flex items-center gap-2 px-2 py-2 bg-[#6366f1]/[0.06] border border-[#6366f1]/15 rounded-[9px]"
                          >
                            <div className="text-[13px] font-bold text-[#818cf8] bg-[#6366f1]/15 px-[7px] py-[2px] rounded-[6px] shrink-0">
                              {String(sIdx + 1).padStart(2, '0')}
                            </div>
                            <div className="flex-1 min-w-0 text-[18px] text-justify text-[#e8f5f0] leading-[1.4]">
                              {step}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Espaço vertical de 1cm (38px) seguido pelo Resumo dos Registros */}
      {(() => {
        const summaryInfo = patient.clinicalSummaryInfo;
        const summaryText = (summaryInfo?.summary || patient.clinicalSummary || '').trim();
        const rawSummaryDate = (summaryInfo?.dateStr || '').replace(/^Data:\s*/i, '').trim();
        const summaryDate = rawSummaryDate || (summaryText ? formatDisplayDate(evolutions[0]?.dateStr || '') : '-');

        return (
          <div className="!mt-[38px]">
            <div className="rounded-[18px] overflow-hidden border border-[#2dd4bf]/20 bg-gradient-to-br from-[#0a1f1a] to-[#0f2e26] shadow-[0_8px_24px_rgba(0,0,0,0.35)] px-3 py-3.5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#2dd4bf]/15 border border-[#2dd4bf]/25 flex items-center justify-center text-[#2dd4bf] shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>

                <div className="min-w-0">
                  <h2 className="text-[19px] font-semibold text-[#ffffff] tracking-[-0.3px] leading-tight">
                    Resumo dos Registros
                  </h2>
                  <div className="text-[15.5px] text-[#6fa89a] font-medium mt-0.5">
                    Data: {summaryDate}
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-[12px] px-2.5 py-2.5 text-[18px] text-justify text-[#e8f5f0] leading-[1.55]">
                {summaryText ? (
                  summaryText
                ) : (
                  <span className="text-[#8b98a6] text-[16px]">
                    Aguardando a publicação do Resumo Geral pelo acompanhamento clínico.
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
