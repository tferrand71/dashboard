#!/usr/bin/env python3
"""Passerelle de fichiers restreinte pour le serveur Plex.

Appelée par SSH via une clé dont `authorized_keys` force cette commande :
    command="/usr/bin/python3 /home/serveur/media-gate.py",restrict ssh-ed25519 ...

Le client envoie `gate <base64 d'un JSON>` ; ce script lit SSH_ORIGINAL_COMMAND,
exécute UNE opération et répond par une ligne JSON sur stdout.

Opérations : roots, ls, mkdir, rm, et l'envoi par morceaux begin / chunk (octets sur stdin) / end / abort.
Tout est confiné aux bibliothèques `film` et `serie` : pas de « .. », pas de
chemin absolu, les liens symboliques ne peuvent pas faire sortir du dossier.
"""
import base64
import json
import os
import shutil
import sys

ROOTS = {
    "film": "/var/lib/plexmediaserver/Library/Application Support/Plex Media Server/library/film",
    "serie": "/var/lib/plexmediaserver/Library/Application Support/Plex Media Server/library/serie",
}
CHUNK = 1 << 20
MARGIN = 1 << 30          # on garde 1 Go de marge sur le disque
MAX_NAME = 255
MAX_SCAN = 50000          # plafond d'entrées parcourues pour calculer la taille d'un dossier

os.umask(0o022)           # fichiers 644, dossiers 755 : Plex (autre utilisateur) doit pouvoir lire


def reply(obj, code=0):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()
    sys.exit(code)


def fail(msg):
    reply({"ok": False, "error": msg}, 2)


def split(rel):
    """'film/Un dossier/x.mkv' -> ('film', ['Un dossier', 'x.mkv']) après validation."""
    if not isinstance(rel, str):
        fail("chemin invalide")
    parts = [p for p in rel.split("/") if p != ""]
    if not parts or parts[0] not in ROOTS:
        fail("bibliothèque inconnue (film ou serie)")
    for p in parts[1:]:
        if p in (".", "..") or len(p) > MAX_NAME or any(ord(c) < 32 for c in p) or "\\" in p:
            fail("nom de fichier ou de dossier invalide")
    return parts[0], parts[1:]


def resolve(rel):
    """Retourne (racine réelle, chemin complet) en refusant toute sortie de la bibliothèque."""
    key, sub = split(rel)
    root = os.path.realpath(ROOTS[key])
    full = os.path.join(root, *sub)
    # On résout le dossier parent (les liens symboliques y sont suivis puis contrôlés),
    # pas l'élément final : supprimer un lien supprime le lien, jamais sa cible.
    parent = os.path.realpath(os.path.dirname(full)) if sub else root
    checked = os.path.join(parent, os.path.basename(full)) if sub else root
    if parent != root and not parent.startswith(root + os.sep):
        fail("chemin hors de la bibliothèque")
    return root, checked, bool(sub)


def tree_size(path):
    total, seen = 0, 0
    for base, dirs, files in os.walk(path, followlinks=False):
        for f in files:
            seen += 1
            if seen > MAX_SCAN:
                return None
            try:
                total += os.lstat(os.path.join(base, f)).st_size
            except OSError:
                pass
    return total


def do_roots(_):
    out = []
    for key, path in ROOTS.items():
        try:
            st = os.statvfs(path)
            out.append({"name": key, "free": st.f_bavail * st.f_frsize, "total": st.f_blocks * st.f_frsize})
        except OSError:
            out.append({"name": key, "free": None, "total": None})
    reply({"ok": True, "roots": out})


def do_ls(req):
    root, full, _ = resolve(req.get("path", ""))
    # Ici on SUIT un éventuel lien symbolique final, donc on revérifie la destination réelle.
    full = os.path.realpath(full)
    if full != root and not full.startswith(root + os.sep):
        fail("chemin hors de la bibliothèque")
    if not os.path.isdir(full):
        fail("dossier introuvable")
    items = []
    with os.scandir(full) as it:
        for e in it:
            if e.name.startswith("."):
                continue  # fichiers temporaires (.nom.gate-part) et cachés
            try:
                st = e.stat(follow_symlinks=False)
            except OSError:
                continue
            is_dir = e.is_dir(follow_symlinks=False)
            items.append({
                "name": e.name,
                "dir": is_dir,
                "size": tree_size(e.path) if is_dir else st.st_size,
                "mtime": int(st.st_mtime),
            })
    items.sort(key=lambda i: (not i["dir"], i["name"].lower()))
    st = os.statvfs(root)
    reply({"ok": True, "items": items, "free": st.f_bavail * st.f_frsize, "total": st.f_blocks * st.f_frsize})


def do_mkdir(req):
    _, full, has_sub = resolve(req.get("path", ""))
    if not has_sub:
        fail("nom de dossier manquant")
    if os.path.lexists(full):
        fail("existe déjà")
    os.makedirs(full)
    reply({"ok": True})


def part_path(full):
    return os.path.join(os.path.dirname(full), "." + os.path.basename(full) + ".gate-part")


def do_begin(req):
    """Prépare (ou reprend) un envoi par morceaux ; répond avec l'offset déjà reçu."""
    root, full, has_sub = resolve(req.get("path", ""))
    size = req.get("size")
    if not has_sub or not isinstance(size, int) or size < 0:
        fail("paramètres invalides")
    if os.path.lexists(full):
        fail("un fichier ou dossier du même nom existe déjà")
    tmp = part_path(full)
    have = os.path.getsize(tmp) if os.path.exists(tmp) else 0
    if req.get("resume") and 0 < have <= size:
        reply({"ok": True, "offset": have})
    st = os.statvfs(root)
    if st.f_bavail * st.f_frsize < size + MARGIN:
        fail("espace disque insuffisant sur le serveur Plex")
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(tmp, "wb").close()
    reply({"ok": True, "offset": 0})


def do_chunk(req):
    """Ajoute exactement `length` octets (reçus sur stdin) à la suite du fichier partiel."""
    _, full, has_sub = resolve(req.get("path", ""))
    offset, length = req.get("offset"), req.get("length")
    if not has_sub or not isinstance(offset, int) or not isinstance(length, int) or offset < 0 or length < 0:
        fail("paramètres invalides")
    tmp = part_path(full)
    if not os.path.exists(tmp):
        fail("envoi non démarré")
    have = os.path.getsize(tmp)
    if have != offset:
        reply({"ok": False, "error": "décalage", "offset": have}, 2)
    received = 0
    try:
        with open(tmp, "ab") as out:
            while received < length:
                chunk = sys.stdin.buffer.read(min(CHUNK, length - received))
                if not chunk:
                    break
                out.write(chunk)
                received += len(chunk)
            out.flush()
            os.fsync(out.fileno())
        if received != length:
            raise ValueError(f"morceau incomplet ({received} octets sur {length})")
    except Exception as e:  # noqa: BLE001
        try:
            os.truncate(tmp, offset)  # on revient à l'état d'avant : le morceau pourra être renvoyé
        except OSError:
            pass
        fail(str(e))
    reply({"ok": True, "offset": offset + received})


def do_end(req):
    """Vérifie la taille finale puis publie le fichier (renommage atomique)."""
    _, full, has_sub = resolve(req.get("path", ""))
    size = req.get("size")
    if not has_sub or not isinstance(size, int):
        fail("paramètres invalides")
    tmp = part_path(full)
    if not os.path.exists(tmp):
        fail("envoi non démarré")
    have = os.path.getsize(tmp)
    if have != size:
        fail(f"fichier incomplet ({have} octets sur {size})")
    if os.path.lexists(full):
        fail("un fichier du même nom existe déjà")
    os.rename(tmp, full)
    reply({"ok": True, "size": size})


def do_abort(req):
    _, full, has_sub = resolve(req.get("path", ""))
    if has_sub:
        try:
            os.unlink(part_path(full))
        except FileNotFoundError:
            pass
    reply({"ok": True})


def do_rm(req):
    _, full, has_sub = resolve(req.get("path", ""))
    if not has_sub:
        fail("impossible de supprimer une bibliothèque entière")
    try:
        st = os.lstat(full)
    except FileNotFoundError:
        fail("introuvable")
    if os.path.isdir(full) and not os.path.islink(full):
        freed = tree_size(full)
        shutil.rmtree(full)
    else:
        freed = st.st_size
        os.unlink(full)
    reply({"ok": True, "freed": freed})


OPS = {"roots": do_roots, "ls": do_ls, "mkdir": do_mkdir, "begin": do_begin, "chunk": do_chunk,
       "end": do_end, "abort": do_abort, "rm": do_rm}


def main():
    cmd = os.environ.get("SSH_ORIGINAL_COMMAND", "")
    parts = cmd.split(" ", 1)
    if len(parts) != 2 or parts[0] != "gate":
        fail("commande refusée")
    try:
        req = json.loads(base64.b64decode(parts[1]).decode("utf-8"))
    except Exception:  # noqa: BLE001
        fail("requête illisible")
    op = OPS.get(req.get("op"))
    if not op:
        fail("opération inconnue")
    try:
        op(req)
    except PermissionError as e:
        fail(f"permission refusée : {e.filename}")
    except OSError as e:
        fail(f"erreur système : {e.strerror}")


if __name__ == "__main__":
    main()
