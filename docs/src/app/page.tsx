'use client';

import './home.css';
import { useState } from 'react';

function copyCmd(id: string, btn: HTMLButtonElement) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent || '').then(() => {
    btn.textContent = 'copied';
    setTimeout(() => { btn.textContent = 'copy'; }, 1500);
  });
}

function CodeTabs() {
  const [active, setActive] = useState('api-gateway');

  return (
    <div className="hp-code-pane">
      <div className="hp-code-pane-header">
        {(['api-gateway', 'auth-service', 'billing'] as const).map((tab) => (
          <div
            key={tab}
            className={`hp-code-tab ${active === tab ? 'active' : ''}`}
            onClick={() => setActive(tab)}
          >
            {tab === 'api-gateway' ? 'api-gateway.ts' : tab === 'auth-service' ? 'auth-service.ts' : 'billing.ts'}
          </div>
        ))}
      </div>
      <div style={{ display: active === 'api-gateway' ? 'block' : 'none' }}>
        <pre><code dangerouslySetInnerHTML={{ __html: `<span class="kw">import</span> { <span class="fn">trail</span> } <span class="kw">from</span> <span class="str">"agentcrumbs"</span>; <span class="cmt">// @crumbs</span>
<span class="kw">const</span> crumb = <span class="fn">trail</span>(<span class="str">"api-gateway"</span>); <span class="cmt">// @crumbs</span>

<span class="kw">export</span> <span class="kw">async</span> <span class="kw">function</span> <span class="fn">handleCheckout</span>(<span class="tp">req</span>: <span class="tp">Request</span>) {
  <span class="fn">crumb</span>(<span class="str">"checkout started"</span>, { <span class="tp">cartId</span>: req.params.id }); <span class="cmt">// @crumbs</span>

  <span class="kw">const</span> user = <span class="kw">await</span> <span class="fn">authClient</span>.<span class="fn">verify</span>(req.token);
  <span class="fn">crumb</span>(<span class="str">"user verified"</span>, { <span class="tp">userId</span>: user.id }); <span class="cmt">// @crumbs</span>

  <span class="kw">const</span> charge = <span class="kw">await</span> <span class="fn">billingClient</span>.<span class="fn">charge</span>(user, req.cart);
  <span class="fn">crumb</span>(<span class="str">"charge result"</span>, { <span class="tp">status</span>: charge.status }); <span class="cmt">// @crumbs</span>

  <span class="kw">return</span> { <span class="tp">orderId</span>: charge.orderId };
}` }} /></pre>
      </div>
      <div style={{ display: active === 'auth-service' ? 'block' : 'none' }}>
        <pre><code dangerouslySetInnerHTML={{ __html: `<span class="kw">import</span> { <span class="fn">trail</span> } <span class="kw">from</span> <span class="str">"agentcrumbs"</span>; <span class="cmt">// @crumbs</span>
<span class="kw">const</span> crumb = <span class="fn">trail</span>(<span class="str">"auth-service"</span>); <span class="cmt">// @crumbs</span>

<span class="kw">export</span> <span class="kw">async</span> <span class="kw">function</span> <span class="fn">verify</span>(<span class="tp">token</span>: <span class="tp">string</span>) {
  <span class="fn">crumb</span>(<span class="str">"token received"</span>, { <span class="tp">len</span>: token.length }); <span class="cmt">// @crumbs</span>

  <span class="kw">const</span> decoded = <span class="fn">jwt</span>.<span class="fn">verify</span>(token, SECRET);
  <span class="fn">crumb</span>(<span class="str">"token decoded"</span>, { <span class="tp">userId</span>: decoded.sub }); <span class="cmt">// @crumbs</span>

  <span class="kw">const</span> user = <span class="kw">await</span> <span class="fn">db</span>.<span class="fn">users</span>.<span class="fn">findById</span>(decoded.sub);
  <span class="fn">crumb</span>(<span class="str">"user lookup"</span>, { <span class="tp">found</span>: !!user, <span class="tp">plan</span>: user?.plan }); <span class="cmt">// @crumbs</span>

  <span class="kw">return</span> user;
}` }} /></pre>
      </div>
      <div style={{ display: active === 'billing' ? 'block' : 'none' }}>
        <pre><code dangerouslySetInnerHTML={{ __html: `<span class="kw">import</span> { <span class="fn">trail</span> } <span class="kw">from</span> <span class="str">"agentcrumbs"</span>; <span class="cmt">// @crumbs</span>
<span class="kw">const</span> crumb = <span class="fn">trail</span>(<span class="str">"billing"</span>); <span class="cmt">// @crumbs</span>

<span class="kw">export</span> <span class="kw">async</span> <span class="kw">function</span> <span class="fn">charge</span>(<span class="tp">user</span>: <span class="tp">User</span>, <span class="tp">cart</span>: <span class="tp">Cart</span>) {
  <span class="fn">crumb</span>(<span class="str">"charging"</span>, { <span class="tp">userId</span>: user.id, <span class="tp">total</span>: cart.total }); <span class="cmt">// @crumbs</span>

  <span class="kw">const</span> result = <span class="kw">await</span> <span class="fn">stripe</span>.<span class="fn">charges</span>.<span class="fn">create</span>({
    <span class="tp">amount</span>: cart.total,
    <span class="tp">customer</span>: user.stripeId,
  });
  <span class="fn">crumb</span>(<span class="str">"stripe response"</span>, { <span class="tp">status</span>: result.status }); <span class="cmt">// @crumbs</span>

  <span class="kw">return</span> { <span class="tp">orderId</span>: result.id, <span class="tp">status</span>: result.status };
}` }} /></pre>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="hp">
      {/* NAV */}
      <nav className="hp-nav">
        <div className="hp-nav-left">
          <div className="hp-wordmark">agent<span>crumbs</span></div>
          <a href="https://trigger.dev" target="_blank" className="hp-by-trigger">
            by
            <svg width="14" height="14" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M41.6889 52.2795L60.4195 20L106.839 100H14L32.7305 67.7195L45.9801 75.3312L40.5003 84.7756H80.3387L60.4195 50.4478L54.9396 59.8922L41.6889 52.2795Z" fill="#A8FF53"/></svg>
            Trigger.dev
          </a>
        </div>
        <div className="hp-nav-links">
          <a href="/docs">Docs</a>
          <a href="https://github.com/triggerdotdev/agentcrumbs" target="_blank">GitHub</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hp-hero">
        <div className="hp-container">
          <div className="hp-hero-label">For Claude Code, Cursor, Copilot, and any agent</div>
          <h1>Debug mode for<br />any agent</h1>
          <p>Agents can read your code but they can&apos;t see what happened at runtime. agentcrumbs lets them drop structured traces inline while writing code, then query those traces when something breaks. Stripped before merge, zero cost when off.</p>
        </div>
      </section>

      {/* CODE BLOCK */}
      <section className="hp-code-section">
        <div className="hp-code-section-inner">
          <div className="hp-code-split">
            <CodeTabs />
            <div className="hp-code-pane">
              <div className="hp-code-pane-header">
                <div className="hp-code-pane-label">claude code</div>
              </div>
              <pre><code dangerouslySetInnerHTML={{ __html: `<span class="cc-prompt">❯</span> checkout returns 500 but only for free-tier users

<span class="cc-icon">⏺</span> I can see crumbs across all three services. Let me
  query the trail to see what's happening.

<span class="cc-icon">⏺</span> Bash(agentcrumbs query --since 5m)
  <span class="cc-dim">⎿</span> <span class="trail-name">api-gateway</span>     <span class="trail-msg">checkout started</span>  <span class="trail-time">+0ms</span>   <span class="trail-data">{ cartId: "c_91" }</span>
    <span class="trail-name-b">auth-service</span>    <span class="trail-msg">token received</span>   <span class="trail-time">+1ms</span>   <span class="trail-data">{ len: 182 }</span>
    <span class="trail-name-b">auth-service</span>    <span class="trail-msg">token decoded</span>    <span class="trail-time">+4ms</span>   <span class="trail-data">{ userId: "u_8f3k" }</span>
    <span class="trail-name-b">auth-service</span>    <span class="trail-msg">user lookup</span>      <span class="trail-time">+9ms</span>   <span class="trail-data">{ found: true, plan: "free" }</span>
    <span class="trail-name">api-gateway</span>     <span class="trail-msg">user verified</span>    <span class="trail-time">+10ms</span>  <span class="trail-data">{ userId: "u_8f3k" }</span>
    <span class="trail-name-c">billing</span>         <span class="trail-msg">charging</span>         <span class="trail-time">+11ms</span>  <span class="trail-data">{ total: 4999 }</span>
    <span class="trail-name-c">billing</span>         <span class="trail-msg">stripe response</span>  <span class="trail-time">+80ms</span>  <span class="trail-data">{ status: "failed" }</span>
    <span class="trail-name">api-gateway</span>     <span class="trail-msg">charge result</span>    <span class="trail-time">+81ms</span>  <span class="trail-data">{ status: "failed" }</span>

<span class="cc-icon">⏺</span> Found it. Auth returns <span class="cc-dim">plan: "free"</span> but billing
  charges without checking. Free-tier users have
  no stripeId. Stripe fails on null customer.
  Adding a plan check in billing.charge().` }} /></pre>
            </div>
          </div>
        </div>
      </section>

      {/* INSTALL */}
      <section className="hp-install-section">
        <div className="hp-container">
          <div className="hp-install-steps">
            <div className="hp-install-step">
              <div className="hp-install-step-num">1</div>
              <div className="hp-install-bar">
                <span className="hp-prompt-sign">$</span>
                <code id="install-cmd">npm install agentcrumbs</code>
                <button className="hp-copy-btn" onClick={(e) => copyCmd('install-cmd', e.currentTarget)}>copy</button>
              </div>
            </div>
            <div className="hp-install-step">
              <div className="hp-install-step-num">2</div>
              <div className="hp-install-bar">
                <span className="hp-prompt-sign">$</span>
                <code id="intent-cmd">npx @tanstack/intent install</code>
                <button className="hp-copy-btn" onClick={(e) => copyCmd('intent-cmd', e.currentTarget)}>copy</button>
              </div>
            </div>
            <div className="hp-install-step">
              <div className="hp-install-step-num">3</div>
              <div className="hp-install-step-text">Tell your agent: <span style={{ color: 'var(--hp-text)' }}>&quot;Run the agentcrumbs/init skill&quot;</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="hp-features">
        <div className="hp-container">
          <div className="hp-feature-grid">
            <div className="hp-feature-card">
              <h3>Agents trace their own code</h3>
              <p>The agent drops crumbs as it writes each function. If a test fails or an API returns garbage, it queries the trail and sees exactly what ran, with what data.</p>
            </div>
            <div className="hp-feature-card">
              <h3>Strip before merge</h3>
              <p>Crumbs are development-only. <code>agentcrumbs strip</code> removes all traces before merge. CI gate with <code>--check</code> ensures nothing leaks to main.</p>
            </div>
            <div className="hp-feature-card">
              <h3>Zero overhead when off</h3>
              <p>No <code>AGENTCRUMBS</code> env var? Every call is a frozen noop. No conditionals, no property lookups. The function body is literally empty.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="hp-workflow">
        <div className="hp-container">
          <h2>The agent debugging loop</h2>
          <p className="hp-section-subtitle">Crumbs live on your feature branch. They never ship to main.</p>
          <div className="hp-workflow-steps">
            {[
              { num: '01', title: 'Agent writes code + crumbs', desc: 'As the agent implements a feature, it drops crumbs at every decision point, API call, and branch.' },
              { num: '02', title: 'Something breaks', desc: 'A test fails, an API returns wrong data, behavior doesn\'t match expectations.' },
              { num: '03', title: 'Agent reads the trail', desc: 'The agent queries crumbs to see what actually executed, in what order, with what data.' },
              { num: '04', title: 'Strip before merge', desc: <>Once the code works, <code>agentcrumbs strip</code> removes all crumbs. Clean diff, clean main.</> },
            ].map((step) => (
              <div key={step.num} className="hp-workflow-step">
                <div className="hp-step-num">{step.num}</div>
                <div className="hp-step-title">{step.title}</div>
                <div className="hp-step-desc">{step.desc}</div>
              </div>
            ))}
          </div>
          <div className="hp-workflow-flow">
            {['write', 'debug', 'fix', 'strip', 'merge'].map((label, i) => (
              <span key={label} style={{ display: 'contents' }}>
                <div className="hp-flow-step">
                  <span className={`hp-flow-dot ${i < 3 ? 'active' : ''}`} />
                  <span className="hp-flow-label">{label}</span>
                </div>
                {i < 4 && <div className={`hp-flow-line ${i < 2 ? 'active' : ''}`} />}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* SKILLS */}
      <section className="hp-skills">
        <div className="hp-container">
          <h2>The init skill is the real setup</h2>
          <p className="hp-section-subtitle">After installing, tell your agent to run <code>agentcrumbs/init</code>. It scans your repo, discovers your services and modules, and builds a <strong>namespace catalog</strong> that gets written to your agent config (CLAUDE.md, .cursorrules, etc.).</p>
          <p className="hp-section-subtitle">This is the critical step. Without the catalog, every agent invents its own namespace names: <code>auth</code>, <code>auth-service</code>, <code>authService</code>, <code>authentication</code>, all pointing at the same thing. The catalog locks it down. Every agent, every session, same names.</p>

          <div className="hp-skills-install">
            <div className="hp-code-pane-header" style={{ borderRadius: '8px 8px 0 0' }}>
              <div className="hp-code-pane-label">what init writes to your agent config</div>
            </div>
            <pre className="hp-skills-pre"><code dangerouslySetInnerHTML={{ __html: `<span class="trail-msg">## agentcrumbs</span>

<span class="trail-msg">### Namespaces</span>

<span class="cc-dim">| Namespace        | Description                      | Path              |</span>
<span class="cc-dim">| ---              | ---                              | ---               |</span>
| <span class="trail-name">api-gateway</span>    | <span class="cc-dim">HTTP API and routing</span>             | <span class="cc-dim">apps/gateway</span>      |
| <span class="trail-name-b">auth-service</span>   | <span class="cc-dim">Authentication and token handling</span> | <span class="cc-dim">apps/auth</span>         |
| <span class="trail-name-c">billing</span>        | <span class="cc-dim">Stripe integration and charges</span>   | <span class="cc-dim">apps/billing</span>      |
| <span class="trail-name">task-runner</span>    | <span class="cc-dim">Background job execution</span>         | <span class="cc-dim">apps/worker</span>       |

<span class="cc-dim">Do not invent new namespaces. Pick from this table or ask first.</span>` }} /></pre>
          </div>

          <div className="hp-skills-detail">
            <p>agentcrumbs ships 5 skills via <a href="https://tanstack.com/blog/from-docs-to-agents" target="_blank">@tanstack/intent</a>, covering the full API, CLI, and common mistakes. Skills travel with the package version, so the agent always has docs matching the installed code.</p>
            <p>Compatible with Claude Code, Cursor, GitHub Copilot, and any agent that supports the <a href="https://agentskills.io" target="_blank">Agent Skills spec</a>.</p>
          </div>
        </div>
      </section>

      {/* WORKS EVERYWHERE */}
      <section className="hp-compat">
        <div className="hp-container">
          <h2>Works with any agent</h2>
          <p className="hp-section-subtitle">Claude Code, Cursor, Copilot, Aider, custom agents. If the agent can write code, it can write crumbs.</p>
          <div className="hp-compat-grid">
            {[
              { label: 'Trace into node_modules', desc: 'Agents can paste raw fetch() calls into library code to trace dependencies. No import needed.' },
              { label: 'Any language via HTTP', desc: 'POST to the collector from Python, Go, Rust, or any language. The protocol is just HTTP + JSON.' },
              { label: 'Multi-service', desc: "One collector receives crumbs from every service. Bug in service A caused by service B? It's all in the same trail." },
              { label: 'Node 18+ / Bun', desc: 'Zero dependencies. Works with Node 18+ and Bun out of the box.' },
            ].map((item) => (
              <div key={item.label} className="hp-compat-item">
                <div className="hp-compat-label">{item.label}</div>
                <div className="hp-compat-desc">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="hp-footer">
        <div className="hp-container">
          <div className="hp-footer-inner">
            <a href="https://trigger.dev" target="_blank" className="hp-footer-brand">
              <svg width="18" height="18" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M41.6889 52.2795L60.4195 20L106.839 100H14L32.7305 67.7195L45.9801 75.3312L40.5003 84.7756H80.3387L60.4195 50.4478L54.9396 59.8922L41.6889 52.2795Z" fill="#A8FF53"/></svg>
              Built by Trigger.dev
            </a>
            <div className="hp-footer-links">
              <span>MIT License</span>
              <a href="/docs">Docs</a>
              <a href="https://github.com/triggerdotdev/agentcrumbs" target="_blank">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
