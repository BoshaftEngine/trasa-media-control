# TRASA Media Control — instalación desde cero

Este paquete está pensado para crear un proyecto NUEVO desde cero.

No contiene ninguna referencia a `default-bg.svg`.

La pantalla utiliza:

```text
assets/fondo.png
```

como fondo inicial fijo.

Aunque Firebase o JavaScript fallen, esa imagen seguirá apareciendo.

---

## 1. Firebase

Crea un proyecto nuevo en Firebase.

Por ejemplo:

```text
trasa-media-control-2
```

Después:

1. Añade una app Web `</>`.
2. Copia el `firebaseConfig`.
3. Crea **Realtime Database**.
4. Activa **Authentication → Anonymous**.

---

## 2. Configurar firebase-config.js

Abre:

```text
js/firebase-config.js
```

y sustituye:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

con los datos reales de tu nuevo proyecto Firebase.

---

## 3. Fondo

Este paquete incluye:

```text
assets/fondo.png
```

de prueba.

Sustitúyelo por tu diseño manteniendo EXACTAMENTE el mismo nombre:

```text
fondo.png
```

Recomendado:

```text
1920 × 1080
PNG
```

Así no tienes que modificar ningún código.

---

## 4. GitHub

Crea un repositorio NUEVO y PÚBLICO.

Por ejemplo:

```text
trasa-media-control-v3
```

Sube TODO el contenido de este ZIP a la raíz del repositorio.

La estructura debe ser:

```text
assets/
  fondo.png

css/
  style.css
  screen.css

js/
  firebase-config.js
  common.js
  control.js
  screen.js

index.html
control.html
screen.html
firebase-rules.json
README.md
.nojekyll
```

---

## 5. GitHub Pages

Ve a:

```text
Settings → Pages
```

Selecciona:

```text
Deploy from a branch
main
/(root)
```

Guarda.

GitHub te dará una URL similar a:

```text
https://TUUSUARIO.github.io/trasa-media-control-v3/
```

---

## 6. Comprobar el fondo ANTES de Firebase

Abre directamente:

```text
https://TUUSUARIO.github.io/trasa-media-control-v3/assets/fondo.png
```

Tiene que aparecer la imagen.

Después abre:

```text
https://TUUSUARIO.github.io/trasa-media-control-v3/screen.html
```

La imagen también debe aparecer.

Esto funciona incluso antes de terminar Firebase.

---

## 7. Obtener UID

Abre:

```text
https://TUUSUARIO.github.io/trasa-media-control-v3/control.html
```

En la tarjeta **Seguridad Firebase** aparecerá tu UID.

Cópialo.

---

## 8. Reglas

Abre:

```text
firebase-rules.json
```

Sustituye:

```text
PEGA_AQUI_TU_UID_DE_CONTROL
```

por tu UID.

Después ve a:

```text
Firebase
→ Realtime Database
→ Rules
```

pega las reglas y pulsa **Publish**.

---

## 9. Primera configuración

En CONTROL:

### Imagen

Deja:

```text
assets/fondo.png
```

y pulsa:

```text
Aplicar imagen
```

### Lista de pistas

Puedes mezclar Suno y YouTube:

```text
Tema Suno | https://suno.com/song/UUID...
Tema YouTube | https://www.youtube.com/watch?v=XXXXXXXXXXX
```

y pulsar:

```text
Importar / sustituir lista
```

---

## 10. URL para GTA

La URL que debes poner en el proyector es:

```text
https://TUUSUARIO.github.io/trasa-media-control-v3/screen.html
```

La que utilizas tú para controlar:

```text
https://TUUSUARIO.github.io/trasa-media-control-v3/control.html
```

---

# Fondo estático y parpadeo

Esta versión está hecha específicamente para evitar el problema anterior.

El fondo:

```text
assets/fondo.png
```

está definido directamente en `screen.html`.

Por tanto:

```text
Carga screen.html
      ↓
Carga fondo.png
      ↓
queda fijo
```

Firebase puede seguir actualizando:

- posición de canción;
- volumen;
- estado;
- play/pause;
- Suno;
- YouTube.

Pero ninguna de esas acciones modifica `background-image`.

Solo vuelve a cargarse el fondo cuando pulsas:

```text
Aplicar imagen
```

y cambia `backgroundVersion`.

---

# Si modificas archivos y GTA sigue mostrando una versión vieja

En:

```text
screen.html
```

verás:

```html
src="js/screen.js?v=1"
```

y:

```html
href="css/screen.css?v=1"
```

Si GTA mantiene caché, cambia:

```text
v=1
```

por:

```text
v=2
```

en ambos sitios y vuelve a subir `screen.html`.

Haz lo mismo en `control.html` si alguna vez Chrome conserva una versión antigua de `control.js`.

---

# Diagnóstico básico

## La imagen directa da 404

La ruta/nombre está mal.

Debe existir exactamente:

```text
assets/fondo.png
```

GitHub distingue mayúsculas.

---

## screen.html está negro pero fondo.png abre bien

Comprueba que estás abriendo GitHub Pages:

```text
https://TUUSUARIO.github.io/...
```

y NO:

```text
https://github.com/.../blob/...
```

---

## Control dice pantalla desconectada

Comprueba:

- Firebase configurado.
- Authentication Anonymous activado.
- Realtime Database creada.
- Reglas publicadas.
- screen.html abierto.

---

## Música bloqueada

Puede ser política de autoplay del navegador/CEF.

El sistema mostrará el error en CONTROL.

---

## YouTube no reproduce un vídeo concreto

Algunos vídeos no permiten reproducción embebida.

Prueba con otro vídeo.
