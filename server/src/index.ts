import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server, Socket } from "socket.io";
import { getWords, type RoomCategory, type RoomDifficulty, type TeluguWord, type WordLanguage } from "./words.js";

type Player = {
  id: string;
  nickname: string;
};

type PublicWordChoice = {
  id: string;
  displayWord: string;
};

type GameMessage = {
  id: string;
  text: string;
  type: "system" | "guess" | "correct";
};

type RoomSettingCategory = RoomCategory | "All";
type RoomSettingDifficulty = RoomDifficulty | "Mixed";

type RoomSettings = {
  language: WordLanguage;
  rounds: 2 | 3 | 5;
  roundDurationSeconds: 60 | 90 | 120;
  category: RoomSettingCategory;
  difficulty: RoomSettingDifficulty;
};

type RoomState = {
  players: Map<string, Player>;
  scores: Map<string, number>;
  messages: GameMessage[];
  gameStarted: boolean;
  gameOver: boolean;
  gamePaused: boolean;
  pausedMessage: string | null;
  settings: RoomSettings;
  playerOrder: string[];
  turnsCompleted: number;
  roundTimer: ReturnType<typeof setInterval> | null;
  currentRound: {
    drawerId: string;
    word: TeluguWord | null;
    wordChoices: TeluguWord[];
    hintRevealIndexes: number[];
    strokes: StrokePayload[];
    correctGuessers: Set<string>;
    endsAt: number | null;
  } | null;
};

type JoinRoomPayload = {
  code?: string;
  nickname?: string;
};

type StrokePayload = {
  id: string;
  points: Array<{
    x: number;
    y: number;
  }>;
  color: string;
  brushSize: number;
  tool: "brush" | "eraser";
};

const PORT = Number(process.env.PORT || 4000);
const LOCAL_CLIENT_URL = "http://localhost:3000";
const CLIENT_URL = process.env.CLIENT_URL;
const ALLOWED_CLIENT_ORIGINS = Array.from(
  new Set([LOCAL_CLIENT_URL, CLIENT_URL].filter((origin): origin is string => Boolean(origin)))
);
const ROUND_DURATION_SECONDS = 120;
const BASE_GUESS_POINTS = 10;
const FAST_GUESS_BONUS_POINTS = 5;
const DRAWER_BONUS_POINTS = 2;
const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  language: "Telugu",
  rounds: 3,
  roundDurationSeconds: ROUND_DURATION_SECONDS,
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

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_CLIENT_ORIGINS,
    methods: ["GET", "POST"]
  }
});

const rooms = new Map<string, RoomState>();
const socketRooms = new Map<string, string>();

app.use(cors({ origin: ALLOWED_CLIENT_ORIGINS }));

app.get("/", (_request, response) => {
  response.json({ app: "SketchIt", status: "ok" });
});

app.get("/health", (_request, response) => {
  response.json({ status: "ok", app: "SketchIt server" });
});

function normalizeRoomCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function roomCodeFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("code" in payload)) {
    return "";
  }

  const code = (payload as { code?: unknown }).code;
  return typeof code === "string" ? normalizeRoomCode(code) : "";
}

function normalizeNickname(nickname: string) {
  const cleaned = nickname.trim().slice(0, 24);
  return cleaned || "Guest";
}

function normalizeAnswer(answer: string) {
  return answer.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function logRoom(code: string, message: string, details?: Record<string, unknown>) {
  const suffix = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[room:${code}] ${message}${suffix}`);
}

function rejectAction(socket: Socket, code: string, message: string, details?: Record<string, unknown>) {
  logRoom(code || "unknown", `Rejected action: ${message}`, { socketId: socket.id, ...details });
  socket.emit("error-message", message);
}

function pickAllowedValue<T extends readonly (string | number)[]>(
  allowedValues: T,
  value: unknown,
  fallback: T[number]
): T[number] {
  return allowedValues.includes(value as T[number]) ? (value as T[number]) : fallback;
}

function normalizeRoomSettings(settings: Partial<RoomSettings>): RoomSettings {
  return {
    rounds: pickAllowedValue(ROUND_OPTIONS, settings.rounds, DEFAULT_ROOM_SETTINGS.rounds),
    language: pickAllowedValue(LANGUAGE_OPTIONS, settings.language, DEFAULT_ROOM_SETTINGS.language),
    roundDurationSeconds: pickAllowedValue(
      ROUND_DURATION_OPTIONS,
      settings.roundDurationSeconds,
      DEFAULT_ROOM_SETTINGS.roundDurationSeconds
    ),
    category: pickAllowedValue(CATEGORY_OPTIONS, settings.category, DEFAULT_ROOM_SETTINGS.category),
    difficulty: pickAllowedValue(DIFFICULTY_OPTIONS, settings.difficulty, DEFAULT_ROOM_SETTINGS.difficulty)
  };
}

function makeMessage(text: string, type: GameMessage["type"] = "system"): GameMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text,
    type
  };
}

function getOrCreateRoom(code: string) {
  const existing = rooms.get(code);
  if (existing) {
    return existing;
  }

  const nextRoom: RoomState = {
    players: new Map<string, Player>(),
    scores: new Map<string, number>(),
    messages: [],
    gameStarted: false,
    gameOver: false,
    gamePaused: false,
    pausedMessage: null,
    settings: { ...DEFAULT_ROOM_SETTINGS },
    playerOrder: [],
    turnsCompleted: 0,
    roundTimer: null,
    currentRound: null
  };
  rooms.set(code, nextRoom);
  return nextRoom;
}

function playersForRoom(code: string) {
  return Array.from(rooms.get(code)?.players.values() ?? []);
}

function hostIdForRoom(room: RoomState) {
  return room.players.keys().next().value as string | undefined;
}

function publicWordChoice(word: TeluguWord): PublicWordChoice {
  return {
    id: word.id,
    displayWord: word.displayWord
  };
}

function randomWordChoices(settings: RoomSettings) {
  const words = getWords(settings);
  const shuffledWords = [...words].sort(() => Math.random() - 0.5);
  const choices = shuffledWords.slice(0, 3);

  if (choices.length >= 3) {
    return choices;
  }

  for (const word of getWords(settings)) {
    if (!choices.some((choice) => choice.answer === word.answer)) {
      choices.push(word);
    }

    if (choices.length === 3) {
      break;
    }
  }

  return choices;
}

function revealCountForAnswer(answer: string) {
  if (!answer.trim()) {
    return 0;
  }

  const hiddenCharacterCount = answer.split("").filter((character) => /[a-z0-9]/i.test(character)).length;
  if (hiddenCharacterCount <= 1) {
    return 0;
  }

  if (hiddenCharacterCount <= 4) {
    return 1;
  }

  if (hiddenCharacterCount <= 8) {
    return 2;
  }

  return 3;
}

function makeHintRevealIndexes(answer: string) {
  const candidateIndexes = answer
    .split("")
    .map((character, index) => (/[a-z0-9]/i.test(character) ? index : null))
    .filter((index): index is number => index !== null);
  const revealCount = Math.min(revealCountForAnswer(answer), Math.max(0, candidateIndexes.length - 1));

  return [...candidateIndexes]
    .sort(() => Math.random() - 0.5)
    .slice(0, revealCount)
    .sort((left, right) => left - right);
}

function makeHint(answer: string, revealIndexes: number[]) {
  const revealIndexSet = new Set(revealIndexes);
  return answer
    .split("")
    .map((character, index) => {
      if (!/[a-z0-9]/i.test(character)) {
        return character;
      }

      return revealIndexSet.has(index) ? character : "_";
    })
    .join(" ");
}

function scoreboardForRoom(room: RoomState) {
  return Array.from(room.players.values()).map((player) => ({
    id: player.id,
    nickname: player.nickname,
    score: room.scores.get(player.id) ?? 0
  }));
}

function secondsRemaining(room: RoomState) {
  if (!room.currentRound?.endsAt) {
    return 0;
  }

  return Math.max(0, Math.ceil((room.currentRound.endsAt - Date.now()) / 1000));
}

function pointsForCorrectGuess(room: RoomState) {
  const remaining = secondsRemaining(room);
  const fastBonus = remaining >= Math.ceil(room.settings.roundDurationSeconds / 2) ? FAST_GUESS_BONUS_POINTS : 0;
  return BASE_GUESS_POINTS + fastBonus;
}

function activePlayerOrder(room: RoomState) {
  return room.playerOrder.filter((playerId) => room.players.has(playerId));
}

function totalTurnsForMatch(room: RoomState) {
  return room.settings.rounds * room.playerOrder.length;
}

function currentRoundNumber(room: RoomState) {
  if (!room.currentRound || room.playerOrder.length === 0) {
    return 0;
  }

  return Math.floor(room.turnsCompleted / room.playerOrder.length) + 1;
}

function currentTurnInRound(room: RoomState) {
  if (!room.currentRound || room.playerOrder.length === 0) {
    return 0;
  }

  return (room.turnsCompleted % room.playerOrder.length) + 1;
}

function gameStateForSocket(room: RoomState, socketId: string) {
  const hostId = hostIdForRoom(room) ?? "";
  const round = room.currentRound;
  const isDrawer = round?.drawerId === socketId;
  const hasGuessedCorrectly = round?.correctGuessers.has(socketId) ?? false;
  const selectedWord = round?.word ?? null;
  const isChoosingWord = Boolean(round && !selectedWord);

  return {
    hostId,
    drawerId: round?.drawerId ?? null,
    drawerName: round ? room.players.get(round.drawerId)?.nickname ?? "Drawer" : null,
    isHost: hostId === socketId,
    isDrawer,
    gameStarted: room.gameStarted,
    gameOver: room.gameOver,
    gamePaused: room.gamePaused,
    pausedMessage: room.pausedMessage,
    hasActiveRound: Boolean(round),
    isChoosingWord,
    hasGuessedCorrectly,
    secondsRemaining: secondsRemaining(room),
    settings: room.settings,
    selectedRounds: room.settings.rounds,
    currentRoundNumber: currentRoundNumber(room),
    currentTurnInRound: currentTurnInRound(room),
    turnsPerRound: room.playerOrder.length,
    turnsCompleted: room.turnsCompleted,
    totalTurns: totalTurnsForMatch(room),
    word: round
      ? {
          displayWord: isDrawer && selectedWord ? selectedWord.displayWord : null,
          hint: !isDrawer && selectedWord ? makeHint(selectedWord.answer, round.hintRevealIndexes) : null
        }
      : null,
    wordChoices: isDrawer && round ? round.wordChoices.map(publicWordChoice) : [],
    scoreboard: scoreboardForRoom(room),
    messages: room.messages.slice(-30)
  };
}

function broadcastPlayers(code: string) {
  io.to(code).emit("players", playersForRoom(code));
}

function emitGameState(code: string) {
  const room = rooms.get(code);
  if (!room) {
    return;
  }

  for (const socketId of room.players.keys()) {
    io.to(socketId).emit("game-state", gameStateForSocket(room, socketId));
  }
}

function emitDrawingHistory(socket: Socket, room: RoomState) {
  socket.emit("drawing-history", room.currentRound?.strokes ?? []);
}

function clearRoundTimer(room: RoomState) {
  if (room.roundTimer) {
    clearInterval(room.roundTimer);
    room.roundTimer = null;
  }
}

function everyoneGuessed(room: RoomState) {
  const round = room.currentRound;
  if (!round?.word) {
    return false;
  }

  const guessers = Array.from(room.players.keys()).filter((playerId) => playerId !== round.drawerId);
  return guessers.length > 0 && guessers.every((playerId) => round.correctGuessers.has(playerId));
}

function hasEnoughPlayers(room: RoomState) {
  return room.players.size >= 2;
}

function pauseGame(code: string, room: RoomState, message = "Waiting for one more player to continue.") {
  clearRoundTimer(room);
  room.currentRound = null;
  room.gameStarted = true;
  room.gameOver = false;
  room.gamePaused = true;
  room.pausedMessage = message;
  room.messages.push(makeMessage(message));
  io.to(code).emit("clear-canvas");
  logRoom(code, "Game paused", { players: room.players.size, turnsCompleted: room.turnsCompleted });
  emitGameState(code);
}

function compactPlayerOrder(room: RoomState) {
  room.playerOrder = room.playerOrder.filter((playerId) => room.players.has(playerId));
}

function finishMatch(code: string, room: RoomState, reason = "Game finished!") {
  clearRoundTimer(room);
  room.currentRound = null;
  room.gameStarted = false;
  room.gameOver = true;
  room.gamePaused = false;
  room.pausedMessage = null;
  room.messages.push(makeMessage(reason));
  logRoom(code, "Match finished", { reason, scoreboard: scoreboardForRoom(room) });
  io.to(code).emit("clear-canvas");
  emitGameState(code);
}

function startNextTurn(code: string, room: RoomState, reason?: string) {
  if (room.currentRound) {
    room.turnsCompleted += 1;
  }

  compactPlayerOrder(room);

  if (!hasEnoughPlayers(room)) {
    pauseGame(code, room);
    return;
  }

  if (room.turnsCompleted >= totalTurnsForMatch(room)) {
    finishMatch(code, room);
    return;
  }

  const activeOrder = activePlayerOrder(room);
  if (activeOrder.length === 0) {
    clearRoundTimer(room);
    room.currentRound = null;
    room.gameStarted = false;
    room.gameOver = false;
    return;
  }

  clearRoundTimer(room);

  if (reason) {
    room.messages.push(makeMessage(reason));
  }

  const targetTurnIndex = room.turnsCompleted % room.playerOrder.length;
  const orderedPlayerIds = [
    ...room.playerOrder.slice(targetTurnIndex),
    ...room.playerOrder.slice(0, targetTurnIndex)
  ];
  const drawerId = orderedPlayerIds.find((playerId) => room.players.has(playerId)) ?? activeOrder[0];
  const drawer = room.players.get(drawerId);
  if (!drawer) {
    finishMatch(code, room, "No players are available. Game finished!");
    return;
  }

  room.gameStarted = true;
  room.gameOver = false;
  room.gamePaused = false;
  room.pausedMessage = null;
  room.currentRound = {
    drawerId: drawer.id,
    word: null,
    wordChoices: randomWordChoices(room.settings),
    hintRevealIndexes: [],
    strokes: [],
    correctGuessers: new Set<string>(),
    endsAt: null
  };
  room.messages.push(makeMessage(`${drawer.nickname} is choosing a word.`));
  logRoom(code, "Started turn", {
    drawerId: drawer.id,
    drawer: drawer.nickname,
    turn: room.turnsCompleted + 1,
    totalTurns: totalTurnsForMatch(room)
  });
  io.to(code).emit("clear-canvas");
  emitGameState(code);
}

function startRoundTimer(code: string, room: RoomState) {
  if (!room.currentRound?.word) {
    return;
  }

  clearRoundTimer(room);
  room.currentRound.endsAt = Date.now() + room.settings.roundDurationSeconds * 1000;
  const drawer = room.players.get(room.currentRound.drawerId);
  room.messages.push(makeMessage(`${drawer?.nickname ?? "Drawer"} is drawing now.`));
  logRoom(code, "Round timer started", {
    drawerId: room.currentRound.drawerId,
    durationSeconds: room.settings.roundDurationSeconds,
    wordId: room.currentRound.word.id
  });
  emitGameState(code);
  room.roundTimer = setInterval(() => {
    const latestRoom = rooms.get(code);
    if (!latestRoom || !latestRoom.currentRound?.word || !latestRoom.currentRound.endsAt) {
      clearRoundTimer(room);
      return;
    }

    if (Date.now() >= latestRoom.currentRound.endsAt) {
      startNextTurn(code, latestRoom, "Time is up. Next turn!");
      return;
    }

    emitGameState(code);
  }, 1000);
}

function startMatch(code: string, room: RoomState) {
  clearRoundTimer(room);
  room.playerOrder = Array.from(room.players.keys());
  room.turnsCompleted = 0;
  room.currentRound = null;
  room.gameStarted = true;
  room.gameOver = false;
  room.gamePaused = false;
  room.pausedMessage = null;
  for (const playerId of room.players.keys()) {
    room.scores.set(playerId, 0);
  }
  room.messages.push(makeMessage(`Game started: ${room.settings.rounds} rounds.`));
  logRoom(code, "Match started", {
    players: room.playerOrder.length,
    settings: room.settings,
    totalTurns: totalTurnsForMatch(room)
  });
  startNextTurn(code, room);
}

function isValidStroke(stroke: StrokePayload) {
  const hasValidId = typeof stroke.id === "string" && stroke.id.length > 0 && stroke.id.length <= 80;
  const hasValidPoints =
    Array.isArray(stroke.points) &&
    stroke.points.length >= 2 &&
    stroke.points.length <= 500 &&
    stroke.points.every(
    (point) =>
      Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      point.x >= 0 &&
      point.x <= 1 &&
      point.y >= 0 &&
      point.y <= 1
  );
  const hasValidColor = /^#[0-9a-f]{6}$/i.test(stroke.color);
  const hasValidBrushSize = Number.isFinite(stroke.brushSize) && stroke.brushSize > 0 && stroke.brushSize <= 48;
  const hasValidTool = stroke.tool === "brush" || stroke.tool === "eraser";

  return hasValidId && hasValidPoints && hasValidColor && hasValidBrushSize && hasValidTool;
}

function leaveCurrentRoom(socket: Socket) {
  const existingCode = socketRooms.get(socket.id);
  if (!existingCode) {
    return;
  }

  socket.leave(existingCode);
  const room = rooms.get(existingCode);
  if (!room) {
    socketRooms.delete(socket.id);
    return;
  }

  const leavingPlayer = room.players.get(socket.id);
  room.players.delete(socket.id);
  room.scores.delete(socket.id);
  compactPlayerOrder(room);
  logRoom(existingCode, "Player left", {
    socketId: socket.id,
    nickname: leavingPlayer?.nickname,
    remainingPlayers: room.players.size
  });

  if (room?.players.size === 0) {
    rooms.delete(existingCode);
    clearRoundTimer(room);
    socketRooms.delete(socket.id);
    logRoom(existingCode, "Room deleted after last player left");
    return;
  }

  if (room.gameStarted && !room.gameOver && !hasEnoughPlayers(room)) {
    socketRooms.delete(socket.id);
    broadcastPlayers(existingCode);
    pauseGame(existingCode, room);
    return;
  }

  if (room.currentRound?.drawerId === socket.id) {
    socketRooms.delete(socket.id);
    broadcastPlayers(existingCode);
    startNextTurn(existingCode, room, "The drawer left. Moving to the next turn.");
    return;
  }

  if (room.currentRound && everyoneGuessed(room)) {
    socketRooms.delete(socket.id);
    broadcastPlayers(existingCode);
    startNextTurn(existingCode, room, "Everyone guessed correctly! Next turn!");
    return;
  }

  socketRooms.delete(socket.id);
  broadcastPlayers(existingCode);
  emitGameState(existingCode);
}

io.on("connection", (socket) => {
  socket.on("join-room", (payload?: JoinRoomPayload) => {
    const code = roomCodeFromPayload(payload);
    if (code.length !== 6) {
      socket.emit("error-message", "Room code must be 6 characters.");
      return;
    }

    leaveCurrentRoom(socket);

    const nickname = normalizeNickname(payload?.nickname ?? "");
    const room = getOrCreateRoom(code);
    room.players.set(socket.id, { id: socket.id, nickname });
    if (!room.scores.has(socket.id)) {
      room.scores.set(socket.id, 0);
    }
    if (room.gameStarted && !room.gameOver && !room.playerOrder.includes(socket.id)) {
      room.playerOrder.push(socket.id);
    }
    socketRooms.set(socket.id, code);
    socket.join(code);
    logRoom(code, "Player joined", {
      socketId: socket.id,
      nickname,
      players: room.players.size,
      gameStarted: room.gameStarted,
      gamePaused: room.gamePaused
    });
    broadcastPlayers(code);
    room.messages.push(makeMessage(`${nickname} joined the room.`));
    if (room.gamePaused && hasEnoughPlayers(room)) {
      startNextTurn(code, room, "A player joined. Game continues!");
      return;
    }
    emitGameState(code);
    emitDrawingHistory(socket, room);
  });

  socket.on("update-room-settings", (payload?: { code?: string; settings?: Partial<RoomSettings> }) => {
    const code = roomCodeFromPayload(payload);
    const room = rooms.get(code);
    if (!room || socketRooms.get(socket.id) !== code) {
      rejectAction(socket, code, "Join a room before changing settings.");
      return;
    }

    const hostId = hostIdForRoom(room);
    if (hostId !== socket.id) {
      rejectAction(socket, code, "Only the host can update room settings.");
      return;
    }

    if (room.gameStarted || room.gameOver) {
      rejectAction(socket, code, "Settings locked after game starts.");
      return;
    }

    room.settings = normalizeRoomSettings({
      ...room.settings,
      ...(payload?.settings ?? {})
    });
    logRoom(code, "Room settings updated", { settings: room.settings });
    emitGameState(code);
  });

  socket.on("start-game", (payload?: { code?: string }) => {
    const code = roomCodeFromPayload(payload);
    const room = rooms.get(code);
    if (!room || socketRooms.get(socket.id) !== code) {
      rejectAction(socket, code, "Join a room before starting the game.");
      return;
    }

    const hostId = hostIdForRoom(room);
    if (hostId !== socket.id) {
      rejectAction(socket, code, "Only the host can start the game.");
      return;
    }

    if (room.gameStarted && !room.gameOver) {
      rejectAction(socket, code, "Game already started.");
      return;
    }

    if (!hasEnoughPlayers(room)) {
      rejectAction(socket, code, "Need at least 2 players to start.");
      return;
    }

    startMatch(code, room);
  });

  socket.on("select-word", (payload?: { code?: string; wordId?: string }) => {
    const code = roomCodeFromPayload(payload);
    const room = rooms.get(code);
    if (!room || socketRooms.get(socket.id) !== code || !room.currentRound) {
      rejectAction(socket, code, "There is no active word choice.");
      return;
    }

    if (room.currentRound.drawerId !== socket.id || room.currentRound.word) {
      rejectAction(socket, code, "Only the current drawer can choose a word.");
      return;
    }

    const selectedWord = room.currentRound.wordChoices.find((word) => word.id === payload?.wordId);
    if (!selectedWord) {
      rejectAction(socket, code, "Choose one of the offered words.");
      return;
    }

    room.currentRound.word = selectedWord;
    room.currentRound.hintRevealIndexes = makeHintRevealIndexes(selectedWord.answer);
    startRoundTimer(code, room);
  });

  socket.on("submit-guess", (payload?: { code?: string; guess?: string }) => {
    const code = roomCodeFromPayload(payload);
    const room = rooms.get(code);
    if (!room || socketRooms.get(socket.id) !== code || !room.currentRound?.word) {
      rejectAction(socket, code, "There is no active word to guess.");
      return;
    }

    const player = room.players.get(socket.id);
    if (!player) {
      rejectAction(socket, code, "Join the room before guessing.");
      return;
    }

    if (room.currentRound.drawerId === socket.id) {
      rejectAction(socket, code, "Drawer cannot guess their own word.");
      return;
    }

    if (room.currentRound.correctGuessers.has(socket.id)) {
      rejectAction(socket, code, "You already guessed this word correctly.");
      return;
    }

    const guess = (payload?.guess ?? "").trim().slice(0, 60);
    if (!guess) {
      return;
    }

    const acceptedAnswers = [room.currentRound.word.answer, ...room.currentRound.word.acceptedAnswers].map(normalizeAnswer);
    if (acceptedAnswers.includes(normalizeAnswer(guess))) {
      const points = pointsForCorrectGuess(room);
      room.currentRound.correctGuessers.add(socket.id);
      room.scores.set(socket.id, (room.scores.get(socket.id) ?? 0) + points);
      room.scores.set(
        room.currentRound.drawerId,
        (room.scores.get(room.currentRound.drawerId) ?? 0) + DRAWER_BONUS_POINTS
      );
      room.messages.push(makeMessage(`${player.nickname} guessed correctly!`, "correct"));
      logRoom(code, "Correct guess", {
        playerId: socket.id,
        nickname: player.nickname,
        points,
        drawerBonus: DRAWER_BONUS_POINTS,
        score: room.scores.get(socket.id)
      });

      if (everyoneGuessed(room)) {
        startNextTurn(code, room, "Everyone guessed correctly! Next turn!");
        return;
      }
    } else {
      room.messages.push(makeMessage(`${player.nickname}: ${guess}`, "guess"));
    }

    emitGameState(code);
  });

  socket.on("draw-stroke", (payload?: { code?: string; stroke?: StrokePayload }) => {
    const code = roomCodeFromPayload(payload);
    if (!code || socketRooms.get(socket.id) !== code || !payload?.stroke) {
      rejectAction(socket, code, "Join a room before drawing.");
      return;
    }

    const room = rooms.get(code);
    if (!room?.currentRound?.word) {
      rejectAction(socket, code, "Drawing is available after the drawer chooses a word.");
      return;
    }

    if (room.currentRound.drawerId !== socket.id) {
      rejectAction(socket, code, "Only the current drawer can draw.");
      return;
    }

    if (!isValidStroke(payload.stroke)) {
      rejectAction(socket, code, "Invalid drawing stroke.");
      return;
    }

    const nextStroke = payload.stroke;
    const existingStrokeIndex = room.currentRound.strokes.findIndex((stroke) => stroke.id === nextStroke.id);
    if (existingStrokeIndex >= 0) {
      room.currentRound.strokes[existingStrokeIndex] = nextStroke;
    } else {
      room.currentRound.strokes.push(nextStroke);
    }
    io.to(code).emit("draw-stroke", nextStroke);
  });

  socket.on("clear-canvas", (payload?: { code?: string }) => {
    const code = roomCodeFromPayload(payload);
    if (!code || socketRooms.get(socket.id) !== code) {
      rejectAction(socket, code, "Join a room before clearing the canvas.");
      return;
    }

    const room = rooms.get(code);
    if (!room) {
      rejectAction(socket, code, "Room not found.");
      return;
    }

    if (!room.currentRound?.word) {
      rejectAction(socket, code, "Clear is available after the drawer chooses a word.");
      return;
    }

    if (room.currentRound.drawerId !== socket.id) {
      rejectAction(socket, code, "Only the current drawer can clear the canvas.");
      return;
    }

    room.currentRound.strokes = [];
    io.to(code).emit("clear-canvas");
  });

  socket.on("undo-stroke", (payload?: { code?: string }) => {
    const code = roomCodeFromPayload(payload);
    if (!code || socketRooms.get(socket.id) !== code) {
      rejectAction(socket, code, "Join a room before undoing strokes.");
      return;
    }

    const room = rooms.get(code);
    if (!room?.currentRound?.word) {
      rejectAction(socket, code, "Undo is available after the drawer chooses a word.");
      return;
    }

    if (room.currentRound.drawerId !== socket.id) {
      rejectAction(socket, code, "Only the current drawer can undo strokes.");
      return;
    }

    room.currentRound.strokes.pop();
    io.to(code).emit("drawing-history", room.currentRound.strokes);
  });

  socket.on("leave-room", () => {
    leaveCurrentRoom(socket);
  });

  socket.on("disconnect", () => {
    leaveCurrentRoom(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`SketchIt server running on http://localhost:${PORT}`);
});
