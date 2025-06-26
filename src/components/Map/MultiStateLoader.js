import L from 'leaflet'; 
class MultiStateLoader { 
        constructor() { 
            this.estadosDisponiveis = ['go', 'ac', 'sp', 'rj', 'mg', 'es']; 
            this.dadosCarregados = new Map(); this.layerGroups = new Map(); 
            this.cores = { 'go': '#e74c3c', 'ac': '#27ae60',}; 
        } 
        inicializar(map) { 
            this.map = map; 
            this.estadosDisponiveis.forEach(estado => { const layerGroup = L.layerGroup(); layerGroup.addTo(map); this.layerGroups.set(estado, layerGroup); }); 
            console.log('✅ MultiStateLoader inicializado'); 
        } 
        async carregarEstado(siglaEstado) { 
            try { 
                const arquivo = `/data/geo/brazil-municipalities-${siglaEstado.toLowerCase()}.geojson`; 
                console.log(`🔄 Carregando ${arquivo}...`); 
                const response = await 
                fetch(arquivo); 
                if (!response.ok) { 
                    throw new Error(`Erro HTTP: ${response.status}`); 
                } 
                const dadosGeo = await response.json(); 
                if (!dadosGeo.features || !Array.isArray(dadosGeo.features)) { 
                    throw new Error('Arquivo GeoJSON inválido'); 
                } 
                this.dadosCarregados.set(siglaEstado, dadosGeo); 
                console.log(`✅ ${siglaEstado.toUpperCase()}: ${dadosGeo.features.length} municípios carregados`); 
                return dadosGeo; 
            } catch (error) { 
                console.error(`❌ Erro ao carregar ${siglaEstado.toUpperCase()}:`, error); 
                throw error; 
            } 
        } 
        async carregarMultiplosEstados(estados = this.estadosDisponiveis) { 
            console.log(`🚀 Carregando estados: ${estados.join(', ').toUpperCase()}`); 
            const resultados = await Promise.allSettled( estados.map(estado => this.carregarEstado(estado)) ); 
            const sucessos = resultados.filter(r => r.status === 'fulfilled').length; 
            console.log(`📊 Carregamento concluído: ${sucessos}/${estados.length} estados`); 
            return sucessos; 
        } 
        getColorByParty(partido) { 
            const cores = { 'PT': '#ff0000', 
                            'PSOL': '#ff0000', 
                            'PCdoB': '#ff0000', 
                            'PSDB': '#0000ff', 
                            'CIDADANIA': '#0000ff', 
                            'PMB': '#0000ff', 
                            'PL': '#ff9800', 
                            'PP': '#ff9800', 
                            'UNIÃO': '#ff9800', 
                            'REPUBLICANOS': '#ff9800', 
                            'MDB': '#4caf50', 
                            'PODE': '#4caf50' 
                        }; 
            return cores[partido] || '#9c27b0'; 
        } 
        renderizarMunicipio(feature, siglaEstado, dadosEleitorais = null) { 
            const props = feature.properties; 
            const codigoMunicipio = props.id || props.codarea; 
            let dadosEleitorais_municipio = null; 
            if (dadosEleitorais) { 
                dadosEleitorais_municipio = dadosEleitorais.find( d => d.codigo_municipio === codigoMunicipio && d.eleito === true ); 
            } 
            let cor = this.cores[siglaEstado] || '#95a5a6'; let fillOpacity = 0.6; 
            if (dadosEleitorais_municipio) { 
                cor = this.getColorByParty(dadosEleitorais_municipio.partido); fillOpacity = 0.8; 
            } 
            const coordenadas = feature.geometry.coordinates[0]; 
            const polygon = L.polygon(coordenadas, { color: 'white', weight: 1, fillColor: cor, fillOpacity: fillOpacity }); 
            const popupContent = this.criarPopup(props, dadosEleitorais_municipio, siglaEstado); 
            polygon.bindPopup(popupContent);
            const layerGroup = this.layerGroups.get(siglaEstado); 
            if (layerGroup) { 
                layerGroup.addLayer(polygon); 
            } 
            return polygon; 
        } 
        criarPopup(properties, dadosEleitorais, siglaEstado) { 
            const nomeMunicipio = properties.name || properties.nome || 'Nome não disponível'; 
            const codigoMunicipio = properties.id || properties.codarea || 'N/A'; 
            let html = ` <div style="min-width: 250px;"> <h4 style="margin: 0 0 10px 0; color: #2c3e50;">${nomeMunicipio}</h4> <p><strong>Estado:</strong> ${siglaEstado.toUpperCase()}</p> <p><strong>Código:</strong> ${codigoMunicipio}</p> `; 
            if (dadosEleitorais) { 
                html += ` <hr style="margin: 10px 0;"> <p><strong>✅ Prefeito Eleito:</strong></p> <p>${dadosEleitorais.nome_candidato}</p> <p><strong>Partido:</strong> ${dadosEleitorais.partido}</p> <p><strong>Votos:</strong> ${dadosEleitorais.votos?.toLocaleString() || 'N/A'}</p> `; 
            } else { html += `<p style="color: #7f8c8d;"><em>Dados eleitorais não disponíveis</em></p>`; 

            } 
            html += '</div>'; return html; 
        } 
        async renderizarTodos(dadosEleitorais = null) { 
            console.log('🎨 Renderizando municípios no mapa...'); 
            let totalMunicipios = 0; let municipiosComDados = 0; 
            for (const [siglaEstado, dadosGeo] of this.dadosCarregados) { 
                const layerGroup = this.layerGroups.get(siglaEstado);
                if (layerGroup) { 
                    layerGroup.clearLayers(); 
                } 
                dadosGeo.features.forEach(feature => { 
                    this.renderizarMunicipio(feature, siglaEstado, dadosEleitorais); 
                    totalMunicipios++; 
                    const codigoMunicipio = feature.properties.id || feature.properties.codarea; 
                    if (dadosEleitorais?.some(d => d.codigo_municipio === codigoMunicipio && d.eleito === true)) { 
                        municipiosComDados++; 
                    } 
                }); 
                console.log(`✅ ${siglaEstado.toUpperCase()}: ${dadosGeo.features.length} municípios renderizados`);
            } console.log(`🎉 Renderização concluída: ${totalMunicipios} municípios total`); 
            return { totalMunicipios, municipiosComDados }; 
        } 
        mostrarEstado(siglaEstado, mostrar = true) { 
            const layerGroup = this.layerGroups.get(siglaEstado); 
            if (layerGroup) { 
                if (mostrar) { 
                    layerGroup.addTo(this.map); 
                } else {
                    this.map.removeLayer(layerGroup); 
                } 
            } 
        }
        obterEstatisticas() { 
            const stats = { estadosCarregados: this.dadosCarregados.size, totalMunicipios: 0, porEstado: {} }; 
            for (const [estado, dados] of this.dadosCarregados) { 
                const quantidade = dados.features.length; 
                stats.totalMunicipios += quantidade; 
                stats.porEstado[estado] = quantidade; 
            } return stats; 
        } 
    } 
    export default MultiStateLoader;
