"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/app/lib/user";

export default function ThankYouPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);

  useEffect(() => {
    const currentUser = getUser();

    async function loadUser() {
      setUser(currentUser);
    }

    if (!currentUser) {
      router.replace("/");
      return;
    } else {
      loadUser();
    }
  }, [router]);

  const resetUser = () => {
    localStorage.removeItem("gameCompleted");
    localStorage.removeItem("user");
    router.replace("/");
  };

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-10 text-center shadow-lg">
        {/* Success Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <span className="text-4xl text-green-600">✓</span>
        </div>

        {/* Name */}
        <h1 className="mb-4 text-3xl font-bold text-gray-900">
          Thank you, {user.firstName}!
        </h1>

        {/* Main message */}
        <p className="text-lg leading-7 text-gray-600">
          Your game has been successfully submitted.
        </p>

        <p className="my-4 text-lg leading-7 text-gray-600">
          Your id is{" "}
          <span className="font-semibold text-gray-800">{user.id}</span>.
        </p>

        <p className="mt-3 text-gray-500">
          Thank you for taking the time to complete the game. Your answers have
          been recorded successfully.
        </p>

        {/* Done button */}
        <button
          type="button"
          onClick={() => resetUser}
          className="mt-8 rounded-lg bg-black px-8 py-3 font-semibold text-white transition hover:bg-gray-800"
        >
          Done
        </button>
      </div>
    </main>
  );
}
