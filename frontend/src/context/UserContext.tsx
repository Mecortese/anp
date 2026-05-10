import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface UserProfile {
  id: string;
  signalsTaken: number;
  signalsWon: number;
  signalsLost: number;
  totalPnl1x: number;
  totalPnl5x: number;
  preferredLeverage: 1 | 2 | 3 | 5;
  createdAt: number;
}

interface UserContextValue {
  user: UserProfile;
  recordSignal: (signalId: string) => void;
  updateSignalResult: (signalId: string, won: boolean, pnlPct1x: number) => void;
  resetStats: () => void;
}

const STORAGE_KEY = 'cs_user_v2';
const API = 'https://crypto-signals-idfn.onrender.com';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

const defaultUser: UserProfile = {
  id: '',
  signalsTaken: 0,
  signalsWon: 0,
  signalsLost: 0,
  totalPnl1x: 0,
  totalPnl5x: 0,
  preferredLeverage: 1,
  createdAt: Date.now()
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile>(defaultUser);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UserProfile;
        setUser(parsed);
      } catch {
        initUser();
      }
    } else {
      initUser();
    }
  }, []);

  function initUser() {
    const newUser: UserProfile = { ...defaultUser, id: generateId(), createdAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    setUser(newUser);
  }

  function persist(u: UserProfile) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  }

  const recordSignal = useCallback((signalId: string) => {
    const u = { ...user, signalsTaken: user.signalsTaken + 1 };
    persist(u);
    fetch(`${API}/api/user/signals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oderId: signalId,
        userId: user.id,
        action: 'taken',
        timestamp: Date.now()
      })
    }).catch(() => {});
  }, [user]);

  const updateSignalResult = useCallback((signalId: string, won: boolean, pnlPct1x: number) => {
    const u = {
      ...user,
      signalsWon: won ? user.signalsWon + 1 : user.signalsWon,
      signalsLost: won ? user.signalsLost : user.signalsLost + 1,
      totalPnl1x: user.totalPnl1x + pnlPct1x,
      totalPnl5x: user.totalPnl5x + pnlPct1x * 5
    };
    persist(u);
    fetch(`${API}/api/user/signals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oderId: signalId,
        userId: user.id,
        action: won ? 'won' : 'lost',
        pnlPct1x,
        timestamp: Date.now()
      })
    }).catch(() => {});
  }, [user]);

  const resetStats = useCallback(() => {
    const u: UserProfile = {
      ...user,
      signalsTaken: 0,
      signalsWon: 0,
      signalsLost: 0,
      totalPnl1x: 0,
      totalPnl5x: 0
    };
    persist(u);
  }, [user]);

  return (
    <UserContext.Provider value={{ user, recordSignal, updateSignalResult, resetStats }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
