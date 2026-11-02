// No password is saved: every mutation prompts again and is verified on the server.
export function requestChangeKey(){
 return new Promise((resolve,reject)=>{
  const dialog=document.createElement('dialog');dialog.className='change-key-dialog';
  dialog.innerHTML='<form><h2>Autorizar cambio</h2><p>Introduce la clave del administrador para realizar esta acción.</p><label>Clave del administrador<input type="password" required maxlength="128" autocomplete="off" autofocus></label><div class="management-actions"><button type="button">Cancelar</button><button type="submit" class="primary">Confirmar cambio</button></div></form>';
  const finish=value=>{dialog.querySelector('input').value='';dialog.close();dialog.remove();value?resolve(value):reject(new Error('Cambio cancelado.'));};
  dialog.querySelector('form').onsubmit=e=>{e.preventDefault();finish(dialog.querySelector('input').value);};dialog.querySelector('button[type=button]').onclick=()=>finish(null);dialog.addEventListener('cancel',e=>{e.preventDefault();finish(null);});document.body.append(dialog);dialog.showModal();
 });
}
