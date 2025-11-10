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
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://onasafari.ddns.net/api/auth/callback
NEXTAUTH_URL=https://onasafari.ddns.net
NEXTAUTH_SECRET=your_production_secret_here
```

3. **Generate NextAuth secret:**

```bash
openssl rand -base64 32
```

## Deployment Steps

### 1. Build and Deploy

```bash
# Make deploy script executable (if not already)
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

The deployment script will:
- Create logs directory
- Check for .env.production file
- Validate nginx configuration
- Build the Next.js application
- Stop existing PM2 processes
- Start production server with PM2
- Save PM2 configuration

### 2. Nginx Configuration

**Note**: Since you already have nginx configured at `onasafari.ddns.net` with SSL certificates and WebSocket support for port 3000, no nginx changes are needed.

If you need to update nginx configuration:

```bash
# The nginx.conf.template is available for reference
# Your existing configuration should already proxy to port 3000
# Test configuration
sudo nginx -t
# Reload if needed
sudo systemctl reload nginx
```

### 3. SSL Configuration

**Note**: SSL certificates are already configured for `onasafari.ddns.net`. No action needed.

To renew certificates if needed:
```bash
sudo certbot renew
```

### 4. Configure PM2 to start on boot

```bash
pm2 startup
# Run the command it outputs
pm2 save
```

## DDNS Configuration

**Note**: DDNS is already configured for `onasafari.ddns.net`. No action needed.

The domain should automatically update with your current IP address.

## Port Forwarding

**Note**: Port forwarding is already configured for `onasafari.ddns.net`:

- **Port 80** (HTTP) → Server IP:80 ✅
- **Port 443** (HTTPS) → Server IP:443 ✅
- **Port 3000** → Server IP:3000 (for WebSocket) ✅

## Monitoring

- **Check PM2 status:** `pm2 status`
- **View logs:** `pm2 logs hrm-server` or `npm run pm2:logs`
- **Monitor resources:** `pm2 monit`
- **Restart if needed:** `pm2 restart hrm-server`
- **Stop server:** `npm run pm2:stop`

## Quick Deployment Commands

```bash
# Full deployment
npm run deploy

# Or step by step:
npm run build
npm run start

# Check status
npm run pm2:logs
```

## Troubleshooting

### WebSocket Issues

- Ensure nginx proxy_pass includes WebSocket headers ✅ (already configured)
- Check firewall allows connections on port 3000 ✅ (already configured)
- Verify PM2 process is running: `pm2 list`
- Check WebSocket connection in browser console
- Verify server is accessible at `https://onasafari.ddns.net`

### SSL Issues

- Renew certificates: `sudo certbot renew`
- Check certificate status: `sudo certbot certificates`

### Performance

- Monitor memory usage: `pm2 monit`
- Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Check application logs: `pm2 logs hrm-server`
- Monitor audio system performance (beep sounds)
- Test volume synchronization between dashboard and control panel
