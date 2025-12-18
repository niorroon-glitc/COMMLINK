
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { THEMES, TRANSLATIONS, FREQUENCY_LENGTH, DEFAULT_CALLSIGN, DEFAULT_FREQUENCY } from './constants';
import { AppState, UserIdentity, Theme } from './types';
import { audioService } from './services/audioService';
import { PeerService } from './services/peerService';

// --- Sub-components ---

const ScanLine: React.FC = () => <div className="scanline" />;

const FrequencyDisplay: React.FC<{ value: string; theme: Theme; t: any }> = ({ value, theme, t }) => (
  <div 
    className="flex flex-col items-center justify-center p-4 rounded-lg border-2"
    style={{ borderColor: theme.accent, backgroundColor: theme.primary }}
  >
    <span className="text-[10px] uppercase opacity-60 mb-1 font-bold tracking-[0.2em]" style={{ color: theme.text }}>{t.sector_freq}</span>
    <div className="text-4xl font-black tracking-widest font-mono" style={{ color: theme.accent }}>
      {value.slice(0, 3)}<span className="opacity-40">.</span>{value.slice(3)}
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
    <div className="relative group">
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
          relative w-52 h-52 rounded-full border-8 tactile-button-shadow transition-all duration-75
          flex items-center justify-center flex-col
          ${(active || handsFreeActive) ? 'tactile-button-active' : ''}
          ${disabled ? 'opacity-50 grayscale' : 'cursor-pointer'}
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

// Fixed missing QrPanel component
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
    // Generate QR code using QRious from CDN
    // @ts-ignore
    if (!isScanning && qrRef.current && window.QRious) {
      // @ts-ignore
      new window.QRious({
        element: qrRef.current,
        value: frequency,
        size: 200,
        background: 'transparent',
        foreground: theme.accent,
      });
    }
  }, [frequency, theme.accent, isScanning]);

  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;

    const startScan = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          tick();
        }
      } catch (err) {
        console.error("Camera access denied", err);
        setIsScanning(false);
      }
    };

    const tick = () => {
      // Scan QR code using jsQR from CDN
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
          const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
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
      startScan();
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [isScanning, onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <div 
        className="w-full max-w-lg p-8 rounded-2xl border-2 shadow-2xl flex flex-col items-center"
        style={{ backgroundColor: theme.background, borderColor: theme.accent }}
      >
        <div className="w-full flex justify-between items-center mb-8">
          <button onClick={onClose} className="flex items-center space-x-2 opacity-60" style={{ color: theme.text }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest">{t.back}</span>
          </button>
          <h2 className="text-xl font-black uppercase tracking-tighter italic" style={{ color: theme.accent }}>
            {t.sync_title}
          </h2>
        </div>

        <div className="relative w-full aspect-square max-w-[280px] bg-black/40 rounded-2xl border-2 overflow-hidden flex items-center justify-center mb-8" style={{ borderColor: theme.secondary }}>
          {isScanning ? (
            <>
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-2 border-dashed border-white/20 animate-pulse pointer-events-none" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/50 shadow-[0_0_10px_red] animate-scan" />
            </>
          ) : (
            <canvas ref={qrRef} />
          )}
        </div>

        <button 
          onClick={() => { audioService.playBeep('click'); setIsScanning(!isScanning); }}
          className="w-full p-4 font-black uppercase tracking-widest border-2 transition-all flex items-center justify-center space-x-3"
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <div 
        className="w-full max-w-lg p-8 rounded-2xl border-2 shadow-2xl overflow-y-auto max-h-[92vh] flex flex-col"
        style={{ backgroundColor: theme.background, borderColor: theme.accent }}
      >
        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={onClose}
            className="flex items-center space-x-2 opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: theme.text }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest">{t.back}</span>
          </button>
          <div className="text-[9px] px-3 py-1 border-2 rounded-full font-black uppercase tracking-tighter" style={{ borderColor: theme.secondary, color: theme.secondary }}>
            {lang === 'es' ? 'SISTEMA ACTIVO' : 'SYSTEM ACTIVE'}
          </div>
        </div>

        <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 italic" style={{ color: theme.accent }}>
          {t.ops_config}
        </h2>
        
        <div className="space-y-8 flex-grow">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Language Switcher */}
            <div>
              <label className="block text-[10px] font-black uppercase mb-3 tracking-[0.3em] opacity-50" style={{ color: theme.text }}>{t.lang_label}</label>
              <div className="flex p-1 bg-black/40 border-2 rounded-xl" style={{ borderColor: theme.secondary }}>
                <button 
                  onClick={() => { audioService.playBeep('click'); setLang('es'); }}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${lang === 'es' ? 'bg-white/10 text-white' : 'opacity-40'}`}
                  style={{ color: lang === 'es' ? theme.accent : theme.text }}
                >ESP</button>
                <button 
                  onClick={() => { audioService.playBeep('click'); setLang('en'); }}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${lang === 'en' ? 'bg-white/10 text-white' : 'opacity-40'}`}
                  style={{ color: lang === 'en' ? theme.accent : theme.text }}
                >ENG</button>
              </div>
            </div>

            {/* Audio FX Switcher */}
            <div>
              <label className="block text-[10px] font-black uppercase mb-3 tracking-[0.3em] opacity-50" style={{ color: theme.text }}>{t.audio_fx_label}</label>
              <button 
                onClick={() => { audioService.playBeep('click'); setAudioFx(!audioFx); }}
                className="w-full flex items-center justify-between p-3 bg-black/40 border-2 rounded-xl transition-all"
                style={{ borderColor: audioFx ? theme.accent : theme.secondary }}
              >
                <span className="text-[10px] font-black uppercase" style={{ color: audioFx ? theme.accent : theme.text }}>
                  {audioFx ? t.fx_on : t.fx_off}
                </span>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${audioFx ? 'bg-green-600' : 'bg-gray-700'}`}>
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${audioFx ? 'left-6' : 'left-1'}`} />
                </div>
              </button>
            </div>
          </div>

          {/* Callsign Input */}
          <div className="group">
            <label className="block text-[10px] font-black uppercase mb-3 tracking-[0.3em] opacity-50" style={{ color: theme.text }}>{t.callsign_label}</label>
            <input 
              type="text" 
              maxLength={12}
              value={identity.callsign}
              placeholder="ENTER CALLSIGN"
              onChange={(e) => {
                setIdentity({ ...identity, callsign: e.target.value.toUpperCase() });
              }}
              className="w-full p-4 rounded-xl bg-black/40 border-2 outline-none font-bold tracking-widest text-xl transition-all"
              style={{ color: theme.accent, borderColor: theme.secondary } as any}
            />
          </div>

          {/* Room / Frequency Input with Randomizer */}
          <div className="group">
            <label className="block text-[10px] font-black uppercase mb-3 tracking-[0.3em] opacity-50" style={{ color: theme.text }}>{t.freq_label}</label>
            <div className="flex space-x-3">
              <input 
                type="text" 
                maxLength={6}
                value={identity.frequency}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setIdentity({ ...identity, frequency: val });
                }}
                className="flex-grow p-4 rounded-xl bg-black/40 border-2 outline-none font-mono font-bold tracking-[0.5em] text-2xl"
                style={{ color: theme.accent, borderColor: theme.secondary }}
              />
              <button 
                onClick={generateRandomFreq}
                className="px-6 rounded-xl border-2 font-black text-xs hover:bg-white/10 transition-colors uppercase"
                style={{ borderColor: theme.accent, color: theme.accent }}
              >
                RND
              </button>
            </div>
          </div>

          {/* Theme Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-4 tracking-[0.3em] opacity-50" style={{ color: theme.text }}>{t.theme_label}</label>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map(t_theme => (
                <button
                  key={t_theme.id}
                  onClick={() => {
                    audioService.playBeep('click');
                    setTheme(t_theme);
                  }}
                  className={`p-3 text-[9px] font-black rounded-lg border-2 transition-all flex items-center justify-between ${theme.id === t_theme.id ? 'opacity-100' : 'opacity-40 grayscale'}`}
                  style={{ 
                    backgroundColor: t_theme.primary, 
                    color: t_theme.accent, 
                    borderColor: theme.id === t_theme.id ? t_theme.accent : 'transparent' 
                  }}
                >
                  {t_theme.name}
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t_theme.accent }} />
                </button>
              ))}
            </div>
          </div>

          {/* Author Section - Mc Wolf */}
          <div className="pt-8 mt-4 border-t-2" style={{ borderColor: `${theme.secondary}44` }}>
            <div className="flex flex-col items-center">
              <div className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40 mb-4" style={{ color: theme.text }}>{t.author_label}</div>
              
              <div className="w-full p-4 rounded-xl border-2 border-dashed flex flex-col items-center" style={{ borderColor: `${theme.accent}44` }}>
                 <div className="text-xl font-black italic tracking-tighter mb-4" style={{ color: theme.accent }}>
                    Mc Wolf
                 </div>
                 
                 <div className="flex items-center space-x-6">
                    <a 
                      href="https://www.facebook.com/share/1aJC2QMujs/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="transition-transform hover:scale-110 active:scale-95 flex items-center space-x-2"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: theme.accent }}>
                        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                      </svg>
                      <span className="text-[8px] font-black uppercase opacity-60" style={{ color: theme.text }}>FB</span>
                    </a>

                    <a 
                      href="https://www.instagram.com/mc_roony03?igsh=MW41bmh6ZmpyZXI4bg==" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="transition-transform hover:scale-110 active:scale-95 flex items-center space-x-2"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: theme.accent }}>
                        <path d="M12 2c2.717 0 3.056.01 4.122.058 1.066.048 1.79.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.637.417 1.361.465 2.427.048 1.066.058 1.405.058 4.122s-.01 3.056-.058 4.122c-.048 1.066-.218 1.79-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.637.247-1.361.417-2.427.465-1.066.048-1.405.058-4.122.058s-3.056-.01-4.122-.058c-1.066-.048-1.79-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.637-.417-1.361-.465-2.427-.048-1.066-.058-1.405-.058-4.122s.01-3.056.058-4.122c.048-1.066.218-1.79.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 3.058c.637-.247 1.361-.417 2.427-.465C8.944 2.01 9.283 2 12 2zm0 5a5 5 0 100 10 5 5 0 000-10zm6.5-.25a1.25 1.25 0 10-2.5 0 1.25 1.25 0 002.5 0zM12 9a3 3 0 110 6 3 3 0 010-6z" />
                      </svg>
                      <span className="text-[8px] font-black uppercase opacity-60" style={{ color: theme.text }}>IG</span>
                    </a>
                 </div>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={() => {
            audioService.playBeep('click');
            onClose();
          }}
          className="w-full mt-10 p-5 font-black uppercase tracking-[0.4em] border-4 shadow-xl active:scale-95 transition-transform"
          style={{ backgroundColor: theme.accent, color: theme.background, borderColor: theme.accent }}
        >
          {t.save_changes}
        </button>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(THEMES[0]);
  const [lang, setLang] = useState<'es' | 'en'>(() => {
    const saved = localStorage.getItem('commlink_lang');
    return (saved === 'en' || saved === 'es') ? saved : 'es';
  });
  const [audioFx, setAudioFx] = useState<boolean>(() => {
    const saved = localStorage.getItem('commlink_audiofx');
    return saved === null ? true : saved === 'true';
  });
  const [identity, setIdentity] = useState<UserIdentity>(() => {
    const saved = localStorage.getItem('commlink_identity');
    return saved ? JSON.parse(saved) : { callsign: DEFAULT_CALLSIGN, frequency: DEFAULT_FREQUENCY };
  });
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [peerList, setPeerList] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  
  const peerServiceRef = useRef<PeerService | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    localStorage.setItem('commlink_identity', JSON.stringify(identity));
    localStorage.setItem('commlink_lang', lang);
    localStorage.setItem('commlink_audiofx', audioFx.toString());
    audioService.isEnabled = audioFx;
  }, [identity, lang, audioFx]);

  useEffect(() => {
    const initPeer = async () => {
      if (peerServiceRef.current) peerServiceRef.current.destroy();
      setAppState(AppState.CONNECTING);
      const ps = new PeerService(
        (peers) => setPeerList(peers),
        (stream) => {
          setIsReceiving(true);
          audioService.playBeep('receive');
          if (audioRef.current) { audioRef.current.srcObject = stream; audioRef.current.play(); }
        },
        () => { setIsReceiving(false); audioService.playBeep('end'); }
      );
      try {
        await ps.initialize(identity.frequency, identity.callsign);
        peerServiceRef.current = ps;
        setAppState(AppState.READY);
      } catch (err) { setAppState(AppState.ERROR); }
    };
    initPeer();
    return () => peerServiceRef.current?.destroy();
  }, [identity.frequency]); 

  const startTransmitting = async () => {
    if (appState !== AppState.READY || isReceiving) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setAppState(AppState.TRANSMITTING);
      audioService.playBeep('start');
      peerServiceRef.current?.broadcastVoice(stream);
    } catch (err) { setHandsFree(false); }
  };

  const stopTransmitting = () => {
    if (appState !== AppState.TRANSMITTING) return;
    setAppState(AppState.READY);
    audioService.playBeep('end');
    peerServiceRef.current?.stopBroadcast();
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(track => track.stop()); localStreamRef.current = null; }
  };

  const toggleHandsFree = useCallback(() => {
    if (isReceiving) return;
    const newState = !handsFree;
    audioService.playBeep('click');
    setHandsFree(newState);
    newState ? startTransmitting() : stopTransmitting();
  }, [handsFree, isReceiving]);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden military-grid" style={{ backgroundColor: theme.background, color: theme.text }}>
      <ScanLine />
      <audio ref={audioRef} autoPlay />

      <header className="pt-12 px-8 flex justify-between items-start z-20">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black uppercase italic leading-none" style={{ color: theme.accent }}>COMMLINK</h1>
          <div className="flex items-center mt-3">
            <div className={`w-2 h-2 rounded-full mr-2 ${(handsFree || appState === AppState.TRANSMITTING) ? 'bg-orange-500 animate-pulse' : appState === AppState.READY ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[9px] uppercase font-black tracking-[0.2em] opacity-80">
              {appState === AppState.TRANSMITTING ? t.uplink_active : isReceiving ? t.downlink_active : appState === AppState.READY ? t.node_secured : '...'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase font-black opacity-40 tracking-widest">UNIT_ID</div>
          <div className="text-xl font-black tracking-tighter" style={{ color: theme.accent }}>{identity.callsign}</div>
          <div className="text-[9px] uppercase font-black opacity-40 mt-1">{t.active_units}: {peerList.length + 1}</div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center space-y-8 px-6 z-10">
        <FrequencyDisplay value={identity.frequency} theme={theme} t={t} />
        <div className="flex items-end space-x-1.5 h-12 w-full max-w-[200px]">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex-grow transition-all duration-75 rounded-t-sm" style={{ height: (isReceiving || appState === AppState.TRANSMITTING || handsFree) ? `${Math.floor(Math.random() * 80) + 20}%` : '4px', backgroundColor: theme.accent, opacity: (isReceiving || appState === AppState.TRANSMITTING || handsFree) ? 1 : 0.15 }} />
          ))}
        </div>
        <div className="flex flex-col items-center space-y-6">
          <PttButton onStart={startTransmitting} onEnd={stopTransmitting} active={appState === AppState.TRANSMITTING} theme={theme} disabled={appState === AppState.CONNECTING || isReceiving} handsFreeActive={handsFree} t={t} />
          <button onClick={toggleHandsFree} disabled={isReceiving} className={`flex items-center space-x-3 px-6 py-3 rounded-lg border-2 transition-all ${handsFree ? 'animate-pulse' : 'opacity-60'}`} style={{ borderColor: handsFree ? theme.accent : theme.secondary, color: handsFree ? theme.accent : theme.text }}>
            <div className={`w-3 h-3 rounded-full ${handsFree ? 'bg-orange-500 shadow-[0_0_10px_orange]' : 'bg-gray-600'}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t.hands_free} {handsFree ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </main>

      <footer className="pb-12 px-10 flex justify-between items-center z-20">
        <button onClick={() => { audioService.playBeep('click'); setShowSettings(true); }} className="p-4 rounded-xl border flex items-center space-x-3 bg-black/20" style={{ borderColor: theme.secondary }}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.accent }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
        </button>
        <button onClick={() => { audioService.playBeep('click'); setShowQr(true); }} className="p-4 rounded-xl border flex items-center space-x-3 bg-black/20" style={{ borderColor: theme.secondary }}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.accent }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
        </button>
      </footer>

      {showSettings && <SettingsPanel identity={identity} setIdentity={setIdentity} theme={theme} setTheme={setTheme} lang={lang} setLang={setLang} audioFx={audioFx} setAudioFx={setAudioFx} onClose={() => setShowSettings(false)} t={t} />}
      {showQr && <QrPanel frequency={identity.frequency} theme={theme} onClose={() => setShowQr(false)} onScan={(f) => { setIdentity({...identity, frequency: f}); setShowQr(false); }} t={t} />}
      {isReceiving && <div className="fixed top-24 left-0 right-0 flex justify-center z-50 pointer-events-none"><div className="px-6 py-2 bg-red-600 text-white font-black rounded-full animate-pulse flex items-center space-x-3"><div className="w-2 h-2 bg-white rounded-full animate-ping" /><span className="text-[10px] uppercase tracking-[0.2em]">{t.incoming}</span></div></div>}
    </div>
  );
};

export default App;
