// SPDX-License-Identifier: GPL-3.0-only
// Existing Felucca sample-slot protocol, commands 11–15. Never writes firmware.
const prefix=[0xf0,0x7d,0x46,0x4c];
function pack7(bytes){const out=[];for(let i=0;i<bytes.length;i+=7){const b=bytes.subarray(i,i+7);out.push(b.reduce((a,x,j)=>a|((x>>7)<<j),0),...b.map(x=>x&127));}return out;}
export async function sendTape(slot,data,progress){
 if(!navigator.requestMIDIAccess)throw Error('Web MIDI is unavailable in this browser. Use the hardware import script.');
 const midi=await navigator.requestMIDIAccess({sysex:true});const inputs=[...midi.inputs.values()].filter(p=>/Felucca|TapeDeck FM-1/i.test(p.name)),outputs=[...midi.outputs.values()].filter(p=>/Felucca|TapeDeck FM-1/i.test(p.name));
 if(inputs.length!==1||outputs.length!==1)throw Error('Connect exactly one FM-1 running Tape Deck.');
 const input=inputs[0],output=outputs[0];await input.open();await output.open();
 function req(cmd,args=[],timeout=5000){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{input.removeEventListener('midimessage',handler);reject(Error('FM-1 did not reply. The slot may be incomplete; retry the upload.'));},timeout);function handler(e){const d=e.data;if(d[0]!==0xf0||d[1]!==0x7d||d[2]!==0x46||d[3]!==0x4c||d[4]!==cmd)return;clearTimeout(timer);input.removeEventListener('midimessage',handler);resolve([...d.subarray(5,d.length-1)]);}input.addEventListener('midimessage',handler);output.send([...prefix,cmd,...args,0xf7]);});}
 try{
  for(let retry=0;retry<3;retry++){try{await req(15,[],1000);break;}catch(e){if(retry===2)throw e;}}const size=new DataView(data.buffer,data.byteOffset).getUint32(16,true);
  if((await req(11,[slot]))[1])throw Error('FM-1 refused the upload. Stop playback/recording first.');
  for(let off=0;off<size;off+=256){const a=512+off,reply=await req(12,[slot,a&127,(a>>7)&127,(a>>14)&127,...pack7(data.subarray(a,Math.min(a+256,512+size)))]);if(reply[4])throw Error('FM-1 sample write failed. Retry the upload.');progress(Math.min(100,Math.round((off+256)*100/size)));}
  if((await req(13,[slot,...pack7(data.subarray(0,480))]))[1])throw Error('FM-1 could not validate the tape.');
 }finally{await input.close();await output.close();}
}
