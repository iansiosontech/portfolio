/**
 * terminal.js — KristofferOS Interactive Terminal
 *
 * Scroll approach: the input line is ALWAYS the last child,
 * followed by an invisible anchor div, and we pin scrollTop
 * to scrollHeight after every write.
 *
 * Features:
 *   • A tiny read-only file system (ls / cd / cat / pwd)
 *   • `open` for the resume, projects and socials
 *   • neofetch, sudo hire-me, and a few easter eggs
 *   • Tab completion for commands AND file names
 *   • Clickable command chips (.term-chip) for mouse / phone users
 */

(() => {
  'use strict';

  const termEl  = document.getElementById('terminal');
  const wrapper = document.getElementById('computerWrapper');
  const hint    = wrapper ? wrapper.querySelector('.click-hint') : null;

  if (!termEl || !wrapper) return;

  /* ══════════════════════════════════════════════════
     Profile data — edit here to update the terminal
  ══════════════════════════════════════════════════ */
  const PROFILE = {
    name:     'Kristoffer Ian Sioson',
    role:     'Software Engineer',
    location: 'Philippines 🇵🇭',
    school:   'FEU Institute of Technology',
    degree:   'BS Computer Science (Software Engineering)',
    studentSince: 2022,
    email:    'ianzsioson@gmail.com',
    resume:   'assets/Sioson_Resume.pdf',
    links: {
      github:    'https://github.com/iansiosontech',
      linkedin:  'https://linkedin.com/in/kristoffer-ian-sioson',
      instagram: 'https://instagram.com/nai.ts03',
      facebook:  'https://facebook.com/non.trid.1',
    },
  };

  const PROJECTS = [
    {
      file:  'visual-qwen.md',
      icon:  '📊',
      title: 'Visual-Qwen',
      desc:  'Augmenting Multimodal Deep Learning with Attention Mechanisms to Recognize "Sludge" Videos from Short-Form Content.',
      highlights: [
        '$376K of compute granted by Google TPU Research Cloud & the YouTube Research Program',
        '6,000-row multimodal dataset with 200+ monthly downloads on Kaggle',
        '2,000+ short-form videos gathered and annotated',
        'Validated by 53 ML experts, content creators, moderators & data scientists',
      ],
      stack: ['Python', 'Multimodal AI', 'Google TPU'],
      repo:  'https://github.com/alpharomercoma/vqwen-qformer',
      demo:  'https://micromarc.vercel.app/#home',
    },
    {
      file:  'jobtracker-ai.md',
      icon:  '🤖',
      title: 'JobTracker AI',
      desc:  'Full-stack AI platform for job hunting, deployed to production. BYOK (bring your own key), so it is free and auth-free for anyone to use.',
      highlights: [
        'Scores resumes against jobs, analyzes skill gaps, writes tailored cover letters (Gemini)',
        'Automated job-posting scraping (httpx, BeautifulSoup) + drag-and-drop Kanban',
        'Deployed on Vercel + Render with Dockerized PostgreSQL',
      ],
      stack: ['FastAPI', 'PostgreSQL', 'Next.js', 'TypeScript', 'Gemini AI', 'Docker'],
      repo:  'https://github.com/iansiosontech/Job-Application-Tracker',
      demo:  'https://kits-jobtracker.vercel.app',
    },
  ];

  /* ── State ── */
  let isActive     = false;
  let isBusy       = false;   // true while an animated command is printing
  let currentInput = '';
  let cmdHistory   = [];
  let historyIdx   = -1;
  let matrixMode   = false;
  let matrixTimer  = null;
  let matrixStop   = null;
  let cwd          = [];      // path segments relative to ~

  /* ── Invisible scroll anchor ── */
  const anchor = document.createElement('div');
  anchor.id = 'termAnchor';
  anchor.style.cssText = 'height:1px;width:100%;flex-shrink:0;';

  function goToBottom() {
    termEl.appendChild(anchor);
    termEl.scrollTop = termEl.scrollHeight;
  }

  /* ── Escape HTML ── */
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Link helper (output is HTML) ── */
  function link(href, label, newTab = true) {
    const target = newTab ? ' target="_blank" rel="noopener"' : '';
    return `<a class="term-link" href="${esc(href)}"${target}>${esc(label || href)}</a>`;
  }

  /* ── Append a single output line ── */
  function addLine(html) {
    const d = document.createElement('div');
    d.className = 'term-line';
    d.innerHTML = html;
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

  /* ── Print lines one by one with a delay (for effect) ── */
  function printSlowly(lines, delay = 350) {
    return new Promise(resolve => {
      let i = 0;
      (function next() {
        if (i >= lines.length) { resolve(); return; }
        addLines([lines[i++]]);
        setTimeout(next, delay);
      })();
    });
  }

  /* ══════════════════════════════════════════════════
     Virtual file system
  ══════════════════════════════════════════════════ */
  function projectFile(p) {
    return {
      type: 'file',
      content: () => [
        `<span class="term-info"># ${p.icon} ${esc(p.title)}</span>`,
        esc(p.desc),
        ...(p.highlights || []).map(h => `&nbsp;&nbsp;▹ ${esc(h)}`),
        `<span class="term-success">stack</span> : ${p.stack.map(esc).join(', ')}`,
        `<span class="term-success">repo</span>  : ${link(p.repo)}`,
        `<span class="term-success">demo</span>  : ${link(p.demo)}`,
      ],
      open: p.demo,
    };
  }

  const FS = {
    type: 'dir',
    children: {
      'about.txt':    { type: 'file', content: () => COMMANDS.about().slice(1) },
      'contact.json': { type: 'file', content: () => COMMANDS.contact().slice(1) },
      'resume.pdf':   { type: 'file', content: () => [
        '<span class="term-comment">// binary file — try</span> <span class="term-success">open resume</span>',
      ], open: PROFILE.resume, download: true },
      projects: {
        type: 'dir',
        children: Object.fromEntries(PROJECTS.map(p => [p.file, projectFile(p)])),
      },
      socials: {
        type: 'dir',
        children: Object.fromEntries(
          Object.entries(PROFILE.links).map(([k, url]) => [
            `${k}.url`,
            { type: 'file', content: () => [link(url)], open: url },
          ])
        ),
      },
    },
  };

  function cwdString(segs = cwd) {
    return segs.length ? '~/' + segs.join('/') : '~';
  }

  /* Resolve a path string to { node, segs } or null */
  function resolve(path) {
    let segs;
    if (!path || path === '~') segs = [];
    else if (path.startsWith('~/')) segs = path.slice(2).split('/');
    else if (path.startsWith('/')) segs = path.slice(1).split('/');
    else segs = cwd.concat(path.split('/'));

    const out = [];
    for (const s of segs) {
      if (s === '' || s === '.') continue;
      if (s === '..') { out.pop(); continue; }
      out.push(s);
    }

    let node = FS;
    for (const s of out) {
      if (node.type !== 'dir' || !node.children[s]) return null;
      node = node.children[s];
    }
    return { node, segs: out };
  }

  function listDir(node) {
    return Object.entries(node.children).map(([name, n]) =>
      n.type === 'dir'
        ? `<span class="term-info">${esc(name)}/</span>`
        : `<span class="term-success">${esc(name)}</span>`
    ).join('&nbsp;&nbsp;');
  }

  /* ══════════════════════════════════════════════════
     Rendering
  ══════════════════════════════════════════════════ */
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
      `<span style="color:var(--color-muted)">:${esc(cwdString())}$&nbsp;</span>` +
      `<span class="term-input-display" id="termText">${esc(currentInput)}</span>` +
      `<span class="term-cursor-blink"></span>`;

    termEl.insertBefore(d, anchor);
    goToBottom();
  }

  const GREETING = [
    '<span class="term-greeting">╔══════════════════════════════════════════════╗</span>',
    '<span class="term-greeting">║&nbsp;&nbsp; KristofferOS v2.0 — Welcome, Visitor!&nbsp;&nbsp;&nbsp;&nbsp;║</span>',
    '<span class="term-greeting">║&nbsp;&nbsp; Type <span class="term-info">help</span> to see available commands.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ║</span>',
    '<span class="term-greeting">╚══════════════════════════════════════════════╝</span>',
    '',
  ];

  function initTerminal() {
    termEl.innerHTML = '';
    termEl.appendChild(anchor);
    currentInput = '';
    GREETING.forEach(html =>
      addLine(`<span class="term-output">${html}</span>`)
    );
    renderPrompt();
  }

  /* ══════════════════════════════════════════════════
     Commands — each receives (args: string[], raw: string)
     and returns an array of HTML lines, null, or a Promise.
  ══════════════════════════════════════════════════ */
  const HELP = [
    ['about',    'Who is Kristoffer?'],
    ['neofetch', 'System info, portfolio style'],
    ['skills',   'Tech stack &amp; tools'],
    ['projects', 'Notable projects'],
    ['experience', 'Where I have worked'],
    ['ls',       'List files (try <span class="term-success">ls projects</span>)'],
    ['cd',       'Change directory'],
    ['cat',      'Read a file (try <span class="term-success">cat about.txt</span>)'],
    ['open',     'Open resume | github | linkedin | email | a project'],
    ['contact',  'How to reach me'],
    ['socials',  'Social media links'],
    ['whoami',   'Display visitor info'],
    ['history',  'Commands you have run'],
    ['date',     'Current date/time'],
    ['joke',     'A dev joke 😄'],
    ['matrix',   'Go deeper into the rabbit hole'],
    ['clear',    'Clear the terminal'],
    ['exit',     'Leave the terminal'],
  ];

  const COMMANDS = {
    help: () => [
      '<span class="term-info">Available commands:</span>',
      ...HELP.map(([c, d]) =>
        `&nbsp;&nbsp;<span class="term-success">${c.padEnd(11, ' ').replace(/ /g, '&nbsp;')}</span>— ${d}`
      ),
      '<span class="term-comment">// Tab autocompletes · ↑/↓ browse history · some commands are hidden 👀</span>',
    ],

    about: () => [
      '<span class="term-info">$ cat about.txt</span>',
      `Name&nbsp;&nbsp;&nbsp;&nbsp;: ${esc(PROFILE.name)}`,
      `Role&nbsp;&nbsp;&nbsp;&nbsp;: ${esc(PROFILE.role)}`,
      `Location: ${esc(PROFILE.location)}`,
      'Mission : Building elegant software that matters.',
      'Status&nbsp;&nbsp;: <span class="term-success">Open to opportunities ✓</span>',
    ],

    neofetch: () => {
      const years = new Date().getFullYear() - PROFILE.studentSince;
      // Plain ASCII so it renders the same in every monospace font
      const art = [
        ' |  / ',
        ' | /  ',
        ' |&lt;   ',
        ' | \\  ',
        ' |  \\ ',
        '', '', '', '', '', '',
      ];
      const info = [
        '<span class="term-info">visitor</span>@<span class="term-info">kristoffer-os</span>',
        '<span class="term-comment">-------------------</span>',
        `<span class="term-info">User</span>: ${esc(PROFILE.name)}`,
        `<span class="term-info">Role</span>: ${esc(PROFILE.role)}`,
        `<span class="term-info">Host</span>: ${esc(PROFILE.school)} · NSYSU Taiwan`,
        '<span class="term-info">Exp</span>: Software Developer @ ServiceBai Philippines',
        `<span class="term-info">Uptime</span>: ${years}+ yrs of CS (since ${PROFILE.studentSince})`,
        `<span class="term-info">Projects</span>: ${PROJECTS.map(p => esc(p.title)).join(', ')}`,
        '<span class="term-info">Stack</span>: Python, TypeScript, React, FastAPI',
        '<span class="term-info">Shell</span>: coffee ☕ + curiosity',
        '<span class="term-info">Status</span>: <span class="term-success">open to opportunities ✓</span>',
      ];
      return info.map((line, i) =>
        `<span class="neo-art">${art[i] || ''}</span><span class="neo-info">${line}</span>`
      );
    },

    skills: () => [
      '<span class="term-info">$ ls ./skills/ --all</span>',
      '<span class="term-success">── Languages</span>&nbsp;&nbsp; JavaScript  TypeScript  Python  SQL',
      '<span class="term-success">── Frontend</span>&nbsp;&nbsp;&nbsp; React  Next.js  Tailwind  D3.js',
      '<span class="term-success">── Backend</span>&nbsp;&nbsp;&nbsp;&nbsp; Node.js  FastAPI  GraphQL  REST',
      '<span class="term-success">── Databases</span>&nbsp;&nbsp; MongoDB  PostgreSQL  Redis  Firebase',
      '<span class="term-success">── DevOps</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Docker  AWS  Git  Linux  CI/CD',
    ],

    experience: () => [
      '<span class="term-info">$ cat experience.log</span>',
      '<span class="term-success">2026</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Software Developer @ ServiceBai Philippines',
      '<span class="term-success">2025–now</span>&nbsp;&nbsp;&nbsp;Freelance Developer @ Independent clients',
      '<span class="term-success">2022–2024</span>&nbsp;&nbsp;Junior Officer @ ACM',
      '<span class="term-comment">// Scroll to "Where I\'ve Worked" for details</span>',
    ],

    projects: () => [
      '<span class="term-info">$ ls ~/projects</span>',
      ...PROJECTS.map(p =>
        `${p.icon} <span class="term-success">${esc(p.title)}</span> — ${link(p.demo, 'demo')} · ${link(p.repo, 'repo')}`
      ),
      '<span class="term-comment">// Read one: </span><span class="term-success">cat projects/' + PROJECTS[0].file + '</span>',
    ],

    contact: () => [
      '<span class="term-info">$ cat contact.json</span>',
      '{',
      `&nbsp;&nbsp;<span class="term-success">"email"</span>&nbsp;&nbsp;&nbsp;&nbsp;: "${link('mailto:' + PROFILE.email, PROFILE.email, false)}",`,
      '&nbsp;&nbsp;<span class="term-success">"linkedin"</span> : "linkedin.com/in/kristoffer-ian-sioson",',
      '&nbsp;&nbsp;<span class="term-success">"github"</span>&nbsp;&nbsp;&nbsp;: "github.com/iansiosontech",',
      '&nbsp;&nbsp;<span class="term-success">"instagram"</span>: "@nai.ts03",',
      '&nbsp;&nbsp;<span class="term-success">"facebook"</span> : "facebook.com/non.trid.1"',
      '}',
    ],

    socials: () => [
      '<span class="term-info">$ open ./socials/</span>',
      `📸 <span class="term-success">Instagram</span> : ${link(PROFILE.links.instagram, 'instagram.com/nai.ts03')}`,
      `📘 <span class="term-success">Facebook</span>&nbsp; : ${link(PROFILE.links.facebook, 'facebook.com/non.trid.1')}`,
      `🐙 <span class="term-success">GitHub</span>&nbsp;&nbsp;&nbsp; : ${link(PROFILE.links.github, 'github.com/iansiosontech')}`,
      `💼 <span class="term-success">LinkedIn</span>&nbsp; : ${link(PROFILE.links.linkedin, 'linkedin.com/in/kristoffer-ian-sioson')}`,
    ],

    whoami: () => [
      '<span class="term-success">visitor@kristoffer-os</span>',
      'You are a valued guest exploring this portfolio.',
      'Feel free to scroll, click, and reach out! 👋',
    ],

    date: () => [
      `<span class="term-success">${esc(new Date().toString())}</span>`,
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
      return null;
    },

    history: () => cmdHistory.length
      ? cmdHistory.slice().reverse().map((c, i) => `&nbsp;${String(i + 1).padStart(3, ' ').replace(/ /g, '&nbsp;')}&nbsp;&nbsp;${esc(c)}`)
      : ['<span class="term-comment">// no history yet</span>'],

    pwd: () => [`/home/visitor/${esc(cwd.join('/'))}`.replace(/\/$/, '')],

    ls: (args) => {
      const target = args.find(a => !a.startsWith('-'));
      const r = resolve(target || '.');
      if (!r) return [`<span class="term-error">ls: cannot access '${esc(target)}': No such file or directory</span>`];
      if (r.node.type === 'file') return [`<span class="term-success">${esc(target)}</span>`];
      return [listDir(r.node)];
    },

    cd: (args) => {
      const target = args[0] || '~';
      const r = resolve(target);
      if (!r) return [`<span class="term-error">cd: no such file or directory: ${esc(target)}</span>`];
      if (r.node.type !== 'dir') return [`<span class="term-error">cd: not a directory: ${esc(target)}</span>`];
      cwd = r.segs;
      return null;
    },

    cat: (args) => {
      if (!args.length) return ['<span class="term-error">cat: missing file operand</span> — try <span class="term-success">cat about.txt</span>'];
      return args.flatMap(a => {
        const r = resolve(a);
        if (!r) return [`<span class="term-error">cat: ${esc(a)}: No such file or directory</span>`];
        if (r.node.type === 'dir') return [`<span class="term-error">cat: ${esc(a)}: Is a directory</span>`];
        return r.node.content();
      });
    },

    open: (args) => {
      const target = (args[0] || '').toLowerCase();
      const shortcuts = {
        resume:   { url: PROFILE.resume, download: true, label: 'Sioson_Resume.pdf' },
        cv:       { url: PROFILE.resume, download: true, label: 'Sioson_Resume.pdf' },
        email:    { url: 'mailto:' + PROFILE.email, label: PROFILE.email },
        mail:     { url: 'mailto:' + PROFILE.email, label: PROFILE.email },
        github:   { url: PROFILE.links.github },
        linkedin: { url: PROFILE.links.linkedin },
        instagram:{ url: PROFILE.links.instagram },
        facebook: { url: PROFILE.links.facebook },
      };
      PROJECTS.forEach(p => {
        shortcuts[p.file.replace(/\.md$/, '')] = { url: p.demo, label: p.title + ' (live demo)' };
      });

      let hit = shortcuts[target];
      if (!hit && target) {
        const r = resolve(args[0]);
        if (r && r.node.open) hit = { url: r.node.open, download: r.node.download };
      }
      if (!hit) {
        return [
          target
            ? `<span class="term-error">open: '${esc(args[0])}' not found</span>`
            : '<span class="term-info">usage:</span> open &lt;target&gt;',
          '<span class="term-comment">// targets: </span>' + Object.keys(shortcuts).filter(k => k !== 'cv' && k !== 'mail').join(' · '),
        ];
      }

      // Triggered by a key press or click, so browsers allow it.
      const a = document.createElement('a');
      a.href = hit.url;
      if (hit.download) a.setAttribute('download', '');
      else if (!hit.url.startsWith('mailto:')) { a.target = '_blank'; a.rel = 'noopener'; }
      document.body.appendChild(a);
      a.click();
      a.remove();

      return [
        `<span class="term-success">✓ ${hit.download ? 'Downloading' : 'Opening'}</span> ${link(hit.url, hit.label || hit.url, !hit.url.startsWith('mailto:'))}`,
        '<span class="term-comment">// nothing happened? click the link above</span>',
      ];
    },

    sudo: (args) => {
      const what = args.join(' ').toLowerCase();
      if (what === 'hire-me' || what === 'hire me' || what === 'hire-kristoffer') {
        return printSlowly([
          '<span class="term-comment">[sudo] password for visitor: ********</span>',
          '<span class="term-info">Verifying recruiter credentials…</span> <span class="term-success">OK</span>',
          '<span class="term-info">Checking skills…</span> <span class="term-success">OK</span>',
          '<span class="term-info">Checking coffee supply…</span> <span class="term-success">OK ☕</span>',
          '<span class="term-success">✓ Access granted. Excellent decision. 🎉</span>',
          `Next step → ${link('mailto:' + PROFILE.email, PROFILE.email, false)} · ${link(PROFILE.resume, 'resume')} · ${link('#contact', 'contact form', false)}`,
        ], 450);
      }
      if (!what) return ['usage: sudo &lt;command&gt; <span class="term-comment">// psst: try sudo hire-me</span>'];
      return [
        '<span class="term-error">visitor is not in the sudoers file. This incident will be reported. 👀</span>',
        '<span class="term-comment">// …unless you meant</span> <span class="term-success">sudo hire-me</span>',
      ];
    },

    rm: (args) => {
      const joined = args.join(' ');
      if (/-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r/i.test(joined)) {
        return printSlowly([
          '<span class="term-error">Deleting /bin… /usr… /portfolio…</span>',
          '<span class="term-error">Deleting /home/kristoffer/coffee…</span>',
          '<span class="term-info">Kernel panic: refusing to delete coffee.</span>',
          '<span class="term-success">Just kidding — nothing was harmed. Nice try though. 😄</span>',
        ], 500);
      }
      return ['<span class="term-error">rm: permission denied (this is a read-only portfolio)</span>'];
    },

    coffee: () => [
      '&nbsp;&nbsp;&nbsp;( (',
      '&nbsp;&nbsp;&nbsp;&nbsp;) )',
      '&nbsp;&nbsp;.______.',
      '&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|]',
      '&nbsp;&nbsp;\\&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/',
      "&nbsp;&nbsp;&nbsp;`----'",
      '<span class="term-info">Brewing… done. Productivity +10.</span>',
    ],

    echo: (args) => [esc(args.join(' '))],

    exit: () => {
      setTimeout(deactivate, 300);
      return ['<span class="term-comment">logout — click the screen to come back 👋</span>'];
    },
  };

  /* Hidden aliases (not shown in help, but they work) */
  COMMANDS.dir    = COMMANDS.ls;
  COMMANDS.resume = () => COMMANDS.open(['resume']);
  COMMANDS.hire   = () => COMMANDS.sudo(['hire-me']);
  COMMANDS['hire-me'] = COMMANDS.hire;

  const VISIBLE_COMMANDS = HELP.map(([c]) => c);

  /* ── Execute a command ── */
  function execute(raw) {
    // Freeze current prompt (remove cursor + id)
    const active = document.getElementById('activeInputLine');
    if (active) {
      active.id = '';
      const blink = active.querySelector('.term-cursor-blink');
      if (blink) blink.remove();
      // Remove the id too, so the next prompt's #termText is unique
      const oldText = active.querySelector('#termText');
      if (oldText) oldText.removeAttribute('id');
    }

    const parts = raw.trim().split(/\s+/).filter(Boolean);
    const name  = (parts[0] || '').toLowerCase();
    const args  = parts.slice(1);
    const fn    = Object.prototype.hasOwnProperty.call(COMMANDS, name) ? COMMANDS[name] : null;

    let result = null;
    if (fn) {
      result = fn(args, raw);
    } else if (name !== '') {
      result = [
        `<span class="term-error">command not found: ${esc(name)}</span> — type <span class="term-info">help</span>`,
      ];
    }

    if (result && typeof result.then === 'function') {
      isBusy = true;
      result.then(() => {
        isBusy = false;
        renderPrompt();
      });
      return;
    }

    addLines(result);
    if (!matrixMode) renderPrompt();
  }

  /* Run a command as if the visitor typed it and pressed Enter */
  function runCommand(cmd) {
    if (isBusy || matrixMode) return;
    currentInput = cmd;
    const textEl = document.getElementById('termText');
    if (textEl) textEl.textContent = currentInput;
    cmdHistory.unshift(cmd);
    historyIdx = -1;
    currentInput = '';
    execute(cmd);
  }

  /* ── Tab completion: commands, then file paths ── */
  function complete(input) {
    const endsWithSpace = /\s$/.test(input);
    const parts = input.split(/\s+/).filter(Boolean);

    // Completing the command name
    if (parts.length <= 1 && !endsWithSpace) {
      const partial = (parts[0] || '').toLowerCase();
      const matches = VISIBLE_COMMANDS.filter(c => c.startsWith(partial));
      if (matches.length === 1) return { value: matches[0] + ' ' };
      if (matches.length > 1) return { value: commonPrefix(matches) || input, options: matches };
      return { value: input };
    }

    // Completing a path argument
    const partialPath = endsWithSpace ? '' : parts[parts.length - 1];
    const slash = partialPath.lastIndexOf('/');
    const dirPart  = slash >= 0 ? partialPath.slice(0, slash + 1) : '';
    const filePart = slash >= 0 ? partialPath.slice(slash + 1) : partialPath;
    const r = resolve(dirPart || '.');
    if (!r || r.node.type !== 'dir') return { value: input };

    const names = Object.keys(r.node.children).filter(n => n.startsWith(filePart));
    const prefix = endsWithSpace ? input : input.slice(0, input.length - partialPath.length);
    const decorate = n => r.node.children[n].type === 'dir' ? n + '/' : n + ' ';

    if (names.length === 1) return { value: prefix + dirPart + decorate(names[0]) };
    if (names.length > 1) {
      return { value: prefix + dirPart + (commonPrefix(names) || filePart), options: names.map(n => decorate(n).trim()) };
    }
    return { value: input };
  }

  function commonPrefix(list) {
    return list.reduce((a, b) => {
      let i = 0;
      while (i < a.length && i < b.length && a[i] === b[i]) i++;
      return a.slice(0, i);
    });
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
    matrixStop = setTimeout(stopMatrix, 4000);
  }

  function stopMatrix() {
    if (!matrixMode) return;
    matrixMode = false;
    clearInterval(matrixTimer);
    clearTimeout(matrixStop);
    renderPrompt();
  }

  /* ── Flash a key on the visual keyboard ── */
  function flashKey(key) {
    const el = document.querySelector(`.key[data-key="${CSS.escape(key)}"]`);
    if (!el) return;
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 130);
  }

  /* ── Activate / deactivate ── */
  function activate() {
    isActive = true;
    wrapper.classList.add('active');
    if (hint) hint.classList.add('hidden');
    if (!document.getElementById('termAnchor')) initTerminal();
  }

  function deactivate() {
    isActive = false;
    wrapper.classList.remove('active');
  }

  /* ── Global keydown handler ── */
  document.addEventListener('keydown', e => {
    if (!isActive) return;
    if (e.ctrlKey || e.metaKey) return;   // leave browser shortcuts (copy, reload…) alone
    if (matrixMode) { stopMatrix(); e.preventDefault(); return; }

    const pageKeys = [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace', 'Enter', 'PageUp', 'PageDown', 'Home', 'End'];
    if (pageKeys.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    if (isBusy) return;

    const textEl = document.getElementById('termText');
    if (!textEl) return;

    switch (e.key) {
      case 'Enter': {
        flashKey('Enter');
        if (currentInput.trim()) {
          cmdHistory.unshift(currentInput.trim());
          historyIdx = -1;
        }
        const toRun = currentInput;
        currentInput = '';
        execute(toRun);
        break;
      }

      case 'Backspace':
        flashKey('Backspace');
        currentInput = currentInput.slice(0, -1);
        textEl.textContent = currentInput;
        break;

      case 'ArrowUp':
        if (!cmdHistory.length) break;
        historyIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
        currentInput = cmdHistory[historyIdx] ?? '';
        textEl.textContent = currentInput;
        break;

      case 'ArrowDown':
        historyIdx = Math.max(historyIdx - 1, -1);
        currentInput = historyIdx < 0 ? '' : cmdHistory[historyIdx];
        textEl.textContent = currentInput;
        break;

      case 'Tab': {
        flashKey('Tab');
        const { value, options } = complete(currentInput);
        if (options && options.length > 1 && value === currentInput) {
          // Ambiguous: show the choices, keep what was typed
          const typed = currentInput;
          execute('');                // freezes the line, prints a fresh prompt
          const line = document.getElementById('activeInputLine');
          if (line) line.remove();
          addLines([options.map(o => `<span class="term-success">${esc(o)}</span>`).join('&nbsp;&nbsp;')]);
          currentInput = typed;
          renderPrompt();
        } else {
          currentInput = value;
          textEl.textContent = currentInput;
        }
        break;
      }

      default:
        if (e.key.length === 1 && !e.altKey) {
          currentInput += e.key;
          textEl.textContent = currentInput;
          flashKey(e.key.toLowerCase());
        }
    }
  });

  /* ── Activate terminal on click ── */
  wrapper.addEventListener('click', activate);

  document.addEventListener('click', e => {
    if (!wrapper.contains(e.target)) deactivate();
  });

  /* ── Visual keyboard clicks ── */
  document.querySelectorAll('.key').forEach(keyEl => {
    keyEl.addEventListener('click', e => {
      e.stopPropagation();
      activate();
      const key = keyEl.dataset.key;
      if (key) document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    });
  });

  /* ── Command chips ── */
  document.querySelectorAll('.term-chip').forEach(chip => {
    chip.addEventListener('click', e => {
      e.stopPropagation();
      activate();
      runCommand(chip.dataset.cmd);
    });
  });

  /* ── Boot ── */
  setTimeout(() => {
    if (!document.getElementById('termAnchor')) initTerminal();
  }, 1200);

})();
