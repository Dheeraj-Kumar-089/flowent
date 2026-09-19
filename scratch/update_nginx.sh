sudo perl -pi -e 's/System\.Management\.Automation\.Internal\.Host\.InternalHost/\$host\$request_uri/g' /etc/nginx/sites-available/default
sudo systemctl reload nginx
