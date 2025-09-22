const view = document.getElementById('view');
const statusEl = document.getElementById('status');
const homeBtn = document.getElementById('homeBtn');
const offlineBtn = document.getElementById('offlineBtn');
const updateBtn = document.getElementById('updateBtn');
const hardResetBtn = document.getElementById('hardResetBtn');

function setStatus(t){ if(statusEl) statusEl.textContent = t; }
window.addEventListener('online',  ()=> setStatus('オンライン'));
window.addEventListener('offline', ()=> setStatus('オフライン'));
setStatus(navigator.onLine ? 'オンライン' : 'オフライン');

homeBtn?.addEventListener('click', ()=> location.hash = '#/');
offlineBtn?.addEventListener('click', ()=> {
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type:'PRECACHE_SHELL' });
    setStatus('オフライン用に保存中…');
  } else {
    setStatus('Service Worker 未登録。オンラインで再読込してください');
  }
});

// 1) “アップデート”ボタン：SWの更新チェック→新SWを即適用→自動リロード
updateBtn?.addEventListener('click', async ()=>{
  try {
    if (!('serviceWorker' in navigator)) { hardReload(); return; }

    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) { hardReload(); return; }

    // 新しいSW検出時のハンドラ
    reg.addEventListener('updatefound', ()=>{
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', ()=>{
        if (nw.state === 'installed') {
          // 既存SWあり＝新バージョンが入った → すぐ適用してリロード
          if (navigator.serviceWorker.controller) {
            nw.postMessage({ type:'SKIP_WAITING' });
          }
        }
      });
    });

    setStatus('更新を確認中…');
    await reg.update(); // ネットに取りに行く

    // controllerchange で1回だけリロード
    const onCC = ()=> { navigator.serviceWorker.removeEventListener('controllerchange', onCC); location.reload(); };
    navigator.serviceWorker.addEventListener('controllerchange', onCC);

    // 念のため、主要ファイルを “cache: reload” で先読み（ネット優先）
    await Promise.allSettled([
      fetch('./index.html', {cache:'reload'}),
      fetch('./app.js',     {cache:'reload'}),
      fetch('./puzzles.js', {cache:'reload'}),
      fetch('./sw.js',      {cache:'reload'}),
    ]);
    setStatus('最新を適用中…');

    // 万一 update で新SWが来なかったケース：手動ハードリロード
    setTimeout(()=>{ location.reload(); }, 1500);
  } catch (e){
    console.error(e);
    hardReload();
  }
});

// 2) “キャッシュ全消去”ボタン：SWに指示→全キャッシュ削除＆登録解除→ページ再読込
hardResetBtn?.addEventListener('click', async ()=>{
  setStatus('キャッシュを削除中…');
  try {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type:'HARD_RESET' });
      // SW側で削除→unregister→postMessageの後、少し待ってからリロード
      setTimeout(()=> location.reload(), 800);
    } else {
      await clearAllCachesAndUnregister();
      location.reload();
    }
  } catch (e){
    console.error(e);
    await clearAllCachesAndUnregister();
    location.reload();
  }
});

async function clearAllCachesAndUnregister(){
  if ('caches' in window){
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }
  if ('serviceWorker' in navigator){
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
  }
}
function hardReload(){ location.reload(true); }

/* ===== かな正規化（既存） ===== */
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
  if (x >= 'ァ' && x <= 'ヶ') x = String.fromCharCode(x.charCodeAt(0) - 0x60);
  if (SMALL_MAP[x]) x = SMALL_MAP[x];
  if (DAKU_MAP[x]) x = DAKU_MAP[x];
