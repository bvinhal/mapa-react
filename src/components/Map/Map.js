import React, { useState, useEffect, useRef } from 'react'; 
import { MapContainer, TileLayer } from 'react-leaflet'; 
import L from 'leaflet'; 
import './Map.css'; 
import MultiStateLoader from './MultiStateLoader'; 
import { useElectoralData } from '../../hooks/useElectoralData'; 

// Corrigir ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl; 
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'), 
    iconUrl: require('leaflet/dist/images/marker-icon.png'), 
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'), 
}); 

const Map = () => { 
    const mapRef = useRef(null);
    const [activeStates, setActiveStates] = useState(['go']); 
    const [loading, setLoading] = useState(false); // Começar com false
    const [multiLoader, setMultiLoader] = useState(null); 
    const [mapReady, setMapReady] = useState(false);
    
    // Hook personalizado para dados eleitorais 
    const { electoralData, loading: electoralLoading, error: electoralError } = useElectoralData(); 

    // Inicializar o mapa e MultiStateLoader
    useEffect(() => {
        console.log('🗺️ Mapa montado, aguardando inicialização...');
        
        // Aguardar um pouco para garantir que o mapa está totalmente carregado
        const timer = setTimeout(() => {
            if (mapRef.current) {
                console.log('🔧 Inicializando MultiStateLoader...');
                const loader = new MultiStateLoader();
                loader.inicializar(mapRef.current);
                setMultiLoader(loader);
                setMapReady(true);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    // Carregar dados quando tudo estiver pronto
    useEffect(() => {
        if (mapReady && multiLoader && !electoralLoading && electoralData) {
            console.log('🚀 Todos os componentes prontos, carregando dados...');
            loadStatesData();
        }
    }, [mapReady, multiLoader, electoralLoading, electoralData]);

    const loadStatesData = async () => {
        try {
            console.log('📍 Iniciando carregamento dos estados:', activeStates);
            setLoading(true);
            
            // Carregar estados
            const sucessos = await multiLoader.carregarMultiplosEstados(activeStates);
            console.log(`📊 Estados carregados: ${sucessos}`);
            
            // Renderizar com dados eleitorais
            const stats = await multiLoader.renderizarTodos(electoralData);
            console.log('📈 Estatísticas de renderização:', stats);
            
            console.log('✅ Carregamento concluído com sucesso');
        } catch (error) {
            console.error('❌ Erro ao carregar dados dos estados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStateToggle = async (stateCode) => {
        if (!multiLoader || loading) return;
        
        const isActive = activeStates.includes(stateCode);
        
        if (isActive) {
            // Remover estado
            multiLoader.mostrarEstado(stateCode, false);
            setActiveStates(prev => prev.filter(s => s !== stateCode));
        } else {
            // Adicionar estado
            setActiveStates(prev => [...prev, stateCode]);
            
            try {
                setLoading(true);
                await multiLoader.carregarEstado(stateCode);
                await multiLoader.renderizarTodos(electoralData);
            } catch (error) {
                console.error(`Erro ao carregar ${stateCode}:`, error);
            } finally {
                setLoading(false);
            }
        }
    };

    // Callback para quando o mapa for criado
    const handleMapCreated = (map) => {
        console.log('🗺️ Instância do mapa criada:', map);
        mapRef.current = map;
    };

    return (
        <div className="map-container">
            {loading && (
                <div className="map-loading">
                    <div className="loading-spinner"></div>
                    <p>Carregando dados do mapa...</p>
                </div>
            )}
            
            <MapContainer
                center={[-15.7942, -47.8822]}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
                ref={handleMapCreated}
                className="map"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
            </MapContainer>
            
            {/* Controles dos Estados */}
            <div className="state-controls">
                <h4>🗺️ Estados Disponíveis</h4>
                
                {/* Status */}
                <div className="status-info">
                    <small>
                        {!mapReady && '🔄 Inicializando mapa...'}
                        {mapReady && !multiLoader && '🔄 Preparando loader...'}
                        {mapReady && multiLoader && electoralLoading && '📊 Carregando dados eleitorais...'}
                        {mapReady && multiLoader && !electoralLoading && !loading && '✅ Pronto!'}
                        {loading && '📍 Carregando municípios...'}
                    </small>
                </div>
                
                {['go', 'ac'].map(state => (
                    <button
                        key={state}
                        className={`state-button ${activeStates.includes(state) ? 'active' : ''}`}
                        onClick={() => handleStateToggle(state)}
                        disabled={!mapReady || !multiLoader || loading}
                        style={{
                            backgroundColor: activeStates.includes(state)
                                ? (multiLoader?.cores[state] || '#007bff')
                                : '#ccc',
                            opacity: (!mapReady || !multiLoader || loading) ? 0.5 : 1,
                            cursor: (!mapReady || !multiLoader || loading) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {state.toUpperCase()}
                    </button>
                ))}
                
                {/* Estatísticas */}
                {multiLoader && (
                    <div className="state-stats">
                        <small>
                            Estados: {multiLoader.obterEstatisticas().estadosCarregados}<br/>
                            Municípios: {multiLoader.obterEstatisticas().totalMunicipios}
                        </small>
                    </div>
                )}
                
                {/* Dados Eleitorais */}
                {electoralData && (
                    <div className="electoral-stats">
                        <small style={{color: 'green'}}>
                            ✅ Dados eleitorais: {electoralData.length} registros
                        </small>
                    </div>
                )}
                
                {/* Erros */}
                {electoralError && (
                    <div className="error-stats">
                        <small style={{color: 'red'}}>
                            ❌ Erro: {electoralError}
                        </small>
                    </div>
                )}
            </div>
            
            {/* Legenda */}
            <div className="info legend">
                <h4>Partidos Eleitos</h4>
                <i style={{background: '#ff0000'}}></i> Esquerda (PT, PSOL)<br/>
                <i style={{background: '#0000ff'}}></i> Centro (PSDB, CIDADANIA)<br/>
                <i style={{background: '#ff9800'}}></i> Centro-Direita (PL, PP)<br/>
                <i style={{background: '#4caf50'}}></i> Outros (MDB, PODE)<br/>
                <i style={{background: '#cccccc'}}></i> Sem dados
            </div>
        </div>
    );
};

export default Map;