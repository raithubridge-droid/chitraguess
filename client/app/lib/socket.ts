import { io, Socket } from "socket.io-client";

export type Point = {
  x: number;
  y: number;
};

export type StrokePayload = {
  id: string;
  points: Point[];
  color: string;
  brushSize: number;
  tool: "brush" | "eraser";
};

export type Player = {
  id: string;
  nickname: string;
};

export type GameMessage = {
  id: string;
  text: string;
  type: "system" | "guess" | "correct";
};

export type ScoreboardEntry = {
  id: string;
  nickname: string;
  score: number;
};

export type RoomSettings = {
  language: "Telugu" | "English";
  rounds: 2 | 3 | 5;
  roundDurationSeconds: 60 | 90 | 120;
  category:
    | "All"
    | "Food"
    | "Festivals"
    | "Places"
    | "Movies"
    | "Farming"
    | "Animals"
    | "Household"
    | "School"
    | "Nature"
    | "Funny";
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
};

export type WordChoice = {
  id: string;
  displayWord: string;
};

export type GameState = {
  hostId: string;
  drawerId: string | null;
  drawerName: string | null;
  isHost: boolean;
  isDrawer: boolean;
  gameStarted: boolean;
  gameOver: boolean;
  gamePaused: boolean;
  pausedMessage: string | null;
  hasActiveRound: boolean;
  isChoosingWord: boolean;
  hasGuessedCorrectly: boolean;
  secondsRemaining: number;
  settings: RoomSettings;
  selectedRounds: number;
  currentRoundNumber: number;
  currentTurnInRound: number;
  turnsPerRound: number;
  turnsCompleted: number;
  totalTurns: number;
  word: {
    displayWord: string | null;
    hint: string | null;
  } | null;
  wordChoices: WordChoice[];
  scoreboard: ScoreboardEntry[];
  messages: GameMessage[];
};

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000", {
      autoConnect: false
    });
  }

  return socket;
}
