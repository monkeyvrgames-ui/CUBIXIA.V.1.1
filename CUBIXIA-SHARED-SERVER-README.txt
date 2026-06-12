CUBIXIA shared account mode

By default, CUBIXIA-LATEST runs a private local server on the player's computer.
That is good for testing, but accounts made on another computer will not appear
in your friend search or admin panels.

To make everyone use the same worldwide accounts:

1. Host this exact CUBIXIA project on any public Node host or VPS.
2. Copy cubixia-server.example.json and rename it to cubixia-server.json.
3. Put your real server URL inside:
   { "serverUrl": "https://your-cubixia-server.example.com" }
4. Keep cubixia-server.json beside the EXE.
4. Send the ZIP to players, not just the EXE by itself.

When the EXE sees cubixia-server.json, it will use that shared server instead
of private local data. Then new accounts, friend requests, roles, moderation,
admin panels, and chat all use the same server data.

Important: the server must run the latest CUBIXIA code. If the host is running
an old upload, the EXE will open that old upload.
