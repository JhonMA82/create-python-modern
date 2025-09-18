#!/usr/bin/env node

import { execSync } from 'child_process'
import { config } from 'dotenv'
import fs from 'fs'

// Load environment variables
config()

console.log('🔍 [TEST] Iniciando verificación del script de release...\n')

try {
  // 1. Verificar NPM_TOKEN
  console.log('1️⃣  Verificando NPM_TOKEN...')
  if (!process.env.NPM_TOKEN) {
    throw new Error('NPM_TOKEN no encontrado en .env')
  }
  console.log('✅ NPM_TOKEN encontrado\n')

  // 2. Verificar rama
  console.log('2️⃣  Verificando rama actual...')
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
  if (branch !== 'master' && branch !== 'main') {
    throw new Error(`Rama incorrecta: ${branch}`)
  }
  console.log(`✅ Rama correcta: ${branch}\n`)

  // 3. Verificar estado de git
  console.log('3️⃣  Verificando estado del repositorio...')
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' }).trim()
  if (gitStatus) {
    console.log('⚠️  Cambios detectados:')
    console.log(gitStatus)
    console.log('\n💡 Necesitas hacer commit de los cambios primero:')
    console.log('   git add .')
    console.log('   git commit -m "tu mensaje"')
    throw new Error('Hay cambios sin commitear')
  }
  console.log('✅ Repositorio limpio\n')

  // 4. Verificar package.json
  console.log('4️⃣  Verificando package.json...')
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const versionRegex = /^\d+\.\d+\.\d+$/
  if (!versionRegex.test(packageJson.version)) {
    throw new Error(`Versión inválida: ${packageJson.version}`)
  }
  console.log(`✅ Versión válida: ${packageJson.version}\n`)

  // 5. Verificar si existe tag
  console.log('5️⃣  Verificando tags existentes...')
  try {
    execSync(`git tag -l v${packageJson.version}`, { stdio: 'pipe' })
    console.log(`✅ Tag v${packageJson.version} ya existe\n`)
  } catch (error) {
    console.log(`ℹ️  Tag v${packageJson.version} no existe (se creará)\n`)
  }

  console.log('🎉 ¡Todas las verificaciones pasaron exitosamente!')
  console.log('\n🚀 El script de release está listo para ejecutarse.')
  console.log('Ejecuta: npm run release')
} catch (error) {
  console.error(`❌ ERROR: ${error.message}`)
  process.exit(1)
}
