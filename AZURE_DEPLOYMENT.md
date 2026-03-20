# Cresco Azure VM Deployment Guide

## Your Azure Details
- **Subscription ID**: <your-subscription-id>
- **Resource Group**: <your-resource-group>
- **VM Name**: <your-vm-name>
- **Public IP**: <your-vm-public-ip>
- **SSH Username**: <your-vm-username>
- **OS**: Ubuntu 22.04/24.04 LTS

---

## Deployment Steps

### Step 1: Connect to Your VM

```bash
# SSH into your Azure VM
ssh -i /path/to/your-private-key.pem <your-vm-username>@<your-vm-public-ip>
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
sudo usermod -aG docker "$USER"

# Apply group changes (log out and back in)
exit
```

SSH back in:
```bash
ssh -i /path/to/your-private-key.pem <your-vm-username>@<your-vm-public-ip>

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
scp -i /path/to/private-key.pem -r /path/to/agritech-project <your-vm-username>@<your-vm-public-ip>:~/
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
AZURE_SUBSCRIPTION_ID=<your-subscription-id> \
AZURE_RESOURCE_GROUP=<your-resource-group> \
AZURE_VM_NAME=<your-vm-name> \
AZURE_PUBLIC_IP=<your-vm-public-ip> \
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
http://<your-vm-public-ip>:3000
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
  --resource-group <your-resource-group> \
  --nsg-name <your-nsg-name> \
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
