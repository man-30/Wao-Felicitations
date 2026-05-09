# Configuration de Prisma pour Wao Félicitations

## 🚀 Prérequis Installés

```bash
npm install prisma @prisma/client
npm install @neondatabase/serverless
npx prisma init
```

## 📝 Variables d'Environnement

Le fichier `.env` contient deux chaînes de connexion Neon:

```env
# Connexion directe — À UTILISER POUR LES MIGRATIONS
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require&channel_binding=require"

# Connexion poolée — À UTILISER POUR L'APPLICATION
DATABASE_URL_POOLED="postgresql://user:password@pooler.host/dbname?sslmode=require&channel_binding=require"
```

⚠️ **Important**: 
- Migrations: Utiliser `DATABASE_URL` (directe)
- Application: Utiliser `DATABASE_URL_POOLED` (poolée)

## 📊 Schéma Prisma

Le fichier `prisma/schema.prisma` contient:
- **8 enums**: UserRole, ClientType, AccountType, TransactionStatus, etc.
- **18 modèles**: User, Client, Apprenant, TontineAccount, Transaction, etc.
- **Relations complètes**: 1:n, n:1, 1:1 avec contraintes
- **Indexes**: Sur les colonnes clés pour performance

## 🔧 Commandes Prisma Essentielles

### Créer/Mettre à Jour le Schéma
```bash
# Créer une migration (recommandé pour production)
npx prisma migrate dev --name init

# Ou poussez directement (développement seulement)
npx prisma db push
```

### Voir la Base de Données
```bash
# Interface graphique Prisma Studio
npx prisma studio
```

### Générer Prisma Client
```bash
# Génère les types TypeScript
npx prisma generate
```

### Seed Initial (Optionnel)
```bash
# Créer un fichier prisma/seed.ts avec les données initiales
npx prisma db seed
```

## 💾 Services de Base de Données

Tous les services sont situés dans `lib/db/`:

### Utilisateurs
```typescript
import { userService } from '@/lib/db'

// Créer un utilisateur
const user = await userService.create({
  name: 'Jean Dupont',
  role: 'caissier',
  email: 'jean@waooo.com',
  password: 'hashed_password',
  zone: 'Agence Centre'
})

// Récupérer par email
const existing = await userService.findByEmail('jean@waooo.com')

// Lister les caissiers
const cashiers = await userService.findMany({ role: 'caissier' })

// Mettre à jour
await userService.update(user.id, { isActive: false })
```

### Clients
```typescript
import { clientService } from '@/lib/db'

// Créer un client apprenant
const client = await clientService.create({
  name: 'Idriss Traoré',
  membershipCode: '4728WF026',
  accountNumber: 'ACC-82736112',
  type: 'apprenant',
  phone: '0707070707',
  address: 'Abidjan Cocody',
  assignedCommercialId: 'u4'
})

// Chercher par code d'adhésion
const found = await clientService.findByMembershipCode('4728WF026')

// Lister les apprenants d'une zone
const zoneClients = await clientService.findMany({
  type: 'apprenant',
  assignedCommercialId: 'commercial_id'
})

// Chercher par nom/code/numéro
const searched = await clientService.findMany({
  search: 'Idriss'
})

// Soldes
const balances = await clientService.getBalance(client.id)
```

### Transactions
```typescript
import { transactionService } from '@/lib/db'

// Enregistrer un dépôt
const transaction = await transactionService.create({
  clientId: 'c1',
  clientName: 'Idriss Traoré',
  type: 'depot',
  amount: 50000,
  date: new Date(),
  collectedBy: 'u4',
  collectedByName: 'Commercial Terrain',
  status: 'en_attente'
})

// Approuver une transaction
await transactionService.updateStatus(
  transaction.id,
  'approuve',
  'u2',
  'Caisse Centrale (Alice)'
)

// Lister les transactions d'un client
const history = await transactionService.findMany({
  clientId: 'c1'
})

// Statistiques
const totalDépôts = await transactionService.getTotalByType('depot')
```

### Apprenants
```typescript
import { apprenantService } from '@/lib/db'

// Créer un apprenant
const apprenant = await apprenantService.create({
  clientId: 'c1',
  studentName: 'Idriss Traoré',
  schoolName: 'Lycée Classique',
  schoolLevel: '3ème',
  schoolYear: '2025-2026',
  guardianId: 'g1',
  cautionId: 'ca1',
  documents: [
    { key: 'acte_naissance', label: 'Acte de naissance', status: 'fourni' },
    { key: 'photos', label: '2 photos passeport', status: 'fourni' }
  ],
  createdBy: 'u2'
})

// Récupérer avec tous les détails
const full = await apprenantService.findById(apprenant.id)

// Lister les apprenants d'une école
const schoolStudents = await apprenantService.findMany({
  schoolName: 'Lycée Classique'
})
```

### Tontine Scolaire
```typescript
import { tontineService } from '@/lib/db'

// Créer un compte tontine
const tontine = await tontineService.create({
  apprenantId: 'ap1',
  numero: 'TON-2026-001',
  schoolName: 'Lycée Classique',
  schoolLevel: '3ème',
  fraisScolarite: 58700,
  grilleNumero: 8,
  fraisDossier: 1000,
  fraisAssurance: 1000,
  fraisPrestation: 13500,
  cotisationJournaliere: 500,
  totalCapital: 59700,
  totalJours: 120
})

// Récupérer avec cotisations
const account = await tontineService.findById(tontine.id)

// Mettre à jour le solde après une cotisation
await tontineService.updateBalance(
  tontine.id,
  500, // totalCotise
  0    // totalBeneficeCases
)

// Statistiques
const stats = await tontineService.getStats()
// {
//   total: 5,
//   actifs: 4,
//   soldes: 1,
//   suspendus: 0,
//   totalCapital: 298500,
//   totalCotise: 45000
// }
```

### Comptes
```typescript
import { accountService } from '@/lib/db'

// Créer un compte d'épargne
const savings = await accountService.create({
  clientId: 'c1',
  type: 'epargne',
  balance: 0,
  label: 'Épargne Principale',
  createdBy: 'u2',
  createdByName: 'Caissier Alice'
})

// Lister tous les comptes d'un client
const accounts = await accountService.findByClient('c1')

// Récupérer le compte d'épargne spécifiquement
const epargne = await accountService.findByType('c1', 'epargne')

// Mettre à jour le solde
await accountService.updateBalance(savings.id, 50000)

// Totaux par type
const totalSavings = await accountService.getTotalByType('epargne')
```

## 🔗 Structure d'Utilisation dans les Composants React

Pour utiliser dans une app React/Vite, créez une **API backend** (Node.js/Express ou API Routes Next.js):

### Exemple avec Express.js:
```typescript
// backend/routes/users.ts
import { userService } from '@/lib/db'

export async function getAllUsers(req, res) {
  const users = await userService.findMany()
  res.json(users)
}
```

### Puis appelez depuis React:
```typescript
// src/components/UserList.tsx
import { useState, useEffect } from 'react'

export function UserList() {
  const [users, setUsers] = useState([])
  
  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(setUsers)
  }, [])

  return (
    <div>
      {users.map(u => <div key={u.id}>{u.name}</div>)}
    </div>
  )
}
```

## 📋 Fichiers de Seed (Optionnel)

Créez `prisma/seed.ts` pour initialiser les données:

```typescript
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

async function main() {
  // Créer users de test
  await prisma.user.create({
    data: {
      name: 'Super Admin',
      role: 'admin',
      email: 'admin@waooo.com',
      password: await hash('admin', 10),
      isActive: true
    }
  })

  console.log('Seed completed')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

Puis exécutez:
```bash
npx prisma db seed
```

## 🔒 Sécurité

1. **Passwords**: Toujours hasher avec bcryptjs
   ```typescript
   import { hash, compare } from 'bcryptjs'
   const hashed = await hash(password, 10)
   ```

2. **Validation**: Valider les inputs avant les requêtes Prisma

3. **Permissions**: Vérifier les rôles avant chaque opération

4. **Secrets**: Ne jamais committer `.env` (ajouter à `.gitignore`)

## 📈 Performance

### Indexes
Tous les indexes critiques sont déjà définis:
- Emails, IDs de clients, dates de transactions
- Codes d'adhésion, numéros de compte

### Pagination
Pour les listes longues:
```typescript
const users = await prisma.user.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' }
})
```

### Relations
Charger les relations au besoin:
```typescript
const client = await prisma.client.findUnique({
  where: { id: 'c1' },
  include: {
    accounts: true,
    apprenant: { include: { guardian: true } }
  }
})
```

## 🆘 Dépannage

### Migration échouée
```bash
npx prisma migrate reset  # Remet à zéro (dev seulement!)
npx prisma db push       # Force-pousse le schéma
```

### Types TypeScript manquants
```bash
npx prisma generate
```

### Connexion échouée
- Vérifier `.env`
- Tester la connexion Neon
- Vérifier le pooling si utilisé

---

**Pour plus d'infos**: [Prisma Docs](https://www.prisma.io/docs)
