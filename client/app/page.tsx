"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEYS = ["chitraguess:nickname", "chitraguess:roomCode"];

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function cleanRoomCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const canContinue = useMemo(() => nickname.trim().length > 0, [nickname]);

  useEffect(() => {
    STORAGE_KEYS.forEach((key) => {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    });
  }, []);

  function goToRoom(code: string) {
    const trimmedName = nickname.trim();
    if (!trimmedName) {
      return;
    }

    router.push(`/room/${code}?nickname=${encodeURIComponent(trimmedName)}`);
  }

  function createRoom() {
    goToRoom(makeRoomCode());
  }

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = cleanRoomCode(roomCode);
    if (code.length === 6) {
      goToRoom(code);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-8 text-ink">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center gap-8">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-palm">Telugu party drawing</p>
          <h1 className="text-5xl font-black tracking-normal text-ink">ChitraGuess</h1>
          <p className="mt-3 text-xl font-semibold text-ink/75">Draw Telugu. Guess Fast.</p>
        </div>

        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
          <label className="text-sm font-semibold text-ink/80" htmlFor="nickname">
            Nickname
          </label>
          <input
            id="nickname"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            maxLength={24}
            placeholder="Enter your nickname"
            className="mt-2 w-full rounded-md border border-ink/15 bg-white px-4 py-3 text-base outline-none ring-palm/25 transition focus:border-palm focus:ring-4"
          />

          <button
            type="button"
            onClick={createRoom}
            disabled={!canContinue}
            className="mt-4 w-full rounded-md bg-palm px-4 py-3 text-base font-bold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-ink/25"
          >
            Create Room
          </button>
        </div>

        <form className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm" onSubmit={joinRoom}>
          <label className="text-sm font-semibold text-ink/80" htmlFor="roomCode">
            Join Room
          </label>
          <input
            id="roomCode"
            value={roomCode}
            onChange={(event) => setRoomCode(cleanRoomCode(event.target.value))}
            maxLength={6}
            placeholder="Room code"
            className="mt-2 w-full rounded-md border border-ink/15 bg-white px-4 py-3 text-center text-xl font-black uppercase tracking-[0.2em] outline-none ring-palm/25 transition focus:border-palm focus:ring-4"
          />
          <button
            type="submit"
            disabled={!canContinue || roomCode.length !== 6}
            className="mt-4 w-full rounded-md bg-ink px-4 py-3 text-base font-bold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-ink/25"
          >
            Join Room
          </button>
        </form>
      </section>
    </main>
  );
}
