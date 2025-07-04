// src/hooks/useElectoralData.js
import { useState, useEffect } from 'react';
import { findWorkingPath, DATA_PATHS } from '../utils/paths';

export const useElectoralData = () => {
    const [electoralData, setElectoralData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        const loadElectoralData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                console.log('📊 Carregando dados eleitorais...');
                
                // Tenta encontrar o caminho correto para o arquivo
                const workingPath = await findWorkingPath(DATA_PATHS.electoral);
                console.log(`📊 Usando caminho: ${workingPath}`);
                
                const response = await fetch(workingPath);
                
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (!data || !Array.isArray(data)) {
                    throw new Error('Dados eleitorais inválidos');
                }
                
                // Processar e normalizar os dados
                const processedData = data.map(item => ({
                    codigo_municipio: item.codigo_municipio,
                    nome_municipio: item.nome_municipio,
                    nome_candidato: item.nome_candidato,
                    partido: item.partido,
                    ideologia: item.partido_ideologia || item.ideologia, // Suporte aos dois formatos
                    votos_candidato: item.votos || item.votos_candidato,
                    percentual_votos: item.percentual || item.percentual_votos,
                    eleito: item.eleito
                }));
                
                console.log(`📊 Dados eleitorais processados: ${processedData.length} registros`);
                console.log('📊 Amostra dos dados eleitorais:', processedData.slice(0, 3));
                
                // Verificar quantos municípios têm prefeitos eleitos
                const prefeitos = processedData.filter(d => d.eleito === true);
                console.log(`👨‍💼 Prefeitos eleitos encontrados: ${prefeitos.length}`);
                
                setElectoralData(processedData);
                
            } catch (err) {
                console.error('❌ Erro ao carregar dados eleitorais:', err);
                setError(err.message);
                
                // Informações adicionais para debug
                console.error('🔍 Informações de debug:');
                console.error('- URL atual:', window.location.href);
                console.error('- NODE_ENV:', process.env.NODE_ENV);
                console.error('- Hostname:', window.location.hostname);
            } finally {
                setLoading(false);
            }
        };
        
        loadElectoralData();
    }, []);
    
    return { electoralData, loading, error };
};