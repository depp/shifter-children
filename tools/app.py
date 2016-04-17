# Copyright 2015-2016 Dietrich Epp.
#
# This file is part of Kitten Teleporter.  The Kitten Teleporter source
# code is distributed under the terms of the MIT license.
# See LICENSE.txt for details.
from . import build
from . import shader
from . import version
from mako import template
import io
import json
import os
import re
import tempfile

class App(object):
    __slots__ = ['config', 'system']

    def __init__(self, config, system):
        self.config = config
        self.system = system

    def build(self):
        """Build (or rebuild) the application."""
        ver = version.get_version('.')
        self.system.version = ver
        config = self.config.render(version=ver)
        del ver

        shaderinfo = 'shader/info.yaml'
        shaders = list(build.all_files('shader', exts={'.vert', '.frag'}))
        self.system.build(
            'src/shader.ts',
            self.shaders,
            args=(shaderinfo, shaders),
            deps=shaders + [shaderinfo])
        del shaders, shaderinfo

        assets = {}
        with open('assets/images/fonts.json') as fp:
            assets['fonts'] = json.load(fp)
        with open('assets/images/sprites.json') as fp:
            assets['sprites'] = json.load(fp)
        self.build_images(assets, 'images', 'images')

        # Top-level scripts.
        scripts = [
            self.system.build_module(
                'build/lodash.js',
                'lodash-cli',
                self.lodash_js),
            self.system.build_module(
                'build/howler.js',
                'howler',
                self.howler_js),
            self.system.build_module(
                'build/gl-matrix.js',
                'gl-matrix',
                self.gl_matrix_js),
        ]
        if not self.config.debug:
            self.system.mark_intermediate(scripts)
            scripts = [self.system.build(
                'build/lib.js',
                self.lib_js,
                args=(scripts,),
                bust=True)]
        scripts.append(
            self.system.build(
                'build/app.js',
                self.app_js,
                args=(None if self.config.debug else config['js_header'],
                      config['env']),
                deps=list(build.all_files('src', exts={'.ts'})),
                bust=True))
        scripts.append(
            self.system.build(
                'build/assets.js',
                self.assets_js,
                args=(json.dumps(assets, indent=2, sort_keys=True),),
                bust=True))

        # Top-level index.html file.
        self.system.build(
            'build/index.html',
            self.index_html,
            deps=[
                'static/index.mak',
                'static/style.css',
                'static/load.js',
            ],
            args=(scripts, config))

    def build_images(self, assets, dirname, keyname):
        """Build images in a certain directory."""
        images = {}
        in_root = os.path.join('assets', dirname)
        out_root = os.path.join('build', dirname)
        for path in build.all_files(in_root, exts={'.png', '.jpg'}):
            relpath = os.path.relpath(path, in_root)
            name = os.path.splitext(relpath)[0]
            out_path = self.system.copy(
                os.path.join(out_root, relpath),
                path,
                bust=True)
            out_rel = os.path.relpath(out_path, out_root)
            images[name] = out_rel
        assets[keyname] = images

    def shaders(self, info_path, paths):
        """Get the contents of the shader module."""
        return (shader.process_all(self.config, info_path, paths)
                .encode('UTF-8'))

    def lodash_js(self):
        """Get the contents of the lodash.js package."""
        with tempfile.TemporaryDirectory() as path:
            build.run_pipe(
                ['./node_modules/.bin/lodash',
                 'strict', '-o', os.path.join(path, 'lodash.js')])
            with open(os.path.join(path, 'lodash.min.js'), 'rb') as fp:
                data = fp.read()
        data = re.sub(rb' *-o /.*\.js', b'', data, count=1)
        return data

    def howler_js(self):
        """Get the contents of the howler.js package."""
        with open('./node_modules/howler/howler.min.js', 'rb') as fp:
            return fp.read()

    def gl_matrix_js(self):
        """Get the contents of the gl-matrix.js package."""
        with open('node_modules/gl-matrix/dist/gl-matrix-min.js', 'rb') as fp:
            return fp.read()

    def lib_js(self, libs):
        """Combine many external libraries into one file."""
        fp = io.BytesIO()
        fp.write(
            '// Contains: {}\n'
            .format(', '.join(os.path.basename(lib) for lib in libs))
            .encode('ASCII'))
        for lib in libs:
            with open(lib, 'rb') as lfp:
                fp.write(lfp.read())
            fp.write(b'\n')
        return fp.getvalue()

    def app_js(self, js_header, env):
        """Get the contents of the main application JavaScript code."""
        appjs = './build/app.js'
        build.compile_ts(self.config, 'src/tsconfig.json')
        build.browserify(
            self.config, './build/app.js', ['./build/tsc/app.js'], env)
        with open('./build/app.js', 'rb') as fp:
            data = fp.read()
        data = build.minify_js(self.config, data)
        if not self.config.debug:
            fp = io.StringIO()
            fp.write('/*\n')
            for line in js_header.splitlines():
                fp.write((' * ' + line).rstrip() + '\n')
            fp.write(' */\n')
            data = fp.getvalue().encode('UTF-8') + data
        return data

    def assets_js(self, assets):
        """Get the contents of the assets.js file."""
        return build.minify_js(
            self.config,
            'window.AssetInfo = {}\n'.format(assets).encode('UTF-8'))

    def index_css(self):
        """Get the main CSS styles."""
        with open('static/style.css', 'rb') as fp:
            data = fp.read()
        return build.minify_css(self.config, data).decode('UTF-8')

    def index_js(self, scripts):
        """Get the JavaScript loader code."""
        with open('static/load.js') as fp:
            data = fp.read()
        scripts = [os.path.relpath(path, 'build/') for path in scripts]
        return build.minify_js(
            self.config,
            data.replace(
                'var SCRIPTS = [];',
                'var SCRIPTS = {};'.format(
                    json.dumps(scripts, separators=(',', ':'))))
            .encode('UTF-8')).decode('UTF-8')

    def index_html(self, scripts, config):
        """Get the main HTML page."""
        def relpath(path):
            return os.path.relpath(path, 'build/')
        tmpl = template.Template(filename='static/index.mak')
        cxt = dict(config)
        cxt.update(
            relpath=relpath,
            scripts=scripts,
            css_data=self.index_css(),
            js_data=self.index_js(scripts),
        )
        data = tmpl.render(**cxt)
        return build.minify_html(self.config, data.encode('UTF-8'))
