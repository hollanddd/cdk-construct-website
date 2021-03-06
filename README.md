# CDK Construct Website

An AWS CDK construct for hosting websites on AWS S3

- Creates a private bucket for hosting static assets
- Assert no buckets are configured as websites
- Creates an origin access identity (OAI)
- Assert bucket grants read access to origin
- Creates a distribution
- Configures distribution origin access identity (OAI)
- Configures distribution custom error responses
- Allows domain name configuration
- Enables distribution logging 
- Default log expiration to 14 days
- Allow log life cycle configuration

## Install

`npm install --save cdk-construct-website`


## Example Using AWS S3 Deployment 

```typescript
import * as cdk from '@aws-cdk/core';
import { Website } from 'cdk-construct-website';
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';

export class ExampleStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const website = new Website(this, 'Website');

    new BucketDeployment(this, 'BucketDeployment', {
      sources: [Source.asset('./dist')],
      destinationBucket: website.bucket,
      distribution: website.distribution,
      distributionPaths: ['/*'],
    });
  }
}
```

## Full Example

```typescript
import * as cdk from '@aws-cdk/core';
import { Website } from 'cdk-construct-website';
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';
import { HostedZone, ARecord, RecordTarget } from '@aws-cdk/aws-route53';
import { CloudFrontTarget } from '@aws-cdk/aws-route53-targets';
import { DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager';

export class ExampleStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domainName = new cdk.CfnParameter(this, 'DomainName', {
      type: 'String',
      description: 'Domain name',
    })

    const hostedZoneId = new cdk.CfnParameter(this, 'HostedZoneId', {
      type: 'String',
      description: 'Route53 Hosted Zone Id'
    })

    const hostedZone = HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: hostedZoneId.valueAsString,
      zoneName: domainName.valueAsString
    })

    const cert = new DnsValidatedCertificate(this, 'AwsManagedCertificate', {
      domainName: domainName.valueAsString,
      hostedZone: hostedZone,
      subjectAlternativeNames: [`*.${domainName.valueAsString}`]
    });

    const website = new Website(this, 'Website', {
      domainName: domainName.valueAsString,
      certificateArn: cert.certificateArn
    });

    new BucketDeployment(this, 'WebDeployment', {
      sources: [Source.asset('./dist')],
      destinationBucket: website.bucket,
      distribution: website.distribution,
      distributionPaths: ['/*'],
    });

    new ARecord(this, 'WebAliasRecord', {
      zone: hostedZone,
      recordName: domainName.valueAsString,
      target: RecordTarget.fromAlias(new CloudFrontTarget(website.distribution)),
    });
  }
}
```
