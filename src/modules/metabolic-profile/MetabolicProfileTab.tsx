import React, { useState, useMemo } from 'react';
import { PatientProfile } from '../../types/patient';

interface MetabolicProfileTabProps {
  patient: PatientProfile;
}

type TimeBlockId = 'manha' | 'tarde_inicial' | 'tarde_final' | 'noite';
type GoalFilter = 'todos' | 'emagrecimento' | 'massa' | 'energia' | 'foco';

interface TimeBlock {
  id: TimeBlockId;
  label: string;
  timeRange: string;
  icon: string;
  badge: string;
  badgeColor: string;
  description: string;
  insulinSensitivity: 'Alta' | 'Moderada' | 'Baixa';
  energyLevel: 'Em Elevação' | 'Pico Máximo' | 'Moderado' | 'Baixo (Preparo para Sono)';
  recommendedFoods: {
    category: string;
    items: string[];
    benefit: string;
    goals: GoalFilter[];
  }[];
  foodsToAvoid: string[];
}

export const MetabolicProfileTab: React.FC<MetabolicProfileTabProps> = ({ patient }) => {
  const currentHour = new Date().getHours();

  // Determinar bloco inicial baseado na hora atual do sistema
  const defaultBlock: TimeBlockId = useMemo(() => {
    if (currentHour >= 6 && currentHour < 10) return 'manha';
    if (currentHour >= 10 && currentHour < 15) return 'tarde_inicial';
    if (currentHour >= 15 && currentHour < 20) return 'tarde_final';
    return 'noite';
  }, [currentHour]);

  const [selectedBlock, setSelectedBlock] = useState<TimeBlockId>(defaultBlock);
  const [selectedGoal, setSelectedGoal] = useState<GoalFilter>('todos');
  const [simulatedGoal, setSimulatedGoal] = useState<GoalFilter>('emagrecimento');
  const [simulatedTime, setSimulatedTime] = useState<string>('15:30');

  const timeBlocks: TimeBlock[] = [
    {
      id: 'manha',
      label: 'Ativação Matinal',
      timeRange: '06:00 - 10:00',
      icon: 'ti ti-sun',
      badge: 'Sensibilidade Alta',
      badgeColor: 'bg-[#2fd575]/10 text-[#2fd575] border-[#2fd575]/30',
      description: 'Pico natural do cortisol e máxima sensibilidade à insulina. Horário ideal para quebrar o jejum com nutrientes densos.',
      insulinSensitivity: 'Alta',
      energyLevel: 'Em Elevação',
      recommendedFoods: [
        {
          category: 'Proteínas & Gorduras Saudáveis',
          items: ['Ovos mexidos com azeite extra virgem', 'Queijo cottage ou ricota', 'Abacate'],
          benefit: 'Estabiliza glicemia e previne picos de fome ao longo do dia.',
          goals: ['todos', 'emagrecimento', 'massa', 'foco']
        },
        {
          category: 'Fibras & Compostos Bioativos',
          items: ['Aveia integral', 'Sementes de chia ou linhaça', 'Frutas de baixo índice glicêmico (Morango, Mirtilo)'],
          benefit: 'Alimenta a microbiota e melhora a clareza mental.',
          goals: ['todos', 'emagrecimento', 'energia', 'foco']
        }
      ],
      foodsToAvoid: ['Açúcares refinados', 'Sucos industrializados', 'Farinhas brancas em excesso']
    },
    {
      id: 'tarde_inicial',
      label: 'Pico de Performance',
      timeRange: '10:00 - 15:00',
      icon: 'ti ti-[#2fd575] ti-flame',
      badge: 'Eficiência Máxima',
      badgeColor: 'bg-[#e8930c]/10 text-[#e8930c] border-[#e8930c]/30',
      description: 'Capacidade enzimática e metabolismo no ponto mais alto. Janela principal para refeições mais densas em macronutrientes.',
      insulinSensitivity: 'Alta',
      energyLevel: 'Pico Máximo',
      recommendedFoods: [
        {
          category: 'Proteínas de Alto Valor Biológico',
          items: ['Peito de frango grelhado', 'File de peixe (Salmão/Tilápia)', 'Carne magra (Patinho/Maminha)'],
          benefit: 'Suporte para síntese proteica e reparo tecidual.',
          goals: ['todos', 'massa', 'emagrecimento']
        },
        {
          category: 'Carboidratos Complexos & Vegetais',
          items: ['Batata doce ou mandioca', 'Arroz integral ou quinoa', 'Vegetais folhosos escuros (Brócolis, Espinafre)'],
          benefit: 'Sustentação energética contínua sem quebra abrupta de disposição.',
          goals: ['todos', 'energia', 'massa', 'foco']
        }
      ],
      foodsToAvoid: ['Refeições ultraprocessadas e gordurosas', 'Doces concentrados pós-almoço']
    },
    {
      id: 'tarde_final',
      label: 'Absorção & Modulação',
      timeRange: '15:00 - 20:00',
      icon: 'ti ti-bolt',
      badge: 'Janela de Treino',
      badgeColor: 'bg-[#6d7cff]/10 text-[#6d7cff] border-[#6d7cff]/30',
      description: 'Transição da sensibilidade glicêmica. Excelente momento para suplementação pré/pós treino e lanches intermediários inteligentes.',
      insulinSensitivity: 'Moderada',
      energyLevel: 'Moderado',
      recommendedFoods: [
        {
          category: 'Snacks Funcionais & Proteína Rápida',
          items: ['Whey Protein com água de coco', 'Iogurte natural proteico', 'Castanhas do Pará ou nozes'],
          benefit: 'Previne o catabolismo muscular e sacia a fome de final de tarde.',
          goals: ['todos', 'massa', 'emagrecimento', 'energia']
        },
        {
          category: 'Frutas com Fibras',
          items: ['Maçã com canela', 'Banana com farelo de aveia'],
          benefit: 'Fornece glicogênio pré-treino sem inflamar o trato digestivo.',
          goals: ['todos', 'energia', 'foco']
        }
      ],
      foodsToAvoid: ['Cafeína após as 16h', 'Salgados fritos', 'Refrigerantes']
    },
    {
      id: 'noite',
      label: 'Repouso & Jejum Noturno',
      timeRange: '20:00 - 06:00',
      icon: 'ti ti-moon',
      badge: 'Preparo para Sono',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      description: 'A sensibilidade à insulina reduz. O foco metabólico se volta para a reparação celular, síntese de GH e descanso profundo.',
      insulinSensitivity: 'Baixa',
      energyLevel: 'Baixo (Preparo para Sono)',
      recommendedFoods: [
        {
          category: 'Proteínas Leves & Triptofano',
          items: ['Omelete leve com espinafre', 'Chá de camomila ou mulungu', 'Sementes de abóbora'],
          benefit: 'Estimula a produção natural de melatonina e reduz a ansiedade noturna.',
          goals: ['todos', 'emagrecimento', 'foco']
        }
      ],
      foodsToAvoid: ['Carboidratos de alto índice glicêmico à noite', 'Refeições pesadas perto de deitar', 'Álcool']
    }
  ];

  const activeBlockData = timeBlocks.find(b => b.id === selectedBlock) || timeBlocks[0];

  // Cálculo rápido do simulador de sugestão
  const getSimulatedSuggestion = () => {
    const hourNum = parseInt(simulatedTime.split(':')[0], 10) || 15;
    if (simulatedGoal === 'emagrecimento') {
      return {
        title: 'Omelete de claras com espinafre + Chá Verde sem açúcar',
        desc: 'Alta densidade de nutrientes com baixíssima carga calórica. Mantém o glucagon ativo.',
        macro: '18g Prot | 3g Carb | 4g Gord'
      };
    } else if (simulatedGoal === 'massa') {
      return {
        title: 'Panqueca proteica (Whey + Aveia + Banana)',
        desc: 'Excelente aporte de aminoácidos essenciais e carboidratos de absorção gradual.',
        macro: '28g Prot | 35g Carb | 6g Gord'
      };
    } else if (simulatedGoal === 'energia') {
      return {
        title: 'Iogurte grego natural + Mirtilos + Amêndoas',
        desc: 'Energia estável derivada de gorduras nobres e antocianinas antioxidantes.',
        macro: '15g Prot | 18g Carb | 10g Gord'
      };
    } else {
      return {
        title: 'Café bulletproof leve ou Chá Matcha + 2 Nozes',
        desc: 'Triglicerídeos de cadeia média (TCM) estimulam a síntese de corpos cetônicos para o cérebro.',
        macro: '4g Prot | 2g Carb | 14g Gord'
      };
    }
  };

  const currentSuggestion = getSimulatedSuggestion();

  return (
    <div className="space-y-4 pb-8 text-[#e8eef5] font-['Inter',sans-serif]">
      {/* Banner Principal do Perfil Metabólico */}
      <div className="bg-[#121722] border border-[#cfd3dc]/20 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#2fd575]/15 via-[#6d7cff]/10 to-transparent rounded-bl-full pointer-events-none" />
        
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-[#2fd575]/15 border border-[#2fd575]/30 flex items-center justify-center text-[#2fd575]">
            <i className="ti ti-[#2fd575] ti-dna text-[20px]"></i>
          </div>
          <div>
            <h2 className="text-[20px] font-bold text-white tracking-tight leading-none">
              Mapa Funcional
            </h2>
            <p className="text-[13px] text-[#8b98a6] mt-0.5">
              Crononutrição & Ritmo Circadiano de <strong className="text-[#e8eef5] font-semibold">{patient.name.split(' ')[0]}</strong>
            </p>
          </div>
        </div>

        {/* Card do Momento Circadiano Atual */}
        <div className="mt-3.5 bg-[#0a0d12]/80 border border-[#cfd3dc]/15 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2fd575] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#2fd575]"></span>
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#8b98a6] font-semibold">
                Fase Metabólica do Momento ({currentHour}h)
              </p>
              <p className="text-[14px] font-semibold text-white">
                {activeBlockData.label} — {activeBlockData.timeRange}
              </p>
            </div>
          </div>
          <span className={`text-[12px] font-medium px-2.5 py-1 rounded-lg border shrink-0 ${activeBlockData.badgeColor}`}>
            {activeBlockData.badge}
          </span>
        </div>
      </div>

      {/* Blocos Temporais do Ritmo Circadiano (Abas Selecionáveis) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-white flex items-center gap-2">
            <i className="ti ti-clock text-[#2fd575]"></i>
            Cronograma Circadiano Diario
          </h3>
          <span className="text-[12px] text-[#8b98a6]">Clique para explorar</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {timeBlocks.map((block) => {
            const isSelected = selectedBlock === block.id;
            return (
              <button
                key={block.id}
                onClick={() => setSelectedBlock(block.id)}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden active:scale-[0.98] ${
                  isSelected
                    ? 'bg-[#121722] border-[#2fd575]/60 shadow-[0_0_12px_rgba(47,213,117,0.15)]'
                    : 'bg-[#121722]/50 border-white/5 hover:border-white/20 text-[#8b98a6]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <i className={`${block.icon} text-[18px] ${isSelected ? 'text-[#2fd575]' : 'text-[#8b98a6]'}`}></i>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                    isSelected ? block.badgeColor : 'bg-white/5 text-[#8b98a6] border-white/5'
                  }`}>
                    {block.timeRange}
                  </span>
                </div>
                <p className={`text-[13px] font-semibold ${isSelected ? 'text-white' : 'text-[#e8eef5]'}`}>
                  {block.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detalhes do Bloco Selecionado */}
      <div className="bg-[#121722] border border-[#cfd3dc]/20 rounded-2xl p-4 space-y-4">
        {/* Descrição e Indicadores do Bloco */}
        <div className="border-b border-white/10 pb-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[15px] font-bold text-white flex items-center gap-2">
              <i className={`${activeBlockData.icon} text-[#2fd575]`}></i>
              {activeBlockData.label} ({activeBlockData.timeRange})
            </h4>
          </div>
          <p className="text-[13px] text-[#8b98a6] leading-relaxed">
            {activeBlockData.description}
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-[#0a0d12] p-2.5 rounded-xl border border-white/5">
              <p className="text-[11px] text-[#8b98a6]">Sensibilidade Insulínica</p>
              <p className="text-[13px] font-semibold text-[#2fd575]">
                {activeBlockData.insulinSensitivity}
              </p>
            </div>
            <div className="bg-[#0a0d12] p-2.5 rounded-xl border border-white/5">
              <p className="text-[11px] text-[#8b98a6]">Nível de Energia</p>
              <p className="text-[13px] font-semibold text-[#e8930c]">
                {activeBlockData.energyLevel}
              </p>
            </div>
          </div>
        </div>

        {/* Filtro de Objetivos no Mapa de Alimentos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-white">Alimentos Recomendados nesta Janela</p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'emagrecimento', label: 'Emagrecimento' },
              { id: 'massa', label: 'Ganho de Massa' },
              { id: 'energia', label: 'Energia' },
              { id: 'foco', label: 'Foco Mental' }
            ].map((goal) => (
              <button
                key={goal.id}
                onClick={() => setSelectedGoal(goal.id as GoalFilter)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all border ${
                  selectedGoal === goal.id
                    ? 'bg-[#2fd575] text-[#0a0d12] font-semibold border-[#2fd575]'
                    : 'bg-[#0a0d12] border-white/10 text-[#8b98a6] hover:text-white'
                }`}
              >
                {goal.label}
              </button>
            ))}
          </div>

          {/* Cards de Categorias Alimentos */}
          <div className="space-y-2.5 pt-1">
            {activeBlockData.recommendedFoods
              .filter(food => selectedGoal === 'todos' || food.goals.includes(selectedGoal))
              .map((food, idx) => (
                <div key={idx} className="bg-[#0a0d12] border border-[#cfd3dc]/15 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#2fd575] flex items-center gap-1.5">
                      <i className="ti ti-circle-check text-[15px]"></i>
                      {food.category}
                    </span>
                  </div>

                  <ul className="space-y-1 pl-1">
                    {food.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="text-[13px] text-[#e8eef5] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2fd575]/80 shrink-0"></span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <p className="text-[11px] text-[#8b98a6] pt-1 italic border-t border-white/5">
                    💡 <strong className="font-semibold text-white/90">Benefício:</strong> {food.benefit}
                  </p>
                </div>
              ))}
          </div>
        </div>

        {/* Alimentos a Evitar */}
        <div className="bg-[#0a0d12] border border-red-500/20 rounded-xl p-3 space-y-1.5">
          <p className="text-[13px] font-semibold text-red-400 flex items-center gap-1.5">
            <i className="ti ti-alert-triangle text-[15px]"></i>
            Evitar nesta janela de horário
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {activeBlockData.foodsToAvoid.map((item, idx) => (
              <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-300">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bloco Simulador de Lanche Rápido por Horário */}
      <div className="bg-[#121722] border border-[#cfd3dc]/20 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#e8930c]/15 border border-[#e8930c]/30 flex items-center justify-center text-[#e8930c]">
            <i className="ti ti-sparkles text-[18px]"></i>
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-white">Guia Rápido: O que comer agora?</h3>
            <p className="text-[12px] text-[#8b98a6]">Recomendação personalizada de acordo com seu objetivo</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="text-[11px] text-[#8b98a6] block mb-1">Horário Desejado</label>
            <input
              type="time"
              value={simulatedTime}
              onChange={(e) => setSimulatedTime(e.target.value)}
              className="w-full bg-[#0a0d12] border border-white/10 rounded-xl p-2 text-[13px] text-white focus:outline-none focus:border-[#2fd575]"
            />
          </div>

          <div>
            <label className="text-[11px] text-[#8b98a6] block mb-1">Seu Objetivo</label>
            <select
              value={simulatedGoal}
              onChange={(e) => setSimulatedGoal(e.target.value as GoalFilter)}
              className="w-full bg-[#0a0d12] border border-white/10 rounded-xl p-2 text-[13px] text-white focus:outline-none focus:border-[#2fd575]"
            >
              <option value="emagrecimento">Emagrecimento</option>
              <option value="massa">Ganho de Massa</option>
              <option value="energia">Energia / Disposição</option>
              <option value="foco">Foco Mental</option>
            </select>
          </div>
        </div>

        {/* Card de Resultado da Sugestão */}
        <div className="bg-[#0a0d12] border border-[#2fd575]/30 rounded-xl p-3.5 space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#2fd575] uppercase tracking-wide">
              Opção Ideal ({simulatedTime}h)
            </span>
            <span className="text-[10px] bg-[#2fd575]/10 text-[#2fd575] px-2 py-0.5 rounded-full border border-[#2fd575]/30 font-semibold">
              {currentSuggestion.macro}
            </span>
          </div>

          <p className="text-[14px] font-bold text-white">
            {currentSuggestion.title}
          </p>

          <p className="text-[12px] text-[#8b98a6] leading-snug">
            {currentSuggestion.desc}
          </p>
        </div>
      </div>
    </div>
  );
};
