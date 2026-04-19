/* ============================================================
   ML-GALLERY — main.js
   Cinematic interactions + Journey Timeline support
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  /* ── 1. CURSOR SYSTEM ─────────────────────────────────────── */
  const dot  = document.getElementById("cursor-dot");
  const glow = document.getElementById("cursor-glow");

  if (dot && glow && window.matchMedia("(pointer: fine)").matches) {
    let mouseX = 0, mouseY = 0;
    let glowX  = 0, glowY  = 0;

    // Track mouse position
    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    // Animation loop: dot follows instantly, glow lerps behind
    (function cursorLoop() {
      // Dot: 1:1 tracking — translate3d for GPU compositing
      dot.style.transform = `translate3d(${mouseX - 4}px, ${mouseY - 4}px, 0)`;

      // Glow: cinematic lerp (0.08 = smooth trailing)
      glowX += (mouseX - glowX) * 0.08;
      glowY += (mouseY - glowY) * 0.08;
      glow.style.transform = `translate3d(${glowX - 150}px, ${glowY - 150}px, 0)`;

      requestAnimationFrame(cursorLoop);
    })();

    // Hover detection: interactive elements get .hovering state
    const interactiveSelector = 'a, button, [role="button"], .card, .spotlight-card, .star-btn, .btn-primary, .btn-ghost, .nids-scroll-btn, .card-anchor, .spotlight-card-link';

    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(interactiveSelector)) {
        dot.classList.add("hovering");
        glow.classList.add("hovering");
      }
    });

    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(interactiveSelector)) {
        dot.classList.remove("hovering");
        glow.classList.remove("hovering");
      }
    });

    // Hide cursor when mouse leaves the viewport
    document.addEventListener("mouseleave", () => {
      dot.style.opacity = "0";
      glow.style.opacity = "0";
    });
    document.addEventListener("mouseenter", () => {
      dot.style.opacity = "1";
      glow.style.opacity = "1";
    });
  }

  /* ── 2. STAR-FIELD CANVAS ───────────────────────────────── */
  (function initStarField() {
    const canvas = document.getElementById("star-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W, H, stars = [];

    function resize() {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }

    class Star {
      constructor() { this.reset(); }
      reset() {
        this.x         = Math.random() * W;
        this.y         = Math.random() * H;
        this.r         = Math.random() * 1.3 + 0.2;
        this.alpha     = Math.random() * 0.7 + 0.1;
        this.speed     = Math.random() * 0.25 + 0.04;
        this.dir       = Math.random() * Math.PI * 2;
        this.twinkle   = Math.random() * 0.005 + 0.002;
        this.twinkleD  = 1;
      }
      update() {
        this.alpha += this.twinkle * this.twinkleD;
        if (this.alpha >= 0.8 || this.alpha <= 0.05) this.twinkleD *= -1;
        this.x += Math.cos(this.dir) * this.speed;
        this.y += Math.sin(this.dir) * this.speed;
        if (this.x < 0) this.x = W;
        if (this.x > W) this.x = 0;
        if (this.y < 0) this.y = H;
        if (this.y > H) this.y = 0;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210, 200, 255, ${this.alpha})`;
        ctx.fill();
      }
    }

    function buildStars(n) { stars = Array.from({ length: n }, () => new Star()); }

    function drawFrame() {
      ctx.clearRect(0, 0, W, H);
      stars.forEach(s => { s.update(); s.draw(); });
      requestAnimationFrame(drawFrame);
    }

    window.addEventListener("resize", () => { resize(); buildStars(200); });
    resize();
    buildStars(200);
    drawFrame();
  })();

  /* ── 3. SCROLL REVEAL ───────────────────────────────────── */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || i * 100;
        setTimeout(() => entry.target.classList.add("visible"), Number(delay));
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.10, rootMargin: "0px 0px -40px 0px" });

  // Stagger timeline cards
  document.querySelectorAll(".timeline-cards .card").forEach((el, i) => {
    el.dataset.delay = i * 140;
  });
  document.querySelectorAll(".reveal").forEach(el => revealObs.observe(el));

  /* ── 4. TIMELINE SPINE PROGRESS ─────────────────────────── */
  // Highlight the active milestone dot as user scrolls past it
  const milestones = document.querySelectorAll(".milestone");
  const spineObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const dot = entry.target.querySelector(".milestone-dot");
      if (!dot) return;
      if (entry.isIntersecting) {
        dot.style.filter = "brightness(1.4)";
      } else {
        dot.style.filter = "";
      }
    });
  }, { threshold: 0.3 });
  milestones.forEach(m => spineObs.observe(m));

  /* ── 5. ANIMATED COUNTERS ───────────────────────────────── */
  function animateCounter(el, target, suffix = "", duration = 1400) {
    if (!el) return;
    const start = performance.now();
    (function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);       // ease-out quart
      el.textContent = Math.round(ease * target) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }

  let countersStarted = false;
  const statsObs = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !countersStarted) {
      countersStarted = true;
      animateCounter(document.getElementById("cnt-proj"), 4,  "",    1200);
      animateCounter(document.getElementById("cnt-acc"),  99, "%",   1600); // MNIST CNN — real result
      animateCounter(document.getElementById("cnt-tech"), 6,  "",    1400); // Python, Flask, TF, sklearn, HTML/CSS, JS
    }
  }, { threshold: 0.3 });

  const statsRow = document.getElementById("stats-row");
  if (statsRow) statsObs.observe(statsRow);

  /* ── 6. STAR SYSTEM ─────────────────────────────────────── */
  const starred = {};
  const counts  = { 0: 0, 1: 0, 2: 0, 3: 0 };

  window.toggleStar = function(id) {
    starred[id] = !starred[id];
    counts[id] += starred[id] ? 1 : -1;

    const btn = document.getElementById("s"  + id);
    const txt = document.getElementById("sc" + id);
    if (!btn || !txt) return;

    btn.textContent = starred[id] ? "★" : "☆";
    txt.textContent = (starred[id] ? "★" : "☆") + " " + counts[id];
    btn.classList.toggle("starred", starred[id]);

    if (starred[id]) {
      btn.style.transform = "scale(1.6)";
      setTimeout(() => btn.style.transform = "", 200);
    }

    document.getElementById("cnt-star").textContent =
      Object.values(starred).filter(Boolean).length;
  };

  /* ── 7. SMOOTH SCROLL HELPER ────────────────────────────── */
  window.scrollToSection = function(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ── 8. CARD 3-D TILT ───────────────────────────────────── */
  document.querySelectorAll(".card, .spotlight-card").forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const r   = card.getBoundingClientRect();
      const dx  = (e.clientX - (r.left + r.width  / 2)) / (r.width  / 2);
      const dy  = (e.clientY - (r.top  + r.height / 2)) / (r.height / 2);
      const tX  = dy * -5;
      const tY  = dx *  5;
      const ty  = card.classList.contains("spotlight-card") ? -4 : -5;
      card.style.transform = `translateY(${ty}px) rotateX(${tX}deg) rotateY(${tY}deg)`;
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });

  /* ── 9. HERO PARALLAX ───────────────────────────────────── */
  const heroContent = document.querySelector(".hero-content");
  window.addEventListener("scroll", () => {
    if (!heroContent) return;
    const s = window.scrollY;
    heroContent.style.transform = `translateY(${s * 0.22}px)`;
    heroContent.style.opacity   = Math.max(0, 1 - s / 560);
  }, { passive: true });

});