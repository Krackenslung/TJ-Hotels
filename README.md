# TJ-Hotels

Proyecto web para exploración de hoteles en Tijuana con mapa interactivo.

---

## Requisitos
- Python 3.x
- SQL Server
- Ejecutar `Hotels.sql` en SSMS

---

## Base de Datos

Ejecutar el archivo `Hotels.sql`.

Esto crea:
- Base de datos: `Hotels`
- Tablas: `Users`, `Locations`

---

## Ejecutar Frontend (Puerto 5020)

En PowerShell:

```powershell
cd "FrontEnd Server"
python server.py

Abrir en navegador:
http://127.0.0.1:5020

Ejecutar Backend (Puerto 5010)

cd "BackEnd Server"
python server.py

Frontend corre en el puerto 5020.

Backend corre en el puerto 5010.

El frontend consume endpoints del backend.

13h y 14 min por parte de JL XD