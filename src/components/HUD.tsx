import { CrosshairSettings, HUDSettings, GameStats, GameMode } from '../types';
import Minimap from './Minimap';

interface HUDProps {
  settings: HUDSettings;
  crosshair: CrosshairSettings;
  stats: GameStats | null;
  mode?: GameMode;
  botsHitBack?: boolean;
}

export default function HUD({ settings, crosshair, stats, mode, botsHitBack }: HUDProps) {
  const scale = settings.scale || 1;
  const hudColor = settings.color || '#a3e635';

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      {/* Minimap: Top Right */}
      {(mode === GameMode.MAP) && stats?.playerPos && (
        <div 
          className="absolute top-8 right-8"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top right' }}
        >
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{mode === GameMode.MAP ? 'Sector: B-Site' : 'Sector: Tactical-2v2'}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
            </div>
            <Minimap 
              playerPos={stats.playerPos} 
              playerYaw={stats.playerYaw || 0}
              targets={stats.activeTargets || []}
              hudColor={hudColor}
            />
          </div>
        </div>
      )}
      {/* Target Logic & Crosshair */}
      {mode !== GameMode.REACTION && (
        <div className="absolute inset-0 flex items-center justify-center">
          <CrosshairRenderer settings={crosshair} />
        </div>
      )}

      {/* Top Left: FPS & Server Info */}
      <div 
        className="absolute top-8 left-8 space-y-2"
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        <div className="flex items-center gap-2">
          <div className="text-black px-2 py-0.5 font-black text-[10px] uppercase" style={{ backgroundColor: hudColor }}>System: Active</div>
          <span className="text-white font-mono text-xs font-bold tracking-tighter italic">VOXELCORE.OS_v2.0</span>
        </div>
        {settings.showFPS && (
          <div className="text-zinc-500 font-mono text-[10px] bg-zinc-900 px-2 py-1 border border-zinc-800">
            FPS: <span className="text-white">144</span> | {stats?.lastReactionTime ? (
              <>LATENCY: <span className="text-lime-400">{stats.lastReactionTime}ms</span></>
            ) : (
              <>LATENCY: <span className="text-white">0ms</span></>
            )}
          </div>
        )}
      </div>

      {/* Top Center: Timer/Score */}
      {stats && (
        <div 
          className="absolute top-8 left-1/2 -translate-x-1/2 text-center"
          style={{ transform: `translateX(-50%) scale(${scale * 1.2})`, transformOrigin: 'top center' }}
        >
          <div className="text-6xl font-black text-white italic tracking-tighter mb-1 select-none leading-none">
            {Math.ceil(stats.timeRemaining)}<span className="text-xs font-bold uppercase not-italic text-zinc-500 ml-1">sec</span>
          </div>
          <div className="font-mono text-[9px] tracking-[0.4em] uppercase font-bold" style={{ color: hudColor }}>Active Session</div>
        </div>
      )}

      {/* Bottom Left: Accuracy */}
      {stats && (
        <div 
          className="absolute bottom-8 left-8"
          style={{ transform: `scale(${scale})`, transformOrigin: 'bottom left' }}
        >
          <div className="text-5xl font-black text-white italic tracking-tighter leading-none mb-2">
            {stats.accuracy.toFixed(1)}<span className="text-xl opacity-40">%</span>
          </div>
          <div className="bg-zinc-800 text-zinc-400 px-3 py-1 font-mono text-[10px] uppercase tracking-widest inline-block border border-zinc-700">
            Precision Index
          </div>
        </div>
      )}

      {/* Bottom Center: Health & Ammo */}
      {stats && stats.health !== undefined && (
        <div 
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'bottom center' }}
        >
          {stats.ammo !== undefined && (mode === GameMode.MAP) && (
             <div className="flex flex-col items-center justify-center">
                {stats.isReloading ? (
                   <div className="w-12 h-12 relative flex items-center justify-center">
                     <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                       <circle cx="18" cy="18" r="16" fill="none" className="stroke-zinc-800" strokeWidth="3"></circle>
                       <circle cx="18" cy="18" r="16" fill="none" className="stroke-white" strokeWidth="3" 
                         strokeDasharray="100 100" strokeDashoffset="100" style={{ animation: "reload-spin 2s linear forwards" }}></circle>
                     </svg>
                     <style>{`
                       @keyframes reload-spin {
                         0% { stroke-dashoffset: 100; }
                         100% { stroke-dashoffset: 0; }
                       }
                     `}</style>
                   </div>
                ) : (
                  <div className="text-3xl font-black italic text-white flex items-baseline">
                     {stats.ammo === Infinity ? '∞' : stats.ammo}<span className="text-sm opacity-50 ml-1">/ {stats.maxAmmo === Infinity ? '∞' : stats.maxAmmo}</span>
                  </div>
                )}
                {stats.ammo === 0 && !stats.isReloading && <div className="text-[10px] text-red-500 font-bold uppercase animate-pulse mt-1">RELOAD (R)</div>}
             </div>
          )}
          {botsHitBack && (
            <div className="w-64 h-2 bg-zinc-900 border border-zinc-800 relative mt-1">
              <div 
                className="h-full transition-all duration-300"
                style={{ 
                  width: `${Math.max(0, stats.health)}%`, 
                  backgroundColor: stats.health < 30 ? '#ef4444' : hudColor,
                  boxShadow: `0 0 10px ${stats.health < 30 ? '#ef4444' : hudColor}40`
                }} 
              />
              <div className="absolute top-full mt-1 w-full flex justify-between text-[8px] font-black uppercase italic text-zinc-500">
                <span>Critical Integrity</span>
                <span>{Math.ceil(stats.health)}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Right: Hits/Score */}
      {stats && (
        <div 
          className="absolute bottom-8 right-8 text-right"
          style={{ transform: `scale(${scale})`, transformOrigin: 'bottom right' }}
        >
          <div className="text-5xl font-black italic tracking-tighter leading-none mb-2" style={{ color: hudColor }}>
            {stats.score.toLocaleString()}
          </div>
          <div className="bg-zinc-800 text-zinc-400 px-3 py-1 font-mono text-[10px] uppercase tracking-widest inline-block border border-zinc-700">
            Units Harvested
          </div>
        </div>
      )}

      {/* Interaction Prompts */}
      <div className="absolute top-[70%] left-1/2 -translate-x-1/2 opacity-20 text-[9px] text-white uppercase tracking-[0.5em] font-bold italic">
        Neural Buffer Initialized
      </div>
    </div>
  );
}

export function CrosshairRenderer({ settings }: { settings: CrosshairSettings }) {
  const { style, size, thickness, gap, color, opacity } = settings;
  const halfGap = gap / 2;

  const styleMap = {
    cross: (
      <svg width={size * 2 + gap} height={size * 2 + gap} viewBox={`0 0 ${size * 2 + gap} ${size * 2 + gap}`}>
        {/* Top */}
        <rect x={size + halfGap - thickness / 2} y="0" width={thickness} height={size} fill={color} fillOpacity={opacity} />
        {/* Bottom */}
        <rect x={size + halfGap - thickness / 2} y={size + gap} width={thickness} height={size} fill={color} fillOpacity={opacity} />
        {/* Left */}
        <rect x="0" y={size + halfGap - thickness / 2} width={size} height={thickness} fill={color} fillOpacity={opacity} />
        {/* Right */}
        <rect x={size + gap} y={size + halfGap - thickness / 2} width={size} height={thickness} fill={color} fillOpacity={opacity} />
      </svg>
    ),
    dot: (
      <svg width={thickness} height={thickness} viewBox={`0 0 ${thickness} ${thickness}`}>
        <rect x="0" y="0" width={thickness} height={thickness} fill={color} fillOpacity={opacity} />
      </svg>
    ),
    circle: (
      <svg width={size * 2} height={size * 2} viewBox={`0 0 ${size * 2} ${size * 2}`}>
        <circle cx={size} cy={size} r={size - thickness / 2} stroke={color} strokeWidth={thickness} fill="none" strokeOpacity={opacity} />
      </svg>
    ),
    't-shape': (
      <svg width={size * 2 + gap} height={size * 2 + gap} viewBox={`0 0 ${size * 2 + gap} ${size * 2 + gap}`}>
         {/* Bottom */}
         <rect x={size + halfGap - thickness / 2} y={size + gap} width={thickness} height={size} fill={color} fillOpacity={opacity} />
        {/* Left */}
        <rect x="0" y={size + halfGap - thickness / 2} width={size} height={thickness} fill={color} fillOpacity={opacity} />
        {/* Right */}
        <rect x={size + gap} y={size + halfGap - thickness / 2} width={size} height={thickness} fill={color} fillOpacity={opacity} />
      </svg>
    )
  };

  return (
    <div className="relative">
      {styleMap[style]}
    </div>
  );
}
