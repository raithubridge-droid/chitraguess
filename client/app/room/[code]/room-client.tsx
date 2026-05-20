"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useRouter, useSearchParams } from "next/navigation";
import { GameState, getSocket, Player, Point, RoomSettings, StrokePayload } from "@/app/lib/socket";

const PEN_COLOR = "#1d2530";
const PEN_WIDTH = 4;
const STORAGE_KEYS = ["chitraguess:nickname", "chitraguess:roomCode"];
const DEFAULT_SETTINGS: RoomSettings = {
  language: "Telugu",
  rounds: 3,
  roundDurationSeconds: 90,
  category: "All",
  difficulty: "Mixed"
};
const LANGUAGE_OPTIONS = ["Telugu", "English"] as const;
const ROUND_OPTIONS = [2, 3, 5] as const;
const ROUND_DURATION_OPTIONS = [60, 90, 120] as const;
const CATEGORY_OPTIONS = [
  "All",
  "Food",
  "Festivals",
  "Places",
  "Movies",
  "Farming"
] as const;
const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard", "Mixed"] as const;

function pointerToPoint(canvas: HTMLCanvasElement, event: React.PointerEvent<HTMLCanvasElement>): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height
  };
}

function drawStroke(canvas: HTMLCanvasElement, stroke: StrokePayload) {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.strokeStyle = stroke.color;
  context.lineWidth = stroke.width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(stroke.from.x * canvas.width, stroke.from.y * canvas.height);
  context.lineTo(stroke.to.x * canvas.width, stroke.to.y * canvas.height);
  context.stroke();
}

function clearCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
}

export default function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const celebratedGameOverRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState("Connecting...");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [guess, setGuess] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const nickname = searchParams.get("nickname")?.trim() || "Guest";

  useEffect(() => {
    const socket = getSocket();

    function handlePlayers(nextPlayers: Player[]) {
      setPlayers(nextPlayers);
    }

    function handleStroke(stroke: StrokePayload) {
      const canvas = canvasRef.current;
      if (canvas) {
        drawStroke(canvas, stroke);
      }
    }

    function handleClear() {
      const canvas = canvasRef.current;
      if (canvas) {
        clearCanvas(canvas);
      }
    }

    function handleGameState(nextGameState: GameState) {
      setGameState(nextGameState);
    }

    function handleErrorMessage(message: string) {
      setErrorMessage(message);
    }

    socket.connect();
    setStatus(socket.connected ? "Connected" : "Connecting...");
    socket.emit("join-room", { code, nickname });

    socket.on("connect", () => setStatus("Connected"));
    socket.on("disconnect", () => setStatus("Disconnected"));
    socket.on("players", handlePlayers);
    socket.on("draw-stroke", handleStroke);
    socket.on("clear-canvas", handleClear);
    socket.on("game-state", handleGameState);
    socket.on("error-message", handleErrorMessage);

    return () => {
      socket.emit("leave-room", { code });
      socket.off("connect");
      socket.off("disconnect");
      socket.off("players", handlePlayers);
      socket.off("draw-stroke", handleStroke);
      socket.off("clear-canvas", handleClear);
      socket.off("game-state", handleGameState);
      socket.off("error-message", handleErrorMessage);
    };
  }, [code, nickname]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, [gameState?.gameOver]);

  useEffect(() => {
    if (!gameState?.gameOver) {
      celebratedGameOverRef.current = false;
      return;
    }

    if (celebratedGameOverRef.current) {
      return;
    }

    celebratedGameOverRef.current = true;
    const bursts = [
      { particleRatio: 0.35, spread: 55, startVelocity: 45 },
      { particleRatio: 0.25, spread: 80 },
      { particleRatio: 0.2, spread: 110, decay: 0.92, scalar: 0.9 },
      { particleRatio: 0.2, spread: 150, startVelocity: 25, scalar: 1.1 }
    ];

    bursts.forEach((burst) => {
      confetti({
        origin: { y: 0.7 },
        particleCount: Math.floor(120 * burst.particleRatio),
        spread: burst.spread,
        startVelocity: burst.startVelocity,
        decay: burst.decay,
        scalar: burst.scalar,
        ticks: 180
      });
    });
  }, [gameState?.gameOver]);

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (gameState?.hasActiveRound && (!gameState.isDrawer || gameState.isChoosingWord)) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    lastPointRef.current = pointerToPoint(event.currentTarget, event);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (gameState?.hasActiveRound && (!gameState.isDrawer || gameState.isChoosingWord)) {
      return;
    }

    const from = lastPointRef.current;
    if (!from) {
      return;
    }

    const canvas = event.currentTarget;
    const to = pointerToPoint(canvas, event);
    const stroke = { from, to, color: PEN_COLOR, width: PEN_WIDTH };
    drawStroke(canvas, stroke);
    getSocket().emit("draw-stroke", { code, stroke });
    lastPointRef.current = to;
  }

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    lastPointRef.current = null;
  }

  function handleClearCanvas() {
    if (gameState?.hasActiveRound && !gameState.isDrawer && !gameState.isHost) {
      return;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      clearCanvas(canvas);
    }
    getSocket().emit("clear-canvas", { code });
  }

  function handleStartGame() {
    getSocket().emit("start-game", { code });
  }

  function handleSelectWord(wordId: string) {
    getSocket().emit("select-word", { code, wordId });
  }

  function handleRoomSettingChange<Key extends keyof RoomSettings>(key: Key, value: RoomSettings[Key]) {
    if (!canEditSettings) {
      setErrorMessage("Settings locked after game starts.");
      return;
    }

    getSocket().emit("update-room-settings", {
      code,
      settings: {
        [key]: value
      }
    });
  }

  function handleSubmitGuess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedGuess = guess.trim();
    if (!trimmedGuess) {
      return;
    }

    getSocket().emit("submit-guess", { code, guess: trimmedGuess });
    setGuess("");
  }

  function clearStoredRoomState() {
    STORAGE_KEYS.forEach((key) => {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    });
  }

  function handleLeaveRoom() {
    getSocket().emit("leave-room", { code });
    clearStoredRoomState();
    router.push("/");
  }

  const canGuess =
    Boolean(gameState?.hasActiveRound) &&
    !gameState?.isChoosingWord &&
    !gameState?.isDrawer &&
    !gameState?.hasGuessedCorrectly;
  const canStartGame = Boolean(gameState?.isHost) && !gameState?.gameStarted;
  const settings = gameState?.settings ?? DEFAULT_SETTINGS;
  const settingsLocked = Boolean(gameState?.gameStarted || gameState?.gameOver);
  const canEditSettings = Boolean(gameState?.isHost && !settingsLocked);
  const winner = gameState?.scoreboard.reduce((topPlayer, player) => {
    if (!topPlayer || player.score > topPlayer.score) {
      return player;
    }

    return topPlayer;
  }, gameState.scoreboard[0]);

  return (
    <main className="min-h-screen bg-paper px-3 py-4 text-ink sm:px-6">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="flex flex-col gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button type="button" onClick={handleLeaveRoom} className="text-sm font-bold text-palm">
              ChitraGuess
            </button>
            <h1 className="mt-1 text-3xl font-black tracking-normal">Room {code}</h1>
            <p className="text-sm font-semibold text-ink/60">{status}</p>
          </div>
          <div className="grid gap-2 sm:flex sm:items-center">
            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                setIsSettingsOpen(true);
              }}
              title={settingsLocked ? "Settings locked after game starts" : "Room settings"}
              aria-label="Room settings"
              className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-ink/15 bg-white text-ink shadow-sm transition active:scale-[0.99]"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 3.75h3l.55 2.2a6.9 6.9 0 0 1 1.45.6l1.95-1.17 2.12 2.12-1.17 1.95c.25.46.45.94.6 1.45l2.25.6v3l-2.25.55a6.9 6.9 0 0 1-.6 1.45l1.17 1.95-2.12 2.12-1.95-1.17c-.46.25-.94.45-1.45.6l-.55 2.25h-3l-.6-2.25a6.9 6.9 0 0 1-1.45-.6l-1.95 1.17-2.12-2.12 1.17-1.95a6.9 6.9 0 0 1-.6-1.45L2.75 14.5v-3l2.2-.6c.15-.51.35-.99.6-1.45L4.38 7.5 6.5 5.38l1.95 1.17c.46-.25.94-.45 1.45-.6l.6-2.2Z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
              </svg>
            </button>
            {canStartGame ? (
              <button
                type="button"
                onClick={handleStartGame}
                className="rounded-md bg-palm px-4 py-3 text-base font-black text-white shadow-sm transition active:scale-[0.99]"
              >
                {gameState?.gameOver ? "Play Again" : "Start Game"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="rounded-md border border-ink/15 bg-white px-4 py-3 text-base font-black text-ink shadow-sm transition active:scale-[0.99]"
            >
              Back to Home
            </button>
            <button
              type="button"
              onClick={handleClearCanvas}
              className="rounded-md bg-marigold px-4 py-3 text-base font-black text-ink shadow-sm transition active:scale-[0.99]"
            >
              Clear Canvas
            </button>
          </div>
        </header>

        {isSettingsOpen ? (
          <div className="fixed inset-0 z-50 flex items-end bg-ink/40 p-3 sm:items-center sm:justify-center">
            <section className="w-full rounded-lg border border-ink/10 bg-white p-4 shadow-lg sm:max-w-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-palm">Room settings</p>
                  <h2 className="text-2xl font-black">Match setup</h2>
                  <p className="mt-1 text-sm font-bold text-ink/60">
                    {settingsLocked
                      ? "Settings locked after game starts."
                      : canEditSettings
                        ? "Only the host can edit settings before the game starts."
                        : "Only the host can edit these settings."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  aria-label="Close settings"
                  className="rounded-md border border-ink/15 bg-white px-3 py-2 text-base font-black text-ink shadow-sm"
                >
                  X
                </button>
              </div>

              {errorMessage ? (
                <p className="mt-3 rounded-md border border-marigold/50 bg-marigold/20 px-3 py-2 text-sm font-bold text-ink">
                  {errorMessage}
                </p>
              ) : null}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-black text-ink/70">
                  Language
                  {canEditSettings ? (
                    <select
                      value={settings.language}
                      onChange={(event) =>
                        handleRoomSettingChange("language", event.target.value as RoomSettings["language"])
                      }
                      className="rounded-md border border-ink/15 bg-white px-3 py-3 text-base font-black text-ink outline-none ring-palm/25 transition focus:border-palm focus:ring-4"
                    >
                      {LANGUAGE_OPTIONS.map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-md border border-ink/10 bg-paper px-3 py-3 text-base text-ink">
                      {settings.language}
                    </span>
                  )}
                </label>

                <label className="grid gap-1 text-sm font-black text-ink/70">
                  Rounds
                  {canEditSettings ? (
                    <select
                      value={settings.rounds}
                      onChange={(event) =>
                        handleRoomSettingChange("rounds", Number(event.target.value) as RoomSettings["rounds"])
                      }
                      className="rounded-md border border-ink/15 bg-white px-3 py-3 text-base font-black text-ink outline-none ring-palm/25 transition focus:border-palm focus:ring-4"
                    >
                      {ROUND_OPTIONS.map((roundCount) => (
                        <option key={roundCount} value={roundCount}>
                          {roundCount}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-md border border-ink/10 bg-paper px-3 py-3 text-base text-ink">
                      {settings.rounds}
                    </span>
                  )}
                </label>

                <label className="grid gap-1 text-sm font-black text-ink/70">
                  Round time
                  {canEditSettings ? (
                    <select
                      value={settings.roundDurationSeconds}
                      onChange={(event) =>
                        handleRoomSettingChange(
                          "roundDurationSeconds",
                          Number(event.target.value) as RoomSettings["roundDurationSeconds"]
                        )
                      }
                      className="rounded-md border border-ink/15 bg-white px-3 py-3 text-base font-black text-ink outline-none ring-palm/25 transition focus:border-palm focus:ring-4"
                    >
                      {ROUND_DURATION_OPTIONS.map((duration) => (
                        <option key={duration} value={duration}>
                          {duration}s
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-md border border-ink/10 bg-paper px-3 py-3 text-base text-ink">
                      {settings.roundDurationSeconds}s
                    </span>
                  )}
                </label>

                <label className="grid gap-1 text-sm font-black text-ink/70">
                  Category
                  {canEditSettings ? (
                    <select
                      value={settings.category}
                      onChange={(event) =>
                        handleRoomSettingChange("category", event.target.value as RoomSettings["category"])
                      }
                      className="rounded-md border border-ink/15 bg-white px-3 py-3 text-base font-black text-ink outline-none ring-palm/25 transition focus:border-palm focus:ring-4"
                    >
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-md border border-ink/10 bg-paper px-3 py-3 text-base text-ink">
                      {settings.category}
                    </span>
                  )}
                </label>

                <label className="grid gap-1 text-sm font-black text-ink/70 sm:col-span-2">
                  Difficulty
                  {canEditSettings ? (
                    <select
                      value={settings.difficulty}
                      onChange={(event) =>
                        handleRoomSettingChange("difficulty", event.target.value as RoomSettings["difficulty"])
                      }
                      className="rounded-md border border-ink/15 bg-white px-3 py-3 text-base font-black text-ink outline-none ring-palm/25 transition focus:border-palm focus:ring-4"
                    >
                      {DIFFICULTY_OPTIONS.map((difficulty) => (
                        <option key={difficulty} value={difficulty}>
                          {difficulty}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-md border border-ink/10 bg-paper px-3 py-3 text-base text-ink">
                      {settings.difficulty}
                    </span>
                  )}
                </label>
              </div>
            </section>
          </div>
        ) : null}

        <section className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-palm">
                {gameState?.hasActiveRound ? "Current turn" : gameState?.gameOver ? "Game over" : "Ready"}
              </p>
              {gameState?.hasActiveRound ? (
                <span className="rounded-full bg-ink px-3 py-1 text-sm font-black text-white">
                  {gameState.isChoosingWord ? "Choosing" : `${gameState.secondsRemaining}s`}
                </span>
              ) : null}
            </div>
            <h2 className="mt-1 text-2xl font-black">
              {gameState?.hasActiveRound
                ? gameState.isChoosingWord
                  ? gameState.isDrawer
                    ? "Choose your word"
                    : "Waiting for drawer"
                  : gameState.isDrawer
                    ? "You are drawing"
                    : `${gameState.drawerName} is drawing`
                : gameState?.gameOver
                  ? "Final scores are in"
                  : `Start a ${settings.language} word round`}
            </h2>
            {gameState?.hasActiveRound ? (
              <p className="mt-2 text-sm font-bold text-ink/60">
                Round {gameState.currentRoundNumber} of {gameState.selectedRounds} · Turn{" "}
                {gameState.currentTurnInRound} of {gameState.turnsPerRound}
              </p>
            ) : gameState?.gameOver ? (
              <p className="mt-2 text-sm font-bold text-ink/60">
                Completed {gameState.totalTurns} drawing turns.
              </p>
            ) : (
              <p className="mt-2 text-sm font-bold text-ink/60">
                Each player draws once per selected round.
              </p>
            )}
          </div>
          <div className="rounded-md bg-paper px-4 py-3">
            {gameState?.hasActiveRound ? (
              gameState.isChoosingWord ? (
                gameState.isDrawer ? (
                  <>
                    <p className="text-sm font-bold text-ink/60">Pick one Telugu word to draw</p>
                    <div className="mt-3 grid gap-2">
                      {gameState.wordChoices.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => handleSelectWord(choice.id)}
                          className="rounded-md border border-palm/30 bg-white px-4 py-3 text-left text-2xl font-black text-ink shadow-sm transition hover:border-palm active:scale-[0.99]"
                        >
                          {choice.displayWord}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-ink/60">Waiting</p>
                    <p className="mt-1 text-xl font-black">Waiting for drawer to choose a word</p>
                  </>
                )
              ) : gameState.isDrawer ? (
                <>
                  <p className="text-sm font-bold text-ink/60">Draw this Telugu word</p>
                  <p className="mt-1 text-3xl font-black">{gameState.word?.displayWord}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-ink/60">
                    {gameState.hasGuessedCorrectly ? "You guessed correctly" : "Guess in English"}
                  </p>
                  <p className="mt-1 break-words font-mono text-2xl font-black tracking-normal">
                    {gameState.hasGuessedCorrectly ? "Correct!" : gameState.word?.hint}
                  </p>
                </>
              )
            ) : (
              <p className="text-base font-semibold text-ink/70">
                {gameState?.gameOver
                  ? "The host can start another match with a new round count."
                  : "The host picks the number of rounds, then starts the game."}
              </p>
            )}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-ink/10 bg-white p-2 shadow-sm">
            {gameState?.gameOver && winner ? (
              <section className="flex min-h-[360px] flex-col items-center justify-center rounded-md bg-paper px-4 py-10 text-center">
                <div className="animate-[winnerScale_700ms_cubic-bezier(0.34,1.56,0.64,1)_both] rounded-lg border border-marigold/70 bg-white px-6 py-7 shadow-sm">
                  <div className="mx-auto flex h-20 w-20 animate-bounce items-center justify-center rounded-full bg-marigold text-5xl">
                    🏆
                  </div>
                  <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-palm">Winner!</p>
                  <h2 className="mt-2 text-4xl font-black tracking-normal text-ink">{winner.nickname}</h2>
                  <p className="mt-2 text-lg font-bold text-ink/70">Final score: {winner.score}</p>
                </div>

                <div className="mt-6 grid w-full max-w-sm gap-2 sm:grid-cols-2">
                  {gameState.isHost ? (
                    <button
                      type="button"
                      onClick={handleStartGame}
                      className="rounded-md bg-palm px-4 py-3 text-base font-black text-white shadow-sm transition active:scale-[0.99]"
                    >
                      Play Again
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleLeaveRoom}
                    className="rounded-md border border-ink/15 bg-white px-4 py-3 text-base font-black text-ink shadow-sm transition active:scale-[0.99]"
                  >
                    Back to Home
                  </button>
                </div>
              </section>
            ) : (
              <canvas
                ref={canvasRef}
                className={`h-[56vh] min-h-[360px] w-full touch-none rounded-md bg-white ${
                  gameState?.hasActiveRound && (!gameState.isDrawer || gameState.isChoosingWord)
                    ? "cursor-not-allowed"
                    : "cursor-crosshair"
                }`}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
                onPointerLeave={stopDrawing}
              />
            )}
          </div>

          <aside className="grid gap-4">
            <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black">Scoreboard</h2>
                <span className="rounded-full bg-palm/10 px-3 py-1 text-sm font-black text-palm">
                  {players.length}
                </span>
              </div>
              <ul className="mt-4 grid gap-2">
                {(gameState?.scoreboard.length ? gameState.scoreboard : players.map((player) => ({ ...player, score: 0 }))).map(
                  (player) => (
                    <li
                      key={player.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-ink/10 px-3 py-2 font-semibold"
                    >
                      <span>{player.nickname}</span>
                      <span className="font-black">{player.score}</span>
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-black">Guesses</h2>
              <div className="mt-3 grid max-h-48 gap-2 overflow-y-auto rounded-md bg-paper p-3">
                {gameState?.messages.length ? (
                  gameState.messages.map((message) => (
                    <p
                      key={message.id}
                      className={`text-sm font-semibold ${
                        message.type === "correct" ? "text-palm" : message.type === "guess" ? "text-ink" : "text-ink/60"
                      }`}
                    >
                      {message.text}
                    </p>
                  ))
                ) : (
                  <p className="text-sm font-semibold text-ink/60">No guesses yet.</p>
                )}
              </div>

              <form className="mt-3 grid gap-2" onSubmit={handleSubmitGuess}>
                <input
                  value={guess}
                  onChange={(event) => setGuess(event.target.value)}
                  disabled={!canGuess}
                  maxLength={60}
                  placeholder={
                    gameState?.isChoosingWord
                      ? "Waiting for word"
                      : gameState?.isDrawer
                        ? "Drawer cannot guess"
                        : "Type English answer"
                  }
                  className="w-full rounded-md border border-ink/15 bg-white px-4 py-3 text-base outline-none ring-palm/25 transition focus:border-palm focus:ring-4 disabled:cursor-not-allowed disabled:bg-ink/5"
                />
                <button
                  type="submit"
                  disabled={!canGuess || !guess.trim()}
                  className="rounded-md bg-ink px-4 py-3 text-base font-black text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-ink/25"
                >
                  Send Guess
                </button>
              </form>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
