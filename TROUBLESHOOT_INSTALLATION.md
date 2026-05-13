# 🔧 DÉPANNAGE RAPIDE - PROBLÈMES D'INSTALLATION

## ❌ PROBLÈME 1: Fly CLI - Permission Denied

**Cause:** Chocolatey a un fichier verrou (lock file) inaccessible

### ✅ SOLUTION A - Télécharger Directement (Plus simple)

**Étape 1: Télécharger l'installateur Windows**
- Allez à: https://fly.io/docs/hands-on/install-flyctl/
- Cliquez sur: **"Windows (64-bit)"** ou **"Windows (32-bit)"**
- Téléchargez le fichier `.exe`

**Étape 2: Exécuter l'installateur**
- Double-cliquez sur le fichier téléchargé
- Acceptez les permissions
- Attendez la fin de l'installation

**Étape 3: Vérifier l'installation**
```powershell
flyctl version
# Devrait afficher: v0.x.xx ou similaire
```

---

## ❌ PROBLÈME 2: GitHub Push - Permission Denied (403)

**Cause:** GitHub a changé les règles. Les mots de passe ne suffisent plus.

### ✅ SOLUTION A - Personal Access Token (Recommandé)

**Étape 1: Créer un token GitHub**
1. Allez à: https://github.com/settings/tokens
2. Cliquez: **"Generate new token"** → **"Generate new token (classic)"**
3. Remplissez:
   - Name: `Fly Deploy Token`
   - Expiration: `30 days`
   - Scopes: Cochez `repo` (accès complet au repo)
4. Cliquez: **"Generate token"**
5. **COPIE le token** (affiché une fois seulement!)

**Étape 2: Utiliser le token pour git push**

Option A - Inclure le token dans l'URL:
```powershell
cd "c:\Wao Felicitations"
git remote set-url origin https://<YOUR_TOKEN>@github.com/man-30/Wao-Felicitations.git
git push origin main
```
(Remplacez `<YOUR_TOKEN>` par le token copié)

Option B - Laisser git demander:
```powershell
cd "c:\Wao Felicitations"
git push origin main
# Quand demandé:
# Username: <YOUR_GITHUB_USERNAME>
# Password: <PASTE_YOUR_TOKEN_HERE>
```

---

### ✅ SOLUTION B - SSH Key (Plus sécurisé pour le futur)

**Étape 1: Créer une SSH key**
```powershell
ssh-keygen -t ed25519 -C "your_email@example.com"
# Appuyez sur Enter pour la localisation par défaut
# Appuyez sur Enter 2x pour sans passphrase
```

**Étape 2: Ajouter la clé à GitHub**
1. Copiez la clé:
```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard
```

2. Allez à: https://github.com/settings/ssh/new
3. Collez la clé dans "Key"
4. Cliquez: **"Add SSH key"**

**Étape 3: Utiliser SSH pour git**
```powershell
cd "c:\Wao Felicitations"
git remote set-url origin git@github.com:man-30/Wao-Felicitations.git
git push origin main
```

---

## 🚀 PROCHAINES ÉTAPES

### **1. Installez Fly CLI**
- Téléchargez depuis: https://fly.io/docs/hands-on/install-flyctl/
- Ou réessayez: `choco install flyctl` en Admin PowerShell

**Vérifiez:**
```powershell
flyctl version
```

### **2. Fixez GitHub**
Choisissez une solution:
- **Token (rapide):** Créez un PAT et utilisez-le pour push
- **SSH (sécurisé):** Configurerez une SSH key

**Puis pushez:**
```powershell
cd "c:\Wao Felicitations"
git push origin main
```

### **3. Deployez Backend**
```powershell
cd "c:\Wao Felicitations"
.\deploy-to-flyio.ps1
```

---

## 💡 CONSEILS

**Pour Fly CLI:**
- Le fichier `.exe` est le plus fiable
- Double-cliquez et installez
- Redémarrez PowerShell après

**Pour GitHub:**
- Le token dure 30 jours
- SSH key est permanent et plus sécurisé
- Vous ne pouvez utiliser le PAT qu'une fois (notez-le!)

---

## ✅ VÉRIFICATIONS FINALES

Après ces fixes, vérifiez:

```powershell
# Fly CLI est installé?
flyctl version

# Git push fonctionne?
cd "c:\Wao Felicitations"
git status
git push origin main
```

---

**Status:** 🔧 **PROBLÈMES IDENTIFIÉS ET SOLUTIONS FOURNIES**

Essayez la Solution A pour chaque problème en premier! 🚀
