data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

resource "aws_security_group" "this" {
  name        = "${var.name}-sg"
  description = "${var.name} — SSH from admin, HTTP/HTTPS from world"
  vpc_id      = var.vpc_id

  ingress {
    description = "SSH (admin only)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
  }

  ingress {
    description = "HTTP (Caddy redirects to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.tags
}

resource "aws_instance" "this" {
  ami                         = data.aws_ssm_parameter.al2023.value
  instance_type               = var.instance_type
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [aws_security_group.this.id]
  associate_public_ip_address = true
  key_name                    = var.key_pair_name
  user_data                   = var.user_data

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.ebs_size_gb
    delete_on_termination = false
    encrypted             = true
  }

  tags = merge(var.tags, { Name = var.name })

  lifecycle {
    ignore_changes = [
      ami,       # Avoid reprovisions on AMI updates; rebuild manually when wanted
      user_data, # Don't recreate the box on cloud-init tweaks — SSH in and apply instead
    ]
  }
}

resource "aws_eip" "this" {
  domain   = "vpc"
  instance = aws_instance.this.id
  tags     = merge(var.tags, { Name = var.name })
}
