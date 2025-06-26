import React from 'react'; 
import Map from './components/Map/Map'; 
import './App.css'; 
function App() { 
    return ( <div className="App"> 
                <header className="App-header"> 
                    <h1>Mapa Eleitoral-Fiscal do Brasil</h1> 
                    <p>Visualização integrada de dados eleitorais e fiscais</p> 
                </header> 
                <main className="App-main"> <Map /> 
                </main> 
              </div> ); 
} 
export default App;