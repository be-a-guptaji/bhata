import { NextResponse } from "next/server";
import objects from "@/public/objects.json";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const answers = data.answers;

    let score = 0;

    const evaluatedAnswers = answers.map(
      (answer: { objectId: number; answer: boolean }) => {
        const object = objects.find((item) => item.id === answer.objectId);

        if (!object) {
          return {
            objectId: answer.objectId,
            answer: answer.answer,
            correctAnswer: null,
            correct: false,
            objectFound: false,
          };
        }

        const correct = answer.answer === object.isHasordous;

        if (correct) {
          score++;
        }

        return {
          objectId: answer.objectId,
          name: object.name,
          answer: answer.answer,
          correctAnswer: object.isHasordous,
          correct,
        };
      },
    );

    const result = {
      user: data.user,
      completionTime: data.completionTime,
      completionTimeSeconds: data.completionTimeSeconds,
      answers: evaluatedAnswers,
      score,
      totalQuestions: answers.length,
      percentage: answers.length
        ? Math.round((score / answers.length) * 100)
        : 0,
      submittedAt: new Date().toISOString(),
    };

    // /data folder at the project root
    const dataDir = path.join(process.cwd(), "data");

    // Create the data folder if it doesn't exist
    await mkdir(dataDir, { recursive: true });

    const resultsFile = path.join(dataDir, "results.json");

    let existingResults: unknown[] = [];

    try {
      const file = await readFile(resultsFile, "utf-8");
      existingResults = JSON.parse(file);

      if (!Array.isArray(existingResults)) {
        existingResults = [];
      }
    } catch {
      // File doesn't exist yet, so start with an empty array
      existingResults = [];
    }

    existingResults.push(result);

    await writeFile(
      resultsFile,
      JSON.stringify(existingResults, null, 2),
      "utf-8",
    );

    return NextResponse.json({
      success: true,
      score,
      totalQuestions: answers.length,
      percentage: answers.length
        ? Math.round((score / answers.length) * 100)
        : 0,
    });
  } catch (error) {
    console.error("Failed to process quiz:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process quiz",
      },
      {
        status: 500,
      },
    );
  }
}
