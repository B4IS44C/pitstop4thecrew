import {amount,summarize} from './model.js';
const $=id=>document.getElementById(id);
export const money=(minor,currency='CRC')=>new Intl.NumberFormat('es-CR',{style:'currency',currency,maximumFractionDigits:2}).format(minor/100);
const short=(minor,currency)=>new Intl.NumberFormat('es-CR',{style:'currency',currency,notation:'compact',maximumFractionDigits:1}).format(minor/100);
const date=value=>new Intl.DateTimeFormat('es-CR',{timeZone:'America/Costa_Rica',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
function svgNode(tag,attrs={},text){const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;return node;}
function chart(target,labels,series,currency,title){
 const container=$(target);container.replaceChildren();const width=560,height=240,left=70,bottom=34,top=20,plotH=height-bottom-top,plotW=width-left-12;
 const max=Math.max(100,...series.flatMap(s=>s.values.filter(v=>v!==null)))*1.15;
 const svg=svgNode('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':title});svg.append(svgNode('title',{},title));
 for(let i=0;i<4;i++){const y=top+plotH*i/3,value=max*(1-i/3);svg.append(svgNode('line',{x1:left,y1:y,x2:width,y2:y,stroke:'#e9ecf1'}),svgNode('text',{x:left-8,y:y+4,'text-anchor':'end',fill:'#9196a0','font-size':10},short(value,currency)));}
 const slot=plotW/labels.length,bar=Math.min(24,slot*.72/series.length);
 labels.forEach((label,i)=>{
  if(labels.length<10||i%3===0||i===labels.length-1)svg.append(svgNode('text',{x:left+slot*(i+.5),y:height-10,'text-anchor':'middle',fill:'#8a8f99','font-size':10},label));
  series.forEach((s,j)=>{const value=s.values[i];if(value===null)return;const h=value/max*plotH,rect=svgNode('rect',{x:left+slot*(i+.5)+(j-series.length/2)*bar,y:top+plotH-h,width:Math.max(2,bar-3),height:Math.max(1,h),rx:2,fill:s.color});rect.append(svgNode('title',{},`${s.name} · ${label}: ${money(value,currency)}`));svg.append(rect);});
 });container.append(svg);
}
export function renderOverview(data,currency){
 const model=summarize(data,currency);
 $('today-total').textContent=money(amount(model.today,currency),currency);$('today-count').textContent=`${model.today.salesCount} ventas hoy`;
 $('week-total').textContent=money(model.weekTotal,currency);$('week-change').textContent=model.change===null?'Sin base de comparación anterior':`${model.change>=0?'+':''}${model.change.toFixed(1)}% frente a los mismos días de la semana anterior`;
 $('month-total').textContent=money(model.monthTotal,currency);$('month-count').textContent=`${model.monthCount} ventas registradas`;
 $('average').textContent=money(model.monthCount?Math.round(model.monthTotal/model.monthCount):0,currency);
 $('week-note').textContent=`Semana del ${data.monday} frente a la del ${data.previous}. La semana actual está en curso.`;
 chart('week-chart',['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],[{name:'Anterior',values:model.previous.map(r=>amount(r,currency)),color:'#c0c5ce'},{name:'Actual',values:model.current.map(r=>r.day>data.today?null:amount(r,currency)),color:'#dd1222'}],currency,'Ventas de esta semana y de la anterior, de lunes a domingo.');
 chart('month-chart',model.month.map(r=>r.day.slice(8)),[{name:'Ventas',values:model.month.map(r=>amount(r,currency)),color:'#dd1222'}],currency,'Ventas por día del mes seleccionado.');
 $('month-extremes').textContent=model.monthCount?`Mayor: ${model.highest.day} · ${money(amount(model.highest,currency),currency)}. Menor: ${model.lowest.day} · ${money(amount(model.lowest,currency),currency)}. Se incluyen días transcurridos sin ventas; en empates se muestra el primero.`:'No hay ventas registradas en este mes.';
 renderSellers(data,currency,$('seller-day').value||data.today);
}
function td(text){const cell=document.createElement('td');cell.textContent=text;return cell;}
function empty(body,cols,text){const row=document.createElement('tr'),cell=td(text);cell.colSpan=cols;cell.className='empty';row.append(cell);body.append(row);}
export function renderSellers(data,currency,day){const body=$('seller-rows');body.replaceChildren();const row=data.days.find(d=>d.day===day);const sellers=Object.values(row?.sellers??{}).sort((a,b)=>amount(b,currency)-amount(a,currency));if(!sellers.length){empty(body,3,'No hay ventas registradas en este día.');return;}for(const seller of sellers){const tr=document.createElement('tr');tr.append(td(seller.name),td(seller.salesCount),td(money(amount(seller,currency),currency)));body.append(tr);}}
export function renderHistory(rows,currency){const body=$('history-rows');body.replaceChildren();if(!rows.length){empty(body,6,'No hay registros para estas fechas.');return;}for(const item of rows){const tr=document.createElement('tr'),product=td(item.product);if(item.isTest||item.delivery==='test_only'){const badge=document.createElement('span');badge.className='test-tag';badge.textContent='Prueba técnica';product.append(badge);}if(item.kind==='sales'){const status=document.createElement('span');status.className='sale-status '+(item.status||'registered');status.textContent=({registered:'Registrada',cancelled:'Cancelada',deleted:'Eliminada'})[item.status]||'Registrada';product.append(document.createElement('br'),status);}const detail=td(''),button=document.createElement('button');button.textContent='Ver detalle';button.addEventListener('click',()=>showDetail(item));detail.append(button);tr.append(td(date(item.createdAt)),td(item.seller||'Sin vendedor'),product,td(item.shippingOrigin||'USA'),td(money(amount(item,currency),currency)),detail);body.append(tr);}}
function showDetail(item){const fields=$('detail-fields');fields.replaceChildren();const customer=item.customer;const data=[['Estado',item.kind==='sales'?({registered:'Registrada',cancelled:'Cancelada',deleted:'Eliminada'})[item.status]||'Registrada':'Cálculo'],['Fecha',date(item.createdAt)],['Vendedor',item.seller||'Sin vendedor'],['Producto',item.product],['Origen',item.shippingOrigin||'USA'],['Peso',`${item.weightGrams/1000} kg`],['Costo',money(item.costCents,'USD')],['Envío',money(item.shippingCents,'USD')],['Subtotal',money(item.subtotalCents,'USD')],['Porcentaje',`${item.markupBps/100}%`],['Ganancia',money(item.profitCents,'USD')],['Total USD',money(item.totalCents,'USD')],['Total CRC',item.totalCrcMinor==null?'Sin conversión':money(item.totalCrcMinor)],['Tipo de cambio',item.exchangeRateCents?`${money(item.exchangeRateCents)} por USD`:'Sin tasa'],['Referencia',item.id],['Venta asociada',item.saleId||item.calculationId||'Sin venta']];if(customer)data.push(['Cliente',customer.name||'Sin nombre'],['Teléfono',customer.phone],['Dirección',customer.address]);for(const [label,value]of data){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;row.append(dt,dd);fields.append(row);}if(customer?.link){try{const url=new URL(customer.link);if(['http:','https:'].includes(url.protocol)){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd'),a=document.createElement('a');dt.textContent='Ubicación';a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Abrir enlace de entrega';dd.append(a);row.append(dt,dd);fields.append(row);}}catch{}}const actions=$('detail-actions');actions.replaceChildren();
 if(item.kind==='sales'){
  const add=(label,event,action)=>{const button=document.createElement('button');button.textContent=label;if(action==='delete'||action==='cancel')button.className='danger';button.addEventListener('click',()=>document.dispatchEvent(new CustomEvent(event,{detail:{item,action}})));actions.append(button);};
  if(item.receipt)add('Ver comprobante','owner:receipt');
  if(item.status!=='deleted')add('Editar venta','owner:edit');
  if(item.status==='registered')add('Marcar cancelada','owner:action','cancel');
  if(item.status!=='deleted')add('Eliminar venta','owner:action','delete');
  if(['cancelled','deleted'].includes(item.status))add(item.status==='deleted'?'Restaurar venta':'Reactivar venta','owner:action','restore');
 }
 $('detail-dialog').showModal();}
$('close-detail').addEventListener('click',()=>{$('detail-dialog').close();});
