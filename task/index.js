"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const clean_1 = require("./clean");
const env = process.env.NODE_ENV;
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const SpriteLoaderPlugin = require('svg-sprite-loader/plugin');
const TerserPlugin = require('terser-webpack-plugin');
const isDev = env === 'development' ? true : false;
function cleanDir(dirname, outputDir, execClean = true, copy) {
    if (execClean) {
        clean_1.default(path.resolve(dirname, outputDir));
    }
    if (Array.isArray(copy)) {
        copy.forEach((item) => {
            let pathtemp = '';
            item.targetDir.split('/').forEach((dir) => {
                pathtemp = path.resolve(dirname, pathtemp, dir);
                if (!fs.existsSync(pathtemp)) {
                    fs.mkdirSync(pathtemp);
                }
            });
            fs.copyFileSync(item.orginPath, path.join(dirname, item.targetDir, item.targetFileName));
        });
    }
}
function webpackConfig(params) {
    const { entry, dirname, publicPath, historyMode, vender, execClean, copy, platform, cssModule } = params;
    const addVersion = params.addVersion === false ? false : true;
    const outputDir = params.outputDir || 'build';
    const pkg = JSON.parse(fs.readFileSync(path.resolve(dirname, 'package.json'), { encoding: 'utf8' }));
    const version = pkg.version;
    const filename = addVersion ? `[name]_${version}.js` : '[name].js';
    const tsInclude = params.tsInclude || [];
    const plugins = [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify(env),
                version: JSON.stringify(version),
                outputDir: JSON.stringify(outputDir),
                publicPath: JSON.stringify(publicPath),
                historyMode: JSON.stringify(historyMode),
            },
        }),
        new webpack.NoEmitOnErrorsPlugin(),
        new SpriteLoaderPlugin(),
        new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /de|fr|hu/),
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        new ExtractTextPlugin({
            filename: addVersion ? `css/[name]_${version}.css` : 'css/[name].css',
            allChunks: true
        })
    ];
    const extract = [{
            loader: 'postcss-loader',
            options: {
                ident: 'postcss',
                plugins: [
                    require('autoprefixer')({
                        browsers: platform === '桌面' ? ['Firefox > 20', 'ie > 9', 'chrome > 39'] : ['iOS >= 7', 'Android >= 4']
                    }),
                ],
                sourceMap: isDev
            }
        }, {
            loader: 'sass-loader',
            options: {
                outputStyle: 'expanded',
                sourceMap: isDev
            }
        }, {
            loader: 'sass-resources-loader',
            options: {
                resources: [
                    path.resolve(__dirname, '../style/mixins.scss'),
                    path.resolve(dirname, './node_modules/yuejia-pro/theme/index.scss'),
                ]
            },
        }];
    if (cssModule !== false) {
        extract.unshift({
            loader: 'typings-for-css-modules-loader',
            options: {
                modules: true,
                namedExport: true,
                camelCase: true,
                minimize: !isDev,
                localIdentName: '[local]_[hash:base64:5]'
            }
        });
    }
    if (isDev && vender !== false) {
        plugins.push(new webpack.DllReferencePlugin({
            context: 'bsl',
            manifest: require('../vender/manifest.json')
        }));
    }
    else {
        plugins.push(new webpack.optimize.ModuleConcatenationPlugin());
    }
    cleanDir(dirname, outputDir, execClean, copy);
    return {
        entry: entry || {
            index: path.resolve(dirname, './src/entry/index.tsx'),
        },
        devtool: isDev ? 'inline-source-map' : false,
        output: {
            publicPath,
            path: path.resolve(dirname, outputDir),
            filename: './js/' + filename,
            chunkFilename: 'js/' + filename
        },
        module: {
            rules: [{
                    test: /\.(ts|tsx)$/,
                    enforce: 'pre',
                    loader: 'tslint-loader',
                    include: [
                        path.resolve(dirname, 'src'),
                        ...tsInclude
                    ],
                    options: {
                        configFile: path.resolve(dirname, './tslint.json'),
                        tsConfigFile: path.resolve(dirname, './tsconfig.json'),
                    }
                }, {
                    test: /.tsx?$/,
                    loaders: ['ts-loader'],
                    include: [
                        path.resolve(dirname, 'src'),
                        path.resolve(dirname, 'node_modules/yuejia'),
                        path.resolve(dirname, 'node_modules/yuejia-new'),
                        path.resolve(dirname, 'node_modules/yuejia-pro'),
                        ...tsInclude
                    ]
                }, {
                    test: /\.svg$/,
                    loader: 'svg-sprite-loader',
                    options: {
                        extract: true,
                        esModule: false,
                        spriteFilename: `/svg/sprite_${pkg.version}.svg`
                    }
                }, {
                    test: /\.(png|jpg|gif)$/,
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                        outputPath: 'img/'
                    }
                }, {
                    test: /\.(scss)$/,
                    use: ExtractTextPlugin.extract({
                        use: extract
                    })
                }]
        },
        resolve: {
            alias: {
                moment$: 'moment/moment.js'
            },
            extensions: ['.webpack.js', '.web.js', '.js', '.jsx', '.tsx', '.ts', '.web.ts', '.scss', '.css'],
            modules: isDev ? [path.resolve(dirname, 'node_modules')] : undefined,
            mainFields: isDev ? ['jsnext:main', 'main'] : undefined
        },
        externals: isDev ? {
            'react/addons': true,
            'react/lib/ExecutionEnvironment': true,
            'react/lib/ReactContext': true,
            'react-addons-test-utils': 'react-dom',
            'socket.io-client': 'io'
        } : {
            'sockjs-client': 'SockJS',
            'socket.io-client': 'io'
        },
        plugins,
        stats: {
            children: false,
            chunks: false,
            chunkModules: false,
            chunkOrigins: false,
            entrypoints: false,
            reasons: false,
            source: false,
            modules: false,
            excludeAssets: [/\.(png|jpg|gif)$/]
        },
        optimization: {
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        ecma: 5,
                        compress: {
                            warnings: false,
                            drop_console: true,
                            collapse_vars: true,
                            reduce_vars: true
                        },
                        output: {
                            beautify: false,
                            comments: false,
                        },
                    }
                })
            ]
        }
    };
}
exports.default = webpackConfig;
