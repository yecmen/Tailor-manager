# Directrices: Sistema para Taller de Costura (tailor_manager)

## Arquitectura y Módulos
Este sistema debe ser extremadamente fácil de usar y visual (botones grandes, flujos claros). Como será usado por un perfil no técnico (tu madre), una Aplicación Web monolítica con frontend en React/Next.js y una base de datos SQLite empotrada es ideal. Se empaquetará todo en un `.exe` con Python/Eel o un contenedor para que ella solo haga "Doble Clic" en Windows.

1. **App**:
   - Dashboard principal: Resumen de pagos pendientes y materiales en taller.
   - Módulo Distribuidor: Registro de telas/materiales recibidos y dinero cobrado por lote.
   - Módulo Trabajadores: Lista de costureros, asignación de tallas de trajes a confeccionar, materiales entregados.
   - Módulo Pagos: Registro de cuánto se le pagó a cada trabajador por el trabajo completado.

## Lógica del Negocio
- **Entradas**: El distribuidor entrega una "Orden" (Ej: Hacer 50 trajes talla M). Entrega X dinero y X material.
- **Distribución**: El usuario (tu madre) asigna 20 trajes al trabajador A y 30 al trabajador B.
- **Salidas/Pagos**: Cuando el trabajador A termina, se registra el traje como "Completado" y se le emite un "Pago" que se descuenta del saldo recibido del distribuidor.
- **IA (Opcional)**: En lugar de un chatbot complejo, un botón de "Ayuda" que, de ser necesario, usa la API gratuita de Gemini para responder dudas preconfiguradas basándose en el manual interno del taller.

## Pasos para Desarrollo (Fase Futura)
1. Definir Base de Datos: `distribuidores`, `ordenes`, `trabajadores`, `asignaciones`, `pagos`.
2. Crear interfaz amigable en React (o PyQt si se prefiere escritorio nativo rápido).
3. Desarrollar lógica de cálculo de saldos y caja.
4. Empaquetar y exportar para Windows.

## Restricciones de Hardware
- **Target Mínimo**: Procesador Intel Core i3-2100 (o equivalente), gráficos integrados, 4GB RAM, Windows 10.
- **Optimización**: El backend será ultra ligero (Python/FastAPI o SQLite puro) y el frontend debe ser rápido sin requerir aceleración gráfica pesada. Cero carga de modelos de IA locales; todo a través de la API.
