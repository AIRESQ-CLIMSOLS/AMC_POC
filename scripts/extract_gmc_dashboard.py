from pathlib import Path
import re


workspace_root = Path.cwd()
output_dir = workspace_root / "public" / "generated"
dist_generated_dir = workspace_root / "dist" / "generated"

CITY_DASHBOARDS = [
    {
        "id": "gmc",
        "source": "GMC_Dashboard_mirlab.html",
        "output": "gmcDashboardInit.js",
        "initializer": "initializeCityDashboard_gmc",
    },
]


def extract_dashboard(source_file: Path, initializer_name: str) -> str:
    html = source_file.read_text(encoding="utf-8")
    match = re.search(r"</body>\s*<script>([\s\S]*?)</script>\s*</html>\s*$", html, re.IGNORECASE)

    if not match:
        raise RuntimeError(f"Unable to locate the Folium map initialization script in {source_file.name}.")

    original_script = match.group(1).strip()
    map_variable_match = re.search(r"var\s+([A-Za-z0-9_]+)\s*=\s*L\.map\(", original_script)
    layer_control_variable_match = re.search(
        r"let\s+([A-Za-z0-9_]+)\s*=\s*L\.control\.layers\(",
        original_script,
    )
    base_tile_layer_match = re.search(r"var\s+([A-Za-z0-9_]+)\s*=\s*L\.tileLayer\(", original_script)

    if not map_variable_match or not layer_control_variable_match or not base_tile_layer_match:
        raise RuntimeError(
            f"Unable to identify the map, layer control, or base tile layer variables in {source_file.name}."
        )

    map_variable_name = map_variable_match.group(1)
    layer_control_variable_name = layer_control_variable_match.group(1)
    base_tile_layer_name = base_tile_layer_match.group(1)
    adapted_script = re.sub(
        r'L\.map\(\s*"[^"]+"\s*,',
        'L.map(\n                mapContainerId,',
        original_script,
        count=1,
    )

    return f"""/* eslint-disable */
// Auto-generated from {source_file.name}.
// This file preserves the original Folium/Leaflet map data and initialization logic.

window.{initializer_name} = function {initializer_name}(mapContainerId) {{
  if (!window.L) {{
    throw new Error('Leaflet must be loaded before initializing the city dashboard.');
  }}

  if (!window.$) {{
    throw new Error('jQuery must be loaded before initializing the city dashboard.');
  }}

{adapted_script}

  return {{
    map: {map_variable_name},
    layerControl: {layer_control_variable_name},
    baseTileLayer: {base_tile_layer_name},
  }};
}};
"""


output_dir.mkdir(parents=True, exist_ok=True)

for city in CITY_DASHBOARDS:
    source_file = workspace_root / city["source"]
    output_file = output_dir / city["output"]
    if source_file.exists():
        generated_output = extract_dashboard(source_file, city["initializer"])
        output_file.write_text(generated_output, encoding="utf-8")
        print(f"Generated {output_file.relative_to(workspace_root)}")
        continue

    dist_output_file = dist_generated_dir / city["output"]
    if dist_output_file.exists():
        output_file.write_text(dist_output_file.read_text(encoding="utf-8"), encoding="utf-8")
        print(
            f"Copied {dist_output_file.relative_to(workspace_root)} to "
            f"{output_file.relative_to(workspace_root)} because {source_file.name} is not present."
        )
        continue

    if output_file.exists():
        print(
            f"Using existing {output_file.relative_to(workspace_root)} because {source_file.name} is not present."
        )
        continue

    raise FileNotFoundError(
        f"[Errno 2] No such file or directory: '{source_file}'. "
        f"Expected {source_file.name} or {dist_output_file.relative_to(workspace_root)}."
    )
