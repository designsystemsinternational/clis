## Usage

First run `dynamic init`. This should be done once for every project.

## Automatic parameters

All these parameters are automatically added to the Cloudformation template and can be used with `{ Ref: "PARAM_NAME" }`.

- `environment`. Name of the current environment, which is named after the current Git branch.
- `operationsS3Bucket`. Name of the bucket used for lambda zip files.
- `[function]S3Key`. For every function, the path of the zip file of its code in the operations bucket.

# Why not?

- Serverless
  Does not use Change Sets for deployment.
