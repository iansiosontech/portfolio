# Kristoffer Ian Sioson — Portfolio

Personal portfolio with a terminal you can actually use.

**Live:** https://kristofferian.vercel.app

## Highlights

- **KristofferOS terminal.** Click the computer in the hero and type. Try `help`, `neofetch`, `ls projects`, `cat projects/jobtracker-ai.md`, `open resume` or `sudo hire-me`. Tab completes commands and file names, and ↑/↓ browse history. On a phone, tap the command chips under the screen.
- **Fun zone** (`games.html`): small browser games built from scratch, including a button that runs away from you and a terminal-themed Snake.
- **No framework, no build step.** Plain HTML, CSS and JavaScript, deployed on Vercel (every merge to `main` goes live).

## Projects featured

| Project | What it is | Links |
| --- | --- | --- |
| JobTracker AI | AI job application tracker (FastAPI, PostgreSQL, Next.js, Gemini) | [repo](https://github.com/iansiosontech/Job-Application-Tracker) · [demo](https://kits-jobtracker.vercel.app) |
| Visual-Qwen | Multimodal deep learning to recognize "sludge" short-form videos | [repo](https://github.com/alpharomercoma/vqwen-qformer) · [demo](https://micromarc.vercel.app/#home) |

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Structure

```
index.html        Main page
games.html        Fun zone
css/style.css     All styles
js/terminal.js    Terminal: commands, file system, tab completion
js/contact.js     Contact form (opens a pre-filled email)
js/main.js        Cursor, scroll reveal, navbar
assets/           Resume PDF
```

To change what the terminal says, edit `PROFILE` and `PROJECTS` at the top of `js/terminal.js`.

## Contact

ianzsioszon@gmail.com · [LinkedIn](https://linkedin.com/in/kristoffer-ian-sioson) · [GitHub](https://github.com/iansiosontech)
