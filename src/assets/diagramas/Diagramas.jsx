import { useState, useEffect, useCallback, useRef } from 'react';
import { analizarEstructuraCodigo } from './LecturaCodigo';

function Diagramas() {
    // #region Diagramas Component State and Init
    const [data, setData] = useState({
        root_path: "Cargando...",
        stats: {},
        file_structure: ""
    });

    const [projectFiles, setProjectFiles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [droppedFiles, setDroppedFiles] = useState([]);
    const [isDragActive, setIsDragActive] = useState(false);
    const [draggedSuggestion, setDraggedSuggestion] = useState(null);
    const [draggedFileId, setDraggedFileId] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);

    // Nuevos estados para drag-to-trash
    const [isDraggingToDelete, setIsDraggingToDelete] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);

    const searchInputRef = useRef(null);
    const trashRef = useRef(null); // Referencia al botón de basura

    // Función para guardar el estado en localStorage
    const saveDiagramsState = (files) => {
        try {
            const stateToSave = {
                droppedFiles: files.map(file => ({
                    id: file.id,
                    name: file.name,
                    items: file.items,
                    x: file.x,
                    y: file.y,
                    height: file.height,
                    zIndex: file.zIndex
                })),
                timestamp: new Date().toISOString(),
                version: "1.0"
            };
            localStorage.setItem('diagramsState', JSON.stringify(stateToSave));
            console.log('Estado de diagramas guardado:', stateToSave.droppedFiles.length, 'bloques');
        } catch (error) {
            console.error('Error al guardar el estado de diagramas:', error);
        }
    };

    // Función para cargar el estado desde localStorage
    const loadDiagramsState = () => {
        try {
            const savedState = localStorage.getItem('diagramsState');
            if (!savedState) return [];

            const parsed = JSON.parse(savedState);

            if (parsed.version !== "1.0" || !Array.isArray(parsed.droppedFiles)) {
                console.warn('Formato de estado guardado no compatible, se ignora');
                return [];
            }

            console.log('Estado de diagramas cargado:', parsed.droppedFiles.length, 'bloques');
            return parsed.droppedFiles;
        } catch (error) {
            console.error('Error al cargar el estado de diagramas:', error);
            return [];
        }
    };

    // Cargar datos del proyecto
    useEffect(() => {
        const loadData = () => {
            if (window.PROJECT_DATA) {
                setData(window.PROJECT_DATA);
            }
        };

        loadData();
        const interval = setInterval(loadData, 500);
        return () => clearInterval(interval);
    }, []);

    // Cargar configuración guardada al montar el componente
    useEffect(() => {
        const savedFiles = loadDiagramsState();
        if (savedFiles.length > 0) {
            const sorted = [...savedFiles].sort((a, b) => a.zIndex - b.zIndex);
            setDroppedFiles(sorted);

            const maxZ = savedFiles.reduce((max, f) => Math.max(max, f.zIndex || 0), 0);
            setNextZIndex(maxZ + 1);

            const maxId = savedFiles.reduce((max, f) => Math.max(max, f.id || 0), 0);
            setNextFileId(maxId + 1);
        }
    }, []);

    // Extraer archivos del proyecto
    useEffect(() => {
        if (data.file_structure) {
            const lines = data.file_structure.split('\n');
            const files = lines
                .filter(line => !line.includes('/') || (line.includes('/') && !line.trim().endsWith('/')))
                .map(line => line.replace(/[│├└─\s]/g, '').trim())
                .filter(file => file && file.length > 0 && !file.endsWith('/'));
            setProjectFiles(files);
        }
    }, [data.file_structure]);

    // Cerrar menú contextual al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (contextMenu && !e.target.closest('.context-menu')) {
                setContextMenu(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [contextMenu]);
// #endregion

    // #region Diagramas Similarity Helper Logic
    const getSimilarity = (a, b) => {
        const longer = a.length > b.length ? a : b;
        const shorter = a.length > b.length ? b : a;
        if (longer.length === 0) return 1.0;
        const distance = Array.from({ length: shorter.length + 1 }, () => Array(longer.length + 1).fill(null));
        for (let i = 0; i <= shorter.length; i++) distance[i][0] = i;
        for (let j = 0; j <= longer.length; j++) distance[0][j] = j;

        for (let i = 1; i <= shorter.length; i++) {
            for (let j = 1; j <= longer.length; j++) {
                const cost = shorter[i - 1].toLowerCase() === longer[j - 1].toLowerCase() ? 0 : 1;
                distance[i][j] = Math.min(
                    distance[i - 1][j] + 1,
                    distance[i][j - 1] + 1,
                    distance[i - 1][j - 1] + cost
                );
            }
        }
        return 1 - distance[shorter.length][longer.length] / longer.length;
    };
// #endregion

    // #region Diagramas Search Implementation
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSuggestions([]);
            setSelectedSuggestionIndex(-1);
            return;
        }

        const filtered = projectFiles
            .map(file => ({
                file,
                similarity: getSimilarity(searchQuery, file)
            }))
            .filter(item => item.similarity > 0.3)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 10)
            .map(item => item.file);

        setSuggestions(filtered);
        setSelectedSuggestionIndex(filtered.length > 0 ? 0 : -1);
    }, [searchQuery, projectFiles]);

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            if (suggestions.length > 0 && selectedSuggestionIndex >= 0) {
                setSearchQuery(suggestions[selectedSuggestionIndex]);
                setSuggestions([]);
                setSelectedSuggestionIndex(-1);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedSuggestionIndex(prev =>
                prev < suggestions.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        } else if (e.key === 'Escape') {
            setSuggestions([]);
            setSelectedSuggestionIndex(-1);
        }
    };
// #endregion

    // #region Diagramas Structure Parsing Helper Logic
    /**
     * Extrae la estructura de un archivo de código utilizando el módulo LecturaCodigo
     * Esta función ahora es un wrapper que usa el analizador robusto
     * que soporta múltiples lenguajes de programación
     */
    const extractStructure = (code, filename = 'file.js') => {
        try {
            // Validación básica
            if (!code || typeof code !== 'string') {
                console.warn('[extractStructure] Código inválido:', typeof code);
                return ['⚠️ Código vacío o inválido'];
            }

            if (code.trim().length === 0) {
                console.warn('[extractStructure] Código vacío');
                return ['⚠️ Archivo vacío'];
            }

            // Log para debug
            const preview = code.substring(0, 100).replace(/\n/g, '\\n');
            console.log(`[extractStructure] Analizando archivo: ${filename}, tamaño: ${code.length} caracteres, preview: "${preview}..."`);

            // Usar el analizador robusto de LecturaCodigo.jsx
            const estructura = analizarEstructuraCodigo(code, filename);

            // Si no se encontró estructura válida, retornar mensaje informativo
            if (!estructura || estructura.length === 0) {
                const lineas = code.split('\n').length;
                console.log(`[extractStructure] No se encontró estructura en ${filename}. Líneas: ${lineas}`);
                return [
                    `📄 ${filename}`,
                    `📊 ${lineas} líneas de código`,
                    '⚠️ Estructura no detectada'
                ];
            }

            console.log(`[extractStructure] Éxito: ${estructura.length} estructuras encontradas en ${filename}`);
            return estructura;

        } catch (error) {
            console.error('[extractStructure] Error inesperado:', error);
            return [
                '⚠️ Error al analizar el código',
                'Verifica que el archivo sea válido'
            ];
        }
    };
// #endregion

    // #region Diagramas Canvas State Definitions
    const [nextZIndex, setNextZIndex] = useState(1);
    const [nextFileId, setNextFileId] = useState(1);
    const [draggedItemType, setDraggedItemType] = useState(null);
// #endregion

    // #region Diagramas Context Menu Handlers
    const handleFunctionClick = (e, fileInfo, itemName) => {
        e.preventDefault();
        e.stopPropagation();

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            functionName: itemName,
            fileId: fileInfo.id
        });
    };

    const handleViewDocumentation = () => {
        console.log("Viendo documentación de:", contextMenu.functionName);
        setContextMenu(null);
    };

    const handleEditDocumentation = () => {
        console.log("Editando documentación de:", contextMenu.functionName);
        setContextMenu(null);
    };

    const handleDeleteDocumentation = () => {
        console.log("Borrando documentación de:", contextMenu.functionName);
        setContextMenu(null);
    };
// #endregion

    // #region Diagramas Deletion Handlers
    const requestDeleteFile = (fileId) => {
        const file = droppedFiles.find(f => f.id === fileId);
        if (file) {
            setFileToDelete(file);
            setShowDeleteConfirm(true);
        }
    };

    const confirmDeleteFile = () => {
        if (!fileToDelete) return;

        setDroppedFiles(prev => {
            const updated = prev.filter(f => f.id !== fileToDelete.id);
            saveDiagramsState(updated);
            return updated;
        });

        setShowDeleteConfirm(false);
        setFileToDelete(null);
        setIsDraggingToDelete(false);
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setFileToDelete(null);
        setIsDraggingToDelete(false);
    };
// #endregion

    // #region Diagramas Canvas Addition Logic
    const addFileToCanvas = async (fileName, x, y) => {
        try {
            console.log(`[addFileToCanvas] Intentando cargar: ${fileName}`);
            
            // Intentar cargar el contenido real del archivo
            const response = await fetch(`/read-file?path=${encodeURIComponent(fileName)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const content = await response.text();
            
            if (!content || content.trim().length === 0) {
                console.warn(`[addFileToCanvas] Archivo vacío: ${fileName}`);
            }
            
            console.log(`[addFileToCanvas] Contenido cargado: ${content.length} caracteres`);
            
            // Extraer estructura con el contenido real
            const items = extractStructure(content, fileName);
            const lineCount = items.length;

            const newFile = {
                id: nextFileId,
                name: fileName,
                items,
                height: Math.max(150, lineCount * 30 + 60),
                x: x || 20,
                y: y || 20,
                zIndex: nextZIndex
            };

            setNextFileId(prev => prev + 1);
            setNextZIndex(prev => prev + 1);

            setDroppedFiles(prev => {
                const updated = [...prev, newFile];
                saveDiagramsState(updated);
                return updated;
            });
            
            console.log(`[addFileToCanvas] Archivo añadido al canvas: ${fileName}`);
            
        } catch (error) {
            console.error(`[addFileToCanvas] Error al cargar archivo ${fileName}:`, error);
            
            // Como fallback, usar el placeholder anterior
            const placeholderCode = `// Contenido del archivo: ${fileName}\nfunction ${fileName.replace(/[^a-zA-Z]/g, '_')}() {\n  console.log("Cargado");\n}`;
            const items = extractStructure(placeholderCode);
            const lineCount = items.length;

            const newFile = {
                id: nextFileId,
                name: `${fileName} (error al cargar)`,
                items,
                height: Math.max(150, lineCount * 30 + 60),
                x: x || 20,
                y: y || 20,
                zIndex: nextZIndex
            };

            setNextFileId(prev => prev + 1);
            setNextZIndex(prev => prev + 1);

            setDroppedFiles(prev => {
                const updated = [...prev, newFile];
                saveDiagramsState(updated);
                return updated;
            });
            
            alert(`⚠️ No se pudo leer el archivo "${fileName}". Se usó contenido de ejemplo. Verifica la consola para más detalles.`);
        }
    };
// #endregion

    // #region Diagramas Drag and Drop Handlers
    const handleCanvasDrop = (e) => {
        e.preventDefault();
        setIsDragActive(false);
        setIsDraggingToDelete(false);

        // Verificar si se soltó cerca de la papelera
        if (draggedFileId !== null && trashRef.current) {
            const trashRect = trashRef.current.getBoundingClientRect();
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            // Área sensible: 80px alrededor del botón
            if (
                mouseX >= trashRect.left - 80 &&
                mouseX <= trashRect.right + 80 &&
                mouseY >= trashRect.top - 80 &&
                mouseY <= trashRect.bottom + 80
            ) {
                requestDeleteFile(draggedFileId);
                setDraggedFileId(null);
                return;
            }
        }

        // Comportamiento normal (mover en canvas o añadir nuevo)
        if (draggedSuggestion) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.max(0, e.clientX - rect.left - 150);
            const y = Math.max(0, e.clientY - rect.top - 50);

            console.log(`[handleCanvasDrop] Añadiendo sugerencia: ${draggedSuggestion} en (${x}, ${y})`);
            
            fetch(`/read-file?path=${encodeURIComponent(draggedSuggestion)}`)
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    return res.text();
                })
                .then(content => {
                    console.log(`[handleCanvasDrop] Contenido cargado: ${content.length} caracteres`);
                    const structure = extractStructure(content, draggedSuggestion);
                    const newFile = {
                        id: Date.now(),
                        name: draggedSuggestion,
                        items: structure,
                        x: x,
                        y: y,
                        height: Math.max(150, structure.length * 30 + 60),
                        zIndex: nextZIndex
                    };

                    setNextZIndex(prev => prev + 1);

                    setDroppedFiles(prev => {
                        const updated = [...prev, newFile];
                        saveDiagramsState(updated);
                        return updated;
                    });

                    setDraggedSuggestion(null);
                })
                .catch(err => {
                    console.error('[handleCanvasDrop] Error al leer el archivo:', err);
                    alert(`⚠️ No se pudo leer el archivo: ${err.message}`);
                    setDraggedSuggestion(null);
                });
        }
        else if (draggedFileId !== null) {
            const rect = e.currentTarget.getBoundingClientRect();
            const newX = Math.max(0, e.clientX - rect.left - 150);
            const newY = Math.max(0, e.clientY - rect.top - 50);

            console.log(`[handleCanvasDrop] Moviendo bloque ${draggedFileId} a (${newX}, ${newY})`);

            setDroppedFiles(prev => {
                const updated = prev.map(file =>
                    file.id === draggedFileId
                        ? { ...file, x: newX, y: newY }
                        : file
                );
                saveDiagramsState(updated);
                return updated;
            });

            setDraggedFileId(null);
        }
    };

    const handleCanvasDragOver = (e) => {
        e.preventDefault();
        setIsDragActive(true);

        // Solo activar modo delete si estamos arrastrando un bloque y estamos sobre la papelera
        if (draggedFileId !== null && trashRef.current) {
            const trashRect = trashRef.current.getBoundingClientRect();
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            // Verificar si el cursor está sobre la papelera
            const isOverTrash = (
                mouseX >= trashRect.left - 80 &&
                mouseX <= trashRect.right + 80 &&
                mouseY >= trashRect.top - 80 &&
                mouseY <= trashRect.bottom + 80
            );

            setIsDraggingToDelete(isOverTrash);
        } else {
            setIsDraggingToDelete(false);
        }
    };

    const handleCanvasDragLeave = (e) => {
        if (e.currentTarget === e.target) {
            setIsDragActive(false);
            setIsDraggingToDelete(false);
        }
    };
// #endregion

    // #region Diagramas Drag Source Handlers
    const handleSuggestionDragStart = (e, file) => {
        setDraggedSuggestion(file);
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleSuggestionDragEnd = () => {
        setDraggedSuggestion(null);
    };

    const handleSuggestionMouseDown = (e) => {
        e.stopPropagation();
    };

    const handleFileBlockDragStart = (e, fileId) => {
        setDraggedFileId(fileId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleFileBlockDragEnd = () => {
        setDraggedFileId(null);
        setIsDraggingToDelete(false);
    };
// #endregion

    // #region Diagramas Component Render
    return (
        <div className="diagrams-view">
            <div className="diagrams-header">
                <h1>Vista de Diagramas</h1>
            </div>
            <p>Diagrama de los ficheros del proyecto seleccionado.</p>

            <div className="file-search-container">
                <div className="search-row">
                    <div className="search-box-wrapper">
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="file-search-input"
                            placeholder="Buscar fichero del proyecto... (Tab para autocompletar)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        />
                        {isSearchFocused && suggestions.length > 0 && (
                            <ul className="suggestions-list">
                                {suggestions.map((file, index) => (
                                    <li
                                        key={index}
                                        className={`suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
                                        draggable="true"
                                        onDragStart={(e) => handleSuggestionDragStart(e, file)}
                                        onDragEnd={handleSuggestionDragEnd}
                                        onMouseDown={handleSuggestionMouseDown}
                                        onClick={() => {
                                            setSearchQuery(file);
                                            setSuggestions([]);
                                        }}
                                    >
                                        {file}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Zona de eliminación compacta → ahora a la derecha del buscador */}
                    <div
                        ref={trashRef}
                        className={`trash-zone-compact ${isDraggingToDelete ? 'trash-active' : ''}`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            // Cuando arrastramos sobre la papelera, activar el modo delete
                            if (draggedFileId !== null) {
                                setIsDraggingToDelete(true);
                            }
                        }}
                        onDragLeave={(e) => {
                            // Cuando salimos de la papelera, desactivar el modo delete
                            if (draggedFileId !== null) {
                                setIsDraggingToDelete(false);
                            }
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (draggedFileId !== null) {
                                requestDeleteFile(draggedFileId);
                                setDraggedFileId(null);
                                setIsDraggingToDelete(false);
                            }
                        }}
                        title="Suelta aquí para eliminar"
                    >
                        <span className="trash-icon-small">🗑</span>
                    </div>
                </div>

                <p className="search-hint">
                    Escribe para buscar un fichero. Arrastra una sugerencia al área de abajo para añadirlo al diagrama.
                </p>
            </div>

            {/* Área principal del canvas */}
            <div
                className={`canvas-area ${isDragActive ? 'drag-active' : ''} ${isDraggingToDelete ? 'delete-mode' : ''}`}
                onDrop={handleCanvasDrop}
                onDragOver={handleCanvasDragOver}
                onDragLeave={handleCanvasDragLeave}
            >
                {droppedFiles.length === 0 ? (
                    <div className="empty-canvas-message">
                        <p>El área de diagramas está vacía por el momento.</p>
                        <p>Busca un fichero arriba y arrástralo aquí para mostrar su estructura.</p>
                    </div>
                ) : (
                    <div
                        className="dropped-files-canvas"
                        style={{
                            position: 'relative',
                            width: `${Math.max(600, ...droppedFiles.map(f => f.x + 300)) + 300}px`,
                            height: `${Math.max(500, ...droppedFiles.map(f => f.y + f.height)) + 300}px`
                        }}
                    >
                        {droppedFiles.map((fileInfo) => (
                            <div
                                key={fileInfo.id}
                                className="file-block"
                                draggable="true"
                                onDragStart={(e) => handleFileBlockDragStart(e, fileInfo.id)}
                                onDragEnd={handleFileBlockDragEnd}
                                style={{
                                    height: `${fileInfo.height}px`,
                                    position: 'absolute',
                                    left: `${fileInfo.x}px`,
                                    top: `${fileInfo.y}px`,
                                    zIndex: fileInfo.zIndex || 1,
                                    margin: 0,
                                    cursor: 'move'
                                }}
                            >
                                <div className="file-block-header">{fileInfo.name}</div>
                                <ul className="structure-list">
                                    {fileInfo.items.map((item, i) => (
                                        <li
                                            key={i}
                                            onClick={(e) => handleFunctionClick(e, fileInfo, item)}
                                        >
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de confirmación de eliminación */}
            {showDeleteConfirm && fileToDelete && (
                <div className="delete-confirm-overlay">
                    <div className="delete-confirm-modal">
                        <h3>¿Eliminar este bloque?</h3>
                        <p>Archivo:</p>
                        <strong>{fileToDelete.name}</strong>
                        <p>Esta acción no se puede deshacer.</p>

                        <div className="delete-confirm-buttons">
                            <button
                                className="btn-cancel"
                                onClick={cancelDelete}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn-danger"
                                onClick={confirmDeleteFile}
                            >
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {contextMenu && (
                <div
                    className="context-menu"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'fixed',
                        left: `${contextMenu.x}px`,
                        top: `${contextMenu.y}px`,
                        zIndex: 10000
                    }}
                >
                    <div className="context-menu-header">
                        {contextMenu.functionName}
                    </div>
                    <div className="context-menu-item" onClick={(e) => { e.stopPropagation(); handleViewDocumentation(); }}>
                        <span className="context-menu-icon">👁️</span>
                        Ver Documentación
                    </div>
                    <div className="context-menu-item" onClick={(e) => { e.stopPropagation(); handleEditDocumentation(); }}>
                        <span className="context-menu-icon">✏️</span>
                        Editar Documentación
                    </div>
                    <div className="context-menu-item context-menu-item-danger" onClick={(e) => { e.stopPropagation(); handleDeleteDocumentation(); }}>
                        <span className="context-menu-icon">🗑️</span>
                        Borrar Documentación
                    </div>
                </div>
            )}
        </div>
    );
// #endregion
}

export default Diagramas;

