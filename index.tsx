import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';

// --- TYPES & INTERFACES ---
interface Theme {
  id: string; name: string; primary: string; secondary: string;
  accent: string; background: string; text: string; glow: string;
}
interface UserIdentity { callsign: string; frequency: string; }
enum AppState { IDLE = 'IDLE', CONNECTING = 'CONNECTING', READY = 'READY', TRANSMITTING = 'TRANSMITTING', RECEIVING = 'RECEIVING', ERROR = 'ERROR' }

// --- CONSTANTS ---
const THEMES: Theme[] = [
  { id: 'military', name: 'Tactical OD', primary: '#1e293b', secondary: '#334155', accent: '#84cc16', background: '#0f172a', text: '#f8fafc', glow: 'rgba(132, 204, 22, 0.5)' },
  { id: 'cyberpunk', name: 'Night City', primary: '#111827', secondary: '#1f2937', accent: '#f472b6', background: '#030712', text: '#ec4899', glow: 'rgba(244, 114, 182, 0.5)' },
  { id: 'stealth', name: 'Ghost Ops', primary: '#18181b', secondary: '#27272a', accent: '#ef4444', background: '#09090b', text: '#ffffff', glow: 'rgba(239, 68, 68, 0.5)' },
  { id: 'matrix', name: 'The Source', primary: '#022c22', secondary: '#064e3b', accent: '#22c55e', background: '#000000', text: '#4ade80', glow: 'rgba(34, 197, 94, 0.5)' },
  { id: 'desert', name: 'Desert Storm', primary: '#451a03', secondary: '#78350f', accent: '#f59e0b', background: '#291105', text: '#fbbf24', glow: 'rgba(245, 158, 11, 0.5)' },
  { id: 'arctic', name: 'Arctic Ops', primary: '#0c4a6e', secondary: '#075985', accent: '#38bdf8', background: '#082f49', text: '#e0f2fe', glow: 'rgba(56, 189, 248, 0.5)' }
];

const TRANSLATIONS = {
  es: {
    sector_freq: "FRECUENCIA DE SECTOR",
    transmitting: "TRANSMITIENDO",
    hold_to_comm: "MANTENER PARA HABLAR",
    latched_on: "MICRO BLOQUEADO (HANDS-FREE)",
    ops_config: "CONFIGURACIÓN TÁCTICA",
    back: "REGRESAR",
    callsign_label: "IDENTIFICACIÓN (CALLSIGN)",
    freq_label: "CÓDIGO (6 DÍGITOS)",
    theme_label: "TEMA HUD",
    node_secured: "NODO SEGURO",
    incoming: "ENTRANTE...",
    hands_free: "MANOS LIBRES",
    active_units: "UNIDADES",
    sync_title: "PUENTE QR",
    scan_btn: "ESCANEAR"
  }
};

// --- AUDIO SERVICE ---
class AudioService {
  private ctx: AudioContext | null = null;
  public isEnabled: boolean = true;

  private initCtx() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  private createSquelchNoise(duration: number, volume: number) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 1000;
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    source.connect(filter); filter.connect(gainNode); gainNode.connect(this.ctx.destination);
    source.start();
  }

  playBeep(type: 'start' | 'end' | 'receive' | 'click') {
    if (!this.isEnabled && type !== 'click') return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (type === 'start') {
      this.createSquelchNoise(0.1, 0.1);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.frequency.setValueAtTime(880, now);
      g.gain.setValueAtTime(0.1, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(); osc.stop(now + 0.1);
    } else if (type === 'end') {
      this.createSquelchNoise(0.3, 0.08);
    } else if (type === 'click') {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.frequency.setValueAtTime(1200, now);
      g.gain.setValueAtTime(0.05, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(); osc.stop(now + 0.05);
    }
  }
}
const audioService = new AudioService();

// --- PEER SERVICE ---
class PeerService {
  private peer: any = null;
  private connections: Map<string, any> = new Map();
  private calls: Map<string, any> = new Map();

  constructor(
    private onConnectionUpdate: (peers: string[]) => void,
    private onStreamReceived: (stream: MediaStream, peerId: string) => void,
    private onStreamEnded: (peerId: string) => void
  ) {}

  async initialize(frequency: string, callsign: string): Promise<string> {
    const peerId = `cl-${frequency}-${callsign.replace(/\W/g,'')}-${Math.random().toString(36).substring(2,6)}`;
    if (this.peer) this.peer.destroy();
    this.peer = new (window as any).Peer(peerId, {
      debug: 1,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    });
    return new Promise((resolve, reject) => {
      this.peer.on('open', (id) => { 
        this.peer.on('connection', (conn) => {
          conn.on('open', () => {
            this.connections.set(conn.peer, conn);
            this.onConnectionUpdate(Array.from(this.connections.keys()));
          });
          conn.on('close', () => {
            this.connections.delete(conn.peer);
            this.onConnectionUpdate(Array.from(this.connections.keys()));
          });
        });
        this.peer.on('call', (call) => {
          call.answer();
          call.on('stream', (s) => this.onStreamReceived(s, call.peer));
          call.on('close', () => this.onStreamEnded(call.peer));
        });
        resolve(id); 
      });
      this.peer.on('error', reject);
    });
  }

  broadcastVoice(stream: MediaStream) {
    this.connections.forEach((_, id) => {
      const call = this.peer.call(id, stream);
      if (call) this.calls.set(id, call);
    });
  }

  stopBroadcast() {
    this.calls.forEach(c => c.close());
    this.calls.clear();
  }

  destroy() { if (this.peer) this.peer.destroy(); }
}

// --- SUBCOMPONENTS ---

const QRBridge: React.FC<{ frequency: string; theme: Theme; t: any; onClose: () => void; onResult: (f: string) => void }> = ({ frequency, theme, t, onClose, onResult }) => {
  const [isCamActive, setIsCamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (qrRef.current && (window as any).QRious) {
      new (window as any).QRious({
        element: qrRef.current, value: frequency, size: 200,
        background: 'transparent', foreground: theme.accent, level: 'H'
      });
    }
  }, [frequency, theme.accent]);

  const toggleCam = async () => {
    if (isCamActive) {
      setIsCamActive(false);
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setIsCamActive(true);
      } catch (e) { alert("Error cámara"); }
    }
  };

  return (
    <div className="modal-overlay items-center p-8" style={{ backgroundColor: theme.background }}>
      <header className="w-full flex justify-between items-center mb-8">
        <h2 className="text-xl font-black font-orbitron italic" style={{ color: theme.accent }}>{t.sync_title}</h2>
        <button onClick={onClose} className="p-2 opacity-50">Cerrar</button>
      </header>
      <div className="flex flex-col items-center space-y-8 w-full max-w-xs">
        <div className="p-4 border-2 rounded-3xl" style={{ borderColor: theme.secondary }}>
          <canvas ref={qrRef} />
        </div>
        <div className="text-3xl font-black font-orbitron tracking-widest" style={{ color: theme.accent }}>{frequency}</div>
        <button onClick={toggleCam} className="w-full py-4 border-2 rounded-xl font-black" style={{ borderColor: theme.accent, color: theme.accent }}>
          {isCamActive ? t.back : t.scan_btn}
        </button>
        {isCamActive && <video ref={videoRef} autoPlay playsInline className="w-64 h-64 border-2 rounded-2xl object-cover" style={{ borderColor: theme.accent }} />}
      </div>
    </div>
  );
};

// --- MAIN APP ---

const App: React.FC = () => {
  const [identity, setIdentity] = useState<UserIdentity>({ callsign: 'SOLDIER', frequency: '444222' });
  const [theme, setTheme] = useState<Theme>(THEMES[0]);
  const [peers, setPeers] = useState<string[]>([]);
  const [status, setStatus] = useState<AppState>(AppState.IDLE);
  const [receiving, setReceiving] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const peerServiceRef = useRef<PeerService | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const t = TRANSLATIONS.es;

  useEffect(() => {
    const init = async () => {
      setStatus(AppState.CONNECTING);
      const ps = new PeerService(
        setPeers,
        (s) => { setReceiving(true); audioService.playBeep('receive'); if (audioRef.current) audioRef.current.srcObject = s; },
        () => { setReceiving(false); audioService.playBeep('end'); }
      );
      try {
        await ps.initialize(identity.frequency, identity.callsign);
        peerServiceRef.current = ps;
        setStatus(AppState.READY);
      } catch (e) { setStatus(AppState.ERROR); }
    };
    init();
    return () => peerServiceRef.current?.destroy();
  }, [identity.frequency]);

  const txStart = async () => {
    if (status === AppState.TRANSMITTING || receiving) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setStatus(AppState.TRANSMITTING);
      audioService.playBeep('start');
      peerServiceRef.current?.broadcastVoice(stream);
    } catch (e) { setHandsFree(false); }
  };

  const txEnd = () => {
    if (status !== AppState.TRANSMITTING) return;
    setStatus(AppState.READY);
    audioService.playBeep('end');
    peerServiceRef.current?.stopBroadcast();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const toggleHandsFree = () => {
    audioService.playBeep('click');
    const newState = !handsFree;
    setHandsFree(newState);
    if (newState) txStart(); else txEnd();
  };

  const isTX = status === AppState.TRANSMITTING;

  return (
    <div className="relative w-full h-full flex flex-col" style={{ color: theme.text, backgroundColor: theme.background }}>
      <audio ref={audioRef} autoPlay />
      
      <header className="pt-16 px-10 flex justify-between items-start z-20">
        <div>
          <h1 className="text-3xl font-black italic font-orbitron" style={{ color: theme.accent }}>COMMLINK</h1>
          <div className="flex items-center mt-2">
            <div className={`w-2 h-2 rounded-full mr-2 ${isTX ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-[10px] font-black uppercase opacity-70 tracking-widest">{isTX ? t.transmitting : t.node_secured}</span>
          </div>
        </div>
        <div className="text-right text-[10px] font-black opacity-30 uppercase tracking-tighter">
          {t.active_units}: {peers.length + 1}
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center space-y-10 z-10 px-8 text-center">
        <div className="flex flex-col items-center p-8 rounded-2xl border-2 bg-black/40 backdrop-blur-md" style={{ borderColor: theme.accent }}>
          <span className="text-[10px] uppercase opacity-50 mb-2 font-black tracking-[0.4em]">{t.sector_freq}</span>
          <div className="text-6xl font-black tracking-widest font-orbitron" style={{ color: theme.accent }}>
            {identity.frequency.slice(0,3)}<span className="opacity-20 mx-1">.</span>{identity.frequency.slice(3)}
          </div>
        </div>

        <div className="flex flex-col items-center space-y-6">
          <button 
            onMouseDown={!handsFree ? txStart : undefined} onMouseUp={!handsFree ? txEnd : undefined}
            onTouchStart={(e) => { if(!handsFree) { e.preventDefault(); txStart(); } }}
            onTouchEnd={(e) => { if(!handsFree) { e.preventDefault(); txEnd(); } }}
            className={`relative w-56 h-56 rounded-full border-[12px] flex flex-col items-center justify-center transition-all ${isTX ? 'scale-105' : 'active:scale-95'}`}
            style={{ 
              borderColor: isTX ? (handsFree ? '#f97316' : theme.accent) : theme.secondary, 
              backgroundColor: isTX ? theme.primary : theme.secondary,
              boxShadow: isTX ? `0 0 40px ${theme.glow}` : 'none'
            }}
          >
            <svg className={`w-16 h-16 ${isTX ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="mt-4 text-[10px] font-black uppercase tracking-widest">
              {handsFree ? t.latched_on : (isTX ? t.transmitting : t.hold_to_comm)}
            </span>
          </button>

          <button onClick={toggleHandsFree} className={`flex items-center space-x-3 px-6 py-2 rounded-xl border-2 transition-all ${handsFree ? 'bg-orange-500/10' : 'opacity-40'}`} style={{ borderColor: handsFree ? '#f97316' : theme.secondary }}>
            <div className={`w-2 h-2 rounded-full ${handsFree ? 'bg-orange-500 shadow-[0_0_8px_orange]' : 'bg-gray-600'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">{t.hands_free} {handsFree ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </main>

      <footer className="p-12 flex justify-between items-center z-20">
        <button onClick={() => setShowSettings(true)} className="p-6 border-2 rounded-2xl bg-black/40" style={{ borderColor: theme.secondary }}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.accent }}><path strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        </button>
        <button onClick={() => setShowQr(true)} className="p-6 border-2 rounded-2xl bg-black/40" style={{ borderColor: theme.secondary }}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.accent }}><path strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
        </button>
      </footer>

      {showSettings && (
        <div className="modal-overlay p-10" style={{ backgroundColor: theme.background }}>
          <header className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-black font-orbitron italic" style={{ color: theme.accent }}>{t.ops_config}</h2>
            <button onClick={() => setShowSettings(false)} className="px-6 py-2 border-2 rounded-xl text-[10px] font-black" style={{ borderColor: theme.accent, color: theme.accent }}>{t.back}</button>
          </header>
          <div className="space-y-8 max-w-md mx-auto w-full">
            <div>
              <label className="text-[10px] font-black opacity-40 block mb-2 uppercase">{t.callsign_label}</label>
              <input value={identity.callsign} onChange={e => setIdentity({...identity, callsign: e.target.value.toUpperCase()})} className="w-full bg-black/30 border-2 p-4 text-xl font-black rounded-xl outline-none" style={{ borderColor: theme.secondary, color: theme.accent }} />
            </div>
            <div>
              <label className="text-[10px] font-black opacity-40 block mb-2 uppercase">{t.freq_label}</label>
              <input value={identity.frequency} maxLength={6} onChange={e => setIdentity({...identity, frequency: e.target.value.replace(/\D/g,'')})} className="w-full bg-black/30 border-2 p-4 text-xl font-black rounded-xl outline-none tracking-widest font-orbitron" style={{ borderColor: theme.secondary, color: theme.accent }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map(th => (
                <button key={th.id} onClick={() => setTheme(th)} className={`p-3 border-2 rounded-xl text-[9px] font-black ${theme.id === th.id ? 'opacity-100' : 'opacity-40'}`} style={{ backgroundColor: th.primary, borderColor: th.accent, color: th.accent }}>{th.name}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showQr && <QRBridge frequency={identity.frequency} theme={theme} t={t} onClose={() => setShowQr(false)} onResult={(f) => { setIdentity({...identity, frequency: f}); setShowQr(false); }} />}

      {receiving && (
        <div className="fixed top-28 left-0 right-0 flex justify-center z-[50] pointer-events-none px-6">
          <div className="px-8 py-3 bg-red-600 text-white font-black rounded-full animate-pulse flex items-center space-x-4 shadow-[0_0_30px_red]">
            <span className="text-[11px] uppercase tracking-widest">{t.incoming}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);