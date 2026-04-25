import { useEffect, useState, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Sky, Stars, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import { GameSettings, GameStats, GameMode, TargetData } from '../types';
import { playSound } from '../lib/audio';

// Collision Boxes for MAP mode
const MAP_COLLISION_BOXES = [
  // Surround walls
  new THREE.Box3(new THREE.Vector3(-60, -1, -60), new THREE.Vector3(60, 40, -59)), // Back
  new THREE.Box3(new THREE.Vector3(-61, -1, -60), new THREE.Vector3(-60, 40, 60)), // Left
  new THREE.Box3(new THREE.Vector3(60, -1, -60), new THREE.Vector3(61, 40, 60)), // Right
  new THREE.Box3(new THREE.Vector3(-60, -1, 59), new THREE.Vector3(60, 40, 60)), // Front
  
  // Buildings/Obstacles
  new THREE.Box3(new THREE.Vector3(-20, -1, -25), new THREE.Vector3(-10, 3, -15)), 
  new THREE.Box3(new THREE.Vector3(10, -1, -25), new THREE.Vector3(20, 3, -15)),  
  new THREE.Box3(new THREE.Vector3(-11, -1, -34), new THREE.Vector3(-5, 7, -30)),  
  new THREE.Box3(new THREE.Vector3(5, -1, -34), new THREE.Vector3(11, 7, -30)),   
  new THREE.Box3(new THREE.Vector3(-2, -1, -17), new THREE.Vector3(2, 1, -13)),    
  new THREE.Box3(new THREE.Vector3(-21, -1, -36), new THREE.Vector3(-19, 9, -34)), 
  new THREE.Box3(new THREE.Vector3(19, -1, -36), new THREE.Vector3(21, 9, -34)),  
];

interface GameProps {
  settings: GameSettings;
  onEnd: (stats: GameStats) => void;
  onUpdateStats: (stats: GameStats) => void;
  isPaused: boolean;
}

function CameraSync({ countdown }: { countdown: number | null }) {
  const { camera } = useThree();
  const resetDone = useRef(false);

  useEffect(() => {
    if (countdown === 3 && !resetDone.current) {
      // Force looking straight ahead at the target zone
      camera.rotation.set(0, 0, 0);
      camera.position.set(0, 2, 0);
      resetDone.current = true;
    } else if (countdown === null) {
      resetDone.current = false;
    }
  }, [countdown, camera]);

  return null;
}

export default function Game({ settings, onEnd, onUpdateStats, isPaused }: GameProps) {
  const [targets, setTargets] = useState<TargetData[]>([]);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [isScoped, setIsScoped] = useState(false);
  const playerVel = useRef(new THREE.Vector3());
  const keys = useRef<{ [key: string]: boolean }>({});

  const statsRef = useRef<GameStats>({
    score: 0,
    hits: 0,
    misses: 0,
    accuracy: 100,
    timeRemaining: settings.mode === GameMode.MAP ? 0 : 60, // Count UP for MAP mode time tracking
    health: 100,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    const handleMouseDown = (e: MouseEvent) => {
      if (countdown !== null || isPaused) return;
      if (e.button === 2 && settings.popBots.weapon === 'AWP') {
        setIsScoped(prev => !prev);
        playSound('click');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [settings.popBots.weapon, isPaused, countdown]);

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
        setTimeout(() => {
          document.body.requestPointerLock?.();
        }, 100);
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

      if (settings.mode === GameMode.MAP) {
        statsRef.current.timeRemaining += 1;
        if (statsRef.current.hits >= settings.map.botsToKill) {
          if (timerRef.current) clearInterval(timerRef.current);
          onEnd({ ...statsRef.current });
        } else {
          onUpdateStats({ ...statsRef.current });
        }
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

  const spawnBatch = () => {
    let count = 3;
    if (settings.mode === GameMode.SIXSHOT) count = 6;
    if (settings.mode === GameMode.POP_BOTS) {
      count = 1;
    }
    if (settings.mode === GameMode.MAP) count = 4;
    if (settings.mode === GameMode.REACTION) count = 0; // REACTION starts with 0 targets

    const newTargets: TargetData[] = [];
    const usedIndices = new Set<number>();
    
    for (let i = 0; i < count; i++) {
        newTargets.push(generateTarget(settings.mode, usedIndices));
    }
    setTargets(newTargets);
  };

  const generateTarget = (mode: GameMode, usedIndices?: Set<number>): TargetData => {
    const rangeX = mode === GameMode.GRIDSHOT ? 12 : (mode === GameMode.POP_BOTS ? 40 : 18);
    const rangeY = 6;
    const size = mode === GameMode.SIXSHOT ? 0.3 : (settings.theme === 'retro' ? 1.4 : 1.2);
    
    let position: [number, number, number];
    let spawnIndex: number | undefined;

    if (mode === GameMode.POP_BOTS) {
        position = [
            (Math.random() - 0.5) * rangeX,
            0.5, 
            -8 - Math.random() * 20, 
        ];
    } else if (mode === GameMode.MAP) {
        const locations: [number, number, number][] = [
          [-40, 0.2, -40], [40, 0.2, -40],   // Deep Corners Ground
          [-40, 0.2, 40], [40, 0.2, 40],     // Front Corners Ground
          [-15, 4.2, -20], [15, 4.2, -20],   // Main Platforms (Y_s=3 + 1.2)
          [0, 0.2, -35], [0, 0.2, 35],       // North/South Ground
          [-45, 0.2, 0], [45, 0.2, 0],       // West/East Ground
          [-8, 8.2, -32], [8, 8.2, -32],     // Back Pillars (Y_s=7 + 1.2)
          [-20, 0.2, -10], [20, 0.2, -10],   // Forward Ground
          [0, 2.2, -15],                     // Center Cover Top (Y_s=1 + 1.2)
          [-20, 12.2, -35], [20, 12.2, -35]  // Spires (Y_s=11 + 1.2)
        ];
        
        let index = Math.floor(Math.random() * locations.length);
        if (usedIndices) {
            let attempts = 0;
            while (usedIndices.has(index) && attempts < 50) {
                index = Math.floor(Math.random() * locations.length);
                attempts++;
            }
            usedIndices.add(index);
        }
        position = locations[index];
        spawnIndex = index;

        // Final collision check safety
        const isSpawningInWall = (pos: [number, number, number]) => {
          const botBox = new THREE.Box3().setFromCenterAndSize(
              new THREE.Vector3(pos[0], pos[1] + 1.2, pos[2]), // Head is at 2.4 height, center at 1.2
              new THREE.Vector3(1.2, 2.4, 1.2) // Padding for walls
          );
          return MAP_COLLISION_BOXES.some(box => botBox.intersectsBox(box));
        };

        if (isSpawningInWall(position)) {
            let safetyAttempts = 0;
            while (isSpawningInWall(position) && safetyAttempts < 50) {
              position[0] = (Math.random() - 0.5) * 80;
              position[2] = (Math.random() - 0.5) * 80;
              safetyAttempts++;
            }
        }
    } else if (mode === GameMode.REACTION) {
        position = [0, 2, -15]; // Fixed center position for reaction test
    } else {
        position = [
            (Math.random() - 0.5) * rangeX,
            1.5 + (Math.random()) * rangeY,
            -15,
        ];
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      position,
      size,
      spawnIndex,
      health: 100
    };
  };

  // Bot removal timer for POP_BOTS
  useEffect(() => {
    if (settings.mode !== GameMode.POP_BOTS || isPaused || countdown !== null) return;

    const botLifeTime = settings.popBots.difficulty === 'HARD' ? 700 : (settings.popBots.difficulty === 'MEDIUM' ? 1100 : 1500);
    const maxBots = 1;
    
    const intervals = targets.map(t => {
        return setTimeout(() => {
            setTargets(prev => {
                const filtered = prev.filter(target => target.id !== t.id);
                const usedIndices = new Set(filtered.map(t => t.spawnIndex).filter((idx): idx is number => idx !== undefined));
                if (filtered.length < maxBots) {
                    return [...filtered, generateTarget(GameMode.POP_BOTS, usedIndices)];
                }
                return filtered;
            });
        }, botLifeTime);
    });

    return () => intervals.forEach(i => clearTimeout(i));
  }, [targets, settings.mode, isPaused, countdown]);

  const handleHit = (id: string, isHeadshot: boolean = false) => {
    if (isPaused || countdown !== null) return;

    const weapon = settings.popBots.weapon;
    let damage = 100;
    
    if (!isHeadshot) {
      if (weapon === 'AK47') damage = 35;
      else if (weapon === 'PISTOL') damage = 26;
      else if (weapon === 'AWP') damage = 100;
      
      // GRIDSHOT and SIXSHOT should always be one-shot
      if (settings.mode === GameMode.GRIDSHOT || settings.mode === GameMode.SIXSHOT) {
        damage = 100;
      }
    }

    statsRef.current.hits += 1;
    updateAccuracy();

    setTargets(prev => {
        const target = prev.find(t => t.id === id);
        if (!target) return prev;

        const newHealth = target.health - damage;
        
        if (newHealth <= 0) {
            let baseScore = settings.mode === GameMode.SIXSHOT ? 500 : 100;
            if (settings.mode === GameMode.MAP || settings.mode === GameMode.POP_BOTS) {
              baseScore = isHeadshot ? 1000 : 500;
            }
            statsRef.current.score += baseScore;
            
            const remaining = prev.filter(t => t.id !== id);
            const usedIndices = new Set(remaining.map(t => t.spawnIndex).filter((idx): idx is number => idx !== undefined));
            
            // Success burst every 50 kills
            if (statsRef.current.hits % 50 === 0 && settings.mode !== GameMode.REACTION) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: [settings.themeColor, '#ffffff']
                });
            }

            return [...remaining, generateTarget(settings.mode, usedIndices)];
        } else {
            return prev.map(t => t.id === id ? { ...t, health: newHealth } : t);
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

  const handleDamage = useCallback((amount: number) => {
    if (isPaused || countdown !== null || settings.mode !== GameMode.MAP || !settings.map.botsHitBack) return;
    
    statsRef.current.health = Math.max(0, (statsRef.current.health || 100) - amount);
    onUpdateStats({ ...statsRef.current });

    if (statsRef.current.health <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      onEnd({ ...statsRef.current });
    }
  }, [isPaused, countdown, settings.mode, settings.map.botsHitBack, onEnd, onUpdateStats]);

  const updateAccuracy = () => {
    const total = statsRef.current.hits + statsRef.current.misses;
    statsRef.current.accuracy = total > 0 ? (statsRef.current.hits / total) * 100 : 0;
  };

  if (settings.mode === GameMode.REACTION) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8 bg-zinc-950">
        <ReactionTest 
          isPaused={isPaused} 
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
      </div>
    );
  }

  return (
    <div className="w-full h-full cursor-crosshair">
      <Canvas shadows camera={{ fov: isScoped ? 15 : settings.fov, position: [0, 2, 0] }}>
        <CameraSync countdown={countdown} />
        {settings.mode === GameMode.MAP ? (
            <>
                <Sky sunPosition={[100, 20, 100]} />
                <ambientLight intensity={1.2} />
                <directionalLight position={[50, 100, 50]} intensity={2.5} castShadow />
            </>
        ) : (
            <>
                {settings.theme === 'dark' && <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />}
                {settings.theme === 'retro' && <Stars radius={50} depth={20} count={500} factor={10} saturation={1} fade speed={3} />}
                <ambientLight intensity={settings.theme === 'retro' ? 0.8 : (settings.theme === 'light' ? 1.0 : 0.4)} />
                <directionalLight
                    position={[10, 10, 5]}
                    intensity={settings.theme === 'light' ? 1.5 : 1}
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
          isScoped={isScoped}
          weapon={settings.popBots.weapon}
        />

        <Environment 
            theme={settings.theme} 
            themeColor={settings.themeColor} 
            mode={settings.mode}
        />
        {(settings.mode === GameMode.POP_BOTS || settings.mode === GameMode.MAP) && (
            <Weapon 
                type={settings.popBots.weapon} 
                themeColor={settings.themeColor} 
                isPaused={isPaused || countdown !== null}
                isScoped={isScoped}
            />
        )}
        {!isPaused && <PointerLockControls pointerSpeed={isScoped ? settings.adsSensitivity : settings.sensitivity} />}
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
                style={{ backgroundColor: 'transparent' }}
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
            style={{ color: settings.themeColor, textShadow: `0 0 40px ${settings.themeColor}40` }}
          >
            {countdown}
          </motion.div>
        </div>
      )}

    </div>
  );
}

function ReactionTest({ isPaused, onResult, onEarlyClick }: { isPaused: boolean, onResult: (time: number) => void, onEarlyClick: () => void }) {
    const [state, setState] = useState<'WAITING' | 'READY' | 'CLICKED' | 'EARLY'>('WAITING');
    const [time, setTime] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimestamp = useRef<number>(0);

    const startTest = useCallback(() => {
        setState('WAITING');
        const delay = 1500 + Math.random() * 3500;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setState('READY');
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

        if (state === 'WAITING') {
            if (timerRef.current) clearTimeout(timerRef.current);
            setState('EARLY');
            onEarlyClick();
            playSound('click');
        } else if (state === 'READY') {
            const reactionTime = Date.now() - startTimestamp.current;
            setTime(reactionTime);
            setState('CLICKED');
            onResult(reactionTime);
            playSound('hit');
        } else if (state === 'CLICKED' || state === 'EARLY') {
            startTest();
        }
    };

    return (
        <div 
            onClick={handleBoxClick}
            className={`w-full max-w-2xl aspect-video flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 border-4 ${
                state === 'WAITING' ? 'bg-red-950 border-red-500' : 
                state === 'READY' ? 'bg-lime-950 border-lime-500' : 
                state === 'EARLY' ? 'bg-zinc-900 border-orange-500' :
                'bg-zinc-900 border-zinc-700'
            }`}
        >
            <motion.div
                key={state}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
            >
                {state === 'WAITING' && (
                    <>
                        <h2 className="text-4xl font-black italic text-red-500 tracking-tighter mb-2 uppercase">Protocol: Wait</h2>
                        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Wait for visual trigger signal</p>
                    </>
                )}
                {state === 'READY' && (
                    <>
                        <h2 className="text-6xl font-black italic text-lime-400 tracking-tighter mb-2 uppercase">Trigger Active</h2>
                        <p className="text-lime-200/50 font-mono text-sm font-bold uppercase tracking-widest animate-pulse">Engage Target Now</p>
                    </>
                )}
                {state === 'CLICKED' && (
                    <>
                        <h2 className="text-5xl font-black italic text-white tracking-tighter mb-2 uppercase">Recorded: {time}ms</h2>
                        <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest">Click to initiate next calibrate cycle</p>
                    </>
                )}
                {state === 'EARLY' && (
                    <>
                        <h2 className="text-4xl font-black italic text-orange-500 tracking-tighter mb-2 uppercase">Jump Correction</h2>
                        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Early engagement detected. Resetting...</p>
                        <p className="text-zinc-600 font-mono text-[10px] mt-4 uppercase">Click to restart calibration</p>
                    </>
                )}
            </motion.div>
        </div>
    );
}

function PhysicsWorld({ targets, onHit, onMiss, onDamage, isPaused, countdown, theme, themeColor, mode, botColor, keys, playerVel, botsHitBack, isScoped, weapon }: { 
    targets: TargetData[], 
    onHit: (id: string, isHeadshot: boolean) => void, 
    onMiss: () => void,
    onDamage: (amount: number) => void,
    isPaused: boolean,
    countdown: number | null,
    theme: string,
    themeColor: string,
    mode: GameMode,
    botColor: string,
    keys: React.MutableRefObject<{ [key: string]: boolean }>,
    playerVel: React.MutableRefObject<THREE.Vector3>,
    botsHitBack: boolean,
    isScoped: boolean,
    weapon: string
}) {
  const { camera, raycaster, scene } = useThree();

  const targetFov = useRef(75);

  useFrame((state, delta) => {
    // Smooth FOV animation
    const pCamera = camera as THREE.PerspectiveCamera;
    if (pCamera.isPerspectiveCamera) {
      targetFov.current = isScoped ? 15 : 75;
      if (Math.abs(pCamera.fov - targetFov.current) > 0.1) {
        pCamera.fov = THREE.MathUtils.lerp(pCamera.fov, targetFov.current, delta * 15);
        pCamera.updateProjectionMatrix();
      }
    }

    if (isPaused || countdown !== null || (mode !== GameMode.POP_BOTS && mode !== GameMode.MAP)) return;

    const moveSpeed = mode === GameMode.MAP ? 12 : 8;
    const accel = 15;

    const input = new THREE.Vector3();
    if (keys.current['KeyW']) input.z -= 1;
    if (keys.current['KeyS']) input.z += 1;
    if (keys.current['KeyA']) input.x -= 1;
    if (keys.current['KeyD']) input.x += 1;
    
    if (input.length() > 0) {
      input.normalize();
      
      // Calculate movement based on camera yaw
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      forward.y = 0;
      forward.normalize();
      
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      
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
        const horizontalVel = new THREE.Vector3(playerVel.current.x, 0, playerVel.current.z);
        horizontalVel.lerp(targetVel, delta * accel);
        playerVel.current.x = horizontalVel.x;
        playerVel.current.z = horizontalVel.z;
    } else {
        playerVel.current.x = THREE.MathUtils.lerp(playerVel.current.x, 0, delta * 15);
        playerVel.current.z = THREE.MathUtils.lerp(playerVel.current.z, 0, delta * 15);
    }

    // Gravity and Jumping
    if (mode === GameMode.MAP) {
      const isOnGround = camera.position.y <= 2.05;
      if (keys.current['Space'] && isOnGround) {
        playerVel.current.y = jumpForce;
      }
      
      playerVel.current.y += gravity * delta;
      const nextY = camera.position.y + playerVel.current.y * delta;
      
      // Vertical Collision Check
      const playerBoxY = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(camera.position.x, nextY - 0.9, camera.position.z), // Bottom-weighted box
        new THREE.Vector3(playerRadius * 2, 1.8, playerRadius * 2)
      );
      
      let collidesY = false;
      for (const box of MAP_COLLISION_BOXES) if (playerBoxY.intersectsBox(box)) collidesY = true;
      
      if (!collidesY) {
          camera.position.y = nextY;
      } else {
          playerVel.current.y = 0;
      }
      
      // Ground check (as a hard fallback)
      if (camera.position.y < 2) {
        camera.position.y = 2;
        playerVel.current.y = 0;
      }
    }

    // Temp next position
    const nextX = camera.position.x + playerVel.current.x * delta;
    const nextZ = camera.position.z + playerVel.current.z * delta;

    // Movement collision with margin
    const playerBoxX = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(nextX, camera.position.y, camera.position.z),
      new THREE.Vector3(playerRadius * 2, 1.8, playerRadius * 2)
    );
    
    let collidesX = false;
    if (mode === GameMode.MAP) {
      for (const box of MAP_COLLISION_BOXES) if (playerBoxX.intersectsBox(box)) collidesX = true;
    }
    if (!collidesX) camera.position.x = nextX; else playerVel.current.x = 0;

    const playerBoxZ = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(camera.position.x, camera.position.y, nextZ),
      new THREE.Vector3(playerRadius * 2, 1.8, playerRadius * 2)
    );
    
    let collidesZ = false;
    if (mode === GameMode.MAP) {
      for (const box of MAP_COLLISION_BOXES) if (playerBoxZ.intersectsBox(box)) collidesZ = true;
    }
    if (!collidesZ) camera.position.z = nextZ; else playerVel.current.z = 0;
    
    // Hard Bounds - SHRUNK for better density
    const limit = mode === GameMode.MAP ? 55 : 20;
    const limitZ = mode === GameMode.MAP ? 55 : 20;
    camera.position.x = Math.max(-limit, Math.min(limit, camera.position.x));
    camera.position.z = Math.max(-limitZ, Math.min(limitZ, camera.position.z));
  });

  const handleClick = useCallback((e: MouseEvent) => {
    if (!document.pointerLockElement || isPaused || countdown !== null) return;

    // Play gun sound
    playSound('fire');

    // Center raycasting
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    const targetHit = intersects.find(i => i.object.userData?.id);
    
    if (targetHit) {
      const targetId = targetHit.object.userData.id;
      const isHeadshot = targetHit.object.name === 'bot-head';
      if (isHeadshot) playSound('headshot');
      else playSound('hit');
      onHit(targetId, isHeadshot);
    } else {
      onMiss();
    }
  }, [camera, raycaster, scene, onHit, onMiss, isPaused, countdown]);

  useEffect(() => {
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [handleClick]);

  return (
    <>
      {targets.map(t => (
        (mode === GameMode.POP_BOTS || mode === GameMode.MAP)
            ? <PlayerBot 
                key={t.id} 
                data={t} 
                botColor={botColor} 
                theme={theme} 
                mode={mode}
                onShootPlayer={onDamage}
                isPaused={isPaused || countdown !== null}
                botsHitBack={botsHitBack}
              /> 
            : <VoxelTarget key={t.id} data={t} theme={theme} themeColor={themeColor} />
      ))}
    </>
  );
}

function Weapon({ type, themeColor, isPaused, isScoped }: { type: string, themeColor: string, isPaused: boolean, isScoped: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame((state) => {
    if (groupRef.current && !isPaused) {
      if (isScoped) {
        groupRef.current.visible = false;
        return;
      }
      groupRef.current.visible = true;

      // Bobbing
      const time = state.clock.elapsedTime;
      groupRef.current.position.y = -0.5 + Math.sin(time * 3) * 0.005;
      groupRef.current.position.x = 0.5 + Math.cos(time * 1.5) * 0.005;
      groupRef.current.rotation.z = Math.sin(time * 2) * 0.01;
      
      // Follow camera
      groupRef.current.position.copy(camera.position);
      groupRef.current.quaternion.copy(camera.quaternion);
      
      // Offset from camera center
      const offset = new THREE.Vector3(0.4, -0.4, -0.8);
      offset.applyQuaternion(camera.quaternion);
      groupRef.current.position.add(offset);
    }
  });

  return (
    <group ref={groupRef}>
      {type === 'PISTOL' && (
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
      {type === 'AK47' && (
        <group rotation={[0, 0, 0]}>
          {/* Receiver */}
          <mesh position={[0, 0, -0.1]}>
            <boxGeometry args={[0.06, 0.12, 0.5]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          {/* Stock */}
          <mesh position={[0, -0.05, 0.35]} rotation={[0.1, 0, 0]}>
            <boxGeometry args={[0.05, 0.18, 0.4]} />
            <meshStandardMaterial color="#4d3319" />
          </mesh>
          {/* Handguard */}
          <mesh position={[0, -0.04, -0.45]}>
            <boxGeometry args={[0.08, 0.1, 0.3]} />
            <meshStandardMaterial color="#4d3319" />
          </mesh>
          {/* Grip */}
          <mesh position={[0, -0.18, 0.05]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.06, 0.22, 0.1]} />
            <meshStandardMaterial color="#4d3319" />
          </mesh>
          {/* Mag */}
          <mesh position={[0, -0.28, -0.15]} rotation={[-0.4, 0, 0]}>
            <boxGeometry args={[0.05, 0.3, 0.12]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          {/* Barrel */}
          <mesh position={[0, 0.03, -0.8]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
      )}
      {type === 'AWP' && (
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
      {/* Muzzle flash glow center */}
      <mesh position={[0, 0.05, -0.6]} visible={false}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={themeColor} emissive={themeColor} emissiveIntensity={5} />
      </mesh>
    </group>
  );
}

function PlayerBot({ data, botColor, theme, mode, onShootPlayer, isPaused, botsHitBack }: { 
    data: TargetData, 
    botColor: string, 
    theme: string, 
    mode?: GameMode,
    onShootPlayer?: (amount: number) => void,
    isPaused?: boolean,
    botsHitBack?: boolean
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

  useFrame((state, delta) => {
    if (isPaused || !meshRef.current) return;

    if (!initialized.current) {
      meshRef.current.position.set(...data.position);
      initialized.current = true;
    }

    // Movement bobbing (vertical oscillation)
    const bob = Math.sin(state.clock.elapsedTime * 6) * 0.03;
    
    if (mode === GameMode.MAP) {
      // Smoothly rotate to look at player - using shared persistent object
      lookAtRef.current.position.set(currentPosRef.current.x, currentPosRef.current.y, currentPosRef.current.z);
      lookAtRef.current.lookAt(camera.position.x, currentPosRef.current.y, camera.position.z);
      
      meshRef.current.quaternion.slerp(lookAtRef.current.quaternion, delta * 3);

      const nextPos = currentPosRef.current.clone();
      const dist = currentPosRef.current.distanceTo(camera.position);
      
      // Intentional Movement Pattern
      if (dist > 18) {
          const dir = new THREE.Vector3().subVectors(camera.position, currentPosRef.current).setY(0).normalize();
          nextPos.addScaledVector(dir, delta * 4);
      }
      
      // Smooth Strafe Logic
      const strafeSpeed = 1.5;
      const strafeWidth = 4;
      const strafeDir = new THREE.Vector3(1, 0, 0).applyQuaternion(meshRef.current.quaternion);
      const oscillation = Math.sin(state.clock.elapsedTime * strafeSpeed + strafeOffset.current);
      nextPos.addScaledVector(strafeDir, oscillation * delta * strafeWidth);

      // Simple Gravity and Floor Clamping for Bots
      const gravity = -30;
      botVel.current.y += gravity * delta;
      nextPos.y += botVel.current.y * delta;

      // Map-wide "Ground" is at Y=0.2 (since floor is -1 and half-height for bot torso is 1.2)
      if (nextPos.y < 0.2) {
        nextPos.y = 0.2;
        botVel.current.y = 0;
      }

      // Map Bounds for Bots
      nextPos.x = Math.max(-52, Math.min(52, nextPos.x));
      nextPos.z = Math.max(-52, Math.min(52, nextPos.z));

      // Bot-specific collision detection
      const checkBotCollision = (pos: THREE.Vector3) => {
        const botBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(pos.x, pos.y + 1.2, pos.z), // Center at waist level
            new THREE.Vector3(1.0, 2.4, 1.0) 
        );
        for (const box of MAP_COLLISION_BOXES) {
            if (botBox.intersectsBox(box)) return true;
        }
        return false;
      };

      // Apply movement with collision checks
      const xOnly = currentPosRef.current.clone();
      xOnly.x = nextPos.x;
      if (!checkBotCollision(xOnly)) currentPosRef.current.x = nextPos.x;

      const zOnly = currentPosRef.current.clone();
      zOnly.z = nextPos.z;
      if (!checkBotCollision(zOnly)) currentPosRef.current.z = nextPos.z;

      currentPosRef.current.y = nextPos.y;
      
      meshRef.current.position.set(currentPosRef.current.x, currentPosRef.current.y + bob, currentPosRef.current.z);

      // Shoot player
      if (botsHitBack && Date.now() > nextShootTime.current) {
        if (dist < 50) {
          const isBody = Math.random() > 0.3;
          onShootPlayer?.(isBody ? 50 : 100);
          nextShootTime.current = Date.now() + 1500 + Math.random() * 2000;
        }
      }
    }
  });

  return (
    <group 
      ref={meshRef} 
    >
      {/* Torso */}
      <mesh name="target" userData={{ id: data.id }} castShadow>
        <boxGeometry args={[0.7, 2.4, 0.3]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 1.5, 0]} name="bot-head" userData={{ id: data.id }} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color={botColor} />
      </mesh>
      
      {/* Arms */}
      <mesh position={[0.45, 0.6, 0]} castShadow>
        <boxGeometry args={[0.2, 1.5, 0.2]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[-0.45, 0.6, 0]} castShadow>
        <boxGeometry args={[0.2, 1.5, 0.2]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}

function VoxelTarget({ data, theme, themeColor }: { data: TargetData, theme: string, themeColor: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.z += 0.005;
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 2) * 0.002;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={new THREE.Vector3(...data.position)}
      name="target"
      userData={{ id: data.id }}
      castShadow={theme !== 'light'}
    >
      <boxGeometry args={[data.size, data.size, data.size]} />
      
      <meshStandardMaterial 
        color={themeColor} 
        emissive={themeColor} 
        emissiveIntensity={theme === 'retro' ? 2 : 0.5}
      />
      {/* Voxel edges */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(data.size, data.size, data.size)]} />
        <lineBasicMaterial color={theme === 'light' ? "#000000" : "#ffffff"} linewidth={theme === 'retro' ? 3 : 1} />
      </lineSegments>
    </mesh>
  );
}

function Environment({ theme, themeColor, mode }: { theme: string, themeColor: string, mode: GameMode }) {
  return (
    <group>
      {/* Dynamic Background for MAP mode */}
      {mode === GameMode.MAP ? (
        <>
            <Sky sunPosition={[100, 20, 100]} inclination={0.1} azimuth={0.25} />
            <ambientLight intensity={1.5} />
            <directionalLight position={[100, 100, 100]} intensity={2} castShadow />
        </>
      ) : (
        <>
            <color attach="background" args={[theme === 'light' ? '#ffffff' : (theme === 'retro' ? '#1a1a2e' : '#000000')]} />
            <ambientLight intensity={theme === 'retro' ? 0.6 : 0.4} />
        </>
      )}

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={mode === GameMode.MAP ? '#d4d4d8' : (theme === 'light' ? '#eeeeee' : (theme === 'retro' ? '#0f0f1b' : '#050505'))} />
      </mesh>
      
      {/* Grid Floor - Only for trainers, not for MAP mode */}
      {mode !== GameMode.MAP && (
          <gridHelper args={[200, 100, themeColor, theme === 'light' ? "#dddddd" : "#171717"]} position={[0, -0.99, 0]} />
      )}

      {/* Arena Walls - SHRUNK */}
      {mode === GameMode.MAP && (
        <group>
          <mesh position={[0, 10, -60]}>
            <boxGeometry args={[120, 40, 1]} />
            <meshStandardMaterial color="#e4e4e7" />
          </mesh>
          <mesh position={[0, 10, 60]}>
            <boxGeometry args={[120, 40, 1]} />
            <meshStandardMaterial color="#e4e4e7" />
          </mesh>
          <mesh position={[-60, 10, 0]} rotation={[0, Math.PI/2, 0]}>
            <boxGeometry args={[120, 40, 1]} />
            <meshStandardMaterial color="#e4e4e7" />
          </mesh>
          <mesh position={[60, 10, 0]} rotation={[0, Math.PI/2, 0]}>
            <boxGeometry args={[120, 40, 1]} />
            <meshStandardMaterial color="#e4e4e7" />
          </mesh>
        </group>
      )}

      {/* Voxel Obstacles for MAP mode */}
      {mode === GameMode.MAP && (
        <group>
          {/* Main Elevated Platforms */}
          <mesh position={[-15, 1, -20]} receiveShadow castShadow>
            <boxGeometry args={[10, 4, 10]} />
            <meshStandardMaterial color="#a1a1aa" />
          </mesh>
          <mesh position={[15, 1, -20]} receiveShadow castShadow>
            <boxGeometry args={[10, 4, 10]} />
            <meshStandardMaterial color="#a1a1aa" />
          </mesh>

          {/* Pillars */}
          <mesh position={[-8, 3, -32]} receiveShadow castShadow>
            <boxGeometry args={[6, 8, 4]} />
            <meshStandardMaterial color="#d1d5db" />
          </mesh>
          <mesh position={[8, 3, -32]} receiveShadow castShadow>
            <boxGeometry args={[6, 8, 4]} />
            <meshStandardMaterial color="#d1d5db" />
          </mesh>

          {/* Cover */}
          <mesh position={[0, 0, -15]} receiveShadow castShadow>
            <boxGeometry args={[4, 2, 4]} />
            <meshStandardMaterial color="#71717a" />
          </mesh>

          {/* Tall Spires */}
          <mesh position={[-20, 5, -35]} castShadow>
             <boxGeometry args={[2, 12, 2]} />
             <meshStandardMaterial color="#d4d4d8" />
          </mesh>
          <mesh position={[20, 5, -35]} castShadow>
             <boxGeometry args={[2, 12, 2]} />
             <meshStandardMaterial color="#d4d4d8" />
          </mesh>

          {/* Random Crates for cover */}
          <mesh position={[-10, -0.5, -5]} receiveShadow castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#ea580c" />
          </mesh>
          <mesh position={[12, -0.5, -8]} receiveShadow castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#ea580c" />
          </mesh>
          <mesh position={[2, -0.5, -25]} receiveShadow castShadow>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshStandardMaterial color="#d97706" />
          </mesh>
        </group>
      )}

      {theme !== 'light' && (
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
