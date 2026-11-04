export interface NavigationTab {
  id: string;
  label: string;
  iconClass: string;
}

export const NAVIGATION_TABS: NavigationTab[] = [
  { id: 'inicio', label: 'Início', iconClass: 'ti ti-home' },
  { id: 'evolucao', label: 'Check-in', iconClass: 'ti ti-chart-line' },
  { id: 'consultas', label: 'Agenda', iconClass: 'ti ti-calendar' },
  { id: 'exames', label: 'Exames', iconClass: 'ti ti-flask' },
  { id: 'avaliacao', label: 'Avaliação F.', iconClass: 'ti ti-barbell' },
  { id: 'guia', label: 'Guia Alimentar', iconClass: 'ti ti-salad' },
  { id: 'perfil-metabolico', label: 'Perfil Metabólico', iconClass: 'ti ti-dna' },
  { id: 'protocolo', label: 'Protocolo', iconClass: 'ti ti-pill' },
  { id: 'marketplace', label: 'Marketplace', iconClass: 'ti ti-shopping-bag' },
  { id: 'docs', label: 'Documentos', iconClass: 'ti ti-folder' },
  { id: 'financeiro', label: 'Financeiro', iconClass: 'ti ti-credit-card' },
  { id: 'termos', label: 'Termos', iconClass: 'ti ti-clipboard-check' },
  { id: 'saude', label: 'Anamnese', iconClass: 'ti ti-heart-rate-monitor' },
  { id: 'encam', label: 'Encaminhamentos', iconClass: 'ti ti-send' },
  { id: 'caixa-surpresa', label: 'Caixa Surpresa', iconClass: 'ti ti-gift' }
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
