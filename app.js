const view = document.getElementById('view');
const statusEl = document.getElementById('status');
const homeBtn = document.getElementById('homeBtn');
const offlineBtn = document.getElementById('offlineBtn');


function setStatus(t){ statusEl.textContent = t; }
window.addEventListener('online', ()=> setStatus('オンライン'));
window.addEventListener('offline', ()=> setStatus('オフライン'));
setStatus(navigator.onLine ? 'オンライン' : 'オフライン');


homeBtn.addEventListener('click', ()=> location.hash = '#/');
offlineBtn.addEventListener('click', ()=> {
if (navigator.serviceWorker?.controller) {
navigator.serviceWorker.controller.postMessage({ type:'PRECACHE_PUZZLES' });
setStatus('オフライン用に保存中…');
} else {
setStatus('Service Worker 未登録。オンラインで再読込してください');
}
});


// ===== 入力制約（清音のみ） =====
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
function save(k,v){ localStorage.setItem(k, JSON.stringify(v)); setStatus('保存済み（オフライン可）'); }
