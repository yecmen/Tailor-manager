import re
import os

def patch_app_jsx(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Reemplazar todos los fetch("http://localhost:8000/ por apiFetch("/
    content = content.replace('fetch("http://localhost:8000/', 'apiFetch("/')
    content = content.replace('fetch(`http://localhost:8000/', 'apiFetch(`/')

    # 2. Inyectar la función apiFetch y el componente LoginScreen justo después de los imports
    login_injection = """

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
"""
    # Buscar el final de los imports o la primera función para inyectar
    # Generalmente después de "import { useState, useEffect, useRef } from 'react';"
    content = content.replace("import { useState, useEffect, useRef } from 'react';", "import { useState, useEffect, useRef } from 'react';" + login_injection)

    # 3. Modificar el componente principal App para manejar el estado de login
    # Buscar 'export default function App() {'
    app_injection = """export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("master_pin"));

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }
"""
    content = content.replace("export default function App() {", app_injection)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Patched {filepath}")

patch_app_jsx("desktop/src/App.jsx")
patch_app_jsx("mobile/src/App.jsx")
