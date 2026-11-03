# Ajuste de Espaçamento e Respiro no Gráfico Comparativo da Avaliação Física

Ajustar o espaçamento vertical entre os dados clínicos de cabeçalho (nome da métrica, meta clínica e percentual) e o container do gráfico de curva nas avaliações físicas, dobrando o respiro para eliminar a proximidade excessiva com os números superiores (ex.: 82,5) em todos os cards comparativos.

## Revisão do Usuário e Decisões Críticas

> [!IMPORTANT]
> As decisões de layout e densidade espacial foram confirmadas diretamente pelo usuário na etapa de alinhamento:

- **Escopo do Espaçamento Confirmado:** Dobrar o espaçamento entre a linha "Meta clínica" e os números superiores da curva em **todos os 6 cards comparativos** da aba Avaliação Física ("Peso Atual", "Peso Ideal", "IMC", "% de Gordura", "% de Massa Muscular" e "Circunferência Abdominal").
- **Preservação de Escala do Gráfico:** Manter a altura útil original do gráfico (`h-16`, 64px virtuais), deslocando exclusivamente o bloco do gráfico para baixo através de espaçamento de margem vertical (`margin-top` / `margin-bottom`), garantindo que os elementos internos mantenham sua proporção e legibilidade.

---

### 1. Visão Geral e Conceito Central

- **O que faz:** Amplia a distância vertical entre o cabeçalho do card (título, meta clínica e badge) e a área de renderização do gráfico SVG, criando uma separação visual nítida e elegante.
- **Público-alvo:** Paciente e equipe clínica visualizando a aba móvel de Avaliação Física.
- **Benefício-chave:** Remove o aperto visual entre o texto descritivo e os rótulos de valores numéricos superiores (ex.: `82,5`, `74,0`), proporcionando leitura imediata e estética refinada sem sobreposições.

---

### 2. Experiência do Usuário e Design Visual

- **Fluxo do Usuário:**
  1. O usuário acessa a aba **Avaliação F.** e rola até a seção **Evolução das Avaliações Físicas**.
  2. Cada card comparativo exibe o título (`19px`) e meta/referência (`17px`) à esquerda e a variação percentual à direita.
  3. Logo abaixo, com respiro vertical dobrado (~24px de folga contra os ~10px anteriores), inicia-se o gráfico de curva.
  4. O número de valor mais alto fica completamente desimpedido de qualquer elemento de texto textual.
- **Direção Estética:**
  - Preservação da paleta escura elegante com acentos verde-esmeralda `#5eea8f`.
  - Margem superior do bloco de gráfico ampliada de `my-1` para `mt-4 mb-2` (ou cabeçalho com `mb-4`), garantindo proporcionalidade e ritmo vertical.

---

### 3. Decisões de Produto e Trade-offs

- **Decisão 1: Margem Externa vs. Alteração de ViewBox Interno do SVG**
  - *Abordagem Escolhida:* Aumentar a margem entre containers (`margin-bottom` no cabeçalho / `margin-top` no container do gráfico).
  - *Justificativa:* Preserva rigorosamente as coordenadas matemáticas de Bézier, os feixes pontilhados e o alinhamento das datas inferiores do gráfico sem distorcer o sistema de eixos do SVG.
  - *Alternativa descartada:* Adicionar padding interno no SVG alterando `viewBox`, o que achataría a amplitude vertical das curvas.

- **Decisão 2: Aplicação Universal nos 6 Cards Comparativos**
  - *Abordagem Escolhida:* Atualização centralizada no `.map` de renderização dos cards comparativos em `PhysicalAssessmentTab.tsx`.
  - *Justificativa:* Garante consistência visual simétrica em toda a listagem, evitando que apenas um card fique com ritmo espacial despadronizado.

---

### 4. Arquitetura Técnica e Estrutura de Componentes

```
┌────────────────────────────────────────────────────────┐
│ Card Comparativo (bg-white/[0.04], rounded-2xl, p-3.5) │
├────────────────────────────────────────────────────────┤
│ Header: Nome (19px) + Meta (17px)   [Badge Variação]   │
└────────────────────────────────────────────────────────┘
                       │
                       ▼  <-- Espaçamento DOBRADO (~24px)
┌────────────────────────────────────────────────────────┐
│ Container do Gráfico (w-full, h-16, px-1, mt-4 mb-1)   │
│   ┌────────────────────────────────────────────────┐   │
│   │ SVG (viewBox="0 0 320 64"):                    │   │
│   │   • Números superiores (82,5) livres           │   │
│   │   • Curva Bézier + Gradiente suave             │   │
│   │   • Datas inferiores                           │   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

#### Mapeamento de Modificação:
- **Arquivo Alvo:** `/src/modules/physical-assessment/PhysicalAssessmentTab.tsx`
- **Linha do Cabeçalho:** Atualizar o container de cabeçalho de `mb-2` para `mb-4` e o container do gráfico para `mt-2 mb-1` (totalizando dobro da distância original).
- **Verificação:** Execução do build (`compile_applet`) e checagem de tipos (`lint_applet`).
