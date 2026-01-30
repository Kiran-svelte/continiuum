import fs from "fs";
import path from "path";

// V2: Premium Instagram-ready creatives
const WIDTH = 1080;
const HEIGHT = 1350; // 4:5 IG feed works great (also fine on FB/LinkedIn)

const outDir = path.resolve(process.cwd(), "public", "marketing", "v2");
fs.mkdirSync(outDir, { recursive: true });

const BRAND = {
  product: "Continiuum",
  tagline: "Enterprise HR • Payroll • Compliance",
  accent: "#a855f7",
  accent2: "#22c55e",
  blue: "#3b82f6",
  cyan: "#22d3ee",
  amber: "#f59e0b",
  rose: "#fb7185",
  bg1: "#050611",
  bg2: "#0B1020",
  text: "#ECF2FF",
  muted: "#B7C3E6",
  ink: "#0A1020",
  glass: "rgba(255,255,255,0.08)",
  glass2: "rgba(255,255,255,0.06)",
  glassStroke: "rgba(255,255,255,0.16)",
};

/**
 * 20 images: bold headline + 2–3 bullets + badge.
 * Keep text short for first-impression marketing.
 */
const CARDS = [
  {
    id: 1,
    badge: "OWN AI ENGINE",
    title: "Your HR runs on your AI",
    subtitle: "Policy-aware. Audit-ready. Built for enterprise.",
    bullets: ["Leave decisions with constraints", "Explainable outputs for HR", "Action logs for every decision"],
    theme: "purple",
    template: "split",
    icon: "sparkle",
  },
  {
    id: 2,
    badge: "AUDIT",
    title: "Every action becomes proof",
    subtitle: "Security + compliance trails, automatically.",
    bullets: ["Immutable audit events", "Export-ready evidence", "Who/what/when visibility"],
    theme: "blue",
    template: "split",
    icon: "shield",
  },
  {
    id: 3,
    badge: "CONTROL",
    title: "Usage-based guardrails",
    subtitle: "Real limits backed by real usage.",
    bullets: ["Rate limiting + analytics", "Plan enforcement", "No surprise overages"],
    theme: "green",
    template: "split",
    icon: "chart",
  },
  {
    id: 4,
    badge: "ONBOARDING",
    title: "First impression: premium",
    subtitle: "Modern UI that clients trust instantly.",
    bullets: ["Fast onboarding flows", "Role-based dashboards", "Clean enterprise polish"],
    theme: "amber",
    template: "center",
    icon: "bolt",
  },
  {
    id: 5,
    badge: "PAYROLL",
    title: "Payroll consistency, guaranteed",
    subtitle: "Guardrails prevent costly mistakes.",
    bullets: ["Validations before payout", "Approval checkpoints", "Transparent change history"],
    theme: "blue",
    template: "split",
    icon: "lock",
  },
  {
    id: 6,
    badge: "LEAVE",
    title: "Smarter leave approvals",
    subtitle: "Fairness + constraints built-in.",
    bullets: ["Min-gap rules", "Working-day calculations", "Holiday-aware logic"],
    theme: "green",
    template: "split",
    icon: "sparkle",
  },
  {
    id: 7,
    badge: "SECURITY",
    title: "Enterprise security posture",
    subtitle: "Hardening you can explain.",
    bullets: ["Secure headers", "Least-privilege patterns", "Security event tracking"],
    theme: "blue",
    template: "split",
    icon: "shield",
  },
  {
    id: 8,
    badge: "GDPR",
    title: "Privacy controls built-in",
    subtitle: "Consent + data controls clients expect.",
    bullets: ["Consent capture UI", "Privacy settings", "Compliance status surfaces"],
    theme: "purple",
    template: "split",
    icon: "lock",
  },
  {
    id: 9,
    badge: "RELIABILITY",
    title: "Operational visibility",
    subtitle: "Health indicators reduce downtime.",
    bullets: ["Service health checks", "Status surfaces", "Fast incident response"],
    theme: "green",
    template: "split",
    icon: "pulse",
  },
  {
    id: 10,
    badge: "AUTOMATION",
    title: "Runs on schedule",
    subtitle: "Automations that don’t break.",
    bullets: ["Attendance reminders", "DB backup jobs", "Trial expiration nudges"],
    theme: "blue",
    template: "split",
    icon: "clock",
  },
  {
    id: 11,
    badge: "DIFFERENTIATOR",
    title: "Not found in the market",
    subtitle: "Enterprise + AI + auditability in one product.",
    bullets: ["Replace tool sprawl", "Built for trust", "Designed for scale"],
    theme: "purple",
    template: "center",
    icon: "crown",
  },
  {
    id: 12,
    badge: "VALUE",
    title: "One platform. Many wins.",
    subtitle: "HR + payroll + compliance + AI, unified.",
    bullets: ["Faster approvals", "Cleaner audits", "Happier teams"],
    theme: "amber",
    template: "center",
    icon: "sparkle",
  },
  {
    id: 13,
    badge: "ROLES",
    title: "Dashboards for every role",
    subtitle: "Admin • HR • Manager • Employee.",
    bullets: ["Less training", "Fewer errors", "Better adoption"],
    theme: "blue",
    template: "split",
    icon: "users",
  },
  {
    id: 14,
    badge: "PROOF",
    title: "Evidence over promises",
    subtitle: "Metrics, logs, and controls you can show.",
    bullets: ["Usage analytics", "Audit events", "Security baselines"],
    theme: "green",
    template: "split",
    icon: "chart",
  },
  {
    id: 15,
    badge: "AI + POLICIES",
    title: "AI that respects your rules",
    subtitle: "Your policies are first-class.",
    bullets: ["Constraint evaluation", "Predictable outcomes", "Explainable decisions"],
    theme: "purple",
    template: "split",
    icon: "sparkle",
  },
  {
    id: 16,
    badge: "TRUST",
    title: "Built for enterprise trust",
    subtitle: "Compliance, security, transparency.",
    bullets: ["Access controls", "Audit trails", "Clear governance"],
    theme: "blue",
    template: "split",
    icon: "shield",
  },
  {
    id: 17,
    badge: "SCALE",
    title: "Scale without chaos",
    subtitle: "Guardrails keep growth stable.",
    bullets: ["Rate limiting", "Health checks", "Operational visibility"],
    theme: "green",
    template: "split",
    icon: "pulse",
  },
  {
    id: 18,
    badge: "INSIGHTS",
    title: "Actionable AI insights",
    subtitle: "Less noise. More outcomes.",
    bullets: ["Impact analysis", "Suggested actions", "Explainable outputs"],
    theme: "amber",
    template: "split",
    icon: "sparkle",
  },
  {
    id: 19,
    badge: "MODERN STACK",
    title: "Fast. Clean. Deployable.",
    subtitle: "Modern stack + enterprise patterns.",
    bullets: ["Type-safe data", "Cloud-ready", "Production workflows"],
    theme: "blue",
    template: "split",
    icon: "bolt",
  },
  {
    id: 20,
    badge: "CALL TO ACTION",
    title: "Book a demo",
    subtitle: "See the AI engine + enterprise flows.",
    bullets: ["HR + Payroll", "AI engine", "Audit-ready compliance"],
    theme: "purple",
    template: "center",
    icon: "arrow",
  },
];

function esc(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function themeColors(theme) {
  switch (theme) {
    case "green":
      return { a: BRAND.accent2, b: BRAND.cyan };
    case "amber":
      return { a: BRAND.amber, b: BRAND.rose };
    case "blue":
      return { a: BRAND.blue, b: BRAND.cyan };
    case "purple":
    default:
      return { a: BRAND.accent, b: BRAND.blue };
  }
}

function iconPath(kind) {
  // simple inline icons (stroke-based) to boost visual quality without external assets
  switch (kind) {
    case "shield":
      return `<path d="M24 10l12 6v10c0 9-7 17-12 19C19 43 12 35 12 26V16l12-6z" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"/>
              <path d="M18 26l4 4 10-10" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "chart":
      return `<path d="M14 40V18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>
              <path d="M24 40V10" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>
              <path d="M34 40V24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>
              <path d="M10 40h32" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>`;
    case "bolt":
      return `<path d="M26 8L12 28h10l-4 16 18-24H26l4-12z" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"/>`;
    case "lock":
      return `<path d="M16 22v-6a8 8 0 0 1 16 0v6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>
              <rect x="14" y="22" width="20" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2.8"/>
              <path d="M24 30v4" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>`;
    case "pulse":
      return `<path d="M10 28h8l4-10 6 22 4-12h10" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 36h36" fill="none" stroke="currentColor" stroke-width="2.4" opacity="0.45" stroke-linecap="round"/>`;
    case "clock":
      return `<circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" stroke-width="2.8"/>
              <path d="M24 16v9l7 4" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "users":
      return `<path d="M16 30c-5 1-8 4-8 8" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>
              <path d="M32 30c5 1 8 4 8 8" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>
              <circle cx="18" cy="20" r="6" fill="none" stroke="currentColor" stroke-width="2.8"/>
              <circle cx="30" cy="20" r="6" fill="none" stroke="currentColor" stroke-width="2.8"/>`;
    case "crown":
      return `<path d="M12 30l6-10 6 6 6-8 6 12" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M14 30h20l-2 10H16l-2-10z" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"/>`;
    case "arrow":
      return `<path d="M12 24h24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>
              <path d="M28 16l8 8-8 8" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "sparkle":
    default:
      return `<path d="M24 10l2.6 8.4L35 21l-8.4 2.6L24 32l-2.6-8.4L13 21l8.4-2.6L24 10z" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"/>
              <path d="M40 30l1.6 5.2 5.4 1.8-5.4 1.8L40 44l-1.6-5.2-5.4-1.8 5.4-1.8L40 30z" fill="none" stroke="currentColor" stroke-width="2.4" opacity="0.75" stroke-linejoin="round"/>`;
  }
}

function deviceMock(a, b) {
  // a small dashboard preview (fake UI) to increase "wow" factor
  return `
    <g>
      <rect x="630" y="290" width="370" height="770" rx="42" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.16)"/>
      <rect x="650" y="310" width="330" height="730" rx="34" fill="rgba(10,16,32,0.55)" stroke="rgba(255,255,255,0.12)"/>

      <rect x="676" y="340" width="278" height="54" rx="18" fill="rgba(255,255,255,0.08)"/>
      <circle cx="704" cy="367" r="10" fill="${a}" opacity="0.9"/>
      <rect x="724" y="357" width="130" height="10" rx="5" fill="rgba(236,242,255,0.75)"/>
      <rect x="724" y="374" width="190" height="8" rx="4" fill="rgba(183,195,230,0.55)"/>

      <rect x="676" y="414" width="278" height="118" rx="22" fill="rgba(255,255,255,0.07)"/>
      <rect x="696" y="438" width="160" height="12" rx="6" fill="rgba(236,242,255,0.8)"/>
      <rect x="696" y="462" width="220" height="8" rx="4" fill="rgba(183,195,230,0.55)"/>
      <path d="M696 510 C 740 476, 780 500, 820 486 C 860 472, 900 442, 954 470" fill="none" stroke="url(#chip)" stroke-width="8" stroke-linecap="round"/>

      <rect x="676" y="552" width="278" height="220" rx="22" fill="rgba(255,255,255,0.06)"/>
      <rect x="696" y="575" width="200" height="12" rx="6" fill="rgba(236,242,255,0.78)"/>
      ${[0, 1, 2, 3].map((i) => {
        const y = 608 + i * 38;
        const w = [210, 240, 190, 230][i];
        const c = i % 2 === 0 ? a : b;
        return `
          <rect x="696" y="${y}" width="${w}" height="14" rx="7" fill="rgba(255,255,255,0.08)"/>
          <rect x="696" y="${y}" width="${Math.max(80, w - 60)}" height="14" rx="7" fill="${c}" opacity="0.55"/>`;
      }).join("\n")}

      <rect x="676" y="792" width="278" height="220" rx="22" fill="rgba(255,255,255,0.06)"/>
      <rect x="696" y="815" width="150" height="12" rx="6" fill="rgba(236,242,255,0.78)"/>
      <rect x="696" y="846" width="120" height="120" rx="26" fill="rgba(255,255,255,0.07)"/>
      <rect x="826" y="846" width="128" height="46" rx="18" fill="url(#chip)" opacity="0.9"/>
      <rect x="826" y="906" width="128" height="60" rx="20" fill="rgba(255,255,255,0.07)"/>
    </g>
  `;
}

function svgForCard(card) {
  const { a, b } = themeColors(card.theme);
  const bullets = card.bullets.slice(0, 3);
  const icon = iconPath(card.icon);

  const titleY = card.template === "center" ? 530 : 500;
  const subY = titleY + 72;
  const bulletsY = subY + 86;
  const contentLeft = 120;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND.bg1}"/>
      <stop offset="1" stop-color="${BRAND.bg2}"/>
    </linearGradient>
    <linearGradient id="chip" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${a}"/>
      <stop offset="1" stop-color="${b}"/>
    </linearGradient>
    <radialGradient id="glow1" cx="20%" cy="10%" r="70%">
      <stop offset="0" stop-color="${a}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${a}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="90%" cy="60%" r="70%">
      <stop offset="0" stop-color="${b}" stop-opacity="0.45"/>
      <stop offset="1" stop-color="${b}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="26"/>
    </filter>
    <filter id="shadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="26" stdDeviation="22" flood-color="#000" flood-opacity="0.55"/>
    </filter>
    <filter id="noise" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .055 0"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" filter="url(#noise)" opacity="0.55"/>
  <circle cx="240" cy="200" r="620" fill="url(#glow1)" filter="url(#soft)"/>
  <circle cx="950" cy="860" r="690" fill="url(#glow2)" filter="url(#soft)"/>

  <!-- Main glass container -->
  <g filter="url(#shadow)">
    <rect x="70" y="120" width="940" height="1110" rx="48" fill="${BRAND.glass}" stroke="${BRAND.glassStroke}"/>
    <rect x="88" y="138" width="904" height="1074" rx="44" fill="${BRAND.glass2}" stroke="rgba(255,255,255,0.10)"/>
  </g>

  <!-- Badge chip + icon -->
  <g>
    <rect x="${contentLeft}" y="180" width="520" height="74" rx="37" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.14)"/>
    <rect x="${contentLeft + 10}" y="190" width="250" height="54" rx="27" fill="url(#chip)" opacity="0.95"/>
    <text x="${contentLeft + 135}" y="224" text-anchor="middle" font-family="Inter, ui-sans-serif, system-ui" font-size="20" font-weight="900" fill="${BRAND.ink}" letter-spacing="2">${esc(card.badge)}</text>
    <g transform="translate(${contentLeft + 410} 190)">
      <rect x="0" y="0" width="54" height="54" rx="18" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.18)"/>
      <g transform="translate(7 7)" style="color: ${a}">
        ${icon}
      </g>
    </g>
  </g>

  <!-- Headline -->
  <text x="${contentLeft}" y="${titleY}" font-family="Inter, ui-sans-serif, system-ui" font-size="78" font-weight="950" fill="${BRAND.text}" letter-spacing="-0.8">${esc(card.title)}</text>
  <text x="${contentLeft}" y="${subY}" font-family="Inter, ui-sans-serif, system-ui" font-size="30" font-weight="700" fill="${BRAND.muted}">${esc(card.subtitle)}</text>

  <!-- Bullet list -->
  <g font-family="Inter, ui-sans-serif, system-ui" font-size="30" font-weight="750" fill="${BRAND.text}">
    ${bullets
      .map((t, idx) => {
        const y = bulletsY + idx * 66;
        return `
      <circle cx="${contentLeft + 12}" cy="${y - 12}" r="7" fill="${a}"/>
      <text x="${contentLeft + 34}" y="${y}">${esc(t)}</text>`;
      })
      .join("\n")}
  </g>

  <!-- Visual: device mock (for split layout) -->
  ${card.template === "split" ? deviceMock(a, b) : ""}

  <!-- Center layout extra visual -->
  ${
    card.template === "center"
      ? `
  <g opacity="0.95">
    <path d="M140 850 C 280 780, 430 790, 560 860 C 690 930, 790 1000, 950 970" fill="none" stroke="url(#chip)" stroke-width="12" stroke-linecap="round"/>
    <path d="M140 910 C 320 980, 500 1005, 660 970 C 820 935, 880 880, 980 850" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="4" stroke-linecap="round"/>
    <g transform="translate(120 940)">
      <rect x="0" y="0" width="420" height="190" rx="30" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.14)"/>
      <rect x="22" y="26" width="220" height="14" rx="7" fill="rgba(236,242,255,0.80)"/>
      <rect x="22" y="54" width="320" height="10" rx="5" fill="rgba(183,195,230,0.52)"/>
      <rect x="22" y="88" width="376" height="74" rx="22" fill="rgba(255,255,255,0.06)"/>
      <rect x="42" y="112" width="180" height="10" rx="5" fill="rgba(236,242,255,0.75)"/>
      <rect x="42" y="134" width="250" height="8" rx="4" fill="rgba(183,195,230,0.55)"/>
      <rect x="300" y="104" width="98" height="42" rx="18" fill="url(#chip)" opacity="0.9"/>
    </g>
  </g>`
      : ""
  }

  <!-- Footer brand -->
  <g>
    <text x="120" y="1200" font-family="Inter, ui-sans-serif, system-ui" font-size="30" font-weight="950" fill="${BRAND.text}">${esc(BRAND.product)}</text>
    <text x="120" y="1238" font-family="Inter, ui-sans-serif, system-ui" font-size="20" font-weight="750" fill="${BRAND.muted}">${esc(BRAND.tagline)}</text>

    <rect x="740" y="1186" width="250" height="58" rx="29" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.14)"/>
    <text x="865" y="1224" text-anchor="middle" font-family="Inter, ui-sans-serif, system-ui" font-size="20" font-weight="900" fill="rgba(236,242,255,0.85)">First impression wins</text>

    <text x="990" y="172" text-anchor="end" font-family="Inter, ui-sans-serif, system-ui" font-size="18" font-weight="900" fill="rgba(236,242,255,0.55)">#${String(card.id).padStart(2, "0")}</text>
  </g>
</svg>`;
}

function filenameFor(card) {
  const safeTitle = card.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
  return `${String(card.id).padStart(2, "0")}-${safeTitle}.svg`;
}

const manifest = [];

for (const card of CARDS) {
  const svg = svgForCard(card);
  const filename = filenameFor(card);
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, svg, "utf8");
  manifest.push({ id: card.id, filename, title: card.title, badge: card.badge });
}

// Gallery index
const galleryHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Marketing Images (v2)</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; background: #060812; color: #eaf0ff; }
    header { padding: 24px 28px; border-bottom: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; background: rgba(6,8,18,0.85); backdrop-filter: blur(10px); }
    h1 { margin: 0; font-size: 18px; letter-spacing: 0.2px; }
    p { margin: 8px 0 0; opacity: 0.75; font-size: 13px; }
    main { padding: 22px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .card { border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.06); border-radius: 14px; overflow: hidden; }
    .card img { width: 100%; height: auto; display: block; background: #0b1020; }
    .meta { padding: 10px 12px 12px; }
    .meta b { display: block; font-size: 13px; }
    .meta span { display: block; font-size: 12px; opacity: 0.75; margin-top: 4px; }
    a { color: #a5b4fc; text-decoration: none; }
  </style>
</head>
<body>
  <header>
    <h1>20 Premium Marketing Images (v2) – Generated</h1>
    <p>Location: <code>web/public/marketing/v2/</code>. These are 1080×1350 (IG 4:5). PNG exports can live in <code>web/public/marketing/v2/png/</code>.</p>
  </header>
  <main>
    <div class="grid">
      ${manifest
        .sort((a, b) => a.id - b.id)
        .map(
          (m) => `
        <div class="card">
          <a href="./${m.filename}" target="_blank" rel="noreferrer">
            <img src="./${m.filename}" alt="${esc(m.title)}" />
          </a>
          <div class="meta">
            <b>#${String(m.id).padStart(2, "0")} — ${esc(m.title)}</b>
            <span>${esc(m.badge)} • <a href="./${m.filename}" target="_blank" rel="noreferrer">open</a></span>
          </div>
        </div>`
        )
        .join("\n")}
    </div>
  </main>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, "index.html"), galleryHtml, "utf8");
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

console.log(`Generated ${CARDS.length} marketing SVGs (v2) in: ${outDir}`);
console.log(`Gallery: ${path.join(outDir, "index.html")}`);
