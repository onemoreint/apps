/* Intro: una vez por sesión */try{if(!sessionStorage.getItem("om_intro")&&!matchMedia("(prefers-reduced-motion:reduce)").matches)document.documentElement.classList.add("intro-on")}catch(e){}
