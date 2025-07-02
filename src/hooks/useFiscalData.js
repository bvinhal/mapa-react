// src/hooks/useFiscalData.js
import { useState, useEffect } from 'react';

export const useFiscalData = () => {
    const [fiscalData, setFiscalData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadFiscalData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                console.log('💰 Carregando dados fiscais...');
                
                const response = await fetch('/data/fiscal/situacao_fiscal.json');
                
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (!data) {
                    throw new Error('Dados fiscais vazios');
                }
                
                // Processar dados fiscais para criar um array plano com todos os municípios
                const processedData = [];
                
                // Iterar através de todos os estados
                Object.keys(data).forEach(estado => {
                    if (estado === 'metadata') return; // Pular metadados
                    
                    const municipiosEstado = data[estado];
                    if (Array.isArray(municipiosEstado)) {
                        municipiosEstado.forEach(municipio => {
                            if (municipio.rreo && municipio.rreo.municipio_codigo) {
                                processedData.push({
                                    estado: estado,
                                    codigo_municipio: municipio.rreo.municipio_codigo,
                                    nome_municipio: municipio.rreo.municipio_nome,
                                    ano: municipio.rreo.ano,
                                    periodo: municipio.rreo.periodo,
                                    // Dados RREO
                                    receita_corrente_liquida: municipio.rreo.receita_corrente_liquida,
                                    receita_tributaria: municipio.rreo.receita_tributaria,
                                    receita_transferencias: municipio.rreo.receita_transferencias,
                                    despesa_pessoal: municipio.rreo.despesa_pessoal,
                                    despesa_investimento: municipio.rreo.despesa_investimento,
                                    resultado_primario: municipio.rreo.resultado_primario,
                                    // Dados RGF
                                    despesa_total_pessoal: municipio.rgf.despesa_total_pessoal,
                                    percentual_pessoal_rcl: municipio.rgf.percentual_pessoal_rcl,
                                    limite_legal_pessoal: municipio.rgf.limite_legal_pessoal,
                                    limite_prudencial_pessoal: municipio.rgf.limite_prudencial_pessoal,
                                    divida_consolidada_liquida: municipio.rgf.divida_consolidada_liquida,
                                    status_fiscal: municipio.rgf.status_fiscal,
                                    // Indicadores
                                    investimento_percentual: municipio.indicators.investimento_percentual,
                                    dependencia_transferencias: municipio.indicators.dependencia_transferencias,
                                    autonomia_financeira: municipio.indicators.autonomia_financeira,
                                    eficiencia_gasto_pessoal: municipio.indicators.eficiencia_gasto_pessoal,
                                    capacidade_investimento: municipio.indicators.capacidade_investimento,
                                    classificacao_fiscal: municipio.indicators.classificacao_fiscal,
                                    // Indicador de simulação
                                    simulated: municipio.simulated || false
                                });
                            }
                        });
                    }
                });
                
                console.log(`💰 Dados fiscais carregados: ${processedData.length} municípios`);
                console.log('📊 Amostra dos dados fiscais:', processedData.slice(0, 3));
                
                setFiscalData(processedData);
                
            } catch (err) {
                console.error('❌ Erro ao carregar dados fiscais:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadFiscalData();
    }, []);

    return { fiscalData, loading, error };
};