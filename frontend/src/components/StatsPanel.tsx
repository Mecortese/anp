interface Props {
  stats: {
    total: number;
    won: number;
    lost: number;
    winRate: number;
    totalPnl1x: number;
    totalPnl5x: number;
  };
  leverage?: 1 | 2 | 3 | 5;
  userStats?: {
    signalsTaken: number;
    signalsWon: number;
    signalsLost: number;
    totalPnl1x: number;
    totalPnl5x: number;
  };
}

export function StatsPanel({ stats, userStats }: Props) {
  return null;
}
