import React, { useEffect, useMemo, useRef, useState } from 'react';
import DashboardSidebar from './components/DashboardSidebar';
import MapCanvas from './components/MapCanvas';
import { loadScript, loadStylesheet } from './lib/loadExternalAssets';
import { cityDashboards, getCityById } from './config/cities';

const externalStylesheets = [
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/css/bootstrap.min.css',
  'https://netdna.bootstrapcdn.com/bootstrap/3.0.0/css/bootstrap-glyphicons.css',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.2.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Leaflet.awesome-markers/2.0.2/leaflet.awesome-markers.css',
  'https://cdn.jsdelivr.net/gh/python-visualization/folium/folium/templates/leaflet.awesome.rotate.min.css',
];

const externalScripts = [
  'https://code.jquery.com/jquery-3.7.1.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Leaflet.awesome-markers/2.0.2/leaflet.awesome-markers.js',
  'https://cdn.jsdelivr.net/npm/@turf/turf@7.2.0/turf.min.js',
  'https://cdn.jsdelivr.net/npm/shpjs@6.2.0/dist/shp.min.js',
];

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
let googleMapsLoaderPromise = null;

const animatedObservationOverlays = {
  'Observations | Severe Waterlogging Hotspots': {
    className: 'map-overlay-hotspot',
    strokeColor: '#49879A',
    fillColor: '#6BC3D2',
    radius: 8,
    weight: 2,
    fillOpacity: 0.9,
  },
  'Observations | Waterlogging Locations (129)': {
    className: 'map-overlay-waterlogging',
    strokeColor: '#5298A9',
    fillColor: '#63B5BA',
    radius: 6,
    weight: 2,
    fillOpacity: 0.85,
  },
  'Observations | Garbage Vulnerable Points': {
    className: 'map-overlay-garbage',
    strokeColor: '#49879A',
    fillColor: '#64B8C1',
    radius: 7,
    weight: 2,
    fillOpacity: 0.88,
  },
  'Observations | Secondary Garbage Collection': {
    className: 'map-overlay-secondary',
    strokeColor: '#5298A9',
    fillColor: '#5CADBA',
    radius: 7,
    weight: 2,
    fillOpacity: 0.88,
  },
  'Sensor | Top 20 Modeled Hotspots': {
    className: 'map-overlay-sensor',
    strokeColor: '#8F2D18',
    fillColor: '#FF8A5B',
    radius: 9,
    weight: 2.4,
    fillOpacity: 0.95,
  },
};

const sensorOverlayConfigs = [
  {
    cityId: 'gmc',
    label: 'Sensor | Top 20 Modeled Hotspots',
    url: '/sensors/top20_modeled_hotspots_latlon.csv',
  },
];

const administrativeBoundaryOverrideConfigs = [
  {
    cityId: 'gmc',
    label: 'Administrative / Boundaries | Ward Boundary',
    url: '/administrative/amc_wards_from_app.geojson',
    kind: 'ward',
  },
  {
    cityId: 'gmc',
    label: 'Administrative / Boundaries | AMC Boundary',
    sourceLabel: 'Administrative / Boundaries | MCG Limit Boundary',
    url: '/administrative/amc_boundary_from_zone.geojson',
    kind: 'city-boundary',
  },
  {
    cityId: 'gmc',
    label: 'Administrative / Boundaries | Zone Boundary',
    url: '/administrative/amc_zone_boundary.geojson',
    kind: 'zone',
  },
];

const drainageNetworkOverlayConfigs = [
  {
    cityId: 'gmc',
    label: 'Drainage | Storm drainage',
    url: '/drainage/storm-network.zip',
    color: '#2563eb',
    weight: 2.6,
    popupFields: [
      { label: 'Name', key: 'Layer' },
      { label: 'Dimensions', key: 'Layer_12' },
      { label: 'Length', key: 'Length_12' },
    ],
  },
  {
    cityId: 'gmc',
    label: 'Drainage | Sewerage drainage',
    url: '/drainage/sewerage-network.zip',
    color: '#15803d',
    weight: 2.6,
    popupFields: [
      { label: 'Diameter (mm)', key: 'Diameter_1' },
    ],
  },
  {
    cityId: 'gmc',
    label: 'Drainage | Sewage Treatment Plant',
    url: '/drainage/stp.zip',
    color: '#b45309',
    fillColor: '#b45309',
    markerRadius: 6.5,
    markerStroke: true,
    markerWeight: 1,
    markerFillOpacity: 1,
    popupTitle: 'Sewage Treatment Plant',
    popupFields: [
      { label: 'Name', key: 'RefName_1' },
      { label: 'Capacity', key: 'Capacity_' },
    ],
  },
  {
    cityId: 'gmc',
    label: 'Drainage | Sewage Pumping Station',
    url: '/drainage/sps.zip',
    color: '#7c3aed',
    fillColor: '#7c3aed',
    markerRadius: 6,
    markerStroke: true,
    markerWeight: 1,
    markerFillOpacity: 1,
    popupTitle: 'Sewage Pumping Station',
    popupFields: [
      { label: 'Name', key: 'RefName_1' },
      { label: 'Capacity demand', key: 'CapacityDe' },
      { label: 'Pump Discharge', key: 'PumpDischa' },
      { label: 'No of Pumps', key: 'NoofPump' },
      { label: 'Type of Pumps', key: 'TypeofPump' },
      { label: 'Pump Head', key: 'PumpHeadM' },
    ],
  },
  {
    cityId: 'gmc',
    label: 'Drainage | Storm Water Pumping Station',
    url: '/drainage/swps.zip',
    color: '#0f766e',
    fillColor: '#0f766e',
    markerRadius: 6,
    markerStroke: true,
    markerWeight: 1,
    markerFillOpacity: 1,
    popupTitle: 'Storm Water Pumping Station',
  },
  {
    cityId: 'gmc',
    label: 'Drainage | Sewage Command Area',
    url: '/drainage/seweage-command-area.zip',
    color: '#7c2d12',
    weight: 2.4,
    fillColor: '#fdba74',
    fillOpacity: 0.18,
    popupTitle: 'Sewage Command Area',
    popupComputedMetrics: [
      { label: 'Area (km2)', type: 'area', decimals: 2 },
    ],
  },
];

const hydrologyOverlayConfigs = [
  {
    cityId: 'gmc',
    label: 'Hydrology | Canal Drain',
    url: '/hydrology/canal-drain.zip',
    color: '#0f766e',
    weight: 3,
  },
  {
    cityId: 'gmc',
    label: 'Hydrology | Sabarmati River',
    url: '/hydrology/sabarmati-river.zip',
    color: '#1d4ed8',
    weight: 3.4,
  },
  {
    cityId: 'gmc',
    label: 'Hydrology | Lakes',
    url: '/hydrology/ahmedabad_lake_pond.zip',
    color: '#0ea5e9',
    weight: 1.8,
    fillColor: '#7dd3fc',
    fillOpacity: 0.55,
  },
];

const transportationOverlayConfigs = [
  {
    cityId: 'gmc',
    label: 'Transportation | Rail',
    url: '/transportation/ahmedabad_rail_2024.geojson',
    color: '#475569',
    weight: 3,
  },
  {
    cityId: 'gmc',
    label: 'Transportation | Roads',
    url: '/transportation/ahmedabad_road_osm_2026.geojson',
    color: '#f97316',
    weight: 2.4,
  },
];

const fitBoundsOnEnableOverlayLabels = new Set(
  administrativeBoundaryOverrideConfigs.map((overlay) => overlay.label),
);

const removedAdministrativeOverlayLabels = [
  'Administrative / Boundaries | Sector Boundary',
  'Administrative / Boundaries | Colony Boundary',
  'Administrative / Boundaries | Restricted Area (900m)',
];

const removedDrainageOverlayPrefixes = ['Drainage |', 'SWMM Drainage |'];
const removedHydrologyOverlayPrefixes = ['Hydrology |'];
const removedTransportationOverlayPrefixes = ['Transportation |'];
const removedDashboardOverlayPrefixes = ['Observations |', 'Transport |', 'Sensor |'];

const zoneBoundaryDefinitions = [
  {
    zoneName: 'Central Zone',
    wards: ['Dariyapur', 'Shahpur', 'Jamalpur', 'Khadia', 'Kalupur', 'Saraspur-Rakhiyal'],
  },
  {
    zoneName: 'East Zone',
    wards: [
      'Gomtipur',
      'Amraiwadi',
      'Odhav',
      'Vastral',
      'Bhaipura Hatkeshwar',
      'Khokhra',
      'India Colony',
      'Thakkarbapa Nagar',
      'Nikol',
      'Virat Nagar',
      'Bapunagar',
    ],
  },
  {
    zoneName: 'West Zone',
    wards: ['Navrangpura', 'Naranpura', 'Paldi', 'Vasna', 'Stadium'],
  },
  {
    zoneName: 'North Zone',
    wards: ['Shahibag', 'Asarwa', 'Saijpur Bogha', 'Kubernagar', 'Naroda', 'Sardarnagar', 'Sabarmati', 'Ranip'],
  },
  {
    zoneName: 'South Zone',
    wards: ['Maninagar', 'Danilimda', 'Baherampura', 'Isanpur', 'Lambha', 'Vatva'],
  },
  {
    zoneName: 'North-West Zone',
    wards: ['Gota', 'Chandlodiya', 'Chandkheda', 'Ghatlodia', 'Thaltej', 'Bodakdev'],
  },
  {
    zoneName: 'South-West Zone',
    wards: ['Vejalpur', 'Sarkhej', 'Maktampura', 'Jodhpur'],
  },
];

const swmmOverlayConfigs = [
  // {
  //   cityId: 'gmc',
  //   label: 'SWMM Drainage | SWMM Nodes With Invert',
  //   url: '/Dranage/swmm_nodes_with_invert.geojson',
  //   styleType: 'point',
  // },
  // {
  //   cityId: 'gmc',
  //   label: 'SWMM Drainage | SWMM Conduits Updated',
  //   url: '/Dranage/swmm_conduits_updated.geojson',
  //   styleType: 'line',
  // },
];

const swmmTimeseriesOverlayConfigs = [
  {
    cityId: 'gmc',
    key: 'nodes',
    label: 'SWMM Nodes Time Series',
    url: '/Dranage/swmm_nodes_timeseries_merged.geojson',
    kind: 'node',
  },
  {
    cityId: 'gmc',
    key: 'links',
    label: 'SWMM Conduits Time Series',
    url: '/Dranage/swmm_conduits_timeseries_merged.geojson',
    kind: 'link',
  },
];

const hiddenPropertyKeys = new Set(['objectid', 'shape_leng', 'shape_area', 'area', 'objectid_1']);
const swmmTimeseriesHiddenKeys = new Set(['timeseries_meta', 'timeseries', 'summary', 'location_ts', 'from_node_ts', 'to_node_ts']);

function SidebarToggleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="dashboard-open-button__icon">
      <defs>
        <linearGradient id="menuGlow" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.96" />
          <stop offset="1" stopColor="#DFF5F8" stopOpacity="0.88" />
        </linearGradient>
      </defs>
      <rect x="3.5" y="4" width="17" height="16" rx="5" fill="url(#menuGlow)" fillOpacity="0.18" stroke="currentColor" strokeOpacity="0.38" />
      <path d="M8 8.5h8M8 12h8M8 15.5h5.25" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
      <circle cx="16.9" cy="15.5" r="1.15" fill="currentColor" />
    </svg>
  );
}

function getGoogleMapsScriptUrl(apiKey, callbackName) {
  const url = new URL('https://maps.googleapis.com/maps/api/js');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('loading', 'async');
  url.searchParams.set('v', 'weekly');
  url.searchParams.set('callback', callbackName);
  return url.toString();
}

function loadGoogleMapsApi(apiKey) {
  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsLoaderPromise) {
    return googleMapsLoaderPromise;
  }

  const callbackName = '__gmcGoogleMapsReady';

  googleMapsLoaderPromise = new Promise((resolve, reject) => {
    window[callbackName] = () => {
      resolve(window.google.maps);
      delete window[callbackName];
    };

    const script = document.createElement('script');
    script.src = getGoogleMapsScriptUrl(apiKey, callbackName);
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsLoader = 'true';
    script.onerror = () => {
      delete window[callbackName];
      reject(new Error('Google Maps JavaScript API could not be loaded.'));
    };

    document.head.appendChild(script);
  });

  return googleMapsLoaderPromise;
}

function applyOverlayDomClasses(layer, config) {
  const target = layer?._path ?? layer?._icon;
  if (!target) {
    return;
  }

  target.classList.add('map-overlay-animated', config.className);
  target.style.setProperty('--overlay-fill', config.fillColor);
  target.style.setProperty('--overlay-stroke', config.strokeColor);
}

function styleLeafletLayer(layer, config) {
  if (!layer) {
    return;
  }

  if (typeof layer.eachLayer === 'function' && !layer._path && !layer._icon) {
    layer.eachLayer((childLayer) => styleLeafletLayer(childLayer, config));
  }

  if (typeof layer.setStyle === 'function') {
    layer.setStyle({
      color: config.strokeColor,
      fillColor: config.fillColor,
      fillOpacity: config.fillOpacity,
      opacity: 1,
      weight: config.weight,
    });
  }

  if (typeof layer.setRadius === 'function') {
    layer.setRadius(config.radius);
  }

  if (typeof layer.bringToFront === 'function') {
    layer.bringToFront();
  }

  const applyClasses = () => applyOverlayDomClasses(layer, config);
  applyClasses();

  if (typeof layer.on === 'function') {
    layer.on('add', () => {
      window.requestAnimationFrame(applyClasses);
    });
  }
}

function enhanceObservationOverlays(api) {
  const layerEntries = Object.values(api?.layerControl?._layers ?? {});
  layerEntries.forEach((entry) => {
    if (!entry?.overlay || !animatedObservationOverlays[entry.name]) {
      return;
    }

    styleLeafletLayer(entry.layer, animatedObservationOverlays[entry.name]);

    if (typeof entry.layer?.on === 'function') {
      entry.layer.on('add', () => styleLeafletLayer(entry.layer, animatedObservationOverlays[entry.name]));
    }
  });
}

function formatDemLegendValue(value) {
  if (!Number.isFinite(value)) {
    return '';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildDemLegend(config) {
  const legendStops = Array.isArray(config?.legendStops)
    ? config.legendStops
        .filter((stop) => Number.isFinite(stop?.value) && stop?.color)
        .sort((left, right) => left.value - right.value)
    : [];

  if (legendStops.length === 0) {
    return null;
  }

  const minValue = legendStops[0].value;
  const maxValue = legendStops[legendStops.length - 1].value;
  const range = maxValue - minValue || 1;
  const unitsSuffix = config?.legendUnits ? ` ${config.legendUnits}` : '';
  const gradientStops = legendStops.map((stop) => {
    const position = ((stop.value - minValue) / range) * 100;
    return `${stop.color} ${position}%`;
  });

  return {
    title: config?.legendTitle ?? config?.label?.replace(/^Terrain\s*\|\s*/i, '') ?? 'DEM',
    minLabel: `${formatDemLegendValue(minValue)}${unitsSuffix}`,
    maxLabel: `${formatDemLegendValue(maxValue)}${unitsSuffix}`,
    gradient: `linear-gradient(to top, ${gradientStops.join(', ')})`,
    stops: legendStops
      .slice()
      .reverse()
      .map((stop) => ({
        value: stop.value,
        label: `${formatDemLegendValue(stop.value)}${unitsSuffix}`,
      })),
  };
}

function setDemOverlayOpacity(demOverlayStoreRef, opacity) {
  demOverlayStoreRef.current.byLabel.forEach(({ layer }) => {
    if (typeof layer?.setOpacity === 'function') {
      layer.setOpacity(opacity);
    }
  });
}

function getVisibleDemLegend(api, demOverlayStoreRef) {
  if (!api?.map) {
    return null;
  }

  const visibleLabels = demOverlayStoreRef.current.labels.filter((label) => {
    const overlayEntry = demOverlayStoreRef.current.byLabel.get(label);
    return overlayEntry?.layer && api.map.hasLayer(overlayEntry.layer);
  });

  if (visibleLabels.length === 0) {
    return null;
  }

  const activeLabel = visibleLabels[visibleLabels.length - 1];
  const activeOverlay = demOverlayStoreRef.current.byLabel.get(activeLabel);
  return buildDemLegend(activeOverlay?.config);
}

async function initializeDemOverlay(api, demOverlayConfig, demOverlayStoreRef, overlayRegistryRef, defaultOpacity = 0.72) {
  if (!api?.map || !window.L) {
    return null;
  }

  if (!demOverlayConfig) {
    return null;
  }

  const existingEntry = Object.values(api.layerControl?._layers ?? {}).find(
    (entry) => entry?.overlay && entry.name === demOverlayConfig.label,
  );
  if (existingEntry) {
    registerOverlayEntry(overlayRegistryRef, demOverlayConfig.label, existingEntry.layer);
    demOverlayStoreRef.current.byLabel.set(demOverlayConfig.label, {
      config: demOverlayConfig,
      layer: existingEntry.layer,
      metadata: null,
    });
    if (!demOverlayStoreRef.current.labels.includes(demOverlayConfig.label)) {
      demOverlayStoreRef.current.labels.push(demOverlayConfig.label);
    }
    return existingEntry.layer;
  }

  const response = await fetch(resolveAssetUrl(demOverlayConfig.metadataUrl));
  if (!response.ok) {
    throw new Error('DEM metadata could not be loaded.');
  }

  const metadata = await response.json();
  const paneName = 'demPane';

  if (!api.map.getPane(paneName)) {
    const pane = api.map.createPane(paneName);
    pane.style.zIndex = '250';
    pane.style.pointerEvents = 'none';
  }

  const bounds = [
    [metadata.bounds.south, metadata.bounds.west],
    [metadata.bounds.north, metadata.bounds.east],
  ];

  const demLayer = window.L.imageOverlay(resolveAssetUrl(demOverlayConfig.imageUrl), bounds, {
    pane: paneName,
    opacity: defaultOpacity,
    interactive: false,
    className: 'dem-overlay-image',
  });

  api.layerControl.addOverlay(demLayer, demOverlayConfig.label);
  registerOverlayEntry(overlayRegistryRef, demOverlayConfig.label, demLayer);
  demOverlayStoreRef.current.byLabel.set(demOverlayConfig.label, {
    config: demOverlayConfig,
    layer: demLayer,
    metadata,
  });
  if (!demOverlayStoreRef.current.labels.includes(demOverlayConfig.label)) {
    demOverlayStoreRef.current.labels.push(demOverlayConfig.label);
  }
  return demLayer;
}

async function initializeDemOverlays(api, demOverlayConfigs, demOverlayStoreRef, overlayRegistryRef, defaultOpacity = 0.72) {
  const configs = Array.isArray(demOverlayConfigs)
    ? demOverlayConfigs
    : demOverlayConfigs
      ? [demOverlayConfigs]
      : [];

  const createdLayers = [];
  for (const config of configs) {
    try {
      const layer = await initializeDemOverlay(
        api,
        config,
        demOverlayStoreRef,
        overlayRegistryRef,
        defaultOpacity,
      );
      if (layer) {
        createdLayers.push(layer);
      }
    } catch (error) {
      console.warn(`Skipping DEM overlay "${config?.label ?? 'unknown'}":`, error);
    }
  }

  return createdLayers;
}

async function initializeGoogleBasemap(containerId) {
  if (
    !googleMapsApiKey ||
    googleMapsApiKey === 'PASTE_YOUR_GOOGLE_MAPS_API_KEY_HERE'
  ) {
    throw new Error('Missing VITE_GOOGLE_MAPS_API_KEY in the environment.');
  }

  await loadGoogleMapsApi(googleMapsApiKey);

  if (!window.google?.maps?.Map) {
    throw new Error('Google Maps loaded, but the Map constructor is unavailable.');
  }

  return new window.google.maps.Map(document.getElementById(containerId), {
    center: { lat: 28.46, lng: 77.03 },
    zoom: 12,
    mapTypeId: 'roadmap',
    streetViewControl: false,
    fullscreenControl: false,
    mapTypeControl: false,
    rotateControl: false,
    keyboardShortcuts: false,
    gestureHandling: 'none',
    clickableIcons: false,
    disableDefaultUI: true,
  });
}

function syncGoogleBasemap(leafletMap, googleMap) {
  const syncView = () => {
    const center = leafletMap.getCenter();
    googleMap.setCenter({ lat: center.lat, lng: center.lng });
    googleMap.setZoom(leafletMap.getZoom());
  };

  syncView();
  leafletMap.on('move', syncView);
  leafletMap.on('zoom', syncView);
  leafletMap.on('zoomend', syncView);
  window.addEventListener('resize', syncView);

  return () => {
    leafletMap.off('move', syncView);
    leafletMap.off('zoom', syncView);
    leafletMap.off('zoomend', syncView);
    window.removeEventListener('resize', syncView);
  };
}

function getLeafletBasemapContainer() {
  return document.getElementById('gmc-google-basemap');
}

function setGoogleBasemapContainerVisible(isVisible) {
  const container = getLeafletBasemapContainer();
  if (!container) {
    return;
  }

  container.style.opacity = isVisible ? '1' : '0';
  container.style.pointerEvents = isVisible ? 'auto' : 'none';
}

function ensureLeafletBasemapLayers(api, basemapStoreRef) {
  if (!api?.map || !window.L) {
    return;
  }

  if (!basemapStoreRef.current.satellite) {
    basemapStoreRef.current.satellite = window.L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 20,
        keepBuffer: 8,
        updateWhenIdle: false,
      },
    );
  }

  if (!basemapStoreRef.current.cartodb && api.baseTileLayer) {
    basemapStoreRef.current.cartodb = api.baseTileLayer;
    Object.assign(basemapStoreRef.current.cartodb.options, {
      keepBuffer: 8,
      updateWhenIdle: false,
    });
  }

  if (!basemapStoreRef.current.osm) {
    basemapStoreRef.current.osm = window.L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 20,
        keepBuffer: 8,
        updateWhenIdle: false,
      },
    );
  }
}

function applyBasemapSelection(api, basemapStoreRef, basemapType) {
  if (!api?.map) {
    return;
  }

  ensureLeafletBasemapLayers(api, basemapStoreRef);

  const satelliteLayer = basemapStoreRef.current.satellite;
  const cartodbLayer = basemapStoreRef.current.cartodb;
  const osmLayer = basemapStoreRef.current.osm;
  [satelliteLayer, cartodbLayer, osmLayer].forEach((layer) => {
    if (layer && api.map.hasLayer(layer)) {
      api.map.removeLayer(layer);
    }
  });

  setGoogleBasemapContainerVisible(false);

  if (basemapType === 'satellite') {
    satelliteLayer?.addTo(api.map);
    return;
  }

  if (basemapType === 'cartodb') {
    cartodbLayer?.addTo(api.map);
    return;
  }

  osmLayer?.addTo(api.map);
}

function shouldHideProperty(key) {
  return hiddenPropertyKeys.has(String(key).trim().toLowerCase());
}

function sanitizePopupOrTooltipContent(root) {
  if (!root) {
    return;
  }

  root.querySelectorAll('tr').forEach((row) => {
    const headerCell = row.querySelector('th, strong, b, td');
    const label = headerCell?.textContent?.split(':')[0]?.trim()?.toLowerCase();
    if (label && hiddenPropertyKeys.has(label)) {
      row.remove();
    }
  });

  root.querySelectorAll('li, p, div').forEach((node) => {
    const text = node.textContent?.trim();
    if (!text) {
      return;
    }
    const label = text.split(':')[0]?.trim()?.toLowerCase();
    if (hiddenPropertyKeys.has(label)) {
      node.remove();
    }
  });
}

function attachPopupSanitizer(api) {
  if (!api?.map) {
    return () => {};
  }

  const handlePopupOpen = (event) => {
    sanitizePopupOrTooltipContent(event.popup?._contentNode);
  };
  const handleTooltipOpen = (event) => {
    sanitizePopupOrTooltipContent(event.tooltip?._contentNode);
  };

  api.map.on('popupopen', handlePopupOpen);
  api.map.on('tooltipopen', handleTooltipOpen);

  return () => {
    api.map.off('popupopen', handlePopupOpen);
    api.map.off('tooltipopen', handleTooltipOpen);
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildFeatureInfoTable(properties = {}, extraHiddenKeys = new Set()) {
  const rows = Object.entries(properties)
    .filter(([key, value]) => !shouldHideProperty(key) && !extraHiddenKeys.has(key) && value !== null && value !== '' && typeof value !== 'object')
    .map(
      ([key, value]) =>
        `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`,
    );

  if (rows.length === 0) {
    return '<div class="foliumpopup">No attributes available.</div>';
  }

  return `<div class="foliumpopup"><table><tbody>${rows.join('')}</tbody></table></div>`;
}

function getXmlElements(node, localName) {
  if (!node?.getElementsByTagNameNS) {
    return [];
  }

  return Array.from(node.getElementsByTagNameNS('*', localName));
}

function resolveAssetUrl(assetPath) {
  return new URL(assetPath.replace(/^\//, ''), document.baseURI || window.location.href).toString();
}

function parseKmlCoordinateString(text) {
  return String(text ?? '')
    .trim()
    .split(/\s+/)
    .map((chunk) => chunk.split(',').map((value) => Number(value)))
    .filter(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude))
    .map(([longitude, latitude]) => [longitude, latitude]);
}

function closeLinearRing(coordinates) {
  if (coordinates.length === 0) {
    return coordinates;
  }

  const [firstLongitude, firstLatitude] = coordinates[0];
  const [lastLongitude, lastLatitude] = coordinates[coordinates.length - 1];
  if (firstLongitude === lastLongitude && firstLatitude === lastLatitude) {
    return coordinates;
  }

  return [...coordinates, coordinates[0]];
}

function parseKmlPolygonElement(polygonElement) {
  const outerBoundary = getXmlElements(polygonElement, 'outerBoundaryIs')[0];
  const outerCoordinatesText = getXmlElements(outerBoundary, 'coordinates')[0]?.textContent ?? '';
  const outerRing = closeLinearRing(parseKmlCoordinateString(outerCoordinatesText));

  if (outerRing.length < 4) {
    return null;
  }

  const innerRings = getXmlElements(polygonElement, 'innerBoundaryIs')
    .map((innerBoundary) => {
      const coordinatesText = getXmlElements(innerBoundary, 'coordinates')[0]?.textContent ?? '';
      return closeLinearRing(parseKmlCoordinateString(coordinatesText));
    })
    .filter((ring) => ring.length >= 4);

  return [outerRing, ...innerRings];
}

function parseKmlPlacemarkElement(placemarkElement) {
  const properties = {};
  getXmlElements(placemarkElement, 'SimpleData').forEach((field) => {
    const key = field.getAttribute('name');
    if (!key) {
      return;
    }

    properties[key] = field.textContent?.trim() ?? '';
  });

  const name = getXmlElements(placemarkElement, 'name')[0]?.textContent?.trim();
  if (name) {
    properties.name = name;
  }

  const polygons = getXmlElements(placemarkElement, 'Polygon')
    .map((polygonElement) => parseKmlPolygonElement(polygonElement))
    .filter(Boolean);

  if (polygons.length === 0) {
    return null;
  }

  const geometry =
    polygons.length === 1
      ? { type: 'Polygon', coordinates: polygons[0] }
      : { type: 'MultiPolygon', coordinates: polygons.map((polygon) => [polygon[0], ...polygon.slice(1)]) };

  return {
    type: 'Feature',
    properties,
    geometry,
  };
}

function parseKmlToGeoJson(text) {
  const xml = new window.DOMParser().parseFromString(text, 'application/xml');
  const parserError = xml.querySelector('parsererror');
  if (parserError) {
    throw new Error('Ahmedabad ward KML could not be parsed.');
  }

  const features = getXmlElements(xml, 'Placemark')
    .map((placemark) => parseKmlPlacemarkElement(placemark))
    .filter(Boolean);

  return {
    type: 'FeatureCollection',
    features,
  };
}

function parseTextToGeoJson(url, text) {
  const normalizedUrl = String(url || '').toLowerCase();

  if (normalizedUrl.endsWith('.geojson') || normalizedUrl.endsWith('.json')) {
    return JSON.parse(text);
  }

  return parseKmlToGeoJson(text);
}

function isGeoJsonUrl(url) {
  const normalizedUrl = String(url || '').toLowerCase();
  return normalizedUrl.endsWith('.geojson') || normalizedUrl.endsWith('.json');
}

function projectLngLatToMeters(longitude, latitude, latitudeReferenceRadians) {
  const earthRadiusMeters = 6371008.8;
  const longitudeRadians = (longitude * Math.PI) / 180;
  const latitudeRadians = (latitude * Math.PI) / 180;

  return {
    x: earthRadiusMeters * longitudeRadians * Math.cos(latitudeReferenceRadians),
    y: earthRadiusMeters * latitudeRadians,
  };
}

function calculateRingAreaSquareMeters(ringCoordinates = []) {
  if (!Array.isArray(ringCoordinates) || ringCoordinates.length < 4) {
    return 0;
  }

  const latitudeAverage =
    ringCoordinates.reduce((sum, coordinate) => sum + Number(coordinate[1] ?? 0), 0) /
    ringCoordinates.length;
  const latitudeReferenceRadians = (latitudeAverage * Math.PI) / 180;

  let shoelaceArea = 0;
  for (let index = 0; index < ringCoordinates.length - 1; index += 1) {
    const current = ringCoordinates[index];
    const next = ringCoordinates[index + 1];
    const currentPoint = projectLngLatToMeters(current[0], current[1], latitudeReferenceRadians);
    const nextPoint = projectLngLatToMeters(next[0], next[1], latitudeReferenceRadians);
    shoelaceArea += currentPoint.x * nextPoint.y - nextPoint.x * currentPoint.y;
  }

  return Math.abs(shoelaceArea) / 2;
}

function calculatePolygonAreaSquareMeters(polygonCoordinates = []) {
  if (!Array.isArray(polygonCoordinates) || polygonCoordinates.length === 0) {
    return 0;
  }

  const [outerRing = [], ...innerRings] = polygonCoordinates;
  const outerArea = calculateRingAreaSquareMeters(outerRing);
  const holeArea = innerRings.reduce(
    (sum, ringCoordinates) => sum + calculateRingAreaSquareMeters(ringCoordinates),
    0,
  );

  return Math.max(outerArea - holeArea, 0);
}

function calculateGeometryAreaSquareKilometers(geometry) {
  if (!geometry?.type || !geometry?.coordinates) {
    return 0;
  }

  let areaSquareMeters = 0;
  if (geometry.type === 'Polygon') {
    areaSquareMeters = calculatePolygonAreaSquareMeters(geometry.coordinates);
  } else if (geometry.type === 'MultiPolygon') {
    areaSquareMeters = geometry.coordinates.reduce(
      (sum, polygonCoordinates) => sum + calculatePolygonAreaSquareMeters(polygonCoordinates),
      0,
    );
  }

  return areaSquareMeters / 1_000_000;
}

function cleanBoundaryRingCoordinates(ringCoordinates = []) {
  const cleanedCoordinates = ringCoordinates
    .filter((coordinate) => Array.isArray(coordinate) && Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]))
    .map(([longitude, latitude]) => [longitude, latitude]);

  if (cleanedCoordinates.length === 0) {
    return [];
  }

  const deduplicatedCoordinates = cleanedCoordinates.filter((coordinate, index) => {
    if (index === 0) {
      return true;
    }

    const previous = cleanedCoordinates[index - 1];
    return coordinate[0] !== previous[0] || coordinate[1] !== previous[1];
  });

  if (deduplicatedCoordinates.length === 0) {
    return [];
  }

  const firstCoordinate = deduplicatedCoordinates[0];
  const lastCoordinate = deduplicatedCoordinates[deduplicatedCoordinates.length - 1];
  if (firstCoordinate[0] !== lastCoordinate[0] || firstCoordinate[1] !== lastCoordinate[1]) {
    deduplicatedCoordinates.push([...firstCoordinate]);
  }

  return deduplicatedCoordinates.length >= 4 ? deduplicatedCoordinates : [];
}

function cleanBoundaryGeometry(geometry) {
  if (!geometry) {
    return null;
  }

  if (geometry.type === 'Polygon') {
    const cleanedOuterRing = cleanBoundaryRingCoordinates(geometry.coordinates?.[0] ?? []);
    if (cleanedOuterRing.length === 0) {
      return null;
    }

    const cleanedPolygon = {
      type: 'Polygon',
      coordinates: [cleanedOuterRing],
    };

    return calculateGeometryAreaSquareKilometers(cleanedPolygon) > 0.5 ? cleanedPolygon : null;
  }

  if (geometry.type === 'MultiPolygon') {
    const cleanedPolygons = geometry.coordinates
      .map((polygonCoordinates) => {
        const cleanedOuterRing = cleanBoundaryRingCoordinates(polygonCoordinates?.[0] ?? []);
        if (cleanedOuterRing.length === 0) {
          return null;
        }

        const cleanedPolygon = {
          type: 'Polygon',
          coordinates: [cleanedOuterRing],
        };

        return calculateGeometryAreaSquareKilometers(cleanedPolygon) > 0.5 ? [cleanedOuterRing] : null;
      })
      .filter(Boolean);

    if (cleanedPolygons.length === 0) {
      return null;
    }

    if (cleanedPolygons.length === 1) {
      return {
        type: 'Polygon',
        coordinates: cleanedPolygons[0],
      };
    }

    return {
      type: 'MultiPolygon',
      coordinates: cleanedPolygons,
    };
  }

  return geometry;
}

function cleanAdministrativeBoundaryGeoJson(geojson) {
  const features = Array.isArray(geojson?.features) ? geojson.features : [];

  return {
    ...geojson,
    features: features
      .map((feature) => {
        const cleanedGeometry = cleanBoundaryGeometry(feature?.geometry);
        if (!cleanedGeometry) {
          return null;
        }

        return {
          ...feature,
          geometry: cleanedGeometry,
        };
      })
      .filter(Boolean),
  };
}

function buildWardBoundaryPopupContent(feature) {
  const properties = feature?.properties ?? {};
  const areaSquareKilometers = calculateGeometryAreaSquareKilometers(feature?.geometry);
  const formattedWardName = String(
    properties.Name || properties.Ward_Name || properties.sourcewardname || properties.ward_lgd_name || properties.name || 'Unknown',
  )
    .replace(/^\d+[_\s-]*/, '')
    .replace(/_/g, ' ')
    .trim();

  return buildFeatureInfoTable({
    'Ward Name': formattedWardName || 'Unknown',
    'Ward Number': properties.Ward_No || properties.sourcewardcode || 'Unknown',
    'Zone Name': properties.Zone_Name || properties.zone_name || 'Unknown',
    'Area (km2)': areaSquareKilometers > 0 ? areaSquareKilometers.toFixed(2) : '0.00',
  });
}

function normalizeWardName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function resolveZoneWardLookupKey(wardName) {
  const normalized = normalizeWardName(wardName);
  const aliases = {
    stadium: 'spstadium',
  };

  return aliases[normalized] ?? normalized;
}

function unionZoneFeatures(features) {
  if (!Array.isArray(features) || features.length === 0) {
    return null;
  }

  if (!window.turf || features.length === 1) {
    return JSON.parse(JSON.stringify(features[0]));
  }

  try {
    const dissolved = window.turf.union(window.turf.featureCollection(features));
    if (dissolved) {
      return dissolved;
    }
  } catch (error) {
    console.warn('Zone dissolve fallback engaged.', error);
  }

  const combined = window.turf.combine(window.turf.featureCollection(features));
  return combined?.features?.[0] ?? JSON.parse(JSON.stringify(features[0]));
}

function buildZoneBoundaryGeoJson(wardGeojson) {
  const wardFeatures = Array.isArray(wardGeojson?.features) ? wardGeojson.features : [];
  const wardFeatureMap = new Map();

  wardFeatures.forEach((feature) => {
    const properties = feature?.properties ?? {};
    const lookupKey = resolveZoneWardLookupKey(
      properties.sourcewardname || properties.ward_lgd_name || properties.name,
    );
    if (lookupKey) {
      wardFeatureMap.set(lookupKey, feature);
    }
  });

  const zoneFeatures = zoneBoundaryDefinitions
    .map((zone) => {
      const missingWards = [];
      const matchedWardFeatures = zone.wards
        .map((wardName) => {
          const match = wardFeatureMap.get(resolveZoneWardLookupKey(wardName));
          if (!match) {
            missingWards.push(wardName);
          }
          return match;
        })
        .filter(Boolean);

      if (matchedWardFeatures.length === 0) {
        return null;
      }

      const dissolvedFeature = unionZoneFeatures(matchedWardFeatures);
      if (!dissolvedFeature?.geometry) {
        return null;
      }

      return {
        type: 'Feature',
        properties: {
          zone_name: zone.zoneName,
          ward_count: matchedWardFeatures.length,
          wards: zone.wards.join(', '),
          missing_wards: missingWards.join(', '),
        },
        geometry: dissolvedFeature.geometry,
      };
    })
    .filter(Boolean);

  return {
    type: 'FeatureCollection',
    features: zoneFeatures,
  };
}

function buildAmcBoundaryGeoJson(sourceGeojson) {
  const sourceFeatures = Array.isArray(sourceGeojson?.features) ? sourceGeojson.features : [];
  if (sourceFeatures.length === 0) {
    return { type: 'FeatureCollection', features: [] };
  }

  const dissolvedFeature = unionZoneFeatures(sourceFeatures);
  if (!dissolvedFeature?.geometry) {
    return { type: 'FeatureCollection', features: [] };
  }

  const isZoneBoundarySource = sourceFeatures.some((feature) => {
    const properties = feature?.properties ?? {};
    return properties.zone_amc || properties.zone_name;
  });

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          boundary_name: 'AMC Boundary',
          ...(isZoneBoundarySource
            ? { zone_count: sourceFeatures.length }
            : { ward_count: sourceFeatures.length }),
        },
        geometry: dissolvedFeature.geometry,
      },
    ],
  };
}

function getWardBoundaryLayerStyle(isSelected = false) {
  if (isSelected) {
    return {
      color: '#1d4ed8',
      weight: 3.5,
      opacity: 1,
      fill: true,
      fillColor: '#60a5fa',
      fillOpacity: 0.18,
    };
  }

  return {
    color: '#000000',
    weight: 2,
    opacity: 0.95,
    fill: true,
    fillColor: '#000000',
    fillOpacity: 0.04,
  };
}

function getZoneBoundaryLayerStyle(isSelected = false) {
  if (isSelected) {
    return {
      color: '#7c3aed',
      weight: 4,
      opacity: 1,
      fill: true,
      fillColor: '#c4b5fd',
      fillOpacity: 0.22,
    };
  }

  return {
    color: '#4c1d95',
    weight: 3,
    opacity: 0.95,
    fill: true,
    fillColor: '#a78bfa',
    fillOpacity: 0.1,
  };
}

function buildZoneBoundaryPopupContent(feature) {
  const properties = feature?.properties ?? {};
  const areaSquareKilometers = calculateGeometryAreaSquareKilometers(feature?.geometry);
  const popupProperties = {
    'Zone Name': properties.zone_name || properties.zone_amc || 'Unknown',
    'Area (km2)': areaSquareKilometers > 0 ? areaSquareKilometers.toFixed(2) : '0.00',
  };

  if (properties.ward_count != null && properties.ward_count !== '') {
    popupProperties['Ward Count'] = properties.ward_count;
  }

  if (properties.wards) {
    popupProperties.Wards = properties.wards;
  }

  return buildFeatureInfoTable(popupProperties);
}

function getAmcBoundaryLayerStyle(isSelected = false) {
  if (isSelected) {
    return {
      color: '#0f766e',
      weight: 4,
      opacity: 1,
      fill: true,
      fillColor: '#99f6e4',
      fillOpacity: 0.12,
    };
  }

  return {
    color: '#0d9488',
    weight: 3.25,
    opacity: 1,
    fill: true,
    fillColor: '#99f6e4',
    fillOpacity: 0.04,
  };
}

function buildAmcBoundaryPopupContent(feature) {
  const properties = feature?.properties ?? {};
  const areaSquareKilometers = calculateGeometryAreaSquareKilometers(feature?.geometry);
  const popupProperties = {
    'Boundary Name': properties.boundary_name || 'AMC Boundary',
    'Area (km2)': areaSquareKilometers > 0 ? areaSquareKilometers.toFixed(2) : '0.00',
  };

  if (properties.zone_count != null && properties.zone_count !== '') {
    popupProperties['Zone Count'] = properties.zone_count;
  } else if (properties.ward_count != null && properties.ward_count !== '') {
    popupProperties['Ward Count'] = properties.ward_count;
  }

  return buildFeatureInfoTable(popupProperties);
}

function getTimeSeriesValue(properties, key, index) {
  const values = properties?.timeseries?.[key];
  const value = Array.isArray(values) ? Number(values[index] ?? 0) : 0;
  return Number.isFinite(value) ? value : 0;
}

function formatSwmmNumber(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return '0';
  }
  if (Math.abs(numeric) >= 100) return numeric.toFixed(1);
  if (Math.abs(numeric) >= 10) return numeric.toFixed(2);
  return numeric.toFixed(3);
}

function formatMetricValue(value, unit) {
  const text = formatSwmmNumber(value);
  return unit ? `${text} ${unit}` : text;
}

function buildSummaryValue(item, unit, timeLabels = []) {
  if (!item || item.value == null) {
    return null;
  }

  const label = formatMetricValue(item.value, unit);
  const timeLabel = Number.isInteger(item.t_i) ? timeLabels[item.t_i] : null;
  return timeLabel ? `${label} at ${timeLabel}` : label;
}

function getNodeLayerVisual(properties, timeIndex, isSelected = false) {
  const depth = getTimeSeriesValue(properties, 'depth', timeIndex);
  const flooding = getTimeSeriesValue(properties, 'flooding', timeIndex);
  let fillColor = '#78d5e3';
  let strokeColor = '#0c5460';
  let radius = 4;

  if (depth > 1) {
    radius = 6;
    fillColor = '#4fa8ff';
    strokeColor = '#1e5f94';
  }

  if (depth > 2) {
    radius = 7;
    fillColor = '#1d78d8';
    strokeColor = '#174f87';
  }

  if (flooding > 0.001) {
    radius = 8;
    fillColor = '#f08c6c';
    strokeColor = '#a63d1f';
  }

  if (isSelected) {
    radius += 2;
    strokeColor = '#062f37';
  }

  return {
    radius,
    color: strokeColor,
    weight: isSelected ? 2.4 : 1.5,
    fillColor,
    fillOpacity: 0.92,
    opacity: 1,
  };
}

function getLinkLayerVisual(properties, timeIndex, isSelected = false) {
  const flow = Math.abs(getTimeSeriesValue(properties, 'flow', timeIndex));
  const capacity = getTimeSeriesValue(properties, 'capacity', timeIndex);
  const depth = getTimeSeriesValue(properties, 'depth', timeIndex);
  let color = '#1f6f8b';
  let weight = 2.5;
  let dashArray = '0';

  // Depth-based visual
  if (depth > 0.5) {
    color = '#0e4f63';
    weight = 3;
  }

  if (depth > 1.5) {
    color = '#0a3a52';
    weight = 3.5;
  }

  if (depth > 2.5) {
    color = '#052535';
    weight = 4;
  }

  // Flow-based width
  if (flow > 0.5) {
    weight = Math.max(weight, 3.5);
  }

  if (flow > 2) {
    weight = Math.max(weight, 4.5);
  }

  // Capacity stress indicator
  if (capacity > 0.6) {
    color = '#d99032';
    weight = Math.max(weight, 3.5);
  }

  if (capacity > 0.9) {
    color = '#c34d3c';
    weight = Math.max(weight, 5);
    dashArray = '4';
  }

  if (isSelected) {
    color = '#062f37';
    weight += 1.4;
    dashArray = '0';
  }

  return {
    color,
    weight,
    opacity: isSelected ? 1 : 0.92,
    dashArray,
  };
}

function applySwmmFeatureVisual(layer, kind, properties, timeIndex, isSelected = false) {
  if (kind === 'node') {
    const nextStyle = getNodeLayerVisual(properties, timeIndex, isSelected);
    if (typeof layer.setStyle === 'function') {
      layer.setStyle(nextStyle);
    }
    if (typeof layer.setRadius === 'function') {
      layer.setRadius(nextStyle.radius);
    }
  } else {
    const nextStyle = getLinkLayerVisual(properties, timeIndex, isSelected);
    if (typeof layer.setStyle === 'function') {
      layer.setStyle(nextStyle);
    }
  }

  if (isSelected && typeof layer.bringToFront === 'function') {
    layer.bringToFront();
  }
}

function updateSwmmTimeseriesVisualization(store, api, timeIndex, selectedFeature) {
  if (!store?.loaded || !api?.map) {
    return;
  }

  for (const config of swmmTimeseriesOverlayConfigs) {
    const layer = store.layers?.[config.key];
    if (!layer || !api.map.hasLayer(layer) || typeof layer.eachLayer !== 'function') {
      continue;
    }

    layer.eachLayer((childLayer) => {
      const properties = childLayer.feature?.properties ?? {};
      const currentId = config.kind === 'node' ? properties.NODE_ID : properties.LINK_ID;
      const isSelected = Boolean(selectedFeature && selectedFeature.kind === config.kind && selectedFeature.id === currentId);
      
      applySwmmFeatureVisual(childLayer, config.kind, properties, timeIndex, isSelected);
      
      if (typeof childLayer.setPopupContent === 'function' && childLayer.isPopupOpen?.()) {
        childLayer.setPopupContent(
          buildSelectedSwmmPopupContent(
            normalizeSelectedSwmmFeature(config.kind, properties),
            timeIndex,
          ),
        );
      }
    });
  }
}

function getSwmmFeatureLayer(store, selectedFeature) {
  if (!store?.layerIndex || !selectedFeature) {
    return null;
  }

  const layerKey = selectedFeature.kind === 'node' ? 'nodes' : 'links';
  return store.layerIndex[layerKey]?.[selectedFeature.id] ?? null;
}

function updateSwmmSelectedFeatureVisualization(store, api, timeIndex, previousFeature, nextFeature) {
  if (!store?.loaded || !api?.map) {
    return;
  }

  const previousLayer = getSwmmFeatureLayer(store, previousFeature);
  if (previousLayer) {
    const previousProperties = previousLayer.feature?.properties ?? {};
    applySwmmFeatureVisual(previousLayer, previousFeature.kind, previousProperties, timeIndex, false);
    if (typeof previousLayer.setPopupContent === 'function' && previousLayer.isPopupOpen?.()) {
      previousLayer.setPopupContent(buildSelectedSwmmPopupContent(previousFeature, timeIndex));
    }
  }

  const nextLayer = getSwmmFeatureLayer(store, nextFeature);
  if (nextLayer) {
    const nextProperties = nextLayer.feature?.properties ?? {};
    applySwmmFeatureVisual(nextLayer, nextFeature.kind, nextProperties, timeIndex, true);
    if (typeof nextLayer.setPopupContent === 'function') {
      nextLayer.setPopupContent(buildSelectedSwmmPopupContent(nextFeature, timeIndex));
    }
    if (typeof nextLayer.bringToFront === 'function') {
      nextLayer.bringToFront();
    }
  }
}

function refreshActiveSwmmPopup(store, timeIndex, selectedFeature, popupLayerRef) {
  const activeLayer = popupLayerRef.current;
  if (!activeLayer || !selectedFeature) {
    return;
  }

  if (typeof activeLayer.setPopupContent === 'function') {
    activeLayer.setPopupContent(buildSelectedSwmmPopupContent(selectedFeature, timeIndex));
  }
}

function openSwmmPopupForFeature(store, timeIndex, selectedFeature, popupLayerRef) {
  const nextLayer = getSwmmFeatureLayer(store, selectedFeature);
  const previousLayer = popupLayerRef.current;

  if (previousLayer && previousLayer !== nextLayer && typeof previousLayer.closePopup === 'function') {
    previousLayer.closePopup();
  }

  if (!nextLayer) {
    popupLayerRef.current = null;
    return;
  }

  const popupContent = buildSelectedSwmmPopupContent(selectedFeature, timeIndex);
  if (typeof nextLayer.bindPopup === 'function' && !nextLayer.getPopup?.()) {
    nextLayer.bindPopup(popupContent, {
      maxWidth: 360,
      className: 'foliumpopup',
    });
  } else if (typeof nextLayer.setPopupContent === 'function') {
    nextLayer.setPopupContent(popupContent);
  }

  if (typeof nextLayer.openPopup === 'function') {
    nextLayer.openPopup();
  }

  popupLayerRef.current = nextLayer;
}

function cleanupSwmmTimeseriesLayers(api, storeRef) {
  const store = storeRef.current;
  if (store?.layers && api?.map) {
    Object.values(store.layers).forEach((layer) => {
      if (layer && api.map.hasLayer(layer)) {
        api.map.removeLayer(layer);
      }
    });
  }

  storeRef.current = {
    cityId: null,
    loaded: false,
    loadPromise: null,
    layers: {},
    timeLabels: [],
    layerIndex: {
      nodes: {},
      links: {},
    },
  };
}

function normalizeSelectedSwmmFeature(kind, properties) {
  return {
    kind,
    id: kind === 'node' ? properties.NODE_ID : properties.LINK_ID,
    properties,
  };
}

async function ensureSwmmTimeseriesLayers(api, cityId, storeRef, options) {
  if (cityId !== 'gmc' || !api?.map || !window.L) {
    return null;
  }

  const store = storeRef.current;
  if (store.loaded && store.cityId === cityId) {
    return store;
  }

  if (store.loadPromise) {
    return store.loadPromise;
  }

  store.loadPromise = (async () => {
    const renderer = window.L.canvas({ padding: 0.5 });
    const configs = swmmTimeseriesOverlayConfigs.filter((config) => config.cityId === cityId);
    const payloads = await Promise.all(
      configs.map(async (config) => {
        const response = await fetch(resolveAssetUrl(config.url));
        if (!response.ok) {
          throw new Error(`Could not load ${config.label}.`);
        }
        try {
          return await response.json();
        } catch (e) {
          throw new Error(`Invalid JSON for ${config.label}: ${e.message}`);
        }
      }),
    );

    const nextStore = {
      cityId,
      loaded: true,
      loadPromise: null,
      layers: {},
      timeLabels: [],
      layerIndex: {
        nodes: {},
        links: {},
      },
    };

    configs.forEach((config, index) => {
      const geojson = payloads[index];
      const layer = window.L.geoJSON(geojson, {
        renderer,
        style: (feature) =>
          config.kind === 'link'
            ? getLinkLayerVisual(feature?.properties ?? {}, options.timeIndex ?? 0, false)
            : undefined,
        pointToLayer: (feature, latlng) =>
          window.L.circleMarker(latlng, {
            renderer,
            ...getNodeLayerVisual(feature?.properties ?? {}, options.timeIndex ?? 0, false),
          }),
        onEachFeature: (feature, featureLayer) => {
          const properties = feature?.properties ?? {};
          const normalizedFeature = normalizeSelectedSwmmFeature(config.kind, properties);
          nextStore.layerIndex[config.key][config.kind === 'node' ? properties.NODE_ID : properties.LINK_ID] = featureLayer;
          featureLayer.__swmmSelectedFeature = normalizedFeature;

          featureLayer.on('click', function(e) {
            e.stopPropagation();
            if (typeof options.onFeatureSelect === 'function') {
              options.onFeatureSelect(normalizedFeature, featureLayer);
            }
          });
        },
      });

      nextStore.layers[config.key] = layer;
      if (nextStore.timeLabels.length === 0) {
        nextStore.timeLabels = geojson?.features?.[0]?.properties?.timeseries_meta?.time ?? [];
      }
    });

    storeRef.current = nextStore;
    options.onTimeLabels?.(nextStore.timeLabels);
    updateSwmmTimeseriesVisualization(nextStore, api, options.timeIndex ?? 0, null);
    return nextStore;
  })();

  try {
    return await store.loadPromise;
  } finally {
    if (storeRef.current?.loadPromise) {
      storeRef.current.loadPromise = null;
    }
  }
}

function buildSelectedSwmmFeatureView(selectedFeature, timeIndex) {
  if (!selectedFeature) {
    return null;
  }

  const properties = selectedFeature.properties ?? {};
  const meta = properties.timeseries_meta ?? {};
  const units = meta.units ?? {};
  const timeLabels = meta.time ?? [];
  const clampedIndex = Math.max(0, Math.min(timeIndex, Math.max(timeLabels.length - 1, 0)));
  const timestamp = timeLabels[clampedIndex] ?? '';
  const summary = properties.summary ?? {};

  if (selectedFeature.kind === 'node') {
    const depthSeries = Array.isArray(properties.timeseries?.depth) ? properties.timeseries.depth.map((value) => Number(value) || 0) : [];
    return {
      title: properties.NODE_ID || 'Node',
      subtitle: 'Node time series',
      timestamp,
      metrics: [
        { label: 'Depth', value: formatMetricValue(getTimeSeriesValue(properties, 'depth', clampedIndex), units.depth || 'm') },
        { label: 'Flooding', value: formatMetricValue(getTimeSeriesValue(properties, 'flooding', clampedIndex), units.flooding || '') },
        { label: 'Total Flow', value: formatMetricValue(getTimeSeriesValue(properties, 'total_inflow', clampedIndex), units.total_inflow || '') },
        { label: 'Lateral Inflow', value: formatMetricValue(getTimeSeriesValue(properties, 'lateral_inflow', clampedIndex), units.lateral_inflow || '') },
      ],
      chart: {
        label: 'Depth Over Time',
        values: depthSeries,
        currentIndex: clampedIndex,
        currentValue: formatMetricValue(getTimeSeriesValue(properties, 'depth', clampedIndex), units.depth || 'm'),
      },
      summary: [],
    };
  }

  const flowSeries = Array.isArray(properties.timeseries?.flow) ? properties.timeseries.flow.map((value) => Number(value) || 0) : [];
  return {
    title: properties.LINK_ID || 'Conduit',
    subtitle: `${properties.FROM_NODE || properties.from_node_ts || 'From'} to ${properties.TO_NODE || properties.to_node_ts || 'To'}`,
    timestamp,
    metrics: [
      { label: 'Total Flow', value: formatMetricValue(getTimeSeriesValue(properties, 'flow', clampedIndex), units.flow || '') },
      { label: 'Depth', value: formatMetricValue(getTimeSeriesValue(properties, 'depth', clampedIndex), units.depth || 'm') },
      { label: 'Velocity', value: formatMetricValue(getTimeSeriesValue(properties, 'velocity', clampedIndex), units.velocity || 'm/s') },
      { label: 'Capacity', value: formatMetricValue(getTimeSeriesValue(properties, 'capacity', clampedIndex), units.capacity || '') },
    ],
    chart: {
      label: 'Flow Over Time',
      values: flowSeries,
      currentIndex: clampedIndex,
      currentValue: formatMetricValue(getTimeSeriesValue(properties, 'flow', clampedIndex), units.flow || ''),
    },
    summary: [],
  };
}


function buildSelectedSwmmPopupContent(selectedFeature, timeIndex) {
  if (!selectedFeature) {
    return '<div class="foliumpopup">No attributes available.</div>';
  }

  const properties = selectedFeature.properties ?? {};
  const meta = properties.timeseries_meta ?? {};
  const units = meta.units ?? {};
  const timeLabels = meta.time ?? [];
  const clampedIndex = Math.max(0, Math.min(timeIndex, Math.max(timeLabels.length - 1, 0)));
  const rows = [];
  const pushRow = (label, value) => {
    rows.push(`<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`);
  };

  if (selectedFeature.kind === 'node') {
    pushRow('NODE_ID', properties.NODE_ID || '');
    pushRow('Time', timeLabels[clampedIndex] || '');
    pushRow('Depth', formatMetricValue(getTimeSeriesValue(properties, 'depth', clampedIndex), units.depth || 'm'));
    pushRow('Flooding', formatMetricValue(getTimeSeriesValue(properties, 'flooding', clampedIndex), units.flooding || ''));
    pushRow('Total Flow', formatMetricValue(getTimeSeriesValue(properties, 'total_inflow', clampedIndex), units.total_inflow || ''));
    pushRow('Lateral Inflow', formatMetricValue(getTimeSeriesValue(properties, 'lateral_inflow', clampedIndex), units.lateral_inflow || ''));
  } else {
    pushRow('LINK_ID', properties.LINK_ID || '');
    pushRow('Time', timeLabels[clampedIndex] || '');
    pushRow('Total Flow', formatMetricValue(getTimeSeriesValue(properties, 'flow', clampedIndex), units.flow || ''));
    pushRow('Depth', formatMetricValue(getTimeSeriesValue(properties, 'depth', clampedIndex), units.depth || 'm'));
    pushRow('Velocity', formatMetricValue(getTimeSeriesValue(properties, 'velocity', clampedIndex), units.velocity || 'm/s'));
    pushRow('Capacity', formatMetricValue(getTimeSeriesValue(properties, 'capacity', clampedIndex), units.capacity || ''));
  }

  return `<div class="foliumpopup"><table><tbody>${rows.join('')}</tbody></table></div>`;
}

async function initializeSwmmOverlays(api, cityId) {
  if (!api?.map || !api?.layerControl || !window.L) {
    return [];
  }

  const applicableOverlays = swmmOverlayConfigs.filter((overlay) => overlay.cityId === cityId);
  const createdLayers = [];

  for (const overlay of applicableOverlays) {
    const existingEntry = Object.values(api.layerControl?._layers ?? {}).find(
      (entry) => entry?.overlay && entry.name === overlay.label,
    );
    if (existingEntry) {
      createdLayers.push(existingEntry.layer);
      continue;
    }

    const response = await fetch(overlay.url);
    if (!response.ok) {
      throw new Error(`Could not load ${overlay.label}.`);
    }

    const geojson = await response.json();
    const layer = window.L.geoJSON(geojson, {
      style: () =>
        overlay.styleType === 'line'
          ? {
              color: '#1f6f8b',
              weight: 3,
              opacity: 0.9,
            }
          : undefined,
      pointToLayer: (_feature, latlng) =>
        window.L.circleMarker(latlng, {
          radius: 5,
          color: '#0c5460',
          weight: 1.5,
          fillColor: '#78d5e3',
          fillOpacity: 0.92,
        }),
      onEachFeature: (feature, featureLayer) => {
        const properties = feature?.properties ?? {};
        const content = buildFeatureInfoTable(properties);
        featureLayer.bindPopup(content, {
          maxWidth: 360,
          className: 'foliumpopup',
        });
        featureLayer.on('click', () => {
          featureLayer.openPopup();
        });
      },
    });

    api.layerControl.addOverlay(layer, overlay.label);
    createdLayers.push(layer);
  }

  return createdLayers;
}

function removeOverlayEntry(api, overlayLabel, overlayRegistryRef) {
  const existingEntry =
    getOverlayEntries(api, overlayRegistryRef).find((entry) => entry?.name === overlayLabel) ??
    Object.values(api?.layerControl?._layers ?? {}).find(
      (entry) => entry?.overlay && entry.name === overlayLabel,
    );

  if (!existingEntry?.layer) {
    return { existingEntry: null, wasVisible: false };
  }

  const wasVisible = api.map.hasLayer(existingEntry.layer);
  if (wasVisible) {
    api.map.removeLayer(existingEntry.layer);
  }

  if (typeof api.layerControl.removeLayer === 'function') {
    api.layerControl.removeLayer(existingEntry.layer);
  }

  if (existingEntry.layer._leaflet_id && api.layerControl?._layers?.[existingEntry.layer._leaflet_id]) {
    delete api.layerControl._layers[existingEntry.layer._leaflet_id];
  }

  unregisterOverlayEntry(overlayRegistryRef, overlayLabel);

  return { existingEntry, wasVisible };
}

function removeOverlayEntriesByPrefix(api, prefixes = [], overlayRegistryRef) {
  if (!Array.isArray(prefixes) || prefixes.length === 0) {
    return { removedCount: 0, hadVisibleLayer: false };
  }

  const overlayEntries = getOverlayEntries(api, overlayRegistryRef).filter(
    (entry) =>
      entry?.overlay &&
      prefixes.some((prefix) => String(entry.name ?? '').startsWith(prefix)),
  );

  let hadVisibleLayer = false;
  overlayEntries.forEach((entry) => {
    const { wasVisible } = removeOverlayEntry(api, entry.name, overlayRegistryRef);
    if (wasVisible) {
      hadVisibleLayer = true;
    }
  });

  return {
    removedCount: overlayEntries.length,
    hadVisibleLayer,
  };
}

function getOverlayEntries(api, overlayRegistryRef) {
  const registryEntries = Array.from(overlayRegistryRef?.current?.values?.() ?? []).filter(
    (entry) => entry?.overlay,
  );

  if (registryEntries.length > 0) {
    return registryEntries;
  }

  return Object.values(api?.layerControl?._layers ?? {}).filter((entry) => entry?.overlay);
}

function syncOverlayRegistryFromLayerControl(api, overlayRegistryRef) {
  if (!overlayRegistryRef?.current) {
    return;
  }

  overlayRegistryRef.current.clear();
  Object.values(api?.layerControl?._layers ?? {}).forEach((entry) => {
    if (entry?.overlay && entry?.name && entry?.layer) {
      overlayRegistryRef.current.set(entry.name, entry);
    }
  });
}

function registerOverlayEntry(overlayRegistryRef, name, layer) {
  if (!overlayRegistryRef?.current || !name || !layer) {
    return;
  }

  overlayRegistryRef.current.set(name, {
    name,
    layer,
    overlay: true,
  });
}

function unregisterOverlayEntry(overlayRegistryRef, name) {
  if (!overlayRegistryRef?.current || !name) {
    return;
  }

  overlayRegistryRef.current.delete(name);
}

function collectGeoJsonFeatures(value, collector = []) {
  if (!value) {
    return collector;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectGeoJsonFeatures(item, collector));
    return collector;
  }

  if (value.type === 'FeatureCollection') {
    (value.features ?? []).forEach((feature) => {
      if (feature?.type === 'Feature') {
        collector.push(feature);
      }
    });
    return collector;
  }

  if (value.type === 'Feature') {
    collector.push(value);
    return collector;
  }

  if (typeof value === 'object') {
    Object.values(value).forEach((item) => collectGeoJsonFeatures(item, collector));
  }

  return collector;
}

function normalizeShapefileGeoJson(value) {
  return {
    type: 'FeatureCollection',
    features: collectGeoJsonFeatures(value),
  };
}

function getShapefileOverlayStyle(overlay, geometryType = '') {
  const normalizedType = String(geometryType).toLowerCase();
  const isPoint = normalizedType.includes('point');
  const isPolygon = normalizedType.includes('polygon');

  if (isPoint) {
    return getShapefilePointMarkerStyle(overlay);
  }

  return {
    color: overlay.color,
    weight: overlay.weight ?? 2.5,
    opacity: 0.95,
    lineCap: 'round',
    lineJoin: 'round',
    fill: isPolygon,
    fillColor: isPolygon ? overlay.fillColor ?? overlay.color : undefined,
    fillOpacity: isPolygon ? overlay.fillOpacity ?? 0.18 : 0,
  };
}

function getShapefilePointMarkerStyle(overlay) {
  return {
    radius: overlay.markerRadius ?? 6,
    stroke: overlay.markerStroke ?? true,
    color: overlay.color,
    weight: overlay.markerWeight ?? 1.8,
    fill: true,
    fillColor: overlay.fillColor ?? overlay.color,
    fillOpacity: overlay.markerFillOpacity ?? 0.92,
    opacity: 1,
  };
}

function collectCoordinatePairs(coordinates, collector = []) {
  if (!Array.isArray(coordinates)) {
    return collector;
  }

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === 'number' &&
    typeof coordinates[1] === 'number'
  ) {
    collector.push([coordinates[0], coordinates[1]]);
    return collector;
  }

  coordinates.forEach((entry) => collectCoordinatePairs(entry, collector));
  return collector;
}

function getFeatureMarkerLatLng(feature) {
  const coordinates = collectCoordinatePairs(feature?.geometry?.coordinates);
  if (coordinates.length === 0) {
    return null;
  }

  let minLng = coordinates[0][0];
  let maxLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLat = coordinates[0][1];

  coordinates.forEach(([lng, lat]) => {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return;
    }

    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  return window.L.latLng((minLat + maxLat) / 2, (minLng + maxLng) / 2);
}

function getOverlayDisplayName(overlay) {
  return overlay?.popupTitle || String(overlay?.label ?? '').split('|').pop()?.trim() || 'Feature';
}

function getPopupFieldValue(properties = {}, key) {
  const value = properties?.[key];
  if (value == null) {
    return '';
  }

  const trimmed = String(value).trim();
  return trimmed;
}

function buildOverlayPopupContent(overlay, feature = {}) {
  const properties = feature?.properties ?? {};
  const rows = [];

  if (Array.isArray(overlay?.popupFields) && overlay.popupFields.length > 0) {
    overlay.popupFields.forEach((field) => {
      const value = getPopupFieldValue(properties, field.key);
      if (!value) {
        return;
      }

      rows.push(`<tr><th>${escapeHtml(field.label)}</th><td>${escapeHtml(value)}</td></tr>`);
    });
  }

  if (Array.isArray(overlay?.popupComputedMetrics) && overlay.popupComputedMetrics.length > 0) {
    overlay.popupComputedMetrics.forEach((metric) => {
      if (metric.type === 'area') {
        const areaSquareKilometers = calculateGeometryAreaSquareKilometers(feature?.geometry);
        if (areaSquareKilometers > 0) {
          rows.push(
            `<tr><th>${escapeHtml(metric.label)}</th><td>${escapeHtml(
              areaSquareKilometers.toFixed(metric.decimals ?? 2),
            )}</td></tr>`,
          );
        }
      }
    });
  }

  if (rows.length > 0) {
    return `
      <div class="foliumpopup">
        <div class="foliumpopup__title">${escapeHtml(getOverlayDisplayName(overlay))}</div>
        <table><tbody>${rows.join('')}</tbody></table>
      </div>
    `;
  }

  const infoTable = buildFeatureInfoTable(properties);
  return `
    <div class="foliumpopup">
      <div class="foliumpopup__title">${escapeHtml(getOverlayDisplayName(overlay))}</div>
      ${infoTable.replace('<div class="foliumpopup">', '').replace('</div>', '')}
    </div>
  `;
}

function createShapefilePointMarker(overlay, latlng) {
  return window.L.circleMarker(latlng, getShapefilePointMarkerStyle(overlay));
}

function createPointSymbolOverlayLayer(overlay, geojson) {
  const markerLayer = window.L.featureGroup();
  const features = Array.isArray(geojson?.features) ? geojson.features : [];

  features.forEach((feature) => {
    const latlng = getFeatureMarkerLatLng(feature);
    if (!latlng) {
      return;
    }

    const marker = createShapefilePointMarker(overlay, latlng);
    marker.bindPopup(buildOverlayPopupContent(overlay, feature), {
      maxWidth: 360,
      className: 'foliumpopup',
    });
    markerLayer.addLayer(marker);
  });

  return markerLayer;
}

async function fetchVectorOverlayGeoJson(overlay) {
  const response = await fetch(resolveAssetUrl(overlay.url));
  if (!response.ok) {
    throw new Error(`Could not load ${overlay.label}.`);
  }

  if (isGeoJsonUrl(overlay.url)) {
    return normalizeShapefileGeoJson(await response.json());
  }

  if (typeof window.shp !== 'function') {
    throw new Error('Shapefile loader could not be initialized.');
  }

  const parsed = await window.shp(await response.arrayBuffer());
  return normalizeShapefileGeoJson(parsed);
}

function createVectorOverlayLayer(overlay, geojson) {
  return overlay.renderAsPoint
    ? createPointSymbolOverlayLayer(overlay, geojson)
    : window.L.geoJSON(geojson, {
        style: (feature) => getShapefileOverlayStyle(overlay, feature?.geometry?.type),
        pointToLayer: (_feature, latlng) => createShapefilePointMarker(overlay, latlng),
        onEachFeature: (feature, featureLayer) => {
          featureLayer.bindPopup(buildOverlayPopupContent(overlay, feature), {
            maxWidth: 360,
            className: 'foliumpopup',
          });
        },
      });
}

async function initializeDrainageNetworkOverlays(api, cityId, overlayRegistryRef) {
  if (!api?.map || !api?.layerControl || !window.L) {
    return [];
  }

  const applicableOverlays = drainageNetworkOverlayConfigs.filter((overlay) => overlay.cityId === cityId);
  if (applicableOverlays.length === 0) {
    return [];
  }

  const { hadVisibleLayer } = removeOverlayEntriesByPrefix(api, removedDrainageOverlayPrefixes, overlayRegistryRef);
  const createdLayers = [];

  for (const overlay of applicableOverlays) {
    const existingEntry = Object.values(api.layerControl?._layers ?? {}).find(
      (entry) => entry?.overlay && entry.name === overlay.label,
    );
    if (existingEntry?.layer) {
      registerOverlayEntry(overlayRegistryRef, overlay.label, existingEntry.layer);
      createdLayers.push(existingEntry.layer);
      continue;
    }

    const geojson = await fetchVectorOverlayGeoJson(overlay);
    const layer = createVectorOverlayLayer(overlay, geojson);

    api.layerControl.addOverlay(layer, overlay.label);
    registerOverlayEntry(overlayRegistryRef, overlay.label, layer);
    if (hadVisibleLayer) {
      api.map.addLayer(layer);
    }

    createdLayers.push(layer);
  }

  return createdLayers;
}

async function initializeHydrologyOverlays(api, cityId, overlayRegistryRef) {
  if (!api?.map || !api?.layerControl || !window.L) {
    return [];
  }

  const applicableOverlays = hydrologyOverlayConfigs.filter((overlay) => overlay.cityId === cityId);
  if (applicableOverlays.length === 0) {
    return [];
  }

  const { hadVisibleLayer } = removeOverlayEntriesByPrefix(api, removedHydrologyOverlayPrefixes, overlayRegistryRef);
  const createdLayers = [];

  for (const overlay of applicableOverlays) {
    const existingEntry = Object.values(api.layerControl?._layers ?? {}).find(
      (entry) => entry?.overlay && entry.name === overlay.label,
    );
    if (existingEntry?.layer) {
      registerOverlayEntry(overlayRegistryRef, overlay.label, existingEntry.layer);
      createdLayers.push(existingEntry.layer);
      continue;
    }

    const geojson = await fetchVectorOverlayGeoJson(overlay);
    const layer = createVectorOverlayLayer(overlay, geojson);

    api.layerControl.addOverlay(layer, overlay.label);
    registerOverlayEntry(overlayRegistryRef, overlay.label, layer);
    if (hadVisibleLayer) {
      api.map.addLayer(layer);
    }

    createdLayers.push(layer);
  }

  return createdLayers;
}

async function initializeTransportationOverlays(api, cityId, overlayRegistryRef) {
  if (!api?.map || !api?.layerControl || !window.L) {
    return [];
  }

  const applicableOverlays = transportationOverlayConfigs.filter((overlay) => overlay.cityId === cityId);
  if (applicableOverlays.length === 0) {
    return [];
  }

  const { hadVisibleLayer } = removeOverlayEntriesByPrefix(api, removedTransportationOverlayPrefixes, overlayRegistryRef);
  const createdLayers = [];

  for (const overlay of applicableOverlays) {
    const existingEntry = Object.values(api.layerControl?._layers ?? {}).find(
      (entry) => entry?.overlay && entry.name === overlay.label,
    );
    if (existingEntry?.layer) {
      registerOverlayEntry(overlayRegistryRef, overlay.label, existingEntry.layer);
      createdLayers.push(existingEntry.layer);
      continue;
    }

    const geojson = await fetchVectorOverlayGeoJson(overlay);
    const layer = createVectorOverlayLayer(overlay, geojson);

    api.layerControl.addOverlay(layer, overlay.label);
    registerOverlayEntry(overlayRegistryRef, overlay.label, layer);
    if (hadVisibleLayer) {
      api.map.addLayer(layer);
    }

    createdLayers.push(layer);
  }

  return createdLayers;
}

function getAdministrativeOverlayGeoJson(overlay, wardGeojson) {
  if (overlay.kind === 'zone') {
    if (isGeoJsonUrl(overlay.url)) {
      return wardGeojson;
    }
    return buildZoneBoundaryGeoJson(wardGeojson);
  }

  if (overlay.kind === 'city-boundary') {
    if (isGeoJsonUrl(overlay.url)) {
      const sourceFeatures = Array.isArray(wardGeojson?.features) ? wardGeojson.features : [];
      const hasDirectBoundaryFeature =
        sourceFeatures.length === 1 && Boolean(sourceFeatures[0]?.properties?.boundary_name);

      if (hasDirectBoundaryFeature) {
        return cleanAdministrativeBoundaryGeoJson(wardGeojson);
      }
    }

    return buildAmcBoundaryGeoJson(wardGeojson);
  }

  return wardGeojson;
}

function getAdministrativeOverlayStyle(overlay, isSelected = false) {
  if (overlay.kind === 'zone') {
    return getZoneBoundaryLayerStyle(isSelected);
  }

  if (overlay.kind === 'city-boundary') {
    return getAmcBoundaryLayerStyle(isSelected);
  }

  return getWardBoundaryLayerStyle(isSelected);
}

function getAdministrativeOverlayPopupContent(overlay, feature) {
  if (overlay.kind === 'zone') {
    return buildZoneBoundaryPopupContent(feature);
  }

  if (overlay.kind === 'city-boundary') {
    return buildAmcBoundaryPopupContent(feature);
  }

  return buildWardBoundaryPopupContent(feature);
}

async function initializeAdministrativeBoundaryOverrides(api, cityId, overlayRegistryRef) {
  if (!api?.map || !api?.layerControl || !window.L) {
    return [];
  }

  const applicableOverrides = administrativeBoundaryOverrideConfigs.filter(
    (overlay) => overlay.cityId === cityId,
  );
  const createdLayers = [];
  const geojsonCache = new Map();

  for (const overlay of applicableOverrides) {
    if (!geojsonCache.has(overlay.url)) {
      const response = await fetch(resolveAssetUrl(overlay.url));
      if (!response.ok) {
        throw new Error(`Could not load ${overlay.label}.`);
      }

      geojsonCache.set(overlay.url, parseTextToGeoJson(overlay.url, await response.text()));
    }

    const wardGeojson = geojsonCache.get(overlay.url);
    const geojson = getAdministrativeOverlayGeoJson(overlay, wardGeojson);
    const { wasVisible } = removeOverlayEntry(api, overlay.sourceLabel ?? overlay.label, overlayRegistryRef);
    let selectedWardLayer = null;

    const layer = window.L.geoJSON(geojson, {
      interactive: true,
      style: () => getAdministrativeOverlayStyle(overlay, false),
      onEachFeature: (feature, featureLayer) => {
        if (overlay.kind === 'zone') {
          const zoneName = feature?.properties?.zone_name || feature?.properties?.zone_amc;
          if (zoneName) {
            featureLayer.bindTooltip(zoneName, {
              permanent: true,
              direction: 'center',
              className: 'dashboard-zone-label',
              opacity: 1,
            });
          }
        }

        featureLayer.bindPopup(
          getAdministrativeOverlayPopupContent(overlay, feature),
          {
            maxWidth: 360,
            className: 'foliumpopup',
          },
        );
        featureLayer.on('click', () => {
          if (selectedWardLayer && selectedWardLayer !== featureLayer) {
            selectedWardLayer.setStyle(getAdministrativeOverlayStyle(overlay, false));
          }

          selectedWardLayer = featureLayer;
          featureLayer.setStyle(getAdministrativeOverlayStyle(overlay, true));
          if (typeof featureLayer.bringToFront === 'function') {
            featureLayer.bringToFront();
          }
          featureLayer.openPopup();
        });
      },
    });

    if (typeof layer.bringToFront === 'function') {
      layer.bringToFront();
    }

    api.layerControl.addOverlay(layer, overlay.label);
    registerOverlayEntry(overlayRegistryRef, overlay.label, layer);
    if (wasVisible) {
      api.map.addLayer(layer);
    }

    createdLayers.push(layer);
  }

  return createdLayers;
}

function parseCsvRows(text) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',').map((value) => value.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    return headers.reduce((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {});
  });
}

async function initializeSensorOverlays(api, cityId, overlayRegistryRef) {
  if (!api?.map || !api?.layerControl || !window.L) {
    return [];
  }

  const applicableOverlays = sensorOverlayConfigs.filter((overlay) => overlay.cityId === cityId);
  const createdLayers = [];
  const paneName = 'sensorPane';

  if (!api.map.getPane(paneName)) {
    const pane = api.map.createPane(paneName);
    pane.style.zIndex = '640';
  }

  for (const overlay of applicableOverlays) {
    const existingEntry = Object.values(api.layerControl?._layers ?? {}).find(
      (entry) => entry?.overlay && entry.name === overlay.label,
    );
    if (existingEntry) {
      registerOverlayEntry(overlayRegistryRef, overlay.label, existingEntry.layer);
      createdLayers.push(existingEntry.layer);
      continue;
    }

    const response = await fetch(resolveAssetUrl(overlay.url));
    if (!response.ok) {
      throw new Error(`Could not load ${overlay.label}.`);
    }

    const rows = parseCsvRows(await response.text());
    const markerLayer = window.L.featureGroup();

    rows.forEach((row) => {
      const latitude = Number(row.latitude);
      const longitude = Number(row.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      const marker = window.L.circleMarker([latitude, longitude], {
        pane: paneName,
        radius: 7,
        color: '#8F2D18',
        weight: 2,
        fillColor: '#FF8A5B',
        fillOpacity: 0.9,
      });

      marker.bindPopup(
        buildFeatureInfoTable({
          rank: row.rank,
          flood_id: row.flood_id,
          latitude,
          longitude,
        }),
        {
          maxWidth: 320,
          className: 'foliumpopup',
        },
      );

      markerLayer.addLayer(marker);
    });

    api.layerControl.addOverlay(markerLayer, overlay.label);
    registerOverlayEntry(overlayRegistryRef, overlay.label, markerLayer);
    api.map.addLayer(markerLayer);
    createdLayers.push(markerLayer);
  }

  return createdLayers;
}

function buildSections(api, collapsedMap, overlayRegistryRef) {
  const sections = new Map();
  const overlayEntries = getOverlayEntries(api, overlayRegistryRef);

  overlayEntries.forEach((entry) => {
    const fullLabel = entry.name.trim();
    const parts = fullLabel.split('|').map((part) => part.trim());
    const sectionName = parts.length > 1 ? parts[0] : 'General';
    const itemName = parts.length > 1 ? parts.slice(1).join(' | ') : parts[0];

    if (!sections.has(sectionName)) {
      sections.set(sectionName, []);
    }

    sections.get(sectionName).push({
      fullLabel,
      name: itemName,
      checked: api?.map?.hasLayer(entry.layer) ?? false,
    });
  });

  return Array.from(sections.entries())
    .map(([name, items], index) => ({
      name,
      collapsed: collapsedMap[name] ?? (name === 'SWMM Drainage'),
      items,
      index,
    }))
    .sort((left, right) => {
      if (left.name === 'Administrative / Boundaries' && right.name !== 'Administrative / Boundaries') {
        return -1;
      }

      if (right.name === 'Administrative / Boundaries' && left.name !== 'Administrative / Boundaries') {
        return 1;
      }

      return left.index - right.index;
    })
    .map(({ index, ...section }) => section);
}

function ensureDefaultVisibleOverlays(api, overlayNames = [], overlayRegistryRef) {
  if (!api?.map || overlayNames.length === 0) {
    return;
  }

  overlayNames.forEach((overlayName) => {
    const layerEntry = getOverlayEntries(api, overlayRegistryRef).find((entry) => entry?.name === overlayName);

    if (layerEntry?.layer && !api.map.hasLayer(layerEntry.layer)) {
      api.map.addLayer(layerEntry.layer);
    }
  });
}

function focusOverlayBounds(api, overlayName, overlayRegistryRef) {
  if (!api?.map || !overlayName) {
    return;
  }

  const layerEntry = getOverlayEntries(api, overlayRegistryRef).find((entry) => entry?.name === overlayName);

  if (!layerEntry?.layer || typeof layerEntry.layer.getBounds !== 'function') {
    return;
  }

  const bounds = layerEntry.layer.getBounds();
  if (bounds?.isValid?.()) {
    api.map.fitBounds(bounds, { padding: [24, 24] });
  }
}

function applyInitialCityView(api, cityConfig) {
  if (!api?.map || !Array.isArray(cityConfig?.initialView?.center)) {
    return;
  }

  const [latitude, longitude] = cityConfig.initialView.center;
  const zoom = cityConfig.initialView.zoom ?? 11;

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    api.map.setView([latitude, longitude], zoom, { animate: false });
  }
}

function detachNativeLayerControl(api) {
  if (!api?.map || !api?.layerControl) {
    return;
  }

  if (typeof api.map.removeControl === 'function') {
    api.map.removeControl(api.layerControl);
  }

  const controlContainer = api.layerControl.getContainer?.();
  if (controlContainer) {
    controlContainer.remove();
  }
}

export default function App() {
  const [selectedCityId, setSelectedCityId] = useState(cityDashboards[0].id);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Starting dashboard experience...');
  const [error, setError] = useState('');
  const [infoSidebarOpen, setInfoSidebarOpen] = useState(true);
  const [layerSidebarOpen, setLayerSidebarOpen] = useState(false);
  const [sections, setSections] = useState([]);
  const [collapsedMap, setCollapsedMap] = useState({});
  const [swmmSectionCollapsed, setSwmmSectionCollapsed] = useState(true);
  const [swmmLayerVisibility, setSwmmLayerVisibility] = useState({ nodes: false, links: false });
  const [swmmLayersLoading, setSwmmLayersLoading] = useState(false);
  const [swmmTimeLabels, setSwmmTimeLabels] = useState([]);
  const [swmmTimeIndex, setSwmmTimeIndex] = useState(0);
  const [selectedSwmmFeature, setSelectedSwmmFeature] = useState(null);
  const [basemapType, setBasemapType] = useState('osm');
  const [demOpacity, setDemOpacity] = useState(0.72);
  const [terrainLegend, setTerrainLegend] = useState(null);
  const mapApiRef = useRef(null);
  const leafletBasemapLayersRef = useRef({ satellite: null, osm: null, cartodb: null });
  const overlayRegistryRef = useRef(new Map());
  const demOverlayStoreRef = useRef({ byLabel: new Map(), labels: [] });
  const collapsedMapRef = useRef({});
  const swmmTimeseriesLayersRef = useRef({ cityId: null, loaded: false, loadPromise: null, layers: {}, timeLabels: [] });
  const swmmFeatureSelectCallbackRef = useRef(null);
  const previousSelectedSwmmFeatureRef = useRef(null);
  const activeSwmmPopupLayerRef = useRef(null);
  const selectedCity = useMemo(() => getCityById(selectedCityId), [selectedCityId]);

  const allCollapsed = useMemo(
    () => sections.length > 0 && sections.every((section) => section.collapsed),
    [sections],
  );

  const refreshSections = () => {
    if (!mapApiRef.current) {
      return;
    }

    setSections(buildSections(mapApiRef.current, collapsedMapRef.current, overlayRegistryRef));
  };

  const refreshDashboardUi = () => {
    if (!mapApiRef.current) {
      return;
    }

    refreshSections();
    setTerrainLegend(getVisibleDemLegend(mapApiRef.current, demOverlayStoreRef));
  };

  useEffect(() => {
    collapsedMapRef.current = collapsedMap;
  }, [collapsedMap]);

  useEffect(() => {
    cleanupSwmmTimeseriesLayers(mapApiRef.current, swmmTimeseriesLayersRef);
    setCollapsedMap({});
    collapsedMapRef.current = {};
    setSections([]);
    setSwmmSectionCollapsed(true);
    setSwmmLayerVisibility({ nodes: false, links: false });
    setSwmmLayersLoading(false);
    setSwmmTimeLabels([]);
    setSwmmTimeIndex(0);
    setSelectedSwmmFeature(null);
    setDemOpacity(0.72);
    setTerrainLegend(null);
    previousSelectedSwmmFeatureRef.current = null;
    activeSwmmPopupLayerRef.current = null;
    demOverlayStoreRef.current = { byLabel: new Map(), labels: [] };
    overlayRegistryRef.current = new Map();
    setLoading(true);
  }, [selectedCityId]);

  useEffect(() => {
    let cancelled = false;
    let cleanupPopupSanitizer = null;

    const syncSections = () => {
      if (!mapApiRef.current || cancelled) {
        return;
      }

      refreshDashboardUi();
    };

    const initialize = async () => {
      setError('');
      setLoadingMessage(`Loading ${selectedCity.loadingLabel} dashboard styles and interface...`);
      for (const stylesheet of externalStylesheets) {
        await loadStylesheet(stylesheet);
      }

      window.L_NO_TOUCH = false;
      window.L_DISABLE_3D = false;

      setLoadingMessage(`Loading ${selectedCity.loadingLabel} map libraries...`);
      for (const script of externalScripts) {
        await loadScript(script);
      }
      await loadScript(resolveAssetUrl(selectedCity.scriptUrl));

      if (cancelled) {
        return;
      }

      setLoadingMessage(`Rendering preserved ${selectedCity.loadingLabel} geospatial layers...`);
      const initializer = window[selectedCity.initFunction];
      const api = initializer?.('gmc-dashboard-map');
      if (!api) {
        throw new Error('Dashboard initialization function is unavailable.');
      }

      mapApiRef.current = api;
      syncOverlayRegistryFromLayerControl(api, overlayRegistryRef);
      applyInitialCityView(api, selectedCity);
      detachNativeLayerControl(api);
      removedAdministrativeOverlayLabels.forEach((overlayLabel) => {
        removeOverlayEntry(api, overlayLabel, overlayRegistryRef);
      });
      removeOverlayEntriesByPrefix(api, removedDashboardOverlayPrefixes, overlayRegistryRef);
      setLoadingMessage(`Preparing ${selectedCity.loadingLabel} basemap and overlays...`);
      await initializeAdministrativeBoundaryOverrides(api, selectedCity.id, overlayRegistryRef);
      await initializeDrainageNetworkOverlays(api, selectedCity.id, overlayRegistryRef);
      await initializeHydrologyOverlays(api, selectedCity.id, overlayRegistryRef);
      await initializeTransportationOverlays(api, selectedCity.id, overlayRegistryRef);
      await initializeDemOverlays(
        api,
        selectedCity.demOverlays ?? selectedCity.demOverlay,
        demOverlayStoreRef,
        overlayRegistryRef,
        demOpacity,
      );
      ensureDefaultVisibleOverlays(api, selectedCity.defaultVisibleOverlays, overlayRegistryRef);
      focusOverlayBounds(api, selectedCity.initialFocusOverlay, overlayRegistryRef);
      applyBasemapSelection(api, leafletBasemapLayersRef, basemapType);
      cleanupPopupSanitizer = attachPopupSanitizer(api);
      syncSections();

      api.map.on('overlayadd', syncSections);
      api.map.on('overlayremove', syncSections);
      api.map.on('layeradd', syncSections);
      api.map.on('layerremove', syncSections);

      setLoadingMessage(`Finalizing ${selectedCity.loadingLabel} map frame...`);
      setLoading(false);
    };

    initialize().catch((error) => {
      console.error(error);
      setError(error.message);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      cleanupPopupSanitizer?.();
      if (mapApiRef.current?.map) {
        mapApiRef.current.map.off('overlayadd', syncSections);
        mapApiRef.current.map.off('overlayremove', syncSections);
        mapApiRef.current.map.off('layeradd', syncSections);
        mapApiRef.current.map.off('layerremove', syncSections);
      }
      if (mapApiRef.current?.map) {
        mapApiRef.current.map.remove();
        mapApiRef.current = null;
      }
      cleanupSwmmTimeseriesLayers(mapApiRef.current, swmmTimeseriesLayersRef);
      activeSwmmPopupLayerRef.current = null;
      leafletBasemapLayersRef.current = { satellite: null, osm: null, cartodb: null };
      demOverlayStoreRef.current = { byLabel: new Map(), labels: [] };
      overlayRegistryRef.current = new Map();
    };
  }, [selectedCity]);

  useEffect(() => {
    if (!mapApiRef.current?.map) {
      return;
    }

    applyBasemapSelection(
      mapApiRef.current,
      leafletBasemapLayersRef,
      basemapType,
    );
  }, [basemapType]);

  useEffect(() => {
    if (!mapApiRef.current?.map) {
      return;
    }

    const timeout = window.setTimeout(() => {
      mapApiRef.current?.map.invalidateSize();
    }, 320);

    return () => window.clearTimeout(timeout);
  }, [infoSidebarOpen, layerSidebarOpen]);

  useEffect(() => {
    setDemOverlayOpacity(demOverlayStoreRef, demOpacity);
  }, [demOpacity]);

  useEffect(() => {
    if (!mapApiRef.current?.map || !swmmTimeseriesLayersRef.current.loaded) {
      return;
    }

    updateSwmmTimeseriesVisualization(
      swmmTimeseriesLayersRef.current,
      mapApiRef.current,
      swmmTimeIndex,
      selectedSwmmFeature,
    );
  }, [swmmTimeIndex]);

  useEffect(() => {
    if (!mapApiRef.current?.map || !swmmTimeseriesLayersRef.current.loaded) {
      previousSelectedSwmmFeatureRef.current = selectedSwmmFeature;
      return;
    }

    updateSwmmSelectedFeatureVisualization(
      swmmTimeseriesLayersRef.current,
      mapApiRef.current,
      swmmTimeIndex,
      previousSelectedSwmmFeatureRef.current,
      selectedSwmmFeature,
    );
    previousSelectedSwmmFeatureRef.current = selectedSwmmFeature;
  }, [selectedSwmmFeature, swmmTimeIndex]);

  const handleToggleLayer = (fullLabel) => {
    const api = mapApiRef.current;
    if (!api?.map) {
      return;
    }

    const layerEntry = getOverlayEntries(api, overlayRegistryRef).find((entry) => entry?.name === fullLabel);

    if (!layerEntry?.layer) {
      return;
    }

    if (api.map.hasLayer(layerEntry.layer)) {
      api.map.removeLayer(layerEntry.layer);
    } else {
      api.map.addLayer(layerEntry.layer);
      if (
        fitBoundsOnEnableOverlayLabels.has(fullLabel) &&
        typeof layerEntry.layer.getBounds === 'function'
      ) {
        const bounds = layerEntry.layer.getBounds();
        if (bounds?.isValid?.()) {
          api.map.fitBounds(bounds, { padding: [24, 24] });
        }
      }
    }

    refreshDashboardUi();
  };

  const handleUntickAll = () => {
    const api = mapApiRef.current;
    if (!api?.map) {
      return;
    }

    getOverlayEntries(api, overlayRegistryRef).forEach((entry) => {
      if (entry?.overlay && entry.layer && api.map.hasLayer(entry.layer)) {
        api.map.removeLayer(entry.layer);
      }
    });

    refreshDashboardUi();
  };

  const handleToggleSection = (sectionName) => {
    setCollapsedMap((current) => ({
      ...current,
      [sectionName]: !current[sectionName],
    }));
    setSections((current) =>
      current.map((section) =>
        section.name === sectionName
          ? { ...section, collapsed: !section.collapsed }
          : section,
      ),
    );
  };

  const handleToggleAllSections = () => {
    const nextValue = !allCollapsed;
    const nextMap = Object.fromEntries(sections.map((section) => [section.name, nextValue]));
    setCollapsedMap(nextMap);
    setSections((current) => current.map((section) => ({ ...section, collapsed: nextValue })));
  };


  const handleToggleSwmmSection = () => {
    setSwmmSectionCollapsed((current) => !current);
  };

  const handleToggleSwmmLayer = async (layerKey) => {
    const api = mapApiRef.current;
    if (!api?.map || selectedCity.id !== 'gmc') {
      return;
    }

    const nextChecked = !swmmLayerVisibility[layerKey];
    setSwmmLayersLoading(true);

    try {
      swmmFeatureSelectCallbackRef.current = (feature) => {
        setSelectedSwmmFeature(feature);
        setSwmmSectionCollapsed(false);
      };

      const store = await ensureSwmmTimeseriesLayers(api, selectedCity.id, swmmTimeseriesLayersRef, {
        timeIndex: swmmTimeIndex,
        onTimeLabels: setSwmmTimeLabels,
        onFeatureSelect: swmmFeatureSelectCallbackRef.current,
      });

      if (!store?.layers?.[layerKey]) {
        return;
      }

      const layer = store.layers[layerKey];
      if (nextChecked) {
        if (!api.map.hasLayer(layer)) {
          api.map.addLayer(layer);
        }
      } else if (api.map.hasLayer(layer)) {
        api.map.removeLayer(layer);
      }

      setSwmmLayerVisibility((current) => ({
        ...current,
        [layerKey]: nextChecked,
      }));

      if (!nextChecked) {
        const deselectedKind = layerKey === 'nodes' ? 'node' : 'link';
        setSelectedSwmmFeature((current) => (current?.kind === deselectedKind ? null : current));
      }

      updateSwmmTimeseriesVisualization(store, api, swmmTimeIndex, selectedSwmmFeature);
    } catch (layerError) {
      console.error(layerError);
      setError(layerError.message);
    } finally {
      setSwmmLayersLoading(false);
    }
  };

  const swmmLayerItems = useMemo(() => {
    if (selectedCity.id !== 'gmc') {
      return [];
    }

    return swmmTimeseriesOverlayConfigs
      .filter((config) => config.cityId === selectedCity.id)
      .map((config) => ({
        key: config.key,
        label: config.label,
        checked: swmmLayerVisibility[config.key] ?? false,
      }));
  }, [selectedCity.id, swmmLayerVisibility]);

  const swmmSelectedFeatureView = useMemo(
    () => buildSelectedSwmmFeatureView(selectedSwmmFeature, swmmTimeIndex),
    [selectedSwmmFeature, swmmTimeIndex],
  );

  return (
    <div className="dashboard-app">
      <DashboardSidebar
        isInfoOpen={infoSidebarOpen}
        isLayerOpen={layerSidebarOpen}
        cities={cityDashboards}
        selectedCityId={selectedCity.id}
        selectedCityTitle={selectedCity.title}
        selectedCitySubtitle={selectedCity.subtitle}
        sourceLabel={selectedCity.sourceLabel}
        sections={sections}
        onCityChange={setSelectedCityId}
        onCloseInfo={() => setInfoSidebarOpen(false)}
        onCloseLayers={() => setLayerSidebarOpen(false)}
        onToggleSection={handleToggleSection}
        onToggleLayer={handleToggleLayer}
        swmmSectionVisible={false}
        swmmSectionCollapsed={swmmSectionCollapsed}
        swmmLayersLoading={swmmLayersLoading}
        swmmLayerItems={swmmLayerItems}
        swmmTimeLabels={swmmTimeLabels}
        swmmTimeIndex={swmmTimeIndex}
        swmmSelectedFeature={swmmSelectedFeatureView}
        onToggleSwmmSection={handleToggleSwmmSection}
        onToggleSwmmLayer={handleToggleSwmmLayer}
        onSwmmTimeIndexChange={setSwmmTimeIndex}
      />

      {!infoSidebarOpen && (
        <button
          type="button"
          className="dashboard-open-button dashboard-open-button--left"
          onClick={() => setInfoSidebarOpen(true)}
          aria-label="Open city panel"
          title="Open city panel"
        >
          <SidebarToggleIcon collapsed />
        </button>
      )}

      {!layerSidebarOpen && (
        <button
          type="button"
          className="dashboard-open-button dashboard-open-button--right"
          onClick={() => setLayerSidebarOpen(true)}
          aria-label="Open layers panel"
          title="Open layers panel"
        >
          <SidebarToggleIcon collapsed />
        </button>
      )}

      <main className={`dashboard-main${infoSidebarOpen ? ' has-left-sidebar' : ''}`}>
        <MapCanvas
          loading={loading}
          loadingMessage={loadingMessage}
          basemapType={basemapType}
          onBasemapChange={setBasemapType}
          terrainLegend={terrainLegend}
          demOpacity={demOpacity}
          onDemOpacityChange={setDemOpacity}
        />
        {error && <div className="dashboard-error-banner">{error}</div>}
      </main>
    </div>
  );
}
