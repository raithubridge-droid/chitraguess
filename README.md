# SketchIt

SketchIt is a multiplayer drawing and guessing party game for Telugu friends and families. Players join a room with a nickname and a 6-character room code, one player draws, and everyone else races to guess the word.

The SketchIt MVP supports Telugu and English word modes, room settings, real-time drawing, live guesses, scoring, drawer rotation, and a final winner screen. Room state is currently stored in memory on the Socket.IO server.

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Node.js
- Express
- Socket.IO

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

## Local Setup

Install and run the server:

```bash
cd server
npm install
npm run dev
```

The server runs at [http://localhost:4000](http://localhost:4000).

In a second terminal, install and run the client:

```bash
cd client
npm install
npm run dev
```

The client runs at [http://localhost:3000](http://localhost:3000).

## Local URLs

- Client: [http://localhost:3000](http://localhost:3000)
- Server: [http://localhost:4000](http://localhost:4000)
- Server health check: [http://localhost:4000/health](http://localhost:4000/health)

## Environment Variables

Client:

```bash
NEXT_PUBLIC_SOCKET_URL=https://YOUR_RENDER_BACKEND_URL
```

If `NEXT_PUBLIC_SOCKET_URL` is not set, the client falls back to `http://localhost:4000`.

Server:

```bash
CLIENT_URL=https://YOUR_VERCEL_FRONTEND_URL
PORT=4000
```

`CLIENT_URL` is used for Socket.IO and Express CORS. Local development origin `http://localhost:3000` is always allowed.

## Deployment Notes

Suggested deployment split:

- Deploy `client/` to Vercel or another Next.js host.
- Deploy `server/` to Render, Railway, Fly.io, or another Node.js host.

Server deployment settings:

- Root directory: `server`
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment variables:
  - `CLIENT_URL=https://YOUR_VERCEL_FRONTEND_URL`
  - `PORT=4000` or the platform-provided port

Client deployment settings:

- Root directory: `client`
- Build command: `npm install && npm run build`
- Environment variables:
  - `NEXT_PUBLIC_SOCKET_URL=https://YOUR_RENDER_BACKEND_URL`

After deploying, verify:

- Backend health check returns `{ "status": "ok", "app": "SketchIt server" }`.
- Frontend can create and join rooms.
- Two browser tabs can connect to the same deployed room.

## Manual Testing Checklist

- Create a room from the home page.
- Join the room from another browser tab with a different nickname.
- Test a 2-player game.
- Test a 3-player game.
- Test a 4-player game.
- Test Telugu mode.
- Test English mode.
- Test category filtering from room settings.
- Test difficulty filtering from room settings.
- Test the 120-second round timer.
- Test letter reveal hints for guessers.
- Test scoring for correct guesses.
- Test fast guess scoring.
- Test drawer bonus scoring.
- Test canvas tools: colors, brush sizes, eraser, clear, and undo.
- Test chat auto-scroll and the “New messages” indicator.
- Test the final winner screen and celebration animation.
- Test Play Again after a completed game.
- Test Back to Home from the room.
- Test player leaves and refreshes during lobby, word choice, and active drawing.
- Confirm settings are locked after the game starts.

## Build Checks

Run these before pushing changes:

```bash
cd server
npm run build
```

```bash
cd client
npm run build
```

## Known Limitations

- No database yet.
- No login yet.
- Rooms are stored in server memory.
- Server restart clears all rooms and scores.

## Next Roadmap

- Deployment
- Mobile app wrapper
- Moderation and reporting
- More languages
- Public rooms
