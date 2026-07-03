import os
from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import database

database.Base.metadata.create_all(bind=database.engine)

MASTER_PIN = os.getenv("MASTER_PIN", "1234")

def verify_pin(x_access_pin: str = Header(None)):
    if x_access_pin != MASTER_PIN:
        raise HTTPException(status_code=401, detail="Acceso denegado: PIN incorrecto")

app = FastAPI(title="Tailor Manager API", version="1.0", dependencies=[Depends(verify_pin)])

# Permitir CORS para que el frontend pueda conectarse sin problemas
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def registrar_actividad(db: Session, accion: str, descripcion: str, entidad_tipo: str = None, entidad_id: int = None):
    try:
        actividad = database.HistorialActividad(
            fecha=datetime.now().isoformat(),
            accion=accion,
            descripcion=descripcion,
            entidad_tipo=entidad_tipo,
            entidad_id=entidad_id
        )
        db.add(actividad)
        db.commit()
    except Exception as e:
        db.rollback()

@app.get("/")
def read_root():
    return {"message": "API de Tailor Manager funcionando correctamente"}

@app.get("/historial")
def get_historial(db: Session = Depends(get_db)):
    return db.query(database.HistorialActividad).order_by(database.HistorialActividad.id.desc()).all()

@app.get("/trabajadores/")
def get_trabajadores(db: Session = Depends(get_db)):
    return db.query(database.Trabajador).all()

# Esquemas (Pydantic)
class TallaCorteCreate(BaseModel):
    talla: str
    cantidad: int

class TelaCorteCreate(BaseModel):
    color: str
    cantidad_metros: float

class TelaCorteUpdate(BaseModel):
    cantidad_metros: float

class PrendaCorteCreate(BaseModel):
    tipo_prenda: str
    tela_color: str
    talla: str
    cantidad: int

class CorteCreate(BaseModel):
    nombre: str
    quien_entrego: str
    fecha_recibido: str
    fecha_entrega: str
    prendas: List[PrendaCorteCreate]

class TrabajadorCreate(BaseModel):
    nombre: str

class InsumoDetalleCreate(BaseModel):
    nombre: str
    cantidad: float
    precio_total: float = 0.0

class InsumoCompraMasivaCreate(BaseModel):
    corte_id: int
    fecha_compra: str
    insumos: List[InsumoDetalleCreate]

class InsumoEntregadoCreate(BaseModel):
    nombre: str
    cantidad: float

class AsignacionPrendaCreate(BaseModel):
    tipo_prenda: str = "Prenda"
    tela_color: str = ""
    talla: str = ""
    cantidad: int
    pago_por_prenda: float

class AsignacionMultiCreate(BaseModel):
    corte_id: int
    trabajador_id: int
    prendas: List[AsignacionPrendaCreate]
    insumos_entregados: List[InsumoEntregadoCreate] = []

class CorteEstadoUpdate(BaseModel):
    estado: str

class CantidadDevolver(BaseModel):
    cantidad: int

class CatalogoInsumoCreate(BaseModel):
    nombre: str

class UpdateNombre(BaseModel):
    nombre: str

class PagoTrabajadorCreate(BaseModel):
    trabajador_id: int
    monto: float
    fecha: str
    corte_id: Optional[int] = None

class IngresoCorteCreate(BaseModel):
    corte_id: int
    monto: float
    fecha: str
    descripcion: str

@app.post("/cortes/nuevo")
def crear_corte(c: CorteCreate, db: Session = Depends(get_db)):
    nuevo_corte = database.Corte(
        nombre=c.nombre,
        quien_entrego=c.quien_entrego,
        fecha_recibido=c.fecha_recibido,
        fecha_entrega=c.fecha_entrega
    )
    db.add(nuevo_corte)
    db.commit()
    db.refresh(nuevo_corte)

    for prenda in c.prendas:
        db.add(database.PrendaCorte(
            corte_id=nuevo_corte.id,
            tipo_prenda=prenda.tipo_prenda,
            tela_color=prenda.tela_color,
            talla=prenda.talla,
            cantidad_total=prenda.cantidad,
            cantidad_disponible=prenda.cantidad
        ))
        
        # También registrar en el catálogo de prendas si es nueva
        if not db.query(database.CatalogoPrenda).filter(database.CatalogoPrenda.nombre == prenda.tipo_prenda).first():
            db.add(database.CatalogoPrenda(nombre=prenda.tipo_prenda))
            
    db.commit()
    registrar_actividad(db, "Creación", f"Se creó el nuevo corte '{c.nombre}'.", "Corte", nuevo_corte.id)
    return {"mensaje": "Corte guardado correctamente", "id": nuevo_corte.id}

@app.put("/telas/{tela_id}")
def editar_tela(tela_id: int, tela_update: TelaCorteUpdate, db: Session = Depends(get_db)):
    tela = db.query(database.TelaCorte).filter(database.TelaCorte.id == tela_id).first()
    if not tela:
        raise HTTPException(status_code=404, detail="Tela no encontrada")
    tela.cantidad_metros = tela_update.cantidad_metros
    db.commit()
    registrar_actividad(db, "Actualización", f"Se actualizó la tela ID {tela_id}.", "Tela", tela_id)
    return {"mensaje": "Tela actualizada"}

@app.get("/cortes/activos")
def get_cortes_activos(db: Session = Depends(get_db)):
    return db.query(database.Corte).all()

@app.post("/trabajadores/nuevo")
def crear_trabajador(t: TrabajadorCreate, db: Session = Depends(get_db)):
    nuevo = database.Trabajador(nombre=t.nombre)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@app.post("/asignaciones/nueva")
def crear_asignacion(a: AsignacionMultiCreate, db: Session = Depends(get_db)):
    asig_ids = []
    
    # Validar primero todo el inventario
    for prenda in a.prendas:
        inv = db.query(database.PrendaCorte).filter(
            database.PrendaCorte.corte_id == a.corte_id,
            database.PrendaCorte.tipo_prenda == prenda.tipo_prenda,
            database.PrendaCorte.tela_color == prenda.tela_color,
            database.PrendaCorte.talla == prenda.talla
        ).first()
        
        if not inv or inv.cantidad_disponible < prenda.cantidad:
            raise HTTPException(status_code=400, detail=f"No hay suficiente inventario disponible para {prenda.tipo_prenda} ({prenda.tela_color}, {prenda.talla}). Solicitado: {prenda.cantidad}")
    
    for prenda in a.prendas:
        # Descontar del inventario
        inv = db.query(database.PrendaCorte).filter(
            database.PrendaCorte.corte_id == a.corte_id,
            database.PrendaCorte.tipo_prenda == prenda.tipo_prenda,
            database.PrendaCorte.tela_color == prenda.tela_color,
            database.PrendaCorte.talla == prenda.talla
        ).first()
        inv.cantidad_disponible -= prenda.cantidad
        
        if not db.query(database.CatalogoPrenda).filter(database.CatalogoPrenda.nombre == prenda.tipo_prenda).first():
            db.add(database.CatalogoPrenda(nombre=prenda.tipo_prenda))
        
        nueva_asig = database.Asignacion(
            corte_id=a.corte_id,
            trabajador_id=a.trabajador_id,
            tipo_prenda=prenda.tipo_prenda,
            tela_color=prenda.tela_color,
            talla=prenda.talla,
            cantidad=prenda.cantidad,
            pago_por_prenda=prenda.pago_por_prenda
        )
        db.add(nueva_asig)
        db.commit()
        db.refresh(nueva_asig)
        asig_ids.append(nueva_asig.id)
        
        for insumo in a.insumos_entregados:
            db.add(database.InsumoAsignacion(
                asignacion_id=nueva_asig.id,
                nombre=insumo.nombre,
                cantidad=insumo.cantidad
            ))
        db.commit()

    registrar_actividad(db, "Creación", f"Asignación múltiple para trabajador {a.trabajador_id}.", "Asignación", a.corte_id)
    return {"mensaje": "Trabajo y materiales asignados correctamente"}

@app.put("/asignaciones/{id}/devolver")
def devolver_asignacion(id: int, r: CantidadDevolver, db: Session = Depends(get_db)):
    asig = db.query(database.Asignacion).filter(database.Asignacion.id == id).first()
    if not asig: return {"error": "Asignación no encontrada"}
    if r.cantidad > asig.cantidad: return {"error": "Cantidad a devolver mayor a la asignada"}
    
    # Reintegrar inventario
    inv = db.query(database.PrendaCorte).filter(
        database.PrendaCorte.corte_id == asig.corte_id,
        database.PrendaCorte.tipo_prenda == asig.tipo_prenda,
        database.PrendaCorte.tela_color == asig.tela_color,
        database.PrendaCorte.talla == asig.talla
    ).first()
    
    if inv:
        inv.cantidad_disponible += r.cantidad
    
    asig.cantidad -= r.cantidad
    if asig.cantidad == 0:
        db.delete(asig)
    
    db.commit()
    registrar_actividad(db, "Devolución", f"Devolución de {r.cantidad} prendas de asignación {id}", "Asignación", id)
    return {"mensaje": "Devolución registrada e inventario reintegrado exitosamente"}

@app.put("/cortes/{id}/estado")
def actualizar_estado_corte(id: int, e: CorteEstadoUpdate, db: Session = Depends(get_db)):
    corte = db.query(database.Corte).filter(database.Corte.id == id).first()
    if not corte: raise HTTPException(status_code=404, detail="Corte no encontrado")
    corte.estado = e.estado
    db.commit()
    registrar_actividad(db, "Edición", f"Estado de corte {corte.nombre} cambiado a {e.estado}", "Corte", id)
    return {"mensaje": "Estado actualizado"}

@app.post("/insumos/comprar")
def registrar_compra_insumo(compra: InsumoCompraMasivaCreate, db: Session = Depends(get_db)):
    for insumo in compra.insumos:
        nuevo = database.InsumoCompra(
            corte_id=compra.corte_id,
            nombre=insumo.nombre,
            cantidad=insumo.cantidad,
            precio_total=insumo.precio_total,
            fecha_compra=compra.fecha_compra
        )
        db.add(nuevo)
    db.commit()
    registrar_actividad(db, "Creación", f"Se registraron insumos para el corte ID {compra.corte_id}.", "Insumos", compra.corte_id)
    return {"mensaje": "Compras registradas exitosamente"}

@app.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    cortes = db.query(database.Corte).all()
    resultado = []
    for c in cortes:
        asignaciones_db = db.query(database.Asignacion).filter(database.Asignacion.corte_id == c.id).all()
        asig_data = []
        for a in asignaciones_db:
            trab = db.query(database.Trabajador).filter(database.Trabajador.id == a.trabajador_id).first()
            asig_data.append({
                "id": a.id, 
                "trabajador": trab.nombre if trab else "N/A", 
                "cantidad": a.cantidad, 
                "tipo_prenda": a.tipo_prenda, 
                "tela_color": a.tela_color, 
                "talla": a.talla, 
                "pago_por_prenda": a.pago_por_prenda
            })
        
        total_prendas = sum([p.cantidad_total for p in c.prendas])
        total_asignado = sum([a.cantidad for a in asignaciones_db])
        
        resultado.append({
            "id": c.id,
            "nombre": c.nombre,
            "quien_entrego": c.quien_entrego,
            "fecha_entrega": c.fecha_entrega,
            "total_prendas": total_prendas,
            "total_asignado": total_asignado,
            "estado": c.estado,
            "asignaciones": asig_data,
            "prendas_corte": [{"id": p.id, "tipo_prenda": p.tipo_prenda, "tela_color": p.tela_color, "talla": p.talla, "cantidad_total": p.cantidad_total, "cantidad_disponible": p.cantidad_disponible} for p in c.prendas]
        })
    return resultado

@app.get("/catalogo_insumos")
def get_catalogo_insumos(db: Session = Depends(get_db)):
    return db.query(database.CatalogoMaestro).all()

@app.get("/catalogo_prendas")
def get_catalogo_prendas(db: Session = Depends(get_db)):
    return db.query(database.CatalogoPrenda).all()

@app.post("/catalogo_prendas/nuevo")
def crear_catalogo_prenda(c: CatalogoInsumoCreate, db: Session = Depends(get_db)):
    nuevo = database.CatalogoPrenda(nombre=c.nombre)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@app.put("/catalogo_prendas/{id}")
def actualizar_catalogo_prenda(id: int, p: UpdateNombre, db: Session = Depends(get_db)):
    item = db.query(database.CatalogoPrenda).filter(database.CatalogoPrenda.id == id).first()
    if item:
        item.nombre = p.nombre
        db.commit()
    return {"mensaje": "ok"}

@app.delete("/ingresos/{id}")
def eliminar_ingreso(id: int, db: Session = Depends(get_db)):
    ing = db.query(database.IngresosCorte).filter(database.IngresosCorte.id == id).first()
    if ing:
        db.delete(ing)
        db.commit()
    return {"mensaje": "Ingreso eliminado"}

@app.get("/cortes/{id}/resumen_financiero")
def resumen_financiero_corte(id: int, db: Session = Depends(get_db)):
    corte = db.query(database.Corte).filter(database.Corte.id == id).first()
    if not corte:
        raise HTTPException(status_code=404, detail="Corte no encontrado")
        
    # Calcular ingresos del distribuidor
    ingresos_db = db.query(database.IngresosCorte).filter(database.IngresosCorte.corte_id == id).all()
    ingresos_total = sum(i.monto for i in ingresos_db)
    
    # Calcular gastos en materiales
    insumos_db = db.query(database.InsumoCompra).filter(database.InsumoCompra.corte_id == id).all()
    costos_materiales = sum(i.precio_total for i in insumos_db)
    
    # Calcular costos de mano de obra
    asignaciones_db = db.query(database.Asignacion).filter(database.Asignacion.corte_id == id).all()
    costos_laborales = sum((a.cantidad * a.pago_por_prenda) for a in asignaciones_db)
    
    ganancia_neta = ingresos_total - costos_materiales - costos_laborales
    
    return {
        "ingresos_distribuidor": ingresos_total,
        "costos_materiales": costos_materiales,
        "detalle_materiales": [{"nombre": i.nombre, "cantidad": i.cantidad, "precio_total": i.precio_total, "fecha": i.fecha_compra} for i in insumos_db],
        "costos_laborales": costos_laborales,
        "ganancia_neta": ganancia_neta
    }

@app.post("/catalogo_insumos/nuevo")
def crear_catalogo_insumo(c: CatalogoInsumoCreate, db: Session = Depends(get_db)):
    nuevo = database.CatalogoMaestro(nombre=c.nombre)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@app.put("/catalogo_insumos/{id}")
def editar_catalogo_insumo(id: int, c: UpdateNombre, db: Session = Depends(get_db)):
    insumo = db.query(database.CatalogoMaestro).filter(database.CatalogoMaestro.id == id).first()
    if insumo:
        insumo.nombre = c.nombre
        db.commit()
        return {"mensaje": "Insumo actualizado"}
    return {"error": "No encontrado"}

@app.put("/trabajadores/{id}")
def editar_trabajador(id: int, t: UpdateNombre, db: Session = Depends(get_db)):
    trabajador = db.query(database.Trabajador).filter(database.Trabajador.id == id).first()
    if trabajador:
        trabajador.nombre = t.nombre
        db.commit()
        return {"mensaje": "Trabajador actualizado"}
    return {"error": "No encontrado"}

@app.get("/finanzas")
def get_finanzas(db: Session = Depends(get_db)):
    pagos = db.query(database.PagosTrabajador).all()
    ingresos = db.query(database.IngresosCorte).all()
    asignaciones = db.query(database.Asignacion).all()
    return {
        "pagos": pagos,
        "ingresos": ingresos,
        "asignaciones": asignaciones
    }

@app.post("/pagos/trabajador")
def registrar_pago(pago: PagoTrabajadorCreate, db: Session = Depends(get_db)):
    nuevo_pago = database.PagosTrabajador(
        trabajador_id=pago.trabajador_id,
        corte_id=pago.corte_id,
        monto=pago.monto,
        fecha=pago.fecha
    )
    db.add(nuevo_pago)
    db.commit()
    registrar_actividad(db, "Creación", f"Se registró pago de Bs. {pago.monto} para trabajador {pago.trabajador_id}.", "Pago", nuevo_pago.id)
    return {"mensaje": "Pago registrado"}

@app.delete("/pagos/{pago_id}")
def anular_pago(pago_id: int, db: Session = Depends(get_db)):
    pago = db.query(database.PagosTrabajador).filter(database.PagosTrabajador.id == pago_id).first()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    descripcion = f"Se anuló un pago de Bs. {pago.monto} de fecha {pago.fecha}."
    db.delete(pago)
    db.commit()
    registrar_actividad(db, "Anulación", descripcion, "Pago", pago_id)
    return {"mensaje": "Pago anulado correctamente"}

@app.post("/ingresos/corte")
def registrar_ingreso(ingreso: IngresoCorteCreate, db: Session = Depends(get_db)):
    nuevo = database.IngresosCorte(
        corte_id=ingreso.corte_id,
        monto=ingreso.monto,
        fecha=ingreso.fecha,
        descripcion=ingreso.descripcion
    )
    db.add(nuevo)
    db.commit()
    registrar_actividad(db, "Creación", f"Ingreso de Bs. {ingreso.monto} (Corte ID {ingreso.corte_id}).", "Ingreso", nuevo.id)
    return {"mensaje": "Ingreso registrado"}
