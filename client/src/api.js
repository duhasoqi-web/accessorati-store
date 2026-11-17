let csrf='';
export async function request(path, options={}){
 const method=options.method||'GET';
 if(method!=='GET'&&!csrf){const r=await fetch('/api/csrf');if(!r.ok)throw Error('تعذر الاتصال بالخادم.');csrf=(await r.json()).token;}
 const upload=options.body instanceof FormData;
 const r=await fetch('/api'+path,{...options,credentials:'same-origin',headers:{...(!upload&&options.body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{'X-CSRF-TOKEN':csrf}:{}),...options.headers},body:options.body&&!upload?JSON.stringify(options.body):options.body});
 const data=await r.json().catch(()=>null);
 if(!r.ok){if(r.status===401||r.status===400)csrf='';throw Error(data?.error||(r.status===429?'محاولات كثيرة، انتظر قليلًا وحاول مجددًا.':r.status===401?'يرجى تسجيل الدخول.':'تعذر تنفيذ العملية.'));}
 if(path.includes('/login')||path.includes('/logout')||path.includes('/verify'))csrf='';
 return data;
}
export const money=n=>new Intl.NumberFormat('ar-PS',{style:'currency',currency:'ILS',maximumFractionDigits:2}).format((n||0)/100);
