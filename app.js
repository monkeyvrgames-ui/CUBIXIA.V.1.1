const app = document.querySelector("#app");

let currentUser = null;
let runtime = null;
let THREE_CACHE = null;
let GLTF_TOOLS_CACHE = null;
let AVATAR_RENDER_REGISTRY = new Map();
let CUBIXIA_AVATAR_MODEL = null;
let CUBIXIA_BAN_HAMMER_MODEL = null;
let CUBIXIA_ANGEL_WINGS_MODEL = null;
let CUBIXIA_PREMIUM_HAT_MODEL = null;
let CUBIXIA_CREATOR_CROWN_MODEL = null;
let CUBIXIA_NEON_VISOR_MODEL = null;
let CUBIXIA_BANGS_HAIR_MODEL = null;
let selectedCubbuxPackage = "starter";
let communityState = { groups: [], selectedId: "cubixia-studios", tab: "about" };
let studioGames = [];
let studioProjects = [];
let studioEditor = null;
let lockdownPoll = null;
let userRefreshPoll = null;
let lockdownAudio = null;
let lockdownMuted = localStorage.getItem("cubixiaLockdownMuted") === "true";
let latestStaffLockdownKey = "";

window.addEventListener("pagehide", () => {
  if (runtime?.inGameActive && runtime.gameId) {
    leaveCurrentGameQuietly(runtime.gameId, runtime.gameState || {});
    runtime.inGameActive = false;
  }
});

const DEFAULT_AVATAR_STYLE = {
  skin: "#f0d0a7",
  shirt: "#2268d8",
  pants: "#252b35",
  hair: "#7a4a1d"
};

const AVATAR_ROOT_HEIGHT = 0.8;

const gameCatalog = [
  {
    id: "cubixia-survival",
    title: "Cubixia: Survival",
    genre: "Zombie Survival",
    banner: "survival",
    rating: "96%",
    players: "Live server",
    description: "Spawn in the safe zone, move in 3D, fight zombie waves with a blocky rifle, earn XP and credits, and see other CUBIXIA players in the same server."
  },
  {
    id: "coaster-tycoon",
    title: "Cubixia Coaster Tycoon",
    genre: "Tycoon",
    banner: "tycoon",
    rating: "94%",
    players: "Live server",
    description: "Build a 3D theme park, place rides, set prices, earn money from NPC customers, and keep guest happiness high while friends join your park."
  },
  { id: "gun-game", title: "Gun Game: Neon Yard", genre: "Shooter", banner: "survival", rating: "92%", players: "Live server", description: "A compact neon range with raised firing lanes, pop targets, and weapon pickups." },
  { id: "speed-trials", title: "Speed Trials: Sky Dash", genre: "Obby", banner: "tycoon", rating: "91%", players: "Live server", description: "A bright timed course with checkpoint gates, jump pads, and floating sprint lanes." },
  { id: "gravity-flip", title: "Gravity Flip: Orbit Pads", genre: "Platformer", banner: "survival", rating: "88%", players: "Live server", description: "Leap between floating purple pads, spinning rings, and energy cores in the sky." },
  { id: "base-defense", title: "Base Defense: Night Fort", genre: "Defense", banner: "survival", rating: "93%", players: "Live server", description: "Defend a walled bunker with supply crates, watch towers, barricades, and enemy dummies." },
  { id: "pet-evolution", title: "Pet Evolution: Cube Meadow", genre: "Simulator", banner: "tycoon", rating: "95%", players: "Live server", description: "Collect glowing pet energy around nests, training hoops, and growing cube creatures." },
  { id: "vehicle-builder", title: "Vehicle Builder: Test Track", genre: "Building", banner: "tycoon", rating: "90%", players: "Live server", description: "A garage sandbox with ramps, test loops, scattered car parts, and a block vehicle." },
  { id: "floor-is-lava", title: "Floor Is Lava: Tower Hop", genre: "Survival", banner: "survival", rating: "89%", players: "Live server", description: "Hop across tall platforms while the glowing lava ring claims the ground." },
  { id: "hide-seek", title: "Hide & Seek: Box City", genre: "Party", banner: "tycoon", rating: "87%", players: "Live server", description: "A massive warehouse map packed with cardboard boxes, lockers, shelves, vents, tents, and hiding corners." },
  { id: "fishing-contest", title: "Fishing Contest: Dockside", genre: "Casual", banner: "tycoon", rating: "94%", players: "Live server", description: "A lake map with docks, boats, reeds, fish rings, and chill collectible catches." },
  { id: "treasure-hunt", title: "Treasure Hunt: Ruin Island", genre: "Adventure", banner: "survival", rating: "90%", players: "Live server", description: "Explore ruins, broken pillars, bridges, and dig spots for glowing treasure." },
  { id: "factory-tycoon", title: "Factory Tycoon: Conveyor Works", genre: "Tycoon", banner: "tycoon", rating: "93%", players: "Live server", description: "A factory floor with conveyors, machines, droppers, upgrade buttons, and money cubes." }
];

const communities = [
  ["Survival Squad", "Wave pushing, weapon testing, and safe-zone events."],
  ["Tycoon Builders", "Ride layouts, price experiments, and park showcases."],
  ["Avatar Creators", "Free outfits, launch badges, and CUBIXIA style drops."]
];

const news = [
  ["3D Launch", "Cubixia: Survival and Coaster Tycoon now run as 3D browser games."],
  ["Recovery", "Password recovery can reset an account using the registered Gmail/email."],
  ["Creator Tools", "Tanklyplayz receives CREATOR/OWNER and CUBIXIA badges plus owner-only moderation."]
];

const platformSystems = [
  ["Core Gameplay", ["Emotes wheel", "Sprint stamina", "Crouch / crawl", "Slide", "Vault", "Swim zones", "Climb points", "Weather", "Day/night", "Material footsteps", "Fall damage", "Hotbar", "Backpack", "Crafting", "Skill trees", "Player stats"]],
  ["Social", ["Instant friend join", "Parties", "Voice chat setting", "Trading", "Player shops", "Housing", "Profile banners", "Custom statuses", "Emojis", "Reactions"]],
  ["Economy", ["Daily Cubbits", "Weekly streaks", "Crates", "Shop rotations", "Seasonal items", "Creator items", "Auctions", "Gift cards", "Premium", "Creator payouts"]],
  ["Avatar", ["Expressions", "Emote animations", "Layered clothing", "Color customization", "Animated accessories", "Auras", "Trails", "Pets", "Mounts", "Idle poses", "Scaling", "Skin tones"]],
  ["World", ["Hangout plaza", "Game portals", "Leaderboard statues", "Talking NPCs", "Vendor shops", "Secrets", "Teleport pads", "Cutscenes", "News board", "Event stage", "Seasonal maps"]],
  ["Creator", ["Studio tutorials", "Asset library", "Script shop", "Analytics", "Revenue dashboard", "Creator badges", "Spotlight", "Templates", "Plugins", "Terrain", "Animation", "Particles"]]
];

const extraGameIdeas = [
  ["Battle Royale", "Drop into a shrinking storm arena."],
  ["Team Deathmatch", "Two teams, fast respawns, clean scoreboard."],
  ["Capture the Flag", "Steal the core and bring it home."],
  ["Infection", "Survive while infected players hunt."],
  ["Boss Fights", "Co-op arenas with giant enemies."],
  ["Dungeon Crawler", "Rooms, loot, keys, and party roles."],
  ["Parkour Tower", "Vertical checkpoints and timer medals."],
  ["Murder Mystery", "Detective, mystery role, and social deduction."],
  ["Tower Defense", "Build towers and stop wave paths."],
  ["Sandbox Building", "Open world creative building."]
];

const cubbuxPackages = [
  { id: "creator", amount: 11000, bonus: 1000, price: "$99.99" },
  { id: "universe", amount: 5250, bonus: 750, price: "$49.99" },
  { id: "builder", amount: 1000, bonus: 200, price: "$9.99" },
  { id: "starter", amount: 500, bonus: 100, price: "$4.99" }
];

const itemVisuals = {
  "starter-shirt": { type: "shirt", color: 0x2f5bff, accent: 0xffffff, label: "CX" },
  "cube-cap": { type: "hat", color: 0x36aef3 },
  "premium-hat": { type: "hat", color: 0xd2a34a },
  "tycoon-badge-pin": { type: "pin", color: 0xffcf55 },
  "survivor-vest": { type: "vest", color: 0x182232, accent: 0x44db78 },
  "neon-visor": { type: "visor", color: 0x38aef3 },
  "hair-04": { type: "hair", color: 0x4b2e18 },
  "bangs-hair": { type: "hair", color: 0x2b1a10 },
  "wing-pack": { type: "wings", color: 0xdfeeff },
  "speed-boots": { type: "boots", color: 0x315cff },
  "creator-crown": { type: "crown", color: 0xffd166 },
  "ban-hammer": { type: "hammer", color: 0xff575f }
};

function api(path, options = {}) {
  return fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options
  })
    .catch(() => {
      throw new Error("CUBIXIA server is offline. Restart the server and try again.");
    })
    .then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.lockdown?.active) lockdownScreen(data.lockdown, data.user || currentUser);
      const error = new Error(data.error || data.message || `CUBIXIA request failed (${response.status}).`);
      error.data = data;
      throw error;
    }
    return data;
  });
}

async function loadThree() {
  if (!THREE_CACHE) THREE_CACHE = await import("/vendor/three/three.module.js");
  return THREE_CACHE;
}

async function loadGltfTools() {
  if (!GLTF_TOOLS_CACHE) {
    await loadThree();
    const [{ GLTFLoader }, SkeletonUtils] = await Promise.all([
      import("/vendor/three/addons/loaders/GLTFLoader.js"),
      import("/vendor/three/addons/utils/SkeletonUtils.js")
    ]);
    GLTF_TOOLS_CACHE = { GLTFLoader, SkeletonUtils };
  }
  return GLTF_TOOLS_CACHE;
}

async function loadCubixiaAvatarModel() {
  if (!CUBIXIA_AVATAR_MODEL) {
    CUBIXIA_AVATAR_MODEL = (async () => {
      const { GLTFLoader } = await loadGltfTools();
      const loader = new GLTFLoader();
      return loader.loadAsync("/assets/avatar.glb");
    })();
  }
  return CUBIXIA_AVATAR_MODEL;
}

async function loadCubixiaBanHammerModel() {
  if (!CUBIXIA_BAN_HAMMER_MODEL) {
    CUBIXIA_BAN_HAMMER_MODEL = (async () => {
      const { GLTFLoader } = await loadGltfTools();
      const loader = new GLTFLoader();
      return loader.loadAsync("/assets/ban-hammer.glb");
    })();
  }
  return CUBIXIA_BAN_HAMMER_MODEL;
}

async function loadCubixiaAngelWingsModel() {
  if (!CUBIXIA_ANGEL_WINGS_MODEL) {
    CUBIXIA_ANGEL_WINGS_MODEL = (async () => {
      const { GLTFLoader } = await loadGltfTools();
      const loader = new GLTFLoader();
      return loader.loadAsync("/assets/angel-wings.glb");
    })();
  }
  return CUBIXIA_ANGEL_WINGS_MODEL;
}

async function loadCubixiaPremiumHatModel() {
  if (!CUBIXIA_PREMIUM_HAT_MODEL) {
    CUBIXIA_PREMIUM_HAT_MODEL = (async () => {
      const { GLTFLoader } = await loadGltfTools();
      const loader = new GLTFLoader();
      return loader.loadAsync("/assets/hat-1000.glb");
    })();
  }
  return CUBIXIA_PREMIUM_HAT_MODEL;
}

async function loadCubixiaCreatorCrownModel() {
  if (!CUBIXIA_CREATOR_CROWN_MODEL) {
    CUBIXIA_CREATOR_CROWN_MODEL = (async () => {
      const { GLTFLoader } = await loadGltfTools();
      const loader = new GLTFLoader();
      return loader.loadAsync("/assets/creator-crown.glb");
    })();
  }
  return CUBIXIA_CREATOR_CROWN_MODEL;
}

async function loadCubixiaNeonVisorModel() {
  if (!CUBIXIA_NEON_VISOR_MODEL) {
    CUBIXIA_NEON_VISOR_MODEL = (async () => {
      const { GLTFLoader } = await loadGltfTools();
      const loader = new GLTFLoader();
      return loader.loadAsync("/assets/neon-visor.glb");
    })();
  }
  return CUBIXIA_NEON_VISOR_MODEL;
}

async function loadCubixiaBangsHairModel() {
  if (!CUBIXIA_BANGS_HAIR_MODEL) {
    CUBIXIA_BANGS_HAIR_MODEL = (async () => {
      const { GLTFLoader } = await loadGltfTools();
      const loader = new GLTFLoader();
      return loader.loadAsync("/assets/bangs-hair.glb");
    })();
  }
  return CUBIXIA_BANGS_HAIR_MODEL;
}

function normalizeHexColor(value, fallback) {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}

function normalizeAvatarStyle(style = {}) {
  style = style && typeof style === "object" ? style : {};
  return {
    skin: normalizeHexColor(style.skin, DEFAULT_AVATAR_STYLE.skin),
    shirt: normalizeHexColor(style.shirt, DEFAULT_AVATAR_STYLE.shirt),
    pants: normalizeHexColor(style.pants, DEFAULT_AVATAR_STYLE.pants),
    hair: normalizeHexColor(style.hair, DEFAULT_AVATAR_STYLE.hair)
  };
}

function avatarStyleError(style) {
  const normalized = normalizeAvatarStyle(style);
  const uniqueColors = new Set([normalized.skin, normalized.shirt, normalized.pants, normalized.hair]);
  if (uniqueColors.size < 2) return "Avatar colors cannot all be the same. Pick at least one different color for skin, shirt, pants, or hair.";
  return "";
}

function readAvatarEditorStyle() {
  return normalizeAvatarStyle({
    skin: document.querySelector("#skinColor")?.value,
    shirt: document.querySelector("#shirtColor")?.value,
    pants: document.querySelector("#pantsColor")?.value,
    hair: document.querySelector("#hairColor")?.value
  });
}

function setAvatarEditorError(message) {
  const error = document.querySelector("#avatarColorError");
  const save = document.querySelector("#saveAvatar");
  if (error) error.textContent = message || "";
  if (save) save.disabled = Boolean(message);
  return !message;
}

function nav() {
  const desktopFresh = new URLSearchParams(window.location.search).get("fresh") || "";
  const desktopBuild = desktopFresh.startsWith("desktop-") ? desktopFresh.replace(/^desktop-/, "").split("-").slice(0, 2).join(".") : "";
  return `
    <nav class="nav">
      <button class="brand" data-route="home" type="button"><span class="brand-mark"></span>CUBIXIA</button>
      <a href="#" data-route="home">Home</a>
      <a href="#" data-route="games">Games</a>
      <a href="#" data-route="avatar">Character</a>
      <a href="#" data-route="marketplace">Shop</a>
      <a href="#" data-route="messages">Chat</a>
      <a href="#" data-route="communities">Groups</a>
      <a href="#" data-route="studio">Studio</a>
      <a href="#" data-route="about">About</a>
      <a href="#" data-route="settings">Settings</a>
      ${desktopBuild ? `<span class="desktop-build-pill">Desktop ${escapeHtml(desktopBuild)}</span>` : ""}
      <span class="nav-spacer"></span>
      ${currentUser ? `<button class="wallet-pill" data-route="cubbux">${Number(currentUser.cubbux || 0).toLocaleString()} Cubbits</button>${canModerateUser(currentUser) ? `<button data-route="moderation">${moderationPanelTitle(currentUser)}</button>` : ""}<button class="nav-user" data-route="profile">${avatar(currentUser, "tiny")} ${escapeHtml(currentUser.username)}</button><button class="register-pill" id="logoutBtn">Logout</button>` : `<button data-route="login">Login</button><button class="register-pill" data-route="signup">Register</button>`}
    </nav>
  `;
}

function ensureLegalFooter() {
  let footer = document.querySelector("#cubixiaLegalFooter");
  if (!footer) {
    footer = document.createElement("footer");
    footer.id = "cubixiaLegalFooter";
    footer.className = "legal-footer";
    footer.innerHTML = `
      <a href="/assets/CUBIXIA-PP-TOS-EULA.pdf" target="_blank" rel="noopener">
        Read CUBIXIA Privacy Policy, TOS, & EULA
      </a>
    `;
    document.body.appendChild(footer);
  }
}

function canModerateUser(user) {
  return Boolean(user && (user.isOwner || ["owner", "cofounder", "admin", "mod"].includes(user.role)));
}

function canTimeoutUser(user) {
  return Boolean(user && (user.isOwner || user.role === "owner" || user.role === "cofounder" || user.role === "admin"));
}

function combinedGameCatalog(includeDrafts = false) {
  const drafts = includeDrafts ? studioProjects.filter((game) => !game.published) : [];
  const byId = new Map([...gameCatalog, ...studioGames, ...drafts].map((game) => [game.id, game]));
  return [...byId.values()];
}

function findGame(gameId, includeDrafts = true) {
  return combinedGameCatalog(includeDrafts).find((game) => game.id === gameId) || gameCatalog[0];
}

async function refreshGameCatalog() {
  const data = await api("/api/games").catch(() => ({ creatorGames: [] }));
  (data.games || []).forEach((remote) => {
    const local = gameCatalog.find((game) => game.id === remote.id);
    if (local) Object.assign(local, remote);
  });
  studioGames = (data.creatorGames || []).map((game) => ({ ...game, source: "studio", banner: "studio" }));
  return studioGames;
}

function moderationPanelTitle(user) {
  if (user?.role === "cofounder") return "Co-Founder Moderation";
  if (user?.isOwner || user?.role === "owner") return "Owner Moderation";
  return user?.role === "admin" ? "Admin Panel" : "Moderator Panel";
}

function normalizeClientUser(user) {
  if (!user || typeof user !== "object") return null;
  const lastPlayed = user.lastPlayed && typeof user.lastPlayed === "object" ? user.lastPlayed : {};
  const normalized = {
    ...user,
    username: user.username || "Player",
    avatar: user.avatar || "",
    avatarStyle: normalizeAvatarStyle(user.avatarStyle),
    equipped: Array.isArray(user.equipped) ? user.equipped : [],
    inventory: Array.isArray(user.inventory) ? user.inventory : [],
    badges: Array.isArray(user.badges) ? user.badges : [],
    friends: Array.isArray(user.friends) ? user.friends : [],
    incomingRequests: Array.isArray(user.incomingRequests) ? user.incomingRequests : [],
    outgoingRequests: Array.isArray(user.outgoingRequests) ? user.outgoingRequests : [],
    notifications: Array.isArray(user.notifications) ? user.notifications : [],
    friendProfiles: Array.isArray(user.friendProfiles) ? user.friendProfiles : [],
    progression: user.progression || { level: 1, xp: 0, streak: 0, title: "Explorer" },
    achievements: Array.isArray(user.achievements) ? user.achievements : [],
    settings: user.settings || {},
    gameSettings: user.gameSettings || {},
    items: Array.isArray(user.items) ? user.items : [],
    cubbux: Number(user.cubbux || 0),
    bio: user.bio || "",
    createdAt: user.createdAt || new Date().toISOString(),
    lastOnline: user.lastOnline || "",
    currentGame: user.currentGame || "",
    lastPlayed: {
      id: lastPlayed.id || "cubixia-survival",
      title: lastPlayed.title || "Cubixia: Survival",
      xp: Number(lastPlayed.xp || 0),
      currency: Number(lastPlayed.currency || 0),
      progress: lastPlayed.progress || "Ready to play"
    }
  };
  normalized.friendProfiles = normalized.friendProfiles.map((friend) => normalizeClientUser(friend) || {
    username: "Player",
    avatar: "",
    avatarStyle: DEFAULT_AVATAR_STYLE,
    equipped: [],
    inventory: [],
    badges: [],
    online: false,
    currentGame: ""
  });
  return normalized;
}

function routeUser(data) {
  const normalizedUser = normalizeClientUser(data?.user);
  if (!normalizedUser) throw new Error("CUBIXIA could not load this account profile. Try refreshing and logging in again.");
  data.user = normalizedUser;
  currentUser = normalizedUser;
  applyAppearanceTheme(currentUser);
  startLockdownWatcher();
  startUserRefreshWatcher();
  if (data.staffLockdown?.active) staffLockdownPopup(data.staffLockdown);
  else clearStaffLockdownPopup();
  if (data.lockdown?.active) return lockdownScreen(data.lockdown, currentUser);
  document.body.classList.remove("lockdown-active");
  stopLockdownAudio();
  const moderation = data.moderation || activeClientModeration(normalizedUser);
  if (moderation) return moderationScreen(normalizedUser, moderation);
  return hub(normalizedUser);
}

function startUserRefreshWatcher() {
  if (userRefreshPoll) return;
  userRefreshPoll = setInterval(async () => {
    if (!currentUser || document.hidden || runtime?.inGameActive) return;
    try {
      const before = userRefreshSignature(currentUser);
      const data = await api("/api/me");
      data.user = normalizeClientUser(data.user);
      const after = userRefreshSignature(data.user);
      currentUser = data.user || currentUser;
      if (data.staffLockdown?.active) staffLockdownPopup(data.staffLockdown);
      else clearStaffLockdownPopup();
      if (data.lockdown?.active) return lockdownScreen(data.lockdown, currentUser);
      if (data.moderation) return moderationScreen(data.user, data.moderation);
      if (before !== after && document.querySelector(".gamer-home")) routeUser(data);
    } catch {
      // Keep the current page usable if the server is waking up or temporarily unreachable.
    }
  }, 5000);
}

function userRefreshSignature(user) {
  return JSON.stringify({
    incoming: user?.incomingRequests || [],
    outgoing: user?.outgoingRequests || [],
    friends: user?.friends || [],
    notifications: (user?.notifications || []).map((note) => note.id),
    role: user?.role,
    cubbux: user?.cubbux
  });
}

function startLockdownWatcher() {
  if (lockdownPoll) return;
  lockdownPoll = setInterval(async () => {
    if (!currentUser || document.hidden) return;
    try {
      const data = await api("/api/lockdown");
      if (data.staffLockdown?.active) staffLockdownPopup(data.staffLockdown);
      else clearStaffLockdownPopup();
      if (data.lockdown?.active) lockdownScreen(data.lockdown, currentUser);
      else if (document.body.classList.contains("lockdown-active")) {
        stopLockdownAudio();
        document.body.classList.remove("lockdown-active");
        goHome();
      }
    } catch {}
  }, 3500);
}

function staffLockdownPopup(lockdown) {
  if (!canModerateUser(currentUser) || !lockdown?.active) return;
  const key = `${lockdown.startedAt || ""}:${lockdown.staffMessage || lockdown.reason || ""}`;
  latestStaffLockdownKey = key;
  if (sessionStorage.getItem(`staffLockdownDismissed:${key}`) === "true") return;
  let popup = document.querySelector("#staffLockdownPopup");
  if (!popup) {
    popup = document.createElement("aside");
    popup.id = "staffLockdownPopup";
    popup.className = "staff-lockdown-popup";
    document.body.appendChild(popup);
  }
  popup.innerHTML = `
    <div>
      <span>Owner Lockdown Active</span>
      <button id="dismissStaffLockdown" type="button">Dismiss</button>
    </div>
    <strong>${escapeHtml(lockdown.lockedBy || "Owner")} needs staff help</strong>
    <p>${escapeHtml(lockdown.staffMessage || lockdown.reason || "Stay online, check reports, watch chat, and help investigate.")}</p>
  `;
  popup.classList.add("show");
  popup.querySelector("#dismissStaffLockdown")?.addEventListener("click", () => {
    sessionStorage.setItem(`staffLockdownDismissed:${key}`, "true");
    popup.classList.remove("show");
  });
}

function clearStaffLockdownPopup() {
  latestStaffLockdownKey = "";
  document.querySelector("#staffLockdownPopup")?.remove();
}

function stopLockdownAudio() {
  if (!lockdownAudio) return;
  lockdownAudio.pause();
  lockdownAudio.currentTime = 0;
  lockdownAudio = null;
}

function playLockdownAudio(lockdown) {
  const audioUntil = Number(lockdown.audioUntil || Date.now() + 5 * 60 * 1000);
  if (Date.now() >= audioUntil) return;
  if (lockdownMuted) return;
  if (!lockdownAudio) {
    lockdownAudio = new Audio(lockdown.audio || "/assets/owner-lockdown.mp3");
    lockdownAudio.loop = true;
    lockdownAudio.volume = 0.85;
  }
  const playPromise = lockdownAudio.play();
  playPromise?.catch?.(() => {
    const button = document.querySelector("#enableLockdownAudio");
    if (button) button.hidden = false;
  });
  setTimeout(stopLockdownAudio, Math.max(1000, audioUntil - Date.now()));
}

function lockdownScreen(lockdown, user = currentUser) {
  if (document.body.dataset.lockdownStartedAt === String(lockdown.startedAt || "") && document.body.classList.contains("lockdown-active")) {
    playLockdownAudio(lockdown);
    return;
  }
  stopRuntime();
  currentUser = user || currentUser;
  document.body.classList.add("lockdown-active");
  document.body.dataset.lockdownStartedAt = String(lockdown.startedAt || "");
  const started = new Date(Number(lockdown.startedAt || Date.now())).toLocaleString();
  app.innerHTML = `
    <section class="lockdown-screen">
      <div class="lockdown-alert">
        <span class="lockdown-kicker">CUBIXIA OWNER LOCKDOWN</span>
        <h1>LOCKDOWN</h1>
        <p class="lockdown-subtitle">All active players have been removed from games while the owner handles an emergency platform action.</p>
        <div class="lockdown-reason">
          <strong>Reason</strong>
          <span>${escapeHtml(lockdown.reason || "No reason provided.")}</span>
        </div>
        <div class="lockdown-meta">
          <span>Locked by ${escapeHtml(lockdown.lockedBy || "CUBIXIA")}</span>
          <span>${escapeHtml(started)}</span>
        </div>
        <div class="lockdown-actions">
          <button id="toggleLockdownAudio">${lockdownMuted ? "Unmute Alarm" : "Mute Alarm"}</button>
          <button id="enableLockdownAudio" hidden>Play Lockdown Audio</button>
          ${user?.isOwner ? `<button id="endLockdown" class="lockdown-end">End Lockdown</button>` : ""}
        </div>
      </div>
    </section>
  `;
  playLockdownAudio(lockdown);
  document.querySelector("#toggleLockdownAudio")?.addEventListener("click", (event) => {
    lockdownMuted = !lockdownMuted;
    localStorage.setItem("cubixiaLockdownMuted", String(lockdownMuted));
    event.currentTarget.textContent = lockdownMuted ? "Unmute Alarm" : "Mute Alarm";
    if (lockdownMuted) stopLockdownAudio();
    else playLockdownAudio(lockdown);
  });
  document.querySelector("#enableLockdownAudio")?.addEventListener("click", () => playLockdownAudio(lockdown));
  document.querySelector("#endLockdown")?.addEventListener("click", async () => {
    const data = await api("/api/admin/lockdown", { method: "POST", body: JSON.stringify({ active: false }) });
    currentUser = data.user || currentUser;
    stopLockdownAudio();
    document.body.classList.remove("lockdown-active");
    hub(currentUser);
  });
}

function resolveAppearanceTheme(value = "auto") {
  const theme = ["light", "dark", "auto"].includes(value) ? value : "auto";
  if (theme !== "auto") return theme;
  const hour = new Date().getHours();
  return hour >= 18 || hour < 7 ? "dark" : "light";
}

function applyAppearanceTheme(user = currentUser) {
  const preference = user?.settings?.browser?.theme || "auto";
  const resolved = resolveAppearanceTheme(preference);
  document.body.dataset.theme = resolved;
  document.body.dataset.themePreference = preference;
}

function activeClientModeration(user) {
  if (!user) return null;
  const now = Date.now();
  const notice = user.moderationNotice && !user.moderationNotice.acknowledged ? user.moderationNotice : null;
  if (user.banned) {
    if (user.permanentBan) {
      return {
        action: user.ipBanned ? "ipban" : "ban",
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
      title: until && until > now ? (user.ipBanned ? "IP Banned" : "Banned") : "Ban Finished",
      reason: user.banReason || notice?.reason || (user.ipBanned ? "This device/IP is banned from CUBIXIA." : "Banned by CUBIXIA moderation."),
      moderator: notice?.moderator || "CUBIXIA",
      until,
      canAcknowledge: !until || now >= until,
      remainingMs: Math.max(0, until - now)
    };
  }
  if (notice) {
    const until = Number(notice.until || 0);
    return {
      action: notice.action,
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

function moderationScreen(user, moderation) {
  stopRuntime();
  currentUser = user;
  const remaining = Math.max(0, Number(moderation.remainingMs || (moderation.until ? moderation.until - Date.now() : 0)));
  const action = String(moderation.action || "notice").toLowerCase();
  const actionLabel = moderationActionLabel(action, moderation.title);
  const tone = moderationTone(action);
  const caseId = String(moderation.id || moderation.noticeId || `${action}-${moderation.until || Date.now()}`).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 18).toUpperCase();
  const isLocked = ["ban", "ipban", "timeout"].includes(action) && !moderation.canAcknowledge;
  app.innerHTML = `
    <section class="moderation-screen">
      <div class="moderation-card moderation-${tone}">
        <div class="moderation-brand">
          <span class="brand-mark"></span>
          <strong>CUBIXIA Safety</strong>
        </div>
        <div class="moderation-status">
          <span>${escapeHtml(actionLabel)}</span>
          <small>Case ${escapeHtml(caseId || "CUBIXIA")}</small>
        </div>
        <h1>${escapeHtml(moderation.title || actionLabel)}</h1>
        <p class="moderation-lead">${escapeHtml(moderationLead(action, isLocked))}</p>
        <div class="moderation-box">
          <strong>Reason from staff</strong>
          <span>${escapeHtml(moderation.reason || "No reason provided.")}</span>
        </div>
        <div class="moderation-grid">
          <div><small>Action</small><strong>${escapeHtml(actionLabel)}</strong></div>
          <div><small>Reviewed by</small><strong>${escapeHtml(moderation.moderator || "CUBIXIA Staff")}</strong></div>
          <div><small>Status</small><strong>${moderation.canAcknowledge ? "Ready to acknowledge" : "Still active"}</strong></div>
          ${moderation.until ? `<div><small>Time left</small><strong id="moderationTimer">${formatRemaining(remaining)}</strong></div>` : ""}
        </div>
        <div class="moderation-rules">
          <strong>Before you continue</strong>
          <span>Keep chat respectful, play fair, do not bypass safety systems, and follow the CUBIXIA Privacy Policy, TOS, & EULA.</span>
        </div>
        <div class="moderation-actions">
          <button id="ackModeration" ${moderation.canAcknowledge ? "" : "disabled"}>${moderation.canAcknowledge ? "I Understand" : "Available When Timer Ends"}</button>
          <button id="logoutModeration" class="ghost-btn">Logout</button>
        </div>
        <div class="message" id="moderationAckMessage"></div>
      </div>
    </section>
  `;
  const ackButton = document.querySelector("#ackModeration");
  if (!moderation.canAcknowledge && moderation.until) {
    const timer = setInterval(() => {
      const left = Math.max(0, moderation.until - Date.now());
      const label = document.querySelector("#moderationTimer");
      if (label) label.textContent = formatRemaining(left);
      if (left <= 0) {
        clearInterval(timer);
        ackButton.disabled = false;
        ackButton.textContent = "I Understand";
      }
    }, 1000);
  }
  ackButton.addEventListener("click", async () => {
    const message = document.querySelector("#moderationAckMessage");
    try {
      const data = await api("/api/moderation/ack", { method: "POST", body: JSON.stringify({}) });
      routeUser(data);
    } catch (error) {
      if (error.data?.moderation) return moderationScreen(user, error.data.moderation);
      message.textContent = error.message;
    }
  });
  document.querySelector("#logoutModeration").addEventListener("click", async () => {
    await api("/api/logout", { method: "POST" }).catch(() => {});
    guestHome();
  });
}

function moderationActionLabel(action, fallback = "") {
  const labels = {
    warning: "Account Warning",
    kick: "Removed From Game",
    ban: "Account Ban",
    ipban: "Device / IP Ban",
    timeout: "Account Timeout",
    mute: "Chat Mute",
    shadowmute: "Chat Safety Restriction"
  };
  return labels[action] || fallback || "Moderation Notice";
}

function moderationTone(action) {
  if (["ban", "ipban"].includes(action)) return "critical";
  if (["timeout", "kick"].includes(action)) return "serious";
  if (["warning", "mute", "shadowmute"].includes(action)) return "warning";
  return "notice";
}

function moderationLead(action, locked) {
  if (action === "warning") return "This is a warning from CUBIXIA staff. Read the reason and acknowledge it before continuing.";
  if (action === "kick") return "You were removed from a game session. You can continue after acknowledging this notice.";
  if (action === "timeout") return locked ? "This account is temporarily paused from CUBIXIA activity until the timer ends." : "The timeout has ended. Acknowledge the notice to return.";
  if (action === "ipban") return locked ? "This device or network is restricted from CUBIXIA until this action ends." : "The device restriction timer has ended. Acknowledge the notice to continue.";
  if (action === "ban") return locked ? "This account is currently banned from CUBIXIA until the timer ends or staff reviews it." : "The ban timer has ended. Acknowledge the notice to continue.";
  if (action === "mute" || action === "shadowmute") return "Your chat access was restricted by CUBIXIA staff. Keep communication respectful.";
  return "CUBIXIA staff reviewed recent account activity and left this notice.";
}

function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [days ? `${days}d` : "", hours ? `${hours}h` : "", minutes ? `${minutes}m` : "", `${seconds}s`].filter(Boolean).join(" ");
}

function durationOptions(selected = "days") {
  return ["seconds", "minutes", "hours", "days", "weeks", "months", "years", "permanent"]
    .map((unit) => `<option value="${unit}" ${unit === selected ? "selected" : ""}>${unit}</option>`)
    .join("");
}

function guestHome() {
  currentUser = null;
  stopRuntime();
  applyAppearanceTheme(null);
  app.innerHTML = `
    <section class="hero">
      <div class="world-scene"></div>
      ${nav()}
      <div class="home-grid">
        <div class="home-copy">
          <h1>CUBIXIA is your custom digital universe.</h1>
          <p>Register, recover your account with Gmail, customize your avatar, browse games, chat, join friends, and play 3D worlds from the same profile.</p>
          <div class="actions">
            <button class="outline-btn" data-route="signup">Create Account</button>
            <button class="outline-btn blue" data-route="games">Browse Games</button>
          </div>
        </div>
        ${quickRegisterCard()}
      </div>
    </section>
  `;
  bindRoutes();
  bindQuickRegister();
}

function quickRegisterCard() {
  return `
    <form class="auth-card" id="quickRegister">
      <h2>Join CUBIXIA</h2>
      <p>One account for games, friends, avatar, and chat.</p>
      <label class="input-row"><span>@</span><input name="username" autocomplete="username" placeholder="Username" required /></label>
      <button class="primary-btn green" type="submit">Start</button>
      <div class="linkline">Already have an account? <button type="button" data-route="login">Login</button></div>
      <div class="linkline"><button type="button" data-route="recover">Forgot Password or Username?</button></div>
      <div class="message" id="message"></div>
    </form>
  `;
}

function signup(seedName = "") {
  stopRuntime();
  app.innerHTML = `
    <section class="hero signup-page cubixia-entry">
      <div class="coaster-scene"></div>
      ${nav()}
      <div class="signup-layout">
        ${cubixiaLoginTheme("Create your player", "Ride into CUBIXIA with a free launch outfit, your own character, and games built for friends.")}
        <form class="auth-card" id="signupForm">
          <h2>Create your CUBIXIA account</h2>
          <p>Your character, friends, Cubbits, and game progress stay with you.</p>
          <div class="avatar-picker">
            <div id="avatarPreview" class="avatar avatar-md">C</div>
            <label class="file-btn">Upload picture<input id="avatarInput" type="file" accept="image/*" /></label>
          </div>
          <label class="input-row"><span>@</span><input name="username" value="${escapeHtml(seedName)}" autocomplete="username" placeholder="Username" required /></label>
          <label class="input-row"><span>#</span><input name="email" type="email" autocomplete="email" placeholder="Gmail or email" required /></label>
          <label class="input-row password-row"><span>*</span><input name="password" type="password" autocomplete="new-password" placeholder="Password" minlength="6" required /><button type="button" data-toggle-password>Show</button></label>
          <div class="date-row">
            <label class="input-row"><select name="birthMonth" required>${option("Month", ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}</select></label>
            <label class="input-row"><select name="birthDay" required>${option("Day", Array.from({ length: 31 }, (_, i) => String(i + 1)))}</select></label>
            <label class="input-row"><select name="birthYear" required>${option("Year", Array.from({ length: 70 }, (_, i) => String(new Date().getFullYear() - 5 - i)))}</select></label>
          </div>
          <button class="primary-btn" type="submit">Sign up</button>
          <div class="linkline">Already have an account? <button type="button" data-route="login">Login</button></div>
          <div class="message" id="message"></div>
        </form>
      </div>
    </section>
  `;
  bindRoutes();
  bindAvatarPicker();
  bindPasswordToggles();
  renderCubixiaCoasterThemes();
  document.querySelector("#signupForm").addEventListener("submit", register);
}

function login() {
  stopRuntime();
  app.innerHTML = `
    <section class="hero signup-page cubixia-entry">
      <div class="coaster-scene"></div>
      ${nav()}
      <div class="signup-layout">
        ${cubixiaLoginTheme("Welcome back", "Jump back into your games, friends, character, groups, and CUBIXIA Studio projects.")}
        <form class="auth-card" id="loginForm">
          <h2>Login to CUBIXIA</h2>
          <p>Your friends, progress, character, and chat are waiting.</p>
          <label class="input-row"><span>@</span><input name="username" autocomplete="username" placeholder="Username" required /></label>
          <label class="input-row password-row"><span>*</span><input name="password" type="password" autocomplete="current-password" placeholder="Password" required /><button type="button" data-toggle-password>Show</button></label>
          <button class="primary-btn" type="submit">Login</button>
          <div class="linkline"><button type="button" data-route="recover">Forgot Password or Username?</button></div>
          <div class="divider"></div>
          <div class="linkline">Need an account? <button type="button" data-route="signup">Register</button></div>
          <div class="message" id="message"></div>
        </form>
      </div>
    </section>
  `;
  bindRoutes();
  bindPasswordToggles();
  renderCubixiaCoasterThemes();
  document.querySelector("#loginForm").addEventListener("submit", doLogin);
}

function cubixiaLoginTheme(title, body) {
  return `
    <aside class="cubixia-auth-theme" aria-label="CUBIXIA coaster theme">
      <div class="auth-logo-row"><span class="brand-mark"></span><strong>CUBIXIA</strong></div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(body)}</p>
      <div class="coaster-card coaster-card-3d" data-coaster-3d aria-label="3D CUBIXIA coaster scene"></div>
      <div class="auth-feature-row">
        <span>3D Games</span>
        <span>Friends</span>
        <span>Character</span>
        <span>Studio</span>
      </div>
    </aside>
  `;
}

async function renderCubixiaCoasterThemes() {
  const mounts = [...document.querySelectorAll("[data-coaster-3d]")].filter((mount) => mount.dataset.rendered3d !== "true");
  if (!mounts.length) return;
  const THREE = await loadThree();
  mounts.forEach((mount) => {
    mount.dataset.rendered3d = "true";
    const width = Math.max(360, mount.clientWidth || 720);
    const height = Math.max(220, mount.clientHeight || 360);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09243a);
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(4.6, 3.6, 7.4);
    camera.lookAt(0, 0.65, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x203246, 2.4));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(3, 5, 4);
    scene.add(sun);

    const ground = new THREE.Mesh(new THREE.BoxGeometry(12, 0.18, 5.8), new THREE.MeshStandardMaterial({ color: 0x2eb77b, roughness: 0.78 }));
    ground.position.y = -0.1;
    scene.add(ground);
    for (let i = 0; i < 7; i++) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.5 + (i % 3) * 0.18, 1.5 + (i % 4) * 0.45, 0.5), new THREE.MeshStandardMaterial({ color: [0x31506a, 0x486278, 0x22394e][i % 3], roughness: 0.7 }));
      tower.position.set(-4.8 + i * 1.55, tower.geometry.parameters.height / 2, -2.4);
      scene.add(tower);
    }

    const railMat = new THREE.MeshStandardMaterial({ color: 0xd8f2ff, roughness: 0.38, metalness: 0.2 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.42, metalness: 0.16 });
    const supportMat = new THREE.MeshStandardMaterial({ color: 0x9ed0e7, roughness: 0.48, metalness: 0.12 });
    const curveA = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-5, 1.0, 0.9),
      new THREE.Vector3(-3.2, 2.1, 0.55),
      new THREE.Vector3(-.7, 2.55, 0.15),
      new THREE.Vector3(2.0, 2.25, -0.2),
      new THREE.Vector3(4.8, 1.45, -0.35)
    ]);
    const curveB = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.7, .85, 1.35),
      new THREE.Vector3(-2.3, 1.35, 1.0),
      new THREE.Vector3(0.6, 1.25, 0.55),
      new THREE.Vector3(3.7, .75, 0.25)
    ]);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curveA, 72, 0.045, 10), railMat));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curveB, 72, 0.045, 10), goldMat));
    [-3.8, -1.5, 1.7, 3.7].forEach((x, i) => {
      const support = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 2.2 - i * 0.22, 8), supportMat);
      support.position.set(x, .85, i % 2 ? .18 : .72);
      support.rotation.z = i % 2 ? -0.2 : 0.24;
      scene.add(support);
    });

    const cart = new THREE.Group();
    const carBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.7), new THREE.MeshStandardMaterial({ color: 0xff6b5f, roughness: 0.38, metalness: 0.08 }));
    const carSeat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 0.55), new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.5 }));
    carSeat.position.y = 0.28;
    cart.add(carBody, carSeat);
    [-0.42, 0.42].forEach((x) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.11, 16), new THREE.MeshStandardMaterial({ color: 0x111820, roughness: 0.55 }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, -0.28, 0.38);
      cart.add(wheel);
    });
    const demoUser = currentUser
      ? { ...currentUser, avatarStyle: currentUser.avatarStyle || DEFAULT_AVATAR_STYLE, equippedItems: ["starter-shirt", "cube-cap"] }
      : { username: "Rider", avatarStyle: DEFAULT_AVATAR_STYLE, equippedItems: ["starter-shirt", "cube-cap"], badges: [] };
    const rider = createAvatarMesh(THREE, demoUser, true);
    rider.scale.setScalar(0.58);
    rider.position.set(0, 0.05, -0.02);
    rider.rotation.y = Math.PI;
    const rightArm = rider.userData.parts?.rightArm;
    const leftArm = rider.userData.parts?.leftArm;
    if (rightArm) rightArm.rotation.z = -1.05;
    if (leftArm) leftArm.rotation.z = 0.72;
    cart.add(rider);
    cart.position.set(0.3, 1.52, 0.48);
    cart.rotation.set(-0.05, -0.28, -0.18);
    scene.add(cart);

    let frame = 0;
    function animate() {
      if (!document.body.contains(mount)) return;
      frame += 0.016;
      cart.position.y = 1.52 + Math.sin(frame * 2.2) * 0.07;
      cart.rotation.z = -0.18 + Math.sin(frame * 1.8) * 0.035;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();
  });
}

function twoStepLogin(challenge = {}) {
  currentUser = null;
  stopRuntime();
  app.innerHTML = `
    <section class="hero recovery-page">
      ${nav()}
      <div class="center-card">
        <form class="recovery-card two-step-card" id="twoStepLoginForm">
          <h1>2-Step Verification</h1>
          <p>Enter the security code sent to ${escapeHtml(challenge.maskedEmail || "your Gmail/email")} to finish logging in.</p>
          <label>Security Code</label>
          <input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="6 digit code" required />
          <label class="remember-device"><input name="rememberDevice" type="checkbox" /> Remember this device for 30 days</label>
          <div class="two-step-actions">
            <button class="primary-btn" type="submit">Verify and Login</button>
            <button class="ghost-btn" type="button" id="resendTwoStep">Resend Code</button>
            <button class="ghost-btn" type="button" data-route="login">Use Different Account</button>
          </div>
          <div class="message" id="message">${escapeHtml(challenge.message || "")}</div>
        </form>
      </div>
    </section>
  `;
  bindRoutes();
  bindTwoStepLogin();
}

function recover() {
  stopRuntime();
  app.innerHTML = `
    <section class="hero recovery-page">
      ${nav()}
      <div class="center-card">
        <form class="recovery-card" id="recoverStart">
          <h1>CUBIXIA Account Recovery</h1>
          <label>Username/Gmail/Email</label>
          <input name="identity" placeholder="Enter your username or Gmail" required />
          <button class="primary-btn" type="submit">Next</button>
          <div class="message" id="message"></div>
        </form>
        <form class="recovery-card hidden" id="recoverFinish">
          <h1>Set a New Password</h1>
          <label>Recovery Code</label>
          <input name="code" placeholder="6 digit code" required />
          <label>New Password</label>
          <div class="plain-password-wrap"><input name="newPassword" type="password" placeholder="New password" minlength="6" required /><button type="button" data-toggle-password>Show</button></div>
          <button class="primary-btn" type="submit">Change Password</button>
          <div class="message" id="finishMessage"></div>
        </form>
      </div>
    </section>
  `;
  bindRoutes();
  bindRecovery();
  bindPasswordToggles();
}

function hub(user) {
  user = normalizeClientUser(user);
  if (!user) return login();
  currentUser = user;
  stopRuntime();
  const greeting = timeGreeting();
  const catalog = combinedGameCatalog();
  app.innerHTML = `
    <section class="dashboard">
      ${nav()}
      <div class="shell gamer-home">
        ${sideRail()}
        <main class="main-feed">
          ${worldwideModeBanner()}
          <header class="gamer-hero">
            <div class="gamer-hero-copy">
              <span class="eyebrow">Ready to play</span>
              <h1>${greeting}, ${escapeHtml(user.username)}</h1>
              <p>Jump straight into your last game, check who is online, and keep your CUBIXIA streak moving.</p>
              <div class="gamer-actions">
                <button class="primary-btn" data-play="${escapeHtml(user.lastPlayed.id || "cubixia-survival")}">Play Last Game</button>
                <button class="outline-dark" data-route="games">Browse Games</button>
              </div>
              <div class="badge-row left">${user.badges.map((badge) => `<span>${escapeHtml(badge)}</span>`).join("")}</div>
            </div>
            <button class="gamer-continue" data-play="${escapeHtml(user.lastPlayed.id || "cubixia-survival")}">
              <div class="game-thumb ${escapeHtml(user.lastPlayed.id || "cubixia-survival")}"><span>${escapeHtml(user.lastPlayed.title)}</span></div>
              <div>
                <strong>Continue Playing</strong>
                <h2>${escapeHtml(user.lastPlayed.title)}</h2>
                <p>XP ${Number(user.lastPlayed.xp || 0)} | Cubbits ${Number(user.lastPlayed.currency || 0)} | ${escapeHtml(user.lastPlayed.progress)}</p>
              </div>
            </button>
            <aside class="player-card-3d">
              ${avatar(user, "large")}
              <div>
                <strong>${escapeHtml(user.username)}</strong>
                <span>${Number(user.cubbux || 0).toLocaleString()} Cubbits</span>
              </div>
            </aside>
          </header>

          <div class="gamer-dashboard-grid">
            <section class="panel gamer-games-panel">
              <div class="section-head"><h2>Recommended Games</h2><span>${catalog.length} playable games</span></div>
              <div class="game-strip">${catalog.map(gameTile).join("")}</div>
            </section>

            <aside class="gamer-side-stack">
              <section class="panel player-level-card">
                <div class="section-head"><h2>Player Level</h2><span>${Number(user.progression?.xp || 0).toLocaleString()} XP</span></div>
                <strong>Level ${Number(user.progression?.level || 1)}</strong>
                <div class="level-bar"><i style="width:${levelProgress(user)}%"></i></div>
                <p>Level up to earn 2 Cubbits. Daily rewards and streaks are ready.</p>
                <div class="mini-actions">
                  <button id="claimDailyReward" type="button">Claim Daily</button>
                  <button data-route="systems" type="button">Systems</button>
                </div>
              </section>

              <section class="panel">
                <div class="section-head"><h2>Find Players</h2><span>username search</span></div>
                <div class="search-bar compact">
                  <input id="globalSearch" placeholder="Search CUBIXIA users" />
                  <button id="searchBtn">Search</button>
                </div>
              </section>

              <section class="panel">
                <div class="section-head"><h2>Friends</h2><span>green means joinable</span></div>
                <div class="friend-row vertical">
                  <button class="friend-card add-friend" id="openSearch"><span class="friend-face">+</span><span>Add Friends</span></button>
                  ${user.friendProfiles.slice(0, 6).map(friendCard).join("") || `<p class="empty">Search for a username to start your friends list.</p>`}
                </div>
              </section>

              <section class="panel">
                <div class="section-head notification-head">
                  <div><h2>Notifications</h2><span>${notificationSummary(user)}</span></div>
                  ${user.notifications.some((note) => note.type !== "friend_request") ? `<button class="small-action" id="clearNotifications" type="button">Clear</button>` : ""}
                </div>
                <div class="notice-list">${notificationList(user)}</div>
              </section>
            </aside>
          </div>

          <section class="panel gamer-news-panel">
            <div class="section-head"><h2>CUBIXIA News</h2><span>home page messages</span></div>
            <div class="news-grid">${news.map(([title, body]) => `<article><h3>${title}</h3><p>${body}</p></article>`).join("")}</div>
          </section>
        </main>
      </div>
    </section>
  `;
  bindRoutes();
  bindSessionButtons();
  bindSocial();
  bindPlayButtons();
  bindNotificationActions();
  bindRewardButtons();
  document.querySelector("#searchBtn").addEventListener("click", () => showFriendSearch(document.querySelector("#globalSearch").value));
}

function worldwideModeBanner() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("desktop") !== "1") return "";
  if (params.get("shared") === "1") {
    return `
      <section class="worldwide-mode-banner connected">
        <strong>Worldwide Mode Connected</strong>
        <span>Friend search, requests, roles, staff commands, and admin panels use the shared CUBIXIA server.</span>
      </section>
    `;
  }
  if (params.get("host") === "1") {
    return `
      <section class="worldwide-mode-banner connected">
        <strong>CUBIXIA Host Mode</strong>
        <span>This computer is running the shared CUBIXIA server. Friends can join through your VPN/tunnel IP and port.</span>
      </section>
    `;
  }
  if (params.get("local") === "1") return "";
  return `
    <section class="worldwide-mode-banner local">
      <strong>Private Local Mode</strong>
      <span>This EXE is using private accounts on this computer. To add players across your state, put <code>cubixia-server.json</code> beside the EXE with your shared CUBIXIA server URL.</span>
    </section>
  `;
}

function levelProgress(user) {
  const xp = Number(user.progression?.xp || 0);
  const level = Math.max(1, Number(user.progression?.level || 1));
  const currentBase = (level - 1) * 100;
  return clamp(((xp - currentBase) / 100) * 100, 0, 100);
}

function gamesPage() {
  stopRuntime();
  const catalog = combinedGameCatalog();
  app.innerHTML = `
    <section class="dashboard">
      ${nav()}
      <div class="shell">
        ${sideRail()}
        <main class="main-feed">
          <div class="section-head"><h1>Games</h1><span>original CUBIXIA creations</span></div>
          <div class="charts-filters">
            <button>Desktop</button><button>My Region</button><button>Trending</button>
          </div>
          <h2>Trending Games</h2>
          <div class="game-grid">${catalog.map(gameTile).join("")}</div>
        </main>
      </div>
    </section>
  `;
  bindRoutes();
  bindSessionButtons();
  bindPlayButtons();
  enhance3DPreviews();
}

function systemsPage(user) {
  currentUser = user;
  stopRuntime();
  app.innerHTML = `
    <section class="dashboard">
      ${nav()}
      <div class="shell">
        ${sideRail()}
        <main class="main-feed systems-page">
          <header class="systems-hero panel">
            <div>
              <span class="eyebrow">CUBIXIA systems</span>
              <h1>Everything players use to play, build, trade, and hang out.</h1>
              <p>These are the live and ready-to-expand systems across CUBIXIA. Use the buttons to test rewards, crates, parties, and player tools.</p>
            </div>
            <div class="systems-quick">
              <button id="claimDailyReward" type="button">Claim Daily Cubbits</button>
              <button id="openCrate" type="button">Open Free Crate</button>
              <button id="createParty" type="button">Create Party</button>
            </div>
          </header>
          <section class="systems-grid">
            ${platformSystems.map(([title, items]) => `
              <article class="system-card">
                <h2>${escapeHtml(title)}</h2>
                <div class="system-pill-grid">${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
              </article>
            `).join("")}
          </section>
          <section class="panel">
            <div class="section-head"><h2>More Game Modes</h2><span>planned as unique 3D worlds</span></div>
            <div class="mode-grid">${extraGameIdeas.map(([title, body]) => `<article><strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span><button data-create-game="${escapeHtml(title)}">Add Concept</button></article>`).join("")}</div>
          </section>
          <section class="panel">
            <div class="section-head"><h2>Quality & Safety</h2><span>player friendly controls</span></div>
            <div class="system-pill-grid">
              ${["FPS counter", "Ping display", "Graphics settings", "Motion blur toggle", "FOV slider", "Colorblind mode", "Accessibility", "Keybinds", "Auto-save", "Cloud saves", "Server browser", "Region selection", "Auto-mod", "Anti-exploit", "Report menu", "Reputation", "Shadow mute", "Chat bans", "Staff logs"].map((item) => `<span>${item}</span>`).join("")}
            </div>
          </section>
        </main>
      </div>
    </section>
  `;
  bindRoutes();
  bindSessionButtons();
  bindRewardButtons();
  document.querySelectorAll("[data-create-game]").forEach((button) => {
    button.addEventListener("click", () => {
      alert(`${button.dataset.createGame} was added to your creator idea board.`);
    });
  });
}

function aboutPage() {
  stopRuntime();
  const aboutSections = [
    ["The Idea", "Cubixia began as a question: what if a digital world could feel alive? The platform is built around worlds that remember the player, respond to them, and connect games, identity, friends, groups, and progress into one universe."],
    ["Cubixia Studios", "Cubixia Studios is the creative force behind the platform. Founded by Tanklyplayz, the studio focuses on purposeful design, connected systems, world-building, game design, avatar creation, economy balance, social features, and platform engineering."],
    ["Player Identity", "Your profile is a living record of your journey: badges earned, games played, friends added, groups joined, items collected, and milestones reached. Your avatar appears across games, profiles, friend lists, groups, and social spaces."],
    ["Avatars", "Avatars are designed to be expressive and alive, supporting clothing, accessories, faces, animations, effects, pets, mounts, trails, color customization, and layered style choices that follow the player everywhere."],
    ["CUBBITS", "CUBBITS are the official CUBIXIA currency. Players can earn them through gameplay, events, challenges, achievements, and rewards, or purchase them. Creators can earn CUBBITS through their games as the creator economy grows."],
    ["Groups", "Groups let players build communities with logos, ranks, roles, announcements, events, recruiting, and identity. Cubixia Studios is the official group owned by Tanklyplayz and acts as the central pillar of the platform."],
    ["Social World", "Cubixia supports friends, messages, parties, trading, quick joining, in-game chat, chat bubbles, notifications, reports, and safety filters so the platform feels like a living social space, not just a game launcher."],
    ["Moderation", "Moderation is built around clear authority and transparency. Owner, admin, and moderator tools support warnings, kicks, bans, appeals, safe chat, reports, staff logs, and special staff items like the Ban Hammer."],
    ["Games", "Every CUBIXIA game is meant to feel like its own world: shooters, bounty hunts, arena waves, power-up chaos, runners, wall-run arenas, gravity games, horror, base defense, lab escapes, tycoons, pets, vehicles, party games, fishing, treasure, and more."],
    ["Cubixia Studio", "Cubixia Studio gives creators visual tools, scripting, assets, physics, animations, multiplayer systems, publishing, analytics, and CUBBITS earning tools so players can build the next worlds inside the platform."],
    ["The Future", "Cubixia will grow with seasonal events, limited items, global challenges, creator programs, new games, new tools, and carefully chosen staff teams. Staff roles are earned through trust, consistency, and past behavior."]
  ];
  app.innerHTML = `
    <section class="dashboard">
      ${nav()}
      <div class="shell">
        ${currentUser ? sideRail() : ""}
        <main class="main-feed about-page">
          <header class="about-hero panel">
            <span class="eyebrow">CUBIXIA universe</span>
            <h1>A living platform for players, creators, friends, and worlds.</h1>
            <p>CUBIXIA is designed to remember who you are, celebrate what you build, and connect every game, avatar, group, message, and achievement into one shared digital universe.</p>
            <div class="about-actions">
              <button class="primary-btn" data-route="games">Play Games</button>
              <button class="outline-dark" data-route="studio">Open Studio</button>
            </div>
          </header>
          <section class="about-grid">
            ${aboutSections.map(([title, body]) => `<article><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></article>`).join("")}
          </section>
          <section class="panel about-games">
            <div class="section-head"><h2>Game Worlds</h2><span>different ideas, one universe</span></div>
            <div class="system-pill-grid">
              ${["Gun Game", "Bounty Hunters", "Arena Waves", "Power-Up Chaos", "Infinite Runner", "Wall-Run Arena", "Speed Trials", "Gravity Flip", "Night Creatures", "Base Defense", "Escape the Lab", "Factory Tycoon", "Pet Evolution", "Vehicle Builder", "Hide & Seek", "Fishing Contest", "Treasure Hunt"].map((item) => `<span>${item}</span>`).join("")}
            </div>
          </section>
        </main>
      </div>
    </section>
  `;
  bindRoutes();
  bindSessionButtons();
}

function gameDetail(gameId) {
  const game = findGame(gameId);
  const catalog = combinedGameCatalog();
  const interactions = currentUser?.gameInteractions?.[game.id] || {};
  const reactions = game.reactions || { likes: 0, dislikes: 0, favorites: 0, notifies: 0 };
  stopRuntime();
  app.innerHTML = `
    <section class="dashboard">
      ${nav()}
      <div class="game-detail">
        <div class="game-hero ${game.id}"><span>${escapeHtml(game.title)}</span></div>
        <div class="game-info">
          <h1>${escapeHtml(game.title)}</h1>
          <p>By ${escapeHtml(game.creator || "CUBIXIA Studios")}</p>
          <p>Rating: ${escapeHtml(game.maturity || "Mild")} | Played 1 hr 11 mins</p>
          <button class="play-big" data-play="${game.id}" ${game.deleted ? "disabled" : ""}>${game.deleted ? "Unavailable" : "Play"}</button>
          <div class="game-actions">
            <button type="button" data-game-action="favorite" class="${interactions.favorite ? "active" : ""}" ${game.deleted ? "disabled" : ""}>${interactions.favorite ? "Favorited" : "Favorite"} (${Number(reactions.favorites || 0).toLocaleString()})</button>
            <button type="button" data-game-action="notify" class="${interactions.notify ? "active" : ""}" ${game.deleted ? "disabled" : ""}>${interactions.notify ? "Updates On" : "Notify"} (${Number(reactions.notifies || 0).toLocaleString()})</button>
            <button type="button" data-game-action="like" class="${interactions.vote === "like" ? "active" : ""}" ${game.deleted ? "disabled" : ""}>Like (${Number(reactions.likes || 0).toLocaleString()})</button>
            <button type="button" data-game-action="dislike" class="${interactions.vote === "dislike" ? "active" : ""}" ${game.deleted ? "disabled" : ""}>Dislike (${Number(reactions.dislikes || 0).toLocaleString()})</button>
          </div>
        </div>
        <section class="panel detail-about">
          <div class="tabs"><button class="active">About</button><button>Shop</button><button>Servers</button></div>
          <h2>Events</h2>
          <div class="event-row">
            <article><strong>New update</strong><span>Today</span></article>
            <article><strong>Double Cubbits weekend</strong><span>Upcoming</span></article>
            <article><strong>Creator challenge</strong><span>Live</span></article>
          </div>
          <h2>Description</h2>
          <p>${escapeHtml(game.description)}</p>
          <div class="stats-strip">
            <span><strong>${game.rating}</strong> Rating</span>
            <span><strong>12</strong> Server Size</span>
            <span><strong>${escapeHtml(game.genre)}</strong> Genre</span>
            <span><strong>Live</strong> Voice Chat</span>
          </div>
          <h2>Badges</h2>
          <div class="badge-cards">
            <article><b>Welcome</b><span>Joined for the first time</span></article>
            <article><b>Survivor</b><span>Reached a milestone</span></article>
            <article><b>Builder</b><span>Created something new</span></article>
          </div>
          <h2>Similar Games</h2>
          <div class="game-strip">${catalog.filter((entry) => entry.id !== game.id).map(gameTile).join("")}</div>
        </section>
      </div>
    </section>
  `;
  bindRoutes();
  bindSessionButtons();
  bindPlayButtons();
  bindGameDetailActions(game.id);
}

function profile(user) {
  user = normalizeClientUser(user);
  if (!user) return login();
  currentUser = user;
  stopRuntime();
  app.innerHTML = `
    <section class="dashboard">
      ${nav()}
      <div class="profile-layout">
        <section class="panel profile-card">
          ${avatar(user, "large")}
          <h1>${escapeHtml(user.username)}</h1>
          <p>@${escapeHtml(user.username)}</p>
          <p>Joined ${new Date(user.createdAt).toLocaleDateString()}</p>
          <div class="badge-row">${user.badges.map((badge) => `<span>${escapeHtml(badge)}</span>`).join("")}</div>
          ${user.isOwner ? `<button class="danger-lite" id="openBan">Quick Ban Tool</button><button class="primary-btn owner-panel-btn" data-route="owner">Owner Panel</button>` : ""}
          ${canModerateUser(user) ? `<button class="primary-btn owner-panel-btn" data-route="moderation">${moderationPanelTitle(user)}</button>` : ""}
        </section>
        <section class="panel">
          <div class="section-head"><h2>Edit Profile</h2><span>used everywhere</span></div>
          <form id="profileForm">
            <div class="avatar-picker left">
              <div id="avatarPreview" class="avatar avatar-md">${avatarInner(user)}</div>
              <label class="file-btn">Change picture<input id="avatarInput" type="file" accept="image/*" /></label>
            </div>
            <label class="input-row"><span>Bio</span><input name="bio" value="${escapeHtml(user.bio)}" maxlength="160" /></label>
            <button class="primary-btn" type="submit">Save profile</button>
            <div class="message" id="message"></div>
          </form>
          <div class="divider"></div>
          <h2>Achievements</h2>
          <div class="badge-row left">${user.achievements.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
        </section>
      </div>
    </section>
  `;
  bindRoutes();
  bindSessionButtons();
  bindAvatarPicker(user.avatar);
  enhance3DPreviews();
  document.querySelector("#profileForm").addEventListener("submit", saveProfile);
  document.querySelector("#openBan")?.addEventListener("click", showBanModal);
}

function contentModerationMarkup(user) {
  if (!canModerateUser(user)) return "";
  return `
    <section class="panel moderation-extra">
      <div class="section-head"><h2>Content Controls</h2><span>games and clothing</span></div>
      <div class="content-tools">
        <form id="contentDeleteForm">
          <h3>Delete Content</h3>
          <select name="type"><option value="games">Game</option><option value="items">Clothing / Item</option></select>
          <input name="id" placeholder="Game or item id" required />
          <input name="reason" placeholder="Reason" value="Deleted by CUBIXIA moderation." />
          <button class="danger">Delete</button>
        </form>
        ${canTimeoutUser(user) ? `
          <form id="contentRestoreForm">
            <h3>Un-delete Content</h3>
            <select name="type"><option value="games">Game</option><option value="items">Clothing / Item</option></select>
            <input name="id" placeholder="Deleted game or item id" required />
            <button class="primary-btn">Un-delete</button>
          </form>
        ` : ""}
      </div>
      <div id="contentModerationList" class="content-moderation-list"><p class="empty">Loading content...</p></div>
      <div class="message" id="contentModerationMessage"></div>
    </section>
  `;
}

function followModerationMarkup(user) {
  if (!canTimeoutUser(user)) return "";
  return `
    <section class="panel moderation-extra">
      <div class="section-head"><h2>Admin Follow</h2><span>admins and owner</span></div>
      <form id="adminFollowForm" class="inline-admin-form">
        <input name="username" placeholder="Username to follow" required />
        <button class="primary-btn">Follow Player</button>
      </form>
      <div class="message" id="adminFollowMessage"></div>
    </section>
  `;
}

function chatAuditMarkup(user) {
  if (!user?.isOwner) return "";
  return `
    <section class="panel moderation-extra">
      <div class="section-head"><h2>Owner Chat Audit</h2><span>Tanklyplayz only</span></div>
      <form id="chatAuditForm" class="chat-audit-form">
        <input name="username" placeholder="Username contains..." />
        <input name="word" placeholder="Message word contains..." />
        <button class="primary-btn">Search Chat</button>
      </form>
      <div id="chatAuditResults" class="chat-audit-results"><p class="empty">Search a username or word to review CUBIXIA chat messages.</p></div>
    </section>
  `;
}

function ownerPanelPage(user) {
  if (!user.isOwner) return hub(user);
  stopRuntime();
  const roleOptions = `<option value="user">User</option><option value="mod">Mod</option><option value="admin">Admin</option>${user.isFounderOwner ? `<option value="cofounder">Co-Founder</option>` : ""}`;
  app.innerHTML = `
    <section class="dashboard">
      ${nav()}
      <main class="owner-panel">
        <section class="panel">
          <div class="section-head"><h1>${user.role === "cofounder" ? "Co-Founder Panel" : "Owner Panel"}</h1><span>${user.isFounderOwner ? "Tanklyplayz controls Co-Founder" : "owner-level access"}</span></div>
          <div class="owner-tools">
            <form id="ownerBanForm">
              <h2>Ban / Unban</h2>
              <input name="username" placeholder="Username" required />
              <input name="reason" placeholder="Reason" />
              <div class="duration-row"><input name="durationValue" type="number" min="1" value="1" /><select name="durationUnit">${durationOptions("days")}</select></div>
              <label class="checkline"><input name="permanent" type="checkbox" /> Permanent ban</label>
              <label class="checkline"><input name="ipBan" type="checkbox" /> IP/device ban</label>
              <div class="split-actions"><button class="danger" name="mode" value="ban">Ban</button><button name="mode" value="unban">Unban</button></div>
            </form>
            <form id="ownerGrantForm">
              <h2>Give Cubbits</h2>
              <input name="username" placeholder="Username" required />
              <input name="amount" type="number" min="1" max="100000" value="100" required />
              <button class="primary-btn">Grant</button>
            </form>
            <form id="ownerTakeForm">
              <h2>Take Cubbits</h2>
              <input name="username" placeholder="Username" required />
              <input name="amount" type="number" min="1" max="100000" value="100" required />
              <button class="danger">Take Away</button>
            </form>
            <form id="ownerRoleForm">
              <h2>Role Permissions</h2>
              <input name="username" placeholder="Username" required />
              <select name="role">${roleOptions}</select>
              <button class="primary-btn">Set Role</button>
            </form>
            <form id="ownerWarnForm">
              <h2>Warn User</h2>
              <input name="username" placeholder="Username" required />
              <input name="reason" placeholder="Rule reminder" required />
              <div class="duration-row"><input name="durationValue" type="number" min="0" value="0" /><select name="durationUnit">${durationOptions("minutes")}</select></div>
              <button class="primary-btn">Warn</button>
            </form>
            <form id="ownerLockdownForm" class="owner-lockdown-form">
              <h2>Emergency Lockdown</h2>
              <p id="ownerLockdownStatus">Checking lockdown status...</p>
              <textarea name="reason" placeholder="Reason shown to every player" required></textarea>
              <textarea name="staffMessage" placeholder="Private message for staff: what should mods/admins do?"></textarea>
              <button class="danger" id="ownerLockdownButton">Start Owner Lockdown</button>
            </form>
          </div>
          <div class="message" id="ownerMessage"></div>
        </section>
        ${contentModerationMarkup(user)}
        ${followModerationMarkup(user)}
        ${chatAuditMarkup(user)}
      </main>
    </section>
  `;
  bindRoutes();
  bindSessionButtons();
  bindOwnerPanel();
}

async function moderationPanelPage(user) {
  if (!canModerateUser(user)) return hub(user);
  stopRuntime();
  app.innerHTML = `
    <section class="dashboard">
      ${nav()}
      <main class="owner-panel moderation-panel">
        <section class="panel">
          <div class="section-head"><h1>${moderationPanelTitle(user)}</h1><span>reports and actions</span></div>
          <div class="mod-layout">
            <section class="mod-reports">
              <h2>Report Notifications</h2>
              <div id="moderationReports"><p class="empty">Loading reports...</p></div>
            </section>
            <section class="mod-actions">
              <h2>Take Action</h2>
              <form id="moderationActionForm">
                <input name="username" placeholder="Username" required />
                <select name="action" required>
                  <option value="warn">Warn</option>
                  <option value="kick">Kick from game</option>
                  <option value="ban">Ban</option>
                  <option value="permban">Permanent Ban</option>
                  <option value="ipban">IP/device Ban</option>
                  <option value="unban">Unban</option>
                  ${canTimeoutUser(user) ? `<option value="timeout">Timeout</option>` : ""}
                </select>
                <div class="duration-row"><input name="durationValue" type="number" min="0" value="1" /><select name="durationUnit">${durationOptions("days")}</select></div>
                <label class="checkline"><input name="permanent" type="checkbox" /> Permanent duration</label>
                <textarea name="reason" placeholder="Reason shown to the player" required></textarea>
                <button class="primary-btn">Submit Action</button>
              </form>
              <div class="message" id="moderationMessage"></div>
            </section>
          </div>
          <section class="staff-command-guide">
            <h2>In-Game Slash Commands</h2>
            <div>
              <article><strong>Player Actions</strong><span>/warn player reason</span><span>/kick player reason</span><span>/ban player 7d reason</span><span>/note player text</span></article>
              <article><strong>Investigation</strong><span>/freeze player</span><span>/unfreeze player</span><span>/inspect player</span><span>/goto player</span><span>/bring player</span><span>/safezone player</span><span>/safezone me</span></article>
              <article><strong>Chat Tools</strong><span>/clearchat 20</span><span>/slowmode 5</span><span>/lockchat</span><span>/unlockchat</span><span>/announce message</span></article>
              <article><strong>Reports</strong><span>/reviewreports</span><span>/resolve reportID</span><span>/escalate reportID</span><span>/attachnote reportID text</span></article>
              ${canTimeoutUser(user) ? `<article><strong>Admin Tools</strong><span>/serverinfo</span><span>/restartserver reason</span><span>/startevent double-xp</span><span>/inventory player</span><span>/casefile player</span></article><article><strong>Admin Fun</strong><span>/giantmode</span><span>/tiny</span><span>/normalsize</span><span>/firework</span><span>/spotlight</span><span>/fly / unfly</span><span>/noclip / clip</span><span>/freezeall / unfreezeall</span></article>` : ""}
            </div>
          </section>
        </section>
        ${contentModerationMarkup(user)}
        ${followModerationMarkup(user)}
        ${chatAuditMarkup(user)}
      </main>
    </section>
  `;
  bindRoutes();
  bindSessionButtons();
  await bindModerationPanel();
}

function publicProfile(user) {
  user = normalizeClientUser(user);
  if (!user) return;
  stopRuntime();
  const equippedItems = profileEquippedItems(user);
  const equippedCost = equippedItems.reduce((total, item) => total + Number(item.price || 0), 0);
  const played = [user.lastPlayed].filter(Boolean);
  app.innerHTML = `
    <section class="dashboard">
      ${nav()}
      <main class="public-profile">
        <section class="panel public-hero">
          <div class="profile-portrait-wrap">${avatar(user, "large")}</div>
          <div>
            <h1>${escapeHtml(user.username)}</h1>
            <p>@${escapeHtml(user.username)} | ${user.currentGame ? `Playing ${escapeHtml(user.currentGame)}` : user.online ? "Online" : "Offline"}</p>
            <div class="badge-row left">${(user.badges || []).map((badge) => `<span>${escapeHtml(badge)}</span>`).join("")}</div>
          </div>
          <button class="primary-btn" onclick="history.back()">Join</button>
        </section>
        <section class="panel">
          <div class="section-head"><h2>About</h2><span>identity hub</span></div>
          <p>${escapeHtml(user.bio || "This player is exploring CUBIXIA.")}</p>
          <div class="stats-strip"><span><strong>${user.online ? "Now" : "Away"}</strong> Status</span><span><strong>${new Date(user.createdAt || Date.now()).toLocaleDateString()}</strong> Join Date</span><span><strong>${new Date(user.lastOnline || Date.now()).toLocaleDateString()}</strong> Last Online</span><span><strong>${equippedCost.toLocaleString()}</strong> Avatar Cost</span></div>
        </section>
        <section class="panel">
          <div class="section-head"><h2>Recently Played</h2><span>${played.length || 0}</span></div>
          <div class="profile-game-list">${played.map((game) => `<button data-play="${escapeHtml(game.id || gameIdFromTitle(game.title || ""))}"><strong>${escapeHtml(game.title || "CUBIXIA Game")}</strong><small>${escapeHtml(game.progress || "Playing")}</small></button>`).join("") || `<p class="empty">No games played yet.</p>`}</div>
        </section>
        <section class="panel">
          <div class="section-head"><h2>Wearing Now</h2><span>${equippedItems.length} equipped</span></div>
          <div class="mini-inventory profile-gear">${equippedItems.map((item) => `<span><b class="mini-item-art">${itemIcon(item)}</b><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(itemKindLabel(item))} | ${Number(item.price || 0).toLocaleString()} Cubbits</small></span>`).join("") || `<p class="empty">No gear equipped.</p>`}</div>
        </section>
      </main>
    </section>
  `;
  bindRoutes();
  bindSessionButtons();
  bindPlayButtons();
  enhance3DPreviews();
}

function profileEquippedItems(user) {
  const platformItems = currentUser?.items || [];
  const itemLookup = new Map(platformItems.map((item) => [item.id, item]));
  return (user.equipped || [])
    .map((id) => itemLookup.get(id) || {
      id,
      name: user.inventoryNames?.find?.((name) => String(name).toLowerCase().includes(String(id).replace(/-/g, " ").slice(0, 8))) || id.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      type: inferItemType(id),
      creator: "CUBIXIA",
      price: 0
    })
    .filter((item) => !item.deleted);
}

function inferItemType(id = "") {
  const value = String(id);
  if (value.includes("shirt") || value.includes("vest")) return "shirt";
  if (value.includes("cap") || value.includes("hat") || value.includes("crown")) return "hat";
  if (value.includes("hair")) return "hair";
  if (value.includes("wing")) return "back";
  if (value.includes("boot") || value.includes("shoe")) return "shoes";
  if (value.includes("hammer")) return "tool";
  if (value.includes("visor")) return "face";
  return "accessory";
}

function avatarEditor(user) {
  user = normalizeClientUser(user);
  if (!user) return login();
  currentUser = user;
  stopRuntime();
  const style = normalizeAvatarStyle(user.avatarStyle);
  const ownedItems = user.items.filter((item) => user.inventory.includes(item.id));
  const equippedItems = ownedItems.filter((item) => user.equipped.includes(item.id));
  app.innerHTML = `
    <section class="dashboard">
      ${nav()}
      <div class="avatar-editor">
        <aside>
          <div class="avatar-editor-title">
            <div>
              <h1>Character Editor</h1>
              <p>${equippedItems.length} equipped | ${ownedItems.length} owned</p>
            </div>
            <button data-route="marketplace">Get More</button>
          </div>
          <div class="avatar-stage">
            <div id="avatar3dMount"></div>
            <span>3D game character</span>
          </div>
          <div class="avatar-color-panel">
            ${avatarColorControl("Skin", "skinColor", style.skin || "#f0d0a7", ["#f0d0a7", "#c79266", "#8b5a3c", "#f4c7b8"])}
            ${avatarColorControl("Shirt", "shirtColor", style.shirt || "#2268d8", ["#2268d8", "#111827", "#24a148", "#d33f49"])}
            ${avatarColorControl("Pants", "pantsColor", style.pants || "#252b35", ["#252b35", "#111111", "#244c9a", "#6d4b2d"])}
            ${avatarColorControl("Hair", "hairColor", style.hair || "#7a4a1d", ["#7a4a1d", "#111111", "#d59a2b", "#f3d7a4"])}
          </div>
          <p class="avatar-error" id="avatarColorError" role="alert"></p>
          <button class="primary-btn" id="saveAvatar">Save Avatar</button>
        </aside>
        <main>
          <div class="market-head"><h2>Owned Gear</h2><span>${equippedItems.map((item) => escapeHtml(item.name)).join(", ") || "Nothing equipped"}</span></div>
          <div class="avatar-toolbar">
            <input id="avatarItemSearch" type="search" placeholder="Search owned gear">
            <div class="avatar-tabs" role="tablist">
              ${["all", "shirt", "hat", "hair", "accessory", "face", "back", "shoes", "tool"].map((type) => `<button type="button" class="${type === "all" ? "active" : ""}" data-avatar-tab="${type}">${type === "all" ? "All" : type}</button>`).join("")}
            </div>
          </div>
          <div class="item-grid avatar-owned-grid">${ownedItems.map((item) => itemCard(item, user)).join("") || `<p class="empty">No owned items yet.</p>`}</div>
        </main>
      </div>
    </section>
  `;
  bindRoutes();
  bindSessionButtons();
  bindAvatarEditor();
  startAvatarEditorPreview(currentUser);
}

function avatarColorControl(label, id, value, swatches) {
  return `
    <label class="color-control">
      <span>${label}</span>
      <div>
        <input type="color" id="${id}" value="${value}">
        <div class="color-swatches">
          ${swatches.map((color) => `<button type="button" data-color-target="${id}" data-color-value="${color}" style="background:${color}" aria-label="${label} ${color}"></button>`).join("")}
        </div>
      </div>
    </label>
  `;
}

function marketplacePage(user) {
  currentUser = user;
  stopRuntime();
  app.innerHTML = `
    <section class="dashboard">
      ${nav()}
      <div class="marketplace-page">
        ${sideRail()}
        <main class="main-feed">
          <div class="section-head"><h1>Shop</h1><span>${Number(user.cubbux || 0).toLocaleString()} Cubbits</span></div>
          <div class="charts-filters">
            <button>All</button><button>Clothing</button><button>Accessories</button><button>Hats</button><button>Animations</button><button>Owned</button>
          </div>
          <div class="item-grid marketplace-grid">${user.items.map((item) => itemCard(item, user)).join("")}</div>
        </main>
      </div>
    </section>
  `;
  bindRoutes();
  bindSessionButtons();
  bindMarketplace();
  renderItemPreviewMounts();
}

function cubbuxPage(user) {
  currentUser = user;
  stopRuntime();
  app.innerHTML = `
    <section class="dashboard">
      ${nav()}
      <main class="cubbux-page">
        <h1>Buy Cubbits</h1>
        <p class="muted-center">Demo checkout for local testing. On Render this page is ready to connect to a real payment provider.</p>
        <section class="cubbux-bonus panel">
          <div class="bonus-art"></div>
          <div>
            <h2>Bonus item we picked for you</h2>
            <strong>First Play CUBIXIA bundle</strong>
            <span>Includes launch shirt, cap, and tycoon pin.</span>
          </div>
        </section>
        <section class="panel package-list">
          ${cubbuxPackages.map((pack) => `
            <button class="package-row ${pack.id === selectedCubbuxPackage ? "selected" : ""}" data-cubbux-pack="${pack.id}">
            <span><strong>${pack.amount.toLocaleString()}</strong> Cubbits <small>+ ${pack.bonus} more</small></span>
              <b>${pack.price}</b>
            </button>
          `).join("")}
        </section>
        <section class="panel checkout-panel">
          <div class="section-head"><h2>Card Checkout</h2><span>No real card is stored</span></div>
          <form id="checkoutForm" class="checkout-form">
            <input name="name" placeholder="Cardholder name" autocomplete="cc-name" required />
            <input name="number" placeholder="Card number (test: 4242 4242 4242 4242)" autocomplete="cc-number" required />
            <input name="expiry" placeholder="MM/YY" autocomplete="cc-exp" required />
            <input name="cvc" placeholder="CVC" autocomplete="cc-csc" required />
            <input name="zip" placeholder="Billing ZIP" autocomplete="postal-code" required />
            <button class="primary-btn">Purchase Selected Package</button>
            <div class="message" id="checkoutMessage"></div>
          </form>
        </section>
        <section class="panel">
          <div class="section-head"><h2>My Transactions</h2><span>${user.transactions.length}</span></div>
          <div class="transaction-list">${user.transactions.slice(0, 8).map((entry) => `<div><span>${escapeHtml(entry.label)}</span><strong>${Number(entry.amount) > 0 ? "+" : ""}${Number(entry.amount).toLocaleString()}</strong></div>`).join("") || `<p class="empty">No transactions yet.</p>`}</div>
        </section>
      </main>
    </section>
  `;
  bindRoutes();
  bindSessionButtons();
  bindCubbuxPage();
}

function defaultStudioProject(user) {
  return {
    id: "",
    title: `${user.username}'s World`,
    genre: "Creator",
    description: "A new CUBIXIA Studio experience.",
    published: false,
    source: "studio",
    studioWorld: {
      size: 160,
      sky: "#91d7ff",
      ground: "#5fbd82",
      services: defaultStudioServices(),
      objects: [
        { id: cryptoId(), type: "spawn", name: "Spawn", color: "#44db78", material: "plastic", anchored: true, locked: false, behavior: "spawn", position: { x: 0, y: 0.04, z: 4 }, size: { x: 1.4, y: 0.14, z: 1.4 }, rotation: { x: 0, y: 0, z: 0 }, rotationY: 0 },
        { id: cryptoId(), type: "block", name: "Starter Block", color: "#315cff", material: "plastic", anchored: true, locked: false, behavior: "static", position: { x: -3, y: 0, z: 0 }, size: { x: 2, y: 1, z: 2 }, rotation: { x: 0, y: 0, z: 0 }, rotationY: 0 },
        { id: cryptoId(), type: "coin", name: "Collectible", asset: "apple", color: "#ffcf55", material: "metal", anchored: true, locked: false, behavior: "collect", position: { x: 3, y: 0.2, z: -2 }, size: { x: 0.6, y: 0.6, z: 0.6 }, rotation: { x: 0, y: 0, z: 0 }, rotationY: 0 }
      ]
    }
  };
}

function studioServiceNames() {
  return ["World", "Players", "Lighting", "Shared Storage", "Server Scripts", "UI Screens", "Starter Gear", "Spawn Settings", "Teams", "Audio", "Chat"];
}

function defaultStudioServices() {
  return studioServiceNames().reduce((services, name) => ({ ...services, [name]: [] }), {});
}

async function studioPage(user, selectedId = "") {
  currentUser = user;
  stopRuntime();
  const data = await api("/api/studio/projects").catch(() => ({ projects: [], published: [], user }));
  if (data.user) currentUser = data.user;
  studioProjects = (data.projects || []).map((game) => ({ ...game, source: "studio", banner: "studio" }));
  studioGames = (data.published || studioGames).map((game) => ({ ...game, source: "studio", banner: "studio" }));
  const activeProject = selectedId === "new" ? defaultStudioProject(currentUser) : (selectedId && studioProjects.find((entry) => entry.id === selectedId)) || studioProjects[0] || defaultStudioProject(currentUser);
  activeProject.studioWorld = activeProject.studioWorld || defaultStudioProject(currentUser).studioWorld;
  activeProject.studioWorld.size = Number(activeProject.studioWorld.size || 160);
  activeProject.studioWorld.services = { ...defaultStudioServices(), ...(activeProject.studioWorld.services || {}) };
  app.innerHTML = `
    <section class="studio-app">
      <header class="studio-menu-line">
        <nav class="studio-menus">
          ${["File", "Edit", "View", "Plugins", "Test", "Window", "Help"].map((item) => `<button data-studio-menu="${item.toLowerCase()}" type="button">${item}</button>`).join("")}
          <div id="studioMenuDropdown" class="studio-menu-dropdown hidden"></div>
        </nav>
        <div class="studio-menu-right">
          <button data-studio-command="collaborate" type="button">Collaborate</button>
          <button data-route="home" type="button">Back to CUBIXIA</button>
          <span>${avatar(currentUser, "tiny")} ${escapeHtml(currentUser.username)}</span>
          <button id="logoutBtn" type="button">Logout</button>
        </div>
      </header>
      <div class="studio-play-line">
        <select id="studioProjectSelect" aria-label="Studio project">
          ${studioProjects.map((project) => `<option value="${escapeHtml(project.id)}" ${project.id === activeProject.id ? "selected" : ""}>${escapeHtml(project.title)}${project.published ? " (Published)" : ""}</option>`).join("")}
          <option value="new" ${activeProject.id ? "" : "selected"}>New blank world</option>
        </select>
        <button class="studio-icon-btn play" id="studioPlay" title="Test Play" type="button">Play</button>
        <button class="studio-icon-btn" data-studio-command="pause" title="Pause viewport animation" type="button">Pause</button>
        <button class="studio-icon-btn stop" data-studio-command="stop" title="Reset camera" type="button">Stop</button>
        <button class="studio-icon-btn" id="studioSave" type="button">Save</button>
        <button class="studio-icon-btn publish" id="studioPublish" type="button">Publish</button>
        <input id="studioTitle" value="${escapeHtml(activeProject.title)}" maxlength="60" aria-label="Game title" />
        <button class="studio-icon-btn" data-studio-command="new-project" title="New project" type="button">+</button>
      </div>
      <div class="studio-tab-line">
        ${["Build", "Character", "UI", "Scripts", "Models", "Plugins", "Untitled"].map((tab, index) => `<button class="${index === 0 ? "active" : ""}" data-studio-tab="${tab.toLowerCase()}" type="button">${tab}</button>`).join("")}
        <button data-studio-command="new-project" type="button">+</button>
      </div>
      <div class="studio-ribbon" id="studioRibbon"></div>
      <main class="studio-workspace studio-dock">
        <aside class="studio-panel studio-toolbox" id="studioToolboxPanel">
          <div class="studio-panel-title"><strong>Toolbox</strong><button data-studio-command="toolbox" type="button">x</button></div>
          <div class="studio-tool-tabs"><button class="active" type="button">Models</button><button type="button">Images</button><button type="button">Scripts</button></div>
          <input id="studioAssetSearch" placeholder="Search toolbox" />
          <div class="studio-asset-grid">
            ${studioToolboxItems().map((item) => `
              <button data-toolbox-item="${escapeHtml(item.name.toLowerCase())}" data-studio-add="${escapeHtml(item.type)}" data-studio-model="${escapeHtml(item.asset || "")}" type="button">
                <span class="asset-preview ${escapeHtml(item.type)}">${escapeHtml(item.icon)}</span>
                <strong>${escapeHtml(item.name)}</strong>
                <small>Free</small>
              </button>
            `).join("")}
          </div>
          <section class="studio-project-card">
            <h2>Project</h2>
            <label>Genre<input id="studioGenre" value="${escapeHtml(activeProject.genre || "Creator")}" maxlength="32" /></label>
            <label>Description<textarea id="studioDescription" maxlength="600">${escapeHtml(activeProject.description || "")}</textarea></label>
            <label>World Size <span id="studioWorldSizeValue">${Number(activeProject.studioWorld.size || 160)}</span>
              <input id="studioWorldSize" type="range" min="40" max="500" step="10" value="${Number(activeProject.studioWorld.size || 160)}" />
            </label>
            <div class="studio-swatches">
              <label>Sky <input id="studioSky" type="color" value="${escapeHtml(activeProject.studioWorld?.sky || "#91d7ff")}" /></label>
              <label>Ground <input id="studioGround" type="color" value="${escapeHtml(activeProject.studioWorld?.ground || "#5fbd82")}" /></label>
            </div>
          </section>
          <div class="message" id="studioMessage"></div>
        </aside>
        <section class="studio-stage">
          <div class="studio-document-tab"><span>World01</span><button data-studio-command="save" type="button">Save</button></div>
          <div class="studio-viewport-wrap">
            <div id="studioMount"></div>
            <div class="studio-view-cube"><span>Top</span><span>Left</span><span>Front</span></div>
            <div class="studio-help">LMB select/drag with Move, Scale, Rotate | RMB orbit camera | Wheel zoom | Save or Publish when ready</div>
          </div>
          <form class="studio-command-bar" id="studioCommandForm">
            <input id="studioCommandInput" placeholder="Execute a command: part, terrain, save, publish, play, clear" />
            <button type="submit">Run</button>
          </form>
        </section>
        <aside class="studio-side-panels">
          <section class="studio-panel" id="studioExplorerPanel">
            <div class="studio-panel-title"><strong>Explorer</strong><button data-studio-command="explorer" type="button">x</button></div>
            <input id="studioExplorerSearch" placeholder="Search World" />
            <div class="studio-tree">
              ${studioServiceNames().map((name) => `<button class="${name === "World" ? "active" : ""}" data-studio-service="${name}" type="button">${name}</button>`).join("")}
            </div>
            <div id="studioExplorer"></div>
          </section>
          <section class="studio-panel" id="studioPropertiesPanel">
            <div class="studio-panel-title"><strong>Properties</strong><button data-studio-command="properties" type="button">x</button></div>
            <input placeholder="Filter Properties" />
            <div id="studioInspector"></div>
          </section>
        </aside>
      </main>
    </section>
  `;
  bindRoutes();
  bindSessionButtons();
  bindStudioPage(activeProject);
}

function bindStudioPage(project) {
  studioEditor = {
    project: JSON.parse(JSON.stringify(project)),
    selectedId: project.studioWorld?.objects?.[0]?.id || "",
    meshes: new Map(),
    tool: "select",
    ribbonTab: "home",
    selectedService: "World",
    closedPanels: new Set(),
    moveKeys: {},
    drag: null,
    orbit: null,
    animating: true
  };
  document.querySelector("#studioProjectSelect").addEventListener("change", (event) => {
    const projectId = event.currentTarget.value;
    studioPage(currentUser, projectId);
  });
  document.querySelectorAll("[data-studio-add]").forEach((button) => {
    button.addEventListener("click", () => {
      addStudioObject(button.dataset.studioAdd, button.dataset.studioModel || "");
    });
  });
  ["studioTitle", "studioGenre", "studioDescription", "studioSky", "studioGround", "studioWorldSize"].forEach((id) => {
    document.querySelector(`#${id}`).addEventListener("input", syncStudioProjectFromForm);
  });
  document.querySelector("#studioSave").addEventListener("click", () => saveStudioProject(false));
  document.querySelector("#studioPublish").addEventListener("click", publishStudioProject);
  document.querySelector("#studioPlay").addEventListener("click", testStudioProject);
  document.querySelectorAll("[data-studio-command]").forEach((button) => {
    button.addEventListener("click", () => handleStudioCommand(button.dataset.studioCommand));
  });
  document.querySelectorAll("[data-studio-menu]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleStudioMenu(button.dataset.studioMenu, button);
    });
  });
  document.onpointerdown = (event) => {
    if (!event.target?.closest?.(".studio-menu-line")) closeStudioMenu();
  };
  document.querySelectorAll("[data-studio-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      studioEditor.ribbonTab = button.dataset.studioTab;
      renderStudioRibbon();
    });
  });
  document.querySelector("#studioAssetSearch").addEventListener("input", filterStudioToolbox);
  document.querySelector("#studioExplorerSearch").addEventListener("input", renderStudioExplorer);
  document.querySelector("#studioCommandForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const command = document.querySelector("#studioCommandInput").value.trim().toLowerCase();
    if (!command) return;
    document.querySelector("#studioCommandInput").value = "";
    handleStudioCommand(command);
  });
  document.querySelectorAll("[data-studio-service]").forEach((button) => {
    button.addEventListener("click", () => {
      studioEditor.selectedService = button.dataset.studioService;
      renderStudioExplorer();
      studioStatus(`${studioEditor.selectedService} selected.`);
    });
  });
  renderStudioRibbon();
  startStudioViewport();
  applyStudioPanelVisibility();
}

function syncStudioProjectFromForm() {
  if (!studioEditor) return;
  studioEditor.project.title = document.querySelector("#studioTitle")?.value.trim() || "Untitled CUBIXIA Game";
  studioEditor.project.genre = document.querySelector("#studioGenre")?.value.trim() || "Creator";
  studioEditor.project.description = document.querySelector("#studioDescription")?.value.trim() || "A player-created CUBIXIA experience.";
  studioEditor.project.studioWorld.sky = document.querySelector("#studioSky")?.value || "#91d7ff";
  studioEditor.project.studioWorld.ground = document.querySelector("#studioGround")?.value || "#5fbd82";
  studioEditor.project.studioWorld.size = Math.max(40, Math.min(500, Number(document.querySelector("#studioWorldSize")?.value || 160)));
  const sizeLabel = document.querySelector("#studioWorldSizeValue");
  if (sizeLabel) sizeLabel.textContent = studioEditor.project.studioWorld.size;
  renderStudioSceneObjects();
}

async function startStudioViewport() {
  const THREE = await loadThree();
  const mount = document.querySelector("#studioMount");
  if (!mount || !studioEditor) return;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(studioEditor.project.studioWorld.sky || "#91d7ff");
  const camera = new THREE.PerspectiveCamera(58, mount.clientWidth / mount.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  mount.innerHTML = "";
  mount.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x506070, 2.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(6, 12, 8);
  scene.add(sun);
  studioEditor.scene = scene;
  studioEditor.camera = camera;
  studioEditor.renderer = renderer;
  studioEditor.mount = mount;
  studioEditor.objectGroup = new THREE.Group();
  studioEditor.orbit = { yaw: -0.7, pitch: 0.48, distance: 34, target: new THREE.Vector3(0, 0, 0), rotating: false, lastX: 0, lastY: 0 };
  scene.add(studioEditor.objectGroup);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pickObject = (event) => {
    const box = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - box.left) / box.width) * 2 - 1;
    pointer.y = -((event.clientY - box.top) / box.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([...studioEditor.meshes.values()], true)[0];
    return hit?.object.userData.objectId || hit?.object.parent?.userData.objectId;
  };
  mount.addEventListener("contextmenu", (event) => event.preventDefault());
  mount.addEventListener("pointerdown", (event) => {
    if (event.button === 2) {
      event.preventDefault();
      studioEditor.orbit.rotating = true;
      studioEditor.orbit.lastX = event.clientX;
      studioEditor.orbit.lastY = event.clientY;
      mount.classList.add("camera-dragging");
      return;
    }
    if (event.button !== 0) return;
    const objectId = pickObject(event);
    if (objectId) {
      studioEditor.selectedId = objectId;
      renderStudioEditor();
      const object = selectedStudioObject();
      if (object && !object.locked && ["move", "scale", "rotate", "transform"].includes(studioEditor.tool)) {
        studioEditor.drag = {
          tool: studioEditor.tool,
          startX: event.clientX,
          startY: event.clientY,
          original: JSON.parse(JSON.stringify(object))
        };
      } else if (object?.locked) {
        studioStatus("Locked object selected. Unlock it before transforming.");
      }
    }
  });
  const studioPointerUp = () => {
    studioEditor.drag = null;
    if (studioEditor?.orbit) studioEditor.orbit.rotating = false;
    mount.classList.remove("camera-dragging");
  };
  window.addEventListener("pointermove", handleStudioPointerMove);
  window.addEventListener("pointerup", studioPointerUp);
  mount.addEventListener("wheel", (event) => {
    event.preventDefault();
    studioEditor.orbit.distance = Math.max(6, Math.min(120, studioEditor.orbit.distance + event.deltaY * 0.04));
    updateStudioCamera();
  }, { passive: false });
  document.onkeydown = (event) => {
    const key = event.key.toLowerCase();
    if (event.ctrlKey && key === "s") {
      event.preventDefault();
      return saveStudioProject(false);
    }
    if (event.altKey && key === "p") {
      event.preventDefault();
      return publishStudioProject();
    }
    if (event.ctrlKey && key === "n") {
      event.preventDefault();
      return studioPage(currentUser, "new");
    }
    if (event.ctrlKey && key === "o") {
      event.preventDefault();
      return openStudioProjectFile();
    }
    if (event.target?.matches?.("input, textarea, select")) return;
    if (["w", "a", "s", "d", "q", "e"].includes(key)) {
      event.preventDefault();
      studioEditor.moveKeys[key] = true;
    }
  };
  document.onkeyup = (event) => {
    const key = event.key.toLowerCase();
    if (studioEditor?.moveKeys) studioEditor.moveKeys[key] = false;
  };
  window.onresize = () => {
    if (!studioEditor?.camera) return;
    studioEditor.camera.aspect = mount.clientWidth / mount.clientHeight;
    studioEditor.camera.updateProjectionMatrix();
    studioEditor.renderer.setSize(mount.clientWidth, mount.clientHeight);
  };
  runtime = { scene, camera, renderer, mount, frame: 0, studioPointerMove: handleStudioPointerMove, studioPointerUp };
  updateStudioCamera();
  const animate = () => {
    runtime.frame = requestAnimationFrame(animate);
    if (studioEditor.animating) {
      moveStudioCamera();
      studioEditor.objectGroup.children.forEach((mesh) => {
        if (mesh.userData.type === "coin") mesh.rotation.y += 0.035;
        if (mesh.userData.type === "npc") mesh.position.y += Math.sin(Date.now() / 260) * 0.0006;
      });
    }
    renderer.render(scene, camera);
  };
  renderStudioEditor();
  animate();
}

function renderStudioEditor() {
  renderStudioSceneObjects();
  renderStudioExplorer();
  renderStudioInspector();
}

function renderStudioSceneObjects() {
  if (!studioEditor?.objectGroup || !THREE_CACHE) return;
  const THREE = THREE_CACHE;
  studioEditor.scene.background = new THREE.Color(studioEditor.project.studioWorld.sky || "#91d7ff");
  studioEditor.objectGroup.clear();
  studioEditor.meshes.clear();
  const worldSize = Math.max(40, Math.min(500, Number(studioEditor.project.studioWorld.size || 160)));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(worldSize, worldSize), new THREE.MeshStandardMaterial({ color: studioEditor.project.studioWorld.ground || "#5fbd82", roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  studioEditor.objectGroup.add(ground);
  const grid = new THREE.GridHelper(worldSize, Math.max(10, Math.floor(worldSize / 4)), 0x8ca0b3, 0xcad5df);
  studioEditor.objectGroup.add(grid);
  studioEditor.project.studioWorld.objects.forEach((object) => {
    const mesh = createStudioWorldMesh(THREE, object, object.id === studioEditor.selectedId);
    studioEditor.objectGroup.add(mesh);
    studioEditor.meshes.set(object.id, mesh);
  });
}

function renderStudioExplorer() {
  const explorer = document.querySelector("#studioExplorer");
  if (!explorer || !studioEditor) return;
  const term = (document.querySelector("#studioExplorerSearch")?.value || "").toLowerCase();
  document.querySelectorAll("[data-studio-service]").forEach((button) => button.classList.toggle("active", button.dataset.studioService === studioEditor.selectedService));
  const objects = studioEditor.project.studioWorld.objects.filter((object) => !term || `${object.name} ${object.type}`.toLowerCase().includes(term));
  const serviceItems = studioEditor.project.studioWorld.services?.[studioEditor.selectedService] || [];
  explorer.innerHTML = `
    ${studioEditor.selectedService === "World" ? objects.map((object) => `
      <button class="${object.id === studioEditor.selectedId ? "active" : ""}" data-studio-select="${escapeHtml(object.id)}" type="button">
        <span>${studioIcon(object.type)}</span><strong>${escapeHtml(object.name || object.type)}</strong><small>${escapeHtml(object.type)}${object.locked ? " | locked" : ""}</small>
      </button>
    `).join("") || `<p class="empty">No objects found.</p>` : ""}
    ${serviceItems.map((item) => `
      <button class="service-item" data-studio-service-item="${escapeHtml(item.id)}" type="button">
        <span>${studioCommandIcon(item.type)}</span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(studioEditor.selectedService)} | ${escapeHtml(item.type)}</small>
      </button>
    `).join("")}
    <div class="service-actions">
      <button data-studio-command="add-script" type="button">+ Script</button>
      <button data-studio-command="add-folder" type="button">+ Folder</button>
      <button data-studio-command="add-sound" type="button">+ Sound</button>
    </div>
  `;
  explorer.querySelectorAll("[data-studio-select]").forEach((button) => {
    button.addEventListener("click", () => {
      studioEditor.selectedId = button.dataset.studioSelect;
      renderStudioEditor();
    });
  });
  explorer.querySelectorAll("[data-studio-command]").forEach((button) => {
    button.addEventListener("click", () => handleStudioCommand(button.dataset.studioCommand));
  });
  explorer.querySelectorAll("[data-studio-service-item]").forEach((button) => {
    button.addEventListener("click", () => studioStatus(`${button.innerText.split("\n")[0]} selected in ${studioEditor.selectedService}.`));
  });
}

function renderStudioInspector() {
  const inspector = document.querySelector("#studioInspector");
  if (!inspector || !studioEditor) return;
  const object = studioEditor.project.studioWorld.objects.find((entry) => entry.id === studioEditor.selectedId);
  if (!object) {
    inspector.innerHTML = `<p class="empty">Select an object to edit it.</p>`;
    return;
  }
  inspector.innerHTML = `
    <form id="studioObjectForm" class="studio-object-form">
      <label>Name<input name="name" value="${escapeHtml(object.name || "")}" /></label>
      <label>Color<input name="color" type="color" value="${escapeHtml(object.color || "#315cff")}" /></label>
      <label>Material<select name="material">${["plastic", "metal", "neon", "wood", "glass"].map((material) => `<option value="${material}" ${object.material === material ? "selected" : ""}>${material}</option>`).join("")}</select></label>
      <label>Behavior<select name="behavior">${["static", "collect", "damage", "bounce", "spawn"].map((behavior) => `<option value="${behavior}" ${object.behavior === behavior ? "selected" : ""}>${behavior}</option>`).join("")}</select></label>
      <div class="axis-grid">
        ${["x", "y", "z"].map((axis) => `<label>Pos ${axis.toUpperCase()}<input name="position.${axis}" type="number" step="0.25" value="${Number(object.position?.[axis] || 0)}" /></label>`).join("")}
        ${["x", "y", "z"].map((axis) => `<label>Size ${axis.toUpperCase()}<input name="size.${axis}" type="number" min="0.2" step="0.25" value="${Number(object.size?.[axis] || 1)}" /></label>`).join("")}
        ${["x", "y", "z"].map((axis) => `<label>Rot ${axis.toUpperCase()}<input name="rotation.${axis}" type="number" step="0.1" value="${Number(object.rotation?.[axis] ?? (axis === "y" ? object.rotationY || 0 : 0))}" /></label>`).join("")}
      </div>
      <label>Rotate Y<input name="rotation.y" type="range" min="-6.28" max="6.28" step="0.05" value="${Number(object.rotation?.y ?? object.rotationY ?? 0)}" /></label>
      <div class="studio-side-scale">
        ${["x-", "x+", "y-", "y+", "z-", "z+"].map((side) => `<button type="button" data-scale-side="${side}">Scale ${side.toUpperCase()}</button>`).join("")}
      </div>
      <label class="studio-check"><input name="locked" type="checkbox" ${object.locked ? "checked" : ""} /> Locked</label>
      <label class="studio-check"><input name="anchored" type="checkbox" ${object.anchored === false ? "" : "checked"} /> Anchored</label>
      <button class="danger-lite" id="deleteStudioObject" type="button">Delete Object</button>
    </form>
  `;
  inspector.querySelectorAll("input, select").forEach((input) => input.addEventListener("input", updateSelectedStudioObject));
  inspector.querySelectorAll("[data-scale-side]").forEach((button) => {
    button.addEventListener("click", () => scaleSelectedStudioSide(button.dataset.scaleSide));
  });
  document.querySelector("#deleteStudioObject").addEventListener("click", () => {
    studioEditor.project.studioWorld.objects = studioEditor.project.studioWorld.objects.filter((entry) => entry.id !== object.id);
    studioEditor.selectedId = studioEditor.project.studioWorld.objects[0]?.id || "";
    renderStudioEditor();
  });
}

function updateSelectedStudioObject(event) {
  const object = studioEditor.project.studioWorld.objects.find((entry) => entry.id === studioEditor.selectedId);
  if (!object) return;
  const { name, value } = event.currentTarget;
  if (name.startsWith("position.")) object.position[name.split(".")[1]] = Number(value);
  else if (name.startsWith("size.")) object.size[name.split(".")[1]] = Math.max(0.2, Number(value));
  else if (name.startsWith("rotation.")) {
    object.rotation = object.rotation || { x: 0, y: Number(object.rotationY || 0), z: 0 };
    object.rotation[name.split(".")[1]] = Number(value);
    object.rotationY = object.rotation.y;
  }
  else if (name === "locked" || name === "anchored") object[name] = event.currentTarget.checked;
  else object[name] = value;
  renderStudioSceneObjects();
  renderStudioExplorer();
}

async function saveStudioProject(quiet = false) {
  syncStudioProjectFromForm();
  const message = document.querySelector("#studioMessage");
  if (message && !quiet) message.textContent = "Saving...";
  const payload = {
    id: studioEditor.project.id,
    title: studioEditor.project.title,
    genre: studioEditor.project.genre,
    description: studioEditor.project.description,
    studioWorld: studioEditor.project.studioWorld
  };
  const data = await api("/api/studio/save", { method: "POST", body: JSON.stringify(payload) });
  currentUser = data.user || currentUser;
  studioEditor.project = { ...data.project, source: "studio", banner: "studio" };
  studioProjects = (data.projects || []).map((project) => ({ ...project, source: "studio", banner: "studio" }));
  const selector = document.querySelector("#studioProjectSelect");
  if (selector && studioEditor.project.id) {
    let option = Array.from(selector.options).find((entry) => entry.value === studioEditor.project.id);
    if (!option) {
      option = new Option(studioEditor.project.title, studioEditor.project.id);
      selector.add(option, 0);
    }
    option.textContent = `${studioEditor.project.title}${studioEditor.project.published ? " (Published)" : ""}`;
    selector.value = studioEditor.project.id;
  }
  if (message && !quiet) message.textContent = "Draft saved.";
  return studioEditor.project;
}

async function publishStudioProject() {
  const message = document.querySelector("#studioMessage");
  try {
    const project = await saveStudioProject(true);
    message.textContent = "Publishing...";
    const data = await api("/api/studio/publish", { method: "POST", body: JSON.stringify({ id: project.id }) });
    currentUser = data.user || currentUser;
    studioEditor.project = { ...data.project, source: "studio", banner: "studio" };
    studioGames = (data.creatorGames || []).map((game) => ({ ...game, source: "studio", banner: "studio" }));
    studioProjects = studioProjects.map((entry) => entry.id === studioEditor.project.id ? studioEditor.project : entry);
    const option = Array.from(document.querySelector("#studioProjectSelect")?.options || []).find((entry) => entry.value === studioEditor.project.id);
    if (option) option.textContent = `${studioEditor.project.title} (Published)`;
    message.textContent = "Published to the Games page.";
  } catch (error) {
    message.textContent = error.message;
  }
}

async function testStudioProject() {
  const message = document.querySelector("#studioMessage");
  try {
    const project = await saveStudioProject(true);
    const playable = { ...project, source: "studio", banner: "studio" };
    studioProjects = studioProjects.some((entry) => entry.id === playable.id) ? studioProjects.map((entry) => entry.id === playable.id ? playable : entry) : [...studioProjects, playable];
    gamePage(currentUser, playable.id);
  } catch (error) {
    message.textContent = error.message;
  }
}

function studioMenuDefinitions() {
  return {
    file: [
      [{ label: "New", shortcut: "Ctrl+N", command: "new-project" }, { label: "Open from File", shortcut: "Ctrl+O", command: "open-file" }, { label: "Open from CUBIXIA", shortcut: "Ctrl+Shift+O", command: "open-cloud" }, { label: "Recent", command: "recent" }],
      [{ label: "Close World", shortcut: "Ctrl+F4", command: "close-place" }],
      [{ label: "Import", shortcut: "Ctrl+M", command: "import" }, { label: "Import CUBIXIA Model", command: "import-model" }, { label: "Export as .obj", command: "export-obj" }, { label: "Export as glTF", command: "export-gltf" }],
      [{ label: "Save to File", command: "save-file" }, { label: "Save to File As", shortcut: "Ctrl+Shift+S", command: "save-file-as" }, { label: "Save to CUBIXIA", command: "save" }, { label: "Save to CUBIXIA As", command: "save-as" }],
      [{ label: "Publish to CUBIXIA", shortcut: "Alt+P", command: "publish" }, { label: "Publish to CUBIXIA As", command: "publish-as" }],
      [{ label: "Game Settings", command: "experience-settings" }, { label: "Character Settings", command: "avatar-settings" }, { label: "Open Configs", command: "open-configs" }],
      [{ label: "Studio Settings", shortcut: "Alt+S", command: "studio-settings" }, { label: "Beta Features", command: "beta-features" }, { label: "Customize Shortcuts", command: "shortcuts" }],
      [{ label: "Open Auto Saves", command: "auto-saves" }],
      [{ label: "About CUBIXIA Studio", command: "about-studio" }],
      [{ label: "Exit", command: "home" }]
    ],
    edit: [
      [{ label: "Undo", shortcut: "Ctrl+Z", command: "undo" }, { label: "Redo", shortcut: "Ctrl+Y", command: "redo" }],
      [{ label: "Duplicate", shortcut: "Ctrl+D", command: "duplicate" }, { label: "Delete", shortcut: "Del", command: "delete" }],
      [{ label: "Select", command: "select" }, { label: "Move", command: "move" }, { label: "Scale", command: "scale" }, { label: "Rotate", command: "rotate" }],
      [{ label: "Group Copies", command: "group" }, { label: "Lock", command: "lock" }, { label: "Anchor", command: "anchor" }]
    ],
    view: [
      [{ label: "Explorer", command: "show-explorer" }, { label: "Properties", command: "show-properties" }, { label: "Toolbox", command: "show-toolbox" }],
      [{ label: "Reset Camera", command: "stop" }, { label: "Focus Selected", command: "focus-selected" }, { label: "Search Assets", command: "assets" }]
    ],
    plugins: [
      [{ label: "Toolbox", command: "show-toolbox" }, { label: "Assets", command: "assets" }, { label: "Import Model", command: "import-model" }],
      [{ label: "Collaborate", command: "collaborate" }, { label: "Save Draft", command: "save" }, { label: "Publish", command: "publish" }]
    ],
    test: [
      [{ label: "Play", command: "play" }, { label: "Pause Viewport", command: "pause" }, { label: "Stop / Reset Camera", command: "stop" }],
      [{ label: "Respawn Test Character", command: "character" }, { label: "Open Command Bar", command: "command" }]
    ],
    window: [
      [{ label: "Explorer", command: "show-explorer" }, { label: "Properties", command: "show-properties" }, { label: "Toolbox", command: "show-toolbox" }],
      [{ label: "Hide Explorer", command: "explorer" }, { label: "Hide Properties", command: "properties" }, { label: "Hide Toolbox", command: "toolbox" }],
      [{ label: "Reset Layout", command: "reset-layout" }]
    ],
    help: [
      [{ label: "Studio Controls", command: "help-controls" }, { label: "Publishing Guide", command: "publishing-guide" }],
      [{ label: "About CUBIXIA Studio", command: "about-studio" }]
    ]
  };
}

function toggleStudioMenu(name, button) {
  const menu = document.querySelector("#studioMenuDropdown");
  if (!menu) return;
  if (!menu.classList.contains("hidden") && menu.dataset.menu === name) {
    closeStudioMenu();
    return;
  }
  openStudioMenu(name, button);
}

function openStudioMenu(name, button) {
  const menu = document.querySelector("#studioMenuDropdown");
  if (!menu) return;
  const groups = studioMenuDefinitions()[name] || [];
  menu.dataset.menu = name;
  menu.innerHTML = groups.map((group) => `
    <div class="studio-menu-group">
      ${group.map((item) => `
        <button data-menu-command="${escapeHtml(item.command)}" type="button">
          <span>${escapeHtml(item.label)}</span>
          ${item.shortcut ? `<small>${escapeHtml(item.shortcut)}</small>` : "<small></small>"}
        </button>
      `).join("")}
    </div>
  `).join("");
  menu.querySelectorAll("[data-menu-command]").forEach((item) => {
    item.addEventListener("click", (event) => {
      event.stopPropagation();
      const command = item.dataset.menuCommand;
      closeStudioMenu();
      handleStudioCommand(command);
    });
  });
  const navBox = button.parentElement.getBoundingClientRect();
  const buttonBox = button.getBoundingClientRect();
  menu.style.left = `${Math.max(0, buttonBox.left - navBox.left)}px`;
  menu.classList.remove("hidden");
}

function closeStudioMenu() {
  document.querySelector("#studioMenuDropdown")?.classList.add("hidden");
}

function renderStudioRibbon() {
  if (!studioEditor) return;
  document.querySelectorAll("[data-studio-tab]").forEach((button) => button.classList.toggle("active", button.dataset.studioTab === studioEditor.ribbonTab));
  const ribbon = document.querySelector("#studioRibbon");
  const groups = {
    home: [
      ["Tools", [["select", "Select"], ["move", "Move"], ["scale", "Scale"], ["rotate", "Rotate"], ["transform", "Transform"]]],
      ["Build", [["part", "Part"], ["terrain", "Terrain"], ["character", "Character"], ["gui", "GUI"], ["script", "Script"], ["import", "Import"]]],
      ["Edit", [["material", "Material"], ["color", "Color"], ["group", "Group"], ["lock", "Lock"], ["anchor", "Anchor"]]],
      ["Panels", [["explorer", "Explorer"], ["properties", "Properties"], ["toolbox", "Toolbox"], ["assets", "Assets"]]]
    ],
    avatar: [
      ["Avatar", [["settings", "Settings"], ["character", "Character"], ["setup", "Setup"], ["accessory", "Accessory"], ["adaptive", "Adaptive"], ["clip", "Clip Editor"]]]
    ],
    ui: [
      ["Interface", [["gui", "GUI"], ["frame", "Frame"], ["label", "Label"], ["input", "Input"], ["appearance", "Appearance"], ["layout", "Layout"], ["constraint", "Constraint"], ["style", "Style Editor"]]]
    ],
    script: [
      ["Script", [["back", "Back"], ["forward", "Fwd"], ["script", "Script"], ["format", "Format"], ["find", "Find"], ["go-line", "Go to Line"], ["command", "Command"], ["output", "Output"], ["breakpoints", "Breakpoints"], ["call-stack", "Call Stack"], ["watch", "Watch"], ["analysis", "Analysis"], ["activity", "Script Activity"]]]
    ],
    model: [
      ["Model", [["part", "Part"], ["move", "Move"], ["scale", "Scale"], ["rotate", "Rotate"], ["transform", "Transform"], ["material", "Material"], ["color", "Color"], ["group", "Group"], ["lock", "Lock"], ["anchor", "Anchor"]]]
    ],
    plugins: [
      ["Plugins", [["toolbox", "Toolbox"], ["assets", "Assets"], ["import", "Import"], ["collaborate", "Collaborate"], ["save", "Save Draft"], ["publish", "Publish"]]]
    ],
    untitled: [
      ["Game", [["new-project", "New Game"], ["save", "Save Draft"], ["publish", "Publish"], ["play", "Test"], ["home", "Back Home"]]]
    ]
  };
  ribbon.innerHTML = (groups[studioEditor.ribbonTab] || groups.home).map(([title, buttons]) => `
    <div class="studio-ribbon-group">
      <div>${buttons.map(([command, label]) => `<button class="${studioEditor.tool === command ? "active" : ""}" data-studio-command="${command}" type="button"><span>${studioCommandIcon(command)}</span>${label}</button>`).join("")}</div>
      <small>${title}</small>
    </div>
  `).join("");
  ribbon.querySelectorAll("[data-studio-command]").forEach((button) => {
    button.addEventListener("click", () => handleStudioCommand(button.dataset.studioCommand));
  });
}

function handleStudioCommand(command) {
  const normalized = String(command || "").replace(/\s+/g, "-");
  if (["select", "move", "scale", "rotate", "transform"].includes(normalized)) {
    studioEditor.tool = normalized;
    studioStatus(`${normalized[0].toUpperCase()}${normalized.slice(1)} tool selected.`);
    renderStudioRibbon();
    return;
  }
  if (["part", "block", "terrain", "platform", "character", "npc", "gui", "script", "frame", "label", "input", "import", "accessory", "apple", "pizza", "sword", "bush"].includes(normalized)) {
    addStudioObject(normalized);
    return;
  }
  if (["add-script", "add-folder", "add-sound", "add-remote", "add-ui"].includes(normalized)) return addStudioServiceItem(normalized.replace("add-", ""));
  if (normalized === "play") return testStudioProject();
  if (normalized === "save") return saveStudioProject(false);
  if (normalized === "publish") return publishStudioProject();
  if (normalized === "open-file") return openStudioProjectFile();
  if (normalized === "open-cloud" || normalized === "recent" || normalized === "auto-saves") {
    document.querySelector("#studioProjectSelect")?.focus();
    studioStatus("Choose one of your saved CUBIXIA Studio projects from the project list.");
    return;
  }
  if (normalized === "close-place") {
    if (confirm("Close this place and open a new blank world? Unsaved changes should be saved first.")) studioPage(currentUser, "new");
    return;
  }
  if (normalized === "save-file" || normalized === "save-file-as") return exportStudioProjectFile("json");
  if (normalized === "save-as") return saveStudioProjectAs(false);
  if (normalized === "publish-as") return saveStudioProjectAs(true);
  if (normalized === "export-obj") return exportStudioProjectFile("obj");
  if (normalized === "export-gltf") return exportStudioProjectFile("gltf");
  if (normalized === "import-model") return addStudioObject("import");
  if (normalized === "new-project") return studioPage(currentUser, "new");
  if (normalized === "home") return goHome();
  if (normalized === "pause") {
    studioEditor.animating = !studioEditor.animating;
    studioStatus(studioEditor.animating ? "Viewport animation resumed." : "Viewport animation paused.");
    return;
  }
  if (normalized === "stop") {
    studioEditor.orbit.yaw = -0.7;
    studioEditor.orbit.pitch = 0.48;
    studioEditor.orbit.distance = 34;
    updateStudioCamera();
    studioStatus("Camera reset.");
    return;
  }
  if (normalized === "material") return cycleSelectedStudioMaterial();
  if (normalized === "color" || normalized === "appearance" || normalized === "style") return cycleSelectedStudioColor();
  if (normalized === "group") return duplicateSelectedStudioObject(true);
  if (normalized === "lock") return toggleSelectedStudioFlag("locked");
  if (normalized === "anchor") return toggleSelectedStudioFlag("anchored");
  if (["explorer", "properties", "toolbox"].includes(normalized)) return toggleStudioPanel(normalized);
  if (["show-explorer", "show-properties", "show-toolbox"].includes(normalized)) return showStudioPanel(normalized.replace("show-", ""));
  if (normalized === "reset-layout") return resetStudioLayout();
  if (normalized === "focus-selected") return focusSelectedStudioObject();
  if (normalized === "assets" || normalized === "find") {
    showStudioPanel("toolbox");
    const search = document.querySelector("#studioAssetSearch") || document.querySelector("#studioExplorerSearch");
    search?.focus();
    studioStatus("Search is ready.");
    return;
  }
  if (normalized === "settings" || normalized === "experience-settings") {
    showStudioPanel("toolbox");
    document.querySelector("#studioGenre")?.focus();
    studioStatus("Project settings are open in the Toolbox panel.");
    return;
  }
  if (normalized === "avatar-settings") {
    studioEditor.ribbonTab = "avatar";
    renderStudioRibbon();
    studioStatus("Avatar tools are open.");
    return;
  }
  if (normalized === "open-configs") {
    showStudioPanel("explorer");
    studioEditor.selectedService = "Server Scripts";
    renderStudioExplorer();
    studioStatus("Server Scripts configs are open. Use + Script, + Folder, or + Sound.");
    return;
  }
  if (normalized === "studio-settings") {
    showStudioPanel("toolbox");
    document.querySelector("#studioWorldSize")?.focus();
    studioStatus("Studio settings are ready. Adjust world size, sky, ground, and project details.");
    return;
  }
  if (normalized === "beta-features") {
    studioEditor.project.studioWorld.sky = "#b9e6ff";
    document.querySelector("#studioSky").value = "#b9e6ff";
    renderStudioSceneObjects();
    studioStatus("Beta lighting preview enabled.");
    return;
  }
  if (normalized === "shortcuts") {
    studioStatus("Shortcuts: WASD moves the Studio camera, RMB orbits, wheel zooms, Ctrl+S saves, Alt+P publishes.");
    return;
  }
  if (normalized === "about-studio" || normalized === "help-controls" || normalized === "publishing-guide") {
    studioStatus(normalized === "publishing-guide" ? "Publish saves this world and adds it to the CUBIXIA Games page." : "CUBIXIA Studio builds playable 3D games directly into your platform.");
    return;
  }
  if (normalized === "adaptive") {
    const object = selectedStudioObject();
    if (!object) return studioStatus("Select an object first.");
    object.size.x = roundStudioNumber(object.size.x * 1.25);
    object.size.y = roundStudioNumber(object.size.y * 1.25);
    object.size.z = roundStudioNumber(object.size.z * 1.25);
    renderStudioEditor();
    studioStatus(`${object.name} adapted larger.`);
    return;
  }
  if (normalized === "clip") {
    const object = selectedStudioObject();
    if (!object) return studioStatus("Select an object first.");
    object.rotation = object.rotation || { x: 0, y: Number(object.rotationY || 0), z: 0 };
    object.rotation.z = roundStudioNumber(Number(object.rotation.z || 0) + 0.5);
    object.rotationY = object.rotation.y;
    renderStudioEditor();
    studioStatus(`${object.name} clipped/rotated.`);
    return;
  }
  if (normalized === "back") return selectStudioOffset(-1);
  if (normalized === "forward") return selectStudioOffset(1);
  if (normalized === "delete" || normalized === "clear") {
    if (normalized === "clear") {
      document.querySelector("#studioMessage").textContent = "";
      return;
    }
    return deleteSelectedStudioObject();
  }
  if (normalized === "format" || normalized === "layout" || normalized === "constraint") return snapSelectedStudioObject();
  if (normalized === "go-line") return selectStudioObjectByNumber();
  if (normalized === "command") {
    document.querySelector("#studioCommandInput")?.focus();
    return;
  }
  if (normalized === "collaborate") {
    navigator.clipboard?.writeText(location.origin).catch(() => {});
    studioStatus("Share link copied when browser permissions allow it. Other players can use this server URL.");
    return;
  }
  if (normalized === "file") {
    studioStatus("File menu: Save Draft, Publish, and New Place are ready on the toolbar.");
    return;
  }
  if (normalized === "edit") {
    duplicateSelectedStudioObject();
    studioStatus("Edit menu duplicated the selected object.");
    return;
  }
  if (normalized === "duplicate") return duplicateSelectedStudioObject();
  if (normalized === "undo" || normalized === "redo") {
    studioStatus(`${normalized === "undo" ? "Undo" : "Redo"} is ready for the next Studio history pass.`);
    return;
  }
  if (normalized === "view") {
    handleStudioCommand("stop");
    studioStatus("View menu reset the camera.");
    return;
  }
  if (normalized === "plugins") {
    studioEditor.ribbonTab = "plugins";
    renderStudioRibbon();
    return;
  }
  if (normalized === "test") {
    studioStatus("Test menu launching Play mode.");
    return testStudioProject();
  }
  if (normalized === "window") {
    toggleStudioPanel("explorer");
    toggleStudioPanel("properties");
    return;
  }
  if (normalized === "help") {
    studioStatus("Studio controls: LMB selects, Move/Scale/Rotate drag objects, RMB orbits, mouse wheel zooms.");
    return;
  }
  studioStatus(`${normalized.replace(/-/g, " ")} is active in this Studio build.`);
}

function studioProjectSnapshot() {
  syncStudioProjectFromForm();
  return {
    id: studioEditor.project.id,
    title: studioEditor.project.title,
    genre: studioEditor.project.genre,
    description: studioEditor.project.description,
    studioWorld: studioEditor.project.studioWorld
  };
}

function downloadStudioText(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportStudioProjectFile(format) {
  const project = studioProjectSnapshot();
  const safeTitle = (project.title || "cubixia-place").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "cubixia-place";
  if (format === "json") {
    downloadStudioText(`${safeTitle}.cubixia.json`, JSON.stringify(project, null, 2), "application/json");
    studioStatus("Project downloaded as a CUBIXIA Studio file.");
    return;
  }
  if (format === "gltf") {
    const gltf = {
      asset: { version: "2.0", generator: "CUBIXIA Studio" },
      scene: 0,
      scenes: [{ nodes: (project.studioWorld.objects || []).map((_, index) => index) }],
      nodes: (project.studioWorld.objects || []).map((object) => ({
        name: object.name,
        translation: [object.position.x, object.position.y, object.position.z],
        scale: [object.size.x, object.size.y, object.size.z],
        rotation: [object.rotation?.x || 0, object.rotation?.y || object.rotationY || 0, object.rotation?.z || 0]
      }))
    };
    downloadStudioText(`${safeTitle}.gltf`, JSON.stringify(gltf, null, 2), "model/gltf+json");
    studioStatus("World layout exported as glTF metadata.");
    return;
  }
  const lines = [`# ${project.title}`, "# Exported from CUBIXIA Studio"];
  (project.studioWorld.objects || []).forEach((object) => {
    lines.push(`o ${object.name.replace(/\s+/g, "_")}`);
    lines.push(`# type=${object.type} asset=${object.asset || object.type} position=${object.position.x},${object.position.y},${object.position.z} size=${object.size.x},${object.size.y},${object.size.z}`);
  });
  downloadStudioText(`${safeTitle}.obj`, lines.join("\n"), "text/plain");
  studioStatus("World object list exported as .obj text.");
}

function openStudioProjectFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,.cubixia,application/json";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        const base = defaultStudioProject(currentUser);
        const world = parsed.studioWorld || {};
        studioEditor.project = {
          ...base,
          ...parsed,
          id: parsed.id || cryptoId(),
          title: parsed.title || file.name.replace(/\.[^.]+$/, "") || "Imported CUBIXIA Game",
          studioWorld: {
            ...base.studioWorld,
            ...world,
            size: Number(world.size || base.studioWorld.size || 160),
            objects: Array.isArray(world.objects) ? world.objects : [],
            services: { ...defaultStudioServices(), ...(world.services || {}) }
          }
        };
        studioEditor.selectedId = studioEditor.project.studioWorld.objects[0]?.id || "";
        syncStudioFormFromProject();
        renderStudioEditor();
        renderStudioSceneObjects();
        studioStatus(`${studioEditor.project.title} opened from file.`);
      } catch (error) {
        studioStatus("That file was not a valid CUBIXIA Studio project.");
      }
    });
    reader.readAsText(file);
  });
  input.click();
}

function syncStudioFormFromProject() {
  const project = studioEditor?.project;
  if (!project) return;
  const world = project.studioWorld || {};
  const values = {
    studioTitle: project.title || "Untitled CUBIXIA Game",
    studioGenre: project.genre || "Creator",
    studioDescription: project.description || "",
    studioSky: world.sky || "#91d7ff",
    studioGround: world.ground || "#5fbd82",
    studioWorldSize: Number(world.size || 160)
  };
  Object.entries(values).forEach(([id, value]) => {
    const input = document.querySelector(`#${id}`);
    if (input) input.value = value;
  });
  const sizeValue = document.querySelector("#studioWorldSizeValue");
  if (sizeValue) sizeValue.textContent = String(values.studioWorldSize);
}

async function saveStudioProjectAs(publish = false) {
  const title = prompt(publish ? "Publish as game title:" : "Save as project title:", studioEditor.project.title || "Untitled CUBIXIA Game");
  if (!title) return;
  studioEditor.project = {
    ...studioEditor.project,
    id: cryptoId(),
    title: title.trim() || "Untitled CUBIXIA Game",
    published: false
  };
  syncStudioFormFromProject();
  if (publish) return publishStudioProject();
  return saveStudioProject(false);
}

function addStudioObject(type, asset = "") {
  const object = createStudioObject(type, asset);
  studioEditor.project.studioWorld.objects.push(object);
  studioEditor.selectedId = object.id;
  renderStudioEditor();
  studioStatus(`${object.name} added.`);
}

function addStudioServiceItem(type) {
  const service = studioEditor.selectedService || "Server Scripts";
  studioEditor.project.studioWorld.services = { ...defaultStudioServices(), ...(studioEditor.project.studioWorld.services || {}) };
  const actualType = type === "sound" ? "sound" : type === "folder" ? "folder" : type === "ui" ? "ui" : type === "remote" ? "remote" : "script";
  const names = { script: "Script", folder: "Folder", sound: "Sound", ui: "ScreenGui", remote: "RemoteEvent" };
  studioEditor.project.studioWorld.services[service].push({
    id: cryptoId(),
    type: actualType,
    name: `${service} ${names[actualType] || "Item"}`
  });
  renderStudioExplorer();
  studioStatus(`${names[actualType] || "Item"} added to ${service}.`);
}

function createStudioObject(type, asset = "") {
  const defaults = {
    block: ["Block", "#315cff", "static", { x: 2, y: 1, z: 2 }, "block"],
    part: ["Part", "#315cff", "static", { x: 2, y: 1, z: 2 }, "block"],
    platform: ["Platform", "#38aef3", "bounce", { x: 4, y: 0.35, z: 4 }, "platform"],
    terrain: ["Terrain Plate", "#75b978", "static", { x: 10, y: 0.25, z: 10 }, "platform"],
    coin: ["Cubbit", "#ffcf55", "collect", { x: 0.6, y: 0.6, z: 0.6 }, "coin"],
    apple: ["Apple", "#d92929", "collect", { x: 0.9, y: 0.9, z: 0.9 }, "coin"],
    pizza: ["Pizza", "#f6c85f", "collect", { x: 1.3, y: 0.18, z: 1.3 }, "coin"],
    hazard: ["Hazard", "#ff575f", "damage", { x: 2, y: 0.35, z: 2 }, "hazard"],
    sword: ["Sword", "#c8d1dc", "damage", { x: 0.55, y: 3.4, z: 0.22 }, "hazard"],
    npc: ["NPC", "#8b5cf6", "static", { x: 0.9, y: 1.4, z: 0.9 }, "npc"],
    character: ["Character", "#8b5cf6", "static", { x: 0.9, y: 1.4, z: 0.9 }, "npc"],
    tree: ["Tree", "#2f9e55", "static", { x: 1.2, y: 2.8, z: 1.2 }, "tree"],
    bush: ["Realistic Bush", "#2f9e55", "static", { x: 2.4, y: 1.4, z: 2.4 }, "tree"],
    spawn: ["Spawn", "#44db78", "spawn", { x: 1.4, y: 0.14, z: 1.4 }, "spawn"],
    setup: ["Spawn", "#44db78", "spawn", { x: 1.4, y: 0.14, z: 1.4 }, "spawn"],
    gui: ["GUI Panel", "#f472b6", "static", { x: 2.2, y: 1.2, z: 0.18 }, "block"],
    frame: ["UI Frame", "#f472b6", "static", { x: 2.4, y: 1.4, z: 0.18 }, "block"],
    label: ["Text Label", "#a78bfa", "static", { x: 2, y: 0.5, z: 0.16 }, "block"],
    input: ["Text Input", "#60a5fa", "static", { x: 2, y: 0.45, z: 0.16 }, "block"],
    script: ["Script Trigger", "#73d13d", "bounce", { x: 1.4, y: 0.45, z: 1.4 }, "block"],
    import: ["Imported Model", "#f59e0b", "static", { x: 1.6, y: 1.6, z: 1.6 }, "block"],
    accessory: ["Accessory Pickup", "#ffd166", "collect", { x: 0.7, y: 0.7, z: 0.7 }, "coin"]
  };
  const assetDefaults = {
    "monster-super-car": ["Monster Super Car", "#1f2937", "static", { x: 3.4, y: 1.6, z: 5.2 }, "block"],
    "sports-car": ["Sports Car", "#f43f5e", "static", { x: 2.7, y: 1.05, z: 4.4 }, "block"],
    "tesla-car": ["Tesla Car", "#f8fafc", "static", { x: 2.8, y: 1.15, z: 4.6 }, "block"],
    sword: ["Sword", "#c8d1dc", "damage", { x: 0.55, y: 3.4, z: 0.22 }, "hazard"],
    "realistic-bush": ["Realistic Bush", "#2f9e55", "static", { x: 2.4, y: 1.4, z: 2.4 }, "tree"],
    "flower-bush": ["Bush with Flower", "#2f9e55", "static", { x: 2.4, y: 1.35, z: 2.4 }, "tree"],
    apple: ["Apple", "#d92929", "collect", { x: 0.9, y: 0.9, z: 0.9 }, "coin"],
    pizza: ["Pizza", "#f6c85f", "collect", { x: 1.3, y: 0.18, z: 1.3 }, "coin"],
    "pizza-slice": ["Pizza Decoration", "#f6c85f", "collect", { x: 1.25, y: 0.16, z: 1.05 }, "coin"]
  };
  const [name, color, behavior, size, actualType] = assetDefaults[asset] || defaults[type] || defaults.block;
  const count = studioEditor?.project?.studioWorld?.objects?.length || 0;
  return {
    id: cryptoId(),
    type: actualType,
    name,
    asset: asset || type,
    color,
    material: actualType === "coin" ? "metal" : "plastic",
    locked: false,
    anchored: true,
    behavior,
    position: { x: -5 + (count % 5) * 2.5, y: actualType === "coin" ? 0.3 : 0, z: -2 + Math.floor(count / 5) * 2.5 },
    size: { ...size },
    rotation: { x: 0, y: 0, z: 0 },
    rotationY: 0
  };
}

function studioToolboxItems() {
  return [
    { name: "PIZZA!", type: "pizza", asset: "pizza", icon: "PI" },
    { name: "Apple", type: "apple", asset: "apple", icon: "AP" },
    { name: "Pizza Decoration", type: "pizza", asset: "pizza-slice", icon: "PD" },
    { name: "3D Logo Sign", type: "gui", icon: "3D" },
    { name: "Realistic Bush", type: "bush", asset: "realistic-bush", icon: "RB" },
    { name: "Bush with Flower", type: "bush", asset: "flower-bush", icon: "BF" },
    { name: "Monster Super Car", type: "import", asset: "monster-super-car", icon: "MC" },
    { name: "Sports Car", type: "import", asset: "sports-car", icon: "SC" },
    { name: "Tesla Car", type: "import", asset: "tesla-car", icon: "TC" },
    { name: "Sword", type: "sword", asset: "sword", icon: "SW" },
    { name: "Old Wooden Table", type: "part", icon: "TB" },
    { name: "Animation Player Script", type: "script", icon: "</>" }
  ];
}

function studioIcon(type) {
  return { block: "#", platform: "=", coin: "o", hazard: "!", npc: "@", tree: "^", spawn: "+" }[type] || "#";
}

function studioCommandIcon(command) {
  return {
    select: "A", move: "+", scale: "[]", rotate: "O", transform: "T", part: "#", terrain: "~", character: "@", gui: "UI", script: "{}", import: "In",
    material: "M", color: "C", group: "G", lock: "L", anchor: "An", explorer: "Ex", properties: "Pr", toolbox: "Tb", assets: "As",
    settings: "S", setup: "St", accessory: "+", adaptive: "Ad", clip: "Cl", frame: "Fr", label: "La", input: "In", appearance: "Ap",
    layout: "Ly", constraint: "Cn", style: "St", back: "<", forward: ">", format: "F", find: "Q", "go-line": "12", command: "$",
    output: "Out", breakpoints: "Bp", "call-stack": "Cs", watch: "W", analysis: "An", activity: "Ac", save: "Sv", publish: "Pb", play: "Play",
    folder: "Fd", sound: "So", remote: "Re", ui: "UI", "add-script": "+S", "add-folder": "+F", "add-sound": "+A"
  }[command] || "*";
}

function filterStudioToolbox() {
  const term = document.querySelector("#studioAssetSearch").value.toLowerCase();
  document.querySelectorAll("[data-toolbox-item]").forEach((button) => {
    button.hidden = !button.dataset.toolboxItem.includes(term);
  });
}

function selectedStudioObject() {
  return studioEditor?.project?.studioWorld?.objects?.find((entry) => entry.id === studioEditor.selectedId);
}

function handleStudioPointerMove(event) {
  if (!studioEditor) return;
  if (studioEditor.orbit?.rotating) {
    const dx = event.clientX - studioEditor.orbit.lastX;
    const dy = event.clientY - studioEditor.orbit.lastY;
    studioEditor.orbit.lastX = event.clientX;
    studioEditor.orbit.lastY = event.clientY;
    studioEditor.orbit.yaw -= dx * 0.008;
    studioEditor.orbit.pitch = Math.max(0.08, Math.min(1.35, studioEditor.orbit.pitch + dy * 0.006));
    updateStudioCamera();
    return;
  }
  if (!studioEditor.drag) return;
  const object = selectedStudioObject();
  if (!object || object.locked) return;
  const dx = event.clientX - studioEditor.drag.startX;
  const dy = event.clientY - studioEditor.drag.startY;
  const original = studioEditor.drag.original;
  if (studioEditor.drag.tool === "move" || studioEditor.drag.tool === "transform") {
    object.position.x = roundStudioNumber(original.position.x + dx / 18);
    object.position.z = roundStudioNumber(original.position.z + dy / 18);
  }
  if (studioEditor.drag.tool === "scale") {
    const factor = Math.max(0.15, 1 + (dx - dy) / 90);
    object.size.x = roundStudioNumber(Math.max(0.2, original.size.x * factor));
    object.size.y = roundStudioNumber(Math.max(0.2, original.size.y * factor));
    object.size.z = roundStudioNumber(Math.max(0.2, original.size.z * factor));
  }
  if (studioEditor.drag.tool === "rotate") {
    object.rotation = object.rotation || { x: 0, y: Number(object.rotationY || 0), z: 0 };
    object.rotation.y = roundStudioNumber(Number(original.rotation?.y ?? original.rotationY ?? 0) + dx / 70);
    object.rotation.x = roundStudioNumber(Number(original.rotation?.x || 0) + dy / 100);
    object.rotationY = object.rotation.y;
  }
  renderStudioEditor();
}

function updateStudioCamera() {
  if (!studioEditor?.camera || !THREE_CACHE) return;
  const orbit = studioEditor.orbit;
  const target = orbit.target;
  const distance = orbit.distance;
  const x = target.x + Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * distance;
  const y = target.y + Math.sin(orbit.pitch) * distance;
  const z = target.z + Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * distance;
  studioEditor.camera.position.set(x, y, z);
  studioEditor.camera.lookAt(target);
}

function moveStudioCamera() {
  if (!studioEditor?.orbit || !THREE_CACHE) return;
  const keys = studioEditor.moveKeys || {};
  const speed = keys.q || keys.e ? 0.28 : 0.42;
  const yaw = studioEditor.orbit.yaw;
  let forward = 0;
  let right = 0;
  if (keys.w) forward -= 1;
  if (keys.s) forward += 1;
  if (keys.d) right += 1;
  if (keys.a) right -= 1;
  if (!forward && !right && !keys.q && !keys.e) return;
  const target = studioEditor.orbit.target;
  target.x += Math.sin(yaw) * forward * speed + Math.cos(yaw) * right * speed;
  target.z += Math.cos(yaw) * forward * speed - Math.sin(yaw) * right * speed;
  if (keys.e) target.y += speed;
  if (keys.q) target.y -= speed;
  const limit = Math.max(20, Number(studioEditor.project.studioWorld.size || 160) / 2);
  target.x = Math.max(-limit, Math.min(limit, target.x));
  target.y = Math.max(0, Math.min(80, target.y));
  target.z = Math.max(-limit, Math.min(limit, target.z));
  updateStudioCamera();
}

function roundStudioNumber(value) {
  return Math.round(Number(value) * 100) / 100;
}

function studioStatus(text) {
  const message = document.querySelector("#studioMessage");
  if (message) message.textContent = text;
}

function cycleSelectedStudioMaterial() {
  const object = selectedStudioObject();
  if (!object) return studioStatus("Select an object first.");
  const materials = ["plastic", "metal", "neon", "wood", "glass"];
  object.material = materials[(materials.indexOf(object.material || "plastic") + 1) % materials.length];
  renderStudioEditor();
  studioStatus(`${object.name} material set to ${object.material}.`);
}

function cycleSelectedStudioColor() {
  const object = selectedStudioObject();
  if (!object) return studioStatus("Select an object first.");
  const colors = ["#315cff", "#38aef3", "#44db78", "#ffcf55", "#ff575f", "#8b5cf6", "#f472b6"];
  object.color = colors[(colors.indexOf(object.color || colors[0]) + 1) % colors.length];
  renderStudioEditor();
  studioStatus(`${object.name} color changed.`);
}

function duplicateSelectedStudioObject(groupMode = false) {
  const object = selectedStudioObject();
  if (!object) return studioStatus("Select an object first.");
  const copies = groupMode ? 3 : 1;
  for (let index = 0; index < copies; index += 1) {
    const copy = JSON.parse(JSON.stringify(object));
    copy.id = cryptoId();
    copy.name = groupMode ? `${object.name} Group ${index + 1}` : `${object.name} Copy`;
    copy.position.x = roundStudioNumber(Number(copy.position.x || 0) + 1.4 * (index + 1));
    copy.position.z = roundStudioNumber(Number(copy.position.z || 0) + (groupMode ? 1.2 : 0));
    studioEditor.project.studioWorld.objects.push(copy);
    studioEditor.selectedId = copy.id;
  }
  renderStudioEditor();
  studioStatus(groupMode ? "Grouped copies added." : "Object duplicated.");
}

function toggleSelectedStudioFlag(flag) {
  const object = selectedStudioObject();
  if (!object) return studioStatus("Select an object first.");
  object[flag] = !object[flag];
  renderStudioEditor();
  studioStatus(`${object.name} ${flag} is now ${object[flag] ? "on" : "off"}.`);
}

function toggleStudioPanel(panel) {
  studioEditor.closedPanels = studioEditor.closedPanels || new Set();
  if (studioEditor.closedPanels.has(panel)) studioEditor.closedPanels.delete(panel);
  else studioEditor.closedPanels.add(panel);
  applyStudioPanelVisibility();
  studioStatus(`${panel} panel ${studioEditor.closedPanels.has(panel) ? "hidden" : "shown"}.`);
}

function showStudioPanel(panel) {
  studioEditor.closedPanels = studioEditor.closedPanels || new Set();
  studioEditor.closedPanels.delete(panel);
  applyStudioPanelVisibility();
  studioStatus(`${panel} panel shown.`);
}

function resetStudioLayout() {
  studioEditor.closedPanels = new Set();
  applyStudioPanelVisibility();
  studioStatus("Studio layout reset.");
}

function applyStudioPanelVisibility() {
  if (!studioEditor) return;
  const closed = studioEditor.closedPanels || new Set();
  const dock = document.querySelector(".studio-dock");
  const side = document.querySelector(".studio-side-panels");
  const toolbox = document.querySelector("#studioToolboxPanel");
  const explorer = document.querySelector("#studioExplorerPanel");
  const properties = document.querySelector("#studioPropertiesPanel");
  toolbox?.classList.toggle("is-hidden", closed.has("toolbox"));
  explorer?.classList.toggle("is-hidden", closed.has("explorer"));
  properties?.classList.toggle("is-hidden", closed.has("properties"));
  const hasSide = !closed.has("explorer") || !closed.has("properties");
  if (side) {
    side.classList.toggle("is-hidden", !hasSide);
    side.style.gridTemplateRows = !closed.has("explorer") && !closed.has("properties") ? "1fr 1fr" : "1fr";
  }
  if (dock) {
    const left = closed.has("toolbox") ? "0px" : "280px";
    const right = hasSide ? "312px" : "0px";
    dock.style.gridTemplateColumns = `${left} minmax(420px, 1fr) ${right}`;
  }
  setTimeout(() => {
    if (!studioEditor?.camera || !studioEditor?.mount || !studioEditor?.renderer) return;
    studioEditor.camera.aspect = studioEditor.mount.clientWidth / studioEditor.mount.clientHeight;
    studioEditor.camera.updateProjectionMatrix();
    studioEditor.renderer.setSize(studioEditor.mount.clientWidth, studioEditor.mount.clientHeight);
  }, 30);
}

function focusSelectedStudioObject() {
  const object = selectedStudioObject();
  if (!object || !studioEditor?.orbit || !THREE_CACHE) return studioStatus("Select an object first.");
  studioEditor.orbit.target.set(Number(object.position.x || 0), Number(object.position.y || 0), Number(object.position.z || 0));
  updateStudioCamera();
  studioStatus(`${object.name} focused.`);
}

function selectStudioOffset(offset) {
  const objects = studioEditor.project.studioWorld.objects;
  const index = objects.findIndex((object) => object.id === studioEditor.selectedId);
  const next = objects[(index + offset + objects.length) % objects.length];
  if (next) {
    studioEditor.selectedId = next.id;
    renderStudioEditor();
  }
}

function deleteSelectedStudioObject() {
  const object = selectedStudioObject();
  if (!object) return studioStatus("Select an object first.");
  studioEditor.project.studioWorld.objects = studioEditor.project.studioWorld.objects.filter((entry) => entry.id !== object.id);
  studioEditor.selectedId = studioEditor.project.studioWorld.objects[0]?.id || "";
  renderStudioEditor();
  studioStatus(`${object.name} deleted.`);
}

function scaleSelectedStudioSide(side) {
  const object = selectedStudioObject();
  if (!object) return studioStatus("Select an object first.");
  if (object.locked) return studioStatus("Unlock the object before scaling.");
  const axis = side[0];
  const direction = side.endsWith("+") ? 1 : -1;
  object.size[axis] = roundStudioNumber(Math.max(0.2, Number(object.size[axis] || 1) + 0.5));
  object.position[axis] = roundStudioNumber(Number(object.position[axis] || 0) + direction * 0.25);
  renderStudioEditor();
  studioStatus(`${object.name} scaled on ${side.toUpperCase()} side.`);
}

function snapSelectedStudioObject() {
  const object = selectedStudioObject();
  if (!object) return studioStatus("Select an object first.");
  object.position.x = Math.round(Number(object.position.x || 0));
  object.position.y = Math.max(0, Math.round(Number(object.position.y || 0) * 2) / 2);
  object.position.z = Math.round(Number(object.position.z || 0));
  renderStudioEditor();
  studioStatus(`${object.name} snapped to grid.`);
}

function selectStudioObjectByNumber() {
  const raw = prompt("Object number in Explorer?");
  const index = Number(raw) - 1;
  const object = studioEditor.project.studioWorld.objects[index];
  if (object) {
    studioEditor.selectedId = object.id;
    renderStudioEditor();
    studioStatus(`${object.name} selected.`);
  }
}

function cryptoId() {
  return `obj-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36).slice(-4)}`;
}

function messagesPage(user) {
  currentUser = user;
  stopRuntime();
  app.innerHTML = `
    <section class="dashboard">
      ${nav()}
      <div class="chat-layout">
        <section class="panel">
          <div class="section-head"><h2>Chat</h2><span>global CUBIXIA</span></div>
          <div id="chatMessages" class="chat-messages"></div>
          <form id="chatForm" class="chat-form">
            <input name="text" placeholder="Chat with CUBIXIA" maxlength="180" required />
            <button>Send</button>
          </form>
        </section>
        <section class="panel">
          <div class="section-head"><h2>Friends</h2><span>${user.friendProfiles.length}</span></div>
          ${user.friendProfiles.map((friend) => `<button class="chat-friend">${avatar(friend, "tiny")} ${escapeHtml(friend.username)}</button>`).join("") || `<p class="empty">Add friends to direct message them.</p>`}
        </section>
      </div>
    </section>
  `;
  bindRoutes();
  bindSessionButtons();
  bindChat();
}

async function communitiesPage(selectedId = communityState.selectedId || "cubixia-studios") {
  stopRuntime();
  const data = await api("/api/groups").catch(() => ({ groups: [], user: currentUser }));
  if (data.user) currentUser = data.user;
  communityState.groups = data.groups || [];
  communityState.selectedId = selectedId;
  const group = communityState.groups.find((entry) => entry.id === selectedId) || communityState.groups[0];
  const myGroups = communityState.groups.filter((entry) => entry.joined || entry.canEdit);
  app.innerHTML = `
    <section class="dashboard">
      ${nav()}
      <main class="communities-shell">
        <section class="community-browser panel">
          <div class="section-head"><h1>Groups</h1><span>See All</span></div>
          <div class="community-search">Search My Groups</div>
          <h3>Primary</h3>
          ${groupListButton(communityState.groups.find((entry) => entry.id === "cubixia-studios") || group)}
          <h3>My Groups</h3>
          <div class="mini-community-list">${myGroups.map(groupListButton).join("") || `<p class="empty">Join a group to see it here.</p>`}</div>
          <div class="tos-bottom"><button id="readTosBtn">Read TOS?</button></div>
        </section>
        <section class="community-detail panel">
          ${group ? communityDetail(group) : `<p class="empty">No groups loaded.</p>`}
        </section>
      </main>
    </section>
  `;
  bindRoutes();
  bindSessionButtons();
  bindGroups();
  bindCommunityDetail();
}

function groupListButton(group) {
  if (!group) return "";
  return `
    <button class="mini-community ${group.id === communityState.selectedId ? "active" : ""}" data-group-view="${escapeHtml(group.id)}">
      <span class="mini-logo">${escapeHtml(group.logo || group.name.slice(0, 2).toUpperCase())}</span>
      <span><strong>${escapeHtml(group.name)}</strong><small>${Number(group.members || 0).toLocaleString()} members${group.canEdit ? " - Owned" : ""}</small></span>
    </button>
  `;
}

function communityDetail(group) {
  const tab = communityState.tab || "about";
  return `
    <header class="community-hero">
      <div class="community-logo big">${escapeHtml(group.logo || "CX")}</div>
      <div>
        <h1>${escapeHtml(group.name)}</h1>
        <p>By ${escapeHtml(group.owner)}</p>
      </div>
      ${group.joined ? `<button class="more-btn">...</button>` : `<button class="primary-btn" data-group="${escapeHtml(group.id)}">Join</button>`}
    </header>
    <div class="community-stats">
      <span>${Number(group.members || 0).toLocaleString()} Members</span>
      <span>${escapeHtml(group.rank || "Guest")} Rank</span>
      <span>${group.memberProfiles?.filter((member) => member.online).length || 0} Active</span>
      <span>${Number(group.favorites || 0).toLocaleString()} Favorites</span>
      <span>${Number(group.visits || 0).toLocaleString()} Visits</span>
      <span>${new Date(group.createdAt || Date.now()).toLocaleString()} Created</span>
    </div>
    <p>${escapeHtml(group.description || "No bio yet.")}</p>
    <div class="community-callout"><strong>NEW: Assign multiple roles per member!</strong><span>Layer permissions and custom ranks for your community.</span></div>
    <div class="community-tabs">
      <button class="${tab === "about" ? "active" : ""}" data-community-tab="about">About</button>
      <button class="${tab === "members" ? "active" : ""}" data-community-tab="members">Members</button>
      <button class="${tab === "announcements" ? "active" : ""}" data-community-tab="announcements">Announcements</button>
      ${group.canEdit ? `<button class="${tab === "edit" ? "active" : ""}" data-community-tab="edit">Edit</button>` : ""}
    </div>
    <div class="community-tab-body">${communityTabBody(group, tab)}</div>
  `;
}

function communityTabBody(group, tab) {
  if (tab === "members") {
    return `
      <h2>Members</h2>
      <div class="community-members">${(group.memberProfiles || []).map((member) => `
        <div class="community-member">${avatar(member, "tiny")}<div><strong>${escapeHtml(member.username)}</strong><small>${escapeHtml(member.rank || "Member")} | ${member.online ? "Online" : "Offline"}</small></div></div>
      `).join("") || `<p class="empty">No members yet.</p>`}</div>
    `;
  }
  if (tab === "announcements") {
    return `
      <div class="section-head"><h2>Announcements</h2>${group.canEdit ? `<button class="primary-btn" data-community-tab="edit">Create</button>` : ""}</div>
      <div class="community-announcements">${(group.announcements || []).map((note) => `
        <article><strong>${escapeHtml(note.title)}</strong><small>${new Date(note.createdAt).toLocaleString()}</small><p>${escapeHtml(note.body)}</p></article>
      `).join("") || `<p class="empty">No announcements yet.</p>`}</div>
    `;
  }
  if (tab === "edit" && group.canEdit) {
    return `
      <h2>Edit Community</h2>
      <form id="communityEditForm" class="community-edit-form">
        <input name="name" value="${escapeHtml(group.name)}" placeholder="Community name" required />
        <input name="logo" value="${escapeHtml(group.logo || "CX")}" placeholder="Logo text" maxlength="4" />
        <textarea name="description" placeholder="Community description" required>${escapeHtml(group.description || "")}</textarea>
        <input name="announcementTitle" placeholder="Announcement title" />
        <textarea name="announcementBody" placeholder="Announcement body"></textarea>
        <button class="primary-btn">Save Community</button>
        <div class="message" id="communityEditMessage"></div>
      </form>
    `;
  }
  return `
    <h2>About</h2>
    <p>${escapeHtml(group.description || "No bio yet.")}</p>
    <div class="role-list">${(group.roles || []).map((role) => `<span>${escapeHtml(role)}</span>`).join("")}</div>
  `;
}

function bindCommunityDetail() {
  document.querySelectorAll("[data-group-view]").forEach((button) => {
    button.addEventListener("click", () => {
      communityState.tab = "about";
      communitiesPage(button.dataset.groupView);
    });
  });
  document.querySelectorAll("[data-community-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      communityState.tab = button.dataset.communityTab;
      communitiesPage(communityState.selectedId);
    });
  });
  document.querySelector("#communityEditForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.querySelector("#communityEditMessage");
    try {
      const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
      payload.groupId = communityState.selectedId;
      const data = await api("/api/groups/update", { method: "POST", body: JSON.stringify(payload) });
      if (data.user) currentUser = data.user;
      communityState.groups = data.groups || communityState.groups;
      communityState.tab = "announcements";
      communitiesPage(communityState.selectedId);
    } catch (error) {
      message.textContent = error.message;
    }
  });
  document.querySelector("#readTosBtn")?.addEventListener("click", showTosGuide);
}

function showTosGuide() {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop tos-backdrop";
  modal.innerHTML = `
    <section class="modal tos-modal">
      <h2>CUBIXIA Terms Of Service Guide</h2>
      <p>This guide explains the community rules for accounts, chat, games, groups, characters, Cubbits, moderation, and safety.</p>
      <ol>
        <li><strong>Respect players.</strong> No harassment, bullying, threats, hate speech, or targeting people for who they are.</li>
        <li><strong>Keep chat safe.</strong> Do not post explicit content, personal information, scams, spam, or bypass filtered words.</li>
        <li><strong>Play fair.</strong> Exploits, cheats, automation, griefing, and bug abuse can lead to warnings, kicks, timeouts, or bans.</li>
        <li><strong>Protect accounts.</strong> Do not share passwords, steal accounts, impersonate staff, or trick users into giving private info.</li>
        <li><strong>Use Cubbits honestly.</strong> Demo purchases and grants must not be abused. Shop gear stays tied to the account that bought it.</li>
        <li><strong>Follow group rules.</strong> Owners manage names, announcements, roles, and members. Group names and posts must stay appropriate.</li>
        <li><strong>Report problems.</strong> Reports go to moderators, admins, and the owner. False reports can be moderated too.</li>
        <li><strong>Moderation actions.</strong> Warnings, kicks, timeouts, and bans show the reason and may require acknowledgement before continuing.</li>
        <li><strong>Appeals and timers.</strong> Timed actions must finish before acknowledgement is available. Permanent actions require owner review.</li>
        <li><strong>Platform safety.</strong> CUBIXIA can update rules, remove unsafe content, or restrict accounts to protect players.</li>
      </ol>
      <button class="primary-btn" type="button">I read the TOS</button>
    </section>
  `;
  document.body.appendChild(modal);
  modal.querySelector("button").addEventListener("click", () => modal.remove());
}

function settingsPage(user) {
  currentUser = user;
  stopRuntime();
  app.innerHTML = `
    <section class="dashboard">
      ${nav()}
      <div class="settings-layout">
        <aside class="settings-tabs">
          <button class="active" data-settings-tab="account">Account info</button>
          <button data-settings-tab="security">Security</button>
          <button data-settings-tab="notifications">Notifications</button>
          <button data-settings-tab="privacy">Privacy</button>
          <button data-settings-tab="browser">Browser preferences</button>
        </aside>
        <section class="panel settings-main" id="settingsMain"></section>
      </div>
    </section>
  `;
  bindRoutes();
  bindSessionButtons();
  bindSettingsPage("account");
}

function bindSettingsPage(initialTab) {
  document.querySelectorAll("[data-settings-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-settings-tab]").forEach((tab) => tab.classList.toggle("active", tab === button));
      renderSettingsTab(button.dataset.settingsTab);
    });
  });
  renderSettingsTab(initialTab);
}

function renderSettingsTab(tab) {
  const settings = currentUser.settings || {};
  const main = document.querySelector("#settingsMain");
  if (!main) return;
  if (tab === "account") {
    main.innerHTML = `
      <h1>Account Info</h1>
      <p><strong>Username:</strong> ${escapeHtml(currentUser.username)}</p>
      <p><strong>Email:</strong> ${maskEmail(currentUser.email)} <span class="verified">Verified</span></p>
      <p><strong>Role:</strong> ${escapeHtml((currentUser.role || "user").toUpperCase())}</p>
      <p><strong>Cubbits:</strong> ${Number(currentUser.cubbux || 0).toLocaleString()}</p>
    `;
    return;
  }
  if (tab === "security") {
    const twoStepOn = currentUser.twoStepEnabled !== false;
    main.innerHTML = `
      <h1>Security</h1>
      <section class="security-card">
        <div>
          <h2>2-Step Verification</h2>
          <p>${twoStepOn ? "Every login now asks for a one-time code sent to" : "Turn this on to require a one-time code from"} ${maskEmail(currentUser.email)}.</p>
        </div>
        <button class="${twoStepOn ? "ghost-btn" : "primary-btn"}" id="toggleTwoStep" type="button">${twoStepOn ? "Turn Off" : "Turn On"}</button>
      </section>
      <form id="passwordForm">
        <h2>Password</h2>
        <label>Current Password</label>
        <div class="plain-password-wrap"><input name="currentPassword" type="password" placeholder="Current password" required /><button type="button" data-toggle-password>Show</button></div>
        <label>New Password</label>
        <div class="plain-password-wrap"><input name="newPassword" type="password" placeholder="New password" minlength="6" required /><button type="button" data-toggle-password>Show</button></div>
        <button class="primary-btn">Change Password</button>
        <div class="message" id="message"></div>
      </form>
    `;
    bindPasswordToggles();
    document.querySelector("#passwordForm").addEventListener("submit", changePassword);
    document.querySelector("#toggleTwoStep").addEventListener("click", toggleTwoStep);
    return;
  }
  const groups = {
    notifications: [
      ["friendRequests", "Friend requests"],
      ["messages", "Messages"],
      ["gameUpdates", "Game updates"],
      ["moderation", "Moderation actions"]
    ],
    privacy: [
      ["profileVisible", "Profile visible"],
      ["showOnline", "Show online status"],
      ["allowFriendRequests", "Allow friend requests"],
      ["allowJoin", "Friends can join my game"],
      ["allowMessages", "Allow messages"]
    ],
    browser: [
      ["reduceMotion", "Reduce motion"],
      ["showPerformance", "Show performance stats"]
    ]
  };
  if (tab === "browser") {
    main.innerHTML = `
      <h1>Browser Preferences</h1>
      <form id="settingsForm" class="settings-switch-form">
        <label class="settings-field">Screen theme
          <select name="browser.theme">
            ${["auto", "light", "dark"].map((value) => `<option value="${value}" ${((settings.browser?.theme || "auto") === value) ? "selected" : ""}>${value === "auto" ? "Auto by time" : value === "light" ? "Light" : "Dark"}</option>`).join("")}
          </select>
        </label>
        ${groups.browser.map(([key, label]) => settingsToggle(`browser.${key}`, label, settings.browser?.[key])).join("")}
        <label class="settings-field">UI scale <input name="browser.uiScale" type="range" min="0.85" max="1.25" step="0.05" value="${settings.browser?.uiScale || 1}" /></label>
        <button class="primary-btn">Save Settings</button>
        <div class="message" id="settingsMessage"></div>
      </form>
    `;
  } else {
    const title = tab === "privacy" ? "Privacy" : "Notifications";
    main.innerHTML = `
      <h1>${title}</h1>
      <form id="settingsForm" class="settings-switch-form">
        ${groups[tab].map(([key, label]) => settingsToggle(`${tab}.${key}`, label, settings[tab]?.[key])).join("")}
        <button class="primary-btn">Save Settings</button>
        <div class="message" id="settingsMessage"></div>
      </form>
    `;
  }
  document.querySelector("#settingsForm").addEventListener("submit", saveAccountSettings);
  document.querySelector("[name='browser.theme']")?.addEventListener("change", (event) => {
    currentUser.settings = {
      ...(currentUser.settings || {}),
      browser: {
        ...(currentUser.settings?.browser || {}),
        theme: event.currentTarget.value
      }
    };
    applyAppearanceTheme(currentUser);
    const message = document.querySelector("#settingsMessage");
    if (message) message.textContent = "Theme preview applied. Click Save Settings to keep it.";
  });
}

function settingsToggle(name, label, checked) {
  return `<label class="settings-switch"><span>${label}</span><input name="${name}" type="checkbox" ${checked !== false ? "checked" : ""} /></label>`;
}

function gamePage(user, gameId = "cubixia-survival") {
  currentUser = user;
  const game = findGame(gameId);
  if (game.deleted) {
    alert("This game was deleted by CUBIXIA moderation and cannot be played.");
    return gamesPage();
  }
  stopRuntime();
  document.body.classList.add("game-active");
  app.innerHTML = `
    <section class="game-page ${gameId === "hide-seek" ? "hide-seek-page" : ""}">
      <div class="game-hud">
        <button class="brand game-brand" data-route="home"><span class="brand-mark"></span>CUBIXIA</button>
      <div><strong>${escapeHtml(game.title)}</strong><span id="gameStats">Loading 3D server...</span></div>
      <button id="escButton">Menu</button>
      </div>
      <div id="threeMount"></div>
      ${gameId === "hide-seek" ? hideSeekOverlay() : ""}
      <div class="emote-wheel hidden" id="emoteWheel">${["Wave", "Dance", "Laugh", "Cheer", "Point", "Sit"].map((name) => `<button data-emote="${name}">${name}</button>`).join("")}</div>
      <div class="staff-game-notice hidden" id="staffGameNotice"></div>
      <div class="game-chat hidden" id="gameChat">
        <div id="gameChatMessages"></div>
        <form id="gameChatForm"><input name="text" maxlength="180" placeholder="Chat or type /command" /><button>Send</button></form>
        <div id="gameChatStatus" class="game-chat-status" aria-live="polite"></div>
      </div>
      <div class="esc-menu hidden" id="escMenu">
        <div class="game-menu">
          <div class="menu-tabs"><button class="active" data-menu-tab="people">People</button><button data-menu-tab="settings">Settings</button><button data-menu-tab="captures">Captures</button><button data-menu-tab="report">Report</button><button data-menu-tab="help">Help</button></div>
          <div id="menuContent" class="menu-content">
            <button class="invite-btn">Invite Friends</button>
            <h2>In this server</h2>
            <div id="peopleList" class="people-list"></div>
          </div>
          <div class="menu-bottom">
            <button id="leaveGame">L Leave</button>
            <button id="resetGame">R Respawn</button>
            <button id="resumeGame">ESC Resume</button>
          </div>
        </div>
      </div>
    </section>
  `;
  bindRoutes();
  api("/api/progress", {
    method: "POST",
    body: JSON.stringify({ gameId, playing: true, progress: "In server", xp: user.lastPlayed?.xp || 0, currency: user.lastPlayed?.currency || 0 })
  })
    .then((data) => {
      currentUser = data.user;
    })
    .catch((error) => {
      if (error.data?.lockdown) return lockdownScreen(error.data.lockdown, error.data.user || currentUser);
      if (error.data?.moderation) return moderationScreen(error.data.user || currentUser, error.data.moderation);
      alert(error.message);
      gamesPage();
    });
  if (game.source === "studio") startStudioGame3D(user, game);
  else if (gameId === "coaster-tycoon") startTycoon3D(user, game);
  else if (gameId === "cubixia-survival") startSurvival3D(user, game);
  else startSandbox3D(user, game);
}

function hideSeekOverlay() {
  return `
    <aside class="hide-seek-ui" id="hideSeekUi">
      <div class="hide-round-card">
        <span class="hide-kicker">Box City Warehouse</span>
        <h2>Hide & Seek</h2>
        <div class="hide-timer"><strong id="hideSeekTimer">02:30</strong><span id="hideSeekPhase">Choose your role</span></div>
      </div>
      <div class="hide-tasks">
        <strong id="hideRoleName">Hider Loadout</strong>
        <span id="hideGoal">Collect hiding tags and stay out of open aisles.</span>
        <div class="hide-progress"><i id="hideProgressBar"></i></div>
      </div>
    </aside>
  `;
}

function sideRail() {
  return `
    <aside class="side-rail">
      <button data-route="home">Home</button>
      <button data-route="profile">Profile</button>
      <button data-route="messages">Chat</button>
      <button id="sideFriends">Friends</button>
      <button data-route="avatar">Character</button>
      <button data-route="marketplace">Shop</button>
      <button data-route="cubbux">Cubbits</button>
      <button data-route="games">Games</button>
      <button data-route="systems">Systems</button>
      <button data-route="communities">Groups</button>
      <button data-route="studio">Studio</button>
      <button data-route="about">About</button>
      ${canModerateUser(currentUser) ? `<button data-route="moderation">${moderationPanelTitle(currentUser)}</button>` : ""}
      <button data-route="settings">Settings</button>
    </aside>
  `;
}

function gameTile(game) {
  return `
    <article class="game-tile ${game.deleted ? "deleted-content" : ""}">
      <button class="game-thumb ${game.source === "studio" ? "studio-thumb" : game.id}" data-detail="${game.id}" ${game.deleted ? "disabled" : ""}><span>${escapeHtml(game.title)}</span></button>
      <h3>${escapeHtml(game.title)}</h3>
      <p>${escapeHtml(game.deleted ? "Deleted by CUBIXIA moderation" : game.genre)}${!game.deleted && game.creator ? ` | By ${escapeHtml(game.creator)}` : ""}</p>
      <div><span>${escapeHtml(game.rating)} Rating</span><button data-play="${game.id}" ${game.deleted ? "disabled" : ""}>${game.deleted ? "Unavailable" : "Join"}</button></div>
    </article>
  `;
}

function friendCard(friend) {
  const state = friend.currentGame ? "ingame" : friend.online ? "online" : "offline";
  return `
    <div class="friend-card wide">
      <button class="friend-face-wrap" data-friend-menu="${escapeHtml(friend.username)}">
        ${avatar(friend, "small")}<span class="status-dot ${state}"></span>
      </button>
      <span title="${escapeHtml(friend.username)}">${escapeHtml(friend.username)}</span>
      <small>${friend.currentGame || (friend.online ? "Online" : "Offline")}</small>
      ${friend.currentGame ? `<button class="join-mini" data-join-friend="${escapeHtml(friend.currentGame)}">Join</button>` : ""}
    </div>
  `;
}

function notificationList(user) {
  if (!user.notifications.length) return `<p class="empty">No notifications yet.</p>`;
  const visible = user.notifications.slice(0, 5);
  const hiddenCount = Math.max(0, user.notifications.length - visible.length);
  return `${visible.map((note) => `
    <article class="notice">
      <p>${escapeHtml(note.text)}</p>
      ${note.type === "friend_request" ? `<div><button data-respond="accept" data-from="${escapeHtml(note.from)}">Accept</button><button data-respond="decline" data-from="${escapeHtml(note.from)}">Decline</button></div>` : ""}
    </article>
  `).join("")}${hiddenCount ? `<p class="notice-more">${hiddenCount} older notification${hiddenCount === 1 ? "" : "s"} hidden.</p>` : ""}`;
}

function notificationSummary(user) {
  const total = user.notifications.length;
  if (!total) return "all clear";
  const friendRequests = user.notifications.filter((note) => note.type === "friend_request").length;
  return friendRequests ? `${total} total, ${friendRequests} request${friendRequests === 1 ? "" : "s"}` : `${total} total`;
}

function itemCard(item, user) {
  const isEquipped = user.equipped.includes(item.id);
  const isOwned = user.inventory.includes(item.id);
  const kind = itemKindLabel(item);
  return `
    <button class="item-card ${isEquipped ? "equipped" : ""} ${isOwned ? "owned" : ""} ${item.deleted ? "deleted-content" : ""}" data-item="${item.id}" data-owned="${isOwned}" data-type="${escapeHtml(item.type || "item")}" data-name="${escapeHtml(item.name || "")}" ${item.deleted ? "disabled" : ""}>
      <div class="item-art ${item.type}" aria-label="${escapeHtml(kind)} preview">${itemIcon(item)}<span class="item-type-chip">${escapeHtml(kind)}</span></div>
      <strong>${escapeHtml(item.name)}</strong>
      <small class="item-kind">${escapeHtml(kind)}</small>
      <small>${escapeHtml(item.creator || "CUBIXIA")}</small>
      <span>${item.deleted ? "Deleted" : isEquipped ? "Equipped" : isOwned ? "Owned" : item.price === 0 ? "Free" : `${item.price} Cubbits`}</span>
    </button>
  `;
}

function itemKindLabel(item) {
  const map = {
    shirt: "Shirt / Torso",
    hat: "Hat / Head",
    hair: "Hair / Head",
    face: "Face Gear",
    back: "Back Accessory",
    shoes: "Shoes / Feet",
    tool: "Tool / Hand",
    accessory: "Chest Accessory",
    animation: "Animation"
  };
  return map[item.type] || "Avatar Item";
}

function itemIcon(item) {
  return `
    <div class="item-preview item-only item-${escapeHtml(item.id)} item-type-${escapeHtml(item.type || "item")}">
      <span class="preview-leg left"></span>
      <span class="preview-leg right"></span>
      <span class="preview-body"></span>
      <span class="preview-arm left"></span>
      <span class="preview-arm right"></span>
      <span class="preview-head"></span>
      <span class="preview-hair"></span>
      <span class="preview-piece"></span>
    </div>
  `;
}

function blockAvatar(user, id = "", variant = "") {
  user = normalizeClientUser(user) || { avatarStyle: DEFAULT_AVATAR_STYLE, equipped: [] };
  const style = normalizeAvatarStyle(user.avatarStyle);
  const equipped = new Set(Array.isArray(user.equipped) ? user.equipped : []);
  return `
    <div class="block-avatar ${variant}" ${id ? `id="${id}"` : ""}>
      <span class="head" style="background:${style.skin || "#f0d0a7"}"></span>
      <span class="hair" style="background:${style.hair || "#7a4a1d"}"></span>
      ${equipped.has("hair-04") ? `<span class="hair-04"></span>` : ""}
      ${equipped.has("bangs-hair") ? `<span class="bangs-hair"></span>` : ""}
      <span class="body" style="background:${style.shirt || "#2268d8"}"></span>
      <span class="arm left" style="background:${style.skin || "#f0d0a7"}"></span>
      <span class="arm right" style="background:${style.skin || "#f0d0a7"}"></span>
      <span class="leg left" style="background:${style.pants || "#252b35"}"></span>
      <span class="leg right" style="background:${style.pants || "#252b35"}"></span>
      ${equipped.has("cube-cap") && !equipped.has("premium-hat") && !equipped.has("creator-crown") ? `<span class="cube-cap"></span>` : ""}
      ${equipped.has("premium-hat") && !equipped.has("creator-crown") ? `<span class="premium-hat"></span>` : ""}
      ${equipped.has("creator-crown") ? `<span class="creator-crown"></span>` : ""}
      ${equipped.has("survivor-vest") ? `<span class="survivor-vest"></span>` : ""}
      ${equipped.has("tycoon-badge-pin") ? `<span class="tycoon-pin"></span>` : ""}
      ${equipped.has("neon-visor") ? `<span class="neon-visor"></span>` : ""}
      ${equipped.has("wing-pack") ? `<span class="wing-pack left"></span><span class="wing-pack right"></span>` : ""}
      ${equipped.has("speed-boots") ? `<span class="speed-boot left"></span><span class="speed-boot right"></span>` : ""}
      ${equipped.has("ban-hammer") ? `<span class="ban-hammer"></span>` : ""}
    </div>
  `;
}

function showFriendSearch(seed = "") {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <form class="modal" id="friendSearch">
      <h3>Add friend</h3>
      <input name="username" value="${escapeHtml(seed)}" placeholder="Search username" required />
      <button class="save full" type="submit">Search</button>
      <div class="search-result" id="searchResult"></div>
      <div class="modal-actions"><button type="button" class="cancel">Close</button></div>
    </form>
  `;
  document.body.appendChild(modal);
  modal.querySelector(".cancel").addEventListener("click", () => modal.remove());
  modal.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = new FormData(event.currentTarget).get("username");
    const result = modal.querySelector("#searchResult");
    try {
      const data = await api(`/api/users/search?username=${encodeURIComponent(username)}`);
      if (!data.found) {
        result.innerHTML = `<p>No user was found.</p>`;
        return;
      }
      result.innerHTML = `
        <div class="found-user">
          ${avatar(data.user, "small")}
          <div><strong>${escapeHtml(data.user.username)}</strong><small>${data.user.online ? "Online" : "Offline"}</small></div>
          <button id="requestBtn" ${data.relationship !== "none" ? "disabled" : ""}>${relationshipText(data.relationship)}</button>
        </div>
      `;
      enhance3DPreviews(result);
      const requestBtn = result.querySelector("#requestBtn");
      if (requestBtn && data.relationship === "none") {
        requestBtn.addEventListener("click", async () => {
          await api("/api/friend-request", { method: "POST", body: JSON.stringify({ username: data.user.username }) });
          requestBtn.textContent = "Request Sent";
          requestBtn.disabled = true;
          result.insertAdjacentHTML("beforeend", `<p class="friend-request-hint">Request sent on this CUBIXIA server. If they do not receive it, both players need the same <code>cubixia-server.json</code> worldwide server file.</p>`);
        });
      }
    } catch (error) {
      result.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
    }
  });
  if (seed) modal.querySelector("form").requestSubmit();
}

function showBanModal() {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <form class="modal" id="banForm">
      <h3>Owner Ban Feature</h3>
      <input name="username" placeholder="Username to ban or unban" required />
      <input name="reason" placeholder="Reason" />
      <div class="duration-row"><input name="durationValue" type="number" min="1" value="1" /><select name="durationUnit">${durationOptions("days")}</select></div>
      <label class="checkline"><input name="permanent" type="checkbox" /> Permanent ban</label>
      <label class="checkline"><input name="ipBan" type="checkbox" /> IP/device ban</label>
      <div class="modal-actions"><button class="danger" name="mode" value="ban">Ban</button><button name="mode" value="unban">Unban</button><button type="button" class="cancel">Close</button></div>
      <div class="message" id="banMessage"></div>
    </form>
  `;
  document.body.appendChild(modal);
  modal.querySelector(".cancel").addEventListener("click", () => modal.remove());
  modal.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitter = event.submitter;
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      form.banned = submitter.value === "ban";
      await api("/api/admin/ban", { method: "POST", body: JSON.stringify(form) });
      modal.querySelector("#banMessage").textContent = submitter.value === "ban" ? "User banned." : "User unbanned.";
    } catch (error) {
      modal.querySelector("#banMessage").textContent = error.message;
    }
  });
}

function bindSocial() {
  document.querySelector("#openSearch")?.addEventListener("click", () => showFriendSearch());
  document.querySelectorAll("[data-respond]").forEach((button) => {
    button.addEventListener("click", () => respondRequest(button.dataset.from, button.dataset.respond));
  });
  document.querySelectorAll("[data-friend-menu]").forEach((button) => {
    button.addEventListener("click", () => showFriendMenu(button.dataset.friendMenu));
  });
}

function showFriendMenu(username) {
  const friend = currentUser.friendProfiles.find((entry) => entry.username === username);
  if (!friend) return;
  const modal = document.createElement("div");
  modal.className = "friend-pop";
  modal.innerHTML = `
    <div>${avatar(friend, "small")}<strong>${escapeHtml(friend.username)}</strong></div>
    ${friend.currentGame ? `<p>${escapeHtml(friend.currentGame)}</p><button data-play="${gameIdFromTitle(friend.currentGame)}">Join</button>` : `<p>${friend.online ? "Online" : "Offline"}</p>`}
    <button data-route="messages">Chat with ${escapeHtml(friend.username)}</button>
    <button data-view-user="${escapeHtml(friend.username)}">View Profile</button>
  `;
  document.body.appendChild(modal);
  setTimeout(() => modal.remove(), 5000);
  bindRoutes();
  bindPlayButtons();
  modal.querySelector("[data-view-user]")?.addEventListener("click", () => publicProfile(friend));
}

function bindPlayButtons() {
  document.querySelectorAll("[data-play]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!currentUser) return signup();
      const game = findGame(button.dataset.play);
      if (game.deleted) return alert("This game was deleted by CUBIXIA moderation and cannot be played.");
      gamePage(currentUser, button.dataset.play);
    });
  });
  document.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => gameDetail(button.dataset.detail));
  });
}

function bindGameDetailActions(gameId) {
  document.querySelectorAll("[data-game-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!currentUser) return login();
      const action = button.dataset.gameAction;
      button.disabled = true;
      try {
        const data = await api(`/api/games/${encodeURIComponent(gameId)}/reaction`, {
          method: "POST",
          body: JSON.stringify({ action })
        });
        currentUser = data.user;
        await refreshGameCatalog();
        gameDetail(gameId);
      } catch (error) {
        alert(error.message);
        button.disabled = false;
      }
    });
  });
}

function bindAvatarPicker(initial = "") {
  const input = document.querySelector("#avatarInput");
  const preview = document.querySelector("#avatarPreview");
  if (!input || !preview) return;
  if (initial) preview.innerHTML = `<img src="${initial}" alt="">`;
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      preview.dataset.avatar = reader.result;
      preview.innerHTML = `<img src="${reader.result}" alt="">`;
    };
    reader.readAsDataURL(file);
  });
}

function bindPasswordToggles() {
  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.parentElement.querySelector("input");
      input.type = input.type === "password" ? "text" : "password";
      button.textContent = input.type === "password" ? "Show" : "Hide";
    });
  });
}

function bindTwoStepLogin() {
  const form = document.querySelector("#twoStepLoginForm");
  const message = document.querySelector("#message");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector("button[type='submit']");
    submitButton.disabled = true;
    message.textContent = "";
    try {
      const data = await api("/api/login/verify-2fa", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
      try {
        routeUser(data);
      } catch (renderError) {
        console.error("CUBIXIA 2-step render failed:", renderError);
        currentUser = normalizeClientUser(data.user);
        message.textContent = "CUBIXIA verified you, but the home page needs a refresh. Refresh the page and try again.";
        submitButton.disabled = false;
      }
    } catch (error) {
      message.textContent = error.message;
      submitButton.disabled = false;
    }
  });
  document.querySelector("#resendTwoStep").addEventListener("click", async () => {
    const resendButton = document.querySelector("#resendTwoStep");
    resendButton.disabled = true;
    message.textContent = "Sending a new code...";
    try {
      const data = await api("/api/login/resend-2fa", { method: "POST", body: JSON.stringify({}) });
      twoStepLogin(data);
    } catch (error) {
      message.textContent = error.message;
      resendButton.disabled = false;
    }
  });
}

function bindRecovery() {
  let identity = "";
  document.querySelector("#recoverStart").addEventListener("submit", async (event) => {
    event.preventDefault();
    identity = new FormData(event.currentTarget).get("identity");
    const message = document.querySelector("#message");
    try {
      const data = await api("/api/recover/start", { method: "POST", body: JSON.stringify({ identity }) });
      message.textContent = data.message;
      document.querySelector("#recoverFinish").classList.remove("hidden");
    } catch (error) {
      message.textContent = error.message;
    }
  });
  document.querySelector("#recoverFinish").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    payload.identity = identity;
    const message = document.querySelector("#finishMessage");
    try {
      const data = await api("/api/recover/finish", { method: "POST", body: JSON.stringify(payload) });
      routeUser(data);
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

function bindAvatarEditor() {
  let activeAvatarTab = "all";
  let avatarEditorSaving = false;
  const filterAvatarItems = () => {
    const query = (document.querySelector("#avatarItemSearch")?.value || "").trim().toLowerCase();
    document.querySelectorAll(".avatar-owned-grid .item-card").forEach((card) => {
      const type = card.dataset.type || "item";
      const name = (card.dataset.name || card.textContent || "").toLowerCase();
      const matchesTab = activeAvatarTab === "all" || type === activeAvatarTab;
      const matchesSearch = !query || name.includes(query);
      card.classList.toggle("hidden", !(matchesTab && matchesSearch));
    });
  };
  const sync = () => {
    const nextStyle = readAvatarEditorStyle();
    currentUser.avatarStyle = {
      ...currentUser.avatarStyle,
      ...nextStyle
    };
    setAvatarEditorError(avatarStyleError(nextStyle));
    updateAvatarEditorPreview3D();
  };
  document.querySelectorAll("#skinColor,#shirtColor,#pantsColor,#hairColor").forEach((input) => input.addEventListener("input", sync));
  document.querySelectorAll("[data-color-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.querySelector(`#${button.dataset.colorTarget}`);
      if (!input) return;
      input.value = button.dataset.colorValue;
      sync();
    });
  });
  document.querySelectorAll("[data-avatar-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeAvatarTab = button.dataset.avatarTab || "all";
      document.querySelectorAll("[data-avatar-tab]").forEach((tab) => tab.classList.toggle("active", tab === button));
      filterAvatarItems();
    });
  });
  document.querySelector("#avatarItemSearch")?.addEventListener("input", filterAvatarItems);
  sync();
  filterAvatarItems();
  const setAvatarEditorBusy = (busy) => {
    avatarEditorSaving = busy;
    document.querySelector(".avatar-editor")?.classList.toggle("is-saving", busy);
    document.querySelectorAll(".avatar-owned-grid .item-card, #saveAvatar").forEach((control) => {
      control.disabled = busy;
      control.setAttribute("aria-busy", busy ? "true" : "false");
    });
  };
  document.querySelectorAll(".avatar-owned-grid .item-card").forEach((button) => {
    button.addEventListener("click", async () => {
      if (avatarEditorSaving || button.classList.contains("hidden") || button.disabled) return;
      currentUser.avatarStyle = {
        ...currentUser.avatarStyle,
        ...readAvatarEditorStyle()
      };
      toggleEquipped(button.dataset.item);
      setAvatarEditorBusy(true);
      try {
        const data = await saveEquippedItems();
        currentUser = data.user;
        avatarEditor(currentUser);
      } catch (error) {
        setAvatarEditorError(error.message);
        setAvatarEditorBusy(false);
      }
    });
  });
  document.querySelector("#saveAvatar").addEventListener("click", async () => {
    if (avatarEditorSaving) return;
    const nextStyle = readAvatarEditorStyle();
    if (!setAvatarEditorError(avatarStyleError(nextStyle))) return;
    const payload = {
      bio: currentUser.bio,
      equipped: currentUser.equipped,
      avatarStyle: {
        ...nextStyle
      }
    };
    setAvatarEditorBusy(true);
    try {
      const data = await api("/api/profile", { method: "POST", body: JSON.stringify(payload) });
      currentUser = data.user;
      avatarEditor(data.user);
    } catch (error) {
      setAvatarEditorError(error.message);
      setAvatarEditorBusy(false);
    }
  });
}

async function startAvatarEditorPreview(user) {
  const mount = document.querySelector("#avatar3dMount");
  if (!mount) return;
  const THREE = await loadThree();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd4b083);
  const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100);
  camera.position.set(0, 1.35, 5.2);
  camera.lookAt(0, 1.15, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  mount.innerHTML = "";
  mount.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x706050, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 5, 4);
  scene.add(key);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.8, 40), new THREE.MeshStandardMaterial({ color: 0xb98b5f, roughness: 0.8 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  runtime = { scene, camera, renderer, mount, frame: 0, avatarPreviewUser: user, avatarPreviewGroup: null };
  updateAvatarEditorPreview3D();
  const animate = () => {
    if (!mount.isConnected || runtime?.mount !== mount) return;
    runtime.frame = requestAnimationFrame(animate);
    if (runtime.avatarPreviewGroup) {
      runtime.avatarPreviewGroup.rotation.y += 0.01;
      updateBlendAvatarAnimation(runtime.avatarPreviewGroup, false, false, { preview: true });
    }
    renderer.render(scene, camera);
  };
  animate();
  window.onresize = () => {
    if (!runtime?.camera || runtime.mount !== mount) return;
    camera.aspect = mount.clientWidth / mount.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(mount.clientWidth, mount.clientHeight);
  };
}

function updateAvatarEditorPreview3D() {
  if (!runtime?.scene || !THREE_CACHE || !document.querySelector("#avatar3dMount")) return;
  if (runtime.avatarPreviewGroup) runtime.scene.remove(runtime.avatarPreviewGroup);
  const previewUser = {
    ...currentUser,
    avatarStyle: {
      ...currentUser.avatarStyle,
      skin: document.querySelector("#skinColor")?.value || currentUser.avatarStyle?.skin,
      shirt: document.querySelector("#shirtColor")?.value || currentUser.avatarStyle?.shirt,
      pants: document.querySelector("#pantsColor")?.value || currentUser.avatarStyle?.pants,
      hair: document.querySelector("#hairColor")?.value || currentUser.avatarStyle?.hair
    }
  };
  runtime.avatarPreviewGroup = createAvatarMesh(THREE_CACHE, previewUser, true);
  runtime.avatarPreviewGroup.position.y = AVATAR_ROOT_HEIGHT;
  runtime.scene.add(runtime.avatarPreviewGroup);
}

function bindMarketplace() {
  document.querySelectorAll("[data-item]").forEach((button) => {
    button.addEventListener("click", () => showItemDetail(button.dataset.item));
  });
}

function showItemDetail(itemId) {
  if (!currentUser) return login();
  const item = currentUser.items.find((entry) => entry.id === itemId);
  if (!item || item.deleted) return;
  document.querySelector(".item-detail-backdrop")?.remove();
  const owned = currentUser.inventory.includes(item.id);
  const equipped = currentUser.equipped.includes(item.id);
  const createdAt = formatCatalogDate(item.createdAt || "Jun 1, 2026");
  const recommendations = currentUser.items
    .filter((entry) => entry.id !== item.id && !entry.deleted)
    .sort((a, b) => (a.type === item.type ? -1 : 1) - (b.type === item.type ? -1 : 1))
    .slice(0, 7);
  const modal = document.createElement("div");
  modal.className = "modal-backdrop item-detail-backdrop";
  modal.innerHTML = `
    <section class="modal item-detail-modal">
      <button class="modal-x" type="button" aria-label="Close">x</button>
      <div class="item-detail-top">
        <div>
          <div class="item-detail-preview" data-item-detail-preview="${escapeHtml(item.id)}">${itemIcon(item)}</div>
          <button class="ghost-btn" type="button" id="itemTryOn">Try On</button>
        </div>
        <div class="item-detail-info">
          <h1>${escapeHtml(item.name)}</h1>
          <p>By ${escapeHtml(item.creator || "CUBIXIA")}</p>
          <div class="item-price-line"><strong>Price</strong><span>${item.price === 0 ? "Free" : `${Number(item.price || 0).toLocaleString()} Cubbits`}</span></div>
          <button class="primary-btn" id="itemPrimaryAction">${owned ? equipped ? "Unequip" : "Equip" : item.price === 0 ? "Get" : "Buy"}</button>
          <button class="dark-btn" type="button" id="itemFavorite">Favorite</button>
          <dl class="item-meta">
            <dt>Type</dt><dd>${escapeHtml(item.type || "item")}</dd>
            <dt>Placement</dt><dd>${itemPlacement(item)}</dd>
            <dt>Materials</dt><dd>${itemMaterials(item)}</dd>
            <dt>Created</dt><dd>${escapeHtml(createdAt)}</dd>
            <dt>Tradable</dt><dd>No</dd>
          </dl>
          <h2>Description</h2>
          <p>${escapeHtml(item.description || "A CUBIXIA avatar item.")}</p>
          <div class="message" id="itemDetailMessage"></div>
        </div>
      </div>
      <section class="item-recommendations">
        <h2>Recommendations</h2>
        <div class="item-grid">${recommendations.map((entry) => itemCard(entry, currentUser)).join("")}</div>
      </section>
    </section>
  `;
  document.body.appendChild(modal);
  modal.querySelector(".modal-x").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.remove();
  });
  modal.querySelector("#itemFavorite").addEventListener("click", (event) => {
    event.currentTarget.textContent = "Favorited";
  });
  modal.querySelector("#itemTryOn").addEventListener("click", () => {
    previewItemOnCurrentUser(item.id);
    renderItemPreviewMounts(modal, true);
  });
  modal.querySelector("#itemPrimaryAction").addEventListener("click", async () => {
    await buyOrEquipItem(item.id, modal);
  });
  modal.querySelectorAll("[data-item]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      showItemDetail(button.dataset.item);
    });
  });
  renderItemPreviewMounts(modal, true);
}

function itemPlacement(item) {
  const map = { hat: "Head", hair: "Head", face: "Face", back: "Back", shirt: "Torso", shoes: "Feet", tool: "Hand", accessory: "Chest" };
  return map[item.type] || "Avatar";
}

function itemMaterials(item) {
  if (["premium-hat", "creator-crown", "neon-visor", "bangs-hair", "wing-pack", "ban-hammer"].includes(item.id)) return "Imported Blender model";
  if (item.id === "hair-04") return "CUBIXIA procedural hair";
  return "CUBIXIA avatar material";
}

function formatCatalogDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "Jun 1, 2026");
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function previewItemOnCurrentUser(itemId) {
  const item = currentUser.items.find((entry) => entry.id === itemId);
  if (!item) return;
  const singleTypes = ["hat", "hair", "face", "back", "shoes", "tool"];
  if (singleTypes.includes(item.type)) {
    currentUser.equipped = currentUser.equipped.filter((id) => currentUser.items.find((entry) => entry.id === id)?.type !== item.type);
  }
  currentUser.equipped = Array.from(new Set([...(currentUser.equipped || []), itemId]));
}

async function buyOrEquipItem(itemId, modal) {
  const message = modal.querySelector("#itemDetailMessage");
  const item = currentUser.items.find((entry) => entry.id === itemId);
  if (!item || item.deleted) return;
  message.textContent = "";
  try {
    if (!currentUser.inventory.includes(itemId)) {
      const data = await api("/api/marketplace/buy", { method: "POST", body: JSON.stringify({ itemId }) });
      currentUser = data.user;
    }
    toggleEquipped(itemId);
    const saved = await saveEquippedItems();
    currentUser = saved.user;
    modal.remove();
    refreshAvatarItemSurface();
  } catch (error) {
    message.textContent = error.message;
  }
}

function refreshAvatarItemSurface() {
  if (document.querySelector(".avatar-editor")) return avatarEditor(currentUser);
  if (document.querySelector(".marketplace-page")) return marketplacePage(currentUser);
  if (document.querySelector(".profile-layout")) return profile(currentUser);
  hub(currentUser);
}

function bindCubbuxPage() {
  document.querySelectorAll("[data-cubbux-pack]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCubbuxPackage = button.dataset.cubbuxPack;
      cubbuxPage(currentUser);
    });
  });
  document.querySelector("#checkoutForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.querySelector("#checkoutMessage");
    message.textContent = "";
    try {
      const data = await api("/api/cubbux/checkout", {
        method: "POST",
        body: JSON.stringify({ packageId: selectedCubbuxPackage, card: Object.fromEntries(new FormData(event.currentTarget).entries()) })
      });
      currentUser = data.user;
      cubbuxPage(data.user);
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

function bindGroups() {
  document.querySelectorAll("[data-group]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const data = await api("/api/groups/join", { method: "POST", body: JSON.stringify({ groupId: button.dataset.group }) });
        currentUser = data.user;
        communitiesPage(button.dataset.group);
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

function userJoinedGroup(groupId) {
  return Boolean(currentUser?.groups?.includes(groupId));
}

function bindOwnerPanel() {
  const message = document.querySelector("#ownerMessage");
  const lockdownForm = document.querySelector("#ownerLockdownForm");
  const refreshLockdownForm = async () => {
    if (!lockdownForm) return false;
    const status = lockdownForm.querySelector("#ownerLockdownStatus");
    const button = lockdownForm.querySelector("#ownerLockdownButton");
    const reason = lockdownForm.querySelector("[name='reason']");
    const staffMessage = lockdownForm.querySelector("[name='staffMessage']");
    const data = await api("/api/lockdown").catch(() => ({ lockdown: null, staffLockdown: null }));
    const active = Boolean(data.staffLockdown?.active || data.lockdown?.active);
    lockdownForm.dataset.active = String(active);
    if (status) status.textContent = active ? "Lockdown is active. Staff can keep working. Press stop when the issue is handled." : "Turns the platform red for users, removes players from games, and sends staff a private instruction popup.";
    if (button) {
      button.textContent = active ? "Stop Owner Lockdown" : "Start Owner Lockdown";
      button.classList.toggle("lockdown-stop", active);
    }
    if (reason) {
      reason.required = !active;
      reason.disabled = active;
      reason.placeholder = active ? "Lockdown is active. Reason is already set." : "Reason shown to every player";
    }
    if (staffMessage) {
      staffMessage.disabled = active;
      staffMessage.placeholder = active ? "Stop lockdown to clear the staff popup" : "Private message for staff: what should mods/admins do?";
    }
    return active;
  };
  refreshLockdownForm();
  document.querySelector("#ownerBanForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitter = event.submitter;
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      form.banned = submitter.value === "ban";
      await api("/api/admin/ban", { method: "POST", body: JSON.stringify(form) });
      message.textContent = submitter.value === "ban" ? "User banned." : "User unbanned.";
    } catch (error) {
      message.textContent = error.message;
    }
  });
  document.querySelector("#ownerGrantForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/api/admin/grant-cubbux", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
      message.textContent = "Cubbits granted.";
    } catch (error) {
      message.textContent = error.message;
    }
  });
  document.querySelector("#ownerTakeForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/api/admin/take-cubbux", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
      message.textContent = "Cubbits removed.";
    } catch (error) {
      message.textContent = error.message;
    }
  });
  document.querySelector("#ownerRoleForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/api/admin/role", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
      message.textContent = "Role updated.";
    } catch (error) {
      message.textContent = error.message;
    }
  });
  document.querySelector("#ownerWarnForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
      payload.action = "warn";
      await api("/api/moderation/action", { method: "POST", body: JSON.stringify(payload) });
      message.textContent = "Warning sent.";
    } catch (error) {
      message.textContent = error.message;
    }
  });
  lockdownForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const active = event.currentTarget.dataset.active === "true";
      const data = await api("/api/admin/lockdown", { method: "POST", body: JSON.stringify({ active: !active, reason: payload.reason, staffMessage: payload.staffMessage }) });
      currentUser = data.user || currentUser;
      if (data.lockdown?.active) lockdownScreen(data.lockdown, currentUser);
      else if (active) {
        clearStaffLockdownPopup();
        message.textContent = "Owner lockdown stopped.";
      } else {
        if (data.staffLockdown?.active) staffLockdownPopup(data.staffLockdown);
        message.textContent = "Lockdown started. Staff stay online and received the instruction popup.";
      }
      await refreshLockdownForm();
    } catch (error) {
      message.textContent = error.message;
    }
  });
  bindExtraModerationTools();
}

async function bindModerationPanel() {
  const list = document.querySelector("#moderationReports");
  const message = document.querySelector("#moderationMessage");
  const loadReports = async () => {
    const data = await api("/api/moderation/reports").catch((error) => ({ reports: [], error: error.message }));
    if (data.user) currentUser = data.user;
    if (data.error) {
      list.innerHTML = `<p class="empty">${escapeHtml(data.error)}</p>`;
    } else if (!data.reports.length) {
      list.innerHTML = `<p class="empty">No reports yet. When someone submits one, it will appear here with the reason.</p>`;
    } else {
      list.innerHTML = data.reports.map((report) => `
        <article class="report-card">
          <div><strong>${escapeHtml(report.abuseType)}</strong><span>${new Date(report.createdAt).toLocaleString()}</span></div>
          <p><b>Reporter:</b> ${escapeHtml(report.reporter)}</p>
          <p><b>${escapeHtml(report.targetType)}:</b> ${escapeHtml(report.target)}</p>
          <p>${escapeHtml(report.details)}</p>
          <div class="report-actions">
            <button type="button" data-use-report="${escapeHtml(report.target)}" data-reason="${escapeHtml(report.details)}">Use in action form</button>
            <button type="button" class="danger-lite" data-delete-report="${escapeHtml(report.id)}">Delete report</button>
          </div>
        </article>
      `).join("");
    }
    document.querySelectorAll("[data-use-report]").forEach((button) => {
      button.addEventListener("click", () => {
        const form = document.querySelector("#moderationActionForm");
        form.elements.username.value = button.dataset.useReport;
        form.elements.reason.value = button.dataset.reason;
      });
    });
    document.querySelectorAll("[data-delete-report]").forEach((button) => {
      button.addEventListener("click", async () => {
        await api("/api/moderation/reports/delete", { method: "POST", body: JSON.stringify({ reportId: button.dataset.deleteReport }) });
        message.textContent = "Report deleted.";
        await loadReports();
      });
    });
  };
  await loadReports();
  document.querySelector("#moderationActionForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    try {
      const action = await api("/api/moderation/action", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
      currentUser = action.user;
      message.textContent = `Action sent: ${action.action.toUpperCase()} ${action.target.username}.`;
      await loadReports();
    } catch (error) {
      message.textContent = error.message;
    }
  });
  bindExtraModerationTools();
}

function bindExtraModerationTools() {
  bindContentModerationTools();
  bindAdminFollowTool();
  bindChatAuditTool();
}

async function bindContentModerationTools() {
  const list = document.querySelector("#contentModerationList");
  if (!list || list.dataset.bound === "true") return;
  list.dataset.bound = "true";
  const message = document.querySelector("#contentModerationMessage");
  const render = async () => {
    const data = await api("/api/moderation/content").catch((error) => ({ games: [], items: [], error: error.message }));
    if (data.user) currentUser = data.user;
    if (data.error) {
      list.innerHTML = `<p class="empty">${escapeHtml(data.error)}</p>`;
      return;
    }
    const gameRows = data.games.map((game) => `
      <article class="${game.deleted ? "deleted-content" : ""}">
        <div><strong>${escapeHtml(game.title)}</strong><small>${escapeHtml(game.id)}</small></div>
        <span>${escapeHtml(game.genre || "Game")} ${game.deleted ? "| deleted" : ""}</span>
        <button class="danger-lite" data-content-delete="games" data-content-id="${escapeHtml(game.id)}">Delete</button>
        ${data.canRestore && game.deleted ? `<button data-content-restore="games" data-content-id="${escapeHtml(game.id)}">Un-delete</button>` : ""}
      </article>
    `).join("");
    const itemRows = data.items.map((item) => `
      <article class="${item.deleted ? "deleted-content" : ""}">
        <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.id)}</small></div>
        <span>${escapeHtml(item.type)} ${item.deleted ? "| deleted" : `${Number(item.price || 0).toLocaleString()} Cubbits`}</span>
        <button class="danger-lite" data-content-delete="items" data-content-id="${escapeHtml(item.id)}">Delete</button>
        ${data.canRestore && item.deleted ? `<button data-content-restore="items" data-content-id="${escapeHtml(item.id)}">Un-delete</button>` : ""}
      </article>
    `).join("");
    list.innerHTML = `<h3>Games</h3>${gameRows}<h3>Clothing / Items</h3>${itemRows}`;
    list.querySelectorAll("[data-content-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const reason = prompt("Reason for deleting this content?", "Deleted by CUBIXIA moderation.");
        if (reason === null) return;
        try {
          const data = await api("/api/moderation/content/delete", { method: "POST", body: JSON.stringify({ type: button.dataset.contentDelete, id: button.dataset.contentId, reason }) });
          if (data.user) currentUser = data.user;
          if (message) message.textContent = "Content deleted and masked as [Content Deleted].";
          await refreshGameCatalog();
          await render();
        } catch (error) {
          if (message) message.textContent = error.message;
        }
      });
    });
    list.querySelectorAll("[data-content-restore]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          const data = await api("/api/moderation/content/restore", { method: "POST", body: JSON.stringify({ type: button.dataset.contentRestore, id: button.dataset.contentId }) });
          if (data.user) currentUser = data.user;
          if (message) message.textContent = "Content un-deleted.";
          await refreshGameCatalog();
          await render();
        } catch (error) {
          if (message) message.textContent = error.message;
        }
      });
    });
  };
  document.querySelector("#contentDeleteForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = await api("/api/moderation/content/delete", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
      if (data.user) currentUser = data.user;
      if (message) message.textContent = "Content deleted and masked as [Content Deleted].";
      await refreshGameCatalog();
      await render();
    } catch (error) {
      if (message) message.textContent = error.message;
    }
  });
  document.querySelector("#contentRestoreForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = await api("/api/moderation/content/restore", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
      if (data.user) currentUser = data.user;
      if (message) message.textContent = "Content un-deleted.";
      await refreshGameCatalog();
      await render();
    } catch (error) {
      if (message) message.textContent = error.message;
    }
  });
  await render();
}

function bindAdminFollowTool() {
  const form = document.querySelector("#adminFollowForm");
  if (!form || form.dataset.bound === "true") return;
  form.dataset.bound = "true";
  const message = document.querySelector("#adminFollowMessage");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = await api("/api/moderation/follow", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
      currentUser = data.user;
      message.textContent = `Following ${data.target.username}. They are ${data.target.currentGame ? `in ${data.target.currentGame}` : data.target.online ? "online" : "offline"}.`;
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

function bindChatAuditTool() {
  const form = document.querySelector("#chatAuditForm");
  if (!form || form.dataset.bound === "true") return;
  form.dataset.bound = "true";
  const results = document.querySelector("#chatAuditResults");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const params = new URLSearchParams(new FormData(form));
    try {
      const data = await api(`/api/moderation/chat-audit?${params.toString()}`);
      currentUser = data.user;
      results.innerHTML = data.messages.map((message) => `
        <article>
          <div><strong>${escapeHtml(message.username)}</strong><small>${new Date(message.createdAt).toLocaleString()} | ${escapeHtml(message.room || "global")}</small></div>
          <p>${escapeHtml(message.text)}</p>
        </article>
      `).join("") || `<p class="empty">No chat messages matched that search.</p>`;
    } catch (error) {
      results.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
    }
  });
}

function toggleEquipped(id) {
  const item = currentUser.items.find((entry) => entry.id === id);
  if (!item || item.deleted || !currentUser.inventory.includes(id)) return;
  if (currentUser.equipped.includes(id)) {
    currentUser.equipped = currentUser.equipped.filter((itemId) => itemId !== id);
    return;
  }
  const singleTypes = ["hat", "hair", "face", "back", "shoes", "tool"];
  if (singleTypes.includes(item.type)) {
    currentUser.equipped = currentUser.equipped.filter((itemId) => currentUser.items.find((entry) => entry.id === itemId)?.type !== item.type);
  }
  currentUser.equipped = [...currentUser.equipped, id];
}

function saveEquippedItems() {
  return api("/api/profile", {
    method: "POST",
    body: JSON.stringify({
      bio: currentUser.bio,
      equipped: currentUser.equipped,
      avatarStyle: currentUser.avatarStyle
    })
  }).then((data) => {
    currentUser = data.user;
    return data;
  });
}

async function register(event) {
  event.preventDefault();
  const message = document.querySelector("#message");
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  payload.avatar = document.querySelector("#avatarPreview")?.dataset.avatar || "";
  message.textContent = "";
  try {
    const data = await api("/api/register", { method: "POST", body: JSON.stringify(payload) });
    routeUser(data);
  } catch (error) {
    message.textContent = error.message;
  }
}

async function doLogin(event) {
  event.preventDefault();
  const message = document.querySelector("#message");
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  message.textContent = "";
  try {
    const data = await api("/api/login", { method: "POST", body: JSON.stringify(payload) });
    if (data.twoStepRequired) return twoStepLogin(data);
    try {
      routeUser(data);
    } catch (renderError) {
      console.error("CUBIXIA login render failed:", renderError);
      currentUser = normalizeClientUser(data.user);
      message.textContent = "CUBIXIA logged in, but the home page needs a refresh. Refresh the page and try again.";
    }
  } catch (error) {
    if (error.data?.moderation) return moderationScreen(error.data.user || null, error.data.moderation);
    message.textContent = error.message;
  }
}

async function saveProfile(event) {
  event.preventDefault();
  const message = document.querySelector("#message");
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  const nextAvatar = document.querySelector("#avatarPreview")?.dataset.avatar;
  if (nextAvatar) payload.avatar = nextAvatar;
  try {
    const data = await api("/api/profile", { method: "POST", body: JSON.stringify(payload) });
    message.textContent = "Saved.";
    currentUser = data.user;
  } catch (error) {
    message.textContent = error.message;
  }
}

async function changePassword(event) {
  event.preventDefault();
  const message = document.querySelector("#message");
  try {
    await api("/api/settings/password", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
    message.textContent = "Password changed.";
    event.currentTarget.reset();
  } catch (error) {
    message.textContent = error.message;
  }
}

async function toggleTwoStep() {
  const nextEnabled = currentUser.twoStepEnabled === false;
  const message = document.querySelector("#message");
  try {
    const data = await api("/api/settings/two-step", { method: "POST", body: JSON.stringify({ enabled: nextEnabled }) });
    currentUser = data.user;
    renderSettingsTab("security");
    const nextMessage = document.querySelector("#message");
    if (nextMessage) nextMessage.textContent = `2-Step Verification is now ${nextEnabled ? "on" : "off"}.`;
  } catch (error) {
    if (message) message.textContent = error.message;
  }
}

async function saveAccountSettings(event) {
  event.preventDefault();
  const payload = { notifications: {}, privacy: {}, browser: {} };
  const form = event.currentTarget;
  form.querySelectorAll("input, select").forEach((input) => {
    const [section, key] = input.name.split(".");
    if (!payload[section]) payload[section] = {};
    payload[section][key] = input.type === "checkbox" ? input.checked : input.type === "range" ? Number(input.value) : input.value;
  });
  const merged = {
    notifications: { friendRequests: true, messages: true, gameUpdates: true, moderation: true, ...(currentUser.settings?.notifications || {}), ...payload.notifications },
    privacy: { profileVisible: true, showOnline: true, allowFriendRequests: true, allowJoin: true, allowMessages: true, ...(currentUser.settings?.privacy || {}), ...payload.privacy },
    browser: { reduceMotion: false, showPerformance: false, uiScale: 1, theme: "auto", ...(currentUser.settings?.browser || {}), ...payload.browser }
  };
  try {
    const data = await api("/api/settings/account", { method: "POST", body: JSON.stringify(merged) });
    currentUser = data.user;
    applyAppearanceTheme(currentUser);
    document.querySelector("#settingsMessage").textContent = "Settings saved.";
  } catch (error) {
    document.querySelector("#settingsMessage").textContent = error.message;
  }
}

async function submitReport(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector("#reportMessage");
  try {
    const data = await api("/api/report", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
    currentUser = data.user;
    message.textContent = "Report sent to moderators, admins, and Tanklyplayz.";
    const details = form.elements.details;
    if (details) details.value = "";
  } catch (error) {
    message.textContent = error.message;
  }
}

async function respondRequest(from, action) {
  const data = await api("/api/friend-request/respond", { method: "POST", body: JSON.stringify({ from, action }) });
  hub(data.user);
}

function bindNotificationActions() {
  const clearButton = document.querySelector("#clearNotifications");
  if (!clearButton) return;
  clearButton.addEventListener("click", async () => {
    clearButton.disabled = true;
    clearButton.textContent = "Clearing...";
    try {
      const data = await api("/api/notifications/clear", { method: "POST", body: JSON.stringify({}) });
      hub(data.user);
    } catch (error) {
      clearButton.disabled = false;
      clearButton.textContent = error.message || "Try again";
    }
  });
}

function bindRewardButtons() {
  document.querySelectorAll("#claimDailyReward").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Claiming...";
      try {
        const data = await api("/api/rewards/daily", { method: "POST", body: JSON.stringify({}) });
        currentUser = data.user;
        alert(data.message);
        hub(currentUser);
      } catch (error) {
        button.disabled = false;
        button.textContent = error.message || "Try again";
      }
    });
  });
  const crate = document.querySelector("#openCrate");
  if (crate) crate.addEventListener("click", async () => {
    crate.disabled = true;
    crate.textContent = "Opening...";
    try {
      const data = await api("/api/economy/crate", { method: "POST", body: JSON.stringify({}) });
      currentUser = data.user;
      alert(data.message);
      systemsPage(currentUser);
    } catch (error) {
      crate.disabled = false;
      crate.textContent = error.message || "Try again";
    }
  });
  const party = document.querySelector("#createParty");
  if (party) party.addEventListener("click", async () => {
    party.disabled = true;
    party.textContent = "Creating...";
    try {
      const data = await api("/api/party/create", { method: "POST", body: JSON.stringify({}) });
      currentUser = data.user;
      alert(data.message);
      systemsPage(currentUser);
    } catch (error) {
      party.disabled = false;
      party.textContent = error.message || "Try again";
    }
  });
}

function bindRoutes() {
  ensureLegalFooter();
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const route = button.dataset.route;
      if (route === "signup") return signup();
      if (route === "login") return login();
      if (route === "recover") return recover();
      if (route === "games") return gamesPage();
      if (route === "communities") return communitiesPage();
      if (route === "about") return aboutPage();
      if (route === "home") {
        return goHome();
      }
      if (!currentUser) return login();
      if (route === "profile") return profile(currentUser);
      if (route === "systems") return systemsPage(currentUser);
      if (route === "avatar") return avatarEditor(currentUser);
      if (route === "marketplace") return marketplacePage(currentUser);
      if (route === "cubbux") return cubbuxPage(currentUser);
      if (route === "owner") return ownerPanelPage(currentUser);
      if (route === "moderation") return moderationPanelPage(currentUser);
      if (route === "messages") return messagesPage(currentUser);
      if (route === "studio") return studioPage(currentUser);
      if (route === "settings") return settingsPage(currentUser);
    });
  });
  enhance3DPreviews();
}

async function goHome() {
  if (!currentUser) return guestHome();
  try {
    const data = await api("/api/me");
    return routeUser(data);
  } catch {
    return hub(currentUser);
  }
}

function bindSessionButtons() {
  const logout = document.querySelector("#logoutBtn");
  if (!logout) return;
  logout.addEventListener("click", async () => {
    if (!confirm("Are you sure you would like to log out")) return;
    await api("/api/logout", { method: "POST" });
    guestHome();
  });
}

function bindQuickRegister() {
  document.querySelector("#quickRegister").addEventListener("submit", (event) => {
    event.preventDefault();
    signup(new FormData(event.currentTarget).get("username"));
  });
}

async function bindChat() {
  const list = document.querySelector("#chatMessages");
  const load = async () => {
    const data = await api("/api/chat?room=global");
    list.innerHTML = data.messages.map((message) => `<div class="chat-line"><strong>${escapeHtml(message.username)}</strong><span>${escapeHtml(message.text)}</span></div>`).join("") || `<p class="empty">No messages yet.</p>`;
    list.scrollTop = list.scrollHeight;
  };
  await load();
  runtime = runtime || {};
  runtime.chatInterval = setInterval(load, 2500);
  document.querySelector("#chatForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = new FormData(event.currentTarget).get("text");
    await api("/api/chat", { method: "POST", body: JSON.stringify({ room: "global", text }) });
    event.currentTarget.reset();
    await load();
  });
}

async function startSurvival3D(user, game) {
  const THREE = await loadThree();
  const base = createThreeWorld(THREE, game.id, user.gameSettings);
  const stats = document.querySelector("#gameStats");
  const player = createAvatarMesh(THREE, user, true);
  player.position.set(0, 0.8, 0);
  base.scene.add(player);
  const gun = createGun(THREE);
  gun.position.set(0.55, 0.35, -0.25);
  player.add(gun);
  player.userData.heldTool = "gun";
  const zombies = [];
  const bullets = [];
  const effects = [];
  const state = { hp: 100, xp: Number(user.lastPlayed.xp || 0), cash: Number(user.lastPlayed.currency || 0), wave: 1, paused: false, vy: 0 };
  state.spawnPoint = { x: 0, y: 0.8, z: 0 };
  spawnZombies(THREE, base.scene, zombies, state.wave);
  setupGameMenu(base, user, game.id, state, player);
  setupGameChat(base, user, game.id);
  setupCoreGameSystems(base, game.id, state, player);

  base.mount.addEventListener("click", (event) => {
    if (event.button !== 0 || base.controls?.dragged) return;
    sendMultiplayerAction(game.id, "shoot", state, { label: "shot" });
    const direction = cameraForward(base.controls);
    const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0x664000 }));
    bullet.position.copy(player.position).add(new THREE.Vector3(0, 1.25, 0)).add(direction.clone().multiplyScalar(0.75));
    bullet.userData.velocity = direction.multiplyScalar(0.72);
    bullet.userData.prev = bullet.position.clone();
    bullet.userData.life = 80;
    bullets.push(bullet);
    base.scene.add(bullet);
    gun.userData.flash.visible = true;
    gun.userData.flashTicks = 4;
    gun.position.z = -0.32;
    playShotSound();
  });

  base.tick = () => {
    if (!state.paused) {
      movePlayer(base, player, state);
      if (Math.abs(player.position.x) > 34 || Math.abs(player.position.z) > 34 || player.position.y < -4) {
        state.hp = 0;
        respawnPlayer(state, player, game.id);
      }
      bullets.forEach((bullet) => {
        bullet.userData.prev = bullet.position.clone();
        bullet.position.add(bullet.userData.velocity);
        bullet.userData.life -= 1;
      });
      zombies.forEach((zombie) => {
        const dir = player.position.clone().sub(zombie.position);
        dir.y = 0;
        dir.normalize();
        zombie.position.add(dir.multiplyScalar(0.025 + state.wave * 0.003));
        zombie.lookAt(player.position.x, zombie.position.y, player.position.z);
        if (zombie.position.distanceTo(player.position) < 0.8) state.hp = Math.max(0, state.hp - 0.22);
        bullets.forEach((bullet) => {
          const center = zombie.position.clone().add(new THREE.Vector3(0, 0.4, 0));
          if (!bullet.userData.dead && distancePointToSegment(center, bullet.userData.prev || bullet.position, bullet.position) < 0.72) {
            zombie.userData.hp -= 50;
            bullet.userData.dead = true;
            spawnHitBurst(THREE, base.scene, effects, zombie.position);
          }
        });
      });
      updateEffects(base.scene, effects);
      if (gun.userData.flashTicks > 0) gun.userData.flashTicks -= 1;
      gun.userData.flash.visible = gun.userData.flashTicks > 0;
      gun.position.z += (-0.25 - gun.position.z) * 0.32;
      cleanupDead(THREE, base.scene, zombies, bullets, state);
      if (!zombies.length) spawnZombies(THREE, base.scene, zombies, ++state.wave);
      if (state.hp <= 0) respawnPlayer(state, player, game.id);
      stats.textContent = `Wave ${state.wave} | HP ${Math.round(state.hp)} | XP ${state.xp} | Credits ${state.cash}`;
      updateCamera(base.camera, player);
    }
    renderOtherPlayers(THREE, base, user, game.id, player, state);
    animateOtherPlayers(base);
  };
  runThree(base);
}

async function startTycoon3D(user, game) {
  const THREE = await loadThree();
  const base = createThreeWorld(THREE, game.id, user.gameSettings);
  const stats = document.querySelector("#gameStats");
  const player = createAvatarMesh(THREE, user, true);
  player.position.set(0, 0.8, 5.5);
  base.scene.add(player);
  const state = { cash: 200, happiness: 88, price: 10, paused: false, vy: 0 };
  const rides = [];
  const customers = [];
  setupGameMenu(base, user, game.id, state, player);
  setupGameChat(base, user, game.id);
  setupCoreGameSystems(base, game.id, state, player);
  addRide(THREE, base.scene, rides, -6, -2.5, "coaster");
  addRide(THREE, base.scene, rides, 1.8, -3.2, "wheel");
  addRide(THREE, base.scene, rides, 6.5, 1.5, "drop");
  spawnCustomers(THREE, base.scene, customers, 14);
  base.mount.addEventListener("click", (event) => {
    if (event.button !== 0 || base.controls?.dragged) return;
    sendMultiplayerAction(game.id, "interact", state, { label: "build" });
    if (state.cash >= 75) {
      state.cash -= 75;
      const buildSpots = [[-8, 3.5], [-2.5, 3.6], [3.4, 3.7], [8, -3.2], [-9, -6.2]];
      const spot = buildSpots[rides.length % buildSpots.length];
      addRide(THREE, base.scene, rides, spot[0], spot[1], ["coaster", "wheel", "drop"][rides.length % 3]);
    } else {
      state.price += 2;
      state.happiness = Math.max(20, state.happiness - 4);
    }
  });

  base.tick = () => {
    if (!state.paused) {
      movePlayer(base, player, state);
      customers.forEach((guest, index) => {
        const ride = rides[index % rides.length];
        const dir = ride.position.clone().sub(guest.position);
        dir.y = 0;
        guest.userData.bob = (guest.userData.bob || 0) + 0.08;
        guest.children[0].position.y = 0.65 + Math.sin(guest.userData.bob) * 0.04;
        if (dir.length() > 0.45) {
          guest.position.add(dir.normalize().multiplyScalar(0.024));
          guest.lookAt(ride.position.x, guest.position.y, ride.position.z);
        }
        else {
          state.cash += Math.max(1, Math.round(state.price * (state.happiness / 100)));
          guest.position.set(-9 + Math.random() * 18, 0, 7 + Math.random() * 3);
          if (state.price > 18) state.happiness = Math.max(20, state.happiness - 1);
        }
      });
      rides.forEach((ride) => animateRide(ride));
      stats.textContent = `Cash ${state.cash} | Ride price ${state.price} | Happiness ${state.happiness}% | Click to build or raise price`;
      updateCamera(base.camera, player);
    }
    renderOtherPlayers(THREE, base, user, game.id, player, state);
    animateOtherPlayers(base);
  };
  runThree(base);
}

async function startStudioGame3D(user, game) {
  const THREE = await loadThree();
  const base = createThreeWorld(THREE, game.id, user.gameSettings);
  const stats = document.querySelector("#gameStats");
  const player = createAvatarMesh(THREE, user, true);
  const world = game.studioWorld || { objects: [] };
  const custom = buildStudioPlayableWorld(THREE, base.scene, world);
  const worldLimit = Math.max(20, Math.min(250, Number(world.size || 160) / 2));
  player.position.set(custom.spawn.x, custom.spawn.y, custom.spawn.z);
  base.scene.add(player);
  const state = { score: 0, hp: 100, cash: Number(user.lastPlayed.currency || 0), paused: false, vy: 0, respawning: false };
  state.spawnPoint = { x: custom.spawn.x, y: custom.spawn.y, z: custom.spawn.z };
  setupGameMenu(base, user, game.id, state, player);
  setupGameChat(base, user, game.id);
  setupCoreGameSystems(base, game.id, state, player);
  base.mount.addEventListener("click", (event) => {
    if (event.button !== 0 || base.controls?.dragged) return;
    sendMultiplayerAction(game.id, "interact", state, { label: "collect" });
    state.score += 1;
  });
  base.tick = () => {
    if (!state.paused && !state.respawning) {
      movePlayer(base, player, state);
      custom.collectibles.forEach((mesh) => {
        mesh.rotation.y += 0.04;
        if (mesh.visible && mesh.position.distanceTo(player.position) < 0.9) {
          mesh.visible = false;
          state.score += 10;
          state.cash += 1;
        }
      });
      custom.hazards.forEach((mesh) => {
        if (mesh.position.distanceTo(player.position) < 1.1) state.hp = Math.max(0, state.hp - 0.45);
      });
      custom.bouncers.forEach((mesh) => {
        if (mesh.position.distanceTo(player.position) < 1.15 && player.position.y <= mesh.position.y + 0.7) state.vy = 0.24;
      });
      if (Math.abs(player.position.x) > worldLimit || Math.abs(player.position.z) > worldLimit || player.position.y < -4 || state.hp <= 0) respawnPlayer(state, player, game.id);
      stats.textContent = `Score ${state.score} | HP ${Math.round(state.hp)} | Creator world by ${game.creator || "CUBIXIA"}`;
      updateCamera(base.camera, player);
    }
    renderOtherPlayers(THREE, base, user, game.id, player, state);
    animateOtherPlayers(base);
  };
  runThree(base);
}

function buildStudioPlayableWorld(THREE, scene, world) {
  const objects = world.objects || [];
  const spawnObject = objects.find((object) => object.type === "spawn") || { position: { x: 0, y: 0, z: 4 } };
  const spawn = { x: Number(spawnObject.position?.x || 0), y: 0.8, z: Number(spawnObject.position?.z || 4) };
  const groundColor = parseColorNumber(world.ground || "#5fbd82");
  const worldSize = Math.max(40, Math.min(500, Number(world.size || 160)));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(worldSize, worldSize), new THREE.MeshStandardMaterial({ color: groundColor, roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.012;
  scene.add(ground);
  if (world.sky) scene.background = new THREE.Color(world.sky);
  const result = { spawn, collectibles: [], hazards: [], bouncers: [] };
  objects.forEach((object) => {
    const mesh = createStudioWorldMesh(THREE, object, false);
    scene.add(mesh);
    if (object.behavior === "collect" || object.type === "coin") result.collectibles.push(mesh);
    if (object.behavior === "damage" || object.type === "hazard") result.hazards.push(mesh);
    if (object.behavior === "bounce" || object.type === "platform") result.bouncers.push(mesh);
  });
  return result;
}

function createStudioWorldMesh(THREE, object, selected = false) {
  const color = parseColorNumber(object.color || "#315cff");
  const materialSettings = studioMaterialSettings(object.material || "plastic", color, selected);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: materialSettings.emissive,
    roughness: materialSettings.roughness,
    metalness: materialSettings.metalness,
    transparent: materialSettings.transparent,
    opacity: materialSettings.opacity
  });
  const size = object.size || { x: 1, y: 1, z: 1 };
  let mesh;
  const asset = object.asset || "";
  if (asset.includes("car")) {
    mesh = createStudioCarModel(THREE, asset, size, color);
  } else if (asset.includes("sword")) {
    mesh = createStudioSwordModel(THREE, size);
  } else if (asset.includes("pizza")) {
    mesh = createStudioPizzaModel(THREE, size, asset);
  } else if (asset.includes("apple")) {
    mesh = createStudioAppleModel(THREE, size);
  } else if (asset.includes("bush")) {
    mesh = createStudioBushModel(THREE, size, asset);
  } else if (object.type === "coin") {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(Math.max(size.x, size.y, size.z) / 2, 24, 14), material);
  } else if (object.type === "spawn") {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(size.x / 2, size.x / 2, size.y, 24), material);
  } else if (object.type === "npc") {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
    body.position.y = size.y / 2;
    const head = new THREE.Mesh(new THREE.SphereGeometry(size.x * 0.34, 16, 12), new THREE.MeshStandardMaterial({ color: 0xf0d0a7 }));
    head.position.y = size.y + size.x * 0.36;
    group.add(body, head);
    mesh = group;
  } else if (object.type === "tree") {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, size.y * 0.45, 8), new THREE.MeshStandardMaterial({ color: 0x8b5a32 }));
    trunk.position.y = size.y * 0.225;
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(size.x * 0.55, size.y * 0.75, 10), material);
    leaves.position.y = size.y * 0.82;
    group.add(trunk, leaves);
    mesh = group;
  } else {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
    mesh.position.y = size.y / 2;
  }
  mesh.userData.objectId = object.id;
  mesh.userData.type = object.type;
  mesh.traverse?.((child) => {
    child.userData.objectId = object.id;
    child.userData.type = object.type;
  });
  const position = object.position || {};
  mesh.position.x += Number(position.x || 0);
  mesh.position.y += Number(position.y || 0);
  mesh.position.z += Number(position.z || 0);
  const rotation = object.rotation || {};
  mesh.rotation.x = Number(rotation.x || 0);
  mesh.rotation.y = Number(rotation.y ?? object.rotationY ?? 0);
  mesh.rotation.z = Number(rotation.z || 0);
  if (selected) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(Math.max(size.x, size.z) * 0.62, 0.035, 8, 36), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(Number(position.x || 0), 0.08, Number(position.z || 0));
    ring.userData.objectId = object.id;
    const group = new THREE.Group();
    group.userData.objectId = object.id;
    group.userData.type = object.type;
    group.add(mesh, ring);
    return group;
  }
  return mesh;
}

function createStudioCarModel(THREE, asset, size, color) {
  const group = new THREE.Group();
  const bodyColor = asset === "tesla-car" ? 0xf8fafc : asset === "sports-car" ? 0xef3340 : asset === "monster-super-car" ? 0x202733 : color;
  const accent = asset === "monster-super-car" ? 0x38aef3 : asset === "sports-car" ? 0xffd166 : 0x111827;
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.38, metalness: 0.22 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.06, metalness: 0.03, transparent: true, opacity: 0.68 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.45, metalness: 0.28 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.26, metalness: 0.7 });
  const sx = Number(size.x || 3);
  const sy = Number(size.y || 1.2);
  const sz = Number(size.z || 4.5);
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(sx, sy * 0.42, sz), bodyMat);
  chassis.position.y = sy * 0.45;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.62, sy * 0.44, sz * 0.42), glassMat);
  cabin.position.set(0, sy * 0.83, -sz * 0.07);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.86, sy * 0.13, sz * 0.34), bodyMat);
  hood.position.set(0, sy * 0.72, -sz * 0.34);
  const rear = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.92, sy * 0.18, sz * 0.24), bodyMat);
  rear.position.set(0, sy * 0.72, sz * 0.36);
  group.add(chassis, cabin, hood, rear);
  const wheelRadius = asset === "monster-super-car" ? sy * 0.38 : sy * 0.25;
  const wheelWidth = asset === "monster-super-car" ? sx * 0.22 : sx * 0.14;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([side, end]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24), tireMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * sx * 0.52, wheelRadius, end * sz * 0.34);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.46, wheelRadius * 0.46, wheelWidth * 1.06, 18), rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.copy(wheel.position);
    group.add(wheel, rim);
  });
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffd166, roughness: 0.2 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff3344, emissive: 0x551111, roughness: 0.2 });
  [-1, 1].forEach((side) => {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.18, sy * 0.08, 0.04), lightMat);
    headlight.position.set(side * sx * 0.25, sy * 0.52, -sz * 0.52);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.16, sy * 0.08, 0.04), tailMat);
    tail.position.set(side * sx * 0.26, sy * 0.52, sz * 0.52);
    group.add(headlight, tail);
  });
  if (asset === "monster-super-car") {
    const roll = new THREE.Mesh(new THREE.TorusGeometry(sx * 0.24, 0.035, 8, 28), new THREE.MeshStandardMaterial({ color: accent, metalness: 0.5, roughness: 0.2 }));
    roll.rotation.x = Math.PI / 2;
    roll.position.set(0, sy * 1.15, -sz * 0.1);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(sx * 1.08, sy * 0.14, sz * 0.08), darkMat);
    bumper.position.set(0, sy * 0.4, -sz * 0.58);
    group.add(roll, bumper);
  } else if (asset === "sports-car") {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.78, sy * 0.06, sz * 0.09), new THREE.MeshStandardMaterial({ color: accent, metalness: 0.25, roughness: 0.35 }));
    spoiler.position.set(0, sy * 0.96, sz * 0.48);
    group.add(spoiler);
  } else {
    const roofLine = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.5, sy * 0.05, sz * 0.52), darkMat);
    roofLine.position.set(0, sy * 1.08, -sz * 0.02);
    group.add(roofLine);
  }
  return group;
}

function createStudioSwordModel(THREE, size) {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xd8e2ef, metalness: 0.75, roughness: 0.18 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffcf55, metalness: 0.35, roughness: 0.28 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x4b2e19, roughness: 0.7 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(size.x * 0.24, size.y * 0.72, size.z * 0.32), metal);
  blade.position.y = size.y * 0.48;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(size.x * 0.17, size.y * 0.22, 4), metal);
  tip.position.y = size.y * 0.94;
  tip.rotation.y = Math.PI / 4;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(size.x * 1.1, size.y * 0.06, size.z * 0.62), gold);
  guard.position.y = size.y * 0.14;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(size.x * 0.1, size.x * 0.1, size.y * 0.28, 10), gripMat);
  grip.position.y = -size.y * 0.04;
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(size.x * 0.18, 16, 10), gold);
  pommel.position.y = -size.y * 0.22;
  group.add(blade, tip, guard, grip, pommel);
  return group;
}

function createStudioAppleModel(THREE, size) {
  const group = new THREE.Group();
  const appleMat = new THREE.MeshStandardMaterial({ color: 0xd92929, roughness: 0.45 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(Math.max(size.x, size.y, size.z) * 0.46, 32, 18), appleMat);
  body.scale.y = 1.08;
  body.position.y = size.y * 0.48;
  const topDent = new THREE.Mesh(new THREE.SphereGeometry(size.x * 0.16, 16, 8), new THREE.MeshStandardMaterial({ color: 0xa51622, roughness: 0.55 }));
  topDent.scale.y = 0.25;
  topDent.position.y = size.y * 0.92;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(size.x * 0.045, size.x * 0.06, size.y * 0.34, 8), new THREE.MeshStandardMaterial({ color: 0x6b3f1d, roughness: 0.8 }));
  stem.position.set(0.04, size.y * 1.08, 0);
  stem.rotation.z = -0.28;
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(size.x * 0.18, 16, 8), new THREE.MeshStandardMaterial({ color: 0x2f9e55, roughness: 0.5 }));
  leaf.scale.set(1.4, 0.28, 0.7);
  leaf.position.set(size.x * 0.18, size.y * 1.1, 0);
  leaf.rotation.z = 0.45;
  group.add(body, topDent, stem, leaf);
  return group;
}

function createStudioPizzaModel(THREE, size, asset) {
  const group = new THREE.Group();
  const cheese = new THREE.MeshStandardMaterial({ color: 0xf6c85f, roughness: 0.6 });
  const crust = new THREE.MeshStandardMaterial({ color: 0xb56b2a, roughness: 0.75 });
  const sauce = new THREE.MeshStandardMaterial({ color: 0xd94332, roughness: 0.62 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(size.x * 0.52, size.x * 0.52, Math.max(0.08, size.y), asset === "pizza-slice" ? 3 : 36), cheese);
  base.position.y = size.y * 0.5;
  const crustRing = new THREE.Mesh(new THREE.TorusGeometry(size.x * 0.52, size.y * 0.45, 8, asset === "pizza-slice" ? 3 : 36), crust);
  crustRing.rotation.x = Math.PI / 2;
  crustRing.position.y = size.y * 0.82;
  group.add(base, crustRing);
  const toppingPositions = [[-0.18, -0.12], [0.18, 0.08], [0, 0.23], [0.24, -0.22], [-0.28, 0.18]];
  toppingPositions.forEach(([x, z], index) => {
    const pep = new THREE.Mesh(new THREE.CylinderGeometry(size.x * 0.055, size.x * 0.055, size.y * 0.25, 14), sauce);
    pep.position.set(x * size.x, size.y * 1.02, z * size.x);
    group.add(pep);
  });
  return group;
}

function createStudioBushModel(THREE, size, asset) {
  const group = new THREE.Group();
  const leafMats = [0x2f9e55, 0x43b36a, 0x1f7a42].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.78 }));
  const positions = [[0, .45, 0], [-.33, .34, .16], [.34, .36, .12], [.08, .52, -.32], [-.15, .58, -.12], [.18, .28, .36]];
  positions.forEach(([x, y, z], index) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 12), leafMats[index % leafMats.length]);
    puff.scale.set(size.x * 0.46, size.y * 0.38, size.z * 0.46);
    puff.position.set(x * size.x, y * size.y, z * size.z);
    group.add(puff);
  });
  if (asset === "flower-bush") {
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xff6fae, roughness: 0.45 });
    [[-.28, .78, .15], [.16, .88, -.22], [.32, .62, .22]].forEach(([x, y, z]) => {
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), flowerMat);
      flower.position.set(x * size.x, y * size.y, z * size.z);
      group.add(flower);
    });
  }
  return group;
}

function studioMaterialSettings(material, color, selected) {
  const base = selected ? 0x1c3555 : 0x000000;
  if (material === "metal") return { roughness: 0.24, metalness: 0.75, emissive: base, transparent: false, opacity: 1 };
  if (material === "neon") return { roughness: 0.18, metalness: 0.05, emissive: color, transparent: false, opacity: 1 };
  if (material === "wood") return { roughness: 0.88, metalness: 0, emissive: base, transparent: false, opacity: 1 };
  if (material === "glass") return { roughness: 0.06, metalness: 0.05, emissive: base, transparent: true, opacity: 0.55 };
  return { roughness: 0.62, metalness: 0.02, emissive: base, transparent: false, opacity: 1 };
}

function parseColorNumber(value) {
  return Number.parseInt(String(value || "#315cff").replace("#", ""), 16);
}

async function startSandbox3D(user, game) {
  const THREE = await loadThree();
  const base = createThreeWorld(THREE, game.id, user.gameSettings);
  const stats = document.querySelector("#gameStats");
  const player = createAvatarMesh(THREE, user, true);
  player.position.set(0, 0.8, 4);
  base.scene.add(player);
  const state = { score: 0, hp: 100, cash: Number(user.lastPlayed.currency || 0), paused: false, vy: 0, respawning: false };
  state.spawnPoint = { x: 0, y: 0.8, z: 4 };
  setupGameMenu(base, user, game.id, state, player);
  setupGameChat(base, user, game.id);
  setupCoreGameSystems(base, game.id, state, player);
  const scenario = buildSandboxObstacles(THREE, base.scene, game.id, state);
  if (scenario.spawnPoint) {
    state.spawnPoint = scenario.spawnPoint;
    player.position.set(scenario.spawnPoint.x, scenario.spawnPoint.y, scenario.spawnPoint.z);
  }
  if (game.id === "hide-seek") setupHideSeekGui(state, scenario, player);
  const collectibles = [];
  for (let i = 0; i < scenario.collectibleCount; i++) {
    const geometry = scenario.collectibleShape === "sphere" ? new THREE.SphereGeometry(0.22, 16, 10) : scenario.collectibleShape === "box" ? new THREE.BoxGeometry(0.28, 0.28, 0.28) : new THREE.OctahedronGeometry(0.22);
    const gem = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: scenario.colors[i % scenario.colors.length], emissive: 0x101010 }));
    const radius = scenario.collectibleRadius || 20;
    const preset = scenario.collectiblePositions?.[i];
    if (preset) gem.position.set(preset[0], preset[1], preset[2]);
    else gem.position.set(-radius / 2 + Math.random() * radius, 0.6, -radius / 2 + Math.random() * radius);
    collectibles.push(gem);
    base.scene.add(gem);
  }
  base.tick = () => {
    if (!state.paused && !state.respawning) {
      movePlayer(base, player, state);
      collectibles.forEach((gem) => {
        gem.rotation.y += 0.04;
        if (gem.visible && gem.position.distanceTo(player.position) < 0.75) {
          gem.visible = false;
          sendMultiplayerAction(game.id, "pickup", state, { label: "pickup" });
          state.score += scenario.scoreValue;
          state.cash += scenario.cashValue;
        }
      });
      scenario.tick?.({ THREE, base, player, state, collectibles });
      scenario.uiTick?.({ state, player, collectibles });
      stats.textContent = scenario.stats(state);
      updateCamera(base.camera, player);
    }
    renderOtherPlayers(THREE, base, user, game.id, player, state);
    animateOtherPlayers(base);
  };
  runThree(base);
}

function setupCoreGameSystems(base, gameId, state, player) {
  state.stamina = Number.isFinite(state.stamina) ? state.stamina : 100;
  state.movementMode = "Walk";
  state.weather = ["Clear", "Rain", "Fog", "Storm", "Snow"][Math.abs(hashString(gameId)) % 5];
  state.dayCycleStart = Date.now();
  const weatherPill = document.querySelector("#weatherPill");
  if (weatherPill) weatherPill.textContent = state.weather;
  if (state.weather === "Fog") base.scene.fog = new THREE_CACHE.Fog(base.scene.background, 18, 82);
  if (state.weather === "Storm" || state.weather === "Rain") {
    const rain = createWeatherParticles(THREE_CACHE, state.weather === "Storm" ? 90 : 55, state.weather === "Storm" ? 0x9fb8d8 : 0xbcd8ff);
    base.scene.add(rain);
    state.weatherParticles = rain;
  }
  document.querySelectorAll("[data-emote]").forEach((button) => {
    button.addEventListener("click", () => {
      state.emote = button.dataset.emote;
      state.emoteUntil = performance.now() + 1800;
      document.querySelector("#movementMode").textContent = state.emote;
      document.querySelector("#emoteWheel")?.classList.add("hidden");
    });
  });
}

function createWeatherParticles(THREE, count, color) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 });
  for (let i = 0; i < count; i++) {
    const drop = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.55, 0.025), mat);
    drop.position.set(-35 + Math.random() * 70, 8 + Math.random() * 18, -35 + Math.random() * 70);
    drop.userData.fallSpeed = 0.12 + Math.random() * 0.18;
    group.add(drop);
  }
  return group;
}

function hashString(value) {
  return String(value || "").split("").reduce((sum, char) => ((sum << 5) - sum + char.charCodeAt(0)) | 0, 0);
}

function setupHideSeekGui(state, scenario, player) {
  const panel = document.querySelector("#hideSeekUi");
  if (!panel) return;
  state.hideRole = "hider";
  state.hideRoundStartedAt = Date.now();
  state.hideRoundSeconds = 150;
  const roleName = panel.querySelector("#hideRoleName");
  const goal = panel.querySelector("#hideGoal");
  const phase = panel.querySelector("#hideSeekPhase");
  const applyRole = (role) => {
    state.hideRole = role;
    if (role === "seeker") {
      roleName.textContent = "You are the Seeker";
      goal.textContent = "Check shelves, cardboard stacks, lockers, tents, and vents.";
      phase.textContent = "Seekers are hunting";
      player.position.set(0, 0.8, -42);
    } else if (role === "spectator") {
      roleName.textContent = "Spectator";
      goal.textContent = "Explore routes and learn the best hiding spots.";
      phase.textContent = "Free roam";
      player.position.set(0, 0.8, 0);
    } else {
      roleName.textContent = "You are a Hider";
      goal.textContent = "Collect hiding tags and stay out of open aisles.";
      phase.textContent = "Hiders are hiding";
      player.position.set(scenario.spawnPoint.x, scenario.spawnPoint.y, scenario.spawnPoint.z);
    }
  };
  applyRole(Math.random() < 0.28 ? "seeker" : "hider");
  scenario.uiTick = ({ state: gameState, player: gamePlayer, collectibles }) => {
    const elapsed = Math.floor((Date.now() - gameState.hideRoundStartedAt) / 1000);
    const remaining = Math.max(0, gameState.hideRoundSeconds - elapsed);
    const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
    const seconds = String(remaining % 60).padStart(2, "0");
    const timer = document.querySelector("#hideSeekTimer");
    const bar = document.querySelector("#hideProgressBar");
    const phaseText = document.querySelector("#hideSeekPhase");
    if (timer) timer.textContent = `${minutes}:${seconds}`;
    const found = collectibles.filter((gem) => !gem.visible).length;
    const progress = gameState.hideRole === "seeker"
      ? clamp(100 - remaining / gameState.hideRoundSeconds * 100, 0, 100)
      : clamp((found / Math.max(1, collectibles.length)) * 100, 0, 100);
    if (bar) bar.style.width = `${progress}%`;
    if (phaseText && remaining <= 0) phaseText.textContent = gameState.hideRole === "seeker" ? "Round over" : "You survived";
    if (Math.abs(gamePlayer.position.x) > 76 || Math.abs(gamePlayer.position.z) > 76) {
      gamePlayer.position.set(gameState.spawnPoint.x, gameState.spawnPoint.y, gameState.spawnPoint.z);
    }
  };
}

function buildSandboxObstacles(THREE, scene, gameId, state) {
  const scenario = {
    colors: [0x315cff, 0x44db78, 0xffcf55, 0xff575f, 0x38aef3],
    collectibleCount: 12,
    collectibleShape: "oct",
    collectibleRadius: 20,
    scoreValue: 10,
    cashValue: 1,
    stats: (gameState) => `Score ${gameState.score} | Cubbits earned ${gameState.cash}`,
    tick: null
  };
  const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
  const emissiveMat = (color, emissive = color) => new THREE.MeshStandardMaterial({ color, emissive, roughness: 0.45 });
  const addBox = (x, y, z, w, h, d, color) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    box.position.set(x, y + h / 2, z);
    scene.add(box);
    return box;
  };
  const addCylinder = (x, y, z, r, h, color, segments = 24) => {
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segments), mat(color));
    cylinder.position.set(x, y + h / 2, z);
    scene.add(cylinder);
    return cylinder;
  };
  const addCone = (x, y, z, r, h, color, segments = 12) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, segments), mat(color));
    cone.position.set(x, y + h / 2, z);
    scene.add(cone);
    return cone;
  };
  const addCardboardBox = (x, z, w = 1.8, h = 1.3, d = 1.8, rot = 0) => {
    const box = addBox(x, 0, z, w, h, d, 0xb9864b);
    box.rotation.y = rot;
    addBox(x, h + 0.01, z, w * 0.96, 0.04, d * 0.96, 0xd0a065).rotation.y = rot;
    const tape = addBox(x, h + 0.04, z, 0.14, 0.035, d * 0.98, 0x7a4a22);
    tape.rotation.y = rot;
    return box;
  };
  const addShelf = (x, z, rot = 0) => {
    const group = new THREE.Group();
    const metal = mat(0x6b7280);
    for (let level = 0; level < 4; level++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.16, 1.3), metal);
      shelf.position.set(0, 0.45 + level * 0.78, 0);
      group.add(shelf);
    }
    [-2.45, 2.45].forEach((sx) => [-0.5, 0.5].forEach((sz) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.1, 0.14), metal);
      post.position.set(sx, 1.55, sz);
      group.add(post);
    }));
    group.position.set(x, 0, z);
    group.rotation.y = rot;
    scene.add(group);
    return group;
  };
  const addLocker = (x, z, color = 0x315cff, rot = 0) => {
    const locker = addBox(x, 0, z, 0.9, 2.5, 0.7, color);
    locker.rotation.y = rot;
    const handle = addBox(x + Math.cos(rot) * 0.32, 1.15, z - Math.sin(rot) * 0.32, 0.06, 0.18, 0.08, 0xd1d5db);
    handle.rotation.y = rot;
    return locker;
  };
  const addTent = (x, z, color = 0xff575f, rot = 0) => {
    const tent = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 4), mat(color));
    tent.position.set(x, 1.1, z);
    tent.rotation.y = Math.PI / 4 + rot;
    scene.add(tent);
    const flap = addBox(x, 0.2, z - 0.72, 0.08, 1.2, 0.08, 0x111827);
    flap.rotation.y = rot;
    return tent;
  };
  const addTree = (x, z, scale = 1) => {
    addCylinder(x, 0, z, 0.18 * scale, 1.2 * scale, 0x7a4a22, 8);
    addCone(x, 1, z, 0.9 * scale, 1.6 * scale, 0x239060, 10);
  };
  const addBarrel = (x, z, color = 0x315cff, rot = 0) => {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.35, 28), mat(color));
    barrel.position.set(x, 0.68, z);
    barrel.rotation.y = rot;
    scene.add(barrel);
    const rimTop = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.035, 8, 28), mat(0x1f2937));
    rimTop.position.set(x, 1.38, z);
    rimTop.rotation.x = Math.PI / 2;
    scene.add(rimTop);
    const rimBottom = rimTop.clone();
    rimBottom.position.y = 0.08;
    scene.add(rimBottom);
    return barrel;
  };
  const addRamp = (x, z, w, d, color, rot = 0) => {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(w, 0.24, d), mat(color));
    ramp.position.set(x, 0.18, z);
    ramp.rotation.set(-0.18, rot, 0);
    scene.add(ramp);
    return ramp;
  };
  const addForklift = (x, z, rot = 0) => {
    const group = new THREE.Group();
    const yellow = mat(0xffcf55);
    const dark = mat(0x111827);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.35, 3.2), yellow);
    body.position.y = 0.8;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.75, 1.4), mat(0x374151));
    cab.position.set(-0.15, 1.85, 0.4);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.4, 0.22), dark);
    mast.position.set(0, 1.9, -1.9);
    const forkA = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 2.6), dark);
    forkA.position.set(-0.45, 0.28, -2.8);
    const forkB = forkA.clone();
    forkB.position.x = 0.45;
    [-0.9, 0.9].forEach((sx) => [-1.05, 1.05].forEach((sz) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 20), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx, 0.35, sz);
      group.add(wheel);
    }));
    group.add(body, cab, mast, forkA, forkB);
    group.position.set(x, 0, z);
    group.rotation.y = rot;
    scene.add(group);
    return group;
  };
  const addOverheadLight = (x, z) => {
    const cable = addCylinder(x, 4.6, z, 0.035, 1.2, 0x111827, 8);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, 0.35, 28), emissiveMat(0xfff7c2, 0x665100));
    lamp.position.set(x, 4.62, z);
    scene.add(lamp);
    const glow = new THREE.PointLight(0xfff4bd, 0.75, 14);
    glow.position.set(x, 3.8, z);
    scene.add(glow);
    return cable;
  };

  if (gameId === "gun-game") {
    scenario.colors = [0xff575f, 0xffcf55];
    scenario.collectibleCount = 6;
    scenario.scoreValue = 25;
    scenario.stats = (gameState) => `Targets ${Math.floor(gameState.score / 25)} | Arena score ${gameState.score} | Click targets`;
    for (let i = 0; i < 12; i++) {
      const target = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.14, 24), mat(i % 2 ? 0xff575f : 0xffcf55));
      target.rotation.x = Math.PI / 2;
      target.position.set(-13 + (i % 4) * 8, 1.2 + (i % 3) * 0.7, -10 + Math.floor(i / 4) * 7);
      scene.add(target);
    }
    addBox(0, 0, -14, 26, 0.2, 0.5, 0x303947);
    addBox(0, 0, 10, 26, 0.2, 0.5, 0x303947);
    return scenario;
  }

  if (gameId === "speed-trials") {
    scenario.colors = [0x38aef3, 0xffffff, 0xffcf55];
    scenario.collectibleCount = 18;
    scenario.scoreValue = 5;
    scenario.stats = (gameState) => `Checkpoints ${gameState.score / 5} | Sprint line ahead | ${gameState.cash} Cubbits`;
    for (let i = 0; i < 9; i++) {
      addBox(0, i * 0.03, -12 + i * 3.1, 4 + (i % 2) * 3, 0.2, 1.1, i % 2 ? 0x38aef3 : 0xffffff);
      const gate = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.06, 12, 40), mat(0xffcf55));
      gate.position.set((i % 2 ? 4 : -4), 1.4, -12 + i * 3.1);
      scene.add(gate);
    }
    return scenario;
  }

  if (gameId === "gravity-flip") {
    scenario.colors = [0x8b5cf6, 0x38aef3, 0xf7e06e];
    scenario.collectibleShape = "sphere";
    scenario.stats = (gameState) => `Gravity cores ${gameState.score / 10} | Jump between floating pads`;
    for (let i = 0; i < 14; i++) {
      const pad = addBox(Math.cos(i) * 8, 0.5 + (i % 4) * 0.55, Math.sin(i * 1.7) * 8, 2.2, 0.22, 2.2, i % 2 ? 0x8b5cf6 : 0x38aef3);
      pad.rotation.y = i * 0.3;
    }
    return scenario;
  }

  if (gameId === "base-defense") {
    scenario.colors = [0x44db78, 0xff575f];
    scenario.collectibleShape = "box";
    scenario.collectibleCount = 10;
    scenario.stats = (gameState) => `Supplies ${gameState.score / 10} | Base HP ${gameState.hp} | Fortify walls`;
    for (let i = 0; i < 4; i++) addBox([-5, 5, 0, 0][i], 0, [0, 0, -5, 5][i], i < 2 ? 0.5 : 10, 1.4, i < 2 ? 10 : 0.5, 0x263544);
    for (let i = 0; i < 8; i++) addBox(-9 + i * 2.5, 0, -8, 0.7, 1.2, 0.7, 0xff575f);
    return scenario;
  }

  if (gameId === "pet-evolution") {
    scenario.colors = [0xff8ab3, 0x44db78, 0x38aef3];
    scenario.collectibleShape = "sphere";
    scenario.collectibleCount = 16;
    scenario.stats = (gameState) => `Pet energy ${gameState.score} | Mutations ${Math.floor(gameState.score / 60)}`;
    for (let i = 0; i < 5; i++) {
      const pet = new THREE.Mesh(new THREE.SphereGeometry(0.45 + i * 0.05, 16, 12), mat(scenario.colors[i % scenario.colors.length]));
      pet.position.set(-6 + i * 3, 0.55, -3 + Math.sin(i) * 5);
      scene.add(pet);
    }
    return scenario;
  }

  if (gameId === "vehicle-builder") {
    scenario.colors = [0x315cff, 0xffcf55, 0x222831];
    scenario.collectibleShape = "box";
    scenario.collectibleCount = 14;
    scenario.stats = (gameState) => `Parts ${gameState.score / 10} | Test track ready`;
    for (let i = 0; i < 10; i++) addBox(Math.cos(i / 10 * Math.PI * 2) * 8, 0, Math.sin(i / 10 * Math.PI * 2) * 8, 2.4, 0.14, 1.1, i % 2 ? 0xffcf55 : 0x315cff);
    addBox(0, 0, 0, 2.2, 0.5, 4, 0x315cff);
    addBox(-1.3, 0, 1.6, 0.6, 0.6, 0.6, 0x111820);
    addBox(1.3, 0, 1.6, 0.6, 0.6, 0.6, 0x111820);
    return scenario;
  }

  if (gameId === "floor-is-lava") {
    scenario.colors = [0xffcf55, 0xffffff];
    scenario.collectibleCount = 8;
    scenario.stats = (gameState) => `Safe tokens ${gameState.score / 10} | Lava rising`;
    const lava = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 0.08, 64), new THREE.MeshStandardMaterial({ color: 0xff575f, emissive: 0x661111 }));
    lava.position.set(0, 0.09, 0);
    scene.add(lava);
    for (let i = 0; i < 16; i++) addBox(-12 + (i % 4) * 8, 0.3 + (i % 4) * 0.2, -10 + Math.floor(i / 4) * 6, 2.5, 0.22, 2.5, i % 2 ? 0x38aef3 : 0xffcf55);
    scenario.tick = ({ player, state: gameState }) => {
      if (player.position.y <= 0.82 && Math.hypot(player.position.x, player.position.z) < 13) respawnPlayer(gameState, player, gameId);
    };
    return scenario;
  }

  if (gameId === "hide-seek") {
    scenario.colors = [0xffcf55, 0x38aef3, 0x44db78, 0xff575f];
    scenario.collectibleShape = "box";
    scenario.collectibleCount = 36;
    scenario.collectibleRadius = 132;
    scenario.scoreValue = 5;
    scenario.cashValue = 1;
    scenario.spawnPoint = { x: 0, y: 0.8, z: 34 };
    scenario.stats = (gameState) => `Hiding tags ${gameState.score / 5} | Box City warehouse | Find cover`;
    addBox(0, 0, 0, 158, 0.08, 158, 0x7f8474);
    addBox(0, 0.05, -79, 160, 5.2, 0.55, 0x2f3744);
    addBox(0, 0.05, 79, 160, 5.2, 0.55, 0x2f3744);
    addBox(-79, 0.05, 0, 0.55, 5.2, 160, 0x2f3744);
    addBox(79, 0.05, 0, 0.55, 5.2, 160, 0x2f3744);
    for (let i = 0; i < 9; i++) {
      addBox(-64 + i * 16, 0.08, -70, 0.25, 5.4, 3.6, 0x4b5563);
      addBox(-64 + i * 16, 0.08, 70, 0.25, 5.4, 3.6, 0x4b5563);
    }
    for (let i = 0; i < 16; i++) addOverheadLight(-56 + (i % 8) * 16, -48 + Math.floor(i / 8) * 44);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        addShelf(-48 + col * 18, -42 + row * 22, row % 2 ? Math.PI / 2 : 0);
      }
    }
    const boxSpots = [
      [-61, 54, 5.4, 3.4, 5.2], [-53, 49, 4.4, 6.0, 4.2], [-43, 58, 6.5, 2.8, 5.8],
      [43, 53, 6.0, 3.8, 5.2], [55, 61, 4.3, 6.5, 4.1], [65, 43, 7.2, 3.0, 5.2],
      [-58, -58, 5.8, 3.4, 5.0], [-42, -64, 4.8, 5.5, 4.6], [52, -62, 7.4, 3.1, 6.2],
      [18, -48, 4.2, 6.6, 4.2], [-10, -57, 7.0, 3.0, 5.0], [8, 36, 5.2, 4.7, 5.2],
      [-28, 24, 6.2, 3.8, 4.8], [29, 19, 4.8, 5.4, 4.4], [-70, -8, 4.2, 5.8, 4.2], [69, -8, 4.2, 5.8, 4.2]
    ];
    boxSpots.forEach(([x, z, w, h, d], index) => addCardboardBox(x, z, w, h, d, index * 0.22));
    for (let i = 0; i < 15; i++) addLocker(-69 + i * 1.35, 20, i % 3 === 0 ? 0xff575f : i % 3 === 1 ? 0x315cff : 0x44db78, 0);
    for (let i = 0; i < 14; i++) addLocker(62, -34 + i * 1.35, i % 2 ? 0x8b5cf6 : 0x38aef3, Math.PI / 2);
    addTent(-35, 21, 0xff575f, -0.4);
    addTent(36, 28, 0x38aef3, 0.35);
    addTent(12, -24, 0xffcf55, 0.9);
    addTent(-48, -20, 0x44db78, -0.8);
    addForklift(-14, 48, -0.35);
    addForklift(42, -42, Math.PI * 0.62);
    for (let i = 0; i < 16; i++) addBarrel(-66 + (i % 8) * 18, 3 + Math.floor(i / 8) * 28, i % 2 ? 0x315cff : 0xff575f, i * 0.2);
    for (let i = 0; i < 7; i++) {
      const vent = addBox(-42 + i * 14, 3.8, -6 + Math.sin(i) * 8, 8.8, 0.42, 1.4, 0x9ca3af);
      vent.rotation.y = i % 2 ? Math.PI / 2 : 0;
    }
    for (let i = 0; i < 24; i++) {
      const pallet = addBox(-68 + (i % 8) * 18, 0.02, -22 + Math.floor(i / 8) * 20, 5.2, 0.22, 3.4, 0x7a4a22);
      pallet.rotation.y = i * 0.18;
    }
    for (let i = 0; i < 10; i++) addRamp(-55 + i * 12, -70 + (i % 2) * 142, 6, 5, 0x4b5563, i * 0.15);
    scenario.collectiblePositions = [
      [-66, .8, 56], [-48, .8, 44], [-28, .8, 62], [-8, .8, 50], [16, .8, 60], [42, .8, 54],
      [64, .8, 42], [-70, .8, 18], [-48, .8, 7], [-22, .8, 17], [0, .8, -2], [24, .8, 16],
      [54, .8, 9], [70, .8, -14], [-67, .8, -34], [-46, .8, -58], [-22, .8, -43], [2, .8, -62],
      [28, .8, -46], [56, .8, -64], [70, .8, -48], [-34, 3.9, -6], [-15, 3.9, 2], [7, 3.9, -5],
      [29, 3.9, 5], [48, 3.9, -7], [-59, .8, -7], [60, .8, 26], [-12, .8, 31], [33, .8, -25],
      [-44, .8, -20], [45, .8, 34], [0, .8, 36], [-72, .8, 68], [72, .8, 68], [0, .8, -72]
    ];
    return scenario;
  }

  if (gameId === "fishing-contest") {
    scene.background = new THREE.Color(0x9ed8ff);
    scenario.colors = [0x38aef3, 0xffcf55, 0x44db78];
    scenario.collectibleShape = "sphere";
    scenario.collectibleCount = 18;
    scenario.collectibleRadius = 32;
    scenario.scoreValue = 10;
    scenario.stats = (gameState) => `Fish caught ${gameState.score / 10} | Dockside contest | ${gameState.cash} Cubbits`;
    const water = new THREE.Mesh(new THREE.CircleGeometry(15, 64), new THREE.MeshStandardMaterial({ color: 0x38aef3, roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.82 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.035, -8);
    scene.add(water);
    addBox(0, 0.04, 5, 4, 0.25, 18, 0x8b5a32);
    addBox(-6, 0.04, -2, 8, 0.22, 2, 0x8b5a32);
    addBox(6, 0.04, -2, 8, 0.22, 2, 0x8b5a32);
    for (let i = 0; i < 16; i++) {
      addCylinder(Math.cos(i) * 13, 0.02, -8 + Math.sin(i) * 10, 0.07, 0.9, 0x2f9e55, 6).rotation.z = 0.25;
    }
    for (let i = 0; i < 8; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.04, 8, 28), emissiveMat(0xffcf55, 0x554400));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(-10 + i * 3, 0.08, -9 + Math.sin(i) * 5);
      scene.add(ring);
    }
    return scenario;
  }

  if (gameId === "treasure-hunt") {
    scene.background = new THREE.Color(0xf5d78e);
    scenario.colors = [0xffcf55, 0x38aef3, 0xffffff];
    scenario.collectibleShape = "box";
    scenario.collectibleCount = 20;
    scenario.scoreValue = 15;
    scenario.stats = (gameState) => `Relics ${Math.floor(gameState.score / 15)} | Ruin Island | ${gameState.cash} Cubbits`;
    for (let i = 0; i < 18; i++) addCylinder(-16 + (i % 6) * 6, 0, -16 + Math.floor(i / 6) * 8, 0.35, 1 + (i % 3) * 0.7, i % 2 ? 0x9f8a5f : 0x6f7966, 12);
    addBox(0, 0, -8, 9, 0.35, 2.4, 0x8b7350);
    addBox(-9, 0, 3, 6, 0.25, 2, 0x8b7350).rotation.y = 0.5;
    addBox(9, 0, 5, 6, 0.25, 2, 0x8b7350).rotation.y = -0.4;
    for (let i = 0; i < 8; i++) {
      const chest = addBox(-12 + i * 3.5, 0, 11 + Math.sin(i) * 2, 1.4, 0.8, 1.0, 0x7a4a22);
      addBox(chest.position.x, 0.78, chest.position.z, 1.45, 0.12, 1.05, 0xffcf55);
    }
    for (let i = 0; i < 12; i++) addTree(-18 + Math.random() * 36, -20 + Math.random() * 40, 0.8 + Math.random() * 0.5);
    return scenario;
  }

  if (gameId === "factory-tycoon") {
    scene.background = new THREE.Color(0x313642);
    scenario.colors = [0xffcf55, 0x44db78, 0x38aef3];
    scenario.collectibleShape = "box";
    scenario.collectibleCount = 16;
    scenario.scoreValue = 20;
    scenario.cashValue = 3;
    scenario.stats = (gameState) => `Parts processed ${Math.floor(gameState.score / 20)} | Factory cash ${gameState.cash}`;
    addBox(0, 0, 0, 32, 0.08, 24, 0x434957);
    for (let i = 0; i < 4; i++) {
      const conveyor = addBox(-12 + i * 8, 0.08, -2, 6.8, 0.28, 1.8, 0x1f2937);
      const belt = addBox(conveyor.position.x, 0.38, -2, 6.4, 0.08, 1.35, 0x111827);
      belt.userData.speed = 0.04 + i * 0.01;
      addBox(conveyor.position.x + 2.2, 0.46, -2, 0.18, 0.18, 1.5, 0xffcf55);
    }
    for (let i = 0; i < 6; i++) {
      addBox(-14 + i * 5.6, 0, 5, 2.2, 2.4, 2, i % 2 ? 0x315cff : 0x44db78);
      addCylinder(-14 + i * 5.6, 2.35, 5, 0.45, 0.45, 0xffcf55, 24);
    }
    for (let i = 0; i < 12; i++) addBox(-15 + Math.random() * 30, 0, -10 + Math.random() * 20, 0.8, 0.8, 0.8, i % 2 ? 0xffcf55 : 0x38aef3);
    return scenario;
  }

  for (let i = 0; i < 18; i++) {
    const h = 0.25 + (i % 4) * 0.35;
    addBox(-14 + (i % 6) * 5.2, 0, -11 + Math.floor(i / 6) * 6, 1.4 + (i % 3), h, 1.4, scenario.colors[i % scenario.colors.length]);
  }
  return scenario;
}

function gameWorldTheme(gameId) {
  const themes = {
    "coaster-tycoon": { sky: 0x99d9ff, ground: 0x68b65c, size: 90, cameraDistance: 9.5 },
    "cubixia-survival": { sky: 0x0b1218, ground: 0x243342, size: 80, cameraDistance: 7.8 },
    "gun-game": { sky: 0x101827, ground: 0x202a39, size: 72, cameraDistance: 8.2 },
    "speed-trials": { sky: 0xbcecff, ground: 0xdce8f7, size: 82, cameraDistance: 9 },
    "gravity-flip": { sky: 0x160f2d, ground: 0x221a3d, size: 76, cameraDistance: 8.8 },
    "base-defense": { sky: 0x10151f, ground: 0x263544, size: 78, cameraDistance: 8.4 },
    "pet-evolution": { sky: 0xbff5df, ground: 0x7fd18d, size: 78, cameraDistance: 8.4 },
    "vehicle-builder": { sky: 0xb8ddff, ground: 0x3b4454, size: 82, cameraDistance: 9 },
    "floor-is-lava": { sky: 0x351013, ground: 0x291316, size: 76, cameraDistance: 8.4 },
    "hide-seek": { sky: 0xd9e4f2, ground: 0x777d70, size: 182, cameraDistance: 13.5 },
    "fishing-contest": { sky: 0x9ed8ff, ground: 0x7cc88b, size: 82, cameraDistance: 9.2 },
    "treasure-hunt": { sky: 0xf5d78e, ground: 0xd7b46d, size: 86, cameraDistance: 9 },
    "factory-tycoon": { sky: 0x313642, ground: 0x434957, size: 82, cameraDistance: 8.8 }
  };
  return themes[gameId] || { sky: 0x88c7ff, ground: 0x5fbd82, size: 90, cameraDistance: 8.5 };
}

function createThreeWorld(THREE, gameId, gameSettings = {}) {
  const mount = document.querySelector("#threeMount");
  const scene = new THREE.Scene();
  const theme = gameWorldTheme(gameId);
  scene.background = new THREE.Color(theme.sky);
  const camera = new THREE.PerspectiveCamera(65, mount.clientWidth / mount.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  mount.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 2.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(6, 10, 4);
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(theme.size, theme.size), new THREE.MeshStandardMaterial({ color: theme.ground, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  addSafeZonePad(THREE, scene, gameId);
  if (gameId === "coaster-tycoon") buildTycoonPark(THREE, scene);
  else if (gameId === "cubixia-survival") {
    for (let i = 0; i < 18; i++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(1 + Math.random() * 2, 1 + Math.random() * 3, 1 + Math.random() * 2), new THREE.MeshStandardMaterial({ color: 0x32465a }));
      let x = -18 + Math.random() * 36;
      let z = -18 + Math.random() * 36;
      if (Math.hypot(x, z) < 7) {
        x += x < 0 ? -7 : 7;
        z += z < 0 ? -7 : 7;
      }
      box.position.set(x, box.geometry.parameters.height / 2, z);
      scene.add(box);
    }
  }
  const keys = {};
  const controls = {
    yaw: 0,
    pitch: -0.34,
    distance: theme.cameraDistance,
    targetDistance: theme.cameraDistance,
    sensitivity: Number(gameSettings.cameraSensitivity || 1),
    invertY: gameSettings.cameraInverted !== false,
    smoothZoom: gameSettings.smoothZoom !== false,
    firstPersonZoom: gameSettings.firstPersonZoom !== false,
    cameraFollow: gameSettings.cameraFollow || "free",
    rmb: false,
    pointerLocked: false,
    lastX: 0,
    lastY: 0,
    dragged: false
  };
  mount.addEventListener("contextmenu", (event) => event.preventDefault());
  mount.addEventListener("pointerdown", (event) => {
    if (event.button !== 2) return;
    event.preventDefault();
    controls.rmb = true;
    controls.dragged = false;
    controls.lastX = event.clientX;
    controls.lastY = event.clientY;
    try {
      const lockRequest = mount.requestPointerLock?.();
      lockRequest?.catch?.(() => {
        controls.pointerLocked = false;
      });
    } catch {
      controls.pointerLocked = false;
    }
    if (document.pointerLockElement !== mount) {
      try {
        mount.setPointerCapture?.(event.pointerId);
      } catch {
        controls.pointerLocked = false;
      }
    }
    mount.classList.add("camera-dragging");
  });
  mount.addEventListener("pointermove", (event) => {
    if (!controls.rmb && document.pointerLockElement !== mount) return;
    const dx = event.movementX || event.clientX - controls.lastX;
    const dy = event.movementY || event.clientY - controls.lastY;
    controls.lastX = event.clientX;
    controls.lastY = event.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 2) controls.dragged = true;
    controls.yaw -= dx * 0.006 * controls.sensitivity;
    controls.pitch = clamp(controls.pitch + (controls.invertY ? -dy : dy) * 0.0045 * controls.sensitivity, -1.15, 0.55);
  });
  const endCameraDrag = (event) => {
    if (event.button !== 2 && event.type !== "pointerleave") return;
    controls.rmb = false;
    try {
      if (document.pointerLockElement === mount) {
        const exitRequest = document.exitPointerLock?.();
        exitRequest?.catch?.(() => {
          controls.pointerLocked = false;
        });
      }
    } catch {
      controls.pointerLocked = false;
    }
    try {
      mount.releasePointerCapture?.(event.pointerId);
    } catch {
      controls.pointerLocked = false;
    }
    mount.classList.remove("camera-dragging");
    setTimeout(() => { controls.dragged = false; }, 80);
  };
  const pointerLockHandler = () => {
    controls.pointerLocked = document.pointerLockElement === mount;
    controls.rmb = controls.pointerLocked || controls.rmb;
    mount.classList.toggle("camera-dragging", controls.pointerLocked || controls.rmb);
  };
  document.addEventListener("pointerlockchange", pointerLockHandler);
  mount.addEventListener("pointerup", endCameraDrag);
  mount.addEventListener("pointerleave", endCameraDrag);
  mount.addEventListener("wheel", (event) => {
    event.preventDefault();
    controls.targetDistance = clamp(controls.targetDistance + Math.sign(event.deltaY) * 0.75, 0.45, 18);
  }, { passive: false });
  document.onkeydown = (event) => {
    if (event.target?.matches?.("input, textarea, select")) {
      if (event.key === "Escape") event.target.blur();
      return;
    }
    if (event.key === "/") {
      event.preventDefault();
      toggleGameChat(true);
      return;
    }
    if (event.key === ".") {
      event.preventDefault();
      document.querySelector("#emoteWheel")?.classList.toggle("hidden");
      return;
    }
    keys[event.key.toLowerCase()] = true;
    if (event.key === "Escape") toggleGameMenu(true);
  };
  document.onkeyup = (event) => { keys[event.key.toLowerCase()] = false; };
  window.onresize = () => {
    camera.aspect = mount.clientWidth / mount.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(mount.clientWidth, mount.clientHeight);
  };
  runtime = { scene, camera, renderer, mount, keys, controls, pointerLockHandler, otherMeshes: new Map(), frame: 0, pollAt: 0, clock: new THREE.Clock() };
  return runtime;
}

function safezonePositionForGameClient(gameId) {
  const safezones = {
    "cubixia-survival": { x: 0, y: 0.04, z: 0 },
    "coaster-tycoon": { x: 0, y: 0.04, z: 5.5 },
    "hide-seek": { x: -28, y: 0.04, z: 24 },
    "factory-tycoon": { x: 0, y: 0.04, z: 4 }
  };
  return safezones[gameId] || { x: 0, y: 0.04, z: 4 };
}

function addSafeZonePad(THREE, scene, gameId) {
  const position = safezonePositionForGameClient(gameId);
  const group = new THREE.Group();
  group.name = "CUBIXIA Safe Zone";
  group.position.set(position.x, position.y, position.z);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x123a57, roughness: 0.34, metalness: 0.08 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x35d39f, emissive: 0x138f66, roughness: 0.18 });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.12, 48), baseMat);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.34, 0.08, 10, 64), glowMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.11;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 32), glowMat);
  core.position.y = 0.12;
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.4, 12), new THREE.MeshStandardMaterial({ color: 0x8df7ce, emissive: 0x35d39f, transparent: true, opacity: 0.55 }));
  beacon.position.y = 1.25;
  group.add(pad, ring, core, beacon);
  scene.add(group);
}

function createAvatarMesh(THREE, user, local = false) {
  const style = normalizeAvatarStyle(user.avatarStyle);
  const group = new THREE.Group();
  group.userData.avatarSource = "fallback";
  const skin = new THREE.MeshStandardMaterial({ color: style.skin || 0xf0d0a7 });
  const shirt = new THREE.MeshStandardMaterial({ color: style.shirt || 0x2268d8 });
  const pants = new THREE.MeshStandardMaterial({ color: style.pants || 0x252b35 });
  const hair = new THREE.MeshStandardMaterial({ color: style.hair || 0x7a4a1d });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111820 });
  const faceMat = new THREE.MeshStandardMaterial({ color: 0x111820 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.39, 24, 16), skin);
  head.position.y = 1.82;
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.16, 0.76), hair);
  hairTop.position.y = 2.22;
  const hairFront = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.22, 0.16), hair);
  hairFront.position.set(0, 2.08, -0.36);
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.025);
  const leftEye = new THREE.Mesh(eyeGeo, faceMat);
  const rightEye = leftEye.clone();
  leftEye.position.set(-0.16, 1.87, -0.355);
  rightEye.position.set(0.16, 1.87, -0.355);
  const smile = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.025), faceMat);
  smile.position.set(0, 1.68, -0.355);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.92, 0.46), shirt);
  body.position.y = 1.08;
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.035), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  chest.position.set(0, 1.34, -0.25);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.82, 0.28), skin);
  const rightArm = leftArm.clone();
  leftArm.position.set(-0.67, 1.1, 0);
  rightArm.position.set(0.67, 1.1, 0);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.78, 0.32), pants);
  const rightLeg = leftLeg.clone();
  leftLeg.position.set(-0.24, 0.38, 0);
  rightLeg.position.set(0.24, 0.38, 0);
  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.44), shoeMat);
  const rightShoe = leftShoe.clone();
  leftShoe.position.set(-0.24, 0.02, -0.04);
  rightShoe.position.set(0.24, 0.02, -0.04);
  const fallbackParts = [head, hairTop, hairFront, leftEye, rightEye, smile, body, chest, leftArm, rightArm, leftLeg, rightLeg, leftShoe, rightShoe];
  group.userData.parts = { leftArm, rightArm, leftLeg, rightLeg, head, body, chest, hairTop, hairFront, leftShoe, rightShoe };
  group.userData.fallbackParts = fallbackParts;
  group.add(...fallbackParts);
  applyAvatarItems(THREE, group, user);
  hideGeneratedAvatarParts(group);
  attachBlendAvatarModel(THREE, group, user);
  if (!local) {
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 28px Inter"; ctx.fillText(user.username, 8, 40);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
    label.position.y = 2.7;
    label.scale.set(2.4, 0.6, 1);
    group.add(label);
  }
  return group;
}

async function attachBlendAvatarModel(THREE, group, user) {
  try {
    const [gltf, tools] = await Promise.all([loadCubixiaAvatarModel(), loadGltfTools()]);
    if (!group.userData || group.userData.blendModel) return;
    const model = tools.SkeletonUtils.clone(gltf.scene);
    model.name = "CubixiaBlenderAvatar";
    let hasSkinning = false;
    model.traverse((node) => {
      if (!node.isMesh) return;
      if (node.isSkinnedMesh || (node.geometry?.attributes?.skinIndex && node.geometry?.attributes?.skinWeight)) hasSkinning = true;
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.geometry) node.geometry = node.geometry.clone();
      if (node.material) node.material = node.material.clone();
    });
    const boneDrivenParts = hasSkinning ? null : buildBoneDrivenBlendAvatar(THREE, model, user);
    if (!boneDrivenParts) applyBlendAvatarColors(THREE, model, user);
    const proceduralParts = null;
    const restPose = captureBlendRestPose(model);
    normalizeImportedAvatar(THREE, model);
    group.add(model);
    group.userData.avatarSource = "blend";
    group.userData.blendModel = model;
    group.userData.blendHasSkinning = hasSkinning;
    group.userData.blendBoneDriven = Boolean(boneDrivenParts);
    group.userData.blendBoneDrivenParts = boneDrivenParts;
    group.userData.blendProceduralParts = proceduralParts;
    group.userData.blendBaseY = model.position.y;
    group.userData.blendRestPose = restPose;
    removeGeneratedAvatarParts(group);
    applyBlendAvatarItems(THREE, group, user);
    if (gltf.animations?.length) {
      const mixer = new THREE.AnimationMixer(model);
      const clip = gltf.animations.find((animation) => /walk|run|armature/i.test(animation.name)) || gltf.animations[0];
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat);
      action.play();
      action.paused = true;
      group.userData.blendMixer = mixer;
      group.userData.blendWalkAction = action;
      group.userData.blendAnimationName = clip.name;
      group.userData.lastBlendTick = performance.now();
    }
  } catch (error) {
    group.userData.fallbackParts?.forEach((part) => { part.visible = true; });
    group.userData.itemParts?.forEach((part) => { part.visible = true; });
    console.warn("CUBIXIA avatar.blend model could not load; using generated avatar.", error);
  }
}

function hideGeneratedAvatarParts(group) {
  group.userData.fallbackParts?.forEach((part) => { part.visible = false; });
  group.userData.itemParts?.forEach((part) => { part.visible = false; });
}

function removeGeneratedAvatarParts(group) {
  group.userData.fallbackParts?.forEach((part) => part.parent?.remove(part));
  group.userData.itemParts?.forEach((part) => part.parent?.remove(part));
  group.userData.fallbackParts = [];
  group.userData.itemParts = [];
}

function captureBlendRestPose(model) {
  const restPose = [];
  model.traverse((node) => {
    if (!node.isBone) return;
    restPose.push({
      bone: node,
      position: node.position.clone(),
      quaternion: node.quaternion.clone(),
      scale: node.scale.clone()
    });
  });
  return restPose;
}

function applyBlendRestPose(player) {
  const restPose = player.userData.blendRestPose || [];
  restPose.forEach((entry) => {
    entry.bone.position.copy(entry.position);
    entry.bone.quaternion.copy(entry.quaternion);
    entry.bone.scale.copy(entry.scale);
  });
  player.userData.blendModel?.updateMatrixWorld(true);
}

function normalizeImportedAvatar(THREE, model) {
  model.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(model);
  let size = box.getSize(new THREE.Vector3());
  if (size.z > size.x * 1.6) {
    model.rotation.y += Math.PI / 2;
    model.userData.autoAlignedToCubixia = true;
    model.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(model);
    size = box.getSize(new THREE.Vector3());
  }
  const height = size.y || 1;
  const scale = 2.22 / height;
  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(model);
  const center = scaledBox.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.y -= scaledBox.min.y + AVATAR_ROOT_HEIGHT;
  model.position.z -= center.z;
}

function applyBlendAvatarColors(THREE, model, user) {
  const style = normalizeAvatarStyle(user.avatarStyle);
  model.traverse((node) => {
    if (!node.isMesh || !node.geometry?.attributes?.position) return;
    const geometry = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry;
    if (geometry !== node.geometry) node.geometry = geometry;
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const position = geometry.attributes.position;
    const components = connectedGeometryComponents(THREE, geometry);
    const colors = new Float32Array(position.count * 3);
    const color = new THREE.Color();
    components.forEach((component) => {
      const partName = classifyBlendComponent(THREE, component.box, box);
      component.indices.forEach((index) => {
        color.set(colorForBlendVertex(THREE, position, index, box, style, partName, component.box));
        color.toArray(colors, index * 3);
      });
    });
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    node.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.68,
      metalness: 0.04
    });
  });
}

function buildBoneDrivenBlendAvatar(THREE, model, user) {
  let sourceMesh = null;
  model.traverse((node) => {
    if (!sourceMesh && node.isMesh && node.geometry?.attributes?.position) sourceMesh = node;
  });
  if (!sourceMesh) return null;
  const bones = {};
  model.traverse((node) => {
    if (node.isBone) bones[node.name] = node;
  });
  const sourceGeometry = sourceMesh.geometry.index ? sourceMesh.geometry.toNonIndexed() : sourceMesh.geometry.clone();
  if (!sourceGeometry.attributes.normal) sourceGeometry.computeVertexNormals();
  sourceGeometry.computeBoundingBox();
  const fullBox = sourceGeometry.boundingBox.clone();
  const components = connectedGeometryComponents(THREE, sourceGeometry);
  if (components.length < 4) return null;

  model.updateMatrixWorld(true);
  sourceMesh.updateMatrixWorld(true);
  const style = normalizeAvatarStyle(user.avatarStyle);
  const created = [];
  components.forEach((component) => {
    const partName = classifyBlendComponent(THREE, component.box, fullBox);
    const bone = boneForBlendPart(partName, bones);
    if (!bone) return;
    bone.updateMatrixWorld(true);
    const geometry = geometryFromComponentForBone(THREE, sourceMesh, sourceGeometry, component, bone, partName, fullBox, style);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.68,
      metalness: 0.04
    }));
    mesh.name = `Cubixia_${partName}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    bone.add(mesh);
    created.push(mesh);
  });
  if (created.length < 4) {
    created.forEach((mesh) => mesh.parent?.remove(mesh));
    return null;
  }
  sourceMesh.visible = false;
  return { meshes: created };
}

function boneForBlendPart(partName, bones) {
  const map = {
    head: "Bone007",
    torso: "Bone007",
    leftArm: "Bone003",
    rightArm: "Bone006",
    leftLeg: "Bone011",
    rightLeg: "Bone010"
  };
  return bones[map[partName]] || bones.Bone007 || bones.Bone;
}

function buildSegmentedBlendAvatar(THREE, model, user) {
  let sourceMesh = null;
  model.traverse((node) => {
    if (!sourceMesh && node.isMesh && node.geometry?.attributes?.position) sourceMesh = node;
  });
  if (!sourceMesh) return null;
  const sourceGeometry = sourceMesh.geometry.index ? sourceMesh.geometry.toNonIndexed() : sourceMesh.geometry.clone();
  if (!sourceGeometry.attributes.normal) sourceGeometry.computeVertexNormals();
  const position = sourceGeometry.attributes.position;
  if (position.count < 24) return null;

  const components = connectedGeometryComponents(THREE, sourceGeometry);
  if (components.length < 4) return null;

  sourceGeometry.computeBoundingBox();
  const fullBox = sourceGeometry.boundingBox.clone();
  const style = normalizeAvatarStyle(user.avatarStyle);
  const container = new THREE.Group();
  container.name = "CubixiaSegmentedAvatar";
  container.position.copy(sourceMesh.position);
  container.rotation.copy(sourceMesh.rotation);
  container.scale.copy(sourceMesh.scale);

  const partGroups = {};
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.68,
    metalness: 0.04
  });

  components
    .sort((a, b) => b.indices.length - a.indices.length)
    .forEach((component, index) => {
      const partName = classifyBlendComponent(THREE, component.box, fullBox);
      const pivot = blendPartPivot(THREE, component.box, partName);
      const geometry = geometryFromComponent(THREE, sourceGeometry, component.indices, pivot, partName, fullBox, style);
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const pivotGroup = new THREE.Group();
      pivotGroup.name = `Avatar_${partName}_${index}`;
      pivotGroup.position.copy(pivot);
      pivotGroup.add(mesh);
      container.add(pivotGroup);
      if (!partGroups[partName]) partGroups[partName] = pivotGroup;
    });

  if (!partGroups.head || !partGroups.torso) return null;
  sourceMesh.visible = false;
  sourceMesh.parent.add(container);
  return { root: container, parts: partGroups, baseRootY: container.position.y };
}

function connectedGeometryComponents(THREE, geometry) {
  const position = geometry.attributes.position;
  const parent = Array.from({ length: position.count }, (_, index) => index);
  const find = (index) => {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  };
  const union = (left, right) => {
    const rootLeft = find(left);
    const rootRight = find(right);
    if (rootLeft !== rootRight) parent[rootRight] = rootLeft;
  };
  const byPosition = new Map();
  for (let i = 0; i < position.count; i += 1) {
    const key = `${position.getX(i).toFixed(4)},${position.getY(i).toFixed(4)},${position.getZ(i).toFixed(4)}`;
    if (byPosition.has(key)) union(i, byPosition.get(key));
    else byPosition.set(key, i);
  }
  for (let i = 0; i < position.count; i += 3) {
    union(i, i + 1);
    union(i, i + 2);
  }
  const components = new Map();
  for (let i = 0; i < position.count; i += 3) {
    const root = find(i);
    if (!components.has(root)) components.set(root, { indices: [], box: null });
    const component = components.get(root);
    component.indices.push(i, i + 1, i + 2);
  }
  components.forEach((component) => {
    const box = new THREE.Box3();
    component.indices.forEach((index) => {
      box.expandByPoint(new THREE.Vector3(position.getX(index), position.getY(index), position.getZ(index)));
    });
    component.box = box;
  });
  return Array.from(components.values());
}

function classifyBlendComponent(THREE, box, fullBox) {
  const center = box.getCenter(new THREE.Vector3());
  const y = (center.y - fullBox.min.y) / Math.max(0.001, fullBox.max.y - fullBox.min.y);
  const z = (center.z - fullBox.min.z) / Math.max(0.001, fullBox.max.z - fullBox.min.z);
  if (y > 0.72) return "head";
  if (y < 0.34) return z < 0.5 ? "leftLeg" : "rightLeg";
  if (z < 0.24) return "leftArm";
  if (z > 0.76) return "rightArm";
  return "torso";
}

function blendPartPivot(THREE, box, partName) {
  const center = box.getCenter(new THREE.Vector3());
  if (partName.includes("Arm") || partName.includes("Leg")) {
    return new THREE.Vector3(center.x, box.max.y, center.z);
  }
  return center;
}

function geometryFromComponent(THREE, sourceGeometry, indices, pivot, partName, fullBox, style) {
  const position = sourceGeometry.attributes.position;
  const normal = sourceGeometry.attributes.normal;
  const positions = [];
  const normals = [];
  const colors = [];
  const color = new THREE.Color();
  const partBox = new THREE.Box3();
  indices.forEach((index) => {
    partBox.expandByPoint(new THREE.Vector3(position.getX(index), position.getY(index), position.getZ(index)));
  });
  indices.forEach((index) => {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    positions.push(x - pivot.x, y - pivot.y, z - pivot.z);
    normals.push(normal.getX(index), normal.getY(index), normal.getZ(index));
    color.set(colorForBlendVertex(THREE, position, index, fullBox, style, partName, partBox));
    colors.push(color.r, color.g, color.b);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

function geometryFromComponentForBone(THREE, sourceMesh, sourceGeometry, component, bone, partName, fullBox, style) {
  const position = sourceGeometry.attributes.position;
  const positions = [];
  const colors = [];
  const color = new THREE.Color();
  const worldPoint = new THREE.Vector3();
  const localPoint = new THREE.Vector3();
  component.indices.forEach((index) => {
    worldPoint.set(position.getX(index), position.getY(index), position.getZ(index));
    sourceMesh.localToWorld(worldPoint);
    localPoint.copy(worldPoint);
    bone.worldToLocal(localPoint);
    positions.push(localPoint.x, localPoint.y, localPoint.z);
    color.set(colorForBlendVertex(THREE, position, index, fullBox, style, partName, component.box));
    colors.push(color.r, color.g, color.b);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function colorForBlendVertex(THREE, position, index, fullBox, style, partName = "", partBox = null) {
  const y = position.getY(index);
  const z = position.getZ(index);
  const yNorm = (y - fullBox.min.y) / Math.max(0.001, fullBox.max.y - fullBox.min.y);
  const zNorm = (z - fullBox.min.z) / Math.max(0.001, fullBox.max.z - fullBox.min.z);
  if (partName === "head") {
    const localY = partBox ? (y - partBox.min.y) / Math.max(0.001, partBox.max.y - partBox.min.y) : yNorm;
    return localY > 0.68 ? style.hair : style.skin;
  }
  if (partName.includes("Leg")) return style.pants;
  if (partName.includes("Arm")) return style.skin;
  if (partName === "torso") return style.shirt;
  if (yNorm > 0.84) return yNorm > 0.94 ? style.hair : style.skin;
  if (yNorm < 0.36) return style.pants;
  if (zNorm < 0.18 || zNorm > 0.82) return style.skin;
  return style.shirt;
}

function updateBlendAvatarAnimation(player, moving, jumping, options = {}) {
  if (player.userData.avatarSource === "blend") hideGeneratedAvatarParts(player);
  const now = performance.now();
  const delta = Math.min(0.08, Math.max(0.001, (now - (player.userData.lastBlendTick || now)) / 1000));
  player.userData.lastBlendTick = now;
  const mixer = player.userData.blendMixer;
  const action = player.userData.blendWalkAction;
  if (mixer && action && (player.userData.blendHasSkinning || player.userData.blendBoneDriven)) {
    if (moving || jumping) {
      if (!player.userData.blendWasMoving) action.reset().play();
      player.userData.blendWasMoving = true;
      action.enabled = true;
      action.paused = false;
      action.timeScale = jumping ? 0.7 : 1.25;
      mixer.update(delta);
      if (player.userData.blendBoneDriven) stabilizeBlendAnimatedLegs(player);
    } else {
      player.userData.blendWasMoving = false;
      action.paused = true;
      action.enabled = false;
      applyBlendRestPose(player);
    }
  }
  if (!player.userData.blendHasSkinning && !player.userData.blendBoneDriven && player.userData.blendModel) {
    updateRigidBlendAvatarMotion(player, moving, jumping, delta, options);
  } else if (player.userData.blendProceduralParts) {
    updateProceduralBlendWalk(player, player.userData.blendProceduralParts, moving, jumping, delta);
  }
  if (player.userData.blendModel && (player.userData.blendHasSkinning || player.userData.blendProceduralParts || player.userData.blendBoneDriven)) {
    const targetY = (player.userData.blendBaseY || 0) + (jumping ? 0.05 : 0);
    player.userData.blendModel.position.y += (targetY - player.userData.blendModel.position.y) * 0.22;
  }
}

function updateRigidBlendAvatarMotion(player, moving, jumping, delta, options = {}) {
  const model = player.userData.blendModel;
  if (!model) return;
  const phase = (player.userData.blendStepPhase || 0) + delta * (moving ? 8 : 2);
  player.userData.blendStepPhase = phase;
  const baseY = Number(player.userData.blendBaseY || 0);
  const settle = 1 - Math.pow(0.02, delta * 8);
  const bob = !options.preview && moving ? Math.abs(Math.sin(phase * 2)) * 0.035 : 0;
  const jump = jumping ? 0.05 : 0;
  model.position.y += (baseY + bob + jump - model.position.y) * settle;
  const targetTilt = !options.preview && moving ? Math.sin(phase) * 0.035 : 0;
  model.rotation.z += (targetTilt - model.rotation.z) * settle;
  model.rotation.x += ((jumping ? -0.045 : 0) - model.rotation.x) * settle;
}

function updateProceduralBlendWalk(player, procedural, moving, jumping, delta) {
  const parts = procedural.parts || {};
  const phase = (player.userData.blendStepPhase || 0) + delta * (moving ? 8.5 : 3.5);
  player.userData.blendStepPhase = phase;
  const swing = moving ? Math.sin(phase) : 0;
  const settle = 1 - Math.pow(0.02, delta * 8);
  const moveToward = (part, x = 0, y = 0, z = 0) => {
    if (!part) return;
    part.rotation.x += (x - part.rotation.x) * settle;
    part.rotation.y += (y - part.rotation.y) * settle;
    part.rotation.z += (z - part.rotation.z) * settle;
  };
  moveToward(parts.leftArm, swing * 0.58 + (jumping ? -0.22 : 0), 0, 0);
  moveToward(parts.rightArm, -swing * 0.58 + (jumping ? -0.22 : 0), 0, 0);
  moveToward(parts.leftLeg, -swing * 0.46, 0, 0);
  moveToward(parts.rightLeg, swing * 0.46, 0, 0);
  moveToward(parts.torso, 0, moving ? Math.sin(phase * 0.5) * 0.035 : 0, 0);
  moveToward(parts.head, jumping ? -0.08 : 0, 0, moving ? Math.sin(phase) * 0.025 : 0);
  if (procedural.root) {
    const targetY = Number(procedural.baseRootY || 0) + (moving ? Math.abs(Math.sin(phase * 2)) * 0.035 : 0);
    procedural.root.position.y += (targetY - procedural.root.position.y) * settle;
  }
}

function stabilizeBlendAnimatedLegs(player) {
  const restByName = new Map((player.userData.blendRestPose || []).map((entry) => [entry.bone.name, entry]));
  ["Bone011", "Bone010"].forEach((name) => {
    const bone = findBlendBone(player, [name]);
    const rest = restByName.get(name);
    if (!bone || !rest) return;
    bone.quaternion.slerp(rest.quaternion, 0.38);
    bone.position.lerp(rest.position, 0.75);
    bone.scale.lerp(rest.scale, 0.75);
  });
}

function applyBlendAvatarItems(THREE, group, user) {
  const equipped = new Set(user.equipped || []);
  const overlay = new THREE.Group();
  overlay.name = "CubixiaFittedAvatarItems";
  overlay.position.y = -AVATAR_ROOT_HEIGHT;
  group.userData.blendItemOverlay = overlay;
  group.add(overlay);
  const addBox = (size, color, position, options = {}) => {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.48,
      metalness: options.metalness ?? 0.06,
      emissive: options.emissive || 0x000000,
      transparent: Boolean(options.opacity && options.opacity < 1),
      opacity: options.opacity || 1
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    if (options.rotation) mesh.rotation.set(...options.rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    overlay.add(mesh);
    return mesh;
  };
  const addCylinder = (radiusTop, radiusBottom, height, color, position, options = {}) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, options.segments || 24),
      new THREE.MeshStandardMaterial({
        color,
        roughness: options.roughness ?? 0.46,
        metalness: options.metalness ?? 0.08,
        emissive: options.emissive || 0x000000
      })
    );
    mesh.position.set(...position);
    if (options.rotation) mesh.rotation.set(...options.rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    overlay.add(mesh);
    return mesh;
  };

  if (equipped.has("starter-shirt")) {
    addBox([0.34, 0.1, 0.035], 0xffffff, [0, 1.27, -0.247]);
    addBox([0.12, 0.085, 0.04], 0x38aef3, [-0.085, 1.27, -0.27]);
    addBox([0.12, 0.085, 0.04], 0x44db78, [0.085, 1.27, -0.27]);
  }
  if (equipped.has("survivor-vest")) {
    addBox([0.78, 0.66, 0.065], 0x141c26, [0, 1.13, -0.255], { roughness: 0.72 });
    addBox([0.08, 0.6, 0.075], 0x44db78, [-0.25, 1.12, -0.302], { emissive: 0x082411 });
    addBox([0.08, 0.6, 0.075], 0x44db78, [0.25, 1.12, -0.302], { emissive: 0x082411 });
    addBox([0.62, 0.045, 0.075], 0x263544, [0, 1.36, -0.31]);
  }
  if (equipped.has("tycoon-badge-pin")) {
    addCylinder(0.085, 0.085, 0.035, 0xffcf55, [0.29, 1.34, -0.325], { rotation: [Math.PI / 2, 0, 0], metalness: 0.28 });
  }
  if (equipped.has("cube-cap") && !equipped.has("premium-hat") && !equipped.has("creator-crown")) {
    addBox([0.68, 0.13, 0.62], 0x38aef3, [0, 2.21, -0.02], { roughness: 0.36 });
    addBox([0.48, 0.055, 0.22], 0x2368d8, [0, 2.14, -0.38], { roughness: 0.32 });
  }
  if (equipped.has("premium-hat") && !equipped.has("creator-crown")) {
    const hat = createAvatarPremiumHat(THREE);
    hat.position.set(0, 2.15, -0.015);
    hat.rotation.y = Math.PI;
    overlay.add(hat);
  }
  if (equipped.has("creator-crown")) {
    const crown = createAvatarCreatorCrown(THREE);
    crown.position.set(0, 2.19, -0.015);
    overlay.add(crown);
  }
  if (equipped.has("hair-04")) {
    const hair = createAvatarHair04(THREE, user);
    hair.position.set(0, 2.2, -0.015);
    overlay.add(hair);
  }
  if (equipped.has("bangs-hair")) {
    const hair = createAvatarBangsHair(THREE, user);
    hair.position.set(0, 1.96, -0.08);
    overlay.add(hair);
  }
  if (equipped.has("neon-visor")) {
    const visor = createAvatarNeonVisor(THREE);
    visor.position.set(0, 1.86, -0.365);
    overlay.add(visor);
  }
  if (equipped.has("wing-pack")) {
    const wings = createAvatarWings(THREE);
    wings.position.set(0, 1.9, 0.32);
    wings.rotation.set(0, 0, 0);
    overlay.add(wings);
  }
  // Speed boots stay owned/equipped in inventory, but the old block overlay does not fit the Blender feet.
  if (equipped.has("ban-hammer")) {
    const hammer = createAvatarHammer(THREE);
    const rightArmMesh = findBlendPartMesh(group, "rightArm");
    if (rightArmMesh) {
      hammer.position.copy(blendRightHandAnchor(THREE, group)).add(new THREE.Vector3(0.045, 0, -0.055));
      hammer.rotation.set(0.08, 0.08, -Math.PI / 2);
      rightArmMesh.add(hammer);
    } else {
      const rightArmBone = findBlendBone(group, ["Bone006", "Bone005", "Bone004"]);
      if (rightArmBone) {
        hammer.position.set(0.12, 0.34, -0.1);
        hammer.rotation.set(0.08, 0.08, -Math.PI / 2);
        rightArmBone.add(hammer);
      } else {
        hammer.position.set(0.72, 0.9, -0.25);
        hammer.rotation.set(0.08, 0.08, -Math.PI / 2);
        overlay.add(hammer);
      }
    }
  }
}

function createAvatarHammer(THREE) {
  const hammer = new THREE.Group();
  hammer.name = "CubixiaBanHammer";
  const fallback = createFallbackAvatarHammer(THREE);
  fallback.visible = false;
  hammer.add(fallback);
  loadCubixiaBanHammerModel()
    .then(async (gltf) => {
      const { SkeletonUtils } = await loadGltfTools();
      const model = SkeletonUtils.clone(gltf.scene);
      normalizeBanHammerModel(THREE, model);
      hammer.clear();
      hammer.add(model);
    })
    .catch(() => {
      fallback.visible = true;
    });
  return hammer;
}

function createFallbackAvatarHammer(THREE) {
  const hammer = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.7, 0.075), new THREE.MeshStandardMaterial({ color: 0x6d4b2d, roughness: 0.75 }));
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.2), new THREE.MeshStandardMaterial({ color: 0xff575f, metalness: 0.16, roughness: 0.38 }));
  head.position.y = 0.36;
  hammer.add(handle, head);
  hammer.traverse((node) => { if (node.isMesh) node.castShadow = true; });
  return hammer;
}

function normalizeBanHammerModel(THREE, model) {
  model.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    if (node.material) node.material = node.material.clone();
  });
  model.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const targetHeight = 0.72;
  const scale = targetHeight / Math.max(0.001, size.y);
  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  const handleBox = new THREE.Box3();
  let hasHandle = false;
  model.traverse((node) => {
    if (!node.isMesh || !/cylinder|handle/i.test(node.name || "")) return;
    handleBox.expandByObject(node);
    hasHandle = true;
  });
  const grip = (hasHandle ? handleBox : box).getCenter(new THREE.Vector3());
  model.position.sub(grip);
}

function createAvatarWings(THREE) {
  const wings = new THREE.Group();
  wings.name = "CubixiaAngelWings";
  const fallback = createFallbackAvatarWings(THREE);
  fallback.visible = false;
  wings.add(fallback);
  loadCubixiaAngelWingsModel()
    .then(async (gltf) => {
      const { SkeletonUtils } = await loadGltfTools();
      const model = SkeletonUtils.clone(gltf.scene);
      normalizeAngelWingsModel(THREE, model);
      wings.clear();
      wings.add(model);
    })
    .catch(() => {
      fallback.visible = true;
    });
  return wings;
}

function createFallbackAvatarWings(THREE) {
  const wings = new THREE.Group();
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xf5fbff, metalness: 0.05, roughness: 0.38, side: THREE.DoubleSide });
  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.08, 0.68), wingMat);
  const rightWing = leftWing.clone();
  leftWing.position.set(-0.72, 0, 0);
  rightWing.position.set(0.72, 0, 0);
  leftWing.rotation.z = -0.45;
  rightWing.rotation.z = 0.45;
  leftWing.castShadow = rightWing.castShadow = true;
  wings.add(leftWing, rightWing);
  return wings;
}

function normalizeAngelWingsModel(THREE, model) {
  model.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    if (node.material) {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      node.material = Array.isArray(node.material) ? materials.map((mat) => mat.clone()) : node.material.clone();
      const normalized = Array.isArray(node.material) ? node.material : [node.material];
      normalized.forEach((mat) => {
        mat.side = THREE.DoubleSide;
        mat.roughness = Math.min(0.55, mat.roughness ?? 0.45);
        mat.metalness = Math.min(0.12, mat.metalness ?? 0.04);
      });
    }
  });
  model.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const targetWidth = 3.18;
  const scale = targetWidth / Math.max(0.001, size.x);
  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  model.position.y += 0.12;
  model.position.z -= 0.04;
}

function createAvatarPremiumHat(THREE) {
  const hat = new THREE.Group();
  hat.name = "CubixiaPremiumHat";
  const fallback = createFallbackAvatarHat(THREE);
  fallback.visible = false;
  hat.add(fallback);
  loadCubixiaPremiumHatModel()
    .then(async (gltf) => {
      const { SkeletonUtils } = await loadGltfTools();
      const model = SkeletonUtils.clone(gltf.scene);
      normalizePremiumHatModel(THREE, model);
      hat.clear();
      hat.add(model);
    })
    .catch(() => {
      fallback.visible = true;
    });
  return hat;
}

function createFallbackAvatarHat(THREE) {
  const hat = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xd2a34a, roughness: 0.36, metalness: 0.18 });
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.055, 28), mat);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.28, 28), mat);
  crown.position.y = 0.16;
  brim.castShadow = crown.castShadow = true;
  hat.add(brim, crown);
  return hat;
}

function normalizePremiumHatModel(THREE, model) {
  model.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    if (node.material) {
      const materials = Array.isArray(node.material) ? node.material.map((mat) => mat.clone()) : node.material.clone();
      node.material = materials;
      const normalized = Array.isArray(materials) ? materials : [materials];
      normalized.forEach((mat) => {
        mat.side = THREE.DoubleSide;
        mat.roughness = Math.min(0.6, mat.roughness ?? 0.42);
        mat.metalness = Math.min(0.35, mat.metalness ?? 0.12);
      });
    }
  });
  model.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const targetDiameter = 0.92;
  const scale = targetDiameter / Math.max(0.001, Math.max(size.x, size.z));
  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;
}

function createAvatarCreatorCrown(THREE) {
  const crown = new THREE.Group();
  crown.name = "CubixiaCreatorCrown";
  const fallback = createFallbackCreatorCrown(THREE);
  fallback.visible = false;
  crown.add(fallback);
  loadCubixiaCreatorCrownModel()
    .then(async (gltf) => {
      const { SkeletonUtils } = await loadGltfTools();
      const model = SkeletonUtils.clone(gltf.scene);
      normalizeCreatorCrownModel(THREE, model);
      crown.clear();
      crown.add(model);
    })
    .catch(() => {
      fallback.visible = true;
    });
  return crown;
}

function createFallbackCreatorCrown(THREE) {
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(0.36, 0.28, 5),
    new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.35, roughness: 0.28 })
  );
  crown.position.y = 0.14;
  crown.rotation.y = Math.PI / 5;
  crown.castShadow = true;
  return crown;
}

function normalizeCreatorCrownModel(THREE, model) {
  model.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    if (node.material) {
      const materials = Array.isArray(node.material) ? node.material.map((mat) => mat.clone()) : node.material.clone();
      node.material = materials;
      const normalized = Array.isArray(materials) ? materials : [materials];
      normalized.forEach((mat) => {
        mat.side = THREE.DoubleSide;
        mat.roughness = Math.min(0.42, mat.roughness ?? 0.32);
        mat.metalness = Math.max(0.22, mat.metalness ?? 0.18);
      });
    }
  });
  model.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const targetDiameter = 0.82;
  const scale = targetDiameter / Math.max(0.001, Math.max(size.x, size.z));
  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;
}

function createAvatarNeonVisor(THREE) {
  const visor = new THREE.Group();
  visor.name = "CubixiaNeonVisor";
  const fallback = createFallbackNeonVisor(THREE);
  fallback.visible = false;
  visor.add(fallback);
  loadCubixiaNeonVisorModel()
    .then(async (gltf) => {
      const { SkeletonUtils } = await loadGltfTools();
      const model = SkeletonUtils.clone(gltf.scene);
      normalizeNeonVisorModel(THREE, model);
      visor.clear();
      visor.add(model);
    })
    .catch(() => {
      fallback.visible = true;
    });
  return visor;
}

function createFallbackNeonVisor(THREE) {
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 0.095, 0.045),
    new THREE.MeshStandardMaterial({ color: 0x38aef3, emissive: 0x0c4f7a, roughness: 0.26, metalness: 0.24 })
  );
  visor.castShadow = true;
  return visor;
}

function normalizeNeonVisorModel(THREE, model) {
  model.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    if (node.material) {
      const materials = Array.isArray(node.material) ? node.material.map((mat) => mat.clone()) : node.material.clone();
      node.material = materials;
      const normalized = Array.isArray(materials) ? materials : [materials];
      normalized.forEach((mat) => {
        mat.side = THREE.DoubleSide;
        mat.color?.set?.(0x38aef3);
        mat.emissive?.set?.(0x0b4d7a);
        mat.roughness = Math.min(0.34, mat.roughness ?? 0.25);
        mat.metalness = Math.max(0.18, mat.metalness ?? 0.18);
      });
    }
  });
  model.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const targetWidth = 0.56;
  const scale = targetWidth / Math.max(0.001, size.x);
  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
}

function createAvatarHair04(THREE, user) {
  const style = normalizeAvatarStyle(user.avatarStyle);
  const hair = new THREE.Group();
  hair.name = "CubixiaHair04";
  const material = new THREE.MeshStandardMaterial({ color: style.hair || "#7a4a1d", roughness: 0.64, metalness: 0.03 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), material);
  cap.scale.set(1.02, 0.5, 0.9);
  cap.rotation.x = -0.03;
  cap.castShadow = true;
  hair.add(cap);
  const strandGeo = new THREE.BoxGeometry(0.07, 0.22, 0.055);
  [
    [-0.28, -0.1, -0.17, -0.16],
    [-0.17, -0.12, -0.29, -0.07],
    [-0.06, -0.12, -0.33, 0.03],
    [0.06, -0.12, -0.33, -0.03],
    [0.17, -0.12, -0.29, 0.07],
    [0.28, -0.1, -0.17, 0.16],
    [-0.33, -0.08, 0.02, -0.22],
    [0.33, -0.08, 0.02, 0.22]
  ].forEach(([x, y, z, rot]) => {
    const strand = new THREE.Mesh(strandGeo, material);
    strand.position.set(x, y, z);
    strand.rotation.z = rot;
    strand.castShadow = true;
    hair.add(strand);
  });
  return hair;
}

function createAvatarBangsHair(THREE, user) {
  const hair = new THREE.Group();
  hair.name = "CubixiaBangsHair";
  const fallback = createAvatarHair04(THREE, user);
  fallback.visible = false;
  hair.add(fallback);
  loadCubixiaBangsHairModel()
    .then(async (gltf) => {
      const { SkeletonUtils } = await loadGltfTools();
      const model = SkeletonUtils.clone(gltf.scene);
      normalizeBangsHairModel(THREE, model, user);
      hair.clear();
      hair.add(model);
    })
    .catch(() => {
      fallback.visible = true;
    });
  return hair;
}

function normalizeBangsHairModel(THREE, model, user) {
  const style = normalizeAvatarStyle(user.avatarStyle);
  model.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    if (node.material) {
      const materials = Array.isArray(node.material) ? node.material.map((mat) => mat.clone()) : node.material.clone();
      node.material = materials;
      const normalized = Array.isArray(materials) ? materials : [materials];
      normalized.forEach((mat) => {
        mat.side = THREE.DoubleSide;
        if (!mat.map) mat.color?.set?.(style.hair || "#7a4a1d");
        mat.roughness = Math.min(0.72, mat.roughness ?? 0.64);
        mat.metalness = Math.min(0.08, mat.metalness ?? 0.02);
      });
    }
  });
  model.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const targetWidth = 0.88;
  const scale = targetWidth / Math.max(0.001, size.x);
  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z + 0.06;
  model.position.y -= box.min.y;
}

function blendRightHandAnchor(THREE, group) {
  const armMesh = findBlendPartMesh(group, "rightArm");
  const bounds = armMesh?.geometry?.boundingBox || (armMesh?.geometry?.computeBoundingBox(), armMesh?.geometry?.boundingBox);
  if (!bounds) return new THREE.Vector3(0.12, 0.34, -0.08);
  const center = bounds.getCenter(new THREE.Vector3());
  return new THREE.Vector3(center.x, bounds.max.y - 0.04, center.z);
}

function findBlendPartMesh(group, partName) {
  return group.userData.blendBoneDrivenParts?.meshes?.find((mesh) => mesh.name.includes(partName)) || null;
}

function findBlendBone(group, names) {
  let found = null;
  group.userData.blendModel?.traverse((node) => {
    if (!found && node.isBone && names.includes(node.name)) found = node;
  });
  return found;
}

function applyAvatarItems(THREE, group, user) {
  const equipped = new Set(user.equipped || []);
  const parts = group.userData.parts;
  const itemParts = [];
  group.userData.itemParts = itemParts;
  const track = (mesh) => {
    if (mesh) itemParts.push(mesh);
    return mesh;
  };
  const addBox = (size, color, position, parent = group) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color }));
    mesh.position.set(...position);
    parent.add(mesh);
    return track(mesh);
  };
  if (equipped.has("starter-shirt")) {
    parts.chest.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    addBox([0.18, 0.08, 0.04], 0x38aef3, [-0.12, 1.34, -0.28]);
    addBox([0.18, 0.08, 0.04], 0x44db78, [0.12, 1.34, -0.28]);
  }
  if (equipped.has("survivor-vest")) {
    addBox([0.98, 0.62, 0.08], 0x151b24, [0, 1.13, -0.28]);
    addBox([0.1, 0.5, 0.09], 0x44db78, [-0.28, 1.12, -0.34]);
    addBox([0.1, 0.5, 0.09], 0x44db78, [0.28, 1.12, -0.34]);
  }
  if (equipped.has("tycoon-badge-pin")) addBox([0.16, 0.16, 0.05], 0xffcf55, [0.32, 1.28, -0.32]);
  if (equipped.has("cube-cap") && !equipped.has("premium-hat") && !equipped.has("creator-crown")) {
    addBox([0.82, 0.16, 0.82], 0x38aef3, [0, 2.23, 0]);
    addBox([0.56, 0.08, 0.35], 0x2368d8, [0, 2.16, -0.54]);
  }
  if (equipped.has("premium-hat") && !equipped.has("creator-crown")) {
    const hat = createAvatarPremiumHat(THREE);
    hat.position.set(0, 2.15, -0.02);
    hat.rotation.y = Math.PI;
    group.add(hat);
    itemParts.push(hat);
  }
  if (equipped.has("creator-crown")) {
    const crown = createAvatarCreatorCrown(THREE);
    crown.position.set(0, 2.19, -0.02);
    group.add(crown);
    track(crown);
  }
  if (equipped.has("hair-04") || equipped.has("bangs-hair")) {
    if (parts.hairTop) parts.hairTop.visible = false;
    if (parts.hairFront) parts.hairFront.visible = false;
  }
  if (equipped.has("hair-04")) {
    const hair = createAvatarHair04(THREE, user);
    hair.position.set(0, 2.2, -0.015);
    group.add(hair);
    itemParts.push(hair);
  }
  if (equipped.has("bangs-hair")) {
    const hair = createAvatarBangsHair(THREE, user);
    hair.position.set(0, 1.96, -0.08);
    group.add(hair);
    itemParts.push(hair);
  }
  if (equipped.has("neon-visor")) {
    const visor = createAvatarNeonVisor(THREE);
    visor.position.set(0, 1.87, -0.39);
    group.add(visor);
    itemParts.push(visor);
  }
  if (equipped.has("wing-pack")) {
    const wings = createAvatarWings(THREE);
    wings.position.set(0, 1.88, 0.34);
    group.add(wings);
    itemParts.push(wings);
  }
  if (equipped.has("speed-boots")) {
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x315cff, emissive: 0x071c66 });
    parts.leftShoe.material = bootMat;
    parts.rightShoe.material = bootMat;
  }
  if (equipped.has("ban-hammer")) {
    const handle = addBox([0.08, 0.68, 0.08], 0x6d4b2d, [0.12, -0.18, -0.08], parts.rightArm);
    handle.rotation.x = -0.55;
    const head = addBox([0.36, 0.18, 0.18], 0xff575f, [0.12, -0.52, -0.28], parts.rightArm);
    head.rotation.x = -0.55;
  }
}

function createGun(THREE) {
  const gun = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x1c232c, metalness: 0.5, roughness: 0.35 });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 1.15, 12), metal);
  barrel.rotation.x = Math.PI / 2;
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.4), metal);
  stock.position.z = 0.55;
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.16), metal);
  grip.position.set(0, -0.25, 0.35);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.26), new THREE.MeshStandardMaterial({ color: 0x0c1118, metalness: 0.4 }));
  sight.position.set(0, 0.15, -0.14);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xff8c00 }));
  flash.position.z = -0.72;
  flash.scale.set(1, 1, 1.8);
  flash.visible = false;
  gun.userData.flash = flash;
  gun.add(barrel, stock, grip, sight, flash);
  return gun;
}

function playShotSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = playShotSound.ctx || new AudioContext();
  playShotSound.ctx = ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(95, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

function playRespawnSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = playRespawnSound.ctx || new AudioContext();
  playRespawnSound.ctx = ctx;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
  [220, 330, 440].forEach((freq, index) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);
    osc.connect(gain);
    osc.start(ctx.currentTime + index * 0.08);
    osc.stop(ctx.currentTime + 0.72);
  });
  gain.connect(ctx.destination);
}

function playFootstepSound(material = "grass") {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = material === "metal" ? "square" : "triangle";
  osc.frequency.setValueAtTime(material === "metal" ? 150 : 95, ctx.currentTime);
  gain.gain.setValueAtTime(0.035, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.08);
}

function spawnHitBurst(THREE, scene, effects, position) {
  for (let i = 0; i < 8; i++) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshStandardMaterial({ color: 0x8b1016, roughness: 0.6 }));
    drop.position.copy(position).add(new THREE.Vector3(0, 0.65, 0));
    drop.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.08, Math.random() * 0.08, (Math.random() - 0.5) * 0.08);
    drop.userData.life = 28;
    effects.push(drop);
    scene.add(drop);
  }
}

function updateEffects(scene, effects) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const effect = effects[i];
    effect.position.add(effect.userData.velocity);
    effect.userData.velocity.y -= 0.004;
    effect.userData.life -= 1;
    if (effect.userData.life <= 0) {
      scene.remove(effect);
      effects.splice(i, 1);
    }
  }
}

function buildTycoonPark(THREE, scene) {
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xd8c49c, roughness: 0.8 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0xf6f7fb, roughness: 0.45 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a6a40, roughness: 0.75 });
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(12, 0.06, 5), pathMat);
  plaza.position.set(0, 0.04, 5.2);
  scene.add(plaza);
  [[0, 0, 4, 18], [-5, -2.7, 8, 2.2], [4, -2.7, 8, 2.2], [5.8, 1.3, 8, 2.2], [-6, 3.6, 7, 2.2]].forEach(([x, z, w, d]) => {
    const path = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), pathMat);
    path.position.set(x, 0.05, z);
    scene.add(path);
  });

  const gate = new THREE.Group();
  const postGeo = new THREE.BoxGeometry(0.25, 2.4, 0.25);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x315cff });
  [-1.8, 1.8].forEach((x) => {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(x, 1.2, 8.4);
    gate.add(post);
  });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 0.2), new THREE.MeshStandardMaterial({ color: 0xffd166 }));
  sign.position.set(0, 2.35, 8.4);
  gate.add(sign);
  scene.add(gate);

  for (let i = 0; i < 22; i++) {
    const angle = (i / 22) * Math.PI * 2;
    const radius = i % 2 ? 18 : 15;
    addTree(THREE, scene, Math.cos(angle) * radius, Math.sin(angle) * radius);
  }

  [["Tickets", -3.8, 6.5, 0xff575f], ["Snacks", 3.8, 6.5, 0x44db78], ["Shop", 0, 8.7, 0x38aef3]].forEach(([, x, z, color]) => {
    const stall = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.25, 1.4), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    base.position.y = 0.65;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.65, 4), new THREE.MeshStandardMaterial({ color }));
    roof.position.y = 1.6;
    roof.rotation.y = Math.PI / 4;
    stall.add(base, roof);
    stall.position.set(x, 0, z);
    scene.add(stall);
  });

  for (let i = -18; i <= 18; i += 2) {
    [[i, -10.5], [i, 10.5], [-18.5, i / 1.1], [18.5, i / 1.1]].forEach(([x, z]) => {
      const fence = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.55, 0.12), woodMat);
      fence.position.set(x, 0.3, z);
      if (Math.abs(x) > 18) fence.rotation.y = Math.PI / 2;
      scene.add(fence);
    });
  }

  const rail = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.06, 12, 96), railMat);
  rail.position.set(-6, 0.62, -2.5);
  rail.scale.z = 0.58;
  rail.rotation.x = Math.PI / 2;
  scene.add(rail);
}

function addTree(THREE, scene, x, z) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0x8b5a32 }));
  trunk.position.set(x, 0.55, z);
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.5, 9), new THREE.MeshStandardMaterial({ color: 0x2f9e55 }));
  leaves.position.set(x, 1.55, z);
  scene.add(trunk, leaves);
}

function movePlayer(base, player, state) {
  const keys = base.keys;
  const Vector3 = THREE_CACHE.Vector3;
  const frameStart = player.position.clone();
  if (state.staffFrozenUntil && Date.now() < state.staffFrozenUntil) {
    state.vy = 0;
    updateStaffGameNotice(state.staffNotice || "A moderator is reviewing your account. Please wait.", true);
    updateCoreGameHud(state, false, false, false, false);
    animateAvatar(player, false, false);
    return;
  }
  updateStaffGameNotice("", false);
  const crouching = Boolean(keys.c || keys.control);
  const crawling = Boolean(crouching && keys.z);
  if (keys.x && !state.slideCooldown && state.stamina > 18) {
    state.sliding = 18;
    state.slideCooldown = 45;
    state.stamina -= 18;
  }
  if (keys.v && player.position.y <= 0.82 && state.stamina > 10) {
    state.vy = Math.max(state.vy || 0, 0.22);
    state.stamina -= 10;
  }
  const sprinting = Boolean(keys.shift && !crouching && !crawling && state.stamina > 0);
  const speed = crawling ? 0.035 : crouching ? 0.052 : state.sliding ? 0.19 : sprinting ? 0.145 : 0.085;
  const awayFromCamera = new Vector3(-Math.sin(base.controls.yaw), 0, -Math.cos(base.controls.yaw)).normalize();
  const right = new Vector3().crossVectors(awayFromCamera, new Vector3(0, 1, 0)).normalize();
  const move = new Vector3();
  if (keys.w) move.add(awayFromCamera);
  if (keys.s) move.sub(awayFromCamera);
  if (keys.d) move.add(right);
  if (keys.a) move.sub(right);
  const moving = move.lengthSq() > 0;
  if (moving) {
    move.normalize();
    player.position.add(move.multiplyScalar(speed));
    const targetYaw = Math.atan2(-move.x, -move.z);
    player.rotation.y = lerpAngle(player.rotation.y, targetYaw, 0.25);
    if (base.controls.cameraFollow === "follow") base.controls.yaw = lerpAngle(base.controls.yaw, targetYaw + Math.PI, 0.04);
    state.footstepTick = (state.footstepTick || 0) + (sprinting ? 1.7 : crouching ? 0.45 : 1);
    if (state.footstepTick > 18) {
      state.footstepTick = 0;
      playFootstepSound(player.position.y > 1.1 ? "metal" : "grass");
    }
  }
  if (sprinting && moving) state.stamina = Math.max(0, (state.stamina ?? 100) - 0.42);
  else state.stamina = Math.min(100, (state.stamina ?? 100) + (crouching ? 0.18 : 0.32));
  if (state.sliding) state.sliding -= 1;
  if (state.slideCooldown) state.slideCooldown -= 1;
  if (state.staffFly) {
    if (keys[" "]) player.position.y = Math.min(18, player.position.y + 0.14);
    if (keys.shift) player.position.y = Math.max(0.8, player.position.y - 0.14);
    state.vy = 0;
  } else if (keys[" "] && player.position.y <= 0.81) {
    state.vy = 0.18;
    sendMultiplayerAction(state.gameId, "jump", state, { label: "jump" });
  }
  if (!state.staffFly) state.vy = (state.vy || 0) - 0.01;
  const beforeY = player.position.y;
  if (!state.staffFly) player.position.y = Math.max(0.8, player.position.y + state.vy);
  if (player.position.y <= 0.8) {
    if ((state.lastFallY || beforeY) - beforeY > 3.2 && state.allowsFallDamage !== false) state.hp = Math.max(0, Number(state.hp || 100) - 10);
    state.vy = 0;
    state.lastFallY = 0.8;
  } else {
    state.lastFallY = Math.max(state.lastFallY || player.position.y, player.position.y);
  }
  if (state.weatherParticles) {
    state.weatherParticles.children.forEach((drop) => {
      drop.position.y -= drop.userData.fallSpeed;
      if (drop.position.y < 0.3) drop.position.set(player.position.x - 35 + Math.random() * 70, 10 + Math.random() * 12, player.position.z - 35 + Math.random() * 70);
    });
  }
  updateCoreGameHud(state, moving, sprinting, crouching, crawling);
  applyLocalStaffVisuals(base, player, state);
  state.lastMoving = moving;
  state.lastJumping = player.position.y > 0.82;
  state.lastVelocity = player.position.clone().sub(frameStart);
  animateAvatar(player, moving, player.position.y > 0.82);
}

function updateCoreGameHud(state, moving, sprinting, crouching, crawling) {
  const stamina = document.querySelector("#staminaBar");
  if (stamina) stamina.style.width = `${clamp(state.stamina ?? 100, 0, 100)}%`;
  const mode = document.querySelector("#movementMode");
  if (mode) {
    if (state.emoteUntil && performance.now() < state.emoteUntil) mode.textContent = state.emote || "Emote";
    else mode.textContent = state.sliding ? "Slide" : crawling ? "Crawl" : crouching ? "Crouch" : sprinting ? "Sprint" : moving ? "Walk" : "Idle";
  }
  const clock = document.querySelector("#clockPill");
  if (clock) {
    const elapsed = ((Date.now() - (state.dayCycleStart || Date.now())) / 1000) % 96;
    clock.textContent = elapsed > 48 ? "Night" : "Day";
  }
}

function updateCamera(camera, player) {
  const controls = runtime.controls;
  controls.distance = controls.smoothZoom ? controls.distance + (controls.targetDistance - controls.distance) * 0.16 : controls.targetDistance;
  const firstPerson = controls.firstPersonZoom && controls.distance <= 1.2;
  player.children.forEach((child) => { child.visible = !firstPerson; });
  if (firstPerson) {
    const eye = player.position.clone().add(new THREE_CACHE.Vector3(0, 1.75, 0));
    const look = new THREE_CACHE.Vector3(
      -Math.sin(controls.yaw) * Math.cos(controls.pitch),
      -Math.sin(controls.pitch),
      -Math.cos(controls.yaw) * Math.cos(controls.pitch)
    );
    camera.position.copy(eye);
    camera.lookAt(eye.clone().add(look));
    return;
  }
  const horizontal = Math.cos(controls.pitch) * controls.distance;
  const offset = new THREE_CACHE.Vector3(
    Math.sin(controls.yaw) * horizontal,
    1.4 + Math.sin(controls.pitch) * controls.distance + 2.2,
    Math.cos(controls.yaw) * horizontal
  );
  camera.position.copy(player.position).add(offset);
  camera.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
}

function animateAvatar(player, moving, jumping) {
  updateBlendAvatarAnimation(player, moving, jumping);
  if (player.userData.avatarSource === "blend") return;
  const parts = player.userData.parts;
  if (!parts) return;
  player.userData.walkTime = (player.userData.walkTime || 0) + (moving ? 0.22 : 0.08);
  const swing = moving ? Math.sin(player.userData.walkTime) * 0.62 : 0;
  parts.leftArm.rotation.x = swing;
  parts.rightArm.rotation.x = -swing;
  parts.leftLeg.rotation.x = -swing * 0.75;
  parts.rightLeg.rotation.x = swing * 0.75;
  parts.body.rotation.x = jumping ? -0.12 : moving ? Math.sin(player.userData.walkTime * 2) * 0.035 : 0;
  parts.head.rotation.x = jumping ? 0.12 : 0;
  if (player.userData.heldTool === "gun") {
    parts.leftArm.rotation.x = -1.18 + Math.sin(player.userData.walkTime) * 0.05;
    parts.rightArm.rotation.x = -1.28;
    parts.leftArm.rotation.z = -0.18;
    parts.rightArm.rotation.z = 0.14;
  } else {
    parts.leftArm.rotation.z = 0;
    parts.rightArm.rotation.z = 0;
  }
}

function lerpAngle(current, target, amount) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * amount;
}

function cameraForward(controls) {
  return new THREE_CACHE.Vector3(
    -Math.sin(controls.yaw) * Math.cos(controls.pitch),
    -Math.sin(controls.pitch),
    -Math.cos(controls.yaw) * Math.cos(controls.pitch)
  ).normalize();
}

function distancePointToSegment(point, start, end) {
  const segment = end.clone().sub(start);
  const lengthSq = segment.lengthSq();
  if (!lengthSq) return point.distanceTo(start);
  const t = clamp(point.clone().sub(start).dot(segment) / lengthSq, 0, 1);
  return point.distanceTo(start.clone().add(segment.multiplyScalar(t)));
}

function spawnZombies(THREE, scene, zombies, wave) {
  for (let i = 0; i < wave + 5; i++) {
    const zombie = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.7), new THREE.MeshStandardMaterial({ color: 0x5cc85c }));
    let x = -14 + Math.random() * 28;
    let z = -14 + Math.random() * 28;
    if (Math.hypot(x, z) < 8) {
      x += x < 0 ? -8 : 8;
      z += z < 0 ? -8 : 8;
    }
    zombie.position.set(x, 0.75, z);
    zombie.userData.hp = 90 + wave * 20;
    zombies.push(zombie);
    scene.add(zombie);
  }
}

function cleanupDead(THREE, scene, zombies, bullets, state) {
  for (let i = zombies.length - 1; i >= 0; i--) {
    if (zombies[i].userData.hp <= 0) {
      scene.remove(zombies[i]);
      zombies.splice(i, 1);
      state.xp += 10;
      state.cash += 4;
    }
  }
  for (let i = bullets.length - 1; i >= 0; i--) {
    if (bullets[i].userData.dead || bullets[i].position.length() > 42 || bullets[i].userData.life <= 0) {
      scene.remove(bullets[i]);
      bullets.splice(i, 1);
    }
  }
}

function addRide(THREE, scene, rides, x, z, type) {
  const group = new THREE.Group();
  group.position.set(x, 0.08, z);
  group.userData.type = type;
  const color = type === "wheel" ? 0xffcf55 : type === "drop" ? 0xff575f : 0x315cff;
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.12, 32), new THREE.MeshStandardMaterial({ color: 0xd8c49c }));
  pad.position.y = 0.03;
  group.add(pad);
  if (type === "wheel") {
    const wheel = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.06, 12, 48), new THREE.MeshStandardMaterial({ color: 0xf8fbff }));
    ring.rotation.y = Math.PI / 2;
    wheel.add(ring);
    for (let i = 0; i < 8; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 2.7), new THREE.MeshStandardMaterial({ color }));
      spoke.rotation.z = (Math.PI / 8) * i;
      spoke.rotation.y = Math.PI / 2;
      wheel.add(spoke);
    }
    wheel.position.y = 1.7;
    group.userData.spin = wheel;
    group.add(wheel);
  } else if (type === "drop") {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 0.35), new THREE.MeshStandardMaterial({ color: 0x263544 }));
    tower.position.y = 1.75;
    const car = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.7), new THREE.MeshStandardMaterial({ color }));
    car.position.y = 1.1;
    group.userData.car = car;
    group.add(tower, car);
  } else {
    const railMat = new THREE.MeshStandardMaterial({ color: 0xf8fbff });
    const cartMat = new THREE.MeshStandardMaterial({ color });
    const railA = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.055, 10, 48), railMat);
    railA.scale.z = 0.45;
    railA.rotation.x = Math.PI / 2;
    const hill = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.12), railMat);
    hill.position.set(0.15, 0.8, 0);
    hill.rotation.z = -0.45;
    const cart = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, 0.32), cartMat);
    cart.position.set(1.15, 0.62, 0);
    group.userData.cart = cart;
    group.add(railA, hill, cart);
  }
  const queue = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.35), new THREE.MeshStandardMaterial({ color: 0x2f5bff }));
  queue.position.set(0, 0.09, 1.9);
  group.add(queue);
  scene.add(group);
  rides.push(group);
}

function spawnCustomers(THREE, scene, customers, count) {
  for (let i = 0; i < count; i++) {
    const guest = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.68, 0.28), new THREE.MeshStandardMaterial({ color: [0xffd166, 0x38aef3, 0xff8ab3, 0x44db78][i % 4] }));
    body.position.y = 0.65;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), new THREE.MeshStandardMaterial({ color: 0xf0d0a7 }));
    head.position.y = 1.13;
    guest.add(body, head);
    guest.position.set(-8 + Math.random() * 16, 0, 7 + Math.random() * 3);
    customers.push(guest);
    scene.add(guest);
  }
}

function animateRide(ride) {
  ride.userData.phase = (ride.userData.phase || 0) + 0.025;
  if (ride.userData.spin) ride.userData.spin.rotation.z += 0.025;
  if (ride.userData.car) ride.userData.car.position.y = 1.2 + Math.abs(Math.sin(ride.userData.phase * 2.4)) * 2.2;
  if (ride.userData.cart) {
    ride.userData.cart.position.x = Math.cos(ride.userData.phase * 2) * 1.05;
    ride.userData.cart.position.z = Math.sin(ride.userData.phase * 2) * 0.45;
    ride.userData.cart.position.y = 0.62 + Math.max(0, Math.sin(ride.userData.phase * 2)) * 0.35;
  }
}

function setupGameMenu(base, user, gameId, state, player) {
  base.gameId = gameId;
  base.gameState = state;
  base.inGameActive = true;
  state.gameId = gameId;
  document.querySelector("#escButton").onclick = () => toggleGameMenu(true);
  document.querySelector("#resumeGame").onclick = () => toggleGameMenu(false);
  document.querySelectorAll("[data-menu-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-menu-tab]").forEach((tab) => tab.classList.toggle("active", tab === button));
      renderMenuTab(button.dataset.menuTab, base, user, gameId, state);
    });
  });
  document.querySelector("#resetGame").onclick = () => {
    respawnPlayer(state, player, gameId);
    toggleGameMenu(false);
  };
  document.querySelector("#leaveGame").onclick = async () => {
    try {
      base.inGameActive = false;
      const data = await api("/api/progress", { method: "POST", body: JSON.stringify({ gameId, playing: false, progress: "Left server", xp: state.xp || 0, currency: state.cash || 0 }) });
      stopRuntime();
      routeUser(data);
    } catch (error) {
      if (error.data?.moderation) return moderationScreen(error.data.user || currentUser, error.data.moderation);
      goHome();
    }
  };
}

function respawnPlayer(state, player, gameId) {
  if (state.respawning) return;
  state.respawning = true;
  state.paused = true;
  playRespawnSound();
  const spawn = state.spawnPoint || { x: 0, y: 0.8, z: gameId === "coaster-tycoon" ? 5.5 : 0 };
  if (player) {
    player.visible = false;
    player.position.set(spawn.x, spawn.y, spawn.z);
  }
  setTimeout(() => {
    state.hp = 100;
    state.vy = 0;
    state.paused = false;
    state.respawning = false;
    if (player) player.visible = true;
  }, 2000);
}

function renderMenuTab(tab, base, user, gameId, state) {
  const content = document.querySelector("#menuContent");
  if (!content) return;
  if (tab === "people") {
    content.innerHTML = `
      <button class="invite-btn">Invite Friends</button>
      <h2>In this server</h2>
      <div id="peopleList" class="people-list"><div class="person-row">${avatar(user, "tiny")}<div><strong>${escapeHtml(user.username)}</strong><small>@${escapeHtml(user.username)}</small></div><button>Me</button></div></div>
    `;
    return;
  }
  if (tab === "settings") {
    const settings = currentUser.gameSettings || {};
    content.innerHTML = `
      <div class="game-settings-panel">
        <h2>Display & Graphics</h2>
        ${menuSlider("Background transparency", 7, "Transparent", "Opaque")}
        ${menuRow("Fullscreen", "Off")}
        ${menuRow("Graphics Mode", "Manual")}
        ${menuSlider("Graphics Quality", 8, "Low", "High")}
        <h2>View & Controls</h2>
        ${menuSelect("Camera Mode", settings.cameraFollow === "follow" ? "Follow" : "Free")}
        ${menuToggle("Camera Inverted", "cameraInverted", settings.cameraInverted !== false)}
        ${menuRange("Camera Sensitivity", "cameraSensitivity", settings.cameraSensitivity || 1)}
        ${menuToggle("Smooth Zoom", "smoothZoom", settings.smoothZoom !== false)}
        ${menuToggle("First-person Zoom", "firstPersonZoom", settings.firstPersonZoom !== false)}
        <button class="save-menu-settings" id="saveGameSettings">Save Settings</button>
      </div>
    `;
    document.querySelector("#saveGameSettings").addEventListener("click", async () => {
      const payload = {
        cameraSensitivity: Number(document.querySelector("[name='cameraSensitivity']").value),
        cameraInverted: document.querySelector("[name='cameraInverted']").checked,
        smoothZoom: document.querySelector("[name='smoothZoom']").checked,
        firstPersonZoom: document.querySelector("[name='firstPersonZoom']").checked,
        cameraFollow: document.querySelector("[name='cameraFollow']").checked ? "follow" : "free"
      };
      const data = await api("/api/settings/game", { method: "POST", body: JSON.stringify(payload) });
      currentUser = data.user;
      Object.assign(base.controls, {
        sensitivity: payload.cameraSensitivity,
        invertY: payload.cameraInverted,
        smoothZoom: payload.smoothZoom,
        firstPersonZoom: payload.firstPersonZoom,
        cameraFollow: payload.cameraFollow
      });
      document.querySelector("#saveGameSettings").textContent = "Saved";
    });
    return;
  }
  if (tab === "report") {
    content.innerHTML = `
      <form class="report-panel" id="reportForm">
        <div class="segmented"><button type="button" class="active">Text mode</button><button type="button">Highlight mode</button></div>
        <label>Game or Person?<select name="targetType"><option>Person</option><option>Game</option></select></label>
        <label>Type Of Abuse?<select name="abuseType" required><option value="">Choose One</option><option>Bullying</option><option>Cheating</option><option>Scam</option><option>Bad language</option></select></label>
        <label>Which Person?<select name="target"><option>${escapeHtml(gameTitle(gameId))}</option>${[user, ...(currentUser.friendProfiles || [])].map((entry) => `<option>${escapeHtml(entry.username)}</option>`).join("")}</select></label>
        <textarea name="details" placeholder="In your own words, help us understand what went wrong." required></textarea>
        <button class="save-menu-settings">Submit</button>
        <div class="message" id="reportMessage"></div>
      </form>
    `;
    document.querySelector("#reportForm").addEventListener("submit", submitReport);
    return;
  }
  content.innerHTML = `<div class="game-settings-panel"><h2>${tab === "captures" ? "Captures" : "Help"}</h2><p>${tab === "captures" ? "Capture tools are ready for screenshots and clips." : "WASD moves your avatar. Hold RMB to lock the mouse and rotate the camera. Wheel zooms into first person."}</p></div>`;
}

function menuRow(label, value) {
  return `<div class="settings-row"><span>${label}</span><button>&lsaquo;</button><strong>${value}</strong><button>&rsaquo;</button></div>`;
}

function menuSelect(label, value) {
  return `<label class="settings-row"><span>${label}</span><button>&lsaquo;</button><strong>${value}</strong><input name="cameraFollow" type="checkbox" ${value === "Follow" ? "checked" : ""} /><button>&rsaquo;</button></label>`;
}

function menuToggle(label, name, checked) {
  return `<label class="settings-row"><span>${label}</span><button>&lsaquo;</button><strong>${checked ? "On" : "Off"}</strong><input name="${name}" type="checkbox" ${checked ? "checked" : ""} /><button>&rsaquo;</button></label>`;
}

function menuRange(label, name, value) {
  return `<label class="settings-row"><span>${label}</span><button>-</button><input name="${name}" type="range" min="0.25" max="2.5" step="0.05" value="${value}" /><strong>${Number(value).toFixed(2)}</strong></label>`;
}

function menuSlider(label, fill, low, high) {
  return `<div class="settings-slider"><span>${label}</span><div>${Array.from({ length: 10 }, (_, i) => `<i class="${i < fill ? "filled" : ""}"></i>`).join("")}</div><small>${low}</small><small>${high}</small></div>`;
}

function toggleGameMenu(show) {
  document.querySelector("#escMenu")?.classList.toggle("hidden", !show);
}

function setupGameChat(base, user, gameId) {
  const panel = document.querySelector("#gameChat");
  const list = document.querySelector("#gameChatMessages");
  const form = document.querySelector("#gameChatForm");
  const status = document.querySelector("#gameChatStatus");
  const room = `game:${gameId}`;
  const renderMessages = (messages = []) => {
    base.chatMessages = messages;
    list.innerHTML = messages.slice(-8).map((message) => {
      const lineClass = message.staff ? "staff-announce" : "";
      return `<div class="${lineClass}"><strong>${escapeHtml(message.username)}</strong> ${escapeHtml(message.text)}</div>`;
    }).join("");
    list.scrollTop = list.scrollHeight;
  };
  const setChatStatus = (message, tone = "info") => {
    if (!status) return;
    status.textContent = message || "";
    status.dataset.tone = tone;
  };
  const load = async () => {
    const data = await api(`/api/chat?room=${encodeURIComponent(room)}`).catch(() => ({ messages: [] }));
    renderMessages(data.messages);
  };
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = form.querySelector("input");
    const text = input.value.trim();
    if (!text) return;
    try {
      if (text.startsWith("/")) {
        const data = await api("/api/game-command", { method: "POST", body: JSON.stringify({ gameId, text }) });
        input.value = "";
        renderMessages(data.messages || base.chatMessages || []);
        setChatStatus(data.message || "Command completed.", "success");
        if (data.details) showStaffCommandDetails(data.details);
        panel.classList.remove("hidden");
        return;
      }
      await api("/api/chat", { method: "POST", body: JSON.stringify({ room, text }) });
      setChatStatus("");
    } catch (error) {
      setChatStatus(error.message || "Command failed.", "error");
      if (error.data?.moderation) return moderationScreen(error.data.user || currentUser, error.data.moderation);
      return;
    }
    input.value = "";
    await load();
    panel.classList.remove("hidden");
  });
  panel.addEventListener("click", () => form.querySelector("input").focus());
  runtime.chatInterval = setInterval(load, 1800);
  load();
}

function showStaffCommandDetails(details) {
  let modal = document.querySelector("#staffCommandDetails");
  if (!modal) {
    modal = document.createElement("aside");
    modal.id = "staffCommandDetails";
    modal.className = "staff-command-details";
    document.body.appendChild(modal);
  }
  const sections = Array.isArray(details.sections) ? details.sections : [];
  modal.innerHTML = `
    <div class="staff-command-head">
      <strong>${escapeHtml(details.title || "Staff Command Result")}</strong>
      <button type="button" id="closeStaffCommandDetails">Close</button>
    </div>
    <div class="staff-command-body">
      ${sections.map((section) => `<article><small>${escapeHtml(section.label || "Info")}</small><span>${escapeHtml(section.value || "")}</span></article>`).join("") || `<article><span>No details returned.</span></article>`}
    </div>
  `;
  modal.classList.add("show");
  modal.querySelector("#closeStaffCommandDetails")?.addEventListener("click", () => modal.remove());
}

function toggleGameChat(show) {
  const panel = document.querySelector("#gameChat");
  if (!panel) return;
  panel.classList.toggle("hidden", !show);
  if (show) setTimeout(() => panel.querySelector("input")?.focus(), 30);
}

function runThree(base) {
  const animate = () => {
    runtime.frame = requestAnimationFrame(animate);
    if (runtime.tick) runtime.tick();
    runtime.renderer.render(runtime.scene, runtime.camera);
  };
  animate();
}

function stopRuntime() {
  document.body.classList.remove("game-active");
  if (runtime?.inGameActive && runtime.gameId) {
    leaveCurrentGameQuietly(runtime.gameId, runtime.gameState || {});
    runtime.inGameActive = false;
  }
  if (runtime?.frame) cancelAnimationFrame(runtime.frame);
  if (runtime?.chatInterval) clearInterval(runtime.chatInterval);
  if (runtime?.pointerLockHandler) document.removeEventListener("pointerlockchange", runtime.pointerLockHandler);
  if (runtime?.studioPointerMove) window.removeEventListener("pointermove", runtime.studioPointerMove);
  if (runtime?.studioPointerUp) window.removeEventListener("pointerup", runtime.studioPointerUp);
  if (document.pointerLockElement === runtime?.mount) {
    try {
      const exitRequest = document.exitPointerLock?.();
      exitRequest?.catch?.(() => {});
    } catch {}
  }
  if (runtime?.renderer) {
    runtime.renderer.dispose();
    runtime.mount.innerHTML = "";
  }
  runtime = null;
  document.onkeydown = null;
  document.onkeyup = null;
  window.onresize = null;
}

function leaveCurrentGameQuietly(gameId, state = {}) {
  const payload = JSON.stringify({
    gameId,
    playing: false,
    progress: "Left server",
    xp: state.xp || 0,
    currency: state.cash || 0
  });
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon("/api/progress", blob)) return;
    }
  } catch {}
  api("/api/progress", { method: "POST", body: payload }).catch(() => {});
}

async function renderOtherPlayers(THREE, base, user, gameId, player, state) {
  if (Date.now() < base.pollAt) return;
  base.pollAt = Date.now() + 150;
  const velocity = state.lastVelocity || { x: 0, y: 0, z: 0 };
  const data = await api(`/api/world/${gameId}/state`, {
    method: "POST",
    body: JSON.stringify({
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      rot: player.rotation.y,
      vx: Number(velocity.x || 0),
      vy: Number(velocity.y || 0),
      vz: Number(velocity.z || 0),
      moving: Boolean(state.lastMoving),
      jumping: Boolean(state.lastJumping),
      eventCursor: Number(state.worldEventCursor || 0),
      hp: state.hp || 100,
      cash: state.cash || 0
    })
  }).catch((error) => {
    if (error.data?.lockdown) return { players: [], lockdown: error.data.lockdown, user: error.data.user };
    if (error.message && /deleted|unavailable|cannot be played/i.test(error.message)) return { players: [], deleted: true, error: error.message };
    return { players: null, transientError: true };
  });
  if (data.transientError || !Array.isArray(data.players)) return;
  if (data.deleted) {
    alert(data.error || "This game is no longer available.");
    return gamesPage();
  }
  if (data.lockdown?.active) {
    if (data.user) currentUser = data.user;
    return lockdownScreen(data.lockdown, currentUser);
  }
  if (data.moderation) {
    if (data.user) currentUser = data.user;
    return moderationScreen(data.user || currentUser, data.moderation);
  }
  if (data.staffState) applyStaffStateFromServer(player, state, data.staffState);
  if (data.gameEvent) applyGameEventFromServer(THREE, base, player, state, data.gameEvent);
  if (Array.isArray(data.events)) applyWorldEventsFromServer(THREE, base, state, data.events);
  if (Number(data.serverTime || 0)) state.worldEventCursor = Math.max(Number(state.worldEventCursor || 0), Number(data.serverTime || 0) - 1);
  const people = document.querySelector("#peopleList");
  if (people) {
    people.innerHTML = data.players.map((entry) => `<div class="person-row">${avatar(entry, "tiny")}<div><strong>${escapeHtml(entry.username)}</strong><small>@${escapeHtml(entry.username)} ${entry.role ? `| ${entry.role}` : ""}</small></div><button>Add Friend</button></div>`).join("");
  }
  const seen = new Set(data.players.map((entry) => entry.id));
  base.otherMeshes.forEach((mesh, id) => {
    if (id === user.id || !seen.has(id)) {
      base.scene.remove(mesh);
      base.otherMeshes.delete(id);
    }
  });
  data.players.filter((entry) => entry.id !== user.id).forEach((entry) => {
    let mesh = base.otherMeshes.get(entry.id);
    if (!mesh) {
      mesh = createAvatarMesh(THREE, entry);
      mesh.userData.username = entry.username;
      base.otherMeshes.set(entry.id, mesh);
      base.scene.add(mesh);
      mesh.position.set(entry.worldState.x, entry.worldState.y, entry.worldState.z);
    }
    mesh.userData.username = entry.username;
    const previousTarget = mesh.userData.targetPosition?.clone?.() || mesh.position.clone();
    const nextTarget = new THREE.Vector3(entry.worldState.x, entry.worldState.y, entry.worldState.z);
    const receivedAt = performance.now();
    mesh.userData.previousTarget = previousTarget;
    mesh.userData.targetPosition = nextTarget;
    mesh.userData.serverVelocity = new THREE.Vector3(
      Number(entry.worldState.vx || 0),
      Number(entry.worldState.vy || 0),
      Number(entry.worldState.vz || 0)
    );
    mesh.userData.targetRot = entry.worldState.rot;
    mesh.userData.serverMoving = Boolean(entry.worldState.moving);
    mesh.userData.serverJumping = Boolean(entry.worldState.jumping);
    mesh.userData.lastWorldUpdate = receivedAt;
    mesh.userData.lastServerUpdatedAt = Number(entry.worldState.updatedAt || Date.now());
    mesh.scale.setScalar(Number(entry.worldState.scale || 1));
  });
}

function sendMultiplayerAction(gameId, type, state = {}, payload = {}) {
  if (!gameId) return;
  const now = performance.now();
  state.actionThrottle = state.actionThrottle || {};
  const gap = type === "shoot" || type === "swing" ? 160 : 100;
  if (Number(state.actionThrottle[type] || 0) + gap > now) return;
  state.actionThrottle[type] = now;
  api(`/api/world/${gameId}/action`, {
    method: "POST",
    body: JSON.stringify({ type, payload })
  }).catch(() => {});
}

function applyWorldEventsFromServer(THREE, base, state, events) {
  events.forEach((event) => {
    const eventTime = Number(event.createdAt || 0);
    state.worldEventCursor = Math.max(Number(state.worldEventCursor || 0), eventTime);
    if (state.seenWorldEvents?.has(event.id)) return;
    state.seenWorldEvents = state.seenWorldEvents || new Set();
    state.seenWorldEvents.add(event.id);
    if (state.seenWorldEvents.size > 140) state.seenWorldEvents = new Set([...state.seenWorldEvents].slice(-80));
    const mesh = [...base.otherMeshes.values()].find((entry) => entry.userData.username === event.username) || base.otherMeshes.get(event.userId);
    const origin = event.position ? new THREE.Vector3(Number(event.position.x || 0), Number(event.position.y || 0.8), Number(event.position.z || 0)) : null;
    if (mesh) {
      if (event.type === "jump") {
        mesh.userData.serverJumping = true;
        updateEmoteBubble(mesh, "Jump");
        setTimeout(() => updateEmoteBubble(mesh, ""), 550);
      }
      if (event.type === "shoot" || event.type === "swing") {
        updateEmoteBubble(mesh, event.type === "shoot" ? "Shot" : "Swing");
        spawnMiniActionSpark(THREE, base.scene, mesh.position, event.type);
        setTimeout(() => updateEmoteBubble(mesh, ""), 650);
      }
      if (event.type === "interact" || event.type === "pickup" || event.type === "emote") {
        updateEmoteBubble(mesh, event.payload?.label || event.type);
        setTimeout(() => updateEmoteBubble(mesh, ""), 850);
      }
      return;
    }
    if (origin) spawnMiniActionSpark(THREE, base.scene, origin, event.type);
  });
}

function spawnMiniActionSpark(THREE, scene, origin, type) {
  const color = type === "shoot" ? 0xffd166 : type === "swing" ? 0x9fd8ff : 0x35d39f;
  const spark = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 8),
    new THREE.MeshStandardMaterial({ color, emissive: color, roughness: 0.25 })
  );
  spark.position.copy(origin).add(new THREE.Vector3(0, 1.35, -0.35));
  scene.add(spark);
  let life = 32;
  const tick = () => {
    life -= 1;
    spark.position.y += 0.018;
    spark.scale.multiplyScalar(0.965);
    if (life > 0) requestAnimationFrame(tick);
    else scene.remove(spark);
  };
  tick();
}

function applyStaffStateFromServer(player, state, staffState) {
  state.staffFrozenUntil = Number(staffState.frozenUntil || 0);
  state.staffNotice = staffState.notice || "";
  state.staffScale = Number(staffState.scale || 1);
  state.staffFly = Boolean(staffState.fly);
  state.staffNoclip = Boolean(staffState.noclip);
  state.staffSpotlightUntil = Number(staffState.spotlightUntil || 0);
  state.staffFireworkUntil = Number(staffState.fireworkUntil || 0);
  if (staffState.emote && Number(staffState.emoteUntil || 0) > Date.now()) {
    state.emote = staffState.emote;
    state.emoteUntil = performance.now() + Math.max(800, Number(staffState.emoteUntil) - Date.now());
  }
  if (staffState.position) {
    player.position.set(
      Number(staffState.position.x || 0),
      Number(staffState.position.y || 0.8),
      Number(staffState.position.z || 0)
    );
    if (Number.isFinite(Number(staffState.position.rot))) player.rotation.y = Number(staffState.position.rot);
  }
  if (state.staffNotice) updateStaffGameNotice(state.staffNotice, true);
}

function applyLocalStaffVisuals(base, player, state) {
  const scale = clamp(Number(state.staffScale || 1), 0.35, 2.5);
  if (Math.abs((player.scale.x || 1) - scale) > 0.01) player.scale.setScalar(scale);
  if (state.staffFly) {
    updateStaffGameNotice("Fly mode active: WASD move, Space up, Shift down.", true);
  } else if (state.staffNoclip) {
    updateStaffGameNotice("Noclip mode active for staff movement.", true);
  }
  const now = Date.now();
  if (state.staffSpotlightUntil > now) ensureStaffSpotlight(base, player, state);
  else removeStaffSpotlight(base, state);
  if (state.staffFireworkUntil > now && state.lastFireworkUntil !== state.staffFireworkUntil) {
    state.lastFireworkUntil = state.staffFireworkUntil;
    spawnStaffFireworks(THREE_CACHE, base.scene, player.position);
  }
  updateEmoteBubble(player, state.emoteUntil && performance.now() < state.emoteUntil ? state.emote : "");
}

function ensureStaffSpotlight(base, player, state) {
  if (!state.staffSpotlight) {
    const light = new THREE_CACHE.SpotLight(0x66d9ff, 3.6, 18, Math.PI / 5, 0.4, 1.2);
    light.name = "CubixiaStaffSpotlight";
    const target = new THREE_CACHE.Object3D();
    base.scene.add(light, target);
    light.target = target;
    state.staffSpotlight = { light, target };
  }
  state.staffSpotlight.light.position.set(player.position.x, player.position.y + 7, player.position.z + 2.5);
  state.staffSpotlight.target.position.copy(player.position);
}

function removeStaffSpotlight(base, state) {
  if (!state.staffSpotlight) return;
  base.scene.remove(state.staffSpotlight.light, state.staffSpotlight.target);
  state.staffSpotlight = null;
}

function spawnStaffFireworks(THREE, scene, origin) {
  const group = new THREE.Group();
  const colors = [0xff3344, 0xffcf55, 0x35d39f, 0x38aef3, 0xb56bff];
  for (let i = 0; i < 36; i++) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      new THREE.MeshStandardMaterial({ color: colors[i % colors.length], emissive: colors[i % colors.length] })
    );
    const angle = (Math.PI * 2 * i) / 36;
    const lift = -0.25 + Math.random() * 0.75;
    spark.position.set(origin.x, origin.y + 3.2, origin.z);
    spark.userData.velocity = new THREE.Vector3(Math.cos(angle) * (0.045 + Math.random() * 0.055), lift * 0.08, Math.sin(angle) * (0.045 + Math.random() * 0.055));
    group.add(spark);
  }
  group.userData.life = 120;
  scene.add(group);
  const tick = () => {
    group.userData.life -= 1;
    group.children.forEach((spark) => {
      spark.position.add(spark.userData.velocity);
      spark.userData.velocity.y -= 0.0018;
      spark.scale.multiplyScalar(0.992);
    });
    if (group.userData.life > 0) requestAnimationFrame(tick);
    else scene.remove(group);
  };
  tick();
}

function updateEmoteBubble(player, text) {
  if (!text) {
    if (player.userData.emoteBubble) {
      player.remove(player.userData.emoteBubble);
      player.userData.emoteBubble = null;
    }
    return;
  }
  const labelText = String(text).slice(0, 34);
  if (player.userData.emoteBubble?.userData.text === labelText) return;
  if (player.userData.emoteBubble) player.remove(player.userData.emoteBubble);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(8, 14, 24, 0.86)";
  roundRect(ctx, 18, 18, 476, 82, 22);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px Inter, Arial";
  ctx.textAlign = "center";
  ctx.fillText(labelText, 256, 72);
  const sprite = new THREE_CACHE.Sprite(new THREE_CACHE.SpriteMaterial({ map: new THREE_CACHE.CanvasTexture(canvas), transparent: true }));
  sprite.position.y = 3.15;
  sprite.scale.set(2.65, 0.66, 1);
  sprite.userData.text = labelText;
  player.userData.emoteBubble = sprite;
  player.add(sprite);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function applyGameEventFromServer(THREE, base, player, state, event) {
  if (!event?.command || state.lastGameEventKey === `${event.command}:${event.createdAt}`) return;
  state.lastGameEventKey = `${event.command}:${event.createdAt}`;
  if (event.command === "firework") spawnStaffFireworks(THREE, base.scene, player.position);
  if (event.command === "spotlight") {
    state.staffSpotlightUntil = Math.max(state.staffSpotlightUntil || 0, Date.now() + 30000);
  }
  if (event.command === "globalemote") {
    state.emote = event.value || "CUBIXIA";
    state.emoteUntil = performance.now() + 2600;
  }
  if (event.command === "spawnnpc") spawnCommandNpc(THREE, base.scene, player.position, event.value || "NPC");
  if (event.command === "spawnitem") spawnCommandItem(THREE, base.scene, player.position, event.value || "Item");
  if (event.command === "startevent") applyAdminEventLook(base, event.value || "event");
  if (event.command === "stopevent") clearAdminEventLook(base);
}

function spawnCommandNpc(THREE, scene, origin, label) {
  const npc = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.05, 0.42), new THREE.MeshStandardMaterial({ color: 0x3b82f6 }));
  body.position.y = 0.82;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 12), new THREE.MeshStandardMaterial({ color: 0xf0d0a7 }));
  head.position.y = 1.55;
  npc.add(body, head);
  npc.position.set(origin.x + 2, 0, origin.z + 1.2);
  npc.userData.label = label;
  scene.add(npc);
}

function spawnCommandItem(THREE, scene, origin, label) {
  const item = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.42),
    new THREE.MeshStandardMaterial({ color: 0xffcf55, emissive: 0x332000, metalness: 0.2, roughness: 0.35 })
  );
  item.position.set(origin.x + 1.6, 1, origin.z - 1.6);
  item.userData.label = label;
  scene.add(item);
}

function applyAdminEventLook(base, value) {
  base.scene.userData.originalBackground ||= base.scene.background?.clone?.();
  const name = String(value || "").toLowerCase();
  if (name.includes("rainbow")) base.scene.background = new THREE_CACHE.Color(0x8b5cf6);
  else if (name.includes("gravity")) base.scene.background = new THREE_CACHE.Color(0x1f2a44);
  else if (name.includes("treasure")) base.scene.background = new THREE_CACHE.Color(0xf7c948);
  else base.scene.background = new THREE_CACHE.Color(0x22577a);
}

function clearAdminEventLook(base) {
  if (base.scene.userData.originalBackground) base.scene.background = base.scene.userData.originalBackground;
}

function updateStaffGameNotice(message, show) {
  const notice = document.querySelector("#staffGameNotice");
  if (!notice) return;
  notice.textContent = message || "";
  notice.classList.toggle("hidden", !show || !message);
}

function animateOtherPlayers(base) {
  base.otherMeshes?.forEach((mesh) => {
    if (!mesh.userData.targetPosition) return;
    const before = mesh.position.clone();
    const age = Math.min(420, Math.max(0, performance.now() - Number(mesh.userData.lastWorldUpdate || performance.now())));
    const predicted = mesh.userData.targetPosition.clone().add((mesh.userData.serverVelocity || new THREE_CACHE.Vector3()).clone().multiplyScalar(age / 16.67));
    const distance = mesh.position.distanceTo(predicted);
    if (distance > 8) mesh.position.copy(mesh.userData.targetPosition);
    else mesh.position.lerp(predicted, distance > 2 ? 0.42 : 0.22);
    mesh.rotation.y = lerpAngle(mesh.rotation.y, mesh.userData.targetRot || 0, 0.24);
    const moving = Boolean(mesh.userData.serverMoving) || mesh.position.distanceTo(before) > 0.002;
    animateAvatar(mesh, moving, Boolean(mesh.userData.serverJumping) || mesh.position.y > 0.82);
  });
}

function avatar(user, size) {
  const safeUser = user || {};
  const key = cryptoId();
  AVATAR_RENDER_REGISTRY.set(key, safeUser);
  const payload = encodeURIComponent(JSON.stringify({
    username: safeUser.username || "Player",
    avatarStyle: safeUser.avatarStyle || DEFAULT_AVATAR_STYLE,
    equipped: safeUser.equipped || [],
    inventory: safeUser.inventory || []
  }));
  return `<div class="avatar avatar-${size}" data-avatar-3d="${key}" data-avatar-payload="${payload}" data-avatar-name="${escapeHtml(safeUser.username || "Player")}">${avatarInner(safeUser)}</div>`;
}

function avatarInner(user) {
  return blockAvatar(user || {}, "", "mini avatar3d-thumb");
}

function enhance3DPreviews(root = document) {
  renderAvatarPortraits(root);
  renderItemPreviewMounts(root);
}

async function renderAvatarPortraits(root = document, force = false) {
  const mounts = [...root.querySelectorAll("[data-avatar-3d]")].filter((mount) => force || mount.dataset.rendered3d !== "true");
  if (!mounts.length) return;
  for (const mount of mounts) {
    const user = AVATAR_RENDER_REGISTRY.get(mount.dataset.avatar3d) || avatarPayloadFromMount(mount) || {};
    await renderStaticAvatarMount(mount, user, { mode: "portrait" });
  }
}

function avatarPayloadFromMount(mount) {
  try {
    const raw = mount.dataset.avatarPayload || "";
    if (!raw) return null;
    return normalizeClientUser(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return null;
  }
}

async function renderItemPreviewMounts(root = document, force = false) {
  const mounts = [...root.querySelectorAll("[data-item-detail-preview]")].filter((mount) => force || mount.dataset.rendered3d !== "true");
  if (!mounts.length || !currentUser) return;
  for (const mount of mounts) {
    const itemId = mount.dataset.itemPreview || mount.dataset.itemDetailPreview;
    const detail = Boolean(mount.dataset.itemDetailPreview);
    await renderStaticItemMount(mount, itemId, { detail });
  }
}

function itemPreviewUser(itemId) {
  const item = currentUser?.items?.find((entry) => entry.id === itemId);
  const singleTypes = ["hat", "hair", "face", "back", "shoes", "tool"];
  let equipped = [...(currentUser?.equipped || [])];
  if (item && singleTypes.includes(item.type)) {
    equipped = equipped.filter((id) => currentUser.items.find((entry) => entry.id === id)?.type !== item.type);
  }
  equipped = Array.from(new Set([...equipped, itemId].filter(Boolean)));
  return {
    ...(currentUser || {}),
    equipped,
    inventory: Array.from(new Set([...(currentUser?.inventory || []), itemId].filter(Boolean)))
  };
}

async function renderStaticItemMount(mount, itemId, options = {}) {
  const item = currentUser?.items?.find((entry) => entry.id === itemId);
  if (!mount || !item || mount.clientWidth === 0) return;
  mount.dataset.rendered3d = "true";
  mount.classList.add("rendered-3d", "item-only-preview");
  const THREE = await loadThree();
  const scene = new THREE.Scene();
  scene.background = null;
  const width = Math.max(92, mount.clientWidth || 140);
  const height = Math.max(92, mount.clientHeight || 110);
  const camera = new THREE.PerspectiveCamera(options.detail ? 30 : 34, width / height, 0.1, 100);
  camera.position.set(0, options.detail ? 1.15 : 0.95, options.detail ? 3.6 : 3);
  camera.lookAt(0, options.detail ? 0.55 : 0.42, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height);
  mount.innerHTML = "";
  mount.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a94a3, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(3, 4, 4);
  scene.add(key);
  const itemMesh = createShopItemPreviewMesh(THREE, item);
  itemMesh.rotation.y = -0.45;
  itemMesh.position.y = options.detail ? 0.12 : 0;
  scene.add(itemMesh);
  const draw = () => renderer.render(scene, camera);
  draw();
  [180, 420, 900, 1700, 3200].forEach((delay) => {
    window.setTimeout(() => {
      if (mount.isConnected) draw();
    }, delay);
  });
}

function createShopItemPreviewMesh(THREE, item) {
  const visual = itemVisuals[item.id] || {};
  const group = new THREE.Group();
  const color = visual.color ?? 0x315cff;
  const accent = visual.accent ?? 0xffffff;
  const mat = (value, extra = {}) => new THREE.MeshStandardMaterial({ color: value, roughness: 0.48, metalness: 0.08, ...extra });
  const addBox = (size, position, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  };
  const addCylinder = (radiusTop, radiusBottom, height, position, material, rotation = [0, 0, 0], segments = 24) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    group.add(mesh);
    return mesh;
  };

  if (item.type === "shirt") {
    addBox([1.05, 1.05, 0.18], [0, 0.45, 0], mat(color));
    addBox([0.55, 0.12, 0.2], [0, 0.62, 0.11], mat(accent));
    addBox([0.28, 0.72, 0.18], [-0.72, 0.43, 0], mat(color));
    addBox([0.28, 0.72, 0.18], [0.72, 0.43, 0], mat(color));
  } else if (item.type === "shoes") {
    addBox([0.72, 0.26, 0.92], [-0.42, 0.18, 0], mat(color, { emissive: 0x071c66 }));
    addBox([0.72, 0.26, 0.92], [0.42, 0.18, 0], mat(color, { emissive: 0x071c66 }));
    addBox([0.6, 0.06, 0.86], [-0.42, 0.35, 0.02], mat(accent));
    addBox([0.6, 0.06, 0.86], [0.42, 0.35, 0.02], mat(accent));
  } else if (item.type === "back" || item.id === "wing-pack") {
    group.add(createAvatarWings(THREE));
    group.scale.setScalar(1.15);
  } else if (item.type === "tool" || item.id === "ban-hammer") {
    const hammer = createAvatarHammer(THREE);
    hammer.rotation.set(0.25, 0.1, -0.86);
    hammer.position.set(0, 0.42, 0);
    hammer.scale.setScalar(1.55);
    group.add(hammer);
  } else if (item.id === "creator-crown") {
    const crown = createAvatarCreatorCrown(THREE);
    crown.scale.setScalar(2.2);
    crown.position.y = 0.55;
    group.add(crown);
  } else if (item.type === "hat") {
    const hat = item.id === "premium-hat" ? createAvatarPremiumHat(THREE) : createAvatarPremiumHat(THREE);
    hat.scale.setScalar(1.65);
    hat.position.y = 0.55;
    group.add(hat);
  } else if (item.type === "hair") {
    const demo = { avatarStyle: currentUser?.avatarStyle || DEFAULT_AVATAR_STYLE };
    const hair = item.id === "bangs-hair" ? createAvatarBangsHair(THREE, demo) : createAvatarHair04(THREE, demo);
    hair.scale.setScalar(1.75);
    hair.position.y = 0.52;
    group.add(hair);
  } else if (item.id === "neon-visor") {
    const visor = createAvatarNeonVisor(THREE);
    visor.scale.setScalar(2.3);
    visor.position.y = 0.58;
    group.add(visor);
  } else if (item.type === "accessory") {
    addCylinder(0.28, 0.28, 0.08, [0, 0.48, 0], mat(color, { metalness: 0.18 }), [Math.PI / 2, 0, 0], 32);
    addBox([0.14, 0.48, 0.09], [0, 0.48, 0.04], mat(accent));
  } else {
    addBox([0.9, 0.9, 0.9], [0, 0.45, 0], mat(color));
  }
  return group;
}

async function renderStaticAvatarMount(mount, user, options = {}) {
  if (!mount || mount.clientWidth === 0) return;
  mount.dataset.rendered3d = "true";
  mount.classList.add("rendered-3d");
  const THREE = await loadThree();
  const scene = new THREE.Scene();
  scene.background = null;
  const width = Math.max(70, mount.clientWidth || 110);
  const height = Math.max(70, mount.clientHeight || 100);
  const isTiny = width <= 34;
  const isSmall = width <= 78;
  const portrait = options.mode === "portrait";
  const camera = new THREE.PerspectiveCamera(portrait ? 24 : options.mode === "detail" ? 34 : 38, width / height, 0.1, 100);
  if (options.mode === "detail") camera.position.set(0.18, 1.34, 4.35);
  else if (portrait) camera.position.set(0.16, isTiny ? 1.34 : isSmall ? 1.42 : 1.5, isTiny ? 5.7 : isSmall ? 5.15 : 4.65);
  else camera.position.set(0.2, 1.42, 4.75);
  camera.lookAt(0, portrait ? isTiny ? 1.18 : isSmall ? 1.2 : 1.24 : 1.24, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height);
  mount.innerHTML = "";
  mount.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x64748b, portrait ? 2.7 : 2.25));
  const key = new THREE.DirectionalLight(0xffffff, portrait ? 2.05 : 1.7);
  key.position.set(2.5, 4, 4.5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7dd3fc, portrait ? 0.95 : 0.35);
  rim.position.set(-3, 2.4, -2);
  scene.add(rim);
  const avatarGroup = createAvatarMesh(THREE, user, true);
  avatarGroup.position.y = AVATAR_ROOT_HEIGHT;
  avatarGroup.rotation.y = options.mode === "detail" ? -0.28 : portrait ? Math.PI - 0.08 : -0.34;
  if (portrait) {
    avatarGroup.scale.setScalar(isTiny ? 0.92 : isSmall ? 0.98 : 1.06);
    avatarGroup.position.y = isTiny ? 0.52 : 0.48;
  }
  scene.add(avatarGroup);
  const draw = () => renderer.render(scene, camera);
  draw();
  [160, 360, 800, 1500, 2800, 4600].forEach((delay) => {
    window.setTimeout(() => {
      if (mount.isConnected) draw();
    }, delay);
  });
}

function option(label, values) {
  return `<option value="">${label}</option>${values.map((value) => `<option value="${value}">${value}</option>`).join("")}`;
}

function relationshipText(value) {
  return { self: "This is you", friends: "Friends", request_sent: "Request Sent", request_received: "Respond in notifications", none: "Add Friend" }[value] || "Add Friend";
}

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Night";
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

function maskEmail(email) {
  return String(email || "").replace(/^(.).+(@.+)$/, "$1******$2");
}

function gameIdFromTitle(title) {
  return combinedGameCatalog(true).find((game) => game.title === title)?.id || "cubixia-survival";
}

function gameTitle(gameId) {
  return findGame(gameId)?.title || "CUBIXIA Game";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

ensureLegalFooter();
refreshGameCatalog()
  .finally(() => api("/api/me")
    .then((data) => routeUser(data))
    .catch(() => guestHome()));
