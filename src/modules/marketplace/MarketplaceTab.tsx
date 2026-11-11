import React, { useState } from 'react';
import { PatientProfile } from '../../types/patient';
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

export const MarketplaceTab: React.FC<MarketplaceTabProps> = ({ patient }) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const handleOpenAndCopyLink = (e: React.MouseEvent, fullLink: string) => {
    e.stopPropagation();
    if (!fullLink) return;

    // Normaliza para protocolo seguro https://
    const targetUrl = fullLink.startsWith('http://') || fullLink.startsWith('https://')
      ? fullLink
      : `https://${fullLink}`;

    // Copia silenciosamente a URL completa para a área de transferência
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(targetUrl);
      }
    } catch (err) {
      console.warn('Falha na cópia do link:', err);
    }

    setCopiedLink(fullLink);
    setTimeout(() => setCopiedLink(null), 2500);

    // Abre a URL externa em nova aba segura
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
        <p className="text-[18px] text-white leading-relaxed text-justify">
          Nossa Curadoria pensa nos mínimos detalhes, e você ganha tempo nas pesquisas e segurança na compra verificada.
        </p>
        <p className="text-[18px] text-[#5eea8f] italic mt-2 font-medium text-left">
          Clique no link verde abaixo
        </p>
      </div>

      {marketplaceItems.length === 0 ? (
        /* Estado Vazio Elegante quando o CRM ainda não cadastrou links */
        <div className="bg-white/[0.04] border border-white/20 rounded-2xl p-6 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-amber-400 mx-auto mb-2.5">
            <ShoppingBasket className="w-7 h-7 text-amber-400" strokeWidth={1.9} />
          </div>
          <div className="text-[18px] font-semibold text-white mb-1">
            Curadoria em Preparação
          </div>
          <p className="text-[14px] text-[#a5a4b8] leading-relaxed max-w-[290px] mx-auto">
            Os links diretos e verificados de farmácias parceiras e suplementos recomendados pelo Dr. João Paulo Cecato serão listados aqui.
          </p>
        </div>
      ) : (
        /* Lista de Produtos / Links com Formatação Encurtada */
        <div className="space-y-2.5 pt-1">
          {marketplaceItems.map((item) => {
            const shortenedLabel = getShortenedDisplayUrl(item.link, item.name);

            return (
              <div key={item.id} className="bg-white/[0.03] border-[1px] border-white/50 rounded-2xl p-3 flex items-start sm:items-center gap-3">
                {/* Contêiner de Ícone proporcional 42x43px com -ml-[5px] e cesta moderna */}
                <div className="w-[42px] h-[43px] -ml-[5px] rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-amber-400 shadow-sm shrink-0 mt-0.5 sm:mt-0">
                  <ShoppingBasket className="w-[26px] h-[26px] text-amber-400 shrink-0" strokeWidth={1.9} />
                </div>

                <div className="grow min-w-0 flex flex-col">
                  {/* 1. Nome do Produto (ex.: Creatina) */}
                  <div className="text-[19px] font-semibold text-white leading-snug truncate">
                    {item.name}
                  </div>

                  {/* 2. Posologia / Descrição (ex.: 1 dosador ao dia) */}
                  {item.description && (
                    <div className="text-[17px] sm:text-[18px] text-[#e0e0ed] mt-0.5 leading-snug">
                      {item.description}
                    </div>
                  )}

                  {/* 3. Link de Acesso Rápido */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={(e) => handleOpenAndCopyLink(e, item.link)}
                      className="inline-flex items-center gap-1.5 text-[15px] sm:text-[16px] text-[#5eea8f] hover:underline transition cursor-pointer font-medium max-w-full"
                      title="Abrir link verificado"
                    >
                      <ExternalLink className="w-4 h-4 shrink-0" />
                      <span className="truncate">{shortenedLabel}</span>
                    </button>

                    {copiedLink === item.link && (
                      <span className="text-[12px] bg-[#0f7a3a] text-white px-2 py-0.5 rounded-md inline-flex items-center gap-1 font-semibold animate-fadeIn">
                        <Check className="w-3 h-3" /> Link Aberto e Copiado
                      </span>
                    )}
                  </div>

                  {/* 4. Data de Atualização no Rodapé */}
                  <div className="text-[13px] sm:text-[14px] text-[#8e8da8] mt-1.5 flex items-center gap-1">
                    <span>Atualizado: {item.dateStr}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
