import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  getDocs,
  collection,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { checkWinnerAndFinishGame } from "../hooks/useGameElimination";
import { calculateScores } from "../utils/scoreUtils";
import bg from "../assets/bg.jpeg";

export default function MrWhiteGuess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = location.state || {};
  const [guess, setGuess] = useState("");
  const [word1, setWord1] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchWord = async () => {
      const gameDoc = await getDoc(doc(db, "games", gameId));
      const data = gameDoc.data();
      if (data?.word1) setWord1(data.word1);
    };
    fetchWord();
  }, [gameId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim()) {
      setError("Please enter your guess.");
      return;
    }

    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedWord = word1.trim().toLowerCase();

    if (normalizedGuess === normalizedWord) {
      await updateDoc(doc(db, "games", gameId), {
        status: "finished",
        winner: "mrwhite",
        mrWhiteGuessed: true,
        isMrWhiteCorrect: true,
      });

      const snap = await getDocs(collection(db, "games", gameId, "players"));

      // Cegah dobel: jika sudah ada player yang memiliki "scored: true", skip
      const alreadyScored = snap.docs.some((doc) => doc.data().scored === true);
      if (alreadyScored) {
        navigate("/leaderboard", { state: { gameId, winner: "mrwhite" } });
        return;
      }

      await Promise.all(
        snap.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const role = data.role?.toLowerCase();
          if (role !== "mrwhite") {
            await updateDoc(doc(db, "games", gameId, "players", docSnap.id), {
              eliminated: true,
            });
          }
        })
      );

      const updatedSnap = await getDocs(collection(db, "games", gameId, "players"));
      const players = updatedSnap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          username: docSnap.id,
          role: data.role?.toLowerCase(),
          eliminated: data.eliminated ?? false,
          isMrWhiteCorrect: data.role?.toLowerCase() === "mrwhite",
        };
      });

      const scores = calculateScores(players, "mrwhite");

      await Promise.all(
        updatedSnap.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const username = docSnap.id;
          const newRoundScore = scores[username]?.roundScore ?? 0;

          await updateDoc(doc(db, "games", gameId, "players", username), {
            score: newRoundScore,
            totalScore: (data.totalScore ?? 0) + newRoundScore,
            scored: true, // ✅ Mark sudah dikasih skor
          });
        })
      );

      navigate("/leaderboard", { state: { gameId, winner: "mrwhite" } });
    } else {
      await updateDoc(doc(db, "games", gameId), {
        mrWhiteGuessed: true,
        isMrWhiteCorrect: false,
      });

      const winner = await checkWinnerAndFinishGame(gameId);

      if (winner) {
        const snap = await getDocs(collection(db, "games", gameId, "players"));
        const players = snap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            username: docSnap.id,
            role: data.role?.toLowerCase(),
            eliminated: data.eliminated ?? false,
            isMrWhiteCorrect: false,
          };
        });

        const scores = calculateScores(players, winner);

        await Promise.all(
          snap.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const username = docSnap.id;
            const newRoundScore = scores[username]?.roundScore ?? 0;

            await updateDoc(doc(db, "games", gameId, "players", username), {
              score: newRoundScore,
              totalScore: (data.totalScore ?? 0) + newRoundScore,
              scored: true,
            });
          })
        );

        navigate("/leaderboard", { state: { gameId, winner } });
      } else {
        const gameDoc = await getDoc(doc(db, "games", gameId));
        const roles = gameDoc.data()?.roles || {};
        navigate("/votescreen", { state: { gameId, roles } });
      }
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative px-4"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-[#0b1b2a]/70 z-0" />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 bg-white/90 rounded-xl shadow-2xl px-8 py-10 w-full max-w-md flex flex-col items-center"
      >
        <h1 className="text-3xl font-bold text-[#22364a] mb-6 text-center">
          MR. WHITE GUESS
        </h1>
        <p className="text-center text-[#22364a] mb-6">
          You have been eliminated! Try to guess the civilian's word.
        </p>

        <input
          type="text"
          placeholder="Your guess..."
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-[#22364a] text-[#22364a] text-lg mb-4 focus:outline-none"
        />

        {error && <div className="text-red-600 mb-2">{error}</div>}

        <button
          type="submit"
          className="bg-[#0b1b2a] text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-[#22364a] transition"
        >
          Submit Guess
        </button>
      </form>
    </div>
  );
}
