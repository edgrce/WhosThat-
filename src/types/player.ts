export interface Player {
  id: string;
  username: string; 
  role: string;
  eliminated?: boolean;
  isMrWhiteCorrect?: boolean;
}

export type Winner = "civilian" | "undercover" | "mrwhite";

export interface ScoreResult {
  roundScore: number;
  totalScore: number;
}