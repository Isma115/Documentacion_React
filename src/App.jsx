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

  // #region App Component Main Render
  return (
    <div className="app-container">
      <header className="top-bar">
        <div className="project-info">
          <span className="label">Proyecto:</span>
          <span className="path" title={data.root_path}>{data.root_path}</span>
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
            <Diagramas />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
// #endregion
