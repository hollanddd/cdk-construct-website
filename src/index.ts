import { CloudFrontWebDistribution, CloudFrontWebDistributionProps, OriginAccessIdentity, LambdaEdgeEventType } from '@aws-cdk/aws-cloudfront';
import { Bucket, BlockPublicAccess } from '@aws-cdk/aws-s3';
import { Construct, RemovalPolicy, Duration } from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';

export interface WebsiteProps {
  readonly domainName?: string;
  readonly logExpiration?: Duration;
  readonly certificateArn?: string;
  readonly originRequestHandler?: lambda.Function;
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

    if (props && props.originRequestHandler) {
      distroProps = this.addOriginRequestHandler(distroProps, props.originRequestHandler);
    }

    this.distribution = new CloudFrontWebDistribution(this, `${id}-distribution`, distroProps);
  }

  private addOriginRequestHandler(props: CloudFrontWebDistributionProps, handler: lambda.Function): CloudFrontWebDistributionProps {
    const handlerVersion = new lambda.Version(this, 'OriginHandlerVersion', {
      lambda: handler,
    });
    // TODO: we rely on only one item in each collection
    props.originConfigs[0].behaviors[0] = {
      isDefaultBehavior: true,
      lambdaFunctionAssociations: [
        {
          eventType: LambdaEdgeEventType.ORIGIN_REQUEST,
          lambdaFunction: handlerVersion,
        }
      ],
    };
    return props;
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

