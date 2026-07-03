import os
import subprocess
import webbrowser
import time
import sys

def main():
    print("Iniciando el Taller de Costura...")
    
    # Rutas
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, 'backend')
    frontend_dir = os.path.join(base_dir, 'desktop')

    # Iniciar Backend
    print("Levantando base de datos y API...")
    # Asumimos que uvicorn está instalado en el entorno (o global si se instaló así)
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=backend_dir
    )

    # Iniciar Frontend (Vite)
    print("Levantando interfaz visual...")
    frontend_process = subprocess.Popen(
        "npm run dev -- --host 0.0.0.0 --port 5173",
        cwd=frontend_dir,
        shell=True
    )

    # Esperar un par de segundos para que los servidores levanten
    time.sleep(3)

    # Abrir el navegador en pantalla completa (o modo kiosko si es posible)
    print("Abriendo aplicación...")
    webbrowser.open("http://localhost:5173")

    try:
        # Mantener el script corriendo
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\nCerrando el sistema...")
        backend_process.terminate()
        frontend_process.terminate()
        sys.exit(0)

if __name__ == "__main__":
    main()
