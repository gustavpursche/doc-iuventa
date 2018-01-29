# Documentary: Wie die EU die Seenotrettung abschaffte

## Setup

- Run `npm install`
- Build with `npm run build`
- Watch for changes `npm run watch`
- Run static file server `npm run serve`, visit http://localhost:3001/dist/markup/de/

## Deploy

- Copy `aws.json.default` to `aws.json` and fill out the fields, or set the required environment variables:

  ```
    S3_ACCESSKEYID
    S3_PARAMS_BUCKET
    S3_PARAMS_SIGNATUREVERSION
    S3_REGION
    S3_SECRETACCESSKEY
    CLOUDFRONT_DISTRIBUTIONID
  ```

- To change the asset path, depending on the environment, update the `ASSET_PATH` variable in
  `gulpfile.js`

- Run `npm run publish`

## Fonts

All fonts are subsetted:

```
pyftsubset ./assets/fonts/yrsa-regular.ttf \
    --unicodes="U+0020-007A,U+00D6,U+00C4,U+00E4,U+00DC, U+00FC, U+00D6, U+00F6, U+00DF" \
    --layout-features='*' --glyph-names --symbol-cmap --legacy-cmap \
    --notdef-glyph --notdef-outline --recommended-glyphs \
    --name-IDs='*' --name-legacy --name-languages='*' \
    --with-zopfli

pyftsubset ./assets/fonts/ubuntu-mono.ttf \
    --unicodes="U+0020-007A,U+00D6,U+00C4,U+00E4,U+00DC, U+00FC, U+00D6, U+00F6, U+00DF" \
    --layout-features='*' --glyph-names --symbol-cmap --legacy-cmap \
    --notdef-glyph --notdef-outline --recommended-glyphs \
    --name-IDs='*' --name-legacy --name-languages='*' \
    --with-zopfli

pyftsubset ./assets/fonts/open-sans-condensed-bold.ttf \
    --unicodes="U+0020-007A,U+00D6,U+00C4,U+00E4,U+00DC, U+00FC, U+00D6, U+00F6, U+00DF" \
    --layout-features='*' --glyph-names --symbol-cmap --legacy-cmap \
    --notdef-glyph --notdef-outline --recommended-glyphs \
    --name-IDs='*' --name-legacy --name-languages='*' \
    --with-zopfli

pyftsubset ./assets/fonts/open-sans-regular.ttf \
    --unicodes="U+0020-007A,U+00D6,U+00C4,U+00E4,U+00DC, U+00FC, U+00D6, U+00F6, U+00DF, U+00B0" \
    --layout-features='*' --glyph-names --symbol-cmap --legacy-cmap \
    --notdef-glyph --notdef-outline --recommended-glyphs \
    --name-IDs='*' --name-legacy --name-languages='*' \
    --with-zopfli
```
