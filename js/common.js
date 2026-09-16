import {
  firebaseConfig,
  ROOM_ID,
  FIREBASE_VERSION
} from "./firebase-config.js";

const APP_URL =
  `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`;

const DB_URL =
  `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-database.js`;

const AUTH_URL =
  `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`;

export async function loadFirebase({ auth = false } = {}) {
  const appMod = await import(APP_URL);
  const dbMod = await import(DB_URL);
  const authMod = auth ? await import(AUTH_URL) : null;

  const app = appMod.initializeApp(firebaseConfig);
  const db = dbMod.getDatabase(app);

  return {
    app,
    db,
    dbMod,
    authMod
  };
}

export function roomPath(child = "") {
  return `rooms/${ROOM_ID}${child ? "/" + child : ""}`;
}

export function isFirebaseConfigured() {
  const required = [
    firebaseConfig.apiKey,
    firebaseConfig.authDomain,
    firebaseConfig.databaseURL,
    firebaseConfig.projectId,
    firebaseConfig.appId
  ];

  return required.every((value) => {
    return (
      typeof value === "string" &&
      value.length > 5 &&
      !value.includes("PEGA_AQUI") &&
      !value.includes("TU-PROYECTO")
    );
  });
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function fmtTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function extractSunoUuid(text) {
  if (!text) {
    return null;
  }

  const match = String(text).match(
    /suno\.com\/song\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
  );

  if (match) {
    return match[1].toLowerCase();
  }

  const uuid = String(text).match(
    /\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b/i
  );

  return uuid ? uuid[1].toLowerCase() : null;
}

export function extractYouTubeVideoId(text) {
  if (!text) {
    return null;
  }

  const raw = String(text).trim();

  const urlMatch =
    raw.match(/https?:\/\/[^\s|]+/i);

  const candidate =
    urlMatch ? urlMatch[0] : raw;

  try {
    const url = new URL(candidate);

    const host =
      url.hostname
        .toLowerCase()
        .replace(/^www\./, "");

    if (host === "youtu.be") {
      const id =
        url.pathname
          .split("/")
          .filter(Boolean)[0];

      return /^[A-Za-z0-9_-]{11}$/.test(id || "")
        ? id
        : null;
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host.endsWith(".youtube.com")
    ) {
      const watchId =
        url.searchParams.get("v");

      if (
        /^[A-Za-z0-9_-]{11}$/.test(watchId || "")
      ) {
        return watchId;
      }

      const parts =
        url.pathname
          .split("/")
          .filter(Boolean);

      if (
        ["shorts", "embed", "live"].includes(parts[0])
      ) {
        const id = parts[1];

        return /^[A-Za-z0-9_-]{11}$/.test(id || "")
          ? id
          : null;
      }
    }
  }
  catch {}

  return null;
}

export function sunoAudioUrl(uuid) {
  return `https://cdn1.suno.ai/${uuid}.m4a`;
}

export function sunoSongUrl(uuid) {
  return `https://suno.com/song/${uuid}`;
}

export function youtubeVideoUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
