import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(root, "stack.json"), "utf8"));
const [daily, built] = config.tiers;

const links = [
  { slug: "gmail", file: "email", color: "#e06c75" },
  { slug: "linkedin", file: "linkedin", color: "#61afef" },
  { slug: "github", file: "github", color: "#abb2bf" },
  { slug: "chessdotcom", file: "chess-dot-com", color: "#98c379" },
  { slug: "lichess", file: "lichess", color: "#abb2bf" },
];

const builtInPaths = new Map([
  ["aws", "M7.2 18.5h10.9a4.4 4.4 0 0 0 .7-8.74 6.3 6.3 0 0 0-11.92-1.8A5.3 5.3 0 0 0 7.2 18.5Zm1.05 2.1c3.8 2.2 8.75 2.2 12.3 0 .58-.35.08-1.2-.53-.9-3.57 1.65-7.55 1.55-11.2-.08-.65-.3-1.16.62-.57.98Z"],
  ["linkedin", "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"],
]);

const allItems = config.tiers.flatMap((tier) => tier.items);
const requestedSlugs = [...new Set([...allItems.map((item) => item.slug), ...links.map((item) => item.slug)])];
const iconEntries = await Promise.all(
  requestedSlugs.map(async (slug) => {
    if (builtInPaths.has(slug)) return [slug, builtInPaths.get(slug)];
    const sourceSlug = slug === "reactnative" ? "react" : slug;
    const response = await fetch(`https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/${sourceSlug}.svg`);
    if (!response.ok) throw new Error(`Unable to fetch icon: ${slug}`);
    const source = await response.text();
    const pathMatch = source.match(/<path[^>]*d="([^"]+)"/);
    if (!pathMatch) throw new Error(`No SVG path found for: ${slug}`);
    return [slug, pathMatch[1]];
  }),
);
const iconPaths = new Map(iconEntries);

const escapeXml = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const C = {
  bg: "#16191d",
  panel: "#1e2227",
  selected: "#2c313a",
  border: "#3e4452",
  muted: "#667187",
  text: "#abb2bf",
  white: "#d7dae0",
  blue: "#61afef",
  cyan: "#56b6c2",
  green: "#98c379",
  amber: "#e5c07b",
  orange: "#d19a66",
  coral: "#e06c75",
  purple: "#c678dd",
};

function filters() {
  return allItems.map((item) => `
    <filter id="glow-${item.slug}" x="-120%" y="-120%" width="340%" height="340%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
      <feFlood flood-color="${item.color}" flood-opacity=".45" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="halo"/>
      <feMerge><feMergeNode in="halo"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`).join("");
}

function panel(x, y, width, height, label, active = false) {
  const border = active ? C.blue : C.border;
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="5" fill="${C.bg}" stroke="${border}"/>
    <rect x="${x + 14}" y="${y - 7}" width="${Math.max(72, label.length * 8 + 18)}" height="15" fill="${C.bg}"/>
    <text class="mono pane-label" x="${x + 23}" y="${y + 3}" fill="${border}">${escapeXml(label)}</text>`;
}

function icon(item, x, y, size, tier, labelY) {
  const scale = size / 24;
  const marker = tier === "daily"
      ? `<text class="mono state" x="${x - size / 2 - 12}" y="${y + 4}" fill="${C.green}">●</text>`
      : "";
  return `<g class="tech tech-${item.slug} ${tier}">
    <title>${escapeXml(item.label)} — ${tier === "daily" ? "daily driver" : "built with"}</title>
    ${marker}
    <g class="mark" transform="translate(${x - size / 2} ${y - size / 2}) scale(${scale})">
      <path class="icon-muted" d="${iconPaths.get(item.slug)}" fill="${C.text}"/>
      <path class="icon-color" d="${iconPaths.get(item.slug)}" fill="${item.color}"/>
      <g class="icon-glow" filter="url(#glow-${item.slug})"><path d="${iconPaths.get(item.slug)}" fill="${item.color}"/></g>
    </g>
    <text class="mono tech-label" x="${x}" y="${labelY}" text-anchor="middle">${escapeXml(item.label)}</text>
  </g>`;
}

const blockGlyphs = {
  S: ["████", "█   ", "████", "   █", "████"],
  A: [" ██ ", "█  █", "████", "█  █", "█  █"],
  K: ["█  █", "█ █ ", "██  ", "█ █ ", "█  █"],
  H: ["█  █", "█  █", "████", "█  █", "█  █"],
  M: ["█   █", "██ ██", "█ █ █", "█   █", "█   █"],
};
const ascii = Array.from({ length: 5 }, (_, row) =>
  [..."SAKSHAM"].map((letter) => blockGlyphs[letter][row]).join("  "),
);

function defs(mobile) {
  return `<defs>
    ${filters()}
    <style>
      .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.pane-label{font-size:${mobile ? 11 : 10}px;letter-spacing:1px}.small{font-size:${mobile ? 12 : 11}px}.body{font-size:${mobile ? 15 : 13}px}.key{font-size:${mobile ? 13 : 12}px}.tech-label{fill:${C.text};font-size:${mobile ? 10 : 9}px;font-weight:600}.state{font-size:10px}.icon-muted{opacity:.42;animation:mute-out 1.6s ease 1s forwards}.icon-color{opacity:0;animation:color-in 1.6s ease 1s forwards}.icon-glow{opacity:0;animation:glow-in 1.6s ease 1s forwards}.cursor{animation:blink 1.05s steps(1) infinite}.online{animation:pulse 2.4s ease-in-out infinite}@keyframes mute-out{from{opacity:.42}to{opacity:0}}@keyframes color-in{from{opacity:0}to{opacity:.88}}@keyframes glow-in{0%,35%,100%{opacity:0}72%{opacity:.24}}@keyframes blink{0%,48%{opacity:1}49%,100%{opacity:0}}@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}@media(prefers-reduced-motion:reduce){.cursor,.online{animation:none;opacity:1}.icon-muted,.icon-glow{animation:none;opacity:0}.icon-color{animation:none;opacity:.82}}
    </style>
  </defs>`;
}

function titleBar(width) {
  return `<rect x="1" y="1" width="${width - 2}" height="43" rx="7" fill="${C.panel}"/>
    <circle cx="21" cy="22" r="5" fill="${C.coral}"/><circle cx="39" cy="22" r="5" fill="${C.amber}"/><circle cx="57" cy="22" r="5" fill="${C.green}"/>
    <text class="mono small" x="${width / 2}" y="27" text-anchor="middle" fill="${C.text}">iamsakshambhatia@github: ~/profile</text>
    <circle class="online" cx="${width - 83}" cy="22" r="4" fill="${C.green}"/><text class="mono" x="${width - 70}" y="26" fill="${C.green}" font-size="10">online</text>`;
}

function tabs(width, activeWidth) {
  return `<rect x="1" y="44" width="${width - 2}" height="37" fill="${C.bg}" stroke="${C.border}" stroke-width="0 0 1 0"/>
    <rect x="18" y="51" width="${activeWidth}" height="24" rx="3" fill="${C.selected}"/>
    <text class="mono key" x="31" y="68" fill="${C.blue}">1:about</text>
    <text class="mono key" x="${activeWidth + 43}" y="68" fill="${C.muted}">2:stack</text>
    <text class="mono key" x="${activeWidth + 133}" y="68" fill="${C.muted}">3:chess</text>
    <text class="mono small" x="${width - 22}" y="68" text-anchor="end" fill="${C.muted}">tab / shift+tab</text>`;
}

function desktopSvg() {
  const dailyIcons = daily.items.map((item, index) => icon(item, 225 + index * 132, 493, 32, "daily", 528)).join("");
  const builtIcons = built.items.map((item, index) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const itemsInRow = Math.min(9, built.items.length - row * 9);
    const startX = itemsInRow === 9 ? 205 : 605 - ((itemsInRow - 1) * 100) / 2;
    return icon(item, startX + col * 100, 583 + row * 68, 24, "built", 613 + row * 68);
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="900" viewBox="0 0 1100 900" role="img" aria-labelledby="title description">
  <title id="title">Saksham Bhatia — terminal profile</title>
  <desc id="description">A One Dark Pro Night Flat terminal interface introducing Saksham, his technology experience, and chess profiles.</desc>
  ${defs(false)}
  <rect x="1" y="1" width="1098" height="898" rx="8" fill="${C.bg}" stroke="${C.border}" stroke-width="2"/>
  ${titleBar(1100)}${tabs(1100, 91)}

  ${panel(22, 101, 657, 292, "about", true)}
  <g class="mono" fill="${C.white}" font-size="21" font-weight="700">
    ${ascii.map((line, index) => `<text x="48" y="${151 + index * 27}" xml:space="preserve">${line}</text>`).join("")}
  </g>
  <text class="mono" x="51" y="308" fill="${C.amber}" font-size="13" letter-spacing="5">B H A T I A</text>
  <text class="mono" x="49" y="344" fill="${C.blue}" font-size="15">full-stack engineer</text>
  <text class="mono body" x="49" y="373" fill="${C.text}">shipping web and mobile products end to end</text>

  ${panel(696, 101, 382, 292, "profile.toml")}
  <g class="mono body">
    <text x="721" y="145"><tspan fill="${C.purple}">name</tspan><tspan fill="${C.muted}"> = </tspan><tspan fill="${C.green}">"Saksham Bhatia"</tspan></text>
    <text x="721" y="180"><tspan fill="${C.purple}">role</tspan><tspan fill="${C.muted}"> = </tspan><tspan fill="${C.green}">"Full-stack engineer"</tspan></text>
    <text x="721" y="215"><tspan fill="${C.purple}">based</tspan><tspan fill="${C.muted}"> = </tspan><tspan fill="${C.green}">"Noida, India"</tspan></text>
    <text x="721" y="250"><tspan fill="${C.purple}">builds</tspan><tspan fill="${C.muted}"> = [</tspan><tspan fill="${C.amber}">"web", "mobile"</tspan><tspan fill="${C.muted}">]</tspan></text>
    <text x="721" y="285"><tspan fill="${C.purple}">timezone</tspan><tspan fill="${C.muted}"> = </tspan><tspan fill="${C.green}">"UTC+05:30"</tspan></text>
    <text x="721" y="320"><tspan fill="${C.purple}">mode</tspan><tspan fill="${C.muted}"> = </tspan><tspan fill="${C.green}">"building"</tspan></text>
  </g>

  ${panel(22, 414, 1056, 370, "toolchain")}
  <text class="mono small" x="47" y="469" fill="${C.green}">● ${escapeXml(daily.label.toLowerCase())}</text><text class="mono small" x="47" y="492" fill="${C.muted}">${escapeXml(daily.note)}</text>
  ${dailyIcons}
  <line x1="47" y1="545" x2="1053" y2="545" stroke="${C.border}"/>
  <text class="mono small" x="47" y="588" fill="${C.cyan}">• ${escapeXml(built.label.toLowerCase())}</text><text class="mono small" x="47" y="611" fill="${C.muted}">${escapeXml(built.note)}</text>
  ${builtIcons}

  ${panel(22, 805, 1056, 51, "/dev/chess")}
  <text class="mono body" x="48" y="838" fill="${C.purple}">♞</text><text class="mono body" x="72" y="838" fill="${C.text}">find a plan, improve the position, then hang a piece anyway</text>
  <text class="mono small" x="1050" y="838" text-anchor="end" fill="${C.muted}">chess.com + lichess</text>

  <rect x="1" y="873" width="1098" height="26" rx="0 0 7 7" fill="${C.panel}"/>
  <text class="mono" x="18" y="891" fill="${C.green}" font-size="10">NORMAL</text>
  <text class="mono" x="84" y="891" fill="${C.text}" font-size="10">branch: main</text>
  <text class="mono" x="190" y="891" fill="${C.text}" font-size="10">building · collaboration</text>
  <text class="mono" x="1080" y="891" text-anchor="end" fill="${C.muted}" font-size="10">one-dark-pro-night-flat · UTF-8</text>
  <rect class="cursor" x="345" y="881" width="7" height="12" fill="${C.blue}"/>
</svg>`;
}

function mobileSvg() {
  const dailyIcons = daily.items.map((item, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    return icon(item, 122 + col * 211, 708 + row * 76, 32, "daily", 745 + row * 76);
  }).join("");
  const builtIcons = built.items.map((item, index) => {
    const row = Math.floor(index / 5);
    const col = index % 5;
    const itemsInRow = Math.min(5, built.items.length - row * 5);
    const startX = 360 - ((itemsInRow - 1) * 132) / 2;
    return icon(item, startX + col * 132, 910 + row * 60, 24, "built", 938 + row * 60);
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1350" viewBox="0 0 720 1350" role="img" aria-labelledby="title description">
  <title id="title">Saksham Bhatia — terminal profile</title>
  <desc id="description">A responsive One Dark Pro Night Flat terminal interface introducing Saksham, his technology experience, and chess profiles.</desc>
  ${defs(true)}
  <rect x="1" y="1" width="718" height="1348" rx="8" fill="${C.bg}" stroke="${C.border}" stroke-width="2"/>
  ${titleBar(720)}${tabs(720, 91)}

  ${panel(18, 101, 684, 310, "about", true)}
  <g class="mono" fill="${C.white}" font-size="17" font-weight="700">
    ${ascii.map((line, index) => `<text x="39" y="${147 + index * 25}" xml:space="preserve">${line}</text>`).join("")}
  </g>
  <text class="mono" x="42" y="294" fill="${C.amber}" font-size="13" letter-spacing="5">B H A T I A</text>
  <text class="mono" x="40" y="337" fill="${C.blue}" font-size="18">full-stack engineer</text>
  <text class="mono body" x="40" y="374" fill="${C.text}">shipping web and mobile products end to end</text>

  ${panel(18, 431, 684, 180, "profile.toml")}
  <g class="mono body">
    <text x="42" y="478"><tspan fill="${C.purple}">name</tspan><tspan fill="${C.muted}"> = </tspan><tspan fill="${C.green}">"Saksham Bhatia"</tspan></text>
    <text x="370" y="478"><tspan fill="${C.purple}">role</tspan><tspan fill="${C.muted}"> = </tspan><tspan fill="${C.green}">"Full-stack engineer"</tspan></text>
    <text x="42" y="520"><tspan fill="${C.purple}">based</tspan><tspan fill="${C.muted}"> = </tspan><tspan fill="${C.green}">"Noida, India"</tspan></text>
    <text x="370" y="520"><tspan fill="${C.purple}">builds</tspan><tspan fill="${C.muted}"> = [</tspan><tspan fill="${C.amber}">"web", "mobile"</tspan><tspan fill="${C.muted}">]</tspan></text>
    <text x="42" y="562"><tspan fill="${C.purple}">timezone</tspan><tspan fill="${C.muted}"> = </tspan><tspan fill="${C.green}">"UTC+05:30"</tspan></text>
    <text x="370" y="562"><tspan fill="${C.purple}">mode</tspan><tspan fill="${C.muted}"> = </tspan><tspan fill="${C.green}">"building"</tspan></text>
  </g>

  ${panel(18, 631, 684, 570, "toolchain")}
  <text class="mono small" x="40" y="671" fill="${C.green}">● ${escapeXml(daily.label)} / ${escapeXml(daily.note)}</text>
  ${dailyIcons}
  <line x1="40" y1="843" x2="680" y2="843" stroke="${C.border}"/>
  <text class="mono small" x="40" y="878" fill="${C.cyan}">• ${escapeXml(built.label)} / ${escapeXml(built.note)}</text>
  ${builtIcons}

  ${panel(18, 1221, 684, 70, "/dev/chess")}
  <text class="mono body" x="42" y="1263" fill="${C.purple}">♞</text><text class="mono body" x="70" y="1263" fill="${C.text}">find a plan, improve the position, then hang a piece anyway</text>

  <rect x="1" y="1309" width="718" height="40" rx="0 0 7 7" fill="${C.panel}"/>
  <text class="mono" x="18" y="1334" fill="${C.green}" font-size="11">NORMAL</text>
  <text class="mono" x="92" y="1334" fill="${C.text}" font-size="11">building</text>
  <text class="mono" x="702" y="1334" text-anchor="end" fill="${C.muted}" font-size="11">UTF-8</text>
  <rect class="cursor" x="151" y="1322" width="7" height="14" fill="${C.blue}"/>
</svg>`;
}

function contactIconSvg({ slug, file, color }) {
  const iconPath = iconPaths.get(slug);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-label="${file}">
  <defs>
    <filter id="contact-glow" x="-120%" y="-120%" width="340%" height="340%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
      <feFlood flood-color="${color}" flood-opacity=".45" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="halo"/>
      <feMerge><feMergeNode in="halo"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <style>
      .muted{opacity:.42;animation:mute-out 1.6s ease 1s forwards}.color{opacity:0;animation:color-in 1.6s ease 1s forwards}.glow{opacity:0;animation:glow-in 1.6s ease 1s forwards}@keyframes mute-out{from{opacity:.42}to{opacity:0}}@keyframes color-in{from{opacity:0}to{opacity:.88}}@keyframes glow-in{0%,35%,100%{opacity:0}72%{opacity:.24}}@media(prefers-reduced-motion:reduce){.muted,.glow{animation:none;opacity:0}.color{animation:none;opacity:.82}}
    </style>
  </defs>
  <path class="muted" fill="${C.text}" d="${iconPath}"/>
  <path class="color" fill="${color}" d="${iconPath}"/>
  <g class="glow" filter="url(#contact-glow)"><path fill="${color}" d="${iconPath}"/></g>
</svg>`;
}

await mkdir(path.join(root, "assets", "icons"), { recursive: true });
await Promise.all(links.map((link) => writeFile(
  path.join(root, "assets", "icons", `${link.file}.svg`),
  contactIconSvg(link),
)));
await writeFile(path.join(root, "assets", "profile-tui.svg"), desktopSvg());
await writeFile(path.join(root, "assets", "profile-tui-mobile.svg"), mobileSvg());
console.log("Generated profile TUI assets and local contact icons.");
