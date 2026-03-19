# 🚀 Cresco Azure Deployment Checklist

**Public IP**: 20.90.3.97  
**Access URL**: http://20.90.3.97:3000

---

## ✅ Pre-Deployment

- [ ] Azure VM created (Cresco in Cresco_group)
- [ ] SSH key pair downloaded and saved locally
- [ ] Can SSH to VM: `ssh -i /path/to/key.pem crescoteam26@20.90.3.97`

---

## ✅ Step 1: Connect & Install Docker

```bash
ssh -i /path/to/key.pem crescoteam26@20.90.3.97
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker crescoteam26
exit
# SSH back in
ssh -i /path/to/key.pem crescoteam26@20.90.3.97
docker --version
```

- [ ] Docker installed and working
- [ ] Version ≥ 20.10

---

## ✅ Step 2: Deploy App

**Clone from Git:**
```bash
git clone https://github.com/<your-repo>/agritech-project.git
cd agritech-project
```

**Or upload with SCP:**
```bash
# From local machine
scp -i /path/to/key.pem -r ./agritech-project crescoteam26@20.90.3.97:~/
```

Then:
```bash
cd ~/agritech-project
docker compose up --build -d
docker compose ps
```

- [ ] Both containers (backend + frontend) are **Up**
- [ ] No errors in logs: `docker compose logs`

---

## ✅ Step 3: Configure Firewall

**Option A: Automated (Linux/Mac)**
```bash
chmod +x setup-azure-firewall.sh
bash setup-azure-firewall.sh
```

**Option B: Manual (Azure Portal)**
1. Go to Azure Portal → VM "Cresco"
2. Left sidebar → **Networking**
3. Add inbound rules:
   - Rule: **allow-frontend**, Port **3000**, Priority **100**
   - Rule: **allow-api**, Port **8000**, Priority **101**

- [ ] Firewall rules added for ports 3000 and 8000
- [ ] Rules are "Allow" for TCP protocol
- [ ] Source is "Any"

---

## ✅ Step 4: Test Access

Open browser and visit:
```
http://20.90.3.97:3000
```

- [ ] Frontend loads (Cresco app visible)
- [ ] Can login with admin credentials
- [ ] Chat, maps, drone features work
- [ ] No "Cannot reach API" errors

---

## ✅ Post-Deployment

### View Logs
```bash
ssh -i /path/to/key.pem crescoteam26@20.90.3.97
docker compose logs -f backend
docker compose logs -f frontend
```

### Restart Services
```bash
docker compose down
docker compose up -d
```

### Check VM Health
```bash
df -h          # Disk space
free -h        # Memory
docker stats   # Container resource usage
```

### Update App (if you push new code)
```bash
cd ~/agritech-project
git pull origin main
docker compose up --build -d
```

- [ ] Logs look clean (no errors)
- [ ] Disk/memory are healthy
- [ ] App can be restarted cleanly

---

## 🔒 Optional: Add HTTPS (Later)

When ready, configure domain + SSL:
```bash
# On the VM
chmod +x setup-https.sh
bash setup-https.sh your-domain.com
```

- [ ] DNS points to 20.90.3.97
- [ ] SSL certificate generated
- [ ] Nginx configured for HTTPS

---

## 🆘 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Connection refused" on port 3000 | Firewall rule not added. Check Azure Portal → Networking → Inbound rules |
| Backend container not running | `docker compose logs backend` to see error. Usually missing .env file |
| "Cannot reach API" in frontend | Backend port 8000 not open in firewall rules |
| Slow on first access | Build is happening. Wait 5 min, check: `docker compose logs backend` |
| Changes not reflected | Run `docker compose up --build -d` to rebuild |

---

## 📞 Support

Need help? SSH into the VM and run:
```bash
docker compose ps
docker compose logs backend
docker compose logs frontend
```

Share the output for debugging!
