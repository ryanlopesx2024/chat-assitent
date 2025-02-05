const DEBUG = import.meta.env.VITE_SHOULD_DEBUG === 'true';

export function debug(...args: any[]) {
  if (DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}

// Log inicial para confirmar que o arquivo está sendo carregado
debug('Debug module loaded');

// Função para verificar o estado do DOM
export function checkDOMState() {
  debug('Checking DOM state...');
  debug('Root element:', document.getElementById('root'));
  debug('Body children:', document.body.children.length);
  debug('Document readyState:', document.readyState);
}

// Função para verificar o ambiente
export function checkEnvironment() {
  debug('Checking environment...');
  debug('NODE_ENV:', import.meta.env.MODE);
  debug('BASE_URL:', import.meta.env.BASE_URL);
  debug('DEV:', import.meta.env.DEV);
  debug('PROD:', import.meta.env.PROD);
}

// Exporta as funções de debug
export default {
  debug,
  checkDOMState,
  checkEnvironment,
};
