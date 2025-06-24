// ✅ Final correct type
export interface PlayerData {
  id: string;
  username: string;
  role: string;
  eliminated?: boolean;
  isMrWhiteCorrect?: boolean;
  totalScore?: number; // <-- important!
}

export interface ScoreData {
  roundScore: number;
}

export function calculateScores(players: PlayerData[], winner: string): Record<string, ScoreData> {
  const scores: Record<string, ScoreData> = {};

  for (const p of players) {
    let roundScore = 0;

    if (!p.eliminated && p.role === winner) {
      roundScore = 100;
      if (p.role === "undercover") roundScore += 50;
      if (p.role === "mrwhite" && p.isMrWhiteCorrect) roundScore += 100;
    }

    if (p.eliminated && p.role !== winner) {
      roundScore -= 30;
    }

    scores[p.id] = {
      roundScore: Math.max(0, roundScore)
    };
  }

  return scores;
}
