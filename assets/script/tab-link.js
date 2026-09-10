/* Onglets liés -- « Link » : renvoyer les commandes « Shell » de cet
   onglet vers un autre onglet du navigateur au lieu de les jouer ici.

   Chrome (comme Firefox) isole chaque onglet : le postMessage que
   "copier vers shell" utilise (tools/*.html -> window.top ->
   shells-host.js) ne franchit jamais la frontière entre deux onglets.
   Ce script pose un petit bus inter-onglets, même origine, plus l'état
   « Link ». L'interface, elle, vit dans la barre du haut du Dashboard
   (bouton « 🔗 Link », à côté de « ⟲ Disposition ») et parle à ce
   script via postMessage : "tablink-query" / "tablink-set", réponse
   "tablink-state".

   Deux canaux en parallèle, pour couvrir file:// comme http :
     - BroadcastChannel quand il relie vraiment les onglets (solide en
       http/https, cassé entre onglets file:// sur Chrome) ;
     - localStorage + événement "storage" en repli (déjà utilisé
       ailleurs, cf. shells-host.js pour l'opacité des shells).
   Chaque message porte un nonce ; le récepteur dédoublonne.

   Présence : chaque onglet réécrit toutes les 2 s
   "tablink:presence:<tabId>" avec le nom de son dashboard courant. Les
   autres lisent cette liste (entrées de moins de 6 s) pour peupler le
   sélecteur de cible -- d'où la liste qui se met à jour toute seule.
   tabId vit dans sessionStorage : stable au rechargement, unique par
   onglet ; l'état Link aussi (par onglet, pas partagé).

   Chargé uniquement dans index.html (le shell qui possède les
   terminaux). shells-host.js appelle window.tabLinkForward() avant de
   traiter une requête localement. */
(function () {
  "use strict";

  var PRESENCE_PREFIX = "tablink:presence:";
  var MSG_KEY = "tablink:msg";
  var TAB_ID_KEY = "tablink:tabId";
  var LINK_STATE_KEY = "tablink:link";
  var PRESENCE_TTL_MS = 6000;
  var HEARTBEAT_MS = 2000;

  function randomId(prefix) {
    if (self.crypto && typeof crypto.randomUUID === "function") return prefix + crypto.randomUUID();
    return prefix + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  }

  var TAB_ID;
  try {
    TAB_ID = sessionStorage.getItem(TAB_ID_KEY);
    if (!TAB_ID) {
      TAB_ID = randomId("t-");
      sessionStorage.setItem(TAB_ID_KEY, TAB_ID);
    }
  } catch (e) {
    TAB_ID = randomId("t-");
  }

  // { enabled, targetId } -- per tab (sessionStorage), survives a reload
  // of this tab, independent of every other tab.
  var linkState = { enabled: false, targetId: null };
  try {
    var raw = sessionStorage.getItem(LINK_STATE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      linkState.enabled = !!parsed.enabled;
      linkState.targetId = parsed.targetId || null;
    }
  } catch (e) {
    /* keep defaults */
  }
  function saveLinkState() {
    try { sessionStorage.setItem(LINK_STATE_KEY, JSON.stringify(linkState)); } catch (e) {}
  }

  var bc = null;
  try {
    if ("BroadcastChannel" in self) bc = new BroadcastChannel("tablink");
  } catch (e) {
    bc = null;
  }

  var seenNonces = [];
  function alreadySeen(nonce) {
    if (!nonce) return false;
    if (seenNonces.indexOf(nonce) !== -1) return true;
    seenNonces.push(nonce);
    if (seenNonces.length > 64) seenNonces.shift();
    return false;
  }

  // ------------------------------------------------------------------
  // Présence
  // ------------------------------------------------------------------
  function currentTabName() {
    try {
      var p = new URLSearchParams(location.search);
      var page = p.get("page");
      var id = p.get("id");
      if (!page || page === "dashboard") {
        if (typeof getDashboards === "function") {
          var list = getDashboards() || [];
          var byId = id ? list.filter(function (x) { return x.id === id; })[0] : null;
          var d = byId || list.filter(function (x) { return x.id === "default"; })[0] || list[0];
          if (d && d.name) return d.name;
        }
        return "Dashboard";
      }
      return page;
    } catch (e) {
      return "Onglet";
    }
  }

  function heartbeat() {
    try {
      localStorage.setItem(
        PRESENCE_PREFIX + TAB_ID,
        JSON.stringify({ name: currentTabName(), ts: Date.now() })
      );
    } catch (e) {
      /* storage full / disabled -- presence just won't advertise */
    }
  }

  function dropPresence() {
    try { localStorage.removeItem(PRESENCE_PREFIX + TAB_ID); } catch (e) {}
  }

  function listPeers() {
    var peers = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf(PRESENCE_PREFIX) !== 0) continue;
        var id = k.slice(PRESENCE_PREFIX.length);
        if (id === TAB_ID) continue;
        var rec = null;
        try { rec = JSON.parse(localStorage.getItem(k)); } catch (e) { rec = null; }
        if (!rec || typeof rec.ts !== "number") continue;
        if (Date.now() - rec.ts > PRESENCE_TTL_MS) {
          try { localStorage.removeItem(k); } catch (e) {}
          i--; // localStorage re-indexes after a removal
          continue;
        }
        peers.push({ tabId: id, name: rec.name || "Onglet" });
      }
    } catch (e) {
      /* ignore */
    }
    peers.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    // Disambiguate same-named tabs ("Dashboard #1", "Dashboard #2").
    var counts = {};
    peers.forEach(function (p) { counts[p.name] = (counts[p.name] || 0) + 1; });
    var seen = {};
    peers.forEach(function (p) {
      if (counts[p.name] > 1) {
        seen[p.name] = (seen[p.name] || 0) + 1;
        p.label = p.name + " #" + seen[p.name];
      } else {
        p.label = p.name;
      }
    });
    return peers;
  }

  heartbeat();
  setInterval(heartbeat, HEARTBEAT_MS);
  window.addEventListener("pagehide", dropPresence);
  window.addEventListener("beforeunload", dropPresence);

  // ------------------------------------------------------------------
  // Bus : réception
  // ------------------------------------------------------------------
  function frameWin() {
    var f = document.getElementById("frame");
    return f && f.contentWindow;
  }

  function pulseFrame(dir) {
    var w = frameWin();
    if (w) {
      try { w.postMessage({ type: "tablink-activity", dir: dir }, "*"); } catch (e) {}
    }
  }

  function deliverLocally(payload) {
    if (!payload || payload.kind !== "shell-copy-request") return;
    var data = {
      shellType: payload.shellType || null,
      slot: payload.slot != null ? payload.slot : null,
      text: payload.text,
      forceNew: !!payload.forceNew,
    };
    if (typeof window.shellsHostDeliverCommand === "function") {
      window.shellsHostDeliverCommand(data); // runs locally, never re-forwarded
    } else {
      data.type = "shell-copy-request";
      window.postMessage(data, "*");
    }
    pulseFrame("in");
  }

  // id -> { source, requestId, timer } for shell-list requests this tab
  // has forwarded to its linked peer and is waiting on a reply for.
  var pendingListReqs = new Map();

  function onEnvelope(env) {
    if (!env || env.to !== TAB_ID) return;
    if (alreadySeen(env.nonce)) return;
    var p = env.payload;
    if (!p) return;

    if (p.kind === "shell-copy-request") {
      deliverLocally(p);
      return;
    }

    if (p.kind === "list-shells-request") {
      var shells = typeof window.shellsHostListShells === "function" ? window.shellsHostListShells() : [];
      routeToPeer(env.from, { kind: "list-shells-response", id: p.id, shells: shells });
      return;
    }

    if (p.kind === "list-shells-response") {
      var pend = pendingListReqs.get(p.id);
      if (!pend) return;
      pendingListReqs.delete(p.id);
      clearTimeout(pend.timer);
      try {
        pend.source.postMessage(
          { type: "shell-list-response", requestId: pend.requestId, shells: p.shells || [] },
          "*"
        );
      } catch (e) {}
      return;
    }
  }

  if (bc) bc.addEventListener("message", function (e) { onEnvelope(e.data); });
  window.addEventListener("storage", function (e) {
    if (e.key !== MSG_KEY || !e.newValue) return;
    var env;
    try { env = JSON.parse(e.newValue); } catch (err) { return; }
    onEnvelope(env);
  });

  // ------------------------------------------------------------------
  // Bus : envoi
  // ------------------------------------------------------------------
  function routeToPeer(toTabId, payload) {
    if (!toTabId) return;
    var env = { to: toTabId, from: TAB_ID, nonce: randomId("n-"), ts: Date.now(), payload: payload };
    alreadySeen(env.nonce); // never act on our own message if it echoes back
    if (bc) {
      try { bc.postMessage(env); } catch (e) {}
    }
    try {
      var str = JSON.stringify(env);
      localStorage.setItem(MSG_KEY, str);
      setTimeout(function () {
        try { if (localStorage.getItem(MSG_KEY) === str) localStorage.removeItem(MSG_KEY); } catch (e) {}
      }, 1500);
    } catch (e) {}
  }

  // ------------------------------------------------------------------
  // Point d'interception appelé par shells-host.js
  // ------------------------------------------------------------------
  // Returns true if the request was sent to the linked tab (so the
  // caller must NOT also run it here); false to let it run locally.
  window.tabLinkForward = function (data) {
    if (!linkState.enabled || !linkState.targetId) return false;
    var peers = listPeers();
    var live = false;
    for (var i = 0; i < peers.length; i++) {
      if (peers[i].tabId === linkState.targetId) { live = true; break; }
    }
    if (!live) return false; // target gone -- fall back to a local shell
    routeToPeer(linkState.targetId, {
      kind: "shell-copy-request",
      shellType: (data && data.shellType) || null,
      slot: data && data.slot != null ? data.slot : null,
      text: data && data.text,
      forceNew: !!(data && data.forceNew),
    });
    pulseFrame("out");
    return true;
  };

  // Called by shells-host.js when a nested "copy to shell" dropdown asks
  // for the shell list: if this tab is linked, fetch the *peer's* list
  // over the bus and reply to `source` ourselves; return true so
  // shells-host.js doesn't also answer with the local list. Returns
  // false (answer locally) when not linked or the target is gone.
  window.tabLinkListRequest = function (data, source) {
    if (!linkState.enabled || !linkState.targetId || !source) return false;
    var peers = listPeers();
    var live = false;
    for (var i = 0; i < peers.length; i++) {
      if (peers[i].tabId === linkState.targetId) { live = true; break; }
    }
    if (!live) return false;

    var id = randomId("ls-");
    var timer = setTimeout(function () {
      // No reply in time -- send an empty list rather than the local
      // one, which would be the wrong tab's shells while linked.
      pendingListReqs.delete(id);
      try {
        source.postMessage({ type: "shell-list-response", requestId: data.requestId, shells: [] }, "*");
      } catch (e) {}
    }, 600);
    pendingListReqs.set(id, { source: source, requestId: data.requestId, timer: timer });
    routeToPeer(linkState.targetId, { kind: "list-shells-request", id: id });
    return true;
  };

  // ------------------------------------------------------------------
  // Pont pour l'interface (bouton « 🔗 Link » dans la barre du Dashboard)
  // ------------------------------------------------------------------
  function stateMsg() {
    return {
      type: "tablink-state",
      peers: listPeers(),
      enabled: linkState.enabled,
      targetId: linkState.targetId,
    };
  }

  window.addEventListener("message", function (e) {
    var d = e && e.data;
    if (!d) return;
    // Only our own top-level tab may drive the link state: our own window,
    // or a frame nested inside it (dashboard.html posts up to window.top).
    // A separate tab/popup that grabbed a handle to us has its own .top
    // and is dropped -- otherwise it could flip the link target and
    // reroute "copy to shell" (Sweep3 §5.1). e.origin is useless here:
    // under file:// every page reports "null".
    if (!e.source || (e.source !== window && e.source.top !== window)) return;
    if (d.type === "tablink-query") {
      try { if (e.source) e.source.postMessage(stateMsg(), "*"); } catch (err) {}
      return;
    }
    if (d.type === "tablink-set") {
      linkState.enabled = !!d.enabled;
      linkState.targetId = d.targetId || null;
      saveLinkState();
      try { if (e.source) e.source.postMessage(stateMsg(), "*"); } catch (err) {}
      return;
    }
  });
})();
