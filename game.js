(function (root) {
  'use strict';
  const COLORS = ['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet'];
  const MESSAGES = {
    'game-not-started': 'Démarrez une nouvelle partie pour jouer.',
    'game-finished': 'Cette partie est terminée. Démarrez une nouvelle partie.',
    'invalid-options': 'Les options doivent être un objet contenant uniquement un éventuel secret.',
    'invalid-type': 'La proposition doit être un tableau complet de noms de couleurs.',
    'invalid-length': 'Choisissez exactement quatre couleurs avant de valider.',
    'invalid-color': 'Une couleur proposée n’est pas autorisée. Choisissez parmi les six couleurs.'
  };
  const copy = value => JSON.parse(JSON.stringify(value));
  function isPlainObject(value) {
    if (value === null || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    if (proto === null) return true;
    // A teacher's test page may supply an ordinary object from another window.
    const constructor = Object.prototype.hasOwnProperty.call(proto, 'constructor') && proto.constructor;
    return typeof constructor === 'function' && Function.prototype.toString.call(constructor) === Function.prototype.toString.call(Object);
  }
  function validationError(value) {
    if (!Array.isArray(value)) return 'invalid-type';
    for (let i = 0; i < value.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(value, i) || typeof value[i] !== 'string') return 'invalid-type';
    }
    if (value.length !== 4) return 'invalid-length';
    if (value.some(color => !COLORS.includes(color))) return 'invalid-color';
    return null;
  }
  function score(secret, guess) {
    let wellPlaced = 0;
    const remainingSecret = {}, remainingGuess = {};
    secret.forEach((color, i) => {
      if (color === guess[i]) wellPlaced++;
      else {
        remainingSecret[color] = (remainingSecret[color] || 0) + 1;
        remainingGuess[guess[i]] = (remainingGuess[guess[i]] || 0) + 1;
      }
    });
    const misplaced = COLORS.reduce((sum, color) => sum + Math.min(remainingSecret[color] || 0, remainingGuess[color] || 0), 0);
    return { wellPlaced, misplaced };
  }
  function createGame(onChange = () => {}) {
    let secret = [];
    let state = { status: 'not-started', attempts: 0, history: [], lastGuess: null, lastResult: null, lastError: null };
    const getState = () => copy(state);
    const publish = () => { onChange(getState()); return getState(); };
    return {
      version: '0.2',
      getConfig: () => ({ apiVersion: '0.2', rulesVersion: 'code-couleurs-1.0', secretLength: 4, maxAttempts: 10, allowDuplicates: true, colors: [...COLORS] }),
      getState,
      async startGame(options = {}) {
        let code = null;
        if (!isPlainObject(options) ||
            Reflect.ownKeys(options).some(key => key !== 'secret')) code = 'invalid-options';
        else if (Object.prototype.hasOwnProperty.call(options, 'secret')) code = validationError(options.secret);
        if (code) throw Object.assign(new Error(MESSAGES[code]), { code });
        secret = Object.prototype.hasOwnProperty.call(options, 'secret') ? [...options.secret] : Array.from({ length: 4 }, () => COLORS[Math.floor(Math.random() * COLORS.length)]);
        state = { status: 'playing', attempts: 0, history: [], lastGuess: null, lastResult: null, lastError: null };
        return publish();
      },
      async submitGuess(guess) {
        const code = state.status === 'not-started' ? 'game-not-started' : state.status !== 'playing' ? 'game-finished' : validationError(guess);
        if (code) { state.lastError = { code, message: MESSAGES[code] }; return publish(); }
        const result = score(secret, guess);
        state.history.push({ guess: [...guess], result });
        state.attempts++;
        state.lastGuess = [...guess];
        state.lastResult = result;
        state.lastError = null;
        state.status = result.wellPlaced === 4 ? 'won' : state.attempts === 10 ? 'lost' : 'playing';
        return publish();
      }
    };
  }
  const exports = { createGame, score, validationError };
  if (typeof module !== 'undefined' && module.exports) module.exports = exports;
  else root.CodeSecret = exports;
})(typeof window !== 'undefined' ? window : globalThis);
