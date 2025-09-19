// @see: http://eslint.cn
import js from '@eslint/js'
import configPrettier from 'eslint-config-prettier'
import pluginPrettier from 'eslint-plugin-prettier'
import tseslint from 'typescript-eslint'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import prettierRule from './prettier.config.mts'

export default [
  // 忽略文件配置
  {
    ignores: [
      'demo',
      'docs',
      'dts',
      'simple',
      '*.d.ts',
      '**/coverage',
      '**/dist',
      'vite.config.ts',
      'mock/**',
      'src/types/**',
      'webhook-receivers/**', // 忽略 webhook 接收器目录
      '*.sh',
      'node_modules',
      '*.md',
      '*.woff',
      '*.ttf',
      '.vscode',
      '.idea',
      '/public',
      '/docs',
      '.husky',
      '.local',
      '/bin',
      '/src/mock/*',
      'stats.html',
      '',
      'logs',
      '*.log',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      'pnpm-debug.log*',
      'lerna-debug.log*',
      'dist-ssr',
      '*.local',
      '.vscode/*',
      '!.vscode/extensions.json',
      '!.vscode/settings.json',
      '.DS_Store',
      '*.suo',
      '*.ntvs*',
      '*.njsproj',
      '*.sln',
      '*.sw?',
      'watch.ts'
    ]
  },

  // JavaScript 推荐配置
  js.configs.recommended,

  // TypeScript 推荐配置
  ...tseslint.configs.recommended,

  // 全局基础配置 - 适用于所有 JS/TS 文件
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // globals: GlobalType,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      prettier: pluginPrettier,
      '@typescript-eslint': tseslint.plugin
    },
    rules: {
      // Prettier 规则
      ...configPrettier.rules,
      'prettier/prettier': ['error', prettierRule],
      // TypeScript 规则
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // 一般规则
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-console': process.env.NODE_ENV === 'production' ? 'off' : 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-var': 'error', // 要求使用 let 或 const 而不是 var
      'no-multiple-empty-lines': ['error', { max: 1 }], // 不允许多个空行
      'prefer-const': 'warn', // 使用 let 关键字声明但在初始分配后从未重新分配的变量，要求使用 const
      'no-use-before-define': 'off', // 禁止在 函数/类/变量 定义之前使用它们
      'sort-imports': ['error', { ignoreDeclarationSort: true }] // 对导入语句进行排序，但忽略声明排序
    }
  },
  // JavaScript 文件配置
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    rules: {}
  },
  // TypeScript 文件配置
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json'
      }
    },
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off'
      // '@typescript-eslint/no-floating-promises': 'error',
      // '@typescript-eslint/await-thenable': 'error',
      // '@typescript-eslint/no-misused-promises': 'error'
    }
  },
  // 测试文件配置
  {
    files: ['**/*.{spec,test}.{js,ts,jsx,tsx}', '**/tests/**/*.{js,ts,jsx,tsx}'],
    rules: {
      // 可以放宽对测试文件的一些限制
    }
  }
]
