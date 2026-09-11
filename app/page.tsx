"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, saveUser } from "@/app/lib/user";

export default function Home() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [userChecked, setUserChecked] = useState(false);

  useEffect(() => {
    const user = getUser();

    if (user) {
      router.replace("/game");
    } else {
      queueMicrotask(() => {
        setUserChecked(true);
      });
    }
  }, [router]);

  if (!userChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-xl border bg-white px-8 py-6 shadow-sm">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    saveUser({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      id: crypto.randomUUID(),
    });

    router.replace("/game");
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center sm:min-h-[calc(100vh-3rem)]">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <span className="text-3xl">🧪</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Hazardous Objects
            </h1>

            <p className="mt-2 text-gray-500">
              Enter your details to participate in the game.
            </p>
          </div>

          {/* Form Card */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Participant Details
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Please enter your information before starting.
              </p>
            </div>

            <div className="space-y-5">
              {/* First Name */}
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  First Name
                </label>

                <input
                  id="firstName"
                  type="text"
                  placeholder="Enter your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                />
              </div>

              {/* Last Name */}
              <div>
                <label
                  htmlFor="lastName"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Last Name
                </label>

                <input
                  id="lastName"
                  type="text"
                  placeholder="Enter your last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                />
              </div>
            </div>

            {/* Continue */}
            <button
              type="submit"
              className="mt-7 w-full rounded-xl bg-black px-5 py-3.5 font-semibold text-white transition hover:bg-gray-800 active:scale-[0.99]"
            >
              Continue
            </button>
          </form>

          {/* Footer */}
          <p className="mt-5 text-center text-xs text-gray-400">
            Enter your details to begin the hazardous objects challenge.
          </p>
        </div>
      </div>
    </main>
  );
}
