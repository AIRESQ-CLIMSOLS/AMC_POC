export const cityDashboards = [
  {
    id: 'gmc',
    name: 'Ahmedabad',
    title: 'Ahmedabad Municipal Atlas',
    subtitle: 'Drainage, hydrology and administrative layers',
    scriptUrl: '/generated/gmcDashboardInit.js',
    initFunction: 'initializeCityDashboard_gmc',
    loadingLabel: 'Ahmedabad',
    sourceLabel: 'Ahmedabad Municipal Corporation (AMC)',
    initialView: {
      center: [23.0225, 72.5714],
      zoom: 11,
    },
    defaultVisibleOverlays: ['Administrative / Boundaries | AMC Boundary'],
    initialFocusOverlay: 'Administrative / Boundaries | AMC Boundary',
    demOverlays: [
      {
        label: 'Terrain | FAB DEM',
        metadataUrl: '/DEM/fabdem_ahmedabad_amc.metadata.json',
        imageUrl: '/DEM/fabdem_ahmedabad_amc_overlay.png',
        legendTitle: 'FAB DEM',
        legendUnits: 'm',
        legendStops: [
          { value: 26.5, color: '#006400' },
          { value: 32, color: '#378c37' },
          { value: 38, color: '#78b05a' },
          { value: 45, color: '#bccd78' },
          { value: 52, color: '#e0d6aa' },
          { value: 60, color: '#c69c6d' },
          { value: 68, color: '#a07554' },
          { value: 75.2, color: '#f5f5f5' },
        ],
      },
      {
        label: 'Terrain | Contour DEM',
        metadataUrl: '/DEM/contour_dem_ahmedabad_amc.metadata.json',
        imageUrl: '/DEM/contour_dem_ahmedabad_amc_overlay.png',
        legendTitle: 'Contour DEM',
        legendUnits: 'm',
        legendStops: [
          { value: 28, color: '#006400' },
          { value: 34, color: '#378c37' },
          { value: 42, color: '#78b05a' },
          { value: 50, color: '#bccd78' },
          { value: 58, color: '#e0d6aa' },
          { value: 68, color: '#c69c6d' },
          { value: 78, color: '#a07554' },
          { value: 85, color: '#f5f5f5' },
        ],
      },
    ],
  },
];

export function getCityById(cityId) {
  return cityDashboards.find((city) => city.id === cityId) ?? cityDashboards[0];
}
