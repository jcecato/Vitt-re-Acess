import React from 'react';
import { ProtocolItem } from '../../types/patient';
import { X, Printer, ShieldCheck } from 'lucide-react';

interface PrescriptionPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  protocol: ProtocolItem | null;
  patientName: string;
}

// Rubrica transparente oficial incorporada em Base64 Data URI
const AUTHENTIC_RUBRIC =
  "data:image/png;base64,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";

export const PrescriptionPdfModal: React.FC<PrescriptionPdfModalProps> = ({
  isOpen,
  onClose,
  protocol,
  patientName
}) => {
  if (!isOpen || !protocol) return null;

  // Datas
  const emissionDateStr = protocol.emissionDate || '03/11/2026';
  const expirationDateStr =
    protocol.expirationDate ||
    protocol.expirationStr?.replace('Validade: ', '').replace('Data: ', '') ||
    '08/12/2026';

  // Montagem da lista de fórmulas
  const formulasList = protocol.formulas && protocol.formulas.length > 0
    ? protocol.formulas
    : [
        {
          id: 'form-default',
          name: protocol.formulaName || protocol.title || 'Articulares 1',
          posology: protocol.posology || 'Tomar 1 dose, 2 vezes ao dia com água após as refeições.',
          observations: protocol.observations || 'Pode interagir com anticoagulantes. Manter em local fresco e seco.',
          actives: protocol.actives && protocol.actives.length > 0
            ? protocol.actives
            : [
                { name: 'Glucosamina', concentration: '500 mg' },
                { name: 'Condroitina', concentration: '400 mg' },
                { name: 'MSM', concentration: '300 mg' }
              ]
        }
      ];

  const handlePrint = () => {
    try {
      const sheetElem = document.getElementById('prescription-sheet');
      if (!sheetElem) {
        window.print();
        return;
      }

      const isIframe = window.self !== window.top;
      if (isIframe) {
        const printWindow = window.open('', '_blank', 'width=900,height=1000');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Receituário - ${patientName}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                  @page { size: A4 portrait; margin: 10mm; }
                  body { font-family: 'Inter', sans-serif; background: #fff; margin: 0; padding: 0; }
                </style>
              </head>
              <body>
                ${sheetElem.outerHTML}
                <script>
                  setTimeout(() => {
                    window.print();
                  }, 600);
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
          return;
        }
      }
      
      window.print();
    } catch (err) {
      console.warn('Fallback para janela de impressão nativa:', err);
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/90 backdrop-blur-sm flex flex-col items-center p-2 sm:p-4 select-none print:p-0 print:bg-white">
      {/* BARRA SUPERIOR DE AÇÕES (OCULTA NA IMPRESSÃO) */}
      <div className="w-full max-w-[210mm] mb-3 flex items-center justify-between bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl shadow-lg print:hidden">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Receituário Clínico Oficial | Dr. João Paulo Cecato</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FOLHA DE RECEITUÁRIO A4 OFICIAL */}
      <div
        id="prescription-sheet"
        className="bg-white text-slate-800 w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-10 shadow-2xl rounded-sm flex flex-col justify-between relative print:shadow-none print:p-6 print:m-0 print:max-w-none print:w-full"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div>
          {/* 1. CABEÇALHO CLÍNICO */}
          <div className="bg-[#f9fefb] border border-emerald-100 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start gap-4 mb-3">
            <div>
              <h1 className="text-[20pt] sm:text-[22pt] font-bold text-blue-600 leading-tight">
                <span className="text-[23pt] sm:text-[25pt]">Dr. </span>João Paulo Cecato
              </h1>
              <div className="font-semibold text-[10.5pt] text-slate-700 mt-1 mb-1">
                Nutricionista Clínico | CRN4 – 20100054
              </div>
              <div className="text-[9pt] text-slate-600 leading-snug">
                Metabologia e Sistema Digestivo
              </div>
              <div className="text-[9pt] text-slate-600 leading-snug">
                Sistema Cognitivo, Emocional e Neurodegeneração
              </div>
              <div className="mt-2 text-[9pt] font-medium text-slate-700">
                Vittáre – Centro Integrado em Saúde
              </div>
              <div className="text-[8pt] text-slate-500 mt-0.5">
                Núcleo de Gestão Clínica | Rua Antônio Aleixo, 780 – Vitória / ES
              </div>
              <div className="text-[8pt] text-slate-700 mt-0.5 flex flex-wrap gap-3">
                <span>WhatsApp: 27 99791-8100</span>
                <span>E-mail: vittarecentrointegradoemsaude@gmail.com</span>
              </div>
            </div>

            {/* Marca Vittáre - Imagem limpa sem bordas quadradas */}
            <div className="flex items-center justify-center p-1.5 px-2 bg-transparent rounded-lg shrink-0">
              <img 
                src="https://i.ibb.co/JRkkVnRx/Vitt-re-CENTRO-INTEGRADO-EM-SA-DE-sem-fundo.png" 
                alt="Logo Vittáre" 
                className="h-14 w-auto object-contain mix-blend-multiply" 
              />
            </div>
          </div>

          {/* 2. IDENTIFICAÇÃO DO PACIENTE E DATAS */}
          <div className="border-t border-b border-slate-200 py-2 px-1 mb-2.5">
            <div className="text-[10.5pt] text-slate-800 mb-1">
              <span className="text-slate-500">Paciente: </span>
              <strong className="text-slate-900">{patientName}</strong>
            </div>
            <div className="text-[9pt] text-slate-600 flex flex-wrap gap-4">
              <span>Emissão: <strong className="text-slate-800">{emissionDateStr}</strong></span>
              <span>| Validade da Receita: <strong className="text-slate-800">{expirationDateStr}</strong></span>
            </div>
          </div>

          {/* 3. COMUNICADO OBRIGATÓRIO */}
          <div className="text-[7.5pt] text-slate-500 italic leading-snug mb-3.5 pb-1.5 border-b border-dashed border-slate-300">
            <strong className="font-semibold text-slate-700 not-italic">Comunicado ao Paciente e ao Farmacêutico Responsável: </strong>
            Dúvidas contatar. Esta receita é personalizada e não permite alterações em sua composição ou dosagem. O uso é exclusivo ao paciente indicado e o documento perde a validade após o vencimento. Este produto não pode ser manipulado ou adquirido em farmácias comerciais após esta data.
          </div>

          {/* 4. FÓRMULAS E ATIVOS PRESCRITOS */}
          <div className="space-y-4">
            {formulasList.map((formula, fIdx) => (
              <div key={formula.id || fIdx} className="break-inside-avoid mb-2">
                <h2 className="text-[11pt] font-bold text-blue-900 mb-1">
                  {formula.name}
                </h2>

                {/* Lista de Ativos com Linha Pontilhada */}
                <ul className="list-none p-0 my-1.5 w-full leading-tight">
                  {formula.actives.map((active, aIdx) => (
                    <li key={aIdx} className="flex items-baseline gap-1 my-0.5 text-[10pt]">
                      <span className="shrink-0 text-slate-700 italic">
                        {active.name}
                      </span>
                      <span className="grow border-b border-dotted border-slate-300 h-px translate-y-[-3px]" />
                      <span className="shrink-0 font-semibold text-slate-900">
                        {active.concentration}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Posologia */}
                <div className="mt-1 text-[9.5pt] text-slate-700">
                  <strong className="text-slate-800 font-semibold">Posologia: </strong>
                  {formula.posology}
                </div>

                {/* Observações */}
                {formula.observations && (
                  <div className="mt-0.5 text-[9pt] text-slate-500 italic">
                    <strong>Obs.: </strong>
                    {formula.observations}
                  </div>
                )}

                {fIdx < formulasList.length - 1 && (
                  <hr className="my-3 border-0 border-t border-slate-100" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 5. RODAPÉ OFICIAL: ASSINATURA DIGITAL GOV.BR / ICP-BRASIL */}
        <div className="mt-6 pt-3 flex justify-center">
          <div className="w-full max-w-[585px] border border-slate-300 rounded-lg p-2.5 sm:p-3 bg-white flex flex-col sm:flex-row justify-between items-center gap-3">
            {/* Esquerda: Selo Gov.br */}
            <div className="flex items-start gap-2.5 text-left shrink-0">
              <div className="font-bold text-[19pt] leading-none shrink-0">
                <span className="text-[#003a70]">gov</span>
                <span className="text-[#ffcd07]">.br</span>
              </div>
              <div className="text-[8pt] leading-tight text-slate-700">
                <div className="text-[7.5pt] text-slate-500">Documento assinado digitalmente</div>
                <div className="font-bold text-slate-900 uppercase mt-0.5">JOAO PAULO GONCALVES CECATO</div>
                <div className="font-mono text-slate-600 mt-0.5 text-[7.5pt]">
                  Data: {emissionDateStr} 12:27:01-0300
                </div>
                <div className="text-blue-600 underline mt-0.5 text-[7.5pt]">
                  Verifique em https://validar.iti.gov.br
                </div>
              </div>
            </div>

            <div className="hidden sm:block w-px h-14 bg-slate-200" />

            {/* Direita: Rubrica Transparente e Credenciais */}
            <div className="w-full sm:w-[256px] relative flex items-center justify-end">
              {/* Rubrica Sobreposta */}
              <div className="absolute left-0 sm:left-2 -top-4 w-16 h-20 pointer-events-none">
                <img
                  src={AUTHENTIC_RUBRIC}
                  alt="Rubrica Dr. João Paulo Cecato"
                  className="w-full h-full object-contain mix-blend-multiply bg-transparent"
                />
              </div>

              <div className="text-right text-[8pt] leading-tight text-slate-800">
                <div className="font-bold text-slate-900 uppercase">DR. JOÃO PAULO CECATO</div>
                <div className="font-semibold text-[7.5pt] text-slate-700">NUTRICIONISTA | CRN 20100054 REGIÃO-4</div>
                <div className="font-semibold text-[7pt] text-slate-600 uppercase">ESPECIALISTA EM NEUROCIÊNCIAS</div>
                <div className="text-[7pt] text-slate-600 mt-0.5">
                  <span className="italic">Assinatura: </span>
                  <span className="underline decoration-dotted font-semibold">ESPECIALISTA EM NUTRIÇÃO CLÍNICA FUNCIONAL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @media print {
            @page { size: A4 portrait; margin: 0; }
            body > *:not(#prescription-sheet) { display: none !important; }
            #prescription-sheet {
              position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 10mm; box-shadow: none; display: block !important;
            }
            .action-toolbar { display: none !important; }
          }
        `}
      </style>
    </div>
  );
};
