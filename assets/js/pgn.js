(function(){"use strict";const PIECE_THEME_URL="https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";const SAN_CORE_REGEX=/^([O0]-[O0](-[O0])?[+#]?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|[a-h][1-8](=[QRBN])?[+#]?)$/;const RESULT_REGEX=/^(1-0|0-1|1\/2-1\/2|½-½|\*)$/;const MOVE_NUMBER_REGEX=/^(\d+)(\.+)$/;const EVAL_TOKEN=/^[\+\-=∞±]+$/;const NBSP="\u00A0";const NAG_MAP={1:"!",2:"?",3:"‼",4:"⁇",5:"⁉",6:"⁈",13:"→",14:"↑",15:"⇆",16:"⇄",17:"⟂",18:"∞",19:"⟳",20:"⟲",36:"⩲",37:"⩱",38:"±",39:"∓",40:"+=",41:"=+",42:"±",43:"∓",44:"⨀",45:"⨁"};let diagramCounter=0;
function ensureDeps(){if(typeof Chess==="undefined"){console.warn("pgn.js: chess.js missing");return false}return true}
function normalizeResult(s){return s?s.replace(/1\/2-1\/2/g,"½-½"):""}
function extractYear(d){if(!d)return"";let p=d.split(".");return/^\d{4}$/.test(p[0])?p[0]:""}
function flipName(n){if(!n)return"";let i=n.indexOf(",");return i===-1?n.trim():n.substring(i+1).trim()+" "+n.substring(0,i).trim()}
function appendText(el,t){if(t)el.appendChild(document.createTextNode(t))}
function createDiagram(w,fen){if(typeof Chessboard==="undefined"){console.warn("pgn.js: chessboard.js missing");return}let id="pgn-diagram-"+diagramCounter++,d=document.createElement("div");d.className="pgn-diagram";d.id=id;d.style.width="340px";d.style.maxWidth="100%";w.appendChild(d);setTimeout(()=>{let t=document.getElementById(id);if(t)Chessboard(t,{position:fen,draggable:false,pieceTheme:PIECE_THEME_URL})},0)}
class PGNGameView{
constructor(el){this.sourceEl=el;this.wrapper=document.createElement("div");this.wrapper.className="pgn-blog-block";this.lastLiteralToken=null;this.lastWasMove=false;this.build();this.applyFigurines()}
static isSANCore(t){return SAN_CORE_REGEX.test(t)}
static split(raw){
 let lines=raw.split(/\r?\n/),headers=[],moves=[],inH=true;
 for(let ln of lines){
    let t=ln.trim();
    if(inH && t.startsWith("[") && t.endsWith("]")) headers.push(ln);
    else if(inH && t==="") inH=false;
    else { inH=false; moves.push(ln); }
 }
 return{headers,moveText:moves.join(" ").replace(/\s+/g," ").trim()};
}
build(){
 let raw=this.sourceEl.textContent.trim();
 let{headers,moveText}=PGNGameView.split(raw);
 let full=(headers.length?headers.join("\n")+"\n\n":"")+moveText;
 let g=new Chess();g.load_pgn(full,{sloppy:true});
 let h=g.header(),res=normalizeResult(h.Result||"");
 this.header(h);
 this.parse(moveText+(res?" "+res:""));
 this.sourceEl.replaceWith(this.wrapper);
}
header(h){
 let w=(h.WhiteTitle?h.WhiteTitle+" ":"")+flipName(h.White||"")+(h.WhiteElo?" ("+h.WhiteElo+")":"");
 let b=(h.BlackTitle?h.BlackTitle+" ":"")+flipName(h.Black||"")+(h.BlackElo?" ("+h.BlackElo+")":"");
 let y=extractYear(h.Date),e=(h.Event||"")+(y?", "+y:"");
 let H=document.createElement("h3");
 H.appendChild(document.createTextNode(`${w} – ${b}`));
 H.appendChild(document.createElement("br"));
 H.appendChild(document.createTextNode(e));
 this.wrapper.appendChild(H);
}
ensure(ctx,cls){if(!ctx.container){let p=document.createElement("p");p.className=cls;this.wrapper.appendChild(p);ctx.container=p}}
handleSAN(tok,ctx){
 let core=tok.replace(/[^a-hKQRBN0-9=O0-]+$/g,"")
             .replace(/0/g,"O")
             .replace(/O-O-O/g,"O\u2011O\u2011O")
             .replace(/O-O/g,"O\u2011O");
 if(!PGNGameView.isSANCore(core)){appendText(ctx.container,tok+" ");this.lastWasMove=false;return null}
 let base=ctx.baseHistoryLen||0,before=ctx.chess.history().length,ply=base+before,white=ply%2===0,
 num=Math.floor(ply/2)+1;
 if(ctx.type==="main"){
   if(white)appendText(ctx.container,num+"."+NBSP);
   else if(ctx.lastWasInterrupt)appendText(ctx.container,num+"..."+NBSP);
 } else {
   if(white)appendText(ctx.container,num+"."+NBSP);
   else if(ctx.lastWasInterrupt)appendText(ctx.container,num+"..."+NBSP);
 }
 ctx.prevFen=ctx.chess.fen();
 ctx.prevHistoryLen=ply;
 let mv=ctx.chess.move(core,{sloppy:true});
 if(!mv){appendText(ctx.container,tok+" ");this.lastWasMove=false;return null}
 ctx.lastWasInterrupt=false;
 this.lastLiteralToken=null;
 this.lastWasMove=true;
 let s=document.createElement("span");
 s.className="pgn-move sticky-move";
 s.dataset.fen=ctx.chess.fen();
 s.textContent=tok+" ";
 ctx.container.appendChild(s);
 return s;
}
parseComment(text,pos,ctx){
 let i=pos;
 while(i<text.length && text[i]!=="}")i++;
 let c=text.substring(pos,i).trim();
 if(text[i]==="}")i++;
 let parts=c.split("[D]");
 for(let p=0;p<parts.length;p++){
   let t=parts[p].trim();
   if(ctx.type==="variation"){
     this.ensure(ctx,"pgn-variation");
     if(t)appendText(ctx.container," "+t);
   } else {
     if(t){
       let P=document.createElement("p");
       P.className="pgn-comment";
       appendText(P,t);
       this.wrapper.appendChild(P);
     }
     ctx.container=null;
   }
   if(p<parts.length-1)createDiagram(this.wrapper,ctx.chess.fen());
 }
 ctx.lastWasInterrupt=true;
 this.lastLiteralToken=null;
 this.lastWasMove=false;
 return i;
}
parse(text){
 let main=new Chess(),ctx={type:"main",chess:main,container:null,parent:null,lastWasInterrupt:false,prevFen:main.fen(),prevHistoryLen:0,baseHistoryLen:null},i=0;
 while(i<text.length){
   let ch=text[i];
   if(/\s/.test(ch)){
     while(i<text.length && /\s/.test(text[i]))i++;
     this.ensure(ctx,ctx.type==="main"?"pgn-mainline":"pgn-variation");
     appendText(ctx.container," ");
     continue;
   }
   if(ch==="("){
     i++;
     let fen=ctx.prevFen||ctx.chess.fen(),
         hist=typeof ctx.prevHistoryLen==="number"?ctx.prevHistoryLen:ctx.chess.history().length;
     ctx={type:"variation",chess:new Chess(fen),container:null,parent:ctx,lastWasInterrupt:true,prevFen:fen,prevHistoryLen:hist,baseHistoryLen:hist};
     this.ensure(ctx,"pgn-variation");
     continue;
   }
   if(ch===")"){
     i++;
     if(ctx.parent){ctx=ctx.parent;ctx.lastWasInterrupt=true;ctx.container=null}
     continue;
   }
   if(ch==="{"){i=this.parseComment(text,i+1,ctx);continue}
   let start=i;
   while(i<text.length && !/\s/.test(text[i]) && !"(){ }".includes(text[i]))i++;
   let tok=text.substring(start,i);
   if(!tok)continue;
   if(tok==="[D]"){
     createDiagram(this.wrapper,ctx.chess.fen());
     ctx.lastWasInterrupt=true;ctx.container=null;
     continue;
   }
   if(RESULT_REGEX.test(tok)){
     this.ensure(ctx,ctx.type==="main"?"pgn-mainline":"pgn-variation");
     appendText(ctx.container,tok+" ");
     continue;
   }
   if(MOVE_NUMBER_REGEX.test(tok))continue;
   let stripped=tok.replace(/[^a-hKQRBN0-9=O0-]+$/g,"")
                   .replace(/0/g,"O")
                   .replace(/O-O-O/g,"O\u2011O\u2011O")
                   .replace(/O-O/g,"O\u2011O"),
       isSAN=PGNGameView.isSANCore(stripped);
   if(!isSAN){
     if(tok[0]==="$"){
       let id=Number(tok.substring(1));
       if(NAG_MAP[id]){
         this.ensure(ctx,ctx.type==="main"?"pgn-mainline":"pgn-variation");
         appendText(ctx.container,NAG_MAP[id]+" ");
       }
       this.lastLiteralToken=tok;this.lastWasMove=false;
       continue;
     }
     let letters=/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(tok);
     if(EVAL_TOKEN.test(tok) && tok===this.lastLiteralToken)continue;
     if(letters){
       if(ctx.type==="variation"){
         this.ensure(ctx,"pgn-variation");
         appendText(ctx.container," "+tok);
       } else {
         let P=document.createElement("p");
         P.className="pgn-comment";
         appendText(P,tok);
         this.wrapper.appendChild(P);
         ctx.container=null;
         ctx.lastWasInterrupt=true;
       }
     } else {
       this.ensure(ctx,ctx.type==="main"?"pgn-mainline":"pgn-variation");
       appendText(ctx.container,tok+" ");
     }
     this.lastLiteralToken=tok;this.lastWasMove=false;
     continue;
   }
   this.ensure(ctx,ctx.type==="main"?"pgn-mainline":"pgn-variation");
   let sn=this.handleSAN(tok,ctx);
   if(!sn)appendText(ctx.container,tok+" ");
 }
}
applyFigurines(){
 let M={K:"♔",Q:"♕",R:"♖",B:"♗",N:"♘"};
 this.wrapper.querySelectorAll(".pgn-move").forEach(s=>{
   let m=s.textContent.match(/^([KQRBN])(.+?)(\s*)$/);
   if(m)s.textContent=M[m[1]]+m[2]+(m[3]||"");
 });
}}
class PGNRenderer{
 static renderAll(root){(root||document).querySelectorAll("pgn").forEach(el=>new PGNGameView(el))}
 static init(){if(!ensureDeps())return;PGNRenderer.renderAll(document);window.PGNRenderer={run(r){PGNRenderer.renderAll(r||document.body)}}}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>PGNRenderer.init());else PGNRenderer.init();
})();
