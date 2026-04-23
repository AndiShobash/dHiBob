variable "aws_region" {
  description = "AWS region. Sandbox accounts are restricted to us-east-1."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project name used as a prefix for resource names."
  type        = string
  default     = "dhibob"
}

variable "admin_cidr" {
  description = "CIDR block allowed to SSH into the EC2. Set to your own IP (<x.x.x.x>/32)."
  type        = string
}

variable "key_pair_name" {
  description = "Name of an existing EC2 key pair in this region for SSH."
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type. t3.micro is free-tier eligible in us-east-1."
  type        = string
  default     = "t3.micro"
}

variable "ebs_size_gb" {
  description = "EBS root volume size for the EC2."
  type        = number
  default     = 20
}

variable "use_route53" {
  description = "If true, create a Route 53 hosted zone + A record. Needs the domain registered already (in this account or delegated). Default is false — sandboxes often block domain registration; nip.io works out of the box."
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "Apex domain (e.g. example.com). Required when use_route53=true."
  type        = string
  default     = ""
}

variable "subdomain" {
  description = "Subdomain for the app. The final host is \"<subdomain>.<domain_name>\"; set to empty string to use the apex."
  type        = string
  default     = "app"
}

variable "site_domain_override" {
  description = "If use_route53=false, the hostname Caddy will serve (e.g. \"52-200-1-23.nip.io\"). Wire the EC2 cloud-init SITE_DOMAIN from this."
  type        = string
  default     = ""
}

variable "app_image" {
  description = "Docker image for the Next.js app, including tag. GHCR recommended for free private hosting."
  type        = string
  default     = "ghcr.io/andishobash/dhibob:latest"
}

variable "repo_url" {
  description = "Git URL cloned on the EC2 to get docker-compose.prod.yml, Caddyfile, prisma/, etc."
  type        = string
  default     = "https://github.com/AndiShobash/dHiBob.git"
}

variable "repo_branch" {
  description = "Branch to check out on the EC2."
  type        = string
  default     = "main"
}
