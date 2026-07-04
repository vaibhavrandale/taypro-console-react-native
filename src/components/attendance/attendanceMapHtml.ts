type MapPoint = {
  latitude: number;
  longitude: number;
};

type AttendanceMapMarkers = {
  user?: MapPoint | null;
  punchIn?: MapPoint | null;
  punchOut?: MapPoint | null;
};

export function buildAttendanceMapHtml(
  site: MapPoint,
  radiusMeters: number,
  markers: AttendanceMapMarkers = {},
  focusUser = false,
) {
  const sitePayload = JSON.stringify(site).replace(/</g, "\\u003c");
  const userPayload = markers.user
    ? JSON.stringify(markers.user).replace(/</g, "\\u003c")
    : "null";
  const punchInPayload = markers.punchIn
    ? JSON.stringify(markers.punchIn).replace(/</g, "\\u003c")
    : "null";
  const punchOutPayload = markers.punchOut
    ? JSON.stringify(markers.punchOut).replace(/</g, "\\u003c")
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
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const site = ${sitePayload};
    const user = ${userPayload};
    const punchIn = ${punchInPayload};
    const punchOut = ${punchOutPayload};
    const radiusMeters = ${radiusMeters};
    const focusUser = ${focusUser ? "true" : "false"};

    const map = L.map('map', { zoomControl: true, attributionControl: true });

    L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      maxZoom: 21,
    }).addTo(map);

    const siteLatLng = [site.latitude, site.longitude];
    const bounds = [siteLatLng];

    L.circle(siteLatLng, {
      radius: radiusMeters,
      color: '#00C9A7',
      weight: 2,
      opacity: 0.95,
      fillColor: '#00C9A7',
      fillOpacity: 0.18,
    }).addTo(map);

    L.circleMarker(siteLatLng, {
      radius: 7,
      color: '#101936',
      weight: 2,
      fillColor: '#00C9A7',
      fillOpacity: 1,
    }).addTo(map);

    function addMarker(point, color, label) {
      const latLng = [point.latitude, point.longitude];
      bounds.push(latLng);
      L.circleMarker(latLng, {
        radius: 9,
        color: '#ffffff',
        weight: 3,
        fillColor: color,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup('<strong>' + label + '</strong>');
    }

    if (user && user.latitude != null && user.longitude != null) {
      addMarker(user, '#4F7CFF', 'Your location');
    }

    if (punchIn && punchIn.latitude != null && punchIn.longitude != null) {
      addMarker(punchIn, '#F5A623', 'Punch in');
    }

    if (punchOut && punchOut.latitude != null && punchOut.longitude != null) {
      addMarker(punchOut, '#EF4444', 'Punch out');
    }

    if (focusUser && user && user.latitude != null && user.longitude != null) {
      map.setView([user.latitude, user.longitude], 16);
    } else if (bounds.length === 1) {
      map.setView(siteLatLng, 14);
    } else {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
    }
  </script>
</body>
</html>`;
}

export function buildPunchRecordMapHtml(markers: AttendanceMapMarkers) {
  const punchInPayload = markers.punchIn
    ? JSON.stringify(markers.punchIn).replace(/</g, "\\u003c")
    : "null";
  const punchOutPayload = markers.punchOut
    ? JSON.stringify(markers.punchOut).replace(/</g, "\\u003c")
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
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const punchIn = ${punchInPayload};
    const punchOut = ${punchOutPayload};

    const map = L.map('map', { zoomControl: true, attributionControl: true });

    L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      maxZoom: 21,
    }).addTo(map);

    const bounds = [];

    function addMarker(point, color, label) {
      const latLng = [point.latitude, point.longitude];
      bounds.push(latLng);
      L.circleMarker(latLng, {
        radius: 9,
        color: '#ffffff',
        weight: 3,
        fillColor: color,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup('<strong>' + label + '</strong>');
    }

    if (punchIn && punchIn.latitude != null && punchIn.longitude != null) {
      addMarker(punchIn, '#F5A623', 'Punch in');
    }

    if (punchOut && punchOut.latitude != null && punchOut.longitude != null) {
      addMarker(punchOut, '#EF4444', 'Punch out');
    }

    if (bounds.length === 0) {
      map.setView([20, 78], 4);
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 16);
    } else {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
    }
  </script>
</body>
</html>`;
}
