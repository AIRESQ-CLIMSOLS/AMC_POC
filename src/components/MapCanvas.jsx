import React from 'react';

const logoUrl = 'https://home.airesqclimsols.com/assets/White-logo-small-DosekXhA.png';

function LoadingScreen({ message }) {
  return (
    <div className="dashboard-loading-screen" role="status" aria-live="polite">
      <div className="dashboard-loading-screen__panel">
        <div className="dashboard-loading-screen__halo dashboard-loading-screen__halo--one" />
        <div className="dashboard-loading-screen__halo dashboard-loading-screen__halo--two" />
        <div className="dashboard-loading-screen__brand-shell">
          <div className="dashboard-loading-screen__brand">
            <img src={logoUrl} alt="AIRESQ" className="dashboard-loading-screen__logo" />
          </div>
        </div>
        <p className="dashboard-loading-screen__eyebrow">AIRESQ Geospatial Intelligence</p>
        <h2>Preparing the AMC Dashboard</h2>
        <p className="dashboard-loading-screen__message">{message}</p>
        <div className="dashboard-loading-screen__bar">
          <span />
        </div>
        <div className="dashboard-loading-screen__pills">
          <span>OpenStreetMap</span>
          <span>Municipal Layers</span>
          <span>CartoDB Map</span>
        </div>
      </div>
    </div>
  );
}

export default function MapCanvas({
  loading,
  loadingMessage,
  basemapType,
  onBasemapChange,
  terrainLegend,
  demOpacity,
  onDemOpacityChange,
}) {
  return (
    <section className="dashboard-map-panel">
      <div className="dashboard-map-card">
        <div id="gmc-google-basemap" className="dashboard-map dashboard-map--google" />
        <div id="gmc-dashboard-map" className="dashboard-map dashboard-map--leaflet" />
        <div className="dashboard-map-toolbar">
          <div className="dashboard-map-toolbar__group">
            <span className="dashboard-map-toolbar__label">Base Map</span>
            <div className="dashboard-map-toolbar__tabs">
              {[
                { value: 'satellite', label: 'Satellite' },
                { value: 'osm', label: 'OpenStreetMap' },
                { value: 'cartodb', label: 'CartoDB Map' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`dashboard-map-toolbar__tab${
                    basemapType === option.value ? ' is-active' : ''
                  }`}
                  onClick={() => onBasemapChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {terrainLegend && (
          <div className="dashboard-terrain-control">
            <div className="dashboard-terrain-control__header">
              <div>
                <span className="dashboard-terrain-control__eyebrow">Terrain</span>
                <h3>{terrainLegend.title}</h3>
              </div>
              <span className="dashboard-terrain-control__range">
                {terrainLegend.minLabel} - {terrainLegend.maxLabel}
              </span>
            </div>

            <div className="dashboard-terrain-control__legend">
              <div
                className="dashboard-terrain-control__ramp"
                style={{ background: terrainLegend.gradient }}
                aria-hidden="true"
              />
              <div className="dashboard-terrain-control__ticks">
                {terrainLegend.stops.map((stop) => (
                  <div key={`${terrainLegend.title}-${stop.value}`} className="dashboard-terrain-control__tick">
                    <span>{stop.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <label className="dashboard-terrain-control__slider-shell">
              <div className="dashboard-terrain-control__slider-meta">
                <span>Opacity</span>
                <strong>{Math.round(demOpacity * 100)}%</strong>
              </div>
              <input
                type="range"
                min="0.15"
                max="1"
                step="0.05"
                value={demOpacity}
                className="dashboard-terrain-control__slider"
                onChange={(event) => onDemOpacityChange(Number(event.target.value))}
              />
            </label>
          </div>
        )}
        {loading && <LoadingScreen message={loadingMessage} />}
      </div>
    </section>
  );
}
