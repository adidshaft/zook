import "./style.css";

const appUrl = import.meta.env.VITE_ZOOK_APP_URL ?? "https://zookfit.in";
const appHref = (path: string) => `${appUrl}${path}`;
const asset = (name: string) => `/assets/zook-redesign/${name}`;

type ProductImage = {
  avif: string;
  png: string;
  alt: string;
  width: number;
  height: number;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
};

const productImage = ({ avif, png, alt, width, height, loading = "lazy", fetchPriority }: ProductImage) => `
  <picture>
    <source srcset="${asset(avif)}" type="image/avif" />
    <img
      src="${asset(png)}"
      width="${width}"
      height="${height}"
      loading="${loading}"
      decoding="async"
      ${fetchPriority ? `fetchpriority="${fetchPriority}"` : ""}
      alt="${alt}"
    />
  </picture>
`;

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
    avif: "owner-web-dashboard.avif",
    png: "02-owner-web-dashboard.png",
    width: 1586,
    height: 992,
    alt: "Zook owner web dashboard command board",
  },
  {
    eyebrow: "Mobile Execution App",
    title: "Every role gets the surface they actually use on the floor.",
    body: "Members check in and follow plans. Reception handles approvals. Trainers keep client context and draft workflows close.",
    avif: "member-mobile-home.avif",
    png: "03-member-mobile-home.png",
    width: 941,
    height: 1672,
    alt: "Zook member mobile home with membership card",
  },
  {
    eyebrow: "Reception Desk",
    title: "QR attendance feels simple at the desk, but stays server-authoritative.",
    body: "Reception sees pending approvals, flagged scans, entry-code verification, and recent check-ins without guessing from screenshots.",
    avif: "receptionist-desk-queue.avif",
    png: "04-receptionist-desk-queue.png",
    width: 941,
    height: 1672,
    alt: "Zook receptionist desk approval queue",
  },
  {
    eyebrow: "Trainer + AI",
    title: "AI assists trainers. Trainers stay in control.",
    body: "Drafts are reviewed, edited, and approved before assignment. The system supports professionals instead of bypassing them.",
    avif: "trainer-ai-draft-review.avif",
    png: "06-trainer-ai-draft-review.png",
    width: 941,
    height: 1672,
    alt: "Zook trainer AI draft review workflow",
  },
  {
    eyebrow: "Attendance + Payments",
    title: "Built around how Indian gyms actually collect money.",
    body: "Direct UPI, cash, bank transfer, manual audit notes, hosted checkout, and QR entry all connect back to membership state.",
    avif: "attendance-qr-console.avif",
    png: "07-attendance-payments-showcase.png",
    width: 1586,
    height: 992,
    alt: "Zook attendance and payment operations showcase",
  },
  {
    eyebrow: "Public Joining",
    title: "Turn your gym profile into a joinable page.",
    body: "Plans, referral codes, public profile, checkout handoff, and backend confirmation keep acquisition clean and trustworthy.",
    avif: "public-gym-profile.avif",
    png: "08-public-profile-checkout.png",
    width: 1586,
    height: 992,
    alt: "Zook public gym profile and checkout handoff",
  },
];

const faqs = [
  ["Is Zook only for large gyms?", "No. It is built for Indian gyms that need clean daily operations, whether one branch or many."],
  ["Does Zook confirm payments automatically?", "Hosted payments activate after backend confirmation. Manual/offline payments are recorded with audit logs."],
  ["Can trainers use AI to assign plans directly?", "No. AI can draft, but trainer review and approval stay in the workflow."],
  ["Can members join from a public gym page?", "Yes, when the gym enables public joining and publishes plans."],
  ["Is there a free trial?", "Yes. New gyms can start with a 14-day free trial before choosing a plan."],
  ["Can we cancel monthly?", "Yes. Monthly plans can be cancelled before the next billing cycle."],
  ["Does it support UPI and Razorpay?", "Yes. Zook supports Indian payment workflows including UPI, cash records, bank transfer, and Razorpay-hosted checkout."],
  ["Can we run multiple branches?", "Yes. Growth and Pro are designed for multi-branch teams with role-based access."],
  ["Can we import old member data?", "Yes. Existing member lists can be migrated from CSV during onboarding."],
  ["Do invoices support GST workflows?", "Zook keeps invoice and receipt records structured so GST-compliant operations are easier to manage."],
  ["Where is gym data hosted?", "Production data is managed in cloud infrastructure configured for Indian gym operations and access control."],
  ["Can we get support on WhatsApp?", "Yes. Sales and onboarding support can start on WhatsApp for faster setup conversations."],
];

const pricingTiers = [
  {
    name: "Starter",
    headline: "Single-gym basics",
    body: "Public profile, memberships, QR attendance, and simple operations.",
    monthly: 1499,
    cta: "Start free trial",
    href: appHref("/start-gym"),
    featured: false,
  },
  {
    name: "Growth",
    headline: "Most gyms",
    body: "Payments, desk queues, trainer workflows, reports, and richer controls.",
    monthly: 3999,
    cta: "Start free trial",
    href: appHref("/start-gym"),
    featured: true,
  },
  {
    name: "Pro",
    headline: "Multi-role operations",
    body: "Advanced controls, branches, AI, audit depth, and sales support.",
    monthly: 7999,
    cta: "Chat with us",
    href: "https://wa.me/919999999999?text=Hi%2C%20I%20want%20to%20know%20more%20about%20Zook",
    featured: false,
  },
];

const formatInr = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="noise" aria-hidden="true"></div>
  <div id="nav-backdrop" class="nav-backdrop"></div>
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
      <button id="nav-toggle" class="nav-toggle" aria-label="Open navigation" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
      <div class="header-actions">
        <a href="${appHref("/login")}" class="button button-ghost">Login</a>
        <a href="${appHref("/start-gym")}" class="button button-primary">Start free trial</a>
      </div>
    </header>

    <main id="main">
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
          ${productImage({
            avif: "hero-control-room-mobile-composite.avif",
            png: "01-hero-composite.png",
            width: 1586,
            height: 992,
            loading: "eager",
            fetchPriority: "high",
            alt: "Zook web control room and mobile execution app composite",
          })}
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

      <section class="section proof-stats">
        <article class="glass-card">
          <span class="stat-num">500+</span>
          <span class="stat-label">Daily check-ins managed through Zook workflows</span>
        </article>
        <article class="glass-card">
          <span class="stat-num">50+</span>
          <span class="stat-label">Gyms onboarded across owner, trainer, desk, and member roles</span>
        </article>
        <article class="glass-card">
          <span class="stat-num">4.8★</span>
          <span class="stat-label">Target app-store experience for gym teams and members</span>
        </article>
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
              ${productImage(section)}
              ${section.eyebrow === "Mobile Execution App" ? `
                <div class="app-badges" aria-label="Download Zook app">
                  <a class="store-badge" href="https://apps.apple.com/in/search?term=Zook" target="_blank" rel="noreferrer">App Store</a>
                  <a class="store-badge" href="https://play.google.com/store/apps/details?id=com.zook.app" target="_blank" rel="noreferrer">Google Play</a>
                </div>
              ` : ""}
            </figure>
          </article>
        `).join("")}
      </section>

      <section id="pricing" class="section pricing">
        <div class="section-heading narrow">
          <p class="eyebrow">Pricing</p>
          <h2>Start simple. Grow into the full gym OS.</h2>
          <p>Transparent monthly pricing for Indian gyms, with 15% off annual billing.</p>
          <div class="billing-toggle" role="group" aria-label="Billing period">
            <button type="button" class="active" data-billing="monthly">Monthly</button>
            <button type="button" data-billing="annual">Annual -15%</button>
          </div>
        </div>
        <div class="pricing-grid">
          ${pricingTiers.map((tier) => `
            <article class="price-card glass-card ${tier.featured ? "featured" : ""}" data-monthly="${tier.monthly}">
              ${tier.featured ? `<span class="popular-pill">Most popular</span>` : ""}
              <p class="eyebrow">${tier.name}</p>
              <h3>${tier.headline}</h3>
              <p>${tier.body}</p>
              <p class="price-amount"><span>${formatInr(tier.monthly)}</span><small> / mo</small></p>
              <a href="${tier.href}" class="button ${tier.featured ? "button-primary" : "button-secondary"}">${tier.cta}</a>
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
        <a href="${appHref("/gyms")}">Find gyms near you</a>
        <a href="${appHref("/status")}">Status</a>
        <a href="${appHref("/privacy")}">Privacy</a>
        <a href="${appHref("/terms")}">Terms</a>
        <a href="mailto:support@zookfit.in">Contact</a>
      </div>
    </footer>
  </div>
  <a class="whatsapp-float" href="https://wa.me/919999999999?text=Hi%2C%20I%20want%20to%20know%20more%20about%20Zook" target="_blank" rel="noreferrer">WhatsApp</a>
`;

const navToggle = document.getElementById("nav-toggle");
const siteNav = document.querySelector<HTMLElement>(".site-nav");
const backdrop = document.getElementById("nav-backdrop");
const firstNavLink = siteNav?.querySelector<HTMLElement>("a");

function setNavOpen(open: boolean) {
  siteNav?.classList.toggle("nav-open", open);
  backdrop?.classList.toggle("nav-open", open);
  navToggle?.setAttribute("aria-expanded", String(open));
  navToggle?.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  if (open) {
    firstNavLink?.focus();
  } else {
    navToggle?.focus();
  }
}

navToggle?.addEventListener("click", () => setNavOpen(!siteNav?.classList.contains("nav-open")));
backdrop?.addEventListener("click", () => setNavOpen(false));
siteNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setNavOpen(false));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setNavOpen(false);
});

const billingButtons = document.querySelectorAll<HTMLButtonElement>("[data-billing]");
const priceCards = document.querySelectorAll<HTMLElement>(".price-card[data-monthly]");

billingButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const period = button.dataset.billing === "annual" ? "annual" : "monthly";
    billingButtons.forEach((candidate) => candidate.classList.toggle("active", candidate === button));
    priceCards.forEach((card) => {
      const monthly = Number(card.dataset.monthly ?? 0);
      const amount = period === "annual" ? monthly * 0.85 : monthly;
      const price = card.querySelector<HTMLElement>(".price-amount span");
      const suffix = card.querySelector<HTMLElement>(".price-amount small");
      if (price) price.textContent = formatInr(amount);
      if (suffix) suffix.textContent = period === "annual" ? " / mo, billed annually" : " / mo";
    });
  });
});
