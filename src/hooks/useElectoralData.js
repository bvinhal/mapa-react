import { useState, useEffect } from 'react';

export const useElectoralData = () => {
    const [electoralData, setElectoralData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        const loadElectoralData = async () => {
            try {
                setLoading(true);
                const response = await fetch('/data/electoral/eleicoes_prefeitos_go_2024.json');
                
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }
                
                const data = await response.json();
                setElectoralData(data);
                console.log(`✅ Dados eleitorais carregados: ${data.length} registros`);
            } catch (err) {
                console.error('❌ Erro ao carregar dados eleitorais:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        loadElectoralData();
    }, []);
    
    return { electoralData, loading, error };
};