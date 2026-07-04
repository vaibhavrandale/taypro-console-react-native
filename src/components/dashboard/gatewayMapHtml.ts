import { GatewayMapPoint } from "../../utils/gateway";

const RADIUS_METERS = 1000;

export function buildGatewayLeafletHtml(
  gateways: GatewayMapPoint[],
  _isDark: boolean,
  userLocation: { latitude: number; longitude: number } | null = null,
  focusUser = false,
) {
  const payload = JSON.stringify(gateways).replace(/</g, "\\u003c");
  const userPayload = userLocation
    ? JSON.stringify(userLocation).replace(/</g, "\\u003c")
    : "null";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; height: 100%; width: 100%; background: #1a1a1a; }
    .leaflet-control-attribution { font-size: 9px; }
    .leaflet-control-layers { font-size: 11px; }
    .gateway-popup { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; line-height: 1.45; }
    .gateway-popup strong { display: block; margin-bottom: 4px; font-size: 13px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const gateways = ${payload};
    const user = ${userPayload};
    const focusUser = ${focusUser ? "true" : "false"};
    const radiusMeters = ${RADIUS_METERS};

    if (!gateways.length && (!user || user.latitude == null || user.longitude == null)) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8B9DC3;font-family:sans-serif;font-size:13px;padding:16px;text-align:center;">No gateway coordinates available</div>';
    } else {
      const map = L.map('map', { zoomControl: true, attributionControl: true });

      const satellite = L.tileLayer(
        'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        { maxZoom: 21 }
      );

      const street = L.tileLayer(
        'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        { maxZoom: 21 }
      );

      satellite.addTo(map);

      L.control.layers(
        {
          'Satellite': satellite,
          'Street': street,
        },
        null,
        { collapsed: true }
      ).addTo(map);

      const bounds = [];
      gateways.forEach((gateway) => {
        const latLng = [gateway.latitude, gateway.longitude];
        bounds.push(latLng);

        const status = String(gateway.status ?? '').toLowerCase();
        const online = gateway.status === true || status.includes('online') || status === 'active';
        const color = online ? '#00C9A7' : '#94A3B8';

        L.circle(latLng, {
          radius: radiusMeters,
          color,
          weight: 2,
          opacity: 0.9,
          fillColor: color,
          fillOpacity: 0.16,
        }).addTo(map);

        const marker = L.circleMarker(latLng, {
          radius: 8,
          color: '#101936',
          weight: 2,
          fillColor: color,
          fillOpacity: 1,
        }).addTo(map);

        marker.bindPopup(
          '<div class="gateway-popup"><strong>' + gateway.name + '</strong>' +
          'Lat: ' + gateway.latitude.toFixed(5) + '<br/>' +
          'Lng: ' + gateway.longitude.toFixed(5) + '<br/>' +
          'Robots: ' + gateway.robotCount + '<br/>' +
          '1 km coverage radius' +
          '</div>'
        );
      });

      if (user && user.latitude != null && user.longitude != null) {
        const userLatLng = [user.latitude, user.longitude];
        bounds.push(userLatLng);
        L.circleMarker(userLatLng, {
          radius: 9,
          color: '#ffffff',
          weight: 3,
          fillColor: '#4F7CFF',
          fillOpacity: 1,
        })
          .addTo(map)
          .bindPopup('<strong>Your location</strong>');
      }

      if (focusUser && user && user.latitude != null && user.longitude != null) {
        map.setView([user.latitude, user.longitude], 16);
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 14);
      } else if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
      }
    }
  </script>
</body>
</html>`;
}
