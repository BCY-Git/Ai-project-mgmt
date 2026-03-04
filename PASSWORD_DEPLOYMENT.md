# Password-Based Deployment Guide

This guide explains how to use the password-based deployment scripts for the AI Project Management System.

## Overview

When SSH key authentication is not available or convenient, you can use these scripts to deploy to your server using password authentication.

## Scripts

### 1. deploy-with-password.sh

A deployment script that handles SSH password authentication automatically.

#### Features:
- Automatic installation of `sshpass` (for macOS and Linux)
- All the same features as the original `deploy-to-server.sh`
- Password authentication support
- Command-line options for custom server settings

#### Usage:

```bash
# Basic usage (uses default password)
./deploy-with-password.sh

# Custom password
./deploy-with-password.sh -p your_password

# Custom server settings
./deploy-with-password.sh -u username -p password -s 192.168.1.100 -P 2222

# View help
./deploy-with-password.sh --help
```

#### Options:
- `-p, --password PASSWORD`: SSH password for authentication (default: qwsdcv123!@#)
- `-u, --user USER`: SSH user (default: root)
- `-s, --server IP`: Server IP address (default: 106.54.44.45)
- `-P, --port PORT`: SSH port (default: 22)
- `-h, --help`: Show help message

### 2. server-setup.sh

The server setup script now supports password parameter for sudo operations when not running as root.

#### Usage:

```bash
# Run as root (recommended)
sudo ./server-setup.sh

# With password parameter
./server-setup.sh -p your_sudo_password

# With environment variable
export SUDO_PASSWORD=your_password
./server-setup.sh

# View help
./server-setup.sh --help
```

#### Options:
- `-p, --password PASSWORD`: Sudo password for privileged operations
- `-h, --help`: Show help message

## Prerequisites

### For the Client Machine (where you run deploy-with-password.sh):

1. **SSH client**: Usually pre-installed on Linux/macOS. For Windows, use Git Bash or WSL.

2. **rsync**: Required for file synchronization
   ```bash
   # Ubuntu/Debian
   sudo apt-get install rsync

   # macOS
   brew install rsync
   ```

3. **sshpass**: Will be installed automatically by the script if not present
   - **macOS**: Requires Homebrew (`brew install sshpass`)
   - **Linux**: Installed via package manager

### For the Server:

1. Password authentication must be enabled in SSH
   ```bash
   # Edit SSH config
   sudo nano /etc/ssh/sshd_config

   # Ensure these lines are set:
   PasswordAuthentication yes
   PubkeyAuthentication yes

   # Restart SSH
   sudo systemctl restart sshd
   ```

2. Sudo access for the server setup script (if not running as root)

## Security Considerations

⚠️ **Important Security Notes:**

1. **Password in Scripts**: The default password is included in the script for convenience. Consider changing it:
   - Modify the `DEFAULT_PASSWORD` variable in `deploy-with-password.sh`
   - Always use the `-p` flag for production deployments

2. **SSH Key Authentication**: For better security, consider setting up SSH key authentication:
   ```bash
   # Generate SSH key pair
   ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

   # Copy public key to server
   ssh-copy-id user@server_ip
   ```

3. **Password Storage**: Avoid storing passwords in:
   - Git repositories
   - Plain text files
   - Shell history (consider using `unset HISTFILE` temporarily)

4. **Use Environment Variables**: For better security:
   ```bash
   export SSH_PASSWORD="your_password"
   ./deploy-with-password.sh -p "$SSH_PASSWORD"
   unset SSH_PASSWORD
   ```

## Troubleshooting

### Common Issues:

1. **sshpass not found on macOS**
   ```
   Solution: Install Homebrew first:
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Permission denied**
   - Verify the SSH password is correct
   - Ensure password authentication is enabled on the server
   - Check that the user has the necessary permissions

3. **Connection timeout**
   - Verify server IP and port
   - Check firewall settings
   - Ensure SSH service is running on the server

4. **Sudo password issues**
   - Ensure the user has sudo privileges
   - Verify the sudo password is correct
   - Consider running the setup script as root

## Migration to SSH Keys

Once your server is set up, consider migrating to SSH key authentication for better security:

1. Generate SSH keys on your local machine
2. Copy the public key to the server
3. Disable password authentication in SSH config
4. Use the original `deploy-to-server.sh` script

## Example Deployment Workflow

```bash
# 1. First-time deployment with password
./deploy-with-password.sh -p qwsdcv123!@#

# 2. Configure environment files on server
ssh root@106.54.44.45
nano /root/ai-project-mgmt/backend/.env

# 3. Re-run deployment
./deploy-with-password.sh -p qwsdcv123!@#

# 4. Verify deployment
curl http://106.54.44.45/api/health
```

## Support

For issues related to:
- **Deployment scripts**: Check this guide and the script's help output
- **Server setup**: Refer to the main DEPLOYMENT_GUIDE.md
- **Application issues**: Check the logs on the server

Remember: For production environments, SSH key authentication is strongly recommended over password authentication.