export class PcmResampler {
 constructor(rate){if(rate<16000||rate>192000)throw Error('Unsupported capture rate');this.ratio=rate/16000;this.weight=0;this.sum=0;this.frame=[];}
 push(samples){const frames=[];for(const sample of samples){let remaining=1;while(remaining>1e-8){const take=Math.min(remaining,this.ratio-this.weight);this.sum+=sample*take;this.weight+=take;remaining-=take;if(this.weight>=this.ratio-1e-8){this.frame.push(Math.max(-32768,Math.min(32767,Math.round(this.sum/this.ratio*32767))));this.weight=0;this.sum=0;if(this.frame.length===320){frames.push(Int16Array.from(this.frame));this.frame=[];}}}}return frames;}
}
