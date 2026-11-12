const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGame, score } = require('../game.js');
const vm = require('node:vm');
const R = 'rouge', B = 'bleu', V = 'vert', J = 'jaune', O = 'orange', P = 'violet';
const red = [R,R,R,R], blue = [B,B,B,B];
const cases = [
  [[R,B,V,J], [R,V,B,O], 1,2], [[R,B,V,J], [O,P,R,B], 0,2],
  [[R,B,V,J], [B,R,J,V], 0,4], [[R,B,V,J], [R,B,J,V], 2,2],
  [[R,B,V,J], [R,B,V,J], 4,0], [[R,R,B,V], red, 2,0],
  [[R,R,B,V], [R,B,R,V], 2,2], [[R,R,B,V], [R,R,B,V], 4,0],
  [[R,R,B,V], [R,B,R,R], 1,2]
];
cases.forEach(([secret, guess, wellPlaced, misplaced], i) => test(`T${String(i+1).padStart(2,'0')} : indices et état`, async () => {
  const game = createGame(); await game.startGame({secret});
  const s = await game.submitGuess(guess);
  assert.deepEqual(s.lastResult, { wellPlaced, misplaced });
  assert.equal(s.status, wellPlaced === 4 ? 'won' : 'playing');
  assert.equal(s.attempts, 1); assert.equal(s.history.length, 1); assert.equal(s.lastError, null);
}));
test('Configuration et état initial ; refus avant démarrage', async () => {
  const g = createGame(); assert.equal(g.version, '0.2');
  assert.deepEqual(g.getConfig(), { apiVersion:'0.2', rulesVersion:'code-couleurs-1.0', secretLength:4, maxAttempts:10, allowDuplicates:true, colors:[R,B,V,J,O,P] });
  assert.deepEqual(g.getState(), { status:'not-started', attempts:0, history:[], lastGuess:null, lastResult:null, lastError:null });
  assert.equal((await g.submitGuess(null)).lastError.code, 'game-not-started');
});
test('Objet ordinaire fourni par une autre fenêtre (régression intégration)', async () => {
  const g=createGame();
  const options=vm.runInNewContext('({secret:["rouge","rouge","rouge","rouge"]})');
  assert.equal((await g.startGame(options)).status,'playing');
  assert.equal((await g.submitGuess(red)).status,'won');
});
test('Priorité des refus, tableaux creux, identifiants stricts et absence de consommation', async () => {
  const g = createGame(); await g.startGame({secret:red}); await g.submitGuess(blue);
  const before = g.getState();
  for (const [guess, code] of [[null,'invalid-type'],[[R,null],'invalid-type'],[new Array(4),'invalid-type'],[[R,,B,V],'invalid-type'],[[R],'invalid-length'],[[R,B,V,J,O],'invalid-length'],[['Violet',B,V,J],'invalid-color'],[['violet ',B,V,J],'invalid-color'],[['purple',B,V,J],'invalid-color']]) {
    const s = await g.submitGuess(guess); assert.equal(s.lastError.code,code); assert.ok(s.lastError.message.length);
    assert.deepEqual({...s,lastError:null},{...before,lastError:null});
  }
  assert.equal((await g.submitGuess(blue)).lastError,null);
});
test('Victoire au dixième après refus au neuvième ; fin immuable ; redémarrage', async () => {
  const g = createGame(); await g.startGame({secret:red});
  for (let i=0;i<9;i++) await g.submitGuess(blue);
  assert.equal((await g.submitGuess([R])).attempts,9);
  const won = await g.submitGuess(red); assert.equal(won.status,'won'); assert.equal(won.attempts,10);
  const refused = await g.submitGuess(null); assert.equal(refused.lastError.code,'game-finished');
  assert.deepEqual({...refused,lastError:null},won);
  const fresh = await g.startGame(); assert.equal(fresh.status,'playing'); assert.equal(fresh.attempts,0); assert.deepEqual(fresh.history,[]); assert.equal(fresh.lastError,null);
});
test('Défaite à dix, refus après la fin et redémarrage avec secret', async () => {
  const g = createGame(); await g.startGame({secret:red});
  for (let i=0;i<10;i++) await g.submitGuess(blue);
  const lost = g.getState(); assert.equal(lost.status,'lost'); assert.deepEqual(lost.lastResult,{wellPlaced:0,misplaced:0});
  assert.equal((await g.submitGuess(red)).lastError.code,'game-finished');
  const s = await g.startGame({secret:blue}); assert.equal(s.attempts,0); assert.equal(s.lastGuess,null); assert.equal(s.lastResult,null);
});
test('Démarrage invalide : rejet codé et état intégralement conservé', async () => {
  const g = createGame(); await g.startGame({secret:red}); await g.submitGuess([R]);
  const before = g.getState();
  for (const [options,code] of [[null,'invalid-options'],[[],'invalid-options'],[4,'invalid-options'],[new Date(),'invalid-options'],[{other:1,secret:null},'invalid-options'],[{secret:undefined},'invalid-type'],[{secret:null},'invalid-type'],[{secret:[R,null]},'invalid-type'],[{secret:new Array(4)},'invalid-type'],[{secret:[R]},'invalid-length'],[{secret:[R,R,R,'Rouge']},'invalid-color']]) {
    await assert.rejects(g.startGame(options),e=>e instanceof Error && e.code===code && Boolean(e.message));
    assert.deepEqual(g.getState(),before);
  }
  for (const options of [undefined,{}]) assert.equal((await g.startGame(options)).status,'playing');
});
test('Copies indépendantes des entrées, résultats et configuration ; aucun secret renvoyé', async () => {
  const g=createGame(), secret=[R,R,B,V]; await g.startGame({secret}); secret.fill(P);
  const guess=[R,B,R,V], s=await g.submitGuess(guess); guess.fill(P);
  assert.deepEqual(s.lastResult,{wellPlaced:2,misplaced:2});
  s.history[0].guess.fill(O); s.lastGuess.fill(O); s.lastResult.wellPlaced=99;
  const config=g.getConfig(); config.colors.length=0;
  const current=g.getState(); assert.deepEqual(current.history[0].guess,[R,B,R,V]); assert.deepEqual(current.lastResult,{wellPlaced:2,misplaced:2});
  assert.equal(g.getConfig().colors.length,6); assert.equal('secret' in current,false); assert.equal('solution' in current,false);
});
test('Chaque mutation notifie le même état avant la résolution ; getters sans effets', async () => {
  const seen=[], g=createGame(s=>seen.push(s));
  assert.deepEqual(await g.startGame({secret:red}),seen.at(-1));
  assert.deepEqual(await g.submitGuess(blue),seen.at(-1));
  assert.deepEqual(await g.submitGuess(null),seen.at(-1));
  const n=seen.length;g.getState();g.getConfig();assert.equal(seen.length,n);
});
test('Comptage indépendant sur les 1296 codes face à des propositions avec répétitions', () => {
  const colors=[R,B,V,J,O,P];
  for (let n=0;n<1296;n++) {
    let x=n; const secret=Array.from({length:4},()=>{const c=colors[x%6];x=Math.floor(x/6);return c;});
    for (const guess of [red,blue,[R,B,R,V],[P,O,J,V]]) {
      const wellPlaced=secret.filter((c,i)=>c===guess[i]).length;
      const total=colors.reduce((sum,c)=>sum+Math.min(secret.filter(v=>v===c).length,guess.filter(v=>v===c).length),0);
      assert.deepEqual(score(secret,guess),{wellPlaced,misplaced:total-wellPlaced});
    }
  }
});
