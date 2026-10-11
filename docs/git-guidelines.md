# Git Guidelines – Vitti Logistics

<table width="100%" style="font-size: .7em; margin-left: auto; width: 100%;">
<tr><td><b>Autor</b></td><td><b>Fecha de creación</b></td><td><b>Última actualización</b></td></tr>
<tr><td>Raymundo Salazar</td><td>23 Julio 2025</td><td>23 Julio 2025</td></tr>
</table>

---

**Versión 1.0 – Julio 2025**

Este documento establece las buenas prácticas que todo desarrollador del equipo debe seguir al trabajar con Git. Nos ayuda a mantener un código limpio, seguro y colaborativo.

---

## 🛠️ 0. Configuración inicial obligatoria

Antes de comenzar a trabajar con Git en cualquier proyecto, debes configurar tu nombre y correo globalmente para que todos tus commits estén correctamente identificados.

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

Verifica que esté bien configurado:

```bash
git config --global --list
```

---

### 🔐 Acceso a repositorios (Azure DevOps)

⚠️ Todos los desarrolladores deben conectarse a Azure DevOps mediante **llaves SSH**.  
El uso de HTTPS está prohibido por seguridad, automatización y trazabilidad.

### Requisitos:

1. Generar un par de llaves si aún no las tienes:

```bash
ssh-keygen -t ed25519 -C "tu@email.com"
```

2. Agregar tu clave pública (`~/.ssh/id_ed25519.pub`) en tu cuenta de Azure DevOps:

   - Navega a: **User Settings > SSH Public Keys**
   - Pega el contenido del archivo

3. Verifica tu conexión:

```bash
ssh -T git@ssh.dev.azure.com
```

---

## 🌍 1. Idioma obligatorio

Todo el contenido del repositorio debe redactarse exclusivamente en inglés. Esta práctica garantiza coherencia, facilita la colaboración entre equipos internacionales y mejora la comprensión por parte de otros desarrolladores, tanto actuales como futuros.

#### El uso del inglés es obligatorio en los siguientes elementos:

- **Nombres de ramas**: deben seguir una convención clara y estar en inglés (por ejemplo: `feat/login-form`, `fix/typo-in-readme`).

- **Mensajes de commit**: deben ser descriptivos, concisos y escritos en inglés. (Ejemplo: `ref(login): Improve validation logic`).

- **Identificadores en el código fuente**: nombres de variables, funciones, clases, constantes, etc., deben estar en inglés para mantener legibilidad y coherencia.

- **Comentarios en el código**: deben explicar claramente la lógica o decisiones importantes en inglés.

- **Pull Requests**: tanto los títulos como las descripciones deben redactarse en inglés, detallando el propósito, los cambios realizados y cualquier contexto relevante.

- **Documentación**: cualquier archivo de documentación (`README.md`, `CONTRIBUTING.md`, wikis, etc.) debe estar completamente en inglés.

> ⚠️ Importante: El incumplimiento de esta norma puede resultar en la solicitud de cambios antes de aceptar contribuciones al repositorio.

---

## 📁 2. Organización de ramas

### Flujo general

- `main`: rama protegida para producción
- `stage`: rama de pre-producción/pruebas integradas
- `dev`: rama base de desarrollo activo
- Todas las ramas de trabajo deben partir desde `dev`

**Flujo oficial:**

```
nueva-rama → dev → stage → main
```

> Nunca se trabaja directamente sobre `main`, `stage` o `dev`. Siempre se debe usar Pull Request (PR).

### Excepción: antes del primer release

- Mientras un proyecto no haya sido lanzado a producción, todo se trabaja sobre `main`, pero **sin push directo**
- Una vez liberado el primer release:
  1. Se crean `stage` y `dev` desde `main`
  2. Se bloquean `main`, `stage` y `dev`
  3. Se adopta el flujo oficial

### Convenciones de nombres

Para mantener una estructura clara y consistente en el repositorio, todas las ramas deben seguir este formato:

```bash
<tipo>/<descripcion-en-kebab-case>
```

Este esquema ayuda a identificar rápidamente el propósito de cada rama, su tipo de cambio y mantener el historial limpio y predecible.

#### 📌 Reglas generales

- El `<tipo>` debe ser uno de los definidos en la sección de tipos de commits.
- La descripción debe estar en inglés y escrita en kebab-case:
  - Solo minúsculas.
  - Palabras separadas por guiones.
  - Sin tildes, espacios ni caracteres especiales.

#### ✅ Ejemplos

| Rama                                 | Propósito                                              |
| ------------------------------------ | ------------------------------------------------------ |
| `feat/add-user-profile-section`      | Agrega la sección de perfil de usuario                 |
| `fix/user-avatar-upload`             | Corrige problema con la subida de avatar de usuario    |
| `refactor/user-authentication-flow`  | Refactor del flujo de autenticación de usuarios        |
| `feat/dashboard-overview-widget`     | Nueva funcionalidad: widget de resumen en el dashboard |
| `fix/dashboard-chart-scaling`        | Corrige el escalado de gráficos en el dashboard        |
| `ui/update-dashboard-colors`         | Cambios visuales en los colores del dashboard          |
| `ux/improve-user-form-feedback`      | Mejora la experiencia de usuario al llenar formularios |
| `docs/user-permissions-docs`         | Documentación sobre los permisos de usuario            |
| `test/dashboard-loading-state-tests` | Pruebas para los estados de carga del dashboard        |

#### 🗂️ Uso opcional de tickets (futuro)

Cuando el equipo comience a trabajar con un sistema de tickets (como Jira, Linear, etc.), la convención puede extenderse así:

```bash
<tipo>/<ticket>/<descripcion-en-kebab-case>
```

Ejemplos:

- `feat/PROJ-123/add-payment-method`

- `fix/BUG-45/cart-total-bug`

Notas:

- El código del ticket debe colocarse en mayúsculas, separado por un `/`.

- La descripción sigue siendo en inglés y en `kebab-case`.

- Esta convención es opcional por ahora, pero está prevista para una futura adopción.

#### 💡 Buenas prácticas

- Sé específico pero breve en el nombre de la rama.

- Usá siempre nombres en inglés para mantener consistencia.

- Mantené el mismo tipo de rama que vas a usar en el commit (feat, fix, etc.).

- No uses nombres genéricos como fix/arreglo o new-feature, que no aportan claridad.

---

## ✍️ 3. Commits

Los mensajes de commit deben seguir una convención clara para facilitar la lectura del historial de cambios, automatizar el versionado del proyecto y mantener una trazabilidad efectiva.

Usamos el formato basado en [Conventional Commits](https://www.conventionalcommits.org/), que permite identificar rápidamente qué tipo de cambio se hizo, en qué parte del proyecto, y con qué propósito.

---

### 📌 Formato general

```bash
<type>(<scope>): <short-description-in-english>
```

**Componentes:**

- `<type>`: el tipo de cambio realizado (ver tabla de tipos).

- `<scope>`: el módulo o funcionalidad afectada (opcional pero recomendable).

- `<short-description>`: una descripción breve del cambio (en inglés, sin punto final).

#### ✅ Tipos aceptados

| Tipo       | Uso                                            |
| ---------- | ---------------------------------------------- |
| `feat`     | Nueva funcionalidad                            |
| `fix`      | Corrección de errores                          |
| `docs`     | Cambios en la documentación                    |
| `style`    | Cambios de formato sin lógica                  |
| `refactor` | Reestructuración sin cambiar comportamiento    |
| `test`     | Agregado o modificación de pruebas             |
| `chore`    | Mantenimiento, configuraciones, tareas menores |
| `db`       | Cambios en base de datos: migraciones, seeds   |
| `perf`     | Mejora de rendimiento                          |
| `ui`       | Cambios visuales (colores, márgenes, etc.)     |
| `ux`       | Mejora en experiencia de usuario               |
| `build`    | Cambios en herramientas de build o empaquetado |
| `ci`       | Cambios en integración continua (CI/CD)        |
| `config`   | Cambios en archivos de configuración           |
| `security` | Mejoras o parches de seguridad                 |
| `revert`   | Reversión de commits anteriores                |
| `deps`     | Cambios en dependencias                        |
| `release`  | Preparación de un release                      |

#### 📓 Trazabilidad

Los commits deben ser atómicos, es decir, representar un solo cambio lógico o unidad de trabajo. Esto facilita:

- Un historial claro y comprensible.

- Reversiones más seguras.

- Automatización del changelog y versionado.

La referencia a un issue o ticket es recomendable cuando existe y ayuda a conservar la trazabilidad, pero no es un requisito bloqueante para crear un commit o abrir un pull request.

#### 🧭 Reglas importantes:

- Un cambio = un commit: no mezcles diferentes tipos de cambios.

- Usá scope para indicar la parte del código afectada (por ejemplo: login, dashboard, user).

- La descripción debe ser en inglés, sin punto final.

#### ✅ Ejemplos correctos

```bash
feat(login): add email/password login flow
fix(form): validate required fields
refactor(auth): simplify token verification
style(button): improve spacing on mobile
test(user-service): add tests for getUserById
docs(api): update authentication section
```

#### ❌ Ejemplos incorrectos

```bash
fix: arreglos varios
update login and fix some bugs in profile
feat(auth): cambios en autenticación
```

#### 🧰 Ventajas de esta convención

Este formato es compatible con herramientas como:

- ✅ commitlint: valida que los mensajes de commit sigan la convención.

- ✅ semantic-release: genera changelogs y versiones automáticamente.

- ✅ standard-version: similar a semantic-release, pero sin integración continua.

## ✅ 4. Calidad de código y automatizaciones

Cada proyecto cuenta con una base técnica común que garantiza un entorno de desarrollo consistente, limpio y profesional. Esta base incluye configuraciones para linting, formateo, pruebas automáticas y configuraciones del editor.

### 🧩 ESLint

- Aplica reglas de estilo, sintaxis y buenas prácticas de desarrollo.

- Está preconfigurado en todos los proyectos y no debe modificarse sin aprobación del equipo técnico.

- Funciona tanto en tiempo real (VSCode) como durante el proceso de commit.

🛑 Regla especial: `console.log`

- No está permitido subir `console.log` al repositorio.

- Configuración por entorno:

  - En desarrollo (`dev`): los `console.log` aparecen como warning para ayudarte a depurar.

  - En pre-commit (`husky`): los `console.log` se consideran errores. El commit será bloqueado hasta que se eliminen.

> Esto asegura que nunca dejemos rastros de debugging en producción.

### 🎨 Prettier

- Formatea automáticamente el código para mantener una apariencia homogénea en todo el equipo.

- Se ejecuta junto con ESLint y también puede aplicarse manualmente (Format Document).

- Están definidas reglas específicas para uso de comillas, tabulaciones, saltos de línea, etc.

### 🧷 Husky (Pre-commit hook)

- Automatiza validaciones antes de permitir un commit.

- Ejecuta:

  - `eslint` → validación de estilo y errores

  - `prettier` → formateo

  - Pruebas unitarias → validación funcional (si están configuradas)

> ❌ Si alguna validación falla, el commit se bloquea.

### 🧪 Pruebas unitarias

- Todo nuevo feature, fix o módulo debe incluir pruebas unitarias.

- Especialmente obligatorio en proyectos backend.

- Estas pruebas aseguran que lo desarrollado:

  - Funcione correctamente hoy

  - No se rompa con futuras actualizaciones

  - Permita cambios sin miedo

### 📊 Mínimo de cobertura (code coverage)

Una vez que el proyecto haya hecho su primer release a producción, se requiere un mínimo del 80% de cobertura de código (coverage) para permitir la integración de nuevos cambios.

- Esto se mide automáticamente al correr las pruebas con herramientas como `jest --coverage`.

- El resultado debe indicar que al menos el 80% del código está cubierto por pruebas (statements, branches, functions, lines).

> Si no se cumple con ese mínimo, el PR no podrá ser aprobado.

### 🔧 Herramientas recomendadas

| Tipo     | Recomendadas                        |
| -------- | ----------------------------------- |
| Frontend | vitest, jest, testing-library/react |
| Backend  | jest, supertest, mocha, chai        |
| Coverage | jest --coverage, nyc, c8            |

### 📚 Documentación

- Toda función, clase, componente o módulo debe tener su respectivo JSDoc.

- Para funcionalidades complejas, se debe crear un archivo .md explicando:

  - Qué hace

  - Cómo se usa

  - Qué dependencias tiene

  - Casos de uso

> 📌 La documentación es obligatoria para ayudar al equipo a comprender el sistema en conjunto.

### 💻 Configuración base para VSCode

Cada repositorio incluye la carpeta `.vscode/` con:

`settings.json`
Define reglas de formato automático al guardar.

- Establece ESLint como validador.

- Usa Prettier como formateador por defecto.

- Organiza y limpia imports automáticamente.

`extensions.json`
Contiene sugerencias de extensiones recomendadas para todo el equipo:

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "streetsidesoftware.code-spell-checker",
    "formulahendry.auto-rename-tag"
  ]
}
```

> 🧩 Al abrir el proyecto por primera vez, VSCode te preguntará si deseas instalar las extensiones recomendadas. Aceptar estas sugerencias es obligatorio para trabajar bajo los mismos estándares.

---

## 📚 5. Documentación y pruebas

### 📖 Documentación

Cada desarrollador es responsable de documentar su propio código para facilitar su comprensión y mantenimiento por parte del equipo.

**¿Cómo se documenta?**

- Con `JSDoc`:
  Comenta funciones, métodos, clases, tipos, props, etc.

```ts
/**
 * @description Returns the sum of two numbers
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function sum(a, b) {
  return a + b;
}
```

- Con archivos `.md`:
  Si la lógica es compleja, crea un archivo Markdown explicando su propósito, flujo, variables clave, endpoints, etc.

### 🧪 Pruebas unitarias

Especialmente en proyectos backend:

- Toda nueva funcionalidad debe incluir pruebas unitarias.

- Ayudan a garantizar que el código funciona correctamente hoy y en el futuro.

- Previenen regresiones cuando otros módulos cambian.

Las pruebas también se ejecutarán automáticamente junto con los pre-commits.

> Herramientas sugeridas:<br>
> Frontend: `vitest`, `jest`, `react-testing-library`<br>
> Backend: `jest`, `supertest`, `mocha`

---

## 📦 6. Versionado y CHANGELOG

Todos los proyectos siguen la convención [SemVer (Semantic Versioning)](https://semver.org/): `X.Y.Z` o `MAJOR.MINOR.PATCH`

| Tipo  | Uso                                |
| ----- | ---------------------------------- |
| MAJOR | Cambios incompatibles              |
| MINOR | Nuevas funcionalidades compatibles |
| PATCH | Fixes o mejoras menores            |

> Las versiones deben reflejar el impacto del cambio. <br>
> Los commits bien escritos permiten generar un changelog con herramientas como:

- `standard-version` (recomendado)

- `conventional-changelog`

- `semantic-release`

El changelog será una fuente de verdad para saber qué cambió, cuándo y por qué.

---

## 🔀 7. Pull Requests (PRs)

Los Pull Requests son obligatorios para incorporar cualquier código a dev, stage o main.

Reglas: - Nunca hagas push directo a ramas protegidas.

    - Los PRs deben:

        - Partir desde tu rama de trabajo (feat/*, fix/*, etc.)

        - Dirigirse a dev

        - Tener título claro y en inglés

        - Contener descripción con contexto, screenshots (si aplica), y pruebas

Ejemplo de título:

```scss
feat(profile): add profile editing screen;
```

- Espera al menos una revisión antes de hacer merge.

- Si el PR afecta múltiples partes, documenta claramente lo que tocaste.

---

## 🔍 8. Revisiones de código

Las revisiones son obligatorias y parte fundamental del flujo de trabajo.

### El revisor debe:

- Leer el código buscando:

- Claridad y legibilidad

- Buenas prácticas

- Pruebas unitarias

- Impacto colateral

- Verificar que no se suben:

  - .env, archivos temporales o binarios

  - Contraseñas, secretos o claves API

### El autor del PR debe:

- Aceptar feedback con apertura

- Corregir observaciones antes del merge

- No auto-aprobar sus propios PRs

---

## 🧼 10. Limpieza general

Mantener el repositorio limpio es responsabilidad de todo el equipo. Un código limpio no solo facilita el trabajo diario, sino que evita errores, reduce el tiempo de onboarding para nuevos desarrolladores y mejora la calidad del producto a largo plazo.

### ✅ Qué debes hacer

#### ✅ Usar `.gitignore` correctamente

- Asegúrate de que los archivos temporales, de entorno, dependencias o compilados no se incluyan en el control de versiones.

- Ejemplos que deben estar ignorados:

  - `.env`, `dist/`, `node_modules/`, `.DS_Store`, `*.log`, `coverage/`

- Todos los repositorios incluyen un `.gitignore` base. Revísalo antes de hacer push.

#### ✅ Borrar código muerto

- Elimina cualquier fragmento de código que:

  - Está comentado “por si acaso”

  - Ya no se llama desde ningún lado

  - Fue reemplazado pero no eliminado

Ejemplo:

```ts
// Esto debe eliminarse
// const unused = 'temporal var';
```

#### ✅ Organizar imports

- Mantén los imports ordenados y limpios:

  - Primero librerías de terceros

  - Luego módulos internos

  - Por último, estilos y tipos

- Usa herramientas como `eslint-plugin-import` o `Prettier` para automatizarlo.

#### ✅ Separar responsabilidades

- Si un archivo comienza a crecer mucho (por ejemplo, 300+ líneas), probablemente esté asumiendo más de una responsabilidad.

- Extrae partes en subcomponentes, hooks, utilidades, helpers, etc.

- Esto facilita testeo, mantenimiento y reusabilidad.

### 🚫 Qué debes evitar

#### 🚫 Subir archivos innecesarios o pesados

- Nunca subas al repositorio:

  - Archivos de configuración local (`.env`, `.vscode/settings.json personales`)

  - Archivos de build o dependencias (`dist/`, `build/`, `node_modules/`)

  - Capturas de pantalla, dumps de DB o logs

> Si necesitas compartir estos archivos, usa un entorno seguro (Azure Blob, OneDrive, etc.)

### 🚫 Dejar rastros de debugging

- Nunca dejes `console.log`, `debugger`, `alert`, `prompt`, etc. en el código final.

- Todos deben ser eliminados antes del commit.

- Si necesitas logs para producción, usa una herramienta adecuada (`Sentry`, `Datadog`, etc.)

```ts
console.log('Llega aquí', data); // ❌ Nunca debe quedar
```

#### 🚫 Variables sin uso o comentarios ambiguos

- Evita declarar variables que no se usan, o dejar comentarios como:

  - `// temporal`, `// revisar`, `// fixme`

- Mejor eliminar o reemplazar por documentación clara si es necesario.

#### 🚫 Commits genéricos o sin contexto

- No hagas commits como:

  - `fix: cambios`, `test`, `ya quedó`, `ajustes finales`

- Estos mensajes no dicen nada sobre qué se hizo y afectan la trazabilidad.

#### Ejemplo incorrecto:

```bash
fix: arreglos varios
```

##### Ejemplo correcto:

```bash
fix(login): fix password mismatch validation
```

---

## ✅ Conclusiones

El éxito de nuestros proyectos depende no solo del código que escribimos, sino también de **cómo lo escribimos, lo organizamos y lo compartimos**.

Estas guías no son solo recomendaciones, son el estándar que como equipo hemos definido para trabajar con calidad, eficiencia y responsabilidad.

### Podemos resumir estas buenas prácticas:

- Usa siempre **Git con configuración global** (`user.name`, `user.email`) y acceso por **SSH**.
- Todo debe estar en **inglés**: código, ramas, commits, PRs, comentarios y documentación.
- Sigue el flujo de ramas: `nueva-rama → dev → stage → main`.
- Haz **commits atómicos** y bien descriptivos.
- Utiliza **ESLint, Prettier y Husky** para mantener la calidad del código.
- Cubre tu código con **pruebas unitarias** y asegúrate de alcanzar al menos **80% de cobertura** en proyectos ya liberados.
- Documenta tu trabajo: usa **JSDoc** y `.md` cuando sea necesario.
- Nunca subas archivos sensibles, código basura o commits genéricos.
- Todo cambio debe ir por **Pull Request** con revisión previa.

---

### 💬 ¿Tienes dudas o sugerencias?

Este documento está vivo. Si algo puede mejorarse o adaptarse a nuevas necesidades, háznoslo saber.

> **Nuestra meta es simple: escribir buen código, en equipo, y con orgullo por lo que construimos.**

---

🚀 ¡Gracias por mantener los estándares de calidad en Vitti Logistics!
