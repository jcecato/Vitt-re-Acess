import React from 'react';
import { ExamBatch } from '../../types/patient';
import { X, Printer, ShieldCheck } from 'lucide-react';

interface ExamRequestPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch?: ExamBatch | null;
  patientName?: string;
  doctorName?: string;
  doctorRegistration?: string;
  dateStr?: string;
}

// 22 Exames laboratoriais oficiais do Hemo Labor™ (conforme solicitação clínica do CRM)
const DEFAULT_LAB_EXAMS_COL_1 = [
  'Hemograma Completo',
  'Ferritina',
  'Índice de Saturação de Transferrina',
  'Leucócitos (Glóbulos Brancos – WBC)',
  'Hemoglobina (Hb)',
  'Volume Corpuscular Médio (VCM)',
  'Concentração de Hemoglobina Corpuscular Média (CHCM)',
  'Plaquetas',
  'Razão Neutrófilos:Linfócitos (RNL)',
  'Relação Plaqueta:Linfócito (PLR)',
  'Eosinófilos'
];

const DEFAULT_LAB_EXAMS_COL_2 = [
  'Ferro sérico',
  'Transferrina',
  'Capacidade Total de Ligação do Ferro',
  'Eritrócitos (Glóbulos Vermelhos – RBC)',
  'Hematócrito (Ht)',
  'Hemoglobina Corpuscular Média (HCM)',
  'Amplitude de Distribuição Eritrocitária (RDW)',
  'Diferencial de Leucócitos',
  'Relação Monócito:Linfócito (MLR)',
  'Índice de Resposta Inflamatória Sistêmica (SIRI)'
];

export const ExamRequestPdfModal: React.FC<ExamRequestPdfModalProps> = ({
  isOpen,
  onClose,
  batch,
  patientName = 'JOÃO CECATO',
  dateStr = '11/11/2026'
}) => {
  if (!isOpen) return null;

  const effectiveDate = batch?.dateStr || dateStr || '11/11/2026';
  const cleanPatientName = (patientName || 'JOÃO CECATO').toUpperCase();

  // Divisão balanceada em 2 colunas
  const { col1, col2 } = (() => {
    if (batch?.results && batch.results.length > 0) {
      const allNames = batch.results.map(r => r.name);
      const half = Math.ceil(allNames.length / 2);
      return {
        col1: allNames.slice(0, half),
        col2: allNames.slice(half)
      };
    }
    return {
      col1: DEFAULT_LAB_EXAMS_COL_1,
      col2: DEFAULT_LAB_EXAMS_COL_2
    };
  })();

  const handlePrint = () => {
    try {
      const sheetElem = document.getElementById('exam-request-sheet');
      if (!sheetElem) {
        window.print();
        return;
      }

      const isIframe = window.self !== window.top;
      if (isIframe) {
        const printWindow = window.open('', '_blank', 'width=950,height=1100');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Solicitação de Exames Laboratoriais - ${cleanPatientName}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                <style>
                  @page {
                    size: A4 portrait;
                    margin: 6mm;
                  }
                  html, body {
                    font-family: 'Inter', sans-serif;
                    background: #fff;
                    margin: 0; padding: 0;
                    height: 100%;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  #exam-request-sheet {
                    min-height: auto !important;
                    height: auto !important;
                    max-height: 282mm !important;
                    padding: 4mm 6mm !important;
                    margin: 0 auto !important;
                    box-shadow: none !important;
                    border: none !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                  }
                  .grid-cols-2 {
                    display: grid !important;
                    grid-template-columns: 1fr 1fr !important;
                    column-gap: 2rem !important;
                    row-gap: 0.4rem !important;
                  }
                  .signature-box-container {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                  }
                  .no-print { display: none !important; }
                </style>
              </head>
              <body>
                ${sheetElem.outerHTML}
                <script>
                  window.onload = function() {
                    setTimeout(function() {
                      window.print();
                      window.close();
                    }, 600);
                  };
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
          return;
        }
      }

      window.print();
    } catch (e) {
      console.warn("Fallback de impressão acionado:", e);
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 select-none font-['Inter',sans-serif]">
      {/* BARRA SUPERIOR DE AÇÕES (OCULTA NA IMPRESSÃO) */}
      <div className="w-full max-w-full sm:max-w-[210mm] bg-[#14142a] border border-white/20 rounded-2xl p-3 sm:px-5 sm:py-3 mb-3 flex items-center justify-between shadow-2xl shrink-0 print:hidden">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-200 min-w-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">Solicitação de Exames Laboratoriais | Dr. João Paulo Cecato</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>

      {/* FOLHA OFICIAL A4 (MESMA ESTRUTURA E ESTILO DE MINHAS FÓRMULAS) */}
      <div
        id="exam-request-sheet"
        className="bg-white text-slate-800 w-full max-w-full sm:max-w-[210mm] box-border overflow-x-hidden min-h-[297mm] print:min-h-0 print:h-auto print:max-h-[282mm] p-4 sm:p-7 shadow-2xl rounded-sm flex flex-col justify-between relative print:shadow-none print:p-2 print:m-0 print:max-w-none print:w-full print:page-break-inside-avoid"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div>
          {/* 1. CABEÇALHO CLÍNICO INSTITUCIONAL (IDÊNTICO AO DE MINHAS FÓRMULAS) */}
          <div className="bg-[#f9fefb] border border-emerald-100 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start gap-3 mb-2 print:p-2.5 print:mb-1.5">
            <div>
              <h1 className="text-[18pt] sm:text-[20pt] font-bold text-blue-600 leading-tight">
                <span className="text-[20pt] sm:text-[22pt]">Dr. </span>João Paulo Cecato
              </h1>
              <div className="font-semibold text-[15.5px] text-slate-800 mt-0.5 mb-0.5 leading-snug">
                Nutricionista Clínico | CRN4 – 20100054
              </div>
              <div className="text-[15.5px] text-slate-600 leading-snug">
                Metabologia e Sistema Digestivo
              </div>
              <div className="text-[15.5px] text-slate-600 leading-snug">
                Sistema Cognitivo, Emocional e Neurodegeneração
              </div>
              <div className="mt-1.5 text-[14.5px] font-semibold text-slate-800 leading-snug">
                Vittáre – Centro Integrado em Saúde
              </div>
              <div className="text-[14px] text-slate-600 mt-0.5 leading-snug">
                Núcleo de Gestão Clínica | Rua Antônio Aleixo, 780 – Vitória / ES
              </div>
              <div className="text-[14px] text-slate-700 mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 font-medium">
                <span>WhatsApp: 27 99791-8100</span>
                <span>E-mail: vittarecentrointegradoemsaude@gmail.com</span>
              </div>
            </div>

            {/* Marca Vittáre Oficial */}
            <div className="flex items-center justify-center p-1 bg-transparent rounded-lg shrink-0">
              <img 
                src="https://i.ibb.co/JRkkVnRx/Vitt-re-CENTRO-INTEGRADO-EM-SA-DE-sem-fundo.png" 
                alt="Logo Vittáre" 
                className="max-h-12 max-w-[130px] sm:max-w-[160px] w-auto object-contain mix-blend-multiply" 
              />
            </div>
          </div>

          {/* 2. IDENTIFICAÇÃO DO DOCUMENTO E PACIENTE */}
          <div className="border-t border-b border-slate-200 py-2 px-1 mb-2.5 print:py-2 print:mb-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-1.5">
              <h2 className="text-[22px] font-bold text-slate-900 tracking-tight leading-tight uppercase">
                SOLICITAÇÃO DE EXAMES LABORATORIAIS
              </h2>
              <span className="text-[14.5px] font-bold text-[#0f7a3a] tracking-wide">
                Hemo Labor™ · By Clinical Data
              </span>
            </div>

            <div className="text-[17px] text-slate-800 mb-1 leading-snug">
              <span className="text-slate-600 font-medium">Paciente: </span>
              <strong className="text-slate-900 font-bold text-[18px]">{cleanPatientName}</strong>
            </div>

            <div className="text-[16px] text-slate-700 flex flex-wrap gap-3.5 leading-snug">
              <span>Data da Solicitação: <strong className="text-slate-900 font-bold">{effectiveDate}</strong></span>
              <span>| Validade da Guia: <strong className="text-slate-900 font-bold">30 dias</strong></span>
            </div>
          </div>

          {/* 3. COMUNICADO OBRIGATÓRIO AO LABORATÓRIO */}
          <div className="text-[8pt] text-slate-500 italic leading-snug mb-3 pb-1 border-b border-dashed border-slate-300 print:mb-2 print:pb-0.5">
            <strong className="font-semibold text-slate-700 not-italic">Comunicado ao Laboratório de Análises Clínicas: </strong>
            Solicitamos a realização dos exames laboratoriais complementares listados abaixo para acompanhamento clínico integrativo e monitoramento metabólico do paciente.
          </div>

          {/* 4. GRADE DOS 22 EXAMES EM 2 COLUNAS BALANCEADAS (TIPOGRAFIA ESTRITA DE 16PX, SEM NEGRITO) */}
          <div className="my-2 print:my-1.5">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 print:grid-cols-2">
              {/* Coluna 1 (11 Exames) */}
              <div className="space-y-1.5">
                {col1.map((item, idx) => (
                  <div key={idx} className="flex items-baseline gap-2 text-[16px] leading-snug text-slate-800">
                    <span className="text-slate-500 font-normal select-none text-[15px] leading-none">•</span>
                    <span className="font-normal text-slate-800">{item}</span>
                  </div>
                ))}
              </div>

              {/* Coluna 2 (11 Exames) */}
              <div className="space-y-1.5">
                {col2.map((item, idx) => (
                  <div key={idx} className="flex items-baseline gap-2 text-[16px] leading-snug text-slate-800">
                    <span className="text-slate-500 font-normal select-none text-[15px] leading-none">•</span>
                    <span className="font-normal text-slate-800">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 5. RODAPÉ OFICIAL: SELO GOV.BR E CARIMBO LIMPO (IDÊNTICO AO DE MINHAS FÓRMULAS) */}
        <div>
          <div className="mt-3 pt-2 print:mt-1.5 print:pt-1 flex justify-center signature-box-container shrink-0 break-inside-avoid">
            <div className="w-full max-w-[585px] border border-slate-300 rounded-lg p-2.5 sm:p-3 bg-white flex flex-col sm:flex-row justify-between items-center gap-2.5 shadow-sm">
              {/* Esquerda: Selo Gov.br */}
              <div className="flex items-start gap-2.5 text-left shrink-0">
                <div className="font-bold text-[18pt] leading-none shrink-0">
                  <span className="text-[#003a70]">gov</span>
                  <span className="text-[#ffcd07]">.br</span>
                </div>
                <div className="text-[7.5pt] leading-tight text-slate-700">
                  <div className="text-[7pt] text-slate-500">Documento assinado digitalmente</div>
                  <div className="font-bold text-slate-900 uppercase mt-0.5">JOAO PAULO GONCALVES CECATO</div>
                  <div className="font-mono text-slate-600 mt-0.5 text-[7pt]">
                    Data: {effectiveDate} 11:24:01-0300
                  </div>
                  <div className="text-blue-600 underline mt-0.5 text-[7pt]">
                    Verifique em https://validar.iti.gov.br
                  </div>
                </div>
              </div>

              <div className="hidden sm:block w-px h-12 bg-slate-200" />

              {/* Direita: Credenciais Oficiais e Carimbo Profissional Limpo */}
              <div className="w-full sm:w-[270px] flex items-center justify-end">
                <div className="text-right text-[8pt] sm:text-[8.5pt] leading-tight text-slate-800">
                  <div className="font-bold text-slate-900 uppercase tracking-wide">DR. JOÃO PAULO CECATO</div>
                  <div className="font-semibold text-[7.5pt] text-slate-700 mt-0.5">NUTRICIONISTA | CRN 20100054 REGIÃO-4</div>
                  <div className="font-semibold text-[7pt] text-slate-600 uppercase mt-0.5">ESPECIALISTA EM NEUROCIÊNCIAS</div>
                  <div className="text-[7pt] text-slate-700 mt-0.5">
                    <span className="italic text-slate-500">Assinatura: </span>
                    <span className="underline decoration-dotted font-semibold">ESPECIALISTA EM NUTRIÇÃO CLÍNICA FUNCIONAL</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* BARRA INFERIOR DE RETORNO ERGONÔMICO (OCULTA NA IMPRESSÃO) */}
      <div className="w-full max-w-full sm:max-w-[210mm] mt-3 pb-4 flex justify-center print:hidden shrink-0">
      </div>
    </div>
  );
};
