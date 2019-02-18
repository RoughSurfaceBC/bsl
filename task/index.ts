/// <reference path="../typings/webpackConfig.d.ts" />
import * as path from 'path';
import * as fs from 'fs';
import * as webpack from 'webpack';
import BSL from '../typings';

interface Package {
  version: string;
}

type Config = webpack.Configuration;
const env = process.env.NODE_ENV as BSL.Env;
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const SpriteLoaderPlugin = require('svg-sprite-loader/plugin');
const TerserPlugin = require('terser-webpack-plugin');
const isDev = env === 'development' ? true : false;

function clean(outputDir: string): void {
  let files;
  if (fs.existsSync(outputDir)) {
    files = fs.readdirSync(outputDir);
    files.forEach((file) => {
      const curPath = `${outputDir}/${file}`;
      if (fs.statSync(curPath).isDirectory()) {
        clean(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(outputDir);
  }
}

function beforeComplie(dirname: string, outputDir: string, cleanDir: boolean = true, copy?: WebpackConfig['copy']): void {
  // 清空输出目录
  if (cleanDir) {
    clean(outputDir);
  }

  // 复制文件
  if (Array.isArray(copy)) {
    copy.forEach((item) => {
      let pathtemp = '';
      // 判断目标目录是否存在，不存在则一级一级的创建
      item.targetDir.split('/').forEach((dir: string) => {
        pathtemp = path.resolve(dirname, pathtemp, dir);
        if (!fs.existsSync(pathtemp)) {
          fs.mkdirSync(pathtemp);
        }
      });
      fs.copyFileSync(item.orginPath, path.join(dirname, item.targetDir, item.targetFileName));
    });
  }
}

export default function webpackConfig(params: WebpackConfig): Config {
  const { entry, dirname, publicPath, vender, cleanDir, copy, platform, cssModule } = params;
  const addVersion = params.addVersion === false ? false : true;
  const outputDir = params.outputDir || 'build';
  const pkg: Package = JSON.parse(fs.readFileSync(path.resolve(dirname, 'package.json'), { encoding: 'utf8' }));
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
    new ExtractTextPlugin({
      filename: addVersion ? `css/[name]_${version}.css` : 'css/[name].css',
      allChunks: true
    })
  ];
  const extract: any[] = [{
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
  } else  {
    plugins.push(new webpack.optimize.ModuleConcatenationPlugin());
  }

  beforeComplie(dirname, outputDir, cleanDir, copy);
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
              // 在UglifyJs删除没有用到的代码时不输出警告
              warnings: false,
              // 删除所有的 console 语句
              // 还可以兼容ie浏览器
              drop_console: true,
              // 内嵌定义了但是只用到一次的变量
              collapse_vars: true,
              // 提取出出现多次但是没有定义成变量去引用的静态值
              reduce_vars: true
            },
            output: {
              // 最紧凑的输出
              beautify: false,
              // 删除所有的注释
              comments: false,
            },
          }
        })
      ]
    }
  };
}