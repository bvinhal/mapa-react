import React, { useState, useEffect } from 'react';

const ElectoralDebugComponent = ({ electoralData, geoData }) => {
    const [analysis, setAnalysis] = useState({
        electoralSample: [],
        geoSample: [],
        matchTests: [],
        codeFormats: {},
        loading: true
    });

    useEffect(() => {
        if (electoralData && geoData) {
            analyzeData();
        }
    }, [electoralData, geoData]);

    const analyzeData = () => {
        console.log('🔍 Analisando compatibilidade dos dados...');
        
        // Amostrar dados eleitorais
        const electoralSample = electoralData.slice(0, 10).map(item => ({
            codigo: item.codigo_municipio,
            municipio: item.nome_municipio,
            eleito: item.eleito,
            tipo: typeof item.codigo_municipio,
            length: String(item.codigo_municipio).length
        }));

        // Amostrar dados geográficos (filtrar apenas Goiás para teste)
        const geoSample = geoData.features
            .filter(f => {
                const uf = f.properties.SIGLA_UF;
                return uf && uf.toLowerCase() === 'go';
            })
            .slice(0, 10)
            .map(feature => ({
                codigo: feature.properties.CD_MUN,
                municipio: feature.properties.NM_MUN,
                estado: feature.properties.SIGLA_UF,
                tipo: typeof feature.properties.CD_MUN,
                length: String(feature.properties.CD_MUN || '').length
            }));

        // Testar matches
        const matchTests = [];
        
        // Tentar encontrar matches entre os dois datasets
        electoralSample.forEach(electoral => {
            const geoMatch = geoSample.find(geo => 
                String(geo.codigo) === String(electoral.codigo)
            );
            
            matchTests.push({
                electoralCode: electoral.codigo,
                electoralMunicipio: electoral.municipio,
                geoMatch: geoMatch ? {
                    codigo: geoMatch.codigo,
                    municipio: geoMatch.municipio
                } : null,
                matched: !!geoMatch
            });
        });

        // Analisar formatos de código
        const electoralCodes = electoralData.map(d => String(d.codigo_municipio));
        const geoCodes = geoData.features
            .filter(f => f.properties.SIGLA_UF?.toLowerCase() === 'go')
            .map(f => String(f.properties.CD_MUN));

        const codeFormats = {
            electoral: {
                lengths: [...new Set(electoralCodes.map(c => c.length))].sort(),
                samples: electoralCodes.slice(0, 5),
                total: electoralCodes.length
            },
            geo: {
                lengths: [...new Set(geoCodes.map(c => c.length))].sort(),
                samples: geoCodes.slice(0, 5),
                total: geoCodes.length
            }
        };

        setAnalysis({
            electoralSample,
            geoSample,
            matchTests,
            codeFormats,
            loading: false
        });

        console.log('📊 Análise concluída:', { electoralSample, geoSample, matchTests, codeFormats });
    };

    const getMatchStats = () => {
        const matched = analysis.matchTests.filter(t => t.matched).length;
        const total = analysis.matchTests.length;
        return { matched, total, percentage: total > 0 ? (matched / total * 100).toFixed(1) : 0 };
    };

    if (!electoralData || !geoData) {
        return (
            <div style={{
                position: 'fixed',
                top: '10px',
                left: '400px',
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 10000,
                maxWidth: '300px',
                fontFamily: 'monospace',
                fontSize: '12px'
            }}>
                <h4>🔗 Debug Eleitoral</h4>
                <p>Aguardando dados...</p>
            </div>
        );
    }

    if (analysis.loading) {
        return (
            <div style={{
                position: 'fixed',
                top: '10px',
                left: '400px',
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 10000,
                maxWidth: '300px',
                fontFamily: 'monospace',
                fontSize: '12px'
            }}>
                <h4>🔗 Debug Eleitoral</h4>
                <p>🔄 Analisando dados...</p>
            </div>
        );
    }

    const matchStats = getMatchStats();

    return (
        <div style={{
            position: 'fixed',
            top: '10px',
            left: '400px',
            background: 'white',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 10000,
            maxWidth: '400px',
            fontFamily: 'monospace',
            fontSize: '11px',
            maxHeight: '80vh',
            overflow: 'auto'
        }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>🔗 Debug Eleitoral</h4>
            
            {/* Estatísticas de Match */}
            <div style={{ 
                marginBottom: '15px',
                padding: '10px',
                borderRadius: '4px',
                background: matchStats.matched > 0 ? '#d4edda' : '#f8d7da',
                border: `1px solid ${matchStats.matched > 0 ? '#c3e6cb' : '#f5c6cb'}`
            }}>
                <strong>📊 Taxa de Match:</strong>
                <br />
                <span style={{ 
                    color: matchStats.matched > 0 ? '#155724' : '#721c24',
                    fontSize: '14px',
                    fontWeight: 'bold'
                }}>
                    {matchStats.matched}/{matchStats.total} ({matchStats.percentage}%)
                </span>
            </div>

            {/* Formatos de Código */}
            <div style={{ 
                marginBottom: '15px',
                padding: '10px',
                background: '#f8f9fa',
                borderRadius: '4px'
            }}>
                <strong>🔢 Formatos de Código:</strong>
                <div style={{ marginTop: '8px' }}>
                    <div style={{ marginBottom: '8px' }}>
                        <strong>Eleitorais:</strong>
                        <br />
                        <span>Tamanhos: {analysis.codeFormats.electoral.lengths.join(', ')}</span>
                        <br />
                        <span style={{ fontSize: '10px', color: '#666' }}>
                            Exemplos: {analysis.codeFormats.electoral.samples.join(', ')}
                        </span>
                    </div>
                    <div>
                        <strong>Geográficos:</strong>
                        <br />
                        <span>Tamanhos: {analysis.codeFormats.geo.lengths.join(', ')}</span>
                        <br />
                        <span style={{ fontSize: '10px', color: '#666' }}>
                            Exemplos: {analysis.codeFormats.geo.samples.join(', ')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Testes de Match */}
            <div style={{ marginBottom: '15px' }}>
                <strong>🔍 Testes de Match (Amostra):</strong>
                <div style={{
                    background: '#f5f5f5',
                    padding: '8px',
                    borderRadius: '4px',
                    marginTop: '8px',
                    maxHeight: '200px',
                    overflow: 'auto'
                }}>
                    {analysis.matchTests.map((test, index) => (
                        <div key={index} style={{ 
                            marginBottom: '8px',
                            padding: '6px',
                            background: test.matched ? '#d1ecf1' : '#f8d7da',
                            borderRadius: '3px',
                            fontSize: '10px'
                        }}>
                            <div style={{ fontWeight: 'bold' }}>
                                {test.matched ? '✅' : '❌'} {test.electoralMunicipio}
                            </div>
                            <div style={{ color: '#666' }}>
                                Eleitoral: {test.electoralCode}
                            </div>
                            {test.geoMatch && (
                                <div style={{ color: '#666' }}>
                                    Geo: {test.geoMatch.codigo} ({test.geoMatch.municipio})
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Amostras dos Dados */}
            <details style={{ marginBottom: '10px' }}>
                <summary style={{ 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    padding: '5px',
                    background: '#f8f9fa',
                    borderRadius: '4px'
                }}>
                    📋 Dados Eleitorais (Amostra)
                </summary>
                <div style={{
                    background: '#f5f5f5',
                    padding: '8px',
                    borderRadius: '4px',
                    marginTop: '8px',
                    maxHeight: '150px',
                    overflow: 'auto'
                }}>
                    {analysis.electoralSample.map((item, index) => (
                        <div key={index} style={{ 
                            marginBottom: '6px',
                            fontSize: '10px',
                            borderBottom: '1px solid #ddd',
                            paddingBottom: '4px'
                        }}>
                            <strong>{item.municipio}</strong>
                            <br />
                            Código: {item.codigo} (tipo: {item.tipo}, len: {item.length})
                        </div>
                    ))}
                </div>
            </details>

            <details style={{ marginBottom: '10px' }}>
                <summary style={{ 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    padding: '5px',
                    background: '#f8f9fa',
                    borderRadius: '4px'
                }}>
                    🗺️ Dados Geográficos (Amostra GO)
                </summary>
                <div style={{
                    background: '#f5f5f5',
                    padding: '8px',
                    borderRadius: '4px',
                    marginTop: '8px',
                    maxHeight: '150px',
                    overflow: 'auto'
                }}>
                    {analysis.geoSample.map((item, index) => (
                        <div key={index} style={{ 
                            marginBottom: '6px',
                            fontSize: '10px',
                            borderBottom: '1px solid #ddd',
                            paddingBottom: '4px'
                        }}>
                            <strong>{item.municipio}</strong>
                            <br />
                            Código: {item.codigo} (tipo: {item.tipo}, len: {item.length})
                        </div>
                    ))}
                </div>
            </details>

            {/* Recomendações */}
            <div style={{
                marginTop: '15px',
                padding: '10px',
                background: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '4px',
                fontSize: '10px'
            }}>
                <strong>💡 Recomendações:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '15px' }}>
                    {matchStats.matched === 0 && (
                        <>
                            <li>Verificar se os códigos precisam de padding com zeros</li>
                            <li>Comparar formatos de string vs número</li>
                            <li>Verificar se é necessário converter entre diferentes padrões</li>
                        </>
                    )}
                    {matchStats.matched > 0 && matchStats.matched < matchStats.total && (
                        <>
                            <li>Implementar múltiplas tentativas de matching</li>
                            <li>Considerar variações nos formatos de código</li>
                        </>
                    )}
                    {matchStats.matched === matchStats.total && (
                        <li>✅ Matching funcionando perfeitamente!</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default ElectoralDebugComponent;