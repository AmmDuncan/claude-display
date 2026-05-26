/**
 * Contrast-audit snippet — injected into every fixture body before it is pushed.
 *
 * Runs INSIDE the sandboxed push iframe (the parent can't read the iframe DOM,
 * since pushes are sandboxed without allow-same-origin), walks every element
 * that owns visible text, computes the WCAG contrast ratio of its text colour
 * against its effective background, and posts a structured report up to the
 * parent window via postMessage. The capture rig in the viewer page collects
 * these by fixture name.
 *
 * The driver substitutes __FIXTURE_NAME__ before injecting.
 */
(function () {
  var FIXTURE = "__FIXTURE_NAME__";
  var FAIL = 3.0; // below this, text is effectively invisible — the washout bug
  var WARN = 4.5; // WCAG AA for normal-size text

  function parseColor(str) {
    var m = str.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var p = m[1].split(",").map(function (x) { return parseFloat(x.trim()); });
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }

  // Backdrop behind a transparent-body push. Mockup (app-fidelity) pushes paint
  // no body background, so text on the bare body sits on the viewer card — which
  // follows the host theme. Assuming white here (the old default) produced false
  // dark-mode fails. Approximate the real card backdrop from the host theme.
  function themeBackdrop() {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    return dark ? { r: 21, g: 23, b: 28, a: 1 } : { r: 247, g: 244, b: 236, a: 1 };
  }

  function over(top, bottom) {
    // Composite a (possibly translucent) top colour over an opaque bottom.
    var a = top.a == null ? 1 : top.a;
    return {
      r: top.r * a + bottom.r * (1 - a),
      g: top.g * a + bottom.g * (1 - a),
      b: top.b * a + bottom.b * (1 - a),
      a: 1,
    };
  }

  // Effective opaque background behind an element: collect each ancestor's
  // background top-down and composite them over the theme backdrop, so a
  // translucent chip/card tint resolves to what the eye actually sees rather
  // than being treated as opaque (which falsely tanked .chip.accent).
  function effectiveBg(el) {
    var layers = [];
    var node = el;
    while (node && node.nodeType === 1) {
      var c = parseColor(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0.001) {
        layers.push(c);
        if (c.a >= 0.999) break;
      }
      node = node.parentElement;
    }
    var result = themeBackdrop();
    for (var i = layers.length - 1; i >= 0; i--) result = over(layers[i], result);
    return result;
  }

  function relLum(c) {
    var ch = [c.r, c.g, c.b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }

  function ratio(fg, bg) {
    // Flatten any fg alpha over the background first.
    var a = fg.a == null ? 1 : fg.a;
    var blended = {
      r: fg.r * a + bg.r * (1 - a),
      g: fg.g * a + bg.g * (1 - a),
      b: fg.b * a + bg.b * (1 - a),
    };
    var l1 = relLum(blended);
    var l2 = relLum(bg);
    var hi = Math.max(l1, l2);
    var lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  function hasOwnText(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.textContent.trim().length) return true;
    }
    return false;
  }

  function run() {
    var fails = [];
    var warns = [];
    var els = document.querySelectorAll("body *");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!hasOwnText(el)) continue;
      var cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.1) continue;
      var fg = parseColor(cs.color);
      if (!fg) continue;
      var bg = effectiveBg(el);
      var r = ratio(fg, bg);
      var sample = {
        tag: el.tagName.toLowerCase(),
        cls: el.className && typeof el.className === "string" ? el.className : "",
        text: el.textContent.trim().slice(0, 40),
        ratio: Math.round(r * 100) / 100,
        fg: cs.color,
        bg: "rgb(" + Math.round(bg.r) + "," + Math.round(bg.g) + "," + Math.round(bg.b) + ")",
      };
      if (r < FAIL) fails.push(sample);
      else if (r < WARN) warns.push(sample);
    }
    var rootCs = getComputedStyle(document.documentElement);
    var root = {
      theme: document.documentElement.getAttribute("data-theme"),
      preset: document.documentElement.getAttribute("data-preset"),
      density: document.documentElement.getAttribute("data-density"),
      ink: rootCs.getPropertyValue("--ds-ink").trim(),
      bgElev: rootCs.getPropertyValue("--ds-bg-elev").trim(),
      bodyColor: getComputedStyle(document.body).color,
      bodyBg: getComputedStyle(document.body).backgroundColor,
    };
    try {
      parent.postMessage(
        { type: "easel:audit", fixture: FIXTURE, fails: fails, warns: warns, total: els.length, root: root },
        "*"
      );
    } catch (e) {}
  }

  if (document.readyState === "complete") setTimeout(run, 300);
  else window.addEventListener("load", function () { setTimeout(run, 300); });

  // Re-audit when the host changes theme/preset/density — the iframe applies
  // the new scheme in place (no reload), so the load-time pass would otherwise
  // go stale. Lets the matrix run drive every host state with no reloads.
  window.addEventListener("message", function (e) {
    if (e && e.data && (e.data.type === "easel:config" || e.data.type === "easel:theme")) {
      setTimeout(run, 400);
    }
  });
})();
