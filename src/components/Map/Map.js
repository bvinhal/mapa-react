import React, { useState, useEffect, useRef } from 'react'; 
import { MapContainer, TileLayer, useMap } from 'react-leaflet'; 
import L from 'leaflet'; 
import './Map.css'; 
import MultiStateLoader from './MultiStateLoader'; 
import DebugComponent from './DebugComponent';
import ElectoralDebugComponent from './ElectoralDebugComponent';
import { useElectoralData } from '../../hooks/useElectoralData'; 

// Corrigir ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl; 
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'), 
    iconUrl: require('leaflet/dist/images/marker-icon.png'), 
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'), 
}); 

// Componente para capturar a instância do mapa
const MapInstance = ({ onMapReady }) => {
    const map = useMap();
    
    useEffect(() => {
        if (map && onMapReady) {
            console.log('🗺️ Instância do mapa capturada via useMap:', map);
            onMapReady(map);
        }
    }, [map, onMapReady]);
    
    return null;
};

const Map = () => { 
    const mapRef = useRef(null);
    const [activeStates, setActiveStates] = useState(['go']); 
    const [loading, setLoading] = useState(false);
    const [multiLoader, setMultiLoader] = useState(null); 
    const [mapReady, setMapReady] = useState(false);
    const [dadosCarregados, setDadosCarregados] = useState(false);
    const [showDebug, setShowDebug] = useState(true);
    const [showElectoralDebug, setShowElectoralDebug] = useState(false);
    const [renderStats, setRenderStats] = useState({ totalMunicipios: 0, municipiosComDados: 0 });
    
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

    // Callback seguro para quando o mapa for criado
    const handleMapReady = (map) => {
        if (!map) {
            console.error('❌ Mapa não fornecido no callback');
            return;
        }

        console.log('🗺️ Instância do mapa recebida:', map);
        mapRef.current = map;
        
        // Verificar se o mapa já foi inicializado para evitar duplicação
        if (multiLoader) {
            console.log('⚠️ MultiStateLoader já inicializado, ignorando...');
            return;
        }
        
        // Adicionar evento de debug
        try {
            map.on('click', (e) => {
                console.log('🖱️ Clique no mapa:', e.latlng);
            });
        } catch (error) {
            console.warn('⚠️ Erro ao adicionar evento de clique:', error);
        }

        // Inicializar MultiStateLoader após obter a instância do mapa
        console.log('🔧 Inicializando MultiStateLoader...');
        const loader = new MultiStateLoader();
        const sucesso = loader.inicializar(map);
        
        if (sucesso) {
            setMultiLoader(loader);
            setMapReady(true);
            console.log('✅ MultiStateLoader inicializado com sucesso');
        } else {
            console.error('❌ Falha na inicialização do MultiStateLoader');
        }
    };

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
            console.log(`📊 Dados eleitorais carregados: ${electoralData.length} registros`);
            updateRender();
        }
    }, [dadosCarregados, electoralData, electoralLoading]);

    const loadBrazilData = async () => {
        try {
            setLoading(true);
            console.log('📍 Carregando dados do Brasil...');
            
            // Carregar dados do Brasil
            const dadosGeo = await multiLoader.carregarDadosBrasil();
            console.log('📊 Dados GeoJSON carregados:', dadosGeo);
            
            setDadosCarregados(true);
            
            // Renderizar estados ativos iniciais
            for (const estado of activeStates) {
                await multiLoader.mostrarEstado(estado, true);
                console.log(`✅ Estado ${estado.toUpperCase()} mostrado`);
            }
            
            // Renderizar com dados eleitorais se disponível
            await updateRender();
            
            console.log('✅ Carregamento inicial concluído');
        } catch (error) {
            console.error('❌ Erro ao carregar dados do Brasil:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateRender = async () => {
        if (!multiLoader) {
            console.warn('⚠️ MultiStateLoader não disponível para renderização');
            return;
        }
        
        try {
            console.log('🎨 Iniciando renderização com dados eleitorais...');
            console.log('📊 Dados eleitorais para renderização:', electoralData?.length || 0);
            const stats = await multiLoader.renderizarTodos(electoralData);
            setRenderStats(stats);
            console.log('📊 Estatísticas de renderização:', stats);
        } catch (error) {
            console.error('❌ Erro na renderização:', error);
        }
    };

    const handleStateToggle = async (stateCode) => {
        if (!multiLoader || loading || !dadosCarregados) {
            console.log('⚠️ Toggle bloqueado:', { multiLoader: !!multiLoader, loading, dadosCarregados });
            return;
        }
        
        const isActive = activeStates.includes(stateCode);
        
        try {
            setLoading(true);
            console.log(`🔄 Toggling estado ${stateCode.toUpperCase()}, ativo: ${isActive}`);
            
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
                const stats = await multiLoader.renderizarEstado(stateCode, electoralData);
                console.log(`🎨 Estado ${stateCode.toUpperCase()} renderizado:`, stats);
            }
            
            // Atualizar estatísticas gerais
            await updateRender();
            
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
            
            console.log('🚀 Selecionando todos os estados...');
            
            // Adicionar estados que não estão ativos
            for (const estado of todosEstados) {
                if (!activeStates.includes(estado)) {
                    await multiLoader.mostrarEstado(estado, true);
                    console.log(`➕ Adicionado: ${estado.toUpperCase()}`);
                }
            }
            
            setActiveStates(todosEstados);
            await updateRender();
            
            console.log('✅ Todos os estados selecionados');
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
            
            console.log('🧹 Removendo todos os estados...');
            
            // Remover todos os estados ativos
            for (const estado of activeStates) {
                await multiLoader.mostrarEstado(estado, false);
                console.log(`➖ Removido: ${estado.toUpperCase()}`);
            }
            
            setActiveStates([]);
            setRenderStats({ totalMunicipios: 0, municipiosComDados: 0 });
            
            console.log('✅ Todos os estados removidos');
        } catch (error) {
            console.error('❌ Erro ao limpar todos os estados:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusMessage = () => {
        if (!mapReady) return '🔄 Inicializando mapa...';
        if (!multiLoader) return '🔄 Preparando loader...';
        if (!dadosCarregados) return '📊 Carregando municípios do Brasil...';
        if (electoralLoading) return '📊 Carregando dados eleitorais...';
        if (loading) return '🎨 Atualizando visualização...';
        return '✅ Pronto!';
    };

    const toggleDebug = () => {
        setShowDebug(!showDebug);
    };

    const toggleElectoralDebug = () => {
        setShowElectoralDebug(!showElectoralDebug);
    };

    return (
        <div className="map-container">
            {loading && (
                <div className="map-loading">
                    <div className="loading-spinner"></div>
                    <p>Carregando dados do mapa...</p>
                    <small>{getStatusMessage()}</small>
                </div>
            )}
            
            <MapContainer
                center={[-15.7942, -47.8822]}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
                className="map"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapInstance onMapReady={handleMapReady} />
            </MapContainer>
            
            {/* Debug Components */}
            {showDebug && <DebugComponent />}
            {showElectoralDebug && (
                <ElectoralDebugComponent 
                    electoralData={electoralData}
                    geoData={multiLoader?.dadosBrasil}
                />
            )}
            
            {/* Controles dos Estados */}
            <div className="state-controls">
                <h4>🗺️ Estados do Brasil</h4>
                
                {/* Status */}
                <div className="status-info">
                    <small>{getStatusMessage()}</small>
                </div>

                {/* Toggle Debug */}
                <div style={{ marginBottom: '10px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    <button
                        onClick={toggleDebug}
                        style={{
                            padding: '5px 8px',
                            fontSize: '10px',
                            background: showDebug ? '#dc3545' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer'
                        }}
                    >
                        {showDebug ? '🐛 Geo' : '🐛 Geo'}
                    </button>
                    
                    <button
                        onClick={toggleElectoralDebug}
                        style={{
                            padding: '5px 8px',
                            fontSize: '10px',
                            background: showElectoralDebug ? '#dc3545' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer'
                        }}
                    >
                        {showElectoralDebug ? '📊 Ocultar' : '📊 Eleitorais'}
                    </button>
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
                            Municípios renderizados: {renderStats.totalMunicipios?.toLocaleString()}<br/>
                            Com dados eleitorais: {renderStats.municipiosComDados?.toLocaleString()}<br/>
                            Total no arquivo: {multiLoader.obterEstatisticas().totalMunicipios?.toLocaleString()}
                            {renderStats.municipiosComDados > 0 && (
                                <>
                                    <br/>
                                    <span style={{color: '#16a34a', fontWeight: 'bold'}}>
                                        Taxa de match: {((renderStats.municipiosComDados / renderStats.totalMunicipios) * 100).toFixed(1)}%
                                    </span>
                                </>
                            )}
                        </small>
                    </div>
                )}
                
                {/* Dados Eleitorais */}
                {electoralData && (
                    <div className="electoral-stats">
                        <small style={{color: '#16a34a'}}>
                            ✅ Dados eleitorais: {electoralData.length} registros
                            {electoralData.length > 0 && (
                                <>
                                    <br/>
                                    Códigos únicos: {new Set(electoralData.map(d => d.codigo_municipio)).size}
                                    <br/>
                                    Prefeitos eleitos: {electoralData.filter(d => d.eleito === true).length}
                                </>
                            )}
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

                {/* Debug Info */}
                {multiLoader && dadosCarregados && (
                    <div style={{ 
                        marginTop: '10px', 
                        padding: '8px', 
                        background: '#e3f2fd', 
                        borderRadius: '4px', 
                        fontSize: '10px' 
                    }}>
                        <strong>🔧 Debug Info:</strong>
                        <br/>
                        Mock data: {multiLoader.obterEstatisticas().usingMockData ? 'Sim' : 'Não'}
                        <br/>
                        Estados disponíveis: {multiLoader.estadosDisponiveis.length}
                        <br/>
                        Layer groups: {multiLoader.layerGroups.size}
                    </div>
                )}
            </div>
            
            {/* Legenda Atualizada por Ideologia */}
            <div className="info legend">
                <h4>Legenda por Ideologia Política</h4>
                <div className="legend-item">
                    <i style={{background: '#043267'}}></i> 
                    <span>Extrema-direita</span>
                </div>
                <div className="legend-item">
                    <i style={{background: '#2D09DB'}}></i> 
                    <span>Direita</span>
                </div>
                <div className="legend-item">
                    <i style={{background: '#0B5EDA'}}></i> 
                    <span>Centro-direita</span>
                </div>
                <div className="legend-item">
                    <i style={{background: '#f7dc6f'}}></i> 
                    <span>Centro</span>
                </div>
                <div className="legend-item">
                    <i style={{background: '#F94200'}}></i> 
                    <span>Centro-esquerda</span>
                </div>
                <div className="legend-item">
                    <i style={{background: '#C11000'}}></i> 
                    <span>Esquerda</span>
                </div>
                <div className="legend-item">
                    <i style={{background: '#6E0251'}}></i> 
                    <span>Extrema-esquerda</span>
                </div>
                <div className="legend-item">
                    <i style={{background: '#6b7280'}}></i> 
                    <span>Sem dados</span>
                </div>
                
                <div className="legend-note">
                    <small>As cores refletem a ideologia do partido do prefeito eleito</small>
                </div>
            </div>
        </div>
    );
};

export default Map;