#!/usr/bin/env python3
"""
Automatic filelist generator for QuestaSim Web Interface
Generates filelist.f based on project structure similar to example_user_project
"""

import os
import sys
import json
from pathlib import Path

def scan_directory(directory, extensions, relative_to=None):
    """Scan directory for files with given extensions"""
    files = []
    if not os.path.exists(directory):
        return files
    
    for root, dirs, filenames in os.walk(directory):
        for filename in filenames:
            if any(filename.endswith(ext) for ext in extensions):
                file_path = os.path.join(root, filename)
                if relative_to:
                    file_path = os.path.relpath(file_path, relative_to)
                files.append(file_path)
    
    return files

def generate_filelist(project_path, job_path):
    """Generate filelist.f based on project structure"""
    
    # Define file extensions to include
    verilog_extensions = ['.v', '.sv']
    include_extensions = ['.vh', '.svh']
    
    src_files = []
    tb_files = []
    include_files = []
    
    # Scan src directory
    src_dir = os.path.join(project_path, 'src')
    if os.path.exists(src_dir):
        src_files = scan_directory(src_dir, verilog_extensions, job_path)
        # Also scan for include files in src
        src_includes = scan_directory(src_dir, include_extensions, job_path)
        include_files.extend(src_includes)
    
    # Scan tb directory
    tb_dir = os.path.join(project_path, 'tb')
    if os.path.exists(tb_dir):
        tb_files = scan_directory(tb_dir, verilog_extensions, job_path)
    
    # Scan include directory
    include_dir = os.path.join(project_path, 'include')
    if os.path.exists(include_dir):
        inc_files = scan_directory(include_dir, include_extensions, job_path)
        include_files.extend(inc_files)
    
    # Generate filelist.f
    filelist_path = os.path.join(job_path, 'filelist.f')
    
    with open(filelist_path, 'w') as f:
        # Write source files first
        for src_file in sorted(src_files):
            f.write(f"{src_file}\n")
        
        # Write testbench files
        for tb_file in sorted(tb_files):
            f.write(f"{tb_file}\n")
    
    # Generate include directories list for compilation
    include_dirs = set()
    
    # Add src directory and subdirectories
    if os.path.exists(src_dir):
        include_dirs.add(os.path.relpath(src_dir, job_path))
        for root, dirs, files in os.walk(src_dir):
            if any(f.endswith(ext) for f in files for ext in include_extensions):
                include_dirs.add(os.path.relpath(root, job_path))
    
    # Add include directory
    if os.path.exists(include_dir):
        include_dirs.add(os.path.relpath(include_dir, job_path))
    
    # Generate compile options file
    compile_opts_path = os.path.join(job_path, 'compile_options.txt')
    with open(compile_opts_path, 'w') as f:
        for inc_dir in sorted(include_dirs):
            f.write(f"+incdir+{inc_dir}\n")
    
    # Generate project metadata
    metadata = {
        'project_path': project_path,
        'job_path': job_path,
        'src_files': src_files,
        'tb_files': tb_files,
        'include_files': include_files,
        'include_dirs': list(include_dirs),
        'total_files': len(src_files) + len(tb_files),
        'generated_at': os.path.getctime(filelist_path) if os.path.exists(filelist_path) else None
    }
    
    metadata_path = os.path.join(job_path, 'project_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"Generated filelist.f with {len(src_files)} source files and {len(tb_files)} testbench files")
    print(f"Include directories: {', '.join(sorted(include_dirs))}")
    
    return filelist_path

def main():
    if len(sys.argv) != 3:
        print("Usage: generate_filelist.py <project_path> <job_path>")
        print("  project_path: Path to the project directory containing src/, tb/, etc.")
        print("  job_path: Path to the job run directory where filelist.f will be created")
        sys.exit(1)
    
    project_path = sys.argv[1]
    job_path = sys.argv[2]
    
    if not os.path.exists(project_path):
        print(f"Error: Project path '{project_path}' does not exist")
        sys.exit(1)
    
    if not os.path.exists(job_path):
        os.makedirs(job_path, exist_ok=True)
    
    try:
        filelist_path = generate_filelist(project_path, job_path)
        print(f"Successfully generated: {filelist_path}")
    except Exception as e:
        print(f"Error generating filelist: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 