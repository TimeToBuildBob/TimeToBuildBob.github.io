/*
 * blog-feedback.js — select-text → in-browser draft → email feedback widget.
 *
 * Pure client-side, no backend / no auth / no DB. "Submit" hands off to a
 * pre-filled Gmail compose tab; the trust gate is Bob's inbound-email allowlist
 * (non-allowlisted senders' mail just sits unread). Drafts live in localStorage
 * keyed by post URL until sent.
 *
 * Email contract (parsed by the brain-repo email loop — keep in sync):
 *   Subject: [blog-feedback] <slug>
 *   Body:
 *     Blog feedback for: <slug>
 *     Post: <full URL>
 *
 *     === Comment 1 ===
 *     Quote: <single-line exact selection>
 *     Before: <single-line ~32-char prefix>
 *     After: <single-line ~32-char suffix>
 *     Comment:
 *     <free-form comment, may span multiple lines>
 *
 *     === Comment 2 ===
 *     ...
 */
(function () {
  "use strict";

  // Only run on blog post pages.
  var ROOT = document.querySelector("article.post .prose") ||
             document.querySelector("article.post");
  if (!ROOT) return;

  var TO = "bob@superuserlabs.org";
  var CTX_LEN = 32;            // text-quote prefix/suffix length
  var GMAIL_URL_BUDGET = 8000; // beyond this, force clipboard fallback

  var slug = (function () {
    // /blog/2026-06-23-some-title/  ->  2026-06-23-some-title
    var parts = location.pathname.replace(/\/+$/, "").split("/");
    return parts[parts.length - 1] || location.pathname;
  })();
  var storageKey = "blog-feedback:" + location.pathname;

  // ---- draft storage ----------------------------------------------------
  function loadDrafts() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch (e) {
      return [];
    }
  }
  function saveDrafts(drafts) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(drafts));
    } catch (e) {
      /* quota or private mode — drafts simply won't persist */
    }
  }
  var drafts = loadDrafts();

  // ---- text-quote anchor ------------------------------------------------
  function collapseWs(s) {
    return s.replace(/\s+/g, " ").trim();
  }
  function quoteContext(range) {
    var exact = collapseWs(range.toString());
    var prefix = "";
    var suffix = "";
    try {
      var pre = document.createRange();
      pre.setStart(ROOT, 0);
      pre.setEnd(range.startContainer, range.startOffset);
      prefix = collapseWs(pre.toString()).slice(-CTX_LEN);
    } catch (e) { /* ignore */ }
    try {
      var suf = document.createRange();
      suf.setStart(range.endContainer, range.endOffset);
      suf.setEnd(ROOT, ROOT.childNodes.length);
      suffix = collapseWs(suf.toString()).slice(0, CTX_LEN);
    } catch (e) { /* ignore */ }
    return { exact: exact, prefix: prefix, suffix: suffix };
  }

  // ---- styling (inlined to keep this a single self-contained file) ------
  var css = "" +
    ".bf-btn{position:absolute;z-index:9999;display:none;align-items:center;gap:4px;" +
      "padding:4px 8px;font:500 13px/1 system-ui,sans-serif;color:#fff;background:#6d5dfc;" +
      "border:none;border-radius:6px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)}" +
    ".bf-btn:hover{background:#5847e0}" +
    ".bf-pop{position:absolute;z-index:10000;display:none;width:280px;padding:10px;" +
      "background:#1e1e2e;color:#eee;border:1px solid #44445a;border-radius:8px;" +
      "box-shadow:0 4px 16px rgba(0,0,0,.4);font:14px/1.4 system-ui,sans-serif}" +
    ".bf-pop blockquote{margin:0 0 8px;padding:6px 8px;font-size:12px;color:#bbb;" +
      "border-left:3px solid #6d5dfc;background:#26263a;border-radius:0 4px 4px 0;" +
      "max-height:64px;overflow:auto}" +
    ".bf-pop textarea{width:100%;box-sizing:border-box;min-height:60px;padding:6px;" +
      "font:13px system-ui,sans-serif;color:#eee;background:#16161f;border:1px solid #44445a;" +
      "border-radius:4px;resize:vertical}" +
    ".bf-pop .bf-row{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}" +
    ".bf-pop button{padding:4px 12px;font:500 13px system-ui,sans-serif;border:none;" +
      "border-radius:4px;cursor:pointer}" +
    ".bf-add{color:#fff;background:#6d5dfc}.bf-add:hover{background:#5847e0}" +
    ".bf-cancel{color:#bbb;background:transparent}" +
    ".bf-tray{position:fixed;right:16px;bottom:16px;z-index:10000;width:300px;max-width:90vw;" +
      "background:#1e1e2e;color:#eee;border:1px solid #44445a;border-radius:10px;" +
      "box-shadow:0 6px 24px rgba(0,0,0,.45);font:14px/1.4 system-ui,sans-serif;overflow:hidden}" +
    ".bf-tray-head{display:flex;align-items:center;justify-content:space-between;" +
      "padding:10px 12px;cursor:pointer;background:#26263a;font-weight:600}" +
    ".bf-tray-body{max-height:40vh;overflow:auto;padding:4px 0}" +
    ".bf-item{padding:8px 12px;border-top:1px solid #2e2e42}" +
    ".bf-item blockquote{margin:0 0 4px;padding-left:8px;font-size:12px;color:#9a9ab0;" +
      "border-left:2px solid #6d5dfc}" +
    ".bf-item p{margin:0;font-size:13px}" +
    ".bf-item .bf-del{float:right;color:#888;background:none;border:none;cursor:pointer;font-size:12px}" +
    ".bf-item .bf-del:hover{color:#ff6b6b}" +
    ".bf-tray-foot{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #2e2e42}" +
    ".bf-tray-foot button{flex:1;padding:6px;font:500 13px system-ui,sans-serif;border:none;" +
      "border-radius:6px;cursor:pointer}" +
    ".bf-send{color:#fff;background:#6d5dfc}.bf-send:hover{background:#5847e0}" +
    ".bf-copy{color:#ccc;background:#33334a}.bf-copy:hover{background:#3d3d57}";
  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---- floating button + popover ----------------------------------------
  var btn = document.createElement("button");
  btn.className = "bf-btn";
  btn.type = "button";
  btn.innerHTML = "💬 Comment";
  document.body.appendChild(btn);

  var pop = document.createElement("div");
  pop.className = "bf-pop";
  pop.innerHTML =
    "<blockquote class='bf-quote'></blockquote>" +
    "<textarea class='bf-text' placeholder='Your comment on this passage…'></textarea>" +
    "<div class='bf-row'><button type='button' class='bf-cancel'>Cancel</button>" +
    "<button type='button' class='bf-add'>Add</button></div>";
  document.body.appendChild(pop);

  var pendingAnchor = null;

  function hideBtn() { btn.style.display = "none"; }
  function hidePop() { pop.style.display = "none"; pendingAnchor = null; }

  document.addEventListener("mouseup", function (e) {
    // Ignore selections originating inside our own UI.
    if (pop.contains(e.target) || btn.contains(e.target)) return;
    setTimeout(function () {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) { hideBtn(); return; }
      var range = sel.getRangeAt(0);
      if (!ROOT.contains(range.commonAncestorContainer)) { hideBtn(); return; }
      var rect = range.getBoundingClientRect();
      btn.style.top = (window.scrollY + rect.top - 38) + "px";
      btn.style.left = (window.scrollX + rect.left) + "px";
      btn.style.display = "inline-flex";
      btn._anchor = quoteContext(range);
    }, 10);
  });

  btn.addEventListener("mousedown", function (e) {
    e.preventDefault(); // keep the selection alive
  });
  btn.addEventListener("click", function () {
    pendingAnchor = btn._anchor;
    if (!pendingAnchor) return;
    pop.querySelector(".bf-quote").textContent = pendingAnchor.exact;
    pop.querySelector(".bf-text").value = "";
    pop.style.top = btn.style.top;
    pop.style.left = btn.style.left;
    pop.style.display = "block";
    hideBtn();
    pop.querySelector(".bf-text").focus();
  });

  pop.querySelector(".bf-cancel").addEventListener("click", hidePop);
  pop.querySelector(".bf-add").addEventListener("click", function () {
    var text = pop.querySelector(".bf-text").value.trim();
    if (!text || !pendingAnchor) { hidePop(); return; }
    drafts.push({
      exact: pendingAnchor.exact,
      prefix: pendingAnchor.prefix,
      suffix: pendingAnchor.suffix,
      comment: text
    });
    saveDrafts(drafts);
    hidePop();
    renderTray();
  });

  // ---- review tray ------------------------------------------------------
  var tray = document.createElement("div");
  tray.className = "bf-tray";
  tray.style.display = "none";
  document.body.appendChild(tray);
  var trayOpen = false;

  function buildBody() {
    var lines = ["Blog feedback for: " + slug, "Post: " + location.href, ""];
    drafts.forEach(function (d, i) {
      lines.push("=== Comment " + (i + 1) + " ===");
      lines.push("Quote: " + d.exact);
      lines.push("Before: " + (d.prefix || ""));
      lines.push("After: " + (d.suffix || ""));
      lines.push("Comment:");
      lines.push(d.comment);
      lines.push("");
    });
    return lines.join("\n");
  }

  function gmailUrl() {
    var su = "[blog-feedback] " + slug;
    return "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(TO) +
      "&su=" + encodeURIComponent(su) + "&body=" + encodeURIComponent(buildBody());
  }

  function renderTray() {
    if (!drafts.length) { tray.style.display = "none"; return; }
    tray.style.display = "block";
    var head = "<div class='bf-tray-head'><span>💬 Review (" + drafts.length +
      ")</span><span>" + (trayOpen ? "✕" : "‹") + "</span></div>";
    var body = "";
    if (trayOpen) {
      body = "<div class='bf-tray-body'>";
      drafts.forEach(function (d, i) {
        body += "<div class='bf-item'><button class='bf-del' data-i='" + i + "'>delete</button>" +
          "<blockquote>" + esc(d.exact) + "</blockquote><p>" + esc(d.comment) + "</p></div>";
      });
      body += "</div><div class='bf-tray-foot'>" +
        "<button class='bf-send'>Send all</button>" +
        "<button class='bf-copy'>Copy</button></div>";
    }
    tray.innerHTML = head + body;
    tray.querySelector(".bf-tray-head").addEventListener("click", function () {
      trayOpen = !trayOpen; renderTray();
    });
    if (trayOpen) {
      Array.prototype.forEach.call(tray.querySelectorAll(".bf-del"), function (b) {
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          drafts.splice(parseInt(b.getAttribute("data-i"), 10), 1);
          saveDrafts(drafts);
          renderTray();
        });
      });
      tray.querySelector(".bf-send").addEventListener("click", sendAll);
      tray.querySelector(".bf-copy").addEventListener("click", copyBody);
    }
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function clearDrafts() {
    drafts = [];
    saveDrafts(drafts);
    trayOpen = false;
    renderTray();
  }

  function copyBody() {
    var text = "To: " + TO + "\nSubject: [blog-feedback] " + slug + "\n\n" + buildBody();
    var done = function () { alert("Feedback copied. Paste it into a new email to " + TO + "."); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { window.prompt("Copy this:", text); });
    } else {
      window.prompt("Copy this:", text);
    }
  }

  function sendAll() {
    if (!drafts.length) return;
    var url = gmailUrl();
    if (url.length > GMAIL_URL_BUDGET) {
      alert("This feedback batch is large; copying it to your clipboard instead — " +
        "paste into a new email to " + TO + ".");
      copyBody();
      return;
    }
    window.open(url, "_blank", "noopener");
    clearDrafts();
  }

  document.addEventListener("click", function (e) {
    if (!pop.contains(e.target) && !btn.contains(e.target)) hidePop();
  });

  renderTray();
})();
