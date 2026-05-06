resource "aws_iam_user" "this" {
  name = var.user_name
  tags = var.tags
}

data "aws_iam_policy_document" "s3_rw" {
  statement {
    sid = "BucketList"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation",
      "s3:PutBucketCors",
      "s3:GetBucketCors",
    ]
    resources = [var.bucket_arn]
  }

  statement {
    sid = "ObjectRW"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["${var.bucket_arn}/*"]
  }
}

data "aws_iam_policy_document" "sg_cd" {
  count = var.security_group_id != "" ? 1 : 0

  statement {
    sid = "CDSecurityGroupIngress"
    actions = [
      "ec2:AuthorizeSecurityGroupIngress",
      "ec2:RevokeSecurityGroupIngress",
    ]
    resources = ["arn:aws:ec2:*:*:security-group/${var.security_group_id}"]
  }
}

resource "aws_iam_user_policy" "sg_cd" {
  count  = var.security_group_id != "" ? 1 : 0
  name   = "${var.user_name}-sg-cd"
  user   = aws_iam_user.this.name
  policy = data.aws_iam_policy_document.sg_cd[0].json
}

data "aws_iam_policy_document" "ecr" {
  count = var.ecr_repo_arn != "" ? 1 : 0

  statement {
    sid = "ECRAuth"
    actions = [
      "ecr:GetAuthorizationToken",
    ]
    resources = ["*"]
  }

  statement {
    sid = "ECRPushPull"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = [var.ecr_repo_arn]
  }
}

resource "aws_iam_user_policy" "ecr" {
  count  = var.ecr_repo_arn != "" ? 1 : 0
  name   = "${var.user_name}-ecr"
  user   = aws_iam_user.this.name
  policy = data.aws_iam_policy_document.ecr[0].json
}

resource "aws_iam_user_policy" "s3_rw" {
  name   = "${var.user_name}-s3"
  user   = aws_iam_user.this.name
  policy = data.aws_iam_policy_document.s3_rw.json
}

resource "aws_iam_access_key" "this" {
  user = aws_iam_user.this.name
}
