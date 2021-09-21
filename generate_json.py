import json
import logging
import os
import re
import subprocess
from pathlib import Path
from typing import Any

__root = Path(__file__).parent

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class Integer:
    def __set_name__(self, owner, name):
        self.public_name = name
        self.private_name = '_' + name

    def __get__(self, obj, objtype=None):
        return getattr(obj, self.private_name, 0)

    def __set__(self, obj, value):
        setattr(obj, self.private_name, value)


class Pokemon:
    id = Integer()
    name: str = ''
    nice_name: str = ''
    at = Integer()
    df = Integer()
    st = Integer()

    def __init__(self):
        self.evolutions = []

    def __repr__(self):
        return f'Pokemon({vars(self)})'

    def __eq__(self, other):
        return (
            type(self) == type(other)
            and vars(self) == vars(other)
        )

    def __hash__(self):
        return hash('|'.join(f'{k}_{v}' for k, v in vars(self).items()))

    def __json__(self):
        return {
            k[1:] if k.startswith('_') else k: v
            for k, v in vars(self).items()
            if not k.startswith('__')
        }


class PokemonEncoder(json.JSONEncoder):
    def default(self, o: Any) -> Any:
        if type(o) == Pokemon:
            return o.__json__()

        return super().default(o)


class GenerateJSON:
    GAMEMASTER_POKEMON = re.compile(r'^V(\d+)_POKEMON_(.*)$')
    SKIP_THESE_FORMS = [
        re.compile('_PURIFIED$'),
        re.compile('_NORMAL$'),
        re.compile('_SHADOW$'),
        re.compile('_HOME_FORM_REVERSION$'),
        re.compile('HOME_REVERSION$'),
        re.compile(r'_\d+$'),
    ]

    def __init__(self, gamemaster: Path, i18n: Path, images: Path, output: Path):
        self.gamemaster = json.loads(gamemaster.read_text())
        self.images = images

        i18n = json.loads(i18n.read_text(encoding='utf8'))['data']
        self.i18n = {k: v for k, v in zip(i18n[::2], i18n[1::2])}

        self.output = output

    def _get_all_info(self):
        # Find all the pokemons:
        pokemons = set()
        for entry in self.gamemaster:
            match = self.GAMEMASTER_POKEMON.match(entry['templateId'])
            if not match:
                continue

            pm = Pokemon()
            pm.id = int(match.group(1))
            pm.name = match.group(2)

            if any(x.search(pm.name) for x in self.SKIP_THESE_FORMS):
                logger.debug(f'Skip: {pm.name}')
                continue

            try:
                json_data = entry['data']['pokemonSettings']
            except KeyError:
                logger.error(f'{pm.name} has no "pokemonSettings" ??')
                continue

            try:
                pm.at = int(json_data['stats']['baseAttack'])
                pm.df = int(json_data['stats']['baseDefense'])
                pm.st = int(json_data['stats']['baseStamina'])
            except KeyError:
                logger.debug(f'key missing: {pm}')
                continue

            pm.nice_name = pm.name.title().replace('_', ' ')

            try:
                for tmp in json_data['evolutionBranch']:
                    tmp = tmp.copy()
                    del tmp['form']

                    pm.evolutions.append(tmp)
            except KeyError:
                pass

            pokemons.add(pm)

        # Sort the result by id and name
        return sorted(list(pokemons), key=lambda x: (x.id, x.name))

    def _get_settings(self):
        info = {}

        for entry in self.gamemaster:
            if entry['templateId'] == 'PLAYER_LEVEL_SETTINGS':
                info['player'] = entry['data']['playerLevel']
            elif entry['templateId'] == 'WEATHER_BONUS_SETTINGS':
                info['weather'] = entry['data']['weatherBonusSettings']
            elif entry['templateId'] == 'POKEMON_UPGRADE_SETTINGS':
                info['upgrades'] = entry['data']['pokemonUpgrades']

        return info

    def run(self):
        logging.info('Getting all info')
        pokemons = self._get_all_info()
        logging.info('Getting all settings')
        settings = self._get_settings()
        logging.info('Writing out all text')
        self.output.write_text(
            json.dumps(
                {'pms': pokemons, 'settings': settings},
                indent=2,
                cls=PokemonEncoder
            )
        )
        logging.info('Converting images')
        self._convert_images()

    def _convert_images(self):
        output_dir = self.output.parent / 'images'

        old_files = set(x.relative_to(output_dir) for x in output_dir.rglob('*.png'))

        for img in self.images.rglob('*.png'):
            relative_path = img.relative_to(self.images)
            if relative_path in old_files:
                continue

            new_path = output_dir / relative_path
            new_path.parent.mkdir(exist_ok=True, parents=True)

            logger.info('Converting %s', img.absolute())
            subprocess.run(["convert", str(img.absolute()), '-resize', '128x128', '-background', 'none', '-gravity', 'center', '-extent', '128x128x4', new_path])


if __name__ == '__main__':
    # git submodule init
    # git submodule update --recursive --remote
   
    os.chdir(__root)
    logging.info('Updating submodules from git')
    os.system('git submodule update --recursive --remote')

    GenerateJSON(
        __root / 'pokeminers_gamemaster/latest/latest.json',
        __root / 'pokeminers_pogoassets/Texts/Latest APK/JSON/i18n_english.json',
        __root / 'pokeminers_pogoassets/Images/Pokemon',
        __root / 'pokemon_information.json',
    ).run()
    logging.info('All done')
