/**
 * terminal.js
 * Interactive terminal for the computer setup hero section.
 * Handles: typing, command parsing, history, autocomplete, matrix mode.
 *
 * BUG FIX: The active input line is always appended at the BOTTOM of
 * #terminal. We use scrollTop = scrollHeight after every DOM change
 * so the view never jumps back to the top.
 */

(() => {
  'use strict';

  /* ── DOM refs ────────────────────────────────────── */
  const termEl  = document.getElementById('terminal');
  const wrapper = document.getElementById('computerWrapper');
  const hint    = wrapper ? wrapper.querySelector('.click-hint') : null;

  if (!termEl || !wrapper) return;   // guard if elements missing

  /* ── State ───────────────────────────────────────── */
  let isActive        = false;
  let currentInput    = '';
  let commandHistory  = [];
  let historyIdx      = -1;
  let matrixMode      = false;
  let matrixTimer     = null;

  /* ── Boot greeting ───────────────────────────────── */
  const GREETING = [
    { html: '<span class="term-greeting">╔══════════════════════════════════════════════╗</span>' },
    { html: '<span class="term-greeting">║   KristofferOS v2.0  —  Welcome, Visitor!    ║</span>' },
    { html: '<span class="term-greeting">║   Type <span class="term-info">help</span> to see available commands.         ║</span>' },
    { html: '<span class="term-greeting">╚══════════════════════════════════════════════╝</span>' },
    { html: '' },
  ];

  /* ── Command definitions ─────────────────────────── */
  const COMMANDS = {
    help: () => [
      '<span class="term-info">Available commands:</span>',
      '  <span class="term-success">about</span>      — Who is Kristoffer?',
      '  <span class="term-success">skills</span>     — Tech stack &amp; tools',
      '  <span class="term-success">projects</span>   — Notable projects',
      '  <span class="term-success">contact</span>    — How to reach me',
      '  <span class="term-success">socials</span>    — Social media links',
      '  <span class="term-success">whoami</span>     — Display visitor info',
      '  <span class="term-success">date</span>       — Current date/time',
      '  <span class="term-success">joke</span>       — A dev joke 😄',
      '  <span class="term-success">matrix</span>     — Go deeper into the rabbit hole',
      '  <span class="term-success">clear</span>      — Clear the terminal',
    ],

    about: () => [
      '<span class="term-info">$ cat about.txt</span>',
      'Name    : Kristoffer Ian Sioson',
      'Role    : Software Engineer',
      'Location: Philippines 🇵🇭',
      'Mission : Building elegant software that matters.',
      'Status  : <span class="term-success">Open to opportunities ✓</span>',
    ],

    skills: () => [
      '<span class="term-info">$ ls ./skills/ --all</span>',
      '<span class="term-success">── Languages</span>   JavaScript  TypeScript  Python  SQL',
      '<span class="term-success">── Frontend</span>    React  Next.js  Tailwind  D3.js',
      '<span class="term-success">── Backend</span>     Node.js  FastAPI  GraphQL  REST',
      '<span class="term-success">── Databases</span>   MongoDB  PostgreSQL  Redis  Firebase',
      '<span class="term-success">── DevOps</span>      Docker  AWS  Git  Linux  CI/CD',
    ],

    projects: () => [
      '<span class="term-info">$ git log --oneline --all</span>',
      '<span class="term-success">a1b2c3d</span> 🛒 E-Commerce Platform       [React · Node · MongoDB]',
      '<span class="term-success">e4f5g6h</span> 📊 Analytics Dashboard       [TS · D3.js · WebSockets]',
      '<span class="term-success">i7j8k9l</span> 🤖 AI Chat Assistant         [Python · FastAPI · Redis]',
      '<span class="term-success">m0n1o2p</span> 📱 Task Management App       [React Native · GraphQL]',
      '<span class="term-success">q3r4s5t</span> 🔐 Auth Microservice         [Node · JWT · Docker]',
      '<span class="term-success">u6v7w8x</span> 🌐 Portfolio CMS             [Next.js · Sanity · Vercel]',
      '',
      '<span class="term-comment">// Scroll down on the page to see full project details</span>',
    ],

    contact: () => [
      '<span class="term-info">$ cat contact.json</span>',
      '{',
      '  <span class="term-success">"email"</span>    : "kristofferiansioson@email.com",',
      '  <span class="term-success">"instagram"</span>: "@yourusername",',
      '  <span class="term-success">"facebook"</span> : "Kristoffer Ian Sioson",',
      '  <span class="term-success">"github"</span>   : "github.com/yourusername",',
      '  <span class="term-success">"linkedin"</span> : "linkedin.com/in/yourusername"',
      '}',
    ],

    socials: () => [
      '<span class="term-info">$ open ./socials/</span>',
      '📸 <span class="term-success">Instagram</span> : instagram.com/yourusername',
      '📘 <span class="term-success">Facebook</span>  : facebook.com/yourusername',
      '🐙 <span class="term-success">GitHub</span>    : github.com/yourusername',
      '💼 <span class="term-success">LinkedIn</span>  : linkedin.com/in/yourusername',
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
        'Why do programmers prefer dark mode?\n  <span class="term-info">Light attracts bugs.</span>',
        'A SQL query walks into a bar, walks up to two tables…\n  <span class="term-info">"Can I JOIN you?"</span>',
        'Why do Java developers wear glasses?\n  <span class="term-info">Because they don\'t C#.</span>',
        '99 little bugs in the code, 99 little bugs…\n  <span class="term-info">Take one down, patch it around — 127 little bugs in the code.</span>',
        'There are only 10 types of people:\n  <span class="term-info">those who understand binary, and those who don\'t.</span>',
        'A programmer\'s wife says: "Go to the store and get a gallon of milk, and if they have eggs, get a dozen."\n  <span class="term-info">He comes home with 12 gallons of milk. They had eggs.</span>',
      ];
      return [ jokes[Math.floor(Math.random() * jokes.length)] ];
    },

    matrix: () => {
      startMatrix();
      return [ '<span class="term-info">Initialising Matrix… press any key to exit.</span>' ];
    },

    clear: () => {
      termEl.innerHTML = '';
      appendInputLine();
      return null;   // null = skip renderLines
    },
  };

  /* ── Helpers ─────────────────────────────────────── */
  function escHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * scrollToBottom — always keep the view at the end of the terminal.
   * Called after EVERY DOM mutation inside #terminal.
   */
  function scrollToBottom() {
    termEl.scrollTop = termEl.scrollHeight;
  }

  /* ── Render helpers ──────────────────────────────── */
  function appendLine(html) {
    const div = document.createElement('div');
    div.className = 'term-line';
    div.innerHTML = html;
    termEl.appendChild(div);
    scrollToBottom();
  }

  function appendOutputLines(lines) {
    if (!lines) return;
    lines.forEach(html => appendLine(`<span class="term-output">${html}</span>`));
  }

  /**
   * appendInputLine — creates the editable prompt row at the bottom.
   * Always removes any existing active row first to avoid duplicates.
   */
  function appendInputLine() {
    // Remove previous active row if it exists
    const old = document.getElementById('activeInputLine');
    if (old) old.remove();

    const div = document.createElement('div');
    div.className = 'term-input-line';
    div.id = 'activeInputLine';
    div.innerHTML = `
      <span class="term-prompt">visitor</span><!--
      --><span style="color:var(--color-muted)">@</span><!--
      --><span class="term-path">kristoffer-os</span><!--
      --><span style="color:var(--color-muted)">:~$&nbsp;</span><!--
      --><span class="term-input-display" id="termText">${escHtml(currentInput)}</span><!--
      --><span class="term-cursor-blink"></span>
    `;
    termEl.appendChild(div);
    scrollToBottom();
  }

  /* ── Boot sequence ───────────────────────────────── */
  function initTerminal() {
    termEl.innerHTML = '';
    currentInput = '';
    GREETING.forEach(({ html }) => appendLine(`<span class="term-output">${html}</span>`));
    appendInputLine();
  }

  /* ── Command execution ───────────────────────────── */
  function executeCommand(rawCmd) {
    const cmd = rawCmd.trim().toLowerCase();

    // 1. Freeze the current prompt (remove cursor + id)
    const activeEl = document.getElementById('activeInputLine');
    if (activeEl) {
      activeEl.id = '';
      const blink = activeEl.querySelector('.term-cursor-blink');
      if (blink) blink.remove();
    }

    // 2. Echo the typed command in the frozen prompt row
    //    (the textContent was already showing it; just strip the cursor)

    // 3. Run handler
    const handler = COMMANDS[cmd];
    if (handler) {
      const result = handler();
      appendOutputLines(result);
    } else if (cmd !== '') {
      appendOutputLines([
        `<span class="term-error">command not found: ${escHtml(rawCmd)}</span>` +
        ` — type <span class="term-info">help</span> for available commands`,
      ]);
    }

    // 4. New prompt at the bottom (unless clear already did it)
    if (cmd !== 'clear') appendInputLine();
  }

  /* ── Matrix easter egg ───────────────────────────── */
  const MATRIX_CHARS = 'アイウエオカキクケコサシスセソ0123456789ABCDEF<>{}[]()'.split('');

  function startMatrix() {
    matrixMode = true;
    matrixTimer = setInterval(() => {
      const row = document.createElement('div');
      row.innerHTML =
        `<span style="color:var(--color-green);opacity:${Math.random().toFixed(2)}">` +
        Array.from({ length: 50 }, () =>
          MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
        ).join(' ') +
        '</span>';
      termEl.appendChild(row);
      scrollToBottom();
    }, 70);
    setTimeout(stopMatrix, 4500);
  }

  function stopMatrix() {
    if (!matrixMode) return;
    matrixMode = false;
    clearInterval(matrixTimer);
    appendInputLine();
  }

  /* ── Key flash on visual keyboard ───────────────── */
  function flashKey(key) {
    const el = document.querySelector(`.key[data-key="${key}"]`);
    if (!el) return;
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 130);
  }

  /* ── Keyboard handler ────────────────────────────── */
  document.addEventListener('keydown', e => {
    if (!isActive) return;

    // Exit matrix on any key
    if (matrixMode) { stopMatrix(); e.preventDefault(); return; }

    const textEl = document.getElementById('termText');
    if (!textEl) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        flashKey('Enter');
        if (currentInput.trim()) {
          commandHistory.unshift(currentInput);
          historyIdx = -1;
        }
        const cmd = currentInput;
        currentInput = '';
        executeCommand(cmd);
        break;

      case 'Backspace':
        e.preventDefault();
        flashKey('Backspace');
        currentInput = currentInput.slice(0, -1);
        textEl.textContent = currentInput;
        scrollToBottom();
        break;

      case 'ArrowUp':
        e.preventDefault();
        historyIdx = Math.min(historyIdx + 1, commandHistory.length - 1);
        currentInput = commandHistory[historyIdx] ?? '';
        textEl.textContent = currentInput;
        break;

      case 'ArrowDown':
        e.preventDefault();
        historyIdx = Math.max(historyIdx - 1, -1);
        currentInput = historyIdx < 0 ? '' : commandHistory[historyIdx];
        textEl.textContent = currentInput;
        break;

      case 'Tab':
        e.preventDefault();
        const partial = currentInput.toLowerCase();
        const match   = Object.keys(COMMANDS).find(k => k.startsWith(partial) && k !== partial);
        if (match) {
          currentInput = match;
          textEl.textContent = currentInput;
        }
        break;

      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          currentInput += e.key;
          textEl.textContent = currentInput;
          flashKey(e.key.toLowerCase());
          scrollToBottom();
        }
    }
  });

  /* ── Activate / deactivate computer ─────────────── */
  wrapper.addEventListener('click', () => {
    isActive = true;
    wrapper.classList.add('active');
    if (hint) hint.classList.add('hidden');
    if (termEl.children.length === 0) initTerminal();
  });

  document.addEventListener('click', e => {
    if (!wrapper.contains(e.target)) {
      isActive = false;
      wrapper.classList.remove('active');
    }
  });

  /* ── Visual keyboard → dispatch keydown ─────────── */
  document.querySelectorAll('.key').forEach(keyEl => {
    keyEl.addEventListener('click', e => {
      e.stopPropagation();    // don't bubble to document (would deactivate)
      if (!isActive) {
        // First click on a key also activates the terminal
        isActive = true;
        wrapper.classList.add('active');
        if (hint) hint.classList.add('hidden');
        if (termEl.children.length === 0) initTerminal();
      }
      const key = keyEl.dataset.key;
      if (key) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      }
    });
  });

  /* ── Boot on page load ───────────────────────────── */
  setTimeout(initTerminal, 1200);

})();
