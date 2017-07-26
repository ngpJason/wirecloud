#!/usr/bin/env python
# -*- coding: utf-8 -*-

# Copyright (c) 2012-2017 CoNWeT Lab., Universidad Politécnica de Madrid

# This file is part of Wirecloud.

# Wirecloud is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# Wirecloud is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.

# You should have received a copy of the GNU Affero General Public License
# along with Wirecloud.  If not, see <http://www.gnu.org/licenses/>.

from distutils.cmd import Command
from distutils.command.install import INSTALL_SCHEMES
import os
import re
from setuptools import setup
import subprocess
from distutils.command.build import build as distutils_build
from setuptools.command.build_py import build_py
from setuptools.command.install import install as setuptools_install
from setuptools.command.sdist import sdist as setuptools_sdist

import wirecloud.platform

class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'

    def disable(self):
        self.HEADER = ''
        self.OKBLUE = ''
        self.OKGREEN = ''
        self.WARNING = ''
        self.FAIL = ''
        self.ENDC = ''


def git_version():
    def _minimal_ext_cmd(cmd):
        # construct minimal environment
        env = {}
        for k in ['SYSTEMROOT', 'PATH', 'HOME']:
            v = os.environ.get(k)
            if v is not None:
                env[k] = v
        # LANGUAGE is used on win32
        env['LANGUAGE'] = 'C'
        env['LANG'] = 'C'
        env['LC_ALL'] = 'C'
        out = subprocess.Popen(cmd, stdout = subprocess.PIPE, env=env).communicate()[0]
        return out

    import ipdb; ipdb.sset_trace()
    # Check if this working copy is dirty
    try:
        out = _minimal_ext_cmd(['git', 'status', '--porcelain'])
        GIT_DIRTY = out.strip().decode('ascii').strip() != ""
    except OSError:
        GIT_DIRTY = True

    # Get current commit hash
    try:
        out = _minimal_ext_cmd(['git', 'rev-parse', 'HEAD'])
        GIT_REVISION = out.strip().decode('ascii')
    except OSError:
        GIT_REVISION = "Unknown"

    # Check if HEAD points to a release commit
    IS_RELEASE = False
    release_tag = 'v' + wirecloud.platform.__version__
    try:
        out = _minimal_ext_cmd(['git', 'tag', '-l', '--points-at', 'HEAD'])
        tags = out.strip().decode('ascii').splitlines()
        IS_RELEASE = release_tag in tags
    except OSError:
        pass


    # Provide a release date if this is a released version
    RELEASE_DATE = "Unknown"
    if IS_RELEASE and not GIT_DIRTY:
        try:
            out = _minimal_ext_cmd(['git', 'log', '-1', '--date=short', '--pretty=format:%cd'])
            RELEASE_DATE = out.strip().decode('ascii')
        except OSError:
            pass


    return GIT_REVISION, RELEASE_DATE, GIT_DIRTY


def add_git_metadata(base_dir):

    GIT_REVISION, RELEASE_DATE, GIT_DIRTY = git_version()

    with open(os.path.join(base_dir, 'wirecloud/platform/__init__.py'), "a") as f:
        f.write('__git_hash__ = "%s"\n__git_dirty__ = %s\n__release_date__ = "%s"\n' % (GIT_REVISION, GIT_DIRTY, RELEASE_DATE))


class build_wirecloud(build_py):

    def run(self):

        add_git_metadata(self.build_lib)

        # distutils uses old-style classes, so no super()
        build_py.run(self)


class build(distutils_build):

    """Customized setuptools build command - compile po files before creating the distribution package."""

    sub_commands = [('compiletranslations', None)] + distutils_build.sub_commands


class sdist(setuptools_sdist):

    """
    Customized setuptools sdist command

    - compile po files before creating the distribution package.
    - add git metadata into wirecloud/platform/__init__.py
    """

    def make_release_tree(self, base_dir, files):
        setuptools_sdist.make_release_tree(self, base_dir, files)

        add_git_metadata(base_dir)

    sub_commands = [('compiletranslations', None)] + setuptools_sdist.sub_commands


class compiletranslations(Command):

    description = 'compile message catalogs to MO files via django compilemessages'
    user_options = []

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def run(self):

        try:
            from django.core.management import call_command
        except:
            import pip
            pip.main(['install', 'Django>=1.8,<1.12'])

            from django.core.management import call_command

        oldwd = os.getcwd()
        wirecloud_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'wirecloud'))
        for subpath in os.listdir(wirecloud_path):
            current_path = os.path.join(wirecloud_path, subpath)
            if os.path.isdir(os.path.join(current_path, 'locale')):
                os.chdir(current_path)
                try:
                    call_command('compilemessages')
                except Exception as e:
                    print('Error compiling translations for module %(module)s: %(error)s' % {'module': subpath.replace('/', '.'), 'error': e})

        os.chdir(oldwd)


class install(setuptools_install):

    """Customized setuptools install command - prints info about the license of WireCloud after installing it."""
    def run(self):
        setuptools_install.run(self)

        print('')
        print(bcolors.HEADER + 'License' + bcolors.ENDC)
        print('')
        print("WireCloud is licensed under a AGPLv3+ license with a classpath-like exception \n" +
              "that allows widgets/operators and mashups to be licensed under any propietary or \n" +
              "open source license.")
        print('')
        license_file = os.path.join(self.install_purelib, 'wirecloud', 'LICENSE')
        print('A copy of the license has been installed at: ' + bcolors.WARNING + license_file + bcolors.ENDC)


for scheme in INSTALL_SCHEMES.values():
    scheme['data'] = scheme['purelib']


setup(
    name='wirecloud',
    version=wirecloud.platform.__version__,
    description='Widgets Container and Mashup edition tools for composing end-user centric mashup applications.',
    long_description='',
    author='CoNWeT Lab',
    author_email='wirecloud@conwet.com',
    url='http://github.com/Wirecloud/wirecloud',
    license='AGPLv3+ with classpath-like exception',
    packages=('wirecloud',),
    entry_points={
        'console_scripts': (
            'wirecloud-admin = wirecloud.commons.wirecloud_admin:execute_from_command_line',
        ),
    },
    include_package_data=True,
    install_requires=(
        'Django>=1.8,<1.12',
        'lxml>=2.3',
        'django-appconf>=1.0.1,<2.0',
        'django_compressor>=2.0,<3.0',
        'rdflib>=3.2.0',
        'requests>=2.1.0',
        'selenium>=2.41',
        'pytz',
        'django_relatives',
        'user-agents',
        'regex',
        'markdown',
        'whoosh>=2.7.2',
        'pycrypto',
        'pyScss>=1.3.4,<2.0',
        'Pygments',
        'pillow',
        'jsonpatch',
    ),
    extras_require={
        ":python_version < '3.2'": ('futures>=2.1.3',),
    },
    tests_require=(
        'django-nose',
        'mock>=1.0,<2.0',
    ),
    setup_requires={
        'wheel>=0.24',
    },
    classifiers=(
        'Development Status :: 5 - Production/Stable',
        'Environment :: Web Environment',
        'Framework :: Django',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: GNU Affero General Public License v3 or later (AGPLv3+)',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
        'Programming Language :: JavaScript',
        'Topic :: Software Development :: Libraries :: Python Modules',
    ),
    cmdclass={
        'build': build,
        'build_py': build_wirecloud,
        'install': install,
        'sdist': sdist,
        'compiletranslations': compiletranslations
    },
)
