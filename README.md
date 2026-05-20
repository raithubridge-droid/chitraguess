# ChitraGuess

ChitraGuess is a multiplayer Telugu drawing and guessing MVP.

Players join with a nickname and a room code. One browser draws on the canvas, and everyone in the same room sees the strokes live.

## Project Structure

```text
chitraguess/
  client/
  server/
  README.md
```

## Prerequisites

- Node.js 18 or newer
- npm

## Run Locally

Install and start the Socket.IO server:

```bash
cd server
npm install
npm run dev
```

The server runs on [http://localhost:4000](http://localhost:4000).

In another terminal, install and start the Next.js client:

```bash
cd client
npm install
npm run dev
```

The client runs on [http://localhost:3000](http://localhost:3000).

## Try the MVP

1. Open [http://localhost:3000](http://localhost:3000).
2. Enter a nickname.
3. Create a room or join an existing 6-character room code.
4. Open a second browser tab and join the same room with another nickname.
5. Draw in one tab. The drawing appears live in the other tab.

## Notes

- No database is used for the MVP.
- No login is required.
- Room state is in memory and resets when the server restarts.

