#!/usr/bin/env node

const { program } = require('commander')
const chalk = require('chalk')
const ora = require('ora')
const inquirer = require('inquirer')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

program
  .name('create-python-modern')
  .description('Crea proyectos Python con mejores prácticas')
  .version('1.0.0')
  .argument('[project-name]', 'Name of the project to create')
  .action(async projectName => {
    console.log(chalk.blue.bold('🚀 Crear Proyecto Python Moderno'))
    console.log()

    // Si no se proporciona nombre, preguntar
    if (!projectName) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: '¿Cuál es el nombre de tu proyecto?',
          default: 'mi-proyecto-python',
          validate: input => {
            if (/^[a-z][a-z0-9-]*$/.test(input)) {
              return true
            }
            return 'El nombre del proyecto debe comenzar con una letra y contener solo letras minúsculas, números y guiones'
          },
        },
      ])
      projectName = answers.projectName
    }

    await createPythonProject(projectName)
  })

async function createPythonProject(projectName) {
  const spinner = ora('Creando proyecto Python...').start()

  try {
    // Verificar si uv está instalado
    spinner.text = 'Verificando instalación de uv...'
    try {
      execSync('uv --version', { stdio: 'pipe' })
      spinner.succeed('uv está instalado')
    } catch (error) {
      spinner.text = 'Instalando uv...'

      // Detectar SO y instalar uv
      const platform = process.platform
      if (platform === 'win32') {
        execSync('powershell -c "irm https://astral.sh/uv/install.ps1 | iex"', { stdio: 'inherit' })
      } else {
        execSync('curl -LsSf https://astral.sh/uv/install.sh | sh', { stdio: 'inherit' })
      }
      spinner.succeed('uv instalado correctamente')
    }

    // Check if project directory already exists
    if (fs.existsSync(projectName)) {
      throw new Error(
        `El directorio del proyecto "${projectName}" ya existe. Por favor elige un nombre diferente o elimina el directorio existente.`,
      )
    }

    // Crear proyecto con uv
    spinner.start('Creando estructura del proyecto...')
    execSync(`uv init --package ${projectName}`, { stdio: 'pipe' })
    process.chdir(projectName)

    // VERIFICAR QUE LA ESTRUCTURA SE CREÓ CORRECTAMENTE
    const requiredDirs = ['src', `src/${projectName.replace(/-/g, '_')}`]
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        throw new Error(`El directorio requerido ${dir} no fue creado por uv init`)
      }
    }

    spinner.succeed('Estructura del proyecto creada')

    // Agregar configuración moderna
    spinner.start('Agregando configuración moderna...')
    await addModernConfig(projectName)
    spinner.succeed('Configuración moderna agregada')

    // Crear archivos de código
    spinner.start('Creando archivos de código...')
    await createCodeFiles(projectName)
    spinner.succeed('Archivos de código creados')

    // Verificar que los archivos se crearon correctamente
    const requiredFiles = [
      `src/${projectName.replace(/-/g, '_')}/main.py`,
      `src/${projectName.replace(/-/g, '_')}/py.typed`,
      'tests/test_main.py',
      '.claude.md',
    ]

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`El archivo requerido ${file} no fue creado`)
      }
    }

    // Instalar dependencias
    spinner.start('Instalando dependencias...')
    execSync('uv add --dev ruff mypy pytest pytest-cov pytest-asyncio pre-commit bandit structlog pydantic', {
      stdio: 'pipe',
    })
    spinner.succeed('Dependencias instaladas')
    // Configurar pre-commit
    spinner.start('Configurando hooks de pre-commit...')
    try {
      execSync('uv run pre-commit install', { stdio: 'pipe' })
      spinner.succeed('Hooks de pre-commit configurados')
    } catch (error) {
      spinner.warn('Configuración de hooks de pre-commit omitida')
    }

    // Mensaje final (versión mejorada)
    console.log()
    console.log(chalk.green.bold('✅ ¡Proyecto creado exitosamente!'))
    console.log()
    console.log(chalk.cyan('📁 Estructura del proyecto:'))
    console.log(chalk.white(`${projectName}/`))
    console.log(chalk.white(`├── .claude.md              # Rules for Claude Code`))
    console.log(chalk.white(`├── .pre-commit-config.yaml # Quality hooks`))
    console.log(chalk.white(`├── pyproject.toml          # Project configuration`))
    console.log(chalk.white(`├── src/${projectName.replace(/-/g, '_')}/`))
    console.log(chalk.white(`│   ├── __init__.py`))
    console.log(chalk.white(`│   ├── main.py             # Main code`))
    console.log(chalk.white(`│   └── py.typed            # Type marker`))
    console.log(chalk.white(`└── tests/`))
    console.log(chalk.white(`    ├── __init__.py`))
    console.log(chalk.white(`    └── test_main.py        # Tests`))
    console.log()
    console.log(chalk.cyan('📋 Próximos pasos:'))
    console.log(chalk.white(`1. cd ${projectName}`))
    console.log(chalk.white('2. code . (open in VS Code with Claude)'))
    console.log()
    console.log(chalk.cyan('🔧 Comandos de desarrollo:'))
    console.log(chalk.white(`uv run python -m ${projectName.replace(/-/g, '_')}.main    # Run application`))
    console.log(chalk.white('uv run pytest --cov=src                    # Run tests with coverage'))
    console.log(chalk.white('uv run ruff check . && uv run ruff format . # Lint & format'))
    console.log(chalk.white('uv run mypy src/                            # Type checking'))
    console.log()
    console.log(chalk.cyan('📦 Gestión de paquetes:'))
    console.log(chalk.white('uv add nombre-paquete                         # Agregar dependencia'))
    console.log(chalk.white('uv add --dev nombre-paquete                   # Agregar dependencia de desarrollo'))
    console.log(chalk.white('uv sync                                     # Sincronizar dependencias'))
    console.log()
    console.log(chalk.yellow('💡 El proyecto incluye .claude.md con estrictos estándares de codificación.'))
    console.log(chalk.yellow('   Claude Code seguirá automáticamente estas reglas.'))

    process.exit(0)
  } catch (error) {
    spinner.fail(`Error al crear el proyecto: ${error.message}`)
    console.error(chalk.red(error.message))
    process.exit(1)
  }
}

async function addModernConfig(projectName) {
  // Read existing pyproject.toml from uv init and append config
  let existingConfig = ''
  if (fs.existsSync('pyproject.toml')) {
    existingConfig = fs.readFileSync('pyproject.toml', 'utf8')
  }

  const newConfig = `
[tool.ruff]
line-length = 88
target-version = "py38"
src = ["src"]

[tool.ruff.lint]
select = ["E", "W", "F", "I", "N", "UP", "S", "B", "C4", "ICN", "PIE", "T20", "Q", "RET", "SIM", "ARG", "PTH", "ERA"]
ignore = ["E501", "S101"]

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["S101", "ARG", "PLR2004"]

[tool.mypy]
python_version = "3.8"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
no_implicit_optional = true

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = ["--strict-markers", "--strict-config", "--cov=src", "--cov-report=term-missing", "--cov-fail-under=80"]
`

  const fullConfig = existingConfig.trim() ? `${existingConfig}\n${newConfig.trim()}\n` : newConfig.trim()
  fs.writeFileSync('pyproject.toml', fullConfig)
}

async function createCodeFiles(projectName) {
  const moduleName = projectName.replace(/-/g, '_')

  // Función para asegurar que las carpetas existen
  function ensureDirSync(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  // Asegurar que las carpetas necesarias existan
  ensureDirSync(path.join(process.cwd(), 'src', moduleName))
  ensureDirSync(path.join(process.cwd(), 'tests'))

  // Crear main.py
  const mainPy = `"""Main module following Python modern standards."""

from __future__ import annotations

import asyncio
from typing import Any


async def main() -> dict[str, Any]:
    """Main application entry point.
    
    Returns:
        Dictionary with application status
    """
    return {
        "status": "success", 
        "message": "Application running",
        "project": "${projectName}"
    }


if __name__ == "__main__":
    result = asyncio.run(main())
    print(result)
`

  fs.writeFileSync(path.join('src', moduleName, 'main.py'), mainPy)

  // Crear py.typed
  fs.writeFileSync(path.join('src', moduleName, 'py.typed'), '')

  // Crear __init__.py vacío en tests si no existe
  const testsInitPath = path.join('tests', '__init__.py')
  if (!fs.existsSync(testsInitPath)) {
    fs.writeFileSync(testsInitPath, '')
  }

  // Crear test
  const testPy = `"""Tests for main module."""

import pytest

from ${moduleName}.main import main


class TestMain:
    """Test suite for main module."""
    
    @pytest.mark.asyncio
    async def test_main_returns_dict(self):
        """Test that main function returns a dictionary."""
        result = await main()
        assert isinstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_main_required_keys(self):
        """Test that main function returns required keys."""
        result = await main()
        required_keys = ["status", "message", "project"]
        
        for key in required_keys:
            assert key in result
    
    @pytest.mark.asyncio
    async def test_main_status_success(self):
        """Test that main function returns success status."""
        result = await main()
        assert result["status"] == "success"
`

  fs.writeFileSync(path.join('tests', 'test_main.py'), testPy)

  // Crear .claude.md COMPLETO (versión original detallada)
  const claudeMd = `# Claude Code - Python Standards Modernos

## REGLAS OBLIGATORIAS PARA ESTE PROYECTO

### ESTRUCTURA
- ✅ Layout src/ (creado con uv init --package)
- ✅ pyproject.toml OBLIGATORIO
- ❗ Type hints OBLIGATORIOS en todas las funciones
- ❗ Tests pytest OBLIGATORIOS (>80% cobertura)
- ❗ Python >= 3.8

### HERRAMIENTAS INSTALADAS
- ✅ Ruff (linting + formatting)
- ✅ MyPy (type checking)
- ✅ pytest + pytest-cov (testing)
- ✅ pre-commit (hooks)
- ✅ uv (package manager)

### CÓDIGO OBLIGATORIO
1. **Type hints en TODAS las funciones públicas**
2. **Async/await para operaciones I/O**
3. **Pydantic para validación de datos**
4. **Excepciones específicas (NO Exception genérico)**
5. **Docstrings Google style OBLIGATORIOS**
6. **Context managers para recursos**

### TEMPLATE FUNCIÓN ESTÁNDAR
\`\`\`python
from __future__ import annotations
from typing import Any

async def process_data(
    items: list[str],
    limit: int = 100,
    metadata: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Process data items asynchronously.
    
    Args:
        items: List of items to process
        limit: Maximum items to process
        metadata: Optional metadata
        
    Returns:
        Dictionary with processing results
        
    Raises:
        ValueError: If limit is negative
    """
    if limit < 0:
        raise ValueError("Limit must be non-negative")
    
    return {"processed": len(items[:limit])}
\`\`\`

### TESTING OBLIGATORIO
- Test para cada función pública
- Mocks para dependencias externas
- Tests parametrizados cuando aplique
- Tests async con pytest-asyncio

### SEGURIDAD CRÍTICA
- Validar TODAS las entradas externas
- NO hardcodear secretos (usar variables de entorno)
- Logging estructurado con structlog
- Bandit security scan OBLIGATORIO

### VERIFICACIÓN OBLIGATORIA
Ejecutar antes de cada commit:
\`\`\`bash
uv run ruff check .
uv run ruff format .
uv run mypy src/
uv run pytest --cov=src --cov-fail-under=80
\`\`\`

### COMANDOS UV ÚTILES
\`\`\`bash
uv add package-name          # Agregar dependencia
uv add --dev package-name    # Agregar dependencia de desarrollo
uv run comando               # Ejecutar en el venv
uv sync                      # Sincronizar dependencias
uv lock                      # Actualizar lockfile
\`\`\`

**Claude: Sigue estas reglas ESTRICTAMENTE. No hagas excepciones.**
`

  fs.writeFileSync('.claude.md', claudeMd)

  // Crear .pre-commit-config.yaml
  const preCommitConfig = `repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-merge-conflict
  
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.5.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
  
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.5.1
    hooks:
      - id: mypy
        additional_dependencies: [types-requests]
  
  - repo: https://github.com/PyCQA/bandit
    rev: 1.7.5
    hooks:
      - id: bandit
        args: ["-c", "pyproject.toml"]
`

  fs.writeFileSync('.pre-commit-config.yaml', preCommitConfig)
}

program.parse()
