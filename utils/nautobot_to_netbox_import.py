#!/usr/bin/env python3
"""
Nautobot CSV to VelociTerm CSV Converter

Converts Nautobot device exports to a format compatible with VelociTerm's CSV import.
Supports both NetBox-compatible format and generic CSV format with all available fields.
"""

import csv
import argparse
import sys
from pathlib import Path


def clean_value(value):
    """Clean and normalize values from Nautobot export"""
    if not value or value in ['NULL', 'NoObject', '']:
        return ''
    return str(value).strip()


def get_primary_ip(row):
    """Extract primary IP from IPv4 or IPv6 fields"""
    ipv4 = clean_value(row.get('primary_ip4__host', ''))
    ipv6 = clean_value(row.get('primary_ip6__host', ''))

    # Prefer IPv4, fallback to IPv6, then to name if no IP
    if ipv4:
        return ipv4
    elif ipv6:
        return ipv6
    else:
        # If no IP available, use the device name as fallback
        return clean_value(row.get('name', '')) or clean_value(row.get('display', ''))


def determine_device_type(row):
    """Map Nautobot device info to VelociTerm device types"""
    model = clean_value(row.get('device_type__model', '')).lower()
    role = clean_value(row.get('role__name', '')).lower()
    platform = clean_value(row.get('platform__name', '')).lower()

    # VelociTerm supported device types
    # 'linux', 'cisco_ios', 'cisco_nxos', 'juniper', 'arista_eos',
    # 'hp_comware', 'huawei', 'fortinet', 'paloalto_panos', 'mikrotik_routeros'

    # Cisco devices
    if 'cisco' in platform or 'ios' in platform:
        if 'nexus' in model or 'nxos' in platform:
            return 'cisco_nxos'
        else:
            return 'cisco_ios'

    # Juniper devices
    if 'juniper' in platform or 'junos' in platform:
        return 'juniper'

    # Arista devices
    if 'arista' in platform or 'eos' in platform:
        return 'arista_eos'

    # HP devices
    if 'hp' in platform or 'comware' in platform:
        return 'hp_comware'

    # Huawei devices
    if 'huawei' in platform:
        return 'huawei'

    # Fortinet devices
    if 'fortinet' in platform or 'fortigate' in platform:
        return 'fortinet'

    # Palo Alto devices
    if 'palo' in platform or 'panos' in platform:
        return 'paloalto_panos'

    # MikroTik devices
    if 'mikrotik' in platform or 'routeros' in platform:
        return 'mikrotik_routeros'

    # Default to linux for servers and unknown devices
    if 'server' in role or 'linux' in platform:
        return 'linux'

    # Default fallback
    return 'linux'


def get_folder_name(row):
    """Determine appropriate folder name from location hierarchy"""
    # Try location hierarchy in order of preference
    location_fields = [
        'location__name',
        'location__parent__name',
        'location__parent__parent__name',
        'rack__rack_group__location__name'
    ]

    for field in location_fields:
        value = clean_value(row.get(field, ''))
        if value and value != 'NoObject':
            return value

    # Fallback to tenant or a default
    tenant = clean_value(row.get('tenant__name', ''))
    if tenant:
        return tenant

    return 'Imported Devices'


def get_ssh_port(row):
    """Determine SSH port - check for custom service configurations or default to 22"""
    # Some Nautobot exports might have port information in services
    # For now, default to 22, but could be enhanced to check services
    return 22


def get_platform_info(row):
    """Get detailed platform information"""
    platform = clean_value(row.get('platform__name', ''))
    # Could also include version info if available
    version = clean_value(row.get('platform__napalm_driver', ''))

    if platform and version and version != platform:
        return f"{platform} ({version})"
    return platform


def get_model_info(row):
    """Get device model information"""
    manufacturer = clean_value(row.get('device_type__manufacturer__name', ''))
    model = clean_value(row.get('device_type__model', ''))

    if manufacturer and model:
        return f"{manufacturer} {model}"
    elif model:
        return model
    elif manufacturer:
        return manufacturer
    return ''


def get_serial_number(row):
    """Extract serial number if available"""
    return clean_value(row.get('serial', ''))


def get_software_version(row):
    """Extract software version if available"""
    # Nautobot might store this in different fields depending on configuration
    version_fields = [
        'software_version',
        'os_version',
        'firmware_version',
        'platform__version'
    ]

    for field in version_fields:
        version = clean_value(row.get(field, ''))
        if version:
            return version

    return ''


def get_vendor_info(row):
    """Extract vendor/manufacturer information"""
    return clean_value(row.get('device_type__manufacturer__name', ''))


def get_site_info(row):
    """Get site information for the site field"""
    # Similar to folder_name but specifically for site field
    return get_folder_name(row)


def convert_to_netbox_format(nautobot_file, output_file):
    """Convert Nautobot CSV to NetBox-compatible format"""

    netbox_headers = ['Name', 'Primary IP', 'Site', 'Platform', 'Device Type', 'Status']

    with open(nautobot_file, 'r', encoding='utf-8') as infile, \
            open(output_file, 'w', newline='', encoding='utf-8') as outfile:

        reader = csv.DictReader(infile)
        writer = csv.writer(outfile)

        # Write headers
        writer.writerow(netbox_headers)

        converted_count = 0
        skipped_count = 0

        for row in reader:
            # Get device name - prefer display name over name
            name = clean_value(row.get('display', '')) or clean_value(row.get('name', ''))

            # Skip if no name
            if not name:
                skipped_count += 1
                continue

            # Get primary IP
            primary_ip = get_primary_ip(row)

            # Skip if no IP and name can't be used as host
            if not primary_ip:
                skipped_count += 1
                continue

            # Map other fields
            site = get_folder_name(row)
            platform = clean_value(row.get('platform__name', ''))
            device_type = clean_value(row.get('device_type__model', ''))
            status = clean_value(row.get('status__name', ''))

            # Write the row
            writer.writerow([name, primary_ip, site, platform, device_type, status])
            converted_count += 1

        print(f"NetBox format: Converted {converted_count} devices, skipped {skipped_count}")


def convert_to_generic_format(nautobot_file, output_file):
    """Convert Nautobot CSV to VelociTerm generic format with all supported fields"""

    # All supported fields for VelociTerm generic CSV import
    generic_headers = [
        'display_name',  # Required
        'host',  # Required
        'folder_name',  # Required
        'port',  # Optional (default: 22)
        'device_type',  # Optional (default: linux)
        'platform',  # Optional
        'model',  # Optional - device model info
        'serial_number',  # Optional - device serial number
        'software_version',  # Optional - OS/software version
        'vendor',  # Optional - manufacturer/vendor
        'site'  # Optional - site information
    ]

    with open(nautobot_file, 'r', encoding='utf-8') as infile, \
            open(output_file, 'w', newline='', encoding='utf-8') as outfile:

        reader = csv.DictReader(infile)
        writer = csv.writer(outfile)

        # Write headers
        writer.writerow(generic_headers)

        converted_count = 0
        skipped_count = 0

        for row in reader:
            # Get device name - prefer display name over name
            display_name = clean_value(row.get('display', '')) or clean_value(row.get('name', ''))

            # Skip if no name
            if not display_name:
                skipped_count += 1
                continue

            # Get host (IP address)
            host = get_primary_ip(row)

            # Skip if no host
            if not host:
                skipped_count += 1
                continue

            # Get folder name (required)
            folder_name = get_folder_name(row)

            # Get all optional fields
            port = get_ssh_port(row)
            device_type = determine_device_type(row)
            platform = get_platform_info(row)
            model = get_model_info(row)
            serial_number = get_serial_number(row)
            software_version = get_software_version(row)
            vendor = get_vendor_info(row)
            site = get_site_info(row)

            # Write the complete row with all fields
            writer.writerow([
                display_name,
                host,
                folder_name,
                port,
                device_type,
                platform,
                model,
                serial_number,
                software_version,
                vendor,
                site
            ])
            converted_count += 1

        print(f"Generic format: Converted {converted_count} devices, skipped {skipped_count}")


def main():
    parser = argparse.ArgumentParser(
        description='Convert Nautobot CSV export to VelociTerm import format',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Convert to generic format with all fields
  python nautobot_to_netbox_import.py devices.csv velocitiem_import.csv

  # Convert to NetBox-compatible format
  python nautobot_to_netbox_import.py devices.csv netbox_import.csv --format netbox

  # Preview conversion without creating output file
  python nautobot_to_netbox_import.py devices.csv output.csv --preview

Generic CSV Format Includes:
  Required: display_name, host, folder_name
  Optional: port, device_type, platform, model, serial_number, software_version, vendor, site
        """
    )
    parser.add_argument('input_file', help='Nautobot CSV export file')
    parser.add_argument('output_file', help='Output CSV file for VelociTerm')
    parser.add_argument(
        '--format',
        choices=['netbox', 'generic'],
        default='generic',
        help='Output format (default: generic)'
    )
    parser.add_argument(
        '--preview',
        action='store_true',
        help='Preview the first 5 conversions without creating output file'
    )

    args = parser.parse_args()

    # Check if input file exists
    if not Path(args.input_file).exists():
        print(f"Error: Input file '{args.input_file}' does not exist")
        sys.exit(1)

    if args.preview:
        print("Preview mode - showing first 5 conversions:")
        print("-" * 70)

        with open(args.input_file, 'r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            count = 0

            for row in reader:
                if count >= 5:
                    break

                name = clean_value(row.get('display', '')) or clean_value(row.get('name', ''))
                host = get_primary_ip(row)
                folder = get_folder_name(row)
                device_type = determine_device_type(row)
                model = get_model_info(row)
                vendor = get_vendor_info(row)
                platform = get_platform_info(row)
                serial = get_serial_number(row)

                print(f"{count + 1}. {name}")
                print(f"   Host: {host}")
                print(f"   Folder: {folder}")
                print(f"   Device Type: {device_type}")
                print(f"   Model: {model}")
                print(f"   Vendor: {vendor}")
                print(f"   Platform: {platform}")
                print(f"   Serial: {serial}")
                print()

                count += 1
        return

    # Convert based on format
    try:
        if args.format == 'netbox':
            convert_to_netbox_format(args.input_file, args.output_file)
        else:
            convert_to_generic_format(args.input_file, args.output_file)

        print(f"Conversion completed! Output saved to: {args.output_file}")
        print(f"You can now import '{args.output_file}' into VelociTerm using {args.format} mode.")

        if args.format == 'generic':
            print("\nGeneric format includes all supported fields:")
            print("  Required: display_name, host, folder_name")
            print("  Optional: port, device_type, platform, model, serial_number, software_version, vendor, site")

    except Exception as e:
        print(f"Error during conversion: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()