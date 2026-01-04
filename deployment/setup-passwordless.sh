#!/bin/bash

# This script sets up passwordless sudo on the remote server
# You only need to run this ONCE

ANSIBLE_PLAYBOOK="./ansible/setup-passwordless-sudo.yml"
ANSIBLE_HOSTS="./ansible/hosts"
SSH_KEY="~/.ssh/id_rsa"

echo "=========================================="
echo "Setting up passwordless sudo"
echo "You will be prompted for the sudo password ONE TIME"
echo "=========================================="

ansible-playbook -i "$ANSIBLE_HOSTS" "$ANSIBLE_PLAYBOOK" --private-key "$SSH_KEY" --ask-become-pass

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ Passwordless sudo setup complete!"
    echo "Future deployments will not require password"
    echo "=========================================="
else
    echo ""
    echo "=========================================="
    echo "❌ Setup failed. Please check the error messages above."
    echo "=========================================="
    exit 1
fi

