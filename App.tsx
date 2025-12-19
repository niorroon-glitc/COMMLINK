
import React, { useState, useEffect, useRef } from 'react';
import { THEMES, TRANSLATIONS, DEFAULT_CALLSIGN, DEFAULT_FREQUENCY } from './constants.ts';
import { AppState, UserIdentity, Theme } from './types.ts';
import { audioService } from './services/audioService.ts';
import { PeerService } from './services/peerService.ts';

// --- Sub-components ---

const ScanLine: React.FC = () => <div className="scanline" />;

const FrequencyDisplay: React.FC<{ value: string; theme: Theme; t: any }> = ({ value, theme, t }) => (
  <div 
    className="flex flex-col items-center justify-center p-6 rounded-xl border-2 shadow-lg transition-colors duration-500"
    style={{ borderColor: theme.accent, backgroundColor: theme.primary }}
  >
    <span className="text-[10px] uppercase opacity-50 mb-1 font-black tracking-[0.3em]" style={{ color: theme.text }}>{t.sector_freq}</span>
    <div className="text-5xl font-black tracking-widest font-orbitron" style={{ color: theme.accent }}>
      {value.slice(0, 3)}<span className="opacity-30">.</span>{value.slice(3)}
    </div>
  </div>
);

const PttButton: React.FC<{ 
  onStart: () => void; 
  onEnd: () => void; 
  active: boolean; 
  theme: Theme; 
  disabled: boolean;
  handsFreeActive: boolean;
  t: any;
}> = ({ onStart, onEnd, active, theme, disabled, handsFreeActive, t }) => {
  return (
    <div className="relative">
      {(active || handsFreeActive) && (
        <div 
          className="absolute inset-0 rounded-full animate-ping opacity-25"
          style={{ backgroundColor: theme.accent }}
        />
      )}
      <button
        onMouseDown={!handsFreeActive ? onStart : undefined}
        onMouseUp={!handsFreeActive ? onEnd : undefined}
        onTouchStart={(e) => { if (!handsFreeActive) { e.preventDefault(); onStart(); } }}
        onTouchEnd={(e) => { if (!handsFreeActive) { e.preventDefault(); onEnd(); } }}
        disabled={disabled}
        className={`
          relative w-52 h-52 rounded-full border-8 tactile-button-shadow transition-all duration-300
          flex items-center justify-center flex-col
          ${(active || handsFreeActive) ? 'tactile-button-active' : ''}
          ${disabled ? 'opacity-50 grayscale' : 'cursor-pointer active:scale-95'}
        `}
        style={{ 
          borderColor: (active || handsFreeActive) ? theme.accent : theme.secondary,
          backgroundColor: (active || handsFreeActive) ? theme.primary : theme.secondary,
          boxShadow: (active || handsFreeActive) ? `0 0 40px ${theme.glow}` : undefined
        }}
      >
        <svg 
          className={`w-14 h-14 transition-colors ${(active || handsFreeActive) ? 'animate-pulse' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          style={{ color: (active || handsFreeActive) ? theme.accent : theme.text }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <span 
          className="mt-2 text-[10px] font-black tracking-[0.2em] uppercase text-center px-4"
          style={{ color: (active || handsFreeActive) ? theme.accent : theme.text }}
        >
          {(active || handsFreeActive) ? (handsFreeActive ? t.latched_on : t.transmitting) : t.hold_to_comm}
        </span>
      </button>
    </div>
  );
};

const QrPanel: React.FC<{
  frequency: string;
  theme: Theme;
  onClose: () => void;
  onScan: (freq: string) => void;
  t: any;
}> = ({ frequency, theme, onClose, onScan, t }) => {
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // @ts-ignore
    if (!isScanning && qrRef.current && window.QRious) {
      // @ts-ignore
      new window.QRious({
        element: qrRef.current,
        value: frequency,
        size: 240,
        background: 'transparent',
        foreground: theme.accent,
      });
    }
  }, [frequency, theme.accent, isScanning]);

  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;

    const tick = () => {
      // @ts-ignore
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current && window.jsQR) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          // @ts-ignore
          const code = window.jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            audioService.playBeep('click');
            onScan(code.data);
            return;
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    if (isScanning) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
            tick();
          }
        })
        .catch(err => {
          console.error("Camera access denied", err);
          setIsScanning(false);
        });
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [isScanning, onScan]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
      <div 
        className="w-full max-w-sm p-8 rounded-2xl border-2 flex flex-col items-center"
        style={{ backgroundColor: theme.background, borderColor: theme.accent }}
      >
        <div className="w-full flex justify-between items-center mb-8">
          <button onClick={onClose} className="flex items-center space-x-2 opacity-60" style={{ color: theme.text }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest">{t.back}</span>
          </button>
          <h2 className="text-xl font-black font-orbitron uppercase tracking-tighter italic" style={{ color: theme.accent }}>
            {t.sync_title}
          </h2>
        </div>

        <div className="relative w-full aspect-square bg-black/40 rounded-xl border-2 overflow-hidden flex items-center justify-center mb-8" style={{ borderColor: theme.secondary }}>
          {isScanning ? (
            <>
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-2 border-dashed border-white/10 animate-pulse pointer-events-none" />
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-red-500 shadow-[0_0_15px_red] animate-scan z-10" />
            </>
          ) : (
            <canvas ref={qrRef} />
          )}
        </div>

        <button 
          onClick={() => { audioService.playBeep('click'); setIsScanning(!isScanning); }}
          className="w-full py-4 border-2 font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-3 transition-all active:scale-95"
          style={{ borderColor: theme.accent, color: theme.accent }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{isScanning ? t.exit_sync : t.scan_btn}</span>
        </button>
      </div>
    </div>
  );
};

const SettingsPanel: React.FC<{
  identity: UserIdentity;
  setIdentity: (id: UserIdentity) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  lang: 'es' | 'en';
  setLang: (l: 'es' | 'en') => void;
  audioFx: boolean;
  setAudioFx: (v: boolean) => void;
  onClose: () => void;
  t: any;
}> = ({ identity, setIdentity, theme, setTheme, lang, setLang, audioFx, setAudioFx, onClose, t }) => {
  
  const generateRandomFreq = () => {
    audioService.playBeep('click');
    const rnd = Math.floor(100000 + Math.random() * 900000).toString();
    setIdentity({ ...identity, frequency: rnd });
  };

  const handleCustomColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    const customBase = THEMES.find(t => t.id === 'custom') || THEMES[0];
    setTheme({ 
      ...customBase, 
      id: 'custom', 
      accent: color, 
      glow: `${color}88` 
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-lg">
      <div 
        className="w-full max-w-lg p-8 rounded-2xl border-2 shadow-2xl overflow-y-auto max-h-[92vh] flex flex-col"
        style={{ backgroundColor: theme.background, borderColor: theme.accent }}
      >
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black uppercase font-orbitron italic" style={{ color: theme.accent }}>{t.ops_config}</h2>
          <button onClick={onClose} className="text-[10px] font-black uppercase tracking-widest border-2 px-4 py-2 rounded-lg active:scale-95 transition-all" style={{ borderColor: theme.accent, color: theme.accent }}>{t.back}</button>
        </div>

        <div className="space-y-8 flex-grow">
          <div>
            <label className="text-[10px] font-black opacity-50 block mb-2 uppercase tracking-widest">{t.callsign_label}</label>
            <input 
              value={identity.callsign} 
              onChange={e => setIdentity({...identity, callsign: e.target.value.toUpperCase()})} 
              className="w-full bg-black/40 border-2 p-4 text-xl font-black outline-none rounded-xl" 
              style={{ borderColor: theme.secondary, color: theme.accent }} 
            />
          </div>

          <div>
            <label className="text-[10px] font-black opacity-50 block mb-2 uppercase tracking-widest">{t.freq_label}</label>
            <div className="flex space-x-3">
              <input 
                value={identity.frequency} 
                maxLength={6} 
                onChange={e => setIdentity({...identity, frequency: e.target.value.replace(/\D/g,'')})} 
                className="flex-grow bg-black/40 border-2 p-4 text-xl font-black outline-none tracking-widest rounded-xl" 
                style={{ borderColor: theme.secondary, color: theme.accent }} 
              />
              <button onClick={generateRandomFreq} className="px-6 border-2 font-black text-xs uppercase rounded-xl active:scale-95 transition-all" style={{ borderColor: theme.accent, color: theme.accent }}>RND</button>
            </div>
          </div>

          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="text-[10px] font-black opacity-50 block mb-2 uppercase tracking-widest">{t.lang_label}</label>
              <div className="flex border-2 rounded-xl overflow-hidden" style={{ borderColor: theme.secondary }}>
                <button onClick={() => setLang('es')} className={`flex-1 py-3 text-[10px] font-black ${lang === 'es' ? 'bg-white/10' : 'opacity-40'}`}>ESP</button>
                <button onClick={() => setLang('en')} className={`flex-1 py-3 text-[10px] font-black ${lang === 'en' ? 'bg-white/10' : 'opacity-40'}`}>ENG</button>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-black opacity-50 block mb-2 uppercase tracking-widest">{t.audio_fx_label}</label>
              <button onClick={() => setAudioFx(!audioFx)} className={`w-full py-3 border-2 rounded-xl text-[10px] font-black ${audioFx ? 'border-green-500 text-green-500 shadow-[0_0_10px_green]' : 'opacity-40'}`} style={{ borderColor: audioFx ? '' : theme.secondary }}>{audioFx ? t.fx_on : t.fx_off}</button>
            </div>
          </div>

          <div>
             <label className="text-[10px] font-black opacity-50 block mb-4 uppercase tracking-widest">{t.theme_label}</label>
             <div className="grid grid-cols-2 gap-3 mb-6">
                {THEMES.map(th => (
                  <button key={th.id} onClick={() => setTheme(th)} className={`p-3 border-2 flex items-center justify-between text-[9px] font-black rounded-lg transition-all ${theme.id === th.id ? 'scale-105' : 'opacity-40 grayscale'}`} style={{ borderColor: theme.id === th.id ? th.accent : 'transparent', backgroundColor: th.primary, color: th.accent }}>
                    {th.name}<div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: th.accent }} />
                  </button>
                ))}
             </div>
             
             <div className="p-5 border-2 rounded-2xl flex flex-col space-y-4" style={{ borderColor: theme.secondary, backgroundColor: 'rgba(0,0,0,0.3)' }}>
                <label className="text-[10px] font-black uppercase opacity-60 flex justify-between tracking-widest">
                   {t.custom_color} 
                   <span style={{ color: theme.accent }}>{theme.accent}</span>
                </label>
                <input type="color" value={theme.accent} onChange={handleCustomColor} className="w-full h-12 bg-transparent cursor-pointer rounded-lg overflow-hidden border-none" />
             </div>
          </div>

          <div className="pt-10 border-t-2 border-white/10 flex flex-col items-center pb-6">
             <span className="text-[10px] font-black opacity-30 mb-2 uppercase tracking-[0.4em]">{t.author_label}</span>
             <span className="text-xl font-black italic mb-6 font-orbitron" style={{ color: theme.accent }}>Mc Wolf</span>
             <div className="flex space-x-12">
              <a href="https://www.facebook.com/share/1aJC2QMujs/" target="_blank" rel="noopener noreferrer"><svg className="w-8 h-8 opacity-50 hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24" style={{ color: theme.accent }}><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg></a>
              <a href="https://www.instagram.com/mc_roony03?igsh=MW41bmh6ZmpyZXI4bg==" target="_blank" rel="noopener noreferrer"><svg className="w-8 h-8 opacity-50 hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24" style={{ color: theme.accent }}><path d="M12 2c2.717 0 3.056.01 4.122.058 1.066.048 1.79.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.637.417 1.361.465 2.427.048 1.066.058 1.405.058 4.122s-.01 3.056-.058 4.122c-.048 1.066-.218 1.79-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.637.247-1.361.417-2.427.465-1.066.048-1.405.058-4.122.058s-3.056-.01-4.122-.058c-1.066-.048-1.79-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.637-.417-1.361-.465-2.427-.048-1.066-.058-1.405-.058-4.122s.01-3.056.058-4.122c.048-1.066.218-1.79.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 3.058c.637-.247 1.361-.417 2.427-.465C8.944 2.01 9.283 2 12 2zm0 5a5 5 0 100 10 5 5 0 000-10zm6.5-.25a1.25 1.25 0 10-2.5 0 1.25 1.25 0 002.5 0zM12 9a3 3 0 110 6 3 3 0 010-6z"/></svg></a>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [identity, setIdentity] = useState<UserIdentity>(() => {
    try {
      const saved = localStorage.getItem('cl_id');
      return saved ? JSON.parse(saved) : { callsign: DEFAULT_CALLSIGN, frequency: DEFAULT_FREQUENCY };
    } catch {
      return { callsign: DEFAULT_CALLSIGN, frequency: DEFAULT_FREQUENCY };
    }
  });

  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('cl_theme');
      return saved ? JSON.parse(saved) : THEMES[0];
    } catch {
      return THEMES[0];
    }
  });

  const [lang, setLang] = useState<'es' | 'en'>(() => (localStorage.getItem('cl_lang') as any) || 'es');
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
  const t = TRANSLATIONS[lang];

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
      const ps = new PeerService(
        setPeers,
        (s) => {
          setReceiving(true);
          audioService.playBeep('receive');
          if (audioRef.current) audioRef.current.srcObject = s;
        },
        () => {
          setReceiving(false);
          audioService.playBeep('end');
        }
      );
      try {
        await ps.initialize(identity.frequency, identity.callsign);
        peerServiceRef.current = ps;
        setStatus(AppState.READY);
      } catch (e) {
        console.error("Peer init failed", e);
        setStatus(AppState.ERROR);
      }
    };
    init();
    return () => peerServiceRef.current?.destroy();
  }, [identity.frequency]);

  const txStart = async () => {
    if (status !== AppState.READY || receiving) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = s;
      setStatus(AppState.TRANSMITTING);
      audioService.playBeep('start');
      peerServiceRef.current?.broadcastVoice(s);
    } catch (e) {
      console.error("Microphone access failed", e);
      setHandsFree(false);
    }
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

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden transition-colors duration-500" style={{ color: theme.text, backgroundColor: theme.background }}>
      <ScanLine />
      <audio ref={audioRef} autoPlay />
      
      <header className="pt-12 px-8 flex justify-between items-start z-20">
        <div>
          <h1 className="text-3xl font-black italic font-orbitron" style={{ color: theme.accent }}>COMMLINK</h1>
          <div className="flex items-center mt-3">
            <div className={`w-2 h-2 rounded-full mr-2 ${status === AppState.TRANSMITTING || handsFree ? 'bg-orange-500 animate-pulse' : status === AppState.READY ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
              {status === AppState.TRANSMITTING ? t.uplink_active : receiving ? t.downlink_active : t.node_secured}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-black opacity-40 uppercase tracking-widest">CALLSIGN</div>
          <div className="text-xl font-black uppercase tracking-tighter" style={{ color: theme.accent }}>{identity.callsign}</div>
          <div className="text-[9px] font-black opacity-30 mt-1 uppercase tracking-tighter">{t.active_units}: {peers.length + 1}</div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center space-y-12 z-10 px-8 text-center">
        <FrequencyDisplay value={identity.frequency} theme={theme} t={t} />

        <div className="flex flex-col items-center space-y-8">
          <PttButton 
            onStart={txStart} 
            onEnd={txEnd} 
            active={status === AppState.TRANSMITTING} 
            theme={theme} 
            disabled={status === AppState.CONNECTING || receiving} 
            handsFreeActive={handsFree} 
            t={t} 
          />

          <button 
            onClick={() => { audioService.playBeep('click'); setHandsFree(!handsFree); handsFree ? txEnd() : txStart(); }} 
            className={`flex items-center space-x-3 px-8 py-3 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 ${handsFree ? 'animate-pulse' : 'opacity-60'}`} 
            style={{ borderColor: handsFree ? theme.accent : theme.secondary, color: handsFree ? theme.accent : theme.text }}
          >
            <div className={`w-3 h-3 rounded-full ${handsFree ? 'bg-orange-500 shadow-[0_0_12px_orange]' : 'bg-gray-600'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">{t.hands_free} {handsFree ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </main>

      <footer className="pb-12 px-10 flex justify-between items-center z-20">
        <button 
          onClick={() => { audioService.playBeep('click'); setShowSettings(true); }} 
          className="p-4 border-2 rounded-2xl transition-all hover:scale-110 active:scale-90" 
          style={{ borderColor: theme.secondary, backgroundColor: 'rgba(0,0,0,0.2)' }}
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.accent }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button 
          onClick={() => { audioService.playBeep('click'); setShowQr(true); }} 
          className="p-4 border-2 rounded-2xl transition-all hover:scale-110 active:scale-90" 
          style={{ borderColor: theme.secondary, backgroundColor: 'rgba(0,0,0,0.2)' }}
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.accent }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </button>
      </footer>

      {showSettings && (
        <SettingsPanel 
          identity={identity} setIdentity={setIdentity} 
          theme={theme} setTheme={setTheme} 
          lang={lang} setLang={setLang} 
          audioFx={audioFx} setAudioFx={setAudioFx} 
          onClose={() => setShowSettings(false)} t={t} 
        />
      )}
      
      {showQr && (
        <QrPanel 
          frequency={identity.frequency} theme={theme} 
          onClose={() => setShowQr(false)} 
          onScan={(f) => { setIdentity({...identity, frequency: f}); setShowQr(false); }} t={t} 
        />
      )}

      {receiving && (
        <div className="fixed top-24 left-0 right-0 flex justify-center z-50 pointer-events-none px-6">
          <div className="px-6 py-2 bg-red-600 text-white font-black rounded-full animate-pulse flex items-center space-x-3 shadow-[0_0_20px_red]">
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            <span className="text-[10px] uppercase tracking-[0.2em]">{t.incoming}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
