# AulaICFES — edición visual profesional

## Qué incluye
- Diseño tipo dashboard con barra lateral oscura, navegación activa, cabecera de página y perfil del usuario.
- Navegación horizontal adaptable a móviles.
- Pantalla pública de acceso y registro con panel visual de bienvenida.
- Estilos uniformes para formularios, tablas, botones, tarjetas, avisos y componentes académicos existentes.
- Conservación de los archivos JavaScript, hoja de estilos y plantilla Excel del proyecto original.

## Archivos
- `index.html`: interfaz y lógica de navegación de AulaICFES.
- `styles.css`: hoja de estilos base original.
- Archivos `.js`: funciones existentes para banco de preguntas, horarios, hojas de respuesta, impresión y administración escolar.
- `plantilla_horarios.xlsx`: plantilla de horarios existente.

## Cómo probar
1. Descomprime la carpeta completa.
2. Publica la carpeta `aulaicfes-main` en el mismo alojamiento web donde funciona la aplicación o ábrela mediante un servidor web local.
3. Inicia sesión con una cuenta ya creada para verificar el panel según el rol.
4. Prueba en escritorio y móvil, y revisa el acceso a Supabase, la carga del banco y los módulos de horarios.

## Alcance y validación
Este paquete mejora la capa visual y el marco de navegación sin cambiar el esquema de la base de datos ni las reglas de acceso. Se comprobó la sintaxis JavaScript del bloque principal. La validación completa de autenticación, permisos, consultas de Supabase, impresión y funciones por rol requiere probarlo en el entorno publicado con cuentas reales de cada perfil.

## Recomendación de despliegue
Conserva una copia de seguridad de la versión publicada. Sube todos los archivos de la carpeta, no solamente `index.html`, porque la aplicación carga módulos JavaScript por separado. Comprueba las políticas RLS de Supabase y los permisos por rol antes de usarlo con estudiantes.
