const { defineConfig, globalIgnores } = require('eslint/config');
const eslintJs = require('@eslint/js');
const jestPlugin = require('eslint-plugin-jest');
const lwcRecommended = require('@salesforce/eslint-config-lwc/recommended');
const lwcI18n = require('@salesforce/eslint-config-lwc/i18n');
const prettierConfig = require('eslint-config-prettier');
const globals = require('globals');

module.exports = defineConfig([
    globalIgnores([
        '**/node_modules/**',
        '**/staticresources/**',
        '.sf/**',
        '.sfdx/**',
        '.localdevserver/**',
        'coverage/**'
    ]),

    // LWC configuration: Salesforce recommended rules + i18n (currency/date formatting)
    {
        files: ['**/lwc/**/*.js'],
        extends: [lwcRecommended, lwcI18n],
        rules: {
            // LWC best practices not enabled by the recommended preset
            '@lwc/lwc/no-leaky-event-listeners': 'error',
            '@lwc/lwc/no-unknown-wire-adapters': 'error',
            '@lwc/lwc/valid-wire': 'error',
            '@lwc/lwc/no-deprecated': 'error',

            // Project rule: no @wire, only imperative Apex calls
            'no-restricted-syntax': [
                'error',
                {
                    selector: "Decorator[expression.name='wire']",
                    message: 'Use imperative Apex calls instead of @wire.'
                },
                {
                    selector: "Decorator[expression.callee.name='wire']",
                    message: 'Use imperative Apex calls instead of @wire.'
                }
            ],

            // Code quality
            'no-console': ['warn', { allow: ['error'] }],
            'no-var': 'error',
            'prefer-const': 'error',
            'object-shorthand': 'error',
            'prefer-template': 'error',
            'prefer-arrow-callback': 'error',
            'no-param-reassign': 'error',
            'no-nested-ternary': 'error',
            complexity: ['warn', 10],
            'max-depth': ['warn', 3],
            'no-unused-vars': [
                'error',
                {
                    vars: 'all',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                    caughtErrors: 'none'
                }
            ]
        }
    },

    // The logger module is the only place allowed to write to the console
    {
        files: ['**/lwc/logger/*.js'],
        rules: {
            'no-console': 'off'
        }
    },

    // LWC Jest tests
    {
        files: ['**/lwc/**/__tests__/**/*.js', '**/lwc/**/*.test.js'],
        rules: {
            '@lwc/lwc/no-unexpected-wire-adapter-usages': 'off',
            'no-console': 'off'
        },
        languageOptions: {
            globals: {
                ...globals.node
            }
        }
    },

    // Jest mocks configuration
    {
        files: ['**/jest-mocks/**/*.js'],
        languageOptions: {
            sourceType: 'module',
            ecmaVersion: 'latest',
            globals: {
                ...globals.node,
                ...globals.es2021,
                ...jestPlugin.environments.globals.globals
            }
        },
        plugins: {
            eslintJs
        },
        extends: ['eslintJs/recommended']
    },

    // Tooling config files (CommonJS, Node)
    {
        files: ['*.config.js'],
        extends: [eslintJs.configs.recommended],
        languageOptions: {
            sourceType: 'commonjs',
            globals: {
                ...globals.node
            }
        }
    },

    // Turns off stylistic rules that conflict with Prettier
    prettierConfig,

    // Re-enable after Prettier: always use braces (safe with Prettier when set to "all")
    {
        files: ['**/lwc/**/*.js'],
        rules: {
            curly: ['error', 'all']
        }
    }
]);
