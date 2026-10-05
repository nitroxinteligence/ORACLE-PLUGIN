"""One publisher configuration shared by the portable packagers."""
import json
from pathlib import Path
PINS = json.loads((Path(__file__).resolve().parents[1] / 'Resources/updates/portable-upstream.json').read_text())
if PINS.get('schemaVersion') != 1:
    raise ValueError('Unsupported portable upstream configuration')
