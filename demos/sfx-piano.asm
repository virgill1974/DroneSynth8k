; DroneSynth8k ASM export (generated). NASM, 32-bit x86, x87 FPU. Pass 1: gm.dls tracker, pass 2: stereo Paulstretch.
; Bit-exact with the web tool and the C++ export. Expected FNV-1a hash of ds_out: c81aa935
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
%define DS_ST 47
%define DS_SEED 1
%define DS_GAIN 141
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

section .data
ds_cw:     dw 0x027F
ds_c12:    dd 12
ds_c127:   dd 127
ds_c1200:  dd 1200
ds_c44100: dd 44100
ds_c32768: dd 32768
ds_cN:     dd DS_N
ds_c200N:  dd 6553600
ds_cH10:   dd 163840
ds_cST:    dd DS_ST
ds_cDRY:   dd DS_DRY
ds_cGAIN:  dd DS_GAIN
ds_PI:     dq 0x400921fb54442d18
ds_mPI:    dq 0xc00921fb54442d18
ds_PI_2:   dq 0x3ff921fb54442d18
ds_mPI_2:  dq 0xbff921fb54442d18
ds_2PI:    dq 0x401921fb54442d18
ds_LN2:    dq 0x3fe62e42fefa39ef
ds_ATT:    dq 0x3e91021e1a8b49e2
ds_half:   dq 0x3fe0000000000000
ds_m1:     dq 0xbff0000000000000
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
ds_rg:     ; hi, file offset, len, loop start, loop len, unity, fine, rate, attenuation
  dd 38,1869034,13672,11989,1682,36,-4,22050,-7405568
  dd 97,2032078,6442,5392,1049,92,1,22050,-5373952
  dd 127,2045128,4842,4686,155,103,3,22050,-6177060
  dd 100,2032078,6442,5392,1049,92,1,22050,-5261590
  dd 127,2045128,4842,4686,155,103,3,22050,-5261590
  dd 127,2421238,13669,1,13667,70,44,22050,-1636067
  dd 127,501698,4023,2536,1486,77,13,22050,-3276800
  dd 52,1507508,17434,0,0,56,0,22050,-655360
  dd 60,2412978,4047,0,0,75,0,22050,-1638400
  dd 66,883860,5984,7,5976,86,45,22050,0
  dd 38,1869034,13672,11989,1682,36,-4,22050,-7405568
  dd 127,1114670,3196,2374,821,81,-12,22050,-2686976
%ifndef DS_NOLOAD
ds_path:   db DS_GMDLS, 0
%endif
%ifndef DS_NO_PLAYER
ds_wfx:    dw 3, 2
           dd 44100, 44100*8
           dw 8, 32, 0
ds_hdr:    dd ds_out, DS_OUT_LEN*8, 0, 0, 0, 0, 0, 0
ds_mmt:    dd 2, 0, 0
%endif

section .bss
alignb 8
ds_L:      resq DS_DRY
ds_R:      resq DS_DRY
ds_re:     resq DS_N
ds_im:     resq DS_N
ds_tab:    resq DS_N*5/2
v_pos:     resq 1
v_rate:    resq 1
v_env:     resq 1
v_d:       resq 1
v_g:       resq 1
v_pl:      resq 1
v_pr:      resq 1
v_sp:      resq 1
v_disp:    resq 1
v_gg:      resq 1
v_sgn:     resq 1
ds_out:    resd DS_OUT_LEN*2
i_tmp:     resd 1
i_k:       resd 1
i_ip:      resd 1
i_s0:      resd 1
i_on:      resd 1
i_row:     resd 1
i_end:     resd 1
i_iptr:    resd 1
i_seed:    resd 1
i_p:       resd 1
i_st:      resd 1
%ifndef DS_NO_PLAYER
ds_wo:     resd 1
%endif
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
    fmul qword [ds_half]
    jmp .a
.b: fld1
    fcomip st0, st2
    ja .c
    fld1
    fsubp st2, st0
    fadd st0, st0
    jmp .b
.c: fxch
    fmul qword [ds_LN2]
    fld1
    mov ecx, 14
.t: mov [i_k], ecx
    fld st1
    fidiv dword [i_k]
    fmulp st1, st0
    fld1
    faddp st1, st0
    loop .t
    fstp st1
    fmulp st1, st0
    ret

; st0 = x -> st0 = sin(x) (engine.js msin). clobbers eax, ecx
ds_sin:
.a: fld qword [ds_PI]
    fcomip st0, st1
    jae .b
    fsub qword [ds_2PI]
    jmp .a
.b: fld qword [ds_mPI]
    fcomip st0, st1
    jbe .c
    fadd qword [ds_2PI]
    jmp .b
.c: fld qword [ds_PI_2]
    fcomip st0, st1
    jae .d
    fsubr qword [ds_PI]
    jmp .e
.d: fld qword [ds_mPI_2]
    fcomip st0, st1
    jbe .e
    fsubr qword [ds_mPI]
.e: fld st0
    fmul st0, st0
    fld1
    mov ecx, 16
.t: lea eax, [ecx+1]
    imul eax, ecx
    mov [i_k], eax
    fld st1
    fidiv dword [i_k]
    fmulp st1, st0
    fld1
    fsubrp st1, st0
    sub ecx, 2
    jnz .t
    fstp st1
    fmulp st1, st0
    ret

; in-place radix-2 FFT of ds_re/ds_im, [v_sgn] = -1 forward, +1 inverse. clobbers all GPRs
ds_fft:
    mov ecx, 1
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
    mov esi, 2
    mov dword [i_st], DS_N/2
.l: mov ebp, esi
    shr ebp, 1
    xor ecx, ecx
.i: xor edx, edx
.k: mov eax, edx
    imul eax, [i_st]
    add eax, eax
    fld qword [ds_tab+eax*8+DS_N*4]
    fld qword [ds_tab+eax*8]
    fmul qword [v_sgn]
    lea eax, [ecx+edx]
    lea edi, [eax+ebp]
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
    cmp edx, ebp
    jl .k
    add ecx, esi
    cmp ecx, DS_N
    jl .i
    shr dword [i_st], 1
    add esi, esi
    cmp esi, DS_N
    jle .l
    ret

ds_render:
    pushad
    fldcw [ds_cw]
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
    push i_tmp
    push DS_DLS_SIZE
    push ds_dls
    push eax
    call [__imp__ReadFile@20]
%endif
; ---- pass 1: tracker -> ds_L/ds_R (double) ----
    xor ebp, ebp
.ch: mov eax, ebp
    shl eax, 4
    add eax, ds_ins
    mov [i_iptr], eax
    mov edx, 127
    sub edx, [eax+12]
    mov [i_tmp], edx
    fild dword [i_tmp]
    fidiv dword [ds_c127]
    fstp qword [v_pl]
    fild dword [eax+12]
    fidiv dword [ds_c127]
    fstp qword [v_pr]
    xor edi, edi
    mov [i_on], edi
    mov [i_row], edi
.row: mov eax, [i_row]
    mov edx, 255
    cmp eax, DS_ROWS
    jae .ev
    imul edx, ebp, DS_ROWS
    movzx edx, byte [ds_pat+edx+eax]
.ev: mov eax, [i_iptr]
    cmp edx, 255
    jne .on
    cmp dword [i_on], 0
    je .evd
    cmp dword [eax+4], 0
    jle .kill
    fld qword [v_env]
    fchs
    fidiv dword [eax+4]
    fstp qword [v_d]
    jmp .evd
.kill: mov dword [i_on], 0
    jmp .evd
.on: test edx, edx
    jz .evd
    mov ecx, [ds_rs+ebp*4]
.pk: imul esi, ecx, 36
    add esi, ds_rg
    cmp edx, [esi]
    jle .pkd
    inc ecx
    cmp ecx, [ds_rs+ebp*4+4]
    jl .pk
.pkd: mov ebx, [esi+4]
    add ebx, ds_dls
    mov dword [i_on], 1
    fldz
    fstp qword [v_pos]
    sub edx, [esi+20]
    mov [i_tmp], edx
    fild dword [i_tmp]
    fidiv dword [ds_c12]
    fild dword [esi+24]
    fidiv dword [ds_c1200]
    faddp st1, st0
    call ds_exp2
    fimul dword [esi+28]
    fidiv dword [ds_c44100]
    fstp qword [v_rate]
    mov eax, [i_iptr]
    fild dword [eax+8]
    fidiv dword [ds_c127]
    fild dword [esi+32]
    fmul qword [ds_ATT]
    call ds_exp2
    fmulp st1, st0
    fidiv dword [ds_c32768]
    fstp qword [v_g]
    mov eax, [i_iptr]
    cmp dword [eax], 0
    jle .noat
    fld1
    fidiv dword [eax]
    fstp qword [v_d]
    fldz
    fstp qword [v_env]
    jmp .evd
.noat: fld1
    fstp qword [v_env]
    fldz
    fstp qword [v_d]
.evd: mov eax, [i_row]
    mov ecx, DS_DRY
    cmp eax, DS_ROWS
    jae .se
    lea ecx, [edi+DS_ROWLEN]
.se: mov [i_end], ecx
.s: cmp edi, [i_end]
    jge .rn
    cmp dword [i_on], 0
    je .sn
    fld qword [v_pos]
    fisttp dword [i_ip]
    mov eax, [i_ip]
    movsx edx, word [ebx+eax*2]
    mov [i_s0], edx
    inc eax
    mov ecx, [esi+16]
    jecxz .nl
    mov edx, [esi+12]
    add edx, ecx
    cmp eax, edx
    jl .l1
    sub eax, ecx
.l1: movsx edx, word [ebx+eax*2]
    jmp .hv
.nl: xor edx, edx
    cmp eax, [esi+8]
    jge .hv
    movsx edx, word [ebx+eax*2]
.hv: sub edx, [i_s0]
    mov [i_tmp], edx
    fld qword [v_pos]
    fisub dword [i_ip]
    fimul dword [i_tmp]
    fiadd dword [i_s0]
    fmul qword [v_env]
    fmul qword [v_g]
    fld st0
    fmul qword [v_pl]
    fadd qword [ds_L+edi*8]
    fstp qword [ds_L+edi*8]
    fmul qword [v_pr]
    fadd qword [ds_R+edi*8]
    fstp qword [ds_R+edi*8]
    fld qword [v_env]
    fadd qword [v_d]
    fld1
    fcomip st0, st1
    ja .e1
    fstp st0
    fld1
    fldz
    fstp qword [v_d]
.e1: fst qword [v_env]
    fldz
    fcomip st0, st1
    fstp st0
    jb .e2
    mov dword [i_on], 0
.e2: fld qword [v_pos]
    fadd qword [v_rate]
    mov ecx, [esi+16]
    jecxz .p2
    mov edx, [esi+12]
    add edx, ecx
    mov [i_tmp], edx
.p1: fild dword [i_tmp]
    fcomip st0, st1
    ja .p3
    fisub dword [esi+16]
    jmp .p1
.p2: fild dword [esi+8]
    fcomip st0, st1
    ja .p3
    mov dword [i_on], 0
.p3: fstp qword [v_pos]
.sn: inc edi
    jmp .s
.rn: inc dword [i_row]
    cmp dword [i_row], DS_ROWS
    jbe .row
    inc ebp
    cmp ebp, 8
    jl .ch
; ---- pass 2: stereo paulstretch -> ds_out (float) ----
    xor ecx, ecx
.tb: mov [i_tmp], ecx
    fild dword [i_tmp]
    fmul qword [ds_PI]
    fidiv dword [ds_cN]
    push ecx
    call ds_sin
    pop ecx
    fstp qword [ds_tab+ecx*8]
    inc ecx
    cmp ecx, DS_N*5/2
    jl .tb
    mov dword [i_seed], DS_SEED
    fild dword [ds_cGAIN]
    fidiv dword [ds_c200N]
    fstp qword [v_gg]
    fild dword [ds_cH10]
    fidiv dword [ds_cST]
    fstp qword [v_disp]
    fldz
    fstp qword [v_sp]
    xor edi, edi
.f: fld qword [v_sp]
    fild dword [ds_cDRY]
    fcomip st0, st1
    fisttp dword [i_p]
    jbe .fd
    xor ecx, ecx
.w: mov eax, [i_p]
    add eax, ecx
    fld qword [ds_tab+ecx*8]
    cmp eax, DS_DRY
    jge .wz
    fld st0
    fmul qword [ds_L+eax*8]
    fstp qword [ds_re+ecx*8]
    fmul qword [ds_R+eax*8]
    fstp qword [ds_im+ecx*8]
    jmp .wn
.wz: fstp st0
    fldz
    fst qword [ds_re+ecx*8]
    fstp qword [ds_im+ecx*8]
.wn: inc ecx
    cmp ecx, DS_N
    jl .w
    fld qword [ds_m1]
    fstp qword [v_sgn]
    pushad
    call ds_fft
    popad
    fldz
    fst qword [ds_re]
    fst qword [ds_im]
    fst qword [ds_re+DS_H*8]
    fstp qword [ds_im+DS_H*8]
    mov ecx, 1
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
    mov eax, [i_seed]
    imul eax, eax, 1103515245
    add eax, 12345
    mov ebx, eax
    shr ebx, 8
    and ebx, DS_M
    imul eax, eax, 1103515245
    add eax, 12345
    mov [i_seed], eax
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
    fstp qword [v_sgn]
    pushad
    call ds_fft
    popad
    xor ecx, ecx
.o: fld qword [ds_tab+ecx*8]
    fmul qword [v_gg]
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
    fld qword [v_sp]
    fadd qword [v_disp]
    fstp qword [v_sp]
    jmp .f
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
