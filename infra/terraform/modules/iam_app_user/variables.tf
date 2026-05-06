variable "user_name" {
  description = "IAM user name."
  type        = string
}

variable "bucket_arn" {
  description = "S3 bucket ARN the user is allowed to read/write."
  type        = string
}

variable "ecr_repo_arn" {
  description = "ECR repository ARN for push/pull permissions."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to the IAM user."
  type        = map(string)
  default     = {}
}
