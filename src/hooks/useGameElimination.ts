import { doc, updateDoc, getDocs, collection, increment, arrayUnion } from "firebase/firestore";
import { db } from "../firebase/config";
import { calculateScores, PlayerData } from "../utils/scoreUtils";

export async function checkWinnerAndFinishGame(gameId: string): Promise<string | undefined> {
  const snap = await getDocs(collection(db, "games", gameId, "players"));
  const players: PlayerData[] = snap.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      username: data.username,
      role: data.role?.toLowerCase(),
      eliminated: data.eliminated,
      isMrWhiteCorrect: data.isMrWhiteCorrect || false,
      totalScore: data.totalScore ?? 0,
    };
  });

  const alive = players.filter((p) => !p.eliminated);
  const aliveRoles = new Set(alive.map((p) => p.role));

  let winner: string | undefined = undefined;
  if (!aliveRoles.has("undercover") && !aliveRoles.has("mrwhite")) {
    winner = "civilian";
  } else if (!aliveRoles.has("civilian")) {
    if (aliveRoles.has("undercover")) winner = "undercover";
    else if (aliveRoles.has("mrwhite")) winner = "mrwhite";
  }

  if (winner) {
    await updateDoc(doc(db, "games", gameId), {
      status: "finished",
      winner,
    });

    const scores = calculateScores(players, winner);

    await Promise.all(
      Object.entries(scores).map(async ([id, s]) => {
        const playerRef = doc(db, "games", gameId, "players", id);
        await updateDoc(playerRef, { score: s.roundScore });

        const userRef = doc(db, "users", id); // id = username
        await updateDoc(userRef, {
          totalScore: increment(s.roundScore),
          rounds: arrayUnion({ gameId, score: s.roundScore }),
        });
      })
    );
  }

  return winner;
}

export async function finalizeEliminationAndCheckWinner(
  gameId: string,
  playerId: string,
  navigate: (path: string, options?: any) => void
) {
  const playerRef = doc(db, "games", gameId, "players", playerId);
  await updateDoc(playerRef, { eliminated: true });

  const winner = await checkWinnerAndFinishGame(gameId);

  if (winner) {
    navigate("/leaderboard", { state: { gameId, winner } });
  }
}
