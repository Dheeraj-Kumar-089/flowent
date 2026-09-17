import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true
  },
  watch: {  // it will scan the changes in the files continuously (polling) to automatically reload the server if any file is changed and reflect the changes only after 300ms
    usePolling: true,  // it will use polling to scan the changes in the files  
    interval: 300,   // it will scan the changes in the files every 300ms
    ignored: ['node_modules']  // it will ignore the changes in the node_modules folder
  }
});
