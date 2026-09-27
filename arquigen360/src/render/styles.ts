import type { StyleId } from '../geometry/types';
import type { FloorCategory } from '../layout-engine/catalog';

export type Pattern = 'none' | 'wood' | 'tile' | 'concrete' | 'grass' | 'deck' | 'bigtile';

export interface FloorDef {
  fill: string;
  line: string;
  pattern: Pattern;
}

export interface PlanStyle {
  id: StyleId;
  label: string;
  description: string;
  paper: string;
  ground: string;
  groundLine: string;
  groundPattern: Pattern;
  lotLine: string;
  wall: string;
  openWall: string;
  threshold: string;
  dim: string;
  text: string;
  textMuted: string;
  halo: string;
  floors: Record<FloorCategory, FloorDef>;
  furnFill: string;
  furnStroke: string;
  furnAccent: string;
  furnSoft: string;
  glass: string;
  tree: string;
  treeDark: string;
  car: string;
  shadow: boolean;
  /** base de maqueta en 2.5D */
  slab: string;
}

const F = (fill: string, line: string, pattern: Pattern): FloorDef => ({ fill, line, pattern });

export const STYLES: Record<StyleId, PlanStyle> = {
  tecnico: {
    id: 'tecnico',
    label: 'Plano técnico',
    description: 'Blanco y negro, líneas limpias, sin texturas.',
    paper: '#ffffff', ground: '#ffffff', groundLine: '#c9ccd1', groundPattern: 'none', lotLine: '#2b2f36',
    wall: '#15181c', openWall: '#9aa0a8', threshold: '#ffffff', dim: '#15181c', text: '#15181c', textMuted: '#5d636b', halo: '#ffffff',
    floors: {
      bedroom: F('#ffffff', '#e1e3e6', 'none'), wet: F('#ffffff', '#d5d8dc', 'tile'), social: F('#ffffff', '#e1e3e6', 'none'),
      garage: F('#ffffff', '#e1e3e6', 'none'), grass: F('#ffffff', '#b9bec5', 'grass'), deck: F('#ffffff', '#c9ccd1', 'deck'),
      hall: F('#ffffff', '#e1e3e6', 'none'), work: F('#ffffff', '#e1e3e6', 'none'),
    },
    furnFill: '#ffffff', furnStroke: '#2b2f36', furnAccent: '#ffffff', furnSoft: '#f1f2f4', glass: '#ffffff',
    tree: '#ffffff', treeDark: '#6b7079', car: '#ffffff', shadow: false, slab: '#d8dadd',
  },
  inmobiliario: {
    id: 'inmobiliario',
    label: 'Plano inmobiliario',
    description: 'Pisos de madera y cerámica, vegetación y sombras suaves.',
    paper: '#ffffff', ground: '#dfe8d6', groundLine: '#c6d4b9', groundPattern: 'grass', lotLine: '#7d8a70',
    wall: '#2a2d31', openWall: '#b7aa98', threshold: '#f4efe7', dim: '#3a3f46', text: '#23272c', textMuted: '#5f6670', halo: 'rgba(255,255,255,0.85)',
    floors: {
      bedroom: F('#dcc09a', '#caa87c', 'wood'), wet: F('#e9edf0', '#cfd6dc', 'tile'), social: F('#e8d4b4', '#d6bc95', 'wood'),
      garage: F('#d7d6d1', '#c4c2bb', 'concrete'), grass: F('#a8c98c', '#93b877', 'grass'), deck: F('#c7a47b', '#b18a5f', 'deck'),
      hall: F('#e8d4b4', '#d6bc95', 'wood'), work: F('#dcc09a', '#caa87c', 'wood'),
    },
    furnFill: '#fbfbfa', furnStroke: '#6b6f75', furnAccent: '#b9c7d4', furnSoft: '#eceae6', glass: '#cfe3ee',
    tree: '#7fae62', treeDark: '#5a8a45', car: '#9aa6b2', shadow: true, slab: '#cfc8bd',
  },
  moderno: {
    id: 'moderno',
    label: 'Plano moderno',
    description: 'Concreto pulido, roble claro y acentos petróleo.',
    paper: '#ffffff', ground: '#e4e8e6', groundLine: '#cfd5d2', groundPattern: 'grass', lotLine: '#6e7672',
    wall: '#1b1e21', openWall: '#a8adb2', threshold: '#f2f3f4', dim: '#1b1e21', text: '#1b1e21', textMuted: '#5a6066', halo: 'rgba(255,255,255,0.88)',
    floors: {
      bedroom: F('#e7dccb', '#d7c8b0', 'wood'), wet: F('#dfe3e6', '#c9cfd4', 'bigtile'), social: F('#e5e6e7', '#d3d5d7', 'concrete'),
      garage: F('#d2d4d6', '#bfc2c5', 'concrete'), grass: F('#b3cba5', '#9fb990', 'grass'), deck: F('#b9b1a6', '#a29a8e', 'deck'),
      hall: F('#e5e6e7', '#d3d5d7', 'concrete'), work: F('#e7dccb', '#d7c8b0', 'wood'),
    },
    furnFill: '#f6f7f8', furnStroke: '#3d4247', furnAccent: '#2f7f86', furnSoft: '#e3e6e8', glass: '#c7dde2',
    tree: '#8fb57f', treeDark: '#6b9460', car: '#3d4247', shadow: true, slab: '#c9ccce',
  },
  calido: {
    id: 'calido',
    label: 'Plano cálido',
    description: 'Terracota, maderas oscuras y textiles crudos.',
    paper: '#ffffff', ground: '#e3e2cf', groundLine: '#cfcdb5', groundPattern: 'grass', lotLine: '#857c62',
    wall: '#3a2b22', openWall: '#bba48d', threshold: '#f5ece0', dim: '#3a2b22', text: '#2e221b', textMuted: '#6b5a4d', halo: 'rgba(255,252,247,0.88)',
    floors: {
      bedroom: F('#c99a6b', '#b28457', 'wood'), wet: F('#efe6da', '#ddd0bf', 'tile'), social: F('#d9a27e', '#c58762', 'bigtile'),
      garage: F('#d4cfc6', '#c0b9ad', 'concrete'), grass: F('#98b573', '#84a25f', 'grass'), deck: F('#b88b5e', '#9f744a', 'deck'),
      hall: F('#d9a27e', '#c58762', 'bigtile'), work: F('#c99a6b', '#b28457', 'wood'),
    },
    furnFill: '#fbf5ec', furnStroke: '#6e5140', furnAccent: '#c77d5a', furnSoft: '#efe3d3', glass: '#d6e3df',
    tree: '#8aad64', treeDark: '#67884a', car: '#8a6f5c', shadow: true, slab: '#cdbfae',
  },
};

export const STYLE_LIST = Object.values(STYLES);
