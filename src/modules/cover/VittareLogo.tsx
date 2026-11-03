import React from 'react';

interface VittareLogoProps {
  className?: string;
  size?: number;
}

/**
 * Recriação vetorial fiel e ultraleve do símbolo de 4 laços/fitas entrelaçadas da Clínica Vittáre.
 * - Peso: ~1.4 KB (carregamento instantâneo, zero requisição de rede adicional).
 * - Renderização vetorial cristalina em qualquer densidade de pixels (Retina / 4K).
 * - Degradê nos tons oficiais da marca: azul royal, ciano, verde esmeralda e teal.
 * - Sem bordas, sem fundo opaco, com estrela central em espaço negativo.
 */
export const VittareLogo: React.FC<VittareLogoProps> = ({ className = '', size = 80 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none transition-transform duration-300 hover:scale-105 ${className}`}
      aria-label="Logomarca Vittáre"
      role="img"
    >
      <defs>
        {/* Degradê Fita Superior (Azul Royal para Azul Ciano) */}
        <linearGradient id="vit-top-grad" x1="45" y1="12" x2="85" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e6fff" />
          <stop offset="45%" stopColor="#0091ff" />
          <stop offset="100%" stopColor="#00d4ff" />
        </linearGradient>

        {/* Degradê Fita Direita (Ciano para Verde Esmeralda) */}
        <linearGradient id="vit-right-grad" x1="60" y1="45" x2="108" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00b4d8" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#2fd575" />
        </linearGradient>

        {/* Degradê Fita Inferior (Verde Esmeralda para Teal Profundo) */}
        <linearGradient id="vit-bottom-grad" x1="75" y1="108" x2="35" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2fd575" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>

        {/* Degradê Fita Esquerda (Teal para Azul Profundo) */}
        <linearGradient id="vit-left-grad" x1="60" y1="75" x2="12" y2="35" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#1e6fff" />
        </linearGradient>

        {/* Sombras de oclusão interna para profundidade 3D */}
        <linearGradient id="vit-shade-top" x1="60" y1="35" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0047b3" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="vit-shade-right" x1="60" y1="60" x2="85" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#047857" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </linearGradient>

        {/* Filtro sutil de brilho ambiente */}
        <filter id="vit-glow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#12b76a" floodOpacity="0.25" />
        </filter>
      </defs>

      <g filter="url(#vit-glow)">
        {/* Laço Superior (Vertical / Azul) */}
        <path
          d="M60 22 C60 10, 78 10, 78 28 C78 44, 60 54, 60 60 C60 52, 46 44, 46 28 C46 10, 60 10, 60 22 Z"
          fill="url(#vit-top-grad)"
        />
        {/* Curva exterior 3D superior com dobra */}
        <path
          d="M48 24 C52 14, 68 14, 74 24 C80 34, 76 50, 60 60 C58 48, 54 36, 48 24 Z"
          fill="url(#vit-top-grad)"
        />

        {/* Laço Direito (Horizontal / Ciano para Verde) */}
        <path
          d="M98 60 C110 60, 110 78, 92 78 C76 78, 66 60, 60 60 C68 60, 76 46, 92 46 C110 46, 110 60, 98 60 Z"
          fill="url(#vit-right-grad)"
        />
        <path
          d="M96 48 C106 52, 106 68, 96 74 C86 80, 70 76, 60 60 C72 58, 84 54, 96 48 Z"
          fill="url(#vit-right-grad)"
        />

        {/* Laço Inferior (Vertical / Verde Esmeralda) */}
        <path
          d="M60 98 C60 110, 42 110, 42 92 C42 76, 60 66, 60 60 C60 68, 74 76, 74 92 C74 110, 60 110, 60 98 Z"
          fill="url(#vit-bottom-grad)"
        />
        <path
          d="M72 96 C68 106, 52 106, 46 96 C40 86, 44 70, 60 60 C62 72, 66 84, 72 96 Z"
          fill="url(#vit-bottom-grad)"
        />

        {/* Laço Esquerdo (Horizontal / Verde para Azul) */}
        <path
          d="M22 60 C10 60, 10 42, 28 42 C44 42, 54 60, 60 60 C52 60, 44 74, 28 74 C10 74, 10 60, 22 60 Z"
          fill="url(#vit-left-grad)"
        />
        <path
          d="M24 72 C14 68, 14 52, 24 46 C34 40, 50 44, 60 60 C48 62, 36 66, 24 72 Z"
          fill="url(#vit-left-grad)"
        />

        {/* Oclusão / Sombra entre as dobras de fita */}
        <path
          d="M60 44 C56 50, 50 56, 44 60 C50 64, 56 70, 60 76 C64 70, 70 64, 76 60 C70 56, 64 50, 60 44 Z"
          fill="rgba(0, 0, 0, 0.12)"
        />

        {/* Estrela central em espaço negativo brilhante */}
        <path
          d="M60 48 Q60 60 72 60 Q60 60 60 72 Q60 60 48 60 Q60 60 60 48 Z"
          fill="#ffffff"
          opacity="0.95"
        />
      </g>
    </svg>
  );
};
