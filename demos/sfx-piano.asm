; DroneSynth8k ASM export (generated). NASM, 32-bit x86, x87 FPU. Pass 1: gm.dls tracker, pass 2: stereo Paulstretch.
; Bit-exact with the web tool and the C++ export. Expected FNV-1a hash of ds_out: 8f23eb81
; gm.dls size when exported: 3440660 bytes (sample offsets below are absolute file offsets).
; Requires SSE3 (fisttp). Sets the FPU to 53-bit precision; do not change the FPU control word while ds_render runs.
; Build:  nasm -f win32 dronesynth.asm   (link with crinkler: kernel32.lib winmm.lib)
; Use from C:  extern "C" void ds_render(); extern "C" void ds_play(); extern "C" int ds_pos(); extern "C" float ds_out[];
; Options: %define DS_NO_PLAYER (no waveOut), DS_NOLOAD (fill ds_dls yourself), DS_GMDLS "path",
;          DS_VERIFY (adds ds_hash(): FNV-1a of ds_out, must equal the hash above)
bits 32
%define DS_ROWS 16
%define DS_ROWLEN 2756
%define DS_DRY 70556
%define DS_N 32768
%define DS_H 16384
%define DS_M 65535
%define DS_SEED 1
%define DS_OUT_LEN 360448
%define DS_DLS_SIZE 3440660
%ifndef DS_GMDLS
%define DS_GMDLS "C:\Windows\System32\drivers\gm.dls"
%endif
%ifidn __OUTPUT_FORMAT__, win32
%define ds_render _ds_render
%define ds_play _ds_play
%define ds_pos _ds_pos
%define ds_out _ds_out
%define ds_dls _ds_dls
%define ds_hash _ds_hash
%endif
global ds_render, ds_out, ds_dls
%ifdef DS_VERIFY
global ds_hash
%endif
%ifndef DS_NO_PLAYER
global ds_play, ds_pos
extern __imp__waveOutOpen@24, __imp__waveOutPrepareHeader@12, __imp__waveOutWrite@12, __imp__waveOutGetPosition@12
%endif
%ifndef DS_NOLOAD
extern __imp__CreateFileA@28, __imp__ReadFile@20
%endif
%define V(x) ebp+x-ds_vb           ; scalars/constants: ebp-relative, 1-byte displacement

section .data
align 8
ds_v:                              ; ---- scalar block, ebp = ds_vb ----
v_ln2:   dq 0x3fe62e42fefa39ef
v_att:   dq 0x3e91021e1a8b49e2
v_S:     dq 0x3f1921fb539ecf31           ; sin(pi/N)
v_C:     dq 0x3feffffffd8859ee           ; cos(pi/N)
v_half:  dq 0x3fe0000000000000
v_m1:    dq 0xbff0000000000000
v_pos:   dq 0
v_rate:  dq 0
v_env:   dq 0
v_d:     dq 0
v_g:     dq 0
v_pl:    dq 0
v_pr:    dq 0
v_sp:    dq 0
v_disp:  dq 0
v_gg:    dq 0
v_sgn:   dq 0
c12:     dd 12
c127:    dd 127
c1200:   dd 1200
c44100:  dd 44100
c32768:  dd 32768
c200N:   dd 6553600
cH10:    dd 163840
cST:     dd 47
cDRY:    dd DS_DRY
cGAIN:   dd 141
i_tmp:   dd 0
i_k:     dd 0
i_ip:    dd 0
i_s0:    dd 0
i_on:    dd 0
i_row:   dd 0
i_end:   dd 0
i_iptr:  dd 0
i_seed:  dd DS_SEED
i_p:     dd 0
i_st:    dd 0
i_ch:    dd 0
cw:      dw 0x027F
ds_vb equ ds_v+128
ds_pat:
  db 21,0,0,0,0,0,0,0,28,0,0,0,0,0,0,0,0,0,96,0,0,0,103,0,0,0,108,0,0,0,112,0
  db 0,0,0,0,100,0,0,0,0,0,0,0,105,0,0,0,36,0,0,0,0,0,0,0,0,0,0,0,0,0,0,255
  db 0,0,0,0,0,96,0,0,0,0,0,0,0,101,0,0,0,0,0,52,0,0,0,0,0,60,0,66,0,0,0,0
  db 0,0,0,0,24,0,0,0,0,0,0,0,26,0,0,0,0,108,0,0,0,0,0,0,0,115,0,0,0,0,0,0
ds_ins:
  dd 0,26460,127,20,0,26460,110,112,0,26460,100,10,8820,26460,100,30
  dd 4410,26460,80,100,0,22050,90,85,0,26460,120,100,0,26460,70,64
ds_rs:
  dd 0,1,3,5,6,7,10,11,12
ds_rg:     ; 22 bytes each: hi(w), file offset(d), len, loop start, loop len, unity, fine, rate (w), attenuation(d)
  dw 38
  dd 1869034
  dw 13672,11989,1682,36,-4,22050
  dd -7405568
  dw 97
  dd 2032078
  dw 6442,5392,1049,92,1,22050
  dd -5373952
  dw 127
  dd 2045128
  dw 4842,4686,155,103,3,22050
  dd -6177060
  dw 100
  dd 2032078
  dw 6442,5392,1049,92,1,22050
  dd -5261590
  dw 127
  dd 2045128
  dw 4842,4686,155,103,3,22050
  dd -5261590
  dw 127
  dd 2421238
  dw 13669,1,13667,70,44,22050
  dd -1636067
  dw 127
  dd 501698
  dw 4023,2536,1486,77,13,22050
  dd -3276800
  dw 52
  dd 1507508
  dw 17434,0,0,56,0,22050
  dd -655360
  dw 60
  dd 2412978
  dw 4047,0,0,75,0,22050
  dd -1638400
  dw 66
  dd 883860
  dw 5984,7,5976,86,45,22050
  dd 0
  dw 38
  dd 1869034
  dw 13672,11989,1682,36,-4,22050
  dd -7405568
  dw 127
  dd 1114670
  dw 3196,2374,821,81,-12,22050
  dd -2686976
%ifndef DS_NOLOAD
ds_path:   db DS_GMDLS, 0
%endif
%ifndef DS_NO_PLAYER
ds_wfx:    dw 3, 2
           dd 44100, 44100*8
           dw 8, 32, 0
ds_hdr:    dd ds_out, DS_OUT_LEN*8, 0, 0, 0, 0, 0, 0
ds_mmt:    dd 2, 0, 0
ds_wo:     dd 0
%endif

section .bss
alignb 8
ds_L:      resq DS_DRY+DS_N         ; zero padded: window reads past the end need no check
ds_R:      resq DS_DRY+DS_N
ds_re:     resq DS_N
ds_im:     resq DS_N
ds_tab:    resq DS_N*5/2
ds_out:    resd DS_OUT_LEN*2
ds_dls:    resb DS_DLS_SIZE

section .text
; st0 = x -> st0 = 2^x (engine.js mexp2). clobbers ecx
ds_exp2:
    fld1
.a: fldz
    fcomip st0, st2
    jbe .b
    fld1
    faddp st2, st0
    fmul qword [V(v_half)]
    jmp .a
.b: fld1
    fcomip st0, st2
    ja .c
    fld1
    fsubp st2, st0
    fadd st0, st0
    jmp .b
.c: fxch
    fmul qword [V(v_ln2)]
    fld1
    push 14
    pop ecx
.t: mov [V(i_k)], ecx
    fld st1
    fidiv dword [V(i_k)]
    fmulp st1, st0
    fld1
    faddp st1, st0
    loop .t
    fstp st1
    fmulp st1, st0
    ret

; in-place radix-2 FFT of ds_re/ds_im, [v_sgn] = -1 forward, +1 inverse. clobbers eax..edi (not ebp)
ds_fft:
    xor ecx, ecx
    inc ecx
    xor edx, edx
.r: mov eax, DS_N/2
.r1: test edx, eax
    jz .r2
    xor edx, eax
    shr eax, 1
    jmp .r1
.r2: xor edx, eax
    cmp ecx, edx
    jge .r3
    fld qword [ds_re+ecx*8]
    fld qword [ds_re+edx*8]
    fstp qword [ds_re+ecx*8]
    fstp qword [ds_re+edx*8]
    fld qword [ds_im+ecx*8]
    fld qword [ds_im+edx*8]
    fstp qword [ds_im+ecx*8]
    fstp qword [ds_im+edx*8]
.r3: inc ecx
    cmp ecx, DS_N
    jl .r
    push 2
    pop esi
    mov dword [V(i_st)], DS_N/2
.l: mov ebx, esi
    shr ebx, 1
    xor ecx, ecx
.i: xor edx, edx
.k: mov eax, edx
    imul eax, [V(i_st)]
    add eax, eax
    fld qword [ds_tab+eax*8+DS_N*4]
    fld qword [ds_tab+eax*8]
    fmul qword [V(v_sgn)]
    lea eax, [ecx+edx]
    lea edi, [eax+ebx]
    fld qword [ds_re+edi*8]
    fmul st0, st2
    fld qword [ds_im+edi*8]
    fmul st0, st2
    fsubp st1, st0
    fld qword [ds_re+edi*8]
    fmul st0, st2
    fld qword [ds_im+edi*8]
    fmul st0, st4
    faddp st1, st0
    fld qword [ds_re+eax*8]
    fsub st0, st2
    fstp qword [ds_re+edi*8]
    fld qword [ds_im+eax*8]
    fsub st0, st1
    fstp qword [ds_im+edi*8]
    fadd qword [ds_im+eax*8]
    fstp qword [ds_im+eax*8]
    fadd qword [ds_re+eax*8]
    fstp qword [ds_re+eax*8]
    fcompp
    inc edx
    cmp edx, ebx
    jl .k
    add ecx, esi
    cmp ecx, DS_N
    jl .i
    shr dword [V(i_st)], 1
    add esi, esi
    cmp esi, DS_N
    jle .l
    ret

ds_render:
    pushad
    mov ebp, ds_vb
    fldcw [V(cw)]
%ifndef DS_NOLOAD
    xor eax, eax
    push eax
    push eax
    push 3
    push eax
    push 1
    push 0x80000000
    push ds_path
    call [__imp__CreateFileA@28]
    push 0
    lea ecx, [V(i_tmp)]
    push ecx
    push DS_DLS_SIZE
    push ds_dls
    push eax
    call [__imp__ReadFile@20]
%endif
; ---- pass 1: tracker -> ds_L/ds_R (double) ----
.ch: mov eax, [V(i_ch)]
    shl eax, 4
    add eax, ds_ins
    mov [V(i_iptr)], eax
    push 127
    pop edx
    sub edx, [eax+12]
    mov [V(i_tmp)], edx
    fild dword [V(i_tmp)]
    fidiv dword [V(c127)]
    fstp qword [V(v_pl)]
    fild dword [eax+12]
    fidiv dword [V(c127)]
    fstp qword [V(v_pr)]
    xor edi, edi
    mov [V(i_on)], edi
    mov [V(i_row)], edi
.row: mov eax, [V(i_row)]
    mov edx, 255
    cmp eax, DS_ROWS
    jae .ev
    imul edx, [V(i_ch)], DS_ROWS
    movzx edx, byte [ds_pat+edx+eax]
.ev: mov eax, [V(i_iptr)]
    cmp edx, 255
    jne .on
    cmp dword [V(i_on)], 0
    je .evd
    cmp dword [eax+4], 0
    jle .kill
    fld qword [V(v_env)]
    fchs
    fidiv dword [eax+4]
    fstp qword [V(v_d)]
    jmp .evd
.kill: and dword [V(i_on)], 0
    jmp .evd
.on: test edx, edx
    jz .evd
    mov ecx, [V(i_ch)]
    lea ebx, [ds_rs+ecx*4]
    mov ecx, [ebx]
.pk: imul esi, ecx, 22
    add esi, ds_rg
    cmp dl, [esi]
    jle .pkd
    inc ecx
    cmp ecx, [ebx+4]
    jl .pk
.pkd: mov ebx, [esi+2]
    add ebx, ds_dls
    mov dword [V(i_on)], 1
    fldz
    fstp qword [V(v_pos)]
    sub dx, [esi+12]
    mov [V(i_tmp)], dx
    fild word [V(i_tmp)]
    fidiv dword [V(c12)]
    fild word [esi+14]
    fidiv dword [V(c1200)]
    faddp st1, st0
    call ds_exp2
    fimul word [esi+16]
    fidiv dword [V(c44100)]
    fstp qword [V(v_rate)]
    mov eax, [V(i_iptr)]
    fild dword [eax+8]
    fidiv dword [V(c127)]
    fild dword [esi+18]
    fmul qword [V(v_att)]
    call ds_exp2
    fmulp st1, st0
    fidiv dword [V(c32768)]
    fstp qword [V(v_g)]
    mov eax, [V(i_iptr)]
    fld1
    fldz
    cmp dword [eax], 0
    jle .noat
    fstp qword [V(v_env)]      ; env = 0
    fidiv dword [eax]          ; d = 1/att
    fstp qword [V(v_d)]
    jmp .evd
.noat: fstp qword [V(v_d)]     ; d = 0
    fstp qword [V(v_env)]      ; env = 1
.evd: mov eax, [V(i_row)]
    mov ecx, DS_DRY
    cmp eax, DS_ROWS
    jae .se
    lea ecx, [edi+DS_ROWLEN]
.se: mov [V(i_end)], ecx
.s: cmp edi, [V(i_end)]
    jge .rn
    cmp dword [V(i_on)], 0
    je .sn
    fld qword [V(v_pos)]
    fisttp dword [V(i_ip)]
    mov eax, [V(i_ip)]
    movsx edx, word [ebx+eax*2]
    mov [V(i_s0)], edx
    inc eax
    movzx ecx, word [esi+10]
    jecxz .nl
    movzx edx, word [esi+8]
    add edx, ecx
    cmp eax, edx
    jl .l1
    sub eax, ecx
.l1: movsx edx, word [ebx+eax*2]
    jmp .hv
.nl: xor edx, edx
    cmp ax, [esi+6]
    jge .hv
    movsx edx, word [ebx+eax*2]
.hv: sub edx, [V(i_s0)]
    mov [V(i_tmp)], edx
    fld qword [V(v_pos)]
    fisub dword [V(i_ip)]
    fimul dword [V(i_tmp)]
    fiadd dword [V(i_s0)]
    fmul qword [V(v_env)]
    fmul qword [V(v_g)]
    fld st0
    fmul qword [V(v_pl)]
    fadd qword [ds_L+edi*8]
    fstp qword [ds_L+edi*8]
    fmul qword [V(v_pr)]
    fadd qword [ds_R+edi*8]
    fstp qword [ds_R+edi*8]
    fld qword [V(v_env)]
    fadd qword [V(v_d)]
    fld1
    fcomip st0, st1
    ja .e1
    fstp st0
    fld1
    fldz
    fstp qword [V(v_d)]
.e1: fst qword [V(v_env)]
    fldz
    fcomip st0, st1
    fstp st0
    jb .e2
    and dword [V(i_on)], 0
.e2: fld qword [V(v_pos)]
    fadd qword [V(v_rate)]
    movzx ecx, word [esi+10]
    jecxz .p2
    movzx edx, word [esi+8]
    add edx, ecx
    mov [V(i_tmp)], edx
.p1: fild dword [V(i_tmp)]
    fcomip st0, st1
    ja .p3
    fisub word [esi+10]
    jmp .p1
.p2: fild word [esi+6]
    fcomip st0, st1
    ja .p3
    and dword [V(i_on)], 0
.p3: fstp qword [V(v_pos)]
.sn: inc edi
    jmp .s
.rn: inc dword [V(i_row)]
    cmp dword [V(i_row)], DS_ROWS
    jbe .row
    inc dword [V(i_ch)]
    cmp dword [V(i_ch)], 8
    jl .ch
; ---- pass 2: stereo paulstretch -> ds_out (float) ----
    fldz                           ; sine table by rotation: tab[k] = sin(pi*k/N)
    fld1
    xor ecx, ecx
.tb: fxch
    fst qword [ds_tab+ecx*8]
    fld st1
    fmul qword [V(v_C)]
    fld st1
    fmul qword [V(v_S)]
    fsubp st1, st0
    fxch st1
    fmul qword [V(v_C)]
    fxch st2
    fmul qword [V(v_S)]
    faddp st2, st0
    inc ecx
    cmp ecx, DS_N*5/2
    jl .tb
    fcompp
    fild dword [V(cGAIN)]
    fidiv dword [V(c200N)]
    fstp qword [V(v_gg)]
    fild dword [V(cH10)]
    fidiv dword [V(cST)]
    fstp qword [V(v_disp)]
    xor edi, edi
.f: fld qword [V(v_sp)]
    fild dword [V(cDRY)]
    fcomip st0, st1
    fisttp dword [V(i_p)]
    jbe .fd
    xor ecx, ecx
.w: mov eax, [V(i_p)]
    add eax, ecx
    fld qword [ds_tab+ecx*8]
    fld st0
    fmul qword [ds_L+eax*8]
    fstp qword [ds_re+ecx*8]
    fmul qword [ds_R+eax*8]
    fstp qword [ds_im+ecx*8]
    inc ecx
    cmp ecx, DS_N
    jl .w
    fld qword [V(v_m1)]
    call .fft
    fldz
    fst qword [ds_re]
    fst qword [ds_im]
    fst qword [ds_re+DS_H*8]
    fstp qword [ds_im+DS_H*8]
    xor ecx, ecx
    inc ecx
.k: mov edx, DS_N
    sub edx, ecx
    fld qword [ds_re+ecx*8]
    fadd qword [ds_re+edx*8]
    fld qword [ds_im+ecx*8]
    fsub qword [ds_im+edx*8]
    fmul st0, st0
    fxch
    fmul st0, st0
    faddp st1, st0
    fsqrt
    fld qword [ds_im+ecx*8]
    fadd qword [ds_im+edx*8]
    fld qword [ds_re+ecx*8]
    fsub qword [ds_re+edx*8]
    fmul st0, st0
    fxch
    fmul st0, st0
    faddp st1, st0
    fsqrt
    mov eax, [V(i_seed)]
    imul eax, eax, 1103515245
    add eax, 12345
    mov ebx, eax
    shr ebx, 8
    and ebx, DS_M
    imul eax, eax, 1103515245
    add eax, 12345
    mov [V(i_seed)], eax
    shr eax, 8
    and eax, DS_M
    fld qword [ds_tab+ebx*8+DS_H*8]
    fmul st0, st2
    fld qword [ds_tab+ebx*8]
    fmul st0, st3
    fld qword [ds_tab+eax*8+DS_H*8]
    fmul st0, st3
    fld qword [ds_tab+eax*8]
    fmul st0, st4
    fld st3
    fsub st0, st1
    fstp qword [ds_re+ecx*8]
    fld st2
    fadd st0, st2
    fstp qword [ds_im+ecx*8]
    fld st3
    fadd st0, st1
    fstp qword [ds_re+edx*8]
    fld st1
    fsub st0, st3
    fstp qword [ds_im+edx*8]
    fcompp
    fcompp
    fcompp
    inc ecx
    cmp ecx, DS_H
    jl .k
    fld1
    call .fft
    xor ecx, ecx
.o: fld qword [ds_tab+ecx*8]
    fmul qword [V(v_gg)]
    lea eax, [edi+ecx]
    fld st0
    fmul qword [ds_re+ecx*8]
    fadd dword [ds_out+eax*8]
    fstp dword [ds_out+eax*8]
    fmul qword [ds_im+ecx*8]
    fadd dword [ds_out+eax*8+4]
    fstp dword [ds_out+eax*8+4]
    inc ecx
    cmp ecx, DS_N
    jl .o
    add edi, DS_H
    fld qword [V(v_sp)]
    fadd qword [V(v_disp)]
    fstp qword [V(v_sp)]
    jmp .f
.fft: fstp qword [V(v_sgn)]        ; st0 = sign -> run fft, keep all GPRs
    pushad
    call ds_fft
    popad
    ret
.fd: popad
    ret
%ifdef DS_VERIFY
ds_hash:
    mov ecx, DS_OUT_LEN*2
    mov edx, ds_out
    mov eax, 2166136261
.h: xor eax, [edx]
    imul eax, eax, 16777619
    add edx, 4
    loop .h
    ret
%endif

%ifndef DS_NO_PLAYER
ds_play:
    xor eax, eax
    push eax
    push eax
    push eax
    push ds_wfx
    push -1
    push ds_wo
    call [__imp__waveOutOpen@24]
    push 32
    push ds_hdr
    push dword [ds_wo]
    call [__imp__waveOutPrepareHeader@12]
    push 32
    push ds_hdr
    push dword [ds_wo]
    call [__imp__waveOutWrite@12]
    ret
ds_pos:            ; current playback position in frames
    push 12
    push ds_mmt
    push dword [ds_wo]
    call [__imp__waveOutGetPosition@12]
    mov eax, [ds_mmt+4]
    ret
%endif
