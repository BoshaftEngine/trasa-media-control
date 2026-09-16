import {
  DEFAULT_BACKGROUND
} from "./firebase-config.js";

import {
  loadFirebase,
  roomPath,
  isFirebaseConfigured,
  sunoAudioUrl,
  clamp
} from "./common.js";


// ============================================================
// ELEMENTOS HTML
// ============================================================

const screenBackground =
  document.getElementById(
    "screenBackground"
  );

const blackout =
  document.getElementById(
    "blackout"
  );

const errorBox =
  document.getElementById(
    "screenError"
  );

const audio =
  document.getElementById(
    "audio"
  );

const youtubeWrap =
  document.getElementById(
    "youtubeWrap"
  );


// ============================================================
// FIREBASE / ESTADO
// ============================================================

let db;
let dbMod;
let authMod;
let auth;

let tracks = [];

let config = {
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


let currentIndex =
  0;

let lastCommandSeq =
  0;

let lastError =
  "";

let ready =
  false;


// ============================================================
// FONDO
// ============================================================
//
// screen.html YA carga assets/fondo.png directamente.
//
// JavaScript solo cambia el fondo cuando Firebase indica una
// URL/versión diferente.
//
// Música, status, volumen y timers NO tocan backgroundImage.
//
let currentBackgroundUrl =
  DEFAULT_BACKGROUND;

let currentBackgroundVersion =
  0;


// ============================================================
// YOUTUBE
// ============================================================

let ytApiPromise =
  null;

let ytPlayer =
  null;

let ytReadyPromise =
  null;

let ytReadyResolve =
  null;


// ============================================================
// ERRORES
// ============================================================

function setError(
  text = ""
) {

  lastError =
    text;


  errorBox.textContent =
    text;


  errorBox.classList.toggle(
    "hidden",
    !text
  );
}


// ============================================================
// FONDO
// ============================================================

function loadBackgroundIfChanged(
  url,
  version = 0
) {

  const cleanUrl =
    String(
      url ||
      ""
    ).trim();


  if (
    !cleanUrl
  ) {

    return;

  }


  const cleanVersion =
    Number(
      version
    ) || 0;


  if (
    cleanUrl ===
      currentBackgroundUrl &&
    cleanVersion ===
      currentBackgroundVersion
  ) {

    return;

  }


  const loader =
    new Image();


  loader.onload =
    () => {

      /*
        Solo se cambia el fondo DESPUÉS de que la imagen
        esté completamente cargada.
      */
      screenBackground.style.backgroundImage =
        `url("${cleanUrl}")`;


      currentBackgroundUrl =
        cleanUrl;


      currentBackgroundVersion =
        cleanVersion;


      if (
        lastError.startsWith(
          "No se pudo cargar la imagen:"
        )
      ) {

        setError(
          ""
        );

      }

    };


  loader.onerror =
    () => {

      setError(
        `No se pudo cargar la imagen: ${cleanUrl}`
      );

    };


  /*
    Cache-bust ÚNICAMENTE cuando cambia backgroundVersion.
    Nunca se genera periódicamente.
  */
  const separator =
    cleanUrl.includes("?")
      ? "&"
      : "?";


  loader.src =
    cleanVersion
      ? `${cleanUrl}${separator}v=${cleanVersion}`
      : cleanUrl;

}


// ============================================================
// TRACK HELPERS
// ============================================================

function getTrack(
  index
) {

  if (
    !tracks.length
  ) {

    return null;

  }


  const safeIndex =
    clamp(
      Number(index) || 0,
      0,
      tracks.length - 1
    );


  return tracks[
    safeIndex
  ];
}


function activeTrack() {

  return getTrack(
    currentIndex
  );
}


function isYouTubeTrack(
  track =
    activeTrack()
) {

  return (
    track?.type ===
    "youtube"
  );
}


function getSunoAudioUrl(
  track
) {

  return (
    track?.audioUrl ||
    (
      track?.uuid
        ? sunoAudioUrl(
            track.uuid
          )
        : ""
    )
  );
}


// ============================================================
// VISUALS
// ============================================================
//
// IMPORTANTE:
// Esta función NO modifica backgroundImage.
//
function updateVisuals() {

  screenBackground.style.backgroundSize =
    config.fitMode ===
      "contain"
      ? "contain"
      : "cover";


  const youtubeVisible =
    isYouTubeTrack() &&
    youtubeWrap &&
    !youtubeWrap.classList.contains(
      "hidden"
    );


  blackout.classList.toggle(
    "on",
    config.displayMode ===
      "black" &&
    !youtubeVisible
  );


  audio.volume =
    clamp(
      Number(
        config.volume ??
        0.65
      ),
      0,
      1
    );


  if (
    ytPlayer?.setVolume
  ) {

    try {

      ytPlayer.setVolume(
        Math.round(
          clamp(
            Number(
              config.volume ??
              0.65
            ),
            0,
            1
          ) * 100
        )
      );

    }
    catch {}

  }

}


// ============================================================
// YOUTUBE VISIBILIDAD
// ============================================================

function showYouTubePlayer(
  show
) {

  youtubeWrap.classList.toggle(
    "hidden",
    !show
  );


  document.body.classList.toggle(
    "youtube-active",
    show
  );


  updateVisuals();
}


// ============================================================
// YOUTUBE API
// ============================================================

function loadYouTubeApi() {

  if (
    window.YT?.Player
  ) {

    return Promise.resolve(
      window.YT
    );

  }


  if (
    ytApiPromise
  ) {

    return ytApiPromise;

  }


  ytApiPromise =
    new Promise(
      (resolve) => {

        const previous =
          window.onYouTubeIframeAPIReady;


        window.onYouTubeIframeAPIReady =
          () => {

            if (
              typeof previous ===
              "function"
            ) {

              try {
                previous();
              }
              catch {}

            }


            resolve(
              window.YT
            );

          };


        const script =
          document.createElement(
            "script"
          );


        script.src =
          "https://www.youtube.com/iframe_api";


        document.head.appendChild(
          script
        );

      }
    );


  return ytApiPromise;
}


async function ensureYouTubePlayer(
  videoId
) {

  await loadYouTubeApi();


  if (
    ytPlayer
  ) {

    if (
      ytReadyPromise
    ) {

      await ytReadyPromise;

    }


    return ytPlayer;

  }


  ytReadyPromise =
    new Promise(
      (resolve) => {

        ytReadyResolve =
          resolve;

      }
    );


  ytPlayer =
    new YT.Player(
      "youtubePlayer",
      {

        width:
          "480",

        height:
          "270",

        videoId,

        playerVars: {

          controls:
            1,

          playsinline:
            1,

          rel:
            0

        },

        events: {

          onReady:
            () => {

              ytPlayer.setVolume(
                Math.round(
                  clamp(
                    Number(
                      config.volume ??
                      0.65
                    ),
                    0,
                    1
                  ) * 100
                )
              );


              ytReadyResolve?.();

            },


          onStateChange:
            (event) => {

              if (
                event.data ===
                YT.PlayerState.ENDED
              ) {

                autoNext();

              }


              writeStatus();

            },


          onError:
            (event) => {

              setError(
                `YouTube no puede reproducir este vídeo (código ${event.data}).`
              );


              writeStatus();

            },


          onAutoplayBlocked:
            () => {

              setError(
                "YouTube: reproducción automática bloqueada por el navegador."
              );


              writeStatus();

            }

        }

      }
    );


  await ytReadyPromise;


  return ytPlayer;
}


// ============================================================
// STOP HELPERS
// ============================================================

function stopSuno() {

  audio.pause();


  try {

    audio.currentTime =
      0;

  }
  catch {}

}


function stopYouTube() {

  if (
    ytPlayer
  ) {

    try {

      ytPlayer.stopVideo();

    }
    catch {}

  }


  showYouTubePlayer(
    false
  );
}


// ============================================================
// LOAD SUNO
// ============================================================

async function loadSunoTrack(
  track,
  index,
  position = 0,
  shouldPlay = true
) {

  if (
    !track
  ) {

    throw new Error(
      "Pista de Suno no válida."
    );

  }


  stopYouTube();


  currentIndex =
    index;


  const desired =
    getSunoAudioUrl(
      track
    );


  if (
    !desired
  ) {

    throw new Error(
      "La canción de Suno no tiene URL de audio."
    );

  }


  if (
    audio.src !==
    desired
  ) {

    audio.src =
      desired;


    audio.load();


    await new Promise(
      (resolve) => {

        if (
          audio.readyState >=
          1
        ) {

          resolve();

          return;

        }


        audio.addEventListener(
          "loadedmetadata",
          resolve,
          {
            once:
              true
          }
        );


        setTimeout(
          resolve,
          3500
        );

      }
    );

  }


  try {

    const pos =
      Math.max(
        0,
        Number(position) || 0
      );


    if (
      Number.isFinite(
        audio.duration
      ) &&
      audio.duration > 0
    ) {

      audio.currentTime =
        Math.min(
          pos,
          Math.max(
            0,
            audio.duration -
            0.05
          )
        );

    }
    else {

      audio.currentTime =
        pos;

    }

  }
  catch {}


  audio.volume =
    clamp(
      Number(
        config.volume ??
        0.65
      ),
      0,
      1
    );


  if (
    shouldPlay
  ) {

    await audio.play();

  }

}


// ============================================================
// LOAD YOUTUBE
// ============================================================

async function loadYouTubeTrack(
  track,
  index,
  position = 0,
  shouldPlay = true
) {

  if (
    !track?.videoId
  ) {

    throw new Error(
      "Enlace de YouTube no válido."
    );

  }


  stopSuno();


  currentIndex =
    index;


  showYouTubePlayer(
    true
  );


  const player =
    await ensureYouTubePlayer(
      track.videoId
    );


  player.setVolume(
    Math.round(
      clamp(
        Number(
          config.volume ??
          0.65
        ),
        0,
        1
      ) * 100
    )
  );


  if (
    shouldPlay
  ) {

    player.loadVideoById({

      videoId:
        track.videoId,

      startSeconds:
        Math.max(
          0,
          Number(position) || 0
        )

    });

  }
  else {

    player.cueVideoById({

      videoId:
        track.videoId,

      startSeconds:
        Math.max(
          0,
          Number(position) || 0
        )

    });

  }

}


// ============================================================
// LOAD TRACK
// ============================================================

async function loadTrack(
  index,
  position = 0,
  shouldPlay = true
) {

  const safeIndex =
    clamp(
      Number(index) || 0,
      0,
      Math.max(
        0,
        tracks.length - 1
      )
    );


  const track =
    getTrack(
      safeIndex
    );


  if (
    !track
  ) {

    throw new Error(
      "No hay una pista válida en esa posición."
    );

  }


  if (
    track.type ===
    "youtube"
  ) {

    return loadYouTubeTrack(
      track,
      safeIndex,
      position,
      shouldPlay
    );

  }


  return loadSunoTrack(
    track,
    safeIndex,
    position,
    shouldPlay
  );
}


// ============================================================
// CURRENT STATE
// ============================================================

function currentPosition() {

  const track =
    activeTrack();


  if (
    track?.type ===
      "youtube" &&
    ytPlayer?.getCurrentTime
  ) {

    try {

      return (
        Number(
          ytPlayer.getCurrentTime()
        ) || 0
      );

    }
    catch {

      return 0;

    }

  }


  return (
    Number.isFinite(
      audio.currentTime
    )
      ? audio.currentTime
      : 0
  );
}


function currentDuration() {

  const track =
    activeTrack();


  if (
    track?.type ===
      "youtube" &&
    ytPlayer?.getDuration
  ) {

    try {

      return (
        Number(
          ytPlayer.getDuration()
        ) || 0
      );

    }
    catch {

      return 0;

    }

  }


  return (
    Number.isFinite(
      audio.duration
    )
      ? audio.duration
      : 0
  );
}


function currentPaused() {

  const track =
    activeTrack();


  if (
    track?.type ===
      "youtube" &&
    ytPlayer?.getPlayerState
  ) {

    try {

      return (
        ytPlayer.getPlayerState() !==
        YT.PlayerState.PLAYING
      );

    }
    catch {

      return true;

    }

  }


  return audio.paused;
}


// ============================================================
// COMMANDS
// ============================================================

async function applyCommand(
  cmd
) {

  if (
    !cmd ||
    typeof cmd !==
      "object"
  ) {

    return;

  }


  const seq =
    Number(
      cmd.seq
    ) || 0;


  if (
    seq &&
    seq ===
      lastCommandSeq
  ) {

    return;

  }


  lastCommandSeq =
    seq ||
    Date.now();


  try {

    switch (
      cmd.type
    ) {


      case "play": {

        const wantedIndex =
          clamp(
            Number(
              cmd.trackIndex ??
              currentIndex
            ),
            0,
            Math.max(
              0,
              tracks.length - 1
            )
          );


        const wantedTrack =
          getTrack(
            wantedIndex
          );


        if (
          !wantedTrack
        ) {

          throw new Error(
            "No hay pistas en la lista."
          );

        }


        const position =
          Math.max(
            0,
            Number(
              cmd.position
            ) || 0
          );


        const oldTrack =
          activeTrack();


        const changed =
          wantedIndex !==
            currentIndex ||

          wantedTrack.type !==
            oldTrack?.type ||

          (
            wantedTrack.type ===
              "youtube" &&

            wantedTrack.videoId !==
              oldTrack?.videoId
          ) ||

          (
            wantedTrack.type !==
              "youtube" &&

            wantedTrack.uuid !==
              oldTrack?.uuid
          );


        if (
          changed
        ) {

          await loadTrack(
            wantedIndex,
            position,
            true
          );

        }

        else if (
          wantedTrack.type ===
            "youtube"
        ) {

          showYouTubePlayer(
            true
          );


          const player =
            await ensureYouTubePlayer(
              wantedTrack.videoId
            );


          try {

            const actual =
              player.getCurrentTime?.() ||
              0;


            if (
              Math.abs(
                actual -
                position
              ) > 2
            ) {

              player.seekTo(
                position,
                true
              );

            }

          }
          catch {}


          player.setVolume(
            Math.round(
              clamp(
                Number(
                  cmd.volume ??
                  config.volume ??
                  0.65
                ),
                0,
                1
              ) * 100
            )
          );


          player.playVideo();

        }

        else {

          if (
            !audio.src
          ) {

            await loadSunoTrack(
              wantedTrack,
              wantedIndex,
              position,
              false
            );

          }


          try {

            audio.currentTime =
              position;

          }
          catch {}


          audio.volume =
            clamp(
              Number(
                cmd.volume ??
                config.volume ??
                0.65
              ),
              0,
              1
            );


          await audio.play();

        }


        setError(
          ""
        );


        break;

      }


      case "pause": {

        if (
          isYouTubeTrack()
        ) {

          if (
            ytPlayer
          ) {

            if (
              cmd.position !=
              null
            ) {

              ytPlayer.seekTo(
                Math.max(
                  0,
                  Number(
                    cmd.position
                  ) || 0
                ),
                true
              );

            }


            ytPlayer.pauseVideo();

          }

        }
        else {

          audio.pause();


          if (
            cmd.position !=
            null
          ) {

            try {

              audio.currentTime =
                Math.max(
                  0,
                  Number(
                    cmd.position
                  ) || 0
                );

            }
            catch {}

          }

        }


        setError(
          ""
        );


        break;

      }


      case "stop": {

        if (
          isYouTubeTrack()
        ) {

          try {

            ytPlayer?.stopVideo();

          }
          catch {}

        }
        else {

          audio.pause();


          try {

            audio.currentTime =
              0;

          }
          catch {}

        }


        setError(
          ""
        );


        break;

      }


      case "seek": {

        const position =
          Math.max(
            0,
            Number(
              cmd.position
            ) || 0
          );


        if (
          isYouTubeTrack()
        ) {

          ytPlayer?.seekTo(
            position,
            true
          );

        }
        else {

          try {

            audio.currentTime =
              position;

          }
          catch {}

        }


        setError(
          ""
        );


        break;

      }


      case "reload":

        window.location.reload();

        break;

    }

  }
  catch (error) {

    if (
      error?.name ===
        "NotAllowedError"
    ) {

      setError(
        "Reproducción automática bloqueada por el navegador del proyector."
      );

    }
    else {

      setError(
        error?.message ||
        String(error)
      );

    }

  }


  writeStatus();
}


// ============================================================
// NEXT
// ============================================================

function chooseNextIndex() {

  if (
    !tracks.length
  ) {

    return 0;

  }


  if (
    config.shuffle &&
    tracks.length > 1
  ) {

    let next =
      currentIndex;


    while (
      next ===
      currentIndex
    ) {

      next =
        Math.floor(
          Math.random() *
          tracks.length
        );

    }


    return next;

  }


  return (
    currentIndex + 1
  ) %
  tracks.length;
}


async function autoNext() {

  if (
    !tracks.length
  ) {

    return;

  }


  const next =
    chooseNextIndex();


  try {

    await loadTrack(
      next,
      0,
      true
    );


    setError(
      ""
    );

  }
  catch (error) {

    setError(
      error?.message ||
      String(error)
    );

  }


  writeStatus();
}


// ============================================================
// STATUS
// ============================================================

async function writeStatus() {

  if (
    !db ||
    !dbMod
  ) {

    return;

  }


  const payload = {

    online:
      true,

    trackIndex:
      currentIndex,

    trackType:
      activeTrack()?.type ||
      "suno",

    position:
      currentPosition(),

    duration:
      currentDuration(),

    paused:
      currentPaused(),

    error:
      lastError,

    updatedAt:
      dbMod.serverTimestamp()

  };


  try {

    await dbMod.update(
      dbMod.ref(
        db,
        roomPath(
          "status"
        )
      ),
      payload
    );

  }
  catch {}

}


// ============================================================
// INIT
// ============================================================

async function init() {

  /*
    El fondo ya está visible gracias a screen.html.
    Aquí NO se vuelve a cargar.
  */
  updateVisuals();


  if (
    !isFirebaseConfigured()
  ) {

    setError(
      "Firebase no está configurado en js/firebase-config.js"
    );


    return;

  }


  try {

    const loaded =
      await loadFirebase({
        auth:
          true
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


    await authMod.signInAnonymously(
      auth
    );


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
            ? value.filter(
                Boolean
              )
            : value
              ? Object.keys(
                  value
                )
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


        if (
          currentIndex >=
          tracks.length
        ) {

          currentIndex =
            0;

        }


        ready =
          true;


        updateVisuals();
        writeStatus();

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

        const incoming =
          snap.val() ||
          {};


        config = {
          ...config,
          ...incoming
        };


        /*
          SOLO aquí puede cambiarse el fondo dinámicamente,
          y únicamente si URL o versión son diferentes.
        */
        if (
          incoming.backgroundUrl
        ) {

          loadBackgroundIfChanged(
            incoming.backgroundUrl,
            incoming.backgroundVersion ||
            0
          );

        }


        updateVisuals();

      }
    );


    // COMMAND
    dbMod.onValue(
      dbMod.ref(
        db,
        roomPath(
          "command"
        )
      ),

      (snap) => {

        const cmd =
          snap.val();


        if (
          !ready &&
          cmd?.type ===
            "play"
        ) {

          const wait =
            setInterval(
              () => {

                if (
                  ready
                ) {

                  clearInterval(
                    wait
                  );


                  applyCommand(
                    cmd
                  );

                }

              },
              150
            );


          setTimeout(
            () => {

              clearInterval(
                wait
              );

            },
            5000
          );

        }
        else {

          applyCommand(
            cmd
          );

        }

      }
    );


    // AUDIO EVENTS
    audio.addEventListener(
      "ended",
      autoNext
    );


    audio.addEventListener(
      "play",
      writeStatus
    );


    audio.addEventListener(
      "pause",
      writeStatus
    );


    audio.addEventListener(
      "loadedmetadata",
      writeStatus
    );


    audio.addEventListener(
      "error",
      () => {

        if (
          !isYouTubeTrack()
        ) {

          setError(
            "No se pudo cargar el audio de Suno."
          );


          writeStatus();

        }

      }
    );


    /*
      Telemetría.
      No toca la imagen.
    */
    setInterval(
      writeStatus,
      2000
    );


    writeStatus();

  }
  catch (error) {

    setError(
      `Error Firebase: ${error.message}`
    );

  }

}


init();
