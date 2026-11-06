import React, { useState, useEffect } from 'react';

interface SmartSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName?: string;
}

export const SmartSupportModal: React.FC<SmartSupportModalProps> = ({
  isOpen,
  onClose,
  patientName = 'Paciente'
}) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'caderno'>('faq');
  const [noteText, setNoteText] = useState<string>('');
  const [isMonday, setIsMonday] = useState<boolean>(false);

  useEffect(() => {
    // Verifica se hoje é segunda-feira (0 = Domingo, 1 = Segunda, 2 = Terça, ...)
    const dayOfWeek = new Date().getDay();
    setIsMonday(dayOfWeek === 1);

    // Carrega rascunho de anotações salvo no aparelho
    const savedDraft = localStorage.getItem('vittare_caderno_2a_feira');
    if (savedDraft) {
      setNoteText(savedDraft);
    }
  }, []);

  const handleSaveDraft = (text: string) => {
    setNoteText(text);
    localStorage.setItem('vittare_caderno_2a_feira', text);
  };

  const handleSendMondayNote = () => {
    if (!noteText.trim()) return;
    const phoneNumber = '5527997918100';
    const message = encodeURIComponent(
      `📝 Caderno de Dúvidas de 2ª Feira — Paciente: ${patientName}\n\n${noteText}`
    );
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'Como tomar minhas fórmulas manipuladas nos horários corretos?',
      a: 'Acesse a aba "Fórmulas & Suprimentos" para visualizar os horários exatos e orientações de ingestão (em jejum, após refeições ou antes de dormir).'
    },
    {
      q: 'Posso fazer substituições na minha Rotina Alimentar?',
      a: 'Sim! Na aba "Rotina Alimentar", utilize a tabela de equivalentes para substituir proteínas, carboidratos ou vegetais sem alterar o aporte calórico do plano.'
    },
    {
      q: 'Onde encontro minhas guias de exames de laboratório?',
      a: 'Todas as guias de solicitação emitidas pelo médico ficam salvas na aba "Meus Exames & Guias" em formato PDF para download ou impressão.'
    },
    {
      q: 'Quando deve ser enviado meu relato de evolução semanal?',
      a: 'Recomendamos preencher o registro de peso e hábitos na aba "Meu Bem-Estar" semanalmente, preferencialmente em jejum pela manhã.'
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none font-['Plus_Jakarta_Sans',sans-serif]"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-full sm:max-w-[460px] max-h-[90vh] bg-[#10121d] border-[1px] border-white/50 rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl flex flex-col justify-between overflow-y-auto text-[#eef4f8] animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#5eea8f]/15 border border-[#5eea8f]/40 flex items-center justify-center text-[#5eea8f]">
              <i className="ti ti-help-circle text-[22px]"></i>
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-white leading-snug">
                Central de Apoio Clínico
              </h2>
              <p className="text-[13px] text-[#8b9aa7]">Orientação ágil e Plantão de 2ª Feira</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-2xl font-bold cursor-pointer transition shrink-0"
          >
            ×
          </button>
        </div>

        {/* Abas Internas */}
        <div className="flex gap-2 p-1 bg-white/[0.04] border border-white/20 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('faq')}
            className={`flex-1 py-2 px-3 rounded-lg text-[14px] font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'faq'
                ? 'bg-[#5eea8f] text-[#0a0d14] shadow-sm'
                : 'text-[#8b9aa7] hover:text-white'
            }`}
          >
            <i className="ti ti-bulb text-[16px]"></i>
            <span>Dúvidas Rápidas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('caderno')}
            className={`flex-1 py-2 px-3 rounded-lg text-[14px] font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'caderno'
                ? 'bg-[#5eea8f] text-[#0a0d14] shadow-sm'
                : 'text-[#8b9aa7] hover:text-white'
            }`}
          >
            <i className="ti ti-notebook text-[16px]"></i>
            <span>Caderno de 2ª Feira</span>
          </button>
        </div>

        {/* Conteúdo da Aba 1: Dúvidas Frequentes */}
        {activeTab === 'faq' && (
          <div className="space-y-3 py-1 overflow-y-auto max-h-[360px] pr-1">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="bg-white/[0.03] border border-white/20 rounded-2xl p-4 space-y-1.5"
              >
                <div className="text-[15px] font-bold text-[#5eea8f] flex items-start gap-2">
                  <i className="ti ti-point-filled mt-0.5 shrink-0"></i>
                  <span>{faq.q}</span>
                </div>
                <p className="text-[14px] text-[#cfd3dc] leading-relaxed pl-5">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Conteúdo da Aba 2: Caderno de 2ª Feira */}
        {activeTab === 'caderno' && (
          <div className="space-y-4 py-1">
            <div className="bg-[#1a1f33] border border-white/30 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-[#ffd000] uppercase tracking-wider flex items-center gap-1.5">
                  <i className="ti ti-calendar-event text-[18px]"></i>
                  Plantão de Dúvidas de 2ª Feira
                </span>
                {isMonday ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#1f9d57]/20 border border-[#1f9d57] text-[#5eea8f] text-[12px] font-bold animate-pulse">
                    Liberado Hoje!
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[12px] font-bold">
                    Trava Ativa
                  </span>
                )}
              </div>
              <p className="text-[13px] text-[#cfd3dc] leading-relaxed">
                Anote aqui suas dúvidas sobre o tratamento ao longo da semana. Às segundas-feiras, nosso canal do WhatsApp estará liberado para receber seu caderno direto da clínica.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-[#8b9aa7]">
                Suas Anotações da Semana:
              </label>
              <textarea
                value={noteText}
                onChange={(e) => handleSaveDraft(e.target.value)}
                placeholder="Ex: Tive dúvida sobre o horário do suplemento Y na quarta-feira..."
                rows={4}
                className="w-full p-3.5 rounded-2xl bg-white/[0.04] border border-white/30 text-white text-[15px] focus:border-[#5eea8f] focus:outline-none transition resize-none placeholder:text-[#5d6b79]"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSendMondayNote}
                disabled={!isMonday || !noteText.trim()}
                className={`w-full py-3.5 px-4 rounded-xl text-[16px] font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${
                  isMonday && noteText.trim()
                    ? 'bg-[#5eea8f] text-[#0a0d14] hover:bg-[#4cd97e] active:scale-95'
                    : 'bg-white/10 text-white/40 border border-white/10 cursor-not-allowed'
                }`}
              >
                <span>
                  {isMonday ? 'Enviar Caderno pelo WhatsApp' : 'Envio Liberado Apenas às Segundas-Feiras'}
                </span>
                <i className="ti ti-brand-whatsapp text-[20px]"></i>
              </button>
            </div>
          </div>
        )}

        {/* Rodapé com botão fechar */}
        <div className="pt-4 mt-3 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-[15px] transition cursor-pointer"
          >
            Fechar Central
          </button>
        </div>
      </div>
    </div>
  );
};
