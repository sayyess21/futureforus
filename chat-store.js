/* Future For Us chat store, LIVE version (Firebase: project futureforus-chat).
   Used by the site chat (index.html) and the back office (admin.html).
   - Visitors sign in anonymously (no account needed) and can only read their own thread and its sent replies.
   - The back office signs in with Google; only panudetch.er@gmail.com can read every chat (enforced by firestore.rules).
   Data: threads/{id} { uid, cat, answers{name,detail,budget,when,where,contact}, createdAt, updatedAt, unread, needsReply, lastText, lastFrom, hasDraft }
         threads/{id}/msgs/{mid} { from: client|bot|owner|ai, text, t, draft }
         settings/main { mode: manual|draft|auto, every, from, to }
   The web config below is public by design; security comes from firestore.rules. */
(function () {
  var CFG = {
    apiKey: 'AIzaSyCT0iBeyrGKKrHqkJ8eiq5JwEjCYLD3aCw',
    authDomain: 'futureforus-chat.firebaseapp.com',
    projectId: 'futureforus-chat',
    storageBucket: 'futureforus-chat.firebasestorage.app',
    messagingSenderId: '1004697067157',
    appId: '1:1004697067157:web:b2786d699fef3d7ea7459c'
  };
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var ADMIN = 'panudetch.er@gmail.com', MINE = 'ffu_my_thread', MAX = 1000;
  var DEF = { mode: 'draft', every: 2, from: '09:00', to: '21:00' };
  var fb = null, errorCbs = [], authCbs = [], settingsCbs = [], settingsVal = Object.assign({}, DEF), cache = {};
  var queue = Promise.resolve();

  function fail(e) { try { console.error('[chat]', e); } catch (x) {} errorCbs.forEach(function (f) { try { f(e); } catch (x) {} }); }
  function later(fn) { queue = queue.then(fn).catch(fail); return queue; }
  function uid20() { var c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', s = ''; var a = new Uint8Array(20); (self.crypto || window.msCrypto).getRandomValues(a); for (var i = 0; i < 20; i++) s += c[a[i] % 62]; return s; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }

  var ready = Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')])
    .then(function (m) {
      var app = m[0].initializeApp(CFG);
      fb = { au: m[1], fs: m[2], auth: m[1].getAuth(app), db: m[2].getFirestore(app) };
      return new Promise(function (res) {
        var first = true;
        fb.au.onAuthStateChanged(fb.auth, function (u) {
          authCbs.forEach(function (f) { f(u); });
          if (first) { first = false; res(fb); }
        });
      });
    });
  ready.catch(fail);

  function user() { return fb && fb.auth.currentUser; }
  function isAdmin() { var u = user(); return !!(u && u.email === ADMIN); }
  function ensureUser() { return ready.then(function () { return user() || fb.au.signInAnonymously(fb.auth).then(function (c) { return c.user; }); }); }
  function tRef(id) { return fb.fs.doc(fb.db, 'threads', id); }
  function mCol(id) { return fb.fs.collection(fb.db, 'threads', id, 'msgs'); }
  function clip(s) { return String(s || '').trim().slice(0, MAX); }

  window.ChatStore = {
    mode: 'live',
    ready: ready,
    onError: function (f) { errorCbs.push(f); },
    myThreadId: function () { return lsGet(MINE); },
    get: function (id) { return cache[id] || null; },
    forgetMine: function () { lsSet(MINE, null); },

    /* visitor: create a thread once the scripted questions are confirmed; returns its id right away */
    createThread: function (cat, answers) {
      var id = uid20(), now = Date.now(), a = {};
      ['name', 'detail', 'budget', 'when', 'where', 'contact'].forEach(function (k) { if (answers && answers[k] != null) a[k] = clip(answers[k]); });
      lsSet(MINE, id);
      later(function () {
        return ensureUser().then(function (u) {
          return fb.fs.setDoc(tRef(id), { uid: u.uid, cat: String(cat || '').slice(0, 40), answers: a, createdAt: now, updatedAt: now, unread: true, needsReply: true, lastText: clip(a.detail || '') });
        });
      });
      return id;
    },

    /* from: 'client' (visitor) or 'owner' / 'ai' (back office). draft only for 'ai'. */
    send: function (id, from, text, draft) {
      text = clip(text); if (!text) return Promise.resolve(false);
      return later(function () {
        return (from === 'client' ? ensureUser() : ready).then(function () {
          var now = Date.now();
          return fb.fs.addDoc(mCol(id), { from: from, text: text, t: now, draft: !!draft }).then(function () {
            if (from === 'client') return fb.fs.updateDoc(tRef(id), { updatedAt: now, unread: true, needsReply: true, lastText: text });
            if (draft) return fb.fs.updateDoc(tRef(id), { updatedAt: now, hasDraft: true });
            return fb.fs.updateDoc(tRef(id), { updatedAt: now, needsReply: false, lastText: text, lastFrom: from });
          });
        });
      });
    },
    approveDraft: function (id, mid, text) {
      return later(function () {
        var now = Date.now(), body = clip(text);
        return fb.fs.updateDoc(fb.fs.doc(mCol(id), mid), { text: body, draft: false, t: now }).then(function () {
          var left = (cache[id] && cache[id].msgs || []).some(function (m) { return m.draft && m.id !== mid; });
          return fb.fs.updateDoc(tRef(id), { updatedAt: now, needsReply: false, lastText: body, lastFrom: 'ai', hasDraft: left });
        });
      });
    },
    discardDraft: function (id, mid) {
      return later(function () {
        return fb.fs.deleteDoc(fb.fs.doc(mCol(id), mid)).then(function () {
          var left = (cache[id] && cache[id].msgs || []).some(function (m) { return m.draft && m.id !== mid; });
          return fb.fs.updateDoc(tRef(id), { hasDraft: left });
        });
      });
    },
    markRead: function (id) { if (!isAdmin()) return; later(function () { return fb.fs.updateDoc(tRef(id), { unread: false }); }); },
    remove: function (id) {
      return later(function () {
        return fb.fs.getDocs(mCol(id)).then(function (s) {
          return Promise.all(s.docs.map(function (d) { return fb.fs.deleteDoc(d.ref); }));
        }).then(function () { return fb.fs.deleteDoc(tRef(id)); });
      });
    },

    /* cb(thread with msgs) whenever the thread or its messages change. Visitors only get sent messages. */
    watch: function (id, cb) {
      var stop = [], dead = false, doc = null, msgs = null;
      function emit() { if (!doc || !msgs) return; var t = Object.assign({ id: id }, doc, { msgs: msgs }); cache[id] = t; cb(t); }
      (isAdmin() ? ready : ensureUser()).then(function () { return queue; }).then(function () {
        if (dead) return;
        var q = isAdmin() ? mCol(id) : fb.fs.query(mCol(id), fb.fs.where('draft', '==', false));
        stop.push(fb.fs.onSnapshot(tRef(id), function (s) { if (!s.exists()) { delete cache[id]; cb(null); return; } doc = s.data(); emit(); }, function (e) { if (e && e.code === 'permission-denied') cb(null); else fail(e); }));
        stop.push(fb.fs.onSnapshot(q, function (s) {
          msgs = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return a.t - b.t; });
          emit();
        }, fail));
      }).catch(fail);
      return function () { dead = true; stop.forEach(function (f) { f(); }); };
    },

    /* back office */
    watchAll: function (cb) {
      var stop = null;
      ready.then(function () {
        stop = fb.fs.onSnapshot(fb.fs.collection(fb.db, 'threads'), function (s) {
          cb(s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return b.updatedAt - a.updatedAt; }));
        }, fail);
      });
      return function () { if (stop) stop(); };
    },
    onAuth: function (cb) { authCbs.push(cb); if (fb) cb(user()); },
    isAdmin: isAdmin,
    adminEmail: ADMIN,
    signIn: function () { return ready.then(function () { var p = new fb.au.GoogleAuthProvider(); p.setCustomParameters({ login_hint: ADMIN }); return fb.au.signInWithPopup(fb.auth, p); }); },
    signOut: function () { return ready.then(function () { return fb.au.signOut(fb.auth); }); },
    settings: function () { return Object.assign({}, settingsVal); },
    onSettings: function (cb) {
      settingsCbs.push(cb);
      ready.then(function () {
        if (!isAdmin()) return;
        fb.fs.onSnapshot(fb.fs.doc(fb.db, 'settings', 'main'), function (s) {
          settingsVal = Object.assign({}, DEF, s.exists() ? s.data() : {});
          settingsCbs.forEach(function (f) { f(Object.assign({}, settingsVal)); });
        }, fail);
      });
    },
    saveSettings: function (v) { settingsVal = Object.assign({}, DEF, v); later(function () { return fb.fs.setDoc(fb.fs.doc(fb.db, 'settings', 'main'), settingsVal); }); }
  };
})();
