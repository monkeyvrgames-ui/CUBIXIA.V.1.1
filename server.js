const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const fsSync = require("fs");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

loadLocalEnv();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.CUBIXIA_DATA_DIR || path.join(__dirname, "data");
const DATA_SEED_DIR = process.env.CUBIXIA_DATA_SEED_DIR || "";
const DESKTOP_DATA_VERSION = process.env.CUBIXIA_DESKTOP_DATA_VERSION || "";
const USERS_FILE = path.join(DATA_DIR, "users.json");
const USERS_BACKUP_FILE = path.join(DATA_DIR, "users.last-good.json");
const CHAT_FILE = path.join(DATA_DIR, "chat.json");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const GROUPS_FILE = path.join(DATA_DIR, "groups.json");
const STUDIO_FILE = path.join(DATA_DIR, "studio-games.json");
const CONTENT_FILE = path.join(DATA_DIR, "content-state.json");
const DESKTOP_DATA_MARKER_FILE = path.join(DATA_DIR, "desktop-data-version.txt");
const TWO_STEP_DEVICE_COOKIE = "cubixia_2fa_device";
const TWO_STEP_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
let userWriteQueue = Promise.resolve();
let chatWriteQueue = Promise.resolve();
let reportWriteQueue = Promise.resolve();
let groupWriteQueue = Promise.resolve();
let studioWriteQueue = Promise.resolve();
let contentWriteQueue = Promise.resolve();
let contentStateCache = { games: {}, items: {} };
const twoStepChallengeLocks = new Map();

function loadLocalEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fsSync.existsSync(envPath)) return;
  const raw = fsSync.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

for (const method of ["get", "post"]) {
  const original = app[method].bind(app);
  app[method] = (route, ...handlers) =>
    original(
      route,
      ...handlers.map((handler) => {
        if (handler.length > 3) return handler;
        return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
      })
    );
}

const GAMES = [
  {
    id: "cubixia-survival",
    title: "Cubixia: Survival",
    genre: "Zombie Survival",
    maturity: "Mild",
    description: "A 3D zombie survival shooter with waves, safe zones, XP, credits, player avatars, and multiplayer presence."
  },
  {
    id: "coaster-tycoon",
    title: "Cubixia Coaster Tycoon",
    genre: "Tycoon",
    maturity: "Everyone",
    description: "Build rides, welcome NPC customers, tune prices, earn money, and keep guests happy in a 3D park."
  },
  {
    id: "gun-game",
    title: "Gun Game: Neon Yard",
    genre: "Shooter",
    maturity: "Mild",
    description: "A compact neon range with raised firing lanes, pop targets, and weapon pickups."
  },
  {
    id: "speed-trials",
    title: "Speed Trials: Sky Dash",
    genre: "Obby",
    maturity: "Everyone",
    description: "A bright timed course with checkpoint gates, jump pads, and floating sprint lanes."
  },
  {
    id: "gravity-flip",
    title: "Gravity Flip: Orbit Pads",
    genre: "Platformer",
    maturity: "Everyone",
    description: "Leap between floating purple pads, spinning rings, and energy cores in the sky."
  },
  {
    id: "base-defense",
    title: "Base Defense: Night Fort",
    genre: "Defense",
    maturity: "Mild",
    description: "Defend a walled bunker with supply crates, watch towers, barricades, and enemy dummies."
  },
  {
    id: "pet-evolution",
    title: "Pet Evolution: Cube Meadow",
    genre: "Simulator",
    maturity: "Everyone",
    description: "Collect glowing pet energy around nests, training hoops, and growing cube creatures."
  },
  {
    id: "vehicle-builder",
    title: "Vehicle Builder: Test Track",
    genre: "Building",
    maturity: "Everyone",
    description: "A garage sandbox with ramps, test loops, scattered car parts, and a block vehicle."
  },
  {
    id: "floor-is-lava",
    title: "Floor Is Lava: Tower Hop",
    genre: "Survival",
    maturity: "Everyone",
    description: "Hop across tall platforms while the glowing lava ring claims the ground."
  },
  {
    id: "hide-seek",
    title: "Hide & Seek: Box City",
    genre: "Party",
    maturity: "Everyone",
    description: "A massive warehouse map packed with cardboard boxes, lockers, shelves, vents, tents, and hiding corners."
  },
  {
    id: "fishing-contest",
    title: "Fishing Contest: Dockside",
    genre: "Casual",
    maturity: "Everyone",
    description: "A lake map with docks, boats, reeds, fish rings, and chill collectible catches."
  },
  {
    id: "treasure-hunt",
    title: "Treasure Hunt: Ruin Island",
    genre: "Adventure",
    maturity: "Everyone",
    description: "Explore ruins, broken pillars, bridges, and dig spots for glowing treasure."
  },
  {
    id: "factory-tycoon",
    title: "Factory Tycoon: Conveyor Works",
    genre: "Tycoon",
    maturity: "Everyone",
    description: "A factory floor with conveyors, machines, droppers, upgrade buttons, and money cubes."
  }
];

const AVATAR_ITEMS = [
  { id: "starter-shirt", name: "First Play CUBIXIA Shirt", type: "shirt", price: 0, creator: "CUBIXIA", description: "Launch shirt given to every new player." },
  { id: "cube-cap", name: "CUBIXIA Cube Cap", type: "hat", price: 0, creator: "CUBIXIA", description: "A free cube cap for first-time players." },
  { id: "premium-hat", name: "Premium Hat", type: "hat", price: 1000, creator: "Cubixia Studios", description: "A custom Blender hat fitted to the CUBIXIA avatar." },
  { id: "tycoon-badge-pin", name: "Tycoon Starter Pin", type: "accessory", price: 0, creator: "CUBIXIA", description: "A chest pin for builders and tycoon players." },
  { id: "survivor-vest", name: "Safe Zone Survivor Vest", type: "shirt", price: 85, creator: "CUBIXIA Survival Team", description: "Layered survival vest that appears in 3D games." },
  { id: "neon-visor", name: "Neon Visor", type: "face", price: 120, creator: "Avatar Creators", description: "Bright face visor for futuristic outfits." },
  { id: "hair-04", name: "Hair 04", type: "hair", price: 0, creator: "Avatar Creators", description: "Free layered hair inspired by the Hair_04 pack." },
  { id: "bangs-hair", name: "Bangs Hair", type: "hair", price: 0, creator: "Avatar Creators", description: "Free Blender bangs hair fitted to CUBIXIA avatars." },
  { id: "wing-pack", name: "Angel Wings", type: "back", price: 180, creator: "Cubixia Studios", description: "Blender-made angel wings that appear on your CUBIXIA avatar." },
  { id: "speed-boots", name: "Speed Trial Boots", type: "shoes", price: 95, creator: "Cubixia Studios", description: "Chunky blue boots with a speed-trial glow." },
  { id: "creator-crown", name: "Creator Crown", type: "hat", price: 0, creator: "Tanklyplayz", description: "Owner-only Blender crown for CUBIXIA creator accounts." },
  { id: "ban-hammer", name: "Ban Hammer", type: "tool", price: 0, creator: "CUBIXIA Moderation", description: "Owner/moderation item that appears on the avatar." }
];

const STARTER_ITEM_IDS = ["starter-shirt", "cube-cap", "tycoon-badge-pin"];
const OWNER_ITEM_IDS = ["creator-crown", "ban-hammer"];
const OWNER_EMAIL = "monkeyvrgames@gmail.com";
const DEFAULT_AVATAR_STYLE = {
  skin: "#f0d0a7",
  shirt: "#2268d8",
  pants: "#252b35",
  hair: "#7a4a1d",
  accessory: "none"
};
const DEFAULT_GROUPS = [
  {
    id: "cubixia-studios",
    name: "Cubixia Studios",
    owner: "Tanklyplayz",
    logo: "CX",
    price: 0,
    description: "Official CUBIXIA development and creator group.",
    createdAt: "2026-05-25T00:00:00.000Z",
    visits: 523,
    favorites: 3,
    roles: ["Owner", "Admin", "Moderator", "Member"],
    announcements: [
      { id: "launch", title: "Welcome to Cubixia Studios", body: "Official updates, creator tools, moderation notes, and game announcements will show here.", createdAt: "2026-05-25T00:00:00.000Z" }
    ]
  },
  { id: "survival-squad", name: "Survival Squad", owner: "CUBIXIA", logo: "ZS", price: 0, description: "Wave pushing, weapon testing, and safe-zone events.", createdAt: "2026-05-25T00:00:00.000Z", visits: 128, favorites: 1, roles: ["Leader", "Fighter", "Member"], announcements: [{ id: "waves", title: "Wave nights", body: "Squad up for zombie survival testing.", createdAt: "2026-05-25T00:00:00.000Z" }] },
  { id: "tycoon-builders", name: "Tycoon Builders", owner: "CUBIXIA", logo: "TB", price: 0, description: "Ride layouts, price experiments, and park showcases.", createdAt: "2026-05-25T00:00:00.000Z", visits: 94, favorites: 1, roles: ["Manager", "Builder", "Member"], announcements: [{ id: "rides", title: "Ride showcase", body: "Post your best coaster and park ideas.", createdAt: "2026-05-25T00:00:00.000Z" }] },
  { id: "avatar-creators", name: "Avatar Creators", owner: "CUBIXIA", logo: "AC", price: 0, description: "Free outfits, launch badges, and CUBIXIA style drops.", createdAt: "2026-05-25T00:00:00.000Z", visits: 72, favorites: 1, roles: ["Designer", "Creator", "Member"], announcements: [{ id: "first-shirt", title: "First play outfit", body: "New launch clothing is available for free.", createdAt: "2026-05-25T00:00:00.000Z" }] }
];
const BLOCKED_CHAT_TERMS = ["nigger", "nigga", "fuck", "shit", "bitch", "asshole", "dick", "pussy", "cunt", "fag"];

app.set("trust proxy", true);
app.use(express.json({ limit: "2mb" }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-me-before-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    }
  })
);
app.use(express.static(path.join(__dirname, "public")));
app.use("/vendor/three/addons", express.static(path.join(__dirname, "node_modules", "three", "examples", "jsm")));
app.use("/vendor/three", express.static(path.join(__dirname, "node_modules", "three", "build")));

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await syncDesktopSeedData();
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, "[]", "utf8");
  }
  try {
    await fs.access(CHAT_FILE);
  } catch {
    await fs.writeFile(CHAT_FILE, "[]", "utf8");
  }
  try {
    await fs.access(REPORTS_FILE);
  } catch {
    await fs.writeFile(REPORTS_FILE, "[]", "utf8");
  }
  try {
    await fs.access(GROUPS_FILE);
  } catch {
    await fs.writeFile(GROUPS_FILE, JSON.stringify(DEFAULT_GROUPS, null, 2), "utf8");
  }
  try {
    await fs.access(STUDIO_FILE);
  } catch {
    await fs.writeFile(STUDIO_FILE, "[]", "utf8");
  }
  try {
    await fs.access(CONTENT_FILE);
  } catch {
    await fs.writeFile(CONTENT_FILE, JSON.stringify({ games: {}, items: {} }, null, 2), "utf8");
  }
  try {
    contentStateCache = normalizeContentState(JSON.parse(await fs.readFile(CONTENT_FILE, "utf8")));
  } catch {
    contentStateCache = { games: {}, items: {} };
    await fs.writeFile(CONTENT_FILE, JSON.stringify(contentStateCache, null, 2), "utf8");
  }
}

async function syncDesktopSeedData() {
  if (process.env.CUBIXIA_DESKTOP_SYNC_DATA !== "true" || !DATA_SEED_DIR || !DESKTOP_DATA_VERSION) return;
  if (path.resolve(DATA_SEED_DIR) === path.resolve(DATA_DIR)) return;
  try {
    const currentVersion = await fs.readFile(DESKTOP_DATA_MARKER_FILE, "utf8").catch(() => "");
    if (currentVersion.trim() === DESKTOP_DATA_VERSION) return;
    await fs.mkdir(DATA_DIR, { recursive: true });
    const seedFiles = [
      "users.json",
      "chat.json",
      "reports.json",
      "groups.json",
      "studio-games.json",
      "content-state.json"
    ];
    for (const file of seedFiles) {
      const source = path.join(DATA_SEED_DIR, file);
      const destination = path.join(DATA_DIR, file);
      try {
        await fs.copyFile(source, destination);
      } catch {
        // Missing seed files are recreated by ensureStore below.
      }
    }
    await fs.writeFile(DESKTOP_DATA_MARKER_FILE, DESKTOP_DATA_VERSION, "utf8");
  } catch (error) {
    console.warn("CUBIXIA desktop data sync skipped:", error.message);
  }
}

async function readUsers() {
  try {
    await userWriteQueue;
  } catch {
    userWriteQueue = Promise.resolve();
  }
  await ensureStore();
  const raw = await fs.readFile(USERS_FILE, "utf8");
  let users;
  try {
    if (!raw.trim()) throw new Error("User store is empty.");
    users = JSON.parse(raw);
  } catch (error) {
    const repaired = repairUsersJson(raw);
    if (repaired) {
      await fs.writeFile(USERS_FILE, repaired, "utf8");
      users = JSON.parse(repaired);
    } else {
      const backup = await readUsersBackup();
      if (backup) {
        await fs.writeFile(USERS_FILE, JSON.stringify(backup, null, 2), "utf8");
        users = backup;
      } else {
        await fs.writeFile(path.join(DATA_DIR, `users.corrupt-${Date.now()}.json`), raw, "utf8");
        users = [];
      }
    }
  }
  return users.map(normalizeUser);
}

async function readUsersBackup() {
  try {
    const raw = await fs.readFile(USERS_BACKUP_FILE, "utf8");
    const users = JSON.parse(raw);
    return Array.isArray(users) ? users : null;
  } catch {
    return null;
  }
}

function repairUsersJson(raw) {
  const trimmed = raw.trim();
  if (trimmed.endsWith("]]")) return `${trimmed.slice(0, -1)}\n`;
  return "";
}

async function writeUsers(users) {
  const payload = JSON.stringify(users.map(normalizeUser), null, 2);
  userWriteQueue = userWriteQueue.catch(() => {}).then(async () => {
    const tmp = `${USERS_FILE}.tmp`;
    try {
      const existing = JSON.parse(await fs.readFile(USERS_FILE, "utf8"));
      if (Array.isArray(existing) && existing.length > 0) {
        await fs.writeFile(USERS_BACKUP_FILE, JSON.stringify(existing, null, 2), "utf8");
      }
    } catch {
      // If the previous file is damaged, keep writing the new valid payload.
    }
    await fs.writeFile(tmp, payload, "utf8");
    await fs.rename(tmp, USERS_FILE);
  });
  return userWriteQueue;
}

async function readChat() {
  await ensureStore();
  return JSON.parse(await fs.readFile(CHAT_FILE, "utf8"));
}

async function writeChat(messages) {
  const payload = JSON.stringify(messages.slice(-1000), null, 2);
  chatWriteQueue = chatWriteQueue.then(async () => {
    const tmp = `${CHAT_FILE}.tmp`;
    await fs.writeFile(tmp, payload, "utf8");
    await fs.rename(tmp, CHAT_FILE);
  });
  return chatWriteQueue;
}

async function readReports() {
  await ensureStore();
  try {
    const reports = JSON.parse(await fs.readFile(REPORTS_FILE, "utf8"));
    return Array.isArray(reports) ? reports : [];
  } catch {
    await fs.writeFile(REPORTS_FILE, "[]", "utf8");
    return [];
  }
}

async function writeReports(reports) {
  const payload = JSON.stringify(reports.slice(0, 250), null, 2);
  reportWriteQueue = reportWriteQueue.catch(() => {}).then(async () => {
    const tmp = `${REPORTS_FILE}.tmp`;
    await fs.writeFile(tmp, payload, "utf8");
    await fs.rename(tmp, REPORTS_FILE);
  });
  return reportWriteQueue;
}

async function readGroups() {
  await ensureStore();
  try {
    const groups = JSON.parse(await fs.readFile(GROUPS_FILE, "utf8"));
    return mergeGroups(Array.isArray(groups) ? groups : []);
  } catch {
    await fs.writeFile(GROUPS_FILE, JSON.stringify(DEFAULT_GROUPS, null, 2), "utf8");
    return DEFAULT_GROUPS;
  }
}

function mergeGroups(groups) {
  const byId = new Map(groups.map((group) => [group.id, group]));
  return DEFAULT_GROUPS.map((fallback) => ({ ...fallback, ...(byId.get(fallback.id) || {}) }));
}

async function writeGroups(groups) {
  const payload = JSON.stringify(mergeGroups(groups), null, 2);
  groupWriteQueue = groupWriteQueue.catch(() => {}).then(async () => {
    const tmp = `${GROUPS_FILE}.tmp`;
    await fs.writeFile(tmp, payload, "utf8");
    await fs.rename(tmp, GROUPS_FILE);
  });
  return groupWriteQueue;
}

function normalizeContentState(state = {}) {
  const normalizeBucket = (bucket = {}) => Object.fromEntries(Object.entries(bucket || {}).map(([id, record]) => [String(id), {
    deleted: Boolean(record?.deleted),
    originalName: String(record?.originalName || record?.originalTitle || "").slice(0, 80),
    reason: String(record?.reason || "").slice(0, 200),
    deletedBy: String(record?.deletedBy || "").slice(0, 40),
    deletedAt: record?.deletedAt || "",
    restoredBy: String(record?.restoredBy || "").slice(0, 40),
    restoredAt: record?.restoredAt || ""
  }]));
  const normalizeStats = (bucket = {}) => Object.fromEntries(Object.entries(bucket || {}).map(([id, record]) => [String(id), {
    likes: Math.max(0, Number(record?.likes || 0)),
    dislikes: Math.max(0, Number(record?.dislikes || 0)),
    favorites: Math.max(0, Number(record?.favorites || 0)),
    notifies: Math.max(0, Number(record?.notifies || 0))
  }]));
  return {
    games: normalizeBucket(state.games),
    items: normalizeBucket(state.items),
    gameStats: normalizeStats(state.gameStats),
    chatControls: state.chatControls && typeof state.chatControls === "object" ? state.chatControls : {},
    serverControls: state.serverControls && typeof state.serverControls === "object" ? state.serverControls : {},
    gameEvents: state.gameEvents && typeof state.gameEvents === "object" ? state.gameEvents : {},
    worldEvents: state.worldEvents && typeof state.worldEvents === "object" ? state.worldEvents : {},
    lockdown: {
      active: Boolean(state.lockdown?.active),
      reason: String(state.lockdown?.reason || "").slice(0, 500),
      staffMessage: String(state.lockdown?.staffMessage || "").slice(0, 700),
      lockedBy: String(state.lockdown?.lockedBy || "").slice(0, 40),
      startedAt: Number(state.lockdown?.startedAt || 0),
      audioUntil: Number(state.lockdown?.audioUntil || 0)
    }
  };
}

async function readContentState() {
  await ensureStore();
  return contentStateCache;
}

async function writeContentState(state) {
  const normalized = normalizeContentState(state);
  contentStateCache = normalized;
  const payload = JSON.stringify(normalized, null, 2);
  contentWriteQueue = contentWriteQueue.catch(() => {}).then(async () => {
    const tmp = `${CONTENT_FILE}.tmp`;
    await fs.writeFile(tmp, payload, "utf8");
    await fs.rename(tmp, CONTENT_FILE);
  });
  return contentWriteQueue;
}

function contentRecord(type, id) {
  return contentStateCache[type === "item" || type === "items" ? "items" : "games"]?.[String(id || "")] || null;
}

function isContentDeleted(type, id) {
  return Boolean(contentRecord(type, id)?.deleted);
}

async function activeLockdownState() {
  const state = await readContentState();
  return state.lockdown?.active ? state.lockdown : null;
}

function publicLockdown(lockdown) {
  if (!lockdown?.active) return null;
  return {
    active: true,
    reason: lockdown.reason || "CUBIXIA is currently under owner lockdown.",
    staffMessage: lockdown.staffMessage || "",
    lockedBy: lockdown.lockedBy || "CUBIXIA",
    startedAt: Number(lockdown.startedAt || Date.now()),
    audioUntil: Number(lockdown.audioUntil || Date.now() + 5 * 60 * 1000),
    audio: "/assets/owner-lockdown.mp3"
  };
}

function publicLockdownForUser(lockdown, user) {
  return canModerate(user) ? null : publicLockdown(lockdown);
}

function contentTypeFromBody(value) {
  const type = String(value || "").toLowerCase();
  return ["item", "items", "clothing", "clothes", "shirt", "accessory"].includes(type) ? "items" : "games";
}

function gameReactionStats(gameId) {
  const stats = contentStateCache.gameStats?.[String(gameId || "")] || {};
  return {
    likes: Math.max(0, Number(stats.likes || 0)),
    dislikes: Math.max(0, Number(stats.dislikes || 0)),
    favorites: Math.max(0, Number(stats.favorites || 0)),
    notifies: Math.max(0, Number(stats.notifies || 0))
  };
}

function gameRatingText(game) {
  const base = Number(String(game.rating || "90").match(/\d+/)?.[0] || 90);
  const stats = gameReactionStats(game.id);
  const adjusted = Math.max(0, Math.min(100, base + stats.likes * 2 - stats.dislikes * 2));
  return `${Math.round(adjusted)}%`;
}

function publicGame(game) {
  const record = contentRecord("games", game.id);
  const stats = gameReactionStats(game.id);
  if (!record?.deleted) {
    return {
      ...game,
      source: game.source || "built-in",
      rating: gameRatingText(game),
      reactions: stats,
      deleted: false
    };
  }
  return {
    ...game,
    source: game.source || "built-in",
    title: "[Content Deleted]",
    description: "This game was deleted by CUBIXIA moderation and cannot be played.",
    rating: "Deleted",
    players: "Unavailable",
    deleted: true,
    deletedReason: record.reason,
    originalTitle: record.originalName || game.title,
    reactions: stats
  };
}

function publicItem(item) {
  const record = contentRecord("items", item.id);
  if (!record?.deleted) return { createdAt: item.createdAt || "Jun 1, 2026", ...item, deleted: false };
  return {
    ...item,
    createdAt: item.createdAt || "Jun 1, 2026",
    name: "[Content Deleted]",
    description: "This clothing/item was deleted by CUBIXIA moderation and cannot be used.",
    price: 0,
    deleted: true,
    deletedReason: record.reason,
    originalName: record.originalName || item.name
  };
}

function publicItems() {
  return AVATAR_ITEMS.map(publicItem);
}

async function deletedGameResponse(gameId, res) {
  await readContentState();
  if (!isContentDeleted("games", gameId)) return false;
  res.status(410).json({ error: "This game was deleted by CUBIXIA moderation and cannot be played." });
  return true;
}

function slugify(value) {
  return String(value || "game").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 42) || "game";
}

function normalizeStudioObject(object, index, worldLimit = 38) {
  const type = ["block", "spawn", "coin", "npc", "hazard", "platform", "tree"].includes(object.type) ? object.type : "block";
  const size = object.size || {};
  const position = object.position || {};
  const rotation = object.rotation || {};
  const material = ["plastic", "metal", "neon", "wood", "glass"].includes(object.material) ? object.material : "plastic";
  return {
    id: String(object.id || `obj-${index}-${crypto.randomUUID().slice(0, 6)}`).slice(0, 48),
    type,
    name: String(object.name || type).slice(0, 40),
    asset: String(object.asset || "").slice(0, 40),
    color: /^#[0-9a-fA-F]{6}$/.test(String(object.color || "")) ? object.color : "#315cff",
    material,
    locked: Boolean(object.locked),
    anchored: object.anchored !== false,
    behavior: ["static", "collect", "damage", "bounce", "spawn"].includes(object.behavior) ? object.behavior : type === "coin" ? "collect" : type === "hazard" ? "damage" : type === "spawn" ? "spawn" : "static",
    position: {
      x: Math.max(-worldLimit, Math.min(worldLimit, Number(position.x || 0))),
      y: Math.max(0, Math.min(80, Number(position.y || 0))),
      z: Math.max(-worldLimit, Math.min(worldLimit, Number(position.z || 0)))
    },
    size: {
      x: Math.max(0.2, Math.min(80, Number(size.x || (type === "spawn" ? 1.2 : 2)))),
      y: Math.max(0.2, Math.min(80, Number(size.y || (type === "coin" ? 0.6 : 1)))),
      z: Math.max(0.2, Math.min(80, Number(size.z || (type === "spawn" ? 1.2 : 2))))
    },
    rotation: {
      x: Math.max(-Math.PI * 2, Math.min(Math.PI * 2, Number(rotation.x || 0))),
      y: Math.max(-Math.PI * 2, Math.min(Math.PI * 2, Number(rotation.y ?? object.rotationY ?? 0))),
      z: Math.max(-Math.PI * 2, Math.min(Math.PI * 2, Number(rotation.z || 0)))
    },
    rotationY: Math.max(-Math.PI * 2, Math.min(Math.PI * 2, Number(rotation.y ?? object.rotationY ?? 0)))
  };
}

function normalizeStudioServices(services = {}) {
  const legacyNames = ["Workspace", "Players", "Lighting", "ReplicatedStorage", "ServerScriptService", "StarterGui", "StarterPack", "StarterPlayer", "Teams", "SoundService", "TextChatService", "WorldRoot", "PlayerRegistry", "LightGrid", "SharedVault", "ServerLogic", "InterfaceLayer", "GearBay", "SpawnProfile", "Factions", "AudioMixer", "SignalChat"];
  const names = ["World", "Players", "Lighting", "Shared Storage", "Server Scripts", "UI Screens", "Starter Gear", "Spawn Settings", "Teams", "Audio", "Chat"];
  return names.reduce((result, name) => {
    const index = names.indexOf(name);
    const legacyEntries = legacyNames
      .filter((_, legacyIndex) => legacyIndex % names.length === index)
      .flatMap((legacyName) => Array.isArray(services[legacyName]) ? services[legacyName] : []);
    const entries = Array.isArray(services[name]) ? services[name] : legacyEntries;
    result[name] = entries.slice(0, 50).map((entry, index) => ({
      id: String(entry.id || `svc-${index}-${crypto.randomUUID().slice(0, 6)}`).slice(0, 48),
      name: String(entry.name || "Script").slice(0, 48),
      type: ["script", "module", "remote", "sound", "ui", "folder"].includes(entry.type) ? entry.type : "script"
    }));
    return result;
  }, {});
}

function normalizeStudioWorld(world = {}) {
  const size = Math.max(40, Math.min(500, Number(world.size || 160)));
  const worldLimit = Math.max(18, Math.min(245, size / 2 - 2));
  const objects = Array.isArray(world.objects) ? world.objects.slice(0, 150).map((object, index) => normalizeStudioObject(object, index, worldLimit)) : [];
  if (!objects.some((object) => object.type === "spawn")) {
    objects.unshift(normalizeStudioObject({ type: "spawn", name: "Spawn", color: "#44db78", position: { x: 0, y: 0.05, z: 4 }, size: { x: 1.4, y: 0.15, z: 1.4 }, behavior: "spawn" }, 0));
  }
  return {
    size,
    sky: /^#[0-9a-fA-F]{6}$/.test(String(world.sky || "")) ? world.sky : "#91d7ff",
    ground: /^#[0-9a-fA-F]{6}$/.test(String(world.ground || "")) ? world.ground : "#5fbd82",
    objects,
    services: normalizeStudioServices(world.services)
  };
}

function normalizeStudioGame(game) {
  return {
    id: String(game.id || `studio-${crypto.randomUUID()}`).slice(0, 80),
    ownerId: game.ownerId,
    owner: String(game.owner || "Creator").slice(0, 40),
    title: String(game.title || "Untitled CUBIXIA Game").trim().slice(0, 60) || "Untitled CUBIXIA Game",
    genre: String(game.genre || "Creator").trim().slice(0, 32) || "Creator",
    description: String(game.description || "A player-created CUBIXIA experience.").trim().slice(0, 600) || "A player-created CUBIXIA experience.",
    rating: game.rating || "New",
    players: "Live server",
    banner: "studio",
    maturity: "Everyone",
    source: "studio",
    published: Boolean(game.published),
    createdAt: game.createdAt || new Date().toISOString(),
    updatedAt: game.updatedAt || new Date().toISOString(),
    publishedAt: game.publishedAt || "",
    studioWorld: normalizeStudioWorld(game.studioWorld || {})
  };
}

function publicStudioGame(game) {
  const normalized = normalizeStudioGame(game);
  return publicGame({
    id: normalized.id,
    title: normalized.title,
    genre: normalized.genre,
    banner: normalized.banner,
    rating: normalized.rating,
    players: normalized.players,
    description: normalized.description,
    creator: normalized.owner,
    source: "studio",
    published: normalized.published,
    updatedAt: normalized.updatedAt,
    publishedAt: normalized.publishedAt,
    studioWorld: normalized.studioWorld
  });
}

async function readStudioGames() {
  await ensureStore();
  try {
    const games = JSON.parse(await fs.readFile(STUDIO_FILE, "utf8"));
    return Array.isArray(games) ? games.map(normalizeStudioGame) : [];
  } catch {
    await fs.writeFile(STUDIO_FILE, "[]", "utf8");
    return [];
  }
}

async function writeStudioGames(games) {
  const payload = JSON.stringify(games.map(normalizeStudioGame), null, 2);
  studioWriteQueue = studioWriteQueue.catch(() => {}).then(async () => {
    const tmp = `${STUDIO_FILE}.tmp`;
    await fs.writeFile(tmp, payload, "utf8");
    await fs.rename(tmp, STUDIO_FILE);
  });
  return studioWriteQueue;
}

async function gameTitleFromStore(gameId) {
  await readContentState();
  if (isContentDeleted("games", gameId)) return "[Content Deleted]";
  const builtIn = GAMES.find((game) => game.id === gameId);
  if (builtIn) return builtIn.title;
  const studioGames = await readStudioGames();
  return studioGames.find((game) => game.id === gameId)?.title || "CUBIXIA Game";
}

function activeRememberedDevices(user) {
  const now = Date.now();
  return (Array.isArray(user.twoStep?.rememberedDevices) ? user.twoStep.rememberedDevices : [])
    .filter((device) => device && device.tokenHash && Number(device.expiresAt || 0) > now)
    .slice(-10);
}

function normalizeHexColor(value, fallback) {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}

function normalizeAvatarStyle(current = {}, incoming = {}) {
  const merged = { ...DEFAULT_AVATAR_STYLE, ...current, ...incoming };
  return {
    ...merged,
    skin: normalizeHexColor(merged.skin, DEFAULT_AVATAR_STYLE.skin),
    shirt: normalizeHexColor(merged.shirt, DEFAULT_AVATAR_STYLE.shirt),
    pants: normalizeHexColor(merged.pants, DEFAULT_AVATAR_STYLE.pants),
    hair: normalizeHexColor(merged.hair, DEFAULT_AVATAR_STYLE.hair)
  };
}

function avatarStyleError(style) {
  const colors = new Set([style.skin, style.shirt, style.pants, style.hair]);
  return colors.size < 2 ? "Avatar colors cannot all be the same. Pick at least one different color." : "";
}

function normalizeUser(user) {
  const ownerAccount = isOwnerName(user.username);
  const ownerAccess = ownerAccount || user.role === "cofounder";
  const ownerEmailChanged = ownerAccount && String(user.email || "").toLowerCase() !== OWNER_EMAIL;
  const ownerBadges = ownerAccount ? ["CREATOR/OWNER", "CUBIXIA"] : user.role === "cofounder" ? ["CO-FOUNDER", "CUBIXIA"] : [];
  const badges = Array.from(new Set([...(user.badges || ["Founder"]), ...ownerBadges]));
  const role = ownerAccount ? "owner" : ["cofounder", "admin", "mod"].includes(user.role) ? user.role : "user";
  const ownedItems = Array.isArray(user.inventory) ? user.inventory : STARTER_ITEM_IDS;
  const canUseBanHammer = ownerAccess || role === "admin" || role === "mod";
  const allowedOwnedItems = ownedItems.filter((itemId) => itemId !== "ban-hammer" || canUseBanHammer);
  const moderationItems = role === "admin" || role === "mod" ? ["ban-hammer"] : [];
  const inventory = Array.from(new Set([...allowedOwnedItems, ...(ownerAccess ? OWNER_ITEM_IDS : []), ...moderationItems]));
  const equipped = Array.from(new Set((user.equipped || ["starter-shirt", "cube-cap"]).filter((itemId) => inventory.includes(itemId))));
  return {
    ...user,
    username: ownerAccount ? "Tanklyplayz" : user.username,
    email: ownerAccount ? OWNER_EMAIL : user.email,
    avatar: user.avatar || "",
    avatarStyle: normalizeAvatarStyle(user.avatarStyle),
    inventory,
    equipped,
    cubbux: ownerAccess ? Math.max(Number(user.cubbux || 0), 100000) : Number.isFinite(Number(user.cubbux)) ? Number(user.cubbux) : 125,
    transactions: user.transactions || [],
    role,
    gameSettings: {
      cameraSensitivity: Number(user.gameSettings?.cameraSensitivity || 1),
      cameraInverted: user.gameSettings?.cameraInverted !== false,
      smoothZoom: user.gameSettings?.smoothZoom !== false,
      firstPersonZoom: user.gameSettings?.firstPersonZoom !== false,
      cameraFollow: user.gameSettings?.cameraFollow || "free"
    },
    settings: {
      notifications: {
        friendRequests: user.settings?.notifications?.friendRequests !== false,
        messages: user.settings?.notifications?.messages !== false,
        gameUpdates: user.settings?.notifications?.gameUpdates !== false,
        moderation: user.settings?.notifications?.moderation !== false
      },
      privacy: {
        profileVisible: user.settings?.privacy?.profileVisible !== false,
        showOnline: user.settings?.privacy?.showOnline !== false,
        allowFriendRequests: user.settings?.privacy?.allowFriendRequests !== false,
        allowJoin: user.settings?.privacy?.allowJoin !== false,
        allowMessages: user.settings?.privacy?.allowMessages !== false
      },
      browser: {
        reduceMotion: Boolean(user.settings?.browser?.reduceMotion),
        showPerformance: Boolean(user.settings?.browser?.showPerformance),
        theme: ["light", "dark", "auto"].includes(user.settings?.browser?.theme) ? user.settings.browser.theme : "auto",
        uiScale: Number(user.settings?.browser?.uiScale || 1)
      }
    },
    groups: user.groups || [],
    bio: user.bio || "Building my corner of CUBIXIA.",
    badges,
    achievements: user.achievements || ["First Login"],
    friends: user.friends || [],
    incomingRequests: user.incomingRequests || [],
    outgoingRequests: user.outgoingRequests || [],
    notifications: user.notifications || [],
    following: Array.isArray(user.following) ? user.following : [],
    gameInteractions: user.gameInteractions && typeof user.gameInteractions === "object" ? user.gameInteractions : {},
    progression: {
      level: Math.max(1, Number(user.progression?.level || 1)),
      xp: Math.max(0, Number(user.progression?.xp || 0)),
      lastDailyAt: Number(user.progression?.lastDailyAt || 0),
      streak: Math.max(0, Number(user.progression?.streak || 0)),
      stats: {
        speed: Number(user.progression?.stats?.speed || 1),
        strength: Number(user.progression?.stats?.strength || 1),
        luck: Number(user.progression?.stats?.luck || 1)
      },
      title: user.progression?.title || "Explorer"
    },
    backpack: Array.isArray(user.backpack) ? user.backpack : ["Starter Map", "Snack", "Smoke"],
    party: user.party || null,
    status: user.status || "",
    lastOnline: user.lastOnline || new Date().toISOString(),
    online: Boolean(user.online),
    currentGame: user.currentGame || "",
    banned: Boolean(user.banned),
    permanentBan: Boolean(user.permanentBan),
    ipBanned: Boolean(user.ipBanned),
    ipBanRecords: Array.isArray(user.ipBanRecords) ? user.ipBanRecords : [],
    lastIpHash: user.lastIpHash || "",
    lastDeviceHash: user.lastDeviceHash || "",
    lastUserAgent: user.lastUserAgent || "",
    banReason: user.banReason || "",
    banUntil: Number(user.banUntil || 0),
    timeoutUntil: Number(user.timeoutUntil || 0),
    timeoutReason: user.timeoutReason || "",
    moderationNotice: user.moderationNotice || null,
    worldState: user.worldState || null,
    passwordResetCode: user.passwordResetCode || "",
    passwordResetExpires: user.passwordResetExpires || 0,
    twoStep: {
      enabled: user.twoStep?.enabled !== false,
      codeHash: ownerEmailChanged ? "" : user.twoStep?.codeHash || "",
      codeExpires: ownerEmailChanged ? 0 : Number(user.twoStep?.codeExpires || 0),
      attempts: ownerEmailChanged ? 0 : Number(user.twoStep?.attempts || 0),
      requestedAt: ownerEmailChanged ? 0 : Number(user.twoStep?.requestedAt || 0),
      lastSentAt: ownerEmailChanged ? 0 : Number(user.twoStep?.lastSentAt || 0),
      verifiedAt: Number(user.twoStep?.verifiedAt || 0),
      rememberedDevices: activeRememberedDevices(user)
    },
    lastPlayed: user.lastPlayed || {
      id: "cubixia-survival",
      title: "Cubixia: Survival",
      progress: "Safe-zone lobby",
      xp: 0,
      currency: 0
    }
  };
}

function validateUsername(username) {
  return /^[a-zA-Z0-9_]{3,18}$/.test(username);
}

function isOwnerName(username) {
  return String(username || "").toLowerCase() === "tanklyplayz";
}

function hasOwnerAccess(user) {
  return Boolean(user && (isOwnerName(user.username) || user.role === "cofounder"));
}

function canModerate(user) {
  return Boolean(user && (hasOwnerAccess(user) || user.role === "admin" || user.role === "mod"));
}

function canTimeout(user) {
  return Boolean(user && (hasOwnerAccess(user) || user.role === "admin"));
}

function isTimedOut(user) {
  return Number(user.timeoutUntil || 0) > Date.now();
}

function durationMsFromBody(body, fallbackMs = 0) {
  if (isPermanentRequested(body.permanent) || String(body.durationUnit || "").toLowerCase() === "permanent") return 0;
  const value = Number(body.durationValue || body.minutes || 0);
  const unit = String(body.durationUnit || (body.minutes ? "minutes" : "")).toLowerCase();
  if (!Number.isFinite(value) || value <= 0) return fallbackMs;
  const units = {
    second: 1000,
    seconds: 1000,
    minute: 60 * 1000,
    minutes: 60 * 1000,
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    months: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
    years: 365 * 24 * 60 * 60 * 1000
  };
  return Math.min(value * (units[unit] || 60 * 1000), 10 * 365 * 24 * 60 * 60 * 1000);
}

function durationFromToken(token, fallbackMs = 10 * 60 * 1000) {
  const raw = String(token || "").trim().toLowerCase();
  if (!raw) return { ms: fallbackMs, permanent: false, label: formatDuration(fallbackMs) };
  if (["perm", "perma", "permanent", "forever"].includes(raw)) return { ms: 0, permanent: true, label: "permanent" };
  const match = raw.match(/^(\d+(?:\.\d+)?)(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks|mo|month|months|y|yr|yrs|year|years)?$/);
  if (!match) return { ms: fallbackMs, permanent: false, label: formatDuration(fallbackMs) };
  const value = Number(match[1]);
  const unit = match[2] || "minutes";
  const units = {
    s: 1000, sec: 1000, secs: 1000, second: 1000, seconds: 1000,
    m: 60 * 1000, min: 60 * 1000, mins: 60 * 1000, minute: 60 * 1000, minutes: 60 * 1000,
    h: 60 * 60 * 1000, hr: 60 * 60 * 1000, hrs: 60 * 60 * 1000, hour: 60 * 60 * 1000, hours: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000, day: 24 * 60 * 60 * 1000, days: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000, week: 7 * 24 * 60 * 60 * 1000, weeks: 7 * 24 * 60 * 60 * 1000,
    mo: 30 * 24 * 60 * 60 * 1000, month: 30 * 24 * 60 * 60 * 1000, months: 30 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000, yr: 365 * 24 * 60 * 60 * 1000, yrs: 365 * 24 * 60 * 60 * 1000, year: 365 * 24 * 60 * 60 * 1000, years: 365 * 24 * 60 * 60 * 1000
  };
  const ms = Math.min(Math.max(1000, value * (units[unit] || units.minutes)), 10 * 365 * 24 * 60 * 60 * 1000);
  return { ms, permanent: false, label: raw };
}

function formatDuration(ms) {
  const seconds = Math.round(Number(ms || 0) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function isPermanentRequested(value) {
  return value === true || value === "true" || value === "on" || value === "1" || value === "permanent";
}

function activeIpBanForRequest(req, users) {
  const ipHash = requestIpHash(req);
  const deviceHash = requestDeviceHash(req);
  const now = Date.now();
  for (const user of users) {
    const records = Array.isArray(user.ipBanRecords) ? user.ipBanRecords : [];
    const active = records.find((record) => {
      const until = Number(record.until || user.banUntil || 0);
      const timeActive = !until || until > now;
      const deviceMatches = record.deviceHash ? record.deviceHash === deviceHash : true;
      return timeActive && record.ipHash === ipHash && deviceMatches;
    });
    if (active) {
      return {
        user,
        record: active,
        moderation: {
          action: "ipban",
          title: active.permanent ? "IP Banned" : "IP Ban Active",
          reason: active.reason || user.banReason || "This device/IP is banned from CUBIXIA.",
          moderator: active.moderator || "CUBIXIA",
          until: Number(active.until || 0),
          permanent: Boolean(active.permanent || !active.until),
          canAcknowledge: false,
          remainingMs: active.until ? Math.max(0, Number(active.until) - now) : 0
        }
      };
    }
  }
  return null;
}

function applyIpBan(target, moderator, reason, until, req) {
  if (!target.lastIpHash || !target.lastDeviceHash) return null;
  const ipHash = target.lastIpHash;
  const deviceHash = target.lastDeviceHash;
  const record = {
    id: crypto.randomUUID(),
    ipHash,
    deviceHash,
    reason,
    moderator: moderator.username,
    until: Number(until || 0),
    permanent: !until,
    createdAt: new Date().toISOString()
  };
  target.ipBanned = true;
  target.ipBanRecords = [...(target.ipBanRecords || []), record].slice(-10);
  return record;
}

function setModerationNotice(user, action, reason, moderator, until = 0) {
  user.moderationNotice = {
    id: crypto.randomUUID(),
    action,
    reason,
    moderator: moderator.username,
    until: Number(until || 0),
    createdAt: new Date().toISOString(),
    acknowledged: false
  };
  user.notifications.unshift({
    id: crypto.randomUUID(),
    type: action === "warning" ? "warning" : "moderation_action",
    from: moderator.username,
    text: `${action.toUpperCase()}: ${reason}`,
    createdAt: new Date().toISOString()
  });
}

function activeModeration(user) {
  const now = Date.now();
  const notice = user.moderationNotice && !user.moderationNotice.acknowledged ? user.moderationNotice : null;
  if (user.banned) {
    if (user.permanentBan) {
      return {
        action: user.ipBanned ? "ipban" : "ban",
        id: notice?.id || "",
        title: user.ipBanned ? "IP Banned" : "Permanently Banned",
        reason: user.banReason || notice?.reason || "Permanently banned by CUBIXIA moderation.",
        moderator: notice?.moderator || "CUBIXIA",
        until: 0,
        permanent: true,
        canAcknowledge: false,
        remainingMs: 0
      };
    }
    const until = Number(user.banUntil || notice?.until || 0);
    return {
      action: user.ipBanned ? "ipban" : "ban",
      id: notice?.id || "",
      title: until && until > now ? (user.ipBanned ? "IP Banned" : "Banned") : "Ban Finished",
      reason: user.banReason || notice?.reason || (user.ipBanned ? "This device/IP is banned from CUBIXIA." : "Banned by CUBIXIA moderation."),
      moderator: notice?.moderator || "CUBIXIA",
      until,
      canAcknowledge: !until || now >= until,
      remainingMs: Math.max(0, until - now)
    };
  }
  if (isTimedOut(user)) {
    return {
      action: "timeout",
      id: notice?.id || "",
      title: "Timed Out",
      reason: user.timeoutReason || notice?.reason || "Timed out by CUBIXIA moderation.",
      moderator: notice?.moderator || "CUBIXIA",
      until: Number(user.timeoutUntil || 0),
      canAcknowledge: false,
      remainingMs: Math.max(0, Number(user.timeoutUntil || 0) - now)
    };
  }
  if (notice) {
    const until = Number(notice.until || 0);
    return {
      action: notice.action,
      id: notice.id,
      title: notice.action === "warning" ? "Warning" : notice.action === "kick" ? "Kicked From Game" : notice.action.toUpperCase(),
      reason: notice.reason,
      moderator: notice.moderator,
      until,
      canAcknowledge: !until || now >= until,
      remainingMs: Math.max(0, until - now)
    };
  }
  return null;
}

function gameTitle(gameId) {
  return GAMES.find((game) => game.id === gameId)?.title || "CUBIXIA Game";
}

function groupRank(user, group) {
  if (!user) return "";
  if (hasOwnerAccess(user) && group.owner === "Tanklyplayz") return isOwnerName(user.username) ? "Owner" : "Co-Founder";
  if (user.role === "admin") return "Admin";
  if (user.role === "mod") return "Moderator";
  return (user.groups || []).includes(group.id) ? "Member" : "";
}

function publicGroup(group, users, user = null) {
  const memberUsers = users.filter((entry) => (entry.groups || []).includes(group.id) || (hasOwnerAccess(entry) && group.owner === "Tanklyplayz"));
  return {
    ...group,
    members: memberUsers.length,
    memberProfiles: memberUsers.map((entry) => ({ ...compactUser(entry), rank: groupRank(entry, group) })),
    joined: Boolean(user && ((user.groups || []).includes(group.id) || (hasOwnerAccess(user) && group.owner === "Tanklyplayz"))),
    rank: user ? groupRank(user, group) : "",
    canEdit: Boolean(user && hasOwnerAccess(user) && group.owner === "Tanklyplayz")
  };
}

function compactUser(user) {
  user = normalizeUser(user || {});
  const inventory = user.inventory || [];
  const equipped = user.equipped || [];
  const itemNames = inventory.map((id) => AVATAR_ITEMS.find((item) => item.id === id)?.name || id);
  const avatarWorth = equipped.reduce((total, id) => total + Number(AVATAR_ITEMS.find((item) => item.id === id)?.price || 0), 0);
  return {
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    bio: user.bio,
    createdAt: user.createdAt,
    lastOnline: user.lastOnline,
    online: Boolean(user.online),
    currentGame: user.currentGame || "",
    badges: user.badges || [],
    avatarStyle: user.avatarStyle,
    equipped,
    inventory,
    inventoryNames: itemNames,
    avatarWorth,
    lastPlayed: user.lastPlayed || null,
    cubbux: Number(user.cubbux || 0),
    role: user.role || "user",
    timeoutUntil: Number(user.timeoutUntil || 0),
    timeoutReason: user.timeoutReason || "",
    banned: Boolean(user.banned),
    permanentBan: Boolean(user.permanentBan),
    ipBanned: Boolean(user.ipBanned),
    banUntil: Number(user.banUntil || 0),
    moderationNotice: user.moderationNotice || null,
    isOwner: hasOwnerAccess(user),
    isFounderOwner: isOwnerName(user.username)
  };
}

function publicUser(user, users = []) {
  const friendProfiles = (user.friends || []).map((friendName) => {
    const found = users.find((entry) => entry.username.toLowerCase() === String(friendName).toLowerCase());
    if (found) return compactUser(found);
    return {
      id: friendName,
      username: friendName,
      avatar: "",
      avatarStyle: normalizeAvatarStyle(),
      equipped: [],
      inventory: [],
      bio: "",
      createdAt: "",
      lastOnline: new Date(Date.now() - 1000 * 60 * 23).toISOString(),
      online: Math.random() > 0.4,
      currentGame: Math.random() > 0.55 ? "Cubixia: Survival" : "",
      badges: []
    };
  });

  return {
    ...compactUser(user),
    email: user.email,
    friends: user.friends || [],
    friendProfiles,
    incomingRequests: user.incomingRequests || [],
    outgoingRequests: user.outgoingRequests || [],
    notifications: user.notifications || [],
    following: user.following || [],
    gameInteractions: user.gameInteractions || {},
    progression: user.progression || { level: 1, xp: 0, streak: 0, title: "Explorer" },
    backpack: user.backpack || [],
    party: user.party || null,
    status: user.status || "",
    achievements: user.achievements || [],
    lastPlayed: user.lastPlayed,
    avatarStyle: user.avatarStyle,
    inventory: user.inventory || [],
    equipped: user.equipped || [],
    items: publicItems(),
    cubbux: user.cubbux,
    transactions: user.transactions || [],
    gameSettings: user.gameSettings,
    settings: user.settings,
    twoStepEnabled: user.twoStep?.enabled !== false,
    groups: user.groups || [],
    role: user.role || "user",
    moderationNotice: user.moderationNotice || null,
    banned: Boolean(user.banned),
    permanentBan: Boolean(user.permanentBan),
    ipBanned: Boolean(user.ipBanned),
    banUntil: Number(user.banUntil || 0),
    timeoutUntil: Number(user.timeoutUntil || 0),
    games: GAMES.map(publicGame),
    isOwner: hasOwnerAccess(user),
    isFounderOwner: isOwnerName(user.username)
  };
}

function requireSession(req, res) {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not logged in." });
    return null;
  }
  return req.session.userId;
}

function requireSessionUser(users, userId, res) {
  const user = users.find((entry) => entry.id === userId);
  if (!user) {
    res.status(401).json({ error: "Session expired because this account is not saved anymore. Please register or log in again." });
    return null;
  }
  return user;
}

async function createBootstrapOwner(users, username, password) {
  const ownerExists = users.some((entry) => isOwnerName(entry.username));
  if (ownerExists || !isOwnerName(username) || String(password || "").length < 6) return null;
  const user = normalizeUser({
    id: crypto.randomUUID(),
    username: "Tanklyplayz",
    email: OWNER_EMAIL,
    passwordHash: await bcrypt.hash(String(password), 10),
    birthMonth: "Jan",
    birthDay: "1",
    birthYear: "2000",
    createdAt: new Date().toISOString(),
    online: true,
    bio: "Creator of CUBIXIA.",
    role: "owner",
    groups: ["cubixia-studios"],
    notifications: [
      {
        id: crypto.randomUUID(),
        type: "account_restore",
        from: "CUBIXIA",
        text: "The owner account was restored because the user store was empty.",
        createdAt: new Date().toISOString()
      }
    ]
  });
  users.push(user);
  await writeUsers(users);
  return user;
}

function gmailUserEnv() {
  return String(process.env.GMAIL_USER || process.env.CUBIXIA_GMAIL_USER || process.env.SMTP_USER || "gglitch145@gmail.com").trim();
}

function gmailPasswordEnv() {
  return String(
    process.env.GMAIL_APP_PASSWORD ||
    process.env.CUBIXIA_GMAIL_APP_PASSWORD ||
    process.env.GMAIL_PASSWORD ||
    process.env.SMTP_PASS ||
    ""
  ).replace(/\s+/g, "");
}

function gmailStatus() {
  const user = gmailUserEnv();
  const password = gmailPasswordEnv();
  return {
    ready: Boolean(user && password),
    userSet: Boolean(user),
    passwordSet: Boolean(password),
    sender: user ? maskEmailAddress(user) : ""
  };
}

function publicMailError(error) {
  const message = String(error?.response || error?.message || "Gmail rejected the email request.");
  if (/Invalid login|Username and Password not accepted|535|EAUTH/i.test(message)) {
    return "Gmail rejected the sender login. Make sure GMAIL_USER is the same Google account that created the App Password, then redeploy.";
  }
  if (/less secure|application-specific password|app password/i.test(message)) {
    return "Gmail requires a valid Google App Password for this sender account.";
  }
  if (/quota|rate|limit/i.test(message)) {
    return "Gmail is rate limiting CUBIXIA right now. Wait a few minutes, then resend the code.";
  }
  if (/recipient|address/i.test(message)) {
    return "Gmail could not send to that account email address. Check the account email spelling.";
  }
  return `Gmail send failed: ${message.slice(0, 180)}`;
}

function createGmailTransporter() {
  const user = gmailUserEnv();
  const password = gmailPasswordEnv();
  if (!user || !password) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass: password
    }
  });
}

async function sendRecoveryEmail(user, code) {
  const transporter = createGmailTransporter();
  if (!transporter) return false;
  await transporter.sendMail({
    from: `"CUBIXIA Recovery" <${gmailUserEnv()}>`,
    to: user.email,
    subject: "Your CUBIXIA recovery code",
    text: `Your CUBIXIA password recovery code is ${code}. It expires in 15 minutes.`
  });
  return true;
}

async function verifyGmailTransporter() {
  const status = gmailStatus();
  if (!status.ready) {
    return {
      ...status,
      smtpVerified: false,
      error: `GMAIL_USER ${status.userSet ? "loaded" : "missing"}, GMAIL_APP_PASSWORD ${status.passwordSet ? "loaded" : "missing"}`
    };
  }
  try {
    await createGmailTransporter().verify();
    return { ...status, smtpVerified: true, error: "" };
  } catch (error) {
    return { ...status, smtpVerified: false, error: publicMailError(error) };
  }
}

function generateSecurityCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskEmailAddress(email) {
  return String(email || "").replace(/^(.).+(@.+)$/, "$1******$2");
}

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/"
  };
}

function parseCookies(req) {
  return String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const index = part.indexOf("=");
      if (index === -1) return cookies;
      cookies[decodeURIComponent(part.slice(0, index))] = decodeURIComponent(part.slice(index + 1));
      return cookies;
    }, {});
}

function hashDeviceToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function requestIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const raw = forwarded || req.ip || req.socket?.remoteAddress || "";
  return String(raw).replace(/^::ffff:/, "").slice(0, 80);
}

function requestUserAgent(req) {
  return String(req.headers["user-agent"] || "").slice(0, 180);
}

function requestIpHash(req) {
  return hashDeviceToken(`ip:${requestIp(req)}`);
}

function requestDeviceHash(req) {
  return hashDeviceToken(`device:${requestIp(req)}|${requestUserAgent(req)}`);
}

function stampRequestDevice(user, req) {
  user.lastIpHash = requestIpHash(req);
  user.lastDeviceHash = requestDeviceHash(req);
  user.lastUserAgent = requestUserAgent(req);
}

function isRememberDeviceRequested(value) {
  return value === true || value === "true" || value === "on" || value === "1";
}

function hasValidRememberedDevice(req, user) {
  const cookie = parseCookies(req)[TWO_STEP_DEVICE_COOKIE];
  const [userId, token] = String(cookie || "").split(".");
  if (!cookie || userId !== user.id || !token) return false;
  const tokenHash = hashDeviceToken(token);
  const devices = activeRememberedDevices(user);
  const matched = devices.find((device) => device.tokenHash === tokenHash);
  user.twoStep.rememberedDevices = devices;
  if (!matched) return false;
  matched.lastUsedAt = new Date().toISOString();
  return true;
}

function rememberTwoStepDevice(req, res, user) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const device = {
    id: crypto.randomUUID(),
    tokenHash: hashDeviceToken(token),
    createdAt: new Date(now).toISOString(),
    lastUsedAt: new Date(now).toISOString(),
    expiresAt: now + TWO_STEP_REMEMBER_MS,
    userAgent: String(req.headers["user-agent"] || "").slice(0, 180)
  };
  user.twoStep.rememberedDevices = [...activeRememberedDevices(user), device].slice(-10);
  res.cookie(TWO_STEP_DEVICE_COOKIE, `${user.id}.${token}`, {
    ...cookieOptions(TWO_STEP_REMEMBER_MS),
    expires: new Date(now + TWO_STEP_REMEMBER_MS)
  });
}

async function sendTwoStepEmail(user, code) {
  const transporter = createGmailTransporter();
  if (!transporter) return false;
  await transporter.sendMail({
    from: `"CUBIXIA Security" <${gmailUserEnv()}>`,
    to: user.email,
    subject: "Your CUBIXIA 2-step verification code",
    text: `Your CUBIXIA login security code is ${code}. It expires in 10 minutes. If you did not try to log in, change your password immediately.`
  });
  return true;
}

async function prepareTwoStepChallenge(req, users, user, options = {}) {
  const now = Date.now();
  const existing = user.twoStep || {};
  const canReuse = !options.forceNew
    && existing.codeHash
    && Number(existing.codeExpires || 0) > now
    && Number(existing.lastSentAt || 0) > now - 10 * 60 * 1000
    && existing.lastEmailSent === true;
  if (canReuse) {
    req.session.pendingTwoStepUserId = user.id;
    req.session.pendingTwoStepCreatedAt = Number(existing.requestedAt || now);
    delete req.session.userId;
    return {
      twoStepRequired: true,
      maskedEmail: maskEmailAddress(user.email),
      expiresAt: existing.codeExpires,
      emailSent: true,
      reused: true,
      message: `A 2-step verification code was already sent to ${maskEmailAddress(user.email)}. Use that same code.`
    };
  }
  if (!options.forceNew && twoStepChallengeLocks.has(user.id)) {
    const locked = await twoStepChallengeLocks.get(user.id);
    req.session.pendingTwoStepUserId = user.id;
    req.session.pendingTwoStepCreatedAt = Number(locked.requestedAt || Date.now());
    delete req.session.userId;
    const { requestedAt, ...publicChallenge } = locked;
    return {
      ...publicChallenge,
      reused: true,
      message: publicChallenge.emailSent
        ? `A 2-step verification code was already sent to ${maskEmailAddress(user.email)}. Use that same code.`
        : "CUBIXIA could not send the 2-step email yet. Check the Gmail environment variables on Render, then press Resend Code."
    };
  }
  const challengePromise = (async () => {
    const requestedAt = Date.now();
    const code = generateSecurityCode();
    user.twoStep = {
      ...(user.twoStep || {}),
      enabled: true,
      codeHash: await bcrypt.hash(code, 10),
      codeExpires: requestedAt + 10 * 60 * 1000,
      attempts: 0,
      requestedAt,
      lastSentAt: requestedAt,
      lastEmailSent: false
    };
    await writeUsers(users);
    let emailError = "";
    const emailSent = await sendTwoStepEmail(user, code).catch((error) => {
      emailError = publicMailError(error);
      console.error("CUBIXIA 2-step email failed:", emailError);
      return false;
    });
    user.twoStep.lastEmailSent = Boolean(emailSent);
    user.twoStep.lastEmailErrorAt = emailSent ? 0 : Date.now();
    user.twoStep.lastEmailError = emailSent ? "" : emailError;
    await writeUsers(users);
    return {
      requestedAt,
      twoStepRequired: true,
      maskedEmail: maskEmailAddress(user.email),
      expiresAt: user.twoStep.codeExpires,
      emailSent,
      message: emailSent
        ? `A 2-step verification code was sent to ${maskEmailAddress(user.email)}.`
        : `CUBIXIA could not send the 2-step email. ${emailError || `Render Gmail status: GMAIL_USER ${gmailStatus().userSet ? "loaded" : "missing"}, GMAIL_APP_PASSWORD ${gmailStatus().passwordSet ? "loaded" : "missing"}.`}`
    };
  })();
  if (!options.forceNew) twoStepChallengeLocks.set(user.id, challengePromise);
  const result = await challengePromise.finally(() => {
    if (twoStepChallengeLocks.get(user.id) === challengePromise) twoStepChallengeLocks.delete(user.id);
  });
  req.session.pendingTwoStepUserId = user.id;
  req.session.pendingTwoStepCreatedAt = Number(result.requestedAt || Date.now());
  delete req.session.userId;
  const { requestedAt, ...publicChallenge } = result;
  return publicChallenge;
}

app.post("/api/register", async (req, res) => {
  const { username, email, password, birthMonth, birthDay, birthYear, avatar } = req.body;
  const cleanName = String(username || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!validateUsername(cleanName)) {
    return res.status(400).json({ error: "Username must be 3-18 letters, numbers, or underscores." });
  }
  if (!cleanEmail.includes("@")) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  if (!birthMonth || !birthDay || !birthYear) {
    return res.status(400).json({ error: "Please choose your birthday." });
  }

  const users = await readUsers();
  const ipBan = activeIpBanForRequest(req, users);
  if (ipBan) return res.status(423).json({ error: ipBan.moderation.title, moderation: ipBan.moderation });
  if (users.some((user) => user.username.toLowerCase() === cleanName.toLowerCase())) {
    return res.status(409).json({ error: "That username is already registered." });
  }
  if (users.some((user) => user.email === cleanEmail)) {
    return res.status(409).json({ error: "That email is already registered." });
  }

  const user = normalizeUser({
    id: crypto.randomUUID(),
    username: cleanName,
    email: cleanEmail,
    passwordHash: await bcrypt.hash(String(password), 10),
    birthMonth,
    birthDay,
    birthYear,
    avatar: String(avatar || "").slice(0, 900000),
    createdAt: new Date().toISOString(),
    online: true
  });
  stampRequestDevice(user, req);

  users.push(user);
  await writeUsers(users);
  req.session.userId = user.id;
  res.status(201).json({ user: publicUser(user, users) });
});

app.post("/api/login", async (req, res) => {
  const cleanName = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const users = await readUsers();
  const ipBan = activeIpBanForRequest(req, users);
  if (ipBan) return res.status(423).json({ error: ipBan.moderation.title, moderation: ipBan.moderation });
  const identity = cleanName.toLowerCase();
  let user = users.find((entry) => entry.username.toLowerCase() === identity || String(entry.email || "").toLowerCase() === identity);

  if (!user) {
    user = await createBootstrapOwner(users, cleanName, password);
  }
  if (!user) {
    return res.status(users.length ? 401 : 404).json({
      error: users.length ? "Incorrect username or password." : "No accounts are saved yet. Register a new account, or log in as Tanklyplayz to restore the owner account."
    });
  }

  const passwordOk = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!passwordOk) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }
  if (user.twoStep?.enabled !== false) {
    if (hasValidRememberedDevice(req, user)) {
      user.online = true;
      user.lastOnline = new Date().toISOString();
      stampRequestDevice(user, req);
      await writeUsers(users);
      req.session.userId = user.id;
      return res.json({ user: publicUser(user, users), moderation: activeModeration(user), twoStepRemembered: true });
    }
    return res.json(await prepareTwoStepChallenge(req, users, user));
  }
  user.online = true;
  user.lastOnline = new Date().toISOString();
  stampRequestDevice(user, req);
  await writeUsers(users);
  req.session.userId = user.id;
  res.json({ user: publicUser(user, users), moderation: activeModeration(user) });
});

app.post("/api/login/verify-2fa", async (req, res) => {
  const pendingUserId = req.session.pendingTwoStepUserId;
  if (!pendingUserId) {
    return res.status(401).json({ error: "No 2-step verification is waiting. Start login again." });
  }

  const users = await readUsers();
  const user = requireSessionUser(users, pendingUserId, res);
  if (!user) return;
  const challenge = user.twoStep || {};
  if (!challenge.codeHash || Date.now() > Number(challenge.codeExpires || 0)) {
    return res.status(400).json({ error: "That 2-step code expired. Request a new code." });
  }
  if (Number(challenge.attempts || 0) >= 5) {
    return res.status(429).json({ error: "Too many incorrect 2-step attempts. Resend a new code." });
  }

  const code = String(req.body.code || "").replace(/\s+/g, "").trim();
  const codeOk = code && (await bcrypt.compare(code, challenge.codeHash));
  if (!codeOk) {
    user.twoStep.attempts = Number(user.twoStep.attempts || 0) + 1;
    await writeUsers(users);
    return res.status(401).json({ error: "That 2-step code is incorrect." });
  }

  user.twoStep.codeHash = "";
  user.twoStep.codeExpires = 0;
  user.twoStep.attempts = 0;
  user.twoStep.verifiedAt = Date.now();
  if (isRememberDeviceRequested(req.body.rememberDevice)) {
    rememberTwoStepDevice(req, res, user);
  }
  user.online = true;
  user.lastOnline = new Date().toISOString();
  stampRequestDevice(user, req);
  await writeUsers(users);
  req.session.userId = user.id;
  delete req.session.pendingTwoStepUserId;
  delete req.session.pendingTwoStepCreatedAt;
  res.json({ user: publicUser(user, users), moderation: activeModeration(user) });
});

app.post("/api/login/resend-2fa", async (req, res) => {
  const pendingUserId = req.session.pendingTwoStepUserId;
  if (!pendingUserId) {
    return res.status(401).json({ error: "No 2-step verification is waiting. Start login again." });
  }

  const users = await readUsers();
  const user = requireSessionUser(users, pendingUserId, res);
  if (!user) return;
  if (Date.now() - Number(user.twoStep?.lastSentAt || 0) < 60 * 1000) {
    return res.status(429).json({ error: "Please wait 60 seconds before sending another code." });
  }
  res.json(await prepareTwoStepChallenge(req, users, user, { forceNew: true }));
});

app.post("/api/recover/start", async (req, res) => {
  const identity = String(req.body.identity || "").trim().toLowerCase();
  const users = await readUsers();
  const user = users.find((entry) => entry.email.toLowerCase() === identity || entry.username.toLowerCase() === identity);

  if (!user) {
    return res.status(404).json({ error: "No CUBIXIA account was found for that Gmail, email, or username." });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  user.passwordResetCode = code;
  user.passwordResetExpires = Date.now() + 1000 * 60 * 15;
  await writeUsers(users);
  const emailSent = await sendRecoveryEmail(user, code).catch(() => false);

  res.json({
    ok: true,
    emailSent,
    message: emailSent
      ? `A recovery code was sent to ${user.email}.`
      : "CUBIXIA could not send the recovery email. Add GMAIL_USER and GMAIL_APP_PASSWORD to the server environment, then restart the server."
  });
});

app.post("/api/recover/finish", async (req, res) => {
  const identity = String(req.body.identity || "").trim().toLowerCase();
  const code = String(req.body.code || "").trim();
  const newPassword = String(req.body.newPassword || "");
  const users = await readUsers();
  const user = users.find((entry) => entry.email.toLowerCase() === identity || entry.username.toLowerCase() === identity);

  if (!user) return res.status(404).json({ error: "No CUBIXIA account was found." });
  if (!code || code !== user.passwordResetCode || Date.now() > Number(user.passwordResetExpires || 0)) {
    return res.status(400).json({ error: "Recovery code is incorrect or expired." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordResetCode = "";
  user.passwordResetExpires = 0;
  user.online = true;
  user.lastOnline = new Date().toISOString();
  await writeUsers(users);
  req.session.userId = user.id;
  res.json({ user: publicUser(user, users) });
});

app.post("/api/logout", async (req, res) => {
  if (req.session.userId) {
    const users = await readUsers();
    const user = users.find((entry) => entry.id === req.session.userId);
    if (user) {
      user.online = false;
      user.currentGame = "";
      user.lastOnline = new Date().toISOString();
      await writeUsers(users);
    }
  }

  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

app.get("/api/me", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const ipBan = activeIpBanForRequest(req, users);
  if (ipBan) return res.status(423).json({ error: ipBan.moderation.title, moderation: ipBan.moderation });
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  user.online = true;
  user.lastOnline = new Date().toISOString();
  stampRequestDevice(user, req);
  await writeUsers(users);
  const lockdown = await activeLockdownState();
  res.json({
    user: publicUser(user, users),
    moderation: activeModeration(user),
    lockdown: publicLockdownForUser(lockdown, user),
    staffLockdown: canModerate(user) ? publicLockdown(lockdown) : null
  });
});

app.get("/api/lockdown", async (req, res) => {
  const lockdown = await activeLockdownState();
  const userId = req.session?.userId;
  if (!userId) return res.json({ lockdown: publicLockdown(lockdown) });
  const users = await readUsers();
  const user = users.find((entry) => entry.id === userId);
  res.json({
    lockdown: publicLockdownForUser(lockdown, user),
    staffLockdown: canModerate(user) ? publicLockdown(lockdown) : null
  });
});

app.post("/api/admin/lockdown", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;
  const users = await readUsers();
  const owner = requireSessionUser(users, userId, res);
  if (!owner) return;
  if (!hasOwnerAccess(owner)) return res.status(403).json({ error: "Only owner-level accounts can control lockdown." });
  const active = req.body.active !== false && req.body.active !== "false";
  const state = await readContentState();
  if (active) {
    const reason = String(req.body.reason || "").trim().slice(0, 500);
    const staffMessage = String(req.body.staffMessage || "").trim().slice(0, 700);
    if (!reason) return res.status(400).json({ error: "Lockdown reason is required." });
    state.lockdown = {
      active: true,
      reason,
      staffMessage,
      lockedBy: owner.username,
      startedAt: Date.now(),
      audioUntil: Date.now() + 5 * 60 * 1000
    };
    users.forEach((entry) => {
      entry.notifications = entry.notifications || [];
      if (canModerate(entry)) {
        entry.notifications.unshift({
          id: crypto.randomUUID(),
          type: "staff_lockdown",
          from: owner.username,
          text: `Owner lockdown instructions: ${staffMessage || reason}`,
          createdAt: new Date().toISOString()
        });
        return;
      }
      entry.currentGame = "";
      entry.worldState = null;
      entry.notifications.unshift({
        id: crypto.randomUUID(),
        type: "lockdown",
        text: `CUBIXIA entered owner lockdown: ${reason}`,
        createdAt: new Date().toISOString()
      });
    });
    await writeUsers(users);
  } else {
    state.lockdown = {
      active: false,
      reason: "",
      staffMessage: "",
      lockedBy: owner.username,
      startedAt: 0,
      audioUntil: 0
    };
  }
  await writeContentState(state);
  res.json({ user: publicUser(owner, users), lockdown: publicLockdownForUser(state.lockdown, owner), staffLockdown: publicLockdown(state.lockdown) });
});

app.post("/api/notifications/clear", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const ipBan = activeIpBanForRequest(req, users);
  if (ipBan) return res.status(423).json({ error: ipBan.moderation.title, moderation: ipBan.moderation });
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  user.notifications = (user.notifications || []).filter((note) => note.type === "friend_request");
  await writeUsers(users);
  res.json({ user: publicUser(user, users), cleared: true });
});

app.get("/api/games", async (_req, res) => {
  await readContentState();
  const studioGames = await readStudioGames();
  const creatorGames = studioGames.filter((game) => game.published).map(publicStudioGame);
  res.json({ games: [...GAMES.map(publicGame), ...creatorGames], creatorGames });
});

app.post("/api/games/:gameId/reaction", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const ipBan = activeIpBanForRequest(req, users);
  if (ipBan) return res.status(423).json({ error: ipBan.moderation.title, moderation: ipBan.moderation });
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  const moderation = activeModeration(user);
  if (moderation) return res.status(423).json({ error: moderation.title, moderation, user: publicUser(user, users) });

  const gameId = String(req.params.gameId || "").trim();
  const action = String(req.body.action || "").toLowerCase();
  if (!["favorite", "notify", "like", "dislike"].includes(action)) {
    return res.status(400).json({ error: "Choose Favorite, Notify, Like, or Dislike." });
  }

  await readContentState();
  if (isContentDeleted("games", gameId)) {
    return res.status(410).json({ error: "This game was deleted by CUBIXIA moderation and cannot be rated or played." });
  }
  const studioGames = await readStudioGames();
  const game = [...GAMES, ...studioGames.filter((entry) => entry.published)].find((entry) => entry.id === gameId);
  if (!game) return res.status(404).json({ error: "Game was not found." });

  const state = await readContentState();
  state.gameStats = state.gameStats || {};
  const stats = {
    likes: 0,
    dislikes: 0,
    favorites: 0,
    notifies: 0,
    ...(state.gameStats[gameId] || {})
  };
  user.gameInteractions = user.gameInteractions && typeof user.gameInteractions === "object" ? user.gameInteractions : {};
  const current = {
    favorite: false,
    notify: false,
    vote: "",
    ...(user.gameInteractions[gameId] || {})
  };

  if (action === "favorite") {
    current.favorite = !current.favorite;
    stats.favorites = Math.max(0, Number(stats.favorites || 0) + (current.favorite ? 1 : -1));
  } else if (action === "notify") {
    current.notify = !current.notify;
    stats.notifies = Math.max(0, Number(stats.notifies || 0) + (current.notify ? 1 : -1));
    if (current.notify) {
      user.notifications.unshift({
        id: crypto.randomUUID(),
        type: "game_notify",
        from: "CUBIXIA",
        text: `Notifications turned on for ${game.title}.`,
        createdAt: new Date().toISOString()
      });
    }
  } else {
    const nextVote = action;
    const previousVote = current.vote;
    if (previousVote === nextVote) {
      current.vote = "";
      stats[`${nextVote}s`] = Math.max(0, Number(stats[`${nextVote}s`] || 0) - 1);
    } else {
      if (previousVote === "like" || previousVote === "dislike") {
        stats[`${previousVote}s`] = Math.max(0, Number(stats[`${previousVote}s`] || 0) - 1);
      }
      current.vote = nextVote;
      stats[`${nextVote}s`] = Math.max(0, Number(stats[`${nextVote}s`] || 0) + 1);
    }
  }

  state.gameStats[gameId] = stats;
  user.gameInteractions[gameId] = current;
  user.lastOnline = new Date().toISOString();
  stampRequestDevice(user, req);
  await writeContentState(state);
  await writeUsers(users);
  res.json({ user: publicUser(user, users), game: publicGame(game) });
});

app.get("/api/studio/projects", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const ipBan = activeIpBanForRequest(req, users);
  if (ipBan) return res.status(423).json({ error: ipBan.moderation.title, moderation: ipBan.moderation });
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  const studioGames = await readStudioGames();
  const projects = studioGames.filter((game) => game.ownerId === user.id).map(publicStudioGame);
  res.json({ projects, published: studioGames.filter((game) => game.published).map(publicStudioGame), user: publicUser(user, users) });
});

app.post("/api/studio/save", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  const studioGames = await readStudioGames();
  const requestedId = String(req.body.id || "");
  let project = studioGames.find((game) => game.id === requestedId && game.ownerId === user.id);
  if (!project) {
    project = normalizeStudioGame({
      id: `studio-${slugify(req.body.title)}-${crypto.randomUUID().slice(0, 8)}`,
      ownerId: user.id,
      owner: user.username,
      createdAt: new Date().toISOString()
    });
    studioGames.push(project);
  }
  project.title = String(req.body.title || project.title || "Untitled CUBIXIA Game").trim().slice(0, 60) || "Untitled CUBIXIA Game";
  project.genre = String(req.body.genre || project.genre || "Creator").trim().slice(0, 32) || "Creator";
  project.description = String(req.body.description || project.description || "A player-created CUBIXIA experience.").trim().slice(0, 600) || "A player-created CUBIXIA experience.";
  project.ownerId = user.id;
  project.owner = user.username;
  project.updatedAt = new Date().toISOString();
  project.studioWorld = normalizeStudioWorld(req.body.studioWorld || {});
  await writeStudioGames(studioGames);
  res.json({ project: publicStudioGame(project), projects: studioGames.filter((game) => game.ownerId === user.id).map(publicStudioGame), user: publicUser(user, users) });
});

app.post("/api/studio/publish", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  const studioGames = await readStudioGames();
  const project = studioGames.find((game) => game.id === String(req.body.id || "") && game.ownerId === user.id);
  if (!project) return res.status(404).json({ error: "Studio project was not found." });
  project.published = true;
  project.publishedAt = new Date().toISOString();
  project.updatedAt = project.publishedAt;
  project.rating = project.rating || "New";
  user.notifications.unshift({
    id: crypto.randomUUID(),
    type: "studio_publish",
    from: "Cubixia Studio",
    text: `${project.title} was published to the Games page.`,
    createdAt: new Date().toISOString()
  });
  await writeStudioGames(studioGames);
  await writeUsers(users);
  res.json({
    project: publicStudioGame(project),
    creatorGames: studioGames.filter((game) => game.published).map(publicStudioGame),
    user: publicUser(user, users)
  });
});

app.get("/api/groups", async (req, res) => {
  const users = await readUsers();
  const groups = await readGroups();
  const user = req.session.userId ? users.find((entry) => entry.id === req.session.userId) : null;
  res.json({ groups: groups.map((group) => publicGroup(group, users, user)), user: user ? publicUser(user, users) : null });
});

app.post("/api/groups/join", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const groupId = String(req.body.groupId || "");
  const groups = await readGroups();
  const group = groups.find((entry) => entry.id === groupId);
  if (!group) return res.status(404).json({ error: "Group was not found." });
  const users = await readUsers();
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  if (!user.groups.includes(groupId) && !(hasOwnerAccess(user) && group.owner === "Tanklyplayz")) {
    user.groups.push(groupId);
    user.notifications.unshift({
      id: crypto.randomUUID(),
      type: "group_join",
      from: group.name,
      text: `You joined ${group.name}.`,
      createdAt: new Date().toISOString()
    });
  }
  await writeUsers(users);
  res.json({ user: publicUser(user, users), group: publicGroup(group, users, user) });
});

app.post("/api/groups/update", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  const groups = await readGroups();
  const group = groups.find((entry) => entry.id === String(req.body.groupId || ""));
  if (!group) return res.status(404).json({ error: "Group was not found." });
  if (!(hasOwnerAccess(user) && group.owner === "Tanklyplayz")) {
    return res.status(403).json({ error: "Only the group owner can edit this community." });
  }

  group.name = String(req.body.name || group.name).trim().slice(0, 40) || group.name;
  group.description = String(req.body.description || group.description).trim().slice(0, 240) || group.description;
  group.logo = String(req.body.logo || group.logo).trim().slice(0, 4).toUpperCase() || group.logo;
  const announcementTitle = String(req.body.announcementTitle || "").trim().slice(0, 80);
  const announcementBody = String(req.body.announcementBody || "").trim().slice(0, 500);
  if (announcementTitle && announcementBody) {
    group.announcements = group.announcements || [];
    group.announcements.unshift({
      id: crypto.randomUUID(),
      title: announcementTitle,
      body: announcementBody,
      createdAt: new Date().toISOString()
    });
  }
  await writeGroups(groups);
  res.json({ user: publicUser(user, users), group: publicGroup(group, users, user), groups: groups.map((entry) => publicGroup(entry, users, user)) });
});

app.get("/api/network-info", (req, res) => {
  const port = process.env.PORT || PORT;
  const addresses = [];
  Object.values(os.networkInterfaces()).flat().forEach((network) => {
    if (network && network.family === "IPv4" && !network.internal) {
      addresses.push(`http://${network.address}:${port}`);
    }
  });
  res.json({
    local: `http://127.0.0.1:${port}`,
    lan: addresses,
    host: req.headers.host
  });
});

app.get("/health", (_req, res) => {
  const gmail = gmailStatus();
  res.json({
    ok: true,
    app: "CUBIXIA",
    version: process.env.CUBIXIA_DESKTOP_VERSION || "1.1.0",
    mode: process.env.CUBIXIA_DESKTOP ? "desktop-local-server" : "shared-server",
    gmailReady: gmail.ready,
    gmailUserSet: gmail.userSet,
    gmailPasswordSet: gmail.passwordSet,
    gmailSender: gmail.sender,
    time: new Date().toISOString()
  });
});

app.get("/health/email", async (_req, res) => {
  const gmail = await verifyGmailTransporter();
  res.json({
    ok: true,
    app: "CUBIXIA",
    version: process.env.CUBIXIA_DESKTOP_VERSION || "1.1.0",
    gmailReady: gmail.ready,
    gmailUserSet: gmail.userSet,
    gmailPasswordSet: gmail.passwordSet,
    gmailSender: gmail.sender,
    gmailSmtpVerified: gmail.smtpVerified,
    error: gmail.error,
    time: new Date().toISOString()
  });
});

app.get("/api/users/search", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const query = String(req.query.username || "").trim().toLowerCase();
  const users = await readUsers();
  const current = requireSessionUser(users, userId, res);
  if (!current) return;
  const target = findUserByUsername(users, query);
  if (!target) return res.json({ found: false });

  let relationship = "none";
  if (target.id === current.id) relationship = "self";
  else if (current.friends.some((name) => name.toLowerCase() === target.username.toLowerCase())) relationship = "friends";
  else if (current.outgoingRequests.includes(target.username)) relationship = "request_sent";
  else if (current.incomingRequests.includes(target.username)) relationship = "request_received";

  res.json({ found: true, user: compactUser(target), relationship });
});

app.post("/api/friend-request", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const username = String(req.body.username || "").trim();
  const users = await readUsers();
  const current = requireSessionUser(users, userId, res);
  if (!current) return;
  const target = findUserByUsername(users, username);

  if (!target) return res.status(404).json({ error: "No user was found." });
  if (target.id === current.id) return res.status(400).json({ error: "You cannot add yourself." });
  if (current.friends.some((name) => name.toLowerCase() === target.username.toLowerCase())) {
    return res.status(409).json({ error: "You are already friends." });
  }

  if (!current.outgoingRequests.includes(target.username)) current.outgoingRequests.push(target.username);
  if (!target.incomingRequests.includes(current.username)) target.incomingRequests.push(current.username);
  target.notifications.unshift({
    id: crypto.randomUUID(),
    type: "friend_request",
    from: current.username,
    text: `${current.username} sent you a friend request.`,
    createdAt: new Date().toISOString()
  });

  await writeUsers(users);
  res.json({ user: publicUser(current, users), target: compactUser(target), relationship: "request_sent" });
});

app.post("/api/friend-request/respond", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const from = String(req.body.from || "").trim();
  const action = req.body.action === "accept" ? "accept" : "decline";
  const users = await readUsers();
  const current = requireSessionUser(users, userId, res);
  if (!current) return;
  const sender = findUserByUsername(users, from);

  current.incomingRequests = current.incomingRequests.filter((name) => name.toLowerCase() !== from.toLowerCase());
  current.notifications = current.notifications.filter((note) => note.from.toLowerCase() !== from.toLowerCase());

  if (sender) {
    sender.outgoingRequests = sender.outgoingRequests.filter((name) => name.toLowerCase() !== current.username.toLowerCase());
    if (action === "accept") {
      if (!current.friends.includes(sender.username)) current.friends.unshift(sender.username);
      if (!sender.friends.includes(current.username)) sender.friends.unshift(current.username);
      sender.notifications.unshift({
        id: crypto.randomUUID(),
        type: "friend_accept",
        from: current.username,
        text: `${current.username} accepted your friend request.`,
        createdAt: new Date().toISOString()
      });
    }
  }

  await writeUsers(users);
  res.json({ user: publicUser(current, users) });
});

app.post("/api/profile", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  await readContentState();
  const users = await readUsers();
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  user.bio = String(req.body.bio || user.bio).slice(0, 160);
  if (typeof req.body.avatar === "string") user.avatar = req.body.avatar.slice(0, 900000);
  if (req.body.avatarStyle && typeof req.body.avatarStyle === "object") {
    const nextStyle = normalizeAvatarStyle(user.avatarStyle, req.body.avatarStyle);
    const styleError = avatarStyleError(nextStyle);
    if (styleError) return res.status(400).json({ error: styleError });
    user.avatarStyle = nextStyle;
  }
  if (Array.isArray(req.body.equipped)) {
    user.equipped = req.body.equipped.filter((itemId) => user.inventory.includes(itemId) && !isContentDeleted("items", itemId));
  }
  await writeUsers(users);
  res.json({ user: publicUser(user, users) });
});

app.get("/api/marketplace", async (req, res) => {
  await readContentState();
  const users = await readUsers();
  const user = req.session.userId ? users.find((entry) => entry.id === req.session.userId) : null;
  res.json({ items: publicItems(), user: user ? publicUser(user, users) : null });
});

app.post("/api/marketplace/buy", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const itemId = String(req.body.itemId || "");
  const item = AVATAR_ITEMS.find((entry) => entry.id === itemId);
  if (!item) return res.status(404).json({ error: "Shop item was not found." });
  await readContentState();
  if (isContentDeleted("items", item.id)) return res.status(410).json({ error: "This clothing/item was deleted and cannot be used." });

  const users = await readUsers();
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  if (item.id === "creator-crown" || item.id === "ban-hammer") {
    if (!hasOwnerAccess(user)) return res.status(403).json({ error: "That item is only for CUBIXIA owner/moderation accounts." });
  }
  if (!user.inventory.includes(item.id)) {
    if (Number(user.cubbux || 0) < item.price) return res.status(402).json({ error: "Not enough Cubbits." });
    user.cubbux = Number(user.cubbux || 0) - item.price;
    user.inventory.push(item.id);
    user.transactions.unshift({
      id: crypto.randomUUID(),
      type: "marketplace_purchase",
      label: item.name,
      amount: -item.price,
      createdAt: new Date().toISOString()
    });
  }
  await writeUsers(users);
  res.json({ user: publicUser(user, users), item: publicItem(item) });
});

app.post("/api/cubbux/checkout", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const packages = {
    starter: { label: "Starter Pack", cubbux: 500, price: "$4.99" },
    builder: { label: "Builder Pack", cubbux: 1000, price: "$9.99" },
    universe: { label: "Universe Pack", cubbux: 5250, price: "$49.99" },
    creator: { label: "Creator Pack", cubbux: 11000, price: "$99.99" }
  };
  const pack = packages[String(req.body.packageId || "starter")];
  if (!pack) return res.status(404).json({ error: "Cubbits package was not found." });
  const card = validateDemoCard(req.body.card || {});
  if (!card.ok) return res.status(402).json({ error: card.error });

  const users = await readUsers();
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  user.cubbux = Number(user.cubbux || 0) + pack.cubbux;
  user.transactions.unshift({
    id: crypto.randomUUID(),
    type: "cubbux_card_purchase",
    label: `${pack.label} paid with card ending ${card.last4}`,
    amount: pack.cubbux,
    createdAt: new Date().toISOString()
  });
  await writeUsers(users);
  res.json({ user: publicUser(user, users), package: pack });
});

app.post("/api/cubbux/buy", (req, res) => {
  res.status(400).json({ error: "Cubbits now requires checkout card details. Use the purchase form." });
});

function validateDemoCard(card) {
  const number = String(card.number || "").replace(/\D/g, "");
  const name = String(card.name || "").trim();
  const expiry = String(card.expiry || "").trim();
  const cvc = String(card.cvc || "").trim();
  const zip = String(card.zip || "").trim();
  if (name.length < 2) return { ok: false, error: "Enter the cardholder name." };
  if (!/^\d{13,19}$/.test(number) || !passesLuhn(number)) return { ok: false, error: "Card number is invalid. Use a test card like 4242 4242 4242 4242." };
  if (number === "4000000000000002") return { ok: false, error: "That test card was declined." };
  if (!/^\d{3,4}$/.test(cvc)) return { ok: false, error: "Security code is invalid." };
  if (!/^\d{5}$/.test(zip)) return { ok: false, error: "Billing ZIP is invalid." };
  const match = expiry.match(/^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/);
  if (!match) return { ok: false, error: "Expiration must look like MM/YY." };
  const month = Number(match[1]);
  const year = Number(match[2].length === 2 ? `20${match[2]}` : match[2]);
  const expiresAt = new Date(year, month, 0, 23, 59, 59).getTime();
  if (month < 1 || month > 12 || expiresAt < Date.now()) return { ok: false, error: "Card is expired." };
  return { ok: true, last4: number.slice(-4) };
}

function passesLuhn(number) {
  let sum = 0;
  let doubleDigit = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = Number(number[i]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

app.post("/api/settings/game", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  user.gameSettings = {
    ...user.gameSettings,
    cameraSensitivity: Math.max(0.25, Math.min(2.5, Number(req.body.cameraSensitivity || user.gameSettings.cameraSensitivity || 1))),
    cameraInverted: Boolean(req.body.cameraInverted),
    smoothZoom: Boolean(req.body.smoothZoom),
    firstPersonZoom: Boolean(req.body.firstPersonZoom),
    cameraFollow: ["free", "follow"].includes(req.body.cameraFollow) ? req.body.cameraFollow : "free"
  };
  await writeUsers(users);
  res.json({ user: publicUser(user, users) });
});

app.post("/api/settings/account", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  user.settings = {
    notifications: {
      friendRequests: Boolean(req.body.notifications?.friendRequests),
      messages: Boolean(req.body.notifications?.messages),
      gameUpdates: Boolean(req.body.notifications?.gameUpdates),
      moderation: Boolean(req.body.notifications?.moderation)
    },
    privacy: {
      profileVisible: Boolean(req.body.privacy?.profileVisible),
      showOnline: Boolean(req.body.privacy?.showOnline),
      allowFriendRequests: Boolean(req.body.privacy?.allowFriendRequests),
      allowJoin: Boolean(req.body.privacy?.allowJoin),
      allowMessages: Boolean(req.body.privacy?.allowMessages)
    },
    browser: {
      reduceMotion: Boolean(req.body.browser?.reduceMotion),
      showPerformance: Boolean(req.body.browser?.showPerformance),
      theme: ["light", "dark", "auto"].includes(req.body.browser?.theme) ? req.body.browser.theme : "auto",
      uiScale: Math.max(0.85, Math.min(1.25, Number(req.body.browser?.uiScale || 1)))
    }
  };
  await writeUsers(users);
  res.json({ user: publicUser(user, users) });
});

app.post("/api/settings/password", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  const users = await readUsers();
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await writeUsers(users);
  res.json({ ok: true });
});

app.post("/api/settings/two-step", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  const enabled = req.body.enabled !== false;
  user.twoStep = {
    ...(user.twoStep || {}),
    enabled,
    codeHash: enabled ? user.twoStep?.codeHash || "" : "",
    codeExpires: enabled ? Number(user.twoStep?.codeExpires || 0) : 0,
    attempts: enabled ? Number(user.twoStep?.attempts || 0) : 0,
    rememberedDevices: enabled ? activeRememberedDevices(user) : []
  };
  if (!enabled) res.clearCookie(TWO_STEP_DEVICE_COOKIE, { path: "/" });
  user.notifications.unshift({
    id: crypto.randomUUID(),
    type: "security",
    from: "CUBIXIA",
    text: `2-Step Verification was turned ${enabled ? "on" : "off"}.`,
    createdAt: new Date().toISOString()
  });
  await writeUsers(users);
  res.json({ user: publicUser(user, users) });
});

function awardPlatformXp(user, amount) {
  user.progression = user.progression || { level: 1, xp: 0, streak: 0, title: "Explorer" };
  const beforeLevel = Math.max(1, Number(user.progression.level || 1));
  user.progression.xp = Math.max(0, Number(user.progression.xp || 0) + Math.max(0, Number(amount || 0)));
  const nextLevel = Math.max(1, Math.floor(user.progression.xp / 100) + 1);
  if (nextLevel > beforeLevel) {
    const gained = (nextLevel - beforeLevel) * 2;
    user.progression.level = nextLevel;
    user.cubbux = Number(user.cubbux || 0) + gained;
    user.achievements = Array.from(new Set([...(user.achievements || []), `Reached Level ${nextLevel}`]));
    user.notifications = user.notifications || [];
    user.notifications.unshift({
      id: crypto.randomUUID(),
      type: "level_up",
      text: `You reached Level ${nextLevel} and earned ${gained} Cubbits.`,
      createdAt: new Date().toISOString()
    });
  } else {
    user.progression.level = nextLevel;
  }
}

app.post("/api/progress", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const ipBan = activeIpBanForRequest(req, users);
  if (ipBan) return res.status(423).json({ error: ipBan.moderation.title, moderation: ipBan.moderation });
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  const lockdown = publicLockdownForUser(await activeLockdownState(), user);
  if (lockdown && req.body.playing) {
    user.currentGame = "";
    user.worldState = null;
    await writeUsers(users);
    return res.status(423).json({ error: "CUBIXIA is under owner lockdown.", lockdown, user: publicUser(user, users) });
  }
  const moderation = activeModeration(user);
  if (moderation) return res.status(423).json({ error: moderation.title, moderation, user: publicUser(user, users) });
  const gameId = String(req.body.gameId || "cubixia-survival");
  if (req.body.playing && await deletedGameResponse(gameId, res)) return;
  const title = await gameTitleFromStore(gameId);
  user.currentGame = req.body.playing ? title : "";
  user.lastPlayed = {
    id: gameId,
    title,
    progress: String(req.body.progress || "Safe-zone lobby"),
    xp: Number(req.body.xp || user.lastPlayed.xp || 0),
    currency: Number(req.body.currency || user.lastPlayed.currency || 0)
  };
  if (req.body.playing !== false) awardPlatformXp(user, 8);
  user.lastOnline = new Date().toISOString();
  stampRequestDevice(user, req);
  await writeUsers(users);
  res.json({ user: publicUser(user, users) });
});

app.post("/api/rewards/daily", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;
  const users = await readUsers();
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  user.progression = user.progression || { level: 1, xp: 0, streak: 0, title: "Explorer" };
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const last = Number(user.progression.lastDailyAt || 0);
  if (last && now - last < day) {
    const waitHours = Math.ceil((day - (now - last)) / (60 * 60 * 1000));
    return res.status(429).json({ error: `Daily Cubbits already claimed. Try again in about ${waitHours} hour${waitHours === 1 ? "" : "s"}.` });
  }
  user.progression.streak = last && now - last < day * 2 ? Number(user.progression.streak || 0) + 1 : 1;
  user.progression.lastDailyAt = now;
  const weeklyBonus = user.progression.streak % 7 === 0 ? 35 : 0;
  const amount = 20 + Math.min(30, Number(user.progression.streak || 1) * 2) + weeklyBonus;
  user.cubbux = Number(user.cubbux || 0) + amount;
  awardPlatformXp(user, 25);
  user.transactions = user.transactions || [];
  user.transactions.unshift({ id: crypto.randomUUID(), type: "daily_reward", amount, createdAt: new Date().toISOString() });
  await writeUsers(users);
  res.json({ user: publicUser(user, users), message: `Claimed ${amount} Cubbits. Login streak: ${user.progression.streak}.` });
});

app.post("/api/economy/crate", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;
  const users = await readUsers();
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  const rewards = [
    { item: "speed-boots", label: "Speed Trial Boots" },
    { item: "wing-pack", label: "Angel Wings" },
    { item: "neon-visor", label: "Neon Visor" },
    { coins: 15, label: "15 Cubbits" },
    { coins: 30, label: "30 Cubbits" }
  ];
  const reward = rewards[Math.floor(Math.random() * rewards.length)];
  if (reward.item) {
    user.inventory = Array.from(new Set([...(user.inventory || []), reward.item]));
  } else {
    user.cubbux = Number(user.cubbux || 0) + reward.coins;
  }
  awardPlatformXp(user, 12);
  user.notifications = user.notifications || [];
  user.notifications.unshift({ id: crypto.randomUUID(), type: "crate", text: `Crate reward: ${reward.label}.`, createdAt: new Date().toISOString() });
  await writeUsers(users);
  res.json({ user: publicUser(user, users), message: `Crate opened: ${reward.label}.` });
});

app.post("/api/party/create", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;
  const users = await readUsers();
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  user.party = {
    id: crypto.randomUUID(),
    leader: user.username,
    members: [user.username],
    createdAt: new Date().toISOString()
  };
  await writeUsers(users);
  res.json({ user: publicUser(user, users), message: `Party created. Invite friends and join games together.` });
});

app.get("/api/world/:gameId", async (req, res) => {
  if (await deletedGameResponse(req.params.gameId, res)) return;
  const users = await readUsers();
  const user = users.find((entry) => entry.id === req.session?.userId);
  const lockdown = publicLockdownForUser(await activeLockdownState(), user);
  if (lockdown) return res.json({ players: [], lockdown });
  res.json({ players: worldPlayers(users, req.params.gameId) });
});

app.post("/api/world/:gameId/state", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const ipBan = activeIpBanForRequest(req, users);
  if (ipBan) return res.json({ players: [], moderation: ipBan.moderation });
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  const lockdown = publicLockdownForUser(await activeLockdownState(), user);
  if (lockdown) {
    user.currentGame = "";
    user.worldState = null;
    await writeUsers(users);
    return res.json({ players: [], lockdown, user: publicUser(user, users) });
  }
  const moderation = activeModeration(user);
  if (moderation) return res.json({ players: [], moderation, user: publicUser(user, users) });
  const gameId = req.params.gameId;
  if (await deletedGameResponse(gameId, res)) return;
  const state = await readContentState();
  const staffState = ensureStaffState(user);
  const now = Date.now();
  let nextPosition = {
    x: Number(req.body.x || 0),
    y: Number(req.body.y || 0),
    z: Number(req.body.z || 0),
    rot: Number(req.body.rot || 0)
  };
  let commandNotice = "";
  if (staffState.teleportToUser) {
    const destination = findUserByUsername(users, staffState.teleportToUser);
    if (destination?.worldState) {
      nextPosition = {
        x: Number(destination.worldState.x || 0) + 1.4,
        y: Number(destination.worldState.y || 0),
        z: Number(destination.worldState.z || 0) + 1.4,
        rot: Number(destination.worldState.rot || 0)
      };
      staffState.teleportTo = { ...nextPosition, gameId, createdAt: now };
      commandNotice = `Moved near ${destination.username}.`;
    }
    delete staffState.teleportToUser;
  }
  if (staffState.teleportTo?.gameId === gameId) {
    nextPosition = {
      x: Number(staffState.teleportTo.x || 0),
      y: Number(staffState.teleportTo.y || 0.8),
      z: Number(staffState.teleportTo.z || 0),
      rot: Number(staffState.teleportTo.rot || nextPosition.rot || 0)
    };
    commandNotice ||= "Staff teleport applied.";
    delete staffState.teleportTo;
  }
  const previousWorldState = user.worldState?.gameId === gameId ? user.worldState : null;
  const serverDeltaMs = previousWorldState ? Math.max(60, now - Number(previousWorldState.updatedAt || now)) : 160;
  const maxMove = (staffState.fly || staffState.noclip ? 0.34 : 0.22) * (serverDeltaMs / 16.67) + 0.8;
  if (!commandNotice && previousWorldState) {
    const dx = nextPosition.x - Number(previousWorldState.x || 0);
    const dy = nextPosition.y - Number(previousWorldState.y || 0);
    const dz = nextPosition.z - Number(previousWorldState.z || 0);
    const distance = Math.hypot(dx, dy, dz);
    if (distance > maxMove) {
      const ratio = maxMove / distance;
      nextPosition = {
        x: Number(previousWorldState.x || 0) + dx * ratio,
        y: Math.max(0.8, Number(previousWorldState.y || 0.8) + dy * ratio),
        z: Number(previousWorldState.z || 0) + dz * ratio,
        rot: nextPosition.rot
      };
      staffState.notice = "Movement corrected by CUBIXIA Core Server.";
      user.securityFlags = user.securityFlags || [];
      user.securityFlags.unshift({ type: "movement_clamp", gameId, distance: Number(distance.toFixed(2)), createdAt: new Date().toISOString() });
      user.securityFlags = user.securityFlags.slice(0, 25);
      commandNotice ||= "Movement corrected by CUBIXIA Core Server.";
    }
  }
  if (Number(staffState.frozenUntil || 0) > now && user.worldState?.gameId === gameId) {
    nextPosition = {
      x: Number(user.worldState.x || nextPosition.x),
      y: Number(user.worldState.y || nextPosition.y),
      z: Number(user.worldState.z || nextPosition.z),
      rot: Number(user.worldState.rot || nextPosition.rot)
    };
    commandNotice ||= "A moderator is reviewing your account. Please wait.";
  } else if (Number(staffState.frozenUntil || 0) <= now) {
    delete staffState.frozenUntil;
  }
  user.currentGame = await gameTitleFromStore(gameId);
  user.lastOnline = new Date().toISOString();
  user.worldState = {
    gameId,
    x: nextPosition.x,
    y: nextPosition.y,
    z: nextPosition.z,
    rot: nextPosition.rot,
    vx: Number(req.body.vx || 0),
    vy: Number(req.body.vy || 0),
    vz: Number(req.body.vz || 0),
    moving: Boolean(req.body.moving),
    jumping: Boolean(req.body.jumping),
    hp: Number(req.body.hp || 100),
    cash: Number(req.body.cash || 0),
    scale: Number(staffState.scale || 1),
    fly: Boolean(staffState.fly),
    noclip: Boolean(staffState.noclip),
    updatedAt: now
  };
  stampRequestDevice(user, req);
  await writeUsers(users);
  const eventCursor = Number(req.body.eventCursor || 0);
  const allWorldEvents = state.worldEvents?.[gameId] || [];
  res.json({
    players: worldPlayers(users, gameId, user),
    serverTime: now,
    events: allWorldEvents.filter((event) => Number(event.createdAt || 0) > eventCursor && event.userId !== user.id).slice(-25),
    staffState: {
      frozenUntil: Number(staffState.frozenUntil || 0),
      notice: commandNotice,
      position: commandNotice ? nextPosition : null,
      scale: Number(staffState.scale || 1),
      fly: Boolean(staffState.fly),
      noclip: Boolean(staffState.noclip),
      spotlightUntil: Number(staffState.spotlightUntil || 0),
      fireworkUntil: Number(staffState.fireworkUntil || 0),
      emote: staffState.emote || "",
      emoteUntil: Number(staffState.emoteUntil || 0)
    },
    gameEvent: state.gameEvents?.[gameId] || null
  });
});

function worldPlayers(users, gameId, viewer = null) {
  const view = viewer?.worldState?.gameId === gameId ? viewer.worldState : null;
  return users
    .filter((user) => user.worldState?.gameId === gameId && user.currentGame && !user.banned)
    .map((user) => {
      const distance = view ? Math.hypot(
        Number(user.worldState.x || 0) - Number(view.x || 0),
        Number(user.worldState.z || 0) - Number(view.z || 0)
      ) : 0;
      return {
        ...compactUser(user),
        replication: {
          nearby: !view || distance <= 72,
          distance: Number(distance.toFixed(1)),
          detail: !view || distance <= 28 ? "full" : distance <= 72 ? "near" : "far"
        },
        worldState: user.worldState
      };
    });
}

async function appendWorldEvent(gameId, event) {
  const state = await readContentState();
  state.worldEvents[gameId] = Array.isArray(state.worldEvents[gameId]) ? state.worldEvents[gameId] : [];
  state.worldEvents[gameId].push(event);
  state.worldEvents[gameId] = state.worldEvents[gameId].slice(-120);
  await writeContentState(state);
}

app.post("/api/world/:gameId/action", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;
  const users = await readUsers();
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  const gameId = req.params.gameId;
  if (await deletedGameResponse(gameId, res)) return;
  if (user.worldState?.gameId !== gameId || !user.currentGame) return res.status(409).json({ error: "Join the game before sending multiplayer actions." });
  const allowed = new Set(["jump", "shoot", "swing", "interact", "emote", "pickup", "damage", "respawn"]);
  const type = String(req.body.type || "").toLowerCase();
  if (!allowed.has(type)) return res.status(400).json({ error: "Unknown multiplayer action." });
  const now = Date.now();
  const throttleKey = `action_${type}`;
  const minimumGap = type === "shoot" || type === "swing" ? 160 : 90;
  if (Number(user[throttleKey] || 0) + minimumGap > now) return res.json({ ok: true, throttled: true });
  user[throttleKey] = now;
  const payload = req.body.payload && typeof req.body.payload === "object" ? req.body.payload : {};
  const event = {
    id: crypto.randomUUID(),
    gameId,
    userId: user.id,
    username: user.username,
    type,
    position: {
      x: Number(user.worldState.x || 0),
      y: Number(user.worldState.y || 0),
      z: Number(user.worldState.z || 0),
      rot: Number(user.worldState.rot || 0)
    },
    payload: {
      label: String(payload.label || "").slice(0, 50),
      target: String(payload.target || "").slice(0, 50)
    },
    createdAt: now
  };
  await appendWorldEvent(gameId, event);
  user.lastOnline = new Date().toISOString();
  await writeUsers(users);
  res.json({ ok: true, event });
});

function splitCommand(text) {
  const raw = String(text || "").trim();
  const match = raw.match(/^\/([a-zA-Z]+)(?:\s+([\s\S]*))?$/);
  if (!match) return null;
  const args = String(match[2] || "").trim().split(/\s+/).filter(Boolean);
  return { name: match[1].toLowerCase(), args, rest: String(match[2] || "").trim() };
}

function findUserByUsername(users, name) {
  const targetName = String(name || "").trim().toLowerCase();
  if (!targetName) return null;
  const exact = users.find((entry) => entry.username.toLowerCase() === targetName);
  if (exact) return exact;
  const partial = users.filter((entry) => entry.username.toLowerCase().startsWith(targetName));
  return partial.length === 1 ? partial[0] : null;
}

function commandTarget(users, name) {
  return findUserByUsername(users, name);
}

function staffCommandMessage(room, username, text, rank = "Staff") {
  return {
    id: crypto.randomUUID(),
    room,
    username: `CUBIXIA ${rank}`,
    avatar: "",
    text: `${username}: ${text}`,
    staff: true,
    createdAt: new Date().toISOString()
  };
}

function ensureStaffState(user) {
  if (!user.staffState || typeof user.staffState !== "object") user.staffState = {};
  return user.staffState;
}

function safezonePositionForGame(gameId) {
  const safezones = {
    "cubixia-survival": { x: 0, y: 0.8, z: 0, rot: 0 },
    "coaster-tycoon": { x: 0, y: 0.8, z: 5.5, rot: 0 },
    "hide-seek": { x: -28, y: 0.8, z: 24, rot: Math.PI * 0.75 },
    "factory-tycoon": { x: 0, y: 0.8, z: 4, rot: 0 }
  };
  return safezones[gameId] || { x: 0, y: 0.8, z: 4, rot: 0 };
}

function ensureStaffNotes(user) {
  if (!Array.isArray(user.staffNotes)) user.staffNotes = [];
  return user.staffNotes;
}

function commandRequiresAdmin(name) {
  return new Set([
    "shadowmute", "forceleave", "clearwarnings", "casefile", "restartserver", "shutdownserver", "lockserver",
    "unlockserver", "moveserver", "serverinfo", "startevent", "stopevent", "globalemote", "spawnnpc",
    "spawnitem", "inventory", "equipment", "movementlog", "chatlog", "sessioninfo", "reviewstaff",
    "flagstaff", "approvecase", "giantmode", "tiny", "normalsize", "firework", "spotlight", "freezeall", "unfreezeall", "fly", "unfly", "noclip", "clip"
  ]).has(name);
}

function commandRequiresOwner(name) {
  return new Set(["lockdown", "unlockdown"]).has(name);
}

async function appendRoomMessage(room, message) {
  const messages = await readChat();
  messages.push(message);
  await writeChat(messages);
  return messages.filter((entry) => entry.room === room).slice(-40);
}

app.post("/api/game-command", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const parsed = splitCommand(req.body.text || req.body.command);
  if (!parsed) return res.status(400).json({ error: "Commands must start with /." });
  const gameId = String(req.body.gameId || "").slice(0, 80);
  const room = `game:${gameId || "global"}`;

  const users = await readUsers();
  const actor = requireSessionUser(users, userId, res);
  if (!actor) return;
  const lockdown = publicLockdownForUser(await activeLockdownState(), actor);
  if (lockdown && parsed.name !== "unlockdown") return res.status(423).json({ error: "CUBIXIA is under owner lockdown.", lockdown, user: publicUser(actor, users) });
  if (commandRequiresOwner(parsed.name)) {
    if (!hasOwnerAccess(actor)) return res.status(403).json({ error: "Only owner-level staff can use that command." });
  } else if (commandRequiresAdmin(parsed.name)) {
    if (!canTimeout(actor)) return res.status(403).json({ error: "Only admins and owner-level staff can use that command." });
  } else if (!canModerate(actor)) {
    return res.status(403).json({ error: "Only moderators, admins, and owner-level staff can use in-game staff commands." });
  }
  if (isTimedOut(actor)) return res.status(423).json({ error: "You are timed out and cannot use staff commands." });

  const state = await readContentState();
  const now = Date.now();
  let message = "";
  let publicMessage = "";
  let details = null;
  const [targetArg, secondArg] = parsed.args;
  const target = commandTarget(users, targetArg);
  const reasonFrom = (startIndex, fallback = "CUBIXIA staff action.") => parsed.args.slice(startIndex).join(" ").slice(0, 240) || fallback;
  const requireTarget = () => {
    if (!target) throw Object.assign(new Error("No user was found for that command."), { status: 404 });
    if (target.id === actor.id) throw Object.assign(new Error("You cannot use that command on yourself."), { status: 400 });
    if (hasOwnerAccess(target) && !isOwnerName(actor.username)) throw Object.assign(new Error("Only Tanklyplayz can act on owner-level accounts."), { status: 403 });
    return target;
  };

  try {
    if (parsed.name === "warn") {
      const user = requireTarget();
      const reason = reasonFrom(1, "CUBIXIA warning.");
      setModerationNotice(user, "warning", reason, actor, 0);
      message = `Warned ${user.username}: ${reason}`;
    } else if (parsed.name === "kick" || parsed.name === "forceleave") {
      const user = requireTarget();
      const reason = reasonFrom(1, "Removed from game by CUBIXIA staff.");
      user.currentGame = "";
      user.worldState = null;
      setModerationNotice(user, "kick", reason, actor, now);
      message = `${user.username} was kicked from the game.`;
      publicMessage = `${user.username} was removed from the server.`;
    } else if (parsed.name === "ban") {
      const user = requireTarget();
      const duration = durationFromToken(secondArg, 24 * 60 * 60 * 1000);
      const reason = reasonFrom(2, "Banned by CUBIXIA staff.");
      user.banned = true;
      user.permanentBan = duration.permanent;
      user.banReason = reason;
      user.banUntil = duration.permanent ? 0 : now + duration.ms;
      user.currentGame = "";
      user.worldState = null;
      user.online = false;
      setModerationNotice(user, "ban", reason, actor, user.banUntil);
      message = `Banned ${user.username} for ${duration.label}.`;
    } else if (parsed.name === "mute" || parsed.name === "shadowmute") {
      const user = requireTarget();
      const duration = durationFromToken(secondArg, 10 * 60 * 1000);
      const reason = reasonFrom(2, parsed.name === "shadowmute" ? "Shadow muted by CUBIXIA staff." : "Muted by CUBIXIA staff.");
      user.chatMutedUntil = duration.permanent ? now + 10 * 365 * 24 * 60 * 60 * 1000 : now + duration.ms;
      user.chatMuteReason = reason;
      user.shadowMuted = parsed.name === "shadowmute";
      setModerationNotice(user, parsed.name === "shadowmute" ? "shadowmute" : "mute", reason, actor, user.chatMutedUntil);
      message = `${user.username} was ${parsed.name === "shadowmute" ? "shadow " : ""}muted for ${duration.label}.`;
    } else if (parsed.name === "note" || parsed.name === "attachnote") {
      const isReportNote = parsed.name === "attachnote";
      if (isReportNote) {
        const reportId = targetArg;
        const reports = await readReports();
        const report = reports.find((entry) => entry.id === reportId);
        if (!report) return res.status(404).json({ error: "Report was not found." });
        report.notes = [...(report.notes || []), { by: actor.username, text: parsed.args.slice(1).join(" ").slice(0, 240), createdAt: new Date().toISOString() }];
        await writeReports(reports);
        message = `Added a note to report ${reportId}.`;
      } else {
        const user = requireTarget();
        ensureStaffNotes(user).unshift({ id: crypto.randomUUID(), by: actor.username, text: reasonFrom(1, "Staff note."), createdAt: new Date().toISOString() });
        user.staffNotes = user.staffNotes.slice(0, 50);
        message = `Added a staff note to ${user.username}.`;
      }
    } else if (parsed.name === "freeze" || parsed.name === "unfreeze" || parsed.name === "safezone" || parsed.name === "goto" || parsed.name === "bring" || parsed.name === "inspect") {
      const selfTarget = parsed.name === "safezone" && (!targetArg || ["me", "self", actor.username.toLowerCase()].includes(String(targetArg || "").toLowerCase()));
      const user = selfTarget ? actor : requireTarget();
      if (parsed.name === "freeze") {
        ensureStaffState(user).frozenUntil = now + 10 * 60 * 1000;
        message = `${user.username} is frozen for investigation.`;
      } else if (parsed.name === "unfreeze") {
        delete ensureStaffState(user).frozenUntil;
        message = `${user.username} is unfrozen and can move again.`;
      } else if (parsed.name === "safezone") {
        const destinationGameId = user.worldState?.gameId || gameId;
        const destination = safezonePositionForGame(destinationGameId);
        ensureStaffState(user).teleportTo = { ...destination, gameId: destinationGameId, createdAt: now };
        message = `${user.username} was sent to the ${destinationGameId || "current"} safe zone.`;
      } else if (parsed.name === "goto") {
        if (user.worldState) ensureStaffState(actor).teleportTo = {
          x: Number(user.worldState.x || 0) + 1.4,
          y: Number(user.worldState.y || 0.8),
          z: Number(user.worldState.z || 0) + 1.4,
          rot: Number(user.worldState.rot || 0),
          gameId: user.worldState.gameId || gameId,
          createdAt: now
        };
        else ensureStaffState(actor).teleportToUser = user.username;
        message = `Teleport request set: going to ${user.username}.`;
      } else if (parsed.name === "bring") {
        if (actor.worldState) ensureStaffState(user).teleportTo = {
          x: Number(actor.worldState.x || 0) + 1.4,
          y: Number(actor.worldState.y || 0.8),
          z: Number(actor.worldState.z || 0) + 1.4,
          rot: Number(actor.worldState.rot || 0),
          gameId: actor.worldState.gameId || gameId,
          createdAt: now
        };
        else ensureStaffState(user).teleportToUser = actor.username;
        message = `Bring request set for ${user.username}.`;
      } else {
        const recentMessages = (await readChat()).filter((entry) => entry.username.toLowerCase() === user.username.toLowerCase()).slice(-5).map((entry) => entry.text);
        details = {
          title: `Inspecting ${user.username}`,
          sections: [
            { label: "Player", value: `${user.username} | ${user.role || "user"} | ${user.currentGame || "not in game"}` },
            { label: "Avatar", value: `Equipped: ${(user.equipped || []).join(", ") || "nothing"} | Inventory: ${(user.inventory || []).length} items` },
            { label: "Recent Chat", value: recentMessages.join(" | ") || "No recent chat." },
            { label: "Session", value: `Joined/seen: ${user.lastOnline || "unknown"} | Cubbits: ${Number(user.cubbux || 0)}` },
            { label: "Staff Notes", value: (user.staffNotes || []).slice(0, 3).map((note) => `${note.by}: ${note.text}`).join(" | ") || "No staff notes." }
          ]
        };
        message = `Opened inspection file for ${user.username}.`;
      }
    } else if (parsed.name === "clearchat") {
      const amount = Math.max(1, Math.min(100, Number(targetArg || 20)));
      const messages = await readChat();
      const kept = [];
      let removed = 0;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].room === room && removed < amount) removed += 1;
        else kept.unshift(messages[i]);
      }
      await writeChat(kept);
      message = `Cleared ${removed} chat message${removed === 1 ? "" : "s"} from this game.`;
    } else if (parsed.name === "slowmode" || parsed.name === "lockchat" || parsed.name === "unlockchat") {
      const controls = { ...(state.chatControls[room] || {}) };
      if (parsed.name === "slowmode") controls.slowmode = Math.max(0, Math.min(120, Number(targetArg || 0)));
      if (parsed.name === "lockchat") controls.locked = true;
      if (parsed.name === "unlockchat") controls.locked = false;
      controls.updatedBy = actor.username;
      controls.updatedAt = now;
      state.chatControls[room] = controls;
      await writeContentState(state);
      message = parsed.name === "slowmode" ? `Slowmode set to ${controls.slowmode}s.` : `Chat ${controls.locked ? "locked" : "unlocked"}.`;
    } else if (parsed.name === "announce") {
      publicMessage = parsed.rest.slice(0, 240) || "CUBIXIA staff announcement.";
      message = `Announcement sent: ${publicMessage}`;
    } else if (parsed.name === "reviewreports") {
      const open = (await readReports()).filter((report) => report.status !== "deleted" && report.status !== "resolved").slice(0, 5);
      details = {
        title: "Open Reports",
        sections: open.length ? open.map((report) => ({ label: report.id.slice(0, 8), value: `${report.abuseType} | ${report.targetType} ${report.target} | ${report.details}` })) : [{ label: "Reports", value: "No open reports." }]
      };
      message = open.length ? open.map((report) => `${report.id.slice(0, 8)}: ${report.abuseType} on ${report.target}`).join(" | ") : "No open reports.";
    } else if (parsed.name === "resolve" || parsed.name === "escalate") {
      const reports = await readReports();
      const report = reports.find((entry) => entry.id === targetArg || entry.id?.startsWith(targetArg || ""));
      if (!report) return res.status(404).json({ error: "Report was not found." });
      report.status = parsed.name === "resolve" ? "resolved" : "escalated";
      report.updatedBy = actor.username;
      report.updatedAt = new Date().toISOString();
      await writeReports(reports);
      message = `Report ${report.id.slice(0, 8)} marked ${report.status}.`;
    } else if (parsed.name === "clearwarnings") {
      const user = requireTarget();
      user.moderationNotice = null;
      user.staffNotes = [];
      message = `Cleared warnings and notes for ${user.username}.`;
    } else if (["inventory", "equipment", "movementlog", "chatlog", "sessioninfo", "casefile"].includes(parsed.name)) {
      const user = requireTarget();
      if (parsed.name === "inventory") message = `${user.username} inventory: ${(user.inventory || []).join(", ") || "empty"}.`;
      if (parsed.name === "equipment") message = `${user.username} equipped: ${(user.equipped || []).join(", ") || "nothing"}.`;
      if (parsed.name === "movementlog") message = `${user.username} position: ${JSON.stringify(user.worldState || {})}`;
      if (parsed.name === "chatlog") {
        const messages = (await readChat()).filter((entry) => entry.username.toLowerCase() === user.username.toLowerCase()).slice(-5);
        message = messages.length ? messages.map((entry) => entry.text).join(" | ") : "No chat messages found.";
      }
      if (parsed.name === "sessioninfo") message = `${user.username}: online ${Boolean(user.online)}, last online ${user.lastOnline || "unknown"}, current game ${user.currentGame || "none"}.`;
      if (parsed.name === "casefile") message = `${user.username}: banned ${Boolean(user.banned)}, timeout ${Number(user.timeoutUntil || 0)}, notes ${(user.staffNotes || []).length}.`;
      details = {
        title: `${parsed.name.toUpperCase()} | ${user.username}`,
        sections: [
          { label: "Inventory", value: (user.inventory || []).join(", ") || "empty" },
          { label: "Equipped", value: (user.equipped || []).join(", ") || "nothing" },
          { label: "Movement", value: JSON.stringify(user.worldState || {}) },
          { label: "Session", value: `Online: ${Boolean(user.online)} | Last online: ${user.lastOnline || "unknown"} | Game: ${user.currentGame || "none"}` },
          { label: "Case File", value: `Banned: ${Boolean(user.banned)} | Timeout: ${Number(user.timeoutUntil || 0)} | Notes: ${(user.staffNotes || []).length}` },
          { label: "Staff Notes", value: (user.staffNotes || []).slice(0, 5).map((note) => `${note.by}: ${note.text}`).join(" | ") || "No staff notes." }
        ]
      };
    } else if (["restartserver", "shutdownserver", "lockserver", "unlockserver", "moveserver", "serverinfo"].includes(parsed.name)) {
      state.serverControls[gameId] = { ...(state.serverControls[gameId] || {}), lastCommand: parsed.name, reason: parsed.args.join(" ").slice(0, 240), locked: parsed.name === "lockserver" ? true : parsed.name === "unlockserver" ? false : state.serverControls[gameId]?.locked, updatedBy: actor.username, updatedAt: now };
      await writeContentState(state);
      if (parsed.name === "serverinfo") {
        const count = worldPlayers(users, gameId).length;
        details = {
          title: `Server Info | ${gameId || "current server"}`,
          sections: [
            { label: "Player Count", value: String(count) },
            { label: "Uptime", value: `${Math.round(process.uptime())} seconds` },
            { label: "Memory", value: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB RSS` },
            { label: "Region", value: process.env.RENDER_REGION || "local development" },
            { label: "Controls", value: JSON.stringify(state.serverControls[gameId] || {}) },
            { label: "Active Event", value: JSON.stringify(state.gameEvents[gameId] || {}) }
          ]
        };
      }
      message = parsed.name === "serverinfo" ? `Server ${gameId}: ${JSON.stringify(state.serverControls[gameId])}` : `${parsed.name} queued for ${gameId || "this server"}.`;
    } else if (["startevent", "stopevent", "globalemote", "spawnnpc", "spawnitem", "giantmode", "tiny", "normalsize", "firework", "spotlight", "freezeall", "unfreezeall", "fly", "unfly", "noclip", "clip", "reviewstaff", "flagstaff", "approvecase"].includes(parsed.name)) {
      state.gameEvents[gameId] = { command: parsed.name, value: parsed.args.join(" ").slice(0, 120), by: actor.username, createdAt: now };
      const actorStaff = ensureStaffState(actor);
      if (parsed.name === "giantmode") actorStaff.scale = 2;
      if (parsed.name === "tiny") actorStaff.scale = 0.5;
      if (parsed.name === "normalsize") actorStaff.scale = 1;
      if (parsed.name === "fly") actorStaff.fly = true;
      if (parsed.name === "unfly") actorStaff.fly = false;
      if (parsed.name === "noclip") actorStaff.noclip = true;
      if (parsed.name === "clip") actorStaff.noclip = false;
      if (parsed.name === "firework") actorStaff.fireworkUntil = now + 4500;
      if (parsed.name === "spotlight") actorStaff.spotlightUntil = now + 2 * 60 * 1000;
      if (parsed.name === "globalemote") {
        const emote = parsed.args.join(" ").slice(0, 40) || "Staff Emote";
        users.filter((entry) => entry.worldState?.gameId === gameId).forEach((entry) => {
          const entryStaff = ensureStaffState(entry);
          entryStaff.emote = emote;
          entryStaff.emoteUntil = now + 2600;
        });
      }
      if (parsed.name === "freezeall") users.filter((entry) => entry.worldState?.gameId === gameId).forEach((entry) => { ensureStaffState(entry).frozenUntil = now + 60 * 1000; });
      if (parsed.name === "unfreezeall") users.filter((entry) => entry.worldState?.gameId === gameId).forEach((entry) => { delete ensureStaffState(entry).frozenUntil; });
      await writeContentState(state);
      message = `${parsed.name} activated${parsed.args.length ? `: ${parsed.args.join(" ")}` : ""}.`;
      if (["startevent", "stopevent", "globalemote", "spawnnpc", "spawnitem", "firework", "spotlight", "freezeall", "unfreezeall"].includes(parsed.name)) publicMessage = message;
    } else if (parsed.name === "lockdown") {
      const reason = parsed.rest.slice(0, 500) || "Owner emergency lockdown.";
      state.lockdown = { active: true, reason, lockedBy: actor.username, startedAt: now, audioUntil: now + 5 * 60 * 1000 };
      users.filter((entry) => !canModerate(entry)).forEach((entry) => {
        entry.notifications = entry.notifications || [];
        entry.currentGame = "";
        entry.worldState = null;
        entry.notifications.unshift({ id: crypto.randomUUID(), type: "lockdown", from: actor.username, text: `CUBIXIA entered lockdown: ${reason}`, createdAt: new Date().toISOString() });
      });
      await writeContentState(state);
      message = `Owner lockdown started: ${reason}`;
    } else if (parsed.name === "unlockdown") {
      state.lockdown = { active: false, reason: "", lockedBy: "", startedAt: 0, audioUntil: 0 };
      await writeContentState(state);
      message = "Owner lockdown ended.";
    } else {
      return res.status(400).json({ error: `Unknown staff command: /${parsed.name}` });
    }
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message || "Command failed." });
  }

  actor.notifications.unshift({
    id: crypto.randomUUID(),
    type: "staff_command",
    from: "CUBIXIA",
    text: `/${parsed.name}: ${message}`,
    createdAt: new Date().toISOString()
  });
  stampRequestDevice(actor, req);
  await writeUsers(users);
  let messages = [];
  if (publicMessage) {
    messages = await appendRoomMessage(room, staffCommandMessage(room, actor.username, publicMessage, canTimeout(actor) ? "Admin" : "Moderator"));
  } else {
    messages = (await readChat()).filter((entry) => entry.room === room).slice(-40);
  }
  res.json({
    ok: true,
    command: parsed.name,
    message,
    details,
    messages,
    user: publicUser(actor, users),
    lockdown: publicLockdownForUser(state.lockdown, actor),
    staffLockdown: canModerate(actor) ? publicLockdown(state.lockdown) : null
  });
});

app.get("/api/chat", async (req, res) => {
  const messages = await readChat();
  const room = String(req.query.room || "global");
  if (room.startsWith("game:") && await deletedGameResponse(room.slice(5), res)) return;
  res.json({ messages: messages.filter((message) => message.room === room).slice(-40) });
});

app.post("/api/chat", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const ipBan = activeIpBanForRequest(req, users);
  if (ipBan) return res.status(423).json({ error: ipBan.moderation.title, moderation: ipBan.moderation });
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  const lockdown = publicLockdownForUser(await activeLockdownState(), user);
  if (lockdown) return res.status(423).json({ error: "CUBIXIA is under owner lockdown.", lockdown, user: publicUser(user, users) });
  const moderation = activeModeration(user);
  if (moderation) return res.status(423).json({ error: moderation.title, moderation, user: publicUser(user, users) });
  const room = String(req.body.room || "global");
  if (room.startsWith("game:") && await deletedGameResponse(room.slice(5), res)) return;
  const state = await readContentState();
  const controls = state.chatControls?.[room] || {};
  const messages = await readChat();
  if (controls.locked && !canModerate(user)) {
    return res.status(423).json({ error: "This game chat is locked by CUBIXIA staff." });
  }
  const mutedUntil = Number(user.chatMutedUntil || 0);
  if (mutedUntil > Date.now()) {
    const visibleMessages = messages.filter((message) => message.room === room).slice(-40);
    if (user.shadowMuted) return res.json({ messages: visibleMessages, shadowMuted: true });
    return res.status(423).json({ error: `You are muted. Reason: ${user.chatMuteReason || "CUBIXIA staff action."}` });
  }
  const slowmode = Math.max(0, Number(controls.slowmode || 0));
  if (slowmode && !canModerate(user)) {
    user.chatSlowmodeAt = user.chatSlowmodeAt && typeof user.chatSlowmodeAt === "object" ? user.chatSlowmodeAt : {};
    const lastAt = Number(user.chatSlowmodeAt[room] || 0);
    if (Date.now() - lastAt < slowmode * 1000) {
      return res.status(429).json({ error: `Slowmode is on. Wait ${Math.ceil((slowmode * 1000 - (Date.now() - lastAt)) / 1000)}s.` });
    }
    user.chatSlowmodeAt[room] = Date.now();
  }
  const text = String(req.body.text || "").slice(0, 180);
  if (!text.trim()) return res.status(400).json({ error: "Message cannot be empty." });
  if (BLOCKED_CHAT_TERMS.some((term) => text.toLowerCase().includes(term))) {
    return res.status(400).json({ error: "That message is not allowed on CUBIXIA." });
  }

  messages.push({
    id: crypto.randomUUID(),
    room,
    username: user.username,
    avatar: user.avatar,
    text,
    createdAt: new Date().toISOString()
  });
  stampRequestDevice(user, req);
  await writeUsers(users);
  await writeChat(messages);
  res.json({ messages: messages.filter((message) => message.room === room).slice(-40) });
});

app.post("/api/report", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const reporter = requireSessionUser(users, userId, res);
  if (!reporter) return;
  const target = String(req.body.target || "Unknown").slice(0, 40);
  const targetType = String(req.body.targetType || "Person").slice(0, 40);
  const abuseType = String(req.body.abuseType || "Unspecified").slice(0, 80);
  const details = String(req.body.details || "No details provided.").slice(0, 300);
  const reportId = crypto.randomUUID();
  const report = {
    id: reportId,
    reporter: reporter.username,
    target,
    targetType,
    abuseType,
    details,
    status: "open",
    createdAt: new Date().toISOString()
  };
  const reports = await readReports();
  reports.unshift(report);
  await writeReports(reports);
  const recipients = users.filter((entry) => canModerate(entry));
  recipients.forEach((recipient) => {
    recipient.notifications.unshift({
      id: crypto.randomUUID(),
      type: "report",
      reportId,
      from: reporter.username,
      target,
      targetType,
      abuseType,
      details,
      text: `Report from ${reporter.username}: ${abuseType} involving ${targetType} ${target}. Reason: ${details}`,
      createdAt: report.createdAt
    });
  });
  reporter.notifications.unshift({
    id: crypto.randomUUID(),
    type: "report_sent",
    from: "CUBIXIA",
    text: "Your report was sent to CUBIXIA moderators, admins, and the owner.",
    createdAt: new Date().toISOString()
  });
  await writeUsers(users);
  res.json({ user: publicUser(reporter, users), ok: true });
});

app.get("/api/moderation/reports", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const moderator = requireSessionUser(users, userId, res);
  if (!moderator) return;
  if (!canModerate(moderator)) return res.status(403).json({ error: "Only moderators, admins, and the owner can view reports." });
  const reports = (await readReports()).filter((report) => report.status !== "deleted").slice(0, 50);
  res.json({ user: publicUser(moderator, users), reports });
});

app.post("/api/moderation/reports/delete", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const moderator = requireSessionUser(users, userId, res);
  if (!moderator) return;
  if (!canModerate(moderator)) return res.status(403).json({ error: "Only moderators, admins, and the owner can delete reports." });

  const reportId = String(req.body.reportId || "");
  const reports = await readReports();
  const report = reports.find((entry) => entry.id === reportId);
  if (!report) return res.status(404).json({ error: "Report was not found." });
  report.status = "deleted";
  report.deletedBy = moderator.username;
  report.deletedAt = new Date().toISOString();
  users.forEach((user) => {
    user.notifications = (user.notifications || []).filter((note) => note.reportId !== reportId);
  });
  await writeReports(reports);
  await writeUsers(users);
  res.json({ ok: true, user: publicUser(moderator, users) });
});

app.get("/api/moderation/content", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const moderator = requireSessionUser(users, userId, res);
  if (!moderator) return;
  if (!canModerate(moderator)) return res.status(403).json({ error: "Only moderators, admins, and the owner can manage content." });

  await readContentState();
  const studioGames = await readStudioGames();
  res.json({
    user: publicUser(moderator, users),
    games: [...GAMES.map(publicGame), ...studioGames.map(publicStudioGame)],
    items: publicItems(),
    canRestore: canTimeout(moderator),
    ownerAudit: hasOwnerAccess(moderator)
  });
});

app.post("/api/moderation/content/delete", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const moderator = requireSessionUser(users, userId, res);
  if (!moderator) return;
  if (!canModerate(moderator)) return res.status(403).json({ error: "Only moderators, admins, and the owner can delete content." });

  const type = contentTypeFromBody(req.body.type);
  const id = String(req.body.id || "").trim();
  const reason = String(req.body.reason || "Deleted by CUBIXIA moderation.").slice(0, 200);
  const studioGames = await readStudioGames();
  const game = type === "games" ? [...GAMES, ...studioGames].find((entry) => entry.id === id) : null;
  const item = type === "items" ? AVATAR_ITEMS.find((entry) => entry.id === id) : null;
  if (type === "games" && !game) return res.status(404).json({ error: "Game was not found." });
  if (type === "items" && !item) return res.status(404).json({ error: "Clothing/item was not found." });

  const state = await readContentState();
  const bucket = state[type] || {};
  bucket[id] = {
    ...(bucket[id] || {}),
    deleted: true,
    originalName: bucket[id]?.originalName || game?.title || item?.name || id,
    reason,
    deletedBy: moderator.username,
    deletedAt: new Date().toISOString(),
    restoredBy: "",
    restoredAt: ""
  };
  state[type] = bucket;

  if (type === "games") {
    users.forEach((user) => {
      if (user.worldState?.gameId === id || user.lastPlayed?.id === id) {
        user.currentGame = "";
        user.worldState = null;
        user.notifications.unshift({
          id: crypto.randomUUID(),
          type: "content_deleted",
          from: "CUBIXIA Moderation",
          text: `${game.title} was deleted and can no longer be played. Reason: ${reason}`,
          createdAt: new Date().toISOString()
        });
      }
    });
  } else {
    users.forEach((user) => {
      user.equipped = (user.equipped || []).filter((itemId) => itemId !== id);
    });
  }

  await writeContentState(state);
  await writeUsers(users);
  res.json({ user: publicUser(moderator, users), deleted: true, type, id });
});

app.post("/api/moderation/content/restore", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const moderator = requireSessionUser(users, userId, res);
  if (!moderator) return;
  if (!canTimeout(moderator)) return res.status(403).json({ error: "Only admins and the owner can un-delete content." });

  const type = contentTypeFromBody(req.body.type);
  const id = String(req.body.id || "").trim();
  const state = await readContentState();
  const record = state[type]?.[id];
  if (!record) return res.status(404).json({ error: "Deleted content record was not found." });
  record.deleted = false;
  record.restoredBy = moderator.username;
  record.restoredAt = new Date().toISOString();
  state[type][id] = record;
  await writeContentState(state);
  res.json({ user: publicUser(moderator, users), restored: true, type, id });
});

app.post("/api/moderation/follow", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const moderator = requireSessionUser(users, userId, res);
  if (!moderator) return;
  if (!canTimeout(moderator)) return res.status(403).json({ error: "Only admins and the owner can follow any player." });
  const username = String(req.body.username || "").trim();
  const target = findUserByUsername(users, username);
  if (!target) return res.status(404).json({ error: "No user was found." });
  moderator.following = Array.from(new Set([...(moderator.following || []), target.username]));
  await writeUsers(users);
  res.json({ user: publicUser(moderator, users), target: compactUser(target), following: moderator.following });
});

app.get("/api/moderation/chat-audit", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const owner = requireSessionUser(users, userId, res);
  if (!owner) return;
  if (!hasOwnerAccess(owner)) return res.status(403).json({ error: "Only owner-level accounts can use chat audit search." });
  const username = String(req.query.username || "").trim().toLowerCase();
  const word = String(req.query.word || req.query.q || "").trim().toLowerCase();
  const messages = await readChat();
  const filtered = messages
    .filter((message) => !username || String(message.username || "").toLowerCase().includes(username))
    .filter((message) => !word || String(message.text || "").toLowerCase().includes(word))
    .slice(-200)
    .reverse();
  res.json({ user: publicUser(owner, users), messages: filtered });
});

app.post("/api/moderation/action", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const moderator = requireSessionUser(users, userId, res);
  if (!moderator) return;
  if (!canModerate(moderator)) return res.status(403).json({ error: "Only moderators, admins, and the owner can use moderation actions." });

  const action = String(req.body.action || "").toLowerCase();
  const targetName = String(req.body.username || "").trim();
  const reason = String(req.body.reason || "CUBIXIA moderation action.").slice(0, 160);
  const banAction = ["ban", "permban", "ipban"].includes(action);
  const permanent = action === "permban" || isPermanentRequested(req.body.permanent) || String(req.body.durationUnit || "").toLowerCase() === "permanent";
  const durationMs = permanent ? 0 : durationMsFromBody(req.body, banAction ? 24 * 60 * 60 * 1000 : 0);
  const until = permanent ? 0 : durationMs ? Date.now() + durationMs : 0;
  const target = findUserByUsername(users, targetName);
  if (!target) return res.status(404).json({ error: "No user was found." });
  if (target.id === moderator.id) return res.status(400).json({ error: "You cannot moderate yourself." });
  if (hasOwnerAccess(target) && !isOwnerName(moderator.username)) {
    return res.status(403).json({ error: "Only Tanklyplayz can act on owner-level accounts." });
  }

  if (action === "timeout" && !canTimeout(moderator)) {
    return res.status(403).json({ error: "Only admins and the owner can timeout users." });
  }

  if (action === "kick") {
    target.currentGame = "";
    target.worldState = null;
    setModerationNotice(target, "kick", reason, moderator, Date.now());
  } else if (banAction) {
    const ipBan = action === "ipban" || isRememberDeviceRequested(req.body.ipBan);
    if (ipBan && (!target.lastIpHash || !target.lastDeviceHash)) {
      return res.status(400).json({ error: "That player needs to log in or join a game once before IP/device ban can be used." });
    }
    target.banned = true;
    target.permanentBan = permanent;
    target.ipBanned = ipBan ? true : Boolean(target.ipBanned);
    target.banReason = reason;
    target.banUntil = permanent ? 0 : until;
    target.currentGame = "";
    target.worldState = null;
    target.online = false;
    if (ipBan) applyIpBan(target, moderator, reason, target.banUntil, req);
    setModerationNotice(target, ipBan ? "ipban" : "ban", reason, moderator, target.banUntil);
  } else if (action === "unban") {
    target.banned = false;
    target.permanentBan = false;
    target.ipBanned = false;
    target.ipBanRecords = [];
    target.banReason = "";
    target.banUntil = 0;
    target.moderationNotice = null;
  } else if (action === "warn") {
    setModerationNotice(target, "warning", reason, moderator, until);
  } else if (action === "timeout") {
    target.timeoutUntil = until || Date.now() + 10 * 60 * 1000;
    target.timeoutReason = reason;
    target.currentGame = "";
    target.worldState = null;
    setModerationNotice(target, "timeout", reason, moderator, target.timeoutUntil);
  } else {
    return res.status(400).json({ error: "Choose kick, ban, permanent ban, IP ban, unban, warn, or timeout." });
  }

  moderator.notifications.unshift({
    id: crypto.randomUUID(),
    type: "moderation_action",
    from: "CUBIXIA",
    text: `${moderator.username} used ${action.toUpperCase()} on ${target.username}. Reason: ${reason}`,
    createdAt: new Date().toISOString()
  });

  await writeUsers(users);
  res.json({ user: publicUser(moderator, users), target: compactUser(target), action });
});

app.post("/api/moderation/ack", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const user = requireSessionUser(users, userId, res);
  if (!user) return;
  const moderation = activeModeration(user);
  if (!moderation) return res.json({ user: publicUser(user, users), ok: true });
  if (!moderation.canAcknowledge) {
    return res.status(423).json({ error: "You can acknowledge after the moderation timer is finished.", moderation });
  }
  if (user.moderationNotice) user.moderationNotice.acknowledged = true;
  if (moderation.action === "ban" || moderation.action === "ipban") {
    user.banned = false;
    user.permanentBan = false;
    user.ipBanned = false;
    user.ipBanRecords = [];
    user.banReason = "";
    user.banUntil = 0;
  }
  if (moderation.action === "timeout") {
    user.timeoutUntil = 0;
    user.timeoutReason = "";
  }
  user.online = true;
  user.lastOnline = new Date().toISOString();
  await writeUsers(users);
  res.json({ user: publicUser(user, users), ok: true });
});

app.post("/api/admin/ban", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const admin = requireSessionUser(users, userId, res);
  if (!admin) return;
  if (!hasOwnerAccess(admin)) return res.status(403).json({ error: "Only owner-level accounts can ban users." });

  const targetName = String(req.body.username || "").trim();
  const target = findUserByUsername(users, targetName);
  if (!target) return res.status(404).json({ error: "No user was found." });
  if (hasOwnerAccess(target) && !isOwnerName(admin.username)) return res.status(403).json({ error: "Only Tanklyplayz can ban owner-level accounts." });
  if (isOwnerName(target.username)) return res.status(400).json({ error: "The owner account cannot be banned." });

  const reason = String(req.body.reason || "Banned by CUBIXIA owner.").slice(0, 160);
  const banning = isRememberDeviceRequested(req.body.banned);
  const permanent = isPermanentRequested(req.body.permanent) || String(req.body.durationUnit || "").toLowerCase() === "permanent";
  const durationMs = permanent ? 0 : durationMsFromBody(req.body, 24 * 60 * 60 * 1000);
  const until = permanent ? 0 : Date.now() + durationMs;
  const ipBan = isRememberDeviceRequested(req.body.ipBan);
  if (banning && ipBan && (!target.lastIpHash || !target.lastDeviceHash)) {
    return res.status(400).json({ error: "That player needs to log in or join a game once before IP/device ban can be used." });
  }
  target.banned = banning;
  if (banning) {
    target.permanentBan = permanent;
    target.ipBanned = ipBan ? true : Boolean(target.ipBanned);
    target.banReason = reason;
    target.banUntil = permanent ? 0 : until;
    target.online = false;
    target.currentGame = "";
    target.worldState = null;
    if (ipBan) applyIpBan(target, admin, reason, target.banUntil, req);
    setModerationNotice(target, ipBan ? "ipban" : "ban", reason, admin, target.banUntil);
  } else {
    target.permanentBan = false;
    target.ipBanned = false;
    target.ipBanRecords = [];
    target.banReason = "";
    target.banUntil = 0;
    target.moderationNotice = null;
  }
  await writeUsers(users);
  res.json({ user: publicUser(admin, users), target: compactUser(target) });
});

app.post("/api/admin/grant-cubbux", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const admin = requireSessionUser(users, userId, res);
  if (!admin) return;
  if (!hasOwnerAccess(admin)) return res.status(403).json({ error: "Only owner-level accounts can grant Cubbits." });

  const target = findUserByUsername(users, req.body.username);
  if (!target) return res.status(404).json({ error: "No user was found." });
  const amount = Math.max(1, Math.min(100000, Number(req.body.amount || 0)));
  target.cubbux = Number(target.cubbux || 0) + amount;
  target.transactions.unshift({
    id: crypto.randomUUID(),
    type: "owner_grant",
    label: `Owner grant from ${admin.username}`,
    amount,
    createdAt: new Date().toISOString()
  });
  target.notifications.unshift({
    id: crypto.randomUUID(),
    type: "cubbux_grant",
    from: admin.username,
    text: `${admin.username} granted you ${amount.toLocaleString()} Cubbits.`,
    createdAt: new Date().toISOString()
  });
  await writeUsers(users);
  res.json({ user: publicUser(admin, users), target: compactUser(target) });
});

app.post("/api/admin/take-cubbux", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const admin = requireSessionUser(users, userId, res);
  if (!admin) return;
  if (!hasOwnerAccess(admin)) return res.status(403).json({ error: "Only owner-level accounts can take Cubbits." });

  const target = findUserByUsername(users, req.body.username);
  if (!target) return res.status(404).json({ error: "No user was found." });
  const amount = Math.max(1, Math.min(100000, Number(req.body.amount || 0)));
  target.cubbux = Math.max(0, Number(target.cubbux || 0) - amount);
  target.transactions.unshift({
    id: crypto.randomUUID(),
    type: "owner_take",
    label: `Owner removal by ${admin.username}`,
    amount: -amount,
    createdAt: new Date().toISOString()
  });
  target.notifications.unshift({
    id: crypto.randomUUID(),
    type: "cubbux_removed",
    from: admin.username,
    text: `${admin.username} removed ${amount.toLocaleString()} Cubbits.`,
    createdAt: new Date().toISOString()
  });
  await writeUsers(users);
  res.json({ user: publicUser(admin, users), target: compactUser(target) });
});

app.post("/api/admin/role", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const admin = requireSessionUser(users, userId, res);
  if (!admin) return;
  if (!hasOwnerAccess(admin)) return res.status(403).json({ error: "Only owner-level accounts can change roles." });

  const target = findUserByUsername(users, req.body.username);
  if (!target) return res.status(404).json({ error: "No user was found." });
  if (isOwnerName(target.username)) return res.status(400).json({ error: "The owner role cannot be changed." });
  const role = ["user", "mod", "admin", "cofounder"].includes(req.body.role) ? req.body.role : "user";
  if (role === "cofounder") {
    if (!isOwnerName(admin.username)) return res.status(403).json({ error: "Only Tanklyplayz can give the Co-Founder role." });
    const existingCofounder = users.find((entry) => entry.id !== target.id && entry.role === "cofounder");
    if (existingCofounder) return res.status(409).json({ error: `${existingCofounder.username} is already the Co-Founder. Remove that role first.` });
  }
  target.role = role;
  if (role === "mod" || role === "admin" || role === "cofounder") {
    if (!target.inventory.includes("ban-hammer")) target.inventory.push("ban-hammer");
  } else {
    target.inventory = (target.inventory || []).filter((itemId) => itemId !== "ban-hammer");
    target.equipped = (target.equipped || []).filter((itemId) => itemId !== "ban-hammer");
  }
  target.notifications.unshift({
    id: crypto.randomUUID(),
    type: "role_update",
    from: admin.username,
    text: `Your CUBIXIA role is now ${role.toUpperCase()}.`,
    createdAt: new Date().toISOString()
  });
  await writeUsers(users);
  res.json({ user: publicUser(admin, users), target: compactUser(target) });
});

app.post("/api/admin/warn", async (req, res) => {
  const userId = requireSession(req, res);
  if (!userId) return;

  const users = await readUsers();
  const admin = requireSessionUser(users, userId, res);
  if (!admin) return;
  if (!hasOwnerAccess(admin)) return res.status(403).json({ error: "Only owner-level accounts can warn users." });

  const target = findUserByUsername(users, req.body.username);
  if (!target) return res.status(404).json({ error: "No user was found." });
  target.notifications.unshift({
    id: crypto.randomUUID(),
    type: "warning",
    from: admin.username,
    text: `Warning: ${String(req.body.reason || "Please follow the CUBIXIA rules.").slice(0, 160)}`,
    createdAt: new Date().toISOString()
  });
  await writeUsers(users);
  res.json({ user: publicUser(admin, users), target: compactUser(target) });
});

app.use((error, _req, res, _next) => {
  console.error("CUBIXIA API error:", error);
  if (res.headersSent) return;
  res.status(500).json({ error: "CUBIXIA hit a server error. Please try again." });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

ensureStore().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CUBIXIA running on http://localhost:${PORT}`);
    console.log(`LAN/dev access: http://0.0.0.0:${PORT}`);
  });
});
