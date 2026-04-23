terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # Local state: sandbox accounts typically can't create an S3 state bucket
  # or a DynamoDB lock table. Move to remote state when promoting to a real
  # Develeap AWS account.
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project   = var.project
      Env       = "prod"
      ManagedBy = "terraform"
    }
  }
}

# ---------------------------------------------------------------------------
# Default VPC + first public subnet. A new VPC isn't worth the sandbox
# complexity for a single EC2.
# ---------------------------------------------------------------------------

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default_public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

locals {
  public_subnet_id = data.aws_subnets.default_public.ids[0]
}

# ---------------------------------------------------------------------------
# S3 bucket for uploads + nightly backups
# ---------------------------------------------------------------------------

module "s3" {
  source      = "./modules/s3_uploads"
  bucket_name = "${var.project}-prod-uploads"
}

# ---------------------------------------------------------------------------
# IAM user the app container uses for S3 (sandbox blocks instance profiles)
# ---------------------------------------------------------------------------

module "iam_app" {
  source     = "./modules/iam_app_user"
  user_name  = "${var.project}-app-s3"
  bucket_arn = module.s3.bucket_arn
}

# ---------------------------------------------------------------------------
# Cloud-init script rendered with module outputs
# ---------------------------------------------------------------------------

locals {
  # If Route 53 is on, the DNS module owns the final hostname. If off, the
  # user must supply site_domain_override (e.g. "<eip-dashes>.nip.io").
  site_domain = var.use_route53 ? (
    var.subdomain == "" ? var.domain_name : "${var.subdomain}.${var.domain_name}"
  ) : var.site_domain_override

  cloud_init = templatefile("${path.module}/../cloud-init/setup.sh.tftpl", {
    repo_url             = var.repo_url
    repo_branch          = var.repo_branch
    app_image            = var.app_image
    site_domain          = local.site_domain
    s3_bucket            = module.s3.bucket_name
    aws_region           = var.aws_region
    s3_access_key_id     = module.iam_app.access_key_id
    s3_secret_access_key = module.iam_app.secret_access_key
  })
}

# ---------------------------------------------------------------------------
# EC2 + EIP + security group
# ---------------------------------------------------------------------------

module "ec2_app" {
  source        = "./modules/ec2_app"
  name          = "${var.project}-app"
  vpc_id        = data.aws_vpc.default.id
  subnet_id     = local.public_subnet_id
  admin_cidr    = var.admin_cidr
  key_pair_name = var.key_pair_name
  instance_type = var.instance_type
  ebs_size_gb   = var.ebs_size_gb
  user_data     = local.cloud_init
}

# ---------------------------------------------------------------------------
# Route 53 — skipped when use_route53=false (nip.io fallback)
# ---------------------------------------------------------------------------

module "dns" {
  source      = "./modules/route53_app"
  count       = var.use_route53 ? 1 : 0
  domain_name = var.domain_name
  subdomain   = var.subdomain
  target_ip   = module.ec2_app.public_ip
}
