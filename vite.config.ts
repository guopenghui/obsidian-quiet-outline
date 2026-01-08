import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { builtinModules } from 'node:module';
import { fileURLToPath, URL } from 'node:url';

const codemirrorExternals = [
    '@codemirror/autocomplete',
    '@codemirror/closebrackets',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/comment',
    '@codemirror/fold',
    '@codemirror/gutter',
    '@codemirror/highlight',
    '@codemirror/history',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/matchbrackets',
    '@codemirror/panel',
    '@codemirror/rangeset',
    '@codemirror/rectangular-selection',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/stream-parser',
    '@codemirror/text',
    '@codemirror/tooltip',
    '@codemirror/view',
];

const nodeBuiltins = [
    ...builtinModules,
    ...builtinModules.map((m) => `node:${m}`),
];

export default defineConfig(({ mode }) => {
    const prod = mode === 'production';

    return {
        plugins: [vue()],
        logLevel: 'info',

        // 实际不会用 dev server，但为了避免误用时出现 HMR：
        // server.hmr 可以显式关闭 HMR 连接。
        server: {
            hmr: false,
        },
        define: {
            'process.env.NODE_ENV': JSON.stringify(prod ? 'production' : 'development'),
        },

        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },

        build: {
            // 入口
            lib: {
                entry: 'src/plugin.ts',
                formats: ['cjs'],
            },

            // 输出到项目根目录（生成 ./main.js 和 ./styles.css）
            outDir: '.',
            emptyOutDir: false,
            copyPublicDir: false,

            target: 'es2022',

            // dev：inline sourcemap；prod：不输出 sourcemap
            sourcemap: prod ? false : 'inline',

            // dev：不压缩；prod：压缩 JS
            minify: prod ? 'oxc' : false,

            // 任何模式都不压缩 CSS
            cssMinify: false,

            // 汇总成单一 CSS 文件
            cssCodeSplit: false,

            // dev 模式下开启 watch（文件变更就重新生成 main.js / styles.css）
            watch: prod ? null : {},

            rolldownOptions: {
                external: [
                    'obsidian',
                    'electron',
                    ...codemirrorExternals,
                    ...nodeBuiltins,
                ],
                treeshake: true,
                output: {
                    format: 'cjs',
                    exports: 'named',

                    // 只生成一个 main.js（不产生额外 chunk）
                    inlineDynamicImports: true,

                    entryFileNames: 'main.js',

                    // 固定 CSS 输出名为 styles.css；其他资源默认按原名输出到根目录
                    assetFileNames: (assetInfo) => {
                        if (assetInfo.name?.endsWith('.css')) return 'styles.css';
                        return '[name][extname]';
                    },
                },
            },
        },
    };
});
