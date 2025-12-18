
export interface Theme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  glow: string;
}

export interface UserIdentity {
  callsign: string;
  frequency: string;
}

export enum AppState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  READY = 'READY',
  TRANSMITTING = 'TRANSMITTING',
  RECEIVING = 'RECEIVING',
  ERROR = 'ERROR'
}

export interface PeerInfo {
  id: string;
  callsign: string;
}
