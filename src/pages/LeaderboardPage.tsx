import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
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
    <div className="flex flex-col md:flex-row h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="relative flex-1 flex flex-col">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat -z-10"
          style={{ backgroundImage: `url(${bg})` }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-[#0b1b2a]/70 -z-10" />

        {/* Navbar */}
        <Navbar />

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center relative z-10 px-4 overflow-y-auto">
          {loading ? (
            <div className="text-white text-xl mt-10">Loading...</div>
          ) : (
            <Leaderboard
              gameId={gameId}
              enableControls={true}
              onGameChange={(id) => setGameId(id)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
