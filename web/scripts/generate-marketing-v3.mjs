import fs from "fs";
import path from "path";

// V3: Workflow diagrams, AI agents, feature maps with emojis & robots
const WIDTH = 1080;
const HEIGHT = 1350;

const outDir = path.resolve(process.cwd(), "public", "marketing", "v3");
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
};

// 20 premium cards: workflows, AI agents, feature maps
const CARDS = [
  // ========== WORKFLOW IMAGES (5) ==========
  {
    id: 1,
    category: "workflow",
    title: "Leave Request Flow",
    subtitle: "From request to approval in seconds",
    emoji: "🚀",
    steps: [
      { icon: "👤", label: "Employee submits" },
      { icon: "🤖", label: "AI validates rules" },
      { icon: "📋", label: "Manager reviews" },
      { icon: "✅", label: "Auto-approved" },
    ],
    theme: "purple",
  },
  {
    id: 2,
    category: "workflow",
    title: "Payroll Pipeline",
    subtitle: "Accurate payouts every time",
    emoji: "💰",
    steps: [
      { icon: "📊", label: "Attendance sync" },
      { icon: "🧮", label: "Calculate earnings" },
      { icon: "🔒", label: "Compliance check" },
      { icon: "💳", label: "Payout processed" },
    ],
    theme: "green",
  },
  {
    id: 3,
    category: "workflow",
    title: "Onboarding Journey",
    subtitle: "New hire → productive in days",
    emoji: "🎯",
    steps: [
      { icon: "📝", label: "Offer accepted" },
      { icon: "📁", label: "Docs uploaded" },
      { icon: "🤖", label: "AI setup assist" },
      { icon: "🎉", label: "Ready to work" },
    ],
    theme: "blue",
  },
  {
    id: 4,
    category: "workflow",
    title: "Audit Trail Flow",
    subtitle: "Every action logged automatically",
    emoji: "🔍",
    steps: [
      { icon: "⚡", label: "Action triggered" },
      { icon: "📝", label: "Event captured" },
      { icon: "🗄️", label: "Stored securely" },
      { icon: "📊", label: "Report ready" },
    ],
    theme: "amber",
  },
  {
    id: 5,
    category: "workflow",
    title: "Compliance Check",
    subtitle: "Stay compliant without effort",
    emoji: "🛡️",
    steps: [
      { icon: "📋", label: "Policy defined" },
      { icon: "🤖", label: "AI monitors" },
      { icon: "⚠️", label: "Flags issues" },
      { icon: "✅", label: "Auto-resolved" },
    ],
    theme: "purple",
  },

  // ========== AI AGENT IMAGES (5) ==========
  {
    id: 6,
    category: "ai-agent",
    title: "Meet Your AI HR Assistant",
    subtitle: "24/7 intelligent support",
    emoji: "🤖",
    features: [
      { icon: "💬", text: "Answers HR queries" },
      { icon: "📅", text: "Schedules meetings" },
      { icon: "📊", text: "Generates reports" },
      { icon: "🎯", text: "Suggests actions" },
    ],
    theme: "purple",
  },
  {
    id: 7,
    category: "ai-agent",
    title: "Leave Intelligence Agent",
    subtitle: "Smarter approvals, zero bias",
    emoji: "🧠",
    features: [
      { icon: "⚖️", text: "Fairness checks" },
      { icon: "📈", text: "Team coverage" },
      { icon: "🔄", text: "Auto-routing" },
      { icon: "💡", text: "Smart suggestions" },
    ],
    theme: "blue",
  },
  {
    id: 8,
    category: "ai-agent",
    title: "Payroll Guardian Bot",
    subtitle: "Catches errors before payout",
    emoji: "🛡️",
    features: [
      { icon: "🔍", text: "Anomaly detection" },
      { icon: "⚠️", text: "Duplicate alerts" },
      { icon: "✅", text: "Validation rules" },
      { icon: "📝", text: "Audit logging" },
    ],
    theme: "green",
  },
  {
    id: 9,
    category: "ai-agent",
    title: "Compliance Sentinel",
    subtitle: "Your policy enforcement AI",
    emoji: "👁️",
    features: [
      { icon: "📜", text: "Policy awareness" },
      { icon: "🚨", text: "Violation alerts" },
      { icon: "📋", text: "GDPR tracking" },
      { icon: "🔒", text: "Data protection" },
    ],
    theme: "amber",
  },
  {
    id: 10,
    category: "ai-agent",
    title: "Analytics Copilot",
    subtitle: "Insights that drive decisions",
    emoji: "📊",
    features: [
      { icon: "📈", text: "Trend analysis" },
      { icon: "🎯", text: "Predictions" },
      { icon: "💡", text: "Recommendations" },
      { icon: "📉", text: "Risk scoring" },
    ],
    theme: "purple",
  },

  // ========== FEATURE MAP IMAGES (5) ==========
  {
    id: 11,
    category: "feature-map",
    title: "All-in-One HR Platform",
    subtitle: "Everything you need, unified",
    emoji: "🎪",
    grid: [
      ["👥", "Team Mgmt"], ["📅", "Attendance"], ["🏖️", "Leave"], ["💰", "Payroll"],
      ["📁", "Documents"], ["🔒", "Security"], ["📊", "Analytics"], ["🤖", "AI Engine"],
    ],
    theme: "purple",
  },
  {
    id: 12,
    category: "feature-map",
    title: "Enterprise Security Stack",
    subtitle: "Bank-grade protection",
    emoji: "🔐",
    grid: [
      ["🛡️", "Audit Logs"], ["🔒", "Encryption"], ["👁️", "Monitoring"], ["🚨", "Alerts"],
      ["📋", "Compliance"], ["🔑", "Access Ctrl"], ["📜", "Policies"], ["✅", "Validation"],
    ],
    theme: "blue",
  },
  {
    id: 13,
    category: "feature-map",
    title: "AI-Powered Features",
    subtitle: "Intelligence everywhere",
    emoji: "🧠",
    grid: [
      ["🤖", "HR Agent"], ["📊", "Analytics"], ["💡", "Insights"], ["⚡", "Automation"],
      ["🎯", "Predictions"], ["📝", "Summaries"], ["🔍", "Detection"], ["💬", "Chat AI"],
    ],
    theme: "green",
  },
  {
    id: 14,
    category: "feature-map",
    title: "Payroll Ecosystem",
    subtitle: "Complete payroll automation",
    emoji: "💳",
    grid: [
      ["🧮", "Calculator"], ["📊", "Reports"], ["💰", "Payouts"], ["📋", "Compliance"],
      ["🔄", "Sync"], ["📁", "Records"], ["⚙️", "Rules"], ["✅", "Approvals"],
    ],
    theme: "amber",
  },
  {
    id: 15,
    category: "feature-map",
    title: "Employee Experience",
    subtitle: "Self-service excellence",
    emoji: "🌟",
    grid: [
      ["📱", "Mobile"], ["📅", "Calendar"], ["📝", "Requests"], ["💬", "Support"],
      ["📊", "Dashboard"], ["🎯", "Goals"], ["🏆", "Recognition"], ["📈", "Growth"],
    ],
    theme: "purple",
  },

  // ========== COMPARISON / DOMINATION IMAGES (5) ==========
  {
    id: 16,
    category: "comparison",
    title: "Why We Dominate",
    subtitle: "Features others don't have",
    emoji: "👑",
    comparisons: [
      { us: "🤖 Own AI Engine", them: "❌ Generic chatbots" },
      { us: "📋 Real audit trails", them: "❌ Basic logs" },
      { us: "⚡ Policy automation", them: "❌ Manual rules" },
      { us: "🔒 Enterprise security", them: "❌ Basic auth" },
    ],
    theme: "purple",
  },
  {
    id: 17,
    category: "comparison",
    title: "Built Different",
    subtitle: "Enterprise DNA from day one",
    emoji: "🚀",
    comparisons: [
      { us: "🎯 Constraint engine", them: "❌ Hard-coded rules" },
      { us: "📊 Usage analytics", them: "❌ No visibility" },
      { us: "🛡️ GDPR controls", them: "❌ Afterthought" },
      { us: "⚙️ Config, not code", them: "❌ Dev required" },
    ],
    theme: "blue",
  },
  {
    id: 18,
    category: "comparison",
    title: "The AI Advantage",
    subtitle: "Intelligence built-in",
    emoji: "🧠",
    comparisons: [
      { us: "💡 Smart suggestions", them: "❌ Manual guessing" },
      { us: "📈 Predictive analytics", them: "❌ Reactive only" },
      { us: "🤖 Automated decisions", them: "❌ Human bottleneck" },
      { us: "📝 Explainable AI", them: "❌ Black box" },
    ],
    theme: "green",
  },
  {
    id: 19,
    category: "stats",
    title: "By The Numbers",
    subtitle: "Performance that speaks",
    emoji: "📊",
    stats: [
      { value: "90%", label: "Faster approvals", icon: "⚡" },
      { value: "100%", label: "Audit coverage", icon: "📋" },
      { value: "24/7", label: "AI availability", icon: "🤖" },
      { value: "0", label: "Compliance gaps", icon: "🛡️" },
    ],
    theme: "amber",
  },
  {
    id: 20,
    category: "cta",
    title: "Ready to Transform?",
    subtitle: "Join the enterprise revolution",
    emoji: "🚀",
    ctas: [
      { icon: "📅", text: "Book a Demo" },
      { icon: "🎯", text: "See Features" },
      { icon: "💬", text: "Talk to Sales" },
      { icon: "🤖", text: "Try AI Assistant" },
    ],
    theme: "purple",
  },
];

function esc(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function themeColors(theme) {
  switch (theme) {
    case "green": return { a: BRAND.accent2, b: BRAND.cyan };
    case "amber": return { a: BRAND.amber, b: BRAND.rose };
    case "blue": return { a: BRAND.blue, b: BRAND.cyan };
    default: return { a: BRAND.accent, b: BRAND.blue };
  }
}

function workflowSVG(card, a, b) {
  const steps = card.steps;
  const startY = 520;
  const stepH = 140;
  
  return `
    <!-- Workflow diagram -->
    <g>
      <!-- Main emoji -->
      <text x="540" y="380" text-anchor="middle" font-size="120">${card.emoji}</text>
      
      <!-- Flow line -->
      <path d="M200 ${startY + 50} L880 ${startY + 50}" stroke="url(#chip)" stroke-width="6" stroke-dasharray="20 10" opacity="0.5"/>
      <path d="M200 ${startY + 50 + stepH} L880 ${startY + 50 + stepH}" stroke="url(#chip)" stroke-width="6" stroke-dasharray="20 10" opacity="0.5"/>
      <path d="M200 ${startY + 50 + stepH * 2} L880 ${startY + 50 + stepH * 2}" stroke="url(#chip)" stroke-width="6" stroke-dasharray="20 10" opacity="0.5"/>
      
      <!-- Steps -->
      ${steps.map((step, i) => {
        const y = startY + i * stepH;
        const isEven = i % 2 === 0;
        const x = isEven ? 180 : 560;
        return `
          <g>
            <rect x="${x}" y="${y}" width="340" height="110" rx="24" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)"/>
            <text x="${x + 60}" y="${y + 68}" font-size="48">${step.icon}</text>
            <text x="${x + 120}" y="${y + 58}" font-family="Inter, system-ui" font-size="24" font-weight="800" fill="${BRAND.text}">${esc(step.label)}</text>
            <text x="${x + 120}" y="${y + 88}" font-family="Inter, system-ui" font-size="16" font-weight="600" fill="${BRAND.muted}">Step ${i + 1}</text>
            ${i < steps.length - 1 ? `<text x="${isEven ? x + 360 : x - 30}" y="${y + 130}" font-size="32" fill="${a}">↓</text>` : ""}
          </g>
        `;
      }).join("")}
      
      <!-- Robot indicator -->
      <g transform="translate(860 340)">
        <rect x="0" y="0" width="120" height="50" rx="25" fill="url(#chip)"/>
        <text x="60" y="34" text-anchor="middle" font-family="Inter, system-ui" font-size="14" font-weight="900" fill="${BRAND.ink}">🤖 AI POWERED</text>
      </g>
    </g>
  `;
}

function aiAgentSVG(card, a, b) {
  return `
    <!-- AI Agent visual -->
    <g>
      <!-- Large robot emoji -->
      <g transform="translate(540 340)">
        <circle cx="0" cy="0" r="130" fill="rgba(255,255,255,0.08)" stroke="url(#chip)" stroke-width="4"/>
        <circle cx="0" cy="0" r="100" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
        <text x="0" y="35" text-anchor="middle" font-size="120">${card.emoji}</text>
      </g>
      
      <!-- Pulse rings -->
      <circle cx="540" cy="340" r="160" fill="none" stroke="${a}" stroke-width="2" opacity="0.4">
        <animate attributeName="r" values="130;200;130" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite"/>
      </circle>
      
      <!-- Feature cards -->
      ${card.features.map((f, i) => {
        const positions = [
          { x: 120, y: 540 }, { x: 560, y: 540 },
          { x: 120, y: 700 }, { x: 560, y: 700 }
        ];
        const pos = positions[i];
        return `
          <g>
            <rect x="${pos.x}" y="${pos.y}" width="400" height="120" rx="28" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.16)"/>
            <text x="${pos.x + 70}" y="${pos.y + 75}" font-size="52">${f.icon}</text>
            <text x="${pos.x + 140}" y="${pos.y + 68}" font-family="Inter, system-ui" font-size="26" font-weight="800" fill="${BRAND.text}">${esc(f.text)}</text>
            <rect x="${pos.x + 320}" y="${pos.y + 40}" width="60" height="40" rx="12" fill="${a}" opacity="0.3"/>
            <text x="${pos.x + 350}" y="${pos.y + 68}" text-anchor="middle" font-size="20">✨</text>
          </g>
        `;
      }).join("")}
      
      <!-- AI badge -->
      <g transform="translate(440 180)">
        <rect x="0" y="0" width="200" height="56" rx="28" fill="url(#chip)"/>
        <text x="100" y="38" text-anchor="middle" font-family="Inter, system-ui" font-size="18" font-weight="900" fill="${BRAND.ink}">🤖 AI AGENT</text>
      </g>
    </g>
  `;
}

function featureMapSVG(card, a, b) {
  const grid = card.grid;
  return `
    <!-- Feature map grid -->
    <g>
      <!-- Center emoji -->
      <g transform="translate(540 300)">
        <circle cx="0" cy="0" r="80" fill="url(#chip)" opacity="0.9"/>
        <text x="0" y="30" text-anchor="middle" font-size="80">${card.emoji}</text>
      </g>
      
      <!-- Feature grid 4x2 -->
      ${grid.map((item, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 100 + col * 230;
        const y = 480 + row * 220;
        return `
          <g>
            <rect x="${x}" y="${y}" width="200" height="180" rx="28" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.14)"/>
            <text x="${x + 100}" y="${y + 80}" text-anchor="middle" font-size="56">${item[0]}</text>
            <text x="${x + 100}" y="${y + 130}" text-anchor="middle" font-family="Inter, system-ui" font-size="18" font-weight="800" fill="${BRAND.text}">${esc(item[1])}</text>
            <rect x="${x + 60}" y="${y + 150}" width="80" height="8" rx="4" fill="${a}" opacity="0.6"/>
          </g>
        `;
      }).join("")}
      
      <!-- Connecting lines -->
      <g stroke="${a}" stroke-width="2" opacity="0.3">
        <line x1="540" y1="380" x2="200" y2="480"/>
        <line x1="540" y1="380" x2="430" y2="480"/>
        <line x1="540" y1="380" x2="660" y2="480"/>
        <line x1="540" y1="380" x2="890" y2="480"/>
      </g>
    </g>
  `;
}

function comparisonSVG(card, a, b) {
  return `
    <!-- Comparison table -->
    <g>
      <!-- Crown emoji -->
      <text x="540" y="350" text-anchor="middle" font-size="100">${card.emoji}</text>
      
      <!-- Headers -->
      <g transform="translate(120 420)">
        <rect x="0" y="0" width="400" height="60" rx="16" fill="${a}" opacity="0.9"/>
        <text x="200" y="40" text-anchor="middle" font-family="Inter, system-ui" font-size="22" font-weight="900" fill="${BRAND.ink}">🏆 CONTINIUUM</text>
      </g>
      <g transform="translate(560 420)">
        <rect x="0" y="0" width="400" height="60" rx="16" fill="rgba(255,255,255,0.1)"/>
        <text x="200" y="40" text-anchor="middle" font-family="Inter, system-ui" font-size="22" font-weight="900" fill="${BRAND.muted}">Others</text>
      </g>
      
      <!-- Comparison rows -->
      ${card.comparisons.map((c, i) => {
        const y = 510 + i * 100;
        return `
          <g>
            <rect x="120" y="${y}" width="400" height="80" rx="18" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.14)"/>
            <text x="140" y="${y + 50}" font-family="Inter, system-ui" font-size="22" font-weight="700" fill="${BRAND.text}">${esc(c.us)}</text>
            
            <rect x="560" y="${y}" width="400" height="80" rx="18" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)"/>
            <text x="580" y="${y + 50}" font-family="Inter, system-ui" font-size="22" font-weight="600" fill="${BRAND.muted}">${esc(c.them)}</text>
          </g>
        `;
      }).join("")}
      
      <!-- Robot mascot -->
      <text x="950" y="380" font-size="60">🤖</text>
    </g>
  `;
}

function statsSVG(card, a, b) {
  return `
    <!-- Stats display -->
    <g>
      <!-- Main emoji -->
      <text x="540" y="350" text-anchor="middle" font-size="100">${card.emoji}</text>
      
      <!-- Stats grid 2x2 -->
      ${card.stats.map((s, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 140 + col * 420;
        const y = 450 + row * 250;
        return `
          <g>
            <rect x="${x}" y="${y}" width="380" height="210" rx="32" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.16)"/>
            <text x="${x + 310}" y="${y + 60}" font-size="48">${s.icon}</text>
            <text x="${x + 40}" y="${y + 120}" font-family="Inter, system-ui" font-size="72" font-weight="900" fill="${a}">${esc(s.value)}</text>
            <text x="${x + 40}" y="${y + 170}" font-family="Inter, system-ui" font-size="24" font-weight="700" fill="${BRAND.text}">${esc(s.label)}</text>
          </g>
        `;
      }).join("")}
    </g>
  `;
}

function ctaSVG(card, a, b) {
  return `
    <!-- CTA display -->
    <g>
      <!-- Rocket emoji with glow -->
      <g transform="translate(540 320)">
        <circle cx="0" cy="0" r="120" fill="url(#chip)" opacity="0.2"/>
        <text x="0" y="45" text-anchor="middle" font-size="140">${card.emoji}</text>
      </g>
      
      <!-- CTA buttons -->
      ${card.ctas.map((c, i) => {
        const y = 520 + i * 110;
        return `
          <g>
            <rect x="200" y="${y}" width="680" height="90" rx="45" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)"/>
            <rect x="220" y="${y + 15}" width="60" height="60" rx="20" fill="${a}" opacity="0.9"/>
            <text x="250" y="${y + 58}" text-anchor="middle" font-size="32">${c.icon}</text>
            <text x="310" y="${y + 58}" font-family="Inter, system-ui" font-size="28" font-weight="800" fill="${BRAND.text}">${esc(c.text)}</text>
            <text x="820" y="${y + 55}" font-size="28" fill="${BRAND.muted}">→</text>
          </g>
        `;
      }).join("")}
      
      <!-- Decorative robots -->
      <text x="120" y="400" font-size="50">🤖</text>
      <text x="920" y="400" font-size="50">✨</text>
    </g>
  `;
}

function svgForCard(card) {
  const { a, b } = themeColors(card.theme);

  let contentSVG = "";
  switch (card.category) {
    case "workflow": contentSVG = workflowSVG(card, a, b); break;
    case "ai-agent": contentSVG = aiAgentSVG(card, a, b); break;
    case "feature-map": contentSVG = featureMapSVG(card, a, b); break;
    case "comparison": contentSVG = comparisonSVG(card, a, b); break;
    case "stats": contentSVG = statsSVG(card, a, b); break;
    case "cta": contentSVG = ctaSVG(card, a, b); break;
  }

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
    <radialGradient id="glow1" cx="20%" cy="15%" r="65%">
      <stop offset="0" stop-color="${a}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="${a}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="85%" cy="70%" r="60%">
      <stop offset="0" stop-color="${b}" stop-opacity="0.4"/>
      <stop offset="1" stop-color="${b}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="30"/>
    </filter>
    <filter id="noise" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .06 0"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" filter="url(#noise)" opacity="0.6"/>
  <circle cx="200" cy="200" r="600" fill="url(#glow1)" filter="url(#soft)"/>
  <circle cx="950" cy="900" r="650" fill="url(#glow2)" filter="url(#soft)"/>

  <!-- Header -->
  <g>
    <text x="540" y="120" text-anchor="middle" font-family="Inter, system-ui" font-size="58" font-weight="950" fill="${BRAND.text}">${esc(card.title)}</text>
    <text x="540" y="170" text-anchor="middle" font-family="Inter, system-ui" font-size="26" font-weight="700" fill="${BRAND.muted}">${esc(card.subtitle)}</text>
    
    <!-- Category badge -->
    <g transform="translate(420 190)">
      <rect x="0" y="0" width="240" height="44" rx="22" fill="url(#chip)" opacity="0.9"/>
      <text x="120" y="30" text-anchor="middle" font-family="Inter, system-ui" font-size="14" font-weight="900" fill="${BRAND.ink}" letter-spacing="1.5">${esc(card.category.toUpperCase().replace("-", " "))}</text>
    </g>
  </g>

  <!-- Main content -->
  ${contentSVG}

  <!-- Footer -->
  <g>
    <rect x="100" y="1180" width="880" height="100" rx="24" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"/>
    
    <text x="140" y="1235" font-family="Inter, system-ui" font-size="32" font-weight="950" fill="${BRAND.text}">${esc(BRAND.product)}</text>
    <text x="140" y="1265" font-family="Inter, system-ui" font-size="16" font-weight="700" fill="${BRAND.muted}">${esc(BRAND.tagline)}</text>
    
    <text x="700" y="1245" font-size="36">🤖</text>
    <text x="760" y="1245" font-size="36">⚡</text>
    <text x="820" y="1245" font-size="36">🛡️</text>
    <text x="880" y="1245" font-size="36">📊</text>
    <text x="940" y="1245" font-size="36">✨</text>
    
    <text x="960" y="1215" text-anchor="end" font-family="Inter, system-ui" font-size="16" font-weight="800" fill="rgba(236,242,255,0.5)">#${String(card.id).padStart(2, "0")}</text>
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
  manifest.push({ id: card.id, filename, title: card.title, category: card.category });
}

// Gallery
const galleryHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Marketing v3 - Workflows, AI Agents, Features</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: ui-sans-serif, system-ui; background: #060812; color: #eaf0ff; }
    header { padding: 24px 28px; border-bottom: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; background: rgba(6,8,18,0.9); backdrop-filter: blur(12px); }
    h1 { margin: 0; font-size: 20px; }
    p { margin: 8px 0 0; opacity: 0.75; font-size: 14px; }
    main { padding: 24px; }
    .section { margin-bottom: 32px; }
    .section h2 { font-size: 16px; margin: 0 0 16px; padding: 8px 14px; background: rgba(255,255,255,0.06); border-radius: 8px; display: inline-block; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
    .card { border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.05); border-radius: 16px; overflow: hidden; transition: transform 0.2s; }
    .card:hover { transform: scale(1.02); }
    .card img { width: 100%; height: auto; display: block; background: #0b1020; }
    .meta { padding: 12px 14px; }
    .meta b { display: block; font-size: 14px; }
    .meta span { display: block; font-size: 12px; opacity: 0.7; margin-top: 4px; }
    a { color: #a5b4fc; text-decoration: none; }
  </style>
</head>
<body>
  <header>
    <h1>🤖 Marketing v3: Workflows, AI Agents & Feature Maps</h1>
    <p>20 premium images with emojis, robots, and visual workflows. Location: <code>web/public/marketing/v3/</code></p>
  </header>
  <main>
    ${["workflow", "ai-agent", "feature-map", "comparison", "stats", "cta"].map(cat => {
      const items = manifest.filter(m => m.category === cat);
      if (items.length === 0) return "";
      const catName = { workflow: "🔄 Workflow Diagrams", "ai-agent": "🤖 AI Agents", "feature-map": "🎪 Feature Maps", comparison: "👑 Comparisons", stats: "📊 Stats", cta: "🚀 Call to Action" }[cat];
      return `
        <div class="section">
          <h2>${catName}</h2>
          <div class="grid">
            ${items.map(m => `
              <div class="card">
                <a href="./${m.filename}" target="_blank"><img src="./${m.filename}" alt="${esc(m.title)}" /></a>
                <div class="meta">
                  <b>#${String(m.id).padStart(2, "0")} ${esc(m.title)}</b>
                  <span><a href="./${m.filename}" target="_blank">Open full size</a></span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }).join("")}
  </main>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, "index.html"), galleryHtml, "utf8");
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

console.log(`✅ Generated ${CARDS.length} marketing images (v3) in: ${outDir}`);
console.log(`📁 Gallery: ${path.join(outDir, "index.html")}`);
console.log(`\nCategories:`);
console.log(`  🔄 Workflows: 5 images`);
console.log(`  🤖 AI Agents: 5 images`);
console.log(`  🎪 Feature Maps: 5 images`);
console.log(`  👑 Comparisons: 3 images`);
console.log(`  📊 Stats: 1 image`);
console.log(`  🚀 CTA: 1 image`);
