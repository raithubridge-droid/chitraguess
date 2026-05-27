"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useRouter, useSearchParams } from "next/navigation";
import { GameState, getSocket, Player, Point, RoomSettings, StrokePayload } from "@/app/lib/socket";
import SketchItLogo from "@/app/components/sketchit-logo";

const DEFAULT_PEN_COLOR = "#1d2530";
const DEFAULT_BRUSH_SIZE = 6;
const TOOL_COLORS = [
  { name: "black", value: "#1d2530" },
  { name: "red", value: "#e63946" },
  { name: "blue", value: "#2563eb" },
  { name: "green", value: "#16825d" },
  { name: "yellow", value: "#f4b942" },
  { name: "orange", value: "#f97316" },
  { name: "purple", value: "#8b5cf6" },
  { name: "brown", value: "#8b5a2b" },
  { name: "white", value: "#ffffff" }
] as const;
const BRUSH_SIZES = [
  { label: "Small", value: 4 },
  { label: "Medium", value: 8 },
  { label: "Large", value: 14 },
  { label: "XL", value: 22 }
] as const;
const STORAGE_KEYS = ["chitraguess:nickname", "chitraguess:roomCode"];
const INVITE_URL = "https://sketchit-game.vercel.app";
const DEFAULT_SETTINGS: RoomSettings = {
  language: "Telugu",
  rounds: 3,
  roundDurationSeconds: 120,
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
  "Farming",
  "Animals",
  "Household",
  "School",
  "Nature",
  "Funny"
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

  if (stroke.points.length < 2) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const scale = rect.width > 0 ? canvas.width / rect.width : 1;
  context.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
  context.lineWidth = stroke.brushSize * scale;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
  stroke.points.slice(1).forEach((point) => {
    context.lineTo(point.x * canvas.width, point.y * canvas.height);
  });
  context.stroke();
}

function clearCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
}

function redrawCanvas(canvas: HTMLCanvasElement, strokes: StrokePayload[]) {
  clearCanvas(canvas);
  strokes.forEach((stroke) => drawStroke(canvas, stroke));
}

function upsertStroke(strokes: StrokePayload[], stroke: StrokePayload) {
  const existingIndex = strokes.findIndex((existingStroke) => existingStroke.id === stroke.id);
  if (existingIndex >= 0) {
    return strokes.map((existingStroke, index) => (index === existingIndex ? stroke : existingStroke));
  }

  return [...strokes, stroke];
}

function HintTiles({ hint }: { hint: string }) {
  const hintParts = hint.split(" ");

  return (
    <div className="mt-3 flex max-w-full flex-wrap items-center gap-1.5 sm:gap-2" aria-label={`Hint: ${hint}`}>
      {hintParts.map((part, index) =>
        part === "" ? (
          <span key={`${hint}-${index}`} className="w-3" aria-hidden="true" />
        ) : (
          <span
            key={`${hint}-${index}`}
            className={`inline-flex h-10 min-w-8 items-center justify-center rounded-md border px-2 font-mono text-xl font-black uppercase shadow-sm sm:h-12 sm:min-w-10 sm:text-2xl ${
              part === "_"
                ? "border-ink/10 bg-white text-ink/35"
                : "animate-[hintReveal_360ms_ease-out_both] border-palm/25 bg-palm/10 text-palm"
            }`}
          >
            {part}
          </span>
        )
      )}
    </div>
  );
}

async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      return document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

function roomPlayerId(code: string) {
  const storageKey = `sketchit:playerId:${code}`;
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const nextId = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, nextId);
  return nextId;
}

export default function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const celebratedGameOverRef = useRef(false);
  const currentStrokeRef = useRef<StrokePayload | null>(null);
  const strokesRef = useRef<StrokePayload[]>([]);
  const isMessagesAtBottomRef = useRef(true);
  const previousLastMessageIdRef = useRef<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState("Connecting...");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [guess, setGuess] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [penColor, setPenColor] = useState(DEFAULT_PEN_COLOR);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);
  const [activeTool, setActiveTool] = useState<StrokePayload["tool"]>("brush");
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const nickname = searchParams.get("nickname")?.trim() || "Guest";

  useEffect(() => {
    const socket = getSocket();

    function handlePlayers(nextPlayers: Player[]) {
      setPlayers(nextPlayers);
    }

    function handleStroke(stroke: StrokePayload) {
      const canvas = canvasRef.current;
      strokesRef.current = upsertStroke(strokesRef.current, stroke);
      if (canvas) {
        redrawCanvas(canvas, strokesRef.current);
      }
    }

    function handleClear() {
      strokesRef.current = [];
      const canvas = canvasRef.current;
      if (canvas) {
        clearCanvas(canvas);
      }
    }

    function handleDrawingHistory(strokes: StrokePayload[]) {
      strokesRef.current = strokes;
      const canvas = canvasRef.current;
      if (canvas) {
        redrawCanvas(canvas, strokesRef.current);
      }
    }

    function handleGameState(nextGameState: GameState) {
      setGameState(nextGameState);
    }

    function handleErrorMessage(message: string) {
      setErrorMessage(message);
    }

    socket.connect();
    const clientId = roomPlayerId(code);
    setStatus(socket.connected ? "Connected" : "Connecting...");
    socket.emit("join-room", { code, nickname, clientId });

    socket.on("connect", () => {
      setStatus("Connected");
      socket.emit("join-room", { code, nickname, clientId });
    });
    socket.on("disconnect", () => setStatus("Disconnected"));
    socket.on("players", handlePlayers);
    socket.on("draw-stroke", handleStroke);
    socket.on("clear-canvas", handleClear);
    socket.on("drawing-history", handleDrawingHistory);
    socket.on("game-state", handleGameState);
    socket.on("error-message", handleErrorMessage);

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("players", handlePlayers);
      socket.off("draw-stroke", handleStroke);
      socket.off("clear-canvas", handleClear);
      socket.off("drawing-history", handleDrawingHistory);
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
      redrawCanvas(canvas, strokesRef.current);
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

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setErrorMessage(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [errorMessage]);

  const lastMessageId = gameState?.messages.at(-1)?.id ?? null;

  function scrollMessagesToBottom(behavior: ScrollBehavior = "smooth") {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior
    });
    isMessagesAtBottomRef.current = true;
    setHasNewMessages(false);
  }

  function handleMessagesScroll() {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isAtBottom = distanceFromBottom < 48;
    isMessagesAtBottomRef.current = isAtBottom;
    if (isAtBottom) {
      setHasNewMessages(false);
    }
  }

  useEffect(() => {
    if (!lastMessageId) {
      return;
    }

    const previousLastMessageId = previousLastMessageIdRef.current;
    previousLastMessageIdRef.current = lastMessageId;

    requestAnimationFrame(() => {
      if (!previousLastMessageId || isMessagesAtBottomRef.current) {
        scrollMessagesToBottom(previousLastMessageId ? "smooth" : "auto");
        return;
      }

      setHasNewMessages(true);
    });
  }, [lastMessageId]);

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!gameState?.hasActiveRound || !gameState.isDrawer || gameState.isChoosingWord || gameState.gamePaused) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointerToPoint(event.currentTarget, event);
    currentStrokeRef.current = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      points: [point],
      color: activeTool === "eraser" ? "#ffffff" : penColor,
      brushSize,
      tool: activeTool
    };
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!gameState?.hasActiveRound || !gameState.isDrawer || gameState.isChoosingWord || gameState.gamePaused) {
      return;
    }

    event.preventDefault();
    const stroke = currentStrokeRef.current;
    if (!stroke) {
      return;
    }
    if (stroke.points.length >= 500) {
      return;
    }

    const canvas = event.currentTarget;
    const nextStroke = {
      ...stroke,
      points: [...stroke.points, pointerToPoint(canvas, event)]
    };
    currentStrokeRef.current = nextStroke;
    strokesRef.current = upsertStroke(strokesRef.current, nextStroke);
    redrawCanvas(canvas, strokesRef.current);
    getSocket().emit("draw-stroke", { code, stroke: nextStroke });
  }

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const stroke = currentStrokeRef.current;
    if (stroke && stroke.points.length === 1) {
      const point = stroke.points[0];
      const nextStroke = { ...stroke, points: [point, point] };
      strokesRef.current = upsertStroke(strokesRef.current, nextStroke);
      redrawCanvas(event.currentTarget, strokesRef.current);
      getSocket().emit("draw-stroke", { code, stroke: nextStroke });
    }
    currentStrokeRef.current = null;
  }

  function handleClearCanvas() {
    if (gameState?.gameStarted && (!gameState.hasActiveRound || !gameState.isDrawer)) {
      return;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      clearCanvas(canvas);
    }
    getSocket().emit("clear-canvas", { code });
  }

  function handleUndoStroke() {
    if (!canDraw) {
      return;
    }

    getSocket().emit("undo-stroke", { code });
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

  async function handleCopyRoomCode() {
    if (await copyTextToClipboard(code)) {
      setErrorMessage("Room code copied!");
    } else {
      setErrorMessage("Could not copy room code. Please copy it manually.");
    }
  }

  async function handleInviteFriends() {
    const inviteMessage = `Join my SketchIt room 🎨
Draw Telugu words and guess with friends!

Room Code: ${code}
Play here: ${INVITE_URL}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join my SketchIt room",
          text: inviteMessage,
          url: INVITE_URL
        });
      } else {
        const copied = await copyTextToClipboard(inviteMessage);
        if (!copied) {
          throw new Error("Clipboard unavailable");
        }
      }

      setErrorMessage("Invite copied!");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (await copyTextToClipboard(inviteMessage)) {
        setErrorMessage("Invite copied!");
      } else {
        setErrorMessage("Could not share invite. Please copy the room code manually.");
      }
    }
  }

  const canGuess =
    Boolean(gameState?.hasActiveRound) &&
    !gameState?.isChoosingWord &&
    !gameState?.isDrawer &&
    !gameState?.hasGuessedCorrectly &&
    !gameState?.gamePaused;
  const canDraw = Boolean(
    gameState?.hasActiveRound && gameState.isDrawer && !gameState.isChoosingWord && !gameState.gamePaused
  );
  const canClearCanvas = canDraw;
  const canStartGame = Boolean(gameState?.isHost) && !gameState?.gameStarted;
  const settings = gameState?.settings ?? DEFAULT_SETTINGS;
  const settingsLocked = Boolean(gameState?.gameStarted || gameState?.gameOver);
  const canEditSettings = Boolean(gameState?.isHost && !settingsLocked);
  const showMobileGuessBar = Boolean(gameState?.gameStarted && !gameState.gameOver && !gameState.isDrawer);
  const winner = gameState?.scoreboard.reduce((topPlayer, player) => {
    if (!topPlayer || player.score > topPlayer.score) {
      return player;
    }

    return topPlayer;
  }, gameState.scoreboard[0]);
  const scoreboardEntries = gameState?.scoreboard.length
    ? gameState.scoreboard
    : players.map((player) => ({ ...player, score: 0 }));
  const phaseLabel = gameState?.gameOver
    ? "Game over"
    : gameState?.gamePaused
      ? "Paused"
      : gameState?.hasActiveRound
        ? gameState.isChoosingWord
          ? "Choosing"
          : "Drawing"
        : "Lobby";
  const statusTitle = gameState?.gamePaused
    ? "Waiting for players"
    : gameState?.hasActiveRound
      ? gameState.isChoosingWord
        ? gameState.isDrawer
          ? "Choose your word"
          : "Waiting for artist..."
        : gameState.isDrawer
          ? "🎨 Your turn to draw"
          : `${gameState.drawerName} is drawing`
      : gameState?.gameOver
        ? "Final scores are in"
        : "Ready to draw?";
  const roundSummary = gameState?.gamePaused
    ? (gameState.pausedMessage ?? "Waiting for one more player to continue.")
    : gameState?.hasActiveRound
      ? `Round ${gameState.currentRoundNumber} of ${gameState.selectedRounds} · Turn ${gameState.currentTurnInRound} of ${gameState.turnsPerRound}`
      : gameState?.gameOver
        ? `Completed ${gameState.totalTurns} drawing turns.`
        : "Guess fast! Each player draws once per selected round.";

  return (
    <main
      className={`min-h-screen bg-[radial-gradient(circle_at_top_left,#fff3cf,transparent_34%),linear-gradient(180deg,#fffaf1_0%,#f7efe1_100%)] px-2 py-2 text-ink sm:px-5 sm:py-5 lg:pb-8 ${
        showMobileGuessBar ? "pb-28" : "pb-5"
      }`}
    >
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-2 lg:gap-4">
        <header className="relative z-30 rounded-lg border border-ink/10 bg-white/95 p-1.5 shadow-lg shadow-ink/5 backdrop-blur sm:p-4 lg:sticky lg:top-3 lg:z-40">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <button type="button" onClick={handleLeaveRoom} className="min-w-0 text-left">
              <span className="inline-flex rounded-md bg-ink p-1 shadow-sm sm:rounded-lg">
                <SketchItLogo size="xs" className="rounded" />
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">Room</span>
                <span className="min-w-0 truncate text-xl font-black tracking-normal sm:text-3xl">{code}</span>
                <button
                  type="button"
                  onClick={handleCopyRoomCode}
                  aria-label={`Copy room code ${code}`}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ink/15 bg-white text-ink shadow-sm transition hover:border-ink/30 active:scale-[0.98] sm:h-10 sm:w-auto sm:gap-1 sm:px-3 sm:py-2 sm:text-sm sm:font-black"
                >
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h10v12H8z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span className="hidden sm:inline">Copy</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setIsSettingsOpen(true);
                }}
                title={settingsLocked ? "Settings locked after game starts" : "Room settings"}
                aria-label="Room settings"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ink/15 bg-white text-ink shadow-sm transition active:scale-[0.98] sm:h-12 sm:w-12"
              >
                <span aria-hidden="true" className="text-base sm:text-xl">⚙️</span>
                <svg aria-hidden="true" className="hidden h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 3.75h3l.55 2.2a6.9 6.9 0 0 1 1.45.6l1.95-1.17 2.12 2.12-1.17 1.95c.25.46.45.94.6 1.45l2.25.6v3l-2.25.55a6.9 6.9 0 0 1-.6 1.45l1.17 1.95-2.12 2.12-1.95-1.17c-.46.25-.94.45-1.45.6l-.55 2.25h-3l-.6-2.25a6.9 6.9 0 0 1-1.45-.6l-1.95 1.17-2.12-2.12 1.17-1.95a6.9 6.9 0 0 1-.6-1.45L2.75 14.5v-3l2.2-.6c.15-.51.35-.99.6-1.45L4.38 7.5 6.5 5.38l1.95 1.17c.46-.25.94-.45 1.45-.6l.6-2.2Z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mt-1.5 grid gap-1.5 sm:mt-3 sm:flex sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-palm/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-palm sm:px-3 sm:py-1 sm:text-xs">
                {phaseLabel}
              </span>
              <span className="rounded-full bg-marigold/25 px-2 py-0.5 text-[10px] font-black text-ink sm:px-3 sm:py-1 sm:text-xs">
                {settings.language} · {settings.category}
              </span>
              <span className="text-xs font-bold text-ink/55">{status}</span>
            </div>
            <button
              type="button"
              onClick={handleInviteFriends}
              className="inline-flex min-h-8 items-center justify-center gap-1 rounded-md bg-marigold px-3 py-1 text-xs font-black text-ink shadow-sm transition hover:bg-marigold/85 active:scale-[0.98] sm:min-h-10 sm:px-3 sm:py-2 sm:text-sm"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m7 9 5-5 5 5" />
              </svg>
              Invite Friends
            </button>
            <div className="grid grid-cols-2 gap-1.5 sm:flex sm:gap-2">
              {canStartGame ? (
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="rounded-md bg-palm px-3 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-palm/90 active:scale-[0.98] sm:px-4 sm:py-2.5 sm:text-sm"
                >
                  {gameState?.gameOver ? "🏆 Play Again" : "🎨 Start Game"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleLeaveRoom}
                className="rounded-md border border-ink/15 bg-white px-3 py-1.5 text-xs font-black text-ink shadow-sm transition hover:border-ink/30 active:scale-[0.98] sm:px-4 sm:py-2.5 sm:text-sm"
              >
                Back Home
              </button>
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div
            role="alert"
            className="rounded-lg border border-marigold/60 bg-white px-4 py-3 text-sm font-black text-ink shadow-lg shadow-ink/5"
          >
            {errorMessage}
          </div>
        ) : null}

        {isSettingsOpen ? (
          <div className="fixed inset-0 z-50 flex items-end bg-ink/40 p-3 sm:items-center sm:justify-center">
            <section className="w-full rounded-lg border border-ink/10 bg-white p-4 shadow-xl sm:max-w-2xl">
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
                    <span className="rounded-md border border-ink/10 bg-paper px-3 py-3 text-base text-ink">{settings.language}</span>
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
                    <span className="rounded-md border border-ink/10 bg-paper px-3 py-3 text-base text-ink">{settings.rounds}</span>
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
                    <span className="rounded-md border border-ink/10 bg-paper px-3 py-3 text-base text-ink">{settings.category}</span>
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
                    <span className="rounded-md border border-ink/10 bg-paper px-3 py-3 text-base text-ink">{settings.difficulty}</span>
                  )}
                </label>
              </div>
            </section>
          </div>
        ) : null}

        <section className="rounded-lg border border-ink/10 bg-white/95 p-1.5 shadow-lg shadow-ink/5 sm:p-4">
          <div className="grid gap-1.5 sm:gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-palm sm:text-xs">సూపర్! Current game</p>
                <h1 className="text-lg font-black tracking-normal sm:mt-1 sm:text-3xl">{statusTitle}</h1>
                <p className="mt-0.5 truncate text-xs font-bold text-ink/60 sm:mt-1 sm:text-sm">{roundSummary}</p>
              </div>
              <p className="shrink-0 rounded-full bg-ink/5 px-2 py-0.5 text-xs font-black text-ink sm:px-3 sm:py-2 sm:text-xl">
                ⏱ {gameState?.hasActiveRound && !gameState.isChoosingWord ? `${gameState.secondsRemaining}s` : "--"}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center sm:gap-2">
              <div className="rounded-md bg-paper px-2 py-1 sm:px-3 sm:py-2">
                <p className="text-[9px] font-black uppercase text-ink/50 sm:text-[10px]">Players</p>
                <p className="text-base font-black sm:text-xl">{players.length}</p>
              </div>
              <div className="rounded-md bg-paper px-2 py-1 sm:px-3 sm:py-2">
                <p className="text-[9px] font-black uppercase text-ink/50 sm:text-[10px]">Round</p>
                <p className="text-base font-black sm:text-xl">{gameState?.currentRoundNumber || 0}/{settings.rounds}</p>
              </div>
              <div className="rounded-md bg-paper px-2 py-1 sm:px-3 sm:py-2">
                <p className="text-[9px] font-black uppercase text-ink/50 sm:text-[10px]">Mode</p>
                <p className="text-xs font-black leading-6 sm:text-sm">{settings.difficulty}</p>
              </div>
            </div>
          </div>

          <div className="mt-1.5 rounded-md bg-paper px-2.5 py-1.5 sm:mt-3 sm:px-4 sm:py-3">
            {gameState?.gamePaused ? (
              <>
                <p className="text-sm font-bold text-ink/60">Game paused</p>
                <p className="mt-1 text-xl font-black">{gameState.pausedMessage ?? "Waiting for one more player to continue."}</p>
              </>
            ) : gameState?.hasActiveRound ? (
              gameState.isChoosingWord ? (
                gameState.isDrawer ? (
                  <>
                    <p className="text-sm font-bold text-ink/60">Ready to draw? Pick one {settings.language} word</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {gameState.wordChoices.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => handleSelectWord(choice.id)}
                          className="rounded-md border border-palm/30 bg-white px-4 py-3 text-left text-2xl font-black text-ink shadow-sm transition hover:border-palm hover:bg-palm/5 active:scale-[0.98]"
                        >
                          {choice.displayWord}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-ink/60">Waiting for artist...</p>
                    <p className="mt-1 text-xl font-black">The word is loading in their secret sketch brain.</p>
                  </>
                )
              ) : gameState.isDrawer ? (
                <>
                  <p className="text-sm font-bold text-ink/60">🎨 Draw this {settings.language} word</p>
                  <p className="mt-1 text-4xl font-black tracking-normal">{gameState.word?.displayWord}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-ink/60">
                    {gameState.hasGuessedCorrectly ? "బాగా గెస్ చేశావ్!" : "🔥 Guess fast!"}
                  </p>
                  {gameState.hasGuessedCorrectly ? (
                    <p className="mt-1 text-3xl font-black tracking-normal text-palm">Nice guess!</p>
                  ) : gameState.word?.hint ? (
                    <>
                      <HintTiles hint={gameState.word.hint} />
                      <p className="mt-2 text-xs font-black uppercase tracking-[0.08em] text-ink/45">
                        More letters reveal every 30 seconds
                      </p>
                    </>
                  ) : null}
                  {!gameState.hasGuessedCorrectly && gameState.secondsRemaining <= 20 ? (
                    <p className="mt-2 text-sm font-black text-palm">Almost there!</p>
                  ) : null}
                </>
              )
            ) : (
              <p className="text-base font-semibold text-ink/70">
                {gameState?.gameOver
                  ? "అభినందనలు! The host can start another match when everyone is ready."
                  : "Waiting for players. Ready to draw when at least two friends join."}
              </p>
            )}
          </div>
        </section>

        <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:items-start">
          <section className="order-2 rounded-lg border border-ink/10 bg-white/95 p-3 shadow-lg shadow-ink/5 lg:order-1">
            <details open className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <h2 className="text-lg font-black">🏆 Scoreboard</h2>
                <span className="rounded-full bg-palm/10 px-3 py-1 text-sm font-black text-palm">{players.length}</span>
              </summary>
              <ul className="mt-3 grid gap-2">
                {scoreboardEntries.length ? (
                  scoreboardEntries.map((player, index) => (
                    <li
                      key={player.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-ink/10 bg-white px-3 py-2 font-semibold"
                    >
                      <span className="min-w-0 truncate">
                        <span className="mr-2 text-ink/40">#{index + 1}</span>
                        {player.nickname}
                      </span>
                      <span className="rounded-full bg-marigold/30 px-2 py-1 text-sm font-black">{player.score}</span>
                    </li>
                  ))
                ) : (
                  <li className="rounded-md bg-paper px-3 py-3 text-sm font-bold text-ink/60">Waiting for players to join.</li>
                )}
              </ul>
            </details>
          </section>

          <section className="order-1 grid gap-3 lg:order-2">
            <div className="rounded-lg border border-ink/10 bg-white p-1 shadow-lg shadow-ink/5 sm:p-2">
              {gameState?.gameOver && winner ? (
                <section className="flex min-h-[360px] flex-col items-center justify-center rounded-md bg-paper px-4 py-10 text-center sm:min-h-[460px]">
                  <div className="animate-[winnerScale_700ms_cubic-bezier(0.34,1.56,0.64,1)_both] rounded-lg border border-marigold/70 bg-white px-6 py-7 shadow-sm">
                    <div className="mx-auto flex h-20 w-20 animate-bounce items-center justify-center rounded-full bg-marigold text-5xl">
                      🏆
                    </div>
                    <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-palm">Champion!</p>
                    <h2 className="mt-2 text-4xl font-black tracking-normal text-ink">{winner.nickname}</h2>
                    <p className="mt-2 text-2xl font-black text-palm">అభినందనలు!</p>
                    <p className="mt-2 text-lg font-bold text-ink/70">Final score: {winner.score}</p>
                  </div>

                  <div className="mt-6 grid w-full max-w-sm gap-2 sm:grid-cols-2">
                    {gameState.isHost ? (
                      <button
                        type="button"
                        onClick={handleStartGame}
                        className="rounded-md bg-palm px-4 py-3 text-base font-black text-white shadow-sm transition hover:bg-palm/90 active:scale-[0.98]"
                      >
                        🎨 Play Again
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleLeaveRoom}
                      className="rounded-md border border-ink/15 bg-white px-4 py-3 text-base font-black text-ink shadow-sm transition hover:border-ink/30 active:scale-[0.98]"
                    >
                      Back to Home
                    </button>
                  </div>
                </section>
              ) : (
                <canvas
                  ref={canvasRef}
                  className={`h-[48vh] min-h-[330px] w-full touch-none rounded-md bg-white shadow-inner sm:h-[58vh] sm:min-h-[440px] lg:h-[62vh] ${
                    gameState?.gameStarted && !canDraw ? "cursor-not-allowed" : "cursor-crosshair"
                  }`}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerCancel={stopDrawing}
                  onPointerLeave={stopDrawing}
                />
              )}
            </div>

            <section className="rounded-lg border border-ink/10 bg-white/95 p-3 shadow-lg shadow-ink/5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-ink/60">Tools</span>
                {TOOL_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    disabled={!canDraw}
                    onClick={() => {
                      setPenColor(color.value);
                      setActiveTool("brush");
                    }}
                    aria-label={`Use ${color.name}`}
                    className={`h-9 w-9 rounded-full border-2 shadow-sm transition hover:scale-105 active:scale-95 ${
                      penColor === color.value && activeTool === "brush" ? "border-ink" : "border-white"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
                <button
                  type="button"
                  disabled={!canDraw}
                  onClick={() => setActiveTool((tool) => (tool === "eraser" ? "brush" : "eraser"))}
                  className={`rounded-md px-3 py-2 text-sm font-black shadow-sm transition hover:border-ink/30 active:scale-[0.98] ${
                    activeTool === "eraser" ? "bg-ink text-white" : "border border-ink/15 bg-white text-ink"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  Eraser
                </button>
                <button
                  type="button"
                  onClick={handleUndoStroke}
                  disabled={!canDraw}
                  className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-black text-ink shadow-sm transition hover:border-ink/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={handleClearCanvas}
                  disabled={!canClearCanvas}
                  className="rounded-md bg-marigold px-3 py-2 text-sm font-black text-ink shadow-sm transition hover:bg-marigold/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink/15"
                >
                  Clear
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-ink/60">Brush size</span>
                {BRUSH_SIZES.map((size) => (
                  <button
                    key={size.value}
                    type="button"
                    disabled={!canDraw}
                    onClick={() => setBrushSize(size.value)}
                    className={`min-h-10 rounded-md px-3 py-2 text-sm font-black shadow-sm transition active:scale-[0.98] ${
                      brushSize === size.value
                        ? "bg-palm text-white"
                        : "border border-ink/15 bg-white text-ink hover:border-ink/30"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
              {!canDraw && gameState?.gameStarted && !gameState?.gameOver ? (
                <p className="mt-2 text-sm font-bold text-ink/55">Only the current drawer can use the canvas.</p>
              ) : null}
            </section>
          </section>

          <aside className="order-3 rounded-lg border border-ink/10 bg-white/95 p-3 shadow-lg shadow-ink/5">
            <h2 className="text-lg font-black">🔥 Guesses</h2>
            <div className="relative mt-3">
              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="grid h-56 content-start gap-2 overflow-y-auto rounded-md bg-paper p-3 scroll-smooth lg:h-[52vh]"
              >
                {gameState?.messages.length ? (
                  gameState.messages.map((message) => (
                    <p
                      key={message.id}
                      className={`rounded-md px-2 py-1 text-sm font-semibold ${
                        message.type === "correct"
                          ? "bg-palm/10 text-palm"
                          : message.type === "guess"
                            ? "bg-white text-ink"
                            : "text-ink/60"
                      }`}
                    >
                      {message.type === "correct" ? `${message.text} సూపర్!` : message.text}
                    </p>
                  ))
                ) : (
                  <p className="rounded-md bg-white px-3 py-3 text-sm font-bold text-ink/60">No guesses yet.</p>
                )}
              </div>
              {hasNewMessages ? (
                <button
                  type="button"
                  onClick={() => scrollMessagesToBottom()}
                  className="absolute bottom-3 left-1/2 min-h-10 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-black text-white shadow-lg transition hover:bg-ink/90 active:scale-[0.98]"
                >
                  New messages
                </button>
              ) : null}
            </div>

            <form className="mt-3 hidden gap-2 lg:grid" onSubmit={handleSubmitGuess}>
              <input
                value={guess}
                onChange={(event) => setGuess(event.target.value)}
                disabled={!canGuess}
                maxLength={60}
                placeholder={
                  gameState?.gamePaused
                    ? "Waiting for players"
                    : gameState?.isChoosingWord
                      ? "Waiting for word"
                      : gameState?.isDrawer
                        ? "Drawer cannot guess"
                        : "Type English answer"
                }
                className="w-full rounded-md border border-ink/15 bg-white px-4 py-3 text-base outline-none ring-palm/25 transition hover:border-ink/30 focus:border-palm focus:ring-4 disabled:cursor-not-allowed disabled:bg-ink/5"
              />
              <button
                type="submit"
                disabled={!canGuess || !guess.trim()}
                className="rounded-md bg-ink px-4 py-3 text-base font-black text-white shadow-sm transition hover:bg-ink/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink/25"
              >
                Guess fast!
              </button>
            </form>
          </aside>
        </div>

        {showMobileGuessBar ? (
          <form
            className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[1fr_auto] gap-2 border-t border-ink/10 bg-white/95 p-3 shadow-[0_-10px_30px_rgba(29,37,48,0.12)] backdrop-blur lg:hidden"
            onSubmit={handleSubmitGuess}
          >
            <input
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              disabled={!canGuess}
              maxLength={60}
              placeholder={
                gameState?.gamePaused
                  ? "Waiting for players"
                  : gameState?.isChoosingWord
                    ? "Waiting for word"
                    : "Type English answer"
              }
              className="min-w-0 rounded-md border border-ink/15 bg-white px-4 py-3 text-base outline-none ring-palm/25 transition hover:border-ink/30 focus:border-palm focus:ring-4 disabled:cursor-not-allowed disabled:bg-ink/5"
            />
            <button
              type="submit"
              disabled={!canGuess || !guess.trim()}
              className="rounded-md bg-ink px-4 py-3 text-base font-black text-white shadow-sm transition hover:bg-ink/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink/25"
            >
              Guess
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
