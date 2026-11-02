# Acordeon Exclusivo e Auto-Fechamento Inteligente de Avaliações

Implementação do padrão arquitetural de acordeon exclusivo (Single-Active Accordion) na lista de registros de **Evolução Percebida** da aba **Check-In**. Quando o paciente toca em uma avaliação para visualizar suas barras horizontais de área, qualquer outra avaliação previamente aberta fecha automaticamente. A viewport realiza uma rolagem suave acompanhando o topo do card selecionado, garantindo clareza cognitiva, prevenção de fadiga de rolagem e zero risco de fechamento inesperado durante a leitura.

---

## Decisões Confirmadas pelo Usuário

> [!IMPORTANT]
> Parâmetros validados na etapa de clarificação:

- **Modo de Acordeon**: **Exclusivo (Single-Active)** — No máximo 1 avaliação aberta por vez. Ao abrir uma nova avaliação, todas as outras são recolhidas automaticamente sem acúmulo de conteúdo na tela.
- **Comportamento de Scroll**: **Acompanhamento Suave** — Ao abrir um card, o sistema ancora suavemente o scroll no topo da avaliação expandida (`scrollIntoView` suave), evitando que o conteúdo fique fora da visão.
- **Proteção contra Perda de Leitura**: Não fecharemos a avaliação enquanto o usuário estiver rolando ativamente sobre ela (o que geraria *Cumulative Layout Shift* - CLS abrupto e frustração), garantindo 100% de previsibilidade e segurança de UX móvel.

---

## 1. Visão Geral & Benefícios Ergonômicos

- **Problema Anterior**: Múltiplos cartões de avaliação podiam ficar abertos simultaneamente, gerando rolagem excessiva na tela do celular e exigindo que o paciente voltasse manualmente para fechar cada item.
- **Solução Implementada**: 
  - Transformação do estado de acordeons de dicionário booleano (`{ [id: string]: boolean }`) para ponteiro de ID único ativo (`openCheckInId: string | null`).
  - Transição de estado: se `openCheckInId === item.id`, o toque recolhe o card (`setOpenCheckInId(null)`); se o toque for em outro card, abre o novo e encerra o anterior em uma única transição de renderização.
  - Inclusão adicional de um botão sutil no rodapé do conteúdo expandido (*"Recolher Avaliação"*), permitindo fechar o card diretamente de baixo sem precisar voltar ao cabeçalho.

---

## 2. Experiência do Usuário & Fluxo de Interação

```
┌────────────────────────────────────────────────────────┐
│ Estado Inicial: Todos Fechados (Padrão)                │
│ [ 🩺 EVOLUÇÃO PERCEBIDA 17/10/2026 ] [ 75/100 ] [ ▾ ]  │
│ [ 🩺 EVOLUÇÃO PERCEBIDA 02/10/2026 ] [ 73/100 ] [ ▾ ]  │
│ [ 🩺 EVOLUÇÃO PERCEBIDA 17/09/2026 ] [ 70/100 ] [ ▾ ]  │
└───────────────────────────┬────────────────────────────┘
                            │ (Toque em 17/10)
                            ▼
┌────────────────────────────────────────────────────────┐
│ Card 17/10 Aberto com Rolagem Suave Centralizada       │
│ [ 🩺 EVOLUÇÃO PERCEBIDA 17/10/2026 ] [ 75/100 ] [ ▴ ]  │
│ ┌────────────────────────────────────────────────────┐ │
│ │ • Índice Geral: 75/100 (Barra Verde)               │ │
│ │ • 8 Barras Horizontais por Área                    │ │
│ │ • [ Botão: Recolher Avaliação ]                    │ │
│ └────────────────────────────────────────────────────┘ │
│ [ 🩺 EVOLUÇÃO PERCEBIDA 02/10/2026 ] [ 73/100 ] [ ▾ ]  │
│ [ 🩺 EVOLUÇÃO PERCEBIDA 17/09/2026 ] [ 70/100 ] [ ▾ ]  │
└───────────────────────────┬────────────────────────────┘
                            │ (Toque em 02/10)
                            ▼
┌────────────────────────────────────────────────────────┐
│ Card 17/10 fecha AUTOMATICAMENTE; Card 02/10 abre:    │
│ [ 🩺 EVOLUÇÃO PERCEBIDA 17/10/2026 ] [ 75/100 ] [ ▾ ]  │
│ [ 🩺 EVOLUÇÃO PERCEBIDA 02/10/2026 ] [ 73/100 ] [ ▴ ]  │
│ ┌────────────────────────────────────────────────────┐ │
│ │ • Barras Horizontais do dia 02/10...               │ │
│ └────────────────────────────────────────────────────┘ │
│ [ 🩺 EVOLUÇÃO PERCEBIDA 17/09/2026 ] [ 70/100 ] [ ▾ ]  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Decisões Técnicas & Trade-Offs

- **Por que o Acordeon Exclusivo é superior ao fechamento por 60% de scroll?**
  - *Fechar enquanto o usuário rola* causa o "efeito piso falso": o elemento diminui de altura repentinamente de ~350px para 50px, fazendo o restante da página saltar bruscamente para cima sob o dedo do usuário (*layout shift*), desorientando a leitura e gerando toques involuntários.
  - *O Acordeon Exclusivo orientado a evento* elimina 100% desse risco: o usuário lê com calma todo o conteúdo que abriu; quando decide olhar outra avaliação, a anterior se recolhe automaticamente sem nenhum esforço ou acúmulo de abas abertas.
- **Deslocamento Suave (`scrollIntoView`)**:
  - Utilização de `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` com pequeno *timeout* (50ms) para aguardar a expansão no DOM, assegurando que o topo do card fique imediatamente visível e estável.

---

## 4. Plano de Alterações no Código

1. **Refatoração de Estado em `src/modules/evolution/EvolutionTab.tsx`**:
   - Substituir `openAccordions: { [id: string]: boolean }` por `openCheckInId: string | null = null`.
   - Implementar `handleToggleCheckIn(id: string, elementRef)` com chamada de scroll suave.
2. **Adição de Botão de Fechamento no Rodapé do Conteúdo Expandido**:
   - Um botão `Recolher Avaliação` estilizado no final de cada avaliação aberta para permitir recolhimento direto com a mão no terço inferior da tela.
3. **Verificação & Testes**:
   - Teste de abertura alternada entre D60, D45 e D30.
   - Compilação via `lint_applet` (`tsc --noEmit`) e `compile_applet`.
