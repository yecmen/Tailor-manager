import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase.js';

// ── Hook: intercepta el botón atrás del celular ───────────────────────────────
// IMPORTANTE: solo debe usarse UNA VEZ, en el componente App raíz.
function useBackGuard(onBack) {
  const onBackRef = useRef(onBack);
  useEffect(() => { onBackRef.current = onBack; }, [onBack]);

  useEffect(() => {
    // Empujar un estado inicial para tener algo que interceptar
    window.history.pushState({ guard: true }, '');
    const handler = () => {
      // Re-empujar inmediatamente para mantener el guard activo siempre
      window.history.pushState({ guard: true }, '');
      onBackRef.current();
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  // Sin dependencias: se monta UNA sola vez y nunca se desmonta
  }, []); // eslint-disable-line
}

// ── Helpers de Supabase ───────────────────────────────────────────────────────

async function registrarActividad(accion, descripcion, entidad_tipo = null, entidad_id = null) {
  await supabase.from('historial_actividad').insert({
    fecha: new Date().toISOString(),
    accion,
    descripcion,
    entidad_tipo,
    entidad_id
  });
}

// ── Pantalla de Login ─────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('username', username.trim())
        .eq('password', password)
        .single();

      if (dbError || !data) {
        setError('Usuario o contraseña incorrectos.');
      } else {
        localStorage.setItem('user_session', JSON.stringify({ id: data.id, username: data.username, role: data.role }));
        onLogin(data);
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full">
        <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">Taller de Costura</h2>
        <p className="text-center text-gray-500 mb-8 text-lg">Sistema de Administración</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-lg font-bold text-gray-700 mb-1">Usuario</label>
            <input
              type="text"
              placeholder="Ej: admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="border-2 border-gray-300 p-4 rounded-xl text-xl w-full focus:border-blue-500 outline-none"
              autoFocus
              autoCapitalize="none"
            />
          </div>
          <div>
            <label className="block text-lg font-bold text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-2 border-gray-300 p-4 rounded-xl text-xl w-full focus:border-blue-500 outline-none"
            />
          </div>
          {error && <p className="text-red-500 text-center font-bold text-lg">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white p-4 rounded-xl font-bold text-xl hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? '⏳ Verificando...' : 'Ingresar →'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Pantalla usuario Regular ──────────────────────────────────────────────────

function RegularUserScreen({ usuario, onLogout }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
        <p className="text-5xl mb-4">✂️</p>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Hola, {usuario.username}!</h2>
        <p className="text-gray-500 text-lg mb-8">Has iniciado sesión correctamente. Los módulos de tu perfil estarán disponibles próximamente.</p>
        <button
          onClick={onLogout}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl text-lg"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

// ── Cambiar Contraseña ────────────────────────────────────────────────────────

function CambiarPasswordModal({ usuario, onClose }) {
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGuardar = async (e) => {
    e.preventDefault();
    setError('');
    if (passwordNuevo !== passwordConfirm) { setError('Las contraseñas nuevas no coinciden.'); return; }
    if (passwordNuevo.length < 4) { setError('La nueva contraseña debe tener al menos 4 caracteres.'); return; }

    setLoading(true);
    // Verificar password actual
    const { data } = await supabase.from('usuarios').select('id').eq('id', usuario.id).eq('password', passwordActual).single();
    if (!data) { setError('La contraseña actual es incorrecta.'); setLoading(false); return; }

    const { error: updateError } = await supabase.from('usuarios').update({ password: passwordNuevo }).eq('id', usuario.id);
    if (updateError) { setError('Error al actualizar. Intenta de nuevo.'); setLoading(false); return; }

    alert('✅ Contraseña actualizada exitosamente.');
    onClose();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl">
        <h3 className="text-xl font-black mb-6 text-gray-800">🔑 Cambiar Contraseña</h3>
        <form onSubmit={handleGuardar} className="flex flex-col gap-4">
          <div>
            <label className="block text-lg font-bold text-gray-700 mb-1">Contraseña Actual</label>
            <input type="password" value={passwordActual} onChange={e => setPasswordActual(e.target.value)} className="w-full border-2 border-gray-300 p-4 rounded-xl text-xl outline-none" required />
          </div>
          <div>
            <label className="block text-lg font-bold text-gray-700 mb-1">Nueva Contraseña</label>
            <input type="password" value={passwordNuevo} onChange={e => setPasswordNuevo(e.target.value)} className="w-full border-2 border-gray-300 p-4 rounded-xl text-xl outline-none" required />
          </div>
          <div>
            <label className="block text-lg font-bold text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
            <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} className="w-full border-2 border-gray-300 p-4 rounded-xl text-xl outline-none" required />
          </div>
          {error && <p className="text-red-500 font-bold text-lg">{error}</p>}
          <div className="flex gap-4 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 hover:bg-gray-300 font-bold py-4 rounded-xl text-lg">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg disabled:opacity-60">
              {loading ? '⏳' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Gestión de Usuarios (solo admin) ─────────────────────────────────────────

function GestionUsuariosView({ setView, usuario }) {
  const [usuarios, setUsuarios] = useState([]);
  const [nuevoUser, setNuevoUser] = useState('');
  const [nuevoPass, setNuevoPass] = useState('');
  const [nuevoRol, setNuevoRol] = useState('regular');
  const [editando, setEditando] = useState(null);
  const [showCambiarPass, setShowCambiarPass] = useState(false);

  const cargar = async () => {
    const { data } = await supabase.from('usuarios').select('id, username, role').order('id');
    setUsuarios(data || []);
  };

  useEffect(() => { cargar(); }, []);

  const crearUsuario = async () => {
    if (!nuevoUser.trim() || !nuevoPass.trim()) { alert('Llena usuario y contraseña'); return; }
    const { error } = await supabase.from('usuarios').insert({ username: nuevoUser.trim(), password: nuevoPass, role: nuevoRol });
    if (error) { alert('Error: ' + (error.message || 'Usuario ya existe')); return; }
    setNuevoUser(''); setNuevoPass('');
    cargar();
  };

  const guardarEdicion = async () => {
    if (!editando.username.trim()) return;
    const updates = { username: editando.username.trim(), role: editando.role };
    if (editando.nuevaPass && editando.nuevaPass.trim()) updates.password = editando.nuevaPass;
    await supabase.from('usuarios').update(updates).eq('id', editando.id);
    setEditando(null);
    cargar();
  };

  const eliminarUsuario = async (id, username) => {
    if (username === 'admin') { alert('No se puede eliminar al usuario admin.'); return; }
    if (!window.confirm(`¿Eliminar al usuario "${username}"?`)) return;
    await supabase.from('usuarios').delete().eq('id', id);
    cargar();
  };

  return (
    <div className="w-full max-w-full px-4 mx-auto bg-white p-5 rounded-3xl shadow-2xl mb-20">
      <button className="mb-8 bg-gray-200 hover:bg-gray-300 text-black font-bold py-4 px-8 rounded-xl text-lg" onClick={() => setView('menu')}>⬅️ Volver al Menú</button>
      <h2 className="text-xl font-black mb-8 text-indigo-700">👥 Gestión de Usuarios</h2>

      {/* Cambiar MI contraseña */}
      <div className="bg-gray-100 p-4 rounded-2xl mb-8 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-gray-800">Mi cuenta: <span className="text-indigo-600">{usuario?.username}</span></p>
          <p className="text-gray-500 text-sm">Rol: {usuario?.role}</p>
        </div>
        <button
          onClick={() => setShowCambiarPass(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl text-lg"
        >
          🔑 Cambiar mi contraseña
        </button>
      </div>
      {showCambiarPass && <CambiarPasswordModal usuario={usuario} onClose={() => setShowCambiarPass(false)} />}

      <div className="bg-indigo-50 p-4 rounded-2xl mb-8 space-y-4">
        <h3 className="text-lg font-bold text-indigo-900">➕ Crear Nuevo Usuario</h3>
        <input type="text" placeholder="Nombre de usuario" value={nuevoUser} onChange={e => setNuevoUser(e.target.value)} className="w-full text-lg p-4 border-2 border-indigo-200 rounded-xl bg-white" />
        <input type="password" placeholder="Contraseña inicial" value={nuevoPass} onChange={e => setNuevoPass(e.target.value)} className="w-full text-lg p-4 border-2 border-indigo-200 rounded-xl bg-white" />
        <div className="flex gap-4">
          <button onClick={() => setNuevoRol('regular')} className={`flex-1 py-3 rounded-xl font-bold text-lg border-2 ${nuevoRol === 'regular' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-indigo-300 text-indigo-700'}`}>Regular</button>
          <button onClick={() => setNuevoRol('admin')} className={`flex-1 py-3 rounded-xl font-bold text-lg border-2 ${nuevoRol === 'admin' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-indigo-300 text-indigo-700'}`}>Admin</button>
        </div>
        <button onClick={crearUsuario} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl text-lg">✅ Crear Usuario</button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-700">Lista de Usuarios</h3>
        {usuarios.map(u => (
          <div key={u.id} className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-200 flex justify-between items-center gap-4">
            {editando?.id === u.id ? (
              <div className="flex-1 space-y-3">
                <input type="text" value={editando.username} onChange={e => setEditando({...editando, username: e.target.value})} className="w-full p-3 border-2 border-indigo-200 rounded-xl text-lg" />
                <input type="password" placeholder="Nueva contraseña (dejar vacío para no cambiar)" value={editando.nuevaPass || ''} onChange={e => setEditando({...editando, nuevaPass: e.target.value})} className="w-full p-3 border-2 border-indigo-200 rounded-xl text-lg" />
                <div className="flex gap-2">
                  <button onClick={() => setEditando({...editando, role: 'regular'})} className={`flex-1 py-2 rounded-xl font-bold border-2 ${editando.role === 'regular' ? 'bg-indigo-600 text-white' : 'border-indigo-300'}`}>Regular</button>
                  <button onClick={() => setEditando({...editando, role: 'admin'})} className={`flex-1 py-2 rounded-xl font-bold border-2 ${editando.role === 'admin' ? 'bg-indigo-600 text-white' : 'border-indigo-300'}`}>Admin</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={guardarEdicion} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl">💾 Guardar</button>
                  <button onClick={() => setEditando(null)} className="flex-1 bg-gray-300 font-bold py-3 rounded-xl">Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xl font-bold text-gray-800">{u.username}</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${u.role === 'admin' ? 'bg-indigo-600' : 'bg-gray-500'}`}>{u.role}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditando({...u, nuevaPass: ''})} className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-4 py-2 rounded-xl text-lg">✏️</button>
                  {u.username !== 'admin' && <button onClick={() => eliminarUsuario(u.id, u.username)} className="bg-red-100 hover:bg-red-200 text-red-800 font-bold px-4 py-2 rounded-xl text-lg">🗑️</button>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Componente CustomSelect ───────────────────────────────────────────────────

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

// ── App principal (solo admin) ────────────────────────────────────────────────

function App({ usuario, onLogout }) {
  const [currentView, setCurrentView] = useState('menu');

  // Guard centralizado: vistas de formulario SIEMPRE avisan antes de salir.
  // Menú principal avisa antes de cerrar sesión.
  const FORM_VIEWS = ['distribuidor', 'comprar_insumos', 'trabajadores'];
  const handleBack = useCallback(() => {
    if (FORM_VIEWS.includes(currentView)) {
      if (window.confirm('¿Seguro que quieres salir? Perderás los datos no guardados.')) {
        setCurrentView('menu');
      }
    } else if (currentView !== 'menu') {
      setCurrentView('menu');
    } else {
      if (window.confirm('¿Deseas cerrar sesión?')) onLogout();
    }
  }, [currentView, onLogout]);
  useBackGuard(handleBack);

  return (
    <div className="min-h-screen p-4 text-gray-900 bg-gray-50">
      <header className="mb-10 text-center relative w-full max-w-full px-4 mx-auto flex justify-center items-center">
        <div>
          <h1 className="text-xl font-black text-blue-700">Taller de Costura</h1>
          <p className="mt-2 text-lg text-gray-600">Sistema de Administración</p>
        </div>
        {currentView === 'menu' && (
          <button
            className="absolute right-0 bg-gray-200 hover:bg-gray-300 rounded-2xl p-4 shadow-sm border-2 border-gray-300 transition-colors"
            onClick={() => setCurrentView('historial_actividad')}
            title="Historial de Actividades"
          >
            <span className="text-xl">📜</span>
          </button>
        )}
      </header>

      {currentView === 'menu' && <MainMenu setView={setCurrentView} onLogout={onLogout} />}
      {currentView === 'distribuidor' && <DistribuidorForm setView={setCurrentView} />}
      {currentView === 'comprar_insumos' && <ComprarInsumosForm setView={setCurrentView} />}
      {currentView === 'trabajadores' && <RepartirTrabajoForm setView={setCurrentView} />}
      {currentView === 'dashboard' && <DashboardView setView={setCurrentView} />}
      {currentView === 'pagos' && <FinanzasView setView={setCurrentView} usuario={usuario} />}
      {currentView === 'historial_actividad' && <HistorialActividadView setView={setCurrentView} />}
      {currentView === 'gestion_usuarios' && <GestionUsuariosView setView={setCurrentView} usuario={usuario} />}
    </div>
  );
}

// ── Resumen Financiero Modal ──────────────────────────────────────────────────

function ResumenFinancieroModal({ corteId, nombreCorte, onClose }) {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      const [{ data: ingresos }, { data: insumos }, { data: asignaciones }] = await Promise.all([
        supabase.from('ingresos_corte').select('monto').eq('corte_id', corteId),
        supabase.from('insumos_compra').select('nombre, cantidad, precio_total, fecha_compra').eq('corte_id', corteId),
        supabase.from('asignaciones').select('cantidad, pago_por_prenda').eq('corte_id', corteId),
      ]);
      const ingresos_distribuidor = (ingresos || []).reduce((s, i) => s + i.monto, 0);
      const costos_materiales = (insumos || []).reduce((s, i) => s + i.precio_total, 0);
      const costos_laborales = (asignaciones || []).reduce((s, a) => s + a.cantidad * a.pago_por_prenda, 0);
      setResumen({
        ingresos_distribuidor,
        costos_materiales,
        costos_laborales,
        ganancia_neta: ingresos_distribuidor - costos_materiales - costos_laborales,
        detalle_materiales: insumos || []
      });
      setLoading(false);
    };
    cargar();
  }, [corteId]);

  if (loading) return <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"><div className="bg-white p-5 rounded-2xl text-lg font-bold">Cargando...</div></div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-4 md:p-4 rounded-3xl w-full max-w-full px-4 w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 bg-gray-200 hover:bg-gray-300 rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">❌</button>
        <h2 className="text-lg font-black mb-6 text-gray-800 border-b-4 border-gray-200 pb-4">📊 Resumen Financiero: <span className="text-blue-600">{nombreCorte}</span></h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-200 shadow-sm">
            <p className="text-xl font-bold text-blue-600">Ingresos del Distribuidor (+)</p>
            <p className="text-lg font-black text-blue-800">Bs. {resumen.ingresos_distribuidor.toFixed(2)}</p>
          </div>

          <div className="bg-red-50 p-4 rounded-2xl border-2 border-red-200 shadow-sm relative">
            <p className="text-xl font-bold text-red-600">Costo en Materiales (-)</p>
            <p className="text-lg font-black text-red-800">Bs. {resumen.costos_materiales.toFixed(2)}</p>
            <button onClick={() => setMostrarDetalles(!mostrarDetalles)} className="absolute top-4 right-4 bg-red-200 text-red-800 px-4 py-2 rounded-lg font-bold text-sm">
              {mostrarDetalles ? "Ocultar" : "Ver detalles"}
            </button>
          </div>

          <div className="bg-orange-50 p-4 rounded-2xl border-2 border-orange-200 shadow-sm">
            <p className="text-xl font-bold text-orange-600">Mano de Obra (Pagos/Deudas) (-)</p>
            <p className="text-lg font-black text-orange-800">Bs. {resumen.costos_laborales.toFixed(2)}</p>
          </div>

          <div className={`p-4 rounded-2xl border-4 shadow-md ${resumen.ganancia_neta >= 0 ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'}`}>
            <p className={`text-lg font-bold ${resumen.ganancia_neta >= 0 ? 'text-green-700' : 'text-red-700'}`}>Ganancia Neta (=)</p>
            <p className={`text-xl font-black ${resumen.ganancia_neta >= 0 ? 'text-green-800' : 'text-red-800'}`}>Bs. {resumen.ganancia_neta.toFixed(2)}</p>
          </div>
        </div>

        {mostrarDetalles && (
          <div className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-200 animate-fade-in">
            <h3 className="text-lg font-bold text-gray-700 mb-4 border-b-2 border-gray-200 pb-2">📋 Detalle de Materiales Comprados</h3>
            {resumen.detalle_materiales.length === 0 ? <p className="text-gray-500 italic text-xl">No hay materiales registrados.</p> : (
              <div className="space-y-3">
                {resumen.detalle_materiales.map((m, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div>
                      <p className="font-bold text-xl text-gray-800">{m.nombre}</p>
                      <p className="text-gray-500">{m.fecha_compra} - Cantidad: {m.cantidad}</p>
                    </div>
                    <p className="font-black text-lg text-red-600">-Bs. {m.precio_total.toFixed(2)}</p>
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

// ── Menú Principal ────────────────────────────────────────────────────────────

function MainMenu({ setView, onLogout }) {
  return (
    <main className="w-full max-w-full px-4 mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
      <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-12 px-8 rounded-3xl shadow-xl transform transition-transform active:scale-95 flex flex-col items-center justify-center space-y-4" onClick={() => setView('distribuidor')}>
        <span className="text-xl">🧥</span>
        <span className="text-xl text-center">Entrada de Tela<br/>(Distribuidor)</span>
      </button>

      <button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-12 px-8 rounded-3xl shadow-xl transform transition-transform active:scale-95 flex flex-col items-center justify-center space-y-4" onClick={() => setView('comprar_insumos')}>
        <span className="text-xl">🪡🧵</span>
        <span className="text-xl text-center">Comprar Material<br/>(Mercadería)</span>
      </button>

      <button className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-12 px-8 rounded-3xl shadow-xl transform transition-transform active:scale-95 flex flex-col items-center justify-center space-y-4" onClick={() => setView('trabajadores')}>
        <span className="text-xl">✂️</span>
        <span className="text-xl text-center">Repartir Trabajo<br/>a Costureros</span>
      </button>

      <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-12 px-8 rounded-3xl shadow-xl transform transition-transform active:scale-95 flex flex-col items-center justify-center space-y-4" onClick={() => setView('dashboard')}>
        <span className="text-xl">📊</span>
        <span className="text-xl text-center">Resumen y<br/>Cortes Activos</span>
      </button>

      <button className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-12 px-8 rounded-3xl shadow-xl transform transition-transform active:scale-95 flex flex-col items-center justify-center space-y-4 md:col-span-2" onClick={() => setView('pagos')}>
        <span className="text-xl">💵</span>
        <span className="text-xl text-center">Pagos</span>
      </button>

      <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-8 px-8 rounded-3xl shadow-xl transform transition-transform active:scale-95 flex flex-col items-center justify-center space-y-2 md:col-span-2" onClick={() => setView('gestion_usuarios')}>
        <span className="text-xl">👥</span>
        <span className="text-lg text-center">Gestión de Usuarios</span>
      </button>

      <button
        className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-6 px-8 rounded-3xl shadow-sm transform transition-transform active:scale-95 md:col-span-2"
        onClick={onLogout}
      >
        🚪 Cerrar Sesión
      </button>
    </main>
  );
}

// ── Historial de Actividades ──────────────────────────────────────────────────

function HistorialActividadView({ setView }) {
  const [historial, setHistorial] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  useEffect(() => {
    supabase.from('historial_actividad').select('*').order('id', { ascending: false })
      .then(({ data }) => setHistorial(data || []));
  }, []);

  const historialFiltrado = historial.filter(h => {
    const coincideTexto = (h.descripcion || '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
                          (h.accion || '').toLowerCase().includes(filtroTexto.toLowerCase());
    const coincideFecha = filtroFecha ? h.fecha.startsWith(filtroFecha) : true;
    return coincideTexto && coincideFecha;
  });

  return (
    <div className="w-full max-w-full px-4 mx-auto bg-white p-5 rounded-3xl shadow-2xl mb-20">
      <button className="mb-8 bg-gray-200 hover:bg-gray-300 text-black font-bold py-4 px-8 rounded-xl text-lg" onClick={() => setView('menu')}>⬅️ Volver al Menú</button>
      <h2 className="text-xl font-black mb-8 text-gray-800">📜 Historial de Actividades</h2>

      <div className="bg-gray-100 p-4 rounded-2xl mb-8 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xl font-bold text-gray-700 mb-2">Buscar en el registro</label>
          <input type="text" className="w-full text-lg p-4 rounded-xl border-2 border-gray-300 bg-white" placeholder="Ej: Tela, Juan, Anulación..." value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} />
        </div>
        <div>
          <label className="block text-xl font-bold text-gray-700 mb-2">Filtrar por Fecha</label>
          <input type="date" className="w-full text-lg p-4 rounded-xl border-2 border-gray-300 bg-white" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} />
        </div>
      </div>

      <div className="space-y-4">
        {historialFiltrado.length === 0 ? <p className="text-lg text-gray-500 italic">No se encontraron actividades.</p> :
          historialFiltrado.map(h => (
            <div key={h.id} className="bg-gray-50 p-4 rounded-2xl border-l-8 border-gray-400 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${h.accion === 'Creación' ? 'bg-green-500' : h.accion === 'Anulación' ? 'bg-red-500' : 'bg-blue-500'}`}>
                  {h.accion}
                </span>
                <span className="text-gray-500 font-bold">{new Date(h.fecha).toLocaleString()}</span>
              </div>
              <p className="text-lg text-gray-800">{h.descripcion}</p>
              <p className="text-sm text-gray-400 mt-2">Módulo: {h.entidad_tipo}</p>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── EditableSelect ────────────────────────────────────────────────────────────

function EditableSelect({ items, value, onChange, onAdd, onEdit, placeholder, themeColor = 'blue', showAdd = true }) {
  const [nuevo, setNuevo] = useState('');
  const [editando, setEditando] = useState(false);
  const [editNombre, setEditNombre] = useState('');

  const handleEditClick = () => {
    if (!value) return;
    const item = items.find(i => i.id.toString() === value.toString());
    if (item) { setEditNombre(item.nombre); setEditando(true); }
  };

  const saveEdit = () => {
    if (editNombre.trim()) { onEdit(value, editNombre); }
    setEditando(false);
  };

  return (
    <div className="space-y-4">
      {showAdd && (
        <div className={`flex gap-2 w-full bg-white p-2 border-2 border-${themeColor}-200 rounded-xl items-center`}>
          <input type="text" placeholder="Añadir nuevo al catálogo..." className="flex-1 min-w-0 p-2 text-xl outline-none" value={nuevo} onChange={e => setNuevo(e.target.value)} />
          <button onClick={() => { onAdd(nuevo); setNuevo(''); }} className={`shrink-0 bg-${themeColor}-600 hover:bg-${themeColor}-500 text-white font-bold px-4 py-2 rounded-lg text-lg flex items-center justify-center gap-2`}><span className="text-lg font-black">+</span> Añadir</button>
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
            className={`flex-1 text-lg p-4 border-2 border-${themeColor}-200 rounded-xl bg-white`}
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

// ── Distribuidor Form ─────────────────────────────────────────────────────────

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
    supabase.from('catalogo_prendas').select('*').then(({ data }) => setCatalogoPrendas(data || []));
    supabase.from('catalogo_maestro').select('*').then(({ data }) => setCatalogoTelas(data || []));
  }, []);

  const opcionesTallas = tipoTalla === 'alfabetico'
    ? ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    : Array.from({ length: 19 }, (_, i) => (i + 30).toString());

  const agregarPrenda = () => setPrendasCortadas([...prendasCortadas, { tipoPrenda: '', telaColor: '', talla: opcionesTallas[0], cantidad: '' }]);
  const eliminarPrenda = (idx) => setPrendasCortadas(prendasCortadas.filter((_, i) => i !== idx));
  const actualizarPrenda = (index, campo, valor) => {
    const nuevas = [...prendasCortadas];
    nuevas[index][campo] = valor;
    setPrendasCortadas(nuevas);
  };

  const addPrendaCat = async (nombre) => {
    if (!nombre) return;
    const { data } = await supabase.from('catalogo_prendas').insert({ nombre }).select().single();
    if (data) setCatalogoPrendas([...catalogoPrendas, data]);
  };
  const editPrendaCat = async (id, nombre) => {
    await supabase.from('catalogo_prendas').update({ nombre }).eq('id', id);
    setCatalogoPrendas(catalogoPrendas.map(c => c.id.toString() === id.toString() ? { ...c, nombre } : c));
  };
  const addTelaCat = async (nombre) => {
    if (!nombre) return;
    const { data } = await supabase.from('catalogo_maestro').insert({ nombre }).select().single();
    if (data) setCatalogoTelas([...catalogoTelas, data]);
  };
  const editTelaCat = async (id, nombre) => {
    await supabase.from('catalogo_maestro').update({ nombre }).eq('id', id);
    setCatalogoTelas(catalogoTelas.map(c => c.id.toString() === id.toString() ? { ...c, nombre } : c));
  };

  const guardarCorte = async () => {
    if (!nombre || !quienEntrego || !fechaRecibido || !fechaEntrega) { alert("Por favor completa los datos principales."); return; }

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
      const { data: nuevoCorte, error } = await supabase.from('cortes').insert({
        nombre, quien_entrego: quienEntrego, fecha_recibido: fechaRecibido, fecha_entrega: fechaEntrega
      }).select().single();

      if (error) { alert("❌ Error al guardar el corte."); setGuardando(false); return; }

      // Insertar prendas del corte
      const prendasInsert = prendasValidas.map(p => ({
        corte_id: nuevoCorte.id,
        tipo_prenda: p.tipo_prenda,
        tela_color: p.tela_color,
        talla: p.talla,
        cantidad_total: p.cantidad,
        cantidad_disponible: p.cantidad
      }));
      await supabase.from('prendas_corte').insert(prendasInsert);

      // Agregar al catálogo si no existe
      for (const p of prendasValidas) {
        const { data: existe } = await supabase.from('catalogo_prendas').select('id').eq('nombre', p.tipo_prenda).single();
        if (!existe) await supabase.from('catalogo_prendas').insert({ nombre: p.tipo_prenda });
      }

      await registrarActividad("Creación", `Se creó el nuevo corte '${nombre}'.`, "Corte", nuevoCorte.id);
      alert("✅ ¡Corte guardado exitosamente!");
      setView('menu');
    } catch { alert("❌ Error de conexión."); }
    setGuardando(false);
  };

  useEffect(() => {
    const nuevas = prendasCortadas.map(p => ({ ...p, talla: opcionesTallas[0] }));
    setPrendasCortadas(nuevas);
  }, [tipoTalla]);

  return (
    <div className="w-full max-w-full px-4 mx-auto bg-white p-5 rounded-3xl shadow-2xl mb-20">
      <button className="mb-8 bg-gray-200 hover:bg-gray-300 text-black font-bold py-4 px-8 rounded-xl text-lg" onClick={() => setView('menu')}>⬅️ Volver</button>
      <h2 className="text-xl font-black mb-8 text-blue-700">📦 Registrar Tela del Distribuidor</h2>

      <div className="space-y-8">
        <div className="bg-blue-50 p-4 rounded-2xl space-y-6">
          <h3 className="text-xl font-bold text-blue-900 border-b-2 border-blue-200 pb-2">Datos Principales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-lg font-bold mb-2">Nombre del Corte</label><input type="text" className="w-full text-lg p-4 border-2 border-gray-300 rounded-xl" value={nombre} onChange={e => setNombre(e.target.value)} /></div>
            <div><label className="block text-lg font-bold mb-2">Entregado por</label><input type="text" className="w-full text-lg p-4 border-2 border-gray-300 rounded-xl" value={quienEntrego} onChange={e => setQuienEntrego(e.target.value)} /></div>
            <div><label className="block text-lg font-bold mb-2">Fecha Recibido</label><input type="date" className="w-full text-lg p-4 border-2 border-gray-300 rounded-xl" value={fechaRecibido} onChange={e => setFechaRecibido(e.target.value)} /></div>
            <div><label className="block text-lg font-bold mb-2">Fecha Límite</label><input type="date" className="w-full text-lg p-4 border-2 border-gray-300 rounded-xl" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} /></div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-2xl space-y-6">
          <div className="flex justify-between items-center border-b-2 border-purple-200 pb-2">
            <h3 className="text-xl font-bold text-purple-900">Prendas Cortadas (Inventario del Corte)</h3>
            <div className="flex bg-purple-200 rounded-xl overflow-hidden">
              <button onClick={() => setTipoTalla('alfabetico')} className={`px-4 py-2 font-bold text-xl ${tipoTalla === 'alfabetico' ? 'bg-purple-600 text-white' : 'text-purple-900'}`}>S, M, L</button>
              <button onClick={() => setTipoTalla('numerico')} className={`px-4 py-2 font-bold text-xl ${tipoTalla === 'numerico' ? 'bg-purple-600 text-white' : 'text-purple-900'}`}>30 al 48</button>
            </div>
          </div>

          <div className="space-y-6">
            {prendasCortadas.map((prenda, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border-2 border-purple-200 shadow-sm relative grid grid-cols-1 md:grid-cols-2 gap-4">
                {prendasCortadas.length > 1 && (
                  <button onClick={() => eliminarPrenda(idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl">❌</button>
                )}

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div className="flex gap-2 w-full bg-white p-2 border-2 border-purple-200 rounded-xl items-center">
                    <input type="text" placeholder="Añadir prenda al catálogo..." className="flex-1 min-w-0 p-2 text-xl outline-none" id={`add-prenda-corte-${idx}`} />
                    <button onClick={() => {
                      const input = document.getElementById(`add-prenda-corte-${idx}`);
                      if (input.value) { addPrendaCat(input.value); input.value = ''; }
                    }} className="shrink-0 bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-lg text-lg flex items-center justify-center gap-2">
                      <span className="text-lg font-black">+</span> Añadir
                    </button>
                  </div>
                  <div className="flex gap-2 w-full bg-white p-2 border-2 border-purple-200 rounded-xl items-center">
                    <input type="text" placeholder="Añadir tela al catálogo..." className="flex-1 min-w-0 p-2 text-xl outline-none" id={`add-tela-corte-${idx}`} />
                    <button onClick={() => {
                      const input = document.getElementById(`add-tela-corte-${idx}`);
                      if (input.value) { addTelaCat(input.value); input.value = ''; }
                    }} className="shrink-0 bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-lg text-lg flex items-center justify-center gap-2">
                      <span className="text-lg font-black">+</span> Añadir
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
                  <CustomSelect options={opcionesTallas.map(t => ({ value: t, label: t }))} value={prenda.talla} onChange={v => actualizarPrenda(idx, 'talla', v)} placeholder="Seleccionar talla" className="w-full text-xl p-3 border-2 border-purple-200 rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block text-lg font-bold mb-1 text-purple-900">Cantidad Cortada</label>
                  <input type="number" className="w-full text-xl p-4 border-2 border-purple-200 rounded-xl bg-white" placeholder="Ej: 20" value={prenda.cantidad} onChange={e => actualizarPrenda(idx, 'cantidad', e.target.value)} />
                </div>
              </div>
            ))}
          </div>
          <button onClick={agregarPrenda} className="w-full bg-purple-200 text-purple-900 font-bold py-4 px-6 rounded-xl text-lg">➕ Añadir otra prenda al corte</button>
        </div>

        <button disabled={guardando} onClick={guardarCorte} className="w-full bg-green-600 text-white font-black py-8 rounded-3xl text-lg">{guardando ? "⏳ Guardando..." : "✅ Guardar Nuevo Corte"}</button>
      </div>
    </div>
  );
}

// ── Comprar Insumos Form ──────────────────────────────────────────────────────

function ComprarInsumosForm({ setView }) {
  const [cortes, setCortes] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [corteId, setCorteId] = useState('');
  const [insumos, setInsumos] = useState([{ nombre: '', cantidad: '', precio_total: '' }]);
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().split('T')[0]);
  const [guardando, setGuardando] = useState(false);
  const [nuevoCat, setNuevoCat] = useState('');

  useEffect(() => {
    supabase.from('cortes').select('*').then(({ data }) => setCortes(data || []));
    supabase.from('catalogo_maestro').select('*').then(({ data }) => setCatalogo(data || []));
  }, []);

  const agregarInsumo = () => setInsumos([...insumos, { nombre: '', cantidad: '' }]);
  const actualizarInsumo = (index, campo, valor) => {
    const nuevos = [...insumos];
    nuevos[index][campo] = valor;
    setInsumos(nuevos);
  };

  const addCatalogo = async (nombre) => {
    if (!nombre) return;
    const { data } = await supabase.from('catalogo_maestro').insert({ nombre }).select().single();
    if (data) { setCatalogo([...catalogo, data]); setNuevoCat(''); alert("✅ Añadido al catálogo"); }
  };
  const editCatalogo = async (id, nombre) => {
    await supabase.from('catalogo_maestro').update({ nombre }).eq('id', id);
    setCatalogo(catalogo.map(c => c.id.toString() === id.toString() ? { ...c, nombre } : c));
    alert("✏️ Actualizado exitosamente");
  };

  const guardarCompra = async () => {
    if (!corteId) { alert("Selecciona un Corte primero."); return; }
    const insumosValidos = insumos.filter(i => i.nombre && i.cantidad).map(i => {
      const catItem = catalogo.find(c => c.id.toString() === i.nombre.toString());
      return { nombre: catItem ? catItem.nombre : '', cantidad: parseFloat(i.cantidad), precio_total: parseFloat(i.precio_total) || 0.0 };
    }).filter(i => i.nombre !== '');

    if (insumosValidos.length === 0) { alert("Añade al menos un material con cantidad válida."); return; }

    setGuardando(true);
    const registros = insumosValidos.map(i => ({
      corte_id: parseInt(corteId),
      nombre: i.nombre,
      cantidad: i.cantidad,
      precio_total: i.precio_total,
      fecha_compra: fechaCompra
    }));
    const { error } = await supabase.from('insumos_compra').insert(registros);
    if (!error) {
      await registrarActividad("Creación", `Se registraron insumos para el corte ID ${corteId}.`, "Insumos", parseInt(corteId));
      alert("🛍️ ¡Todas las compras registradas con éxito!");
      setInsumos([{ nombre: '', cantidad: '', precio_total: '' }]);
    }
    setGuardando(false);
  };

  return (
    <div className="w-full max-w-full px-4 mx-auto bg-white p-5 rounded-3xl shadow-2xl mb-20">
      <button className="mb-8 bg-gray-200 hover:bg-gray-300 text-black font-bold py-4 px-8 rounded-xl text-lg" onClick={() => setView('menu')}>⬅️ Volver</button>
      <h2 className="text-xl font-black mb-8 text-red-600">🪡🧵 Registrar Material (Mercadería)</h2>
      <div className="space-y-6 bg-red-50 p-4 rounded-2xl">
        <div>
          <label className="block text-lg font-bold mb-2 text-red-900">¿Para qué Corte se compró?</label>
          <CustomSelect
            className="w-full text-lg p-4 border-2 border-red-200 rounded-xl bg-white"
            value={corteId}
            onChange={setCorteId}
            placeholder="-- Selecciona un Corte --"
            options={cortes.filter(c => c.estado !== 'Entregado').map(c => ({ value: c.id, label: c.nombre }))}
          />
        </div>

        <div>
          <label className="block text-lg font-bold mb-2 text-red-900">Fecha de las compras</label>
          <input type="date" className="w-full text-lg p-4 border-2 border-red-200 rounded-xl bg-white" value={fechaCompra} onChange={e => setFechaCompra(e.target.value)} />
        </div>

        <div className="pt-4 border-t-2 border-red-200">
          <label className="block text-lg font-bold mb-4 text-red-900">Insumos Comprados (Catálogo)</label>

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
              <p className="text-xl font-black text-red-700">Bs. {insumos.reduce((acc, i) => acc + (parseFloat(i.precio_total) || 0), 0).toFixed(2)}</p>
            </div>
            <button onClick={agregarInsumo} className="bg-red-200 text-red-900 font-bold py-3 px-6 rounded-xl text-xl mt-4">➕ Añadir otra fila</button>
          </div>
        </div>

        <button disabled={guardando} onClick={guardarCompra} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-6 rounded-2xl text-xl mt-8">
          {guardando ? "⏳ Registrando en lote..." : "📥 Guardar Todo"}
        </button>
      </div>
    </div>
  );
}

// ── Repartir Trabajo Form ─────────────────────────────────────────────────────

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
    const cargar = async () => {
      const [{ data: c }, { data: t }, { data: cat }, { data: cp }, { data: pc }] = await Promise.all([
        supabase.from('cortes').select('*, prendas_corte(*)'),
        supabase.from('trabajadores').select('*'),
        supabase.from('catalogo_maestro').select('*'),
        supabase.from('catalogo_prendas').select('*'),
        supabase.from('prendas_corte').select('*'),
      ]);
      // Enriquecer cortes con prendas_corte
      setCortes(c || []);
      setTrabajadores(t || []);
      setCatalogo(cat || []);
      setCatalogoPrendas(cp || []);
    };
    cargar();
  }, []);

  const agregarInsumo = () => setInsumosEntregados([...insumosEntregados, { nombre: '', cantidad: '' }]);
  const actualizarInsumo = (index, campo, valor) => {
    const nuevos = [...insumosEntregados];
    nuevos[index][campo] = valor;
    setInsumosEntregados(nuevos);
  };

  const addCatalogo = async (nombre) => {
    if (!nombre) return;
    const { data } = await supabase.from('catalogo_maestro').insert({ nombre }).select().single();
    if (data) { setCatalogo([...catalogo, data]); setNuevoCat(''); alert("✅ Añadido al catálogo"); }
  };
  const editCatalogo = async (id, nombre) => {
    await supabase.from('catalogo_maestro').update({ nombre }).eq('id', id);
    setCatalogo(catalogo.map(c => c.id.toString() === id.toString() ? { ...c, nombre } : c));
    alert("✏️ Insumo actualizado");
  };
  const addPrendaCat = async (nombre) => {
    if (!nombre) return;
    const { data } = await supabase.from('catalogo_prendas').insert({ nombre }).select().single();
    if (data) { setCatalogoPrendas([...catalogoPrendas, data]); alert("✅ Añadido al catálogo de prendas"); }
  };
  const editPrendaCat = async (id, nombre) => {
    await supabase.from('catalogo_prendas').update({ nombre }).eq('id', id);
    setCatalogoPrendas(catalogoPrendas.map(c => c.id.toString() === id.toString() ? { ...c, nombre } : c));
    alert("✏️ Prenda actualizada");
  };
  const addTrabajador = async (nombre) => {
    if (!nombre) return;
    const { data } = await supabase.from('trabajadores').insert({ nombre }).select().single();
    if (data) { setTrabajadores([...trabajadores, data]); setTrabajadorId(data.id); alert("✅ Costurero añadido"); }
  };
  const editTrabajador = async (id, nombre) => {
    await supabase.from('trabajadores').update({ nombre }).eq('id', id);
    setTrabajadores(trabajadores.map(c => c.id.toString() === id.toString() ? { ...c, nombre } : c));
    alert("✏️ Costurero actualizado");
  };

  const guardarAsignacion = async () => {
    if (!corteId || !trabajadorId) { alert("Selecciona corte y costurero"); return; }

    const prendasValidas = prendasAsignadas.filter(p => p.tipoPrenda && p.cantidad && p.pagoPorPrenda && p.telaColor && p.talla).map(p => ({
      tipo_prenda: p.tipoPrenda,
      tela_color: p.telaColor,
      talla: p.talla,
      cantidad: parseInt(p.cantidad),
      pago_por_prenda: parseFloat(p.pagoPorPrenda)
    }));

    if (prendasValidas.length === 0 || prendasValidas.length !== prendasAsignadas.length) {
      alert("Por favor llena TODOS los campos requeridos (Prenda, Tela, Talla, Cantidad, Pago) de cada prenda asignada.");
      return;
    }

    // Validar inventario
    for (const p of prendasValidas) {
      const { data: inv } = await supabase.from('prendas_corte')
        .select('id, cantidad_disponible')
        .eq('corte_id', parseInt(corteId))
        .eq('tipo_prenda', p.tipo_prenda)
        .eq('tela_color', p.tela_color)
        .eq('talla', p.talla)
        .single();
      if (!inv || inv.cantidad_disponible < p.cantidad) {
        alert(`No hay suficiente inventario disponible para ${p.tipo_prenda} (${p.tela_color}, ${p.talla}). Solicitado: ${p.cantidad}`);
        return;
      }
    }

    setGuardando(true);
    for (const p of prendasValidas) {
      // Descontar inventario
      const { data: inv } = await supabase.from('prendas_corte')
        .select('id, cantidad_disponible')
        .eq('corte_id', parseInt(corteId))
        .eq('tipo_prenda', p.tipo_prenda)
        .eq('tela_color', p.tela_color)
        .eq('talla', p.talla)
        .single();

      await supabase.from('prendas_corte').update({ cantidad_disponible: inv.cantidad_disponible - p.cantidad }).eq('id', inv.id);

      // Insertar asignación
      const { data: nuevaAsig } = await supabase.from('asignaciones').insert({
        corte_id: parseInt(corteId),
        trabajador_id: parseInt(trabajadorId),
        tipo_prenda: p.tipo_prenda,
        tela_color: p.tela_color,
        talla: p.talla,
        cantidad: p.cantidad,
        pago_por_prenda: p.pago_por_prenda
      }).select().single();

      // Insumos entregados
      const insumosValidos = insumosEntregados.filter(i => i.nombre && i.cantidad).map(i => {
        const catItem = catalogo.find(c => c.id.toString() === i.nombre.toString());
        return { asignacion_id: nuevaAsig.id, nombre: catItem ? catItem.nombre : '', cantidad: parseFloat(i.cantidad) };
      }).filter(i => i.nombre !== '');
      if (insumosValidos.length > 0) await supabase.from('insumos_asignacion').insert(insumosValidos);
    }

    await registrarActividad("Creación", `Asignación múltiple para trabajador ${trabajadorId}.`, "Asignación", parseInt(corteId));
    alert("✂️ ¡Trabajo asignado exitosamente!");
    setView('menu');
    setGuardando(false);
  };

  const cortesActivos = cortes.filter(c => c.estado !== 'Entregado');
  const corteSeleccionado = cortes.find(c => c.id.toString() === corteId.toString());

  const getPrendaOptions = () => {
    if (!corteSeleccionado?.prendas_corte) return [];
    return [...new Set(corteSeleccionado.prendas_corte.map(p => p.tipo_prenda))].map(u => ({ value: u, label: u }));
  };
  const getTelaOptions = (tipoPrenda) => {
    if (!corteSeleccionado?.prendas_corte || !tipoPrenda) return [];
    return [...new Set(corteSeleccionado.prendas_corte.filter(p => p.tipo_prenda === tipoPrenda).map(p => p.tela_color))].map(u => ({ value: u, label: u }));
  };
  const getTallaOptions = (tipoPrenda, telaColor) => {
    if (!corteSeleccionado?.prendas_corte || !tipoPrenda || !telaColor) return [];
    return [...new Set(corteSeleccionado.prendas_corte.filter(p => p.tipo_prenda === tipoPrenda && p.tela_color === telaColor).map(p => p.talla))].map(u => ({ value: u, label: u }));
  };
  const getMaxDisponibles = (tipoPrenda, telaColor, talla) => {
    if (!corteSeleccionado?.prendas_corte) return 0;
    const inv = corteSeleccionado.prendas_corte.find(p => p.tipo_prenda === tipoPrenda && p.tela_color === telaColor && p.talla === talla);
    return inv ? inv.cantidad_disponible : 0;
  };

  return (
    <div className="w-full max-w-full px-4 mx-auto bg-white p-5 rounded-3xl shadow-2xl mb-20">
      <button className="mb-8 bg-gray-200 hover:bg-gray-300 text-black font-bold py-4 px-8 rounded-xl text-lg flex items-center" onClick={() => setView('menu')}>⬅️ Volver</button>
      <h2 className="text-xl font-black mb-8 text-orange-600">✂️ Repartir Trabajo</h2>

      <div className="space-y-8">
        <div className="bg-orange-50 p-4 rounded-2xl space-y-6">
          <div>
            <label className="block text-lg font-bold mb-2 text-orange-900">1. ¿A qué Corte pertenece la ropa?</label>
            <CustomSelect
              className="w-full text-lg p-4 border-2 border-orange-200 rounded-xl bg-white"
              value={corteId}
              onChange={setCorteId}
              placeholder="-- Selecciona el Corte --"
              options={cortesActivos.map(c => ({ value: c.id, label: c.nombre }))}
            />
          </div>

          <div>
            <label className="block text-lg font-bold mb-2 text-orange-900">¿A qué Costurero se le asigna?</label>
            <EditableSelect items={trabajadores} value={trabajadorId} onChange={setTrabajadorId} onAdd={addTrabajador} onEdit={editTrabajador} placeholder="-- Selecciona Costurero --" themeColor="orange" />
          </div>

          <div className="pt-4 border-t-2 border-orange-200">
            <h3 className="text-xl font-bold mb-4 text-orange-900">Prendas a Asignar</h3>
            <div className="space-y-4">
              {prendasAsignadas.map((prenda, idx) => {
                const disponibles = getMaxDisponibles(prenda.tipoPrenda, prenda.telaColor, prenda.talla);
                return (
                  <div key={idx} className="bg-white p-4 rounded-2xl border-2 border-orange-200 shadow-sm relative grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          if (val > disponibles) { alert(`Solo hay ${disponibles} disponibles de este artículo.`); val = disponibles; }
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

            <div className="mt-6 bg-orange-100 p-4 rounded-2xl border-2 border-orange-300 flex justify-between items-center shadow-inner">
              <label className="text-lg font-bold text-orange-800">Subtotal Global a Pagar</label>
              <p className="text-xl font-black text-orange-700">Bs. {prendasAsignadas.reduce((acc, p) => acc + ((parseFloat(p.cantidad) || 0) * (parseFloat(p.pagoPorPrenda) || 0)), 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-2xl space-y-6">
          <h3 className="text-xl font-bold text-yellow-900 border-b-2 border-yellow-200 pb-2">Materiales a Entregarle (Mercadería)</h3>

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
                <input type="number" className="w-1/4 h-16 text-lg p-4 border-2 border-yellow-300 rounded-xl bg-white" placeholder="Cant." value={insumo.cantidad} onChange={e => actualizarInsumo(index, 'cantidad', e.target.value)} />
              </div>
            ))}
            <button onClick={agregarInsumo} className="bg-yellow-200 text-yellow-900 font-bold py-3 px-6 rounded-xl text-xl mt-4">➕ Añadir otra fila</button>
          </div>
        </div>

        <button disabled={guardando} onClick={guardarAsignacion} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-8 rounded-3xl text-lg">{guardando ? "⏳ Guardando..." : "✅ Asignar Trabajo"}</button>
      </div>
    </div>
  );
}

// ── Dashboard View ────────────────────────────────────────────────────────────

function DashboardView({ setView }) {
  const [cortes, setCortes] = useState([]);
  const [expandedTallas, setExpandedTallas] = useState(null);
  const [expandedAsignaciones, setExpandedAsignaciones] = useState(null);
  const [expandedTelas, setExpandedTelas] = useState(null);

  const cargarCortes = async () => {
    const { data } = await supabase.from('cortes').select(`
      *,
      prendas_corte(*),
      asignaciones(*, trabajador:trabajadores(nombre)),
      telas_corte(*)
    `);
    if (!data) return;
    const enriched = data.map(c => ({
      ...c,
      total_prendas: (c.prendas_corte || []).reduce((s, p) => s + p.cantidad_total, 0),
      total_asignado: (c.asignaciones || []).reduce((s, a) => s + a.cantidad, 0),
      prendas_corte: c.prendas_corte || [],
      detalle_asignaciones: (c.asignaciones || []).map(a => ({
        id: a.id,
        trabajador: a.trabajador?.nombre || 'N/A',
        cantidad: a.cantidad,
        tipo_prenda: a.tipo_prenda,
        tela_color: a.tela_color,
        talla: a.talla,
        pago_por_prenda: a.pago_por_prenda
      })),
      detalle_telas: c.telas_corte || [],
    }));
    setCortes(enriched);
  };

  useEffect(() => { cargarCortes(); }, []);

  const editarTela = async (telaId, color, currentMetros) => {
    const nuevosMetros = window.prompt(`Editar cantidad de metros para la tela ${color}:`, currentMetros);
    if (nuevosMetros && parseFloat(nuevosMetros) !== currentMetros) {
      await supabase.from('telas_corte').update({ cantidad_metros: parseFloat(nuevosMetros) }).eq('id', telaId);
      cargarCortes();
    }
  };

  const cambiarEstadoCorte = async (corteId, nuevoEstado) => {
    await supabase.from('cortes').update({ estado: nuevoEstado }).eq('id', corteId);
    await registrarActividad("Edición", `Estado de corte ID ${corteId} cambiado a ${nuevoEstado}`, "Corte", corteId);
    cargarCortes();
  };

  const devolverPrendas = async (asignacionId, maxCantidad) => {
    const cant = window.prompt(`¿Cuántas prendas devolvió el costurero? (Máximo ${maxCantidad})`);
    if (cant && parseInt(cant) > 0 && parseInt(cant) <= maxCantidad) {
      const { data: asig } = await supabase.from('asignaciones').select('*').eq('id', asignacionId).single();
      const devolver = parseInt(cant);

      // Reintegrar inventario
      const { data: inv } = await supabase.from('prendas_corte')
        .select('id, cantidad_disponible')
        .eq('corte_id', asig.corte_id)
        .eq('tipo_prenda', asig.tipo_prenda)
        .eq('tela_color', asig.tela_color)
        .eq('talla', asig.talla)
        .single();
      if (inv) await supabase.from('prendas_corte').update({ cantidad_disponible: inv.cantidad_disponible + devolver }).eq('id', inv.id);

      if (devolver >= asig.cantidad) {
        await supabase.from('asignaciones').delete().eq('id', asignacionId);
      } else {
        await supabase.from('asignaciones').update({ cantidad: asig.cantidad - devolver }).eq('id', asignacionId);
      }

      await registrarActividad("Devolución", `Devolución de ${devolver} prendas de asignación ${asignacionId}`, "Asignación", asignacionId);
      cargarCortes();
    } else if (cant) {
      alert("Cantidad inválida");
    }
  };

  return (
    <div className="w-full max-w-full px-4 mx-auto bg-white p-5 rounded-3xl shadow-2xl mb-20">
      <div className="flex justify-between items-center mb-8">
        <button className="bg-gray-200 hover:bg-gray-300 text-black font-bold py-4 px-8 rounded-xl text-lg" onClick={() => setView('menu')}>⬅️ Volver</button>
        <button className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-md" onClick={() => setView('pagos')}>💵 Ir a Pagos</button>
      </div>
      <h2 className="text-xl font-black mb-8 text-purple-700">📊 Resumen y Cortes Activos</h2>
      <div className="space-y-6">
        {cortes.length === 0 ? <p className="text-lg text-gray-500">No hay cortes registrados aún.</p> : cortes.map(corte => (
          <div key={corte.id} className="border-4 border-purple-100 rounded-3xl p-4 bg-purple-50 flex flex-col gap-4 shadow-sm transition-all duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-purple-900 mb-2">{corte.nombre}</h3>
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
              <div className="bg-white p-4 rounded-2xl shadow-sm min-w-[150px] cursor-pointer hover:bg-purple-100 transition-colors border-2 border-transparent hover:border-purple-200" onClick={() => setExpandedTallas(expandedTallas === corte.id ? null : corte.id)}>
                <p className="text-gray-500 font-bold text-lg">Total Prendas</p>
                <p className="text-lg font-black text-blue-600">{corte.total_prendas}</p>
                <p className="text-xs text-gray-400 mt-1">👆 Toca para ver</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm min-w-[150px] cursor-pointer hover:bg-orange-50 transition-colors border-2 border-transparent hover:border-orange-200" onClick={() => setExpandedAsignaciones(expandedAsignaciones === corte.id ? null : corte.id)}>
                <p className="text-gray-500 font-bold text-lg">Ya Asignadas</p>
                <p className="text-lg font-black text-orange-500">{corte.total_asignado}</p>
                <p className="text-xs text-gray-400 mt-1">👆 Toca para ver</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm min-w-[150px] cursor-pointer hover:bg-green-50 transition-colors border-2 border-transparent hover:border-green-200" onClick={() => setExpandedTelas(expandedTelas === corte.id ? null : corte.id)}>
                <p className="text-gray-500 font-bold text-lg">Telas</p>
                <p className="text-lg font-black text-green-500">{corte.detalle_telas?.length || 0}</p>
                <p className="text-xs text-gray-400 mt-1">👆 Toca para editar</p>
              </div>
            </div>

            {expandedTelas === corte.id && (
              <div className="mt-4 p-4 bg-white rounded-2xl shadow-inner border border-green-100 animate-fade-in">
                <h4 className="font-bold text-green-800 text-lg mb-4 border-b pb-2">🧵 Telas Entregadas</h4>
                <ul className="space-y-4">
                  {corte.detalle_telas?.map((tela, idx) => (
                    <li key={idx} className="text-xl flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div>
                        <span className="font-bold text-gray-800 text-lg">{tela.color}</span>
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
              <div className="mt-4 p-4 bg-white rounded-2xl shadow-inner border border-blue-100 animate-fade-in">
                <h4 className="font-bold text-blue-800 text-lg mb-4 border-b pb-2">👕 Desglose de Inventario (Prendas)</h4>
                <ul className="space-y-2">
                  {corte.prendas_corte?.map((p, idx) => (
                    <li key={idx} className="text-xl text-gray-600 flex justify-between bg-gray-50 p-3 rounded-xl">
                      <span>{p.tipo_prenda} • {p.tela_color} • Talla <span className="font-bold text-gray-800">{p.talla}</span></span>
                      <span className="font-black text-blue-600">{p.cantidad_disponible}/{p.cantidad_total}</span>
                    </li>
                  ))}
                  {(!corte.prendas_corte || corte.prendas_corte.length === 0) && <li className="text-lg text-gray-400 italic">No hay prendas.</li>}
                </ul>
              </div>
            )}

            {expandedAsignaciones === corte.id && (
              <div className="mt-4 p-4 bg-white rounded-2xl shadow-inner border border-orange-100 animate-fade-in">
                <h4 className="font-bold text-orange-800 text-lg mb-4 border-b pb-2">👥 Costureros Asignados</h4>
                <ul className="space-y-4">
                  {corte.detalle_asignaciones?.map((a, idx) => (
                    <li key={idx} className="text-xl text-gray-600 flex justify-between items-center bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm">
                      <div>
                        <p>👤 <span className="font-bold text-gray-800">{a.trabajador}</span></p>
                        <p className="text-sm text-gray-500 mt-1">{a.tipo_prenda} • Tela: {a.tela_color || 'N/A'} • Talla: {a.talla || 'N/A'}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-orange-600 text-xl">{a.cantidad} <span className="text-sm font-normal">prendas</span></span>
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

// ── Finanzas View ─────────────────────────────────────────────────────────────

function FinanzasView({ setView, usuario }) {
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

  const cargarDatos = async () => {
    const [{ data: t }, { data: c }, { data: pagos }, { data: ingresos }, { data: asignaciones }] = await Promise.all([
      supabase.from('trabajadores').select('*'),
      supabase.from('cortes').select('*'),
      supabase.from('pagos_trabajador').select('*'),
      supabase.from('ingresos_corte').select('*'),
      supabase.from('asignaciones').select('*'),
    ]);
    setTrabajadores(t || []);
    setCortes(c || []);
    setFinanzas({ pagos: pagos || [], ingresos: ingresos || [], asignaciones: asignaciones || [] });
  };

  useEffect(() => { cargarDatos(); }, []);

  const fMoney = (val) => privado ? '***' : `Bs. ${parseFloat(val).toFixed(2)}`;

  const registrarPago = async () => {
    if (!montoPago || filtroCosturero === 'TODOS') return;
    const pago = {
      trabajador_id: parseInt(filtroCosturero),
      monto: parseFloat(montoPago),
      fecha: new Date().toISOString().split('T')[0],
      corte_id: filtroCorteCosturero !== 'TODOS' ? parseInt(filtroCorteCosturero) : null
    };
    await supabase.from('pagos_trabajador').insert(pago);
    await registrarActividad("Creación", `Se registró pago de Bs. ${pago.monto} para trabajador ${pago.trabajador_id}.`, "Pago", null);
    setMontoPago('');
    cargarDatos();
  };

  const anularPago = async (pagoId) => {
    if (window.confirm("¿Seguro que deseas ANULAR este pago? El dinero volverá a la deuda del trabajador.")) {
      const { data: pago } = await supabase.from('pagos_trabajador').select('monto, fecha').eq('id', pagoId).single();
      await supabase.from('pagos_trabajador').delete().eq('id', pagoId);
      await registrarActividad("Anulación", `Se anuló un pago de Bs. ${pago?.monto} de fecha ${pago?.fecha}.`, "Pago", pagoId);
      cargarDatos();
    }
  };

  const registrarIngreso = async () => {
    if (filtroCorte === 'TODOS' || !montoIngreso) return alert("Selecciona corte y monto");
    const { error } = await supabase.from('ingresos_corte').insert({
      corte_id: parseInt(filtroCorte),
      monto: parseFloat(montoIngreso),
      fecha: new Date().toISOString().split('T')[0],
      descripcion: descIngreso || 'Adelanto/Pago'
    });
    if (!error) {
      await registrarActividad("Creación", `Ingreso de Bs. ${montoIngreso} (Corte ID ${filtroCorte}).`, "Ingreso", parseInt(filtroCorte));
      alert("Ingreso registrado");
      setMontoIngreso('');
      setDescIngreso('');
      cargarDatos();
    }
  };

  const baseAsignacionesCosturero = finanzas.asignaciones.filter(a => filtroCosturero === 'TODOS' || a.trabajador_id.toString() === filtroCosturero.toString());
  const basePagosCosturero = finanzas.pagos.filter(p => filtroCosturero === 'TODOS' || p.trabajador_id.toString() === filtroCosturero.toString());
  const cortesCostureroIds = [...new Set(baseAsignacionesCosturero.map(a => a.corte_id))];
  const cortesCostureroOpciones = cortes.filter(c => cortesCostureroIds.includes(c.id)).map(c => ({ value: c.id, label: c.nombre }));
  const asignacionesCosturero = baseAsignacionesCosturero.filter(a => filtroCorteCosturero === 'TODOS' || a.corte_id.toString() === filtroCorteCosturero.toString());
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
    <div className="w-full max-w-full px-4 mx-auto bg-white p-5 rounded-3xl shadow-2xl mb-20">
      <div className="flex justify-between items-center mb-8">
        <button className="bg-gray-200 hover:bg-gray-300 text-black font-bold py-4 px-8 rounded-xl text-lg flex items-center" onClick={() => setView('menu')}>⬅️ Volver</button>
        <button className={`py-4 px-8 rounded-xl text-lg font-black transition-colors ${privado ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`} onClick={() => setPrivado(!privado)}>
          {privado ? "👁️ Oculto (Modo Discreto)" : "👁️ Visible"}
        </button>
      </div>

      <h2 className="text-xl font-black mb-8 text-green-700">💼 Contabilidad y Pagos</h2>

      <div className="flex flex-col md:flex-row bg-gray-100 p-2 rounded-2xl mb-8 gap-2">
        <button onClick={() => setTab('costureros')} className={`flex-1 py-4 text-lg font-bold rounded-xl ${tab === 'costureros' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500'}`}>✂️ Pagos a Costureros</button>
        <button onClick={() => setTab('cortes')} className={`flex-1 py-4 text-lg font-bold rounded-xl ${tab === 'cortes' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500'}`}>📦 Ingresos del Distribuidor</button>
      </div>

      {tab === 'costureros' && (
        <div className="space-y-8 animate-fade-in">
          <div>
            <label className="block text-xl font-bold text-green-800 mb-2">Filtrar por Costurero</label>
            <CustomSelect
              className="w-full text-xl p-4 border-4 border-green-200 rounded-2xl bg-green-50 font-bold text-green-900"
              value={filtroCosturero}
              onChange={(v) => { setFiltroCosturero(v); setFiltroCorteCosturero('TODOS'); }}
              placeholder="Seleccionar Costurero"
              options={[{ value: 'TODOS', label: 'Ver Todos' }, ...trabajadores.map(t => ({ value: t.id, label: t.nombre }))]}
            />
          </div>

          {filtroCosturero !== 'TODOS' && cortesCostureroOpciones.length > 0 && (
            <div className="animate-fade-in -mt-4">
              <label className="block text-xl font-bold text-orange-800 mb-2">Filtrar por Corte Asignado</label>
              <CustomSelect
                className="w-full text-lg p-4 border-2 border-orange-200 rounded-2xl bg-orange-50 font-bold text-orange-900"
                value={filtroCorteCosturero}
                onChange={setFiltroCorteCosturero}
                placeholder="Seleccionar Corte"
                options={[{ value: 'TODOS', label: 'Todos sus cortes' }, ...cortesCostureroOpciones]}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-200 shadow-sm">
              <p className="text-xl text-gray-500 font-bold">{filtroCosturero === 'TODOS' ? 'Total Global Ganado' : 'Total Ganado (Trabajos)'}</p>
              <p className="text-lg font-black text-gray-800">{fMoney(totalGenerado)}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-200 shadow-sm">
              <p className="text-xl text-blue-500 font-bold">{filtroCosturero === 'TODOS' ? 'Total Pagado a Todos' : 'Total Pagado / Adelantos'}</p>
              <p className="text-lg font-black text-blue-800">{fMoney(totalPagado)}</p>
            </div>
            <div className={`p-4 rounded-2xl border-2 shadow-sm ${deudaActual > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-xl font-bold ${deudaActual > 0 ? 'text-red-500' : 'text-green-500'}`}>Deuda Pendiente a Pagar</p>
              <p className={`text-xl font-black ${deudaActual > 0 ? 'text-red-600' : 'text-green-600'}`}>{fMoney(deudaActual)}</p>
            </div>
          </div>

          {filtroCosturero !== 'TODOS' && (
            <div className="bg-green-100 p-4 rounded-2xl border-2 border-green-300 flex flex-col md:flex-row gap-4 items-end shadow-inner">
              <div className="flex-1 w-full">
                <label className="block text-lg font-bold mb-2 text-green-900">Registrar Pago o Adelanto (Bs.)</label>
                <input type="number" className="w-full text-xl p-4 rounded-xl border-2 border-green-200 bg-white" placeholder="Monto en Bs." value={montoPago} onChange={e => setMontoPago(e.target.value)} />
              </div>
              <button onClick={registrarPago} className="bg-green-600 hover:bg-green-500 text-white font-black px-8 py-4 text-xl rounded-xl w-full md:w-auto">💵 Registrar Pago</button>
            </div>
          )}

          {filtroCosturero !== 'TODOS' && (
            <div className="bg-gray-100 p-4 rounded-2xl flex flex-col md:flex-row gap-4 shadow-sm border-2 border-gray-200">
              <div className="flex-1">
                <label className="block text-xl font-bold text-gray-700 mb-2">Fecha Inicial (Pagos)</label>
                <input type="date" className="w-full text-lg p-4 rounded-xl border-2 border-gray-300 bg-white" value={fechaInicioPagos} onChange={e => setFechaInicioPagos(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="block text-xl font-bold text-gray-700 mb-2">Fecha Final (Pagos)</label>
                <input type="date" className="w-full text-lg p-4 rounded-xl border-2 border-gray-300 bg-white" value={fechaFinPagos} onChange={e => setFechaFinPagos(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xl font-bold mb-4 text-gray-700">Historial de Pagos Efectuados</h3>
            <div className="space-y-4">
              {pagosMostrados.length === 0 ? <p className="text-lg text-gray-400 italic">No hay pagos {(fechaInicioPagos || fechaFinPagos) && 'en estas fechas'}.</p> : pagosMostrados.map(p => {
                const nombreCosturero = filtroCosturero === 'TODOS' ? `(ID: ${p.trabajador_id})` : '';
                const nombreCortePago = p.corte_id ? cortes.find(c => c.id.toString() === p.corte_id.toString())?.nombre : 'Pago Global';
                return (
                  <div key={p.id} className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border-2 border-gray-100 shadow-sm gap-4">
                    <div className="flex-1 w-full flex justify-between items-center">
                      <div>
                        <p className="text-lg font-bold text-gray-800">Adelanto / Pago {nombreCosturero}</p>
                        <p className="text-xl text-gray-500">{new Date(p.fecha).toLocaleDateString()} {p.corte_id && `• Corte: ${nombreCortePago}`}</p>
                      </div>
                      <p className="text-xl font-black text-green-600">+{fMoney(p.monto)}</p>
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
              className="w-full text-xl p-4 border-4 border-blue-200 rounded-2xl bg-blue-50 font-bold text-blue-900"
              value={filtroCorte}
              onChange={setFiltroCorte}
              placeholder="Seleccionar Corte"
              options={[{ value: 'TODOS', label: 'Ver Todos' }, ...cortes.map(c => ({ value: c.id, label: c.nombre }))]}
            />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-blue-50 p-4 rounded-2xl border-2 border-blue-200 shadow-sm">
            <div>
              <p className="text-xl text-blue-500 font-bold">Total Ingresado del Distribuidor</p>
              <p className="text-xl font-black text-blue-800">{fMoney(totalIngresado)}</p>
            </div>
            {filtroCorte !== 'TODOS' && (
              <button onClick={() => {
                const p = prompt("🔑 Introduce la contraseña maestra para ver el Balance:");
                const session = JSON.parse(localStorage.getItem('user_session') || '{}');
                supabase.from('usuarios').select('id').eq('id', session.id).eq('password', p).single()
                  .then(({ data }) => {
                    if (data) setModalResumen(filtroCorte);
                    else if (p !== null) alert("Contraseña incorrecta");
                  });
              }} className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-6 py-4 rounded-xl text-xl shadow-lg flex items-center gap-2">
                🔒 Ver Balance de Corte
              </button>
            )}
          </div>

          {filtroCorte !== 'TODOS' && (
            <div className="bg-blue-100 p-4 rounded-2xl border-2 border-blue-300 flex flex-col md:flex-row gap-4 items-end shadow-inner">
              <div className="flex-1 w-full">
                <label className="block text-lg font-bold mb-2 text-blue-900">Motivo</label>
                <CustomSelect
                  className="w-full text-lg p-4 rounded-xl border-2 border-blue-200 bg-white"
                  value={descIngreso}
                  onChange={setDescIngreso}
                  placeholder="Seleccionar Motivo"
                  options={motivos.map(m => ({ value: m, label: m }))}
                />
              </div>
              <div className="w-full md:w-1/3">
                <label className="block text-lg font-bold mb-2 text-blue-900">Monto (Bs.)</label>
                <input type="number" className="w-full text-xl p-4 rounded-xl border-2 border-blue-200 bg-white" placeholder="Bs." value={montoIngreso} onChange={e => setMontoIngreso(e.target.value)} />
              </div>
              <button onClick={registrarIngreso} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-4 text-xl rounded-xl w-full md:w-auto">📥 Recibir</button>
            </div>
          )}

          <div>
            <h3 className="text-xl font-bold mb-4 text-gray-700">Historial de Ingresos</h3>
            <div className="space-y-4">
              {ingresosFiltrados.map(i => (
                <div key={i.id} className="flex justify-between items-center bg-white p-4 rounded-xl border-2 border-gray-100 shadow-sm">
                  <div>
                    <p className="text-lg font-bold text-gray-800">{i.descripcion}</p>
                    <p className="text-xl text-gray-500">{i.fecha} {filtroCorte === 'TODOS' && `- Corte ID: ${i.corte_id}`}</p>
                  </div>
                  <p className="text-xl font-black text-blue-600">+{fMoney(i.monto)}</p>
                </div>
              ))}
              {ingresosFiltrados.length === 0 && <p className="text-lg text-gray-400 italic">No hay ingresos registrados aún.</p>}
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

// ── AuthWrapper con sistema de roles ─────────────────────────────────────────

function AuthWrapper() {
  const [usuario, setUsuario] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user_session') || 'null'); } catch { return null; }
  });

  const onLogin = (user) => setUsuario(user);
  const onLogout = () => {
    localStorage.removeItem('user_session');
    setUsuario(null);
  };

  if (!usuario) return <LoginScreen onLogin={onLogin} />;
  if (usuario.role === 'admin') return <App usuario={usuario} onLogout={onLogout} />;
  return <RegularUserScreen usuario={usuario} onLogout={onLogout} />;
}

export default AuthWrapper;
