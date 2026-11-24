"""Build the local UI font subsets with fonttools 4.61.1."""

import argparse
import hashlib
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_SHA256 = {
    'regular': '8a07213b51a7c5a61d7ce192728f21483cdbbcb9c74cedf461c57ab35a762d45',
    'medium': 'cd74e7f4f293cc70e022227ce4b1143c5dd6c71ad1d42979e95d4e4c3b379cdc',
}
RUNTIME_NAMES = {'regular': 'TaoyuanWenkaiR1', 'medium': 'TaoyuanWenkaiM1'}


def pack(source: Path, weight: str, codes: set[int]) -> None:
    if hashlib.sha256(source.read_bytes()).hexdigest() != SOURCE_SHA256[weight]:
        raise ValueError(f'Unexpected upstream font revision: {source}')
    with TTFont(source, recalcTimestamp=False) as font:
        missing = codes - font.getBestCmap().keys()
        if missing:
            raise ValueError(f'Upstream font lacks {" ".join(map(chr, sorted(missing)))}')
        options = subset.Options()
        options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
        options.name_languages = [0x409]
        options.recalc_max_context = True
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=codes)
        subsetter.subset(font)

        # Keep both faces distinct and use one space-free name across native lookups.
        # These are project-specific OFL derivative names.
        runtime_name = RUNTIME_NAMES[weight]
        names = {1: runtime_name, 2: 'Regular', 3: runtime_name, 4: runtime_name, 6: runtime_name}
        for name_id, value in names.items():
            font['name'].setName(value, name_id, 3, 1, 0x409)
            font['name'].setName(value, name_id, 1, 0, 0)
        target = ROOT / 'assets' / 'hero-menu' / f'taoyuan-ui-{weight}.ttf'
        font.save(target)
        print(f'{target.name} {len(codes)} code points, {target.stat().st_size} bytes')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_dir', type=Path, help='Directory containing the pinned regular.ttf and medium.ttf')
    args = parser.parse_args()
    codes = set(range(0x20, 0x7F))
    for path in (ROOT / 'assets' / 'scripts').rglob('*.ts'):
        codes.update(ord(char) for char in path.read_text(encoding='utf-8') if ord(char) >= 0xA0)
    for weight in SOURCE_SHA256:
        pack(args.source_dir / f'{weight}.ttf', weight, codes)


if __name__ == '__main__':
    main()
