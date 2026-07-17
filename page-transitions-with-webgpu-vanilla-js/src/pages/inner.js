export const INNER_X_OFFSETS_VW = [0, -14, 10, -6, 16];

// Keyed by image index, aligned to the home-page captions:
// 0 Seealpsee · 1 K2 · 2 The North Face · 3 Mount Cook · 4 Mount Everest
const FACTS = [
  "Seealpsee lies at eleven hundred meters in the Appenzell Alps, a sliver of meltwater cupped beneath the limestone walls of the Säntis. For much of the day the cliffs keep it in shadow, and its surface settles into a still, glassy green.",
  "K2 rises to 8,611 meters on the Pakistan-China border, the second-highest point on Earth and by far the more dangerous to climb. It went unclimbed in winter until 2021, decades after every other eight-thousander had already fallen.",
  "A mountain's north face turns away from the sun, so its ice never fully lets go. The Eiger's is eighteen hundred meters of it, a wall so deadly that climbers renamed the Nordwand the Mordwand, the murder wall.",
  "Aoraki, or Mount Cook, is New Zealand's highest peak at 3,724 meters, though a 1991 rockfall sheared roughly ten meters off its summit overnight. Edmund Hillary trained on its slopes before he ever set eyes on Everest.",
  "Mount Everest grows roughly four millimeters taller each year as the Indian plate keeps pushing into Asia. Its summit was once seabed, and fossilized marine creatures are still found near the top.",
];

export function inner(image) {
  return function innerView() {
    const slots = [0, 1, 2, 3, 4]
      .map(
        (i) =>
          `<div class="slot" style="transform: translateX(${INNER_X_OFFSETS_VW[i] ?? 0}vw);"><figure></figure></div>`,
      )
      .join('');
    return `
      <section data-page="inner" data-image="${image}" class="page page-inner">
        <h1 class="page-title">Inner</h1>
        <p class="inner-fact">${FACTS[image]}</p>
        <div class="stack">${slots}</div>
      </section>
    `;
  };
}

export function getInnerTargets(rootEl) {
  const slots = rootEl.querySelectorAll('.stack .slot');
  const rects = [];
  for (let i = 0; i < slots.length; i++) {
    const r = slots[i].getBoundingClientRect();
    rects.push({ x: r.left, y: r.top, w: r.width, h: r.height });
  }
  return rects;
}
