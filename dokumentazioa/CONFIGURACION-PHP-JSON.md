# Configuración del sistema de contenidos

## Requisitos

- PHP 7.4 o posterior.
- La carpeta `data/` debe tener permiso de escritura para el proceso de PHP.
- Las carpetas `img/` y `uploads/` deben permitir la creación de `img/uploads/` y `uploads/gpx/`.
- La web debe abrirse mediante HTTP o HTTPS, no directamente como `file://`.

## Desarrollo local

Desde la raíz del proyecto, con PHP disponible en el sistema:

```powershell
php -S 127.0.0.1:8000
```

Después se puede abrir:

- Sitio público: `http://127.0.0.1:8000/`
- Backoffice: `http://127.0.0.1:8000/back.html`

## Funcionamiento

El contenido público se almacena en `data/content.json`. Tanto el sitio como el backoffice acceden al archivo mediante `api/content.php`.

Las escrituras requieren una sesión autenticada, se hacen de forma atómica y comprueban la revisión del archivo. Si dos personas editan a la vez, la segunda no puede sobrescribir silenciosamente los cambios de la primera.

Las imágenes subidas desde la galería o desde Quill se guardan en `img/uploads/`. Los archivos GPX se guardan en `uploads/gpx/`. El JSON conserva únicamente sus rutas.

## Acceso inicial

La contraseña inicial continúa siendo `Erandio01`, pero ahora se valida en PHP y no aparece en JavaScript.

En producción se debe definir la variable de entorno `TURISMO_ADMIN_PASSWORD_HASH` con el SHA-256 de una contraseña nueva:

```powershell
php -r "echo hash('sha256', 'NUEVA-CONTRASEÑA');"
```

## Publicación

Hay que subir al servidor, además de los HTML, CSS, JavaScript e imágenes:

- `api/content.php`
- `api/upload.php`
- `data/content.json`
- `data/.htaccess`

En Apache, `data/.htaccess` bloquea el acceso directo al JSON. En Nginx o IIS debe configurarse una regla equivalente para `/data/`.

Conviene incluir `data/`, `img/uploads/` y `uploads/gpx/` en las copias de seguridad.
