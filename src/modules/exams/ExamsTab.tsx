import React, { useEffect, useMemo, useState } from 'react';
import { PatientProfile, ExamBatch, ExamResult, BiomarkerComparison } from '../../types/patient';
import { ExamRequestPdfModal } from '../../components/common/ExamRequestPdfModal';
import { X } from 'lucide-react';

interface ExamsTabProps {
  patient: PatientProfile;
  onOpenPdf: (title: string) => void;
}

const PREP_GUIDELINES = [
  {
    id: 'jejum',
    title: 'Jejum',
    badge: '12 horas',
    icon: 'ti ti-clock'
  },
  {
    id: 'hidratacao',
    title: 'Super Hidratação',
    badge: '24 horas',
    icon: 'ti ti-droplet-half-2'
  },
  {
    id: 'vitaminas',
    title: 'Vitaminas',
    badge: '72 horas',
    icon: 'ti ti-pill-off'
  },
  {
    id: 'alcool',
    title: 'Álcool Suspenso',
    badge: '48 horas',
    icon: 'ti ti-ban'
  },
  {
    id: 'atividade',
    title: 'Atividade Física Suspensa',
    badge: '48 horas',
    icon: 'ti ti-walk'
  }
];

// Fallback temporário apenas quando o lote do Firebase ainda não recebeu valores numéricos oficiais
const TEMP_BIOMARKER_PREVIEW_DEFAULTS: Record<
  string,
  { value: string; reference: string; status: 'ok' | 'alto' | 'baixo' | 'atenção' }
> = {
  hemograma: { value: '14,2 g/dL', reference: '13,5 a 17,5 g/dL', status: 'ok' },
  ferritina: { value: '24 ng/mL', reference: '30 a 300 ng/mL', status: 'baixo' },
  'índice de saturação': { value: '28%', reference: '20% a 50%', status: 'ok' },
  leucócitos: { value: '6.400 /mm³', reference: '4.000 a 11.000 /mm³', status: 'ok' },
  hemoglobina: { value: '14,2 g/dL', reference: '13,5 a 17,5 g/dL', status: 'ok' },
  vcm: { value: '89 fL', reference: '80 a 100 fL', status: 'ok' },
  chcm: { value: '33,8 g/dL', reference: '32 a 36 g/dL', status: 'ok' },
  plaquetas: { value: '235.000 /mm³', reference: '150.000 a 450.000 /mm³', status: 'ok' },
  rnl: { value: '1,9', reference: '0,8 a 2,5', status: 'ok' },
  plr: { value: '118', reference: '80 a 180', status: 'ok' },
  eosinófilos: { value: '6%', reference: '1% a 5%', status: 'alto' },
  ferro: { value: '92 µg/dL', reference: '65 a 175 µg/dL', status: 'ok' },
  transferrina: { value: '258 mg/dL', reference: '200 a 360 mg/dL', status: 'ok' },
  capacidade: { value: '310 µg/dL', reference: '250 a 425 µg/dL', status: 'ok' },
  eritrócitos: { value: '4,9 milhões/mm³', reference: '4,5 a 5,9 milhões/mm³', status: 'ok' },
  hematócrito: { value: '42,5%', reference: '40% a 52%', status: 'ok' },
  hcm: { value: '29,5 pg', reference: '27 a 33 pg', status: 'ok' },
  rdw: { value: '12,8%', reference: '11,5% a 14,5%', status: 'ok' },
  diferencial: { value: 'Equilibrado', reference: 'Padrão fisiológico', status: 'ok' },
  mlr: { value: '0,22', reference: '0,10 a 0,35', status: 'ok' },
  siri: { value: '1,12', reference: '0,40 a 1,50', status: 'ok' }
};

function buildTemporaryPreviewResult(item: ExamResult, index: number): ExamResult {
  const lower = (item.name || '').toLowerCase();
  const matchedKey = Object.keys(TEMP_BIOMARKER_PREVIEW_DEFAULTS).find((k) => lower.includes(k));
  const preset = matchedKey
    ? TEMP_BIOMARKER_PREVIEW_DEFAULTS[matchedKey]
    : {
        value: index % 5 === 2 ? 'Atenção' : 'Dentro da faixa',
        reference: 'Referência laboratorial',
        status: (index % 5 === 2 ? 'alto' : 'ok') as 'ok' | 'alto'
      };

  return {
    ...item,
    value: preset.value,
    reference: preset.reference,
    status: preset.status
  };
}

function getStatusMeta(status: ExamResult['status']) {
  if (status === 'ok') {
    return {
      label: 'Normal',
      pillClass: 'text-[#5eea8f] bg-[#5eea8f]/12 border-[#5eea8f]/35',
      borderClass: 'border-white/35',
      kind: 'ok' as const
    };
  }
  if (status === 'alto') {
    return {
      label: 'Alto',
      pillClass: 'text-[#ff7878] bg-[#ff5f5f]/15 border-[#ff5f5f]/40',
      borderClass: 'border-[#ff5f5f]/45',
      kind: 'up' as const
    };
  }
  if (status === 'baixo') {
    return {
      label: 'Baixo',
      pillClass: 'text-[#ff7878] bg-[#ff5f5f]/15 border-[#ff5f5f]/40',
      borderClass: 'border-[#ff5f5f]/45',
      kind: 'down' as const
    };
  }
  return {
    label: 'Atenção',
    pillClass: 'text-[#ffb84d] bg-[#f5a623]/15 border-[#f5a623]/40',
    borderClass: 'border-[#f5a623]/45',
    kind: 'alert' as const
  };
}

const ModernStatusArrow: React.FC<{ kind: 'ok' | 'up' | 'down' | 'alert'; size?: number }> = ({
  kind,
  size = 24
}) => {
  if (kind === 'ok') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 12H19M19 12L15 8M19 12L15 16M5 12L9 8M5 12L9 16"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'up') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 19V5M12 5L6.5 10.5M12 5L17.5 10.5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'down') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 5V19M12 19L6.5 13.5M12 19L17.5 13.5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 8V13M12 16.5H12.01"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
};

export const ExamsTab: React.FC<ExamsTabProps> = ({ patient }) => {
  const isExpired = (patient.daysToComplete ?? 0) <= 0;
  const [selectedBatchForPdf, setSelectedBatchForPdf] = useState<ExamBatch | null>(null);
  const [selectedBatchForView, setSelectedBatchForView] = useState<ExamBatch | null>(null);
  const [isPrepExpanded, setIsPrepExpanded] = useState<boolean>(false);

  // Fecha automaticamente o acordeão de Preparo & Coleta após 15s aberto para manter Solicitações visíveis
  useEffect(() => {
    if (!isPrepExpanded) return;
    const timer = window.setTimeout(() => {
      setIsPrepExpanded(false);
    }, 15000);
    return () => window.clearTimeout(timer);
  }, [isPrepExpanded]);

  const batches: ExamBatch[] = useMemo(
    () => (Array.isArray(patient.examBatches) ? patient.examBatches : []),
    [patient.examBatches]
  );

  const comparisons: BiomarkerComparison[] = useMemo(
    () =>
      (patient.biomarkerComparisons || []).filter(
        (item) => Array.isArray(item.points) && item.points.length > 1
      ),
    [patient.biomarkerComparisons]
  );

  // Consolida resultados que já possuem valor ou marcações do lote para a Visão Geral dos Resultados
  const allModalSummaryStats = useMemo(() => {
    const rawItems: ExamResult[] = [];
    batches.forEach((b) => {
      (b.results || []).forEach((r) => rawItems.push(r));
    });
    (patient.examResults || []).forEach((r) => rawItems.push(r));

    const itemsWithRealValues = rawItems.filter(
      (r) => r.value !== undefined && r.value !== null && String(r.value).trim() !== ''
    );
    const activeSet = itemsWithRealValues.length > 0 ? itemsWithRealValues : rawItems;
    const total = activeSet.length;
    const okCount = activeSet.filter((r) => r.status === 'ok').length;

    return {
      total,
      okCount,
      attentionCount: Math.max(0, total - okCount),
      hasRealValues: itemsWithRealValues.length > 0
    };
  }, [batches, patient.examResults]);

  // Dados exibidos dentro do modal Visualizar (oficiais do Firebase quando existirem; temporários se vierem vazios)
  const modalBatchData = useMemo(() => {
    if (!selectedBatchForView) return null;

    const rawList = Array.isArray(selectedBatchForView.results) ? selectedBatchForView.results : [];
    const hasOfficialValues = rawList.some(
      (r) => r.value !== undefined && r.value !== null && String(r.value).trim() !== ''
    );

    const items: ExamResult[] = hasOfficialValues
      ? rawList
      : (rawList.length > 0
          ? rawList.map((item, idx) => buildTemporaryPreviewResult(item, idx))
          : [
              { id: 'tmp-1', name: 'Hemograma Completo', value: '14,2 g/dL', reference: '13,5 a 17,5 g/dL', status: 'ok' },
              { id: 'tmp-2', name: 'Ferritina', value: '24 ng/mL', reference: '30 a 300 ng/mL', status: 'baixo' },
              { id: 'tmp-3', name: 'Glicemia em Jejum', value: '91 mg/dL', reference: '70 a 99 mg/dL', status: 'ok' },
              { id: 'tmp-4', name: 'Eosinófilos', value: '6%', reference: '1% a 5%', status: 'alto' }
            ]);

    return {
      batch: selectedBatchForView,
      hasOfficialValues,
      items
    };
  }, [selectedBatchForView]);

  return (
    <div className="space-y-4 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      {/* Seção 1: Lista Clássica de Exames Solicitados / Lotes (Nome + Data + PDF + Visualizar) */}
      <div>
        <div className="mb-3">
          <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
            Exames Laboratoriais | Hemo Labor™
          </div>
        </div>

        {/* Caixa Laranja em Amostra (Acordeon fechado por padrão, auto-fecha após 15s): Preparo & Coleta */}
        <div className="bg-[#f59e0b]/[0.12] border border-[#f59e0b]/55 rounded-2xl px-3 py-3 shadow-sm space-y-2.5 mb-4">
          <button
            type="button"
            onClick={() => setIsPrepExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#f59e0b]/20 border border-[#f59e0b]/45 text-[#fbbf24] flex items-center justify-center text-[20px] shrink-0">
                <i className="ti ti-alert-triangle"></i>
              </div>
              <div className="min-w-0">
                <div className="text-[20px] font-['Cormorant_Garamond',serif] font-bold text-[#fbbf24] leading-tight">
                  Preparo & Coleta
                </div>
                <div className="text-[15px] text-[#fde68a] leading-snug">
                  Orientações antes da coleta laboratorial
                </div>
              </div>
            </div>
            <i
              className={`ti ${isPrepExpanded ? 'ti-chevron-up' : 'ti-chevron-down'} text-[36px] leading-none text-[#fbbf24] shrink-0`}
            ></i>
          </button>

          {isPrepExpanded && (
            <div className="pt-1.5 border-t border-[#f59e0b]/25">
              <ul className="divide-y divide-[#f59e0b]/20">
                {PREP_GUIDELINES.map((guide) => (
                  <li
                    key={guide.id}
                    className="py-2 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <i className={`${guide.icon} text-[20px] text-[#fbbf24] shrink-0`}></i>
                      <span className="text-[18px] font-semibold text-white leading-tight">
                        {guide.title}
                      </span>
                    </div>
                    <span className="text-[13px] font-extrabold px-2.5 py-0.5 rounded bg-[#f59e0b] text-[#0a0d12] shrink-0 uppercase tracking-wide">
                      {guide.badge}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="text-[16px] text-[#fde68a] leading-snug pt-2 mt-1 border-t border-[#f59e0b]/20 flex items-start gap-2">
                <i className="ti ti-shield-heart text-[19px] text-[#fbbf24] shrink-0 mt-0.5"></i>
                <span>Não suspenda medicamentos de uso contínuo sem orientação médica.</span>
              </div>
            </div>
          )}
        </div>

        {batches.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/20 rounded-2xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#5eea8f]/10 border border-[#5eea8f]/30 flex items-center justify-center text-[#5eea8f] mx-auto mb-2.5">
              <i className="ti ti-clipboard-list text-2xl"></i>
            </div>
            <div className="text-[20px] font-semibold text-white mb-1">
              Aguardando Liberação Laboratorial
            </div>
            <p className="text-[18px] text-[#cfd3dc] leading-relaxed max-w-[300px] mx-auto">
              Seus pedidos e laudos laboratoriais serão sincronizados aqui assim que emitidos pela equipe clínica.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-3.5 shadow-sm transition hover:border-white/70"
              >
                {/* Linha Superior: Ícone + Nome + Data + Status */}
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#5eea8f]/15 text-[#5eea8f] flex items-center justify-center text-[22px] shrink-0 mt-0.5">
                    <i className="ti ti-clipboard-list"></i>
                  </div>
                  <div className="grow min-w-0 w-full">
                    <div className="text-[19px] font-semibold text-white leading-tight uppercase w-full">
                      {batch.title.toLowerCase().includes('bioqu')
                        ? 'PAINEL [ BIOQUÍMICO COMPLETO ]'
                        : batch.title.toUpperCase()}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                      <span className="text-[18px] text-[#e0e0ed] leading-none">
                        Data: {batch.dateStr}
                      </span>
                      <span className="text-[14px] font-semibold text-white px-2.5 py-1 rounded bg-[#0f7a3a] shrink-0 uppercase tracking-wider leading-none">
                        {batch.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Linha de Ações: PDF + Visualizar (modal de resultados com Ref. e setas) */}
                <div className="flex flex-wrap items-center gap-2.5 mt-3 pt-2.5 border-t border-white/[0.08]">
                  {isExpired ? (
                    <div className="relative inline-block" title="Download em PDF bloqueado após conclusão do ciclo">
                      <button
                        type="button"
                        disabled
                        className="h-[44px] min-h-[44px] inline-flex items-center gap-1.5 text-[16px] font-medium px-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-[#e0e0ed] opacity-60 cursor-not-allowed"
                      >
                        <i className="ti ti-file-type-pdf text-[18px]"></i>
                        <span>PDF</span>
                      </button>
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#24141d] border border-[#ff5f5f] flex items-center justify-center text-[14px] text-[#ff5f5f] shadow-md">
                        <i className="ti ti-lock"></i>
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedBatchForPdf(batch)}
                      className="h-[44px] min-h-[44px] inline-flex items-center gap-1.5 text-[16px] font-semibold px-4 rounded-xl bg-[#5eea8f]/10 border border-[#5eea8f]/35 text-[#5eea8f] hover:bg-[#5eea8f]/20 active:scale-95 transition cursor-pointer"
                    >
                      <i className="ti ti-file-type-pdf text-[19px]"></i>
                      <span>PDF</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedBatchForView(batch)}
                    className="h-[44px] min-h-[44px] inline-flex items-center gap-1.5 text-[16px] font-semibold px-4 rounded-xl bg-[#0f7a3a] border border-[#0f7a3a] text-white hover:bg-[#128d43] active:scale-95 transition cursor-pointer"
                  >
                    <i className="ti ti-eye text-[19px]"></i>
                    <span>Visualizar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visão Geral dos Resultados (mantida conforme solicitado) */}
      {allModalSummaryStats.total > 0 && (
        <div className="bg-white/[0.04] border border-[#5eea8f]/40 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[20px] font-['Cormorant_Garamond',serif] font-bold text-[#5eea8f] leading-tight">
              Visão Geral dos Resultados
            </div>
            <span className="text-[15px] font-extrabold px-2.5 py-1 rounded-lg bg-[#5eea8f]/15 border border-[#5eea8f]/35 text-[#5eea8f] shrink-0">
              {allModalSummaryStats.okCount}/{allModalSummaryStats.total} normais
            </span>
          </div>

          <p className="text-[18px] text-white leading-snug">
            {allModalSummaryStats.attentionCount === 0
              ? 'Todos os marcadores lançados estão dentro da faixa esperada.'
              : `${allModalSummaryStats.okCount} ${allModalSummaryStats.okCount === 1 ? 'marcador está' : 'marcadores estão'} dentro da faixa esperada e ${allModalSummaryStats.attentionCount} ${allModalSummaryStats.attentionCount === 1 ? 'pede atenção' : 'pedem atenção'}.`}
          </p>

          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#5eea8f] rounded-full transition-all duration-300"
              style={{
                width: `${Math.round((allModalSummaryStats.okCount / Math.max(1, allModalSummaryStats.total)) * 100)}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Evolução dos Biomarcadores (quando houver 2+ pontos históricos) */}
      {comparisons.length > 0 && (
        <div className="pt-1">
          <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] mb-1">
            Evolução dos Biomarcadores
          </div>
          <div className="text-[18px] text-[#e0e0ed] leading-relaxed mb-2.5">
            Comparativo histórico dos parâmetros laboratoriais.
          </div>

          <div className="space-y-4">
            {comparisons.map((item) => {
              const parsePtDate = (dStr: string): number => {
                const match = dStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                if (!match) return 0;
                return new Date(
                  parseInt(match[3], 10),
                  parseInt(match[2], 10) - 1,
                  parseInt(match[1], 10)
                ).getTime();
              };

              const sortedPoints = [...item.points].sort(
                (a, b) => parsePtDate(a.date) - parsePtDate(b.date)
              );
              const firstPoint = sortedPoints[0];
              const lastPoint = sortedPoints[sortedPoints.length - 1];

              let pctChange = 0;
              if (firstPoint && firstPoint.value > 0 && lastPoint) {
                pctChange = ((lastPoint.value - firstPoint.value) / firstPoint.value) * 100;
              }

              const absPct = Math.abs(pctChange);
              const formattedPct = absPct.toFixed(1);

              const lowerName = item.name.toLowerCase();
              const isIncreaseGood =
                lowerName.includes('vitamina') ||
                lowerName.includes('hdl') ||
                lowerName.includes('ferritina') ||
                lowerName.includes('hemoglobina') ||
                lowerName.includes('ferro');
              const isReductionGood = !isIncreaseGood;

              let arrowKind: 'ok' | 'up' | 'down' = 'ok';
              let badgeColor = 'text-[#e0e0ed] bg-white/[0.05] border-white/10';

              if (pctChange < -0.05) {
                arrowKind = 'down';
                badgeColor = isReductionGood
                  ? 'text-[#5eea8f] bg-[#5eea8f]/10 border-[#5eea8f]/25'
                  : 'text-[#e57373] bg-[#e57373]/10 border-[#e57373]/25';
              } else if (pctChange > 0.05) {
                arrowKind = 'up';
                badgeColor = isReductionGood
                  ? 'text-[#f5a623] bg-[#f5a623]/10 border-[#f5a623]/25'
                  : 'text-[#5eea8f] bg-[#5eea8f]/10 border-[#5eea8f]/25';
              }

              return (
                <div
                  key={item.id}
                  className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-3.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-col min-w-0 pr-1">
                      <strong className="text-white font-semibold text-[20px] leading-tight break-words">
                        {item.name}
                      </strong>
                      <span className="text-[#e0e0ed] text-[18px] font-normal leading-snug mt-0.5">
                        {item.reference}
                      </span>
                    </div>

                    <span
                      className={`text-[18px] font-semibold border px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5 ${badgeColor}`}
                    >
                      <ModernStatusArrow kind={arrowKind} size={22} />
                      <span>{formattedPct}%</span>
                    </span>
                  </div>

                  <div className="w-full h-16 px-1 my-1">
                    <svg viewBox="0 0 320 64" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id={`grad-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5eea8f" stopOpacity="0.45" />
                          <stop offset="45%" stopColor="#5eea8f" stopOpacity="0.22" />
                          <stop offset="85%" stopColor="#5eea8f" stopOpacity="0.05" />
                          <stop offset="100%" stopColor="#5eea8f" stopOpacity="0.0" />
                        </linearGradient>
                        <filter id={`glow-${item.id}`} x="-10%" y="-10%" width="120%" height="130%">
                          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#5eea8f" floodOpacity="0.3" />
                        </filter>
                      </defs>

                      <line x1="10" y1="16" x2="310" y2="16" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                      <line x1="10" y1="44" x2="310" y2="44" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                      {(() => {
                        const values = sortedPoints.map((p) => p.value);
                        const minVal = Math.min(...values) * 0.92;
                        const maxVal = Math.max(...values) * 1.08;
                        const valRange = Math.max(0.1, maxVal - minVal);

                        const coords = sortedPoints.map((pt, i) => {
                          const x = 36 + i * (248 / Math.max(1, sortedPoints.length - 1));
                          const y = 42 - ((pt.value - minVal) / valRange) * 26;
                          return { x, y, pt };
                        });

                        const polyPath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
                        const areaPath = `${polyPath} L ${coords[coords.length - 1].x} 48 L ${coords[0].x} 48 Z`;

                        return (
                          <>
                            <path d={areaPath} fill={`url(#grad-${item.id})`} />
                            {coords.map((c, i) => (
                              <line
                                key={`beam-${i}`}
                                x1={c.x}
                                y1={c.y + 2}
                                x2={c.x}
                                y2={46}
                                stroke="#5eea8f"
                                strokeWidth="1"
                                strokeDasharray="2 3"
                                strokeOpacity={0.25}
                              />
                            ))}
                            <path
                              d={polyPath}
                              fill="none"
                              stroke="#5eea8f"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              filter={`url(#glow-${item.id})`}
                            />
                            {coords.map((c, i) => {
                              const numericOnly = c.pt.valueDisplay
                                ? c.pt.valueDisplay.split(' ')[0]
                                : String(c.pt.value);

                              return (
                                <g key={i}>
                                  <circle cx={c.x} cy={c.y} r="6.5" fill="#5eea8f" fillOpacity="0.2" />
                                  <circle cx={c.x} cy={c.y} r="4" fill="#5eea8f" stroke="#14142a" strokeWidth="2" />
                                  <circle cx={c.x} cy={c.y} r="1.5" fill="#ffffff" />
                                  <text
                                    x={c.x}
                                    y={c.y - 10}
                                    fill="#ffffff"
                                    fontSize="18"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {numericOnly}
                                  </text>
                                  <text
                                    x={c.x}
                                    y="58"
                                    fill="#e0e0ed"
                                    fontSize="14"
                                    fontWeight="normal"
                                    textAnchor="middle"
                                  >
                                    {c.pt.date}
                                  </text>
                                </g>
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Visualizar Resultados do Lote (com Resultados, Ref. e Indicativos com Setas SVG) */}
      {modalBatchData && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-[460px] max-h-[88dvh] bg-[#0e1222] border border-white/35 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header do Modal */}
            <div className="px-4 py-3.5 border-b border-white/15 flex items-start justify-between gap-3 shrink-0 bg-[#13182d]">
              <div className="min-w-0">
                <div className="text-[20px] font-['Cormorant_Garamond',serif] font-bold text-[#5eea8f] leading-tight uppercase">
                  {modalBatchData.batch.title}
                </div>
                <div className="text-[16px] text-[#d5dee4] mt-0.5">
                  Data: {modalBatchData.batch.dateStr} · Hemo Labor™
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBatchForView(null)}
                aria-label="Fechar"
                className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0 transition cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Conteúdo Rolável com Resultados, Ref. e Setas */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 no-scrollbar">
              {!modalBatchData.hasOfficialValues && (
                <div className="bg-[#f59e0b]/15 border border-[#f59e0b]/45 rounded-2xl p-3 flex items-start gap-2.5">
                  <i className="ti ti-info-circle text-[22px] text-[#fbbf24] shrink-0 mt-0.5"></i>
                  <p className="text-[16px] text-[#fef3c7] leading-snug">
                    Pré-visualização temporária: assim que o laboratório/CRM gravar os valores oficiais no Firebase, eles substituirão estes exemplos automaticamente.
                  </p>
                </div>
              )}

              {(() => {
                const resolveFunctionalGroup = (name: string, rawCategory?: string): { title: string; subtitle: string; order: number } => {
                  const n = `${name || ''} ${rawCategory || ''}`.toLowerCase();
                  if (/vitamina d|25-hidroxi|zinco|leuc|eosin|linf|neutr|bas[oó]f|mon[oó]c|imun|igg|igm|anticorp|vitamina c|sel[eê]nio/.test(n)) {
                    return {
                      title: 'Imunidade & Defesa Celular',
                      subtitle: 'Proteção imunológica, modulação inflamatória e resposta de defesa',
                      order: 1
                    };
                  }
                  if (/ferritina|ferro|hemoglobina|hemat[oó]crito|eritr[oó]c|hem[aá]cia|vcm|hcm|rdw|transferrina|b12|cobalamina|folato|[aá]cido f[oó]lico|oxig/.test(n)) {
                    return {
                      title: 'Manutenção de Oxigenação & Energia',
                      subtitle: 'Transporte de oxigênio celular, estoque de ferro e disposição física',
                      order: 2
                    };
                  }
                  if (/glicose|glicemia|insulina|hba1c|glicada|homa|colesterol|hdl|ldl|vldl|triglic|[aá]cido [uú]rico|lip[ií]d|metabol/.test(n)) {
                    return {
                      title: 'Equilíbrio Metabólico & Glicêmico',
                      subtitle: 'Controle de energia pós-refeição, saciedade e oxidação de gorduras',
                      order: 3
                    };
                  }
                  if (/tsh|t4|t3|tireo|cortisol|testosterona|estradiol|progesterona|dhea|shbg|lh|fsh|prolactina|hormon/.test(n)) {
                    return {
                      title: 'Sinalização Hormonal & Vitalidade',
                      subtitle: 'Ritmo circadiano, taxa metabólica, recuperação e disposição',
                      order: 4
                    };
                  }
                  return {
                    title: 'Equilíbrio Sistêmico, Hepático & Renal',
                    subtitle: 'Detoxificação metabólica, filtração renal e marcadores de base',
                    order: 5
                  };
                };

                const groupedMap = new Map<
                  string,
                  { title: string; subtitle: string; order: number; items: typeof modalBatchData.items }
                >();

                modalBatchData.items.forEach((item) => {
                  const grp = resolveFunctionalGroup(item.name, item.category);
                  const existing = groupedMap.get(grp.title);
                  if (existing) {
                    existing.items.push(item);
                  } else {
                    groupedMap.set(grp.title, {
                      ...grp,
                      items: [item]
                    });
                  }
                });

                const sortedGroups = Array.from(groupedMap.values()).sort((a, b) => a.order - b.order);

                return (
                  <div className="space-y-6">
                    {sortedGroups.map((group) => (
                      <div key={group.title} className="space-y-2.5">
                        <div className="px-1 pb-1 border-b border-white/15">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-[18px] font-bold text-[#5eea8f] leading-snug">
                              {group.title}
                            </h3>
                            <span className="text-[14px] font-semibold text-[#cfd3dc] px-2.5 py-0.5 rounded-lg bg-white/[0.06] border border-white/15 shrink-0">
                              {group.items.length} {group.items.length === 1 ? 'exame' : 'exames'}
                            </span>
                          </div>
                          <p className="text-[15px] text-[#cfd3dc] leading-snug mt-0.5">
                            {group.subtitle}
                          </p>
                        </div>

                        <div className="space-y-3">
                          {group.items.map((item, idx) => {
                            const meta = getStatusMeta(item.status);
                            const displayValue = [item.value, item.unit].filter(Boolean).join(' ');

                            return (
                              <div
                                key={item.id || `${group.title}-res-${idx}`}
                                className={`bg-white/[0.04] border ${meta.borderClass} rounded-2xl p-3.5 space-y-2`}
                              >
                                <div className="flex items-start justify-between gap-2.5">
                                  <div className="text-[18px] font-normal text-white leading-snug break-words">
                                    {item.name}
                                  </div>

                                  <span
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[16px] font-extrabold shrink-0 ${meta.pillClass}`}
                                  >
                                    <ModernStatusArrow kind={meta.kind} size={24} />
                                    <span>{meta.label}</span>
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-baseline justify-between gap-2 pt-2 border-t border-white/[0.08]">
                                  <div className="text-[20px] font-extrabold text-white">
                                    {displayValue || '—'}
                                  </div>
                                  <div className="text-[16px] text-[#cfd3dc]">
                                    Ref.: {item.reference || 'Padrão laboratorial'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Rodapé do Modal */}
            <div className="px-4 py-3 border-t border-white/15 bg-[#13182d] shrink-0">
              <button
                type="button"
                onClick={() => setSelectedBatchForView(null)}
                className="w-full min-h-[48px] rounded-xl bg-[#5eea8f] text-[#0a0d12] text-[18px] font-extrabold hover:bg-[#4dd67d] active:scale-95 transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Oficial de Impressão e PDF de Solicitação de Exames Laboratoriais (Hemo Labor™) */}
      <ExamRequestPdfModal
        isOpen={Boolean(selectedBatchForPdf)}
        onClose={() => setSelectedBatchForPdf(null)}
        batch={selectedBatchForPdf}
        patientName={patient.name}
        dateStr={selectedBatchForPdf?.dateStr || '11/11/2026'}
      />
    </div>
  );
};
