#!/usr/bin/env node

import chalk from 'chalk'
import { execSync } from 'child_process'
import { program } from 'commander'
import * as fs from 'fs'
import inquirer from 'inquirer'
import ora from 'ora'
import * as path from 'path'

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
        execSync('powershell -c "irm https://astral.sh/uv/install.ps1 | iex"', { stdio: 'inherit', shell: true })
      } else {
        execSync('curl -LsSf https://astral.sh/uv/install.sh | sh', { stdio: 'inherit', shell: true })
      }

      // Verificar instalación después de instalar
      try {
        execSync('uv --version', { stdio: 'pipe' })
        spinner.succeed('uv instalado correctamente')
      } catch (installError) {
        spinner.fail('Fallo en la verificación de uv después de la instalación')
        throw new Error('Por favor, instala uv manualmente desde https://astral.sh/uv')
      }
    }

    // Check if project directory already exists
    if (fs.existsSync(projectName)) {
      throw new Error(
        `El directorio del proyecto "${projectName}" ya existe. Por favor elige un nombre diferente o elimina el directorio existente.`,
      )
    }

    // Crear proyecto con uv
    spinner.text = 'Creando estructura del proyecto...'
    execSync(`uv init --package ${projectName}`, { stdio: 'pipe' })
    process.chdir(projectName)

    // VERIFICAR QUE LA ESTRUCTURA SE CREÓ CORRECTAMENTE
    const snakeCaseName = projectName.replace(/-/g, '_')
    const requiredDirs = ['src', `src/${snakeCaseName}`]
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        throw new Error(`El directorio requerido ${dir} no fue creado por uv init`)
      }
    }

    spinner.succeed('Estructura del proyecto creada')

    // Agregar configuración moderna
    spinner.text = 'Agregando configuración moderna...'
    await addModernConfig(projectName)
    spinner.succeed('Configuración moderna agregada')

    // Crear archivos de código
    spinner.text = 'Creando archivos de código...'
    await createCodeFiles(projectName)
    spinner.succeed('Archivos de código creados')

    // Verificar que los archivos se crearon correctamente
    const requiredFiles = [
      `src/${snakeCaseName}/main.py`,
      `src/${snakeCaseName}/py.typed`,
      'tests/test_main.py',
      '.claude.md',
    ]

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`El archivo requerido ${file} no fue creado`)
      }
    }

    // Instalar dependencias
    spinner.text = 'Instalando dependencias de runtime...'
    execSync('uv add structlog pydantic', {
      stdio: 'pipe',
    })

    // Las dependencias de desarrollo ya se definen en dependency-groups.dev en el pyproject.toml
    // Solo necesitamos sincronizar para instalarlas
    spinner.text = 'Sincronizando dependencias de desarrollo...'
    execSync('uv sync', {
      stdio: 'pipe',
    })
    spinner.succeed('Dependencias instaladas')

    // Configurar pre-commit
    spinner.text = 'Configurando hooks de pre-commit...'
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
    console.log(chalk.white(`├── src/${snakeCaseName}/`))
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
    console.log(chalk.white(`uv run python -m ${snakeCaseName}.main    # Run application`))
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
  // Read existing pyproject.toml from uv init
  let existingConfig = ''
  if (fs.existsSync('pyproject.toml')) {
    existingConfig = fs.readFileSync('pyproject.toml', 'utf8')
  }

  // Simple approach: append new configuration after existing content
  const newConfig = `

[tool.ruff]
line-length = 88
target-version = "py311"
src = ["src"]

[tool.ruff.lint]
select = ["E", "W", "F", "I", "N", "UP", "S", "B", "C4", "ICN", "PIE", "T20", "Q", "RET", "SIM", "ARG", "PTH", "ERA"]
ignore = ["E501", "S101"]

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["S101", "ARG", "PLR2004"]

[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
no_implicit_optional = true

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
asyncio_mode = "auto"
addopts = ["--strict-markers", "--strict-config", "--cov=src", "--cov-report=term-missing", "--cov-fail-under=80"]

[tool.bandit]
exclude_dirs = ["tests"]
skips = ["B101"]

[tool.coverage.run]
source = ["src"]
omit = ["tests/*"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "if self.debug:",
    "if settings.DEBUG",
    "raise AssertionError",
    "raise NotImplementedError",
    "if 0:",
    "if __name__ == .__main__.:"
]

[dependency-groups]
dev = [
    "bandit>=1.8.6",
    "mypy>=1.18.1",
    "pre-commit>=4.3.0",
    "pytest>=8.4.2",
    "pytest-asyncio>=1.2.0",
    "pytest-cov>=7.0.0",
    "ruff>=0.13.0",
    "python-dotenv>=1.0.0",
    "httpx>=0.27.0",
    "factory-boy>=3.3.0",
    "pytest-mock>=3.14.0",
]`

  // Combine existing and new config
  const fullConfig = existingConfig.trim() + newConfig
  fs.writeFileSync('pyproject.toml', fullConfig)
}

// Simple TOML parser and serializer for this use case
function parseToml(tomlStr) {
  const result = {}
  const lines = tomlStr.split('\n')
  let currentSection = result
  const sectionStack = []
  let arrayContinuation = false
  let currentArrayKey = null
  let currentArrayValue = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    // Handle array continuation
    if (arrayContinuation) {
      if (trimmed.endsWith(']')) {
        // End of array
        arrayContinuation = false
        const arrayContent = trimmed.slice(0, -1).trim()
        if (arrayContent) {
          currentArrayValue.push(...parseArrayItems(arrayContent))
        }
        currentSection[currentArrayKey] = currentArrayValue
        currentArrayKey = null
        currentArrayValue = []
      } else {
        // Continue array
        currentArrayValue.push(...parseArrayItems(trimmed))
      }
      continue
    }

    // Section headers
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]/)
    if (sectionMatch) {
      const sectionPath = sectionMatch[1].split('.')
      let current = result

      for (let i = 0; i < sectionPath.length - 1; i++) {
        if (!current[sectionPath[i]]) {
          current[sectionPath[i]] = {}
        }
        current = current[sectionPath[i]]
      }

      const sectionName = sectionPath[sectionPath.length - 1]
      current[sectionName] = current[sectionName] || {}
      currentSection = current[sectionName]
      sectionStack.length = 0
      sectionStack.push(...sectionPath)
      continue
    }

    // Key-value pairs
    const kvMatch = trimmed.match(/^([^=]+)\s*=\s*(.*)$/)
    if (kvMatch) {
      const key = kvMatch[1].trim()
      let value = kvMatch[2].trim()

      // Check if this is an array start
      if (value.startsWith('[')) {
        if (value.endsWith(']')) {
          // Complete array in one line
          const arrayContent = value.slice(1, -1).trim()
          currentSection[key] = parseArrayItems(arrayContent)
        } else {
          // Multi-line array
          arrayContinuation = true
          currentArrayKey = key
          currentArrayValue = []
          const arrayContent = value.slice(1).trim()
          if (arrayContent) {
            currentArrayValue.push(...parseArrayItems(arrayContent))
          }
        }
      } else {
        // Handle inline tables (special case for authors)
        if (value.startsWith('{') && value.endsWith('}')) {
          try {
            currentSection[key] = parseInlineTable(value)
          } catch (e) {
            // Fallback: keep as string
            currentSection[key] = value
          }
        } else {
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          currentSection[key] = value
        }
      }
    }
  }

  return result
}

function parseArrayItems(arrayStr) {
  const items = []
  let currentItem = ''
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < arrayStr.length; i++) {
    const char = arrayStr[i]

    if ((char === '"' || char === "'") && (i === 0 || arrayStr[i - 1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar) {
        inQuotes = false
        quoteChar = ''
      } else {
        currentItem += char
      }
    } else if (char === ',' && !inQuotes) {
      if (currentItem.trim()) {
        items.push(currentItem.trim().replace(/^["']|["']$/g, ''))
      }
      currentItem = ''
    } else {
      currentItem += char
    }
  }

  // Add the last item
  if (currentItem.trim()) {
    items.push(currentItem.trim().replace(/^["']|["']$/g, ''))
  }

  return items
}

function parseInlineTable(tableStr) {
  const result = {}
  let content = tableStr.slice(1, -1).trim()

  // Handle the case where we have an array of inline tables like [{ name = "...", email = "..." }]
  if (content.startsWith('[') && content.endsWith(']')) {
    content = content.slice(1, -1).trim()
    // Return array of inline tables
    return parseArrayItems(content).map(item => {
      if (typeof item === 'string' && item.startsWith('{') && item.endsWith('}')) {
        return parseInlineTable(item)
      }
      return item
    })
  }

  // Simple parser for inline tables like { name = "author", email = "email" }
  const pairs = []
  let currentPair = ''
  let inBraces = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]

    if (char === '{') {
      inBraces = true
      currentPair += char
    } else if (char === '}') {
      inBraces = false
      currentPair += char
    } else if (char === ',' && !inBraces) {
      if (currentPair.trim()) {
        pairs.push(currentPair.trim())
      }
      currentPair = ''
    } else {
      currentPair += char
    }
  }

  if (currentPair.trim()) {
    pairs.push(currentPair.trim())
  }

  for (const pair of pairs) {
    const trimmed = pair.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      // Nested inline table
      result['nested'] = parseInlineTable(trimmed)
      continue
    }

    const match = trimmed.match(/^([^=]+)\s*=\s*(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      result[key] = value
    }
  }

  return result
}

function tomlify(obj, indent = 0) {
  const spaces = ' '.repeat(indent)
  let result = ''

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue

    if (typeof value === 'object' && !Array.isArray(value)) {
      // Check if it's an inline table (has simple key-value pairs)
      const keys = Object.keys(value)
      const isInlineTable =
        keys.length > 0 &&
        keys.every(
          k => typeof value[k] === 'string' || typeof value[k] === 'boolean' || typeof value[k] === 'number',
        ) &&
        ((keys.includes('name') && keys.includes('email')) || keys.length <= 3)

      if (isInlineTable && (key === 'authors' || key === 'maintainers' || indent > 0)) {
        result += `${spaces}${key} = ${inlineTableToToml(value)}\n`
      } else {
        // Quote key if it contains special characters for sections too
        const quotedKey = key.includes('*') || key.includes('/') || key.includes('.') ? `"${key}"` : key
        result += `${spaces}[${quotedKey}]\n`
        result += tomlify(value, indent + 2)
      }
    } else {
      // Quote key if it contains special characters
      const quotedKey = key.includes('*') || key.includes('/') || key.includes('.') ? `"${key}"` : key
      result += `${spaces}${quotedKey} = `
      if (Array.isArray(value)) {
        if (value.length === 0) {
          result += '[]\n'
        } else if (typeof value[0] === 'object' && value[0] !== null) {
          // Array of objects (inline tables)
          result += '[\n'
          for (const item of value) {
            result += `${spaces}  ${inlineTableToToml(item)},\n`
          }
          result += `${spaces}]\n`
        } else {
          // Array of strings/primitives
          result += '[\n'
          for (const item of value) {
            if (typeof item === 'string') {
              result += `${spaces}  "${item}",\n`
            } else {
              result += `${spaces}  ${item},\n`
            }
          }
          result += `${spaces}]\n`
        }
      } else if (typeof value === 'string') {
        result += `"${value}"\n`
      } else if (typeof value === 'boolean') {
        result += value ? 'true\n' : 'false\n'
      } else if (typeof value === 'number') {
        result += `${value}\n`
      } else {
        result += `"${value}"\n`
      }
    }
  }

  return result
}

function inlineTableToToml(obj) {
  const pairs = []
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      pairs.push(`${key} = "${value}"`)
    } else if (typeof value === 'boolean') {
      pairs.push(`${key} = ${value}`)
    } else if (typeof value === 'number') {
      pairs.push(`${key} = ${value}`)
    } else {
      pairs.push(`${key} = "${value}"`)
    }
  }
  return `{ ${pairs.join(', ')} }`
}

async function createCodeFiles(projectName) {
  const moduleName = projectName.replace(/-/g, '_')
  const srcPath = path.join('src', moduleName)
  const testsPath = 'tests'

  // Función para asegurar que las carpetas existen
  function ensureDirSync(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  // Asegurar que las carpetas necesarias existan
  ensureDirSync(srcPath)
  ensureDirSync(testsPath)

  // Crear main.py con dedent para evitar indentación extra
  const mainPyContent = `"""Main module following Python modern standards."""

from __future__ import annotations

import asyncio
from typing import Any


async def main() -> dict[str, Any]:
    \"""Main application entry point.
    
    Returns:
        Dictionary with application status
    \"""
    return {
        "status": "success", 
        "message": "Application running",
        "project": "${projectName}"
    }


if __name__ == "__main__":
    result = asyncio.run(main())
    print(result)
`.replace(/^ {2}/gm, '')

  fs.writeFileSync(path.join(srcPath, 'main.py'), mainPyContent)

  // Crear py.typed
  fs.writeFileSync(path.join(srcPath, 'py.typed'), '')

  // Crear __init__.py con import de main
  const initPyContent = `"""${projectName} - A modern Python project."""


__all__ = ["main"]
`.replace(/^ {2}/gm, '')

  fs.writeFileSync(path.join(srcPath, '__init__.py'), initPyContent)

  // Crear __init__.py vacío en tests si no existe
  const testsInitPath = path.join(testsPath, '__init__.py')
  if (!fs.existsSync(testsInitPath)) {
    fs.writeFileSync(testsInitPath, '')
  }

  // Crear test_main.py con dedent
  const testPyContent = `"""Tests for main module."""

import pytest

from ${moduleName}.main import main


class TestMain:
    \"""Test suite for main module."""
    
    @pytest.mark.asyncio
    async def test_main_returns_dict(self):
        \"""Test that main function returns a dictionary.\"""
        result = await main()
        assert isinstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_main_required_keys(self):
        \"""Test that main function returns required keys.\"""
        result = await main()
        required_keys = ["status", "message", "project"]
        
        for key in required_keys:
            assert key in result
    
    @pytest.mark.asyncio
    async def test_main_status_success(self):
        \"""Test that main function returns success status.\"""
        result = await main()
        assert result["status"] == "success"
`.replace(/^ {2}/gm, '')

  fs.writeFileSync(path.join(testsPath, 'test_main.py'), testPyContent)

  // Crear .claude.md (dedent applied)
  const claudeMdContent = `# Claude Code - Python Standards Modernos

## REGLAS OBLIGATORIAS PARA ESTE PROYECTO

### ESTRUCTURA
- ✅ Layout src/ (creado con uv init --package)
- ✅ pyproject.toml OBLIGATORIO
- ❗ Type hints OBLIGATORIOS en todas las funciones
- ❗ Tests pytest OBLIGATORIOS (>80% cobertura)
- ❗ Python >= 3.11

### HERRAMIENTAS INSTALADAS
- ✅ Ruff (linting + formatting)
- ✅ MyPy (type checking)
- ✅ pytest + pytest-cov + pytest-asyncio (testing)
- ✅ pre-commit (hooks)
- ✅ uv (package manager)
- ✅ bandit (security scanning)

### **FLUJO DE DESARROLLO RECOMENDADO**

#### **1. ENFOQUE ESCALABLE PARA MÓDULOS**
- **Recomendado**: Empezar con \`src/[proyecto]/main.py\` como punto de entrada principal
- **Flexible**: Crear módulos adicionales cuando sea lógicamente apropiado
- **Estructura sugerida**:
  \`\`\`
  src/mi_proyecto/
  ├── __init__.py          # Exporta funciones principales
  ├── main.py             # Entry point principal
  ├── config.py           # Configuración de la aplicación
  ├── utils/              # Funciones de utilidad reutilizables
  ├── services/           # Lógica de negocio
  └── models/             # Modelos de datos
  \`\`\`

#### **2. ESTRUCTURA DE main.py RECOMENDADA**
\`\`\`python
"""Main module for [FUNCIONALIDAD] - brief description."""

from __future__ import annotations

import asyncio
from typing import Any
# Imports de módulos internos según necesidad

async def main() -> dict[str, Any]:
    """Main application entry point.

    Returns:
        Dictionary with application results
    """
    # IMPLEMENTAR FUNCIONALIDAD AQUÍ
    result = await tu_funcion_principal()
    return {"status": "success", "result": result}

if __name__ == "__main__":
    result = asyncio.run(main())
    print(result)
\`\`\`

#### **3. CUÁNDO CREAR MÓDULOS ADICIONALES**
Crear nuevos módulos cuando:
- La funcionalidad pertenece a un dominio lógico diferente
- Necesitas reutilizar código en múltiples lugares
- Tienes clases complejas que merecen su propio módulo
- El código se vuelve difícil de mantener en un solo archivo

**Orden de creación:**
1. **Evaluar si el módulo es necesario** (evitar fragmentación prematura)
2. **Crear el módulo apropiado** (ej: \`auth.py\`, \`database.py\`, \`utils/helpers.py\`)
3. **Actualizar imports en archivos que lo necesiten**
4. **Exportar funciones públicas en \`__init__.py\`**
5. **Crear tests correspondientes** (\`tests/test_module.py\`)


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
    \"""Process data items asynchronously.
    
    Args:
        items: List of items to process
        limit: Maximum items to process
        metadata: Optional metadata
        
    Returns:
        Dictionary with processing results
        
    Raises:
        ValueError: If limit is negative
    \"""
    if limit < 0:
        raise ValueError("Limit must be non-negative")
    
    return {"processed": len(items[:limit])}
\`\`\`

### TESTING OBLIGATORIO
- Test para cada función pública
- Mocks para dependencias externas
- Tests parametrizados cuando aplique
- Tests async con pytest-asyncio

### **REGLAS PARA MODIFICACIONES: ENFOQUE EQUILIBRADO**

**IMPORTANTE: Este proyecto sigue un diseño escalable que empieza simple pero permite crecimiento organizado. Se prioriza la simplicidad inicial pero se permite una estructura modular cuando sea apropiado.**

**PROTOCOLO PARA NUEVAS FUNCIONALIDADES:**
1. ✅ **Evalúa el alcance** de la funcionalidad antes de decidir dónde implementarla
2. ✅ **Funcionalidades pequeñas**: Agregar a \`main.py\` o módulo existente relacionado
3. ✅ **Funcionalidades complejas o de dominio específico**: Crear módulo dedicado
4. ✅ **Siempre actualizar** \`__init__.py\` para exportar funciones públicas
5. ✅ **Crear tests apropiados** en el archivo de test correspondiente

**EJEMPLO PRÁCTICO:**
**Usuario pide:** "Crea una calculadora"

**ENFOQUE RECOMENDADO:**
- Si es solo operaciones básicas: agregar a \`main.py\`
- Si es una calculadora completa con múltiples operaciones: crear \`calculator.py\`
- Si las operaciones son reutilizables: crear \`utils/calculator.py\`
- Actualizar \`__init__.py\` para exportar funciones principales
- Crear \`tests/test_calculator.py\` o agregar a \`tests/test_main.py\` según corresponda

**EJEMPLOS DE CUÁNDO CREAR MÓDULOS:**
✅ **Crear módulos cuando:**
- Configuración de aplicación: \`config.py\`
- Autenticación: \`auth.py\` o \`services/auth.py\`
- Base de datos: \`database.py\` o \`models/\`
- Utilidades reutilizables: \`utils/helpers.py\`
- API endpoints: \`api/endpoints.py\`

❌ **Evitar crear módulos cuando:**
- Son solo 2-3 funciones pequeñas
- El código no se reutiliza en otros lugares
- La funcionalidad es muy específica y no crecerá

**VERIFICACIÓN ANTES DE APLICAR CUALQUIER CAMBIO:**
- Lee este archivo \`.claude.md\` COMPLETO antes de proceder
- Usa herramientas como \`read_file\` para ver el contenido actual de los archivos antes de editar
- Después de cambios, valida: \`uv run ruff check . && uv run pytest --cov=src\`

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


**Claude: Sigue estas reglas como guía flexible. Prioriza la calidad del código y la escalabilidad del proyecto.**
`.replace(/^ {2}/gm, '')

  fs.writeFileSync('.claude.md', claudeMdContent)

  // Crear .pre-commit-config.yaml con dedent
  const preCommitConfigContent = `repos:
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
`.replace(/^ {2}/gm, '')

  fs.writeFileSync('.pre-commit-config.yaml', preCommitConfigContent)
}

program.parse()
