# Sistema de Gestión — POS Colegio

Aplicación web full-stack para registro de cursos y ventas en colegios de contadores en México.

## Stack del proyecto

- **Frontend:** React + Vite
- **Backend:** Python + FastAPI
- **Base de datos:** SQLite

---

## Objetivo de esta guía

Este proyecto puede trabajarse tanto en **macOS** como en **Windows**.

La forma correcta de cambiar entre equipos no es copiar `venv`, `node_modules` ni carpetas generadas del sistema, sino usar **GitHub** para sincronizar el código y dejar que cada computadora conserve su propio entorno local.

### Flujo recomendado

- Trabajas en una computadora
- Subes cambios a GitHub
- Cambias de equipo
- Haces `git pull`
- Corres el proyecto

Así evitas borrar y reconstruir manualmente todo cada vez.

---

## Estructura esperada del proyecto

```text
V3/
├── assets/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── requirements.txt
│   └── venv/                  # Se crea localmente en cada equipo
├── src/
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── sistema_colegio.db         # Base de ejemplo si contiene datos ficticios
├── .gitignore
└── README.md
```

---

## Qué sí se sube a GitHub

Sube normalmente:

- `src/`
- `backend/`
- `assets/`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vite.config.ts`
- `index.html`
- `.gitignore`
- `README.md`

Opcional:

- `sistema_colegio.db` si solo contiene datos ficticios o de prueba

---

## Qué no debes copiar entre macOS y Windows

No copies manualmente entre equipos:

```text
node_modules/
venv/
backend/venv/
dist/
__pycache__/
.env
.env.*
```

Estas carpetas o archivos pueden contener permisos, rutas o binarios específicos del sistema operativo.

---

## Requisitos previos

Instala estos programas en ambas computadoras.

### Node.js

Necesario para ejecutar el frontend.

Verifica instalación:

```bash
node --version
npm --version
```

### Python

Necesario para ejecutar el backend.

Verifica instalación:

**Windows PowerShell**
```powershell
py --version
```

**macOS**
```bash
python3 --version
```

### Git

Necesario para clonar, actualizar y subir el proyecto.

Verifica instalación:

```bash
git --version
```

---

## `.gitignore` recomendado

Coloca este archivo `.gitignore` en la raíz del proyecto:

```gitignore
node_modules/
dist/
.vite/
venv/
backend/venv/
__pycache__/
*.py[cod]
.env
.env.*
backend/.env
.DS_Store
Thumbs.db
.vscode/
.idea/
*.log
npm-debug.log*
```

Si en el futuro no quieres subir base de datos o archivos temporales de notas, puedes agregar también:

```gitignore
sistema_colegio.db
*.txt
```

---

## Flujo de trabajo recomendado con GitHub

### Primera vez en una computadora nueva

1. Clona el repositorio
2. Configura backend
3. Configura frontend
4. Corre ambos servicios

### Uso diario

1. Haces `git pull`
2. Levantas backend
3. Levantas frontend

### Al terminar cambios

1. Haces `git add .`
2. Haces `git commit -m "mensaje"`
3. Haces `git push`

---

## 1) Clonar el repositorio

```bash
git clone https://github.com/Slush-04/POS-COLEGIO.git
cd POS-COLEGIO
```

---

## 2) Configuración inicial del backend

Abre una terminal y entra a `backend`.

### Windows PowerShell

```powershell
cd "C:\ruta\al\proyecto\V3\backend"
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### macOS

```bash
cd ~/ruta/al/proyecto/V3/backend
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Inicializar base de datos

Haz este paso solo si necesitas crear o regenerar la base de datos.

**Windows**
```powershell
py database.py
```

**macOS**
```bash
python3 database.py
```

### Iniciar backend

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Disponible en:

```text
http://127.0.0.1:8000
```

Documentación:

```text
http://127.0.0.1:8000/docs
```

---

## 3) Configuración inicial del frontend

Abre otra terminal y entra a la raíz del proyecto.

### Windows PowerShell

```powershell
cd "C:\ruta\al\proyecto\V3"
npm ci
```

### macOS

```bash
cd ~/ruta/al/proyecto/V3
npm ci
```

### Iniciar frontend

```bash
npm run dev
```

Normalmente abre en:

```text
http://localhost:3000
```

---

## 4) Uso diario después de la primera configuración

Después de que cada computadora ya quedó preparada una vez, ya no necesitas reinstalar todo cada vez que cambias de equipo.

### Backend — Windows PowerShell

```powershell
cd "C:\ruta\al\proyecto\V3\backend"
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Backend — macOS

```bash
cd ~/ruta/al/proyecto/V3/backend
source venv/bin/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend — Windows PowerShell

```powershell
cd "C:\ruta\al\proyecto\V3"
npm run dev
```

### Frontend — macOS

```bash
cd ~/ruta/al/proyecto/V3
npm run dev
```

---

## 5) Flujo diario con GitHub

### Cuando termines cambios

```bash
git add .
git commit -m "Describe aquí el cambio"
git push
```

### Cuando abras el proyecto en la otra computadora

```bash
git pull
```

Después de eso, solo arrancas backend y frontend.

---

## 6) Scripts recomendados para arrancar más rápido

Estos scripts no son obligatorios, pero te ayudan a no escribir todo manualmente.

### Windows — `start-backend.ps1`

```powershell
cd "$PSScriptRoot\backend"
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Windows — `start-frontend.ps1`

```powershell
cd "$PSScriptRoot"
npm run dev
```

### macOS — `start-backend.sh`

```bash
#!/bin/bash
cd "$(dirname "$0")/backend"
source venv/bin/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### macOS — `start-frontend.sh`

```bash
#!/bin/bash
cd "$(dirname "$0")"
npm run dev
```

### Dar permisos en macOS

```bash
chmod +x start-backend.sh
chmod +x start-frontend.sh
```

### Uso

**macOS**
```bash
./start-backend.sh
./start-frontend.sh
```

**Windows PowerShell**
```powershell
.\start-backend.ps1
.\start-frontend.ps1
```

---

## 7) Cuándo sí conviene reinstalar limpio

No hagas reinstalación limpia por rutina.

Hazla solo si:

- se dañó `venv`
- se dañó `node_modules`
- cambiaste dependencias
- hubo errores de permisos
- aparecen errores extraños al correr el proyecto

---

## Reinstalación limpia del frontend

### Windows PowerShell

```powershell
cd "C:\ruta\al\proyecto\V3"
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm cache verify
npm ci
npm run dev
```

### macOS

```bash
cd ~/ruta/al/proyecto/V3
rm -rf node_modules
npm cache verify
npm ci
npm run dev
```

Si Vite muestra error de permisos en macOS:

```bash
chmod +x node_modules/.bin/vite
npm run dev
```

Si el problema afecta varios ejecutables:

```bash
chmod -R u+x node_modules/.bin
npm run dev
```

---

## Reinstalación limpia del backend

### Windows PowerShell

```powershell
cd "C:\ruta\al\proyecto\V3\backend"
Remove-Item -Recurse -Force venv -ErrorAction SilentlyContinue
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### macOS

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

## 8) Comprobación rápida

Todo está listo cuando:

- el backend responde en `http://127.0.0.1:8000/docs`
- el frontend abre en `http://localhost:3000`
- el login funciona
- no hay errores de conexión entre frontend y backend

---

## 9) Problemas comunes

### `npm` o `node` no se reconoce

```bash
node --version
npm --version
```

### `python`, `python3` o `py` no se reconoce

Reinstala Python y revisa PATH.

### El entorno virtual no se activa

Confirma que estás dentro de `backend/` y que `venv` existe.

### `uvicorn` no se reconoce

```bash
pip install -r requirements.txt
```

También puedes iniciar así:

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### El frontend abre pero el login no funciona

Revisa:

- que el backend siga corriendo
- que `http://127.0.0.1:8000/docs` responda
- que el frontend apunte al puerto correcto
- que la base de datos exista
- que haya usuarios de prueba si el sistema los necesita

### Puerto ocupado

**Backend**
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

**Frontend**
```bash
npm run dev -- --port 3001
```

---

## 10) Cómo detener el proyecto

En cada terminal:

```text
Control + C
```

---

## Resumen rápido

### Primera vez por computadora

1. Clonar repo
2. Crear `venv`
3. Instalar backend
4. Instalar frontend
5. Correr backend
6. Correr frontend

### Uso diario

1. `git pull`
2. Levantar backend
3. Levantar frontend

### Al terminar cambios

1. `git add .`
2. `git commit -m "mensaje"`
3. `git push`
