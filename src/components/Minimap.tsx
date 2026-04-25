import React from 'react';
import { TargetData } from '../types';
import { MAP_ELEMENTS } from './Game';

interface MinimapProps {
  playerPos: { x: number; z: number };
  playerYaw: number;
  targets: TargetData[];
  hudColor: string;
}

export default function Minimap({ playerPos, playerYaw, targets, hudColor }: MinimapProps) {
  const size = 150;
  const mapRange = 120; // -60 to 60
  const scale = size / mapRange;
  const center = size / 2;

  const toMapX = (x: number) => center + x * scale;
  const toMapZ = (z: number) => center + z * scale;

  return (
    <div className="relative overflow-hidden bg-black/60 border border-zinc-800 backdrop-blur-md" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Map Walls */}
        {MAP_ELEMENTS.map((el, i) => (
          <rect
            key={i}
            x={toMapX(el.pos[0] - el.size[0] / 2)}
            y={toMapZ(el.pos[2] - el.size[2] / 2)}
            width={el.size[0] * scale}
            height={el.size[2] * scale}
            fill="#2c3e50"
            fillOpacity={0.5}
          />
        ))}

        {/* Enemies */}
        {targets.map((target) => (
          <circle
            key={target.id}
            cx={toMapX(target.position[0])}
            cy={toMapZ(target.position[2])}
            r={3}
            fill="#ef4444"
            style={{ filter: 'drop-shadow(0 0 2px #ef4444)' }}
          />
        ))}

        {/* Player */}
        <g transform={`translate(${toMapX(playerPos.x)}, ${toMapZ(playerPos.z)}) rotate(${(-playerYaw * 180) / Math.PI})`}>
          {/* View cone */}
          <path
            d="M 0 0 L -15 -30 L 15 -30 Z"
            fill={hudColor}
            fillOpacity={0.2}
          />
          {/* Player marker */}
          <circle r={4} fill={hudColor} />
          {/* Direction indicator */}
          <line x1="0" y1="0" x2="0" y2="-8" stroke={hudColor} strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}
