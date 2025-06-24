import { doc, updateDoc, getDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../firebase/config";
import { calculateScores } from "../utils/scoreUtils";
import { Player } from "../types/player";

/**
 * Optional: fungsi processElimination di hook ini 
 * kalau kamu pisah voting dan score.
 * Biasanya yang aktif di VoteScreen: useGameElimination.
 */
export async function processElimination(
  gameId: string,
  playerId: string,
  navigate: (path: string, options?: any) => void
) {
  const playerRef = doc(db, "games", gameId, "players", playerId);
  await updateDoc(playerRef, { eliminated: true });

  const gameDoc = await getDoc(doc(db, "games", gameId));
  const gameData = gameDoc.data();

  if (gameData?.status === "finished" && gameData?.winner) {
    const snap = await getDocs(collection(db, "games", gameId, "players"));
    const players: Player[] = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        username: docSnap.id, 
        role: data.role,
        eliminated: data.eliminated,
        isMrWhiteCorrect: data.isMrWhiteCorrect || false,
      };
    });

    // 4️⃣ Hitung score
    const scores = calculateScores(players, gameData.winner);

    // 5️⃣ Update score di Firestore
    await Promise.all(
      Object.entries(scores).map(([id, scoreData]) =>
        updateDoc(doc(db, "games", gameId, "players", id), {
          score: scoreData.roundScore, // ✅ Gunakan roundScore, bukan totalScore
          totalScore: scoreData.totalScore, // ✅ Update totalScore juga
        })
      )
    );

    // 6️⃣ Pindah ke leaderboard
    navigate("/leaderboard", {
      state: {
        gameId,
        winner: gameData.winner,
      },
    });
  }
}