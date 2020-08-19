enable bluetooth on chrome: 
chrome://flags/#enable-experimental-web-platform-features

installing nginx
https://dev.to/guimg/how-to-serve-nodejs-applications-with-nginx-on-a-raspberry-jld
https://medium.com/@utkarsh_verma/configure-nginx-as-a-web-server-and-reverse-proxy-for-nodejs-application-on-aws-ubuntu-16-04-server-872922e21d38


nginx configuration for location needs updating after using certbot
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
