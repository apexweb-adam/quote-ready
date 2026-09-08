const pptxgen = require('pptxgenjs');
const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE'; pptx.author = 'Adam Tokar'; pptx.subject = 'QuoteReady prototype'; pptx.title = 'QuoteReady'; pptx.company = 'Independent hackathon entry'; pptx.lang = 'en-GB';
pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos', lang: 'en-GB' };
const C = { bg:'101B24', card:'1B2C37', ink:'F1F5F4', soft:'A5B6BE', lime:'C4F28E' };
function text(s,t,x,y,w,h,size=22,color=C.ink,bold=false) { s.addText(t,{x,y,w,h,fontSize:size,fontFace:'Aptos',color,bold,margin:0,breakLine:false,fit:'shrink',paraSpaceAfterPt:10}); }
function slide(n,kicker,title) {
  const s=pptx.addSlide();s.background={color:C.bg};
  text(s,'Q / QuoteReady',.6,.35,6,.35,16,C.lime,true);text(s,`ASSEMBLYAI VOICE AGENT PROTOTYPE  /  ${n}`,8.4,.38,4.3,.3,10,C.soft);
  text(s,kicker.toUpperCase(),.6,1.05,12,.35,13,C.lime,true);text(s,title,.6,1.58,12.1,1.3,38,C.ink,true);
  text(s,'Adam Tokar  •  September 2026',.6,7.0,8,.25,10,C.soft);return s;
}
function card(s,x,y,w,h,title,body) {s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:.12,fill:{color:C.card},line:{color:C.card}});text(s,title,x+.25,y+.25,w-.5,.45,21,C.lime,true);text(s,body,x+.25,y+.92,w-.5,h-1.15,19,C.ink);}
let s=slide('01','A clearer request, before the quote','Five useful details.\nOne reviewable request.');
text(s,'A voice intake assistant for the clarification work that happens before a service professional can quote.',.65,3.25,7.2,1.3,25,C.soft);
card(s,8.5,3.15,4.2,2.75,'Speak → review','Capture the caller’s words.\nCorrect the details.\nDownload the current draft.');
text(s,'Working prototype • No booking or price promises',.65,5.55,7,.7,18,C.lime);
s=slide('02','The problem','“Can you give me a quote?”\nUsually needs a second conversation.');
card(s,.65,3.3,3.85,2.8,'The vague request','A service is mentioned, but the practical details are scattered or missing.');
card(s,4.75,3.3,3.85,2.8,'The clarification','What equipment? Which area? How is access? What time works?');
card(s,8.85,3.3,3.85,2.8,'The useful handoff','A structured draft with evidence and visible follow-up gaps.');
s=slide('03','The product','From a spoken request\nto a draft the caller can inspect.');
['Requested work','Equipment / property','Service area','Access constraints','Preferred time'].forEach((t,i)=>card(s,.65+i*2.43,3.25,2.2,1.7,String(i+1).padStart(2,'0'),t));
text(s,'Capture → fill gaps → correct → review → download',.7,5.55,11.9,.6,28,C.lime,true);
text(s,'Unknown and declined answers remain explicit. Corrections invalidate the earlier review.',.7,6.3,11.8,.4,17,C.soft);
s=slide('04','Architecture','A small tool surface.\nThe caller keeps final control.');
card(s,.65,3.25,3.8,2.85,'Private token server','API key remains server-side.\n60-second token redemption.\nFive-minute session cap.');
card(s,4.75,3.25,3.8,2.85,'AssemblyAI voice','24 kHz PCM audio.\nTranscripts + spoken replies.\nCapture and inspect tools.');
card(s,8.85,3.25,3.8,2.85,'Local draft','Exact transcript evidence.\nVersioned review.\nExplicit local download.');
text(s,'No email, payment, booking or customer-record tool is exposed.',.7,6.4,12,.35,17,C.soft);
s=slide('05','Verified September 8, 2026','Live API capture and correction\npassed with synthesized speech.');
card(s,.65,3.3,3.8,2.7,'22 local tests','Intake rules, HTTP boundaries, audio resampling and parallel tool-result delivery.');
card(s,4.75,3.3,3.8,2.7,'5 / 5 fields captured','Real provider transcripts and tool calls captured every required field.');
card(s,8.85,3.3,3.8,2.7,'Correction verified','Friday afternoon → Monday morning. The old review was invalidated.');
text(s,'Synthetic speech is API integration evidence. Browser microphone and interruption testing remain pending.',.7,6.4,12,.4,16,C.soft);
s=slide('06','Current scope and next acceptance','Ready to inspect.\nStill a prototype.');
card(s,.65,3.3,5.8,2.65,'Available now','Original MIT-licensed source.\nRunnable local voice application.\nEvidence-backed draft workflow.');
card(s,6.75,3.3,5.9,2.65,'Still to verify','Real microphone and interruption demo.\nSecured public live voice hosting.\nFinal entry and any award.');
text(s,'github.com/apexweb-adam/quote-ready',.7,6.3,11.8,.4,20,C.lime,true);
pptx.writeFile({fileName:process.argv[2] || 'QuoteReady.pptx'});
