# Create Python Modern

[![NPM Version](https://img.shields.io/npm/v/create-python-modern.svg)](https://www.npmjs.com/package/create-python-modern)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

Una herramienta CLI para crear proyectos Python modernos con las mejores prácticas, gestión de paquetes con uv, type hints, testing y herramientas de calidad integradas.

## Características

- 🚀 **Instalación automática de uv** - Gestor de paquetes Python ultrarrápido
- 🏗️ **Estructura moderna** - Diseño src/ recomendado por Python Packaging Authority
- 🔍 **Type hints** - Tipado estático obligatorio con MyPy
- 🧪 **Testing completo** - pytest con cobertura >80%
- 🎨 **Calidad de código** - Ruff para linting y formatting
- 🔒 **Seguridad integrada** - Bandit para análisis de seguridad
- 🔄 **Pre-commit hooks** - Verificación automática antes de commits
- 🤖 **Integración Claude Code** - Reglas y configuración optimizada
- ⚡ **Async/await** - Soporte para operaciones asíncronas
- 📦 **Pydantic** - Validación de datos y modelos
- 📝 **Logging estructurado** - con structlog

## Instalación

### Global (recomendado)

```bash
npm install -g create-python-modern
```

### Local

```bash
npm install create-python-modern
```

## Uso

### Crear un nuevo proyecto

```bash
# Usando el comando global
create-python-modern mi-proyecto

# Usando npx (sin instalación global)
npx create-python-modern mi-proyecto

# Interactivo (se te pedirá el nombre del proyecto)
create-python-modern
```

## Requisitos

- Node.js >= 16.0.0
- Python >= 3.8 (se instalará automáticamente con uv si no está presente)

## Estructura del Proyecto Creado

```
mi-proyecto/
├── .claude.md              # Reglas para Claude Code
├── .pre-commit-config.yaml # Hooks de calidad
├── pyproject.toml          # Configuración del proyecto
├── src/mi_proyecto/
│   ├── __init__.py
│   ├── main.py            # Código principal
│   └── py.typed           # Marcador de tipos
└── tests/
    ├── __init__.py
    └── test_main.py       # Tests
```

## Comandos de Desarrollo

Una vez creado el proyecto:

```bash
# Ingresar al directorio
cd mi-proyecto

# Ejecutar la aplicación
uv run python -m mi_proyecto.main

# Ejecutar tests con cobertura
uv run pytest --cov=src

# Linting y formatting
uv run ruff check . && uv run ruff format .

# Verificación de tipos
uv run mypy src/

# Instalar dependencias
uv add nombre-paquete
uv add --dev nombre-paquete-dev

# Sincronizar dependencias
uv sync
```

## Herramientas Incluidas

- **uv** - Gestor de paquetes Python ultra rápido
- **Ruff** - Linter y formatter en Rust
- **MyPy** - Verificación de tipos estáticos
- **pytest** - Framework de testing
- **pre-commit** - Hooks de Git para calidad
- **Bandit** - Análisis de seguridad
- **structlog** - Logging estructurado
- **Pydantic** - Validación de datos

## Configuración de Claude Code

El proyecto generado incluye un archivo `.claude.md` con reglas estrictas de codificación que Claude Code seguirá automáticamente:

- Type hints obligatorios
- Docstrings en estilo Google
- Async/await para operaciones I/O
- Excepciones específicas
- Validación de entradas
- Testing obligatorio

## Publicación en npmjs

Para publicar o actualizar este paquete en npmjs, sigue estos pasos:

### 1. Iniciar sesión en npm
```bash
npm login
```

### 2. Verificar la configuración del package.json
Asegúrate de que el archivo `package.json` tenga la versión correcta y todos los metadatos necesarios.

### 3. Publicar el paquete
```bash
# Para publicación pública
npm publish

# Para publicación con tag específico (beta, next, etc.)
npm publish --tag beta

# Para publicación como package scoped
npm publish --access public
```

### 4. Verificar la publicación
```bash
npm view create-python-modern
```

### 5. Actualizar versión y republicar
Cuando realices cambios y quieras publicar una nueva versión:

```bash
# Actualizar versión (sigue versionamiento semántico)
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# Publicar la nueva versión
npm publish
```

### Notas importantes:
- Asegúrate de haber ejecutado las pruebas antes de publicar
- Actualiza el CHANGELOG.md con cada nueva versión
- Si es la primera publicación, verifica que el nombre del paquete esté disponible en npmjs
- Mantén consistencia en el versionamiento semántico

## Contribución

1. Fork este repositorio
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add some amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - mira el archivo [LICENSE](LICENSE) para detalles.

## Autor

**[Tu Nombre]** - [@jhonma82](https://github.com/jhonma82)

## Roadmap

- [ ] Soporte para plantillas personalizadas
- [ ] Integración con Docker
- [ ] Generador de documentación automática
- [ ] Soporte para microservicios
- [ ] Integración CI/CD

## Issues

Si encuentras un bug o quieres sugerir una mejora, por favor [abre un issue](https://github.com/jhonma82/create-python-modern/issues).

## Changelog

### v1.0.1
- Traducción de mensajes al español
- Mejoras en la configuración de herramientas

### v1.0.0
- Versión inicial
- Creación de proyectos Python modernos
- Integración completa de herramientas de calidad