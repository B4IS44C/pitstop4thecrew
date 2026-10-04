import {initTestimonials} from './testimonials.js?v=20261004';
import {receiptFile} from './receipt-file.js';
import {firebaseConfig,region,appCheckSiteKey} from './config.js';
import {renderOverview,renderHistory,renderSellers} from './render.js?v=8';
const $=id=>document.getElementById(id);
let auth,authApi,api,overview,rows=[],cursor=null,kind='pending',generation=0,historyGeneration=0;
function notice(text,error=false){$('notice').textContent=text;$('notice').classList.toggle('error',error);}
function errorMessage(error){return error.code==='functions/permission-denied'?'Clave incorrecta o acceso caducado. Introduce la clave del dueño.':error.code==='functions/resource-exhausted'?'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.':'No se pudo completar la consulta. Revisa la conexión e intenta de nuevo.';}
function clearPrivate(){clearTestimonials();sellerSalesGeneration++;sellerSalesRows=[];sellerSalesCursor=null;sellerSelection=null;$('seller-sales-dialog').close();$('seller-sales-rows').replaceChildren();$('seller-sales-title').textContent='Ventas del vendedor';$('seller-sales-subtitle').textContent='';$('seller-sales-state').textContent='';generation++;historyGeneration++;overview=undefined;rows=[];cursor=null;$('dashboard').hidden=true;$('logout').hidden=true;$('account').textContent='';for(const id of ['today-total','today-count','week-total','week-change','month-total','month-count','average','week-note','month-extremes'])$(id).textContent='';$('week-chart').replaceChildren();$('month-chart').replaceChildren();$('history-rows').replaceChildren();$('seller-rows').replaceChildren();$('detail-dialog').close();$('detail-fields').replaceChildren();$('detail-actions').replaceChildren();$('receipt-dialog').close();$('receipt-image').removeAttribute('src');$('edit-sale-dialog').close();$('sale-action-dialog').close();}
async function loadOverview(){const stamp=++generation;try{const {data}=await api('ownerOverview')({month:$('month').value||undefined});if(stamp!==generation||!auth.currentUser)return;overview=data;$('month').value=data.month;$('month').max=data.today.slice(0,7);if(!$('seller-day').value||!data.days.some(r=>r.day===$('seller-day').value))$('seller-day').value=data.month===data.today.slice(0,7)?data.today:data.monthDays[0];$('seller-day').max=data.today;renderOverview(data,$('currency').value);$('dashboard').hidden=false;$('logout').hidden=false;$('account').textContent='Panel desbloqueado';$('login-panel').hidden=true;notice('Actualizado. Las cotizaciones y las ventas se muestran por separado.');}catch(error){if(stamp!==generation)return;if(error.code==='functions/permission-denied'){clearPrivate();$('login-panel').hidden=false;}notice(errorMessage(error),true);}}
async function loadHistory(reset=true){const stamp=++historyGeneration,from=$('from').value,to=$('to').value;if(from&&to&&from>to){$('history-state').textContent='La fecha inicial debe ser anterior a la final.';return;}$('more').disabled=true;$('history-state').textContent='Cargando registros…';try{const {data}=await api('ownerHistory')({kind,from,to,cursor:reset?null:cursor});if(stamp!==historyGeneration||!auth.currentUser)return;rows=reset?data.rows:[...rows,...data.rows];cursor=data.next;renderHistory(rows,$('currency').value);$('more').hidden=!cursor;$('history-state').textContent=`${rows.length} registros cargados${cursor?' · Hay más registros':''}.`;}catch(error){if(stamp===historyGeneration){$('history-state').textContent=errorMessage(error);if(error.code==='functions/permission-denied'){clearPrivate();$('login-panel').hidden=false;notice(errorMessage(error),true);}}}finally{if(stamp===historyGeneration)$('more').disabled=false;}}
$('access-form').addEventListener('submit',async e=>{e.preventDefault();$('login').disabled=true;try{await api('ownerUnlock')({key:$('access-key').value});$('access-key').value='';await loadOverview();if(overview)await loadHistory();}catch(error){notice(errorMessage(error),true);}finally{$('login').disabled=false;}});
$('logout').addEventListener('click',async()=>{
 clearPrivate();$('login-panel').hidden=false;notice('Bloqueando panel…');
 try{await api('ownerLock')({});await authApi.signOut(auth);await authApi.signInAnonymously(auth);notice('Panel bloqueado. Introduce la clave para volver a entrar.');}
 catch{await authApi.signOut(auth);notice('Acceso cerrado en este navegador. Recarga la página para entrar.');}
});
$('refresh').addEventListener('click',async()=>{await loadOverview();if(overview)await loadHistory();});
$('month').addEventListener('change',()=>loadOverview());
$('currency').addEventListener('change',()=>{if(overview)renderOverview(overview,$('currency').value);renderHistory(rows,$('currency').value);renderHistory(sellerSalesRows,$('currency').value,'seller-sales-rows');});
$('seller-day').addEventListener('change',async()=>{const day=$('seller-day').value;if(!day||!overview)return;if(!overview.days.some(r=>r.day===day)){$('month').value=day.slice(0,7);await loadOverview();}else renderSellers(overview,$('currency').value,day);});
for(const [id,value]of [['pending-tab','pending'],['sales-tab','sales'],['calculations-tab','calculations']])$(id).addEventListener('click',()=>{kind=value;rows=[];cursor=null;renderHistory(rows,$('currency').value);for(const button of ['pending-tab','sales-tab','calculations-tab']){$(button).classList.toggle('selected',button===id);$(button).setAttribute('aria-pressed',String(button===id));}loadHistory();});
$('history-filters').addEventListener('submit',e=>{e.preventDefault();loadHistory();});$('clear-filters').addEventListener('click',()=>{$('from').value='';$('to').value='';loadHistory();});$('more').addEventListener('click',()=>loadHistory(false));
async function start(){try{const base='https://www.gstatic.com/firebasejs/12.19.0/';const [app,authentication,functions,check]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-functions.js'),import(base+'firebase-app-check.js')]);const firebase=app.initializeApp(firebaseConfig);check.initializeAppCheck(firebase,{provider:new check.ReCaptchaEnterpriseProvider(appCheckSiteKey),isTokenAutoRefreshEnabled:true});authApi=authentication;auth=authentication.getAuth(firebase);await authentication.setPersistence(auth,authentication.browserSessionPersistence);api=name=>functions.httpsCallable(functions.getFunctions(firebase,region),name);await authentication.signInAnonymously(auth);$('login').disabled=false;notice('Introduce la clave de acceso.');await loadOverview();if(overview)await loadHistory();else notice('Introduce la clave de acceso.');}catch(error){notice(errorMessage(error),true);}}
start();

let editing,actionPending,editRequest,editPayload,managementBusy=false,receiptGeneration=0;
function managementError(error){return error.code==='functions/aborted'?'El registro fue modificado. Cierra y actualiza el historial para cargar su versión actual.':error.code==='functions/invalid-argument'?'Revisa vendedor, datos del cliente, importes y comprobante.':error.message&&!error.code?error.message:errorMessage(error);}
async function reloadAfterChange(){ rows=[];cursor=null;renderHistory(rows,$('currency').value);$('history-state').textContent='Actualizando…';$('detail-dialog').close();await loadOverview();if(overview){await loadHistory();if($('seller-sales-dialog').open)await loadSellerSales(true);} }
document.addEventListener('owner:receipt',async e=>{
 const stamp=++receiptGeneration;$('receipt-image').hidden=true;$('receipt-image').removeAttribute('src');$('receipt-state').textContent='Cargando comprobante…';$('receipt-dialog').showModal();
 try{const {data}=await api('ownerReceipt')({saleId:e.detail.item.id});if(stamp!==receiptGeneration||!$('receipt-dialog').open)return;if(!['image/jpeg','image/png','image/webp'].includes(data.contentType))throw new Error('Imagen no disponible.');$('receipt-image').src=`data:${data.contentType};base64,${data.base64}`;$('receipt-image').hidden=false;$('receipt-state').textContent='';}catch(error){if(stamp===receiptGeneration)$('receipt-state').textContent=managementError(error);}
});
$('close-receipt').addEventListener('click',()=>{receiptGeneration++;$('receipt-dialog').close();$('receipt-image').removeAttribute('src');});
document.addEventListener('owner:edit',e=>{
 editing=e.detail.item;editRequest=undefined;editPayload=undefined;$('edit-sale-form').reset();$('edit-error').textContent='';
 const fields={discount:String(editing.discountPercent??0),url:editing.productUrl||'',seller:editing.seller||'',product:editing.product,cost:(editing.costCents/100).toFixed(2),weight:String(editing.weightGrams/1000),rate:(editing.exchangeRateCents/100).toFixed(2),origin:editing.shippingOrigin||'USA',phone:editing.customer?.phone||'',name:editing.customer?.name||'',address:editing.customer?.address||''};
 for(const [key,value] of Object.entries(fields))$('edit-'+key).value=value;
 $('edit-sale-dialog').showModal();
});
$('close-edit').addEventListener('click',()=>{if(!managementBusy)$('edit-sale-dialog').close();});
$('edit-sale-dialog').addEventListener('cancel',e=>{if(managementBusy)e.preventDefault();});
$('edit-sale-form').addEventListener('submit',async e=>{
 e.preventDefault();if(managementBusy)return;managementBusy=true;$('edit-fields').disabled=true;$('close-edit').disabled=true;$('edit-error').textContent='Guardando…';
 try{const clean=id=>$('edit-'+id).value.trim().replace(',','.');const values={discountPercent:Number($('edit-discount').value),productUrl:$('edit-url').value.trim(),seller:$('edit-seller').value.trim(),product:$('edit-product').value.trim(),cost:clean('cost'),weight:clean('weight'),exchangeRate:clean('rate'),shippingOrigin:$('edit-origin').value,customer:{phone:$('edit-phone').value.trim(),name:$('edit-name').value.trim(),address:$('edit-address').value.trim()}};
 const receipt=await receiptFile($('edit-receipt').files[0]);const payload=JSON.stringify({saleId:editing.id,action:'edit',version:editing.version??0,values,receipt});if(payload!==editPayload){editPayload=payload;editRequest=crypto.randomUUID();}
 await api('ownerChangeSale')({...JSON.parse(payload),actionId:editRequest});$('edit-sale-dialog').close();await reloadAfterChange();notice('Venta actualizada.');
 }catch(error){$('edit-error').textContent=managementError(error);}finally{managementBusy=false;$('edit-fields').disabled=false;$('close-edit').disabled=false;}
});
document.addEventListener('owner:action',e=>{
 const {item,action}=e.detail;actionPending={saleId:item.id,action,version:item.version??0,actionId:crypto.randomUUID()};
 $('action-title').textContent=({approve:'Aprobar venta',cancel:'Cancelar venta',delete:'Eliminar venta',restore:'Restaurar venta'})[action];
 $('action-message').textContent=`${item.product}. `+({approve:'Pasará al historial como aprobada y sumará en los totales de su fecha de venta.',cancel:'Se marcará como cancelada y dejará de sumar en los totales. Podrás reactivarla.',delete:'Se marcará como eliminada y dejará de sumar en los totales. Se conservará para poder restaurarla.',restore:item.status==='deleted'&&item.statusBeforeDeletion==='cancelled'?'Volverá al estado cancelada.':'Recuperará su estado anterior. Si estaba por aprobar, seguirá pendiente de aprobación.'})[action];
 $('action-error').textContent='';$('sale-action-dialog').showModal();
});
$('action-back').addEventListener('click',()=>{if(!managementBusy)$('sale-action-dialog').close();});
$('sale-action-dialog').addEventListener('cancel',e=>{if(managementBusy)e.preventDefault();});
$('action-confirm').addEventListener('click',async()=>{
 if(managementBusy)return;managementBusy=true;$('action-confirm').disabled=true;$('action-back').disabled=true;
 try{const calculation=actionPending.calculationId;await api(calculation?'ownerDeleteCalculation':'ownerChangeSale')(actionPending);$('sale-action-dialog').close();await reloadAfterChange();notice(calculation?'Cálculo eliminado.':'Estado de venta actualizado.');}catch(error){$('action-error').textContent=managementError(error);}finally{managementBusy=false;$('action-confirm').disabled=false;$('action-back').disabled=false;}
});

let sellerSelection=null,sellerSalesRows=[],sellerSalesCursor=null,sellerSalesGeneration=0,sellerSalesBusy=false;
const sellerIdentity=name=>String(name||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('es');
document.addEventListener('owner:seller-sales',e=>{
 sellerSelection={...e.detail};$('seller-sales-title').textContent=`Ventas de ${sellerSelection.seller}`;$('seller-sales-subtitle').textContent=`${sellerSelection.day} · Ventas aprobadas · Hora de Costa Rica`;
 $('seller-sales-dialog').showModal();loadSellerSales(true);
});
function closeSellerSales(){sellerSalesGeneration++;sellerSalesBusy=false;$('seller-sales-dialog').close();}
$('close-seller-sales').addEventListener('click',closeSellerSales);
$('seller-sales-dialog').addEventListener('cancel',()=>{sellerSalesGeneration++;sellerSalesBusy=false;});
$('seller-sales-more').addEventListener('click',()=>{if(!sellerSalesBusy)loadSellerSales(false);});
async function loadSellerSales(reset=true){
 if(!sellerSelection||!$('seller-sales-dialog').open)return;
 const stamp=++sellerSalesGeneration,selection={...sellerSelection};sellerSalesBusy=true;
 if(reset){sellerSalesRows=[];sellerSalesCursor=null;renderHistory([], $('currency').value,'seller-sales-rows');}
 $('seller-sales-more').hidden=true;$('seller-sales-state').textContent='Cargando ventas…';
 try{
  let next=sellerSalesCursor,found=[];
  do{
   const {data}=await api('ownerHistory')({kind:'sales',from:selection.day,to:selection.day,cursor:next});
   if(stamp!==sellerSalesGeneration||!$('seller-sales-dialog').open)return;
   found.push(...data.rows.filter(item=>!item.isTest&&item.delivery!=='test_only'&&['registered','approved'].includes(item.status)&&sellerIdentity(item.seller)===sellerIdentity(selection.seller)));
   next=data.next;
  }while(next&&found.length<50);
  sellerSalesRows=reset?found:[...sellerSalesRows,...found];sellerSalesCursor=next;
  renderHistory(sellerSalesRows,$('currency').value,'seller-sales-rows');
  $('seller-sales-state').textContent=sellerSalesRows.length?`${sellerSalesRows.length} ventas cargadas${next?' · Hay más ventas':''}.`:'No hay ventas aprobadas de este vendedor en el día seleccionado.';
  $('seller-sales-more').hidden=!next;
 }catch(error){if(stamp===sellerSalesGeneration){$('seller-sales-state').textContent=errorMessage(error);if(error.code==='functions/permission-denied'){clearPrivate();$('login-panel').hidden=false;}else{$('seller-sales-more').hidden=false;$('seller-sales-more').textContent='Reintentar';}}}
 finally{if(stamp===sellerSalesGeneration)sellerSalesBusy=false;}
}

document.addEventListener('owner:delete-calculation',e=>{
 if(managementBusy)return;
 const item=e.detail.item;actionPending={calculationId:item.id,quoteVersion:item.quoteVersion??0};
 $('action-title').textContent='Eliminar cálculo';
 $('action-message').textContent=`${item.product}. Se quitará del historial y de la búsqueda de cotizaciones. Si tiene una venta asociada, esa venta y sus importes se conservarán.`;
 $('action-error').textContent='';$('sale-action-dialog').showModal();
});

const clearTestimonials=initTestimonials({call:(name,payload)=>api(name)(payload)});
