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
          <button class="btn" onclick="location.hash='#/stage/${p.id}'">プレイ</button>
        </div>
      `).join('')}
    </div>
  `;
}

/* 以降はあなたの既存 app.js ロジック（normalizeKana / renderStage / 正解判定など）をそのまま。
   ここでは省略しますが、上の safeRender 以外は前回版と同じでOKです。 */


// ===== かな正規化（清音のみ許可） =====
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
  let x = ch.trim(); if (!x) return '';
  // カタカナ→ひらがな
  if (x >= 'ァ' && x <= 'ヶ') x = String.fromCharCode(x.charCodeAt(0) - 0x60);
  // 小文字→基本形
  if (SMALL_MAP[x]) x = SMALL_MAP[x];
  // 濁点・半濁点除去
  if (DAKU_MAP[x]) x = DAKU_MAP[x];
  // 清音ひらがな1文字だけ許可
  if (x.length === 1 && HIRA_SEION.includes(x)) return x;
  return '';
}

// ===== ルーティング =====
window.addEventListener('hashchange', render);
render();

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
    <p class="muted">清音ひらがなのみ。濁点・半濁点・小さい文字は使いません。<br>#=黒マス / .=空欄 / !あ=固定「あ」</p>
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

function renderStage(p){
  const tokenizeRow = window.__CW_TOKENIZE__;
  const rowsTok = p.rows.map(tokenizeRow);
  const solTok  = p.solutionRows.map(tokenizeRow);

  const R = rowsTok.length; const C = rowsTok[0].length;
  const key = `cw_${p.id}_v3`;
  const saved = load(key);
  const state = saved ?? Array.from({length:R*C}, ()=>''); // 各セルの現在入力

  // 盤面HTML
  let html = `
    <div class="toolbar">
      <button id="reset">リセット</button>
      <button id="check">正解チェック</button>
      <span class="result" id="result"></span>
    </div>
    <div class="gridWrap">
      <div class="grid" style="--cols:${C}">
        ${rowsTok.map((row,r)=> row.map((tok,c)=>{
          const idx = r*C + c;
          if (tok === '#'){
            return '<div class="cell block" aria-hidden="true"></div>';
          }
          // 固定文字
          if (tok.startsWith('!') && tok.length === 2){
            const fixedChar = tok[1];
            // 保存値を固定文字で上書き（復元時のズレ防止）
            state[idx] = fixedChar;
            return `<div class="cell"><input data-idx="${idx}" value="${fixedChar}" readonly aria-disabled="true" tabindex="-1"></div>`;
          }
          // 通常の空欄（'.'） or 何か他トークンは空欄扱い
          const val = normalizeKana(state[idx] || '');
          state[idx] = val;
          return `<div class="cell"><input data-idx="${idx}" inputmode="kana" autocomplete="off" autocapitalize="none" spellcheck="false" value="${val}"></div>`;
        }).join('')).join('')}
      </div>
    </div>
  `;
  view.innerHTML = html;

  // 入力イベント
  const inputs = view.querySelectorAll('input[data-idx]');
  inputs.forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const idx = +inp.dataset.idx;
      const n = normalizeKana(inp.value.slice(-1));
      inp.value = n;
      state[idx] = n;
      save(key, state);
      // 次セルへ
      if (n){
        const next = view.querySelector(`input[data-idx="${idx+1}"]`);
        if (next) next.focus();
      }
    });
    inp.addEventListener('keydown', (e)=>{
      const idx = +inp.dataset.idx;
      if (e.key==='Backspace' && !inp.value){
        const prev = view.querySelector(`input[data-idx="${idx-1}"]`);
        if (prev) prev.focus();
      }
      if (e.key==='ArrowRight'){ const n = view.querySelector(`input[data-idx="${idx+1}"]`); if(n) n.focus(); }
      if (e.key==='ArrowLeft'){ const n = view.querySelector(`input[data-idx="${idx-1}"]`); if(n) n.focus(); }
      if (e.key==='ArrowUp'){ const n = view.querySelector(`input[data-idx="${idx-C}"]`); if(n) n.focus(); }
      if (e.key==='ArrowDown'){ const n = view.querySelector(`input[data-idx="${idx+C}"]`); if(n) n.focus(); }
    });
  });

  // リセット
  view.querySelector('#reset').addEventListener('click', ()=>{
    localStorage.removeItem(key);
    renderStage(p);
  });

  // 正解チェック
  view.querySelector('#check').addEventListener('click', ()=>{
    const ok = compareWithSolution(rowsTok, solTok, state);
    const resultEl = document.getElementById('result');
    if (ok.complete){
      resultEl.textContent = '💮 せいかい！';
      resultEl.className = 'result ok';
    } else {
      resultEl.textContent = `未完成：${ok.pending}マス / 間違い：${ok.wrong}マス`;
      resultEl.className = 'result ng';
    }
  });

  // 初期保存（固定文字反映分）
  save(key, state);
}

// rowsTok / solTok はトークン化済み配列
function compareWithSolution(rowsTok, solTok, state){
  const R = rowsTok.length, C = rowsTok[0].length;
  let pending=0, wrong=0, total=0;
  for (let r=0; r<R; r++){
    for (let c=0; c<C; c++){
      const idx = r*C + c;
      const tok = rowsTok[r][c];
      const sol = solTok[r][c];
      if (tok === '#') continue;
      total++;
      const fixed = (tok.startsWith('!') && tok.length===2);
      const expected = fixed ? tok[1] : sol; // 固定はその文字、その他は解答を期待
      const cur = state[idx] || '';
      if (!cur){ pending++; continue; }
      if (cur !== expected){ wrong++; }
    }
  }
  return {complete: pending===0 && wrong===0, pending, wrong, total};
}

function load(k){ try { return JSON.parse(localStorage.getItem(k)||'null'); } catch { return null; } }
function save(k,v){ localStorage.setItem(k, JSON.stringify(v)); setStatus('保存済み（オフライン可）'); }
