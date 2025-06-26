import L from 'leaflet';

class MultiStateLoader {
    constructor() {
        this.estadosDisponiveis = ['go', 'ac'];
        this.dadosCarregados = new Map();
        this.layerGroups = new Map();
        this.cores = {
            'go': '#e74c3c',
            'ac': '#27ae60'
        };
        this.map = null;
        console.log('🏗️ MultiStateLoader construído');
    }

    inicializar(map) {
        console.log('🔧 Iniciando inicialização do MultiStateLoader...');
        console.log('📋 Mapa recebido:', map);
        
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

    async carregarEstado(siglaEstado) {
        console.log(`🔄 Iniciando carregamento de ${siglaEstado.toUpperCase()}...`);
        
        try {
            const arquivo = `/data/geo/brazil-municipalities-${siglaEstado.toLowerCase()}.geojson`;
            console.log(`📁 Tentando carregar arquivo: ${arquivo}`);

            const response = await fetch(arquivo);
            console.log(`📡 Resposta do fetch:`, {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                url: response.url
            });

            if (!response.ok) {
                console.warn(`⚠️ Arquivo não encontrado: ${arquivo} (Status: ${response.status})`);
                console.log(`🔧 Criando dados mock para ${siglaEstado.toUpperCase()}`);
                
                const dadosMock = this.criarDadosMock(siglaEstado);
                this.dadosCarregados.set(siglaEstado, dadosMock);
                console.log(`✅ Dados mock criados para ${siglaEstado.toUpperCase()}: ${dadosMock.features.length} municípios`);
                return dadosMock;
            }

            const dadosGeo = await response.json();
            console.log(`📊 Dados GeoJSON carregados:`, {
                type: dadosGeo.type,
                features: dadosGeo.features?.length || 0,
                firstFeature: dadosGeo.features?.[0]
            });

            if (!dadosGeo || !dadosGeo.features || !Array.isArray(dadosGeo.features)) {
                throw new Error(`Arquivo GeoJSON inválido ou vazio: ${arquivo}`);
            }

            this.dadosCarregados.set(siglaEstado, dadosGeo);
            console.log(`✅ ${siglaEstado.toUpperCase()}: ${dadosGeo.features.length} municípios carregados do arquivo real`);

            return dadosGeo;
        } catch (error) {
            console.error(`❌ Erro ao carregar ${siglaEstado.toUpperCase()}:`, error);
            
            // Sempre criar dados mock em caso de erro
            console.log(`🔧 Criando dados mock para ${siglaEstado.toUpperCase()} devido ao erro`);
            const dadosMock = this.criarDadosMock(siglaEstado);
            this.dadosCarregados.set(siglaEstado, dadosMock);
            console.log(`✅ Dados mock criados para ${siglaEstado.toUpperCase()}: ${dadosMock.features.length} municípios`);
            return dadosMock;
        }
    }

    // Criar dados mock para teste
    criarDadosMock(siglaEstado) {
        console.log(`🎭 Criando dados mock para ${siglaEstado.toUpperCase()}...`);
        
        const dadosMock = {
            'go': {
                features: [
                    {
                        type: 'Feature',
                        properties: {
                            id: '92010',
                            name: 'Goiânia',
                            codarea: '92010'
                        },
                        geometry: {
                            type: 'Polygon',
                            coordinates: [[
                                [-49.3, -16.7],
                                [-49.2, -16.7], 
                                [-49.2, -16.6],
                                [-49.3, -16.6],
                                [-49.3, -16.7]
                            ]]
                        }
                    },
                    {
                        type: 'Feature',
                        properties: {
                            id: '92215',
                            name: 'Anápolis',
                            codarea: '92215'
                        },
                        geometry: {
                            type: 'Polygon',
                            coordinates: [[
                                [-48.9, -16.3],
                                [-48.8, -16.3],
                                [-48.8, -16.2],
                                [-48.9, -16.2],
                                [-48.9, -16.3]
                            ]]
                        }
                    }
                ]
            },
            'ac': {
                features: [
                    {
                        type: 'Feature',
                        properties: {
                            id: 'ac001',
                            name: 'Rio Branco',
                            codarea: 'ac001'
                        },
                        geometry: {
                            type: 'Polygon',
                            coordinates: [[
                                [-67.8, -10.0],
                                [-67.7, -10.0],
                                [-67.7, -9.9],
                                [-67.8, -9.9],
                                [-67.8, -10.0]
                            ]]
                        }
                    }
                ]
            }
        };

        const dados = {
            type: 'FeatureCollection',
            features: dadosMock[siglaEstado]?.features || []
        };

        console.log(`🎭 Dados mock criados para ${siglaEstado}:`, dados);
        return dados;
    }

    async carregarMultiplosEstados(estados = this.estadosDisponiveis) {
        console.log(`🚀 Carregando múltiplos estados: ${estados.join(', ').toUpperCase()}`);

        let sucessos = 0;
        for (const estado of estados) {
            try {
                await this.carregarEstado(estado);
                sucessos++;
            } catch (error) {
                console.error(`❌ Falha ao carregar ${estado}:`, error);
            }
        }

        console.log(`📊 Carregamento concluído: ${sucessos}/${estados.length} estados`);
        return sucessos;
    }

    getColorByParty(partido) {
        const cores = {
            // Esquerda
            'PT': '#ff0000',
            'PSOL': '#ff0000',
            'PCdoB': '#ff0000',
            'PSB': '#ff4444',
            'PDT': '#ff6666',

            // Centro
            'PSDB': '#0000ff',
            'CIDADANIA': '#0000ff',
            'PMB': '#0000ff',
            'PODE': '#4444ff',
            'AVANTE': '#6666ff',

            // Centro-Direita
            'PL': '#ff9800',
            'PP': '#ff9800',
            'UNIÃO': '#ff9800',
            'REPUBLICANOS': '#ff9800',
            'MDB': '#ffaa44',
            'PSD': '#ffbb44',
            'SOLIDARIEDADE': '#ffcc44',
            'PRD': '#ffdd44',

            // Direita
            'NOVO': '#ff6600',
            'DC': '#ff7700',

            // Outros
            'AGIR': '#9c27b0',
            'MOBILIZA': '#9c27b0',
            'PRTB': '#9c27b0'
        };

        return cores[partido] || '#9c27b0';
    }

    renderizarMunicipio(feature, siglaEstado, dadosEleitorais = null) {
        console.log(`🎨 Renderizando município:`, {
            estado: siglaEstado,
            municipio: feature.properties?.name || 'Nome não disponível',
            id: feature.properties?.id || feature.properties?.codarea
        });

        if (!feature || !feature.geometry || !feature.geometry.coordinates) {
            console.warn('❌ Feature inválida:', feature);
            return null;
        }

        const props = feature.properties || {};
        const codigoMunicipio = props.id || props.codarea || 'unknown';

        // Buscar dados eleitorais
        let dadosEleitorais_municipio = null;
        if (dadosEleitorais && Array.isArray(dadosEleitorais)) {
            dadosEleitorais_municipio = dadosEleitorais.find(
                d => d.codigo_municipio === codigoMunicipio && d.eleito === true
            );
        }

        // Definir cor e opacidade
        let cor = this.cores[siglaEstado] || '#95a5a6';
        let fillOpacity = 0.6;

        if (dadosEleitorais_municipio) {
            cor = this.getColorByParty(dadosEleitorais_municipio.partido);
            fillOpacity = 0.8;
            console.log(`🎯 Dados eleitorais encontrados para ${props.name}: ${dadosEleitorais_municipio.nome_candidato} (${dadosEleitorais_municipio.partido})`);
        }

        try {
            // Processar coordenadas para Leaflet (inverter lng,lat para lat,lng)
            let coordenadas;
            if (feature.geometry.type === 'Polygon') {
                coordenadas = feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
            } else if (feature.geometry.type === 'MultiPolygon') {
                coordenadas = feature.geometry.coordinates[0][0].map(coord => [coord[1], coord[0]]);
            } else {
                console.warn('⚠️ Tipo de geometria não suportado:', feature.geometry.type);
                return null;
            }

            console.log(`📍 Coordenadas processadas para ${props.name}:`, coordenadas.slice(0, 3));

            const polygon = L.polygon(coordenadas, {
                color: 'white',
                weight: 1,
                fillColor: cor,
                fillOpacity: fillOpacity
            });

            const popupContent = this.criarPopup(props, dadosEleitorais_municipio, siglaEstado);
            polygon.bindPopup(popupContent);

            const layerGroup = this.layerGroups.get(siglaEstado);
            if (layerGroup) {
                layerGroup.addLayer(polygon);
                console.log(`✅ Polígono adicionado ao layer group de ${siglaEstado}`);
            } else {
                console.warn(`❌ Layer group não encontrado para ${siglaEstado}`);
            }

            return polygon;
        } catch (error) {
            console.error('❌ Erro ao renderizar município:', error, feature);
            return null;
        }
    }

    criarPopup(properties, dadosEleitorais, siglaEstado) {
        const nomeMunicipio = properties.name || properties.nome || 'Nome não disponível';
        const codigoMunicipio = properties.id || properties.codarea || 'N/A';

        let html = `
            <div style="min-width: 250px;">
                <h4 style="margin: 0 0 10px 0; color: #2c3e50;">${nomeMunicipio}</h4>
                <p><strong>Estado:</strong> ${siglaEstado.toUpperCase()}</p>
                <p><strong>Código:</strong> ${codigoMunicipio}</p>
        `;

        if (dadosEleitorais) {
            html += `
                <hr style="margin: 10px 0;">
                <p><strong>✅ Prefeito Eleito:</strong></p>
                <p>${dadosEleitorais.nome_candidato}</p>
                <p><strong>Partido:</strong> ${dadosEleitorais.partido}</p>
                <p><strong>Votos:</strong> ${dadosEleitorais.votos?.toLocaleString() || 'N/A'}</p>
                <p><strong>Percentual:</strong> ${dadosEleitorais.percentual}%</p>
            `;
        } else {
            html += `<p style="color: #7f8c8d;"><em>Dados eleitorais não disponíveis</em></p>`;
        }

        html += '</div>';
        return html;
    }

    async renderizarTodos(dadosEleitorais = null) {
        console.log('🎨 Iniciando renderização de todos os municípios...');
        console.log(`📊 Dados eleitorais disponíveis: ${dadosEleitorais?.length || 0} registros`);
        console.log(`🗺️ Estados carregados: ${Array.from(this.dadosCarregados.keys()).join(', ')}`);

        if (!this.map) {
            console.error('❌ Mapa não inicializado');
            return { totalMunicipios: 0, municipiosComDados: 0 };
        }

        let totalMunicipios = 0;
        let municipiosComDados = 0;
        let municipiosRenderizados = 0;

        for (const [siglaEstado, dadosGeo] of this.dadosCarregados) {
            console.log(`🎯 Renderizando estado: ${siglaEstado.toUpperCase()}`);
            console.log(`📋 Municípios para renderizar: ${dadosGeo.features?.length || 0}`);

            const layerGroup = this.layerGroups.get(siglaEstado);

            if (!layerGroup) {
                console.warn(`❌ Layer group não encontrado para ${siglaEstado}`);
                continue;
            }

            // Limpar layers existentes
            layerGroup.clearLayers();
            console.log(`🧹 Layer group limpo para ${siglaEstado}`);

            // Renderizar cada município
            if (dadosGeo.features && Array.isArray(dadosGeo.features)) {
                dadosGeo.features.forEach((feature, index) => {
                    const polygon = this.renderizarMunicipio(feature, siglaEstado, dadosEleitorais);
                    if (polygon) {
                        totalMunicipios++;
                        municipiosRenderizados++;

                        const codigoMunicipio = feature.properties?.id || feature.properties?.codarea;
                        if (dadosEleitorais?.some(d => d.codigo_municipio === codigoMunicipio && d.eleito === true)) {
                            municipiosComDados++;
                        }

                        if (index < 3) { // Log apenas os primeiros 3 para não spammar
                            console.log(`✅ Município ${index + 1} renderizado: ${feature.properties?.name}`);
                        }
                    }
                });
            }

            // Adicionar layer group ao mapa
            try {
                layerGroup.addTo(this.map);
                console.log(`📍 Layer group de ${siglaEstado.toUpperCase()} adicionado ao mapa`);
            } catch (error) {
                console.error(`❌ Erro ao adicionar layer group de ${siglaEstado} ao mapa:`, error);
            }

            console.log(`✅ ${siglaEstado.toUpperCase()}: ${municipiosRenderizados} municípios renderizados de ${dadosGeo.features?.length || 0} disponíveis`);
        }

        const resultado = { totalMunicipios, municipiosComDados, municipiosRenderizados };
        console.log(`🎉 Renderização concluída:`, resultado);
        return resultado;
    }

    mostrarEstado(siglaEstado, mostrar = true) {
        console.log(`👁️ ${mostrar ? 'Mostrando' : 'Ocultando'} estado: ${siglaEstado.toUpperCase()}`);
        
        const layerGroup = this.layerGroups.get(siglaEstado);
        if (layerGroup && this.map) {
            if (mostrar) {
                layerGroup.addTo(this.map);
                console.log(`✅ ${siglaEstado.toUpperCase()} adicionado ao mapa`);
            } else {
                this.map.removeLayer(layerGroup);
                console.log(`✅ ${siglaEstado.toUpperCase()} removido do mapa`);
            }
        } else {
            console.warn(`❌ Layer group ou mapa não encontrado para ${siglaEstado}`);
        }
    }

    obterEstatisticas() {
        const stats = {
            estadosCarregados: this.dadosCarregados.size,
            totalMunicipios: 0,
            porEstado: {}
        };

        for (const [estado, dados] of this.dadosCarregados) {
            const quantidade = dados.features?.length || 0;
            stats.totalMunicipios += quantidade;
            stats.porEstado[estado] = quantidade;
        }

        console.log('📊 Estatísticas atuais:', stats);
        return stats;
    }
}

export default MultiStateLoader;