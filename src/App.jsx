// #region App React Imports and Styling
import { useState, useEffect } from 'react';
import Diagramas from './assets/diagramas/Diagramas.jsx';
import './assets/style/App.css';
// #endregion

// #region App Component Logic and State
function App() {
  const [data, setData] = useState({
    root_path: "Cargando...",
    stats: {},
    file_structure: ""
  });

  const [activeView, setActiveView] = useState('explorer');

  // Ya no se carga aquí la data porque ahora la carga el componente Diagramas por separado
  // (aunque en este caso el explorer sigue necesitando la data)
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
  // #endregion

  // #region App Project Selection Logic
  const [showProjectSelector, setShowProjectSelector] = useState(!data.root_path);
  const fileInputRef = useState(null)[0];
  const [fullDocs, setFullDocs] = useState([]);

  const handleProjectSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.directory = true;
    input.multiple = true;

    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      // Obtener el nombre del directorio raíz
      const firstPath = files[0].webkitRelativePath;
      const projectPath = firstPath.split('/')[0];

      // Escanear los archivos
      const scannedData = await scanFilesFromInput(files);
      setData({
        root_path: projectPath,
        file_structure: scannedData.structure.join('\n'),
        stats: scannedData.stats,
        files: scannedData.files,
        fileObjects: files
      });
      setShowProjectSelector(false);
    };

    input.click();
  };

  const handleDocsSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.directory = true;
    input.multiple = true;

    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      console.log("Cargando documentación completa:", files.length, "ficheros.");
      setFullDocs(files);
      // Si ya hay un proyecto cargado, simplemente cerramos el selector si estuviera abierto
      if (data.root_path !== "Cargando...") {
        setShowProjectSelector(false);
      }
    };

    input.click();
  };
  // #endregion

  // #region App File Scanning Logic
  const scanFilesFromInput = async (files) => {
    const structure = [];
    const filesList = [];
    const stats = {
      'Total Archivos': 0,
      'Archivos JavaScript': 0,
      'Archivos CSS': 0,
      'Archivos HTML': 0,
      'Otros Archivos': 0,
      'Directorios': 0
    };

    // Organizar archivos por directorios
    const tree = {};
    const directories = new Set();

    files.forEach(file => {
      const path = file.webkitRelativePath;
      const parts = path.split('/');

      // Contar directorios únicos
      for (let i = 1; i < parts.length; i++) {
        const dirPath = parts.slice(0, i).join('/');
        directories.add(dirPath);
      }

      let current = tree;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          // Es un archivo
          if (!current._files) current._files = [];
          current._files.push({ name: part, path: path });
        } else {
          // Es un directorio
          if (!current[part]) current[part] = {};
          current = current[part];
        }
      }
    });

    stats['Directorios'] = directories.size;

    // Construir la estructura visual
    const buildStructure = (node, prefix = '', isLast = true) => {
      const entries = Object.keys(node).filter(k => k !== '_files');
      const files = node._files || [];

      // Primero los directorios
      entries.forEach((dir, index) => {
        const isLastDir = index === entries.length - 1 && files.length === 0;
        const connector = isLastDir ? '└── ' : '├── ';
        structure.push(`${prefix}${connector}${dir}/`);

        const newPrefix = prefix + (isLastDir ? '    ' : '│   ');
        buildStructure(node[dir], newPrefix, isLastDir);
      });

      // Luego los archivos
      files.forEach((file, index) => {
        const isLastFile = index === files.length - 1;
        const connector = isLastFile ? '└── ' : '├── ';
        structure.push(`${prefix}${connector}${file.name}`);

        filesList.push(file.path);
        stats['Total Archivos']++;

        if (file.name.endsWith('.js') || file.name.endsWith('.jsx') || file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
          stats['Archivos JavaScript']++;
        } else if (file.name.endsWith('.css') || file.name.endsWith('.scss') || file.name.endsWith('.sass')) {
          stats['Archivos CSS']++;
        } else if (file.name.endsWith('.html')) {
          stats['Archivos HTML']++;
        } else {
          stats['Otros Archivos']++;
        }
      });
    };

    // Obtener el nombre del directorio raíz
    const rootName = files[0].webkitRelativePath.split('/')[0];
    structure.push(`${rootName}/`);
    buildStructure(tree[rootName] || tree, '', true);

    return {
      structure,
      files: filesList,
      stats
    };
  };

  // #endregion

  // #region App Visual Render
  return (
    <div className="app-container">
      {showProjectSelector ? (
        <div className="project-selector-overlay">
          <div className="project-selector-modal">
            <h1>Selecciona el Directorio del Proyecto</h1>
            <p>Haz clic en el botón de abajo para seleccionar la carpeta raíz de tu proyecto.</p>
            <div className="selector-buttons-group" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="select-project-btn" onClick={handleProjectSelect}>
                📁 Seleccionar Directorio
              </button>
              <button className="select-project-btn docs-btn" onClick={handleDocsSelect} title="Cargar documentación completa">
                📄 Cargar Documentación
              </button>
            </div>
            <p className="selector-hint">
              Compatible con todos los navegadores modernos (Chrome, Firefox, Safari, Brave, Edge)
            </p>
          </div>
        </div>
      ) : (
        <>
          <header className="top-bar">
            <div className="project-info">
              <span className="label">Proyecto:</span>
              <span className="path" title={data.root_path}>{data.root_path}</span>
              <button className="change-project-btn" onClick={handleProjectSelect} title="Cambiar directorio">
                📁
              </button>
              <button className="change-project-btn" onClick={handleDocsSelect} title="Cargar documentación completa">
                📄
              </button>
            </div>
          </header>

          <div className="main-content">
            <aside className="sidebar">
              <nav className="nav-menu">
                <div
                  className={`nav-item ${activeView === 'explorer' ? 'active' : ''}`}
                  onClick={() => setActiveView('explorer')}
                >
                  <span>📂</span> Explorador
                </div>
                <div
                  className={`nav-item ${activeView === 'diagrams' ? 'active' : ''}`}
                  onClick={() => setActiveView('diagrams')}
                >
                  <span>📊</span> Diagramas
                </div>
              </nav>
              <div className="file-tree">
                <pre>{data.file_structure || "No hay estructura disponible"}</pre>
              </div>
            </aside>

            <main className="content-area">
              {activeView === 'explorer' ? (
                <div className="welcome-screen">
                  <h1>Documentación del Proyecto</h1>
                  <p>Estadísticas generales.</p>

                  <div className="stats-grid">
                    {Object.entries(data.stats).map(([key, value]) => (
                      <div key={key} className="stat-card">
                        <h3>{key}</h3>
                        <div className="value">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Diagramas files={data.files || []} />
              )}
            </main>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
// #endregion
