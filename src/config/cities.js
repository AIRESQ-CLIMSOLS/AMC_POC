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
    defaultVisibleOverlays: ['Administrative / Boundaries | AMC Boundary'],
    initialFocusOverlay: 'Administrative / Boundaries | AMC Boundary',
    demOverlay: {
      label: 'Terrain | Ahmedabad DEM',
      metadataUrl: '/DEM/merged_tiles_gurugram_dem.metadata.json',
      imageUrl: '/DEM/merged_tiles_gurugram_dem_overlay.png',
    },
  },
];

export function getCityById(cityId) {
  return cityDashboards.find((city) => city.id === cityId) ?? cityDashboards[0];
}
