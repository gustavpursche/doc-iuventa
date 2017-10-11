const autoprefixer = require('gulp-autoprefixer');
const awspublish = require('gulp-awspublish');
const cloudfront = require('gulp-cloudfront-invalidate');
const concat = require('gulp-concat');
const cssnano = require('gulp-cssnano');
const fs = require('fs');
const gulp = require('gulp');
const gulpIf = require('gulp-if');
const gulpWebpack = require('webpack-stream');
const header = require('gulp-header');
const htmlmin = require('gulp-htmlmin');
const imagemin = require('gulp-imagemin');
const merge = require('merge-stream');
const os = require('os');
const parallelize = require('concurrent-transform');
const path = require('path');
const process = require('process');
const rename = require('gulp-rename');
const replace = require('gulp-replace');
const resize = require('gulp-image-resize')
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const striptags = require('striptags');
const { uniqueId } = require('lodash');
const webpack = require('webpack');

const S3_PATH = '/iuventa/dist/';
const ENV = process.env.ENV || 'dev';
let awsConfig;

try {
  awsConfig = require('./aws.json');
} catch(err) {
  awsConfig = {
    s3: {
      region: process.env.S3_REGION,
      params: {
        Bucket: process.env.S3_PARAMS_BUCKET,
        signatureVersion: process.env.S3_PARAMS_SIGNATUREVERSION,
      },
      accessKeyId: process.env.S3_ACCESSKEYID,
      secretAccessKey: process.env.S3_SECRETACCESSKEY,
    },

    cloudfront: {
      distributionId: process.env.CLOUDFRONT_DISTRIBUTIONID,
    }
  };
}

const cloudfrontConfig = {
  accessKeyId: awsConfig.s3.accessKeyId,
  secretAccessKey: awsConfig.s3.secretAccessKey,
  region: awsConfig.s3.region,
  bucket: awsConfig.s3.bucket,
  distribution: awsConfig.cloudfront.distributionId,
  paths: [
    `/*`,
  ],
};

const IMAGE_SIZES = {
  aside: [ 300, 400, 600, ],
  content: [ 400, 760, 980, ],
  full: [ 400, 760, 980, 1200, 2000, ],
};

let ASSET_PATH = '/dist/assets';

if (ENV === 'production') {
  ASSET_PATH = 'https://cdn.jib-collective.net/iuventa/dist/assets';
}

gulp.task('markup', [ 'styles', ], () => {
  return gulp.src('markup/**/*.html')
    .pipe(replace('{{critical-css}}', (...args) => {
      return `
        <style type="text/css">
          ${fs.readFileSync('dist/assets/styles/critical.css', 'utf-8')}
        </style>
      `;
    }))
    .pipe(replace(/{{([a-z]+) ([a-z]+=".*")}}/gi, (...args) => {
      const [match, type, rawAttrs, position] = args;
      const attrs = rawAttrs.split(' ').reduce((acc, attr) => {
        const [key, value] = attr.split('=');
        acc[key] = value.replace(/\"/gi, '');
        return acc;
      }, {});

      switch(type) {
        case 'asset':
          const package = require('./package.json');
          const cacheBust = `?version=${package.version}`;

          switch(attrs.type) {
            case 'style':
              return `${ASSET_PATH}/styles/app.css${cacheBust}`;
              break;

            case 'script':
              return `${ASSET_PATH}/scripts/app.js${cacheBust}`;
              break;

            case 'image':
              return `${ASSET_PATH}/images/${attrs.name}${cacheBust}`;
          }
          break;

        case 'thread':
          const threadFileName = `${attrs.name}-${attrs.language}.json`;
          const threads = require(path.resolve(`./assets/threads/${threadFileName}`));
          const renderEmail = (ctx) => `
            <li class="thread__list-item"
                role="tab"
                tabindex="0"
                aria-controls="email_${ctx.id}">
              <div class="email"
                   role="tabpanel"
                   id="email_${ctx.id}"
                   aria-label="${ctx.subject}">
                <img src=""
                     class="email__avatar"
                     alt="" />
                <h4 class="email__subject">${ctx.subject}</h4>
                <p class="email__recipients">${ctx.to}</p>

                <p class="email__preview">
                  ${ctx.preview}
                </p>

                <div class="email__body">
                  <span class="email__date">
                    ${ctx.date}
                    <span class="email__date-time">
                      ${ctx.time}
                    </span>
                  </span>

                  ${ctx.text}
                </div>
              </div>
            </li>
          `;

          let threadMarkup = '';

          threads.forEach(email => {
            const extendenEmail = Object.assign({
              id: uniqueId(),
              preview: striptags(email.text).substr(0, 200),
            }, email);
            threadMarkup += renderEmail(extendenEmail);
          });

          return `
            <ol class="thread__list"
                aria-live="polite"
                role="tablist">
              ${threadMarkup}
            </ol>
          `;
          break;

        case 'log':
          const logFileName = `${attrs.name}-${attrs.language}.json`;
          const log = require(path.resolve(`./assets/logs/${logFileName}`));
          const logEntry = (ctx) => `
            <li class="log__entry ${ctx.classes}">\n
              <span class="log__entry-time">\n
                ${ctx.time}\n
              </span>\n
              <p class="log__entry-content">\n
                ${ctx.text}\n
              </p>\n
            </li>\n
          `;

          let entriesMarkup = '';

          log.forEach(entry => {
            let classes = '';
            const reserved = [ 'hidden' ];
            const keys = Object.keys(entry);
            const time = keys.find(key => !reserved.includes(key));
            const text = entry[time];

            if (entry.hidden) {
              classes += 'log__entry--hidden';
            }

            entriesMarkup += logEntry({
              time,
              text,
              classes,
            });
          });

          return `
            <ol class="log__list">
              ${entriesMarkup}
            </ol>
          `;
          break;

        case 'image':
          const captionFileName = `${attrs.name}-${attrs.language}.txt`;
          const captionPath = path.resolve(`./assets/images/${captionFileName}`);
          let caption;

          try {
            caption = fs.readFileSync(captionPath, 'utf-8');
          } catch(err) {
            caption = null;
          };

          const getSourceSet = fileName => {
            const sortedSizes = Array.from(IMAGE_SIZES[attrs.type]).reverse();

            return sortedSizes.map(width => `
              ${ASSET_PATH}/images/${attrs.name}-${width}.jpg ${width}w
            `).join(', ');
          };

          const captionMarkup = caption ? `
            <figcaption class="image__caption">
              ${caption}
            </figcaption>
          ` : '';

          return `
            <figure class="${attrs.class || 'image'} image--${attrs.type}">
              <img src="${ASSET_PATH}/images/${attrs.name}-2000.jpg"
                   srcset="${getSourceSet(attrs.name)}"
                   alt="" />

              ${captionMarkup}
            </figure>
          `;
          break;
      }

      return '';
    }))
    .pipe(gulpIf(ENV === 'production', htmlmin()))
    .pipe(gulp.dest('dist/markup/'));
});

gulp.task('images', () => {
  const imageStream = merge();
  const defaults = {
    crop : false,
    imageMagick: true,
    upscale : true,
  };
  const allImageSizes =
    Object.keys(IMAGE_SIZES)
      .map(type => IMAGE_SIZES[type])
      // flatten
      .reduce((a, b) => a.concat(Array.isArray(b) ? b : b), [])
      // unique
      .filter((elem, pos, arr) => arr.indexOf(elem) === pos);

  console.log('Debug: collected image sizes:', allImageSizes);

  allImageSizes.forEach(width => {
    const options = Object.assign({}, defaults, { width });
    const stream = gulp.src('assets/images/*.jpg')
        .pipe(parallelize(
          resize(options),
          os.cpus().length
        ))
        .pipe(parallelize(
          imagemin([
            imagemin.jpegtran({
              progressive: true,
            }),
          ], {
            verbose: false,
          }),
          os.cpus().length
        ))
        .pipe(rename(path => {
          path.basename += `-${width}`;
        }));

    imageStream.add(stream);
  });

  const socialMedia = gulp.src('assets/images/social-media/**/*.jpg')
                        .pipe(gulp.dest('dist/assets/images/social-media/'));

  imageStream.pipe(gulp.dest('dist/assets/images'))

  return merge(imageStream, socialMedia);
});

gulp.task('scripts', () => {
  return gulp.src('assets/scripts/app.js')
    .pipe(gulpWebpack(require(`./webpack-config.${ENV}`), webpack))
    .pipe(gulp.dest('dist/assets/scripts/'));
});

gulp.task('fonts', () => {
  return gulp.src('assets/fonts/**/*')
    .pipe(gulp.dest('dist/assets/fonts/'));
});

gulp.task('styles', () => {
  const vars = `
      $font-path: "${ASSET_PATH}/fonts/";
  `;
  const critical = gulp.src('assets/styles/critical.scss');
  const app = gulp.src('assets/styles/app.scss');

  return merge(critical, app)
      .pipe(header(vars))
      .pipe(sass().on('error', sass.logError))
      .pipe(gulpIf(ENV !== 'production', sourcemaps.init()))
      .pipe(autoprefixer({
          browsers: [
            'Android >= 4.4',
            'last 2 versions',
            'last 4 iOS versions',
          ],
      }))
      .pipe(gulpIf(ENV === 'production', cssnano()))
      .pipe(gulpIf(ENV !== 'production', sourcemaps.write()))
      .pipe(gulp.dest('dist/assets/styles/'));
});

gulp.task('styles-inline', () => {

});

gulp.task('upload', ['build', ], () => {
  let publisher = awspublish.create(awsConfig.s3);
  const cacheTime = (60 * 60 * 24) * 14; // 14 days
  const awsHeaders = {
    'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
  };
  const gzippable = function(file) {
    const match = file.path.match(/\.(html|css|js|ttf|otf)$/gi);
    return match;
  };

  return gulp.src([
    './dist/**/**/*',
  ])
    .pipe(rename((path) => {
        path.dirname = `${S3_PATH}${path.dirname}`;
        return path;
    }))
    .pipe(gulpIf(gzippable, awspublish.gzip()))
    .pipe(publisher.cache())
    .pipe(parallelize(publisher.publish(awsHeaders), 10))
    .pipe(awspublish.reporter())
    .pipe(cloudfront(cloudfrontConfig));
});

gulp.task('watch', ['build',], () => {
  gulp.watch('assets/styles/**/*', ['styles']);
  gulp.watch('assets/scripts/**/*', ['scripts']);
  gulp.watch('assets/images/*.jpg', ['images']);
  gulp.watch([
    'markup/**/*.html',
    'assets/images/**/*.txt',
  ], ['markup']);
});

gulp.task('build', [
  'fonts',
  'images',
  'scripts',
  'markup',
]);
