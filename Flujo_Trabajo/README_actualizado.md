# Sistema de Gestión — POS Colegio

Aplicación web full-stack compuesta por:

- **Frontend:** React + Vite
- **Backend:** Python + FastAPI
- **Base de datos:** SQLite

Este documento explica cómo instalar y ejecutar el proyecto en **Windows** y **macOS**, incluyendo recomendaciones para evitar errores al mover el proyecto entre ambos sistemas operativos.

---

## 📁 Estructura esperada del proyecto

La carpeta principal del proyecto debe verse aproximadamente así:

```text
V3/
├── assets/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── requirements.txt
│   └── venv/                 # Se crea localmente. No se copia entre equipos.
├── src/
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── sistema_colegio.db
└── README.md
```

> `node_modules/`, `venv/`, `dist/` y `__pycache__/` son carpetas generadas automáticamente. No deben copiarse entre Windows y macOS.

---

## 🛠 Prerrequisitos

Antes de comenzar, instala los siguientes programas.

### 1. Node.js

Node.js es necesario para ejecutar el frontend.

- Descarga la versión **LTS** desde [nodejs.org](https://nodejs.org/).
- Verifica la instalación:

```bash
node --version
npm --version
```

### 2. Python

Python es necesario para ejecutar el backend.

- Descárgalo desde [python.org](https://www.python.org/downloads/).
- En Windows, durante la instalación, activa la opción **Add Python.exe to PATH**.

Verifica la instalación:

**Windows:**

```powershell
py --version
```

**macOS:**

```bash
python3 --version
```

---

## ⚠️ Importante al cambiar entre Windows y macOS

No reutilices ni copies estas carpetas entre sistemas operativos:

```text
node_modules/
venv/
backend/venv/
dist/
__pycache__/
```

Estas carpetas pueden contener rutas, permisos y ejecutables específicos de cada sistema.

Cuando copies, descargues o descomprimas el proyecto en otra computadora, reconstruye las dependencias con:

```bash
npm install
```

Y vuelve a crear el entorno virtual de Python.

> El archivo `package-lock.json` sí debe conservarse, porque permite instalar versiones consistentes de las dependencias.

---

## 🚀 Primera instalación y ejecución

El proyecto tiene dos procesos independientes que deben mantenerse activos al mismo tiempo:

1. Backend con FastAPI.
2. Frontend con Vite.

Abre **dos ventanas o pestañas de terminal**.

---

## Terminal 1 — Backend

### 1. Entrar a la carpeta del backend

Sustituye la ruta de ejemplo por la ubicación real del proyecto.

**Windows PowerShell:**

```powershell
cd "C:\ruta\al\proyecto\V3\backend"
```

**macOS:**

```bash
cd ~/ruta/al/proyecto/V3/backend
```

Ejemplo en macOS:

```bash
cd ~/Downloads/Pos_colegio/versiones/V3/backend
```

### 2. Crear el entorno virtual

**Windows:**

```powershell
py -m venv venv
```

**macOS:**

```bash
python3 -m venv venv
```

### 3. Activar el entorno virtual

**Windows PowerShell:**

```powershell
.\venv\Scripts\Activate.ps1
```

**Windows CMD:**

```cmd
venv\Scripts\activate.bat
```

**macOS:**

```bash
source venv/bin/activate
```

Cuando esté activo, la terminal mostrará `(venv)` al principio.

#### Error de permisos en PowerShell

Si Windows bloquea la activación, ejecuta una sola vez:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Cierra y vuelve a abrir PowerShell antes de intentarlo nuevamente.

### 4. Instalar dependencias

Con el entorno virtual activo:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Inicializar la base de datos

Ejecuta este paso solamente durante la primera instalación o cuando necesites regenerar la base de datos.

**Windows:**

```powershell
py database.py
```

**macOS:**

```bash
python3 database.py
```

> Si `database.py` borra o reinicia información existente, crea una copia de seguridad de `sistema_colegio.db` antes de ejecutarlo.

### 6. Iniciar el backend

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

El backend estará disponible en:

```text
http://127.0.0.1:8000
```

La documentación interactiva de FastAPI normalmente estará disponible en:

```text
http://127.0.0.1:8000/docs
```

Cuando aparezca este mensaje, el servidor está funcionando:

```text
Application startup complete
```

Deja esta terminal abierta.

---

## Terminal 2 — Frontend

### 1. Entrar a la raíz del proyecto

Debes colocarte en la carpeta donde está `package.json`.

**Windows PowerShell:**

```powershell
cd "C:\ruta\al\proyecto\V3"
```

**macOS:**

```bash
cd ~/ruta/al/proyecto/V3
```

Ejemplo en macOS:

```bash
cd ~/Downloads/Pos_colegio/versiones/V3
```

Comprueba que estás en la carpeta correcta:

```bash
ls
```

En Windows PowerShell también puedes usar:

```powershell
dir
```

Debes ver al menos:

```text
package.json
src
backend
vite.config.ts
```

### 2. Instalar dependencias

Para una instalación normal:

```bash
npm install
```

Para una instalación limpia y reproducible, cuando ya existe `package-lock.json`:

```bash
npm ci
```

> Usa `npm ci` después de clonar o copiar el proyecto. Usa `npm install` cuando estés agregando o actualizando dependencias.

### 3. Iniciar el frontend

```bash
npm run dev
```

La terminal debe mostrar una dirección similar a:

```text
http://localhost:3000
```

Abre esa dirección en el navegador.

Deja esta terminal abierta.

---

## ✅ Comprobación rápida

El sistema está listo cuando:

- El backend muestra `Application startup complete`.
- El frontend muestra `VITE ready`.
- Puedes abrir `http://localhost:3000`.
- El backend responde en `http://127.0.0.1:8000/docs`.

---

## 🔄 Ejecución rápida después de la primera instalación

No necesitas reinstalar dependencias cada vez.

### Backend

**Windows PowerShell:**

```powershell
cd "C:\ruta\al\proyecto\V3\backend"
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**macOS:**

```bash
cd ~/ruta/al/proyecto/V3/backend
source venv/bin/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

**Windows PowerShell:**

```powershell
cd "C:\ruta\al\proyecto\V3"
npm run dev
```

**macOS:**

```bash
cd ~/ruta/al/proyecto/V3
npm run dev
```

---

## 🧹 Reinstalación limpia

Usa estos pasos cuando:

- Cambies de Windows a macOS o viceversa.
- Copies el proyecto desde otra computadora.
- Aparezcan errores de permisos o ejecutables.
- `node_modules` o `venv` estén dañados.

### Frontend — Windows PowerShell

```powershell
cd "C:\ruta\al\proyecto\V3"
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm cache verify
npm ci
npm run dev
```

### Frontend — macOS

```bash
cd ~/ruta/al/proyecto/V3
rm -rf node_modules
npm cache verify
npm ci
npm run dev
```

Si Vite muestra `Permission denied` en macOS:

```bash
chmod +x node_modules/.bin/vite
npm run dev
```

Si el problema afecta varios ejecutables:

```bash
chmod -R u+x node_modules/.bin
npm run dev
```

### Backend — Windows PowerShell

```powershell
cd "C:\ruta\al\proyecto\V3\backend"
Remove-Item -Recurse -Force venv -ErrorAction SilentlyContinue
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Backend — macOS

```bash
cd ~/ruta/al/proyecto/V3/backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

---

## 🧩 Solución de problemas comunes

### `cd: no such file or directory`

La ruta escrita no existe o estás intentando entrar a una carpeta en la que ya te encuentras.

Comprueba tu ubicación:

```bash
pwd
```

En Windows PowerShell:

```powershell
Get-Location
```

No copies literalmente esta ruta:

```text
ruta/a/la/carpeta/V3
```

Debes sustituirla por la ruta real del proyecto.

### `vite: Permission denied` en macOS

Ejecuta desde la raíz del proyecto:

```bash
chmod +x node_modules/.bin/vite
npm run dev
```

Si continúa:

```bash
rm -rf node_modules
npm ci
chmod -R u+x node_modules/.bin
npm run dev
```

### `npm` o `node` no se reconoce

Instala Node.js LTS y vuelve a abrir la terminal.

Comprueba:

```bash
node --version
npm --version
```

### `python`, `python3` o `py` no se reconoce

Instala Python y vuelve a abrir la terminal.

En Windows, confirma que Python fue agregado al `PATH`.

### El entorno virtual no se activa

Confirma que estás dentro de `V3/backend` y que la carpeta `venv` existe.

macOS:

```bash
ls venv/bin/activate
```

Windows PowerShell:

```powershell
Test-Path .\venv\Scripts\Activate.ps1
```

### `uvicorn` no se reconoce

Activa el entorno virtual e instala las dependencias:

```bash
pip install -r requirements.txt
```

También puedes iniciar Uvicorn así:

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### El frontend abre, pero no funciona el inicio de sesión

Comprueba lo siguiente:

1. El backend sigue abierto.
2. `http://127.0.0.1:8000/docs` responde.
3. La consola del navegador no muestra errores de CORS o conexión.
4. La dirección del backend configurada en el frontend apunta al puerto correcto.
5. La base de datos existe y contiene los usuarios necesarios.

### Puerto ocupado

Backend en otro puerto:

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

Frontend en otro puerto:

```bash
npm run dev -- --port 3001
```

> Si cambias el puerto del backend, actualiza también la dirección de la API usada por el frontend.

### Vulnerabilidades mostradas por npm

Revisa el reporte:

```bash
npm audit
```

No ejecutes automáticamente `npm audit fix --force` sin revisar los cambios, porque puede actualizar dependencias principales y romper el proyecto.

### Advertencias `allow-scripts`

Si npm bloquea scripts de instalación, revisa primero los paquetes pendientes:

```bash
npm approve-scripts --allow-scripts-pending
```

Aprueba únicamente dependencias conocidas y necesarias para el proyecto. Después, reinstala si fuera necesario:

```bash
rm -rf node_modules
npm ci
```

---

## 🔐 Archivo `.gitignore` recomendado

Crea un archivo `.gitignore` en la raíz de `V3` con este contenido:

```gitignore
# Frontend
node_modules/
dist/
.vite/

# Python
venv/
backend/venv/
__pycache__/
*.py[cod]

# Variables de entorno
.env
.env.*
backend/.env

# Sistemas operativos
.DS_Store
Thumbs.db

# Editores
.vscode/
.idea/

# Registros
*.log
npm-debug.log*
```

> No agregues archivos `.env` con contraseñas, claves o tokens al repositorio.

---

## 📦 Archivos que sí debes compartir o guardar en Git

```text
src/
backend/*.py
backend/requirements.txt
assets/
package.json
package-lock.json
vite.config.ts
tsconfig.json
index.html
README.md
```

La base de datos `sistema_colegio.db` solo debe compartirse si realmente necesitas transportar los datos existentes y si no contiene información sensible.

---

## 🛑 Cómo detener el sistema

En cada terminal, presiona:

```text
Control + C
```

En macOS también se utiliza `Control + C`, no `Command + C`.

---

## 📝 Resumen de comandos para macOS

### Backend

```bash
cd ~/ruta/al/proyecto/V3/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 database.py
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd ~/ruta/al/proyecto/V3
rm -rf node_modules
npm ci
npm run dev
```

---

## 📝 Resumen de comandos para Windows PowerShell

### Backend

```powershell
cd "C:\ruta\al\proyecto\V3\backend"
py -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
py database.py
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```powershell
cd "C:\ruta\al\proyecto\V3"
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm ci
npm run dev
```
