import "./style.css";

const appUrl = import.meta.env.VITE_ZOOK_APP_URL ?? "https://app.zook.kyokasuigetsu.xyz";
const appHref = (path: string) => `${appUrl}${path}`;

const ownerFeatures = [
  ["Membership desk", "Create public plans, approve join requests, and keep renewals visible."],
  ["QR entry", "Members scan, receive entry codes, and give staff a clean attendance trail."],
  ["Revenue ops", "Track payments, shop pickup, cash collection, and low-stock pressure."],
  ["Trainer output", "Review workout plans, assisted drafts, and trainer-visible member progress."],
];

const workflows = [
  ["1", "Publish", "Set gym profile, membership ladder, QR link, and join policy from web."],
  ["2", "Operate", "Clear joins, run attendance, invite staff, and manage desk inventory."],
  ["3", "Grow", "Use offers, referrals, notifications, and reports to keep the floor moving."],
];

const productStats = [
  ["QR", "Entry codes"],
  ["12", "Photo progress slots"],
  ["INR", "Online and offline"],
];

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="site-shell">
    <header class="site-header">
      <a href="/" class="brand" aria-label="Zook home">
        <img src="/logo.png" alt="" class="brand-mark" />
        <span>
          <strong>Zook</strong>
          <small>Gym OS</small>
        </span>
      </a>
      <nav class="site-nav" aria-label="Primary">
        <a href="#operators">Operators</a>
        <a href="#member-app">Member app</a>
        <a href="${appHref("/gyms")}">Find gyms</a>
      </nav>
      <div class="header-actions">
        <a href="${appHref("/login")}" class="button button-ghost">Login</a>
        <a href="${appHref("/start-gym")}" class="button button-primary">Start your gym</a>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="hero-copy">
          <h1>Zook Gym OS</h1>
          <p>
            Run memberships, QR entry, trainer work, shop pickup, payments, and owner reporting
            from one India-first operating record.
          </p>
          <div class="hero-actions">
            <a href="${appHref("/start-gym")}" class="button button-primary">Start your gym</a>
            <a href="${appHref("/gyms")}" class="button button-secondary">Find a gym</a>
          </div>
        </div>

        <div class="product-stage" aria-label="Zook dashboard preview">
          <div class="dashboard-preview">
            <div class="preview-topbar">
              <span>Zook command board</span>
              <strong>Live desk</strong>
            </div>
            <div class="preview-grid">
              <div>
                <small>Active members</small>
                <strong>482</strong>
              </div>
              <div>
                <small>Today scans</small>
                <strong>138</strong>
              </div>
              <div>
                <small>Revenue</small>
                <strong>₹1.8L</strong>
              </div>
            </div>
            <div class="queue-panel">
              <div>
                <span class="status-dot"></span>
                Join queue cleared
              </div>
              <div>
                <span class="status-dot amber"></span>
                3 low-stock products
              </div>
              <div>
                <span class="status-dot blue"></span>
                7 assistant drafts
              </div>
            </div>
          </div>
          <div class="phone-preview">
            <div class="phone-camera"></div>
            <div class="qr-tile">
              <span></span><span></span><span></span><span></span>
            </div>
            <strong>Entry code 4821</strong>
            <small>Workout, shop, notifications, and progress stay with the member.</small>
          </div>
        </div>
      </section>

      <section id="operators" class="section-grid">
        <div class="section-intro">
          <h2>Built for the people running the gym.</h2>
          <p>
            Zook separates owner setup, front-desk work, trainer delivery, and member self-service
            without splitting the data. Everyone sees the same operating truth.
          </p>
        </div>
        <div class="feature-list">
          ${ownerFeatures
            .map(
              ([title, copy]) => `
                <article class="feature-row">
                  <span class="row-glyph"></span>
                  <div>
                    <h3>${title}</h3>
                    <p>${copy}</p>
                  </div>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>

      <section class="workflow-band">
        <div class="workflow-header">
          <h2>From public join link to daily operations.</h2>
          <a href="${appHref("/dashboard")}" class="button button-secondary">Open dashboard</a>
        </div>
        <div class="workflow-grid">
          ${workflows
            .map(
              ([step, title, copy]) => `
                <article class="workflow-card">
                  <span>${step}</span>
                  <h3>${title}</h3>
                  <p>${copy}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>

      <section id="member-app" class="member-section">
        <div class="member-visual">
          <div class="progress-strip">
            ${productStats
              .map(
                ([value, label]) => `
                  <div>
                    <strong>${value}</strong>
                    <small>${label}</small>
                  </div>
                `,
              )
              .join("")}
          </div>
          <div class="photo-timeline">
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>
        <div>
          <h2>Members get the lighter surface.</h2>
          <p>
            The mobile app handles QR check-in, workout plans, AI fitness assistance, shop pickup,
            notifications, and body-composition progress while web keeps owner operations precise.
          </p>
          <a href="${appHref("/gyms")}" class="button button-primary">Find a Zook gym</a>
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
