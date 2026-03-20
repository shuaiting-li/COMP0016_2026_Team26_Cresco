#!/bin/bash

# SSH into your Azure VM and run this script to enable HTTPS with Let's Encrypt

set -e

echo "🔒 Installing HTTPS support (Let's Encrypt + Certbot)..."
echo ""

# Install Certbot and Nginx
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Create a certificate (you'll need your domain name)
# Replace example.com with your actual domain
DOMAIN=$1

if [ -z "$DOMAIN" ]; then
  echo "Usage: bash setup-https.sh your-domain.com"
  echo ""
  echo "Example:"
  echo "  bash setup-https.sh farming-tracker.uk"
  exit 1
fi

echo "📝 Creating SSL certificate for: $DOMAIN"
echo ""

# Generate self-signed cert first (as fallback)
sudo certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email admin@$DOMAIN \
  -d $DOMAIN \
  || echo "ℹ️  Could not auto-configure. Run: sudo certbot certonly --standalone -d $DOMAIN"

echo ""
echo "✅ Certificate created (if successful)"
echo ""
echo "📁 Certificate location:"
echo "   /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "   /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo ""
echo "Next step: Update your docker-compose.yml to mount these certificates"
echo "and configure Nginx to use them."
echo ""
echo "Auto-renewal is enabled. Certificates renew automatically 30 days before expiry."
