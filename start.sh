#!/bin/bash

echo "Configurando el entorno..."

# Cargar Node.js (necesario para el frontend)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Activar el entorno virtual de Python (necesario para el backend)
source backend/venv/bin/activate

# Ejecutar el script principal
python run.py
