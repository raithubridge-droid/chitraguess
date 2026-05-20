import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server, Socket } from "socket.io";
import { wordBank, type RoomCategory, type RoomDifficulty, type TeluguWord, type WordLanguage } from "./words.js";

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

type RoomSettingCategory = "All" | "Food" | "Festivals" | "Places" | "Movies" | "Farming";
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
  settings: RoomSettings;
  playerOrder: string[];
  turnsCompleted: number;
  roundTimer: ReturnType<typeof setInterval> | null;
  currentRound: {
    drawerId: string;
    word: TeluguWord | null;
    wordChoices: TeluguWord[];
    correctGuessers: Set<string>;
    endsAt: number | null;
  } | null;
};

type JoinRoomPayload = {
  code?: string;
  nickname?: string;
};

type StrokePayload = {
  from: {
    x: number;
    y: number;
  };
  to: {
    x: number;
    y: number;
  };
  color: string;
  width: number;
};

const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";
const DEFAULT_ROOM_SETTINGS: RoomSettings = {
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

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"]
  }
});

const rooms = new Map<string, RoomState>();
const socketRooms = new Map<string, string>();

app.use(cors({ origin: CLIENT_ORIGIN }));

app.get("/", (_request, response) => {
  response.json({ app: "ChitraGuess", status: "ok" });
});

function normalizeRoomCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function normalizeNickname(nickname: string) {
  const cleaned = nickname.trim().slice(0, 24);
  return cleaned || "Guest";
}

function normalizeAnswer(answer: string) {
  return answer.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
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

function wordsForSettings(settings: RoomSettings) {
  const languageWords = wordBank.filter((word) => word.language === settings.language);
  const matchingWords = languageWords.filter((word) => {
    const categoryMatches = settings.category === "All" || word.category === settings.category;
    const difficultyMatches = settings.difficulty === "Mixed" || word.difficulty === settings.difficulty;
    return categoryMatches && difficultyMatches;
  });

  return matchingWords.length > 0 ? matchingWords : languageWords;
}

function publicWordChoice(word: TeluguWord): PublicWordChoice {
  return {
    id: word.id,
    displayWord: word.displayWord
  };
}

function randomWordChoices(settings: RoomSettings) {
  const words = wordsForSettings(settings);
  const shuffledWords = [...words].sort(() => Math.random() - 0.5);
  const choices = shuffledWords.slice(0, 3);

  if (choices.length >= 3) {
    return choices;
  }

  for (const word of wordsForSettings(settings)) {
    if (!choices.some((choice) => choice.answer === word.answer)) {
      choices.push(word);
    }

    if (choices.length === 3) {
      break;
    }
  }

  return choices;
}

function makeHint(answer: string) {
  return answer
    .split("")
    .map((character) => (/[a-z0-9]/i.test(character) ? "_" : character))
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
          hint: !isDrawer && selectedWord ? makeHint(selectedWord.answer) : null
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

function finishMatch(code: string, room: RoomState, reason = "Game finished!") {
  clearRoundTimer(room);
  room.currentRound = null;
  room.gameStarted = false;
  room.gameOver = true;
  room.messages.push(makeMessage(reason));
  io.to(code).emit("clear-canvas");
  emitGameState(code);
}

function startNextTurn(code: string, room: RoomState, reason?: string) {
  if (room.currentRound) {
    room.turnsCompleted += 1;
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
  room.currentRound = {
    drawerId: drawer.id,
    word: null,
    wordChoices: randomWordChoices(room.settings),
    correctGuessers: new Set<string>(),
    endsAt: null
  };
  room.messages.push(makeMessage(`${drawer.nickname} is choosing a word.`));
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
  for (const playerId of room.players.keys()) {
    room.scores.set(playerId, 0);
  }
  room.messages.push(makeMessage(`Game started: ${room.settings.rounds} rounds.`));
  startNextTurn(code, room);
}

function leaveCurrentRoom(socket: Socket) {
  const existingCode = socketRooms.get(socket.id);
  if (!existingCode) {
    return;
  }

  socket.leave(existingCode);
  const room = rooms.get(existingCode);
  room?.players.delete(socket.id);
  if (room?.currentRound?.drawerId === socket.id) {
    clearRoundTimer(room);
    room.gameStarted = false;
    room.currentRound = null;
    room.messages.push(makeMessage("The drawer left. Start a new game when ready."));
  } else if (room?.currentRound && everyoneGuessed(room)) {
    socketRooms.delete(socket.id);
    broadcastPlayers(existingCode);
    startNextTurn(existingCode, room, "Everyone guessed correctly! Next turn!");
    return;
  }
  if (room?.players.size === 0) {
    if (room) {
      clearRoundTimer(room);
    }
    rooms.delete(existingCode);
  }
  socketRooms.delete(socket.id);
  broadcastPlayers(existingCode);
  emitGameState(existingCode);
}

io.on("connection", (socket) => {
  socket.on("join-room", (payload: JoinRoomPayload) => {
    const code = normalizeRoomCode(payload.code ?? "");
    if (code.length !== 6) {
      socket.emit("error-message", "Room code must be 6 characters.");
      return;
    }

    leaveCurrentRoom(socket);

    const nickname = normalizeNickname(payload.nickname ?? "");
    const room = getOrCreateRoom(code);
    room.players.set(socket.id, { id: socket.id, nickname });
    if (!room.scores.has(socket.id)) {
      room.scores.set(socket.id, 0);
    }
    socketRooms.set(socket.id, code);
    socket.join(code);
    broadcastPlayers(code);
    room.messages.push(makeMessage(`${nickname} joined the room.`));
    emitGameState(code);
  });

  socket.on("update-room-settings", (payload: { code?: string; settings?: Partial<RoomSettings> }) => {
    const code = normalizeRoomCode(payload.code ?? "");
    const room = rooms.get(code);
    if (!room || socketRooms.get(socket.id) !== code) {
      return;
    }

    const hostId = hostIdForRoom(room);
    if (hostId !== socket.id) {
      socket.emit("error-message", "Only the host can update room settings.");
      return;
    }

    if (room.gameStarted || room.gameOver) {
      socket.emit("error-message", "Settings locked after game starts.");
      return;
    }

    room.settings = normalizeRoomSettings({
      ...room.settings,
      ...(payload.settings ?? {})
    });
    emitGameState(code);
  });

  socket.on("start-game", (payload: { code?: string }) => {
    const code = normalizeRoomCode(payload.code ?? "");
    const room = rooms.get(code);
    if (!room || socketRooms.get(socket.id) !== code) {
      return;
    }

    const hostId = hostIdForRoom(room);
    if (hostId !== socket.id) {
      socket.emit("error-message", "Only the host can start the game.");
      return;
    }

    if (room.currentRound) {
      startNextTurn(code, room, "Host started the next turn.");
      return;
    }

    startMatch(code, room);
  });

  socket.on("select-word", (payload: { code?: string; wordId?: string }) => {
    const code = normalizeRoomCode(payload.code ?? "");
    const room = rooms.get(code);
    if (!room || socketRooms.get(socket.id) !== code || !room.currentRound) {
      return;
    }

    if (room.currentRound.drawerId !== socket.id || room.currentRound.word) {
      return;
    }

    const selectedWord = room.currentRound.wordChoices.find((word) => word.id === payload.wordId);
    if (!selectedWord) {
      return;
    }

    room.currentRound.word = selectedWord;
    startRoundTimer(code, room);
  });

  socket.on("submit-guess", (payload: { code?: string; guess?: string }) => {
    const code = normalizeRoomCode(payload.code ?? "");
    const room = rooms.get(code);
    if (!room || socketRooms.get(socket.id) !== code || !room.currentRound?.word) {
      return;
    }

    const player = room.players.get(socket.id);
    if (!player || room.currentRound.drawerId === socket.id || room.currentRound.correctGuessers.has(socket.id)) {
      return;
    }

    const guess = (payload.guess ?? "").trim().slice(0, 60);
    if (!guess) {
      return;
    }

    const acceptedAnswers = [room.currentRound.word.answer, ...room.currentRound.word.acceptedAnswers].map(normalizeAnswer);
    if (acceptedAnswers.includes(normalizeAnswer(guess))) {
      room.currentRound.correctGuessers.add(socket.id);
      room.scores.set(socket.id, (room.scores.get(socket.id) ?? 0) + 10);
      room.messages.push(makeMessage(`${player.nickname} guessed correctly!`, "correct"));

      if (everyoneGuessed(room)) {
        startNextTurn(code, room, "Everyone guessed correctly! Next turn!");
        return;
      }
    } else {
      room.messages.push(makeMessage(`${player.nickname}: ${guess}`, "guess"));
    }

    emitGameState(code);
  });

  socket.on("draw-stroke", (payload: { code?: string; stroke?: StrokePayload }) => {
    const code = normalizeRoomCode(payload.code ?? "");
    if (!code || socketRooms.get(socket.id) !== code || !payload.stroke) {
      return;
    }

    const room = rooms.get(code);
    if (room?.currentRound && (room.currentRound.drawerId !== socket.id || !room.currentRound.word)) {
      return;
    }

    socket.to(code).emit("draw-stroke", payload.stroke);
  });

  socket.on("clear-canvas", (payload: { code?: string }) => {
    const code = normalizeRoomCode(payload.code ?? "");
    if (!code || socketRooms.get(socket.id) !== code) {
      return;
    }

    socket.to(code).emit("clear-canvas");
  });

  socket.on("leave-room", () => {
    leaveCurrentRoom(socket);
  });

  socket.on("disconnect", () => {
    leaveCurrentRoom(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`ChitraGuess server running on http://localhost:${PORT}`);
});
