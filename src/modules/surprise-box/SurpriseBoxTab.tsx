import React, { useState, useEffect } from 'react';
import { PatientProfile } from '../../types/patient';
import { Gift, Lock, Unlock, Clock, Sparkles, MessageCircle } from 'lucide-react';

interface SurpriseBoxTabProps {
  patient: PatientProfile;
}

interface GiftOption {
  id: number;
  title: string;
  description?: string;
}

const GIFT_OPTIONS: GiftOption[] = [
  {
    id: 1,
    title: 'Creatina Premium Ultra Filtrada e Micronizada - 300g',
  },
  {
    id: 2,
    title: 'Garrafa Premium Térmica para Café — 1000 ml',
  },
  {
    id: 3,
    title: 'Crédito Continuidade de R$ 30,00, para utilizar na contratação de um novo ciclo se iniciado em até 30 dias, após o término deste.',
  },
];

export const SurpriseBoxTab: React.FC<SurpriseBoxTabProps> = ({ patient }) => {
  const firstName = patient.name ? patient.name.trim().split(' ')[0] : 'Maria';
  const daysRemaining = patient.daysToComplete ?? 28;
  const expirationDateStr = '27/11/2026';

  // Controle de estado da caixa: Trancada (com contagem regressiva) vs. Aberta (revelação dos brindes)
  const [isPreviewUnlocked, setIsPreviewUnlocked] = useState<boolean>(false);
  
  // Estado de seleção do brinde (1 a 4)
  const [selectedGiftId, setSelectedGiftId] = useState<number>(1);

  const [timeLeft, setTimeLeft] = useState({
    days: daysRemaining,
    hours: 14,
    minutes: 35,
    seconds: 42
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenWhatsApp = (messageType: 'antecipar' | 'resgatar') => {
    const chosenGift = GIFT_OPTIONS.find(g => g.id === selectedGiftId) || GIFT_OPTIONS[0];
    const clinicPhone = '5527997918100';
    const text = messageType === 'antecipar'
      ? `Olá Equipe Vittáre! Sou ${patient.name || 'Paciente'} e gostaria de antecipar a renovação do meu ciclo de acompanhamento e garantir meu brinde especial da Caixa Surpresa!`
      : `Olá Equipe Vittáre! Sou ${patient.name || 'Paciente'}, concluí meu ciclo de acompanhamento e escolhi meu brinde da Caixa Surpresa:\n\n🎁 *${chosenGift.title}*\n\nComo faço para realizar a retirada/utilização?`;
    window.open(`https://wa.me/${clinicPhone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full pb-3">
      
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
            Meu Bônus
          </div>
        </div>

        {/* Interruptor de inspeção rápida */}
        <button
          onClick={() => setIsPreviewUnlocked(prev => !prev)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[#cfd3dc] transition active:scale-95 cursor-pointer"
          title="Alternar entre a visão de contagem do paciente e a visão com a caixa aberta"
        >
          {isPreviewUnlocked ? (
            <>
              <Lock className="w-3.5 h-3.5 text-[#5eea8f]" />
              <span>Ver Trancada</span>
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5 text-[#e5a93c]" />
              <span>Ver Aberta</span>
            </>
          )}
        </button>
      </div>

      {/* Conteúdo da Caixa */}
      {!isPreviewUnlocked ? (
        /* ============================================================ */
        /* MODO TRANCADO: COM CONTAGEM REGRESSIVA E EXPECTATIVA         */
        /* ============================================================ */
        <div className="space-y-3">
          
          {/* Cartão Principal da Caixa Misteriosa */}
          <div className="relative overflow-hidden bg-gradient-to-b from-[#1b1535] via-[#121124] to-[#0d0d16] border border-[#7c6af7]/35 rounded-2xl p-4 text-center shadow-lg">
            
            {/* Halo de iluminação de fundo */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#7c6af7]/15 rounded-full blur-2xl pointer-events-none" />

            {/* Cadeado no canto superior */}
            <div className="absolute top-3 right-3 z-10">
              <span className="w-12 h-12 rounded-full bg-black/60 border-2 border-[#e5a93c]/60 flex items-center justify-center text-[28px] text-[#e5a93c] shadow-md">
                <i className="ti ti-lock"></i>
              </span>
            </div>

            {/* Ilustração da Caixa de Surpresa (Sem número flutuante) */}
            <div 
              onClick={() => setIsPreviewUnlocked(true)}
              className="relative inline-block my-1 cursor-pointer group active:scale-95 transition-transform"
              title="Toque para abrir a caixa"
            >
              <div className="w-[88px] h-[88px] mx-auto rounded-2xl bg-gradient-to-tr from-[#5b4bd6] via-[#7c6af7] to-[#e5a93c] p-0.5 shadow-xl flex items-center justify-center group-hover:shadow-[#e5a93c]/20 transition-all">
                <div className="w-full h-full bg-[#121124] rounded-2xl flex flex-col items-center justify-center text-[#e5a93c]">
                  <Gift className="w-[52px] h-[52px] animate-bounce text-[#e5a93c]" style={{ animationDuration: '3s' }} />
                </div>
              </div>
            </div>

            {/* Textos da Caixa Trancada */}
            <div className="mt-2.5">
              <div className="text-[20px] font-bold text-white leading-tight">
                Dia {expirationDateStr}
              </div>
              <div className="text-[18px] text-[#5eea8f] font-medium mt-1">
                (dia que encerra o seu ciclo atual)
              </div>
              <div className="text-[18px] text-[#cfd3dc] font-normal mt-2 leading-snug max-w-sm mx-auto">
                Você <strong className="text-white font-semibold">{firstName}</strong> poderá abrir essa caixa e escolher seu <strong className="text-white font-semibold">brinde exclusivo</strong>!
              </div>
            </div>

            {/* Painel da Contagem Regressiva */}
            <div className="mt-3.5 pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-center gap-1.5 mb-2.5">
                <Clock className="w-[18px] h-[18px] text-[#5eea8f] shrink-0" />
                <span className="text-[16px] text-[#a5a4b8] uppercase tracking-wider font-semibold">
                  Liberação em:
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
                <div className="bg-black/40 border-[1px] border-white/50 rounded-xl py-2 px-1 text-center">
                  <div className="text-[20px] font-bold text-white tabular-nums leading-none">
                    {String(timeLeft.days).padStart(2, '0')}
                  </div>
                  <div className="text-[11px] text-[#e0e0ed] font-medium uppercase mt-1">Dias</div>
                </div>

                <div className="bg-black/40 border-[1px] border-white/50 rounded-xl py-2 px-1 text-center">
                  <div className="text-[20px] font-bold text-white tabular-nums leading-none">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </div>
                  <div className="text-[11px] text-[#e0e0ed] font-medium uppercase mt-1">Horas</div>
                </div>

                <div className="bg-black/40 border-[1px] border-white/50 rounded-xl py-2 px-1 text-center">
                  <div className="text-[20px] font-bold text-white tabular-nums leading-none">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </div>
                  <div className="text-[11px] text-[#e0e0ed] font-medium uppercase mt-1">Min</div>
                </div>

                <div className="bg-black/40 border-[1px] border-white/50 rounded-xl py-2 px-1 text-center">
                  <div className="text-[20px] font-bold text-[#5eea8f] tabular-nums leading-none">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </div>
                  <div className="text-[11px] text-[#5eea8f] font-medium uppercase mt-1">Seg</div>
                </div>
              </div>
            </div>

          </div>

          {/* Botão de Abertura / Ação */}
          <button
            onClick={() => setIsPreviewUnlocked(true)}
            className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-gradient-to-r from-[#0f7a3a] to-[#0b5c2c] hover:from-[#139247] hover:to-[#0f7a3a] border border-[#5eea8f]/40 text-white font-semibold text-[16px] flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition cursor-pointer"
          >
            <Gift className="w-5 h-5 text-[#5eea8f] shrink-0" />
            <span>Abrir Caixa Surpresa</span>
          </button>

        </div>
      ) : (
        /* ============================================================ */
        /* MODO DESBLOQUEADO: CAIXA ABERTA                             */
        /* ============================================================ */
        <div className="space-y-3.5 animate-fadeIn">
          
          {/* Banner de Celebração */}
          <div className="bg-gradient-to-br from-[#122e1b] via-[#101e18] to-[#0d0d16] border border-[#5eea8f]/40 rounded-2xl p-4 text-center shadow-lg relative overflow-hidden">
            <div className="flex justify-center mb-1.5">
              <span className="w-10 h-10 rounded-2xl bg-[#5eea8f]/20 border border-[#5eea8f]/50 flex items-center justify-center text-[#5eea8f] shadow-sm">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </span>
            </div>

            <div className="text-[20px] font-bold text-white leading-tight">
              Parabéns, {firstName}!
            </div>
            <div className="text-[19px] text-[#5eea8f] font-medium mt-1">
              Sua caixa surpresa vittáre foi aberta!
            </div>
            <div className="text-[20px] text-[#cfd3dc] mt-1.5 leading-relaxed max-w-sm mx-auto">
              Você pode escolher UM brinde
            </div>
          </div>

          {/* Cabeçalho da Lista de Brindes */}
          <div className="space-y-3">
            <div className="text-[16px] font-semibold text-white flex items-center gap-2 px-1">
              <Sparkles className="w-4 h-4 text-[#e5a93c]" />
              <span>O que preparamos para você:</span>
            </div>

            {/* Lista unificada com os 4 brindes selecionáveis */}
            <div className="space-y-2.5">
              {GIFT_OPTIONS.map((gift) => {
                const isSelected = selectedGiftId === gift.id;
                return (
                  <div
                    key={gift.id}
                    onClick={() => setSelectedGiftId(gift.id)}
                    className={`rounded-2xl p-4 relative overflow-hidden cursor-pointer transition-all active:scale-[0.99] border ${
                      isSelected
                        ? 'bg-gradient-to-r from-white/[0.08] to-white/[0.04] border-[#5eea8f] shadow-[0_0_15px_rgba(94,234,143,0.15)]'
                        : 'bg-white/[0.03] border-[1px] border-white/50 hover:border-white/60'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Ícone: Quadrado 48x48px com emoji presente */}
                      <div className="w-12 h-12 min-w-12 rounded-xl bg-[#5eea8f]/10 border border-[#5eea8f]/30 flex items-center justify-center text-2xl shadow-xs shrink-0">
                        🎁
                      </div>

                      {/* Nome do produto ou serviço alinhado diretamente */}
                      <div className="grow min-w-0 pr-1">
                        <div 
                          style={{ width: '230px', fontSize: '19px' }}
                          className="w-[230px] text-justify text-[19px] font-bold text-white leading-snug"
                        >
                          {gift.title}
                        </div>
                      </div>

                      {/* Seletor em círculo (Radio) */}
                      <div className="shrink-0 flex items-center justify-center">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-[#5eea8f] bg-[#5eea8f]/20 shadow-sm'
                              : 'border-white/30 bg-transparent'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-3 h-3 rounded-full bg-[#5eea8f]" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botão de Resgate no WhatsApp com o brinde escolhido */}
          <button
            onClick={() => handleOpenWhatsApp('resgatar')}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0f7a3a] via-[#108c43] to-[#0f7a3a] hover:from-[#139247] hover:to-[#108c43] border border-[#5eea8f]/50 text-white font-bold text-[16px] flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 text-white shrink-0" />
            <span>GARANTIR MEU BRINDE</span>
          </button>

        </div>
      )}

    </div>
  );
};
