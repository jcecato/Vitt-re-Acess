import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  PatientProfile,
  ConsultationItem,
  ClinicalEvolutionItem,
  NumberedStepItem
} from '../../types/patient';
import { Calendar, MessageSquareShare, X, FileText, ChevronDown } from 'lucide-react';
import {
  crmDataService,
  isConsultationEncounterDoc,
  normalizeNumberedSteps
} from '../../services/crmDataService';
import {
  subscribeTtsState,
  toggleTtsPlayback,
  stopTtsPlayback,
  type TtsStateSnapshot
} from '../../services/ttsService';

interface ConsultationsTabProps {
  patient: PatientProfile;
  onOpenReschedule: () => void;
}

function ensurePeriod(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

function sanitizeNarrativeSentence(raw: string): string {
  return raw
    .replace(/[↑↓↔•]/g, ' ')
    .replace(/\b\d{1,2}\s*[·.\-]\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBrDate(raw?: string): string {
  if (!raw) return '';
  const brMatch = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (brMatch) {
    const d = brMatch[1].padStart(2, '0');
    const m = brMatch[2].padStart(2, '0');
    const y = brMatch[3].length === 2 ? `20${brMatch[3]}` : brMatch[3];
    return `${d}/${m}/${y}`;
  }
  const isoMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  return '';
}

function parseDateTimestamp(raw?: string): number {
  const br = extractBrDate(raw);
  if (!br) return 0;
  const [d, m, y] = br.split('/').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d).getTime() || 0;
}

export const ConsultationsTab: React.FC<ConsultationsTabProps> = ({
  patient
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedSessionTitle, setSelectedSessionTitle] = useState<string>('');
  const [openRecordsIds, setOpenRecordsIds] = useState<Record<string, boolean>>({});
  const [activePulseIndex, setActivePulseIndex] = useState<number>(0);
  const sessionCardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [ttsState, setTtsState] = useState<TtsStateSnapshot>({
    activeBlockId: null,
    status: 'idle'
  });

  const targetEmail =
    patient.email && patient.email.includes('@')
      ? patient.email.trim().toLowerCase()
      : patient.id && patient.id.includes('@')
      ? patient.id.trim().toLowerCase()
      : 'jcecato@gmail.com';

  useEffect(() => {
    crmDataService.refreshClinicalEvolutions(targetEmail);
  }, [targetEmail]);

  useEffect(() => {
    const unsubscribe = subscribeTtsState(setTtsState);
    return () => {
      unsubscribe();
      stopTtsPlayback();
    };
  }, []);

  const handleOpenRemarcarModal = (sessionTitle: string) => {
    setSelectedSessionTitle(sessionTitle);
    setIsModalOpen(true);
  };

  const handleConfirmWhatsApp = () => {
    const phoneNumber = '5527997918100';
    const message = encodeURIComponent(`Preciso remarcar, ${selectedSessionTitle}`);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank', 'noopener,noreferrer');
    setIsModalOpen(false);
  };

  const toggleRecordsAccordion = (sessionKey: string) => {
    setOpenRecordsIds((prev) => {
      const nextOpen = !prev[sessionKey];
      if (!nextOpen && ttsState.activeBlockId?.startsWith(`${sessionKey}::`)) {
        stopTtsPlayback();
      }
      return {
        ...prev,
        [sessionKey]: nextOpen
      };
    });
  };

  // Lista válida de evoluções clínicas ordenadas cronologicamente (1ª sessão primeiro)
  const validEvolutionsAsc = useMemo<ClinicalEvolutionItem[]>(() => {
    const rawList = Array.isArray(patient.clinicalEvolutions) ? patient.clinicalEvolutions : [];
    const filtered = rawList.filter((ev) => {
      if (!ev || ev.id === 'resumo_geral') return false;
      const legacySummary = (ev.resumoGeral || '').trim();
      const nonDeclinioSummary =
        legacySummary && !/^decl[ií]nio\b/i.test(legacySummary) ? legacySummary : '';
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

    return [...filtered].sort((a, b) => {
      const tsA = parseDateTimestamp(a.dateStr || a.date);
      const tsB = parseDateTimestamp(b.dateStr || b.date);
      return tsA - tsB;
    });
  }, [patient.clinicalEvolutions]);

  // Sessões base do CRM (quantas existirem; padrão mínimo de 3 caso vazio)
  const baseSessions: ConsultationItem[] = useMemo(() => {
    if (patient.consultations && patient.consultations.length > 0) {
      return patient.consultations;
    }
    return [
      { id: 'cons-1', title: '1° SESSÃO', dateStr: 'Data: -', status: 'Agendada' },
      { id: 'cons-2', title: '2° SESSÃO', dateStr: 'Data: -', status: 'Agendada' },
      { id: 'cons-3', title: '3° SESSÃO', dateStr: 'Data: -', status: 'Agendada' }
    ];
  }, [patient.consultations]);

  const isSessionPast = (sessao: ConsultationItem): boolean => {
    const normalized = (sessao.status || '').toLowerCase();
    if (normalized === 'concluída' || normalized === 'concluida' || normalized === 'realizada') {
      return true;
    }
    if (sessao.dateStr && sessao.dateStr !== 'Data: -' && !sessao.dateStr.includes('-')) {
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

  // Pareamento determinístico entre cada Sessão da Agenda e seu Registro Clínico correspondente
  const sessionsWithEvolutions = useMemo(() => {
    const usedEvolutionIds = new Set<string>();

    const paired = baseSessions.map((sessao, index) => {
      const sessionDateBr = extractBrDate(sessao.dateStr);
      const ordinalNum = index + 1;

      let matched: ClinicalEvolutionItem | undefined = validEvolutionsAsc.find(
        (ev) => !usedEvolutionIds.has(ev.id) && (ev.encounterId === sessao.id || ev.id === sessao.id)
      );

      if (!matched && sessionDateBr) {
        matched = validEvolutionsAsc.find(
          (ev) => !usedEvolutionIds.has(ev.id) && extractBrDate(ev.dateStr || ev.date) === sessionDateBr
        );
      }

      if (!matched) {
        matched = validEvolutionsAsc.find((ev) => {
          if (usedEvolutionIds.has(ev.id)) return false;
          const titleNumMatch = (ev.title || '').match(/\b(\d+)[ª°]?\s*(consulta|sess[aã]o)/i);
          return titleNumMatch ? parseInt(titleNumMatch[1], 10) === ordinalNum : false;
        });
      }

      if (!matched && (isSessionPast(sessao) || sessionDateBr)) {
        matched = validEvolutionsAsc.find((ev) => !usedEvolutionIds.has(ev.id));
      }

      if (matched) {
        usedEvolutionIds.add(matched.id);
      }

      return {
        sessao,
        index,
        evolution: matched
      };
    });

    // Inclui eventuais sessões clínicas extras registradas além das slots padrões
    const extras = validEvolutionsAsc
      .filter((ev) => !usedEvolutionIds.has(ev.id))
      .map((ev, extraIdx) => {
        const seq = paired.length + extraIdx + 1;
        const fallbackDate = extractBrDate(ev.dateStr || ev.date) || '-';
        const extraSessao: ConsultationItem = {
          id: ev.id || `extra-sessao-${seq}`,
          title: `${seq}° SESSÃO`,
          dateStr: fallbackDate,
          status: 'Concluída'
        };
        return {
          sessao: extraSessao,
          index: paired.length + extraIdx,
          evolution: ev
        };
      });

    return [...paired, ...extras];
  }, [baseSessions, validEvolutionsAsc]);

  // Rastreia a rolagem do container #scr para mover o pulso médio do botão Registros & Ações
  // iniciando na 1ª sessão e passando para a próxima sessão conforme o paciente desce a página
  useEffect(() => {
    const scroller = document.getElementById('scr');
    const updateActivePulseByScroll = () => {
      const cards = sessionCardRefs.current;
      if (!cards || cards.length === 0) return;

      if (!scroller || scroller.scrollTop <= 28) {
        setActivePulseIndex(0);
        return;
      }

      const scrollerRect = scroller.getBoundingClientRect();
      const focusLineY = scrollerRect.top + scrollerRect.height * 0.42;

      let closestIdx = 0;
      let minDistance = Number.POSITIVE_INFINITY;

      cards.forEach((card, idx) => {
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const cardCenterY = rect.top + Math.min(rect.height * 0.5, 130);
        const dist = Math.abs(cardCenterY - focusLineY);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = idx;
        }
      });

      setActivePulseIndex(closestIdx);
    };

    updateActivePulseByScroll();
    if (scroller) {
      scroller.addEventListener('scroll', updateActivePulseByScroll, { passive: true });
    }
    window.addEventListener('resize', updateActivePulseByScroll);

    return () => {
      if (scroller) {
        scroller.removeEventListener('scroll', updateActivePulseByScroll);
      }
      window.removeEventListener('resize', updateActivePulseByScroll);
    };
  }, [sessionsWithEvolutions.length]);

  const buildBlockOneProse = (
    ev: ClinicalEvolutionItem | undefined,
    sessao: ConsultationItem
  ): string => {
    const legacySummary = (ev?.resumoGeral || '').trim();
    const safeLegacy =
      legacySummary && !/^decl[ií]nio\b/i.test(legacySummary) ? legacySummary : '';
    const clinicalObservation = sanitizeNarrativeSentence(
      ev?.pertinentObservations || ev?.observacoes || safeLegacy || sessao.audioNotes || ''
    );
    const contextWhy = sanitizeNarrativeSentence(ev?.whyItMatters || '');

    const hasPhysical =
      (patient.physicalAssessments || []).length > 0 || Boolean(patient.progress?.currentWeight);
    const hasExams =
      (patient.examBatches || []).length > 0 || (patient.examResults || []).length > 0;

    const parts: string[] = [];

    if (clinicalObservation) {
      parts.push(ensurePeriod(clinicalObservation));
    }

    if (contextWhy && contextWhy !== clinicalObservation) {
      parts.push(ensurePeriod(contextWhy));
    }

    const evaluationSources: string[] = [];
    if (hasPhysical) {
      evaluationSources.push('a leitura da composição corporal e das medidas antropométricas');
    }
    if (hasExams) {
      evaluationSources.push('a interpretação integrada dos exames laboratoriais atualizados');
    }

    if (evaluationSources.length > 0) {
      parts.push(
        `Nesta sessão, correlacionamos suas percepções clínicas do dia a dia com ${evaluationSources.join(
          ' e '
        )}, observando o comportamento metabólico, a resposta digestiva, o equilíbrio energético e a capacidade de recuperação muscular ao longo deste ciclo.`
      );
    } else if (parts.length === 0) {
      parts.push(
        'Nesta sessão, reunimos suas observações clínicas de rotina junto ao acompanhamento físico corporal e aos exames laboratoriais do prontuário, compreendendo como o organismo vem respondendo em disposição, digestão, composição corporal e qualidade do sono.'
      );
    }

    return parts.join(' ');
  };

  const buildActionPlanSteps = (ev: ClinicalEvolutionItem | undefined): NumberedStepItem[] => {
    const rawSteps: NumberedStepItem[] =
      ev?.numberedSteps && ev.numberedSteps.length > 0
        ? ev.numberedSteps
        : normalizeNumberedSteps(
            undefined,
            ev?.nextSteps && ev.nextSteps.length > 0
              ? ev.nextSteps
              : ev?.predictability && ev.predictability.length > 0
              ? ev.predictability
              : ev?.proximosPassos && ev.proximosPassos.length > 0
              ? ev.proximosPassos
              : ev?.planoDeAcao
          );

    const cleanedSteps = rawSteps
      .map((st, idx) => ({
        number: String(idx + 1).padStart(2, '0'),
        text: ensurePeriod(sanitizeNarrativeSentence(st.text))
      }))
      .filter((st) => Boolean(st.text));

    if (cleanedSteps.length > 0) {
      return cleanedSteps;
    }

    const fallbackList: string[] = [
      'Manter a organização dos horários alimentares e hidratação diária conforme o Guia Alimentar.'
    ];

    if ((patient.protocols || []).length > 0) {
      fallbackList.push(
        'Iniciar e manter o uso diário das fórmulas individualizadas descritas em Minhas Fórmulas.'
      );
    }
    if ((patient.marketplace || []).length > 0) {
      fallbackList.push(
        'Incluir os suplementos de suporte diário selecionados na curadoria do Acesso Ágil.'
      );
    }
    if ((patient.examBatches || []).length > 0) {
      fallbackList.push(
        'Realizar a coleta dos exames laboratoriais programados em Meus Exames para controle evolutivo.'
      );
    }
    if ((patient.referrals || []).length > 0) {
      fallbackList.push(
        'Seguir os encaminhamentos e orientações integradas disponíveis na aba Multidisciplinar.'
      );
    }

    return fallbackList.map((text, idx) => ({
      number: String(idx + 1).padStart(2, '0'),
      text
    }));
  };

  const buildBlockTwoSpokenText = (actionSteps: NumberedStepItem[]): string => {
    const spokenItems = actionSteps
      .map((st, idx) => `Ação ${idx + 1}: ${st.text}`)
      .join(' ');
    return `Previsibilidade à sua rotina e próximas ações do plano. ${spokenItems}`;
  };

  const renderAudioControl = (blockKey: string, textToRead: string, accent: 'amber' | 'green') => {
    const isThisBlock = ttsState.activeBlockId === blockKey;
    const isLoading = isThisBlock && ttsState.status === 'loading';
    const isPlaying = isThisBlock && ttsState.status === 'playing';

    const toneClasses =
      accent === 'amber'
        ? isPlaying || isLoading
          ? 'bg-[#fbbf24]/20 border-[#fbbf24] text-[#fbbf24]'
          : 'bg-[#fbbf24]/10 hover:bg-[#fbbf24]/20 border-[#fbbf24]/45 text-[#fbbf24]'
        : isPlaying || isLoading
        ? 'bg-[#5eea8f]/20 border-[#5eea8f] text-[#5eea8f]'
        : 'bg-[#5eea8f]/10 hover:bg-[#5eea8f]/20 border-[#5eea8f]/45 text-[#5eea8f]';

    return (
      <button
        type="button"
        onClick={() => void toggleTtsPlayback(blockKey, textToRead)}
        aria-label={isPlaying ? 'Parar leitura por voz' : 'Clique e ouça o conteúdo a seguir'}
        className={`w-full inline-flex items-center justify-center gap-2.5 px-3.5 py-2.5 min-h-[44px] rounded-xl border text-[16px] font-normal transition-all active:scale-95 cursor-pointer ${toneClasses}`}
      >
        {isLoading ? (
          <>
            <svg className="w-5 h-5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
              />
            </svg>
            <span className="text-[16px] font-normal">Preparando voz...</span>
          </>
        ) : isPlaying ? (
          <>
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            <span className="text-[16px] font-normal">Parar leitura</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 anim-pulse-medium shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
            <span className="text-[16px] font-normal">Clique e ouça o conteúdo a seguir</span>
          </>
        )}
      </button>
    );
  };

  const renderStatusBadge = (status: string, cleanDate: string) => {
    if (cleanDate === '-' || cleanDate.trim() === '') {
      return (
        <span className="text-[14px] font-semibold text-[#a5a4b8] px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/20 shrink-0 uppercase tracking-wider">
          Aguardando
        </span>
      );
    }

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

    return (
      <span className="text-[14px] font-semibold text-white px-2.5 py-0.5 rounded-lg bg-[#5b4bd6] shrink-0 uppercase tracking-wider">
        Agendada
      </span>
    );
  };

  return (
    <div className="space-y-4 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full pb-6">
      {/* Título da Aba Agenda & Plano de Ação */}
      <div className="mb-3">
        <div
          className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight"
          style={{ fontFamily: '"Cormorant Garamond", serif' }}
        >
          Agenda &amp; Plano de Ação
        </div>
      </div>

      {/* Lista Dinâmica de Sessões com o dobro de espaçamento entre blocos (space-y-8) */}
      <div className="space-y-8">
        {sessionsWithEvolutions.map(({ sessao, index, evolution }) => {
          const sessionKey = sessao.id || `sessao-${index}`;
          const displayTitle = sessao.title
            ? sessao.title.toUpperCase().replace('ª', '°')
            : `${index + 1}° SESSÃO`;

          const cleanDateRaw = sessao.dateStr ? sessao.dateStr.replace(/^Data:\s*/i, '').trim() : '-';
          const cleanDate =
            cleanDateRaw !== '-' && /\d{1,2}:\d{2}/.test(cleanDateRaw) && !/\bhrs\.?$/i.test(cleanDateRaw)
              ? `${cleanDateRaw} hrs`
              : cleanDateRaw;
          const isPast = isSessionPast(sessao);
          const isRecordsOpen = !!openRecordsIds[sessionKey];
          const isPulseActive = activePulseIndex === index && !isRecordsOpen;

          const hasClinicalRecord = Boolean(
            evolution || (sessao.audioNotes && sessao.audioNotes.trim().length > 0) || isPast
          );

          const blockOneText = buildBlockOneProse(evolution, sessao);
          const actionSteps = buildActionPlanSteps(evolution);
          const blockTwoText = buildBlockTwoSpokenText(actionSteps);
          const blockOneId = `${sessionKey}::context`;
          const blockTwoId = `${sessionKey}::predictability`;

          return (
            <div
              key={sessionKey}
              ref={(el) => {
                sessionCardRefs.current[index] = el;
              }}
              className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl px-2 py-3.5 shadow-sm transition hover:border-white/70"
            >
              {/* Linha 1: Título da Sessão + Único Status */}
              <div className="flex items-center justify-between gap-2.5 px-1.5">
                <div className="text-[18px] font-semibold text-white leading-tight uppercase">
                  {displayTitle}
                </div>
                {renderStatusBadge(sessao.status, cleanDateRaw)}
              </div>

              {/* Linha 2: Ícone + Data e Horário (com espaçamento entre letras ampliado) */}
              <div className="text-[17px] text-[#e0e0ed] mt-1.5 px-1.5 leading-snug flex items-center gap-2">
                <Calendar
                  className="w-5 h-5 text-[#7c6af7] shrink-0"
                  style={{ marginLeft: '-10px' }}
                />
                <span
                  className="tracking-[0.04em]"
                  style={{
                    fontSize: '17px',
                    paddingLeft: '0px',
                    paddingTop: '0px',
                    marginLeft: '-6px',
                    letterSpacing: '0.04em'
                  }}
                >
                  Data: {cleanDate}
                </span>
              </div>

              {/* Linha 3: Remarcar / Solicitar Agendamento */}
              <div className="flex flex-wrap items-center gap-2 mt-3 px-1.5">
                {cleanDate === '-' ? (
                  <button
                    type="button"
                    onClick={() => {
                      const phoneNumber = '5527997918100';
                      const message = encodeURIComponent(`Olá, gostaria de agendar minha ${displayTitle}`);
                      window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank', 'noopener,noreferrer');
                    }}
                    title="Solicitar Agendamento"
                    className="h-[34px] min-h-[34px] max-h-[34px] inline-flex items-center gap-2 text-[15px] font-medium py-0 px-3.5 rounded-xl bg-white/[0.08] border border-white/20 hover:bg-[#25D366]/20 hover:border-[#25D366] text-white hover:text-[#5eea8f] active:scale-95 transition cursor-pointer"
                  >
                    <MessageSquareShare className="w-4 h-4 text-[#5eea8f]" />
                    <span>Solicitar Agendamento</span>
                  </button>
                ) : isPast ? (
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

              {/* Espaçamento ("pula uma linha") + Acordeon Registros & Ações */}
              <div className="mt-4 pt-3.5 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => toggleRecordsAccordion(sessionKey)}
                  aria-expanded={isRecordsOpen}
                  className={`w-full min-h-[54px] px-3.5 py-2.5 rounded-xl bg-[#121724] hover:bg-[#171d2d] border flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
                    isPulseActive
                      ? 'border-[#5eea8f]/50 shadow-[0_0_8px_rgba(94,234,143,0.08)] anim-pulse-medium'
                      : 'border-white/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-5 h-5 text-[#5eea8f] shrink-0" />
                    <span
                      className="font-['Cormorant_Garamond',serif] font-normal text-[21px] text-white leading-snug"
                      style={{
                        fontFamily: '"Cormorant Garamond", serif',
                        fontWeight: 'normal',
                        fontSize: '21px'
                      }}
                    >
                      Registros &amp; Ações
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-9 h-9 text-white shrink-0 transition-transform duration-200 ${
                      isRecordsOpen ? 'rotate-180 text-[#5eea8f]' : 'text-[#5eea8f]'
                    }`}
                    strokeWidth={2.4}
                  />
                </button>

                {isRecordsOpen && (
                  <div className="mt-4 space-y-6 animate-fadeIn">
                    {hasClinicalRecord ? (
                      <>
                        {/* BLOCO 1: AVALIAÇÕES E CONTEXTOS (18px) */}
                        <section className="w-full rounded-2xl bg-[#121724] border border-white/30 px-3 py-3.5 space-y-3 shadow-sm">
                          <div className="space-y-2.5 pb-2.5 border-b border-white/15">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24] shadow-[0_0_8px_rgba(251,191,36,0.6)] shrink-0" />
                              <h2
                                className="text-[18px] font-bold tracking-normal text-[#fbbf24] leading-snug"
                                style={{ fontSize: '18px', borderColor: '#fef3ed' }}
                              >
                                Avaliações e Contextos
                              </h2>
                            </div>
                            {renderAudioControl(blockOneId, blockOneText, 'amber')}
                          </div>

                          <p className="text-[18px] text-justify text-[#ffffff] font-normal leading-[1.68] select-text">
                            {blockOneText}
                          </p>
                        </section>

                        {/* BLOCO 2: PREVISIBILIDADE À SUA ROTINA (PLANO DE AÇÃO ENUMERADO) */}
                        <section className="w-full rounded-2xl bg-[#121724] border border-white/30 px-3 py-3.5 space-y-3 shadow-sm">
                          <div className="space-y-2.5 pb-2.5 border-b border-white/15">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#5eea8f] shadow-[0_0_8px_rgba(94,234,143,0.6)] shrink-0" />
                              <h2
                                className="text-[18px] font-bold tracking-normal text-[#5eea8f] leading-snug"
                                style={{ fontSize: '18px' }}
                              >
                                Previsibilidade à sua Rotina
                              </h2>
                            </div>
                            {renderAudioControl(blockTwoId, blockTwoText, 'green')}
                          </div>

                          <div className="space-y-2.5 pt-0.5 select-text">
                            {actionSteps.map((step, sIdx) => (
                              <div
                                key={`${sessionKey}-step-${sIdx}`}
                                className="rounded-xl bg-white/[0.03] border border-white/15 px-3 py-2.5"
                              >
                                <p className="text-[18px] text-justify text-[#ffffff] font-normal leading-[1.6]">
                                  <span className="inline-block align-baseline mr-2 px-2 py-0.5 rounded-lg bg-[#5eea8f]/15 border border-[#5eea8f]/40 text-[16px] font-bold text-[#5eea8f] tabular-nums leading-tight">
                                    {step.number}
                                  </span>
                                  {step.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        </section>
                      </>
                    ) : (
                      <div className="rounded-2xl bg-[#121724] border border-white/25 p-4 text-[17px] text-[#cfd3dc] leading-relaxed">
                        Os registros clínicos e a previsibilidade desta sessão ficarão disponíveis aqui após a realização da consulta.
                      </div>
                    )}

                    {/* Botão Fechar ao final do acordeon aberto */}
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => toggleRecordsAccordion(sessionKey)}
                        className="w-full min-h-[46px] px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/25 text-[16px] font-semibold text-white inline-flex items-center justify-center gap-2 active:scale-[0.99] transition cursor-pointer"
                      >
                        <ChevronDown className="w-8 h-8 rotate-180 text-[#5eea8f]" strokeWidth={2.4} />
                        <span>Fechar</span>
                      </button>
                    </div>
                  </div>
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
