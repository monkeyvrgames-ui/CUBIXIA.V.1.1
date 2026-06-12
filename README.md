# CUBIXIA Platform Demo

A CUBIXIA account, social, and game hub demo. It includes:

- Landing page with register/login actions
- Signup and login pages with custom profile picture support
- Duplicate username prevention
- Password hashing with `bcryptjs`
- Session login
- Time-based home greeting
- Continue Playing and game progress tracking
- Real user search, friend requests, accept/decline notifications, and friends list presence
- Gmail/email-based password recovery and 2-step login verification with real email codes
- Global chat and CUBIXIA communities
- Profile page with bio, avatar, badges, achievements, and join date
- Avatar editor with free launch items, including the First Play CUBIXIA Shirt
- Owner-only badges and ban feature for the username `Tanklyplayz`
- 3D Cubixia: Survival with WASD movement, jumping, a blocky rifle, zombie waves, XP, credits, multiplayer presence, and a custom ESC menu
- 3D Cubixia Coaster Tycoon with rides, NPC customers, money, pricing, and guest happiness

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

For another player on the same Wi-Fi/LAN to test from their device, run the server and give them your computer's local IP address with port `3000`, for example `http://192.168.1.20:3000`. You can also open `http://127.0.0.1:3000/api/network-info` to see the LAN URL CUBIXIA detects for your computer. Windows Firewall may ask you to allow Node.js.

For players across your state or around the world, deploy one shared CUBIXIA server and point every EXE at that same URL with `cubixia-server.json`. Local EXEs without that file use private local accounts, so users made on someone else's computer will not appear in your friend search or admin panels.

## Deploy on Render

1. Push this folder to a GitHub repository.
2. In Render, create a new **Blueprint** from that repository using `render.yaml`, or create a new **Web Service** manually.
3. If creating manually, use:
   - Build command: `npm install`
   - Start command: `npm start`
4. Add environment variables:
   - `SESSION_SECRET`: a long random value
   - `CUBIXIA_DATA_DIR`: `/var/data/cubixia`
   - `GMAIL_USER`: the Gmail account that sends codes
   - `GMAIL_APP_PASSWORD`: the Gmail app password
5. Add a persistent disk mounted at `/var/data` so accounts survive deploys.
6. Copy `cubixia-server.example.json`, rename it to `cubixia-server.json`, put your Render URL in it, and send it beside the EXE.

This demo stores users in JSON files. On Render, use the persistent disk from `render.yaml` so accounts persist across deploys. For a larger real public site, move accounts to a hosted database such as PostgreSQL.

To send real Gmail recovery and 2-step verification emails locally or on Render, set:

- `GMAIL_USER`: the Gmail account that sends CUBIXIA recovery codes
- `GMAIL_APP_PASSWORD`: a Gmail app password for that account
- `SESSION_SECRET`: a long random secret for sessions

For local development, create a `.env` file using `.env.example` as the template, then restart `npm start`. Gmail requires an app password, not the normal Gmail password.
