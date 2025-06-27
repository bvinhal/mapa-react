import L from 'leaflet';

class MultiStateLoader {
    constructor() {
        this.estadosDisponiveis = ['go', 'ac', 'sp', 'rj', 'mg', 'rs', 'pr', 'sc', 'ba', 'pe', 'ce', 'pa', 'ma', 'pb', 'es', 'pi', 'al', 'rn', 'mt', 'ms', 'df', 'se', 'am', 'ro', 'to', 'ap', 'rr'];
        this.dadosBrasil = null;
        this.layerGroups = new Map();
        this.estadosAtivos = new Set();
        this.cores = {
            'go': '#e74c3c', 'ac': '#27ae60', 'sp': '#3498db', 'rj': '#9b59b6',
            'mg': '#f39c12', 'rs': '#1abc9c', 'pr': '#e67e22', 'sc': '#2ecc71',
            'ba': '#34495e', 'pe': '#16a085', 'ce': '#f1c40f', 'pa': '#8e44ad',
            'ma': '#c0392b', 'pb': '#d35400', 'es': '#7f8c8d', 'pi': '#2c3e50',
            'al': '#95a5a6', 'rn': '#e8daef', 'mt': '#fadbd8', 'ms': '#d5f4e6',
            'df': '#fdeaa7', 'se': '#fab1a0', 'am': '#74b9ff', 'ro': '#a29bfe',
            'to': '#fd79a8', 'ap': '#fdcb6e', 'rr': '#6c5ce7'
        };
        this.map = null;
        console.log('🏗️ MultiStateLoader construído para arquivo único do Brasil');
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

    async carregarDadosBrasil() {
        if (this.dadosBrasil) {
            console.log('📋 Dados do Brasil já carregados, reutilizando...');
            return this.dadosBrasil;
        }

        console.log('🔄 Carregando dados do Brasil...');
        
        try {
            const arquivo = '/data/geo/brazil-municipalities.geojson';
            console.log(`📁 Tentando carregar arquivo: ${arquivo}`);

            const response = await fetch(arquivo);
            console.log(`📡 Resposta do fetch:`, {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                url: response.url
            });

            if (!response.ok) {
                throw new Error(`Erro ao carregar arquivo: ${response.status} ${response.statusText}`);
            }

            const dadosGeo = await response.json();
            console.log(`📊 Dados GeoJSON carregados:`, {
                type: dadosGeo.type,
                features: dadosGeo.features?.length || 0
            });

            if (!dadosGeo || !dadosGeo.features || !Array.isArray(dadosGeo.features)) {
                throw new Error('Arquivo GeoJSON inválido ou vazio');
            }

            this.dadosBrasil = dadosGeo;
            console.log(`✅ Brasil: ${dadosGeo.features.length} municípios carregados`);

            // Analisar estrutura dos dados
            if (dadosGeo.features.length > 0) {
                const primeiroMunicipio = dadosGeo.features[0];
                console.log('🔍 Estrutura do primeiro município:', {
                    properties: Object.keys(primeiroMunicipio.properties || {}),
                    geometry: primeiroMunicipio.geometry?.type,
                    sample: primeiroMunicipio.properties
                });
            }

            return dadosGeo;
        } catch (error) {
            console.error('❌ Erro ao carregar dados do Brasil:', error);
            
            // Criar dados mock como fallback
            console.log('🎭 Criando dados mock do Brasil...');
            const dadosMock = this.criarDadosMockBrasil();
            this.dadosBrasil = dadosMock;
            return dadosMock;
        }
    }

    criarDadosMockBrasil() {
        console.log('🎭 Criando dados mock do Brasil...');
        
        const municipiosMock = [
            // Goiás
            {
                type: 'Feature',
                properties: {
                    id: '5208707',
                    name: 'Goiânia',
                    state: 'GO',
                    estado: 'GO'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-49.3, -16.7], [-49.2, -16.7], 
                        [-49.2, -16.6], [-49.3, -16.6], [-49.3, -16.7]
                    ]]
                }
            },
            {
                type: 'Feature',
                properties: {
                    id: '5201405',
                    name: 'Anápolis',
                    state: 'GO',
                    estado: 'GO'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-48.9, -16.3], [-48.8, -16.3], 
                        [-48.8, -16.2], [-48.9, -16.2], [-48.9, -16.3]
                    ]]
                }
            },
            // Acre
            {
                type: 'Feature',
                properties: {
                    id: '1200401',
                    name: 'Rio Branco',
                    state: 'AC',
                    estado: 'AC'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-67.8, -10.0], [-67.7, -10.0], 
                        [-67.7, -9.9], [-67.8, -9.9], [-67.8, -10.0]
                    ]]
                }
            },
            // São Paulo
            {
                type: 'Feature',
                properties: {
                    id: '3550308',
                    name: 'São Paulo',
                    state: 'SP',
                    estado: 'SP'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-46.8, -23.6], [-46.7, -23.6], 
                        [-46.7, -23.5], [-46.8, -23.5], [-46.8, -23.6]
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
        return props.state || props.estado || props.uf || props.UF || 
               props.sigla_uf || props.cod_estado || null;
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
        return municipios;
    }

    async carregarEstado(siglaEstado) {
        console.log(`🔄 Carregando estado ${siglaEstado.toUpperCase()}...`);
        
        // Garantir que os dados do Brasil estão carregados
        await this.carregarDadosBrasil();
        
        // Filtrar municípios do estado
        const municipiosEstado = this.filtrarMunicipiosPorEstado(siglaEstado);
        
        if (municipiosEstado.length === 0) {
            console.warn(`⚠️ Nenhum município encontrado para ${siglaEstado.toUpperCase()}`);
        }

        return {
            type: 'FeatureCollection',
            features: municipiosEstado
        };
    }

    async carregarMultiplosEstados(estados) {
        console.log(`🚀 Carregando múltiplos estados: ${estados.join(', ').toUpperCase()}`);

        // Carregar dados do Brasil uma vez
        await this.carregarDadosBrasil();

        let sucessos = 0;
        for (const estado of estados) {
            try {
                const municipios = this.filtrarMunicipiosPorEstado(estado);
                if (municipios.length > 0) {
                    sucessos++;
                }
            } catch (error) {
                console.error(`❌ Falha ao processar ${estado}:`, error);
            }
        }

        console.log(`📊 Processamento concluído: ${sucessos}/${estados.length} estados`);
        return sucessos;
    }

    getColorByParty(partido) {
        const cores = {
            // Esquerda - Vermelho
            'PT': '#dc2626', 'PSOL': '#dc2626', 'PCdoB': '#dc2626', 
            'PSB': '#ef4444', 'PDT': '#f87171',

            // Centro - Azul
            'PSDB': '#2563eb', 'CIDADANIA': '#2563eb', 'PMB': '#2563eb', 
            'PODE': '#3b82f6', 'AVANTE': '#60a5fa',

            // Centro-Direita - Laranja
            'PL': '#ea580c', 'PP': '#ea580c', 'UNIÃO': '#ea580c', 
            'REPUBLICANOS': '#ea580c', 'MDB': '#fb923c', 'PSD': '#fdba74',
            'SOLIDARIEDADE': '#fed7aa', 'PRD': '#ffedd5',

            // Direita - Laranja escuro
            'NOVO': '#c2410c', 'DC': '#9a3412',

            // Outros - Roxo
            'AGIR': '#7c3aed', 'MOBILIZA': '#8b5cf6', 'PRTB': '#a78bfa'
        };

        return cores[partido] || '#6b7280'; // Cinza para partidos não mapeados
    }

    renderizarMunicipio(feature, siglaEstado, dadosEleitorais = null) {
        if (!feature || !feature.geometry || !feature.geometry.coordinates) {
            console.warn('❌ Feature inválida:', feature);
            return null;
        }

        const props = feature.properties || {};
        const codigoMunicipio = props.id || props.code || props.codigo || 'unknown';
        const nomeMunicipio = props.name || props.nome || 'Nome não disponível';

        // Buscar dados eleitorais
        let dadosEleitorais_municipio = null;
        if (dadosEleitorais && Array.isArray(dadosEleitorais)) {
            dadosEleitorais_municipio = dadosEleitorais.find(
                d => d.codigo_municipio === codigoMunicipio && d.eleito === true
            );
        }

        // Definir cor
        let cor = this.cores[siglaEstado] || '#94a3b8';
        let fillOpacity = 0.4;

        if (dadosEleitorais_municipio) {
            cor = this.getColorByParty(dadosEleitorais_municipio.partido);
            fillOpacity = 0.7;
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

            const polygon = L.polygon(coordenadas, {
                color: '#ffffff',
                weight: 0.5,
                fillColor: cor,
                fillOpacity: fillOpacity,
                smoothFactor: 0.5
            });

            // Popup
            const popupContent = this.criarPopup(props, dadosEleitorais_municipio, siglaEstado);
            polygon.bindPopup(popupContent);

            // Hover effects
            polygon.on('mouseover', function() {
                this.setStyle({
                    weight: 2,
                    fillOpacity: fillOpacity + 0.2
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
            console.error('❌ Erro ao renderizar município:', error, feature);
            return null;
        }
    }

    criarPopup(properties, dadosEleitorais, siglaEstado) {
        const nomeMunicipio = properties.name || properties.nome || 'Nome não disponível';
        const codigoMunicipio = properties.id || properties.code || properties.codigo || 'N/A';

        let html = `
            <div style="min-width: 250px; font-family: Arial, sans-serif;">
                <h4 style="margin: 0 0 10px 0; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
                    ${nomeMunicipio}
                </h4>
                <p style="margin: 5px 0;"><strong>Estado:</strong> ${siglaEstado.toUpperCase()}</p>
                <p style="margin: 5px 0;"><strong>Código:</strong> ${codigoMunicipio}</p>
        `;

        if (dadosEleitorais) {
            const corPartido = this.getColorByParty(dadosEleitorais.partido);
            html += `
                <hr style="margin: 15px 0; border: none; border-top: 1px solid #e5e7eb;">
                <div style="background: #f9fafb; padding: 10px; border-radius: 6px; border-left: 4px solid ${corPartido};">
                    <p style="margin: 0 0 8px 0; font-weight: bold; color: #374151;">✅ Prefeito Eleito:</p>
                    <p style="margin: 5px 0; font-size: 16px; font-weight: bold; color: #111827;">${dadosEleitorais.nome_candidato}</p>
                    <p style="margin: 5px 0;">
                        <span style="background: ${corPartido}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                            ${dadosEleitorais.partido}
                        </span>
                    </p>
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
        
        let municipiosRenderizados = 0;
        let municipiosComDados = 0;

        municipios.forEach((feature, index) => {
            const polygon = this.renderizarMunicipio(feature, siglaEstado, dadosEleitorais);
            if (polygon) {
                layerGroup.addLayer(polygon);
                municipiosRenderizados++;

                const codigoMunicipio = feature.properties?.id || feature.properties?.code;
                if (dadosEleitorais?.some(d => d.codigo_municipio === codigoMunicipio && d.eleito === true)) {
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
            estadosDisponiveis: this.estadosDisponiveis.length
        };

        console.log('📊 Estatísticas atuais:', stats);
        return stats;
    }
}

export default MultiStateLoader;