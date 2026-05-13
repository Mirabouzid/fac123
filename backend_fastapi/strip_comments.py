import os
import re

def remove_comments(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    in_multiline_docstring = False
    
    for line in lines:
        stripped = line.strip()
        
        # Ignorer les commentaires complets (commençant par #)
        if stripped.startswith('#'):
            continue
            
        # Ignorer les docstrings sur une seule ligne
        if stripped.startswith('"""') and stripped.endswith('"""') and len(stripped) > 6:
            continue
            
        # Gérer les docstrings multi-lignes basiques (si on veut les enlever aussi)
        if stripped == '"""' or stripped.startswith('"""'):
            if not in_multiline_docstring:
                in_multiline_docstring = True
                continue
            else:
                in_multiline_docstring = False
                continue
                
        if in_multiline_docstring:
            if '"""' in line:
                in_multiline_docstring = False
            continue
            
        # Retirer les commentaires en fin de ligne (attention aux # dans les chaînes, on fait simple)
        if '  #' in line and not '"' in line.split('  #')[1] and not "'" in line.split('  #')[1]:
            line = line.split('  #')[0].rstrip() + '\n'
            
        new_lines.append(line)
        
    # Nettoyer les lignes vides consécutives créées par la suppression
    final_lines = []
    prev_empty = False
    for line in new_lines:
        is_empty = line.strip() == ''
        if is_empty and prev_empty:
            continue
        final_lines.append(line)
        prev_empty = is_empty

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(final_lines)

def process_directory(directory):
    for root, dirs, files in os.walk(directory):
        if 'venv' in root or '__pycache__' in root or '.venv' in root:
            continue
        for file in files:
            if file.endswith('.py') and file != 'strip_comments.py':
                process_directory_file(os.path.join(root, file))

def process_directory_file(filepath):
    print(f"Nettoyage de {filepath}")
    remove_comments(filepath)

if __name__ == '__main__':
    process_directory('.')
