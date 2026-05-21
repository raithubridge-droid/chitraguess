"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SketchItLogo from "./components/sketchit-logo";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,#ffe9a8,transparent_30%),linear-gradient(180deg,#fffaf1_0%,#f7efe1_100%)] px-4 py-5 text-ink sm:px-6">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center gap-6 py-4 lg:grid-cols-[1fr_440px]">
        <div className="py-8">
          <p className="mb-3 inline-flex rounded-full bg-palm/10 px-3 py-1 text-sm font-black uppercase tracking-[0.16em] text-palm">
            Telugu friends game
          </p>
          <div className="rounded-[1.25rem] border border-ink/10 bg-white p-3 shadow-xl shadow-ink/10 sm:rounded-[1.5rem] sm:p-5">
            <SketchItLogo size="hero" />
          </div>
          <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-ink/65">
            Ready to draw? Create a room, call your friends, and race through funny sketches, Telugu words, and fast guesses.
          </p>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            {["🎨 Draw Telugu", "🔥 Guess fast!", "🏆 Champion!"].map((item) => (
              <div key={item} className="rounded-lg border border-ink/10 bg-white/85 px-4 py-3 text-sm font-black shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 rounded-lg border border-ink/10 bg-white/95 p-4 shadow-xl shadow-ink/10 sm:p-5">
          <div className="rounded-lg bg-paper px-4 py-3">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-palm">Ready to draw?</p>
            <p className="mt-1 text-sm font-semibold text-ink/65">Enter a nickname before creating or joining a room.</p>
          </div>

          <div>
            <label className="text-sm font-black text-ink/80" htmlFor="nickname">
              Nickname
            </label>
            <input
              id="nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={24}
              placeholder="Enter your nickname"
              className="mt-2 w-full rounded-md border border-ink/15 bg-white px-4 py-3 text-base outline-none ring-palm/25 transition hover:border-ink/30 focus:border-palm focus:ring-4"
            />
          </div>

          <button
            type="button"
            onClick={createRoom}
            disabled={!canContinue}
            className="min-h-12 w-full rounded-md bg-palm px-4 py-3 text-base font-black text-white shadow-sm transition hover:bg-palm/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink/25"
          >
            🎨 Create Room
          </button>

          <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.14em] text-ink/40">
            <span className="h-px flex-1 bg-ink/10" />
            or
            <span className="h-px flex-1 bg-ink/10" />
          </div>

          <form className="grid gap-3" onSubmit={joinRoom}>
            <label className="text-sm font-black text-ink/80" htmlFor="roomCode">
              Join Room
            </label>
            <input
              id="roomCode"
              value={roomCode}
              onChange={(event) => setRoomCode(cleanRoomCode(event.target.value))}
              maxLength={6}
              placeholder="ROOM42"
              className="w-full rounded-md border border-ink/15 bg-white px-4 py-3 text-center text-xl font-black uppercase tracking-[0.2em] outline-none ring-palm/25 transition hover:border-ink/30 focus:border-palm focus:ring-4"
            />
            <button
              type="submit"
              disabled={!canContinue || roomCode.length !== 6}
              className="min-h-12 w-full rounded-md bg-ink px-4 py-3 text-base font-black text-white shadow-sm transition hover:bg-ink/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink/25"
            >
              🔥 Guess fast!
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
