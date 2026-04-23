# Reuse the default VPC + any public subnet. Sandbox accounts usually can't
# create a new VPC, and for a single EC2 we don't need to anyway.

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
