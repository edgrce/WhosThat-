import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import bg from "../assets/bg.jpeg";
import logo from "../assets/logo.png";
import cardSilhouette from "../assets/cards.png";
import GameLogo from "../components/GameLogo";
import RoleList from "../components/RoleList";
import ROLE_META from "../constants/RoleMeta";

interface GameState {
  gameId: string;
  playersCount: number;
  roles: {
    civilian: number;
    undercover: number;
    mrwhite: number;
  };
  difficulty: string;
  currentPlayer?: number;
  assignedRoles?: string[];
  assignedNames?: string[];
  usernames?: string[];
  username?: string;
  isNextRound?: boolean;
}

export default function PlayerWordCardScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    gameId,
    playersCount,
    roles,
    difficulty,
    currentPlayer = 1,
    assignedRoles = [],
    assignedNames = [],
    usernames = [],
    username,
    isNextRound = false,
  } = (location.state as GameState) || {};

  const [error, setError] = useState<string | null>(null);

  const currentUsername =
    username || usernames[currentPlayer - 1] || `Player ${currentPlayer}`;

  useEffect(() => {
    if (!isNextRound && currentUsername.startsWith("Player ")) {
      navigate("/login-username", { state: location.state });
    }
  }, []);

  if (!isNextRound && currentUsername.startsWith("Player ")) {
    return null;
  }

  const getRandomRole = (roles: any, assigned: string[]) => {
    let pool: string[] = [];
    Object.entries(roles).forEach(([role, count]) => {
      const used = assigned.filter((r) => r === role).length;
      for (let i = 0; i < (count as number) - used; i++) {
        pool.push(role);
      }
    });
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const getGameWords = async () => {
    const gameDoc = await getDoc(doc(db, "games", gameId));
    const data = gameDoc.data();
    return { word1: data?.word1 || "", word2: data?.word2 || "" };
  };

  const handleCardClick = async (idx: number) => {
    try {
      if (idx < assignedNames.length) return;

      const playerRef = doc(db, "games", gameId, "players", currentUsername);
      const existingSnap = await getDoc(playerRef);
      const { word1, word2 } = await getGameWords();

      let role = "";
      let word = "";
      let totalScore = 0;

      if (isNextRound || !existingSnap.exists()) {
        // Generate baru untuk next round atau player baru
        role = getRandomRole(roles, assignedRoles);
        if (role === "civilian") word = word1;
        else if (role === "undercover") word = word2;
        else word = "";

        totalScore = existingSnap.exists()
          ? existingSnap.data().totalScore ?? 0
          : 0;

        await setDoc(playerRef, {
          username: currentUsername,
          role,
          word,
          score: 0,
          totalScore,
          eliminated: false,
          isMrWhiteCorrect: false,
        });
      } else {
        // Gunakan data lama (untuk game yang sedang berjalan)
        const data = existingSnap.data();
        role = data.role;
        word = data.word;
        totalScore = data.totalScore ?? 0;
      }

      navigate("/playershowword", {
        state: {
          gameId,
          playersCount,
          roles,
          difficulty,
          currentPlayer,
          assignedRoles: [...assignedRoles, role],
          assignedNames: [...assignedNames, currentUsername],
          usernames,
          username: currentUsername,
          role,
          word,
          isNextRound,
        },
      });
    } catch (err) {
      console.error(err);
      setError("Failed to assign role & word");
    }
  };

  const getCardSizing = () => {
    if (playersCount <= 6) {
      return {
        cardSize: "w-[120px] h-[170px] md:w-[150px] md:h-[210px]",
        imageSize: "w-16 h-16 md:w-20 md:h-20",
        gridCols: "grid-cols-2 md:grid-cols-3",
        gap: "gap-4 md:gap-8",
      };
    } else if (playersCount <= 9) {
      return {
        cardSize: "w-[100px] h-[140px] md:w-[120px] md:h-[170px]",
        imageSize: "w-12 h-12 md:w-16 md:h-16",
        gridCols: "grid-cols-3 md:grid-cols-3",
        gap: "gap-3 md:gap-6",
      };
    } else {
      return {
        cardSize: "w-[80px] h-[110px] md:w-[100px] md:h-[140px]",
        imageSize: "w-10 h-10 md:w-12 md:h-12",
        gridCols: "grid-cols-3 md:grid-cols-4",
        gap: "gap-2 md:gap-4",
      };
    }
  };

  const { cardSize, imageSize, gridCols, gap } = getCardSizing();

  return (
    <div
      className="relative min-h-screen flex items-center justify-center font-['Brush_Script_MT'] px-4"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-[#0b1b2a]/70 z-0" />

      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">
            ×
          </button>
        </div>
      )}

      <GameLogo src={logo} />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center w-full max-w-7xl gap-8 md:gap-12 mt-15 md:mt-0 px-4">
        <div className="bg-[#f5f6f7]/90 rounded-2xl shadow-xl w-full max-w-xs min-h-[420px] flex flex-col px-6 py-8">
          <div className="text-3xl font-bold text-[#22364a] mb-2 text-center font-['Brush_Script_MT']">
            {currentUsername}
          </div>
          <div className="text-[#3b5c7e] text-lg mb-4 text-center font-['Brush_Script_MT']">
            choose a card
          </div>
          <RoleList roles={roles} meta={ROLE_META} />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <div className={`grid ${gridCols} ${gap} w-full max-w-2xl`}>
            {Array.from({ length: playersCount }).map((_, idx) => {
              const isPicked = idx < assignedNames.length;
              return (
                <div key={idx} className="flex items-center justify-center">
                  <button
                    className={`bg-[#ffe7a0] rounded-xl shadow-lg ${cardSize} flex items-center justify-center border-4 border-[#22364a] transition
                    ${
                      isPicked
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:scale-105"
                    }`}
                    onClick={() => handleCardClick(idx)}
                    disabled={isPicked}
                  >
                    <img
                      src={cardSilhouette}
                      alt="?"
                      className={`${imageSize} opacity-90`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
