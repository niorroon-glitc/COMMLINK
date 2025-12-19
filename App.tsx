
import React, { useState, useEffect, useRef } from 'react';
import { THEMES, TRANSLATIONS, DEFAULT_CALLSIGN, DEFAULT_FREQUENCY } from './constants.ts';
import { AppState, UserIdentity, Theme } from './types.ts';
import { audioService } from './services/audioService.ts';
import { PeerService } from './services/peerService.ts';

// --- Sub-Componentes ---

const FrequencyDisplay: React.FC<{ value: string; theme: Theme; t: any }> = ({ value, theme, t }) => (
  <div className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 bg-black/40 backdrop-blur-md" style={{ borderColor: theme.accent }}>
    <span className="text-[10px] uppercase opacity-50 mb-2 font-black tracking-[0.4em]" style={{ color: theme.text }}>{String(t.sector_freq)}</span>
    <div className="text-6xl font-black tracking-widest font-orbitron" style={{ color: theme.accent }}>
      {String(value).slice(0, 3)}<span className="opacity-20 mx-1">.</span>{String(value).slice(3)}
    </div>
  </div>
);

const SettingsPanel: React.FC<{ 
  identity: UserIdentity; setIdentity: any; 
  theme: Theme; setTheme: any; 
  lang: string; setLang: any; 
  audioFx: boolean; setAudioFx: any; 
  onClose: () => void; t: any 
}> = ({ identity, setIdentity, theme, setTheme, lang, setLang, audioFx, setAudioFx, onClose, t }) => {
  const generateRandomFreq = () => {
    const freq = Math.floor(100000 + Math.random() * 900000).toString();
    setIdentity({ ...identity, frequency: freq });
    audioService.playBeep('click');
  };

  return (
    <div className="modal-overlay p-10" style={{ backgroundColor: theme.background }}>
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl font-black uppercase font-orbitron italic" style={{ color: theme.accent }}>{String(t.ops_config)}</h2>
        <button onClick={onClose} className="text-xs font-black uppercase tracking-widest border-2 px-6 py-2 rounded-xl" style={{ borderColor: theme.accent, color: theme.accent }}>{String(t.back)}</button>
      </div>
      <div className="space-y-8 max-w-md mx-auto w-full pb-20">
        <div>
          <label className="text-[10px] font-black opacity-40 block mb-2 uppercase">{String(t.callsign_label)}</label>
          <input value={identity.callsign} onChange={e => setIdentity({...identity, callsign: e.target.value.toUpperCase()})} className="w-full bg-black/30 border-2 p-4 text-xl font-black rounded-xl outline-none" style={{ borderColor: theme.secondary, color: theme.accent }} />
        </div>
        <div>
          <label className="text-[10px] font-black opacity-40 block mb-2 uppercase">{String(t.freq_label)}</label>
          <div className="flex space-x-2">
            <input value={identity.frequency} maxLength={6} onChange={e => setIdentity({...identity, frequency: e.target.value.replace(/\D/g,'')})} className="flex-grow bg-black/30 border-2 p-4 text-xl font-black rounded-xl outline-none tracking-widest font-orbitron" style={{ borderColor: theme.secondary, color: theme.accent }} />
            <button onClick={generateRandomFreq} className="p-4 border-2 rounded-xl" style={{ borderColor: theme.accent, color: theme.accent }}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black opacity-40 block mb-2 uppercase">{String(t.lang_label)}</label>
            <div className="flex border-2 rounded-xl overflow-hidden" style={{ borderColor: theme.secondary }}>
              <button onClick={() => setLang('es')} className={`flex-1 py-3 text-xs font-black ${lang === 'es' ? 'bg-white/10' : 'opacity-30'}`}>ESP</button>
              <button onClick={() => setLang('en')} className={`flex-1 py-3 text-xs font-black ${lang === 'en' ? 'bg-white/10' : 'opacity-30'}`}>ENG</button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black opacity-40 block mb-2 uppercase">{String(t.audio_fx_label)}</label>
            <button onClick={() => setAudioFx(!audioFx)} className={`w-full py-3 border-2 rounded-xl text-xs font-black ${audioFx ? 'text-green-500 border-green-500' : 'opacity-30'}`} style={{ borderColor: audioFx ? '' : theme.secondary }}>{audioFx ? String(t.fx_on) : String(t.fx_off)}</button>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black opacity-40 block mb-4 uppercase">{String(t.theme_label)}</label>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map(th => (
              <button key={th.id} onClick={() => setTheme(th)} className="p-3 border-2 rounded-xl text-[9px] font-black flex justify-between items-center" style={{ backgroundColor: th.primary, borderColor: theme.id === th.id ? th.accent : 'transparent', color: th.accent }}>{th.name}</button>
            ))}
          </div>
        </div>
        
        <div className="pt-10 border-t border-white/5 space-y-4">
          <div className="text-center">
            <span className="text-[10px] opacity-20 uppercase font-black tracking-[0.3em]">{String(t.author_label)}</span>
            <h3 className="text-2xl font-black italic font-orbitron" style={{ color: theme.accent }}>MC WOLF</h3>
          </div>
          <div className="flex justify-center space-x-6">
            <a href="https://instagram.com" target="_blank" className="p-3 border-2 rounded-full" style={{ borderColor: theme.secondary, color: theme.accent }}>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href="https://twitter.com" target="_blank" className="p-3 border-2 rounded-full" style={{ borderColor: theme.secondary, color: theme.accent }}>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const QRBridge: React.FC<{ frequency: string; theme: Theme; t: any; onResult: (f: string) => void; onClose: () => void }> = ({ frequency, theme, t, onResult, onClose }) => {
  const [isCamActive, setIsCamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  // Generador de QR
  useEffect(() => {
    if (qrRef.current && (window as any).QRious) {
      new (window as any).QRious({
        element: qrRef.current,
        value: frequency,
        size: 250,
        background: 'transparent',
        foreground: theme.accent,
        level: 'H'
      });
    }
  }, [frequency, theme.accent]);

  // Escáner de QR
  useEffect(() => {
    let animFrame: number;
    const scan = () => {
      if (videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA && (window as any).jsQR) {
        const canvas = canvasRef.current!;
        const video = videoRef.current;
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(video, 0, 0);
        const code = (window as any).jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        if (code) { 
          audioService.playBeep('click'); 
          if (code.data.length === 6 && /^\d+$/.test(code.data)) {
            onResult(code.data); 
            return; 
          }
        }
      }
      animFrame = requestAnimationFrame(scan);
    };
    if (isCamActive) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(s => {
        if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); scan(); }
      }).catch(e => { console.error("Error Cámara: ", e); setIsCamActive(false); });
    }
    return () => { cancelAnimationFrame(animFrame); if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop()); };
  }, [isCamActive]);

  return (
    <div className="modal-overlay items-center p-8 overflow-y-auto" style={{ backgroundColor: theme.background }}>
      <div className="flex justify-between items-center w-full mb-8 max-w-md">
        <h2 className="text-xl font-black font-orbitron uppercase" style={{ color: theme.accent }}>{String(t.sync_title)}</h2>
        <button onClick={onClose} className="p-2 opacity-50" style={{ color: theme.text }}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="w-full max-w-md space-y-10 flex flex-col items-center">
        {/* Generador (Tu Código) */}
        <div className="flex flex-col items-center space-y-4">
          <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em]">Tu Frecuencia</span>
          <div className="p-4 bg-white/5 border-2 rounded-3xl backdrop-blur-sm relative" style={{ borderColor: theme.secondary }}>
            <canvas ref={qrRef} />
            <div className="absolute inset-0 border-4 border-transparent pointer-events-none" style={{ borderColor: theme.accent, opacity: 0.1 }} />
          </div>
          <div className="text-2xl font-black font-orbitron tracking-[0.5em]" style={{ color: theme.accent }}>{frequency}</div>
        </div>

        {/* Escáner */}
        <div className="w-full flex flex-col items-center space-y-6">
          <div className="relative w-64 h-64 border-4 rounded-3xl overflow-hidden bg-black/40" style={{ borderColor: isCamActive ? theme.accent : theme.secondary }}>
            {isCamActive ? (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_15px_red] animate-laser" />
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center opacity-30 p-8 text-center">
                <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-[10px] font-black uppercase tracking-widest">{String(t.scan_btn)}</span>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setIsCamActive(!isCamActive)} 
            className="w-full py-4 border-2 font-black uppercase text-xs rounded-xl transition-all active:scale-95" 
            style={{ borderColor: theme.accent, color: theme.accent, backgroundColor: isCamActive ? `${theme.accent}10` : 'transparent' }}
          >
            {isCamActive ? String(t.back) : String(t.scan_btn)}
          </button>
        </div>
      </div>
      
      <div className="mt-12 text-[9px] opacity-20 uppercase font-black text-center max-w-xs">
        Muestra tu pantalla a otra unidad o escanea su código para sincronizar nodos.
      </div>
    </div>
  );
};

// --- App Principal ---

const App: React.FC = () => {
  const [identity, setIdentity] = useState<UserIdentity>(() => {
    try {
      const saved = localStorage.getItem('cl_id');
      return saved ? JSON.parse(saved) : { callsign: DEFAULT_CALLSIGN, frequency: DEFAULT_FREQUENCY };
    } catch { return { callsign: DEFAULT_CALLSIGN, frequency: DEFAULT_FREQUENCY }; }
  });
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('cl_theme');
      return saved ? JSON.parse(saved) : THEMES[0];
    } catch { return THEMES[0]; }
  });
  const [lang, setLang] = useState<'es' | 'en'>(() => {
    const l = localStorage.getItem('cl_lang');
    return (l === 'en' || l === 'es') ? l : 'es';
  });
  const [audioFx, setAudioFx] = useState<boolean>(() => localStorage.getItem('cl_audiofx') !== 'false');
  const [peers, setPeers] = useState<string[]>([]);
  const [status, setStatus] = useState<AppState>(AppState.IDLE);
  const [receiving, setReceiving] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const peerServiceRef = useRef<PeerService | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  const translations = TRANSLATIONS[lang] || TRANSLATIONS.es;

  useEffect(() => {
    localStorage.setItem('cl_id', JSON.stringify(identity));
    localStorage.setItem('cl_theme', JSON.stringify(theme));
    localStorage.setItem('cl_lang', lang);
    localStorage.setItem('cl_audiofx', audioFx.toString());
    audioService.isEnabled = audioFx;
  }, [identity, theme, lang, audioFx]);

  useEffect(() => {
    const init = async () => {
      if (peerServiceRef.current) peerServiceRef.current.destroy();
      setStatus(AppState.CONNECTING);
      const ps = new PeerService(setPeers, (s) => {
        setReceiving(true); audioService.playBeep('receive'); if (audioRef.current) audioRef.current.srcObject = s;
      }, () => {
        setReceiving(false); audioService.playBeep('end');
      });
      try { 
        await ps.initialize(identity.frequency, identity.callsign); 
        peerServiceRef.current = ps; 
        setStatus(AppState.READY); 
      } catch { setStatus(AppState.ERROR); }
    };
    init();
    return () => peerServiceRef.current?.destroy();
  }, [identity.frequency]);

  const txStart = async () => {
    if (status === AppState.TRANSMITTING || receiving) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = s; 
      setStatus(AppState.TRANSMITTING); 
      audioService.playBeep('start');
      peerServiceRef.current?.broadcastVoice(s);
    } catch { setHandsFree(false); }
  };

  const txEnd = () => {
    if (status !== AppState.TRANSMITTING) return;
    setStatus(AppState.READY); 
    audioService.playBeep('end');
    peerServiceRef.current?.stopBroadcast();
    if (localStreamRef.current) { 
      localStreamRef.current.getTracks().forEach(track => track.stop()); 
      localStreamRef.current = null; 
    }
  };

  const toggleHandsFree = () => {
    audioService.playBeep('click');
    const next = !handsFree; 
    setHandsFree(next);
    if (next) txStart(); else txEnd();
  };

  const isTX = status === AppState.TRANSMITTING || handsFree;

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ color: theme.text, backgroundColor: theme.background }}>
      <audio ref={audioRef} autoPlay />
      
      <header className="pt-16 px-10 flex justify-between items-start z-20">
        <div>
          <h1 className="text-3xl font-black italic font-orbitron" style={{ color: theme.accent }}>COMMLINK</h1>
          <div className="flex items-center mt-2">
            <div className={`w-2 h-2 rounded-full mr-2 ${isTX ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-[10px] font-black uppercase opacity-70 tracking-widest">
              {isTX ? String(translations.transmitting) : String(translations.node_secured)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black opacity-30 uppercase tracking-tighter">
            {String(translations.active_units)}: {peers.length + 1}
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center space-y-12 z-10 px-8 text-center">
        <FrequencyDisplay value={identity.frequency} theme={theme} t={translations} />
        
        <div className="flex flex-col items-center space-y-8">
          <button 
            onMouseDown={!handsFree ? txStart : undefined} 
            onMouseUp={!handsFree ? txEnd : undefined}
            onTouchStart={(e) => { if (!handsFree) { e.preventDefault(); txStart(); } }}
            onTouchEnd={(e) => { if (!handsFree) { e.preventDefault(); txEnd(); } }}
            className={`relative w-56 h-56 rounded-full border-[12px] flex flex-col items-center justify-center transition-all ${isTX ? 'scale-105' : 'active:scale-95'}`}
            style={{ 
              borderColor: isTX ? theme.accent : theme.secondary, 
              backgroundColor: isTX ? theme.primary : theme.secondary, 
              boxShadow: isTX ? `0 0 40px ${theme.glow}` : undefined 
            }}
          >
            <svg className={`w-16 h-16 ${isTX ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="mt-4 text-[10px] font-black uppercase tracking-widest" style={{ color: isTX ? theme.accent : theme.text }}>
              {isTX ? (handsFree ? String(translations.latched_on) : String(translations.transmitting)) : String(translations.hold_to_comm)}
            </span>
          </button>

          <button onClick={toggleHandsFree} className={`flex items-center space-x-4 px-8 py-3 rounded-xl border-2 transition-all ${handsFree ? 'animate-pulse bg-white/5' : 'opacity-40'}`} style={{ borderColor: handsFree ? theme.accent : theme.secondary }}>
            <div className={`w-3 h-3 rounded-full ${handsFree ? 'bg-orange-500 shadow-[0_0_10px_orange]' : 'bg-gray-600'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">{String(translations.hands_free)} {handsFree ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-12 flex justify-between items-center z-20 pointer-events-none">
        <button onClick={() => setShowSettings(true)} className="p-6 border-2 rounded-2xl bg-black/40 backdrop-blur-md pointer-events-auto transition-all active:scale-90" style={{ borderColor: theme.secondary }}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.accent }}>
            <path strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </button>
        <button onClick={() => setShowQr(true)} className="p-6 border-2 rounded-2xl bg-black/40 backdrop-blur-md pointer-events-auto transition-all active:scale-90" style={{ borderColor: theme.secondary }}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.accent }}>
            <path strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
          </svg>
        </button>
      </footer>

      {showSettings && <SettingsPanel identity={identity} setIdentity={setIdentity} theme={theme} setTheme={setTheme} lang={lang} setLang={setLang} audioFx={audioFx} setAudioFx={setAudioFx} onClose={() => setShowSettings(false)} t={translations} />}
      {showQr && <QRBridge frequency={identity.frequency} theme={theme} t={translations} onClose={() => setShowQr(false)} onResult={(f) => { setIdentity({...identity, frequency: f}); setShowQr(false); }} />}

      {receiving && (
        <div className="fixed top-28 left-0 right-0 flex justify-center z-[50] pointer-events-none px-6">
          <div className="px-8 py-3 bg-red-600 text-white font-black rounded-full animate-pulse flex items-center space-x-4 shadow-[0_0_30px_red]">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
            <span className="text-[11px] uppercase tracking-widest font-black">{String(translations.incoming)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
