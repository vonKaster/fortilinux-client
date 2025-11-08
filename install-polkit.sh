#!/bin/bash

set -e

echo "=== Instalador de Política Polkit para FortiLinux Client ==="
echo ""

if [ "$EUID" -ne 0 ]; then 
    echo "Este script necesita permisos de root para instalar la política."
    echo "Ejecuta: sudo ./install-polkit.sh"
    exit 1
fi

POLICY_FILE="polkit/com.fortilinux.client.policy"
POLICY_DEST="/usr/share/polkit-1/actions/com.fortilinux.client.policy"

if [ ! -f "$POLICY_FILE" ]; then
    echo "Error: No se encuentra el archivo de política: $POLICY_FILE"
    exit 1
fi

echo "Instalando política de polkit..."
cp "$POLICY_FILE" "$POLICY_DEST"
chmod 644 "$POLICY_DEST"

echo "Verificando instalación..."
if [ -f "$POLICY_DEST" ]; then
    echo "✓ Política instalada correctamente en: $POLICY_DEST"
else
    echo "✗ Error al instalar la política"
    exit 1
fi

echo ""
echo "=== Instalación completada ==="
echo ""
echo "Ahora FortiLinux Client podrá ejecutar openfortivpn sin pedir contraseña"
echo "cada vez (solo pedirá contraseña la primera vez que inicies sesión)."
echo ""
echo "Para desinstalar, ejecuta:"
echo "  sudo rm $POLICY_DEST"
echo ""

