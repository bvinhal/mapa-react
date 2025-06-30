import L from 'leaflet';

class MultiStateLoader {
    constructor() {
        this.estadosDisponiveis = ['go', 'ac', 'sp', 'rj', 'mg', 'rs', 'pr', 'sc', 'ba', 'pe', 'ce', 'pa', 'ma', 'pb', 'es', 'pi', 'al', 'rn', 'mt', 'ms', 'df', 'se', 'am', 'ro', 'to', 'ap', 'rr'];
        this.dadosBrasil = null;
        this.layerGroups = new Map();
        this.estadosAtivos = new Set();
        this.loadingProgress = { loaded: 0, total: 0 };
        
        // Cache de polígonos por estado
        this.polygonCache = new Map();
        
        // Cache de dados processados
        this.processedDataCache = new Map();
        
        // Configurações de performance
        this.performanceConfig = {
            simplifyTolerance: 0.001, // Simplificação de geometrias
            maxZoomForDetails: 10,    // Zoom máximo para mostrar detalhes
            batchSize: 50,           // Processar em lotes
            useVirtualization: true   // Carregamento virtual
        };
        
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
            'extrema-direita': '#043267',
            'direita': '#2D09DB',
            'centro-direita': '#0B5EDA',
            'centro': '#f7dc6f',
            'centro-esquerda': '#F94200',
            'esquerda': '#C11000',
            'extrema-esquerda': '#6E0251'
        };
        
        // Mapeamento de códigos de estado para siglas
        this.mapeamentoEstados = {
            '11': 'ro', '12': 'ac', '13': 'am', '14': 'rr', '15': 'pa', '16': 'ap', '17': 'to',
            '21': 'ma', '22': 'pi', '23': 'ce', '24': 'rn', '25': 'pb', '26': 'pe', '27': 'al', '28': 'se', '29': 'ba',
            '31': 'mg', '32': 'es', '33': 'rj', '35': 'sp',
            '41': 'pr', '42': 'sc', '43': 'rs',
            '50': 'ms', '51': 'mt',
            '52': 'go', '53': 'df'
        };
        
        this.map = null;
        
        // Worker para processamento em background (se disponível)
        this.worker = null;
        this.initWorker();
        
        console.log('🏗️ MultiStateLoader construído com otimizações de performance');
    }

    initWorker() {
        // Tentar criar um Web Worker para processamento pesado
        try {
            const workerBlob = new Blob([`
                self.onmessage = function(e) {
                    const { type, data } = e.data;
                    
                    if (type === 'SIMPLIFY_GEOMETRY') {
                        // Simplificar geometria usando algoritmo Douglas-Peucker
                        const simplified = simplifyGeometry(data.coordinates, data.tolerance);
                        self.postMessage({ type: 'GEOMETRY_SIMPLIFIED', data: simplified });
                    }
                };
                
                function simplifyGeometry(coordinates, tolerance) {
                    // Implementação simplificada do Douglas-Peucker
                    if (coordinates.length <= 2) return coordinates;
                    
                    // Para este exemplo, vamos apenas reduzir pontos
                    const step = Math.max(1, Math.floor(coordinates.length / 100));
                    return coordinates.filter((_, index) => index % step === 0);
                }
            `], { type: 'application/javascript' });
            
            this.worker = new Worker(URL.createObjectURL(workerBlob));
            console.log('✅ Web Worker inicializado para processamento em background');
        } catch (error) {
            console.warn('⚠️ Web Worker não disponível:', error.message);
        }
    }

    inicializar(map) {
        console.log('🔧 Iniciando inicialização otimizada do MultiStateLoader...');
        
        if (!map) {
            console.error('❌ Mapa não fornecido para inicialização');
            return false;
        }

        this.map = map;

        // Configurar otimizações do Leaflet
        this.configureMapOptimizations();

        // Criar layer groups para cada estado
        this.estadosDisponiveis.forEach(estado => {
            try {
                const layerGroup = L.layerGroup();
                this.layerGroups.set(estado, layerGroup);
            } catch (error) {
                console.error(`❌ Erro ao criar layer group para ${estado}:`, error);
            }
        });

        console.log('✅ MultiStateLoader inicializado com otimizações');
        return true;
    }

    configureMapOptimizations() {
        // Configurar preferências de performance do Leaflet
        this.map.options.preferCanvas = true; // Usar Canvas ao invés de SVG
        this.map.options.renderer = L.canvas({ padding: 0.5 });
        
        // Configurar eventos otimizados
        this.map.on('zoomstart', () => {
            this.isZooming = true;
        });
        
        this.map.on('zoomend', () => {
            this.isZooming = false;
            this.updateDetailLevel();
        });
        
        console.log('🎨 Otimizações do mapa configuradas');
    }

    updateDetailLevel() {
        const zoom = this.map.getZoom();
        const showDetails = zoom >= this.performanceConfig.maxZoomForDetails;
        
        // Ajustar nível de detalhe baseado no zoom
        this.layerGroups.forEach((layerGroup, estado) => {
            layerGroup.eachLayer(layer => {
                if (layer.setStyle) {
                    layer.setStyle({
                        weight: showDetails ? 1 : 0.5,
                        opacity: showDetails ? 0.8 : 0.6
                    });
                }
            });
        });
    }

    async carregarDadosBrasil(progressCallback = null) {
        if (this.dadosBrasil) {
            console.log('📋 Dados do Brasil já carregados, reutilizando...');
            return this.dadosBrasil;
        }

        console.log('🔄 Carregando dados do Brasil com otimizações...');
        
        try {
            // Estratégia 1: Tentar carregamento com streaming otimizado
            const dados = await this.carregarComStreamingOtimizado(progressCallback);
            
            if (dados) {
                this.dadosBrasil = dados;
                
                // Pré-processar dados em background
                this.preprocessarDados();
                
                this.validarDados();
                return dados;
            }

            throw new Error('Falha no carregamento otimizado');

        } catch (error) {
            console.error('❌ Erro ao carregar dados do Brasil:', error);
            
            // Fallback para dados mock expandidos
            console.log('🎭 Usando dados mock como fallback...');
            const dadosMock = this.criarDadosMockExpandidos();
            this.dadosBrasil = dadosMock;
            return dadosMock;
        }
    }

    async carregarComStreamingOtimizado(progressCallback) {
        console.log('📡 Carregamento otimizado com streaming...');
        
        const response = await fetch('/data/geo/brazil-municipalities.geojson', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'public, max-age=3600' // Cache por 1 hora
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentLength = response.headers.get('content-length');
        let loaded = 0;
        
        if (contentLength && progressCallback) {
            const total = parseInt(contentLength);
            
            const reader = response.body.getReader();
            const chunks = [];

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                chunks.push(value);
                loaded += value.length;
                
                // Callback de progresso
                progressCallback({
                    loaded,
                    total,
                    percentage: Math.round((loaded / total) * 100)
                });
            }

            // Reconstruir dados
            const allChunks = new Uint8Array(loaded);
            let position = 0;
            for (const chunk of chunks) {
                allChunks.set(chunk, position);
                position += chunk.length;
            }

            const text = new TextDecoder().decode(allChunks);
            const data = JSON.parse(text);
            
            console.log(`✅ Arquivo carregado com progresso: ${data.features?.length} features`);
            return data;
        } else {
            // Carregamento direto se não há content-length
            const data = await response.json();
            console.log(`✅ Arquivo carregado diretamente: ${data.features?.length} features`);
            return data;
        }
    }

    preprocessarDados() {
        if (!this.dadosBrasil || !this.dadosBrasil.features) return;
        
        console.log('🔄 Pré-processando dados para otimização...');
        
        // Criar índices por estado para acesso rápido
        const indicesPorEstado = new Map();
        
        this.dadosBrasil.features.forEach((feature, index) => {
            const estado = this.obterEstadoDoMunicipio(feature);
            if (estado) {
                if (!indicesPorEstado.has(estado)) {
                    indicesPorEstado.set(estado, []);
                }
                indicesPorEstado.get(estado).push(index);
            }
        });
        
        this.indicesPorEstado = indicesPorEstado;
        
        // Pré-calcular geometrias simplificadas
        this.simplificarGeometrias();
        
        console.log('✅ Dados pré-processados');
    }

    simplificarGeometrias() {
        console.log('🎨 Simplificando geometrias...');
        
        this.geometriasSimplificadas = new Map();
        
        this.dadosBrasil.features.forEach((feature, index) => {
            try {
                const coords = feature.geometry.coordinates;
                let simplifiedCoords;
                
                if (feature.geometry.type === 'Polygon') {
                    simplifiedCoords = this.simplifyPolygon(coords[0]);
                } else if (feature.geometry.type === 'MultiPolygon') {
                    simplifiedCoords = coords.map(polygon => 
                        this.simplifyPolygon(polygon[0])
                    );
                }
                
                if (simplifiedCoords) {
                    this.geometriasSimplificadas.set(index, simplifiedCoords);
                }
            } catch (error) {
                console.warn(`⚠️ Erro ao simplificar geometria ${index}:`, error);
            }
        });
        
        console.log(`✅ ${this.geometriasSimplificadas.size} geometrias simplificadas`);
    }

    simplifyPolygon(coordinates) {
        // Algoritmo simples de redução de pontos
        if (!coordinates || coordinates.length < 10) return coordinates;
        
        const tolerance = this.performanceConfig.simplifyTolerance;
        const step = Math.max(1, Math.floor(coordinates.length * tolerance));
        
        return coordinates.filter((_, index) => 
            index === 0 || 
            index === coordinates.length - 1 || 
            index % step === 0
        );
    }

    validarDados() {
        if (!this.dadosBrasil || !this.dadosBrasil.features) {
            console.warn('❌ Dados inválidos');
            return;
        }

        const amostra = this.dadosBrasil.features[0];
        console.log('🔍 Validação dos dados - Amostra:', {
            campos: Object.keys(amostra.properties),
            codigo: this.obterCodigoMunicipio(amostra),
            nome: this.obterNomeMunicipio(amostra),
            estado: this.obterEstadoDoMunicipio(amostra)
        });

        // Verificar distribuição por estados
        const estadosEncontrados = new Set();
        this.dadosBrasil.features.forEach(feature => {
            const estado = this.obterEstadoDoMunicipio(feature);
            if (estado) estadosEncontrados.add(estado);
        });

        console.log('🗺️ Estados encontrados nos dados:', Array.from(estadosEncontrados).sort());
    }

    obterEstadoDoMunicipio(feature) {
        const props = feature.properties || {};
        
        if (props.SIGLA_UF) {
            return props.SIGLA_UF.toLowerCase();
        }
        
        if (props.CD_UF) {
            const codigoUF = String(props.CD_UF);
            const sigla = this.mapeamentoEstados[codigoUF];
            if (sigla) {
                return sigla;
            }
        }
        
        return (props.sigla_uf || props.UF || props.uf || 
               props.STATE || props.state || props.estado || props.ESTADO || '').toLowerCase() || null;
    }

    obterCodigoMunicipio(feature) {
        const props = feature.properties || {};
        
        return props.CD_MUN || props.cd_mun || 
               props.CD_GEOCMU || props.cd_geocmu || 
               props.GEOCODIGO || props.geocodigo || 
               props.id || props.ID || props.code || null;
    }

    obterNomeMunicipio(feature) {
        const props = feature.properties || {};
        
        return props.NM_MUN || props.nm_mun ||
               props.NM_MUNICIP || props.nm_municip || 
               props.NOME || props.nome || 
               props.name || props.NAME || 'Nome não disponível';
    }

    filtrarMunicipiosPorEstado(siglaEstado) {
        if (!this.dadosBrasil || !this.dadosBrasil.features) {
            console.warn('❌ Dados do Brasil não carregados');
            return [];
        }

        // Usar índice pré-calculado se disponível
        if (this.indicesPorEstado && this.indicesPorEstado.has(siglaEstado.toLowerCase())) {
            const indices = this.indicesPorEstado.get(siglaEstado.toLowerCase());
            const municipios = indices.map(index => this.dadosBrasil.features[index]);
            console.log(`🔍 ${municipios.length} municípios encontrados para ${siglaEstado.toUpperCase()} (usando índice)`);
            return municipios;
        }

        // Fallback para busca linear
        const municipios = this.dadosBrasil.features.filter(feature => {
            const estadoMunicipio = this.obterEstadoDoMunicipio(feature);
            return estadoMunicipio && estadoMunicipio === siglaEstado.toLowerCase();
        });

        console.log(`🔍 ${municipios.length} municípios encontrados para ${siglaEstado.toUpperCase()}`);
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
                    CD_MUN: '92215',
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
            }
        ];

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

    buscarDadosEleitorais(codigoMunicipio, dadosEleitorais) {
        if (!dadosEleitorais || !Array.isArray(dadosEleitorais)) {
            return null;
        }

        // Cache de lookup para dados eleitorais
        if (!this.electoralLookup) {
            this.electoralLookup = new Map();
            dadosEleitorais.forEach(dado => {
                if (dado.eleito === true) {
                    this.electoralLookup.set(String(dado.codigo_municipio), dado);
                }
            });
        }

        return this.electoralLookup.get(String(codigoMunicipio)) || null;
    }

    async renderizarMunicipioOtimizado(feature, siglaEstado, dadosEleitorais = null) {
        if (!feature || !feature.geometry || !feature.geometry.coordinates) {
            return null;
        }

        const codigoMunicipio = this.obterCodigoMunicipio(feature);
        const nomeMunicipio = this.obterNomeMunicipio(feature);

        if (!codigoMunicipio) {
            return null;
        }

        // Buscar dados eleitorais com cache
        const dadosEleitorais_municipio = this.buscarDadosEleitorais(codigoMunicipio, dadosEleitorais);

        // Definir cor baseada na ideologia
        let cor = '#6b7280';
        let fillOpacity = 0.4;

        if (dadosEleitorais_municipio && dadosEleitorais_municipio.partido_ideologia) {
            cor = this.getColorByIdeology(dadosEleitorais_municipio.partido_ideologia);
            fillOpacity = 0.8;
        }

        try {
            // Usar geometria simplificada se disponível
            const featureIndex = this.dadosBrasil.features.indexOf(feature);
            const coordenadasSimplificadas = this.geometriasSimplificadas?.get(featureIndex);
            
            let coordenadas;
            if (coordenadasSimplificadas) {
                coordenadas = coordenadasSimplificadas.map(coord => [coord[1], coord[0]]);
            } else {
                // Fallback para coordenadas originais
                if (feature.geometry.type === 'Polygon') {
                    coordenadas = feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
                } else if (feature.geometry.type === 'MultiPolygon') {
                    coordenadas = feature.geometry.coordinates[0][0].map(coord => [coord[1], coord[0]]);
                } else {
                    return null;
                }
            }

            if (coordenadas.length < 3) {
                return null;
            }

            // Configurações otimizadas do polígono
            const polygon = L.polygon(coordenadas, {
                color: '#ffffff',
                weight: this.map.getZoom() >= this.performanceConfig.maxZoomForDetails ? 1 : 0.5,
                fillColor: cor,
                fillOpacity: fillOpacity,
                smoothFactor: 2, // Maior smoothFactor para melhor performance
                interactive: true
            });

            // Popup otimizado (criado apenas quando necessário)
            polygon.on('click', () => {
                if (!polygon._popup) {
                    const popupContent = this.criarPopup(feature, dadosEleitorais_municipio, siglaEstado);
                    polygon.bindPopup(popupContent);
                }
                polygon.openPopup();
            });

            // Hover effects otimizados
            polygon.on('mouseover', function() {
                if (!this.isZooming) {
                    this.setStyle({
                        weight: 2,
                        fillOpacity: Math.min(fillOpacity + 0.2, 1.0)
                    });
                }
            });

            polygon.on('mouseout', function() {
                if (!this.isZooming) {
                    this.setStyle({
                        weight: polygon.options.weight,
                        fillOpacity: fillOpacity
                    });
                }
            });

            return polygon;
        } catch (error) {
            console.error('❌ Erro ao renderizar município:', error);
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

        // Processar em lotes para melhor performance
        const batchSize = this.performanceConfig.batchSize;
        
        for (let i = 0; i < municipios.length; i += batchSize) {
            const batch = municipios.slice(i, i + batchSize);
            
            // Processar lote
            const polygons = await Promise.all(
                batch.map(feature => this.renderizarMunicipioOtimizado(feature, siglaEstado, dadosEleitorais))
            );
            
            // Adicionar polígonos válidos ao layer group
            polygons.forEach((polygon, index) => {
                if (polygon) {
                    layerGroup.addLayer(polygon);
                    municipiosRenderizados++;

                    const feature = batch[index];
                    const codigoMunicipio = this.obterCodigoMunicipio(feature);
                    if (this.buscarDadosEleitorais(codigoMunicipio, dadosEleitorais)) {
                        municipiosComDados++;
                    }
                }
            });
            
            // Pequena pausa para não bloquear a UI
            if (i + batchSize < municipios.length) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        console.log(`✅ ${siglaEstado.toUpperCase()}: ${municipiosRenderizados} municípios renderizados, ${municipiosComDados} com dados eleitorais`);
        
        return { municipiosRenderizados, municipiosComDados };
    }

    async renderizarTodos(dadosEleitorais = null) {
        console.log('🎨 Renderizando todos os estados ativos...');
        
        if (!this.map) {
            console.error('❌ Mapa não inicializado');
            return { totalMunicipios: 0, municipiosComDados: 0 };
        }

        // Limpar cache de lookup eleitoral para reconstruir
        this.electoralLookup = null;

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
            usingMockData: this.dadosBrasil && this.dadosBrasil.features.length < 100,
            cacheSize: this.polygonCache.size,
            indexedStates: this.indicesPorEstado ? this.indicesPorEstado.size : 0,
            simplifiedGeometries: this.geometriasSimplificadas ? this.geometriasSimplificadas.size : 0
        };

        console.log('📊 Estatísticas atuais:', stats);
        return stats;
    }

    // Método para limpar caches quando necessário
    limparCaches() {
        this.polygonCache.clear();
        this.processedDataCache.clear();
        this.electoralLookup = null;
        console.log('🧹 Caches limpos');
    }

    // Método para otimizar após carregamento
    otimizarPosCarregamento() {
        // Sugerir garbage collection se disponível
        if (window.gc && typeof window.gc === 'function') {
            window.gc();
        }
        
        // Limpar caches antigos
        this.limparCaches();
        
        console.log('⚡ Otimização pós-carregamento concluída');
    }
}

export default MultiStateLoader;