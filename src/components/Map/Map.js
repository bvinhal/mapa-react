import React, { useState, useEffect, useRef } from 'react'; 
import { MapContainer, TileLayer, useMap } from 'react-leaflet'; 
import L from 'leaflet'; 
import './Map.css'; 
import MultiStateLoader from './MultiStateLoader'; 
import { useElectoralData } from '../../hooks/useElectoralData'; 
import { useFiscalData } from '../../hooks/useFiscalData';

// Importações condicionais dos componentes de debug
const DebugComponent = React.lazy(() => import('./DebugComponent'));
const ElectoralDebugComponent = React.lazy(() => import('./ElectoralDebugComponent'));
const ProgressComponent = React.lazy(() => import('./ProgressComponent'));

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
    const [showDebug, setShowDebug] = useState(false);
    const [showElectoralDebug, setShowElectoralDebug] = useState(false);
    const [renderStats, setRenderStats] = useState({ totalMunicipios: 0, municipiosComDados: 0 });
    
    // Novo estado para controlar o modo de visualização
    const [viewMode, setViewMode] = useState('eleitoral'); // 'eleitoral' ou 'fiscal'
    
    // Estados para progresso de carregamento
    const [loadingProgress, setLoadingProgress] = useState(null);
    const [loadingStage, setLoadingStage] = useState('loading');
    const [loadingDetails, setLoadingDetails] = useState('');
    
    // Hook personalizado para dados eleitorais 
    const { electoralData, loading: electoralLoading, error: electoralError } = useElectoralData(); 
    
    // Hook personalizado para dados fiscais
    const { fiscalData, loading: fiscalLoading, error: fiscalError } = useFiscalData();

    // Lista de estados organizados por região
    const estadosPorRegiao = {
        'Centro-Oeste': [
            { code: 'go', name: 'Goiás' },
            { code: 'mt', name: 'Mato Grosso' },
            { code: 'ms', name: 'Mato Grosso do Sul' },
            { code: 'df', name: 'Distrito Federal' }
        ],
        'Nordeste': [
            { code: 'al', name: 'Alagoas' },
            { code: 'ba', name: 'Bahia' },
            { code: 'ce', name: 'Ceará' },
            { code: 'ma', name: 'Maranhão' },
            { code: 'pb', name: 'Paraíba' },
            { code: 'pe', name: 'Pernambuco' },
            { code: 'pi', name: 'Piauí' },
            { code: 'rn', name: 'Rio Grande do Norte' },
            { code: 'se', name: 'Sergipe' }
        ],
        'Norte': [
            { code: 'ac', name: 'Acre' },
            { code: 'am', name: 'Amazonas' },
            { code: 'ap', name: 'Amapá' },
            { code: 'pa', name: 'Pará' },
            { code: 'ro', name: 'Rondônia' },
            { code: 'rr', name: 'Roraima' },
            { code: 'to', name: 'Tocantins' }
        ],
        'Sudeste': [
            { code: 'es', name: 'Espírito Santo' },
            { code: 'mg', name: 'Minas Gerais' },
            { code: 'rj', name: 'Rio de Janeiro' },
            { code: 'sp', name: 'São Paulo' }
        ],
        'Sul': [
            { code: 'pr', name: 'Paraná' },
            { code: 'rs', name: 'Rio Grande do Sul' },
            { code: 'sc', name: 'Santa Catarina' }
        ]
    };

    // Obter todos os estados em ordem
    const todosEstados = Object.values(estadosPorRegiao).flat();

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

    // Atualizar renderização quando mudança de modo ou dados
    useEffect(() => {
        if (dadosCarregados && multiLoader) {
            console.log(`🎨 Atualizando renderização para modo: ${viewMode}`);
            
            if (viewMode === 'eleitoral' && !electoralLoading && electoralData) {
                console.log('📊 Renderizando com dados eleitorais...');
                console.log(`📊 Total de dados eleitorais: ${electoralData.length}`);
                renderActiveStates();
            } else if (viewMode === 'fiscal' && !fiscalLoading && fiscalData) {
                console.log('💰 Renderizando com dados fiscais...');
                console.log(`💰 Total de dados fiscais: ${fiscalData.length}`);
                renderActiveStates();
            }
        }
    }, [dadosCarregados, multiLoader, viewMode, electoralLoading, electoralData, fiscalLoading, fiscalData, activeStates]);

    const loadBrazilData = async () => {
        if (!multiLoader) {
            console.error('❌ MultiStateLoader não inicializado');
            return;
        }

        setLoading(true);
        setLoadingStage('loading');
        setLoadingDetails('Carregando dados geográficos do Brasil...');

        try {
            console.log('🌍 Iniciando carregamento dos dados do Brasil...');
            
            const progressCallback = (progress) => {
                setLoadingProgress(progress);
                setLoadingDetails(`Carregando: ${Math.round(progress)}%`);
            };

            const sucesso = await multiLoader.carregarDadosBrasil({
                onProgress: progressCallback
            });

            if (sucesso) {
                setDadosCarregados(true);
                setLoadingStage('success');
                console.log('✅ Dados do Brasil carregados com sucesso');
                
                // Renderizar estados ativos iniciais
                setTimeout(() => {
                    renderActiveStates();
                }, 100);
            } else {
                throw new Error('Falha no carregamento dos dados geográficos');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar dados do Brasil:', error);
            setLoadingStage('error');
            setLoadingDetails(`Erro: ${error.message}`);
        } finally {
            setLoading(false);
            setTimeout(() => {
                setLoadingProgress(null);
            }, 2000);
        }
    };

    const renderActiveStates = async () => {
        if (!multiLoader || !dadosCarregados) {
            console.warn('⚠️ Não é possível renderizar: loader ou dados não prontos');
            return;
        }

        setLoading(true);
        console.log(`🎨 Renderizando estados ativos no modo: ${viewMode}`);

        try {
            // Atualizar estados ativos no loader
            multiLoader.atualizarEstadosAtivos(activeStates);

            // Escolher dados baseado no modo
            let dadosParaRenderizar = null;
            if (viewMode === 'eleitoral' && electoralData) {
                dadosParaRenderizar = electoralData;
                console.log(`📊 Usando dados eleitorais: ${electoralData.length} registros`);
            } else if (viewMode === 'fiscal' && fiscalData) {
                dadosParaRenderizar = fiscalData;
                console.log(`💰 Usando dados fiscais: ${fiscalData.length} registros`);
            }

            // Renderizar com os dados apropriados
            const stats = await multiLoader.renderizarTodos(dadosParaRenderizar, viewMode);
            setRenderStats(stats);

            console.log(`✅ Estados renderizados com sucesso no modo ${viewMode}:`, stats);
        } catch (error) {
            console.error('❌ Erro ao renderizar estados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStateToggle = async (stateCode) => {
        if (loading || !dadosCarregados) return;

        const isActive = activeStates.includes(stateCode);
        let newActiveStates;

        if (isActive) {
            newActiveStates = activeStates.filter(code => code !== stateCode);
            if (multiLoader) {
                await multiLoader.mostrarEstado(stateCode, false);
            }
        } else {
            newActiveStates = [...activeStates, stateCode];
            if (multiLoader) {
                await multiLoader.mostrarEstado(stateCode, true);
                // Renderizar apenas este estado
                const dadosParaRenderizar = viewMode === 'eleitoral' ? electoralData : fiscalData;
                await multiLoader.renderizarEstado(stateCode, dadosParaRenderizar, viewMode);
            }
        }

        setActiveStates(newActiveStates);
        console.log(`🔄 Estado ${stateCode.toUpperCase()} ${isActive ? 'desativado' : 'ativado'}`);
    };

    const handleSelectAll = async () => {
        if (loading || !dadosCarregados) return;

        console.log('📍 Selecionando todos os estados...');
        const allStateCodes = todosEstados.map(estado => estado.code);
        setActiveStates(allStateCodes);

        if (multiLoader) {
            multiLoader.atualizarEstadosAtivos(allStateCodes);
            await renderActiveStates();
        }
    };

    const handleClearAll = async () => {
        if (loading || !dadosCarregados) return;

        console.log('🗑️ Limpando todos os estados...');
        setActiveStates([]);

        if (multiLoader) {
            multiLoader.atualizarEstadosAtivos([]);
            await multiLoader.renderizarTodos(null, viewMode);
        }

        setRenderStats({ totalMunicipios: 0, municipiosComDados: 0 });
    };

    // Função para alternar entre modos eleitoral e fiscal
    const handleViewModeChange = (mode) => {
        if (mode === viewMode || loading) return;
        
        console.log(`🔄 Alterando modo de visualização para: ${mode}`);
        setViewMode(mode);
    };

    const toggleDebug = () => {
        setShowDebug(!showDebug);
    };

    const toggleElectoralDebug = () => {
        setShowElectoralDebug(!showElectoralDebug);
    };

    const getStatusMessage = () => {
        if (loading) {
            return `⏳ Carregando${loadingDetails ? ': ' + loadingDetails : '...'}`;
        }
        
        if (!dadosCarregados) {
            return '🔄 Inicializando...';
        }

        const { totalMunicipios, municipiosComDados } = renderStats;
        const currentData = viewMode === 'eleitoral' ? electoralData : fiscalData;
        const isDataLoading = viewMode === 'eleitoral' ? electoralLoading : fiscalLoading;
        
        if (isDataLoading) {
            return `⏳ Carregando dados ${viewMode === 'eleitoral' ? 'eleitorais' : 'fiscais'}...`;
        }
        
        if (!currentData) {
            return `⚠️ Dados ${viewMode === 'eleitoral' ? 'eleitorais' : 'fiscais'} não disponíveis`;
        }

        if (totalMunicipios === 0) {
            return '📍 Selecione estados para visualizar';
        }

        const porcentagem = totalMunicipios > 0 ? Math.round((municipiosComDados / totalMunicipios) * 100) : 0;
        return `📊 ${totalMunicipios} municípios • ${municipiosComDados} com dados ${viewMode === 'eleitoral' ? 'eleitorais' : 'fiscais'} (${porcentagem}%)`;
    };

    // Função para renderizar a legenda
    const renderLegend = () => {
        if (!dadosCarregados) return null;

        if (viewMode === 'eleitoral') {
            return (
                <div className="map-legend">
                    <div className="legend-title">
                        📊 Legenda Eleitoral
                    </div>
                    <div className="legend-items">
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: '#4575b4' }}></div>
                            <span className="legend-label">Direita</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: '#74add1' }}></div>
                            <span className="legend-label">Centro-direita</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: '#fee08b' }}></div>
                            <span className="legend-label">Centro</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: '#f46d43' }}></div>
                            <span className="legend-label">Centro-esquerda</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: '#d73027' }}></div>
                            <span className="legend-label">Esquerda</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: '#6b7280' }}></div>
                            <span className="legend-label">Sem dados</span>
                        </div>
                    </div>
                    <div className="legend-note">
                        As cores refletem a ideologia do partido do prefeito eleito
                    </div>
                </div>
            );
        } else if (viewMode === 'fiscal') {
            return (
                <div className="map-legend">
                    <div className="legend-title">
                        💰 Legenda Fiscal
                    </div>
                    <div className="legend-items">
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: '#22c55e' }}></div>
                            <span className="legend-label">Excelente/Ótima</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: '#3b82f6' }}></div>
                            <span className="legend-label">Boa/Bom</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: '#eab308' }}></div>
                            <span className="legend-label">Regular</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: '#ef4444' }}></div>
                            <span className="legend-label">Ruim</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: '#8b5cf6' }}></div>
                            <span className="legend-label">Péssima</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: '#6b7280' }}></div>
                            <span className="legend-label">Sem dados</span>
                        </div>
                    </div>
                    <div className="legend-note">
                        As cores refletem a classificação fiscal dos municípios
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="map-container">
            <MapContainer
                center={[-15.7942, -47.8822]}
                zoom={5}
                style={{ height: '100vh', width: '100%' }}
                zoomControl={true}
                scrollWheelZoom={true}
                doubleClickZoom={true}
                touchZoom={true}
                dragging={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <MapInstance onMapReady={handleMapReady} />
            </MapContainer>

            {/* Painel de Controles */}
            <div className="map-controls">
                {/* Botões de Debug */}
                <div className="debug-controls">
                    <button
                        onClick={toggleDebug}
                        className={`debug-button ${showDebug ? 'active' : ''}`}
                        title="Debug Geográfico"
                    >
                        🗺️
                    </button>
                    
                    <button
                        onClick={toggleElectoralDebug}
                        className={`debug-button ${showElectoralDebug ? 'active' : ''}`}
                        title="Debug Eleitoral"
                    >
                        📊
                    </button>
                </div>
                
                {/* Controles dos Estados */}
                <div className="state-controls">
                    <h4>🗺️ Estados do Brasil</h4>
                    
                    {/* Botões de seleção de modo de visualização */}
                    <div className="view-mode-controls">
                        <button
                            className={`mode-button ${viewMode === 'eleitoral' ? 'active' : ''}`}
                            onClick={() => handleViewModeChange('eleitoral')}
                            disabled={loading}
                        >
                            📊 Eleitoral
                        </button>
                        <button
                            className={`mode-button ${viewMode === 'fiscal' ? 'active' : ''}`}
                            onClick={() => handleViewModeChange('fiscal')}
                            disabled={loading}
                        >
                            💰 Fiscal
                        </button>
                    </div>
                    
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
                    
                    {/* Grid de Estados por Região */}
                    {Object.entries(estadosPorRegiao).map(([regiao, estados]) => (
                        <div key={regiao} className="region-section">
                            <h5 className="region-title">{regiao}</h5>
                            <div className="states-grid">
                                {estados.map(estado => (
                                    <button
                                        key={estado.code}
                                        className={`state-button ${activeStates.includes(estado.code) ? 'active' : ''}`}
                                        onClick={() => handleStateToggle(estado.code)}
                                        disabled={!dadosCarregados || loading}
                                        title={estado.name}
                                    >
                                        {estado.code.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Componente de Progresso */}
            {loadingProgress !== null && (
                <React.Suspense fallback={<div>Carregando...</div>}>
                    <ProgressComponent 
                        progress={loadingProgress}
                        stage={loadingStage}
                        details={loadingDetails}
                    />
                </React.Suspense>
            )}

            {/* Componentes de Debug */}
            {showDebug && (
                <React.Suspense fallback={<div>Carregando debug...</div>}>
                    <DebugComponent 
                        multiLoader={multiLoader}
                        activeStates={activeStates}
                        renderStats={renderStats}
                    />
                </React.Suspense>
            )}

            {showElectoralDebug && (
                <React.Suspense fallback={<div>Carregando debug eleitoral...</div>}>
                    <ElectoralDebugComponent 
                        electoralData={electoralData}
                        fiscalData={fiscalData}
                        loading={viewMode === 'eleitoral' ? electoralLoading : fiscalLoading}
                        error={viewMode === 'eleitoral' ? electoralError : fiscalError}
                        viewMode={viewMode}
                    />
                </React.Suspense>
            )}

            {/* Legenda */}
            {renderLegend()}
        </div>
    );
};

export default Map;