# Sistema de Gestión - POS Colegio

Este proyecto es una aplicación web full-stack compuesta por un **frontend** interactivo en React (Vite) y un **backend** en Python (FastAPI) con base de datos SQLite.

A continuación encontrarás las instrucciones para instalar y ejecutar el proyecto de forma local, tanto en **Windows** como en **Mac**.

---

## 🛠 Prerrequisitos

Antes de comenzar, asegúrate de tener instalados estos dos programas:

### 1. Node.js (necesario para la interfaz gráfica)
- Descárgalo desde [nodejs.org](https://nodejs.org/) — usa la versión **LTS**.
- Verifica la instalación abriendo una terminal y escribiendo:
  ```
  node --version
  ```

### 2. Python (necesario para el servidor y la base de datos)
- Descárgalo desde [python.org](https://www.python.org/downloads/).
- ⚠️ **Windows:** Durante la instalación, **marca la casilla "Add Python.exe to PATH"** en la primera pantalla del instalador.
- Verifica la instalación:
  - **Windows:** `python --version`
  - **Mac:** `python3 --version`

---

## 🚀 Primera Instalación y Ejecución

El proyecto tiene **dos partes** que deben correr al mismo tiempo. Necesitas abrir **dos terminales** (ventanas de consola) de forma simultánea: una para el Backend y otra para el Frontend.

---

### Terminal 1 — Backend (Python / FastAPI)

**1.** Abre tu terminal:
- **Windows:** PowerShell
- **Mac:** Terminal

**2.** Navega a la carpeta del proyecto y entra al backend:
```bash
cd ruta/a/la/carpeta/V3
cd backend
```
> Ejemplo en Windows: `cd "C:\Users\TuUsuario\Documents\interfaz\V3\backend"`
> Ejemplo en Mac: `cd ~/Documents/interfaz/V3/backend`

**3.** Crea un entorno virtual de Python:

| Sistema | Comando |
|---------|---------|
| Windows | `py -m venv venv` |
| Mac     | `python3 -m venv venv` |

**4.** Activa el entorno virtual:

| Sistema | Comando |
|---------|---------|
| Windows (PowerShell) | `.\venv\Scripts\Activate.ps1` |
| Windows (CMD) | `.\venv\Scripts\activate.bat` |
| Mac | `source venv/bin/activate` |

> 💡 Sabrás que se activó porque verás `(venv)` al inicio de la línea en la terminal.
>
> ⚠️ **Windows:** Si PowerShell te da un error de permisos, ejecuta primero:
> ```powershell
> Set-ExecutionPolicy Unrestricted -Scope CurrentUser
> ```

**5.** Instala las dependencias del backend:
```bash
pip install -r requirements.txt
```

**6.** Inicializa la base de datos:

| Sistema | Comando |
|---------|---------|
| Windows | `python database.py` |
| Mac     | `python3 database.py` |

**7.** Arranca el servidor:
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

> ✅ Si ves el mensaje `Application startup complete`, el servidor está funcionando.
> **Deja esta terminal abierta y minimizada.**

---

### Terminal 2 — Frontend (React / Vite)

**1.** Abre una **nueva** ventana de terminal (sin cerrar la anterior).

**2.** Navega a la carpeta raíz del proyecto (donde está el archivo `package.json`):
```bash
cd ruta/a/la/carpeta/V3
```

**3.** Instala los módulos y dependencias de la interfaz:
```bash
npm install
```

**4.** Arranca la interfaz gráfica:
```bash
npm run dev
```

**5.** La terminal te mostrará una dirección local (normalmente `http://localhost:3000`).

**6.** Abre tu navegador (Chrome, Edge, Safari, etc.) y visita ese enlace.

🎉 **¡Listo!** El sistema ya está corriendo y conectado a tu base de datos local.

---

## 🔄 Re-Ejecución Rápida

Si ya completaste la primera instalación y solo necesitas volver a correr el proyecto:

### Terminal 1 — Backend
```bash
cd ruta/a/la/carpeta/V3/backend
```
Activar el entorno virtual:

| Sistema | Comando |
|---------|---------|
| Windows (PowerShell) | `.\venv\Scripts\Activate.ps1` |
| Mac | `source venv/bin/activate` |

Arrancar el servidor:
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2 — Frontend
```bash
cd ruta/a/la/carpeta/V3
npm run dev
```

> 💡 No necesitas volver a ejecutar `npm install` ni `pip install` a menos que se hayan agregado nuevas dependencias al proyecto.

---

## 🧹 Reinstalación Limpia (si algo falla)

Si el entorno virtual se corrompió o necesitas empezar de cero:

### Backend

Navega a la carpeta del backend y ejecuta:

**Windows (PowerShell):**
```powershell
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python database.py
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Mac:**
```bash
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 database.py
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

Navega a la carpeta raíz del proyecto y ejecuta:

**Windows (PowerShell):**
```powershell
Remove-Item -Recurse -Force node_modules
npm install
npm run dev
```

**Mac:**
```bash
rm -rf node_modules
npm install
npm run dev
```

---

## 📌 Solución de Problemas Comunes

| Problema | Solución |
|----------|----------|
| `python` / `python3` no se reconoce | Instala Python desde [python.org](https://www.python.org/downloads/). En Windows asegúrate de marcar **"Add to PATH"**. |
| Error de permisos en PowerShell | Ejecuta: `Set-ExecutionPolicy Unrestricted -Scope CurrentUser` |
| `npm` / `node` no se reconoce | Instala Node.js desde [nodejs.org](https://nodejs.org/) y reinicia la terminal. |
| El frontend no conecta con el backend | Verifica que la terminal del backend siga abierta con el mensaje `Application startup complete`. |
| Puerto ocupado | Cierra otras terminales que estén usando el mismo puerto, o cambia el puerto: `--port 8001` |