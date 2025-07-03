import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
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

export default function Leaderboard({
  gameId,
  enableControls = false,
  onGameChange,
}: LeaderboardProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [maxScore, setMaxScore] = useState(0);
  const [gameIds, setGameIds] = useState<string[]>([]);
  const [gameStatus, setGameStatus] = useState<"finished" | "setup" | "playing" | "">("");
  const [winner, setWinner] = useState<string | undefined>();
  const [confirmDelete, setConfirmDelete] = useState(false);
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
    const fetchGameInfo = async () => {
      if (!gameId) return;
      const gameSnap = await getDoc(doc(db, "games", gameId));
      const data = gameSnap.data();
      setGameStatus(data?.status || "setup");
      setWinner(data?.winner);
    };
    fetchGameInfo();
  }, [gameId]);

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

  const deleteGame = async () => {
    try {
      const playerSnap = await getDocs(collection(db, "games", gameId, "players"));
      await Promise.all(
        playerSnap.docs.map((docSnap) =>
          deleteDoc(doc(db, "games", gameId, "players", docSnap.id))
        )
      );
      await deleteDoc(doc(db, "games", gameId));
      alert("Game successfully deleted.");
      if (onGameChange && gameIds.length > 1) {
        const next = gameIds.find((id) => id !== gameId);
        onGameChange(next || "");
      }
    } catch (err) {
      console.error("Failed to delete game:", err);
      alert("An error occurred while deleting the game.");
    } finally {
      setConfirmDelete(false);
    }
  };

  const getStatusLabel = () => {
    if (gameStatus === "finished") return "✅ Finished";
    if (gameStatus === "playing") return "⏳ Playing";
    return "⏱️ Not started yet";
  };

  const getWinnerLabel = () => {
    if (!winner) return "–";
    const icon = getRoleIcon(winner);
    return icon ? (
      <img src={icon} alt={winner} className="w-5 h-5 inline-block" />
    ) : (
      "–"
    );
  };

  return (
    <div className="relative w-full max-w-2xl bg-white/90 p-6 rounded-xl shadow-xl text-gray-800">
      <h2 className="text-2xl font-bold mb-2 text-center font-['Brush_Script_MT']">
        Leaderboard
      </h2>

      {enableControls && (
        <div className="mb-4 text-center font-['Brush_Script_MT']">
          <select
            value={gameId}
            onChange={(e) => onGameChange?.(e.target.value)}
            className="border rounded px-3 py-1"
          >
            {gameIds.map((id, index) => (
              <option key={id} value={id}>
                Game - {gameIds.length - index}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center justify-between bg-[#FFB3B3] rounded-lg shadow border border p-3 text-sm mb-3 text-[#22364a] font-['Brush_Script_MT'] px-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Status:</span> {getStatusLabel()}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">Winner:</span> {getWinnerLabel()}
        </div>
      </div>

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
              <div className="font-semibold font-['Brush_Script_MT']">
                {player.username}
              </div>
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
            className="flex-1 bg-[#7b61ff] text-white px-4 py-2 rounded hover:bg-[#7b33ff] font-['Brush_Script_MT']"
          >
            Reset Scores
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex-1 bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500 font-['Brush_Script_MT']"
          >
            Delete Game
          </button>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center text-center max-w-sm mx-auto">
            <div className="text-xl sm:text-2xl font-bold mb-4 text-[#22364a] font-['Brush_Script_MT']">
              Are you sure you want to delete this game?
            </div>
            <div className="flex gap-6 mt-4">
              <button
                className="bg-[#FFB3B3] text-[#22364a] font-bold px-6 py-2 rounded-lg shadow hover:bg-[#ffe7a0] transition font-['Brush_Script_MT']"
                onClick={deleteGame}
              >
                Yes, Delete
              </button>
              <button
                className="bg-gray-300 text-[#22364a] font-bold px-6 py-2 rounded-lg shadow hover:bg-gray-400 transition font-['Brush_Script_MT']"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
