# SIRER-Rosas | Observatorio territorial

Prototipo web georreferenciado para registrar, consultar y seguir reportes comunitarios sobre afectaciones viales y movimientos en masa en Rosas, Cauca. Proyecto académico de Ingeniería de Sistemas — UNAD.

**Alcance:** herramienta informativa y de registro, no sistema oficial de alertas, predicción geológica ni certificación de transitabilidad.

## Iniciar el proyecto

Requisitos: **Node.js 20 o superior** y navegador moderno con conexión a Internet para obtener Leaflet y cartografía OpenStreetMap. La API y los listados funcionan sin estas dependencias gráficas.

```bash
node --version
npm start
```

Abrir **http://localhost:3000**. No requiere `npm install`, pues solo usa módulos nativos de Node.js. Para cambiar de puerto: `PORT=4000 npm start` (Linux/Mac) o establecer la variable `PORT` en Windows.

Para ejecutar la batería de integración:

```bash
npm test
```

## Recorrido de la demostración

1. Abrir **Panorama** para ver las métricas y actividad reciente.
2. Entrar a **Mapa territorial**: consultar marcadores y aplicar filtros por tipo y estado.
3. Revisar **Reportes** y **Histórico**, abrir una ficha y leer su línea de tiempo.
4. Seleccionar **Ingresar**, usar una cuenta de demostración o registrar una nueva.
5. Crear un reporte desde **Registrar reporte**: tipo, fecha, sector, descripción y coordenadas. La fotografía es opcional.
6. Ingresar como **gestor** y entrar en **Centro de revisión** para cambiar el estado con una observación trazable.

### Usuarios locales para la socialización

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Comunidad | `comunidad@sirer.local` | `ClaveComunidad2026!` |
| Gestor | `gestor@sirer.local` | `ClaveGestor2026!` |

Estas son **credenciales incluidas exclusivamente para la demostración local**. No reutilizarlas ni publicar el servidor con estas contraseñas. Para una implantación fuera del ámbito académico se requieren gestión segura de credenciales, HTTPS, gestión de sesiones, limitación de peticiones, copias de seguridad, auditoría, retención de imágenes y un mecanismo de eliminación/rectificación de datos personales.

## Tecnologías y arquitectura realmente incluidas

- **Interfaz:** HTML semántico, CSS responsive, JavaScript sin framework.
- **Cartografía:** Leaflet 1.9.4 y teselas OpenStreetMap cargadas mediante recursos CDN; requiere conectividad.
- **API:** servidor HTTP Node.js, validación de entradas, cuentas, sesiones en memoria, autorización y filtros.
- **Persistencia del piloto:** `data/database.json` inicializado desde `data/seed.json` al primer arranque (el archivo de estado se ignora en Git).
- **Pruebas:** módulo nativo `node:test`, con 6 casos que verifican rutas críticas de API.

El documento maestro plantea PostgreSQL/PostGIS como evolución para múltiples usuarios, consultas geoespaciales complejas, persistencia transaccional y despliegue institucional; **no se atribuye esa implementación a la versión actual**.

## Endpoints

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/api/health` | Salud de la API |
| POST | `/api/auth/register` | Registro de comunidad con consentimiento |
| POST | `/api/auth/login` | Acceso |
| GET | `/api/auth/me` | Perfil autenticado |
| POST | `/api/auth/logout` | Cierre de sesión |
| GET | `/api/reports` | Consulta y filtros `q`, `type`, `status` |
| POST | `/api/reports` | Nuevo reporte; requiere token |
| PATCH | `/api/reports/:id/status` | Cambio de estado; requiere rol gestor |

## Artefactos de ingeniería

`docs/diagramas/` incorpora diagramas **Graphviz DOT y PNG** de arquitectura, casos de uso, entidades, navegación y dos mockups de alta fidelidad. `docs/investigacion/` incorpora el instrumento de 20 preguntas y plan de recolección. `docs/GUION_VIDEO.md` contiene la guía de socialización de menos de 10 minutos, con participación continua en cámara.

## Git y GitHub

Desde la carpeta del proyecto, tras crear un repositorio **vacío** en su cuenta de GitHub:

```bash
git init
git add .
git commit -m "feat: prototipo SIRER-Rosas y evidencias de ingenieria"
git branch -M main
git remote add origin https://github.com/USUARIO/NOMBRE-REPOSITORIO.git
git push -u origin main
```

Reemplazar la dirección por el repositorio real. El proyecto no ha sido publicado automáticamente. No subir `data/database.json`, respuestas de participantes, archivos de autorización ni fotografías privadas. Antes de alojar la aplicación en Internet, eliminar los usuarios precargados y revisar los controles de seguridad.

## Verificación y alcance TRL 5

Las seis pruebas automatizadas de API se ejecutaron correctamente en un entorno aislado. Aún es necesario validar en **entorno relevante** con participantes y documentar observación de tareas, resultados SUS, trazabilidad, incidencias, correcciones y evidencias fechadas. El software por sí solo no permite declarar TRL 5 alcanzado.

### Fuentes y licencias

- [Leaflet — Quick Start](https://leafletjs.com/examples-v1/quick-start/)
- [OpenStreetMap — Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)
- [Scrum Guide](https://scrumguides.org/download.html)
- [NASA — Technology Readiness Levels](https://esto.nasa.gov/trl/)
- [Ley 1581 de 2012](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981)

© OpenStreetMap contributors (atribuido en el pie de página y en el mapa). El código del proyecto se distribuye bajo licencia MIT.
