// src/utils/paths.js

/**
 * Utilitário para resolver caminhos de arquivos em diferentes ambientes
 */

// Detecta se estamos em produção no Hostinger
const isProduction = process.env.NODE_ENV === 'production';
const isHostinger = window.location.hostname.includes('datasapiens.com.br');

// Define o base path baseado no ambiente
const getBasePath = () => {
  if (isProduction && isHostinger) {
    return '/DataUrbis';
  }
  return '';
};

/**
 * Resolve o caminho completo para um arquivo
 * @param {string} relativePath - Caminho relativo do arquivo (ex: '/data/fiscal/situacao_fiscal.json')
 * @returns {string} - Caminho completo ajustado para o ambiente
 */
export const resolvePath = (relativePath) => {
  const basePath = getBasePath();
  
  // Remove a barra inicial se existir para evitar duplicação
  const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  
  const fullPath = basePath ? `${basePath}/${cleanPath}` : `/${cleanPath}`;
  
  console.log(`🔗 Resolvendo caminho: ${relativePath} -> ${fullPath}`);
  
  return fullPath;
};

/**
 * Tenta múltiplos caminhos até encontrar um que funcione
 * @param {string[]} paths - Array de caminhos possíveis
 * @returns {Promise<string>} - Primeiro caminho que retorna sucesso
 */
export const findWorkingPath = async (paths) => {
  for (const path of paths) {
    try {
      const resolvedPath = resolvePath(path);
      const response = await fetch(resolvedPath, { method: 'HEAD' });
      if (response.ok) {
        console.log(`✅ Caminho encontrado: ${resolvedPath}`);
        return resolvedPath;
      }
    } catch (error) {
      console.log(`❌ Caminho falhou: ${resolvePath(path)}`);
    }
  }
  throw new Error(`Nenhum dos caminhos funcionou: ${paths.join(', ')}`);
};

// Caminhos padrão para diferentes tipos de arquivo
export const DATA_PATHS = {
  fiscal: [
    '/data/fiscal/situacao_fiscal.json',
    'data/fiscal/situacao_fiscal.json',
    './data/fiscal/situacao_fiscal.json'
  ],
  electoral: [
    '/data/electoral/2024_prefeito.json',
    'data/electoral/2024_prefeito.json',
    './data/electoral/2024_prefeito.json'
  ],
  geo: [
    '/data/geo/brazil-municipalities.geojson',
    'data/geo/brazil-municipalities.geojson',
    './data/geo/brazil-municipalities.geojson'
  ]
};

export default {
  resolvePath,
  findWorkingPath,
  DATA_PATHS
};