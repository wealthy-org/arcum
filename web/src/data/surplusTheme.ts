export interface SurplusPalette {
  id: string;
  name: string;
  route: string;
  tab?: string;
  ground: string;
  line: string;
  light?: boolean;
  glow?: string;
  does: string;
  scene: {
    cx: number;
    cy: number;
    r: number;
    alpha: number;
    field: number;
    vignette: number;
  };
}

export const SURPLUS_PALETTES: Record<string, SurplusPalette> = {
  plate: {
    id: 'plate',
    name: 'Arcum',
    route: 'home',
    ground: '#0d2a21',
    line: '#e6dfc8',
    light: false,
    does: 'Arrives, inspects tokenized equity options, trades perpetual volatility',
    scene: { cx: 0.63, cy: 0.5, r: 0.5, alpha: 1, field: 1, vignette: 0.35 },
  },
  trade: {
    id: 'trade',
    name: 'Trade',
    route: 'dashboard',
    tab: 'trade',
    ground: '#0c1f3d', // Deep Prussian Blue
    line: '#d9e5f5',
    light: false,
    does: 'Buys everlasting continuous options with USDG on Robinhood Chain',
    scene: { cx: 0.86, cy: 0.62, r: 0.62, alpha: 0.32, field: 0.55, vignette: 0.2 },
  },
  positions: {
    id: 'positions',
    name: 'Positions',
    route: 'dashboard',
    tab: 'positions',
    ground: '#2c1013', // Deep Burgundy Maroon
    line: '#f2d5cd',
    light: false,
    does: 'Tracks active normalized positions, in-kind funding decay, and closes orders',
    scene: { cx: 0.86, cy: 0.62, r: 0.62, alpha: 0.32, field: 0.55, vignette: 0.2 },
  },
  shield: {
    id: 'shield',
    name: 'Shield',
    route: 'dashboard',
    tab: 'shield',
    ground: '#1e1732', // Deep Midnight Violet
    line: '#ddd2f5',
    light: false,
    does: '1-Click automated delta-hedge portfolio protection against market drops',
    scene: { cx: 0.86, cy: 0.62, r: 0.62, alpha: 0.32, field: 0.55, vignette: 0.2 },
  },
  pool: {
    id: 'pool',
    name: 'Pool',
    route: 'dashboard',
    tab: 'pool',
    ground: '#e8e2cf', // Crisp Pale Sage Bone (light mode)
    line: '#14342a',
    light: true,
    does: 'Underwrites options liquidity, earns premium stream and automated protocol yield',
    scene: { cx: 0.86, cy: 0.62, r: 0.62, alpha: 0.28, field: 0.5, vignette: 0.15 },
  },
  agents: {
    id: 'agents',
    name: 'Agents',
    route: 'dashboard',
    tab: 'agents',
    ground: '#34100a', // Deep Ember Crimson
    line: '#ffc49a',
    light: false,
    glow: '#ff6a2b',
    does: 'Autonomous AI agents executing delta hedging, arbitrage, and volatility harvesting',
    scene: { cx: 0.86, cy: 0.62, r: 0.62, alpha: 0.35, field: 0.6, vignette: 0.25 },
  },
  docs: {
    id: 'docs',
    name: 'Docs',
    route: 'docs',
    ground: '#f0eadc', // Warm Bookbinding Parchment (light mode)
    line: '#2a211a',
    light: true,
    does: 'Reads the mathematical prospectus, Euler ODE pricing, and protocol mechanics',
    scene: { cx: 0.86, cy: 0.62, r: 0.62, alpha: 0.25, field: 0.45, vignette: 0.12 },
  },
  contracts: {
    id: 'contracts',
    name: 'Contracts',
    route: 'contracts',
    ground: '#161819', // Graphite Ash Carbon
    line: '#d8d4cb',
    light: false,
    does: 'Inspects verified Robinhood Chain Cancun EVM contracts and timelock ledger',
    scene: { cx: 0.86, cy: 0.62, r: 0.62, alpha: 0.3, field: 0.5, vignette: 0.2 },
  },
  exit: {
    id: 'exit',
    name: 'Emergency Exit',
    route: 'exit',
    ground: '#2c1013', // Deep Burgundy
    line: '#f2d5cd',
    light: false,
    does: 'Independent direct sovereign withdrawal to cold storage on Robinhood Chain',
    scene: { cx: 0.86, cy: 0.62, r: 0.62, alpha: 0.32, field: 0.55, vignette: 0.2 },
  },
};

export const SURPLUS_PLACES_MENU = [
  { key: 'trade', label: 'Trade', route: 'dashboard', tab: 'trade' },
  { key: 'positions', label: 'Positions', route: 'dashboard', tab: 'positions' },
  { key: 'shield', label: 'Shield', route: 'dashboard', tab: 'shield' },
  { key: 'pool', label: 'Pool', route: 'dashboard', tab: 'pool' },
  { key: 'agents', label: 'Agents', route: 'dashboard', tab: 'agents' },
  { key: 'docs', label: 'Docs', route: 'docs' },
  { key: 'contracts', label: 'Contracts', route: 'contracts' },
];

export function getPaletteForContext(route: string, tab?: string): SurplusPalette {
  if (route === 'home') return SURPLUS_PALETTES.plate;
  if (route === 'docs') return SURPLUS_PALETTES.docs;
  if (route === 'contracts') return SURPLUS_PALETTES.contracts;
  if (route === 'exit') return SURPLUS_PALETTES.exit;
  if (route === 'dashboard') {
    if (tab && SURPLUS_PALETTES[tab]) {
      return SURPLUS_PALETTES[tab];
    }
    return SURPLUS_PALETTES.trade;
  }
  return SURPLUS_PALETTES.plate;
}

export function applySurplusPalette(paletteKey: string) {
  if (typeof document === 'undefined') return;
  const p = SURPLUS_PALETTES[paletteKey] || SURPLUS_PALETTES.plate;
  const root = document.documentElement;

  root.style.setProperty('--surplus-ground', p.ground);
  root.style.setProperty('--surplus-line', p.line);
  root.style.setProperty('--ground', p.ground);
  root.style.setProperty('--line', p.line);

  // Line mix transparencies
  root.style.setProperty('--surplus-line-08', `color-mix(in srgb, ${p.line} 8%, transparent)`);
  root.style.setProperty('--surplus-line-14', `color-mix(in srgb, ${p.line} 14%, transparent)`);
  root.style.setProperty('--surplus-line-24', `color-mix(in srgb, ${p.line} 24%, transparent)`);
  root.style.setProperty('--surplus-line-40', `color-mix(in srgb, ${p.line} 40%, transparent)`);
  root.style.setProperty('--surplus-line-62', `color-mix(in srgb, ${p.line} 62%, transparent)`);
  root.style.setProperty('--surplus-line-80', `color-mix(in srgb, ${p.line} 80%, transparent)`);

  // Scene parameters for GuillocheCanvas
  root.style.setProperty('--scene-cx', String(p.scene.cx));
  root.style.setProperty('--scene-cy', String(p.scene.cy));
  root.style.setProperty('--scene-r', String(p.scene.r));
  root.style.setProperty('--scene-alpha', String(p.scene.alpha));
  root.style.setProperty('--scene-field', String(p.scene.field));
  root.style.setProperty('--scene-vignette', String(p.scene.vignette));

  if (p.light) {
    root.dataset.light = '';
  } else {
    delete root.dataset.light;
  }
}
