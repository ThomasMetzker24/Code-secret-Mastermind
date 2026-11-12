'use strict';
document.getElementById('run').addEventListener('click', async () => {
  const button = document.getElementById('run'); button.disabled = true;
  const list=document.getElementById('results'); list.replaceChildren();
  const frame=document.getElementById('game'), api=frame.contentWindow.codeSecretTest, doc=frame.contentDocument;
  // Reload this page to rerun the initial-state test from a fresh document.
  let passed=0,failed=0;
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  const same=(a,b)=>assert(JSON.stringify(a)===JSON.stringify(b),'États différents');
  const check=async(name,fn)=>{const li=document.createElement('li');try{await fn();li.textContent=`✓ ${name}`;passed++;}catch(e){li.textContent=`ÉCHEC : ${name} — ${e.message}`;li.className='fail';failed++;}list.append(li);};
  const red=Array(4).fill('rouge'),blue=Array(4).fill('bleu');
  await check('API 0.2 exposée uniquement avec test=1',()=>{assert(api?.version==='0.2','API absente');assert(!document.getElementById('normal').contentWindow.codeSecretTest,'API exposée en mode normal');});
  await check('État initial not-started et saisie désactivée',()=>{assert(api.getState().status==='not-started','État initial incorrect : rechargez la page avant de relancer');assert(doc.getElementById('submit').disabled,'Saisie active');});
  await check('Démarrage imposé et remise à zéro visibles',async()=>{await api.startGame({secret:['rouge','rouge','bleu','vert']});assert(doc.getElementById('attempt-count').textContent==='0 sur 10','Compteur incorrect');assert(doc.querySelectorAll('.played').length===0,'Historique non vide');});
  await check('Indices de répétition 2/2 affichés dans la même partie',async()=>{const s=await api.submitGuess(['rouge','bleu','rouge','vert']);same(s.lastResult,{wellPlaced:2,misplaced:2});assert(doc.querySelectorAll('.played').length===1,'Essai absent');assert(doc.querySelector('.played .hint').getAttribute('aria-label')==='2 bien placées, 2 mal placées','Indices différents');});
  await check('Refus expliqué sans consommation ni nouvel historique',async()=>{const s=await api.submitGuess(['rouge']);assert(s.lastError.code==='invalid-length','Refus incorrect');assert(doc.getElementById('message').textContent===s.lastError.message,'Erreur invisible');assert(doc.querySelectorAll('.played').length===1,'Historique modifié');});
  await check('Démarrage invalide sans changement de l’état ni du DOM',async()=>{const before=api.getState(),html=doc.body.innerHTML;let code;try{await api.startGame({secret:null});}catch(e){code=e.code;}assert(code==='invalid-type','Mauvais rejet');same(api.getState(),before);assert(doc.body.innerHTML===html,'Interface modifiée');});
  await check('Actions par clic puis lecture dans l’API',async()=>{await api.startGame({secret:red});for(let i=0;i<4;i++)doc.querySelector('[aria-label="rouge, touche 1"]').click();doc.getElementById('submit').click();await new Promise(resolve=>setTimeout(resolve,0));assert(api.getState().status==='won','Clics non reliés à l’API');assert(doc.getElementById('status-badge').textContent==='Gagné !','Victoire invisible');});
  await check('Victoire au dixième essai visible ; action bloquée après la fin',async()=>{await api.startGame({secret:red});for(let i=0;i<9;i++)await api.submitGuess(blue);await api.submitGuess(red);assert(api.getState().status==='won','Victoire incorrecte');assert(doc.getElementById('attempt-count').textContent==='10 sur 10','Compteur incorrect');assert(doc.getElementById('submit').disabled,'Action active');const before=api.getState();const after=await api.submitGuess(null);assert(after.lastError.code==='game-finished','Refus incorrect');same({...after,lastError:null},before);});
  await check('Défaite au dixième et historique de dix essais',async()=>{await api.startGame({secret:red});for(let i=0;i<10;i++)await api.submitGuess(blue);assert(api.getState().status==='lost','Défaite incorrecte');assert(doc.getElementById('status-badge').textContent==='Terminé','Défaite invisible');assert(doc.querySelectorAll('.played').length===10,'Historique incomplet');});
  await check('Nouvelle partie par l’interface remet aussi l’API à zéro',async()=>{doc.getElementById('restart').click();assert(api.getState().status==='playing','Redémarrage absent');assert(api.getState().attempts===0,'Compteur non remis à zéro');assert(doc.querySelectorAll('.played').length===0,'Historique non effacé');assert([...doc.querySelectorAll('.slot')].every(b=>b.getAttribute('aria-label').includes('vide')),'Saisie non effacée');});
  document.getElementById('summary').textContent=`${passed} vérifications réussies, ${failed} échec${failed>1?'s':''}.`;
  button.disabled=false;
});
