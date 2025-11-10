# HRM Production Deployment Guide

## Prerequisites

1. **Node.js & npm** installed
2. **PM2** installed globally: `npm install -g pm2`
3. **Nginx** installed
4. **Domain name** configured with DDNS (No-IP, DuckDNS, etc.)
5. **SSL certificate** (Let's Encrypt recommended)

## Environment Setup

1. **Create production environment file:**

```bash
cp .env.local .env.production
```

2. **Update environment variables in `.env.production`:**

```env
NEXTAUTH_URL=https://YOUR_DOMAIN.com
NEXTAUTH_SECRET=your-production-secret-here
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

3. **Generate NextAuth secret:**

```bash
openssl rand -base64 32
```

## Deployment Steps

### 1. Build and Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

### 2. Configure Nginx

```bash
# Copy nginx configuration
sudo cp nginx.conf.template /etc/nginx/sites-available/hrm
# Update YOUR_DOMAIN.com in the file
sudo nano /etc/nginx/sites-available/hrm
# Enable site
sudo ln -s /etc/nginx/sites-available/hrm /etc/nginx/sites-enabled/
# Test configuration
sudo nginx -t
# Reload nginx
sudo systemctl reload nginx
```

### 3. Setup SSL with Let's Encrypt

```bash
sudo certbot --nginx -d YOUR_DOMAIN.com
```

### 4. Configure PM2 to start on boot

```bash
pm2 startup
# Run the command it outputs
pm2 save
```

## DDNS Setup (No-IP Example)

1. **Install No-IP client:**

```bash
cd /usr/local/src/
sudo wget http://www.noip.com/client/linux/noip-duc-linux.tar.gz
sudo tar xf noip-duc-linux.tar.gz
cd noip-2.1.9-1/
sudo make install
```

2. **Configure No-IP:**

```bash
sudo /usr/local/bin/noip2 -C
```

3. **Start on boot:**

```bash
sudo crontab -e
# Add this line:
@reboot /usr/local/bin/noip2
```

## Port Forwarding

Configure your router to forward these ports to your server:

- **Port 80** (HTTP) → Server IP:80
- **Port 443** (HTTPS) → Server IP:443

## Monitoring

- **Check PM2 status:** `pm2 status`
- **View logs:** `pm2 logs hrm-server`
- **Monitor resources:** `pm2 monit`
- **Restart if needed:** `pm2 restart hrm-server`

## Troubleshooting

### WebSocket Issues

- Ensure nginx proxy_pass includes WebSocket headers
- Check firewall allows connections on port 3000
- Verify PM2 process is running: `pm2 list`

### SSL Issues

- Renew certificates: `sudo certbot renew`
- Check certificate status: `sudo certbot certificates`

### Performance

- Monitor memory usage: `pm2 monit`
- Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
