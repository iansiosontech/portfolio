/**
 * terminal.js — KristofferOS Interactive Terminal
 * Scroll approach: the input line is ALWAYS the last child,
 * and we use a dedicated invisible anchor div at the very
 * bottom that we scrollIntoView() — this works 100% regardless
 * of container height, overflow, or flex settings.
 */

(() => {
  'use strict';

  const termEl  = document.getElementById('terminal');
  const wrapper = document.getElementById('computerWrapper');
  const hint    = wrapper ? wrapper.querySelector('.click-hint') : null;

  if (!termEl || !wrapper) return;

  /* ── State ── */
  let isActive       = false;
  let currentInput   = '';
  let cmdHistory     = [];
  let historyIdx     = -1;
  let matrixMode     = false;
  let matrixTimer    = null;

  /* ── Invisible scroll anchor ── */
  const anchor = document.createElement('div');
  anchor.id = 'termAnchor';
  anchor.style.cssText = 'height:1px;width:100%;flex-shrink:0;';

  /* ── The ONE scroll function ── */
  function goToBottom() {
    termEl.appendChild(anchor);
    termEl.scrollTop = termEl.scrollHeight;
}

  /* ── Escape HTML ── */
  function esc(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ── Append a single output line ── */
  function addLine(html) {
    const d = document.createElement('div');
    d.className = 'term-line';
    d.innerHTML = html;
    // Insert BEFORE anchor so anchor stays last
    termEl.insertBefore(d, anchor);
    goToBottom();
  }

  /* ── Append multiple output lines ── */
  function addLines(lines) {
    if (!lines) return;
    lines.forEach(html =>
      addLine(`<span class="term-output">${html}</span>`)
    );
  }

  /* ── Render the input prompt at the bottom ── */
  function renderPrompt() {
    const old = document.getElementById('activeInputLine');
    if (old) old.remove();

    const d = document.createElement('div');
    d.className = 'term-input-line';
    d.id = 'activeInputLine';
    d.innerHTML =
      `<span class="term-prompt">visitor</span>` +
      `<span style="color:var(--color-muted)">@</span>` +
      `<span class="term-path">kristoffer-os</span>` +
      `<span style="color:var(--color-muted)">:~$&nbsp;</span>` +
      `<span class="term-input-display" id="termText">${esc(currentInput)}</span>` +
      `<span class="term-cursor-blink"></span>`;

    // Insert BEFORE anchor
    termEl.insertBefore(d, anchor);
    goToBottom();
  }

  /* ── Boot greeting ── */
  const GREETING = [
    '<span class="term-greeting">╔══════════════════════════════════════════════╗</span>',
    '<span class="term-greeting">║&nbsp;&nbsp; KristofferOS v2.0 — Welcome, Visitor!&nbsp;&nbsp;&nbsp;&nbsp;║</span>',
    '<span class="term-greeting">║&nbsp;&nbsp; Type <span class="term-info">help</span> to see available commands.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ║</span>',
    '<span class="term-greeting">╚══════════════════════════════════════════════╝</span>',
    '',
  ];

  function initTerminal() {
    termEl.innerHTML = '';
    termEl.appendChild(anchor); // anchor first
    currentInput = '';
    GREETING.forEach(html =>
      addLine(`<span class="term-output">${html}</span>`)
    );
    renderPrompt();
  }

  /* ── Commands ── */
  const COMMANDS = {
    help: () => [
      '<span class="term-info">Available commands:</span>',
      '&nbsp;&nbsp;<span class="term-success">about</span>      — Who is Kristoffer?',
      '&nbsp;&nbsp;<span class="term-success">skills</span>     — Tech stack &amp; tools',
      '&nbsp;&nbsp;<span class="term-success">projects</span>   — Notable projects',
      '&nbsp;&nbsp;<span class="term-success">contact</span>    — How to reach me',
      '&nbsp;&nbsp;<span class="term-success">socials</span>    — Social media links',
      '&nbsp;&nbsp;<span class="term-success">whoami</span>     — Display visitor info',
      '&nbsp;&nbsp;<span class="term-success">date</span>       — Current date/time',
      '&nbsp;&nbsp;<span class="term-success">joke</span>       — A dev joke 😄',
      '&nbsp;&nbsp;<span class="term-success">matrix</span>     — Go deeper into the rabbit hole',
      '&nbsp;&nbsp;<span class="term-success">clear</span>      — Clear the terminal',
    ],

    about: () => [
      '<span class="term-info">$ cat about.txt</span>',
      'Name&nbsp;&nbsp;&nbsp;&nbsp;: Kristoffer Ian Sioson',
      'Role&nbsp;&nbsp;&nbsp;&nbsp;: Software Engineer',
      'Location: Philippines 🇵🇭',
      'Mission : Building elegant software that matters.',
      'Status&nbsp;&nbsp;: <span class="term-success">Open to opportunities ✓</span>',
    ],

    skills: () => [
      '<span class="term-info">$ ls ./skills/ --all</span>',
      '<span class="term-success">── Languages</span>&nbsp;&nbsp; JavaScript  TypeScript  Python  SQL',
      '<span class="term-success">── Frontend</span>&nbsp;&nbsp;&nbsp; React  Next.js  Tailwind  D3.js',
      '<span class="term-success">── Backend</span>&nbsp;&nbsp;&nbsp;&nbsp; Node.js  FastAPI  GraphQL  REST',
      '<span class="term-success">── Databases</span>&nbsp;&nbsp; MongoDB  PostgreSQL  Redis  Firebase',
      '<span class="term-success">── DevOps</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Docker  AWS  Git  Linux  CI/CD',
    ],

    projects: () => [
      '<span class="term-info">$ git log --oneline --all</span>',
      '<span class="term-success">a1b2c3d</span> 🛒 E-Commerce Platform',
      '<span class="term-success">e4f5g6h</span> 📊 Analytics Dashboard',
      '<span class="term-success">i7j8k9l</span> 🤖 AI Chat Assistant',
      '<span class="term-success">m0n1o2p</span> 📱 Task Management App',
      '<span class="term-success">q3r4s5t</span> 🔐 Auth Microservice',
      '<span class="term-success">u6v7w8x</span> 🌐 Portfolio CMS',
      '<span class="term-comment">// Scroll down on the page to see full details</span>',
    ],

    contact: () => [
      '<span class="term-info">$ cat contact.json</span>',
      '{',
      '&nbsp;&nbsp;<span class="term-success">"email"</span>    : "ianzsioszon@gmail.com",',
      '&nbsp;&nbsp;<span class="term-success">"instagram"</span>: "@nai.ts03",',
      '&nbsp;&nbsp;<span class="term-success">"facebook"</span> : "facebook.com/non.trid.1",',
      '&nbsp;&nbsp;<span class="term-success">"github"</span>   : "github.com/iansiosontech"',
      '}',
    ],

    socials: () => [
      '<span class="term-info">$ open ./socials/</span>',
      '📸 <span class="term-success">Instagram</span> : instagram.com/nai.ts03',
      '📘 <span class="term-success">Facebook</span>  : facebook.com/non.trid.1',
      '🐙 <span class="term-success">GitHub</span>    : github.com/iansiosontech',
      '💼 <span class="term-success">LinkedIn</span>  : linkedin.com/in/kristoffer-ian-sioson',
    ],

    whoami: () => [
      '<span class="term-success">visitor@kristoffer-os</span>',
      'You are a valued guest exploring this portfolio.',
      'Feel free to scroll, click, and reach out! 👋',
    ],

    date: () => [
      `<span class="term-success">${new Date().toString()}</span>`,
    ],

    joke: () => {
      const jokes = [
        'Why do programmers prefer dark mode?\n<span class="term-info">Light attracts bugs.</span>',
        'Why do Java developers wear glasses?\n<span class="term-info">Because they don\'t C#.</span>',
        'There are only 10 types of people:\n<span class="term-info">those who understand binary, and those who don\'t.</span>',
        '99 little bugs in the code…\n<span class="term-info">Take one down — 127 bugs in the code.</span>',
        'A SQL query walks into a bar…\n<span class="term-info">"Can I JOIN you?"</span>',
      ];
      return [jokes[Math.floor(Math.random() * jokes.length)]];
    },

    matrix: () => {
      startMatrix();
      return ['<span class="term-info">Initialising Matrix… press any key to exit.</span>'];
    },

    clear: () => {
      termEl.innerHTML = '';
      termEl.appendChild(anchor);
      renderPrompt();
      return null;
    },
  };

  /* ── Execute a command ── */
  function execute(raw) {
    const cmd = raw.trim().toLowerCase();

    // Freeze current prompt (remove cursor + id)
    const active = document.getElementById('activeInputLine');
    if (active) {
      active.id = '';
      const blink = active.querySelector('.term-cursor-blink');
      if (blink) blink.remove();
      // Added here to fix the issue of the prompt going back to the first line yes fucking shit finally i think
      const oldText = active.querySelector('#termText');
      if (oldText) oldText.removeAttribute('id');
    }

    const fn = COMMANDS[cmd];
    if (fn) {
      const result = fn();
      addLines(result);
    } else if (cmd !== '') {
      addLines([
        `<span class="term-error">command not found: ${esc(raw)}</span> — type <span class="term-info">help</span>`,
      ]);
    }

    if (cmd !== 'clear') renderPrompt();
  }

  /* ── Matrix ── */
  const MC = 'アイウエオカキクケコ0123456789ABCDEF<>{}[]'.split('');

  function startMatrix() {
    matrixMode = true;
    matrixTimer = setInterval(() => {
      const row = document.createElement('div');
      row.innerHTML =
        `<span style="color:var(--color-green);opacity:${Math.random().toFixed(2)}">` +
        Array.from({ length: 45 }, () => MC[Math.floor(Math.random() * MC.length)]).join(' ') +
        '</span>';
      termEl.insertBefore(row, anchor);
      goToBottom();
    }, 80);
    setTimeout(stopMatrix, 4000);
  }

  function stopMatrix() {
    if (!matrixMode) return;
    matrixMode = false;
    clearInterval(matrixTimer);
    renderPrompt();
  }

  /* ── Flash a key on the visual keyboard ── */
  function flashKey(key) {
    const el = document.querySelector(`.key[data-key="${key}"]`);
    if (!el) return;
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 130);
  }

  /* ── Global keydown handler ── */
  document.addEventListener('keydown', e => {
    if (!isActive) return;
    if (matrixMode) { stopMatrix(); e.preventDefault(); return; }

    const pageKeys = [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace', 'Enter', 'PageUp', 'PageDown', 'Home', 'End'];
    if (pageKeys.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    const textEl = document.getElementById('termText');
    if (!textEl) return;

    switch (e.key) {
      case 'Enter':
        flashKey('Enter');
        if (currentInput.trim()) {
          cmdHistory.unshift(currentInput);
          historyIdx = -1;
        }
        const toRun = currentInput;
        currentInput = '';
        execute(toRun);
        break;

      case 'Backspace':
        flashKey('Backspace');
        currentInput = currentInput.slice(0, -1);
        textEl.textContent = currentInput;
        break;

      case 'ArrowUp':
        historyIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
        currentInput = cmdHistory[historyIdx] ?? '';
        textEl.textContent = currentInput;
        break;

      case 'ArrowDown':
        historyIdx = Math.max(historyIdx - 1, -1);
        currentInput = historyIdx < 0 ? '' : cmdHistory[historyIdx];
        textEl.textContent = currentInput;
        break;

      case 'Tab':
        const partial = currentInput.toLowerCase();
        const match = Object.keys(COMMANDS).find(k => k.startsWith(partial) && k !== partial);
        if (match) { currentInput = match; textEl.textContent = currentInput; }
        break;

      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          currentInput += e.key;
          textEl.textContent = currentInput;
          flashKey(e.key.toLowerCase());
        }
    }
  });

  /* ── Activate terminal on click ── */
  wrapper.addEventListener('click', () => {
    isActive = true;
    wrapper.classList.add('active');
    if (hint) hint.classList.add('hidden');
    if (!document.getElementById('termAnchor')) initTerminal();
  });

  document.addEventListener('click', e => {
    if (!wrapper.contains(e.target)) {
      isActive = false;
      wrapper.classList.remove('active');
    }
  });

  /* ── Visual keyboard clicks ── */
  document.querySelectorAll('.key').forEach(keyEl => {
    keyEl.addEventListener('click', e => {
      e.stopPropagation();
      if (!isActive) {
        isActive = true;
        wrapper.classList.add('active');
        if (hint) hint.classList.add('hidden');
        if (!document.getElementById('termAnchor')) initTerminal();
      }
      const key = keyEl.dataset.key;
      if (key) document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    });
  });

  /* ── Boot ── */
  setTimeout(initTerminal, 1200);

})();