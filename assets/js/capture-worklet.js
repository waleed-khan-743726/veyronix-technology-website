import {PcmResampler} from './resampler.js';
class CaptureProcessor extends AudioWorkletProcessor {
 constructor(){super();this.resampler=new PcmResampler(sampleRate);this.native=[];}
 process(inputs){const input=inputs[0]?.[0];if(input){let power=0;const native=new Int16Array(input.length);for(let i=0;i<input.length;i++){const x=Math.max(-1,Math.min(1,input[i]));power+=x*x;native[i]=x<0?Math.round(x*32768):Math.round(x*32767);}this.native.push(native);const frames=this.resampler.push(input);for(const frame of frames){let count=0;for(const part of this.native)count+=part.length;const joined=new Int16Array(count);let offset=0;for(const part of this.native){joined.set(part,offset);offset+=part.length;}this.native=[];this.port.postMessage({pcm:frame.buffer,native:joined.buffer,level:Math.sqrt(power/input.length),sourceRate:sampleRate},[frame.buffer,joined.buffer]);}}return true;}
}
registerProcessor('nexus-capture',CaptureProcessor);
