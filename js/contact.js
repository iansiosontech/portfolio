/**
 * contact.js
 * Handles the contact form submission.
 * Builds a mailto: link so messages open the visitor's
 * default mail client with all fields pre-filled.
 *
 * To use a backend (e.g. EmailJS, Formspree, NodeMailer),
 * replace the mailtoHandler function below with a fetch() call.
 */

(() => {
  'use strict';

  const form    = document.getElementById('contactForm');
  const sendBtn = document.getElementById('sendBtn');
  const status  = document.getElementById('formStatus');

  if (!form) return;

  /* ── Validation helpers ──────────────────────────── */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  function showStatus(type, message) {
    status.className = `form-status ${type}`;
    status.textContent = message;
    status.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearStatus() {
    status.className = 'form-status';
    status.textContent = '';
  }

  /* ── Mail handler ────────────────────────────────── */
  function mailtoHandler({ name, email, subject, message }) {
    const to   = 'ianzsioszon@gmail.com';   // ← Update this
    const body = [
      `Name:    ${name}`,
      `Email:   ${email}`,
      '',
      message,
    ].join('\n');

    const mailto =
      `mailto:${to}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  }

  /* ── Submit handler ──────────────────────────────── */
  form.addEventListener('submit', function handleSubmit(e) {
    e.preventDefault();
    clearStatus();

    const name    = document.getElementById('senderName').value.trim();
    const email   = document.getElementById('senderEmail').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const message = document.getElementById('message').value.trim();

    /* Client-side validation */
    if (!name)                { showStatus('error', '✕ Please enter your name.');           return; }
    if (!isValidEmail(email)) { showStatus('error', '✕ Please enter a valid email address.'); return; }
    if (!subject)             { showStatus('error', '✕ Please enter a subject.');            return; }
    if (!message)             { showStatus('error', '✕ Please enter a message.');            return; }

    /* Loading state */
    sendBtn.textContent = '⏳ Opening mail client…';
    sendBtn.disabled = true;

    setTimeout(() => {
      try {
        mailtoHandler({ name, email, subject, message });
        showStatus(
          'success',
          '✓ Your mail client has been opened with the message pre-filled. Send it from there!'
        );
        form.reset();
      } catch (err) {
        showStatus('error', '✕ Something went wrong. Please email me directly at ianzsioszon@gmail.com');
        console.error('[contact.js]', err);
      } finally {
        sendBtn.textContent = '⚡ Send Message';
        sendBtn.disabled = false;
      }
    }, 500);
  });

})();
