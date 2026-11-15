#!/bin/bash
# À exécuter en root sur le serveur Plex (sudo bash install-apt-gate.sh), avec plex-apt-update dans le même dossier.
set -eu
DIR="$(cd "$(dirname "$0")" && pwd)"

install -o root -g root -m 0755 "$DIR/plex-apt-update" /usr/local/sbin/plex-apt-update

# Règle sudoers : écrite dans un fichier temporaire, validée par visudo, puis seulement activée.
TMP=$(mktemp)
cat > "$TMP" <<'EOF'
# Le dashboard (via la passerelle SSH) peut lancer les mises à jour, rien d'autre.
serveur ALL=(root) NOPASSWD: /usr/local/sbin/plex-apt-update update, /usr/local/sbin/plex-apt-update upgrade
EOF
if visudo -cf "$TMP" >/dev/null; then
    install -o root -g root -m 0440 "$TMP" /etc/sudoers.d/plex-apt-gate
    echo "sudoers : règle installée et validée"
else
    echo "ERREUR : règle sudoers invalide, rien n'a été activé" >&2
    rm -f "$TMP"
    exit 1
fi
rm -f "$TMP"

# Vérification finale de la configuration sudo complète
visudo -c >/dev/null && echo "sudo : configuration globale valide"
ls -l /usr/local/sbin/plex-apt-update /etc/sudoers.d/plex-apt-gate
