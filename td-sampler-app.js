// SPDX-License-Identifier: GPL-3.0-only
import{encodeSlot,MAX_SAMPLES}from'./td-sampler-sample.js';
import{sendTape}from'./td-sampler-device.js';
let importedTape,importNotice="";
const $=id=>document.getElementById(id),names=['Tape I','Tape II'];
names.forEach((n,i)=>$('source').add(new Option(n,i)));
const canvas=$('display'),ctx=canvas.getContext('2d'),im=ctx.createImageData(240,240);
let ac,node,stream,media,ready=false,state=[],wasm,db,recordIntent=false,reverse=false;
const send=m=>node?.port.postMessage(m),status=s=>$('status').textContent=s;
const dbp=new Promise((resolve,reject)=>{let r=indexedDB.open('tape-deck-public-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('tapes');r.onsuccess=()=>resolve(db=r.result);r.onerror=()=>reject(r.error);});
async function readFlash(){const d=await dbp;return new Promise((res,rej)=>{const r=d.transaction('tapes').objectStore('tapes').get('flash');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function saveFlash(data){const d=await dbp;return new Promise((res,rej)=>{const t=d.transaction('tapes','readwrite');t.objectStore('tapes').put(data,'flash');t.oncomplete=res;t.onerror=()=>rej(t.error);});}
function paint(buf){const b=new Uint8Array(buf);for(let i=0;i<57600;i++){const v=b[i*2]*256+b[i*2+1];im.data[i*4]=(v>>11)*255/31;im.data[i*4+1]=((v>>5)&63)*255/63;im.data[i*4+2]=(v&31)*255/31;im.data[i*4+3]=255;}ctx.putImageData(im,0,0);}
async function preview(){wasm=await(await fetch('td-sampler-tapedeck.wasm')).arrayBuffer();const{instance}=await WebAssembly.instantiate(wasm,{env:{emscripten_notify_memory_growth(){}}});const e=instance.exports;e._initialize?.();e.web_nor_erase();e.web_boot();for(let i=0;i<190;i++)e.web_render(128);paint(e.memory.buffer.slice(e.web_screen(),e.web_screen()+115200));}
const previewReady=preview().catch(e=>status('Preview could not start: '+e.message));
let bootPromise;
async function power(){if(ready)return;if(bootPromise)return bootPromise;bootPromise=(async()=>{
 await previewReady;ac=new AudioContext({sampleRate:44100});await ac.resume();if(ac.sampleRate!==44100)throw Error('This sampler requires 44.1 kHz audio.');
 await ac.audioWorklet.addModule('td-sampler-worklet.js');const flash=await readFlash();node=new AudioWorkletNode(ac,'tape-deck',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{wasm,flash}});
 await new Promise((resolve,reject)=>{node.port.onmessage=async({data:m})=>{
 if(m.type==='error'){reject(Error(m.message));status(m.message);}
 if(m.type==='ready'){ready=true;$('lamp').classList.add('on');$('power').textContent='POWER ON';status('Tape loaded. Press Play or a slice key.');resolve();}
 if(m.type==='frame'){state=m.state;paint(m.screen);update();}
 if(m.type==='flash'){try{await saveFlash(m.data);status('Tape saved locally.');}catch(e){status('Could not save: '+e.message);}}
 if(m.type==='imported')status(m.ok?'Tape loaded and saved locally. '+importNotice:'Invalid tape.');
 };});node.connect(ac.destination);
 })();try{await bootPromise;}catch(e){bootPromise=null;status(e.message);throw e;}}
function update(){updateChops();const rec=!!state[7];$('rec').classList.toggle('recording',rec);$('rec').textContent=rec?'■ END REC':state[17]===7?(state[43]?'CONFIRM DELETE':'DELETE TAPE'):state[17]===2?'CLEAR STEP':state[17]===4?(state[19]?'■ END OVERDUB':'● LIVE REC'):'● REC';$('tape-name').textContent=rec?'REC ●':names[state[0]];$('source').value=state[0];$('count').textContent=state[8]+' slices';$('pitch-value').textContent=(state[2]>0?'+':'')+state[2]+' st';$('play').setAttribute('aria-pressed',String(!!(state[14]||state[18])));
 if(recordIntent&&!rec&&state[12]>0){recordIntent=false;status('Take captured. SAVE TAKE keeps it in Tape II.');}}
function stopInput(){ $('monitor').setAttribute('aria-pressed','false');media?.disconnect();media=null;stream?.getTracks().forEach(t=>t.stop());stream=null;}
$('power').onclick=()=>power().catch(()=>{});
for(const[id,param]of[['source',0],['slices',1],['pitch',2],['level',3],['bpm',4],['mode',5]])$(id).addEventListener('input',async()=>{try{await power();send({type:'param',id:param,value:id==='mode'?$('mode').selectedIndex:+$(id).value});}catch{}});
$('reverse').onclick=async()=>{await power();reverse=!reverse;$('reverse').setAttribute('aria-pressed',String(reverse));send({type:'param',id:6,value:+reverse});};
$('play').onclick=async()=>{await power();send({type:'action',cmd:1});};
$('stop').onclick=()=>{send({type:'action',cmd:2});recordIntent=false;stopInput();status('Stopped.');};
$('save').onclick=async()=>{await power();if(state[7]){status('End recording before saving.');return;}send({type:'save'});status('Saving the captured take to Tape II…');};
$('rec').onclick=async()=>{try{await power();if(state[17]===7){send({type:'action',cmd:8});return;}if(state[17]===2||state[17]===4){send({type:'action',cmd:state[17]===2?5:4});return;}if(state[7]){send({type:'action',cmd:3});return;}await startInput();recordIntent=true;send({type:'action',cmd:3});status('Recording input — up to 5.85 seconds.');
 }catch(e){stopInput();status('Recording unavailable: '+e.message);}};
async function startInput(){if(stream)return;
const deviceId=$('input').value;
 stream=await navigator.mediaDevices.getUserMedia({audio:{deviceId:deviceId==='default'?undefined:{exact:deviceId},echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
 const selected=$('input').value;const devices=await navigator.mediaDevices.enumerateDevices();$('input').replaceChildren(new Option('Default audio input','default'));devices.filter(d=>d.kind==='audioinput').forEach(d=>$('input').add(new Option(d.label||'Audio input',d.deviceId)));$('input').value=selected;
 media=ac.createMediaStreamSource(stream);media.connect(node);$('monitor').setAttribute('aria-pressed','true');}
$('monitor').onclick=async()=>{try{await power();if(stream){if(state[7]){status('End recording before disabling input.');return;}stopInput();status('Input monitoring off.');}else {await startInput();status('Input monitoring on. Press REC when ready.');}}catch(e){stopInput();status('Input unavailable: '+e.message);}};
$('load').onclick=()=>$('file').click();
$('file').onchange=async()=>{const f=$('file').files[0];if(!f)return;try{if(f.size>50*1024*1024)throw Error('Choose an audio file smaller than 50 MB.');await power();if(state[7])throw Error('Stop recording before importing.');status('Threading '+f.name+'…');const audio=await ac.decodeAudioData(await f.arrayBuffer());const n=Math.min(MAX_SAMPLES,Math.floor(audio.duration*22050));if(!n)throw Error('Empty audio file.');const offline=new OfflineAudioContext(1,n,22050),src=offline.createBufferSource();src.buffer=audio;src.connect(offline.destination);src.start();const mono=(await offline.startRendering()).getChannelData(0);importNotice=audio.duration>n/22050+.01?'Trimmed to '+(n/22050).toFixed(2)+' seconds.':'';const data=encodeSlot(mono,22050,f.name);importedTape=data.slice();$('send').disabled=false;send({type:'import',slot:+$('slot').value,data:data.buffer});if(audio.duration>n/22050+.01)status('Trimmed to '+(n/22050).toFixed(2)+' seconds to fit the tape slot.');}catch(e){status(e.message);}finally{$('file').value='';}};
const keyboard='asdfghjkzxcvbnm,';const held=new Set();
async function note(i,on){if(on){held.add(i);await power();if(!held.has(i))return;}else held.delete(i);send({type:'note',key:i,on});$('pads').children[i].classList.toggle('active',on);}
for(let i=0;i<16;i++){const b=document.createElement('button');b.textContent=String(i+1).padStart(2,'0');b.setAttribute('aria-label','Play slice '+(i+1));b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);note(i,true).catch(()=>{});};b.onpointerup=b.onpointercancel=()=>note(i,false);$('pads').append(b);}
window.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)||e.repeat)return;if(e.code==='Space'){e.preventDefault();$('play').click();}const i=keyboard.indexOf(e.key.toLowerCase());if(i>=0){e.preventDefault();note(i,true).catch(()=>{});}});
window.addEventListener('keyup',e=>{const i=keyboard.indexOf(e.key.toLowerCase());if(i>=0&&held.has(i))note(i,false);});
window.addEventListener('blur',()=>{for(const i of [...held])note(i,false);});
window.addEventListener('pagehide',()=>{send({type:'action',cmd:2});stopInput();ac?.close();});
canvas.addEventListener('pointerdown',async e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*240/r.width,y=(e.clientY-r.top)*240/r.height;if(y>208){if(x<70)$('play').click();else if(x<120)$('stop').click();else if(x<170)$('rec').click();else $('save').click();}});

$('bank').onclick=async()=>{await power();const b=state[16]?0:1;send({type:'param',id:7,value:b});$('bank').textContent=b?'KEYS 17–32':'KEYS 01–16';[...$('pads').children].forEach((p,i)=>p.textContent=String(i+1+16*b).padStart(2,'0'));};

$('send').onclick=async()=>{if(!importedTape)return;const button=$('send');button.disabled=true;try{await sendTape(+$('slot').value,importedTape,p=>status('Writing FM-1 user tape '+(+$('slot').value+1)+': '+p+'%'));status('FM-1 tape loaded. Select User tape '+(+$('slot').value+1)+' with Knob 1.');}catch(e){status(e.message);}finally{button.disabled=false;}};

const chopNames=[[],['Shape','Rate','Destination','Depth'],['Step','Slice / rest','Velocity','Gate %'],['Order','Rate','Gate %','Swing %'],['Length','Rate','BPM','Swing %'],['Delay','Distortion','Reverb','Flanger'],['Splices','Pitch','Mode','Reverse'],['Tape']];
let lastPage=-1;
function updateChops(){document.querySelectorAll('[data-perform]').forEach(b=>{b.setAttribute('aria-pressed',String(!!(state[53]&(1<<Number(b.dataset.perform)))));});const p=state[17]||0;$('fx').setAttribute('aria-pressed',String(!!state[26]||p===5));[...$('pads').children].forEach((b,i)=>{b.textContent=state[26]?fxNames[i]:String(i+1+16*(state[16]||0)).padStart(2,'0');b.setAttribute('aria-label',state[26]?fxNames[i]:'Play slice '+(i+1+16*(state[16]||0)));b.classList.toggle('active',state[26]?!!(state[27]&(1<<i)):held.has(i));});document.querySelectorAll('[data-page]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.page===p)));$('clear-pattern').hidden=p!==2&&p!==4;const layout=state[50]?90:p*10+(p===6?(state[35]||0):p===7?(state[40]||0):0);$('random').setAttribute('aria-pressed',String(!!state[41]));$('latch').setAttribute('aria-pressed',String(!!state[42]));if(lastPage!==layout){lastPage=layout;$('page-knobs').replaceChildren();(state[50]?['USB monitor dB','Recording dB','Chop rate','Gate']:p===6?[['Splices','Pitch','Mode','Reverse'],['Attack','Decay','Release','Level'],['Tone','Level','Pitch','Reverse']][state[35]||0]:p===7?[['Tape'],['Pitch','Level','Mode','Reverse'],['BPM','Rate','Swing','Key bank']][state[40]||0]:chopNames[p]).forEach((name,k)=>{const box=document.createElement('span');box.textContent=name+' ';for(const delta of [-1,1]){const b=document.createElement('button');b.textContent=delta<0?'−':'+';b.setAttribute('aria-label',name+(delta<0?' decrease':' increase'));b.onclick=()=>send({type:'knob',knob:k,delta});box.append(b);}$('page-knobs').append(box);});}
 $('page-help').textContent=['Tape: Play toggles this tape’s loop. Choose another tape and play chops over it. STOP stops all tapes.','LFO: triangle / square / saw; tempo-synced pitch, tone or level. Depth 0 is off.','EDIT: choose a step; keys assign chops. REC clears that step. Choose the tape above to edit its lane.','ARP: Play starts automatic chops: forward / reverse / pendulum / random.','SEQ: REC starts the loop and records taps to the nearest step. Switch tapes to overdub another lane. REC again ends recording.','FX: four effect amounts; 0 = off. Hold FX and play keys for momentary effects.','ENV: per-tape playback, envelope, and tone/mix settings. Press ENV again for the next panel.','GLOBAL: PLAY previews the selected tape. DELETE TAPE twice within 3 seconds erases it and stops playback. Press GLOBAL again for sample and device settings.','INPUT: K1 monitor level (−60=mute, default −24 dB); K2 recording level; K3 chop rate; K4 gate. Hold SCL + OCT− for reverse, SCL + OCT+ for double-rate ratchets.'][state[50]?8:p]+(state[19]?' • LIVE overdub armed':'')+' • Patterns currently last for this session.';
}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=async()=>{await power();send({type:'page',page:+b.dataset.page});});

const fxNames=['Granulize','Scatter','Tremolo','Reverse','Ring mod','Auto pan','Tape stop','Freeze','Wow / flutter','Wavefold','Flanger','Phaser','Reverb throw','Dropout','Distortion','Crush'];
let fxPointer=false;
$('fx').onpointerdown=async ev=>{ev.preventDefault();$('fx').setPointerCapture(ev.pointerId);fxPointer=true;await power();if(fxPointer)send({type:'fxhold',on:true});};
$('fx').onpointerup=$('fx').onpointercancel=()=>{fxPointer=false;send({type:'fxhold',on:false});};
$('fx').onkeydown=async ev=>{if(ev.code==='Enter'&&!ev.repeat){ev.preventDefault();await power();send({type:'page',page:5});}};
window.addEventListener('keydown',async ev=>{if(ev.code==='ShiftLeft'&&!ev.repeat&&!/INPUT|SELECT|TEXTAREA/.test(ev.target.tagName)){await power();if(shiftHeld)send({type:'fxhold',on:true});}});
let shiftHeld=false;
window.addEventListener('keydown',ev=>{if(ev.code==='ShiftLeft')shiftHeld=true;});
window.addEventListener('keyup',ev=>{if(ev.code==='ShiftLeft'){shiftHeld=false;send({type:'fxhold',on:false});}});
window.addEventListener('blur',()=>{shiftHeld=false;fxPointer=false;send({type:'fxhold',on:false});});

$('clear-pattern').onclick=()=>send({type:'action',cmd:6});

let randomHeld=false;
$('random').onpointerdown=async ev=>{ev.preventDefault();$('random').setPointerCapture(ev.pointerId);randomHeld=true;await power();if(randomHeld)send({type:'random',on:true});};
$('random').onpointerup=$('random').onpointercancel=()=>{randomHeld=false;send({type:'random',on:false});};
$('random').onkeydown=async ev=>{if((ev.code==='Space'||ev.code==='Enter')&&!ev.repeat){ev.preventDefault();randomHeld=true;await power();if(randomHeld)send({type:'random',on:true});}};
$('random').onkeyup=ev=>{if(ev.code==='Space'||ev.code==='Enter'){ev.preventDefault();randomHeld=false;send({type:'random',on:false});}};
for(const [id,type] of [['shift','shift'],['latch','octup']]){
 let down=false;
 const start=async()=>{down=true;await power();if(down)send({type,on:true});};
 const end=()=>{down=false;send({type,on:false});};
 $(id).onpointerdown=ev=>{ev.preventDefault();$(id).setPointerCapture(ev.pointerId);start();};
 $(id).onpointerup=$(id).onpointercancel=end;
 $(id).onkeydown=ev=>{if(['Space','Enter'].includes(ev.code)&&!ev.repeat){ev.preventDefault();start();}};
 $(id).onkeyup=ev=>{if(['Space','Enter'].includes(ev.code))end();};
 window.addEventListener('blur',end);
}
window.addEventListener('blur',()=>{randomHeld=false;send({type:'random',on:false});});

// Mirror the ten labeled upper hardware keys, strictly momentary.
for(const [key,label] of ['OP1 · 1/8','OP2 · 1/16','OP3 · 1/32','OP4 · −12','OP5 · +12','OP6 · 1/8D delay','PIT · 1/8 delay','GLO · 1/32 delay','MONO · LP','POLY · HP'].entries()){
 const b=document.createElement('button');b.textContent=label;b.dataset.perform=key;let held=false;
 b.onpointerdown=async ev=>{held=true;b.setPointerCapture(ev.pointerId);await power();if(held)send({type:'perform',key,on:true});};
 const end=()=>{held=false;send({type:'perform',key,on:false});};
 b.onpointerup=b.onpointercancel=b.onlostpointercapture=end;window.addEventListener('blur',end);$('perform').append(b);
}
