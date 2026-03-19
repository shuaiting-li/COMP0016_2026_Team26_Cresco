# Cresco Azure VM Deployment Guide

## Your Azure Details
- **Subscription ID**: 029e7210-7637-41e3-b2fb-5ec0f850f643
- **Resource Group**: Cresco_group
- **VM Name**: Cresco
- **Public IP**: 20.90.3.97
- **OS**: Ubuntu 22.04 LTS

---

## Deployment Steps

### Step 1: Connect to Your VM

```bash
# SSH into your Azure VM
ssh -i /path/to/your-private-key.pem crescoteam26@20.90.3.97
```

Verify Ubuntu version:
```bash
lsb_release -a
```

### Step 2: Install Docker (one-time setup)

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker crescoteam26

# Apply group changes (log out and back in)
exit
```

SSH back in:
```bash
ssh -i /path/to/your-private-key.pem crescoteam26@20.90.3.97

# Verify Docker is working
docker --version
docker compose --version
docker run hello-world
```

### Step 3: Deploy Cresco

**Option A: Clone from GitHub** (if you have a repo)
```bash
cd ~
git clone https://github.com/your-username/agritech-project.git
cd agritech-project
```

**Option B: Upload from local machine**
```bash
# From your local machine (Terminal)
scp -i /path/to/private-key.pem -r /path/to/agritech-project crescoteam26@20.90.3.97:~/
```

Then on the VM:
```bash
cd ~/agritech-project
docker compose up --build -d
```

Verify services are running:
```bash
docker compose ps
```

Expected output:
```
NAME                    STATUS
cresco-backend          Up X seconds
cresco-frontend         Up X seconds
```

Check logs:
```bash
docker compose logs backend
docker compose logs frontend
```

### Step 4: Configure Azure Firewall Rules

**Option A: Use the Azure CLI script** (automated)
```bash
# Run on your local machine
bash ./setup-azure-firewall.sh
```

**Option B: Manual Azure Portal Setup**
1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "Cresco" → select your VM
3. Left sidebar → **Networking**
4. Click **Add inbound port rule** twice

**Rule 1 - Frontend (Port 3000):**
- Source: Any
- Source port ranges: *
- Destination: Any
- Destination port ranges: **3000**
- Protocol: TCP
- Action: Allow
- Priority: **100**
- Name: **allow-frontend**

**Rule 2 - Backend API (Port 8000):**
- Source: Any
- Source port ranges: *
- Destination: Any
- Destination port ranges: **8000**
- Protocol: TCP
- Action: Allow
- Priority: **101**
- Name: **allow-api**

### Step 5: Access Your App

Open in your browser:
```
http://20.90.3.97:3000
```

✅ **Your Cresco app is now live!**

---

## Common VM Commands

```bash
# View running containers
docker compose ps

# View logs (follow in real-time)
docker compose logs -f frontend
docker compose logs -f backend

# Stop the app
docker compose down

# Restart the app
docker compose up -d

# Check disk space
df -h

# Check CPU/memory usage
free -h
docker stats

# SSH into a container
docker compose exec backend bash
```

---

## Troubleshooting

### Port not accessible (firewall rules not working)
```bash
# Azure CLI: verify rules were added
az network nsg rule list \
  --resource-group Cresco_group \
  --nsg-name Cresco-nsg \
  -o table
```

### Backend not starting
```bash
docker compose logs backend
# Check for errors in output
```

### Frontend showing "Cannot reach API"
- Verify backend is running: `docker compose ps`
- Check backend logs: `docker compose logs backend`
- Confirm ports 3000 and 8000 are in firewall rules

---

## Next Steps (Optional)

### Enable HTTPS with Let's Encrypt
See `AZURE_HTTPS_SETUP.md` for automated SSL certificate setup.

### Update your app remotely
```bash
cd ~/agritech-project
git pull origin main
docker compose up --build -d
```

### Monitor app in Azure Portal
1. Go to VM → **Insights** (preview)
2. View CPU, memory, disk, network metrics
