import {
  CloudFrontWebDistribution,
  CloudFrontWebDistributionProps,
  FunctionEventType,
  OriginAccessIdentity,
  Function as CloudFrontFunction,
  FunctionCode,
} from '@aws-cdk/aws-cloudfront';
import { Bucket, BlockPublicAccess } from '@aws-cdk/aws-s3';
import { Construct, RemovalPolicy, Duration } from '@aws-cdk/core';

export interface WebsiteProps {
  readonly domainName?: string;
  readonly logExpiration?: Duration;
  readonly certificateArn?: string;
}

export class Website extends Construct {
  public distribution: CloudFrontWebDistribution
  public bucket: Bucket

  constructor(scope: Construct, id: string, props?: WebsiteProps) {
    super(scope, id);

    this.bucket = new Bucket(this, `${id}-assets-bucket`, {
      removalPolicy: RemovalPolicy.DESTROY,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });

    const oai = new OriginAccessIdentity(this, `${id}-oai`, {
      comment: `OAI for ${this.bucket.bucketName} website`,
    });

    this.bucket.grantRead(oai);

    let distroProps: CloudFrontWebDistributionProps = {
      errorConfigurations: [{
        errorCode: 404,
        responseCode: 200,
        responsePagePath: '/index.html',
      }],
      loggingConfig: {
        bucket: new Bucket(this, `${id}-logging-bucket`, {
          publicReadAccess: false,
          blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
          lifecycleRules: [{
            enabled: true,
            expiration: (props && props.logExpiration) ? props.logExpiration : Duration.days(14),
          }],
        }),
        prefix: 'website',
        includeCookies: false,
      },
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: this.bucket,
            originAccessIdentity: oai,
          },
          behaviors: [{
            isDefaultBehavior: true,
            functionAssociations: [{
              eventType: FunctionEventType.VIEWER_RESPONSE,
              function: new CloudFrontFunction(this, 'AddRespSecurityHeaders', {
                code: FunctionCode.fromInline(`
                  function handler(event) {
                    let { response: { headers } } = event;

                    // Set HTTP security headers
                    // Since JavaScript doesn't allow for hyphens in variable names, we use the dict["key"] notation 
                    headers['x-content-type-options'] = { value: 'nosniff' };
                    headers['x-frame-options']        = { value: 'DENY' };
                    headers['x-xss-protection']       = { value: '1; mode=block' };
                    headers['strict-transport-security'] = {
                      value: 'max-age=63072000;
                      includeSubdomains; preload'
                    };
                    headers['content-security-policy'] = {
                      value: "default-src 'none'; img-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'"
                    };
                  }
                `),
              }),
            }],
          }],
        },
      ],
    };

    if (props && props.domainName !== undefined && props.certificateArn !== undefined) {
      distroProps = this.addViewerCertificate(distroProps, [props.domainName], props.certificateArn);
    }

    this.distribution = new CloudFrontWebDistribution(this, `${id}-distribution`, distroProps);
  }

  private addViewerCertificate(props: CloudFrontWebDistributionProps, aliases: string[], acmCertificateArn: string): CloudFrontWebDistributionProps {
    return {
      viewerCertificate: {
        aliases: aliases,
        props: {
          acmCertificateArn: acmCertificateArn,
          sslSupportMethod: 'sni-only',
        },
      },
      ...props,
    };
  }
}

