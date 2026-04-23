output "public_ip" {
  description = "Elastic IP of the EC2 — point DNS here."
  value       = aws_eip.app.public_ip
}

output "site_domain" {
  description = "The hostname the app will serve on."
  value       = local.site_domain
}

output "bucket_name" {
  description = "S3 bucket holding uploads and backups."
  value       = aws_s3_bucket.uploads.bucket
}

output "s3_access_key_id" {
  description = "IAM user access key for the app (already baked into EC2 user_data)."
  value       = aws_iam_access_key.app.id
  sensitive   = true
}

output "s3_secret_access_key" {
  description = "IAM user secret (already baked into EC2 user_data). Keep out of logs."
  value       = aws_iam_access_key.app.secret
  sensitive   = true
}

output "nameservers" {
  description = "When use_route53=true: NS records for the hosted zone. Point your registrar at these."
  value       = var.use_route53 ? aws_route53_zone.main[0].name_servers : []
}
