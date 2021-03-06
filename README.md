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

## Usage

