import L from 'leaflet';

class MultiStateLoader {
    constructor() {
        this.estadosDisponiveis = ['go', 'ac', 'sp', 'rj', 'mg', 'rs', 'pr', 'sc', 'ba', 'pe', 'ce', 'pa', 'ma', 'pb', 'es', 'pi', 'al', 'rn', 'mt', 'ms', 'df', 'se', 'am', 'ro', 'to', 'ap', 'rr'];
        this.dadosBrasil = null;
        this.layerGroups = new Map();
        this.estadosAtivos = new Set();
        this.loadingProgress = { loaded: 0, total: 0 };
        this.cores = {
            'go': '#e74c3c', 'ac': '#27ae60', 'sp': '#3498db', 'rj': '#9b59b6',
            'mg': '#f39c12', 'rs': '#1abc9c', 'pr': '#e67e22', 'sc': '#2ecc71',
            'ba': '#34495e', 'pe': '#16a085', 'ce': '#f1c40f', 'pa': '#8e44ad',
            'ma': '#c0392b', 'pb': '#d35400', 'es': '#7f8c8d', 'pi': '#2c3e50',
            'al': '#95a5a6', 'rn': '#e8daef', 'mt': '#fadbd8', 'ms': '#d5f4e6',
            'df': '#fdeaa7', 'se': '#fab1a0', 'am': '#74b9ff', 'ro': '#a29bfe',
            'to': '#fd79a8', 'ap': '#fdcb6e', 'rr': '#6c5ce7'
        };
        
        // Cores por ideologia política
        this.coresIdeologia = {
            'extrema-direita': '#1a1a2e',      // Azul escuro
            'direita': '#16213e',              // Azul
            'centro-direita': '#4a90e2',       // Azul claro
            'centro': '#f7dc6f',               // Amarelo
            'centro-esquerda': '#f1948a',      // Vermelho bem claro
            'esquerda': '#e74c3c',             // Vermelho
            'extrema-esquerda': '#922b21'      // Vermelho escuro
        };
        
        this.map = null;
        console.log('🏗️ MultiStateLoader construído com sistema de cores por ideologia');
    }

    inicializar(map) {
        console.log('🔧 Iniciando inicialização do MultiStateLoader...');
        
        if (!map) {
            console.error('❌ Mapa não fornecido para inicialização');
            return false;
        }

        this.map = map;

        // Criar layer groups para cada estado
        this.estadosDisponiveis.forEach(estado => {
            try {
                const layerGroup = L.layerGroup();
                this.layerGroups.set(estado, layerGroup);
                console.log(`✅ Layer group criado para ${estado.toUpperCase()}`);
            } catch (error) {
                console.error(`❌ Erro ao criar layer group para ${estado}:`, error);
            }
        });

        console.log('✅ MultiStateLoader inicializado com sucesso');
        console.log(`📊 Layer groups criados: ${this.layerGroups.size}`);
        return true;
    }

    async carregarDadosBrasil(progressCallback = null) {
        if (this.dadosBrasil) {
            console.log('📋 Dados do Brasil já carregados, reutilizando...');
            return this.dadosBrasil;
        }

        console.log('🔄 Carregando dados do Brasil...');
        
        try {
            // Tentar diferentes estratégias de carregamento
            const estrategias = [
                () => this.carregarComStreaming(),
                () => this.carregarComTimeout(),
                () => this.carregarComChunks(),
                () => this.carregarSimples()
            ];

            for (const estrategia of estrategias) {
                try {
                    console.log(`🔄 Tentando estratégia: ${estrategia.name}`);
                    const dados = await estrategia();
                    if (dados) {
                        this.dadosBrasil = dados;
                        return dados;
                    }
                } catch (error) {
                    console.log(`❌ Estratégia ${estrategia.name} falhou:`, error.message);
                }
            }

            throw new Error('Todas as estratégias de carregamento falharam');

        } catch (error) {
            console.error('❌ Erro ao carregar dados do Brasil:', error);
            
            // Criar dados mock como fallback
            console.log('🎭 Criando dados mock expandidos...');
            const dadosMock = this.criarDadosMockExpandidos();
            this.dadosBrasil = dadosMock;
            return dadosMock;
        }
    }

    async carregarComStreaming() {
        console.log('📡 Tentando carregamento com streaming...');
        
        const response = await fetch('/data/geo/brazil-municipalities.geojson', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Verificar tamanho do arquivo
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
            const size = parseInt(contentLength);
            console.log(`📦 Tamanho do arquivo: ${(size / 1024 / 1024).toFixed(2)} MB`);
            
            if (size > 50 * 1024 * 1024) { // 50MB
                throw new Error('Arquivo muito grande para carregamento direto');
            }
        }

        const data = await response.json();
        console.log(`✅ Arquivo carregado com streaming: ${data.features?.length} features`);
        return data;
    }

    async carregarComTimeout() {
        console.log('⏱️ Tentando carregamento com timeout estendido...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

        try {
            const response = await fetch('/data/geo/brazil-municipalities.geojson', {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`✅ Arquivo carregado com timeout: ${data.features?.length} features`);
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    async carregarComChunks() {
        console.log('🧩 Tentando carregamento em chunks...');
        
        const response = await fetch('/data/geo/brazil-municipalities.geojson');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const chunks = [];
        let receivedLength = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                chunks.push(value);
                receivedLength += value.length;
                
                console.log(`📥 Recebido: ${(receivedLength / 1024 / 1024).toFixed(2)} MB`);
            }

            // Concatenar chunks
            const allChunks = new Uint8Array(receivedLength);
            let position = 0;
            for (const chunk of chunks) {
                allChunks.set(chunk, position);
                position += chunk.length;
            }

            // Converter para string e parsear JSON
            const text = new TextDecoder().decode(allChunks);
            const data = JSON.parse(text);
            
            console.log(`✅ Arquivo carregado em chunks: ${data.features?.length} features`);
            return data;
        } finally {
            reader.releaseLock();
        }
    }

    async carregarSimples() {
        console.log('📁 Tentando carregamento simples...');
        
        const caminhos = [
            '/data/geo/brazil-municipalities.geojson',
            'data/geo/brazil-municipalities.geojson',
            '/public/data/geo/brazil-municipalities.geojson'
        ];

        for (const caminho of caminhos) {
            try {
                console.log(`📁 Testando: ${caminho}`);
                const response = await fetch(caminho);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ Carregado de ${caminho}: ${data.features?.length} features`);
                    return data;
                }
            } catch (error) {
                console.log(`❌ Falha em ${caminho}:`, error.message);
            }
        }

        throw new Error('Nenhum caminho funcionou');
    }

    criarDadosMockExpandidos() {
        console.log('🎭 Criando dados mock expandidos...');
        
        const municipiosMock = [
            // Goiás (códigos reais que constam nos dados eleitorais)
            {
                type: 'Feature',
                properties: {
                    CD_GEOCMU: '5208707',
                    NM_MUNICIP: 'Goiânia',
                    SIGLA_UF: 'GO'
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
                    CD_GEOCMU: '5201405',
                    NM_MUNICIP: 'Anápolis',
                    SIGLA_UF: 'GO'
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
                    CD_GEOCMU: '5201108',
                    NM_MUNICIP: 'Aparecida de Goiânia',
                    SIGLA_UF: 'GO'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-49.3, -16.9], [-49.1, -16.9], 
                        [-49.1, -16.7], [-49.3, -16.7], [-49.3, -16.9]
                    ]]
                }
            },
            {
                type: 'Feature',
                properties: {
                    CD_GEOCMU: '5218805',
                    NM_MUNICIP: 'Rio Verde',
                    SIGLA_UF: 'GO'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-50.9, -17.8], [-50.7, -17.8], 
                        [-50.7, -17.6], [-50.9, -17.6], [-50.9, -17.8]
                    ]]
                }
            },
            {
                type: 'Feature',
                properties: {
                    CD_GEOCMU: '92215',
                    NM_MUNICIP: 'Anápolis',
                    SIGLA_UF: 'GO'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-48.95, -16.35], [-48.75, -16.35], 
                        [-48.75, -16.15], [-48.95, -16.15], [-48.95, -16.35]
                    ]]
                }
            },
            {
                type: 'Feature',
                properties: {
                    CD_GEOCMU: '92274',
                    NM_MUNICIP: 'Aparecida de Goiânia',
                    SIGLA_UF: 'GO'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-49.25, -16.85], [-49.05, -16.85], 
                        [-49.05, -16.65], [-49.25, -16.65], [-49.25, -16.85]
                    ]]
                }
            },
            {
                type: 'Feature',
                properties: {
                    CD_GEOCMU: '93734',
                    NM_MUNICIP: 'Goiânia',
                    SIGLA_UF: 'GO'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-49.35, -16.75], [-49.15, -16.75], 
                        [-49.15, -16.55], [-49.35, -16.55], [-49.35, -16.75]
                    ]]
                }
            },
            // São Paulo (exemplo)
            {
                type: 'Feature',
                properties: {
                    CD_GEOCMU: '3550308',
                    NM_MUNICIP: 'São Paulo',
                    SIGLA_UF: 'SP'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-46.8, -23.6], [-46.6, -23.6], 
                        [-46.6, -23.4], [-46.8, -23.4], [-46.8, -23.6]
                    ]]
                }
            },
            // Rio de Janeiro (exemplo)
            {
                type: 'Feature',
                properties: {
                    CD_GEOCMU: '3304557',
                    NM_MUNICIP: 'Rio de Janeiro',
                    SIGLA_UF: 'RJ'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-43.3, -22.9], [-43.1, -22.9], 
                        [-43.1, -22.7], [-43.3, -22.7], [-43.3, -22.9]
                    ]]
                }
            }
        ];

        return {
            type: 'FeatureCollection',
            features: municipiosMock
        };
    }

    obterEstadoDoMunicipio(feature) {
        const props = feature.properties || {};
        
        // Tentar diferentes campos que podem conter o estado
        return props.SIGLA_UF || props.sigla_uf || props.UF || props.uf || 
               props.STATE || props.state || props.estado || props.ESTADO || null;
    }

    obterCodigoMunicipio(feature) {
        const props = feature.properties || {};
        
        // Tentar diferentes campos que podem conter o código
        return props.CD_GEOCMU || props.cd_geocmu || props.GEOCODIGO || 
               props.geocodigo || props.id || props.ID || props.code || null;
    }

    obterNomeMunicipio(feature) {
        const props = feature.properties || {};
        
        // Tentar diferentes campos que podem conter o nome
        return props.NM_MUNICIP || props.nm_municip || props.NOME || 
               props.nome || props.name || props.NAME || 'Nome não disponível';
    }

    filtrarMunicipiosPorEstado(siglaEstado) {
        if (!this.dadosBrasil || !this.dadosBrasil.features) {
            console.warn('❌ Dados do Brasil não carregados');
            return [];
        }

        const municipios = this.dadosBrasil.features.filter(feature => {
            const estadoMunicipio = this.obterEstadoDoMunicipio(feature);
            return estadoMunicipio && estadoMunicipio.toLowerCase() === siglaEstado.toLowerCase();
        });

        console.log(`🔍 ${municipios.length} municípios encontrados para ${siglaEstado.toUpperCase()}`);
        
        // Debug: mostrar alguns exemplos se encontrou municípios
        if (municipios.length > 0) {
            console.log(`📝 Primeiros municípios de ${siglaEstado.toUpperCase()}:`, 
                municipios.slice(0, 3).map(m => ({
                    nome: this.obterNomeMunicipio(m),
                    codigo: this.obterCodigoMunicipio(m),
                    estado: this.obterEstadoDoMunicipio(m)
                }))
            );
        }
        
        return municipios;
    }

    getColorByIdeology(ideologia) {
        if (!ideologia) {
            console.warn('⚠️ Ideologia não fornecida');
            return '#6b7280'; // Cinza para sem dados
        }

        const ideologiaNormalizada = ideologia.toLowerCase().trim();
        const cor = this.coresIdeologia[ideologiaNormalizada];
        
        if (!cor) {
            console.warn(`⚠️ Ideologia não mapeada: "${ideologia}"`);
            return '#6b7280'; // Cinza para ideologias não mapeadas
        }

        console.log(`🎨 Ideologia "${ideologia}" -> cor ${cor}`);
        return cor;
    }

    renderizarMunicipio(feature, siglaEstado, dadosEleitorais = null) {
        if (!feature || !feature.geometry || !feature.geometry.coordinates) {
            console.warn('❌ Feature inválida:', feature);
            return null;
        }

        const codigoMunicipio = this.obterCodigoMunicipio(feature);
        const nomeMunicipio = this.obterNomeMunicipio(feature);

        // Buscar dados eleitorais usando código como string
        let dadosEleitorais_municipio = null;
        if (dadosEleitorais && Array.isArray(dadosEleitorais)) {
            dadosEleitorais_municipio = dadosEleitorais.find(
                d => String(d.codigo_municipio) === String(codigoMunicipio) && d.eleito === true
            );
            
            if (dadosEleitorais_municipio) {
                console.log(`🔍 Dados eleitorais encontrados para ${nomeMunicipio}:`, {
                    candidato: dadosEleitorais_municipio.nome_candidato,
                    partido: dadosEleitorais_municipio.partido,
                    ideologia: dadosEleitorais_municipio.partido_ideologia
                });
            }
        }

        // Definir cor baseada na ideologia
        let cor = this.cores[siglaEstado] || '#94a3b8';
        let fillOpacity = 0.4;

        if (dadosEleitorais_municipio && dadosEleitorais_municipio.partido_ideologia) {
            cor = this.getColorByIdeology(dadosEleitorais_municipio.partido_ideologia);
            fillOpacity = 0.8; // Maior opacidade para municípios com dados
        }

        try {
            // Processar coordenadas
            let coordenadas;
            if (feature.geometry.type === 'Polygon') {
                coordenadas = feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
            } else if (feature.geometry.type === 'MultiPolygon') {
                coordenadas = feature.geometry.coordinates[0][0].map(coord => [coord[1], coord[0]]);
            } else {
                console.warn('⚠️ Tipo de geometria não suportado:', feature.geometry.type);
                return null;
            }

            if (coordenadas.length < 3) {
                console.warn('⚠️ Coordenadas insuficientes:', coordenadas.length);
                return null;
            }

            const polygon = L.polygon(coordenadas, {
                color: '#ffffff',
                weight: 0.5,
                fillColor: cor,
                fillOpacity: fillOpacity,
                smoothFactor: 0.5
            });

            // Popup
            const popupContent = this.criarPopup(feature, dadosEleitorais_municipio, siglaEstado);
            polygon.bindPopup(popupContent);

            // Hover effects
            polygon.on('mouseover', function() {
                this.setStyle({
                    weight: 2,
                    fillOpacity: Math.min(fillOpacity + 0.2, 1.0)
                });
            });

            polygon.on('mouseout', function() {
                this.setStyle({
                    weight: 0.5,
                    fillOpacity: fillOpacity
                });
            });

            return polygon;
        } catch (error) {
            console.error('❌ Erro ao renderizar município:', error, {
                codigo: codigoMunicipio,
                nome: nomeMunicipio
            });
            return null;
        }
    }

    criarPopup(feature, dadosEleitorais, siglaEstado) {
        const nomeMunicipio = this.obterNomeMunicipio(feature);
        const codigoMunicipio = this.obterCodigoMunicipio(feature);

        let html = `
            <div style="min-width: 280px; font-family: Arial, sans-serif;">
                <h4 style="margin: 0 0 10px 0; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
                    ${nomeMunicipio}
                </h4>
                <p style="margin: 5px 0;"><strong>Estado:</strong> ${siglaEstado.toUpperCase()}</p>
                <p style="margin: 5px 0;"><strong>Código:</strong> ${codigoMunicipio}</p>
        `;

        if (dadosEleitorais) {
            const corIdeologia = this.getColorByIdeology(dadosEleitorais.partido_ideologia);
            html += `
                <hr style="margin: 15px 0; border: none; border-top: 1px solid #e5e7eb;">
                <div style="background: #f9fafb; padding: 12px; border-radius: 6px; border-left: 4px solid ${corIdeologia};">
                    <p style="margin: 0 0 8px 0; font-weight: bold; color: #374151;">✅ Prefeito Eleito:</p>
                    <p style="margin: 5px 0; font-size: 16px; font-weight: bold; color: #111827;">${dadosEleitorais.nome_candidato}</p>
                    
                    <div style="margin: 8px 0; display: flex; gap: 8px; flex-wrap: wrap;">
                        <span style="background: #6b7280; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                            ${dadosEleitorais.partido}
                        </span>
                        <span style="background: ${corIdeologia}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                            ${dadosEleitorais.partido_ideologia}
                        </span>
                    </div>
                    
                    <p style="margin: 5px 0;"><strong>Votos:</strong> ${dadosEleitorais.votos?.toLocaleString() || 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Percentual:</strong> ${dadosEleitorais.percentual}%</p>
                </div>
            `;
        } else {
            html += `
                <hr style="margin: 15px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-style: italic; margin: 10px 0;">📊 Dados eleitorais não disponíveis</p>
            `;
        }

        html += '</div>';
        return html;
    }

    async renderizarEstado(siglaEstado, dadosEleitorais = null) {
        console.log(`🎨 Renderizando estado: ${siglaEstado.toUpperCase()}`);

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

        municipios.forEach((feature) => {
            const polygon = this.renderizarMunicipio(feature, siglaEstado, dadosEleitorais);
            if (polygon) {
                layerGroup.addLayer(polygon);
                municipiosRenderizados++;

                const codigoMunicipio = this.obterCodigoMunicipio(feature);
                if (dadosEleitorais?.some(d => String(d.codigo_municipio) === String(codigoMunicipio) && d.eleito === true)) {
                    municipiosComDados++;
                }
            }
        });

        console.log(`✅ ${siglaEstado.toUpperCase()}: ${municipiosRenderizados} municípios renderizados, ${municipiosComDados} com dados eleitorais`);
        
        return { municipiosRenderizados, municipiosComDados };
    }

    async renderizarTodos(dadosEleitorais = null) {
        console.log('🎨 Renderizando todos os estados ativos...');
        
        if (!this.map) {
            console.error('❌ Mapa não inicializado');
            return { totalMunicipios: 0, municipiosComDados: 0 };
        }

        let totalMunicipios = 0;
        let municipiosComDados = 0;

        for (const siglaEstado of this.estadosAtivos) {
            const resultado = await this.renderizarEstado(siglaEstado, dadosEleitorais);
            totalMunicipios += resultado.municipiosRenderizados;
            municipiosComDados += resultado.municipiosComDados;
        }

        const resultado = { totalMunicipios, municipiosComDados };
        console.log(`🎉 Renderização concluída:`, resultado);
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
            usingMockData: this.dadosBrasil && this.dadosBrasil.features.length < 100
        };

        console.log('📊 Estatísticas atuais:', stats);
        return stats;
    }
}

export default MultiStateLoader;