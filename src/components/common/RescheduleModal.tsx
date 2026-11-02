import React, { useState } from 'react';
import { Calendar, Clock, X, Check } from 'lucide-react';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newDate: string) => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const [selectedDate, setSelectedDate] = useState('02/12/2026');
  const [selectedTime, setSelectedTime] = useState('14:30');
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const dates = [
    { day: '02/12/2026', label: 'Quarta-feira' },
    { day: '04/12/2026', label: 'Sexta-feira' },
    { day: '08/12/2026', label: 'Terça-feira' },
    { day: '11/12/2026', label: 'Sexta-feira' }
  ];

  const times = ['09:00', '11:00', '14:30', '16:00', '17:30'];

  const handleSave = () => {
    setConfirmed(true);
    setTimeout(() => {
      onConfirm(`${selectedDate} · ${selectedTime}`);
      setConfirmed(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 font-['Plus_Jakarta_Sans',sans-serif]">
      <div 
        className="w-full max-w-full sm:max-w-[420px] bg-[#14142a] border-t sm:border border-white/20 rounded-t-[28px] sm:rounded-[28px] p-5 shadow-2xl animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#7c6af7]" />
            <span className="text-[18px] font-['Cormorant_Garamond',serif] font-medium tracking-[0.03em] text-white">Remarcar Consulta</span>
          </div>
          <button onClick={onClose} className="text-white hover:text-[#5eea8f] p-1 cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-[16px] text-[#a5a4b8] mb-3.5">
          Selecione a melhor data e horário para a sua revisão com o profissional.
        </p>

        <div className="space-y-1.5 mb-3">
          <span className="text-[16px] font-semibold text-[#e8e8f0] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#5eea8f]" /> Datas disponíveis
          </span>
          <div className="grid grid-cols-2 gap-2">
            {dates.map((d) => (
              <button
                key={d.day}
                onClick={() => setSelectedDate(d.day)}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  selectedDate === d.day
                    ? 'border-[#5eea8f] bg-[#5eea8f]/15 text-[#5eea8f]'
                    : 'border-white/15 bg-white/[0.04] text-white hover:bg-white/10'
                }`}
              >
                <div className="text-[16px] font-bold">{d.day}</div>
                <div className="text-[14px] opacity-75">{d.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <span className="text-[16px] font-semibold text-[#e8e8f0] flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[#5eea8f]" /> Horários livres
          </span>
          <div className="flex flex-wrap gap-2">
            {times.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTime(t)}
                className={`px-3 py-1.5 rounded-xl border text-[16px] font-semibold transition cursor-pointer ${
                  selectedTime === t
                    ? 'border-[#5eea8f] bg-[#5eea8f]/15 text-[#5eea8f]'
                    : 'border-white/15 bg-white/[0.04] text-white hover:bg-white/10'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={confirmed}
          className="w-full py-3 rounded-xl bg-[#0f7a3a] border border-[#5eea8f] text-white text-[16px] font-bold flex items-center justify-center gap-2 hover:bg-[#138e45] active:scale-95 transition cursor-pointer"
        >
          {confirmed ? (
            <>
              <Check className="w-4 h-4 text-[#5eea8f]" /> Reagendado no CRM!
            </>
          ) : (
            'Confirmar Remarcação'
          )}
        </button>
      </div>
    </div>
  );
};
