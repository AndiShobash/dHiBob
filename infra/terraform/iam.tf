# IAM user consumed by the EC2's app container (sandbox usually blocks creating
# instance profiles/roles; swap for an instance profile on a real AWS account).

resource "aws_iam_user" "app" {
  name = "${var.project}-app-s3"
  tags = {
    Project = var.project
  }
}

data "aws_iam_policy_document" "app_s3" {
  statement {
    sid = "BucketList"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation",
    ]
    resources = [aws_s3_bucket.uploads.arn]
  }

  statement {
    sid = "ObjectRW"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["${aws_s3_bucket.uploads.arn}/*"]
  }
}

resource "aws_iam_user_policy" "app_s3" {
  name   = "${var.project}-app-s3"
  user   = aws_iam_user.app.name
  policy = data.aws_iam_policy_document.app_s3.json
}

resource "aws_iam_access_key" "app" {
  user = aws_iam_user.app.name
}
