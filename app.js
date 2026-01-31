let _tracker = { m: [], k: [], t: [], s: Date.now() };

document.addEventListener("mousemove", (ev) => {
  if (_tracker.m.length < 50)
    _tracker.m.push({
      x: ev.clientX,
      y: ev.clientY,
      t: Date.now() - _tracker.s,
    });
});
document.addEventListener("keydown", (ev) => {
  if (_tracker.k.length < 50)
    _tracker.k.push({ k: ev.code, t: Date.now() - _tracker.s });
});
document.addEventListener("touchmove", (ev) => {
  if (_tracker.t.length < 50) {
      const touch = ev.touches[0];
      _tracker.t.push({
          x: touch.clientX,
          y: touch.clientY,
          t: Date.now() - _tracker.s
      });
  }
});

async function showFallback() {
  const gate = document.getElementById("gate-overlay");
  if (gate) {
    gate.style.opacity = "0";
    gate.style.pointerEvents = "none";
    setTimeout(() => {
        gate.style.display = "none";
    }, 500);
  }
}

async function initWidgets() {
  await new Promise((r) => setTimeout(r, 850 + Math.floor(Math.random() * 100)));

  if (navigator.webdriver) {
    showFallback();
    return;
  }

  if (typeof turnstile === "undefined") {
    showFallback();
    return;
  }

  try {
    turnstile.render("#captcha-container", {
      sitekey: "0x4AAAAAACWG9iTnvE3o60m6", 
      callback: async (token) => {
        await sendTelemetry(token);
      },
      "error-callback": () => {
        showFallback();
      },
      "expired-callback": () => {
        showFallback();
      },
    });
  } catch (err) {
    showFallback();
  }
}



async function sendTelemetry(token) {
  try {
    const duration = Date.now() - _tracker.s;

    const payload = {
      _csrf: token,
      client_meta: { 
          ua: navigator.userAgent,
          lg: navigator.language,
          sw: screen.width,
          sh: screen.height,
          cd: screen.colorDepth,
          pl: navigator.plugins.length,
          wd: navigator.webdriver
      },
      ux_signals: { 
          m: _tracker.m.length, 
          k: _tracker.k.length, 
          t: _tracker.t.length,
          d: duration
      },
      _ts: Date.now() 
    };

    const res = await fetch("/api/msg_submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
        showFallback();
        return;
    }

    const data = await res.json();
    if (data.status === 'ok' && data.r_url) {
        window.location.href = data.r_url;
    } else {
        showFallback();
    }
  } catch (err) {
    showFallback();
  }
}

initWidgets();
