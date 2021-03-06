import { CfnCloudFrontOriginAccessIdentity } from '@aws-cdk/aws-cloudfront';
import { CfnBucket, CfnBucketPolicy } from '@aws-cdk/aws-s3';
import { Stack, ConstructNode } from '@aws-cdk/core';

// castNode is a generic for casting construct nodes to a type
function castNode<T>(node: ConstructNode): T {
  return node.defaultChild as unknown as T;
}

// stackNodeByID iterates through all children of a stack to return the first
// child node with a matching id.
function stackNodeByID(stack: Stack, id: string): ConstructNode {
  let children = stack.node.findAll();
  for (let child of children) {
    if (child.node.id === id) {
      return child.node;
    }
  }
  return stack.node;
}

export function listStackChildren(stack: Stack) {
  let children = stack.node.findAll();
  for (let child of children) {
    console.log(child.node.id);
  }
}

// getOriginAccessIdentityFromStack returns a stacks origin access identity as a
// cloud formation construct. This is used in tests to validate references to
// realated resources.
export function getOriginAccessIdentityFromStack(stack: Stack, id: string): CfnCloudFrontOriginAccessIdentity {
  return castNode<CfnCloudFrontOriginAccessIdentity>(stackNodeByID(stack, id));
}

export function getBucketFromStack(stack: Stack, id: string): CfnBucket {
  return castNode<CfnBucket>(stackNodeByID(stack, id));
}

export function getBucketPolicyFromStack(stack: Stack, id: string): CfnBucketPolicy {
  return castNode<CfnBucketPolicy>(stackNodeByID(stack, id));
}
