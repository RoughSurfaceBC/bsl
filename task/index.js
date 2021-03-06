"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const env = process.env.NODE_ENV;
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const SpriteLoaderPlugin = require('svg-sprite-loader/plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const isDev = env === 'development' ? true : false;
function webpackConfig(params) {
    const { entry, dirname, publicPath, vender, platform, cssModule } = params;
    const addPlugins = params.plugins || [];
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
            },
        }),
        new webpack.NoEmitOnErrorsPlugin(),
        new SpriteLoaderPlugin(),
        new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /de|fr|hu/),
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        new CleanWebpackPlugin(),
        new ExtractTextPlugin({
            filename: addVersion ? `css/[name]_${version}.css` : 'css/[name].css',
            allChunks: true
        }),
        ...addPlugins
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
                        path.resolve(dirname, './node_modules/bsl'),
                        ...tsInclude
                    ]
                }, {
                    test: /\.svg$/,
                    loader: 'svg-sprite-loader',
                    options: {
                        extract: true,
                        esModule: false,
                        symbolId: (filePath) => {
                            const indexOfStr = 'src' + path.sep;
                            const srcIndex = filePath.indexOf(indexOfStr);
                            const symbolId = filePath.substr(srcIndex + indexOfStr.length).replace('.svg', '').replace(/\/|\\/g, '_');
                            // console.log('filePath', filePath)
                            return symbolId
                        },
                        spriteFilename: addVersion ? `/svg/sprite_${pkg.version}.svg` : `/svg/sprite.svg`
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
