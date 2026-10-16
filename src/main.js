import './three-setup.js';
import { Experience } from './scene/Experience.js';
import { UI } from './ui/UI.js';
import { site, months, specialDays } from './content.js';
import { buildEntries } from './timeline.js';
import { prefersReducedMotion, webglAvailable } from './utils.js';

const entries = buildEntries(months, specialDays);
const ui = new UI({ site, months, entries });

if (webglAvailable()) boot();
else ui.fallback();

async function boot() {
  let experience;
  try {
    experience = new Experience({
      canvas: document.querySelector('.scene'),
      site,
      months,
      entries,
      reducedMotion: prefersReducedMotion(),
      on: {
        markers: (list) => ui.setMarkers(list),
        month: (i) => ui.setMonth(i),
        progress: (p) => ui.setProgress(p),
        theme: (t) => ui.setTheme(t),
        open: (item, info) => ui.openPanel(item, info),
        close: () => ui.closePanel(),
        firstMove: () => ui.hideHint(),
      },
    });
  } catch (error) {
    // The graphics card refused to start 3D (old device, or it's switched off): show the list.
    console.error(error);
    ui.fallback();
    return;
  }

  ui.on('start', () => {
    ui.hideIntro();
    experience.start();
  })
    .on('month', (i) => experience.goToMonth(i))
    .on('close', () => experience.close())
    .on('prev', () => experience.openSibling(-1))
    .on('next', () => experience.openSibling(1))
    .on('item', (i) => {
      ui.closeIndex();
      experience.goToItem(i);
    })
    .on('index-open', () => experience.setPaused(true))
    .on('index-close', () => experience.setPaused(false))
    .on('restart', () => experience.goToMonth(0));

  try {
    await experience.load((p) => ui.setLoad(p));
    ui.ready();
  } catch (error) {
    console.error(error);
    ui.fallback();
  }

  // Handy in the browser console while you work on it.
  window.timeline = experience;
}
