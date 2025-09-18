#!/usr/bin/env node

import chalk from 'chalk'
import { execSync } from 'child_process'
import { program } from 'commander'
import * as fs from 'fs'
import inquirer from 'inquirer'
import ora from 'ora'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TEMPLATES_DIR = path.resolve(__dirname, '../templates')

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function renderTemplate(content, vars = {}) {
  let out = content
  for (const [key, value] of Object.entries(vars)) {
    const re = new RegExp(`__${key}__`, 'g')
    out = out.replace(re, String(value))
  }
  return out
}

function readTemplate(relPath) {
  const fullPath = path.join(TEMPLATES_DIR, relPath)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Template not found: ${relPath} (expected at ${fullPath})`)
  }
  return fs.readFileSync(fullPath, 'utf8')
}

function copyTemplate(relTemplatePath, destPath, vars = {}) {
  const content = readTemplate(relTemplatePath)
  const rendered = renderTemplate(content, vars)
  ensureDirSync(path.dirname(destPath))
  fs.writeFileSync(destPath, rendered)
}

program
  .name('create-python-modern')
  .description('Crea proyectos Python con mejores prácticas')
  .version('1.0.9')
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
  // Append modern config from template to uv-generated pyproject.toml
  let existingConfig = ''
  if (fs.existsSync('pyproject.toml')) {
    existingConfig = fs.readFileSync('pyproject.toml', 'utf8').trim()
  }

  const moduleName = projectName.replace(/-/g, '_')
  const extraConfig = renderTemplate(readTemplate('pyproject.extra.toml'), { MODULE_NAME: moduleName }).trimStart()
  const fullConfig = (existingConfig ? existingConfig + '\n' : '') + '\n' + extraConfig + '\n'
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

  // Crear archivos desde templates
  copyTemplate('main.py.template', path.join(srcPath, 'main.py'), { PROJECT_NAME: projectName })
  copyTemplate('py.typed.template', path.join(srcPath, 'py.typed'))
  copyTemplate('__init__.py.template', path.join(srcPath, '__init__.py'), { PROJECT_NAME: projectName })

  // Crear __init__.py vacío en tests si no existe
  const testsInitPath = path.join(testsPath, '__init__.py')
  if (!fs.existsSync(testsInitPath)) {
    fs.writeFileSync(testsInitPath, '')
  }

  copyTemplate('test_main.py.template', path.join(testsPath, 'test_main.py'), { MODULE_NAME: moduleName })
  copyTemplate('.claude.md.template', '.claude.md')
  copyTemplate('.pre-commit-config.yaml.template', '.pre-commit-config.yaml')
}

program.parse()
