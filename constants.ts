
import { Theme } from './types';

export const THEMES: Theme[] = [
  { id: 'military', name: 'Tactical OD', primary: '#1e293b', secondary: '#334155', accent: '#84cc16', background: '#0f172a', text: '#f8fafc', glow: 'rgba(132, 204, 22, 0.5)' },
  { id: 'cyberpunk', name: 'Night City', primary: '#111827', secondary: '#1f2937', accent: '#f472b6', background: '#030712', text: '#ec4899', glow: 'rgba(244, 114, 182, 0.5)' },
  { id: 'stealth', name: 'Ghost Ops', primary: '#18181b', secondary: '#27272a', accent: '#ef4444', background: '#09090b', text: '#ffffff', glow: 'rgba(239, 68, 68, 0.5)' },
  { id: 'matrix', name: 'The Source', primary: '#022c22', secondary: '#064e3b', accent: '#22c55e', background: '#000000', text: '#4ade80', glow: 'rgba(34, 197, 94, 0.5)' },
  { id: 'desert', name: 'Desert Storm', primary: '#451a03', secondary: '#78350f', accent: '#f59e0b', background: '#291105', text: '#fbbf24', glow: 'rgba(245, 158, 11, 0.5)' },
  { id: 'arctic', name: 'Arctic Ops', primary: '#0c4a6e', secondary: '#075985', accent: '#38bdf8', background: '#082f49', text: '#e0f2fe', glow: 'rgba(56, 189, 248, 0.5)' },
  { id: 'toxic', name: 'Nuclear Haz', primary: '#3f6212', secondary: '#4d7c0f', accent: '#a3e635', background: '#1a2e05', text: '#d9f99d', glow: 'rgba(163, 230, 53, 0.5)' },
  { id: 'blood', name: 'Blood Moon', primary: '#450a0a', secondary: '#7f1d1d', accent: '#ef4444', background: '#1a0505', text: '#fca5a5', glow: 'rgba(239, 68, 68, 0.5)' },
  { id: 'void', name: 'Deep Space', primary: '#2e1065', secondary: '#4c1d95', accent: '#a855f7', background: '#0f0728', text: '#e9d5ff', glow: 'rgba(168, 85, 247, 0.5)' },
  { id: 'vanguard', name: 'Elite Guard', primary: '#422006', secondary: '#713f12', accent: '#fbbf24', background: '#1c1917', text: '#fef3c7', glow: 'rgba(251, 191, 36, 0.5)' },
  { id: 'custom', name: 'Custom HUD', primary: '#1e293b', secondary: '#334155', accent: '#84cc16', background: '#0f172a', text: '#f8fafc', glow: 'rgba(132, 204, 22, 0.5)' }
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
    fx_off: "SILENCIO",
    custom_color: "COLOR PERSONALIZADO"
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
    fx_off: "SILENT",
    custom_color: "CUSTOM COLOR"
  }
};

export const FREQUENCY_LENGTH = 6;
export const DEFAULT_CALLSIGN = 'RECRUIT';
export const DEFAULT_FREQUENCY = '444222';
