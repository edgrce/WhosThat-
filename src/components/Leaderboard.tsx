import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  where,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import trophyIcon from "../assets/trophy.svg";
import civilianIcon from "../assets/civilain.png";
import undercoverIcon from "../assets/undercover.png";
import mrwhiteIcon from "../assets/mrwhite.png";

interface Player {
  id: string;
  username: string;
  role: string;
  totalScore?: number;
}

interface LeaderboardProps {
  gameId: string;
  enableControls?: boolean;
  onGameChange?: (id: string) => void;
}

export default function Leaderboard({ gameId, enableControls = false, onGameChange }: LeaderboardProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [maxScore, setMaxScore] = useState(0);
  const [gameIds, setGameIds] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGames = async () => {
      if (!enableControls) return;
      const snap = await getDocs(query(collection(db, "games"), orderBy("createdAt", "desc")));
      const ids = snap.docs.map((doc) => doc.id);
      setGameIds(ids);
    };
    fetchGames();
  }, [enableControls]);

  useEffect(() => {
    const fetchPlayers = async () => {
      const q = query(collection(db, "games", gameId, "players"), orderBy("totalScore", "desc"));
      const snap = await getDocs(q);
      const data: Player[] = snap.docs.map((doc) => ({
        id: doc.id,
        username: doc.data().username,
        role: doc.data().role,
        totalScore: doc.data().totalScore ?? 0,
      }));
      setPlayers(data);
      setMaxScore(Math.max(...data.map((p) => p.totalScore ?? 0), 0));
    };

    if (gameId) fetchPlayers();
  }, [gameId]);

  const getRoleIcon = (role: string) => {
    const r = role?.toLowerCase()?.trim();
    switch (r) {
      case "civilian":
      case "civillian":
        return civilianIcon;
      case "undercover":
        return undercoverIcon;
      case "mrwhite":
      case "mr white":
        return mrwhiteIcon;
      default:
        return null;
    }
  };

  const resetScores = async () => {
    const snap = await getDocs(collection(db, "games", gameId, "players"));
    await Promise.all(
      snap.docs.map((docSnap) =>
        updateDoc(doc(db, "games", gameId, "players", docSnap.id), {
          totalScore: 0,
          score: 0,
        })
      )
    );
    const updated = snap.docs.map((doc) => ({
      id: doc.id,
      username: doc.data().username,
      role: doc.data().role,
      totalScore: 0,
    }));
    setPlayers(updated);
    setMaxScore(0);
  };

  const playAgain = async () => {
    try {
      const newGameId = `game_${Date.now()}`;
      const oldGameRef = doc(db, "games", gameId);
      const oldGameSnap = await getDoc(oldGameRef);
      const oldGameData = oldGameSnap.data();

      const roles = oldGameData?.roles || {};
      const difficulty = oldGameData?.difficulty || "easy";

      const qWords = query(
        collection(db, "words"),
        where("difficulty", "==", difficulty)
      );
      const snapWords = await getDocs(qWords);
      if (snapWords.empty) throw new Error("No words found!");
      const picked = snapWords.docs[
        Math.floor(Math.random() * snapWords.docs.length)
      ].data();
      const newWord1 = picked.word1;
      const newWord2 = picked.word2;

      const rolePool: string[] = [];
      Object.entries(roles).forEach(([role, count]) => {
        for (let i = 0; i < (count as number); i++) {
          rolePool.push(role);
        }
      });
      const shuffledRoles = rolePool.sort(() => Math.random() - 0.5);

      await setDoc(doc(db, "games", newGameId), {
        roles,
        difficulty,
        word1: newWord1,
        word2: newWord2,
        shuffledRoles,
        status: "setup",
        createdAt: new Date(),
      });

      const snap = await getDocs(collection(db, "games", gameId, "players"));
      const usernames = snap.docs.map((doc) => doc.data().username);

      await Promise.all(
        snap.docs.map(async (docSnap) => {
          const p = docSnap.data();
          await setDoc(doc(db, "games", newGameId, "players", p.username), {
            username: p.username,
            totalScore: p.totalScore ?? 0,
          });
        })
      );

      navigate("/playerdraw", {
        state: {
          gameId: newGameId,
          playersCount: usernames.length,
          roles,
          difficulty,
          currentPlayer: 1,
          usernames,
          isNextRound: true,
        },
      });
    } catch (err) {
      console.error("Play again error:", err);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white/90 p-6 rounded-xl shadow-xl text-gray-800">
      <h2 className="text-2xl font-bold mb-4 text-center font-['Brush_Script_MT']">Leaderboard</h2>

      {enableControls && (
        <div className="mb-4 text-center font-['Brush_Script_MT']">
          <select
            value={gameId}
            onChange={(e) => onGameChange?.(e.target.value)}
            className="border rounded px-3 py-1"
          >
            {gameIds.map((id, index) => (
              <option key={id} value={id}>
                Game ke {gameIds.length - index}
              </option>
            ))}
          </select>
        </div>
      )}

      <ul className="space-y-4 max-h-[400px] overflow-y-auto">
        {players.map((player, idx) => (
          <li
            key={player.id}
            className="flex justify-between items-center p-3 bg-white rounded-lg shadow border border-gray-200"
          >
            <div className="flex items-center space-x-3">
              <div className="text-lg font-bold font-['Brush_Script_MT']">{idx + 1}.</div>
              {getRoleIcon(player.role) ? (
                <img
                  src={getRoleIcon(player.role)!}
                  alt={player.role}
                  className="w-6 h-6"
                />
              ) : (
                <div className="w-6 h-6 bg-gray-200 rounded" />
              )}
              <div className="font-semibold font-['Brush_Script_MT']">{player.username}</div>
            </div>
            <div className="flex items-center gap-2">
              <img src={trophyIcon} alt="score" className="w-4 h-4" />
              <span className="font-medium">{player.totalScore ?? 0}</span>
            </div>
          </li>
        ))}
      </ul>

      {enableControls && (
        <div className="flex justify-between mt-6 gap-4">
          <button
            onClick={resetScores}
            className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-['Brush_Script_MT']"
          >
            Reset Scores
          </button>
          <button
            onClick={playAgain}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-['Brush_Script_MT']"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
