'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const colors = ['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet'];
  const symbols = ['●', '◆', '▲', '★', '■', '✚'];
  let draft = [null, null, null, null];
  let selected = 0;
  const token = color => {
    const el = document.createElement('span');
    el.className = `peg ${color || 'empty'}`;
    el.textContent = color ? symbols[colors.indexOf(color)] : '·';
    el.setAttribute('aria-label', color || 'Vide');
    return el;
  };
  const game = window.CodeSecret.createGame(render);
  function paintDraft() {
    const playing = game.getState().status === 'playing';
    [...$('slots').children].forEach((button, i) => {
      button.replaceChildren(token(draft[i]));
      button.classList.toggle('selected', i === selected);
      button.setAttribute('aria-pressed', String(i === selected));
      button.setAttribute('aria-label', `Position ${i + 1} : ${draft[i] || 'vide'}`);
      button.disabled = !playing;
    });
  }
  function render(state) {
    // Every successful restart clears the visible draft as well as the engine.
    if (state.attempts === 0 && !state.lastError) { draft = [null, null, null, null]; selected = 0; }
    const playing = state.status === 'playing';
    const titles = { 'not-started': 'Prêt à décoder ?', playing: 'À vous de jouer.', won: 'Code déchiffré !', lost: 'Le mystère reste entier.' };
    $('board-title').textContent = titles[state.status];
    $('status-badge').textContent = { 'not-started': 'À démarrer', playing: 'En cours', won: 'Gagné !', lost: 'Terminé' }[state.status];
    $('status-badge').className = `status-badge ${state.status}`;
    $('attempt-count').textContent = `${state.attempts} sur 10`;
    $('attempt-label').textContent = `${String(Math.min(state.attempts + 1, 10)).padStart(2, '0')} / 10`;
    $('composer-title').textContent = state.status === 'won' ? 'Bien joué, détective.' : state.status === 'lost' ? 'Une autre énigme ?' : 'Composez votre code.';
    $('submit').disabled = !playing;
    [...$('palette').children].forEach(button => { button.disabled = !playing; });
    $('message').classList.toggle('error', Boolean(state.lastError));
    $('message').textContent = state.lastError?.message || (state.status === 'won' ? `Bravo ! Vous avez trouvé le code en ${state.attempts} essai${state.attempts > 1 ? 's' : ''}.` : state.status === 'lost' ? 'Les dix essais sont écoulés. Lancez une nouvelle partie pour rejouer.' : state.status === 'not-started' ? 'Cliquez sur « Nouvelle partie » pour commencer.' : 'À vous de trouver la combinaison.');
    $('history').replaceChildren();
    for (let i = 0; i < 10; i++) {
      const entry = state.history[i];
      const row = document.createElement('li');
      row.className = `history-row ${entry ? 'played' : ''} ${playing && i === state.attempts ? 'current' : ''}`;
      const number = document.createElement('span');
      number.className = 'row-number'; number.textContent = String(i + 1).padStart(2, '0');
      const pegs = document.createElement('div'); pegs.className = 'row-pegs';
      for (let j = 0; j < 4; j++) pegs.append(token(entry?.guess[j]));
      const hint = document.createElement('div'); hint.className = 'hint';
      if (entry) {
        hint.setAttribute('aria-label', `${entry.result.wellPlaced} bien placées, ${entry.result.misplaced} mal placées`);
        for (const [key, label, style] of [['wellPlaced', 'bien placées', 'dark'], ['misplaced', 'mal placées', 'light']]) {
          const count = document.createElement('span');
          count.innerHTML = `<i class="legend-dot ${style}" aria-hidden="true"></i>${entry.result[key]}`;
          count.setAttribute('aria-label', `${entry.result[key]} ${label}`); hint.append(count);
        }
      } else { hint.textContent = '—'; hint.setAttribute('aria-label', 'Pas encore joué'); }
      row.append(number, pegs, hint); $('history').append(row);
    }
    $('progress').replaceChildren(...Array.from({ length: 10 }, (_, i) => { const el = document.createElement('span'); el.className = i < state.attempts ? 'used' : ''; return el; }));
    paintDraft();
  }
  function choose(color) {
    if (game.getState().status !== 'playing') return;
    draft[selected] = color;
    selected = (selected + 1) % 4;
    paintDraft();
  }
  for (let i = 0; i < 4; i++) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'slot';
    button.addEventListener('focus', () => { selected = i; paintDraft(); });
    button.addEventListener('click', () => { selected = i; paintDraft(); }); $('slots').append(button);
  }
  colors.forEach((color, i) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'palette-color';
    button.setAttribute('aria-label', `${color}, touche ${i + 1}`);
    const label = document.createElement('span'); label.textContent = color;
    button.append(token(color), label);
    button.addEventListener('click', () => choose(color)); $('palette').append(button);
  });
  async function submit() {
    const guess = draft.filter(color => color !== null);
    // An incomplete draft is sent as a short array, preserving contract validation.
    const state = await game.submitGuess(guess);
    if (!state.lastError) { draft = [null, null, null, null]; selected = 0; paintDraft(); }
  }
  $('submit').addEventListener('click', submit);
  $('restart').addEventListener('click', () => game.startGame());
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.altKey || event.metaKey || !document.querySelector('.composer').contains(event.target) || game.getState().status !== 'playing') return;
    if (/^[1-6]$/.test(event.key)) { event.preventDefault(); choose(colors[Number(event.key) - 1]); }
    else if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); selected = (selected + (event.key === 'ArrowRight' ? 1 : 3)) % 4; $('slots').children[selected].focus(); }
    else if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); draft[selected] = null; paintDraft(); }
    else if (event.key === 'Enter' && event.target.closest('#slots, #palette')) { event.preventDefault(); submit(); }
  });
  if (new URLSearchParams(window.location.search).get('test') === '1') {
    render(game.getState());
    window.codeSecretTest = Object.freeze({ version: game.version, getConfig: game.getConfig, getState: game.getState, startGame: game.startGame, submitGuess: game.submitGuess });
  } else game.startGame();
})();
