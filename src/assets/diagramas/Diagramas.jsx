// #region Diagramas Imports
import { useState, useEffect, useCallback, useRef } from 'react';
// #endregion

// #region Diagramas Component State and Init
function Diagramas() {
    const [data, setData] = useState({
        root_path: "Cargando...",
        stats: {},
        file_structure: ""
    });

    const [droppedFiles, setDroppedFiles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const [projectFiles, setProjectFiles] = useState([]);
    const searchInputRef = useRef(null);

    useEffect(() => {
        const loadData = () => {
            if (window.PROJECT_DATA) {
                setData(window.PROJECT_DATA);

                const structureText = window.PROJECT_DATA.file_structure || '';
                const files = structureText
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.endsWith('/'))
                    .map(line => {
                        return line.replace(/^[│├└─├ ]+/g, '').trim();
                    })
                    .filter(Boolean);

                setProjectFiles(files);
            }
        };

        loadData();
        const interval = setInterval(loadData, 500);
        return () => clearInterval(interval);
    }, []);
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
    const extractStructure = (code) => {
        const lines = code.split('\n');
        const structure = [];
        const regexClass = /^\s*(export\s+)?(?:class|function)\s+(\w+)/;
        const regexFunc = /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/;
        const regexArrow = /^\s*(?:export\s+(?:const|let|var)\s+)?(\w+)\s*=.*=>/;

        lines.forEach((line) => {
            let match = line.match(regexClass);
            if (match) {
                structure.push(`class/func ${match[2]}`);
                return;
            }
            match = line.match(regexFunc);
            if (match) {
                structure.push(`function ${match[1]}`);
                return;
            }
            match = line.match(regexArrow);
            if (match) {
                structure.push(`arrow func ${match[1]}`);
            }
        });

        return structure.length > 0 ? structure : ['(Estructura no detectada o fichero vacío)'];
    };
    // #endregion

    // #region Diagramas Canvas Interaction Logic
    const addFileToCanvas = async (fileName) => {
        const placeholderCode = `// Contenido del archivo: ${fileName}\n// (En producción se cargaría el código real)\nfunction placeholder() {\n  console.log("Archivo cargado");\n}`;
        const items = extractStructure(placeholderCode);
        const lineCount = placeholderCode.split('\n').length;

        const newFile = {
            name: fileName,
            items,
            height: Math.max(200, lineCount * 5)
        };

        setDroppedFiles(prev => [...prev, newFile]);
    };

    const handleCanvasDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        const draggedText = e.dataTransfer.getData('text/plain');
        if (draggedText && projectFiles.includes(draggedText)) {
            addFileToCanvas(draggedText);
        }
    }, [projectFiles]);

    const handleCanvasDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const draggedText = e.dataTransfer.getData('text/plain');
        if (draggedText && projectFiles.includes(draggedText)) {
            setIsDragActive(true);
        }
    };

    const handleCanvasDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    };

    const handleSuggestionDragStart = (e, fileName) => {
        e.dataTransfer.setData('text/plain', fileName);
        e.dataTransfer.effectAllowed = 'copy';
        // Crear un elemento fantasma visible para mejor UX
        const dragGhost = document.createElement('div');
        dragGhost.textContent = fileName;
        dragGhost.style.position = 'absolute';
        dragGhost.style.top = '-1000px';
        dragGhost.style.padding = '8px 12px';
        dragGhost.style.background = 'var(--accent)';
        dragGhost.style.color = 'white';
        dragGhost.style.borderRadius = '4px';
        dragGhost.style.fontFamily = 'monospace';
        dragGhost.style.fontSize = '0.9rem';
        document.body.appendChild(dragGhost);
        e.dataTransfer.setDragImage(dragGhost, 0, 0);

        // Limpiar después de un pequeño delay
        setTimeout(() => {
            document.body.removeChild(dragGhost);
        }, 100);
    };

    const handleSuggestionMouseDown = (e) => {
        e.preventDefault(); // Evita que el input pierda el foco al hacer click
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
                <p className="search-hint">
                    Escribe para buscar un fichero. Arrastra una sugerencia al área de abajo para añadirlo al diagrama.
                </p>
            </div>

            <div
                className={`canvas-area ${isDragActive ? 'drag-active' : ''}`}
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
                    <div className="dropped-files-grid">
                        {droppedFiles.map((fileInfo, index) => (
                            <div
                                key={index}
                                className="file-block"
                                style={{ height: `${fileInfo.height}px` }}
                            >
                                <div className="file-block-header">{fileInfo.name}</div>
                                <ul className="structure-list">
                                    {fileInfo.items.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Diagramas;
// #endregion

