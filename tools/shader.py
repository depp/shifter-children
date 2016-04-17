# Copyright 2016 Dietrich Epp.
#
# This file is part of Kitten Teleporter.  The Kitten Teleporter source
# code is distributed under the terms of the MIT license.
# See LICENSE.txt for details.
"""GLSL shader processor."""
import collections
import io
import json
import os
import re
import yaml
from . import build

Shader = collections.namedtuple('Shader', 'text attributes uniforms')

DECL = re.compile(
    r'\s*(attribute|uniform)\s+'
    r'(?:.*\s+)?'
    r'(\w+)'
    r'\s*(?:\[[^]]*\]\s*)?;'
);

EXTS = {'.vert', '.frag'}

def process_glsl(config, path):
    """Process a GLSL shader."""
    with open(path) as fp:
        text = fp.read()
    lines = []
    attributes = []
    uniforms = []
    for line in text.splitlines():
        line = line.strip()
        lines.append(line)
        m = DECL.match(line)
        if m:
            type_, name = m.groups()
            if type_ == 'attribute':
                attributes.append(name)
            else:
                uniforms.append(name)
    return Shader('\n'.join(lines), attributes, uniforms)

def as_list(x):
    if isinstance(x, str):
        return x.split()
    if isinstance(x, list):
        return x
    raise TypeError('not a list or string')

def process_all(config, info_path, shader_paths):
    path_map = {os.path.basename(path): path for path in shader_paths}
    with open(info_path) as fp:
        info = yaml.safe_load(fp)
    shaders = {}
    fp = io.StringIO()
    fp.write(
        '// This file is automatically generated.\n'
        "import * as shader from './shader_defs';\n")
    for name, value in sorted(info.items()):
        slist = {}
        attributes = set()
        uniforms = set()
        for stype in ('vert', 'frag'):
            pshaders = as_list(value[stype])
            for shader in pshaders:
                fname = '{}.{}'.format(shader, stype)
                try:
                    sinfo = shaders[fname]
                except KeyError:
                    sinfo = process_glsl(config, path_map[fname])
                    shaders[fname] = sinfo
                attributes.update(sinfo.attributes)
                uniforms.update(sinfo.uniforms)
            slist[stype] = json.dumps(' '.join(sorted(pshaders)))
        iattr = as_list(value['attributes'])
        if sorted(iattr) != sorted(attributes):
            print('{}: warning: attribute mismatch'.format(name))
            print('{}: expected attributes: {}'
                  .format(name, ' '.join(sorted(attributes))))
        fp.write(
            '\n'
            'export interface {name} extends shader.Program {{\n'
            '{ulines}'
            '}}\n'
            'const {name}Info: shader.ProgramInfo = {{\n'
            '\tname: {jname},\n'
            '\tvert: {vert},\n'
            '\tfrag: {frag},\n'
            '\tunif: {uniforms},\n'
            '\tattr: {attributes},\n'
            '}};\n'
            'export function {fname}'
            '(gl: WebGLRenderingContext, vert: string, frag: string): '
            '{name} {{\n'
            '\treturn <{name}> shader.loadProgram('
            'gl, Sources, {name}Info, vert, frag);\n'
            '}}\n'
            .format(
                name=name + 'Program',
                fname=name[0].lower() + name[1:] + 'Program',
                jname=json.dumps(name),
                vert=slist['vert'],
                frag=slist['frag'],
                uniforms=json.dumps(' '.join(sorted(uniforms))),
                attributes=json.dumps(' '.join(iattr)),
                ulines=''.join('\t{}: WebGLUniformLocation;\n'.format(x)
                               for x in sorted(uniforms)),
            ))
    fp.write('\n')
    fp.write(
        'const Sources: {{ [name: string]: string }} = {};\n'
        .format(json.dumps(
            {k: v.text for k, v in shaders.items()},
            sort_keys=True, indent=2)))
    return fp.getvalue()

if __name__ == '__main__':
    def main():
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        sroot = os.path.join(root, 'shader')
        text = process_all({}, os.path.join(sroot, 'info.yaml'),
                           build.all_files(sroot, exts=EXTS))
        import sys
        sys.stdout.write(text)
    main()