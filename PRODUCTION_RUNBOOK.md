# Production Runbook — Waooo Felicitations

## Escalade

- **Critique (RTO < 15 min)**: API down, login impossible, transactions bloquees.
- **Majeur (RTO < 1h)**: taux d'erreurs eleve, endpoints partiellement indisponibles.
- **Mineur (RTO < 4h)**: bug isole, impact limite.

## Verifications immediates

```bash
curl -sS https://www.wao-felicitations.com/api/health
pm2 status
sudo systemctl status nginx
```

## Logs

```bash
pm2 logs waooo-api-prod --lines 100
tail -f /var/log/waooo-felicitations/app.log
```

## Redemarrage

```bash
pm2 gracefulReload waooo-api-prod
pm2 restart waooo-api-prod
```

## Rollback rapide (application)

```bash
# Revenir au commit precedent deploye
git revert HEAD --no-edit
npm run build
pm2 restart waooo-api-prod
```

## Rollback base de donnees (Neon)

- Creer une branche de recovery depuis `main` avec Point-in-Time Recovery.
- Verifier la branche recovery.
- Basculer la branche par defaut si valide.
- Redemarrer l'application.

## Contacts

- On-call DevOps: `A_COMPLETER`
- Backup Backend: `A_COMPLETER`
- Product Owner: `A_COMPLETER`
