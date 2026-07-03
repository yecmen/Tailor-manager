# Tailor Manager - Reglas de Negocio y Escalabilidad

## Arquitectura para Múltiples Clientes (Modelo de Venta)
El usuario tiene la intención de vender este sistema (Tailor Manager) a múltiples tiendas, talleres y empresas.
Cuando se pida crear una nueva instancia o adaptar el sistema para un nuevo cliente, se DEBEN seguir estas reglas estrictas de aislamiento:

1. **Código Base Compartido:** Se usará el mismo repositorio de GitHub (o forks del mismo si hay personalizaciones extremas) para mantener el frontend en React y el backend en FastAPI.
2. **Aislamiento de Base de Datos (Cero mezcla de datos):** 
   - NUNCA se debe usar la misma base de datos de Supabase para dos clientes distintos.
   - Cada cliente nuevo requiere la creación de un nuevo proyecto en Supabase (Plan Gratuito o de Pago según el cliente).
3. **Aislamiento de Infraestructura:**
   - Cada cliente requiere su propio servicio backend (ej. Render) conectado a su base de datos específica mediante `SUPABASE_DB_URL`.
   - Cada cliente requiere su propio frontend (ej. Vercel) apuntando a su backend específico mediante `VITE_API_URL`.
4. **Seguridad Independiente:** Cada despliegue debe tener su propio `MASTER_PIN` en las variables de entorno.

Al interactuar en el futuro sobre nuevos clientes, el agente debe recordar este modelo y ofrecer ayuda para replicar la infraestructura siguiendo este patrón exacto.
