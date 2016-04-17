# Copyright 2016 Dietrich Epp.
#
# This file is part of Kitten Teleporter.  The Kitten Teleporter source
# code is distributed under the terms of the MIT license.
# See LICENSE.txt for details.
import yaml
from mako import template

CONFIG_DEFAULT = '''\
---
# Local configuration, not checked into source control.
'''

class ConfigError(Exception):
    pass

def fset(s):
    return ', '.join(repr(x) for x in s)

class Config(object):
    __slots__ = [
        'config',
        'env',
        'defs',
        'debug',
        'server_host',
        'server_port',
    ]

    @classmethod
    def load(class_, action, config):
        """Load the project configuration."""
        paths = [
            ('tools/base.yaml', False),
            ('config.yaml', False),
            ('config_local.yaml', True),
        ]
        infos = []
        valid_keys = {'configs', 'server', 'default', 'config', 'env'}
        for path, create in paths:
            try:
                with open(path) as fp:
                    info = yaml.safe_load(fp)
            except FileNotFoundError:
                if not create:
                    raise ConfigError('Missing config file: {}'.format(path))
                print('Creating {}'.format(path))
                with open(path, 'w') as fp:
                    fp.write(CONFIG_DEFAULT)
            else:
                if not info:
                    continue
                extra = set(info.keys()).difference(valid_keys)
                if extra:
                    raise ConfigError(
                        '{}: Unknown keys: {}.'.format(path, fset(extra)))
                infos.append(info)

        default = {}
        configs = None
        all_configs = {'base'}
        server = {}
        env = []
        for info in infos:
            try:
                configs = info['configs']
                all_configs.update(configs)
            except KeyError:
                pass
            try:
                server.update(info['server'])
            except KeyError:
                pass
            try:
                default.update(info['default'])
            except KeyError:
                pass
            try:
                env = info['env']
            except KeyError:
                pass

        if configs is None:
            raise ConfigError('Missing configs key.')
        configs = set(configs)

        valid_server = {'host', 'port'}
        extra = set(server.keys()).difference(valid_server)
        if extra:
            raise ConfigError('Unknown server flag: {}.'.format(fset(extra)))

        valid_actions = {'serve', 'build', 'package', 'deploy'}
        extra = set(default.keys()).difference(valid_actions)
        if extra:
            raise ConfigError('Unknown actions: {}.'.format(fset(extra)))

        if config is None:
            if action is None:
                raise ConfigError('No config and no action.')
            try:
                config = default[action]
            except KeyError:
                raise ConfigError('No default config for action {}.'
                                  .format(action))

        if config not in configs:
            raise ConfigError('Invalid config: {!r}.'.format(config))

        self = class_()
        self.config = config
        self.env = env
        self.defs = {}
        keys = ['base', config]
        for info in infos:
            try:
                iconfig = info['config']
            except KeyError:
                continue
            for key in keys:
                try:
                    kconfig = iconfig[key]
                except KeyError:
                    continue
                if kconfig:
                    self.defs.update(kconfig)
        self.debug = self.defs['debug']
        self.server_host = server['host']
        self.server_port = server['port']
        return self

    def render(self, **kw):
        """Render the config dictionary."""
        expanded = {'title', 'js_header', 'instructions'}
        context = dict(kw)
        context.update({key: value for key, value in self.defs.items()
                        if key not in expanded})
        context['config'] = self.config
        result = dict(context)
        for key in expanded:
            text = self.defs[key]
            try:
                result[key] = template.Template(text).render(**context)
            except:
                print('Could not evaluate template:')
                for line in text.splitlines():
                    print('    ' + line)
                raise
        env = {}
        for key in self.env:
            env[key] = result[key]
        result['env'] = env
        return result

    def dump(self, **kw):
        print('Configuration:')
        for name, value in sorted(self.render(**kw).items()):
            if isinstance(value, str):
                print('  {}:'.format(name))
                for line in value.splitlines():
                    print('    {}'.format(line))
            else:
                print('  {}: {!r}'.format(name, value))

if __name__ == '__main__':
    import sys
    Config.load(None, sys.argv[1]).dump(version='v0.0.0')
