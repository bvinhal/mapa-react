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
    const [loading, setLoading] = useState(false);
    const [multiLoader, setMultiLoader] = useState(null); 
    const [mapReady, setMapReady] = useState(false);
    const [dadosCarregados, setDadosCarregados] = useState(false);
    
    // Hook personalizado para dados eleitorais 
    const { electoralData, loading: electoralLoading, error: electoralError } = useElectoralData(); 

    // Lista de estados disponíveis
    const estadosDisponiveis = [
        { code: 'go', name: 'Goiás' },
        { code: 'ac', name: 'Acre' },
        { code: 'sp', name: 'São Paulo' },
        { code: 'rj', name: 'Rio de Janeiro' },
        { code: 'mg', name: 'Minas Gerais' },
        { code: 'rs', name: 'Rio Grande do Sul' },
        { code: 'pr', name: 'Paraná' },
        { code: 'sc', name: 'Santa Catarina' },
        { code: 'ba', name: 'Bahia' },
        { code: 'pe', name: 'Pernambuco' },
        { code: 'ce', name: 'Ceará' },
        { code: 'pa', name: 'Pará' },
        { code: 'ma', name: 'Maranhão' },
        { code: 'pb', name: 'Paraíba' },
        { code: 'es', name: 'Espírito Santo' },
        { code: 'pi', name: 'Piauí' },
        { code: 'al', name: 'Alagoas' },
        { code: 'rn', name: 'Rio Grande do Norte' },
        { code: 'mt', name: 'Mato Grosso' },
        { code: 'ms', name: 'Mato Grosso do Sul' },
        { code: 'df', name: 'Distrito Federal' },
        { code: 'se', name: 'Sergipe' },
        { code: 'am', name: 'Amazonas' },
        { code: 'ro', name: 'Rondônia' },
        { code: 'to', name: 'Tocantins' },
        { code: 'ap', name: 'Amapá' },
        { code: 'rr', name: 'Roraima' }
    ];

    // Inicializar o mapa e MultiStateLoader
    useEffect(() => {
        console.log('🗺️ Mapa montado, aguardando inicialização...');
        
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

    // Carregar dados iniciais do Brasil
    useEffect(() => {
        if (mapReady && multiLoader && !dadosCarregados) {
            console.log('🚀 Carregando dados do Brasil...');
            loadBrazilData();
        }
    }, [mapReady, multiLoader, dadosCarregados]);

    // Renderizar estados ativos quando dados eleitorais mudarem
    useEffect(() => {
        if (dadosCarregados && multiLoader && !electoralLoading && electoralData) {
            console.log('🎨 Atualizando renderização com dados eleitorais...');
            multiLoader.renderizarTodos(electoralData);
        }
    }, [dadosCarregados, electoralData, electoralLoading]);

    const loadBrazilData = async () => {
        try {
            setLoading(true);
            console.log('📍 Carregando dados do Brasil...');
            
            // Carregar dados do Brasil
            await multiLoader.carregarDadosBrasil();
            setDadosCarregados(true);
            
            // Renderizar estados ativos iniciais
            for (const estado of activeStates) {
                await multiLoader.mostrarEstado(estado, true);
            }
            
            // Renderizar com dados eleitorais se disponível
            if (electoralData) {
                await multiLoader.renderizarTodos(electoralData);
            }
            
            console.log('✅ Carregamento inicial concluído');
        } catch (error) {
            console.error('❌ Erro ao carregar dados do Brasil:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStateToggle = async (stateCode) => {
        if (!multiLoader || loading || !dadosCarregados) return;
        
        const isActive = activeStates.includes(stateCode);
        
        try {
            setLoading(true);
            
            if (isActive) {
                // Remover estado
                await multiLoader.mostrarEstado(stateCode, false);
                setActiveStates(prev => prev.filter(s => s !== stateCode));
                console.log(`➖ Estado ${stateCode.toUpperCase()} removido`);
            } else {
                // Adicionar estado
                await multiLoader.mostrarEstado(stateCode, true);
                setActiveStates(prev => [...prev, stateCode]);
                console.log(`➕ Estado ${stateCode.toUpperCase()} adicionado`);
                
                // Renderizar o estado com dados eleitorais
                await multiLoader.renderizarEstado(stateCode, electoralData);
            }
            
        } catch (error) {
            console.error(`❌ Erro ao alternar ${stateCode}:`, error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = async () => {
        if (!dadosCarregados || loading) return;
        
        try {
            setLoading(true);
            const todosEstados = estadosDisponiveis.map(e => e.code);
            
            // Adicionar estados que não estão ativos
            for (const estado of todosEstados) {
                if (!activeStates.includes(estado)) {
                    await multiLoader.mostrarEstado(estado, true);
                }
            }
            
            setActiveStates(todosEstados);
            await multiLoader.renderizarTodos(electoralData);
            
        } catch (error) {
            console.error('❌ Erro ao selecionar todos os estados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearAll = async () => {
        if (!dadosCarregados || loading || activeStates.length === 0) return;
        
        try {
            setLoading(true);
            
            // Remover todos os estados ativos
            for (const estado of activeStates) {
                await multiLoader.mostrarEstado(estado, false);
            }
            
            setActiveStates([]);
            
        } catch (error) {
            console.error('❌ Erro ao limpar todos os estados:', error);
        } finally {
            setLoading(false);
        }
    };

    // Callback para quando o mapa for criado
    const handleMapCreated = (map) => {
        console.log('🗺️ Instância do mapa criada:', map);
        mapRef.current = map;
    };

    const getStatusMessage = () => {
        if (!mapReady) return '🔄 Inicializando mapa...';
        if (!multiLoader) return '🔄 Preparando loader...';
        if (!dadosCarregados) return '📊 Carregando municípios do Brasil...';
        if (electoralLoading) return '📊 Carregando dados eleitorais...';
        if (loading) return '🎨 Atualizando visualização...';
        return '✅ Pronto!';
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
                <h4>🗺️ Estados do Brasil</h4>
                
                {/* Status */}
                <div className="status-info">
                    <small>{getStatusMessage()}</small>
                </div>

                {/* Controles de ação */}
                <div className="action-controls">
                    <button
                        className="action-button select-all"
                        onClick={handleSelectAll}
                        disabled={!dadosCarregados || loading}
                    >
                        Todos
                    </button>
                    <button
                        className="action-button clear-all"
                        onClick={handleClearAll}
                        disabled={!dadosCarregados || loading || activeStates.length === 0}
                    >
                        Limpar
                    </button>
                </div>
                
                {/* Grid de Estados */}
                <div className="states-grid">
                    {estadosDisponiveis.map(estado => (
                        <button
                            key={estado.code}
                            className={`state-button ${activeStates.includes(estado.code) ? 'active' : ''}`}
                            onClick={() => handleStateToggle(estado.code)}
                            disabled={!dadosCarregados || loading}
                            style={{
                                backgroundColor: activeStates.includes(estado.code)
                                    ? (multiLoader?.cores[estado.code] || '#007bff')
                                    : '#e2e8f0',
                                color: activeStates.includes(estado.code) ? 'white' : '#64748b',
                                opacity: (!dadosCarregados || loading) ? 0.5 : 1,
                                cursor: (!dadosCarregados || loading) ? 'not-allowed' : 'pointer'
                            }}
                            title={estado.name}
                        >
                            {estado.code.toUpperCase()}
                        </button>
                    ))}
                </div>
                
                {/* Estatísticas */}
                {multiLoader && dadosCarregados && (
                    <div className="state-stats">
                        <small>
                            Estados ativos: {activeStates.length}<br/>
                            Total municípios: {multiLoader.obterEstatisticas().totalMunicipios?.toLocaleString()}
                        </small>
                    </div>
                )}
                
                {/* Dados Eleitorais */}
                {electoralData && (
                    <div className="electoral-stats">
                        <small style={{color: '#16a34a'}}>
                            ✅ Dados eleitorais: {electoralData.length} registros
                        </small>
                    </div>
                )}
                
                {/* Erros */}
                {electoralError && (
                    <div className="error-stats">
                        <small style={{color: '#dc2626'}}>
                            ❌ Erro: {electoralError}
                        </small>
                    </div>
                )}
            </div>
            
            {/* Legenda */}
            <div className="info legend">
                <h4>Legenda Política</h4>
                <div className="legend-item">
                    <i style={{background: '#dc2626'}}></i> 
                    <span>Esquerda</span>
                    <small>(PT, PSOL, PSB, PDT)</small>
                </div>
                <div className="legend-item">
                    <i style={{background: '#2563eb'}}></i> 
                    <span>Centro</span>
                    <small>(PSDB, PODE, AVANTE)</small>
                </div>
                <div className="legend-item">
                    <i style={{background: '#ea580c'}}></i> 
                    <span>Centro-Direita</span>
                    <small>(PL, PP, UNIÃO, MDB)</small>
                </div>
                <div className="legend-item">
                    <i style={{background: '#c2410c'}}></i> 
                    <span>Direita</span>
                    <small>(NOVO, DC)</small>
                </div>
                <div className="legend-item">
                    <i style={{background: '#7c3aed'}}></i> 
                    <span>Outros</span>
                    <small>(AGIR, MOBILIZA)</small>
                </div>
                <div className="legend-item">
                    <i style={{background: '#94a3b8'}}></i> 
                    <span>Sem dados</span>
                    <small></small>
                </div>
                
                <div className="legend-note">
                    <small>Clique nos municípios para ver detalhes</small>
                </div>
            </div>
        </div>
    );
};

export default Map;