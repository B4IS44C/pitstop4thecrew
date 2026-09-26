export async function receiptFile(file){
 if(!file)return null;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>4*1024*1024||file.size===0)throw new Error('Selecciona una imagen JPG, PNG o WEBP de hasta 4 MB.');
 const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('No se pudo leer la imagen.'));reader.readAsDataURL(file);});
 return {contentType:file.type,base64:data.slice(data.indexOf(',')+1)};
}
