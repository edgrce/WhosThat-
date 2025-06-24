import { Player, ScoreResult } from "../types/player";

/**
 * Menghitung skor berdasarkan role dan hasil akhir pertandingan.
 * @param players daftar pemain
 * @param winner pemenang round
 */
export function calculateScores(players: Player[], winner: string): Record<string, ScoreResult> {
  const scores: Record<string, ScoreResult> = {};

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

    scores[username] = { roundScore, totalScore: roundScore };
  }

  return scores;
}