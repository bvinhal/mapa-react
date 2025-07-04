import L from 'leaflet';
import { findWorkingPath, DATA_PATHS } from '../../utils/paths';

class MultiStateLoader {
    constructor() {
        this.map = null;
        this.dadosBrasil = null;
        this.layerGroups = new Map();
        this.estadosAtivos = new Set();
        this.estadosDisponiveis = [];
        this.indicesPorEstado = null;
        this.polygonCache = new Map();
        this.electoralLookup = null;
        this.fiscalLookup = null; // Novo cache para dados fiscais
        this.dadosEleitoraisMock = null; // Para dados mock
        
        // Configurações de performance
        this.performanceConfig = {
            batchSize: 50,
            maxCacheSize: 1000,
            enableCache: true
        };

        // Cores para ideologias políticas (modo eleitoral)
        this.coresIdeologia = {
            'esquerda': '#d73027',
            'centro-esquerda': '#f46d43', 
            'centro': '#fee08b',
            'centro-direita': '#74add1',
            'direita': '#4575b4'
        };

        // Cores para classificação fiscal (modo fiscal)
        this.coresFiscal = {
            'excelente': '#22c55e', // verde
            'ótima': '#22c55e',     // verde (sinônimo)
            'bom': '#3b82f6',       // azul
            'boa': '#3b82f6',       // azul (sinônimo)
            'regular': '#eab308',   // amarelo
            'ruim': '#ef4444',      // vermelho
            'péssima': '#8b5cf6',   // roxo
            'pessima': '#8b5cf6'    // roxo (sem acento)
        };
    }

    inicializar(map) {
        if (!map) {
            console.error('❌ Instância do mapa é obrigatória');
            return false;
        }

        this.map = map;
        console.log('✅ MultiStateLoader inicializado com sucesso');
        return true;
    }

    async carregarDadosBrasil(options = {}) {
        const { onProgress } = options;
        
        try {
            console.log('🌍 Iniciando carregamento dos dados geográficos...');
            
            if (onProgress) onProgress(10);

            // Tentar carregar dados reais primeiro
            let dados = null;
            try {
                console.log('📁 Tentando carregar dados reais...');
                const workingPath = await findWorkingPath(DATA_PATHS.geo);
                const response = await fetch(workingPath);
                
                if (response.ok) {
                    dados = await response.json();
                    console.log('✅ Dados reais carregados com sucesso');
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                console.warn('⚠️ Falha ao carregar dados reais:', error.message);
                console.log('🎭 Usando dados mock expandidos...');
                dados = this.criarDadosMockExpandidos();
            }

            if (onProgress) onProgress(50);

            if (!dados || !dados.features) {
                throw new Error('Dados geográficos inválidos');
            }

            this.dadosBrasil = dados;
            console.log(`📊 ${dados.features.length} municípios carregados`);

            if (onProgress) onProgress(70);

            // Criar índices por estado
            this.criarIndicesPorEstado();
            
            if (onProgress) onProgress(85);

            // Criar layer groups para todos os estados
            this.criarLayerGroups();
            
            if (onProgress) onProgress(100);

            console.log('✅ Dados do Brasil carregados e indexados com sucesso');
            return true;

        } catch (error) {
            console.error('❌ Erro no carregamento dos dados:', error);
            throw error;
        }
    }

    criarIndicesPorEstado() {
        if (!this.dadosBrasil) {
            console.warn('❌ Dados do Brasil não carregados');
            return;
        }

        console.log('🗂️ Criando índices por estado...');
        this.indicesPorEstado = new Map();
        this.estadosDisponiveis = [];

        this.dadosBrasil.features.forEach((feature, index) => {
            const siglaUF = this.obterSiglaEstado(feature);
            
            if (siglaUF) {
                const siglaLower = siglaUF.toLowerCase();
                
                if (!this.indicesPorEstado.has(siglaLower)) {
                    this.indicesPorEstado.set(siglaLower, []);
                    this.estadosDisponiveis.push(siglaLower);
                }
                
                this.indicesPorEstado.get(siglaLower).push(index);
            }
        });

        console.log(`📋 Índices criados para ${this.estadosDisponiveis.length} estados:`, this.estadosDisponiveis);
    }

    criarLayerGroups() {
        console.log('🗂️ Criando layer groups para estados...');
        
        this.estadosDisponiveis.forEach(siglaEstado => {
            const layerGroup = L.layerGroup();
            this.layerGroups.set(siglaEstado, layerGroup);
        });

        console.log(`✅ ${this.layerGroups.size} layer groups criados`);
    }

    atualizarEstadosAtivos(novosEstados) {
        console.log('🔄 Atualizando estados ativos:', novosEstados);
        
        // Remover estados que não estão mais ativos
        this.estadosAtivos.forEach(estado => {
            if (!novosEstados.includes(estado)) {
                this.mostrarEstado(estado, false);
            }
        });

        // Adicionar novos estados ativos
        novosEstados.forEach(estado => {
            if (!this.estadosAtivos.has(estado)) {
                this.mostrarEstado(estado, true);
            }
        });

        this.estadosAtivos = new Set(novosEstados);
        console.log(`✅ Estados ativos atualizados: ${this.estadosAtivos.size} estados`);
    }

    obterSiglaEstado(feature) {
        const props = feature.properties;
        return props.SIGLA_UF || props.UF || props.uf || null;
    }

    obterCodigoMunicipio(feature) {
        const props = feature.properties;
        const codigo = props.CD_MUN || props.codigo_ibge || props.codigo || props.id || null;
        
        // Debug para códigos específicos
        //if (props.NM_MUN === 'Goiânia' || props.NM_MUN === 'Anápolis' || props.NM_MUN === 'Morrinhos' || props.NM_MUN === 'Faina') {
        //    console.log(`🔍 Código municipal para ${props.NM_MUN}:`, codigo, 'Propriedades:', props);
       // }
        
        return codigo;
    }

    obterNomeMunicipio(feature) {
        const props = feature.properties;
        return props.NM_MUN || props.nome || props.name || 'Município';
    }

    filtrarMunicipiosPorEstado(siglaEstado) {
        if (!this.indicesPorEstado || !this.dadosBrasil) {
            console.warn(`❌ Índices ou dados não disponíveis para ${siglaEstado}`);
            return [];
        }

        const indices = this.indicesPorEstado.get(siglaEstado.toLowerCase());
        if (!indices) {
            console.warn(`❌ Estado ${siglaEstado.toUpperCase()} não encontrado nos índices`);
            return [];
        }

        const municipios = indices.map(index => this.dadosBrasil.features[index]);
        console.log(`📍 ${municipios.length} municípios encontrados para ${siglaEstado.toUpperCase()}`);
        return municipios;
    }

    criarDadosMockExpandidos() {
        console.log('🎭 Criando dados mock expandidos...');
        
        const municipiosMock = [
            {
                type: 'Feature',
                properties: {
                    CD_MUN: '5208707',
                    NM_MUN: 'Goiânia',
                    SIGLA_UF: 'GO',
                    CD_UF: '52'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-49.4, -16.8], [-49.1, -16.8], 
                        [-49.1, -16.5], [-49.4, -16.5], [-49.4, -16.8]
                    ]]
                }
            },
            {
                type: 'Feature',
                properties: {
                    CD_MUN: '92215', // Código correto de Anápolis
                    NM_MUN: 'Anápolis',
                    SIGLA_UF: 'GO',
                    CD_UF: '52'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-49.0, -16.4], [-48.7, -16.4], 
                        [-48.7, -16.1], [-49.0, -16.1], [-49.0, -16.4]
                    ]]
                }
            },
            {
                type: 'Feature',
                properties: {
                    CD_MUN: '1501402',
                    NM_MUN: 'Belém',
                    SIGLA_UF: 'PA',
                    CD_UF: '15'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-48.5, -1.5], [-48.2, -1.5], 
                        [-48.2, -1.2], [-48.5, -1.2], [-48.5, -1.5]
                    ]]
                }
            },
            {
                type: 'Feature',
                properties: {
                    CD_MUN: '2304400',
                    NM_MUN: 'Fortaleza',
                    SIGLA_UF: 'CE',
                    CD_UF: '23'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-38.6, -3.8], [-38.3, -3.8], 
                        [-38.3, -3.5], [-38.6, -3.5], [-38.6, -3.8]
                    ]]
                }
            },
            {
                type: 'Feature',
                properties: {
                    CD_MUN: '2611606',
                    NM_MUN: 'Recife',
                    SIGLA_UF: 'PE',
                    CD_UF: '26'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-35.0, -8.1], [-34.7, -8.1], 
                        [-34.7, -7.8], [-35.0, -7.8], [-35.0, -8.1]
                    ]]
                }
            },
            {
                type: 'Feature',
                properties: {
                    CD_MUN: '3550308',
                    NM_MUN: 'São Paulo',
                    SIGLA_UF: 'SP',
                    CD_UF: '35'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-46.8, -23.7], [-46.5, -23.7], 
                        [-46.5, -23.4], [-46.8, -23.4], [-46.8, -23.7]
                    ]]
                }
            },
            {
                type: 'Feature',
                properties: {
                    CD_MUN: '5300108',
                    NM_MUN: 'Brasília',
                    SIGLA_UF: 'DF',
                    CD_UF: '53'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-47.9, -15.8], [-47.6, -15.8], 
                        [-47.6, -15.5], [-47.9, -15.5], [-47.9, -15.8]
                    ]]
                }
            },
            // Adicionar mais municípios de Goiás baseados nos dados reais
            {
                type: 'Feature',
                properties: {
                    CD_MUN: '94730', // Morrinhos
                    NM_MUN: 'Morrinhos',
                    SIGLA_UF: 'GO',
                    CD_UF: '52'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-49.2, -17.0], [-48.9, -17.0], 
                        [-48.9, -16.7], [-49.2, -16.7], [-49.2, -17.0]
                    ]]
                }
            },
            {
                type: 'Feature',
                properties: {
                    CD_MUN: '92223', // Faina
                    NM_MUN: 'Faina',
                    SIGLA_UF: 'GO',
                    CD_UF: '52'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-50.5, -15.5], [-50.2, -15.5], 
                        [-50.2, -15.2], [-50.5, -15.2], [-50.5, -15.5]
                    ]]
                }
            }
        ];

        // Criar dados eleitorais mock correspondentes (usando códigos reais dos dados)
        this.dadosEleitoraisMock = [
            {
                codigo_municipio: '5208707', // Goiânia
                nome_municipio: 'Goiânia',
                nome_candidato: 'João da Silva',
                partido: 'PP',
                ideologia: 'centro-direita',
                votos_candidato: 285430,
                percentual_votos: 52.3,
                eleito: true
            },
            {
                codigo_municipio: '92215', // Anápolis (código real dos dados)
                nome_municipio: 'Anápolis',
                nome_candidato: 'Maria Santos',
                partido: 'PT',
                ideologia: 'esquerda',
                votos_candidato: 142850,
                percentual_votos: 48.7,
                eleito: true
            },
            {
                codigo_municipio: '1501402', // Belém
                nome_municipio: 'Belém',
                nome_candidato: 'Pedro Oliveira',
                partido: 'PSDB',
                ideologia: 'centro',
                votos_candidato: 325690,
                percentual_votos: 54.2,
                eleito: true
            },
            {
                codigo_municipio: '2304400', // Fortaleza
                nome_municipio: 'Fortaleza',
                nome_candidato: 'Ana Costa',
                partido: 'PDT',
                ideologia: 'centro-esquerda',
                votos_candidato: 687540,
                percentual_votos: 57.8,
                eleito: true
            },
            {
                codigo_municipio: '94730', // Morrinhos (do arquivo real)
                nome_municipio: 'Morrinhos',
                nome_candidato: 'Maycllyn Carreiro',
                partido: 'PL',
                ideologia: 'direita',
                votos_candidato: 9481,
                percentual_votos: 33.9,
                eleito: true
            },
            {
                codigo_municipio: '92223', // Faina (do arquivo real)
                nome_municipio: 'Faina',
                nome_candidato: 'Creonir do Leilão',
                partido: 'PP',
                ideologia: 'centro-direita',
                votos_candidato: 3208,
                percentual_votos: 55.32,
                eleito: true
            }
        ];

        console.log('🎭 Dados eleitorais mock criados:', this.dadosEleitoraisMock);

        return {
            type: 'FeatureCollection',
            features: municipiosMock
        };
    }

    getColorByIdeology(ideologia) {
        if (!ideologia) {
            return '#6b7280';
        }

        const ideologiaNormalizada = ideologia.toLowerCase().trim();
        const cor = this.coresIdeologia[ideologiaNormalizada];
        
        if (!cor) {
            console.warn(`⚠️ Ideologia não mapeada: "${ideologia}"`);
            return '#6b7280';
        }

        return cor;
    }

    getColorByFiscalClassification(classificacao) {
        if (!classificacao) {
            return '#6b7280';
        }

        const classificacaoNormalizada = classificacao.toLowerCase().trim();
        const cor = this.coresFiscal[classificacaoNormalizada];
        
        if (!cor) {
            console.warn(`⚠️ Classificação fiscal não mapeada: "${classificacao}"`);
            return '#6b7280';
        }

        return cor;
    }

    buscarDadosEleitorais(codigoMunicipio, dadosEleitorais) {
        if (!dadosEleitorais || !Array.isArray(dadosEleitorais)) {
            // Se não há dados eleitorais reais, usar dados mock
            if (this.dadosEleitoraisMock) {
                const dadoMock = this.dadosEleitoraisMock.find(d => String(d.codigo_municipio) === String(codigoMunicipio));
                if (dadoMock) {
                    console.log(`🎭 Usando dado eleitoral mock para ${codigoMunicipio}:`, dadoMock);
                    return dadoMock;
                }
            }
            return null;
        }

        // Cache de lookup para dados eleitorais
        if (!this.electoralLookup) {
            this.electoralLookup = new Map();
            dadosEleitorais.forEach(dado => {
                // Verificar se o candidato foi eleito
                if (dado.eleito === true || dado.eleito === 'true' || dado.eleito === 1) {
                    const codigo = String(dado.codigo_municipio);
                    this.electoralLookup.set(codigo, dado);
                    
                    // Debug: log para verificar se está encontrando dados
                    if (codigo === '5208707' || codigo === '92215' || codigo === '94730' || codigo === '92223') {
                        console.log(`🔍 Dado eleitoral encontrado para ${codigo}:`, dado);
                    }
                }
            });
            console.log(`📊 Cache eleitoral criado com ${this.electoralLookup.size} municípios`);
        }

        const resultado = this.electoralLookup.get(String(codigoMunicipio));
        
        // Se não encontrou nos dados reais, tentar nos dados mock
        if (!resultado && this.dadosEleitoraisMock) {
            const dadoMock = this.dadosEleitoraisMock.find(d => String(d.codigo_municipio) === String(codigoMunicipio));
            if (dadoMock) {
                console.log(`🎭 Usando dado eleitoral mock para ${codigoMunicipio}:`, dadoMock);
                return dadoMock;
            }
        }
        
        // Debug adicional para códigos específicos
        if (['5208707', '92215', '94730', '92223'].includes(String(codigoMunicipio)) && !resultado) {
            console.warn(`⚠️ Não encontrado dado eleitoral para código: ${codigoMunicipio}`);
        }
        
        return resultado || null;
    }

    buscarDadosFiscais(codigoMunicipio, dadosFiscais) {
        if (!dadosFiscais || !Array.isArray(dadosFiscais)) {
            return null;
        }

        // Cache de lookup para dados fiscais
        if (!this.fiscalLookup) {
            this.fiscalLookup = new Map();
            dadosFiscais.forEach(dado => {
                this.fiscalLookup.set(String(dado.codigo_municipio), dado);
            });
        }

        return this.fiscalLookup.get(String(codigoMunicipio)) || null;
    }

    renderizarMunicipioOtimizado(feature, siglaEstado, dados, modo = 'eleitoral') {
        const codigoMunicipio = this.obterCodigoMunicipio(feature);
        const nomeMunicipio = this.obterNomeMunicipio(feature);
        
        if (!codigoMunicipio) {
            console.warn('❌ Código do município não encontrado:', feature.properties);
            return null;
        }

        // Verificar cache
        const cacheKey = `${codigoMunicipio}_${modo}`;
        if (this.performanceConfig.enableCache && this.polygonCache.has(cacheKey)) {
            return this.polygonCache.get(cacheKey);
        }

        try {
            // Buscar dados específicos baseado no modo
            let dadosMunicipio = null;
            let cor = '#6b7280'; // Cor padrão (cinza)

            if (modo === 'eleitoral') {
                dadosMunicipio = this.buscarDadosEleitorais(codigoMunicipio, dados);
                if (dadosMunicipio) {
                    cor = this.getColorByIdeology(dadosMunicipio.ideologia);
                    console.log(`🎨 Colorindo ${nomeMunicipio} (${codigoMunicipio}) com cor ${cor} para ideologia: ${dadosMunicipio.ideologia}`);
                } else {
                    console.log(`⚪ Município ${nomeMunicipio} (${codigoMunicipio}) sem dados eleitorais - usando cor padrão`);
                }
            } else if (modo === 'fiscal') {
                dadosMunicipio = this.buscarDadosFiscais(codigoMunicipio, dados);
                if (dadosMunicipio) {
                    cor = this.getColorByFiscalClassification(dadosMunicipio.classificacao_fiscal);
                    console.log(`🎨 Colorindo ${nomeMunicipio} (${codigoMunicipio}) com cor ${cor} para classificação: ${dadosMunicipio.classificacao_fiscal}`);
                }
            }

            // Criar polígono
            const polygon = L.geoJSON(feature, {
                style: {
                    fillColor: cor,
                    weight: 1,
                    opacity: 0.8,
                    color: '#ffffff',
                    fillOpacity: 0.7
                }
            });

            // Adicionar popup
            if (dadosMunicipio) {
                const popupContent = modo === 'eleitoral' ? 
                    this.criarPopupEleitoral(dadosMunicipio, nomeMunicipio) : 
                    this.criarPopupFiscal(dadosMunicipio, nomeMunicipio);
                
                polygon.bindPopup(popupContent, {
                    maxWidth: 300,
                    className: `popup-${modo}`
                });
            } else {
                const popupContent = modo === 'eleitoral' ? 
                    this.criarPopupSemDadosEleitorais(nomeMunicipio, codigoMunicipio) :
                    this.criarPopupSemDadosFiscais(nomeMunicipio, codigoMunicipio);
                
                polygon.bindPopup(popupContent, {
                    maxWidth: 300,
                    className: `popup-no-data`
                });
            }

            // Adicionar ao cache
            if (this.performanceConfig.enableCache) {
                if (this.polygonCache.size >= this.performanceConfig.maxCacheSize) {
                    const firstKey = this.polygonCache.keys().next().value;
                    this.polygonCache.delete(firstKey);
                }
                this.polygonCache.set(cacheKey, polygon);
            }

            return polygon;

        } catch (error) {
            console.error(`❌ Erro ao renderizar município ${nomeMunicipio}:`, error);
            return null;
        }
    }

    criarPopupEleitoral(dados, nomeMunicipio) {
        const formatarNumero = (num) => {
            if (num == null) return 'N/A';
            return new Intl.NumberFormat('pt-BR').format(num);
        };

        const formatarPorcentagem = (num) => {
            if (num == null) return 'N/A';
            return `${num.toFixed(1)}%`;
        };

        let html = '<div class="popup-content">';
        html += `<h3 style="margin: 0 0 10px 0; color: #1e40af;">${nomeMunicipio}</h3>`;
        
        if (dados.eleito) {
            html += `
                <div style="background: #f0f9ff; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
                    <strong style="color: #0369a1;">👤 ${dados.nome_candidato}</strong><br>
                    <small style="color: #64748b;">Código: ${dados.codigo_municipio}</small>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                    <div><strong>🎯 Partido:</strong><br>${dados.partido || 'N/A'}</div>
                    <div><strong>🏛️ Ideologia:</strong><br>${dados.ideologia || 'N/A'}</div>
                    <div><strong>📊 Votos:</strong><br>${formatarNumero(dados.votos_candidato)}</div>
                    <div><strong>📈 % Votos:</strong><br>${formatarPorcentagem(dados.percentual_votos)}</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                    <div><strong>📊 Votos:</strong><br>${formatarNumero(dados.votos_candidato)}</div>
                    <div><strong>📈 % Votos:</strong><br>${formatarPorcentagem(dados.percentual_votos)}</div>
                </div>
            `;
        } else {
            html += `
                <div style="background: #fef2f2; padding: 8px; border-radius: 4px; border-left: 4px solid #f87171;">
                    <p style="color: #dc2626; font-style: italic; margin: 0;">📊 Dados eleitorais não disponíveis</p>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    criarPopupFiscal(dados, nomeMunicipio) {
        const formatarValor = (valor) => {
            if (valor == null) return 'N/A';
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2
            }).format(valor);
        };

        const formatarPorcentagem = (num) => {
            if (num == null) return 'N/A';
            return `${num.toFixed(1)}%`;
        };

        const getClassificacaoColor = (classificacao) => {
            const cores = {
                'excelente': '#22c55e',
                'ótima': '#22c55e',
                'bom': '#3b82f6',
                'boa': '#3b82f6',
                'regular': '#eab308',
                'ruim': '#ef4444',
                'péssima': '#8b5cf6',
                'pessima': '#8b5cf6'
            };
            return cores[classificacao?.toLowerCase()] || '#6b7280';
        };

        let html = '<div class="popup-content">';
        html += `<h3 style="margin: 0 0 10px 0; color: #1e40af;">${nomeMunicipio}</h3>`;
        
        html += `
            <div style="background: #f0f9ff; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>💰 Situação Fiscal</strong></span>
                    <span style="background: ${getClassificacaoColor(dados.classificacao_fiscal)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                        ${dados.classificacao_fiscal?.toUpperCase() || 'N/A'}
                    </span>
                </div>
                <small style="color: #64748b;">Código: ${dados.codigo_municipio} | Ano: ${dados.ano}</small>
            </div>
        `;

        html += `
            <div style="display: grid; grid-template-columns: 1fr; gap: 6px; font-size: 12px;">
                <div style="background: #f8fafc; padding: 6px; border-radius: 3px;">
                    <strong>💵 Receita Corrente Líquida:</strong><br>
                    ${formatarValor(dados.receita_corrente_liquida)}
                </div>
                <div style="background: #f8fafc; padding: 6px; border-radius: 3px;">
                    <strong>👥 Gasto com Pessoal:</strong><br>
                    ${formatarPorcentagem(dados.eficiencia_gasto_pessoal)} da RCL
                </div>
                <div style="background: #f8fafc; padding: 6px; border-radius: 3px;">
                    <strong>🏗️ Investimentos:</strong><br>
                    ${formatarPorcentagem(dados.investimento_percentual)} da receita
                </div>
                <div style="background: #f8fafc; padding: 6px; border-radius: 3px;">
                    <strong>🤝 Dependência de Transferências:</strong><br>
                    ${formatarPorcentagem(dados.dependencia_transferencias)}
                </div>
                <div style="background: #f8fafc; padding: 6px; border-radius: 3px;">
                    <strong>📊 Status:</strong><br>
                    ${dados.status_fiscal || 'N/A'}
                </div>
            </div>
        `;

        if (dados.simulated) {
            html += `
                <div style="margin-top: 8px; padding: 6px; background: #fef3c7; border-radius: 3px; border-left: 3px solid #f59e0b;">
                    <small style="color: #92400e; font-style: italic;">
                        ⚠️ Nota: Dados simulados para fins demonstrativos
                    </small>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    criarPopupSemDadosEleitorais(nomeMunicipio, codigoMunicipio) {
        let html = '<div class="popup-content">';
        html += `<h3 style="margin: 0 0 10px 0; color: #1e40af;">${nomeMunicipio}</h3>`;
        html += `
            <div style="background: #fef2f2; padding: 8px; border-radius: 4px; border-left: 4px solid #f87171;">
                <small style="color: #64748b;">Código: ${codigoMunicipio}</small><br>
                <p style="color: #dc2626; font-style: italic; margin: 10px 0;">📊 Dados eleitorais não disponíveis</p>
            </div>
        `;
        html += '</div>';
        return html;
    }

    criarPopupSemDadosFiscais(nomeMunicipio, codigoMunicipio) {
        let html = '<div class="popup-content">';
        html += `<h3 style="margin: 0 0 10px 0; color: #1e40af;">${nomeMunicipio}</h3>`;
        html += `
            <div style="background: #fef2f2; padding: 8px; border-radius: 4px; border-left: 4px solid #f87171;">
                <small style="color: #64748b;">Código: ${codigoMunicipio}</small><br>
                <p style="color: #dc2626; font-style: italic; margin: 10px 0;">💰 Dados fiscais não disponíveis</p>
            </div>
        `;
        html += '</div>';
        return html;
    }

    async renderizarEstado(siglaEstado, dados = null, modo = 'eleitoral') {
        console.log(`🎨 Renderizando estado: ${siglaEstado.toUpperCase()} no modo ${modo}`);

        const layerGroup = this.layerGroups.get(siglaEstado);
        if (!layerGroup) {
            console.warn(`❌ Layer group não encontrado para ${siglaEstado}`);
            return { municipiosRenderizados: 0, municipiosComDados: 0 };
        }

        // Limpar layers existentes
        layerGroup.clearLayers();

        // Obter municípios do estado
        const municipios = this.filtrarMunicipiosPorEstado(siglaEstado);
        
        if (municipios.length === 0) {
            console.warn(`⚠️ Nenhum município encontrado para renderizar em ${siglaEstado.toUpperCase()}`);
            return { municipiosRenderizados: 0, municipiosComDados: 0 };
        }
        
        let municipiosRenderizados = 0;
        let municipiosComDados = 0;

        // Processar em lotes para melhor performance
        const batchSize = this.performanceConfig.batchSize;
        
        for (let i = 0; i < municipios.length; i += batchSize) {
            const batch = municipios.slice(i, i + batchSize);
            
            // Processar lote
            const polygons = await Promise.all(
                batch.map(feature => this.renderizarMunicipioOtimizado(feature, siglaEstado, dados, modo))
            );
            
            // Adicionar polígonos válidos ao layer group
            polygons.forEach((polygon, index) => {
                if (polygon) {
                    layerGroup.addLayer(polygon);
                    municipiosRenderizados++;

                    const feature = batch[index];
                    const codigoMunicipio = this.obterCodigoMunicipio(feature);
                    const dadosMunicipio = modo === 'eleitoral' ? 
                        this.buscarDadosEleitorais(codigoMunicipio, dados) :
                        this.buscarDadosFiscais(codigoMunicipio, dados);
                    
                    if (dadosMunicipio) {
                        municipiosComDados++;
                    }
                }
            });
            
            // Pequena pausa para não bloquear a UI
            if (i + batchSize < municipios.length) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        console.log(`✅ ${siglaEstado.toUpperCase()}: ${municipiosRenderizados} municípios renderizados, ${municipiosComDados} com dados ${modo}`);
        
        return { municipiosRenderizados, municipiosComDados };
    }

    async renderizarTodos(dados = null, modo = 'eleitoral') {
        console.log(`🎨 Renderizando todos os estados ativos no modo: ${modo}...`);
        
        if (!this.map) {
            console.error('❌ Mapa não inicializado');
            return { totalMunicipios: 0, municipiosComDados: 0 };
        }

        // Limpar cache de lookup para reconstruir
        if (modo === 'eleitoral') {
            this.electoralLookup = null;
        } else {
            this.fiscalLookup = null;
        }

        let totalMunicipios = 0;
        let municipiosComDados = 0;

        for (const siglaEstado of this.estadosAtivos) {
            const resultado = await this.renderizarEstado(siglaEstado, dados, modo);
            totalMunicipios += resultado.municipiosRenderizados;
            municipiosComDados += resultado.municipiosComDados;
        }

        const resultado = { totalMunicipios, municipiosComDados };
        console.log(`🎉 Renderização concluída no modo ${modo}:`, resultado);
        return resultado;
    }

    async mostrarEstado(siglaEstado, mostrar = true) {
        console.log(`👁️ ${mostrar ? 'Mostrando' : 'Ocultando'} estado: ${siglaEstado.toUpperCase()}`);
        
        const layerGroup = this.layerGroups.get(siglaEstado);
        if (!layerGroup || !this.map) {
            console.warn(`❌ Layer group ou mapa não encontrado para ${siglaEstado}`);
            return;
        }

        if (mostrar) {
            this.estadosAtivos.add(siglaEstado);
            layerGroup.addTo(this.map);
            console.log(`✅ ${siglaEstado.toUpperCase()} adicionado ao mapa`);
        } else {
            this.estadosAtivos.delete(siglaEstado);
            this.map.removeLayer(layerGroup);
            console.log(`✅ ${siglaEstado.toUpperCase()} removido do mapa`);
        }
    }

    obterEstatisticas() {
        const stats = {
            estadosCarregados: this.dadosBrasil ? 1 : 0,
            estadosAtivos: this.estadosAtivos.size,
            totalMunicipios: this.dadosBrasil ? this.dadosBrasil.features.length : 0,
            estadosDisponiveis: this.estadosDisponiveis.length,
            usingMockData: this.dadosBrasil && this.dadosBrasil.features.length < 100,
            cacheSize: this.polygonCache.size,
            indexedStates: this.indicesPorEstado ? this.indicesPorEstado.size : 0
        };

        return stats;
    }
}

export default MultiStateLoader;