// C++ export. The generated code mirrors engine.js line by line (same data, same operation order).
(function (G) {
  'use strict';

  function exportCpp(c, hash) {
    var rs = [0], rg = [];
    c.ins.forEach(function (I) {
      I.rg.forEach(function (r) { rg.push([r.hi, r.off, r.len, r.ls, r.ll, r.unity, r.fine, r.rate, r.attn]); });
      rs.push(rg.length);
    });
    if (!rg.length) rg.push([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    var pat = c.pat.map(function (p) { return '{' + p.join(',') + '}'; }).join(',\n');
    var ins = c.ins.map(function (I) { return '{' + [I.att, I.rel, I.vol, I.pan].join(',') + '}'; }).join(',');
    var L = [];
    L.push(
'// DroneSynth8k export (generated). Pass 1: gm.dls tracker render, pass 2: stereo Paulstretch.',
'// Output: ds_out = DS_OUT_LEN stereo frames, float32 interleaved, 44100 Hz. Bit-exact with the web tool.',
'// gm.dls size when exported: ' + c.dlsSize + ' bytes (sample offsets below are absolute file offsets).',
'// Expected FNV-1a hash of ds_out (#define DS_VERIFY, then ds_hash()): ' + (hash || '?'),
'// Build: MSVC x64 or x86 /arch:SSE2, /fp:precise. Never /fp:fast, /fp:contract, /arch:IA32 (x87) or FMA.',
'//        gcc/clang: -ffp-contract=off -msse2 -mfpmath=sse',
'// Use:   ds_render(); ds_play();   (#define DS_NO_PLAYER to skip waveOut, link winmm.lib otherwise)',
'#pragma once',
'#define DS_ROWS ' + c.rows,
'#define DS_ROWLEN ' + c.rowLen,
'#define DS_DRY ' + c.dryLen,
'#define DS_N ' + (1 << c.win),
'#define DS_ST ' + c.st,
'#define DS_SEED ' + c.seed + 'u',
'#define DS_GAIN ' + c.gain,
'#define DS_DF ' + c.df,
'#define DS_OUT_LEN ' + c.outLen,
'#define DS_DLS_SIZE ' + c.dlsSize,
'#ifndef DS_GMDLS',
'#define DS_GMDLS "C:\\\\Windows\\\\System32\\\\drivers\\\\gm.dls"',
'#endif',
'static const unsigned char ds_pat[8][DS_ROWS]={',
pat + '};',
'static const int ds_ins[8][4]={' + ins + '};',
'static const int ds_rs[9]={' + rs.join(',') + '};',
'static const int ds_rg[][9]={' + rg.map(function (r) { return '{' + r.join(',') + '}'; }).join(',') + '};',
'static unsigned char ds_dls[DS_DLS_SIZE];',
'static double ds_L[DS_DRY],ds_R[DS_DRY],ds_re[DS_N],ds_im[DS_N],ds_tab[DS_N*5/2];',
'static float ds_out[DS_OUT_LEN*2];',
'',
'#include <emmintrin.h>',
'static double ds_sqrt(double x){return _mm_cvtsd_f64(_mm_sqrt_sd(_mm_set_sd(x),_mm_set_sd(x)));}',
'static double ds_sin(double x){',
' while(x>3.141592653589793)x-=6.283185307179586;',
' while(x<-3.141592653589793)x+=6.283185307179586;',
' if(x>1.5707963267948966)x=3.141592653589793-x;else if(x<-1.5707963267948966)x=-3.141592653589793-x;',
' double x2=x*x,r=1;',
' for(int k=16;k>0;k-=2)r=1-x2/((k+1)*k)*r;',
' return x*r;',
'}',
'static double ds_exp2(double x){',
' double s=1;',
' while(x<0){x+=1;s*=0.5;}',
' while(x>=1){x-=1;s*=2;}',
' double t=x*0.6931471805599453,r=1;',
' for(int k=14;k>0;k--)r=1+t/k*r;',
' return s*r;',
'}',
'static void ds_fft(int sg){',
' const int N=DS_N;double*re=ds_re,*im=ds_im;',
' for(int i=1,j=0;i<N;i++){',
'  int b=N>>1;',
'  for(;j&b;b>>=1)j^=b;',
'  j^=b;',
'  if(i<j){double t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t;}',
' }',
' for(int len=2;len<=N;len<<=1){',
'  int h=len>>1,st=N/len;',
'  for(int i=0;i<N;i+=len)for(int k=0;k<h;k++){',
'   double wr=ds_tab[2*k*st+N/2],wi=sg*ds_tab[2*k*st];int a=i+k,bb=a+h;',
'   double tr=re[bb]*wr-im[bb]*wi,ti=re[bb]*wi+im[bb]*wr;',
'   re[bb]=re[a]-tr;im[bb]=im[a]-ti;re[a]+=tr;im[a]+=ti;',
'  }',
' }',
'}',
'#ifdef DS_LOAD',
'static void ds_load();',
'#else',
'#include <windows.h>',
'static void ds_load(){',
' DWORD n;HANDLE f=CreateFileA(DS_GMDLS,GENERIC_READ,FILE_SHARE_READ,0,OPEN_EXISTING,0,0);',
' ReadFile(f,ds_dls,DS_DLS_SIZE,&n,0);CloseHandle(f);',
'}',
'#endif',
'static void ds_render(){',
' ds_load();',
' // pass 1: tracker',
' for(int c=0;c<8;c++){',
'  const int*I=ds_ins[c],*r=ds_rg[0];const short*D=0;int on=0,t=0;',
'  double pos=0,rate=0,env=0,d=0,g=0,pl=(127-I[3])/127.0,pr=I[3]/127.0;',
'  for(int row=0;row<=DS_ROWS;row++){',
'   int e=row<DS_ROWS?ds_pat[c][row]:255;',
'   if(e==255){if(on){if(I[1]>0)d=-env/I[1];else on=0;}}',
'   else if(e){',
'    for(int k=ds_rs[c];k<ds_rs[c+1];k++){r=ds_rg[k];if(e<=r[0])break;}',
'    D=(const short*)(ds_dls+r[1]);on=1;pos=0;',
'    rate=ds_exp2((e-r[5])/12.0+r[6]/1200.0)*r[7]/44100.0;',
'    g=I[2]/127.0*ds_exp2(r[8]*(3.321928094887362/13107200.0))/32768.0;',
'    if(I[0]>0){env=0;d=1.0/I[0];}else{env=1;d=0;}',
'   }',
'   int end=row<DS_ROWS?t+DS_ROWLEN:DS_DRY;',
'   for(;t<end;t++)if(on){',
'    int ip=(int)pos,nx=ip+1,lend=r[3]+r[4],s0=D[ip],s1;double fr=pos-ip;',
'    if(r[4]){if(nx>=lend)nx-=r[4];s1=D[nx];}else s1=nx<r[2]?D[nx]:0;',
'    double v=(s0+(s1-s0)*fr)*env*g;',
'    ds_L[t]+=v*pl;ds_R[t]+=v*pr;',
'    env+=d;if(env>=1){env=1;d=0;}if(env<=0)on=0;',
'    pos+=rate;if(r[4]){while(pos>=lend)pos-=r[4];}else if(pos>=r[2])on=0;',
'   }',
'  }',
' }',
' // pass 2: stereo paulstretch',
' const int N=DS_N,H=N/2,M=(2*N>>(10-DS_DF))-1;',
' for(int k=0;k<N*5/2;k++)ds_tab[k]=ds_sin(3.141592653589793*k/N);',
' unsigned s=DS_SEED;double g=DS_GAIN/(200.0*N),disp=H*10/(double)DS_ST;int o=0;',
' for(double sp=0;sp<DS_DRY;sp+=disp,o+=H){',
'  int p=(int)sp;',
'  for(int i=0;i<N;i++){int j=p+i;double w=ds_tab[i];ds_re[i]=j<DS_DRY?ds_L[j]*w:0;ds_im[i]=j<DS_DRY?ds_R[j]*w:0;}',
'  ds_fft(-1);',
'  ds_re[0]=0;ds_im[0]=0;ds_re[H]=0;ds_im[H]=0;',
'  for(int k=1;k<H;k++){',
'   int k2=N-k;double ar=ds_re[k],ai=ds_im[k],br=ds_re[k2],bi=ds_im[k2];',
'   double a=ar+br,b=ai-bi,mL=ds_sqrt(a*a+b*b);',
'   a=ai+bi;b=ar-br;',
'   double mR=ds_sqrt(a*a+b*b);',
'   s=s*1103515245u+12345u;int q=(s>>8)&M;double sL=ds_tab[q],cL=ds_tab[q+H];',
'   s=s*1103515245u+12345u;q=(s>>8)&M;double sR=ds_tab[q],cR=ds_tab[q+H];',
'   double x=mL*cL,y=mL*sL,u=mR*cR,v=mR*sR;',
'   ds_re[k]=x-v;ds_im[k]=y+u;ds_re[k2]=x+v;ds_im[k2]=u-y;',
'  }',
'  ds_fft(1);',
'  for(int i=0;i<N;i++){double w=ds_tab[i]*g;ds_out[2*(o+i)]+=ds_re[i]*w;ds_out[2*(o+i)+1]+=ds_im[i]*w;}',
' }',
'}',
'#ifdef DS_VERIFY',
'static unsigned ds_hash(){unsigned h=2166136261u;const unsigned*u=(const unsigned*)ds_out;for(int i=0;i<DS_OUT_LEN*2;i++){h^=u[i];h*=16777619u;}return h;}',
'#endif',
'#ifndef DS_NO_PLAYER',
'#include <windows.h>',
'#pragma comment(lib,"winmm.lib")',
'#include <mmsystem.h>',
'static WAVEFORMATEX ds_wfx={3,2,44100,44100*8,8,32,0};',
'static WAVEHDR ds_hdr;',
'static HWAVEOUT ds_wo;',
'static void ds_play(){',
' ds_hdr.lpData=(LPSTR)ds_out;ds_hdr.dwBufferLength=DS_OUT_LEN*8;',
' waveOutOpen(&ds_wo,WAVE_MAPPER,&ds_wfx,0,0,0);',
' waveOutPrepareHeader(ds_wo,&ds_hdr,sizeof(ds_hdr));',
' waveOutWrite(ds_wo,&ds_hdr,sizeof(ds_hdr));',
'}',
'static int ds_pos(){MMTIME t={TIME_SAMPLES};waveOutGetPosition(ds_wo,&t,sizeof(t));return t.u.sample;} // in frames',
'#endif');
    return L.join('\n') + '\n';
  }


  // ---------- NASM export: 32-bit x87, same operation order as engine.js ----------
  // Bit-exactness: FPU precision control = 53 bit (fldcw 0x027F) makes fadd/fsub/fmul/fdiv/fsqrt round exactly
  // like IEEE double. All double constants are emitted as exact bit patterns. (int) uses fisttp (SSE3).
  function dq(x) {
    var dv = new DataView(new ArrayBuffer(8)), h = function (v) { return ('0000000' + v.toString(16)).slice(-8); };
    dv.setFloat64(0, x);
    return '0x' + h(dv.getUint32(0)) + h(dv.getUint32(4));
  }
  function lines(arr, per, fmt) {
    var o = [];
    for (var i = 0; i < arr.length; i += per) o.push('  ' + fmt + ' ' + arr.slice(i, i + per).join(','));
    return o.join('\n');
  }

  function exportAsm(c, hash) {
    var rs = [0], rg = [], pat = [];
    c.ins.forEach(function (I) {
      I.rg.forEach(function (r) { rg.push([r.hi, r.off, r.len, r.ls, r.ll, r.unity, r.fine, r.rate, r.attn]); });
      rs.push(rg.length);
    });
    if (!rg.length) rg.push([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    c.pat.forEach(function (p) { pat = pat.concat(p); });
    var ins = [];
    c.ins.forEach(function (I) { ins.push(I.att, I.rel, I.vol, I.pan); });
    var N = 1 << c.win, PI = 3.141592653589793;
    return `; DroneSynth8k ASM export (generated). NASM, 32-bit x86, x87 FPU. Pass 1: gm.dls tracker, pass 2: stereo Paulstretch.
; Bit-exact with the web tool and the C++ export. Expected FNV-1a hash of ds_out: ${hash || '?'}
; gm.dls size when exported: ${c.dlsSize} bytes (sample offsets below are absolute file offsets).
; Requires SSE3 (fisttp). Sets the FPU to 53-bit precision; do not change the FPU control word while ds_render runs.
; Build:  nasm -f win32 dronesynth.asm   (link with crinkler: kernel32.lib winmm.lib)
; Use from C:  extern "C" void ds_render(); extern "C" void ds_play(); extern "C" int ds_pos(); extern "C" float ds_out[];
; Options: %define DS_NO_PLAYER (no waveOut), DS_NOLOAD (fill ds_dls yourself), DS_GMDLS "path",
;          DS_VERIFY (adds ds_hash(): FNV-1a of ds_out, must equal the hash above)
bits 32
%define DS_ROWS ${c.rows}
%define DS_ROWLEN ${c.rowLen}
%define DS_DRY ${c.dryLen}
%define DS_N ${N}
%define DS_H ${N >> 1}
%define DS_M ${(2 * N >> (10 - c.df)) - 1}
%define DS_ST ${c.st}
%define DS_SEED ${c.seed}
%define DS_GAIN ${c.gain}
%define DS_OUT_LEN ${c.outLen}
%define DS_DLS_SIZE ${c.dlsSize}
%ifndef DS_GMDLS
%define DS_GMDLS "C:\\Windows\\System32\\drivers\\gm.dls"
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
ds_c200N:  dd ${200 * N}
ds_cH10:   dd ${(N >> 1) * 10}
ds_cST:    dd DS_ST
ds_cDRY:   dd DS_DRY
ds_cGAIN:  dd DS_GAIN
ds_PI:     dq ${dq(PI)}
ds_mPI:    dq ${dq(-PI)}
ds_PI_2:   dq ${dq(1.5707963267948966)}
ds_mPI_2:  dq ${dq(-1.5707963267948966)}
ds_2PI:    dq ${dq(6.283185307179586)}
ds_LN2:    dq ${dq(0.6931471805599453)}
ds_ATT:    dq ${dq(3.321928094887362 / 13107200)}
ds_half:   dq ${dq(0.5)}
ds_m1:     dq ${dq(-1)}
ds_pat:
${lines(pat, 32, 'db')}
ds_ins:
${lines(ins, 16, 'dd')}
ds_rs:
${lines(rs, 9, 'dd')}
ds_rg:     ; hi, file offset, len, loop start, loop len, unity, fine, rate, attenuation
${rg.map(function (r) { return '  dd ' + r.join(','); }).join('\n')}
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
`;
  }

  G.Export = { cpp: exportCpp, asm: exportAsm };
})(typeof window !== 'undefined' ? window : module.exports);
