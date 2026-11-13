#!/usr/bin/python3
"""Forced SSH command for publishing MyGameList frontend artifacts."""

import fcntl
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time


BASE = Path("/var/www/mygamelist")
CURRENT = BASE / "current"
MAX_BYTES = 32 * 1024 * 1024


def switch(target):
    pending = BASE / ".current-next"
    pending.unlink(missing_ok=True)
    pending.symlink_to(target)
    pending.replace(CURRENT)


def verify(origin, release):
    for attempt in range(3):
        try:
            html = subprocess.check_output(
                ["curl", "-fsS", "--max-time", "8", origin + "/"]
            )
            if html != (release / "index.html").read_bytes():
                raise ValueError("Public HTML differs from the deployed build")
            for asset in re.findall(rb'(?:src|href)="(/assets/[^"]+)"', html):
                path = asset.decode()
                actual = subprocess.check_output(
                    ["curl", "-fsS", "--max-time", "8", origin + path]
                )
                if actual != (release / path.lstrip("/")).read_bytes():
                    raise ValueError(f"Public asset differs: {path}")
            response = subprocess.check_output(
                ["curl", "-fsS", "--max-time", "8", origin + "/api/games?query=Celeste"]
            )
            if not isinstance(json.loads(response).get("content"), list):
                raise ValueError("Catalog API response is invalid")
            return
        except (OSError, ValueError, subprocess.CalledProcessError):
            if attempt == 2:
                raise
            time.sleep(1)


def main():
    command = re.fullmatch(r"deploy ([0-9]{1,20})", os.environ.get("SSH_ORIGINAL_COMMAND", ""))
    if not command or len(sys.argv) != 2:
        raise SystemExit("Expected deploy <build run ID>")
    origin = sys.argv[1]
    with (BASE / ".deploy.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        previous = CURRENT.resolve(strict=True)
        release = Path(tempfile.mkdtemp(prefix=f"{command[1]}-", dir=BASE / "releases"))
        try:
            release.chmod(0o755)
            with tempfile.TemporaryFile() as archive:
                remaining = MAX_BYTES
                while chunk := sys.stdin.buffer.read(65536):
                    remaining -= len(chunk)
                    if remaining < 0:
                        raise ValueError("Compressed build exceeds size limit")
                    archive.write(chunk)
                archive.seek(0)
                with tarfile.open(fileobj=archive, mode="r|gz") as tar:
                    remaining = MAX_BYTES
                    for index, member in enumerate(tar):
                        remaining -= member.size
                        if remaining < 0 or index >= 2000 or not (member.isfile() or member.isdir()):
                            raise ValueError("Unsupported or oversized build archive")
                        # Apply tarfile's traversal checks and safe serving permissions.
                        safe = tarfile.data_filter(member, str(release))
                        if safe is not None and Path(safe.name) != Path("."):
                            safe = safe.replace(mode=0o755 if safe.isdir() else 0o644)
                            tar.extract(safe, release, filter="data")
            if not (release / "index.html").is_file() or not (release / "assets").is_dir():
                raise ValueError("Build must contain index.html and assets/")
            switch(release)
            try:
                verify(origin, release)
            except Exception:
                switch(previous)
                raise
        except Exception:
            shutil.rmtree(release)
            raise
        print(f"Published {release.name}. Previous release: {previous.name}")


if __name__ == "__main__":
    main()
