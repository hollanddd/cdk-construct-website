import { CloudFrontWebDistribution, CloudFrontWebDistributionProps, OriginAccessIdentity } from '@aws-cdk/aws-cloudfront';
import { Bucket, BlockPublicAccess } from '@aws-cdk/aws-s3';
import { Construct, RemovalPolicy, Duration } from '@aws-cdk/core';

interface WebsiteProps {
  domainName?: string;
  logExpiration?: Duration;
  certificateArn?: string;
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

    let args = { ...props };
    if (!props || props.logExpiration == undefined) {
      args.logExpiration = Duration.days(14);
    }

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
            expiration: args.logExpiration,
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

    if (args.domainName !== undefined && args.certificateArn !== undefined) {
      distroProps = this.addViewerCertificate(distroProps, [args.domainName], args.certificateArn);
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

