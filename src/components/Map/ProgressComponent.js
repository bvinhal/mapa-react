import React from 'react';

const ProgressComponent = ({ progress, stage, details }) => {
    const getStageInfo = (currentStage) => {
        const stages = {
            'loading': { icon: '📁', label: 'Carregando arquivo', color: '#3b82f6' },
            'processing': { icon: '⚙️', label: 'Processando dados', color: '#f59e0b' },
            'indexing': { icon: '📇', label: 'Criando índices', color: '#8b5cf6' },
            'simplifying': { icon: '🎨', label: 'Otimizando geometrias', color: '#06b6d4' },
            'rendering': { icon: '🗺️', label: 'Renderizando mapa', color: '#10b981' },
            'complete': { icon: '✅', label: 'Concluído', color: '#16a34a' }
        };
        
        return stages[currentStage] || stages['loading'];
    };

    const stageInfo = getStageInfo(stage);
    const percentage = Math.round(progress?.percentage || 0);

    return (
        <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            zIndex: 10001,
            minWidth: '320px',
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center'
        }}>
            {/* Ícone e título */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ 
                    fontSize: '48px', 
                    marginBottom: '10px',
                    animation: stage === 'complete' ? 'none' : 'pulse 2s infinite'
                }}>
                    {stageInfo.icon}
                </div>
                <h3 style={{ 
                    margin: 0, 
                    color: '#1f2937',
                    fontSize: '18px'
                }}>
                    {stageInfo.label}
                </h3>
            </div>

            {/* Barra de progresso */}
            {stage !== 'complete' && (
                <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginBottom: '15px'
                }}>
                    <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        backgroundColor: stageInfo.color,
                        transition: 'width 0.3s ease',
                        borderRadius: '4px'
                    }} />
                </div>
            )}

            {/* Percentual */}
            {stage !== 'complete' && percentage > 0 && (
                <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: stageInfo.color,
                    marginBottom: '10px'
                }}>
                    {percentage}%
                </div>
            )}

            {/* Detalhes */}
            {details && (
                <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    marginTop: '10px'
                }}>
                    {typeof details === 'object' && details.loaded && details.total ? (
                        <div>
                            {(details.loaded / 1024 / 1024).toFixed(1)} MB / {(details.total / 1024 / 1024).toFixed(1)} MB
                        </div>
                    ) : (
                        <div>{details}</div>
                    )}
                </div>
            )}

            {/* Dicas de performance */}
            {stage === 'loading' && percentage < 50 && (
                <div style={{
                    marginTop: '15px',
                    padding: '10px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#92400e'
                }}>
                    💡 <strong>Dica:</strong> Carregando dados pela primeira vez. Próximas visualizações serão mais rápidas!
                </div>
            )}

            {stage === 'complete' && (
                <div style={{
                    marginTop: '10px',
                    color: '#16a34a',
                    fontSize: '14px',
                    fontWeight: 'bold'
                }}>
                    Mapa otimizado e pronto para uso!
                </div>
            )}

            <style>
                {`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                `}
            </style>
        </div>
    );
};

export default ProgressComponent;