#!/bin/bash
# Quick fix for when your public IP changes and SSH/Terraform stops working.
# Run from: ~/factories/dhibob/src/infra/terraform/
# Usage: bash ../../infra/fix-ip.sh
#   or:  bash fix-ip.sh  (if you copy it to the terraform dir)

set -euo pipefail

cd "$(dirname "$0")/../terraform" 2>/dev/null || cd "$(dirname "$0")" 2>/dev/null || true

NEW_IP=$(curl -s https://checkip.amazonaws.com)
SUBNET=$(echo "$NEW_IP" | cut -d. -f1-3).0/24

echo "Your current IP: $NEW_IP"
echo "Setting admin_cidr to: $SUBNET"

sed -i "s|^admin_cidr = .*|admin_cidr = \"$SUBNET\"|" terraform.tfvars
terraform apply -auto-approve

echo ""
echo "Done. SSH should work now:"
echo "  ssh -i ~/.ssh/dhibob-deploy.pem ec2-user@$(terraform output -raw public_ip)"
