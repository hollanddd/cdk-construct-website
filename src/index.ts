import { CloudFrontWebDistribution, CloudFrontWebDistributionProps, OriginAccessIdentity } from '@aws-cdk/aws-cloudfront';
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
          behaviors: [{ isDefaultBehavior: true }],
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

