/*
  puzzles.js の書き方（量産しやすいDSL）

  記号の意味：
  - '#' : 黒マス（入力不可）
  - '.' : 空欄（プレイヤーが入力するマス）
  - '!あ': 固定文字「あ」（最初から埋まっていて編集不可）※'!'+清音ひらがな1文字
  - solutionRows: 正解文字列（黒マスは '#', それ以外は清音ひらがな1文字）

  ルール：
  - rows と solutionRows は同じサイズ・同じ行数列数であること。
  - solutionRows の非黒マスは必ず清音ひらがな1文字。
  - rows 側は '.', '#', '!あ' のみを推奨（通常は '.' で空欄を作り、必要部分だけ '!あ' を使う）。
*/

const P = (id, title, rows, solutionRows) => ({
  id, title, rows, solutionRows,
  size: { r: rows.length, c: tokenizeRow(rows[0]).length }
});

// 文字列1行をトークン配列に（'!あ' を1セルとして扱う）
function tokenizeRow(rowStr){
  const out = [];
  for (let i=0; i<rowStr.length; i++){
    const ch = rowStr[i];
    if (ch === '!'){
      const next = rowStr[i+1] || '';
      out.push('!' + next);
      i++;
    } else {
      out.push(ch);
    }
  }
  return out;
}

const PUZZLES = [
  // ステージ1：5x5（固定文字あり）
  P('stage1', 'ステージ1（5x5）', [
    // 例：「あいさつ」を十字で作るイメージ（!あ を固定表示）
    '!あ.#.#',
    '.#.!い#',
    '.!.!.!.',
    '#!さ#.!',
    '#.#.!つ'
  ], [
    // 正解（清音のみ）。'#' 以外は1文字ずつ。
    'あ.#.#',
    '.#.い#',
    '.さ.つ.',
    '#さ#.い',
    '#.#.つ'
  ]),

  // ステージ2：7x7（固定なしのオーソドックス）
  P('stage2', 'ステージ2（7x7）', [
    '...#...','#..#..#','...#...','#######','...#...','#..#..#','...#...'
  ], [
    'あいえ#おかき',
    '#く#け#こ#さ#',
    'しすせ#そたち',
    '#######',
    'つてと#なにぬ',
    '#ね#の#は#ひ#',
    'ふへほ#まみむ'
  ])
];

// エクスポート（他ファイルから tokenize を使うのでグローバルに出す）
window.__CW_TOKENIZE__ = tokenizeRow;
