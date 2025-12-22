// #region App React Imports and Styling
import { useState, useEffect } from 'react'
import './App.css'
// #endregion

// #region App Component Logic and State
function App() {
  const [data, setData] = useState({
    root_path: "Cargando...",
    stats: {},
    file_structure: ""
  })

  const [activeView, setActiveView] = useState('explorer')

  useEffect(() => {
    // Intentar leer PROJECT_DATA global
    const loadData = () => {
      if (window.PROJECT_DATA) {
        setData(window.PROJECT_DATA)
      }
    }

    loadData()
    // Polling corto por si carga después
    const interval = setInterval(loadData, 500)
    return () => clearInterval(interval)
  }, [])
// #endregion

  // #region App Component Main Render
  return (
    <div className="app-container">
      <header className="top-bar">
        <div className="logo">
          <span>📚</span> Docs Viewer
        </div>
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
            <div className="diagrams-view">
              <h1>Vista de Diagramas</h1>
              <p>Diagrama de los ficheros del proyecto seleccionado.</p>
              <div className="diagram-container">
                <p>El área de diagramas está vacía por el momento.</p>
                <p>Aquí se mostrará la representación gráfica de la estructura del proyecto.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
// #endregion

export default App

