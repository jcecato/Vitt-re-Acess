# Caixa Surpresa Vittare — Recompensas e Renovação de Ciclo

Implementação de uma nova aba exclusiva ao final da barra de navegação superior, desenhada para engajar e fidelizar o paciente da clínica Vittare. A aba traz uma experiência de "Caixa de Surpresa" com contagem regressiva precisa até o término do ciclo de acompanhamento (baseada em `daysToComplete`), mantendo-se em estado de expectativa até a data prevista, quando revela 2 benefícios estratégicos para continuidade do tratamento nutricional.

---

## Decisões Confirmadas & Parâmetros do Usuário

> [!IMPORTANT]
> Decisões alinhadas na rodada de clarificação prévia:

- **Nome da Aba**: `Caixa Surpresa` (posicionada como 14ª aba, imediatamente após "Encaminhamentos").
- **Recompensas Escolhidas**:
  1. *Brinde Físico*: **Creatina Ultra Filtrada e Micronizada 300g** com envio/entrega garantida no novo ciclo.
  2. *Vantagem Financeira*: **Condição Especial de Renovação com Valor de Mensalidade Congelado** (garantia de tabela anterior sem reajuste anual).
- **Comportamento Pré-Vencimento**: Trancada com **contagem regressiva dinâmica** (dias, horas, minutos) calculada a partir da data de término do ciclo (`30/10/2026` + 28 dias), com teaser elegante dos 2 presentes que serão revelados.
- **Ação de Renovação**: Botão direto integrado para falar com a equipe Vittare / Dr. João Paulo via WhatsApp para garantir os benefícios imediatamente.

---

## 1. Visão Geral & Conceito Clínico

- **Objetivo**: Transformar a etapa final do ciclo nutricional em um momento de celebração e incentivo à continuidade do tratamento, combatendo a evasão comum no fim de planos de consulta.
- **Público-Alvo**: Pacientes em acompanhamento na clínica Vittare (perfil Maria Paula Santos e demais pacientes do CRM).
- **Proposta de Valor**: 
  - *Paciente*: Sensação de conquista, recompensa tangível de alta eficácia comprovada (creatina de pureza farmacêutica) e proteção financeira contra aumento de honorários.
  - *Clínica/Nutricionista*: Aumento previsível na taxa de retenção (LTV), ciclo contínuo de evolução clínica e estreitamento do vínculo médico-paciente.

---

## 2. Experiência do Usuário & Design Visual

Seguindo as diretrizes de design móvel da Vittare (Mobile-First, tipografia Cormorant Garamond + Plus Jakarta Sans, paleta escura com toques esmeralda `#5eea8f`, violeta `#7c6af7` e detalhes dourados):

### Fluxo de Uso do Paciente

```
┌────────────────────────────────────────────────────────┐
│ 1. Barra de Navegação Superior                         │
│ [Início] [Evolução] ... [Encaminhamentos] [🎁 Caixa]  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. Tela "Caixa Surpresa" (Antes da Data de Expiração)  │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Título: Caixa Surpresa Vittare                     │ │
│ │ Data de Liberação: 27/11/2026 (Fim do ciclo)       │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│   [ 🎁 Ilustração / Caixa Holográfica Trancada ]       │
│                                                        │
│   Contagem Regressiva:                                 │
│   ┌──────────┬──────────┬──────────┐                   │
│   │ 28 DIAS  │ 14 HORAS │ 32 MIN   │                   │
│   └──────────┴──────────┴──────────┘                   │
│                                                        │
│   "No dia do encerramento do seu ciclo atual,          │
│    esta caixa será liberada com 2 presentes especiais  │
│    preparados pelo Dr. João Paulo para o seu novo      │
│    ciclo de saúde."                                    │
│                                                        │
│   [ Botão: Quero Antecipar Meu Novo Ciclo ]            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼ (Quando expira ou ao antecipar)
┌────────────────────────────────────────────────────────┐
│ 3. Estado Desbloqueado (Abertura da Caixa)             │
│                                                        │
│   ✨ Caixa Aberta com Brilho Esmeralda & Dourado       │
│                                                        │
│   🎁 BENEFÍCIO 1:                                      │
│   Creatina Ultra Filtrada e Micronizada 300g           │
│   (Envio direto para sua residência no novo ciclo)     │
│                                                        │
│   💎 BENEFÍCIO 2:                                      │
│   Condição Exclusiva de Renovação com Valor Congelado  │
│   (Sem reajuste, mantendo seu valor promocional)       │
│                                                        │
│   [ Botão WhatsApp: Resgatar e Iniciar Novo Ciclo ]    │
└────────────────────────────────────────────────────────┘
```

### Paleta & Componentes Visuais
- **Fundo**: `#0d0d16` com gradiente sutil `from-[#1c163a]/40 to-[#0d0d16]`.
- **Destaque da Caixa**: Caixa de presente estilizada com laço esmeralda/dourado e efeito suave de respiração (halo luminoso).
- **Cartões de Benefício**: Superfícies escuras translúcidas com bordas delicadas (`border-white/10`), ícones temáticos de alta fidelidade e tipografia de alto contraste para leitura sem esforço.
- **Botões de Ação**: Botão principal com área de toque mínima de $48\text{px}$ e feedback tátil ao toque (`active:scale-95`).

---

## 3. Decisões Técnicas & Arquitetura

### A. Modularização
- **Nova Aba**: `src/modules/surprise-box/SurpriseBoxTab.tsx`.
- **Registro Global de Navegação**: Atualização de `NAVIGATION_TABS` em `src/config/constants.ts` com a entrada `{ id: 'caixa-surpresa', label: 'Caixa Surpresa', iconClass: 'ti ti-gift' }`.
- **Integração no App Shell**: Adição da aba no `App.tsx` para renderização sob demanda, preservando a política de isolamento e zero vazamento de layout.

### B. Cálculo da Data de Expiração do Ciclo
- A data de liberação é calculada a partir de `patient.daysToComplete` (ex.: 28 dias a partir de `30/10/2026`, resultando em `27/11/2026`).
- Caso o usuário deseje testar a caixa aberta imediatamente, um interruptor de demonstração (ou clique sutil no cadeado) permite visualizar tanto o modo trancado quanto o modo revelado, garantindo facilidade de revisão pelo nutricionista.

```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITETURA DE DADOS                     │
├─────────────────────────────────────────────────────────────┤
│  PatientProfile (CRM Store)                                 │
│  ├── daysToComplete: 28                                     │
│  ├── lastAccess: "30/10/2026"                               │
│  └── targetCycleEndDate = addDays(baseDate, daysToComplete) │
│                                                             │
│  SurpriseBoxTab State:                                      │
│  ├── isUnlocked: now >= targetDate || previewMode           │
│  ├── countdown: { days, hours, minutes, seconds }           │
│  └── handleClaimRewards() -> WhatsApp API dispatch          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Plano de Implementação Passo a Passo

1. **Constantes e Rota (`src/config/constants.ts`)**:
   - Adicionar `{ id: 'caixa-surpresa', label: 'Caixa Surpresa', iconClass: 'ti ti-gift' }` após `encam`.

2. **Componente da Aba (`src/modules/surprise-box/SurpriseBoxTab.tsx`)**:
   - Criar o componente completo com modo trancado, contagem regressiva em tempo real e modo aberto.
   - Detalhar os 2 brindes: Creatina Micronizada 300g e Tabela de Valor Congelado.
   - Adicionar botão de contato WhatsApp personalizado para o Dr. João Paulo / Vittare.
   - Incluir controle para o Dr. João Paulo alternar entre visualização de demonstração trancada/aberta para testes práticos.

3. **Integração no Shell (`src/App.tsx`)**:
   - Importar `SurpriseBoxTab` e mapear `activeTab === 'caixa-surpresa'`.
   - Ajustar o indicador de dots se aplicável para suportar a 14ª aba de maneira fluida.

4. **Verificação & Testes**:
   - Compilação limpa com TypeScript (`tsc --noEmit`).
   - Validação da ergonomia em viewport móvel e teste do carrossel da barra de abas.
