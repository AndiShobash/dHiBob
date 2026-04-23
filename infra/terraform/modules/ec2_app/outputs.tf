output "public_ip" {
  description = "Elastic IP attached to the instance."
  value       = aws_eip.this.public_ip
}

output "instance_id" {
  description = "EC2 instance ID."
  value       = aws_instance.this.id
}

output "security_group_id" {
  description = "Security group ID (for any follow-on rules)."
  value       = aws_security_group.this.id
}
