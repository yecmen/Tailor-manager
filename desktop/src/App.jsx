import { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const apiFetch = async (endpoint, options = {}) => {
  const pin = localStorage.getItem("master_pin");
  const headers = {
    ...options.headers,
    "X-Access-Pin": pin || ""
  };
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem("master_pin");
    window.location.reload();
    return new Promise(() => {});
  }
  return response;
};

function LoginScreen({ onLogin }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/`, {
        headers: { "X-Access-Pin": pin }
      });
      if (res.status === 200) {
        localStorage.setItem("master_pin", pin);
        onLogin();
      } else {
        setError("PIN Incorrecto");
      }
    } catch (err) {
      setError("Error de conexión con el servidor");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Acceso Privado</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input 
            type="password" 
            placeholder="Ingrese el PIN maestro" 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="border p-4 rounded-xl text-center text-2xl tracking-widest"
            autoFocus
          />
          {error && <p className="text-red-500 text-center font-bold">{error}</p>}
          <button type="submit" className="bg-blue-600 text-white p-4 rounded-xl font-bold text-xl hover:bg-blue-700">
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}


function CustomSelect({ value, onChange, options, placeholder = "Seleccione", className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value?.toString() === value?.toString());

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div 
        className="w-full h-full flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="text-gray-400 text-lg">▼</span>
      </div>
      {isOpen && (
        <ul className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto left-0 top-full">
          <li 
            className="p-4 hover:bg-gray-100 cursor-pointer text-gray-400 italic border-b border-gray-100 text-xl"
            onClick={() => { onChange(""); setIsOpen(false); }}
          >
            {placeholder}
          </li>
          {options.map((opt, idx) => (
            <li 
              key={idx}
              className={`p-4 hover:bg-blue-50 cursor-pointer text-xl text-gray-900 border-b border-gray-50 ${value?.toString() === opt.value?.toString() ? 'bg-blue-100 font-bold' : ''}`}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function App() {
  const [currentView, setCurrentView] = useState('menu');

  return (
    <div className="min-h-screen p-8 text-gray-900 bg-gray-50">
      <header className="mb-10 text-center relative max-w-4xl mx-auto flex justify-center items-center">
        <div>
          <h1 className="text-5xl font-black text-blue-700">Taller de Costura</h1>
          <p className="mt-2 text-2xl text-gray-600">Sistema de Administración</p>
        </div>
        {currentView === 'menu' && (
          <button 
            className="absolute right-0 bg-gray-200 hover:bg-gray-300 rounded-2xl p-4 shadow-sm border-2 border-gray-300 transition-colors"
            onClick={() => setCurrentView('historial_actividad')}
            title="Historial de Actividades (Bitácora)"
          >
            <span className="text-3xl">📜</span>
          </button>
        )}
      </header>

      {currentView === 'menu' && <MainMenu setView={setCurrentView} />}
      {currentView === 'distribuidor' && <DistribuidorForm setView={setCurrentView} />}
      {currentView === 'comprar_insumos' && <ComprarInsumosForm setView={setCurrentView} />}
      {currentView === 'trabajadores' && <RepartirTrabajoForm setView={setCurrentView} />}
      {currentView === 'dashboard' && <DashboardView setView={setCurrentView} />}
      {currentView === 'pagos' && <FinanzasView setView={setCurrentView} />}
      {currentView === 'historial_actividad' && <HistorialActividadView setView={setCurrentView} />}
    </div>
  );
}

function ResumenFinancieroModal({ corteId, nombreCorte, onClose }) {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);

  useEffect(() => {
    apiFetch(`/cortes/${corteId}/resumen_financiero`)
      .then(r => r.json())
      .then(data => { setResumen(data); setLoading(false); });
  }, [corteId]);

  if(loading) return <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"><div className="bg-white p-10 rounded-2xl text-2xl font-bold">Cargando...</div></div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl max-w-4xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 bg-gray-200 hover:bg-gray-300 rounded-full w-12 h-12 flex items-center justify-center font-bold text-2xl">❌</button>
        <h2 className="text-4xl font-black mb-6 text-gray-800 border-b-4 border-gray-200 pb-4">📊 Resumen Financiero: <span className="text-blue-600">{nombreCorte}</span></h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-200 shadow-sm">
            <p className="text-xl font-bold text-blue-600">Ingresos del Distribuidor (+)</p>
            <p className="text-4xl font-black text-blue-800">Bs. {resumen.ingresos_distribuidor.toFixed(2)}</p>
          </div>
          
          <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-200 shadow-sm relative">
            <p className="text-xl font-bold text-red-600">Costo en Materiales (-)</p>
            <p className="text-4xl font-black text-red-800">Bs. {resumen.costos_materiales.toFixed(2)}</p>
            <button onClick={() => setMostrarDetalles(!mostrarDetalles)} className="absolute top-4 right-4 bg-red-200 text-red-800 px-4 py-2 rounded-lg font-bold text-sm">
              {mostrarDetalles ? "Ocultar" : "Ver detalles"}
            </button>
          </div>
          
          <div className="bg-orange-50 p-6 rounded-2xl border-2 border-orange-200 shadow-sm">
            <p className="text-xl font-bold text-orange-600">Mano de Obra (Pagos/Deudas) (-)</p>
            <p className="text-4xl font-black text-orange-800">Bs. {resumen.costos_laborales.toFixed(2)}</p>
          </div>
          
          <div className={`p-6 rounded-2xl border-4 shadow-md ${resumen.ganancia_neta >= 0 ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'}`}>
            <p className={`text-2xl font-bold ${resumen.ganancia_neta >= 0 ? 'text-green-700' : 'text-red-700'}`}>Ganancia Neta (=)</p>
            <p className={`text-5xl font-black ${resumen.ganancia_neta >= 0 ? 'text-green-800' : 'text-red-800'}`}>Bs. {resumen.ganancia_neta.toFixed(2)}</p>
          </div>
        </div>

        {mostrarDetalles && (
          <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-200 animate-fade-in">
            <h3 className="text-2xl font-bold text-gray-700 mb-4 border-b-2 border-gray-200 pb-2">📋 Detalle de Materiales Comprados</h3>
            {resumen.detalle_materiales.length === 0 ? <p className="text-gray-500 italic text-xl">No hay materiales registrados.</p> : (
              <div className="space-y-3">
                {resumen.detalle_materiales.map((m, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div>
                      <p className="font-bold text-xl text-gray-800">{m.nombre}</p>
                      <p className="text-gray-500">{m.fecha} - Cantidad: {m.cantidad}</p>
                    </div>
                    <p className="font-black text-2xl text-red-600">-Bs. {m.precio_total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MainMenu({ setView }) {
  return (
    <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
      <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-12 px-8 rounded-3xl shadow-xl transform transition-transform active:scale-95 flex flex-col items-center justify-center space-y-4" onClick={() => setView('distribuidor')}>
        <span className="text-7xl">🧥</span>
        <span className="text-3xl text-center">Entrada de Tela<br/>(Distribuidor)</span>
      </button>

      <button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-12 px-8 rounded-3xl shadow-xl transform transition-transform active:scale-95 flex flex-col items-center justify-center space-y-4" onClick={() => setView('comprar_insumos')}>
        <span className="text-7xl">🪡🧵</span>
        <span className="text-3xl text-center">Comprar Material<br/>(Mercadería)</span>
      </button>

      <button className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-12 px-8 rounded-3xl shadow-xl transform transition-transform active:scale-95 flex flex-col items-center justify-center space-y-4" onClick={() => setView('trabajadores')}>
        <span className="text-7xl">✂️</span>
        <span className="text-3xl text-center">Repartir Trabajo<br/>a Costureros</span>
      </button>

      <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-12 px-8 rounded-3xl shadow-xl transform transition-transform active:scale-95 flex flex-col items-center justify-center space-y-4" onClick={() => setView('dashboard')}>
        <span className="text-7xl">📊</span>
        <span className="text-3xl text-center">Resumen y<br/>Cortes Activos</span>
      </button>

      <button className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-12 px-8 rounded-3xl shadow-xl transform transition-transform active:scale-95 flex flex-col items-center justify-center space-y-4 md:col-span-2" onClick={() => setView('pagos')}>
        <span className="text-7xl">💵</span>
        <span className="text-3xl text-center">Pagos</span>
      </button>
    </main>
  );
}

function PlaceholderView({ setView, title }) {
  return (
    <div className="max-w-3xl mx-auto bg-white p-10 rounded-3xl shadow-2xl">
      <button className="mb-8 bg-gray-200 hover:bg-gray-300 text-black font-bold py-4 px-8 rounded-xl text-2xl" onClick={() => setView('menu')}>⬅️ Volver al Menú</button>
      <h2 className="text-4xl font-bold mb-6">{title}</h2>
      <p className="text-2xl text-gray-500">Próximamente...</p>
    </div>
  );
}

function HistorialActividadView({ setView }) {
  const [historial, setHistorial] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  useEffect(() => {
    apiFetch("/historial").then(r => r.json()).then(data => setHistorial(data));
  }, []);

  const historialFiltrado = historial.filter(h => {
    const coincideTexto = (h.descripcion || '').toLowerCase().includes(filtroTexto.toLowerCase()) || 
                          (h.accion || '').toLowerCase().includes(filtroTexto.toLowerCase());
    const coincideFecha = filtroFecha ? h.fecha.startsWith(filtroFecha) : true;
    return coincideTexto && coincideFecha;
  });

  return (
    <div className="max-w-5xl mx-auto bg-white p-10 rounded-3xl shadow-2xl mb-20">
      <button className="mb-8 bg-gray-200 hover:bg-gray-300 text-black font-bold py-4 px-8 rounded-xl text-2xl" onClick={() => setView('menu')}>⬅️ Volver al Menú</button>
      <h2 className="text-5xl font-black mb-8 text-gray-800">📜 Historial de Actividades</h2>
      
      <div className="bg-gray-100 p-6 rounded-2xl mb-8 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xl font-bold text-gray-700 mb-2">Buscar en el registro</label>
          <input type="text" className="w-full text-2xl p-4 rounded-xl border-2 border-gray-300 bg-white" placeholder="Ej: Tela, Juan, Anulación..." value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} />
        </div>
        <div>
          <label className="block text-xl font-bold text-gray-700 mb-2">Filtrar por Fecha</label>
          <input type="date" className="w-full text-2xl p-4 rounded-xl border-2 border-gray-300 bg-white" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} />
        </div>
      </div>

      <div className="space-y-4">
        {historialFiltrado.length === 0 ? <p className="text-2xl text-gray-500 italic">No se encontraron actividades.</p> : 
          historialFiltrado.map(h => (
            <div key={h.id} className="bg-gray-50 p-6 rounded-2xl border-l-8 border-gray-400 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${h.accion === 'Creación' ? 'bg-green-500' : h.accion === 'Anulación' ? 'bg-red-500' : 'bg-blue-500'}`}>
                  {h.accion}
                </span>
                <span className="text-gray-500 font-bold">{new Date(h.fecha).toLocaleString()}</span>
              </div>
              <p className="text-2xl text-gray-800">{h.descripcion}</p>
              <p className="text-sm text-gray-400 mt-2">Módulo: {h.entidad_tipo}</p>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// COMPONENTE REUTILIZABLE PARA CATÁLOGOS CON EDICIÓN
function EditableSelect({ items, value, onChange, onAdd, onEdit, placeholder, themeColor = 'blue', showAdd = true }) {
  const [nuevo, setNuevo] = useState('');
  const [editando, setEditando] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  
  const handleEditClick = () => {
    if(!value) return;
    const item = items.find(i => i.id.toString() === value.toString());
    if(item) { setEditNombre(item.nombre); setEditando(true); }
  };

  const saveEdit = () => {
    if(editNombre.trim()) { onEdit(value, editNombre); }
    setEditando(false);
  };

  return (
    <div className="space-y-4">
      {showAdd && (
        <div className={`flex gap-2 w-full bg-white p-2 border-2 border-${themeColor}-200 rounded-xl items-center`}>
          <input type="text" placeholder="Añadir nuevo al catálogo..." className="flex-1 min-w-0 p-2 text-xl outline-none" value={nuevo} onChange={e => setNuevo(e.target.value)} />
          <button onClick={() => { onAdd(nuevo); setNuevo(''); }} className={`shrink-0 bg-${themeColor}-600 hover:bg-${themeColor}-500 text-white font-bold px-4 py-2 rounded-lg text-lg flex items-center justify-center gap-2`}><span className="text-2xl font-black">+</span> Añadir</button>
        </div>
      )}
      
      {editando ? (
        <div className="flex gap-2 bg-white p-2 border-2 border-gray-300 rounded-xl">
          <input type="text" className="flex-1 p-2 text-xl outline-none" value={editNombre} onChange={e => setEditNombre(e.target.value)} />
          <button onClick={saveEdit} className={`bg-${themeColor}-600 text-white font-bold px-4 rounded-lg text-lg`}>Guardar 💾</button>
          <button onClick={() => setEditando(false)} className="bg-gray-300 text-black font-bold px-4 rounded-lg text-lg">X</button>
        </div>
      ) : (
        <div className="flex items-center gap-2 relative">
        <CustomSelect 
          className={`flex-1 text-2xl p-4 border-2 border-${themeColor}-200 rounded-xl bg-white`}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          options={items.map(i => ({ value: i.id, label: i.nombre }))}
        />
          <button onClick={handleEditClick} disabled={!value} className={`bg-gray-200 hover:bg-gray-300 text-black font-bold px-4 rounded-xl text-xl disabled:opacity-50`}>
            ✏️ Editar
          </button>
        </div>
      )}
    </div>
  );
}

function DistribuidorForm({ setView }) {
  const [nombre, setNombre] = useState('');
  const [quienEntrego, setQuienEntrego] = useState('');
  const [fechaRecibido, setFechaRecibido] = useState(new Date().toISOString().split('T')[0]);
  const [fechaEntrega, setFechaEntrega] = useState('');
  
  const [prendasCortadas, setPrendasCortadas] = useState([{ tipoPrenda: '', telaColor: '', talla: '', cantidad: '' }]);
  const [tipoTalla, setTipoTalla] = useState('numerico');
  const [guardando, setGuardando] = useState(false);
  const [catalogoPrendas, setCatalogoPrendas] = useState([]);
  const [catalogoTelas, setCatalogoTelas] = useState([]);

  useEffect(() => {
    apiFetch("/catalogo_prendas").then(r => r.json()).then(data => setCatalogoPrendas(data)).catch(() => setCatalogoPrendas([]));
    apiFetch("/catalogo_insumos").then(r => r.json()).then(data => setCatalogoTelas(data)).catch(() => setCatalogoTelas([]));
  }, []);

  const opcionesTallas = tipoTalla === 'alfabetico' 
    ? ['XS', 'S', 'M', 'L', 'XL', 'XXL'] 
    : Array.from({length: 19}, (_, i) => (i + 30).toString());

  const agregarPrenda = () => setPrendasCortadas([...prendasCortadas, { tipoPrenda: '', telaColor: '', talla: opcionesTallas[0], cantidad: '' }]);
  const eliminarPrenda = (idx) => setPrendasCortadas(prendasCortadas.filter((_, i) => i !== idx));

  const actualizarPrenda = (index, campo, valor) => {
    const nuevas = [...prendasCortadas];
    nuevas[index][campo] = valor;
    setPrendasCortadas(nuevas);
  };

  const addPrendaCat = async (nombre) => {
    const res = await apiFetch("/catalogo_prendas/nuevo", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre })
    });
    if(res.ok) {
      const data = await res.json();
      setCatalogoPrendas([...catalogoPrendas, data]);
    }
  };

  const editPrendaCat = async (id, nombre) => {
    const res = await apiFetch(`/catalogo_prendas/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre })
    });
    if(res.ok) {
      const n = [...catalogoPrendas];
      const idx = n.findIndex(c => c.id.toString() === id.toString());
      if(idx > -1) { n[idx].nombre = nombre; setCatalogoPrendas(n); }
    }
  };

  const addTelaCat = async (nombre) => {
    const res = await apiFetch("/catalogo_insumos/nuevo", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre })
    });
    if(res.ok) {
      const data = await res.json();
      setCatalogoTelas([...catalogoTelas, data]);
    }
  };

  const editTelaCat = async (id, nombre) => {
    const res = await apiFetch(`/catalogo_insumos/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre })
    });
    if(res.ok) {
      const n = [...catalogoTelas];
      const idx = n.findIndex(c => c.id.toString() === id.toString());
      if(idx > -1) { n[idx].nombre = nombre; setCatalogoTelas(n); }
    }
  };

  const guardarCorte = async () => {
    if(!nombre || !quienEntrego || !fechaRecibido || !fechaEntrega) { alert("Por favor completa los datos principales."); return; }
    
    const prendasValidas = prendasCortadas.filter(p => p.tipoPrenda && p.telaColor && p.talla && p.cantidad).map(p => {
      const prendaSelec = catalogoPrendas.find(c => c.id.toString() === p.tipoPrenda.toString());
      const telaSelec = catalogoTelas.find(c => c.id.toString() === p.telaColor.toString());
      return {
        tipo_prenda: prendaSelec ? prendaSelec.nombre : "Prenda",
        tela_color: telaSelec ? telaSelec.nombre : "Tela",
        talla: p.talla,
        cantidad: parseInt(p.cantidad)
      };
    });

    if (prendasValidas.length === 0 || prendasValidas.length !== prendasCortadas.length) { 
      alert("Por favor llena TODOS los campos (Prenda, Tela, Talla, Cantidad) de cada prenda cortada."); 
      return; 
    }

    setGuardando(true);
    try {
      const response = await apiFetch("/cortes/nuevo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, quien_entrego: quienEntrego, fecha_recibido: fechaRecibido, fecha_entrega: fechaEntrega, prendas: prendasValidas })
      });
      if(response.ok) { alert("✅ ¡Corte guardado exitosamente!"); setView('menu'); } 
      else alert("❌ Hubo un error al guardar.");
    } catch (e) { alert("❌ Error de conexión."); }
    setGuardando(false);
  };

  useEffect(() => {
    const nuevas = prendasCortadas.map(p => ({...p, talla: opcionesTallas[0]}));
    setPrendasCortadas(nuevas);
  }, [tipoTalla]);

  return (
    <div className="max-w-4xl mx-auto bg-white p-10 rounded-3xl shadow-2xl mb-20">
      <button className="mb-8 bg-gray-200 hover:bg-gray-300 text-black font-bold py-4 px-8 rounded-xl text-2xl" onClick={() => setView('menu')}>⬅️ Volver</button>
      <h2 className="text-5xl font-black mb-8 text-blue-700">📦 Registrar Tela del Distribuidor</h2>
      
      <div className="space-y-8">
        <div className="bg-blue-50 p-6 rounded-2xl space-y-6">
          <h3 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-200 pb-2">Datos Principales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-2xl font-bold mb-2">Nombre del Corte</label><input type="text" className="w-full text-2xl p-4 border-2 border-gray-300 rounded-xl" value={nombre} onChange={e => setNombre(e.target.value)} /></div>
            <div><label className="block text-2xl font-bold mb-2">Entregado por</label><input type="text" className="w-full text-2xl p-4 border-2 border-gray-300 rounded-xl" value={quienEntrego} onChange={e => setQuienEntrego(e.target.value)} /></div>
            <div><label className="block text-2xl font-bold mb-2">Fecha Recibido</label><input type="date" className="w-full text-2xl p-4 border-2 border-gray-300 rounded-xl" value={fechaRecibido} onChange={e => setFechaRecibido(e.target.value)} /></div>
            <div><label className="block text-2xl font-bold mb-2">Fecha Límite</label><input type="date" className="w-full text-2xl p-4 border-2 border-gray-300 rounded-xl" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} /></div>
          </div>
        </div>

        <div className="bg-purple-50 p-6 rounded-2xl space-y-6">
          <div className="flex justify-between items-center border-b-2 border-purple-200 pb-2">
            <h3 className="text-3xl font-bold text-purple-900">Prendas Cortadas (Inventario del Corte)</h3>
            <div className="flex bg-purple-200 rounded-xl overflow-hidden">
              <button onClick={() => setTipoTalla('alfabetico')} className={`px-4 py-2 font-bold text-xl ${tipoTalla === 'alfabetico' ? 'bg-purple-600 text-white' : 'text-purple-900'}`}>S, M, L</button>
              <button onClick={() => setTipoTalla('numerico')} className={`px-4 py-2 font-bold text-xl ${tipoTalla === 'numerico' ? 'bg-purple-600 text-white' : 'text-purple-900'}`}>30 al 48</button>
            </div>
          </div>
          
          <div className="space-y-6">
            {prendasCortadas.map((prenda, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border-2 border-purple-200 shadow-sm relative grid grid-cols-1 md:grid-cols-2 gap-4">
                {prendasCortadas.length > 1 && (
                  <button onClick={() => eliminarPrenda(idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl">❌</button>
                )}
                
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div className="flex gap-2 w-full bg-white p-2 border-2 border-purple-200 rounded-xl items-center">
                    <input type="text" placeholder="Añadir prenda al catálogo..." className="flex-1 min-w-0 p-2 text-xl outline-none" id={`add-prenda-corte-${idx}`} />
                    <button onClick={() => { 
                        const input = document.getElementById(`add-prenda-corte-${idx}`);
                        if(input.value) { addPrendaCat(input.value); input.value = ''; } 
                    }} className="shrink-0 bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-lg text-lg flex items-center justify-center gap-2">
                      <span className="text-2xl font-black">+</span> Añadir
                    </button>
                  </div>
                  <div className="flex gap-2 w-full bg-white p-2 border-2 border-purple-200 rounded-xl items-center">
                    <input type="text" placeholder="Añadir tela al catálogo..." className="flex-1 min-w-0 p-2 text-xl outline-none" id={`add-tela-corte-${idx}`} />
                    <button onClick={() => { 
                        const input = document.getElementById(`add-tela-corte-${idx}`);
                        if(input.value) { addTelaCat(input.value); input.value = ''; } 
                    }} className="shrink-0 bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-lg text-lg flex items-center justify-center gap-2">
                      <span className="text-2xl font-black">+</span> Añadir
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-lg font-bold mb-1 text-purple-900">Tipo de Prenda</label>
                  <EditableSelect items={catalogoPrendas} value={prenda.tipoPrenda} onChange={v => actualizarPrenda(idx, 'tipoPrenda', v)} onEdit={editPrendaCat} placeholder="Seleccionar prenda" themeColor="purple" showAdd={false} />
                </div>
                <div>
                  <label className="block text-lg font-bold mb-1 text-purple-900">Tela/Color</label>
                  <EditableSelect items={catalogoTelas} value={prenda.telaColor} onChange={v => actualizarPrenda(idx, 'telaColor', v)} onEdit={editTelaCat} placeholder="Seleccionar tela" themeColor="purple" showAdd={false} />
                </div>
                <div>
                  <label className="block text-lg font-bold mb-1 text-purple-900">Talla</label>
                  <CustomSelect options={opcionesTallas.map(t => ({value: t, label: t}))} value={prenda.talla} onChange={v => actualizarPrenda(idx, 'talla', v)} placeholder="Seleccionar talla" className="w-full text-xl p-3 border-2 border-purple-200 rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block text-lg font-bold mb-1 text-purple-900">Cantidad Cortada</label>
                  <input type="number" className="w-full text-xl p-4 border-2 border-purple-200 rounded-xl bg-white" placeholder="Ej: 20" value={prenda.cantidad} onChange={e => actualizarPrenda(idx, 'cantidad', e.target.value)} />
                </div>
              </div>
            ))}
          </div>
          <button onClick={agregarPrenda} className="w-full bg-purple-200 text-purple-900 font-bold py-4 px-6 rounded-xl text-2xl">➕ Añadir otra prenda al corte</button>
        </div>

        <button disabled={guardando} onClick={guardarCorte} className="w-full bg-green-600 text-white font-black py-8 rounded-3xl text-4xl">{guardando ? "⏳ Guardando..." : "✅ Guardar Nuevo Corte"}</button>
      </div>
    </div>
  );
}

function ComprarInsumosForm({ setView }) {
  const [cortes, setCortes] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [corteId, setCorteId] = useState('');
  const [insumos, setInsumos] = useState([{ nombre: '', cantidad: '', precio_total: '' }]);
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().split('T')[0]);
  const [guardando, setGuardando] = useState(false);
  const [nuevoCat, setNuevoCat] = useState('');

  useEffect(() => {
    apiFetch("/cortes/activos").then(r => r.json()).then(data => setCortes(data));
    apiFetch("/catalogo_insumos").then(r => r.json()).then(data => setCatalogo(data));
  }, []);

  const agregarInsumo = () => setInsumos([...insumos, { nombre: '', cantidad: '' }]);
  const actualizarInsumo = (index, campo, valor) => {
    const nuevos = [...insumos];
    nuevos[index][campo] = valor;
    setInsumos(nuevos);
  };

  const addCatalogo = async (nombre) => {
    if(!nombre) return;
    const r = await apiFetch("/catalogo_insumos/nuevo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre }) });
    if(r.ok) {
      const nw = await r.json();
      setCatalogo([...catalogo, nw]);
      setNuevoCat('');
      alert("✅ Añadido al catálogo");
    }
  };

  const editCatalogo = async (id, nombre) => {
    const r = await apiFetch(`/catalogo_insumos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre }) });
    if(r.ok) {
      setCatalogo(catalogo.map(c => c.id.toString() === id.toString() ? {...c, nombre} : c));
      alert("✏️ Actualizado exitosamente");
    }
  };

  const guardarCompra = async () => {
    if(!corteId) { alert("Selecciona un Corte primero."); return; }
    const insumosValidos = insumos.filter(i => i.nombre && i.cantidad).map(i => {
      const catItem = catalogo.find(c => c.id.toString() === i.nombre.toString());
      return { nombre: catItem ? catItem.nombre : '', cantidad: parseFloat(i.cantidad), precio_total: parseFloat(i.precio_total) || 0.0 };
    }).filter(i => i.nombre !== '');
    
    if(insumosValidos.length === 0) { alert("Añade al menos un material con cantidad válida."); return; }

    setGuardando(true);
    const r = await apiFetch("/insumos/comprar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corte_id: parseInt(corteId), fecha_compra: fechaCompra, insumos: insumosValidos })
    });
    if(r.ok) {
      alert("🛍️ ¡Todas las compras registradas con éxito!");
      setInsumos([{ nombre: '', cantidad: '', precio_total: '' }]);
    }
    setGuardando(false);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-10 rounded-3xl shadow-2xl mb-20">
      <button className="mb-8 bg-gray-200 hover:bg-gray-300 text-black font-bold py-4 px-8 rounded-xl text-2xl" onClick={() => setView('menu')}>⬅️ Volver</button>
      <h2 className="text-5xl font-black mb-8 text-red-600">🪡🧵 Registrar Material (Mercadería)</h2>
      <div className="space-y-6 bg-red-50 p-6 rounded-2xl">
        <div>
          <label className="block text-2xl font-bold mb-2 text-red-900">¿Para qué Corte se compró?</label>
          <CustomSelect 
            className="w-full text-2xl p-4 border-2 border-red-200 rounded-xl bg-white"
            value={corteId}
            onChange={setCorteId}
            placeholder="-- Selecciona un Corte --"
            options={cortes.filter(c => c.estado !== 'Entregado').map(c => ({ value: c.id, label: c.nombre }))}
          />
        </div>

        <div>
          <label className="block text-2xl font-bold mb-2 text-red-900">Fecha de las compras</label>
          <input type="date" className="w-full text-2xl p-4 border-2 border-red-200 rounded-xl bg-white" value={fechaCompra} onChange={e => setFechaCompra(e.target.value)} />
        </div>

        <div className="pt-4 border-t-2 border-red-200">
          <label className="block text-2xl font-bold mb-4 text-red-900">Insumos Comprados (Catálogo)</label>
          
          <div className="mb-6 flex gap-2 bg-white p-2 border-2 border-red-200 rounded-xl">
            <input type="text" placeholder="Añadir nuevo al catálogo maestro..." className="flex-1 p-2 text-xl outline-none" value={nuevoCat} onChange={e => setNuevoCat(e.target.value)} />
            <button onClick={() => addCatalogo(nuevoCat)} className="bg-red-200 hover:bg-red-300 text-red-900 font-bold px-4 rounded-lg text-lg">➕ Añadir al Catálogo</button>
          </div>

          <div className="space-y-4">
            {insumos.map((insumo, index) => (
              <div key={index} className="flex gap-4 items-start">
                <div className="flex-[2]">
                  <EditableSelect items={catalogo} value={insumo.nombre} onChange={val => actualizarInsumo(index, 'nombre', val)} onEdit={editCatalogo} placeholder="-- Selecciona Material --" themeColor="red" showAdd={false} />
                </div>
                <div className="flex-1">
                  <input type="number" className="w-full h-16 text-xl p-4 border-2 border-red-200 rounded-xl bg-white" placeholder="Cant." value={insumo.cantidad} onChange={e => actualizarInsumo(index, 'cantidad', e.target.value)} />
                </div>
                <div className="flex-1">
                  <input type="number" className="w-full h-16 text-xl p-4 border-2 border-red-200 rounded-xl bg-white" placeholder="Precio (Bs)" value={insumo.precio_total} onChange={e => actualizarInsumo(index, 'precio_total', e.target.value)} />
                </div>
              </div>
            ))}
            <div className="mt-4 bg-red-100 p-4 rounded-xl border-2 border-red-200 flex justify-between items-center shadow-inner">
              <label className="text-xl font-bold text-red-800">Costo Total (Bs.)</label>
              <p className="text-3xl font-black text-red-700">Bs. {insumos.reduce((acc, i) => acc + (parseFloat(i.precio_total) || 0), 0).toFixed(2)}</p>
            </div>
            <button onClick={agregarInsumo} className="bg-red-200 text-red-900 font-bold py-3 px-6 rounded-xl text-xl mt-4">➕ Añadir otra fila</button>
          </div>
        </div>

        <button disabled={guardando} onClick={guardarCompra} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-6 rounded-2xl text-3xl mt-8">
          {guardando ? "⏳ Registrando en lote..." : "📥 Guardar Todo"}
        </button>
      </div>
    </div>
  );
}

function RepartirTrabajoForm({ setView }) {
  const [cortes, setCortes] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  
  const [corteId, setCorteId] = useState('');
  const [trabajadorId, setTrabajadorId] = useState('');
  
  const [catalogoPrendas, setCatalogoPrendas] = useState([]);
  const [prendasAsignadas, setPrendasAsignadas] = useState([{ tipoPrenda: '', telaColor: '', talla: '', cantidad: '', pagoPorPrenda: '' }]);
  
  const [insumosEntregados, setInsumosEntregados] = useState([{ nombre: '', cantidad: '' }]);
  const [guardando, setGuardando] = useState(false);
  const [nuevoCat, setNuevoCat] = useState('');

  const agregarPrenda = () => setPrendasAsignadas([...prendasAsignadas, { tipoPrenda: '', telaColor: '', talla: '', cantidad: '', pagoPorPrenda: '' }]);
  const actualizarPrenda = (index, campo, valor) => {
    const nuevas = [...prendasAsignadas];
    nuevas[index][campo] = valor;
    setPrendasAsignadas(nuevas);
  };
  const eliminarPrenda = (index) => {
    const nuevas = prendasAsignadas.filter((_, i) => i !== index);
    setPrendasAsignadas(nuevas.length ? nuevas : [{ tipoPrenda: '', telaColor: '', talla: '', cantidad: '', pagoPorPrenda: '' }]);
  };

  useEffect(() => {
    apiFetch("/dashboard").then(r => r.json()).then(data => setCortes(data));
    apiFetch("/trabajadores/").then(r => r.json()).then(data => setTrabajadores(data));
    apiFetch("/catalogo_insumos").then(r => r.json()).then(data => setCatalogo(data));
    apiFetch("/catalogo_prendas").then(r => r.json()).then(data => setCatalogoPrendas(data)).catch(() => setCatalogoPrendas([]));
  }, []);

  const agregarInsumo = () => setInsumosEntregados([...insumosEntregados, { nombre: '', cantidad: '' }]);
  const actualizarInsumo = (index, campo, valor) => {
    const nuevos = [...insumosEntregados];
    nuevos[index][campo] = valor;
    setInsumosEntregados(nuevos);
  };

  const addCatalogo = async (nombre) => {
    if(!nombre) return;
    const r = await apiFetch("/catalogo_insumos/nuevo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre }) });
    if(r.ok) {
      const nw = await r.json();
      setCatalogo([...catalogo, nw]);
      setNuevoCat('');
      alert("✅ Añadido al catálogo");
    }
  };
  const editCatalogo = async (id, nombre) => {
    const r = await apiFetch(`/catalogo_insumos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre }) });
    if(r.ok) {
      setCatalogo(catalogo.map(c => c.id.toString() === id.toString() ? {...c, nombre} : c));
      alert("✏️ Insumo actualizado");
    }
  };

  const addPrendaCat = async (nombre) => {
    if(!nombre) return;
    const r = await apiFetch("/catalogo_prendas/nuevo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre }) });
    if(r.ok) {
      const nw = await r.json();
      setCatalogoPrendas([...catalogoPrendas, nw]);
      // setTipoPrenda ya no aplica directo, dependería del index, 
      // pero el usuario puede seleccionarlo de la lista.
      alert("✅ Añadido al catálogo de prendas");
    }
  };

  const editPrendaCat = async (id, nombre) => {
    const r = await apiFetch(`/catalogo_prendas/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre }) });
    if(r.ok) {
      setCatalogoPrendas(catalogoPrendas.map(c => c.id.toString() === id.toString() ? {...c, nombre} : c));
      alert("✏️ Prenda actualizada");
    }
  };

  const addTrabajador = async (nombre) => {
    if(!nombre) return;
    const r = await apiFetch("/trabajadores/nuevo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre }) });
    if(r.ok) {
      const nw = await r.json();
      setTrabajadores([...trabajadores, nw]);
      setTrabajadorId(nw.id);
      alert("✅ Costurero añadido");
    }
  };
  const editTrabajador = async (id, nombre) => {
    const r = await apiFetch(`/trabajadores/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre }) });
    if(r.ok) {
      setTrabajadores(trabajadores.map(c => c.id.toString() === id.toString() ? {...c, nombre} : c));
      alert("✏️ Costurero actualizado");
    }
  };

  const guardarAsignacion = async () => {
    if(!corteId || !trabajadorId) { alert("Selecciona corte y costurero"); return; }
    
    const prendasValidas = prendasAsignadas.filter(p => p.tipoPrenda && p.cantidad && p.pagoPorPrenda && p.telaColor && p.talla).map(p => {
      return {
        tipo_prenda: p.tipoPrenda,
        tela_color: p.telaColor,
        talla: p.talla,
        cantidad: parseInt(p.cantidad),
        pago_por_prenda: parseFloat(p.pagoPorPrenda)
      };
    });
    
    if (prendasValidas.length === 0 || prendasValidas.length !== prendasAsignadas.length) { 
      alert("Por favor llena TODOS los campos requeridos (Prenda, Tela, Talla, Cantidad, Pago) de cada prenda asignada."); 
      return; 
    }
    
    const insumosValidos = insumosEntregados.filter(i => i.nombre && i.cantidad).map(i => {
      const catItem = catalogo.find(c => c.id.toString() === i.nombre.toString());
      return { nombre: catItem ? catItem.nombre : '', cantidad: parseFloat(i.cantidad) };
    }).filter(i => i.nombre !== '');

    setGuardando(true);
    const r = await apiFetch("/asignaciones/nueva", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        corte_id: parseInt(corteId), 
        trabajador_id: parseInt(trabajadorId), 
        prendas: prendasValidas,
        insumos_entregados: insumosValidos
      })
    });
    if(r.ok) { alert("✂️ ¡Trabajo asignado exitosamente!"); setView('menu'); } 
    else alert("Hubo un error");
    setGuardando(false);
  };

  const cortesActivos = cortes.filter(c => c.estado !== 'Entregado');
  const corteSeleccionado = cortes.find(c => c.id.toString() === corteId.toString());

  const getPrendaOptions = () => {
    if(!corteSeleccionado || !corteSeleccionado.prendas_corte) return [];
    const unicos = [...new Set(corteSeleccionado.prendas_corte.map(p => p.tipo_prenda))];
    return unicos.map(u => ({ value: u, label: u }));
  };

  const getTelaOptions = (tipoPrenda) => {
    if(!corteSeleccionado || !corteSeleccionado.prendas_corte || !tipoPrenda) return [];
    const telas = corteSeleccionado.prendas_corte.filter(p => p.tipo_prenda === tipoPrenda).map(p => p.tela_color);
    const unicos = [...new Set(telas)];
    return unicos.map(u => ({ value: u, label: u }));
  };

  const getTallaOptions = (tipoPrenda, telaColor) => {
    if(!corteSeleccionado || !corteSeleccionado.prendas_corte || !tipoPrenda || !telaColor) return [];
    const tallas = corteSeleccionado.prendas_corte.filter(p => p.tipo_prenda === tipoPrenda && p.tela_color === telaColor).map(p => p.talla);
    const unicos = [...new Set(tallas)];
    return unicos.map(u => ({ value: u, label: u }));
  };

  const getMaxDisponibles = (tipoPrenda, telaColor, talla) => {
    if(!corteSeleccionado || !corteSeleccionado.prendas_corte) return 0;
    const inv = corteSeleccionado.prendas_corte.find(p => p.tipo_prenda === tipoPrenda && p.tela_color === telaColor && p.talla === talla);
    return inv ? inv.cantidad_disponible : 0;
  };

  return (
    <div className="max-w-5xl mx-auto bg-white p-10 rounded-3xl shadow-2xl mb-20">
      <button className="mb-8 bg-gray-200 hover:bg-gray-300 text-black font-bold py-4 px-8 rounded-xl text-2xl flex items-center" onClick={() => setView('menu')}>⬅️ Volver</button>
      <h2 className="text-5xl font-black mb-8 text-orange-600">✂️ Repartir Trabajo</h2>
      
      <div className="space-y-8">
        <div className="bg-orange-50 p-6 rounded-2xl space-y-6">
          <div>
            <label className="block text-2xl font-bold mb-2 text-orange-900">1. ¿A qué Corte pertenece la ropa?</label>
            <CustomSelect 
              className="w-full text-2xl p-4 border-2 border-orange-200 rounded-xl bg-white"
              value={corteId}
              onChange={setCorteId}
              placeholder="-- Selecciona el Corte --"
              options={cortesActivos.map(c => ({ value: c.id, label: c.nombre }))}
            />
          </div>

          <div>
            <label className="block text-2xl font-bold mb-2 text-orange-900">¿A qué Costurero se le asigna?</label>
            <EditableSelect items={trabajadores} value={trabajadorId} onChange={setTrabajadorId} onAdd={addTrabajador} onEdit={editTrabajador} placeholder="-- Selecciona Costurero --" themeColor="orange" />
          </div>

          <div className="pt-4 border-t-2 border-orange-200">
            <h3 className="text-3xl font-bold mb-4 text-orange-900">Prendas a Asignar</h3>
            <div className="space-y-4">
              {prendasAsignadas.map((prenda, idx) => {
                const disponibles = getMaxDisponibles(prenda.tipoPrenda, prenda.telaColor, prenda.talla);
                return (
                  <div key={idx} className="bg-white p-6 rounded-2xl border-2 border-orange-200 shadow-sm relative grid grid-cols-1 md:grid-cols-2 gap-4">
                    {prendasAsignadas.length > 1 && (
                      <button onClick={() => eliminarPrenda(idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl">❌</button>
                    )}
                    
                    <div>
                      <label className="block text-lg font-bold mb-1 text-orange-900">Tipo de Prenda</label>
                      <CustomSelect options={getPrendaOptions()} value={prenda.tipoPrenda} onChange={v => { actualizarPrenda(idx, 'tipoPrenda', v); actualizarPrenda(idx, 'telaColor', ''); actualizarPrenda(idx, 'talla', ''); actualizarPrenda(idx, 'cantidad', ''); }} placeholder="Seleccionar prenda" className="w-full text-xl p-3 border-2 border-orange-200 rounded-xl bg-white" />
                    </div>
                    
                    <div>
                      <label className="block text-lg font-bold mb-1 text-orange-900">Tela/Color</label>
                      <CustomSelect options={getTelaOptions(prenda.tipoPrenda)} value={prenda.telaColor} onChange={v => { actualizarPrenda(idx, 'telaColor', v); actualizarPrenda(idx, 'talla', ''); actualizarPrenda(idx, 'cantidad', ''); }} placeholder="Seleccionar tela" className="w-full text-xl p-3 border-2 border-orange-200 rounded-xl bg-white" />
                    </div>

                    <div>
                      <label className="block text-lg font-bold mb-1 text-orange-900">Talla</label>
                      <CustomSelect options={getTallaOptions(prenda.tipoPrenda, prenda.telaColor)} value={prenda.talla} onChange={v => { actualizarPrenda(idx, 'talla', v); actualizarPrenda(idx, 'cantidad', ''); }} placeholder="Seleccionar talla" className="w-full text-xl p-3 border-2 border-orange-200 rounded-xl bg-white" />
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-lg font-bold mb-1 text-orange-900">Cantidad {prenda.talla && `(Disponibles: ${disponibles})`}</label>
                        <input type="number" max={disponibles} className="w-full text-xl p-3 border-2 border-orange-200 rounded-xl bg-white" placeholder={`Ej: ${disponibles > 0 ? disponibles : 20}`} value={prenda.cantidad} onChange={e => {
                          let val = parseInt(e.target.value);
                          if(val > disponibles) {
                            alert(`Solo hay ${disponibles} disponibles de este artículo.`);
                            val = disponibles;
                          }
                          actualizarPrenda(idx, 'cantidad', isNaN(val) ? '' : val);
                        }} />
                      </div>
                      <div className="flex-1">
                      <label className="block text-lg font-bold mb-1 text-orange-900">Pago c/u (Bs)</label>
                      <input type="number" step="0.5" className="w-full text-xl p-3 border-2 border-orange-200 rounded-xl bg-white" placeholder="Ej: 5.50" value={prenda.pagoPorPrenda} onChange={e => actualizarPrenda(idx, 'pagoPorPrenda', e.target.value)} />
                    </div>
                    </div>
                  </div>
                );
              })}
              <button onClick={agregarPrenda} className="w-full bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold py-3 rounded-xl border-2 border-orange-300">➕ Añadir otra prenda</button>
            </div>
            
            <div className="mt-6 bg-orange-100 p-6 rounded-2xl border-2 border-orange-300 flex justify-between items-center shadow-inner">
              <label className="text-2xl font-bold text-orange-800">Subtotal Global a Pagar</label>
              <p className="text-5xl font-black text-orange-700">Bs. {prendasAsignadas.reduce((acc, p) => acc + ((parseFloat(p.cantidad) || 0) * (parseFloat(p.pagoPorPrenda) || 0)), 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-6 rounded-2xl space-y-6">
          <h3 className="text-3xl font-bold text-yellow-900 border-b-2 border-yellow-200 pb-2">Materiales a Entregarle (Mercadería)</h3>
          
          <div className="mb-6 flex gap-2 bg-white p-2 border-2 border-yellow-300 rounded-xl">
            <input type="text" placeholder="Añadir nuevo al catálogo maestro..." className="flex-1 p-2 text-xl outline-none" value={nuevoCat} onChange={e => setNuevoCat(e.target.value)} />
            <button onClick={() => addCatalogo(nuevoCat)} className="bg-yellow-300 hover:bg-yellow-400 text-yellow-900 font-bold px-4 rounded-lg text-lg">➕ Añadir al Catálogo</button>
          </div>

          <div className="space-y-4">
            {insumosEntregados.map((insumo, index) => (
              <div key={index} className="flex gap-4 items-start">
                <div className="flex-1">
                  <EditableSelect items={catalogo} value={insumo.nombre} onChange={val => actualizarInsumo(index, 'nombre', val)} onEdit={editCatalogo} placeholder="-- Selecciona Material --" themeColor="yellow" showAdd={false} />
                </div>
                <input type="number" className="w-1/4 h-16 text-2xl p-4 border-2 border-yellow-300 rounded-xl bg-white" placeholder="Cant." value={insumo.cantidad} onChange={e => actualizarInsumo(index, 'cantidad', e.target.value)} />
              </div>
            ))}
            <button onClick={agregarInsumo} className="bg-yellow-200 text-yellow-900 font-bold py-3 px-6 rounded-xl text-xl mt-4">➕ Añadir otra fila</button>
          </div>
        </div>

        <button disabled={guardando} onClick={guardarAsignacion} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-8 rounded-3xl text-4xl">{guardando ? "⏳ Guardando..." : "✅ Asignar Trabajo"}</button>
      </div>
    </div>
  );
}

function DashboardView({ setView }) {
  const [cortes, setCortes] = useState([]);
  const [expandedTallas, setExpandedTallas] = useState(null);
  const [expandedAsignaciones, setExpandedAsignaciones] = useState(null);
  const [expandedTelas, setExpandedTelas] = useState(null);

  const cargarCortes = () => apiFetch("/dashboard").then(r => r.json()).then(data => setCortes(data));
  useEffect(() => { cargarCortes(); }, []);

  const editarTela = (telaId, color, currentMetros) => {
    const nuevosMetros = window.prompt(`Editar cantidad de metros para la tela ${color}:`, currentMetros);
    if (nuevosMetros && parseFloat(nuevosMetros) !== currentMetros) {
      apiFetch(`/telas/${telaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad_metros: parseFloat(nuevosMetros) })
      }).then(() => cargarCortes());
    }
  };

  const cambiarEstadoCorte = async (corteId, nuevoEstado) => {
    await apiFetch(`/cortes/${corteId}/estado`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado })
    });
    cargarCortes();
  };

  const devolverPrendas = async (asignacionId, maxCantidad) => {
    const cant = window.prompt(`¿Cuántas prendas devolvió el costurero? (Máximo ${maxCantidad})`);
    if (cant && parseInt(cant) > 0 && parseInt(cant) <= maxCantidad) {
      await apiFetch(`/asignaciones/${asignacionId}/devolver`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: parseInt(cant) })
      });
      cargarCortes();
    } else if (cant) {
      alert("Cantidad inválida");
    }
  };
  return (
    <div className="max-w-5xl mx-auto bg-white p-10 rounded-3xl shadow-2xl mb-20">
      <div className="flex justify-between items-center mb-8">
        <button className="bg-gray-200 hover:bg-gray-300 text-black font-bold py-4 px-8 rounded-xl text-2xl" onClick={() => setView('menu')}>⬅️ Volver</button>
        <button className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-8 rounded-xl text-2xl shadow-md" onClick={() => setView('pagos')}>💵 Ir a Pagos</button>
      </div>
      <h2 className="text-5xl font-black mb-8 text-purple-700">📊 Resumen y Cortes Activos</h2>
      <div className="space-y-6">
        {cortes.length === 0 ? <p className="text-2xl text-gray-500">No hay cortes registrados aún.</p> : cortes.map(corte => (
          <div key={corte.id} className="border-4 border-purple-100 rounded-3xl p-6 bg-purple-50 flex flex-col gap-4 shadow-sm transition-all duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-4xl font-bold text-purple-900 mb-2">{corte.nombre}</h3>
                <p className="text-xl text-purple-700 font-semibold">Entregado por: {corte.quien_entrego}</p>
              </div>
              <div className="flex gap-2">
                <span className={`px-4 py-2 rounded-full font-bold text-white text-lg shadow-sm ${corte.estado === 'Entregado' ? 'bg-green-500' : 'bg-yellow-500'}`}>
                  {corte.estado === 'Entregado' ? '🟢 ENTREGADO' : '🟡 PENDIENTE'}
                </span>
                {corte.estado !== 'Entregado' ? (
                  <button onClick={() => cambiarEstadoCorte(corte.id, 'Entregado')} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-xl text-sm shadow-md">✅ Terminar Corte</button>
                ) : (
                  <button onClick={() => cambiarEstadoCorte(corte.id, 'Activo')} className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-xl text-sm shadow-md">🔄 Reabrir</button>
                )}
              </div>
            </div>
            
            <div className="flex gap-4 text-center mt-2 justify-end">
              <div 
                className="bg-white p-4 rounded-2xl shadow-sm min-w-[150px] cursor-pointer hover:bg-purple-100 transition-colors border-2 border-transparent hover:border-purple-200" 
                onClick={() => setExpandedTallas(expandedTallas === corte.id ? null : corte.id)}
              >
                <p className="text-gray-500 font-bold text-lg">Total Prendas</p>
                <p className="text-4xl font-black text-blue-600">{corte.total_prendas}</p>
                <p className="text-xs text-gray-400 mt-1">👆 Toca para ver</p>
              </div>
              <div 
                className="bg-white p-4 rounded-2xl shadow-sm min-w-[150px] cursor-pointer hover:bg-orange-50 transition-colors border-2 border-transparent hover:border-orange-200" 
                onClick={() => setExpandedAsignaciones(expandedAsignaciones === corte.id ? null : corte.id)}
              >
                <p className="text-gray-500 font-bold text-lg">Ya Asignadas</p>
                <p className="text-4xl font-black text-orange-500">{corte.total_asignado}</p>
                <p className="text-xs text-gray-400 mt-1">👆 Toca para ver</p>
              </div>
              <div 
                className="bg-white p-4 rounded-2xl shadow-sm min-w-[150px] cursor-pointer hover:bg-green-50 transition-colors border-2 border-transparent hover:border-green-200" 
                onClick={() => setExpandedTelas(expandedTelas === corte.id ? null : corte.id)}
              >
                <p className="text-gray-500 font-bold text-lg">Telas</p>
                <p className="text-4xl font-black text-green-500">{corte.detalle_telas?.length || 0}</p>
                <p className="text-xs text-gray-400 mt-1">👆 Toca para editar</p>
              </div>
            </div>

            {expandedTelas === corte.id && (
              <div className="mt-4 p-6 bg-white rounded-2xl shadow-inner border border-green-100 animate-fade-in">
                <h4 className="font-bold text-green-800 text-2xl mb-4 border-b pb-2">🧵 Telas Entregadas</h4>
                <ul className="space-y-4">
                  {corte.detalle_telas?.map((tela, idx) => (
                    <li key={idx} className="text-xl flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div>
                        <span className="font-bold text-gray-800 text-2xl">{tela.color}</span>
                        <p className="text-gray-500">{tela.cantidad_metros} metros</p>
                      </div>
                      <button onClick={() => editarTela(tela.id, tela.color, tela.cantidad_metros)} className="bg-green-100 hover:bg-green-200 text-green-700 font-bold px-4 py-2 rounded-lg text-lg border border-green-200">✏️ Editar Metros</button>
                    </li>
                  ))}
                  {(!corte.detalle_telas || corte.detalle_telas.length === 0) && <p className="text-gray-500 italic">No hay telas registradas.</p>}
                </ul>
              </div>
            )}

            {expandedTallas === corte.id && (
              <div className="mt-4 p-6 bg-white rounded-2xl shadow-inner border border-blue-100 animate-fade-in">
                <h4 className="font-bold text-blue-800 text-2xl mb-4 border-b pb-2">👕 Desglose de Tallas y Colores</h4>
                <ul className="space-y-2">
                  {corte.detalle_tallas?.map((t, idx) => (
                    <li key={idx} className="text-xl text-gray-600 flex justify-between">
                      <span>Talla <span className="font-bold text-gray-800">{t.talla}</span> {t.color ? `(${t.color})` : ''}</span>
                      <span className="font-black text-blue-600">{t.cantidad}</span>
                    </li>
                  ))}
                  {(!corte.detalle_tallas || corte.detalle_tallas.length === 0) && <li className="text-lg text-gray-400 italic">No hay detalles de tallas.</li>}
                </ul>
              </div>
            )}

            {expandedAsignaciones === corte.id && (
              <div className="mt-4 p-6 bg-white rounded-2xl shadow-inner border border-orange-100 animate-fade-in">
                <h4 className="font-bold text-orange-800 text-2xl mb-4 border-b pb-2">👥 Costureros Asignados</h4>
                <ul className="space-y-4">
                  {corte.detalle_asignaciones?.map((a, idx) => (
                    <li key={idx} className="text-xl text-gray-600 flex justify-between items-center bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm">
                      <div>
                        <p>👤 <span className="font-bold text-gray-800">{a.trabajador}</span></p>
                        <p className="text-sm text-gray-500 mt-1">
                          {a.tipo_prenda} • Tela: {a.tela_color || 'N/A'} • Talla: {a.talla || 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-orange-600 text-3xl">{a.cantidad} <span className="text-sm font-normal">prendas</span></span>
                        <button onClick={() => devolverPrendas(a.id, a.cantidad)} className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-3 py-2 rounded-lg text-sm border border-red-200 shadow-sm">↩️ Devolver</button>
                      </div>
                    </li>
                  ))}
                  {(!corte.detalle_asignaciones || corte.detalle_asignaciones.length === 0) && <li className="text-lg text-gray-400 italic">No se ha repartido ropa aún.</li>}
                </ul>
              </div>
            )}

          </div>
        ))}
      </div>
    </div>
  );
}

function FinanzasView({ setView }) {
  const [tab, setTab] = useState('costureros');
  const [privado, setPrivado] = useState(true);
  
  const [trabajadores, setTrabajadores] = useState([]);
  const [cortes, setCortes] = useState([]);
  const [finanzas, setFinanzas] = useState({ pagos: [], ingresos: [], asignaciones: [] });

  const [filtroCosturero, setFiltroCosturero] = useState('TODOS');
  const [filtroCorteCosturero, setFiltroCorteCosturero] = useState('TODOS');
  const [fechaInicioPagos, setFechaInicioPagos] = useState('');
  const [fechaFinPagos, setFechaFinPagos] = useState('');
  
  const [filtroCorte, setFiltroCorte] = useState('TODOS');
  
  const [montoPago, setMontoPago] = useState('');
  const [montoIngreso, setMontoIngreso] = useState('');
  const [descIngreso, setDescIngreso] = useState('');
  const [modalResumen, setModalResumen] = useState(null);

  const [motivos, setMotivos] = useState(() => JSON.parse(localStorage.getItem('motivos_ingreso') || '["Adelanto", "Liquidación"]'));
  const [nuevoMotivo, setNuevoMotivo] = useState('');

  const addMotivo = () => {
    if (nuevoMotivo && !motivos.includes(nuevoMotivo)) {
      const nuevos = [...motivos, nuevoMotivo];
      setMotivos(nuevos);
      localStorage.setItem('motivos_ingreso', JSON.stringify(nuevos));
      setDescIngreso(nuevoMotivo);
      setNuevoMotivo('');
    }
  };

  const cargarDatos = () => {
    apiFetch("/trabajadores/").then(r => r.json()).then(data => setTrabajadores(data));
    apiFetch("/cortes/activos").then(r => r.json()).then(data => setCortes(data));
    apiFetch("/finanzas").then(r => r.json()).then(data => setFinanzas(data));
  };

  useEffect(() => { cargarDatos(); }, []);

  const fMoney = (val) => privado ? '***' : `Bs. ${parseFloat(val).toFixed(2)}`;

  const registrarPago = () => {
    if (!montoPago || filtroCosturero === 'TODOS') return;
    const pago = { 
      trabajador_id: parseInt(filtroCosturero), 
      monto: parseFloat(montoPago), 
      fecha: new Date().toISOString().split('T')[0],
      corte_id: filtroCorteCosturero !== 'TODOS' ? parseInt(filtroCorteCosturero) : null
    };
    apiFetch("/pagos/trabajador", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pago)
    }).then(r => r.json()).then(() => { setMontoPago(''); cargarDatos(); });
  };

  const anularPago = (pagoId) => {
    if (window.confirm("¿Seguro que deseas ANULAR este pago? El dinero volverá a la deuda del trabajador.")) {
      apiFetch(`/pagos/${pagoId}`, { method: "DELETE" })
        .then(r => r.json()).then(() => cargarDatos());
    }
  };

  const registrarIngreso = async () => {
    if(filtroCorte === 'TODOS' || !montoIngreso) return alert("Selecciona corte y monto");
    const r = await apiFetch("/ingresos/corte", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ corte_id: parseInt(filtroCorte), monto: parseFloat(montoIngreso), fecha: new Date().toISOString().split('T')[0], descripcion: descIngreso || 'Adelanto/Pago' })
    });
    if(r.ok) { alert("Ingreso registrado"); setMontoIngreso(''); setDescIngreso(''); cargarDatos(); }
  };

  const baseAsignacionesCosturero = finanzas.asignaciones.filter(a => filtroCosturero === 'TODOS' || a.trabajador_id.toString() === filtroCosturero.toString());
  const basePagosCosturero = finanzas.pagos.filter(p => filtroCosturero === 'TODOS' || p.trabajador_id.toString() === filtroCosturero.toString());
  
  const cortesCostureroIds = [...new Set(baseAsignacionesCosturero.map(a => a.corte_id))];
  const cortesCostureroOpciones = cortes.filter(c => cortesCostureroIds.includes(c.id)).map(c => ({ value: c.id, label: c.nombre }));

  const asignacionesCosturero = baseAsignacionesCosturero.filter(a => filtroCorteCosturero === 'TODOS' || a.corte_id.toString() === filtroCorteCosturero.toString());
  // Los pagos pueden ser generales (corte_id = null), por eso si filtramos por corte, mostramos los que son de ese corte o los generales (¿o solo los del corte? el plan dice "solo sume el dinero respectivo a ese corte")
  // Vamos a ser estrictos: si selecciona un corte, solo se suman pagos de ESE corte.
  const pagosCosturero = basePagosCosturero.filter(p => filtroCorteCosturero === 'TODOS' || (p.corte_id && p.corte_id.toString() === filtroCorteCosturero.toString()));
  
  const totalGenerado = asignacionesCosturero.reduce((acc, a) => acc + (a.cantidad * a.pago_por_prenda), 0);
  const totalPagado = pagosCosturero.reduce((acc, p) => acc + p.monto, 0);
  const deudaActual = totalGenerado - totalPagado;

  const ingresosFiltrados = finanzas.ingresos.filter(i => filtroCorte === 'TODOS' || i.corte_id.toString() === filtroCorte.toString());
  const totalIngresado = ingresosFiltrados.reduce((acc, i) => acc + i.monto, 0);

  const pagosMostrados = pagosCosturero.filter(p => {
    const matchInit = fechaInicioPagos ? p.fecha >= fechaInicioPagos : true;
    const matchFin = fechaFinPagos ? p.fecha <= fechaFinPagos : true;
    return matchInit && matchFin;
  });

  return (
    <div className="max-w-5xl mx-auto bg-white p-10 rounded-3xl shadow-2xl mb-20">
      <div className="flex justify-between items-center mb-8">
        <button className="bg-gray-200 hover:bg-gray-300 text-black font-bold py-4 px-8 rounded-xl text-2xl flex items-center" onClick={() => setView('menu')}>⬅️ Volver</button>
        <button className={`py-4 px-8 rounded-xl text-2xl font-black transition-colors ${privado ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`} onClick={() => setPrivado(!privado)}>
          {privado ? "👁️ Oculto (Modo Discreto)" : "👁️ Visible"}
        </button>
      </div>

      <h2 className="text-5xl font-black mb-8 text-green-700">💼 Contabilidad y Pagos</h2>

      <div className="flex flex-col md:flex-row bg-gray-100 p-2 rounded-2xl mb-8 gap-2">
        <button onClick={() => setTab('costureros')} className={`flex-1 py-4 text-2xl font-bold rounded-xl ${tab==='costureros' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500'}`}>✂️ Pagos a Costureros</button>
        <button onClick={() => setTab('cortes')} className={`flex-1 py-4 text-2xl font-bold rounded-xl ${tab==='cortes' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500'}`}>📦 Ingresos del Distribuidor</button>
      </div>

      {tab === 'costureros' && (
        <div className="space-y-8 animate-fade-in">
          <div>
            <label className="block text-xl font-bold text-green-800 mb-2">Filtrar por Costurero</label>
            <CustomSelect 
              className="w-full text-3xl p-6 border-4 border-green-200 rounded-2xl bg-green-50 font-bold text-green-900"
              value={filtroCosturero}
              onChange={(v) => { setFiltroCosturero(v); setFiltroCorteCosturero('TODOS'); }}
              placeholder="Seleccionar Costurero"
              options={[
                { value: 'TODOS', label: 'Ver Todos' },
                ...trabajadores.map(t => ({ value: t.id, label: t.nombre }))
              ]}
            />
          </div>

          {filtroCosturero !== 'TODOS' && cortesCostureroOpciones.length > 0 && (
            <div className="animate-fade-in -mt-4">
              <label className="block text-xl font-bold text-orange-800 mb-2">Filtrar por Corte Asignado</label>
              <CustomSelect 
                className="w-full text-2xl p-4 border-2 border-orange-200 rounded-2xl bg-orange-50 font-bold text-orange-900"
                value={filtroCorteCosturero}
                onChange={setFiltroCorteCosturero}
                placeholder="Seleccionar Corte"
                options={[
                  { value: 'TODOS', label: 'Todos sus cortes' },
                  ...cortesCostureroOpciones
                ]}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-200 shadow-sm">
              <p className="text-xl text-gray-500 font-bold">{filtroCosturero === 'TODOS' ? 'Total Global Ganado' : 'Total Ganado (Trabajos)'}</p>
              <p className="text-4xl font-black text-gray-800">{fMoney(totalGenerado)}</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-200 shadow-sm">
              <p className="text-xl text-blue-500 font-bold">{filtroCosturero === 'TODOS' ? 'Total Pagado a Todos' : 'Total Pagado / Adelantos'}</p>
              <p className="text-4xl font-black text-blue-800">{fMoney(totalPagado)}</p>
            </div>
            <div className={`p-6 rounded-2xl border-2 shadow-sm ${deudaActual > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-xl font-bold ${deudaActual > 0 ? 'text-red-500' : 'text-green-500'}`}>Deuda Pendiente a Pagar</p>
              <p className={`text-5xl font-black ${deudaActual > 0 ? 'text-red-600' : 'text-green-600'}`}>{fMoney(deudaActual)}</p>
            </div>
          </div>

          {filtroCosturero !== 'TODOS' && (
            <div className="bg-green-100 p-6 rounded-2xl border-2 border-green-300 flex flex-col md:flex-row gap-4 items-end shadow-inner">
              <div className="flex-1 w-full">
                <label className="block text-2xl font-bold mb-2 text-green-900">Registrar Pago o Adelanto (Bs.)</label>
                <input type="number" className="w-full text-3xl p-4 rounded-xl border-2 border-green-200 bg-white" placeholder="Monto en Bs." value={montoPago} onChange={e => setMontoPago(e.target.value)} />
              </div>
              <button onClick={registrarPago} className="bg-green-600 hover:bg-green-500 text-white font-black px-8 py-4 text-3xl rounded-xl w-full md:w-auto">💵 Registrar Pago</button>
            </div>
          )}

          {filtroCosturero !== 'TODOS' && (
            <div className="bg-gray-100 p-6 rounded-2xl flex flex-col md:flex-row gap-4 shadow-sm border-2 border-gray-200">
              <div className="flex-1">
                <label className="block text-xl font-bold text-gray-700 mb-2">Fecha Inicial (Pagos)</label>
                <input type="date" className="w-full text-2xl p-4 rounded-xl border-2 border-gray-300 bg-white" value={fechaInicioPagos} onChange={e => setFechaInicioPagos(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="block text-xl font-bold text-gray-700 mb-2">Fecha Final (Pagos)</label>
                <input type="date" className="w-full text-2xl p-4 rounded-xl border-2 border-gray-300 bg-white" value={fechaFinPagos} onChange={e => setFechaFinPagos(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <h3 className="text-3xl font-bold mb-4 text-gray-700">Historial de Pagos Efectuados</h3>
            <div className="space-y-4">
              {pagosMostrados.length === 0 ? <p className="text-2xl text-gray-400 italic">No hay pagos {(fechaInicioPagos || fechaFinPagos) && 'en estas fechas'}.</p> : pagosMostrados.map(p => {
                const nombreCosturero = filtroCosturero === 'TODOS' ? `(ID: ${p.trabajador_id})` : '';
                const nombreCortePago = p.corte_id ? cortes.find(c => c.id.toString() === p.corte_id.toString())?.nombre : 'Pago Global';
                return (
                  <div key={p.id} className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl border-2 border-gray-100 shadow-sm gap-4">
                    <div className="flex-1 w-full flex justify-between items-center">
                      <div>
                        <p className="text-2xl font-bold text-gray-800">Adelanto / Pago {nombreCosturero}</p>
                        <p className="text-xl text-gray-500">{new Date(p.fecha).toLocaleDateString()} {p.corte_id && `• Corte: ${nombreCortePago}`}</p>
                      </div>
                      <p className="text-3xl font-black text-green-600">+{fMoney(p.monto)}</p>
                    </div>
                    {filtroCosturero !== 'TODOS' && (
                      <button onClick={() => anularPago(p.id)} className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-6 py-3 rounded-lg text-xl border border-red-200 ml-4">❌ Anular</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'cortes' && (
        <div className="space-y-8 animate-fade-in">
          <div>
            <label className="block text-xl font-bold text-blue-800 mb-2">Filtrar por Corte</label>
            <CustomSelect 
              className="w-full text-3xl p-6 border-4 border-blue-200 rounded-2xl bg-blue-50 font-bold text-blue-900"
              value={filtroCorte}
              onChange={setFiltroCorte}
              placeholder="Seleccionar Corte"
              options={[
                { value: 'TODOS', label: 'Ver Todos' },
                ...cortes.map(c => ({ value: c.id, label: c.nombre }))
              ]}
            />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-blue-50 p-6 rounded-2xl border-2 border-blue-200 shadow-sm">
            <div>
              <p className="text-xl text-blue-500 font-bold">Total Ingresado del Distribuidor</p>
              <p className="text-5xl font-black text-blue-800">{fMoney(totalIngresado)}</p>
            </div>
            {filtroCorte !== 'TODOS' && (
              <button onClick={() => {
                const p = prompt("🔑 Introduce la contraseña maestra para ver el Balance:");
                if (p === localStorage.getItem("master_pin")) setModalResumen(filtroCorte);
                else if (p !== null) alert("Contraseña incorrecta");
              }} className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-6 py-4 rounded-xl text-xl shadow-lg flex items-center gap-2">
                🔒 Ver Balance de Corte
              </button>
            )}
          </div>

          {filtroCorte !== 'TODOS' && (
            <div className="bg-blue-100 p-6 rounded-2xl border-2 border-blue-300 flex flex-col md:flex-row gap-4 items-end shadow-inner">
              <div className="flex-1 w-full">
                <label className="block text-2xl font-bold mb-2 text-blue-900">Motivo</label>
                <CustomSelect 
                  className="w-full text-2xl p-4 rounded-xl border-2 border-blue-200 bg-white"
                  value={descIngreso}
                  onChange={setDescIngreso}
                  placeholder="Seleccionar Motivo"
                  options={motivos.map(m => ({ value: m, label: m }))}
                />
              </div>
              <div className="w-full md:w-1/3">
                <label className="block text-2xl font-bold mb-2 text-blue-900">Monto (Bs.)</label>
                <input type="number" className="w-full text-3xl p-4 rounded-xl border-2 border-blue-200 bg-white" placeholder="Bs." value={montoIngreso} onChange={e => setMontoIngreso(e.target.value)} />
              </div>
              <button onClick={registrarIngreso} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-4 text-3xl rounded-xl w-full md:w-auto">📥 Recibir</button>
            </div>
          )}

          <div>
            <h3 className="text-3xl font-bold mb-4 text-gray-700">Historial de Ingresos</h3>
            <div className="space-y-4">
              {ingresosFiltrados.map(i => (
                <div key={i.id} className="flex justify-between items-center bg-white p-6 rounded-xl border-2 border-gray-100 shadow-sm">
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{i.descripcion}</p>
                    <p className="text-xl text-gray-500">{i.fecha} {filtroCorte === 'TODOS' && `- Corte ID: ${i.corte_id}`}</p>
                  </div>
                  <p className="text-3xl font-black text-blue-600">+{fMoney(i.monto)}</p>
                </div>
              ))}
              {ingresosFiltrados.length === 0 && <p className="text-2xl text-gray-400 italic">No hay ingresos registrados aún.</p>}
            </div>
          </div>
        </div>
      )}

      {modalResumen && (
        <ResumenFinancieroModal 
          corteId={modalResumen} 
          nombreCorte={cortes.find(c => c.id.toString() === modalResumen.toString())?.nombre || ''}
          onClose={() => setModalResumen(null)} 
        />
      )}
    </div>
  );
}


function AuthWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("master_pin"));

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return <App />;
}

export default AuthWrapper;

