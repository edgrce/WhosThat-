
export interface PlayerData {
  id: string;
  username: string;
  role: string;
  eliminated?: boolean;
  isMrWhiteCorrect?: boolean;
}

/**
 * Menghitung skor berdasarkan role dan hasil akhir pertandingan.
 * @param players daftar pemain
 * @param winner pemenang round
 */
export function calculateScores(players: PlayerData[], winner: string): Record<string, { roundScore: number }> {
  const scores: Record<string, { roundScore: number }> = {};

  for (const player of players) {
    const role = player.role?.toLowerCase?.();
    const isEliminated = player.eliminated ?? false;
    const username = player.username;

    let roundScore = 0;

    // Kondisi menang
    if (role === "mrwhite" && winner === "mrwhite" && player.isMrWhiteCorrect) {
      roundScore = 400;
    } else if (role === winner && !isEliminated) {
      if (role === "civilian") roundScore = 200;
      else if (role === "undercover") roundScore = 300;
    }

    // Kondisi kalah → score tetap 0

    scores[username] = { roundScore };
  }

  return scores;
}
