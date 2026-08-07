import type { RobotLocationItem } from '../../types/robotTracking';
import { getRobotMarkerColor } from '../../utils/robot';

type MapRobot = {
  id: string;
  robot_no: string;
  block: string;
  deveui: string;
  last_gateway: string;
  last_uplink: string;
  last_status: string;
  lora_state: number | null;
  color: string;
  lat: number;
  lng: number;
  map_url: string;
};

function toMapRobots(robots: RobotLocationItem[]): MapRobot[] {
  const out: MapRobot[] = [];
  for (const r of robots) {
    const lat = Number(r.location?.latitude);
    const lng = Number(r.location?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({
      id: r._id,
      robot_no: r.robot_no || 'Robot',
      block: r.block || '—',
      deveui: r.deveui || '—',
      last_gateway: r.last_gateway || '—',
      last_uplink: r.last_uplink || '—',
      last_status: r.last_status || '—',
      lora_state: r.lora_state ?? null,
      color: getRobotMarkerColor(r.lora_state ?? undefined, r.last_status),
      lat,
      lng,
      map_url: r.location?.map_url || '',
    });
  }
  return out;
}

/** Build once when robots load — selection/flyTo happens via injectJavaScript. */
export function buildRobotLocationsLeafletHtml(robots: RobotLocationItem[]) {
  const payload = JSON.stringify(toMapRobots(robots)).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin:0; height:100%; width:100%; background:#0b1220; }
    .popup { font-family: system-ui, sans-serif; font-size:12px; line-height:1.55; color:#e2e8f0; }
    .popup strong { color:#facc15; }
    .leaflet-popup-content-wrapper {
      background:#0f172a; border:1px solid rgba(250,204,21,.45); border-radius:8px;
    }
    .leaflet-popup-tip { background:#0f172a; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const robots = ${payload};
    const markers = Object.create(null);
    let map = null;
    let selectedId = null;

    function post(msg) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    }

    function statusLabel(r) {
      if ((r.last_status || '').toLowerCase() === 'cleaning in progress') {
        return 'In Progress';
      }
      return r.lora_state === 1 ? 'Online' : 'Offline';
    }

    function popupHtml(r) {
      const mapsUrl = r.map_url || ('https://www.google.com/maps?q=' + r.lat + ',' + r.lng);
      return '<div class="popup"><strong>' + r.robot_no + '</strong><br/>' +
        'Status: <span style="color:' + r.color + ';font-weight:700">' + statusLabel(r) + '</span><br/>' +
        'Last status: ' + r.last_status + '<br/>' +
        'Block: ' + r.block + '<br/>' +
        'DevEUI: ' + r.deveui + '<br/>' +
        'Last Gateway: ' + r.last_gateway + '<br/>' +
        'Last Uplink: ' + r.last_uplink + '<br/>' +
        'Lat/Lng: ' + r.lat.toFixed(6) + ', ' + r.lng.toFixed(6) + '<br/>' +
        '<a href="' + mapsUrl + '" target="_blank" rel="noreferrer">Open in Google Maps</a></div>';
    }

    function styleFor(r, selected) {
      return {
        radius: selected ? 10 : 8,
        color: '#ffffff',
        weight: selected ? 3 : 2,
        fillColor: r.color || '#facc15',
        fillOpacity: 1,
        opacity: 1
      };
    }

    function setSelected(id, fly) {
      if (selectedId && markers[selectedId]) {
        const prev = markers[selectedId];
        prev.setStyle(styleFor(prev.__robot, false));
      }
      selectedId = id || null;
      if (!selectedId || !markers[selectedId] || !map) return;
      const m = markers[selectedId];
      m.setStyle(styleFor(m.__robot, true));
      if (m.bringToFront) m.bringToFront();
      if (fly) {
        map.flyTo(m.getLatLng(), 19, { animate: true, duration: 0.9 });
        setTimeout(function() { try { m.openPopup(); } catch(e) {} }, 950);
      } else {
        try { m.openPopup(); } catch(e) {}
      }
    }

    window.__selectRobot = function(id) { setSelected(id, true); };
    window.__clearSelection = function() {
      if (selectedId && markers[selectedId]) {
        const m = markers[selectedId];
        m.setStyle(styleFor(m.__robot, false));
        m.closePopup();
      }
      selectedId = null;
      if (map && robots.length > 1) {
        const bounds = robots.map(function(r) { return [r.lat, r.lng]; });
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
      }
    };

    if (!robots.length) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8899bb;font-size:13px;padding:16px;text-align:center;">No robot locations found</div>';
      post({ type: 'ready' });
    } else {
      // SVG renderer: canvas + circleMarker clicks are unreliable in mobile WebViews
      map = L.map('map', {
        zoomControl: true,
        attributionControl: false,
        preferCanvas: false
      });

      L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 21,
        updateWhenIdle: true,
        keepBuffer: 2
      }).addTo(map);

      const bounds = [];

      for (var i = 0; i < robots.length; i++) {
        (function(r) {
          const ll = [r.lat, r.lng];
          bounds.push(ll);
          const marker = L.circleMarker(ll, styleFor(r, false));
          marker.__robot = r;
          marker.bindPopup(popupHtml(r), { autoPan: true, closeButton: true });
          marker.on('click', function(e) {
            if (e && e.originalEvent) {
              L.DomEvent.stopPropagation(e);
            }
            post({ type: 'select', id: r.id });
            setSelected(r.id, false);
          });
          marker.addTo(map);
          markers[r.id] = marker;
        })(robots[i]);
      }

      if (bounds.length === 1) map.setView(bounds[0], 17);
      else map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });

      setTimeout(function() {
        try { map.invalidateSize(false); } catch(e) {}
        post({ type: 'ready' });
      }, 200);
    }
  </script>
</body>
</html>`;
}

export function buildSelectRobotScript(id: string) {
  const safe = JSON.stringify(id);
  return `try{window.__selectRobot && window.__selectRobot(${safe});}catch(e){};true;`;
}

export function buildClearSelectionScript() {
  return `try{window.__clearSelection && window.__clearSelection();}catch(e){};true;`;
}
