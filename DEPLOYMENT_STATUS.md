# AulaICFES Profesional — estado de integración

Fecha de preparación: 4 de noviembre de 2026.

## Repositorio
- Repositorio: https://github.com/proasechdc-art/aulaicfes-profesional
- Rama: main
- Aplicación: sitio estático HTML, CSS y JavaScript.
- Entrada: index.html.
- Build command: ninguno.
- Output directory: raíz del repositorio.

## Supabase nuevo
- Proyecto: aulaicfes-profesional
- Project ref: wbfpxmeajicyjrqkmxvk
- URL: https://wbfpxmeajicyjrqkmxvk.supabase.co
- El archivo config.js apunta a este proyecto y usa la Publishable key. No incluir nunca una secret/service_role key en el navegador.

## Trabajo aplicado
- Se completó el esquema hasta 39 tablas públicas, incluyendo auditoria y question_keys.
- Se añadieron columnas de compatibilidad para preguntas, referentes, exámenes impresos y banco documental.
- Se crearon los buckets question-images (público), school-logos (público) y banco-icfes (privado).
- Se configuraron políticas RLS y políticas de Storage.
- Se implementaron las RPC de administración docente, carga de roster, generación de exámenes, leaderboard, calificación de intentos y horarios.
- Los núcleos privilegiados de calificación y leaderboard quedaron en el esquema privado; las funciones expuestas usan wrappers con permisos limitados.
- El asesor de seguridad de Supabase no reporta alertas en la última revisión.

## Pendientes antes de abrir el servicio al público
1. Cargar datos de catálogo: departamentos, municipios, colegios, áreas, asignaturas y referentes oficiales. Las tablas existen, pero la estructura no sustituye la carga de esos datos.
2. Crear y verificar una cuenta administradora inicial. No se debe elevar una cuenta a administradora hasta confirmar el correo y la identidad de la persona responsable.
3. Probar flujos reales con cuentas separadas de administrador, rector, docente y estudiante; especialmente asignación de cursos, simulacros, preguntas, impresión, asistencia y horarios.
4. Crear/importar el proyecto de Vercel desde este repositorio. Framework: Other; Root Directory: ./; Build Command: vacío; Output Directory: .; Install Command: vacío.
5. En Supabase Authentication > URL Configuration, configurar el dominio de producción de Vercel y los redirect URLs de producción/pruebas.
6. Revisar las políticas de rendimiento y realizar pruebas de carga antes de uso institucional.

## Seguridad y preservación
- No se modificó el proyecto Supabase anterior pmigzkhhqxzhspqmkbvf.
- No se modificó el proyecto de Cerquita rlaxqsuxemawtiizvicq.
- No se copiaron contraseñas, secret keys ni service_role keys al repositorio.
- La Publishable key solo es apropiada para navegador mientras las políticas RLS sigan aplicadas y probadas.

## Estado
La conexión de configuración y la base de datos están preparadas a nivel de estructura. El servicio todavía no debe considerarse producción hasta completar los pendientes anteriores y probar la aplicación desplegada.
