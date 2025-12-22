import { useState, useEffect, useCallback, useRef } from 'react';

function Diagramas() {
    // #region Diagramas Component State and Init
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
    const [nextZIndex, setNextZIndex] = useState(1);
    const [nextFileId, setNextFileId] = useState(1);
    const [draggedItemType, setDraggedItemType] = useState(null);


    const addFileToCanvas = async (fileName, x, y) => {
        // Simulación de contenido para el parseo de estructura
        const placeholderCode = `// Contenido del archivo: ${fileName}\nfunction ${fileName.replace(/[^a-zA-Z]/g, '_')}() {\n  console.log("Cargado");\n}`;
        const items = extractStructure(placeholderCode);
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
        setDroppedFiles(prev => [...prev, newFile]);
    };

    const handleCanvasDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        setDraggedItemType(null);

        const canvasArea = e.currentTarget.classList.contains('canvas-area')
            ? e.currentTarget
            : e.currentTarget.closest('.canvas-area');

        const rect = canvasArea.getBoundingClientRect();
        const scrollLeft = canvasArea.scrollLeft;
        const scrollTop = canvasArea.scrollTop;

        const x = e.clientX - rect.left + scrollLeft;
        const y = e.clientY - rect.top + scrollTop;

        const rawData = e.dataTransfer.getData('text/plain');

        if (!rawData) return;

        try {
            const data = JSON.parse(rawData);

            if (data && data.type === 'existing-file') {
                const newX = x - data.offsetX;
                const newY = y - data.offsetY;

                setDroppedFiles(prev => {
                    const newFiles = prev.map(file => {
                        if (file.id === data.fileId) {
                            return {
                                ...file,
                                x: newX,
                                y: newY,
                                zIndex: nextZIndex
                            };
                        }
                        return file;
                    });
                    return newFiles;
                });
                setNextZIndex(prev => prev + 1);
            } else {
                addFileToCanvas(rawData, x, y);
            }
        } catch (err) {
            addFileToCanvas(rawData, x, y);
        }
    }, [nextZIndex, nextFileId, setDroppedFiles, setNextZIndex, setNextFileId]);

    const handleCanvasDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
        e.dataTransfer.dropEffect = draggedItemType === 'existing-file' ? 'move' : 'copy';
    };

    const handleCanvasDragLeave = (e) => {
        if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
            e.preventDefault();
            e.stopPropagation();
            setIsDragActive(false);
        }
    };

    const handleSuggestionDragStart = (e, fileName) => {
        setDraggedItemType('new-file');
        e.dataTransfer.setData('text/plain', fileName);
        e.dataTransfer.effectAllowed = 'copy';

        const dragGhost = document.createElement('div');
        dragGhost.textContent = fileName;
        dragGhost.style.position = 'absolute';
        dragGhost.style.top = '-1000px';
        dragGhost.style.padding = '8px 12px';
        dragGhost.style.background = '#007acc';
        dragGhost.style.color = 'white';
        dragGhost.style.borderRadius = '4px';
        document.body.appendChild(dragGhost);
        e.dataTransfer.setDragImage(dragGhost, 0, 0);

        setTimeout(() => {
            if (document.body.contains(dragGhost)) {
                document.body.removeChild(dragGhost);
            }
        }, 100);
    };

    const handleSuggestionDragEnd = (e) => {
        setDraggedItemType(null);
    };

    const handleFileBlockDragStart = (e, fileId) => {
        setDraggedItemType('existing-file');
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        const dragData = JSON.stringify({
            type: 'existing-file',
            fileId: fileId,
            offsetX: offsetX,
            offsetY: offsetY
        });
        e.dataTransfer.setData('text/plain', dragData);
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.style.opacity = '0.5';
    };

    const handleFileBlockDragEnd = (e) => {
        setDraggedItemType(null);
        e.currentTarget.style.opacity = '1';
    };

    const handleSuggestionMouseDown = (e) => {
        // Permitir el inicio del drag
    };

    const handleRemoveFile = (fileId) => {
        setDroppedFiles(prev => prev.filter(file => file.id !== fileId));
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
                    <div
                        className="dropped-files-canvas"
                        onDrop={handleCanvasDrop}
                        onDragOver={handleCanvasDragOver}
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
    // #endregion
}

export default Diagramas;

