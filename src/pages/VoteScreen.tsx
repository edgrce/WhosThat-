import bg from "../assets/bg.jpeg";
import logo from "../assets/logo.png";
import cardSilhouette from "../assets/cards.png";
import GameLogo from "../components/GameLogo";
import RoleList from "../components/RoleList";
import EliminationScreen from "../components/EliminationScreen";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc
} from "firebase/firestore";

import { db } from "../firebase/config";
import ROLE_META from "../constants/RoleMeta";
import {
  finalizeEliminationAndCheckWinner,
} from "../hooks/useGameElimination";

type Player = {
  id: string;
  username: string;
  role: string;
  score: number;
  word: string;
  eliminated?: boolean;
};

export default function VoteScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { gameId, roles: initRoles } = location.state || {};

  const [roles, setRoles] = useState(initRoles || {});
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [eliminatedPlayer, setEliminatedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const fetchAll = async () => {
      // ✅ Kalau roles kosong, ambil dari Firestore supaya tidak stuck
      if (!initRoles) {
        const gameDoc = await getDoc(doc(db, "games", gameId));
        const rolesFromDB = gameDoc.data()?.roles || {};
        setRoles(rolesFromDB);
      }

      // ✅ Fetch players
      const snap = await getDocs(collection(db, "games", gameId, "players"));
      const arr: Player[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        arr.push({
          id: docSnap.id,
          username: data.username,
          role: data.role?.toLowerCase(),
          score: data.score,
          word: data.word,
          eliminated: data.eliminated,
        });
      });
      setPlayers(arr);
    };

    fetchAll();
  }, [gameId, eliminatedPlayer]);

  const handleElimination = () => {
    if (selectedIdx === null) return;
    const player = players[selectedIdx];
    setEliminatedPlayer(player);
    setShowConfirm(false);
  };

  if (eliminatedPlayer) {
    const role = eliminatedPlayer.role.toLowerCase();

    if (role === "mrwhite") {
      // ✅ Mr White → Tandai eliminated + redirect ke tebak kata
      // Jangan finalize winner di sini!
      const playerRef = doc(db, "games", gameId, "players", eliminatedPlayer.id);
      updateDoc(playerRef, { eliminated: true }).then(() => {
        navigate("/mrwhiteguess", { state: { gameId } });
      });
      return null;
    }

    return (
      <EliminationScreen
        role={eliminatedPlayer.role}
        username={eliminatedPlayer.username}
        onContinue={async () => {
          try {
            await finalizeEliminationAndCheckWinner(
              gameId,
              eliminatedPlayer.id,
              navigate
            );
            setEliminatedPlayer(null);
            setSelectedIdx(null);
          } catch (error) {
            console.error("Failed to finalize:", error);
          }
        }}
      />
    );
  }

  if (!roles) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b1b2a] text-white text-2xl">
        Loading...
      </div>
    );
  }

  // Dynamic sizing based on player count
  const getCardSizing = () => {
    const playerCount = players.length;
    
    if (playerCount <= 6) {
      return {
        cardSize: "w-[150px] h-[210px]",
        imageSize: "w-20 h-20",
        gridCols: "repeat(3, minmax(0, 1fr))",
        gap: "gap-8",
        mobileCardSize: "w-[100px] h-[140px] sm:w-[120px] sm:h-[170px]",
        mobileImageSize: "w-12 h-12 sm:w-16 sm:h-16",
        mobileGridCols: "grid-cols-2 sm:grid-cols-3",
        mobileGap: "gap-4 sm:gap-6",
        numberSize: "w-8 h-8",
        numberOffset: "-top-4 -left-4",
        mobileNumberSize: "w-6 h-6 sm:w-8 sm:h-8",
        mobileNumberOffset: "-top-3 -left-3 sm:-top-4 sm:-left-4"
      };
    } else if (playerCount <= 9) {
      return {
        cardSize: "w-[120px] h-[170px]",
        imageSize: "w-16 h-16",
        gridCols: "repeat(3, minmax(0, 1fr))",
        gap: "gap-6",
        mobileCardSize: "w-[90px] h-[125px] sm:w-[100px] sm:h-[140px]",
        mobileImageSize: "w-10 h-10 sm:w-12 sm:h-12",
        mobileGridCols: "grid-cols-3",
        mobileGap: "gap-3 sm:gap-4",
        numberSize: "w-7 h-7",
        numberOffset: "-top-3 -left-3",
        mobileNumberSize: "w-5 h-5 sm:w-6 sm:h-6",
        mobileNumberOffset: "-top-2 -left-2 sm:-top-3 sm:-left-3"
      };
    } else {
      return {
        cardSize: "w-[100px] h-[140px]",
        imageSize: "w-12 h-12",
        gridCols: "repeat(4, minmax(0, 1fr))",
        gap: "gap-4",
        mobileCardSize: "w-[75px] h-[105px] sm:w-[85px] sm:h-[120px]",
        mobileImageSize: "w-8 h-8 sm:w-10 sm:h-10",
        mobileGridCols: "grid-cols-3 sm:grid-cols-4",
        mobileGap: "gap-2 sm:gap-3",
        numberSize: "w-6 h-6",
        numberOffset: "-top-2 -left-2",
        mobileNumberSize: "w-4 h-4 sm:w-5 sm:h-5",
        mobileNumberOffset: "-top-1 -left-1 sm:-top-2 sm:-left-2"
      };
    }
  };

  const {
    cardSize,
    imageSize,
    gridCols,
    gap,
    mobileCardSize,
    mobileImageSize,
    mobileGridCols,
    mobileGap,
    numberSize,
    numberOffset,
    mobileNumberSize,
    mobileNumberOffset
  } = getCardSizing();

  return (
    <div
      className="relative min-h-screen flex items-center justify-center font-sans overflow-x-hidden"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-[#0b1b2a]/70 z-0" />
      <GameLogo src={logo} onClick={() => navigate("/dashboard")} />

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-16 md:pt-8 lg:pt-0">
        {/* Desktop Layout: Side by Side */}
        <div className="hidden lg:flex flex-row items-center justify-center">
          {/* Left Panel - Role List */}
          <div className="bg-[#f5f6f7]/95 rounded-2xl shadow-xl w-[320px] min-h-[320px] flex flex-col px-8 py-8 mr-12">
            <div className="text-2xl font-bold mb-2">Find Them</div>
            <div className="text-[#3b5c7e] text-md mb-6 font-semibold">
              vote to eliminate
            </div>
            <RoleList roles={roles} meta={ROLE_META} />
            <button
              className={`w-full font-bold text-2xl py-2 rounded-lg shadow-lg transition mt-8 ${
                selectedIdx === null
                  ? "bg-[#ffe7a0] text-[#22364a] cursor-not-allowed"
                  : "bg-[#FFB3B3] text-[#22364a] hover:bg-[#FFB3B3]/90 cursor-pointer"
              }`}
              disabled={selectedIdx === null}
              onClick={() => setShowConfirm(true)}
            >
              Elimination
            </button>
          </div>

          {/* Right Panel - Players Grid */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div
              className={`grid ${gap}`}
              style={{
                gridTemplateColumns: gridCols,
                gridTemplateRows: `repeat(${Math.ceil(
                  players.length / (gridCols.includes('4') ? 4 : 3)
                )}, minmax(0, 1fr))`,
                minWidth: 340,
                maxWidth: players.length > 9 ? 800 : 700,
              }}
            >
              {players.map((player, idx) => {
                const isEliminated = player.eliminated;
                return (
                  <div key={player.id} className="flex flex-col items-center">
                    <div className="relative">
                      <button
                        className={`bg-[#ffe7a0] rounded-xl shadow-lg ${cardSize} flex items-center justify-center border-4 border-[#22364a] transition
                          ${
                            selectedIdx === idx
                              ? "ring-4 ring-pink-400 scale-105"
                              : ""
                          }
                          ${
                            isEliminated
                              ? "opacity-40 grayscale blur-[1px] cursor-not-allowed"
                              : "hover:scale-105"
                          }
                        `}
                        onClick={() => !isEliminated && setSelectedIdx(idx)}
                        disabled={isEliminated}
                      >
                        <img
                          src={cardSilhouette}
                          alt="?"
                          className={`${imageSize} opacity-90`}
                        />
                      </button>
                      <span
                        className={`absolute ${numberOffset} font-bold rounded-full ${numberSize} flex items-center justify-center border-2 border-white text-lg
                          ${
                            isEliminated
                              ? "bg-pink-300 text-white"
                              : "bg-[#8fa9d9] text-[#22364a]"
                          }
                        `}
                      >
                        {idx + 1}
                      </span>
                    </div>
                    <div
                      className={`mt-2 text-xl font-bold drop-shadow text-center max-w-[${cardSize.split(' ')[0].slice(2, -1)}px] truncate ${
                        isEliminated ? "text-pink-300 line-through" : "text-white"
                      }`}
                    >
                      {player.username}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile & Tablet Layout: Stacked */}
        <div className="lg:hidden flex flex-col space-y-6">
          {/* Role List Panel */}
          <div className="bg-[#f5f6f7]/95 rounded-2xl shadow-xl flex flex-col px-6 sm:px-8 py-6 sm:py-8 mx-auto w-full max-w-sm">
            <div className="text-xl sm:text-2xl font-bold mb-2">Find Them</div>
            <div className="text-[#3b5c7e] text-sm sm:text-md mb-4 sm:mb-6 font-semibold">
              vote to eliminate
            </div>
            <RoleList roles={roles} meta={ROLE_META} />
            <button
              className={`w-full font-bold text-lg sm:text-2xl py-2 rounded-lg shadow-lg transition mt-6 sm:mt-8 ${
                selectedIdx === null
                  ? "bg-[#ffe7a0] text-[#22364a] cursor-not-allowed"
                  : "bg-[#FFB3B3] text-[#22364a] hover:bg-[#FFB3B3]/90 cursor-pointer"
              }`}
              disabled={selectedIdx === null}
              onClick={() => setShowConfirm(true)}
            >
              Elimination
            </button>
          </div>

          {/* Players Grid */}
          <div className="flex flex-col items-center justify-center px-2">
            <div className={`grid ${mobileGap} w-full max-w-lg ${mobileGridCols}`}>
              {players.map((player, idx) => {
                const isEliminated = player.eliminated;
                return (
                  <div key={player.id} className="flex flex-col items-center">
                    <div className="relative">
                      <button
                        className={`bg-[#ffe7a0] rounded-xl shadow-lg ${mobileCardSize} flex items-center justify-center border-4 border-[#22364a] transition
                          ${
                            selectedIdx === idx
                              ? "ring-4 ring-pink-400 scale-105"
                              : ""
                          }
                          ${
                            isEliminated
                              ? "opacity-40 grayscale blur-[1px] cursor-not-allowed"
                              : "hover:scale-105"
                          }
                        `}
                        onClick={() => !isEliminated && setSelectedIdx(idx)}
                        disabled={isEliminated}
                      >
                        <img
                          src={cardSilhouette}
                          alt="?"
                          className={`${mobileImageSize} opacity-90`}
                        />
                      </button>
                      <span
                        className={`absolute ${mobileNumberOffset} font-bold rounded-full ${mobileNumberSize} flex items-center justify-center border-2 border-white text-sm sm:text-lg
                          ${
                            isEliminated
                              ? "bg-pink-300 text-white"
                              : "bg-[#8fa9d9] text-[#22364a]"
                          }
                        `}
                      >
                        {idx + 1}
                      </span>
                    </div>
                    <div
                      className={`mt-2 text-sm sm:text-xl font-bold drop-shadow text-center max-w-[100px] sm:max-w-none truncate sm:truncate-none ${
                        isEliminated ? "text-pink-300 line-through" : "text-white"
                      }`}
                    >
                      {player.username}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && selectedIdx !== null && !eliminatedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 flex flex-col items-center max-w-md w-full">
            <div className="text-lg sm:text-2xl font-bold mb-4 text-[#22364a] text-center">
              Are you sure you want to eliminate{" "}
              <span className="text-pink-600">
                {players[selectedIdx].username}
              </span>
              ?
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mt-4 w-full sm:w-auto">
              <button
                className="bg-[#FFB3B3] text-[#22364a] font-bold px-6 py-2 rounded-lg shadow hover:bg-[#ffe7a0] transition order-2 sm:order-1"
                onClick={handleElimination}
              >
                Yes, Eliminate
              </button>
              <button
                className="bg-gray-300 text-[#22364a] font-bold px-6 py-2 rounded-lg shadow hover:bg-gray-400 transition order-1 sm:order-2"
                onClick={() => setShowConfirm(false)}
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