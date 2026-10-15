// Motion is progressive enhancement: every link and event works without it.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const stage = document.querySelector('.royal-stage');
const deck = document.querySelector('.royal-deck');
const shuffle = document.querySelector('#shuffle-deck');
const turn = document.querySelector('#turn-king');
let shuffleTimer;
let pointerFrame;

function resetTilt() {
  cancelAnimationFrame(pointerFrame);
  deck?.style.removeProperty('--tilt-x');
  deck?.style.removeProperty('--tilt-y');
}

stage?.addEventListener('pointermove', event => {
  if (reducedMotion.matches || !finePointer.matches) return;
  cancelAnimationFrame(pointerFrame);
  pointerFrame = requestAnimationFrame(() => {
    const rect = stage.getBoundingClientRect();
    deck.style.setProperty('--tilt-y', `${((event.clientX - rect.left) / rect.width - .5) * 14}deg`);
    deck.style.setProperty('--tilt-x', `${((event.clientY - rect.top) / rect.height - .5) * -9}deg`);
  });
});
stage?.addEventListener('pointerleave', resetTilt);

shuffle?.addEventListener('click', () => {
  if (shuffle.disabled) return;
  deck.classList.remove('is-turned');
  turn.setAttribute('aria-pressed', 'false');
  turn.textContent = 'Turn the king';
  document.querySelector('#deck-status').textContent = 'The deck is reshuffled. The crown is face up.';
  // Even without motion, the deck alternates between two visible arrangements.
  deck.classList.toggle('alternate-hand');
  if (reducedMotion.matches) return;
  shuffle.disabled = true;
  deck.classList.add('is-shuffling');
  shuffleTimer = setTimeout(() => {
    deck.classList.remove('is-shuffling');
    shuffle.disabled = false;
  }, 1000);
});

turn?.addEventListener('click', () => {
  const turned = deck.classList.toggle('is-turned');
  turn.setAttribute('aria-pressed', String(turned));
  turn.textContent = turned ? 'Show the crown' : 'Turn the king';
  document.querySelector('#deck-status').textContent = turned ? 'The king reveals: Your move. Your reign.' : 'The crown is face up.';
});

// A single observer deals in sections and API-loaded cards, then releases them.
const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.remove('reveal-pending');
    observer.unobserve(entry.target);
  }
}, { threshold: .08 }) : null;

function reveal(node, index = 0) {
  if (!observer || reducedMotion.matches) return;
  node.style.setProperty('--deal-delay', `${Math.min(index % 3, 2) * 85}ms`);
  node.classList.add('reveal-pending');
  observer.observe(node);
}
document.querySelectorAll('.section-heading, .manifesto-grid, .guide > div, .guide li, .lineup-hero, .suit-path, .closing-invitation h2').forEach(node => reveal(node));
const list = document.querySelector('#event-list');
if (list) {
  list.querySelectorAll('.event-card').forEach(reveal);
  new MutationObserver(records => {
    for (const record of records) {
      [...record.addedNodes].filter(node => node.nodeType === 1 && node.matches('.event-card')).forEach(reveal);
    }
  }).observe(list, { childList: true });
}

reducedMotion.addEventListener('change', () => {
  resetTilt();
  if (!reducedMotion.matches) return;
  clearTimeout(shuffleTimer);
  deck?.classList.remove('is-shuffling');
  if (shuffle) shuffle.disabled = false;
  document.querySelectorAll('.reveal-pending').forEach(node => node.classList.remove('reveal-pending'));
  observer?.disconnect();
});

// Local social previews keep demo links inside the festival website.
const socialDialog = document.querySelector('#social-dialog');
if (socialDialog) {
  document.querySelectorAll('[data-social]').forEach(button => {
    button.addEventListener('click', () => {
      const platform = button.dataset.social;
      document.querySelector('#social-platform').textContent = platform;
      document.querySelector('#social-description').textContent = `This ${platform} link is just for sample. Our official community links will be added soon.`;
      socialDialog.showModal();
    });
  });
  document.querySelector('#close-social').addEventListener('click', () => socialDialog.close());
  document.querySelector('#social-return').addEventListener('click', () => socialDialog.close());
  socialDialog.addEventListener('click', event => {
    if (event.target !== socialDialog) return;
    const rect = socialDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) socialDialog.close();
  });
}
