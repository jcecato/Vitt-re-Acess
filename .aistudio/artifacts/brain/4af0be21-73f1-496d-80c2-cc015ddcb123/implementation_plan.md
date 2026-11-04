# Aba Perfil Metabólico & Mapa de Crononutrição — Vittáre Acess

Implementação da nova aba **"Perfil Metabólico"** no aplicativo Vittáre Acess, apresentando um mapa visual e dinâmico de crononutrição (combinação ideal de alimentos por faixa de horário), curva de energia circadiana, janelas de jejum/glicogênio e simulador interativo de refeições.

## Decisões de Projeto & Confirmações do Usuário

> [!NOTE]
> O usuário pulou as perguntas interativas. Adotaremos as recomendações padrão de alta performance e melhor experiência UX (Dark Mode nativo do Vittáre Acess `#0a0d12` / `#121722`).

- **Modelo Visual do Mapa**: Relógio Circadiano Interativo dividindo o dia em 4 blocos de crononutrição (Despertar & Ativação Metabólica, Janela de Pico de Desempenho, Janela de Absorção & Recuperação, e Repouso/Jejum Noturno).
- **Métricas Metabólicas em Destaque**: Janelas recomendadas de refeições, curva estimada de sensibilidade à insulina/energia e estados de armazenamento/queima de gordura.
- **Interatividade de Alimentos**: Filtros dinâmicos por objetivo (Emagrecimento, Ganho de Massa, Disposição, Foco) com recomendação instantânea de alimentos e horários ideais.

---

## 1. Visão Geral e Conceito Central

- **O que faz**: Oferece ao paciente uma visão clara e científica de como seu metabolismo responde em cada período do dia, indicando os alimentos mais recomendados em cada horário, janelas metabólicas favoráveis e estratégias nutricionais personalizadas.
- **Público-Alvo**: Pacientes da clínica Vittáre que buscam otimizar energia, composição corporal, saúde metabólica e adesão ao plano alimentar.
- **Valor Agregado**: Transforma um plano alimentar estático em um guia visual interativo de crononutrição e ritmo circadiano.

---

## 2. Experiência do Usuário e Design Visual

- **Estética & Tema**:
  - *Cores Base*: Fundo escuro nativo do Vittáre (`#0a0d12`), cards em `#121722`, bordas suaves em `rgba(255,255,255,0.07)` e acentos em verde vitalidade (`#2fd575`), âmbar energia (`#e8930c`) e índigo calmo (`#6d7cff`).
  - *Tipografia*: Hierarquia visual limpa em Inter, numerais tabulares em métricas e rótulos unboxed.
  - *Ergonomia Mobile*: Toques mínimos de 48px, controles na zona de alcance natural do polegar.
- **Componentes Principais da Aba**:
  1. **Cabeçalho & Resumo Circadiano**: Mostrador dinâmico da fase metabólica atual com base no horário real do usuário (ex: "Fase Atual: Janela de Maior Sensibilidade à Insulina").
  2. **Anel Circadiano / Cronograma Visual**: 4 blocos temporais interativos (06h-10h, 10h-15h, 15h-20h, 20h-06h).
  3. **Mapa de Alimentos Otimizados**: Lista interativa com ícones modernos mostrando quais alimentos ingerir (e quais evitar) no bloco horário selecionado.
  4. **Painel de Indicadores Metabólicos**: Cards de Taxa Metabólica Basal, Carga Glicêmica Estimada e Janela de Jejum.
  5. **Simulador / Sugestor de Lanches**: Seleção rápida de objetivo para recomendação imediata do melhor alimento para aquele exato momento.

---

## 3. Decisões Técnicas e Arquitetura

- **Arquitetura Modular**: Criação do módulo `src/modules/metabolic-profile/MetabolicProfileTab.tsx` integrado ao gerenciador de navegação por abas existente no aplicativo.
- **Gerenciamento de Estado**: Estado local sincronizado com o horário do sistema (`new Date()`) para destacar a fase metabólica do momento.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Vittáre Acess — App Layout                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Aba Selecionada: Perfil Metabólico (Nova Aba)           │
├────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 1. Status Metabólico em Tempo Real (Fase Circadiana Atual)         │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 2. Selector de Fase Circadiana (06-10h | 10-15h | 15-20h | 20-06h) │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 3. Mapa Visual de Alimentos & Combinações Otimizadas                │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 4. Indicadores: Sensibilidade à Insulina | Energia | Jejum Noturno │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 5. Guia Interativo: O que comer agora? (Filtro por Objetivo)       │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Plano de Execução em Passos

1. **Criação do Módulo `MetabolicProfileTab.tsx`**:
   - Construção dos cards com métricas circadiana, alimentos recomendados e alertas metabólicos.
   - Design responsivo mobile-first mantendo o alinhamento estético `#121722` e cores `#cfd3dc` / `#2fd575`.
2. **Integração na Navegação Principal**:
   - Adicionar o botão/ícone "Perfil Metabólico" no menu inferior de navegação e na lista de abas.
3. **Validação e Compilação**:
   - Verificação de tipos TypeScript e execução do `compile_applet`.
