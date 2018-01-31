const { AllHtmlEntities } = require('html-entities');
const autoprefixer = require('gulp-autoprefixer');
const awspublish = require('gulp-awspublish');
const cloudfront = require('gulp-cloudfront-invalidate');
const concat = require('gulp-concat');
const cssnano = require('gulp-cssnano');
const { exec } = require('child_process');
const fs = require('fs');
const gulp = require('gulp');
const gulpIf = require('gulp-if');
const gulpWebpack = require('webpack-stream');
const gutil = require('gulp-util');
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
const ttf2woff = require('gulp-ttf2woff');
const ttf2woff2 = require('gulp-ttf2woff2');
const { uniqueId } = require('lodash');
const webpack = require('webpack');

const htmlEntities = new AllHtmlEntities();

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
  aside: {
    srcset: [ 300, 400, 600, ],
    sizes: `
      (min-width: 768px) 300px,
      100vw
    `,
  },
  content: {
    srcset: [ 400, 768, 980, ],
    sizes: `
      (min-width: 768px) 768px,
      100vw
    `,
  },
  full: {
    srcset: [ 400, 768, 980, 1200, 2000, ]
  },
  // helper to generate the avatar image size, not used in content
  avatar: {
    srcset: [ 40, ]
  }
};

let ASSET_PATH = '/dist/assets';

if (ENV === 'production') {
  ASSET_PATH = 'https://cdn.jib-collective.net/iuventa/dist/assets';
}

gulp.task('markup', ['styles'], () => {
  return gulp.src('markup/**/*.html')
    .pipe(replace('{{inline-css}}', (...args) => {
      return `
        <style type="text/css">
          ${fs.readFileSync('dist/assets/styles/app.css', 'utf-8')}
        </style>
      `;
    }))
    .pipe(replace(/{{([a-z]+)\s+?([a-z]+=".*")}}/gi, (...args) => {
      const [match, type, rawAttrs, position] = args;
      const attrs = rawAttrs.split(' ').reduce((acc, attr) => {
        const [key, value] = attr.split('=');
        acc[key] = value.replace(/\"/gi, '');
        return acc;
      }, {});

      switch(type) {
        case 'assetpath':
          return ASSET_PATH;
          break;

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
                <div class="email__avatar">
                  ${ctx.avatar}
                </div>

                <h4 class="email__subject">${ctx.subject}</h4>

                <p class="email__recipients">
                  von ${ctx.from}
                </p>

                <p class="email__recipients">
                  an ${ctx.to.join(', ')}
                </p>

                <p class="email__recipients email__recipients--cc">
                  ${ctx.cc.join(', ')}
                </p>

                <p class="email__preview">
                  ${ctx.preview}
                </p>

                <span class="email__date">
                  ${ctx.date}
                  <span class="email__date-time">
                    ${ctx.time}
                  </span>
                </span>

                <div class="email__body">
                  <div>
                    ${ctx.text}
                  </div>
                </div>
              </div>
            </li>
          `;

          let threadMarkup = '';

          threads.forEach(email => {
            if (!email.hidden) {
              const logos = {
                iuventa: `
                  <svg
                   enable-background="new 0 0 119.061 119.061"
                   viewBox="0 0 100 100"
                   class="email__avatar-image email__avatar-image--iuventa">
                    <path d="M 50 0 A 50 50 0 0 0 0 50 A 50 50 0 0 0 50 100 A 50 50 0 0 0 100 50 A 50 50 0 0 0 50 0 z M 46.800781 17.451172 L 53.400391 17.451172 L 54 22.25 L 65.601562 22.25 L 68.701172 22.25 L 67.599609 27.150391 L 66.298828 27.150391 L 67.798828 38.451172 L 50 28.351562 L 32.201172 38.451172 L 33.800781 27.150391 L 32.599609 27.150391 L 31.201172 22.25 L 34.501953 22.25 L 46.099609 22.25 L 46.800781 17.451172 z M 50 30.851562 L 75 45.050781 C 75 45.050781 70.900815 48.250769 69.300781 52.451172 C 67.400059 57.249593 66.400139 63.050613 65.900391 66.050781 C 66.901567 66.050781 67.901075 66.350975 68.601562 66.851562 C 69.401159 67.4521 70.601359 67.7495 71.890625 67.650391 C 72.990071 67.650391 74.188684 67.4521 74.988281 66.851562 L 74.988281 71.951172 C 74.188684 72.55087 72.990911 72.751953 71.890625 72.751953 C 70.792019 72.751953 69.590612 72.55087 68.791016 71.951172 C 67.991419 71.350634 66.790012 71.152344 65.691406 71.152344 C 64.5928 71.152344 63.392234 71.350634 62.591797 71.951172 C 61.79304 72.55087 60.590793 72.751953 59.492188 72.751953 C 58.393582 72.751953 57.192175 72.55087 56.392578 71.951172 C 55.592981 71.350634 54.394368 71.152344 53.294922 71.152344 C 52.195476 71.152344 50.994909 71.350634 50.195312 71.951172 C 49.394876 72.55087 48.195149 72.751953 47.095703 72.751953 C 45.996257 72.751953 44.795691 72.55087 43.996094 71.951172 C 43.195657 71.350634 41.99761 71.152344 40.896484 71.152344 C 39.797039 71.152344 38.596472 71.350634 37.796875 71.951172 C 36.997278 72.55087 35.800344 72.751953 34.699219 72.751953 C 33.599773 72.751953 32.399206 72.55087 31.599609 71.951172 C 30.800013 71.350634 29.600286 71.152344 28.5 71.152344 C 27.401394 71.152344 26.199987 71.350634 25.400391 71.951172 L 25.400391 66.851562 C 26.199987 66.251025 27.400554 66.052734 28.5 66.052734 C 29.599446 66.052734 30.800013 66.251025 31.599609 66.851562 C 32.399206 67.35215 33.499664 67.650391 34.5 67.650391 C 34.300101 65.950407 33.299181 58.350718 30.900391 52.451172 C 29.300357 48.350718 25 45.050781 25 45.050781 L 50 30.851562 z M 40.201172 45.052734 C 38.701088 45.052734 37.200735 45.551718 36.099609 46.751953 L 37.701172 48.351562 C 38.400819 47.651915 39.300785 47.350723 40.201172 47.351562 L 40.201172 45.052734 z M 44.298828 46.75 L 42.699219 48.349609 C 43.398866 49.050097 43.800781 50.051625 43.800781 50.951172 L 45.998047 50.951172 C 45.998047 49.451088 45.399114 47.950235 44.298828 46.75 z M 34.400391 50.951172 C 34.400391 52.451256 34.998484 53.950496 36.099609 55.050781 L 37.800781 53.550781 C 37.100294 52.752024 36.701172 51.851558 36.701172 50.951172 L 34.400391 50.951172 z M 42.800781 53.451172 C 42.100294 54.253288 41.099878 54.550781 40.201172 54.550781 L 40.201172 56.851562 C 41.701256 56.851562 43.199316 56.251856 44.400391 55.050781 L 42.800781 53.451172 z M 28.310547 75.851562 C 29.409153 75.851563 30.610559 76.049853 31.410156 76.650391 C 32.209753 77.250928 33.406687 77.449219 34.507812 77.449219 C 35.607258 77.449219 36.807825 77.250928 37.607422 76.650391 C 38.406179 76.049853 39.606746 75.851562 40.707031 75.851562 C 41.807317 75.851563 43.007044 76.049853 43.806641 76.650391 C 44.606237 77.250928 45.804851 77.449219 46.904297 77.449219 C 48.003743 77.449219 49.206263 77.250928 50.005859 76.650391 C 50.805456 76.049853 52.00407 75.851562 53.103516 75.851562 C 54.202961 75.851563 55.402688 76.049853 56.203125 76.650391 C 57.002722 77.250928 58.202449 77.449219 59.302734 77.449219 C 60.40134 77.449219 61.601907 77.250928 62.402344 76.650391 C 63.201941 76.049853 64.401668 75.851562 65.501953 75.851562 C 66.600559 75.851563 67.801126 76.049853 68.601562 76.650391 C 69.401159 77.250928 70.599773 77.450059 71.699219 77.449219 C 72.797825 77.449219 73.999231 77.250928 74.798828 76.650391 L 74.798828 81.75 C 73.999231 82.349698 72.798664 82.548828 71.699219 82.548828 C 70.599773 82.548828 69.401159 82.349698 68.601562 81.75 C 67.801126 81.149462 66.601399 80.949219 65.501953 80.949219 C 64.402507 80.949219 63.201941 81.149462 62.402344 81.75 C 61.601907 82.349698 60.40218 82.548828 59.302734 82.548828 C 58.203289 82.548828 57.002722 82.349698 56.203125 81.75 C 55.402688 81.149462 54.203801 80.949219 53.103516 80.949219 C 52.00491 80.949219 50.805456 81.149462 50.005859 81.75 C 49.206263 82.349698 48.004582 82.548828 46.904297 82.548828 C 45.805691 82.548828 44.606237 82.349698 43.806641 81.75 C 43.007044 81.149462 41.808997 80.949219 40.707031 80.949219 C 39.608425 80.949219 38.406179 81.149462 37.607422 81.75 C 36.807825 82.349698 35.607258 82.548828 34.507812 82.548828 C 33.408367 82.548828 32.209753 82.349698 31.410156 81.75 C 30.610559 81.149462 29.409153 80.949219 28.310547 80.949219 C 27.211941 80.949219 26.011374 81.149462 25.210938 81.75 L 25.210938 76.650391 C 26.011374 76.049853 27.210261 75.851562 28.310547 75.851562 z " />
                  </svg>`,

                  mrcc: `
                    <img src="${ASSET_PATH}/images/guardia_costiera-40.png"
                         class="email__avatar-image email__avatar-image--mrcc"
                         alt="Guardia Costeria Logo" />
                  `,
              };

              let avatar = email.from.includes('@telaurus.net') ? logos.iuventa : logos.mrcc;

              threadMarkup += renderEmail({
                id: uniqueId(),
                preview: striptags(email.text).substr(0, 200),
                from: htmlEntities.encode(email.from),
                to: email.to.map(to => htmlEntities.encode(to)),
                cc: (email.cc && email.cc.map(cc => htmlEntities.encode(cc))) || [],
                text: email.text,
                subject: email.subject,
                date: email.date,
                time: email.time,
                avatar,
              });
            }
          });

          return `
            <ol class="thread__list"
                aria-live="polite"
                role="tablist">
              ${threadMarkup}
            </ol>

            <button class="thread-expand">
              Den ganzen E-Mailverkehr einblenden
            </button>
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
              <div class="log__entry-content">\n
                <p>\n
                  ${ctx.text}\n
                </p>\n
              </div>\n
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

          const getSourceSet = (fileName, type) => {
            const sortedSizes = Array.from(IMAGE_SIZES[type].srcset).reverse();

            return sortedSizes.map(width => `
              ${ASSET_PATH}/images/${fileName}-${width}.jpg ${width}w
            `).join(', ');
          };

          const getSizes = type => {
            return IMAGE_SIZES[type].sizes || '100vw';
          };

          const captionMarkup = caption ? `
            <figcaption class="image__caption">
              ${caption}
            </figcaption>
          ` : '';

          return `
            <figure class="${attrs.class || 'image'} image--${attrs.type}">
              <img src="${ASSET_PATH}/images/${attrs.name}-2000.jpg"
                   srcset="${getSourceSet(attrs.name, attrs.type)}"
                   sizes="${getSizes(attrs.type)}"
                   alt="${ caption || '' }" />

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
      .map(type => IMAGE_SIZES[type].srcset)
      // flatten
      .reduce((a, b) => a.concat(Array.isArray(b) ? b : b), [])
      // unique
      .filter((elem, pos, arr) => arr.indexOf(elem) === pos);

  gutil.log('Image sizes:', allImageSizes);

  allImageSizes.forEach(width => {
    const options = Object.assign({}, defaults, { width });
    const stream = gulp.src('assets/images/**/*.{jpg,png}')
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

  imageStream.pipe(gulp.dest('dist/assets/images'))

  return imageStream;
});

gulp.task('scripts', () => {
  return gulp.src('assets/scripts/app.js')
    .pipe(gulpWebpack(require(`./webpack-config.${ENV}`), webpack))
    .pipe(gulp.dest('dist/assets/scripts/'));
});

gulp.task('fonts-subset', callback => {
  const glyphs = {
    'yrsa-regular': [
      'U+0020-007A',
      'U+00D6',
      'U+00C4',
      'U+00E4',
      'U+00DC',
      'U+00FC',
      'U+00D6',
      'U+00F6',
      'U+00DF',
      'U+201E',
      'U+201D',
    ],
    'ubuntu-mono': [
      'U+0020-007A',
      'U+00D6',
      'U+00C4',
      'U+00E4',
      'U+00DC',
      'U+00FC',
      'U+00D6',
      'U+00F6',
      'U+00DF',
    ],
    'open-sans-regular': [
      'U+0020-007A',
      'U+00D6',
      'U+00C4',
      'U+00E4',
      'U+00DC',
      'U+00FC',
      'U+00D6',
      'U+00F6',
      'U+00DF',
      'U+00B0',
    ],
    'open-sans-condensed-bold': [
      'U+0020-007A',
      'U+00D6',
      'U+00C4',
      'U+00E4',
      'U+00DC',
      'U+00FC',
      'U+00D6',
      'U+00F6',
      'U+00DF',
      'U+201E',
      'U+201D',
    ],
  };

  const pexec = fileName => {
    return new Promise((resolve, reject) => {
      exec(`
        pyftsubset ./assets/fonts/source/${fileName}.ttf \
            --output-file="./assets/fonts/${fileName}.ttf" \
            --unicodes="${glyphs[fileName].join(',')}" \
            --layout-features='*' --glyph-names --symbol-cmap --legacy-cmap \
            --notdef-glyph --notdef-outline --recommended-glyphs \
            --name-IDs='*' --name-legacy --name-languages='*' \
            --with-zopfli
      `, (err, stdout, stderr) => resolve());
    });
  };

  const pexecs = Object.keys(glyphs).map(_ => pexec(_));

  Promise.all(pexecs).then(() => callback(null));
});

gulp.task('fonts', ['fonts-subset'], () => {
  const source = 'assets/fonts/*';
  const target = 'dist/assets/fonts/';

  const ttf = gulp.src(source)
    .pipe(gulp.dest(target));

  const woff = gulp.src(source)
    .pipe(ttf2woff())
    .pipe(gulp.dest(target));

  const woff2 = gulp.src(source)
    .pipe(ttf2woff2())
    .pipe(gulp.dest(target));

  return merge(ttf, woff, woff2);
});

gulp.task('documents', () => {
  return gulp.src('assets/documents/**/*')
    .pipe(gulp.dest('dist/assets/documents/'));
});

gulp.task('styles', () => {
  const vars = `
      $font-path: "${ASSET_PATH}/fonts/";
  `;

  return gulp.src([
    'node_modules/hint.css/hint.css',
    'assets/styles/app.scss',
  ])
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
      .pipe(concat('app.css'))
      .pipe(gulp.dest('dist/assets/styles/'));
});

gulp.task('upload', ['build'], () => {
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
  gulp.watch('assets/styles/**/*', ['markup']);
  gulp.watch('assets/scripts/**/*', ['scripts']);
  gulp.watch('assets/images/*.jpg', ['images']);
  gulp.watch([
    'markup/**/*.html',
    'assets/images/**/*.txt',
  ], ['markup']);
});

gulp.task('build', [
  'documents',
  'fonts',
  'images',
  'scripts',
  'markup',
]);
