# Copyright 2015-2016 Dietrich Epp.
#
# This file is part of Kitten Teleporter.  The Kitten Teleporter source
# code is distributed under the terms of the MIT license.
# See LICENSE.txt for details.
import base64
import collections
import hashlib
import json
import os
import pipes
import subprocess
import sys

class BuildFailure(Exception):
    pass

def nbin(name):
    """Get the path to a binary installed with NPM."""
    return os.path.join('./node_modules/.bin', name)

def all_files(root, *, exts=None):
    """List all files below the given root."""
    if exts is not None:
        if not exts:
            return
        exts = set(exts)
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [x for x in dirnames
                       if not x.startswith('.')]
        for filename in filenames:
            if filename.startswith('.'):
                continue
            if exts:
                ext = os.path.splitext(filename)[1]
                if ext not in exts:
                    continue
            yield os.path.join(dirpath, filename)

def latest_mtime(files):
    """Get the latest modification timestamp of the given files."""
    mtime = -1
    for file in files:
        mtime = max(mtime, os.stat(file).st_mtime)
    return mtime

def format_cmd(cmd, *, cwd=None):
    parts = []
    if cwd is not None:
        parts.append('cd {};'.format(pipes.quote(cwd)))
    parts.append(pipes.quote(os.path.basename(cmd[0])))
    for arg in cmd[1:]:
        parts.append(pipes.quote(arg))
    return ' '.join(parts)

def run_cmd(cmd, *, cwd=None):
    """Run a simple command."""
    print('    ' + format_cmd(cmd, cwd=cwd), file=sys.stderr)
    proc = subprocess.Popen(cmd, cwd=cwd)
    proc.wait()
    if proc.returncode != 0:
        raise BuildFailure('Command failed: {}'.format(cmd[0]))

def run_pipe(cmd, data=None, *, cwd=None):
    """Pipe data through a single command."""
    print('    ' + format_cmd(cmd, cwd=cwd), file=sys.stderr)
    proc = subprocess.Popen(
        cmd,
        stdin=None if data is None else subprocess.PIPE,
        stdout=subprocess.PIPE,
        cwd=None)
    stdout, stderr = proc.communicate(data)
    if proc.returncode != 0:
        raise BuildFailure('Command failed: {}'.format(cmd[0]))
    return stdout

CachedFile = collections.namedtuple('CachedFile', 'path fhash key intermediate')

def sort_key(path):
    base, ext = os.path.splitext(path)
    return ext, base

class BuildSystem(object):
    """The application build system."""
    __slots__ = [
        # Map of all build files.
        'cache',
        # Version of most recent build.
        'version',
    ]

    def __init__(self):
        self.cache = {}
        self.version = None

    def copy(self, path, src, *, bust=False):
        """Copy a file and return the path."""
        def get_data():
            with open(src, 'rb') as fp:
                return fp.read()
        return self.build(path, get_data, deps=[src], bust=bust)

    def write(self, path, data, *, bust=False):
        """Write data and return the path."""
        return self.build(path, lambda x: x, args=[data], bust=bust)

    def build(self, path, builder, *,
              deps=[], args=(), kw={}, bust=False, intermediate=False):
        """Build a file and return the corrected path."""
        mtime = latest_mtime(deps)
        key = mtime, args, kw
        try:
            cached = self.cache[path]
        except KeyError:
            cached = None
        else:
            if key == cached.key:
                return cached.path
        print('Rebuilding {}'.format(path), file=sys.stderr)
        data = builder(*args, **kw)
        obj = hashlib.new('SHA256')
        obj.update(data)
        fhash = obj.digest()
        if cached is not None and cached.fhash == fhash:
            return cached.path
        dirname, basename = os.path.split(path)
        if bust:
            out_name = '{0[0]}.{1}{0[1]}'.format(
                os.path.splitext(basename),
                base64.b16encode(fhash)[:8].lower().decode('UTF-8'))
            out_path = os.path.join(dirname, out_name)
        else:
            out_path = path
        cached = CachedFile(out_path, fhash, key, intermediate)
        if dirname:
            os.makedirs(dirname, exist_ok=True)
        with open(out_path, 'wb') as fp:
            fp.write(data)
        self.cache[path] = cached
        return out_path

    def build_module(self, path, name, builder, *, intermediate=False):
        """Build a file from an NPM module."""
        with open(os.path.join('node_modules', name, 'package.json')) as fp:
            data = json.load(fp)
        version = data['version']
        dirname, basename = os.path.split(path)
        out_name = '{0[0]}-{1}{0[1]}'.format(
            os.path.splitext(basename), version)
        out_path = os.path.join(dirname, out_name)
        if not os.path.isfile(out_path):
            data = builder()
            if dirname:
                os.makedirs(dirname, exist_ok=True)
            with open(out_path, 'wb') as fp:
                fp.write(data)
        self.cache[out_path] = CachedFile(out_path, None, None, intermediate)
        return out_path

    def files(self, root):
        """Get a list of all files in the build system below the given root."""
        if root and not root.endswith('/'):
            root += '/'
        files = []
        for c in self.cache.values():
            if not c.intermediate and c.path.startswith(root):
                files.append(c.path[len(root):])
        return files

    def package(self, out_path, root):
        """Create a package for all of the files below the given root"""
        files = self.files(root)
        if not files:
            raise BuildFailure('No files')
        files.sort(key=sort_key)
        try:
            with open(out_path, 'wb') as fp:
                subprocess.check_call(['tar', 'cvz'] + files,
                                      stdout=fp, cwd=root)
        except:
            try:
                os.unlink(out_path)
            except FileNotFoundError:
                pass
            raise

    def mark_intermediate(self, paths):
        for path in paths:
            self.cache[path] = self.cache[path]._replace(intermediate=True)

def compile_ts(config, tsconfig):
    """Compile TypeScript files."""
    cmd = [nbin('tsc'), '-p', tsconfig]
    run_cmd(cmd)

def browserify(config, output, modules, env):
    """Bundle a JavaScript application using browserify."""
    dirname, outname = os.path.split(output)
    dirname = dirname or '.'
    cmd = [
        os.path.abspath(nbin('browserify')),
        '-o', outname,
    ]
    if config.debug:
        cmd.append('--debug')
    if env:
        cmd.extend(('-t', '[', 'envify'))
        for key, value in env.items():
            cmd.extend(('--' + key.upper(), value))
        cmd.append(']')
    cmd.extend(os.path.relpath(module, dirname) for module in modules)
    run_cmd(cmd, cwd=dirname)
    if config.debug:
        cmd = [
            nbin('sorcery'),
            '--datauri',
            '--input', output
        ]
        run_cmd(cmd)

def minify_js(config, data):
    """Minify a JavaScript document."""
    if config.debug:
        return data
    cmd = [
        nbin('uglifyjs'),
        '--mangle',
        '--compress',
    ]
    return run_pipe(cmd, data)

def minify_css(config, data):
    """Minify a CSS document."""
    if config.debug:
        return data
    cmd = [
        nbin('cleancss'),
    ]
    return run_pipe(cmd, data)

def minify_html(config, data):
    """Minify an HTML document."""
    if config.debug:
        return data
    cmd = [
        nbin('html-minifier'),
        '--collapse-whitespace',
    ]
    return run_pipe(cmd, data)

def minify_json(config, path):
    """Minify a JSON document."""
    with open(path) as fp:
        obj = json.load(fp)
    obj = json.dumps(obj, separators=(',', ':'), sort_keys=True)
    return obj.encode('UTF-8')

def dump_json(config, obj, *, pretty=False):
    """Dump JSON in the configured format.

    The indent parameter should be true or false.
    """
    if config.debug:
        indent = 2
        separators = ', ', ': '
    else:
        indent = None
        separators = ',', ':'
    s = json.dumps(obj, indent=indent, separators=separators, sort_keys=True)
    return s.encode('UTF-8')
