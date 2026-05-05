import "./style.css";

const appUrl = import.meta.env.VITE_ZOOK_APP_URL ?? "https://app.zook.kyokasuigetsu.xyz";
const appHref = (path: string) => `${appUrl}${path}`;

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="container">
    <header>
      <a href="/" class="logo">
        <img src="/logo.png" alt="Zook Logo" class="logo-icon" />
        <span class="logo-text">
          <span class="title">Zook</span>
          <span class="subtitle">Gym OS</span>
        </span>
      </a>
      <div class="nav-links">
        <a href="${appHref("/login")}" class="btn-secondary">Login</a>
        <a href="${appHref("/start-gym")}" class="btn-primary">Start your gym</a>
      </div>
    </header>

    <main class="hero">
      <div class="hero-content">
        <h1>The operating system for modern gyms.</h1>
        <p>Everything your gym needs: memberships, QR entry, trainer plans, desk operations, shop pickup, and owner reporting in one reliable workflow.</p>
        <div class="hero-actions">
          <a href="${appHref("/start-gym")}" class="btn-primary">Start your gym →</a>
          <a href="${appHref("/gyms")}" class="btn-secondary">Find a gym →</a>
        </div>
      </div>
      
      <div class="hero-graphics">
        <div class="glass-card" style="margin-bottom: 1rem;">
          <p style="color: rgba(255,255,255,0.45); font-size: 0.875rem;">Owner dashboard</p>
          <h2 style="font-size: 1.875rem; margin-top: 0.25rem;">Run gym operations from web.</h2>
          <div style="display: flex; gap: 1rem; margin-top: 2rem;">
            <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); padding: 1rem; border-radius: 1rem; flex: 1;">
              <div class="feature-icon lime">❖</div>
              <p style="color: rgba(255,255,255,0.45); font-size: 0.875rem;">Sell memberships and shop items</p>
            </div>
            <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); padding: 1rem; border-radius: 1rem; flex: 1;">
              <div class="feature-icon lime">▨</div>
              <p style="color: rgba(255,255,255,0.45); font-size: 0.875rem;">Publish join links and QR codes</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <section id="features" class="features-grid">
      <div class="glass-card">
        <div class="feature-icon lime">👥</div>
        <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem;">For gym owners</h3>
        <p style="color: rgba(255,255,255,0.5); font-size: 0.875rem;">Plans, staff, shop, reports, and payments in one dashboard.</p>
      </div>
      <div class="glass-card">
        <div class="feature-icon">📱</div>
        <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem;">For members</h3>
        <p style="color: rgba(255,255,255,0.5); font-size: 0.875rem;">QR entry, workout plans, and AI fitness assistant.</p>
      </div>
      <div class="glass-card">
        <div class="feature-icon">🔔</div>
        <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem;">For staff</h3>
        <p style="color: rgba(255,255,255,0.5); font-size: 0.875rem;">Desk approvals, coaching, and member management.</p>
      </div>
    </section>

    <footer style="margin-top: 6rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.14); display: flex; justify-content: space-between; color: rgba(174,184,168,0.7);">
      <p>© 2026 Zook. All rights reserved.</p>
      <div style="display: flex; gap: 1.5rem;">
        <a href="mailto:legal@zook.app?subject=Privacy%20policy" style="color: inherit; text-decoration: none;">Privacy</a>
        <a href="mailto:legal@zook.app?subject=Terms%20of%20service" style="color: inherit; text-decoration: none;">Terms</a>
      </div>
    </footer>
  </div>
`;
