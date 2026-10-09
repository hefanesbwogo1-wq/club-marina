'use client';
import { useEffect } from 'react';
export default function PWAInstall(){
  useEffect(()=>{
    // Unregister all old service workers
    if('serviceWorker' in navigator){
      navigator.serviceWorker.getRegistrations().then(regs=>{
        regs.forEach(r=>r.unregister());
      });
    }
    // Clear old cache
    if('caches' in window){
      caches.keys().then(keys=>keys.forEach(k=>caches.delete(k)));
    }
  },[]);
  return null;
}