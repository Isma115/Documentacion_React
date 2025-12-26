// #region Vite Configuration and Plugins
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

/**
 * Busca un archivo de forma recursiva en un directorio
 * @param {string} dir - Directorio base
 * @param {string} filename - Nombre del archivo a buscar
 * @param {number} maxDepth - Profundidad máxima de búsqueda
 * @returns {string|null} - Ruta completa del archivo o null
 */
function findFileRecursive(dir, filename, maxDepth = 5) {
  if (maxDepth <= 0) return null

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    // Primero buscar en el directorio actual
    for (const entry of entries) {
      if (entry.isFile() && entry.name === filename) {
        return path.join(dir, entry.name)
      }
    }

    // Luego buscar en subdirectorios (excepto node_modules y .git)
    for (const entry of entries) {
      if (entry.isDirectory() && !['node_modules', '.git', 'dist'].includes(entry.name)) {
        const found = findFileRecursive(path.join(dir, entry.name), filename, maxDepth - 1)
        if (found) return found
      }
    }
  } catch (error) {
    // Ignorar errores de lectura de directorio
  }

  return null
}

/**
 * Plugin personalizado para manejar la lectura de archivos del proyecto
 * Implementa el endpoint /read-file?path=<ruta_relativa>
 */
function fileReaderPlugin() {
  return {
    name: 'file-reader-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Solo manejar peticiones a /read-file
        if (!req.url?.startsWith('/read-file')) {
          return next()
        }

        try {
          // Extraer el path del query string
          const url = new URL(req.url, 'http://localhost')
          const filePath = url.searchParams.get('path')

          if (!filePath) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing path parameter' }))
            return
          }

          // Obtener la ruta raíz del proyecto
          const projectRoot = process.cwd()

          // Limpiar emojis del path (📄, 📂, etc.)
          const cleanFilePath = filePath.replace(/[\u{1F4C2}\u{1F4C4}]/gu, '').trim()

          let fullPath = null

          // Si el path es absoluto, usarlo directamente
          if (path.isAbsolute(cleanFilePath)) {
            fullPath = cleanFilePath
          } else {
            // Intentar varias ubicaciones posibles
            const possiblePaths = [
              path.join(projectRoot, 'src', cleanFilePath),
              path.join(projectRoot, cleanFilePath),
              path.join(projectRoot, 'src', 'assets', cleanFilePath),
              path.join(projectRoot, 'src', 'assets', 'diagramas', cleanFilePath),
              path.join(projectRoot, 'public', cleanFilePath),
            ]

            fullPath = possiblePaths.find(p => fs.existsSync(p))

            // Si no encontramos, buscar recursivamente por nombre de archivo
            if (!fullPath) {
              const filename = path.basename(cleanFilePath)
              console.log(`[file-reader-plugin] Buscando archivo recursivamente: ${filename}`)
              fullPath = findFileRecursive(path.join(projectRoot, 'src'), filename)

              // Si aún no lo encuentra, buscar desde la raíz del proyecto
              if (!fullPath) {
                fullPath = findFileRecursive(projectRoot, filename)
              }
            }
          }

          console.log(`[file-reader-plugin] Intentando leer: ${fullPath}`)

          // Verificar que el archivo existe
          if (!fullPath || !fs.existsSync(fullPath)) {
            console.error(`[file-reader-plugin] Archivo no encontrado: ${filePath}`)
            res.statusCode = 404
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              error: 'File not found',
              path: filePath,
              triedPath: fullPath
            }))
            return
          }

          // Leer el archivo
          const content = fs.readFileSync(fullPath, 'utf-8')
          console.log(`[file-reader-plugin] Archivo leído exitosamente: ${fullPath} (${content.length} caracteres)`)

          // Enviar el contenido
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(content)

        } catch (error) {
          console.error('[file-reader-plugin] Error:', error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            error: 'Internal server error',
            message: error.message
          }))
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), fileReaderPlugin()],
})
// #endregion
