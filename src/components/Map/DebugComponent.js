import React, { useState, useEffect } from 'react';

const DebugComponent = () => {
    const [debug, setDebug] = useState({
        fileExists: false,
        fileSize: 0,
        featuresCount: 0,
        sampleFeature: null,
        error: null,
        loading: true,
        foundPath: null
    });

    useEffect(() => {
        checkGeoJSONFile();
    }, []);

    const checkGeoJSONFile = async () => {
        console.log('🔍 Iniciando verificação do arquivo GeoJSON...');
        
        const paths = [
            '/data/geo/brazil-municipalities.geojson',
            './data/geo/brazil-municipalities.geojson',
            'data/geo/brazil-municipalities.geojson',
            '/public/data/geo/brazil-municipalities.geojson',
            'public/data/geo/brazil-municipalities.geojson'
        ];

        setDebug(prev => ({ ...prev, loading: true }));

        for (const path of paths) {
            try {
                console.log(`📁 Testando caminho: ${path}`);
                const response = await fetch(path);
                
                if (response.ok) {
                    console.log(`✅ Arquivo encontrado em: ${path}`);
                    
                    const contentLength = response.headers.get('content-length');
                    const data = await response.json();
                    console.log('📊 Dados carregados:', {
                        type: data.type,
                        features: data.features?.length,
                        firstFeature: data.features?.[0]
                    });
                    
                    setDebug({
                        fileExists: true,
                        fileSize: contentLength ? parseInt(contentLength) : JSON.stringify(data).length,
                        featuresCount: data.features?.length || 0,
                        sampleFeature: data.features?.[0] || null,
                        error: null,
                        loading: false,
                        foundPath: path
                    });
                    return;
                } else {
                    console.log(`❌ ${path}: ${response.status} ${response.statusText}`);
                }
            } catch (error) {
                console.log(`❌ Erro em ${path}:`, error.message);
            }
        }

        setDebug({
            fileExists: false,
            fileSize: 0,
            featuresCount: 0,
            sampleFeature: null,
            error: 'Arquivo não encontrado em nenhum dos caminhos testados',
            loading: false,
            foundPath: null
        });
    };

    const analyzeFields = () => {
        if (!debug.sampleFeature?.properties) return null;

        const props = debug.sampleFeature.properties;
        const possibleStateFields = ['SIGLA_UF', 'UF', 'state', 'estado', 'STATE', 'ESTADO'];
        const possibleCodeFields = ['CD_GEOCMU', 'GEOCODIGO', 'id', 'code', 'ID', 'CODE'];
        const possibleNameFields = ['NM_MUNICIP', 'NOME', 'name', 'NAME', 'nome'];

        const stateField = possibleStateFields.find(field => field in props);
        const codeField = possibleCodeFields.find(field => field in props);
        const nameField = possibleNameFields.find(field => field in props);

        return { stateField, codeField, nameField };
    };

    const fieldAnalysis = debug.sampleFeature ? analyzeFields() : null;

    if (debug.loading) {
        return (
            <div style={{
                position: 'fixed',
                top: '10px',
                right: '10px',
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 10000,
                maxWidth: '400px',
                fontFamily: 'monospace',
                fontSize: '12px'
            }}>
                <h3>🔍 Debug GeoJSON</h3>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px' 
                }}>
                    <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid #f3f3f3',
                        borderTop: '2px solid #3498db',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <span>Verificando arquivo...</span>
                </div>
                <style>
                    {`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}
                </style>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 10000,
            maxWidth: '450px',
            fontFamily: 'monospace',
            fontSize: '12px',
            maxHeight: '80vh',
            overflow: 'auto'
        }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>🔍 Debug GeoJSON</h3>
            
            <div style={{ 
                marginBottom: '15px',
                padding: '10px',
                borderRadius: '4px',
                background: debug.fileExists ? '#d4edda' : '#f8d7da',
                border: `1px solid ${debug.fileExists ? '#c3e6cb' : '#f5c6cb'}`
            }}>
                <strong>Status do Arquivo:</strong>
                <br />
                {debug.fileExists ? (
                    <span style={{ color: '#155724' }}>✅ Arquivo encontrado e carregado</span>
                ) : (
                    <span style={{ color: '#721c24' }}>❌ Arquivo não encontrado</span>
                )}
            </div>

            {debug.foundPath && (
                <div style={{ marginBottom: '15px' }}>
                    <strong>📁 Caminho utilizado:</strong>
                    <br />
                    <code style={{ 
                        background: '#f8f9fa', 
                        padding: '2px 4px', 
                        borderRadius: '3px',
                        wordBreak: 'break-all' 
                    }}>
                        {debug.foundPath}
                    </code>
                </div>
            )}

            {debug.fileExists && (
                <>
                    <div style={{ 
                        marginBottom: '15px',
                        padding: '10px',
                        background: '#f8f9fa',
                        borderRadius: '4px'
                    }}>
                        <strong>📊 Informações do arquivo:</strong>
                        <br />
                        <div style={{ marginTop: '8px' }}>
                            <div>📦 <strong>Tamanho:</strong> {(debug.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                            <div>🏛️ <strong>Municípios:</strong> {debug.featuresCount.toLocaleString()}</div>
                        </div>
                    </div>

                    {fieldAnalysis && (
                        <div style={{ 
                            marginBottom: '15px',
                            padding: '10px',
                            background: '#e3f2fd',
                            borderRadius: '4px'
                        }}>
                            <strong>🔍 Análise dos campos:</strong>
                            <br />
                            <div style={{ marginTop: '8px', fontSize: '11px' }}>
                                <div>🏛️ <strong>Estado:</strong> {fieldAnalysis.stateField || '❌ Não encontrado'}</div>
                                <div>🆔 <strong>Código:</strong> {fieldAnalysis.codeField || '❌ Não encontrado'}</div>
                                <div>📍 <strong>Nome:</strong> {fieldAnalysis.nameField || '❌ Não encontrado'}</div>
                            </div>
                        </div>
                    )}

                    {debug.sampleFeature?.properties && (
                        <div style={{ marginBottom: '15px' }}>
                            <strong>🔖 Campos disponíveis:</strong>
                            <div style={{
                                background: '#f5f5f5',
                                padding: '10px',
                                borderRadius: '4px',
                                marginTop: '8px',
                                maxHeight: '120px',
                                overflow: 'auto'
                            }}>
                                {Object.entries(debug.sampleFeature.properties).map(([key, value]) => (
                                    <div key={key} style={{ 
                                        marginBottom: '4px', 
                                        fontSize: '11px',
                                        wordBreak: 'break-word'
                                    }}>
                                        <code style={{ 
                                            background: '#fff', 
                                            padding: '1px 3px', 
                                            borderRadius: '2px',
                                            marginRight: '5px'
                                        }}>
                                            {key}
                                        </code>
                                        <span style={{ color: '#666' }}>
                                            {String(value).length > 30 ? 
                                                String(value).substring(0, 30) + '...' : 
                                                String(value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {debug.sampleFeature?.geometry && (
                        <div style={{ marginBottom: '15px' }}>
                            <strong>🗺️ Geometria:</strong>
                            <div style={{
                                background: '#fff3cd',
                                padding: '8px',
                                borderRadius: '4px',
                                marginTop: '8px',
                                fontSize: '11px'
                            }}>
                                <div><strong>Tipo:</strong> {debug.sampleFeature.geometry.type}</div>
                                <div><strong>Coordenadas:</strong> {
                                    debug.sampleFeature.geometry.coordinates ? 
                                    `${debug.sampleFeature.geometry.coordinates.length} pontos` : 
                                    'Não disponível'
                                }</div>
                            </div>
                        </div>
                    )}

                    {debug.sampleFeature && (
                        <details style={{ marginBottom: '15px' }}>
                            <summary style={{ 
                                cursor: 'pointer', 
                                fontWeight: 'bold',
                                padding: '5px',
                                background: '#f8f9fa',
                                borderRadius: '4px'
                            }}>
                                🔍 Ver Feature Completa
                            </summary>
                            <pre style={{
                                background: '#f5f5f5',
                                padding: '10px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                overflow: 'auto',
                                maxHeight: '200px',
                                marginTop: '8px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }}>
                                {JSON.stringify(debug.sampleFeature, null, 2)}
                            </pre>
                        </details>
                    )}
                </>
            )}

            {debug.error && (
                <div style={{ 
                    marginBottom: '15px',
                    padding: '10px',
                    background: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    borderRadius: '4px',
                    color: '#721c24'
                }}>
                    <strong>❌ Erro:</strong>
                    <br />
                    {debug.error}
                </div>
            )}

            <div style={{ 
                marginTop: '15px', 
                padding: '10px', 
                background: '#e9ecef', 
                borderRadius: '4px',
                fontSize: '11px'
            }}>
                <strong>📁 Caminhos testados:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    <li>/data/geo/brazil-municipalities.geojson</li>
                    <li>./data/geo/brazil-municipalities.geojson</li>
                    <li>data/geo/brazil-municipalities.geojson</li>
                    <li>/public/data/geo/brazil-municipalities.geojson</li>
                    <li>public/data/geo/brazil-municipalities.geojson</li>
                </ul>
                <div style={{ marginTop: '8px', fontStyle: 'italic', color: '#666' }}>
                    💡 O arquivo deve estar na pasta <code>public</code> para ser acessível
                </div>
            </div>

            <div style={{ 
                marginTop: '15px',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
            }}>
                <button 
                    onClick={checkGeoJSONFile}
                    style={{
                        flex: 1,
                        minWidth: '120px',
                        padding: '8px 12px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px'
                    }}
                >
                    🔄 Verificar Novamente
                </button>
                
                <button 
                    onClick={() => console.log('Debug completo:', debug)}
                    style={{
                        flex: 1,
                        minWidth: '120px',
                        padding: '8px 12px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px'
                    }}
                >
                    📋 Log Console
                </button>
            </div>

            {debug.fileExists && (
                <div style={{
                    marginTop: '15px',
                    padding: '8px',
                    background: '#d1ecf1',
                    borderRadius: '4px',
                    fontSize: '11px',
                    textAlign: 'center'
                }}>
                    💡 <strong>Dica:</strong> Verifique o console do navegador para logs detalhados
                </div>
            )}

            {!debug.fileExists && !debug.loading && (
                <div style={{
                    marginTop: '15px',
                    padding: '10px',
                    background: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '4px',
                    fontSize: '11px'
                }}>
                    <strong>🔧 Próximos passos:</strong>
                    <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        <li>Confirme se o arquivo existe em <code>public/data/geo/</code></li>
                        <li>Verifique se o servidor está rodando</li>
                        <li>Teste com um arquivo menor para debugging</li>
                        <li>Verifique permissões de arquivo</li>
                    </ol>
                </div>
            )}
        </div>
    );
};

export default DebugComponent;