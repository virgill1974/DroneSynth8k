// DroneSynth8k export (generated). Pass 1: gm.dls tracker render, pass 2: stereo Paulstretch.
// Output: ds_out = DS_OUT_LEN stereo frames, float32 interleaved, 44100 Hz. Bit-exact with the web tool.
// gm.dls size when exported: 3440660 bytes (sample offsets below are absolute file offsets).
// Expected FNV-1a hash of ds_out (#define DS_VERIFY, then ds_hash()): c81aa935
// Build: MSVC x64 or x86 /arch:SSE2, /fp:precise. Never /fp:fast, /fp:contract, /arch:IA32 (x87) or FMA.
//        gcc/clang: -ffp-contract=off -msse2 -mfpmath=sse
// Use:   ds_render(); ds_play();   (#define DS_NO_PLAYER to skip waveOut, link winmm.lib otherwise)
#pragma once
#define DS_ROWS 16
#define DS_ROWLEN 2756
#define DS_DRY 70556
#define DS_N 32768
#define DS_ST 47
#define DS_SEED 1u
#define DS_GAIN 141
#define DS_DF 10
#define DS_OUT_LEN 360448
#define DS_DLS_SIZE 3440660
#ifndef DS_GMDLS
#define DS_GMDLS "C:\\Windows\\System32\\drivers\\gm.dls"
#endif
static const unsigned char ds_pat[8][DS_ROWS]={
{21,0,0,0,0,0,0,0,28,0,0,0,0,0,0,0},
{0,0,96,0,0,0,103,0,0,0,108,0,0,0,112,0},
{0,0,0,0,100,0,0,0,0,0,0,0,105,0,0,0},
{36,0,0,0,0,0,0,0,0,0,0,0,0,0,0,255},
{0,0,0,0,0,96,0,0,0,0,0,0,0,101,0,0},
{0,0,0,52,0,0,0,0,0,60,0,66,0,0,0,0},
{0,0,0,0,24,0,0,0,0,0,0,0,26,0,0,0},
{0,108,0,0,0,0,0,0,0,115,0,0,0,0,0,0}};
static const int ds_ins[8][4]={{0,26460,127,20},{0,26460,110,112},{0,26460,100,10},{8820,26460,100,30},{4410,26460,80,100},{0,22050,90,85},{0,26460,120,100},{0,26460,70,64}};
static const int ds_rs[9]={0,1,3,5,6,7,10,11,12};
static const int ds_rg[][9]={{38,1869034,13672,11989,1682,36,-4,22050,-7405568},{97,2032078,6442,5392,1049,92,1,22050,-5373952},{127,2045128,4842,4686,155,103,3,22050,-6177060},{100,2032078,6442,5392,1049,92,1,22050,-5261590},{127,2045128,4842,4686,155,103,3,22050,-5261590},{127,2421238,13669,1,13667,70,44,22050,-1636067},{127,501698,4023,2536,1486,77,13,22050,-3276800},{52,1507508,17434,0,0,56,0,22050,-655360},{60,2412978,4047,0,0,75,0,22050,-1638400},{66,883860,5984,7,5976,86,45,22050,0},{38,1869034,13672,11989,1682,36,-4,22050,-7405568},{127,1114670,3196,2374,821,81,-12,22050,-2686976}};
static unsigned char ds_dls[DS_DLS_SIZE];
static double ds_L[DS_DRY],ds_R[DS_DRY],ds_re[DS_N],ds_im[DS_N],ds_tab[DS_N*5/2];
static float ds_out[DS_OUT_LEN*2];

#include <emmintrin.h>
static double ds_sqrt(double x){return _mm_cvtsd_f64(_mm_sqrt_sd(_mm_set_sd(x),_mm_set_sd(x)));}
static double ds_sin(double x){
 while(x>3.141592653589793)x-=6.283185307179586;
 while(x<-3.141592653589793)x+=6.283185307179586;
 if(x>1.5707963267948966)x=3.141592653589793-x;else if(x<-1.5707963267948966)x=-3.141592653589793-x;
 double x2=x*x,r=1;
 for(int k=16;k>0;k-=2)r=1-x2/((k+1)*k)*r;
 return x*r;
}
static double ds_exp2(double x){
 double s=1;
 while(x<0){x+=1;s*=0.5;}
 while(x>=1){x-=1;s*=2;}
 double t=x*0.6931471805599453,r=1;
 for(int k=14;k>0;k--)r=1+t/k*r;
 return s*r;
}
static void ds_fft(int sg){
 const int N=DS_N;double*re=ds_re,*im=ds_im;
 for(int i=1,j=0;i<N;i++){
  int b=N>>1;
  for(;j&b;b>>=1)j^=b;
  j^=b;
  if(i<j){double t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t;}
 }
 for(int len=2;len<=N;len<<=1){
  int h=len>>1,st=N/len;
  for(int i=0;i<N;i+=len)for(int k=0;k<h;k++){
   double wr=ds_tab[2*k*st+N/2],wi=sg*ds_tab[2*k*st];int a=i+k,bb=a+h;
   double tr=re[bb]*wr-im[bb]*wi,ti=re[bb]*wi+im[bb]*wr;
   re[bb]=re[a]-tr;im[bb]=im[a]-ti;re[a]+=tr;im[a]+=ti;
  }
 }
}
#ifdef DS_LOAD
static void ds_load();
#else
#include <windows.h>
static void ds_load(){
 DWORD n;HANDLE f=CreateFileA(DS_GMDLS,GENERIC_READ,FILE_SHARE_READ,0,OPEN_EXISTING,0,0);
 ReadFile(f,ds_dls,DS_DLS_SIZE,&n,0);CloseHandle(f);
}
#endif
static void ds_render(){
 ds_load();
 // pass 1: tracker
 for(int c=0;c<8;c++){
  const int*I=ds_ins[c],*r=ds_rg[0];const short*D=0;int on=0,t=0;
  double pos=0,rate=0,env=0,d=0,g=0,pl=(127-I[3])/127.0,pr=I[3]/127.0;
  for(int row=0;row<=DS_ROWS;row++){
   int e=row<DS_ROWS?ds_pat[c][row]:255;
   if(e==255){if(on){if(I[1]>0)d=-env/I[1];else on=0;}}
   else if(e){
    for(int k=ds_rs[c];k<ds_rs[c+1];k++){r=ds_rg[k];if(e<=r[0])break;}
    D=(const short*)(ds_dls+r[1]);on=1;pos=0;
    rate=ds_exp2((e-r[5])/12.0+r[6]/1200.0)*r[7]/44100.0;
    g=I[2]/127.0*ds_exp2(r[8]*(3.321928094887362/13107200.0))/32768.0;
    if(I[0]>0){env=0;d=1.0/I[0];}else{env=1;d=0;}
   }
   int end=row<DS_ROWS?t+DS_ROWLEN:DS_DRY;
   for(;t<end;t++)if(on){
    int ip=(int)pos,nx=ip+1,lend=r[3]+r[4],s0=D[ip],s1;double fr=pos-ip;
    if(r[4]){if(nx>=lend)nx-=r[4];s1=D[nx];}else s1=nx<r[2]?D[nx]:0;
    double v=(s0+(s1-s0)*fr)*env*g;
    ds_L[t]+=v*pl;ds_R[t]+=v*pr;
    env+=d;if(env>=1){env=1;d=0;}if(env<=0)on=0;
    pos+=rate;if(r[4]){while(pos>=lend)pos-=r[4];}else if(pos>=r[2])on=0;
   }
  }
 }
 // pass 2: stereo paulstretch
 const int N=DS_N,H=N/2,M=(2*N>>(10-DS_DF))-1;
 for(int k=0;k<N*5/2;k++)ds_tab[k]=ds_sin(3.141592653589793*k/N);
 unsigned s=DS_SEED;double g=DS_GAIN/(200.0*N),disp=H*10/(double)DS_ST;int o=0;
 for(double sp=0;sp<DS_DRY;sp+=disp,o+=H){
  int p=(int)sp;
  for(int i=0;i<N;i++){int j=p+i;double w=ds_tab[i];ds_re[i]=j<DS_DRY?ds_L[j]*w:0;ds_im[i]=j<DS_DRY?ds_R[j]*w:0;}
  ds_fft(-1);
  ds_re[0]=0;ds_im[0]=0;ds_re[H]=0;ds_im[H]=0;
  for(int k=1;k<H;k++){
   int k2=N-k;double ar=ds_re[k],ai=ds_im[k],br=ds_re[k2],bi=ds_im[k2];
   double a=ar+br,b=ai-bi,mL=ds_sqrt(a*a+b*b);
   a=ai+bi;b=ar-br;
   double mR=ds_sqrt(a*a+b*b);
   s=s*1103515245u+12345u;int q=(s>>8)&M;double sL=ds_tab[q],cL=ds_tab[q+H];
   s=s*1103515245u+12345u;q=(s>>8)&M;double sR=ds_tab[q],cR=ds_tab[q+H];
   double x=mL*cL,y=mL*sL,u=mR*cR,v=mR*sR;
   ds_re[k]=x-v;ds_im[k]=y+u;ds_re[k2]=x+v;ds_im[k2]=u-y;
  }
  ds_fft(1);
  for(int i=0;i<N;i++){double w=ds_tab[i]*g;ds_out[2*(o+i)]+=ds_re[i]*w;ds_out[2*(o+i)+1]+=ds_im[i]*w;}
 }
}
#ifdef DS_VERIFY
static unsigned ds_hash(){unsigned h=2166136261u;const unsigned*u=(const unsigned*)ds_out;for(int i=0;i<DS_OUT_LEN*2;i++){h^=u[i];h*=16777619u;}return h;}
#endif
#ifndef DS_NO_PLAYER
#include <windows.h>
#pragma comment(lib,"winmm.lib")
#include <mmsystem.h>
static WAVEFORMATEX ds_wfx={3,2,44100,44100*8,8,32,0};
static WAVEHDR ds_hdr;
static HWAVEOUT ds_wo;
static void ds_play(){
 ds_hdr.lpData=(LPSTR)ds_out;ds_hdr.dwBufferLength=DS_OUT_LEN*8;
 waveOutOpen(&ds_wo,WAVE_MAPPER,&ds_wfx,0,0,0);
 waveOutPrepareHeader(ds_wo,&ds_hdr,sizeof(ds_hdr));
 waveOutWrite(ds_wo,&ds_hdr,sizeof(ds_hdr));
}
static int ds_pos(){MMTIME t={TIME_SAMPLES};waveOutGetPosition(ds_wo,&t,sizeof(t));return t.u.sample;} // in frames
#endif
