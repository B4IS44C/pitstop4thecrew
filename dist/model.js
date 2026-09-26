export const shift=(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
export const amount=(row,currency)=>Number(row?.[currency==='USD'?'totalCents':'totalCrcMinor']||0);
export function summarize(data,currency){
 const byDay=new Map(data.days.map(row=>[row.day,row]));
 const row=day=>byDay.get(day)??{day,salesCount:0};
 const month=data.monthDays.map(row),current=Array.from({length:7},(_,i)=>row(shift(data.monday,i))),previous=Array.from({length:7},(_,i)=>row(shift(data.previous,i)));
 const elapsed=(Date.parse(data.today)-Date.parse(data.monday))/86400000+1;
 const sum=rows=>rows.reduce((n,r)=>n+amount(r,currency),0),count=rows=>rows.reduce((n,r)=>n+(r.salesCount||0),0);
 const comparable=sum(previous.slice(0,elapsed)),weekTotal=sum(current);
 const highest=month.reduce((a,b)=>amount(b,currency)>amount(a,currency)?b:a,month[0]);
 const lowest=month.reduce((a,b)=>amount(b,currency)<amount(a,currency)?b:a,month[0]);
 return {today:row(data.today),month,current,previous,weekTotal,monthTotal:sum(month),monthCount:count(month),comparable,change:comparable?(weekTotal-comparable)/comparable*100:null,highest,lowest};
}
