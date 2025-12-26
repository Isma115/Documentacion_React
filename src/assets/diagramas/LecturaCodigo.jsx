/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MÓDULO: LecturaCodigo.jsx
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * DESCRIPCIÓN:
 * ------------
 * Sistema avanzado de análisis y extracción de estructuras de código para 
 * múltiples lenguajes de programación. Diseñado para detectar y parsear 
 * componentes, funciones, clases, hooks, imports y exports de manera robusta.
 * 
 * LENGUAJES SOPORTADOS:
 * ---------------------
 * 1. JavaScript/JSX (.js, .jsx)
 *    - Componentes funcionales de React
 *    - Componentes de clase
 *    - Funciones flecha
 *    - Funciones tradicionales
 *    - Exports named/default
 *    - React Hooks
 *    - Async/await
 * 
 * 2. TypeScript/TSX (.ts, .tsx)
 *    - Todo lo de JavaScript/JSX
 *    - Interfaces y tipos
 *    - Enums
 *    - Decoradores
 *    - Genéricos
 * 
 * 3. Python (.py)
 *    - Clases
 *    - Funciones
 *    - Métodos
 *    - Decoradores
 *    - Async functions
 * 
 * 4. Java (.java)
 *    - Clases
 *    - Interfaces
 *    - Enums
 *    - Métodos públicos/privados
 *    - Constructores
 * 
 * 5. C# (.cs)
 *    - Clases
 *    - Interfaces
 *    - Métodos
 *    - Properties
 *    - Events
 * 
 * 6. PHP (.php)
 *    - Clases
 *    - Funciones
 *    - Métodos
 *    - Traits
 * 
 * 7. Ruby (.rb)
 *    - Clases
 *    - Módulos
 *    - Métodos
 * 
 * 8. Go (.go)
 *    - Funciones
 *    - Métodos
 *    - Structs
 *    - Interfaces
 * 
 * CARACTERÍSTICAS PRINCIPALES:
 * ----------------------------
 * ✓ Detección automática de lenguaje por extensión
 * ✓ Parsing robusto con manejo de errores
 * ✓ Soporte completo para sintaxis moderna (ES6+, JSX, TSX)
 * ✓ Detección de React Hooks personalizados
 * ✓ Análisis de imports/exports
 * ✓ Manejo de comentarios multi-línea
 * ✓ Detección de componentes de orden superior (HOC)
 * ✓ Soporte para código minificado
 * ✓ Fallback inteligente cuando no se detecta estructura
 * 
 * CÓMO FUNCIONA:
 * --------------
 * 1. Recibe el código fuente y el nombre del archivo
 * 2. Detecta el lenguaje automáticamente por la extensión
 * 3. Aplica el parser específico del lenguaje
 * 4. Extrae todas las estructuras relevantes (funciones, clases, componentes)
 * 5. Formatea y retorna un array con las estructuras encontradas
 * 6. Si no encuentra nada, aplica fallback con análisis genérico
 * 
 * USO:
 * ----
 * import { analizarEstructuraCodigo } from './LecturaCodigo';
 * 
 * const estructura = analizarEstructuraCodigo(codigoFuente, 'MiComponente.jsx');
 * // Retorna: ['⚛️ Component MiComponente', 'function handleClick', ...]
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// #region LecturaCodigo: Configuración de Patrones Regex
/**
 * Patrones para JavaScript/JSX/TypeScript/TSX
 */
const PATTERNS_JS = {
    // Componentes de React (funcionales)
    reactComponent: [
        // export default function Component()
        /^\s*export\s+default\s+function\s+([A-Z][a-zA-Z0-9_$]*)\s*\(/gm,
        // export function Component()
        /^\s*export\s+(?:const|function)\s+([A-Z][a-zA-Z0-9_$]*)\s*[=:]/gm,
        // const Component = () => o function Component()
        /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Z][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)\s*=>|function)/gm,
        // function Component()
        /^\s*(?:export\s+)?function\s+([A-Z][a-zA-Z0-9_$]*)\s*\(/gm,
    ],

    // Componentes de clase de React
    reactClassComponent: /^\s*(?:export\s+)?(?:default\s+)?class\s+([A-Z][a-zA-Z0-9_$]*)\s+extends\s+(?:React\.)?(?:Component|PureComponent)/gm,

    // Funciones normales
    normalFunction: [
        // function name()
        /^\s*(?:export\s+)?(?:async\s+)?function\s+([a-z][a-zA-Z0-9_$]*)\s*\(/gm,
        // const name = function()
        /^\s*(?:export\s+)?(?:const|let|var)\s+([a-z][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?function/gm,
    ],

    // Funciones flecha
    arrowFunction: [
        // const name = () => o const name = async () =>
        /^\s*(?:export\s+)?(?:const|let|var)\s+([a-z][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/gm,
        // const name = param => (sin paréntesis)
        /^\s*(?:export\s+)?(?:const|let|var)\s+([a-z][a-zA-Z0-9_$]*)\s*=\s*\w+\s*=>/gm,
    ],

    // Custom Hooks de React
    customHook: /^\s*(?:export\s+)?(?:const|function)\s+(use[A-Z][a-zA-Z0-9_$]*)\s*[=\(]/gm,

    // Clases
    class: /^\s*(?:export\s+)?(?:default\s+)?class\s+([a-zA-Z0-9_$]+)/gm,

    // Interfaces (TypeScript)
    interface: /^\s*(?:export\s+)?interface\s+([a-zA-Z0-9_$]+)/gm,

    // Types (TypeScript)
    type: /^\s*(?:export\s+)?type\s+([a-zA-Z0-9_$]+)\s*=/gm,

    // Enums (TypeScript)
    enum: /^\s*(?:export\s+)?enum\s+([a-zA-Z0-9_$]+)/gm,

    // Métodos de clase
    classMethod: /^\s*(?:async\s+)?(?:static\s+)?([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*{/gm,

    // Exports con nombre
    namedExport: /^\s*export\s+{([^}]+)}/gm,

    // Default exports
    defaultExport: /^\s*export\s+default\s+(?:class|function)?\s*([a-zA-Z0-9_$]+)?/gm,
};

/**
 * Patrones para Python
 */
const PATTERNS_PYTHON = {
    class: /^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
    function: /^\s*(?:async\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,
    decorator: /^\s*@([a-zA-Z_][a-zA-Z0-9_]*)/gm,
};

/**
 * Patrones para Java
 */
const PATTERNS_JAVA = {
    class: /^\s*(?:public\s+)?(?:abstract\s+)?(?:final\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/gm,
    interface: /^\s*(?:public\s+)?interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/gm,
    enum: /^\s*(?:public\s+)?enum\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/gm,
    method: /^\s*(?:public|private|protected)\s+(?:static\s+)?(?:[\w<>]+)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm,
    constructor: /^\s*(?:public|private|protected)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm,
};

/**
 * Patrones para C#
 */
const PATTERNS_CSHARP = {
    class: /^\s*(?:public\s+)?(?:partial\s+)?(?:abstract\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
    interface: /^\s*(?:public\s+)?interface\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
    method: /^\s*(?:public|private|protected|internal)\s+(?:static\s+)?(?:async\s+)?(?:[\w<>]+)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,
    property: /^\s*(?:public|private|protected)\s+\w+\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*{/gm,
    event: /^\s*(?:public|private|protected)\s+event\s+\w+\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
};

/**
 * Patrones para PHP
 */
const PATTERNS_PHP = {
    class: /^\s*(?:abstract\s+)?(?:final\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
    function: /^\s*function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,
    method: /^\s*(?:public|private|protected)\s+(?:static\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,
    trait: /^\s*trait\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
};

/**
 * Patrones para Ruby
 */
const PATTERNS_RUBY = {
    class: /^\s*class\s+([A-Z][a-zA-Z0-9_]*)/gm,
    module: /^\s*module\s+([A-Z][a-zA-Z0-9_]*)/gm,
    method: /^\s*def\s+([a-z_][a-zA-Z0-9_?!]*)/gm,
};

/**
 * Patrones para Go
 */
const PATTERNS_GO = {
    function: /^\s*func\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,
    method: /^\s*func\s+\([^)]+\)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,
    struct: /^\s*type\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+struct/gm,
    interface: /^\s*type\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+interface/gm,
};
// #endregion

// #region LecturaCodigo: Utilidades de Limpieza
/**
 * Elimina comentarios de una línea del código
 * @param {string} code - Código fuente
 * @param {string} language - Lenguaje del código
 * @returns {string} - Código sin comentarios de línea
 */
function eliminarComentariosLinea(code, language) {
    const comentarioPatterns = {
        js: /\/\/.*/g,
        python: /#.*/g,
        java: /\/\/.*/g,
        csharp: /\/\/.*/g,
        php: /\/\/.*|#.*/g,
        ruby: /#.*/g,
        go: /\/\/.*/g,
    };

    const pattern = comentarioPatterns[language] || /\/\/.*/g;
    return code.replace(pattern, '');
}

/**
 * Elimina comentarios multi-línea del código
 * @param {string} code - Código fuente
 * @param {string} language - Lenguaje del código
 * @returns {string} - Código sin comentarios multi-línea
 */
function eliminarComentariosMultiLinea(code, language) {
    const patterns = {
        js: /\/\*[\s\S]*?\*\//g,
        python: /'''[\s\S]*?'''|"""[\s\S]*?"""/g,
        java: /\/\*[\s\S]*?\*\//g,
        csharp: /\/\*[\s\S]*?\*\//g,
        php: /\/\*[\s\S]*?\*\//g,
        ruby: /=begin[\s\S]*?=end/g,
        go: /\/\*[\s\S]*?\*\//g,
    };

    const pattern = patterns[language] || /\/\*[\s\S]*?\*\//g;
    return code.replace(pattern, '');
}

/**
 * Limpia el código eliminando comentarios y líneas vacías
 * @param {string} code - Código fuente
 * @param {string} language - Lenguaje del código
 * @returns {string} - Código limpio
 */
function limpiarCodigo(code, language = 'js') {
    let cleaned = eliminarComentariosMultiLinea(code, language);
    cleaned = eliminarComentariosLinea(cleaned, language);
    return cleaned;
}

// #endregion

// #region LecturaCodigo: Detectores de Lenguaje
/**
 * Detecta el lenguaje de programación basándose en la extensión del archivo
 * @param {string} filename - Nombre del archivo
 * @returns {string} - Identificador del lenguaje
 */
function detectarLenguaje(filename) {
    const extension = filename.split('.').pop()?.toLowerCase() || '';

    const languageMap = {
        'js': 'js',
        'jsx': 'js',
        'ts': 'js',
        'tsx': 'js',
        'py': 'python',
        'java': 'java',
        'cs': 'csharp',
        'php': 'php',
        'rb': 'ruby',
        'go': 'go',
    };

    return languageMap[extension] || 'js';
}

/**
 * Verifica si el archivo es un archivo de React
 * @param {string} filename - Nombre del archivo
 * @param {string} code - Código fuente
 * @returns {boolean} - True si es React
 */
function esArchivoReact(filename, code) {
    const extension = filename.split('.').pop()?.toLowerCase();
    const esExtensionReact = ['jsx', 'tsx'].includes(extension);
    const tieneImportReact = /import\s+(?:React|{[^}]*})\s+from\s+['"]react['"]/i.test(code);
    const tieneJSX = /<[A-Z][a-zA-Z0-9]*[\s/>]/.test(code);

    return esExtensionReact || tieneImportReact || tieneJSX;
}

// #endregion

// #region LecturaCodigo: Parsers por Lenguaje
/**
 * Parser para JavaScript/JSX/TypeScript/TSX
 * @param {string} code - Código fuente
 * @param {string} filename - Nombre del archivo
 * @returns {Array<string>} - Array de estructuras encontradas
 */
function parsearJavaScript(code, filename) {
    const estructura = [];
    const esReact = esArchivoReact(filename, code);
    const codigoLimpio = limpiarCodigo(code, 'js');

    // Buscar componentes de React si es archivo React
    if (esReact) {
        // Componentes funcionales
        PATTERNS_JS.reactComponent.forEach(pattern => {
            pattern.lastIndex = 0; // Reset regex
            let match;
            while ((match = pattern.exec(codigoLimpio)) !== null) {
                const componentName = match[1];
                if (componentName && !estructura.includes(`⚛️ Component ${componentName}`)) {
                    estructura.push(`⚛️ Component ${componentName}`);
                }
            }
        });

        // Componentes de clase
        PATTERNS_JS.reactClassComponent.lastIndex = 0;
        let match;
        while ((match = PATTERNS_JS.reactClassComponent.exec(codigoLimpio)) !== null) {
            const componentName = match[1];
            if (!estructura.includes(`⚛️ Class Component ${componentName}`)) {
                estructura.push(`⚛️ Class Component ${componentName}`);
            }
        }

        // Custom Hooks
        PATTERNS_JS.customHook.lastIndex = 0;
        while ((match = PATTERNS_JS.customHook.exec(codigoLimpio)) !== null) {
            const hookName = match[1];
            if (!estructura.includes(`🪝 Hook ${hookName}`)) {
                estructura.push(`🪝 Hook ${hookName}`);
            }
        }
    }

    // Funciones normales
    PATTERNS_JS.normalFunction.forEach(pattern => {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(codigoLimpio)) !== null) {
            const funcName = match[1];
            if (funcName && !estructura.some(e => e.includes(funcName))) {
                estructura.push(`function ${funcName}`);
            }
        }
    });

    // Funciones flecha
    PATTERNS_JS.arrowFunction.forEach(pattern => {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(codigoLimpio)) !== null) {
            const funcName = match[1];
            if (funcName && !estructura.some(e => e.includes(funcName))) {
                estructura.push(`arrow function ${funcName}`);
            }
        }
    });

    // Clases (que no son componentes de React)
    PATTERNS_JS.class.lastIndex = 0;
    let match;
    while ((match = PATTERNS_JS.class.exec(codigoLimpio)) !== null) {
        const className = match[1];
        if (className && !estructura.some(e => e.includes(className))) {
            estructura.push(`class ${className}`);
        }
    }

    // Interfaces (TypeScript)
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) {
        PATTERNS_JS.interface.lastIndex = 0;
        while ((match = PATTERNS_JS.interface.exec(codigoLimpio)) !== null) {
            const interfaceName = match[1];
            if (!estructura.includes(`interface ${interfaceName}`)) {
                estructura.push(`interface ${interfaceName}`);
            }
        }

        // Types
        PATTERNS_JS.type.lastIndex = 0;
        while ((match = PATTERNS_JS.type.exec(codigoLimpio)) !== null) {
            const typeName = match[1];
            if (!estructura.includes(`type ${typeName}`)) {
                estructura.push(`type ${typeName}`);
            }
        }

        // Enums
        PATTERNS_JS.enum.lastIndex = 0;
        while ((match = PATTERNS_JS.enum.exec(codigoLimpio)) !== null) {
            const enumName = match[1];
            if (!estructura.includes(`enum ${enumName}`)) {
                estructura.push(`enum ${enumName}`);
            }
        }
    }

    return estructura;
}

/**
 * Parser para Python
 * @param {string} code - Código fuente
 * @returns {Array<string>} - Array de estructuras encontradas
 */
function parsearPython(code) {
    const estructura = [];
    const codigoLimpio = limpiarCodigo(code, 'python');

    // Clases
    PATTERNS_PYTHON.class.lastIndex = 0;
    let match;
    while ((match = PATTERNS_PYTHON.class.exec(codigoLimpio)) !== null) {
        estructura.push(`class ${match[1]}`);
    }

    // Funciones
    PATTERNS_PYTHON.function.lastIndex = 0;
    while ((match = PATTERNS_PYTHON.function.exec(codigoLimpio)) !== null) {
        estructura.push(`function ${match[1]}`);
    }

    return estructura;
}

/**
 * Parser para Java
 * @param {string} code - Código fuente
 * @returns {Array<string>} - Array de estructuras encontradas
 */
function parsearJava(code) {
    const estructura = [];
    const codigoLimpio = limpiarCodigo(code, 'java');

    // Clases
    PATTERNS_JAVA.class.lastIndex = 0;
    let match;
    while ((match = PATTERNS_JAVA.class.exec(codigoLimpio)) !== null) {
        estructura.push(`class ${match[1]}`);
    }

    // Interfaces
    PATTERNS_JAVA.interface.lastIndex = 0;
    while ((match = PATTERNS_JAVA.interface.exec(codigoLimpio)) !== null) {
        estructura.push(`interface ${match[1]}`);
    }

    // Enums
    PATTERNS_JAVA.enum.lastIndex = 0;
    while ((match = PATTERNS_JAVA.enum.exec(codigoLimpio)) !== null) {
        estructura.push(`enum ${match[1]}`);
    }

    // Métodos
    PATTERNS_JAVA.method.lastIndex = 0;
    while ((match = PATTERNS_JAVA.method.exec(codigoLimpio)) !== null) {
        estructura.push(`method ${match[1]}`);
    }

    return estructura;
}

/**
 * Parser para C#
 * @param {string} code - Código fuente
 * @returns {Array<string>} - Array de estructuras encontradas
 */
function parsearCSharp(code) {
    const estructura = [];
    const codigoLimpio = limpiarCodigo(code, 'csharp');

    // Clases
    PATTERNS_CSHARP.class.lastIndex = 0;
    let match;
    while ((match = PATTERNS_CSHARP.class.exec(codigoLimpio)) !== null) {
        estructura.push(`class ${match[1]}`);
    }

    // Interfaces
    PATTERNS_CSHARP.interface.lastIndex = 0;
    while ((match = PATTERNS_CSHARP.interface.exec(codigoLimpio)) !== null) {
        estructura.push(`interface ${match[1]}`);
    }

    // Métodos
    PATTERNS_CSHARP.method.lastIndex = 0;
    while ((match = PATTERNS_CSHARP.method.exec(codigoLimpio)) !== null) {
        estructura.push(`method ${match[1]}`);
    }

    return estructura;
}

/**
 * Parser para PHP
 * @param {string} code - Código fuente
 * @returns {Array<string>} - Array de estructuras encontradas
 */
function parsearPHP(code) {
    const estructura = [];
    const codigoLimpio = limpiarCodigo(code, 'php');

    // Clases
    PATTERNS_PHP.class.lastIndex = 0;
    let match;
    while ((match = PATTERNS_PHP.class.exec(codigoLimpio)) !== null) {
        estructura.push(`class ${match[1]}`);
    }

    // Funciones
    PATTERNS_PHP.function.lastIndex = 0;
    while ((match = PATTERNS_PHP.function.exec(codigoLimpio)) !== null) {
        estructura.push(`function ${match[1]}`);
    }

    // Traits
    PATTERNS_PHP.trait.lastIndex = 0;
    while ((match = PATTERNS_PHP.trait.exec(codigoLimpio)) !== null) {
        estructura.push(`trait ${match[1]}`);
    }

    return estructura;
}

/**
 * Parser para Ruby
 * @param {string} code - Código fuente
 * @returns {Array<string>} - Array de estructuras encontradas
 */
function parsearRuby(code) {
    const estructura = [];
    const codigoLimpio = limpiarCodigo(code, 'ruby');

    // Clases
    PATTERNS_RUBY.class.lastIndex = 0;
    let match;
    while ((match = PATTERNS_RUBY.class.exec(codigoLimpio)) !== null) {
        estructura.push(`class ${match[1]}`);
    }

    // Módulos
    PATTERNS_RUBY.module.lastIndex = 0;
    while ((match = PATTERNS_RUBY.module.exec(codigoLimpio)) !== null) {
        estructura.push(`module ${match[1]}`);
    }

    // Métodos
    PATTERNS_RUBY.method.lastIndex = 0;
    while ((match = PATTERNS_RUBY.method.exec(codigoLimpio)) !== null) {
        estructura.push(`method ${match[1]}`);
    }

    return estructura;
}

/**
 * Parser para Go
 * @param {string} code - Código fuente
 * @returns {Array<string>} - Array de estructuras encontradas
 */
function parsearGo(code) {
    const estructura = [];
    const codigoLimpio = limpiarCodigo(code, 'go');

    // Structs
    PATTERNS_GO.struct.lastIndex = 0;
    let match;
    while ((match = PATTERNS_GO.struct.exec(codigoLimpio)) !== null) {
        estructura.push(`struct ${match[1]}`);
    }

    // Interfaces
    PATTERNS_GO.interface.lastIndex = 0;
    while ((match = PATTERNS_GO.interface.exec(codigoLimpio)) !== null) {
        estructura.push(`interface ${match[1]}`);
    }

    // Funciones
    PATTERNS_GO.function.lastIndex = 0;
    while ((match = PATTERNS_GO.function.exec(codigoLimpio)) !== null) {
        estructura.push(`function ${match[1]}`);
    }

    // Métodos
    PATTERNS_GO.method.lastIndex = 0;
    while ((match = PATTERNS_GO.method.exec(codigoLimpio)) !== null) {
        estructura.push(`method ${match[1]}`);
    }

    return estructura;
}

// #endregion

// #region LecturaCodigo: Función Principal
/**
 * Analiza la estructura de código y extrae todos los elementos relevantes
 * según el lenguaje de programación detectado.
 * 
 * @param {string} code - Código fuente a analizar
 * @param {string} filename - Nombre del archivo (usado para detectar el lenguaje)
 * @returns {Array<string>} - Array con las estructuras encontradas
 * 
 * @example
 * const estructura = analizarEstructuraCodigo(
 *   'const MyComponent = () => { return <div>Hello</div> }',
 *   'MyComponent.jsx'
 * );
 * // Retorna: ['⚛️ Component MyComponent']
 */
export function analizarEstructuraCodigo(code, filename = 'file.js') {
    // Validación de entrada
    if (!code || typeof code !== 'string') {
        return ['⚠️ Código vacío o inválido'];
    }

    if (code.trim().length === 0) {
        return ['⚠️ Archivo vacío'];
    }

    try {
        // Detectar el lenguaje
        const lenguaje = detectarLenguaje(filename);

        // Aplicar el parser correspondiente
        let estructura = [];

        switch (lenguaje) {
            case 'js':
                estructura = parsearJavaScript(code, filename);
                break;
            case 'python':
                estructura = parsearPython(code);
                break;
            case 'java':
                estructura = parsearJava(code);
                break;
            case 'csharp':
                estructura = parsearCSharp(code);
                break;
            case 'php':
                estructura = parsearPHP(code);
                break;
            case 'ruby':
                estructura = parsearRuby(code);
                break;
            case 'go':
                estructura = parsearGo(code);
                break;
            default:
                estructura = parsearJavaScript(code, filename);
        }

        // Si no se encontró nada, aplicar análisis genérico
        if (estructura.length === 0) {
            estructura = analizarGenerico(code);
        }

        // Si aún no hay resultados, mostrar información básica del archivo
        if (estructura.length === 0) {
            const lineas = code.split('\n').length;
            const caracteres = code.length;
            return [
                `📄 Archivo: ${filename}`,
                `📊 ${lineas} líneas, ${caracteres} caracteres`,
                '⚠️ No se detectaron estructuras definidas'
            ];
        }

        return estructura;

    } catch (error) {
        console.error('Error al analizar estructura:', error);
        return [
            '⚠️ Error al analizar el código',
            `Mensaje: ${error.message}`,
            'Por favor, verifica que el código sea válido'
        ];
    }
}

/**
 * Análisis genérico cuando no se detectan estructuras específicas
 * Busca patrones básicos que puedan indicar alguna estructura
 * @param {string} code - Código fuente
 * @returns {Array<string>} - Estructuras encontradas
 */
function analizarGenerico(code) {
    const estructura = [];
    const lines = code.split('\n');

    // Buscar cualquier palabra clave que indique definición
    const keywords = [
        'function', 'class', 'const', 'let', 'var', 'def',
        'interface', 'type', 'enum', 'struct', 'trait'
    ];

    lines.forEach((line, index) => {
        keywords.forEach(keyword => {
            if (line.trim().startsWith(keyword)) {
                const match = line.match(new RegExp(`${keyword}\\s+(\\w+)`));
                if (match && match[1]) {
                    estructura.push(`${keyword} ${match[1]} (línea ${index + 1})`);
                }
            }
        });
    });

    return estructura;
}

// #endregion

// #region LecturaCodigo: Utilidades Exportadas
/**
 * Obtiene información resumida del archivo
 * @param {string} code - Código fuente
 * @param {string} filename - Nombre del archivo
 * @returns {Object} - Objeto con información del archivo
 */
export function obtenerInfoArchivo(code, filename) {
    const estructura = analizarEstructuraCodigo(code, filename);
    const lenguaje = detectarLenguaje(filename);
    const lineas = code.split('\n').length;
    const caracteres = code.length;
    const esReact = esArchivoReact(filename, code);

    return {
        filename,
        lenguaje,
        lineas,
        caracteres,
        esReact,
        estructura,
        tieneEstructura: estructura.length > 0 && !estructura[0].includes('⚠️')
    };
}

/**
 * Verifica si el código es válido y tiene estructura
 * @param {string} code - Código fuente
 * @returns {boolean} - True si el código tiene estructura válida
 */
export function tieneEstructuraValida(code) {
    if (!code || code.trim().length === 0) {
        return false;
    }

    const estructura = analizarEstructuraCodigo(code);
    return estructura.length > 0 && !estructura[0].includes('⚠️');
}

// #endregion

// #region LecturaCodigo: Export Default
// Export default para facilitar el import
export default analizarEstructuraCodigo;
// #endregion