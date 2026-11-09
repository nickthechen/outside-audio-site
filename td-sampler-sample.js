// SPDX-License-Identifier: GPL-3.0-only
// Encode a mono PCM buffer into Felucca's existing FSMP flash-slot layout.
const STEP=[7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,34,37,41,45,50,55,60,66,73,80,88,97,107,118,130,143,157,173,190,209,230,253,279,307,337,371,408,449,494,544,598,658,724,796,876,963,1060,1166,1282,1411,1552,1707,1878,2066,2272,2499,2749,3024,3327,3660,4026,4428,4871,5358,5894,6484,7132,7845,8630,9493,10442,11487,12635,13899,15289,16818,18500,20350,22385,24623,27086,29794,32767];
const INDEX=[-1,-1,-1,-1,2,4,6,8];
export const MAX_SAMPLES=(81920-512)*2;
export function encodeSlot(pcm,rate=22050,name='USER') {
  if (!pcm.length || pcm.length>MAX_SAMPLES || rate<8000 || rate>44100) throw Error('Sample does not fit the FM-1 slot.');
  const slot=new Uint8Array(81920),v=new DataView(slot.buffer),n=pcm.length;
  v.setUint32(0,0x504d5346,true); v.setUint16(4,1,true); slot[6]=1;
  for(let i=0;i<8;i++) slot[8+i]=i<name.length ? (name.charCodeAt(i)&127) : 0;
  v.setUint32(16,Math.ceil(n/2),true);
  // One zone, rooted at MIDI 60, all keys, unlooped. GRAIN does its own looping.
  v.setUint32(36,n,true); v.setUint32(44,n-1,true);
  v.setUint32(48,Math.round(rate/44100*65536),true);v.setInt16(52,60*16,true);slot[58]=127;
  let pred=0,idx=0;
  for(let i=0;i<n;i++) {
    let target=Math.round(Math.max(-1,Math.min(1,Number.isFinite(pcm[i])?pcm[i]:0))*32767);
    let diff=target-pred,code=diff<0?8:0;diff=Math.abs(diff);
    let step=STEP[idx],delta=step>>3;
    if(diff>=step){code|=4;diff-=step;delta+=step;}
    if(diff>=(step>>1)){code|=2;diff-=step>>1;delta+=step>>1;}
    if(diff>=(step>>2)){code|=1;delta+=step>>2;}
    pred=Math.max(-32768,Math.min(32767,pred+((code&8)?-delta:delta)));
    idx=Math.max(0,Math.min(88,idx+INDEX[code&7]));
    slot[512+(i>>1)]|=code<<((i&1)*4);
  }
  let crc=0xffffffff;
  for(const b of slot.subarray(512,512+Math.ceil(n/2))){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  v.setUint32(20,(crc^0xffffffff)>>>0,true);return slot;
}
