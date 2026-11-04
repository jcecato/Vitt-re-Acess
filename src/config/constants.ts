export interface NavigationTab {
  id: string;
  label: string;
  iconClass: string;
}

export const NAVIGATION_TABS: NavigationTab[] = [
  { id: 'inicio', label: 'Meu Dia', iconClass: 'ti ti-home' },
  { id: 'evolucao', label: 'Meu Bem Estar', iconClass: 'ti ti-chart-line' },
  { id: 'consultas', label: 'Minha Agenda', iconClass: 'ti ti-calendar' },
  { id: 'exames', label: 'Meus Exames', iconClass: 'ti ti-flask' },
  { id: 'avaliacao', label: 'Avaliação Física', iconClass: 'ti ti-barbell' },
  { id: 'perfil-metabolico', label: 'Mapa Funcional', iconClass: 'ti ti-dna' },
  { id: 'guia', label: 'Rotina Alimentar', iconClass: 'ti ti-salad' },
  { id: 'protocolo', label: 'Minhas Fórmulas', iconClass: 'ti ti-pill' },
  { id: 'marketplace', label: 'Acesso Ágil', iconClass: 'ti ti-shopping-bag' },
  { id: 'guias', label: 'Guias', iconClass: 'ti ti-folders' },
  { id: 'termos', label: 'Termos', iconClass: 'ti ti-clipboard-check' },
  { id: 'financeiro', label: 'Recibos Fiscais', iconClass: 'ti ti-receipt' },
  { id: 'caixa-surpresa', label: 'Meu Bônus', iconClass: 'ti ti-gift' }
];

export const BRAND_COLORS = {
  emerald: '#5eea8f',
  deepGreen: '#0f7a3a',
  violet: '#5b4bd6',
  lightViolet: '#7c6af7',
  amber: '#a35a07',
  alertRed: '#b42318',
  darkBg: '#0d0d16',
  cardBg: 'rgba(255, 255, 255, 0.07)',
  cardBorder: 'rgba(255, 255, 255, 0.16)',
  textWhite: '#ffffff',
  textOffWhite: '#e8e8f0',
};
