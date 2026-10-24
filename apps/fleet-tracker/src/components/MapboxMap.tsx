import React from 'react';
import { StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Vehicle } from '../types';

const MAPBOX_TOKEN =
  'pk.eyJ1IjoiZHJleG9ueXgiLCJhIjoiY212bHh4aWE1MDBlMjM1czlveWJkczRrMyJ9.MXOF41mKcWd3W5U3A5tn9Q';

interface VehiclePin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  speed: number;
  heading: number;
}

interface Props {
  vehicles: Vehicle[];
  selectedId?: string | null;
  onVehicleSelect?: (id: string | null) => void;
}

function buildHtml(vehicles: VehiclePin[]): string {
  const data = JSON.stringify(vehicles);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
<link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body,html,#map{height:100%;width:100%;overflow:hidden}
.vm{width:14px;height:14px;border-radius:50%;border:2.5px solid #fff;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.7);transition:transform .15s}
.vm.sel{width:22px;height:22px;border:3px solid #fff;box-shadow:0 0 0 5px rgba(200,152,10,.3),0 2px 8px rgba(0,0,0,.8)}
.mapboxgl-ctrl-bottom-left,.mapboxgl-ctrl-bottom-right{display:none}
.mapboxgl-popup-content{background:rgba(17,17,22,.97);color:#f0f0f4;border:1px solid rgba(200,152,10,.3);border-radius:10px;font-family:-apple-system,sans-serif;padding:9px 13px;min-width:100px;box-shadow:0 4px 16px rgba(0,0,0,.6)}
.pn{font-size:12px;font-weight:700}
.ps{font-size:11px;color:#C8980A;font-weight:600;margin-top:3px}
.mapboxgl-popup-tip,.mapboxgl-popup-close-button{display:none}
</style>
</head>
<body><div id="map"></div>
<script>
mapboxgl.accessToken='${MAPBOX_TOKEN}';
const vs=${data};
const clr={moving:'#10b981',parked:'#f59e0b',offline:'#6b7280'};
const map=new mapboxgl.Map({
  container:'map',
  style:'mapbox://styles/mapbox/dark-v11',
  center:[55.2708,25.2048],
  zoom:12,
  attributionControl:false
});
const mm={};let curPop=null,selId=null;
map.on('load',()=>{
  vs.forEach(v=>{
    const el=document.createElement('div');
    el.className='vm';
    el.style.backgroundColor=clr[v.status]||'#6b7280';
    const statusLabel=v.status==='moving'?v.speed+' km/h':v.status.charAt(0).toUpperCase()+v.status.slice(1);
    const pop=new mapboxgl.Popup({offset:14,closeButton:false,closeOnClick:false})
      .setHTML('<div class="pn">'+v.name+'</div><div class="ps">'+statusLabel+'</div>');
    new mapboxgl.Marker(el).setLngLat([v.lng,v.lat]).addTo(map);
    el.addEventListener('click',()=>{
      if(curPop){curPop.remove();curPop=null;}
      document.querySelectorAll('.vm').forEach(m=>m.classList.remove('sel'));
      if(selId===v.id){
        selId=null;
        try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'deselect'}))}catch(e){}
        return;
      }
      el.classList.add('sel');selId=v.id;
      pop.setLngLat([v.lng,v.lat]).addTo(map);curPop=pop;
      map.easeTo({center:[v.lng,v.lat],zoom:Math.max(map.getZoom(),13),duration:400});
      try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'select',id:v.id}))}catch(e){}
    });
    mm[v.id]={el,pop};
  });
});
function onMsg(e){
  try{
    const d=JSON.parse(e.data);
    if(d.type==='deselect'){
      if(curPop){curPop.remove();curPop=null;}
      document.querySelectorAll('.vm').forEach(m=>m.classList.remove('sel'));
      selId=null;
    }
  }catch(err){}
}
document.addEventListener('message',onMsg);
window.addEventListener('message',onMsg);
</script>
</body></html>`;
}

export default function MapboxMap({ vehicles, selectedId, onVehicleSelect }: Props) {
  const pins: VehiclePin[] = vehicles.map(v => ({
    id: v.id,
    name: v.name.replace(/ #\d+$/, ''),
    lat: v.lat,
    lng: v.lng,
    status: v.status,
    speed: v.speed,
    heading: v.heading,
  }));

  const handleMessage = (e: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === 'select') onVehicleSelect?.(data.id);
      else if (data.type === 'deselect') onVehicleSelect?.(null);
    } catch {}
  };

  return (
    <WebView
      source={{ html: buildHtml(pins) }}
      style={StyleSheet.absoluteFill}
      onMessage={handleMessage}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    />
  );
}
