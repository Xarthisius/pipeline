#!/usr/bin/env python
# manage.py
from flaskext.script import Manager

from application import app

manager = Manager(app)

@manager.command
def cleanup():
    print "TODO: celan orphaned files in tmp/uploads|downloads"

if __name__ == "__main__":
    manager.run()