import os
import sys

# Add the parent directory to the path so we can import the backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, Corte, PrendaCorte, Trabajador, Asignacion, CatalogoPrenda, CatalogoMaestro, PagosTrabajador, IngresosCorte, HistorialActividad, InsumoCompra, engine, Base
import datetime

# Drop all tables and recreate them to ensure a completely clean slate
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    print("Base de datos reiniciada limpiamente.")

    # 1. Catalogos
    print("Creando catalogos...")
    db.add(CatalogoPrenda(nombre="Saco"))
    db.add(CatalogoPrenda(nombre="Pantalón"))
    db.add(CatalogoPrenda(nombre="Camisa"))
    
    db.add(CatalogoMaestro(nombre="Casimier Azul"))
    db.add(CatalogoMaestro(nombre="Algodon Blanco"))
    db.add(CatalogoMaestro(nombre="Gabardina Gris"))
    db.commit()

    # 2. Trabajadores
    print("Creando trabajadores...")
    # Add initial debt to workers to test payment logic
    t1 = Trabajador(nombre="Juan Perez", saldo_pendiente=225.0) # (15 camisas * 15 bs)
    t2 = Trabajador(nombre="Maria Lopez", saldo_pendiente=0.0) # Ya se le pagó todo
    t3 = Trabajador(nombre="Carlos Sanchez", saldo_pendiente=500.0) # (20 pantalones * 25 bs)
    db.add(t1)
    db.add(t2)
    db.add(t3)
    db.commit()

    # 3. Corte 1: Nuevo sin asignar
    print("Mocking Corte 1 (Nuevo, sin asignar)...")
    c1 = Corte(nombre="Uniformes Escolares (Nuevo)", quien_entrego="Distribuidor A", fecha_recibido="2026-07-03", fecha_entrega="2026-07-20", estado="Activo")
    db.add(c1)
    db.commit()
    db.add(PrendaCorte(corte_id=c1.id, tipo_prenda="Saco", tela_color="Casimier Azul", talla="M", cantidad_total=15, cantidad_disponible=15))
    db.add(PrendaCorte(corte_id=c1.id, tipo_prenda="Pantalón", tela_color="Casimier Azul", talla="30", cantidad_total=15, cantidad_disponible=15))
    db.add(HistorialActividad(fecha=datetime.datetime.now().isoformat(), accion="Creación", descripcion="Se creó el nuevo corte 'Uniformes Escolares (Nuevo)'.", entidad_tipo="Corte", entidad_id=c1.id))
    db.commit()

    # 4. Corte 2: En curso (parcialmente asignado y parcialmente entregado)
    print("Mocking Corte 2 (En curso)...")
    c2 = Corte(nombre="Lote de Camisas (En Curso)", quien_entrego="Distribuidor B", fecha_recibido="2026-06-25", fecha_entrega="2026-07-15", estado="Activo")
    db.add(c2)
    db.commit()
    
    # Total cut: 40 camisas. 10 left unassigned
    db.add(PrendaCorte(corte_id=c2.id, tipo_prenda="Camisa", tela_color="Algodon Blanco", talla="L", cantidad_total=40, cantidad_disponible=10))
    
    # Asignacion 1: En progreso
    db.add(Asignacion(corte_id=c2.id, trabajador_id=t1.id, tipo_prenda="Camisa", tela_color="Algodon Blanco", talla="L", cantidad=15, estado="Pendiente", pago_por_prenda=15))
    db.add(HistorialActividad(fecha=datetime.datetime.now().isoformat(), accion="Asignación", descripcion="Se asignó trabajo a Juan Perez.", entidad_tipo="Asignación", entidad_id=1))
    
    # Asignacion en curso
    db.add(Asignacion(corte_id=c2.id, trabajador_id=t2.id, tipo_prenda="Camisa", tela_color="Algodón Blanco", talla="M", cantidad=15, estado="Pendiente", pago_por_prenda=15))
    db.commit()
    
    # 5. Corte 3: Totalmente entregado
    print("Mocking Corte 3 (Entregado)...")
    c3 = Corte(nombre="Pantalones de Vestir (Finalizado)", quien_entrego="Distribuidor C", fecha_recibido="2026-06-01", fecha_entrega="2026-06-15", estado="Entregado")
    db.add(c3)
    db.commit()
    
    db.add(PrendaCorte(corte_id=c3.id, tipo_prenda="Pantalón", tela_color="Gabardina Gris", talla="32", cantidad_total=20, cantidad_disponible=0))
    # Asignacion completada
    db.add(Asignacion(corte_id=c3.id, trabajador_id=t3.id, tipo_prenda="Pantalón", tela_color="Gabardina Gris", talla="32", cantidad=20, estado="Completado", pago_por_prenda=25))
    db.add(HistorialActividad(fecha=datetime.datetime.now().isoformat(), accion="Entrega", descripcion="Carlos Sanchez completó 20 prendas.", entidad_tipo="Asignación", entidad_id=3))
    
    # Mocking pagos para que tengan corte asignado y sean lógicos
    # Maria Lopez está en curso, se le da un adelanto de 100 Bs (de los 225 Bs totales)
    db.add(PagosTrabajador(trabajador_id=t2.id, corte_id=c2.id, monto=100.0, fecha="2026-06-27"))
    db.add(HistorialActividad(fecha="2026-06-27T10:00:00", accion="Pago", descripcion="Se registró un adelanto de 100.0 Bs a Maria Lopez (Corte: Pantalones Escolares).", entidad_tipo="Pago", entidad_id=1))
    
    # Carlos Sanchez terminó el trabajo de un corte entregado, se le paga su totalidad (500 Bs)
    db.add(PagosTrabajador(trabajador_id=t3.id, corte_id=c3.id, monto=500.0, fecha="2026-06-15"))
    db.add(HistorialActividad(fecha="2026-06-15T12:00:00", accion="Pago", descripcion="Se registró pago total de 500.0 Bs a Carlos Sanchez (Corte: Pantalones de Vestir).", entidad_tipo="Pago", entidad_id=2))
    db.commit()

    # Ingreso del Distribuidor y Gasto de Materiales para Corte 3
    db.add(IngresosCorte(corte_id=c3.id, monto=1500.0, fecha="2026-06-05", descripcion="Adelanto para insumos"))
    db.add(HistorialActividad(fecha="2026-06-05T09:00:00", accion="Ingreso", descripcion="Se registró ingreso de 1500.0 Bs para Pantalones de Vestir (Finalizado).", entidad_tipo="Corte", entidad_id=c3.id))
    
    # Mocking gastos en materiales para que se vea en el resumen financiero
    db.add(InsumoCompra(corte_id=c3.id, nombre="Gabardina Gris", cantidad=100.0, precio_total=600.0, fecha_compra="2026-06-06"))
    db.add(InsumoCompra(corte_id=c3.id, nombre="Cierres e hilos", cantidad=1.0, precio_total=50.0, fecha_compra="2026-06-06"))
    db.commit()

    print("✅ Mocking completado exitosamente.")

except Exception as e:
    print(f"Error: {e}")
    db.rollback()
finally:
    db.close()
