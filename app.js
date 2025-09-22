const view = document.getElementById('view');
const statusEl = document.getElementById('status');
const homeBtn = document.getElementById('homeBtn');
const offlineBtn = document.getElementById('offlineBtn');

function setStatus(t){ if(statusEl) statusEl.textContent = t; }
window.addEventListener('online',  ()=> setStatus('オンライン'));
window.addEventListener('offline', ()=> setStatus('オフライン'));
setStatus(navigator.onLine ? 'オンライン' : 'オフライン');

homeBtn?.addEventListener('click', ()=> location.hash = '#/');
offlineBtn?.addEventListener('click', ()=> {
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type:'PRECACHE_PUZZLES' });
    setStatus('オフライン用に保存中…');
  } else {
    setStatus('Service Worker 未登録。オンラインで再読込してください');
  }
});

// ===== 安全にレンダリング（PUZZLES 未定義や例外をUI表示） =====
window.addEventListener('hashchange', safeRender);
safeRender();

function safeRender(){
  try {
    if (!window.PUZZLES || !Array.isArray(window.PUZZLES)) {
      view.innerHTML = `
        <div class="card">
          <div style="color:#fca5a5;font-weight:700">puzzles.js が読み込めていません。</div>
          <div style="color:#9ca3af;font-size:14px;margin-top:6px">
            ・<code>puzzles.js</code> のパス/ファイル名を確認（<code>./puzzles.js</code>）<br>
            ・HTTPS（または <code>localhost</code>）で配信し、<code>file://</code> 直開きは避ける<br>
            ・文法エラー（カンマ/クオート）を確認
          </div>
        </div>`;
      return;
    }
    render();
  } catch (err){
    console.error(err);
    view.innerHTML = `
      <div class="card">
        <div style="color:#fca5a5;font-weight:700">レンダリング中にエラー：</div>
        <pre style="white-space:pre-wrap;color:#e5e7eb;background:#0b1220;padding:8px;border-radius:8px">${String(err)}</pre>
      </div>`;
  }
}

function render(){
  const hash = location.hash || '#/';
  const m = hash.match(/^#\/stage\/(.+)$/);
  if (m){
    const id = m[1];
    const p = PUZZLES.find(x => x.id === id);
    if (!p) { view.innerHTML = '<p>ステージが見つかりません</p>'; return; }
    homeBtn.hidden = false;
    renderStage(p);
  } else {
    homeBtn.hidden = true;
    renderHome();
  }
}

function renderHome(){
  view.innerHTML = `
    <p class="status">清音ひらがなのみ（#=黒マス / .=空欄 / !あ=固定）</p>
    <div class="list">
      ${PUZZLES.map(p => `
        <div class="card">
          <div style="font-weight:700;margin-bottom:8px">${p.title}</div>
          <a class="btn" href="#/stage/${p.id}">プレイ</a>
        </div>
      `).join('')}
    </div>
  `;
}

/* 以降はあなたの既存 app.js ロジック（normalizeKana / renderStage / 正解判定など）をそのまま。
   ここでは省略しますが、上の safeRender 以外は前回版と同じでOKです。 */
