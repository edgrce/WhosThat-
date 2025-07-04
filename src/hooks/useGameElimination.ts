import {
  doc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { calculateScores } from "../utils/scoreUtils";
import { Player, Winner } from "../types/player";

export async function checkWinnerAndFinishGame(
  gameId: string
): Promise<Winner | undefined> {
  const gameRef = doc(db, "games", gameId);
  const gameDoc = await getDoc(gameRef);
  const gameData = gameDoc.data();

  const mrWhiteGuessed = gameData?.mrWhiteGuessed ?? false;

  const snap = await getDocs(collection(db, "games", gameId, "players"));
  const players: Player[] = snap.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      username: docSnap.id,  
      role: data.role?.toLowerCase(),
      eliminated: data.eliminated,
      isMrWhiteCorrect: data.isMrWhiteCorrect || false,
    };
  });

  const alive = players.filter((p) => !p.eliminated);
  const aliveRoles = new Set(alive.map((p) => p.role.toLowerCase()));

  const aliveCivilian = alive.filter((p) => p.role === "civilian").length;
  const aliveUndercover = alive.filter((p) => p.role === "undercover").length;

  let winner: Winner | undefined = undefined;

  if (!aliveRoles.has("undercover")) {
    if (
      !aliveRoles.has("mrwhite") ||
      (mrWhiteGuessed &&
        !players.find((p) => p.role === "mrwhite")?.isMrWhiteCorrect)
    ) {
      winner = "civilian";
    }
  }

  if (aliveUndercover >= aliveCivilian) {
    winner = "undercover";
  }

  if (!aliveRoles.has("civilian") && aliveRoles.has("undercover")) {
    winner = "undercover";
  }

  if (winner) {
    await updateDoc(gameRef, {
      status: "finished",
      winner: winner,
    });
    return winner;
  }

  return undefined;
}

export async function finalizeEliminationAndCheckWinner(
  gameId: string,
  playerId: string,
  navigate: (path: string, options?: any) => void
) {
  const playerRef = doc(db, "games", gameId, "players", playerId);
  const playerSnap = await getDoc(playerRef);
  const player = playerSnap.data();
  const role = player?.role?.toLowerCase();

  await updateDoc(playerRef, { eliminated: true });

  await new Promise((res) => setTimeout(res, 300));

  if (role === "mrwhite") {
    navigate("/mrwhiteguess", { state: { gameId } });
    return;
  }

  const winner = await checkWinnerAndFinishGame(gameId);

  if (winner) {
    const snap = await getDocs(collection(db, "games", gameId, "players"));

    const alreadyScored = snap.docs.some((doc) => doc.data()?.scored === true);
    if (alreadyScored) {
      navigate("/leaderboard", { state: { gameId, winner } });
      return;
    }

    const players: Player[] = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        username: docSnap.id, 
        role: data.role?.toLowerCase(),
        eliminated: data.eliminated ?? false,
        isMrWhiteCorrect: data.isMrWhiteCorrect || false,
      };
    });

    const scores = calculateScores(players, winner);

    await Promise.all(
      snap.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const username = docSnap.id;
        const scoreData = scores[username];
        
        if (scoreData) {
          await updateDoc(doc(db, "games", gameId, "players", username), {
            score: scoreData.roundScore,
            totalScore: (data.totalScore ?? 0) + scoreData.roundScore,
            scored: true,  
          });
        }
      })
    );

    navigate("/leaderboard", { state: { gameId, winner } });
  }
}