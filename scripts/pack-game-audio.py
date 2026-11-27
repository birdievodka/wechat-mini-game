#!/usr/bin/env python3
"""Compatibility entry point for the current offline SFX packer."""
from pathlib import Path
import subprocess

subprocess.run(
    ["node", str(Path(__file__).with_name("pack-plinkfx-audio.mjs"))],
    check=True,
)
