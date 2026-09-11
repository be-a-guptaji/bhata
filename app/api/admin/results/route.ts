import { NextRequest } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { watch } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const RESULTS_FILE = path.join(process.cwd(), "data", "results.json");

/*
 * IMPORTANT:
 * Keep this password on the SERVER.
 * Do not put it in the client-side code.
 */
const ADMIN_PASSWORD = "Utility@25037613";

type Answer = {
  objectId: number;
  name?: string;
  answer: boolean;
  correctAnswer?: boolean;
  correct?: boolean;
};

type Result = {
  user: {
    fullName: string;
    token: string;
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

/*
 * Read results.json
 *
 * IMPORTANT:
 * Do NOT sort here.
 *
 * The order in results.json is the submission order:
 * first submitted = first in the array.
 */
async function getResults(): Promise<Result[]> {
  try {
    const file = await readFile(RESULTS_FILE, "utf-8");

    const results = JSON.parse(file);

    if (!Array.isArray(results)) {
      return [];
    }

    return results;
  } catch (error) {
    console.error("Failed to read results:", error);

    return [];
  }
}

/*
 * GET
 *
 * SSE endpoint.
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const scoreOrder = request.nextUrl.searchParams.get("score");
  const timeOrder = request.nextUrl.searchParams.get("time");

  let watcher: ReturnType<typeof watch> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const cleanup = () => {
        if (closed) {
          return;
        }

        closed = true;

        if (watcher) {
          watcher.close();
          watcher = null;
        }

        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }

        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      const sendResults = async () => {
        if (closed) {
          return;
        }

        let results = await getResults();

        /*
         * Default:
         * Keep submission order from results.json.
         *
         * Score:
         * ?score=asc  -> lowest to highest
         * ?score=desc -> highest to lowest
         *
         * Time:
         * ?time=asc   -> fastest to slowest
         * ?time=desc  -> slowest to fastest
         */
        if (scoreOrder === "asc") {
          results = [...results].sort((a, b) => a.score - b.score);
        } else if (scoreOrder === "desc") {
          results = [...results].sort((a, b) => b.score - a.score);
        } else if (timeOrder === "asc") {
          results = [...results].sort(
            (a, b) => a.completionTimeSeconds - b.completionTimeSeconds,
          );
        } else if (timeOrder === "desc") {
          results = [...results].sort(
            (a, b) => b.completionTimeSeconds - a.completionTimeSeconds,
          );
        }

        const payload = JSON.stringify({
          results,
          updatedAt: new Date().toISOString(),
        });

        try {
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          cleanup();
        }
      };

      await sendResults();

      try {
        watcher = watch(
          RESULTS_FILE,
          {
            persistent: false,
          },
          (eventType) => {
            if (eventType === "change" || eventType === "rename") {
              setTimeout(() => {
                sendResults();
              }, 100);
            }
          },
        );
      } catch (error) {
        console.error("Failed to watch results file:", error);
      }

      heartbeat = setInterval(() => {
        if (!closed) {
          try {
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
          } catch {
            cleanup();
          }
        }
      }, 15000);

      request.signal.addEventListener("abort", cleanup);
    },

    cancel() {
      if (watcher) {
        watcher.close();
        watcher = null;
      }

      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}


/*
 * DELETE
 *
 * Clears all game results.
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    const password = body?.password;

    /*
     * Password check happens ONLY on the server.
     */
    if (typeof password !== "string" || password !== ADMIN_PASSWORD) {
      return Response.json(
        {
          success: false,
          error: "Invalid admin password.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * Replace results with an empty array.
     */
    await writeFile(RESULTS_FILE, JSON.stringify([], null, 2), "utf-8");

    console.log("ADMIN: All game results cleared.");

    return Response.json({
      success: true,
      message: "All results cleared successfully.",
    });
  } catch (error) {
    console.error("Failed to clear results:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to clear results.",
      },
      {
        status: 500,
      },
    );
  }
}
