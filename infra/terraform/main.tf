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
      Project   = "DHiBob"
      Env       = "prod"
      ManagedBy = "terraform"
    }
  }
}
