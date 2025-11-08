#!/bin/bash

echo "=================================================="
echo "  FortiLinux VPN - Build e Instalación Local"
echo "=================================================="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Ejecuta este script desde el directorio del proyecto"
    exit 1
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi

echo "→ Instalando dependencias..."
npm install

echo ""
echo "→ Compilando frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error al compilar el frontend"
    exit 1
fi

echo ""
echo "→ Generando AppImage..."
npx electron-builder --linux AppImage

if [ $? -eq 0 ]; then
    echo ""
    echo "=================================================="
    echo "  ✅ BUILD COMPLETADO"
    echo "=================================================="
    echo ""
    echo "📦 Archivos generados en: ./release/"
    echo ""
    ls -lh release/*.AppImage 2>/dev/null
    echo ""
    echo "🚀 Para ejecutar:"
    echo "   cd release"
    echo "   chmod +x FortiLinux-VPN-*.AppImage"
    echo "   ./FortiLinux-VPN-*.AppImage"
    echo ""
    echo "💡 O simplemente haz doble clic en el archivo .AppImage"
    echo ""
else
    echo "❌ Error durante el build"
    exit 1
fi

