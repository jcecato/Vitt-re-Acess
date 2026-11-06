export interface NavigationTab {
  id: string;
  label: string;
  iconClass: string;
}

export const NAVIGATION_TABS: NavigationTab[] = [
  { id: 'inicio', label: 'Meu Dia', iconClass: 'ti ti-home' },
  { id: 'consultas', label: 'Minha Agenda', iconClass: 'ti ti-calendar' },
  { id: 'evolucao', label: 'Meu Bem-Estar', iconClass: 'ti ti-chart-line' },
  { id: 'guia', label: 'Rotina Alimentar', iconClass: 'ti ti-salad' },
  { id: 'formulas-suprimentos', label: 'Fórmulas & Suprimentos', iconClass: 'ti ti-pill' },
  { id: 'exames-guias', label: 'Meus Exames & Guias', iconClass: 'ti ti-flask' },
  { id: 'meu-perfil', label: 'Meu Perfil', iconClass: 'ti ti-user-check' },
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
