/* Future For Us chat store.
   One small interface used by the site chat (index.html) and the back office (admin.html).
   PREVIEW MODE (now): threads are kept in this browser only (localStorage), so the chat and the back office
   can be tried on one computer. To go live, this file is swapped for the Firebase version; the pages stay the same.

   Message: { from: 'client' | 'bot' | 'owner' | 'ai', text, t, draft? }
     bot   = the scripted first questions
     ai    = the scheduled assistant; with draft:true it waits in the back office and the client never sees it
   Settings: { mode: 'manual' | 'draft' | 'auto', every: hours, from: 'HH:MM', to: 'HH:MM' } */
(function () {
  var KEY = 'ffu_threads', MINE = 'ffu_my_thread', SET = 'ffu_settings', MAX = 1000;
  var DEF = { mode: 'draft', every: 2, from: '09:00', to: '21:00' };
  function read(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } }
  function load() { return read(KEY, {}); }
  function save(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch (e) { return false; } }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  var subs = [], last = '';
  function tick() { var raw = ''; try { raw = (localStorage.getItem(KEY) || '') + (localStorage.getItem(SET) || ''); } catch (e) {} if (raw === last) return; last = raw; var all = load(); subs.forEach(function (f) { f(all); }); }
  addEventListener('storage', tick); setInterval(tick, 1200);
  function edit(id, fn) { var all = load(), t = all[id]; if (!t) return false; fn(t); t.updatedAt = Date.now(); var ok = save(all); tick(); return ok; }
  window.ChatStore = {
    mode: 'preview',
    myThreadId: function () { try { var id = localStorage.getItem(MINE); return id && load()[id] ? id : null; } catch (e) { return null; } },
    get: function (id) { return load()[id] || null; },
    createThread: function (cat, answers, msgs) {
      var all = load(), id = uid(), now = Date.now();
      all[id] = { id: id, cat: cat, answers: answers, createdAt: now, updatedAt: now, unread: true, needsReply: true, msgs: msgs || [] };
      save(all); try { localStorage.setItem(MINE, id); } catch (e) {} tick(); return id;
    },
    send: function (id, from, text, draft) {
      text = String(text || '').trim().slice(0, MAX); if (!text) return false;
      return edit(id, function (t) {
        t.msgs.push({ from: from, text: text, t: Date.now(), draft: !!draft });
        if (from === 'client') { t.unread = true; t.needsReply = true; }
        if ((from === 'owner' || from === 'ai') && !draft) t.needsReply = false;
      });
    },
    /* back office: send an AI draft as it is, or edited */
    approveDraft: function (id, i, text) { return edit(id, function (t) { var m = t.msgs[i]; if (!m || !m.draft) return; if (text) m.text = String(text).trim().slice(0, MAX); m.draft = false; m.t = Date.now(); t.needsReply = false; }); },
    discardDraft: function (id, i) { return edit(id, function (t) { if (t.msgs[i] && t.msgs[i].draft) t.msgs.splice(i, 1); }); },
    markRead: function (id) { var all = load(); if (all[id] && all[id].unread) { all[id].unread = false; save(all); tick(); } },
    remove: function (id) { var all = load(); delete all[id]; save(all); tick(); },
    forgetMine: function () { try { localStorage.removeItem(MINE); } catch (e) {} },
    settings: function () { var s = read(SET, {}); return { mode: s.mode || DEF.mode, every: s.every || DEF.every, from: s.from || DEF.from, to: s.to || DEF.to }; },
    saveSettings: function (s) { try { localStorage.setItem(SET, JSON.stringify(s)); } catch (e) {} tick(); },
    watch: function (id, cb) { var f = function (all) { if (all[id]) cb(all[id]); }; subs.push(f); f(load()); return function () { subs = subs.filter(function (x) { return x !== f; }); }; },
    watchAll: function (cb) { var f = function (all) { cb(Object.keys(all).map(function (k) { return all[k]; }).sort(function (a, b) { return b.updatedAt - a.updatedAt; })); }; subs.push(f); f(load()); return function () { subs = subs.filter(function (x) { return x !== f; }); }; }
  };
})();
