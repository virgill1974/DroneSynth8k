// C++ export. The generated code mirrors engine.js line by line (same data, same operation order).
(function (G) {
  'use strict';

  function exportCpp(c, hash) {
    var N = 1 << c.win, sc = Engine().sinCos(N), W = Engine().widthMask(c);
    var K = [0.6931471805599453, 3.321928094887362 / 13107200, sc[0], sc[1]].map(function (x) { return '{' + dq(x) + 'ull}'; }).join(',');
    var rs = [0], rg = [];
    c.ins.forEach(function (I) {
      I.rg.forEach(function (r) { rg.push([r.hi, r.off, r.len, r.ls, r.ll, r.unity, r.fine, r.rate, r.attn]); });
      rs.push(rg.length);
    });
    if (!rg.length) rg.push([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    check16(rg);
    var pat = c.pat.map(function (p) { return '{' + p.join(',') + '}'; }).join(',\n');
    var ins = c.ins.map(function (I) { return '{' + [I.att, I.rel, I.vol, I.pan].join(',') + '}'; }).join(',');
    var pans = c.ins.map(function (I) { return I.pan; }).join(',');
    var L = [
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
(c.env ? 'static const int ds_ins[8][4]={' + ins + '};' : 'static const unsigned char ds_pan[8]={' + pans + '};'),
'static const int ds_rs[9]={' + rs.join(',') + '};',
'// regions: hi,len,loop start,loop len,unity,fine,rate (16 bit) + file offset, attenuation (32 bit)',
'static const short ds_rg[7][' + rg.length + ']={' + [0, 2, 3, 4, 5, 6, 7].map(function (f) { return '{' + rg.map(function (r) { return r[f]; }).join(',') + '}'; }).join(',') + '};',
'static const int ds_rgi[2][' + rg.length + ']={' + [1, 8].map(function (f) { return '{' + rg.map(function (r) { return r[f]; }).join(',') + '}'; }).join(',') + '};',
'static unsigned char ds_dls[DS_DLS_SIZE];',
(c.sm ? 'static double ds_L[DS_DRY+DS_N*3/2],ds_R[DS_DRY+DS_N*3/2],ds_re[DS_N],ds_im[DS_N],ds_tab[DS_N*5/2]; // dry buffers zero padded' :
  'static double ds_L[DS_DRY+DS_N],ds_R[DS_DRY+DS_N],ds_re[DS_N],ds_im[DS_N],ds_tab[DS_N*5/2]; // dry buffers zero padded'),
'static float ds_out[DS_OUT_LEN*2];' + (c.sm ? '\n// SMOOTH: spectrum H later, this window (L at k, R at H+k, imaginary N later), |X|^2, rotations, last output\n' +
  'static double ds_r2[DS_N],ds_i2[DS_N],ds_X[DS_N*2],ds_mg[DS_N],ds_Q[DS_N*2],ds_U[DS_N*2];' : ''),
'',
'#include <emmintrin.h>',
'static double ds_sqrt(double x){return _mm_cvtsd_f64(_mm_sqrt_sd(_mm_set_sd(x),_mm_set_sd(x)));}',
'// exact double constants (bit patterns): ln2, dls attenuation scale, sin(pi/N), cos(pi/N)',
'static const union{unsigned long long u;double d;}ds_k[4]={' + K + '};',
'static double ds_x; // ds_exp2 result: a global instead of a return value keeps MSVC x86 off the x87 FPU',
'static void ds_exp2(double x){',
' double s=1;',
' while(x<0){x+=1;s*=0.5;}',
' while(x>=1){x-=1;s*=2;}',
' double t=x*ds_k[0].d,r=1;',
' for(int k=14;k>0;k--)r=1+t/k*r;',
' ds_x=s*r;',
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
(c.env ? '  const int*I=ds_ins[c];const short*D=0;int on=0,t=0,R=0;' : '  const short*D=0;int on=0,t=0,R=0;'),
(c.env ? '  double pos=0,rate=0,env=0,d=0,g=0,pl=(127-I[3])/127.0,pr=I[3]/127.0;' : '  double pos=0,rate=0,g=0,pl=(127-ds_pan[c])/127.0,pr=ds_pan[c]/127.0;'),
(c.env ? '  for(int row=0;row<=DS_ROWS;row++){' : '  for(int row=0;row<DS_ROWS;row++){'),
(c.env ? '   int e=row<DS_ROWS?ds_pat[c][row]:255;\n   if(e==255){if(on){if(I[1]>0)d=-env/I[1];else on=0;}}\n   else if(e){' : '   int e=ds_pat[c][row];\n   if(e){'),
'    for(int k=ds_rs[c];k<ds_rs[c+1];k++){R=k;if(e<=ds_rg[0][k])break;}',
'    D=(const short*)(ds_dls+ds_rgi[0][R]);on=1;pos=0;',
'    ds_exp2((e-ds_rg[4][R])/12.0+ds_rg[5][R]/1200.0);rate=ds_x*ds_rg[6][R]/44100.0;',
(c.env ? '    ds_exp2(ds_rgi[1][R]*ds_k[1].d);g=I[2]/127.0*ds_x/32768.0;\n    if(I[0]>0){env=0;d=1.0/I[0];}else{env=1;d=0;}' : '    ds_exp2(ds_rgi[1][R]*ds_k[1].d);g=ds_x/32768.0;'),
'   }',
(c.env ? '   int end=row<DS_ROWS?t+DS_ROWLEN:DS_DRY;' : '   int end=t+DS_ROWLEN;'),
'   for(;t<end;t++)if(on){',
'    int ip=(int)pos,nx=ip+1,lend=ds_rg[2][R]+ds_rg[3][R],s0=D[ip],s1;double fr=pos-ip;',
'    if(ds_rg[3][R]){if(nx>=lend)nx-=ds_rg[3][R];s1=D[nx];}else s1=nx<ds_rg[1][R]?D[nx]:0;',
(c.env ? '    double v=(s0+(s1-s0)*fr)*env*g;' : '    double v=(s0+(s1-s0)*fr)*g;'),
'    ds_L[t]+=v*pl;ds_R[t]+=v*pr;',
(c.env ? '    env+=d;if(env>=1){env=1;d=0;}if(env<=0)on=0;\n' : '') + '    pos+=rate;if(ds_rg[3][R]){while(pos>=lend)pos-=ds_rg[3][R];}else if(pos>=ds_rg[1][R])on=0;',
'   }',
'  }',
' }',
' // pass 2: stereo paulstretch',
(c.sm ? ' const int N=DS_N,H=N/2;' : ' const int N=DS_N,H=N/2,M=(2*N>>(10-DS_DF))-1;'),
' double ts=0,tc=1;',
' for(int k=0;k<N*5/2;k++){ds_tab[k]=ts;double tt=tc*ds_k[3].d-ts*ds_k[2].d;ts=ts*ds_k[3].d+tc*ds_k[2].d;tc=tt;}',
(c.sm ? ' double g=DS_GAIN/(200.0*N),disp=H*10/(double)DS_ST;int o=0;' : ' unsigned s=DS_SEED;double g=DS_GAIN/(200.0*N),disp=H*10/(double)DS_ST;int o=0;'),
' for(double sp=0;sp<DS_DRY;sp+=disp,o+=H){',
'  int p=(int)sp;',
].concat(c.sm ? [
'  for(int h=H;h>=0;h-=H){ // SMOOTH: first the window H later (for the phase advance), then this one',
'   for(int i=0;i<N;i++){double w=ds_tab[i];ds_re[i]=ds_L[p+h+i]*w;ds_im[i]=ds_R[p+h+i]*w;}',
'   ds_fft(-1);',
'   if(h)for(int i=0;i<N;i++){ds_r2[i]=ds_re[i];ds_i2[i]=ds_im[i];}',
'  }',
] : [
'  for(int i=0;i<N;i++){double w=ds_tab[i];ds_re[i]=ds_L[p+i]*w;ds_im[i]=ds_R[p+i]*w;}',
'  ds_fft(-1);',
]).concat([
'  ds_re[0]=0;ds_im[0]=0;ds_re[H]=0;ds_im[H]=0;',
]).concat(c.sm ? [
'  // SMOOTH: phase vocoder with identity phase locking (see engine.js)',
'  for(int k=1;k<H;k++){int k2=N-k;',
'   for(int c=0;c<2;c++){int kk=c*H+k;double xr,xi,yr,yi;',
'    if(c){xr=ds_im[k]+ds_im[k2];xi=ds_re[k2]-ds_re[k];yr=ds_i2[k]+ds_i2[k2];yi=ds_r2[k2]-ds_r2[k];}',
'    else{xr=ds_re[k]+ds_re[k2];xi=ds_im[k]-ds_im[k2];yr=ds_r2[k]+ds_r2[k2];yi=ds_i2[k]-ds_i2[k2];}',
'    ds_X[kk]=xr;ds_X[N+kk]=xi;ds_mg[kk]=xr*xr+xi*xi;',
'    double tr=yr*xr+yi*xi,ti=yi*xr-yr*xi;',
'    yr=tr*xr+ti*xi;yi=ti*xr-tr*xi;',
'    tr=ds_U[kk]*yr-ds_U[N+kk]*yi;ti=ds_U[kk]*yi+ds_U[N+kk]*yr;',
'    double m=ds_sqrt(tr*tr+ti*ti);',
'    if(m>0){ds_Q[kk]=tr/m;ds_Q[N+kk]=ti/m;}else{ds_Q[kk]=1;ds_Q[N+kk]=0;}',
'   }',
'  }',
'  for(int k=1;k<H;k++){int k2=N-k;',
'   for(int c=0;c<2;c++){int b0=c*H,P=k;',
'    for(;;){if(P+1<H&&ds_mg[b0+P+1]>ds_mg[b0+P])P++;else if(P>1&&ds_mg[b0+P-1]>ds_mg[b0+P])P--;else break;} // magnitude peak',
'    int kk=b0+k;P+=b0;',
'    ds_U[kk]=ds_X[kk]*ds_Q[P]-ds_X[N+kk]*ds_Q[N+P];ds_U[N+kk]=ds_X[kk]*ds_Q[N+P]+ds_X[N+kk]*ds_Q[P];',
'   }',
'   double x=ds_U[k],y=ds_U[N+k],u=ds_U[H+k],v=ds_U[N+H+k];',
'   ds_re[k]=x-v;ds_im[k]=y+u;ds_re[k2]=x+v;ds_im[k2]=u-y;',
'  }',
] : [
'  for(int k=1;k<H;k++){',
'   int k2=N-k;double ar=ds_re[k],ai=ds_im[k],br=ds_re[k2],bi=ds_im[k2];',
'   double a=ar+br,b=ai-bi,mL=ds_sqrt(a*a+b*b);',
'   a=ai+bi;b=ar-br;',
'   double mR=ds_sqrt(a*a+b*b);',
'   s=s*1103515245u+12345u;int q=(s>>8)&M;double sL=ds_tab[q],cL=ds_tab[q+H];',
(W < 0 ? '   s=s*1103515245u+12345u;q=(s>>8)&M;double sR=ds_tab[q],cR=ds_tab[q+H];' :
  '   s=s*1103515245u+12345u;q=(q+((s>>8)&' + W + '))&M;double sR=ds_tab[q],cR=ds_tab[q+H];'),
'   double x=mL*cL,y=mL*sL,u=mR*cR,v=mR*sR;',
'   ds_re[k]=x-v;ds_im[k]=y+u;ds_re[k2]=x+v;ds_im[k2]=u-y;',
'  }',
]).concat([
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
'#endif']);
    return L.join('\n') + '\n';
  }


  // ---------- NASM export: 32-bit x87, same operation order as engine.js ----------
  // Bit-exactness: FPU precision control = 53 bit (fldcw 0x027F) makes fadd/fsub/fmul/fdiv/fsqrt round exactly
  // like IEEE double. All double constants are emitted as exact bit patterns. (int) uses fisttp (SSE3).
  // region fields except file offset/attenuation are stored as 16 bit (true for every gm.dls sample)
  function check16(rg) {
    rg.forEach(function (r) {
      [0, 2, 3, 4, 5, 6, 7].forEach(function (i) { if (r[i] < -32768 || r[i] > 32767) throw new Error('Sample-Wert passt nicht in 16 Bit (Region-Feld ' + i + ': ' + r[i] + ')'); });
    });
  }
  function Engine() { return G.Engine || require('./engine.js').Engine; }
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

  // SMOOTH pass 2 core (ecx = k = 1 on entry): phase vocoder with identity phase locking, same operation order as engine.js
  function smoothAsm() {
    // one channel of pass A. L: X = (re[k]+re[k2], im[k]-im[k2]), R: X = (im[k]+im[k2], re[k2]-re[k]); X1 alike from ds_r2
    function passA(R) {
      var o = R ? '+DS_H*8' : '', A = R ? 'ds_im' : 'ds_re', B = R ? 'ds_re' : 'ds_im', A2 = R ? 'ds_r2+DS_N*8' : 'ds_r2', B2 = R ? 'ds_r2' : 'ds_r2+DS_N*8';
      var s1 = R ? 'edx' : 'ecx', s2 = R ? 'ecx' : 'edx', l = R ? 'R' : 'L';
      return `    fld qword [${A}+ecx*8]
    fadd qword [${A}+edx*8]
    fld qword [${B}+${s1}*8]
    fsub qword [${B}+${s2}*8]        ; xi xr
    fst qword [ds_X+ecx*8+DS_N*8${o}]
    fxch
    fst qword [ds_X+ecx*8${o}]
    fxch
    fld st1
    fmul st0, st0
    fld st1
    fmul st0, st0
    faddp st1, st0
    fstp qword [ds_mg+ecx*8${o}]
    fld qword [${A2}+ecx*8]
    fadd qword [${A2}+edx*8]
    fld qword [${B2}+${s1}*8]
    fsub qword [${B2}+${s2}*8]       ; yi yr xi xr
    fld st1
    fmul st0, st4
    fld st1
    fmul st0, st4
    faddp st1, st0                 ; tr yi yr xi xr
    fxch st2
    fmul st0, st3
    fxch
    fmul st0, st4
    fsubrp st1, st0                ; ti tr xi xr
    fld st1
    fmul st0, st4
    fld st1
    fmul st0, st4
    faddp st1, st0                 ; yr ti tr xi xr
    fxch st2
    fmulp st3, st0
    fmulp st3, st0
    fxch st2
    fsubrp st1, st0                ; yi yr
    fld qword [ds_U+ecx*8${o}]
    fmul st0, st2
    fld qword [ds_U+ecx*8+DS_N*8${o}]
    fmul st0, st2
    fsubp st1, st0                 ; tr yi yr
    fxch st1
    fmul qword [ds_U+ecx*8${o}]
    fxch st2
    fmul qword [ds_U+ecx*8+DS_N*8${o}]
    faddp st2, st0                 ; tr ti
    fld st0
    fmul st0, st0
    fld st2
    fmul st0, st0
    faddp st1, st0
    fsqrt
    fldz
    fcomip st0, st1
    jae .z${l}
    fdiv st1, st0
    fdivp st2, st0
    jmp .s${l}
.z${l}: fcompp
    fstp st0
    fldz
    fld1
.s${l}: fstp qword [ds_Q+ecx*8${o}]
    fstp qword [ds_Q+ecx*8+DS_N*8${o}]
`;
    }
    // one channel of pass B: climb to the magnitude peak P (esi), U = X * Q[P]
    function passB(R) {
      var o = R ? '+DS_H*8' : '', l = R ? 'R' : 'L';
      return `    mov esi, ecx
.c${l}: lea eax, [esi+1]
    cmp eax, DS_H
    jge .n${l}
    fld qword [ds_mg+esi*8+8${o}]
    fld qword [ds_mg+esi*8${o}]
    fcomip st0, st1
    fstp st0
    jb .u${l}
.n${l}: cmp esi, 1
    jle .p${l}
    fld qword [ds_mg+esi*8-8${o}]
    fld qword [ds_mg+esi*8${o}]
    fcomip st0, st1
    fstp st0
    jae .p${l}
    dec esi
    jmp .c${l}
.u${l}: inc esi
    jmp .c${l}
.p${l}: fld qword [ds_X+ecx*8${o}]
    fld qword [ds_X+ecx*8+DS_N*8${o}]
    fld st1
    fmul qword [ds_Q+esi*8${o}]
    fld st1
    fmul qword [ds_Q+esi*8+DS_N*8${o}]
    fsubp st1, st0
    fstp qword [ds_U+ecx*8${o}]
    fmul qword [ds_Q+esi*8${o}]
    fxch
    fmul qword [ds_Q+esi*8+DS_N*8${o}]
    faddp st1, st0
    fstp qword [ds_U+ecx*8+DS_N*8${o}]
`;
    }
    return `.pa: mov edx, DS_N                ; SMOOTH pass A: X, |X|^2, Q = normalize(U * X1 * conj(X)^2) per bin
    sub edx, ecx
` + passA(0) + passA(1) + `    inc ecx
    cmp ecx, DS_H
    jl .pa
    xor ecx, ecx
    inc ecx
.pb: mov edx, DS_N                ; pass B: every bin turned by the rotation of its magnitude peak, then packed
    sub edx, ecx
` + passB(0) + passB(1) + `    fld qword [ds_U+ecx*8]
    fsub qword [ds_U+ecx*8+DS_N*8+DS_H*8]
    fstp qword [ds_re+ecx*8]
    fld qword [ds_U+ecx*8+DS_N*8]
    fadd qword [ds_U+ecx*8+DS_H*8]
    fstp qword [ds_im+ecx*8]
    fld qword [ds_U+ecx*8]
    fadd qword [ds_U+ecx*8+DS_N*8+DS_H*8]
    fstp qword [ds_re+edx*8]
    fld qword [ds_U+ecx*8+DS_H*8]
    fsub qword [ds_U+ecx*8+DS_N*8]
    fstp qword [ds_im+edx*8]
    inc ecx
    cmp ecx, DS_H
    jl .pb
`;
  }

  function exportAsm(c, hash) {
    var rs = [0], rg = [], pat = [], ins = [];
    c.ins.forEach(function (I) {
      I.rg.forEach(function (r) { rg.push([r.hi, r.off, r.len, r.ls, r.ll, r.unity, r.fine, r.rate, r.attn]); });
      rs.push(rg.length);
      ins.push(c.env ? [I.att, I.rel, I.vol, I.pan] : [I.pan]);
    });
    if (!rg.length) rg.push([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    check16(rg);
    ins = [].concat.apply([], ins);
    c.pat.forEach(function (p) { pat = pat.concat(p); });
    var N = 1 << c.win, sc = Engine().sinCos(N), W = Engine().widthMask(c);
    var rngR = W < 0 ? '' : `    and eax, ${W}
    add eax, ebx
`;
    // without envelope, volume and note-off (c.env false) the tracker needs only pan and the plain sample loop
    var chHead = c.env ? `.ch: mov eax, [V(i_ch)]
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
` : `.ch: mov eax, [V(i_ch)]
    movzx eax, byte [ds_pan+eax]
    push 127
    pop edx
    sub edx, eax
    mov [V(i_tmp)], edx
    fild dword [V(i_tmp)]
    fidiv dword [V(c127)]
    fstp qword [V(v_pl)]
    mov [V(i_tmp)], eax
    fild dword [V(i_tmp)]
    fidiv dword [V(c127)]
    fstp qword [V(v_pr)]
`;
    var rowHead = c.env ? `.row: mov eax, [V(i_row)]
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
` : `.row: imul edx, [V(i_ch)], DS_ROWS
    add edx, [V(i_row)]
    movzx edx, byte [ds_pat+edx]
    test edx, edx
`;
    var noteGain = c.env ? `    mov eax, [V(i_iptr)]
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
` : `    fild dword [esi+18]
    fmul qword [V(v_att)]
    call ds_exp2
    fidiv dword [V(c32768)]
    fstp qword [V(v_g)]
.evd: lea ecx, [edi+DS_ROWLEN]
    mov [V(i_end)], ecx
`;
    var envStep = c.env ? `    fld qword [V(v_env)]
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
.e2: ` : '    ';
    var smCode = !c.sm ? '' : smoothAsm();
    return `; DroneSynth8k ASM export (generated). NASM, 32-bit x86, x87 FPU. Pass 1: gm.dls tracker, pass 2: stereo Paulstretch.
; Bit-exact with the web tool and the C++ export. Expected FNV-1a hash of ds_out: ${hash || '?'}
; gm.dls size when exported: ${c.dlsSize} bytes (sample offsets below are absolute file offsets).
; Requires SSE3 (fisttp). Sets the FPU to 53-bit precision; do not change the FPU control word while ds_render runs.
; Build:  nasm -f win32 dronesynth.asm   (link with crinkler: kernel32.lib user32.lib winmm.lib)
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
%define DS_SEED ${c.seed}
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
%define V(x) ebp+x-ds_vb           ; scalars/constants: ebp-relative, 1-byte displacement

section .data
align 8
ds_v:                              ; ---- scalar block, ebp = ds_vb ----
v_ln2:   dq ${dq(0.6931471805599453)}
v_att:   dq ${dq(3.321928094887362 / 13107200)}
v_S:     dq ${dq(sc[0])}           ; sin(pi/N)
v_C:     dq ${dq(sc[1])}           ; cos(pi/N)
v_half:  dq ${dq(0.5)}
v_m1:    dq ${dq(-1)}
v_pos:   dq 0
v_rate:  dq 0
${c.env ? 'v_env:   dq 0\nv_d:     dq 0\n' : ''}v_g:     dq 0
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
c200N:   dd ${200 * N}
cH10:    dd ${(N >> 1) * 10}
cST:     dd ${c.st}
cDRY:    dd DS_DRY
cGAIN:   dd ${c.gain}
i_tmp:   dd 0
i_k:     dd 0
i_ip:    dd 0
i_s0:    dd 0
i_on:    dd 0
i_row:   dd 0
i_end:   dd 0
${c.env ? 'i_iptr:  dd 0\n' : ''}i_seed:  dd DS_SEED
i_p:     dd 0
i_st:    dd 0
i_ch:    dd 0
cw:      dw 0x027F
ds_vb equ ds_v+128
ds_pat:
${lines(pat, 32, 'db')}
${c.env ? 'ds_ins:\n' + lines(ins, 16, 'dd') : 'ds_pan:\n' + lines(ins, 8, 'db')}
ds_rs:
${lines(rs, 9, 'dd')}
ds_rg:     ; 22 bytes each: hi(w), file offset(d), len, loop start, loop len, unity, fine, rate (w), attenuation(d)
${rg.map(function (r) { return '  dw ' + r[0] + '\n  dd ' + r[1] + '\n  dw ' + r.slice(2, 8).join(',') + '\n  dd ' + r[8]; }).join('\n')}
%ifndef DS_NOLOAD
ds_path:   db DS_GMDLS, 0
%endif
%ifndef DS_NO_PLAYER
ds_wfx:    dw 3, 2
           dd 44100, 44100*8
           dw 8, 32, 0
ds_hdr:    dd ds_out, DS_OUT_LEN*8, 0, 0, 0, 0, 0, 0
ds_wo:     dd 0
%endif

section .bss
alignb 8
${c.sm ? 'ds_L:      resq DS_DRY+DS_N+DS_H    ; zero padded: window reads past the end need no check\nds_R:      resq DS_DRY+DS_N+DS_H\n' : 'ds_L:      resq DS_DRY+DS_N         ; zero padded: window reads past the end need no check\nds_R:      resq DS_DRY+DS_N\n'}ds_re:     resq DS_N
ds_im:     resq DS_N
ds_tab:    resq DS_N*5/2
ds_out:    resd DS_OUT_LEN*2
${c.sm ? 'ds_r2:     resq DS_N*2           ; SMOOTH: spectrum H later (re, then im)\nds_X:      resq DS_N*2           ; this window: L at k, R at H+k; imaginary parts N later\nds_mg:     resq DS_N             ; |X|^2\nds_Q:      resq DS_N*2           ; rotation per bin\nds_U:      resq DS_N*2           ; last output spectrum\n' : ''}ds_dls:    resb DS_DLS_SIZE

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
${chHead}    xor edi, edi
    mov [V(i_on)], edi
    mov [V(i_row)], edi
${rowHead}    jz .evd
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
${noteGain}.s: cmp edi, [V(i_end)]
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
${c.env ? '    fmul qword [V(v_env)]\n' : ''}    fmul qword [V(v_g)]
    fld st0
    fmul qword [V(v_pl)]
    fadd qword [ds_L+edi*8]
    fstp qword [ds_L+edi*8]
    fmul qword [V(v_pr)]
    fadd qword [ds_R+edi*8]
    fstp qword [ds_R+edi*8]
${envStep}fld qword [V(v_pos)]
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
    ${c.env ? 'jbe' : 'jb'} .row
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
${c.sm ? '    mov esi, DS_H                  ; SMOOTH: first the window H later (phase advance), then this one\n.wh: ' : '    '}xor ecx, ecx
.w: mov eax, [V(i_p)]
    add eax, ecx
${c.sm ? '    add eax, esi\n' : ''}    fld qword [ds_tab+ecx*8]
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
${c.sm ? `    test esi, esi
    jz .wd
    pushad                         ; spectrum H later -> ds_r2 (ds_re/ds_im are contiguous)
    mov esi, ds_re
    mov edi, ds_r2
    mov ecx, DS_N*4
    rep movsd
    popad
    xor esi, esi
    jmp .wh
.wd: ` : '    '}fldz
    fst qword [ds_re]
    fst qword [ds_im]
    fst qword [ds_re+DS_H*8]
    fstp qword [ds_im+DS_H*8]
    xor ecx, ecx
    inc ecx
${c.sm ? smCode : `.k: mov edx, DS_N
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
${rngR}    and eax, DS_M
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
`}    fld1
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
section .text$pos code              ; own sections: Crinkler drops ds_pos when it is never called
ds_pos:            ; current playback position in frames
    push 12
    push ds_mmt
    push dword [ds_wo]
    call [__imp__waveOutGetPosition@12]
    mov eax, [ds_mmt+4]
    ret
section .data$pos data
ds_mmt:    dd 2, 0, 0
%endif
`;
  }

  G.Export = { cpp: exportCpp, asm: exportAsm };
})(typeof window !== 'undefined' ? window : module.exports);
