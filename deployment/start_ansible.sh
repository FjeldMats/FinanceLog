#!/bin/bash

# Define variables
ANSIBLE_PLAYBOOK="./ansible/deploy.yml"
ANSIBLE_HOSTS="./ansible/hosts"
SSH_KEY="~/.ssh/id_rsa" # Path to your SSH private key

# Run the Ansible playbook
# Note: Requires passwordless sudo to be configured on the remote server
# If you get permission errors, run: ./setup-passwordless.sh first
ansible-playbook -i "$ANSIBLE_HOSTS" "$ANSIBLE_PLAYBOOK" --private-key "$SSH_KEY"
