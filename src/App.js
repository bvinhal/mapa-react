import React from 'react'; 
import Map from './components/Map/Map'; 
import './App.css'; 
function App() { 
    return ( <div className="App"> 
                <header className="App-header">
                    <div className="header-content">
                        <div className="header-brand">
                            <div className="brand-icon">
                                🏙️
                            </div>
                            <div className="brand-text">
                                <h1>Data Urbis</h1>
                                <p>Decisões Inteligentes para Cidades Mais Humanas</p>
                            </div>
                        </div>
                    </div>
                </header>
                <main className="App-main"> <Map /> 
                </main> 
              </div> ); 
} 
export default App;


