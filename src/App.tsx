/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameView, GameSettings, GameMode, GameStats } from './types';
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

  const startGame = useCallback((mode: GameMode) => {
    setSettings(prev => ({ ...prev, mode }));
    setCurrentStats({
      score: 0,
      hits: 0,
      misses: 0,
      accuracy: 100,
      timeRemaining: 60,
    });
    setIsPaused(false);
    setView(GameView.PLAYING);
  }, []);

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

  return (
    <div className="relative w-screen h-screen bg-zinc-950 overflow-hidden font-sans select-none text-white">
      <AnimatePresence mode="wait">
        {view === GameView.MENU && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col p-8 border-[16px] border-zinc-900 bg-zinc-950 shadow-inner"
          >
            <header className="flex justify-between items-end mb-12">
              <div>
                <h1 className="text-[120px] leading-[0.8] font-black tracking-tighter italic uppercase select-none" style={{ color: settings.themeColor }}>
                  VOXEL <span className="text-white">AIM</span>
                </h1>
                <p className="mt-4 text-zinc-500 font-mono tracking-widest text-sm uppercase">Performance Aiming Environment v2.0</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-black px-4 py-1 font-bold text-xs uppercase" style={{ backgroundColor: settings.themeColor }}>System: Active</div>
                <div className="border-2 border-zinc-800 px-4 py-1 text-zinc-400 font-mono text-xs uppercase">Sync: Valorant / CS2</div>
              </div>
            </header>

            <main className="grid grid-cols-12 gap-8 flex-grow overflow-hidden">
              <div className="col-span-4 flex flex-col gap-4 h-full">
                <div className="flex flex-col gap-2">
                  <GameModeCard 
                    title="Gridshot" 
                    highScore="112k"
                    isActive={settings.mode === GameMode.GRIDSHOT}
                    themeColor={settings.themeColor}
                    onClick={() => setSettings({ ...settings, mode: GameMode.GRIDSHOT })} 
                  />
                  <GameModeCard 
                    title="Sixshot" 
                    highScore="94k"
                    isActive={settings.mode === GameMode.SIXSHOT}
                    themeColor={settings.themeColor}
                    onClick={() => setSettings({ ...settings, mode: GameMode.SIXSHOT })} 
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
                
                <button
                  onClick={() => startGame(settings.mode)}
                  className="w-full group relative bg-white text-black p-6 flex flex-col items-start transition-all hover:translate-x-2 mt-auto"
                >
                  <span className="text-6xl font-black italic uppercase leading-none">PLAY</span>
                  <span className="text-xs font-bold uppercase mt-2 opacity-60">Start Training Session</span>
                  <div className="absolute right-4 bottom-4 w-12 h-12 shadow-[4px_4px_0px_0px_#000]" style={{ backgroundColor: settings.themeColor }}></div>
                </button>
              </div>

              <div className="col-span-8 bg-zinc-900 p-8 border-4 border-zinc-800 relative overflow-y-auto">
                <div className="absolute -top-4 left-6 text-black px-4 py-1 font-black uppercase text-sm italic" style={{ backgroundColor: settings.themeColor }}>Configurator</div>
                <Settings settings={settings} onUpdate={setSettings} />
              </div>
            </main>

            <footer className="mt-auto flex justify-between items-center py-4 border-t-2 border-zinc-900">
              <div className="flex gap-6 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                <span>Leaderboards</span>
                <span>Workshop</span>
                <span>Academy</span>
              </div>
              <div className="text-zinc-400 font-mono text-xs uppercase">
                [ ESC ] BACK TO MENU — [ F1 ] INSTANT RESTART
              </div>
            </footer>
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
                    <Settings settings={settings} onUpdate={setSettings} />
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
