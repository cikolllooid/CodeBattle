import re

def wrap_code(lang: str, code: str, param_types: list) -> str:
    """Создает обертку для кода, чтобы правильно вызывать функцию"""
    if lang == "python":
        func_match = re.search(r"def\s+(\w+)\s*\(", code)
        if not func_match:
            raise ValueError("Function definition not found in Python code")
        func_name = func_match.group(1)
        
        conversions = []
        for i, param_type in enumerate(param_types):
            if "int" in param_type:
                conversions.append(f"arg{i} = int(data[{i}])")
            elif "float" in param_type:
                conversions.append(f"arg{i} = float(data[{i}])")
            elif "str" in param_type:
                conversions.append(f"arg{i} = data[{i}]")
            elif "list[int]" in param_type or "List[int]" in param_type:
                conversions.append(f"arg{i} = list(map(int, data[{i}].split()))")
            elif "list[float]" in param_type or "List[float]" in param_type:
                conversions.append(f"arg{i} = list(map(float, data[{i}].split()))")
            elif "list[str]" in param_type or "List[str]" in param_type:
                conversions.append(f"arg{i} = data[{i}].split()")
            elif "bool" in param_type:
                conversions.append(f"arg{i} = data[{i}].lower() == 'true'")
            else:
                conversions.append(f"arg{i} = data[{i}]")
        
        conversion_code = "\n    ".join(conversions)
        args_str = ", ".join([f"arg{i}" for i in range(len(param_types))])
        
        wrapper = f"""
import sys

{code}

if __name__ == '__main__':
    data = sys.stdin.read().split()
    {conversion_code}
    result = {func_name}({args_str})
    print(result)
"""
        return wrapper.strip()

    elif lang == "js":
        # Извлекаем имя функции (поддерживаем function и стрелочные функции)
        func_match = re.search(r"(?:function\s+(\w+)|const\s+(\w+)\s*=\s*\([^)]*\)\s*=>|let\s+(\w+)\s*=\s*\([^)]*\)\s*=>|var\s+(\w+)\s*=\s*\([^)]*\)\s*=>)", code)
        if not func_match:
            raise ValueError("Function definition not found in JavaScript code")
        
        func_name = func_match.group(1) or func_match.group(2) or func_match.group(3) or func_match.group(4)

        conversions = []
        for i, param_type in enumerate(param_types):
            if "int" in param_type:
                conversions.append(f"const arg{i} = parseInt(data[{i}]);")
            elif "float" in param_type:
                conversions.append(f"const arg{i} = parseFloat(data[{i}]);")
            elif "array<int>" in param_type:
                conversions.append(f"const arg{i} = data[{i}].split(' ').map(x => parseInt(x));")
            elif "array<float>" in param_type:
                conversions.append(f"const arg{i} = data[{i}].split(' ').map(x => parseFloat(x));")
            elif "array<string>" in param_type:
                conversions.append(f"const arg{i} = data[{i}].split(' ');")
            elif "bool" in param_type:
                conversions.append(f"const arg{i} = data[{i}].toLowerCase() === 'true';")
            else:
                conversions.append(f"const arg{i} = data[{i}];")
        
        conversion_code = "\n    ".join(conversions)
        args_str = ", ".join([f"arg{i}" for i in range(len(param_types))])
        
        wrapper = f"""
const data = require('fs').readFileSync(0, 'utf-8').trim().split(/\\s+/);

{code}

{conversion_code}
const result = {func_name}({args_str});
console.log(result);
"""
        return wrapper.strip()

    elif lang == "c":
        # Проверяем, содержит ли код функцию main
        if "int main(" in code or "void main(" in code:
            # Если код уже содержит main, модифицируем его для чтения аргументов
            wrapper = f"""
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void parse_array(char* str, int* arr) {{
    int i = 0;
    char* token = strtok(str, " ");
    while (token != NULL) {{
        arr[i++] = atoi(token);
        token = strtok(NULL, " ");
    }}
}}

{code}
"""
            return wrapper.strip()
        
        # Ищем любую другую функцию
        func_match = re.search(r"^\s*[\w\s]+\s+(\w+)\s*\([^)]*\)\s*\{", code, re.MULTILINE)
        if not func_match:
            raise ValueError("Function definition not found in C code")
        func_name = func_match.group(1)
        
        conversions = []
        for i, param_type in enumerate(param_types):
            if "int" in param_type:
                conversions.append(f"int arg{i} = atoi(argv[{i+1}]);")
            elif "float" in param_type or "double" in param_type:
                conversions.append(f"double arg{i} = atof(argv[{i+1}]);")
            elif "char*" in param_type:
                conversions.append(f"char* arg{i} = argv[{i+1}];")
            elif "[]" in param_type:
                conversions.append(f"int arg{i}[100]; parse_array(argv[{i+1}], arg{i});")
            else:
                conversions.append(f"char* arg{i} = argv[{i+1}];")
        
        conversion_code = "\n    ".join(conversions)
        args_str = ", ".join([f"arg{i}" for i in range(len(param_types))])
        
        wrapper = f"""
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void parse_array(char* str, int* arr) {{
    int i = 0;
    char* token = strtok(str, " ");
    while (token != NULL) {{
        arr[i++] = atoi(token);
        token = strtok(NULL, " ");
    }}
}}

{code}

int main(int argc, char* argv[]) {{
    {conversion_code}
    {func_name}({args_str});
    return 0;
}}
"""
        return wrapper.strip()

    elif lang == "cpp":
        # Проверяем, содержит ли код функцию main
        if "int main(" in code or "void main(" in code:
            return f"""
#include <iostream>
#include <sstream>
#include <vector>
#include <string>

{code}
""".strip()
        
        # Ищем любую функцию
        func_match = re.search(r"^\s*[\w\s]+\s+(\w+)\s*\(([^)]*)\)\s*\{", code, re.MULTILINE)
        if not func_match:
            raise ValueError("Function definition not found in C++ code")
        
        func_name = func_match.group(1)
        params_str = func_match.group(2)
        
        # Если типы параметров не предоставлены, пытаемся определить их количество
        if not param_types:
            if params_str.strip() == "":
                param_types = []
            else:
                # Простой подсчёт параметров по запятым
                param_count = params_str.count(",") + 1
                param_types = ["string"] * param_count
        
        conversions = []
        for i, param_type in enumerate(param_types):
            if "int" in param_type:
                conversions.append(f"int arg{i} = std::stoi(argv[{i+1}]);")
            elif "double" in param_type or "float" in param_type:
                conversions.append(f"double arg{i} = std::stod(argv[{i+1}]);")
            elif "string" in param_type:
                conversions.append(f"std::string arg{i} = argv[{i+1}];")
            elif "vector<int>" in param_type:
                conversions.append(f"std::vector<int> arg{i}; {{std::stringstream ss(argv[{i+1}]); int t; while(ss>>t) arg{i}.push_back(t);}}")
            elif "vector<double>" in param_type:
                conversions.append(f"std::vector<double> arg{i}; {{std::stringstream ss(argv[{i+1}]); double t; while(ss>>t) arg{i}.push_back(t);}}")
            elif "vector<string>" in param_type:
                conversions.append(f"std::vector<std::string> arg{i}; {{std::stringstream ss(argv[{i+1}]); std::string t; while(ss>>t) arg{i}.push_back(t);}}")
            else:
                conversions.append(f"auto arg{i} = argv[{i+1}];")
        
        conversion_code = "\n    ".join(conversions)
        args_str = ", ".join([f"arg{i}" for i in range(len(param_types))])
        
        wrapper = f"""
#include <iostream>
#include <sstream>
#include <vector>
#include <string>

{code}

int main(int argc, char* argv[]) {{
    {conversion_code}
    std::cout << {func_name}({args_str});
    return 0;
}}
"""
        return wrapper.strip()
    
    elif lang == "rust":
        func_match = re.search(r"fn\s+(\w+)\s*\([^)]*\)", code)
        if not func_match:
            raise ValueError("Function definition not found in Rust code")
        func_name = func_match.group(1)
        
        conversions = []
        for i, param_type in enumerate(param_types):
            if "i32" in param_type:
                conversions.append(f"let arg{i}: i32 = args[{i}].parse().unwrap();")
            elif "f64" in param_type:
                conversions.append(f"let arg{i}: f64 = args[{i}].parse().unwrap();")
            elif param_type == "String":
                conversions.append(f"let arg{i}: String = args[{i}].to_string();")
            elif param_type == "&str":
                conversions.append(f"let arg{i}: &str = args[{i}];")
            elif "bool" in param_type:
                conversions.append(f"let arg{i}: bool = args[{i}].parse().unwrap();")
            elif "Vec<i32>" in param_type:
                conversions.append(f"let arg{i}: Vec<i32> = args[{i}].split_whitespace().map(|s| s.parse().unwrap()).collect();")
            elif "Vec<f64>" in param_type:
                conversions.append(f"let arg{i}: Vec<f64> = args[{i}].split_whitespace().map(|s| s.parse().unwrap()).collect();")
            elif "Vec<String>" in param_type:
                conversions.append(f"let arg{i}: Vec<String> = args[{i}].split_whitespace().map(|s| s.to_string()).collect();")
            elif "&[i32]" in param_type:
                conversions.append(f"let tmp{i}: Vec<i32> = args[{i}].split_whitespace().map(|s| s.parse().unwrap()).collect();")
                conversions.append(f"let arg{i}: &[i32] = &tmp{i};")
            elif "&[f64]" in param_type:
                conversions.append(f"let tmp{i}: Vec<f64> = args[{i}].split_whitespace().map(|s| s.parse().unwrap()).collect();")
                conversions.append(f"let arg{i}: &[f64] = &tmp{i};")
            elif "&[String]" in param_type:
                conversions.append(f"let tmp{i}: Vec<String> = args[{i}].split_whitespace().map(|s| s.to_string()).collect();")
                conversions.append(f"let arg{i}: &[String] = &tmp{i};")
            elif param_type == "String":
                conversions.append(f"let arg{i}: String = args[{i}].to_string();")
            elif param_type == "&str":
                conversions.append(f"let tmp{i}: String = args[{i}].to_string();")
                conversions.append(f"let arg{i}: &str = &tmp{i};")
            else:
                conversions.append(f"let arg{i} = args[{i}];")
        
        conversion_code = "\n    ".join(conversions)
        args_str = ", ".join([f"arg{i}" for i in range(len(param_types))])
        
        wrapper = f"""
use std::io::{{self, Read}};

{code}

fn main() {{
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let args: Vec<&str> = input.split_whitespace().collect();
    
    {conversion_code}
    
    let result = {func_name}({args_str});
    println!("{{}}", result);
}}
"""
        return wrapper.strip()

    elif lang == "go":
        func_match = re.search(r"func\s+(\w+)\s*\([^)]*\)", code)
        if not func_match:
            raise ValueError("Function definition not found in Go code")
        func_name = func_match.group(1)
        
        conversions = []
        for i, param_type in enumerate(param_types):
            if "int" == param_type:
                conversions.append(f"arg{i}, _ := strconv.Atoi(args[{i}])")
            elif "float64" in param_type:
                conversions.append(f"arg{i}, _ := strconv.ParseFloat(args[{i}], 64)")
            elif "string" in param_type:
                conversions.append(f"arg{i} := args[{i}]")
            elif "[]int" in param_type:
                conversions.append(f"arg{i} := sliceToInt(args[{i}])")
            elif "[]float64" in param_type:
                conversions.append(f"arg{i} := sliceToFloat(args[{i}])")
            elif "[]string" in param_type:
                conversions.append(f"arg{i} := strings.Split(args[{i}], \" \")")
            elif "bool" in param_type:
                conversions.append(f"arg{i}, _ := strconv.ParseBool(args[{i}])")
            else:
                conversions.append(f"arg{i} := args[{i}]")
        
        conversion_code = "\n    ".join(conversions)
        args_str = ", ".join([f"arg{i}" for i in range(len(param_types))])
        
        wrapper = f"""
package main

import (
    "fmt"
    "os"
    "strconv"
    "strings"
)

{code}

func sliceToInt(s string) []int {{
    strs := strings.Split(s, " ")
    arr := make([]int, len(strs))
    for i, str := range strs {{
        arr[i], _ = strconv.Atoi(str)
    }}
    return arr
}}

func main() {{
    args := os.Args[1:]
    {conversion_code}
    result := {func_name}({args_str})
    fmt.Println(result)
}}
"""
        return wrapper.strip()

    else:
        raise ValueError(f"Unsupported language: {lang}")