import sys
import os
import zlib
import struct
import json
from pathlib import Path

def log(message, level="INFO"):
    """Send structured log to stdout for Electron to capture"""
    print(json.dumps({"level": level, "message": message}))
    sys.stdout.flush()

def read_bytes(file, count):
    """Read exact number of bytes"""
    data = file.read(count)
    if len(data) != count:
        raise Exception(f"Expected {count} bytes but got {len(data)}")
    return data

def decompile(input_path, output_path):
    """Decompile .ido file to XML or extract binary"""
    try:
        log(f"Starting decompilation: {input_path}")
        
        with open(input_path, 'rb') as f:
            # Read header
            header = f.read(0x5F)
            
            if len(header) >= 8 and header[0] == 0x14 and header[4:7] == b'_gb':
                log("Detected Type: Gamebryo State Block (Binary)")
                output_file = Path(output_path).with_suffix('.gb')
                
                with open(input_path, 'rb') as src, open(output_file, 'wb') as dst:
                    dst.write(src.read())
                
                log(f"Saved raw binary to {output_file}", "SUCCESS")
                return {"success": True, "output": str(output_file), "type": "gamebryo"}
            
            if header.startswith(b'\x01\x00\x01\x00'):
                log("Detected Type: Shop Database (Binary Structs)")
                return parse_shop_db(input_path, output_path)
            
            header_hex = header.hex()
            
            # Decompress the rest
            compressed_data = f.read()
            log(f"Decompressing {len(compressed_data)} bytes...")
            
            try:
                decompressed_data = zlib.decompress(compressed_data)
                log(f"Decompressed to {len(decompressed_data)} bytes")
            except zlib.error as e:
                raise Exception(f"Zlib decompression failed: {e}")
            
            # Detect file type
            file_type = None
            extension = None
            
            if decompressed_data.startswith(b'DDS '):
                file_type = "DDS Texture"
                extension = "dds"
            elif decompressed_data.endswith(b'TRUEVISION-XFILE.\0'):
                file_type = "TGA Texture"
                extension = "tga"
            elif decompressed_data.startswith(b'BM'):
                file_type = "BMP Texture"
                extension = "bmp"
            elif decompressed_data.startswith(b'\x89PNG'):
                file_type = "PNG Texture"
                extension = "png"
            
            if extension:
                log(f"Detected Type: {file_type}")
                output_file = Path(output_path)
                if not output_file.suffix:
                    output_file = output_file.with_suffix(f'.{extension}')
                
                with open(output_file, 'wb') as out:
                    out.write(decompressed_data)
                
                # Save header to .meta file
                meta_file = output_file.with_suffix('.meta')
                with open(meta_file, 'w') as meta:
                    meta.write(header_hex)
                
                log(f"Saved as {output_file}", "SUCCESS")
                log(f"Saved header to {meta_file}")
                
                return {
                    "success": True,
                    "output": str(output_file),
                    "meta": str(meta_file),
                    "type": file_type
                }
            
            # Decode EUC-KR to UTF-8 for XML
            log("Decoding as EUC-KR encoded XML...")
            try:
                xml_content = decompressed_data.decode('euc-kr')
                log("Successfully decoded EUC-KR")
            except UnicodeDecodeError:
                log("Warning: Some characters could not be decoded perfectly", "WARNING")
                xml_content = decompressed_data.decode('euc-kr', errors='replace')
            
            # Add header comment
            final_xml = f"{xml_content}\n<!-- IDO HEADER: {header_hex} -->"
            
            with open(output_path, 'w', encoding='utf-8') as out:
                out.write(final_xml)
            
            log(f"Saved XML to {output_path}", "SUCCESS")
            
            return {
                "success": True,
                "output": str(output_path),
                "type": "XML"
            }
            
    except Exception as e:
        log(f"Error during decompilation: {e}", "ERROR")
        return {"success": False, "error": str(e)}

def compile_file(input_path, output_path):
    """Compile XML or binary to .ido file"""
    try:
        log(f"Starting compilation: {input_path}")
        
        input_file = Path(input_path)
        
        # Check for .meta file
        meta_path = input_file.with_suffix('.meta')
        meta_header = None
        
        if meta_path.exists():
            log(f"Found .meta file: {meta_path}")
            with open(meta_path, 'r') as f:
                hex_str = f.read().strip()
                meta_header = bytes.fromhex(hex_str)
        
        # Determine if input is XML or binary
        is_xml = input_file.suffix.lower() == '.xml'
        
        if is_xml:
            log(f"Reading and encoding XML from {input_file}...")
            with open(input_file, 'r', encoding='utf-8') as f:
                xml_content = f.read()
            
            # Try to extract embedded header
            header_marker = "<!-- IDO HEADER: "
            end_header_marker = " -->"
            embedded_header = None
            
            if header_marker in xml_content:
                start_idx = xml_content.rfind(header_marker)
                after = xml_content[start_idx + len(header_marker):]
                if end_header_marker in after:
                    end_idx = after.find(end_header_marker)
                    hex_str = after[:end_idx]
                    embedded_header = bytes.fromhex(hex_str)
                    xml_content = xml_content[:start_idx]
                    log("Extracted embedded header from XML")
            
            # Use meta header if available, otherwise embedded
            header = meta_header or embedded_header
            if not header:
                raise Exception("Header not found in .meta file or embedded in XML")
            
            # Encode to EUC-KR
            clean_content = xml_content.strip()
            log("Encoding to EUC-KR...")
            try:
                raw_bytes = clean_content.encode('euc-kr')
            except UnicodeEncodeError:
                log("Warning: Some characters could not be mapped to EUC-KR", "WARNING")
                raw_bytes = clean_content.encode('euc-kr', errors='replace')
        else:
            # Binary mode
            if not meta_header:
                raise Exception(f"Compiling binary file requires a .meta file at {meta_path}")
            
            log(f"Reading binary data from {input_file}...")
            with open(input_file, 'rb') as f:
                raw_bytes = f.read()
            
            header = meta_header
        
        log(f"Header size: {len(header)} bytes")
        log(f"Compressing {len(raw_bytes)} bytes of data...")
        
        # Compress data
        compressed_data = zlib.compress(raw_bytes)
        log(f"Done ({len(compressed_data)} bytes)")
        
        # Write output
        log(f"Writing output file {output_path}...")
        with open(output_path, 'wb') as out:
            out.write(header)
            out.write(compressed_data)
        
        total_size = len(header) + len(compressed_data)
        log(f"Successfully compiled IDO file ({total_size} bytes) to {output_path}", "SUCCESS")
        
        return {
            "success": True,
            "output": str(output_path),
            "size": total_size
        }
        
    except Exception as e:
        log(f"Error during compilation: {e}", "ERROR")
        return {"success": False, "error": str(e)}

def parse_shop_db(input_path, output_path):
    """Parse shop database binary to CSV"""
    try:
        log(f"Parsing Shop Database: {input_path} -> {output_path}")
        
        with open(input_path, 'rb') as f:
            file_size = os.path.getsize(input_path)
            record_size = 456  # 0x1C8
            
            if file_size % record_size != 0:
                log(f"Warning: File size is not a multiple of record size ({record_size})", "WARNING")
            
            item_count = file_size // record_size
            log(f"Found {item_count} items")
            
            items = []
            
            for i in range(item_count):
                offset = i * record_size
                f.seek(offset)
                
                # Read fields
                category = struct.unpack('<H', f.read(2))[0]
                item_type_id = struct.unpack('<H', f.read(2))[0]
                variant_id = struct.unpack('<h', f.read(2))[0]
                validity = struct.unpack('<h', f.read(2))[0]
                
                # Skip to 0x0C
                f.seek(offset + 0x0C)
                type_flag = struct.unpack('<B', f.read(1))[0]
                
                # Skip to 0x38
                f.seek(offset + 0x38)
                set_item_id = struct.unpack('<i', f.read(4))[0]
                
                # Skip to 0x64 - Name (100 bytes UTF-16LE)
                f.seek(offset + 0x64)
                name_buffer = f.read(100)
                
                # Parse UTF-16LE string
                name = parse_utf16_string(name_buffer)
                
                items.append({
                    'category': category,
                    'item_type_id': item_type_id,
                    'variant_id': variant_id,
                    'validity': validity,
                    'type_flag': type_flag,
                    'set_item_id': set_item_id,
                    'name': name
                })
        
        # Write to CSV
        import csv
        output_file = Path(output_path).with_suffix('.csv')
        
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['category', 'item_type_id', 'variant_id', 'validity', 'type_flag', 'set_item_id', 'name']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(items)
        
        log(f"Success! Dumped to {output_file}", "SUCCESS")
        
        return {
            "success": True,
            "output": str(output_file),
            "type": "Shop Database",
            "items": len(items)
        }
        
    except Exception as e:
        log(f"Error parsing shop database: {e}", "ERROR")
        return {"success": False, "error": str(e)}

def parse_utf16_string(buffer):
    """Parse UTF-16LE null-terminated string"""
    u16_list = []
    for i in range(0, len(buffer), 2):
        if i + 1 < len(buffer):
            char = struct.unpack('<H', buffer[i:i+2])[0]
            if char == 0:
                break
            u16_list.append(char)
    
    return ''.join(chr(c) for c in u16_list).strip()

def main():
    if len(sys.argv) < 4:
        print(json.dumps({"success": False, "error": "Usage: python ido_tool.py <compile|decompile> <input> <output>"}))
        sys.exit(1)
    
    operation = sys.argv[1]
    input_path = sys.argv[2]
    output_path = sys.argv[3]
    
    if operation == "decompile":
        result = decompile(input_path, output_path)
    elif operation == "compile":
        result = compile_file(input_path, output_path)
    else:
        result = {"success": False, "error": f"Unknown operation: {operation}"}
    
    # Print final result as JSON
    print("RESULT:" + json.dumps(result))

if __name__ == "__main__":
    main()
