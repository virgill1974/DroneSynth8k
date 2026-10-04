; Test harness for the ASM export (Linux, 32-bit, no libc). Prints ds_hash() = FNV-1a of ds_out.
;   nasm -f elf32 -DSONG='"song.asm"' -I<dir>/ test/asm_test.asm -o t.o && ld -m elf_i386 t.o -o t && ./t file.dls
%define DS_NOLOAD
%define DS_NO_PLAYER
%define DS_VERIFY
%include SONG

section .data
hexd: db "0123456789abcdef"
section .bss
hexbuf: resb 9
section .text
global _start
_start:
    mov ebx, [esp+8]            ; argv[1] = dls path
    mov eax, 5                  ; open(path, O_RDONLY)
    xor ecx, ecx
    int 0x80
    mov ebx, eax
    mov ecx, ds_dls
    mov edx, DS_DLS_SIZE
.rd: mov eax, 3                 ; read
    int 0x80
    test eax, eax
    jle .go
    add ecx, eax
    sub edx, eax
    jnz .rd
.go: call ds_render
    call ds_hash
    mov edi, hexbuf+7
    mov ecx, 8
.x: mov edx, eax
    and edx, 15
    mov dl, [hexd+edx]
    mov [edi], dl
    dec edi
    shr eax, 4
    loop .x
    mov byte [hexbuf+8], 10
    mov eax, 4                  ; write(1, hexbuf, 9)
    mov ebx, 1
    mov ecx, hexbuf
    mov edx, 9
    int 0x80
    mov eax, 1                  ; exit(0)
    xor ebx, ebx
    int 0x80
