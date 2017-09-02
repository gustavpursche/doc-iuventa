# Documentary: Wie die Seenotrettung abgeschafft wurde

## Setup

- Run `npm install`
- Build with `npm run build`
- Watch for changes `npm run watch`

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
