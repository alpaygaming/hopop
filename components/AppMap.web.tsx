import React, { useEffect } from 'react';
import { View } from 'react-native';

export default function AppMap({ location, dynamicBarbers, setSelectedBarber, mapStyle }: any) {
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type === 'SELECT_BARBER') {
          const barber = dynamicBarbers.find((b: any) => b.id === data.id);
          if (barber) setSelectedBarber(barber);
        }
      } catch (e) {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [dynamicBarbers, setSelectedBarber]);

  if (!location) return null;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style> body { margin:0; padding:0; background: #eee; } #map { width: 100vw; height: 100vh; } </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([${location.coords.latitude}, ${location.coords.longitude}], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        L.circleMarker([${location.coords.latitude}, ${location.coords.longitude}], {
            color: '#3498db',
            fillColor: '#3498db',
            fillOpacity: 0.8,
            radius: 8
        }).addTo(map).bindPopup('Sizin Konumunuz');

        const markers = ${JSON.stringify(dynamicBarbers.map((b: any) => ({
          lat: b.latitude, lon: b.longitude, name: b.name, id: b.id, rating: b.rating || 5
        })))};

        markers.forEach(m => {
          const marker = L.marker([m.lat, m.lon]).addTo(map);
          marker.bindPopup("<div style='text-align:center; font-family: sans-serif;'><b style='font-size:16px;'>" + m.name + "</b><br/><span style='color:#f39c12;font-weight:bold;'>" + m.rating + " Yıldız</span> <br/><br/><button onclick='selectBarber(\\"" + m.id + "\\")' style='background:#000;color:#fff;padding:8px 15px;border-radius:8px;border:none;cursor:pointer;font-weight:bold;width:100%;margin-top:5px;'>Randevu Al</button></div>");
        });

        window.selectBarber = function(id) {
           window.parent.postMessage(JSON.stringify({ type: 'SELECT_BARBER', id: id }), '*');
        }
      </script>
    </body>
    </html>
  `;

  return (
    <View style={Object.assign({}, mapStyle, { overflow: 'hidden' })}>
      {/* @ts-ignore */}
      <iframe srcDoc={htmlContent} style={{width: '100%', height: '100%', border: 'none'}} />
    </View>
  );
}
