# Route 53 hosted zone + A record pointing at the Elastic IP.
# Gated by var.use_route53 — set false to fall back to nip.io (no DNS resource needed).

resource "aws_route53_zone" "main" {
  count = var.use_route53 ? 1 : 0
  name  = var.domain_name
  tags = {
    Project = var.project
  }
}

resource "aws_route53_record" "app" {
  count   = var.use_route53 ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = var.subdomain == "" ? var.domain_name : "${var.subdomain}.${var.domain_name}"
  type    = "A"
  ttl     = 300
  records = [aws_eip.app.public_ip]
}
