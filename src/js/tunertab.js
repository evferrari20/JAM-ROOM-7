/* ---- Tuner tab ----
   The tuner is its own page (src/tuner.html -> site/tuner.html). This tab shows it inside Jam Room without
   reloading, so an open song is never lost. In the single offline file the page travels inline (#tunersrc).
   Leaving the tab tells the tuner to switch the microphone off. */
(function(){
  var btn=document.getElementById('bTuner'),view=document.getElementById('tunerView');
  if(!btn||!view)return;
  var modes=[].slice.call(document.querySelectorAll('.modes [data-mode]'));
  var frame=null,open=false,prev=[];
  function post(msg){try{if(frame&&frame.contentWindow)frame.contentWindow.postMessage(msg,'*');}catch(e){}}
  function show(){
    if(open)return;open=true;
    try{if(typeof P!=='undefined'&&P.playing&&typeof stop==='function')stop();}catch(e){}
    prev=modes.map(function(b){return b.getAttribute('aria-pressed');});
    modes.forEach(function(b){b.setAttribute('aria-pressed','false');});
    btn.setAttribute('aria-pressed','true');
    document.body.classList.add('mode-tuner');
    if(!frame){
      frame=document.createElement('iframe');
      frame.title='Tuner';
      /* '*' because the offline single file has no web address the browser can match; the frame only ever holds our own tuner page */
      frame.setAttribute('allow','microphone *; autoplay *; screen-wake-lock *');
      var inline=document.getElementById('tunersrc');
      if(inline&&inline.textContent.length>100)frame.srcdoc=inline.textContent.replace(/<\\\/script/g,'</script');
      else frame.src='tuner.html';
      view.appendChild(frame);
    }
  }
  function hide(){
    if(!open)return;open=false;
    document.body.classList.remove('mode-tuner');
    btn.setAttribute('aria-pressed','false');
    modes.forEach(function(b,i){b.setAttribute('aria-pressed',prev[i]);});
    post('jr-tuner-hide');
    try{window.dispatchEvent(new Event('resize'));}catch(e){}
  }
  btn.addEventListener('click',show);
  /* clicking Studio / Orchestra / Learn closes the tuner; the section you were already in just comes back as it was */
  document.addEventListener('click',function(e){
    if(!open)return;
    var b=e.target&&e.target.closest&&e.target.closest('.modes [data-mode]');
    if(!b)return;
    var wasOn=prev[modes.indexOf(b)]==='true';
    hide();
    if(wasOn)e.stopPropagation();
  },true);
  /* while the tuner is showing, Jam Room's keyboard shortcuts (space = play, letters = notes) stay quiet */
  ['keydown','keyup'].forEach(function(ev){document.addEventListener(ev,function(e){if(open)e.stopPropagation();},true);});
  window.__jrTuner={show:show,hide:hide,isOpen:function(){return open;}};
})();
