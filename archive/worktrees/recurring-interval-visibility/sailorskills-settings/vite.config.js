import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        dashboard: resolve(__dirname, 'src/views/dashboard.html'),
        emailManager: resolve(__dirname, 'src/views/email-manager.html'),
        emailLogs: resolve(__dirname, 'src/views/email-logs.html'),
        users: resolve(__dirname, 'src/views/users.html'),
        integrations: resolve(__dirname, 'src/views/integrations.html'),
        systemConfig: resolve(__dirname, 'src/views/system-config.html'),
      },
    },
  },
  server: {
    port: 5178,
  },
});
