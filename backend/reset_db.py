import os
import sys

# Asegurar que importamos del directorio actual
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base

def reset_database():
    try:
        print("Eliminando tablas existentes...")
        Base.metadata.drop_all(bind=engine)
        
        print("Creando tablas vacías...")
        Base.metadata.create_all(bind=engine)
        
        print("✅ Base de datos reiniciada limpiamente (vacía).")
    except Exception as e:
        print(f"❌ Error al reiniciar la base de datos: {e}")

if __name__ == "__main__":
    reset_database()
