#!/bin/bash

set -e

echo "=== Configuración de permisos sudo para FortiLinux Client ==="
echo ""

if [ "$EUID" -ne 0 ]; then 
    echo "Este script necesita permisos de root."
    echo "Ejecuta: sudo ./install-sudoers.sh"
    exit 1
fi

SUDOERS_FILE="/etc/sudoers.d/fortilinux-vpn"
CURRENT_USER="${SUDO_USER:-$USER}"

if [ -z "$CURRENT_USER" ] || [ "$CURRENT_USER" = "root" ]; then
    echo "Error: No se pudo determinar el usuario actual."
    echo "Ejecuta este script con sudo: sudo ./install-sudoers.sh"
    exit 1
fi

echo "Configurando permisos para el usuario: $CURRENT_USER"
echo ""

cat > "$SUDOERS_FILE" << EOF
# FortiLinux Client - Permitir openfortivpn sin contraseña
$CURRENT_USER ALL=(ALL) NOPASSWD: /usr/bin/openfortivpn
$CURRENT_USER ALL=(ALL) NOPASSWD: /usr/bin/pkill openfortivpn
$CURRENT_USER ALL=(ALL) NOPASSWD: /usr/bin/kill
EOF

chmod 0440 "$SUDOERS_FILE"

echo "Verificando sintaxis..."
if visudo -c -f "$SUDOERS_FILE" > /dev/null 2>&1; then
    echo "✓ Configuración instalada correctamente en: $SUDOERS_FILE"
    echo ""
    echo "=== Instalación completada ==="
    echo ""
    echo "Ahora FortiLinux Client podrá ejecutar openfortivpn sin pedir contraseña."
    echo ""
    echo "Para desinstalar:"
    echo "  sudo rm $SUDOERS_FILE"
else
    echo "✗ Error de sintaxis en la configuración"
    rm -f "$SUDOERS_FILE"
    exit 1
fi

