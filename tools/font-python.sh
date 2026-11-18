#!/bin/sh
# Run the font tools in a private virtual environment that follows tools/requirements-fonts.txt.
set -eu
venv="node_modules/.cache/font-tools"
if [ ! -f "$venv/.installed" ] || [ tools/requirements-fonts.txt -nt "$venv/.installed" ]; then
  python3 -m venv "$venv"
  "$venv/bin/python" -m pip install --quiet --disable-pip-version-check -r tools/requirements-fonts.txt
  touch "$venv/.installed"
fi
exec "$venv/bin/python" "$@"
