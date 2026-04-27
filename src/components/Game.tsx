import { useEffect, useState, useRef, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  PointerLockControls,
  Sky,
  Stars,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import confetti from "canvas-confetti";

const createGrassTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#3B5E2B';
    ctx.fillRect(0, 0, 256, 256);
    for(let i=0; i<5000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#365324' : '#456a33';
        ctx.fillRect(Math.random()*256, Math.random()*256, 2, 4);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(50, 50);
  return tex;
}

const createWoodTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#7d5c3d';
    ctx.fillRect(0, 0, 64, 64);
    // Plank lines
    ctx.fillStyle = '#5c402d';
    for(let i=0; i<4; i++) {
      ctx.fillRect(i * 16, 0, 1, 64);
    }
    // Grain
    for(let i=0; i<200; i++) {
      ctx.fillStyle = 'rgba(70, 40, 20, 0.3)';
      ctx.fillRect(Math.random()*64, Math.random()*64, 1, Math.random()*10);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

const createCobbleTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#777777';
    ctx.fillRect(0, 0, 64, 64);
    for(let y=0; y<4; y++) {
      for(let x=0; x<4; x++) {
        ctx.fillStyle = (x+y) % 2 === 0 ? '#666666' : '#888888';
        ctx.fillRect(x*16+1, y*16+1, 14, 14);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x*16, y*16, 16, 1);
        ctx.fillRect(x*16, y*16, 1, 16);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

const grassTexture = createGrassTexture();
const woodTexture = createWoodTexture();
const cobbleTexture = createCobbleTexture();

import { motion } from "motion/react";
import { GameSettings, GameStats, GameMode, TargetData } from "../types";
import { playSound } from "../lib/audio";

// Map Elements defining visuals and collisions
const rawMapElements: { pos: number[]; size: number[]; color: string; isWater?: boolean; isJumpPad?: boolean; isGrass?: boolean; isWood?: boolean; isCobblestone?: boolean }[] = [
  // Outer Bounds (300x300 now)
  { pos: [0, 20, -150], size: [300, 40, 2], color: "#3a4a5a" },
  { pos: [0, 20, 150], size: [300, 40, 2], color: "#3a4a5a" },
  { pos: [-150, 20, 0], size: [2, 40, 300], color: "#3a4a5a" },
  { pos: [150, 20, 0], size: [2, 40, 300], color: "#3a4a5a" },

  // Ground base
  { pos: [0, -1, 0], size: [300, 2, 300], color: "#3B2F2F" }, // soil base
  { pos: [0, 0, 0], size: [300, 0.2, 300], color: "#556B2F", isGrass: true }, // grass top

  // River / Pond (sunken into ground)
  { pos: [0, 0.5, -25], size: [40, 1, 50], color: "#2d4a22" }, // Bottom
  { pos: [0, 1.5, -25], size: [40, 1, 50], color: "#1ca3ec", isWater: true }, // Water

  // Bridge over pond
  { pos: [0, 2.5, -30], size: [8, 0.5, 20], color: "#8b5a2b" },

  // Bunker 1
  { pos: [-80, 5.5, -20], size: [16, 1, 16], color: "#555", isCobblestone: true }, // roof
  { pos: [-87.5, 2.5, -20], size: [1, 5, 16], color: "#444" },
  { pos: [-72.5, 2.5, -20], size: [1, 5, 16], color: "#444" },
  { pos: [-80, 2.5, -27.5], size: [16, 5, 1], color: "#444" },
  { pos: [-85, 2.5, -12.5], size: [6, 5, 1], color: "#444" },
  { pos: [-75, 2.5, -12.5], size: [6, 5, 1], color: "#444" },
  { pos: [-80, 4.5, -12.5], size: [4, 1, 1], color: "#444" }, // above door

  // Bunker 2
  { pos: [50, 5.5, -50], size: [16, 1, 16], color: "#555", isCobblestone: true }, // roof
  { pos: [42.5, 2.5, -50], size: [1, 5, 16], color: "#444" },
  { pos: [57.5, 2.5, -50], size: [1, 5, 16], color: "#444" },
  { pos: [50, 2.5, -57.5], size: [16, 5, 1], color: "#444" },
  { pos: [45, 2.5, -42.5], size: [6, 5, 1], color: "#444" },
  { pos: [55, 2.5, -42.5], size: [6, 5, 1], color: "#444" },
  { pos: [50, 4.5, -42.5], size: [4, 1, 1], color: "#444" }, // above door

  // Hollow House 1
  { pos: [100, 7, -20], size: [14, 2, 14], color: "#8b0000" }, // roof
  { pos: [100, 3, -25.5], size: [12, 6, 1], color: "#e3c565", isWood: true },
  { pos: [94.5, 3, -20], size: [1, 6, 10], color: "#e3c565", isWood: true },
  { pos: [105.5, 3, -20], size: [1, 6, 10], color: "#e3c565", isWood: true },
  { pos: [96, 3, -14.5], size: [4, 6, 1], color: "#e3c565", isWood: true },
  { pos: [104, 3, -14.5], size: [4, 6, 1], color: "#e3c565", isWood: true },
  { pos: [100, 5, -14.5], size: [4, 2, 1], color: "#e3c565", isWood: true },

  // Hollow House 2 (Elevated)
  { pos: [-60, 4, -50], size: [40, 8, 40], color: "#4b5320" }, // Hill
  { pos: [-60, 15, -45], size: [14, 2, 14], color: "#8b0000" }, // roof
  { pos: [-60, 11, -50.5], size: [12, 6, 1], color: "#e3c565" },
  { pos: [-65.5, 11, -45], size: [1, 6, 10], color: "#e3c565" },
  { pos: [-54.5, 11, -45], size: [1, 6, 10], color: "#e3c565" },
  { pos: [-64, 11, -39.5], size: [4, 6, 1], color: "#e3c565" },
  { pos: [-56, 11, -39.5], size: [4, 6, 1], color: "#e3c565" },
  { pos: [-60, 13, -39.5], size: [4, 2, 1], color: "#e3c565" },

  // Highgrounds
  { pos: [80, 8, 80], size: [60, 16, 60], color: "#4b5320" }, // Mountain
  { pos: [-100, 6, 90], size: [50, 12, 50], color: "#4b5320" }, // Hill 2

  // Sniper Tower Good Spot
  { pos: [-100, 12, -100], size: [16, 16, 16], color: "#444" },
  { pos: [-100, 24, -100], size: [12, 8, 12], color: "#8a8d8f" },

  // Big Tree 1 with Treehouse
  { pos: [80, 15, -80], size: [4, 30, 4], color: "#3e2723" }, // trunk
  { pos: [80, 32, -80], size: [20, 10, 20], color: "#1b5e20" }, // leaves
  { pos: [80, 40, -80], size: [12, 8, 12], color: "#2e7d32" }, // leaves
  { pos: [88, 15, -80], size: [12, 1, 12], color: "#8d6e63" }, // platform
  { pos: [88, 20, -80], size: [12, 1, 12], color: "#5d4037" }, // roof
  { pos: [88, 17.5, -85.5], size: [12, 4, 1], color: "#795548" }, // wall
  { pos: [88, 0.5, -80], size: [4, 1, 4], color: "#00ff00", isJumpPad: true }, // bounce to treehouse

  // Big Tree 2 with Treehouse
  { pos: [-80, 15, -100], size: [4, 30, 4], color: "#3e2723" }, // trunk
  { pos: [-80, 32, -100], size: [20, 10, 20], color: "#1b5e20" }, // leaves
  { pos: [-72, 15, -100], size: [12, 1, 12], color: "#8d6e63" }, // platform
  { pos: [-72, 0.5, -100], size: [4, 1, 4], color: "#00ff00", isJumpPad: true }, // bounce

  // Cobblestone Pillars
  { pos: [30, 10, -80], size: [4, 20, 4], color: "#757575" },
  { pos: [40, 15, -80], size: [4, 30, 4], color: "#757575" },
  { pos: [35, 12.5, -70], size: [4, 25, 4], color: "#757575" },

  // Bomb sites
  { pos: [120, 0.25, 0], size: [30, 0.5, 30], color: "#b71c1c" }, // A site
  { pos: [120, 2, 0], size: [4, 4, 4], color: "#d32f2f" },
  { pos: [-20, 0.25, 120], size: [30, 0.5, 30], color: "#0d47a1" }, // B site
  { pos: [-20, 2, 120], size: [4, 4, 4], color: "#1976d2" },

  // Crates
  { pos: [-40, 1.5, 20], size: [3, 3, 3], color: "#8b5a2b" },
  { pos: [-44, 1.5, 22], size: [3, 3, 3], color: "#8b5a2b" },
  { pos: [-42, 4.5, 21], size: [3, 3, 3], color: "#8b5a2b" },

  // Fallen trees (Logs)
  { pos: [-60, 1.5, 50], size: [4, 4, 20], color: "#5c4033" },
  { pos: [40, 1.5, 80], size: [20, 4, 4], color: "#5c4033" },

  // Broken down cars
  { pos: [-20, 1.5, -80], size: [8, 3, 16], color: "#bd3333" }, // base
  { pos: [-20, 4.5, -80], size: [6, 3, 8], color: "#222" }, // cabin
];

// Pyramid Monument
for (let i = 0; i < 10; i++) {
  rawMapElements.push({ pos: [-100, 1 + i*2, 0], size: [20 - i*2, 2, 20 - i*2], color: "#e0e0e0" }); // white monument
}

// Bushes
for (let i = 0; i < 50; i++) {
  const bx = (Math.random() - 0.5) * 260;
  const bz = (Math.random() - 0.5) * 260;
  if (Math.abs(bx) > 10) { // keep away from zero
    rawMapElements.push({ pos: [bx, 1.5, bz], size: [3, 3, 3], color: "#2e7d32" });
  }
}

// Jump pads randomly around
for(let i=0; i<15; i++) {
  const jx = (Math.random() - 0.5)*200;
  const jz = (Math.random() - 0.5)*200;
  rawMapElements.push({ pos: [jx, 0.25, jz], size: [3, 0.5, 3], color: "#00e676", isJumpPad: true });
}

// Stairs up sniper tower (around the back)
for(let i = 0; i < 20; i++) {
  rawMapElements.push({ pos: [-100, 4 + i * 0.7, -90 + i * 1.5], size: [6, 1, 2], color: "#5c4033" }); // Ramp steps
}

// ---- Roads ----
// Main horizontal road
rawMapElements.push({ pos: [0, 0.4, 60], size: [200, 0.2, 12], color: "#555" });
rawMapElements.push({ pos: [0, 0.45, 60], size: [200, 0.1, 0.5], color: "#e0e0e0" }); // road line
// Main vertical road
rawMapElements.push({ pos: [40, 0.4, 0], size: [12, 0.2, 200], color: "#555" });
rawMapElements.push({ pos: [40, 0.45, 0], size: [0.5, 0.1, 200], color: "#e0e0e0" }); // road line
// Bridge Extension for Roads over water (if any)
rawMapElements.push({ pos: [40, 2.5, -25], size: [12, 0.6, 50], color: "#444" });

// ---- Pillager Outpost ----
const outpostX = 110;
const outpostZ = -40;
rawMapElements.push({ pos: [outpostX, 10, outpostZ], size: [16, 20, 16], color: "#3e2723" }); // Dark oak wood tower
rawMapElements.push({ pos: [outpostX, 18, outpostZ], size: [18, 2, 18], color: "#4e342e" }); // Floor
rawMapElements.push({ pos: [outpostX, 22, outpostZ], size: [18, 4, 18], color: "#5d4037" }); // Roof top
// Outpost legs
rawMapElements.push({ pos: [outpostX - 7, 5, outpostZ - 7], size: [2, 10, 2], color: "#5c4033" });
rawMapElements.push({ pos: [outpostX + 7, 5, outpostZ - 7], size: [2, 10, 2], color: "#5c4033" });
rawMapElements.push({ pos: [outpostX - 7, 5, outpostZ + 7], size: [2, 10, 2], color: "#5c4033" });
rawMapElements.push({ pos: [outpostX + 7, 5, outpostZ + 7], size: [2, 10, 2], color: "#5c4033" });
// Outpost stair ramp
for(let i = 0; i < 24; i++) {
  rawMapElements.push({ pos: [outpostX - 10 - i * 1.5, i * 0.8, outpostZ], size: [2, 1, 4], color: "#5c4033" });
}

// ---- Giant Steve Statue ----
const steveX = 0;
const steveZ = -120;
// Shoes/Feet
rawMapElements.push({ pos: [steveX - 4, 3, steveZ], size: [8, 6, 8], color: "#555555" }); 
rawMapElements.push({ pos: [steveX + 4, 3, steveZ], size: [8, 6, 8], color: "#555555" });
// Legs (Blue pants)
rawMapElements.push({ pos: [steveX - 4, 12, steveZ], size: [8, 12, 8], color: "#1a237e" }); 
rawMapElements.push({ pos: [steveX + 4, 12, steveZ], size: [8, 12, 8], color: "#1a237e" });
// Torso (Cyan shirt)
rawMapElements.push({ pos: [steveX, 28, steveZ], size: [16, 20, 8], color: "#00838f" });
// Arms
rawMapElements.push({ pos: [steveX - 14, 28, steveZ], size: [8, 20, 8], color: "#d7ccc8" });
rawMapElements.push({ pos: [steveX - 14, 36, steveZ], size: [8, 4, 8], color: "#00838f" }); // shoulder sleeves
rawMapElements.push({ pos: [steveX + 14, 36, steveZ], size: [8, 4, 8], color: "#00838f" }); // shoulder sleeves
// Arm pointing forward (Right Arm)
rawMapElements.push({ pos: [steveX + 14, 28, steveZ + 10], size: [8, 8, 28], color: "#d7ccc8" });
// Head (Skin tone)
rawMapElements.push({ pos: [steveX, 44, steveZ], size: [16, 16, 16], color: "#d7ccc8" });
// Hair
rawMapElements.push({ pos: [steveX, 52, steveZ], size: [16.5, 4, 16.5], color: "#3e2723" });
// Eyes
rawMapElements.push({ pos: [steveX - 4, 46, steveZ + 8.1], size: [4, 2, 0.2], color: "#ffffff" });
rawMapElements.push({ pos: [steveX - 3, 46, steveZ + 8.2], size: [2, 2, 0.2], color: "#3f51b5" }); // pupil
rawMapElements.push({ pos: [steveX + 4, 46, steveZ + 8.1], size: [4, 2, 0.2], color: "#ffffff" });
rawMapElements.push({ pos: [steveX + 5, 46, steveZ + 8.2], size: [2, 2, 0.2], color: "#3f51b5" }); // pupil

export const MAP_ELEMENTS = rawMapElements;

export const MAP_TREES = [
  { pos: [45, 0.5, -20] },
  { pos: [-45, 0.5, -5] },
  { pos: [20, 0.5, 45] },
  { pos: [-20, 0.5, 40] },
  { pos: [0, 0.5, -45] },
  { pos: [-120, 0.5, -120] },
  { pos: [-120, 0.5, 120] },
  { pos: [120, 0.5, 120] },
  { pos: [60, 0.5, 100] },
  { pos: [-80, 0.5, 80] },
];

export const SMALL_MAP_ELEMENTS: { pos: number[]; size: number[]; color: string; isWater?: boolean; isJumpPad?: boolean; isGrass?: boolean; isWood?: boolean; isCobblestone?: boolean }[] = [
  // Bounds (100x100 area)
  { pos: [0, 20, -50], size: [100, 40, 2], color: "#2c3e50" },
  { pos: [0, 20, 50], size: [100, 40, 2], color: "#2c3e50" },
  { pos: [-50, 20, 0], size: [2, 40, 100], color: "#2c3e50" },
  { pos: [50, 20, 0], size: [2, 40, 100], color: "#2c3e50" },
  
  // Ground
  { pos: [0, -1, 0], size: [100, 2, 100], color: "#3a2d24" },
  { pos: [0, 0, 0], size: [100, 0.2, 100], color: "#3B5E2B", isGrass: true }, 

  // Center structure
  { pos: [0, 4, 0], size: [20, 8, 20], color: "#bda891" },
  { pos: [0, 8, 0], size: [10, 8, 10], color: "#a6937e" },

  // Corridors / Inner walls (L-shapes and T-shapes)
  { pos: [-25, 4, 15], size: [30, 8, 4], color: "#bda891" },
  { pos: [-12, 4, 25], size: [4, 8, 20], color: "#bda891" },

  { pos: [25, 4, -15], size: [30, 8, 4], color: "#bda891" },
  { pos: [12, 4, -25], size: [4, 8, 20], color: "#bda891" },

  { pos: [15, 4, 25], size: [4, 8, 30], color: "#bda891" },
  { pos: [25, 4, 38], size: [20, 8, 4], color: "#bda891" },

  { pos: [-15, 4, -25], size: [4, 8, 30], color: "#bda891" },
  { pos: [-25, 4, -38], size: [20, 8, 4], color: "#bda891" },

  // Corners / Cover 
  { pos: [-35, 2, -35], size: [6, 4, 6], color: "#544637", isWood: true },
  { pos: [35, 2, 35], size: [6, 4, 6], color: "#544637", isWood: true },
  { pos: [-38, 2, 38], size: [4, 4, 10], color: "#544637", isWood: true },
  { pos: [38, 2, -38], size: [10, 4, 4], color: "#544637", isWood: true },

  // Random boxes/crates for more cover
  { pos: [-5, 1.5, -15], size: [3, 3, 3], color: "#75563c", isWood: true },
  { pos: [-5, 4.5, -15], size: [3, 3, 3], color: "#75563c", isWood: true },
  { pos: [15, 1.5, 5], size: [3, 3, 3], color: "#75563c", isWood: true },
  { pos: [5, 1.5, 30], size: [2, 3, 8], color: "#75563c", isWood: true },
  { pos: [-5, 1.5, 25], size: [4, 3, 4], color: "#75563c", isWood: true },
  { pos: [30, 2, 5], size: [4, 4, 4], color: "#75563c", isWood: true },
  { pos: [-30, 2, -5], size: [4, 4, 4], color: "#75563c", isWood: true },
  { pos: [-15, 1.5, 15], size: [5, 3, 2], color: "#75563c", isWood: true },
  
  // Ramps/elevation for verticality
  { pos: [-40, 1, 0], size: [8, 2, 20], color: "#a6937e" },
  { pos: [40, 1, 0], size: [8, 2, 20], color: "#a6937e" },

  // Central block cover
  { pos: [0, 9, 0], size: [4, 2, 4], color: "#75563c" },
];

export const SMALL_MAP_TREES = [
  { pos: [40, 0.5, 40] },
  { pos: [-40, 0.5, -40] },
  { pos: [40, 0.5, -40] },
  { pos: [-40, 0.5, 40] },
  { pos: [0, 0.5, 35] },
  { pos: [35, 0.5, 0] },
  { pos: [-35, 0.5, 0] },
  { pos: [0, 0.5, -35] },
];

const MAP_COLLISION_BOXES = [
  ...MAP_ELEMENTS.map((el) => {
    const box: any = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(el.pos[0], el.pos[1], el.pos[2]),
      new THREE.Vector3(el.size[0], el.size[1], el.size[2]),
    );
    box.isJumpPad = el.isJumpPad;
    return box;
  }),
  ...MAP_TREES.map((tree) => {
    return new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(tree.pos[0], tree.pos[1] + 5, tree.pos[2]),
      new THREE.Vector3(2, 10, 2), // tree trunk collision
    );
  })
];

const SMALL_MAP_COLLISION_BOXES = [
  ...SMALL_MAP_ELEMENTS.map((el) => {
    const box: any = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(el.pos[0], el.pos[1], el.pos[2]),
      new THREE.Vector3(el.size[0], el.size[1], el.size[2]),
    );
    box.isJumpPad = el.isJumpPad;
    return box;
  }),
  ...SMALL_MAP_TREES.map((tree) => {
    return new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(tree.pos[0], tree.pos[1] + 5, tree.pos[2]),
      new THREE.Vector3(2, 10, 2),
    );
  })
];

interface GameProps {
  settings: GameSettings;
  onEnd: (stats: GameStats) => void;
  onUpdateStats: (stats: GameStats) => void;
  isPaused: boolean;
  onUpdateSettings: (settings: GameSettings) => void;
}

function CameraSync({
  countdown,
  mode,
  botsHitBack,
}: {
  countdown: number | null;
  mode?: GameMode;
  botsHitBack?: boolean;
}) {
  const { camera } = useThree();
  const resetDone = useRef(false);

  useEffect(() => {
    if (countdown === 3 && !resetDone.current) {
      if (mode === GameMode.MAP) {
        if (botsHitBack) {
          camera.position.set(45, 6, 45); // Smaller map spawn
          camera.rotation.set(0, Math.PI * 1.25, 0); // Look at center
        } else {
          camera.position.set(-37.5, 6, 22); // Orig map spawn above tunnels
          camera.rotation.set(0, 0, 0); // Face towards the tunnel exit (negative Z)
        }
      } else {
        // Force looking straight ahead at the target zone
        camera.rotation.set(0, 0, 0);
        camera.position.set(0, 1.8, 0);
      }
      resetDone.current = true;
    } else if (countdown === null) {
      resetDone.current = false;
    }
  }, [countdown, camera, mode, botsHitBack]);

  return null;
}

export default function Game({
  settings,
  onEnd,
  onUpdateStats,
  isPaused,
  onUpdateSettings,
}: GameProps) {
  const [targets, setTargets] = useState<TargetData[]>([]);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [isScoped, setIsScoped] = useState(false);
  const [gameStatus, setGameStatus] = useState<'victory' | 'loss' | null>(null);
  const playerVel = useRef(new THREE.Vector3());
  const recoilIndex = useRef(0);
  const keys = useRef<{ [key: string]: boolean }>({});
  const lastCombatTimeRef = useRef<number>(0);

  const getInitialAmmo = () => {
    if (settings.mode !== GameMode.MAP || settings.map.infiniteAmmo) return Infinity;
    return settings.popBots.weapon === "AK47"
      ? 30
      : settings.popBots.weapon === "PISTOL"
        ? 12
        : settings.popBots.weapon === "AWP"
          ? 10
          : Infinity;
  };

  const statsRef = useRef<GameStats>({
    score: 0,
    hits: 0,
    misses: 0,
    accuracy: 100,
    timeRemaining: (settings.mode === GameMode.MAP && !settings.map.isStaticBots) ? 0 : 60,
    health: 100,
    ammo: getInitialAmmo(),
    maxAmmo: getInitialAmmo(),
  });

  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    const defaultAmmo = getInitialAmmo();
    statsRef.current.ammo = defaultAmmo;
    statsRef.current.maxAmmo = defaultAmmo;
    statsRef.current.isReloading = false;
    setIsReloading(false);
    onUpdateStats({ ...statsRef.current });
  }, [settings.popBots.weapon, settings.mode]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (
        e.code === "KeyR" &&
        !isReloading &&
        settings.popBots.weapon !== "KNIFE" &&
        settings.mode === GameMode.MAP &&
        statsRef.current.ammo !== statsRef.current.maxAmmo
      ) {
        setIsReloading(true);
        statsRef.current.isReloading = true;
        onUpdateStats({ ...statsRef.current });
        playSound("click"); // Play reload sound
        setTimeout(() => {
          const max =
            settings.popBots.weapon === "AK47"
              ? 30
              : settings.popBots.weapon === "PISTOL"
                ? 12
                : 10;
          statsRef.current.ammo = max;
          statsRef.current.isReloading = false;
          setIsReloading(false);
          onUpdateStats({ ...statsRef.current });
          playSound("click"); // Play reload finish sound
        }, 2000); // 2 second reload
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (countdown !== null || isPaused) return;
      if (e.button === 2 && settings.popBots.weapon === "AWP") {
        setIsScoped((prev) => !prev);
        playSound("click");
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (settings.mode !== GameMode.MAP || isPaused || countdown !== null)
        return;
      const weapons: ("PISTOL" | "AK47" | "AWP" | "KNIFE")[] = [
        "PISTOL",
        "AK47",
        "AWP",
        "KNIFE",
      ];
      const limitIndex =
        settings.popBots.weapon === "KNIFE"
          ? 3
          : weapons.indexOf(settings.popBots.weapon as any);
      let nextIndex = limitIndex;
      // e.deltaY > 0 is scroll down, e.deltaY < 0 is scroll up
      if (e.deltaY > 0) {
        nextIndex = (limitIndex + 1) % weapons.length;
      } else if (e.deltaY < 0) {
        nextIndex = (limitIndex - 1 + weapons.length) % weapons.length;
      }
      if (nextIndex !== limitIndex) {
        onUpdateSettings({
          ...settings,
          popBots: { ...settings.popBots, weapon: weapons[nextIndex] },
        });
        playSound("click"); // Or unholster sound
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("wheel", handleWheel);
    window.addEventListener("contextmenu", (e) => e.preventDefault());

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [settings, isPaused, countdown, onUpdateSettings]);

  useEffect(() => {
    // Reset scope on mode/weapon change
    setIsScoped(false);
  }, [settings.mode, settings.popBots.weapon]);

  useEffect(() => {
    // Countdown logic
    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count === 0) {
        setCountdown(null);
        clearInterval(interval);
        startSession();
        // Request pointer lock when game starts
        if (settings.mode !== GameMode.REACTION) {
          setTimeout(() => {
            document.body.requestPointerLock?.();
          }, 100);
        }
      } else {
        setCountdown(count);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const startSession = () => {
    spawnBatch();
    timerRef.current = setInterval(() => {
      if (isPaused) return;

      if (settings.mode === GameMode.MAP && !settings.map.isStaticBots) {
        statsRef.current.timeRemaining += 1;
        
        // Health Regeneration
        if (settings.map.botsHitBack && Date.now() - lastCombatTimeRef.current > 7000) {
          if (statsRef.current.health < 100) {
            statsRef.current.health = Math.min(100, (statsRef.current.health || 0) + 5);
            onUpdateStats({ ...statsRef.current });
          }
        }

        // End game when all target bots are eliminated, after initial spawn
        setTargets((currentTargets) => {
          if (
            currentTargets.length === 0 &&
            statsRef.current.timeRemaining > 2 &&
            !gameStatus
          ) {
            setGameStatus('victory');
            statsRef.current.status = 'victory';
            playSound('success');
            setTimeout(() => {
              if (timerRef.current) clearInterval(timerRef.current);
              onEnd({ ...statsRef.current });
            }, 3000);
          }
          return currentTargets;
        });
        onUpdateStats({ ...statsRef.current });
      } else {
        statsRef.current.timeRemaining -= 1;
        if (statsRef.current.timeRemaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          onEnd({ ...statsRef.current });
        } else {
          onUpdateStats({ ...statsRef.current });
        }
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const getRandomMapPos = (): [number, number, number] => {
    let attempts = 0;
    let finalPos: [number, number, number] = [0, 6, -20];
    const isSmallMap = settings.mode === GameMode.MAP && settings.map.botsHitBack;
    const collisionBoxes = isSmallMap ? SMALL_MAP_COLLISION_BOXES : MAP_COLLISION_BOXES;
    const mapRange = isSmallMap ? 90 : 260; // -45 to 45 or -130 to 130
    while (attempts < 100) {
      let x = (Math.random() - 0.5) * mapRange;
      let z = (Math.random() - 0.5) * mapRange;

      if (isSmallMap) {
        // Spawn tightly together near [-40, X, -40]
        x = -40 + (Math.random() - 0.5) * 15;
        z = -40 + (Math.random() - 0.5) * 15;
      } else {
        if (x < -25 && z > 5) {
          attempts++;
          continue;
        }
      }

      let maxY = 0;
      const botRadius = 0.6;
      for (const box of collisionBoxes) {
        if (
          x + botRadius > box.min.x &&
          x - botRadius < box.max.x &&
          z + botRadius > box.min.z &&
          z - botRadius < box.max.z
        ) {
          maxY = Math.max(maxY, box.max.y);
        }
      }

      finalPos = [x, maxY, z];
      const botBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(finalPos[0], finalPos[1] + 0.95, finalPos[2]),
        new THREE.Vector3(0.9, 1.9, 0.9),
      );

      let isColliding = false;
      for (const box of collisionBoxes) {
        if (botBox.intersectsBox(box)) {
          isColliding = true;
          break;
        }
      }

      if (!isColliding) return finalPos;
      attempts++;
    }
    return finalPos;
  };

  const spawnBatch = () => {
    let count = 3;
    if (settings.mode === GameMode.SIXSHOT) count = 6;
    if (settings.mode === GameMode.POP_BOTS) {
      count = 1;
    }
    if (settings.mode === GameMode.MAP) {
      count = settings.map.botsHitBack ? 5 : 15;
    }
    if (settings.mode === GameMode.REACTION) count = 0; // REACTION starts with 0 targets

    const newTargets: TargetData[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < count; i++) {
      if (settings.mode === GameMode.MAP) {
        newTargets.push({
          id: Math.random().toString(36).substr(2, 9),
          position: getRandomMapPos(),
          size: 1.2,
          health: 100,
          isSniper: settings.map.botsHitBack && i === 0,
        });
      } else {
        newTargets.push(generateTarget(settings.mode, usedIndices));
      }
    }
    setTargets(newTargets);
  };

  const generateTarget = (
    mode: GameMode,
    usedIndices?: Set<number>,
  ): TargetData => {
    const rangeX =
      mode === GameMode.GRIDSHOT ? 12 : mode === GameMode.POP_BOTS ? 40 : 18;
    const rangeY = 6;
    const size =
      mode === GameMode.SIXSHOT ? 0.3 : settings.theme === "retro" ? 1.4 : 1.2;

    let position: [number, number, number];
    let spawnIndex: number | undefined;

    if (mode === GameMode.POP_BOTS) {
      position = [(Math.random() - 0.5) * rangeX, 0.2, -8 - Math.random() * 20];
    } else if (mode === GameMode.REACTION) {
      position = [0, 2, -15]; // Fixed center position for reaction test
    } else {
      position = [
        (Math.random() - 0.5) * rangeX,
        1.5 + Math.random() * rangeY,
        -15,
      ];
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      position,
      size,
      spawnIndex,
      health: 100,
    };
  };

  // Bot removal timer for POP_BOTS
  useEffect(() => {
    if (settings.mode !== GameMode.POP_BOTS || isPaused || countdown !== null)
      return;

    const botLifeTime =
      settings.popBots.difficulty === "HARD"
        ? 700
        : settings.popBots.difficulty === "MEDIUM"
          ? 1100
          : 1500;
    const maxBots = 1;

    const intervals = targets.map((t) => {
      return setTimeout(() => {
        setTargets((prev) => {
          const filtered = prev.filter((target) => target.id !== t.id);
          const usedIndices = new Set(
            filtered
              .map((t) => t.spawnIndex)
              .filter((idx): idx is number => idx !== undefined),
          );
          if (filtered.length < maxBots) {
            return [
              ...filtered,
              generateTarget(GameMode.POP_BOTS, usedIndices),
            ];
          }
          return filtered;
        });
      }, botLifeTime);
    });

    return () => intervals.forEach((i) => clearTimeout(i));
  }, [targets, settings.mode, isPaused, countdown]);

  const handleHit = (id: string, isHeadshot: boolean = false) => {
    if (isPaused || countdown !== null || gameStatus) return;

    const weapon = settings.popBots.weapon;
    let damage = 100;

    if (!isHeadshot) {
      if (weapon === "AK47") damage = 35;
      else if (weapon === "PISTOL") damage = 26;
      else if (weapon === "AWP") damage = 115;
      else if (weapon === "KNIFE") damage = 55;

      // GRIDSHOT and SIXSHOT should always be one-shot
      if (
        settings.mode === GameMode.GRIDSHOT ||
        settings.mode === GameMode.SIXSHOT
      ) {
        damage = 100;
      }
    }

    statsRef.current.hits += 1;
    lastCombatTimeRef.current = Date.now();
    updateAccuracy();

    setTargets((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;

      const newHealth = target.health - damage;

      if (newHealth <= 0) {
        let baseScore = settings.mode === GameMode.SIXSHOT ? 500 : 100;
        if (
          settings.mode === GameMode.MAP ||
          settings.mode === GameMode.POP_BOTS
        ) {
          baseScore = isHeadshot ? 1000 : 500;
        }
        statsRef.current.score += baseScore;

        const remaining = prev.filter((t) => t.id !== id);
        const usedIndices = new Set(
          remaining
            .map((t) => t.spawnIndex)
            .filter((idx): idx is number => idx !== undefined),
        );

        // Success burst every 50 kills
        if (
          statsRef.current.hits % 50 === 0 &&
          settings.mode !== GameMode.REACTION
        ) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: [settings.themeColor, "#ffffff"],
          });
        }

        if (settings.mode === GameMode.REACTION) {
          return remaining;
        }

        if (settings.mode === GameMode.MAP && !settings.map.isStaticBots) {
          return remaining;
        }

        if (settings.mode === GameMode.MAP && settings.map.isStaticBots) {
          return [...remaining, {
            id: Math.random().toString(36).substr(2, 9),
            position: getRandomMapPos(),
            size: 1.2,
            health: 100,
          }];
        }

        return [...remaining, generateTarget(settings.mode, usedIndices)];
      } else {
        return prev.map((t) => (t.id === id ? { ...t, health: newHealth } : t));
      }
    });

    onUpdateStats({ ...statsRef.current });
  };

  const handleMiss = () => {
    if (isPaused || countdown !== null) return;

    statsRef.current.misses += 1;
    updateAccuracy();
    onUpdateStats({ ...statsRef.current });
  };

  const handleDamage = useCallback(
    (amount: number) => {
      if (
        isPaused ||
        countdown !== null ||
        settings.mode !== GameMode.MAP ||
        !settings.map.botsHitBack
      )
        return;

      statsRef.current.health = Math.max(
        0,
        (statsRef.current.health || 100) - amount,
      );
      lastCombatTimeRef.current = Date.now();
      onUpdateStats({ ...statsRef.current });

      if (statsRef.current.health <= 0 && !gameStatus) {
        setGameStatus('loss');
        statsRef.current.status = 'loss';
        playSound('error');
        setTimeout(() => {
          if (timerRef.current) clearInterval(timerRef.current);
          onEnd({ ...statsRef.current });
        }, 3000);
      }
    },
    [
      isPaused,
      countdown,
      settings.mode,
      settings.map.botsHitBack,
      gameStatus,
      onEnd,
      onUpdateStats,
    ],
  );

  const updateAccuracy = () => {
    const total = statsRef.current.hits + statsRef.current.misses;
    statsRef.current.accuracy =
      total > 0 ? (statsRef.current.hits / total) * 100 : 0;
  };

  if (settings.mode === GameMode.REACTION) {
    const customCursor = `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='16' cy='16' r='14' stroke='${encodeURIComponent(settings.themeColor)}' stroke-width='2' fill='none' /%3E%3Ccircle cx='16' cy='16' r='4' fill='${encodeURIComponent(settings.themeColor)}' /%3E%3C/svg%3E") 16 16, crosshair`;

    return (
      <div
        className="w-full h-full flex items-center justify-center p-8 bg-zinc-950 relative"
        style={{ cursor: customCursor }}
      >
        <ReactionTest
          isPaused={isPaused || countdown !== null}
          onResult={(time) => {
            statsRef.current.hits += 1;
            statsRef.current.score += Math.max(0, 1000 - time);
            statsRef.current.lastReactionTime = time;
            updateAccuracy();
            onUpdateStats({ ...statsRef.current });
          }}
          onEarlyClick={() => {
            statsRef.current.misses += 1;
            updateAccuracy();
            onUpdateStats({ ...statsRef.current });
          }}
        />

        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="text-[200px] font-black italic tracking-tighter"
              style={{
                color: settings.themeColor,
                textShadow: `0 0 40px ${settings.themeColor}40`,
              }}
            >
              {countdown}
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  const handleFireTrigger = useCallback(() => {
    if (isReloading || isPaused || gameStatus) return false;

    // In these modes, bypass weapon mechanics (ammo, etc.)
    if (settings.mode === GameMode.GRIDSHOT || settings.mode === GameMode.SIXSHOT) {
      return true;
    }

    if (
      statsRef.current.ammo === Infinity ||
      settings.popBots.weapon === "KNIFE"
    )
      return true;

    if (statsRef.current.ammo! > 0) {
      statsRef.current.ammo! -= 1;
      onUpdateStats({ ...statsRef.current });
      return true;
    }
    return false;
  }, [isPaused, settings.popBots.weapon, onUpdateStats, settings.mode, isReloading, gameStatus]);

  return (
    <div className="w-full h-full cursor-crosshair">
      <Canvas
        shadows
        camera={{ fov: isScoped ? 15 : settings.fov, position: [0, 2, 0] }}
      >
        <CameraSync 
          countdown={countdown} 
          mode={settings.mode} 
          botsHitBack={settings.map?.botsHitBack} 
        />
        {settings.mode === GameMode.MAP ? (
          <>
            <Sky sunPosition={[100, 20, 100]} />
            <ambientLight intensity={1.2} />
            <directionalLight
              position={[50, 100, 50]}
              intensity={2.5}
              castShadow
            />
          </>
        ) : (
          <>
            {settings.theme === "dark" && (
              <Stars
                radius={100}
                depth={50}
                count={2000}
                factor={4}
                saturation={0}
                fade
                speed={1}
              />
            )}
            {settings.theme === "retro" && (
              <Stars
                radius={50}
                depth={20}
                count={500}
                factor={10}
                saturation={1}
                fade
                speed={3}
              />
            )}
            <ambientLight
              intensity={
                settings.theme === "retro"
                  ? 0.8
                  : settings.theme === "light"
                    ? 1.0
                    : 0.4
              }
            />
            <directionalLight
              position={[10, 10, 5]}
              intensity={settings.theme === "light" ? 1.5 : 1}
              castShadow
            />
          </>
        )}

        <PhysicsWorld
          targets={targets}
          onHit={handleHit}
          onMiss={handleMiss}
          onDamage={handleDamage}
          isPaused={isPaused}
          countdown={countdown}
          theme={settings.theme}
          themeColor={settings.themeColor}
          mode={settings.mode}
          botColor={settings.popBots.botColor}
          keys={keys}
          playerVel={playerVel}
          botsHitBack={settings.map.botsHitBack}
          isStaticBots={settings.map.isStaticBots}
          isScoped={isScoped}
          weapon={settings.popBots.weapon}
          onFireTrigger={handleFireTrigger}
          isReloading={isReloading}
          recoilIndex={recoilIndex}
          difficulty={settings.mode === GameMode.MAP ? settings.map.difficulty : settings.popBots.difficulty}
        />

        <StatsSyncer 
          onUpdateStats={onUpdateStats}
          statsRef={statsRef}
          targets={targets}
          mode={settings.mode}
          active={!isPaused && countdown === null}
        />

        <Environment
          theme={settings.theme}
          themeColor={settings.themeColor}
          mode={settings.mode}
          botsHitBack={settings.map?.botsHitBack}
        />
        {(settings.mode === GameMode.POP_BOTS ||
          settings.mode === GameMode.MAP) && (
          <Weapon
            type={settings.popBots.weapon}
            themeColor={settings.themeColor}
            isPaused={isPaused || countdown !== null}
            isScoped={isScoped}
            isReloading={isReloading}
            velocity={playerVel.current}
            recoilIntensity={recoilIndex.current}
          />
        )}
        {!isPaused && (
          <PointerLockControls
            pointerSpeed={
              isScoped ? settings.adsSensitivity : settings.sensitivity
            }
          />
        )}
      </Canvas>

      {isScoped && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden"
        >
          {/* Massive black ring acting as the scope blackout mask */}
          <div
            className="absolute w-[80vh] h-[80vh] rounded-full ring-[100vw] ring-black"
            style={{ backgroundColor: "transparent" }}
          />

          {/* Internal scope details */}
          <div className="absolute w-[80vh] h-[80vh] flex items-center justify-center border-2 border-zinc-900 rounded-full">
            {/* High precision crosshair */}
            <div className="w-[1px] h-full bg-black/90" />
            <div className="h-[1px] w-full absolute bg-black/90" />

            {/* Center Dot */}
            <div className="w-2 h-2 bg-red-600 rounded-full shadow-[0_0_10px_red] z-10" />

            {/* Subtle lens distortion/tint */}
            <div className="absolute inset-0 bg-blue-500/5 rounded-full" />
          </div>
        </motion.div>
      )}

      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <motion.div
            key={countdown}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="text-[200px] font-black italic tracking-tighter"
            style={{
              color: settings.themeColor,
              textShadow: `0 0 40px ${settings.themeColor}40`,
            }}
          >
            {countdown}
          </motion.div>
        </div>
      )}

      {gameStatus && (
        <div className="absolute inset-0 flex items-center justify-center z-[60] bg-black/40 backdrop-blur-sm pointer-events-none">
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <h2 
              className={`text-8xl font-black italic tracking-tighter uppercase ${
                gameStatus === 'victory' ? 'text-lime-400' : 'text-red-500'
              }`}
              style={{
                textShadow: `0 0 40px ${gameStatus === 'victory' ? '#a3e635' : '#ef4444'}40`,
              }}
            >
              {gameStatus === 'victory' ? 'Victory' : 'Defeat'}
            </h2>
            <p className="text-zinc-400 font-mono uppercase tracking-[0.2em] text-sm blur-sm animate-pulse">
              {gameStatus === 'victory' ? 'Sector secured' : 'Operation failed'}
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function ReactionTest({
  isPaused,
  onResult,
  onEarlyClick,
}: {
  isPaused: boolean;
  onResult: (time: number) => void;
  onEarlyClick: () => void;
}) {
  const [state, setState] = useState<"WAITING" | "READY" | "CLICKED" | "EARLY">(
    "WAITING",
  );
  const [time, setTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimestamp = useRef<number>(0);

  const startTest = useCallback(() => {
    setState("WAITING");
    const delay = 1500 + Math.random() * 3500;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setState("READY");
      startTimestamp.current = Date.now();
    }, delay);
  }, []);

  useEffect(() => {
    if (!isPaused) {
      startTest();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPaused, startTest]);

  const handleBoxClick = () => {
    if (isPaused) return;

    if (state === "WAITING") {
      if (timerRef.current) clearTimeout(timerRef.current);
      setState("EARLY");
      onEarlyClick();
      playSound("click");
    } else if (state === "READY") {
      const reactionTime = Date.now() - startTimestamp.current;
      setTime(reactionTime);
      setState("CLICKED");
      onResult(reactionTime);
      playSound("hit");
    } else if (state === "CLICKED" || state === "EARLY") {
      startTest();
    }
  };

  return (
    <div
      onClick={handleBoxClick}
      className={`w-full max-w-2xl aspect-video flex flex-col items-center justify-center transition-colors duration-200 border-4 ${
        state === "WAITING"
          ? "bg-red-950 border-red-500"
          : state === "READY"
            ? "bg-lime-950 border-lime-500"
            : state === "EARLY"
              ? "bg-zinc-900 border-orange-500"
              : "bg-zinc-900 border-zinc-700"
      }`}
    >
      <motion.div
        key={state}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        {state === "WAITING" && (
          <>
            <h2 className="text-4xl font-black italic text-red-500 tracking-tighter mb-2 uppercase">
              Protocol: Wait
            </h2>
            <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
              Wait for visual trigger signal
            </p>
          </>
        )}
        {state === "READY" && (
          <>
            <h2 className="text-6xl font-black italic text-lime-400 tracking-tighter mb-2 uppercase">
              Trigger Active
            </h2>
            <p className="text-lime-200/50 font-mono text-sm font-bold uppercase tracking-widest animate-pulse">
              Engage Target Now
            </p>
          </>
        )}
        {state === "CLICKED" && (
          <>
            <h2 className="text-5xl font-black italic text-white tracking-tighter mb-2 uppercase">
              Recorded: {time}ms
            </h2>
            <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest">
              Click to initiate next calibrate cycle
            </p>
          </>
        )}
        {state === "EARLY" && (
          <>
            <h2 className="text-4xl font-black italic text-orange-500 tracking-tighter mb-2 uppercase">
              Jump Correction
            </h2>
            <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
              Early engagement detected. Resetting...
            </p>
            <p className="text-zinc-600 font-mono text-[10px] mt-4 uppercase">
              Click to restart calibration
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}

function StatsSyncer({ 
  onUpdateStats, 
  statsRef, 
  targets, 
  mode, 
  active 
}: { 
  onUpdateStats: (stats: GameStats) => void;
  statsRef: React.MutableRefObject<GameStats>;
  targets: TargetData[];
  mode: GameMode;
  active: boolean;
}) {
  const { camera } = useThree();
  const lastSync = useRef(0);

  useFrame(() => {
    if (!active || mode !== GameMode.MAP) return;
    
    // Sync every 50ms (20fps for minimap is plenty)
    if (Date.now() - lastSync.current > 50) {
      statsRef.current.playerPos = { x: camera.position.x, z: camera.position.z };
      const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
      statsRef.current.playerYaw = euler.y;
      statsRef.current.activeTargets = targets;
      
      onUpdateStats({ ...statsRef.current });
      lastSync.current = Date.now();
    }
  });

  return null;
}

function PhysicsWorld({
  targets,
  onHit,
  onMiss,
  onDamage,
  isPaused,
  countdown,
  theme,
  themeColor,
  mode,
  botColor,
  keys,
  playerVel,
  botsHitBack,
  isStaticBots,
  isScoped,
  weapon,
  onFireTrigger,
  isReloading,
  recoilIndex,
  difficulty,
}: {
  targets: TargetData[];
  onHit: (id: string, isHeadshot: boolean) => void;
  onMiss: () => void;
  onDamage: (amount: number) => void;
  isPaused: boolean;
  countdown: number | null;
  theme: string;
  themeColor: string;
  mode: GameMode;
  botColor: string;
  keys: React.MutableRefObject<{ [key: string]: boolean }>;
  playerVel: React.MutableRefObject<THREE.Vector3>;
  botsHitBack: boolean;
  isStaticBots?: boolean;
  isScoped: boolean;
  weapon: string;
  onFireTrigger?: () => boolean;
  isReloading: boolean;
  recoilIndex: React.MutableRefObject<number>;
  difficulty?: string;
}) {
  const { camera, raycaster, scene } = useThree();

  const targetFov = useRef(75);

  const [tracers, setTracers] = useState<
    { id: string; start: THREE.Vector3; end: THREE.Vector3 }[]
  >([]);
  const isShootingRef = useRef(false);
  const nextShootTime = useRef(0);

  const AK47_PATTERN = [
    [0, 0],
    [0, 0.015],
    [0, 0.03],
    [-0.005, 0.045],
    [0.005, 0.06],
    [-0.015, 0.07],
    [0.015, 0.075],
    [-0.02, 0.08],
    [0.02, 0.08],
    [-0.025, 0.08],
    [0.025, 0.085],
    [-0.03, 0.085],
    [0.03, 0.085],
    [-0.035, 0.085],
    [0.035, 0.085],
    [-0.04, 0.085],
    [0.04, 0.085],
    [-0.04, 0.08],
    [0.04, 0.08],
    [-0.03, 0.08],
    [0.03, 0.08],
  ];

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) isShootingRef.current = false;
    };
    const handleMouseDownLocal = (e: MouseEvent) => {
      if (e.button === 0) isShootingRef.current = true;
    };

    window.addEventListener("mousedown", handleMouseDownLocal);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousedown", handleMouseDownLocal);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const fireWeapon = useCallback(() => {
    if (!document.pointerLockElement) return;

    if (onFireTrigger && !onFireTrigger()) {
      playSound("click"); // Click empty
      return;
    }

    if (weapon === "KNIFE") {
      playSound("click"); // Swipe sound
    } else {
      playSound("fire");
    }

    let spreadX = 0;
    let spreadY = 0;

    const velLen = Math.sqrt(
      playerVel.current.x ** 2 + playerVel.current.z ** 2,
    ); // horizontal velocity
    const moveInaccuracy = velLen > 2 ? velLen * 0.005 : 0;

    if (weapon === "AK47") {
      const shots = Math.floor(recoilIndex.current);
      const idx = Math.min(shots, AK47_PATTERN.length - 1);
      const pattern = AK47_PATTERN[idx];
      // Base pattern + slight random inaccuracy + movement inaccuracy
      spreadX = pattern[0] + (Math.random() - 0.5) * (0.01 + moveInaccuracy);
      spreadY = pattern[1] + (Math.random() - 0.5) * (0.01 + moveInaccuracy);

      recoilIndex.current += 1;
    } else {
      if (weapon === "AWP") {
        const baseSpread = isScoped ? 0.001 : 0.08;
        spreadX = (Math.random() - 0.5) * (baseSpread + moveInaccuracy * 2);
        spreadY = (Math.random() - 0.5) * (baseSpread + moveInaccuracy * 2);
      } else if (weapon === "PISTOL") {
        spreadX = (Math.random() - 0.5) * (0.01 + moveInaccuracy * 0.5);
        spreadY = (Math.random() - 0.5) * (0.01 + moveInaccuracy * 0.5);
      }
      recoilIndex.current = 0;
    }

    raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), camera);

    let closestObstacleDist = weapon === "KNIFE" ? 2.5 : Infinity;
    if (mode === GameMode.MAP) {
      const collisionBoxes = botsHitBack ? SMALL_MAP_COLLISION_BOXES : MAP_COLLISION_BOXES; 
      for (const box of collisionBoxes) {
        const intersectPoint = new THREE.Vector3();
        if (raycaster.ray.intersectBox(box, intersectPoint)) {
          const dist = raycaster.ray.origin.distanceTo(intersectPoint);
          if (dist < closestObstacleDist) closestObstacleDist = dist;
        }
      }
    }

    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // Improved target hit detection: search up the tree for userData.id
    let targetHit = null;
    for (const intersect of intersects) {
      let curr: any = intersect.object;
      let foundId = null;
      let foundName = null;
      
      while (curr) {
        if (curr.userData?.id) {
          foundId = curr.userData.id;
          if (curr.name === "bot-head") foundName = "bot-head";
          break;
        }
        curr = curr.parent;
      }
      
      if (foundId) {
        targetHit = { 
          ...intersect, 
          object: { 
            ...intersect.object, 
            userData: { ...intersect.object.userData, id: foundId },
            name: foundName || intersect.object.name 
          } 
        };
        break;
      }
    }

    let finalHitPoint = new THREE.Vector3();
    let didHit = false;

    if (targetHit && targetHit.distance <= closestObstacleDist) {
      finalHitPoint.copy(targetHit.point);
      const targetId = targetHit.object.userData.id;
      const isHeadshot = targetHit.object.name === "bot-head";
      if (isHeadshot) playSound("headshot");
      else playSound("hit");
      onHit(targetId, isHeadshot);
      didHit = true;
    } else {
      const distance =
        closestObstacleDist === Infinity ? 100 : closestObstacleDist;
      finalHitPoint.copy(raycaster.ray.at(distance, new THREE.Vector3()));
      onMiss();
    }

    // Tracer logic
    if (
      weapon !== "KNIFE" &&
      (mode === GameMode.POP_BOTS || mode === GameMode.MAP)
    ) {
      const startPoint = new THREE.Vector3(0.5, -0.5, -1).applyMatrix4(
        camera.matrixWorld,
      );
      const id = Math.random().toString();
      setTracers((prev) => [
        ...prev,
        { id, start: startPoint.clone(), end: finalHitPoint.clone() },
      ]);

      setTimeout(() => {
        setTracers((prev) => prev.filter((t) => t.id !== id));
      }, 80);
    }
  }, [camera, raycaster, scene, onHit, onMiss, mode, weapon]);

  useFrame((state, delta) => {
    // Smooth FOV animation
    const pCamera = camera as THREE.PerspectiveCamera;
    if (pCamera.isPerspectiveCamera) {
      targetFov.current = isScoped ? 15 : 75;
      if (Math.abs(pCamera.fov - targetFov.current) > 0.1) {
        pCamera.fov = THREE.MathUtils.lerp(
          pCamera.fov,
          targetFov.current,
          delta * 15,
        );
        pCamera.updateProjectionMatrix();
      }
    }

    if (
      isPaused ||
      countdown !== null ||
      (mode !== GameMode.POP_BOTS && mode !== GameMode.MAP)
    )
      return;

    if (weapon === "AK47") {
      if (isShootingRef.current) {
        if (Date.now() > nextShootTime.current) {
          fireWeapon();
          nextShootTime.current = Date.now() + 100; // 600 RPM
        }
      } else {
        recoilIndex.current = Math.max(0, recoilIndex.current - delta * 15);
      }
    } else {
      recoilIndex.current = 0;
    }

    const moveSpeed = mode === GameMode.MAP ? 12 : 8;
    const accel = 15;

    const input = new THREE.Vector3();
    if (keys.current["KeyW"]) input.z -= 1;
    if (keys.current["KeyS"]) input.z += 1;
    if (keys.current["KeyA"]) input.x -= 1;
    if (keys.current["KeyD"]) input.x += 1;

    if (input.length() > 0) {
      input.normalize();

      // Calculate movement based on camera yaw
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
        camera.quaternion,
      );
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3()
        .crossVectors(forward, new THREE.Vector3(0, 1, 0))
        .normalize();

      const moveVec = new THREE.Vector3()
        .addScaledVector(forward, -input.z)
        .addScaledVector(right, input.x);

      input.copy(moveVec);
    }

    const targetVel = input.multiplyScalar(moveSpeed);

    // Movement collision with margin
    const playerRadius = 0.4;

    // Snappier physics model
    const gravity = -30;
    const jumpForce = 12;

    if (input.length() > 0) {
      // Horizontal Lerp
      const horizontalVel = new THREE.Vector3(
        playerVel.current.x,
        0,
        playerVel.current.z,
      );
      horizontalVel.lerp(targetVel, delta * accel);
      playerVel.current.x = horizontalVel.x;
      playerVel.current.z = horizontalVel.z;
    } else {
      playerVel.current.x = THREE.MathUtils.lerp(
        playerVel.current.x,
        0,
        delta * 15,
      );
      playerVel.current.z = THREE.MathUtils.lerp(
        playerVel.current.z,
        0,
        delta * 15,
      );
    }

    // Gravity and Jumping
    let isOnGround = false;
    const collisionBoxes = botsHitBack ? SMALL_MAP_COLLISION_BOXES : MAP_COLLISION_BOXES;
    
    if (mode === GameMode.MAP) {
      playerVel.current.y += gravity * delta;

      let nextY = camera.position.y + playerVel.current.y * delta;

      // Vertical Collision Check
      const playerBoxY = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(camera.position.x, nextY - 0.9, camera.position.z), // Bottom-weighted box
        new THREE.Vector3(playerRadius * 2, 1.8, playerRadius * 2),
      );

      let collidesY = false;
      let highestFloorY = 1.8; // Default ground level based on eye level

      for (const box of collisionBoxes) {
        if (playerBoxY.intersectsBox(box)) {
          if ((box as any).isJumpPad) {
            playerVel.current.y = 40; // massive jump
            collidesY = false;
            isOnGround = false;
            camera.position.y += 0.5; // instantly boost out
            break; // Stop checking
          } else if (
            playerVel.current.y <= 0 &&
            camera.position.y - 1.8 >= box.max.y - 0.2
          ) {
            // Landing on top
            highestFloorY = Math.max(highestFloorY, box.max.y + 1.8);
            collidesY = true;
          } else if (playerVel.current.y > 0 && camera.position.y < box.min.y) {
            // Hitting head
            collidesY = true;
          }
        }
      }

      if (!collidesY && nextY >= 1.8) {
        camera.position.y = nextY;
      } else {
        if (collidesY && playerVel.current.y <= 0) {
          camera.position.y = highestFloorY;
          isOnGround = true;
        }
        playerVel.current.y = 0;
      }

      // Ground check (as a hard fallback)
      if (camera.position.y <= 1.81) {
        camera.position.y = Math.max(1.8, camera.position.y);
        isOnGround = true;
      }

      if (keys.current["Space"] && isOnGround) {
        playerVel.current.y = jumpForce;
      }
    }

    // Temp next position
    const nextX = camera.position.x + playerVel.current.x * delta;
    const nextZ = camera.position.z + playerVel.current.z * delta;

    // Movement collision with step-up support
    const checkMovementCollision = (
      newX: number,
      newZ: number,
      boxSizeY: number,
      boxCenterY: number,
    ) => {
      const box = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(newX, boxCenterY, newZ),
        new THREE.Vector3(playerRadius * 2, boxSizeY, playerRadius * 2),
      );
      let collides = false;
      let stepUpHeight = 0;

      for (const mBox of collisionBoxes) {
        if (box.intersectsBox(mBox)) {
          const footY = camera.position.y - 1.8;
          // Check if we can step up (obstacle max Y is within 0.7 units above foot level)
          if (mBox.max.y > footY && mBox.max.y <= footY + 0.75) {
            stepUpHeight = Math.max(stepUpHeight, mBox.max.y - footY);
          } else {
            collides = true;
          }
        }
      }
      return { collides, stepUpHeight };
    };

    if (mode === GameMode.MAP) {
      const resX = checkMovementCollision(
        nextX,
        camera.position.z,
        1.6,
        camera.position.y - 0.8,
      );
      if (!resX.collides) {
        camera.position.x = nextX;
        if (resX.stepUpHeight > 0) camera.position.y += resX.stepUpHeight;
      } else {
        playerVel.current.x = 0;
      }

      const resZ = checkMovementCollision(
        camera.position.x,
        nextZ,
        1.6,
        camera.position.y - 0.8,
      );
      if (!resZ.collides) {
        camera.position.z = nextZ;
        if (resZ.stepUpHeight > 0) camera.position.y += resZ.stepUpHeight;
      } else {
        playerVel.current.z = 0;
      }
    } else {
      camera.position.x = nextX;
      camera.position.z = nextZ;
    }

    // Hard Bounds
    let limit = 20;
    let limitZ = 20;
    if (mode === GameMode.MAP) {
      const isSmallMap = botsHitBack;
      limit = isSmallMap ? 48 : 145;
      limitZ = isSmallMap ? 48 : 145;
    }
    camera.position.x = Math.max(-limit, Math.min(limit, camera.position.x));
    camera.position.z = Math.max(-limitZ, Math.min(limitZ, camera.position.z));
  });

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!document.pointerLockElement || isPaused || countdown !== null)
        return;
      if (e.button === 0) {
        if (mode === GameMode.GRIDSHOT || mode === GameMode.SIXSHOT || weapon !== "AK47") {
          fireWeapon();
        }
      }
    },
    [isPaused, countdown, weapon, fireWeapon, mode],
  );

  useEffect(() => {
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [handleClick]);

  return (
    <>
      {targets.map((t) =>
        mode === GameMode.POP_BOTS || mode === GameMode.MAP ? (
          <PlayerBot
            key={t.id}
            data={t}
            botColor={botColor}
            theme={theme}
            mode={mode}
            onShootPlayer={onDamage}
            isPaused={isPaused || countdown !== null}
            botsHitBack={botsHitBack}
            isStaticBots={isStaticBots}
            difficulty={difficulty}
          />
        ) : (
          <VoxelTarget
            key={t.id}
            data={t}
            theme={theme}
            themeColor={themeColor}
          />
        ),
      )}

      {/* Bullet Tracers */}
      {tracers.map((tracer) => (
        <line key={tracer.id}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={
                new Float32Array([
                  tracer.start.x,
                  tracer.start.y,
                  tracer.start.z,
                  tracer.end.x,
                  tracer.end.y,
                  tracer.end.z,
                ])
              }
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#fbbf24"
            linewidth={2}
            transparent
            opacity={0.8}
          />
        </line>
      ))}
    </>
  );
}

function AWPModel() {
  return (
    <group rotation={[0, 0, 0]}>
      {/* Body */}
      <mesh position={[0, 0, -0.1]}>
        <boxGeometry args={[0.1, 0.2, 0.8]} />
        <meshStandardMaterial color="#3a5a3a" />
      </mesh>
      {/* Stock */}
      <mesh position={[0, -0.05, 0.6]}>
        <boxGeometry args={[0.08, 0.25, 0.6]} />
        <meshStandardMaterial color="#3a5a3a" />
      </mesh>
      {/* Scope */}
      <mesh position={[0, 0.18, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 12]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.05, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.4, 10]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
}

function AK47Model() {
  return (
    <group rotation={[0, 0, 0]}>
      {/* Receiver */}
      <mesh position={[0, -0.01, -0.1]}>
        <boxGeometry args={[0.065, 0.12, 0.5]} />
        <meshStandardMaterial color="#222" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Dust cover */}
      <mesh position={[0, 0.06, -0.11]}>
        <boxGeometry args={[0.063, 0.04, 0.48]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.4} />
      </mesh>
      {/* Rear Sight Block */}
      <mesh position={[0, 0.08, -0.3]}>
        <boxGeometry args={[0.05, 0.05, 0.1]} />
        <meshStandardMaterial color="#111" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.18, 0.08]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.06, 0.22, 0.09]} />
        <meshStandardMaterial color="#3a2211" roughness={0.9} />
      </mesh>
      {/* Stock */}
      <mesh position={[0, -0.04, 0.35]} rotation={[0.04, 0, 0]}>
        <boxGeometry args={[0.06, 0.16, 0.4]} />
        <meshStandardMaterial color="#4d2b15" roughness={0.9} />
      </mesh>
      {/* Stock detail cut */}
      <mesh position={[0, -0.04, 0.55]} rotation={[0.04, 0, 0]}>
        <boxGeometry args={[0.062, 0.165, 0.02]} />
        <meshStandardMaterial color="#111" metalness={0.6} roughness={0.5} />
      </mesh>
      {/* Magazine - curved */}
      <group position={[0, 0, -0.15]}>
        <mesh position={[0, -0.15, 0]}>
          <boxGeometry args={[0.055, 0.15, 0.13]} />
          <meshStandardMaterial color="#111" metalness={0.8} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.27, -0.02]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[0.055, 0.15, 0.13]} />
          <meshStandardMaterial color="#111" metalness={0.8} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.38, -0.06]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.055, 0.12, 0.13]} />
          <meshStandardMaterial color="#111" metalness={0.8} roughness={0.5} />
        </mesh>
      </group>
      {/* Lower Handguard */}
      <mesh position={[0, 0.0, -0.48]}>
        <boxGeometry args={[0.08, 0.1, 0.25]} />
        <meshStandardMaterial color="#4d2b15" roughness={0.9} />
      </mesh>
      {/* Upper Handguard (Gas tube cover) */}
      <mesh position={[0, 0.07, -0.48]}>
        <boxGeometry args={[0.07, 0.06, 0.22]} />
        <meshStandardMaterial color="#4d2b15" roughness={0.9} />
      </mesh>
      {/* Gas block */}
      <mesh position={[0, 0.07, -0.65]}>
        <boxGeometry args={[0.03, 0.06, 0.1]} />
        <meshStandardMaterial color="#222" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.04, -0.68]}>
        <boxGeometry args={[0.03, 0.08, 0.04]} />
        <meshStandardMaterial color="#222" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.03, -0.75]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.02, 0.8, 12]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* Front Sight */}
      <mesh position={[0, 0.06, -1.05]}>
        <boxGeometry args={[0.02, 0.08, 0.04]} />
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.4} />
      </mesh>
      {/* Cleaning rod */}
      <mesh position={[0, -0.01, -0.8]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.6, 8]} />
        <meshStandardMaterial color="#444" metalness={0.8} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Weapon({
  type,
  themeColor,
  isPaused,
  isScoped,
  isReloading,
  velocity,
  recoilIntensity,
}: {
  type: string;
  themeColor: string;
  isPaused: boolean;
  isScoped: boolean;
  isReloading: boolean;
  velocity: THREE.Vector3;
  recoilIntensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const lastCameraRotation = useRef(new THREE.Euler());
  const swayOffset = useRef(new THREE.Vector2(0, 0));

  useFrame((state, delta) => {
    if (groupRef.current && !isPaused) {
      if (isScoped) {
        groupRef.current.visible = false;
        return;
      }
      groupRef.current.visible = true;

      const time = state.clock.elapsedTime;
      
      // Calculate horizontal speed for bobbing
      const speed = new THREE.Vector2(velocity.x, velocity.z).length();
      const isMoving = speed > 0.1;
      
      // Sway calculation (lag behind camera rotation)
      const currentRotation = new THREE.Euler().setFromQuaternion(camera.quaternion);
      const deltaRotationX = currentRotation.x - lastCameraRotation.current.x;
      const deltaRotationY = currentRotation.y - lastCameraRotation.current.y;
      
      swayOffset.current.x = THREE.MathUtils.lerp(swayOffset.current.x, -deltaRotationY * 0.5, delta * 10);
      swayOffset.current.y = THREE.MathUtils.lerp(swayOffset.current.y, deltaRotationX * 0.5, delta * 10);
      lastCameraRotation.current.copy(currentRotation);

      // Procedural Bobbing
      let bobX = 0;
      let bobY = 0;
      let bobZ = 0;
      let bobRotZ = 0;

      if (isReloading) {
        bobY = -0.5 + Math.sin(time * 10) * 0.05;
        bobRotZ = Math.sin(time * 5) * 0.1;
      } else {
        // Idle bobbing
        const idleFreq = 1.5;
        const idleAmp = 0.002;
        bobX = Math.cos(time * idleFreq) * idleAmp;
        bobY = Math.sin(time * idleFreq * 2) * idleAmp;

        // Movement bobbing (CS2 style)
        if (isMoving) {
          const moveFreq = 12;
          const moveAmp = 0.015 * Math.min(speed / 12, 1);
          bobX += Math.cos(time * moveFreq) * moveAmp;
          bobY += Math.abs(Math.sin(time * moveFreq)) * moveAmp * 1.5;
          bobZ += Math.sin(time * moveFreq) * 0.01;
          bobRotZ += Math.sin(time * moveFreq * 0.5) * 0.05;
        }
      }

      // Base Position & Rotation
      groupRef.current.position.copy(camera.position);
      groupRef.current.quaternion.copy(camera.quaternion);

      // Recoil kickback
      const recoilKick = recoilIntensity * 0.05;
      
      // Final Offset from camera
      const weaponPos = new THREE.Vector3(
        0.5 + bobX + swayOffset.current.x, 
        -0.5 + bobY + swayOffset.current.y, 
        -0.8 + bobZ + recoilKick
      );
      weaponPos.applyQuaternion(camera.quaternion);
      groupRef.current.position.add(weaponPos);

      // Apply procedural rotations
      if (isReloading) {
        groupRef.current.rotateX(-0.5);
      }
      groupRef.current.rotateZ(bobRotZ);
      
      // Recoil rotation
      if (recoilIntensity > 0) {
        groupRef.current.rotateX(recoilIntensity * 0.05);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {type === "PISTOL" && (
        <group rotation={[0, 0, 0]}>
          {/* USP - Tactical Silenced */}
          <mesh position={[0, 0.02, -0.1]}>
            <boxGeometry args={[0.06, 0.1, 0.35]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <mesh position={[0, -0.1, 0.05]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.06, 0.2, 0.08]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          {/* Silencer */}
          <mesh position={[0, 0.04, -0.45]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.45, 12]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
      )}
      {type === "AK47" && (
        <AK47Model />
      )}
      {type === "AWP" && (
        <group rotation={[0, 0, 0]}>
          {/* Body */}
          <mesh position={[0, 0, -0.1]}>
            <boxGeometry args={[0.1, 0.2, 0.8]} />
            <meshStandardMaterial color="#3a5a3a" />
          </mesh>
          {/* Stock */}
          <mesh position={[0, -0.05, 0.6]}>
            <boxGeometry args={[0.08, 0.25, 0.6]} />
            <meshStandardMaterial color="#3a5a3a" />
          </mesh>
          {/* Scope */}
          <mesh position={[0, 0.18, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.5, 12]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          {/* Barrel */}
          <mesh position={[0, 0.05, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.4, 10]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
      )}
      {type === "KNIFE" && (
        <group rotation={[Math.PI / 6, -Math.PI / 8, Math.PI / 4]}>
          {/* Handle */}
          <mesh position={[0, -0.1, 0.1]}>
            <boxGeometry args={[0.04, 0.2, 0.06]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          {/* Blade */}
          <mesh position={[0, 0.15, 0.1]}>
            <boxGeometry args={[0.02, 0.3, 0.08]} />
            <meshStandardMaterial
              color="#888"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        </group>
      )}
      {/* Muzzle flash glow center */}
      <mesh position={[0, 0.05, -0.6]} visible={false}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial
          color={themeColor}
          emissive={themeColor}
          emissiveIntensity={5}
        />
      </mesh>
    </group>
  );
}

function PlayerShadow() {
  const { camera } = useThree();
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (ref.current) {
      ref.current.position.copy(camera.position);
      const euler = new THREE.Euler().setFromQuaternion(
        camera.quaternion,
        "YXZ",
      );
      ref.current.rotation.set(0, euler.y, 0);
    }
  });

  return (
    <group ref={ref}>
      {/* Head */}
      <mesh castShadow>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color="#2d3748" side={THREE.FrontSide} />
      </mesh>
      {/* Body */}
      <mesh position={[0, -0.9, 0]} castShadow>
        <boxGeometry args={[0.8, 1.2, 0.4]} />
        <meshStandardMaterial color="#2d3748" side={THREE.FrontSide} />
      </mesh>
    </group>
  );
}

function PlayerBot({
  data,
  botColor,
  theme,
  mode,
  onShootPlayer,
  isPaused,
  botsHitBack,
  isStaticBots,
  difficulty = 'MEDIUM',
}: {
  data: TargetData;
  botColor: string;
  theme: string;
  mode?: GameMode;
  onShootPlayer?: (amount: number) => void;
  isPaused?: boolean;
  botsHitBack?: boolean;
  isStaticBots?: boolean;
  difficulty?: string;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const initialPos = useRef<[number, number, number]>(data.position);
  const currentPosRef = useRef(new THREE.Vector3(...data.position));
  const botVel = useRef(new THREE.Vector3());
  const initialized = useRef(false);
  const { camera } = useThree();
  const nextShootTime = useRef(Date.now() + 2000 + Math.random() * 3000);
  const strafeOffset = useRef(Math.random() * Math.PI * 2);
  const lookAtRef = useRef(new THREE.Object3D());
  const targetNavPoint = useRef<THREE.Vector3 | null>(null);

  useFrame((state, delta) => {
    if (isPaused || !meshRef.current) return;

    if (!initialized.current) {
      meshRef.current.position.set(...data.position);
      initialized.current = true;
      // Assign initial random nav point
      const NAV_POINTS = botsHitBack ? [
        new THREE.Vector3(40, 1, 40), // player spawn
        new THREE.Vector3(25, 1, 25),
        new THREE.Vector3(10, 1, 35),
        new THREE.Vector3(35, 1, 10),
        new THREE.Vector3(0, 1, 0), // center
        new THREE.Vector3(-25, 1, -25),
        new THREE.Vector3(-40, 1, -40), // bot spawn
        new THREE.Vector3(-30, 1, 15),
        new THREE.Vector3(15, 1, -30),
      ] : [
        new THREE.Vector3(30, 1, -30),
        new THREE.Vector3(45, 1, -10),
        new THREE.Vector3(5, 1, 0),
        new THREE.Vector3(0, 1, 40),
        new THREE.Vector3(-35, 1, -30),
        new THREE.Vector3(-35, 1, 10),
        new THREE.Vector3(0, 1, -20),
      ];
      targetNavPoint.current =
        NAV_POINTS[Math.floor(Math.random() * NAV_POINTS.length)].clone();
    }

    // Movement bobbing (vertical oscillation)
    const bob = Math.sin(state.clock.elapsedTime * 6) * 0.03;
    const armSwing = Math.sin(state.clock.elapsedTime * 8) * 0.5;

    let seeDistance = data.isSniper ? Infinity : 60;
    let hitProb = data.isSniper ? 0.95 : 0.6;
    let baseShootDelay = 1500;
    if (data.isSniper) {
      if (difficulty === 'EASY') {
        hitProb = 0.3;
        baseShootDelay = 3500;
      } else if (difficulty === 'MEDIUM') {
        hitProb = 0.5;
        baseShootDelay = 2500;
      } else if (difficulty === 'HARD') {
        hitProb = 0.85;
        baseShootDelay = 1200;
      }
    } else {
      if (difficulty === 'EASY') {
        seeDistance = 35;
        hitProb = 0.2;
        baseShootDelay = 2500;
      } else if (difficulty === 'HARD') {
        seeDistance = 80;
        hitProb = 0.85;
        baseShootDelay = 800;
      }
    }

    const leftLeg = meshRef.current.getObjectByName("leftLeg");
    const rightLeg = meshRef.current.getObjectByName("rightLeg");
    const isMoving = mode === GameMode.MAP && !isStaticBots;
    if (leftLeg && rightLeg) {
      if (isMoving) {
        leftLeg.rotation.x = armSwing;
        rightLeg.rotation.x = -armSwing;
      } else {
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
      }
    }

    const collisionBoxes = botsHitBack ? SMALL_MAP_COLLISION_BOXES : MAP_COLLISION_BOXES;

    if (mode === GameMode.MAP && !isStaticBots) {
      const distToPlayer = currentPosRef.current.distanceTo(camera.position);
      let isVisible = false;

      // Line of sight check using Map Collision Boxes (throttled)
      if (distToPlayer < seeDistance) {
        if (!meshRef.current.userData.nextSightCheckTime || Date.now() > meshRef.current.userData.nextSightCheckTime) {
          const eyePos = currentPosRef.current.clone();
          eyePos.y += 1.0; // Bot eye level
          
          const dirToPlayer = new THREE.Vector3()
            .subVectors(camera.position, eyePos)
            .normalize();
            
          const ray = new THREE.Ray(eyePos, dirToPlayer);
          let occluded = false;

          const distToEye = eyePos.distanceTo(camera.position);

          for (const box of collisionBoxes) {
            const target = new THREE.Vector3();
            if (ray.intersectBox(box, target)) {
              // Check if intersection distance is less than distance to player
              if (eyePos.distanceTo(target) < distToEye - 1.0) {
                occluded = true;
                break;
              }
            }
          }
          meshRef.current.userData.isVisible = !occluded;
          meshRef.current.userData.nextSightCheckTime = Date.now() + 200; // Check 5 times a sec
        }
        isVisible = meshRef.current.userData.isVisible;
      } else {
        meshRef.current.userData.isVisible = false;
        isVisible = false;
      }

      const nextPos = currentPosRef.current.clone();

      if (isVisible) {
        // Look at player
        lookAtRef.current.position.set(
          currentPosRef.current.x,
          currentPosRef.current.y,
          currentPosRef.current.z,
        );
        lookAtRef.current.lookAt(
          camera.position.x,
          currentPosRef.current.y,
          camera.position.z,
        );
        meshRef.current.quaternion.slerp(
          lookAtRef.current.quaternion,
          delta * 5,
        );

        if (distToPlayer > 18 && !isStaticBots) {
          const dir = new THREE.Vector3()
            .subVectors(camera.position, currentPosRef.current)
            .setY(0)
            .normalize();
          nextPos.addScaledVector(dir, delta * 3.5);
        }

        // Smooth Strafe Logic
        if (!isStaticBots) {
          const strafeSpeed = 1.5;
          const strafeWidth = 4;
          const strafeDir = new THREE.Vector3(1, 0, 0).applyQuaternion(
            meshRef.current.quaternion,
          );
          const oscillation = Math.sin(
            state.clock.elapsedTime * strafeSpeed + strafeOffset.current,
          );
          nextPos.addScaledVector(strafeDir, oscillation * delta * strafeWidth);
        }
      } else if (!isStaticBots) {
        // Patrol or track
        if (botsHitBack) {
          targetNavPoint.current = camera.position.clone();
        }

        if (targetNavPoint.current) {
          const distToNav = currentPosRef.current.distanceTo(
            targetNavPoint.current,
          );
          if (distToNav < 3 && !botsHitBack) {
            // Pick new nav point
            const NAV_POINTS = [
              new THREE.Vector3(30, 1, -30),
              new THREE.Vector3(45, 1, -10),
              new THREE.Vector3(5, 1, 0),
              new THREE.Vector3(0, 1, 40),
              new THREE.Vector3(-35, 1, -30),
              new THREE.Vector3(-35, 1, 10),
              new THREE.Vector3(0, 1, -20),
            ];
            targetNavPoint.current =
              NAV_POINTS[Math.floor(Math.random() * NAV_POINTS.length)].clone();
          } else {
            lookAtRef.current.position.set(
              currentPosRef.current.x,
              currentPosRef.current.y,
              currentPosRef.current.z,
            );
            lookAtRef.current.lookAt(
              targetNavPoint.current.x,
              currentPosRef.current.y,
              targetNavPoint.current.z,
            );
            meshRef.current.quaternion.slerp(
              lookAtRef.current.quaternion,
              delta * 3,
            );

            const dir = new THREE.Vector3()
              .subVectors(targetNavPoint.current, currentPosRef.current)
              .setY(0)
              .normalize();
            nextPos.addScaledVector(dir, delta * 5); // run to point
          }
        }
      }

      // Simple Gravity
      const gravity = -30;
      botVel.current.y += gravity * delta;

      // Map Bounds for Bots
      const botBounds = botsHitBack ? 48 : 128; // Small map is -50 to 50, big map is -150 to 150
      nextPos.x = Math.max(-botBounds, Math.min(botBounds, nextPos.x));
      nextPos.z = Math.max(-botBounds, Math.min(botBounds, nextPos.z));

      // Bot-specific collision detection
      const checkBotCollision = (pos: THREE.Vector3) => {
        const botBox = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(pos.x, pos.y + 1.2, pos.z), // Center at waist level
          new THREE.Vector3(1.0, 2.4, 1.0),
        );
        for (const box of collisionBoxes) {
          if (botBox.intersectsBox(box)) return true;
        }
        return false;
      };

      // Gravitational fall with collision
      const yOnly = currentPosRef.current.clone();
      nextPos.y += botVel.current.y * delta;
      yOnly.y = nextPos.y;

      if (checkBotCollision(yOnly)) {
        // Hit the floor/obstacle, stop falling
        nextPos.y = currentPosRef.current.y;
        botVel.current.y = 0;
      } else {
        currentPosRef.current.y = nextPos.y;
      }

      // Base floor clamp
      const minFloorY = (mode === GameMode.MAP || mode === GameMode.POP_BOTS) ? 0 : -1;
      if (currentPosRef.current.y < minFloorY) {
        currentPosRef.current.y = minFloorY;
        botVel.current.y = 0;
      }

      // Apply movement with collision checks
      const xOnly = currentPosRef.current.clone();
      xOnly.x = nextPos.x;
      if (!checkBotCollision(xOnly)) currentPosRef.current.x = nextPos.x;

      const zOnly = currentPosRef.current.clone();
      zOnly.z = nextPos.z;
      if (!checkBotCollision(zOnly)) currentPosRef.current.z = nextPos.z;

      meshRef.current.position.set(
        currentPosRef.current.x,
        currentPosRef.current.y + bob,
        currentPosRef.current.z,
      );

      // Shoot player
      if (botsHitBack && Date.now() > nextShootTime.current) {
        if (isVisible && distToPlayer < seeDistance) {
          if (Math.random() < hitProb) {
            let damage = 20;
            if (data.isSniper) {
              damage = difficulty === 'HARD' ? 100 : (difficulty === 'MEDIUM' ? 50 : 30);
            }
            onShootPlayer?.(damage);
          } else {
            playSound("fire"); // Missed shot sound
          }
          nextShootTime.current = Date.now() + baseShootDelay + Math.random() * (data.isSniper ? 3000 : 1500);
        }
      }
    }
  });

  return (
    <group ref={meshRef}>
      <group rotation={[0, Math.PI, 0]}>
        {/* Torso (Minecraft style) */}
        <mesh
          position={[0, 1.1, 0]}
          name="target"
          userData={{ id: data.id }}
          castShadow
        >
          <boxGeometry args={[0.5, 0.75, 0.25]} />
          <meshStandardMaterial color={data.isSniper ? "#8e44ad" : "#2d3748"} />
        </mesh>

        {/* Head */}
        <mesh
          position={[0, 1.725, 0]}
          name="bot-head"
          userData={{ id: data.id }}
          castShadow
        >
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color={data.isSniper ? "#8e44ad" : botColor} />
        </mesh>

        {/* Left Arm holding weapon forward */}
        <group position={[0.375, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh position={[0, -0.275, 0]} castShadow>
            <boxGeometry args={[0.25, 0.75, 0.25]} />
            <meshStandardMaterial color={data.isSniper ? "#8e44ad" : botColor} />
          </mesh>
          {/* Bot Weapon pointing forward (-Y in this rotated group = -Z in world) */}
          <group position={[0, -0.65, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
            {data.isSniper ? <AWPModel /> : <AK47Model />}
          </group>
        </group>

        {/* Right Arm resting or swinging */}
        <mesh position={[-0.375, 0.975, 0]} castShadow>
          <boxGeometry args={[0.25, 0.75, 0.25]} />
          <meshStandardMaterial color={data.isSniper ? "#8e44ad" : botColor} />
        </mesh>

        {/* Left Leg */}
        <group name="leftLeg" position={[0.125, 0.725, 0]}>
          <mesh position={[0, -0.3625, 0]} castShadow>
            <boxGeometry args={[0.25, 0.725, 0.25]} />
            <meshStandardMaterial color={data.isSniper ? "#5b2c6f" : "#1a202c"} />
          </mesh>
        </group>
        
        {/* Right Leg */}
        <group name="rightLeg" position={[-0.125, 0.725, 0]}>
          <mesh position={[0, -0.3625, 0]} castShadow>
            <boxGeometry args={[0.25, 0.725, 0.25]} />
            <meshStandardMaterial color={data.isSniper ? "#5b2c6f" : "#1a202c"} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function VoxelTarget({
  data,
  theme,
  themeColor,
}: {
  data: TargetData;
  theme: string;
  themeColor: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.z += 0.005;
      meshRef.current.position.y +=
        Math.sin(state.clock.elapsedTime * 2) * 0.002;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={new THREE.Vector3(...data.position)}
      name="target"
      userData={{ id: data.id }}
      castShadow={theme !== "light"}
    >
      <boxGeometry args={[data.size, data.size, data.size]} />

      <meshStandardMaterial
        color={themeColor}
        emissive={themeColor}
        emissiveIntensity={theme === "retro" ? 2 : 0.5}
      />
      {/* Voxel edges */}
      <lineSegments>
        <edgesGeometry
          args={[new THREE.BoxGeometry(data.size, data.size, data.size)]}
        />
        <lineBasicMaterial
          color={theme === "light" ? "#000000" : "#ffffff"}
          linewidth={theme === "retro" ? 3 : 1}
        />
      </lineSegments>
    </mesh>
  );
}

function SunRays() {
  const sunPos = new THREE.Vector3(100, 40, 100);
  return (
    <group>
      {/* Visual sun */}
      <mesh position={sunPos}>
        <sphereGeometry args={[8, 32, 32]} />
        <meshBasicMaterial color="#fffbe6" />
      </mesh>
      {/* Sun rays simulation */}
      {[...Array(8)].map((_, i) => (
        <mesh 
          key={i} 
          position={sunPos.clone().multiplyScalar(0.95)} 
          rotation={[
            -Math.PI / 4 + (Math.random() - 0.5) * 0.2, // Aimed towards center
            Math.PI + Math.PI / 4 + (Math.random() - 0.5) * 0.2, 
            0
          ]}
        >
          <cylinderGeometry args={[2, 15, 300, 8]} />
          <meshBasicMaterial 
            color="#fffbe6" 
            transparent 
            opacity={0.02} 
            depthWrite={false} 
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function Environment({
  theme,
  themeColor,
  mode,
  botsHitBack,
}: {
  theme: string;
  themeColor: string;
  mode: GameMode;
  botsHitBack?: boolean;
}) {
  return (
    <group>
      {/* Dynamic Background for MAP mode */}
      {mode === GameMode.MAP ? (
        <>
          <Sky sunPosition={[100, 20, 100]} inclination={0.1} azimuth={0.25} turbidity={0.1} rayleigh={0.5} />
          <ambientLight intensity={1.0} />
          <directionalLight
            position={[100, 100, 100]}
            intensity={2}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-150}
            shadow-camera-right={150}
            shadow-camera-top={150}
            shadow-camera-bottom={-150}
            shadow-camera-far={500}
          />
          <SunRays />
        </>
      ) : (
        <>
          <color
            attach="background"
            args={[
              theme === "light"
                ? "#ffffff"
                : theme === "retro"
                  ? "#1a1a2e"
                  : "#000000",
            ]}
          />
          <ambientLight intensity={theme === "retro" ? 0.6 : 0.4} />
        </>
      )}

      {/* Floor */}
      {mode !== GameMode.MAP && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, mode === GameMode.POP_BOTS ? 0 : -1, 0]}
          receiveShadow
        >
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial
            color={
              theme === "light"
                ? "#eeeeee"
                : theme === "retro"
                  ? "#0f0f1b"
                  : "#050505"
            }
          />
        </mesh>
      )}

      {/* Grid Floor - Only for trainers, not for MAP mode */}
      {mode !== GameMode.MAP && (
        <gridHelper
          args={[
            200,
            100,
            themeColor,
            theme === "light" ? "#dddddd" : "#171717",
          ]}
          position={[0, -0.99, 0]}
        />
      )}

      {/* Voxel Obstacles for MAP mode */}
      {mode === GameMode.MAP && (
        <group>
          {(botsHitBack ? SMALL_MAP_ELEMENTS : MAP_ELEMENTS).map((el, i) => (
            <mesh
              key={i}
              position={[el.pos[0], el.pos[1], el.pos[2]]}
              receiveShadow
              castShadow
            >
              <boxGeometry args={[el.size[0], el.size[1], el.size[2]]} />
              <meshStandardMaterial 
                color={el.isGrass || el.isWood || el.isCobblestone ? undefined : el.color} 
                map={el.isGrass ? grassTexture : (el.isWood ? woodTexture : (el.isCobblestone ? cobbleTexture : undefined))}
                roughness={el.isGrass ? 1.0 : (el.isWood ? 0.9 : 0.8)}
              />
            </mesh>
          ))}
          {/* Trees */}
          {(botsHitBack ? SMALL_MAP_TREES : MAP_TREES).map((tree, i) => (
            <group key={`tree-${i}`} position={[tree.pos[0], tree.pos[1], tree.pos[2]]}>
              {/* Trunk */}
              <mesh position={[0, 2.5, 0]} receiveShadow castShadow>
                <boxGeometry args={[1, 5, 1]} />
                <meshStandardMaterial color="#5c4033" />
              </mesh>
              {/* Leaves Level 1 */}
              <mesh position={[0, 6, 0]} receiveShadow castShadow>
                <boxGeometry args={[5, 3, 5]} />
                <meshStandardMaterial color="#2d5a27" />
              </mesh>
              {/* Leaves Level 2 */}
              <mesh position={[0, 8, 0]} receiveShadow castShadow>
                <boxGeometry args={[3, 2, 3]} />
                <meshStandardMaterial color="#2d5a27" />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {mode === GameMode.MAP && <PlayerShadow />}

      {theme !== "light" && (
        <ContactShadows
          position={[0, -1, 0]}
          opacity={0.4}
          scale={20}
          blur={2}
          far={4.5}
        />
      )}
    </group>
  );
}
