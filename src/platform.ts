import {Capacitor} from '@capacitor/core';
import {AppLauncher} from '@capacitor/app-launcher';
import {Browser} from '@capacitor/browser';
import {Directory,Filesystem} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
export const nativePlatform=Capacitor.isNativePlatform();
export async function sendProfileToVivic(profile:unknown){
 const popup=nativePlatform?null:window.open('about:blank','quant-throne-vivic');
 try{const response=await fetch('https://edsionc.top/quant-throne/api/transfer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile}),signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok||!data.ok||typeof data.token!=='string')throw Error('transfer-unavailable');
  const url='https://vivic.edsionc.top/?quant-throne=1#quant-transfer='+encodeURIComponent(data.token);
  if(nativePlatform)await openNative(url);else if(popup)popup.location.href=url;else location.href=url;
 }catch(error){popup?.close();throw error;}
}
// APK: ACTION_VIEW so an installed Vivic app (App Links on vivic.edsionc.top) imports directly; otherwise the system browser opens it.
async function openNative(url:string){try{const {completed}=await AppLauncher.openUrl({url});if(completed)return;}catch{}await Browser.open({url});}
export async function saveFile(data:BlobPart,name:string,type:string){
 const blob=new Blob([data],{type});
 if(Capacitor.isNativePlatform()){
  const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
  const result=await Filesystem.writeFile({path:name,data:base64,directory:Directory.Cache});
  await Share.share({title:'量权 · 保存或分享文件',url:result.uri,dialogTitle:'保存量权文件'});
 }else{
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
 }
}
export function installNativeLinks(){if(!Capacitor.isNativePlatform())return;document.addEventListener('click',e=>{const link=(e.target as HTMLElement).closest('a[href]')as HTMLAnchorElement|null;if(link&&/^https:\/\//.test(link.href)){e.preventDefault();void Browser.open({url:link.href});}});}
