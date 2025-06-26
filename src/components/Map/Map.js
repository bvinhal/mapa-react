import React, { useState, useEffect } from 'react'; 
import { MapContainer, TileLayer } from 'react-leaflet'; 
import L from 'leaflet'; import './Map.css'; 
import MultiStateLoader from './MultiStateLoader'; 
import { useElectoralData } from '../../hooks/useElectoralData'; 
delete L.Icon.Default.prototype._getIconUrl; 
L.Icon.Default.mergeOptions({iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'), iconUrl: require('leaflet/dist/images/marker-icon.png'), shadowUrl: require('leaflet/dist/images/marker-shadow.png'), }); 
const Map = () => { const [map, setMap] = useState(null); 
const [activeStates, setActiveStates] = useState(['go', 'ac']); 
const [loading, setLoading] = useState(true); // Hook personalizado para dados eleitorais 
const { electoralData, loading: electoralLoading } = useElectoralData(); // MultiStateLoader integrado 
const [multiLoader, setMultiLoader] = useState(null); 

useEffect(() => { 
    if (map && !multiLoader) { 
        const loader = new MultiStateLoader(); 
        loader.inicializar(map); setMultiLoader(loader); 
    } 
}, [map, multiLoader]); 

useEffect(() => { 
    if (multiLoader && electoralData && !electoralLoading) { 
        loadStatesData(); 
    } 
}, [multiLoader, electoralData, electoralLoading]); 

const loadStatesData = async () => { 
    setLoading(true); 
    try { 
        await multiLoader.carregarMultiplosEstados(activeStates); 
        await multiLoader.renderizarTodos(electoralData); 
        setLoading(false);
    } catch (error) { 
        console.error('Erro ao carregar dados dos estados:', error); setLoading(false); 
    } 
}; 
const handleStateToggle = (stateCode) => { 
    if (multiLoader) { 
        const isActive = activeStates.includes(stateCode);
        multiLoader.mostrarEstado(stateCode, !isActive); 
        if (isActive) { 
            setActiveStates(prev => prev.filter(s => s !== stateCode)); 
        } else { 
            setActiveStates(prev => [...prev, stateCode]); 
        } 
    } 
}; 
return ( <div className="map-container"> 
        {loading && ( 
                    <div className="map-loading"> <div className="loading-spinner"></div> <p>Carregando mapa...</p> </div> )} 
                    <MapContainer center={[-15.7942, -47.8822]} zoom={5} style={{ height: '100%', width: '100%' }} whenCreated={setMap} className="map" > <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' /> </MapContainer> 
                    {/* Controles dos Estados */} 
                    <div className="state-controls"> <h4>🗺️ Estados Multi-GeoJSON</h4> {['go', 'ac'].map(state => ( <button key={state} className={`state-button ${activeStates.includes(state) ? 'active' : ''}`} onClick={() => handleStateToggle(state)} style={{ backgroundColor: multiLoader?.cores[state] || '#ccc' }} > {state.toUpperCase()} </button> ))} {multiLoader && ( <div className="state-stats"> <small> Estados: {multiLoader.obterEstatisticas().estadosCarregados}<br/> Municípios: {multiLoader.obterEstatisticas().totalMunicipios} </small> </div> )} </div> 
                    {/* Legenda */} 
                    <div className="info legend"> <h4>Partidos Eleitos</h4> <i style={{background: '#ff0000'}}></i> Esquerda (PT, PSOL)<br/> <i style={{background: '#0000ff'}}></i> Centro (PSDB, CIDADANIA)<br/> <i style={{background: '#ff9800'}}></i> Centro-Direita (PL, PP)<br/> <i style={{background: '#4caf50'}}></i> Outros (MDB, PODE)<br/> <i style={{background: '#cccccc'}}></i> Sem dados </div> 
        </div> ); 
}; export default Map;
