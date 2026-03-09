"""설정 파일 로더"""

from pathlib import Path
from typing import Any

import yaml


def load_config(path: str = "config.yaml") -> dict[str, Any]:
    """config.yaml을 로드하여 딕셔너리로 반환한다."""
    config_path = Path(path)
    if not config_path.exists():
        # 프로젝트 루트에서 찾기
        root = Path(__file__).parent.parent / "config.yaml"
        if root.exists():
            config_path = root
        else:
            raise FileNotFoundError(f"설정 파일을 찾을 수 없음: {path}")

    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)
