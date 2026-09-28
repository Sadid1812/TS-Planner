import {defineConfig} from '@playwright/test';

const external=process.env.E2E_BASE_URL;
export default defineConfig({
 testDir:'./e2e',
 fullyParallel:false,
 workers:1,
 timeout:45000,
 use:{
  baseURL:external || 'http://localhost:4181/',
  channel:process.env.E2E_CHANNEL || (process.platform==='win32'?'chrome':undefined),
  viewport:{width:1280,height:900},
  trace:'retain-on-failure',
  screenshot:'only-on-failure',
 },
 webServer:external?undefined:{command:'npm run preview -- --host localhost --port 4181 --strictPort',url:'http://localhost:4181/',reuseExistingServer:false},
});
