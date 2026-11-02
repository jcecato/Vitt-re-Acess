import React, { useState, useEffect } from 'react';
import { PatientProfile } from '../../types/patient';
import { Gift, Lock, Unlock, Clock, Sparkles, CheckCircle2, MessageCircle, ShieldCheck } from 'lucide-react';

interface SurpriseBoxTabProps {
  patient: PatientProfile;
}

export const SurpriseBoxTab: React.FC<SurpriseBoxTabProps> = ({ patient }) => {
  const firstName = patient.name ? patient.name.trim().split(' ')[0] : 'Maria';
  const daysRemaining = patient.daysToComplete ?? 28;
  const expirationDateStr = '27/11/2026';

  // Controle de estado da caixa: Trancada (com contagem regressiva) vs. Aberta (revelação dos 2 brindes)
  const [isPreviewUnlocked, setIsPreviewUnlocked] = useState<boolean>(false);

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
    const text = messageType === 'antecipar'
      ? `Olá Dr. João Paulo! Sou ${patient.name} e gostaria de antecipar a renovação do meu ciclo de acompanhamento na Vittare e garantir meus 2 brindes especiais da Caixa Surpresa!`
      : `Olá Dr. João Paulo! Sou ${patient.name}, meu ciclo na Vittare concluiu e quero resgatar minha Creatina Ultra Micronizada 300g e a Condição de Valor Congelado para o meu novo ciclo!`;
    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-3.5 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full pb-3">
      
      {/* div 1 do componente: Cabeçalho em Cormorant Garamond 20px com Alinhamento à Esquerda */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="text-[20px] font-['Cormorant_Garamond',serif] font-medium tracking-[0.02em] text-[#5eea8f] leading-tight">
            Caixa Surpresa Vittare
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

      {/* div 2 do componente: Bloco de conteúdo da Caixa */}
      {!isPreviewUnlocked ? (
        /* ============================================================ */
        /* MODO TRANCADO: COM CONTAGEM REGRESSIVA E EXPECTATIVA         */
        /* ============================================================ */
        <div className="space-y-3">
          
          {/* div 1 (marcado): Cartão Principal da Caixa Misteriosa */}
          <div className="relative overflow-hidden bg-gradient-to-b from-[#1b1535] via-[#121124] to-[#0d0d16] border border-[#7c6af7]/35 rounded-2xl p-4 text-center shadow-lg">
            
            {/* div 1 interno: Halo de iluminação de fundo */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#7c6af7]/15 rounded-full blur-2xl pointer-events-none" />

            {/* div 2 interno: Cadeado posicionado no canto superior em cima da borda (+100% de tamanho) */}
            <div className="absolute top-3 right-3 z-10">
              <span className="w-12 h-12 rounded-full bg-black/60 border-2 border-[#e5a93c]/60 flex items-center justify-center text-[28px] text-[#e5a93c] shadow-md">
                <i className="ti ti-lock"></i>
              </span>
            </div>

            {/* div 3 interno: Ilustração da Caixa de Surpresa com SVG aumentado em 30% e Span '2' em 50% */}
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
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e5a93c] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-[#e5a93c] items-center justify-center text-[13px] font-bold text-black shadow-sm">
                  2
                </span>
              </span>
            </div>

            {/* div 4 interno: Textos ajustados rigorosamente conforme CSS e solicitação */}
            <div className="mt-2.5">
              <div className="text-[20px] font-bold text-white leading-tight">
                Dia {expirationDateStr}
              </div>
              <div className="text-[18px] text-[#5eea8f] font-medium mt-1">
                (dia que encerra o seu ciclo atual)
              </div>
              <div className="text-[18px] text-[#cfd3dc] font-normal mt-2 leading-snug max-w-sm mx-auto">
                Você <strong className="text-white font-semibold">{firstName}</strong> poderá abrir essa caixa e revelaremos <strong className="text-white font-semibold">2 brindes exclusivos</strong>!
              </div>
            </div>

            {/* div 5 interno: Painel da Contagem Regressiva */}
            <div className="mt-3.5 pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-center gap-1.5 mb-2.5">
                <Clock className="w-[18px] h-[18px] text-[#5eea8f] shrink-0" />
                <span className="text-[16px] text-[#a5a4b8] uppercase tracking-wider font-semibold">
                  Liberação em:
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
                <div className="bg-black/40 border border-white/10 rounded-xl py-2 px-1 text-center">
                  <div className="text-[20px] font-bold text-white tabular-nums leading-none">
                    {String(timeLeft.days).padStart(2, '0')}
                  </div>
                  <div className="text-[11px] text-[#8e8ea6] font-medium uppercase mt-1">Dias</div>
                </div>

                <div className="bg-black/40 border border-white/10 rounded-xl py-2 px-1 text-center">
                  <div className="text-[20px] font-bold text-white tabular-nums leading-none">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </div>
                  <div className="text-[11px] text-[#8e8ea6] font-medium uppercase mt-1">Horas</div>
                </div>

                <div className="bg-black/40 border border-white/10 rounded-xl py-2 px-1 text-center">
                  <div className="text-[20px] font-bold text-white tabular-nums leading-none">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </div>
                  <div className="text-[11px] text-[#8e8ea6] font-medium uppercase mt-1">Min</div>
                </div>

                <div className="bg-black/40 border border-white/10 rounded-xl py-2 px-1 text-center">
                  <div className="text-[20px] font-bold text-[#5eea8f] tabular-nums leading-none">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </div>
                  <div className="text-[11px] text-[#5eea8f] font-medium uppercase mt-1">Seg</div>
                </div>
              </div>
            </div>

          </div>

          {/* Botão de Toque para Abrir a Caixa / Antecipar */}
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
        /* MODO DESBLOQUEADO: QUANDO ABRIR A CAIXA                     */
        /* Revela 'O que o Dr. João Paulo preparou para você' e WhatsApp*/
        /* ============================================================ */
        <div className="space-y-3 animate-fadeIn">
          
          {/* Banner de Celebração com a Caixa Aberta */}
          <div className="bg-gradient-to-br from-[#122e1b] via-[#101e18] to-[#0d0d16] border border-[#5eea8f]/40 rounded-2xl p-4 text-center shadow-lg relative overflow-hidden">
            <div className="flex justify-center mb-1.5">
              <span className="w-10 h-10 rounded-2xl bg-[#5eea8f]/20 border border-[#5eea8f]/50 flex items-center justify-center text-[#5eea8f] shadow-sm">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </span>
            </div>

            <div className="text-[20px] font-bold text-white leading-tight">
              Parabéns, {firstName}!
            </div>
            <div className="text-[15px] text-[#5eea8f] font-medium mt-1">
              Sua Caixa Surpresa Vittare foi aberta!
            </div>
            <div className="text-[14px] text-[#cfd3dc] mt-1.5 leading-relaxed max-w-sm mx-auto">
              Ao dar início ao seu novo ciclo de acompanhamento, você tem direito imediato a estes <strong>2 brindes exclusivos</strong>:
            </div>
          </div>

          {/* O que o Dr. João Paulo preparou para você (Seção detalhada com os 2 brindes) */}
          <div className="space-y-2.5">
            <div className="text-[16px] font-semibold text-white flex items-center gap-2 px-1">
              <Sparkles className="w-4 h-4 text-[#e5a93c]" />
              <span>O que o Dr. João Paulo preparou para você:</span>
            </div>

            {/* BRINDE 1: Creatina Ultra Filtrada e Micronizada 300g */}
            <div className="bg-white/[0.04] border border-[#5eea8f]/30 rounded-2xl p-4 relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#5eea8f]/10 border border-[#5eea8f]/30 flex items-center justify-center text-[#5eea8f] shrink-0 text-2xl shadow-xs">
                  💊
                </div>
                <div className="grow min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-bold text-[#5eea8f] uppercase tracking-wider bg-[#5eea8f]/10 border border-[#5eea8f]/20 rounded-md px-2 py-0.5">
                      Brinde 1 · Produto Físico
                    </span>
                  </div>
                  <div className="text-[18px] font-bold text-white mt-1 leading-snug">
                    Creatina Ultra Filtrada e Micronizada 300g
                  </div>
                  <div className="text-[14px] text-[#cfd3dc] mt-1.5 leading-relaxed">
                    Pote lacrado de 300g com pureza 100% farmacêutica e alta absorção intestinal. Entregue diretamente no seu endereço para potencializar seus ganhos de força, retenção de massa magra e foco cognitivo no novo ciclo.
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.5 text-[13px] text-[#5eea8f]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Entrega inclusa sem custo adicional no plano</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BRINDE 2: Valor de Mensalidade Congelado */}
            <div className="bg-white/[0.04] border border-[#7c6af7]/35 rounded-2xl p-4 relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#7c6af7]/10 border border-[#7c6af7]/30 flex items-center justify-center text-[#7c6af7] shrink-0 text-2xl shadow-xs">
                  💎
                </div>
                <div className="grow min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-bold text-[#e5a93c] uppercase tracking-wider bg-[#e5a93c]/10 border border-[#e5a93c]/20 rounded-md px-2 py-0.5">
                      Brinde 2 · Condição Exclusiva
                    </span>
                  </div>
                  <div className="text-[18px] font-bold text-white mt-1 leading-snug">
                    Tabela Especial: Valor de Mensalidade Congelado
                  </div>
                  <div className="text-[14px] text-[#cfd3dc] mt-1.5 leading-relaxed">
                    Garantia de manutenção da sua tabela atual sem aplicação de reajuste anual de honorários. Você assegura seu acompanhamento premium com o Dr. João Paulo pelo mesmo valor de investimento do ciclo anterior.
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.5 text-[13px] text-[#7c6af7]">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-[#5eea8f]" />
                    <span>Vantagem garantida para renovação de ciclo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Resgate no WhatsApp */}
          <button
            onClick={() => handleOpenWhatsApp('resgatar')}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0f7a3a] via-[#108c43] to-[#0f7a3a] hover:from-[#139247] hover:to-[#108c43] border border-[#5eea8f]/50 text-white font-bold text-[16px] flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 text-white shrink-0" />
            <span>Garantir Meus 2 Brindes no WhatsApp</span>
          </button>

          <div className="text-center text-[12px] text-[#8e8ea6] pt-0.5">
            Válido exclusivamente para continuidade do acompanhamento com a equipe Vittare.
          </div>

        </div>
      )}

    </div>
  );
};
