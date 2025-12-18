
import { Theme } from './types';

export const THEMES: Theme[] = [
  {
    id: 'military',
    name: 'Tactical OD',
    primary: '#1e293b',
    secondary: '#334155',
    accent: '#84cc16', 
    background: '#0f172a',
    text: '#f8fafc',
    glow: 'rgba(132, 204, 22, 0.5)'
  },
  {
    id: 'cyberpunk',
    name: 'Night City',
    primary: '#111827',
    secondary: '#1f2937',
    accent: '#f472b6', 
    background: '#030712',
    text: '#ec4899',
    glow: 'rgba(244, 114, 182, 0.5)'
  },
  {
    id: 'stealth',
    name: 'Ghost Ops',
    primary: '#18181b',
    secondary: '#27272a',
    accent: '#ef4444', 
    background: '#09090b',
    text: '#ffffff',
    glow: 'rgba(239, 68, 68, 0.5)'
  },
  {
    id: 'matrix',
    name: 'The Source',
    primary: '#022c22',
    secondary: '#064e3b',
    accent: '#22c55e', 
    background: '#000000',
    text: '#4ade80',
    glow: 'rgba(34, 197, 94, 0.5)'
  }
];

export const TRANSLATIONS = {
  es: {
    sector_freq: "FRECUENCIA DE SECTOR",
    transmitting: "TRANSMITIENDO",
    hold_to_comm: "MANTENER PARA HABLAR",
    latched_on: "MICRO BLOQUEADO",
    ops_config: "CONFIGURACIÓN TÁCTICA",
    back: "REGRESAR",
    callsign_label: "IDENTIFICACIÓN (CALLSIGN)",
    freq_label: "CÓDIGO DE SALA (6 DÍGITOS)",
    theme_label: "TEMA DE VISUALIZACIÓN HUD",
    lang_label: "IDIOMA DEL SISTEMA",
    audio_fx_label: "EFECTOS DE RADIO (SQUELCH)",
    save_changes: "INICIALIZAR COMM-LINK",
    author_label: "AUTOR DEL CONCEPTO",
    node_secured: "NODO SEGURO",
    uplink_active: "UPLINK ACTIVO",
    downlink_active: "DOWNLINK ACTIVO",
    incoming: "COMUNICACIÓN ENTRANTE...",
    sync_title: "PUENTE DE FRECUENCIA",
    scan_btn: "ESCANEAR CÓDIGO",
    exit_sync: "SALIR DE INTERFAZ",
    hands_free: "MANO ALZADA",
    active_units: "UNIDADES ACTIVAS",
    fx_on: "ACTIVO",
    fx_off: "SILENCIO"
  },
  en: {
    sector_freq: "SECTOR FREQUENCY",
    transmitting: "TRANSMITTING",
    hold_to_comm: "HOLD TO COMM",
    latched_on: "MIC LATCHED ON",
    ops_config: "TACTICAL CONFIG",
    back: "RETURN",
    callsign_label: "PERSONAL ID (CALLSIGN)",
    freq_label: "ROOM CODE (6 DIGITS)",
    theme_label: "HUD VISUALIZATION THEME",
    lang_label: "SYSTEM LANGUAGE",
    audio_fx_label: "RADIO EFFECTS (SQUELCH)",
    save_changes: "INITIALIZE COMM-LINK",
    author_label: "CONCEPT AUTHOR",
    node_secured: "NODE SECURED",
    uplink_active: "UPLINK ACTIVE",
    downlink_active: "DOWNLINK ACTIVE",
    incoming: "INCOMING COMMS...",
    sync_title: "FREQUENCY BRIDGE",
    scan_btn: "SCAN ROOM CODE",
    exit_sync: "EXIT SYNC INTERFACE",
    hands_free: "HANDS FREE",
    active_units: "ACTIVE UNITS",
    fx_on: "ACTIVE",
    fx_off: "SILENT"
  }
};

export const FREQUENCY_LENGTH = 6;
export const DEFAULT_CALLSIGN = 'ROOKIE';
export const DEFAULT_FREQUENCY = '144200';
