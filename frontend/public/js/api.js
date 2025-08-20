async function api(path, opts = {}){
  const res = await fetch(path, Object.assign({ credentials: 'include', headers: { 'Content-Type': 'application/json' }}, opts));
  if(!res.ok){
    let msg = res.statusText;
    try{ const j = await res.json(); if(j && j.error) msg = j.error; }catch{}
    throw new Error(msg);
  }
  return res.json();
}
window.api = api;
