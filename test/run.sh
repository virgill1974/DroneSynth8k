#!/bin/sh
# Bit-exactness check: JS engine vs. exported C++ (several compiler settings) and ASM (x87, needs nasm). Needs node + g++.
set -e
cd "$(dirname "$0")"
T=$(mktemp -d)
node make-test-dls.js "$T/test.dls"
node verify.js "$T/test.dls" "$T" | tee "$T/js.txt"
fail=0
while read -r name hash rest; do
  for flags in "-O2" "-O0" "-O3 -march=x86-64-v2"; do
    g++ $flags -ffp-contract=off -msse2 -mfpmath=sse -I"$T" -DSONG="\"$name.h\"" main_test.cpp -o "$T/t"
    got=$("$T/t" "$T/test.dls")
    if [ "$got" = "$hash" ]; then echo "OK   $name [$flags] $got"; else echo "FAIL $name [$flags] js=$hash cpp=$got"; fail=1; fi
  done
  if command -v nasm >/dev/null; then
    nasm -f elf32 -I"$T/" -DSONG="\"$name.asm\"" asm_test.asm -o "$T/a.o" && ld -m elf_i386 "$T/a.o" -o "$T/a"
    got=$("$T/a" "$T/test.dls")
    if [ "$got" = "$hash" ]; then echo "OK   $name [asm x87] $got"; else echo "FAIL $name [asm x87] js=$hash asm=$got"; fail=1; fi
  fi
done < "$T/js.txt"
rm -rf "$T"
exit $fail
