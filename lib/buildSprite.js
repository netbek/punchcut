/* eslint no-console: 0 */
const _ = require('lodash');
const chalk = require('chalk');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');
const Promise = require('bluebird');
const svgstore = require('svgstore');
const loadFiles = require('./loadFiles');
const {svgMin} = require('./util');

Promise.promisifyAll(fs);

/**
 *
 * @param   {Object} config
 * @returns {Promise}
 */
module.exports = function(config) {
  console.log('Building sprite: ' + chalk.cyan(config.name));

  return loadFiles(config.src)
    .then(function(files) {
      return Promise.mapSeries(files, function(file) {
        let {data} = file;

        if (config.sprite.monochrome) {
          // Remove fill attribute.
          const $ = cheerio.load(data, {
            xmlMode: true
          });
          $('[fill]').removeAttr('fill');
          data = $.xml();
        }

        // Minify SVG.
        return Promise.props(_.assign(file, {data: svgMin(data)}));
      });
    })
    .then(function(files) {
      const store = svgstore();

      _.forEach(files, function(file) {
        const extname = path.extname(file.path);
        const basename = path.basename(file.path, extname);

        store.add(config.sprite.svg.idPrefix + basename, file.data);
      });

      const data = store.toString();
      const distPath = path.resolve(
        config.sprite.svg.dist,
        config.name + '.svg'
      );
      const distDir = path.dirname(distPath);

      return fs.mkdirpAsync(distDir).then(function() {
        return fs.writeFileAsync(distPath, data, 'utf-8');
      });
    });
};