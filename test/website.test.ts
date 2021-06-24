import '@aws-cdk/assert/jest';
import { App, Stack, Duration } from '@aws-cdk/core';
import { Website } from '../src/index';
import {
  getBucketFromStack,
  getOriginAccessIdentityFromStack,
} from './helpers/cdk.helpers';

test('Creates a private bucket for hosting static assets', () => {
  const mockApp = new App();
  const stack = new Stack(mockApp, 'testing-stack');

  new Website(stack, 'testing');

  expect(stack).toHaveResource('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  });
});

test('Assert no buckets are configured as websites', () => {
  const mockApp = new App();
  const stack = new Stack(mockApp, 'testing-stack');

  new Website(stack, 'testing');

  expect(stack).not.toHaveResource('AWS::S3::Bucket', {
    WebsiteConfiguration: {},
  });
});

test('Creates an origin access identity (OAI)', () => {
  const mockApp = new App();
  const stack = new Stack(mockApp, 'testing-stack');

  new Website(stack, 'testing');

  expect(stack).toHaveResource('AWS::CloudFront::CloudFrontOriginAccessIdentity');
});

test('Assert bucket grants read access to origin', () => {
  const mockApp = new App();
  const stack = new Stack(mockApp, 'testing-stack');

  new Website(stack, 'testing');

  const bucket = getBucketFromStack(stack, 'testing-assets-bucket');
  const bucketId = stack.getLogicalId(bucket);
  const origin = getOriginAccessIdentityFromStack(stack, 'testing-oai');

  expect(stack).toHaveResourceLike('AWS::S3::BucketPolicy', {
    Bucket: {
      Ref: bucketId,
    },
    PolicyDocument: {
      Statement: [
        {
          Action: [
            's3:GetObject*',
            's3:GetBucket*',
            's3:List*',
          ],
          Effect: 'Allow',
          Principal: {
            CanonicalUser: {
              'Fn::GetAtt': [
                stack.getLogicalId(origin),
                'S3CanonicalUserId',
              ],
            },
          },
          Resource: [
            {
              'Fn::GetAtt': [
                bucketId,
                'Arn',
              ],
            },
            {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': [
                      bucketId,
                      'Arn',
                    ],
                  },
                  '/*',
                ],
              ],
            },
          ],
        },
      ],
    },
  });
});

test('Creates a distribution', () => {
  const mockApp = new App();
  const stack = new Stack(mockApp, 'testing-stack');

  new Website(stack, 'testing');

  expect(stack).toHaveResourceLike('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      Enabled: true,
    },
  });
});

test('Configures distribution origin access identity (OAI)', () => {
  const mockApp = new App();
  const stack = new Stack(mockApp, 'testing-stack');

  new Website(stack, 'testing');

  let origin = getOriginAccessIdentityFromStack(stack, 'testing-oai');

  expect(stack).toHaveResourceLike('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      Origins: [{
        S3OriginConfig: {
          OriginAccessIdentity: {
            'Fn::Join': [
              '',
              [
                'origin-access-identity/cloudfront/',
                { Ref: stack.getLogicalId(origin) },
              ],
            ],
          },
        },
      }],
    },
  });
});

test('Creates viewer response CloudFront Function', () => {
  const mockApp = new App();
  const stack = new Stack(mockApp, 'testing-stack');

  new Website(stack, 'testing');
  expect(stack).toHaveResourceLike('AWS::CloudFront::Function', {
    FunctionConfig: {
      Runtime: 'cloudfront-js-1.0',
    },
  });
});

test('Configures distribution viewer response headers', () => {
  const mockApp = new App();
  const stack = new Stack(mockApp, 'testing-stack');

  new Website(stack, 'testing');

  expect(stack).toHaveResourceLike('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      DefaultCacheBehavior: {
        FunctionAssociations: [
          {
            EventType: 'viewer-response',
            FunctionARN: {
              'Fn::GetAtt': [
                'testingAddRespSecurityHeadersFF07EB07',
                'FunctionARN',
              ],
            },
          },
        ],
      },
    },
  });
});

test('Configures distribution custom error responses', () => {
  const mockApp = new App();
  const stack = new Stack(mockApp, 'testing-stack');

  new Website(stack, 'testing');

  expect(stack).toHaveResourceLike('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      CustomErrorResponses: [
        {
          ErrorCode: 404,
          ResponseCode: 200,
          ResponsePagePath: '/index.html',
        },
      ],
    },
  });
});

test('Allows domain name configuration', () => {
  const mockApp = new App();
  const stack = new Stack(mockApp, 'testing-stack');

  new Website(stack, 'testing', { domainName: 'example.com', certificateArn: 'some-arn' });
  expect(stack).toHaveResourceLike('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      Aliases: ['example.com'],
      ViewerCertificate: {
        AcmCertificateArn: 'some-arn',
        SslSupportMethod: 'sni-only',
      },
    },
  });
});

test('Enables distribution logging', () => {
  const mockApp = new App();
  const stack = new Stack(mockApp, 'testing-stack');

  new Website(stack, 'testing');
  const bucket = getBucketFromStack(stack, 'testing-logging-bucket');

  expect(stack).toHaveResourceLike('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      Logging: {
        Bucket: {
          'Fn::GetAtt': [
            stack.getLogicalId(bucket),
            'RegionalDomainName',
          ],
        },
        IncludeCookies: false,
        Prefix: 'website',
      },
    },
  });
});

test('Defaults log expiration to 14 days', () => {
  const mockApp = new App();
  const stack = new Stack(mockApp, 'testing-stack');

  new Website(stack, 'testing');
  expect(stack).toHaveResourceLike('AWS::S3::Bucket', {
    LifecycleConfiguration: {
      Rules: [{ ExpirationInDays: 14, Status: 'Enabled' }],
    },
  });
});

test('Allows log life cycle configuration', () => {
  const mockApp = new App();
  const stack = new Stack(mockApp, 'testing-stack');

  new Website(stack, 'testing', { logExpiration: Duration.days(31) });
  expect(stack).toHaveResourceLike('AWS::S3::Bucket', {
    LifecycleConfiguration: {
      Rules: [{ ExpirationInDays: 31, Status: 'Enabled' }],
    },
  });
});
