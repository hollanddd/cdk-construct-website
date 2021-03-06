# API Reference

**Classes**

Name|Description
----|-----------
[Website](#cdk-construct-website-website)|*No description*


**Structs**

Name|Description
----|-----------
[WebsiteProps](#cdk-construct-website-websiteprops)|*No description*



## class Website  <a id="cdk-construct-website-website"></a>



__Implements__: [IConstruct](#constructs-iconstruct), [IConstruct](#aws-cdk-core-iconstruct), [IConstruct](#constructs-iconstruct), [IDependable](#aws-cdk-core-idependable)
__Extends__: [Construct](#aws-cdk-core-construct)

### Initializer




```ts
new Website(scope: Construct, id: string, props?: WebsiteProps)
```

* **scope** (<code>[Construct](#aws-cdk-core-construct)</code>)  *No description*
* **id** (<code>string</code>)  *No description*
* **props** (<code>[WebsiteProps](#cdk-construct-website-websiteprops)</code>)  *No description*
  * **certificateArn** (<code>string</code>)  *No description* __*Optional*__
  * **domainName** (<code>string</code>)  *No description* __*Optional*__
  * **logExpiration** (<code>[Duration](#aws-cdk-core-duration)</code>)  *No description* __*Optional*__



### Properties


Name | Type | Description 
-----|------|-------------
**bucket** | <code>[Bucket](#aws-cdk-aws-s3-bucket)</code> | <span></span>
**distribution** | <code>[CloudFrontWebDistribution](#aws-cdk-aws-cloudfront-cloudfrontwebdistribution)</code> | <span></span>



## struct WebsiteProps  <a id="cdk-construct-website-websiteprops"></a>






Name | Type | Description 
-----|------|-------------
**certificateArn**? | <code>string</code> | __*Optional*__
**domainName**? | <code>string</code> | __*Optional*__
**logExpiration**? | <code>[Duration](#aws-cdk-core-duration)</code> | __*Optional*__



