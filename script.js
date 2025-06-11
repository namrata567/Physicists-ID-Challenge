// script.js

// --- 1. DOM elements ---
const topicInput   = document.getElementById('topic-input');
const loadTopicBtn = document.getElementById('load-topic-btn');
const imgEl        = document.getElementById('scientist-img');
const infoEl       = document.getElementById('info');
const inputEl      = document.getElementById('guess-input');
const submitBtn    = document.getElementById('submit-btn');
const feedbackEl   = document.getElementById('feedback');
const scoreEl      = document.getElementById('score');
const nextBtn      = scoreEl.nextElementSibling; // the “Next” button
const stopBtn      = document.getElementById('stop-btn'); // New stop button

// --- 2. State ---
let scientists      = [];
let currentPick     = null;  // { name, thumbnail }
let score           = 0;
let quizActive      = false;
const studiedSet    = new Set(); // track unique scientists studied

// --- 3. Helpers: Wikipedia API calls ---
async function fetchCategoryMembers(categoryTitle) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    origin: '*', action: 'query', list: 'categorymembers',
    cmtitle: categoryTitle, cmnamespace: '0', cmlimit: '500', format: 'json'
  });
  const res  = await fetch(url);
  const data = await res.json();
  return (data.query.categorymembers || []).map(m => m.title);
}

async function fetchSearchResults(query) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    origin: '*', action: 'query', list: 'search',
    srsearch: query, srnamespace: '0', srlimit: '500', format: 'json'
  });
  const res  = await fetch(url);
  const data = await res.json();
  return (data.query.search || []).map(s => s.title);
}

async function fetchThumbnail(title) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    origin: '*', action: 'query', titles: title,
    prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '300',
    redirects: '1', format: 'json'
  });
  const res  = await fetch(url);
  const data = await res.json();
  const page = Object.values(data.query.pages)[0];
  return page && page.thumbnail ? page.thumbnail.source : null;
}

async function fetchFullText(title, count = 10) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    origin: '*', action: 'query', titles: title,
    prop: 'extracts', explaintext: '1', exsentences: String(count),
    redirects: '1', format: 'json'
  });
  const res  = await fetch(url);
  const data = await res.json();
  const page = Object.values(data.query.pages)[0];
  return page && page.extract ? page.extract : '';
}

// --- 4. Build the filtered scientist list ---
async function loadPhysicistsByTopic(topic) {
  const catTitle = `Category:${topic.trim()} physicists`;
  let titles = await fetchCategoryMembers(catTitle);
  if (!titles.length) titles = await fetchSearchResults(`${topic} physicist`);
  scientists = titles;
}

// --- 5. Pick random scientist and prepare ---
async function pickRandomWithPhoto() {
  for (let i = 0; i < 10; i++) {
    const name  = scientists[Math.floor(Math.random() * scientists.length)];
    const thumb = await fetchThumbnail(name);
    if (thumb) return { name, thumbnail: thumb };
  }
  const fbName  = scientists[0];
  const fbThumb = await fetchThumbnail(fbName);
  return { name: fbName, thumbnail: fbThumb };
}

// --- 6. Display the next quiz item (image only) ---
async function showNext() {
  inputEl.value        = '';
  feedbackEl.textContent = '';
  infoEl.textContent     = '';
  submitBtn.disabled     = true;
  inputEl.disabled       = true;
  imgEl.style.visibility  = 'hidden';

  currentPick = await pickRandomWithPhoto();
  studiedSet.add(currentPick.name);
  scoreEl.textContent = score;
  imgEl.alt           = '';
  imgEl.src           = currentPick.thumbnail || '';
  imgEl.onload       = () => imgEl.style.visibility = 'visible';

  submitBtn.disabled = false;
  inputEl.disabled   = false;
}

// --- 7. Quiz control functions ---
function startQuiz() {
  if (quizActive || !scientists.length) return;
  quizActive            = true;
  score                 = 0;
  studiedSet.clear();
  scoreEl.textContent   = score;
  nextBtn.style.display = 'inline-block';
  stopBtn.style.display = 'inline-block';
  showNext();
}

function stopQuiz() {
  if (!quizActive) return;
  quizActive = false;
  imgEl.src  = '';
  const count = studiedSet.size;
  feedbackEl.textContent = `Quiz stopped. You studied ${count} scientists this session.`;
  submitBtn.disabled     = true;
  inputEl.disabled       = true;
  nextBtn.style.display  = 'none';
  stopBtn.style.display  = 'none';
  infoEl.textContent     = '';
}

async function checkGuess() {
  const guess = inputEl.value.trim().toLowerCase();
  if (!guess) return;

  if (guess === currentPick.name.toLowerCase()) {
    feedbackEl.textContent = '✅ Correct!';
    score++;
  } else {
    feedbackEl.textContent = `❌😔 Nope—it’s ${currentPick.name}.`;
  }
  scoreEl.textContent = score;

  // Fetch and display a full paragraph of info
  const fullText = await fetchFullText(currentPick.name, 10);
  infoEl.textContent = fullText;

  submitBtn.disabled = true;
  inputEl.disabled   = true;
}

// --- 8. Event listeners ---
loadTopicBtn.addEventListener('click', async () => {
  const topic = topicInput.value.trim();
  if (!topic) {
    feedbackEl.textContent = 'Please enter a field (e.g. "Quantum").';
    return;
  }
  feedbackEl.textContent   = 'Loading…';
  loadTopicBtn.disabled    = true;
  try {
    await loadPhysicistsByTopic(topic);
    if (!scientists.length) {
      feedbackEl.textContent = `No physicists found for “${topic}.”`;
    } else {
      feedbackEl.textContent = `Found ${scientists.length} "${topic}" physicists.`;
      startQuiz();
    }
  } catch (err) {
    console.error(err);
    feedbackEl.textContent = 'Error loading topic.';
  } finally {
    loadTopicBtn.disabled = false;
  }
});

submitBtn.addEventListener('click', checkGuess);
nextBtn.addEventListener('click', () => quizActive && showNext());
stopBtn.addEventListener('click', stopQuiz);

// --- 9. Initialize ---
window.addEventListener('DOMContentLoaded', () => {
  submitBtn.disabled     = true;
  inputEl.disabled       = true;
  nextBtn.style.display  = 'none';
  stopBtn.style.display  = 'none';
  imgEl.style.visibility = 'hidden';
  feedbackEl.textContent = 'Enter a field and click Load to begin!';
});


