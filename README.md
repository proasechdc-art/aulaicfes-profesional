# AulaICFES Profesional

Aplicación web estática para gestión académica, banco de preguntas, simulacros, impresión de pruebas y horarios.

## Estado de integración

El repositorio contiene los archivos de la aplicación y `config.js` está conectado al nuevo proyecto Supabase independiente. La base de datos cuenta con tablas, políticas RLS, funciones RPC y buckets de Storage. Aún deben completarse la carga de catálogos, el alta segura del administrador inicial, las pruebas funcionales por rol y la importación del repositorio a Vercel.

Consulta [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) para ver el estado técnico y los pasos pendientes.

## Despliegue

Sitio estático HTML/CSS/JavaScript. Punto de entrada: `index.html`. No requiere comando de compilación ni instalación de dependencias.
