# Copyright 2015-2016 Dietrich Epp.
#
# This file is part of Kitten Teleporter.  The Kitten Teleporter source
# code is distributed under the terms of the MIT license.
# See LICENSE.txt for details.
import argparse
import yaml
from . import app
from . import build
from . import config
from . import slow

def run():
    p = argparse.ArgumentParser()
    p.add_argument('action', choices=(
        'build', 'serve', 'package', 'deploy'))
    p.add_argument('config', nargs='?')
    p.add_argument('--rate', type=slow.parse_rate)
    p.add_argument('-v', '--verbose', action='store_true')
    args = p.parse_args()

    try:
        cfg = config.Config.load(args.action, args.config)
        if args.verbose:
            cfg.dump(version='v0.0.0')
    except config.ConfigError as ex:
        print(ex)
        raise SystemExit(1)
    system = build.BuildSystem()
    try:
        obj = app.App(cfg, system)
        obj.build()
        if args.action == 'serve':
            from . import serve
            serve.serve(cfg, obj, rate=args.rate)
        elif args.action == 'package':
            version = system.version
            assert version.startswith('v')
            out_path = '{}-{}.tar.gz'.format(cfg.defs['name'], version[1:])
            print('=' * 40)
            print('Done building, creating {}...'.format(out_path))
            system.package(out_path, 'build')
            print('Created {}'.format(out_path))
        elif args.action == 'deploy':
            pass
    except build.BuildFailure as ex:
        print('Build failed: {}'.format(ex))

if __name__ == '__main__':
    run()
