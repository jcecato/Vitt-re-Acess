/**
 * Utilitário sênior para geração e compartilhamento mobile de PDF:
 * 
 * PADRÃO OURO DE DIAGRAMAÇÃO A4:
 * Em telas móveis (smartphones), os elementos sofrem colapso responsivo natural (360px a 390px),
 * fazendo o texto quebrar em muitas linhas, desalinhar o cabeçalho e cortar o rodapé/Gov.br.
 * 
 * SOLUÇÃO DE ENGENHARIA:
 * 1. Clonamos o elemento de folha A4 para um container isolado fora do viewport com largura rígida de
 *    exatos 794px (equivalente milimétrico a 210mm a 96 DPI padrão A4).
 * 2. Forçamos a expansão de todas as classes responsivas móveis para o modo desktop institucional.
 * 3. Renderizamos via SVG ForeignObject (html-to-image) compatível com OKLCH e CSS moderno a 2x Retina.
 * 4. Compilamos no jsPDF como uma única página A4 perfeita, idêntica à visualizada no computador.
 * 5. Disparamos a Web Share API Nível 2 (WhatsApp/Salvar) ou download direto.
 */

import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export interface GeneratePdfOptions {
  elementId: string;
  filename: string;
  title: string;
  text?: string;
}

export async function shareOrDownloadPdf({
  elementId,
  filename,
  title,
  text = 'Segue documento oficial emitido pelo Dr. João Paulo Cecato.'
}: GeneratePdfOptions): Promise<{ success: boolean; method: 'share' | 'download'; error?: string }> {
  const originalElem = document.getElementById(elementId);
  if (!originalElem) {
    return { success: false, method: 'download', error: 'Elemento de impressão não encontrado.' };
  }

  // 1. Cria container de preparação off-screen com geometria A4 rígida (794px x 1123px)
  const offscreenContainer = document.createElement('div');
  offscreenContainer.style.position = 'fixed';
  offscreenContainer.style.left = '-9999px';
  offscreenContainer.style.top = '0';
  offscreenContainer.style.width = '794px';
  offscreenContainer.style.minWidth = '794px';
  offscreenContainer.style.maxWidth = '794px';
  offscreenContainer.style.zIndex = '-9999';
  offscreenContainer.style.opacity = '1';
  offscreenContainer.style.pointerEvents = 'none';
  offscreenContainer.style.background = '#ffffff';

  // 2. Clona o elemento original e aplica estilos de layout A4 desktop
  const clone = originalElem.cloneNode(true) as HTMLElement;
  clone.id = `${elementId}-print-clone`;
  clone.style.width = '794px';
  clone.style.minWidth = '794px';
  clone.style.maxWidth = '794px';
  clone.style.minHeight = '1123px';
  clone.style.boxSizing = 'border-box';
  clone.style.padding = '24px 28px';
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';
  clone.style.borderRadius = '0';
  clone.style.transform = 'none';

  // Expande classes de flexbox responsivo no cabeçalho do clone para ficarem em 2 colunas como no desktop
  const headerElem = clone.querySelector('.bg-\\[\\#f9fefb\\]') as HTMLElement | null;
  if (headerElem) {
    headerElem.style.display = 'flex';
    headerElem.style.flexDirection = 'row';
    headerElem.style.justifyContent = 'space-between';
    headerElem.style.alignItems = 'flex-start';

    // Garante que a marca institucional em Base64 fique perfeitamente visível e dimensionada
    const logoImg = headerElem.querySelector('img[alt="Logo Vittáre"]') as HTMLImageElement | null;
    if (logoImg) {
      logoImg.style.display = 'block';
      logoImg.style.maxHeight = '48px';
      logoImg.style.maxWidth = '160px';
      logoImg.style.width = 'auto';
      logoImg.style.objectFit = 'contain';
    }
  }

  // Expande assinatura do rodapé para 2 colunas perfeitamente alinhadas
  const signatureBox = clone.querySelector('.signature-box-container > div') as HTMLElement | null;
  if (signatureBox) {
    signatureBox.style.display = 'flex';
    signatureBox.style.flexDirection = 'row';
    signatureBox.style.justifyContent = 'space-between';
    signatureBox.style.alignItems = 'center';
  }

  // Se for a solicitação de exames, garante a grade estrita de 2 colunas
  const examsGrid = clone.querySelector('.grid-cols-2') as HTMLElement | null;
  if (examsGrid) {
    examsGrid.style.display = 'grid';
    examsGrid.style.gridTemplateColumns = '1fr 1fr';
    examsGrid.style.columnGap = '2rem';
  }

  offscreenContainer.appendChild(clone);
  document.body.appendChild(offscreenContainer);

  try {
    // 3. Captura o clone com proporção A4 padrão internacional (escala 2x para nitidez vetorial)
    const dataUrl = await toPng(clone, {
      quality: 0.98,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
      filter: (node: HTMLElement) => {
        if (node.classList && node.classList.contains('no-print')) {
          return false;
        }
        return true;
      }
    });

    // 4. Cria documento jsPDF A4 (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 5;
    const contentWidth = pageWidth - margin * 2; // 200mm
    const contentHeight = pageHeight - margin * 2; // 287mm

    // Dimensões do elemento capturado
    const cloneHeight = clone.offsetHeight || 1123;
    const cloneWidth = clone.offsetWidth || 794;
    const calculatedImgHeight = (cloneHeight * contentWidth) / cloneWidth;
    const targetHeight = Math.min(calculatedImgHeight, contentHeight);

    pdf.addImage(dataUrl, 'PNG', margin, margin, contentWidth, targetHeight, undefined, 'FAST');

    // 5. Converte para Blob binário e prepara arquivo
    const pdfBlob: Blob = pdf.output('blob');
    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    const file = new File([pdfBlob], cleanFilename, { type: 'application/pdf' });

    // 6. Web Share API para Mobile (WhatsApp / Salvar em Arquivos com 1 toque)
    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title,
          text
        });
        return { success: true, method: 'share' };
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          return { success: true, method: 'share' };
        }
      }
    }

    // 7. Fallback para download direto
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = cleanFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

    return { success: true, method: 'download' };
  } catch (err: any) {
    console.error('Falha ao gerar/compartilhar PDF:', err);
    return { success: false, method: 'download', error: err?.message || 'Erro ao gerar PDF' };
  } finally {
    // 8. Descarte imediato do elemento temporário da memória
    if (document.body.contains(offscreenContainer)) {
      document.body.removeChild(offscreenContainer);
    }
  }
}
