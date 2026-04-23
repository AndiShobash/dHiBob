# Amazon Linux 2023, x86_64, resolved at plan time via SSM.
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

locals {
  site_domain = var.use_route53 ? (
    var.subdomain == "" ? var.domain_name : "${var.subdomain}.${var.domain_name}"
  ) : var.site_domain_override

  cloud_init = templatefile("${path.module}/../cloud-init/setup.sh.tftpl", {
    repo_url               = var.repo_url
    repo_branch            = var.repo_branch
    app_image              = var.app_image
    site_domain            = local.site_domain
    s3_bucket              = aws_s3_bucket.uploads.bucket
    aws_region             = var.aws_region
    s3_access_key_id       = aws_iam_access_key.app.id
    s3_secret_access_key   = aws_iam_access_key.app.secret
  })
}

resource "aws_instance" "app" {
  ami                         = data.aws_ssm_parameter.al2023.value
  instance_type               = var.instance_type
  subnet_id                   = local.public_subnet_id
  vpc_security_group_ids      = [aws_security_group.app.id]
  associate_public_ip_address = true
  key_name                    = var.key_pair_name
  user_data                   = local.cloud_init
  user_data_replace_on_change = false

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.ebs_size_gb
    delete_on_termination = false
    encrypted             = true
  }

  tags = {
    Name = "${var.project}-app"
  }

  lifecycle {
    ignore_changes = [
      ami,       # Avoid reprovisions on AMI updates; rebuild manually when wanted
      user_data, # Don't recreate the box on every cloud-init tweak
    ]
  }
}
