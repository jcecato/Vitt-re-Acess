import React, { useState } from 'react';
import { PatientProfile, MarketplaceProduct } from '../../types/patient';
import { Check, ExternalLink, ShoppingBasket } from 'lucide-react';

interface MarketplaceTabProps {
  patient: PatientProfile;
}

/**
 * Função utilitária de encurtamento puramente visual:
 * Preserva o link original completo para navegação e cópia,
 * mas gera um rótulo canônico, elegante e compacto para a interface mobile.
 */
function getShortenedDisplayUrl(link: string, name: string): string {
  if (!link) return 'vittare.link/acesso';
  const cleanLink = link.trim().toLowerCase();

  // Links do WhatsApp da Farmácia / Atendimento
  if (cleanLink.includes('wa.me') || cleanLink.includes('whatsapp.com')) {
    return 'wa.me/farmacia-vittare';
  }

  try {
    const urlObj = new URL(link.startsWith('http') ? link : `https://${link}`);
    const host = urlObj.hostname.replace(/^www\./, '');

    // Se o domínio for limpo e curto sem parâmetros extensos
    if (host.length > 0 && host.length <= 22 && !urlObj.search) {
      const pathClean = urlObj.pathname === '/' ? '' : urlObj.pathname.slice(0, 10);
      return `${host}${pathClean}`;
    }

    // Slug amigável institucional derivado do nome do item
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 20);

    return `vittare.link/${slug || 'curadoria'}`;
  } catch {
    return 'vittare.link/acesso-agil';
  }
}

function resolveMarketplaceSupportTag(item: MarketplaceProduct): string {
  if (item.routineSupport && item.routineSupport.trim()) {
    return item.routineSupport.trim();
  }
  const lower = `${item.name || ''} ${item.description || ''}`.toLowerCase();
  if (lower.includes('creatina')) {
    return 'Preserva força muscular e apoia reserva de energia física e mental';
  }
  if (lower.includes('whey') || lower.includes('prote')) {
    return 'Suporte prático de saciedade e manutenção de massa magra na rotina';
  }
  if (lower.includes('omega') || lower.includes('ômega')) {
    return 'Modulação inflamatória celular e suporte cognitivo diário';
  }
  if (lower.includes('magn')) {
    return 'Relaxamento neuromuscular, recuperação e qualidade do sono';
  }
  return 'Suporte funcional diário alinhado às metas da sua avaliação clínica';
}

export const MarketplaceTab: React.FC<MarketplaceTabProps> = ({ patient }) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const handleOpenAndCopyLink = (e: React.MouseEvent, fullLink: string) => {
    e.stopPropagation();
    if (!fullLink) return;

    const targetUrl =
      fullLink.startsWith('http://') || fullLink.startsWith('https://')
        ? fullLink
        : `https://${fullLink}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(targetUrl);
      }
    } catch (err) {
      console.warn('Falha na cópia do link:', err);
    }

    setCopiedLink(fullLink);
    setTimeout(() => setCopiedLink(null), 2500);

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const marketplaceItems = patient.marketplace || [];

  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full">
      <div className="mb-3">
        <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
          Acesso Ágil
        </div>
      </div>

      {/* Texto de Curadoria com texto justificado e instrução à esquerda */}
      <div className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-3.5 shadow-sm">
        <p className="text-[17px] text-[#ffffff] leading-relaxed text-justify">
          Nossa Curadoria pensa nos mínimos detalhes, e você ganha tempo nas pesquisas e segurança na compra verificada.
        </p>
        <p className="text-[17px] text-[#5eea8f] italic mt-2 font-medium text-left">
          Clique no link verde abaixo
        </p>
      </div>

      {marketplaceItems.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/50 rounded-2xl p-6 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#fbbf24]/15 border border-[#fbbf24]/45 flex items-center justify-center text-[#fbbf24] mx-auto mb-2.5">
            <ShoppingBasket className="w-7 h-7 text-[#fbbf24]" strokeWidth={1.9} />
          </div>
          <div className="text-[18px] font-semibold text-[#ffffff] mb-1">
            Curadoria em Preparação
          </div>
          <p className="text-[17px] text-[#ffffff]/80 leading-relaxed max-w-[290px] mx-auto">
            Os links diretos e verificados de farmácias parceiras e suplementos recomendados pelo Dr. João Paulo Cecato serão listados aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-8 pt-1">
          {marketplaceItems.map((item) => {
            const shortenedLabel = getShortenedDisplayUrl(item.link, item.name);
            const supportTagText = resolveMarketplaceSupportTag(item);

            return (
              <div
                key={item.id}
                className="bg-white/[0.04] border-[1px] border-white/50 rounded-2xl p-3.5 space-y-2.5"
              >
                <div className="flex items-start gap-3">
                  {/* Contêiner de Ícone proporcional 42x43px em Âmbar */}
                  <div className="w-[42px] h-[43px] rounded-xl bg-[#fbbf24]/15 border border-[#fbbf24]/45 flex items-center justify-center text-[#fbbf24] shadow-sm shrink-0 mt-0.5">
                    <ShoppingBasket className="w-[26px] h-[26px] text-[#fbbf24] shrink-0" strokeWidth={1.9} />
                  </div>

                  <div className="grow min-w-0 flex flex-col">
                    {/* 1. Nome do Produto */}
                    <div className="text-[19px] font-semibold text-[#ffffff] leading-snug break-words">
                      {item.name}
                    </div>

                    {/* 2. Posologia / Descrição */}
                    {item.description && (
                      <div className="text-[17px] text-[#ffffff] mt-0.5 leading-snug">
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Propósito na Rotina em itálico fora de caixa */}
                <p className="text-[17px] italic text-[#e8eef5] leading-snug">
                  <span className="font-semibold text-[#fbbf24]">Fórmula Tarde</span>
                  <span className="text-[#5eea8f] font-semibold"> &gt; </span>
                  <span>{supportTagText}</span>
                </p>

                {/* 4. Link de Acesso Rápido + Data */}
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/15 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={(e) => handleOpenAndCopyLink(e, item.link)}
                      className="inline-flex items-center gap-1.5 text-[17px] text-[#5eea8f] hover:underline transition cursor-pointer font-semibold max-w-full"
                      title="Abrir link verificado"
                    >
                      <ExternalLink className="w-4 h-4 shrink-0" />
                      <span className="truncate">{shortenedLabel}</span>
                    </button>

                    {copiedLink === item.link && (
                      <span className="text-[15px] bg-[#0f7a3a] text-[#ffffff] px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1 font-semibold animate-fadeIn">
                        <Check className="w-3.5 h-3.5" /> Link Aberto e Copiado
                      </span>
                    )}
                  </div>

                  <span className="text-[15px] text-[#ffffff]/75">
                    Data: {item.dateStr}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
