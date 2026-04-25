import { GameSettings } from '../types';
import { CrosshairRenderer } from './HUD';
import { playSound } from '../lib/audio';

interface SettingsProps {
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
}

export default function Settings({ settings, onUpdate }: SettingsProps) {
  const updateCrosshairColor = (color: string) => {
    playSound('click');
    onUpdate({ 
      ...settings, 
      crosshair: { ...settings.crosshair, color },
      hud: { ...settings.hud, color },
      themeColor: color
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 italic">Crosshair Customization</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-black flex items-center justify-center border-2 border-zinc-700 shrink-0">
               <CrosshairRenderer settings={settings.crosshair} />
            </div>
            <div className="flex-grow space-y-2">
              <div className="flex justify-between text-[10px] font-mono text-zinc-400 uppercase">
                <span>Size</span>
                <span>{settings.crosshair.size}</span>
              </div>
              <input 
                type="range"
                min="1"
                max="50"
                value={settings.crosshair.size}
                onChange={(e) => onUpdate({ ...settings, crosshair: { ...settings.crosshair, size: parseInt(e.target.value) } })}
                className="w-full h-2 bg-black appearance-none accent-lime-400 cursor-pointer"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['cross', 'dot', 'circle', 't-shape'] as const).map(style => (
              <button 
                key={style}
                onClick={() => onUpdate({ ...settings, crosshair: { ...settings.crosshair, style } })}
                className={`py-2 text-[10px] font-bold uppercase transition-all ${
                  settings.crosshair.style === style ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-lime-400 hover:text-black'
                }`}
              >
                {style.replace('-shape', '')}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 italic">Engine Settings</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[10px] font-mono text-zinc-400 uppercase mb-1">
                <span>Sensitivity</span>
                <span className="text-white">{settings.sensitivity.toFixed(3)}</span>
              </div>
              <div className="flex h-8 bg-black border border-zinc-800">
                <input 
                  type="range"
                  min="0.01"
                  max="2.0"
                  step="0.001"
                  value={settings.sensitivity}
                  onChange={(e) => onUpdate({ ...settings, sensitivity: parseFloat(e.target.value) })}
                  className="flex-grow bg-transparent appearance-none accent-lime-400 cursor-pointer px-2"
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-[10px] font-mono text-zinc-400 uppercase mb-1">
                <span>ADS Sensitivity (AWP)</span>
                <span className="text-white">{settings.adsSensitivity.toFixed(3)}</span>
              </div>
              <div className="flex h-8 bg-black border border-zinc-800">
                <input 
                  type="range"
                  min="0.01"
                  max="2.0"
                  step="0.001"
                  value={settings.adsSensitivity}
                  onChange={(e) => onUpdate({ ...settings, adsSensitivity: parseFloat(e.target.value) })}
                  className="flex-grow bg-transparent appearance-none accent-lime-400 cursor-pointer px-2"
                />
              </div>
              {settings.popBots.weapon === 'AWP' && (
                <p className="text-[9px] text-lime-400 mt-1 font-bold animate-pulse">TIP: TUNE YOUR ADS SENSITIVITY FOR LONG RANGE</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-6 flex flex-col">
        <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 italic">Theme & Colors</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {['#a3e635', '#22d3ee', '#f43f5e', '#fbbf24', '#ffffff'].map(color => (
              <button 
                key={color}
                onClick={() => updateCrosshairColor(color)}
                className={`w-8 h-8 cursor-pointer transition-all ${
                  settings.crosshair.color === color ? 'border-4 border-white' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          {settings.mode !== 'MAP' && (
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'dark', 'retro'] as const).map(theme => (
                <button 
                  key={theme}
                  onClick={() => {
                    playSound('click');
                    onUpdate({ ...settings, theme });
                  }}
                  className={`py-2 text-[10px] font-bold uppercase transition-all ${
                    settings.theme === theme ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-lime-400 hover:text-black'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 italic">HUD Visuals</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-mono text-zinc-400 uppercase">
              <span>UI Scale</span>
              <span>{settings.hud.scale.toFixed(2)}x</span>
            </div>
            <input 
              type="range"
              min="0.5"
              max="1.5"
              step="0.01"
              value={settings.hud.scale}
              onChange={(e) => onUpdate({ ...settings, hud: { ...settings.hud, scale: parseFloat(e.target.value) } })}
              className="w-full h-2 bg-black appearance-none accent-white cursor-pointer"
            />
          </div>
        </section>

        <div className="mt-auto p-4 border" style={{ backgroundColor: `${settings.themeColor}10`, borderColor: `${settings.themeColor}30` }}>
          <p className="text-[10px] font-mono leading-relaxed" style={{ color: settings.themeColor }}>
            ENVIRONMENT: {settings.theme.toUpperCase()}<br />
            FOV: {settings.fov} (VALORANT/CS2)<br />
            INPUT: RAW INPUT BUFFER ON
          </p>
        </div>
      </div>

      {settings.mode === 'POP_BOTS' && (
        <div className="col-span-full border-t border-zinc-800 pt-6 mt-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <section>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 italic">Weapon Select</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['PISTOL', 'AK47', 'AWP'] as const).map(w => (
                <button 
                  key={w}
                  onClick={() => onUpdate({ ...settings, popBots: { ...settings.popBots, weapon: w } })}
                  className={`py-2 text-[10px] font-bold uppercase transition-all ${
                    settings.popBots.weapon === w ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-lime-400 hover:text-black'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 italic">Difficulty</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['EASY', 'MEDIUM', 'HARD'] as const).map(d => (
                <button 
                  key={d}
                  onClick={() => onUpdate({ ...settings, popBots: { ...settings.popBots, difficulty: d } })}
                  className={`py-2 text-[10px] font-bold uppercase transition-all ${
                    settings.popBots.difficulty === d ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-lime-400 hover:text-black'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 italic">Bot Customization</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Bot Color</span>
                <div className="flex gap-2">
                  {['#a3e635', '#22d3ee', '#f43f5e', '#fbbf24', '#ffffff'].map(c => (
                    <button 
                      key={c}
                      onClick={() => onUpdate({ ...settings, popBots: { ...settings.popBots, botColor: c } })}
                      className={`w-6 h-6 transition-all ${settings.popBots.botColor === c ? 'border-2 border-white scale-110' : 'opacity-50 hover:opacity-100'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {settings.mode === 'REACTION' && (
        <div className="col-span-full border-t border-zinc-800 pt-6 mt-6">
          <section className="bg-zinc-900/50 p-6 border border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 italic">Reaction Test Protocol</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-3">
                <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                  &gt; STATUS: CALIBRATING<br />
                  &gt; OBJECTIVE: NEUTRALISE VOXEL TARGET UPON EMERGENCE<br />
                  &gt; METRIC: RESPONSE LATENCY (MS)
                </p>
                <div className="flex gap-2">
                   <div className="px-3 py-1 bg-zinc-800 text-[10px] text-zinc-500 font-bold uppercase">Center Spawn Only</div>
                   <div className="px-3 py-1 bg-zinc-800 text-[10px] text-zinc-500 font-bold uppercase">Random Interval</div>
                </div>
              </div>
              <div className="p-4 border border-dashed border-zinc-700 bg-black/40">
                <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                  Training Note: This mode measures raw neuro-mechanical response. Focus on the center. 
                  Wait for the snap-appearance. Scores are mapped to 1000 - latency.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {settings.mode === 'MAP' && (
        <div className="col-span-full border-t border-zinc-800 pt-6 mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 italic">Map Target Logic</h3>
            <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Bots Hit Back (Survival)</span>
              <button 
                onClick={() => onUpdate({ ...settings, map: { ...settings.map, botsHitBack: !settings.map.botsHitBack } })}
                className={`px-4 py-2 text-[10px] font-bold uppercase transition-all ${
                  settings.map.botsHitBack ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {settings.map.botsHitBack ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 italic">Weapon Select</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['PISTOL', 'AK47', 'AWP'] as const).map(w => (
                <button 
                  key={w}
                  onClick={() => onUpdate({ ...settings, popBots: { ...settings.popBots, weapon: w } })}
                  className={`py-2 text-[10px] font-bold uppercase transition-all ${
                    settings.popBots.weapon === w ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-lime-400 hover:text-black'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
