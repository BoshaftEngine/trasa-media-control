import {
  DEFAULT_PLAYLIST_URL,
  DEFAULT_BACKGROUND
} from "./firebase-config.js";

import {
  loadFirebase,
  roomPath,
  isFirebaseConfigured,
  extractSunoUuid,
  extractYouTubeVideoId,
  sunoAudioUrl,
  sunoSongUrl,
  youtubeVideoUrl,
  youtubeThumbnailUrl,
  clamp,
  fmtTime
} from "./common.js";


const $ =
  (id) =>
    document.getElementById(id);


const els = {
  screenDot: $("screenDot"),
  screenStatus: $("screenStatus"),
  configError: $("configError"),
  message: $("message"),

  nowCover: $("nowCover"),
  nowTitle: $("nowTitle"),
  nowMeta: $("nowMeta"),

  timeCurrent: $("timeCurrent"),
  timeTotal: $("timeTotal"),
  seekSlider: $("seekSlider"),

  prevBtn: $("prevBtn"),
  backBtn: $("backBtn"),
  playPauseBtn: $("playPauseBtn"),
  forwardBtn: $("forwardBtn"),
  nextBtn: $("nextBtn"),
  stopBtn: $("stopBtn"),
  shuffleBtn: $("shuffleBtn"),
  restartBtn: $("restartBtn"),

  volumeSlider: $("volumeSlider"),
  volumeLabel: $("volumeLabel"),

  backgroundUrl: $("backgroundUrl"),
  applyBackgroundBtn: $("applyBackgroundBtn"),
  showImageBtn: $("showImageBtn"),
  blackoutBtn: $("blackoutBtn"),
  fitMode: $("fitMode"),
  reloadScreenBtn: $("reloadScreenBtn"),

  playlistUrl: $("playlistUrl"),
  openPlaylistBtn: $("openPlaylistBtn"),

  trackList: $("trackList"),
  trackImport: $("trackImport"),
  importTracksBtn: $("importTracksBtn"),
  clearTracksBtn: $("clearTracksBtn"),

  uidBox: $("uidBox"),
  copyUidBtn: $("copyUidBtn"),

  screenUrlBox: $("screenUrlBox"),
  copyScreenUrlBtn: $("copyScreenUrlBtn")
};


let db;
let dbMod;
let authMod;
let auth;

let userUid = "";

let tracks = [];

let config = {
  playlistUrl:
    DEFAULT_PLAYLIST_URL,

  backgroundUrl:
    DEFAULT_BACKGROUND,

  backgroundVersion:
    0,

  fitMode:
    "cover",

  displayMode:
    "image",

  volume:
    0.65,

  loopPlaylist:
    true,

  shuffle:
    false
};


let status = {
  online:
    false,

  trackIndex:
    0,

  position:
    0,

  duration:
    0,

  paused:
    true,

  updatedAt:
    0,

  error:
    ""
};


let seekDragging =
  false;

let messageTimer =
  null;


// ============================================================
// UI
// ============================================================

function showMessage(
  text,
  kind = ""
) {

  clearTimeout(
    messageTimer
  );


  els.message.textContent =
    text;


  els.message.className =
    `notice ${kind}`.trim();


  els.message.classList.remove(
    "hidden"
  );


  messageTimer =
    setTimeout(
      () => {

        els.message.classList.add(
          "hidden"
        );

      },
      4500
    );
}


function showConfigError(
  text
) {

  els.configError.textContent =
    text;


  els.configError.classList.remove(
    "hidden"
  );
}


function getCurrentIndex() {

  if (
    !tracks.length
  ) {

    return 0;

  }


  return clamp(
    Number(
      status.trackIndex
    ) || 0,

    0,

    tracks.length - 1
  );
}


function currentPosition() {

  return Math.max(
    0,
    Number(
      status.position
    ) || 0
  );
}


function renderStatus() {

  const age =
    Date.now() -
    (
      Number(
        status.updatedAt
      ) || 0
    );


  const online =
    status.online !== false &&
    age < 7000;


  els.screenDot.className =
    `dot ${online ? "ok" : "bad"}`;


  els.screenStatus.textContent =
    online
      ? "Pantalla GTA conectada"
      : "Pantalla sin conectar";


  if (
    status.error
  ) {

    els.screenDot.className =
      "dot bad";


    els.screenStatus.textContent =
      `Pantalla: ${status.error}`;

  }
}


function renderConfig() {

  els.playlistUrl.value =
    config.playlistUrl ||
    DEFAULT_PLAYLIST_URL;


  els.openPlaylistBtn.href =
    config.playlistUrl ||
    DEFAULT_PLAYLIST_URL;


  els.backgroundUrl.value =
    config.backgroundUrl ||
    DEFAULT_BACKGROUND;


  els.fitMode.value =
    config.fitMode ||
    "cover";


  const volume =
    Math.round(
      clamp(
        Number(
          config.volume ??
          0.65
        ),
        0,
        1
      ) * 100
    );


  els.volumeSlider.value =
    volume;


  els.volumeLabel.textContent =
    `${volume}%`;
}


function renderPlayback() {

  const index =
    getCurrentIndex();


  const track =
    tracks[index];


  els.nowTitle.textContent =
    track?.title ||
    "Sin reproducción";


  els.nowMeta.textContent =
    tracks.length
      ? `${index + 1} / ${tracks.length}`
      : "0 / 0";


  if (
    track?.type ===
    "youtube"
  ) {

    els.nowCover.src =
      youtubeThumbnailUrl(
        track.videoId
      );

  }
  else if (
    track?.uuid
  ) {

    els.nowCover.src =
      `https://cdn2.suno.ai/image_large_${track.uuid}.jpeg`;

  }
  else {

    els.nowCover.removeAttribute(
      "src"
    );

  }


  const position =
    currentPosition();


  const duration =
    Math.max(
      0,
      Number(
        status.duration
      ) || 0
    );


  if (
    !seekDragging
  ) {

    els.seekSlider.value =
      duration > 0
        ? Math.round(
            (
              position /
              duration
            ) * 1000
          )
        : 0;

  }


  els.timeCurrent.textContent =
    fmtTime(
      position
    );


  els.timeTotal.textContent =
    fmtTime(
      duration
    );


  els.playPauseBtn.textContent =
    status.paused === false
      ? "⏸"
      : "▶";


  renderTracks();
}


function renderTracks() {

  els.trackList.innerHTML =
    "";


  if (
    !tracks.length
  ) {

    els.trackList.innerHTML =
      '<div class="small-note">Todavía no hay pistas importadas.</div>';


    return;

  }


  const current =
    getCurrentIndex();


  tracks.forEach(
    (track, index) => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        `track ${index === current ? "active" : ""}`;


      const source =
        document.createElement(
          "div"
        );


      source.className =
        "track-num";


      source.textContent =
        track.type === "youtube"
          ? "YT"
          : "SU";


      const title =
        document.createElement(
          "div"
        );


      title.className =
        "track-title";


      title.textContent =
        track.title ||
        `Pista ${index + 1}`;


      const actions =
        document.createElement(
          "div"
        );


      actions.className =
        "track-actions";


      const play =
        document.createElement(
          "button"
        );


      play.textContent =
        "▶";


      play.addEventListener(
        "click",
        () => {

          sendCommand(
            "play",
            {
              trackIndex:
                index,

              position:
                0
            }
          );

        }
      );


      const open =
        document.createElement(
          "a"
        );


      open.className =
        "button-link";


      open.textContent =
        "↗";


      open.target =
        "_blank";


      open.rel =
        "noopener";


      open.href =
        track.url ||
        (
          track.type === "youtube"
            ? youtubeVideoUrl(
                track.videoId
              )
            : sunoSongUrl(
                track.uuid
              )
        );


      actions.append(
        play,
        open
      );


      row.append(
        source,
        title,
        actions
      );


      els.trackList.append(
        row
      );

    }
  );
}


// ============================================================
// FIREBASE WRITE
// ============================================================

async function writeConfig(
  patch
) {

  if (
    !db
  ) {

    return;

  }


  try {

    await dbMod.update(
      dbMod.ref(
        db,
        roomPath(
          "config"
        )
      ),
      patch
    );

  }
  catch (error) {

    showMessage(
      `Firebase rechazó el cambio: ${error.message}`,
      "error"
    );

  }
}


async function sendCommand(
  type,
  extra = {}
) {

  if (
    !db
  ) {

    return;

  }


  const payload = {

    type,

    seq:
      Date.now(),

    trackIndex:
      getCurrentIndex(),

    position:
      currentPosition(),

    volume:
      clamp(
        Number(
          config.volume ??
          0.65
        ),
        0,
        1
      ),

    issuedAt:
      dbMod.serverTimestamp(),

    ...extra

  };


  try {

    await dbMod.set(
      dbMod.ref(
        db,
        roomPath(
          "command"
        )
      ),
      payload
    );

  }
  catch (error) {

    showMessage(
      `No se pudo enviar el comando: ${error.message}`,
      "error"
    );

  }
}


// ============================================================
// IMPORTAR PISTAS
// ============================================================

function parseTrackLines(
  raw
) {

  const lines =
    raw
      .split(/\r?\n/)
      .map(
        (line) =>
          line.trim()
      )
      .filter(Boolean);


  const found =
    [];

  const seen =
    new Set();


  for (
    const line
    of lines
  ) {

    let title =
      "";


    if (
      line.includes("|")
    ) {

      title =
        line
          .split("|")[0]
          .trim();

    }


    const youtubeId =
      extractYouTubeVideoId(
        line
      );


    if (
      youtubeId
    ) {

      const key =
        `youtube:${youtubeId}`;


      if (
        seen.has(key)
      ) {

        continue;

      }


      seen.add(
        key
      );


      const urlMatch =
        line.match(
          /https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\/[^\s|]+/i
        );


      found.push({

        type:
          "youtube",

        videoId:
          youtubeId,

        title:
          title ||
          `YouTube ${String(found.length + 1).padStart(2, "0")}`,

        url:
          urlMatch
            ? urlMatch[0]
            : youtubeVideoUrl(
                youtubeId
              )

      });


      continue;

    }


    const sunoUuid =
      extractSunoUuid(
        line
      );


    if (
      sunoUuid
    ) {

      const key =
        `suno:${sunoUuid}`;


      if (
        seen.has(key)
      ) {

        continue;

      }


      seen.add(
        key
      );


      const urlMatch =
        line.match(
          /https?:\/\/suno\.com\/song\/[^\s|]+/i
        );


      found.push({

        type:
          "suno",

        uuid:
          sunoUuid,

        title:
          title ||
          `Suno ${String(found.length + 1).padStart(2, "0")}`,

        url:
          urlMatch
            ? urlMatch[0]
            : sunoSongUrl(
                sunoUuid
              ),

        audioUrl:
          sunoAudioUrl(
            sunoUuid
          )

      });

    }

  }


  return found;
}


async function importTracks() {

  const parsed =
    parseTrackLines(
      els.trackImport.value
    );


  if (
    !parsed.length
  ) {

    showMessage(
      "No he encontrado enlaces válidos de Suno o YouTube.",
      "error"
    );


    return;

  }


  try {

    await dbMod.set(
      dbMod.ref(
        db,
        roomPath(
          "tracks"
        )
      ),
      parsed
    );


    await writeConfig({

      playlistUrl:
        els.playlistUrl.value.trim() ||
        DEFAULT_PLAYLIST_URL

    });


    els.trackImport.value =
      "";


    showMessage(
      `${parsed.length} pistas importadas.`,
      "success"
    );

  }
  catch (error) {

    showMessage(
      `No se pudo guardar la lista: ${error.message}`,
      "error"
    );

  }
}


// ============================================================
// CONTROLES
// ============================================================

function bindControls() {

  els.playPauseBtn.addEventListener(
    "click",
    () => {

      if (
        !tracks.length
      ) {

        showMessage(
          "Primero importa alguna pista.",
          "error"
        );


        return;

      }


      if (
        status.paused === false
      ) {

        sendCommand(
          "pause",
          {
            position:
              currentPosition()
          }
        );

      }
      else {

        sendCommand(
          "play",
          {
            position:
              currentPosition()
          }
        );

      }

    }
  );


  els.stopBtn.addEventListener(
    "click",
    () => {

      sendCommand(
        "stop",
        {
          position:
            0
        }
      );

    }
  );


  els.restartBtn.addEventListener(
    "click",
    () => {

      if (
        !tracks.length
      ) {

        return;

      }


      sendCommand(
        "play",
        {
          trackIndex:
            getCurrentIndex(),

          position:
            0
        }
      );

    }
  );


  els.prevBtn.addEventListener(
    "click",
    () => {

      if (
        !tracks.length
      ) {

        return;

      }


      const next =
        (
          getCurrentIndex() -
          1 +
          tracks.length
        ) %
        tracks.length;


      sendCommand(
        "play",
        {
          trackIndex:
            next,

          position:
            0
        }
      );

    }
  );


  els.nextBtn.addEventListener(
    "click",
    () => {

      if (
        !tracks.length
      ) {

        return;

      }


      const next =
        (
          getCurrentIndex() +
          1
        ) %
        tracks.length;


      sendCommand(
        "play",
        {
          trackIndex:
            next,

          position:
            0
        }
      );

    }
  );


  els.shuffleBtn.addEventListener(
    "click",
    () => {

      if (
        !tracks.length
      ) {

        return;

      }


      let next =
        getCurrentIndex();


      if (
        tracks.length > 1
      ) {

        while (
          next ===
          getCurrentIndex()
        ) {

          next =
            Math.floor(
              Math.random() *
              tracks.length
            );

        }

      }


      sendCommand(
        "play",
        {
          trackIndex:
            next,

          position:
            0
        }
      );

    }
  );


  els.backBtn.addEventListener(
    "click",
    () => {

      sendCommand(
        "seek",
        {
          position:
            Math.max(
              0,
              currentPosition() -
              10
            )
        }
      );

    }
  );


  els.forwardBtn.addEventListener(
    "click",
    () => {

      const duration =
        Number(
          status.duration
        ) || Infinity;


      sendCommand(
        "seek",
        {
          position:
            Math.min(
              duration,
              currentPosition() +
              10
            )
        }
      );

    }
  );


  els.volumeSlider.addEventListener(
    "input",
    async () => {

      const volume =
        Number(
          els.volumeSlider.value
        ) /
        100;


      els.volumeLabel.textContent =
        `${Math.round(volume * 100)}%`;


      config.volume =
        volume;


      await writeConfig({
        volume
      });

    }
  );


  els.seekSlider.addEventListener(
    "pointerdown",
    () => {

      seekDragging =
        true;

    }
  );


  els.seekSlider.addEventListener(
    "pointerup",
    () => {

      seekDragging =
        false;


      const duration =
        Number(
          status.duration
        ) || 0;


      if (
        duration <= 0
      ) {

        return;

      }


      const position =
        (
          Number(
            els.seekSlider.value
          ) /
          1000
        ) *
        duration;


      sendCommand(
        "seek",
        {
          position
        }
      );

    }
  );


  els.applyBackgroundBtn.addEventListener(
    "click",
    async () => {

      const url =
        els.backgroundUrl.value.trim() ||
        DEFAULT_BACKGROUND;


      await writeConfig({

        backgroundUrl:
          url,

        backgroundVersion:
          Date.now(),

        displayMode:
          "image"

      });


      showMessage(
        "Imagen enviada a la pantalla.",
        "success"
      );

    }
  );


  els.showImageBtn.addEventListener(
    "click",
    () => {

      writeConfig({
        displayMode:
          "image"
      });

    }
  );


  els.blackoutBtn.addEventListener(
    "click",
    () => {

      writeConfig({
        displayMode:
          "black"
      });

    }
  );


  els.fitMode.addEventListener(
    "change",
    () => {

      writeConfig({
        fitMode:
          els.fitMode.value
      });

    }
  );


  els.reloadScreenBtn.addEventListener(
    "click",
    () => {

      sendCommand(
        "reload"
      );

    }
  );


  els.playlistUrl.addEventListener(
    "change",
    () => {

      writeConfig({
        playlistUrl:
          els.playlistUrl.value.trim() ||
          DEFAULT_PLAYLIST_URL
      });

    }
  );


  els.importTracksBtn.addEventListener(
    "click",
    importTracks
  );


  els.clearTracksBtn.addEventListener(
    "click",
    async () => {

      if (
        !confirm(
          "¿Vaciar la lista?"
        )
      ) {

        return;

      }


      await dbMod.set(
        dbMod.ref(
          db,
          roomPath(
            "tracks"
          )
        ),
        []
      );


      await sendCommand(
        "stop",
        {
          position:
            0
        }
      );


      showMessage(
        "Lista vaciada.",
        "success"
      );

    }
  );


  els.copyUidBtn.addEventListener(
    "click",
    async () => {

      if (
        !userUid
      ) {

        return;

      }


      await navigator.clipboard.writeText(
        userUid
      );


      showMessage(
        "UID copiado.",
        "success"
      );

    }
  );


  els.copyScreenUrlBtn.addEventListener(
    "click",
    async () => {

      await navigator.clipboard.writeText(
        els.screenUrlBox.textContent
      );


      showMessage(
        "URL copiada.",
        "success"
      );

    }
  );

}


// ============================================================
// INIT
// ============================================================

async function init() {

  bindControls();


  els.screenUrlBox.textContent =
    new URL(
      "screen.html",
      window.location.href
    ).href;


  els.playlistUrl.value =
    DEFAULT_PLAYLIST_URL;


  els.openPlaylistBtn.href =
    DEFAULT_PLAYLIST_URL;


  els.backgroundUrl.value =
    DEFAULT_BACKGROUND;


  if (
    !isFirebaseConfigured()
  ) {

    showConfigError(
      "Configura Firebase en js/firebase-config.js y vuelve a cargar."
    );


    els.uidBox.textContent =
      "Firebase todavía no está configurado.";


    return;

  }


  try {

    const loaded =
      await loadFirebase({
        auth: true
      });


    db =
      loaded.db;

    dbMod =
      loaded.dbMod;

    authMod =
      loaded.authMod;


    auth =
      authMod.getAuth(
        loaded.app
      );


    const credential =
      await authMod.signInAnonymously(
        auth
      );


    userUid =
      credential.user.uid;


    els.uidBox.textContent =
      userUid;


    // TRACKS
    dbMod.onValue(
      dbMod.ref(
        db,
        roomPath(
          "tracks"
        )
      ),
      (snap) => {

        const value =
          snap.val();


        tracks =
          Array.isArray(
            value
          )
            ? value.filter(Boolean)
            : value
              ? Object.keys(value)
                  .sort(
                    (a,b) =>
                      Number(a) -
                      Number(b)
                  )
                  .map(
                    (key) =>
                      value[key]
                  )
              : [];


        renderTracks();
        renderPlayback();

      },
      (error) => {

        showMessage(
          `No se puede leer la lista: ${error.message}`,
          "error"
        );

      }
    );


    // CONFIG
    dbMod.onValue(
      dbMod.ref(
        db,
        roomPath(
          "config"
        )
      ),
      (snap) => {

        config = {
          ...config,
          ...(snap.val() || {})
        };


        renderConfig();

      }
    );


    // STATUS
    dbMod.onValue(
      dbMod.ref(
        db,
        roomPath(
          "status"
        )
      ),
      (snap) => {

        status = {
          ...status,
          ...(snap.val() || {})
        };


        renderStatus();
        renderPlayback();

      }
    );


    renderConfig();
    renderStatus();
    renderPlayback();

  }
  catch (error) {

    showConfigError(
      `Error Firebase: ${error.message}`
    );


    els.uidBox.textContent =
      "No se pudo iniciar sesión.";

  }
}


init();
