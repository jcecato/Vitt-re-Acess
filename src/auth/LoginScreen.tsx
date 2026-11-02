import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Lock, ShieldCheck, Fingerprint } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { availablePatients, loginWithPin } = useAuth();
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    availablePatients[0]?.id || 'paciente-maria-paula-01'
  );
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError('');
      if (newPin.length === 4) {
        handleSubmit(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleSubmit = async (pinToSubmit = pin) => {
    if (pinToSubmit.length < 4) {
      setError('Por favor, insira o PIN de 4 dígitos.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    setTimeout(async () => {
      const res = await loginWithPin(selectedPatientId, pinToSubmit);
      setIsLoading(false);
      if (!res.success) {
        setError(res.error || 'Acesso negado.');
        setPin('');
      }
    }, 350);
  };

  const handleBiometric = () => {
    setIsLoading(true);
    setTimeout(async () => {
      const patient = availablePatients.find(p => p.id === selectedPatientId);
      await loginWithPin(selectedPatientId, patient?.pin || '1234');
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="relative w-full h-[100dvh] max-h-[100dvh] sm:h-[844px] sm:max-h-[min(844px,calc(100dvh-1.5rem))] sm:w-[390px] sm:max-w-[430px] mx-auto bg-[#0d0d16] rounded-none sm:rounded-[44px] border-0 sm:border-[2px] sm:border-[#2c2c40] p-5 sm:p-6 flex flex-col justify-between overflow-hidden shadow-2xl text-white select-none font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Topo / Logo */}
      <div className="text-center pt-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7c6af7] to-[#2fd37a] shadow-lg mb-3">
          <svg width="40" height="40" viewBox="0 0 96 96" fill="none">
            <path d="M27 31 L48 67 L69 31" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-[22px] font-['Cormorant_Garamond',serif] font-medium tracking-[0.03em] text-white">
          Vittáre Acess<sup className="text-sm font-semibold text-[#5eea8f] ml-1">™</sup>
        </h1>
        <p className="text-[16px] text-[#a5a4b8] mt-1 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#5eea8f]" /> Acesso Individual do Paciente
        </p>
      </div>

      {/* Seleção de Paciente e PIN */}
      <div className="my-auto py-2">
        <div className="mb-4">
          <label className="block text-[16px] font-semibold text-[#a5a4b8] mb-1.5 uppercase tracking-wider text-center">
            Selecione seu Perfil
          </label>
          <div className="relative">
            <select
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                setPin('');
                setError('');
              }}
              className="w-full bg-[#181828] border border-white/20 rounded-xl py-2.5 px-3.5 text-[18px] text-white focus:outline-none focus:border-[#5eea8f] transition"
            >
              {availablePatients.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#181828] text-white">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Indicadores de PIN */}
        <div className="text-center mb-3">
          <span className="text-[16px] text-[#e8e8f0]">Digite seu PIN de 4 dígitos</span>
          <div className="flex justify-center gap-3.5 mt-2.5">
            {[0, 1, 2, 3].map((index) => {
              const filled = pin.length > index;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border transition-all duration-200 ${
                    filled
                      ? 'bg-[#5eea8f] border-[#5eea8f] scale-110 shadow-[0_0_8px_rgba(94,234,143,0.5)]'
                      : 'border-white/30 bg-transparent'
                  }`}
                />
              );
            })}
          </div>
          {error && <p className="text-sm text-[#ff5f5f] mt-2 animate-bounce">{error}</p>}
        </div>

        {/* Teclado Numérico */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto mt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleNumberClick(digit)}
              className="h-12 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] active:scale-95 border border-white/10 text-xl font-semibold flex items-center justify-center transition cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleBiometric}
            title="Biometria / Face ID"
            className="h-12 rounded-xl bg-[#5eea8f]/15 hover:bg-[#5eea8f]/25 border border-[#5eea8f]/30 text-[#5eea8f] flex items-center justify-center transition cursor-pointer"
          >
            <Fingerprint className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => handleNumberClick('0')}
            className="h-12 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] active:scale-95 border border-white/10 text-xl font-semibold flex items-center justify-center transition cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            title="Apagar"
            className="h-12 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] active:scale-95 border border-white/10 text-base font-semibold flex items-center justify-center transition text-[#a5a4b8] cursor-pointer"
          >
            ⌫
          </button>
        </div>
      </div>

      {/* Rodapé / Informações de Segurança */}
      <div className="pt-2 text-center border-t border-white/10">
        <div className="flex items-center justify-center gap-1.5 text-[16px] text-[#8e8ea6]">
          <Lock className="w-4 h-4 text-[#5eea8f]" /> Acesso individual protegido por criptografia
        </div>
        <div className="mt-1.5 text-[16px] text-[#5eea8f] opacity-80">
          PIN de demonstração: 1234
        </div>
      </div>
    </div>
  );
};
