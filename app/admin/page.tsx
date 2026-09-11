"use client";

import { Fragment, useEffect, useState } from "react";

type Answer = {
  objectId: number;
  name?: string;
  answer: boolean;
  correctAnswer?: boolean;
  correct?: boolean;
};

type Result = {
  user: {
    firstName: string;
    lastName: string;
    id: string;
  };
  completionTime: number;
  completionTimeSeconds: number;
  answers: Answer[];
  score: number;
  totalQuestions: number;
  percentage: number;
  submittedAt: string;
};

function formatTime(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

export default function AdminPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [connected, setConnected] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Clear results modal
  const [showClearModal, setShowClearModal] = useState(false);
  const [password, setPassword] = useState("");
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");

  /*
   * SSE connection
   */
  useEffect(() => {
    const eventSource = new EventSource("/api/admin/results");

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        setResults(data.results ?? []);
      } catch (error) {
        console.error("Failed to parse SSE data:", error);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  /*
   * Open clear results modal
   */
  function openClearModal() {
    setPassword("");
    setClearError("");
    setShowClearModal(true);
  }

  /*
   * Close clear results modal
   */
  function closeClearModal() {
    if (clearing) {
      return;
    }

    setShowClearModal(false);
    setPassword("");
    setClearError("");
  }

  /*
   * Clear all results
   */
  async function handleClearResults() {
    if (clearing) {
      return;
    }

    if (!password.trim()) {
      setClearError("Please enter the admin password.");
      return;
    }

    setClearing(true);
    setClearError("");

    try {
      const response = await fetch("/api/admin/results", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to clear results");
      }

      /*
       * SSE will automatically update the table
       * when results.json changes.
       */
      setResults([]);
      setExpandedIndex(null);

      setShowClearModal(false);
      setPassword("");
    } catch (error) {
      console.error("Failed to clear results:", error);

      setClearError(
        error instanceof Error ? error.message : "Failed to clear results",
      );
    } finally {
      setClearing(false);
    }
  }

  const highestScore = results.length > 0 ? results[0].score : null;

  const fastestTime =
    results.length > 0
      ? results.reduce(
          (fastest, result) =>
            result.completionTime < fastest ? result.completionTime : fastest,
          results[0].completionTime,
        )
      : null;

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Game Results</h1>

            <p className="mt-1 text-gray-500">Live leaderboard</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Connection status */}
            <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  connected ? "bg-green-500" : "bg-red-500"
                }`}
              />

              <span className="text-sm font-medium text-gray-600">
                {connected ? "Live" : "Disconnected"}
              </span>
            </div>

            {/* Clear results */}
            <button
              type="button"
              onClick={openClearModal}
              disabled={results.length === 0}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear Results
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Participants */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Participants</p>

            <p className="mt-1 text-3xl font-bold text-gray-900">
              {results.length}
            </p>
          </div>

          {/* Highest score */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Highest Score</p>

            <p className="mt-1 text-3xl font-bold text-gray-900">
              {highestScore !== null
                ? `${highestScore}/${results[0].totalQuestions}`
                : "-"}
            </p>
          </div>

          {/* Fastest */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Fastest Completion</p>

            <p className="mt-1 text-3xl font-bold text-gray-900">
              {fastestTime !== null ? formatTime(fastestTime) : "-"}
            </p>
          </div>
        </div>

        {/* Results table */}
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px]">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    Rank
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    Name
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    Score
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    Time
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    Details
                  </th>
                </tr>
              </thead>

              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No results yet.
                    </td>
                  </tr>
                ) : (
                  results.map((result, index) => {
                    const isExpanded = expandedIndex === index;

                    return (
                      <Fragment key={`${result.user.id}-${index}`}>
                        {/* Main row */}
                        <tr className="border-b last:border-b-0 hover:bg-gray-50">
                          {/* Rank */}
                          <td className="px-6 py-4">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-full font-bold ${
                                index === 0
                                  ? "bg-yellow-100 text-yellow-700"
                                  : index === 1
                                    ? "bg-gray-200 text-gray-700"
                                    : index === 2
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {index + 1}
                            </div>
                          </td>

                          {/* Name */}
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {result.user.firstName} {result.user.lastName}
                              </p>

                              <p className="text-xs text-gray-400">
                                ID: {result.user.id}
                              </p>
                            </div>
                          </td>

                          {/* Score */}
                          <td className="px-6 py-4">
                            <span className="font-semibold text-gray-900">
                              {result.score}
                            </span>

                            <span className="text-gray-400">
                              {" "}
                              / {result.totalQuestions}
                            </span>

                            <p className="text-xs text-gray-400">
                              {result.percentage}%
                            </p>
                          </td>

                          {/* Time */}
                          <td className="px-6 py-4 font-mono text-sm text-gray-700">
                            {formatTime(result.completionTime)}
                          </td>

                          {/* Details */}
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedIndex(isExpanded ? null : index)
                              }
                              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
                            >
                              {isExpanded ? "Hide" : "View"}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded details */}
                        {isExpanded && (
                          <tr className="border-b bg-gray-50">
                            <td colSpan={5} className="px-4 py-6 sm:px-6">
                              <div>
                                {/* Details header */}
                                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      Answer Details
                                    </h3>

                                    <p className="text-sm text-gray-500">
                                      {result.user.firstName}{" "}
                                      {result.user.lastName}
                                    </p>
                                  </div>

                                  <div className="sm:text-right">
                                    <p className="text-sm text-gray-500">
                                      Final Score
                                    </p>

                                    <p className="text-xl font-bold text-gray-900">
                                      {result.score}/{result.totalQuestions}
                                    </p>
                                  </div>
                                </div>

                                {/* Answers */}
                                <div className="overflow-hidden rounded-lg border bg-white">
                                  <div className="overflow-x-auto">
                                    <table className="w-full min-w-[700px]">
                                      <thead>
                                        <tr className="border-b bg-gray-50 text-left">
                                          <th className="px-4 py-3 text-sm font-semibold text-gray-600">
                                            #
                                          </th>

                                          <th className="px-4 py-3 text-sm font-semibold text-gray-600">
                                            Object
                                          </th>

                                          <th className="px-4 py-3 text-sm font-semibold text-gray-600">
                                            Answer
                                          </th>

                                          <th className="px-4 py-3 text-sm font-semibold text-gray-600">
                                            Correct Answer
                                          </th>

                                          <th className="px-4 py-3 text-sm font-semibold text-gray-600">
                                            Result
                                          </th>
                                        </tr>
                                      </thead>

                                      <tbody>
                                        {result.answers.map(
                                          (answer, answerIndex) => (
                                            <tr
                                              key={`${answer.objectId}-${answerIndex}`}
                                              className="border-b last:border-b-0"
                                            >
                                              <td className="px-4 py-3 text-sm text-gray-500">
                                                {answerIndex + 1}
                                              </td>

                                              <td className="px-4 py-3 font-medium text-gray-900">
                                                {answer.name ??
                                                  `Object ${answer.objectId}`}
                                              </td>

                                              <td className="px-4 py-3">
                                                {answer.answer
                                                  ? "Hazardous"
                                                  : "Not Hazardous"}
                                              </td>

                                              <td className="px-4 py-3">
                                                {answer.correctAnswer ===
                                                undefined
                                                  ? "-"
                                                  : answer.correctAnswer
                                                    ? "Hazardous"
                                                    : "Not Hazardous"}
                                              </td>

                                              <td className="px-4 py-3">
                                                {answer.correct === true ? (
                                                  <span className="font-semibold text-green-600">
                                                    Correct
                                                  </span>
                                                ) : (
                                                  <span className="font-semibold text-red-600">
                                                    Incorrect
                                                  </span>
                                                )}
                                              </td>
                                            </tr>
                                          ),
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* Submission information */}
                                <div className="mt-4 flex flex-col gap-1 text-sm text-gray-500">
                                  <p>
                                    Completion time:{" "}
                                    <span className="font-medium text-gray-700">
                                      {formatTime(result.completionTime)}
                                    </span>
                                  </p>

                                  <p>
                                    Submitted:{" "}
                                    <span className="font-medium text-gray-700">
                                      {new Date(
                                        result.submittedAt,
                                      ).toLocaleString()}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Clear Results Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            {/* Modal header */}
            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-900">
                Clear All Results
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                This will permanently delete all game results. This action
                cannot be undone.
              </p>
            </div>

            {/* Warning */}
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">
                Warning: All participant results will be deleted.
              </p>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="admin-password"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Admin Password
              </label>

              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleClearResults();
                  }
                }}
                placeholder="Enter password"
                autoFocus
                disabled={clearing}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 disabled:bg-gray-100 text-black"
              />
            </div>

            {/* Error */}
            {clearError && (
              <p className="mt-3 text-sm font-medium text-red-600">
                {clearError}
              </p>
            )}

            {/* Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeClearModal}
                disabled={clearing}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleClearResults}
                disabled={clearing || !password}
                className="flex-1 rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {clearing ? "Clearing..." : "Clear Results"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
