import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

load_dotenv()
SQLALCHEMY_DATABASE_URL = os.getenv("SUPABASE_DB_URL", "sqlite:///./tailor.db")

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Distribuidor(Base):
    __tablename__ = "distribuidores"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)

class Trabajador(Base):
    __tablename__ = "trabajadores"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    saldo_pendiente = Column(Float, default=0.0)

class Corte(Base):
    __tablename__ = "cortes"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    quien_entrego = Column(String)
    fecha_recibido = Column(String)
    fecha_entrega = Column(String)
    estado = Column(String, default="Activo")
    
    tallas = relationship("TallaCorte", back_populates="corte", cascade="all, delete")
    telas = relationship("TelaCorte", back_populates="corte", cascade="all, delete")
    asignaciones = relationship("Asignacion", back_populates="corte")
    prendas = relationship("PrendaCorte", back_populates="corte", cascade="all, delete")

class TallaCorte(Base):
    __tablename__ = "tallas_corte"
    id = Column(Integer, primary_key=True, index=True)
    corte_id = Column(Integer, ForeignKey("cortes.id"))
    talla = Column(String)
    cantidad = Column(Integer)
    
    corte = relationship("Corte", back_populates="tallas")

class TelaCorte(Base):
    __tablename__ = "telas_corte"
    id = Column(Integer, primary_key=True, index=True)
    corte_id = Column(Integer, ForeignKey("cortes.id"))
    color = Column(String)
    cantidad_metros = Column(Float)
    
    corte = relationship("Corte", back_populates="telas")

class PrendaCorte(Base):
    __tablename__ = "prendas_corte"
    id = Column(Integer, primary_key=True, index=True)
    corte_id = Column(Integer, ForeignKey("cortes.id"))
    tipo_prenda = Column(String)
    tela_color = Column(String)
    talla = Column(String)
    cantidad_total = Column(Integer)
    cantidad_disponible = Column(Integer)
    
    corte = relationship("Corte", back_populates="prendas")

class CatalogoPrenda(Base):
    __tablename__ = "catalogo_prendas"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True)

class Asignacion(Base):
    __tablename__ = "asignaciones"
    id = Column(Integer, primary_key=True, index=True)
    corte_id = Column(Integer, ForeignKey("cortes.id"))
    trabajador_id = Column(Integer, ForeignKey("trabajadores.id"))
    tipo_prenda = Column(String, default="Prenda")
    tela_color = Column(String, default="")
    talla = Column(String, default="")
    cantidad = Column(Integer)
    estado = Column(String, default="Pendiente") # Pendiente, Completado
    pago_por_prenda = Column(Float)

    corte = relationship("Corte", back_populates="asignaciones")
    trabajador = relationship("Trabajador")

class InsumoCompra(Base):
    __tablename__ = "insumos_compra"
    id = Column(Integer, primary_key=True, index=True)
    corte_id = Column(Integer, ForeignKey("cortes.id"))
    nombre = Column(String)
    cantidad = Column(Float)
    precio_total = Column(Float, default=0.0)
    fecha_compra = Column(String)
    
    corte = relationship("Corte")

class InsumoAsignacion(Base):
    __tablename__ = "insumos_asignacion"
    id = Column(Integer, primary_key=True, index=True)
    asignacion_id = Column(Integer, ForeignKey("asignaciones.id"))
    nombre = Column(String)
    cantidad = Column(Float)
    
    asignacion = relationship("Asignacion")

class CatalogoMaestro(Base):
    __tablename__ = "catalogo_maestro"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True)

class HistorialActividad(Base):
    __tablename__ = "historial_actividad"
    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(String)
    accion = Column(String)
    descripcion = Column(String)
    entidad_tipo = Column(String)
    entidad_id = Column(Integer, nullable=True)

class PagosTrabajador(Base):
    __tablename__ = "pagos_trabajador"
    id = Column(Integer, primary_key=True, index=True)
    trabajador_id = Column(Integer, ForeignKey("trabajadores.id"))
    corte_id = Column(Integer, ForeignKey("cortes.id"), nullable=True)
    monto = Column(Float)
    fecha = Column(String)
    
    trabajador = relationship("Trabajador")
    corte = relationship("Corte")

class IngresosCorte(Base):
    __tablename__ = "ingresos_corte"
    id = Column(Integer, primary_key=True, index=True)
    corte_id = Column(Integer, ForeignKey("cortes.id"))
    monto = Column(Float)
    fecha = Column(String)
    descripcion = Column(String)
    
    corte = relationship("Corte")

Base.metadata.create_all(bind=engine)
