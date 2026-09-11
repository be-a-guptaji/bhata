"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/app/lib/user";

import objects from "@/public/objects.json";
import Image from "next/image";

type GameObject = {
  id: number;
  name: string;
  image: string;
  isHasordous: boolean;
};

type Answer = {
  objectId: number;
  answer: boolean;
};

const GAME_COMPLETED_KEY = "gameCompleted";

function shuffle<T>(array: T[]): T[] {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function formatTime(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

export default function Game() {
  const router = useRouter();

  const [gameObjects, setGameObjects] = useState<GameObject[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [mounted, setMounted] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const startTimeRef = useRef<number | null>(null);

  /*
   * Authentication + completed game check
   */
  useEffect(() => {
    const user = getUser();

    if (!user) {
      router.replace("/");
      return;
    }

    const gameCompleted = localStorage.getItem(GAME_COMPLETED_KEY);

    if (gameCompleted === "true") {
      router.replace("/thankyou");
      return;
    }

    /*
     * Only mark the component as mounted.
     * The actual game starts after the user clicks
     * "Start Game".
     */
    const timer = setTimeout(() => {
      setMounted(true);
      setShowStartModal(true);
    }, 0);

    return () => clearTimeout(timer);
  }, [router]);

  /*
   * Start the game
   */
  function startGame() {
    if (gameStarted) {
      return;
    }

    const selectedObjects = shuffle(objects as GameObject[]).slice(0, 20);

    /*
     * IMPORTANT:
     * Timer starts exactly when the user clicks
     * Start Game.
     */
    startTimeRef.current = Date.now();

    setGameObjects(selectedObjects);
    setGameStarted(true);
    setShowStartModal(false);
  }

  /*
   * Timer
   */
  useEffect(() => {
    if (!gameStarted || startTimeRef.current === null) {
      return;
    }

    const interval = setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedTime(Date.now() - startTimeRef.current);
      }
    }, 250);

    return () => {
      clearInterval(interval);
    };
  }, [gameStarted]);

  /*
   * Submit game to API
   */
  async function submitGame(finalAnswers: Answer[]) {
    if (submitting || startTimeRef.current === null) {
      return;
    }

    const user = getUser();

    if (!user) {
      router.replace("/");
      return;
    }

    setSubmitting(true);

    const completionTime = Date.now() - startTimeRef.current;

    const result = {
      user,
      completionTime,
      completionTimeSeconds: Math.round(completionTime / 1000),
      answers: finalAnswers,
    };

    console.log("GAME RESULT:", result);

    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result),
      });

      if (!response.ok) {
        throw new Error("Failed to submit game");
      }

      const data = await response.json();

      console.log("GAME RESPONSE:", data);

      /*
       * Only mark the game as completed
       * after successful API submission.
       */
      localStorage.setItem(GAME_COMPLETED_KEY, "true");

      router.replace("/thankyou");
    } catch (error) {
      console.error("Failed to submit game:", error);

      setSubmitting(false);
    }
  }

  /*
   * Handle answer
   */
  function handleAnswer(isHasordous: boolean) {
    if (selectedAnswer !== null || submitting) {
      return;
    }

    const currentObject = gameObjects[currentIndex];

    if (!currentObject) {
      return;
    }

    const newAnswer: Answer = {
      objectId: currentObject.id,
      answer: isHasordous,
    };

    /*
     * Include the current answer immediately.
     * This is important for question 20.
     */
    const updatedAnswers = [...answers, newAnswer];

    setSelectedAnswer(isHasordous);
    setAnswers(updatedAnswers);

    const isLastObject = currentIndex === gameObjects.length - 1;

    /*
     * Last question:
     * Submit immediately.
     */
    if (isLastObject) {
      submitGame(updatedAnswers);
      return;
    }

    /*
     * Small delay before moving to the next object.
     */
    setTimeout(() => {
      setCurrentIndex((previous) => previous + 1);
      setSelectedAnswer(null);
    }, 300);
  }

  /*
   * Initial loading
   */
  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-xl border bg-white px-8 py-6 shadow-sm">
          <p className="text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  /*
   * Start Game Modal
   */
  if (showStartModal) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <span className="text-3xl">🧪</span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900">Ready to Play?</h1>

            <p className="mt-3 text-gray-500">
              You will be shown 20 different objects. For each object, decide
              whether it is hazardous or not hazardous.
            </p>

            <div className="mt-6 rounded-xl bg-gray-50 p-4 text-left">
              <div className="flex justify-between border-b pb-3">
                <span className="text-sm text-gray-500">Questions</span>
                <span className="font-semibold text-gray-900">20</span>
              </div>

              <div className="flex justify-between pt-3">
                <span className="text-sm text-gray-500">Timer</span>
                <span className="font-semibold text-gray-900">
                  Starts on click
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={startGame}
              className="mt-6 w-full rounded-xl bg-black px-6 py-4 font-semibold text-white transition hover:bg-gray-800 active:scale-[0.99]"
            >
              Start Game
            </button>
          </div>
        </div>
      </main>
    );
  }

  /*
   * Safety loading state
   */
  if (!gameStarted || gameObjects.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-xl border bg-white px-8 py-6 shadow-sm">
          <p className="text-gray-500">Preparing game...</p>
        </div>
      </main>
    );
  }

  const currentObject = gameObjects[currentIndex];

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-lg flex-col justify-center sm:min-h-[calc(100vh-3rem)]">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Hazardous Objects
            </p>

            <p className="mt-1 text-sm text-gray-400">
              Object {currentIndex + 1} / {gameObjects.length}
            </p>
          </div>

          <div className="rounded-lg border bg-white px-4 py-2 shadow-sm">
            <span className="font-mono text-lg font-semibold text-gray-900">
              {formatTime(elapsedTime)}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-black transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / gameObjects.length) * 100}%`,
            }}
          />
        </div>

        {/* Game Card */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-8">
          {/* Image */}
          <div className="mb-6 flex justify-center rounded-xl bg-gray-50 p-4">
            <Image
              src={currentObject.image}
              alt={currentObject.name}
              width={256}
              height={256}
              className="h-56 w-56 object-contain sm:h-64 sm:w-64"
              priority
            />
          </div>

          {/* Object Name */}
          <h1 className="mb-8 text-center text-2xl font-bold text-gray-900">
            {currentObject.name}
          </h1>

          {/* Answers */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {/* Hazardous */}
            <button
              type="button"
              onClick={() => handleAnswer(true)}
              disabled={selectedAnswer !== null || submitting}
              className={`rounded-xl border p-4 font-semibold transition ${
                selectedAnswer === true
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Hazardous
            </button>

            {/* Not Hazardous */}
            <button
              type="button"
              onClick={() => handleAnswer(false)}
              disabled={selectedAnswer !== null || submitting}
              className={`rounded-xl border p-4 font-semibold transition ${
                selectedAnswer === false
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-green-200 bg-green-50 text-green-700 hover:border-green-300 hover:bg-green-100"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Not Hazardous
            </button>
          </div>

          {/* Submitting */}
          {submitting && (
            <div className="mt-6 rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-sm font-medium text-gray-600">
                Submitting your game...
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-xs text-gray-400">
          Choose carefully. Your score is based on your answers and completion
          time.
        </p>
      </div>
    </main>
  );
}
