import React, { useState, useEffect, useMemo } from 'react';
import { PatientProfile } from '../../types/patient';
import {
  Archive,
  CalendarCheck,
  FileText,
  CheckCircle2,
  FlaskConical,
  ShoppingBag,
  TestTube2,
  Activity,
  HeartPulse,
  Send,
  Clock
} from 'lucide-react';
import { db, isFirebaseConfigured } from '../../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface DashboardTabProps {
  patient: PatientProfile;
  onNavigateTab: (tabId: string) => void;
  onOpenPdf: (title: string) => void;
}

interface TimelineRecord {
  id: string;
  title: string;
  categoryLabel: string;
  dateStr: string;
  timestampMs: number;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  patient,
  onNavigateTab
}) => {
  const [showAll, setShowAll] = useState<boolean>(false);
  const [checkinsCount, setCheckinsCount] = useState<number>(0);
  const [latestCheckinInfo, setLatestCheckinInfo] = useState<{ dateStr: string; timestampMs: number } | null>(null);

  const targetPatientEmail = (patient.email && patient.email.includes('@'))
    ? patient.email.trim().toLowerCase()
    : (patient.id && patient.id.includes('@') ? patient.id.trim().toLowerCase() : 'jcecato@gmail.com');

  // Escuta em tempo real da subcoleção /checkins (conta apenas check-ins realizados, nunca sintomas unitários)
  useEffect(() => {
    if (!isFirebaseConfigured() || !db) return;

    try {
      const colRef = collection(db, 'patients', targetPatientEmail, 'checkins');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          let validCount = 0;
          let latestMs = 0;
          let latestDateStr = '';

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data && data.answers && typeof data.answers === 'object') {
              validCount += 1;
              const rawCreated = typeof data.createdAt === 'string' ? Date.parse(data.createdAt) : 0;
              const rawDateStr = String(data.dateStr || '').trim();
              const ptMatch = rawDateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
              const parsedFromStr = ptMatch
                ? new Date(parseInt(ptMatch[3], 10), parseInt(ptMatch[2], 10) - 1, parseInt(ptMatch[1], 10)).getTime()
                : 0;
              const candidateMs = Math.max(Number.isFinite(rawCreated) ? rawCreated : 0, parsedFromStr);
              if (candidateMs >= latestMs) {
                latestMs = candidateMs;
                latestDateStr = rawDateStr || (candidateMs > 0 ? new Date(candidateMs).toLocaleDateString('pt-BR') : '');
              }
            }
          });

          setCheckinsCount(validCount);
          setLatestCheckinInfo(latestMs > 0 && latestDateStr ? { dateStr: latestDateStr, timestampMs: latestMs } : null);
        },
        (err) => {
          console.info('🔒 [Vittáre Registros] Leitura de check-ins em modo seguro:', err?.code);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('Falha ao ouvir check-ins na aba Meus Registros:', e);
    }
  }, [targetPatientEmail]);

  // Parser de data para string limpa DD/MM/AAAA
  const extractCleanDate = (rawDateStr: string): string => {
    const clean = (rawDateStr || '').replace(/^Data:\s*/i, '').trim();
    if (clean.includes('·')) {
      return clean.split('·')[0].trim();
    }
    return clean || '-';
  };

  // Conversor de data DD/MM/AAAA para timestamp numérico (ordenação decrescente: mais recente para o último)
  const getDateTimestamp = (rawDateStr: string): number => {
    const match = (rawDateStr || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const d = parseInt(match[1], 10);
      const m = parseInt(match[2], 10) - 1;
      const y = parseInt(match[3], 10);
      return new Date(y, m, d).getTime();
    }
    return 0;
  };

  // Consolida registros reais do Firebase de todas as abas/coleções do paciente (sem acordeon e sem botões de abrir abas)
  const timelineRecords = useMemo<TimelineRecord[]>(() => {
    const records: TimelineRecord[] = [];
    const seenKeys = new Set<string>();

    const pushUnique = (id: string, title: string, categoryLabel: string, rawDate: string) => {
      const cleanDate = extractCleanDate(rawDate);
      if (!cleanDate || cleanDate === '-') return;
      const dedupKey = `${title.toLowerCase().trim()}|${cleanDate}`;
      if (seenKeys.has(dedupKey)) return;
      seenKeys.add(dedupKey);
      records.push({
        id,
        title,
        categoryLabel,
        dateStr: cleanDate,
        timestampMs: getDateTimestamp(cleanDate)
      });
    };

    // 1. Evoluções Clínicas / Registros & Ações (/evolutions)
    (patient.clinicalEvolutions || []).forEach((ev, idx) => {
      pushUnique(
        `tl-ev-${ev.id || idx}`,
        ev.title || 'Evolução Clínica',
        'Agenda & Plano de Ação',
        ev.dateStr
      );
    });

    // 2. Avaliações Corporais (/anthropometry)
    (patient.physicalAssessments || []).forEach((pa, idx) => {
      pushUnique(
        `tl-pa-${pa.id || idx}`,
        pa.title || 'Avaliação Corporal',
        'Avaliação Corporal',
        pa.dateStr
      );
    });

    // 3. Exames Laboratoriais (/exams)
    (patient.examBatches || []).forEach((ex, idx) => {
      pushUnique(
        `tl-ex-${ex.id || idx}`,
        ex.title || 'Painel Laboratorial',
        'Meus Exames',
        ex.dateStr
      );
    });

    // 4. Planos Alimentares (/plans)
    (patient.mealGuides || []).forEach((mg, idx) => {
      pushUnique(
        `tl-mg-${mg.id || idx}`,
        mg.title || 'Plano Alimentar',
        'Rotina Alimentar',
        mg.dateStr
      );
    });

    // 5. Fórmulas & Prescrições (/prescriptions)
    (patient.protocols || []).forEach((pr, idx) => {
      pushUnique(
        `tl-pr-${pr.id || idx}`,
        pr.title || pr.formulaName || 'Prescrição Clínica',
        'Fórmulas & Suprimentos',
        pr.emissionDate || pr.expirationStr || ''
      );
    });

    // 6. Encaminhamentos (/referrals)
    (patient.referrals || []).forEach((rf, idx) => {
      pushUnique(
        `tl-rf-${rf.id || idx}`,
        rf.specialty || 'Encaminhamento Multidisciplinar',
        'Encaminhamentos',
        rf.dateStr
      );
    });

    // 7. Atividades registradas diretamente no documento do paciente
    (patient.activities || []).forEach((act, idx) => {
      pushUnique(
        `tl-act-${act.id || idx}`,
        act.title,
        'Registro do Portal',
        act.dateStr
      );
    });

    return records.sort((a, b) => b.timestampMs - a.timestampMs);
  }, [
    patient.clinicalEvolutions,
    patient.physicalAssessments,
    patient.examBatches,
    patient.mealGuides,
    patient.protocols,
    patient.referrals,
    patient.activities
  ]);

  // Cálculo determinístico por categoria (sempre por documento/registro, nunca itens unitários)
  const categoryCounters = useMemo(() => {
    const validConsultationsCount = (patient.consultations || []).filter((c) => {
      const cleanDate = extractCleanDate(c.dateStr || '');
      const statusNorm = (c.status || '').toLowerCase().trim();
      const isCompleted = statusNorm === 'concluída' || statusNorm === 'concluida' || statusNorm === 'realizada';
      const hasValidDate = Boolean(cleanDate && cleanDate !== '-' && /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(cleanDate));
      return isCompleted || hasValidDate;
    }).length;

    const annotationsCount = (patient.clinicalEvolutions || []).length;
    const checkinsTotalCount = checkinsCount;
    const formulasCount = (patient.protocols || []).length;
    const quickAccessCount = (patient.marketplace || []).length;
    const labExamsCount = (patient.examBatches || []).length;
    const bodyAssessmentsCount = (patient.physicalAssessments || []).length;
    const integrativeCount = patient.crmGeneralNotes && patient.crmGeneralNotes.trim().length > 0 ? 1 : 0;
    const multidisciplinaryCount = (patient.referrals || []).length;

    return [
      {
        id: 'consultas',
        label: 'Consultas',
        count: validConsultationsCount,
        targetTab: 'consultas',
        icon: CalendarCheck,
        iconColor: '#5eea8f'
      },
      {
        id: 'anotacoes',
        label: 'Registros & Ações',
        count: annotationsCount,
        targetTab: 'consultas',
        icon: FileText,
        iconColor: '#38bdf8'
      },
      {
        id: 'bem-estar',
        label: 'Check-ins',
        count: checkinsTotalCount,
        targetTab: 'evolucao',
        icon: CheckCircle2,
        iconColor: '#a78bfa'
      },
      {
        id: 'formulas',
        label: 'Minhas Fórmulas',
        count: formulasCount,
        targetTab: 'formulas-suprimentos',
        icon: FlaskConical,
        iconColor: '#fbbf24'
      },
      {
        id: 'acesso-agil',
        label: 'Acesso Ágil',
        count: quickAccessCount,
        targetTab: 'marketplace',
        icon: ShoppingBag,
        iconColor: '#2dd4bf'
      },
      {
        id: 'exames',
        label: 'Exames Laboratoriais',
        count: labExamsCount,
        targetTab: 'exames-guias',
        icon: TestTube2,
        iconColor: '#60a5fa'
      },
      {
        id: 'corporal',
        label: 'Avaliação Corporal',
        count: bodyAssessmentsCount,
        targetTab: 'avaliacao',
        icon: Activity,
        iconColor: '#34d399'
      },
      {
        id: 'integrativa',
        label: 'Avaliação Integrativa',
        count: integrativeCount,
        targetTab: 'integrativa',
        icon: HeartPulse,
        iconColor: '#f472b6'
      },
      {
        id: 'multidisciplinar',
        label: 'Multidisciplinar',
        count: multidisciplinaryCount,
        targetTab: 'multidisciplinar',
        icon: Send,
        iconColor: '#fb923c',
        fullWidth: true
      }
    ];
  }, [
    patient.consultations,
    patient.clinicalEvolutions,
    checkinsCount,
    patient.protocols,
    patient.marketplace,
    patient.examBatches,
    patient.physicalAssessments,
    patient.crmGeneralNotes,
    patient.referrals
  ]);

  const totalRecordsSum = useMemo(
    () => categoryCounters.reduce((acc, item) => acc + item.count, 0),
    [categoryCounters]
  );

  // Último registro cronológico (entre linha do tempo e check-ins)
  const latestRecordFooterText = useMemo(() => {
    const latestTimeline = timelineRecords[0];
    let bestMs = latestTimeline?.timestampMs || 0;
    let bestDateStr = latestTimeline?.dateStr || '';

    if (latestCheckinInfo && latestCheckinInfo.timestampMs >= bestMs) {
      bestMs = latestCheckinInfo.timestampMs;
      bestDateStr = latestCheckinInfo.dateStr;
    }

    if (!bestMs || !bestDateStr) return null;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const recordDate = new Date(bestMs);
    const recordStart = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate()).getTime();
    const diffDays = Math.round((todayStart - recordStart) / 86400000);

    if (diffDays === 0) return `Último registro hoje · ${bestDateStr}`;
    if (diffDays === 1) return `Último registro há 1 dia · ${bestDateStr}`;
    if (diffDays > 1 && diffDays <= 365) return `Último registro há ${diffDays} dias · ${bestDateStr}`;
    return `Último registro · ${bestDateStr}`;
  }, [timelineRecords, latestCheckinInfo]);

  const displayedRecords = showAll ? timelineRecords : timelineRecords.slice(0, 5);

  const scrollToTop = () => {
    const scr = document.getElementById('scr');
    if (scr) {
      scr.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Sincronização inteligente com a Agenda
  const getNextScheduledConsultation = (): string => {
    const sessions = patient.consultations?.filter(c => {
      const st = (c.status || '').toLowerCase().trim();
      return st === 'agendada';
    }) || [];

    if (sessions.length === 0) {
      if (patient.nextConsultationDate && patient.nextConsultationDate !== '-' && patient.nextConsultationDate !== 'Data: -') {
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
      if (!session.dateStr || session.dateStr.trim() === '' || session.dateStr === '-' || session.dateStr === 'Data: -' || session.dateStr.includes('-')) continue;

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
              Mensagem da Equipe Vittáre
            </div>
            <div className="text-[18px] text-white mt-1 leading-snug">
              Olá! Temos novas orientações para o seu plano.
            </div>
          </>
        )}

        <div className={`flex items-center gap-2 text-[18px] text-[#e8e8f0] ${hasPendingUpdates ? 'mt-2.5 pt-2 border-t border-white/[0.08]' : ''}`}>
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5eea8f] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#5eea8f]"></span>
          </span>
          {nextConsultationDisplay !== '-' ? (
            <span className="text-[17px]">Próxima Agenda: <strong className="text-white">{nextConsultationDisplay}</strong></span>
          ) : (
            <span className="text-[17px] text-[#e0e0ed] flex items-center gap-1">
              <span>Próxima Agenda:</span>
              <strong className="text-white font-bold text-[17px] leading-none">-</strong>
            </span>
          )}
        </div>
      </div>

      {/* Card Moderno Consolidado: Seus Registros Totais + 9 Categorias */}
      <div className="bg-[#0e131b] border border-[#1c2432] rounded-3xl p-4 shadow-xl space-y-3.5">
        {/* Cabeçalho com ícone + título + caixa total verde */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#5eea8f]/12 border border-[#5eea8f]/35 flex items-center justify-center text-[#5eea8f] shrink-0">
              <Archive className="w-5 h-5" strokeWidth={2} />
            </div>
            <span className="text-[18px] font-bold text-[#f2f6fc] leading-snug">
              Seus registros totais:
            </span>
          </div>

          <div
            className="min-w-[56px] min-h-[46px] px-3.5 py-1.5 rounded-xl bg-[#5eea8f]/18 border-2 border-[#5eea8f] text-[#5eea8f] shadow-md shadow-[#5eea8f]/15 flex items-center justify-center shrink-0"
            aria-label={`Seus registros totais: ${totalRecordsSum}`}
          >
            <span className="text-[22px] font-extrabold leading-none tabular-nums">
              {totalRecordsSum}
            </span>
          </div>
        </div>

        {/* Lista Horizontal Individual de 9 Categorias (1 por linha, borda branca clara, Icone + N° + Nome em 18px Times New Roman) */}
        <div className="flex flex-col gap-2.5">
          {categoryCounters.map((cat) => {
            const IconComponent = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onNavigateTab(cat.targetTab)}
                className="w-full min-h-[48px] bg-[#131823]/95 border-[1px] border-white/50 hover:border-[#5eea8f] active:scale-[0.99] rounded-2xl px-3.5 py-2.5 shadow-sm transition-all cursor-pointer flex items-center justify-start text-left gap-3"
              >
                <IconComponent
                  className="w-5 h-5 shrink-0"
                  style={{ color: cat.iconColor }}
                  strokeWidth={2}
                />
                <span className="min-w-[28px] text-center text-[20px] font-extrabold text-white leading-none tabular-nums shrink-0">
                  {cat.count}
                </span>
                <span
                  className="text-[#e8eef5] font-medium leading-tight"
                  style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '20px' }}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Rodapé discreto com data do último registro */}
        {latestRecordFooterText && (
          <div className="pt-1 flex items-center gap-1.5 text-[13px] text-[#8b98a6] font-medium">
            <Clock className="w-3.5 h-3.5 text-[#8b98a6] shrink-0" />
            <span>{latestRecordFooterText}</span>
          </div>
        )}
      </div>

      {/* Linha do Tempo Enxuta (Registro cronológico das coleções do Firebase, sem acordeon) */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[20px] font-bold tracking-tight text-[#e8eef5]">
              Linha do tempo
            </h2>
          </div>
        </div>

        {timelineRecords.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/20 rounded-2xl p-5 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#5eea8f]/10 border border-[#5eea8f]/30 flex items-center justify-center text-[#5eea8f] mx-auto mb-2.5">
              <i className="ti ti-heart-handshake text-2xl"></i>
            </div>
            <div className="text-[18px] font-semibold text-white mb-1">
              Bem-vindo ao seu Portal Vittáre
            </div>
            <p className="text-[14px] text-[#a5a4b8] leading-relaxed max-w-[280px] mx-auto">
              Suas orientações diárias, laudos e etapas do tratamento aparecerão nesta linha do tempo após sua primeira consulta.
            </p>
          </div>
        ) : (
          <div className="relative pl-0">
            {/* Conector vertical contínuo */}
            <div
              className="absolute left-[14px] top-[24px] bottom-[28px] w-[2px] bg-gradient-to-b from-white/15 via-white/10 to-transparent pointer-events-none"
              aria-hidden="true"
            />

            <div className="space-y-2.5">
              {displayedRecords.map(rec => (
                <div key={rec.id} className="relative flex items-start gap-3">
                  {/* Nó Circular (30x30px) */}
                  <div className="relative z-10 shrink-0 mt-2">
                    <div className="w-[30px] h-[30px] rounded-full bg-[#2fd575]/15 border border-[#2fd575]/35 flex items-center justify-center text-[#5eeaa0] shadow-[0_0_12px_rgba(47,213,117,0.18)]">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>

                  {/* Card Enxuto de Registro (Somente leitura cronológica, sem acordeon) */}
                  <div className="grow min-w-0 bg-[#121722]/85 border border-white/35 rounded-2xl px-3.5 py-2.5 -ml-[5px] mr-[4px] shadow-sm">
                    <h3
                      className="text-[16.5px] font-normal text-[#eef1f4] leading-snug"
                      style={{ fontWeight: 'normal', borderColor: '#eef1f4' }}
                    >
                      {rec.title}
                    </h3>

                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <span className="text-[14px] text-[#8b98a6] font-medium whitespace-nowrap">
                        Data: {rec.dateStr}
                      </span>
                      <span className="text-[11.5px] font-semibold text-[#5eea8f] bg-[#5eea8f]/10 border border-[#5eea8f]/25 px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                        {rec.categoryLabel}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!showAll && timelineRecords.length > 5 && (
              <div className="pt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/40 text-[15px] font-semibold text-[#5eea8f] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>Ver todos os registros ({timelineRecords.length})</span>
                  <svg className="w-4 h-4 text-[#5eea8f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
            )}

            {showAll && timelineRecords.length > 5 && (
              <div className="pt-4 pb-2 flex justify-center">
                <button
                  type="button"
                  onClick={scrollToTop}
                  className="text-[16px] italic font-semibold text-[#5eea8f] hover:text-[#2fd575] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer py-1.5 px-3"
                >
                  <svg className="w-4 h-4 text-[#5eea8f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                  <span>Voltar Acima</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
