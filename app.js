// ==== ルーティング & ビュー ====
const view = document.getElementById('view');
const statusEl = document.getElementById('status');
const homeBtn = document.getElementById('homeBtn');
const offlineBtn = document.getElementById('offlineBtn');

function setStatus(text){ statusEl.textContent = text; }
window.addEventListener('online',  ()=> setStatus('オンライン'));
window.addEventListener('offline', ()=> setStatus('オフライン'));
setStatus(navigator.onLine ? 'オンライン' : 'オフライン');

homeBtn.addEventListener('click', ()=> location.hash = '#/');

offlineBtn.addEventListener('click', ()=> {
  // 全ステージをSWに一括キャッシュさせる（必須ではないが親切）
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type:'PRECACHE_PUZZLES' });
    setStatus('オフライン用に保存中…（このページを一度開けば次回以降も可）');
  } else {
    setStatus('Service Worker 未登録？オンラインで再読み込みしてください');
  }
});

window.addEventListener('hashchange', render);
render();

function render(){
  const hash = location.hash || '#/';
  const m = hash.match(/^#\/stage\/(.+)$/);
  if (m) {
    const id = m[1];
    const puzzle = PUZZLES.find(p=>p.id===id);
    if (!puzzle) { view.innerHTML = `<p>ステージが見つかりません</p>`; return; }
    homeBtn.hidden = false;
    renderStage(puzzle);
  } else {
    homeBtn.hidden = true;
    renderHome();
  }
}

function renderHome(){
  view.innerHTML = `
    <p class="muted">清音ひらがなのみ。濁点・半濁点・小さい文字は使用しません。</p>
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

// ==== 入力制約（清音のみ） ====
// 清音ひらがな一覧
const HIRA_SEION = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
const SMALL_MAP = { 'ゃ':'や','ゅ':'ゆ','ょ':'よ','ぁ':'あ','ぃ':'い','ぅ':'う','ぇ':'え','ぉ':'お','っ':'つ' };
const DAKU_MAP = {
  'が':'か','ぎ':'き','ぐ':'く','げ':'け','ご':'こ',
  'ざ':'さ','じ':'し','ず':'す','ぜ':'せ','ぞ':'そ',
  'だ':'た','ぢ':'ち','づ':'つ','で':'て','ど':'と',
  'ば':'は','び':'ひ','ぶ':'ふ','べ':'へ','ぼ':'ほ',
  'ぱ':'は','ぴ':'ひ','ぷ':'ふ','ぺ':'へ','ぽ':'ほ',
  'ゔ':'う'
};
function normalizeKana(ch){
  if (!ch) return '';
  let x = ch.trim();
  if (!x) return '';
  // ひらがなに限定（カタカナ→ひらがな）
  if (x >= 'ァ' && x <= 'ヶ') x = String.fromCharCode(x.charCodeAt(0) - 0x60);
  // 小文字→大文字相当
  if (SMALL_MAP[x]) x = SMALL_MAP[x];
  // 濁点・半濁点の除去
  if (DAKU_MAP[x]) x = DAKU_MAP[x];
  // 清音ひらがなの1文字だけ許可
  if (x.length === 1 && HIRA_SEION.includes(x)) return x;
  return '';
}

// ==== ステージ描画 ====
function renderStage(p){
  const SIZE = p.size;
  const stateKey = `cw_${p.id}_v1`;
  const saved = load(stateKey);
  const state = saved ?? Array.from({length: SIZE*SIZE}, ()=> '');

  // 盤面
  const gridHTML = Array.from({length: SIZE}).map((_,r)=>{
    return Array.from({length: SIZE}).map((_,c)=>{
      const ch = (p.grid[r] && p.grid[r][c]) || '#';
      const idx = r*SIZE+c;
      if (ch === '#') return `<div class="cell block" aria-hidden="true"></div>`;
      const val = state[idx] || '';
      return `<div class="cell"><input data-idx="${idx}" inputmode="kana" autocomplete="off" autocapitalize="none" spellcheck="false" value="${val}"></div>`;
    }).join('');
  }).join('');

  view.innerHTML = `
    <div class="toolbar">
      <button id="reset">リセット</button>
      <span class="muted">ステージ: ${p.title}</span>
    </div>
    <div class="grid" style="grid-template-columns:repeat(${SIZE},1fr)" aria-label="crossword grid">
      ${gridHTML}
    </div>
  `;

  const inputs = view.querySelectorAll('input[data-idx]');
  inputs.forEach(inp=>{
    inp.addEventListener('input', (e)=>{
      const idx = +inp.dataset.idx;
      const n = normalizeKana(inp.value.slice(-1)); // 末尾1文字を正規化
      inp.value = n;
      state[idx] = n;
      save(stateKey, state);
      // 自動で次マスへ（右方向）
      if (n){
        const next = view.querySelector(`input[data-idx="${idx+1}"]`);
        if (next) next.focus();
      }
    });
    inp.addEventListener('keydown', (e)=>{
      if (e.key === 'Backspace' && !inp.value){
        const prev = view.querySelector(`input[data-idx="${(+inp.dataset.idx)-1}"]`);
        if (prev) prev.focus();
      }
    });
  });

  view.querySelector('#reset').addEventListener('click', ()=>{
    localStorage.removeItem(stateKey);
    renderStage(p);
  });
}

function load(key){
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function save(key, value){
  localStorage.setItem(key, JSON.stringify(value));
  setStatus('保存済み（オフライン可）');
}
