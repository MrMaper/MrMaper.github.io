// MrMaper Blog Admin — local server with username/password login.
// Writes posts to the MrMaper.github.io repo via the GitHub API.
//
// Setup:
//   1) npm install
//   2) Create a GitHub Personal Access Token (repo scope) and put it in a file
//      named .env in this folder:  GITHUB_TOKEN=ghp_xxx
//   3) (optional) set ADMIN_USER / ADMIN_PASS in .env, else defaults below.
//   4) node server.js   ->  open http://localhost:3000
//
// The token stays on the SERVER (never sent to the browser). The browser only
// logs in with your username/password.

const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');

// --- Config (env or defaults) ---
const REPO = 'MrMaper/MrMaper.github.io';
const BRANCH = 'main';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'mrmaper123';
const PORT = process.env.PORT || 3000;

let GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2];
  });
  GITHUB_TOKEN = process.env.GITHUB_TOKEN || GITHUB_TOKEN;
}

if (!GITHUB_TOKEN) {
  console.error('ERROR: GITHUB_TOKEN is not set. Create admin/.env with GITHUB_TOKEN=ghp_xxx');
  process.exit(1);
}

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'mrmaper-secret-change-me',
  resave: false,
  saveUninitialized: false,
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  return res.redirect('/login');
}

// --- Login ---
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});
app.post('/login', (req, res) => {
  const { user, pass } = req.body;
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    req.session.loggedIn = true;
    return res.redirect('/');
  }
  res.send('<p style="font-family:sans-serif;direction:rtl">نام کاربری یا رمز عبور اشتباه است. <a href="/login">بازگشت</a></p>');
});
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// --- Editor ---
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'editor.html'));
});

// --- API: list posts ---
app.get('/api/posts', requireAuth, async (req, res) => {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/_posts?ref=${BRANCH}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}`, 'User-Agent': 'mrmaper-admin' },
    });
    const j = await r.json();
    if (!Array.isArray(j)) return res.json([]);
    const posts = j
      .filter((f) => f.name.endsWith('.md'))
      .map((f) => ({ name: f.name, path: f.path, sha: f.sha }))
      .sort((a, b) => b.name.localeCompare(a.name));
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- API: get one post content ---
app.get('/api/post', requireAuth, async (req, res) => {
  const p = req.query.path;
  if (!p) return res.status(400).json({ error: 'path required' });
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(p)}?ref=${BRANCH}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}`, 'User-Agent': 'mrmaper-admin' },
    });
    const j = await r.json();
    const content = Buffer.from(j.content, 'base64').toString('utf8');
    res.json({ content, sha: j.sha, path: p });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- API: create or update post ---
app.post('/api/post', requireAuth, async (req, res) => {
  const { date, slug, titleEn, titleFa, tags, excerptEn, excerptFa, bodyEn, bodyFa, sha } = req.body;
  if (!date || !slug) return res.status(400).json({ error: 'date and slug required' });

  const fm = [];
  fm.push('---');
  fm.push('layout: post');
  fm.push(`title: "${String(titleEn || '').replace(/"/g, '\\"')}"`);
  if (titleFa) fm.push(`title_fa: "${String(titleFa).replace(/"/g, '\\"')}"`);
  fm.push(`date: ${date}`);
  if (tags && tags.length) {
    const tagArr = tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tagArr.length) fm.push(`tags: [${tagArr.map((t) => `"${t}"`).join(', ')}]`);
  }
  if (excerptEn) fm.push(`description: "${String(excerptEn).replace(/"/g, '\\"')}"`);
  if (excerptFa) fm.push(`description_fa: "${String(excerptFa).replace(/"/g, '\\"')}"`);
  fm.push('---');
  fm.push('');
  if (bodyEn) fm.push(bodyEn);
  if (bodyFa) { fm.push(''); fm.push('<!-- fa -->'); fm.push(bodyFa); }
  const content = fm.join('\n');

  const pathFile = `_posts/${date}-${slug}.md`;
  const body = {
    message: `Post: ${slug}`,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${pathFile}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'mrmaper-admin',
      },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (j.commit) res.json({ ok: true, path: pathFile });
    else res.status(400).json({ error: j.message || 'failed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`MrMaper admin running at http://localhost:${PORT}`);
  console.log(`Login with user="${ADMIN_USER}" pass="${ADMIN_PASS}"`);
});