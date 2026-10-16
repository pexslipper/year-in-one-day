# Year in one day

A 3D year-in-review site. You fly through twelve months of work, and the sky changes as you go. January is before sunrise, midsummer is noon, and December is after dark.

Built with [three.js](https://threejs.org) (3D), [GSAP](https://gsap.com) (camera moves) and [Vite](https://vite.dev) (dev server and build).

## Run it

You need [Node.js](https://nodejs.org) 18 or newer (the LTS download is fine).

**On Windows:** double-click `start-dev.cmd`. The first run installs packages, then it opens the site in your browser.

**Or from a terminal** in this folder:

```bash
npm install     # once
npm run dev     # starts http://localhost:5173 and opens it
```

Edits to any file show up in the browser straight away.

## Make it yours

| What | Where |
| --- | --- |
| Studio name, headline, intro, contact link | `src/content.js` → `site` |
| Projects for each month | `src/content.js` → `months` |
| Your images and videos | drop them in `public/media/`, then set `image: 'media/name.jpg'` or `video: 'media/name.mp4'` on an item |
| The sky colours for each month | `src/sky.js` → `SKY` |
| UI colours, fonts, spacing | `src/style.css` (top of file) |
| Spacing between months, camera distance | `src/scene/Experience.js` → `SECTION`, `VIEW` |

Items without an image get a generated placeholder in that month's colours, so the site always looks finished while you fill it in.

Everything in a month is placed by its day number, so 13 April sits a little under halfway through April.

## Special days and the birthday

Thai holidays for 2026 are in `specialDays` at the bottom of `src/content.js`. Each one is a round date card with the day, a small drawing and the Thai name. Click one to read about it. They're also marked with dots on the progress line and listed in the Index.

You don't place the cards yourself. When the page loads (and when the window changes size), `src/scene/layout.js` tries spots all over the screen for every card and picks the one where, as you fly past, it's least covered by anything else and still fits on screen. Projects go through the same step but stay on their own left or right side. Add or move dates freely and the layout sorts itself out.

Several Buddhist holidays (Makha Bucha, Visakha Bucha, Asanha Bucha, Ok Phansa, Loy Krathong) follow the lunar calendar, so update their dates for other years.

**The birthday** is the December entry with `kind: 'birthday'`. It's a turning cake with candles, with its own date card above it. While the cake is in sight, confetti drifts down and fireworks go up. Clicking the cake pops a burst of confetti and sends up an extra volley. To change it:

- Set `title` to put a name in it, e.g. `title: 'Happy birthday, Nok'`.
- Move it by changing `date`. It can go in any month.
- Set `color` and `motif` for its date card, like the other special days.
- The cake colours are at the top of `src/scene/Birthday.js`, and the firework and confetti colours at the top of `src/scene/Fireworks.js` and `src/scene/Confetti.js`.

Fireworks and confetti play on every device without anyone changing a setting. If a visitor's device asks for reduced motion (an accessibility setting), they get a calmer version: fewer pieces, slower falling, fewer fireworks and no bright flash. To change how much, look for `calm` in `src/scene/Experience.js`.

The 3D view needs WebGL2, which nearly every phone, tablet and computer from the last several years has. On a device without it, visitors see the whole year as a plain list instead.

**Green-screen videos:** film or render on pure green, then add `chroma: true` to the item. The shader removes the green so the sky shows through. The December item "A wave goodbye" shows how. If your green isn't `#00ff00`, set `chromaKey: '#3fbf4a'` (or whatever it is).

**Video format:** use H.264 `.mp4` files. Keep them short and small (under about 5 MB). They're muted and loop.

## Controls

- Scroll, drag, swipe, or use the arrow keys to move. PageUp and PageDown jump a month; Home and End go to the start or end.
- Click a project to open it. Previous and Next (or the arrow keys) step through projects; Esc or scrolling closes it.
- The month rail at the bottom jumps straight to a month. "Index" lists everything.

## Publish it

```bash
npm run build
```

This writes a static site to `dist/`. Upload that folder to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages, or your own server). It works from a sub-folder too.

## How it works

- **One camera, one axis.** Every month is a section along the z axis (`SECTION` units long). Scrolling changes a target position, and each frame the camera eases toward it, which makes it feel smooth (`Experience.update`).
- **The sky is the clock.** Where the camera is decides a time of year, which picks the sky gradient, the sun's height and how many stars show (`sky.js`, `Background.js`). Text and UI switch between a dark and a light ink, whichever reads better on the current sky.
- **Pictures are planes with a custom shader** (`shaders.js`). They fade in from the distance, bow slightly when you move fast, zoom a touch on hover, and can key out green.
- **Videos are managed by distance.** A video element only exists while its item is near. It changes play/pause only when you're moving slowly, and it's released when far away, because phones can only decode a few videos at once (`Experience.manageVideo`, `Item.js`).
- **Text in 3D** is drawn to a canvas in white and tinted in the shader, so it can change colour with the sky (`text.js`).
- **Fallback.** Without WebGL, the Index shows the whole year as a readable list. Reduced-motion settings turn off the bending, parallax and long transitions.

## Files

```
index.html            page structure (intro, edges, panel, index)
src/
  content.js          your content and special days — start here
  timeline.js         puts projects and special days in date order
  sky.js              month colours, sun and stars
  style.css           all HTML styling
  main.js             wires the scene and the UI together
  scene/
    Experience.js     renderer, camera, input, frame loop
    Item.js           one project or special day: picture/video/medallion, caption
    layout.js         spreads cards out so each one can be seen clearly
    Birthday.js       the birthday cake and its date card
    Fireworks.js      rockets, bursts and sparks
    Confetti.js       falling and popping paper confetti
    Background.js     the sky
    Dust.js           floating specks (stars at night)
    text.js           month names and captions
    placeholder.js    generated placeholder artwork
    shaders.js        all GLSL
  ui/UI.js            intro, month rail, detail panel, index
  assets/fonts/       Big Shoulders, Newsreader and Kanit for Thai (SIL Open Font License)
public/media/         images and videos you reference from content.js
```

## Licences

three.js is MIT. GSAP is free to use under its standard licence. The three fonts are under the SIL Open Font License (see `src/assets/fonts`). The sample videos and placeholder art were generated for this project; replace them with your own.
