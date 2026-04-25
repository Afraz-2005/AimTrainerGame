import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, getDoc, collection, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { MultiplayerSession } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

export async function createSession(hostName: string): Promise<string> {
  const user = await signInAnonymously(auth);
  const sessionId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const sessionRef = doc(db, 'sessions', sessionId);
  
  const sessionData: Partial<MultiplayerSession> = {
    id: sessionId,
    hostId: user.user.uid,
    status: 'waiting',
    createdAt: Date.now(),
    players: {
      [user.user.uid]: {
        name: hostName,
        team: 'A',
        pos: { x: 0, y: 1, z: 40 },
        rot: { x: 0, y: 0, z: 0 },
        health: 100,
        kills: 0,
        deaths: 0,
        lastSeen: Date.now()
      }
    }
  };

  await setDoc(sessionRef, sessionData);
  return sessionId;
}

export async function joinSession(sessionId: string, playerName: string): Promise<boolean> {
  const user = await signInAnonymously(auth);
  const sessionRef = doc(db, 'sessions', sessionId);
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) return false;

  const data = sessionSnap.data() as MultiplayerSession;
  const playerCount = Object.keys(data.players).length;
  if (playerCount >= 4) return false;

  const team: 'A' | 'B' = playerCount < 2 ? 'A' : 'B';
  const spawnPos = team === 'A' ? { x: 0, y: 1, z: 40 } : { x: 0, y: 1, z: -40 };

  await updateDoc(sessionRef, {
    [`players.${user.user.uid}`]: {
      name: playerName,
      team,
      pos: spawnPos,
      rot: { x: 0, y: 0, z: 0 },
      health: 100,
      kills: 0,
      deaths: 0,
      lastSeen: Date.now()
    }
  });

  return true;
}

export function subscribeToSession(sessionId: string, callback: (session: MultiplayerSession) => void) {
  return onSnapshot(doc(db, 'sessions', sessionId), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as MultiplayerSession);
    }
  });
}

export async function updatePlayerState(sessionId: string, uid: string, pos: any, rot: any, health: number) {
  const sessionRef = doc(db, 'sessions', sessionId);
  await updateDoc(sessionRef, {
    [`players.${uid}.pos`]: pos,
    [`players.${uid}.rot`]: rot,
    [`players.${uid}.health`]: health,
    [`players.${uid}.lastSeen`]: Date.now()
  });
}
