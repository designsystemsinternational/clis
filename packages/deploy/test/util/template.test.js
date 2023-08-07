import { describe, it, expect } from 'vitest';
import { mergeTemplates } from '../../src/util/templates';

describe('util/templates', () => {
  describe('mergeTemplates', () => {
    it('should correctly create missing keys', () => {
      const result = mergeTemplates({}, {});
      expect(result).toStrictEqual({
        Parameters: {},
        Resources: {},
        Outputs: {},
      });
    });
  });

  it('should correctly merge templates', () => {
    const a = {
      Parameters: {
        BucketName: {
          Description: 'Name of the S3 bucket.',
        },
      },
      Resources: {
        S3Bucket: {
          Type: 'AWS::S3::Bucket',
        },
      },
      Outputs: {
        S3URL: {
          Description: 'The URL of the S3 website. Use this to bypass caching.',
        },
      },
    };

    const b = {
      Parameters: {
        APIName: {
          Description: 'Name of the API.',
        },
      },
      Resources: {
        API: {
          Type: 'AWS::APIGateway::RestApi',
        },
      },
      Outputs: {
        APIURL: {
          Description: 'The URL of the API.',
        },
      },
    };

    const result = mergeTemplates(a, b);

    expect(result).toStrictEqual({
      Parameters: {
        BucketName: {
          Description: 'Name of the S3 bucket.',
        },
        APIName: {
          Description: 'Name of the API.',
        },
      },
      Resources: {
        S3Bucket: {
          Type: 'AWS::S3::Bucket',
        },
        API: {
          Type: 'AWS::APIGateway::RestApi',
        },
      },
      Outputs: {
        S3URL: {
          Description: 'The URL of the S3 website. Use this to bypass caching.',
        },
        APIURL: {
          Description: 'The URL of the API.',
        },
      },
    });
  });
});
