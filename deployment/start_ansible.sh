#!/bin/bash

# Define variables
ANSIBLE_PLAYBOOK="./ansible/deploy.yml"
ANSIBLE_HOSTS="./ansible/hosts"
SSH_KEY="~/.ssh/id_rsa" # Path to your SSH private key

# Run the Ansible playbook
ansible-playbook -i "$ANSIBLE_HOSTS" "$ANSIBLE_PLAYBOOK" --private-key "$SSH_KEY" --ask-become-pass
