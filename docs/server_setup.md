# server setup
@author(arii)

#### running server locally

Run the heartrate server locally:

```
npm install
npm start 
```

If you go to localhost:3000 you should see the landing page.  If you click "log your HeartRate" button and click start navigator bluetooth will pop up.  This will not work outside of localhost since navigator.bluetooth requires https.

![HRM Server local site](https://github.com/arii/hrm/raw/leader/docs/figs/hrm_server.png "HRM Server")


#### pm2 (start node on boot)

    Instead of manually running node bin/www, I am using pm2 to start
    the web server.  It uses a simple ecosystem file:

```
module.exports = {
  apps : [{
    name   : "hrm_client",
    script : "./bin/www"
  }]
}
```
    
 To configure pm2 to start on boot:
    
```
    pm2 startup
    # copy script outuput
    pm2 start  # this should launch hrm_client on localhost:3000
    pm2 save
    
```

#### set up a static ip
    I'm using no-ip. I followed their setup instruction and used crontab to 
    run noip on boot:

``` 
sudo crontab -e
# this opens an editor and I added this to bottom of the file:


@reboot /usr/local/bin/noip2

```

####  nginx and letsencrypt certbot
    I'm using nginx to host my website on port 80.  It automatically maps service onto
    port 443 to use https.  The nginx configuration file in `/etc/nginx/sites-available/default` gets updated using letsencrypt's certbot.  I recommend the following website tutorials: 

   * [tutorial1](https://dev.to/guimg/how-to-serve-nodejs-applications-with-nginx-on-a-raspberry-jld) 
    * [tutorial2](https://medium.com/@utkarsh_verma/configure-nginx-as-a-web-server-and-reverse-proxy-for-nodejs-application-on-aws-ubuntu-16-04-server-872922e21d38) 

The only gotcha I found was nginx configuration for location needs updating after using certbot

```
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

Using certbot:

```
sudo certbot --nginx -d  WEBSITENAME
sudo nginx -t
sudo ln -s /etc/nginx/sites-available/privatebits.io /etc/nginx/sites-enabled/
sudo service nginx --force-reload 
```

#### Hosting site

Eventually I will look into hosting the website with heroku/aws/ or something else.
For now, I am hosting locally and had to modify my router port forwarding to open 80 and 443.

	
