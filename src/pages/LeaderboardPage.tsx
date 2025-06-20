import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import Leaderboard from "../components/Leaderboard";
import { db } from "../firebase/config";
import bg from "../assets/bg.jpeg";

export default function LeaderboardPage() {
  const [gameId, setGameId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestGame = async () => {
      const qGames = query(collection(db, "games"), orderBy("createdAt", "desc"));
      const snap = await getDocs(qGames);
      if (!snap.empty) {
        setGameId(snap.docs[0].id);
      }
      setLoading(false);
    };
    fetchLatestGame();
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start pt-16 px-4"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-[#0b1b2a]/70 -z-10" />

      {loading ? (
        <div className="text-white text-xl mt-10">Loading...</div>
      ) : (
        <Leaderboard
          gameId={gameId}
          enableControls={true}
          onGameChange={(id) => setGameId(id)}
        />
      )}
    </div>
  );
}
