// SPDX-License-Identifier: GPL-3.0-only
class TapeProcessor extends AudioWorkletProcessor{
 constructor(options){super();this.count=0;this.ready=false;this.port.onmessage=e=>this.message(e.data);this.boot(options.processorOptions);}
 async boot(o){try{const {instance}=await WebAssembly.instantiate(o.wasm,{env:{emscripten_notify_memory_growth(){}}});this.e=instance.exports;this.e._initialize?.();this.e.web_nor_erase();if(o.flash)new Uint8Array(this.e.memory.buffer,this.e.web_nor(),1048576).set(new Uint8Array(o.flash));this.e.web_boot();this.ready=true;this.port.postMessage({type:'ready'});}catch(e){this.port.postMessage({type:'error',message:String(e)});}}
 message(m){if(!this.ready)return;const e=this.e;
 if(m.type==='perform')e.td_perform(m.key,m.on?1:0);
 if(m.type==='shift')e.td_shift_hold(m.on?1:0);
 if(m.type==='octup')e.td_octup_hold(m.on?1:0);
 if(m.type==='random')e.td_random_hold(m.on?1:0);
 if(m.type==='fxhold')e.td_fx_hold(m.on?1:0);
 if(m.type==='page')e.td_page_select(m.page);
 if(m.type==='knob')e.td_knob_turn(m.knob,m.delta);
 if(m.type==='param')e.td_param(m.id,m.value);
 if(m.type==='action'){e.td_action(m.cmd);if(m.cmd===8)this.deletePending=true;}
 if(m.type==='note')e.td_note(m.key,m.on?1:0);
 if(m.type==='import'){if(!Number.isInteger(m.slot)||m.slot<0||m.slot>=2||e.td_get(7))return;new Uint8Array(e.memory.buffer,e.td_slot(m.slot),81920).set(new Uint8Array(m.data));const ok=e.td_upload(m.slot);this.port.postMessage({type:'imported',ok});this.persist();}
 if(m.type==='save'){e.td_save_take();this.savePending=true;}
 }
 persist(){const e=this.e;this.port.postMessage({type:'flash',data:e.memory.buffer.slice(e.web_nor(),e.web_nor()+1048576)});}
 process(inputs,outputs){const out=outputs[0];if(!this.ready)return true;const e=this.e,n=out[0].length;
 const input=inputs[0];if(input?.length&&input[0]?.length){const b=new Float32Array(e.memory.buffer,e.td_input(),256);for(let i=0;i<n;i++){b[2*i]=input[0][i]||0;b[2*i+1]=(input[1]||input[0])[i]||0;}e.td_capture(n);}
 e.web_render(n);out[0].set(new Float32Array(e.memory.buffer,e.web_out_l(),n));out[1].set(new Float32Array(e.memory.buffer,e.web_out_r(),n));
 if((this.count+=n)>=2205){this.count=0;const state=Array.from({length:56},(_,i)=>e.td_get(i));const screen=e.memory.buffer.slice(e.web_screen(),e.web_screen()+115200);this.port.postMessage({type:'frame',state,screen},[screen]);if(this.deletePending&&(state[13]===4||state[13]===2)){this.deletePending=false;this.persist();}if(this.savePending&&state[13]){this.savePending=false;this.persist();}}
 return true;
 }
}
registerProcessor('tape-deck',TapeProcessor);
