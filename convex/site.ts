// Landing page HTML. No backticks or ${ } in here: this whole file is one template literal.
const AGENT_NUMBER = "+1 (628) 316-6196";
const AGENT_SMS = "sms:+16283166196";

export const LANDING_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Reelagent: text a link, get a video for every feed</title>
<meta name="description" content="Text your website or photos to Reelagent on iMessage or WhatsApp. Get a scroll-stopping Instagram Reel back in minutes, and post one automatically every day." />
<meta property="og:title" content="Reelagent: text a link, get a Reel" />
<meta property="og:description" content="Your AI video team in your texts. Website or photos in, Instagram Reel out." />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800;900&display=swap" rel="stylesheet" />
<style>
  :root {
    --bg: #0b0a10; --panel: #15131d; --line: #262233; --text: #f4f1fb; --muted: #a39db5;
    --orange: #ff6a3d; --pink: #ff3d8b; --violet: #8b5cf6; --green: #34d399;
    --grad: linear-gradient(120deg, var(--orange), var(--pink) 50%, var(--violet));
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: Inter, system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; overflow-x: hidden; }
  a { color: inherit; text-decoration: none; }
  .wrap { max-width: 1160px; margin: 0 auto; padding: 0 24px; }
  .grad-text { background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .btn { display: inline-flex; align-items: center; gap: 10px; padding: 15px 26px; border-radius: 999px; font-weight: 700; font-size: 16px; border: 0; cursor: pointer; transition: transform .15s, box-shadow .15s; }
  .btn:hover { transform: translateY(-2px); }
  .btn-primary { background: var(--grad); color: white; box-shadow: 0 10px 40px -10px var(--pink); }
  .btn-ghost { background: rgba(255,255,255,.06); border: 1px solid var(--line); color: var(--text); }

  /* nav */
  nav { position: sticky; top: 0; z-index: 10; backdrop-filter: blur(14px); background: rgba(11,10,16,.7); border-bottom: 1px solid var(--line); }
  nav .wrap { display: flex; align-items: center; justify-content: space-between; height: 68px; }
  .logo { display: flex; align-items: center; gap: 10px; font-weight: 900; font-size: 20px; letter-spacing: -.02em; }
  .logo-mark { width: 32px; height: 32px; border-radius: 10px; background: var(--grad); display: grid; place-items: center; }
  .logo-mark svg { width: 16px; height: 16px; }
  nav .links { display: flex; gap: 28px; align-items: center; color: var(--muted); font-weight: 500; font-size: 15px; }
  nav .links a:hover { color: var(--text); }
  nav .btn { padding: 10px 18px; font-size: 14px; }

  /* hero */
  .hero { position: relative; padding: 80px 0 100px; }
  .hero::before { content: ""; position: absolute; inset: -200px -20% auto; height: 700px; background: radial-gradient(closest-side, rgba(255,61,139,.22), transparent), radial-gradient(closest-side at 70% 40%, rgba(139,92,246,.25), transparent); filter: blur(40px); z-index: -1; }
  .hero .wrap { display: grid; grid-template-columns: 1.1fr .9fr; gap: 56px; align-items: center; }
  .pill { display: inline-flex; gap: 8px; align-items: center; padding: 7px 14px; border-radius: 999px; background: rgba(255,255,255,.06); border: 1px solid var(--line); font-size: 13px; font-weight: 600; color: var(--muted); margin-bottom: 26px; }
  .pill .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); box-shadow: 0 0 12px var(--green); }
  h1 { font-size: clamp(44px, 6.4vw, 80px); line-height: .98; font-weight: 900; letter-spacing: -.045em; }
  .lede { font-size: 20px; color: var(--muted); margin: 26px 0 36px; max-width: 540px; }
  .cta-row { display: flex; gap: 14px; flex-wrap: wrap; }
  .trust { margin-top: 30px; display: flex; gap: 22px; color: var(--muted); font-size: 14px; flex-wrap: wrap; }
  .trust span::before { content: "✓ "; color: var(--green); font-weight: 800; }

  /* phone */
  .stage { position: relative; display: flex; justify-content: center; }
  .phone { width: 300px; height: 610px; border-radius: 48px; background: #000; padding: 12px; box-shadow: 0 0 0 2px #2a2735, 0 50px 120px -20px rgba(255,61,139,.45); position: relative; }
  .phone video { width: 100%; height: 100%; object-fit: cover; border-radius: 38px; background: #1a1724; display: block; }
  .phone .notch { position: absolute; top: 22px; left: 50%; transform: translateX(-50%); width: 92px; height: 26px; background: #000; border-radius: 20px; z-index: 2; }
  .bubble { position: absolute; max-width: 240px; padding: 11px 16px; border-radius: 20px; font-size: 14px; font-weight: 500; box-shadow: 0 20px 40px rgba(0,0,0,.4); opacity: 0; animation: pop .5s forwards; }
  .bubble.me { right: -40px; top: 70px; background: #0a84ff; color: white; border-bottom-right-radius: 6px; animation-delay: .4s; }
  .bubble.bot { left: -70px; top: 170px; background: #2c2a35; color: var(--text); border-bottom-left-radius: 6px; animation-delay: 1.4s; }
  .bubble.done { left: -50px; bottom: 90px; background: #2c2a35; color: var(--text); border-bottom-left-radius: 6px; animation-delay: 2.6s; }
  @keyframes pop { from { opacity: 0; transform: translateY(10px) scale(.95); } to { opacity: 1; transform: none; } }

  section { padding: 100px 0; }
  .eyebrow { text-transform: uppercase; letter-spacing: .14em; font-size: 13px; font-weight: 800; margin-bottom: 14px; }
  h2 { font-size: clamp(34px, 4.4vw, 54px); line-height: 1.04; font-weight: 900; letter-spacing: -.035em; max-width: 760px; }
  .sub { color: var(--muted); font-size: 18px; margin-top: 16px; max-width: 620px; }

  /* steps */
  .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 56px; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 24px; padding: 30px; }
  .step-num { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; font-weight: 900; background: var(--grad); margin-bottom: 20px; }
  .card h3 { font-size: 21px; font-weight: 800; letter-spacing: -.02em; margin-bottom: 8px; }
  .card p { color: var(--muted); font-size: 15.5px; }
  .card code { background: rgba(255,255,255,.07); padding: 2px 8px; border-radius: 6px; font-size: 14px; color: var(--text); }

  /* features */
  .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 56px; }
  .feat-icon { font-size: 26px; margin-bottom: 16px; }

  /* pricing */
  .plans { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 56px; align-items: stretch; }
  .plan { display: flex; flex-direction: column; }
  .plan.hot { border: 2px solid transparent; background: linear-gradient(var(--panel), var(--panel)) padding-box, var(--grad) border-box; position: relative; }
  .plan.hot::after { content: "Most popular"; position: absolute; top: -13px; left: 30px; background: var(--grad); padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; }
  .price { font-size: 52px; font-weight: 900; letter-spacing: -.04em; margin: 14px 0 4px; }
  .price small { font-size: 16px; color: var(--muted); font-weight: 600; letter-spacing: 0; }
  .plan ul { list-style: none; margin: 22px 0 28px; display: grid; gap: 11px; flex: 1; }
  .plan li { color: var(--muted); font-size: 15px; padding-left: 26px; position: relative; }
  .plan li::before { content: "✓"; position: absolute; left: 0; color: var(--green); font-weight: 900; }
  .plan .btn { justify-content: center; }

  /* signup */
  .signup { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; }
  form { display: grid; gap: 14px; }
  label { font-size: 14px; font-weight: 600; color: var(--muted); display: grid; gap: 7px; }
  input, select { font: inherit; font-size: 16px; color: var(--text); background: #0f0d16; border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; outline: none; transition: border-color .15s; }
  input:focus, select:focus { border-color: var(--pink); }
  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .form-msg { font-size: 15px; font-weight: 600; min-height: 22px; }
  .form-msg.err { color: #ff7a7a; }
  .success { display: none; text-align: center; padding: 20px 0; }
  .success h3 { font-size: 26px; font-weight: 900; margin: 12px 0 8px; }
  .success p { color: var(--muted); margin-bottom: 22px; }
  .number { font-size: 30px; font-weight: 900; letter-spacing: -.02em; margin: 6px 0 22px; }

  /* faq */
  details { border-bottom: 1px solid var(--line); padding: 22px 0; }
  summary { font-weight: 700; font-size: 18px; cursor: pointer; list-style: none; display: flex; justify-content: space-between; }
  summary::after { content: "+"; color: var(--muted); font-size: 24px; line-height: 1; }
  details[open] summary::after { content: "–"; }
  details p { color: var(--muted); margin-top: 12px; max-width: 760px; }

  footer { border-top: 1px solid var(--line); padding: 40px 0; color: var(--muted); font-size: 14px; }
  footer .wrap { display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; }

  @media (max-width: 900px) {
    .hero .wrap, .signup { grid-template-columns: 1fr; }
    .steps, .features, .plans { grid-template-columns: 1fr; }
    nav .links a:not(.btn) { display: none; }
    .bubble.me { right: 0; } .bubble.bot, .bubble.done { left: 0; }
    section { padding: 70px 0; }
  }
</style>
</head>
<body>

<nav>
  <div class="wrap">
    <a href="#" class="logo"><span class="logo-mark"><svg viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></span>Reelagent</a>
    <div class="links">
      <a href="#how">How it works</a>
      <a href="#pricing">Pricing</a>
      <a href="#faq">FAQ</a>
      <a href="#signup" class="btn btn-primary">Start free</a>
    </div>
  </div>
</nav>

<header class="hero">
  <div class="wrap">
    <div>
      <div class="pill"><span class="dot"></span>Live on iMessage &amp; WhatsApp</div>
      <h1>Text a link.<br /><span class="grad-text">Get a Reel.</span></h1>
      <p class="lede">Reelagent is your AI video team in your texts. Send your website or a few photos and get a scroll-stopping video back in minutes, ready for Instagram, TikTok, LinkedIn and YouTube Shorts. Then let it post a fresh one every day.</p>
      <div class="cta-row">
        <a href="#signup" class="btn btn-primary">Start making Reels →</a>
        <a href="#how" class="btn btn-ghost">▶ See how it works</a>
      </div>
      <div class="trust"><span>No app to download</span><span>No editing skills</span><span>Cancel anytime</span></div>
    </div>
    <div class="stage">
      <div class="phone">
        <div class="notch"></div>
        <video src="/demo.mp4" autoplay muted loop playsinline poster=""></video>
      </div>
      <div class="bubble me">make a promo for sudospace.tech</div>
      <div class="bubble bot">On it! Pulling from your site now 🎬</div>
      <div class="bubble done">Here's your Reel. Reply “post” to publish ✨</div>
    </div>
  </div>
</header>

<section id="how">
  <div class="wrap">
    <div class="eyebrow grad-text">How it works</div>
    <h2>From a text to your feed in three steps.</h2>
    <p class="sub">The demo playing above was made from one text message. No templates to fill in, no timeline to drag around.</p>
    <div class="steps">
      <div class="card"><div class="step-num">1</div><h3>Text your agent</h3><p>Send a website URL, drop in product photos, or just describe the idea. Like <code>promo for our summer sale</code>.</p></div>
      <div class="card"><div class="step-num">2</div><h3>It directs the video</h3><p>Reelagent reads your site, studies your photos, writes a hook-first storyboard in your brand colors, animates hero shots with AI and adds voiceover and captions.</p></div>
      <div class="card"><div class="step-num">3</div><h3>Reply “post”</h3><p>Get the preview in your chat. Ask for changes in plain English (“make it punchier”), then reply <code>post</code> and it goes live on Instagram, TikTok, LinkedIn and YouTube Shorts at once.</p></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="eyebrow grad-text">Why it's good</div>
    <h2>Videos that look like a creative team made them.</h2>
    <div class="features">
      <div class="card"><div class="feat-icon">🪝</div><h3>Hook in under 2 seconds</h3><p>Every Reel opens with a bold claim or question, one idea per scene, and ends with a clear call to action.</p></div>
      <div class="card"><div class="feat-icon">🎨</div><h3>On brand, automatically</h3><p>Pulls your colors, logo, product shots and copy straight from your website. No brand kit setup.</p></div>
      <div class="card"><div class="feat-icon">🎥</div><h3>AI motion clips</h3><p>Your best still photos become cinematic moving shots: slow push-ins, steam rising, fabric moving.</p></div>
      <div class="card"><div class="feat-icon">🗣️</div><h3>Voiceover + captions</h3><p>Natural voiceover with word-by-word animated captions, because most Reels are watched on mute.</p></div>
      <div class="card"><div class="feat-icon">📅</div><h3>Daily autopilot</h3><p>Pick a time and get a new Reel every day, each with a fresh angle: features, tips, offers, behind the scenes.</p></div>
      <div class="card"><div class="feat-icon">📲</div><h3>Posts everywhere</h3><p>Connect Instagram, TikTok, LinkedIn and YouTube on one page, in about a minute. Approve from your texts, or let it post on schedule.</p></div>
    </div>
  </div>
</section>

<section id="pricing">
  <div class="wrap">
    <div class="eyebrow grad-text">Pricing</div>
    <h2>Cheaper than one hour of an editor.</h2>
    <p class="sub">Start free with your first 3 Reels. Upgrade when it's paying for itself.</p>
    <div class="plans">
      <div class="card plan">
        <h3>Starter</h3>
        <div class="price">$19<small>/month</small></div>
        <p>For trying it out and occasional posts.</p>
        <ul><li>10 Reels per month</li><li>Website &amp; photo input</li><li>Unlimited revisions</li><li>One-tap posting to IG, TikTok, LinkedIn &amp; YouTube</li></ul>
        <button class="btn btn-ghost" data-plan="starter">Choose Starter</button>
      </div>
      <div class="card plan hot">
        <h3>Pro</h3>
        <div class="price">$49<small>/month</small></div>
        <p>For brands that want to show up every day.</p>
        <ul><li>Daily auto-posted Reels</li><li>AI motion clips</li><li>Voiceover + animated captions</li><li>Unlimited revisions</li><li>Priority rendering</li></ul>
        <button class="btn btn-primary" data-plan="pro">Choose Pro</button>
      </div>
      <div class="card plan">
        <h3>Agency</h3>
        <div class="price">$149<small>/month</small></div>
        <p>For agencies and multi-brand teams.</p>
        <ul><li>Up to 5 brands</li><li>Everything in Pro</li><li>Separate social accounts per brand</li><li>Team members in one chat</li></ul>
        <button class="btn btn-ghost" data-plan="agency">Choose Agency</button>
      </div>
    </div>
  </div>
</section>

<section id="signup">
  <div class="wrap signup">
    <div>
      <div class="eyebrow grad-text">Get started</div>
      <h2>Your first 3 Reels are on us.</h2>
      <p class="sub">Sign up with the phone number you'll text from. You'll get your agent's number right away. No card needed to start.</p>
    </div>
    <div class="card">
      <form id="form" novalidate>
        <div class="row2">
          <label>Name<input name="name" autocomplete="name" placeholder="Alex Rivera" required /></label>
          <label>Phone (you'll text from)<input name="phone" type="tel" autocomplete="tel" placeholder="+1 555 123 4567" required /></label>
        </div>
        <label>Email<input name="email" type="email" autocomplete="email" placeholder="alex@brand.com" required /></label>
        <label>Your website (optional)<input name="website" type="url" placeholder="https://yourbrand.com" /></label>
        <label>Plan
          <select name="plan" id="plan">
            <option value="starter">Starter: $19/mo</option>
            <option value="pro" selected>Pro: $49/mo (most popular)</option>
            <option value="agency">Agency: $149/mo</option>
          </select>
        </label>
        <div class="form-msg" id="msg"></div>
        <button class="btn btn-primary" type="submit" id="submit" style="justify-content:center">Start my free Reels →</button>
      </form>
      <div class="success" id="success">
        <div style="font-size:44px">🎉</div>
        <h3>You're in!</h3>
        <p>Text your agent to make your first Reel:</p>
        <div class="number grad-text">${AGENT_NUMBER}</div>
        <a class="btn btn-primary" id="textLink" href="${AGENT_SMS}">Text my agent now</a>
      </div>
    </div>
  </div>
</section>

<section id="faq" style="padding-top:0">
  <div class="wrap">
    <div class="eyebrow grad-text">FAQ</div>
    <h2>Questions</h2>
    <div style="margin-top:30px">
      <details><summary>Do I need to download an app?</summary><p>No. Reelagent lives in iMessage and WhatsApp. You text it like a friend and it texts your videos back.</p></details>
      <details><summary>What can I send it?</summary><p>A website link, product photos, or just an idea. It figures out the rest: copy, colors, shots, music mood and caption.</p></details>
      <details><summary>Can I change a video before it posts?</summary><p>Yes. Reply with what you want changed (“faster”, “mention the sale”, “use the second photo first”) and you'll get a new version. Nothing posts until you say “post”, unless you turn on daily autopilot.</p></details>
      <details><summary>Where can it post?</summary><p>Instagram Reels, TikTok, LinkedIn and YouTube Shorts. When you first reply “post” you get one link to connect any of them; you log in on each network directly, and we never see your passwords. Instagram needs a Business or Creator account (switching is free and takes 30 seconds). Prefer to post yourself? Every video also comes with a share page to download it and copy the caption.</p></details>
      <details><summary>How long does a video take?</summary><p>Usually a few minutes. Videos with AI motion clips take a little longer.</p></details>
    </div>
  </div>
</section>

<footer>
  <div class="wrap">
    <div class="logo"><span class="logo-mark"><svg viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></span>Reelagent</div>
    <div>Text <a href="${AGENT_SMS}" style="color:var(--text);font-weight:700">${AGENT_NUMBER}</a> to start · © 2026 Reelagent</div>
  </div>
</footer>

<script>
  var planSelect = document.getElementById("plan");
  document.querySelectorAll("[data-plan]").forEach(function (b) {
    b.addEventListener("click", function () {
      planSelect.value = b.getAttribute("data-plan");
      document.getElementById("signup").scrollIntoView({ behavior: "smooth" });
    });
  });

  var form = document.getElementById("form");
  var msg = document.getElementById("msg");
  var submit = document.getElementById("submit");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    msg.textContent = ""; msg.className = "form-msg";
    var data = Object.fromEntries(new FormData(form).entries());
    submit.disabled = true; submit.textContent = "Signing you up…";
    fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.j.error || "Something went wrong.");
        var body = data.website ? "Hi! Make a Reel for " + data.website : "Hi! I just signed up";
        document.getElementById("textLink").href = "${AGENT_SMS}&body=" + encodeURIComponent(body);
        form.style.display = "none";
        document.getElementById("success").style.display = "block";
      })
      .catch(function (err) {
        msg.textContent = err.message; msg.className = "form-msg err";
        submit.disabled = false; submit.textContent = "Start my free Reels →";
      });
  });
</script>
</body>
</html>`;
