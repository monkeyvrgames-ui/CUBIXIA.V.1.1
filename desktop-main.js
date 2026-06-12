const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const http = require("http");
const https = require("https");
const fs = require("fs");

process.env.CUBIXIA_DESKTOP = "true";
process.env.CUBIXIA_DESKTOP_VERSION = "1.1.0";
process.env.CUBIXIA_DATA_DIR = path.join(app.getPath("userData"), "data");
process.env.CUBIXIA_DATA_SEED_DIR = path.join(__dirname, "data");
process.env.CUBIXIA_DESKTOP_SYNC_DATA = "true";
process.env.CUBIXIA_DESKTOP_DATA_VERSION = "1.1.0";

function cleanServerUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function readDesktopConfig() {
  if (process.env.CUBIXIA_FORCE_LOCAL === "true") return { serverUrl: "", hostServer: false, source: "forced local testing" };

  const candidates = [
    process.env.CUBIXIA_SERVER_URL,
    path.join(path.dirname(process.execPath), "cubixia-host.json"),
    path.join(path.dirname(process.execPath), "cubixia-server.json"),
    path.join(process.cwd(), "cubixia-server.json"),
    path.join(app.getPath("userData"), "cubixia-server.json")
  ];

  const envUrl = cleanServerUrl(candidates[0]);
  if (envUrl) return { serverUrl: envUrl, source: "environment" };

  for (const filePath of candidates.slice(1)) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const config = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const serverUrl = cleanServerUrl(config.serverUrl || config.url);
      if (config.hostServer === true) {
        const hostPort = Math.max(1024, Math.min(65535, Number(config.port || config.hostPort || 3000)));
        return { serverUrl: "", hostServer: true, hostPort, source: filePath };
      }
      const isRender = /(^|\.)onrender\.com$/i.test(new URL(serverUrl).hostname);
      if (serverUrl && isRender && config.allowRender !== true) {
        console.warn("CUBIXIA desktop config ignored Render URL:", filePath);
        continue;
      }
      if (serverUrl) return { serverUrl, source: filePath };
    } catch (error) {
      console.warn("CUBIXIA desktop config ignored:", filePath, error.message);
    }
  }
  return { serverUrl: "", hostServer: false, source: "" };
}

const desktopConfig = readDesktopConfig();
const sharedServerUrl = desktopConfig.serverUrl;
const hostServer = Boolean(desktopConfig.hostServer);
process.env.PORT = process.env.PORT || String(hostServer ? desktopConfig.hostPort || 3000 : 3300 + Math.floor(Math.random() * 400));

if (!sharedServerUrl) {
  require("./server");
}

const startUrl = sharedServerUrl
  ? `${sharedServerUrl}/?desktop=1&shared=1&fresh=desktop-world-1.1.0-${Date.now()}`
  : `http://127.0.0.1:${process.env.PORT}/?desktop=1&local=1${hostServer ? "&host=1" : ""}&fresh=desktop-local-1.1.0-${Date.now()}`;

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function loadingHtml(message, detail = "", actions = "") {
  return `<!doctype html>
    <html>
      <head>
        <title>CUBIXIA</title>
        <style>
          body { margin:0; min-height:100vh; display:grid; place-items:center; background:#07131f; color:white; font-family:Arial, sans-serif; overflow:hidden; }
          body:before { content:""; position:fixed; inset:0; background:linear-gradient(135deg, rgba(56,189,248,.18), transparent 35%, rgba(52,211,153,.16)); }
          main { position:relative; width:min(680px, calc(100vw - 48px)); background:#101d2e; border:1px solid #36506d; border-radius:22px; padding:34px; box-shadow:0 24px 80px rgba(0,0,0,.35); }
          .logo { display:flex; align-items:center; gap:12px; font-weight:900; font-size:34px; margin-bottom:18px; }
          .mark { width:24px; height:24px; border:5px solid #fff; border-radius:7px; transform:rotate(28deg); }
          h1 { margin:0 0 12px; font-size:32px; }
          p { color:#c8d6e6; line-height:1.5; font-size:17px; }
          .bar { height:12px; background:#1c2f46; border-radius:999px; overflow:hidden; margin-top:22px; }
          .bar span { display:block; width:42%; height:100%; background:linear-gradient(90deg,#35dfa0,#35aeea); border-radius:999px; animation:slide 1.2s infinite alternate ease-in-out; }
          .actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:22px; }
          button, a { appearance:none; border:0; border-radius:12px; padding:13px 18px; background:#35aeea; color:#041322; font-weight:900; font-size:15px; text-decoration:none; cursor:pointer; }
          .secondary { background:#1c2f46; color:#e8f3ff; border:1px solid #36506d; }
          code { color:#ffd86b; }
          @keyframes slide { from { transform:translateX(-15%); } to { transform:translateX(155%); } }
        </style>
      </head>
      <body>
        <main>
          <div class="logo"><span class="mark"></span>CUBIXIA</div>
          <h1>${escapeHtml(message)}</h1>
          <p>${escapeHtml(detail)}</p>
          <div class="bar"><span></span></div>
          ${actions}
        </main>
      </body>
    </html>`;
}

function offlineHtml(serverUrl, errorMessage) {
  return loadingHtml(
    "CUBIXIA World is offline",
    `The shared server did not answer at ${serverUrl}. Start your CUBIXIA host server, check the URL in cubixia-server.json, or remove that file to test locally. Last error: ${errorMessage}`,
    `<div class="actions">
      <button onclick="location.reload()">Retry CUBIXIA World</button>
      <a class="secondary" href="${escapeHtml(serverUrl)}">Open shared server</a>
    </div>`
  );
}

function waitForServer(url, timeoutMs = 15000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const client = String(url).startsWith("https:") ? https : http;
      const req = client.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - started > timeoutMs) reject(new Error("CUBIXIA server did not start in time."));
        else setTimeout(check, 250);
      });
      req.setTimeout(1000, () => {
        req.destroy();
      });
    };
    check();
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: "CUBIXIA",
    backgroundColor: "#07131f",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  await win.webContents.session.clearCache();
  try {
    await waitForServer(startUrl);
    await win.loadURL(startUrl);
  } catch (error) {
    if (sharedServerUrl) {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(offlineHtml(sharedServerUrl, error.message))}`);
      return;
    }
    throw error;
  }
}

app.whenReady().then(createWindow).catch((error) => {
  const win = new BrowserWindow({
    width: 760,
    height: 460,
    title: "CUBIXIA",
    backgroundColor: "#07131f",
    autoHideMenuBar: true
  });
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
    <html>
      <head>
        <title>CUBIXIA Startup</title>
        <style>
          body { margin:0; min-height:100vh; display:grid; place-items:center; background:#07131f; color:white; font-family:Arial, sans-serif; }
          main { width:min(620px, calc(100vw - 48px)); background:#101d2e; border:1px solid #36506d; border-radius:18px; padding:28px; box-shadow:0 24px 80px rgba(0,0,0,.35); }
          h1 { margin:0 0 12px; font-size:32px; }
          p { color:#c8d6e6; line-height:1.5; }
          code { color:#ffd86b; }
        </style>
      </head>
      <body>
        <main>
          <h1>CUBIXIA could not open</h1>
          <p>${escapeHtml(error?.message || error || "Unknown startup error")}</p>
          <p>CUBIXIA is now running in local testing mode, so this usually means the local server did not start.</p>
        </main>
      </body>
    </html>`)}`);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
