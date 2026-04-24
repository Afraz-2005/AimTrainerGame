import { motion } from 'motion/react';
import { GameStats } from '../types';
import { RotateCcw, Home, Target, Zap, MousePointer } from 'lucide-react';

interface ResultsProps {
  stats: GameStats;
  onRetry: () => void;
  onMenu: () => void;
}

export default function Results({ stats, onRetry, onMenu }: ResultsProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
    >
      <div className="w-full max-w-xl bg-zinc-950 border-[16px] border-zinc-900 p-10 shadow-2xl relative">
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-lime-400 text-black px-6 py-2 font-black uppercase text-xl italic skew-x-[-12deg]">
          Results Found
        </div>

        <h2 className="text-7xl font-black text-white mb-2 text-center tracking-tighter uppercase italic leading-[0.8] mb-12 mt-4">
          Training<br /><span className="text-lime-400">Complete</span>
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-10">
          <StatBox icon={<Target className="w-4 h-4" />} label="Accuracy" value={`${stats.accuracy.toFixed(1)}%`} sub="Precision index" />
          <StatBox icon={<Zap className="w-4 h-4" />} label="Score" value={stats.score.toLocaleString()} sub="Global rating" />
          <StatBox icon={<MousePointer className="w-4 h-4" />} label="Hits" value={stats.hits.toString()} sub="Targets destroyed" />
          <StatBox icon={<RotateCcw className="w-4 h-4" />} label="Misses" value={stats.misses.toString()} sub="Total errors" />
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onRetry}
            className="w-full py-4 bg-white hover:bg-lime-400 text-black font-black italic uppercase text-2xl transition-all flex items-center justify-center gap-2 hover:translate-x-2"
          >
            <RotateCcw className="w-6 h-6" /> Restart Neural Sync
          </button>
          <button
            onClick={onMenu}
            className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold uppercase transition-all flex items-center justify-center gap-2 text-xs tracking-widest"
          >
            <Home className="w-4 h-4" /> Return to Command Hub
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function StatBox({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="bg-zinc-900 p-6 border-l-4 border-lime-400 shadow-lg">
      <div className="flex items-center gap-2 text-zinc-500 mb-2">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-4xl font-black text-white italic tracking-tighter leading-none mb-1 font-sans">{value}</div>
      <div className="text-[9px] text-zinc-600 uppercase font-mono tracking-tight">{sub}</div>
    </div>
  );
}
