import "./style.css";

const appUrl = import.meta.env.VITE_ZOOK_APP_URL ?? "https://app.zook.kyokasuigetsu.xyz";
const appHref = (path: string) => `${appUrl}${path}`;
const asset = (name: string) => `/assets/zook-redesign/${name}`;

const painCards = [
  ["Attendance gets messy.", "QR entry, desk approval, and entry codes stay in one auditable flow."],
  ["Payments are hard to verify.", "Direct UPI, cash, manual records, and hosted checkout all keep a trail."],
  ["Trainers lose plan context.", "Client goals, PT packs, progress, notes, and drafts sit together."],
  ["Owners lack a live command view.", "The control room shows today’s pressure without another spreadsheet."],
];

const roles = [
  ["Member", "Scan QR, open today’s plan, track activity, shop, and manage membership."],
  ["Receptionist", "Approve flagged scans, verify ZK entry codes, and record desk payments."],
  ["Trainer", "Review clients, create plans, generate AI drafts, and approve before assigning."],
  ["Owner", "Run approvals, revenue, stock, staff, reports, and public join flows."],
];

const proofSections = [
  {
    eyebrow: "Web Control Room",
    title: "The owner gets a command board, not another spreadsheet.",
    body: "Active members, today’s scans, revenue, join requests, stock, AI usage, and staff actions sit in one calm operating surface.",
    image: "02-owner-web-dashboard.png",
    alt: "Zook owner web dashboard command board",
  },
  {
    eyebrow: "Mobile Execution App",
    title: "Every role gets the surface they actually use on the floor.",
    body: "Members check in and follow plans. Reception handles approvals. Trainers keep client context and draft workflows close.",
    image: "03-member-mobile-home.png",
    alt: "Zook member mobile home with membership card",
  },
  {
    eyebrow: "Reception Desk",
    title: "QR attendance feels simple at the desk, but stays server-authoritative.",
    body: "Reception sees pending approvals, flagged scans, entry-code verification, and recent check-ins without guessing from screenshots.",
    image: "04-receptionist-desk-queue.png",
    alt: "Zook receptionist desk approval queue",
  },
  {
    eyebrow: "Trainer + AI",
    title: "AI assists trainers. Trainers stay in control.",
    body: "Drafts are reviewed, edited, and approved before assignment. The system supports professionals instead of bypassing them.",
    image: "06-trainer-ai-draft-review.png",
    alt: "Zook trainer AI draft review workflow",
  },
  {
    eyebrow: "Attendance + Payments",
    title: "Built around how Indian gyms actually collect money.",
    body: "Direct UPI, cash, bank transfer, manual audit notes, hosted checkout, and QR entry all connect back to membership state.",
    image: "07-attendance-payments-showcase.png",
    alt: "Zook attendance and payment operations showcase",
  },
  {
    eyebrow: "Public Joining",
    title: "Turn your gym profile into a joinable page.",
    body: "Plans, referral codes, public profile, checkout handoff, and backend confirmation keep acquisition clean and trustworthy.",
    image: "08-public-profile-checkout.png",
    alt: "Zook public gym profile and checkout handoff",
  },
];

const faqs = [
  ["Is Zook only for large gyms?", "No. It is built for Indian gyms that need clean daily operations, whether one branch or many."],
  ["Does Zook confirm payments automatically?", "Hosted payments activate after backend confirmation. Manual/offline payments are recorded with audit logs."],
  ["Can trainers use AI to assign plans directly?", "No. AI can draft, but trainer review and approval stay in the workflow."],
  ["Can members join from a public gym page?", "Yes, when the gym enables public joining and publishes plans."],
];

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="noise" aria-hidden="true"></div>
  <div class="site-shell">
    <header class="site-header">
      <a href="/" class="brand" aria-label="Zook home">
        <img src="/logo.png" alt="" class="brand-mark" />
        <span><strong>Zook</strong><small>OS for gyms</small></span>
      </a>
      <nav class="site-nav" aria-label="Primary">
        <a href="#product">Product</a>
        <a href="#roles">Roles</a>
        <a href="#workflow">How it works</a>
        <a href="#pricing">Pricing</a>
        <a href="#faq">FAQ</a>
      </nav>
      <div class="header-actions">
        <a href="${appHref("/login")}" class="button button-ghost">Login</a>
        <a href="${appHref("/start-gym")}" class="button button-primary">Start free trial</a>
      </div>
    </header>

    <main id="top">
      <section class="hero">
        <div class="hero-copy reveal">
          <p class="eyebrow">Built for Indian gyms · QR check-ins · UPI/manual payments · role-based apps</p>
          <h1>Run your gym from one operating system.</h1>
          <p class="hero-subhead">
            Zook gives gym owners a web control room and every role a mobile execution app:
            members, trainers, receptionists, and owners.
          </p>
          <div class="hero-actions">
            <a href="${appHref("/start-gym")}" class="button button-primary">Start free trial</a>
            <a href="#product" class="button button-secondary">View product</a>
          </div>
          <div class="trust-row" aria-label="Product capabilities">
            <span>Server-authoritative QR</span>
            <span>Audit logs</span>
            <span>Hosted checkout</span>
          </div>
        </div>
        <figure class="hero-visual reveal reveal-late">
          <img src="${asset("01-hero-composite.png")}" width="1586" height="992" alt="Zook web control room and mobile execution app composite" fetchpriority="high" />
        </figure>
      </section>

      <section class="section pain">
        <div class="section-heading">
          <p class="eyebrow">The real problem</p>
          <h2>Gyms are still run across registers, WhatsApp, UPI screenshots, and memory.</h2>
        </div>
        <div class="card-grid">
          ${painCards.map(([title, body]) => `
            <article class="glass-card">
              <span class="card-index"></span>
              <h3>${title}</h3>
              <p>${body}</p>
            </article>
          `).join("")}
        </div>
      </section>

      <section id="product" class="section split">
        <div class="split-card glass-card">
          <p class="eyebrow">Web Control Room</p>
          <h2>Owners and admins operate the gym from the dashboard.</h2>
          <p>Memberships, attendance, payments, shop, staff, reports, public profile, notifications, and AI controls stay connected.</p>
        </div>
        <div class="split-card glass-card lime">
          <p class="eyebrow">Mobile Execution App</p>
          <h2>Members, trainers, receptionists, and owners execute the day.</h2>
          <p>The app is role-aware, fast on the floor, and designed around scan, approve, record, create, and review actions.</p>
        </div>
      </section>

      <section id="roles" class="section roles">
        <div class="section-heading narrow">
          <p class="eyebrow">Role workflows</p>
          <h2>One system. Clear surfaces for every job.</h2>
        </div>
        <div class="role-grid">
          ${roles.map(([title, body]) => `
            <article class="role-card">
              <strong>${title}</strong>
              <p>${body}</p>
            </article>
          `).join("")}
        </div>
      </section>

      <section id="workflow" class="section proof-stack">
        ${proofSections.map((section, index) => `
          <article class="proof ${index % 2 ? "proof-reverse" : ""}">
            <div class="proof-copy">
              <p class="eyebrow">${section.eyebrow}</p>
              <h2>${section.title}</h2>
              <p>${section.body}</p>
            </div>
            <figure class="proof-image">
              <img src="${asset(section.image)}" width="${section.image.startsWith("0") && ["03", "04", "05", "06"].some((prefix) => section.image.startsWith(prefix)) ? "941" : "1586"}" height="${["03", "04", "05", "06"].some((prefix) => section.image.startsWith(prefix)) ? "1672" : "992"}" loading="lazy" alt="${section.alt}" />
            </figure>
          </article>
        `).join("")}
      </section>

      <section id="pricing" class="section pricing">
        <div class="section-heading narrow">
          <p class="eyebrow">Pricing</p>
          <h2>Start simple. Grow into the full gym OS.</h2>
          <p>Final pricing can be configured before launch.</p>
        </div>
        <div class="pricing-grid">
          ${["Starter", "Growth", "Pro"].map((tier, index) => `
            <article class="price-card ${index === 1 ? "featured" : ""}">
              <p class="eyebrow">${tier}</p>
              <h3>${index === 0 ? "Single-gym basics" : index === 1 ? "Most gyms" : "Multi-role operations"}</h3>
              <p>${index === 0 ? "Public profile, memberships, QR attendance." : index === 1 ? "Payments, desk queues, trainer workflows, reports." : "Advanced controls, branches, AI, audit depth."}</p>
              <a href="${appHref("/start-gym")}" class="button ${index === 1 ? "button-primary" : "button-secondary"}">Book a demo</a>
            </article>
          `).join("")}
        </div>
      </section>

      <section id="faq" class="section faq">
        <div class="section-heading narrow">
          <p class="eyebrow">FAQ</p>
          <h2>Operational, auditable, and ready for real gyms.</h2>
        </div>
        <div class="faq-list">
          ${faqs.map(([question, answer]) => `
            <details class="faq-item">
              <summary>${question}</summary>
              <p>${answer}</p>
            </details>
          `).join("")}
        </div>
      </section>

      <section class="final-cta">
        <p class="eyebrow">Zook Gym OS</p>
        <h2>Bring your gym operations into one clean system.</h2>
        <div class="hero-actions">
          <a href="${appHref("/start-gym")}" class="button button-primary">Start free trial</a>
          <a href="${appHref("/login")}" class="button button-secondary">Login</a>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <p>© 2026 Zook. India-first gym operations.</p>
      <div>
        <a href="${appHref("/status")}">Status</a>
        <a href="https://zookfit.in/privacy">Privacy</a>
        <a href="https://zookfit.in/terms">Terms</a>
        <a href="mailto:support@zookfit.in">Contact</a>
      </div>
    </footer>
  </div>
`;
