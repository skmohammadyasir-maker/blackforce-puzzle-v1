/*  ---------------------------
    BLACK FORCE 007 — Puzzle
    Features:
      - 12-piece shuffle & swap
      - Timer, Moves, Score formula
      - Save scores to Supabase leaderboard
      - Mobile friendly & theming
    --------------------------- */

const pieces = [
 "https://collection.cloudinary.com/dajuuabos/fc4f98f02bf7a07883d21b00c0a2310d",
 "https://collection.cloudinary.com/dajuuabos/d692bfb754c6918b77ef38adbbd69105",
 "https://collection.cloudinary.com/dajuuabos/e6bd9b86a80c0185f80cc1ac4e11c89b",
 "https://collection.cloudinary.com/dajuuabos/fb4dba207e095fb5dfd88cf8be3f4e56",
 "https://collection.cloudinary.com/dajuuabos/864a1a22b4c19ba07768db60f0fb2a3a",
 "https://collection.cloudinary.com/dajuuabos/6646f090988fc7bc8fecfdb63180f74f",
 "https://collection.cloudinary.com/dajuuabos/597cafb3ff09ec6ab50f4b93fa3d5012",
 "https://collection.cloudinary.com/dajuuabos/b037f8c35f822ddb9107ff9e075a8a81",
 "https://collection.cloudinary.com/dajuuabos/1255fecc12fbeaf0c270ef13efa52d36",
 "https://collection.cloudinary.com/dajuuabos/77daaaba011182999e4abd29b4c8a513",
 "https://collection.cloudinary.com/dajuuabos/bc9d735971ce65394fe48b5289b4c68f",
 "https://collection.cloudinary.com/dajuuabos/33eec58cfb73fbaabb785aa285f6e64b"
];

// ---- Supabase config (REPLACE with your keys) ----
const SUPABASE_URL = "https://YOUR_SUPABASE_URL.supabase.co";
const SUPABASE_ANON = "YOUR_SUPABASE_ANON_KEY";

/* 1) Create client
   - Go to supabase.com -> create new project -> Database -> Table 'leaderboard'
   - Table schema: id (uuid), name (text), score (int), time_sec (int), moves (int), created_at (timestamp)
*/
const supabase = supabaseJs.createClient ? supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON) : supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// elements
const board = document.getElementById('board');
const startBtn = document.getElementById('startBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const timerEl = document.getElementById('timer');
const movesEl = document.getElementById('moves');
const scoreEl = document.getElementById('score');
const saveBtn = document.getElementById('saveScoreBtn');
const playerNameInput = document.getElementById('playerName');
const leaderList = document.getElementById('leaderList');
const themeSelect = document.getElementById('themeSelect');
const brandLogo = document.getElementById('brandLogo');

let order = [];      // correct order indices 0..11
let current = [];    // current order
let selected = null;
let moves = 0;
let startTs = 0;
let timerInterval = null;
let score = 0;

// initial theme
applyTheme('dark');

function applyTheme(t){
  document.documentElement.classList.remove('theme-metal','theme-neon');
  if(t === 'metal') document.documentElement.classList.add('theme-metal');
  if(t === 'neon') document.documentElement.classList.add('theme-neon');
}
themeSelect.addEventListener('change', e => applyTheme(e.target.value));

// build board html
function buildBoard(){
  board.innerHTML = '';
  for(let i=0;i<pieces.length;i++){
    const img = document.createElement('img');
    img.className = 'piece';
    img.draggable = false;
    img.dataset.index = i; // initial index
    img.addEventListener('click', onPieceClick);
    board.appendChild(img);
  }
}

// shuffle array helper
function shuffleArr(a){
  const arr = a.slice();
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// start game
function startGame(){
  // set correct order
  order = [...Array(pieces.length).keys()];
  current = shuffleArr(order);

  // render images by current order
  const imgs = board.querySelectorAll('.piece');
  imgs.forEach((img, idx) => {
    const pieceIndex = current[idx];
    img.src = pieces[pieceIndex];
    img.dataset.pos = idx;
    img.dataset.piece = pieceIndex;
    img.classList.remove('selected');
  });

  moves = 0; updateMoves();
  score = 0; updateScore();
  startTs = Date.now();
  if(timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 500);
  saveBtn.disabled = true;
}

// update timer display
function updateTimer(){
  const secs = Math.floor((Date.now() - startTs)/1000);
  timerEl.textContent = formatTime(secs);
}

// format seconds to mm:ss
function formatTime(s){
  const m = Math.floor(s/60).toString().padStart(2,'0');
  const ss = (s%60).toString().padStart(2,'0');
  return `${m}:${ss}`;
}

function updateMoves(){ movesEl.textContent = `Moves: ${moves}`; }
function updateScore(){ scoreEl.textContent = `Score: ${score}`; }

// piece click handler (tap to select and swap)
function onPieceClick(e){
  const img = e.currentTarget;
  if(selected === null){
    selected = img;
    img.classList.add('selected');
    return;
  }
  if(selected === img){
    img.classList.remove('selected');
    selected = null;
    return;
  }

  // swap piece data and src
  const other = img;
  const aPos = selected.dataset.pos, bPos = other.dataset.pos;
  const aPiece = selected.dataset.piece, bPiece = other.dataset.piece;

  // visually swap
  const aSrc = selected.src, bSrc = other.src;
  selected.src = bSrc;
  other.src = aSrc;

  // swap data attributes
  selected.dataset.piece = bPiece;
  other.dataset.piece = aPiece;

  selected.classList.remove('selected');
  selected = null;

  moves++;
  updateMoves();

  // scoring: base + time bonus - move penalty
  const elapsed = Math.max(1, Math.floor((Date.now() - startTs)/1000));
  const timeBonus = Math.max(0, Math.round(500 - elapsed)); // faster -> bigger
  const movePenalty = moves * 5;
  score = Math.max(0, 1000 + timeBonus - movePenalty);
  updateScore();

  // check win
  checkWin();
}

function checkWin(){
  const imgs = board.querySelectorAll('.piece');
  let won = true;
  imgs.forEach((img, idx) => {
    if(parseInt(img.dataset.piece) !== idx) won = false;
  });
  if(won){
    clearInterval(timerInterval);
    const totalSec = Math.floor((Date.now() - startTs)/1000);
    // final score refine
    const finalScore = Math.max(0, Math.round(score + Math.max(0, 500 - totalSec) - moves*2));
    score = finalScore;
    updateScore();
    saveBtn.disabled = false;
    alert(`You solved it!\nTime: ${formatTime(totalSec)}\nMoves: ${moves}\nScore: ${score}`);
  }
}

// shuffle in-place (just reshuffle current)
function shuffleBoard(){
  current = shuffleArr(order);
  const imgs = board.querySelectorAll('.piece');
  imgs.forEach((img, idx) => {
    const pieceIndex = current[idx];
    img.src = pieces[pieceIndex];
    img.dataset.piece = pieceIndex;
    img.dataset.pos = idx;
    img.classList.remove('selected');
  });
  moves = 0; updateMoves();
  score = 0; updateScore();
  startTs = Date.now();
  if(timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 500);
  saveBtn.disabled = true;
}

// Save to Supabase leaderboard
async function saveScoreToSupabase(){
  if(!SUPABASE_URL || !SUPABASE_ANON || SUPABASE_URL.includes("YOUR_")) {
    alert("Supabase not configured. Replace SUPABASE_URL and SUPABASE_ANON in script.js with your project keys.");
    return;
  }
  const name = (playerNameInput.value || "Guest").trim().slice(0,30);
  const timeSec = Math.floor((Date.now() - startTs)/1000);
  const { data, error } = await supabase.from('leaderboard').insert([{ name, score, time_sec: timeSec, moves }]);
  if(error){
    console.error(error);
    alert("Failed to save score: " + error.message);
  } else {
    alert("Score saved! Check leaderboard.");
    fetchLeaderboard();
    saveBtn.disabled = true;
  }
}

// fetch leaderboard top 10
async function fetchLeaderboard(){
  if(!SUPABASE_URL || !SUPABASE_ANON || SUPABASE_URL.includes("YOUR_")) {
    // show demo placeholder
    leaderList.innerHTML = `<li>Supabase not configured — leaderboard disabled</li>`;
    return;
  }
  const { data, error } = await supabase
    .from('leaderboard')
    .select('name,score, time_sec, moves')
    .order('score', { ascending: false })
    .limit(10);

  if(error){ console.error(error); return; }
  leaderList.innerHTML = '';
  data.forEach(row => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${escapeHtml(row.name)}</span> <strong>${row.score}</strong>`;
    leaderList.appendChild(li);
  });
}

// small sanitize
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// event bindings
startBtn.addEventListener('click', startGame);
shuffleBtn.addEventListener('click', shuffleBoard);
saveBtn.addEventListener('click', saveScoreToSupabase);

// initial render
buildBoard();
// auto fetch leaderboard every 6s
setInterval(fetchLeaderboard, 6000);
fetchLeaderboard();
