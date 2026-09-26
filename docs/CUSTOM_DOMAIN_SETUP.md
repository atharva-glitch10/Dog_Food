# Custom Domain Connection & Reverse Proxy Guide

This guide details how to route a production custom domain (e.g., `hackathon.yourdomain.com`) to your self-hosted DOGFOOD 2026 instance with TLS/HTTPS.

---

## 1. DNS Configuration

Configure DNS records with your registrar or DNS provider:

| Record Type | Host / Name | Target / Value | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `hackathon` (or `@`) | `<Your-Server-Public-IPv4>` | 300 / Auto |
| **AAAA** (optional) | `hackathon` | `<Your-Server-Public-IPv6>` | 300 / Auto |

---

## 2. Environment Variables

Update your `.env` file on the deployment server:

```dotenv
# Your public custom domain (without protocol)
CUSTOM_DOMAIN=hackathon.yourdomain.com

# Allowed CORS origins (comma-separated if multiple)
CORS_ORIGIN=https://hackathon.yourdomain.com,http://localhost:3000

# Client-facing API endpoint
VITE_API_URL=https://hackathon.yourdomain.com/api
```

---

## 3. Reverse Proxy Configuration

### Option A: Caddy (Recommended: Automatic Let's Encrypt TLS)

Create `Caddyfile`:

```caddyfile
hackathon.yourdomain.com {
    # Backend API and Swagger docs
    handle /api/* {
        reverse_proxy localhost:4000
    }

    # Uploaded media assets
    handle /uploads/* {
        reverse_proxy localhost:4000
    }

    # Frontend Single Page Application
    handle {
        reverse_proxy localhost:3000
    }
}
```

Run:
```bash
caddy run --config Caddyfile
```

---

### Option B: Nginx

Create `/etc/nginx/sites-available/dogfood.conf`:

```nginx
server {
    listen 80;
    server_name hackathon.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hackathon.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/hackathon.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hackathon.yourdomain.com/privkey.pem;

    # Client body limit for artifact uploads
    client_max_body_size 25M;

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads
    location /uploads/ {
        proxy_pass http://127.0.0.1:4000/uploads/;
        proxy_set_header Host $host;
    }

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/dogfood.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 4. Verification Checklist

1. **DNS Resolution**: `nslookup hackathon.yourdomain.com` returns the target server IP.
2. **TLS Certificate**: Browsing to `https://hackathon.yourdomain.com` presents a valid certificate.
3. **Health Endpoint**: `curl https://hackathon.yourdomain.com/api/health` returns HTTP 200 with status `healthy`.
4. **App Access**: Homepage, gallery, and legal pages (`/privacy`, `/terms`) load with custom favicon and zero console errors.
