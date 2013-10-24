# -*- coding: utf-8 -*-

from flask import (Flask, render_template, request, jsonify)

import jinja2

from modelconvert.extensions import celery
from modelconvert.frontend import frontend
from modelconvert.api import api

from modelconvert import settings


# -- App setup --------------------------------------------------------------
def create_app():
    """Create the Flask app."""

    app = Flask("modelconvert", static_folder=None)
    
    app.config.from_object('modelconvert.settings')
    app.config.from_envvar('MODELCONVERT_SETTINGS', silent=True)

    # configure custom static path for serving files during
    # development
    app.static_folder = app.config['STATIC_PATH']
    app.add_url_rule('/static/<path:filename>',
                      endpoint='static',
                      view_func=app.send_static_file)

    # custom template path, fall back to default
    jinja_loader = jinja2.ChoiceLoader([
        jinja2.FileSystemLoader(app.config['TEMPLATE_PATH']),
        app.jinja_loader,
    ])
    app.jinja_loader = jinja_loader


    configure_logging(app)

    app.register_blueprint(frontend)
    app.register_blueprint(api, url_prefix='/api')

    celery.add_defaults(app.config)

    # configure error handlers
    @app.errorhandler(403)
    def forbidden_page(error):
        return render_template("403.html"), 403

    # FIXME adapt this for json requests http://flask.pocoo.org/snippets/83/
    @app.errorhandler(404)
    def page_not_found(error):
        if request.headers['Content-Type'] == 'application/json':
            message = {
                'status': 404,
                'detail': 'Not Found: ' + request.url,
            }
            resp = jsonify(message)
            resp.status_code = 404
            return resp       
        else:
            return render_template("404.html"), 404

    @app.errorhandler(500)
    def server_error_page(error):
        return render_template("500.html"), 500


    if app.config['DEBUG']:
        from werkzeug.wsgi import SharedDataMiddleware
        app.wsgi_app = SharedDataMiddleware(app.wsgi_app, {
            '/preview': app.config["DOWNLOAD_PATH"]
        })

    return app



def configure_logging(app):
    """
    Configure file(info) and email(error) logging.
    """

    if app.debug or app.testing or not app.config['LOGFILE']:
        # Skip debug and test mode as well als missing log config.
        # You can check stdout logging. 
        return
    
    import logging
    from logging.handlers import SMTPHandler

    # Set info level on logger, which might be overwritten by handers.
    # Suppress DEBUG messages.
    app.logger.setLevel(logging.INFO)
    
    info_log = app.config['LOGFILE']
    info_file_handler = logging.handlers.RotatingFileHandler(info_log, maxBytes=100000, backupCount=10)
    info_file_handler.setLevel(logging.INFO)
    info_file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s '
        '[in %(pathname)s:%(lineno)d]')
    )
    app.logger.addHandler(info_file_handler)

    # Testing
    # app.logger.info("testing info.")
    # app.logger.warn("testing warn.")
    # app.logger.error("testing error.")

    ## Mail out errors to admins
    # mail_handler = SMTPHandler(app.config['MAIL_SERVER'],
    #                            app.config['MAIL_USERNAME'],
    #                            app.config['ADMINS'],
    #                            '[modelconvert] Error on website',
    #                            (app.config['MAIL_USERNAME'],
    #                             app.config['MAIL_PASSWORD']))
    # mail_handler.setLevel(logging.ERROR)
    # mail_handler.setFormatter(logging.Formatter(
    #     '%(asctime)s %(levelname)s: %(message)s '
    #     '[in %(pathname)s:%(lineno)d]')
    # )
    # app.logger.addHandler(mail_handler)


if __name__ == "__main__":
    app = create_app()
    app.debug = True
    app.run(threaded=True)
