/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameView, GameSettings, GameMode, GameStats } from './types';
import { playSound } from './lib/audio';
import Game from './components/Game';
import HUD from './components/HUD';
import Settings from './components/Settings';
import Results from './components/Results';

const DEFAULT_SETTINGS: GameSettings = {
  sensitivity: 0.5,
  adsSensitivity: 0.3,
  fov: 103, // Valorant/CS2 standard
  mode: GameMode.GRIDSHOT,
  theme: 'dark',
  themeColor: '#a3e635',
  popBots: {
    weapon: 'PISTOL',
    difficulty: 'MEDIUM',
    botColor: '#a3e635',
    obstacleColor: '#333333',
  },
  map: {
    botsHitBack: false,
    botsToKill: 15,
    infiniteAmmo: false,
    isStaticBots: false,
    difficulty: 'MEDIUM',
  },
  crosshair: {
    style: 'cross',
    size: 10,
    thickness: 2,
    gap: 4,
    color: '#a3e635',
    opacity: 1,
    enableRecoil: false,
  },
  hud: {
    color: '#a3e635',
    scale: 1,
    showFPS: true,
    showKills: true,
  },
};

export default function App() {
  const [view, setView] = useState<GameView>(GameView.MENU);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [lastStats, setLastStats] = useState<GameStats | null>(null);
  const [currentStats, setCurrentStats] = useState<GameStats | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
      // Also block if screen is very narrow (phone-like) or if it's a known mobile UA
      if (mobileRegex.test(userAgent) || window.innerWidth < 500) {
        setIsMobile(true);
      } else {
        setIsMobile(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleModeChange = useCallback((mode: GameMode) => {
    setSettings(prev => {
      const newSettings = { ...prev, mode };
      if (mode === GameMode.GRIDSHOT || mode === GameMode.SIXSHOT) {
        newSettings.popBots = { ...newSettings.popBots, weapon: 'PISTOL' };
      }
      return newSettings;
    });
  }, []);

  const startGame = useCallback((mode: GameMode) => {
    handleModeChange(mode);
    setCurrentStats({
      score: 0,
      hits: 0,
      misses: 0,
      accuracy: 100,
      timeRemaining: 60,
    });
    setIsPaused(false);
    setView(GameView.PLAYING);
  }, [handleModeChange]);

  const endGame = useCallback((stats: GameStats) => {
    setLastStats(stats);
    setCurrentStats(null);
    setIsPaused(false);
    setView(GameView.RESULTS);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && view === GameView.PLAYING) {
        setIsPaused(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view]);

  if (isMobile) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center p-8 text-center font-mono">
        <h1 className="text-4xl font-black italic uppercase mb-8" style={{ color: settings.themeColor }}>VOXEL AIM</h1>
        <div className="p-8 border-4 border-zinc-800 bg-zinc-900 max-w-md">
          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            &gt; SYSTEM ERROR: HARDWARE MISMATCH<br />
            &gt; MOBILE DEVICES ARE NOT SUPPORTED FOR NEURAL ACCURACY TRAINING.<br />
            &gt; PLEASE ACCESS THE HUB VIA A DESKTOP ARCHITECTURE.
          </p>
          <div className="h-1 bg-zinc-800 w-full overflow-hidden">
            <motion.div 
              animate={{ x: ['-100%', '100%'] }} 
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="h-full w-1/2" 
              style={{ backgroundColor: settings.themeColor }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-zinc-950 overflow-hidden font-sans select-none text-white lg:border-[16px] border-zinc-900 border-8">
      <AnimatePresence mode="wait">
        {view === GameView.MENU && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col p-4 lg:p-8 bg-zinc-950 shadow-inner overflow-y-auto"
          >
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 lg:mb-12 gap-4">
              <div>
                <h1 className="text-[60px] md:text-[80px] lg:text-[120px] leading-[0.8] font-black tracking-tighter italic uppercase select-none" style={{ color: settings.themeColor }}>
                  VOXEL <span className="text-white">AIM</span>
                </h1>
                <p className="mt-2 lg:mt-4 text-zinc-500 font-mono tracking-widest text-[10px] lg:text-sm uppercase">Performance Aiming Environment v2.0</p>
              </div>
              <div className="flex flex-col items-end gap-2 w-full lg:w-auto">
                <div className="text-black px-4 py-1 font-bold text-[10px] lg:text-xs uppercase w-full lg:w-auto text-center lg:text-left" style={{ backgroundColor: settings.themeColor }}>System: Active</div>
                <div className="border-2 border-zinc-800 px-4 py-1 text-zinc-400 font-mono text-[10px] lg:text-xs uppercase w-full lg:w-auto text-center lg:text-left">Sync: Valorant / CS2</div>
              </div>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-8 flex-1 min-h-0 overflow-hidden">
              <div className="col-span-full md:col-span-4 flex flex-col gap-2 lg:gap-4 h-full min-h-0">
                <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar pr-1 flex-1">
                  <GameModeCard 
                    title="Gridshot" 
                    highScore="112k"
                    isActive={settings.mode === GameMode.GRIDSHOT}
                    themeColor={settings.themeColor}
                    onClick={() => handleModeChange(GameMode.GRIDSHOT)} 
                  />
                  <GameModeCard 
                    title="Sixshot" 
                    highScore="94k"
                    isActive={settings.mode === GameMode.SIXSHOT}
                    themeColor={settings.themeColor}
                    onClick={() => handleModeChange(GameMode.SIXSHOT)} 
                  />
                  <GameModeCard 
                    title="Pop Bots" 
                    highScore="NEW"
                    isActive={settings.mode === GameMode.POP_BOTS}
                    themeColor={settings.themeColor}
                    onClick={() => setSettings({ ...settings, mode: GameMode.POP_BOTS })} 
                  />
                  <GameModeCard 
                    title="Map Tactics" 
                    highScore="NEW"
                    isActive={settings.mode === GameMode.MAP}
                    themeColor={settings.themeColor}
                    onClick={() => setSettings({ ...settings, mode: GameMode.MAP })} 
                  />
                  <GameModeCard 
                    title="Reaction" 
                    highScore="165ms"
                    isActive={settings.mode === GameMode.REACTION}
                    themeColor={settings.themeColor}
                    onClick={() => setSettings({ ...settings, mode: GameMode.REACTION })} 
                  />
                </div>
                
                <div className="flex flex-col gap-2 mt-auto">
                  <button
                    onClick={() => startGame(settings.mode)}
                    className="w-full group relative bg-white text-black p-4 lg:p-6 flex flex-col items-start transition-all hover:translate-x-2"
                  >
                    <span className="text-4xl lg:text-6xl font-black italic uppercase leading-none">PLAY</span>
                    <span className="text-[10px] lg:text-xs font-bold uppercase mt-1 lg:mt-2 opacity-60">Start Training Session</span>
                    <div className="absolute right-4 bottom-4 w-8 h-8 lg:w-12 lg:h-12 shadow-[4px_4px_0px_0px_#000]" style={{ backgroundColor: settings.themeColor }}></div>
                  </button>

                  <button
                    onClick={() => {
                      playSound('click');
                      const confirmDownload = window.confirm("Neural Aim Desktop Client: Download standalone executable for Windows?");
                      if (confirmDownload) {
                        // Create a dummy executable blob
                        // In a real production app, this would be a link to a pre-built binary
                        const content = "This is a placeholder for the Neural Aim Desktop Client (v2.0-L). To build a real native executable, please use tools like Electron or Tauri with the current codebase.";
                        const blob = new Blob([content], { type: 'application/octet-stream' });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = 'NeuralAim_Client_v2.exe';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      }
                    }}
                    className="w-full border-2 border-zinc-800 p-3 flex items-center justify-between transition-all hover:bg-zinc-900 group"
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-black italic uppercase text-zinc-400 group-hover:text-white transition-colors">Desktop Version</span>
                      <span className="text-[8px] font-mono text-zinc-600 uppercase">Neural Client v2.0-L</span>
                    </div>
                    <div className="w-6 h-6 border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-white group-hover:border-white">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </div>
                  </button>
                </div>
              </div>

              <div className="col-span-full md:col-span-8 bg-zinc-900 p-4 lg:p-8 border-4 border-zinc-800 relative flex flex-col min-h-0 overflow-hidden">
                <div className="absolute -top-4 left-6 text-black px-4 py-1 font-black uppercase text-[10px] lg:text-sm italic z-10" style={{ backgroundColor: settings.themeColor }}>Configurator</div>
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  <Settings settings={settings} onUpdate={setSettings} gameInProgress={false} />
                </div>
              </div>
            </main>
          </motion.div>
        )}

        {view === GameView.PLAYING && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-0"
          >
            <Game 
              settings={settings} 
              onEnd={endGame}
              onUpdateStats={setCurrentStats}
              isPaused={isPaused}
              onUpdateSettings={setSettings}
            />
            <HUD 
              settings={settings.hud} 
              crosshair={settings.crosshair}
              stats={currentStats}
              mode={settings.mode}
              botsHitBack={settings.map.botsHitBack}
            />
            
            <AnimatePresence>
              {isPaused && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
                >
                   <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-[16px] border-zinc-900 p-8 relative shadow-2xl">
                    <div className="absolute -top-4 left-6 text-black px-4 py-1 font-black uppercase text-sm italic" style={{ backgroundColor: settings.themeColor }}>Paused Settings</div>
                    <Settings settings={settings} onUpdate={setSettings} gameInProgress={true} />
                    <div className="mt-8 flex gap-4">
                      <button 
                        onClick={() => setIsPaused(false)}
                        className="flex-grow py-4 bg-white text-black font-black uppercase italic hover:bg-lime-400 transition-all hover:translate-x-1"
                        style={{ backgroundColor: settings.themeColor }}
                      >
                        Resume Neural Sync
                      </button>
                      <button 
                        onClick={() => setView(GameView.MENU)}
                        className="px-8 py-4 bg-zinc-800 text-white font-black uppercase italic hover:bg-zinc-700 transition-all"
                      >
                        Exit Hub
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {view === GameView.RESULTS && lastStats && (
          <Results 
            stats={lastStats} 
            onRetry={() => startGame(settings.mode)} 
            onMenu={() => setView(GameView.MENU)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function GameModeCard({ title, highScore, isActive, themeColor, onClick }: { title: string; highScore: string; isActive: boolean; themeColor: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 border-l-4 transition-all flex justify-between items-center ${
        isActive 
          ? 'bg-zinc-800' 
          : 'bg-zinc-900 border-zinc-700 opacity-70 hover:opacity-100'
      }`}
      style={{ borderLeftColor: isActive ? themeColor : undefined }}
    >
      <span className="font-black uppercase italic text-white tracking-widest">{title}</span>
      <span className="font-mono text-xs" style={{ color: isActive ? themeColor : '#71717a' }}>
        HIGH SCORE: {highScore}
      </span>
    </button>
  );
}
