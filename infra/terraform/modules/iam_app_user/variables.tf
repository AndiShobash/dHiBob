variable "user_name" {
  description = "IAM user name."
  type        = string
}

variable "bucket_arn" {
  description = "S3 bucket ARN the user is allowed to read/write."
  type        = string
}

variable "security_group_id" {
  description = "Security group ID that the CI/CD pipeline can modify (add/remove SSH ingress rules)."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to the IAM user."
  type        = map(string)
  default     = {}
}
