import {defineConfig} from 'vitest/config';
const remote=process.env.TEST_REMOTE_DATABASE==='true';
export default defineConfig({test:{include:['tests/**/*.test.ts'],fileParallelism:false,testTimeout:remote?120000:30000,hookTimeout:remote?120000:30000}});
