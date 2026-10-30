"""Permite `python -m herramienta` además del comando instalado."""

from .cli import principal

raise SystemExit(principal())
